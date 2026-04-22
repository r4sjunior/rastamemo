"use client";

import type { GameCard } from "@/features/app/types";
import { MemoryCard } from "@/features/app/components/memory-card";

type GameBoardProps = {
  cards: GameCard[];
  onFlip: (instanceId: string) => void;
  lockBoard: boolean;
};

export function GameBoard({ cards, onFlip, lockBoard }: GameBoardProps) {
  const cols = Math.ceil(Math.sqrt(cards.length));

  return (
    <div
      className="w-full px-2"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: "6px",
      }}
    >
      {cards.map((card) => (
        <MemoryCard
          key={card.instanceId}
          card={card}
          onFlip={onFlip}
          disabled={lockBoard}
        />
      ))}
    </div>
  );
}
