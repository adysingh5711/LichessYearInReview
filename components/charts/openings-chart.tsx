import {
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { AnalysisStats } from "@/types/chess";
import { CustomTooltip, renderCustomizedTick } from "./chart-tooltips";
import { themedBrushProps } from "./themed-brush";

export function OpeningsChart({
  data,
  theme,
}: {
  data: AnalysisStats["openings"];
  theme?: string;
}) {
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
            // value: "Openings",
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
          {...themedBrushProps(theme)}
          travellerWidth={10}
          gap={5}
          startIndex={0}
          endIndex={Math.min(9, data.length - 1)}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
