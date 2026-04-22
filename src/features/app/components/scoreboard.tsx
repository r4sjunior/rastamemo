"use client";

import { MAX_ERRORS } from "@/features/app/components/card-data";

type ScoreboardProps = {
  level: number;
  score: number;
  errors: number;
};

export function Scoreboard({ level, score, errors }: ScoreboardProps) {
  const errorsRemaining = MAX_ERRORS - errors;
  const errorsPercent = (errors / MAX_ERRORS) * 100;

  return (
    <div
      className="flex items-center justify-between px-4 py-2 shrink-0"
      style={{
        background: "linear-gradient(90deg, #0d1a0d 0%, #1a2e1a 100%)",
        borderBottom: "1px solid #2d5a2d",
      }}
    >
      {/* Level */}
      <div className="flex flex-col items-center min-w-[60px]">
        <span className="text-xs font-bold" style={{ color: "#22c55e", fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
          LEVEL
        </span>
        <span className="text-lg font-bold" style={{ color: "#FFD700", fontFamily: "'Press Start 2P', monospace" }}>
          {level}
        </span>
      </div>

      {/* Score */}
      <div className="flex flex-col items-center flex-1 mx-2">
        <span className="text-xs font-bold" style={{ color: "#22c55e", fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
          SCORE
        </span>
        <span className="text-lg font-bold" style={{ color: "#FFD700", fontFamily: "'Press Start 2P', monospace" }}>
          {score}
        </span>
      </div>

      {/* Errors */}
      <div className="flex flex-col items-center min-w-[70px]">
        <span className="text-xs font-bold" style={{ color: errorsPercent > 60 ? "#ef4444" : "#22c55e", fontFamily: "'Press Start 2P', monospace", fontSize: "8px" }}>
          ERRORS
        </span>
        <span className="text-sm font-bold" style={{ color: errorsPercent > 60 ? "#ef4444" : "#fff", fontFamily: "'Press Start 2P', monospace", fontSize: "10px" }}>
          {errors}/{MAX_ERRORS}
        </span>
        <div className="w-full h-1 rounded-full mt-1" style={{ background: "#1a3a1a" }}>
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{
              width: `${errorsPercent}%`,
              background: errorsPercent > 60 ? "#ef4444" : "#22c55e",
            }}
          />
        </div>
      </div>
    </div>
  );
}
