const express = require('express');
const router = express.Router();

/**
 * Chat Session Management APIs
 * Handles chat session creation, retrieval, and management
 */

// GET /api/sessions - Get all sessions for a user
router.get('/', async (req, res) => {
  try {
    const { user_id, page = 1, limit = 20, status = 'active' } = req.query;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    const offset = (page - 1) * limit;

    let sql = `
      SELECT cs.*, 
             COUNT(m.id) as message_count,
             MAX(m.created_at) as last_message_at
      FROM chat_sessions cs
      LEFT JOIN messages m ON cs.id = m.session_id
      WHERE cs.user_id = ?
    `;
    let params = [user_id];

    if (status !== 'all') {
      sql += ' AND cs.status = ?';
      params.push(status);
    }

    sql += `
      GROUP BY cs.id
      ORDER BY cs.updated_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const sessions = await req.db.query(sql, params);
    
    // Get total count
    let countSql = 'SELECT COUNT(*) as count FROM chat_sessions WHERE user_id = ?';
    let countParams = [user_id];
    
    if (status !== 'all') {
      countSql += ' AND status = ?';
      countParams.push(status);
    }
    
    const total = await req.db.getOne(countSql, countParams);

    res.json({
      success: true,
      data: sessions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sessions'
    });
  }
});

// GET /api/sessions/:id - Get session by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { include_messages = 'false' } = req.query;

    const session = await req.db.getOne(
      'SELECT * FROM chat_sessions WHERE id = ?',
      [id]
    );

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    let messages = [];
    if (include_messages === 'true') {
      messages = await req.db.query(
        'SELECT * FROM messages WHERE session_id = ? ORDER BY created_at ASC',
        [id]
      );
    }

    res.json({
      success: true,
      data: {
        ...session,
        messages: messages
      }
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session'
    });
  }
});

// POST /api/sessions - Create new session
router.post('/', async (req, res) => {
  try {
    const { user_id, title = 'New Chat' } = req.body;

    if (!user_id) {
      return res.status(400).json({
        success: false,
        error: 'user_id is required'
      });
    }

    // Verify user exists
    const user = await req.db.getOne('SELECT id FROM users WHERE id = ?', [user_id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const sessionData = {
      user_id,
      title,
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await req.db.insert('chat_sessions', sessionData);
    const sessionId = result.insertId || result.id;

    // Create corresponding chat history entry
    await req.db.insert('chat_history', {
      user_id,
      session_id: sessionId,
      message_preview: 'New chat session started',
      last_activity: new Date().toISOString(),
      message_count: 0
    });

    res.status(201).json({
      success: true,
      data: {
        id: sessionId,
        message: 'Session created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create session'
    });
  }
});

// PUT /api/sessions/:id - Update session
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, status } = req.body;

    // Check if session exists
    const existingSession = await req.db.getOne('SELECT id FROM chat_sessions WHERE id = ?', [id]);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (title) updateData.title = title;
    if (status) updateData.status = status;

    await req.db.update('chat_sessions', updateData, { id });

    res.json({
      success: true,
      message: 'Session updated successfully'
    });
  } catch (error) {
    console.error('Error updating session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update session'
    });
  }
});

// DELETE /api/sessions/:id - Delete session
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const existingSession = await req.db.getOne('SELECT id FROM chat_sessions WHERE id = ?', [id]);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    // Delete related messages and history
    await req.db.delete('messages', { session_id: id });
    await req.db.delete('chat_history', { session_id: id });
    await req.db.delete('chat_sessions', { id });

    res.json({
      success: true,
      message: 'Session deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete session'
    });
  }
});

// POST /api/sessions/:id/archive - Archive session
router.post('/:id/archive', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const existingSession = await req.db.getOne('SELECT id FROM chat_sessions WHERE id = ?', [id]);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await req.db.update('chat_sessions', {
      status: 'archived',
      updated_at: new Date().toISOString()
    }, { id });

    res.json({
      success: true,
      message: 'Session archived successfully'
    });
  } catch (error) {
    console.error('Error archiving session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to archive session'
    });
  }
});

// POST /api/sessions/:id/restore - Restore archived session
router.post('/:id/restore', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const existingSession = await req.db.getOne('SELECT id FROM chat_sessions WHERE id = ?', [id]);
    if (!existingSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    await req.db.update('chat_sessions', {
      status: 'active',
      updated_at: new Date().toISOString()
    }, { id });

    res.json({
      success: true,
      message: 'Session restored successfully'
    });
  } catch (error) {
    console.error('Error restoring session:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to restore session'
    });
  }
});

// GET /api/sessions/:id/stats - Get session statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if session exists
    const session = await req.db.getOne('SELECT id FROM chat_sessions WHERE id = ?', [id]);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found'
      });
    }

    const stats = await req.db.getOne(`
      SELECT 
        COUNT(*) as total_messages,
        SUM(tokens_used) as total_tokens,
        AVG(response_time) as avg_response_time,
        MIN(created_at) as first_message,
        MAX(created_at) as last_message
      FROM messages
      WHERE session_id = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        total_messages: stats.total_messages || 0,
        total_tokens: stats.total_tokens || 0,
        avg_response_time: parseFloat(stats.avg_response_time) || 0,
        first_message: stats.first_message,
        last_message: stats.last_message
      }
    });
  } catch (error) {
    console.error('Error fetching session stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch session statistics'
    });
  }
});

module.exports = router;
