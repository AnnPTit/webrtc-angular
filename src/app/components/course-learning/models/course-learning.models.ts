// ═══════════════════════════════════════════
// Course Learning Models — Video + Quiz per Lesson
// ═══════════════════════════════════════════

export type LessonStatus = 'not-started' | 'in-progress' | 'completed';

export interface QuizQuestion {
  id: number;
  dbId?: number;           // Database ID of the question (for API submission)
  question: string;
  options: string[];
  optionKeys?: string[];   // Original keys (A, B, C, D) to map back when submitting
  correctAnswer: number;
  explanation: string;
  // Runtime state
  selectedAnswer?: number;
  isAnswered?: boolean;
}

export interface LessonData {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  videoDescription: string;
  duration: string;
  status: LessonStatus;
  quiz: QuizQuestion[];
  assignmentId?: number;   // Assignment ID for quiz submission
}

export interface CourseInfo {
  id: number;
  title: string;
  description: string;
}

export interface SidebarLesson {
  id: number;
  title: string;
  status: LessonStatus;
  duration: string;
  locked: boolean;
}
