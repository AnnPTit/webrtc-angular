import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VocabularyService } from '../../services/vocabulary.service';
import {
  VocabularyWord,
  VocabularyStats,
  DailySession,
  DailyGoal,
  WeeklyStats,
  DEFAULT_DAILY_GOAL,
} from '../../models/vocabulary.model';

type ActiveTab = 'history' | 'statistics';
type ReviewMode = 'flashcard' | 'quiz' | 'practice';

@Component({
  selector: 'app-vocabulary-history',
  templateUrl: './vocabulary-history.component.html',
  styleUrl: './vocabulary-history.component.css',
  imports: [CommonModule, FormsModule],
})
export class VocabularyHistoryComponent implements OnInit {
  // ── Data ──
  allWords: VocabularyWord[] = [];
  stats: VocabularyStats | null = null;
  dailySessions: DailySession[] = [];
  dailyGoal: DailyGoal = { ...DEFAULT_DAILY_GOAL };
  weeklyStats: WeeklyStats[] = [];
  monthlyStats: WeeklyStats[] = [];

  // ── UI State ──
  activeTab: ActiveTab = 'history';
  expandedDate: string | null = null;
  isLoading = true;
  isLoadingStats = true;
  errorMessage: string | null = null;
  showGoalModal = false;
  goalInput = 10;

  // ── Review in-component ──
  reviewMode: ReviewMode | null = null;
  reviewWords: VocabularyWord[] = [];
  reviewIndex = 0;
  reviewFlipped = false;
  reviewScore = 0;
  reviewAnswered = 0;
  reviewFinished = false;
  quizOptions: { text: string; correct: boolean; selected: boolean }[] = [];
  quizAnswered = false;
  practiceAnswer = '';
  practiceSubmitted = false;
  practiceCorrect = false;

  // ── Toast ──
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | 'info' = 'success';
  private toastTimeout: any;

  private readonly GOAL_KEY = 'vocab_daily_goal';

  constructor(
    private vocabService: VocabularyService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadGoalFromStorage();
    this.loadData();
  }

  // ═══════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════

  loadData(): void {
    const userId = this.currentUserId;
    if (!userId) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    // Load ALL vocabulary (including unlearned) instead of only user progress
    this.vocabService.getAllVocabulary(userId).subscribe({
      next: words => {
        this.allWords = words;
        this.buildDailySessions();
        this.buildWeeklyStats();
        this.buildMonthlyStats();
        this.updateStreak();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMessage = err.message || 'Không thể tải lịch sử học tập.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });

    this.vocabService.getUserStats(userId).subscribe({
      next: stats => {
        this.stats = stats;
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingStats = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ═══════════════════════════════════════════
  //  DATE GROUPING
  // ═══════════════════════════════════════════

  private buildDailySessions(): void {
    const grouped = new Map<string, VocabularyWord[]>();

    for (const word of this.allWords) {
      const dateKey = this.toDateKey(word.createdAt);
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, []);
      }
      grouped.get(dateKey)!.push(word);
    }

    this.dailySessions = Array.from(grouped.entries())
      .map(([date, words]) => {
        const learnedWords = words.filter(w => w.learned).length;
        const totalWords = words.length;
        return {
          date,
          displayDate: this.formatDisplayDate(date),
          words,
          totalWords,
          learnedWords,
          completionPercent: totalWords > 0 ? Math.round((learnedWords / totalWords) * 100) : 0,
          goalMet: learnedWords >= this.dailyGoal.wordsPerDay,
        };
      })
      .sort((a, b) => b.date.localeCompare(a.date)); // newest first
  }

  // ═══════════════════════════════════════════
  //  WEEKLY & MONTHLY STATS
  // ═══════════════════════════════════════════

  private buildWeeklyStats(): void {
    const now = new Date();
    this.weeklyStats = [];

    for (let i = 0; i < 4; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekEnd.getDate() - 6);

      const startKey = this.toDateKeyFromDate(weekStart);
      const endKey = this.toDateKeyFromDate(weekEnd);

      const sessionsInWeek = this.dailySessions.filter(
        s => s.date >= startKey && s.date <= endKey,
      );

      const wordsCreated = sessionsInWeek.reduce((sum, s) => sum + s.totalWords, 0);
      const wordsLearned = sessionsInWeek.reduce((sum, s) => sum + s.learnedWords, 0);
      const daysWithGoalMet = sessionsInWeek.filter(s => s.goalMet).length;
      const goalCompletionRate = sessionsInWeek.length > 0
        ? Math.round((daysWithGoalMet / 7) * 100)
        : 0;

      this.weeklyStats.push({
        weekLabel: i === 0 ? 'Tuần này' : i === 1 ? 'Tuần trước' : `${i} tuần trước`,
        wordsCreated,
        wordsLearned,
        goalCompletionRate,
      });
    }
  }

  private buildMonthlyStats(): void {
    const now = new Date();
    this.monthlyStats = [];
    const monthNames = ['Th1', 'Th2', 'Th3', 'Th4', 'Th5', 'Th6', 'Th7', 'Th8', 'Th9', 'Th10', 'Th11', 'Th12'];

    for (let i = 0; i < 6; i++) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

      const sessionsInMonth = this.dailySessions.filter(s => s.date.startsWith(monthKey));

      const wordsCreated = sessionsInMonth.reduce((sum, s) => sum + s.totalWords, 0);
      const wordsLearned = sessionsInMonth.reduce((sum, s) => sum + s.learnedWords, 0);
      const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      const daysWithGoalMet = sessionsInMonth.filter(s => s.goalMet).length;
      const goalCompletionRate = Math.round((daysWithGoalMet / daysInMonth) * 100);

      this.monthlyStats.push({
        weekLabel: i === 0 ? 'Tháng này' : `${monthNames[month.getMonth()]} ${month.getFullYear()}`,
        wordsCreated,
        wordsLearned,
        goalCompletionRate,
      });
    }
  }

  // ═══════════════════════════════════════════
  //  DAILY GOAL & STREAK
  // ═══════════════════════════════════════════

  private loadGoalFromStorage(): void {
    const userId = this.currentUserId;
    if (!userId) return;

    const key = `${this.GOAL_KEY}_${userId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        this.dailyGoal = { ...DEFAULT_DAILY_GOAL, ...JSON.parse(stored) };
        this.goalInput = this.dailyGoal.wordsPerDay;
      } catch {
        this.dailyGoal = { ...DEFAULT_DAILY_GOAL };
      }
    }
  }

  private saveGoalToStorage(): void {
    const userId = this.currentUserId;
    if (!userId) return;
    const key = `${this.GOAL_KEY}_${userId}`;
    localStorage.setItem(key, JSON.stringify(this.dailyGoal));
  }

  openGoalModal(): void {
    this.goalInput = this.dailyGoal.wordsPerDay;
    this.showGoalModal = true;
  }

  closeGoalModal(): void {
    this.showGoalModal = false;
  }

  saveGoal(): void {
    if (this.goalInput < 1) this.goalInput = 1;
    if (this.goalInput > 100) this.goalInput = 100;
    this.dailyGoal.wordsPerDay = this.goalInput;
    this.saveGoalToStorage();
    this.buildDailySessions(); // recalculate goalMet
    this.buildWeeklyStats();
    this.buildMonthlyStats();
    this.showGoalModal = false;
    this.showToast(`Mục tiêu đã được cập nhật: ${this.goalInput} từ/ngày`, 'success');
  }

  private updateStreak(): void {
    const today = this.todayKey;
    const todaySession = this.dailySessions.find(s => s.date === today);
    const todayLearned = todaySession?.learnedWords || 0;

    // Update history
    this.dailyGoal.history[today] = todayLearned;

    // Calculate streak
    let streak = 0;
    const checkDate = new Date();

    // If today has no learned words, start checking from yesterday
    if (todayLearned === 0) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (true) {
      const key = this.toDateKeyFromDate(checkDate);
      const session = this.dailySessions.find(s => s.date === key);
      if (session && session.learnedWords > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    this.dailyGoal.streakDays = streak;
    this.dailyGoal.lastActiveDate = todayLearned > 0 ? today : this.dailyGoal.lastActiveDate;
    this.saveGoalToStorage();
  }

  get todayKey(): string {
    return this.toDateKeyFromDate(new Date());
  }

  get todaySession(): DailySession | undefined {
    return this.dailySessions.find(s => s.date === this.todayKey);
  }

  get todayLearnedCount(): number {
    return this.todaySession?.learnedWords || 0;
  }

  get todayTotalCount(): number {
    return this.todaySession?.totalWords || 0;
  }

  get goalProgress(): number {
    if (this.dailyGoal.wordsPerDay === 0) return 100;
    return Math.min(100, Math.round((this.todayLearnedCount / this.dailyGoal.wordsPerDay) * 100));
  }

  get goalReached(): boolean {
    return this.todayLearnedCount >= this.dailyGoal.wordsPerDay;
  }

  // ═══════════════════════════════════════════
  //  SESSION INTERACTION
  // ═══════════════════════════════════════════

  toggleDate(date: string): void {
    this.expandedDate = this.expandedDate === date ? null : date;
    // Close review mode when toggling dates
    if (this.reviewMode) {
      this.closeReview();
    }
  }

  isExpanded(date: string): boolean {
    return this.expandedDate === date;
  }

  getExpandedSession(): DailySession | null {
    return this.dailySessions.find(s => s.date === this.expandedDate) || null;
  }

  // ═══════════════════════════════════════════
  //  IN-COMPONENT REVIEW
  // ═══════════════════════════════════════════

  startReview(mode: ReviewMode, session: DailySession): void {
    this.reviewWords = this.shuffleArray([...session.words]);
    this.reviewMode = mode;
    this.reviewIndex = 0;
    this.reviewFlipped = false;
    this.reviewScore = 0;
    this.reviewAnswered = 0;
    this.reviewFinished = false;
    this.quizAnswered = false;
    this.practiceSubmitted = false;
    this.practiceAnswer = '';

    if (mode === 'quiz') {
      this.generateQuizOptions();
    }
  }

  closeReview(): void {
    this.reviewMode = null;
    this.reviewWords = [];
    this.reviewIndex = 0;
    this.reviewFinished = false;
  }

  // Flashcard
  flipReviewCard(): void {
    this.reviewFlipped = !this.reviewFlipped;
  }

  flashcardKnew(): void {
    this.reviewAnswered++;
    this.reviewScore++;
    // If word is unlearned, mark as learned
    this.markLearnedIfCorrect(this.currentReviewWord);
    this.nextReviewCard();
  }

  flashcardDidntKnow(): void {
    this.reviewAnswered++;
    this.nextReviewCard();
  }

  // Quiz (multiple choice)
  private generateQuizOptions(): void {
    const current = this.currentReviewWord;
    if (!current) return;

    const correct = current.meaningVi;
    const others = this.reviewWords
      .filter(w => w.id !== current.id && w.meaningVi !== correct)
      .map(w => w.meaningVi);

    const uniqueOthers = [...new Set(others)];
    const wrong = this.shuffleArray(uniqueOthers).slice(0, 3);

    const fallbacks = ['phân tích', 'tổ chức', 'phát triển', 'cải thiện', 'thực hiện'];
    while (wrong.length < 3) {
      const fb = fallbacks[wrong.length];
      if (fb !== correct && !wrong.includes(fb)) wrong.push(fb);
    }

    this.quizOptions = this.shuffleArray([
      { text: correct, correct: true, selected: false },
      ...wrong.map(t => ({ text: t, correct: false, selected: false })),
    ]);
    this.quizAnswered = false;
  }

  selectQuizOption(option: { text: string; correct: boolean; selected: boolean }): void {
    if (this.quizAnswered) return;
    this.quizAnswered = true;
    option.selected = true;
    this.reviewAnswered++;
    if (option.correct) {
      this.reviewScore++;
      this.showToast('Chính xác! 🎉', 'success');
      // If word is unlearned, mark as learned
      this.markLearnedIfCorrect(this.currentReviewWord);
    } else {
      this.showToast('Sai rồi! 😔', 'error');
    }
    this.cdr.markForCheck();
  }

  // Practice (fill blank)
  submitPracticeAnswer(): void {
    if (this.practiceSubmitted || !this.practiceAnswer.trim()) return;
    this.practiceSubmitted = true;
    this.reviewAnswered++;

    const correct = this.currentReviewWord?.word.toLowerCase().trim() || '';
    this.practiceCorrect = this.practiceAnswer.toLowerCase().trim() === correct;

    if (this.practiceCorrect) {
      this.reviewScore++;
      this.showToast('Chính xác! 🎉', 'success');
      // If word is unlearned, mark as learned
      this.markLearnedIfCorrect(this.currentReviewWord);
    } else {
      this.showToast(`Đáp án: ${this.currentReviewWord?.word}`, 'error');
    }
    this.cdr.markForCheck();
  }

  nextReviewCard(): void {
    if (this.reviewIndex < this.reviewWords.length - 1) {
      this.reviewIndex++;
      this.reviewFlipped = false;
      this.quizAnswered = false;
      this.practiceSubmitted = false;
      this.practiceCorrect = false;
      this.practiceAnswer = '';
      if (this.reviewMode === 'quiz') {
        this.generateQuizOptions();
      }
    } else {
      this.reviewFinished = true;
    }
    this.cdr.markForCheck();
  }

  get currentReviewWord(): VocabularyWord | null {
    return this.reviewWords[this.reviewIndex] || null;
  }

  get reviewProgress(): number {
    if (this.reviewWords.length === 0) return 0;
    return ((this.reviewIndex + 1) / this.reviewWords.length) * 100;
  }

  get reviewScorePercent(): number {
    if (this.reviewAnswered === 0) return 0;
    return Math.round((this.reviewScore / this.reviewAnswered) * 100);
  }

  // ═══════════════════════════════════════════
  //  MARK LEARNED ON CORRECT ANSWER
  // ═══════════════════════════════════════════

  /**
   * If the word is currently unlearned, call the API to mark it as learned.
   * If already learned, do nothing (keep existing status).
   */
  private markLearnedIfCorrect(word: VocabularyWord | null): void {
    if (!word || word.learned) return; // Already learned → keep as is

    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.updateProgress({
      userId,
      vocabularyId: word.id,
      learnedFlag: true,
    }).subscribe({
      next: (updated) => {
        // Update in allWords
        const idx = this.allWords.findIndex(w => w.id === updated.id);
        if (idx !== -1) this.allWords[idx] = updated;

        // Update in reviewWords
        const ridx = this.reviewWords.findIndex(w => w.id === updated.id);
        if (ridx !== -1) this.reviewWords[ridx] = updated;

        // Update in dailySessions
        for (const session of this.dailySessions) {
          const sidx = session.words.findIndex(w => w.id === updated.id);
          if (sidx !== -1) {
            session.words[sidx] = updated;
            // Recalculate session stats
            session.learnedWords = session.words.filter(w => w.learned).length;
            session.completionPercent = session.totalWords > 0
              ? Math.round((session.learnedWords / session.totalWords) * 100)
              : 0;
            session.goalMet = session.learnedWords >= this.dailyGoal.wordsPerDay;
            break;
          }
        }

        this.showToast(`"${updated.word}" đã được đánh dấu là đã học! ✅`, 'info');
        this.cdr.markForCheck();
      },
      error: () => {
        // Silent fail — don't disrupt the review flow
        console.error('Failed to mark word as learned:', word.word);
      },
    });
  }

  restartReview(): void {
    const mode = this.reviewMode;
    const session = this.getExpandedSession();
    if (mode && session) {
      this.startReview(mode, session);
    }
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  goToLearn(): void {
    this.router.navigate(['/vocabulary']);
  }

  goToStats(): void {
    this.router.navigate(['/vocabulary/stats']);
  }

  goToReview(): void {
    this.router.navigate(['/vocabulary/review']);
  }

  // ═══════════════════════════════════════════
  //  COMPUTED STATS
  // ═══════════════════════════════════════════

  get totalLearnedAllTime(): number {
    return this.stats?.totalWordsLearned || 0;
  }

  get totalStudiedAllTime(): number {
    return this.stats?.totalWordsStudied || 0;
  }

  get overallCompletionRate(): number {
    if (!this.stats || this.stats.totalWordsStudied === 0) return 0;
    return Math.round((this.stats.totalWordsLearned / this.stats.totalWordsStudied) * 100);
  }

  get maxWeeklyWords(): number {
    return Math.max(...this.weeklyStats.map(w => w.wordsCreated), 1);
  }

  get maxWeeklyLearned(): number {
    return Math.max(...this.weeklyStats.map(w => w.wordsLearned), 1);
  }

  get maxMonthlyWords(): number {
    return Math.max(...this.monthlyStats.map(m => m.wordsCreated), 1);
  }

  get maxMonthlyLearned(): number {
    return Math.max(...this.monthlyStats.map(m => m.wordsLearned), 1);
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  get currentUserId(): number | null {
    return this.authService.getCurrentUser()?.userId ?? null;
  }

  get username(): string {
    return this.authService.getCurrentUser()?.fullName || 'Học viên';
  }

  private toDateKey(isoString: string): string {
    if (!isoString) return '1970-01-01';
    return isoString.substring(0, 10); // YYYY-MM-DD
  }

  private toDateKeyFromDate(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private formatDisplayDate(dateKey: string): string {
    const today = this.todayKey;
    const yesterday = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return this.toDateKeyFromDate(d);
    })();

    if (dateKey === today) return 'Hôm nay';
    if (dateKey === yesterday) return 'Hôm qua';

    const date = new Date(dateKey + 'T00:00:00');
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const day = dayNames[date.getDay()];
    return `${day}, ${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  getStatusLabel(session: DailySession): string {
    return session.goalMet ? 'Hoàn thành' : 'Đang học';
  }

  getStatusClass(session: DailySession): string {
    return session.goalMet ? 'status-completed' : 'status-progress';
  }

  getWordTypeBadgeClass(wordType: string): string {
    const map: Record<string, string> = {
      noun: 'badge-noun', verb: 'badge-verb', adjective: 'badge-adj',
      adverb: 'badge-adv', preposition: 'badge-prep', phrase: 'badge-phrase',
    };
    return map[wordType] || 'badge-default';
  }

  playWord(word: VocabularyWord): void {
    this.vocabService.speak(word.word);
  }

  trackByDate(index: number, session: DailySession): string {
    return session.date;
  }

  trackByWordId(index: number, word: VocabularyWord): number {
    return word.id;
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.cdr.markForCheck();
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 2500);
  }

  dismissToast(): void {
    this.toastMessage = null;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }
}
