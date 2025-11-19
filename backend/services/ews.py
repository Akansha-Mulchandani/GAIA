from __future__ import annotations
from typing import List, Dict, Tuple
from datetime import datetime
import math

# Helper: compute rolling mean for detrending

def rolling_mean(values: List[float], window: int) -> List[float]:
    if window <= 1:
        return values[:]
    out: List[float] = []
    s = 0.0
    q: List[float] = []
    for v in values:
        q.append(v)
        s += v
        if len(q) > window:
            s -= q.pop(0)
        out.append(s / len(q))
    return out


def zscore_vs_baseline(values: List[float], baseline_n: int) -> List[float]:
    if not values:
        return []
    b = values[:max(1, min(len(values), baseline_n))]
    mu = sum(b) / len(b)
    var = sum((x - mu) ** 2 for x in b) / max(1, len(b))
    sd = math.sqrt(var) if var > 0 else 1.0
    return [(x - mu) / sd for x in values]


def lag1_autocorr(residuals: List[float], window: int) -> List[float]:
    if not residuals:
        return []
    out: List[float] = []
    x: List[float] = []
    for r in residuals:
        x.append(r)
        if len(x) < 2:
            out.append(0.0)
            continue
        w = x[-window:] if len(x) >= window else x
        xm = sum(w) / len(w)
        num = sum((w[i] - xm) * (w[i-1] - xm) for i in range(1, len(w)))
        den = sum((w[i] - xm) ** 2 for i in range(len(w)))
        ac = num / den if den != 0 else 0.0
        out.append(max(-1.0, min(1.0, ac)))
    return out


def rolling_variance(residuals: List[float], window: int) -> List[float]:
    if not residuals:
        return []
    out: List[float] = []
    x: List[float] = []
    for r in residuals:
        x.append(r)
        w = x[-window:] if len(x) >= window else x
        m = sum(w) / len(w)
        var = sum((v - m) ** 2 for v in w) / max(1, len(w))
        out.append(var)
    return out


def rolling_trend(values: List[float], window: int) -> List[float]:
    # simple linear regression slope over sliding window
    if not values:
        return []
    out: List[float] = []
    x: List[float] = []
    for v in values:
        x.append(v)
        w = x[-window:] if len(x) >= window else x
        n = len(w)
        if n < 2:
            out.append(0.0)
            continue
        xs = list(range(n))
        xm = (n - 1) / 2.0
        ym = sum(w) / n
        num = sum((xs[i] - xm) * (w[i] - ym) for i in range(n))
        den = sum((xs[i] - xm) ** 2 for i in range(n))
        slope = num / den if den != 0 else 0.0
        out.append(slope)
    return out


def combine_risk(ac_z: float, var_z: float, trend_z: float, ema_prev: float | None = None, alpha: float = 0.25) -> float:
    # map z in [-3,3] -> [0,1]
    def clamp01(z: float) -> float:
        z = max(-3.0, min(3.0, z))
        return (z + 3.0) / 6.0
    ac = clamp01(ac_z)
    va = clamp01(var_z)
    tr = clamp01(trend_z)
    raw = 0.5 * ac + 0.3 * va + 0.2 * tr
    score = raw if ema_prev is None else (alpha * raw + (1 - alpha) * ema_prev)
    return max(0.0, min(1.0, score))


def compute_metrics_from_counts(series: List[Tuple[datetime, int]], trend_window: int = 14, metric_window: int = 14, baseline: int = 30) -> Dict[str, List[float]]:
    # expects daily counts (date, count), sorted by date
    if not series:
        return {"dates": [], "detections": [], "autocorrelation": [], "variance": [], "trend": [], "risk": []}
    dates = [d for d, _ in series]
    vals = [float(c) for _d, c in series]

    # detrend residuals
    trend = rolling_mean(vals, trend_window)
    resid = [v - t for v, t in zip(vals, trend)]

    # metrics
    ac = lag1_autocorr(resid, metric_window)
    var = rolling_variance(resid, metric_window)

    # z-scores vs baseline (on metric values)
    ac_z = zscore_vs_baseline(ac, baseline)
    var_z = zscore_vs_baseline(var, baseline)

    # trend slope of the original values (not residuals), normalized
    slope = rolling_trend(vals, metric_window)
    slope_z = zscore_vs_baseline(slope, baseline)

    # risk as [0,1], map to [0,100] later
    risk: List[float] = []
    ema: float | None = None
    for i in range(len(vals)):
        r = combine_risk(ac_z[i], var_z[i], slope_z[i], ema_prev=ema)
        ema = r
        risk.append(r)

    return {
        "dates": dates,
        "detections": vals,
        "autocorrelation": ac,
        "variance": var,
        "trend": slope,
        "risk": [min(100.0, max(0.0, x * 100.0)) for x in risk],
    }
