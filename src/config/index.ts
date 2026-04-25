/**
 * Configuration Module
 * Centralized config management - steady lah, all the env variables here!
 */

import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();

/**
 * Validate required environment variables
 * Wah lau, cannot proceed without these lor
 */
const requiredEnvVars = ["TELEGRAM_TOKEN", "DB_PATH"];

const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}. Check your .env file lor!`
  );
}

/**
 * Application Configuration Object
 * LGTM - production-ready config structure
 */
export const config = {
  // Telegram Bot Configuration
  telegram: {
    token: process.env.TELEGRAM_TOKEN!,
    // Enable debug mode for troubleshooting (set to true to chiong debugging)
    debug: process.env.DEBUG === "true",
  },

  // Database Configuration (SQLite)
  database: {
    path: process.env.DB_PATH || "./kiasucode.db",
  },

  // Application Environment
  environment: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
};

export default config;
