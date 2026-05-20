"use client";
// src/features/app/components/leaderboard-onchain.tsx
// Leaderboard lido direto do contrato na Celo.
// Mantém o mesmo estilo visual do leaderboard original.

import { useReadContract, useAccount } from "wagmi";
import { LEADERBOARD_ADDRESS, LEADERBOARD_ABI } from "@/lib/celo-config";

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
  if (s < 3600)  return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function LeaderboardOnChain({ currentFid, onClose }: Props) {
  const { address } = useAccount();

  const { data: entries, isLoading, error } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getLeaderboardActive",
  });

  const { data: myRankData } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getRankOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: myBestData } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getBestByWallet",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const myBest  = myBestData?.[1] ? myBestData[0] : null;
  const myRank  = myRankData && myRankData > 0 ? myRankData : null;
  const list    = (entries ?? []) as ChainEntry[];

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}
    >
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
            <div style={{ fontFamily: F, fontSize: "6px", color: "#4CAF50", marginTop: "3px" }}>⛓ on-chain · Celo</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)", border: "1px solid #2d5a2d",
              borderRadius: "6px", color: "#a3c4a3", cursor: "pointer",
              fontFamily: F, fontSize: "8px", padding: "4px 8px", minHeight: "32px",
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Meu melhor (se tiver) */}
        {myBest && (
          <div
            style={{
              background: "rgba(255,215,0,0.08)", border: "2px solid #FFD700",
              borderRadius: "10px", padding: "10px 14px",
              display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontFamily: F, fontSize: "7px", color: "#a3c4a3", marginBottom: "4px" }}>
                {myRank ? `🏅 RANK #${myRank}` : "SEU MELHOR"}
              </div>
              <div style={{ fontFamily: F, fontSize: "6px", color: "#22c55e" }}>LVL {myBest.level.toString()}</div>
              <div style={{ fontFamily: F, fontSize: "5px", color: "#4a7a4a", marginTop: "2px" }}>
                {shortAddr(myBest.player)} · {timeAgo(myBest.submittedAt)} atrás
              </div>
            </div>
            <div style={{ fontFamily: F, fontSize: "16px", color: "#FFD700" }}>{myBest.score.toString()}</div>
          </div>
        )}

        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {isLoading && (
            <div style={{ fontFamily: F, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "20px 0" }}>
              ⏳ Lendo a Celo...
            </div>
          )}

          {error && (
            <div style={{ fontFamily: F, fontSize: "7px", color: "#ef4444", textAlign: "center", padding: "16px 0", lineHeight: 2 }}>
              Erro ao conectar na Celo.
            </div>
          )}

          {!isLoading && !error && list.length === 0 && (
            <div style={{ fontFamily: F, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "20px 0", lineHeight: 2.5 }}>
              Sem scores ainda!{"\n"}Seja o primeiro, mon 🌿
            </div>
          )}

          {list.map((entry, i) => {
            const isMe = address?.toLowerCase() === entry.player.toLowerCase();
            const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
            return (
              <div
                key={`${entry.player}-${i}`}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  background: isMe ? "rgba(255,215,0,0.12)" : "rgba(0,0,0,0.3)",
                  border: `1px solid ${isMe ? "#FFD700" : "#2d5a2d"}`,
                  borderRadius: "8px", padding: "6px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: F, fontSize: "8px", color: "#FFD700", minWidth: "20px" }}>{medal}</span>
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
