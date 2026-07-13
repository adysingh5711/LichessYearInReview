import { MagicCard } from "@/components/ui/magic-card";
import { AnalysisStats } from "@/types/chess";

export function OverviewCards({
  stats,
  totalGames,
  theme,
}: {
  stats: AnalysisStats;
  totalGames: number;
  theme?: string;
}) {
  return (
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
  );
}
