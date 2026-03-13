import asyncio
import logging
from fastapi import APIRouter, Body, Depends
from sqlalchemy.orm import Session
from datetime import datetime

logger = logging.getLogger(__name__)

from app.database import get_db
from app.models import Driver, Constructor, Race, Circuit, FantasyPrice, SimulationResult
from app.schemas import SimulationResultResponse, BestTeamRequest, TeamResult, DriverResponse, ConstructorResponse, SimulationMeta, MyTeamRequest, TeamComparisonResponse
from app.simulation.engine import CircuitTraits, simulate_race_weekend
from app.simulation.optimizer import find_best_teams, Asset
from app.services.auto_sim import (
    _build_driver_params, _build_constructor_params,
    _compute_history_adjustments,
)

router = APIRouter(prefix="/api", tags=["simulation"])


@router.post("/simulate/{race_id}")
async def run_simulation(
    race_id: int,
    use_practice_data: bool = True,
    n_simulations: int = 50000,
    grid_penalties: dict[int, int] | None = Body(default=None),
    db: Session = Depends(get_db),
):
    """Run simulation (force mode). Thin wrapper around auto_sim."""
    from app.services.auto_sim import run_auto_simulation, _build_response

    result = await run_auto_simulation(
        db, race_id, force=True,
        n_simulations=n_simulations,
        grid_penalties=grid_penalties,
        use_practice_data=use_practice_data,
    )

    if result.get("status") == "error":
        return {"results": [], "meta": {}}

    # Build response in the same format as before
    sim_results = _build_response(db, race_id)
    response = [SimulationResultResponse(**r) for r in sim_results]

    meta = SimulationMeta(
        race_id=race_id,
        race_name=result.get("race_name", ""),
        n_simulations=result.get("n_simulations", n_simulations),
        data_sources=result.get("data_sources", []),
        has_qualifying=result.get("has_qualifying", False),
        has_long_runs=result.get("has_long_runs", False),
        weather=result.get("weather"),
        simulated_at=result.get("simulated_at", ""),
    )

    return {"results": response, "meta": meta}


@router.get("/simulation/{race_id}/cached")
def get_cached_simulation(race_id: int, db: Session = Depends(get_db)):
    """Return cached simulation results instantly (no computation)."""
    from app.services.auto_sim import _build_response, _sim_meta_cache

    race = db.get(Race, race_id)
    if not race:
        return {"status": "not_found", "race_id": race_id, "results": []}

    sim_results = _build_response(db, race_id)
    if not sim_results:
        return {"status": "no_data", "race_id": race_id, "race_name": race.name, "results": []}

    latest = (
        db.query(SimulationResult)
        .filter_by(race_id=race_id)
        .order_by(SimulationResult.simulated_at.desc())
        .first()
    )

    meta = _sim_meta_cache.get(race_id, {})

    return {
        "status": "ok",
        "race_id": race_id,
        "race_name": race.name,
        "results": sim_results,
        "simulated_at": latest.simulated_at.isoformat() if latest and latest.simulated_at else None,
        "data_sources": meta.get("data_sources", []),
        "has_qualifying": meta.get("has_qualifying", False),
        "has_long_runs": meta.get("has_long_runs", False),
        "weather": meta.get("weather"),
    }


@router.api_route("/refresh", methods=["GET", "POST"])
async def refresh(db: Session = Depends(get_db)):
    """Auto-ingest results + re-simulate if stale. Called by external cron."""
    from app.services.auto_sim import auto_ingest_results, run_auto_simulation, get_next_race_from_db

    ingestion_log = await auto_ingest_results(db)

    next_race = get_next_race_from_db(db)
    sim_result = None
    if next_race:
        sim_result = await run_auto_simulation(db, next_race.id)

    return {
        "ingestion": ingestion_log,
        "simulation": sim_result,
    }


@router.post("/simulation/{race_id}/strategy-brief")
def get_strategy_brief(race_id: int, db: Session = Depends(get_db)):
    """Generate a rule-based strategy brief from simulation data."""
    from app.services.auto_sim import generate_strategy_brief

    brief = generate_strategy_brief(db, race_id)
    if not brief:
        return {"status": "no_data", "message": "No simulation data available for this race."}
    return brief


@router.post("/best-teams", response_model=list[TeamResult])
def get_best_teams(request: BestTeamRequest, db: Session = Depends(get_db)):
    all_drivers = db.query(Driver).all()
    all_constructors = db.query(Constructor).all()

    # When no simulation data exists for an asset, use price as a rough proxy
    # for expected points.  More expensive assets are generally stronger, so
    # this prevents the optimizer from defaulting to all-backmarker squads
    # when simulation results haven't been generated yet.
    # The multiplier is calibrated so a $30M driver ≈ 30 pts (ballpark for a
    # front-runner in a normal weekend).
    _PRICE_FALLBACK_MULTIPLIER = 1.0  # 1 pt per $1M

    driver_assets = []
    for d in all_drivers:
        price_row = (
            db.query(FantasyPrice)
            .filter_by(asset_type="driver", asset_id=d.id)
            .order_by(FantasyPrice.id.desc())
            .first()
        )
        price = price_row.price if price_row else 0
        sim = None
        if request.race_id:
            sim = (
                db.query(SimulationResult)
                .filter_by(asset_type="driver", asset_id=d.id, race_id=request.race_id)
                .order_by(SimulationResult.id.desc())
                .first()
            )
        constructor = db.get(Constructor, d.constructor_id)
        driver_assets.append(Asset(
            id=d.id,
            code=d.code,
            price=price,
            expected_pts=sim.expected_pts_mean if sim else price * _PRICE_FALLBACK_MULTIPLIER,
            asset_type="driver",
            constructor_name=constructor.name if constructor else "",
            constructor_color=constructor.color if constructor else "#888",
        ))

    constructor_assets = []
    for c in all_constructors:
        price_row = (
            db.query(FantasyPrice)
            .filter_by(asset_type="constructor", asset_id=c.id)
            .order_by(FantasyPrice.id.desc())
            .first()
        )
        price = price_row.price if price_row else 0
        sim = None
        if request.race_id:
            sim = (
                db.query(SimulationResult)
                .filter_by(asset_type="constructor", asset_id=c.id, race_id=request.race_id)
                .order_by(SimulationResult.id.desc())
                .first()
            )
        constructor_assets.append(Asset(
            id=c.id,
            code=c.ref_id,
            price=price,
            expected_pts=sim.expected_pts_mean if sim else price * _PRICE_FALLBACK_MULTIPLIER,
            asset_type="constructor",
            constructor_name=c.name,
            constructor_color=c.color,
        ))

    teams = find_best_teams(
        drivers=driver_assets,
        constructors=constructor_assets,
        budget=request.budget,
        include_driver_ids=request.include_drivers,
        exclude_driver_ids=request.exclude_drivers,
        include_constructor_ids=request.include_constructors,
        exclude_constructor_ids=request.exclude_constructors,
        drs_multiplier=request.drs_multiplier,
        top_n=request.top_n,
        drs_driver_id=request.drs_driver_id,
    )

    result = []
    for team in teams:
        driver_responses = []
        for da in team.drivers:
            d = db.get(Driver, da.id)
            if d is None:
                continue
            driver_responses.append(DriverResponse(
                id=d.id,
                code=d.code,
                first_name=d.first_name,
                last_name=d.last_name,
                number=d.number,
                constructor_id=d.constructor_id,
                constructor_name=da.constructor_name,
                constructor_color=da.constructor_color,
                country=d.country,
                price=da.price,
                expected_pts=da.expected_pts,
            ))

        constructor_responses = []
        for ca in team.constructors:
            c = db.get(Constructor, ca.id)
            if c is None:
                continue
            driver_codes = [d.code for d in db.query(Driver).filter_by(constructor_id=c.id).all()]
            constructor_responses.append(ConstructorResponse(
                id=c.id,
                ref_id=c.ref_id,
                name=c.name,
                color=c.color,
                price=ca.price,
                driver_codes=driver_codes,
                expected_pts=ca.expected_pts,
            ))

        drs_d = db.get(Driver, team.drs_driver.id)
        if drs_d is None:
            continue
        drs_response = DriverResponse(
            id=drs_d.id,
            code=drs_d.code,
            first_name=drs_d.first_name,
            last_name=drs_d.last_name,
            number=drs_d.number,
            constructor_id=drs_d.constructor_id,
            constructor_name=team.drs_driver.constructor_name,
            constructor_color=team.drs_driver.constructor_color,
            country=drs_d.country,
            price=team.drs_driver.price,
            expected_pts=team.drs_driver.expected_pts,
        )

        result.append(TeamResult(
            drivers=driver_responses,
            constructors=constructor_responses,
            drs_driver=drs_response,
            total_cost=team.total_cost,
            total_points=team.total_points,
            budget_remaining=team.budget_remaining,
        ))

    return result


@router.post("/my-team/compare", response_model=TeamComparisonResponse)
def compare_my_team(request: MyTeamRequest, db: Session = Depends(get_db)):
    """Compare user's team points vs the optimal team for a given race."""
    drs_multiplier = 2

    # Calculate my team's points
    driver_points = []
    for did in request.driver_ids:
        sim = (
            db.query(SimulationResult)
            .filter_by(asset_type="driver", asset_id=did, race_id=request.race_id)
            .order_by(SimulationResult.id.desc())
            .first()
        )
        pts = sim.expected_pts_mean if sim else 0
        if did == request.drs_driver_id:
            pts *= drs_multiplier
        driver = db.get(Driver, did)
        driver_points.append({
            "id": did,
            "name": driver.code if driver else "?",
            "points": round(pts, 2),
            "is_drs": did == request.drs_driver_id,
        })

    constructor_points = []
    for cid in request.constructor_ids:
        sim = (
            db.query(SimulationResult)
            .filter_by(asset_type="constructor", asset_id=cid, race_id=request.race_id)
            .order_by(SimulationResult.id.desc())
            .first()
        )
        pts = sim.expected_pts_mean if sim else 0
        constructor = db.get(Constructor, cid)
        constructor_points.append({
            "id": cid,
            "name": constructor.name if constructor else "?",
            "points": round(pts, 2),
        })

    my_total = sum(d["points"] for d in driver_points) + sum(c["points"] for c in constructor_points)

    # Get optimal team points (top-1 from optimizer)
    best_teams_request = BestTeamRequest(race_id=request.race_id, top_n=1, drs_multiplier=drs_multiplier)
    optimal = get_best_teams(best_teams_request, db)
    optimal_pts = optimal[0].total_points if optimal else my_total

    return TeamComparisonResponse(
        my_team_points=round(my_total, 2),
        optimal_points=round(optimal_pts, 2),
        points_left_on_table=round(optimal_pts - my_total, 2),
        driver_points=driver_points,
        constructor_points=constructor_points,
    )


@router.post("/simulate/batch")
async def batch_simulate(
    n_simulations: int = 10000,
    force: bool = False,
    db: Session = Depends(get_db),
):
    """Simulate all races that don't have simulation results yet.
    Used by Chip Planner to populate data for all races.
    Pass force=true to re-simulate races that already have results."""
    # Cap simulations lower in batch mode to avoid HTTP timeouts
    BATCH_MAX_SIMS = 10000
    n_simulations = max(1000, min(BATCH_MAX_SIMS, n_simulations))
    races = db.query(Race).order_by(Race.round).all()

    simulated = []
    skipped = []
    for race in races:
        has_sim = db.query(SimulationResult).filter_by(race_id=race.id).first()
        if has_sim and not force:
            skipped.append(race.name)
            continue

        circuit = db.get(Circuit, race.circuit_id)
        circuit_traits = CircuitTraits(
            overtake_difficulty=circuit.overtake_difficulty if circuit else 0.5,
            high_speed=circuit.high_speed if circuit else 0.5,
            street_circuit=circuit.street_circuit if circuit else False,
            altitude=circuit.altitude if circuit else 0,
            avg_degradation=circuit.avg_degradation if circuit else 0.5,
        )

        history_adjustments = _compute_history_adjustments(db, race, target_circuit=circuit)
        driver_params = _build_driver_params(db, None, None, history_adjustments)
        constructor_params = _build_constructor_params(db, driver_params)

        results = await asyncio.to_thread(
            simulate_race_weekend,
            drivers=driver_params,
            constructors=constructor_params,
            circuit=circuit_traits,
            is_sprint=race.has_sprint,
            n_simulations=n_simulations,
        )

        try:
            # Delete old results if force re-simulating
            if force and has_sim:
                db.query(SimulationResult).filter_by(race_id=race.id).delete()

            for r in results:
                db.add(SimulationResult(
                    race_id=race.id,
                    asset_type=r.asset_type,
                    asset_id=r.asset_id,
                    expected_pts_mean=round(r.mean, 2),
                    expected_pts_median=round(r.median, 2),
                    expected_pts_std=round(r.std, 2),
                    expected_pts_p10=round(r.p10, 2),
                    expected_pts_p90=round(r.p90, 2),
                    simulated_at=datetime.utcnow(),
                ))
            db.commit()
            simulated.append(race.name)
        except Exception:
            db.rollback()
            logger.warning(f"Failed to save simulation results for {race.name}")
            skipped.append(race.name)

    return {
        "simulated_count": len(simulated),
        "skipped_count": len(skipped),
        "simulated_races": simulated,
    }
