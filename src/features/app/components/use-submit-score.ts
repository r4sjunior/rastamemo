"use client";
// src/hooks/use-submit-score.ts

import { useEffect, useState } from "react";
import {
  useAccount,
  useConnect,
  useWriteContract,
  useWaitForTransactionReceipt,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { celo } from "viem/chains";
import {
  LEADERBOARD_ADDRESS,
  LEADERBOARD_ABI,
  SUBMIT_PRICE_WEI,
  CONTRACT_DEPLOYED,
} from "@/lib/celo-config";
import { detectPlatform } from "@/lib/platform-detect";

export type SubmitStatus =
  | "idle"
  | "not-deployed"       // contrato ainda não deployado
  | "connecting"
  | "switching"
  | "confirming"
  | "pending"
  | "success"
  | "not-personal-best"
  | "error";

export type SubmitState = {
  status: SubmitStatus;
  txHash?: `0x${string}`;
  error?: string;
  submit: () => Promise<void>;
  reset: () => void;
};

type Options = {
  fid: number;
  score: number;
  level: number;
};

export function useSubmitScore({ fid, score, level }: Options): SubmitState {
  const [status,  setStatus]  = useState<SubmitStatus>("idle");
  const [error,   setError]   = useState<string | undefined>();

  const chainId              = useChainId();
  const { isConnected }      = useAccount();
  const { connect, connectors } = useConnect();
  const { switchChainAsync } = useSwitchChain();

  const {
    writeContract,
    data: txHash,
    isPending: isSendPending,
    error: writeError,
    reset: resetWrite,
  } = useWriteContract();

  const {
    isLoading: isPending,
    isSuccess,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Reage ao estado da tx ───────────────────────────────────────────────────
  useEffect(() => { if (isSendPending) setStatus("confirming"); }, [isSendPending]);
  useEffect(() => { if (isPending)     setStatus("pending");    }, [isPending]);
  useEffect(() => { if (isSuccess)     setStatus("success");    }, [isSuccess]);

  useEffect(() => {
    if (!writeError) return;
    const msg = writeError.message ?? "";
    if (msg.toLowerCase().includes("personal best")) {
      setStatus("not-personal-best");
    } else if (msg.toLowerCase().includes("rejected") || msg.toLowerCase().includes("denied")) {
      setError("Transação rejeitada na carteira.");
      setStatus("error");
    } else {
      setError(msg.slice(0, 150) || "Erro inesperado.");
      setStatus("error");
    }
  }, [writeError]);

  // Quando conectar, continua o fluxo
  useEffect(() => {
    if (isConnected && status === "connecting") {
      void doChainAndWrite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // ── Escolhe o conector certo para a plataforma ──────────────────────────────
  function pickConnector() {
    const platform = detectPlatform();

    if (platform === "farcaster") {
      return (
        connectors.find(c =>
          c.id === "farcasterMiniApp" ||
          c.name?.toLowerCase().includes("farcaster")
        ) ?? connectors[0]
      );
    }

    if (platform === "minipay") {
      // MiniPay usa o conector injected igual ao MetaMask
      return (
        connectors.find(c => c.id === "injected") ??
        connectors.find(c => c.id === "metaMask") ??
        connectors[0]
      );
    }

    // Browser: MetaMask se disponível, senão primeiro disponível
    return (
      connectors.find(c => c.id === "injected") ??
      connectors.find(c => c.id === "metaMask") ??
      connectors.find(c => c.id !== "farcasterMiniApp") ??
      connectors[0]
    );
  }

  // ── Troca para Celo e escreve no contrato ───────────────────────────────────
  async function doChainAndWrite() {
    if (chainId !== celo.id) {
      setStatus("switching");
      try {
        await switchChainAsync({ chainId: celo.id });
      } catch {
        setError("Falha ao trocar para a rede Celo. Troque manualmente na sua carteira.");
        setStatus("error");
        return;
      }
    }

    setStatus("confirming");
    try {
      writeContract({
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: "submitScore",
        args: [BigInt(fid), BigInt(score), BigInt(level)],
        value: SUBMIT_PRICE_WEI,
        chainId: celo.id,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 150) : "Erro ao iniciar transação.");
      setStatus("error");
    }
  }

  // ── Ponto de entrada público ────────────────────────────────────────────────
  async function submit() {
    // Contrato não deployado ainda
    if (!CONTRACT_DEPLOYED) {
      setStatus("not-deployed");
      return;
    }

    if (score <= 0) {
      setError("Score inválido.");
      setStatus("error");
      return;
    }

    setError(undefined);
    resetWrite();

    if (!isConnected) {
      setStatus("connecting");
      const connector = pickConnector();
      if (!connector) {
        setError("Nenhuma carteira encontrada. Instale MetaMask ou abra via Farcaster/MiniPay.");
        setStatus("error");
        return;
      }
      try {
        connect({ connector });
      } catch {
        setError("Falha ao conectar carteira.");
        setStatus("error");
      }
      return; // useEffect [isConnected] continua o fluxo
    }

    await doChainAndWrite();
  }

  function reset() {
    setStatus("idle");
    setError(undefined);
    resetWrite();
  }

  return { status, txHash, error, submit, reset };
}
