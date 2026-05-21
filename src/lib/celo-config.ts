// src/lib/celo-config.ts
// Configuração wagmi com suporte a todas as plataformas:
// MiniPay (Celo nativo), Farcaster, MetaMask, WalletConnect, Coinbase

import { createConfig, http } from "wagmi";
import { celo } from "viem/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";
import { farcasterMiniApp } from "@farcaster/miniapp-wagmi-connector";

const WC_PROJECT_ID = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "";

export const wagmiConfig = createConfig({
  chains: [celo],
  connectors: [
    // 1. Farcaster — carteira nativa do mini-app (primeiro para prioridade)
    farcasterMiniApp(),

    // 2. MiniPay / MetaMask — injected (window.ethereum)
    injected({ target: "metaMask" }),

    // 3. WalletConnect — QR code
    ...(WC_PROJECT_ID
      ? [walletConnect({ projectId: WC_PROJECT_ID })]
      : []),

    // 4. Coinbase Wallet
    coinbaseWallet({ appName: "Rasta Memo" }),
  ],
  transports: {
    [celo.id]: http("https://forno.celo.org"),
  },
  // FIX: ssr: true é obrigatório no Next.js para evitar
  // "Provider not found" durante hidratação server-side
  ssr: true,
});

// ─── Contrato RastaLeaderboard ────────────────────────────────────────────────
export const LEADERBOARD_ADDRESS =
  (process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS ??
   "0x0000000000000000000000000000000000000000") as `0x${string}`;

// 0.01 CELO em wei
export const SUBMIT_PRICE_WEI = BigInt("10000000000000000");

// ─── ABI do RastaLeaderboard ──────────────────────────────────────────────────
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
    name: "getMinScoreForTop10",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "ScoreSubmitted",
    type: "event",
    inputs: [
      { name: "player",       type: "address", indexed: true  },
      { name: "fid",          type: "uint256", indexed: true  },
      { name: "score",        type: "uint256", indexed: false },
      { name: "level",        type: "uint256", indexed: false },
      { name: "enteredTop10", type: "bool",    indexed: false },
    ],
  },
  {
    name: "resetLeaderboard",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
] as const;
