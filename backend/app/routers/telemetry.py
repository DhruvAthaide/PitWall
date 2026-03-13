import asyncio
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from app.services.telemetry import (
    load_session,
    get_available_sessions,
    get_lap_times,
    get_sector_times,
    get_speed_trace,
    get_tire_strategy,
    get_positions,
    get_telemetry_trace,
    get_speed_traps,
    get_lap_distribution,
    get_stint_degradation,
    get_gear_distribution,
    get_gap_analysis,
)

router = APIRouter(prefix="/api/telemetry", tags=["telemetry"])


async def _get_session(year: int, event: str, session: str):
    """Load a FastF1 session via thread pool, raising 404 if unavailable."""
    try:
        sess = await asyncio.to_thread(load_session, year, event, session)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading session: {e}")
    if sess is None:
        raise HTTPException(status_code=404, detail=f"Session data not available: {year} {event} {session}")
    return sess


@router.get("/available-sessions")
async def available_sessions(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name (e.g. Australia)"),
):
    try:
        sessions = await asyncio.to_thread(get_available_sessions, year, event)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {e}")
    return {"sessions": sessions}


@router.get("/laps")
async def laps(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type (FP1, Q, R, etc.)"),
    driver: str = Query(..., description="Driver code (e.g. VER)"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_lap_times, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get lap times: {e}")
    return {"driver": driver, "laps": data}


@router.get("/sectors")
async def sectors(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_sector_times, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get sector times: {e}")
    return {"driver": driver, "sectors": data}


@router.get("/speed-trace")
async def speed_trace(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
    lap: Optional[int] = Query(None, description="Lap number (defaults to fastest)"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_speed_trace, sess, driver, lap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get speed trace: {e}")
    return {"driver": driver, **data}


@router.get("/tire-strategy")
async def tire_strategy(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_tire_strategy, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tire strategy: {e}")
    return {"driver": driver, "stints": data}


@router.get("/positions")
async def positions(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_positions, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get positions: {e}")
    return {"driver": driver, "positions": data}


@router.get("/driving-data")
async def driving_data(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
    lap: Optional[int] = Query(None, description="Lap number (defaults to fastest)"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_telemetry_trace, sess, driver, lap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get driving data: {e}")
    return {"driver": driver, **data}


@router.get("/speed-traps")
async def speed_traps(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_speed_traps, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get speed traps: {e}")
    return {"driver": driver, "traps": data}


@router.get("/distribution")
async def distribution(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_lap_distribution, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get distribution: {e}")
    if data is None:
        return {"driver": driver, "distribution": None}
    return {"driver": driver, "distribution": data}


@router.get("/degradation")
async def degradation(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_stint_degradation, sess, driver)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get degradation: {e}")
    return {"driver": driver, "stints": data}


@router.get("/gear")
async def gear(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    driver: str = Query(..., description="Driver code"),
    lap: Optional[int] = Query(None, description="Lap number (defaults to fastest)"),
):
    sess = await _get_session(year, event, session)
    try:
        data = await asyncio.to_thread(get_gear_distribution, sess, driver, lap)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get gear distribution: {e}")
    return {"driver": driver, "gears": data}


@router.get("/compare")
async def compare(
    year: int = Query(..., description="Season year"),
    event: str = Query(..., description="Event name"),
    session: str = Query(..., description="Session type"),
    drivers: str = Query(..., description="Comma-separated driver codes (e.g. VER,NOR)"),
    comparison_type: str = Query("speed", alias="type", description="Comparison type: speed|laps|sectors|positions|telemetry|gap"),
    lap: Optional[int] = Query(None, description="Lap number for gap analysis"),
):
    driver_codes = [d.strip().upper() for d in drivers.split(",") if d.strip()]
    if len(driver_codes) < 2:
        raise HTTPException(status_code=400, detail="At least two driver codes are required")

    sess = await _get_session(year, event, session)

    try:
        if comparison_type == "speed":
            results = {}
            for code in driver_codes:
                results[code] = await asyncio.to_thread(get_speed_trace, sess, code)
            return {"type": "speed", "drivers": results}

        elif comparison_type == "laps":
            results = {}
            for code in driver_codes:
                results[code] = await asyncio.to_thread(get_lap_times, sess, code)
            return {"type": "laps", "drivers": results}

        elif comparison_type == "sectors":
            results = {}
            for code in driver_codes:
                results[code] = await asyncio.to_thread(get_sector_times, sess, code)
            return {"type": "sectors", "drivers": results}

        elif comparison_type == "positions":
            results = {}
            for code in driver_codes:
                results[code] = await asyncio.to_thread(get_positions, sess, code)
            return {"type": "positions", "drivers": results}

        elif comparison_type == "telemetry":
            results = {}
            for code in driver_codes:
                results[code] = await asyncio.to_thread(get_telemetry_trace, sess, code)
            return {"type": "telemetry", "drivers": results}

        elif comparison_type == "gap":
            if len(driver_codes) != 2:
                raise HTTPException(status_code=400, detail="Gap analysis requires exactly two driver codes")
            data = await asyncio.to_thread(get_gap_analysis, sess, driver_codes[0], driver_codes[1], lap)
            return {"type": "gap", **data}

        else:
            raise HTTPException(status_code=400, detail=f"Unknown comparison type: {comparison_type}. Use speed|laps|sectors|positions|telemetry|gap")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Comparison failed: {e}")
