/**
 * Zero-dependency syntax highlighter.
 *
 * Deliberately small: a single-pass scanner good enough to colour keywords,
 * strings, comments, numbers and literals for the languages this blog editor
 * supports. It is NOT a full parser — it favours predictability and bundle size
 * over perfect tokenisation (chosen over pulling in highlight.js/prism).
 *
 * Output is HTML with <span class="tok-*"> wrappers; all text is HTML-escaped,
 * so the result is safe to inject as innerHTML.
 */

export interface LanguageOption {
  value: string;
  label: string;
}

/** Languages offered in the code-block dropdown (order = display order). */
export const CODE_LANGUAGES: LanguageOption[] = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'sql', label: 'SQL' },
  { value: 'json', label: 'JSON' },
  { value: 'xml', label: 'XML' },
  { value: 'bash', label: 'Bash' },
];

const LABEL_BY_VALUE = new Map(CODE_LANGUAGES.map(l => [l.value, l.label]));

export function languageLabel(value: string | null | undefined): string {
  if (!value) return 'Plain text';
  return LABEL_BY_VALUE.get(value) ?? value;
}

export function normalizeLanguage(value: string | null | undefined): string {
  const v = (value ?? '').toLowerCase().trim();
  const aliases: Record<string, string> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    'c++': 'cpp',
    'c#': 'csharp',
    cs: 'csharp',
    sh: 'bash',
    shell: 'bash',
    htm: 'html',
    txt: 'plaintext',
    text: 'plaintext',
    '': 'plaintext',
  };
  if (aliases[v]) return aliases[v];
  return LABEL_BY_VALUE.has(v) ? v : 'plaintext';
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Language definitions for the generic scanner ──

interface LangDef {
  lineComment: string[];
  blockComment: [string, string][];
  strings: string[];
  keywords: Set<string>;
  literals: Set<string>;
}

const kw = (s: string) => new Set(s.trim().split(/\s+/));

const JAVA = kw(`abstract assert boolean break byte case catch char class const continue default do
  double else enum extends final finally float for goto if implements import instanceof int interface
  long native new package private protected public return short static strictfp super switch
  synchronized this throw throws transient try void volatile while var record sealed permits yield`);

const JS = kw(`await break case catch class const continue debugger default delete do else export
  extends finally for function if import in instanceof let new return super switch this throw try
  typeof var void while with yield async of as from get set static`);

const TS = new Set<string>([...JS, ...kw(`interface type enum namespace declare implements public
  private protected readonly abstract as any unknown never keyof infer satisfies override`)]);

const PY = kw(`and as assert async await break class continue def del elif else except finally for
  from global if import in is lambda nonlocal not or pass raise return try while with yield match case`);

const C = kw(`auto break case char const continue default do double else enum extern float for goto
  if inline int long register restrict return short signed sizeof static struct switch typedef union
  unsigned void volatile while`);

const CPP = new Set<string>([...C, ...kw(`class namespace template typename using public private
  protected virtual override final new delete try catch throw operator friend explicit constexpr
  nullptr this bool true false auto decltype mutable`)]);

const CSHARP = kw(`abstract as base bool break byte case catch char checked class const continue
  decimal default delegate do double else enum event explicit extern finally fixed float for foreach
  goto if implicit in int interface internal is lock long namespace new object operator out override
  params private protected public readonly ref return sbyte sealed short sizeof stackalloc static
  string struct switch this throw try typeof uint ulong unchecked unsafe ushort using virtual void
  volatile while var async await yield get set value record nameof`);

const SQL = kw(`select from where insert update delete into values set create table alter drop
  primary key foreign references not null default and or as join inner left right outer on group by
  order having limit offset distinct union all count sum avg min max between like in is exists case
  when then else end asc desc index view unique constraint add column begin commit rollback
  transaction`);

const BASH = kw(`if then else elif fi for while do done case esac in function select until return
  break continue local export readonly declare unset shift echo printf read cd pwd exit source alias
  set trap test`);

const CSS = kw(`important inherit initial unset auto none flex grid block inline absolute relative
  fixed sticky hidden visible solid dashed dotted bold normal center left right`);

const JSON_LITS = kw(`true false null`);

const LANGS: Record<string, LangDef> = {
  java: { lineComment: ['//'], blockComment: [['/*', '*/']], strings: ['"', "'"], keywords: JAVA, literals: kw('true false null') },
  javascript: { lineComment: ['//'], blockComment: [['/*', '*/']], strings: ['"', "'", '`'], keywords: JS, literals: kw('true false null undefined NaN') },
  typescript: { lineComment: ['//'], blockComment: [['/*', '*/']], strings: ['"', "'", '`'], keywords: TS, literals: kw('true false null undefined NaN') },
  python: { lineComment: ['#'], blockComment: [], strings: ['"', "'"], keywords: PY, literals: kw('True False None self') },
  c: { lineComment: ['//'], blockComment: [['/*', '*/']], strings: ['"', "'"], keywords: C, literals: kw('true false NULL') },
  cpp: { lineComment: ['//'], blockComment: [['/*', '*/']], strings: ['"', "'"], keywords: CPP, literals: kw('true false NULL nullptr') },
  csharp: { lineComment: ['//'], blockComment: [['/*', '*/']], strings: ['"', "'"], keywords: CSHARP, literals: kw('true false null') },
  sql: { lineComment: ['--'], blockComment: [['/*', '*/']], strings: ["'", '"'], keywords: lowerAndUpper(SQL), literals: lowerAndUpper(kw('true false null')) },
  bash: { lineComment: ['#'], blockComment: [], strings: ['"', "'"], keywords: BASH, literals: kw('true false') },
  css: { lineComment: [], blockComment: [['/*', '*/']], strings: ['"', "'"], keywords: CSS, literals: new Set<string>() },
  json: { lineComment: [], blockComment: [], strings: ['"'], keywords: new Set<string>(), literals: JSON_LITS },
  plaintext: { lineComment: [], blockComment: [], strings: [], keywords: new Set<string>(), literals: new Set<string>() },
};

/** SQL keywords are case-insensitive — index both cases. */
function lowerAndUpper(set: Set<string>): Set<string> {
  const out = new Set<string>();
  for (const w of set) {
    out.add(w.toLowerCase());
    out.add(w.toUpperCase());
  }
  return out;
}

function span(cls: string, text: string): string {
  return `<span class="${cls}">${escapeHtml(text)}</span>`;
}

/**
 * Highlight a snippet. Returns HTML (spans + escaped text) with no wrapping
 * <pre>/<code> — the caller supplies the container and per-line structure.
 */
export function highlightCode(code: string, language: string | null | undefined): string {
  const lang = normalizeLanguage(language);
  if (lang === 'html' || lang === 'xml') {
    return highlightMarkup(code);
  }
  const def = LANGS[lang] ?? LANGS['plaintext'];
  return highlightGeneric(code, def);
}

function highlightGeneric(code: string, def: LangDef): string {
  let out = '';
  let i = 0;
  const n = code.length;
  const isIdStart = (c: string) => /[A-Za-z_$]/.test(c);
  const isIdPart = (c: string) => /[A-Za-z0-9_$]/.test(c);

  while (i < n) {
    const rest = code.slice(i);
    const ch = code[i];

    // Line comments
    let matchedComment = false;
    for (const lc of def.lineComment) {
      if (rest.startsWith(lc)) {
        const end = code.indexOf('\n', i);
        const stop = end === -1 ? n : end;
        out += span('tok-com', code.slice(i, stop));
        i = stop;
        matchedComment = true;
        break;
      }
    }
    if (matchedComment) continue;

    // Block comments
    let matchedBlock = false;
    for (const [open, close] of def.blockComment) {
      if (rest.startsWith(open)) {
        const end = code.indexOf(close, i + open.length);
        const stop = end === -1 ? n : end + close.length;
        out += span('tok-com', code.slice(i, stop));
        i = stop;
        matchedBlock = true;
        break;
      }
    }
    if (matchedBlock) continue;

    // Strings
    if (def.strings.includes(ch)) {
      let j = i + 1;
      while (j < n) {
        if (code[j] === '\\') {
          j += 2;
          continue;
        }
        if (code[j] === ch) {
          j += 1;
          break;
        }
        j += 1;
      }
      out += span('tok-str', code.slice(i, Math.min(j, n)));
      i = Math.min(j, n);
      continue;
    }

    // Numbers
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(code[i + 1] ?? ''))) {
      let j = i;
      while (j < n && /[0-9a-fA-FxXbBoO._eE+-]/.test(code[j])) {
        // stop a stray +/- that is not part of an exponent
        if ((code[j] === '+' || code[j] === '-') && !/[eE]/.test(code[j - 1] ?? '')) break;
        j += 1;
      }
      out += span('tok-num', code.slice(i, j));
      i = j;
      continue;
    }

    // Identifiers / keywords
    if (isIdStart(ch)) {
      let j = i + 1;
      while (j < n && isIdPart(code[j])) j += 1;
      const word = code.slice(i, j);
      if (def.keywords.has(word)) {
        out += span('tok-kw', word);
      } else if (def.literals.has(word)) {
        out += span('tok-lit', word);
      } else {
        out += escapeHtml(word);
      }
      i = j;
      continue;
    }

    // Anything else
    out += escapeHtml(ch);
    i += 1;
  }
  return out;
}

/** Compact highlighter for HTML/XML markup. */
function highlightMarkup(code: string): string {
  let out = '';
  let i = 0;
  const n = code.length;

  while (i < n) {
    const rest = code.slice(i);

    // Comments <!-- ... -->
    if (rest.startsWith('<!--')) {
      const end = code.indexOf('-->', i + 4);
      const stop = end === -1 ? n : end + 3;
      out += span('tok-com', code.slice(i, stop));
      i = stop;
      continue;
    }

    if (code[i] === '<') {
      const end = code.indexOf('>', i);
      const stop = end === -1 ? n : end + 1;
      out += highlightTag(code.slice(i, stop));
      i = stop;
      continue;
    }

    // Text node up to the next tag
    const next = code.indexOf('<', i);
    const stop = next === -1 ? n : next;
    out += escapeHtml(code.slice(i, stop));
    i = stop;
  }
  return out;
}

function highlightTag(tag: string): string {
  // tag looks like "<div class="x">" or "</div>" or "<br/>"
  const m = /^<\/?\s*([a-zA-Z0-9:-]+)/.exec(tag);
  if (!m) return escapeHtml(tag);

  let out = '';
  let i = 0;
  const openLen = tag.startsWith('</') ? 2 : 1;
  out += escapeHtml(tag.slice(0, openLen)); // < or </
  i = openLen;

  // tag name
  const name = m[1];
  out += span('tok-tag', name);
  i += name.length;

  const n = tag.length;
  while (i < n) {
    const ch = tag[i];
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && tag[j] !== ch) j += 1;
      out += span('tok-str', tag.slice(i, Math.min(j + 1, n)));
      i = Math.min(j + 1, n);
      continue;
    }
    if (/[A-Za-z_:-]/.test(ch)) {
      let j = i + 1;
      while (j < n && /[A-Za-z0-9_:-]/.test(tag[j])) j += 1;
      out += span('tok-attr', tag.slice(i, j));
      i = j;
      continue;
    }
    out += escapeHtml(ch);
    i += 1;
  }
  return out;
}

/**
 * Render a full highlighted code block body: one <span class="cline"> per line
 * so CSS can attach line numbers via a counter. Returns inner HTML for a
 * <code> element.
 */
export function renderCodeLines(code: string, language: string | null | undefined): string {
  const highlighted = highlightCode(code, language);
  // Split on newlines while keeping empty lines so numbering stays correct.
  const lines = highlighted.split('\n');
  // Drop a trailing empty line produced by a final newline.
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  return lines.map(l => `<span class="cline">${l === '' ? '​' : l}</span>`).join('');
}
