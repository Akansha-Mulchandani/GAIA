from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

MOCK_WARNINGS = [
    {
        "id": 101,
        "ecosystem_id": "reef_a",
        "severity": "high",
        "message": "Critical slowing down detected (autocorrelation rising)",
        "created_at": datetime.utcnow().isoformat(),
    },
    {
        "id": 102,
        "ecosystem_id": "forest_madagascar",
        "severity": "medium",
        "message": "Variance increasing in keystone species population",
        "created_at": datetime.utcnow().isoformat(),
    },
]

MOCK_TIPPING = {
    "risk_level": "high",
    "risk_percent": 78,
    "estimated_time_months": 6,
    "confidence": 0.82,
}

@router.get("/warnings")
async def warnings():
    return {"success": True, "data": MOCK_WARNINGS, "message": "OK", "timestamp": datetime.utcnow().isoformat()}

@router.get("/tipping-points")
async def tipping_points():
    return {"success": True, "data": MOCK_TIPPING, "message": "OK", "timestamp": datetime.utcnow().isoformat()}

@router.get("/signals")
async def signals():
    # Mocked small timeseries for sparkline visuals
    data = {
        "autocorrelation": [0.12,0.18,0.22,0.25,0.29,0.34,0.38,0.41,0.43,0.47,0.5,0.54],
        "variance": [0.15,0.16,0.2,0.22,0.19,0.24,0.28,0.31,0.36,0.33,0.37,0.4],
        "detections": [8,9,7,10,11,14,12,15,17,16,18,20],
    }
    return {"success": True, "data": data, "message": "OK", "timestamp": datetime.utcnow().isoformat()}
