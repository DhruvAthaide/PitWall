"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { StintDegradation } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface StintDegradationChartProps {
  data: StintDegradation[];
  loading?: boolean;
}

export default function StintDegradationChart({ data, loading = false }: StintDegradationChartProps) {
  if (loading) return <ChartSkeleton />;

  // Build merged data: each row has lap_number + a column per stint
  const allLaps: Record<number, Record<string, number>> = {};

  for (const stint of data) {
    for (const lap of stint.laps) {
      if (!allLaps[lap.lap_number]) {
        allLaps[lap.lap_number] = { lap_number: lap.lap_number };
      }
      allLaps[lap.lap_number][`stint_${stint.stint}`] = lap.time_seconds;
    }
  }

  const chartData = Object.values(allLaps).sort(
    (a, b) => a.lap_number - b.lap_number
  );

  const formatTime = (val: number) => {
    const mins = Math.floor(val / 60);
    const secs = (val % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : `${secs}s`;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="lap_number"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          label={{ value: "Lap", position: "insideBottom", offset: -4, fill: "#9ca3af" }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={formatTime}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [formatTime(Number(value))]) as any}
          labelFormatter={(label) => `Lap ${label}`}
        />
        <Legend
          wrapperStyle={{ color: "#9ca3af" }}
          formatter={(value: string) => {
            const stintNum = parseInt(value.replace("stint_", ""));
            const stint = data.find((s) => s.stint === stintNum);
            if (!stint) return value;
            return `${stint.compound} (${stint.degradation_per_lap > 0 ? "+" : ""}${stint.degradation_per_lap.toFixed(3)}s/lap)`;
          }}
        />
        {data.map((stint) => (
          <Line
            key={stint.stint}
            type="monotone"
            dataKey={`stint_${stint.stint}`}
            stroke={stint.color}
            strokeWidth={2}
            dot={{ fill: stint.color, r: 3 }}
            name={`stint_${stint.stint}`}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
