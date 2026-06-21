"use client";
// src/features/app/components/leaderboard-onchain.tsx

import { useReadContract, useAccount } from "wagmi";
import { LEADERBOARD_ADDRESS, LEADERBOARD_ABI, CONTRACT_DEPLOYED } from "@/lib/celo-config";

const F = "'Press Start 2P', monospace";

type ChainEntry = {
  player:      `0x${string}`;
  fid:         bigint;
  score:       bigint;
  level:       bigint;
  submittedAt: bigint;
};

type Props = {
  currentFid?: number;
  onClose: () => void;
};

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function timeAgo(ts: bigint): string {
  const s = Math.floor(Date.now() / 1000) - Number(ts);
  if (s < 60)    return "agora";
  if (s < 3600)  return `${Math.floor(s / 60)}min atrás`;
  if (s < 86400) return `${Math.floor(s / 3600)}h atrás`;
  return `${Math.floor(s / 86400)}d atrás`;
}

export function LeaderboardOnChain({ currentFid, onClose }: Props) {
  const { address } = useAccount();

  const { data: entries, isLoading, error } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getLeaderboardActive",
    query: { enabled: CONTRACT_DEPLOYED },
  });

  const { data: myRankData } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getRankOf",
    args: address ? [address] : undefined,
    query: { enabled: CONTRACT_DEPLOYED && !!address },
  });

  const { data: myBestData } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getBestByWallet",
    args: address ? [address] : undefined,
    query: { enabled: CONTRACT_DEPLOYED && !!address },
  });

  const myBest = myBestData?.[1] ? myBestData[0] : null;
  const myRank = myRankData && myRankData > 0 ? myRankData : null;
  const list   = (entries ?? []) as ChainEntry[];

  return (
    <div
      className="absolute inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
    >
      <style>{`
        @keyframes lb-row-in {
          0% { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes lb-gold-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(255,215,0,0.5); }
          50% { box-shadow: 0 0 20px rgba(255,215,0,1); }
        }
        @keyframes lb-podium-in {
          0% { opacity: 0; transform: translateY(18px) scale(0.92); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          background: "linear-gradient(135deg, #0d1a0d 0%, #1a3a1a 100%)",
          border: "2px solid #FFD700",
          boxShadow: "0 0 30px rgba(255,215,0,0.25)",
          borderRadius: "18px",
          padding: "24px 20px",
          width: "100%",
          maxWidth: "340px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontFamily: F, fontSize: "12px", color: "#FFD700" }}>🏆 TOP 10</div>
            <div style={{ fontFamily: F, fontSize: "6px", color: "#4CAF50", marginTop: "3px" }}>
              ⛓ on-chain · Celo
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
              borderRadius: "6px", color: "#ef4444", cursor: "pointer",
              fontFamily: F, fontSize: "8px", padding: "6px 12px", minHeight: "36px",
            }}
          >
            ✕ SAIR
          </button>
        </div>

        {/* Contrato não deployado */}
        {!CONTRACT_DEPLOYED && (
          <div style={{ fontFamily: F, fontSize: "7px", color: "#4a7a4a", textAlign: "center", padding: "20px 0", lineHeight: 2 }}>
            Contrato ainda não deployado.{"\n"}
            Deploy o RastaLeaderboard.sol na Celo e adicione o endereço ao .env.local
          </div>
        )}

        {/* Meu melhor */}
        {myBest && (
          <div style={{
            background: "rgba(255,215,0,0.08)", border: "2px solid #FFD700",
            borderRadius: "10px", padding: "10px 14px",
            display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
          }}>
            <div>
              <div style={{ fontFamily: F, fontSize: "7px", color: "#a3c4a3", marginBottom: "4px" }}>
                {myRank ? `🏅 RANK #${myRank}` : "SEU MELHOR"}
              </div>
              <div style={{ fontFamily: F, fontSize: "6px", color: "#22c55e" }}>
                LVL {myBest.level.toString()}
              </div>
              <div style={{ fontFamily: F, fontSize: "5px", color: "#4a7a4a", marginTop: "2px" }}>
                {shortAddr(myBest.player)} · {timeAgo(myBest.submittedAt)}
              </div>
            </div>
            <div style={{ fontFamily: F, fontSize: "16px", color: "#FFD700" }}>
              {myBest.score.toString()}
            </div>
          </div>
        )}

        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {CONTRACT_DEPLOYED && isLoading && (
            <div style={{ fontFamily: F, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "20px 0" }}>
              ⏳ Lendo a Celo...
            </div>
          )}

          {CONTRACT_DEPLOYED && error && (
            <div style={{ fontFamily: F, fontSize: "7px", color: "#ef4444", textAlign: "center", padding: "16px 0", lineHeight: 2 }}>
              Erro ao conectar na Celo.{"\n"}Verifique sua rede.
            </div>
          )}

          {CONTRACT_DEPLOYED && !isLoading && !error && list.length === 0 && (
            <div style={{ fontFamily: F, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "20px 0", lineHeight: 2.5 }}>
              Sem scores ainda!{"\n"}Seja o primeiro, mon 🌿
            </div>
          )}

          {/* ─── PÓDIO Top 3 ─── */}
          {CONTRACT_DEPLOYED && !isLoading && !error && list.length > 0 && (() => {
            const podium = list.slice(0, 3);
            // ordem visual: 2º, 1º, 3º (1º no centro mais alto)
            const order = [podium[1], podium[0], podium[2]];
            const ranks = [2, 1, 3];
            const medals = ["🥈", "🥇", "🥉"];
            const heights = ["78px", "96px", "66px"];
            const borders = ["#c0c0c0", "#FFD700", "#cd7f32"];
            const bgs = ["rgba(192,192,192,0.08)", "rgba(255,215,0,0.12)", "rgba(205,127,50,0.08)"];
            return (
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "6px", marginBottom: "4px" }}>
                {order.map((entry, idx) => {
                  if (!entry) return <div key={idx} style={{ flex: 1 }} />;
                  const isMe = address?.toLowerCase() === entry.player.toLowerCase();
                  const isFirst = ranks[idx] === 1;
                  return (
                    <div
                      key={`${entry.player}-podium-${idx}`}
                      style={{
                        flex: 1,
                        display: "flex", flexDirection: "column", alignItems: "center",
                        justifyContent: "flex-end",
                        background: bgs[idx],
                        border: `2px solid ${borders[idx]}`,
                        borderRadius: "10px",
                        padding: "8px 4px",
                        minHeight: heights[idx],
                        animation: `lb-podium-in 0.5s ease ${idx * 0.12}s both${isFirst ? ", lb-gold-glow 1.6s ease-in-out infinite 0.6s" : ""}`,
                      }}
                    >
                      <div style={{ fontSize: isFirst ? "20px" : "16px" }}>{medals[idx]}</div>
                      <div style={{ fontFamily: F, fontSize: "5px", color: isMe ? "#FFD700" : "#fff", marginTop: "4px", textAlign: "center", lineHeight: 1.4 }}>
                        {entry.fid > 0n ? `FID ${entry.fid}` : shortAddr(entry.player)}
                      </div>
                      <div style={{ fontFamily: F, fontSize: isFirst ? "13px" : "10px", color: borders[idx], marginTop: "3px" }}>
                        {entry.score.toString()}
                      </div>
                      <div style={{ fontFamily: F, fontSize: "4px", color: "#4a7a4a", marginTop: "2px" }}>
                        LVL {entry.level.toString()}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* ─── Resto da lista (4º em diante) com cascata ─── */}
          {list.slice(3).map((entry, idx) => {
            const i = idx + 3;
            const isMe = address?.toLowerCase() === entry.player.toLowerCase();
            return (
              <div
                key={`${entry.player}-${i}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: isMe ? "rgba(255,215,0,0.12)" : "rgba(0,0,0,0.3)",
                  border: `1px solid ${isMe ? "#FFD700" : "#2d5a2d"}`,
                  borderRadius: "8px", padding: "6px 10px",
                  animation: `lb-row-in 0.35s ease ${Math.min(idx * 0.05, 0.6)}s both`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: F, fontSize: "8px", color: "#FFD700", minWidth: "20px" }}>{i + 1}.</span>
                  <div>
                    <div style={{ fontFamily: F, fontSize: "7px", color: isMe ? "#FFD700" : "#fff" }}>
                      {entry.fid > 0n ? `FID ${entry.fid}` : shortAddr(entry.player)}
                      {isMe ? " (você)" : ""}
                    </div>
                    <div style={{ fontFamily: F, fontSize: "5px", color: "#4a7a4a", marginTop: "2px" }}>
                      LVL {entry.level.toString()} · {timeAgo(entry.submittedAt)}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: F, fontSize: "10px", color: isMe ? "#FFD700" : "#fff" }}>
                    {entry.score.toString()}
                  </div>
                  <a
                    href={`https://celoscan.io/address/${entry.player}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontFamily: F, fontSize: "5px", color: "#4CAF50", textDecoration: "underline" }}
                  >
                    ↗ celo
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
