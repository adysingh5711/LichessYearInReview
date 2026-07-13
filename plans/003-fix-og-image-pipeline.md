# Plan 003: Fix the social-preview pipeline (retire puppeteer, wire up /api/og)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- app/api/screenshot/ app/api/og/ app/layout.tsx package.json`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md (for the gate commands)
- **Category**: bug / security / deps
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

Every Open Graph / Twitter image URL in the site's metadata points at `/api/screenshot`, a route that launches full puppeteer. This cannot work on Vercel: the full `puppeteer` package expects a locally installed Chromium that serverless functions don't have, and the route's `export const config = { runtime: 'edge' }` is the old pages-router convention that the app router silently ignores. So social link previews are broken in production. It is also an unauthenticated endpoint that forks a headless browser per request (resource-exhaustion surface) and leaks the browser on error (no try/finally). Meanwhile a working `@vercel/og` route already exists at `/api/og` — referenced by nothing — and puppeteer (~150 MB install) sits in production dependencies solely for the broken route.

## Current state

- `app/api/screenshot/route.tsx` (37 lines) — imports `puppeteer` (line 2), declares the ignored `config = { runtime: 'edge' }` (lines 4-6), launches a browser and screenshots the hardcoded prod homepage `https://lichess-review.vercel.app/` (lines 14-27). Reads `title`/`description` query params (lines 10-11) but never uses them. To be **deleted**.
- `app/api/og/route.tsx` (45 lines) — working `ImageResponse` from `next/og` rendering `title`/`description` on a gradient. Two problems to fix in place:
  - lines 3-5: the same ignored `config = { runtime: 'edge' }` export;
  - lines 12-14: `const response = await fetch('https://lichess-review.vercel.app/'); const html = await response.text();` — `html` is never used, and a failed fetch rejects the whole route unhandled.
- `app/layout.tsx` — four references to `/api/screenshot`:
  - line 35: `openGraph.images[0].url` = `` `${baseUrl}/api/screenshot?title=...&description=...` ``
  - line 47: `twitter.images` = same URL
  - line 59: manual `<meta property="twitter:image" ...>` in `<head>` = same URL
  - line 63: manual `<meta property="og:image" ...>` in `<head>` = same URL
  - (`baseUrl` is defined at line 18 as `'https://lichess-review.vercel.app/'` — note the trailing slash; the existing URLs read `${baseUrl}/api/...` producing a double slash `//api`. When you repoint them, use `https://lichess-review.vercel.app/api/og?...` without the double slash.)
- `package.json:38` — `"puppeteer": "^24.2.0"` in `dependencies`; `package.json:72-75` — `"onlyBuiltDependencies": ["@vercel/speed-insights", "puppeteer"]`.
- Nothing else imports puppeteer: `grep -rn "puppeteer" app lib components` matches only `app/api/screenshot/route.tsx`.
- Recent commits "used puppeteer" / "increased timeout in puppeteer" show this was the author's attempt to get OG images working — the `@vercel/og` route is the standard solution for exactly this.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0              |
| Typecheck | `pnpm typecheck` | exit 0              |
| Tests     | `pnpm test`      | all pass            |
| Build     | `pnpm build`     | exit 0; route table lists `/api/og`, not `/api/screenshot` |
| Manual    | `pnpm dev` then `curl -s -o /tmp/og.png -w "%{http_code} %{content-type}" "http://localhost:3000/api/og?title=Test&description=Hello"` | `200 image/png` |

## Scope

**In scope** (the only files you should modify/delete):
- `app/api/screenshot/route.tsx` (delete, including the now-empty `app/api/screenshot/` directory)
- `app/api/og/route.tsx`
- `app/layout.tsx` (only the four image URL strings)
- `package.json` (remove puppeteer from `dependencies` and from `pnpm.onlyBuiltDependencies`)
- `pnpm-lock.yaml` (side effect of `pnpm install`)

**Out of scope** (do NOT touch, even though they look related):
- `components/share-dialog.tsx` — the client-side share card uses `html-to-image`, a separate mechanism that works; a personalized OG card is a future direction item, not this plan.
- `public/` — any static images there are unrelated.
- The rest of `app/layout.tsx` metadata (titles, descriptions, authors).

## Git workflow

- Branch: `advisor/003-fix-og-image-pipeline`
- Commit style: short lowercase summaries (match `git log`).
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Clean up `/api/og`

In `app/api/og/route.tsx`:
1. Replace lines 3-5 (`export const config = { runtime: 'edge' };`) with the app-router form: `export const runtime = 'edge';`
2. Delete lines 12-17 (the `fetch` of the prod homepage, the `html` variable, and the two explanatory comments). The route needs only the query params.

**Verify**: `pnpm typecheck` → exit 0. Then `pnpm dev` in the background and `curl -s -o /tmp/og.png -w "%{http_code} %{content-type}\n" "http://localhost:3000/api/og?title=Test&description=Hello"` → `200 image/png`. Stop the dev server.

### Step 2: Repoint the metadata

In `app/layout.tsx`, replace all four `/api/screenshot` URLs with `/api/og`, keeping the same `title`/`description` query params. Fix the double slash: since `baseUrl` ends with `/`, the string should be `` `${baseUrl}api/og?...` ``.

**Verify**: `grep -n "api/screenshot" app/layout.tsx` → no matches; `grep -c "api/og" app/layout.tsx` → 4.

### Step 3: Delete the screenshot route

Delete `app/api/screenshot/route.tsx` and its directory.

**Verify**: `grep -rn "api/screenshot\|from 'puppeteer'\|from \"puppeteer\"" app lib components` → no matches.

### Step 4: Remove puppeteer from the manifest

In `package.json`: delete the `"puppeteer"` line from `dependencies` and remove `"puppeteer"` from `pnpm.onlyBuiltDependencies` (leave `"@vercel/speed-insights"` in that array). Run `pnpm install` to update the lockfile.

**Verify**: `grep -n "puppeteer" package.json pnpm-lock.yaml | head -5` → no match in `package.json`; `pnpm install` → exit 0.

### Step 5: Full gate

**Verify**: `pnpm typecheck && pnpm test && pnpm build` → all exit 0. In the `pnpm build` output route table, `/api/og` is listed and `/api/screenshot` is absent.

## Test plan

No new unit tests (the route is a thin `ImageResponse` wrapper). The machine gates are the curl check in step 1 and the build route table in step 5. After deploy (outside this plan), the operator can validate the preview with a card validator (e.g. opengraph.xyz) against the prod URL.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `app/api/screenshot/` does not exist
- [ ] `grep -rn "puppeteer" package.json app lib components` → no matches
- [ ] `grep -rn "api/screenshot" app` → no matches
- [ ] `curl` against dev `/api/og` returns HTTP 200 with `image/png`
- [ ] `pnpm typecheck && pnpm test && pnpm build` all exit 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Anything besides `app/api/screenshot/route.tsx` imports puppeteer (the grep in step 3 finds other matches).
- `/api/og` does not return a PNG after step 1 — report the error body; do not attempt to rewrite the route with a different library.
- `pnpm build` fails after removing puppeteer with an error naming puppeteer — something else depends on it; report.

## Maintenance notes

- Direction item (not in this plan): parameterize `/api/og` with real per-user stats so shared reviews get personalized preview cards; the share-dialog card is the design reference.
- Reviewer should scrutinize: the four layout.tsx URLs (easy to miss the two manual `<meta>` tags in `<head>`, lines 59 and 63) and the double-slash fix.
- The `onlyBuiltDependencies` edit matters: leaving puppeteer listed there after removal is harmless but confusing; removing `@vercel/speed-insights` by accident breaks its postinstall.
