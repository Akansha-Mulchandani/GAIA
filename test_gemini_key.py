import google.generativeai as genai

def test_gemini_api():
    try:
        # Configure the API key
        api_key = "AIzaSyBLjF9BBOClHNWER8Hj9maI3aieKntR4GE"
        genai.configure(api_key=api_key)
        
        # List available models
        print("Attempting to connect to Gemini API...")
        models = list(genai.list_models())
        print("✅ Successfully connected to Gemini API!")
        print("\nAvailable models:")
        for model in models:
            print(f"- {model.name}")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting steps:")
        print("1. Verify your API key is correct and has access to the Gemini API")
        print("2. Check your internet connection")
        print("3. Make sure your account has the necessary permissions")

if __name__ == "__main__":
    test_gemini_api()
