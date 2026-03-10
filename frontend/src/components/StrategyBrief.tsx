"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import type { StrategyBrief as StrategyBriefType } from "@/types";

interface Props {
  raceId: number | null;
  compact?: boolean;
}

const sections = [
  { key: "top_pick", label: "TOP PICK", icon: "M5 3l14 9-14 9V3z" },
  { key: "value_play", label: "VALUE PLAY", icon: "M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { key: "danger_zone", label: "DANGER ZONE", icon: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" },
  { key: "drs_call", label: "DRS CALL", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
];

const sectionColors: Record<string, string> = {
  top_pick: "var(--neon-green)",
  value_play: "var(--neon-cyan)",
  danger_zone: "var(--f1-red)",
  drs_call: "var(--neon-purple)",
};

export default function StrategyBrief({ raceId, compact = false }: Props) {
  const [brief, setBrief] = useState<StrategyBriefType | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(!compact);

  useEffect(() => {
    if (!raceId) return;
    setLoading(true);
    api.getStrategyBrief(raceId)
      .then((data) => {
        if (data && "race_name" in data) setBrief(data);
        else setBrief(null);
      })
      .catch(() => setBrief(null))
      .finally(() => setLoading(false));
  }, [raceId]);

  if (loading) {
    return (
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-4 h-4 rounded shimmer" />
          <div className="h-4 w-32 rounded shimmer" />
        </div>
        <div className="space-y-2">
          <div className="h-3 w-full rounded shimmer" />
          <div className="h-3 w-3/4 rounded shimmer" />
        </div>
      </div>
    );
  }

  if (!brief) return null;

  const visibleSections = compact && !expanded ? sections.slice(0, 2) : sections;

  return (
    <div className="glass-card overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-4 rounded-full" style={{ background: "var(--f1-red)" }} />
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Strategy Brief</span>
        </div>
        <span className="text-[10px] text-gray-600 font-mono">
          {brief.circuit_name}
        </span>
      </div>

      {/* Sections */}
      <div className="p-4 space-y-3">
        {visibleSections.map((section, i) => {
          const text = brief[section.key as keyof StrategyBriefType];
          if (!text || typeof text !== "string") return null;

          return (
            <motion.div
              key={section.key}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 mt-0.5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: `${sectionColors[section.key]}15`, border: `1px solid ${sectionColors[section.key]}30` }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={sectionColors[section.key]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={section.icon} />
                  </svg>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider mb-0.5" style={{ color: sectionColors[section.key] }}>
                  {section.label}
                </p>
                <p className="text-[12px] text-gray-300 leading-relaxed">{text}</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Expand/Collapse for compact mode */}
      {compact && sections.length > 2 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-[11px] text-gray-500 hover:text-gray-300 transition-colors"
          style={{ borderTop: "1px solid var(--card-border)" }}
        >
          {expanded ? "Show less" : `Show ${sections.length - 2} more insights`}
        </button>
      )}
    </div>
  );
}
