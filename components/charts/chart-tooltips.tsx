import type {
  ValueType,
  NameType,
} from "recharts/types/component/DefaultTooltipContent";
import type { TooltipProps } from "recharts";

export const CustomMonthlyTooltip = ({
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
            timeZone: "UTC",
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

export const renderCustomizedTick = (props: { x: number; y: number; payload: { value: string } }) => {
  const { x, y, payload } = props;
  const maxLineLength = 15; // Characters per line
  const maxLines = 3;

  const label = payload.value;
  const lines: string[] = [];
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

export const CustomTooltip = ({
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

export const RatingTooltip = ({
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
            timeZone: "UTC",
          })}
        </p>
        <p>Rating: {data.rating}</p>
        <p>Game Type: {data.gameType}</p>
      </div>
    );
  }
  return null;
};
