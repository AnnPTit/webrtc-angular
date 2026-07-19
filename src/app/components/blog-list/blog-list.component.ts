import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { BlogService, BlogSummary } from '../../services/blog.service';
import { AuthService } from '../../services/auth.service';

/**
 * "Bài viết của tôi" — lists the current user's blog posts (from
 * GET /api/blogs/mine) with open / delete actions and a new-post button.
 */
@Component({
  selector: 'app-blog-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-list.component.html',
  styleUrl: './blog-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogListComponent implements OnInit {
  private blogService = inject(BlogService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  posts = signal<BlogSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);
  confirmingId = signal<number | null>(null);
  toast = signal<{ type: 'success' | 'error'; msg: string } | null>(null);

  readonly backRoute = this.auth.isLecturerOrAdmin() ? '/dashboard' : '/home';

  ngOnInit(): void {
    if (this.isBrowser) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.blogService.listMine().subscribe({
      next: posts => {
        this.posts.set(posts);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Không tải được danh sách bài viết.');
        this.loading.set(false);
      },
    });
  }

  newPost(): void {
    this.router.navigate(['/blog/editor']);
  }

  openPost(id: number): void {
    this.router.navigate(['/blog/editor'], { queryParams: { id } });
  }

  askDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.confirmingId.set(id);
  }

  cancelDelete(event: Event): void {
    event.stopPropagation();
    this.confirmingId.set(null);
  }

  confirmDelete(id: number, event: Event): void {
    event.stopPropagation();
    this.blogService.delete(id).subscribe({
      next: () => {
        this.posts.update(list => list.filter(p => p.id !== id));
        this.confirmingId.set(null);
        this.showToast('success', 'Đã xóa bài viết.');
      },
      error: err => {
        this.confirmingId.set(null);
        this.showToast('error', err.message || 'Xóa thất bại.');
      },
    });
  }

  isDraft(status: string): boolean {
    return status !== 'PUBLISHED';
  }

  displayDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private showToast(type: 'success' | 'error', msg: string): void {
    this.toast.set({ type, msg });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3000);
  }

  dismissToast(): void {
    this.toast.set(null);
  }
}
