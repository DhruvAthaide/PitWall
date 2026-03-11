"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { api } from "@/lib/api";
import { getMyTeam, saveMyTeam } from "@/lib/storage";
import type { SavedTeam } from "@/lib/storage";
import type { Driver, Constructor, Race, TeamComparisonResponse, SwapSuggestion } from "@/types";
import RaceSelector from "@/components/RaceSelector";

// ─── What-If local type ─────────────────────────────────────────────
interface WhatIfResult {
  original_total: number;
  modified_total: number;
  differential: number;
  original_breakdown: { asset_type: string; asset_id: number; name: string; color: string; base_pts: number; multiplier: number; scored_pts: number }[];
  modified_breakdown: { asset_type: string; asset_id: number; name: string; color: string; base_pts: number; multiplier: number; scored_pts: number }[];
  swaps: { type: string; out: { name: string; color: string; scored_pts: number }; in: { name: string; color: string; scored_pts: number }; diff: number }[];
  drs_changed: boolean;
  drs_diff: number;
}

// ─── My Team Tab ────────────────────────────────────────────────────
function MyTeamTab({
  drivers,
  constructors,
  races,
  selectedRaceId,
  setSelectedRaceId,
  selectedDrivers,
  setSelectedDrivers,
  selectedConstructors,
  setSelectedConstructors,
  drsDriverId,
  setDrsDriverId,
  onTeamSaved,
}: {
  drivers: Driver[];
  constructors: Constructor[];
  races: Race[];
  selectedRaceId: number | null;
  setSelectedRaceId: (id: number | null) => void;
  selectedDrivers: number[];
  setSelectedDrivers: React.Dispatch<React.SetStateAction<number[]>>;
  selectedConstructors: number[];
  setSelectedConstructors: React.Dispatch<React.SetStateAction<number[]>>;
  drsDriverId: number | null;
  setDrsDriverId: (id: number | null) => void;
  onTeamSaved: () => void;
}) {
  const [comparison, setComparison] = useState<TeamComparisonResponse | null>(null);
  const [comparing, setComparing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);

  const toggleDriver = (id: number) => {
    setSelectedDrivers((prev) => {
      if (prev.includes(id)) {
        const remaining = prev.filter((x) => x !== id);
        if (drsDriverId === id) {
          setDrsDriverId(remaining[0] || null);
        }
        return remaining;
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
    setComparison(null);
    setSaved(false);
  };

  const toggleConstructor = (id: number) => {
    setSelectedConstructors((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
    setComparison(null);
    setSaved(false);
  };

  const totalCost = [
    ...drivers.filter((d) => selectedDrivers.includes(d.id)).map((d) => d.price),
    ...constructors.filter((c) => selectedConstructors.includes(c.id)).map((c) => c.price),
  ].reduce((a, b) => a + b, 0);

  const isTeamComplete = selectedDrivers.length === 5 && selectedConstructors.length === 2 && drsDriverId !== null;

  const handleSave = () => {
    if (!isTeamComplete || !drsDriverId) return;
    saveMyTeam({ driver_ids: selectedDrivers, constructor_ids: selectedConstructors, drs_driver_id: drsDriverId });
    setSaved(true);
    onTeamSaved();
    setTimeout(() => setSaved(false), 2000);
  };

  const handleCompare = async () => {
    if (!isTeamComplete || !selectedRaceId || !drsDriverId) return;
    setComparing(true);
    try {
      const result = await api.compareMyTeam({
        driver_ids: selectedDrivers,
        constructor_ids: selectedConstructors,
        drs_driver_id: drsDriverId,
        race_id: selectedRaceId,
      });
      setComparison(result);
    } catch { /* sim may not exist */ }
    setComparing(false);
  };

  const handleAutoFill = async () => {
    if (!selectedRaceId) return;
    setAutoFilling(true);
    try {
      const teams = await api.getBestTeams({
        budget: 100,
        race_id: selectedRaceId,
        include_drivers: [],
        exclude_drivers: [],
        include_constructors: [],
        exclude_constructors: [],
        drs_multiplier: 2,
        top_n: 1,
      });
      if (teams.length > 0) {
        const best = teams[0];
        setSelectedDrivers(best.drivers.map((d: any) => d.id));
        setSelectedConstructors(best.constructors.map((c: any) => c.id));
        setDrsDriverId(best.drs_driver?.id || null);
        setSaved(false);
        setComparison(null);
      }
    } catch { /* sim may not exist */ }
    setAutoFilling(false);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Track your fantasy team and compare vs optimal picks</p>
          <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.25)" }}>Your team is saved in this browser only</p>
        </div>
        <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
      </motion.div>

      {/* Budget Bar */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="glass-card p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--neon-cyan)" }}>Budget</span>
          <span className="text-sm font-mono font-bold" style={{ color: totalCost > 100 ? "var(--f1-red)" : "var(--neon-green)" }}>
            ${totalCost.toFixed(1)}M / $100.0M
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (totalCost / 100) * 100)}%`, background: totalCost > 100 ? "var(--f1-red)" : "var(--neon-green)" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
          <span>{selectedDrivers.length}/5 Drivers</span>
          <span>{selectedConstructors.length}/2 Constructors</span>
          <span style={{ color: drsDriverId ? "var(--neon-purple)" : "rgba(255,255,255,0.4)" }}>{drsDriverId ? "DRS set" : "No DRS driver"}</span>
          {totalCost > 100 && <span className="font-semibold" style={{ color: "var(--f1-red)" }}>Over budget!</span>}
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleAutoFill}
            disabled={!selectedRaceId || autoFilling}
            className="px-4 py-2 rounded-lg text-xs font-bold transition-all"
            style={{
              background: selectedRaceId ? "var(--neon-cyan)" : "var(--card-border)",
              color: selectedRaceId ? "#050508" : "rgba(255,255,255,0.3)",
              opacity: autoFilling ? 0.6 : 1,
            }}
          >
            {autoFilling ? "Optimizing..." : "Fill Optimal Team"}
          </button>
          {!selectedRaceId && (
            <span className="text-[10px] self-center" style={{ color: "rgba(255,255,255,0.3)" }}>
              Select a race first
            </span>
          )}
        </div>
      </motion.div>

      {/* Driver Selection */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Select 5 Drivers</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {drivers.map((d) => {
            const selected = selectedDrivers.includes(d.id);
            const isDrs = drsDriverId === d.id;
            return (
              <div key={d.id} className="relative">
                <button
                  onClick={() => toggleDriver(d.id)}
                  className={`w-full rounded-xl px-3 py-3 text-left transition-all min-h-[80px] ${selected ? "" : "glass-card"}`}
                  style={selected ? { background: `${d.constructor_color}15`, border: `2px solid ${d.constructor_color}`, borderRadius: "12px" }
                    : undefined}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: d.constructor_color }} />
                    <span className="font-bold text-sm">{d.code}</span>
                  </div>
                  <div className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{d.constructor_name}</div>
                  <div className="text-xs font-mono mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>${d.price}M</div>
                </button>
                {selected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setDrsDriverId(isDrs ? null : d.id); setSaved(false); }}
                    className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded text-[9px] font-bold transition-all ${isDrs ? "glow-purple" : ""}`}
                    style={isDrs ? { background: "var(--neon-purple)", color: "white" }
                      : { background: "var(--card-border)", color: "#9ca3af" }}
                  >
                    DRS
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Constructor Selection */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="space-y-4">
        <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>Select 2 Constructors</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {constructors.map((c) => {
            const selected = selectedConstructors.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleConstructor(c.id)}
                className={`rounded-xl px-3 py-3 text-left transition-all ${selected ? "" : "glass-card"}`}
                style={selected ? { background: `${c.color}15`, border: `2px solid ${c.color}`, borderRadius: "12px" }
                  : undefined}
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: c.color }} />
                  <span className="font-bold text-sm">{c.name}</span>
                </div>
                <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>${c.price}M</div>
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Actions */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-wrap gap-3">
        <button
          onClick={handleSave}
          disabled={!isTeamComplete}
          className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-30 ${saved ? "glow-green" : ""}`}
          style={{ background: saved ? "var(--neon-green)" : "var(--card-bg)", border: "1px solid var(--card-border)", color: saved ? "#000" : isTeamComplete ? "white" : "rgba(255,255,255,0.4)" }}
        >
          {saved ? "Saved!" : "Save Team"}
        </button>
        <button
          onClick={handleCompare}
          disabled={!isTeamComplete || !selectedRaceId || comparing}
          className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 glow-red"
          style={{ background: isTeamComplete && selectedRaceId ? "var(--f1-red)" : "var(--card-border)" }}
        >
          {comparing ? "Comparing..." : "Compare vs Optimal"}
        </button>
      </motion.div>

      {/* Comparison Results */}
      {comparison && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="racing-stripe" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: "Your Team", value: comparison.my_team_points, color: "var(--neon-green)" },
              { label: "Optimal Team", value: comparison.optimal_points, color: "var(--neon-cyan)" },
              { label: "Points Left on Table", value: comparison.points_left_on_table, color: comparison.points_left_on_table > 10 ? "var(--f1-red)" : comparison.points_left_on_table > 0 ? "var(--timing-yellow)" : "var(--neon-green)" },
            ].map((card) => (
              <div key={card.label} className="glass-card p-5 text-center">
                <p className="text-[10px] uppercase tracking-widest font-semibold mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>{card.label}</p>
                <p className="text-2xl font-black" style={{ color: card.color }}>{card.value.toFixed(1)}</p>
              </div>
            ))}
          </div>

          <div className="glass-card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                  {["Asset", "Expected Pts", "Role"].map((h, i) => (
                    <th key={h} className={`px-5 py-3.5 text-[10px] uppercase tracking-widest font-semibold ${i === 0 ? "text-left" : "text-right"}`} style={{ color: "rgba(255,255,255,0.3)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparison.driver_points.map((d) => (
                  <tr key={`d-${d.id}`} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td className="px-5 py-3 font-semibold">{d.name}</td>
                    <td className="px-5 py-3 text-right font-mono" style={{ color: "var(--neon-green)" }}>{d.points.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right">
                      {d.is_drs ? <span className="px-2 py-0.5 rounded text-[10px] font-bold glow-purple" style={{ background: "var(--neon-purple)", color: "white" }}>DRS x2</span> : <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Driver</span>}
                    </td>
                  </tr>
                ))}
                {comparison.constructor_points.map((c) => (
                  <tr key={`c-${c.id}`} className="transition-colors hover:bg-white/[0.02]" style={{ borderBottom: "1px solid var(--card-border)" }}>
                    <td className="px-5 py-3 font-semibold">{c.name}</td>
                    <td className="px-5 py-3 text-right font-mono" style={{ color: "var(--neon-green)" }}>{c.points.toFixed(1)}</td>
                    <td className="px-5 py-3 text-right text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Constructor</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Transfers Tab ──────────────────────────────────────────────────
function TransfersTab({
  races,
  selectedRaceId,
  setSelectedRaceId,
  drivers,
  constructors,
}: {
  races: Race[];
  selectedRaceId: number | null;
  setSelectedRaceId: (id: number | null) => void;
  drivers: Driver[];
  constructors: Constructor[];
}) {
  const [suggestions, setSuggestions] = useState<SwapSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const team = getMyTeam();
  const hasTeam = !!team;

  const teamCost = hasTeam
    ? [
        ...drivers.filter((d) => team!.driver_ids.includes(d.id)).map((d) => d.price),
        ...constructors.filter((c) => team!.constructor_ids.includes(c.id)).map((c) => c.price),
      ].reduce((a, b) => a + b, 0)
    : null;

  const budgetCap = 100;
  const remainingBudget = teamCost !== null ? budgetCap - teamCost : null;

  const handleAnalyze = async () => {
    const currentTeam = getMyTeam();
    if (!currentTeam || !selectedRaceId) return;
    setLoading(true);
    try {
      const data = await api.suggestTransfers({
        driver_ids: currentTeam.driver_ids,
        constructor_ids: currentTeam.constructor_ids,
        drs_driver_id: currentTeam.drs_driver_id,
        race_id: selectedRaceId,
        budget: remainingBudget ?? budgetCap,
      });
      setSuggestions(data);
      setSearched(true);
    } catch { setSuggestions([]); setSearched(true); }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <p className="text-xs sm:text-sm text-gray-500">Find the best swaps for your team this race week</p>
        <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
      </motion.div>

      {!hasTeam && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--card-border)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
              <polyline points="17 1 21 5 17 9" /><path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 font-medium">No Team Saved</p>
          <p className="text-xs text-gray-600 mt-1">Save your team in the My Team tab first, then come back for transfer suggestions</p>
        </motion.div>
      )}

      {hasTeam && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="flex flex-wrap items-center gap-4">
          <button
            onClick={handleAnalyze}
            disabled={!selectedRaceId || loading}
            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30"
            style={{ background: selectedRaceId ? "var(--f1-red)" : "var(--card-border)" }}
          >
            {loading ? "Analyzing swaps..." : "Find Best Swaps"}
          </button>

          {remainingBudget !== null && (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl glass-card">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--neon-cyan)" }}>
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                Budget remaining:
              </span>
              <span
                className="text-xs font-mono font-bold"
                style={{ color: remainingBudget >= 0 ? "var(--neon-green)" : "var(--f1-red)" }}
              >
                ${remainingBudget.toFixed(1)}M
              </span>
            </div>
          )}
        </motion.div>
      )}

      {searched && suggestions.length === 0 && !loading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--card-border)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-6" />
            </svg>
          </div>
          <p className="text-sm text-gray-500 font-medium">No Swap Suggestions</p>
          <p className="text-xs text-gray-600 mt-1">Run a simulation for this race first, then swap suggestions will appear based on expected points</p>
        </motion.div>
      )}

      {suggestions.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {suggestions.map((s, i) => (
            <div
              key={`${s.out_id}-${s.in_id}`}
              className={`glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center gap-3 ${i === 0 ? "glow-green" : ""}`}
              style={i === 0 ? {
                background: "rgba(0,255,135,0.04)",
                borderColor: "rgba(0,255,135,0.25)",
              } : {}}
            >
              {/* Rank */}
              <div className="text-lg font-black text-gray-600 w-8 shrink-0">#{i + 1}</div>

              {/* OUT */}
              <div className="flex items-center gap-2 min-w-[120px]">
                <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(225,6,0,0.15)", color: "var(--f1-red)" }}>OUT</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: s.out_color }} />
                  <span className="font-semibold text-sm">{s.out_name}</span>
                </div>
                <span className="text-xs font-mono text-gray-500">{s.out_points.toFixed(1)}pts</span>
              </div>

              {/* Arrow */}
              <div className="hidden sm:block" style={{ color: "var(--neon-cyan)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
              </div>

              {/* IN */}
              <div className="flex items-center gap-2 min-w-[120px]">
                <div className="px-2 py-1 rounded-lg text-xs font-bold" style={{ background: "rgba(0,255,135,0.15)", color: "var(--neon-green)" }}>IN</div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: s.in_color }} />
                  <span className="font-semibold text-sm">{s.in_name}</span>
                </div>
                <span className="text-xs font-mono text-gray-500">{s.in_points.toFixed(1)}pts</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 sm:ml-auto">
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gain</div>
                  <div className="text-sm font-bold font-mono" style={{ color: s.points_gained > 0 ? "var(--neon-green)" : "var(--f1-red)" }}>
                    {s.points_gained > 0 ? "+" : ""}{s.points_gained.toFixed(1)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Cost</div>
                  <div className="text-sm font-mono" style={{ color: s.cost_delta > 0 ? "var(--f1-red)" : s.cost_delta < 0 ? "var(--neon-green)" : "#6b7280" }}>
                    {s.cost_delta > 0 ? "+" : ""}{s.cost_delta.toFixed(1)}M
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
}

// ─── What-If Tab ────────────────────────────────────────────────────
function WhatIfTab({
  races,
  selectedRaceId,
  setSelectedRaceId,
  drivers,
  constructors,
}: {
  races: Race[];
  selectedRaceId: number | null;
  setSelectedRaceId: (id: number | null) => void;
  drivers: Driver[];
  constructors: Constructor[];
}) {
  const [myTeam, setMyTeam] = useState<SavedTeam | null>(null);
  const [hasTeam, setHasTeam] = useState(false);

  // Modified team state
  const [modDrivers, setModDrivers] = useState<number[]>([]);
  const [modConstructors, setModConstructors] = useState<number[]>([]);
  const [modDrs, setModDrs] = useState<number | null>(null);

  const [result, setResult] = useState<WhatIfResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const team = getMyTeam();
    setMyTeam(team);
    setHasTeam(!!team);
    if (team) {
      setModDrivers([...team.driver_ids]);
      setModConstructors([...team.constructor_ids]);
      setModDrs(team.drs_driver_id);
    }
  }, []);

  const toggleDriver = (id: number) => {
    setModDrivers((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((x) => x !== id);
        // Auto-correct DRS if the removed driver was the DRS pick
        if (modDrs === id) {
          setModDrs(next[0] || null);
        }
        return next;
      }
      if (prev.length >= 5) return prev;
      return [...prev, id];
    });
    setResult(null);
  };

  const toggleConstructor = (id: number) => {
    setModConstructors((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
    setResult(null);
  };

  const handleCompare = async () => {
    if (!myTeam || !selectedRaceId || modDrivers.length !== 5 || modConstructors.length !== 2 || !modDrs) return;
    setLoading(true);
    try {
      const data = await api.whatIf({
        race_id: selectedRaceId,
        original_driver_ids: myTeam.driver_ids,
        original_constructor_ids: myTeam.constructor_ids,
        original_drs_driver_id: myTeam.drs_driver_id,
        modified_driver_ids: modDrivers,
        modified_constructor_ids: modConstructors,
        modified_drs_driver_id: modDrs,
      });
      setResult(data);
    } catch { /* */ }
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <p className="text-xs sm:text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Compare alternative team picks vs your actual team</p>
        <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
      </motion.div>

      {!hasTeam && (
        <div className="text-center py-16">
          <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>No Team Saved</p>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>Save your team in the My Team tab first</p>
        </div>
      )}

      {hasTeam && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Modified Team Builder */}
          <div className="glass-card p-5">
            <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--neon-cyan)" }}>
              Alternative Team ({modDrivers.length}/5 drivers, {modConstructors.length}/2 constructors)
            </h3>

            {/* Drivers */}
            <div className="mb-3">
              <p className="text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Drivers</p>
              <div className="flex flex-wrap gap-1.5">
                {drivers.map((d) => {
                  const sel = modDrivers.includes(d.id);
                  const isOrig = myTeam?.driver_ids.includes(d.id);
                  return (
                    <button key={d.id} onClick={() => toggleDriver(d.id)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={sel
                        ? { background: `${d.constructor_color}30`, border: `1px solid ${d.constructor_color}`, color: d.constructor_color }
                        : { background: "var(--surface)", border: "1px solid var(--card-border)", color: "#6b7280" }
                      }
                    >
                      {d.code}
                      {sel && !isOrig && <span className="ml-0.5" style={{ color: "var(--neon-green)" }}>+</span>}
                      {!sel && isOrig && <span className="ml-0.5" style={{ color: "var(--f1-red)" }}>-</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DRS */}
            {modDrivers.length > 0 && (
              <div className="mb-3">
                <p className="text-[10px] mb-1.5" style={{ color: "var(--neon-purple)" }}>DRS Captain</p>
                <div className="flex flex-wrap gap-1.5">
                  {modDrivers.map((did) => {
                    const d = drivers.find((dr) => dr.id === did);
                    return (
                      <button key={did} onClick={() => { setModDrs(did); setResult(null); }}
                        className={`px-2 py-1 rounded text-[9px] font-bold ${modDrs === did ? "glow-purple" : ""}`}
                        style={modDrs === did ? { background: "var(--neon-purple)", color: "white" } : { background: "var(--card-border)", color: "#9ca3af" }}
                      >
                        {d?.code}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Constructors */}
            <div className="mb-4">
              <p className="text-[10px] mb-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>Constructors</p>
              <div className="flex flex-wrap gap-1.5">
                {constructors.map((c) => {
                  const sel = modConstructors.includes(c.id);
                  const isOrig = myTeam?.constructor_ids.includes(c.id);
                  return (
                    <button key={c.id} onClick={() => toggleConstructor(c.id)}
                      className="px-2 py-1 rounded-lg text-[10px] font-bold transition-all"
                      style={sel
                        ? { background: `${c.color}30`, border: `1px solid ${c.color}`, color: c.color }
                        : { background: "var(--surface)", border: "1px solid var(--card-border)", color: "#6b7280" }
                      }
                    >
                      {c.name}
                      {sel && !isOrig && <span className="ml-0.5" style={{ color: "var(--neon-green)" }}>+</span>}
                      {!sel && isOrig && <span className="ml-0.5" style={{ color: "var(--f1-red)" }}>-</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <button onClick={handleCompare}
              disabled={!selectedRaceId || loading || modDrivers.length !== 5 || modConstructors.length !== 2 || !modDrs}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30 glow-red"
              style={{ background: "var(--f1-red)" }}
            >
              {loading ? "Comparing..." : "Compare Teams"}
            </button>
          </div>

          {/* Results */}
          {result && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Differential */}
              <div className={`glass-card p-5 text-center ${result.differential > 0 ? "glow-green" : result.differential < 0 ? "glow-red" : ""}`}
                style={{
                  background: result.differential > 0 ? "rgba(0,255,135,0.06)" : result.differential < 0 ? "rgba(225,6,0,0.06)" : "var(--card-bg)",
                  border: result.differential > 0 ? "1px solid rgba(0,255,135,0.25)" : result.differential < 0 ? "1px solid rgba(225,6,0,0.25)" : "1px solid var(--card-border)",
                }}
              >
                <div className="text-[10px] uppercase tracking-widest font-semibold mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {result.differential > 0 ? "Alternative team scores more" : result.differential < 0 ? "Your team scores more" : "Teams are equal"}
                </div>
                <div className="text-3xl font-black font-mono" style={{ color: result.differential > 0 ? "var(--neon-green)" : result.differential < 0 ? "var(--f1-red)" : "rgba(255,255,255,0.4)" }}>
                  {result.differential > 0 ? "+" : ""}{result.differential.toFixed(1)} pts
                </div>
                <div className="flex justify-center gap-6 mt-2 text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                  <span>Your Team: <span className="font-mono text-white">{result.original_total.toFixed(1)}</span></span>
                  <span>Alt Team: <span className="font-mono text-white">{result.modified_total.toFixed(1)}</span></span>
                </div>
              </div>

              {/* Swaps Impact */}
              {result.swaps.length > 0 && (
                <div className="glass-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "var(--neon-cyan)" }}>Swap Impact</h3>
                  <div className="racing-stripe mb-3" />
                  <div className="space-y-2">
                    {result.swaps.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(225,6,0,0.15)", color: "var(--f1-red)" }}>OUT</span>
                          <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: s.out.color }} />
                          <span className="text-sm font-semibold">{s.out.name}</span>
                          <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{s.out.scored_pts.toFixed(1)}</span>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ background: "rgba(0,255,135,0.15)", color: "var(--neon-green)" }}>IN</span>
                          <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: s.in.color }} />
                          <span className="text-sm font-semibold">{s.in.name}</span>
                          <span className="text-[10px] font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>{s.in.scored_pts.toFixed(1)}</span>
                        </div>
                        <span className="ml-auto text-sm font-mono font-bold" style={{ color: s.diff > 0 ? "var(--neon-green)" : s.diff < 0 ? "var(--f1-red)" : "rgba(255,255,255,0.4)" }}>
                          {s.diff > 0 ? "+" : ""}{s.diff.toFixed(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Side by Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { label: "Your Team", breakdown: result.original_breakdown, total: result.original_total },
                  { label: "Alternative Team", breakdown: result.modified_breakdown, total: result.modified_total },
                ].map((side) => (
                  <div key={side.label} className="glass-card p-4">
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>{side.label}</h4>
                      <span className="text-sm font-mono font-bold" style={{ color: "var(--neon-green)" }}>{side.total.toFixed(1)}</span>
                    </div>
                    <div className="racing-stripe mb-3" />
                    <div className="space-y-1.5">
                      {side.breakdown.map((b) => (
                        <div key={`${b.asset_type}-${b.asset_id}`} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-3 rounded-full" style={{ backgroundColor: b.color }} />
                            <span className="text-xs font-semibold">{b.name}</span>
                            {b.multiplier === 2 && <span className="text-[8px] font-bold px-1 rounded" style={{ background: "var(--neon-purple)", color: "white" }}>2x</span>}
                          </div>
                          <span className="text-xs font-mono" style={{ color: "var(--neon-green)" }}>{b.scored_pts.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────
const tabs = ["My Team", "Transfers", "What-If"] as const;
type Tab = (typeof tabs)[number];

export default function TeamManagementPage() {
  const [activeTab, setActiveTab] = useState<Tab>("My Team");
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);

  // Shared team state (My Team + Transfers can share)
  const [selectedDrivers, setSelectedDrivers] = useState<number[]>([]);
  const [selectedConstructors, setSelectedConstructors] = useState<number[]>([]);
  const [drsDriverId, setDrsDriverId] = useState<number | null>(null);

  // Track saves so Transfers tab can react
  const [teamSaveCount, setTeamSaveCount] = useState(0);

  useEffect(() => {
    Promise.all([api.getDrivers(), api.getConstructors(), api.getRaces()]).then(
      ([d, c, r]) => {
        setDrivers(d);
        setConstructors(c);
        setRaces(r);
        const team = getMyTeam();
        if (team) {
          setSelectedDrivers(team.driver_ids);
          setSelectedConstructors(team.constructor_ids);
          setDrsDriverId(team.drs_driver_id);
        }
      }
    ).catch(() => {});
    api.getNextRace().then((next) => {
      if (next) setSelectedRaceId(next.id);
    }).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Team Management</h1>
      </motion.div>

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "My Team" && (
        <MyTeamTab
          drivers={drivers}
          constructors={constructors}
          races={races}
          selectedRaceId={selectedRaceId}
          setSelectedRaceId={setSelectedRaceId}
          selectedDrivers={selectedDrivers}
          setSelectedDrivers={setSelectedDrivers}
          selectedConstructors={selectedConstructors}
          setSelectedConstructors={setSelectedConstructors}
          drsDriverId={drsDriverId}
          setDrsDriverId={setDrsDriverId}
          onTeamSaved={() => setTeamSaveCount((c) => c + 1)}
        />
      )}

      {activeTab === "Transfers" && (
        <TransfersTab
          key={teamSaveCount}
          races={races}
          selectedRaceId={selectedRaceId}
          setSelectedRaceId={setSelectedRaceId}
          drivers={drivers}
          constructors={constructors}
        />
      )}

      {activeTab === "What-If" && (
        <WhatIfTab
          races={races}
          selectedRaceId={selectedRaceId}
          setSelectedRaceId={setSelectedRaceId}
          drivers={drivers}
          constructors={constructors}
        />
      )}
    </div>
  );
}
