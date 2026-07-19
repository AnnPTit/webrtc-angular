import {
  Component,
  ChangeDetectionStrategy,
  Input,
  PLATFORM_ID,
  inject,
  computed,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Renders a blog's title/meta and HTML body exactly as it will appear when
 * published — shares the global `.blog-prose` + `.cblock` styles with the
 * editing surface, so preview matches the editor 1:1.
 *
 * The body is the author's own content, injected via bypassSecurityTrustHtml so
 * the code-block markup (data-* attributes, buttons, token spans) survives.
 */
@Component({
  selector: 'app-blog-renderer',
  standalone: true,
  imports: [],
  templateUrl: './blog-renderer.component.html',
  styleUrl: './blog-renderer.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlogRendererComponent {
  private sanitizer = inject(DomSanitizer);
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  @Input() title: string | null = '';
  @Input() summary: string | null = '';
  @Input() category: string | null = '';
  @Input() authorName: string | null = '';
  @Input() set tags(value: string[] | null) {
    this._tags.set(value ?? []);
  }
  @Input() set contentHtml(value: string | null) {
    this._html.set(value ?? '');
  }

  private _tags = signal<string[]>([]);
  private _html = signal<string>('');

  tagList = computed(() => this._tags());
  safeBody = computed<SafeHtml>(() =>
    this.sanitizer.bypassSecurityTrustHtml(this._html() || '<p class="empty-body">Chưa có nội dung.</p>'),
  );

  /** Delegate copy-button clicks inside the rendered body. */
  onBodyClick(event: MouseEvent): void {
    if (!this.isBrowser) return;
    const target = event.target as HTMLElement;
    const btn = target.closest('[data-action="copy-code"]') as HTMLElement | null;
    if (!btn) return;
    const block = btn.closest('.cblock') as HTMLElement | null;
    if (!block) return;
    event.preventDefault();
    // getAttribute already returns the decoded source — copy it verbatim.
    const raw = block.getAttribute('data-code') || '';
    const done = () => {
      const original = btn.textContent;
      btn.textContent = 'Đã chép!';
      setTimeout(() => (btn.textContent = original), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(raw).then(done).catch(() => {});
    }
  }
}
