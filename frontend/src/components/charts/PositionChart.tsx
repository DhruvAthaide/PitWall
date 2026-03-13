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
import type { PositionPoint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface PositionChartProps {
  data: PositionPoint[];
  data2?: PositionPoint[];
  driver1Color?: string;
  driver2Color?: string;
  loading?: boolean;
}

interface MergedPosition {
  lap_number: number;
  position1?: number;
  position2?: number;
}

export default function PositionChart({
  data,
  data2,
  driver1Color = "#e11d48",
  driver2Color = "#3b82f6",
  loading = false,
}: PositionChartProps) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0 && (!data2 || data2.length === 0)) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm">
        No position data available
      </div>
    );
  }

  const merged: MergedPosition[] = [];
  const lapMap = new Map<number, MergedPosition>();

  for (const p of data) {
    const entry: MergedPosition = { lap_number: p.lap_number, position1: p.position };
    lapMap.set(p.lap_number, entry);
    merged.push(entry);
  }

  if (data2) {
    for (const p of data2) {
      const existing = lapMap.get(p.lap_number);
      if (existing) {
        existing.position2 = p.position;
      } else {
        merged.push({ lap_number: p.lap_number, position2: p.position });
      }
    }
    merged.sort((a, b) => a.lap_number - b.lap_number);
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={merged} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="lap_number"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          label={{ value: "Lap", position: "insideBottom", offset: -4, fill: "#9ca3af" }}
        />
        <YAxis
          reversed
          domain={[1, 20]}
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          label={{ value: "Position", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [`P${value}`]) as any}
          labelFormatter={(label) => `Lap ${label}`}
        />
        {data2 && <Legend wrapperStyle={{ color: "#9ca3af" }} />}
        <Line
          type="stepAfter"
          dataKey="position1"
          stroke={driver1Color}
          strokeWidth={2}
          dot={false}
          name="Driver 1"
          connectNulls
        />
        {data2 && (
          <Line
            type="stepAfter"
            dataKey="position2"
            stroke={driver2Color}
            strokeWidth={2}
            dot={false}
            name="Driver 2"
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
