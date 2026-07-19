/**
 * Builds the HTML for a code block that is embedded (as an atomic,
 * non-editable node) inside the contentEditable surface AND rendered verbatim
 * in preview / published views.
 *
 * The raw source is stashed in `data-code` so the block can be re-opened for
 * editing and copied to the clipboard without re-parsing the highlighted DOM.
 */
import { escapeHtml, languageLabel, normalizeLanguage, renderCodeLines } from './syntax-highlight';

/** Encode raw code for safe storage inside a data-* attribute. */
function encodeAttr(raw: string): string {
  return escapeHtml(raw).replace(/\n/g, '&#10;');
}

export function buildCodeBlockHtml(code: string, language: string | null | undefined): string {
  const lang = normalizeLanguage(language);
  const label = languageLabel(lang);
  const lines = renderCodeLines(code, lang);
  const dataCode = encodeAttr(code);

  return (
    `<div class="cblock" contenteditable="false" data-lang="${lang}" data-code="${dataCode}">` +
    `<div class="cblock-head">` +
    `<span class="cblock-lang">${escapeHtml(label)}</span>` +
    `<span class="cblock-tools">` +
    `<button type="button" class="cblock-btn" data-action="edit-code">Sửa</button>` +
    `<button type="button" class="cblock-btn" data-action="copy-code">Sao chép</button>` +
    `</span>` +
    `</div>` +
    `<pre class="cblock-pre"><code class="cblock-code">${lines}</code></pre>` +
    `</div>`
  );
}
