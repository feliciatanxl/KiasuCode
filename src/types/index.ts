/**
 * KiasuCode Type Definitions
 * Steady lah, keeping things type-safe across all school clusters!
 */

export interface StudentProfile {
  userId: number;
  username: string;
  activeSchool: string;
  activeYear: string;     
  activeSemester: string; 
  totalGPA: number;
  moduleCount: number;
  prevSchool?: string;    
  prevYear?: string;      
  prevSemester?: string;  
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

export interface GradeScale {
  max: number;
  points: Record<string, number>;
}

/**
 * Grade Scale Architecture
 * The "Mathematical Rules" for each system.
 */
export const GRADING_SCALES: Record<string, GradeScale> = {
  POLY: {
    max: 4.0,
    points: { 
      'DIST': 4.0, 'A': 4.0, 'B+': 3.5, 'B': 3.0, 
      'C+': 2.5, 'C': 2.0, 'D+': 1.5, 'D': 1.0, 
      'F': 0.0, 'P': 0.0 
    }
  },
  ITE: {
    max: 4.0,
    points: { 
      'DIST': 4.0, 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0, 'P': 0.0 
    }
  },
  UNI: {
    max: 5.0,
    points: { 
      'A+': 5.0, 'A': 5.0, 'A-': 4.5, 
      'B+': 4.0, 'B': 3.5, 'B-': 3.0, 
      'C+': 2.5, 'C': 2.0, 
      'D+': 1.5, 'D': 1.0, 'F': 0.0, 'S': 0.0, 'U': 0.0 
    }
  },
  DEFAULT: {
    max: 4.0,
    points: { 'A': 4.0, 'B': 3.0, 'C': 2.0, 'D': 1.0, 'F': 0.0 }
  }
};

export const GRADE_THRESHOLDS: Record<string, number> = {
  'DIST': 80, 'A': 80, 
  'B+': 75,   'B': 70, 
  'C+': 65,   'C': 60, 
  'D+': 55,   'D': 50, 
  'F': 0
};

/**
 * THE SCHOOL RESOLVER
 * Maps specific institutions to their respective grading scales.
 */
export const SCHOOL_RESOLVER: Record<string, string> = {
  // Poly cluster
  'NYP': 'POLY', 'SP': 'POLY', 'NP': 'POLY', 'RP': 'POLY', 'TP': 'POLY',
  // ITE cluster
  'ITE': 'ITE',
  // University cluster (5.0 scale)
  'NTU': 'UNI', 'NUS': 'UNI', 'SIT': 'UNI', 'SUTD': 'UNI', 'SMU': 'UNI'
};

/**
 * Helper: Get the scale for a school name
 */
export function getScaleForSchool(schoolName: string): GradeScale {
  const scaleKey = SCHOOL_RESOLVER[schoolName.toUpperCase()] || 'DEFAULT';
  return GRADING_SCALES[scaleKey] || GRADING_SCALES.DEFAULT;
}

/**
 * Dev-Lingua flavor text pool
 * Expanded with extra Singlish and DevOps flavor!
 */
export const DEV_LINGUA_FLAVORS = {
  positive: [
    "steady lah", "LGTM", "code shiok shiok", "commit accepted", 
    "push accepted", "no merge conflict here", "wah shiok",
    "swee lah", "pipeline passed", "deploy huat ah", "zero warnings bro",
    "production ready sia", "solid code", "champion build"
  ],
  negative: [
    "wah lau", "error lah", "git push rejected", 
    "merge conflict bro", "debug needed", "cannot lah",
    "jialat", "ggwp", "build rabak", "alamak syntax error",
    "siao liao memory leak", "server down lor", "rollback required sia"
  ],
  casual: [
    "chiong ah", "lobang lor", "can can", "no problem lah", "done deal", "ship it",
    "relak one corner", "chin chai deploy", "syncing upstream",
    "agak agak compiling", "kopi break first", "ping pong successful"
  ],
};

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message: string;
}