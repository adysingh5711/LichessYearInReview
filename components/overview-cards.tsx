import { MagicCard } from "@/components/ui/magic-card";
import { AnalysisStats } from "@/types/chess";

function Tile({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <MagicCard className="h-full flex flex-col shadow-2xl p-6">
      <h3 className="text-lg font-semibold dark:text-gray-100">{title}</h3>
      <div className="space-y-2 dark:text-gray-200 mt-2">{children}</div>
    </MagicCard>
  );
}

export function OverviewCards({ stats, totalGames }: { stats: AnalysisStats; totalGames: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
      <Tile title="Results">
        <p>Total Games: {totalGames}</p>
        <p>Wins: {stats.results.wins}</p>
        <p>Losses: {stats.results.losses}</p>
        <p>Draws: {stats.results.draws}</p>
      </Tile>

      <Tile title="Game Types">
        {Object.entries(stats.gameTypes).map(([type, count]) => (
          <p key={type}>{type}: {count} games</p>
        ))}
      </Tile>

      <Tile title="Streaks">
        <p>Longest Win Streak: {stats.streaks.winStreak}</p>
        <p>Longest Loss Streak: {stats.streaks.lossStreak}</p>
        <p>Longest Draw Streak: {stats.streaks.drawStreak}</p>
      </Tile>

      <Tile title="Color Statistics">
        {(["White", "Black"] as const).map((color) => (
          <div key={color}>
            <p className="font-medium">{color}:</p>
            <p>Wins: {stats.colorStats[color].wins}</p>
            <p>Losses: {stats.colorStats[color].losses}</p>
            <p>Draws: {stats.colorStats[color].draws}</p>
          </div>
        ))}
      </Tile>

      <Tile title="Result Distribution by Game Length">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["wins", "losses", "draws"] as const).map((key) => (
            <div key={key} className="space-y-2">
              <h3 className="font-medium capitalize">{key}</h3>
              <p>Average: {stats.resultDistribution[key].average.toFixed(1)} moves</p>
              <p>Shortest: {stats.resultDistribution[key].shortest}</p>
              <p>Longest: {stats.resultDistribution[key].longest}</p>
            </div>
          ))}
        </div>
      </Tile>
    </div>
  );
}
