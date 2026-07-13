# Legacy Python CLI

`lyir.py` is the original command-line version of Lichess Year in Review,
kept for reference. It is unmaintained: the authoritative analysis lives in
`lib/analyzer.ts` (the web app), and the two are known to disagree on
time-control boundaries. Known issues: crashes on `-`/`unlimited` time
controls and on PGNs with zero games.

Usage: `pip install -r requirements.txt && python lyir.py`
