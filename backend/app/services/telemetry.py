"""
FastF1 telemetry extraction service.

Provides high-frequency car data (speed, throttle, brake, DRS, gear),
lap timing, sector times, tire strategy, and derived analytics.
Results are downsampled for web consumption (~200 points per lap trace).
"""

import logging
import warnings
from functools import lru_cache
from typing import Any

import numpy as np
import fastf1

logger = logging.getLogger(__name__)

# Reuse cache from practice_data
import os
CACHE_DIR = os.environ.get("FASTF1_CACHE", os.path.join(os.path.dirname(__file__), "..", "..", ".fastf1_cache"))
os.makedirs(CACHE_DIR, exist_ok=True)
fastf1.Cache.enable_cache(CACHE_DIR)

DOWNSAMPLE_POINTS = 200

COMPOUND_COLORS = {
    "SOFT": "#ff3333",
    "MEDIUM": "#ffd000",
    "HARD": "#ffffff",
    "INTERMEDIATE": "#00cc00",
    "WET": "#0066ff",
    "UNKNOWN": "#888888",
}


@lru_cache(maxsize=16)
def _load_session_key(year: int, event: str, session_type: str) -> Any:
    """Load and cache a FastF1 session with telemetry enabled."""
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        full_event = event
        if "Grand Prix" not in full_event:
            full_event = f"{event} Grand Prix"
        session = fastf1.get_session(year, full_event, session_type)
        session.load(telemetry=True, weather=True, messages=False)
    return session


def load_session(year: int, event: str, session_type: str):
    """Load a FastF1 session, returning None on failure."""
    try:
        return _load_session_key(year, event, session_type)
    except Exception as e:
        msg = str(e)
        if "not been loaded yet" in msg or "Failed to load" in msg or "No data" in msg.lower():
            logger.info(f"Session data not available: {year} {event} {session_type}")
        else:
            logger.warning(f"Failed to load session {year} {event} {session_type}: {e}")
        return None


def get_available_sessions(year: int, event: str) -> list[str]:
    """Return list of session identifiers that have data available."""
    available = []
    for sess in ["FP1", "FP2", "FP3", "Q", "S", "R"]:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                full_event = event if "Grand Prix" in event else f"{event} Grand Prix"
                s = fastf1.get_session(year, full_event, sess)
                s.load(telemetry=False, weather=False, messages=False, laps=True)
                if s.laps is not None and not s.laps.empty:
                    available.append(sess)
        except Exception:
            continue
    return available


def _td_to_seconds(td) -> float | None:
    """Convert pandas Timedelta to seconds, returning None for NaT."""
    import pandas as pd
    try:
        if td is None or pd.isna(td):
            return None
        return round(td.total_seconds(), 3)
    except (ValueError, TypeError, OverflowError):
        return None


def _downsample(distances: np.ndarray, values: np.ndarray, n_points: int = DOWNSAMPLE_POINTS) -> list[dict]:
    """Downsample telemetry to evenly-spaced distance points."""
    if len(distances) < 2:
        return []
    new_dist = np.linspace(distances.min(), distances.max(), n_points)
    new_vals = np.interp(new_dist, distances, values)
    return [{"distance": round(float(d), 1), "value": round(float(v), 2)} for d, v in zip(new_dist, new_vals)]


def get_lap_times(session, driver_code: str) -> list[dict]:
    """Get lap times for a driver across a session."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return []

        result = []
        for _, lap in laps.iterrows():
            lt = _td_to_seconds(lap.get("LapTime"))
            if lt is None or lt <= 0:
                continue
            result.append({
                "lap_number": int(lap["LapNumber"]),
                "time_seconds": lt,
                "compound": str(lap.get("Compound", "UNKNOWN")),
                "stint": int(lap.get("Stint", 1)),
                "is_personal_best": bool(lap.get("IsPersonalBest", False)),
            })
        return result
    except Exception as e:
        logger.warning(f"get_lap_times failed for {driver_code}: {e}")
        return []


def get_sector_times(session, driver_code: str) -> list[dict]:
    """Get sector split times per lap."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return []

        result = []
        for _, lap in laps.iterrows():
            s1 = _td_to_seconds(lap.get("Sector1Time"))
            s2 = _td_to_seconds(lap.get("Sector2Time"))
            s3 = _td_to_seconds(lap.get("Sector3Time"))
            if s1 is None and s2 is None and s3 is None:
                continue
            result.append({
                "lap_number": int(lap["LapNumber"]),
                "s1": s1,
                "s2": s2,
                "s3": s3,
                "compound": str(lap.get("Compound", "UNKNOWN")),
            })
        return result
    except Exception as e:
        logger.warning(f"get_sector_times failed for {driver_code}: {e}")
        return []


def get_speed_trace(session, driver_code: str, lap_number: int | None = None) -> dict:
    """Get speed vs distance trace for a specific lap (defaults to fastest)."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return {"points": [], "lap_number": None, "lap_time": None}

        if lap_number is not None:
            lap = laps[laps["LapNumber"] == lap_number]
            if lap.empty:
                return {"points": [], "lap_number": lap_number, "lap_time": None}
            lap = lap.iloc[0]
        else:
            lap = laps.pick_fastest()
            if lap is None or (hasattr(lap, 'empty') and lap.empty):
                return {"points": [], "lap_number": None, "lap_time": None}

        tel = lap.get_car_data().add_distance()
        if tel.empty:
            return {"points": [], "lap_number": None, "lap_time": None}

        distances = tel["Distance"].values
        speeds = tel["Speed"].values

        downsampled = _downsample(distances, speeds)
        points = [{"distance": p["distance"], "speed": p["value"]} for p in downsampled]

        return {
            "points": points,
            "lap_number": int(lap["LapNumber"]) if "LapNumber" in lap.index else lap_number,
            "lap_time": _td_to_seconds(lap.get("LapTime")),
        }
    except Exception as e:
        logger.warning(f"get_speed_trace failed for {driver_code}: {e}")
        return {"points": [], "lap_number": lap_number, "lap_time": None}


def get_tire_strategy(session, driver_code: str) -> list[dict]:
    """Get stint breakdown with compound info."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return []

        stints = []
        current_stint = None

        for _, lap in laps.iterrows():
            stint_num = int(lap.get("Stint", 1))
            compound = str(lap.get("Compound", "UNKNOWN"))
            lap_num = int(lap["LapNumber"])

            if current_stint is None or current_stint["stint_number"] != stint_num:
                if current_stint is not None:
                    stints.append(current_stint)
                current_stint = {
                    "stint_number": stint_num,
                    "compound": compound,
                    "color": COMPOUND_COLORS.get(compound, "#888888"),
                    "start_lap": lap_num,
                    "end_lap": lap_num,
                    "laps": 1,
                }
            else:
                current_stint["end_lap"] = lap_num
                current_stint["laps"] += 1

        if current_stint is not None:
            stints.append(current_stint)

        return stints
    except Exception as e:
        logger.warning(f"get_tire_strategy failed for {driver_code}: {e}")
        return []


def get_positions(session, driver_code: str) -> list[dict]:
    """Get position progression per lap."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return []

        result = []
        for _, lap in laps.iterrows():
            pos = lap.get("Position")
            if pos is None:
                continue
            try:
                result.append({
                    "lap_number": int(lap["LapNumber"]),
                    "position": int(float(pos)),
                })
            except (ValueError, TypeError):
                continue
        return result
    except Exception as e:
        logger.warning(f"get_positions failed for {driver_code}: {e}")
        return []


def get_telemetry_trace(session, driver_code: str, lap_number: int | None = None) -> dict:
    """Get detailed telemetry (speed, throttle, brake, DRS, gear) vs distance."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return {"points": [], "lap_number": None}

        if lap_number is not None:
            lap = laps[laps["LapNumber"] == lap_number]
            if lap.empty:
                return {"points": [], "lap_number": lap_number}
            lap = lap.iloc[0]
        else:
            lap = laps.pick_fastest()
            if lap is None or (hasattr(lap, 'empty') and lap.empty):
                return {"points": [], "lap_number": None}

        tel = lap.get_car_data().add_distance()
        if tel.empty:
            return {"points": [], "lap_number": None}

        dist = tel["Distance"].values
        n = DOWNSAMPLE_POINTS
        new_dist = np.linspace(dist.min(), dist.max(), n)

        speed = np.interp(new_dist, dist, tel["Speed"].values)
        throttle = np.interp(new_dist, dist, tel["Throttle"].values)
        brake_raw = tel["Brake"].values.astype(float)
        brake = np.interp(new_dist, dist, brake_raw)
        drs_raw = tel["DRS"].values.astype(float)
        drs = np.interp(new_dist, dist, drs_raw)
        gear = np.interp(new_dist, dist, tel["nGear"].values.astype(float))

        points = []
        for i in range(n):
            points.append({
                "distance": round(float(new_dist[i]), 1),
                "speed": round(float(speed[i]), 1),
                "throttle": round(float(throttle[i]), 1),
                "brake": round(float(brake[i]), 2),
                "drs": int(round(float(drs[i]))),
                "gear": int(round(float(gear[i]))),
            })

        actual_lap = int(lap["LapNumber"]) if "LapNumber" in lap.index else lap_number
        return {"points": points, "lap_number": actual_lap}

    except Exception as e:
        logger.warning(f"get_telemetry_trace failed for {driver_code}: {e}")
        return {"points": [], "lap_number": lap_number}


def get_speed_traps(session, driver_code: str) -> list[dict]:
    """Get best speed trap values across the session."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return []

        traps = []
        for col, name in [("SpeedI1", "Intermediate 1"), ("SpeedI2", "Intermediate 2"),
                          ("SpeedFL", "Finish Line"), ("SpeedST", "Speed Trap")]:
            values = laps[col].dropna()
            if not values.empty:
                traps.append({"trap_name": name, "speed": round(float(values.max()), 1)})

        return traps
    except Exception as e:
        logger.warning(f"get_speed_traps failed for {driver_code}: {e}")
        return []


def get_lap_distribution(session, driver_code: str) -> dict | None:
    """Compute box plot statistics for lap times (excluding pit laps)."""
    try:
        laps = session.laps.pick_drivers(driver_code).pick_wo_box()
        if laps.empty:
            return None

        times = []
        for _, lap in laps.iterrows():
            lt = _td_to_seconds(lap.get("LapTime"))
            if lt and lt > 0:
                times.append(lt)

        if len(times) < 3:
            return None

        times_arr = np.array(times)
        q1 = float(np.percentile(times_arr, 25))
        median = float(np.median(times_arr))
        q3 = float(np.percentile(times_arr, 75))
        iqr = q3 - q1
        whisker_low = float(max(times_arr.min(), q1 - 1.5 * iqr))
        whisker_high = float(min(times_arr.max(), q3 + 1.5 * iqr))
        outliers = [round(float(t), 3) for t in times_arr if t < whisker_low or t > whisker_high]

        return {
            "median": round(median, 3),
            "q1": round(q1, 3),
            "q3": round(q3, 3),
            "whisker_low": round(whisker_low, 3),
            "whisker_high": round(whisker_high, 3),
            "outliers": outliers,
            "count": len(times),
        }
    except Exception as e:
        logger.warning(f"get_lap_distribution failed for {driver_code}: {e}")
        return None


def get_stint_degradation(session, driver_code: str) -> list[dict]:
    """Get lap time trend per stint to show tire degradation."""
    try:
        laps = session.laps.pick_drivers(driver_code).pick_wo_box()
        if laps.empty:
            return []

        stints_data = {}
        for _, lap in laps.iterrows():
            stint = int(lap.get("Stint", 1))
            lt = _td_to_seconds(lap.get("LapTime"))
            compound = str(lap.get("Compound", "UNKNOWN"))
            if lt is None or lt <= 0:
                continue

            if stint not in stints_data:
                stints_data[stint] = {"compound": compound, "laps": []}
            stints_data[stint]["laps"].append({
                "lap_number": int(lap["LapNumber"]),
                "time_seconds": lt,
            })

        result = []
        for stint_num in sorted(stints_data.keys()):
            data = stints_data[stint_num]
            lap_list = data["laps"]
            if len(lap_list) < 2:
                deg = 0.0
            else:
                x = np.arange(len(lap_list))
                y = np.array([l["time_seconds"] for l in lap_list])
                deg = float(np.polyfit(x, y, 1)[0])

            result.append({
                "stint": stint_num,
                "compound": data["compound"],
                "color": COMPOUND_COLORS.get(data["compound"], "#888888"),
                "laps": lap_list,
                "degradation_per_lap": round(max(0, deg), 4),
            })
        return result
    except Exception as e:
        logger.warning(f"get_stint_degradation failed for {driver_code}: {e}")
        return []


def get_gear_distribution(session, driver_code: str, lap_number: int | None = None) -> list[dict]:
    """Get percentage of lap spent in each gear."""
    try:
        laps = session.laps.pick_drivers(driver_code)
        if laps.empty:
            return []

        if lap_number is not None:
            lap = laps[laps["LapNumber"] == lap_number]
            if lap.empty:
                return []
            lap = lap.iloc[0]
        else:
            lap = laps.pick_fastest()
            if lap is None or (hasattr(lap, 'empty') and lap.empty):
                return []

        tel = lap.get_car_data().add_distance()
        if tel.empty:
            return []

        gears = tel["nGear"].values
        total = len(gears)
        if total == 0:
            return []

        result = []
        for g in range(1, 9):
            count = int(np.sum(gears == g))
            pct = round(count / total * 100, 1)
            if pct > 0:
                result.append({"gear": g, "percentage": pct})
        return result
    except Exception as e:
        logger.warning(f"get_gear_distribution failed for {driver_code}: {e}")
        return []


def get_gap_analysis(session, driver1: str, driver2: str, lap_number: int | None = None) -> dict:
    """Compute time delta between two drivers across a lap distance."""
    try:
        laps1 = session.laps.pick_drivers(driver1)
        laps2 = session.laps.pick_drivers(driver2)
        if laps1.empty or laps2.empty:
            return {"points": [], "lap_number": None}

        if lap_number is not None:
            lap1 = laps1[laps1["LapNumber"] == lap_number]
            lap2 = laps2[laps2["LapNumber"] == lap_number]
            if lap1.empty or lap2.empty:
                return {"points": [], "lap_number": lap_number}
            lap1, lap2 = lap1.iloc[0], lap2.iloc[0]
        else:
            lap1 = laps1.pick_fastest()
            lap2 = laps2.pick_fastest()
            if lap1 is None or lap2 is None:
                return {"points": [], "lap_number": None}

        tel1 = lap1.get_car_data().add_distance()
        tel2 = lap2.get_car_data().add_distance()
        if tel1.empty or tel2.empty:
            return {"points": [], "lap_number": None}

        # Build cumulative time arrays from lap-relative timestamps
        dist1 = tel1["Distance"].values
        dist2 = tel2["Distance"].values
        # Time column is relative to session start; subtract lap start to get lap-relative
        lap1_start = tel1["Time"].iloc[0]
        lap2_start = tel2["Time"].iloc[0]
        time1 = (tel1["Time"] - lap1_start).dt.total_seconds().values
        time2 = (tel2["Time"] - lap2_start).dt.total_seconds().values

        # Interpolate both to common distance axis
        max_dist = min(dist1.max(), dist2.max())
        new_dist = np.linspace(0, max_dist, DOWNSAMPLE_POINTS)
        t1_interp = np.interp(new_dist, dist1, time1)
        t2_interp = np.interp(new_dist, dist2, time2)
        delta = t1_interp - t2_interp  # positive = driver1 behind

        points = [
            {"distance": round(float(d), 1), "delta_seconds": round(float(dt), 4)}
            for d, dt in zip(new_dist, delta)
        ]

        return {
            "points": points,
            "lap_number": lap_number,
            "driver1": driver1,
            "driver2": driver2,
        }
    except Exception as e:
        logger.warning(f"get_gap_analysis failed for {driver1} vs {driver2}: {e}")
        return {"points": [], "lap_number": lap_number}
