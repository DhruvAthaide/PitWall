"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import type { Race, Driver, RaceResultEntry, DriverScorecard, SeasonSummary } from "@/types";
import RaceSelector from "@/components/RaceSelector";

type PageTab = "Race Results" | "Season Tracker";
type ResultsSubTab = "results" | "scorecard";
type IngestStatus = "idle" | "loading" | "exists" | "ingested" | "pending" | "unavailable" | "error" | "manual";

interface EntryRow {
  driver_id: number;
  code: string;
  name: string;
  constructor_color: string;
  quali: string;
  race: string;
  dnf: boolean;
  fastest_lap: boolean;
  dotd: boolean;
  overtakes: string;
}

function PositionBadge({ position }: { position: number }) {
  if (position >= 1 && position <= 3) {
    return (
      <span
        className={`pos-badge-${position} inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-black`}
      >
        P{position}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-xs font-mono text-gray-400">
      P{position}
    </span>
  );
}

function StatusBadge({ status }: { status: IngestStatus }) {
  if (status === "exists" || status === "ingested") {
    return (
      <span className="status-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Auto-loaded
      </span>
    );
  }
  if (status === "pending") {
    return (
      <span className="status-pending inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Pending
      </span>
    );
  }
  if (status === "manual") {
    return (
      <span className="status-manual inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        Manual
      </span>
    );
  }
  if (status === "loading") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)" }}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
        Loading...
      </span>
    );
  }
  if (status === "error" || status === "unavailable") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider text-gray-500"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid var(--card-border)" }}
      >
        {status === "error" ? "Error" : "Unavailable"}
      </span>
    );
  }
  return null;
}

export default function ResultsPage() {
  // Page-level tab
  const pageTabs: PageTab[] = ["Race Results", "Season Tracker"];
  const [activePageTab, setActivePageTab] = useState<PageTab>("Race Results");

  // ── Race Results state ──
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [resultsSubTab, setResultsSubTab] = useState<ResultsSubTab>("results");

  const [results, setResults] = useState<RaceResultEntry[]>([]);
  const [ingestStatus, setIngestStatus] = useState<IngestStatus>("idle");

  const [manualMode, setManualMode] = useState(false);
  const [entries, setEntries] = useState<EntryRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [scorecard, setScorecard] = useState<DriverScorecard[]>([]);

  // ── Season Tracker state ──
  const [seasonData, setSeasonData] = useState<SeasonSummary | null>(null);
  const [seasonLoading, setSeasonLoading] = useState(false);
  const [seasonLoaded, setSeasonLoaded] = useState(false);

  // ── Race Results effects ──
  useEffect(() => {
    Promise.all([api.getRaces(), api.getDrivers()]).then(([r, d]) => {
      setRaces(r);
      setDrivers(d);
    }).catch(() => {});
    api.getNextRace().then((next) => {
      if (next) setSelectedRaceId(next.id);
    }).catch(() => {});
  }, []);

  const initializeEntries = useCallback(
    (existingResults?: RaceResultEntry[]) => {
      setEntries(
        drivers.map((d) => {
          const ex = existingResults?.find((e) => e.driver_id === d.id);
          return {
            driver_id: d.id,
            code: d.code,
            name: `${d.first_name} ${d.last_name}`,
            constructor_color: d.constructor_color,
            quali: ex ? String(ex.qualifying_position) : "",
            race: ex ? String(ex.race_position) : "",
            dnf: ex?.dnf ?? false,
            fastest_lap: ex?.fastest_lap ?? false,
            dotd: ex?.dotd ?? false,
            overtakes: ex ? String(ex.overtakes) : "0",
          };
        })
      );
    },
    [drivers]
  );

  useEffect(() => {
    if (!selectedRaceId || drivers.length === 0) return;

    setManualMode(false);
    setSaved(false);
    setResults([]);
    setScorecard([]);
    setIngestStatus("loading");

    api
      .autoIngestResults(selectedRaceId)
      .then((response) => {
        const status = response.status as IngestStatus;
        setIngestStatus(status);

        if (
          (status === "exists" || status === "ingested") &&
          response.results &&
          response.results.length > 0
        ) {
          const sorted = [...response.results].sort(
            (a, b) => (a.dnf ? 999 : a.race_position) - (b.dnf ? 999 : b.race_position)
          );
          setResults(sorted);
          initializeEntries(response.results);
        } else {
          initializeEntries();
        }
      })
      .catch(() => {
        setIngestStatus("error");
        initializeEntries();
      });

    api
      .getScorecard(selectedRaceId)
      .then(setScorecard)
      .catch(() => setScorecard([]));
  }, [selectedRaceId, drivers, initializeEntries]);

  // ── Season Tracker effect (only loads when tab is active) ──
  useEffect(() => {
    if (activePageTab !== "Season Tracker" || seasonLoaded) return;
    setSeasonLoading(true);
    api.getSeasonSummary()
      .then(setSeasonData)
      .catch(() => {})
      .finally(() => {
        setSeasonLoading(false);
        setSeasonLoaded(true);
      });
  }, [activePageTab, seasonLoaded]);

  const updateEntry = (idx: number, field: keyof EntryRow, value: string | boolean) => {
    setEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
    setSaved(false);
  };

  const handleSave = async () => {
    if (!selectedRaceId) return;
    const valid = entries.filter((e) => e.quali && e.race);
    if (valid.length === 0) return;

    setSaving(true);
    try {
      await api.submitResults(
        selectedRaceId,
        valid.map((e) => ({
          driver_id: e.driver_id,
          qualifying_position: Number(e.quali),
          race_position: Number(e.race),
          dnf: e.dnf,
          fastest_lap: e.fastest_lap,
          dotd: e.dotd,
          overtakes: Number(e.overtakes),
        }))
      );
      setSaved(true);
      setIngestStatus("manual");

      const [newResults, sc] = await Promise.all([
        api.getResults(selectedRaceId),
        api.getScorecard(selectedRaceId),
      ]);
      const sorted = [...newResults].sort(
        (a, b) => (a.dnf ? 999 : a.race_position) - (b.dnf ? 999 : b.race_position)
      );
      setResults(sorted);
      setScorecard(sc);
      setManualMode(false);
    } catch {
      /* */
    }
    setSaving(false);
  };

  const selectedRace = races.find((r) => r.id === selectedRaceId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Results & Season</h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Race results, scorecards, and cumulative season standings
          </p>
        </div>
      </motion.div>

      {/* Page-level Tab Bar */}
      <div className="flex gap-1 bg-white/5 rounded-xl p-1 mb-6">
        {pageTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActivePageTab(tab)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activePageTab === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ════════════ Race Results Tab ════════════ */}
      {activePageTab === "Race Results" && (
        <motion.div
          key="race-results"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-6"
        >
          {/* Race Selector */}
          <div className="flex justify-end">
            <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
          </div>

          {/* Empty state */}
          {!selectedRaceId && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card text-center py-20"
            >
              <div className="text-3xl mb-3 opacity-20">&#9873;</div>
              <p className="text-sm text-gray-500 font-medium">Select a race to view results</p>
              <p className="text-xs text-gray-600 mt-1">
                Results are auto-loaded when available
              </p>
            </motion.div>
          )}

          {selectedRaceId && (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedRaceId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="space-y-5"
              >
                {/* Race info bar + status */}
                <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-1 h-8 rounded-full"
                      style={{ background: "var(--f1-red)" }}
                    />
                    <div>
                      <div className="text-sm font-bold">{selectedRace?.name}</div>
                      <div className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {selectedRace?.circuit_name} / {selectedRace?.country}
                        {selectedRace?.has_sprint ? " // Sprint Weekend" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={ingestStatus} />
                    {!manualMode &&
                      ingestStatus !== "loading" && (
                        <button
                          onClick={() => {
                            setManualMode(true);
                            if (results.length > 0) {
                              initializeEntries(results);
                            }
                          }}
                          className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                          style={{ border: "1px solid var(--card-border)", color: "#6b7280" }}
                        >
                          Manual Entry
                        </button>
                      )}
                    {manualMode && (
                      <button
                        onClick={() => setManualMode(false)}
                        className="text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all hover:bg-white/5"
                        style={{ border: "1px solid var(--card-border)", color: "#6b7280" }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>

                {/* Sub-tabs: Results / Scorecard */}
                <div className="flex gap-2">
                  {(
                    [
                      { key: "results", label: "Results" },
                      { key: "scorecard", label: "Scorecard" },
                    ] as { key: ResultsSubTab; label: string }[]
                  ).map((t) => (
                    <button
                      key={t.key}
                      onClick={() => setResultsSubTab(t.key)}
                      className="relative px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
                      style={
                        resultsSubTab === t.key
                          ? { background: "var(--f1-red)", color: "white" }
                          : {
                              background: "var(--card-bg)",
                              border: "1px solid var(--card-border)",
                              color: "#6b7280",
                            }
                      }
                    >
                      {t.label}
                      {t.key === "scorecard" && scorecard.length > 0 && (
                        <span
                          className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                          style={{ background: "var(--neon-green)" }}
                        />
                      )}
                    </button>
                  ))}
                </div>

                {/* Results Sub-Tab */}
                {resultsSubTab === "results" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {/* Loading state */}
                    {ingestStatus === "loading" && (
                      <div className="glass-card p-12 text-center">
                        <div className="inline-block w-6 h-6 border-2 border-gray-600 border-t-[var(--f1-red)] rounded-full animate-spin mb-3" />
                        <p className="text-xs text-gray-500 font-medium">
                          Fetching results...
                        </p>
                      </div>
                    )}

                    {/* Read-only results view */}
                    {!manualMode && ingestStatus !== "loading" && (
                      <>
                        {results.length === 0 ? (
                          <div className="glass-card text-center py-16">
                            <p className="text-sm text-gray-500 font-medium">
                              No Results Available
                            </p>
                            <p className="text-xs text-gray-600 mt-1">
                              {ingestStatus === "pending"
                                ? "Race results are not yet published"
                                : "Use Manual Entry to add results"}
                            </p>
                          </div>
                        ) : (
                          <div
                            className="glass-card overflow-hidden"
                          >
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm" style={{ minWidth: 600 }}>
                                <thead>
                                  <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                                    {["Pos", "Driver", "Quali", "Race", "FL", "DotD", "OT"].map(
                                      (h, i) => (
                                        <th
                                          key={h}
                                          className={`px-4 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold ${
                                            i <= 1 ? "text-left" : "text-center"
                                          }`}
                                        >
                                          {h}
                                        </th>
                                      )
                                    )}
                                  </tr>
                                </thead>
                                <tbody>
                                  {results.map((r, idx) => (
                                    <motion.tr
                                      key={r.driver_id}
                                      initial={{ opacity: 0, x: -8 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: idx * 0.03, duration: 0.2 }}
                                      className="hover:bg-white/[0.02] transition-colors"
                                      style={{
                                        borderBottom: "1px solid var(--card-border)",
                                      }}
                                    >
                                      <td className="px-4 py-3">
                                        {r.dnf ? (
                                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg text-[10px] font-black bg-red-500/20 text-red-400">
                                            DNF
                                          </span>
                                        ) : (
                                          <PositionBadge position={r.race_position} />
                                        )}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2.5">
                                          <div
                                            className="w-1 h-5 rounded-full"
                                            style={{
                                              backgroundColor: r.constructor_color,
                                            }}
                                          />
                                          <div>
                                            <span className="font-bold text-xs">
                                              {r.code}
                                            </span>
                                            <span className="text-[10px] text-gray-500 ml-2 hidden sm:inline">
                                              {r.name}
                                            </span>
                                          </div>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="font-mono text-xs text-gray-400">
                                          P{r.qualifying_position}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="font-mono text-xs text-gray-400">
                                          {r.dnf ? "DNF" : `P${r.race_position}`}
                                        </span>
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {r.fastest_lap ? (
                                          <span
                                            className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-black"
                                            style={{
                                              background: "rgba(153, 69, 255, 0.2)",
                                              color: "var(--neon-purple)",
                                            }}
                                          >
                                            FL
                                          </span>
                                        ) : (
                                          <span className="text-gray-700">--</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        {r.dotd ? (
                                          <span
                                            className="inline-flex items-center justify-center w-6 h-6 rounded text-[10px] font-black"
                                            style={{
                                              background: "rgba(0, 212, 255, 0.2)",
                                              color: "var(--neon-cyan)",
                                            }}
                                          >
                                            D
                                          </span>
                                        ) : (
                                          <span className="text-gray-700">--</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-center">
                                        <span className="font-mono text-xs text-gray-400">
                                          {r.overtakes > 0 ? `+${r.overtakes}` : "--"}
                                        </span>
                                      </td>
                                    </motion.tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Manual entry mode */}
                    {manualMode && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        <div className="glass-card overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm" style={{ minWidth: 700 }}>
                              <thead>
                                <tr
                                  style={{
                                    borderBottom: "1px solid var(--card-border)",
                                  }}
                                >
                                  {[
                                    "Driver",
                                    "Quali",
                                    "Race",
                                    "DNF",
                                    "FL",
                                    "DotD",
                                    "Overtakes",
                                  ].map((h, i) => (
                                    <th
                                      key={h}
                                      className={`px-3 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold ${
                                        i === 0 ? "text-left" : "text-center"
                                      }`}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {entries.map((e, i) => (
                                  <tr
                                    key={e.driver_id}
                                    style={{
                                      borderBottom: "1px solid var(--card-border)",
                                    }}
                                  >
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-1.5 h-4 rounded-full"
                                          style={{
                                            backgroundColor: e.constructor_color,
                                          }}
                                        />
                                        <span className="font-semibold text-xs">
                                          {e.code}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <input
                                        type="number"
                                        min="1"
                                        max="22"
                                        value={e.quali}
                                        onChange={(ev) =>
                                          updateEntry(i, "quali", ev.target.value)
                                        }
                                        className="w-12 text-center text-xs font-mono bg-transparent rounded-lg py-1 outline-none focus:ring-1"
                                        style={{
                                          border: "1px solid var(--card-border)",
                                        }}
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <input
                                        type="number"
                                        min="1"
                                        max="22"
                                        value={e.race}
                                        onChange={(ev) =>
                                          updateEntry(i, "race", ev.target.value)
                                        }
                                        className="w-12 text-center text-xs font-mono bg-transparent rounded-lg py-1 outline-none focus:ring-1"
                                        style={{
                                          border: "1px solid var(--card-border)",
                                        }}
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        onClick={() => updateEntry(i, "dnf", !e.dnf)}
                                        className={`w-6 h-6 rounded text-[10px] font-bold ${
                                          e.dnf
                                            ? "bg-red-500/20 text-red-400"
                                            : "text-gray-600"
                                        }`}
                                        style={
                                          !e.dnf
                                            ? {
                                                border:
                                                  "1px solid var(--card-border)",
                                              }
                                            : {}
                                        }
                                      >
                                        {e.dnf ? "X" : ""}
                                      </button>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        onClick={() =>
                                          updateEntry(
                                            i,
                                            "fastest_lap",
                                            !e.fastest_lap
                                          )
                                        }
                                        className={`w-6 h-6 rounded text-[10px] font-bold ${
                                          e.fastest_lap
                                            ? "bg-purple-500/20 text-purple-400"
                                            : "text-gray-600"
                                        }`}
                                        style={
                                          !e.fastest_lap
                                            ? {
                                                border:
                                                  "1px solid var(--card-border)",
                                              }
                                            : {}
                                        }
                                      >
                                        {e.fastest_lap ? "FL" : ""}
                                      </button>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        onClick={() =>
                                          updateEntry(i, "dotd", !e.dotd)
                                        }
                                        className={`w-6 h-6 rounded text-[10px] font-bold ${
                                          e.dotd
                                            ? "bg-cyan-500/20 text-cyan-400"
                                            : "text-gray-600"
                                        }`}
                                        style={
                                          !e.dotd
                                            ? {
                                                border:
                                                  "1px solid var(--card-border)",
                                              }
                                            : {}
                                        }
                                      >
                                        {e.dotd ? "D" : ""}
                                      </button>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <input
                                        type="number"
                                        min="0"
                                        max="50"
                                        value={e.overtakes}
                                        onChange={(ev) =>
                                          updateEntry(i, "overtakes", ev.target.value)
                                        }
                                        className="w-12 text-center text-xs font-mono bg-transparent rounded-lg py-1 outline-none focus:ring-1"
                                        style={{
                                          border: "1px solid var(--card-border)",
                                        }}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-30"
                            style={{ background: "var(--f1-red)" }}
                          >
                            {saving ? "Saving..." : "Save Results"}
                          </button>
                          {saved && (
                            <motion.span
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-xs font-semibold"
                              style={{ color: "var(--neon-green)" }}
                            >
                              Saved! Check the Scorecard tab.
                            </motion.span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Scorecard Sub-Tab */}
                {resultsSubTab === "scorecard" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    {scorecard.length === 0 ? (
                      <div className="glass-card text-center py-16">
                        <p className="text-sm text-gray-500 font-medium">
                          No Scorecard Available
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          Results must be recorded before prediction accuracy can be
                          compared
                        </p>
                      </div>
                    ) : (
                      <>
                        {/* Summary stats */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {[
                            {
                              label: "Avg Actual",
                              value: (
                                scorecard.reduce((s, c) => s + c.total_pts, 0) /
                                scorecard.length
                              ).toFixed(1),
                              color: "var(--foreground)",
                            },
                            {
                              label: "Avg Predicted",
                              value:
                                scorecard.filter((c) => c.predicted_pts !== null)
                                  .length > 0
                                  ? (
                                      scorecard
                                        .filter((c) => c.predicted_pts !== null)
                                        .reduce(
                                          (s, c) => s + (c.predicted_pts ?? 0),
                                          0
                                        ) /
                                      scorecard.filter(
                                        (c) => c.predicted_pts !== null
                                      ).length
                                    ).toFixed(1)
                                  : "--",
                              color: "var(--neon-cyan)",
                            },
                            {
                              label: "Top Scorer",
                              value: [...scorecard].sort((a, b) => b.total_pts - a.total_pts)[0]?.code ?? "--",
                              color: "var(--neon-green)",
                            },
                            {
                              label: "Top Score",
                              value: [...scorecard].sort((a, b) => b.total_pts - a.total_pts)[0]?.total_pts.toFixed(1) ?? "--",
                              color: "var(--neon-green)",
                            },
                          ].map((s, idx) => (
                            <motion.div
                              key={s.label}
                              initial={{ opacity: 0, y: 8 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: idx * 0.05 }}
                              className="glass-card p-4"
                            >
                              <div className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold">
                                {s.label}
                              </div>
                              <div
                                className="text-xl font-black mt-1 driver-number"
                                style={{ color: s.color }}
                              >
                                {s.value}
                              </div>
                            </motion.div>
                          ))}
                        </div>

                        {/* Scorecard Table */}
                        <div className="glass-card overflow-hidden">
                          <div className="overflow-x-auto">
                            <table
                              className="w-full text-sm"
                              style={{ minWidth: 800 }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    borderBottom: "1px solid var(--card-border)",
                                  }}
                                >
                                  {[
                                    "Driver",
                                    "Q",
                                    "R",
                                    "Q Pts",
                                    "R Pts",
                                    "Pos+",
                                    "OT",
                                    "FL",
                                    "DotD",
                                    "DNF",
                                    "Total",
                                    "Predicted",
                                    "Diff",
                                  ].map((h, i) => (
                                    <th
                                      key={h}
                                      className={`px-3 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold ${
                                        i === 0 ? "text-left" : "text-right"
                                      }`}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {scorecard.map((c, idx) => (
                                  <motion.tr
                                    key={c.driver_id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{
                                      delay: idx * 0.025,
                                      duration: 0.2,
                                    }}
                                    className="hover:bg-white/[0.02] transition-colors"
                                    style={{
                                      borderBottom: "1px solid var(--card-border)",
                                    }}
                                  >
                                    <td className="px-3 py-2">
                                      <div className="flex items-center gap-2">
                                        <div
                                          className="w-1.5 h-4 rounded-full"
                                          style={{
                                            backgroundColor: c.constructor_color,
                                          }}
                                        />
                                        <span className="font-semibold">
                                          {c.code}
                                        </span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      <PositionBadge
                                        position={c.qualifying_position}
                                      />
                                    </td>
                                    <td className="px-3 py-2 text-right">
                                      {c.dnf ? (
                                        <span className="text-[10px] font-black text-red-400">
                                          DNF
                                        </span>
                                      ) : (
                                        <PositionBadge position={c.race_position} />
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {c.qualifying_pts}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {c.race_pts}
                                    </td>
                                    <td
                                      className={`px-3 py-2 text-right font-mono ${
                                        c.positions_gained_pts > 0
                                          ? "text-emerald-400"
                                          : c.positions_gained_pts < 0
                                          ? "text-red-400"
                                          : "text-gray-500"
                                      }`}
                                    >
                                      {c.positions_gained_pts > 0 ? "+" : ""}
                                      {c.positions_gained_pts}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-400">
                                      {c.overtake_pts}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {c.fastest_lap_pts > 0 ? (
                                        <span style={{ color: "var(--neon-purple)" }}>
                                          {c.fastest_lap_pts}
                                        </span>
                                      ) : (
                                        <span className="text-gray-700">--</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {c.dotd_pts > 0 ? (
                                        <span style={{ color: "var(--neon-cyan)" }}>
                                          {c.dotd_pts}
                                        </span>
                                      ) : (
                                        <span className="text-gray-700">--</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono">
                                      {c.dnf_penalty < 0 ? (
                                        <span className="text-red-400">
                                          {c.dnf_penalty}
                                        </span>
                                      ) : (
                                        <span className="text-gray-700">--</span>
                                      )}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono font-bold text-white">
                                      {c.total_pts.toFixed(1)}
                                    </td>
                                    <td className="px-3 py-2 text-right font-mono text-gray-400">
                                      {c.predicted_pts !== null
                                        ? c.predicted_pts.toFixed(1)
                                        : "--"}
                                    </td>
                                    <td
                                      className={`px-3 py-2 text-right font-mono font-bold ${
                                        c.prediction_diff !== null
                                          ? c.prediction_diff > 0
                                            ? "text-emerald-400"
                                            : c.prediction_diff < 0
                                            ? "text-red-400"
                                            : "text-gray-500"
                                          : "text-gray-600"
                                      }`}
                                    >
                                      {c.prediction_diff !== null
                                        ? `${
                                            c.prediction_diff > 0 ? "+" : ""
                                          }${c.prediction_diff.toFixed(1)}`
                                        : "--"}
                                    </td>
                                  </motion.tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </motion.div>
      )}

      {/* ════════════ Season Tracker Tab ════════════ */}
      {activePageTab === "Season Tracker" && (
        <motion.div
          key="season-tracker"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="space-y-8"
        >
          {seasonLoading && (
            <div className="flex items-center justify-center py-32">
              <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: "var(--f1-red)", borderTopColor: "transparent" }} />
            </div>
          )}

          {!seasonLoading && (
            <>
              {seasonData && seasonData.races_completed > 0 && (
                <p className="text-xs text-gray-500">
                  Cumulative fantasy points and trends across the season
                  <span className="ml-2" style={{ color: "var(--neon-cyan)" }}>({seasonData.races_completed} race{seasonData.races_completed > 1 ? "s" : ""} recorded)</span>
                </p>
              )}

              {(!seasonData || seasonData.drivers.length === 0) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                  <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--card-border)" }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#4b5563" strokeWidth="2">
                      <path d="M18 20V10M12 20V4M6 20v-6" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-500 font-medium">No Season Data</p>
                  <p className="text-xs text-gray-600 mt-1">Record race results first, then season stats will appear here</p>
                </motion.div>
              )}

              {seasonData && seasonData.drivers.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  {/* Top 3 Podium */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {seasonData.drivers.slice(0, 3).map((d, i) => (
                      <div key={d.driver_id}
                        className={`rounded-xl p-4 relative overflow-hidden ${i === 0 ? "glow-red" : "glass-card"}`}
                        style={i === 0 ? {
                          background: "rgba(225,6,0,0.06)",
                          border: "1px solid rgba(225,6,0,0.2)",
                          borderRadius: 12,
                        } : undefined}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-lg font-black w-8 h-8 rounded-lg flex items-center justify-center ${i === 0 ? "pos-badge-1" : i === 1 ? "pos-badge-2" : "pos-badge-3"}`}>
                            {i + 1}
                          </span>
                          <div className="w-1.5 h-5 rounded-full" style={{ backgroundColor: d.constructor_color }} />
                          <span className="font-bold">{d.name}</span>
                        </div>
                        <div className="text-2xl font-black" style={{ color: i === 0 ? "var(--f1-red)" : "var(--neon-green)" }}>
                          {d.total_pts.toFixed(1)} <span className="text-sm font-semibold text-gray-500">pts</span>
                        </div>
                        <div className="flex gap-3 mt-2 text-[10px] text-gray-500">
                          <span>Avg: <span className="font-mono" style={{ color: "var(--neon-cyan)" }}>{d.avg_pts.toFixed(1)}</span></span>
                          <span>Best: <span className="font-mono" style={{ color: "var(--neon-green)" }}>{d.best_pts.toFixed(1)}</span></span>
                          <span>Worst: <span className="font-mono" style={{ color: "var(--f1-red)" }}>{d.worst_pts.toFixed(1)}</span></span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Cumulative Points Chart (simple bar chart) */}
                  <div className="glass-card rounded-2xl p-5">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Season Standings</h3>
                    <div className="space-y-2">
                      {seasonData.drivers.map((d, i) => {
                        const maxPts = seasonData.drivers[0]?.total_pts || 1;
                        const barWidth = Math.max(5, (d.total_pts / maxPts) * 100);
                        return (
                          <div key={d.driver_id} className="flex items-center gap-3">
                            <span className={`text-xs font-bold w-6 h-6 rounded flex items-center justify-center ${i === 0 ? "pos-badge-1" : i === 1 ? "pos-badge-2" : i === 2 ? "pos-badge-3" : "text-gray-600"}`}>
                              {i + 1}
                            </span>
                            <div className="w-10 text-xs font-bold text-right" style={{ color: d.constructor_color }}>{d.code}</div>
                            <div className="flex-1 h-7 rounded-lg overflow-hidden relative" style={{ background: "var(--surface)" }}>
                              <div className="h-full rounded-lg transition-all duration-500 flex items-center px-2"
                                style={{ width: `${barWidth}%`, background: `${d.constructor_color}30` }}
                              >
                                <span className="text-[11px] font-mono font-bold whitespace-nowrap" style={{ color: "var(--neon-green)" }}>{d.total_pts.toFixed(1)}</span>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono w-14 text-right" style={{ color: "var(--neon-cyan)" }}>
                              avg {d.avg_pts.toFixed(1)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Full Table */}
                  <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm" style={{ minWidth: 700 }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--card-border)" }}>
                            {["#", "Driver", "Races", "Total", "Avg", "Best", "Best Race", "Worst", "Worst Race"].map((h, i) => (
                              <th key={h} className={`px-3 py-3 text-[10px] uppercase tracking-widest text-gray-600 font-semibold ${i <= 1 ? "text-left" : "text-right"}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {seasonData.drivers.map((d, i) => (
                            <tr key={d.driver_id} className="hover:bg-white/[0.02]"
                              style={{ borderBottom: "1px solid var(--card-border)", background: i < 3 ? "rgba(225,6,0,0.03)" : "transparent" }}
                            >
                              <td className="px-3 py-2">
                                <span className={`text-xs font-bold w-6 h-6 rounded inline-flex items-center justify-center ${i === 0 ? "pos-badge-1" : i === 1 ? "pos-badge-2" : i === 2 ? "pos-badge-3" : "text-gray-600"}`}>
                                  {i + 1}
                                </span>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: d.constructor_color }} />
                                  <span className="font-semibold">{d.name}</span>
                                </div>
                              </td>
                              <td className="px-3 py-2 text-right font-mono text-gray-400">{d.races_completed}</td>
                              <td className="px-3 py-2 text-right font-mono font-bold" style={{ color: "var(--neon-green)" }}>{d.total_pts.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--neon-cyan)" }}>{d.avg_pts.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--neon-green)" }}>{d.best_pts.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right text-xs text-gray-500">{d.best_race}</td>
                              <td className="px-3 py-2 text-right font-mono" style={{ color: "var(--f1-red)" }}>{d.worst_pts.toFixed(1)}</td>
                              <td className="px-3 py-2 text-right text-xs text-gray-500">{d.worst_race}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </motion.div>
              )}
            </>
          )}
        </motion.div>
      )}
    </div>
  );
}
