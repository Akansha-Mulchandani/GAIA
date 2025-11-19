from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from datetime import datetime
import random

router = APIRouter()

# --- Minimal ABM world (prototype, in-memory) ---
# Grid size kept small for demo
W, H = 40, 24

class World:
    def __init__(self):
        self.id = random.randint(1000, 9999)
        self.step = 0
        self.temp = 0.0
        self.rain = 0.0
        self.poaching = 0.0
        # resources per cell 0..1
        self.res = [[0.6 for _ in range(W)] for _ in range(H)]
        # agents: list of dicts {x,y,species:'A'|'B',energy:float}
        self.agents: List[Dict[str, Any]] = []
        for _ in range(60):
            self.agents.append({"x": random.randrange(W), "y": random.randrange(H), "species": "A", "energy": 0.8})
        for _ in range(40):
            self.agents.append({"x": random.randrange(W), "y": random.randrange(H), "species": "B", "energy": 0.8})
        self.snapshots: List[Dict[str, Any]] = []

    def metrics(self) -> Dict[str, Any]:
        a = sum(1 for ag in self.agents if ag["species"] == "A")
        b = sum(1 for ag in self.agents if ag["species"] == "B")
        biodiv = 0.0
        tot = a + b
        if tot:
            p = a / tot
            # Simpson-like evenness proxy
            biodiv = round(1 - (p**2 + (1 - p)**2), 3)
        risk = max(0.0, min(1.0, 0.3 + 0.2*self.temp + 0.2*(1-self.rain) + 0.3*self.poaching - 0.2*biodiv))
        return {"count_A": a, "count_B": b, "biodiversity": biodiv, "risk": round(risk, 3)}

    def apply_env(self, temp: float, rain: float, poaching: float):
        self.temp = max(-1.0, min(1.0, temp))
        self.rain = max(0.0, min(1.0, rain))
        self.poaching = max(0.0, min(1.0, poaching))

    def step_once(self, steps: int = 1):
        for _ in range(steps):
            self.step += 1
            # resource regen/decay
            for y in range(H):
                for x in range(W):
                    regen = 0.02 + 0.02*self.rain
                    decay = 0.01 + 0.02*max(0.0, self.temp)
                    self.res[y][x] = max(0.0, min(1.0, self.res[y][x] + regen - decay))
            # move agents randomly, eat, reproduce, die
            new_agents: List[Dict[str, Any]] = []
            for ag in self.agents:
                # random move
                ag["x"] = (ag["x"] + random.choice([-1, 0, 1])) % W
                ag["y"] = (ag["y"] + random.choice([-1, 0, 1])) % H
                # eat resource
                food = min(0.1, self.res[ag["y"]][ag["x"]])
                self.res[ag["y"]][ag["x"]] -= food
                ag["energy"] = max(0.0, min(1.5, ag["energy"] + food - 0.03))
                # poaching mortality affects both, higher on B
                mort = 0.01 + 0.09*self.poaching*(1.2 if ag["species"] == "B" else 1.0)
                # temperature stress: hurts A at high temp, B at low temp
                if self.temp > 0.4 and ag["species"] == "A":
                    mort += 0.02
                if self.temp < -0.4 and ag["species"] == "B":
                    mort += 0.02
                # starvation
                if ag["energy"] < 0.2:
                    mort += 0.05
                if random.random() < mort:
                    continue  # dead
                # reproduce if high energy and resources
                if ag["energy"] > 1.2 and random.random() < 0.1:
                    new_agents.append({"x": ag["x"], "y": ag["y"], "species": ag["species"], "energy": 0.8})
                    ag["energy"] *= 0.7
                new_agents.append(ag)
            self.agents = new_agents[:200]  # cap population

    def snapshot(self, name: str):
        snap = {
            "id": len(self.snapshots) + 1,
            "name": name,
            "saved_at": datetime.utcnow().isoformat(),
            "step": self.step,
            "env": {"temp": self.temp, "rain": self.rain, "poaching": self.poaching},
            "metrics": self.metrics(),
        }
        self.snapshots.append(snap)
        return snap

_WORLD: Optional[World] = None

# --- Schemas ---
class CreateBody(BaseModel):
    temp: float = 0.0
    rain: float = 0.5
    poaching: float = 0.0

class ApplyBody(BaseModel):
    temp: float
    rain: float
    poaching: float

class StepBody(BaseModel):
    steps: int = 1

class SnapshotBody(BaseModel):
    name: str = "Snapshot"

# --- Endpoints ---
@router.post("/create")
def create_world(body: CreateBody):
    global _WORLD
    _WORLD = World()
    _WORLD.apply_env(body.temp, body.rain, body.poaching)
    return {"success": True, "data": {"twin_id": _WORLD.id, "state": state_payload()} }


def state_payload():
    if not _WORLD:
        return None
    # compress agents for UI
    agents = _WORLD.agents[:200]
    return {
        "step": _WORLD.step,
        "env": {"temp": _WORLD.temp, "rain": _WORLD.rain, "poaching": _WORLD.poaching},
        "metrics": _WORLD.metrics(),
        "agents": [{"x": a["x"], "y": a["y"], "s": a["species"]} for a in agents],
        "grid": {"w": W, "h": H},
    }

@router.get("/state")
def get_state():
    return {"success": True, "data": state_payload()}

@router.post("/apply")
def apply_env(body: ApplyBody):
    if not _WORLD:
        return {"success": False, "error": {"code": "NO_TWIN", "message": "Create twin first"}}
    _WORLD.apply_env(body.temp, body.rain, body.poaching)
    return {"success": True, "data": state_payload()}

@router.post("/step")
def step_world(body: StepBody):
    if not _WORLD:
        return {"success": False, "error": {"code": "NO_TWIN", "message": "Create twin first"}}
    _WORLD.step_once(max(1, min(20, int(body.steps))))
    return {"success": True, "data": state_payload()}

@router.post("/snapshot")
def save_snapshot(body: SnapshotBody):
    if not _WORLD:
        return {"success": False, "error": {"code": "NO_TWIN", "message": "Create twin first"}}
    snap = _WORLD.snapshot(body.name or "Snapshot")
    return {"success": True, "data": snap}

@router.get("/snapshots")
def list_snapshots():
    if not _WORLD:
        return {"success": True, "data": []}
    return {"success": True, "data": list(reversed(_WORLD.snapshots))}
