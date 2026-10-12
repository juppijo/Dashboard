(function(){
  'use strict';

  /* ===================== STARTVORLAGE ===================== */
  const STARTER = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">  
<title>WRZT Seite</title>
   <script>
    MathJax = {
      tex: {
        inlineMath: [
          ['$', '$'],
          ['\\\(', '\\\)']
        ],
        displayMath: [
          ['$$', '$$'],
          ['\\\[', '\\\]']
        ]
      },
      svg: {
        fontCache: 'global'
      }
    };
  </script>
  <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
  <style>
  body {
    font-family: sans-serif;
    margin: 40px;
    color: #112255;
    background: #ededfd;
    max-width : 1000px;
    text-align: justify;
    padding : auto;
    margin  : auto;
    }
    h1 {
      color: #112299;
    }
    .button-container {
      display: flex;
      justify-content: flex-end; 
      padding: 10px 15px; 
      gap: 10px; 
    }
    .link-box-button {
      justify-content: flex-end;
      padding: 10px 18px;
      background: #112299;
      color: #eeddff;
      font-size: 13px;
      font-weight: 600;
      border-radius: 8px;
      white-space: nowrap;
      flex-shrink: 0;
      transition: opacity 0.2s ease;
      cursor: pointer; 
    }
    .link-box-button:hover {
      background: #666688;
      padding: 10px 19px;
    }
  </style>
</head>
<body>
  <div class="button-container">
    <button class="link-box-button" onclick="toggleFullscreen()">⛶</button>
  </div>
  <h1>Willkommen</h1>
  <p>Lade eine eigene HTML-Datei über „Laden" oder bearbeite diese Seite direkt im Editor.</p>
  <p>Test: $$ E = m c² $$</p>
  <script>
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        alert("Fehler beim Aktivieren des Vollbildmodus!");
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }
  </script>
</body>
</html>`;

  /* ===================== BAUSTEIN-BIBLIOTHEK ===================== */
  const SNIPPETS = [
    {
      name: 'Karte',
      desc: 'Karte mit Titel, Text und Aktions-Button.',
      code: `<div style="border:1px solid #2a2a2a;border-radius:8px;padding:20px;max-width:340px;background:#141414;color:#e8e8e4;">
  <h3 style="margin:0 0 8px;color:#c9a227;">Titel der Karte</h3>
  <p style="margin:0 0 14px;font-size:14px;line-height:1.5;">Kurzer Beschreibungstext für diese Karte.</p>
  <button style="background:#c9a227;color:#161200;border:none;border-radius:6px;padding:9px 16px;font-weight:600;cursor:pointer;">Mehr erfahren</button>
</div>`
    },
    {
      name: 'Button-Gruppe',
      desc: 'Primärer und sekundärer Button nebeneinander.',
      code: `<div style="display:flex;gap:10px;">
  <button style="background:#c9a227;color:#161200;border:none;border-radius:6px;padding:10px 18px;font-weight:600;cursor:pointer;">Bestätigen</button>
  <button style="background:transparent;color:#c9a227;border:1px solid #c9a227;border-radius:6px;padding:10px 18px;font-weight:600;cursor:pointer;">Abbrechen</button>
</div>`
    },
    {
      name: 'Formular',
      desc: 'Einfaches Kontaktformular mit Name, E-Mail, Nachricht.',
      code: `<form style="display:flex;flex-direction:column;gap:10px;max-width:360px;">
  <label style="font-size:14px;">Name
    <input type="text" name="name" style="display:block;width:100%;padding:8px 10px;margin-top:4px;border:1px solid #ccc;border-radius:5px;">
  </label>
  <label style="font-size:14px;">E-Mail
    <input type="email" name="email" style="display:block;width:100%;padding:8px 10px;margin-top:4px;border:1px solid #ccc;border-radius:5px;">
  </label>
  <label style="font-size:14px;">Nachricht
    <textarea name="message" rows="4" style="display:block;width:100%;padding:8px 10px;margin-top:4px;border:1px solid #ccc;border-radius:5px;"></textarea>
  </label>
  <button type="submit" style="background:#c9a227;color:#161200;border:none;border-radius:6px;padding:10px 16px;font-weight:600;cursor:pointer;">Absenden</button>
</form>`
    },
    {
      name: 'Navigation',
      desc: 'Horizontale Navigationsleiste mit Logo und Links.',
      code: `<nav style="display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:#141414;color:#e8e8e4;">
  <strong style="color:#c9a227;">Meine Seite</strong>
  <div style="display:flex;gap:20px;">
    <a href="#" style="color:#e8e8e4;text-decoration:none;">Start</a>
    <a href="#" style="color:#e8e8e4;text-decoration:none;">Über uns</a>
    <a href="#" style="color:#e8e8e4;text-decoration:none;">Kontakt</a>
  </div>
</nav>`
    },
    {
      name: 'Tabelle',
      desc: 'Datentabelle mit Kopfzeile und drei Beispielzeilen.',
      code: `<table style="border-collapse:collapse;width:100%;font-size:14px;">
  <thead>
    <tr style="background:#141414;color:#c9a227;">
      <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #2a2a2a;">Name</th>
      <th style="text-align:left;padding:8px 10px;border-bottom:1px solid #2a2a2a;">Wert</th>
    </tr>
  </thead>
  <tbody>
    <tr><td style="padding:8px 10px;border-bottom:1px solid #eee;">Eintrag A</td><td style="padding:8px 10px;border-bottom:1px solid #eee;">123</td></tr>
    <tr><td style="padding:8px 10px;border-bottom:1px solid #eee;">Eintrag B</td><td style="padding:8px 10px;border-bottom:1px solid #eee;">456</td></tr>
    <tr><td style="padding:8px 10px;">Eintrag C</td><td style="padding:8px 10px;">789</td></tr>
  </tbody>
</table>`
    },
    {
      name: 'Bild mit Beschriftung',
      desc: 'Responsives Bild mit figcaption.',
      code: `<figure style="margin:0;max-width:480px;">
  <img src="https://via.placeholder.com/480x270" alt="Beschreibung" style="width:100%;height:auto;border-radius:6px;display:block;">
  <figcaption style="font-size:12px;color:#888;margin-top:6px;">Bildunterschrift hier einfügen.</figcaption>
</figure>`
    },
    {
      name: 'Akkordeon',
      desc: 'Aufklappbarer Bereich per &lt;details&gt;/&lt;summary&gt;.',
      code: `<details style="border:1px solid #2a2a2a;border-radius:6px;padding:10px 14px;background:#141414;color:#e8e8e4;">
  <summary style="cursor:pointer;color:#c9a227;font-weight:600;">Frage oder Titel</summary>
  <p style="margin:10px 0 0;font-size:14px;line-height:1.5;">Antwort oder erklärender Text, der beim Klick sichtbar wird.</p>
</details>`
    },
    {
      name: 'Video-Einbettung',
      desc: 'Responsiver 16:9-Container für ein eingebettetes Video.',
      code: `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;max-width:100%;border-radius:8px;">
  <iframe src="https://www.youtube.com/embed/VIDEO_ID" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;" allowfullscreen></iframe>
</div>`
    }
  ];

  /* ===================== ELEMENTE ===================== */
  const app = document.getElementById('app');
  const workspace = document.getElementById('workspace');
  const paneEditor = document.getElementById('paneEditor');
  const panePreview = document.getElementById('panePreview');
  const resizer = document.getElementById('resizer');
  const previewFrame = document.getElementById('previewFrame');
  const previewWrap = document.getElementById('previewWrap');
  const deviceSwitch = document.getElementById('deviceSwitch');
  const btnInspector = document.getElementById('btnInspector');
  const btnSyncScroll = document.getElementById('btnSyncScroll');
  const inspectorPanel = document.getElementById('inspectorPanel');
  const inspectorTarget = document.getElementById('inspectorTarget');
  const inspectorDeselect = document.getElementById('inspectorDeselect');
  const inspColor = document.getElementById('inspColor');
  const inspColorReset = document.getElementById('inspColorReset');
  const inspBg = document.getElementById('inspBg');
  const inspBgReset = document.getElementById('inspBgReset');
  const inspFontSize = document.getElementById('inspFontSize');
  const inspFontUnit = document.getElementById('inspFontUnit');
  const inspBold = document.getElementById('inspBold');
  const inspItalic = document.getElementById('inspItalic');
  const inspPadding = document.getElementById('inspPadding');
  const inspPaddingUnit = document.getElementById('inspPaddingUnit');
  const inspMargin = document.getElementById('inspMargin');
  const inspMarginUnit = document.getElementById('inspMarginUnit');
  const inspRadius = document.getElementById('inspRadius');
  const inspRadiusUnit = document.getElementById('inspRadiusUnit');
  const statusMsg = document.getElementById('statusMsg');
  const cursorPosEl = document.getElementById('cursorPos');

  const fileInput = document.getElementById('fileInput');
  const btnLoad = document.getElementById('btnLoad');
  const btnSave = document.getElementById('btnSave');
  const btnSaveAs = document.getElementById('btnSaveAs');
  const btnSearch = document.getElementById('btnSearch');
  const searchBar = document.getElementById('searchBar');
  const searchInput = document.getElementById('searchInput');
  const searchCount = document.getElementById('searchCount');
  const searchPrev = document.getElementById('searchPrev');
  const searchNext = document.getElementById('searchNext');
  const replaceInput = document.getElementById('replaceInput');
  const btnReplaceOne = document.getElementById('btnReplaceOne');
  const btnReplaceAll = document.getElementById('btnReplaceAll');
  const searchClose = document.getElementById('searchClose');
  const btnMarkdown = document.getElementById('btnMarkdown');
  const btnFormat = document.getElementById('btnFormat');
  const btnSnippets = document.getElementById('btnSnippets');
  const btnFont = document.getElementById('btnFont');
  const fontPopover = document.getElementById('fontPopover');
  const fontFamilySelect = document.getElementById('fontFamilySelect');
  const fontSizeRange = document.getElementById('fontSizeRange');
  const fontSizeValue = document.getElementById('fontSizeValue');
  const lineHeightRange = document.getElementById('lineHeightRange');
  const lineHeightValue = document.getElementById('lineHeightValue');

  const tabsScroll = document.getElementById('tabsScroll');
  const btnNewTab = document.getElementById('btnNewTab');

  const panelStyles = document.getElementById('panelStyles');
  const closeStyles = document.getElementById('closeStyles');
  const colorSwatches = document.getElementById('colorSwatches');
  const btnApplyStyles = document.getElementById('btnApplyStyles');

  const modalMarkdown = document.getElementById('modalMarkdown');
  const mdInput = document.getElementById('markdownInput');
  const markdownPreview = document.getElementById('markdownPreview');
  const btnInsertMarkdown = document.getElementById('btnInsertMarkdown');

  const modalScriptBtn = document.getElementById('modalScriptBtn');
  const scriptBtnLabel = document.getElementById('scriptBtnLabel');
  const scriptBtnStyle = document.getElementById('scriptBtnStyle');
  const scriptBtnCode = document.getElementById('scriptBtnCode');
  const btnInsertScriptBtn = document.getElementById('btnInsertScriptBtn');

  const modalSnippets = document.getElementById('modalSnippets');
  const snippetGrid = document.getElementById('snippetGrid');

  let searchMarks = [];
  let currentMatchIdx = -1;

  /* ===================== HAUPT-EDITOR ===================== */
  const editor = CodeMirror(document.getElementById('editorHost'), {
    value: '',
    mode: 'htmlmixed',
    theme: 'material-darker',
    lineNumbers: true,
    lineWrapping: true,
    tabSize: 2,
    indentUnit: 2,
    autoCloseTags: true,
    extraKeys: {
      'Ctrl-F': () => { openSearch(); return false; },
      'Cmd-F': () => { openSearch(); return false; }
    }
  });

  let previewTimer = null;
  editor.on('change', () => {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(updatePreview, 350);
    if (searchBar.classList.contains('open') && searchInput.value) {
      clearTimeout(searchRefreshTimer);
      searchRefreshTimer = setTimeout(() => {
        currentMatchIdx = -1;
        refreshHighlights();
        updateSearchCount();
      }, 300);
    }
    markActiveTabDirty();
  });
  editor.on('cursorActivity', () => {
    const pos = editor.getCursor();
    cursorPosEl.textContent = `Zeile ${pos.line + 1}, Spalte ${pos.ch + 1}`;
  });

  /* ===================== ZEILEN-TAGGER FÜR ECHTE SYNCHRONISATION ===================== */
  function tagSourceWithLines(html) {
    let line = 1;
    let out = '';
    let i = 0;
    const len = html.length;
    while (i < len) {
      const ch = html[i];
      if (ch === '\n') { line++; out += ch; i++; continue; }
      if (ch === '<') {
        if (html.startsWith('<!--', i)) {
          const end = html.indexOf('-->', i);
          const seg = end === -1 ? html.slice(i) : html.slice(i, end + 3);
          line += (seg.match(/\n/g) || []).length;
          out += seg;
          i += seg.length;
          continue;
        }
        if (html[i + 1] === '/' || html[i + 1] === '!' || html[i + 1] === '?') {
          const end = html.indexOf('>', i);
          const seg = end === -1 ? html.slice(i) : html.slice(i, end + 1);
          line += (seg.match(/\n/g) || []).length;
          out += seg;
          i += seg.length;
          continue;
        }
        const m = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(html.slice(i));
        if (m) {
          const tagName = m[1];
          const startLine = line;
          let j = i + m[0].length;
          let inQuote = null;
          while (j < len) {
            const c = html[j];
            if (inQuote) { if (c === inQuote) inQuote = null; }
            else if (c === '"' || c === "'") { inQuote = c; }
            else if (c === '>') { break; }
            if (c === '\n') line++;
            j++;
          }
          const insertion = ` data-hw-line="${startLine}"`;
          out += html.slice(i, i + m[0].length) + insertion + html.slice(i + m[0].length, j + 1);
          i = j + 1;
          if (/^(script|style|textarea|title)$/i.test(tagName)) {
            const closeRe = new RegExp('</' + tagName + '\\s*>', 'i');
            const rest = html.slice(i);
            const closeMatch = closeRe.exec(rest);
            const rawEnd = closeMatch ? closeMatch.index : rest.length;
            const rawContent = rest.slice(0, rawEnd);
            line += (rawContent.match(/\n/g) || []).length;
            out += rawContent;
            i += rawContent.length;
          }
          continue;
        }
      }
      out += ch;
      i++;
    }
    return out;
  }

  function updatePreview() {
    previewFrame.srcdoc = tagSourceWithLines(editor.getValue());
  }

  /* ===================== TOAST / STATUS ===================== */
  let toastTimer = null;
  function showToast(msg) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    statusMsg.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
  }

  /* ===================== TABS ===================== */
  let tabs = [];
  let activeTabId = null;
  let tabCounter = 0;

  function makeTabId() { return 'tab_' + (++tabCounter) + '_' + Date.now().toString(36); }

  function uniqueName(base) {
    const existing = new Set(tabs.map(t => t.name));
    if (!existing.has(base)) return base;
    const dot = base.lastIndexOf('.');
    const stem = dot > -1 ? base.slice(0, dot) : base;
    const ext = dot > -1 ? base.slice(dot) : '';
    let n = 2;
    while (existing.has(`${stem}-${n}${ext}`)) n++;
    return `${stem}-${n}${ext}`;
  }

  function createTab(name, content, handle) {
    const doc = new CodeMirror.Doc(content, 'htmlmixed');
    const tab = { id: makeTabId(), name: uniqueName(name), doc, fileHandle: handle || null, dirty: false };
    doc.on('change', () => { tab.dirty = true; renderTabs(); });
    tabs.push(tab);
    return tab;
  }

  function getActiveTab() { return tabs.find(t => t.id === activeTabId) || null; }

  function activateTab(id) {
    const tab = tabs.find(t => t.id === id);
    if (!tab) return;
    activeTabId = id;
    editor.swapDoc(tab.doc);
    renderTabs();
    updatePreview();
    if (searchBar.classList.contains('open')) onSearchInputChanged();
    editor.focus();
  }

  function isBlankTab(tab) {
    return tab && !tab.dirty && tab.doc.getValue() === STARTER && tab.fileHandle === null;
  }

  function newTabDefault() {
    const tab = createTab('unbenannt.html', STARTER, null);
    activateTab(tab.id);
    renderTabs();
    return tab;
  }

  function closeTab(id) {
    const idx = tabs.findIndex(t => t.id === id);
    if (idx === -1) return;
    const tab = tabs[idx];
    if (tab.dirty && !window.confirm(`„${tab.name}" hat ungespeicherte Änderungen. Trotzdem schließen?`)) return;
    tabs.splice(idx, 1);
    if (!tabs.length) {
      newTabDefault();
      return;
    }
    if (activeTabId === id) {
      const next = tabs[idx] || tabs[idx - 1];
      activateTab(next.id);
    }
    renderTabs();
  }

  function markActiveTabDirty() {
    const tab = getActiveTab();
    if (tab && !tab.dirty) { tab.dirty = true; renderTabs(); }
  }

  function renderTabs() {
    tabsScroll.innerHTML = '';
    tabs.forEach((tab) => {
      const el = document.createElement('div');
      el.className = 'tab' + (tab.id === activeTabId ? ' active' : '') + (tab.dirty ? ' dirty' : '');
      el.title = tab.name;
      const dot = document.createElement('span');
      dot.className = 'tab-dot';
      const label = document.createElement('span');
      label.textContent = tab.name;
      const closeBtn = document.createElement('button');
      closeBtn.className = 'tab-close';
      closeBtn.innerHTML = '&times;';
      closeBtn.title = 'Tab schließen';
      closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeTab(tab.id); });
      el.appendChild(dot);
      el.appendChild(label);
      el.appendChild(closeBtn);
      el.addEventListener('click', () => activateTab(tab.id));
      tabsScroll.appendChild(el);
    });
  }

  btnNewTab.addEventListener('click', () => newTabDefault());

  /* ===================== LADEN / SPEICHERN ===================== */
  async function loadFile() {
    if (window.showOpenFilePicker) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: 'HTML-Datei', accept: { 'text/html': ['.html', '.htm'] } }]
        });
        const file = await handle.getFile();
        const text = await file.text();
        openLoadedContent(file.name, text, handle);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      fileInput.click();
    }
  }

  function openLoadedContent(name, text, handle) {
    const active = getActiveTab();
    if (isBlankTab(active)) {
      active.name = uniqueName(name);
      active.doc.setValue(text);
      active.fileHandle = handle || null;
      active.dirty = false;
      activateTab(active.id);
    } else {
      const tab = createTab(name, text, handle || null);
      activateTab(tab.id);
    }
    showToast('Datei geladen: ' + name);
  }

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => openLoadedContent(file.name, reader.result, null);
    reader.readAsText(file);
    fileInput.value = '';
  });

  async function saveFile() {
    const tab = getActiveTab();
    if (!tab) return;
    const content = editor.getValue();

    if (tab.fileHandle) {
      try {
        const writable = await tab.fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        tab.dirty = false;
        renderTabs();
        showToast('Gespeichert: ' + tab.fileHandle.name);
        return;
      } catch (err) {
        console.error(err);
      }
    }
    await saveFileAs();
  }

  async function saveFileAs() {
    const tab = getActiveTab();
    if (!tab) return;
    const content = editor.getValue();

    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: tab.name || 'unbenannt.html',
          types: [{ description: 'HTML-Datei', accept: { 'text/html': ['.html'] } }]
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        tab.fileHandle = handle;
        tab.name = uniqueName(handle.name);
        tab.dirty = false;
        renderTabs();
        showToast('Gespeichert unter: ' + handle.name);
        return;
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
        return;
      }
    }

    let name = window.prompt('Dateiname:', tab.name || 'unbenannt.html');
    if (!name) return;
    if (!/\.html?$/i.test(name)) name += '.html';
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    tab.fileHandle = null;
    tab.name = uniqueName(name);
    tab.dirty = false;
    renderTabs();
    showToast('Heruntergeladen: ' + name);
  }

  btnLoad.addEventListener('click', loadFile);
  btnSave.addEventListener('click', saveFile);
  btnSaveAs.addEventListener('click', saveFileAs);
  document.getElementById('btnRefreshPreview').addEventListener('click', () => { updatePreview(); showToast('Vorschau aktualisiert.'); });

  /* ===================== ANSICHT / VOLLBILD ===================== */
  const layoutModes = ['split', 'editor', 'preview'];
  let layoutIndex = 0;
  document.getElementById('btnLayout').addEventListener('click', () => {
    layoutIndex = (layoutIndex + 1) % layoutModes.length;
    workspace.classList.remove('mode-editor', 'mode-preview');
    const mode = layoutModes[layoutIndex];
    if (mode === 'editor') workspace.classList.add('mode-editor');
    if (mode === 'preview') workspace.classList.add('mode-preview');
    setTimeout(() => editor.refresh(), 150);
  });

  const btnFullscreen = document.getElementById('btnFullscreen');
  btnFullscreen.addEventListener('click', () => {
    if (!document.fullscreenElement) {
      (app.requestFullscreen || app.webkitRequestFullscreen)?.call(app);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  });
  document.addEventListener('fullscreenchange', () => {
    btnFullscreen.classList.toggle('active', !!document.fullscreenElement);
    setTimeout(() => editor.refresh(), 200);
  });

  /* ===================== GERÄTE-VORSCHAU ===================== */
  deviceSwitch.addEventListener('click', (e) => {
    const btn = e.target.closest('.device-btn');
    if (!btn) return;
    deviceSwitch.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    previewWrap.classList.remove('device-desktop', 'device-tablet', 'device-mobile');
    previewWrap.classList.add('device-' + btn.dataset.device);
  });

  /* ===================== SYNCHRONES SCROLLEN (ZEILENGENAU) ===================== */
  let syncScrollEnabled = true;
  let isSyncingScroll = false;
  let tickingEditorScroll = false;
  let tickingPreviewScroll = false;

  function getLineElements(doc) {
    return Array.from(doc.querySelectorAll('[data-hw-line]'))
      .map((el) => ({ el, line: parseInt(el.getAttribute('data-hw-line'), 10) }))
      .filter((x) => !isNaN(x.line));
  }

  function findElementForLine(entries, targetLine) {
    let best = null;
    for (const e of entries) {
      if (e.line <= targetLine && (!best || e.line > best.line)) best = e;
    }
    return best;
  }

  function getEditorTopLine() {
    const info = editor.getScrollInfo();
    return editor.lineAtHeight(info.top, 'local') + 1;
  }

  function getTopVisibleLine(doc, win) {
    const entries = getLineElements(doc);
    let best = null;
    for (const { el, line } of entries) {
      const rect = el.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < win.innerHeight) {
        if (best === null || rect.top < best.top) best = { line, top: rect.top };
      }
    }
    return best ? best.line : null;
  }

  function syncPreviewFromEditor() {
    if (!syncScrollEnabled) return;
    const win = previewFrame.contentWindow;
    const doc = previewFrame.contentDocument;
    if (!win || !doc || !doc.documentElement) return;
    const targetLine = getEditorTopLine();
    const match = findElementForLine(getLineElements(doc), targetLine);
    if (!match) return;
    const rect = match.el.getBoundingClientRect();
    isSyncingScroll = true;
    win.scrollTo(0, Math.max(0, win.scrollY + rect.top));
    requestAnimationFrame(() => { isSyncingScroll = false; });
  }

  function syncEditorFromPreview() {
    if (!syncScrollEnabled) return;
    const win = previewFrame.contentWindow;
    const doc = previewFrame.contentDocument;
    if (!win || !doc) return;
    const line = getTopVisibleLine(doc, win);
    if (line === null) return;
    const top = editor.heightAtLine(line - 1, 'local');
    isSyncingScroll = true;
    editor.scrollTo(null, top);
    requestAnimationFrame(() => { isSyncingScroll = false; });
  }

  editor.on('scroll', () => {
    if (isSyncingScroll || tickingEditorScroll) return;
    tickingEditorScroll = true;
    requestAnimationFrame(() => { syncPreviewFromEditor(); tickingEditorScroll = false; });
  });

  function attachPreviewScrollSync() {
    const win = previewFrame.contentWindow;
    if (!win || win.__hwScrollBound) return;
    win.addEventListener('scroll', () => {
      if (isSyncingScroll || tickingPreviewScroll) return;
      tickingPreviewScroll = true;
      requestAnimationFrame(() => { syncEditorFromPreview(); tickingPreviewScroll = false; });
    });
    win.__hwScrollBound = true;
  }

  btnSyncScroll.addEventListener('click', () => {
    syncScrollEnabled = !syncScrollEnabled;
    btnSyncScroll.classList.toggle('active', syncScrollEnabled);
  });

  /* ===================== STYLE-INSPEKTOR (VORSCHAU) ===================== */
  let inspectorActive = false;
  let selectedEl = null;
  let selectedPath = null;
  let commitTimer = null;

  previewFrame.addEventListener('load', () => {
    attachPreviewScrollSync();
    if (inspectorActive) setupInspector();
  });

  function getPath(el) {
    if (!el || el.nodeType !== 1) return '';
    const parts = [];
    let node = el;
    while (node && node.nodeType === 1 && node.tagName.toLowerCase() !== 'html') {
      const tag = node.tagName.toLowerCase();
      const parent = node.parentElement;
      if (!parent) break;
      const sameTag = Array.from(parent.children).filter(c => c.tagName === node.tagName);
      const idx = sameTag.indexOf(node) + 1;
      parts.unshift(`${tag}:nth-of-type(${idx})`);
      node = parent;
    }
    parts.unshift('html');
    return parts.join(' > ');
  }

  function rgbToHex(rgb) {
    if (!rgb) return '#000000';
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return '#000000';
    return '#' + [1, 2, 3].map(i => (+m[i]).toString(16).padStart(2, '0')).join('');
  }

  function labelFor(el) {
    let cls = (el.className && typeof el.className === 'string')
      ? el.className.split(/\s+/).filter(c => c && c !== 'hw-hover-outline' && c !== 'hw-selected-outline')
      : [];
    let s = el.tagName.toLowerCase();
    if (el.id) s += '#' + el.id;
    if (cls.length) s += '.' + cls.join('.');
    return s;
  }

  function fillSpacing(inputEl, unitEl, inlineVal, computedVal) {
    const m = (inlineVal || '').match(/^([\d.]+)(px|rem|em|%)$/);
    inputEl.value = m ? m[1] : '';
    unitEl.value = m ? m[2] : 'px';
    inputEl.placeholder = computedVal ? Math.round(parseFloat(computedVal)) + 'px' : '0';
  }

  function populatePanel(el) {
    inspectorTarget.textContent = labelFor(el);
    const win = el.ownerDocument.defaultView;
    const computed = win.getComputedStyle(el);

    inspColor.value = rgbToHex(computed.color);
    const bg = computed.backgroundColor;
    inspBg.value = (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') ? '#ffffff' : rgbToHex(bg);

    const fsMatch = (el.style.fontSize || '').match(/^([\d.]+)(px|rem|em|%)$/);
    inspFontSize.value = fsMatch ? fsMatch[1] : '';
    inspFontUnit.value = fsMatch ? fsMatch[2] : 'px';
    inspFontSize.placeholder = Math.round(parseFloat(computed.fontSize)) + 'px';

    const isBold = el.style.fontWeight === 'bold' || parseInt(computed.fontWeight, 10) >= 700;
    inspBold.classList.toggle('active', isBold);
    const isItalic = (el.style.fontStyle || computed.fontStyle) === 'italic';
    inspItalic.classList.toggle('active', isItalic);

    const align = el.style.textAlign || computed.textAlign;
    document.querySelectorAll('.insp-toggle[data-align]').forEach((b) => {
      b.classList.toggle('active', b.dataset.align === align);
    });

    fillSpacing(inspPadding, inspPaddingUnit, el.style.padding, computed.paddingTop);
    fillSpacing(inspMargin, inspMarginUnit, el.style.margin, computed.marginTop);
    fillSpacing(inspRadius, inspRadiusUnit, el.style.borderRadius, computed.borderTopLeftRadius);
  }

  function openInspectorPanel() { inspectorPanel.classList.add('open'); }
  function closeInspectorPanel() { inspectorPanel.classList.remove('open'); }

  function deselectElement() {
    if (selectedEl) selectedEl.classList.remove('hw-selected-outline');
    selectedEl = null;
    selectedPath = null;
    closeInspectorPanel();
  }

  function selectElement(el) {
    if (selectedEl) selectedEl.classList.remove('hw-selected-outline');
    selectedEl = el;
    selectedPath = getPath(el);
    el.classList.remove('hw-hover-outline');
    el.classList.add('hw-selected-outline');
    populatePanel(el);
    openInspectorPanel();
  }

  function applyProp(prop, value) {
    if (!selectedEl) return;
    if (value === '') selectedEl.style.removeProperty(prop);
    else selectedEl.style.setProperty(prop, value);
    clearTimeout(commitTimer);
    commitTimer = setTimeout(commitToSource, 450);
  }

  function commitToSource() {
    const doc = previewFrame.contentDocument;
    if (!doc || !doc.documentElement) return;
    const styleTag = doc.getElementById('hw-inspector-style');
    if (styleTag) styleTag.remove();
    doc.querySelectorAll('.hw-hover-outline, .hw-selected-outline').forEach((el) => {
      el.classList.remove('hw-hover-outline', 'hw-selected-outline');
    });
    doc.querySelectorAll('[data-hw-line]').forEach((el) => el.removeAttribute('data-hw-line'));
    const html = '<!DOCTYPE html>\n' + doc.documentElement.outerHTML;
    editor.setValue(html);
  }

  function onIframeMouseOver(e) {
    if (e.target === selectedEl || e.target.nodeType !== 1) return;
    e.target.classList.add('hw-hover-outline');
  }
  function onIframeMouseOut(e) {
    if (e.target.nodeType !== 1) return;
    e.target.classList.remove('hw-hover-outline');
  }
  function onIframeClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    if (!el || el.nodeType !== 1 || el.tagName.toLowerCase() === 'html') return;
    selectElement(el);
  }

  function setupInspector() {
    const doc = previewFrame.contentDocument;
    if (!doc || !doc.body) return;

    if (!doc.getElementById('hw-inspector-style')) {
      const styleTag = doc.createElement('style');
      styleTag.id = 'hw-inspector-style';
      styleTag.textContent = '.hw-hover-outline{outline:2px dashed rgba(201,162,39,.7) !important;outline-offset:-2px;} .hw-selected-outline{outline:2px solid #c9a227 !important;outline-offset:-2px;} html,body,*{cursor:crosshair !important;}';
      doc.head.appendChild(styleTag);
    }

    if (!doc.__hwInspectorBound) {
      doc.addEventListener('mouseover', onIframeMouseOver, true);
      doc.addEventListener('mouseout', onIframeMouseOut, true);
      doc.addEventListener('click', onIframeClick, true);
      doc.addEventListener('submit', (e) => e.preventDefault(), true);
      doc.__hwInspectorBound = true;
    }

    if (selectedPath) {
      const el = doc.querySelector(selectedPath);
      if (el) {
        selectedEl = el;
        el.classList.add('hw-selected-outline');
        populatePanel(el);
      } else {
        selectedEl = null;
        selectedPath = null;
        closeInspectorPanel();
      }
    }
  }

  function teardownInspector() {
    const doc = previewFrame.contentDocument;
    if (doc) {
      const styleTag = doc.getElementById('hw-inspector-style');
      if (styleTag) styleTag.remove();
      doc.querySelectorAll('.hw-hover-outline, .hw-selected-outline').forEach((el) => {
        el.classList.remove('hw-hover-outline', 'hw-selected-outline');
      });
    }
    deselectElement();
  }

  btnInspector.addEventListener('click', () => {
    inspectorActive = !inspectorActive;
    btnInspector.classList.toggle('active', inspectorActive);
    previewWrap.classList.toggle('inspector-active', inspectorActive);
    if (inspectorActive) setupInspector();
    else teardownInspector();
  });

  inspectorDeselect.addEventListener('click', deselectElement);

  inspColor.addEventListener('input', () => applyProp('color', inspColor.value));
  inspColorReset.addEventListener('click', () => {
    applyProp('color', '');
    if (selectedEl) inspColor.value = rgbToHex(getComputedStyle(selectedEl).color);
  });
  inspBg.addEventListener('input', () => applyProp('background-color', inspBg.value));
  inspBgReset.addEventListener('click', () => {
    applyProp('background-color', '');
    if (selectedEl) inspBg.value = rgbToHex(getComputedStyle(selectedEl).backgroundColor);
  });

  function commitFontSize() {
    if (inspFontSize.value === '') applyProp('font-size', '');
    else applyProp('font-size', inspFontSize.value + inspFontUnit.value);
  }
  inspFontSize.addEventListener('input', commitFontSize);
  inspFontUnit.addEventListener('change', commitFontSize);

  inspBold.addEventListener('click', () => {
    const active = inspBold.classList.toggle('active');
    applyProp('font-weight', active ? 'bold' : 'normal');
  });
  inspItalic.addEventListener('click', () => {
    const active = inspItalic.classList.toggle('active');
    applyProp('font-style', active ? 'italic' : 'normal');
  });

  document.querySelectorAll('.insp-toggle[data-align]').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.insp-toggle[data-align]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      applyProp('text-align', btn.dataset.align);
    });
  });

  function wireSpacing(inputEl, unitEl, prop) {
    const commit = () => {
      if (inputEl.value === '') applyProp(prop, '');
      else applyProp(prop, inputEl.value + unitEl.value);
    };
    inputEl.addEventListener('input', commit);
    unitEl.addEventListener('change', commit);
  }
  wireSpacing(inspPadding, inspPaddingUnit, 'padding');
  wireSpacing(inspMargin, inspMarginUnit, 'margin');
  wireSpacing(inspRadius, inspRadiusUnit, 'border-radius');

  /* ===================== SCHRIFT & ZOOM ===================== */
  function positionPopover() {
    const rect = btnFont.getBoundingClientRect();
    fontPopover.style.top = (rect.bottom + 8) + 'px';
    let right = window.innerWidth - rect.right;
    if (right < 10) right = 10;
    fontPopover.style.right = right + 'px';
  }

  btnFont.addEventListener('click', () => {
    if (fontPopover.classList.contains('open')) {
      fontPopover.classList.remove('open');
    } else {
      positionPopover();
      fontPopover.classList.add('open');
    }
  });
  document.addEventListener('click', (e) => {
    if (!fontPopover.contains(e.target) && e.target !== btnFont && !btnFont.contains(e.target)) {
      fontPopover.classList.remove('open');
    }
  });
  window.addEventListener('resize', () => { if (fontPopover.classList.contains('open')) positionPopover(); });

  fontFamilySelect.addEventListener('change', () => {
    document.documentElement.style.setProperty('--editor-font', fontFamilySelect.value);
    editor.refresh();
  });
  fontSizeRange.addEventListener('input', () => {
    document.documentElement.style.setProperty('--editor-size', fontSizeRange.value + 'px');
    fontSizeValue.textContent = fontSizeRange.value + 'px';
    editor.refresh();
  });
  lineHeightRange.addEventListener('input', () => {
    document.documentElement.style.setProperty('--editor-lh', lineHeightRange.value);
    lineHeightValue.textContent = lineHeightRange.value;
    editor.refresh();
  });

  /* ===================== FORMATIEREN ===================== */
  btnFormat.addEventListener('click', () => {
    if (typeof html_beautify !== 'function') { showToast('Formatierer konnte nicht geladen werden.'); return; }
    const formatted = html_beautify(editor.getValue(), {
      indent_size: 2,
      wrap_line_length: 0,
      preserve_newlines: true,
      max_preserve_newlines: 2,
      indent_inner_html: false,
      extra_liners: []
    });
    editor.setValue(formatted);
    updatePreview();
    showToast('Code formatiert.');
  });

  /* ===================== RESIZER ===================== */
  let dragging = false;
  resizer.addEventListener('mousedown', () => { dragging = true; document.body.style.cursor = 'col-resize'; });
  window.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    const clamped = Math.min(80, Math.max(20, pct));
    paneEditor.style.flex = `0 0 ${clamped}%`;
    panePreview.style.flex = `1 1 ${100 - clamped}%`;
  });
  window.addEventListener('mouseup', () => {
    if (dragging) { dragging = false; document.body.style.cursor = ''; editor.refresh(); }
  });

  /* ===================== MODALS: ALLGEMEIN ===================== */
  function openModal(el) { el.classList.add('open'); }
  function closeModal(el) { el.classList.remove('open'); }

  document.querySelectorAll('[data-close-modal]').forEach((btn) => {
    btn.addEventListener('click', (e) => closeModal(e.target.closest('.modal-overlay')));
  });
  document.querySelectorAll('.modal-overlay').forEach((ov) => {
    ov.addEventListener('click', (e) => { if (e.target === ov) closeModal(ov); });
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(closeModal);
    }
  });

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* ===================== MARKDOWN EINFÜGEN ===================== */
  function renderMdPreview() {
    markdownPreview.innerHTML = mdInput.value.trim() ? marked.parse(mdInput.value) : '<p style="color:#999">Vorschau erscheint hier …</p>';
  }
  mdInput.addEventListener('input', renderMdPreview);

  btnMarkdown.addEventListener('click', () => {
    mdInput.value = '';
    renderMdPreview();
    openModal(modalMarkdown);
    setTimeout(() => mdInput.focus(), 50);
  });

  btnInsertMarkdown.addEventListener('click', () => {
    if (!mdInput.value.trim()) { showToast('Kein Markdown eingegeben.'); return; }
    const html = marked.parse(mdInput.value || '');
    editor.replaceSelection(html + '\n');
    editor.focus();
    closeModal(modalMarkdown);
    updatePreview();
    showToast('Markdown als HTML eingefügt.');
  });

  /* ===================== SCRIPT-BUTTON EINFÜGEN ===================== */
  function buildButtonStyle(kind) {
    if (kind === 'gold') {
      return ' style="background:#c9a227;color:#161200;border:none;border-radius:6px;padding:10px 18px;font-family:\'Barlow\',sans-serif;font-weight:600;cursor:pointer;"';
    }
    if (kind === 'ghost') {
      return ' style="background:transparent;color:#c9a227;border:1px solid #c9a227;border-radius:6px;padding:10px 18px;font-family:\'Barlow\',sans-serif;font-weight:600;cursor:pointer;"';
    }
    return '';
  }

  btnScriptBtn.addEventListener('click', () => {
    scriptBtnLabel.value = '';
    scriptBtnCode.value = '';
    scriptBtnStyle.value = 'gold';
    openModal(modalScriptBtn);
    setTimeout(() => scriptBtnLabel.focus(), 50);
  });

  btnInsertScriptBtn.addEventListener('click', () => {
    const label = scriptBtnLabel.value.trim() || 'Button';
    const code = scriptBtnCode.value.trim();
    if (!code) { showToast('Bitte JavaScript-Code angeben.'); return; }
    const styleAttr = buildButtonStyle(scriptBtnStyle.value);
    const safeCode = code.replace(/"/g, '&quot;');
    const snippet = `<button type="button"${styleAttr} onclick="${safeCode}">${escapeHtml(label)}</button>`;
    editor.replaceSelection(snippet + '\n');
    editor.focus();
    closeModal(modalScriptBtn);
    updatePreview();
    showToast('Script-Button eingefügt.');
  });

  /* ===================== BAUSTEIN-BIBLIOTHEK ===================== */
  function renderSnippetGrid() {
    snippetGrid.innerHTML = '';
    SNIPPETS.forEach((snip) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'snippet-card';
      card.innerHTML = `<span class="sc-name">${escapeHtml(snip.name)}</span><span class="sc-desc">${snip.desc}</span>`;
      card.addEventListener('click', () => {
        editor.replaceSelection(snip.code + '\n');
        updatePreview();
        showToast(`„${snip.name}" eingefügt.`);
      });
      snippetGrid.appendChild(card);
    });
  }
  renderSnippetGrid();

  btnSnippets.addEventListener('click', () => openModal(modalSnippets));

  /* ===================== STYLES-PANEL ===================== */
  let styleEditor = null;

  function extractStyleBlock() {
    const src = editor.getValue();
    const match = src.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    return match ? match[1] : '/* Kein <style>-Block gefunden – wird beim Anwenden neu erstellt */\nbody {\n\n}';
  }

  function normalizeHex(hex) {
    if (hex.length === 4) return '#' + [...hex.slice(1)].map((c) => c + c).join('');
    if (hex.length > 7) return hex.slice(0, 7);
    return hex;
  }
  function escapeRegExp(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  function renderSwatches(css) {
    const found = [...new Set(css.match(/#[0-9a-fA-F]{3,8}\b/g) || [])];
    colorSwatches.innerHTML = '';
    const p = document.createElement('p');
    p.className = 'hint';
    p.textContent = found.length ? 'Im Style-Block gefundene Farben – Klick zum Ändern.' : 'Keine Hex-Farben im Style-Block gefunden.';
    colorSwatches.appendChild(p);
    if (!found.length) return;
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '8px';
    found.forEach((hex) => {
      const input = document.createElement('input');
      input.type = 'color';
      input.className = 'swatch';
      try { input.value = normalizeHex(hex); } catch (e) { input.value = '#c9a227'; }
      input.title = hex;
      input.addEventListener('input', () => {
        const cur = styleEditor.getValue();
        const re = new RegExp(escapeRegExp(hex), 'g');
        styleEditor.setValue(cur.replace(re, input.value));
      });
      row.appendChild(input);
    });
    colorSwatches.appendChild(row);
  }

  function openStylesPanel() {
    const cssContent = extractStyleBlock();
    if (!styleEditor) {
      styleEditor = CodeMirror(document.getElementById('styleEditorHost'), {
        value: cssContent,
        mode: 'css',
        theme: 'material-darker',
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2
      });
    } else {
      styleEditor.setValue(cssContent);
    }
    renderSwatches(cssContent);
    panelStyles.classList.add('open');
    setTimeout(() => styleEditor.refresh(), 200);
  }

  function applyStyles() {
    const newCss = styleEditor.getValue();
    const src = editor.getValue();
    const block = `<style>\n${newCss}\n</style>`;
    const match = src.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
    let updated;
    if (match) {
      updated = src.replace(match[0], block);
    } else if (/<\/head>/i.test(src)) {
      updated = src.replace(/<\/head>/i, block + '\n</head>');
    } else {
      updated = block + '\n' + src;
    }
    editor.setValue(updated);
    updatePreview();
    renderSwatches(newCss);
    showToast('Styles angewendet.');
  }

  document.getElementById('btnStyles').addEventListener('click', openStylesPanel);
  closeStyles.addEventListener('click', () => panelStyles.classList.remove('open'));
  btnApplyStyles.addEventListener('click', applyStyles);

  /* ===================== SUCHEN & ERSETZEN ===================== */
  function clearMarks() {
    searchMarks.forEach((m) => m.mark.clear());
    searchMarks = [];
  }

  function refreshHighlights() {
    clearMarks();
    const q = searchInput.value;
    if (!q) return;
    const cur = editor.getSearchCursor(q, { line: 0, ch: 0 }, { caseFold: true });
    while (cur.findNext()) {
      const from = cur.from(), to = cur.to();
      const mark = editor.markText(from, to, { className: 'search-highlight' });
      searchMarks.push({ mark, from, to });
    }
  }

  function updateSearchCount() {
    const q = searchInput.value;
    if (!q) { searchCount.textContent = ''; return; }
    const total = searchMarks.length;
    if (!total) { searchCount.textContent = 'Keine Treffer'; return; }
    const idx = currentMatchIdx >= 0 ? currentMatchIdx + 1 : 1;
    searchCount.textContent = `${idx} von ${total}`;
  }

  function findMatch(backwards) {
    const q = searchInput.value;
    if (!q || !searchMarks.length) { updateSearchCount(); return; }
    const start = backwards ? editor.getCursor('from') : editor.getCursor('to');
    let cur = editor.getSearchCursor(q, start, { caseFold: true });
    let found = backwards ? cur.findPrevious() : cur.findNext();
    if (!found) {
      const wrapStart = backwards ? { line: editor.lineCount(), ch: 0 } : { line: 0, ch: 0 };
      cur = editor.getSearchCursor(q, wrapStart, { caseFold: true });
      found = backwards ? cur.findPrevious() : cur.findNext();
    }
    if (found) {
      const from = cur.from(), to = cur.to();
      editor.setSelection(from, to);
      editor.scrollIntoView({ from, to }, 60);
      currentMatchIdx = searchMarks.findIndex((m) =>
        m.from.line === from.line && m.from.ch === from.ch && m.to.line === to.line && m.to.ch === to.ch);
    }
    updateSearchCount();
  }

  function onSearchInputChanged() {
    currentMatchIdx = -1;
    refreshHighlights();
    if (searchMarks.length) findMatch(false);
    else updateSearchCount();
  }

  function openSearch() {
    searchBar.classList.add('open');
    searchInput.focus();
    searchInput.select();
    onSearchInputChanged();
  }
  function closeSearch() {
    clearMarks();
    searchBar.classList.remove('open');
    editor.focus();
  }

  function replaceOne() {
    const q = searchInput.value;
    if (!q) return;
    const sel = editor.getSelection();
    if (sel && sel.toLowerCase() === q.toLowerCase()) {
      editor.replaceSelection(replaceInput.value);
    }
    currentMatchIdx = -1;
    refreshHighlights();
    if (searchMarks.length) findMatch(false); else updateSearchCount();
    updatePreview();
  }

  function replaceAll() {
    const q = searchInput.value;
    if (!q) return;
    const r = replaceInput.value;
    const cur = editor.getSearchCursor(q, { line: 0, ch: 0 }, { caseFold: true });
    let count = 0;
    editor.operation(() => {
      while (cur.findNext()) {
        cur.replace(r);
        count++;
      }
    });
    currentMatchIdx = -1;
    refreshHighlights();
    updateSearchCount();
    updatePreview();
    showToast(`${count} Ersetzung(en) durchgeführt.`);
  }

  let searchRefreshTimer = null;

  btnSearch.addEventListener('click', () => {
    if (searchBar.classList.contains('open')) closeSearch();
    else openSearch();
  });
  searchInput.addEventListener('input', onSearchInputChanged);
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); findMatch(e.shiftKey); }
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
  });
  replaceInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); replaceOne(); }
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
  });
  searchNext.addEventListener('click', () => findMatch(false));
  searchPrev.addEventListener('click', () => findMatch(true));
  btnReplaceOne.addEventListener('click', replaceOne);
  btnReplaceAll.addEventListener('click', replaceAll);
  searchClose.addEventListener('click', closeSearch);

  /* ===================== INIT ===================== */
  newTabDefault();
})();
