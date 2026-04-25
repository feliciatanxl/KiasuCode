/**
 * Database Queries Module
 * Placeholder for SQLite operations - steady lah, fill these in next!
 * These functions handle all direct database interactions
 * Synchronous patterns: better-sqlite3 uses sync API
 */

import { getDatabase } from "./connection";
import {
  StudentProfile,
  ModuleGrade,
  GRADE_POINTS,
  ApiResponse,
} from "../types";

/**
 * TODO: Create student profile
 * Called when user starts using the bot with /start command
 * Creates new row in students table
 *
 * @param userId - Telegram user ID
 * @param username - Telegram username
 * @returns ApiResponse<StudentProfile>
 *
 * SQL: INSERT INTO students (userId, username, totalGPA, moduleCount)
 *      VALUES (?, ?, 0.0, 0)
 */
export function createStudentProfile(
  userId: number,
  username: string
): ApiResponse<StudentProfile> {
  // TODO: Implement
  throw new Error("Not implemented - chiong this next!");
}

/**
 * TODO: Insert module grade
 * This is called by /commit command
 * Adds a new module grade to the student's transcript
 *
 * @param userId - Telegram user ID
 * @param moduleCode - Module code (e.g., "IT101")
 * @param creditValue - Credits for this module (1-4)
 * @param grade - Letter grade (A, B+, B, C+, C, D+, D, F)
 * @param pointValue - Numeric point value from GRADE_POINTS
 * @returns ApiResponse<ModuleGrade>
 *
 * SQL: INSERT INTO module_grades (userId, moduleCode, creditValue, grade, pointValue)
 *      VALUES (?, ?, ?, ?, ?)
 *
 * Notes:
 * - Use GRADE_POINTS lookup to convert grade to pointValue
 * - committedAt timestamp captures when grade was added
 * - Include validation to prevent duplicate module codes for same user
 */
export function insertModuleGrade(
  userId: number,
  moduleCode: string,
  creditValue: number,
  grade: string,
  pointValue: number
): ApiResponse<ModuleGrade> {
  // TODO: Implement
  throw new Error("Not implemented - wah lau, need this function lor!");
}

/**
 * TODO: Update student GPA
 * Called after inserting a new module grade
 * Recalculates weighted GPA and updates student record
 *
 * @param userId - Telegram user ID
 * @returns ApiResponse<StudentProfile>
 *
 * Algorithm:
 * 1. Query all grades for this student: SELECT * FROM module_grades WHERE userId = ?
 * 2. Calculate GPA: sum(creditValue * pointValue) / sum(creditValue)
 * 3. Count modules: COUNT(*) FROM module_grades
 * 4. Update student record: UPDATE students SET totalGPA = ?, moduleCount = ? WHERE userId = ?
 *
 * Example:
 * - Module 1: 4 credits, Grade A (4.0 points) = 4 * 4.0 = 16
 * - Module 2: 3 credits, Grade B+ (3.5 points) = 3 * 3.5 = 10.5
 * - Total: (16 + 10.5) / (4 + 3) = 26.5 / 7 = 3.79 GPA
 */
export function updateStudentGPA(
  userId: number
): ApiResponse<StudentProfile> {
  // TODO: Implement
  throw new Error(
    "Not implemented - must recalculate GPA, steady lah commit this!"
  );
}

/**
 * TODO: Get student profile
 * Retrieve student's current GPA and module count
 * Used by /gpa command
 *
 * @param userId - Telegram user ID
 * @returns ApiResponse<StudentProfile>
 *
 * SQL: SELECT * FROM students WHERE userId = ?
 */
export function getStudentProfile(
  userId: number
): ApiResponse<StudentProfile> {
  // TODO: Implement
  throw new Error("Not implemented - need this for /gpa command!");
}

/**
 * TODO: Get all modules for student
 * Used by /history command to show all committed modules
 *
 * @param userId - Telegram user ID
 * @returns ApiResponse<ModuleGrade[]>
 *
 * SQL: SELECT * FROM module_grades WHERE userId = ? ORDER BY committedAt DESC
 */
export function getStudentModules(
  userId: number
): ApiResponse<ModuleGrade[]> {
  // TODO: Implement
  throw new Error("Not implemented - need this for /history command!");
}

/**
 * TODO: Check if module already exists for student
 * Prevent duplicate module entries - keep data clean lor
 *
 * @param userId - Telegram user ID
 * @param moduleCode - Module code
 * @returns boolean - true if exists, false otherwise
 *
 * SQL: SELECT COUNT(*) FROM module_grades WHERE userId = ? AND moduleCode = ?
 */
export function moduleExists(
  userId: number,
  moduleCode: string
): boolean {
  // TODO: Implement
  throw new Error(
    "Not implemented - need duplicate check for /commit command!"
  );
}

export default {
  createStudentProfile,
  insertModuleGrade,
  updateStudentGPA,
  getStudentProfile,
  getStudentModules,
  moduleExists,
};
