/// <reference types="jest" />
import { categorizeTimeControl, parsePGNDate, parseGame } from "@/lib/pgn-parser";

describe("categorizeTimeControl", () => {
  it.each([
    ["179+0", "Bullet"],
    ["180+0", "Blitz"],
    ["480+2", "Blitz"],
    ["481+0", "Rapid"],
    ["1500+0", "Rapid"],
    ["1501+0", "Classical"],
    ["unlimited", "Classical"],
    ["", "Classical"],
    ["-", "Classical"],
  ])("categorizes %s as %s", (input, expected) => {
    expect(categorizeTimeControl(input)).toBe(expected);
  });
});

describe("parsePGNDate", () => {
  it("parses a well-formed date", () => {
    const date = parsePGNDate("2024.03.09");
    expect(date.getUTCFullYear()).toBe(2024);
    expect(date.getUTCMonth()).toBe(2);
    expect(date.getUTCDate()).toBe(9);
  });

  it("falls back on placeholder dates", () => {
    const date = parsePGNDate("????.??.??");
    expect(date.getUTCFullYear()).toBe(2000);
    expect(date.getUTCMonth()).toBe(0);
    expect(date.getUTCDate()).toBe(1);
  });
});

const TWO_GAME_PGN = `[Event "Rated Blitz game"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]
[Date "2024.05.10"]
[TimeControl "300+0"]
[Opening "Sicilian Defense"]
[ECO "B20"]
[WhiteElo "1600"]
[BlackElo "1580"]

1. e4 c5 2. Nf3 1-0

[Event "Rated Blitz game"]
[White "Carol"]
[Black "Dave"]
[Result "0-1"]
[Date "2024.01.05"]
[TimeControl "300+0"]
[Opening "French Defense"]
[ECO "C00"]
[WhiteElo "1500"]
[BlackElo "1520"]

1. e4 e6 0-1`;

describe("parseGame", () => {
  it("parses multiple games, sorted ascending by date", () => {
    const games = parseGame(TWO_GAME_PGN);
    expect(games).toHaveLength(2);
    expect(games[0].white).toBe("Carol");
    expect(games[1].white).toBe("Alice");
  });

  it("counts one move per ply", () => {
    const games = parseGame(TWO_GAME_PGN);
    const aliceGame = games.find((g) => g.white === "Alice")!;
    expect(aliceGame.moveCount).toBe(3);
  });

  it("formats the opening as '<Opening> (<ECO>)'", () => {
    const games = parseGame(TWO_GAME_PGN);
    const aliceGame = games.find((g) => g.white === "Alice")!;
    expect(aliceGame.opening).toBe("Sicilian Defense (B20)");
  });

  it("skips a game missing the White header", () => {
    const missingWhite = TWO_GAME_PGN.replace('[White "Alice"]\n', "");
    const games = parseGame(missingWhite);
    expect(games).toHaveLength(1);
    expect(games[0].white).toBe("Carol");
  });

  it("returns an empty array for empty input", () => {
    expect(parseGame("")).toEqual([]);
  });

  it("returns an empty array for garbage input", () => {
    expect(parseGame("not a pgn")).toEqual([]);
  });
});

const singleGamePGN = (movetext: string) => `[Event "Rated Blitz game"]
[White "Alice"]
[Black "Bob"]
[Result "1-0"]

${movetext}`;

describe("parseGame movetext edge cases", () => {
  it("counts moves through lichess clock comments", () => {
    const pgn = singleGamePGN(
      "1. e4 { [%clk 0:03:00] } c5 { [%clk 0:03:00] } 2. Nf3 1-0"
    );
    expect(parseGame(pgn)[0].moveCount).toBe(3);
  });

  it("handles a black-to-move continuation", () => {
    const pgn = singleGamePGN("1... c5 2. Nf3 1-0");
    expect(parseGame(pgn)[0].moveCount).toBe(2);
  });

  it("excludes variations from the move count", () => {
    const pgn = singleGamePGN("1. e4 (1. d4 d5) c5 1-0");
    expect(parseGame(pgn)[0].moveCount).toBe(2);
  });

  it("counts a checkmate/promotion token as one ply", () => {
    const pgn = singleGamePGN("1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0");
    expect(parseGame(pgn)[0].moveCount).toBe(7);
  });

  it("does not count the result token as a move", () => {
    const pgn = singleGamePGN("1. e4 *");
    expect(parseGame(pgn)[0].moveCount).toBe(1);
  });
});
