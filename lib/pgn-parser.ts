import { Chess } from "chess.js";
import { GameStats } from "@/types/chess";

export const categorizeTimeControl = (timeControl: string): string => {
  if (!timeControl || timeControl === "unlimited") return "Classical";

  try {
    const [baseTime, increment] = timeControl.split("+").map(Number);
    if (isNaN(baseTime)) return "Classical";

    const totalTime = baseTime + (increment || 0) * 40; // Approximate game length

    if (totalTime < 180) return "Bullet";
    if (totalTime <= 480) return "Blitz";
    if (totalTime <= 1500) return "Rapid";
    return "Classical";
  } catch (error) {
    return "Classical";
  }
};

export const parseGame = (pgnText: string): GameStats[] => {
  const games: GameStats[] = [];
  const chess = new Chess();

  if (!pgnText.trim()) {
    return games;
  }

  // Split PGN text into individual games
  const gameTexts = pgnText.split(/\n\n(?=\[)/).filter((text) => text.trim());

  for (let gameText of gameTexts) {
    try {
      chess.loadPgn(gameText);
      const headers = chess.header();

      // Validate required fields
      if (!headers.White || !headers.Black || !headers.Result) {
        console.warn("Skipping game with missing required headers");
        continue;
      }

      games.push({
        timeControl: headers.TimeControl || "unlimited",
        result: headers.Result,
        white: headers.White,
        black: headers.Black,
        opening: headers.Opening || "Unknown Opening",
        date: headers.Date || new Date().toISOString().split("T")[0],
        whiteElo: headers.WhiteElo || "0",
        blackElo: headers.BlackElo || "0",
        whiteRatingDiff: headers.WhiteRatingDiff || "0",
        blackRatingDiff: headers.BlackRatingDiff || "0",
        moves: chess.history(),
      });
    } catch (e) {
      console.error("Error parsing game:", e);
      continue;
    }
  }

  return games;
};
