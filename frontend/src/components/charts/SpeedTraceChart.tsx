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
import type { SpeedTracePoint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface SpeedTraceChartProps {
  data: SpeedTracePoint[];
  data2?: SpeedTracePoint[];
  driver1Color?: string;
  driver2Color?: string;
  driver1Name?: string;
  driver2Name?: string;
  loading?: boolean;
}

interface MergedPoint {
  distance: number;
  speed1?: number;
  speed2?: number;
}

export default function SpeedTraceChart({
  data,
  data2,
  driver1Color = "#e11d48",
  driver2Color = "#3b82f6",
  driver1Name = "Driver 1",
  driver2Name = "Driver 2",
  loading = false,
}: SpeedTraceChartProps) {
  if (loading) return <ChartSkeleton />;

  let merged: MergedPoint[];

  if (data2) {
    const distMap = new Map<number, MergedPoint>();
    for (const p of data) {
      distMap.set(p.distance, { distance: p.distance, speed1: p.speed });
    }
    for (const p of data2) {
      const existing = distMap.get(p.distance);
      if (existing) {
        existing.speed2 = p.speed;
      } else {
        distMap.set(p.distance, { distance: p.distance, speed2: p.speed });
      }
    }
    merged = Array.from(distMap.values()).sort((a, b) => a.distance - b.distance);
  } else {
    merged = data.map((p) => ({ distance: p.distance, speed1: p.speed }));
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={merged} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="distance"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}km`}
          label={{ value: "Distance", position: "insideBottom", offset: -4, fill: "#9ca3af" }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          label={{ value: "km/h", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [`${Number(value).toFixed(0)} km/h`]) as any}
          labelFormatter={(label) => `${(Number(label) / 1000).toFixed(2)} km`}
        />
        {data2 && <Legend wrapperStyle={{ color: "#9ca3af" }} />}
        <Line
          type="monotone"
          dataKey="speed1"
          stroke={driver1Color}
          dot={false}
          strokeWidth={2}
          name={driver1Name}
          connectNulls
        />
        {data2 && (
          <Line
            type="monotone"
            dataKey="speed2"
            stroke={driver2Color}
            dot={false}
            strokeWidth={2}
            name={driver2Name}
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
