import { getDatabase } from "./connection";
import {
  StudentProfile,
  ModuleGrade,
  GRADE_POINTS,
  ApiResponse,
} from "../types";

/**
 * Ensures a student profile exists in the DB.
 * If they don't exist, it creates one. Steady lah!
 */
export async function ensureStudentProfile(
  userId: number,
  username: string
): Promise<void> {
  const db = getDatabase();
  await db.query(
    "INSERT IGNORE INTO students (userId, username) VALUES (?, ?)",
    [userId, username]
  );
}

/**
 * Check if module already exists for student
 */
export async function moduleExists(
  userId: number,
  moduleCode: string
): Promise<boolean> {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT 1 FROM module_grades WHERE userId = ? AND moduleCode = ?",
    [userId, moduleCode]
  );
  return rows.length > 0;
}

/**
 * Insert module grade and return the result
 */
export async function insertModuleGrade(
  userId: number,
  moduleCode: string,
  creditValue: number,
  grade: string,
  pointValue: number
): Promise<ApiResponse<null>> {
  const db = getDatabase();
  try {
    await db.query(
      "INSERT INTO module_grades (userId, moduleCode, creditValue, grade, pointValue) VALUES (?, ?, ?, ?, ?)",
      [userId, moduleCode, creditValue, grade, pointValue]
    );
    return { success: true, message: "Module committed to DB!" };
  } catch (error) {
    return { success: false, message: "Database insert failed lor", error: String(error) };
  }
}

/**
 * Recalculate weighted GPA and update student record
 */
export async function updateStudentGPA(userId: number): Promise<void> {
  const db = getDatabase();
  
  // 1. Calculate new GPA and count
  const [rows]: any = await db.query(
    "SELECT SUM(creditValue * pointValue) / SUM(creditValue) as newGPA, COUNT(*) as count FROM module_grades WHERE userId = ?",
    [userId]
  );

  const { newGPA, count } = rows[0];

  // 2. Update the students table
  await db.query(
    "UPDATE students SET totalGPA = ?, moduleCount = ? WHERE userId = ?",
    [newGPA || 0, count, userId]
  );
}