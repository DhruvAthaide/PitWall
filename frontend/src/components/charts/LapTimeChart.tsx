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
import type { LapTimePoint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

const COMPOUND_COLORS: Record<string, string> = {
  SOFT: "#ff3333",
  MEDIUM: "#ffd000",
  HARD: "#ffffff",
  INTERMEDIATE: "#00cc00",
  WET: "#0066ff",
};

interface LapTimeChartProps {
  data: LapTimePoint[];
  data2?: LapTimePoint[];
  driver1Color?: string;
  driver2Color?: string;
  loading?: boolean;
}

interface MergedLap {
  lap_number: number;
  time1?: number;
  time2?: number;
  compound1?: string;
  compound2?: string;
}

export default function LapTimeChart({
  data,
  data2,
  driver1Color = "#e11d48",
  driver2Color = "#3b82f6",
  loading = false,
}: LapTimeChartProps) {
  if (loading) return <ChartSkeleton />;

  const merged: MergedLap[] = [];
  const lapMap = new Map<number, MergedLap>();

  for (const p of data) {
    const entry: MergedLap = { lap_number: p.lap_number, time1: p.time_seconds, compound1: p.compound };
    lapMap.set(p.lap_number, entry);
    merged.push(entry);
  }

  if (data2) {
    for (const p of data2) {
      const existing = lapMap.get(p.lap_number);
      if (existing) {
        existing.time2 = p.time_seconds;
        existing.compound2 = p.compound;
      } else {
        const entry: MergedLap = { lap_number: p.lap_number, time2: p.time_seconds, compound2: p.compound };
        merged.push(entry);
      }
    }
    merged.sort((a, b) => a.lap_number - b.lap_number);
  }

  const formatTime = (val: number) => {
    const mins = Math.floor(val / 60);
    const secs = (val % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : `${secs}s`;
  };

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
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={formatTime}
          domain={["auto", "auto"]}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [formatTime(Number(value)), "Lap Time"]) as any}
          labelFormatter={(label) => `Lap ${label}`}
        />
        {data2 && <Legend wrapperStyle={{ color: "#9ca3af" }} />}
        <Line
          type="monotone"
          dataKey="time1"
          stroke={driver1Color}
          dot={(props: Record<string, unknown>) => {
            const { cx, cy, payload } = props as { cx: number; cy: number; payload: MergedLap };
            const compound = payload.compound1 || "MEDIUM";
            return (
              <circle
                key={`d1-${payload.lap_number}`}
                cx={cx}
                cy={cy}
                r={3}
                fill={COMPOUND_COLORS[compound] || "#fff"}
                stroke={driver1Color}
                strokeWidth={1}
              />
            );
          }}
          name="Driver 1"
          connectNulls
        />
        {data2 && (
          <Line
            type="monotone"
            dataKey="time2"
            stroke={driver2Color}
            dot={(props: Record<string, unknown>) => {
              const { cx, cy, payload } = props as { cx: number; cy: number; payload: MergedLap };
              const compound = payload.compound2 || "MEDIUM";
              return (
                <circle
                  key={`d2-${payload.lap_number}`}
                  cx={cx}
                  cy={cy}
                  r={3}
                  fill={COMPOUND_COLORS[compound] || "#fff"}
                  stroke={driver2Color}
                  strokeWidth={1}
                />
              );
            }}
            name="Driver 2"
            connectNulls
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
