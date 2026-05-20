// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  RastaLeaderboard
 * @notice Ranking on-chain do jogo Rasta Memo — Celo Mainnet (chainId 42220)
 *
 * Deploy via Remix IDE:
 *   1. Abrir remix.ethereum.org
 *   2. Colar este arquivo
 *   3. Compilar com Solidity 0.8.20
 *   4. Conectar MetaMask na Celo Mainnet
 *   5. Deploy → copiar o endereço gerado
 *   6. Colocar no .env.local: NEXT_PUBLIC_LEADERBOARD_ADDRESS=0x...
 */
contract RastaLeaderboard {

    uint256 public constant SUBMIT_PRICE = 0.01 ether; // 0.01 CELO
    uint8   public constant TOP_SIZE     = 10;

    struct Entry {
        address player;
        uint256 fid;
        uint256 score;
        uint256 level;
        uint256 submittedAt;
    }

    address public owner;

    mapping(address => Entry) private _bestByWallet;
    mapping(address => bool)  private _hasSubmitted;

    Entry[10] private _top10;
    uint8 public topCount;

    event ScoreSubmitted(
        address indexed player,
        uint256 indexed fid,
        uint256 score,
        uint256 level,
        bool    enteredTop10
    );
    event Withdrawn(address to, uint256 amount);

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // ─── Submit ───────────────────────────────────────────────────────────────

    function submitScore(uint256 fid, uint256 score, uint256 level) external payable {
        require(msg.value >= SUBMIT_PRICE, "pay 0.01 CELO");
        require(score > 0,  "score > 0");
        require(level > 0,  "level > 0");

        // Devolve o excesso
        if (msg.value > SUBMIT_PRICE) {
            payable(msg.sender).transfer(msg.value - SUBMIT_PRICE);
        }

        // Só aceita se for novo recorde pessoal
        bool isPersonalBest = !_hasSubmitted[msg.sender] ||
                               score > _bestByWallet[msg.sender].score;
        require(isPersonalBest, "not a personal best");

        _bestByWallet[msg.sender] = Entry(msg.sender, fid, score, level, block.timestamp);
        _hasSubmitted[msg.sender] = true;

        bool entered = _tryInsertTop10(msg.sender, fid, score, level);
        emit ScoreSubmitted(msg.sender, fid, score, level, entered);
    }

    // ─── Leitura ──────────────────────────────────────────────────────────────

    function getLeaderboardActive() external view returns (Entry[] memory) {
        Entry[] memory out = new Entry[](topCount);
        for (uint8 i = 0; i < topCount; i++) out[i] = _top10[i];
        return out;
    }

    function getBestByWallet(address wallet) external view returns (Entry memory, bool) {
        return (_bestByWallet[wallet], _hasSubmitted[wallet]);
    }

    function getRankOf(address wallet) external view returns (uint8) {
        for (uint8 i = 0; i < topCount; i++) {
            if (_top10[i].player == wallet) return i + 1;
        }
        return 0;
    }

    function getMinScoreForTop10() external view returns (uint256) {
        if (topCount < TOP_SIZE) return 1;
        return _top10[topCount - 1].score + 1;
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    function withdraw() external onlyOwner {
        uint256 bal = address(this).balance;
        require(bal > 0, "nothing to withdraw");
        payable(owner).transfer(bal);
        emit Withdrawn(owner, bal);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    // ─── Lógica interna — Top-10 ordenado ────────────────────────────────────

    function _tryInsertTop10(address player, uint256 fid, uint256 score, uint256 level)
        internal returns (bool)
    {
        Entry memory e = Entry(player, fid, score, level, block.timestamp);

        // Já está no top-10 → atualiza o slot
        for (uint8 i = 0; i < topCount; i++) {
            if (_top10[i].player == player) {
                _top10[i] = e;
                _bubbleUp(i);
                return true;
            }
        }

        // Há espaço disponível
        if (topCount < TOP_SIZE) {
            _top10[topCount] = e;
            _bubbleUp(topCount);
            topCount++;
            return true;
        }

        // Top-10 cheio: substitui o último se o score for maior
        if (score > _top10[TOP_SIZE - 1].score) {
            _top10[TOP_SIZE - 1] = e;
            _bubbleUp(TOP_SIZE - 1);
            return true;
        }

        return false;
    }

    // Insertion sort ascendente (array pequeno, O(n) é ok)
    function _bubbleUp(uint8 idx) internal {
        while (idx > 0 && _top10[idx].score > _top10[idx - 1].score) {
            Entry memory tmp   = _top10[idx - 1];
            _top10[idx - 1]    = _top10[idx];
            _top10[idx]        = tmp;
            idx--;
        }
    }
}
