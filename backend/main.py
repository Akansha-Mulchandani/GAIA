from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from websocket.handlers import socket_app

from api.species_routes import router as species_router
from api.edge_routes import router as edge_router
from api.prediction_routes import router as prediction_router
from api.simulation_routes import router as simulation_router
from api.butterfly_routes import router as butterfly_router
from api.gemini_routes import router as gemini_router
from api.health import router as health_router
from api.alerts_routes import router as alerts_router
from api.twin_routes import router as twin_router
from api.map_routes import router as map_router
from api.contact_routes import router as contact_router

app = FastAPI(title="GAIA Backend", version="0.1.0")

# Configure CORS to allow requests from the frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "http://localhost:8000",  # Backend itself
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Health check is now handled by the health_router

app.include_router(species_router, prefix="/api/species", tags=["species"]) 
app.include_router(edge_router, prefix="/api/edge", tags=["edge"]) 
app.include_router(prediction_router, prefix="/api/prediction", tags=["prediction"]) 
app.include_router(simulation_router, prefix="/api/simulation", tags=["simulation"])
app.include_router(butterfly_router, prefix="/api/butterfly", tags=["butterfly"])
app.include_router(gemini_router, prefix="/api/gemini", tags=["gemini"])
# Include health router at the root path
app.include_router(health_router, prefix="", tags=["health"])
app.include_router(alerts_router, prefix="/api/alerts", tags=["alerts"])
app.include_router(twin_router, prefix="/api/twin", tags=["twin"])
app.include_router(map_router, prefix="/api/map", tags=["map"])
app.include_router(contact_router, prefix="/api", tags=["contact"])

# Define the base directories for static files
STATIC_DIR = Path("/app/data/butterflies/train")
UPLOADS_DIR = Path("/app/data/temp_extract/train")

# Check if the directory exists and list its contents
if not STATIC_DIR.exists():
    print(f"Error: Static directory not found at {STATIC_DIR}")
    # Try to list the parent directory to debug
    parent_dir = STATIC_DIR.parent
    if parent_dir.exists():
        print(f"Contents of {parent_dir}:")
        for item in parent_dir.iterdir():
            print(f"  - {item.name} (dir: {item.is_dir()})")
else:
    print(f"Serving static files from: {STATIC_DIR}")
    # Mount the static files with the correct path
    try:
        # First try mounting with the full path
        app.mount("/static", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
        print("Successfully mounted static files")
    except Exception as e:
        print(f"Error mounting static files: {e}")
        print("Trying alternative mounting method...")
        try:
            # Try mounting with a different approach
            app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")
            print("Successfully mounted static files (alternative method)")
        except Exception as e2:
            print(f"Failed to mount static files: {e2}")

# Mount uploads directory for upserted species images if present
if UPLOADS_DIR.exists():
    try:
        print(f"Serving uploaded images from: {UPLOADS_DIR}")
        app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")
        print("Successfully mounted uploads")
    except Exception as e:
        print(f"Error mounting uploads: {e}")

# Mount Socket.IO app for realtime events
app.mount("/ws", socket_app)
