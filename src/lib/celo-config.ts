// src/lib/celo-config.ts

import { createConfig, http } from "wagmi";
import { celo } from "viem/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [celo],
  ssr: true,
  connectors: [
    injected(),
    farcasterMiniApp(),
    coinbaseWallet({ appName: "Rasta Memo" }),
    ...(WC_PROJECT_ID ? [walletConnect({ projectId: WC_PROJECT_ID })] : []),
  ],
  transports: { [celo.id]: http("https://forno.celo.org") },
});

export const CELO_PARAMS = {
  chainId: "0xa4ec",
  chainName: "Celo Mainnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: ["https://forno.celo.org"],
  blockExplorerUrls: ["https://celoscan.io"],
};

export const LEADERBOARD_ADDRESS =
  (process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS ??
   "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CONTRACT_DEPLOYED =
  LEADERBOARD_ADDRESS !== "0x0000000000000000000000000000000000000000";

// ─── Contrato ANTIGO (top-10) — para o leaderboard unificado ──────────────────
export const OLD_LEADERBOARD_ADDRESS =
  "0x501D1D5758D1F42679FE443794A71d6Add7E7238" as `0x${string}`;
export const OLD_LEADERBOARD_ABI = [
  {
    name: "getLeaderboardActive", type: "function", stateMutability: "view", inputs: [],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "player", type: "address" }, { name: "fid", type: "uint256" },
      { name: "score", type: "uint256" }, { name: "level", type: "uint256" },
      { name: "submittedAt", type: "uint256" },
    ]}],
  },
] as const;

// ─── Ativos aceitos: CELO + USDC + USDT ───────────────────────────────────────
export type PayAsset = "CELO" | "USDC" | "USDT";

export type StableToken = {
  symbol: "USDC" | "USDT";
  address: `0x${string}`;
  decimals: number;
};

export const STABLES: StableToken[] = [
  { symbol: "USDC", address: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C", decimals: 6 },
  { symbol: "USDT", address: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e", decimals: 6 },
];

// ─── Preços fixos ─────────────────────────────────────────────────────────────
// Mint = 0.01 ; Continue = 0.05
export const MINT_CELO_WEI     = BigInt("10000000000000000"); // 0.01 CELO
export const CONTINUE_CELO_WEI = BigInt("50000000000000000"); // 0.05 CELO
export const MINT_STABLE_6     = BigInt("10000");   // 0.01 (6 dec)
export const CONTINUE_STABLE_6 = BigInt("50000");   // 0.05 (6 dec)

export function stableBySymbol(sym: PayAsset): StableToken | undefined {
  return STABLES.find(s => s.symbol === sym);
}

// ─── ABIs ──────────────────────────────────────────────────────────────────────
export const LEADERBOARD_ABI = [
  { name: "mintScoreCELO", type: "function", stateMutability: "payable",
    inputs: [{ name: "fid", type: "uint256" }, { name: "score", type: "uint256" }, { name: "level", type: "uint256" }], outputs: [] },
  { name: "mintScoreStable", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "fid", type: "uint256" }, { name: "score", type: "uint256" }, { name: "level", type: "uint256" }, { name: "token", type: "address" }], outputs: [] },
  { name: "continueCELO", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "continueStable", type: "function", stateMutability: "nonpayable", inputs: [{ name: "token", type: "address" }], outputs: [] },
  { name: "totalScores", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "getRecentScores", type: "function", stateMutability: "view", inputs: [{ name: "count", type: "uint256" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "player", type: "address" }, { name: "fid", type: "uint256" },
      { name: "score", type: "uint256" }, { name: "level", type: "uint256" }, { name: "timestamp", type: "uint256" },
    ]}] },
  { name: "bestScoreOf", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;

export const ERC20_ABI = [
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], outputs: [{ name: "", type: "bool" }] },
  { name: "allowance", type: "function", stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
] as const;
