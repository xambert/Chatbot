# Custom LLM WebSocket Integration Guide

## 🔌 **How to Plug in Your Custom LLM WebSocket**

### **1. Architecture Overview**

```
Frontend (Angular) → Backend (Flask) → WebSocket Client → Your LLM Server
                                    ↓
                                Database (SQLAlchemy)
```

### **2. Integration Points**

#### **A. WebSocket LLM Service** (`backend/llm_websocket.py`)
- **Primary integration point** for your custom LLM
- Handles WebSocket connections, retries, and fallbacks
- Configurable via environment variables

#### **B. Flask Backend** (`backend/app.py`)
- Modified `generate_ai_response()` function
- New `/api/llm/health` endpoint for monitoring
- Automatic fallback to mock responses if WebSocket fails

#### **C. Environment Configuration** (`.env`)
- All WebSocket settings in one place
- Easy to switch between different LLM services

### **3. Step-by-Step Integration**

#### **Step 1: Configure Your LLM WebSocket URL**
```bash
# In your .env file
LLM_WEBSOCKET_URL=ws://your-llm-server:8080/chat
LLM_API_KEY=your-actual-api-key
LLM_MODEL_NAME=your-model-name
LLM_TIMEOUT=30
LLM_MAX_RETRIES=3
```

#### **Step 2: Adapt the WebSocket Client**
Edit `backend/llm_websocket.py` to match your LLM's protocol:

```python
# In _process_response() method, adapt to your LLM's response format:
def _process_response(self, response_data: Dict[str, Any]) -> Dict[str, Any]:
    # YOUR LLM's response format might be different
    content = response_data.get('your_response_field')  # ← Change this
    tokens_used = response_data.get('your_tokens_field')  # ← Change this
    
    return {
        'content': content,
        'tokens_used': tokens_used,
        # ... adapt other fields as needed
    }
```

#### **Step 3: Customize Message Format**
In `send_message()` method, adapt the payload to your LLM's expected format:

```python
# Current payload format (modify as needed):
payload = {
    'message': message,
    'model': self.model_name,
    'timestamp': datetime.utcnow().isoformat(),
    'metadata': metadata or {},
    'settings': {
        'max_tokens': int(os.getenv('LLM_MAX_TOKENS', '4000')),
        'temperature': float(os.getenv('LLM_TEMPERATURE', '0.7')),
        'stream': False
    }
}
```

### **4. Your LLM Server Requirements**

Your WebSocket server should:

#### **Accept JSON Messages:**
```json
{
    "message": "User's question here",
    "model": "your-model-name",
    "metadata": {
        "sql_mode": true/false,
        "advanced_ai": true/false,
        "session_context": {},
        "user_preferences": {}
    },
    "settings": {
        "max_tokens": 4000,
        "temperature": 0.7,
        "stream": false
    }
}
```

#### **Return JSON Responses:**
```json
{
    "response": "LLM generated response",
    "tokens_used": 150,
    "model": "your-model-name",
    "finish_reason": "completed",
    "metadata": {}
}
```

### **5. Testing Your Integration**

#### **Step 1: Test with Mock Server**
```bash
# Terminal 1: Start mock LLM server
cd backend
python mock_llm_server.py

# Terminal 2: Start Flask backend  
python app.py

# Terminal 3: Start Angular frontend
cd Frontend
npm start
```

#### **Step 2: Check Health Endpoints**
```bash
# Backend health
curl http://localhost:3001/health

# LLM WebSocket health
curl http://localhost:3001/api/llm/health
```

#### **Step 3: Replace Mock with Your LLM**
1. Stop the mock server
2. Start your actual LLM WebSocket server
3. Update `.env` with your server's URL
4. Test the integration

### **6. Advanced Configuration**

#### **Authentication**
Add authentication headers in `llm_websocket.py`:
```python
extra_headers={
    'Authorization': f'Bearer {self.api_key}',
    'X-API-Version': 'v1',
    'X-Client-ID': 'chatbot-client'
}
```

#### **Streaming Responses**
To enable streaming responses, modify the `send_message()` method:
```python
# Enable streaming in payload
payload['settings']['stream'] = True

# Handle streaming response
async for chunk in websocket:
    # Process each chunk
    yield process_chunk(chunk)
```

#### **Custom Error Handling**
Modify `_process_response()` to handle your LLM's error format:
```python
if 'error' in response_data:
    error_code = response_data.get('error_code', 'unknown')
    error_message = response_data.get('error_message', 'Unknown error')
    raise Exception(f"LLM Error [{error_code}]: {error_message}")
```

### **7. Production Deployment**

#### **Environment Variables**
```bash
# Production .env
LLM_WEBSOCKET_URL=wss://your-production-llm.com/api/chat
LLM_API_KEY=prod-api-key
LLM_MODEL_NAME=production-model
LLM_TIMEOUT=60
LLM_MAX_RETRIES=5
```

#### **Load Balancing**
For multiple LLM servers, modify the client to support multiple URLs:
```python
# In llm_websocket.py
LLM_WEBSOCKET_URLS = [
    'wss://llm1.yourservice.com/chat',
    'wss://llm2.yourservice.com/chat',
    'wss://llm3.yourservice.com/chat'
]
```

### **8. Monitoring & Debugging**

#### **Enable Logging**
```python
# In your .env
LOG_LEVEL=DEBUG

# In llm_websocket.py
logging.basicConfig(level=os.getenv('LOG_LEVEL', 'INFO'))
```

#### **Health Monitoring**
The `/api/llm/health` endpoint returns:
```json
{
    "success": true,
    "llm_service": {
        "status": "healthy",
        "connected": true,
        "url": "ws://localhost:8080/chat",
        "model": "custom-model"
    },
    "timestamp": "2025-08-03T10:30:00Z"
}
```

### **9. Fallback Strategy**

The system automatically falls back to:
1. **Primary**: Your custom LLM WebSocket
2. **Secondary**: Fallback responses (if WebSocket fails)
3. **Tertiary**: Error messages (if everything fails)

### **10. Example Custom LLM Integration**

Here's how to integrate with a hypothetical "MyLLM" service:

```python
# Modify llm_websocket.py for MyLLM
class MyLLMWebSocketClient(LLMWebSocketClient):
    def _process_response(self, response_data):
        # MyLLM returns: {"answer": "...", "cost": 0.01, "model_version": "v2.1"}
        return {
            'content': response_data.get('answer', ''),
            'tokens_used': int(response_data.get('cost', 0) * 1000),  # Convert cost to tokens
            'model': response_data.get('model_version', 'unknown'),
            'finish_reason': 'completed',
            'metadata': response_data
        }
```

---

## 🚀 **Ready to Go!**

Your chatbot now has:
- ✅ **Modular LLM integration** via WebSocket
- ✅ **Automatic fallback** if LLM service is down
- ✅ **Health monitoring** endpoints
- ✅ **Easy configuration** via environment variables
- ✅ **Production-ready** error handling and retries

Just update the `.env` file with your LLM WebSocket URL and you're connected! 🎯
