import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VocabularyService } from '../../services/vocabulary.service';
import {
  VocabularyWord,
  VocabularyStats,
  LEVELS,
  QUANTITIES,
  LevelOption,
} from '../../models/vocabulary.model';

@Component({
  selector: 'app-vocabulary-learning',
  templateUrl: './vocabulary-learning.component.html',
  styleUrl: './vocabulary-learning.component.css',
  imports: [CommonModule, FormsModule],
})
export class VocabularyLearningComponent implements OnInit {
  // ── Filter State ──
  topics: string[] = [];
  levels: LevelOption[] = LEVELS;
  quantities = QUANTITIES;
  selectedTopic = '';
  selectedLevel = 'B1';
  selectedQuantity = 10;

  // ── Data ──
  words: VocabularyWord[] = [];
  stats: VocabularyStats | null = null;

  // ── UI State ──
  isLoading = false;
  isLoadingTopics = true;
  isLoadingStats = true;
  errorMessage: string | null = null;
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | 'info' = 'success';
  currentCardIndex = 0;
  viewMode: 'grid' | 'single' = 'grid';
  flippedCards: Set<number> = new Set();

  private toastTimeout: any;

  constructor(
    private vocabService: VocabularyService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadTopics();
    this.loadStats();
  }

  // ═══════════════════════════════════════════
  //  DATA LOADING
  // ═══════════════════════════════════════════

  loadTopics(): void {
    this.isLoadingTopics = true;
    this.vocabService.getTopics().subscribe({
      next: topics => {
        this.topics = topics;
        if (topics.length > 0) {
          this.selectedTopic = topics[0];
        }
        this.isLoadingTopics = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.showToast('Không thể tải danh sách chủ đề', 'error');
        this.isLoadingTopics = false;
        this.cdr.markForCheck();
      },
    });
  }

  loadStats(): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.isLoadingStats = true;
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

  generateWords(): void {
    const userId = this.currentUserId;
    if (!userId || !this.selectedTopic) return;

    this.isLoading = true;
    this.errorMessage = null;
    this.words = [];
    this.currentCardIndex = 0;
    this.flippedCards.clear();

    this.vocabService.generateVocabulary({
      topic: this.selectedTopic,
      level: this.selectedLevel,
      quantity: this.selectedQuantity,
      userId,
    }).subscribe({
      next: words => {
        this.words = words;
        this.isLoading = false;
        this.showToast(`Đã tạo ${words.length} từ vựng mới!`, 'success');
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMessage = err.message || 'Không thể tạo từ vựng. Vui lòng thử lại.';
        this.isLoading = false;
        this.showToast(this.errorMessage!, 'error');
        this.cdr.markForCheck();
      },
    });
  }

  // ═══════════════════════════════════════════
  //  WORD ACTIONS
  // ═══════════════════════════════════════════

  toggleLearned(word: VocabularyWord): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.updateProgress({
      userId,
      vocabularyId: word.id,
      learnedFlag: !word.learned,
    }).subscribe({
      next: updated => {
        this.updateWord(updated);
        this.showToast(
          updated.learned ? `"${word.word}" đã được đánh dấu đã học!` : `Đã bỏ đánh dấu "${word.word}"`,
          'success',
        );
        this.loadStats();
      },
      error: () => this.showToast('Không thể cập nhật. Thử lại.', 'error'),
    });
  }

  toggleFavorite(word: VocabularyWord): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.updateProgress({
      userId,
      vocabularyId: word.id,
      favoriteFlag: !word.favorite,
    }).subscribe({
      next: updated => {
        this.updateWord(updated);
        this.showToast(
          updated.favorite ? `Đã thêm "${word.word}" vào yêu thích!` : `Đã bỏ yêu thích "${word.word}"`,
          updated.favorite ? 'success' : 'info',
        );
        this.loadStats();
      },
      error: () => this.showToast('Không thể cập nhật. Thử lại.', 'error'),
    });
  }

  markForReview(word: VocabularyWord): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.updateProgress({
      userId,
      vocabularyId: word.id,
      needReviewFlag: !word.needReview,
    }).subscribe({
      next: updated => {
        this.updateWord(updated);
        this.showToast(
          updated.needReview ? `"${word.word}" sẽ được ôn tập sau!` : `Đã bỏ đánh dấu ôn tập "${word.word}"`,
          'info',
        );
      },
      error: () => this.showToast('Không thể cập nhật. Thử lại.', 'error'),
    });
  }

  playPronunciation(word: VocabularyWord): void {
    this.vocabService.speak(word.word);
  }

  // ═══════════════════════════════════════════
  //  CARD NAVIGATION
  // ═══════════════════════════════════════════

  toggleFlip(wordId: number): void {
    if (this.flippedCards.has(wordId)) {
      this.flippedCards.delete(wordId);
    } else {
      this.flippedCards.add(wordId);
    }
  }

  isFlipped(wordId: number): boolean {
    return this.flippedCards.has(wordId);
  }

  nextCard(): void {
    if (this.currentCardIndex < this.words.length - 1) {
      this.currentCardIndex++;
    }
  }

  prevCard(): void {
    if (this.currentCardIndex > 0) {
      this.currentCardIndex--;
    }
  }

  goToCard(index: number): void {
    if (index >= 0 && index < this.words.length) {
      this.currentCardIndex = index;
    }
  }

  get currentWord(): VocabularyWord | null {
    return this.words[this.currentCardIndex] || null;
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  goBack(): void {
    this.router.navigate(['/home']);
  }

  goToStats(): void {
    this.router.navigate(['/vocabulary/stats']);
  }

  goToReview(): void {
    this.router.navigate(['/vocabulary/review']);
  }

  goToFavorites(): void {
    this.router.navigate(['/vocabulary/favorites']);
  }

  goToHistory(): void {
    this.router.navigate(['/vocabulary/history']);
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

  get userInitials(): string {
    const user = this.authService.getCurrentUser();
    if (user?.fullName) {
      return user.fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .substring(0, 2)
        .toUpperCase();
    }
    return 'ST';
  }

  getWordTypeBadgeClass(wordType: string): string {
    const typeMap: Record<string, string> = {
      noun: 'badge-noun',
      verb: 'badge-verb',
      adjective: 'badge-adj',
      adverb: 'badge-adv',
      preposition: 'badge-prep',
      phrase: 'badge-phrase',
    };
    return typeMap[wordType] || 'badge-default';
  }

  trackByWordId(index: number, word: VocabularyWord): number {
    return word.id;
  }

  private updateWord(updated: VocabularyWord): void {
    const index = this.words.findIndex(w => w.id === updated.id);
    if (index !== -1) {
      this.words[index] = updated;
      this.words = [...this.words]; // trigger change detection
      this.cdr.markForCheck();
    }
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    this.cdr.markForCheck();

    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastTimeout = setTimeout(() => {
      this.toastMessage = null;
      this.cdr.markForCheck();
    }, 3000);
  }

  dismissToast(): void {
    this.toastMessage = null;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
  }
}
