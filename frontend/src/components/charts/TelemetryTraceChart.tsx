"use client";

import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  ComposedChart,
  Legend,
  ReferenceArea,
} from "recharts";
import type { TelemetryPoint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface TelemetryTraceChartProps {
  data: TelemetryPoint[];
  data2?: TelemetryPoint[];
  driver1Color?: string;
  driver2Color?: string;
  loading?: boolean;
}

interface MergedTelemetry {
  distance: number;
  speed1?: number;
  speed2?: number;
  throttle1?: number;
  throttle2?: number;
  brake1?: number;
  brake2?: number;
  drs1?: number;
  drs2?: number;
}

export default function TelemetryTraceChart({
  data,
  data2,
  driver1Color = "#e11d48",
  driver2Color = "#3b82f6",
  loading = false,
}: TelemetryTraceChartProps) {
  if (loading) return <ChartSkeleton />;
  if (data.length === 0 && (!data2 || data2.length === 0)) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500 text-sm">
        No telemetry data available
      </div>
    );
  }

  let merged: MergedTelemetry[];

  if (data2) {
    const distMap = new Map<number, MergedTelemetry>();
    for (const p of data) {
      distMap.set(p.distance, {
        distance: p.distance,
        speed1: p.speed,
        throttle1: p.throttle,
        brake1: p.brake * 100,
        drs1: p.drs,
      });
    }
    for (const p of data2) {
      const existing = distMap.get(p.distance);
      if (existing) {
        existing.speed2 = p.speed;
        existing.throttle2 = p.throttle;
        existing.brake2 = p.brake * 100;
        existing.drs2 = p.drs;
      } else {
        distMap.set(p.distance, {
          distance: p.distance,
          speed2: p.speed,
          throttle2: p.throttle,
          brake2: p.brake * 100,
          drs2: p.drs,
        });
      }
    }
    merged = Array.from(distMap.values()).sort((a, b) => a.distance - b.distance);
  } else {
    merged = data.map((p) => ({
      distance: p.distance,
      speed1: p.speed,
      throttle1: p.throttle,
      brake1: p.brake * 100,
      drs1: p.drs,
    }));
  }

  // Identify DRS zones for reference areas
  const drsZones: { start: number; end: number }[] = [];
  let drsStart: number | null = null;
  for (const p of merged) {
    if ((p.drs1 && p.drs1 >= 10) || (p.drs2 && p.drs2 >= 10)) {
      if (drsStart === null) drsStart = p.distance;
    } else {
      if (drsStart !== null) {
        drsZones.push({ start: drsStart, end: p.distance });
        drsStart = null;
      }
    }
  }
  if (drsStart !== null && merged.length > 0) {
    drsZones.push({ start: drsStart, end: merged[merged.length - 1].distance });
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={merged} margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
        <XAxis
          dataKey="distance"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(1)}km`}
        />
        <YAxis
          yAxisId="speed"
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          label={{ value: "km/h", angle: -90, position: "insideLeft", fill: "#9ca3af", fontSize: 11 }}
        />
        <YAxis
          yAxisId="pct"
          orientation="right"
          domain={[0, 100]}
          tick={{ fill: "#9ca3af", fontSize: 11 }}
          label={{ value: "%", angle: 90, position: "insideRight", fill: "#9ca3af", fontSize: 11 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#1a1a2e", border: "1px solid #333", borderRadius: 8 }}
          labelStyle={{ color: "#9ca3af" }}
          itemStyle={{ color: "#fff" }}
          labelFormatter={(label) => `${(Number(label) / 1000).toFixed(2)} km`}
        />
        <Legend wrapperStyle={{ color: "#9ca3af" }} />

        {/* DRS zones as green bands */}
        {drsZones.map((zone, i) => (
          <ReferenceArea
            key={`drs-${i}`}
            x1={zone.start}
            x2={zone.end}
            yAxisId="speed"
            fill="#00ff00"
            fillOpacity={0.1}
            label={{ value: "DRS", fill: "#00ff00", fontSize: 10, position: "insideTop" }}
          />
        ))}

        {/* Brake as shaded area */}
        <Area
          type="monotone"
          dataKey="brake1"
          yAxisId="pct"
          fill="#ef4444"
          fillOpacity={0.15}
          stroke="none"
          name="Brake"
        />

        {/* Speed lines */}
        <Line
          type="monotone"
          dataKey="speed1"
          yAxisId="speed"
          stroke={driver1Color}
          dot={false}
          strokeWidth={2}
          name="Speed"
        />
        {data2 && (
          <Line
            type="monotone"
            dataKey="speed2"
            yAxisId="speed"
            stroke={driver2Color}
            dot={false}
            strokeWidth={2}
            name="Speed (D2)"
          />
        )}

        {/* Throttle lines */}
        <Line
          type="monotone"
          dataKey="throttle1"
          yAxisId="pct"
          stroke="#22c55e"
          dot={false}
          strokeWidth={1}
          strokeDasharray="4 2"
          name="Throttle"
        />
        {data2 && (
          <Line
            type="monotone"
            dataKey="throttle2"
            yAxisId="pct"
            stroke="#86efac"
            dot={false}
            strokeWidth={1}
            strokeDasharray="4 2"
            name="Throttle (D2)"
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
