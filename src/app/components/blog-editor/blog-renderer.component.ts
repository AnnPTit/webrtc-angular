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
 * `trusted` controls how the body is injected:
 *  - true  (default): the author's OWN content (editor preview / my posts) is
 *    injected via bypassSecurityTrustHtml so the code-block markup (data-*,
 *    copy buttons, token spans) survives verbatim.
 *  - false: content authored by SOMEONE ELSE (public feed / reader) is bound as
 *    a plain string so Angular's Dom sanitizer strips scripts/handlers/unknown
 *    attributes. Highlighting + line numbers survive (span/class are kept); the
 *    copy button is dropped, which is an acceptable trade for XSS safety.
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
  @Input() dateLabel: string | null = '';
  /** true = author's own content (bypass); false = other users' content (sanitize). */
  @Input() set trusted(value: boolean) {
    this._trusted.set(value);
  }
  @Input() set tags(value: string[] | null) {
    this._tags.set(value ?? []);
  }
  @Input() set contentHtml(value: string | null) {
    this._html.set(value ?? '');
  }

  private _tags = signal<string[]>([]);
  private _html = signal<string>('');
  private _trusted = signal<boolean>(true);

  tagList = computed(() => this._tags());
  safeBody = computed<SafeHtml | string>(() => {
    const html = this._html() || '<p class="empty-body">Chưa có nội dung.</p>';
    // Trusted → bypass so code-block markup survives; untrusted → let Angular sanitize.
    return this._trusted() ? this.sanitizer.bypassSecurityTrustHtml(html) : html;
  });

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
