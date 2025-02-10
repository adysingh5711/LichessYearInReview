import { NextRequest, NextResponse } from "next/server";
import { Chess } from 'chess.js';

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
        // Request games from Lichess API
        const response = await fetch(
            `https://lichess.org/api/games/user/${username}?since=${startDate}&until=${endDate}&max=2000&perfType=bullet,blitz,rapid,classical`,
            {
                headers: {
                    'Accept': 'application/x-ndjson'
                }
            }
        );

        if (!response.ok) {
            throw new Error('Failed to fetch games from Lichess');
        }

        const text = await response.text();
        const games = text.trim().split('\n')
            .filter(line => line.trim())
            .map(line => JSON.parse(line) as LichessGame)
            .filter(game =>
                game.status !== 'noStart' &&
                game.variant === 'standard' &&
                game.moves
            );

        // Convert games to PGN format
        const pgn = games.map(game => {
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

            // Get time control category
            const timeControl = getTimeControl(game);

            // Format headers with all necessary information
            const headers = [
                `[Event "Lichess ${timeControl}"]`,
                `[Site "https://lichess.org/${game.id}"]`,
                `[Date "${dateStr}"]`,
                `[Round "-"]`,
                `[White "${game.players.white?.user?.name || 'Anonymous'}"]`,
                `[Black "${game.players.black?.user?.name || 'Anonymous'}"]`,
                `[Result "${result}"]`,
                `[WhiteElo "${game.players.white?.rating || '?'}"]`,
                `[BlackElo "${game.players.black?.rating || '?'}"]`,
                `[WhiteRatingDiff "${game.players.white?.ratingDiff || '?'}"]`,
                `[BlackRatingDiff "${game.players.black?.ratingDiff || '?'}"]`,
                `[TimeControl "${formatTimeControl(game)}"]`,
                `[ECO "${game.opening?.eco || '?'}"]`,
                `[Opening "${game.opening?.name || '?'}"]`,
                `[Termination "${game.status}"]`,
                `[Variant "Standard"]`,
                ''
            ].join('\n');

            // Format moves with proper move numbers
            const moveText = game.moves.split(' ')
                .map((move, i) => {
                    if (i % 2 === 0) {
                        return `${Math.floor(i / 2 + 1)}. ${move}`;
                    }
                    return move;
                })
                .join(' ');

            // Ensure proper spacing between headers, moves, and result
            return `${headers}\n\n${moveText} ${result}\n\n`;
        }).join('');

        // Return PGN data
        return new NextResponse(pgn, {
            headers: {
                'Content-Type': 'application/x-chess-pgn'
            }
        });

    } catch (error) {
        console.error('Error fetching games:', error);
        return NextResponse.json({
            error: "Failed to fetch games from Lichess. Please upload your PGN file instead."
        }, { status: 500 });
    }
}
