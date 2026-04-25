/**
 * KiasuCode Type Definitions
 * Steady lah, all the types to keep things type-safe!
 */

/**
 * Student profile structure - store student info in DB
 * LGTM types, no merge conflict here
 */
export interface StudentProfile {
  userId: number;
  username: string;
  totalGPA: number;
  moduleCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Module grade entry - each module + grade combination
 * Commit this to the database lor
 */
export interface ModuleGrade {
  id: number;
  userId: number;
  moduleCode: string;
  creditValue: number; // e.g., 4 for 4-credit modules
  grade: string; // A, B+, B, C+, C, D+, D, F
  pointValue: number; // Calculated from grade (A=4.0, B+=3.5, etc.)
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
 * Wah lau, must convert grades to points lor
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
};

/**
 * Dev-Lingua flavor text pool
 * Inject these randomly into bot responses (middleware handles this!)
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
 * All responses follow this structure, production-ready style
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}
