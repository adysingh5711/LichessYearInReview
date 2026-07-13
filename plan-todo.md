# Plan: Chess.com support + month/year range picker

## Why this is small

The whole pipeline is: `/api/fetch-games` → PGN text → `/api/analyze` → `parseGame()` → `analyzeGames()`.
Only the first box knows about Lichess. Chess.com's monthly archive
(`https://api.chess.com/pub/player/{user}/games/{YYYY}/{MM}`) returns `{ games: [...] }` where **each game
already carries a full `pgn` field with headers** (Date, White/Black, Result, WhiteElo/BlackElo,
TimeControl, ECO, ECOUrl, Termination). So chess.com support = fetch months in range, concatenate
`games[].pgn`, hand the same PGN string to the existing pipeline. No changes to `/api/analyze`,
`analyzer.ts`, types, or any chart component.

## Chess.com API facts that drive the design

- No auth. JSON. Base `https://api.chess.com/pub/`.
- `GET /player/{u}/games/archives` → `{ archives: ["…/games/2024/01", …] }` — the list of months that
  actually exist for this user.
- `GET /player/{u}/games/{YYYY}/{MM}` → `{ games: [{ pgn, time_control, time_class, rules, rated, end_time, white/black: { username, rating, result }, … }] }`.
- Requests must be **serial** (parallel bursts get 429). Send a real `User-Agent`.
- Archives only exist for months the user played; future months / gap months 404.

## The future-range problem (and the fix)

A month-range picker lets the user select e.g. Jul–Dec 2026 when it's July 2026. Chess.com would 404 on
Aug–Dec. Best fix: **don't guess which months exist — ask.** Fetch `/games/archives` once, intersect the
archive list with the requested range, and only fetch those months. This solves three problems with one
request: future months, gap months where the user didn't play, and it doubles as user-existence
validation (archives 404 → "Chess.com user not found"). No client-side trimming logic needed beyond the
native `max` attribute on the month inputs. Lichess needs nothing — a future `until` timestamp is
harmless there.

---

## Todos

### 1. `app/api/fetch-games/route.ts` — platform param + month params

- [x] Accept `platform` (`lichess` | `chess.com`, default `lichess`) and replace `startYear`/`endYear`
      with `start`/`end` in `YYYY-MM` form (validate with `/^\d{4}-(0[1-9]|1[0-2])$/`).
- [x] Lichess branch (existing code):
  - `since = Date.UTC(startY, startM - 1, 1)`
  - `until = Date.UTC(endY, endM, 1) - 1` (first ms of next month minus 1)
  - everything else unchanged.
- [x] Chess.com branch (new, ~40 lines in the same file — no new files):
  1. `GET https://api.chess.com/pub/player/{u}/games/archives` with a descriptive `User-Agent`.
     404 → `Response('Chess.com user not found', { status: 404 })`; 429 → surface as 429.
  2. Filter `archives` URLs to those whose `YYYY/MM` falls inside `[start, end]` (string compare on
     `YYYY-MM` works). Empty after filter → 404 "No games found for the specified period".
  3. Fetch each remaining archive URL **serially** (`for … await`, not `Promise.all` — API rule).
  4. Concatenate `data.games.filter(g => g.rules === "chess").map(g => g.pgn).join("\n\n")`
     (drop chess960/variants — the analyzer assumes standard chess openings).
  5. Return as `application/x-chess-pgn`, same as today.
- [x] Username regex: chess.com allows the same charset; current `/^[a-zA-Z0-9_-]{2,30}$/` is fine for
      both — leave it.

### 2. `lib/pgn-parser.ts` — two small chess.com PGN quirks

- [x] **Daily games**: chess.com uses `TimeControl "1/86400"` (moves-per-seconds). Today
      `parseInt("1/86400")` → 1 → "Bullet". Add one guard at the top of `categorizeTimeControl`:
      `if (timeControl.includes("/")) return "Daily";`
- [x] **Opening name**: chess.com PGN has no `[Opening]` header, only `[ECO]` + `[ECOUrl]`
      (e.g. `…/openings/Sicilian-Defense-Closed-2…`). In `parseGame`, when `headers.Opening` is
      missing but `headers.ECOUrl` exists, derive the name from the URL slug: take the last path
      segment, strip trailing move-notation (`-\d.*$`), replace `-` with spaces. Falls back to the
      existing `Unknown (ECO)` string otherwise. (~4 lines.)
- [x] Note, not a todo: chess.com PGN has no `WhiteRatingDiff`/`BlackRatingDiff`; parser already
      defaults them to `"0"`, so `monthlyPerformance.ratingChange` will read 0 for chess.com. Rating
      *progression* still works (WhiteElo/BlackElo are present). Accept for v1; if it matters later,
      compute diffs from consecutive per-time-class ratings in `analyzeGames`.

### 3. `components/chess-analyzer.tsx` — platform choice + month pickers

- [x] Add `const [platform, setPlatform] = useState<"lichess" | "chess.com">("lichess")`. UI: reuse the
      existing `Tabs` component as a two-option segmented control above the username field
      ("Lichess" / "Chess.com"). No new dependency.
- [x] Username input placeholder follows platform: `"Lichess Username"` / `"Chess.com Username"`.
- [x] Replace the two `type="number"` year inputs with native `<input type="month">`
      (keep the same styled wrappers/icons):
  - `startMonth` default `` `${currentYear}-01` `` (Jan of current year)
  - `endMonth` default `` `${currentYear}-12` `` (Dec of current year)
  - `min="2010-01"`, no `max` — a future end month within the year is intentional ("year in review");
    the server-side archives intersection makes it safe.
  - Cheap sanity check before fetch: `startMonth <= endMonth` (string compare works for YYYY-MM),
    else set error.
- [x] `handleFetchGames`: send `{ username, platform, start: startMonth, end: endMonth }`; name the
      generated file `${platform}_games.pgn`.
- [x] Help tooltip: mention chess.com export path too (chess.com → profile → Games → Download), or make
      the tooltip content follow the selected platform.
- [x] Error copy: replace hardcoded "…from Lichess…" strings with the selected platform name.

### 4. Cosmetic / copy (optional, same PR)

- [x] Page title "Chess Game Analysis" already platform-neutral — no change.
- [x] README: note chess.com support and the archives-intersection behavior.

### 5. Tests

- [x] `lib/__tests__/pgn-parser.test.ts`: add a real chess.com-shaped PGN fixture (ECOUrl, no Opening,
      `TimeControl "1/86400"` daily case, `TimeControl "600"` rapid case) and assert opening-name
      derivation + "Daily" categorization.
- [x] Route test for the chess.com branch: mock `fetch` for archives + one month, assert PGNs are
      concatenated, variants filtered, future months in the range never requested.

## Explicitly skipped (add only when needed)

- No `/api/fetch-games` split into per-platform files — one route, one `if`, ~40 new lines.
- No rating-diff reconstruction for chess.com (see §2 note).
- No caching/ETag handling — chess.com archives refresh at most every 12h, but our route is
  `no-store` for Lichess too; add `If-None-Match` only if rate limits ever bite.
- No custom month-picker component — native `<input type="month">` covers it.
