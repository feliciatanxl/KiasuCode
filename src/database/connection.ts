/**
 * Database Connection Module
 * Handles SQLite database - steady lah, lightweight and file-based!
 * Using better-sqlite3 for fast, synchronous access without async headaches
 */

import Database from "better-sqlite3";
import { config } from "../config";

/**
 * SQLite database instance
 * Single file-based database - no server needed, chiong lah!
 */
let db: Database.Database | null = null;

/**
 * Initialize the SQLite database
 * Call this once during app startup
 * Creates database file if it doesn't exist
 * @returns void - synchronous setup
 * @throws Error if connection fails - git push rejected lah
 */
export function initializeDatabase(): void {
  try {
    db = new Database(config.database.path);

    // Enable foreign keys (safety feature for relationships)
    db.pragma("foreign_keys = ON");

    // Test the connection with a simple query
    db.exec("SELECT 1");

    console.log(
      "✅ SQLite database connected - steady lah, we connected lor!"
    );
  } catch (error) {
    console.error("❌ Database connection failed - wah lau:", error);
    throw error;
  }
}

/**
 * Get the database instance
 * Use this to execute queries throughout the app
 * LGTM - production pattern, no merge conflict here
 * @returns Database.Database - the active SQLite connection
 * @throws Error if database not initialized
 */
export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error(
      "Database not initialized. Call initializeDatabase() first lah!"
    );
  }
  return db;
}

/**
 * Close the database gracefully
 * Call this during app shutdown - no resource leak lor
 * @returns void
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
    console.log("🔌 SQLite database closed - ship it!");
  }
}

export default { initializeDatabase, getDatabase, closeDatabase };
