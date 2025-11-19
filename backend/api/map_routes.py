from fastapi import APIRouter, Query, Request
from typing import List, Dict, Any
from pathlib import Path
import random
from datetime import datetime, timedelta

router = APIRouter()

# This endpoint synthesizes detection points from the local butterflies dataset
# It does NOT read EXIF GPS; it uses dataset presence to pick species names and
# generates geo points uniformly within the provided bounding box, with timestamps
# in the recent past. This provides a realistic demo backed by real species names.
@router.get("/detections")
async def detections(
    request: Request,
    nelat: float = Query(..., description="North-east latitude of bbox"),
    nelng: float = Query(..., description="North-east longitude of bbox"),
    swlat: float = Query(..., description="South-west latitude of bbox"),
    swlng: float = Query(..., description="South-west longitude of bbox"),
    limit: int = Query(200, ge=1, le=1000, description="Max detections to return"),
    hours: int = Query(24, ge=1, le=720, description="Lookback window in hours for timestamps"),
) -> Dict[str, Any]:
    base = Path(__file__).resolve().parents[2]
    # Prefer the temp_extract path if present (as used elsewhere), else butterflies/train
    candidates = [
        base / "data" / "temp_extract" / "train",
        base / "data" / "butterflies" / "train",
    ]
    train_dir = None
    for p in candidates:
        if p.exists():
            train_dir = p
            break

    species_dirs: List[Path] = []
    if train_dir:
        try:
            species_dirs = [d for d in train_dir.iterdir() if d.is_dir()]
        except Exception:
            species_dirs = []

    # Build species names from directories, fallback to generic
    names: List[str] = [d.name.replace("_", " ") for d in species_dirs][:100]
    if not names:
        names = ["Monarch", "Blue Morpho", "Swallowtail", "Heliconian"]

    # Uniform sampling within bbox
    def rnd_latlon() -> Dict[str, float]:
        lat = swlat + random.random() * (nelat - swlat)
        lng = swlng + random.random() * (nelng - swlng)
        return {"lat": round(lat, 6), "lon": round(lng, 6)}

    now = datetime.utcnow()
    data: List[Dict[str, Any]] = []
    n = min(limit, max(4, len(names)))
    for i in range(n):
        coord = rnd_latlon()
        name = names[i % len(names)]
        # Spread timestamps over the lookback window
        dt = now - timedelta(minutes=random.randint(0, hours * 60))
        data.append({
            "species": name,
            "lat": coord["lat"],
            "lon": coord["lon"],
            "observed_at": dt.isoformat() + "Z",
        })

    return {
        "success": True,
        "data": data,
        "source": "local_dataset",
        "dataset_path": str(train_dir) if train_dir else None,
        "message": "OK",
        "timestamp": datetime.utcnow().isoformat(),
    }
