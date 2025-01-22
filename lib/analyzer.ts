import { GameStats } from "@/types/chess";
import { categorizeTimeControl } from "./pgn-parser";
import { AnalysisStats } from "@/types/chess";

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
    resultDistribution: {
      wins: { average: 0, shortest: 0, longest: 0 },
      losses: { average: 0, shortest: 0, longest: 0 },
      draws: { average: 0, shortest: 0, longest: 0 },
    },
    colorStats: {
      White: { wins: 0, losses: 0, draws: 0 },
      Black: { wins: 0, losses: 0, draws: 0 },
    },
  };

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let currentDrawStreak = 0;

  const gameLengths = {
    wins: [] as number[],
    losses: [] as number[],
    draws: [] as number[],
  };

  const monthlyStats: Record<
    string,
    { games: number; wins: number; ratingChange: number }
  > = {};

  const headToHeadStats: Record<
    string,
    { wins: 0; losses: 0; draws: 0; lastPlayed: Date }
  > = {};

  const openingStats: Record<
    string,
    { count: number; wins: number; losses: number; draws: number }
  > = {};

  // Main processing loop
  games.forEach((game) => {
    const timeControl = categorizeTimeControl(game.timeControl);
    stats.gameTypes[timeControl] = (stats.gameTypes[timeControl] || 0) + 1;

    // Process game result
    const isWhite = game.white === username;
    let isWin = false;
    let isDraw = false;

    // Result processing
    if (game.result === "1-0") {
      if (isWhite) {
        stats.results.wins++;
        stats.colorStats.White.wins++;
        currentWinStreak++;
        currentLossStreak = 0;
        currentDrawStreak = 0;
        isWin = true;
      } else {
        stats.results.losses++;
        stats.colorStats.Black.losses++;
        currentLossStreak++;
        currentWinStreak = 0;
        currentDrawStreak = 0;
      }
    } else if (game.result === "0-1") {
      if (!isWhite) {
        stats.results.wins++;
        stats.colorStats.Black.wins++;
        currentWinStreak++;
        currentLossStreak = 0;
        currentDrawStreak = 0;
        isWin = true;
      } else {
        stats.results.losses++;
        stats.colorStats.White.losses++;
        currentLossStreak++;
        currentWinStreak = 0;
        currentDrawStreak = 0;
      }
    } else if (game.result === "1/2-1/2") {
      stats.results.draws++;
      currentDrawStreak++;
      currentWinStreak = 0;
      currentLossStreak = 0;
      isDraw = true;
      if (isWhite) {
        stats.colorStats.White.draws++;
      } else {
        stats.colorStats.Black.draws++;
      }
    }

    // Update streaks
    stats.streaks.winStreak = Math.max(stats.streaks.winStreak, currentWinStreak);
    stats.streaks.lossStreak = Math.max(stats.streaks.lossStreak, currentLossStreak);
    stats.streaks.drawStreak = Math.max(stats.streaks.drawStreak, currentDrawStreak);

    // Process game length
    const gameLength = game.moves.length;
    stats.gameLengths.push({ length: gameLength, result: game.result });
    if (gameLength > 1) {
      if (isWin) gameLengths.wins.push(gameLength);
      else if (isDraw) gameLengths.draws.push(gameLength);
      else gameLengths.losses.push(gameLength);
    }

    // Monthly performance
    if (game.date) {
      const month = new Date(game.date).toISOString().slice(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = { games: 0, wins: 0, ratingChange: 0 };
      }
      monthlyStats[month].games++;
      if (isWin) {
        monthlyStats[month].wins++;
        const ratingDiff = isWhite
          ? parseInt(game.whiteRatingDiff || "0")
          : parseInt(game.blackRatingDiff || "0");
        monthlyStats[month].ratingChange += ratingDiff;
      }
    }

    // Rating progression
    if (game.date) {
      const rating = isWhite
        ? parseInt(game.whiteElo || "0")
        : parseInt(game.blackElo || "0");
      stats.ratingProgression.push({
        date: new Date(game.date),
        rating,
        gameType: timeControl,
      });
    }

    // Openings tracking
    const opening = game.opening || "Unknown";
    if (!openingStats[opening]) {
      openingStats[opening] = { count: 0, wins: 0, losses: 0, draws: 0 };
    }
    openingStats[opening].count++;
    if (isWin) openingStats[opening].wins++;
    else if (isDraw) openingStats[opening].draws++;
    else openingStats[opening].losses++;

    // Head-to-head tracking
    const opponent = isWhite ? game.black : game.white;
    if (opponent) {
      if (!headToHeadStats[opponent]) {
        headToHeadStats[opponent] = { wins: 0, losses: 0, draws: 0, lastPlayed: new Date() };
      }
      if (isWin) headToHeadStats[opponent].wins++;
      else if (isDraw) headToHeadStats[opponent].draws++;
      else headToHeadStats[opponent].losses++;
      headToHeadStats[opponent].lastPlayed = new Date(game.date || new Date());
    }
  });

  // Transform monthly stats
  stats.monthlyPerformance = Object.entries(monthlyStats).map(([month, data]) => ({
    month,
    games: data.games,
    wins: data.wins,
    winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
    ratingChange: data.ratingChange,
  }));

  // Transform openings data
  stats.openings = Object.entries(openingStats)
    .map(([name, data]) => ({
      name,
      count: data.count,
      wins: data.wins,
      losses: data.losses,
      draws: data.draws,
      winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // Transform head-to-head data
  stats.headToHead = Object.entries(headToHeadStats)
    .map(([opponent, record]) => {
      const totalGames = record.wins + record.losses + record.draws;
      return {
        opponent,
        games: totalGames,
        wins: record.wins,
        losses: record.losses,
        draws: record.draws,
        winRate: totalGames > 0 ? (record.wins / totalGames) * 100 : 0,
        lastPlayed: record.lastPlayed,
      };
    })
    .sort((a, b) => b.games - a.games);

  // Calculate result distribution
  const calculateStats = (arr: number[]) => ({
    average: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
    shortest: arr.length ? Math.min(...arr) : 0,
    longest: arr.length ? Math.max(...arr) : 0,
  });

  stats.resultDistribution = {
    wins: calculateStats(gameLengths.wins),
    losses: calculateStats(gameLengths.losses),
    draws: calculateStats(gameLengths.draws),
  };

  // Sort rating progression chronologically
  stats.ratingProgression.sort((a, b) => a.date.getTime() - b.date.getTime());

  return stats;
};
