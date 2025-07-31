const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Import custom services
const LLMWebSocketService = require('./llm-websocket');
const ChatHistoryService = require('./chat-history');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const dbPath = path.join(__dirname, 'chatbot.db');
const db = new sqlite3.Database(dbPath);

// Initialize services
const llmConfig = {
  url: process.env.LLM_WEBSOCKET_URL || 'ws://localhost:8080/chat',
  // No API key needed for internal LLM server
  maxTokens: parseInt(process.env.LLM_MAX_TOKENS) || 4000,
  temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
  heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  reconnectDelay: parseInt(process.env.WS_RECONNECT_DELAY) || 5000,
  maxReconnectAttempts: parseInt(process.env.WS_MAX_RECONNECT_ATTEMPTS) || 5
};

const historyConfig = {
  enabled: process.env.ENABLE_HISTORY === 'true',
  maxItems: parseInt(process.env.MAX_HISTORY_ITEMS) || 100,
  retentionDays: parseInt(process.env.HISTORY_RETENTION_DAYS) || 30
};

const llmService = new LLMWebSocketService(llmConfig);
const historyService = new ChatHistoryService(db, historyConfig);

// Connect to LLM WebSocket (with fallback)
llmService.connect().catch(error => {
  console.warn('⚠️  LLM WebSocket connection failed, using fallback mode:', error.message);
});

// Create sample tables and data
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    message TEXT NOT NULL,
    response TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  )`);

  // Products table (sample data)
  db.run(`CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    price DECIMAL(10,2),
    category TEXT,
    stock INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Insert sample data
  const sampleUsers = [
    ['John Doe', 'john@example.com'],
    ['Jane Smith', 'jane@example.com'],
    ['Mike Johnson', 'mike@example.com']
  ];

  const stmt = db.prepare("INSERT OR IGNORE INTO users (name, email) VALUES (?, ?)");
  sampleUsers.forEach(user => {
    stmt.run(user);
  });
  stmt.finalize();

  const sampleProducts = [
    ['Laptop', 999.99, 'Electronics', 10],
    ['Mouse', 29.99, 'Electronics', 50],
    ['Keyboard', 79.99, 'Electronics', 25],
    ['Monitor', 299.99, 'Electronics', 15],
    ['Desk Chair', 199.99, 'Furniture', 8]
  ];

  const productStmt = db.prepare("INSERT OR IGNORE INTO products (name, price, category, stock) VALUES (?, ?, ?, ?)");
  sampleProducts.forEach(product => {
    productStmt.run(product);
  });
  productStmt.finalize();
});

// Helper function to generate AI-like responses
function generateChatResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    return "Hello! I'm your AI assistant. I can help you with general questions and SQL database queries. How can I assist you today?";
  }
  
  if (lowerMessage.includes('sql') || lowerMessage.includes('database')) {
    return "I can help you with SQL queries! Try enabling SQL mode and ask me to show data from our database. We have tables for users, messages, and products.";
  }
  
  if (lowerMessage.includes('help')) {
    return "I can assist you with:\n• General conversation and questions\n• SQL database queries (enable SQL mode)\n• Information about our database schema\n• Sample queries and explanations\n\nWhat would you like to know more about?";
  }
  
  if (lowerMessage.includes('table') || lowerMessage.includes('schema')) {
    return "Our database contains these tables:\n• users (id, name, email, created_at)\n• messages (id, user_id, message, response, created_at)\n• products (id, name, price, category, stock, created_at)\n\nWould you like to see some sample data?";
  }
  
  // Default response with some variability
  const responses = [
    "That's an interesting question! Could you provide more details?",
    "I understand. How can I help you further with this?",
    "Thanks for sharing that. What specific information are you looking for?",
    "I'm here to help! Could you be more specific about what you need?",
    "That's a good point. Let me know if you'd like to explore this topic more or try some SQL queries!"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Helper function to execute SQL safely
function executeSQLQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    // Basic SQL injection protection - only allow SELECT statements for now
    const trimmedQuery = query.trim().toLowerCase();
    
    if (!trimmedQuery.startsWith('select')) {
      reject(new Error('Only SELECT queries are allowed for security reasons. Try queries like: SELECT * FROM users;'));
      return;
    }
    
    // Prevent dangerous operations
    const dangerousKeywords = ['drop', 'delete', 'update', 'insert', 'alter', 'create', 'truncate'];
    const containsDangerous = dangerousKeywords.some(keyword => 
      trimmedQuery.includes(keyword.toLowerCase())
    );
    
    if (containsDangerous) {
      reject(new Error('Query contains potentially dangerous operations. Only SELECT queries are allowed.'));
      return;
    }
    
    db.all(query, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chatbot server is running!' });
});

// General chat endpoint
app.post('/api/chat', async (req, res) => {
  const { message, sessionId } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }
  
  try {
    let currentSessionId = sessionId;
    
    // Create new session if none provided and history is enabled
    if (!currentSessionId && historyConfig.enabled) {
      currentSessionId = await historyService.createSession();
    }
    
    // Generate unique message ID
    const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save user message to history (if enabled)
    if (historyConfig.enabled && currentSessionId) {
      await historyService.saveMessage(currentSessionId, messageId, message);
    }
    
    // Get response from LLM WebSocket or fallback
    let response;
    try {
      response = await llmService.sendMessageWithFallback(message);
    } catch (error) {
      console.error('LLM Service error:', error);
      response = generateChatResponse(message);
    }
    
    // Update history with bot response (if enabled)
    if (historyConfig.enabled && currentSessionId) {
      await historyService.updateBotResponse(messageId, response);
    }
    
    // Store the conversation in database (legacy support)
    db.run(
      "INSERT INTO messages (message, response) VALUES (?, ?)", 
      [message, response], 
      function(err) {
        if (err) {
          console.error('Error storing message:', err);
        }
      }
    );
    
    res.json({ 
      message: response, 
      sessionId: currentSessionId,
      messageId: messageId 
    });
    
  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// SQL query endpoint
app.post('/api/sql-query', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ error: 'SQL query is required' });
  }
  
  try {
    // If the message is a natural language request, convert it to SQL
    let sqlQuery = message;
    const lowerMessage = message.toLowerCase();
    
    if (!lowerMessage.includes('select') && !lowerMessage.includes('show')) {
      // Convert natural language to SQL
      if (lowerMessage.includes('all users') || lowerMessage.includes('users')) {
        sqlQuery = 'SELECT * FROM users ORDER BY created_at DESC LIMIT 10;';
      } else if (lowerMessage.includes('all products') || lowerMessage.includes('products')) {
        sqlQuery = 'SELECT * FROM products ORDER BY name;';
      } else if (lowerMessage.includes('count') && lowerMessage.includes('user')) {
        sqlQuery = 'SELECT COUNT(*) as user_count FROM users;';
      } else if (lowerMessage.includes('count') && lowerMessage.includes('product')) {
        sqlQuery = 'SELECT COUNT(*) as product_count FROM products;';
      } else if (lowerMessage.includes('expensive') || lowerMessage.includes('price')) {
        sqlQuery = 'SELECT * FROM products ORDER BY price DESC LIMIT 5;';
      } else if (lowerMessage.includes('recent') || lowerMessage.includes('latest')) {
        sqlQuery = 'SELECT * FROM messages ORDER BY created_at DESC LIMIT 5;';
      } else {
        return res.json({ 
          message: "I didn't understand your request. Try queries like:\n• Show all users\n• Count products\n• Show expensive products\n• Or write direct SQL: SELECT * FROM users;"
        });
      }
    }
    
    const results = await executeSQLQuery(sqlQuery);
    
    let responseMessage = `Query executed successfully!\n\nSQL: ${sqlQuery}\n\nResults (${results.length} rows):\n`;
    
    if (results.length === 0) {
      responseMessage += "No data found.";
    } else {
      // Format results as a table
      responseMessage += "```\n";
      if (results.length > 0) {
        const columns = Object.keys(results[0]);
        responseMessage += columns.join(' | ') + '\n';
        responseMessage += columns.map(() => '---').join(' | ') + '\n';
        
        results.slice(0, 10).forEach(row => { // Limit to 10 rows for readability
          responseMessage += columns.map(col => row[col] || 'NULL').join(' | ') + '\n';
        });
        
        if (results.length > 10) {
          responseMessage += `... and ${results.length - 10} more rows\n`;
        }
      }
      responseMessage += "```";
    }
    
    res.json({ 
      result: responseMessage,
      query: sqlQuery,
      rowCount: results.length,
      data: results.slice(0, 10) // Send first 10 rows of actual data
    });
    
  } catch (error) {
    console.error('SQL Error:', error);
    res.json({ 
      message: `SQL Error: ${error.message}\n\nTip: Try simple queries like:\n• SELECT * FROM users;\n• SELECT * FROM products;\n• SELECT COUNT(*) FROM users;`
    });
  }
});

// History Management Endpoints

// Get all chat sessions
app.get('/api/history/sessions', async (req, res) => {
  if (!historyConfig.enabled) {
    return res.json({ sessions: [], enabled: false });
  }
  
  try {
    const userId = req.query.userId || 'anonymous';
    const sessions = await historyService.getSessions(userId);
    res.json({ sessions, enabled: true });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// Get chat history for a specific session
app.get('/api/history/sessions/:sessionId', async (req, res) => {
  if (!historyConfig.enabled) {
    return res.json({ history: [], enabled: false });
  }
  
  try {
    const { sessionId } = req.params;
    const history = await historyService.getSessionHistory(sessionId);
    res.json({ history, enabled: true });
  } catch (error) {
    console.error('Error fetching session history:', error);
    res.status(500).json({ error: 'Failed to fetch session history' });
  }
});

// Create a new chat session
app.post('/api/history/sessions', async (req, res) => {
  if (!historyConfig.enabled) {
    return res.json({ sessionId: null, enabled: false });
  }
  
  try {
    const { userId = 'anonymous', sessionName } = req.body;
    const sessionId = await historyService.createSession(userId, sessionName);
    res.json({ sessionId, enabled: true });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({ error: 'Failed to create session' });
  }
});

// Delete a chat session
app.delete('/api/history/sessions/:sessionId', async (req, res) => {
  if (!historyConfig.enabled) {
    return res.json({ success: false, enabled: false });
  }
  
  try {
    const { sessionId } = req.params;
    await historyService.deleteSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// Search chat history
app.get('/api/history/search', async (req, res) => {
  if (!historyConfig.enabled) {
    return res.json({ results: [], enabled: false });
  }
  
  try {
    const { q: searchTerm, userId = 'anonymous' } = req.query;
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }
    
    const results = await historyService.searchHistory(userId, searchTerm);
    res.json({ results, enabled: true });
  } catch (error) {
    console.error('Error searching history:', error);
    res.status(500).json({ error: 'Failed to search history' });
  }
});

// Get history statistics
app.get('/api/history/stats', async (req, res) => {
  if (!historyConfig.enabled) {
    return res.json({ stats: null, enabled: false });
  }
  
  try {
    const userId = req.query.userId || 'anonymous';
    const stats = await historyService.getStats(userId);
    res.json({ stats, enabled: true });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get database schema
app.get('/api/schema', (req, res) => {
  const queries = [
    "SELECT name FROM sqlite_master WHERE type='table';",
    "PRAGMA table_info(users);",
    "PRAGMA table_info(products);",
    "PRAGMA table_info(messages);"
  ];
  
  Promise.all(queries.map(query => 
    new Promise((resolve, reject) => {
      db.all(query, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    })
  ))
  .then(results => {
    res.json({
      tables: results[0],
      users_schema: results[1],
      products_schema: results[2],
      messages_schema: results[3]
    });
  })
  .catch(error => {
    res.status(500).json({ error: error.message });
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🤖 Chatbot server running on port ${PORT}`);
  console.log(`📊 Database: ${dbPath}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/api/health`);
  console.log(`💬 History enabled: ${historyConfig.enabled}`);
  console.log(`🔌 LLM WebSocket: ${llmConfig.url}`);
  
  // Schedule daily cleanup if history is enabled
  if (historyConfig.enabled && historyConfig.retentionDays > 0) {
    setInterval(async () => {
      try {
        await historyService.cleanupOldHistory();
      } catch (error) {
        console.error('History cleanup error:', error);
      }
    }, 24 * 60 * 60 * 1000); // Run daily
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  
  // Disconnect LLM WebSocket
  llmService.disconnect();
  
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('✅ Database connection closed.');
    }
    process.exit(0);
  });
});
