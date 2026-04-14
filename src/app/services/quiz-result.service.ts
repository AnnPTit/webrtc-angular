import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

// ===== Response Wrapper =====
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

// ===== Quiz Result =====
export interface QuizResultResponse {
  id: number;
  userId: number;
  assignmentId: number;
  assignmentTitle: string;
  totalQuestions: number;
  correctCount: number;
  wrongCount: number;
  score: number;          // 0 - 100
  durationSeconds: number | null;
  completedAt: string;    // ISO 8601
  answerDetails: AnswerDetailResponse[];
}

export interface AnswerDetailResponse {
  questionId: number;
  questionText: string;
  selectedAnswer: string | null;  // null nếu bỏ qua
  correctAnswer: string;
  isCorrect: boolean;
}

// ===== Submit Request =====
export interface SubmitQuizRequest {
  userId: number;
  assignmentId: number;
  durationSeconds?: number;
  answers: AnswerItem[];
}

export interface AnswerItem {
  questionId: number;
  selectedAnswer: string | null;  // "A" | "B" | "C" | "D" | null
}

// ===== User Stats =====
export interface UserStatsResponse {
  userId: number;
  username: string;
  totalAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  progressHistory: ProgressPoint[];
}

export interface ProgressPoint {
  resultId: number;
  assignmentId: number;
  assignmentTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;  // ISO 8601
}

// ===== Assignment Stats =====
export interface AssignmentStatsResponse {
  assignmentId: number;
  assignmentTitle: string;
  totalAttempts: number;
  averageScore: number | null;
  questionAccuracies: QuestionAccuracy[];
}

export interface QuestionAccuracy {
  questionId: number;
  questionText: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;  // 0 - 100
}

// ===== Service =====
@Injectable({ providedIn: 'root' })
export class QuizResultService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.quizResults}`;

  constructor(private http: HttpClient) {}

  /** 1. Nộp bài trắc nghiệm */
  submitQuiz(request: SubmitQuizRequest): Observable<QuizResultResponse> {
    return this.http.post<ApiResponse<QuizResultResponse>>(this.baseUrl, request)
      .pipe(map(res => res.data));
  }

  /** 2. Xem kết quả theo ID */
  getResultById(id: number): Observable<QuizResultResponse> {
    return this.http.get<ApiResponse<QuizResultResponse>>(`${this.baseUrl}/${id}`)
      .pipe(map(res => res.data));
  }

  /** 3. Lịch sử làm bài */
  getHistory(userId: number, assignmentId: number): Observable<QuizResultResponse[]> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('assignmentId', assignmentId);
    return this.http.get<ApiResponse<QuizResultResponse[]>>(`${this.baseUrl}/history`, { params })
      .pipe(map(res => res.data));
  }

  /** 4. Kết quả gần nhất */
  getLatestResult(userId: number): Observable<QuizResultResponse> {
    const params = new HttpParams().set('userId', userId);
    return this.http.get<ApiResponse<QuizResultResponse>>(`${this.baseUrl}/latest`, { params })
      .pipe(map(res => res.data));
  }

  /** 5. Kết quả gần nhất cho bài cụ thể */
  getLatestForAssignment(userId: number, assignmentId: number): Observable<QuizResultResponse> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('assignmentId', assignmentId);
    return this.http.get<ApiResponse<QuizResultResponse>>(`${this.baseUrl}/latest-for-assignment`, { params })
      .pipe(map(res => res.data));
  }

  /** 6. Thống kê user */
  getUserStats(userId: number): Observable<UserStatsResponse> {
    return this.http.get<ApiResponse<UserStatsResponse>>(`${this.baseUrl}/stats/user/${userId}`)
      .pipe(map(res => res.data));
  }

  /** 7. Thống kê bài tập */
  getAssignmentStats(assignmentId: number): Observable<AssignmentStatsResponse> {
    return this.http.get<ApiResponse<AssignmentStatsResponse>>(`${this.baseUrl}/stats/assignment/${assignmentId}`)
      .pipe(map(res => res.data));
  }

  /** 8. Tiến bộ theo khoảng thời gian */
  getUserProgress(userId: number, from: string, to: string): Observable<QuizResultResponse[]> {
    const params = new HttpParams()
      .set('userId', userId)
      .set('from', from)
      .set('to', to);
    return this.http.get<ApiResponse<QuizResultResponse[]>>(`${this.baseUrl}/progress`, { params })
      .pipe(map(res => res.data));
  }

  /** 9. Tất cả kết quả của bài tập */
  getResultsByAssignment(assignmentId: number): Observable<QuizResultResponse[]> {
    return this.http.get<ApiResponse<QuizResultResponse[]>>(`${this.baseUrl}/by-assignment/${assignmentId}`)
      .pipe(map(res => res.data));
  }
}
