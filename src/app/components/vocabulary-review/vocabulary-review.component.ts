import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VocabularyService } from '../../services/vocabulary.service';
import { VocabularyWord } from '../../models/vocabulary.model';

type ReviewMode = 'flashcard' | 'multiple-choice' | 'fill-blank';

interface QuizOption {
  text: string;
  isCorrect: boolean;
  selected: boolean;
}

@Component({
  selector: 'app-vocabulary-review',
  templateUrl: './vocabulary-review.component.html',
  styleUrl: './vocabulary-review.component.css',
  imports: [CommonModule, FormsModule],
})
export class VocabularyReviewComponent implements OnInit {
  // ── State ──
  reviewWords: VocabularyWord[] = [];
  currentIndex = 0;
  mode: ReviewMode = 'flashcard';
  isLoading = true;
  errorMessage: string | null = null;

  // ── Flashcard ──
  isFlipped = false;

  // ── Multiple Choice ──
  mcOptions: QuizOption[] = [];
  mcAnswered = false;
  mcCorrect = false;

  // ── Fill Blank ──
  fillAnswer = '';
  fillSubmitted = false;
  fillCorrect = false;

  // ── Score ──
  totalAnswered = 0;
  totalCorrect = 0;
  quizFinished = false;

  // ── Toast ──
  toastMessage: string | null = null;
  toastType: 'success' | 'error' = 'success';
  private toastTimeout: any;

  constructor(
    private vocabService: VocabularyService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadReviewWords();
  }

  // ═══════════════════════════════════════════
  //  DATA
  // ═══════════════════════════════════════════

  private loadReviewWords(): void {
    const userId = this.currentUserId;
    if (!userId) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng.';
      this.isLoading = false;
      return;
    }

    // Load review words first, fallback to all progress words
    this.vocabService.getReviewWords(userId).subscribe({
      next: words => {
        if (words.length > 0) {
          this.reviewWords = this.shuffleArray(words);
        } else {
          // Fallback: load all user progress words
          this.loadAllWords(userId);
          return;
        }
        this.isLoading = false;
        this.setupCurrentQuestion();
        this.cdr.markForCheck();
      },
      error: () => {
        this.loadAllWords(userId);
      },
    });
  }

  private loadAllWords(userId: number): void {
    this.vocabService.getUserProgress(userId).subscribe({
      next: words => {
        if (words.length > 0) {
          this.reviewWords = this.shuffleArray(words);
        } else {
          this.errorMessage = 'Chưa có từ vựng để ôn tập. Hãy học từ mới trước!';
        }
        this.isLoading = false;
        this.setupCurrentQuestion();
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMessage = err.message || 'Không thể tải từ vựng.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ═══════════════════════════════════════════
  //  MODE SWITCHING
  // ═══════════════════════════════════════════

  switchMode(mode: ReviewMode): void {
    this.mode = mode;
    this.resetQuiz();
  }

  resetQuiz(): void {
    this.currentIndex = 0;
    this.totalAnswered = 0;
    this.totalCorrect = 0;
    this.quizFinished = false;
    this.isFlipped = false;
    this.mcAnswered = false;
    this.fillSubmitted = false;
    this.fillAnswer = '';
    this.reviewWords = this.shuffleArray(this.reviewWords);
    this.setupCurrentQuestion();
    this.cdr.markForCheck();
  }

  // ═══════════════════════════════════════════
  //  QUESTION SETUP
  // ═══════════════════════════════════════════

  private setupCurrentQuestion(): void {
    if (this.reviewWords.length === 0 || this.currentIndex >= this.reviewWords.length) return;

    this.isFlipped = false;
    this.mcAnswered = false;
    this.mcCorrect = false;
    this.fillSubmitted = false;
    this.fillCorrect = false;
    this.fillAnswer = '';

    if (this.mode === 'multiple-choice') {
      this.generateMCOptions();
    }
  }

  private generateMCOptions(): void {
    const currentWord = this.currentWord;
    if (!currentWord) return;

    const correctAnswer = currentWord.meaningVi;
    const otherWords = this.reviewWords.filter(w => w.id !== currentWord.id);

    // Pick 3 random wrong answers
    const wrongAnswers: string[] = [];
    const shuffled = this.shuffleArray([...otherWords]);
    for (const w of shuffled) {
      if (wrongAnswers.length >= 3) break;
      if (w.meaningVi !== correctAnswer && !wrongAnswers.includes(w.meaningVi)) {
        wrongAnswers.push(w.meaningVi);
      }
    }

    // If not enough wrong answers, pad with placeholders
    const fallbacks = ['kiểm tra', 'phân tích', 'tổ chức', 'phát triển', 'cải thiện'];
    while (wrongAnswers.length < 3) {
      const fb = fallbacks[wrongAnswers.length];
      if (fb !== correctAnswer) wrongAnswers.push(fb);
    }

    // Create and shuffle options
    this.mcOptions = this.shuffleArray([
      { text: correctAnswer, isCorrect: true, selected: false },
      ...wrongAnswers.map(text => ({ text, isCorrect: false, selected: false })),
    ]);
  }

  // ═══════════════════════════════════════════
  //  ANSWERS
  // ═══════════════════════════════════════════

  // Flashcard
  flipCard(): void {
    this.isFlipped = !this.isFlipped;
  }

  flashcardKnew(): void {
    this.totalAnswered++;
    this.totalCorrect++;
    this.nextQuestion();
  }

  flashcardDidntKnow(): void {
    this.totalAnswered++;
    this.nextQuestion();
  }

  // Multiple Choice
  selectMCOption(option: QuizOption): void {
    if (this.mcAnswered) return;

    this.mcAnswered = true;
    option.selected = true;
    this.mcCorrect = option.isCorrect;
    this.totalAnswered++;

    if (option.isCorrect) {
      this.totalCorrect++;
      this.showToast('Chính xác! 🎉', 'success');
    } else {
      this.showToast('Sai rồi! 😔', 'error');
    }
    this.cdr.markForCheck();
  }

  // Fill Blank
  submitFillAnswer(): void {
    if (this.fillSubmitted || !this.fillAnswer.trim()) return;

    this.fillSubmitted = true;
    this.totalAnswered++;

    const correct = this.currentWord?.word.toLowerCase().trim() || '';
    const answer = this.fillAnswer.toLowerCase().trim();
    this.fillCorrect = answer === correct;

    if (this.fillCorrect) {
      this.totalCorrect++;
      this.showToast('Chính xác! 🎉', 'success');
    } else {
      this.showToast(`Đáp án đúng: ${this.currentWord?.word}`, 'error');
    }
    this.cdr.markForCheck();
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  nextQuestion(): void {
    if (this.currentIndex < this.reviewWords.length - 1) {
      this.currentIndex++;
      this.setupCurrentQuestion();
      this.cdr.markForCheck();
    } else {
      this.quizFinished = true;
      this.cdr.markForCheck();
    }
  }

  get currentWord(): VocabularyWord | null {
    return this.reviewWords[this.currentIndex] || null;
  }

  get progressPercent(): number {
    if (this.reviewWords.length === 0) return 0;
    return ((this.currentIndex + 1) / this.reviewWords.length) * 100;
  }

  get scorePercent(): number {
    if (this.totalAnswered === 0) return 0;
    return Math.round((this.totalCorrect / this.totalAnswered) * 100);
  }

  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  goToLearn(): void {
    this.router.navigate(['/vocabulary']);
  }

  goToStats(): void {
    this.router.navigate(['/vocabulary/stats']);
  }

  get currentUserId(): number | null {
    return this.authService.getCurrentUser()?.userId ?? null;
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  playPronunciation(): void {
    if (this.currentWord) {
      this.vocabService.speak(this.currentWord.word);
    }
  }

  private showToast(message: string, type: 'success' | 'error'): void {
    this.toastMessage = message;
    this.toastType = type;
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
