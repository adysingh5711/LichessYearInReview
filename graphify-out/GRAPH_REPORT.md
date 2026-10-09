# Graph Report - LichessYearInReview  (2026-10-10)

## Corpus Check
- Corpus is ~47,337 words - fits in a single context window. You may not need a graph.

## Summary
- 324 nodes · 529 edges · 25 communities (14 shown, 11 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Analyzer UI Components
- API Routes and Analyzer
- Jest Test Setup
- Game Fetch Routes
- TypeScript Config
- Runtime Dependencies
- Dev Dependencies
- shadcn Components Config
- Chart Tooltips
- Legacy Python Script
- Improve Skill Playbook
- NPM Scripts
- ESLint Config
- Landing Screenshot Design
- PostCSS Config
- Server Response
- Next Config
- Legacy Python CLI
- Contributors Workflow
- Daily Time Control Fix
- Month Range Picker
- Opening Name Derivation
- pnpm Workspace

## God Nodes (most connected - your core abstractions)
1. `cn()` - 28 edges
2. `ChessAnalyzer()` - 24 edges
3. `compilerOptions` - 17 edges
4. `Implementation Plans Index` - 11 edges
5. `react` - 10 edges
6. `Plan 005: Stats-math bug fixes` - 10 edges
7. `themedBrushProps()` - 9 edges
8. `scripts` - 9 edges
9. `Button` - 8 edges
10. `AnalysisStats` - 8 edges

## Surprising Connections (you probably didn't know these)
- `Plan: Chess.com support + month range picker` --semantically_similar_to--> `Handoff plan template`  [INFERRED] [semantically similar]
  plan-todo.md → .agents/skills/improve/references/plan-template.md
- `CI gates (lint, typecheck, test, build)` --semantically_similar_to--> `CI workflow`  [INFERRED] [semantically similar]
  README.md → .github/workflows/ci.yml
- `Home()` --calls--> `ChessAnalyzer()`  [EXTRACTED]
  app/page.tsx → components/chess-analyzer.tsx
- `ChessAnalyzer()` --calls--> `analyzeGames()`  [EXTRACTED]
  components/chess-analyzer.tsx → lib/analyzer.ts
- `ChessAnalyzer()` --calls--> `parseGame()`  [EXTRACTED]
  components/chess-analyzer.tsx → lib/pgn-parser.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Plans editing chess-analyzer/fetch-games in sequence** — plans_005_stats_math_fixes, plans_006_api_input_hardening, plans_008_dead_code_and_quick_perf, plans_010_split_chess_analyzer [EXTRACTED 1.00]
- **Game input form (username, years, analyze, PGN)** — public_lichess_review_username_input, public_lichess_review_year_range_selectors, public_lichess_review_analyze_games_button, public_lichess_review_pgn_upload [EXTRACTED 1.00]
- **Improve skill document set** — agents_skills_improve_skill_improve_skill, agents_skills_improve_references_audit_playbook_audit_playbook, agents_skills_improve_references_closing_the_loop_closing_the_loop, agents_skills_improve_references_plan_template_plan_template [EXTRACTED 1.00]
- **Fetch, parse, analyze pipeline** — app_api_fetch_games_route, lib_pgn_parser, lib_analyzer [EXTRACTED 1.00]
- **Analyzer correctness fixes gated by characterization tests** — plans_002_analyzer_parser_tests, plans_004_case_insensitive_username, plans_005_stats_math_fixes, plans_009_fast_pgn_parsing [EXTRACTED 1.00]

## Communities (25 total, 11 thin omitted)

### Community 0 - "Analyzer UI Components"
Cohesion: 0.09
Nodes (43): Home(), ChessAnalyzer(), ModeToggle(), OverviewCards(), Tile(), ShareDialog(), ShareDialogProps, StatBlockProps (+35 more)

### Community 1 - "API Routes and Analyzer"
Cohesion: 0.09
Nodes (34): app/api/analyze/route.ts, app/api/og/route.tsx, app/api/screenshot/route.tsx (puppeteer), analyzeGames(), Bucket, BUCKETS, tally(), categorizeTimeControl() (+26 more)

### Community 2 - "Jest Test Setup"
Cohesion: 0.06
Nodes (29): config, { Request, Response }, name, packageManager, private, version, autoprefixer, eslint (+21 more)

### Community 3 - "Game Fetch Routes"
Cohesion: 0.08
Nodes (21): fetchChessCom(), fetchLichess(), GET(), maxDuration, geistMono, geistSans, image, metadata (+13 more)

### Community 4 - "TypeScript Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, forceConsistentCasingInFileNames, incremental, isolatedModules, jsx, lib (+12 more)

### Community 5 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (20): dependencies, class-variance-authority, clsx, html-to-image, lucide-react, motion, next, next-themes (+12 more)

### Community 6 - "Dev Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer, eslint, eslint-config-next, @eslint/eslintrc, identity-obj-proxy, jest, jest-environment-jsdom (+11 more)

### Community 7 - "shadcn Components Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 8 - "Chart Tooltips"
Cohesion: 0.32
Nodes (11): CustomMonthlyTooltip(), CustomTooltip(), RatingTooltip(), renderCustomizedTick(), HeadToHeadChart(), MonthlyPerformanceChart(), OpeningsChart(), RatingProgressionChart() (+3 more)

### Community 9 - "Legacy Python Script"
Cohesion: 0.21
Nodes (6): analyze_games(), categorize_time_control(), display_stats(), get_rating_progression(), plot_monthly_performance(), plot_rating_progression()

### Community 10 - "Improve Skill Playbook"
Cohesion: 0.20
Nodes (7): Audit playbook, Closing the loop (execute, reconcile, issues), Handoff plan template, improve skill, Improve 4-phase workflow (recon, audit, vet, plan), Chess.com public API, Plan: Chess.com support + month range picker

### Community 11 - "NPM Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, start, test, test:coverage, test:watch (+1 more)

### Community 12 - "ESLint Config"
Cohesion: 0.25
Nodes (5): compat, __dirname, eslintConfig, __filename, @eslint/eslintrc

### Community 13 - "Landing Screenshot Design"
Cohesion: 0.32
Nodes (7): Lichess Review Landing Screenshot, Analyze Games gradient button, Chess Game Analysis gradient title, GitHub link and dark mode toggle, Choose PGN file upload (alternative input), Lichess Username input, Year range selectors (2025 to 2025)

## Knowledge Gaps
- **144 isolated node(s):** `NextResponse`, `maxDuration`, `geistSans`, `geistMono`, `image` (+139 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 171 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Runtime Dependencies` to `Jest Test Setup`?**
  _High betweenness centrality (0.082) - this node is a cross-community bridge._
- **What connects `NextResponse`, `maxDuration`, `geistSans` to the rest of the system?**
  _144 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Analyzer UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.09273182957393483 - nodes in this community are weakly interconnected._
- **Why does `devDependencies` connect `Dev Dependencies` to `Jest Test Setup`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Should `API Routes and Analyzer` be split into smaller, more focused modules?**
  _Cohesion score 0.08780487804878048 - nodes in this community are weakly interconnected._
- **Why does `react` connect `Analyzer UI Components` to `Chart Tooltips`, `Jest Test Setup`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Should `Jest Test Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.062388591800356503 - nodes in this community are weakly interconnected._