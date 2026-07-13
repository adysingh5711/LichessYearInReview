import type { SVGProps } from "react";

export const themedBrushProps = (theme: string | undefined) => ({
  height: 30,
  stroke: theme === "dark" ? "#64748b" : "#8884d8", // slate-500 in dark, original in light
  fill: theme === "dark" ? "#1e293b" : "#f1f5f9", // slate-800 in dark, slate-50 in light
  traveller: (props: SVGProps<SVGRectElement>) => (
    <rect
      {...props}
      fill={theme === "dark" ? "#64748b" : "#8884d8"} // Handle color
      stroke={theme === "dark" ? "#94a3b8" : "#cbd5e1"} // Handle border
    />
  ),
});
