import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogService, BlogPost } from '../../services/blog.service';
import { BlogRendererComponent } from '../blog-editor/blog-renderer.component';

/**
 * Public read-only view of a single published blog post (GET /api/blogs/public/{id}).
 * Content authored by another user is rendered with trusted=false so Angular
 * sanitizes it.
 */
@Component({
  selector: 'app-blog-post',
  standalone: true,
  imports: [RouterLink, BlogRendererComponent],
  templateUrl: './blog-post.component.html',
  styleUrl: './blog-post.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogPostComponent implements OnInit {
  private blogService = inject(BlogService);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  post = signal<BlogPost | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.isBrowser) return;
    const idParam = this.route.snapshot.queryParamMap.get('id');
    const id = Number(idParam);
    if (!idParam || Number.isNaN(id)) {
      this.error.set('Không tìm thấy bài viết.');
      this.loading.set(false);
      return;
    }
    this.load(id);
  }

  private load(id: number): void {
    this.loading.set(true);
    this.error.set(null);
    this.blogService.getPublic(id).subscribe({
      next: post => {
        this.post.set(post);
        this.loading.set(false);
      },
      error: err => {
        this.error.set(err.message || 'Không tải được bài viết.');
        this.loading.set(false);
      },
    });
  }

  publishedLabel(): string {
    const p = this.post();
    const iso = p?.publishedAt || p?.updatedAt || p?.createdAt;
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}
