"use client";

// src/hooks/use-submit-score.ts
// Hook central: detecta plataforma, conecta carteira certa, submete score na Celo.
// Chamado automaticamente quando phase === "game-over".

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
  | "idle"              // aguardando início
  | "connecting"        // abrindo carteira
  | "switching"         // trocando para Celo
  | "confirming"        // aguardando assinatura na carteira
  | "pending"           // tx enviada, aguardando confirmação on-chain
  | "success"           // confirmada ✅
  | "not-personal-best" // score não supera o recorde — não envia
  | "error";            // erro genérico

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
  const [error, setError]         = useState<string | undefined>();
  const [enteredTop10, setTop10]  = useState<boolean | undefined>();

  // Ref para continuar o fluxo após connect() resolver
  const pendingChainWrite = useRef(false);

  const chainId                          = useChainId();
  const { isConnected, address }         = useAccount();
  const { connectAsync, connectors }     = useConnect();
  const { switchChainAsync }             = useSwitchChain();

  const {
    writeContractAsync,
    data:    txHash,
    isPending: isSendPending,
    error:   writeError,
    reset:   resetWrite,
  } = useWriteContract();

  const {
    isLoading: isPending,
    isSuccess,
    data: receipt,
  } = useWaitForTransactionReceipt({ hash: txHash });

  // ── Reage ao estado da tx ────────────────────────────────────────────────
  useEffect(() => { if (isSendPending) setStatus("confirming"); }, [isSendPending]);
  useEffect(() => { if (isPending)     setStatus("pending");    }, [isPending]);

  useEffect(() => {
    if (isSuccess && receipt) {
      // Detecta se entrou no top-10 via evento ScoreSubmitted
      const entered = receipt.logs.length > 0;
      setTop10(entered);
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

  // ── Quando isConnected muda para true E há uma chamada pendente ──────────
  // FIX: antes usava useEffect + connect() síncrono que não esperava a wallet
  // abrir. Agora usamos connectAsync() e awaita antes de chamar doChainAndWrite.
  useEffect(() => {
    if (isConnected && pendingChainWrite.current) {
      pendingChainWrite.current = false;
      void doChainAndWrite();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected]);

  // ── Funções internas ──────────────────────────────────────────────────────

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
      await writeContractAsync({
        address:      LEADERBOARD_ADDRESS,
        abi:          LEADERBOARD_ABI,
        functionName: "submitScore",
        args:         [BigInt(fid), BigInt(score), BigInt(level)],
        value:        SUBMIT_PRICE_WEI,
      });
    } catch (e: unknown) {
      // writeError useEffect vai tratar — só garante que não fica em "confirming"
      if (status === "confirming") {
        setError(e instanceof Error ? e.message.slice(0, 120) : "Erro inesperado.");
        setStatus("error");
      }
    }
  }

  // ── submit() — ponto de entrada público ──────────────────────────────────
  async function submit() {
    if (score <= 0) { setStatus("not-personal-best"); return; }

    setError(undefined);
    resetWrite();

    // ── CASO 1: já conectado — vai direto pro chain + write ──────────────
    if (isConnected) {
      await doChainAndWrite();
      return;
    }

    // ── CASO 2: não conectado — precisa conectar primeiro ─────────────────
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
      // Browser desktop/mobile: MetaMask → WalletConnect → primeiro disponível
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
      // FIX PRINCIPAL: connectAsync() aguarda a wallet abrir e confirmar.
      // O código original usava connect() (sem await) e dependia de um useEffect
      // que só rodava quando isConnected mudava — causando race condition e
      // perda do fluxo quando a wallet já estava conectada ou demorava a responder.
      await connectAsync({ connector: targetConnector });
      // connectAsync resolve quando isConnected vira true —
      // mas o state do wagmi pode não ter propagado ainda, então usamos o ref
      // para garantir que doChainAndWrite() rode após a re-render.
      pendingChainWrite.current = true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "";
      if (msg.includes("rejected") || msg.includes("User rejected")) {
        setError("Conexão rejeitada.");
      } else {
        setError(msg.slice(0, 120) || "Falha ao conectar carteira.");
      }
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

  // Auto-submit quando o hook é configurado com autoSubmit
  useEffect(() => {
    if (autoSubmit && status === "idle" && score > 0) {
      void submit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSubmit]);

  return { status, txHash, error, enteredTop10, submit, reset };
}
