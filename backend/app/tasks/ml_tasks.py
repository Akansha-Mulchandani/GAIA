from .celery_config import celery_app
import os
import numpy as np
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing import image
from PIL import Image
import io

# Import the custom DepthwiseConv2D class
from ..services.butterfly_classifier import DepthwiseConv2D

# Initialize the model (will be loaded when the worker starts)
model = None

@celery_app.task(bind=True)
def classify_butterfly_image(self, image_data):
    """
    Classify a butterfly image using the pre-trained model
    
    Args:
        image_data: Binary image data
        
    Returns:
        dict: Classification results
    """
    global model
    
    # Lazy load the model
    if model is None:
        try:
            from ..services.butterfly_classifier import ButterflyClassifier
            classifier = ButterflyClassifier()
            model = classifier.model
        except Exception as e:
            return {
                'status': 'error',
                'message': f'Failed to load model: {str(e)}'
            }
    
    try:
        # Convert binary data to image
        img = Image.open(io.BytesIO(image_data))
        
        # Preprocess the image
        img = img.resize((224, 224))  # Adjust size according to your model's expected input
        img_array = image.img_to_array(img)
        img_array = np.expand_dims(img_array, axis=0) / 255.0
        
        # Make prediction
        predictions = model.predict(img_array)
        predicted_class = np.argmax(predictions[0])
        confidence = float(predictions[0][predicted_class])
        
        # Get class labels (you'll need to replace this with your actual class labels)
        class_labels = ['class1', 'class2', 'class3']  # Replace with your actual class labels
        
        return {
            'status': 'success',
            'predicted_class': class_labels[predicted_class],
            'confidence': confidence,
            'all_predictions': predictions[0].tolist()
        }
        
    except Exception as e:
        return {
            'status': 'error',
            'message': f'Error processing image: {str(e)}'
        }
