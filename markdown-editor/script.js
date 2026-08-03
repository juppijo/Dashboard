(function () {
  'use strict';

  const editor        = document.getElementById('editor');
  const preview        = document.getElementById('preview');
  const workspace       = document.getElementById('workspace');
  const app            = document.getElementById('app');
  const docTitle        = document.getElementById('docTitle');
  const saveIndicator   = document.getElementById('saveIndicator');
  const toolbar         = document.getElementById('toolbar');
  const viewSwitch       = document.getElementById('viewSwitch');
  const btnFullscreen   = document.getElementById('btnFullscreen');
  const btnImport       = document.getElementById('btnImport');
  const btnExport       = document.getElementById('btnExport');
  const btnExportHtml   = document.getElementById('btnExportHtml');
  const btnExportPdf    = document.getElementById('btnExportPdf');
  const fileInput       = document.getElementById('fileInput');

  const statWords    = document.getElementById('statWords');
  const statChars     = document.getElementById('statChars');
  const statLines     = document.getElementById('statLines');
  const statReadtime  = document.getElementById('statReadtime');

  const btnSettings   = document.getElementById('btnSettings');
  const settingsPanel = document.getElementById('settingsPanel');
  const bgSwatches    = document.getElementById('bgSwatches');
  const bgCustom      = document.getElementById('bgCustom');
  const fontSelect    = document.getElementById('fontSelect');
  const btnResetSettings = document.getElementById('btnResetSettings');

  const STORAGE_KEY = 'mdEditor.doc';
  const STORAGE_TITLE_KEY = 'mdEditor.title';
  const STORAGE_BG_KEY = 'mdEditor.bg';
  const STORAGE_FONT_KEY = 'mdEditor.font';

  const FONT_STACKS = {
    barlow:   "'Barlow', sans-serif",
    jetbrains:"'JetBrains Mono', monospace",
    georgia:  "Georgia, 'Times New Roman', serif",
    literata: "'Literata', Georgia, serif",
    system:   "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    atkinson: "'Atkinson Hyperlegible', sans-serif"
  };

  const DEFAULT_BG = '#121212';
  const DEFAULT_FONT = 'barlow';

  // -------- Darstellung: Hintergrund & Schrift --------
  function clamp(v) { return Math.max(0, Math.min(255, v)); }

  function shadeColor(hex, percent) {
    const num = parseInt(hex.slice(1), 16);
    let r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    r = clamp(Math.round(r + (percent / 100) * 255));
    g = clamp(Math.round(g + (percent / 100) * 255));
    b = clamp(Math.round(b + (percent / 100) * 255));
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  function relativeLuminance(hex) {
    const num = parseInt(hex.slice(1), 16);
    const r = (num >> 16) & 255, g = (num >> 8) & 255, b = num & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  }

  function applyBackground(hex, save) {
    const isLight = relativeLuminance(hex) > 0.55;

    app.style.setProperty('--bg', hex);
    app.style.setProperty('--bg-raised', shadeColor(hex, isLight ? -7 : 6));
    app.style.setProperty('--bg-inset', shadeColor(hex, isLight ? -11 : -5));
    app.style.setProperty('--border', shadeColor(hex, isLight ? -20 : 12));
    app.style.setProperty('--border-soft', shadeColor(hex, isLight ? -14 : 9));
    app.style.setProperty('--text', isLight ? '#221e17' : '#e8e4da');
    app.style.setProperty('--text-dim', isLight ? '#5c5548' : '#9a948a');
    app.style.setProperty('--text-faint', isLight ? '#8b8474' : '#63605a');

    bgSwatches.querySelectorAll('.swatch[data-bg]').forEach(sw => {
      sw.classList.toggle('is-active', sw.dataset.bg.toLowerCase() === hex.toLowerCase());
    });
    bgCustom.value = hex;

    if (save !== false) {
      try { localStorage.setItem(STORAGE_BG_KEY, hex); } catch (e) { /* ignore */ }
    }
  }

  function applyFont(key, save) {
    const stack = FONT_STACKS[key] || FONT_STACKS[DEFAULT_FONT];
    app.style.setProperty('--font-content', stack);
    fontSelect.value = FONT_STACKS[key] ? key : DEFAULT_FONT;

    if (save !== false) {
      try { localStorage.setItem(STORAGE_FONT_KEY, key); } catch (e) { /* ignore */ }
    }
  }

  function loadAppearance() {
    let bg = DEFAULT_BG, font = DEFAULT_FONT;
    try {
      bg = localStorage.getItem(STORAGE_BG_KEY) || DEFAULT_BG;
      font = localStorage.getItem(STORAGE_FONT_KEY) || DEFAULT_FONT;
    } catch (e) { /* ignore */ }
    applyBackground(bg, false);
    applyFont(font, false);
  }

  btnSettings.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsPanel.hidden = !settingsPanel.hidden;
  });

  document.addEventListener('click', (e) => {
    if (!settingsPanel.hidden && !e.target.closest('.settings-wrap')) {
      settingsPanel.hidden = true;
    }
  });

  bgSwatches.addEventListener('click', (e) => {
    const sw = e.target.closest('.swatch[data-bg]');
    if (sw) applyBackground(sw.dataset.bg);
  });

  bgCustom.addEventListener('input', (e) => applyBackground(e.target.value));

  fontSelect.addEventListener('change', (e) => applyFont(e.target.value));

  btnResetSettings.addEventListener('click', () => {
    applyBackground(DEFAULT_BG);
    applyFont(DEFAULT_FONT);
  });

  // -------- Markdown Rendering --------
  marked.setOptions({
    gfm: true,
    breaks: true
  });

  function renderPreview() {
    const raw = marked.parse(editor.value || '');
    const clean = window.DOMPurify ? DOMPurify.sanitize(raw) : raw;
    preview.innerHTML = clean;
    renderMath(preview);
  }

  function renderMath(container) {
    if (typeof renderMathInElement !== 'function') return;
    try {
      renderMathInElement(container, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\[', right: '\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false
      });
    } catch (e) { /* KaTeX evtl. noch nicht geladen */ }
  }

  // -------- Statistik --------
  function updateStats() {
    const text = editor.value;
    const words = text.trim().length ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    const lines = text.length ? text.split('\n').length : 0;
    const readMin = Math.max(1, Math.round(words / 200));

    statWords.textContent = `${words} ${words === 1 ? 'Wort' : 'Wörter'}`;
    statChars.textContent = `${chars} ${chars === 1 ? 'Zeichen' : 'Zeichen'}`;
    statLines.textContent = `${lines} ${lines === 1 ? 'Zeile' : 'Zeilen'}`;
    statReadtime.textContent = `~${readMin} Min. Lesezeit`;
  }

  // -------- Autospeichern --------
  let saveTimeout = null;
  function persist() {
    saveIndicator.textContent = 'speichert …';
    saveIndicator.classList.add('is-saving');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, editor.value);
        localStorage.setItem(STORAGE_TITLE_KEY, docTitle.value);
      } catch (e) { /* localStorage evtl. nicht verfügbar */ }
      saveIndicator.textContent = 'gespeichert';
      saveIndicator.classList.remove('is-saving');
    }, 400);
  }

  function loadPersisted() {
    try {
      const savedText = localStorage.getItem(STORAGE_KEY);
      const savedTitle = localStorage.getItem(STORAGE_TITLE_KEY);
      if (savedText !== null) editor.value = savedText;
      if (savedTitle) docTitle.value = savedTitle;
    } catch (e) { /* ignore */ }

    if (!editor.value) {
      editor.value =
`# Willkommen im MD // Editor

Ein sauberer, schneller Markdown-Editor mit Live-Vorschau.

## Funktionen

- **Fett**, *kursiv* und ~~durchgestrichen~~
- Aufzählungs- und nummerierte Listen
- \`Inline-Code\` und Codeblöcke
- Tabellen, Zitate, Links und Bilder
- Vollbildmodus und Split-Ansicht

> Wähle Text aus und nutze die Werkzeugleiste, um ihn zu formatieren.

Auch LaTeX-Formeln werden unterstützt — inline wie $E = mc^2$ oder als Block:

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

\`\`\`js
console.log("Viel Spaß beim Schreiben!");
\`\`\`
`;
    }
  }

  // -------- Textformatierung --------
  function getSelection() {
    return {
      start: editor.selectionStart,
      end: editor.selectionEnd,
      value: editor.value
    };
  }

  function setSelection(start, end) {
    editor.focus();
    editor.setSelectionRange(start, end);
  }

  function replaceRange(start, end, text) {
    const before = editor.value.slice(0, start);
    const after = editor.value.slice(end);
    editor.value = before + text + after;
  }

  // Umschließt die Auswahl mit einem Prefix/Suffix (z.B. für Fett, Kursiv)
  function wrapSelection(prefix, suffix, placeholder) {
    suffix = suffix === undefined ? prefix : suffix;
    const { start, end, value } = getSelection();
    const selected = value.slice(start, end) || placeholder || '';

    // Bereits umschlossen? -> entfernen (Toggle)
    const before = value.slice(Math.max(0, start - prefix.length), start);
    const after = value.slice(end, end + suffix.length);
    if (selected && before === prefix && after === suffix) {
      replaceRange(start - prefix.length, end + suffix.length, selected);
      setSelection(start - prefix.length, end - prefix.length);
      afterEdit();
      return;
    }

    replaceRange(start, end, prefix + selected + suffix);
    const cursorStart = start + prefix.length;
    const cursorEnd = cursorStart + selected.length;
    setSelection(cursorStart, cursorEnd);
    afterEdit();
  }

  // Stellt jeder ausgewählten Zeile ein Präfix voran (Listen, Zitate, Überschriften)
  function prefixLines(prefix, ordered) {
    const { start, end, value } = getSelection();
    let lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    let out;
    if (ordered) {
      let n = 1;
      out = lines.map(l => `${n++}. ${l.replace(/^\d+\.\s/, '')}`).join('\n');
    } else {
      const alreadyPrefixed = lines.every(l => l.startsWith(prefix) || l.trim() === '');
      out = lines.map(l => {
        if (l.trim() === '') return l;
        return alreadyPrefixed ? l.slice(prefix.length) : prefix + l;
      }).join('\n');
    }

    replaceRange(lineStart, lineEnd, out);
    setSelection(lineStart, lineStart + out.length);
    afterEdit();
  }

  function insertHeading(level) {
    const { start, end, value } = getSelection();
    let lineStart = value.lastIndexOf('\n', start - 1) + 1;
    let lineEnd = value.indexOf('\n', end);
    if (lineEnd === -1) lineEnd = value.length;

    const line = value.slice(lineStart, lineEnd);
    const stripped = line.replace(/^#{1,6}\s*/, '');
    const hashes = '#'.repeat(level);
    const current = line.match(/^(#{1,6})\s/);

    let out;
    if (current && current[1].length === level) {
      out = stripped; // Toggle: gleiche Ebene -> entfernen
    } else {
      out = `${hashes} ${stripped}`;
    }

    replaceRange(lineStart, lineEnd, out);
    setSelection(lineStart + out.length, lineStart + out.length);
    afterEdit();
  }

  function insertAtCursor(text, cursorOffset) {
    const { start, end } = getSelection();
    replaceRange(start, end, text);
    const pos = start + (cursorOffset !== undefined ? cursorOffset : text.length);
    setSelection(pos, pos);
    afterEdit();
  }

  function insertBlock(text) {
    const { start, value } = getSelection();
    const needsNewlineBefore = start > 0 && value[start - 1] !== '\n';
    const prefix = needsNewlineBefore ? '\n\n' : '';
    insertAtCursor(prefix + text);
  }

  function afterEdit() {
    renderPreview();
    updateStats();
    persist();
  }

  // -------- Werkzeugleisten-Befehle --------
  const commands = {
    h1: () => insertHeading(1),
    h2: () => insertHeading(2),
    h3: () => insertHeading(3),
    bold: () => wrapSelection('**', '**', 'fetter Text'),
    italic: () => wrapSelection('*', '*', 'kursiver Text'),
    strike: () => wrapSelection('~~', '~~', 'durchgestrichen'),
    quote: () => prefixLines('> '),
    code: () => wrapSelection('`', '`', 'code'),
    codeblock: () => insertBlock('```\nCode hier einfügen\n```'),
    hr: () => insertBlock('---'),
    ul: () => prefixLines('- '),
    ol: () => prefixLines('', true),
    task: () => prefixLines('- [ ] '),
    link: () => {
      const { start, end, value } = getSelection();
      const selected = value.slice(start, end);
      if (selected) {
        replaceRange(start, end, `[${selected}](url)`);
        const urlStart = start + selected.length + 3;
        setSelection(urlStart, urlStart + 3);
      } else {
        insertAtCursor('[Linktext](url)', 1);
        setSelection(editor.selectionStart, editor.selectionStart + 8);
      }
      renderPreview(); updateStats(); persist();
    },
    image: () => insertAtCursor('![Alt-Text](bild-url.jpg)', 2),
    table: () => insertBlock(
`| Spalte 1 | Spalte 2 | Spalte 3 |
| --- | --- | --- |
| Wert | Wert | Wert |
| Wert | Wert | Wert |`
    ),
    mathinline: () => wrapSelection('$', '$', 'E = mc^2'),
    mathblock: () => insertBlock('$$\n\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}\n$$')
  };

  toolbar.addEventListener('click', (e) => {
    const btn = e.target.closest('.tool-btn[data-cmd]');
    if (!btn) return;
    const cmd = commands[btn.dataset.cmd];
    if (cmd) cmd();
  });

  // -------- Ansicht umschalten (Edit / Split / Vorschau) --------
  viewSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('.view-btn');
    if (!btn) return;
    const view = btn.dataset.view;
    workspace.dataset.view = view;

    viewSwitch.querySelectorAll('.view-btn').forEach(b => {
      const active = b === btn;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', String(active));
    });

    if (view === 'preview' || view === 'split') renderPreview();
    if (view === 'edit') editor.focus();
  });

  // -------- Vollbild --------
  function updateFullscreenIcon() {
    const isFs = !!document.fullscreenElement;
    btnFullscreen.querySelector('.ico-expand').style.display = isFs ? 'none' : '';
    btnFullscreen.querySelector('.ico-compress').style.display = isFs ? '' : 'none';
    btnFullscreen.title = isFs ? 'Vollbild verlassen (F11)' : 'Vollbild (F11)';
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      app.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  btnFullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', updateFullscreenIcon);

  // -------- Import / Export --------
  // -------- HTML- & PDF-Export --------
  function currentTheme() {
    const cs = getComputedStyle(app);
    return {
      bg: cs.getPropertyValue('--bg').trim(),
      bgInset: cs.getPropertyValue('--bg-inset').trim(),
      border: cs.getPropertyValue('--border').trim(),
      borderSoft: cs.getPropertyValue('--border-soft').trim(),
      text: cs.getPropertyValue('--text').trim(),
      textDim: cs.getPropertyValue('--text-dim').trim(),
      gold: cs.getPropertyValue('--gold').trim() || '#c9a227',
      goldBright: cs.getPropertyValue('--gold-bright').trim() || '#e0bc4a',
      goldDim: cs.getPropertyValue('--gold-dim').trim() || '#7a6420',
      fontContent: cs.getPropertyValue('--font-content').trim() || "'Barlow', sans-serif"
    };
  }

  function markdownBodyCss(t) {
    return `
      body{ margin:0; background:${t.bg}; color:${t.text}; font-family:${t.fontContent}; }
      .markdown-body{ max-width:760px; margin:0 auto; padding:48px 32px 80px; font-size:16px; line-height:1.75; }
      .markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4{
        font-family:'Bebas Neue',sans-serif; font-weight:400; letter-spacing:0.3px; color:${t.goldBright}; line-height:1.2; margin:1.4em 0 0.5em;
      }
      .markdown-body h1{ font-size:2.3em; border-bottom:1px solid ${t.border}; padding-bottom:0.25em; }
      .markdown-body h2{ font-size:1.7em; border-bottom:1px solid ${t.borderSoft}; padding-bottom:0.2em; }
      .markdown-body h3{ font-size:1.3em; color:${t.gold}; }
      .markdown-body h4{ font-size:1.05em; text-transform:uppercase; letter-spacing:0.6px; }
      .markdown-body h1:first-child,.markdown-body h2:first-child{ margin-top:0; }
      .markdown-body p{ margin:0.9em 0; }
      .markdown-body a{ color:${t.goldBright}; text-decoration:none; border-bottom:1px solid ${t.goldDim}; }
      .markdown-body strong{ font-weight:700; }
      .markdown-body ul,.markdown-body ol{ padding-left:1.5em; margin:0.8em 0; }
      .markdown-body li{ margin:0.3em 0; }
      .markdown-body li::marker{ color:${t.gold}; }
      .markdown-body blockquote{
        margin:1em 0; padding:0.4em 1.2em; border-left:3px solid ${t.gold};
        background:rgba(201,162,39,0.06); color:${t.textDim}; border-radius:0 4px 4px 0;
      }
      .markdown-body code{
        font-family:'JetBrains Mono',monospace; font-size:0.87em; background:${t.bgInset};
        border:1px solid ${t.border}; color:${t.goldBright}; padding:0.15em 0.4em; border-radius:4px;
      }
      .markdown-body pre{
        background:${t.bgInset}; border:1px solid ${t.border}; border-radius:6px;
        padding:16px 18px; overflow-x:auto; margin:1em 0;
      }
      .markdown-body pre code{ background:none; border:none; padding:0; color:${t.text}; }
      .markdown-body hr{ border:none; border-top:1px solid ${t.border}; margin:2em 0; }
      .markdown-body table{ border-collapse:collapse; width:100%; margin:1.2em 0; font-size:0.92em; }
      .markdown-body th,.markdown-body td{ border:1px solid ${t.border}; padding:8px 12px; text-align:left; }
      .markdown-body th{ background:${t.bgInset}; color:${t.goldBright}; font-weight:600; }
      .markdown-body img{ max-width:100%; border-radius:4px; border:1px solid ${t.border}; }
      .markdown-body input[type="checkbox"]{ accent-color:${t.gold}; margin-right:0.5em; }
    `;
  }

  function buildStandaloneHtml(theme) {
    const title = (docTitle.value.trim() || 'unbenannt');
    const raw = marked.parse(editor.value || '');
    const clean = window.DOMPurify ? DOMPurify.sanitize(raw) : raw;
    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
<style>${markdownBodyCss(theme)}
.katex-display{ margin:1.2em 0; overflow-x:auto; overflow-y:hidden; }
.katex{ font-size:1.05em; }
</style>
</head>
<body>
<article class="markdown-body">
${clean}
</article>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"><\/script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js"><\/script>
<script>
  document.addEventListener('DOMContentLoaded', function () {
    if (typeof renderMathInElement === 'function') {
      renderMathInElement(document.body, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '\\\\[', right: '\\\\]', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\\\(', right: '\\\\)', display: false }
        ],
        throwOnError: false
      });
    }
  });
<\/script>
</body>
</html>`;
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  btnExportHtml.addEventListener('click', () => {
    const name = (docTitle.value.trim() || 'unbenannt') + '.html';
    const html = buildStandaloneHtml(currentTheme());
    downloadFile(name, html, 'text/html;charset=utf-8');
  });

  btnExportPdf.addEventListener('click', () => {
    // Druckfreundliches, helles Theme fürs PDF, unabhängig von der Bildschirmdarstellung
    const printTheme = {
      bg: '#ffffff', bgInset: '#f4f2ec', border: '#ddd7c8', borderSoft: '#e8e3d6',
      text: '#221e17', textDim: '#5c5548', gold: '#a3801f', goldBright: '#8a6a17',
      goldDim: '#c9a227', fontContent: "'Barlow', sans-serif"
    };
    const html = buildStandaloneHtml(printTheme);
    const win = window.open('', '_blank');
    if (!win) { alert('Bitte Pop-ups für diese Seite erlauben, um den PDF-Export zu nutzen.'); return; }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { try { win.print(); } catch (e) {} }, 900);
  });

  btnExport.addEventListener('click', () => {
    const name = (docTitle.value.trim() || 'unbenannt') + '.md';
    const blob = new Blob([editor.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  btnImport.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = reader.result;
      docTitle.value = file.name.replace(/\.(md|markdown|txt)$/i, '');
      afterEdit();
    };
    reader.readAsText(file);
    fileInput.value = '';
  });

  // -------- Tastenkürzel --------
  editor.addEventListener('keydown', (e) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 'b') { e.preventDefault(); commands.bold(); }
    else if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); commands.italic(); }
    else if (mod && e.key.toLowerCase() === 'k') { e.preventDefault(); commands.link(); }
    else if (e.key === 'Tab') {
      e.preventDefault();
      insertAtCursor('  ');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'F11') {
      e.preventDefault();
      toggleFullscreen();
    }
  });

  // -------- Editor-Eingabe --------
  editor.addEventListener('input', () => {
    if (workspace.dataset.view === 'split' || workspace.dataset.view === 'preview') {
      renderPreview();
    }
    updateStats();
    persist();
  });

  docTitle.addEventListener('input', persist);

  // Live-Vorschau auch beim Scrollen im Split-Modus synchron halten (einfach & robust)
  editor.addEventListener('scroll', () => {
    if (workspace.dataset.view !== 'split') return;
    const ratio = editor.scrollTop / (editor.scrollHeight - editor.clientHeight || 1);
    preview.scrollTop = ratio * (preview.scrollHeight - preview.clientHeight);
  });

  // -------- Initialisierung --------
  loadAppearance();
  loadPersisted();
  renderPreview();
  updateStats();
  updateFullscreenIcon();
})();
