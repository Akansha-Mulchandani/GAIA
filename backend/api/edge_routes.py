from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

MOCK_NODES = [
    {
        "id": 1,
        "name": "Node-Amazon-01",
        "location": {"lat": -3.4653, "lng": -62.2159},
        "status": "online",
        "node_type": "research_station",
        "data_throughput": 128_000_000,
        "recent_detections": 23,
        "uptime_percent": 99.4,
    },
    {
        "id": 2,
        "name": "Node-Peru-03",
        "location": {"lat": -12.0464, "lng": -77.0428},
        "status": "online",
        "node_type": "sensor",
        "data_throughput": 84_000_000,
        "recent_detections": 12,
        "uptime_percent": 97.9,
    },
    {
        "id": 3,
        "name": "Node-Congo-07",
        "location": {"lat": -1.4419, "lng": 15.5560},
        "status": "maintenance",
        "node_type": "satellite",
        "data_throughput": 12_000_000,
        "recent_detections": 0,
        "uptime_percent": 87.2,
    },
    {
        "id": 4,
        "name": "Node-Australia-02",
        "location": {"lat": -25.2744, "lng": 133.7751},
        "status": "online",
        "node_type": "sensor",
        "data_throughput": 63_000_000,
        "recent_detections": 8,
        "uptime_percent": 96.1,
    },
    {
        "id": 5,
        "name": "Node-India-05",
        "location": {"lat": 20.5937, "lng": 78.9629},
        "status": "offline",
        "node_type": "research_station",
        "data_throughput": 0,
        "recent_detections": 0,
        "uptime_percent": 82.5,
    },
]

@router.get("/nodes")
async def list_nodes():
    return {
        "success": True,
        "data": MOCK_NODES,
        "message": "OK",
        "timestamp": datetime.utcnow().isoformat(),
    }

@router.get("/metrics")
async def network_metrics():
    data = {
        "nodes_online": sum(1 for n in MOCK_NODES if n["status"] == "online"),
        "nodes_total": len(MOCK_NODES),
        "ingestion_rate": 256_000_000,  # bytes/sec (mock)
        "edge_processing_percent": 95,
        "avg_latency_ms": 180,
    }
    return {
        "success": True,
        "data": data,
        "message": "OK",
        "timestamp": datetime.utcnow().isoformat(),
    }
