# Plan 004: Match usernames case-insensitively in the analyzer

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- lib/analyzer.ts lib/__tests__/analyzer.test.ts`
> If `lib/analyzer.ts` changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/002-analyzer-parser-tests.md
- **Category**: bug
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

The analyzer decides which side of each game the user played with an exact string comparison against the PGN `White` header. Lichess usernames are case-insensitive, and PGN exports carry the canonical casing — so a user who types `magnuscarlsen` instead of `MagnusCarlsen` gets **silently inverted stats**: every game is attributed to the wrong side, white wins become losses, the color stats flip, and the user's own name shows up as an opponent in head-to-head. The output looks plausible, which is the worst kind of wrong.

## Current state

- `lib/analyzer.ts:55-64` — inside the per-game loop:

```ts
for (const game of games) {
  // Skip processing for matchups if opponent is Anonymous
  const opponent = game.white === username ? game.black : game.white;
  const isValidOpponent = opponent !== 'Anonymous';
  ...
  const isWhite = game.white === username;
```

These are the **only two** username comparisons in the analyzer (`grep -n "=== username" lib/analyzer.ts` → lines 57, 64). `game.white`/`game.black` are guaranteed non-empty strings by the parser (`lib/pgn-parser.ts:47-50` skips games missing those headers).

- The characterization test from plan 002 (`lib/__tests__/analyzer.test.ts`) contains an assertion marked `// KNOWN BUG (plan 004)` pinning the current wrong behavior for a lowercased username. This plan flips that assertion.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Install   | `pnpm install`           | exit 0              |
| Tests     | `pnpm test -- analyzer`  | suite passes        |
| Typecheck | `pnpm typecheck`         | exit 0              |
| Full gate | `pnpm test && pnpm build`| exit 0              |

## Scope

**In scope** (the only files you should modify):
- `lib/analyzer.ts` (lines 55-64 region only)
- `lib/__tests__/analyzer.test.ts` (flip the plan-004 KNOWN BUG assertion; add the equality assertion)

**Out of scope** (do NOT touch):
- `components/chess-analyzer.tsx` — the raw username stays as typed for display; no client change needed.
- `app/api/analyze/route.ts`, `lib/pgn-parser.ts` — no normalization belongs there; fixing it once in the analyzer covers both the upload and fetch paths, which both route through `analyzeGames`.
- The `'Anonymous'` opponent check — Lichess emits it with this exact casing; leave the comparison as-is.

## Git workflow

- Branch: `advisor/004-case-insensitive-username`
- Commit style: short lowercase summaries (match `git log`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Normalize once, compare normalized

In `lib/analyzer.ts`, immediately inside `analyzeGames` (before the loop, near line 8), add:

```ts
const normalizedUsername = username.trim().toLowerCase();
```

Then change the two comparisons (lines 57 and 64) to:

```ts
const opponent = game.white.toLowerCase() === normalizedUsername ? game.black : game.white;
...
const isWhite = game.white.toLowerCase() === normalizedUsername;
```

(Compute `game.white.toLowerCase()` once per game into a local if you prefer; behavior is what matters.)

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Flip the characterization assertion

In `lib/__tests__/analyzer.test.ts`, find the assertion marked `// KNOWN BUG (plan 004)`. Replace it with an equality check:

```ts
expect(analyzeGames(fixture, "testuser")).toEqual(analyzeGames(fixture, "TestUser"));
expect(analyzeGames(fixture, " TestUser ")).toEqual(analyzeGames(fixture, "TestUser"));
```

Remove the KNOWN BUG comment for plan 004 (leave plan 005's comments untouched).

**Verify**: `pnpm test -- analyzer` → all pass, including the new equality assertions.

### Step 3: Full gate

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → all exit 0.

## Test plan

- Modified: the case-sensitivity assertions in `lib/__tests__/analyzer.test.ts` (step 2). All other characterization assertions must pass **unchanged** — that is the proof this fix touched only side-attribution.
- Pattern: the existing suite from plan 002.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "=== username" lib/analyzer.ts` → no matches
- [ ] `grep -c "KNOWN BUG (plan 004)" lib/__tests__/analyzer.test.ts` → 0
- [ ] `pnpm test` exits 0 with no other assertion in `analyzer.test.ts` modified
- [ ] `pnpm typecheck && pnpm build` exit 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `lib/__tests__/analyzer.test.ts` does not exist (plan 002 has not run) — report; do not write the whole suite yourself.
- Any characterization assertion **other than** the plan-004-marked one fails after step 1 — the fix leaked into behavior it shouldn't touch.
- The comparisons at lines 57/64 don't match the excerpt (drift).

## Maintenance notes

- If a "verify username exists on Lichess" feature is added later, normalize there too — but the analyzer's own normalization must stay, since the upload path bypasses any such check.
- Reviewer should scrutinize: that display strings (share card, tweet text) still use the user's original casing — they come from component state, not the analyzer, so they should be unaffected.
