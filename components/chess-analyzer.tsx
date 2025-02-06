"use client";

import React, { useState, useEffect, ChangeEvent, useMemo } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toPng } from 'html-to-image';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [showShareModal, setShowShareModal] = useState(false);
  const { theme } = useTheme();
  const router = useRouter();

  // Calculated values
  const totalGames = stats
    ? stats.results.wins + stats.results.losses + stats.results.draws
    : 0;

  const mostPlayedOpening = stats?.openings?.length
    ? [...stats.openings].sort((a, b) => b.count - a.count)[0]
    : { name: "N/A", count: 0 };

  const filteredOpponents = stats?.headToHead?.length
    ? stats.headToHead.filter(o =>
      !o.opponent?.toLowerCase().includes('lichess ai') &&
      !o.opponent?.toLowerCase().includes('bot')
    )
    : [];

  const bestWinRateMonth = stats?.monthlyPerformance?.length
    ? [...stats.monthlyPerformance].sort((a, b) => b.winRate - a.winRate)[0]
    : { month: "N/A", winRate: 0 };

  const peakRating = stats?.ratingProgression?.length
    ? Math.max(...stats.ratingProgression.map(r => r.rating))
    : 0;

  useEffect(() => {
    if (stats) {
      // Find most played game type
      const gameTypes = Object.entries(stats.gameTypes);
      if (gameTypes.length > 0) {
        const mostPlayed = gameTypes.reduce((a, b) => a[1] > b[1] ? a : b)[0];
        setSelectedGameType(mostPlayed);
      }
    }
  }, [stats]);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile?.name.endsWith(".pgn")) {
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

      if (!response.ok) throw new Error(await response.text());
      setStats(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze games");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = () => stats && setShowShareModal(true);

  const handleDownload = async () => {
    const cardElement = document.getElementById('share-card');
    if (!cardElement) return;

    try {
      const dataUrl = await toPng(cardElement, {
        backgroundColor: theme === 'dark' ? '#000000' : '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
        filter: (node) => {
          // Exclude the download button from the image
          return !(node instanceof HTMLElement && node.id === 'download-button');
        },
        style: {
          transform: 'none', // Disable any transforms
          contain: 'strict' // Prevent layout shifts
        }
      });

      const link = document.createElement('a');
      link.download = `chess-year-review-${username}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  const StatBlock = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );

  const StatItem = ({ label, value, truncate }: {
    label: string;
    value: string | number;
    truncate?: boolean
  }) => (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}:</span>
      <span className={`font-medium ${truncate ? 'max-w-[120px] truncate' : ''}`}>
        {value || '-'}
      </span>
    </div>
  );

  // Chart rendering functions
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
          label={{
            value: "Months",
            position: "bottom",
            dy: -5
          }}
        />
        <YAxis yAxisId="left" domain={[0, 100]} label={{ value: "Win Rate %", angle: -90, position: "bottom", dx: -30, dy: -90 }} />
        <YAxis yAxisId="right" orientation="right" label={{ value: "Games Played", angle: 90, position: "insideRight", dx: 0, dy: 70 }} />
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
          stroke={theme === "dark" ? "#64748b" : "#8884d8"} // slate-500 in dark, original in light
          fill={theme === "dark" ? "#1e293b" : "#f1f5f9"} // slate-800 in dark, slate-50 in light
          traveller={(props) => (
            <rect
              {...props}
              fill={theme === "dark" ? "#64748b" : "#8884d8"} // Handle color
              stroke={theme === "dark" ? "#94a3b8" : "#cbd5e1"} // Handle border
            />
          )}
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
        <div className="bg-background text-foreground p-3 border rounded-lg shadow">
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

  const renderCustomizedTick = (props: { x: number; y: number; payload: { value: string } }) => {
    const { x, y, payload } = props;
    const maxLineLength = 15; // Characters per line
    const maxLines = 3;

    let label = payload.value;
    let lines: string[] = [];
    for (let i = 0; i < maxLines; i++) {
      const line = label.slice(i * maxLineLength, (i + 1) * maxLineLength);
      if (line) lines.push(line);
      else break;
    }

    const fontSize = Math.max(11, 12 - Math.floor(lines[0]?.length / 3 || 0));

    return (
      <text
        x={x}
        y={y}
        dy={20}
        fill="#666"
        fontSize={fontSize}
        textAnchor="middle"
        dominantBaseline="hanging"
      >
        {lines.map((line, index) => (
          <tspan x={x} dy={index === 0 ? 0 : 15} key={index}>
            {line}
          </tspan>
        ))}
      </text>
    );
  };

  const renderOpeningsChart = (data: AnalysisStats["openings"]) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} style={{
          color: 'hsl(var(--foreground))',
          fill: 'hsl(var(--foreground))'
        }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            textAnchor="end"
            height={55}
            tick={renderCustomizedTick}
            interval={0}
            label={{
              value: "Openings",
              position: "bottom",
              dy: -25
            }}
          />
          <YAxis
            yAxisId="left"
            label={{
              value: "Games Played",
              angle: -90,
              position: "bottom",
              dx: -30,
              dy: -90
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            label={{ value: "Win Rate %", angle: 90, position: "insideRight", dx: -10, dy: 70 }}
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
            stroke={theme === "dark" ? "#64748b" : "#8884d8"} // slate-500 in dark, original in light
            fill={theme === "dark" ? "#1e293b" : "#f1f5f9"} // slate-800 in dark, slate-50 in light
            traveller={(props) => (
              <rect
                {...props}
                fill={theme === "dark" ? "#64748b" : "#8884d8"} // Handle color
                stroke={theme === "dark" ? "#94a3b8" : "#cbd5e1"} // Handle border
              />
            )}
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
        <div className="bg-background text-foreground p-3 border rounded-lg shadow-lg">
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
        <div className="bg-background text-foreground p-3 border rounded-lg shadow-lg">
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

  //using useMemo to optimise time function
  const openingsByCount = useMemo(() =>
    stats?.openings ? [...stats.openings].sort((a, b) => b.count - a.count) : []
    , [stats]);

  const openingsByWins = useMemo(() =>
    stats?.openings ? [...stats.openings].sort((a, b) => b.wins - a.wins) : []
    , [stats]);

  const openingsByWinRate = useMemo(() =>
    stats?.openings ? [...stats.openings].sort((a, b) => b.winRate - a.winRate) : []
    , [stats]);

  const headToHeadSorted = useMemo(() =>
    stats?.headToHead ? [...stats.headToHead].sort((a, b) => b.games - a.games) : []
    , [stats]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black/10 p-8 scrollbar-dark">
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

              <div className="flex justify-center gap-4">
                <Button onClick={handleAnalyze} disabled={loading} className="w-40">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white dark:border-gray-300" />
                      Analyzing...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Upload className="w-4 h-4" />
                      Analyze Games
                    </div>
                  )}
                </Button>

                {stats && (
                  <Button
                    onClick={handleShare}
                    className="w-48 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  >
                    Share Your Chess Year
                  </Button>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabs and other content remain the same */}

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
                <Card className="dark:bg-black/10">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-gray-100">Results</CardTitle>
                  </CardHeader>
                  <CardContent className="dark:text-gray-200">
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

                <Card className="dark:bg-black/10">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-gray-100">Game Types</CardTitle>
                  </CardHeader>
                  <CardContent className="dark:text-gray-200">
                    <div className="space-y-2">
                      {Object.entries(stats.gameTypes).map(([type, count]) => (
                        <p key={type}>
                          {type}: {count} games
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-black/10">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-gray-100">Streaks</CardTitle>
                  </CardHeader>
                  <CardContent className="dark:text-gray-200">
                    <div className="space-y-2">
                      <p>Longest Win Streak: {stats.streaks.winStreak}</p>
                      <p>Longest Loss Streak: {stats.streaks.lossStreak}</p>
                      <p>Longest Draw Streak: {stats.streaks.drawStreak}</p>
                    </div>
                  </CardContent>
                </Card>

                <Card className="dark:bg-black/10">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-gray-100">Color Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="dark:text-gray-200">
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
                <Card className="dark:bg-black/10">
                  <CardHeader>
                    <CardTitle className="text-lg dark:text-gray-100">
                      Result Distribution by Game Length
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="dark:text-gray-200">
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
                        {renderOpeningsChart(openingsByCount)}
                      </div>
                    </TabsContent>
                    <TabsContent value="mostWins">
                      <div className="h-[300px]">
                        {renderOpeningsChart(openingsByWins)}
                      </div>
                    </TabsContent>
                    <TabsContent value="bestRate">
                      <div className="h-[300px]">
                        {renderOpeningsChart(openingsByWinRate)}
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
                          label={{
                            value: "Months",
                            position: "bottom",
                            dy: -5
                          }}
                        />
                        <YAxis domain={["dataMin - 50", "dataMax + 50"]} label={{
                          value: "Ratings",
                          angle: -90,
                          position: "bottom",
                          dx: -35,
                          dy: -90
                        }} />
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-background text-foreground p-3 border rounded-lg shadow-lg">
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
                          stroke={theme === "dark" ? "#64748b" : "#8884d8"} // slate-500 in dark, original in light
                          fill={theme === "dark" ? "#1e293b" : "#f1f5f9"} // slate-800 in dark, slate-50 in light
                          traveller={(props) => (
                            <rect
                              {...props}
                              fill={theme === "dark" ? "#64748b" : "#8884d8"} // Handle color
                              stroke={theme === "dark" ? "#94a3b8" : "#cbd5e1"} // Handle border
                            />
                          )}
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
                      <BarChart data={stats.headToHead} style={{
                        color: 'hsl(var(--foreground))',
                        fill: 'hsl(var(--foreground))'
                      }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="opponent"
                          height={50}
                          tick={renderCustomizedTick}
                          interval={0}
                        />
                        <YAxis yAxisId="left" label={{
                          value: "Games Played",
                          angle: -90,
                          position: "bottom",
                          dx: -30,
                          dy: -90
                        }} />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          domain={[0, 100]}
                          label={{ value: "Win Rate %", angle: 90, position: "insideRight", dx: -10, dy: 70 }}
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
                          stroke={theme === "dark" ? "#64748b" : "#8884d8"} // slate-500 in dark, original in light
                          fill={theme === "dark" ? "#1e293b" : "#f1f5f9"} // slate-800 in dark, slate-50 in light
                          traveller={(props) => (
                            <rect
                              {...props}
                              fill={theme === "dark" ? "#64748b" : "#8884d8"} // Handle color
                              stroke={theme === "dark" ? "#94a3b8" : "#cbd5e1"} // Handle border
                            />
                          )}
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
        {stats && (
          <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
            <DialogContent className="max-w-md p-0 border-0 overflow-visible bg-transparent">
              <div className="fixed inset-0 bg-black/30 backdrop-blur-lg" />
              <div className="relative flex items-center justify-center min-h-screen p-4">
                <div
                  className="w-full max-w-[400px] h-[90vh] bg-background rounded-xl shadow-2xl p-6 border relative flex flex-col"
                  id="share-card"
                  style={{
                    background: 'linear-gradient(to bottom, hsl(var(--background)), hsl(var(--secondary)/0.3))',
                  }}
                >
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-purple-500/20 to-pink-500/20 z-0" />

                  {/* Card Header */}
                  <div className="relative z-10 flex flex-col gap-2 mb-4">
                    <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      CHESS YEAR IN REVIEW
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      {username} • {new Date().getFullYear()} Summary
                    </p>
                  </div>

                  {/* Card Content - Vertical Layout */}
                  <div className="relative z-10 flex-1 grid grid-cols-1 gap-4 overflow-y-auto">
                    <div className="space-y-4">
                      <StatBlock title="Results">
                        <div className="grid grid-cols-2 gap-2">
                          <StatItem label="Total" value={totalGames} />
                          <StatItem label="Wins" value={stats.results.wins} />
                          <StatItem label="Losses" value={stats.results.losses} />
                          <StatItem label="Draws" value={stats.results.draws} />
                        </div>
                      </StatBlock>

                      <StatBlock title="Performance">
                        <div className="grid grid-cols-2 gap-2">
                          <StatItem label="Peak Rating" value={peakRating} />
                          <StatItem label="Best Streak" value={stats.streaks.winStreak} />
                        </div>
                      </StatBlock>

                      <StatBlock title="Openings">
                        <div className="space-y-1">
                          <StatItem label="Most Played" value={mostPlayedOpening?.name} truncate />
                          <StatItem
                            label="Best Win Rate"
                            value={[...stats.openings]
                              .filter(o => o.count > 10)
                              .sort((a, b) => b.winRate - a.winRate)[0]?.name}
                            truncate
                          />
                        </div>
                      </StatBlock>

                      <StatBlock title="Colors">
                        <div className="grid grid-cols-2 gap-2">
                          <StatItem label="White Wins" value={stats.colorStats.White.wins} />
                          <StatItem label="Black Wins" value={stats.colorStats.Black.wins} />
                        </div>
                      </StatBlock>

                      <StatBlock title="Opponents">
                        <div className="space-y-1">
                          <StatItem label="Most Played" value={filteredOpponents[0]?.opponent} truncate />
                          <StatItem
                            label="Most Wins Against"
                            value={[...filteredOpponents].sort((a, b) => b.wins - a.wins)[0]?.opponent}
                            truncate
                          />
                        </div>
                      </StatBlock>

                      <StatBlock title="Monthly Best">
                        <div className="grid grid-cols-2 gap-2">
                          <StatItem label="Month" value={bestWinRateMonth.month} />
                          <StatItem label="Win Rate" value={`${bestWinRateMonth.winRate.toFixed(1)}%`} />
                        </div>
                      </StatBlock>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="relative z-10 border-t pt-4 mt-4">
                    <p className="text-xs text-muted-foreground text-center">
                      Made with ❤️ by Opensource
                    </p>
                  </div>
                </div>

                <Button
                  id="download-button"
                  onClick={handleDownload}
                  size="sm"
                  className="absolute bottom-4 right-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-xs shadow-lg"
                >
                  Download
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default ChessAnalyzer;
