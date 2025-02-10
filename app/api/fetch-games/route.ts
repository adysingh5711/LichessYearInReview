import { NextRequest, NextResponse } from "next/server";
import { Chess } from 'chess.js';

interface LichessGame {
    moves: string;
    players: {
        white: { user?: { name: string }, rating?: number, ratingDiff?: number };
        black: { user?: { name: string }, rating?: number, ratingDiff?: number };
    };
    winner?: string;
    status: string;
    speed: string;
    createdAt: number;
    variant: string;
    opening?: { name: string };
}

export async function GET(req: NextRequest) {
    const searchParams = new URLSearchParams(req.nextUrl.search);
    const username = searchParams.get('username');
    const startYear = searchParams.get('startYear');
    const endYear = searchParams.get('endYear');

    if (!username || !startYear || !endYear) {
        return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    const startDate = new Date(parseInt(startYear), 0, 1).getTime();
    const endDate = new Date(parseInt(endYear), 11, 31, 23, 59, 59).getTime();

    try {
        const response = await fetch(
            `https://lichess.org/api/games/user/${username}?since=${startDate}&until=${endDate}&max=2000`,
            { headers: { Accept: 'application/x-ndjson' } }
        );

        if (!response.ok) {
            throw new Error('Lichess API error');
        }

        const text = await response.text();
        const games = text.trim().split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line) as LichessGame);

        // Convert to PGN format
        const pgn = games.map(game => {
            const date = new Date(game.createdAt);
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, '.');
            const result = game.winner
                ? (game.winner === 'white' ? '1-0' : '0-1')
                : (game.status === 'draw' ? '1/2-1/2' : '*');

            // Safely get player names and ratings
            const whiteName = game.players?.white?.user?.name || "Anonymous";
            const blackName = game.players?.black?.user?.name || "Anonymous";
            const whiteRating = game.players?.white?.rating || 0;
            const blackRating = game.players?.black?.rating || 0;
            const whiteRatingDiff = game.players?.white?.ratingDiff || 0;
            const blackRatingDiff = game.players?.black?.ratingDiff || 0;

            // Build PGN string with proper formatting
            const headers = [
                `[Event "Lichess ${game.speed}"]`,
                `[Site "https://lichess.org"]`,
                `[Date "${dateStr}"]`,
                `[White "${whiteName}"]`,
                `[Black "${blackName}"]`,
                `[Result "${result}"]`,
                `[WhiteElo "${whiteRating}"]`,
                `[BlackElo "${blackRating}"]`,
                `[WhiteRatingDiff "${whiteRatingDiff}"]`,
                `[BlackRatingDiff "${blackRatingDiff}"]`,
                `[Variant "${game.variant}"]`,
                `[TimeControl "${game.speed}"]`,
                `[Opening "${game.opening?.name || 'Unknown'}"]`,
            ].join('\n');

            // Add a blank line between headers and moves, and ensure moves end with result
            return `${headers}\n\n${game.moves} ${result}\n\n`;
        }).join('');

        return new NextResponse(pgn, {
            headers: { 'Content-Type': 'application/x-chess-pgn' }
        });
    } catch (error) {
        console.error('Lichess API error:', error);
        return NextResponse.json({
            error: "Failed to fetch games from Lichess. Please upload your PGN file instead."
        }, { status: 500 });
    }
}
