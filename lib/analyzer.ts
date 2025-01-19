import { GameStats } from "@/types/chess";
import { categorizeTimeControl } from "./pgn-parser";

interface AnalysisStats {
  gameTypes: Record<string, number>;
  results: {
    wins: number;
    losses: number;
    draws: number;
  };
  streaks: {
    winStreak: number;
    lossStreak: number;
    drawStreak: number;
  };
  gameLengths: Array<{ length: number; result: string }>;
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
  headToHead: Array<{
    opponent: string;
    games: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: number;
  }>;
  resultDistribution: Array<{
    result: string;
    averageLength: number;
    shortestGame: number;
    longestGame: number;
  }>;
}

export const analyzeGames = (
  games: GameStats[],
  username: string
): AnalysisStats => {
  const stats: AnalysisStats = {
    gameTypes: {},
    results: { wins: 0, losses: 0, draws: 0 },
    streaks: { winStreak: 0, lossStreak: 0, drawStreak: 0 },
    gameLengths: [],
    openings: [],
    monthlyPerformance: [],
    ratingProgression: [],
    headToHead: [],
    resultDistribution: [],
  };

  const monthlyStats: Record<string, { games: number; wins: number }> = {};
  const openingStats: Record<string, { count: number; wins: number }> = {};
  const ratingHistory: { date: string; rating: number }[] = [];
  const headToHeadStats: Record<
    string,
    { wins: number; losses: number; draws: number }
  > = {};

  let currentStreak = { wins: 0, losses: 0, draws: 0 };
  const gameLengthsByResult: Record<string, number[]> = {
    "1-0": [],
    "0-1": [],
    "1/2-1/2": [],
  };

  games.forEach((game) => {
    // Game types
    const timeCategory = categorizeTimeControl(game.timeControl);
    stats.gameTypes[timeCategory] = (stats.gameTypes[timeCategory] || 0) + 1;

    // Results
    if (game.result === "1-0" && game.white === username) {
      stats.results.wins++;
      currentStreak.wins++;
      currentStreak.losses = 0;
      currentStreak.draws = 0;
    } else if (game.result === "0-1" && game.black === username) {
      stats.results.wins++;
      currentStreak.wins++;
      currentStreak.losses = 0;
      currentStreak.draws = 0;
    } else if (game.result === "1/2-1/2") {
      stats.results.draws++;
      currentStreak.draws++;
      currentStreak.wins = 0;
      currentStreak.losses = 0;
    } else if (game.result !== "*") {
      stats.results.losses++;
      currentStreak.losses++;
      currentStreak.wins = 0;
      currentStreak.draws = 0;
    }

    // Update streaks
    stats.streaks.winStreak = Math.max(
      stats.streaks.winStreak,
      currentStreak.wins
    );
    stats.streaks.lossStreak = Math.max(
      stats.streaks.lossStreak,
      currentStreak.losses
    );
    stats.streaks.drawStreak = Math.max(
      stats.streaks.drawStreak,
      currentStreak.draws
    );

    // Game lengths
    const gameLength = game.moves.length;
    stats.gameLengths.push({
      length: gameLength,
      result: game.result,
    });

    if (game.result in gameLengthsByResult) {
      gameLengthsByResult[game.result].push(gameLength);
    }

    // Monthly performance
    if (game.date) {
      const month = game.date.substring(0, 7); // YYYY-MM
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

    // Head-to-head analysis
    const opponent = game.white === username ? game.black : game.white;
    if (opponent) {
      if (!headToHeadStats[opponent]) {
        headToHeadStats[opponent] = { wins: 0, losses: 0, draws: 0 };
      }

      if (game.result === "1-0" && game.white === username) {
        headToHeadStats[opponent].wins++;
      } else if (game.result === "0-1" && game.black === username) {
        headToHeadStats[opponent].wins++;
      } else if (game.result === "1/2-1/2") {
        headToHeadStats[opponent].draws++;
      } else {
        headToHeadStats[opponent].losses++;
      }
    }
  });

  // Format monthly performance
  stats.monthlyPerformance = Object.entries(monthlyStats)
    .map(([month, data]) => ({
      month,
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

  // Format head-to-head stats
  stats.headToHead = Object.entries(headToHeadStats)
    .map(([opponent, record]) => {
      const totalGames = record.wins + record.losses + record.draws;
      return {
        opponent,
        games: totalGames,
        wins: record.wins,
        losses: record.losses,
        draws: record.draws,
        winRate: (record.wins / totalGames) * 100,
      };
    })
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

  // Format result distribution
  stats.resultDistribution = Object.entries(gameLengthsByResult).map(
    ([result, lengths]) => {
      const averageLength =
        lengths.reduce((sum, length) => sum + length, 0) / lengths.length || 0;
      return {
        result,
        averageLength,
        shortestGame: Math.min(...lengths),
        longestGame: Math.max(...lengths),
      };
    }
  );

  return stats;
};

export const getRatingProgression = (
  games: GameStats[],
  username: string,
  gameType: string
) => {
  const filteredGames = games.filter(
    (game) => categorizeTimeControl(game.timeControl) === gameType
  );

  return filteredGames.map((game) => ({
    date: game.date || "",
    rating:
      game.white === username
        ? parseInt(game.whiteElo || "0")
        : parseInt(game.blackElo || "0"),
  }));
};
