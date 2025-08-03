"""
Custom LLM WebSocket Integration
This module handles WebSocket connections to your custom LLM service
"""

import asyncio
import websockets
import json
import logging
import os
from typing import Dict, Any, Optional
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class LLMWebSocketClient:
    """
    WebSocket client for custom LLM integration
    """
    
    def __init__(self):
        # Configuration from environment variables
        self.websocket_url = os.getenv('LLM_WEBSOCKET_URL', 'ws://localhost:8080/chat')
        self.api_key = os.getenv('LLM_API_KEY', '')
        self.model_name = os.getenv('LLM_MODEL_NAME', 'custom-model')
        self.timeout = int(os.getenv('LLM_TIMEOUT', '30'))
        self.max_retries = int(os.getenv('LLM_MAX_RETRIES', '3'))
        
        # Connection state
        self.websocket = None
        self.is_connected = False
        
        logger.info(f"LLM WebSocket client initialized with URL: {self.websocket_url}")
    
    async def connect(self):
        """Establish WebSocket connection to LLM service"""
        try:
            # Prepare headers - only add Authorization if API key is provided
            headers = {'User-Agent': 'Chatbot-Client/1.0'}
            if self.api_key and self.api_key.strip():
                headers['Authorization'] = f'Bearer {self.api_key}'
            
            self.websocket = await websockets.connect(
                self.websocket_url,
                timeout=self.timeout,
                extra_headers=headers
            )
            self.is_connected = True
            logger.info("Successfully connected to LLM WebSocket service")
            return True
            
        except Exception as e:
            logger.error(f"Failed to connect to LLM WebSocket: {str(e)}")
            self.is_connected = False
            return False
    
    async def disconnect(self):
        """Close WebSocket connection"""
        if self.websocket and not self.websocket.closed:
            try:
                await self.websocket.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket: {e}")
        self.websocket = None
        self.is_connected = False
        logger.info("Disconnected from LLM WebSocket service")
    
    async def send_message(self, message: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Send message to LLM and get response
        
        Args:
            message: The user message to send
            metadata: Additional metadata (sql_mode, session_id, etc.)
            
        Returns:
            Dict containing the LLM response and metadata
        """
        # Always ensure we have a fresh connection for each request
        if not self.is_connected or (self.websocket and self.websocket.closed):
            await self.connect()
        
        if not self.is_connected:
            raise ConnectionError("Unable to connect to LLM WebSocket service")
        
        # Prepare the message payload
        payload = {
            'message': message,
            'model': self.model_name,
            'timestamp': datetime.utcnow().isoformat(),
            'metadata': metadata or {},
            'settings': {
                'max_tokens': int(os.getenv('LLM_MAX_TOKENS', '4000')),
                'temperature': float(os.getenv('LLM_TEMPERATURE', '0.7')),
                'stream': False  # Set to True if you want streaming responses
            }
        }
        
        try:
            # Send message
            await self.websocket.send(json.dumps(payload))
            logger.info(f"Sent message to LLM: {message[:50]}...")
            
            # Wait for response
            response_raw = await asyncio.wait_for(
                self.websocket.recv(), 
                timeout=self.timeout
            )
            
            # Parse response
            response_data = json.loads(response_raw)
            logger.info("Received response from LLM")
            
            # Keep connection alive by not closing after each message
            
            return self._process_response(response_data)
            
        except asyncio.TimeoutError:
            logger.error("LLM WebSocket request timed out")
            # Reset connection on timeout
            await self.disconnect()
            raise TimeoutError("LLM request timed out")
            
        except websockets.exceptions.ConnectionClosed:
            logger.error("WebSocket connection closed unexpectedly")
            self.is_connected = False
            raise ConnectionError("WebSocket connection lost")
            
        except Exception as e:
            logger.error(f"Error communicating with LLM: {str(e)}")
            # Don't disconnect automatically on error, let retry logic handle it
            raise
    
    def _process_response(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process and validate LLM response"""
        
        # Handle different response formats - adapt this to your LLM's format
        if 'error' in response_data:
            raise Exception(f"LLM Error: {response_data['error']}")
        
        # Extract response content - modify based on your LLM's response structure
        content = response_data.get('response', response_data.get('content', ''))
        tokens_used = response_data.get('tokens_used', response_data.get('usage', {}).get('total_tokens', 0))
        
        return {
            'content': content,
            'tokens_used': tokens_used,
            'model': response_data.get('model', self.model_name),
            'finish_reason': response_data.get('finish_reason', 'completed'),
            'metadata': response_data.get('metadata', {})
        }

# Singleton instance
_llm_client = None

def get_llm_client() -> LLMWebSocketClient:
    """Get or create LLM WebSocket client instance"""
    global _llm_client
    if _llm_client is None:
        _llm_client = LLMWebSocketClient()
    return _llm_client

async def send_to_llm(message: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Convenience function to send message to LLM
    
    Args:
        message: User message
        metadata: Additional context (sql_mode, session_id, etc.)
        
    Returns:
        LLM response dictionary
    """
    client = get_llm_client()
    
    # Retry logic
    max_retries = client.max_retries
    for attempt in range(max_retries):
        try:
            return await client.send_message(message, metadata)
            
        except (ConnectionError, TimeoutError) as e:
            logger.warning(f"Attempt {attempt + 1}/{max_retries} failed: {str(e)}")
            if attempt < max_retries - 1:
                # Exponential backoff
                await asyncio.sleep(2 ** attempt)
                # Reset connection for retry
                await client.disconnect()
            else:
                # Final attempt failed
                raise e

# Fallback response function
def generate_fallback_response(message: str, metadata: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generate fallback response when WebSocket is unavailable"""
    
    import random
    
    sql_mode = metadata.get('sql_mode', False) if metadata else False
    
    if sql_mode:
        responses = [
            "I'm currently unable to connect to the advanced SQL analysis service. Please check your database connection.",
            "SQL mode is active, but I'm having trouble connecting to the database service. Please try again.",
            "I can help with SQL queries, but I'm experiencing connectivity issues right now."
        ]
    else:
        responses = [
            "I'm currently experiencing connectivity issues with the AI service. Please try again in a moment.",
            "I'm temporarily unable to connect to my language model. Please check back soon.",
            "There seems to be a temporary issue with the AI service. Your message has been received."
        ]
    
    return {
        'content': random.choice(responses),
        'tokens_used': 50,
        'model': 'fallback',
        'finish_reason': 'fallback_used',
        'metadata': {'fallback': True}
    }

# Health check function
async def check_llm_health() -> Dict[str, Any]:
    """Check if LLM WebSocket service is healthy"""
    try:
        client = get_llm_client()
        
        # Simple ping message with proper connection handling
        response = await client.send_message("ping", {"health_check": True})
        
        # Don't disconnect after health check to maintain connection
        
        return {
            'status': 'healthy',
            'connected': True,
            'url': client.websocket_url,
            'model': client.model_name
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'connected': False,
            'error': str(e),
            'url': client.websocket_url if '_llm_client' in globals() and _llm_client else 'Not initialized'
        }
