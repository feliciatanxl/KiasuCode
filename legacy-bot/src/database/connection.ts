// import mysql from "mysql2/promise";
// import { config } from "../config";

// let pool: mysql.Pool | null = null;

// export async function initializeDatabase(): Promise<void> {
//   try {
//     pool = mysql.createPool({
//       host: process.env.DB_HOST || "localhost",
//       user: process.env.DB_USER || "root",
//       password: process.env.DB_PASSWORD || "",
//       database: process.env.DB_NAME || "kiasucode",
//       waitForConnections: true,
//       connectionLimit: 10,
//       queueLimit: 0,
//     });

//     // Test the connection
//     await pool.getConnection();
//     console.log("✅ MySQL database connected - steady lah, we connected lor!");
//   } catch (error) {
//     console.error("❌ Database connection failed - wah lau:", error);
//     throw error;
//   }
// }

// export function getDatabase(): mysql.Pool {
//   if (!pool) throw new Error("Database not initialized. Call initializeDatabase() first lah!");
//   return pool;
// }

// export async function closeDatabase(): Promise<void> {
//   if (pool) {
//     await pool.end();
//     pool = null;
//     console.log("🔌 MySQL database closed - ship it!");
//   }
// }

// export default { initializeDatabase, getDatabase, closeDatabase };


import mysql from "mysql2/promise";

let pool: mysql.Pool | null = null;

export async function initializeDatabase(): Promise<void> {
  try {
    // 1. Check if we have the "Master String" from Railway / Cloud
    const connectionUri = process.env.DATABASE_URL || process.env.MYSQL_URL;

    if (connectionUri) {
      // CLOUD MODE: Connection URL provides Host, User, Pass, Port, DB
      pool = mysql.createPool(connectionUri);
      console.log("🚀 Connected via Railway DATABASE_URL / MYSQL_URL - Cloud deployment active!");
    } else {
      const host = process.env.DB_HOST;
      const user = process.env.DB_USER;
      const password = process.env.DB_PASSWORD;
      const database = process.env.DB_NAME;

      if (!host || !user || !database || password === undefined) {
        throw new Error(
          "Missing required database environment variables (DB_HOST, DB_USER, DB_NAME, DB_PASSWORD). Check your .env file!"
        );
      }

      // LOCAL MODE: Connect using separate .env variables
      pool = mysql.createPool({
        host,
        port: Number(process.env.DB_PORT) || 3306,
        user,
        password,
        database,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log(`💻 Connected via Local Config (Port: ${process.env.DB_PORT || 3306}) - Development mode steady!`);
    }

    // 2. Test the connection
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