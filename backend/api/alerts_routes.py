from fastapi import APIRouter, BackgroundTasks
from pydantic import BaseModel, HttpUrl
from typing import Optional, Dict, Any
import time
import json
import logging

try:
    import requests  # type: ignore
except Exception:  # pragma: no cover
    requests = None  # we will guard usage

logger = logging.getLogger(__name__)
router = APIRouter(tags=["alerts"])

# In-memory store for prototype (restart-safe not required for demo)
_ALERT_CONFIG: Dict[str, Any] = {
    "webhook_url": None,
    "email": None,
    "thresholds": {"variance": 0.7, "autocorr": 0.7},
    "last_trigger": None,
}


class Thresholds(BaseModel):
    variance: float = 0.7
    autocorr: float = 0.7


class SubscribeBody(BaseModel):
    webhook_url: Optional[HttpUrl] = None
    email: Optional[str] = None
    thresholds: Optional[Thresholds] = None


class EvaluateBody(BaseModel):
    variance: float
    autocorr: float
    context: Optional[Dict[str, Any]] = None


def _send_webhook(url: str, payload: Dict[str, Any]) -> Optional[int]:
    if not url:
        return None
    if requests is None:
        logger.warning("requests not available; skipping webhook post")
        return None
    try:
        r = requests.post(url, json=payload, timeout=5)
        return r.status_code
    except Exception as e:
        logger.error(f"Webhook POST failed: {e}")
        return None


def _maybe_alert(values: Dict[str, float], context: Optional[Dict[str, Any]] = None):
    th = _ALERT_CONFIG.get("thresholds", {})
    v = values.get("variance", 0)
    a = values.get("autocorr", 0)
    should = (v >= th.get("variance", 0.7)) or (a >= th.get("autocorr", 0.7))
    if not should:
        return {"triggered": False}

    payload = {
        "type": "gaia.alert",
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "signals": {"variance": v, "autocorr": a},
        "thresholds": th,
        "summary": "Early warning thresholds exceeded",
        "context": context or {},
    }
    status = _send_webhook(_ALERT_CONFIG.get("webhook_url"), payload)
    logger.info(f"Alert webhook status={status}")
    # Simulate email for demo
    if _ALERT_CONFIG.get("email"):
        logger.info(
            "Simulated email sent to %s with payload: %s",
            _ALERT_CONFIG.get("email"),
            json.dumps(payload)[:500],
        )
    _ALERT_CONFIG["last_trigger"] = {
        "at": payload["timestamp"],
        "status": status,
        "signals": payload["signals"],
    }
    return {"triggered": True, "status": status}


@router.post("/subscribe")
def subscribe(body: SubscribeBody):
    if body.webhook_url is not None:
        _ALERT_CONFIG["webhook_url"] = str(body.webhook_url)
    if body.email is not None:
        _ALERT_CONFIG["email"] = body.email
    if body.thresholds is not None:
        _ALERT_CONFIG["thresholds"] = body.thresholds.dict()
    return {"success": True, "config": _ALERT_CONFIG}


@router.get("/status")
def status():
    return {"success": True, "config": _ALERT_CONFIG}


@router.post("/evaluate")
def evaluate(body: EvaluateBody, bg: BackgroundTasks):
    # fire-and-forget to avoid blocking UI
    values = {"variance": body.variance, "autocorr": body.autocorr}
    bg.add_task(_maybe_alert, values, body.context or {})
    return {"success": True, "scheduled": True}


@router.post("/test")
def test_alert(bg: BackgroundTasks):
    bg.add_task(_maybe_alert, {"variance": 0.9, "autocorr": 0.85}, {"source": "manual_test"})
    return {"success": True}
