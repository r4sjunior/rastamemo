export type CardData = {
  id: string;
  src: string;
  points: number;
  rare?: boolean;
};

export type GameCard = CardData & {
  instanceId: string;
  isFlipped: boolean;
  isMatched: boolean;
};

export type GamePhase = "playing" | "level-complete" | "game-over";

export type GameState = {
  phase: GamePhase;
  level: number;
  score: number;
  errors: number;
  cards: GameCard[];
  firstCard: GameCard | null;
  secondCard: GameCard | null;
  lockBoard: boolean;
};
