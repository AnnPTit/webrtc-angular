# 📚 Vocabulary Learning API Documentation

> **Base URL:** `http://localhost:8080/api/vocabulary`
> **Content-Type:** `application/json`
> **Authentication:** Not required (public endpoints)

---

## Table of Contents

1. [Data Models](#data-models)
2. [API Endpoints](#api-endpoints)
   - [Generate Vocabulary](#1-generate-vocabulary)
   - [Get Available Topics](#2-get-available-topics)
   - [Get Vocabulary by Topic](#3-get-vocabulary-by-topic)
   - [Update Learning Progress](#4-update-learning-progress)
   - [Get User Progress](#5-get-user-progress)
   - [Get User Stats](#6-get-user-stats)
   - [Get Favorite Words](#7-get-favorite-words)
   - [Get Review Words](#8-get-review-words)
   - [Get All Vocabulary](#9-get-all-vocabulary)
   - [Get Vocabulary by Date](#10-get-vocabulary-by-date)
   - [Get Unlearned Words](#11-get-unlearned-words)
   - [Get Learned Words](#12-get-learned-words)
3. [Enums & Constants](#enums--constants)
4. [Error Handling](#error-handling)
5. [Angular Integration Examples](#angular-integration-examples)

---

## Data Models

### ApiResponse Wrapper

All responses are wrapped in a standard `ApiResponse<T>`:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string; // ISO 8601
}
```

### VocabularyWordResponse

```typescript
interface VocabularyWordResponse {
  id: number;
  word: string;
  ipa: string;              // IPA pronunciation, e.g. "/nɪˈɡoʊʃieɪt/"
  wordType: string;          // "noun" | "verb" | "adjective" | "adverb" | "preposition" | ...
  meaningVi: string;         // Vietnamese meaning
  meaningEn: string;         // Simple English definition
  exampleSentence: string;   // Example sentence in English
  exampleVi: string;         // Vietnamese translation of example
  topic: string;             // e.g. "Business", "Travel"
  level: string;             // e.g. "A1", "B2", "C1"
  createdAt: string;         // ISO 8601

  // User progress (always present, defaults to false/0)
  learned: boolean;
  favorite: boolean;
  needReview: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
}
```

### VocabularyStatsResponse

```typescript
interface VocabularyStatsResponse {
  userId: number;
  totalWordsLearned: number;
  totalFavorites: number;
  totalNeedReview: number;
  totalWordsStudied: number;
  topicBreakdown: Record<string, number>; // e.g. { "Business": 15, "Travel": 8 }
}
```

### GenerateVocabularyRequest

```typescript
interface GenerateVocabularyRequest {
  topic: string;    // Required — one of the available topics
  level: string;    // Required — "A1" | "A2" | "B1" | "B2" | "C1" | "C2"
  quantity: number;  // Optional, default=10, range: 1–50
  userId: number;   // Required
}
```

### UpdateProgressRequest

```typescript
interface UpdateProgressRequest {
  userId: number;        // Required
  vocabularyId: number;  // Required
  learnedFlag?: boolean;    // Optional — mark as learned/not learned
  favoriteFlag?: boolean;   // Optional — toggle favorite
  needReviewFlag?: boolean; // Optional — mark for review
}
```

---

## API Endpoints

---

### 1. Generate Vocabulary

Generate vocabulary words by topic, level, and quantity. The system first tries to return unused words from the database; if insufficient, it calls Gemini AI to generate more.

```
POST /api/vocabulary/generate
```

#### Request Body

```json
{
  "topic": "Business",
  "level": "B1",
  "quantity": 10,
  "userId": 1
}
```

| Field | Type | Required | Validation | Description |
|-------|------|----------|------------|-------------|
| `topic` | string | ✅ | Not blank | Vocabulary topic |
| `level` | string | ✅ | Not blank | CEFR level (A1–C2) |
| `quantity` | number | ❌ | 1–50, default: 10 | Number of words |
| `userId` | number | ✅ | Not null | Current user ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Vocabulary generated successfully",
  "data": [
    {
      "id": 1,
      "word": "negotiate",
      "ipa": "/nɪˈɡoʊʃieɪt/",
      "wordType": "verb",
      "meaningVi": "đàm phán",
      "meaningEn": "to discuss something to reach agreement",
      "exampleSentence": "They negotiated a better price.",
      "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": false,
      "favorite": false,
      "needReview": false,
      "reviewCount": 0,
      "correctCount": 0,
      "wrongCount": 0
    },
    {
      "id": 2,
      "word": "revenue",
      "ipa": "/ˈrevənjuː/",
      "wordType": "noun",
      "meaningVi": "doanh thu",
      "meaningEn": "income earned by a business",
      "exampleSentence": "The company's revenue increased by 20%.",
      "exampleVi": "Doanh thu của công ty tăng 20%.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": false,
      "favorite": false,
      "needReview": false,
      "reviewCount": 0,
      "correctCount": 0,
      "wrongCount": 0
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

#### Business Logic

```
1. Check if user has already-learned words → build exclude list
2. Query DB for unused words matching (topic + level)
3. If enough unused words in DB → return directly (no AI call)
4. If insufficient → call Gemini AI for remaining quantity
5. Save new AI-generated words to DB
6. Return combined result with user progress
```

---

### 2. Get Available Topics

Get the list of selectable vocabulary topics.

```
GET /api/vocabulary/topics
```

#### Request

No parameters required.

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    "Travel",
    "Business",
    "Technology",
    "Daily Life",
    "Food",
    "Education",
    "Health",
    "Finance",
    "Office",
    "IELTS Speaking"
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

---

### 3. Get Vocabulary by Topic

Get all stored vocabulary words for a specific topic and level, with the user's progress embedded.

```
GET /api/vocabulary/by-topic?topic={topic}&level={level}&userId={userId}
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `topic` | string | ✅ | Topic name (e.g. `Business`) |
| `level` | string | ✅ | CEFR level (e.g. `B1`) |
| `userId` | number | ❌ | If provided, includes user progress data |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "word": "negotiate",
      "ipa": "/nɪˈɡoʊʃieɪt/",
      "wordType": "verb",
      "meaningVi": "đàm phán",
      "meaningEn": "to discuss something to reach agreement",
      "exampleSentence": "They negotiated a better price.",
      "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": true,
      "favorite": true,
      "needReview": false,
      "reviewCount": 3,
      "correctCount": 2,
      "wrongCount": 1
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

---

### 4. Update Learning Progress

Update a user's learning progress on a specific vocabulary word. Supports marking as learned, favorite, or needs-review. Only send the flags you want to change.

```
PUT /api/vocabulary/progress
```

#### Request Body

**Mark as learned:**
```json
{
  "userId": 1,
  "vocabularyId": 5,
  "learnedFlag": true
}
```

**Toggle favorite:**
```json
{
  "userId": 1,
  "vocabularyId": 5,
  "favoriteFlag": true
}
```

**Mark for review:**
```json
{
  "userId": 1,
  "vocabularyId": 5,
  "needReviewFlag": true
}
```

**Update multiple flags at once:**
```json
{
  "userId": 1,
  "vocabularyId": 5,
  "learnedFlag": true,
  "favoriteFlag": true,
  "needReviewFlag": false
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | number | ✅ | Current user ID |
| `vocabularyId` | number | ✅ | Word ID from `VocabularyWordResponse.id` |
| `learnedFlag` | boolean | ❌ | Mark as learned (auto-sets `learnedAt`) |
| `favoriteFlag` | boolean | ❌ | Toggle favorite |
| `needReviewFlag` | boolean | ❌ | Mark for review later |

#### Response `200 OK`

```json
{
  "success": true,
  "message": "Progress updated successfully",
  "data": {
    "id": 5,
    "word": "negotiate",
    "ipa": "/nɪˈɡoʊʃieɪt/",
    "wordType": "verb",
    "meaningVi": "đàm phán",
    "meaningEn": "to discuss something to reach agreement",
    "exampleSentence": "They negotiated a better price.",
    "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
    "topic": "Business",
    "level": "B1",
    "createdAt": "2026-04-19T14:30:00Z",
    "learned": true,
    "favorite": true,
    "needReview": false,
    "reviewCount": 0,
    "correctCount": 0,
    "wrongCount": 0
  },
  "timestamp": "2026-04-19T14:35:00Z"
}
```

---

### 5. Get User Progress

Get all vocabulary words that the user has interacted with (learned, favorited, or marked for review).

```
GET /api/vocabulary/progress/{userId}
```

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | User ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "word": "negotiate",
      "learned": true,
      "favorite": true,
      "needReview": false,
      "reviewCount": 5,
      "correctCount": 4,
      "wrongCount": 1
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

> **Note:** Response contains full `VocabularyWordResponse` objects (abbreviated above for clarity).

---

### 6. Get User Stats

Get aggregated vocabulary learning statistics for a user.

```
GET /api/vocabulary/stats/{userId}
```

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | User ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": {
    "userId": 1,
    "totalWordsLearned": 45,
    "totalFavorites": 12,
    "totalNeedReview": 8,
    "totalWordsStudied": 60,
    "topicBreakdown": {
      "Business": 15,
      "Travel": 10,
      "Technology": 8,
      "Daily Life": 7,
      "Food": 5
    }
  },
  "timestamp": "2026-04-19T14:30:00Z"
}
```

---

### 7. Get Favorite Words

Get all words that the user has marked as favorite.

```
GET /api/vocabulary/favorites/{userId}
```

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | User ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 5,
      "word": "negotiate",
      "ipa": "/nɪˈɡoʊʃieɪt/",
      "wordType": "verb",
      "meaningVi": "đàm phán",
      "meaningEn": "to discuss something to reach agreement",
      "exampleSentence": "They negotiated a better price.",
      "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": true,
      "favorite": true,
      "needReview": false,
      "reviewCount": 3,
      "correctCount": 2,
      "wrongCount": 1
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

---

### 8. Get Review Words

Get all words that the user has marked for review.

```
GET /api/vocabulary/review/{userId}
```

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | User ID |

#### Response `200 OK`

Same format as [Get Favorite Words](#7-get-favorite-words), returning `VocabularyWordResponse[]` where `needReview = true`.

---

### 9. Get All Vocabulary

Get all vocabulary words in the system with optional user progress.

```
GET /api/vocabulary/all?userId={userId}
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | number | ❌ | If provided, includes user progress data |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "word": "negotiate",
      "ipa": "/nɪˈɡoʊʃieɪt/",
      "wordType": "verb",
      "meaningVi": "đàm phán",
      "meaningEn": "to discuss something to reach agreement",
      "exampleSentence": "They negotiated a better price.",
      "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": false,
      "favorite": false,
      "needReview": false,
      "reviewCount": 0,
      "correctCount": 0,
      "wrongCount": 0
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

> **Note:** Returns all vocabulary words across all topics and levels. If `userId` is not provided, progress fields default to `false` / `0`.

---

### 10. Get Vocabulary by Date

Get all vocabulary words created on a specific date.

```
GET /api/vocabulary/by-date?date={date}&userId={userId}
```

#### Query Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `date` | string | ✅ | Date in ISO format `YYYY-MM-DD` (e.g. `2026-04-19`) |
| `userId` | number | ❌ | If provided, includes user progress data |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 1,
      "word": "negotiate",
      "ipa": "/nɪˈɡoʊʃieɪt/",
      "wordType": "verb",
      "meaningVi": "đàm phán",
      "meaningEn": "to discuss something to reach agreement",
      "exampleSentence": "They negotiated a better price.",
      "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": true,
      "favorite": false,
      "needReview": false,
      "reviewCount": 0,
      "correctCount": 0,
      "wrongCount": 0
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

> **Note:** Date is interpreted as UTC. Returns words where `createdAt` falls within the given date (00:00:00 UTC to 23:59:59 UTC).

---

### 11. Get Unlearned Words

Get all vocabulary words that the user has **not** learned yet.

```
GET /api/vocabulary/unlearned/{userId}
```

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | User ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 10,
      "word": "collaborate",
      "ipa": "/kəˈlæbəreɪt/",
      "wordType": "verb",
      "meaningVi": "hợp tác",
      "meaningEn": "to work jointly with others",
      "exampleSentence": "We need to collaborate on this project.",
      "exampleVi": "Chúng ta cần hợp tác trong dự án này.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": false,
      "favorite": false,
      "needReview": false,
      "reviewCount": 0,
      "correctCount": 0,
      "wrongCount": 0
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

> **Note:** Returns all words where the user's `learnedFlag` is `false` or the user has **no progress record** for the word.

---

### 12. Get Learned Words

Get all vocabulary words that the user has already learned.

```
GET /api/vocabulary/learned/{userId}
```

#### Path Parameters

| Param | Type | Description |
|-------|------|-------------|
| `userId` | number | User ID |

#### Response `200 OK`

```json
{
  "success": true,
  "message": null,
  "data": [
    {
      "id": 5,
      "word": "negotiate",
      "ipa": "/nɪˈɡoʊʃieɪt/",
      "wordType": "verb",
      "meaningVi": "đàm phán",
      "meaningEn": "to discuss something to reach agreement",
      "exampleSentence": "They negotiated a better price.",
      "exampleVi": "Họ đã đàm phán được mức giá tốt hơn.",
      "topic": "Business",
      "level": "B1",
      "createdAt": "2026-04-19T14:30:00Z",
      "learned": true,
      "favorite": true,
      "needReview": false,
      "reviewCount": 5,
      "correctCount": 4,
      "wrongCount": 1
    }
  ],
  "timestamp": "2026-04-19T14:30:00Z"
}
```

> **Note:** Only returns words where the user's `learnedFlag = true`.

---

## Enums & Constants

### Available Topics

| Topic | Value to Send |
|-------|--------------|
| Travel | `"Travel"` |
| Business | `"Business"` |
| Technology | `"Technology"` |
| Daily Life | `"Daily Life"` |
| Food | `"Food"` |
| Education | `"Education"` |
| Health | `"Health"` |
| Finance | `"Finance"` |
| Office | `"Office"` |
| IELTS Speaking | `"IELTS Speaking"` |

> Use `GET /api/vocabulary/topics` to dynamically fetch the list.

### Difficulty Levels

| Label | Value | CEFR |
|-------|-------|------|
| Beginner | `"A1"` or `"A2"` | Basic user |
| Intermediate | `"B1"` or `"B2"` | Independent user |
| Advanced | `"C1"` or `"C2"` | Proficient user |

### Word Types

Values returned in `wordType` field:

`"noun"` · `"verb"` · `"adjective"` · `"adverb"` · `"preposition"` · `"conjunction"` · `"pronoun"` · `"interjection"` · `"phrase"`

---

## Error Handling

### Validation Error `400 Bad Request`

When request body fails validation:

```json
{
  "success": false,
  "message": "Topic is required",
  "data": null,
  "timestamp": "2026-04-19T14:30:00Z"
}
```

### Not Found `404 Not Found`

When user or vocabulary word doesn't exist:

```json
{
  "success": false,
  "message": "User not found with id=999",
  "data": null,
  "timestamp": "2026-04-19T14:30:00Z"
}
```

### Server Error `500 Internal Server Error`

When Gemini AI call fails or other internal errors:

```json
{
  "success": false,
  "message": "Internal server error",
  "data": null,
  "timestamp": "2026-04-19T14:30:00Z"
}
```

---

## Angular Integration Examples

### 1. TypeScript Interfaces

```typescript
// src/app/models/vocabulary.model.ts

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
  learned: boolean;
  favorite: boolean;
  needReview: boolean;
  reviewCount: number;
  correctCount: number;
  wrongCount: number;
}

export interface VocabularyStats {
  userId: number;
  totalWordsLearned: number;
  totalFavorites: number;
  totalNeedReview: number;
  totalWordsStudied: number;
  topicBreakdown: { [topic: string]: number };
}

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

export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T;
  timestamp: string;
}
```

### 2. Angular Service

```typescript
// src/app/services/vocabulary.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
  ApiResponse,
  VocabularyWord,
  VocabularyStats,
  GenerateVocabularyRequest,
  UpdateProgressRequest
} from '../models/vocabulary.model';

@Injectable({ providedIn: 'root' })
export class VocabularyService {

  private readonly baseUrl = 'http://localhost:8080/api/vocabulary';

  constructor(private http: HttpClient) {}

  /**
   * Generate vocabulary words by topic, level, and quantity.
   */
  generateVocabulary(request: GenerateVocabularyRequest): Observable<VocabularyWord[]> {
    return this.http
      .post<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/generate`, request)
      .pipe(map(res => res.data));
  }

  /**
   * Get available vocabulary topics.
   */
  getTopics(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.baseUrl}/topics`)
      .pipe(map(res => res.data));
  }

  /**
   * Get vocabulary by topic and level with user progress.
   */
  getByTopic(topic: string, level: string, userId?: number): Observable<VocabularyWord[]> {
    let params = new HttpParams()
      .set('topic', topic)
      .set('level', level);
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/by-topic`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * Update learning progress (learned, favorite, review).
   */
  updateProgress(request: UpdateProgressRequest): Observable<VocabularyWord> {
    return this.http
      .put<ApiResponse<VocabularyWord>>(`${this.baseUrl}/progress`, request)
      .pipe(map(res => res.data));
  }

  /**
   * Get all vocabulary progress for a user.
   */
  getUserProgress(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/progress/${userId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Get vocabulary learning stats for a user.
   */
  getUserStats(userId: number): Observable<VocabularyStats> {
    return this.http
      .get<ApiResponse<VocabularyStats>>(`${this.baseUrl}/stats/${userId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Get favorite words for a user.
   */
  getFavorites(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/favorites/${userId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Get words needing review for a user.
   */
  getReviewWords(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/review/${userId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Get all vocabulary words with optional user progress.
   */
  getAllVocabulary(userId?: number): Observable<VocabularyWord[]> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/all`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * Get vocabulary words by creation date with optional user progress.
   */
  getByDate(date: string, userId?: number): Observable<VocabularyWord[]> {
    let params = new HttpParams().set('date', date);
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/by-date`, { params })
      .pipe(map(res => res.data));
  }

  /**
   * Get unlearned words for a user.
   */
  getUnlearnedWords(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/unlearned/${userId}`)
      .pipe(map(res => res.data));
  }

  /**
   * Get learned words for a user.
   */
  getLearnedWords(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/learned/${userId}`)
      .pipe(map(res => res.data));
  }
}
```

### 3. Component Usage Example

```typescript
// src/app/components/vocabulary-learning/vocabulary-learning.component.ts

export class VocabularyLearningComponent implements OnInit {

  topics: string[] = [];
  words: VocabularyWord[] = [];
  stats: VocabularyStats | null = null;

  selectedTopic = '';
  selectedLevel = 'B1';
  selectedQuantity = 10;
  isLoading = false;

  levels = [
    { label: 'Beginner (A1-A2)', value: 'A1' },
    { label: 'Intermediate (B1-B2)', value: 'B1' },
    { label: 'Advanced (C1-C2)', value: 'C1' }
  ];

  quantities = [5, 10, 15, 20];

  constructor(
    private vocabularyService: VocabularyService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.loadTopics();
    this.loadStats();
  }

  loadTopics() {
    this.vocabularyService.getTopics().subscribe(topics => {
      this.topics = topics;
      this.selectedTopic = topics[0];
    });
  }

  loadStats() {
    const userId = this.authService.currentUserId;
    this.vocabularyService.getUserStats(userId).subscribe(stats => {
      this.stats = stats;
    });
  }

  generateWords() {
    this.isLoading = true;
    this.vocabularyService.generateVocabulary({
      topic: this.selectedTopic,
      level: this.selectedLevel,
      quantity: this.selectedQuantity,
      userId: this.authService.currentUserId
    }).subscribe({
      next: (words) => {
        this.words = words;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to generate vocabulary', err);
        this.isLoading = false;
      }
    });
  }

  toggleLearned(word: VocabularyWord) {
    this.vocabularyService.updateProgress({
      userId: this.authService.currentUserId,
      vocabularyId: word.id,
      learnedFlag: !word.learned
    }).subscribe(updated => {
      const index = this.words.findIndex(w => w.id === updated.id);
      if (index !== -1) this.words[index] = updated;
      this.loadStats();
    });
  }

  toggleFavorite(word: VocabularyWord) {
    this.vocabularyService.updateProgress({
      userId: this.authService.currentUserId,
      vocabularyId: word.id,
      favoriteFlag: !word.favorite
    }).subscribe(updated => {
      const index = this.words.findIndex(w => w.id === updated.id);
      if (index !== -1) this.words[index] = updated;
    });
  }

  markForReview(word: VocabularyWord) {
    this.vocabularyService.updateProgress({
      userId: this.authService.currentUserId,
      vocabularyId: word.id,
      needReviewFlag: true
    }).subscribe(updated => {
      const index = this.words.findIndex(w => w.id === updated.id);
      if (index !== -1) this.words[index] = updated;
    });
  }
}
```

### 4. HTML Template Example

```html
<!-- Topic & Level Selection -->
<div class="filters">
  <select [(ngModel)]="selectedTopic">
    <option *ngFor="let topic of topics" [value]="topic">{{ topic }}</option>
  </select>

  <select [(ngModel)]="selectedLevel">
    <option *ngFor="let level of levels" [value]="level.value">{{ level.label }}</option>
  </select>

  <select [(ngModel)]="selectedQuantity">
    <option *ngFor="let qty of quantities" [value]="qty">{{ qty }} words</option>
  </select>

  <button (click)="generateWords()" [disabled]="isLoading">
    {{ isLoading ? 'Generating...' : 'Generate Words' }}
  </button>
</div>

<!-- Vocabulary Cards -->
<div class="word-cards">
  <div *ngFor="let word of words" class="word-card">
    <div class="word-header">
      <h3>{{ word.word }}</h3>
      <span class="ipa">{{ word.ipa }}</span>
      <span class="type-badge">{{ word.wordType }}</span>
    </div>

    <div class="meanings">
      <p class="meaning-en">📖 {{ word.meaningEn }}</p>
      <p class="meaning-vi">🇻🇳 {{ word.meaningVi }}</p>
    </div>

    <div class="example">
      <p class="example-en">💬 {{ word.exampleSentence }}</p>
      <p class="example-vi">→ {{ word.exampleVi }}</p>
    </div>

    <div class="actions">
      <button (click)="toggleLearned(word)"
              [class.active]="word.learned">
        ✅ {{ word.learned ? 'Learned' : 'Mark Learned' }}
      </button>

      <button (click)="toggleFavorite(word)"
              [class.active]="word.favorite">
        {{ word.favorite ? '❤️' : '🤍' }} Favorite
      </button>

      <button (click)="markForReview(word)"
              [class.active]="word.needReview">
        🔄 Review Later
      </button>
    </div>
  </div>
</div>
```

---

## Quick Reference

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | `POST` | `/api/vocabulary/generate` | Generate words (AI-powered) |
| 2 | `GET` | `/api/vocabulary/topics` | List topics |
| 3 | `GET` | `/api/vocabulary/by-topic` | Browse by topic |
| 4 | `PUT` | `/api/vocabulary/progress` | Update progress |
| 5 | `GET` | `/api/vocabulary/progress/:userId` | User progress |
| 6 | `GET` | `/api/vocabulary/stats/:userId` | User stats |
| 7 | `GET` | `/api/vocabulary/favorites/:userId` | Favorites list |
| 8 | `GET` | `/api/vocabulary/review/:userId` | Review list |
| 9 | `GET` | `/api/vocabulary/all` | All vocabulary |
| 10 | `GET` | `/api/vocabulary/by-date` | By creation date |
| 11 | `GET` | `/api/vocabulary/unlearned/:userId` | Unlearned words |
| 12 | `GET` | `/api/vocabulary/learned/:userId` | Learned words |
