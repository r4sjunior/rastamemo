"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ShareButton, useFarcasterUser } from "@/neynar-farcaster-sdk/mini";
import { CARD_POOL, BACK_FACE_URL } from "@/features/app/components/card-data";
import { Leaderboard } from "@/features/app/components/leaderboard";

const LOGO_URL =
  "https://remix.gg/blob/409848fd-a78f-43b9-bde4-3fd5d7371865/rasta-memo-white-kVSNuM5rtL-gQiXRqVDAa5WYGzTqA9Ec5O9lwScQ2.webp?8HV6";

const BG_URL =
  "https://remix.gg/blob/409848fd-a78f-43b9-bde4-3fd5d7371865/fundogame-edited-PFb9Qku9gN-zyV5gCodUbsyRmG85uKvJxpDYsMNiQ.webp?HQTc";

const MUSIC_URL =
  "https://lqy3lriiybxcejon.public.blob.vercel-storage.com/409848fd-a78f-43b9-bde4-3fd5d7371865/Im%20Just%20a%20Chill%20Guy-vV4Ky4X20oUr1kPVb5eRYc9u9Ys2QM.mp3?FKDH";

type Card = {
  uid: string;
  src: string;
  points: number;
  rare?: boolean;
  flipped: boolean;
  matched: boolean;
};

// Fisher-Yates — truly unbiased shuffle
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(level: number): Card[] {
  const pairCount = Math.min(level + 2, 18); // max 18 pairs on screen

  const ultraRare = CARD_POOL.filter(c => c.points === 100);
  const medium    = CARD_POOL.filter(c => c.points === 15);
  const common    = CARD_POOL.filter(c => c.points === 5);

  let slots = pairCount;
  const selected: typeof CARD_POOL = [];

  // 1. ULTRA RARE — 5% chance, max 1 pair ever
  if (ultraRare.length > 0 && Math.random() < 0.05) {
    selected.push(ultraRare[Math.floor(Math.random() * ultraRare.length)]);
    slots--;
  }

  // 2. MEDIUM — exactly 2 pairs (if available and slots allow)
  const mediumPairs = Math.min(2, slots, medium.length);
  const shuffledMedium = shuffle([...medium]);
  selected.push(...shuffledMedium.slice(0, mediumPairs));
  slots -= mediumPairs;

  // 3. COMMON — fill all remaining slots
  const shuffledCommon = shuffle([...common]);
  selected.push(...shuffledCommon.slice(0, slots));

  // Double up and shuffle the final deck
  const doubled = shuffle([...selected, ...selected]);
  return doubled.map((c, i) => ({
    uid: `${c.id}-${i}-${Date.now()}`,
    src: c.src,
    points: c.points,
    rare: c.rare,
    flipped: false,
    matched: false,
  }));
}

const STARTING_LIVES = 20;
const LIVES_PER_LEVEL = 3;

export function MiniApp() {
  const [cards, setCards] = useState<Card[]>([]);
  const [ready, setReady] = useState(false);
  const [lock, setLock] = useState(false);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [errors, setErrors] = useState(0);
  const [level, setLevel] = useState(1);
  const [phase, setPhase] = useState<"playing" | "level-complete" | "game-over">("playing");
  const [muted, setMuted] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const scoreSavedRef = useRef(false);

  const { data: user } = useFarcasterUser();
// MiniPay hook — detects if running inside Celo MiniPay
const isMiniPay = typeof window !== "undefined" && 
  !!(window as any)?.ethereum?.isMiniPay;
  const fid = user?.fid ?? 0;

  const firstCardRef = useRef<Card | null>(null);

  // Build deck only on client to avoid SSR/CSR hydration mismatch with Math.random()
  useEffect(() => {
    setCards(buildDeck(1));
    setReady(true);
  }, []);

  function startMusic() {
    audioRef.current?.play().catch(() => {});
  }

  function toggleMute() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) { a.play().catch(() => {}); setMuted(false); }
    else { a.pause(); setMuted(true); }
  }

  const startLevel = useCallback((lvl: number, currentLives?: number) => {
    firstCardRef.current = null;
    setCards(buildDeck(lvl));
    setLock(false);
    setPhase("playing");
    if (currentLives !== undefined) setLives(currentLives);
  }, []);

  function flipCard(card: Card) {
    if (lock || card.flipped || card.matched) return;
    if (firstCardRef.current?.uid === card.uid) return;

    startMusic();

    // Flip the card visually
    setCards(prev =>
      prev.map(c => c.uid === card.uid ? { ...c, flipped: true } : c)
    );

    // First card
    if (!firstCardRef.current) {
      firstCardRef.current = card;
      return;
    }

    // Second card — check match immediately using ref (never stale)
    const first = firstCardRef.current;
    const second = card;
    firstCardRef.current = null;
    setLock(true);

    if (first.src === second.src) {
      // MATCH
      setScore(prev => prev + first.points);

      setCards(prev => {
        const next = prev.map(c =>
          c.uid === first.uid || c.uid === second.uid
            ? { ...c, flipped: true, matched: true }
            : c
        );
        if (next.every(c => c.matched)) {
          setTimeout(() => setPhase("level-complete"), 200);
        }
        return next;
      });

      setLock(false);
    } else {
      // MISMATCH — lose 1 life, flip back after 800ms
      setErrors(prev => prev + 1);
      setLives(prev => {
        const next = prev - 1;
        if (next <= 0) setTimeout(() => setPhase("game-over"), 850);
        return next;
      });

      setTimeout(() => {
        setCards(prev =>
          prev.map(c =>
            c.uid === first.uid || c.uid === second.uid
              ? { ...c, flipped: false }
              : c
          )
        );
        setLock(false);
      }, 800);
    }
  }

  // Save score when game over
  useEffect(() => {
    if (phase === "game-over" && fid && score > 0 && !scoreSavedRef.current) {
      scoreSavedRef.current = true;
      fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fid, score, level }),
      }).catch(() => {});
    }
    if (phase === "playing") {
      scoreSavedRef.current = false;
    }
  }, [phase, fid, score, level]);

  function resetGame() {
    setScore(0);
    setErrors(0);
    setLevel(1);
    setLives(STARTING_LIVES);
    startLevel(1);
  }

  function nextLevel() {
    const next = level + 1;
    setLevel(next);
    // +3 lives accumulated on level complete
    setLives(prev => prev + LIVES_PER_LEVEL);
    startLevel(next);
  }

  const cols = Math.ceil(Math.sqrt(cards.length));
  const livesColor = lives > 10 ? "#22c55e" : lives > 5 ? "#FFD700" : "#ef4444";

  return (
    <div
      className="h-dvh flex flex-col overflow-hidden relative"
      style={{
        backgroundImage: `url("${BG_URL}")`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');`}</style>

      <audio ref={audioRef} src={MUSIC_URL} loop preload="auto" />

      <div className="absolute inset-0 pointer-events-none" style={{ background: "rgba(0,0,0,0.5)" }} />

      {/* HEADER */}
      <header
        className="relative z-10 shrink-0 flex items-center justify-between px-4"
        style={{ background: "rgba(5,20,5,0.9)", borderBottom: "2px solid #2d5a2d", height: "52px" }}
      >
        <img
          src={LOGO_URL}
          alt="RASTA MEMO"
          style={{ height: "32px", maxWidth: "160px", objectFit: "contain" }}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => setShowLeaderboard(true)}
            style={{
              background: "rgba(255,215,0,0.1)",
              border: "1px solid #FFD700",
              borderRadius: "8px",
              color: "#FFD700",
              cursor: "pointer",
              fontSize: "16px",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "'Press Start 2P', monospace",
            }}
            aria-label="Leaderboard"
          >
            🏆
          </button>
          <button
            onClick={toggleMute}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid #2d5a2d",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer",
              fontSize: "18px",
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {muted ? "🔇" : "🔈"}
          </button>
        </div>
      </header>

      {/* SCOREBOARD */}
      <div
        className="relative z-10 shrink-0 flex justify-around items-center px-3 py-2 gap-2"
        style={{ background: "rgba(10,30,10,0.85)", borderBottom: "1px solid #2d5a2d" }}
      >
        {[
          { label: "LVL", value: level, color: "#FFD700" },
          { label: "SCORE", value: score, color: "#FFD700" },
          { label: "LIVES", value: `❤️ ${lives}`, color: livesColor },
        ].map(({ label, value, color }) => (
          <div
            key={label}
            className="flex flex-col items-center"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid #2d5a2d",
              borderRadius: "8px",
              padding: "4px 10px",
              minWidth: "70px",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "7px", color: "#22c55e", letterSpacing: "0.05em" }}>{label}</span>
            <span style={{ fontSize: "11px", color, marginTop: "2px" }}>{value}</span>
          </div>
        ))}
      </div>

      {/* LIVES BAR */}
      <div className="relative z-10 shrink-0" style={{ height: "4px", background: "#0a1a0a" }}>
        <div style={{
          height: "100%",
          width: `${Math.min((lives / (STARTING_LIVES + level * LIVES_PER_LEVEL)) * 100, 100)}%`,
          background: livesColor,
          transition: "width 0.3s, background 0.3s",
        }} />
      </div>

      {/* GAME BOARD */}
      <main className="relative z-10 flex-1 overflow-y-auto py-2 px-2">
        {!ready && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: "#22c55e" }}>
            Loading...
          </div>
        )}
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "5px" }}>
          {cards.map(card => {
            const isFlipped = card.flipped || card.matched;
            return (
              <div
                key={card.uid}
                onClick={() => flipCard(card)}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "1/1",
                  cursor: lock || card.flipped || card.matched ? "default" : "pointer",
                  perspective: "600px",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    transformStyle: "preserve-3d",
                    transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                    transition: "transform 0.45s ease",
                  }}
                >
                  {/* Back face */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: "2px solid #2d5a2d",
                    }}
                  >
                    <img src={BACK_FACE_URL} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                  {/* Front face */}
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                      borderRadius: "6px",
                      overflow: "hidden",
                      border: `2px solid ${card.matched ? "#FFD700" : "#22c55e"}`,
                      boxShadow: card.matched ? "0 0 10px rgba(255,215,0,0.6)" : undefined,
                    }}
                  >
                    <img src={card.src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* LEADERBOARD */}
      {showLeaderboard && (
        <Leaderboard
          currentFid={fid}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* OVERLAYS */}
      {phase !== "playing" && (
        <div
          className="absolute inset-0 z-50 flex items-center justify-center px-6"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(4px)" }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #0d1a0d 0%, #1a3a1a 100%)",
              border: `2px solid ${phase === "level-complete" ? "#FFD700" : "#ef4444"}`,
              boxShadow: `0 0 30px ${phase === "level-complete" ? "rgba(255,215,0,0.3)" : "rgba(239,68,68,0.3)"}`,
              borderRadius: "18px",
              padding: "28px 24px",
              width: "100%",
              maxWidth: "320px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img
                src={phase === "level-complete"
                  ? "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/1%24Lov3001.png"
                  : "https://9gfytnfmfqhgc9m3.public.blob.vercel-storage.com/1lov3.png"}
                alt=""
                style={{ width: "72px", height: "72px", objectFit: "contain" }}
              />
            </div>
            <div style={{ fontSize: "14px", color: phase === "level-complete" ? "#FFD700" : "#ef4444", textAlign: "center" }}>
              {phase === "level-complete" ? "YAH MON!" : "GAME OVER"}
            </div>
            <div style={{ fontSize: "8px", color: "#a3c4a3", textAlign: "center", lineHeight: "1.8" }}>
              {phase === "level-complete" ? `Level ${level} cleared!\nKeep it cool...` : "Better luck next time, mon!"}
            </div>
            {phase === "level-complete" && (
              <div style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid #ef4444",
                borderRadius: "8px",
                padding: "6px 14px",
                fontSize: "9px",
                color: "#ef4444",
              }}>
                +{LIVES_PER_LEVEL} ❤️ bonus lives!
              </div>
            )}
            <div style={{ background: "#0a120a", border: "1px solid #2d5a2d", borderRadius: "8px", padding: "8px 16px", fontSize: "10px" }}>
              <span style={{ color: "#22c55e" }}>SCORE: </span>
              <span style={{ color: "#FFD700" }}>{score}</span>
            </div>
            <button
              onClick={phase === "level-complete" ? nextLevel : resetGame}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                border: "none",
                background: phase === "level-complete"
                  ? "linear-gradient(135deg, #22c55e, #16a34a)"
                  : "linear-gradient(135deg, #ef4444, #b91c1c)",
                color: "#fff",
                fontSize: "10px",
                cursor: "pointer",
                fontFamily: "'Press Start 2P', monospace",
                minHeight: "44px",
              }}
            >
              {phase === "level-complete" ? "NEXT LEVEL >" : "PLAY AGAIN"}
            </button>
            {phase === "game-over" && (
              <>
                <button
                  onClick={() => setShowLeaderboard(true)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "10px",
                    border: "1px solid #FFD700",
                    background: "rgba(255,215,0,0.1)",
                    color: "#FFD700",
                    fontSize: "9px",
                    cursor: "pointer",
                    fontFamily: "'Press Start 2P', monospace",
                    minHeight: "44px",
                  }}
                >
                  🏆 LEADERBOARD
                </button>
                <ShareButton
                  text={`I scored ${score} pts in RASTA MEMO! 🌿🎴 Can you beat me?`}
                  queryParams={{ score: score.toString() }}
                  variant="outline"
                >
                  SHARE SCORE 🌿
                </ShareButton>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
