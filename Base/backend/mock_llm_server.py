"""
Sample WebSocket LLM Server
This is an example server that demonstrates the expected WebSocket interface
Replace this with your actual LLM WebSocket server
"""

import asyncio
import websockets
import json
import logging
from datetime import datetime

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockLLMServer:
    """Mock LLM server for testing the WebSocket integration"""
    
    def __init__(self):
        self.clients = set()
    
    async def register_client(self, websocket):
        """Register a new client"""
        self.clients.add(websocket)
        logger.info(f"Client connected. Total clients: {len(self.clients)}")
    
    async def unregister_client(self, websocket):
        """Unregister a client"""
        self.clients.discard(websocket)
        logger.info(f"Client disconnected. Total clients: {len(self.clients)}")
    
    async def handle_client(self, websocket, path):
        """Handle client connection"""
        await self.register_client(websocket)
        
        try:
            # Keep connection alive and handle multiple messages
            while True:
                try:
                    message = await websocket.recv()
                    await self.process_message(websocket, message)
                except websockets.exceptions.ConnectionClosed:
                    logger.info("Client connection closed normally")
                    break
                    
        except Exception as e:
            logger.error(f"Error handling client: {e}")
        finally:
            await self.unregister_client(websocket)
    
    async def process_message(self, websocket, message):
        """Process incoming message and send response"""
        try:
            # Parse incoming JSON
            data = json.loads(message)
            user_message = data.get('message', '')
            metadata = data.get('metadata', {})
            settings = data.get('settings', {})
            
            logger.info(f"Received message: {user_message[:50]}...")
            
            # Check for health check
            if metadata.get('health_check'):
                response = {
                    'response': 'pong',
                    'status': 'healthy',
                    'timestamp': datetime.utcnow().isoformat(),
                    'model': 'mock-llm-v1.0'
                }
            else:
                # Generate mock response based on message content
                response = await self.generate_mock_response(user_message, metadata, settings)
            
            # Send response back
            await websocket.send(json.dumps(response))
            logger.info("Response sent to client")
            
        except json.JSONDecodeError:
            error_response = {
                'error': 'Invalid JSON format',
                'timestamp': datetime.utcnow().isoformat()
            }
            await websocket.send(json.dumps(error_response))
            
        except Exception as e:
            error_response = {
                'error': f'Server error: {str(e)}',
                'timestamp': datetime.utcnow().isoformat()
            }
            await websocket.send(json.dumps(error_response))
    
    async def generate_mock_response(self, message, metadata, settings):
        """Generate a mock LLM response"""
        
        # Simulate processing delay
        await asyncio.sleep(0.5)
        
        sql_mode = metadata.get('sql_mode', False)
        advanced_ai = metadata.get('advanced_ai', False)
        
        # Generate response based on context
        if sql_mode:
            if 'select' in message.lower() or 'query' in message.lower():
                content = f"Here's the SQL analysis for your query: '{message}'. This would return structured data from your database tables."
                tokens = 120
            else:
                content = f"I can help you with SQL operations. Your message: '{message}' seems to be a database-related request."
                tokens = 80
        else:
            if advanced_ai:
                content = f"[Advanced AI Mode] I understand your request: '{message}'. Using enhanced reasoning capabilities, I can provide detailed analysis and comprehensive responses."
                tokens = 200
            else:
                content = f"I received your message: '{message}'. I'm here to help you with your questions and tasks."
                tokens = 100
        
        # Simulate token usage based on response length
        max_tokens = settings.get('max_tokens', 4000)
        temperature = settings.get('temperature', 0.7)
        
        response = {
            'response': content,
            'content': content,  # Alternative field name
            'tokens_used': min(tokens, max_tokens),
            'model': 'mock-llm-v1.0',
            'finish_reason': 'completed',
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': {
                'sql_mode': sql_mode,
                'advanced_ai': advanced_ai,
                'temperature': temperature,
                'max_tokens': max_tokens
            },
            'usage': {
                'total_tokens': tokens,
                'prompt_tokens': len(message.split()) * 2,  # Rough estimate
                'completion_tokens': tokens - (len(message.split()) * 2)
            }
        }
        
        return response

async def main():
    """Start the mock LLM WebSocket server"""
    server = MockLLMServer()
    
    print("Starting Mock LLM WebSocket Server...")
    print("WebSocket URL: ws://localhost:8080/chat")
    print("Press Ctrl+C to stop")
    
    # Start server
    start_server = websockets.serve(
        server.handle_client,
        "localhost",
        8080,
        subprotocols=["chat"]
    )
    
    await start_server
    
    # Keep server running
    await asyncio.Future()  # Run forever

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nServer stopped")
    except Exception as e:
        print(f"Server error: {e}")
