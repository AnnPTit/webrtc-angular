// ═══════════════════════════════════════════
// Course Learning Models — Video + Quiz per Lesson
// ═══════════════════════════════════════════

export type LessonStatus = 'not-started' | 'in-progress' | 'completed';

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
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
}
