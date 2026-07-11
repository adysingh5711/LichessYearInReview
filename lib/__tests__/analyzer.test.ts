/// <reference types="jest" />
import { analyzeGames } from "@/lib/analyzer";
import { GameStats } from "@/types/chess";

const game = (overrides: Partial<GameStats>): GameStats => ({
  timeControl: "300+0",
  result: "1-0",
  white: "TestUser",
  black: "Opponent1",
  opening: "Sicilian Defense (B20)",
  date: new Date(Date.UTC(2024, 0, 15)),
  whiteElo: "1500",
  blackElo: "1480",
  whiteRatingDiff: "8",
  blackRatingDiff: "-8",
  moves: ["e4", "c5", "Nf3"],
  ...overrides,
});

const fixture: GameStats[] = [
  // 1. Win as White — Jan 2024
  game({}),
  // 2. Win as Black — Jan 2024
  game({
    result: "0-1",
    white: "Opponent1",
    black: "TestUser",
    date: new Date(Date.UTC(2024, 0, 20)),
    moves: ["e4", "e5", "Nf3", "Nc6", "Bb5"],
  }),
  // 3. Loss as White — Feb 2024, different opening
  game({
    result: "0-1",
    date: new Date(Date.UTC(2024, 1, 5)),
    opening: "Queen's Gambit (D06)",
  }),
  // 4. Draw as Black — Feb 2024
  game({
    result: "1/2-1/2",
    white: "Opponent2",
    black: "TestUser",
    date: new Date(Date.UTC(2024, 1, 10)),
  }),
  // 5. Win as White vs Anonymous — Feb 2024
  game({
    black: "Anonymous",
    date: new Date(Date.UTC(2024, 1, 12)),
  }),
  // 6. Aborted game — Feb 2024
  game({
    result: "*",
    date: new Date(Date.UTC(2024, 1, 14)),
  }),
];

describe("analyzeGames", () => {
  it("computes results", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.results).toEqual({ wins: 3, losses: 1, draws: 1 });
  });

  it("computes colorStats", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.colorStats).toEqual({
      White: { wins: 2, losses: 1, draws: 0 },
      Black: { wins: 1, losses: 0, draws: 1 },
    });
  });

  it("computes the max win streak", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.streaks.winStreak).toBe(2);
  });

  it("categorizes game types", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.gameTypes).toEqual({ Blitz: 6 });
  });

  it("computes monthlyPerformance", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.monthlyPerformance).toHaveLength(2);
    const [jan, feb] = stats.monthlyPerformance;
    expect(jan.month).toBe("2024-01");
    expect(jan.games).toBe(2);
    expect(jan.wins).toBe(2);
    expect(jan.winRate).toBe(100);
    expect(feb.month).toBe("2024-02");
    expect(feb.games).toBe(4);
    expect(feb.wins).toBe(1);
    expect(feb.winRate).toBe(25);
    // ratingChange accumulates for every game with a date, not just wins.
    expect(jan.ratingChange).toBe(0); // +8 (game1) + -8 (game2)
    expect(feb.ratingChange).toBe(16); // +8 (game3) - 8 (game4) + 8 (game5) + 8 (game6, aborted)
  });

  it("does not let a non-numeric ratingDiff poison ratingChange with NaN", () => {
    const stats = analyzeGames(
      [game({ whiteRatingDiff: "?", date: new Date(Date.UTC(2024, 5, 1)) })],
      "TestUser"
    );
    expect(stats.monthlyPerformance[0].ratingChange).toBe(0);
    expect(Number.isNaN(stats.monthlyPerformance[0].ratingChange)).toBe(false);
  });

  it("nets a win and a loss in the same month to zero rating change", () => {
    const stats = analyzeGames(
      [
        game({ date: new Date(Date.UTC(2024, 5, 1)) }), // win as White, whiteRatingDiff +8
        game({
          result: "0-1",
          whiteRatingDiff: "-8",
          date: new Date(Date.UTC(2024, 5, 2)),
        }), // loss as White, whiteRatingDiff -8
      ],
      "TestUser"
    );
    expect(stats.monthlyPerformance[0].ratingChange).toBe(0);
  });

  it("computes openings sorted by count descending", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.openings[0].name).toBe("Sicilian Defense (B20)");
    expect(stats.openings[0].count).toBe(5);
    expect(stats.openings[0].wins).toBe(3);
    expect(stats.openings[0].draws).toBe(1);
    // aborted ("*") games count toward the opening's total but not wins/losses/draws
    expect(stats.openings[0].losses).toBe(0);
    expect(stats.openings[1].name).toBe("Queen's Gambit (D06)");
    expect(stats.openings[1].count).toBe(1);
    expect(stats.openings[1].losses).toBe(1);
  });

  it("computes headToHead excluding Anonymous", () => {
    const stats = analyzeGames(fixture, "TestUser");
    const opponents = stats.headToHead.map((h) => h.opponent);
    expect(opponents).toContain("Opponent1");
    expect(opponents).toContain("Opponent2");
    expect(opponents).not.toContain("Anonymous");

    const opponent1 = stats.headToHead.find((h) => h.opponent === "Opponent1")!;
    expect(opponent1.wins).toBe(2);
    // aborted ("*") games do not count as a loss in head-to-head
    expect(opponent1.losses).toBe(1);
    expect(opponent1.draws).toBe(0);
    expect(opponent1.winRate).toBeCloseTo(66.667, 2);

    const opponent2 = stats.headToHead.find((h) => h.opponent === "Opponent2")!;
    expect(opponent2.wins).toBe(0);
    expect(opponent2.losses).toBe(0);
    expect(opponent2.draws).toBe(1);
  });

  it("computes resultDistribution with distinct win lengths", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.resultDistribution.wins.shortest).toBe(3);
    expect(stats.resultDistribution.wins.longest).toBe(5);
    expect(stats.resultDistribution.wins.average).toBeCloseTo(11 / 3);
  });

  it("computes peakRatings per time control", () => {
    const stats = analyzeGames(fixture, "TestUser");
    expect(stats.peakRatings).toEqual({ Blitz: 1500 });
  });

  it("returns a zeroed structure with no NaN/Infinity for empty input", () => {
    const stats = analyzeGames([], "TestUser");
    expect(stats.results).toEqual({ wins: 0, losses: 0, draws: 0 });
    expect(stats.resultDistribution.wins.shortest).toBe(0);
    expect(stats.resultDistribution.wins.longest).toBe(0);
    expect(stats.resultDistribution.wins.average).toBe(0);
  });

  it("matches usernames case-insensitively and trims whitespace", () => {
    expect(analyzeGames(fixture, "testuser")).toEqual(analyzeGames(fixture, "TestUser"));
    expect(analyzeGames(fixture, " TestUser ")).toEqual(analyzeGames(fixture, "TestUser"));
  });
});
