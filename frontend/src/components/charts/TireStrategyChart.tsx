"use client";

import type { TireStint } from "@/types";
import ChartSkeleton from "./ChartSkeleton";

interface TireStrategyChartProps {
  stints: TireStint[];
  stints2?: TireStint[];
  driver1Name?: string;
  driver2Name?: string;
  totalLaps?: number;
  loading?: boolean;
}

export default function TireStrategyChart({
  stints,
  stints2,
  driver1Name = "Driver 1",
  driver2Name = "Driver 2",
  totalLaps,
  loading = false,
}: TireStrategyChartProps) {
  if (loading) return <ChartSkeleton />;

  const maxLap = totalLaps || Math.max(
    ...stints.map((s) => s.end_lap),
    ...(stints2 || []).map((s) => s.end_lap),
    1
  );

  const renderStints = (driverStints: TireStint[], label: string) => (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400 font-mono">{label}</span>
      <div className="flex h-8 rounded-md overflow-hidden border border-white/10">
        {driverStints.map((stint) => {
          const widthPct = (stint.laps / maxLap) * 100;
          return (
            <div
              key={stint.stint_number}
              className="flex items-center justify-center text-xs font-bold text-black/80 transition-all"
              style={{
                width: `${widthPct}%`,
                backgroundColor: stint.color,
                minWidth: widthPct > 3 ? undefined : "24px",
              }}
              title={`${stint.compound} - Laps ${stint.start_lap}-${stint.end_lap} (${stint.laps} laps)`}
            >
              {widthPct > 8 && (
                <span className="truncate px-1">
                  {stint.compound.charAt(0)} ({stint.laps})
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Lap markers
  const markers = [];
  const step = maxLap > 50 ? 10 : maxLap > 20 ? 5 : 1;
  for (let i = 0; i <= maxLap; i += step) {
    markers.push(i);
  }

  return (
    <div className="w-full space-y-3">
      {renderStints(stints, driver1Name)}
      {stints2 && renderStints(stints2, driver2Name)}
      <div className="flex justify-between text-xs text-gray-500 px-0.5">
        {markers.map((lap) => (
          <span key={lap}>{lap}</span>
        ))}
      </div>
    </div>
  );
}
