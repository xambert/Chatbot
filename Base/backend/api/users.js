const express = require('express');
const router = express.Router();

/**
 * User Management APIs
 * Handles user registration, authentication, and profile management
 */

// GET /api/users - Get all users (admin)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;

    let sql = 'SELECT id, name, email, avatar_url, status, created_at FROM users';
    let params = [];

    if (search) {
      sql += ' WHERE name LIKE ? OR email LIKE ?';
      params = [`%${search}%`, `%${search}%`];
    }

    sql += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const users = await req.db.query(sql, params);
    const total = await req.db.getOne('SELECT COUNT(*) as count FROM users');

    res.json({
      success: true,
      data: users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total.count,
        pages: Math.ceil(total.count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch users'
    });
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await req.db.getOne(
      'SELECT id, name, email, avatar_url, status, preferences, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Parse preferences if it's a string
    if (typeof user.preferences === 'string') {
      try {
        user.preferences = JSON.parse(user.preferences);
      } catch (e) {
        user.preferences = {};
      }
    }

    res.json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user'
    });
  }
});

// POST /api/users - Create new user
router.post('/', async (req, res) => {
  try {
    const { name, email, avatar_url, preferences = {} } = req.body;

    // Validation
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        error: 'Name and email are required'
      });
    }

    // Check if user already exists
    const existingUser = await req.db.getOne('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const userData = {
      name,
      email,
      avatar_url,
      preferences: JSON.stringify(preferences),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await req.db.insert('users', userData);
    
    res.status(201).json({
      success: true,
      data: {
        id: result.insertId || result.id,
        message: 'User created successfully'
      }
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create user'
    });
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, avatar_url, preferences, status } = req.body;

    // Check if user exists
    const existingUser = await req.db.getOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
    if (preferences) updateData.preferences = JSON.stringify(preferences);
    if (status) updateData.status = status;

    await req.db.update('users', updateData, { id });

    res.json({
      success: true,
      message: 'User updated successfully'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update user'
    });
  }
});

// DELETE /api/users/:id - Delete user
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await req.db.getOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!existingUser) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Delete related data first
    await req.db.delete('messages', { user_id: id });
    await req.db.delete('chat_sessions', { user_id: id });
    await req.db.delete('chat_history', { user_id: id });
    await req.db.delete('api_keys', { user_id: id });

    // Delete user
    await req.db.delete('users', { id });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete user'
    });
  }
});

// GET /api/users/:id/stats - Get user statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await req.db.getOne('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    const stats = await req.db.getOne(`
      SELECT 
        COUNT(DISTINCT cs.id) as total_sessions,
        COUNT(m.id) as total_messages,
        SUM(m.tokens_used) as total_tokens,
        AVG(m.response_time) as avg_response_time,
        MAX(m.created_at) as last_activity
      FROM users u
      LEFT JOIN chat_sessions cs ON u.id = cs.user_id
      LEFT JOIN messages m ON cs.id = m.session_id
      WHERE u.id = ?
    `, [id]);

    res.json({
      success: true,
      data: {
        total_sessions: stats.total_sessions || 0,
        total_messages: stats.total_messages || 0,
        total_tokens: stats.total_tokens || 0,
        avg_response_time: parseFloat(stats.avg_response_time) || 0,
        last_activity: stats.last_activity
      }
    });
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch user statistics'
    });
  }
});

module.exports = router;
