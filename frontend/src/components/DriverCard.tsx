"use client";

import { motion } from "framer-motion";
import type { Driver } from "@/types";

interface DriverCardProps {
  driver: Driver;
  selected?: boolean;
  isDrsBoost?: boolean;
  onSelect?: () => void;
  onDrsBoost?: () => void;
  compact?: boolean;
}

export default function DriverCard({
  driver,
  selected = false,
  isDrsBoost = false,
  onSelect,
  onDrsBoost,
  compact = false,
}: DriverCardProps) {
  return (
    <motion.div
      onClick={onSelect}
      whileHover={{ scale: 1.02, y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className={`relative rounded-xl cursor-pointer overflow-hidden glass-card ${selected ? "glow-red" : ""}`}
      style={{
        background: selected ? "var(--card-hover)" : "var(--card-bg)",
        border: `1px solid ${selected ? "var(--f1-red)" : "var(--card-border)"}`,
      }}
    >
      {/* Team color left accent */}
      <div
        className="absolute top-0 left-0 w-[3px] h-full rounded-l-xl"
        style={{ backgroundColor: driver.constructor_color, opacity: selected ? 1 : 0.5 }}
      />
      {/* Team color glow on selected */}
      {selected && (
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ background: `radial-gradient(ellipse at left, ${driver.constructor_color}, transparent 70%)` }}
        />
      )}

      <div className={compact ? "p-2.5 pl-3.5" : "p-3.5 pl-4"}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center font-black text-xs driver-number"
              style={{
                backgroundColor: `${driver.constructor_color}18`,
                color: driver.constructor_color,
                border: `1px solid ${driver.constructor_color}30`,
              }}
            >
              {driver.number}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className={`font-bold tracking-tight ${compact ? "text-xs" : "text-sm"}`}>
                  {driver.code}
                </span>
                {isDrsBoost && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider"
                    style={{ background: "var(--neon-purple)", color: "white", boxShadow: "0 0 8px rgba(153, 69, 255, 0.4)" }}
                  >
                    DRS
                  </span>
                )}
              </div>
              {!compact && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {driver.first_name} {driver.last_name}
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className={`font-mono font-semibold ${compact ? "text-xs" : "text-sm"}`}>
              ${driver.price}M
            </div>
            {driver.expected_pts !== null && driver.expected_pts !== undefined && (
              <div className="text-[11px] font-mono mt-0.5" style={{ color: "var(--neon-green)" }}>
                {driver.expected_pts.toFixed(1)} xPts
              </div>
            )}
          </div>
        </div>

        {!compact && (
          <div className="flex items-center justify-between mt-3 pt-2.5" style={{ borderTop: "1px solid var(--card-border)" }}>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: driver.constructor_color }} />
              <span className="text-[11px] text-gray-500">{driver.constructor_name}</span>
            </div>
            {onDrsBoost && selected && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); onDrsBoost(); }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`text-[10px] font-semibold px-2.5 py-1 rounded-lg uppercase tracking-wider transition-colors ${
                  isDrsBoost
                    ? "text-white"
                    : "text-gray-500 hover:text-purple-400"
                }`}
                style={isDrsBoost
                  ? { background: "var(--neon-purple)", boxShadow: "0 0 12px rgba(153, 69, 255, 0.4)" }
                  : { background: "var(--card-bg-solid)", border: "1px solid var(--card-border)" }
                }
              >
                {isDrsBoost ? "DRS Active" : "Set DRS"}
              </motion.button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
