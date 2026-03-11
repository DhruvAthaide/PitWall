"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { GapPoint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface GapAnalysisChartProps {
  data: GapPoint[];
  driver1Name?: string;
  driver2Name?: string;
  loading?: boolean;
}

export default function GapAnalysisChart({
  data,
  driver1Name = "Driver 1",
  driver2Name = "Driver 2",
  loading = false,
}: GapAnalysisChartProps) {
  if (loading) return <ChartSkeleton />;

  // Split into positive (behind) and negative (ahead) for dual coloring
  const chartData = data.map((p) => ({
    distance: p.distance,
    delta: p.delta_seconds,
    positive: p.delta_seconds > 0 ? p.delta_seconds : 0,
    negative: p.delta_seconds < 0 ? p.delta_seconds : 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="distance"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}km`}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={(v: number) => `${v > 0 ? "+" : ""}${v.toFixed(2)}s`}
          label={{ value: "Delta (s)", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          formatter={((value: any, name: any) => {
            const v = Number(value ?? 0);
            if (name === "positive") return [`+${v.toFixed(3)}s`, `${driver1Name} behind`];
            if (name === "negative") return [`${v.toFixed(3)}s`, `${driver1Name} ahead`];
            return [v];
          }) as any}
          labelFormatter={(label) => `${(Number(label) / 1000).toFixed(2)} km`}
        />
        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
        <Area
          type="monotone"
          dataKey="positive"
          fill="#ef4444"
          fillOpacity={0.3}
          stroke="#ef4444"
          strokeWidth={1.5}
          name="positive"
        />
        <Area
          type="monotone"
          dataKey="negative"
          fill="#22c55e"
          fillOpacity={0.3}
          stroke="#22c55e"
          strokeWidth={1.5}
          name="negative"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
