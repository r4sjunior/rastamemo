"use client";

import type { GameCard } from "@/features/app/types";
import { BACK_FACE_URL } from "@/features/app/components/card-data";

type MemoryCardProps = {
  card: GameCard;
  onFlip: (instanceId: string) => void;
  disabled: boolean;
};

export function MemoryCard({ card, onFlip, disabled }: MemoryCardProps) {
  // Card is clickable only if: board not locked, card not already flipped/matched
  const isClickable = !disabled && !card.isFlipped && !card.isMatched;

  return (
    <div
      className="relative select-none"
      style={{ perspective: "600px", cursor: isClickable ? "pointer" : "default" }}
      onClick={() => {
        if (isClickable) onFlip(card.instanceId);
      }}
      role="button"
      aria-label={card.isFlipped ? "Card revealed" : "Flip card"}
    >
      <div
        className="relative w-full transition-transform duration-500"
        style={{
          aspectRatio: "1/1",
          transformStyle: "preserve-3d",
          transform: card.isFlipped || card.isMatched ? "rotateY(180deg)" : "rotateY(0deg)",
        }}
      >
        {/* Back face */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            border: "2px solid #2d5a2d",
            backgroundColor: "#1a3a1a",
          }}
        >
          <img
            src={BACK_FACE_URL}
            alt="Card back"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>

        {/* Front face */}
        <div
          className="absolute inset-0 rounded-lg overflow-hidden"
          style={{
            backfaceVisibility: "hidden",
            WebkitBackfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            border: `2px solid ${card.isMatched ? "#FFD700" : "#22c55e"}`,
            backgroundColor: "#0d1a0d",
            boxShadow: card.isMatched ? "0 0 10px rgba(255,215,0,0.5)" : undefined,
          }}
        >
          <img
            src={card.src}
            alt="Card front"
            className="w-full h-full object-cover"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}
