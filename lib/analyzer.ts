import { GameStats, AnalysisStats } from "@/types/chess";
import { categorizeTimeControl, parsePGNDate } from "./pgn-parser";

export const analyzeGames = (
  games: GameStats[],
  username: string
): AnalysisStats => {
  // Initialize the stats object.
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
    peakRatings: {},
  };

  // Streak tracking
  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let currentDrawStreak = 0;

  // For accumulating game lengths per result
  const gameLengths = {
    wins: { sum: 0, count: 0, min: Infinity, max: -Infinity },
    losses: { sum: 0, count: 0, min: Infinity, max: -Infinity },
    draws: { sum: 0, count: 0, min: Infinity, max: -Infinity },
  };

  // Aggregation objects for monthly stats, head-to-head, and openings.
  const monthlyStats: Record<string, { games: number; wins: number; ratingChange: number }> = {};
  const headToHeadStats: Record<
    string,
    { wins: number; losses: number; draws: number; lastPlayed: Date }
  > = {};
  const openingStats: Record<
    string,
    { count: number; wins: number; losses: number; draws: number }
  > = {};
  const peakRatings: Record<string, number> = {};

  // Process each game using a for-of loop.
  for (const game of games) {
    // Skip processing for matchups if opponent is Anonymous
    const opponent = game.white === username ? game.black : game.white;
    const isValidOpponent = opponent !== 'Anonymous';

    // Categorize game by time control.
    const timeControl = categorizeTimeControl(game.timeControl);
    stats.gameTypes[timeControl] = (stats.gameTypes[timeControl] || 0) + 1;

    const isWhite = game.white === username;
    let isWin = false;
    let isDraw = false;

    // Process game result using a switch to consolidate similar logic.
    switch (game.result) {
      case "1-0":
        if (isWhite) {
          stats.results.wins++;
          stats.colorStats.White.wins++;
          currentWinStreak++;
          currentLossStreak = currentDrawStreak = 0;
          isWin = true;
        } else {
          stats.results.losses++;
          stats.colorStats.Black.losses++;
          currentLossStreak++;
          currentWinStreak = currentDrawStreak = 0;
        }
        break;
      case "0-1":
        if (!isWhite) {
          stats.results.wins++;
          stats.colorStats.Black.wins++;
          currentWinStreak++;
          currentLossStreak = currentDrawStreak = 0;
          isWin = true;
        } else {
          stats.results.losses++;
          stats.colorStats.White.losses++;
          currentLossStreak++;
          currentWinStreak = currentDrawStreak = 0;
        }
        break;
      case "1/2-1/2":
        stats.results.draws++;
        if (isWhite) {
          stats.colorStats.White.draws++;
        } else {
          stats.colorStats.Black.draws++;
        }
        currentDrawStreak++;
        currentWinStreak = currentLossStreak = 0;
        isDraw = true;
        break;
    }
    // Update max streaks.
    stats.streaks.winStreak = Math.max(stats.streaks.winStreak, currentWinStreak);
    stats.streaks.lossStreak = Math.max(stats.streaks.lossStreak, currentLossStreak);
    stats.streaks.drawStreak = Math.max(stats.streaks.drawStreak, currentDrawStreak);

    // If the game has a date, compute it once and use it in multiple places.
    if (game.date) {
      const gameDate = new Date(game.date); // Cached Date object.
      const month = gameDate.toISOString().slice(0, 7);
      if (!monthlyStats[month]) {
        monthlyStats[month] = { games: 0, wins: 0, ratingChange: 0 };
      }
      monthlyStats[month].games++;
      if (isWin) {
        monthlyStats[month].wins++;
        // Compute rating difference once.
        const ratingDiff = isWhite
          ? parseInt(game.whiteRatingDiff || "0", 10)
          : parseInt(game.blackRatingDiff || "0", 10);
        monthlyStats[month].ratingChange += ratingDiff;
      }
      // Record rating progression.
      const rating = isWhite
        ? parseInt(game.whiteElo || "0", 10)
        : parseInt(game.blackElo || "0", 10);
      stats.ratingProgression.push({
        date: gameDate,
        rating,
        gameType: timeControl,
      });
      // Update peak rating for this time control.
      if (!peakRatings[timeControl] || rating > peakRatings[timeControl]) {
        peakRatings[timeControl] = rating;
      }
    }

    // Process openings.
    const opening = game.opening?.trim() || "Unknown Opening";
    if (!openingStats[opening]) {
      openingStats[opening] = { count: 0, wins: 0, losses: 0, draws: 0 };
    }
    openingStats[opening].count++;

    // Update opening results based on game outcome
    if (isWin) {
      openingStats[opening].wins++;
    } else if (isDraw) {
      openingStats[opening].draws++;
    } else {
      openingStats[opening].losses++;
    }

    // Only process head-to-head stats for non-Anonymous opponents
    if (isValidOpponent) {
      if (!headToHeadStats[opponent]) {
        headToHeadStats[opponent] = {
          wins: 0,
          losses: 0,
          draws: 0,
          lastPlayed: game.date || new Date()
        };
      }

      if (isWin) {
        headToHeadStats[opponent].wins++;
      } else if (isDraw) {
        headToHeadStats[opponent].draws++;
      } else {
        headToHeadStats[opponent].losses++;
      }
      // Update last played date if more recent
      if (game.date && game.date > headToHeadStats[opponent].lastPlayed) {
        headToHeadStats[opponent].lastPlayed = game.date;
      }
    }

    // Process game lengths: compute once.
    const gameLength = game.moves ? game.moves.length : 0;
    if (gameLength > 0) {
      if (isWin) {
        gameLengths.wins.sum += gameLength;
        gameLengths.wins.count++;
        gameLengths.wins.min = Math.min(gameLengths.wins.min, gameLength);
        gameLengths.wins.max = Math.max(gameLengths.wins.max, gameLength);
      } else if (isDraw) {
        gameLengths.draws.sum += gameLength;
        gameLengths.draws.count++;
        gameLengths.draws.min = Math.min(gameLengths.draws.min, gameLength);
        gameLengths.draws.max = Math.max(gameLengths.draws.max, gameLength);
      } else {
        gameLengths.losses.sum += gameLength;
        gameLengths.losses.count++;
        gameLengths.losses.min = Math.min(gameLengths.losses.min, gameLength);
        gameLengths.losses.max = Math.max(gameLengths.losses.max, gameLength);
      }
    }
  }

  // Transform monthlyStats into an array sorted by month.
  stats.monthlyPerformance = Object.entries(monthlyStats)
    .map(([month, data]) => ({
      month,
      games: data.games,
      wins: data.wins,
      winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
      ratingChange: data.ratingChange,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Transform openings into an array sorted by descending count.
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

  // Transform head-to-head statistics.
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

  // Helper: calculate average, shortest, and longest game lengths.
  const calculateStats = (data: { sum: number; count: number; min: number; max: number }) => ({
    average: data.count ? data.sum / data.count : 0,
    shortest: data.count ? data.min : 0,
    longest: data.count ? data.max : 0,
  });

  stats.resultDistribution = {
    wins: calculateStats(gameLengths.wins),
    losses: calculateStats(gameLengths.losses),
    draws: calculateStats(gameLengths.draws),
  };

  stats.peakRatings = peakRatings;

  return stats;
};
