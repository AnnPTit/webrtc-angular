import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// ── Request / Response DTOs ──────────────────────────────────────

export interface CreateAssignmentRequest {
  lessonId: number;
  title: string;
  description?: string;
}

export interface UpdateQuestionRequest {
  question: string;
  correctAnswer: string;
  options: { [key: string]: string };
}

export interface QuestionDTO {
  questionId?: number;
  question: string;
  options: { [key: string]: string };
  answer: string;
}

export interface AssignmentResponse {
  id: number;
  lessonId: number;
  title: string;
  description: string;
  statusProgress: string;
  errorMessage: string;
  createdAt: string;
  questions: QuestionDTO[];
}

export interface ApiResponse<T> {
  message: string;
  data: T;
}

// ── Service ──────────────────────────────────────────────────────

@Injectable({ providedIn: 'root' })
export class AssignmentService {
  private readonly API_URL = `${environment.apiBaseUrl}${environment.apiEndpoints.assignments}`;

  constructor(private http: HttpClient) {}

  /**
   * POST /api/assignments
   * Create a new assignment — synchronously processes video transcription + AI.
   * This call may take 1-5 minutes.
   */
  createAssignment(request: CreateAssignmentRequest): Observable<ApiResponse<AssignmentResponse>> {
    return this.http.post<ApiResponse<AssignmentResponse>>(this.API_URL, request);
  }

  /**
   * GET /api/assignments/{id}
   * Retrieve a single assignment with questions and options.
   */
  getAssignmentById(id: number): Observable<ApiResponse<AssignmentResponse>> {
    return this.http.get<ApiResponse<AssignmentResponse>>(`${this.API_URL}/${id}`);
  }

  /**
   * GET /api/assignments/by-lesson/{lessonId}
   * Retrieve all assignments for a lesson.
   */
  getAssignmentsByLessonId(lessonId: number): Observable<ApiResponse<AssignmentResponse[]>> {
    return this.http.get<ApiResponse<AssignmentResponse[]>>(`${this.API_URL}/by-lesson/${lessonId}`);
  }

  /**
   * PUT /api/assignments/{assignmentId}/questions/{questionId}
   * Update a question's text, correct answer, and options.
   */
  updateQuestion(
    assignmentId: number,
    questionId: number,
    data: UpdateQuestionRequest,
  ): Observable<ApiResponse<QuestionDTO>> {
    return this.http.put<ApiResponse<QuestionDTO>>(
      `${this.API_URL}/${assignmentId}/questions/${questionId}`,
      data,
    );
  }

  /**
   * DELETE /api/assignments/{assignmentId}/questions/{questionId}
   * Delete a question and its options.
   */
  deleteQuestion(assignmentId: number, questionId: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(
      `${this.API_URL}/${assignmentId}/questions/${questionId}`,
    );
  }
}
