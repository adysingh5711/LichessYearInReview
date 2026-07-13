# Plan 005: Fix the stats-math bug batch (aborted games, NaN ratings, monthly rating change, date handling)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- lib/analyzer.ts lib/pgn-parser.ts app/api/fetch-games/route.ts components/chess-analyzer.tsx`
> Plan 004 legitimately touches `lib/analyzer.ts` (username normalization) before
> this plan — that diff is expected. For anything else, compare the "Current
> state" excerpts against the live code; on a mismatch, treat it as a STOP
> condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: MED (deliberate behavior changes to stats output — gated by the plan-002 test suite)
- **Depends on**: plans/002-analyzer-parser-tests.md, plans/004-case-insensitive-username.md
- **Category**: bug
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

Five independent bugs make the numbers this app exists to show subtly wrong: aborted games are counted as losses in opening stats and never break streaks; a rating diff of exactly 0 is converted to `"?"` and later parses to `NaN`, poisoning monthly rating-change sums; monthly rating change ignores every non-win game, making it meaningless; year-range fetches drop nearly the whole final day (Dec 31 after 00:00 UTC); and dates round-trip through local-midnight `Date` objects so viewers west of UTC see games a day (and at month boundaries, a month) early. Each fix is small; together they make the charts trustworthy.

## Current state

All excerpts verified at commit `a93da87`.

**(a) Aborted games (`result: "*"`)** — `lib/analyzer.ts:64-109`: the result `switch` handles only `"1-0"`, `"0-1"`, `"1/2-1/2"`. `isWin`/`isDraw` default false, so a `"*"` game: skips `results`/`colorStats`/streak counters entirely (fine), but then falls into the else-branches at lines 154-160 (openings: `openingStats[opening].losses++`) and 173-179 (head-to-head: `losses++`) and 199-204 (gameLengths: counted under losses). Also, because the streak counters aren't reset, a win–abort–win sequence reads as a 2-win streak.

**(b) ratingDiff `0` → `"?"` → `NaN`** — `app/api/fetch-games/route.ts:158-159`:

```ts
`[WhiteRatingDiff "${game.players.white?.ratingDiff || '?'}"]`,
`[BlackRatingDiff "${game.players.black?.ratingDiff || '?'}"]`,
```

`0 || '?'` evaluates to `'?'`. Downstream, `lib/pgn-parser.ts:61-62` passes the string through (`headers.WhiteRatingDiff || "0"` — `"?"` is truthy), and `lib/analyzer.ts:126-129` does `parseInt(game.whiteRatingDiff || "0", 10)` → `parseInt("?")` → `NaN` → `monthlyStats[month].ratingChange += NaN`. The same `|| '?'` pattern at lines 156-157 (`WhiteElo`/`BlackElo`) can propagate `"?"` into `parseInt` at `lib/analyzer.ts:132-134`, producing NaN rating points in the progression chart.

**(c) Monthly rating change only counts wins** — `lib/analyzer.ts:122-130`:

```ts
monthlyStats[month].games++;
if (isWin) {
  monthlyStats[month].wins++;
  // Compute rating difference once.
  const ratingDiff = isWhite
    ? parseInt(game.whiteRatingDiff || "0", 10)
    : parseInt(game.blackRatingDiff || "0", 10);
  monthlyStats[month].ratingChange += ratingDiff;
}
```

Losses/draws also change rating; a month of heavy losses shows `ratingChange: 0` or positive.

**(d) `until` cuts off Dec 31; NaN years silently drop the filter** — `app/api/fetch-games/route.ts:70-71`:

```ts
const since = startYear ? new Date(`${startYear}-01-01`).getTime() : undefined;
const until = endYear ? new Date(`${endYear}-12-31`).getTime() : undefined;
```

`until` is midnight **at the start of** Dec 31 UTC. And a non-numeric year gives `NaN`, which is falsy, so `if (until)` skips the param and the user silently gets their entire history.

**(e) Local-time dates shift a day/month across timezones** — `lib/pgn-parser.ts:21-27` builds `new Date(year, month, day)` (local midnight). The analyzer buckets months via `gameDate.toISOString().slice(0, 7)` (`lib/analyzer.ts:118`) — for viewers **east** of UTC, local Jan 1 00:00 is Dec 31 in UTC, shifting the game into the wrong month. Client-side, `components/chess-analyzer.tsx` re-parses serialized dates and formats them in local time at lines 348 (`new Date(data.month)` — a `"YYYY-MM"` string, parsed as UTC), 517-521, 980-984, and 1005-1012 (`toLocaleDateString("en-US", {...})` without a timeZone).

The plan-002 test suite has assertions marked `// KNOWN BUG (plan 005)` pinning behaviors (a) and (c).

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Install   | `pnpm install`             | exit 0              |
| Tests     | `pnpm test`                | all pass            |
| Typecheck | `pnpm typecheck`           | exit 0              |
| Build     | `pnpm build`               | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `lib/analyzer.ts` (fixes a, b-guard, c)
- `lib/pgn-parser.ts` (fix e — UTC date construction)
- `app/api/fetch-games/route.ts` (fixes b, d)
- `components/chess-analyzer.tsx` (fix e — ONLY the four `toLocaleDateString`/`new Date` formatting call sites listed above; touch nothing else in this 1169-line file)
- `lib/__tests__/analyzer.test.ts`, `lib/__tests__/pgn-parser.test.ts` (flip plan-005 assertions, add new ones)

**Out of scope** (do NOT touch):
- Username validation / `encodeURIComponent` / upload size limits in the API routes — that is plan 006. You will be editing neighboring lines; do not absorb its work.
- The dead `getTimeControl`/`formatTimeControl` functions in `fetch-games/route.ts` — plan 008 deletes them.
- Any UI/JSX restructuring in `chess-analyzer.tsx`.

## Git workflow

- Branch: `advisor/005-stats-math-fixes`
- Commit per lettered fix (a through e), short lowercase messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1 (a): Exclude non-decisive games from per-category tallies and reset streaks

In `lib/analyzer.ts`, replace the `isWin`/`isDraw` booleans with a single outcome derived from the existing switch. Minimal shape:

```ts
let isWin = false;
let isDraw = false;
let isDecisive = false;   // true only for 1-0, 0-1, 1/2-1/2
```

Set `isDecisive = true` inside each existing `case`, and add:

```ts
default:
  // Aborted/unfinished ("*"): breaks any running streak, excluded from tallies.
  currentWinStreak = currentLossStreak = currentDrawStreak = 0;
  break;
```

Then guard the three aggregation blocks so `"*"` games are not counted as losses:
- openings win/loss/draw increments (lines 153-160): still `openingStats[opening].count++` for every game, but only increment `wins`/`draws`/`losses` when `isDecisive`;
- head-to-head increments (lines 173-179): only when `isDecisive` (keep the `lastPlayed` update for all games vs that opponent);
- gameLengths accumulation (lines 188-205): only when `isDecisive`.

**Verify**: `pnpm test -- analyzer` → the plan-005(a) KNOWN BUG assertions now fail. Flip them in `lib/__tests__/analyzer.test.ts`: the `"*"` fixture game contributes to `openings[].count` but not to `losses`; win–abort–win yields `winStreak: 1` (adjust the fixture ordering note if needed); it does not appear in `resultDistribution`. Re-run → pass.

### Step 2 (c): Accumulate rating change for every game with a date

Still in `lib/analyzer.ts`, move the `ratingDiff` computation out of `if (isWin)` (lines 122-130) so it always runs, and guard against NaN:

```ts
monthlyStats[month].games++;
if (isWin) monthlyStats[month].wins++;
const ratingDiff = isWhite
  ? parseInt(game.whiteRatingDiff || "0", 10)
  : parseInt(game.blackRatingDiff || "0", 10);
if (Number.isFinite(ratingDiff)) monthlyStats[month].ratingChange += ratingDiff;
```

Apply the same `Number.isFinite` guard to the `rating` used for `ratingProgression`/`peakRatings` (lines 132-143): skip the `ratingProgression.push` and peak update when the parsed rating is not finite.

**Verify**: `pnpm test -- analyzer` → flip the plan-005(c) assertion (monthly `ratingChange` now includes loss/draw diffs; a fixture game with `whiteRatingDiff: "?"` contributes 0 and no NaN). All pass.

### Step 3 (b): Preserve zero rating diffs in the PGN proxy

In `app/api/fetch-games/route.ts:156-159`, change `||` to `??` on the four elo/diff headers:

```ts
`[WhiteElo "${game.players.white?.rating ?? '?'}"]`,
`[BlackElo "${game.players.black?.rating ?? '?'}"]`,
`[WhiteRatingDiff "${game.players.white?.ratingDiff ?? '?'}"]`,
`[BlackRatingDiff "${game.players.black?.ratingDiff ?? '?'}"]`,
```

(`?? '?'` keeps `0`; genuinely absent values still emit `"?"`, which the analyzer now treats as 0 via the step-2 guard.)

**Verify**: `pnpm typecheck` → exit 0. `grep -n 'RatingDiff' app/api/fetch-games/route.ts` shows `??` not `||`.

### Step 4 (d): Include all of Dec 31 and reject garbage years

In `app/api/fetch-games/route.ts:70-71`, replace with:

```ts
const yearRe = /^\d{4}$/;
if ((startYear && !yearRe.test(startYear)) || (endYear && !yearRe.test(endYear))) {
    return new Response('startYear/endYear must be 4-digit years', { status: 400 });
}
const since = startYear ? Date.UTC(Number(startYear), 0, 1) : undefined;
const until = endYear ? Date.UTC(Number(endYear) + 1, 0, 1) - 1 : undefined;
```

(`until` = last millisecond of Dec 31 UTC.)

**Verify**: `pnpm typecheck` → exit 0. Manual: `pnpm dev`, then `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/fetch-games?username=x&startYear=banana"` → `400`.

### Step 5 (e): Calendar dates as UTC end-to-end

1. `lib/pgn-parser.ts:26`: `return new Date(year, month, day);` → `return new Date(Date.UTC(year, month, day));`
2. `components/chess-analyzer.tsx` — add `timeZone: "UTC"` to the options object of the four date-formatting call sites:
   - line ~348: `new Date(data.month).toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" })`
   - line ~517: the `RatingTooltip` `toLocaleDateString` call
   - line ~980: the rating-chart X-axis `tickFormatter`
   - line ~1005: the rating-chart tooltip
   (Line numbers may be a few off after other plans; locate by searching `toLocaleDateString` — there are exactly 4 call sites plus one `toLocaleString` month formatter at line ~286 in `renderWinRateChart`'s tickFormatter; add `timeZone: "UTC"` to that one too if it takes an options object — it does: `toLocaleString("default", { month: "short" })` → add `timeZone: "UTC"`. Note this one formats a locally-constructed `new Date(year, m-1)` so it is already stable; adding the option is harmless and consistent.)

**Verify**: `pnpm test -- pgn-parser` → the `parsePGNDate` assertions still pass **if** plan 002 asserted via `getFullYear/getMonth/getDate` — they will now fail for non-UTC machines because the date is UTC-midnight. Update them to `getUTCFullYear/getUTCMonth/getUTCDate`. All pass.

### Step 6: Full gate

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → all exit 0; `grep -c "KNOWN BUG (plan 005)" lib/__tests__/analyzer.test.ts` → 0.

## Test plan

- Flip the plan-005 KNOWN BUG assertions (steps 1-2) and the `parsePGNDate` UTC accessors (step 5).
- Add new cases to `lib/__tests__/analyzer.test.ts`: a game with `whiteRatingDiff: "?"` (contributes 0, result finite); a fixture month mixing a win (+8) and a loss (-8) asserting `ratingChange: 0`.
- All untouched characterization assertions must pass unchanged — that is the regression guarantee.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm test` exits 0; `grep -c "KNOWN BUG (plan 005)"` in the test files → 0
- [ ] `grep -n "|| '?'" app/api/fetch-games/route.ts` → no matches
- [ ] `grep -n "Date.UTC" lib/pgn-parser.ts` → 1 match
- [ ] curl with `startYear=banana` returns 400 (dev server)
- [ ] `pnpm typecheck && pnpm build` exit 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- The plan-002 test files don't exist, or lack the `KNOWN BUG (plan 005)` markers.
- A characterization assertion outside the flipped set fails — a fix leaked.
- The `chess-analyzer.tsx` date call sites don't match the descriptions (more or fewer than the 4+1 listed) — the component drifted (plan 008/010 may have run first); report which plan reordered and reconcile with the operator.
- You feel the need to change the `AnalysisStats` type shape — none of these fixes require it.

## Maintenance notes

- Fix (a) changes displayed totals for users with aborted games — expected and correct; the reviewer should verify `openings[].count` still counts all games while W/L/D only counts decisive ones (a deliberate asymmetry: "played 10 times, 4W 3L 2D, 1 aborted").
- If plan 009 (fast parser) lands later, it must preserve the `Date.UTC` construction from step 5.
- Deferred: surfacing an "aborted" count in the UI (currently invisible); noted for the maintainer, not planned.
