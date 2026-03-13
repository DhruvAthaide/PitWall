"""Default simulation parameters for each driver.

2026 early-season baseline: Mercedes and Ferrari are the class of the field,
McLaren and Red Bull close behind, then a midfield pack, then backmarkers.

qpace_mean = expected qualifying position (lower = faster, 1 = pole favorite)
qpace_std  = session-to-session variability (lower = more consistent)
dnf_pct    = retirement probability per race
fl_pct     = fastest lap probability (weighted by raw pace)
avg_pos_gained = net positions typically gained/lost on lap 1 + race craft
"""

# ---------------------------------------------------------------------------
# DRIVER DEFAULTS
# Grouped by constructor performance tier based on 2026 results + prices
# ---------------------------------------------------------------------------

DRIVER_DEFAULTS = {
    # === TIER 1: Mercedes (dominant early 2026) ===
    "RUS": {"qpace_mean": 3.0, "qpace_std": 1.8, "dnf_pct": 0.04, "fl_pct": 0.12, "avg_pos_gained": 0.5},
    "ANT": {"qpace_mean": 4.5, "qpace_std": 2.2, "dnf_pct": 0.07, "fl_pct": 0.08, "avg_pos_gained": 0.3},

    # === TIER 1: Ferrari (dominant early 2026) ===
    "LEC": {"qpace_mean": 3.5, "qpace_std": 1.8, "dnf_pct": 0.05, "fl_pct": 0.11, "avg_pos_gained": 0.4},
    "HAM": {"qpace_mean": 4.0, "qpace_std": 1.9, "dnf_pct": 0.04, "fl_pct": 0.10, "avg_pos_gained": 0.6},

    # === TIER 2: McLaren (strong contenders) ===
    "NOR": {"qpace_mean": 4.0, "qpace_std": 2.0, "dnf_pct": 0.04, "fl_pct": 0.09, "avg_pos_gained": 0.3},
    "PIA": {"qpace_mean": 4.5, "qpace_std": 2.0, "dnf_pct": 0.05, "fl_pct": 0.08, "avg_pos_gained": 0.2},

    # === TIER 2: Red Bull (adjusting to new regs) ===
    "VER": {"qpace_mean": 3.5, "qpace_std": 2.2, "dnf_pct": 0.03, "fl_pct": 0.13, "avg_pos_gained": 0.8},
    "HAD": {"qpace_mean": 8.0, "qpace_std": 2.5, "dnf_pct": 0.08, "fl_pct": 0.03, "avg_pos_gained": 0.1},

    # === TIER 3: Upper midfield ===
    "GAS": {"qpace_mean": 9.0,  "qpace_std": 2.5, "dnf_pct": 0.06, "fl_pct": 0.03, "avg_pos_gained": 0.2},
    "SAI": {"qpace_mean": 8.5,  "qpace_std": 2.5, "dnf_pct": 0.05, "fl_pct": 0.03, "avg_pos_gained": 0.3},
    "ALB": {"qpace_mean": 9.5,  "qpace_std": 2.5, "dnf_pct": 0.05, "fl_pct": 0.02, "avg_pos_gained": 0.2},

    # === TIER 4: Lower midfield ===
    "ALO": {"qpace_mean": 11.0, "qpace_std": 2.8, "dnf_pct": 0.05, "fl_pct": 0.02, "avg_pos_gained": 0.4},
    "STR": {"qpace_mean": 13.0, "qpace_std": 2.8, "dnf_pct": 0.06, "fl_pct": 0.01, "avg_pos_gained": 0.0},
    "BEA": {"qpace_mean": 11.5, "qpace_std": 3.0, "dnf_pct": 0.07, "fl_pct": 0.02, "avg_pos_gained": 0.1},
    "OCO": {"qpace_mean": 12.0, "qpace_std": 2.8, "dnf_pct": 0.06, "fl_pct": 0.01, "avg_pos_gained": 0.1},
    "LAW": {"qpace_mean": 10.5, "qpace_std": 2.8, "dnf_pct": 0.06, "fl_pct": 0.02, "avg_pos_gained": 0.2},
    "HUL": {"qpace_mean": 12.0, "qpace_std": 2.8, "dnf_pct": 0.06, "fl_pct": 0.01, "avg_pos_gained": 0.1},

    # === TIER 5: Backmarkers ===
    "BOR": {"qpace_mean": 14.0, "qpace_std": 3.0, "dnf_pct": 0.08, "fl_pct": 0.01, "avg_pos_gained": 0.0},
    "COL": {"qpace_mean": 13.5, "qpace_std": 3.0, "dnf_pct": 0.07, "fl_pct": 0.01, "avg_pos_gained": 0.0},
    "LIN": {"qpace_mean": 14.5, "qpace_std": 3.0, "dnf_pct": 0.08, "fl_pct": 0.01, "avg_pos_gained": -0.1},
    "PER": {"qpace_mean": 13.0, "qpace_std": 3.0, "dnf_pct": 0.07, "fl_pct": 0.01, "avg_pos_gained": 0.1},
    "BOT": {"qpace_mean": 14.0, "qpace_std": 3.0, "dnf_pct": 0.06, "fl_pct": 0.01, "avg_pos_gained": 0.0},
}


# ---------------------------------------------------------------------------
# CONSTRUCTOR DEFAULTS
# ---------------------------------------------------------------------------

# Expected pitstop fantasy points per constructor (2-10 scale based on crew speed)
CONSTRUCTOR_PITSTOP_DEFAULTS = {
    "red_bull":      7.0,   # historically top-tier pit crew
    "mclaren":       6.5,
    "mercedes":      7.0,   # consistently fast stops
    "ferrari":       5.5,   # occasional slow stops
    "williams":      5.0,
    "alpine":        4.5,
    "aston_martin":  4.5,
    "haas":          4.0,
    "audi":          4.0,   # new team, unproven
    "rb":            5.0,
    "cadillac":      3.5,   # new team
}

# Car pace variability per constructor (std dev in positions)
# Top teams are more consistent; backmarkers have wilder swings.
CONSTRUCTOR_CAR_PACE_STD = {
    "red_bull":      1.0,
    "mclaren":       1.0,
    "mercedes":      0.8,   # very consistent early 2026
    "ferrari":       0.9,   # consistent but occasional off-weekend
    "williams":      1.8,
    "alpine":        1.8,
    "aston_martin":  2.0,   # inconsistent
    "haas":          2.2,
    "audi":          2.2,
    "rb":            2.0,
    "cadillac":      2.5,   # most variable
}


def get_dynamic_pitstop_defaults(db) -> dict[str, float]:
    """Query actual pitstop data and return updated expected points per constructor ref_id.
    Falls back to static defaults when no data exists."""
    from app.models import Constructor, PitstopResult
    from app.simulation.scoring import score_pitstop_time

    result = dict(CONSTRUCTOR_PITSTOP_DEFAULTS)

    constructors = db.query(Constructor).all()
    for c in constructors:
        stops = db.query(PitstopResult).filter_by(constructor_id=c.id).all()
        if stops:
            avg_pts = sum(score_pitstop_time(s.time_seconds) for s in stops) / len(stops)
            result[c.ref_id] = round(avg_pts, 3)

    return result


def get_dynamic_car_pace_std(db) -> dict[str, float]:
    """Compute per-constructor car pace variability from qualifying results.
    Uses standard deviation of qualifying positions across races.
    Falls back to static defaults when fewer than 4 results exist."""
    import statistics
    from app.models import Constructor, Driver, RaceResult

    result = dict(CONSTRUCTOR_CAR_PACE_STD)

    constructors = db.query(Constructor).all()
    for c in constructors:
        driver_ids = [d.id for d in db.query(Driver).filter_by(constructor_id=c.id).all()]
        if not driver_ids:
            continue

        quali_positions = [
            r.qualifying_position
            for r in db.query(RaceResult).filter(RaceResult.driver_id.in_(driver_ids)).all()
            if r.qualifying_position is not None
        ]

        if len(quali_positions) >= 4:
            std = statistics.stdev(quali_positions)
            result[c.ref_id] = round(max(0.5, min(4.0, std)), 2)

    return result
