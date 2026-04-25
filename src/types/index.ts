/**
 * KiasuCode Type Definitions
 * Steady lah, keeping things type-safe across all school clusters!
 */

export interface StudentProfile {
  userId: number;
  username: string;
  totalGPA: number;
  moduleCount: number;
  activeSchool?: string; // e.g., NYP, ITE, NUS
  activeYear?: string; 
  activeSem?: string; 
  createdAt: Date;
  updatedAt: Date;
}

export interface ModuleGrade {
  id: number;
  userId: number;
  moduleCode: string;
  moduleName: string;
  creditValue: number;
  grade: string;
  pointValue: number;
  school: string;
  academicYear: string;
  semester: string;
  committedAt: Date;
}

export interface CommandContext {
  userId: number;
  username: string;
  args: string[];
  rawText: string;
}

/**
 * NEW: Grade Scale Architecture
 * We define the max GPA and the specific points for each institution type.
 */
export interface GradeScale {
  max: number;
  points: Record<string, number>;
}

export const GRADING_SCALES: Record<string, GradeScale> = {
  // Poly System (4.0 Scale)
  POLY: {
    max: 4.0,
    points: { 
      'DIST': 4.0, 'A': 4.0, 'B+': 3.5, 'B': 3.0, 
      'C+': 2.5, 'C': 2.0, 'D+': 1.5, 'D': 1.0, 
      'F': 0.0, 'P': 0.0 
    }
  },
  // ITE System (4.0 Scale)
  ITE: {
    max: 4.0,
    points: { 
      'DIST': 4.0, 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0, 'P': 0.0 
    }
  },
  // Local University System (5.0 Scale - NUS/NTU/SIT)
  UNI: {
    max: 5.0,
    points: { 
      'A+': 5.0, 'A': 5.0, 'A-': 4.5, 
      'B+': 4.0, 'B': 3.5, 'B-': 3.0, 
      'C+': 2.5, 'C': 2.0, 
      'D+': 1.5, 'D': 1.0, 'F': 0.0, 'S': 0.0, 'U': 0.0 
    }
  },
  // Fallback for unknown institutions
  DEFAULT: {
    max: 4.0,
    points: { 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0 }
  }
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

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}