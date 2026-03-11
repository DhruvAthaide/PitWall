"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { GearDistribution } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

const GEAR_COLORS: Record<number, string> = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#14b8a6",
  6: "#3b82f6",
  7: "#8b5cf6",
  8: "#ec4899",
};

interface GearChartProps {
  data: GearDistribution[];
  loading?: boolean;
}

export default function GearChart({ data, loading = false }: GearChartProps) {
  if (loading) return <ChartSkeleton />;

  const chartData = data.map((d) => ({
    name: `Gear ${d.gear}`,
    value: d.percentage,
    gear: d.gear,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={100}
          dataKey="value"
          nameKey="name"
          label={({ name, value }: any) =>
            Number(value) > 3 ? `${name ?? ""}: ${Number(value).toFixed(1)}%` : ""
          }
          labelLine={false}
        >
          {chartData.map((entry) => (
            <Cell
              key={`gear-${entry.gear}`}
              fill={GEAR_COLORS[entry.gear] || "#6b7280"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          itemStyle={{ color: "#fff" }}
          formatter={((value: any) => [`${Number(value).toFixed(1)}%`, "Usage"]) as any}
        />
        <Legend
          wrapperStyle={{ color: "#9ca3af" }}
          formatter={(value: string) => <span style={{ color: "#9ca3af" }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
