"use client";

import React, { useState, useEffect, ChangeEvent, useMemo, useRef } from "react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";
import { toPng } from 'html-to-image';

// UI components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { MagicCard } from "@/components/ui/magic-card";
import { ChartMagicCard } from "@/components/ui/chart-magic-card";
import { ShareDialog } from "@/components/share-dialog";

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
  TooltipProps,
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
  CalendarRange,
  Loader2,
  HelpCircle,
  X,
} from "lucide-react";

// Types
import { AnalysisStats } from "@/types/chess";
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
  const [startYear, setStartYear] = useState(new Date().getFullYear().toString());
  const [endYear, setEndYear] = useState(new Date().getFullYear().toString());
  const [isFetching, setIsFetching] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [loadingPercentage, setLoadingPercentage] = useState(0);

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

  const handleRemoveFile = () => {
    setFile(null);
    // Reset the input value to allow uploading the same file again
    const input = document.getElementById('pgn-upload') as HTMLInputElement;
    if (input) input.value = '';
  };

  const handleFetchGames = async () => {
    // If a file is already uploaded, analyze it directly
    if (file) {
      await handleAnalyze();
      return;
    }

    if (!username) {
      setError("Please provide a username");
      return;
    }

    setIsFetching(true);
    setError("");

    try {
      const response = await fetch(`/api/fetch-games?username=${username}&startYear=${startYear}&endYear=${endYear}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const games = await response.text();
      const newFile = new File([games], 'lichess_games.pgn', { type: 'application/x-chess-pgn' });
      setFile(newFile);

      // Proceed with analysis
      await handleAnalyze(newFile);
    } catch (err) {
      setError("Failed to fetch games from Lichess. Please upload your PGN file instead.");
    } finally {
      setIsFetching(false);
    }
  };

  const handleAnalyze = async (providedFile?: File) => {
    if (!username) {
      setError("Please provide a username");
      return;
    }

    const fileToAnalyze = providedFile || file;
    if (!fileToAnalyze) {
      setError("Please either upload a PGN file or fetch games from Lichess");
      return;
    }

    setLoading(true);
    setLoadingPercentage(0);

    try {
      const formData = new FormData();
      formData.append("file", fileToAnalyze);
      formData.append("username", username);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error(await response.text());

      // Simulate loading percentage update (replace with actual logic if available)
      for (let i = 0; i <= 100; i += 10) {
        setLoadingPercentage(i);
        await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
      }

      setStats(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to analyze games");
    } finally {
      setLoading(false);
      setLoadingPercentage(0);
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
      <h3 className="text-sm font-semibold text-[hsl(272.49deg_100%_42.99%)] dark:text-[hsl(272.49deg_100%_82.99%)]">{title}</h3>
      <div className="space-y-1 text-sm">{children}</div>
    </div>
  );

  const StatItem = ({ label, value, truncate }: {
    label: string;
    value: string | number;
    truncate?: boolean
  }) => (
    <div className="flex justify-between">
      <span className="text-[hsl(var(--primary))] dark:text-[hsl(var(--primary))] font-medium">{label}:</span>
      <span className={`font-semibold text-[hsl(272.49deg_100%_42.99%)] dark:text-[hsl(272.49deg_100%_82.99%)] ${truncate ? 'max-w-[120px] truncate' : ''}`}>
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

  const handleMouseEnter = () => {
    setShowHelp(true);
  };

  const handleMouseLeave = (e: MouseEvent) => {
    if (tooltipRef.current) {
      const rect = tooltipRef.current.getBoundingClientRect();
      const helpIconRect = (e.target as HTMLElement).getBoundingClientRect();
      const buffer = 20;

      // Check if mouse is outside both the tooltip and help icon areas (including buffer)
      const outsideTooltip =
        e.clientX < rect.left - buffer ||
        e.clientX > rect.right + buffer ||
        e.clientY < rect.top - buffer ||
        e.clientY > rect.bottom + buffer;

      const outsideHelpIcon =
        e.clientX < helpIconRect.left - buffer ||
        e.clientX > helpIconRect.right + buffer ||
        e.clientY < helpIconRect.top - buffer ||
        e.clientY > helpIconRect.bottom + buffer;

      if (outsideTooltip && outsideHelpIcon) {
        setShowHelp(false);
      }
    }
  };

  useEffect(() => {
    if (showHelp) {
      // Add a small delay before adding the mousemove listener
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousemove', handleMouseLeave);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousemove', handleMouseLeave);
      };
    }
  }, [showHelp]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-500/20 via-pink-500/20 to-blue-500/20 dark:from-purple-900/30 dark:via-pink-900/30 dark:to-blue-900/30">
      <div className="max-w-6xl mx-auto space-y-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between w-full relative">
              <div className="absolute right-0 flex items-center gap-2">
                <a
                  href="https://github.com/adysingh5711/LichessYearInReview"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-accent rounded-md transition-colors border aspect-square flex items-center justify-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5"
                  >
                    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.02 5.02 0 0 0 5 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                    <path d="M9 18c-4.51 2-5-2-7-2" />
                  </svg>
                </a>
                <ModeToggle />
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-500 bg-clip-text text-transparent mx-auto">
                Chess Game Analysis
              </h1>
            </div>
          </CardHeader>
          <ChartMagicCard
            className="p-6 shadow-2xl"
            gradientColor={theme === "dark" ? "#262626" : "#f3f4f6"}
          >
            <CardContent>
              <div className="space-y-4 w-full max-w-md mx-auto">
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg transition-opacity opacity-0 group-hover:opacity-100"></div>
                  <div className="relative flex gap-2 items-center bg-background/50 backdrop-blur-sm rounded-lg p-2 border">
                    <User className="w-5 h-5 text-purple-600" />
                    <Input
                      type="text"
                      placeholder="Lichess Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="border-0 bg-transparent focus-visible:ring-0"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg transition-opacity opacity-0 group-hover:opacity-100"></div>
                    <div className="relative flex gap-2 items-center bg-background/50 backdrop-blur-sm rounded-lg p-2 border">
                      <CalendarRange className="w-5 h-5 text-purple-600" />
                      <Input
                        type="number"
                        placeholder="Start Year"
                        value={startYear}
                        onChange={(e) => setStartYear(e.target.value)}
                        min="2010"
                        max={new Date().getFullYear()}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  </div>
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg transition-opacity opacity-0 group-hover:opacity-100"></div>
                    <div className="relative flex gap-2 items-center bg-background/50 backdrop-blur-sm rounded-lg p-2 border">
                      <CalendarRange className="w-5 h-5 text-pink-600" />
                      <Input
                        type="number"
                        placeholder="End Year"
                        value={endYear}
                        onChange={(e) => setEndYear(e.target.value)}
                        min="2010"
                        max={new Date().getFullYear()}
                        className="border-0 bg-transparent focus-visible:ring-0"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-2"
                  onClick={handleFetchGames}
                  disabled={isFetching || loading}
                >
                  {(isFetching || loading) && (
                    <>
                      {loading ? `${loadingPercentage}% ` : <Loader2 className="w-4 h-4 animate-spin" />}
                    </>
                  )}
                  {isFetching ? "Fetching..." : loading ? "Analyzing..." : "Analyze Games"}
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or Upload PGN
                    </span>
                  </div>
                </div>

                <div className="relative group flex items-center gap-2 w-full">
                  <div className="relative group flex-1">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg transition-opacity opacity-0 group-hover:opacity-100"></div>
                    <label htmlFor="pgn-upload" className="relative flex gap-2 items-center cursor-pointer bg-background/50 backdrop-blur-sm rounded-lg p-2 border w-full">
                      <Upload className="w-5 h-5 text-pink-600 shrink-0" />
                      <span className="text-sm truncate">
                        {file ? file.name : "Choose PGN file"}
                      </span>
                      {file && (
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            handleRemoveFile();
                          }}
                          className="ml-auto p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                          aria-label="Remove file"
                        >
                          <X className="w-4 h-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" />
                        </button>
                      )}
                      <Input
                        id="pgn-upload"
                        type="file"
                        accept=".pgn"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                  </div>

                  <div className="relative shrink-0">
                    <HelpCircle
                      className="w-5 h-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={(e) => {
                        // Start a timer to check if mouse moved to tooltip
                        setTimeout(() => {
                          if (!tooltipRef.current?.matches(':hover')) {
                            setShowHelp(false);
                          }
                        }, 100);
                      }}
                    />
                    {showHelp && (
                      <div
                        ref={tooltipRef}
                        className="absolute left-7 top-1/2 -translate-y-1/2 w-72 p-3 bg-popover text-popover-foreground rounded-lg shadow-lg border z-50 animate-fade-in"
                        onMouseLeave={(e) => {
                          // Check if mouse is not over the help icon
                          const helpIcon = e.currentTarget.previousElementSibling;
                          if (!helpIcon?.matches(':hover')) {
                            setShowHelp(false);
                          }
                        }}
                      >
                        <p className="text-sm">
                          To get your PGN file:
                          <ol className="mt-2 ml-4 list-decimal">
                            <li>Visit <a href="https://lichess.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">lichess.org</a></li>
                            <li>Go to your profile, click the three lines on the top right</li>
                            <li>Click on &quot;Export games&quot;</li>
                            <li>Download your games in PGN format</li>
                          </ol>
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </ChartMagicCard>
        </Card>

        {stats && (
          <Tabs defaultValue="overview" className="space-y-4">
            <div className="flex justify-between items-center">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="openings">Openings</TabsTrigger>
                <TabsTrigger value="progression">Rating</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="headToHead">Matchups</TabsTrigger>
              </TabsList>
              <Button
                onClick={handleShare}
                className="ml-4 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Share Stats
              </Button>
            </div>
            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
                <MagicCard
                  className="h-full flex flex-col shadow-2xl p-6"
                  gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                >
                  <h3 className="text-lg font-semibold dark:text-gray-100">Results</h3>
                  <div className="space-y-2 dark:text-gray-200 mt-2">
                    <p>Total Games: {totalGames}</p>
                    <p>Wins: {stats.results.wins}</p>
                    <p>Losses: {stats.results.losses}</p>
                    <p>Draws: {stats.results.draws}</p>
                  </div>
                </MagicCard>

                <MagicCard
                  className="h-full flex flex-col shadow-2xl p-6"
                  gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                >
                  <h3 className="text-lg font-semibold dark:text-gray-100">Game Types</h3>
                  <div className="space-y-2 dark:text-gray-200 mt-2">
                    {Object.entries(stats.gameTypes).map(([type, count]) => (
                      <p key={type}>{type}: {count} games</p>
                    ))}
                  </div>
                </MagicCard>

                <MagicCard
                  className="h-full flex flex-col shadow-2xl p-6"
                  gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                >
                  <h3 className="text-lg font-semibold dark:text-gray-100">Streaks</h3>
                  <div className="space-y-2 dark:text-gray-200 mt-2">
                    <p>Longest Win Streak: {stats.streaks.winStreak}</p>
                    <p>Longest Loss Streak: {stats.streaks.lossStreak}</p>
                    <p>Longest Draw Streak: {stats.streaks.drawStreak}</p>
                  </div>
                </MagicCard>

                <MagicCard
                  className="h-full flex flex-col shadow-2xl p-6"
                  gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                >
                  <h3 className="text-lg font-semibold dark:text-gray-100">Color Statistics</h3>
                  <div className="space-y-2 dark:text-gray-200 mt-2">
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
                </MagicCard>

                <MagicCard
                  className="h-full flex flex-col shadow-2xl p-6"
                  gradientColor={theme === "dark" ? "#262626" : "#D9D9D955"}
                >
                  <h3 className="text-lg font-semibold dark:text-gray-100">
                    Result Distribution by Game Length
                  </h3>
                  <div className="dark:text-gray-200 mt-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <h3 className="font-medium">Wins</h3>
                        <p>Average: {stats.resultDistribution.wins.average.toFixed(1)} moves</p>
                        <p>Shortest: {stats.resultDistribution.wins.shortest}</p>
                        <p>Longest: {stats.resultDistribution.wins.longest}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium">Losses</h3>
                        <p>Average: {stats.resultDistribution.losses.average.toFixed(1)} moves</p>
                        <p>Shortest: {stats.resultDistribution.losses.shortest}</p>
                        <p>Longest: {stats.resultDistribution.losses.longest}</p>
                      </div>
                      <div className="space-y-2">
                        <h3 className="font-medium">Draws</h3>
                        <p>Average: {stats.resultDistribution.draws.average.toFixed(1)} moves</p>
                        <p>Shortest: {stats.resultDistribution.draws.shortest}</p>
                        <p>Longest: {stats.resultDistribution.draws.longest}</p>
                      </div>
                    </div>
                  </div>
                </MagicCard>
              </div>
            </TabsContent>
            <TabsContent value="openings">
              <ChartMagicCard
                className="p-6 shadow-2xl"
                gradientColor={theme === "dark" ? "#262626" : "#f3f4f6"}
              >
                <CardHeader>
                  <CardTitle>Opening Statistics</CardTitle>
                </CardHeader>
                <CardContent className="overflow-visible">
                  <Tabs defaultValue="mostPlayed">
                    <div className="flex justify-between items-center mb-4">
                      <TabsList>
                        <TabsTrigger value="mostPlayed">
                          Most Played
                        </TabsTrigger>
                        <TabsTrigger value="mostWins">Most Wins</TabsTrigger>
                        <TabsTrigger value="bestRate">Best Rate</TabsTrigger>
                        <TabsTrigger value="mostLosses">Most Losses</TabsTrigger>
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
              </ChartMagicCard>
            </TabsContent>

            <TabsContent value="progression">
              <ChartMagicCard
                className="p-6 shadow-2xl"
                gradientColor={theme === "dark" ? "#262626" : "#f3f4f6"}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Rating Progression</CardTitle>
                    <select
                      value={selectedGameType}
                      onChange={(e) => setSelectedGameType(e.target.value)}
                      className="bg-background border rounded-md px-3 py-1 text-sm z-20"  // Added z-20
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
                <CardContent className="overflow-visible">
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
              </ChartMagicCard>
            </TabsContent>

            <TabsContent value="performance">
              <ChartMagicCard
                className="p-6 shadow-2xl"
                gradientColor={theme === "dark" ? "#262626" : "#f3f4f6"}
              >
                <CardHeader>
                  <CardTitle>Monthly Performance</CardTitle>
                </CardHeader>
                <CardContent className="overflow-visible">
                  <div className="h-[300px]">
                    {renderWinRateChart(stats.monthlyPerformance)}
                  </div>
                </CardContent>
              </ChartMagicCard>
            </TabsContent>

            <TabsContent value="headToHead">
              <ChartMagicCard
                className="p-6 shadow-2xl"
                gradientColor={theme === "dark" ? "#262626" : "#f3f4f6"}
              >
                <CardHeader>
                  <CardTitle>Top Opponent Matchups</CardTitle>
                </CardHeader>
                <CardContent className="overflow-visible">
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
              </ChartMagicCard>
            </TabsContent>
          </Tabs>
        )}
        {stats && (
          <ShareDialog
            open={showShareModal}
            onOpenChange={setShowShareModal}
            stats={stats}
            totalGames={totalGames}
            username={username}
            peakRating={peakRating}
          />
        )}
      </div>
    </div >
  );
};

export default ChessAnalyzer;
