/**
 * KiasuCode Type Definitions
 * Steady lah, all the types to keep things type-safe!
 */

/**
 * Student profile structure - store student info in DB
 * LGTM types, now with Active Branch support
 */
export interface StudentProfile {
  userId: number;
  username: string;
  totalGPA: number;
  moduleCount: number;
  activeSchool?: string; // e.g., NYP, SP, NP
  activeYear?: string;   // e.g., Y1, Y2
  activeSem?: string;    // e.g., S1, S2
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Module grade entry - each module + grade combination
 * Now enriched with Name and School context for the multi-tenant architecture
 */
export interface ModuleGrade {
  id: number;
  userId: number;
  moduleCode: string;
  moduleName: string;   // NEW: For human-readable titles!
  creditValue: number;  // e.g., 4 for 4-credit modules
  grade: string;        // A, B+, B, C+, C, D+, D, F, DIST, P
  pointValue: number;   // Calculated from grade (A=4.0, B+=3.5, etc.)
  school: string;       // Tagging the institution
  academicYear: string; // Tagging the year
  semester: string;     // Tagging the semester
  committedAt: Date;
}

/**
 * Command context - passed to command handlers
 * Everything we need for the command execution pipeline
 */
export interface CommandContext {
  userId: number;
  username: string;
  args: string[];
  rawText: string;
}

/**
 * Grade to point mapping (Singapore system)
 * Added 'P' for those elective modules that don't affect GPA math
 */
export const GRADE_POINTS: Record<string, number> = {
  DIST: 4.0, 
  A: 4.0,
  "B+": 3.5,
  B: 3.0,
  "C+": 2.5,
  C: 2.0,
  "D+": 1.5,
  D: 1.0,
  F: 0.0,
  P: 0.0, // Pass modules: 0 points, but excluded from divisor in queries.ts
};

/**
 * Dev-Lingua flavor text pool
 */
export const DEV_LINGUA_FLAVORS = {
  positive: [
    "steady lah",
    "LGTM",
    "code shiok shiok",
    "commit accepted",
    "push accepted",
    "no merge conflict here",
    "wah shiok",
  ],
  negative: [
    "wah lau",
    "error lah",
    "git push rejected",
    "merge conflict bro",
    "debug needed",
    "cannot lah",
  ],
  casual: [
    "chiong ah",
    "lobang lor",
    "can can",
    "no problem lah",
    "done deal",
    "ship it",
  ],
};

/**
 * API Response wrapper - consistent response format
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}