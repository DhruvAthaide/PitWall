"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/api";
import { getMyTeam } from "@/lib/storage";
import type { Driver, Constructor, Race } from "@/types";
import RaceSelector from "@/components/RaceSelector";

export default function LiveScoring() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [constructors, setConstructors] = useState<Constructor[]>([]);
  const [races, setRaces] = useState<Race[]>([]);
  const [selectedRaceId, setSelectedRaceId] = useState<number | null>(null);
  const [myDriverIds, setMyDriverIds] = useState<number[]>([]);
  const [myConstructorIds, setMyConstructorIds] = useState<number[]>([]);
  const [isLive, setIsLive] = useState(false);
  const selectedRaceIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Load saved team from localStorage
    const savedTeam = getMyTeam();
    if (savedTeam) {
      setMyDriverIds(savedTeam.driver_ids);
      setMyConstructorIds(savedTeam.constructor_ids);
    }

    // Auto-select current/upcoming race
    Promise.all([
      api.getDrivers(),
      api.getConstructors(),
      api.getRaces(),
      api.getNextRace(),
    ]).then(([d, c, r, nextRace]) => {
      setDrivers(d);
      setConstructors(c);
      setRaces(r);
      if (nextRace && !selectedRaceIdRef.current) {
        setSelectedRaceId(nextRace.id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    selectedRaceIdRef.current = selectedRaceId;
  }, [selectedRaceId]);

  const toggleMyDriver = (id: number) => {
    setMyDriverIds((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const toggleMyConstructor = (id: number) => {
    setMyConstructorIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  };

  const myDrivers = drivers.filter((d) => myDriverIds.includes(d.id));
  const myConstructors = constructors.filter((c) => myConstructorIds.includes(c.id));
  const teamBudget = [...myDrivers, ...myConstructors].reduce((sum, a) => sum + a.price, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Live Scoring</h1>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{
              background: isLive ? "rgba(225,6,0,0.1)" : "var(--card-bg)",
              border: `1px solid ${isLive ? "rgba(225,6,0,0.3)" : "var(--card-border)"}`,
            }}>
              <div className={`w-2 h-2 rounded-full ${isLive ? "pulse-red" : ""}`} style={{ backgroundColor: isLive ? "var(--f1-red)" : "rgba(255,255,255,0.2)" }} />
              <span className="text-xs font-semibold" style={{ color: isLive ? "var(--f1-red)" : "rgba(255,255,255,0.35)" }}>
                {isLive ? "LIVE" : "OFFLINE"}
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Track your fantasy team points in real-time during race weekends</p>
        </div>
        <RaceSelector races={races} selectedRaceId={selectedRaceId} onSelect={setSelectedRaceId} />
      </motion.div>

      {/* Team Selection */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Drivers Selection */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--neon-cyan)" }}>Select Drivers</h3>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg" style={{
                background: myDriverIds.length === 5 ? "rgba(225,6,0,0.15)" : "var(--surface)",
                color: myDriverIds.length === 5 ? "var(--f1-red)" : "rgba(255,255,255,0.4)",
                border: `1px solid ${myDriverIds.length === 5 ? "rgba(225,6,0,0.3)" : "var(--card-border)"}`,
              }}>
                {myDriverIds.length}/5
              </span>
            </div>
            <div className="space-y-1.5">
              {drivers.map((d, i) => {
                const isSelected = myDriverIds.includes(d.id);
                return (
                  <motion.button
                    key={d.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => toggleMyDriver(d.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: isSelected ? "var(--card-hover)" : "transparent",
                      border: `1px solid ${isSelected ? d.constructor_color + "60" : "transparent"}`,
                    }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 rounded-full transition-opacity" style={{
                        backgroundColor: d.constructor_color,
                        opacity: isSelected ? 1 : 0.3,
                      }} />
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{
                        backgroundColor: isSelected ? `${d.constructor_color}20` : "var(--surface)",
                        color: isSelected ? d.constructor_color : "rgba(255,255,255,0.3)",
                        border: `1px solid ${isSelected ? d.constructor_color + "30" : "var(--card-border)"}`,
                      }}>
                        {d.number}
                      </div>
                      <div className="text-left">
                        <span className={`font-semibold text-xs ${isSelected ? "text-white" : ""}`} style={!isSelected ? { color: "rgba(255,255,255,0.4)" } : undefined}>
                          {d.code}
                        </span>
                        <span className="text-[10px] ml-2" style={{ color: "rgba(255,255,255,0.25)" }}>{d.first_name} {d.last_name}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>${d.price}M</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: d.constructor_color }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Constructors Selection */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--neon-cyan)" }}>Select Constructors</h3>
              <span className="text-xs font-mono px-2.5 py-1 rounded-lg" style={{
                background: myConstructorIds.length === 2 ? "rgba(225,6,0,0.15)" : "var(--surface)",
                color: myConstructorIds.length === 2 ? "var(--f1-red)" : "rgba(255,255,255,0.4)",
                border: `1px solid ${myConstructorIds.length === 2 ? "rgba(225,6,0,0.3)" : "var(--card-border)"}`,
              }}>
                {myConstructorIds.length}/2
              </span>
            </div>
            <div className="space-y-1.5">
              {constructors.map((c, i) => {
                const isSelected = myConstructorIds.includes(c.id);
                return (
                  <motion.button
                    key={c.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => toggleMyConstructor(c.id)}
                    className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm transition-all"
                    style={{
                      background: isSelected ? "var(--card-hover)" : "transparent",
                      border: `1px solid ${isSelected ? c.color + "60" : "transparent"}`,
                    }}
                    whileHover={{ x: 2 }}
                    whileTap={{ scale: 0.99 }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-1.5 h-6 rounded-full transition-opacity" style={{
                        backgroundColor: c.color,
                        opacity: isSelected ? 1 : 0.3,
                      }} />
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                        backgroundColor: isSelected ? `${c.color}20` : "var(--surface)",
                        border: `1px solid ${isSelected ? c.color + "30" : "var(--card-border)"}`,
                      }}>
                        <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: isSelected ? c.color : "rgba(255,255,255,0.3)" }} />
                      </div>
                      <span className={`font-semibold text-xs ${isSelected ? "text-white" : ""}`} style={!isSelected ? { color: "rgba(255,255,255,0.4)" } : undefined}>
                        {c.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>${c.price}M</span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: c.color }}
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                );
              })}
            </div>

            {/* Team Budget Summary */}
            {(myDriverIds.length > 0 || myConstructorIds.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="mt-5 pt-4"
                style={{ borderTop: "1px solid var(--card-border)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Team Budget</span>
                  <span className="text-sm font-mono font-bold" style={{ color: teamBudget > 100 ? "var(--f1-red)" : "var(--neon-green)" }}>
                    ${teamBudget.toFixed(1)}M / $100M
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--card-border)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((teamBudget / 100) * 100, 100)}%` }}
                    transition={{ type: "spring", stiffness: 80 }}
                    style={{ background: teamBudget > 100 ? "var(--f1-red)" : "var(--neon-green)" }}
                  />
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Live Scoring Dashboard */}
      <AnimatePresence>
        {(myDriverIds.length > 0 || myConstructorIds.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.1 }}
            className="space-y-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--neon-cyan)" }}>Your Team -- Live Points</h2>
              {!isLive && (
                <span className="text-[10px] px-3 py-1 rounded-full" style={{ color: "rgba(255,255,255,0.3)", background: "var(--surface)", border: "1px solid var(--card-border)" }}>
                  Points will update during live sessions
                </span>
              )}
            </div>

            <div className="racing-stripe" />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {myDrivers.map((d, i) => (
                <motion.div
                  key={d.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: d.constructor_color }} />
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs" style={{
                        backgroundColor: `${d.constructor_color}18`,
                        color: d.constructor_color,
                        border: `1px solid ${d.constructor_color}30`,
                      }}>
                        {d.number}
                      </div>
                      <div>
                        <div className="font-bold text-sm">{d.code}</div>
                        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>{d.constructor_name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>--</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>pts</div>
                    </div>
                  </div>
                  {/* Scoring breakdown placeholder */}
                  <div className="px-4 pb-3 flex gap-2">
                    {["Q", "R", "OT", "FL"].map((cat) => (
                      <div key={cat} className="flex-1 rounded-lg py-1 text-center" style={{ background: "var(--surface)" }}>
                        <div className="text-[9px] uppercase font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>{cat}</div>
                        <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>--</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}

              {myConstructors.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (myDrivers.length + i) * 0.05 }}
                  className="glass-card relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-[2px]" style={{ backgroundColor: c.color }} />
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{
                        backgroundColor: `${c.color}18`,
                        border: `1px solid ${c.color}30`,
                      }}>
                        <div className="w-3.5 h-3.5 rounded-sm" style={{ backgroundColor: c.color }} />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{c.name}</div>
                        <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>Constructor</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-mono font-bold" style={{ color: "rgba(255,255,255,0.25)" }}>--</div>
                      <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>pts</div>
                    </div>
                  </div>
                  <div className="px-4 pb-3 flex gap-2">
                    {["PIT", "POS", "Q"].map((cat) => (
                      <div key={cat} className="flex-1 rounded-lg py-1 text-center" style={{ background: "var(--surface)" }}>
                        <div className="text-[9px] uppercase font-semibold" style={{ color: "rgba(255,255,255,0.25)" }}>{cat}</div>
                        <div className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.35)" }}>--</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Total */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="glass-card p-5 flex items-center justify-between glow-red"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--neon-cyan)" }}>Total Team Points</div>
                <p className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>Data sourced from OpenF1 API during live sessions</p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-mono font-black" style={{ color: "rgba(255,255,255,0.25)" }}>--</div>
                <div className="text-[10px] uppercase tracking-wider font-semibold mt-1" style={{ color: "rgba(255,255,255,0.25)" }}>points</div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {myDriverIds.length === 0 && myConstructorIds.length === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-center py-12">
          <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: "var(--card-border)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Select your fantasy team above to start tracking live points</p>
        </motion.div>
      )}
    </div>
  );
}
