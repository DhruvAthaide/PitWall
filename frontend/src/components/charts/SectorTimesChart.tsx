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
import type { SectorTimePoint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface SectorTimesChartProps {
  data: SectorTimePoint[];
  loading?: boolean;
}

export default function SectorTimesChart({ data, loading = false }: SectorTimesChartProps) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm">
        No sector time data available
      </div>
    );
  }

  const chartData = data.map((p) => ({
    lap_number: p.lap_number,
    S1: p.s1 ?? 0,
    S2: p.s2 ?? 0,
    S3: p.s3 ?? 0,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="lap_number"
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          label={{ value: "Lap", position: "insideBottom", offset: -4, fill: "#9ca3af" }}
        />
        <YAxis
          tick={{ fill: "#9ca3af", fontSize: 12 }}
          tickFormatter={(v: number) => `${v.toFixed(1)}s`}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [`${Number(value).toFixed(3)}s`]) as any}
          labelFormatter={(label) => `Lap ${label}`}
        />
        <Legend wrapperStyle={{ color: "#9ca3af" }} />
        <Bar dataKey="S1" fill="#e11d48" name="Sector 1" />
        <Bar dataKey="S2" fill="#3b82f6" name="Sector 2" />
        <Bar dataKey="S3" fill="#10b981" name="Sector 3" />
      </BarChart>
    </ResponsiveContainer>
  );
}
