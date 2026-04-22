"use client";

import { useEffect, useState } from "react";

type ScoreEntry = {
  id: string;
  fid: number;
  score: number;
  level: number;
  createdAt: string;
};

type LeaderboardProps = {
  currentFid: number;
  onClose: () => void;
};

export function Leaderboard({ currentFid, onClose }: LeaderboardProps) {
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [personalBest, setPersonalBest] = useState<ScoreEntry | null>(null);
  const [loading, setLoading] = useState(true);

  const FONT = "'Press Start 2P', monospace";

  useEffect(() => {
    const url = currentFid ? `/api/scores?fid=${currentFid}` : "/api/scores";
    fetch(url)
      .then(r => r.json())
      .then((data: { top10: ScoreEntry[]; personalBest: ScoreEntry | null }) => {
        setScores(data.top10 ?? []);
        setPersonalBest(data.personalBest ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [currentFid]);

  const isInTop10 = scores.some(s => s.fid === currentFid);

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
          <div style={{ fontFamily: FONT, fontSize: "12px", color: "#FFD700" }}>
            🏆 TOP 10
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid #2d5a2d",
              borderRadius: "6px",
              color: "#a3c4a3",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: "8px",
              padding: "4px 8px",
              minHeight: "32px",
            }}
          >
            CLOSE
          </button>
        </div>

        {/* Personal Best — always show if we have data */}
        {!loading && personalBest && (
          <div
            style={{
              background: "rgba(255,215,0,0.08)",
              border: "2px solid #FFD700",
              borderRadius: "10px",
              padding: "10px 14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexShrink: 0,
            }}
          >
            <div>
              <div style={{ fontFamily: FONT, fontSize: "7px", color: "#a3c4a3", marginBottom: "4px" }}>
                YOUR BEST
              </div>
              <div style={{ fontFamily: FONT, fontSize: "6px", color: "#22c55e" }}>
                LVL {personalBest.level} reached
              </div>
            </div>
            <div style={{ fontFamily: FONT, fontSize: "16px", color: "#FFD700" }}>
              {personalBest.score}
            </div>
          </div>
        )}

        {/* Top 10 list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {loading ? (
            <div style={{ fontFamily: FONT, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "20px 0" }}>
              Loading...
            </div>
          ) : scores.length === 0 ? (
            <div style={{ fontFamily: FONT, fontSize: "8px", color: "#a3c4a3", textAlign: "center", padding: "20px 0", lineHeight: 2 }}>
              No scores yet!{"\n"}Be the first, mon 🌿
            </div>
          ) : (
            scores.map((entry, i) => {
              const isMe = entry.fid === currentFid;
              const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isMe ? "rgba(255,215,0,0.12)" : "rgba(0,0,0,0.3)",
                    border: `1px solid ${isMe ? "#FFD700" : "#2d5a2d"}`,
                    borderRadius: "8px",
                    padding: "6px 10px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontFamily: FONT, fontSize: "8px", color: "#FFD700", minWidth: "20px" }}>
                      {medal}
                    </span>
                    <div>
                      <div style={{ fontFamily: FONT, fontSize: "7px", color: isMe ? "#FFD700" : "#fff" }}>
                        FID {entry.fid}{isMe ? " (you)" : ""}
                      </div>
                      <div style={{ fontFamily: FONT, fontSize: "6px", color: "#22c55e", marginTop: "2px" }}>
                        LVL {entry.level}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: "10px", color: isMe ? "#FFD700" : "#fff" }}>
                    {entry.score}
                  </span>
                </div>
              );
            })
          )}

          {/* Show personal best below list if not already in top 10 */}
          {!loading && personalBest && !isInTop10 && scores.length > 0 && (
            <>
              <div style={{ textAlign: "center", fontFamily: FONT, fontSize: "7px", color: "#2d5a2d" }}>
                · · ·
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,215,0,0.12)",
                  border: "1px solid #FFD700",
                  borderRadius: "8px",
                  padding: "6px 10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontFamily: FONT, fontSize: "8px", color: "#FFD700", minWidth: "20px" }}>★</span>
                  <div>
                    <div style={{ fontFamily: FONT, fontSize: "7px", color: "#FFD700" }}>
                      FID {personalBest.fid} (you)
                    </div>
                    <div style={{ fontFamily: FONT, fontSize: "6px", color: "#22c55e", marginTop: "2px" }}>
                      LVL {personalBest.level}
                    </div>
                  </div>
                </div>
                <span style={{ fontFamily: FONT, fontSize: "10px", color: "#FFD700" }}>
                  {personalBest.score}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
