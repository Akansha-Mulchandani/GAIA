import requests
import os

def test_classify():
    url = "http://localhost:8000/api/gemini/classify"
    image_path = "data/butterflies/train/ADONIS/001.jpg"
    
    # Verify the image exists
    if not os.path.exists(image_path):
        print(f"Error: Image not found at {image_path}")
        print("Please ensure the path is correct and the image exists.")
        return
    
    try:
        with open(image_path, 'rb') as img:
            files = {'file': (os.path.basename(image_path), img, 'image/jpeg')}
            print(f"Sending request to {url} with image: {image_path}")
            response = requests.post(url, files=files)
            
        print(f"\nStatus Code: {response.status_code}")
        print("Response:")
        
        try:
            print(response.json())
        except Exception as e:
            print(f"Failed to parse JSON response: {e}")
            print(f"Raw response: {response.text}")
            
    except requests.exceptions.RequestException as e:
        print(f"\nRequest failed: {str(e)}")
        print("\nTroubleshooting steps:")
        print("1. Make sure the backend service is running")
        print("2. Check if the API endpoint is correct")
        print("3. Verify your internet connection")
    except Exception as e:
        print(f"\nAn unexpected error occurred: {str(e)}")

if __name__ == "__main__":
    test_classify()
