import { getDatabase } from "./connection";
import {
  StudentProfile,
  ModuleGrade,
  ApiResponse,
} from "../types";

/**
 * Ensures a student profile exists in the DB.
 */
export async function ensureStudentProfile(
  userId: number,
  rawUsername?: string,
  firstName?: string
): Promise<void> {
  const db = getDatabase();
  const dbUsername = rawUsername || firstName || "Student";
  await db.query(
    "INSERT INTO students (userId, username) VALUES (?, ?) ON DUPLICATE KEY UPDATE username = ?",
    [userId, dbUsername, dbUsername]
  );
}

/**
 * Check if module already exists (and is ACTIVE) in a specific branch.
 */
export async function moduleExists(
  userId: number,
  moduleCode: string,
  school: string,
  year: string,
  sem: string
): Promise<boolean> {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT 1 FROM module_grades WHERE userId = ? AND moduleCode = ? AND school = ? AND academicYear = ? AND semester = ? AND deletedAt IS NULL",
    [userId, moduleCode.toUpperCase(), school.toUpperCase(), year.toUpperCase(), sem.toUpperCase()]
  );
  return rows.length > 0;
}

/**
 * Insert module grade
 */
export async function insertModuleGrade(
  userId: number,
  moduleCode: string,
  moduleName: string,
  creditValue: number,
  grade: string,
  pointValue: number,
  school: string,
  year: string,
  sem: string
): Promise<ApiResponse<null>> {
  const db = getDatabase();
  try {
    await db.query(
      `INSERT INTO module_grades 
        (userId, moduleCode, moduleName, creditValue, grade, pointValue, school, academicYear, semester) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, moduleCode.toUpperCase(), moduleName, creditValue, grade.toUpperCase(), pointValue, school.toUpperCase(), year.toUpperCase(), sem.toUpperCase()]
    );
    return { success: true, message: "Module committed to branch!" };
  } catch (error) {
    return { success: false, message: "Database insert failed lor", error: String(error) };
  }
}

/**
 * Retrieve an ACTIVE specific module grade
 */
export async function getModuleGrade(
  userId: number,
  moduleCode: string
): Promise<ModuleGrade | null> {
  const db = getDatabase();
  const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
  const activeSchool = student[0]?.activeSchool;

  const [rows]: any = await db.query(
    "SELECT * FROM module_grades WHERE userId = ? AND moduleCode = ? AND school = ? AND deletedAt IS NULL",
    [userId, moduleCode.toUpperCase(), activeSchool]
  );
  return rows[0] || null;
}

/**
 * Patch/Edit an ACTIVE module record
 */
export async function patchModuleGrade(
  userId: number,
  oldModuleCode: string,
  newModuleCode: string,
  newModuleName: string, 
  newCreditValue: number,
  newGrade: string,
  newPointValue: number
): Promise<ApiResponse<null>> {
  const db = getDatabase();
  try {
    const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
    const activeSchool = student[0]?.activeSchool;

    const [result]: any = await db.query(
      `UPDATE module_grades 
        SET moduleCode = ?, moduleName = ?, creditValue = ?, grade = ?, pointValue = ? 
        WHERE userId = ? AND moduleCode = ? AND school = ? AND deletedAt IS NULL`,
      [newModuleCode.toUpperCase(), newModuleName, newCreditValue, newGrade.toUpperCase(), newPointValue, userId, oldModuleCode.toUpperCase(), activeSchool]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Module not found in your current school branch!" };
    }

    await updateStudentGPA(userId);
    return { success: true, message: "Module patched!" };
  } catch (error) {
    return { success: false, message: "Patch failed lor", error: String(error) };
  }
}

/**
 * Calculate GPA (Excluding deleted modules)
 */
export async function calculateSchoolGPA(userId: number, school: string): Promise<{ gpa: number, credits: number, count: number }> {
  const db = getDatabase();
  const [rows]: any = await db.query(
    `SELECT 
        SUM(CASE WHEN UPPER(grade) NOT IN ('P', 'S', 'U') THEN (creditValue * pointValue) ELSE 0 END) as totalPoints,
        SUM(CASE WHEN UPPER(grade) NOT IN ('P', 'S', 'U') THEN creditValue ELSE 0 END) as gradedCredits,
        SUM(creditValue) as totalCredits,
        COUNT(id) as moduleCount
      FROM module_grades 
      WHERE userId = ? AND school = ? AND deletedAt IS NULL`,
    [userId, school.toUpperCase()]
  );

  const stats = rows[0];
  if (!stats.gradedCredits || stats.gradedCredits === 0) {
    return { gpa: 0.00, credits: Number(stats.totalCredits) || 0, count: Number(stats.moduleCount) || 0 };
  }
  return { gpa: stats.totalPoints / stats.gradedCredits, credits: Number(stats.totalCredits), count: Number(stats.moduleCount) };
}

/**
 * Syncs the main student profile
 */
export async function updateStudentGPA(userId: number): Promise<void> {
  const db = getDatabase();
  const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
  if (!student[0]?.activeSchool) return;
  const stats = await calculateSchoolGPA(userId, student[0].activeSchool);
  await db.query("UPDATE students SET totalGPA = ?, moduleCount = ? WHERE userId = ?", [stats.gpa, stats.count, userId]);
}

/**
 * Retrieve student's current profile
 */
export async function getStudentProfile(userId: number): Promise<StudentProfile | null> {
  const db = getDatabase();
  const [rows]: any = await db.query("SELECT * FROM students WHERE userId = ?", [userId]);
  return rows[0] || null;
}

/**
 * SOFT DELETE: Mark module as dropped without deleting it from DB.
 */
export async function removeModuleGrade(
  userId: number,
  moduleCode: string
): Promise<ApiResponse<null>> {
  const db = getDatabase();
  try {
    const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
    const activeSchool = student[0]?.activeSchool;

    const [result]: any = await db.query(
      "UPDATE module_grades SET deletedAt = CURRENT_TIMESTAMP WHERE userId = ? AND moduleCode = ? AND school = ? AND deletedAt IS NULL",
      [userId, moduleCode.toUpperCase(), activeSchool]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Module not found in your current active school!" };
    }

    await updateStudentGPA(userId);
    return { success: true, message: "Module moved to Recycle Bin!" };
  } catch (error) {
    return { success: false, message: "Remove failed lor", error: String(error) };
  }
}

/**
 * RESTORE: Bring back the most recently soft-deleted module.
 */
export async function restoreModuleGrade(userId: number): Promise<ApiResponse<string>> {
  const db = getDatabase();
  try {
    const [rows]: any = await db.query(
      "SELECT moduleCode FROM module_grades WHERE userId = ? AND deletedAt IS NOT NULL ORDER BY deletedAt DESC LIMIT 1",
      [userId]
    );

    if (rows.length === 0) {
      return { success: false, message: "Recycle Bin is empty!" };
    }

    const moduleCode = rows[0].moduleCode;
    await db.query(
      "UPDATE module_grades SET deletedAt = NULL WHERE userId = ? AND moduleCode = ? ORDER BY deletedAt DESC LIMIT 1",
      [userId, moduleCode]
    );

    return { success: true, message: moduleCode };
  } catch (error) {
    return { success: false, message: "Restore failed lor", error: String(error) };
  }
}

/**
 * Fetch history (Excluding deleted modules)
 */
export async function getStudentHistory(
  userId: number, 
  school?: string, 
  year?: string, 
  sem?: string
): Promise<ModuleGrade[]> {
  const db = getDatabase();
  let sql = "SELECT * FROM module_grades WHERE userId = ? AND deletedAt IS NULL";
  const params: any[] = [userId];

  if (school) { sql += " AND school = ?"; params.push(school.toUpperCase()); }
  if (year) { sql += " AND academicYear = ?"; params.push(year.toUpperCase()); }
  if (sem) { sql += " AND semester = ?"; params.push(sem.toUpperCase()); }

  sql += " ORDER BY school ASC, academicYear DESC, semester DESC";
  const [rows]: any = await db.query(sql, params);
  return rows;
}

/**
 * Updates the student's current branch while saving history.
 */
export async function updateStudentBranch(userId: number, school: string, year: string, sem: string): Promise<void> {
  const db = getDatabase();
  await db.query(
    `UPDATE students SET prevSchool = activeSchool, prevYear = activeYear, prevSemester = activeSemester,
      activeSchool = ?, activeYear = ?, activeSemester = ? WHERE userId = ?`,
    [school.toUpperCase(), year.toUpperCase(), sem.toUpperCase(), userId]
  );
}

/**
 * Swaps current branch with the previous one.
 */
export async function revertStudentBranch(userId: number): Promise<void> {
  const db = getDatabase();
  await db.query(
    `UPDATE students SET activeSchool = (@tempS := activeSchool), activeSchool = prevSchool, prevSchool = @tempS,
      activeYear = (@tempY := activeYear), activeYear = prevYear, prevYear = @tempY,
      activeSemester = (@tempSem := activeSemester), activeSemester = prevSemester, prevSemester = @tempSem
     WHERE userId = ? AND prevSchool IS NOT NULL`,
    [userId]
  );
}

/**
 * Saves a module component (Quiz/Project) to the DB
 */
export async function addModuleComponent(
  userId: number,
  moduleCode: string,
  name: string,
  points: number,
  weight: number
): Promise<void> {
  const db = getDatabase();
  await db.query(
    "INSERT INTO module_components (userId, moduleCode, componentName, pointsContributed, weightage) VALUES (?, ?, ?, ?, ?)",
    [userId, moduleCode.toUpperCase(), name, points, weight]
  );
}

/**
 * Calculates the total points secured so far for a specific module
 */
export async function getModuleProgress(userId: number, moduleCode: string) {
  const db = getDatabase();
  const [rows]: any = await db.query(
    "SELECT SUM(pointsContributed) as totalPoints, SUM(weightage) as totalWeight FROM module_components WHERE userId = ? AND moduleCode = ?",
    [userId, moduleCode.toUpperCase()]
  );
  return {
    securedPoints: rows[0].totalPoints || 0,
    totalWeightUsed: rows[0].totalWeight || 0
  };
}

/**
 * Deletes the most recent component added for a module (Undo)
 */
export async function undoModuleComponent(userId: number, moduleCode: string): Promise<boolean> {
  const db = getDatabase();
  const [result]: any = await db.query(
    "DELETE FROM module_components WHERE userId = ? AND moduleCode = ? ORDER BY createdAt DESC LIMIT 1",
    [userId, moduleCode.toUpperCase()]
  );
  return result.affectedRows > 0;
}

/**
 * Wipes all components for a specific module (Nuclear Reset)
 */
export async function resetModuleComponents(userId: number, moduleCode?: string): Promise<void> {
  const db = getDatabase();
  if (moduleCode) {
    // Target reset: Only wipe one module
    await db.query(
      "DELETE FROM module_components WHERE userId = ? AND moduleCode = ?",
      [userId, moduleCode.toUpperCase()]
    );
  } else {
    // Global reset: Wipe all simulation data for the user
    await db.query(
      "DELETE FROM module_components WHERE userId = ?",
      [userId]
    );
  }
}