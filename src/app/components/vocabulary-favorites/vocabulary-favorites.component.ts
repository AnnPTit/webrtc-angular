import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VocabularyService } from '../../services/vocabulary.service';
import { VocabularyWord } from '../../models/vocabulary.model';

@Component({
  selector: 'app-vocabulary-favorites',
  templateUrl: './vocabulary-favorites.component.html',
  styleUrl: './vocabulary-favorites.component.css',
  imports: [CommonModule, FormsModule],
})
export class VocabularyFavoritesComponent implements OnInit {
  favorites: VocabularyWord[] = [];
  filteredFavorites: VocabularyWord[] = [];
  isLoading = true;
  errorMessage: string | null = null;
  searchQuery = '';
  toastMessage: string | null = null;
  toastType: 'success' | 'error' | 'info' = 'info';
  private toastTimeout: any;

  constructor(
    private vocabService: VocabularyService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  // ═══════════════════════════════════════════
  //  DATA
  // ═══════════════════════════════════════════

  loadFavorites(): void {
    const userId = this.currentUserId;
    if (!userId) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng.';
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.vocabService.getFavorites(userId).subscribe({
      next: words => {
        this.favorites = words;
        this.filterFavorites();
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMessage = err.message || 'Không thể tải danh sách yêu thích.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ═══════════════════════════════════════════
  //  SEARCH
  // ═══════════════════════════════════════════

  filterFavorites(): void {
    if (!this.searchQuery.trim()) {
      this.filteredFavorites = this.favorites;
    } else {
      const q = this.searchQuery.toLowerCase();
      this.filteredFavorites = this.favorites.filter(
        w =>
          w.word.toLowerCase().includes(q) ||
          w.meaningVi.toLowerCase().includes(q) ||
          w.meaningEn.toLowerCase().includes(q) ||
          w.topic.toLowerCase().includes(q),
      );
    }
  }

  // ═══════════════════════════════════════════
  //  ACTIONS
  // ═══════════════════════════════════════════

  removeFavorite(word: VocabularyWord): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.updateProgress({
      userId,
      vocabularyId: word.id,
      favoriteFlag: false,
    }).subscribe({
      next: () => {
        this.favorites = this.favorites.filter(w => w.id !== word.id);
        this.filterFavorites();
        this.showToast(`Đã bỏ "${word.word}" khỏi yêu thích`, 'info');
        this.cdr.markForCheck();
      },
      error: () => this.showToast('Không thể cập nhật. Thử lại.', 'error'),
    });
  }

  toggleLearned(word: VocabularyWord): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.updateProgress({
      userId,
      vocabularyId: word.id,
      learnedFlag: !word.learned,
    }).subscribe({
      next: updated => {
        const idx = this.favorites.findIndex(w => w.id === updated.id);
        if (idx !== -1) {
          this.favorites[idx] = updated;
          this.filterFavorites();
        }
        this.showToast(
          updated.learned ? `"${word.word}" đã đánh dấu đã học!` : `Đã bỏ đánh dấu "${word.word}"`,
          'success',
        );
        this.cdr.markForCheck();
      },
      error: () => this.showToast('Không thể cập nhật. Thử lại.', 'error'),
    });
  }

  playPronunciation(word: VocabularyWord): void {
    this.vocabService.speak(word.word);
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

  goToReview(): void {
    this.router.navigate(['/vocabulary/review']);
  }

  // ═══════════════════════════════════════════
  //  HELPERS
  // ═══════════════════════════════════════════

  get currentUserId(): number | null {
    return this.authService.getCurrentUser()?.userId ?? null;
  }

  getWordTypeBadgeClass(wordType: string): string {
    const map: Record<string, string> = {
      noun: 'badge-noun', verb: 'badge-verb', adjective: 'badge-adj',
      adverb: 'badge-adv', preposition: 'badge-prep', phrase: 'badge-phrase',
    };
    return map[wordType] || 'badge-default';
  }

  private showToast(message: string, type: 'success' | 'error' | 'info'): void {
    this.toastMessage = message;
    this.toastType = type;
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
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
