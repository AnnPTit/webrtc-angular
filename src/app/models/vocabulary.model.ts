// ═══════════════════════════════════════════
//  API Response Wrapper
// ═══════════════════════════════════════════

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

// ═══════════════════════════════════════════
//  Vocabulary Word
// ═══════════════════════════════════════════

export interface VocabularyWord {
  id: number;
  word: string;
  ipa: string;
  wordType: string;
  meaningVi: string;
  meaningEn: string;
  exampleSentence: string;
  exampleVi: string;
  topic: string;
  level: string;
  createdAt: string;

  // User progress
  learned: boolean;
  favorite: boolean;
  needReview: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
}

// ═══════════════════════════════════════════
//  Vocabulary Stats
// ═══════════════════════════════════════════

export interface VocabularyStats {
  userId: number;
  totalWordsLearned: number;
  totalFavorites: number;
  totalNeedReview: number;
  totalWordsStudied: number;
  topicBreakdown: { [topic: string]: number };
}

// ═══════════════════════════════════════════
//  Request DTOs
// ═══════════════════════════════════════════

export interface GenerateVocabularyRequest {
  topic: string;
  level: string;
  quantity: number;
  userId: number;
}

export interface UpdateProgressRequest {
  userId: number;
  vocabularyId: number;
  learnedFlag?: boolean;
  favoriteFlag?: boolean;
  needReviewFlag?: boolean;
}

// ═══════════════════════════════════════════
//  UI Helper Types
// ═══════════════════════════════════════════

export interface LevelOption {
  label: string;
  value: string;
}

export interface QuizQuestion {
  word: VocabularyWord;
  options: string[];
  correctAnswer: string;
  type: 'multiple-choice' | 'fill-blank' | 'flashcard';
}

export const LEVELS: LevelOption[] = [
  { label: 'A1 — Beginner', value: 'A1' },
  { label: 'A2 — Elementary', value: 'A2' },
  { label: 'B1 — Intermediate', value: 'B1' },
  { label: 'B2 — Upper Intermediate', value: 'B2' },
  { label: 'C1 — Advanced', value: 'C1' },
  { label: 'C2 — Proficiency', value: 'C2' },
];

export const QUANTITIES: number[] = [5, 10, 15, 20];

// ═══════════════════════════════════════════
//  Daily History & Goal Types
// ═══════════════════════════════════════════

export interface DailySession {
  date: string;                // YYYY-MM-DD
  displayDate: string;         // Formatted for UI
  words: VocabularyWord[];
  totalWords: number;
  learnedWords: number;
  completionPercent: number;
  goalMet: boolean;
}

export interface DailyGoal {
  wordsPerDay: number;
  streakDays: number;
  lastActiveDate: string;      // YYYY-MM-DD
  history: { [date: string]: number }; // date -> learned count
}

export interface WeeklyStats {
  weekLabel: string;
  wordsCreated: number;
  wordsLearned: number;
  goalCompletionRate: number;
}

export const DEFAULT_DAILY_GOAL: DailyGoal = {
  wordsPerDay: 10,
  streakDays: 0,
  lastActiveDate: '',
  history: {},
};
