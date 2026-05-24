// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * ██████╗  █████╗ ███████╗████████╗ █████╗     ███╗   ███╗███████╗███╗   ███╗ ██████╗
 * ██╔══██╗██╔══██╗██╔════╝╚══██╔══╝██╔══██╗    ████╗ ████║██╔════╝████╗ ████║██╔═══██╗
 * ██████╔╝███████║███████╗   ██║   ███████║    ██╔████╔██║█████╗  ██╔████╔██║██║   ██║
 * ██╔══██╗██╔══██║╚════██║   ██║   ██╔══██║    ██║╚██╔╝██║██╔══╝  ██║╚██╔╝██║██║   ██║
 * ██║  ██║██║  ██║███████║   ██║   ██║  ██║    ██║ ╚═╝ ██║███████╗██║ ╚═╝ ██║╚██████╔╝
 * ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝  ╚═╝    ╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝ ╚═════╝
 *
 * @title  RastaLeaderboard
 * @notice Ranking on-chain do jogo Rasta Memo na rede Celo.
 *
 * Regras:
 *  - Jogador paga SUBMIT_PRICE (0.01 CELO) para registrar um score.
 *  - Cada carteira guarda apenas seu melhor score (só atualiza se for maior).
 *  - O contrato mantém o top-10 global ordenado na chain.
 *  - Qualquer um pode ler o leaderboard sem pagar gas.
 *
 * Deploy:
 *  Remix IDE → Celo Mainnet (chainId 42220) | RPC: https://forno.celo.org
 *  ou: npx hardhat run scripts/deploy.js --network celo
 */
contract RastaLeaderboard {

    // ─── Constantes ────────────────────────────────────────────────────────────
    uint256 public constant SUBMIT_PRICE = 0.01 ether;  // 0.01 CELO
    uint8   public constant TOP_SIZE     = 10;           // tamanho do leaderboard

    // ─── Structs ────────────────────────────────────────────────────────────────
    struct Entry {
        address player;   // carteira do jogador
        uint256 fid;      // Farcaster ID (0 se não tiver)
        uint256 score;    // pontuação
        uint256 level;    // nível alcançado
        uint256 submittedAt; // timestamp
    }

    // ─── Estado ─────────────────────────────────────────────────────────────────
    address public owner;

    // Melhor score de cada carteira
    mapping(address => Entry) private _bestByWallet;
    mapping(address => bool)  private _hasSubmitted;

    // Top-10 mantido ordenado (decrescente por score)
    Entry[10] private _top10;
    uint8 public topCount; // quantas posições estão preenchidas (0–10)

    // ─── Eventos ────────────────────────────────────────────────────────────────
    event ScoreSubmitted(
        address indexed player,
        uint256 indexed fid,
        uint256 score,
        uint256 level,
        bool    enteredTop10
    );

    event LeaderboardUpdated(uint8 position, address player, uint256 score);
    event Withdrawn(address to, uint256 amount);

    // ─── Constructor ────────────────────────────────────────────────────────────
    constructor() {
        owner = msg.sender;
    }

    // ─── Modificadores ──────────────────────────────────────────────────────────
    modifier onlyOwner() {
        require(msg.sender == owner, "RastaLeaderboard: not owner");
        _;
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  FUNÇÕES PÚBLICAS
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * @notice Submete um score. Só aceita se for melhor que o anterior da carteira.
     * @param fid   Farcaster ID do jogador (0 se não tiver)
     * @param score Pontuação final
     * @param level Nível alcançado
     */
    function submitScore(
        uint256 fid,
        uint256 score,
        uint256 level
    ) external payable {
        require(msg.value >= SUBMIT_PRICE, "RastaLeaderboard: pay 0.01 CELO");
        require(score > 0,                 "RastaLeaderboard: score must be > 0");
        require(level > 0,                 "RastaLeaderboard: level must be > 0");

        // Devolve o excesso de CELO enviado
        if (msg.value > SUBMIT_PRICE) {
            (bool refundOk, ) = payable(msg.sender).call{value: msg.value - SUBMIT_PRICE}("");
            require(refundOk, "RastaLeaderboard: refund failed");
        }

        // Verifica se esse score bate o recorde pessoal
        bool isPersonalBest = !_hasSubmitted[msg.sender] ||
                               score > _bestByWallet[msg.sender].score;

        require(isPersonalBest, "RastaLeaderboard: not a personal best");

        // Salva o melhor score pessoal
        _bestByWallet[msg.sender] = Entry({
            player:      msg.sender,
            fid:         fid,
            score:       score,
            level:       level,
            submittedAt: block.timestamp
        });
        _hasSubmitted[msg.sender] = true;

        // Tenta entrar no top-10
        bool enteredTop = _tryInsertTop10(msg.sender, fid, score, level);

        emit ScoreSubmitted(msg.sender, fid, score, level, enteredTop);
    }

    // ─── Leitura do leaderboard ──────────────────────────────────────────────────

    /**
     * @notice Retorna o top-10 atual (ordenado, maior score primeiro).
     */
    function getLeaderboard() external view returns (Entry[10] memory) {
        return _top10;
    }

    /**
     * @notice Retorna somente os slots preenchidos do top-10.
     */
    function getLeaderboardActive() external view returns (Entry[] memory) {
        Entry[] memory active = new Entry[](topCount);
        for (uint8 i = 0; i < topCount; i++) {
            active[i] = _top10[i];
        }
        return active;
    }

    /**
     * @notice Retorna o melhor score de uma carteira específica.
     * @param wallet endereço da carteira
     */
    function getBestByWallet(address wallet)
        external
        view
        returns (Entry memory entry, bool exists)
    {
        return (_bestByWallet[wallet], _hasSubmitted[wallet]);
    }

    /**
     * @notice Retorna a posição de uma carteira no top-10 (1-indexed).
     *         Retorna 0 se não estiver no top-10.
     */
    function getRankOf(address wallet) external view returns (uint8) {
        for (uint8 i = 0; i < topCount; i++) {
            if (_top10[i].player == wallet) return i + 1;
        }
        return 0;
    }

    /**
     * @notice Score mínimo para entrar no top-10 atual.
     */
    function getMinScoreForTop10() external view returns (uint256) {
        if (topCount < TOP_SIZE) return 1; // ainda há espaço
        return _top10[topCount - 1].score + 1;
    }

    /**
     * @notice Total de CELO acumulado no contrato.
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  ADMIN
    // ───────────────────────────────────────────────────────────────────────────

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "RastaLeaderboard: nothing to withdraw");
        (bool ok, ) = payable(owner).call{value: bal}("");
        require(ok, "RastaLeaderboard: withdraw failed");
        emit Withdrawn(owner, bal);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "RastaLeaderboard: zero address");
        owner = newOwner;
    }

    // ───────────────────────────────────────────────────────────────────────────
    //  LÓGICA INTERNA — TOP-10 ORDENADO
    // ───────────────────────────────────────────────────────────────────────────

    /**
     * @dev Tenta inserir/atualizar a entrada no top-10.
     *      Mantém o array ordenado por score decrescente.
     *      Se a carteira já está no top-10, atualiza seu slot.
     *      Caso contrário, verifica se o score bate o último colocado.
     */
    function _tryInsertTop10(
        address player,
        uint256 fid,
        uint256 score,
        uint256 level
    ) internal returns (bool entered) {

        Entry memory newEntry = Entry({
            player:      player,
            fid:         fid,
            score:       score,
            level:       level,
            submittedAt: block.timestamp
        });

        // 1. Verifica se o jogador já está no top-10 → só atualiza o slot dele
        for (uint8 i = 0; i < topCount; i++) {
            if (_top10[i].player == player) {
                _top10[i] = newEntry;
                _sortFrom(i); // re-sort a partir do slot alterado
                emit LeaderboardUpdated(i, player, score);
                return true;
            }
        }

        // 2. Ainda há espaço no top-10
        if (topCount < TOP_SIZE) {
            _top10[topCount] = newEntry;
            topCount++;
            _sortFrom(topCount - 1);
            emit LeaderboardUpdated(topCount - 1, player, score);
            return true;
        }

        // 3. Top-10 cheio → substitui o último se o score for maior
        if (score > _top10[TOP_SIZE - 1].score) {
            _top10[TOP_SIZE - 1] = newEntry;
            _sortFrom(TOP_SIZE - 1);
            emit LeaderboardUpdated(TOP_SIZE - 1, player, score);
            return true;
        }

        return false;
    }

    /**
     * @dev Insertion sort a partir de uma posição (borbulha para cima enquanto
     *      o score do slot atual > score do slot anterior).
     *      O array é pequeno (≤10), então O(n) é aceitável e econômico em gas.
     */
    function _sortFrom(uint8 startIdx) internal {
        uint8 i = startIdx;
        while (i > 0 && _top10[i].score > _top10[i - 1].score) {
            Entry memory tmp = _top10[i - 1];
            _top10[i - 1] = _top10[i];
            _top10[i]     = tmp;
            i--;
        }
    }
}
