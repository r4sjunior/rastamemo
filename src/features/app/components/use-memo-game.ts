"use client";

import { useReducer, useCallback } from "react";
import type { GameCard } from "@/features/app/types";
import { CARD_POOL, MAX_ERRORS } from "@/features/app/components/card-data";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = "playing" | "level-complete" | "game-over";

type State = {
  phase: Phase;
  level: number;
  score: number;
  errors: number;
  cards: GameCard[];
  // We only track the FIRST selected card's instanceId.
  // When pendingFlipBack is set, the board is locked waiting for the timeout.
  firstId: string | null;
  locked: boolean;
};

type Action =
  | { type: "FLIP"; instanceId: string }
  | { type: "FLIP_BACK"; firstId: string; secondId: string }
  | { type: "NEXT_LEVEL" }
  | { type: "RESET" };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildCards(level: number): GameCard[] {
  const count = Math.min(level + 2, CARD_POOL.length);
  const selected = shuffle([...CARD_POOL]).slice(0, count);
  const doubled = shuffle([...selected, ...selected]);
  return doubled.map((card, i) => ({
    ...card,
    instanceId: `${card.id}-${i}-${Date.now()}`,
    isFlipped: false,
    isMatched: false,
  }));
}

function initialState(): State {
  return {
    phase: "playing",
    level: 1,
    score: 0,
    errors: 0,
    cards: buildCards(1),
    firstId: null,
    locked: false,
  };
}

// ---------------------------------------------------------------------------
// Reducer — all game logic lives here, no side-effects
// ---------------------------------------------------------------------------

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FLIP": {
      if (state.locked || state.phase !== "playing") return state;

      const { instanceId } = action;
      if (instanceId === state.firstId) return state; // same card

      const card = state.cards.find((c) => c.instanceId === instanceId);
      if (!card || card.isFlipped || card.isMatched) return state;

      // Flip this card
      const flipped = state.cards.map((c) =>
        c.instanceId === instanceId ? { ...c, isFlipped: true } : c
      );

      // First card selected
      if (state.firstId === null) {
        return { ...state, cards: flipped, firstId: instanceId };
      }

      // Second card selected — check match
      const first = state.cards.find((c) => c.instanceId === state.firstId)!;

      if (first.src === card.src) {
        // MATCH
        const matched = flipped.map((c) =>
          c.instanceId === state.firstId || c.instanceId === instanceId
            ? { ...c, isFlipped: true, isMatched: true }
            : c
        );
        const newScore = state.score + first.points;
        const allMatched = matched.every((c) => c.isMatched);

        return {
          ...state,
          score: newScore,
          cards: matched,
          firstId: null,
          locked: false,
          phase: allMatched ? "level-complete" : "playing",
        };
      }

      // MISMATCH — lock board, timer will dispatch FLIP_BACK
      return {
        ...state,
        cards: flipped,
        firstId: null,
        locked: true,
      };
    }

    case "FLIP_BACK": {
      const newErrors = state.errors + 1;
      const restored = state.cards.map((c) =>
        c.instanceId === action.firstId || c.instanceId === action.secondId
          ? { ...c, isFlipped: false }
          : c
      );
      return {
        ...state,
        errors: newErrors,
        cards: restored,
        locked: false,
        phase: newErrors >= MAX_ERRORS ? "game-over" : "playing",
      };
    }

    case "NEXT_LEVEL": {
      const next = state.level + 1;
      return {
        phase: "playing",
        level: next,
        score: state.score,
        errors: state.errors,
        cards: buildCards(next),
        firstId: null,
        locked: false,
      };
    }

    case "RESET":
      return initialState();

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useMemoGame() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  const flipCard = useCallback(
    (instanceId: string) => {
      if (state.locked || state.phase !== "playing") return;

      const card = state.cards.find((c) => c.instanceId === instanceId);
      if (!card || card.isFlipped || card.isMatched) return;
      if (instanceId === state.firstId) return;

      // If this is the second card and it won't match → schedule flip-back
      if (state.firstId !== null) {
        const first = state.cards.find((c) => c.instanceId === state.firstId);
        if (first && first.src !== card.src) {
          const fId = state.firstId;
          const sId = instanceId;
          dispatch({ type: "FLIP", instanceId });
          setTimeout(() => {
            dispatch({ type: "FLIP_BACK", firstId: fId, secondId: sId });
          }, 800);
          return;
        }
      }

      dispatch({ type: "FLIP", instanceId });
    },
    [state]
  );

  const nextLevel = useCallback(() => dispatch({ type: "NEXT_LEVEL" }), []);
  const resetGame = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    state: {
      phase: state.phase,
      level: state.level,
      score: state.score,
      errors: state.errors,
      cards: state.cards,
      lockBoard: state.locked,
      firstCard: null,
      secondCard: null,
    },
    flipCard,
    nextLevel,
    resetGame,
  };
}
