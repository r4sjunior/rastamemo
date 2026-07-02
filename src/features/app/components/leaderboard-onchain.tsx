"use client";
// src/features/app/components/leaderboard-onchain.tsx
// Leaderboard ILIMITADO e UNIFICADO: lê o contrato NOVO + o ANTIGO, junta tudo,
// resolve nomes (ENS -> Base -> endereco), podio Top 3 + cascata.

import { useMemo } from "react";
import { useReadContract, useAccount } from "wagmi";
import {
  LEADERBOARD_ADDRESS, LEADERBOARD_ABI,
  OLD_LEADERBOARD_ADDRESS, OLD_LEADERBOARD_ABI,
  CONTRACT_DEPLOYED,
} from "@/lib/celo-config";
import { PlayerName } from "@/features/app/components/player-name";

const F = "'Press Start 2P', monospace";

type Entry = {
  player: `0x${string}`;
  fid: bigint;
  score: bigint;
  level: bigint;
  timestamp: bigint;
};

type Props = { currentFid?: number; onClose: () => void };

function timeAgo(ts: bigint): string {
  const s = Math.floor(Date.now() / 1000) - Number(ts);
  if (s <= 0) return "agora";
  if (s < 60) return "agora";
  if (s < 3600) return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export function LeaderboardOnChain({ currentFid, onClose }: Props) {
  const { address } = useAccount();

  const { data: newScores, isLoading: loadingNew } = useReadContract({
    address: LEADERBOARD_ADDRESS,
    abi: LEADERBOARD_ABI,
    functionName: "getRecentScores",
    args: [200n],
    query: { enabled: CONTRACT_DEPLOYED },
  });

  const { data: oldScores, isLoading: loadingOld } = useReadContract({
    address: OLD_LEADERBOARD_ADDRESS,
    abi: OLD_LEADERBOARD_ABI,
    functionName: "getLeaderboardActive",
  });

  const isLoading = loadingNew || loadingOld;

  const ranked = useMemo(() => {
    const all: Entry[] = [];
    for (const e of (newScores ?? []) as Entry[]) all.push(e);
    for (const e of (oldScores ?? []) as any[]) {
      all.push({ player: e.player, fid: e.fid, score: e.score, level: e.level, timestamp: e.submittedAt ?? 0n });
    }
    const best = new Map<string, Entry>();
    for (const e of all) {
      const k = e.player.toLowerCase();
      const prev = best.get(k);
      if (!prev || e.score > prev.score) best.set(k, e);
    }
    return Array.from(best.values()).sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0));
  }, [newScores, oldScores]);

  const myRank = useMemo(() => {
    if (!address) return null;
    const i = ranked.findIndex(e => e.player.toLowerCase() === address.toLowerCase());
    return i >= 0 ? i + 1 : null;
  }, [ranked, address]);

  return (
    <div className="absolute inset-0 z-[60] flex items-center justify-center px-4"
      style={{ background: "rgba(0,0,0,0.92)", backdropFilter: "blur(6px)" }}>
      <style>{`
        @keyframes lb-row-in { 0% { opacity: 0; transform: translateY(12px);} 100% { opacity: 1; transform: translateY(0);} }
        @keyframes lb-gold-glow { 0%,100% { box-shadow: 0 0 8px rgba(255,215,0,0.5);} 50% { box-shadow: 0 0 20px rgba(255,215,0,1);} }
        @keyframes lb-podium-in { 0% { opacity: 0; transform: translateY(18px) scale(0.92);} 100% { opacity: 1; transform: translateY(0) scale(1);} }
      `}</style>

      <div style={{
        background: "linear-gradient(135deg, #0d1a0d 0%, #1a3a1a 100%)",
        border: "2px solid #FFD700", boxShadow: "0 0 30px rgba(255,215,0,0.25)",
        borderRadius: "18px", padding: "22px 18px", width: "100%", maxWidth: "340px",
        maxHeight: "85vh", display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: F, fontSize: "12px", color: "#FFD700" }}>🏆 RANKING</div>
            <div style={{ fontFamily: F, fontSize: "5px", color: "#4CAF50", marginTop: "3px" }}>
              ⛓ on-chain · Celo · {ranked.length} players
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
            borderRadius: "6px", color: "#ef4444", cursor: "pointer",
            fontFamily: F, fontSize: "8px", padding: "6px 12px", minHeight: "36px",
          }}>✕ SAIR</button>
        </div>

        {myRank && (
          <div style={{
            background: "rgba(255,215,0,0.08)", border: "2px solid #FFD700",
            borderRadius: "10px", padding: "8px 12px",
            fontFamily: F, fontSize: "7px", color: "#FFD700", textAlign: "center",
          }}>🏅 Você está em #{myRank}</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {isLoading && (
            <div style={{ fontFamily: F, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "24px 0" }}>⏳ Lendo a Celo...</div>
          )}
          {!isLoading && ranked.length === 0 && (
            <div style={{ fontFamily: F, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "24px 0", lineHeight: 2.5 }}>
              Sem scores ainda!{"\n"}Seja o primeiro, mon 🌿
            </div>
          )}

          {!isLoading && ranked.length > 0 && (() => {
            const podium = ranked.slice(0, 3);
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
                    <div key={`${entry.player}-pod-${idx}`} style={{
                      flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end",
                      background: bgs[idx], border: `2px solid ${borders[idx]}`, borderRadius: "10px",
                      padding: "8px 4px", minHeight: heights[idx],
                      animation: `lb-podium-in 0.5s ease ${idx * 0.12}s both${isFirst ? ", lb-gold-glow 1.6s ease-in-out infinite 0.6s" : ""}`,
                    }}>
                      <div style={{ fontSize: isFirst ? "20px" : "16px" }}>{medals[idx]}</div>
                      <div style={{ fontSize: "5px", marginTop: "4px", textAlign: "center", lineHeight: 1.4, wordBreak: "break-all" }}>
                        <PlayerName address={entry.player} fid={entry.fid} color={isMe ? "#FFD700" : "#fff"} />
                      </div>
                      <div style={{ fontFamily: F, fontSize: isFirst ? "13px" : "10px", color: borders[idx], marginTop: "3px" }}>
                        {entry.score.toString()}
                      </div>
                      <div style={{ fontFamily: F, fontSize: "4px", color: "#4a7a4a", marginTop: "2px" }}>LVL {entry.level.toString()}</div>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {ranked.slice(3).map((entry, idx) => {
            const i = idx + 3;
            const isMe = address?.toLowerCase() === entry.player.toLowerCase();
            return (
              <div key={`${entry.player}-${i}`} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: isMe ? "rgba(255,215,0,0.12)" : "rgba(0,0,0,0.3)",
                border: `1px solid ${isMe ? "#FFD700" : "#2d5a2d"}`,
                borderRadius: "8px", padding: "6px 10px",
                animation: `lb-row-in 0.35s ease ${Math.min(idx * 0.05, 0.6)}s both`,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <span style={{ fontFamily: F, fontSize: "8px", color: "#FFD700", minWidth: "20px" }}>{i + 1}.</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: "7px", overflow: "hidden", textOverflow: "ellipsis" }}>
                      <PlayerName address={entry.player} fid={entry.fid} color={isMe ? "#FFD700" : "#fff"} suffix={isMe ? " (voce)" : ""} />
                    </div>
                    <div style={{ fontFamily: F, fontSize: "5px", color: "#4a7a4a", marginTop: "2px" }}>
                      LVL {entry.level.toString()}{entry.timestamp > 0n ? ` · ${timeAgo(entry.timestamp)}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontFamily: F, fontSize: "10px", color: isMe ? "#FFD700" : "#fff" }}>{entry.score.toString()}</div>
                  <a href={`https://celoscan.io/address/${entry.player}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontFamily: F, fontSize: "5px", color: "#4CAF50", textDecoration: "underline" }}>↗ celo</a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
