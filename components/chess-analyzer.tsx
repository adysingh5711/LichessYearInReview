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
} from "recharts";
import { FileInput, Upload, Trophy, User, Clock, Swords } from "lucide-react";
import { AnalysisStats } from "@/types/chess";

const ChessAnalyzer = () => {
  const [username, setUsername] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [error, setError] = useState("");

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

  const renderWinRateChart = (data: AnalysisStats["monthlyPerformance"]) => {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis domain={[0, 100]} />
          <Tooltip />
          <Legend />
          <Line
            type="monotone"
            dataKey="winRate"
            stroke="#8884d8"
            name="Win Rate %"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    );
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="openings">Openings</TabsTrigger>
              <TabsTrigger value="progression">Rating Progression</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              </div>
            </TabsContent>

            <TabsContent value="openings">
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
                  <CardTitle>Rating Progression</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={stats.ratingProgression}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis domain={["dataMin - 100", "dataMax + 100"]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="rating"
                        stroke="#8884d8"
                        name="Rating"
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
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
          </Tabs>
        )}
      </div>
    </div>
  );
};

export default ChessAnalyzer;
