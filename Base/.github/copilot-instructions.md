<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Chatbot Application Instructions

This is an Angular chatbot application with Node.js backend and SQL database support.

## Project Structure
- **Frontend**: Angular 17+ with standalone components
- **Backend**: Node.js with Express and SQLite
- **Database**: SQLite with sample tables (users, products, messages)

## Key Features
- Tool icon for prompt suggestions (lightbulb)
- Send response icon (send button)
- SQL mode toggle for database queries
- Real-time chat interface
- Claude Sonnet 4 integration ready

## Development Guidelines
- Use Angular standalone components
- Follow Material Design principles
- Implement proper error handling
- Use TypeScript strict mode
- Follow responsive design patterns

## Database Schema
- users: id, name, email, created_at
- products: id, name, price, category, stock, created_at
- messages: id, user_id, message, response, created_at

## Security Notes
- Only SELECT queries allowed in SQL mode
- Input validation on both frontend and backend
- CORS enabled for development
