class ChatHistoryService {
  constructor(db, config) {
    this.db = db;
    this.config = config;
    this.initializeTables();
  }

  initializeTables() {
    // Create chat sessions table
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS chat_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        session_name TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_active INTEGER DEFAULT 1
      )`);

      // Create chat history table
      this.db.run(`CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        message_id TEXT UNIQUE,
        user_message TEXT NOT NULL,
        bot_response TEXT,
        is_sql_mode INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(session_id) REFERENCES chat_sessions(id)
      )`);

      // Create index for better performance
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_chat_history_session 
                   ON chat_history(session_id, created_at DESC)`);
      
      this.db.run(`CREATE INDEX IF NOT EXISTS idx_chat_sessions_user 
                   ON chat_sessions(user_id, updated_at DESC)`);
    });
  }

  // Create a new chat session
  createSession(userId = 'anonymous', sessionName = null) {
    return new Promise((resolve, reject) => {
      const name = sessionName || `Chat ${new Date().toLocaleString()}`;
      
      this.db.run(
        `INSERT INTO chat_sessions (user_id, session_name) VALUES (?, ?)`,
        [userId, name],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.lastID);
          }
        }
      );
    });
  }

  // Get all sessions for a user
  getSessions(userId = 'anonymous', limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT s.*, 
                COUNT(h.id) as message_count,
                MAX(h.created_at) as last_message_at
         FROM chat_sessions s
         LEFT JOIN chat_history h ON s.id = h.session_id
         WHERE s.user_id = ? AND s.is_active = 1
         GROUP BY s.id
         ORDER BY s.updated_at DESC 
         LIMIT ?`,
        [userId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Get chat history for a specific session
  getSessionHistory(sessionId, limit = 100) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT * FROM chat_history 
         WHERE session_id = ? 
         ORDER BY created_at ASC 
         LIMIT ?`,
        [sessionId, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }

  // Save a message to history
  saveMessage(sessionId, messageId, userMessage, botResponse = null, isSqlMode = false) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO chat_history 
         (session_id, message_id, user_message, bot_response, is_sql_mode) 
         VALUES (?, ?, ?, ?, ?)`,
        [sessionId, messageId, userMessage, botResponse, isSqlMode ? 1 : 0],
        function(err) {
          if (err) {
            reject(err);
          } else {
            // Update session timestamp
            this.db.run(
              `UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
              [sessionId]
            );
            resolve(this.lastID);
          }
        }.bind(this)
      );
    });
  }

  // Update bot response for an existing message
  updateBotResponse(messageId, botResponse) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE chat_history SET bot_response = ? WHERE message_id = ?`,
        [botResponse, messageId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Delete a session and its history
  deleteSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        this.db.run(
          `DELETE FROM chat_history WHERE session_id = ?`,
          [sessionId],
          (err) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            this.db.run(
              `DELETE FROM chat_sessions WHERE id = ?`,
              [sessionId],
              (err) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                } else {
                  this.db.run('COMMIT');
                  resolve(true);
                }
              }
            );
          }
        );
      });
    });
  }

  // Soft delete (mark as inactive)
  archiveSession(sessionId) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE chat_sessions SET is_active = 0 WHERE id = ?`,
        [sessionId],
        function(err) {
          if (err) {
            reject(err);
          } else {
            resolve(this.changes);
          }
        }
      );
    });
  }

  // Clean up old history based on retention policy
  cleanupOldHistory() {
    if (!this.config.retentionDays) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');
        
        // Delete old chat history
        this.db.run(
          `DELETE FROM chat_history 
           WHERE created_at < ? AND session_id IN (
             SELECT id FROM chat_sessions WHERE updated_at < ?
           )`,
          [cutoffDate.toISOString(), cutoffDate.toISOString()],
          (err) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }
            
            // Delete empty sessions
            this.db.run(
              `DELETE FROM chat_sessions 
               WHERE updated_at < ? AND id NOT IN (
                 SELECT DISTINCT session_id FROM chat_history WHERE session_id IS NOT NULL
               )`,
              [cutoffDate.toISOString()],
              (err) => {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                } else {
                  this.db.run('COMMIT');
                  console.log(`🧹 Cleaned up chat history older than ${this.config.retentionDays} days`);
                  resolve(true);
                }
              }
            );
          }
        );
      });
    });
  }

  // Get statistics
  getStats(userId = 'anonymous') {
    return new Promise((resolve, reject) => {
      this.db.get(
        `SELECT 
           COUNT(DISTINCT s.id) as total_sessions,
           COUNT(h.id) as total_messages,
           MAX(h.created_at) as last_activity
         FROM chat_sessions s
         LEFT JOIN chat_history h ON s.id = h.session_id
         WHERE s.user_id = ? AND s.is_active = 1`,
        [userId],
        (err, row) => {
          if (err) {
            reject(err);
          } else {
            resolve(row);
          }
        }
      );
    });
  }

  // Search chat history
  searchHistory(userId = 'anonymous', searchTerm, limit = 50) {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT h.*, s.session_name
         FROM chat_history h
         JOIN chat_sessions s ON h.session_id = s.id
         WHERE s.user_id = ? 
           AND s.is_active = 1
           AND (h.user_message LIKE ? OR h.bot_response LIKE ?)
         ORDER BY h.created_at DESC
         LIMIT ?`,
        [userId, `%${searchTerm}%`, `%${searchTerm}%`, limit],
        (err, rows) => {
          if (err) {
            reject(err);
          } else {
            resolve(rows);
          }
        }
      );
    });
  }
}

module.exports = ChatHistoryService;
