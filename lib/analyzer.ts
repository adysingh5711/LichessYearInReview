import { GameStats } from "@/types/chess";
import { categorizeTimeControl } from "./pgn-parser";

interface AnalysisStats {
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

export const analyzeGames = (
  games: GameStats[],
  username: string
): AnalysisStats => {
  const stats: AnalysisStats = {
    gameTypes: {},
    results: { wins: 0, losses: 0, draws: 0 },
    openings: [],
    monthlyPerformance: [],
    ratingProgression: [],
  };

  // Track monthly stats
  const monthlyStats: Record<string, { games: number; wins: number }> = {};
  const openingStats: Record<string, { count: number; wins: number }> = {};
  const ratingHistory: { date: string; rating: number }[] = [];

  games.forEach((game) => {
    // Game types
    const timeCategory = categorizeTimeControl(game.timeControl);
    stats.gameTypes[timeCategory] = (stats.gameTypes[timeCategory] || 0) + 1;

    // Results
    if (game.result === "1-0" && game.white === username) stats.results.wins++;
    else if (game.result === "0-1" && game.black === username)
      stats.results.wins++;
    else if (game.result === "1/2-1/2") stats.results.draws++;
    else if (game.result !== "*") stats.results.losses++;

    // Monthly performance
    if (game.date) {
      const month = game.date.substring(0, 7); // YYYY.MM
      if (!monthlyStats[month]) monthlyStats[month] = { games: 0, wins: 0 };
      monthlyStats[month].games++;
      if (
        (game.result === "1-0" && game.white === username) ||
        (game.result === "0-1" && game.black === username)
      ) {
        monthlyStats[month].wins++;
      }
    }

    // Openings
    if (game.opening) {
      if (!openingStats[game.opening]) {
        openingStats[game.opening] = { count: 0, wins: 0 };
      }
      openingStats[game.opening].count++;
      if (
        (game.result === "1-0" && game.white === username) ||
        (game.result === "0-1" && game.black === username)
      ) {
        openingStats[game.opening].wins++;
      }
    }

    // Rating progression
    if (game.date) {
      const rating =
        game.white === username
          ? parseInt(game.whiteElo || "0")
          : parseInt(game.blackElo || "0");
      if (rating) {
        ratingHistory.push({ date: game.date, rating });
      }
    }
  });

  // Format monthly performance
  stats.monthlyPerformance = Object.entries(monthlyStats)
    .map(([month, data]) => ({
      month: month.replace(".", "-"),
      games: data.games,
      wins: data.wins,
      winRate: (data.wins / data.games) * 100,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Format openings
  stats.openings = Object.entries(openingStats)
    .map(([name, data]) => ({
      name,
      count: data.count,
      winRate: (data.wins / data.count) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Format rating progression
  stats.ratingProgression = ratingHistory.sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  return stats;
};

export type { AnalysisStats };
