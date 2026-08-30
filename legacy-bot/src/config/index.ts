import dotenv from "dotenv";

// Load environment variables
dotenv.config();

/**
 * Validate required environment variables strictly without hardcoded fallback secrets.
 */
const telegramToken = process.env.TELEGRAM_BOT_TOKEN || process.env.TELEGRAM_TOKEN || process.env.BOT_TOKEN;
const hasDatabase = process.env.DATABASE_URL || process.env.MYSQL_URL || (process.env.DB_HOST && process.env.DB_USER && process.env.DB_NAME && process.env.DB_PASSWORD !== undefined);
const jwtSecret = process.env.JWT_SECRET?.trim();

if (!telegramToken || !hasDatabase || !jwtSecret) {
  const missing = [];
  if (!telegramToken) missing.push("TELEGRAM_BOT_TOKEN (or TELEGRAM_TOKEN / BOT_TOKEN)");
  if (!hasDatabase) missing.push("DATABASE_URL / MYSQL_URL (or DB_HOST, DB_USER, DB_NAME, DB_PASSWORD)");
  if (!jwtSecret) missing.push("JWT_SECRET");

  throw new Error(
    `⚠️ DEPLOYMENT_FAILURE: Missing [${missing.join(", ")}]. Check your .env or Railway Variables!`
  );
}

export const config = {
  telegram: {
    token: telegramToken,
    debug: process.env.DEBUG === "true",
  },

  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    name: process.env.DB_NAME,
    url: process.env.DATABASE_URL || process.env.MYSQL_URL,
  },

  security: {
    jwtSecret,
  },

  environment: process.env.NODE_ENV || "development",
  isDevelopment: process.env.NODE_ENV !== "production",
};

export default config;
