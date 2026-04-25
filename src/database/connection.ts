import mysql from "mysql2/promise";
import { config } from "../config";

let pool: mysql.Pool | null = null;

export async function initializeDatabase(): Promise<void> {
  try {
    pool = mysql.createPool({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "kiasucode",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    // Test the connection
    await pool.getConnection();
    console.log("✅ MySQL database connected - steady lah, we connected lor!");
  } catch (error) {
    console.error("❌ Database connection failed - wah lau:", error);
    throw error;
  }
}

export function getDatabase(): mysql.Pool {
  if (!pool) throw new Error("Database not initialized. Call initializeDatabase() first lah!");
  return pool;
}

export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("🔌 MySQL database closed - ship it!");
  }
}

export default { initializeDatabase, getDatabase, closeDatabase };