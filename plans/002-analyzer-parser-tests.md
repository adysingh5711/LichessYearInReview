# Plan 002: Characterization tests for the stats engine and PGN parser

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- lib/analyzer.ts lib/pgn-parser.ts types/chess.ts`
> If any in-scope-adjacent file changed since this plan was written, compare
> the "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW (test-only, no production code changes)
- **Depends on**: plans/001-verification-baseline.md
- **Category**: tests
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

`lib/analyzer.ts` (263 lines of stats math — results, streaks, monthly aggregation, openings, head-to-head, game lengths, peak ratings) is the reason this app exists, and it has zero test coverage: the only existing test mocks it out entirely. `lib/pgn-parser.ts` is the trust boundary for every uploaded file and is equally untested. Plans 004, 005, and 009 change this exact code; without characterization tests first, there is no way to know those changes preserve everything they weren't supposed to change.

## Current state

- `lib/analyzer.ts` — exports `analyzeGames(games: GameStats[], username: string): AnalysisStats`. Pure function, single for-of loop. Key behaviors to pin:
  - Result switch (`lib/analyzer.ts:69-109`): handles `"1-0"`, `"0-1"`, `"1/2-1/2"` only. Win/loss assignment depends on `isWhite = game.white === username` (**exact, case-sensitive match** — line 64).
  - Streaks (lines 111-113): max of running win/loss/draw streak counters.
  - Monthly stats (lines 116-144): keyed by `gameDate.toISOString().slice(0, 7)`; `ratingChange` accumulates only inside `if (isWin)` (lines 123-129).
  - Openings (lines 146-160): games that are neither win nor draw are counted as **losses** — including result `"*"`.
  - Head-to-head (lines 162-184): skipped when opponent is the literal string `'Anonymous'` (lines 57-58).
  - Result distribution (lines 186-258): min/max/average of `game.moves.length` per outcome; zero-count outcomes come back as `{average: 0, shortest: 0, longest: 0}` via `calculateStats` (lines 248-252).
  - Peak ratings (lines 140-143): per time-control max of `parseInt(whiteElo|blackElo)`.
- `lib/pgn-parser.ts` — exports:
  - `categorizeTimeControl(tc: string)` (lines 4-19): `""`/`"unlimited"` → `"Classical"`; `parseInt` of the part before `"+"`; `<180` → `"Bullet"`, `<=480` → `"Blitz"`, `<=1500` → `"Rapid"`, else `"Classical"`; NaN → `"Classical"`.
  - `parsePGNDate(s: string)` (lines 21-27): splits on `"."`, builds `new Date(year, month-1, day)` (local time), with fallbacks 2000/0/1.
  - `parseGame(pgnText: string): GameStats[]` (lines 29-73): splits games on `/\n\n(?=\[)/`, loads each through `chess.js` `loadPgn(..., { strict: false })`, skips games missing `White`/`Black`/`Result` headers, skips games that throw (silent `continue`), sorts ascending by date. `moves` is `chess.history()` (array of SAN strings, one per ply).
- `types/chess.ts` — `GameStats` (input shape) and `AnalysisStats` (output shape). `GameStats.moves: string[]`, `GameStats.date?: Date`, elo/ratingDiff fields are strings.
- Test infrastructure: Jest 29 + ts-jest, `testEnvironment: 'jsdom'`, path alias `@/*` → repo root (see `jest.config.ts:9-14`). Existing structural pattern: `app/api/analyze/__tests__/route.test.ts` (describe/it, `/// <reference types="jest" />` header). Tests run with `pnpm test`.

### Known bugs you must NOT enshrine as correct

These behaviors are current reality and will be **changed** by later plans. Write the characterization tests to match current behavior, but mark each with a comment so the fixing plan knows to flip the expectation:

1. `// KNOWN BUG (plan 004): username match is case-sensitive` — `analyzeGames(games, "USER")` vs `"user"` give different results.
2. `// KNOWN BUG (plan 005): result "*" counts as a loss in openings/head-to-head and does not reset streaks`.
3. `// KNOWN BUG (plan 005): monthly ratingChange only accumulates on wins`.

## Commands you will need

| Purpose   | Command                        | Expected on success |
|-----------|--------------------------------|---------------------|
| Install   | `pnpm install`                 | exit 0              |
| Tests     | `pnpm test`                    | all suites pass     |
| One suite | `pnpm test -- lib`             | the 2 new suites pass |
| Typecheck | `pnpm typecheck`               | exit 0              |

## Scope

**In scope** (the only files you should create/modify):
- `lib/__tests__/analyzer.test.ts` (create)
- `lib/__tests__/pgn-parser.test.ts` (create)

**Out of scope** (do NOT touch):
- `lib/analyzer.ts`, `lib/pgn-parser.ts` — this plan is test-only. If a test can only pass by changing production code, your expectation is wrong; re-read the source.
- `app/api/analyze/__tests__/route.test.ts` — already covered by plan 001.
- `jest.config.ts`, `jest.setup.ts`.

## Git workflow

- Branch: `advisor/002-analyzer-parser-tests`
- Commit style: short lowercase summaries (match `git log`, e.g. "added jest").
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Build the analyzer fixture

Create `lib/__tests__/analyzer.test.ts`. Define a helper that returns a `GameStats` with defaults, then a fixture array covering (username `"TestUser"`):

```ts
const game = (overrides: Partial<GameStats>): GameStats => ({
  timeControl: "300+0",
  result: "1-0",
  white: "TestUser",
  black: "Opponent1",
  opening: "Sicilian Defense (B20)",
  date: new Date(Date.UTC(2024, 0, 15)),
  whiteElo: "1500",
  blackElo: "1480",
  whiteRatingDiff: "8",
  blackRatingDiff: "-8",
  moves: ["e4", "c5", "Nf3"],
  ...overrides,
});
```

Fixture sequence (order matters — streaks depend on it):
1. Win as White (`result: "1-0"`, white: TestUser) — Jan 2024
2. Win as Black (`result: "0-1"`, white: "Opponent1", black: "TestUser") — Jan 2024
3. Loss as White (`result: "0-1"`) — Feb 2024, different opening
4. Draw as Black (`result: "1/2-1/2"`, white: "Opponent2", black: "TestUser") — Feb 2024
5. Game vs `"Anonymous"` (win as White) — Feb 2024
6. Aborted game (`result: "*"`) — Feb 2024

**Verify**: `pnpm typecheck` → exit 0 (fixture satisfies `GameStats`).

### Step 2: Assert the analyzer output

Assert on `analyzeGames(fixture, "TestUser")`:

- `results` — `{wins: 3, losses: 1, draws: 1}` (the `"*"` game touches none of these).
- `colorStats` — White `{wins: 2, losses: 1, draws: 0}`, Black `{wins: 1, losses: 0, draws: 1}`.
- `streaks.winStreak` — 2 (games 1-2).
- `gameTypes` — `{Blitz: 6}` (300s base time → Blitz).
- `monthlyPerformance` — two entries, `"2024-01"` and `"2024-02"`, sorted; check `games`, `wins`, `winRate` per month; `// KNOWN BUG (plan 005)` comment on the `ratingChange` assertion (only win diffs accumulate).
- `openings` — sorted by count descending; the `"*"` game's opening records a **loss** (`// KNOWN BUG (plan 005)`).
- `headToHead` — contains `Opponent1`/`Opponent2` but NOT `Anonymous`; check wins/losses/draws/winRate per opponent.
- `resultDistribution` — averages/min/max of `moves.length` per outcome; give the games distinct `moves` array lengths so min ≠ max for wins.
- `peakRatings` — `{Blitz: <max elo across fixture>}`.
- Empty input: `analyzeGames([], "TestUser")` returns zeroed structure (no NaN, no Infinity — assert `resultDistribution.wins.shortest === 0`).
- Case sensitivity: `analyzeGames(fixture, "testuser")` produces `results.wins` of 1 (only the game where TestUser is black and white won... work it out from the switch: with no `white === username` match, every `"1-0"` is a loss and every `"0-1"` is a win). Mark `// KNOWN BUG (plan 004): should equal the "TestUser" results after the fix`.

**Verify**: `pnpm test -- analyzer` → new suite passes.

### Step 3: Parser tests

Create `lib/__tests__/pgn-parser.test.ts`:

- `categorizeTimeControl`: `"179+0"` → Bullet, `"180+0"` → Blitz, `"480+2"` → Blitz, `"481+0"` → Rapid, `"1500+0"` → Rapid, `"1501+0"` → Classical, `"unlimited"` → Classical, `""` → Classical, `"-"` → Classical (parseInt("-") is NaN).
- `parsePGNDate`: `"2024.03.09"` → Date with `getFullYear() === 2024`, `getMonth() === 2`, `getDate() === 9`; `"????.??.??"` → year 2000, month 0, day 1. (Note: constructed in local time today — plan 005 changes this to UTC; assert via getFullYear/getMonth/getDate so the test survives that change.)
- `parseGame` with a two-game PGN string (realistic Lichess headers — include `White`, `Black`, `Result`, `Date`, `TimeControl`, `Opening`, `ECO`, `WhiteElo`, `BlackElo`, and a short movetext like `1. e4 c5 2. Nf3 1-0`):
  - returns 2 games, sorted ascending by date (put the later game first in the string);
  - `moves` has one entry per ply (e.g. `["e4", "c5", "Nf3"]` → length 3);
  - `opening` is formatted `"<Opening> (<ECO>)"`;
  - a game missing the `White` header is skipped (returns 1 game from a 2-game string);
  - empty string → `[]`;
  - garbage input (`"not a pgn"`) → `[]` (chess.js throws, parser continues).

**Verify**: `pnpm test -- pgn-parser` → new suite passes.

### Step 4: Full gate

**Verify**: `pnpm test` → all 3 suites pass; `pnpm typecheck` → exit 0; `pnpm lint` → exit 0.

## Test plan

This plan IS the test plan. Model the file structure on `app/api/analyze/__tests__/route.test.ts` (its describe/it layout, not its mocking — these tests use **no mocks**; both functions under test are pure).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `lib/__tests__/analyzer.test.ts` and `lib/__tests__/pgn-parser.test.ts` exist
- [ ] `pnpm test` exits 0; total test count ≥ 20 across the two new suites
- [ ] `grep -c "KNOWN BUG" lib/__tests__/analyzer.test.ts` ≥ 3
- [ ] No production file modified (`git status` shows only the two new test files + plans/README.md)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- An assertion about **current** behavior fails in a way that contradicts the "Current state" excerpts (e.g. `"*"` games do NOT count as opening losses) — the code has drifted; report the actual behavior.
- You find yourself wanting to edit `lib/analyzer.ts` or `lib/pgn-parser.ts` to make a test pass.
- `chess.js` `loadPgn` rejects the fixture PGN you wrote — simplify the movetext (chess.js validates moves for legality); if it still fails after one simplification, report the PGN string and the error.

## Maintenance notes

- Plans 004/005/009 will flip the `KNOWN BUG` expectations — each names the exact assertions it changes. A reviewer should reject any later PR that changes an assertion **without** a corresponding plan/comment.
- Plan 009 replaces the parser internals (drops chess.js) and changes `moves: string[]` to a count; the parser tests here assert `moves.length`-observable behavior deliberately so most survive with a mechanical update.
