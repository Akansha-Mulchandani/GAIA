import requests
import os

def test_classification():
    url = "http://localhost:8000/api/butterfly/classify"
    
    # Try to find a test image
    test_image_path = None
    possible_paths = [
        "data/butterflies/test/MONARCH/1.jpg",
        "/app/data/butterflies/test/MONARCH/1.jpg",
        "backend/data/butterflies/test/MONARCH/1.jpg"
    ]
    
    for path in possible_paths:
        if os.path.exists(path):
            test_image_path = path
            break
    
    if not test_image_path:
        print("Error: Could not find a test image. Please ensure the test image exists.")
        print("Searched in:", possible_paths)
        return
    
    print(f"Using test image: {test_image_path}")
    
    try:
        with open(test_image_path, 'rb') as img:
            files = {'file': ('test.jpg', img, 'image/jpeg')}
            response = requests.post(url, files=files)
            
        print(f"Status Code: {response.status_code}")
        print("Response:", response.json())
        
    except Exception as e:
        print(f"Error: {str(e)}")
        if 'response' in locals():
            print(f"Response content: {response.text}")

if __name__ == "__main__":
    test_classification()
