import {
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { AnalysisStats } from "@/types/chess";
import { CustomMonthlyTooltip } from "./chart-tooltips";
import { themedBrushProps } from "./themed-brush";

export function MonthlyPerformanceChart({
  data,
  theme,
}: {
  data: AnalysisStats["monthlyPerformance"];
  theme?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="month"
          tickFormatter={(month) => {
            const [year, m] = month.split("-");
            return new Date(parseInt(year), parseInt(m) - 1).toLocaleString(
              "default",
              { month: "short", timeZone: "UTC" }
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
          {...themedBrushProps(theme)}
          startIndex={Math.max(0, data.length - 11)}
          endIndex={data.length - 1}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
