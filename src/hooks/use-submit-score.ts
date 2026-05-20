"use client";
// src/hooks/use-submit-score.ts
// Hook central: detecta plataforma, conecta carteira certa, submete score na Celo.
// Chamado automaticamente quando phase === "game-over".

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
} from "@/lib/celo-config";
import { detectPlatform } from "@/lib/platform-detect";

export type SubmitStatus =
  | "idle"          // aguardando início
  | "connecting"    // abrindo carteira
  | "switching"     // trocando para Celo
  | "confirming"    // aguardando assinatura na carteira
  | "pending"       // tx enviada, aguardando confirmação on-chain
  | "success"       // confirmada ✅
  | "not-personal-best" // score não supera o recorde — não envia
  | "error";        // erro genérico

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
  /** Se true, chama submit() automaticamente ao montar */
  autoSubmit?: boolean;
};

export function useSubmitScore({ fid, score, level, autoSubmit }: Options): SubmitState {
  const [status, setStatus]       = useState<SubmitStatus>("idle");
  const [error,  setError]        = useState<string | undefined>();
  const [enteredTop10, setTop10]  = useState<boolean | undefined>();

  const chainId            = useChainId();
  const { isConnected }    = useAccount();
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
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Reage ao estado da tx ────────────────────────────────────────────────────
  useEffect(() => { if (isSendPending) setStatus("confirming"); }, [isSendPending]);
  useEffect(() => { if (isPending)     setStatus("pending");    }, [isPending]);

  useEffect(() => {
    if (isSuccess && receipt) {
      // Lê o evento ScoreSubmitted para saber se entrou no top-10
      const log = receipt.logs.find(l =>
        l.topics[0]?.toLowerCase().includes("scoresubmitted") ||
        receipt.logs.indexOf(l) === 0
      );
      setTop10(!!log);
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
          msg.includes("rejected") ? "Transação rejeitada." : msg.slice(0, 120)
        );
        setStatus("error");
      }
    }
  }, [writeError]);

  // Quando conectar (após connect()), continua o fluxo
  useEffect(() => {
    if (isConnected && status === "connecting") {
      void doChainAndWrite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // ── Funções internas ──────────────────────────────────────────────────────────
  async function doChainAndWrite() {
    // Troca para Celo se necessário
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
      writeContract({
        address: LEADERBOARD_ADDRESS,
        abi: LEADERBOARD_ABI,
        functionName: "submitScore",
        args: [BigInt(fid), BigInt(score), BigInt(level)],
        value: SUBMIT_PRICE_WEI,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message.slice(0, 120) : "Erro inesperado.");
      setStatus("error");
    }
  }

  // ── submit() — ponto de entrada público ───────────────────────────────────────
  async function submit() {
    if (score <= 0) { setStatus("not-personal-best"); return; }
    setError(undefined);
    resetWrite();

    const platform = detectPlatform();

    if (!isConnected) {
      setStatus("connecting");

      // Escolhe o conector certo para a plataforma
      let targetConnector = connectors[0];
      if (platform === "farcaster") {
        targetConnector =
          connectors.find(c => c.id === "farcasterMiniApp") ?? connectors[0];
      } else if (platform === "minipay") {
        // MiniPay usa injected igual ao MetaMask
        targetConnector =
          connectors.find(c => c.id === "injected" || c.id === "metaMask") ?? connectors[0];
      } else {
        // Browser: prefere MetaMask, senão WalletConnect
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

      connect({ connector: targetConnector });
      return; // useEffect [isConnected] continua o fluxo
    }

    await doChainAndWrite();
  }

  function reset() {
    setStatus("idle");
    setError(undefined);
    setTop10(undefined);
    resetWrite();
  }

  // Auto-submit quando o hook é configurado com autoSubmit
  useEffect(() => {
    if (autoSubmit && status === "idle" && score > 0) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit]);

  return { status, txHash, error, enteredTop10, submit, reset };
}
