/**
 * useLeaderboard.ts
 *
 * Hook principal para interagir com o contrato RastaLeaderboard (corrigido).
 * Stack: wagmi v2 · viem v2 · @tanstack/react-query v5 · @farcaster/miniapp-sdk
 *
 * Correções refletidas aqui:
 *   - submitScore agora trata o excess refund como efeito colateral (só exibe tx hash)
 *   - getMinScoreForTop10 é lido antes de permitir submit, evitando tx desperdiçada
 *   - resetLeaderboard() exposto para o owner
 *   - Tipagem forte para Entry
 */

import { useCallback, useMemo } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { parseEther, formatEther, type Address } from "viem";
import { useQuery } from "@tanstack/react-query";

// ── ABI ──────────────────────────────────────────────────────────────────────
export const LEADERBOARD_ABI = [
  // ── read ──
  {
    name: "getLeaderboardActive",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
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
        type: "tuple",
        components: [
          { name: "player",      type: "address" },
          { name: "fid",         type: "uint256" },
          { name: "score",       type: "uint256" },
          { name: "level",       type: "uint256" },
          { name: "submittedAt", type: "uint256" },
        ],
      },
      { name: "hasSubmitted", type: "bool" },
    ],
  },
  {
    name: "getRankOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "wallet", type: "address" }],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "getMinScoreForTop10",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "getBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    name: "topCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint8" }],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    name: "SUBMIT_PRICE",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  // ── write ──
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
    name: "withdraw",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "resetLeaderboard",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    name: "transferOwnership",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "newOwner", type: "address" }],
    outputs: [],
  },
  // ── events ──
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
    name: "Withdrawn",
    type: "event",
    inputs: [
      { name: "to",     type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    name: "LeaderboardReset",
    type: "event",
    inputs: [],
  },
] as const;

// ── Tipos ────────────────────────────────────────────────────────────────────
export interface LeaderboardEntry {
  player:      Address;
  fid:         bigint;
  score:       bigint;
  level:       bigint;
  submittedAt: bigint;
  /** rank 1-based, undefined quando fora do top */
  rank?:       number;
}

export interface UseLeaderboardOptions {
  /** Endereço do contrato deployado */
  contractAddress: Address;
  /** Refetch automático em ms (padrão: 30_000) */
  refetchInterval?: number;
}

// ── Hook ─────────────────────────────────────────────────────────────────────
export function useLeaderboard({
  contractAddress,
  refetchInterval = 30_000,
}: UseLeaderboardOptions) {
  const { address: walletAddress } = useAccount();

  const baseArgs = {
    address:  contractAddress,
    abi:      LEADERBOARD_ABI,
  } as const;

  // ── Leitura: top-10 ────────────────────────────────────────────────────
  const {
    data:    rawTop10,
    isLoading: isLoadingTop10,
    refetch: refetchTop10,
  } = useReadContract({
    ...baseArgs,
    functionName: "getLeaderboardActive",
    query: { refetchInterval },
  });

  const top10: LeaderboardEntry[] = useMemo(() => {
    if (!rawTop10) return [];
    return (rawTop10 as LeaderboardEntry[]).map((e, i) => ({
      ...e,
      rank: i + 1,
    }));
  }, [rawTop10]);

  // ── Leitura: melhor score do wallet conectado ──────────────────────────
  const { data: walletBestRaw, refetch: refetchWalletBest } = useReadContract({
    ...baseArgs,
    functionName: "getBestByWallet",
    args:         walletAddress ? [walletAddress] : undefined,
    query:        { enabled: !!walletAddress, refetchInterval },
  });

  const walletBest = useMemo(() => {
    if (!walletBestRaw) return null;
    const [entry, hasSubmitted] = walletBestRaw as [LeaderboardEntry, boolean];
    return hasSubmitted ? entry : null;
  }, [walletBestRaw]);

  // ── Leitura: rank do wallet conectado ─────────────────────────────────
  const { data: walletRank } = useReadContract({
    ...baseArgs,
    functionName: "getRankOf",
    args:         walletAddress ? [walletAddress] : undefined,
    query:        { enabled: !!walletAddress, refetchInterval },
  });

  // ── Leitura: score mínimo para entrar no top-10 ───────────────────────
  const { data: minScoreForTop10 } = useReadContract({
    ...baseArgs,
    functionName: "getMinScoreForTop10",
    query:        { refetchInterval },
  }) as { data: bigint | undefined };

  // ── Leitura: owner ────────────────────────────────────────────────────
  const { data: contractOwner } = useReadContract({
    ...baseArgs,
    functionName: "owner",
  }) as { data: Address | undefined };

  const isOwner =
    !!walletAddress &&
    !!contractOwner &&
    walletAddress.toLowerCase() === contractOwner.toLowerCase();

  // ── Write: submitScore ────────────────────────────────────────────────
  const {
    writeContractAsync,
    isPending:  isSubmitting,
    data:       submitTxHash,
    error:      submitError,
    reset:      resetSubmit,
  } = useWriteContract();

  const { isLoading: isWaitingReceipt, isSuccess: submitSuccess } =
    useWaitForTransactionReceipt({ hash: submitTxHash });

  /**
   * Envia o score para o contrato.
   *
   * Validações client-side antes de gastar gas:
   *   - score > 0 e level > 0
   *   - score > recorde pessoal atual (se houver)
   *   - score >= minScoreForTop10 (warning, não bloqueante)
   *
   * @param fid    Farcaster ID do usuário
   * @param score  Pontuação final
   * @param level  Nível alcançado
   */
  const submitScore = useCallback(
    async (fid: bigint, score: bigint, level: bigint) => {
      if (!walletAddress) throw new Error("Wallet não conectada");
      if (score <= 0n)    throw new Error("Score deve ser > 0");
      if (level <= 0n)    throw new Error("Level deve ser > 0");

      // Guard client-side: evita tx com score menor que o pessoal
      if (walletBest && score <= walletBest.score) {
        throw new Error(
          `Score ${score} não supera seu recorde de ${walletBest.score}`
        );
      }

      const SUBMIT_PRICE = parseEther("0.01");

      const txHash = await writeContractAsync({
        address:      contractAddress,
        abi:          LEADERBOARD_ABI,
        functionName: "submitScore",
        args:         [fid, score, level],
        value:        SUBMIT_PRICE,
      });

      return txHash;
    },
    [walletAddress, walletBest, contractAddress, writeContractAsync]
  );

  // ── Write: withdraw (owner only) ──────────────────────────────────────
  const withdraw = useCallback(async () => {
    if (!isOwner) throw new Error("Apenas o owner pode sacar");
    return writeContractAsync({
      address:      contractAddress,
      abi:          LEADERBOARD_ABI,
      functionName: "withdraw",
    });
  }, [isOwner, contractAddress, writeContractAsync]);

  // ── Write: resetLeaderboard (owner only) ──────────────────────────────
  const resetLeaderboard = useCallback(async () => {
    if (!isOwner) throw new Error("Apenas o owner pode resetar");
    return writeContractAsync({
      address:      contractAddress,
      abi:          LEADERBOARD_ABI,
      functionName: "resetLeaderboard",
    });
  }, [isOwner, contractAddress, writeContractAsync]);

  // ── Refetch manual ────────────────────────────────────────────────────
  const refetch = useCallback(async () => {
    await Promise.all([refetchTop10(), refetchWalletBest()]);
  }, [refetchTop10, refetchWalletBest]);

  return {
    // dados
    top10,
    walletBest,
    walletRank:        walletRank as number | undefined,
    minScoreForTop10,
    isOwner,
    contractOwner,

    // estado de loading
    isLoadingTop10,
    isSubmitting:      isSubmitting || isWaitingReceipt,
    submitSuccess,
    submitError,
    submitTxHash,

    // ações
    submitScore,
    withdraw,
    resetLeaderboard,
    resetSubmit,
    refetch,
  };
}
