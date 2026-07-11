# Lichess Year in Review

A web app that turns your Lichess game history into a year-in-review summary:
results, streaks, openings, monthly performance, rating progression, and
head-to-head stats against your opponents. Live at
[lichess-review.vercel.app](https://lichess-review.vercel.app/).

## Using the site

Enter a Lichess username and a year range, then click **Analyze Games** — the
app fetches your games directly from Lichess. If you'd rather not fetch
live, upload a PGN exported from
[`https://lichess.org/@/<username>/download`](https://lichess.org/@/username/download)
instead.

Once analyzed, your stats are shown across five tabs: **Overview**,
**Openings**, **Rating** progression, monthly **Performance**, and
**Matchups** (head-to-head). Click **Share Stats** to generate a downloadable
summary card you can post to X/Twitter.

## Development

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app. Start
editing the input card and tab shell in `components/chess-analyzer.tsx`, or
a specific chart in `components/charts/`; changes auto-reload.

pnpm is the pinned package manager (see the `packageManager` field in
`package.json`) — use it rather than npm/yarn/bun to keep the lockfile
consistent. Before committing, run the same gates CI runs:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## How it works

- `lib/pgn-parser.ts` parses PGN text (from an upload or the Lichess proxy)
  into per-game records.
- `lib/analyzer.ts` aggregates those records into the stats shown in the UI.
- `app/api/fetch-games/route.ts` proxies the Lichess games API for a
  username/year-range query; `app/api/analyze/route.ts` runs the same
  analysis over an uploaded PGN file.

## Roadmap

Ideas not yet built:

- Engine-based blunder/accuracy metrics
- Puzzle-solving stats
- Opening study recommendations based on your per-opening performance
- Badges/achievements for milestones
- Comparing your stats with friends

## Legacy CLI

The original Python command-line version lives in
[`scripts/legacy/`](scripts/legacy/) for reference. It's unmaintained — use
the web app above.

## Contributors

<!-- readme: collaborators,contributors -start -->
<table>
	<tbody>
		<tr>
            <td align="center">
                <a href="https://github.com/adysingh5711">
                    <img src="https://avatars.githubusercontent.com/u/124086655?v=4" width="100;" alt="adysingh5711"/>
                    <br />
                    <sub><b>Aditya Singh</b></sub>
                </a>
            </td>
		</tr>
	<tbody>
</table>
<!-- readme: collaborators,contributors -end -->

Contributions are welcome!

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.

## Acknowledgments

Thank you to all contributors who make this project possible. Your support helps foster a vibrant chess community!

---

Feel free to explore, contribute, and enjoy your journey through chess with LichessYearInReview!
