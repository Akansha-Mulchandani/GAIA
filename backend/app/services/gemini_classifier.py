import os
import google.generativeai as genai
from fastapi import HTTPException
from typing import List, Dict, Any
import base64
from PIL import Image
import io
import logging

class GeminiClassifier:
    def __init__(self, api_key: str = None):
        # Accept GOOGLE_API_KEY or fallback to GEMINI_API_KEY for flexibility
        self.api_key = api_key or os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("GOOGLE_API_KEY environment variable not set")
        
        # Configure the Gemini API
        genai.configure(api_key=self.api_key)
        # Use a widely available model name for images
        # Note: Some keys/projects only allow certain models; we try a small set deterministically
        self.model = None
        last_err = None
        # Allow explicit model override via env (e.g., models/gemini-2.5-flash)
        model_env = os.getenv('GEMINI_MODEL')

        # Start with any explicit override first
        candidates = [model_env] if model_env else []

        # Then fall back to models that we KNOW this key lists and that support
        # generateContent with images
        candidates += [
            'models/gemini-2.5-flash-image', 'gemini-2.5-flash-image',
            'models/gemini-2.5-flash', 'gemini-2.5-flash',
            'models/gemini-flash-latest', 'gemini-flash-latest',
            'models/gemini-pro-latest', 'gemini-pro-latest',
        ]
        for name in candidates:
            if not name:
                continue
            try:
                self.model = genai.GenerativeModel(name)
                break
            except Exception as e:
                last_err = e
                continue
        if self.model is None:
            raise ValueError(f"Failed to initialize Gemini model: {last_err}")
    
    async def classify_image(self, image_bytes: bytes) -> List[Dict[str, Any]]:
        try:
            # Convert bytes to PIL Image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Prepare the prompt with more specific instructions
            prompt = """
            You are an expert lepidopterist. Analyze this butterfly/moth image and identify the most likely species with high confidence.

            INSTRUCTIONS:
            1. Examine the image carefully, focusing on wing patterns, colors, markings, and other distinctive features.
            2. Provide the most specific identification possible (species level if confident, otherwise genus or family).
            3. Assign a confidence score between 0.8 and 1.0 for your top prediction.
            4. Include key identifying features in the description.

            RESPONSE FORMAT (CRITICAL):
            - Respond with ONLY raw JSON.
            - Do NOT include markdown, code fences, backticks, natural language explanation, or any text before or after the JSON.
            - The JSON must be valid and directly parsable by a standard JSON parser.

            Use exactly this JSON schema:
            {
                "predictions": [
                    {
                        "species": "scientific_name (e.g., Papilio machaon)",
                        "common_name": "Common Name (e.g., Old World Swallowtail)",
                        "confidence": 0.95,
                        "description": "Detailed description including key identifying features, distribution, and interesting facts."
                    },
                    {
                        "species": "second_most_likely_species",
                        "common_name": "Second Most Likely Common Name",
                        "confidence": 0.85,
                        "description": "Description of this alternative identification."
                    }
                ]
            }

            IMPORTANT: 
            - If you're not extremely confident, provide a broader classification (genus or family) with appropriate confidence.
            - The first prediction should be the most confident one.
            - Confidence scores should reflect your certainty (0.9+ for high confidence, 0.8-0.89 for moderate confidence).
            - If the image is not a butterfly or moth, say so clearly in the description.
            """
            
            # Prepare content parts: prompt + inline image (base64)
            img_b64 = base64.b64encode(image_bytes).decode('utf-8')
            parts = [
                {"text": prompt},
                {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}}
            ]

            # Generate content (synchronous call; SDK returns a GenerateContentResponse)
            try:
                response = self.model.generate_content(parts)
            except Exception as model_err:
                # Log the real error for debugging, but return a safe fallback
                logging.error(f"Gemini generate_content failed: {model_err}")
                return [{
                    "species": "Unknown",
                    "common_name": "Unidentified Butterfly/Moth",
                    "confidence": 0.0,
                    "confidence_pct": 0.0,
                    "description": "Gemini could not confidently identify this image. Please try another image or a clearer photo."
                }]
            
            # Parse the response
            try:
                # Extract JSON from the response
                response_text = response.text.strip()
                
                # Clean up the response to handle markdown code blocks
                if '```json' in response_text:
                    response_text = response_text.split('```json')[1].split('```')[0].strip()
                elif '```' in response_text:
                    response_text = response_text.split('```')[1].split('```')[0].strip()
                
                # Clean up any non-JSON content
                start_idx = response_text.find('{')
                end_idx = response_text.rfind('}') + 1
                json_str = response_text[start_idx:end_idx]
                
                # Parse the JSON
                import json
                result = json.loads(json_str)
                
                # Ensure we have predictions and they're in the correct format
                predictions = result.get("predictions", [])
                if not predictions:
                    return [{
                        "species": "Unknown",
                        "common_name": "Unidentified Butterfly/Moth",
                        "confidence": 0.0,
                        "description": "Could not identify the species. Please try with a clearer image."
                    }]
                
                # Ensure confidence is a float and within valid range
                for pred in predictions:
                    if 'confidence' in pred:
                        try:
                            # Ensure confidence is a float between 0 and 1
                            confidence = float(pred['confidence'])
                            pred['confidence'] = max(0.0, min(1.0, confidence))
                        except (ValueError, TypeError):
                            pred['confidence'] = 0.8  # Default confidence if invalid
                    
                    # Add confidence percentage for frontend display
                    pred['confidence_pct'] = round(pred.get('confidence', 0) * 100, 1)
                
                # Sort predictions by confidence (highest first)
                predictions.sort(key=lambda x: x.get('confidence', 0), reverse=True)
                
                return predictions
                
            except Exception as e:
                # If JSON parsing fails, return a generic response
                return [{
                    "species": "Unknown",
                    "common_name": "Unknown Butterfly/Moth",
                    "confidence": 0.0,
                    "description": "Could not identify the species. " + str(e)
                }]
                
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Error processing image with Gemini: {str(e)}"
            )

# Create a singleton instance
gemini_classifier = None

def get_gemini_classifier():
    global gemini_classifier
    if gemini_classifier is None:
        gemini_classifier = GeminiClassifier()
    return gemini_classifier
