# Vaani AI - Intelligent Chatbot with SQL Database Support

A modern, responsive chatbot application built with Angular and Node.js, featuring AI-powered conversations, SQL database querying capabilities, and persistent chat history. Vaani AI provides a professional floating chat interface with advanced features for seamless user interaction.

## 🌟 Features

### Core Features
- 🤖 **AI-Powered Chat**: Intelligent conversations with advanced language model integration
- 🗄️ **SQL Database Support**: Direct database querying with safety controls (SELECT only)
- 📱 **Responsive Design**: Works seamlessly on desktop, tablet, and mobile devices
- 💬 **Floating Chat Modal**: Professional, non-intrusive chat interface
- 📝 **Chat History**: Persistent conversation storage and retrieval with session management
- ⚡ **Real-time Messaging**: Instant responses with smooth animations and auto-scroll

### Advanced Features
- 🔧 **Tool Integration**: Easy access to database tools and prompt suggestions
- 💡 **Smart Prompts**: Pre-built conversation starters for common queries
- 🔄 **Session Management**: Multiple chat sessions with automatic saving to localStorage
- 📊 **Message Analytics**: Track conversation count and history statistics
- 🎨 **Modern UI/UX**: Clean, professional interface with Material Design principles
- ⚙️ **Environment Configuration**: Flexible setup for different environments
- 🌐 **WebSocket Integration**: Connect to internal LLM servers without API keys

## 🚀 Quick Start Database Support

A modern Angular chatbot application with Node.js backend and SQLite database integration. Features include AI-powered conversations, SQL query capabilities, and a beautiful Material Design interface.

## Features

- 🤖 **AI Chatbot**: Intelligent conversation with context awareness
- � **LLM WebSocket Integration**: Connect to Claude Sonnet 4 or other LLM providers
- 📜 **Chat History**: Save and manage conversation sessions
- �🗄️ **SQL Database Support**: Query database directly through chat interface
- 💡 **Tool Icon**: Prompt suggestions with lightbulb icon
- ➤ **Send Response Icon**: Material Design send button
- 📱 **Responsive Design**: Works on desktop and mobile
- 🎨 **Modern UI**: Glass morphism design with smooth animations
- 🔒 **Secure**: SQL injection protection and input validation
- 🌍 **Environment Configuration**: Configurable via .env file

## Quick Start

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Angular CLI (v17+)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   Copy and edit the environment file:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```properties
   # Server Configuration
   PORT=3001
   CORS_ORIGIN=http://localhost:4200
   
   # Database Configuration
   DB_PATH=./backend/chatbot.db
   
   # LLM WebSocket Configuration
   LLM_WEBSOCKET_URL=ws://localhost:8080/chat
   # No API key needed - using internal LLM server
   LLM_MAX_TOKENS=4000
   LLM_TEMPERATURE=0.7
   
   # Chat History Configuration
   ENABLE_HISTORY=true
   MAX_HISTORY_ITEMS=100
   ```

3. **Start the application**
   ```bash
   npm run dev
   ```
   This starts both:
   - Angular frontend: http://localhost:4200
   - Node.js backend: http://localhost:3001

## 🎯 Usage

### Basic Chat
1. Open http://localhost:4200 in your browser
2. Click the purple chat button (💬) in the bottom-right corner
3. Start typing your message and press Enter or click Send

### SQL Database Queries
1. Click the "SQL" button in the chat header to enable SQL mode
2. Ask questions about the database or write SQL queries
3. The chatbot will safely execute SELECT queries only

### Chat History
1. Click the "History" button to view previous conversations
2. Click on any session to load that conversation
3. Use "New" button to start a fresh conversation

### Prompt Suggestions
1. Click the lightbulb icon (💡) in the input area
2. Choose from pre-built conversation starters
3. Perfect for exploring the chatbot's capabilities

## 🏗️ Project Structure

```
vaani-ai-chatbot/
├── src/                          # Angular frontend
│   ├── app/
│   │   ├── landing/             # Landing page component
│   │   ├── chat/                # Main chat interface
│   │   └── services/            # Angular services
│   ├── styles.scss              # Global styles
│   └── main.ts                  # Bootstrap file
├── backend/                     # Node.js backend
│   ├── server.js               # Express server
│   ├── chat-history.js         # Chat history management
│   ├── llm-websocket.js        # LLM integration
│   └── chatbot.db              # SQLite database
├── .env                        # Environment variables
├── package.json               # Dependencies and scripts
└── README.md                  # This file
```

6. **Open your browser** and navigate to `http://localhost:4200`

## Development

### Run both frontend and backend together:
```bash
npm run dev
```

### Available Scripts
- `npm start` - Start Angular dev server
- `npm run server` - Start Node.js backend
- `npm run dev` - Start both frontend and backend
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run lint` - Run linting

## Project Structure

```
src/
├── app/
│   ├── chat/                 # Chat component
│   │   ├── chat.component.ts
│   │   └── chat.component.scss
│   ├── app.component.ts      # Main app component
│   └── app.component.scss
├── styles.scss               # Global styles
└── index.html               # Main HTML file

backend/
├── server.js                # Express server
└── chatbot.db               # SQLite database (created automatically)
```

## Features Overview

### Chat Interface
- **Tool Icon** (💡): Click to show/hide prompt suggestions
- **History Icon** (📜): View and manage chat sessions
- **New Session** (+): Create a new chat session
- **Send Icon** (➤): Send messages with Enter key or click
- **SQL Mode**: Toggle to enable database querying
- **Clear Chat**: Reset conversation history

### Chat History
- **Session Management**: Create, load, and delete chat sessions
- **Search History**: Find specific conversations or messages
- **Automatic Saving**: Messages are automatically saved to sessions
- **Session Persistence**: Resume conversations from where you left off

### LLM Integration
- **WebSocket Connection**: Real-time communication with LLM providers
- **Fallback Mode**: Continues working even if LLM service is unavailable
- **Configurable**: Set model, temperature, max tokens via environment variables
- **Auto-reconnect**: Automatically reconnects if connection is lost

### SQL Database
The application includes sample tables:
- **users**: User information with id, name, email
- **products**: Product catalog with pricing and inventory
- **messages**: Chat history storage
- **chat_sessions**: Session management for history
- **chat_history**: Detailed conversation history

### Sample SQL Queries
- `SELECT * FROM users;`
- `SELECT * FROM products WHERE price > 100;`
- `SELECT COUNT(*) FROM users;`

## API Endpoints

### Chat Endpoints
- `POST /api/chat` - General chat conversations (supports sessionId)
- `POST /api/sql-query` - SQL database queries
- `GET /api/health` - Server health check

### History Endpoints
- `GET /api/history/sessions` - Get all chat sessions
- `GET /api/history/sessions/:id` - Get specific session history
- `POST /api/history/sessions` - Create new chat session
- `DELETE /api/history/sessions/:id` - Delete chat session
- `GET /api/history/search` - Search chat history
- `GET /api/history/stats` - Get history statistics

### Database Endpoints
- `GET /api/schema` - Database schema information

## Security

- Only SELECT queries allowed in SQL mode
- Input validation and sanitization
- CORS protection
- SQL injection prevention

## Customization

### Adding New Database Tables
1. Modify `backend/server.js`
2. Add table creation in the `db.serialize()` block
3. Update the schema endpoint if needed

### Extending Chat Responses
Modify the `generateChatResponse()` function in `backend/server.js` to add custom response logic.

### UI Customization
- Edit `src/styles.scss` for global styles
- Modify component SCSS files for specific styling
- Update color scheme in CSS custom properties

## Claude Sonnet 4 Integration

The application is designed to integrate with Claude Sonnet 4. To enable:

1. Add your API credentials to environment variables
2. Update the chat service to use Claude API
3. Modify response handling for Claude-specific features

## Troubleshooting

### Common Issues

1. **Port already in use**: Change ports in package.json scripts
2. **Database not created**: Check file permissions in backend folder
3. **CORS errors**: Verify backend server is running on port 3001

### Development Tips

- Use browser dev tools to debug frontend issues
- Check Node.js console for backend errors
- SQLite database file is created automatically on first run

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

---

Built with ❤️ using Angular, Node.js, and SQLite
