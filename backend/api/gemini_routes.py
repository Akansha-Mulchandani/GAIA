from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from app.services.gemini_classifier import get_gemini_classifier
import google.generativeai as genai
import logging
from typing import List, Dict, Any
import os
from pathlib import Path
from datetime import datetime
import re

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/classify")
async def classify_image_with_gemini(
    file: UploadFile = File(...)
):
    """
    Classify a butterfly/moth image using Google's Gemini model.
    
    Args:
        file: Image file to classify (JPEG, PNG, etc.)
        
    Returns:
        List of predictions with species information and confidence scores
    """
    try:
        # Check if file is an image
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail=f"Invalid file type: {file.content_type}. Must be an image."
            )
        
        # Read the image file
        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty file provided")
        
        # Log the request
        logger.info(f"Classifying image: {file.filename} ({len(image_bytes)} bytes)")
        
        # Get predictions
        try:
            classifier = get_gemini_classifier()
            predictions = await classifier.classify_image(image_bytes)
            
            # Ensure we have valid predictions
            if not predictions or not isinstance(predictions, list):
                raise ValueError("Invalid prediction format received from Gemini")
                
            # Format the response
            response = {
                "success": True,
                "predictions": predictions,
                "model": "gemini-pro-vision"
            }
            
            logger.info(f"Classification successful. Found {len(predictions)} predictions.")
            return JSONResponse(content=response)
            
        except Exception as e:
            logger.error(f"Error in Gemini classification: {str(e)}", exc_info=True)
            raise HTTPException(
                status_code=500,
                detail=f"Error processing image with Gemini: {str(e)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in classification: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"An unexpected error occurred: {str(e)}"
        )

@router.get("/species")
async def list_species():
    try:
        items = _known_species()
        return JSONResponse(content={"success": True, "species": items})
    except Exception as e:
        logger.error(f"Failed to list species: {e}")
        raise HTTPException(status_code=500, detail="Failed to list species")

@router.get("/models")
async def list_models():
    try:
        models = genai.list_models()
        out = []
        for m in models:
            name = getattr(m, 'name', str(m))
            input_types = getattr(m, 'input_token_limit', None)
            modalities = getattr(m, 'supported_generation_methods', None)
            out.append({
                "name": name,
                "methods": modalities,
                "input_token_limit": input_types,
            })
        return JSONResponse(content={"success": True, "models": out})
    except Exception as e:
        logger.error(f"Failed to list models: {e}")
        raise HTTPException(status_code=500, detail="Failed to list models")


def _dataset_train_dir() -> Path:
    candidates = [
        Path("/app/data/butterflies/train"),
        Path("/app/data/temp_extract/train"),
    ]
    for p in candidates:
        if p.exists() and p.is_dir():
            return p
    # create temp_extract path if nothing exists
    p = Path("/app/data/temp_extract/train")
    p.mkdir(parents=True, exist_ok=True)
    return p


def _writable_train_dir() -> Path:
    """Directory guaranteed to be writable for saving new images.

    We use /app/data/temp_extract/train for all upserted images so we don't
    depend on host permissions of the butterflies dataset.
    """
    p = Path("/app/data/temp_extract/train")
    p.mkdir(parents=True, exist_ok=True)
    return p


def _normalize_name(s: str) -> str:
    s = s.strip()
    s = re.sub(r"\s+", " ", s)
    s = s.replace("/", "-")
    return s


def _known_species() -> List[str]:
    roots = [
        Path("/app/data/butterflies/train"),
        Path("/app/data/temp_extract/train"),
    ]
    seen = set()
    names: List[str] = []
    for root in roots:
        if not root.exists() or not root.is_dir():
            continue
        for d in root.iterdir():
            if d.is_dir() and d.name not in seen:
                seen.add(d.name)
                names.append(d.name)
    return sorted(names)


@router.post("/classify-upsert")
async def classify_upsert(
    file: UploadFile = File(...),
    create_if_unknown: bool = True,
    species_hint: str | None = None,
):
    try:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}. Must be an image.")

        image_bytes = await file.read()
        if not image_bytes:
            raise HTTPException(status_code=400, detail="Empty file provided")

        # Determine target species from hint or Gemini
        top_species = None
        if species_hint and species_hint.strip():
            top_species = _normalize_name(species_hint)
        else:
            # Try Gemini classification
            predictions = None
            try:
                classifier = get_gemini_classifier()
                predictions = await classifier.classify_image(image_bytes)
            except Exception as ge:
                logger.error(f"Gemini classification failed: {ge}")
                predictions = []
            if not isinstance(predictions, list) or not predictions:
                predictions = [{"species": "Unknown", "confidence": 0.0}]
            top_species = _normalize_name(str(predictions[0].get("species", "Unknown")))

        # Determine target species based on known folders
        known = _known_species()
        known_norm = {k.lower(): k for k in known}
        top_norm = top_species.lower()

        target_species = None
        # exact case-insensitive match
        if top_norm in known_norm:
            target_species = known_norm[top_norm]
        else:
            # try fuzzy contains both ways against known list
            for k in known:
                kl = k.lower()
                if kl in top_norm or top_norm in kl:
                    target_species = k
                    break

        # Use a writable base directory for saved images
        base = _writable_train_dir()
        action = "created"
        if target_species is None:
            if not create_if_unknown:
                return JSONResponse(content={
                    "success": True,
                    "predictions": predictions,
                    "upsert": {"action": "none", "reason": "unknown_and_creation_disabled"}
                })
            # create new species folder from predicted name or timestamp
            name_seed = top_species if top_species and top_species.lower() != "unknown" else f"Unknown_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
            safe = _normalize_name(name_seed)
            target_species = safe
            (base / target_species).mkdir(parents=True, exist_ok=True)
        else:
            action = "incremented"

        # Save the image file into the species directory
        ext = os.path.splitext(file.filename or "image.jpg")[1] or ".jpg"
        save_name = f"upload_{datetime.utcnow().strftime('%Y%m%d_%H%M%S_%f')}{ext}"
        species_dir = base / target_species
        species_dir.mkdir(parents=True, exist_ok=True)
        save_path = species_dir / save_name
        with open(save_path, "wb") as f:
            f.write(image_bytes)

        # Invalidate species clusters cache so Species Discovery refreshes
        try:
            from . import species_routes
            species_routes._CLUSTERS_CACHE = []
            species_routes._CACHE_BUILT_AT = None
        except Exception as e:
            logger.warning(f"Failed to invalidate clusters cache: {e}")

        return JSONResponse(content={
            "success": True,
            "predictions": predictions,
            "upsert": {"action": action, "species": target_species, "saved": str(save_path)}
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in classify-upsert: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")
