import { getDatabase } from "./connection";
import {
  StudentProfile,
  ModuleGrade,
  GRADE_POINTS,
  ApiResponse,
} from "../types";

/**
 * Ensures a student profile exists in the DB.
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
 * Check if module already exists for student IN A SPECIFIC BRANCH.
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
    "SELECT 1 FROM module_grades WHERE userId = ? AND moduleCode = ? AND school = ? AND academicYear = ? AND semester = ?",
    [userId, moduleCode.toUpperCase(), school.toUpperCase(), year.toUpperCase(), sem.toUpperCase()]
  );
  return rows.length > 0;
}

/**
 * Insert module grade with Name and School Context
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
 * Retrieve a specific module grade for a student within their active school
 */
export async function getModuleGrade(
  userId: number,
  moduleCode: string
): Promise<ModuleGrade | null> {
  const db = getDatabase();
  
  // Find which school the user is currently in
  const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
  const activeSchool = student[0]?.activeSchool;

  const [rows]: any = await db.query(
    "SELECT * FROM module_grades WHERE userId = ? AND moduleCode = ? AND school = ?",
    [userId, moduleCode.toUpperCase(), activeSchool]
  );
  return rows[0] || null;
}

/**
 * Patch/Edit an existing module record
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
        WHERE userId = ? AND moduleCode = ? AND school = ?`,
      [
        newModuleCode.toUpperCase(), 
        newModuleName,
        newCreditValue, 
        newGrade.toUpperCase(), 
        newPointValue, 
        userId, 
        oldModuleCode.toUpperCase(),
        activeSchool
      ]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Module not found in your current school branch!" };
    }

    await updateStudentGPA(userId);
    return { success: true, message: "Module patched and GPA recalculated!" };
  } catch (error) {
    return { success: false, message: "Patch failed - database conflict lor", error: String(error) };
  }
}

/**
 * Calculate GPA dynamically for a specific school.
 * Excludes 'P' grades from the denominator.
 */
export async function calculateSchoolGPA(userId: number, school: string): Promise<{ gpa: number, credits: number, count: number }> {
  const db = getDatabase();
  
  const [rows]: any = await db.query(
    `SELECT 
        SUM(CASE WHEN UPPER(grade) != 'P' THEN (creditValue * pointValue) ELSE 0 END) as totalPoints,
        SUM(CASE WHEN UPPER(grade) != 'P' THEN creditValue ELSE 0 END) as gradedCredits,
        SUM(creditValue) as totalCredits,
        COUNT(id) as moduleCount
      FROM module_grades 
      WHERE userId = ? AND school = ?`,
    [userId, school.toUpperCase()]
  );

  const stats = rows[0];
  
  if (!stats.gradedCredits || stats.gradedCredits === 0) {
    return { gpa: 0.00, credits: Number(stats.totalCredits) || 0, count: Number(stats.moduleCount) || 0 };
  }

  const calculatedGpa = stats.totalPoints / stats.gradedCredits;
  
  return { 
    gpa: calculatedGpa, 
    credits: Number(stats.totalCredits), 
    count: Number(stats.moduleCount) 
  };
}

/**
 * Syncs the main student profile with the CURRENT active school's stats
 */
export async function updateStudentGPA(userId: number): Promise<void> {
  const db = getDatabase();
  const [student]: any = await db.query("SELECT activeSchool FROM students WHERE userId = ?", [userId]);
  if (!student[0]?.activeSchool) return;

  const stats = await calculateSchoolGPA(userId, student[0].activeSchool);

  await db.query(
    "UPDATE students SET totalGPA = ?, moduleCount = ? WHERE userId = ?",
    [stats.gpa, stats.count, userId]
  );
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
 * Remove a module within the active branch context
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
      "DELETE FROM module_grades WHERE userId = ? AND moduleCode = ? AND school = ?",
      [userId, moduleCode.toUpperCase(), activeSchool]
    );

    if (result.affectedRows === 0) {
      return { success: false, message: "Module not found in your current active school!" };
    }

    await updateStudentGPA(userId);
    return { success: true, message: "Module removed!" };
  } catch (error) {
    return { success: false, message: "Remove failed lor", error: String(error) };
  }
}

/**
 * Fetch history with dynamic drilling: School -> Year -> Sem
 * If no filters are provided, it returns the entire global history.
 */
export async function getStudentHistory(
  userId: number, 
  school?: string, 
  year?: string, 
  sem?: string
): Promise<ModuleGrade[]> {
  const db = getDatabase();
  
  let sql = "SELECT * FROM module_grades WHERE userId = ?";
  const params: any[] = [userId];

  if (school) {
    sql += " AND school = ?";
    params.push(school.toUpperCase());
  }
  if (year) {
    sql += " AND academicYear = ?";
    params.push(year.toUpperCase());
  }
  if (sem) {
    sql += " AND semester = ?";
    params.push(sem.toUpperCase());
  }

  // Final sort: Group by school, then newest years and semesters first
  sql += " ORDER BY school ASC, academicYear DESC, semester DESC, committedAt DESC";
  
  const [rows]: any = await db.query(sql, params);
  return rows;
}