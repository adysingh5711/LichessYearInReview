import { NextRequest } from "next/server";

export const maxDuration = 60;

const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
const USER_AGENT_LICHESS = 'Chess Analyzer (https://github.com/yourusername/chess-analyzer)';
const USER_AGENT_CHESSCOM = 'Chess Analyzer (contact: https://github.com/adysingh5711/LichessYearInReview)';

async function fetchLichess(username: string, start: string, end: string): Promise<Response> {
    const [startY, startM] = start.split('-').map(Number);
    const [endY, endM] = end.split('-').map(Number);
    const since = Date.UTC(startY, startM - 1, 1);
    const until = Date.UTC(endY, endM, 1) - 1;

    const url = new URL(`https://lichess.org/api/games/user/${encodeURIComponent(username)}`);
    url.searchParams.append('since', since.toString());
    url.searchParams.append('until', until.toString());
    url.searchParams.append('moves', 'true');
    url.searchParams.append('opening', 'true');
    url.searchParams.append('pgnInJson', 'true');
    // bound memory: 10k games ≈ tens of MB of NDJSON; raise deliberately if users hit it
    url.searchParams.append('max', '10000');

    const response = await fetch(url, {
        headers: {
            'Accept': 'application/x-ndjson',
            'User-Agent': USER_AGENT_LICHESS
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

    const text = await response.text();

    if (!text.trim()) {
        return new Response('No games found for the specified period', { status: 404 });
    }

    const games = text.trim().split('\n')
        .map((line, index) => {
            try {
                return JSON.parse(line);
            } catch {
                console.error(`Failed to parse game at line ${index}:`, line);
                return null;
            }
        })
        .filter(Boolean);

    if (games.length === 0) {
        return new Response('No valid games found for the specified period', { status: 404 });
    }

    const pgn = games.map(game => {
        try {
            const date = new Date(game.createdAt);
            const dateStr = date.toISOString().split('T')[0].replace(/-/g, '.');

            let result;
            if (game.status === 'draw' || game.status === 'stalemate') {
                result = '1/2-1/2';
            } else if (game.winner) {
                result = game.winner === 'white' ? '1-0' : '0-1';
            } else {
                result = '*';
            }

            const opening = game.opening ? `${game.opening.name} (${game.opening.eco})` : 'Unknown Opening';

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

    return new Response(pgn, {
        headers: {
            'Content-Type': 'application/x-chess-pgn',
            'Cache-Control': 'no-cache'
        }
    });
}

async function fetchChessCom(username: string, start: string, end: string): Promise<Response> {
    const archivesRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(username)}/games/archives`, {
        headers: { 'User-Agent': USER_AGENT_CHESSCOM },
        cache: 'no-store'
    });

    if (!archivesRes.ok) {
        if (archivesRes.status === 404) return new Response('Chess.com user not found', { status: 404 });
        if (archivesRes.status === 429) return new Response('Chess.com rate limit hit — try again shortly', { status: 429 });
        return new Response('Failed to fetch games from Chess.com', { status: 502 });
    }

    const { archives } = await archivesRes.json() as { archives: string[] };

    // Archive URLs end in .../games/{YYYY}/{MM} — intersect with the requested range
    // so we never request a month the user has no games in (including future months).
    const monthsInRange = archives.filter(archiveUrl => {
        const match = archiveUrl.match(/\/(\d{4})\/(\d{2})$/);
        if (!match) return false;
        const month = `${match[1]}-${match[2]}`;
        return month >= start && month <= end;
    });

    if (monthsInRange.length === 0) {
        return new Response('No games found for the specified period', { status: 404 });
    }

    const pgns: string[] = [];
    // Chess.com's API accepts non-parallel requests only; parallel bursts get 429'd.
    for (const archiveUrl of monthsInRange) {
        const monthRes = await fetch(archiveUrl, {
            headers: { 'User-Agent': USER_AGENT_CHESSCOM },
            cache: 'no-store'
        });

        if (!monthRes.ok) {
            if (monthRes.status === 429) return new Response('Chess.com rate limit hit — try again shortly', { status: 429 });
            console.error('Chess.com archive fetch error:', archiveUrl, monthRes.status);
            continue;
        }

        const { games } = await monthRes.json() as { games: Array<{ pgn?: string; rules?: string }> };
        for (const game of games) {
            // Only standard chess has openings/analysis our pipeline understands; skip variants.
            if (game.pgn && game.rules === 'chess') pgns.push(game.pgn);
        }
    }

    if (pgns.length === 0) {
        return new Response('No games found for the specified period', { status: 404 });
    }

    return new Response(pgns.join('\n\n'), {
        headers: {
            'Content-Type': 'application/x-chess-pgn',
            'Cache-Control': 'no-cache'
        }
    });
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const username = searchParams.get('username');
        const platform = searchParams.get('platform') || 'lichess';
        const start = searchParams.get('start') || '';
        const end = searchParams.get('end') || '';

        if (!username) {
            return new Response('Username is required', { status: 400 });
        }
        if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
            return new Response('Invalid username', { status: 400 });
        }
        if (platform !== 'lichess' && platform !== 'chess.com') {
            return new Response('platform must be "lichess" or "chess.com"', { status: 400 });
        }
        if ((start && !MONTH_RE.test(start)) || (end && !MONTH_RE.test(end))) {
            return new Response('start/end must be in YYYY-MM form', { status: 400 });
        }

        const currentMonth = new Date().toISOString().slice(0, 7);
        const rangeStart = start || `${new Date().getFullYear()}-01`;
        const rangeEnd = end || currentMonth;
        if (rangeStart > rangeEnd) {
            return new Response('start must not be after end', { status: 400 });
        }

        return platform === 'chess.com'
            ? await fetchChessCom(username, rangeStart, rangeEnd)
            : await fetchLichess(username, rangeStart, rangeEnd);
    } catch (error) {
        console.error('Error in fetch-games route:', error);
        return new Response('Failed to fetch games', { status: 500 });
    }
}
