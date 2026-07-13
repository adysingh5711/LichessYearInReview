import { GameStats } from "@/types/chess";

export const categorizeTimeControl = (timeControl: string): string => {
  if (!timeControl || timeControl === "unlimited") return "Classical";
  // Chess.com daily games use "seconds-per-move/total-seconds" (e.g. "1/86400"), not "base+increment".
  if (timeControl.includes("/")) return "Daily";

  try {
    const parts = timeControl.split("+");
    const baseTime = parseInt(parts[0], 10);
    if (isNaN(baseTime)) return "Classical";

    if (baseTime < 180) return "Bullet";
    if (baseTime <= 480) return "Blitz";
    if (baseTime <= 1500) return "Rapid";
    return "Classical";
  } catch (error) {
    return "Classical";
  }
};

export function parsePGNDate(dateStr: string): Date {
  const parts = (dateStr || '').split('.');
  const year = parseInt(parts[0], 10) || 2000;
  const month = (parseInt(parts[1], 10) - 1) || 0; // Months are 0-indexed
  const day = parseInt(parts[2], 10) || 1;
  return new Date(Date.UTC(year, month, day));
}

const HEADER_RE = /^\[(\w+)\s+"([^"]*)"\]/gm;

// Strips comments/variations/NAGs/move-numbers/result token, leaving one
// whitespace-separated SAN token per ply. Moves are counted, not validated.
const countPlies = (movetext: string): number => {
  let cleaned = movetext
    .replace(/\{[^}]*\}/g, " ") // comments (incl. lichess clock annotations)
    .replace(/\$\d+/g, " ") // NAGs
    .replace(/\d+\.(\.\.)?/g, " ") // move numbers: 1. / 1...
    .replace(/(1-0|0-1|1\/2-1\/2|\*)\s*$/, " "); // result token

  // ponytail: nested variations handled by looping the paren-strip until stable
  let prev;
  do {
    prev = cleaned;
    cleaned = cleaned.replace(/\([^()]*\)/g, " ");
  } while (cleaned !== prev);

  const trimmed = cleaned.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
};

// Chess.com PGN has no [Opening] header, only an [ECOUrl] like
// ".../openings/Sicilian-Defense-Closed-2.Nc3" — derive a readable name from its slug.
const openingNameFromECOUrl = (ecoUrl: string | undefined): string | null => {
  if (!ecoUrl) return null;
  const slug = ecoUrl.split('/').pop();
  if (!slug) return null;
  return slug.replace(/-\d.*$/, "").replace(/-/g, " ").trim() || null;
};

export const parseGame = (pgnText: string): GameStats[] => {
  const games: GameStats[] = [];

  if (!pgnText.trim()) {
    return games;
  }

  // Split PGN text into individual games
  const gameTexts = pgnText.split(/\n\n(?=\[)/).filter((text) => text.trim());

  for (const gameText of gameTexts) {
    try {
      const [headerBlock, ...rest] = gameText.split(/\n\s*\n/);
      const movetext = rest.join("\n\n");

      const headers: Record<string, string> = {};
      for (const match of headerBlock.matchAll(HEADER_RE)) {
        headers[match[1]] = match[2];
      }

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
        opening: headers.Opening || headers.ECOUrl || headers.ECO ? `${headers.Opening || openingNameFromECOUrl(headers.ECOUrl) || 'Unknown'} (${headers.ECO || '?'})` : "Unknown Opening",
        date: headers.Date ? parsePGNDate(headers.Date) : new Date(),
        whiteElo: headers.WhiteElo || "0",
        blackElo: headers.BlackElo || "0",
        whiteRatingDiff: headers.WhiteRatingDiff || "0",
        blackRatingDiff: headers.BlackRatingDiff || "0",
        moveCount: countPlies(movetext),
      });
    } catch (e) {
      console.error("Error parsing game:", e);
      continue;
    }
  }

  games.sort((a, b) => a.date!.getTime() - b.date!.getTime());
  return games;
};
