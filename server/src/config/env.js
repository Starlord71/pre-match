import 'dotenv/config';

/**
 * Centralized environment configuration with development defaults.
 * @module config/env
 */
const env = {
  /** HTTP port the server listens on. */
  PORT: Number(process.env.PORT) || 3000,
  /** API key for football-data.org (required at runtime for sync). */
  FOOTBALL_DATA_API_KEY: process.env.FOOTBALL_DATA_API_KEY || '',
  /** Path to the SQLite database file. */
  DB_PATH: process.env.DB_PATH || './data/prematch.sqlite',
  /** Runtime environment name. */
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export default env;
