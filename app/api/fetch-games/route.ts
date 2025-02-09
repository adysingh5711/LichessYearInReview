import { NextRequest, NextResponse } from "next/server";

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
            `https://lichess.org/api/games/user/${username}?since=${startDate}&until=${endDate}`,
            // `https://lichess.org/api/games/user/${username}?since=${startDate}&until=${endDate}&max=2000`, --> Adding for max limit to 2000 games
            { headers: { Accept: 'application/x-ndjson' } }
        );

        if (!response.ok) {
            throw new Error('Lichess API error');
        }

        const text = await response.text();
        return new NextResponse(text, {
            headers: { 'Content-Type': 'application/x-ndjson' }
        });
    } catch (error) {
        return NextResponse.json({
            error: "Failed to fetch games from Lichess. Please upload your PGN file instead."
        }, { status: 500 });
    }
} 