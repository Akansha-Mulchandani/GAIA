from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import os
import uuid
from datetime import datetime
from app.services.butterfly_classifier import butterfly_classifier

router = APIRouter()

@router.post("/classify")
async def classify_butterfly(
    file: UploadFile = File(...),
    top_k: int = 5
):
    """
    Classify a butterfly/moth image
    
    - **file**: Image file to classify (JPEG, PNG)
    - **top_k**: Number of top predictions to return (default: 5)
    """
    print(f"Received classification request for file: {file.filename}")
    
    # Validate file type
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail=f"Invalid file type: {file.content_type}. Must be an image.")
    
    # Create temp directory if it doesn't exist
    temp_dir = os.path.join("temp", "uploads")
    os.makedirs(temp_dir, exist_ok=True)
    
    # Save uploaded file
    file_extension = os.path.splitext(file.filename or 'image.jpg')[1] or '.jpg'
    temp_filename = f"{uuid.uuid4()}{file_extension}"
    temp_path = os.path.join(temp_dir, temp_filename)
    
    try:
        # Read file content
        contents = await file.read()
        if not contents:
            raise HTTPException(status_code=400, detail="Empty file provided")
            
        # Save to temp file
        with open(temp_path, "wb") as buffer:
            buffer.write(contents)
        
        print(f"Saved uploaded file to: {temp_path} ({len(contents)} bytes)")
        
        # Get predictions
        print(f"Calling classifier.predict() with top_k={top_k}")
        predictions = butterfly_classifier.predict(temp_path, top_k=top_k)
        
        if not predictions:
            raise HTTPException(status_code=500, detail="No predictions returned from classifier")
        
        # Format response
        response = {
            "success": True,
            "predictions": predictions,
            "timestamp": datetime.utcnow().isoformat(),
            "filename": file.filename
        }
        print(f"Classification successful. Found {len(predictions)} predictions.")
        
        return JSONResponse(content=response)
        
    except HTTPException:
        raise
    except Exception as e:
        error_msg = f"Error during classification: {str(e)}"
        print(error_msg)
        raise HTTPException(status_code=500, detail=error_msg)
        
    finally:
        # Clean up temp file
        try:
            if os.path.exists(temp_path):
                os.remove(temp_path)
        except Exception as e:
            print(f"Warning: Failed to remove temp file {temp_path}: {str(e)}")

@router.get("/species")
async def list_species():
    """List all available butterfly/moth species"""
    try:
        species = list(butterfly_classifier.class_indices.values())
        return {
            "success": True,
            "count": len(species),
            "species": species,
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving species list: {str(e)}")
