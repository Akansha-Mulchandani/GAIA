import os
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras import backend as K
import numpy as np
from PIL import Image
from fastapi import HTTPException
from typing import List, Dict, Any, Optional, Union, Tuple
import json

# Create a custom DepthwiseConv2D class to handle the 'groups' parameter
class FixedDepthwiseConv2D(tf.keras.layers.DepthwiseConv2D):
    def __init__(self, *args, **kwargs):
        if 'groups' in kwargs:
            del kwargs['groups']  # Remove the 'groups' argument
        super().__init__(*args, **kwargs)

class ButterflyClassifier:
    def __init__(self):
        # Configure TensorFlow to use less memory
        gpus = tf.config.experimental.list_physical_devices('GPU')
        if gpus:
            try:
                for gpu in gpus:
                    tf.config.experimental.set_memory_growth(gpu, True)
                logical_gpus = tf.config.experimental.list_logical_devices('GPU')
                print(f"{len(gpus)} Physical GPUs, {len(logical_gpus)} Logical GPUs")
            except RuntimeError as e:
                print(e)
        
        self.model = None
        self.class_names = []
        self.load_model()
    
    def load_model(self):
        try:
            # Load model with custom objects
            custom_objects = {
                'FixedDepthwiseConv2D': FixedDepthwiseConv2D
            }
            
            # Try multiple possible model paths
            possible_paths = [
                '/app/data/butterflies/efficientnetb0_butterfly_model.h5',  # Docker container path
                os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'butterflies', 'efficientnetb0_butterfly_model.h5'),  # Local dev path
                os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data', 'butterflies', 'efficientnetb0_butterfly_model.h5')
            ]
            
            model_loaded = False
            for model_path in possible_paths:
                if os.path.exists(model_path):
                    print(f"Attempting to load model from: {model_path}")
                    try:
                        # Try to load the model with the custom objects
                        self.model = load_model(
                            model_path, 
                            custom_objects=custom_objects,
                            compile=False
                        )
                        # Verify the model was loaded correctly
                        if self.model is not None:
                            print(f"Successfully loaded model from: {model_path}")
                            print(f"Model input shape: {self.model.input_shape}")
                            print(f"Model output shape: {self.model.output_shape}")
                            model_loaded = True
                            break
                        else:
                            print(f"Warning: Model loaded but is None for path: {model_path}")
                    except Exception as load_error:
                        print(f"Error loading model from {model_path}: {str(load_error)}")
                        import traceback
                        print(f"Traceback: {traceback.format_exc()}")
                    
            if not model_loaded:
                raise FileNotFoundError("Could not find model file in any of the expected locations")
            # Try to load class names from the model or training directory
            try:
                # First, check if the model has class names in its config
                if hasattr(self.model, 'class_names'):
                    self.class_names = self.model.class_names
                    print(f"Loaded {len(self.class_names)} class names from model")
                else:
                    # If not in model, try to load from the training directory
                    possible_train_dirs = [
                        '/app/data/butterflies/train',  # Docker container path
                        os.path.join(os.path.dirname(__file__), '..', '..', '..', 'data', 'butterflies', 'train'),  # Local dev path
                        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data', 'butterflies', 'train')
                    ]
                    
                    for data_dir in possible_train_dirs:
                        if os.path.exists(data_dir) and os.path.isdir(data_dir):
                            self.class_names = sorted([d for d in os.listdir(data_dir) 
                                                     if os.path.isdir(os.path.join(data_dir, d))])
                            print(f"Loaded {len(self.class_names)} class names from directory: {data_dir}")
                            break
                    
                    # If still no class names, use the ones from the model's output layer
                    if not self.class_names and hasattr(self.model, 'output') and hasattr(self.model.output, 'shape'):
                        num_classes = self.model.output.shape[-1]
                        self.class_names = [f'class_{i}' for i in range(num_classes)]
                        print(f"Using {num_classes} generic class names")
                    
                    if not self.class_names:
                        raise FileNotFoundError("Could not find class names in model or training directory")
                        
            except Exception as e:
                print(f"Warning: Could not load class names: {str(e)}. Using placeholder class names.")
                # Fallback to a reasonable number of classes based on common butterfly datasets
                self.class_names = [f'class_{i}' for i in range(100)]  # Increased to 100 as a safer default
        except Exception as e:
            print(f"Error loading model: {str(e)}")
            # Load a placeholder model if the main one fails
            self.model = self._create_placeholder_model()
            self.class_names = ['Placeholder Class']

    def _create_placeholder_model(self):
        """Create a minimal model for development purposes"""
        model = tf.keras.Sequential([
            tf.keras.layers.Dense(10, activation='softmax', input_shape=(224, 224, 3))
        ])
        return model

    def preprocess_image(self, img_path: str):
        """
        Preprocess the image for prediction
        
        Args:
            img_path: Path to the image file
            
        Returns:
            Preprocessed image array ready for model input
        """
        try:
            # Open and convert to RGB (in case image is RGBA or grayscale)
            img = Image.open(img_path).convert('RGB')
            
            # Resize to expected input shape
            target_size = (224, 224)
            if img.size != target_size:
                img = img.resize(target_size, Image.Resampling.LANCZOS)
            
            # Convert to numpy array and normalize
            img_array = np.array(img, dtype=np.float32) / 255.0
            
            # Add batch dimension
            img_array = np.expand_dims(img_array, axis=0)
            
            # Verify the shape is correct
            if img_array.shape != (1, 224, 224, 3):
                print(f"Warning: Unexpected image shape after preprocessing: {img_array.shape}")
                
            return img_array
            
        except Exception as e:
            error_msg = f"Error processing image: {str(e)}"
            print(error_msg)
            raise HTTPException(status_code=400, detail=error_msg)
    
    def predict(self, img_path: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Make predictions on an image
        
        Args:
            img_path: Path to the image file
            top_k: Number of top predictions to return
            
        Returns:
            List of prediction dictionaries with species, confidence, and class_id
        """
        print(f"Starting prediction for {img_path}...")
        
        # Check if model is loaded
        if self.model is None:
            error_msg = "Error: Model is not loaded. Cannot make predictions."
            print(error_msg)
            return [{"species": "model_error", "confidence": 0.0, "class_id": -1, "error": error_msg}]
        
        try:
            # Preprocess the image
            print("Preprocessing image...")
            processed_img = self.preprocess_image(img_path)
            
            if processed_img is None:
                error_msg = "Error: Failed to preprocess image"
                print(error_msg)
                return [{"species": "preprocess_error", "confidence": 0.0, "class_id": -1, "error": error_msg}]

            # Print input shape for debugging
            print(f"Model input shape: {processed_img.shape}, dtype: {processed_img.dtype}")
            print(f"Input range - min: {np.min(processed_img):.4f}, max: {np.max(processed_img):.4f}")

            # Make prediction
            print("Running model prediction...")
            predictions = self.model.predict(processed_img, verbose=1)  # Set verbose=1 to see prediction progress
            print(f"Raw predictions shape: {predictions.shape}")
            
            # Ensure we have valid predictions
            if predictions is None or predictions.size == 0:
                error_msg = "Received empty predictions from model"
                print(error_msg)
                return [{"species": "prediction_error", "confidence": 0.0, "class_id": -1, "error": error_msg}]
            
            # Convert predictions to 1D array and apply softmax if needed
            try:
                predictions = np.squeeze(predictions)
                
                # If model doesn't have softmax activation, apply it manually
                if not np.allclose(np.sum(predictions), 1.0, rtol=1e-3):
                    print("Applying softmax to predictions")
                    predictions = np.exp(predictions) / np.sum(np.exp(predictions))
                
                # Ensure we have a 1D array
                if predictions.ndim > 1:
                    predictions = predictions[0]  # Take first sample if batch prediction
                
                predictions = np.asarray(predictions, dtype=np.float32)
                
                # Print prediction stats for debugging
                print(f"Predictions - min: {np.min(predictions):.6f}, "
                      f"max: {np.max(predictions):.6f}, "
                      f"sum: {np.sum(predictions):.6f}")
                
            except Exception as e:
                error_msg = f"Error processing predictions: {str(e)}"
                print(error_msg)
                return [{"species": "processing_error", "confidence": 0.0, "class_id": -1, "error": error_msg}]
            
            # Get top K predictions
            try:
                # Get indices of top k predictions
                top_k = min(top_k, len(predictions))
                
                # Get top k indices with highest confidence
                top_k_indices = np.argpartition(predictions, -top_k)[-top_k:]
                
                # Sort by confidence in descending order
                top_k_indices = top_k_indices[np.argsort(predictions[top_k_indices])][::-1]
                
                # Prepare results
                results = []
                total_confidence = np.sum(predictions[top_k_indices])
                
                for i, idx in enumerate(top_k_indices):
                    idx = int(idx)
                    raw_confidence = float(predictions[idx])
                    
                    # Normalize confidence to sum to 1.0 for top-k
                    normalized_confidence = raw_confidence / total_confidence if total_confidence > 0 else 0.0
                    
                    # Get class name with fallback
                    species = f"class_{idx}"
                    if (isinstance(self.class_names, (list, np.ndarray)) and 
                        0 <= idx < len(self.class_names)):
                        species = str(self.class_names[idx])
                    
                    # Format confidence as percentage with 2 decimal places
                    confidence_pct = round(normalized_confidence * 100, 2)
                    
                    results.append({
                        "species": species,
                        "confidence": confidence_pct / 100.0,  # Store as float between 0-1
                        "confidence_pct": confidence_pct,      # Store as percentage for display
                        "class_id": idx
                    })
                
                print(f"Successfully generated {len(results)} predictions")
                print("Top predictions:", [
                    f"{r['species']}: {r['confidence_pct']:.2f}%" 
                    for r in results
                ])
                
                return results
                
            except Exception as e:
                error_msg = f"Error processing top-k predictions: {str(e)}"
                print(error_msg)
                import traceback
                print(traceback.format_exc())
                return [{"species": "processing_error", "confidence": 0.0, "class_id": -1, "error": error_msg}]
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

# Singleton instance
butterfly_classifier = ButterflyClassifier()
