// /**
//  * Configuration Module
//  * Centralized config management - steady lah, all the env variables here!
//  */

// import dotenv from "dotenv";

// // Load environment variables from .env file
// dotenv.config();

// /**
//  * Validate required environment variables
//  * Wah lau, cannot proceed without these lor
//  */
// // Changed from DB_PATH to our new MySQL variables
// const requiredEnvVars = ["TELEGRAM_TOKEN", "DB_HOST", "DB_USER", "DB_NAME"];

// const missingVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

// if (missingVars.length > 0) {
//   throw new Error(
//     `Missing required environment variables: ${missingVars.join(", ")}. Check your .env file lor!`
//   );
// }

// /**
//  * Application Configuration Object
//  * LGTM - production-ready config structure
//  */
// export const config = {
//   // Telegram Bot Configuration
//   telegram: {
//     token: process.env.TELEGRAM_TOKEN!,
//     // Enable debug mode for troubleshooting (set to true to chiong debugging)
//     debug: process.env.DEBUG === "true",
//   },

//   // Database Configuration (MySQL)
//   database: {
//     host: process.env.DB_HOST || "localhost",
//     user: process.env.DB_USER || "root",
//     password: process.env.DB_PASSWORD || "",
//     name: process.env.DB_NAME || "kiasucode",
//   },

//   // Application Environment
//   environment: process.env.NODE_ENV || "development",
//   isDevelopment: process.env.NODE_ENV !== "production",
// };

// export default config;

import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Flexible Validation
 * We check if we have what we need, regardless of the variable name.
 */
const hasTelegram = process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
const hasDatabase = process.env.MYSQL_URL || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME);

if (!hasTelegram || !hasDatabase) {
  const missing = [];
  if (!hasTelegram) missing.push("TELEGRAM_TOKEN (or BOT_TOKEN)");
  if (!hasDatabase) missing.push("DB_HOST/USER/NAME (or MYSQL_URL)");

  throw new Error(
    `⚠️ DEPLOYMENT_FAILURE: Missing [${missing.join(", ")}]. Check your .env or Railway Variables lor!`
  );
}

/**
 * Centralized Config
 * LGTM - Now handles both local and cloud environments
 */
export const config = {
  telegram: {
    // Check both potential names
    token: process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN || "",
    debug: process.env.DEBUG === "true",
  },

  database: {
    // Keep these for local fallback, but connection.ts will prioritize MYSQL_URL
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "kiasucode",
    url: process.env.MYSQL_URL, // Pass the master URL if it exists
  },

  environment: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
};

export default config;