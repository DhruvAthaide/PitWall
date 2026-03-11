"use client";

// Custom CSS box plot — no recharts needed
import type { LapDistribution } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface LapDistributionChartProps {
  data: LapDistribution | null;
  loading?: boolean;
}

export default function LapDistributionChart({ data, loading = false }: LapDistributionChartProps) {
  if (loading) return <ChartSkeleton />;
  if (!data) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-gray-500">
        No distribution data available
      </div>
    );
  }

  const formatTime = (val: number) => {
    const mins = Math.floor(val / 60);
    const secs = (val % 60).toFixed(3);
    return mins > 0 ? `${mins}:${secs.padStart(6, "0")}` : `${secs}s`;
  };

  // Build custom box plot data
  const boxData = [
    {
      name: "Lap Times",
      min: data.whisker_low,
      q1: data.q1,
      median: data.median,
      q3: data.q3,
      max: data.whisker_high,
      // bar from Q1 to Q3
      barBase: data.q1,
      barHeight: data.q3 - data.q1,
    },
  ];

  const outlierData = data.outliers.map((val, i) => ({
    name: `Outlier ${i + 1}`,
    x: 0,
    y: val,
  }));

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-4">
        {/* Box plot visualization using pure CSS/divs for clarity */}
        <div className="w-full max-w-md mx-auto">
          <div className="relative h-48 flex items-center justify-center">
            {/* Vertical scale */}
            <div className="relative w-24 h-full flex flex-col justify-between items-center">
              {/* Whisker line (full) */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-px bg-gray-400"
                style={{
                  top: `${((data.whisker_high - data.whisker_high) / (data.whisker_high - data.whisker_low + 0.001)) * 100}%`,
                  bottom: `${((data.whisker_low - data.whisker_low) / (data.whisker_high - data.whisker_low + 0.001)) * 100}%`,
                  height: "100%",
                }}
              />
              {/* Whisker top cap */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-px bg-gray-400" />
              {/* Whisker bottom cap */}
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-px bg-gray-400" />

              {/* IQR box */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-16 border border-blue-400 bg-blue-500/20 rounded"
                style={{
                  top: `${((data.whisker_high - data.q3) / (data.whisker_high - data.whisker_low + 0.001)) * 100}%`,
                  bottom: `${((data.q1 - data.whisker_low) / (data.whisker_high - data.whisker_low + 0.001)) * 100}%`,
                }}
              />

              {/* Median line */}
              <div
                className="absolute left-1/2 -translate-x-1/2 w-16 h-0.5 bg-yellow-400"
                style={{
                  top: `${((data.whisker_high - data.median) / (data.whisker_high - data.whisker_low + 0.001)) * 100}%`,
                }}
              />

              {/* Outlier dots */}
              {data.outliers.map((val, i) => {
                const pct = ((data.whisker_high - val) / (data.whisker_high - data.whisker_low + 0.001)) * 100;
                if (pct < -10 || pct > 110) return null;
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-400"
                    style={{ top: `${Math.max(-5, Math.min(105, pct))}%` }}
                    title={formatTime(val)}
                  />
                );
              })}
            </div>

            {/* Labels */}
            <div className="ml-6 flex flex-col justify-between h-full text-xs text-gray-400">
              <span>Max: {formatTime(data.whisker_high)}</span>
              <div className="flex flex-col gap-1">
                <span>Q3: {formatTime(data.q3)}</span>
                <span className="text-yellow-400 font-semibold">Median: {formatTime(data.median)}</span>
                <span>Q1: {formatTime(data.q1)}</span>
              </div>
              <span>Min: {formatTime(data.whisker_low)}</span>
            </div>
          </div>

          <div className="text-center mt-2 text-xs text-gray-500">
            {data.count} laps | {data.outliers.length} outlier{data.outliers.length !== 1 ? "s" : ""}
          </div>
        </div>
      </div>
    </div>
  );
}
