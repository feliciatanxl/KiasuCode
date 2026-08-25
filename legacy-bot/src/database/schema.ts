import { getDatabase } from "./connection";

export async function initializeSchema(): Promise<void> {
  const db = getDatabase();

  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS students (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId BIGINT NOT NULL UNIQUE,
        username VARCHAR(255) NOT NULL,
        totalGPA DECIMAL(3,2) DEFAULT 0.00,
        moduleCount INT DEFAULT 0,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS module_grades (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId BIGINT NOT NULL,
        moduleCode VARCHAR(15) NOT NULL,
        creditValue INT NOT NULL,
        grade VARCHAR(2) NOT NULL,
        pointValue DECIMAL(3,2) NOT NULL,
        committedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES students(userId) ON DELETE CASCADE,
        UNIQUE KEY unique_user_module (userId, moduleCode)
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS deadlines (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId BIGINT NOT NULL,
        task_name VARCHAR(255) NOT NULL,
        due_date DATETIME NOT NULL,
        status VARCHAR(50) DEFAULT 'OPEN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ MySQL database schema initialized - LGTM!");
  } catch (error) {
    console.error("❌ Schema initialization failed - wah lau:", error);
    throw error;
  }
}

export default { initializeSchema };