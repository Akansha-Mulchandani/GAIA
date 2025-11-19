import google.generativeai as genai

def test_gemini_api(api_key):
    try:
        # Configure the API key
        genai.configure(api_key=api_key)
        
        print("🔑 Successfully configured Gemini API with the provided key")
        print("🔄 Fetching available models...")
        
        # List available models
        models = list(genai.list_models())
        
        if not models:
            print("❌ No models found. This API key might not have access to any models.")
            return False
            
        print("\n✅ Success! This API key has access to the following models:")
        for i, model in enumerate(models, 1):
            print(f"{i}. {model.name}")
            
        # Check for specific models we might want to use
        vision_models = [m for m in models if 'vision' in m.name.lower() or '2.5' in m.name]
        
        if vision_models:
            print("\n🌟 Recommended models for image classification:")
            for model in vision_models:
                print(f"- {model.name} (Supports: {', '.join(model.supported_generation_methods)})")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        
        if "API key not valid" in str(e):
            print("\nThis API key appears to be invalid or doesn't have the necessary permissions.")
        elif "quota" in str(e).lower():
            print("\nThis API key has exceeded its quota or is not enabled for the Gemini API.")
        else:
            print("\nAn unexpected error occurred while trying to access the Gemini API.")
            
        return False

if __name__ == "__main__":
    # The API key you provided
    API_KEY = "AIzaSyDHoNPlsrcGZc-fvegUATcKQg_YYXy79ak"
    
    print("🔍 Testing Gemini API key...")
    success = test_gemini_api(API_KEY)
    
    if success:
        print("\n✨ You can now update your .env file with this key!")
    else:
        print("\n❌ Please check your API key and try again.")
