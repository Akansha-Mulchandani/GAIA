import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://localhost:8000/ws/socket.io/?EIO=4&transport=websocket"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected to WebSocket server")
            
            # Test connection by sending a ping
            await websocket.send("2probe")
            response = await websocket.recv()
            print(f"Server response: {response}")
            
            # Wait for a moment to see if we get any updates
            print("Waiting for messages...")
            try:
                while True:
                    message = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"Received message: {message}")
            except asyncio.TimeoutError:
                print("No messages received in 5 seconds")
                
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.get_event_loop().run_until_complete(test_websocket())
