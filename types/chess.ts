// src/types/chess.ts
export interface GameStats {
  timeControl: string;
  result: string;
  white: string;
  black: string;
  opening?: string;
  date?: string;
  whiteElo?: string;
  blackElo?: string;
  whiteRatingDiff?: string;
  blackRatingDiff?: string;
}

export interface AnalysisStats {
  gameTypes: Record<string, number>;
  results: {
    wins: number;
    losses: number;
    draws: number;
  };
  openings: Array<{
    name: string;
    count: number;
    winRate: number;
  }>;
  monthlyPerformance: Array<{
    month: string;
    games: number;
    wins: number;
    winRate: number;
  }>;
  ratingProgression: Array<{
    date: string;
    rating: number;
  }>;
}
