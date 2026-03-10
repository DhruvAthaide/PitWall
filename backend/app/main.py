import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db, seed_db, SessionLocal
from app.routers import drivers, constructors, races, simulation, budget, statistics, fixtures, chips, penalties, transfers, league, drs, results, season, whatif, compare

logger = logging.getLogger(__name__)

app = FastAPI(title="FantasyDRS API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(drivers.router)
app.include_router(constructors.router)
app.include_router(races.router)
app.include_router(simulation.router)
app.include_router(budget.router)
app.include_router(statistics.router)
app.include_router(fixtures.router)
app.include_router(chips.router)
app.include_router(penalties.router)
app.include_router(transfers.router)
app.include_router(league.router)
app.include_router(drs.router)
app.include_router(results.router)
app.include_router(season.router)
app.include_router(whatif.router)
app.include_router(compare.router)


@app.on_event("startup")
async def startup():
    init_db()
    seed_db()
    app.state.startup_task = asyncio.create_task(_startup_pipeline())


async def _startup_pipeline():
    """Background pipeline: auto-ingest past results, then auto-simulate next race."""
    from app.services.auto_sim import auto_ingest_results, run_auto_simulation, get_next_race_from_db

    await asyncio.sleep(2)  # let the server finish binding

    db = SessionLocal()
    try:
        # 1. Auto-ingest all past race results
        logger.info("Startup pipeline: auto-ingesting past race results...")
        log = await auto_ingest_results(db)
        ingested = [e for e in log if e["status"] == "ingested"]
        if ingested:
            logger.info(f"Auto-ingested results for {len(ingested)} race(s)")

        # 2. Auto-simulate next race
        next_race = get_next_race_from_db(db)
        if next_race:
            logger.info(f"Startup pipeline: auto-simulating {next_race.name}...")
            result = await run_auto_simulation(db, next_race.id)
            logger.info(f"Auto-simulation result: {result.get('status')}")
        else:
            logger.info("No upcoming race found for auto-simulation")
    except Exception as e:
        logger.error(f"Startup pipeline error: {e}", exc_info=True)
    finally:
        db.close()


@app.get("/")
def root():
    return {"message": "FantasyDRS API", "version": "2.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
