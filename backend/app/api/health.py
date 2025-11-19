from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import os

router = APIRouter()

@router.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        return JSONResponse(
            status_code=200,
            content={
                "status": "healthy",
                "message": "Service is up and running"
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "unhealthy",
                "error": str(e)
            }
        )
