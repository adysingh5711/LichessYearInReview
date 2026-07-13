# Plan 009: Make analysis fast — parse PGN headers directly instead of replaying every move

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- lib/pgn-parser.ts lib/analyzer.ts types/chess.ts lib/__tests__/`
> Plans 002/004/005 legitimately touch these first (tests, username fix, UTC
> dates). Read the current `lib/pgn-parser.ts` fully before starting — your
> changes layer on top of plan 005's `Date.UTC` fix, which MUST be preserved.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED (replaces the parser core — gated by the plan-002 characterization suite)
- **Depends on**: plans/002-analyzer-parser-tests.md, plans/005-stats-math-fixes.md
- **Category**: perf
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

This is the "make processing faster" plan. Today `parseGame` feeds every game through chess.js's `loadPgn`, which **replays and legality-checks every move of every game** — thousands of full board simulations for a year of blitz — inside a serverless function capped at 60 seconds. But the analysis never looks at the moves: the analyzer's only use of `game.moves` is `game.moves.length` (`lib/analyzer.ts:187`), i.e. a ply count. Parsing headers with a regex and counting movetext tokens produces identical stats in a tiny fraction of the time, removes the 60s-timeout risk for large files, and lets `chess.js` leave the dependency tree entirely.

## Current state

(At commit `a93da87`; plan 005 will have changed line 26 to `Date.UTC` — preserve that.)

- `lib/pgn-parser.ts:29-73` — `parseGame`:

```ts
export const parseGame = (pgnText: string): GameStats[] => {
  const games: GameStats[] = [];
  const chess = new Chess();
  ...
  const gameTexts = pgnText.split(/\n\n(?=\[)/).filter((text) => text.trim());

  for (let gameText of gameTexts) {
    try {
      chess.loadPgn(gameText, { strict: false });     // ← full move replay
      const headers = chess.header();
      if (!headers.White || !headers.Black || !headers.Result) { ...continue; }
      games.push({
        timeControl: headers.TimeControl || "unlimited",
        result: headers.Result,
        white: headers.White,
        black: headers.Black,
        opening: headers.Opening || headers.ECO ? `${headers.Opening || 'Unknown'} (${headers.ECO || '?'})` : "Unknown Opening",
        date: headers.Date ? parsePGNDate(headers.Date) : new Date(),
        whiteElo: headers.WhiteElo || "0",
        ...
        moves: chess.history(),                        // ← array of SAN strings, one per ply
      });
    } catch (e) { ...continue; }
  }
  games.sort((a, b) => a.date!.getTime() - b.date!.getTime());
  return games;
};
```

- `types/chess.ts:12` — `GameStats.moves: string[]`.
- The ONLY consumer of `moves`: `lib/analyzer.ts:187` — `const gameLength = game.moves ? game.moves.length : 0;`. (`grep -rn "\.moves" lib app components types` — other matches are the Lichess NDJSON `game.moves` string in `app/api/fetch-games/route.ts`, which is a different object and out of scope.)
- `chess.js` is imported ONLY by `lib/pgn-parser.ts:1` (`grep -rn "chess.js\|from \"chess\"\|from 'chess'" app lib components` → one match).
- The plan-002 test suites assert `parseGame` observable behavior (header fields, `moves` length per ply, skip-on-missing-headers, empty/garbage input, date sorting).
- PGN movetext format facts the tokenizer must handle: move numbers (`1.` and `1...`), SAN tokens (`e4`, `Nf3`, `O-O`, `exd5`, `Qxf7+`, `e8=Q#`), comments in `{...}` (may span lines), variations in `(...)` (nested), NAGs (`$1`), evaluation annotations glued to moves (`!?`), and a terminating result token (`1-0`, `0-1`, `1/2-1/2`, `*`). Lichess exports with `moves=true` produce flat movetext with `{...}` clock comments and no variations, but uploaded PGNs (the primary input path) can contain anything.

## Commands you will need

| Purpose   | Command                      | Expected on success |
|-----------|------------------------------|---------------------|
| Install   | `pnpm install`               | exit 0              |
| Tests     | `pnpm test`                  | all pass            |
| One suite | `pnpm test -- pgn-parser`    | passes              |
| Typecheck | `pnpm typecheck`             | exit 0              |
| Build     | `pnpm build`                 | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `lib/pgn-parser.ts` (rewrite `parseGame` internals; keep `categorizeTimeControl`, `parsePGNDate` as-is)
- `types/chess.ts` (`moves: string[]` → `moveCount: number`)
- `lib/analyzer.ts` (line 187 only: use `game.moveCount`)
- `lib/__tests__/pgn-parser.test.ts`, `lib/__tests__/analyzer.test.ts` (mechanical `moves: [...]` → `moveCount: n` fixture updates)
- `package.json` (remove `chess.js`, and `@types/chess.js` if still present)

**Out of scope** (do NOT touch):
- `app/api/fetch-games/route.ts` — its `game.moves` is the Lichess NDJSON field, unrelated.
- `app/api/analyze/route.ts` — signature unchanged.
- Moving analysis client-side or streaming — bigger architectural bets, deliberately deferred.

## Git workflow

- Branch: `advisor/009-fast-pgn-parsing`
- Commit style: short lowercase summaries.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Change the contract to a count

- `types/chess.ts:12`: `moves: string[];` → `moveCount: number;`
- `lib/analyzer.ts:187`: `const gameLength = game.moves ? game.moves.length : 0;` → `const gameLength = game.moveCount ?? 0;`
- Update fixtures in both test files: `moves: ["e4","c5","Nf3"]` → `moveCount: 3` (etc.), and parser assertions from `result.moves.length` to `result.moveCount`.

**Verify**: `pnpm typecheck` → fails only inside `lib/pgn-parser.ts` (still returning `moves`). That's expected; proceed.

### Step 2: Rewrite `parseGame` without chess.js

Replace the loadPgn body. Target shape (adapt naming to taste, keep exports identical):

```ts
const HEADER_RE = /^\[(\w+)\s+"([^"]*)"\]/gm;

const countPlies = (movetext: string): number => {
  const cleaned = movetext
    .replace(/\{[^}]*\}/g, " ")        // comments (incl. lichess clock annotations)
    .replace(/\([^()]*\)/g, " ")       // variations — repeat while nested ones remain
    .replace(/\$\d+/g, " ")            // NAGs
    .replace(/\d+\.(\.\.)?/g, " ")     // move numbers 1. / 1...
    .replace(/\b(1-0|0-1|1\/2-1\/2|\*)\s*$/, " "); // result token
  // ponytail: nested variations handled by looping the paren-strip until stable
  let prev;
  let out = cleaned;
  do { prev = out; out = out.replace(/\([^()]*\)/g, " "); } while (out !== prev);
  return out.split(/\s+/).filter(tok => tok && /^[a-hKQRBNOx0-9=+#!?-]+$/.test(tok) === false ? false : Boolean(tok)).length;
};
```

**Simplify the token filter**: after the strips above, every remaining whitespace-separated token IS a SAN move for well-formed PGN — `out.trim() ? out.trim().split(/\s+/).length : 0` is sufficient and is what you should ship (the character-class filter above is illustrative, not required; do not over-engineer).

For each game text (keep the existing `/\n\n(?=\[)/` split):
1. Collect headers with `HEADER_RE` into a `Record<string, string>`.
2. Keep the existing validation: skip when `White`/`Black`/`Result` missing.
3. Movetext = the portion after the last header line (split the game text on the first blank line after headers: `gameText.split(/\n\s*\n/)` — headers block first, movetext the rest joined).
4. Build the same `GameStats` object as today (same fallbacks: `TimeControl || "unlimited"`, elo `|| "0"`, the opening ternary, `Date` header → `parsePGNDate`, else `new Date()`), with `moveCount: countPlies(movetext)`.
5. Keep the try/catch-continue and the final date sort.

Remove the `import { Chess } from "chess.js";` line.

**Verify**: `pnpm test -- pgn-parser` → all pass, including: two-game fixture returns 2 games sorted by date; `moveCount === 3` for `1. e4 c5 2. Nf3 1-0`; missing-White game skipped; empty string → `[]`.

Note one intentional behavior change: garbage that chess.js used to reject (e.g. headers followed by illegal moves) now parses if headers are well-formed — moves are no longer validated. The plan-002 test `parseGame("not a pgn") → []` must still pass because there are no headers; if plan 002 wrote a fixture with valid headers + illegal movetext expecting rejection, update it to expect acceptance and add a comment (`// plan 009: moves are counted, not validated`).

### Step 3: Add movetext edge-case tests

Extend `lib/__tests__/pgn-parser.test.ts`:
- clock comments: `1. e4 { [%clk 0:03:00] } c5 { [%clk 0:03:00] } 2. Nf3 1-0` → `moveCount: 3` (Lichess export format — this is the critical case);
- black-to-move continuation `1... c5 2. Nf3` handled;
- variation `1. e4 (1. d4 d5) c5 1-0` → `moveCount: 2`;
- checkmate/promotion tokens `e8=Q#` counted as one ply;
- `*` result token not counted as a move.

**Verify**: `pnpm test -- pgn-parser` → all pass.

### Step 4: Remove chess.js from the manifest

Delete `"chess.js"` (and `"@types/chess.js"` if plan 007 left it in devDependencies) from `package.json`; `pnpm install`.

**Verify**: `grep -n "chess.js" package.json` → no matches; `grep -rn "from \"chess.js\"\|from 'chess.js'" app lib components` → no matches; `pnpm install` → exit 0.

### Step 5: Measure (informational gate)

Generate a large synthetic PGN and time the parser, e.g. a quick script in the scratch area or an inline node eval that repeats the two-game fixture 5,000 times and calls `parseGame`. Record before/after numbers in your completion report if the old implementation is still reachable via git stash; otherwise just record the after number (expected: well under 1s for 10,000 games).

**Verify**: parsing 10,000 synthetic games completes in < 5s on the dev machine (generous bound; expect far less).

### Step 6: Full gate

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → all exit 0.

## Test plan

- Mechanical fixture updates (step 1), the preserved characterization assertions (step 2), and the new movetext edge cases (step 3). The analyzer suite must pass **without any assertion changes** beyond the `moveCount` rename — the stats outputs are identical by construction.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "chess.js" package.json app lib components` → no matches
- [ ] `grep -n "moveCount" types/chess.ts lib/analyzer.ts lib/pgn-parser.ts` → present in all three
- [ ] `pnpm test` exits 0, including the 5 new movetext edge cases
- [ ] 10k-game synthetic parse completes < 5s (reported)
- [ ] `pnpm typecheck && pnpm build` exit 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- You find another consumer of `GameStats.moves` beyond `lib/analyzer.ts:187` (the grep in Current state missed drift).
- The Lichess clock-comment fixture (step 3) can't be made to count correctly with the strip-then-count approach after two attempts — report the failing movetext.
- Plan 002's suite doesn't exist or plan 005's `Date.UTC` change is absent (dependencies not met).

## Maintenance notes

- Moves are no longer validated: a corrupt PGN with plausible headers now yields a game with a possibly-wrong ply count instead of being skipped. Acceptable for stats; if move-level features (blunder analysis, board replay) arrive later, chess.js comes back — for those features only, not for bulk parsing.
- If plan 005 ever gets reverted, this parser keeps its own `parsePGNDate` call sites — no coupling beyond that one function.
- Reviewer should scrutinize: `countPlies` on the Lichess clock-comment format (the dominant real-world input) and the blank-line split between headers and movetext (headers with no movetext should yield `moveCount: 0`, not a crash).
