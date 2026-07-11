import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

interface LichessGame {
    id: string;
    rated: boolean;
    variant: string;
    speed: string;
    perf: string;
    createdAt: number;
    lastMoveAt: number;
    status: string;
    players: {
        white: {
            user?: { name: string },
            rating?: number,
            ratingDiff?: number
        };
        black: {
            user?: { name: string },
            rating?: number,
            ratingDiff?: number
        };
    };
    winner?: string;
    moves: string;
    clock?: {
        initial: number,
        increment: number,
        totalTime: number
    };
    opening?: {
        name: string,
        eco?: string,
        ply?: number
    };
}

function getTimeControl(game: LichessGame): string {
    if (game.speed === 'correspondence') return 'Correspondence';
    if (!game.clock) return game.speed;

    const minutes = game.clock.initial / 60;
    if (minutes < 3) return 'Bullet';
    if (minutes < 10) return 'Blitz';
    if (minutes <= 30) return 'Rapid';
    return 'Classical';
}

function formatTimeControl(game: LichessGame): string {
    if (!game.clock) return '-';
    return `${game.clock.initial}+${game.clock.increment}`;
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');
        const startYear = searchParams.get('startYear') || '';
        const endYear = searchParams.get('endYear') || '';

        if (!username) {
            return new Response('Username is required', { status: 400 });
        }
        if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
            return new Response('Invalid username', { status: 400 });
        }

        // Convert years to timestamps
        const yearRe = /^\d{4}$/;
        if ((startYear && !yearRe.test(startYear)) || (endYear && !yearRe.test(endYear))) {
            return new Response('startYear/endYear must be 4-digit years', { status: 400 });
        }
        const since = startYear ? Date.UTC(Number(startYear), 0, 1) : undefined;
        const until = endYear ? Date.UTC(Number(endYear) + 1, 0, 1) - 1 : undefined;

        // Construct the URL with proper parameters
        const url = new URL(`https://lichess.org/api/games/user/${encodeURIComponent(username)}`);
        if (since) url.searchParams.append('since', since.toString());
        if (until) url.searchParams.append('until', until.toString());
        url.searchParams.append('moves', 'true');
        url.searchParams.append('opening', 'true');
        // Add pgnInJson to get better structured data
        url.searchParams.append('pgnInJson', 'true');
        // bound memory: 10k games ≈ tens of MB of NDJSON; raise deliberately if users hit it
        url.searchParams.append('max', '10000');

        const response = await fetch(url, {
            headers: {
                'Accept': 'application/x-ndjson',
                'User-Agent': 'Chess Analyzer (https://github.com/yourusername/chess-analyzer)'
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            console.error('Lichess API error:', {
                status: response.status,
                statusText: response.statusText,
                error: await response.text()
            });
            if (response.status === 404) return new Response('Lichess user not found', { status: 404 });
            if (response.status === 429) return new Response('Lichess rate limit hit — try again shortly', { status: 429 });
            return new Response('Failed to fetch games from Lichess', { status: 502 });
        }

        // Read and process the NDJSON response
        const text = await response.text();
        console.log('Received response length:', text.length);

        if (!text.trim()) {
            console.error('Empty response from Lichess API');
            throw new Error('No games found for the specified period');
        }

        const games = text.trim().split('\n')
            .map((line, index) => {
                try {
                    return JSON.parse(line);
                } catch (e) {
                    console.error(`Failed to parse game at line ${index}:`, line);
                    return null;
                }
            })
            .filter(Boolean);

        console.log(`Successfully parsed ${games.length} games`);

        if (games.length === 0) {
            throw new Error('No valid games found for the specified period');
        }

        // Convert games to PGN format
        const pgn = games.map(game => {
            try {
                const date = new Date(game.createdAt);
                const dateStr = date.toISOString().split('T')[0].replace(/-/g, '.');

                // Determine game result
                let result;
                if (game.status === 'draw' || game.status === 'stalemate') {
                    result = '1/2-1/2';
                } else if (game.winner) {
                    result = game.winner === 'white' ? '1-0' : '0-1';
                } else {
                    result = '*';
                }

                // Format opening information consistently
                const opening = game.opening ? `${game.opening.name} (${game.opening.eco})` : 'Unknown Opening';

                // Format headers with all necessary information
                const headers = [
                    `[Event "Lichess ${game.speed || 'Game'}"]`,
                    `[Site "https://lichess.org/${game.id}"]`,
                    `[Date "${dateStr}"]`,
                    `[Round "-"]`,
                    `[White "${game.players.white?.user?.name || 'Anonymous'}"]`,
                    `[Black "${game.players.black?.user?.name || 'Anonymous'}"]`,
                    `[Result "${result}"]`,
                    `[WhiteElo "${game.players.white?.rating ?? '?'}"]`,
                    `[BlackElo "${game.players.black?.rating ?? '?'}"]`,
                    `[WhiteRatingDiff "${game.players.white?.ratingDiff ?? '?'}"]`,
                    `[BlackRatingDiff "${game.players.black?.ratingDiff ?? '?'}"]`,
                    `[TimeControl "${game.clock ? `${game.clock.initial}+${game.clock.increment}` : '-'}"]`,
                    `[Opening "${opening}"]`,
                    `[ECO "${game.opening?.eco ?? '?'}"]`,
                    `[Termination "${game.status}"]`,
                    `[Variant "Standard"]`,
                    ''
                ].join('\n');

                return `${headers}\n${game.moves || ''}\n`;
            } catch (e) {
                console.error('Error processing game:', e);
                return null;
            }
        }).filter(Boolean).join('\n\n');

        console.log('Successfully generated PGN data');

        return new Response(pgn, {
            headers: {
                'Content-Type': 'application/x-chess-pgn',
                'Cache-Control': 'no-cache'
            }
        });
    } catch (error) {
        console.error('Error in fetch-games route:', error);
        return new Response('Failed to fetch games from Lichess', { status: 500 });
    }
}
