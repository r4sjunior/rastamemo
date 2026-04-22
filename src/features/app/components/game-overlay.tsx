"use client";

import { ShareButton } from "@/neynar-farcaster-sdk/mini";

type GameOverlayProps = {
  phase: "level-complete" | "game-over";
  level: number;
  score: number;
  onNext: () => void;
  onReset: () => void;
};

export function GameOverlay({ phase, level, score, onNext, onReset }: GameOverlayProps) {
  const isLevelComplete = phase === "level-complete";

  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center z-50 px-6"
      style={{
        background: "rgba(0, 0, 0, 0.85)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        className="w-full max-w-xs rounded-2xl p-6 flex flex-col items-center gap-4"
        style={{
          background: "linear-gradient(135deg, #0d1a0d 0%, #1a3a1a 100%)",
          border: `2px solid ${isLevelComplete ? "#FFD700" : "#ef4444"}`,
          boxShadow: `0 0 30px ${isLevelComplete ? "rgba(255,215,0,0.3)" : "rgba(239,68,68,0.3)"}`,
        }}
      >
        {/* Emoji */}
        <div className="text-5xl">{isLevelComplete ? "🎉" : "💀"}</div>

        {/* Title */}
        <h2
          className="text-center leading-tight"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "14px",
            color: isLevelComplete ? "#FFD700" : "#ef4444",
          }}
        >
          {isLevelComplete ? "YAH MON!" : "GAME OVER"}
        </h2>

        {/* Subtitle */}
        <p
          className="text-center"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
            color: "#a3c4a3",
            lineHeight: "1.6",
          }}
        >
          {isLevelComplete
            ? `Level ${level} cleared!\nKeep it cool...`
            : "Better luck next time, mon!"}
        </p>

        {/* Score */}
        <div
          className="px-4 py-2 rounded-lg"
          style={{ background: "#0a120a", border: "1px solid #2d5a2d" }}
        >
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: "#22c55e" }}>
            SCORE: {" "}
          </span>
          <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "10px", color: "#FFD700" }}>
            {score}
          </span>
        </div>

        {/* Button */}
        <button
          onClick={isLevelComplete ? onNext : onReset}
          className="w-full py-3 rounded-xl font-bold transition-transform active:scale-95"
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "10px",
            background: isLevelComplete
              ? "linear-gradient(135deg, #22c55e, #16a34a)"
              : "linear-gradient(135deg, #ef4444, #b91c1c)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            minHeight: "44px",
          }}
        >
          {isLevelComplete ? "NEXT LEVEL ▶" : "PLAY AGAIN ↺"}
        </button>

        {/* Share button - only on game over */}
        {!isLevelComplete && (
          <ShareButton
            text={`I scored ${score} points in RASTA MEMO! 🌿🎴 Can you beat me?`}
            queryParams={{ score: score.toString() }}
            variant="outline"
            size="default"
          >
            SHARE SCORE
          </ShareButton>
        )}
      </div>
    </div>
  );
}
