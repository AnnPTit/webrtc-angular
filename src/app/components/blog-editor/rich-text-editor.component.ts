import {
  Component,
  ChangeDetectionStrategy,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
  AfterViewInit,
  OnDestroy,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CODE_LANGUAGES } from './syntax-highlight';
import { buildCodeBlockHtml } from './code-block';

/**
 * A minimal rich-text editor built on a single contentEditable surface driven
 * by document.execCommand (deprecated but universally supported and dependency
 * free). Code blocks are inserted via a modal and embedded as atomic,
 * non-editable highlighted nodes; links via a small popover.
 *
 * The parent owns the persisted value: call setContent() to load HTML and
 * listen to (contentChange) for edits.
 */
@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RichTextEditorComponent implements AfterViewInit, OnDestroy {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);

  @Input() placeholder = 'Bắt đầu viết bài của bạn…';
  @Output() contentChange = new EventEmitter<string>();

  @ViewChild('surface') surfaceRef!: ElementRef<HTMLDivElement>;

  readonly languages = CODE_LANGUAGES;

  // Toolbar active-state highlighting
  active = signal<Record<string, boolean>>({});
  currentBlock = signal<string>('p');

  // Code-block modal
  showCodeModal = signal(false);
  codeLang = signal<string>('javascript');
  codeText = signal<string>('');
  private editingBlock: HTMLElement | null = null;

  // Link popover
  showLinkPopover = signal(false);
  linkUrl = signal<string>('');
  linkText = signal<string>('');

  private savedRange: Range | null = null;
  private selectionListener = () => this.refreshActiveState();

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;
    document.addEventListener('selectionchange', this.selectionListener);
  }

  ngOnDestroy(): void {
    if (!this.isBrowser) return;
    document.removeEventListener('selectionchange', this.selectionListener);
  }

  // ── Public API for the parent ──

  setContent(html: string): void {
    if (!this.isBrowser || !this.surfaceRef) return;
    this.surfaceRef.nativeElement.innerHTML = html || '';
  }

  getContent(): string {
    if (!this.isBrowser || !this.surfaceRef) return '';
    return this.surfaceRef.nativeElement.innerHTML;
  }

  focus(): void {
    if (this.isBrowser && this.surfaceRef) this.surfaceRef.nativeElement.focus();
  }

  // ── Editing events ──

  onInput(): void {
    this.emitChange();
  }

  onSurfaceClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const btn = target.closest('[data-action]') as HTMLElement | null;
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const block = btn.closest('.cblock') as HTMLElement | null;
    if (!block) return;
    event.preventDefault();
    if (action === 'copy-code') {
      this.copyBlock(block, btn);
    } else if (action === 'edit-code') {
      this.openCodeModalForEdit(block);
    }
  }

  /** Paste as plain text to keep the document markup clean and predictable. */
  onPaste(event: ClipboardEvent): void {
    if (!this.isBrowser) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') ?? '';
    document.execCommand('insertText', false, text);
    this.emitChange();
  }

  // ── Toolbar commands ──

  exec(command: string, value?: string): void {
    if (!this.isBrowser) return;
    this.surfaceRef.nativeElement.focus();
    document.execCommand(command, false, value);
    this.refreshActiveState();
    this.emitChange();
  }

  setBlock(tag: string): void {
    if (!this.isBrowser) return;
    this.surfaceRef.nativeElement.focus();
    // Toggle a heading/quote back to paragraph when it is already applied.
    const next = this.currentBlock() === tag ? 'p' : tag;
    document.execCommand('formatBlock', false, `<${next}>`);
    this.refreshActiveState();
    this.emitChange();
  }

  insertDivider(): void {
    if (!this.isBrowser) return;
    this.surfaceRef.nativeElement.focus();
    document.execCommand('insertHorizontalRule');
    this.emitChange();
  }

  undo(): void {
    this.exec('undo');
  }

  redo(): void {
    this.exec('redo');
  }

  // ── Link popover ──

  openLinkPopover(): void {
    if (!this.isBrowser) return;
    this.saveSelection();
    const sel = window.getSelection();
    this.linkText.set(sel?.toString() ?? '');
    this.linkUrl.set('https://');
    this.showLinkPopover.set(true);
  }

  applyLink(): void {
    const url = this.linkUrl().trim();
    if (!url) {
      this.showLinkPopover.set(false);
      return;
    }
    this.restoreSelection();
    this.surfaceRef.nativeElement.focus();
    const sel = window.getSelection();
    const hasSelection = sel && sel.toString().length > 0;
    if (hasSelection) {
      document.execCommand('createLink', false, url);
    } else {
      const text = this.linkText().trim() || url;
      const safe = this.escapeAttr(url);
      document.execCommand(
        'insertHTML',
        false,
        `<a href="${safe}" target="_blank" rel="noopener">${this.escapeText(text)}</a>`,
      );
    }
    this.showLinkPopover.set(false);
    this.emitChange();
  }

  cancelLink(): void {
    this.showLinkPopover.set(false);
  }

  // ── Code-block modal ──

  openCodeModalForInsert(): void {
    if (!this.isBrowser) return;
    this.saveSelection();
    this.editingBlock = null;
    this.codeLang.set('javascript');
    this.codeText.set('');
    this.showCodeModal.set(true);
  }

  private openCodeModalForEdit(block: HTMLElement): void {
    this.editingBlock = block;
    this.codeLang.set(block.getAttribute('data-lang') || 'plaintext');
    // getAttribute already returns the decoded value — no further decoding.
    this.codeText.set(block.getAttribute('data-code') || '');
    this.showCodeModal.set(true);
  }

  applyCode(): void {
    const code = this.codeText();
    const lang = this.codeLang();
    const html = buildCodeBlockHtml(code, lang);

    if (this.editingBlock) {
      // Replace the existing block in place.
      const temp = document.createElement('div');
      temp.innerHTML = html;
      const newBlock = temp.firstElementChild;
      if (newBlock && this.editingBlock.parentNode) {
        this.editingBlock.parentNode.replaceChild(newBlock, this.editingBlock);
      }
      this.editingBlock = null;
    } else {
      this.restoreSelection();
      this.surfaceRef.nativeElement.focus();
      // Insert the block followed by an empty paragraph to keep typing.
      document.execCommand('insertHTML', false, html + '<p><br></p>');
    }
    this.showCodeModal.set(false);
    this.emitChange();
  }

  cancelCode(): void {
    this.editingBlock = null;
    this.showCodeModal.set(false);
  }

  onCodeTextInput(event: Event): void {
    this.codeText.set((event.target as HTMLTextAreaElement).value);
  }

  /** Tab inserts two spaces inside the code textarea instead of moving focus. */
  onCodeTextKeydown(event: KeyboardEvent): void {
    if (event.key === 'Tab') {
      event.preventDefault();
      const ta = event.target as HTMLTextAreaElement;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const value = ta.value;
      ta.value = value.slice(0, start) + '  ' + value.slice(end);
      ta.selectionStart = ta.selectionEnd = start + 2;
      this.codeText.set(ta.value);
    }
  }

  // ── Helpers ──

  private copyBlock(block: HTMLElement, btn: HTMLElement): void {
    const raw = block.getAttribute('data-code') || '';
    const done = () => {
      const original = btn.textContent;
      btn.textContent = 'Đã chép!';
      setTimeout(() => (btn.textContent = original), 1500);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(raw).then(done).catch(() => this.fallbackCopy(raw, done));
    } else {
      this.fallbackCopy(raw, done);
    }
  }

  private fallbackCopy(text: string, done: () => void): void {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      done();
    } finally {
      document.body.removeChild(ta);
    }
  }

  private emitChange(): void {
    this.contentChange.emit(this.getContent());
  }

  private saveSelection(): void {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && this.surfaceRef.nativeElement.contains(sel.anchorNode)) {
      this.savedRange = sel.getRangeAt(0).cloneRange();
    } else {
      this.savedRange = null;
    }
  }

  private restoreSelection(): void {
    if (!this.savedRange) return;
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(this.savedRange);
  }

  private refreshActiveState(): void {
    if (!this.isBrowser || !this.surfaceRef) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || !this.surfaceRef.nativeElement.contains(sel.anchorNode)) {
      return;
    }
    try {
      this.active.set({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        underline: document.queryCommandState('underline'),
        strikeThrough: document.queryCommandState('strikeThrough'),
        insertUnorderedList: document.queryCommandState('insertUnorderedList'),
        insertOrderedList: document.queryCommandState('insertOrderedList'),
      });
      const block = (document.queryCommandValue('formatBlock') || 'p').toLowerCase();
      this.currentBlock.set(block || 'p');
    } catch {
      // queryCommand* can throw in some engines — ignore.
    }
  }

  private escapeText(s: string): string {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private escapeAttr(s: string): string {
    return this.escapeText(s).replace(/"/g, '&quot;');
  }
}
