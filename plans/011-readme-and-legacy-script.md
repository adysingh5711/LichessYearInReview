# Plan 011: Rewrite the README for the web app and retire the legacy Python script

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- README.md lyir.py requirements.txt`
> If these changed since this plan was written, compare against the excerpts
> below; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none (content-only; better after 003/009 land so the feature list is accurate — check their status rows and describe what is actually true)
- **Category**: docs / tech-debt
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

The README describes the retired Python script as the product: its features section is titled "Implemented Features (In Python File)" and its "Future Scope" proposes building a web interface (exists — the entire repo is one) and Lichess API integration (exists — `app/api/fetch-games/route.ts`). A new contributor onboards against the wrong artifact. Meanwhile `lyir.py` (557 lines) re-implements the whole analyzer in Python with its own divergent time-control thresholds and known crash bugs — a maintenance decoy that should be clearly marked legacy, not presented first.

## Current state

- `README.md` (170 lines):
  - lines 7-31 — instructions for downloading Lichess history and running the **Python script** come before anything about the website;
  - line 56 — `## Implemented Features (In Python File)` (the features listed are in fact also implemented in the web app's `lib/analyzer.ts`);
  - lines 103-137 — `## Future Scope of the Project` items 2 (web interface: "using frameworks like Flask or Django") and 3 (Lichess API integration) are already built; item 3's note about the API taking "12+ min" predates the current implementation;
  - lines 40-54 — dev-server instructions offering npm/yarn/pnpm/bun interchangeably (pnpm is the pinned manager after plan 001), and "You can start editing the page by modifying `components/chess-analyzer.tsx`" (stays true, but after plan 010 charts live in `components/charts/`);
  - lines 139-157 — auto-generated contributors block (`<!-- readme: collaborators,contributors -start -->` ... `-end -->`) maintained by `.github/workflows/update-contributors.yml` — MUST be preserved byte-for-byte;
  - lines 159-169 — license + acknowledgments.
- `lyir.py` — standalone CLI: matplotlib charts, its own `categorize_time_control` (crashes on `"-"`/`"unlimited"` time controls: `map(int, tc.split("+"))`), zero-division on empty PGNs. Referenced only by README; no code imports it.
- `requirements.txt` — Python deps for `lyir.py` only.
- The web app's actual feature set (verify against the code, and against plans/README.md status for 003/009): PGN upload analysis, direct Lichess fetch by username + year range, five stat tabs (overview, openings, rating progression, monthly performance, matchups), dark/light theme, share card with PNG download and X/Twitter share.

## Commands you will need

| Purpose | Command | Expected on success |
|---------|---------|---------------------|
| Build still fine | `pnpm build` | exit 0 (README/script moves cannot break it — this is a paranoia gate) |
| Link check | manual read-through | no dead relative links |

## Scope

**In scope**:
- `README.md` (rewrite)
- `lyir.py` → move to `scripts/legacy/lyir.py` (use `git mv`)
- `requirements.txt` → move to `scripts/legacy/requirements.txt` (use `git mv`)
- `scripts/legacy/README.md` (create, 5-10 lines)

**Out of scope** (do NOT touch):
- Fixing `lyir.py`'s bugs — it is legacy; the move + disclaimer is the fix.
- `LICENSE`, `.github/workflows/update-contributors.yml`.
- The contributors HTML block content.

## Git workflow

- Branch: `advisor/011-readme-and-legacy-script`
- Commit style: short lowercase summaries.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Move the legacy script

`git mv lyir.py scripts/legacy/lyir.py && git mv requirements.txt scripts/legacy/requirements.txt`. Create `scripts/legacy/README.md`:

```markdown
# Legacy Python CLI

`lyir.py` is the original command-line version of Lichess Year in Review,
kept for reference. It is unmaintained: the authoritative analysis lives in
`lib/analyzer.ts` (the web app), and the two are known to disagree on
time-control boundaries. Known issues: crashes on `-`/`unlimited` time
controls and on PGNs with zero games.

Usage: `pip install -r requirements.txt && python lyir.py`
```

**Verify**: `git status` shows two renames + one new file; `ls lyir.py requirements.txt` → both "No such file".

### Step 2: Rewrite README.md

Structure (preserve tone; keep it factual — check plans/README.md for which plans have landed and describe only what is true):

1. Title + one-paragraph description (web app first, with the live URL `https://lichess-review.vercel.app/`).
2. **Using the site**: enter a Lichess username + year range and hit Analyze, or upload a PGN exported from `https://lichess.org/@/<username>/download`. Mention the five tabs and the share card.
3. **Development**: `pnpm install`, `pnpm dev`, plus the verification commands (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) — pnpm only (it is the pinned manager). Keep the "edit `components/chess-analyzer.tsx`" pointer, amended with `components/charts/` if plan 010 has landed.
4. **How it works** (3-6 lines): PGN parsing in `lib/pgn-parser.ts`, stats in `lib/analyzer.ts`, API routes `fetch-games` (Lichess proxy) and `analyze`.
5. **Roadmap** — carry forward ONLY the genuinely-undelivered future-scope items: engine-based blunder/accuracy metrics, puzzle stats, opening study recommendations, badges/achievements, comparing with friends. Drop the delivered ones (web UI, API integration, sharing, charts).
6. **Legacy CLI** (2 lines): link to `scripts/legacy/`.
7. Contributors block — copy the existing lines 139-157 **unchanged**, markers included.
8. License + acknowledgments (keep current text).

**Verify**: `grep -n "readme: collaborators,contributors" README.md` → both `-start` and `-end` markers present; `grep -in "flask\|django\|In Python File" README.md` → no matches; `grep -n "scripts/legacy" README.md` → ≥1 match.

### Step 3: Gate

**Verify**: `pnpm build` → exit 0 (nothing imports the moved files — this confirms it); a full read-through of the new README against the actual repo state, checking every named path exists (`lib/analyzer.ts`, `lib/pgn-parser.ts`, `app/api/fetch-games/route.ts`, `scripts/legacy/lyir.py`).

## Test plan

None (docs + file moves). The gates are the greps and build in steps 2-3.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `lyir.py` and `requirements.txt` exist only under `scripts/legacy/`
- [ ] `scripts/legacy/README.md` exists
- [ ] README contributors markers preserved; no "In Python File" / Flask / Django text
- [ ] Every file path named in README exists (`ls` each)
- [ ] `pnpm build` exits 0
- [ ] `git status` clean outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Anything in `app/`, `lib/`, or CI references `lyir.py` or `requirements.txt` (`grep -rn "lyir\|requirements.txt" app lib components .github package.json` returns matches) — the move would break it.
- You are unsure whether a feature claim is true (e.g. plan 003's OG fix hasn't landed) — write the README to current reality, and if reality is ambiguous, ask rather than guess.

## Maintenance notes

- The README's feature list will drift again; the cheap guard is reviewing it whenever a `plans/` item with user-visible impact lands.
- If the maintainer prefers deleting `lyir.py` outright over archiving, that's a one-line follow-up — archiving was chosen because the README historically treats it as part of the project's story.
