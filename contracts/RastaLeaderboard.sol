// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  RastaLeaderboard (multi-ativo)
 * @notice Ranking on-chain do Rasta Memo — Celo Mainnet (42220).
 *
 * Funcionalidades:
 *  - Pagamentos em CELO (nativo), USDC e USDT (ERC-20 na Celo)
 *  - Valores fixos (sem conversão):
 *      • Continue (Game Over): 0.05
 *      • Mint do Score:        0.01
 *  - Mint do score MÚLTIPLAS vezes (sem limite)
 *  - Leaderboard ILIMITADO (todos os scores registrados)
 *
 * Endereços ERC-20 (Celo Mainnet):
 *   USDC = 0xcebA9300f2b948710d2653dD7B07f33A8B32118C (6 decimais)
 *   USDT = 0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e (6 decimais)
 *
 * ─── Segurança ────────────────────────────────────────────────────────────────
 *  - ReentrancyGuard (nonReentrant) em toda função que move ativos
 *  - Check-Effects-Interactions
 *  - SafeERC20 interno (trata USDT que não retorna bool)
 *  - Validações de address(0)
 */

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

library SafeERC20 {
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _call(address(token), abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _call(address(token), abi.encodeWithSelector(token.transfer.selector, to, value));
    }
    function _call(address token, bytes memory data) private {
        require(token.code.length > 0, "SafeERC20: not a contract");
        (bool ok, bytes memory ret) = token.call(data);
        require(ok, "SafeERC20: call failed");
        if (ret.length > 0) require(abi.decode(ret, (bool)), "SafeERC20: op failed");
    }
}

abstract contract ReentrancyGuard {
    uint256 private constant _NOT = 1;
    uint256 private constant _ENT = 2;
    uint256 private _s = _NOT;
    modifier nonReentrant() {
        require(_s != _ENT, "reentrant");
        _s = _ENT; _; _s = _NOT;
    }
}

contract RastaLeaderboard is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ─── Preços (valores fixos) ───────────────────────────────────────────────
    // CELO (18 dec)
    uint256 public constant MINT_CELO     = 0.01 ether; // 0.01 CELO
    uint256 public constant CONTINUE_CELO = 0.05 ether; // 0.05 CELO
    // Stablecoins (6 dec): 0.01 = 10_000 ; 0.05 = 50_000
    uint256 public constant MINT_STABLE_6     = 10_000;
    uint256 public constant CONTINUE_STABLE_6 = 50_000;

    address public owner;

    struct ScoreEntry {
        address player;
        uint256 fid;
        uint256 score;
        uint256 level;
        uint256 timestamp;
    }

    ScoreEntry[] public allScores;                 // leaderboard ILIMITADO
    mapping(address => uint256) public bestScoreOf;
    mapping(address => uint256) public totalMintsOf;
    mapping(address => uint8)   public acceptedStable; // token => decimais (0 = nao aceito)

    event ScoreMinted(address indexed player, uint256 indexed fid, uint256 score, uint256 level, uint256 index);
    event Continued(address indexed player, address asset);
    event Withdrawn(address indexed to, uint256 amount, address token);

    modifier onlyOwner() { require(msg.sender == owner, "not owner"); _; }

    constructor() {
        owner = msg.sender;
        acceptedStable[0xcebA9300f2b948710d2653dD7B07f33A8B32118C] = 6; // USDC
        acceptedStable[0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e] = 6; // USDT
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  MINT DO SCORE (0.01) — múltiplas vezes
    // ═══════════════════════════════════════════════════════════════════════════

    function mintScoreCELO(uint256 fid, uint256 score, uint256 level)
        external payable nonReentrant
    {
        require(msg.value >= MINT_CELO, "pay 0.01 CELO");
        require(score > 0, "score > 0");
        _register(msg.sender, fid, score, level);
        uint256 excess = msg.value - MINT_CELO;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            require(ok, "refund failed");
        }
    }

    function mintScoreStable(uint256 fid, uint256 score, uint256 level, address token)
        external nonReentrant
    {
        uint8 dec = acceptedStable[token];
        require(dec > 0, "token not accepted");
        require(score > 0, "score > 0");
        _register(msg.sender, fid, score, level);
        IERC20(token).safeTransferFrom(msg.sender, address(this), MINT_STABLE_6);
    }

    function _register(address player, uint256 fid, uint256 score, uint256 level) internal {
        allScores.push(ScoreEntry(player, fid, score, level, block.timestamp));
        uint256 idx = allScores.length - 1;
        if (score > bestScoreOf[player]) bestScoreOf[player] = score;
        totalMintsOf[player] += 1;
        emit ScoreMinted(player, fid, score, level, idx);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  CONTINUE (0.05) — registra o pagamento on-chain
    // ═══════════════════════════════════════════════════════════════════════════

    function continueCELO() external payable nonReentrant {
        require(msg.value >= CONTINUE_CELO, "pay 0.05 CELO");
        emit Continued(msg.sender, address(0));
        uint256 excess = msg.value - CONTINUE_CELO;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            require(ok, "refund failed");
        }
    }

    function continueStable(address token) external nonReentrant {
        uint8 dec = acceptedStable[token];
        require(dec > 0, "token not accepted");
        emit Continued(msg.sender, token);
        IERC20(token).safeTransferFrom(msg.sender, address(this), CONTINUE_STABLE_6);
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  LEITURA (paginada)
    // ═══════════════════════════════════════════════════════════════════════════

    uint256 public constant MAX_PAGE = 200;

    function totalScores() external view returns (uint256) { return allScores.length; }

    function getRecentScores(uint256 count) external view returns (ScoreEntry[] memory) {
        uint256 total = allScores.length;
        if (count > MAX_PAGE) count = MAX_PAGE;
        if (count > total) count = total;
        ScoreEntry[] memory out = new ScoreEntry[](count);
        for (uint256 i = 0; i < count; i++) out[i] = allScores[total - 1 - i];
        return out;
    }

    function getScores(uint256 start, uint256 count) external view returns (ScoreEntry[] memory) {
        uint256 total = allScores.length;
        if (start >= total) return new ScoreEntry[](0);
        if (count > MAX_PAGE) count = MAX_PAGE;
        uint256 end = start + count;
        if (end > total) end = total;
        ScoreEntry[] memory out = new ScoreEntry[](end - start);
        for (uint256 i = start; i < end; i++) out[i - start] = allScores[i];
        return out;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    //  MIGRAÇÃO opcional (importar scores antigos)
    // ═══════════════════════════════════════════════════════════════════════════

    bool public seedClosed;
    function seedScores(
        address[] calldata players, uint256[] calldata fids,
        uint256[] calldata scores, uint256[] calldata levels, uint256[] calldata timestamps
    ) external onlyOwner {
        require(!seedClosed, "seed closed");
        require(
            players.length == fids.length && players.length == scores.length &&
            players.length == levels.length && players.length == timestamps.length, "len mismatch");
        require(players.length <= MAX_PAGE, "batch too large");
        for (uint256 i = 0; i < players.length; i++) {
            require(players[i] != address(0), "zero player");
            allScores.push(ScoreEntry(players[i], fids[i], scores[i], levels[i], timestamps[i]));
            uint256 idx = allScores.length - 1;
            if (scores[i] > bestScoreOf[players[i]]) bestScoreOf[players[i]] = scores[i];
            totalMintsOf[players[i]] += 1;
            emit ScoreMinted(players[i], fids[i], scores[i], levels[i], idx);
        }
    }
    function closeSeed() external onlyOwner { seedClosed = true; }

    // ═══════════════════════════════════════════════════════════════════════════
    //  ADMIN
    // ═══════════════════════════════════════════════════════════════════════════

    function setAcceptedStable(address token, uint8 decimals) external onlyOwner {
        require(token != address(0), "zero token");
        acceptedStable[token] = decimals;
    }

    function withdrawCELO() external onlyOwner nonReentrant {
        uint256 bal = address(this).balance;
        require(bal > 0, "nothing");
        (bool ok, ) = payable(owner).call{value: bal}("");
        require(ok, "withdraw failed");
        emit Withdrawn(owner, bal, address(0));
    }

    function withdrawStable(address token) external onlyOwner nonReentrant {
        require(token != address(0), "zero token");
        uint256 bal = IERC20(token).balanceOf(address(this));
        require(bal > 0, "nothing");
        IERC20(token).safeTransfer(owner, bal);
        emit Withdrawn(owner, bal, token);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }

    receive() external payable { revert("use mintScoreCELO / continueCELO"); }
}
