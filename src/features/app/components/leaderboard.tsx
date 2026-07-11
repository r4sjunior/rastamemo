"use client";

import { useEffect, useMemo, useState } from "react";
import { useAudiusPlaylist } from "@/hooks/use-audius-playlist";

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

  const { tracks: audiusTracks } = useAudiusPlaylist();
  const soundtrackArtists = useMemo(
    () => Array.from(new Set(audiusTracks.map(t => t.artist))).join(", "),
    [audiusTracks],
  );

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

        {/* Credits */}
        <div
          style={{
            flexShrink: 0,
            marginTop: "4px",
            paddingTop: "14px",
            borderTop: "2px solid transparent",
            borderImage: "linear-gradient(90deg, #e63946, #FFD700, #22c55e) 1",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: "10px",
              textAlign: "center",
              letterSpacing: "1px",
              backgroundImage: "linear-gradient(90deg, #e63946, #FFD700, #22c55e, #FFD700, #e63946)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              animation: "rasta-memo-credits-shine 4s linear infinite",
            }}
          >
            CREDITS
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { role: "Lead Developer & Programmer", name: "R4S Júnior", color: "#e63946" },
              { role: "Art & Asset Design", name: "Cryptorasta", color: "#FFD700" },
              { role: "Background Animation", name: "Giu_NFT", color: "#22c55e" },
              {
                role: "Original Soundtrack",
                name: soundtrackArtists || "Digital Dubs",
                color: "#e63946",
              },
            ].map(({ role, name, color }) => (
              <div key={role} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: FONT, fontSize: "6px", color: "#a3c4a3", marginBottom: "3px" }}>
                  {role}
                </div>
                <div style={{ fontFamily: FONT, fontSize: "8px", color }}>
                  {name}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              textAlign: "center",
              marginTop: "4px",
              padding: "10px",
              borderRadius: "8px",
              background: "rgba(255,215,0,0.06)",
              border: "1px dashed #2d5a2d",
            }}
          >
            <div style={{ fontFamily: FONT, fontSize: "6px", color: "#a3c4a3", marginBottom: "5px" }}>
              Special Thanks
            </div>
            <div
              style={{
                fontFamily: FONT,
                fontSize: "7px",
                color: "#FFD700",
                animation: "rasta-memo-credits-pulse 2.4s ease-in-out infinite",
              }}
            >
              &ldquo;The Cryptorasta Community&rdquo;
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes rasta-memo-credits-shine {
          0% { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes rasta-memo-credits-pulse {
          0%, 100% { opacity: 0.7; text-shadow: 0 0 4px rgba(255,215,0,0.3); }
          50% { opacity: 1; text-shadow: 0 0 10px rgba(255,215,0,0.7); }
        }
      `}</style>
    </div>
  );
}
