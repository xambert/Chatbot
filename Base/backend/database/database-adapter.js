/**
 * Database Adapter Interface
 * This provides a common interface for different database types
 * Users can switch databases by changing the configuration
 */

class DatabaseAdapter {
  constructor(config) {
    this.config = config;
    this.connection = null;
  }

  // Abstract methods that must be implemented by concrete adapters
  async connect() {
    throw new Error('connect() method must be implemented');
  }

  async disconnect() {
    throw new Error('disconnect() method must be implemented');
  }

  async query(sql, params = []) {
    throw new Error('query() method must be implemented');
  }

  async getOne(sql, params = []) {
    throw new Error('getOne() method must be implemented');
  }

  async getMany(sql, params = []) {
    throw new Error('getMany() method must be implemented');
  }

  async insert(table, data) {
    throw new Error('insert() method must be implemented');
  }

  async update(table, data, where) {
    throw new Error('update() method must be implemented');
  }

  async delete(table, where) {
    throw new Error('delete() method must be implemented');
  }

  async createTables() {
    throw new Error('createTables() method must be implemented');
  }

  // Helper method to build WHERE clause
  buildWhereClause(where) {
    if (!where || Object.keys(where).length === 0) {
      return { clause: '', params: [] };
    }

    const conditions = Object.keys(where).map(key => `${key} = ?`);
    const params = Object.values(where);

    return {
      clause: `WHERE ${conditions.join(' AND ')}`,
      params
    };
  }

  // Helper method to build SET clause for updates
  buildSetClause(data) {
    const sets = Object.keys(data).map(key => `${key} = ?`);
    const params = Object.values(data);

    return {
      clause: sets.join(', '),
      params
    };
  }
}

module.exports = DatabaseAdapter;
