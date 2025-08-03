const express = require('express');
const router = express.Router();

/**
 * Messages APIs
 * Handles message sending, retrieval, and management
 */

// GET /api/messages - Get messages with filtering
router.get('/', async (req, res) => {
  try {
    const { 
      session_id, 
      user_id, 
      page = 1, 
      limit = 50, 
      message_type = 'all',
      start_date,
      end_date 
    } = req.query;

    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.*, u.name as user_name, u.email as user_email
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      WHERE 1=1
    `;
    let params = [];

    if (session_id) {
      sql += ' AND m.session_id = ?';
      params.push(session_id);
    }

    if (user_id) {
      sql += ' AND m.user_id = ?';
      params.push(user_id);
    }

    if (message_type !== 'all') {
      sql += ' AND m.message_type = ?';
      params.push(message_type);
    }

    if (start_date) {
      sql += ' AND m.created_at >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND m.created_at <= ?';
      params.push(end_date);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const messages = await req.db.query(sql, params);

    // Parse metadata for each message
    messages.forEach(message => {
      if (typeof message.metadata === 'string') {
        try {
          message.metadata = JSON.parse(message.metadata);
        } catch (e) {
          message.metadata = {};
        }
      }
    });

    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM messages m WHERE 1=1';
    let countParams = [];

    if (session_id) {
      countSql += ' AND m.session_id = ?';
      countParams.push(session_id);
    }

    if (user_id) {
      countSql += ' AND m.user_id = ?';
      countParams.push(user_id);
    }

    if (message_type !== 'all') {
      countSql += ' AND m.message_type = ?';
      countParams.push(message_type);
    }

    if (start_date) {
      countSql += ' AND m.created_at >= ?';
      countParams.push(start_date);
    }

    if (end_date) {
      countSql += ' AND m.created_at <= ?';
      countParams.push(end_date);
    }

    const total = await req.db.getOne(countSql, countParams);

    res.json({
      success: true,
      data: messages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch messages'
    });
  }
});

// GET /api/messages/:id - Get message by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const message = await req.db.getOne(`
      SELECT m.*, u.name as user_name, u.email as user_email,
             cs.title as session_title
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN chat_sessions cs ON m.session_id = cs.id
      WHERE m.id = ?
    `, [id]);

    if (!message) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    // Parse metadata
    if (typeof message.metadata === 'string') {
      try {
        message.metadata = JSON.parse(message.metadata);
      } catch (e) {
        message.metadata = {};
      }
    }

    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Error fetching message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch message'
    });
  }
});

// POST /api/messages - Send new message
router.post('/', async (req, res) => {
  try {
    const { 
      session_id, 
      user_id, 
      message, 
      message_type = 'text',
      metadata = {} 
    } = req.body;

    // Validation
    if (!session_id || !user_id || !message) {
      return res.status(400).json({
        success: false,
        error: 'session_id, user_id, and message are required'
      });
    }

    // Verify session exists and belongs to user
    const session = await req.db.getOne(
      'SELECT id FROM chat_sessions WHERE id = ? AND user_id = ?',
      [session_id, user_id]
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found or access denied'
      });
    }

    const startTime = Date.now();

    // Store the user message
    const messageData = {
      session_id,
      user_id,
      message,
      message_type,
      metadata: JSON.stringify(metadata),
      created_at: new Date().toISOString()
    };

    const result = await req.db.insert('messages', messageData);
    const messageId = result.insertId || result.id;

    // TODO: Integrate with LLM service to get response
    // For now, we'll just simulate a response
    const llmResponse = await generateLLMResponse(message, metadata);
    
    const responseTime = (Date.now() - startTime) / 1000;

    // Update message with response
    await req.db.update('messages', {
      response: llmResponse.content,
      tokens_used: llmResponse.tokens_used,
      response_time: responseTime
    }, { id: messageId });

    // Update session's last activity
    await req.db.update('chat_sessions', {
      updated_at: new Date().toISOString()
    }, { id: session_id });

    // Update chat history
    const messagePreview = message.length > 100 ? message.substring(0, 100) + '...' : message;
    const historyData = await req.db.getOne(
      'SELECT * FROM chat_history WHERE session_id = ?',
      [session_id]
    );

    if (historyData) {
      await req.db.update('chat_history', {
        message_preview: messagePreview,
        last_activity: new Date().toISOString(),
        message_count: historyData.message_count + 1
      }, { session_id });
    }

    // Get the complete message with response
    const completeMessage = await req.db.getOne(
      'SELECT * FROM messages WHERE id = ?',
      [messageId]
    );

    res.status(201).json({
      success: true,
      data: completeMessage
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send message'
    });
  }
});

// PUT /api/messages/:id - Update message (for editing)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { message, metadata } = req.body;

    // Check if message exists
    const existingMessage = await req.db.getOne('SELECT * FROM messages WHERE id = ?', [id]);
    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const updateData = {};
    if (message) updateData.message = message;
    if (metadata) updateData.metadata = JSON.stringify(metadata);

    if (Object.keys(updateData).length > 0) {
      await req.db.update('messages', updateData, { id });
    }

    res.json({
      success: true,
      message: 'Message updated successfully'
    });
  } catch (error) {
    console.error('Error updating message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update message'
    });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if message exists
    const existingMessage = await req.db.getOne('SELECT * FROM messages WHERE id = ?', [id]);
    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    await req.db.delete('messages', { id });

    // Update chat history message count
    const messageCount = await req.db.getOne(
      'SELECT COUNT(*) as count FROM messages WHERE session_id = ?',
      [existingMessage.session_id]
    );

    await req.db.update('chat_history', {
      message_count: messageCount.count
    }, { session_id: existingMessage.session_id });

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete message'
    });
  }
});

// POST /api/messages/:id/regenerate - Regenerate AI response
router.post('/:id/regenerate', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if message exists
    const existingMessage = await req.db.getOne('SELECT * FROM messages WHERE id = ?', [id]);
    if (!existingMessage) {
      return res.status(404).json({
        success: false,
        error: 'Message not found'
      });
    }

    const startTime = Date.now();

    // Parse metadata
    let metadata = {};
    if (typeof existingMessage.metadata === 'string') {
      try {
        metadata = JSON.parse(existingMessage.metadata);
      } catch (e) {
        metadata = {};
      }
    }

    // Generate new response
    const llmResponse = await generateLLMResponse(existingMessage.message, metadata);
    const responseTime = (Date.now() - startTime) / 1000;

    // Update message with new response
    await req.db.update('messages', {
      response: llmResponse.content,
      tokens_used: llmResponse.tokens_used,
      response_time: responseTime
    }, { id });

    // Get updated message
    const updatedMessage = await req.db.getOne('SELECT * FROM messages WHERE id = ?', [id]);

    res.json({
      success: true,
      data: updatedMessage
    });
  } catch (error) {
    console.error('Error regenerating response:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to regenerate response'
    });
  }
});

// GET /api/messages/search - Search messages
router.get('/search', async (req, res) => {
  try {
    const { 
      q, 
      user_id, 
      session_id, 
      page = 1, 
      limit = 20 
    } = req.query;

    if (!q) {
      return res.status(400).json({
        success: false,
        error: 'Search query (q) is required'
      });
    }

    const offset = (page - 1) * limit;

    let sql = `
      SELECT m.*, u.name as user_name, cs.title as session_title
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN chat_sessions cs ON m.session_id = cs.id
      WHERE (m.message LIKE ? OR m.response LIKE ?)
    `;
    let params = [`%${q}%`, `%${q}%`];

    if (user_id) {
      sql += ' AND m.user_id = ?';
      params.push(user_id);
    }

    if (session_id) {
      sql += ' AND m.session_id = ?';
      params.push(session_id);
    }

    sql += ` ORDER BY m.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const messages = await req.db.query(sql, params);

    res.json({
      success: true,
      data: messages,
      query: q
    });
  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search messages'
    });
  }
});

// Helper function to simulate LLM response
async function generateLLMResponse(message, metadata) {
  // TODO: Replace with actual LLM integration
  // This is a placeholder implementation
  
  const responses = [
    "I understand your question. Let me help you with that.",
    "That's an interesting point. Here's what I think...",
    "Based on your message, I would suggest...",
    "I can definitely help you with this. Here's my response...",
    "Thank you for your message. Let me provide you with some information..."
  ];

  const randomResponse = responses[Math.floor(Math.random() * responses.length)];
  
  return {
    content: randomResponse,
    tokens_used: Math.floor(Math.random() * 100) + 50 // Random tokens between 50-150
  };
}

module.exports = router;
