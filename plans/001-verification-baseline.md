# Plan 001: Establish a verification baseline (CI, typecheck script, lint rules, single lockfile)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- package.json eslint.config.mjs .github/workflows/ package-lock.json app/api/analyze/__tests__/route.test.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

This repo has build/lint/test scripts but nothing runs them automatically: the only GitHub workflow updates the README contributors list. There is no `typecheck` script, and the two most useful ESLint rules for catching dead code (`@typescript-eslint/no-unused-vars`, `prefer-const`) are disabled globally. Git history contains the commit message "cursor hallucinated and while updating share card it degraded the main page" — exactly the class of regression a CI gate prevents. Every other plan in `plans/` uses the commands this plan establishes as its verification gates, so this plan must land first.

## Current state

- `package.json:5-12` — scripts are `dev`, `build`, `start`, `lint` (`next lint`), `test` (`jest`), `test:watch`, `test:coverage`. No `typecheck`. No `packageManager` field.
- Repo root contains **both** `package-lock.json` (npm) and `pnpm-lock.yaml` (pnpm). `package.json:65-76` has a `pnpm` config block, so pnpm is the intended manager; the npm lockfile is drift waiting to happen.
- `.github/workflows/` contains only `update-contributors.yml` (a contributors-list README updater). No CI.
- `eslint.config.mjs:12-20`:

```js
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": "off", // Disable the unused-vars rule
      "prefer-const": "off",                     // Disable the prefer-const rule
    },
  },
];
```

- `tsconfig.json` has `"strict": true` and its `include` covers `**/*.ts` — so test files are typechecked too.
- Known pre-existing type error you will likely hit: `app/api/analyze/__tests__/route.test.ts:86-104` declares `const mockAnalysis: AnalysisStats = { ... }` but omits the `peakRatings` field, which `types/chess.ts:54` declares as required (`peakRatings: Record<string, number>`). The fix is adding `peakRatings: {},` to that object literal.
- The stack: Next.js 15 (app router), React 19, TypeScript 5, Jest 29 via ts-jest.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `pnpm install`                   | exit 0              |
| Lint      | `pnpm lint`                      | exit 0 (warnings allowed) |
| Tests     | `pnpm test`                      | 1 suite, 4 tests pass |
| Build     | `pnpm build`                     | "Compiled successfully", exit 0 |
| Typecheck | `pnpm typecheck` (created here)  | exit 0              |

## Scope

**In scope** (the only files you should modify/create/delete):
- `package.json` (add `typecheck` script + `packageManager` field)
- `package-lock.json` (delete)
- `eslint.config.mjs` (rules `"off"` → `"warn"`)
- `.github/workflows/ci.yml` (create)
- `app/api/analyze/__tests__/route.test.ts` (only the one-line `peakRatings: {}` fixture fix, only if typecheck flags it)
- `pnpm-lock.yaml` (only as a side effect of `pnpm install`)

**Out of scope** (do NOT touch, even though they look related):
- `.github/workflows/update-contributors.yml` — working as intended.
- Any source file under `app/`, `lib/`, `components/` (other than the one test fixture line above). Lint warnings you surface here get fixed in plan 008, not now.
- `jest.config.ts`, `tsconfig.json`.

## Git workflow

- Branch: `advisor/001-verification-baseline`
- Commit style: short lowercase summaries, matching repo history (e.g. "added jest", "increased timeout in puppeteer").
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Install dependencies and record the pnpm version

`node_modules` may be absent. Run `pnpm install`, then `pnpm --version` and note the output (call it `<PNPM_VERSION>`).

**Verify**: `pnpm install` → exit 0; `pnpm --version` prints a version like `9.x.x` or `10.x.x`.

### Step 2: Single lockfile + packageManager pin

Delete `package-lock.json`. In `package.json`, add a top-level field (sibling of `"name"`):

```json
"packageManager": "pnpm@<PNPM_VERSION>",
```

**Verify**: `ls package-lock.json` → "No such file or directory"; `pnpm install --frozen-lockfile` → exit 0.

### Step 3: Add the typecheck script

In `package.json` scripts, add:

```json
"typecheck": "tsc --noEmit",
```

Run `pnpm typecheck`. Expected: **one** error in `app/api/analyze/__tests__/route.test.ts` about `peakRatings` missing from the `AnalysisStats` literal. Fix it by adding `peakRatings: {},` as the last property of the `mockAnalysis` object (after the `colorStats` block ending near line 103). Re-run.

**Verify**: `pnpm typecheck` → exit 0, no errors.

### Step 4: Re-enable lint rules as warnings

In `eslint.config.mjs`, change both `"off"` values to `"warn"`:

```js
"@typescript-eslint/no-unused-vars": "warn",
"prefer-const": "warn",
```

**Verify**: `pnpm lint` → exit 0. Warnings about unused vars in `components/chess-analyzer.tsx` and `app/api/fetch-games/route.ts` are expected (plan 008 removes that dead code) — do not fix them here.

### Step 5: Create the CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
```

(`pnpm/action-setup@v4` reads the version from the `packageManager` field added in step 2.)

**Verify**: `npx --yes yaml-lint .github/workflows/ci.yml` if available, otherwise `node -e "require('js-yaml')"` is NOT required — a plain read-through is fine; the machine gate is step 6.

### Step 6: Full local gate

Run the complete sequence CI will run.

**Verify**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0; jest reports 1 suite / 4 tests passed; build prints "Compiled successfully".

## Test plan

No new tests. The existing suite (`app/api/analyze/__tests__/route.test.ts`, 4 tests) must still pass; the only change to it is the `peakRatings: {}` fixture line.

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm lint` exits 0
- [ ] `pnpm test` exits 0 with 4 tests passing
- [ ] `pnpm build` exits 0
- [ ] `package-lock.json` does not exist; `package.json` contains a `packageManager` field
- [ ] `.github/workflows/ci.yml` exists with lint/typecheck/test/build steps
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `pnpm typecheck` reports errors in files other than `app/api/analyze/__tests__/route.test.ts`, or more than 3 errors total — the codebase has drifted or has deeper type problems; report the full error list.
- `pnpm build` fails for any reason other than a type error you were told to fix here.
- `pnpm install` cannot resolve the lockfile (network/registry issues) after one retry.

## Maintenance notes

- Every subsequent plan (002–011) uses `pnpm typecheck` / `pnpm test` / `pnpm build` as gates; if CI is later moved or renamed, update those plans' command tables.
- The two lint rules are `"warn"`, not `"error"`, because pre-existing dead code (removed in plan 008) would otherwise fail CI. After plan 008 lands, consider promoting them to `"error"`.
- Reviewer should scrutinize: the `peakRatings` fixture fix is behavior-neutral (test still asserts the same mock round-trip).
