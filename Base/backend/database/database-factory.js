const SQLiteAdapter = require('./sqlite-adapter');
const PostgreSQLAdapter = require('./postgresql-adapter');

/**
 * Database Factory
 * Creates the appropriate database adapter based on configuration
 */
class DatabaseFactory {
  static create(config) {
    const { type } = config;

    switch (type.toLowerCase()) {
      case 'sqlite':
        return new SQLiteAdapter(config);
      case 'postgresql':
      case 'postgres':
        return new PostgreSQLAdapter(config);
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }
  }

  static getDefaultConfig(type) {
    switch (type.toLowerCase()) {
      case 'sqlite':
        return {
          type: 'sqlite',
          path: './chatbot.db'
        };
      case 'postgresql':
      case 'postgres':
        return {
          type: 'postgresql',
          host: 'localhost',
          port: 5432,
          database: 'chatbot',
          user: 'postgres',
          password: '',
          maxConnections: 20,
          idleTimeout: 30000,
          connectionTimeout: 2000
        };
      default:
        throw new Error(`No default configuration for database type: ${type}`);
    }
  }
}

module.exports = DatabaseFactory;
