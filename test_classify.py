import requests
import os

def test_classification():
    url = "http://localhost:8000/api/butterfly/classify"
    
    # Use a sample image from the test directory
    image_path = os.path.join("data", "butterflies", "test", "MONARCH", "1.jpg")
    
    # Convert to absolute path for better error messages
    abs_path = os.path.abspath(image_path)
    print(f"Attempting to open image at: {abs_path}")
    
    # Check if file exists
    if not os.path.exists(abs_path):
        print(f"Error: File not found at {abs_path}")
        print("Current working directory:", os.getcwd())
        return
    
    try:
        # Open the file in binary mode
        with open(abs_path, 'rb') as img:
            # Create a dictionary with the file object and specify the content type
            files = {
                'file': ('butterfly.jpg', img, 'image/jpeg')
            }
            
            # Make the request with the file and some additional data
            response = requests.post(
                url,
                files=files,
                data={'top_k': 5}  # Optional: specify number of results
            )
            
            # Print the response
            print("Status Code:", response.status_code)
            try:
                print("Response:", response.json())
            except ValueError:
                print("Response content:", response.text)
        
    except requests.exceptions.RequestException as e:
        print("Request error:", str(e))
    except Exception as e:
        print("Error:", str(e))

if __name__ == "__main__":
    test_classification()
