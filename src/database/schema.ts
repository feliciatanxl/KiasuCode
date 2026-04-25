/**
 * SQLite Schema Initialization
 * Automatically creates tables on app startup if they don't exist
 * Steady lah, no manual SQL scripts needed!
 */

import { getDatabase } from "./connection";

/**
 * Initialize database schema
 * Creates all tables if they don't exist
 * Call this after initializeDatabase() in main setup
 *
 * @throws Error if schema creation fails
 */
export function initializeSchema(): void {
  const db = getDatabase();

  try {
    // Create students table
    db.exec(`
      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL UNIQUE,
        username TEXT NOT NULL,
        totalGPA REAL DEFAULT 0.0,
        moduleCount INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for students
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_students_userId ON students(userId);
      CREATE INDEX IF NOT EXISTS idx_students_createdAt ON students(createdAt);
    `);

    // Create module_grades table
    db.exec(`
      CREATE TABLE IF NOT EXISTS module_grades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        moduleCode TEXT NOT NULL,
        creditValue INTEGER NOT NULL,
        grade TEXT NOT NULL,
        pointValue REAL NOT NULL,
        committedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES students(userId) ON DELETE CASCADE,
        UNIQUE(userId, moduleCode)
      );
    `);

    // Create indexes for module_grades
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_module_grades_userId ON module_grades(userId);
      CREATE INDEX IF NOT EXISTS idx_module_grades_moduleCode ON module_grades(moduleCode);
      CREATE INDEX IF NOT EXISTS idx_module_grades_committedAt ON module_grades(committedAt);
    `);

    // Create audit_log table
    db.exec(`
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        action TEXT NOT NULL,
        moduleCode TEXT,
        details TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes for audit_log
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_audit_log_userId ON audit_log(userId);
      CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      CREATE INDEX IF NOT EXISTS idx_audit_log_createdAt ON audit_log(createdAt);
    `);

    // Create grading_scale table
    db.exec(`
      CREATE TABLE IF NOT EXISTS grading_scale (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grade TEXT NOT NULL UNIQUE,
        pointValue REAL NOT NULL,
        description TEXT
      );
    `);

    // Create index for grading_scale
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_grading_scale_grade ON grading_scale(grade);
    `);

    // Insert default grading scale (if not already present)
    db.exec(`
      INSERT OR IGNORE INTO grading_scale (grade, pointValue, description) VALUES
      ('A', 4.0, 'Excellent'),
      ('B+', 3.5, 'Very Good'),
      ('B', 3.0, 'Good'),
      ('C+', 2.5, 'Satisfactory'),
      ('C', 2.0, 'Pass'),
      ('D+', 1.5, 'Marginal Pass'),
      ('D', 1.0, 'Minimum Pass'),
      ('F', 0.0, 'Fail');
    `);

    console.log("✅ Database schema initialized - LGTM!");
  } catch (error) {
    console.error("❌ Schema initialization failed - wah lau:", error);
    throw error;
  }
}

export default { initializeSchema };
