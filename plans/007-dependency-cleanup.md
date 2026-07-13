# Plan 007: Dependency cleanup (one animation lib, drop dead/misplaced packages)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat a93da87..HEAD -- package.json components/ui/chart-magic-card.tsx components/ui/magic-card.tsx`
> Plans 001/003 legitimately touch `package.json` first (packageManager field,
> puppeteer removal). For anything else, compare the "Current state" excerpts
> against the live code; on a mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md
- **Category**: tech-debt
- **Planned at**: commit `a93da87`, 2026-07-11

## Why this matters

The app ships **two** copies of the same animation runtime: `framer-motion` and `motion` (its rebranded successor) are both in dependencies at the same major version, each imported by exactly one file for the identical hover-glow effect. Beyond that, `ajv` is depended on but imported nowhere, and three test/type-only packages (`jsdom`, `@jest/types`, `@types/chess.js`) sit in production `dependencies`. This is pure bundle and install weight with a mechanical fix.

## Current state

Verified at commit `a93da87`:

- `package.json` dependencies include: `"framer-motion": "^12.4.2"` (line 30), `"motion": "^12.4.0"` (line 34), `"ajv": "^8.17.1"` (line 26), `"jsdom": "^26.0.0"` (line 32), `"@jest/types": "^29.6.3"` (line 15), `"@types/chess.js": "^0.13.7"` (line 22).
- The only imports of either animation lib:
  - `components/ui/chart-magic-card.tsx:3` — `import { motion, useMotionTemplate, useMotionValue } from "framer-motion";`
  - `components/ui/magic-card.tsx:3` — `import { motion, useMotionTemplate, useMotionValue } from "motion/react";`
  (`motion/react` re-exports the framer-motion API; the two files are near-identical card components.)
- `ajv`: `grep -rn "ajv" app lib components types` → no matches (it is not imported anywhere; do not confuse with transitive use by other packages — those resolve their own copy).
- `jsdom`: referenced only as the string `testEnvironment: 'jsdom'` in `jest.config.ts:5`; the actual test environment package is `jest-environment-jsdom` (already in devDependencies). The `jsdom` entry itself is unused directly. **Keep it but move it to devDependencies** (harmless if some transitive test path resolves it) — or delete it if `pnpm test` passes without it; try delete first.
- `@jest/types`: imported only by `jest.config.ts:1` (`import type { Config } from '@jest/types';`) — dev-only.
- `@types/chess.js`: chess.js v1 ships its own types; this stub package targets v0.13. Likely removable — but plan 009 removes chess.js entirely, so here just move it to devDependencies and let 009 finish the job.

## Commands you will need

| Purpose   | Command          | Expected on success |
|-----------|------------------|---------------------|
| Install   | `pnpm install`   | exit 0              |
| Typecheck | `pnpm typecheck` | exit 0              |
| Tests     | `pnpm test`      | all pass            |
| Build     | `pnpm build`     | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `components/ui/chart-magic-card.tsx` (line 3 import only)
- `package.json`
- `pnpm-lock.yaml` (side effect of `pnpm install`)

**Out of scope** (do NOT touch):
- `components/ui/magic-card.tsx` — already on `motion/react`; do not merge the two card components here (that is a plan-010 concern if at all).
- `chess.js` itself — plan 009 removes it; removing it now breaks `lib/pgn-parser.ts`.
- `node-fetch`, `whatwg-fetch` — correctly in devDependencies (jest polyfills).

## Git workflow

- Branch: `advisor/007-dependency-cleanup`
- Commit style: short lowercase summaries.
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: One animation library

In `components/ui/chart-magic-card.tsx:3`, change:

```ts
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
```

to:

```ts
import { motion, useMotionTemplate, useMotionValue } from "motion/react";
```

Remove `"framer-motion"` from `package.json` dependencies.

**Verify**: `grep -rn "framer-motion" app lib components package.json` → no matches; `pnpm install && pnpm typecheck` → exit 0.

### Step 2: Delete ajv, relocate dev-only packages

In `package.json`:
- delete `"ajv"` from dependencies;
- move `"@jest/types"`, `"@types/chess.js"`, and `"jsdom"` from `dependencies` to `devDependencies` (try deleting `jsdom` outright first — see Current state; if `pnpm test` fails complaining about a missing `jsdom` module, restore it under devDependencies).

Run `pnpm install`.

**Verify**: `pnpm test` → all suites pass; `pnpm typecheck` → exit 0.

### Step 3: Full gate

**Verify**: `pnpm lint && pnpm typecheck && pnpm test && pnpm build` → all exit 0. Visual smoke (recommended, not gating): `pnpm dev`, load the page, hover the input card — the gradient hover-glow still tracks the cursor (that is the motion-lib behavior).

## Test plan

No new tests. The gates are the existing suite + build. The hover-glow smoke check covers the one behavioral surface (the import swap).

## Done criteria

Machine-checkable. ALL must hold:

- [ ] `grep -rn "framer-motion" . --include=package.json --include='*.ts' --include='*.tsx' | grep -v node_modules` → no matches
- [ ] `grep -n '"ajv"' package.json` → no matches
- [ ] `"jsdom"`, `"@jest/types"`, `"@types/chess.js"` absent from `dependencies` (moved or deleted)
- [ ] `pnpm test && pnpm typecheck && pnpm build` all exit 0
- [ ] `git status` shows no modified files outside the in-scope list
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `motion/react` does not export one of `motion`/`useMotionTemplate`/`useMotionValue` (typecheck error after step 1) — report; do not switch the other file to framer-motion instead.
- Removing `ajv` breaks `pnpm install` or `pnpm build` with a resolution error naming ajv from a **direct** source file (a transitive complaint from another package's peer range is a different situation — report that too, with the full error).

## Maintenance notes

- After plan 009 lands, `@types/chess.js` and `chess.js` should both be gone — check `package.json` then.
- The two magic-card components remain near-duplicates; consolidation is optional follow-up noted in plan 010's maintenance section.
