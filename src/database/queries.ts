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

/**
 * Retrieve student's current GPA and module count
 */
export async function getStudentProfile(userId: number): Promise<StudentProfile | null> {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT * FROM students WHERE userId = ?",
    [userId]
  );
  return rows[0] || null;
}

/**
 * Remove a specific module grade and recalculate GPA
 * Steady lah, clean up the repo!
 */
export async function removeModuleGrade(
  userId: number,
  moduleCode: string
): Promise<ApiResponse<null>> {
  const db = getDatabase();
  try {
    const [result]: any = await db.query(
      "DELETE FROM module_grades WHERE userId = ? AND moduleCode = ?",
      [userId, moduleCode.toUpperCase()]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Module not found in your repo lor!" };
    }

    // Recalculate GPA after removal
    await updateStudentGPA(userId);
    
    return { success: true, message: "Module removed and GPA updated!" };
  } catch (error) {
    return { success: false, message: "Remove failed lor", error: String(error) };
  }
}

/**
 * Retrieve a specific module grade for a student
 */
export async function getModuleGrade(
  userId: number,
  moduleCode: string
): Promise<ModuleGrade | null> {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT * FROM module_grades WHERE userId = ? AND moduleCode = ?",
    [userId, moduleCode.toUpperCase()]
  );
  return rows[0] || null;
}

/**
 * Patch/Edit an existing module record
 * Updates specific fields while keeping the build stable
 */
export async function patchModuleGrade(
  userId: number,
  oldModuleCode: string,
  newModuleCode: string,
  newCreditValue: number,
  newGrade: string,
  newPointValue: number
): Promise<ApiResponse<null>> {
  const db = getDatabase();
  try {
    const [result]: any = await db.query(
      `UPDATE module_grades 
       SET moduleCode = ?, creditValue = ?, grade = ?, pointValue = ? 
       WHERE userId = ? AND moduleCode = ?`,
      [
        newModuleCode.toUpperCase(), 
        newCreditValue, 
        newGrade.toUpperCase(), 
        newPointValue, 
        userId, 
        oldModuleCode.toUpperCase()
      ]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Module not found in your repo lor!" };
    }

    await updateStudentGPA(userId);
    return { success: true, message: "Module patched and GPA recalculated!" };
  } catch (error) {
    return { success: false, message: "Patch failed - database conflict lor", error: String(error) };
  }
}

/**
 * Fetch the full commit history (all modules) for a student
 * Returns an array of module grades sorted by newest first
 */
export async function getStudentHistory(userId: number): Promise<ModuleGrade[]> {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT * FROM module_grades WHERE userId = ? ORDER BY committedAt DESC",
    [userId]
  );
  return rows;
}