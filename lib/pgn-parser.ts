import { Chess } from "chess.js";

interface GameStats {
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

export const categorizeTimeControl = (timeControl: string) => {
  const [baseTime, increment] = timeControl.split("+").map(Number);
  if (baseTime < 180) return "Bullet";
  if (baseTime <= 480) return "Blitz";
  if (baseTime <= 1500) return "Rapid";
  return "Classical";
};

export const parseGame = (pgnText: string): GameStats[] => {
  const games: GameStats[] = [];
  const chess = new Chess();

  // Split PGN text into individual games
  const gameTexts = pgnText.split("\n\n[");

  for (let gameText of gameTexts) {
    if (!gameText.startsWith("[")) gameText = "[" + gameText;

    try {
      chess.loadPgn(gameText);
      const headers = chess.header();

      games.push({
        timeControl: headers.TimeControl || "0+0",
        result: headers.Result || "*",
        white: headers.White || "",
        black: headers.Black || "",
        opening: headers.Opening,
        date: headers.Date,
        whiteElo: headers.WhiteElo,
        blackElo: headers.BlackElo,
        whiteRatingDiff: headers.WhiteRatingDiff,
        blackRatingDiff: headers.BlackRatingDiff,
      });
    } catch (e) {
      console.error("Error parsing game:", e);
      continue;
    }
  }

  return games;
};
