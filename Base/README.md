# AI Chatbot with SQLAlchemy Database Support

A modern, professional chatbot application with Angular frontend and Python Flask backend, featuring advanced AI integration and multi-database support.

## 🚀 Features

- **Advanced AI Integration** - Configurable AI modes with enhanced reasoning capabilities
- **Multi-Database Support** - Easy switching between SQLite, PostgreSQL, and MySQL
- **Modern UI** - Angular 17+ with Material Design components
- **Real-time Chat** - Interactive messaging with typing indicators
- **Tool Management** - Built-in tools panel with prompt suggestions
- **Session Management** - Persistent chat sessions and history
- **API-First Design** - Complete REST API for all operations
- **Responsive Design** - Works seamlessly on desktop and mobile

## 📋 Prerequisites

- **Python 3.11+** 
- **Node.js 18+**
- **npm or yarn**

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

# Configure environment (optional)
cp .env.example .env
# Edit .env with your database settings
```

### 3. Frontend Setup (Angular)
```bash
# Install Angular dependencies
cd Frontend
npm install
```

## 🚀 Running the Application

### Start Backend Server
```bash
cd backend
python app.py
# Backend runs on http://localhost:3001
```

### Start Frontend Server
```bash
cd Frontend
ng serve
# Frontend runs on http://localhost:4200
```

### Quick Start (Both Servers)
```bash
# From root directory
npm run dev
```

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
