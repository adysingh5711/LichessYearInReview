"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { useTheme } from "next-themes";

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Chart components
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
  Brush,
} from "recharts";

// Icons
import {
  FileInput,
  Upload,
  Trophy,
  User,
  Clock,
  Swords,
  Moon,
  Sun,
} from "lucide-react";

// Types
import { AnalysisStats } from "@/types/chess";
import type { TooltipProps } from "recharts";
import type {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="ml-2"
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

const ChessAnalyzer = () => {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [error, setError] = useState("");
  const [selectedGameType, setSelectedGameType] = useState<string>("All");

  useEffect(() => {
    if (stats) {
      // Find most played game type
      const gameTypes = Object.entries(stats.gameTypes);
      if (gameTypes.length > 0) {
        const mostPlayed = gameTypes.reduce((a, b) =>
          a[1] > b[1] ? a : b
        )[0];
        setSelectedGameType(mostPlayed);
      }
    }
  }, [stats]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.name.endsWith(".pgn")) {
      setFile(selectedFile);
      setError("");
    } else {
      setError("Please select a valid PGN file");
      setFile(null);
    }
  };

  const handleAnalyze = async () => {
    if (!username || !file) {
      setError("Please provide both username and PGN file");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("username", username);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const analysisResults = await response.json();
      setStats(analysisResults);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to analyze games. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const renderWinRateChart = (data: AnalysisStats["monthlyPerformance"]) => (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickFormatter={(month) => {
            const [year, m] = month.split("-");
            return new Date(parseInt(year), parseInt(m) - 1).toLocaleString(
              "default",
              { month: "short" }
            );
          }}
        />
        <YAxis yAxisId="left" domain={[0, 100]} />
        <YAxis yAxisId="right" orientation="right" />
        <Tooltip content={<CustomMonthlyTooltip />} />
        <Legend />
        <Bar
          yAxisId="right"
          dataKey="games"
          fill="#8884d8"
          name="Games Played"
        />
        <Bar yAxisId="right" dataKey="wins" fill="#82ca9d" name="Wins" />
        <Line
          yAxisId="left"
          dataKey="winRate"
          stroke="#ff7300"
          name="Win Rate %"
        />
        <Brush
          dataKey="month"
          height={30}
          stroke="#8884d8"
          startIndex={Math.max(0, data.length - 11)}
          endIndex={data.length - 1}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );

  const CustomMonthlyTooltip = ({
    active,
    payload,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload) {
      const data = payload[0]?.payload as {
        month: string;
        games: number;
        wins: number;
        winRate: number;
      };

      return (
        <div className="bg-white p-3 border rounded-lg shadow">
          <p className="font-bold">
            {new Date(data.month).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
            })}
          </p>
          <p>Games: {data.games}</p>
          <p>Wins: {data.wins}</p>
          <p>Win Rate: {data.winRate.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  const renderOpeningsChart = (data: AnalysisStats["openings"]) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={100}
            tick={{ fontSize: 12 }}
          />
          <YAxis
            yAxisId="left"
            label={{
              value: "Games Played",
              angle: -90,
              position: "insideLeft",
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            label={{ value: "Win Rate %", angle: 90, position: "insideRight" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="count"
            fill="#8884d8"
            name="Games Played"
          />
          <Bar
            yAxisId="right"
            dataKey="winRate"
            fill="#82ca9d"
            name="Win Rate %"
          />
          <Brush
            dataKey="name"
            height={30}
            stroke="#8884d8"
            travellerWidth={10}
            gap={5}
            startIndex={0}
            endIndex={Math.min(9, data.length - 1)}
          />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as {
        wins: number;
        losses: number;
        draws: number;
        name?: string;
        opponent?: string;
      };

      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-bold">{label}</p>
          {payload.map((entry) => (
            <p key={entry.name} style={{ color: entry.color }}>
              {entry.name}: {entry.value}
            </p>
          ))}
          {"wins" in data && (
            <>
              <p>Wins: {data.wins}</p>
              <p>Losses: {data.losses}</p>
              <p>Draws: {data.draws}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const RatingTooltip = ({
    active,
    payload,
  }: TooltipProps<ValueType, NameType>) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as {
        date: Date;
        rating: number;
        gameType: string;
      };

      return (
        <div className="bg-white p-3 border rounded-lg shadow-lg">
          <p className="font-bold">
            {new Date(data.date).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
          <p>Rating: {data.rating}</p>
          <p>Game Type: {data.gameType}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/10 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="flex items-center gap-2">
                <Swords className="h-6 w-6" />
                Chess Game Analysis
              </CardTitle>
              <ModeToggle />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              <div className="flex gap-4 flex-col md:flex-row">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Username
                  </label>
                  <div className="flex gap-2">
                    <User className="w-5 h-5 text-gray-500" />
                    <Input
                      placeholder="Enter your chess username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    PGN File
                  </label>
                  <div className="flex gap-2">
                    <FileInput className="w-5 h-5 text-gray-500" />
                    <Input
                      type="file"
                      accept=".pgn"
                      onChange={handleFileChange}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-center">
                <Button
                  onClick={handleAnalyze}
                  disabled={loading}
                  className="w-40"
                >
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Analyzing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Analyze Games
                    </div>
                  )}
                </Button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {stats && (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="openings">Openings</TabsTrigger>
              <TabsTrigger value="progression">Rating</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="headToHead">Matchups</TabsTrigger>
            </TabsList>
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>
                        Total Games:{" "}
                        {Object.values(stats.results).reduce(
                          (a, b) => a + b,
                          0
                        )}
                      </p>
                      <p>Wins: {stats.results.wins}</p>
                      <p>Losses: {stats.results.losses}</p>
                      <p>Draws: {stats.results.draws}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Game Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.gameTypes).map(([type, count]) => (
                        <p key={type}>
                          {type}: {count} games
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Streaks</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p>Longest Win Streak: {stats.streaks.winStreak}</p>
                      <p>Longest Loss Streak: {stats.streaks.lossStreak}</p>
                      <p>Longest Draw Streak: {stats.streaks.drawStreak}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Color Statistics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium">White:</p>
                        <p>Wins: {stats.colorStats.White.wins}</p>
                        <p>Losses: {stats.colorStats.White.losses}</p>
                        <p>Draws: {stats.colorStats.White.draws}</p>
                      </div>
                      <div>
                        <p className="font-medium">Black:</p>
                        <p>Wins: {stats.colorStats.Black.wins}</p>
                        <p>Losses: {stats.colorStats.Black.losses}</p>
                        <p>Draws: {stats.colorStats.Black.draws}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      Result Distribution by Game Length
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Wins</h3>
                        <p>
                          Average:{" "}
                          {stats.resultDistribution.wins.average.toFixed(1)}{" "}
                          moves
                        </p>
                        <p>
                          Shortest: {stats.resultDistribution.wins.shortest}
                        </p>
                        <p>Longest: {stats.resultDistribution.wins.longest}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium">Losses</h3>
                        <p>
                          Average:{" "}
                          {stats.resultDistribution.losses.average.toFixed(1)}{" "}
                          moves
                        </p>
                        <p>
                          Shortest: {stats.resultDistribution.losses.shortest}
                        </p>
                        <p>
                          Longest: {stats.resultDistribution.losses.longest}
                        </p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium">Draws</h3>
                        <p>
                          Average:{" "}
                          {stats.resultDistribution.draws.average.toFixed(1)}{" "}
                          moves
                        </p>
                        <p>
                          Shortest: {stats.resultDistribution.draws.shortest}
                        </p>
                        <p>Longest: {stats.resultDistribution.draws.longest}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            <TabsContent value="openings">
              <Card>
                <CardHeader>
                  <CardTitle>Opening Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="mostPlayed">
                    <div className="flex justify-between items-center mb-4">
                      <TabsList>
                        <TabsTrigger value="mostPlayed">
                          Most Played
                        </TabsTrigger>
                        <TabsTrigger value="mostWins">Most Wins</TabsTrigger>
                        <TabsTrigger value="bestRate">Best Rate</TabsTrigger>
                        <TabsTrigger value="mostLosses">
                          Most Losses
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <TabsContent value="mostPlayed">
                      <div className="h-[300px]">
                        {renderOpeningsChart(
                          [...stats.openings].sort((a, b) => b.count - a.count)
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="mostWins">
                      <div className="h-[300px]">
                        {renderOpeningsChart(
                          [...stats.openings].sort((a, b) => b.wins - a.wins)
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="bestRate">
                      <div className="h-[300px]">
                        {renderOpeningsChart(
                          [...stats.openings].sort(
                            (a, b) => b.winRate - a.winRate
                          )
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="mostLosses">
                      <div className="h-[300px]">
                        {renderOpeningsChart(
                          [...stats.openings].sort(
                            (a, b) => b.losses - a.losses
                          )
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progression">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Rating Progression</CardTitle>
                    <select
                      value={selectedGameType}
                      onChange={(e) => setSelectedGameType(e.target.value)}
                      className="bg-background border rounded-md px-3 py-1 text-sm"
                    >
                      <option value="All">All Game Types</option>
                      {stats && Object.keys(stats.gameTypes).map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={
                          selectedGameType === "All"
                            ? stats.ratingProgression
                            : stats.ratingProgression.filter(
                              (r) => r.gameType === selectedGameType
                            )
                        }
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(date) =>
                            new Date(date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          }
                        />
                        <YAxis domain={["dataMin - 50", "dataMax + 50"]} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-white p-3 border rounded-lg shadow-lg">
                                  <p className="font-bold">
                                    {new Date(data.date).toLocaleDateString(
                                      "en-US",
                                      {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      }
                                    )}
                                  </p>
                                  <p>Rating: {data.rating}</p>
                                  <p>Game Type: {data.gameType}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="rating"
                          stroke="#8884d8"
                          strokeWidth={2}
                          dot={false}
                          name="Rating"
                        />
                        <Brush
                          dataKey="date"
                          height={30}
                          stroke="#8884d8"
                          startIndex={Math.max(
                            0,
                            (selectedGameType === "All"
                              ? stats.ratingProgression.length
                              : stats.ratingProgression.filter(
                                (r) => r.gameType === selectedGameType
                              ).length) - 366
                          )}
                          endIndex={
                            (selectedGameType === "All"
                              ? stats.ratingProgression.length
                              : stats.ratingProgression.filter(
                                (r) => r.gameType === selectedGameType
                              ).length) - 1
                          }
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    {renderWinRateChart(stats.monthlyPerformance)}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="headToHead">
              <Card>
                <CardHeader>
                  <CardTitle>Top Opponent Matchups</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.headToHead}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="opponent"
                          angle={-45}
                          textAnchor="end"
                          height={80}
                        />
                        <YAxis yAxisId="left" />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                          yAxisId="left"
                          dataKey="games"
                          fill="#8884d8"
                          name="Total Games"
                        />
                        <Bar
                          yAxisId="right"
                          dataKey="winRate"
                          fill="#82ca9d"
                          name="Win Rate %"
                        />
                        <Brush
                          dataKey="opponent"
                          height={30}
                          stroke="#8884d8"
                          startIndex={0}
                          endIndex={10}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ChessAnalyzer;
