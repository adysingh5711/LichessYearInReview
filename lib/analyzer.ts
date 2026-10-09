import { GameStats, AnalysisStats } from "@/types/chess";
import { categorizeTimeControl } from "./pgn-parser";

type Bucket = "wins" | "losses" | "draws";
const BUCKETS: Bucket[] = ["wins", "losses", "draws"];
const tally = () => ({ wins: 0, losses: 0, draws: 0 });

export const analyzeGames = (
  games: GameStats[],
  username: string
): AnalysisStats => {
  const gameTypes: Record<string, number> = {};
  const results = tally();
  const colorStats = { White: tally(), Black: tally() };
  const run = tally(); // current streak per bucket
  const maxRun = tally(); // longest streak per bucket
  const ratingProgression: AnalysisStats["ratingProgression"] = [];
  const gameLengths = Object.fromEntries(
    BUCKETS.map((b) => [b, { sum: 0, count: 0, min: Infinity, max: -Infinity }])
  ) as Record<Bucket, { sum: number; count: number; min: number; max: number }>;

  const monthlyStats: Record<string, { games: number; wins: number; ratingChange: number }> = {};
  const headToHeadStats: Record<string, ReturnType<typeof tally> & { lastPlayed: Date }> = {};
  const openingStats: Record<string, ReturnType<typeof tally> & { count: number }> = {};
  const normalizedUsername = username.trim().toLowerCase();

  for (const game of games) {
    const isWhite = game.white.toLowerCase() === normalizedUsername;
    const opponent = isWhite ? game.black : game.white;
    const timeControl = categorizeTimeControl(game.timeControl);
    gameTypes[timeControl] = (gameTypes[timeControl] || 0) + 1;

    // Aborted/unfinished ("*") gets no bucket: breaks any running streak, excluded from tallies.
    const bucket: Bucket | null =
      game.result === "1/2-1/2" ? "draws"
      : game.result === "1-0" ? (isWhite ? "wins" : "losses")
      : game.result === "0-1" ? (isWhite ? "losses" : "wins")
      : null;

    for (const b of BUCKETS) {
      run[b] = bucket === b ? run[b] + 1 : 0;
      maxRun[b] = Math.max(maxRun[b], run[b]);
    }
    if (bucket) {
      results[bucket]++;
      colorStats[isWhite ? "White" : "Black"][bucket]++;
    }

    if (game.date) {
      const month = game.date.toISOString().slice(0, 7);
      monthlyStats[month] ??= { games: 0, wins: 0, ratingChange: 0 };
      monthlyStats[month].games++;
      if (bucket === "wins") monthlyStats[month].wins++;
      // Every game changes rating, not just wins.
      const ratingDiff = parseInt((isWhite ? game.whiteRatingDiff : game.blackRatingDiff) || "0", 10);
      if (Number.isFinite(ratingDiff)) monthlyStats[month].ratingChange += ratingDiff;
      const rating = parseInt((isWhite ? game.whiteElo : game.blackElo) || "0", 10);
      if (Number.isFinite(rating)) ratingProgression.push({ date: game.date, rating, gameType: timeControl });
    }

    // Aborted games count toward the opening's total but not toward wins/losses/draws.
    const opening = game.opening?.trim() || "Unknown Opening";
    openingStats[opening] ??= { count: 0, ...tally() };
    openingStats[opening].count++;
    if (bucket) openingStats[opening][bucket]++;

    if (opponent !== "Anonymous") {
      headToHeadStats[opponent] ??= { ...tally(), lastPlayed: game.date || new Date() };
      if (bucket) headToHeadStats[opponent][bucket]++;
      if (game.date && game.date > headToHeadStats[opponent].lastPlayed) {
        headToHeadStats[opponent].lastPlayed = game.date;
      }
    }

    const length = game.moveCount ?? 0;
    if (bucket && length > 0) {
      const l = gameLengths[bucket];
      l.sum += length;
      l.count++;
      l.min = Math.min(l.min, length);
      l.max = Math.max(l.max, length);
    }
  }

  return {
    gameTypes,
    results,
    colorStats,
    streaks: { winStreak: maxRun.wins, lossStreak: maxRun.losses, drawStreak: maxRun.draws },
    ratingProgression,
    monthlyPerformance: Object.entries(monthlyStats)
      .map(([month, data]) => ({
        month,
        ...data,
        winRate: data.games > 0 ? (data.wins / data.games) * 100 : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month)),
    openings: Object.entries(openingStats)
      .map(([name, data]) => ({
        name,
        ...data,
        winRate: data.count > 0 ? (data.wins / data.count) * 100 : 0,
      }))
      .sort((a, b) => b.count - a.count),
    headToHead: Object.entries(headToHeadStats)
      .map(([opponent, record]) => {
        const games = record.wins + record.losses + record.draws;
        return { opponent, games, ...record, winRate: games > 0 ? (record.wins / games) * 100 : 0 };
      })
      .sort((a, b) => b.games - a.games),
    resultDistribution: Object.fromEntries(
      BUCKETS.map((b) => {
        const l = gameLengths[b];
        return [b, { average: l.count ? l.sum / l.count : 0, shortest: l.count ? l.min : 0, longest: l.count ? l.max : 0 }];
      })
    ) as AnalysisStats["resultDistribution"],
  };
};
