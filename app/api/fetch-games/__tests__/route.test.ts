/// <reference types="jest" />

import { NextRequest } from "next/server";
import { GET } from "../route";

const jsonResponse = (body: unknown, init?: { status?: number }) =>
    Promise.resolve({
        ok: !init?.status || init.status < 400,
        status: init?.status ?? 200,
        json: () => Promise.resolve(body),
        text: () => Promise.resolve(JSON.stringify(body)),
    } as Response);

const makeReq = (params: Record<string, string>) =>
    ({ url: `https://example.com/api/fetch-games?${new URLSearchParams(params)}` } as NextRequest);

describe("GET /api/fetch-games (chess.com)", () => {
    const originalFetch = global.fetch;
    let fetchMock: jest.Mock;

    beforeEach(() => {
        fetchMock = jest.fn();
        global.fetch = fetchMock as unknown as typeof fetch;
    });

    afterEach(() => {
        global.fetch = originalFetch;
    });

    it("only fetches archive months that fall within the requested range", async () => {
        fetchMock.mockImplementation((url: string) => {
            if (url.endsWith("/archives")) {
                return jsonResponse({
                    archives: [
                        "https://api.chess.com/pub/player/bob/games/2023/12",
                        "https://api.chess.com/pub/player/bob/games/2024/01",
                        "https://api.chess.com/pub/player/bob/games/2024/02",
                        "https://api.chess.com/pub/player/bob/games/2024/06",
                    ],
                });
            }
            if (url.includes("/2024/01")) {
                return jsonResponse({ games: [{ pgn: "[White \"bob\"]\n1. e4 *", rules: "chess" }] });
            }
            if (url.includes("/2024/02")) {
                return jsonResponse({ games: [{ pgn: "[White \"bob\"]\n1. d4 *", rules: "chess" }] });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        const res = await GET(makeReq({ username: "bob", platform: "chess.com", start: "2024-01", end: "2024-02" }));
        const text = await res.text();

        expect(text).toContain("1. e4 *");
        expect(text).toContain("1. d4 *");
        // Out-of-range months (2023/12, 2024/06) must never be requested.
        expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/2023/12"), expect.anything());
        expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining("/2024/06"), expect.anything());
        expect(fetchMock).toHaveBeenCalledTimes(3); // 1 archives call + 2 month calls
    });

    it("filters out non-standard variants", async () => {
        fetchMock.mockImplementation((url: string) => {
            if (url.endsWith("/archives")) {
                return jsonResponse({ archives: ["https://api.chess.com/pub/player/bob/games/2024/01"] });
            }
            return jsonResponse({
                games: [
                    { pgn: "[White \"bob\"]\n1. e4 *", rules: "chess" },
                    { pgn: "[White \"bob\"]\n1. e4 *", rules: "chess960" },
                ],
            });
        });

        const res = await GET(makeReq({ username: "bob", platform: "chess.com", start: "2024-01", end: "2024-01" }));
        const text = await res.text();

        expect(text.split("\n\n").filter(Boolean)).toHaveLength(1);
    });

    it("returns 404 when the user has no archives", async () => {
        fetchMock.mockImplementation(() =>
            jsonResponse({ error: "not found" }, { status: 404 })
        );

        const res = await GET(makeReq({ username: "nouser", platform: "chess.com", start: "2024-01", end: "2024-01" }));
        expect(res.status).toBe(404);
    });

    it("returns 404 when no archives fall in the requested range", async () => {
        fetchMock.mockImplementation((url: string) => {
            if (url.endsWith("/archives")) {
                return jsonResponse({ archives: ["https://api.chess.com/pub/player/bob/games/2020/01"] });
            }
            throw new Error(`Unexpected fetch: ${url}`);
        });

        const res = await GET(makeReq({ username: "bob", platform: "chess.com", start: "2024-01", end: "2024-01" }));
        expect(res.status).toBe(404);
    });

    it("rejects malformed month parameters", async () => {
        const res = await GET(makeReq({ username: "bob", platform: "chess.com", start: "2024-1", end: "2024-01" }));
        expect(res.status).toBe(400);
    });
});
