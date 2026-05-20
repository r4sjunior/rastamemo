"use client";
// src/features/app/components/submit-score-widget.tsx
// Widget minimalista para submissão do score on-chain.
// Encaixa no Game Over original sem alterar o visual.

import { useSubmitScore, SubmitStatus } from "@/hooks/use-submit-score";

const F = "'Press Start 2P', monospace";

type Props = {
  fid: number;
  score: number;
  level: number;
};

const LABELS: Record<SubmitStatus, string> = {
  idle:               "⛓ SUBMIT SCORE — 0.01 CELO",
  connecting:         "⏳ Conectando carteira...",
  switching:          "⏳ Trocando para Celo...",
  confirming:         "⏳ Confirme na carteira...",
  pending:            "⏳ Aguardando on-chain...",
  success:            "✅ SCORE REGISTRADO!",
  "not-personal-best":"🔒 Já tens um score melhor",
  error:              "❌ Tentar novamente",
};

const BG: Record<SubmitStatus, string> = {
  idle:               "linear-gradient(135deg,#22c55e,#15803d)",
  connecting:         "rgba(255,255,255,0.07)",
  switching:          "rgba(255,255,255,0.07)",
  confirming:         "rgba(255,255,255,0.07)",
  pending:            "rgba(255,255,255,0.07)",
  success:            "linear-gradient(135deg,#FFD700,#b8860b)",
  "not-personal-best":"rgba(255,255,255,0.07)",
  error:              "linear-gradient(135deg,#ef4444,#b91c1c)",
};

const DISABLED_STATUSES: SubmitStatus[] = [
  "connecting", "switching", "confirming", "pending", "success", "not-personal-best",
];

export function SubmitScoreWidget({ fid, score, level }: Props) {
  const { status, txHash, error, submit } = useSubmitScore({ fid, score, level });

  const isDisabled = DISABLED_STATUSES.includes(status);

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={() => void submit()}
        disabled={isDisabled}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "12px",
          border: status === "success" ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
          background: BG[status],
          color: "#fff",
          fontSize: "9px",
          fontFamily: F,
          cursor: isDisabled ? "not-allowed" : "pointer",
          minHeight: "44px",
          opacity: isDisabled && status !== "success" && status !== "not-personal-best" ? 0.7 : 1,
          transition: "all 0.2s",
        }}
      >
        {LABELS[status]}
      </button>

      {/* Sub-info */}
      {status === "idle" && (
        <p style={{ fontFamily: F, fontSize: "6px", color: "#a3c4a3", textAlign: "center", margin: 0, lineHeight: 1.8 }}>
          Ranking on-chain unificado · Celo
        </p>
      )}

      {status === "success" && txHash && (
        <a
          href={`https://celoscan.io/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: F, fontSize: "6px", color: "#FFD700", textAlign: "center", textDecoration: "underline" }}
        >
          Ver no Celoscan ↗
        </a>
      )}

      {status === "error" && error && (
        <p style={{ fontFamily: F, fontSize: "6px", color: "#ef4444", textAlign: "center", margin: 0, lineHeight: 1.8 }}>
          {error}
        </p>
      )}
    </div>
  );
}
