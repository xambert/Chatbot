<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Chatbot Application Instructions

This is an Angular chatbot application with Python Flask backend and SQL database support.

## Project Structure
- **Frontend**: Angular 17+ with standalone components
- **Backend**: Python Flask with SQLAlchemy ORM
- **Database**: SQLite, PostgreSQL, or MySQL (configurable)

## Key Features
- Tool icon for prompt suggestions (lightbulb)
- Send response icon (send button)
- SQL mode toggle for database queries
- Real-time chat interface
- Advanced AI integration with configurable modes

## Development Guidelines
- Use Angular standalone components
- Follow Material Design principles
- Implement proper error handling
- Use TypeScript strict mode
- Follow responsive design patterns

## Database Schema
- users: id, name, email, avatar_url, status, preferences, created_at, updated_at
- chat_sessions: id, user_id, title, status, created_at, updated_at
- messages: id, session_id, user_id, message, response, message_type, tokens_used, response_time, created_at
- chat_history: id, user_id, session_id, message_preview, message_count, last_activity, created_at
- system_settings: id, key, value, description, category, created_at, updated_at

## Security Notes
- Only SELECT queries allowed in SQL mode
- Input validation on both frontend and backend
- CORS enabled for development
