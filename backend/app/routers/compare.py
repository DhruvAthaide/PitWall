from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    Driver, Constructor, Race, Circuit, FantasyPrice,
    SimulationResult, RaceResult,
)

router = APIRouter(prefix="/api/compare", tags=["compare"])


def _normalize(value: float, min_v: float, max_v: float) -> float:
    if max_v == min_v:
        return 50.0
    return round(((value - min_v) / (max_v - min_v)) * 100, 1)


def _form_trend(driver_id: int, db: Session) -> str:
    """Determine form trend from last 3 race results."""
    results = (
        db.query(RaceResult)
        .filter_by(driver_id=driver_id)
        .join(Race, Race.id == RaceResult.race_id)
        .order_by(Race.round.desc())
        .limit(3)
        .all()
    )
    if len(results) < 2:
        return "stable"

    positions = [r.race_position for r in results if not r.dnf and r.race_position is not None]
    if len(positions) < 2:
        return "stable"

    # Lower position number = better. If recent positions are lower, improving.
    recent_avg = sum(positions[:2]) / len(positions[:2])
    older_avg = positions[-1]
    diff = older_avg - recent_avg
    if diff > 1.5:
        return "improving"
    elif diff < -1.5:
        return "declining"
    return "stable"


@router.get("/drivers")
def compare_drivers(
    ids: str = Query(..., description="Comma-separated driver IDs"),
    race_id: int = Query(..., description="Race ID for context"),
    db: Session = Depends(get_db),
):
    try:
        driver_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid driver IDs — must be comma-separated integers")

    race = db.get(Race, race_id)
    if not race:
        raise HTTPException(status_code=404, detail="Race not found")
    circuit = db.get(Circuit, race.circuit_id) if race else None

    results = []
    for did in driver_ids:
        driver = db.get(Driver, did)
        if not driver:
            continue

        constructor = db.get(Constructor, driver.constructor_id)

        sim = (
            db.query(SimulationResult)
            .filter_by(asset_type="driver", asset_id=did, race_id=race_id)
            .order_by(SimulationResult.id.desc())
            .first()
        )

        price_row = (
            db.query(FantasyPrice)
            .filter_by(asset_type="driver", asset_id=did)
            .order_by(FantasyPrice.id.desc())
            .first()
        )
        price = price_row.price if price_row else 0

        xpts = sim.expected_pts_mean if sim else 0
        std = sim.expected_pts_std if sim else 5
        ppm = xpts / price if price > 0 else 0
        dnf_proxy = std / max(xpts, 1) if xpts > 0 else 0.5

        results.append({
            "driver_id": did,
            "code": driver.code,
            "name": f"{driver.first_name} {driver.last_name}",
            "constructor_color": constructor.color if constructor else "#888",
            "pace_rating": xpts,
            "consistency": max(0, 100 - (std * 5)),
            "value": ppm * 100,
            "form_trend": _form_trend(did, db),
            "circuit_fit": 50.0,  # default, refined below
            "risk": dnf_proxy * 100,
            "expected_pts": round(xpts, 2),
            "price": price,
        })

    if not results:
        return []

    # Normalize all metrics to 0-100
    for metric in ["pace_rating", "consistency", "value", "circuit_fit", "risk"]:
        vals = [r[metric] for r in results]
        min_v, max_v = min(vals), max(vals)
        for r in results:
            r[metric] = _normalize(r[metric], min_v, max_v)

    # Invert risk so lower is better for display
    for r in results:
        r["risk"] = round(100 - r["risk"], 1)

    return results


@router.get("/constructors")
def compare_constructors(
    ids: str = Query(..., description="Comma-separated constructor IDs"),
    race_id: int = Query(..., description="Race ID for context"),
    db: Session = Depends(get_db),
):
    try:
        constructor_ids = [int(x.strip()) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid constructor IDs — must be comma-separated integers")

    results = []
    for cid in constructor_ids:
        constructor = db.get(Constructor, cid)
        if not constructor:
            continue

        sim = (
            db.query(SimulationResult)
            .filter_by(asset_type="constructor", asset_id=cid, race_id=race_id)
            .order_by(SimulationResult.id.desc())
            .first()
        )

        price_row = (
            db.query(FantasyPrice)
            .filter_by(asset_type="constructor", asset_id=cid)
            .order_by(FantasyPrice.id.desc())
            .first()
        )
        price = price_row.price if price_row else 0

        xpts = sim.expected_pts_mean if sim else 0
        std = sim.expected_pts_std if sim else 5
        ppm = xpts / price if price > 0 else 0

        results.append({
            "constructor_id": cid,
            "name": constructor.name,
            "color": constructor.color,
            "pace_rating": xpts,
            "consistency": max(0, 100 - (std * 5)),
            "value": ppm * 100,
            "expected_pts": round(xpts, 2),
            "price": price,
        })

    if not results:
        return []

    for metric in ["pace_rating", "consistency", "value"]:
        vals = [r[metric] for r in results]
        min_v, max_v = min(vals), max(vals)
        for r in results:
            r[metric] = _normalize(r[metric], min_v, max_v)

    return results
