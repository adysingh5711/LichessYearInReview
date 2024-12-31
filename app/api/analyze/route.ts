import { NextRequest, NextResponse } from "next/server";
import { parseGame } from "@/lib/pgn-parser";
import { analyzeGames } from "@/lib/analyzer";
import { GameStats, AnalysisStats } from "@/types/chess";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const username = formData.get("username") as string;

    if (!file || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pgnText = await file.text();
    const games = parseGame(pgnText);
    const analysis = analyzeGames(games, username);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze games" },
      { status: 500 }
    );
  }
}