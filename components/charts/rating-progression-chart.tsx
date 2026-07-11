import {
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  Brush,
  ResponsiveContainer,
} from "recharts";
import { AnalysisStats } from "@/types/chess";
import { RatingTooltip } from "./chart-tooltips";
import { themedBrushProps } from "./themed-brush";

export function RatingProgressionChart({
  data,
  theme,
}: {
  data: AnalysisStats["ratingProgression"];
  theme?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis
          dataKey="date"
          tickFormatter={(date) =>
            new Date(date).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              timeZone: "UTC",
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
        <Tooltip content={<RatingTooltip />} />
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
          {...themedBrushProps(theme)}
          startIndex={Math.max(0, data.length - 366)}
          endIndex={data.length - 1}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
