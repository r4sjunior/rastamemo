"use client";

// src/features/app/components/submit-score-widget.tsx
// Botão de mint do score on-chain — usa useSubmitScore corrigido.

import { useSubmitScore } from "@/hooks/use-submit-score";

type Props = {
  fid:   number;
  score: number;
  level: number;
};

const LABEL: Record<string, string> = {
  idle:              "⛓️ MINT SCORE",
  connecting:        "🔌 CONECTANDO...",
  switching:         "🔄 TROCANDO REDE...",
  confirming:        "✍️ CONFIRME NA WALLET",
  pending:           "⏳ AGUARDANDO...",
  success:           "✅ SCORE MINTADO!",
  "not-personal-best": "🏅 JÁ É SEU RECORDE",
  error:             "❌ ERRO — TENTAR DE NOVO",
};

const COLOR: Record<string, string> = {
  idle:              "linear-gradient(135deg, #a855f7, #7c3aed)",
  connecting:        "linear-gradient(135deg, #6366f1, #4338ca)",
  switching:         "linear-gradient(135deg, #f59e0b, #d97706)",
  confirming:        "linear-gradient(135deg, #f59e0b, #d97706)",
  pending:           "linear-gradient(135deg, #3b82f6, #1d4ed8)",
  success:           "linear-gradient(135deg, #22c55e, #15803d)",
  "not-personal-best": "linear-gradient(135deg, #6b7280, #374151)",
  error:             "linear-gradient(135deg, #ef4444, #b91c1c)",
};

export function SubmitScoreWidget({ fid, score, level }: Props) {
  const { status, txHash, error, enteredTop10, submit, reset } =
    useSubmitScore({ fid, score, level });

  const isBusy = ["connecting", "switching", "confirming", "pending"].includes(status);
  const isDone = status === "success" || status === "not-personal-best";

  function handleClick() {
    if (isBusy) return;
    if (status === "error") { reset(); return; }
    if (isDone) return;
    void submit();
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={handleClick}
        disabled={isBusy || isDone}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "12px",
          border: "none",
          background: COLOR[status] ?? COLOR.idle,
          color: "#fff",
          fontSize: "9px",
          cursor: isBusy || isDone ? "default" : "pointer",
          fontFamily: "'Press Start 2P', monospace",
          minHeight: "44px",
          opacity: isBusy ? 0.8 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {LABEL[status] ?? "⛓️ MINT SCORE"}
      </button>

      {/* Mensagem de erro */}
      {status === "error" && error && (
        <div style={{
          fontSize: "8px",
          color: "#ef4444",
          textAlign: "center",
          padding: "4px 8px",
          background: "rgba(239,68,68,0.1)",
          borderRadius: "6px",
          border: "1px solid rgba(239,68,68,0.3)",
        }}>
          {error}
          <span style={{ color: "#a3c4a3", marginLeft: "4px" }}>(clique para tentar de novo)</span>
        </div>
      )}

      {/* Sucesso: link da tx + top-10 */}
      {status === "success" && (
        <div style={{
          fontSize: "8px",
          color: "#22c55e",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}>
          {enteredTop10 && (
            <div style={{
              padding: "4px 8px",
              background: "rgba(255,215,0,0.15)",
              border: "1px solid #FFD700",
              borderRadius: "6px",
              color: "#FFD700",
            }}>
              🏆 ENTROU NO TOP 10!
            </div>
          )}
          {txHash && (
            <a
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#60a5fa", textDecoration: "underline" }}
            >
              ver tx no celoscan ↗
            </a>
          )}
        </div>
      )}

      {/* Preço */}
      {status === "idle" && (
        <div style={{ fontSize: "7px", color: "#6b7280", textAlign: "center" }}>
          0.01 CELO · Celo Mainnet
        </div>
      )}
    </div>
  );
}
