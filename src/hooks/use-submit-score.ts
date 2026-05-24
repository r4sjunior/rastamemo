"use client";
// src/features/app/components/submit-score-widget.tsx

import { useSubmitScore, SubmitStatus } from "@/hooks/use-submit-score";
import { CONTRACT_DEPLOYED } from "@/lib/celo-config";

const F = "'Press Start 2P', monospace";

type Props = {
  fid: number;
  score: number;
  level: number;
};

const LABELS: Record<SubmitStatus, string> = {
  idle:               "⛓ SUBMIT SCORE — 0.01 CELO",
  "not-deployed":     "⛓ SUBMIT SCORE — 0.01 CELO",
  connecting:         "⏳ Conectando carteira...",
  switching:          "⏳ Trocando para Celo...",
  confirming:         "⏳ Confirme na carteira...",
  pending:            "⏳ Aguardando confirmação...",
  success:            "✅ SCORE REGISTRADO!",
  "not-personal-best":"🔒 Já tens score melhor on-chain",
  error:              "❌ Tentar novamente",
};

const BG: Record<SubmitStatus, string> = {
  idle:               "linear-gradient(135deg,#22c55e,#15803d)",
  "not-deployed":     "rgba(255,255,255,0.06)",
  connecting:         "rgba(255,255,255,0.06)",
  switching:          "rgba(255,255,255,0.06)",
  confirming:         "rgba(255,255,255,0.06)",
  pending:            "rgba(255,255,255,0.06)",
  success:            "linear-gradient(135deg,#FFD700,#b8860b)",
  "not-personal-best":"rgba(255,255,255,0.06)",
  error:              "linear-gradient(135deg,#ef4444,#b91c1c)",
};

const DISABLED: SubmitStatus[] = [
  "connecting","switching","confirming","pending","success","not-personal-best","not-deployed",
];

export function SubmitScoreWidget({ fid, score, level }: Props) {
  const { status, txHash, error, submit } = useSubmitScore({ fid, score, level });

  const isDisabled = DISABLED.includes(status);

  // Contrato não deployado ainda — mostra aviso sutil
  if (status === "not-deployed" || !CONTRACT_DEPLOYED) {
    return (
      <div style={{
        width: "100%", padding: "10px", borderRadius: "10px",
        border: "1px dashed #2d5a2d", background: "rgba(0,0,0,.3)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
      }}>
        <span style={{ fontFamily: F, fontSize: "7px", color: "#4a7a4a" }}>
          ⛓ Ranking on-chain em breve
        </span>
        <span style={{ fontFamily: F, fontSize: "5px", color: "#2d5a2d", textAlign: "center", lineHeight: 1.8 }}>
          Contrato não deployado ainda
        </span>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "6px" }}>
      <button
        onClick={() => void submit()}
        disabled={isDisabled}
        style={{
          width: "100%", padding: "12px", borderRadius: "12px",
          border: status === "success" ? "2px solid #FFD700" : "1px solid rgba(255,255,255,0.1)",
          background: BG[status], color: "#fff", fontSize: "9px",
          fontFamily: F, cursor: isDisabled ? "not-allowed" : "pointer",
          minHeight: "44px",
          opacity: isDisabled && !["success","not-personal-best"].includes(status) ? 0.7 : 1,
          transition: "all 0.2s",
        }}
      >
        {LABELS[status]}
      </button>

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

      {status === "not-personal-best" && (
        <p style={{ fontFamily: F, fontSize: "6px", color: "#a3c4a3", textAlign: "center", margin: 0, lineHeight: 1.8 }}>
          Jogue melhor para superar seu recorde!
        </p>
      )}
    </div>
  );
}
