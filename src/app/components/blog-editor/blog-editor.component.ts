import {
  Component,
  ChangeDetectionStrategy,
  OnInit,
  AfterViewInit,
  ViewChild,
  PLATFORM_ID,
  inject,
  signal,
  computed,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BlogService, BlogStatus, SaveBlogRequest } from '../../services/blog.service';
import { RichTextEditorComponent } from './rich-text-editor.component';
import { BlogRendererComponent } from './blog-renderer.component';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

@Component({
  selector: 'app-blog-editor',
  standalone: true,
  imports: [FormsModule, RouterLink, RichTextEditorComponent, BlogRendererComponent],
  templateUrl: './blog-editor.component.html',
  styleUrl: './blog-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogEditorComponent implements OnInit, AfterViewInit {
  private blogService = inject(BlogService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  @ViewChild('editor') editor?: RichTextEditorComponent;

  readonly categorySuggestions = [
    'Frontend',
    'Backend',
    'DevOps',
    'Database',
    'Mobile',
    'AI / Machine Learning',
    'Thuật toán',
    'Kinh nghiệm',
    'Khác',
  ];
  readonly maxTags = 8;

  // Document state
  postId = signal<number | null>(null);
  title = signal<string>('');
  summary = signal<string>('');
  category = signal<string>('');
  tags = signal<string[]>([]);
  tagInput = signal<string>('');
  content = signal<string>('');
  status = signal<BlogStatus>('DRAFT');

  // UI state
  saveState = signal<SaveState>('idle');
  lastSavedAt = signal<Date | null>(null);
  previewMode = signal(false);
  publishing = signal(false);
  loading = signal(false);
  theme = signal<'light' | 'dark'>('light');
  toast = signal<{ type: 'success' | 'error' | 'info'; msg: string } | null>(null);

  canPublish = computed(() => this.title().trim().length > 0);
  isPublished = computed(() => this.status() === 'PUBLISHED');

  private saveTrigger = new Subject<void>();
  private pendingEditorHtml: string | null = null;
  private viewReady = false;

  constructor() {
    this.saveTrigger
      .pipe(debounceTime(1400), takeUntilDestroyed())
      .subscribe(() => this.doSave('auto'));
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;
    // Restore theme preference
    const savedTheme = localStorage.getItem('blog_editor_theme');
    if (savedTheme === 'dark' || savedTheme === 'light') {
      this.theme.set(savedTheme);
    }
    // Load an existing post when ?id= is present
    const idParam = this.route.snapshot.queryParamMap.get('id');
    if (idParam) {
      const id = Number(idParam);
      if (!Number.isNaN(id)) {
        this.loadPost(id);
      }
    }
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    if (this.pendingEditorHtml !== null) {
      this.editor?.setContent(this.pendingEditorHtml);
      this.pendingEditorHtml = null;
    }
  }

  // ── Loading ──

  private loadPost(id: number): void {
    this.loading.set(true);
    this.blogService.get(id).subscribe({
      next: post => {
        this.postId.set(post.id);
        this.title.set(post.title ?? '');
        this.summary.set(post.summary ?? '');
        this.category.set(post.category ?? '');
        this.tags.set(post.tags ?? []);
        this.content.set(post.contentHtml ?? '');
        this.status.set(post.status);
        this.lastSavedAt.set(post.updatedAt ? new Date(post.updatedAt) : null);
        this.saveState.set('saved');
        // Push HTML into the editor (now or once the view is ready)
        if (this.viewReady && this.editor) {
          this.editor.setContent(post.contentHtml ?? '');
        } else {
          this.pendingEditorHtml = post.contentHtml ?? '';
        }
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);
        this.showToast('error', err.message || 'Không tải được bài viết.');
      },
    });
  }

  // ── Field change handlers ──

  onTitleInput(value: string): void {
    this.title.set(value);
    this.queueSave();
  }
  onSummaryInput(value: string): void {
    this.summary.set(value);
    this.queueSave();
  }
  onCategoryInput(value: string): void {
    this.category.set(value);
    this.queueSave();
  }
  onContentChange(html: string): void {
    this.content.set(html);
    this.queueSave();
  }

  /** Grow a single-row textarea to fit its content (fallback for field-sizing). */
  autoGrow(event: Event): void {
    const el = event.target as HTMLTextAreaElement;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }

  // ── Tags ──

  onTagKeydown(event: KeyboardEvent): void {
    const value = this.tagInput().trim();
    if ((event.key === 'Enter' || event.key === ',') && value) {
      event.preventDefault();
      this.addTag(value);
    } else if (event.key === 'Backspace' && !this.tagInput() && this.tags().length) {
      this.tags.update(t => t.slice(0, -1));
      this.queueSave();
    }
  }

  private addTag(raw: string): void {
    const tag = raw.replace(/,/g, '').trim().slice(0, 30);
    if (!tag) return;
    const exists = this.tags().some(t => t.toLowerCase() === tag.toLowerCase());
    if (!exists && this.tags().length < this.maxTags) {
      this.tags.update(t => [...t, tag]);
      this.queueSave();
    }
    this.tagInput.set('');
  }

  removeTag(index: number): void {
    this.tags.update(t => t.filter((_, i) => i !== index));
    this.queueSave();
  }

  // ── Saving ──

  private queueSave(): void {
    if (!this.isBrowser) return;
    this.saveState.set('saving');
    this.saveTrigger.next();
  }

  private buildRequest(): SaveBlogRequest {
    return {
      title: this.title().trim() || null,
      summary: this.summary().trim() || null,
      category: this.category().trim() || null,
      tags: this.tags(),
      contentHtml: this.content() || null,
    };
  }

  private isEmptyDraft(): boolean {
    const plain = this.content().replace(/<[^>]*>/g, '').replace(/​/g, '').trim();
    return (
      !this.title().trim() &&
      !this.summary().trim() &&
      !this.category().trim() &&
      this.tags().length === 0 &&
      plain.length === 0
    );
  }

  private doSave(mode: 'auto' | 'manual'): void {
    if (!this.isBrowser) return;
    // Never create an empty draft automatically.
    if (this.postId() === null && this.isEmptyDraft()) {
      this.saveState.set('idle');
      return;
    }
    this.saveState.set('saving');
    const request = this.buildRequest();
    const id = this.postId();
    const call = id === null ? this.blogService.create(request) : this.blogService.update(id, request);
    call.subscribe({
      next: post => {
        const wasNew = id === null;
        this.postId.set(post.id);
        this.status.set(post.status);
        this.lastSavedAt.set(new Date());
        this.saveState.set('saved');
        if (wasNew) {
          this.syncUrlId(post.id);
        }
        if (mode === 'manual') {
          this.showToast('success', 'Đã lưu bản nháp.');
        }
      },
      error: err => {
        this.saveState.set('error');
        this.showToast('error', err.message || 'Lưu thất bại.');
      },
    });
  }

  saveDraft(): void {
    this.doSave('manual');
  }

  private syncUrlId(id: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { id },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  // ── Publish ──

  publish(): void {
    if (!this.canPublish()) {
      this.showToast('error', 'Vui lòng nhập tiêu đề trước khi xuất bản.');
      return;
    }
    this.publishing.set(true);
    const request = this.buildRequest();
    const id = this.postId();
    const save = id === null ? this.blogService.create(request) : this.blogService.update(id, request);
    save.subscribe({
      next: saved => {
        this.postId.set(saved.id);
        if (id === null) this.syncUrlId(saved.id);
        this.blogService.publish(saved.id).subscribe({
          next: published => {
            this.status.set(published.status);
            this.lastSavedAt.set(new Date());
            this.saveState.set('saved');
            this.publishing.set(false);
            this.showToast('success', 'Đã xuất bản bài viết! 🎉');
          },
          error: err => {
            this.publishing.set(false);
            this.showToast('error', err.message || 'Xuất bản thất bại.');
          },
        });
      },
      error: err => {
        this.publishing.set(false);
        this.showToast('error', err.message || 'Không lưu được bài viết.');
      },
    });
  }

  unpublish(): void {
    const id = this.postId();
    if (id === null) return;
    this.blogService.unpublish(id).subscribe({
      next: post => {
        this.status.set(post.status);
        this.showToast('info', 'Đã chuyển bài viết về bản nháp.');
      },
      error: err => this.showToast('error', err.message || 'Thao tác thất bại.'),
    });
  }

  // ── Preview & theme ──

  togglePreview(): void {
    // Make sure the latest editor HTML is captured before previewing.
    if (this.editor) {
      this.content.set(this.editor.getContent());
    }
    this.previewMode.update(v => !v);
  }

  toggleTheme(): void {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    if (this.isBrowser) {
      localStorage.setItem('blog_editor_theme', next);
    }
  }

  // ── Toast ──

  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  showToast(type: 'success' | 'error' | 'info', msg: string): void {
    this.toast.set({ type, msg });
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toast.set(null), 3200);
  }

  dismissToast(): void {
    this.toast.set(null);
  }

  saveLabel = computed(() => {
    switch (this.saveState()) {
      case 'saving':
        return 'Đang lưu…';
      case 'saved':
        return 'Đã lưu';
      case 'error':
        return 'Lưu lỗi';
      default:
        return '';
    }
  });
}
