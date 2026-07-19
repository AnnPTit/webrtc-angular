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
 * Public community feed — lists every published blog post (GET /api/blogs/feed)
 * so users can discover and read each other's articles.
 */
@Component({
  selector: 'app-blog-feed',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './blog-feed.component.html',
  styleUrl: './blog-feed.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogFeedComponent implements OnInit {
  private blogService = inject(BlogService);
  private router = inject(Router);
  private auth = inject(AuthService);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  posts = signal<BlogSummary[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  readonly isAuthed = this.auth.isAuthenticated();

  ngOnInit(): void {
    if (this.isBrowser) {
      this.load();
    }
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.blogService.feed().subscribe({
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

  openPost(id: number): void {
    this.router.navigate(['/blog/post'], { queryParams: { id } });
  }

  initials(name: string | null | undefined): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    const last = parts[parts.length - 1] || '';
    return last.charAt(0).toUpperCase() || '?';
  }

  displayDate(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
