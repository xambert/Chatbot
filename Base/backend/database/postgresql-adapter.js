const DatabaseAdapter = require('./database-adapter');
const { Pool } = require('pg');

/**
 * PostgreSQL Database Adapter
 * Implements the DatabaseAdapter interface for PostgreSQL
 */
class PostgreSQLAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.pool = new Pool({
      host: config.host || 'localhost',
      port: config.port || 5432,
      database: config.database || 'chatbot',
      user: config.user || 'postgres',
      password: config.password || '',
      max: config.maxConnections || 20,
      idleTimeoutMillis: config.idleTimeout || 30000,
      connectionTimeoutMillis: config.connectionTimeout || 2000,
    });
  }

  async connect() {
    try {
      // Test the connection
      const client = await this.pool.connect();
      client.release();
      console.log('✅ Connected to PostgreSQL database');
      await this.createTables();
      return true;
    } catch (err) {
      console.error('PostgreSQL connection error:', err);
      throw err;
    }
  }

  async disconnect() {
    try {
      await this.pool.end();
      console.log('🔌 PostgreSQL connection pool closed');
    } catch (err) {
      console.error('Error closing PostgreSQL pool:', err);
      throw err;
    }
  }

  async query(sql, params = []) {
    const client = await this.pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async getOne(sql, params = []) {
    const rows = await this.query(sql, params);
    return rows[0] || null;
  }

  async getMany(sql, params = []) {
    return this.query(sql, params);
  }

  async insert(table, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = columns.map((_, index) => `$${index + 1}`);

    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING *`;
    
    const result = await this.query(sql, values);
    return result[0];
  }

  async update(table, data, where) {
    const setColumns = Object.keys(data);
    const setValues = Object.values(data);
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);

    const setClause = setColumns.map((col, index) => `${col} = $${index + 1}`).join(', ');
    const whereClause = whereColumns.map((col, index) => `${col} = $${setColumns.length + index + 1}`).join(' AND ');

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
    const params = [...setValues, ...whereValues];

    const result = await this.query(sql, params);
    return result;
  }

  async delete(table, where) {
    const whereColumns = Object.keys(where);
    const whereValues = Object.values(where);
    const whereClause = whereColumns.map((col, index) => `${col} = $${index + 1}`).join(' AND ');

    const sql = `DELETE FROM ${table} WHERE ${whereClause} RETURNING *`;
    
    const result = await this.query(sql, whereValues);
    return result;
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar_url TEXT,
        status VARCHAR(50) DEFAULT 'active',
        preferences JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Chat sessions table
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) DEFAULT 'New Chat',
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES chat_sessions(id),
        user_id INTEGER REFERENCES users(id),
        message TEXT NOT NULL,
        response TEXT,
        message_type VARCHAR(50) DEFAULT 'text',
        metadata JSONB DEFAULT '{}',
        tokens_used INTEGER DEFAULT 0,
        response_time REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // Chat history table (for quick access)
      `CREATE TABLE IF NOT EXISTS chat_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        session_id INTEGER REFERENCES chat_sessions(id),
        message_preview TEXT,
        last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        message_count INTEGER DEFAULT 0
      )`,

      // API keys table (for user authentication)
      `CREATE TABLE IF NOT EXISTS api_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        key_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        permissions JSONB DEFAULT '[]',
        expires_at TIMESTAMP,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`,

      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(255) UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        category VARCHAR(100) DEFAULT 'general',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await this.query(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON chat_sessions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_system_settings_key ON system_settings(key)'
    ];

    for (const index of indexes) {
      await this.query(index);
    }

    // Insert default system settings
    await this.insertDefaultSettings();
    console.log('✅ PostgreSQL tables created successfully');
  }

  async insertDefaultSettings() {
    const defaultSettings = [
      { key: 'max_tokens', value: '4000', description: 'Maximum tokens per response', category: 'llm' },
      { key: 'temperature', value: '0.7', description: 'LLM temperature setting', category: 'llm' },
      { key: 'max_history_items', value: '100', description: 'Maximum chat history items', category: 'chat' },
      { key: 'enable_history', value: 'true', description: 'Enable chat history', category: 'chat' },
      { key: 'history_retention_days', value: '30', description: 'Days to retain chat history', category: 'chat' }
    ];

    for (const setting of defaultSettings) {
      try {
        await this.query(
          'INSERT INTO system_settings (key, value, description, category) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO NOTHING',
          [setting.key, setting.value, setting.description, setting.category]
        );
      } catch (err) {
        console.error('Error inserting default setting:', err);
      }
    }
  }
}

module.exports = PostgreSQLAdapter;
