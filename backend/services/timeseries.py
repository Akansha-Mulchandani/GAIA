from __future__ import annotations
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import os

# In-memory cache
_TS_CACHE: Optional[Dict[str, List[Tuple[datetime, int]]]] = None
_TS_CACHE_BUILT_AT: Optional[datetime] = None
_TS_CACHE_TTL_SECONDS = 600  # 10 minutes

# Where to read dataset from (fallback order)
DATASET_DIR_CANDIDATES = [
    Path("/app/data/temp_extract/train"),
    Path("/app/data/butterflies/train"),
]

IMG_EXTS = (".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG")


def _find_dataset_dir() -> Optional[Path]:
    for p in DATASET_DIR_CANDIDATES:
        if p.exists() and p.is_dir():
            return p
    return None


def _iter_images(base: Path):
    for species_dir in base.iterdir():
        if not species_dir.is_dir():
            continue
        species = species_dir.name
        for root, _dirs, files in os.walk(species_dir):
            for f in files:
                if any(f.endswith(ext) for ext in IMG_EXTS):
                    yield species, Path(root) / f


def _file_timestamp(p: Path) -> datetime:
    try:
        ts = p.stat().st_mtime
        return datetime.fromtimestamp(ts)
    except Exception:
        # Fallback: spread over last 30 days
        days_back = 30
        return datetime.utcnow() - timedelta(days=(hash(p.name) % days_back))


def _aggregate_daily(points: List[Tuple[datetime, str]]) -> Dict[str, List[Tuple[datetime, int]]]:
    # points: list of (timestamp, species)
    buckets: Dict[str, Dict[datetime, int]] = {}
    for ts, sp in points:
        day = datetime(ts.year, ts.month, ts.day)
        buckets.setdefault(sp, {})[day] = buckets.setdefault(sp, {}).get(day, 0) + 1
    # Sort days
    out: Dict[str, List[Tuple[datetime, int]]] = {}
    for sp, by_day in buckets.items():
        days = sorted(by_day.items(), key=lambda x: x[0])
        out[sp] = days
    return out


def build_or_get_timeseries(force_rebuild: bool = False) -> Dict[str, List[Tuple[datetime, int]]]:
    global _TS_CACHE, _TS_CACHE_BUILT_AT

    fresh = False
    if _TS_CACHE_BUILT_AT is not None:
        age = (datetime.utcnow() - _TS_CACHE_BUILT_AT).total_seconds()
        fresh = age < _TS_CACHE_TTL_SECONDS

    if not force_rebuild and _TS_CACHE is not None and fresh:
        return _TS_CACHE

    base = _find_dataset_dir()
    if not base:
        _TS_CACHE = {}
        _TS_CACHE_BUILT_AT = datetime.utcnow()
        return _TS_CACHE

    # Collect points
    pts: List[Tuple[datetime, str]] = []
    for species, path in _iter_images(base):
        ts = _file_timestamp(path)
        pts.append((ts, species))

    if not pts:
        _TS_CACHE = {}
        _TS_CACHE_BUILT_AT = datetime.utcnow()
        return _TS_CACHE

    series = _aggregate_daily(pts)

    # Optional: ensure continuous days by filling gaps with 0 up to a limit
    for sp, days in list(series.items()):
        if not days:
            continue
        filled: List[Tuple[datetime, int]] = []
        start = days[0][0]
        end = days[-1][0]
        cur = start
        idx = 0
        while cur <= end:
            if idx < len(days) and days[idx][0] == cur:
                filled.append(days[idx])
                idx += 1
            else:
                filled.append((cur, 0))
            cur = cur + timedelta(days=1)
        series[sp] = filled

    _TS_CACHE = series
    _TS_CACHE_BUILT_AT = datetime.utcnow()
    return _TS_CACHE


def top_species_by_volume(n: int = 5) -> List[str]:
    ser = build_or_get_timeseries()
    ranked = sorted(ser.items(), key=lambda kv: sum(v for _d, v in kv[1]), reverse=True)
    return [sp for sp, _ in ranked[:n]]
