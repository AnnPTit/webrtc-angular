# 📘 API Documentation – Quiz Result (Lưu trữ & Thống kê Kết quả Trắc nghiệm)

> **Base URL:** `http://localhost:8080/api/quiz-results`
> **Content-Type:** `application/json`

---

## Mục lục

1. [Nộp bài trắc nghiệm](#1-nộp-bài-trắc-nghiệm)
2. [Xem kết quả theo ID](#2-xem-kết-quả-theo-id)
3. [Lịch sử làm bài](#3-lịch-sử-làm-bài)
4. [Kết quả gần nhất (tổng)](#4-kết-quả-gần-nhất-tổng)
5. [Kết quả gần nhất cho bài cụ thể](#5-kết-quả-gần-nhất-cho-bài-cụ-thể)
6. [Thống kê người dùng](#6-thống-kê-người-dùng)
7. [Thống kê bài tập](#7-thống-kê-bài-tập)
8. [Tiến bộ theo thời gian](#8-tiến-bộ-theo-thời-gian)
9. [Tất cả kết quả của bài tập](#9-tất-cả-kết-quả-của-bài-tập)

---

## Response Wrapper

Tất cả API đều trả về cùng cấu trúc wrapper:

```json
{
  "success": true,
  "message": "string hoặc null",
  "data": { ... },
  "timestamp": "2026-04-14T14:30:00Z"
}
```

Khi lỗi:
```json
{
  "success": false,
  "message": "Mô tả lỗi",
  "data": null,
  "timestamp": "2026-04-14T14:30:00Z"
}
```

---

## 1. Nộp bài trắc nghiệm

Hệ thống sẽ tự động chấm điểm dựa trên `correctAnswer` trong bảng `questions`.

```
POST /api/quiz-results
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | Long | ✅ | ID người dùng |
| `assignmentId` | Long | ✅ | ID bài tập |
| `durationSeconds` | Integer | ❌ | Thời gian làm bài (giây) |
| `answers` | Array | ✅ | Danh sách câu trả lời |
| `answers[].questionId` | Long | ✅ | ID câu hỏi |
| `answers[].selectedAnswer` | String | ❌ | Đáp án chọn (`"A"`, `"B"`, `"C"`, `"D"`, hoặc `null` nếu bỏ qua) |

### Request Example

```json
{
  "userId": 4,
  "assignmentId": 1,
  "durationSeconds": 180,
  "answers": [
    { "questionId": 1, "selectedAnswer": "B" },
    { "questionId": 2, "selectedAnswer": "A" },
    { "questionId": 3, "selectedAnswer": "C" },
    { "questionId": 4, "selectedAnswer": "B" },
    { "questionId": 5, "selectedAnswer": null }
  ]
}
```

### Response Example — `200 OK`

```json
{
  "success": true,
  "message": "Quiz submitted and graded successfully",
  "data": {
    "id": 1,
    "userId": 4,
    "assignmentId": 1,
    "assignmentTitle": "English Grammar Basics",
    "totalQuestions": 5,
    "correctCount": 4,
    "wrongCount": 1,
    "score": 80.0,
    "durationSeconds": 180,
    "completedAt": "2026-04-14T14:30:00Z",
    "answerDetails": [
      {
        "questionId": 1,
        "questionText": "What is the past tense of \"go\"?",
        "selectedAnswer": "B",
        "correctAnswer": "B",
        "isCorrect": true
      },
      {
        "questionId": 2,
        "questionText": "Which sentence is grammatically correct?",
        "selectedAnswer": "A",
        "correctAnswer": "A",
        "isCorrect": true
      },
      {
        "questionId": 3,
        "questionText": "Choose the correct form: \"She ___ to school every day.\"",
        "selectedAnswer": "C",
        "correctAnswer": "C",
        "isCorrect": true
      },
      {
        "questionId": 4,
        "questionText": "\"Beautiful\" is a(n) ___.",
        "selectedAnswer": "B",
        "correctAnswer": "B",
        "isCorrect": true
      },
      {
        "questionId": 5,
        "questionText": "Which word is a preposition?",
        "selectedAnswer": null,
        "correctAnswer": "D",
        "isCorrect": false
      }
    ]
  },
  "timestamp": "2026-04-14T14:30:00Z"
}
```

> [!NOTE]
> - `score` tính theo công thức: `(correctCount / totalQuestions) × 100`, làm tròn 2 chữ số thập phân.
> - `selectedAnswer = null` → tính là **sai**.
> - Mỗi lần gọi API này tạo một bản ghi mới, hỗ trợ làm bài nhiều lần.

### Error Cases

| HTTP Status | `message` | Khi nào |
|-------------|-----------|---------|
| 404 | `Assignment not found with id=X` | `assignmentId` không tồn tại |
| 404 | `User not found with id=X` | `userId` không tồn tại |
| 400 | Validation errors | Thiếu field required |

---

## 2. Xem kết quả theo ID

```
GET /api/quiz-results/{id}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | Long | ID kết quả quiz |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 1,
    "userId": 4,
    "assignmentId": 1,
    "assignmentTitle": "English Grammar Basics",
    "totalQuestions": 5,
    "correctCount": 4,
    "wrongCount": 1,
    "score": 80.0,
    "durationSeconds": 180,
    "completedAt": "2026-04-14T14:30:00Z",
    "answerDetails": [
      {
        "questionId": 1,
        "questionText": "What is the past tense of \"go\"?",
        "selectedAnswer": "B",
        "correctAnswer": "B",
        "isCorrect": true
      }
    ]
  },
  "timestamp": "2026-04-14T14:30:05Z"
}
```

---

## 3. Lịch sử làm bài

Lấy tất cả lần làm bài của một user cho một assignment cụ thể (sắp xếp mới nhất trước).

```
GET /api/quiz-results/history?userId={userId}&assignmentId={assignmentId}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | Long | ✅ | ID người dùng |
| `assignmentId` | Long | ✅ | ID bài tập |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 3,
      "userId": 4,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 5,
      "wrongCount": 0,
      "score": 100.0,
      "durationSeconds": 120,
      "completedAt": "2026-04-01T09:15:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 2,
      "userId": 4,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 4,
      "wrongCount": 1,
      "score": 80.0,
      "durationSeconds": 150,
      "completedAt": "2026-03-25T10:00:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 1,
      "userId": 4,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 3,
      "wrongCount": 2,
      "score": 60.0,
      "durationSeconds": 180,
      "completedAt": "2026-03-20T08:30:00Z",
      "answerDetails": [ ... ]
    }
  ],
  "timestamp": "2026-04-14T14:30:10Z"
}
```

> [!TIP]
> API này lý tưởng để hiển thị bảng lịch sử làm bài với cột: Lần thử, Điểm, Thời gian, Ngày làm.

---

## 4. Kết quả gần nhất (tổng)

Lấy kết quả quiz gần nhất của user (bất kể bài tập nào).

```
GET /api/quiz-results/latest?userId={userId}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | Long | ✅ | ID người dùng |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 5,
    "userId": 4,
    "assignmentId": 3,
    "assignmentTitle": "Listening Comprehension Test",
    "totalQuestions": 5,
    "correctCount": 3,
    "wrongCount": 2,
    "score": 60.0,
    "durationSeconds": 250,
    "completedAt": "2026-04-10T16:30:00Z",
    "answerDetails": [ ... ]
  },
  "timestamp": "2026-04-14T14:30:15Z"
}
```

---

## 5. Kết quả gần nhất cho bài cụ thể

```
GET /api/quiz-results/latest-for-assignment?userId={userId}&assignmentId={assignmentId}
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `userId` | Long | ✅ | ID người dùng |
| `assignmentId` | Long | ✅ | ID bài tập |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": 3,
    "userId": 4,
    "assignmentId": 1,
    "assignmentTitle": "English Grammar Basics",
    "totalQuestions": 5,
    "correctCount": 5,
    "wrongCount": 0,
    "score": 100.0,
    "durationSeconds": 120,
    "completedAt": "2026-04-01T09:15:00Z",
    "answerDetails": [
      {
        "questionId": 1,
        "questionText": "What is the past tense of \"go\"?",
        "selectedAnswer": "B",
        "correctAnswer": "B",
        "isCorrect": true
      },
      {
        "questionId": 2,
        "questionText": "Which sentence is grammatically correct?",
        "selectedAnswer": "A",
        "correctAnswer": "A",
        "isCorrect": true
      },
      {
        "questionId": 3,
        "questionText": "Choose the correct form: \"She ___ to school every day.\"",
        "selectedAnswer": "C",
        "correctAnswer": "C",
        "isCorrect": true
      },
      {
        "questionId": 4,
        "questionText": "\"Beautiful\" is a(n) ___.",
        "selectedAnswer": "B",
        "correctAnswer": "B",
        "isCorrect": true
      },
      {
        "questionId": 5,
        "questionText": "Which word is a preposition?",
        "selectedAnswer": "D",
        "correctAnswer": "D",
        "isCorrect": true
      }
    ]
  },
  "timestamp": "2026-04-14T14:30:20Z"
}
```

---

## 6. Thống kê người dùng

Lấy thống kê tổng hợp cho một user: tổng lần làm, điểm TB/cao nhất/thấp nhất, và timeline tiến bộ.

```
GET /api/quiz-results/stats/user/{userId}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `userId` | Long | ID người dùng |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": {
    "userId": 4,
    "username": "hoangvane",
    "totalAttempts": 5,
    "averageScore": 76.0,
    "highestScore": 100.0,
    "lowestScore": 60.0,
    "progressHistory": [
      {
        "resultId": 5,
        "assignmentId": 3,
        "assignmentTitle": "Listening Comprehension Test",
        "score": 60.0,
        "correctCount": 3,
        "totalQuestions": 5,
        "completedAt": "2026-04-10T16:30:00Z"
      },
      {
        "resultId": 4,
        "assignmentId": 2,
        "assignmentTitle": "Vocabulary - Daily Life",
        "score": 80.0,
        "correctCount": 4,
        "totalQuestions": 5,
        "completedAt": "2026-04-05T14:00:00Z"
      },
      {
        "resultId": 3,
        "assignmentId": 1,
        "assignmentTitle": "English Grammar Basics",
        "score": 100.0,
        "correctCount": 5,
        "totalQuestions": 5,
        "completedAt": "2026-04-01T09:15:00Z"
      },
      {
        "resultId": 2,
        "assignmentId": 1,
        "assignmentTitle": "English Grammar Basics",
        "score": 80.0,
        "correctCount": 4,
        "totalQuestions": 5,
        "completedAt": "2026-03-25T10:00:00Z"
      },
      {
        "resultId": 1,
        "assignmentId": 1,
        "assignmentTitle": "English Grammar Basics",
        "score": 60.0,
        "correctCount": 3,
        "totalQuestions": 5,
        "completedAt": "2026-03-20T08:30:00Z"
      }
    ]
  },
  "timestamp": "2026-04-14T14:30:25Z"
}
```

> [!TIP]
> **`progressHistory`** được sắp xếp mới nhất trước — FE có thể dùng dữ liệu này để vẽ biểu đồ Line Chart (trục X = `completedAt`, trục Y = `score`).

### TypeScript Interface gợi ý

```typescript
interface UserStats {
  userId: number;
  username: string;
  totalAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  progressHistory: ProgressPoint[];
}

interface ProgressPoint {
  resultId: number;
  assignmentId: number;
  assignmentTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string; // ISO 8601
}
```

---

## 7. Thống kê bài tập

Thống kê tổng hợp cho một bài tập bao gồm **tỷ lệ đúng/sai theo từng câu hỏi** để đánh giá độ khó.

```
GET /api/quiz-results/stats/assignment/{assignmentId}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignmentId` | Long | ID bài tập |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": {
    "assignmentId": 1,
    "assignmentTitle": "English Grammar Basics",
    "totalAttempts": 8,
    "averageScore": 72.5,
    "questionAccuracies": [
      {
        "questionId": 1,
        "questionText": "What is the past tense of \"go\"?",
        "totalAttempts": 8,
        "correctCount": 6,
        "wrongCount": 2,
        "accuracyRate": 75.0
      },
      {
        "questionId": 2,
        "questionText": "Which sentence is grammatically correct?",
        "totalAttempts": 8,
        "correctCount": 7,
        "wrongCount": 1,
        "accuracyRate": 87.5
      },
      {
        "questionId": 3,
        "questionText": "Choose the correct form: \"She ___ to school every day.\"",
        "totalAttempts": 8,
        "correctCount": 5,
        "wrongCount": 3,
        "accuracyRate": 62.5
      },
      {
        "questionId": 4,
        "questionText": "\"Beautiful\" is a(n) ___.",
        "totalAttempts": 8,
        "correctCount": 7,
        "wrongCount": 1,
        "accuracyRate": 87.5
      },
      {
        "questionId": 5,
        "questionText": "Which word is a preposition?",
        "totalAttempts": 8,
        "correctCount": 4,
        "wrongCount": 4,
        "accuracyRate": 50.0
      }
    ]
  },
  "timestamp": "2026-04-14T14:30:30Z"
}
```

> [!TIP]
> **`accuracyRate`** thấp → câu hỏi khó. FE có thể dùng dữ liệu này để vẽ **Bar Chart** (mỗi bar = 1 câu hỏi, chiều cao = `accuracyRate`), hoặc đánh dấu màu:
> - 🟢 `>= 80%` → Dễ
> - 🟡 `50% - 79%` → Trung bình
> - 🔴 `< 50%` → Khó

### TypeScript Interface gợi ý

```typescript
interface AssignmentStats {
  assignmentId: number;
  assignmentTitle: string;
  totalAttempts: number;
  averageScore: number | null;
  questionAccuracies: QuestionAccuracy[];
}

interface QuestionAccuracy {
  questionId: number;
  questionText: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;
}
```

---

## 8. Tiến bộ theo thời gian

Lấy tất cả kết quả trong một khoảng thời gian — phục vụ vẽ biểu đồ tiến bộ.

```
GET /api/quiz-results/progress?userId={userId}&from={from}&to={to}
```

### Query Parameters

| Parameter | Type | Required | Format | Description |
|-----------|------|----------|--------|-------------|
| `userId` | Long | ✅ | | ID người dùng |
| `from` | String | ✅ | `yyyy-MM-dd` | Ngày bắt đầu |
| `to` | String | ✅ | `yyyy-MM-dd` | Ngày kết thúc (bao gồm cả ngày này) |

### Request Example

```
GET /api/quiz-results/progress?userId=4&from=2026-03-01&to=2026-04-14
```

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "userId": 4,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 3,
      "wrongCount": 2,
      "score": 60.0,
      "durationSeconds": 180,
      "completedAt": "2026-03-20T08:30:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 2,
      "userId": 4,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 4,
      "wrongCount": 1,
      "score": 80.0,
      "durationSeconds": 150,
      "completedAt": "2026-03-25T10:00:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 3,
      "userId": 4,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 5,
      "wrongCount": 0,
      "score": 100.0,
      "durationSeconds": 120,
      "completedAt": "2026-04-01T09:15:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 4,
      "userId": 4,
      "assignmentId": 2,
      "assignmentTitle": "Vocabulary - Daily Life",
      "totalQuestions": 5,
      "correctCount": 4,
      "wrongCount": 1,
      "score": 80.0,
      "durationSeconds": 200,
      "completedAt": "2026-04-05T14:00:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 5,
      "userId": 4,
      "assignmentId": 3,
      "assignmentTitle": "Listening Comprehension Test",
      "totalQuestions": 5,
      "correctCount": 3,
      "wrongCount": 2,
      "score": 60.0,
      "durationSeconds": 250,
      "completedAt": "2026-04-10T16:30:00Z",
      "answerDetails": [ ... ]
    }
  ],
  "timestamp": "2026-04-14T14:30:35Z"
}
```

> [!NOTE]
> Kết quả sắp xếp theo **thời gian tăng dần** (cũ → mới), thuận tiện cho vẽ biểu đồ line chart.

---

## 9. Tất cả kết quả của bài tập

Lấy tất cả lần làm bài của **tất cả user** cho một assignment — phục vụ giảng viên xem tổng quan.

```
GET /api/quiz-results/by-assignment/{assignmentId}
```

### Path Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `assignmentId` | Long | ID bài tập |

### Response Example — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "id": 15,
      "userId": 8,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 5,
      "wrongCount": 0,
      "score": 100.0,
      "durationSeconds": 90,
      "completedAt": "2026-03-25T08:00:00Z",
      "answerDetails": [ ... ]
    },
    {
      "id": 9,
      "userId": 6,
      "assignmentId": 1,
      "assignmentTitle": "English Grammar Basics",
      "totalQuestions": 5,
      "correctCount": 4,
      "wrongCount": 1,
      "score": 80.0,
      "durationSeconds": 140,
      "completedAt": "2026-03-28T13:00:00Z",
      "answerDetails": [ ... ]
    }
  ],
  "timestamp": "2026-04-14T14:30:40Z"
}
```

---

## Tổng hợp TypeScript Interfaces

Dưới đây là tất cả interfaces mà FE cần define:

```typescript
// ===== Response Wrapper =====
interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}

// ===== Quiz Result =====
interface QuizResultResponse {
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

interface AnswerDetailResponse {
  questionId: number;
  questionText: string;
  selectedAnswer: string | null;  // null nếu bỏ qua
  correctAnswer: string;
  isCorrect: boolean;
}

// ===== Submit Request =====
interface SubmitQuizRequest {
  userId: number;
  assignmentId: number;
  durationSeconds?: number;
  answers: AnswerItem[];
}

interface AnswerItem {
  questionId: number;
  selectedAnswer: string | null;  // "A" | "B" | "C" | "D" | null
}

// ===== User Stats =====
interface UserStatsResponse {
  userId: number;
  username: string;
  totalAttempts: number;
  averageScore: number | null;
  highestScore: number | null;
  lowestScore: number | null;
  progressHistory: ProgressPoint[];
}

interface ProgressPoint {
  resultId: number;
  assignmentId: number;
  assignmentTitle: string;
  score: number;
  correctCount: number;
  totalQuestions: number;
  completedAt: string;  // ISO 8601
}

// ===== Assignment Stats =====
interface AssignmentStatsResponse {
  assignmentId: number;
  assignmentTitle: string;
  totalAttempts: number;
  averageScore: number | null;
  questionAccuracies: QuestionAccuracy[];
}

interface QuestionAccuracy {
  questionId: number;
  questionText: string;
  totalAttempts: number;
  correctCount: number;
  wrongCount: number;
  accuracyRate: number;  // 0 - 100
}
```

---

## Angular Service gợi ý

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class QuizResultService {
  private baseUrl = '/api/quiz-results';

  constructor(private http: HttpClient) {}

  /** 1. Nộp bài */
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
```

---

## Tổng hợp Endpoints

| # | Method | Endpoint | Mục đích |
|---|--------|----------|----------|
| 1 | `POST` | `/api/quiz-results` | Nộp bài & chấm điểm |
| 2 | `GET` | `/api/quiz-results/{id}` | Xem kết quả cụ thể |
| 3 | `GET` | `/api/quiz-results/history?userId=&assignmentId=` | Lịch sử làm bài |
| 4 | `GET` | `/api/quiz-results/latest?userId=` | Kết quả gần nhất |
| 5 | `GET` | `/api/quiz-results/latest-for-assignment?userId=&assignmentId=` | Kết quả gần nhất cho bài |
| 6 | `GET` | `/api/quiz-results/stats/user/{userId}` | Thống kê user |
| 7 | `GET` | `/api/quiz-results/stats/assignment/{assignmentId}` | Thống kê bài tập + độ khó |
| 8 | `GET` | `/api/quiz-results/progress?userId=&from=&to=` | Tiến bộ theo thời gian |
| 9 | `GET` | `/api/quiz-results/by-assignment/{assignmentId}` | Tất cả kết quả (giảng viên) |
