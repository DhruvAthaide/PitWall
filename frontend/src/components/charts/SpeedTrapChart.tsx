"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { SpeedTrap } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface SpeedTrapChartProps {
  data: SpeedTrap[];
  data2?: SpeedTrap[];
  driver1Color?: string;
  driver2Color?: string;
  driver1Name?: string;
  driver2Name?: string;
  loading?: boolean;
}

export default function SpeedTrapChart({
  data,
  data2,
  driver1Color = "#e11d48",
  driver2Color = "#3b82f6",
  driver1Name = "Driver 1",
  driver2Name = "Driver 2",
  loading = false,
}: SpeedTrapChartProps) {
  if (loading) return <ChartSkeleton />;

  // Merge by trap_name (not index) to handle different ordering
  const data2Map = new Map(data2?.map((t) => [t.trap_name, t.speed]));
  const chartData = data.map((trap) => ({
    trap_name: trap.trap_name,
    speed1: trap.speed,
    speed2: data2Map.get(trap.trap_name),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="trap_name"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          angle={-30}
          textAnchor="end"
          height={60}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          domain={["auto", "auto"]}
          label={{ value: "km/h", angle: -90, position: "insideLeft", fill: "#9ca3af" }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [`${Number(value).toFixed(1)} km/h`]) as any}
        />
        {data2 && <Legend wrapperStyle={{ color: "#9ca3af" }} />}
        <Bar dataKey="speed1" fill={driver1Color} name={driver1Name} radius={[4, 4, 0, 0]} />
        {data2 && (
          <Bar dataKey="speed2" fill={driver2Color} name={driver2Name} radius={[4, 4, 0, 0]} />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
}
