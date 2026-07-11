# Plan 008: Remove dead code and fix quick UI performance losses

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- components/chess-analyzer.tsx app/api/fetch-games/route.ts lib/analyzer.ts`
> Plans 004/005/006 legitimately touch these files first (username normalization,
> stats fixes, URLSearchParams). For anything else, compare the "Current state"
> excerpts against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/005-stats-math-fixes.md, plans/006-api-input-hardening.md (same files; run after both to avoid conflicts)
- **Category**: tech-debt / perf
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

The main component carries a cluster of dead code that misleads readers (two unused stat components duplicated from `share-dialog.tsx`, four unused derived values, several unused imports) plus three real user-facing losses: a **fake progress loop that delays showing results by ~1.1 seconds after the analysis response has already arrived**, the rating-progression array filtered up to three times per render, and a hardcoded chart `Brush` index that assumes ≥11 opponents. The fetch-games route also carries two never-called helpers whose time-control thresholds contradict the real categorizer — deleting them removes a trap. This plan also clears the lint warnings surfaced when plan 001 re-enabled `no-unused-vars`, and slims the file before plan 010 splits it.

## Current state

All at commit `a93da87` (line numbers may shift a few lines after plans 004-006; locate by symbol name).

**`app/api/fetch-games/route.ts`** — `getTimeControl` (lines 40-49) and `formatTimeControl` (lines 51-54) are defined and never called (`grep -n "getTimeControl\|formatTimeControl"` matches only their definitions). Note `getTimeControl`'s thresholds (Blitz < 10 min) disagree with the real categorizer in `lib/pgn-parser.ts:4-19` (Blitz ≤ 8 min) — dead AND wrong.

**`components/chess-analyzer.tsx`**:
- Fake progress loop, lines 212-218 (inside `handleAnalyze`, after the response arrived):

```ts
// Simulate loading percentage update (replace with actual logic if available)
for (let i = 0; i <= 100; i += 10) {
  setLoadingPercentage(i);
  await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
}

setStats(await response.json());
```

- `loadingPercentage` state (line 95), reset at line 223, rendered in the button at line 687 (`` `${loadingPercentage}% ` ``).
- Unused derived values (lines 102-115): `mostPlayedOpening`, `filteredOpponents`, `bestWinRateMonth` — computed every render, referenced nowhere in the JSX (`peakRating` at 117-119 IS used — passed to `ShareDialog` at line 1161; keep it).
- Unused memo (lines 544-546): `headToHeadSorted` — the matchups chart uses `stats.headToHead` directly (line 1093).
- Unused function `handleDownload` (lines 229-255) — the download button lives in `ShareDialog`, which has its own copy; nothing in this file references `handleDownload` or `id="download-button"`.
- Unused components `StatBlock`/`StatItem` (lines 257-275) — duplicated in `components/share-dialog.tsx:38-56` where they ARE used.
- Unused imports (line-3 region and the lucide/UI blocks): `useRouter` (+ `const router = useRouter()` at line 89), `toPng` (only `handleDownload` used it), `Dialog`, `DialogContent`, `DialogTitle`, and lucide icons `FileInput`, `Trophy`, `Clock`, `Swords`. Confirm each with grep before removing — plans 004-006 didn't add uses, but verify.
- Un-memoized inline sort, lines 930-935: the "Most Losses" tab calls `[...stats.openings].sort((a, b) => b.losses - a.losses)` inside JSX on every render, while its three siblings (`openingsByCount`, `openingsByWins`, `openingsByWinRate`, lines 532-542) are `useMemo`'d.
- Triple filter, lines 966-1057: `stats.ratingProgression.filter(r => r.gameType === selectedGameType)` is computed once for the chart `data` (968-974), once for the Brush `startIndex` (1043-1050), once for the Brush `endIndex` (1051-1057).
- Hardcoded Brush index, line 1144: the matchups chart has `endIndex={10}` — out of range when there are ≤10 opponents (recharts index bounds).

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0              |
| Typecheck | `pnpm typecheck` | exit 0              |
| Lint      | `pnpm lint`      | exit 0; unused-var warnings for this file gone |
| Tests     | `pnpm test`      | all pass            |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `components/chess-analyzer.tsx`
- `app/api/fetch-games/route.ts` (delete the two dead functions only)
- `lib/analyzer.ts` (remove the unused `parsePGNDate` import ONLY if still unused after plan 005 — check first; plan 005 may not have used it)

**Out of scope** (do NOT touch):
- `components/share-dialog.tsx` — its `StatBlock`/`StatItem` are live.
- Any JSX/layout restructuring, component extraction, or file splitting — that is plan 010.
- The loading **spinner** behavior — keep `Loader2` spinning during `loading`; only the fake percentage goes.

## Git workflow

- Branch: `advisor/008-dead-code-and-quick-perf`
- Commit style: short lowercase summaries; one commit for deletions, one for the perf fixes is fine.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Delete the dead fetch-games helpers

Remove `getTimeControl` and `formatTimeControl` from `app/api/fetch-games/route.ts` (and nothing else).

**Verify**: `grep -n "getTimeControl\|formatTimeControl" app/api/fetch-games/route.ts` → no matches; `pnpm typecheck` → exit 0.

### Step 2: Remove the fake progress loop

In `handleAnalyze`:
- delete the simulate loop (the 5 lines quoted above), leaving `setStats(await response.json());` immediately after the `response.ok` check;
- delete the `loadingPercentage` state (line 95), the `setLoadingPercentage(0)` calls (lines 198, 223), and change the button rendering (lines 685-690) so the `loading` state shows the `Loader2` spinner (same as `isFetching`) instead of the percentage. Target shape:

```tsx
{(isFetching || loading) && <Loader2 className="w-4 h-4 animate-spin" />}
{isFetching ? "Fetching..." : loading ? "Analyzing..." : "Analyze Games"}
```

**Verify**: `grep -n "loadingPercentage" components/chess-analyzer.tsx` → no matches; `pnpm typecheck` → exit 0.

### Step 3: Delete dead values, components, and imports

Remove, after confirming each is unreferenced with grep (`grep -n "<name>" components/chess-analyzer.tsx` should match only the definition):
- `mostPlayedOpening`, `filteredOpponents`, `bestWinRateMonth` (keep `peakRating` and `totalGames`)
- `headToHeadSorted`
- `handleDownload`
- `StatBlock`, `StatItem`
- `const router = useRouter();` and the `useRouter` import
- `toPng` import; `Dialog`, `DialogContent`, `DialogTitle` imports; `FileInput`, `Trophy`, `Clock`, `Swords` icon imports

**Verify**: `pnpm typecheck` → exit 0; `pnpm lint` → no `no-unused-vars` warnings for `components/chess-analyzer.tsx`.

### Step 4: Memoize the remaining per-render work

1. Add alongside the existing memos (lines ~532-542):

```ts
const openingsByLosses = useMemo(() =>
  stats?.openings ? [...stats.openings].sort((a, b) => b.losses - a.losses) : []
, [stats]);
```

and use it in the "mostLosses" TabsContent instead of the inline sort.

2. Add:

```ts
const filteredProgression = useMemo(() => {
  if (!stats) return [];
  return selectedGameType === "All"
    ? stats.ratingProgression
    : stats.ratingProgression.filter(r => r.gameType === selectedGameType);
}, [stats, selectedGameType]);
```

Use `filteredProgression` for the LineChart `data` and `filteredProgression.length` in the Brush `startIndex`/`endIndex` expressions (replacing all three inline filter/ternary blocks).

3. Matchups Brush (line ~1144): `endIndex={10}` → `endIndex={Math.min(10, stats.headToHead.length - 1)}`.

**Verify**: `pnpm typecheck && pnpm build` → exit 0.

### Step 5: Smoke test + full gate

`pnpm dev`; analyze a small PGN (create one locally from the fixture strings in `lib/__tests__/pgn-parser.test.ts` if you have no sample). Confirm: results appear immediately after analysis (no percentage countdown); all five tabs render; the rating tab's game-type selector still filters; the matchups tab renders with fewer than 11 opponents.

**Verify**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0.

## Test plan

No new unit tests (UI-only changes; the repo has no component-test infrastructure and adding it is out of scope). Gates: typecheck, lint (unused-vars clean), build, and the step-5 manual smoke script.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "loadingPercentage\|handleDownload\|StatBlock\|headToHeadSorted\|getTimeControl" components/chess-analyzer.tsx app/api/fetch-games/route.ts` → no matches
- [ ] `pnpm lint` exits 0 with zero `no-unused-vars` warnings in the two touched files
- [ ] `pnpm typecheck && pnpm test && pnpm build` all exit 0
- [ ] Manual smoke (step 5) passed — noted in the completion report
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- A "dead" symbol turns out to be referenced (your grep in step 3 finds a second match) — plans 004-006 or the operator added a use; skip that deletion and note it.
- Any tab renders blank or throws in the step-5 smoke test.
- You are tempted to extract components or reorder JSX — that is plan 010; deletions and memo wraps only.

## Maintenance notes

- Plan 010 (component split) assumes this plan landed: the file should be ~150 lines lighter with no dead symbols before extraction starts.
- If real analysis progress reporting is ever wanted, it needs server-sent events or chunked responses from `/api/analyze` — the deleted loop was simulation, not a foundation.
- Reviewer should scrutinize: the button rendering change (step 2) for both `isFetching` and `loading` states, and that `peakRating` survived (it feeds `ShareDialog`).
