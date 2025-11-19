import os
import google.generativeai as genai
from PIL import Image
import io
import base64

def test_gemini():
    # Set up the API key
    api_key = "AIzaSyBLjF9BBOClHNWER8Hj9maI3aieKntR4GE"
    genai.configure(api_key=api_key)
    
    # Initialize the model
    model = genai.GenerativeModel('gemini-pro-vision')
    
    # Test with a simple text prompt first
    try:
        response = model.generate_content("Hello, can you see this message?")
        print("Text-only response:")
        print(response.text)
    except Exception as e:
        print(f"Error with text-only request: {str(e)}")
    
    # Now test with an image
    try:
        # Use a small test image (you can replace this with an actual image path)
        image_path = "data/butterflies/train/ADONIS/001.jpg"
        if os.path.exists(image_path):
            img = Image.open(image_path)
            response = model.generate_content(["What is in this image?", img])
            print("\nImage response:")
            print(response.text)
        else:
            print(f"\nImage not found at {image_path}")
    except Exception as e:
        print(f"\nError with image request: {str(e)}")

if __name__ == "__main__":
    test_gemini()
