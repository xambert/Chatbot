const DatabaseAdapter = require('./database-adapter');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * SQLite Database Adapter
 * Implements the DatabaseAdapter interface for SQLite
 */
class SQLiteAdapter extends DatabaseAdapter {
  constructor(config) {
    super(config);
    this.dbPath = config.path || path.join(__dirname, '..', 'chatbot.db');
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.connection = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('SQLite connection error:', err);
          reject(err);
        } else {
          console.log('✅ Connected to SQLite database');
          this.createTables().then(resolve).catch(reject);
        }
      });
    });
  }

  async disconnect() {
    return new Promise((resolve, reject) => {
      if (this.connection) {
        this.connection.close((err) => {
          if (err) {
            reject(err);
          } else {
            console.log('🔌 SQLite connection closed');
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  async getOne(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.connection.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getMany(sql, params = []) {
    return this.query(sql, params);
  }

  async insert(table, data) {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    
    return new Promise((resolve, reject) => {
      this.connection.run(sql, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ insertId: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async update(table, data, where) {
    const { clause: setClause, params: setParams } = this.buildSetClause(data);
    const { clause: whereClause, params: whereParams } = this.buildWhereClause(where);

    const sql = `UPDATE ${table} SET ${setClause} ${whereClause}`;
    const params = [...setParams, ...whereParams];

    return new Promise((resolve, reject) => {
      this.connection.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async delete(table, where) {
    const { clause: whereClause, params: whereParams } = this.buildWhereClause(where);
    const sql = `DELETE FROM ${table} ${whereClause}`;

    return new Promise((resolve, reject) => {
      this.connection.run(sql, whereParams, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        avatar_url TEXT,
        status TEXT DEFAULT 'active',
        preferences TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Chat sessions table
      `CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        title TEXT DEFAULT 'New Chat',
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,

      // Messages table
      `CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        user_id INTEGER,
        message TEXT NOT NULL,
        response TEXT,
        message_type TEXT DEFAULT 'text',
        metadata TEXT DEFAULT '{}',
        tokens_used INTEGER DEFAULT 0,
        response_time REAL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,

      // Chat history table (for quick access)
      `CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        session_id INTEGER,
        message_preview TEXT,
        last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
        message_count INTEGER DEFAULT 0,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id)
      )`,

      // API keys table (for user authentication)
      `CREATE TABLE IF NOT EXISTS api_keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        key_hash TEXT NOT NULL,
        name TEXT,
        permissions TEXT DEFAULT '[]',
        expires_at DATETIME,
        last_used DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )`,

      // System settings table
      `CREATE TABLE IF NOT EXISTS system_settings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key TEXT UNIQUE NOT NULL,
        value TEXT,
        description TEXT,
        category TEXT DEFAULT 'general',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`
    ];

    for (const table of tables) {
      await new Promise((resolve, reject) => {
        this.connection.run(table, (err) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        });
      });
    }

    // Insert default system settings
    await this.insertDefaultSettings();
    console.log('✅ SQLite tables created successfully');
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
        await this.insert('system_settings', setting);
      } catch (err) {
        // Ignore duplicate key errors
        if (!err.message.includes('UNIQUE constraint failed')) {
          console.error('Error inserting default setting:', err);
        }
      }
    }
  }
}

module.exports = SQLiteAdapter;
