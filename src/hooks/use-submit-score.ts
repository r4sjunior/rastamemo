"use client";

// src/hooks/use-submit-score.ts

import { useEffect, useState, useRef } from "react";
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
} from "@/lib/celo-config";
import { detectPlatform } from "@/lib/platform-detect";

export type SubmitStatus =
  | "idle"
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
  enteredTop10?: boolean;
  submit: () => Promise<void>;
  reset: () => void;
};

type Options = {
  fid: number;
  score: number;
  level: number;
  autoSubmit?: boolean;
};

export function useSubmitScore({ fid, score, level, autoSubmit }: Options): SubmitState {
  const [status, setStatus]      = useState<SubmitStatus>("idle");
  const [error, setError]        = useState<string | undefined>();
  const [enteredTop10, setTop10] = useState<boolean | undefined>();
  const pendingChainWrite        = useRef(false);

  // FIX: todos os hooks wagmi são chamados incondicionalmente —
  // o guard de "contrato não deployado" é feito dentro das funções,
  // nunca antes dos hooks (violaria regras do React).
  const chainId                      = useChainId();
  const { isConnected }              = useAccount();
  const { connectAsync, connectors } = useConnect();
  const { switchChainAsync }         = useSwitchChain();

  const {
    writeContractAsync,
    data:      txHash,
    isPending: isSendPending,
    error:     writeError,
    reset:     resetWrite,
  } = useWriteContract();

  const {
    isLoading: isPending,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => { if (isSendPending) setStatus("confirming"); }, [isSendPending]);
  useEffect(() => { if (isPending)     setStatus("pending");    }, [isPending]);

  useEffect(() => {
    if (isSuccess && receipt) {
      setTop10(receipt.logs.length > 0);
      setStatus("success");
    }
  }, [isSuccess, receipt]);

  useEffect(() => {
    if (writeError) {
      const msg = writeError.message ?? "";
      if (msg.includes("personal best")) {
        setStatus("not-personal-best");
      } else {
        setError(
          msg.includes("rejected") || msg.includes("User rejected")
            ? "Transação rejeitada."
            : msg.slice(0, 120)
        );
        setStatus("error");
      }
    }
  }, [writeError]);

  useEffect(() => {
    if (isConnected && pendingChainWrite.current) {
      pendingChainWrite.current = false;
      void doChainAndWrite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  async function doChainAndWrite() {
    // Guard: contrato não deployado
    if (LEADERBOARD_ADDRESS === "0x0000000000000000000000000000000000000000") {
      setError("Contrato não deployado. Configure NEXT_PUBLIC_LEADERBOARD_ADDRESS.");
      setStatus("error");
      return;
    }

    if (chainId !== celo.id) {
      setStatus("switching");
      try {
        await switchChainAsync({ chainId: celo.id });
      } catch {
        setError("Falha ao trocar para a rede Celo.");
        setStatus("error");
        return;
      }
    }

    setStatus("confirming");
    try {
      await writeContractAsync({
        address:      LEADERBOARD_ADDRESS,
        abi:          LEADERBOARD_ABI,
        functionName: "submitScore",
        args:         [BigInt(fid), BigInt(score), BigInt(level)],
        value:        SUBMIT_PRICE_WEI,
      });
    } catch (e: unknown) {
      if (status === "confirming") {
        setError(e instanceof Error ? e.message.slice(0, 120) : "Erro inesperado.");
        setStatus("error");
      }
    }
  }

  async function submit() {
    if (score <= 0) { setStatus("not-personal-best"); return; }

    setError(undefined);
    resetWrite();

    if (isConnected) {
      await doChainAndWrite();
      return;
    }

    setStatus("connecting");

    const platform = detectPlatform();
    let targetConnector = connectors[0];

    if (platform === "farcaster") {
      targetConnector =
        connectors.find(c => c.id === "farcasterMiniApp") ?? connectors[0];
    } else if (platform === "minipay") {
      targetConnector =
        connectors.find(c => c.id === "injected" || c.id === "metaMask") ?? connectors[0];
    } else {
      targetConnector =
        connectors.find(c => c.id === "metaMask") ??
        connectors.find(c => c.id === "walletConnect") ??
        connectors[0];
    }

    if (!targetConnector) {
      setError("Nenhuma carteira disponível.");
      setStatus("error");
      return;
    }

    try {
      await connectAsync({ connector: targetConnector });
      pendingChainWrite.current = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      setError(
        msg.includes("rejected") || msg.includes("User rejected")
          ? "Conexão rejeitada."
          : msg.slice(0, 120) || "Falha ao conectar carteira."
      );
      setStatus("error");
    }
  }

  function reset() {
    setStatus("idle");
    setError(undefined);
    setTop10(undefined);
    pendingChainWrite.current = false;
    resetWrite();
  }

  useEffect(() => {
    if (autoSubmit && status === "idle" && score > 0) void submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit]);

  return { status, txHash, error, enteredTop10, submit, reset };
}
