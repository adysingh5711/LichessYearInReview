/// <reference types="jest" />

import { NextRequest } from "next/server";
import { POST } from "../route";
import { parseGame } from "@/lib/pgn-parser";
import { analyzeGames } from "@/lib/analyzer";
import type { AnalysisStats, GameStats } from "@/types/chess";
import { NextResponse } from "next/server";

// Mock the parseGame and analyzeGames functions
jest.mock("@/lib/pgn-parser", () => ({
    parseGame: jest.fn(),
}));
jest.mock("@/lib/analyzer", () => ({
    analyzeGames: jest.fn(),
}));
jest.mock("next/server", () => ({
    NextResponse: {
        json: jest.fn((data, init) => ({
            ...init,
            json: () => Promise.resolve(data),
        })),
    },
}));

const mockParseGame = parseGame as jest.MockedFunction<typeof parseGame>;
const mockAnalyzeGames = analyzeGames as jest.MockedFunction<typeof analyzeGames>;

describe("POST /api/analyze", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("should return 400 if file or username is missing", async () => {
        // Mock request with missing file
        const missingFileReq = {
            formData: jest.fn().mockResolvedValue({
                get: (key: string) => (key === "username" ? "testUser" : null),
            }),
        } as unknown as NextRequest;

        await POST(missingFileReq);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "Missing required fields" },
            { status: 400 }
        );

        // Mock request with missing username
        const missingUsernameReq = {
            formData: jest.fn().mockResolvedValue({
                get: (key: string) =>
                    key === "file" ? { text: () => Promise.resolve("pgn") } : null,
            }),
        } as unknown as NextRequest;

        await POST(missingUsernameReq);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "Missing required fields" },
            { status: 400 }
        );
    });

    it("should return 400 if no valid games are found", async () => {
        mockParseGame.mockReturnValue([]); // Simulate empty games array

        const req = {
            formData: jest.fn().mockResolvedValue({
                get: (key: string) => {
                    if (key === "file") return { text: () => Promise.resolve("invalid") };
                    if (key === "username") return "testUser";
                    return null;
                },
            }),
        } as unknown as NextRequest;

        await POST(req);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "No valid games found in PGN file" },
            { status: 400 }
        );
        expect(mockParseGame).toHaveBeenCalledWith("invalid");
    });

    it("should return analysis stats for valid requests", async () => {
        const mockGames = [{} as GameStats];
        const mockAnalysis: AnalysisStats = {
            results: { wins: 1, losses: 0, draws: 0 },
            gameTypes: {},
            streaks: { winStreak: 0, lossStreak: 0, drawStreak: 0 },
            gameLengths: [],
            openings: [],
            monthlyPerformance: [],
            ratingProgression: [],
            headToHead: [],
            resultDistribution: {
                wins: { average: 0, shortest: 0, longest: 0 },
                losses: { average: 0, shortest: 0, longest: 0 },
                draws: { average: 0, shortest: 0, longest: 0 },
            },
            colorStats: {
                White: { wins: 0, losses: 0, draws: 0 },
                Black: { wins: 0, losses: 0, draws: 0 },
            },
        };

        mockParseGame.mockReturnValue(mockGames);
        mockAnalyzeGames.mockReturnValue(mockAnalysis);

        const req = {
            formData: jest.fn().mockResolvedValue({
                get: (key: string) => {
                    if (key === "file")
                        return { text: () => Promise.resolve("valid pgn") };
                    if (key === "username") return "testUser";
                    return null;
                },
            }),
        } as unknown as NextRequest;

        await POST(req);
        expect(NextResponse.json).toHaveBeenCalledWith(mockAnalysis);
        expect(mockAnalyzeGames).toHaveBeenCalledWith(mockGames, "testUser");
    });

    it("should return 500 on server errors", async () => {
        mockParseGame.mockImplementation(() => {
            throw new Error("Test error");
        });

        const req = {
            formData: jest.fn().mockResolvedValue({
                get: (key: string) => {
                    if (key === "file")
                        return { text: () => Promise.resolve("error pgn") };
                    if (key === "username") return "testUser";
                    return null;
                },
            }),
        } as unknown as NextRequest;

        await POST(req);
        expect(NextResponse.json).toHaveBeenCalledWith(
            { error: "Failed to analyze games" },
            { status: 500 }
        );
    });
});