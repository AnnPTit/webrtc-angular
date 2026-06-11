import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, throwError, timer, BehaviorSubject } from 'rxjs';
import { map, catchError, retry, retryWhen, delayWhen, take } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  ApiResponse,
  VocabularyWord,
  VocabularyStats,
  GenerateVocabularyRequest,
  UpdateProgressRequest,
} from '../models/vocabulary.model';

@Injectable({ providedIn: 'root' })
export class VocabularyService {
  private readonly baseUrl = `${environment.apiBaseUrl}${environment.apiEndpoints.vocabulary}`;

  // Shared state for passing daily review words between components
  private dailyReviewWords$ = new BehaviorSubject<VocabularyWord[]>([]);

  constructor(private http: HttpClient) {}

  // ═══════════════════════════════════════════
  //  Daily Review Words (shared state)
  // ═══════════════════════════════════════════

  setDailyReviewWords(words: VocabularyWord[]): void {
    this.dailyReviewWords$.next(words);
  }

  getDailyReviewWords(): VocabularyWord[] {
    return this.dailyReviewWords$.getValue();
  }

  hasDailyReviewWords(): boolean {
    return this.dailyReviewWords$.getValue().length > 0;
  }

  // ═══════════════════════════════════════════
  //  Generate Vocabulary (POST)
  // ═══════════════════════════════════════════

  generateVocabulary(request: GenerateVocabularyRequest): Observable<VocabularyWord[]> {
    return this.http
      .post<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/generate`, request)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get Available Topics (GET)
  // ═══════════════════════════════════════════

  getTopics(): Observable<string[]> {
    return this.http
      .get<ApiResponse<string[]>>(`${this.baseUrl}/topics`)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get Vocabulary by Topic (GET)
  // ═══════════════════════════════════════════

  getByTopic(topic: string, level: string, userId?: number): Observable<VocabularyWord[]> {
    let params = new HttpParams().set('topic', topic).set('level', level);
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/by-topic`, { params })
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Update Learning Progress (PUT)
  // ═══════════════════════════════════════════

  updateProgress(request: UpdateProgressRequest): Observable<VocabularyWord> {
    return this.http
      .put<ApiResponse<VocabularyWord>>(`${this.baseUrl}/progress`, request)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get User Progress (GET)
  // ═══════════════════════════════════════════

  getUserProgress(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/progress/${userId}`)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get User Stats (GET)
  // ═══════════════════════════════════════════

  getUserStats(userId: number): Observable<VocabularyStats> {
    return this.http
      .get<ApiResponse<VocabularyStats>>(`${this.baseUrl}/stats/${userId}`)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get Favorite Words (GET)
  // ═══════════════════════════════════════════

  getFavorites(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/favorites/${userId}`)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get Review Words (GET)
  // ═══════════════════════════════════════════

  getReviewWords(userId: number): Observable<VocabularyWord[]> {
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/review/${userId}`)
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get All Vocabulary (GET)
  // ═══════════════════════════════════════════

  getAllVocabulary(userId?: number): Observable<VocabularyWord[]> {
    let params = new HttpParams();
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/all`, { params })
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Get Vocabulary by Date (GET)
  // ═══════════════════════════════════════════

  getByDate(date: string, userId?: number): Observable<VocabularyWord[]> {
    let params = new HttpParams().set('date', date);
    if (userId) {
      params = params.set('userId', userId.toString());
    }
    return this.http
      .get<ApiResponse<VocabularyWord[]>>(`${this.baseUrl}/by-date`, { params })
      .pipe(
        map(res => res.data),
        catchError(this.handleError),
      );
  }

  // ═══════════════════════════════════════════
  //  Pronunciation (Browser TTS — forced English)
  // ═══════════════════════════════════════════

  /**
   * Phát âm từ bằng giọng tiếng Anh, cố định ngôn ngữ en-US.
   * Chủ động chọn voice tiếng Anh từ danh sách voices của trình duyệt/HĐH
   * để tránh trình duyệt mobile tự chọn giọng theo ngôn ngữ hệ thống (VD: tiếng Việt).
   *
   * Thứ tự ưu tiên voice:
   *   1. en-US  (Google US English, Samantha, ...)
   *   2. en-GB  (Google UK English, Daniel, ...)
   *   3. en-AU / en-CA / bất kỳ en-* nào
   *   4. Fallback: dùng lang='en-US' mà không chỉ định voice
   */
  speak(text: string): void {
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.volume = 1;

    const doSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const englishVoice = this.pickEnglishVoice(voices);
      if (englishVoice) {
        utterance.voice = englishVoice;
      }
      window.speechSynthesis.speak(utterance);
    };

    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      // Voices đã sẵn sàng (desktop Chrome/Firefox)
      doSpeak();
    } else {
      // Voices chưa load xong — cần chờ sự kiện voiceschanged (Android/iOS/Safari)
      const onVoicesChanged = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        doSpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onVoicesChanged);

      // Fallback timeout: nếu sau 800ms vẫn không có voices, phát không chỉ định voice
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onVoicesChanged);
        if (!utterance.voice) {
          window.speechSynthesis.speak(utterance);
        }
      }, 800);
    }
  }

  /**
   * Chọn voice tiếng Anh theo thứ tự ưu tiên từ danh sách voices.
   * Ưu tiên en-US > en-GB > en-AU/en-CA > bất kỳ en-* nào.
   */
  private pickEnglishVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
    if (!voices || voices.length === 0) return null;

    // Thứ tự ưu tiên các locale tiếng Anh
    const preferred = ['en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN', 'en-NZ'];

    for (const locale of preferred) {
      // Tìm voice khớp chính xác locale (VD: "Google US English")
      const exact = voices.find(v =>
        v.lang.toLowerCase() === locale.toLowerCase()
      );
      if (exact) return exact;
    }

    // Fallback: bất kỳ voice nào có lang bắt đầu bằng 'en'
    const anyEnglish = voices.find(v =>
      v.lang.toLowerCase().startsWith('en')
    );
    if (anyEnglish) return anyEnglish;

    return null;
  }



  // ═══════════════════════════════════════════
  //  Error Handler
  // ═══════════════════════════════════════════

  private handleError(error: any): Observable<never> {
    let message = 'Đã xảy ra lỗi. Vui lòng thử lại.';

    if (error.status === 0) {
      message = 'Không thể kết nối đến máy chủ. Kiểm tra kết nối mạng.';
    } else if (error.status === 400) {
      message = error.error?.message || 'Dữ liệu không hợp lệ.';
    } else if (error.status === 404) {
      message = error.error?.message || 'Không tìm thấy dữ liệu.';
    } else if (error.status === 500) {
      message = 'Lỗi máy chủ. Vui lòng thử lại sau.';
    }

    return throwError(() => new Error(message));
  }
}
