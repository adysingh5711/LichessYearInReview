"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "recharts";
import { FileInput, Upload, Trophy, User, Clock, Swords } from "lucide-react";
import { AnalysisStats } from "@/types/chess";
import type { TooltipProps } from "recharts";
import type {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";

const ChessAnalyzer = () => {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [error, setError] = useState("");
  const [selectedGameType, setSelectedGameType] = useState("All");

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
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
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
          <Tooltip />
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
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Swords className="h-6 w-6" />
              Chess Game Analysis
            </CardTitle>
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
              <Tabs defaultValue="mostPlayed">
                <TabsList>
                  <TabsTrigger value="mostPlayed">Most Played</TabsTrigger>
                  <TabsTrigger value="mostWins">Most Wins</TabsTrigger>
                  <TabsTrigger value="bestRate">Best Win Rate</TabsTrigger>
                  <TabsTrigger value="mostLosses">Most Losses</TabsTrigger>
                </TabsList>

                <TabsContent value="mostPlayed">
                  {renderOpeningsChart(
                    [...stats.openings]
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 5)
                  )}
                </TabsContent>

                <TabsContent value="mostWins">
                  {renderOpeningsChart(
                    [...stats.openings]
                      .sort((a, b) => b.wins - a.wins)
                      .slice(0, 5)
                  )}
                </TabsContent>

                <TabsContent value="bestRate">
                  {renderOpeningsChart(
                    [...stats.openings]
                      .sort((a, b) => b.winRate - a.winRate)
                      .slice(0, 5)
                  )}
                </TabsContent>

                <TabsContent value="mostLosses">
                  {renderOpeningsChart(
                    [...stats.openings]
                      .sort((a, b) => b.losses - a.losses)
                      .slice(0, 5)
                  )}
                </TabsContent>
              </Tabs>
              <Card>
                <CardHeader>
                  <CardTitle>Opening Statistics</CardTitle>
                </CardHeader>
                <CardContent>{renderOpeningsChart(stats.openings)}</CardContent>
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
                      <option value="Bullet">Bullet</option>
                      <option value="Blitz">Blitz</option>
                      <option value="Rapid">Rapid</option>
                      <option value="Classical">Classical</option>
                    </select>
                  </div>
                </CardHeader>
                <CardContent>
                  {stats.ratingProgression && (
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
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="performance">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {renderWinRateChart(stats.monthlyPerformance)}
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="headToHead">
              <Card>
                <CardHeader>
                  <CardTitle>Top Opponent Matchups</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
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
                    </BarChart>
                  </ResponsiveContainer>
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
