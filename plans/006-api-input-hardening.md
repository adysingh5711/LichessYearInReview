# Plan 006: Harden API inputs (upload limits, username validation, safe error responses)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- app/api/analyze/route.ts app/api/fetch-games/route.ts components/chess-analyzer.tsx app/api/analyze/__tests__/route.test.ts`
> Plans 001 and 005 legitimately touch some of these files first (test fixture;
> year validation and `??` fixes in fetch-games). For anything else, compare
> the "Current state" excerpts against the live code; on a mismatch, treat it
> as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: LOW
- **Depends on**: plans/005-stats-math-fixes.md (both edit `app/api/fetch-games/route.ts`; run 005 first to avoid conflicts)
- **Category**: security
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

Both API routes trust their inputs completely. The analyze route reads an unbounded upload fully into memory (`await file.text()`) behind a client-side-only `.pgn` extension check, so a direct POST of a few hundred MB OOMs or times out the function. The fetch-games route interpolates a raw `username` query param into the upstream Lichess URL path — `?`, `#`, `/` or `..` in it manipulates the outbound request path/query — and returns raw upstream error bodies to callers. The client builds that query string by hand, so legitimate inputs containing `&` or `+` corrupt it. These are standard trust-boundary fixes with no product behavior change for legitimate users.

## Current state

All excerpts at commit `a93da87` (plan 005 will have already changed lines 70-71 and 156-159 of fetch-games — expected).

- `app/api/analyze/route.ts:8-21`:

```ts
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const username = formData.get("username") as string;

    if (!file || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const pgnText = await file.text();
```

No `instanceof File` check (a plain string form field passes `!file`), no size limit. The only extension check is client-side (`components/chess-analyzer.tsx:134`).

- `app/api/fetch-games/route.ts:56-74` — `username` read from query (line 59), checked for presence only (line 63), then:

```ts
const url = new URL(`https://lichess.org/api/games/user/${username}`);
```

- `app/api/fetch-games/route.ts:92-100` — on upstream error: `throw new Error(\`Lichess API error: ${response.status} ${errorText}\`)`; the catch at lines 183-189 returns `error.message` (including the upstream body) verbatim with status 500.
- `app/api/fetch-games/route.ts:73` — comment "removed max limit"; no `max` param is sent, so the whole history is buffered via `await response.text()` (line 103) and rebuilt into one giant string.
- `components/chess-analyzer.tsx:166`:

```ts
const response = await fetch(`/api/fetch-games?username=${username}&startYear=${startYear}&endYear=${endYear}`);
```

- Existing test pattern for the analyze route: `app/api/analyze/__tests__/route.test.ts` (mocks `formData`, asserts `NextResponse.json` calls).
- Lichess username rules: 2–30 chars, letters/digits/underscore/hyphen (`^[a-zA-Z0-9_-]{2,30}$`).

## Commands you will need

| Purpose   | Command                    | Expected on success |
|-----------|----------------------------|---------------------|
| Install   | `pnpm install`             | exit 0              |
| Tests     | `pnpm test`                | all pass            |
| Typecheck | `pnpm typecheck`           | exit 0              |
| Build     | `pnpm build`               | exit 0              |
| Manual    | `pnpm dev` + curl checks in steps | status codes as stated |

## Scope

**In scope** (the only files you should modify):
- `app/api/analyze/route.ts`
- `app/api/fetch-games/route.ts`
- `components/chess-analyzer.tsx` (ONLY the fetch-URL construction at line ~166 and the two error-message displays described in step 5)
- `app/api/analyze/__tests__/route.test.ts` (new cases)

**Out of scope** (do NOT touch):
- Rate limiting / auth middleware — worthwhile but a separate decision (needs a store or Vercel config); note it, don't build it.
- `lib/` — no parser/analyzer changes here.
- The dead `getTimeControl`/`formatTimeControl` functions in fetch-games (plan 008 deletes them).
- Streaming the Lichess NDJSON response — bigger refactor, deferred to the direction spike on the fetch flow.

## Git workflow

- Branch: `advisor/006-api-input-hardening`
- Commit per route, short lowercase messages.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Validate the upload server-side

In `app/api/analyze/route.ts`, after reading the form fields, replace the presence check with:

```ts
const MAX_PGN_BYTES = 20 * 1024 * 1024; // 20MB ≈ tens of thousands of games

if (!(file instanceof File) || typeof username !== "string" || !username.trim()) {
  return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
}
if (file.size > MAX_PGN_BYTES) {
  return NextResponse.json({ error: "PGN file too large (max 20MB)" }, { status: 413 });
}
```

Remove the `as File` / `as string` casts (use `formData.get(...)` results as `FormDataEntryValue | null` and narrow with the checks above).

**Verify**: `pnpm typecheck` → exit 0; `pnpm test` → existing analyze-route tests still pass (their mocks return objects with a `.text()` method — if the `instanceof File` check breaks them, update the mocks to `new File(["..."], "t.pgn")`; jsdom provides `File`).

### Step 2: Validate and encode the username + years in fetch-games

In `app/api/fetch-games/route.ts`, after the presence check (line ~63), add:

```ts
if (!/^[a-zA-Z0-9_-]{2,30}$/.test(username)) {
    return new Response('Invalid username', { status: 400 });
}
```

Change the URL construction to encode defensively even though the regex already constrains it:

```ts
const url = new URL(`https://lichess.org/api/games/user/${encodeURIComponent(username)}`);
```

(Year validation was added by plan 005 step 4 — verify it is present; if not, STOP.)

**Verify**: `pnpm dev`, then:
- `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/fetch-games?username=..%2F..%2Fadmin"` → `400`
- `curl -s -o /dev/null -w "%{http_code}\n" "http://localhost:3000/api/fetch-games?username=a"` → `400` (too short)

### Step 3: Cap the upstream fetch

At the URL-params block (lines ~75-80), add:

```ts
url.searchParams.append('max', '10000');
```

with a one-line comment: `// bound memory: 10k games ≈ tens of MB of NDJSON; raise deliberately if users hit it`.

**Verify**: `grep -n "max', '10000'" app/api/fetch-games/route.ts` → 1 match.

### Step 4: Stop echoing upstream errors to clients

In `app/api/fetch-games/route.ts`:
1. In the `!response.ok` branch (lines ~92-100), keep the detailed `console.error`, but throw a **typed sentinel** instead of the upstream text. Simplest: return directly from the branch:

```ts
if (!response.ok) {
    console.error('Lichess API error:', { status: response.status, statusText: response.statusText, error: await response.text() });
    if (response.status === 404) return new Response('Lichess user not found', { status: 404 });
    if (response.status === 429) return new Response('Lichess rate limit hit — try again shortly', { status: 429 });
    return new Response('Failed to fetch games from Lichess', { status: 502 });
}
```

2. In the outer catch (lines ~183-189), return a fixed message:

```ts
return new Response('Failed to fetch games from Lichess', { status: 500 });
```

(keep the `console.error` above it). Also delete the `console.log('Fetching from URL:', url.toString())` at line ~82 (leaks the constructed URL into logs with no value) — keep the other progress logs if you wish.

**Verify**: `grep -n "error.message\|errorText}" app/api/fetch-games/route.ts` → no matches in response bodies.

### Step 5: Build the client query safely and surface useful errors

In `components/chess-analyzer.tsx` (`handleFetchGames`, line ~166):

```ts
const params = new URLSearchParams({ username: username.trim(), startYear, endYear });
const response = await fetch(`/api/fetch-games?${params}`);
```

And improve the catch (lines ~178-180): the route now returns short, safe, user-appropriate messages, so display them:

```ts
if (!response.ok) {
    throw new Error(await response.text());
}
...
} catch (err) {
    setError(err instanceof Error && err.message ? err.message : "Failed to fetch games from Lichess. Please upload your PGN file instead.");
}
```

**Verify**: `pnpm typecheck && pnpm build` → exit 0. Manual: dev server, enter username `nonexistent-user-xyz-123` → UI shows "Lichess user not found" (or the fallback message), not a raw dump.

### Step 6: Tests + full gate

Add to `app/api/analyze/__tests__/route.test.ts` (model on the existing cases):
- oversize file → 413 (mock a `File`-like with `size: 21 * 1024 * 1024`; if the route uses `instanceof File`, construct `new File([""], "big.pgn")` and `Object.defineProperty(file, 'size', { value: 21*1024*1024 })`).
- non-File `file` field (plain string) → 400.

**Verify**: `pnpm test && pnpm typecheck && pnpm lint && pnpm build` → all exit 0.

## Test plan

- New: the two analyze-route cases in step 6, in the existing test file, following its mock-request pattern.
- fetch-games has no test harness (it depends on global `fetch` to Lichess); its gates are the curl checks in steps 2 and 5. Writing a mocked-fetch suite for it is deliberately deferred (noted in maintenance).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -n "as File\|as string" app/api/analyze/route.ts` → no matches
- [ ] curl traversal + short-username checks return 400 (dev server)
- [ ] `grep -n "encodeURIComponent(username)" app/api/fetch-games/route.ts` → 1 match
- [ ] `grep -n "URLSearchParams" components/chess-analyzer.tsx` → ≥1 match
- [ ] `pnpm test` exits 0 including the 2 new cases
- [ ] `pnpm typecheck && pnpm build` exit 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Plan 005's year validation is absent from fetch-games (dependency not met).
- `instanceof File` fails at runtime in the route (Next's formData polyfill returning a different class) — report the actual constructor name; fall back to duck-typing (`typeof file?.arrayBuffer === "function" && typeof file?.size === "number"`) only if instructed.
- The existing analyze-route tests cannot be made to pass without weakening the new checks.

## Maintenance notes

- Deferred deliberately: rate limiting on both routes (needs infra choice), streaming the NDJSON response (direction spike), a mocked-fetch test suite for fetch-games.
- The `max=10000` cap is a product decision with a safe default — if a power user reports truncated history, raise it consciously rather than removing it.
- Reviewer should scrutinize: that the client still falls back to the manual-upload suggestion when the route returns 5xx.
