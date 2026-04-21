import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { VocabularyService } from '../../services/vocabulary.service';
import { VocabularyStats, VocabularyWord } from '../../models/vocabulary.model';

@Component({
  selector: 'app-vocabulary-stats',
  templateUrl: './vocabulary-stats.component.html',
  styleUrl: './vocabulary-stats.component.css',
  imports: [CommonModule],
})
export class VocabularyStatsComponent implements OnInit {
  stats: VocabularyStats | null = null;
  recentWords: VocabularyWord[] = [];
  isLoading = true;
  isLoadingWords = true;
  errorMessage: string | null = null;

  constructor(
    private vocabService: VocabularyService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadStats();
    this.loadProgress();
  }

  // ═══════════════════════════════════════════
  //  DATA
  // ═══════════════════════════════════════════

  private loadStats(): void {
    const userId = this.currentUserId;
    if (!userId) {
      this.errorMessage = 'Không tìm thấy thông tin người dùng.';
      this.isLoading = false;
      return;
    }

    this.vocabService.getUserStats(userId).subscribe({
      next: stats => {
        this.stats = stats;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: err => {
        this.errorMessage = err.message || 'Không thể tải thống kê.';
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  private loadProgress(): void {
    const userId = this.currentUserId;
    if (!userId) return;

    this.vocabService.getUserProgress(userId).subscribe({
      next: words => {
        this.recentWords = words.slice(0, 10); // Show last 10
        this.isLoadingWords = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.isLoadingWords = false;
        this.cdr.markForCheck();
      },
    });
  }

  // ═══════════════════════════════════════════
  //  COMPUTED
  // ═══════════════════════════════════════════

  get topicEntries(): { name: string; count: number; percentage: number }[] {
    if (!this.stats?.topicBreakdown) return [];
    const entries = Object.entries(this.stats.topicBreakdown);
    const max = Math.max(...entries.map(([, v]) => v), 1);
    return entries
      .map(([name, count]) => ({
        name,
        count,
        percentage: (count / max) * 100,
      }))
      .sort((a, b) => b.count - a.count);
  }

  get accuracyRate(): number {
    const total = this.recentWords.reduce((sum, w) => sum + w.correctCount + w.wrongCount, 0);
    if (total === 0) return 0;
    const correct = this.recentWords.reduce((sum, w) => sum + w.correctCount, 0);
    return Math.round((correct / total) * 100);
  }

  get learnedPercentage(): number {
    if (!this.stats || !this.stats.totalWordsStudied) return 0;
    return Math.round((this.stats.totalWordsLearned / this.stats.totalWordsStudied) * 100);
  }

  getTopicColor(index: number): string {
    const colors = ['#4ecca3', '#45b7d1', '#f093fb', '#feca57', '#f5576c', '#a78bfa', '#34d399', '#fb923c', '#38bdf8', '#e879f9'];
    return colors[index % colors.length];
  }

  // ═══════════════════════════════════════════
  //  NAVIGATION
  // ═══════════════════════════════════════════

  goBack(): void {
    this.router.navigate(['/vocabulary']);
  }

  goToReview(): void {
    this.router.navigate(['/vocabulary/review']);
  }

  goToFavorites(): void {
    this.router.navigate(['/vocabulary/favorites']);
  }

  goToLearn(): void {
    this.router.navigate(['/vocabulary']);
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
      return user.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return 'ST';
  }
}
