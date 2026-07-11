import { NextRequest, NextResponse } from "next/server";
import { parseGame } from "@/lib/pgn-parser";
import { analyzeGames } from "@/lib/analyzer";
import { AnalysisStats } from "@/types/chess";

export const maxDuration = 60

const MAX_PGN_BYTES = 20 * 1024 * 1024; // 20MB ≈ tens of thousands of games

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const username = formData.get("username");

    if (!(file instanceof File) || typeof username !== "string" || !username.trim()) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    if (file.size > MAX_PGN_BYTES) {
      return NextResponse.json(
        { error: "PGN file too large (max 20MB)" },
        { status: 413 }
      );
    }

    const pgnText = await file.text();
    const games = parseGame(pgnText);

    if (!games || games.length === 0) {
      return NextResponse.json(
        { error: "No valid games found in PGN file" },
        { status: 400 }
      );
    }

    const analysis: AnalysisStats = analyzeGames(games, username);
    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze games" },
      { status: 500 }
    );
  }
}
