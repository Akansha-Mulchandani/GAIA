from fastapi import APIRouter, BackgroundTasks, Body, HTTPException
from datetime import datetime
from pathlib import Path
import random
import time
import asyncio
from websocket.handlers import emit_sim_progress, emit_sim_completed

router = APIRouter()

_SIM_STATE = {
    "last_id": 1,
    "store": {
        1: {
            "id": 1,
            "name": "Demo Ecosystem",
            "status": "idle",
            "ecosystem_config": {"species": 12, "areas": 5},
            "intervention_config": {},
            "results": None,
            "progress": 0,
            "phase": "idle",
            "created_at": datetime.utcnow().isoformat(),
        }
    }
}

# In-memory scenario storage for prototype
_SCENARIOS: list[dict] = []

@router.post("/create")
async def create_simulation():
    _SIM_STATE["last_id"] += 1
    sim_id = _SIM_STATE["last_id"]
    _SIM_STATE["store"][sim_id] = {
        "id": sim_id,
        "name": f"Simulation {sim_id}",
        "status": "idle",
        "ecosystem_config": {"species": 10, "areas": 4},
        "intervention_config": {},
        "results": None,
        "progress": 0,
        "phase": "idle",
        "created_at": datetime.utcnow().isoformat(),
    }
    return {
        "success": True,
        "data": {"simulation_id": sim_id},
        "message": "Created",
        "timestamp": datetime.utcnow().isoformat(),
    }

async def run_phases(sim_id: int, intervention: dict | None = None):
    """Simulate a long-running simulation with progress updates."""
    sim = _SIM_STATE["store"][sim_id]
    phases = [
        ("loading data", 20),
        ("simulating dynamics", 60),
        ("applying intervention", 85),
        ("finalizing", 100),
    ]

    for phase, target_progress in phases:
        sim["phase"] = phase
        steps = random.randint(3, 7)  # Random steps per phase
        
        for i in range(steps):
            if sim["status"] == "cancelled":
                return
                
            # Simulate work
            await asyncio.sleep(0.5)
            
            # Update progress within phase
            phase_progress = int((i + 1) * (target_progress - sim["progress"]) / steps)
            sim["progress"] = min(sim["progress"] + phase_progress, target_progress)
            
            # Broadcast progress
            try:
                await emit_sim_progress(sim_id, phase, sim["progress"])
            except Exception as e:
                print(f"Error emitting progress: {e}")
    
    # Finalize
    sim["progress"] = 100
    sim["status"] = "completed"
    sim["phase"] = "completed"
    sim["completed_at"] = datetime.utcnow().isoformat()
    
    # Generate mock results based on real dataset where possible
    species_counts: list[tuple[str, int]] = []

    # Prefer the same dataset locations used by species_routes: temp_extract/train, then butterflies/train
    dataset_candidates = [
        Path("/app/data/temp_extract/train"),
        Path("/app/data/butterflies/train"),
    ]

    for train_dir in dataset_candidates:
        if not train_dir.exists() or not train_dir.is_dir():
            continue

        try:
            for species_dir in [p for p in train_dir.iterdir() if p.is_dir()]:
                count = 0
                try:
                    for f in species_dir.iterdir():
                        if f.is_file() and f.suffix.lower() in {'.jpg', '.jpeg', '.png'}:
                            count += 1
                        elif f.is_dir():
                            # Bounded deeper scan per subdirectory
                            c = 0
                            for sf in f.iterdir():
                                if sf.is_file() and sf.suffix.lower() in {'.jpg', '.jpeg', '.png'}:
                                    count += 1
                                    c += 1
                                    if c >= 500:
                                        break
                except Exception:
                    # Ignore per-species errors and continue
                    pass
                if count > 0:
                    species_counts.append((species_dir.name.replace('_', ' '), count))
        except Exception:
            # Ignore dataset-level errors for this path and continue with others
            continue

    # Fallback if no real dataset present anywhere
    if not species_counts:
        species_counts = [("Monarch", 1000), ("Blue Morpho", 800), ("Swallowtail", 600), ("Heliconian", 550)]

    species_limit = 8
    sampling = 'random'
    intensity = 0.5
    action = 'habitat-restoration'
    
    if isinstance(sim.get("intervention_config"), dict):
        species_limit = int(sim["intervention_config"].get("species_limit", species_limit))
        sampling = sim["intervention_config"].get("sampling", sampling)
        intensity = float(sim["intervention_config"].get("intensity", intensity))
        action = sim["intervention_config"].get("action", action)

    # Sampling strategy (optionally honor a custom species list)
    selected_species = []
    if isinstance(sim.get("intervention_config"), dict):
        raw_sel = sim["intervention_config"].get("selected_species")
        if isinstance(raw_sel, list):
            selected_species = [str(s).strip() for s in raw_sel if str(s).strip()]
        elif isinstance(raw_sel, str):
            # Allow comma-separated string fallback
            selected_species = [s.strip() for s in raw_sel.split(',') if s.strip()]

    picked: list[tuple[str, int]] = []

    if selected_species:
        # Case-insensitive match of requested names against available species
        wanted = {s.lower() for s in selected_species}
        pool = [sc for sc in species_counts if sc[0].lower() in wanted]
        # If we found any matches, use them (respecting species_limit)
        if pool:
            picked = pool[:species_limit]

    # If no custom selection or no matches, fall back to existing sampling
    if not picked:
        if sampling == 'top-by-images':
            species_counts.sort(key=lambda x: x[1], reverse=True)
            picked = species_counts[:species_limit]
        else:
            rnd = species_counts[:]
            random.shuffle(rnd)
            picked = rnd[:species_limit]

    # Effect factor based on action
    base_effect = 0.2
    if action == 'anti-poaching':
        base_effect = 0.25
    elif action == 'invasive-control':
        base_effect = 0.18
    
    # Clamp intensity 0..1
    intensity = max(0.0, min(1.0, intensity))
    pop_change = round(100 * (base_effect * intensity), 1)  # percentage points
    risk_change = round(-1 * (10 + 20 * intensity), 1)
    
    trajectories = []
    for name, before in picked:
        after = int(before * (1 + (pop_change/100)))
        trajectories.append({"species": name, "before": before, "after": after})
    
    biodiversity_index = round(0.5 + 0.5 * min(1.0, len(picked)/20) * (0.7 + 0.3*intensity), 2)
    
    sim["results"] = {
        "population_change_percent": pop_change,
        "risk_change_percent": risk_change,
        "biodiversity_index": biodiversity_index,
        "trajectories": trajectories,
    }
    
    # Broadcast completion
    try:
        await emit_sim_completed(sim_id, sim["results"])
    except Exception as e:
        print(f"Error emitting completion: {e}")

@router.post("/run")
async def run_simulation(background_tasks: BackgroundTasks, simulation_id: int = 1, intervention: dict | None = Body(default=None)):
    sim = _SIM_STATE["store"].get(simulation_id)
    if not sim:
        return {
            "success": False, 
            "error": {
                "code": "SIM_NOT_FOUND", 
                "message": "Simulation not found"
            }, 
            "timestamp": datetime.utcnow().isoformat()
        }
    
    sim["status"] = "running"
    sim["progress"] = 0
    sim["phase"] = "initializing"
    
    if intervention:
        sim["intervention_config"] = intervention

    # Start simulation in background
    background_tasks.add_task(run_phases, simulation_id, intervention)
    
    return {
        "success": True,
        "data": {"simulation_id": simulation_id},
        "message": "Simulation started",
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/scenarios")
async def list_scenarios():
    # Most recent first
    items = sorted(_SCENARIOS, key=lambda x: x.get("saved_at",""), reverse=True)
    return {"success": True, "data": items, "message": "OK", "timestamp": datetime.utcnow().isoformat()}


@router.post("/scenarios")
async def save_scenario(name: str = "Scenario", simulation_id: int = 1):
    sim = _SIM_STATE["store"].get(simulation_id)
    if not sim or not sim.get("results"):
        return {"success": False, "error": {"code": "NO_RESULTS", "message": "No completed results to save"}, "timestamp": datetime.utcnow().isoformat()}
    entry = {
        "id": len(_SCENARIOS) + 1,
        "name": name,
        "simulation_id": simulation_id,
        "saved_at": datetime.utcnow().isoformat(),
        "ecosystem_config": sim.get("ecosystem_config"),
        "intervention_config": sim.get("intervention_config"),
        "results": sim.get("results"),
    }
    _SCENARIOS.append(entry)
    return {"success": True, "data": entry, "message": "Saved", "timestamp": datetime.utcnow().isoformat()}


@router.get("/{simulation_id}")
async def get_simulation(simulation_id: int):
    sim = _SIM_STATE["store"].get(simulation_id)
    if not sim:
        return {"success": False, "error": {"code": "SIM_NOT_FOUND", "message": "Simulation not found"}, "timestamp": datetime.utcnow().isoformat()}
    return {"success": True, "data": sim, "message": "OK", "timestamp": datetime.utcnow().isoformat()}
