from fastapi import APIRouter
import socketio
from datetime import datetime

# REST router reserved for future HTTP endpoints under /ws if needed
router = APIRouter()

# Socket.IO server using AsyncServer for ASGI
# We mount this ASGI app in main.py at /ws
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
socket_app = socketio.ASGIApp(sio, socketio_path="/ws/socket.io")

@sio.event
async def connect(sid, environ):
    # Optionally join rooms by query string later
    # e.g., room = environ.get('QUERY_STRING', '')
    pass

@sio.event
async def disconnect(sid):
    pass

# --- Helper emitters ---
async def emit_sim_progress(sim_id: int, phase: str, progress: int):
    await sio.emit(
        "sim_progress",
        {
            "simulation_id": sim_id,
            "phase": phase,
            "progress": progress,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

async def emit_sim_completed(sim_id: int, results: dict):
    await sio.emit(
        "sim_completed",
        {
            "simulation_id": sim_id,
            "results": results,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )

async def emit_edge_status(payload: dict):
    # payload may include: node_id, status, lat, lng, metrics
    await sio.emit(
        "edge_status",
        {
            **payload,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )
