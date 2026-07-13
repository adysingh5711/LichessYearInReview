# Plan 010: Split the chess-analyzer god component into per-tab chart modules

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- components/chess-analyzer.tsx components/charts/`
> Plans 005/006/008 legitimately modify `components/chess-analyzer.tsx` first —
> this plan REQUIRES 008 to have landed (dead code removed). Read the whole
> live file before starting; the excerpts below describe the a93da87 layout
> and will have shifted.

## Status

- **Priority**: P3
- **Effort**: L
- **Risk**: MED (large mechanical refactor of the main UI; no unit-test net for components)
- **Depends on**: plans/001-verification-baseline.md, plans/008-dead-code-and-quick-perf.md (and 005/006 by file-conflict ordering)
- **Category**: tech-debt
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

`components/chess-analyzer.tsx` is ~1,170 lines — an order of magnitude larger than every other component in the repo — and mixes input handling, data fetching, five chart renderers, four tooltip components, and the whole tabbed layout. Chart renderers and tooltips are defined **inside** the component body, so they are re-created on every render, and any change to one tab risks the others (git history already records one such regression). Splitting each tab into its own module makes the file navigable, stabilizes component identity, and shrinks the blast radius of future chart work.

## Current state

Layout at commit `a93da87` (post-008 line numbers will differ; locate by symbol):

- `components/chess-analyzer.tsx` structure:
  - `ModeToggle` (lines 59-78) — exported theme toggle, used only in this file's header JSX.
  - `ChessAnalyzer` component (line 80 on):
    - state + handlers: `username`, `file`, `loading`, `stats`, `error`, `selectedGameType`, `showShareModal`, `startYear`, `endYear`, `isFetching`, `showHelp`; `handleFileChange`, `handleRemoveFile`, `handleFetchGames`, `handleAnalyze`, `handleShare` (lines 81-227)
    - inline chart renderers: `renderWinRateChart` (278-331), `renderOpeningsChart` (396-466), plus the rating-progression LineChart and head-to-head BarChart written directly in JSX (964-1061, 1091-1148)
    - inline tooltips: `CustomMonthlyTooltip` (333-360), `renderCustomizedTick` (362-394), `CustomTooltip` (468-501), `RatingTooltip` (503-529)
    - memos: `openingsByCount`, `openingsByWins`, `openingsByWinRate` (532-542; plan 008 adds `openingsByLosses` and `filteredProgression`)
    - help-tooltip hover logic: `handleMouseEnter`/`handleMouseLeave` + effect (548-589)
    - JSX: input card (591-781), then five `TabsContent` blocks — overview stat cards (800-891), openings (892-940), rating progression (942-1064), monthly performance (1066-1080), matchups (1082-1151) — and `ShareDialog` (1154-1163).
- Every chart uses the same theme-dependent `Brush` styling block (`stroke={theme === "dark" ? "#64748b" : "#8884d8"}` etc.) repeated 4 times.
- Repo conventions: function components with named exports in `components/`, kebab-case filenames (`share-dialog.tsx`, `theme-provider.tsx`), UI primitives under `components/ui/`, types from `@/types/chess`. Follow these.
- `app/page.tsx` imports only the default export `ChessAnalyzer`.
- `RatingTooltip` is defined but the rating chart at line 998 uses its own inline tooltip — when extracting, use `RatingTooltip` for that chart and delete the inline duplicate (they render the same fields).

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0              |
| Typecheck | `pnpm typecheck` | exit 0              |
| Lint      | `pnpm lint`      | exit 0              |
| Tests     | `pnpm test`      | all pass            |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope**:
- `components/chess-analyzer.tsx` (shrinks to input card + tab shell + state)
- `components/charts/` (create): `monthly-performance-chart.tsx`, `openings-chart.tsx`, `rating-progression-chart.tsx`, `head-to-head-chart.tsx`, `chart-tooltips.tsx`, `themed-brush.tsx`
- `components/overview-cards.tsx` (create)

**Out of scope** (do NOT touch):
- Any behavior, styling, or data change — this is a pure extraction; every prop value, className, color, and Brush index must survive verbatim.
- `components/share-dialog.tsx`, `components/ui/*`, `lib/`, `app/api/`.
- Merging `magic-card.tsx`/`chart-magic-card.tsx` — noted as optional follow-up only.

## Git workflow

- Branch: `advisor/010-split-chess-analyzer`
- One commit per extracted module (verifiable increments), short lowercase messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

Each step: extract, import back, typecheck, build, and eyeball the affected tab in `pnpm dev` before the next step. The app must render identically after every step.

### Step 1: Shared pieces

Create `components/charts/chart-tooltips.tsx` exporting `CustomTooltip`, `CustomMonthlyTooltip`, `RatingTooltip`, and `renderCustomizedTick` (move them verbatim; they only depend on recharts types and Tailwind classes). Create `components/charts/themed-brush.tsx` exporting a `ThemedBrush` wrapper (or a `brushProps(theme)` helper — pick whichever preserves the exact rendered output; recharts `Brush` must remain the direct child element type, so a props-helper is the safe choice:

```tsx
export const themedBrushProps = (theme: string | undefined) => ({
  height: 30,
  stroke: theme === "dark" ? "#64748b" : "#8884d8",
  fill: theme === "dark" ? "#1e293b" : "#f1f5f9",
  traveller: (props: any) => (
    <rect {...props} fill={theme === "dark" ? "#64748b" : "#8884d8"} stroke={theme === "dark" ? "#94a3b8" : "#cbd5e1"} />
  ),
});
```

then `<Brush dataKey="month" {...themedBrushProps(theme)} startIndex={...} />`).

**Verify**: `pnpm typecheck && pnpm build` → exit 0; dev-server tabs unchanged.

### Step 2: Monthly performance chart

Create `components/charts/monthly-performance-chart.tsx`: `export function MonthlyPerformanceChart({ data, theme }: { data: AnalysisStats["monthlyPerformance"]; theme?: string })` — the body of `renderWinRateChart` plus its Brush, importing tooltips from step 1. Replace the call site.

**Verify**: typecheck + build; Performance tab renders with brush and tooltip working.

### Step 3: Openings chart

`components/charts/openings-chart.tsx`: `OpeningsChart({ data, theme })` from `renderOpeningsChart`. It is called four times (mostPlayed / mostWins / bestRate / mostLosses tabs) — all four call sites switch to the component.

**Verify**: typecheck + build; all four openings sub-tabs render.

### Step 4: Rating progression chart

`components/charts/rating-progression-chart.tsx`: `RatingProgressionChart({ data, theme })` where `data` is the memoized `filteredProgression` from plan 008. Move the LineChart JSX, use `RatingTooltip`, delete the inline duplicate tooltip. The game-type `<select>` stays in `chess-analyzer.tsx` (it owns `selectedGameType` state).

**Verify**: typecheck + build; Rating tab renders, selector filters, brush works.

### Step 5: Head-to-head chart + overview cards

`components/charts/head-to-head-chart.tsx`: `HeadToHeadChart({ data, theme })` from the matchups BarChart JSX (keep the plan-008 `Math.min(10, ...)` endIndex). `components/overview-cards.tsx`: `OverviewCards({ stats, totalGames, theme })` wrapping the five MagicCard blocks of the overview tab.

**Verify**: typecheck + build; Overview and Matchups tabs render.

### Step 6: Final shape + full gate

`chess-analyzer.tsx` should now contain only: imports, `ModeToggle`, state/handlers/memos, the input card JSX, the tab shell delegating to the six new components, and `ShareDialog`.

**Verify**: `wc -l components/chess-analyzer.tsx` → under 500; `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0; full manual pass over all five tabs + share dialog + theme toggle in `pnpm dev`.

## Test plan

No component-test infrastructure exists and adding one is out of scope. The net is: the plan-002 suites (must stay green — they don't touch UI but catch accidental lib edits), typecheck on every extracted prop signature, and the per-step visual checks. Record in the completion report which tabs you visually verified and in which theme(s) — both light and dark for at least one chart tab (the Brush colors are theme-dependent).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `components/charts/` contains the 5 chart/tooltip modules + `overview-cards.tsx` exists
- [ ] `wc -l components/chess-analyzer.tsx` < 500
- [ ] `grep -n "renderWinRateChart\|renderOpeningsChart" components/chess-analyzer.tsx` → no matches
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all exit 0
- [ ] Manual five-tab + both-themes pass reported
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 008 has not landed (dead symbols like `handleDownload`/`StatBlock` still present) — extraction on top of dead code wastes the work.
- Any tab renders visibly differently after an extraction step (colors, brush ranges, tooltip content) and one comparison attempt doesn't restore it — report the diff and the tab.
- Recharts errors on the `themedBrushProps` spread (it inspects child element types) — report; do not silently restyle the brush.
- You want to "improve" a chart while moving it. Verbatim moves only.

## Maintenance notes

- Future chart work should now touch exactly one file per tab; a reviewer seeing a multi-chart diff should ask why.
- Optional follow-ups deliberately not done here: merging `magic-card.tsx`/`chart-magic-card.tsx`; a component-test setup (React Testing Library) if UI regressions keep recurring.
- The `theme` prop threading is the shape most likely to be questioned in review — `useTheme()` inside each chart would also work; props were chosen to keep the modules pure. Either is fine; be consistent.
