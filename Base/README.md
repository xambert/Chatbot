# AI Chatbot with SQLAlchemy Database Support

A modern, professional chatbot application with Angular frontend and Python Flask backend, featuring advanced AI integration, custom LLM WebSocket support, and multi-database compatibility.

## 🚀 Features

- **Custom LLM Integration** - WebSocket connection to your own LLM service with persistent connections
- **Advanced AI Modes** - Configurable AI with enhanced reasoning capabilities  
- **Multi-Database Support** - Easy switching between SQLite, PostgreSQL, and MySQL
- **Modern UI** - Angular 17+ with Material Design components
- **Real-time Chat** - Interactive messaging with typing indicators and auto-scroll
- **Tool Management** - Built-in tools panel with prompt suggestions
- **Session Management** - Persistent chat sessions and history
- **Separate Message Storage** - User messages and AI responses stored as separate records
- **API-First Design** - Complete REST API for all operations
- **Responsive Design** - Works seamlessly on desktop and mobile
- **Health Monitoring** - Built-in health checks for LLM and database services
- **Fallback System** - Automatic fallback responses when LLM is unavailable

## 📋 Prerequisites

- **Python 3.11+** 
- **Node.js 18+**
- **npm or yarn**
- **Your Custom LLM WebSocket Server** (optional - fallback responses available)

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Chatbot/Base
```

### 2. Backend Setup (Python Flask)
```bash
# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

# Install Python dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your database and LLM settings (see Configuration section)
```

### 3. Frontend Setup (Angular)
```bash
# Install Angular dependencies
cd Frontend
npm install
```

## ⚙️ Configuration

### Database Configuration
Edit `.env` to configure your database:

```bash
# SQLite (Default - no setup required)
DATABASE_URL=sqlite:///./chatbot.db

# PostgreSQL
DATABASE_URL=postgresql://username:password@localhost:5432/chatbot

# MySQL
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/chatbot
```

### Custom LLM WebSocket Configuration
Configure your custom LLM service in `.env`:

```bash
# Your Custom LLM WebSocket Settings
LLM_WEBSOCKET_URL=ws://your-llm-server:8080/chat    # Required: Your LLM WebSocket URL
LLM_API_KEY=your-api-key-here                       # Optional: Leave empty if no auth needed
LLM_MODEL_NAME=your-custom-model                    # Optional: Default is 'custom-model'
LLM_TIMEOUT=30                                      # Optional: Request timeout in seconds
LLM_MAX_RETRIES=3                                   # Optional: Max retry attempts

# LLM Response Settings
LLM_MAX_TOKENS=4000                                 # Optional: Max tokens per response
LLM_TEMPERATURE=0.7                                 # Optional: Response creativity (0.0-1.0)
```

**Note:** If `LLM_API_KEY` is empty or not set, no authentication headers will be sent to your LLM service.

## 🚀 Running the Application

### Option 1: With Your Custom LLM (Recommended)

#### Step 1: Start Your LLM WebSocket Server
Make sure your custom LLM WebSocket server is running and accessible at the URL specified in `.env`.

#### Step 2: Start Backend Server
```bash
cd backend
python app.py
# Backend runs on http://localhost:3001
```

#### Step 3: Start Frontend Server
```bash
cd Frontend
ng serve
# Frontend runs on http://localhost:4200
```

### Option 2: Testing Mode (Mock LLM Server)

For testing without your actual LLM service:

#### Step 1: Start Mock LLM Server
```bash
cd backend
python mock_llm_server.py
# Mock LLM server runs on ws://localhost:8080/chat
```

#### Step 2: Update .env for testing
```bash
LLM_WEBSOCKET_URL=ws://localhost:8080/chat
LLM_API_KEY=
```

#### Step 3: Start Backend & Frontend
```bash
# Terminal 1: Backend
cd backend
python app.py

# Terminal 2: Frontend  
cd Frontend
ng serve
```

### Option 3: Quick Start (All Services)
```bash
# From root directory (starts frontend + backend only)
npm run dev
```

### 🔍 Verify Everything is Working

1. **Backend Health**: Visit `http://localhost:3001/health`
2. **LLM Health**: Visit `http://localhost:3001/api/llm/health`  
3. **Frontend**: Visit `http://localhost:4200`

## ✅ Recent Fixes & Improvements

### LLM Connection Stability (Fixed)
- **Issue**: WebSocket connections were closing after each health check
- **Solution**: Improved connection management with persistent connections
- **Status**: ✅ **FIXED** - Health checks now maintain stable connections

### Message Storage Enhancement (Fixed)
- **Issue**: AI responses weren't stored as separate database records
- **Solution**: 
  - Added `is_user` boolean field to distinguish user messages from AI responses
  - Modified chat endpoint to create separate message records for users and AI
  - Updated database schema with proper message tracking
- **Status**: ✅ **FIXED** - Both user and AI messages are now stored separately

### Fallback System Reliability (Enhanced)
- **Issue**: No graceful handling when LLM service is unavailable
- **Solution**: Robust fallback system with context-aware responses
- **Status**: ✅ **ENHANCED** - Automatic fallback responses ensure uninterrupted service

### API Response Format (Improved)
- **Issue**: Inconsistent API response structures
- **Solution**: Standardized response format with proper error handling
- **Status**: ✅ **IMPROVED** - All endpoints now return consistent JSON responses

## 🤖 Custom LLM Integration

### Your LLM WebSocket Protocol

Your LLM server should accept JSON messages in this format:

```json
{
    "message": "User's question here",
    "model": "your-model-name",
    "metadata": {
        "sql_mode": true,
        "advanced_ai": false,
        "session_context": {}
    },
    "settings": {
        "max_tokens": 4000,
        "temperature": 0.7,
        "stream": false
    }
}
```

And return responses like:

```json
{
    "response": "LLM generated response",
    "tokens_used": 150,
    "model": "your-model-name", 
    "finish_reason": "completed",
    "metadata": {}
}
```

### Adapting to Your LLM Format

If your LLM uses different field names, modify `backend/llm_websocket.py`:

```python
# In _process_response() method:
def _process_response(self, response_data):
    # Change these field names to match your LLM:
    content = response_data.get('your_response_field')
    tokens_used = response_data.get('your_tokens_field')
    
    return {
        'content': content,
        'tokens_used': tokens_used,
        # ... other fields
    }
```

### Fallback Behavior

- **Primary**: Uses your custom LLM WebSocket
- **Fallback**: If LLM is unavailable, shows helpful fallback messages
- **Error Handling**: Automatic retries with exponential backoff

## 🗄️ Database Configuration

Switch databases by updating `DATABASE_URL` in `backend/.env`:

### SQLite (Default)
```env
DATABASE_URL=sqlite:///./chatbot.db
```

### PostgreSQL
```env
DATABASE_URL=postgresql://username:password@localhost:5432/chatbot
```

### MySQL
```env
DATABASE_URL=mysql+pymysql://username:password@localhost:3306/chatbot
```

The database tables are created automatically on first run.

## 📚 API Documentation

Base URL: `http://localhost:3001`

### Health Check

#### GET `/health`
Check if the backend is running and database is connected.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-08-03T12:00:00.000000",
  "database": "connected"
}
```

#### GET `/api/llm/health`
Check if your custom LLM WebSocket service is healthy and connected.

**Response (Healthy):**
```json
{
  "success": true,
  "llm_service": {
    "status": "healthy",
    "connected": true,
    "url": "ws://localhost:8080/chat",
    "model": "custom-model"
  },
  "timestamp": "2025-08-03T12:00:00.000000"
}
```

**Response (Unhealthy):**
```json
{
  "success": false,
  "error": "Connection refused",
  "llm_service": {
    "status": "unhealthy", 
    "connected": false,
    "error": "Failed to connect to LLM WebSocket"
  },
  "timestamp": "2025-08-03T12:00:00.000000"
}
```

---

### Chat API

#### POST `/api/chat/send`
Send a message to the chatbot and get an AI response.

**Request Body:**
```json
{
  "message": "Hello, how can you help me?",
  "user_email": "user@example.com",
  "user_name": "John Doe",
  "session_id": 1,
  "message_type": "text",
  "metadata": {}
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "message": {
      "id": 1,
      "session_id": 1,
      "user_id": 1,
      "message": "Hello, how can you help me?",
      "response": "I understand your question. Let me help you with that.",
      "message_type": "text",
      "tokens_used": 75,
      "response_time": 0.45,
      "created_at": "2025-08-03T12:00:00.000000"
    },
    "session_id": 1,
    "user_id": 1,
    "advanced_ai_enabled": true
  }
}
```

---

### User Management

#### GET `/api/users`
Get list of users with pagination and search.

**Query Parameters:**
- `page` (int): Page number (default: 1)
- `limit` (int): Items per page (default: 10)
- `search` (string): Search term for name/email

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "John Doe",
      "email": "john@example.com",
      "avatar_url": null,
      "status": "active",
      "preferences": {},
      "created_at": "2025-08-03T12:00:00.000000",
      "updated_at": "2025-08-03T12:00:00.000000"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "pages": 1
  }
}
```

#### POST `/api/users`
Create a new user.

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "jane@example.com",
  "avatar_url": "https://example.com/avatar.jpg",
  "preferences": {"theme": "dark"}
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "data": {
    "id": 2,
    "message": "User created successfully"
  }
}
```

#### GET `/api/users/{user_id}`
Get user by ID.

#### PUT `/api/users/{user_id}`
Update user information.

#### DELETE `/api/users/{user_id}`
Delete a user.

---

### Session Management

#### GET `/api/sessions`
Get chat sessions for a user.

**Query Parameters:**
- `user_id` (required): User ID
- `page` (int): Page number
- `limit` (int): Items per page
- `status` (string): Filter by status (active/inactive/all)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "user_id": 1,
      "title": "Chat Session 1",
      "status": "active",
      "message_count": 5,
      "created_at": "2025-08-03T12:00:00.000000",
      "updated_at": "2025-08-03T12:30:00.000000"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}
```

#### POST `/api/sessions`
Create a new chat session.

**Request Body:**
```json
{
  "user_id": 1,
  "title": "New Chat Session"
}
```

#### GET `/api/sessions/{session_id}`
Get session details, optionally with messages.

**Query Parameters:**
- `include_messages` (boolean): Include messages in response

---

### Messages

#### GET `/api/messages`
Get messages with filtering and pagination.

**Query Parameters:**
- `session_id` (int): Filter by session
- `user_id` (int): Filter by user
- `page` (int): Page number
- `limit` (int): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "session_id": 1,
      "user_id": 1,
      "message": "Hello!",
      "response": "Hi there! How can I help you?",
      "message_type": "text",
      "tokens_used": 45,
      "response_time": 0.23,
      "created_at": "2025-08-03T12:00:00.000000"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 1,
    "pages": 1
  }
}
```

#### POST `/api/messages`
Send a message (alternative to `/api/chat/send`).

---

### System Settings

#### GET `/api/settings`
Get all system settings or filter by category.

**Query Parameters:**
- `category` (string): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "key": "enable_advanced_ai",
      "value": "true",
      "description": "Enable advanced AI features",
      "category": "ai",
      "created_at": "2025-08-03T12:00:00.000000",
      "updated_at": "2025-08-03T12:00:00.000000"
    }
  ]
}
```

#### GET `/api/settings/{key}`
Get specific setting by key.

#### PUT `/api/settings/{key}`
Update a setting.

**Request Body:**
```json
{
  "value": "false",
  "description": "Updated description"
}
```

---

## 🎨 Frontend Features

### Chat Interface
- **Interactive Chat**: Real-time messaging with AI responses
- **Tool Panel**: Access to settings and prompt suggestions
- **Session History**: View and manage chat sessions
- **Responsive Design**: Works on all screen sizes

### Key Components
- `app.component.ts` - Main application component
- `chat.component.ts` - Chat interface with AI integration
- `landing.component.ts` - Landing page with chat trigger
- `history.service.ts` - Chat history management

### Running Frontend
```bash
cd Frontend
ng serve --port 4200
```

## 🔧 Configuration

### Environment Variables

#### Backend (`backend/.env`)
```env
DATABASE_URL=sqlite:///./chatbot.db
ENABLE_ADVANCED_AI=true
LLM_MAX_TOKENS=4000
LLM_TEMPERATURE=0.7
FLASK_ENV=development
FLASK_DEBUG=true
```

#### Root (`.env`)
```env
ANGULAR_PORT=4200
BACKEND_PORT=3001
BACKEND_URL=http://localhost:3001
DATABASE_URL=sqlite:///./chatbot.db
ENABLE_ADVANCED_AI=true
```

## 📊 Database Schema

The application uses SQLAlchemy models with automatic migration:

### Tables
- **users**: User accounts and preferences
- **chat_sessions**: Individual chat sessions
- **messages**: Chat messages and AI responses
- **chat_history**: Session history and metadata
- **system_settings**: Configuration and feature toggles

### Reset Database
```bash
cd backend
python reset_db.py
```

## 🚀 Deployment

### Production Setup
1. Set `FLASK_ENV=production` in backend/.env
2. Use a production WSGI server (gunicorn, uWSGI)
3. Configure production database (PostgreSQL recommended)
4. Build Angular for production: `ng build --prod`
5. Serve Angular build files via web server (nginx, Apache)

### Docker Support
The application is ready for containerization with separate containers for frontend and backend.

## 🛠️ Development

### Project Structure
```
Base/
├── Frontend/                 # Angular application
│   ├── src/app/             # Angular components
│   ├── angular.json         # Angular configuration
│   └── package.json         # Frontend dependencies
├── backend/                 # Python Flask backend
│   ├── app.py              # Main Flask application
│   ├── database.py         # SQLAlchemy models
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Backend configuration
├── package.json            # Root scripts and Angular deps
├── .env                   # General configuration
└── README.md             # This file
```

### Available Scripts
```bash
npm run start      # Start Angular frontend
npm run server     # Start Python backend
npm run dev        # Start both frontend and backend
npm run build      # Build Angular for production
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Run tests and ensure code quality
5. Commit changes: `git commit -m 'Add feature'`
6. Push to branch: `git push origin feature-name`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

---

**Built with ❤️ using Angular, Python Flask, and SQLAlchemy**
