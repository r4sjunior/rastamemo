// src/lib/celo-config.ts

import { createConfig, http } from "wagmi";
import { celo } from "viem/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    injected(),                                          // MetaMask + MiniPay
    farcasterMiniApp(),                                  // Farcaster wallet
    coinbaseWallet({ appName: "Rasta Memo" }),           // Coinbase
    ...(WC_PROJECT_ID
      ? [walletConnect({ projectId: WC_PROJECT_ID })]
      : []),
  ],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
});

// ─── Contrato RastaLeaderboard ────────────────────────────────────────────────
// Após o deploy na Celo, adicione ao .env.local:
// NEXT_PUBLIC_LEADERBOARD_ADDRESS=0xSEU_ENDERECO
export const LEADERBOARD_ADDRESS =
  (process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS ??
   "0x0000000000000000000000000000000000000000") as `0x${string}`;

export const CONTRACT_DEPLOYED =
  LEADERBOARD_ADDRESS !== "0x0000000000000000000000000000000000000000";

// 0.01 CELO em wei
export const SUBMIT_PRICE_WEI = BigInt("10000000000000000");

// ─── ABI ─────────────────────────────────────────────────────────────────────
export const LEADERBOARD_ABI = [
  {
    name: "submitScore",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "fid",   type: "uint256" },
      { name: "score", type: "uint256" },
      { name: "level", type: "uint256" },
    ],
    outputs: [],
  },
  {
    name: "getLeaderboardActive",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple[]",
        components: [
          { name: "player",      type: "address" },
          { name: "fid",         type: "uint256" },
          { name: "score",       type: "uint256" },
          { name: "level",       type: "uint256" },
          { name: "submittedAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    name: "getBestByWallet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [
      {
        name: "entry",
        type: "tuple",
        components: [
          { name: "player",      type: "address" },
          { name: "fid",         type: "uint256" },
          { name: "score",       type: "uint256" },
          { name: "level",       type: "uint256" },
          { name: "submittedAt", type: "uint256" },
        ],
      },
      { name: "exists", type: "bool" },
    ],
  },
  {
    name: "getRankOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    name: "ScoreSubmitted",
    type: "event",
    inputs: [
      { name: "player",       type: "address", indexed: true },
      { name: "fid",          type: "uint256", indexed: true },
      { name: "score",        type: "uint256", indexed: false },
      { name: "level",        type: "uint256", indexed: false },
      { name: "enteredTop10", type: "bool",    indexed: false },
    ],
  },
] as const;
