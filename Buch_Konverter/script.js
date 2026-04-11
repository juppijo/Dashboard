/* ═══════════════════════════════════════════════════
   DOCX → BUCH KONVERTER  |  script.js
   ═══════════════════════════════════════════════════ */
'use strict';

/* ── State ── */
const state = {
    pages:        [],    // Array of HTML strings
    images:       [],    // [{filename, blob, mimeType}]
    currentSpread: 0,
    totalSpreads:  0,
    layout:       'double',
    speaking:     false,
    title:        'Mein Buch',
    wordCount:    0
};

/* ── DOM refs ── */
const $ = id => document.getElementById(id);

/* ════════════════════════════════
   UPLOAD & CONVERSION
   ════════════════════════════════ */
function initUpload() {
    const fileInput = $('file-input');
    const dropZone  = $('drop-zone');

    fileInput.addEventListener('change', e => {
        if (e.target.files[0]) processFile(e.target.files[0]);
    });
    dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', ()  => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
        e.preventDefault(); dropZone.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f && f.name.endsWith('.docx')) processFile(f);
        else showToast('Bitte eine .docx Datei wählen');
    });
    dropZone.addEventListener('click', e => {
        if (!e.target.classList.contains('btn-upload-choose')) fileInput.click();
    });
}

async function processFile(file) {
    state.title  = file.name.replace(/\.docx$/i, '');
    state.images = [];

    const progressWrap = $('progress-wrap');
    const dropZone     = $('drop-zone');
    progressWrap.hidden = false;
    dropZone.style.opacity = '0.4';
    dropZone.style.pointerEvents = 'none';

    setProgress(10, 'Datei wird gelesen…');

    try {
        const arrayBuffer = await file.arrayBuffer();
        setProgress(30, 'Word-Format wird analysiert…');

        let imgCounter = 0;

        const result = await mammoth.convertToHtml({ arrayBuffer }, {
            convertImage: mammoth.images.imgElement(async (image) => {
                imgCounter++;
                // Bestimme Dateiendung
                const ext = (image.contentType || 'image/jpeg').split('/')[1]
                              .replace('jpeg','jpg').replace('svg+xml','svg') || 'jpg';
                const filename = `bild_${String(imgCounter).padStart(3,'0')}.${ext}`;

                // Bild als Blob speichern
                const arrayBuf = await image.read('arraybuffer');
                const blob = new Blob([arrayBuf], { type: image.contentType || 'image/jpeg' });
                state.images.push({ filename, blob, mimeType: image.contentType });

                // In HTML → Pfad relativ zum Ausgabe-Ordner
                return { src: `images/${filename}`, class: 'book-image', alt: `Bild ${imgCounter}` };
            })
        });

        setProgress(65, 'Seiten werden aufgebaut…');
        buildPages(result.value);
        setProgress(90, 'Vorschau wird generiert…');
        await new Promise(r => setTimeout(r, 120));
        setProgress(100, 'Fertig!');
        await new Promise(r => setTimeout(r, 280));

        // Zum Reader wechseln
        const uploadScreen = $('upload-screen');
        uploadScreen.style.opacity = '0';
        uploadScreen.style.transform = 'scale(1.04)';
        uploadScreen.style.transition = 'all 0.38s ease';
        await new Promise(r => setTimeout(r, 380));
        uploadScreen.hidden = true;

        const readerScreen = $('reader-screen');
        readerScreen.hidden = false;

        // Dateibaum im Save-Dialog aktualisieren
        updateSaveDialogInfo();

    } catch(err) {
        console.error(err);
        setProgress(0,'');
        showToast('Fehler: ' + err.message);
        dropZone.style.opacity = '1';
        dropZone.style.pointerEvents = '';
        $('progress-wrap').hidden = true;
    }
}

function setProgress(pct, text) {
    $('progress-fill').style.width = pct + '%';
    $('progress-text').textContent = text;
}

/* ════════════════════════════════
   PAGE BUILDING
   ════════════════════════════════ */
function buildPages(rawHtml) {
    const parser = new DOMParser();
    const doc  = parser.parseFromString(`<div id="r">${rawHtml}</div>`, 'text/html');
    const root = doc.getElementById('r');

    const rawPages = [];
    let current = '';

    for (const node of root.childNodes) {
        const s = node.outerHTML || node.textContent || '';
        if (s.includes('###')) {
            current += s.replace(/###/g, '');
            if (current.trim()) { rawPages.push(current); current = ''; }
        } else {
            current += s;
        }
    }
    if (current.trim()) rawPages.push(current);

    // TOC-Seite nach erster Seite einfügen
    const tocHtml = buildInPageToc(rawPages);
    state.pages = rawPages.length > 0
        ? [rawPages[0], tocHtml, ...rawPages.slice(1)]
        : [tocHtml];

    // Auf gerade Anzahl auffüllen
    if (state.pages.length % 2 !== 0) {
        state.pages.push('<p style="text-align:center;margin-top:42%;opacity:.28;font-family:\'Playfair Display\',serif;font-size:1.1em;letter-spacing:.15em;">― FINIS ―</p>');
    }

    // Statistiken
    const allText = state.pages.join(' ').replace(/<[^>]+>/g,' ');
    state.wordCount = allText.split(/\s+/).filter(Boolean).length;

    $('book-title-display').textContent = state.title;
    renderReader();
    restoreBookmark();
}

function buildInPageToc(pages) {
    let items = '';
    pages.forEach((p, i) => {
        const m = p.match(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
        if (m && i > 0) {
            const lvl  = parseInt(m[1]);
            const text = m[2].replace(/<[^>]+>/g,'').trim();
            const cls  = lvl === 2 ? 'toc-h2' : lvl === 3 ? 'toc-h3' : '';
            items += `<li class="${cls}" data-target="${i+2}"><span>${text}</span><span class="toc-num">${i+2}</span></li>`;
        }
    });
    return `<div class="toc-page-title">Inhaltsverzeichnis</div><ul class="toc-page-list">${items}</ul>`;
}

/* ════════════════════════════════
   RENDER
   ════════════════════════════════ */
function renderReader() {
    const pps = state.layout === 'double' ? 2 : 1;
    state.totalSpreads  = Math.ceil(state.pages.length / pps);
    state.currentSpread = Math.min(state.currentSpread, state.totalSpreads - 1);

    let html = '<div class="book-pages-wrapper"><div class="pages-track">';
    for (let s = 0; s < state.totalSpreads; s++) {
        html += `<div class="page-spread ${state.layout}">`;
        const start = s * pps;
        for (let p = start; p < start + pps && p < state.pages.length; p++) {
            html += `<div class="book-page">
                        <div class="page-inner">${state.pages[p]}</div>
                        <div class="page-num">— ${p+1} —</div>
                     </div>`;
        }
        html += '</div>';
    }
    html += '</div></div>';
    $('book-container').innerHTML = html;

    // TOC-Seiten-Links
    $('book-container').querySelectorAll('.toc-page-list li[data-target]').forEach(li => {
        li.addEventListener('click', () => {
            const p   = parseInt(li.dataset.target) - 1;
            const pps = state.layout === 'double' ? 2 : 1;
            goToSpread(Math.floor(p / pps));
        });
    });

    updateView();
    buildTocOverlay();
    buildPageDots();
    updateStats();
}

function goToSpread(idx) {
    state.currentSpread = Math.max(0, Math.min(idx, state.totalSpreads - 1));
    updateView();
}

function updateView() {
    const track = $('book-container').querySelector('.pages-track');
    if (track) track.style.transform = `translateX(-${state.currentSpread * 100}%)`;

    const pps   = state.layout === 'double' ? 2 : 1;
    const first = state.currentSpread * pps + 1;
    const last  = Math.min(first + pps - 1, state.pages.length);
    $('page-info').textContent = first === last
        ? `${first} / ${state.pages.length}`
        : `${first}–${last} / ${state.pages.length}`;

    $('btn-prev').style.opacity = state.currentSpread === 0 ? '.32' : '1';
    $('btn-next').style.opacity = state.currentSpread >= state.totalSpreads - 1 ? '.32' : '1';
    buildPageDots();
}

function buildPageDots() {
    const el  = $('page-dots');
    const max = 14;
    if (state.totalSpreads <= 1) { el.innerHTML = ''; return; }
    const cnt = Math.min(state.totalSpreads, max);
    let html = '';
    for (let i = 0; i < cnt; i++) {
        const idx    = state.totalSpreads > max ? Math.round(i*(state.totalSpreads-1)/(max-1)) : i;
        const active = idx === state.currentSpread ? ' active' : '';
        html += `<div class="page-dot${active}" data-idx="${idx}"></div>`;
    }
    el.innerHTML = html;
    el.querySelectorAll('.page-dot').forEach(d => {
        d.addEventListener('click', () => goToSpread(parseInt(d.dataset.idx)));
    });
}

function buildTocOverlay() {
    const pps = state.layout === 'double' ? 2 : 1;
    let html = '';
    state.pages.forEach((p, i) => {
        const m = p.match(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
        if (m && i > 1) {
            const lvl  = parseInt(m[1]);
            const text = m[2].replace(/<[^>]+>/g,'').trim();
            const si   = Math.floor(i / pps);
            const ind  = (lvl - 1) * 16;
            const fsz  = lvl === 1 ? '1em' : lvl === 2 ? '.9em' : '.82em';
            html += `<div class="toc-entry" data-spread="${si}"
                style="padding:7px 0 7px ${ind}px; border-bottom:1px solid rgba(255,255,255,.05);
                       cursor:pointer; display:flex; justify-content:space-between;
                       font-size:${fsz}; color:rgba(255,255,255,.72); transition:color .18s;"
                onmouseover="this.style.color='var(--accent)'"
                onmouseout="this.style.color='rgba(255,255,255,.72)'">
                <span>${text}</span>
                <span style="font-size:.74em;opacity:.45;font-family:monospace;margin-left:12px">${i+1}</span>
            </div>`;
        }
    });
    $('toc-list').innerHTML = html ||
        '<p style="opacity:.38;font-size:.85rem;padding:8px 0">Keine Überschriften gefunden</p>';
    $('toc-list').querySelectorAll('.toc-entry').forEach(el => {
        el.addEventListener('click', () => {
            goToSpread(parseInt(el.dataset.spread));
            $('toc-overlay').hidden = true;
        });
    });
}

function updateStats() {
    $('word-count').textContent = `${state.wordCount.toLocaleString('de-DE')} Wörter`;
    const mins = Math.ceil(state.wordCount / 200);
    $('reading-time').textContent = `≈ ${mins} Min`;
    const imgN = state.images.length;
    $('img-count-display').textContent = imgN > 0 ? `🖼 ${imgN} Bild${imgN!==1?'er':''}` : '';
}

function updateSaveDialogInfo() {
    $('ft-folder-name').textContent = state.title;
    const n = state.images.length;
    $('ft-img-count').textContent = n > 0 ? `${n} Datei${n!==1?'en':''}` : 'leer';
}

/* ════════════════════════════════
   NAVIGATION
   ════════════════════════════════ */
function prev() { stopSpeech(); if (state.currentSpread > 0) goToSpread(state.currentSpread - 1); }
function next() { stopSpeech(); if (state.currentSpread < state.totalSpreads - 1) goToSpread(state.currentSpread + 1); }

document.addEventListener('keydown', e => {
    if (!$('reader-screen').hidden) {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
        if (e.key === 'Escape') {
            $('style-panel').hidden = true;
            $('btn-style-panel').classList.remove('active');
            $('toc-overlay').hidden = true;
            $('save-dialog').hidden = true;
            $('reader-screen').classList.remove('zen-mode');
            if (document.fullscreenElement) document.exitFullscreen();
        }
    }
});

let touchX = 0;
document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive:true });
document.addEventListener('touchend',   e => {
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 48) dx < 0 ? next() : prev();
});

/* ════════════════════════════════
   SPEECH
   ════════════════════════════════ */
function stopSpeech() {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    state.speaking = false;
    const btn = $('btn-speak');
    if (btn) btn.classList.remove('speaking');
}

function toggleSpeech() {
    const synth = window.speechSynthesis;
    if (!synth) { showToast('Sprachausgabe nicht verfügbar'); return; }
    if (synth.speaking) { stopSpeech(); return; }

    const pps   = state.layout === 'double' ? 2 : 1;
    const start = state.currentSpread * pps;
    let text = '';
    for (let i = start; i < start + pps && i < state.pages.length; i++) {
        const d = document.createElement('div');
        d.innerHTML = state.pages[i];
        text += ' ' + (d.innerText || d.textContent);
    }

    const u = new SpeechSynthesisUtterance(text.trim());
    u.lang = 'de-DE'; u.rate = 0.94;
    u.onend = () => {
        if (state.speaking) {
            next();
            setTimeout(() => {
                if (state.currentSpread < state.totalSpreads - 1) toggleSpeech();
                else stopSpeech();
            }, 700);
        }
    };
    synth.speak(u);
    state.speaking = true;
    $('btn-speak').classList.add('speaking');
}

/* ════════════════════════════════
   BOOKMARK
   ════════════════════════════════ */
function saveBookmark() {
    const key = 'bm_' + state.title;
    localStorage.setItem(key, state.currentSpread);
    showToast('🔖 Lesezeichen gesetzt');
    $('btn-bookmark').classList.add('active');
    setTimeout(() => $('btn-bookmark').classList.remove('active'), 1400);
}

function restoreBookmark() {
    const key   = 'bm_' + state.title;
    const saved = localStorage.getItem(key);
    if (saved && parseInt(saved) > 0) {
        setTimeout(() => {
            if (confirm(`Lesezeichen gefunden. Weiter ab Seite ${parseInt(saved)+1}?`))
                goToSpread(parseInt(saved));
        }, 500);
    }
}

/* ════════════════════════════════
   VORSCHAU (neuer Tab)
   ════════════════════════════════ */
function openPreview() {
    if (!state.pages.length) { showToast('Kein Inhalt zum Voranzeigen'); return; }

    // Aktuelle Stilwerte auslesen
    const cs     = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim()  || '#c9a84c';
    const paper  = cs.getPropertyValue('--paper').trim()   || '#fdfaf3';
    const text   = cs.getPropertyValue('--text').trim()    || '#2c3e50';
    const font   = document.body.dataset.font || 'Lora';
    const fsize  = cs.getPropertyValue('--font-size').trim() || '15px';
    const lh     = cs.getPropertyValue('--line-height').trim() || '1.7';

    // Bilder als Object URLs einbetten (nur für Vorschau-Tab)
    let pagesHtml = state.pages.map((p, i) => {
        // Ersetzt images/xxx.jpg durch blob URLs für die Vorschau
        let html = p;
        state.images.forEach(img => {
            const blobUrl = URL.createObjectURL(img.blob);
            html = html.replace(new RegExp(`images/${img.filename}`, 'g'), blobUrl);
        });
        return `<article class="page-block" id="p${i+1}">
                    <div class="page-num-label">Seite ${i+1}</div>
                    ${html}
                </article>`;
    }).join('\n<hr class="page-divider">\n');

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vorschau – ${escHtml(state.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
:root { --accent:${accent}; --paper:${paper}; --text:${text}; }
* { box-sizing:border-box; margin:0; padding:0; }
body {
    background: #1a1428;
    font-family:'${font}',serif;
    font-size:${fsize}; line-height:${lh};
    color:var(--text);
    padding: 40px 20px 80px;
}
.preview-header {
    text-align:center; margin-bottom:40px;
    font-family:'Playfair Display',serif;
    color:rgba(255,255,255,.6);
}
.preview-header h1 { font-size:1.6rem; color:var(--accent); margin-bottom:6px; }
.preview-header p  { font-size:.85rem; }
.page-block {
    background:var(--paper); color:var(--text);
    max-width:740px; margin:0 auto 0;
    padding: 52px 56px 44px;
    border-radius:4px;
    box-shadow: 0 20px 60px rgba(0,0,0,.55);
    position:relative;
}
.page-num-label {
    position:absolute; bottom:14px; left:50%; transform:translateX(-50%);
    font-size:.7rem; opacity:.45; letter-spacing:.1em; font-family:monospace;
}
.page-divider {
    border:none; max-width:740px; margin:28px auto;
    border-top: 1px dashed rgba(255,255,255,.1);
}
h1 { font-family:'Playfair Display',serif; font-size:1.65em; font-weight:700;
     border-bottom:2px solid var(--accent); padding-bottom:.28em; margin-bottom:.55em; }
h2 { font-family:'Playfair Display',serif; font-size:1.3em; font-weight:700; margin:1.1em 0 .45em; }
h3, h4 { font-size:1.08em; font-weight:600; margin:.9em 0 .35em; }
p { margin-bottom:.85em; text-align:justify; hyphens:auto; }
p:first-of-type::first-letter {
    float:left; font-family:'Playfair Display',serif; font-size:3.1em;
    line-height:.8; margin:.05em .08em 0 0; color:var(--accent); font-weight:700;
}
blockquote { border-left:3px solid var(--accent); padding:6px 14px; margin:1em 0; font-style:italic; opacity:.8; }
img { max-width:100%; max-height:50vh; display:block; margin:18px auto; border-radius:4px; box-shadow:0 4px 16px rgba(0,0,0,.18); }
ul, ol { padding-left:1.4em; margin-bottom:.85em; }
li { margin-bottom:.28em; }
table { width:100%; border-collapse:collapse; margin:1em 0; font-size:.9em; }
th { padding:6px 10px; border-bottom:2px solid var(--accent); font-weight:600; }
td { padding:5px 10px; border-bottom:1px solid rgba(0,0,0,.07); }
.toc-page-title { font-family:'Playfair Display',serif; font-size:1.5em; font-weight:700; margin-bottom:1.4em; padding-bottom:.35em; border-bottom:2px solid var(--accent); }
.toc-page-list  { list-style:none; }
.toc-page-list li { display:flex; justify-content:space-between; padding:5px 0; border-bottom:1px dotted rgba(0,0,0,.1); }
.toc-page-list li .toc-num { font-family:monospace; font-size:.8em; opacity:.55; }
.toc-h2 { padding-left:14px; font-size:.92em; }
.toc-h3 { padding-left:28px; font-size:.85em; opacity:.78; }
</style>
</head>
<body>
<div class="preview-header">
    <h1>${escHtml(state.title)}</h1>
    <p>${state.pages.length} Seiten · ${state.wordCount.toLocaleString('de-DE')} Wörter · ${state.images.length} Bild${state.images.length!==1?'er':''}</p>
</div>
${pagesHtml}
</body>
</html>`;

    const blob = new Blob([html], { type:'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    showToast('Vorschau in neuem Tab geöffnet');
}

/* ════════════════════════════════
   SAVE AS ZIP  (JSZip — funktioniert überall)
   ════════════════════════════════ */
function openSaveDialog() {
    if (!state.pages.length) { showToast('Bitte zuerst eine Datei laden'); return; }
    $('save-dialog').hidden     = false;
    $('save-prog').hidden       = true;
    $('save-done').hidden       = true;
    $('btn-pick-folder').hidden = false;
    updateSaveDialogInfo();
}

const tick = () => new Promise(r => setTimeout(r, 0));

async function saveToFolder() {
    $('btn-pick-folder').hidden = true;
    $('save-prog').hidden       = false;
    $('save-done').hidden       = true;

    const setP = (pct, msg) => {
        $('sp2-fill').style.width = pct + '%';
        $('sp2-text').textContent = msg;
    };

    try {
        const zip       = new JSZip();
        const bookDir   = zip.folder(state.title);
        const imgDir    = state.images.length > 0 ? bookDir.folder('images') : null;
        const total     = state.images.length + 3;
        let   done      = 0;

        // ── Bilder in images/ ──
        for (const img of state.images) {
            imgDir.file(img.filename, img.blob);
            done++;
            setP(Math.round(done / total * 80), `Bild ${done}/${state.images.length}: ${img.filename}`);
            await tick();
        }

        // ── style.css (inline String, kein fetch nötig) ──
        setP(84, 'style.css…');
        bookDir.file('style.css', getEmbeddedCss());
        await tick();

        // ── script.js (Reader-Only-Version) ──
        setP(88, 'script.js…');
        bookDir.file('script.js', getReaderScript());
        await tick();

        // ── index.html ──
        setP(92, 'index.html…');
        bookDir.file('index.html', buildOutputHtml());
        await tick();

        // ── ZIP generieren ──
        setP(95, 'ZIP wird komprimiert…');
        const blob = await zip.generateAsync(
            { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
            meta => setP(95 + Math.round(meta.percent * 0.05), `Komprimiere… ${Math.round(meta.percent)}%`)
        );

        setP(100, 'Fertig!');
        await tick();

        // Download auslösen
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = state.title + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 6000);

        await new Promise(r => setTimeout(r, 300));
        $('save-prog').hidden = true;
        $('save-done').hidden = false;
        $('save-done-path').textContent = `ZIP entpacken → ${state.title}/ → index.html öffnen`;
        showToast(`✓ ${state.title}.zip heruntergeladen`);

    } catch(err) {
        console.error(err);
        setP(0, 'Fehler: ' + err.message);
        showToast('Fehler: ' + err.message);
        $('btn-pick-folder').hidden = false;
    }
}

/* ── Hilfsfunktionen für ZIP-Inhalt ── */

// Liefert das vollständige CSS als String (kein fetch nötig)
function getEmbeddedCss() {
    // Holt den tatsächlichen Stylesheet-Inhalt aus dem geladenen <link>
    for (const sheet of document.styleSheets) {
        try {
            if (sheet.href && sheet.href.includes('style.css')) {
                return Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
            }
        } catch(e) { /* cross-origin, überspringen */ }
    }
    // Fallback: minimales funktionsfähiges CSS
    return `/* style.css — Buch-Reader */
*, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
:root { --accent:#c9a84c; --accent-dim:#a87e2e; --paper:#fdfaf3; --text:#2c3e50; --text-muted:#7a869a; --bg:#0d0920; --bg2:#16103a; --bar-bg:rgba(10,7,30,.88); --bar-border:rgba(255,255,255,.07); --sp-bg:#100d28; --sp-border:rgba(255,255,255,.09); --overlay-bg:rgba(0,0,0,.65); --font-body:'Lora',serif; --font-size:15px; --line-height:1.7; --page-width:75%; --tr:0.22s cubic-bezier(.4,0,.2,1); }
body.theme-cosmos  { --bg:#0d0920;  --bg2:#16103a; --accent:#c9a84c; --sp-bg:#100d28; }
body.theme-forest  { --bg:#0a1a0d;  --bg2:#102015; --accent:#6ab04c; --sp-bg:#0c1810; }
body.theme-ocean   { --bg:#060e1e;  --bg2:#0c1830; --accent:#4fc3f7; --sp-bg:#081022; }
body.theme-crimson { --bg:#140606;  --bg2:#200c0c; --accent:#e57373; --sp-bg:#160808; }
body.theme-sepia   { --bg:#ede8df; --paper:#f9f4e8; --text:#3b2e1a; --accent:#8b6914; --bar-bg:rgba(50,35,15,.92); --sp-bg:#faf5ea; --sp-border:rgba(0,0,0,.1); --text-muted:#8b7355; }
body.theme-mint    { --bg:#e8f5f0; --paper:#f5faf8; --text:#1a3d2e; --accent:#00897b; --bar-bg:rgba(10,50,35,.92); --sp-bg:#f0faf5; --text-muted:#4a7a68; }
html,body { height:100%; overflow:hidden; }
body { font-family:var(--font-body); background:var(--bg); color:var(--text); transition:background var(--tr),color var(--tr); }
#reader-screen { height:100vh; display:flex; flex-direction:column; overflow:hidden; }
#reader-screen.zen-mode #topbar, #reader-screen.zen-mode #statusbar { opacity:0; pointer-events:none; }
#topbar { display:flex; align-items:center; justify-content:space-between; padding:0 12px; height:54px; flex-shrink:0; background:var(--bar-bg); border-bottom:1px solid var(--bar-border); backdrop-filter:blur(16px); z-index:100; }
.bar-left,.bar-right { display:flex; align-items:center; gap:3px; }
.bar-center { display:flex; align-items:center; gap:3px; }
.book-title-display { font-family:'Playfair Display',serif; font-size:.84rem; color:rgba(255,255,255,.45); margin-left:8px; max-width:160px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
body.theme-sepia .book-title-display, body.theme-mint .book-title-display { color:var(--text-muted); }
#page-info { font-size:.78rem; color:rgba(255,255,255,.5); min-width:62px; text-align:center; font-family:monospace; }
body.theme-sepia #page-info, body.theme-mint #page-info { color:var(--text-muted); }
.bar-btn { height:34px; padding:0 8px; min-width:34px; display:flex; align-items:center; justify-content:center; gap:5px; background:transparent; border:none; border-radius:7px; cursor:pointer; color:rgba(255,255,255,.52); transition:all var(--tr); font-size:.75rem; font-weight:600; white-space:nowrap; }
body.theme-sepia .bar-btn, body.theme-mint .bar-btn { color:var(--text-muted); }
.bar-btn:hover { background:rgba(255,255,255,.08); color:var(--accent); }
.bar-btn.active { color:var(--accent); background:rgba(201,168,76,.12); }
.bar-btn svg { width:17px; height:17px; flex-shrink:0; fill:none; stroke:currentColor; stroke-width:2; stroke-linecap:round; stroke-linejoin:round; }
.bar-btn#btn-speak.speaking { color:var(--accent); animation:pulse 1.5s infinite; }
@keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:.4;} }
#book-stage { flex:1; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; padding:14px; }
#book-container { width:var(--page-width); max-width:980px; height:100%; display:flex; flex-direction:column; transition:width .4s ease; }
.book-pages-wrapper { flex:1; overflow:hidden; position:relative; }
.pages-track { display:flex; height:100%; transition:transform .5s cubic-bezier(.4,0,.2,1); }
.page-spread { min-width:100%; height:100%; display:grid; gap:14px; padding:0 3px; }
.page-spread.double { grid-template-columns:1fr 1fr; }
.page-spread.single { grid-template-columns:1fr; max-width:640px; margin:0 auto; width:100%; }
.book-page { background:var(--paper); border-radius:3px; box-shadow:0 28px 80px rgba(0,0,0,.68),0 0 0 1px rgba(0,0,0,.25); overflow:hidden; display:flex; flex-direction:column; }
.page-inner { flex:1; overflow-y:auto; padding:48px 46px 36px; font-family:var(--font-body); font-size:var(--font-size); line-height:var(--line-height); color:var(--text); text-align:justify; hyphens:auto; }
.page-num { text-align:center; font-size:.7rem; color:var(--text-muted); padding:7px 0 12px; letter-spacing:.09em; border-top:1px solid rgba(0,0,0,.06); opacity:.65; }
.page-inner h1 { font-family:'Playfair Display',serif; font-size:1.65em; font-weight:700; border-bottom:2px solid var(--accent); padding-bottom:.28em; margin-bottom:.55em; }
.page-inner h2 { font-family:'Playfair Display',serif; font-size:1.3em; font-weight:700; margin:1.1em 0 .45em; }
.page-inner h3,.page-inner h4 { font-size:1.08em; font-weight:600; margin:.9em 0 .35em; }
.page-inner p { margin-bottom:.85em; }
.page-inner p:first-of-type::first-letter { float:left; font-family:'Playfair Display',serif; font-size:3.1em; line-height:.8; margin:.05em .08em 0 0; color:var(--accent); font-weight:700; }
.page-inner blockquote { border-left:3px solid var(--accent); padding:6px 14px; margin:1em 0; font-style:italic; opacity:.78; }
.page-inner img { max-width:100%; max-height:48vh; display:block; margin:18px auto; border-radius:4px; box-shadow:0 4px 16px rgba(0,0,0,.18); }
.page-inner ul,.page-inner ol { padding-left:1.4em; margin-bottom:.85em; }
.page-inner li { margin-bottom:.28em; }
.toc-page-title { font-family:'Playfair Display',serif; font-size:1.5em; font-weight:700; margin-bottom:1.4em; padding-bottom:.35em; border-bottom:2px solid var(--accent); }
.toc-page-list { list-style:none; }
.toc-page-list li { display:flex; justify-content:space-between; align-items:baseline; padding:5px 0; border-bottom:1px dotted rgba(0,0,0,.1); cursor:pointer; }
.toc-page-list li:hover { color:var(--accent); }
.toc-page-list li .toc-num { font-size:.78em; color:var(--text-muted); font-family:monospace; }
.toc-h2 { padding-left:14px; font-size:.92em; }
.toc-h3 { padding-left:28px; font-size:.85em; opacity:.78; }
#statusbar { height:30px; display:flex; align-items:center; justify-content:space-between; padding:0 18px; flex-shrink:0; background:var(--bar-bg); border-top:1px solid var(--bar-border); backdrop-filter:blur(16px); font-size:.73rem; color:rgba(255,255,255,.28); transition:opacity .3s; }
body.theme-sepia #statusbar, body.theme-mint #statusbar { color:var(--text-muted); }
.sb-center { flex:1; display:flex; justify-content:center; }
#page-dots { display:flex; gap:5px; align-items:center; }
.page-dot { width:5px; height:5px; border-radius:50%; background:rgba(255,255,255,.18); transition:all var(--tr); cursor:pointer; }
.page-dot.active { background:var(--accent); transform:scale(1.5); }
#style-panel { position:fixed; top:54px; right:0; width:298px; height:calc(100vh - 54px); background:var(--sp-bg); border-left:1px solid var(--sp-border); z-index:200; overflow-y:auto; backdrop-filter:blur(20px); box-shadow:-18px 0 50px rgba(0,0,0,.28); animation:slideIn .24s cubic-bezier(.4,0,.2,1); }
@keyframes slideIn { from{transform:translateX(100%);} to{transform:none;} }
.sp-header { display:flex; justify-content:space-between; align-items:center; padding:16px 18px; border-bottom:1px solid var(--sp-border); font-size:.84rem; font-weight:600; color:rgba(255,255,255,.8); position:sticky; top:0; background:var(--sp-bg); z-index:1; }
body.theme-sepia .sp-header, body.theme-mint .sp-header { color:var(--text); }
.sp-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,.38); font-size:1rem; padding:3px 7px; border-radius:4px; }
.sp-section { padding:16px 18px; border-bottom:1px solid var(--sp-border); }
.sp-label { display:block; font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.09em; color:rgba(255,255,255,.3); margin-bottom:11px; }
body.theme-sepia .sp-label, body.theme-mint .sp-label { color:var(--text-muted); }
.theme-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:7px; }
.theme-btn { padding:9px 5px; border-radius:8px; border:2px solid transparent; cursor:pointer; font-size:.76rem; font-weight:700; background:var(--tc,#222); color:var(--ta,#fff); transition:all var(--tr); }
.theme-btn.active { border-color:var(--accent); }
.font-grid { display:grid; grid-template-columns:1fr 1fr; gap:5px; }
.font-btn { padding:7px 9px; border-radius:6px; border:1px solid rgba(255,255,255,.09); background:rgba(255,255,255,.04); color:rgba(255,255,255,.6); cursor:pointer; font-size:.78rem; }
body.theme-sepia .font-btn, body.theme-mint .font-btn { color:var(--text); border-color:rgba(0,0,0,.1); background:rgba(0,0,0,.04); }
.font-btn.active { border-color:var(--accent); background:rgba(201,168,76,.1); color:var(--accent); }
.sp-slider { width:100%; -webkit-appearance:none; height:4px; background:rgba(255,255,255,.1); border-radius:4px; outline:none; }
.sp-slider::-webkit-slider-thumb { -webkit-appearance:none; width:16px; height:16px; border-radius:50%; background:var(--accent); cursor:pointer; }
.color-row { display:flex; align-items:center; gap:11px; }
.sp-color-input { width:38px; height:30px; border:2px solid rgba(255,255,255,.1); border-radius:6px; cursor:pointer; background:none; padding:2px; }
.color-hint { font-size:.76rem; color:rgba(255,255,255,.32); }
.layout-row { display:flex; gap:9px; }
.layout-btn { flex:1; padding:9px; border-radius:8px; border:2px solid rgba(255,255,255,.09); background:rgba(255,255,255,.04); color:rgba(255,255,255,.48); cursor:pointer; font-size:.76rem; display:flex; flex-direction:column; align-items:center; gap:5px; }
.layout-btn svg { width:38px; height:26px; }
.layout-btn.active, .layout-btn:hover { border-color:var(--accent); color:var(--accent); }
#toc-overlay { position:fixed; inset:0; background:var(--overlay-bg); z-index:300; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(5px); }
.toc-inner { background:var(--sp-bg); border:1px solid var(--sp-border); border-radius:16px; width:min(540px,90vw); max-height:74vh; display:flex; flex-direction:column; overflow:hidden; box-shadow:0 40px 100px rgba(0,0,0,.5); }
.toc-header { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; border-bottom:1px solid var(--sp-border); font-size:.88rem; font-weight:700; font-family:'Playfair Display',serif; color:rgba(255,255,255,.82); flex-shrink:0; }
body.theme-sepia .toc-header, body.theme-mint .toc-header { color:var(--text); }
#btn-toc-close { background:none; border:none; cursor:pointer; color:rgba(255,255,255,.38); font-size:1rem; padding:3px 7px; border-radius:4px; }
#toc-list { overflow-y:auto; padding:14px 20px; flex:1; }
#toast { position:fixed; bottom:46px; left:50%; transform:translateX(-50%) translateY(16px); background:rgba(15,12,40,.96); color:#fff; padding:9px 20px; border-radius:50px; font-size:.81rem; opacity:0; pointer-events:none; transition:all .28s; border:1px solid rgba(255,255,255,.09); backdrop-filter:blur(12px); z-index:9999; white-space:nowrap; }
#toast.show { opacity:1; transform:translateX(-50%) translateY(0); }
@media (max-width:680px) { .page-spread.double{grid-template-columns:1fr;} #style-panel{width:100vw;} .page-inner{padding:28px 20px 24px;} :root{--page-width:95%;} }`;
}

// Liefert einen schlanken Reader-Script (ohne Konverter-Logik) für die gespeicherte Version
function getReaderScript() {
    return `'use strict';
const $ = id => document.getElementById(id);
const state = { currentSpread:0, totalSpreads:0, layout:'double', speaking:false, title:'' };

document.addEventListener('DOMContentLoaded', () => {
    const spreads = document.querySelectorAll('.page-spread');
    state.totalSpreads = spreads.length;
    state.title = document.title;

    // Seitenlayout aus gespeichertem Wert
    const savedLayout = localStorage.getItem('reader_layout') || 'double';
    state.layout = savedLayout;
    applyLayout(savedLayout);
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === savedLayout));

    buildDots();
    updateView();
    restoreBookmark();
    initStylePanel();
    applyThemeDefaults('cosmos');

    $('btn-prev').addEventListener('click', prev);
    $('btn-next').addEventListener('click', next);
    $('btn-bookmark').addEventListener('click', saveBookmark);
    $('btn-speak').addEventListener('click', toggleSpeech);
    $('btn-toc').addEventListener('click', () => { buildTocOverlay(); $('toc-overlay').hidden = false; });
    $('btn-toc-close').addEventListener('click', () => $('toc-overlay').hidden = true);
    $('toc-overlay').addEventListener('click', e => { if(e.target===$('toc-overlay')) $('toc-overlay').hidden = true; });
    $('btn-style-panel').addEventListener('click', () => { const sp=$('style-panel'); const o=sp.hidden; sp.hidden=!o; $('btn-style-panel').classList.toggle('active',o); });
    $('btn-style-close').addEventListener('click', () => { $('style-panel').hidden=true; $('btn-style-panel').classList.remove('active'); });
    $('btn-dark').addEventListener('click', () => {
        const light = ['sepia','mint'].some(t => document.body.classList.contains('theme-'+t));
        setTheme(light ? 'cosmos' : 'sepia');
    });
    $('btn-zen').addEventListener('click', () => {
        $('reader-screen').classList.toggle('zen-mode');
        if ($('reader-screen').classList.contains('zen-mode')) showToast('Zen-Modus — ESC zum Beenden');
    });
    $('btn-fullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); $('btn-fullscreen').classList.add('active'); }
        else { document.exitFullscreen?.(); $('btn-fullscreen').classList.remove('active'); }
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('btn-fullscreen').classList.remove('active'); });
    document.addEventListener('keydown', e => {
        if (e.key==='ArrowRight'||e.key==='ArrowDown') next();
        if (e.key==='ArrowLeft' ||e.key==='ArrowUp')   prev();
        if (e.key==='Escape') { $('toc-overlay').hidden=true; $('style-panel').hidden=true; $('reader-screen').classList.remove('zen-mode'); if(document.fullscreenElement) document.exitFullscreen(); }
    });
    let tx=0;
    document.addEventListener('touchstart', e => { tx=e.touches[0].clientX; }, {passive:true});
    document.addEventListener('touchend',   e => { const dx=e.changedTouches[0].clientX-tx; if(Math.abs(dx)>48) dx<0?next():prev(); });
});

function prev() { stopSpeech(); if(state.currentSpread>0) { state.currentSpread--; updateView(); } }
function next() { stopSpeech(); if(state.currentSpread<state.totalSpreads-1) { state.currentSpread++; updateView(); } }

function updateView() {
    const track = document.querySelector('.pages-track');
    if (track) track.style.transform = 'translateX(-'+(state.currentSpread*100)+'%)';
    const pps = state.layout==='double'?2:1;
    const first = state.currentSpread*pps+1;
    const total = document.querySelectorAll('.book-page').length;
    const last  = Math.min(first+pps-1, total);
    $('page-info').textContent = first===last ? first+' / '+total : first+'–'+last+' / '+total;
    $('btn-prev').style.opacity = state.currentSpread===0?'.32':'1';
    $('btn-next').style.opacity = state.currentSpread>=state.totalSpreads-1?'.32':'1';
    buildDots();
}

function applyLayout(layout) {
    state.layout = layout;
    document.querySelectorAll('.page-spread').forEach(s => { s.classList.remove('double','single'); s.classList.add(layout); });
    const pages = document.querySelectorAll('.book-page');
    state.totalSpreads = Math.ceil(pages.length / (layout==='double'?2:1));
    state.currentSpread = Math.min(state.currentSpread, state.totalSpreads-1);
    updateView();
    localStorage.setItem('reader_layout', layout);
}

function buildDots() {
    const el=$('page-dots'); if(!el) return;
    const max=14; const cnt=Math.min(state.totalSpreads,max);
    if(state.totalSpreads<=1){el.innerHTML='';return;}
    let h='';
    for(let i=0;i<cnt;i++){
        const idx=state.totalSpreads>max?Math.round(i*(state.totalSpreads-1)/(max-1)):i;
        h+='<div class="page-dot'+(idx===state.currentSpread?' active':'')+'" data-idx="'+idx+'"></div>';
    }
    el.innerHTML=h;
    el.querySelectorAll('.page-dot').forEach(d=>d.addEventListener('click',()=>{state.currentSpread=parseInt(d.dataset.idx);updateView();}));
}

function buildTocOverlay() {
    const pps=state.layout==='double'?2:1;
    let h='';
    document.querySelectorAll('.book-page').forEach((page,i)=>{
        const heading=page.querySelector('h1,h2,h3');
        if(heading&&i>1){
            const lvl=parseInt(heading.tagName[1]);
            const si=Math.floor(i/pps);
            h+='<div style="padding:7px 0 7px '+(lvl-1)*16+'px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;display:flex;justify-content:space-between;font-size:'+(lvl===1?'1em':lvl===2?'.9em':'.82em')+';color:rgba(255,255,255,.72);" onclick="(function(){document.querySelectorAll(\'.pages-track\')[0].style.transform=\'translateX(-\'+'+si+'*100+\'%)\';window._cs='+si+';if(window._updateView)window._updateView('+si+');$(\\'toc-overlay\\').hidden=true;})()" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'rgba(255,255,255,.72)\'"><span>'+heading.innerText+'</span><span style="font-size:.74em;opacity:.45;font-family:monospace">'+(i+1)+'</span></div>';
        }
    });
    $('toc-list').innerHTML=h||'<p style="opacity:.38;font-size:.85rem">Keine Überschriften gefunden</p>';
}

function saveBookmark() { localStorage.setItem('bm_reader', state.currentSpread); showToast('🔖 Lesezeichen gesetzt'); }
function restoreBookmark() { const s=localStorage.getItem('bm_reader'); if(s&&parseInt(s)>0) setTimeout(()=>{ if(confirm('Lesezeichen: Weiter ab Seite '+(parseInt(s)+1)+'?')){state.currentSpread=parseInt(s);updateView();}},500); }

function stopSpeech() { if(window.speechSynthesis)window.speechSynthesis.cancel(); state.speaking=false; const b=$('btn-speak'); if(b)b.classList.remove('speaking'); }
function toggleSpeech() {
    const sy=window.speechSynthesis; if(!sy){showToast('Sprachausgabe nicht verfügbar');return;}
    if(sy.speaking){stopSpeech();return;}
    const pps=state.layout==='double'?2:1;
    const pages=document.querySelectorAll('.book-page');
    let txt=''; for(let i=state.currentSpread*pps;i<state.currentSpread*pps+pps&&i<pages.length;i++) txt+=' '+(pages[i].querySelector('.page-inner').innerText||'');
    const u=new SpeechSynthesisUtterance(txt.trim()); u.lang='de-DE'; u.rate=0.94;
    u.onend=()=>{if(state.speaking){next();setTimeout(()=>{if(state.currentSpread<state.totalSpreads-1)toggleSpeech();else stopSpeech();},700);}};
    sy.speak(u); state.speaking=true; $('btn-speak').classList.add('speaking');
}

function initStylePanel() {
    document.querySelectorAll('.theme-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.theme-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');setTheme(btn.dataset.theme);}));
    document.querySelectorAll('.font-btn').forEach(btn=>{btn.style.fontFamily="'"+btn.dataset.font+"',serif";btn.addEventListener('click',()=>{document.querySelectorAll('.font-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');document.body.dataset.font=btn.dataset.font;document.documentElement.style.setProperty('--font-body',"'"+btn.dataset.font+"',serif");});});
    const fsS=$('font-size-slider'),fsV=$('font-size-val'); if(fsS)fsS.addEventListener('input',()=>{fsV.textContent=fsS.value;document.documentElement.style.setProperty('--font-size',fsS.value+'px');});
    const lhS=$('line-height-slider'),lhV=$('line-height-val'); if(lhS)lhS.addEventListener('input',()=>{lhV.textContent=parseFloat(lhS.value).toFixed(1);document.documentElement.style.setProperty('--line-height',lhS.value);});
    const pwS=$('page-width-slider'),pwV=$('page-width-val'); if(pwS)pwS.addEventListener('input',()=>{pwV.textContent=pwS.value;document.documentElement.style.setProperty('--page-width',pwS.value+'%');});
    const ac=$('accent-color-picker'); if(ac)ac.addEventListener('input',e=>document.documentElement.style.setProperty('--accent',e.target.value));
    const pc=$('paper-color-picker');  if(pc)pc.addEventListener('input',e=>document.documentElement.style.setProperty('--paper',e.target.value));
    const tc=$('text-color-picker');   if(tc)tc.addEventListener('input',e=>document.documentElement.style.setProperty('--text',e.target.value));
    document.querySelectorAll('.layout-btn').forEach(btn=>btn.addEventListener('click',()=>{document.querySelectorAll('.layout-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');applyLayout(btn.dataset.layout);}));
}

function setTheme(theme) {
    document.body.className=document.body.className.replace(/theme-\S+/,'').trim()+' theme-'+theme;
    document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===theme));
    applyThemeDefaults(theme);
}
function applyThemeDefaults(t) {
    const d={cosmos:{paper:'#fdfaf3',text:'#2c3e50',accent:'#c9a84c'},forest:{paper:'#f5fdf5',text:'#1a2d1a',accent:'#6ab04c'},ocean:{paper:'#f0f8ff',text:'#0d2040',accent:'#4fc3f7'},crimson:{paper:'#fff5f5',text:'#2d0a0a',accent:'#e57373'},sepia:{paper:'#f9f4e8',text:'#3b2e1a',accent:'#8b6914'},mint:{paper:'#f5faf8',text:'#1a3d2e',accent:'#00897b'}};
    const v=d[t]||d.cosmos;
    document.documentElement.style.setProperty('--paper',v.paper);
    document.documentElement.style.setProperty('--text',v.text);
    document.documentElement.style.setProperty('--accent',v.accent);
    const ac=$('accent-color-picker'); if(ac)ac.value=v.accent;
    const pc=$('paper-color-picker');  if(pc)pc.value=v.paper;
    const tc=$('text-color-picker');   if(tc)tc.value=v.text;
}

let toastT;
function showToast(m) { const t=$('toast'); t.textContent=m; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2800); }`;
}

/* Baut die endgültige index.html für den gespeicherten Ordner */
function buildOutputHtml() {
    const cs     = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim()  || '#c9a84c';
    const paper  = cs.getPropertyValue('--paper').trim()   || '#fdfaf3';
    const text   = cs.getPropertyValue('--text').trim()    || '#2c3e50';
    const font   = document.body.dataset.font || 'Lora';
    const fsize  = cs.getPropertyValue('--font-size').trim() || '15px';
    const lh     = cs.getPropertyValue('--line-height').trim() || '1.7';
    const theme  = (document.body.className.match(/theme-(\S+)/) || ['','cosmos'])[1];

    const pagesDivs = state.pages.map((p, i) =>
        `<div class="book-page"><div class="page-inner">${p}</div><div class="page-num">— ${i+1} —</div></div>`
    ).join('\n');

    return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escHtml(state.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="style.css">
<style>
  :root {
    --accent: ${accent};
    --paper:  ${paper};
    --text:   ${text};
    --font-body: '${font}', serif;
    --font-size: ${fsize};
    --line-height: ${lh};
  }
</style>
</head>
<body class="theme-${theme}" data-font="${font}">

<div id="reader-screen">
  <header id="topbar">
    <div class="bar-left">
      <span class="book-title-display">${escHtml(state.title)}</span>
    </div>
    <div class="bar-center">
      <button class="bar-btn" id="btn-toc" title="Inhaltsverzeichnis">
        <svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h10"/></svg>
      </button>
      <button class="bar-btn" id="btn-prev"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>
      <span id="page-info">1 / ${state.pages.length}</span>
      <button class="bar-btn" id="btn-next"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>
      <button class="bar-btn" id="btn-bookmark" title="Lesezeichen">
        <svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
      </button>
      <button class="bar-btn" id="btn-speak">
        <svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
      </button>
    </div>
    <div class="bar-right">
      <button class="bar-btn" id="btn-style-panel">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 004.93 19.07M12 2v2M12 20v2M2 12h2M20 12h2"/></svg>
      </button>
      <button class="bar-btn" id="btn-dark">
        <svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>
      <button class="bar-btn" id="btn-zen">
        <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
      </button>
      <button class="bar-btn" id="btn-fullscreen">
        <svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg>
      </button>
    </div>
  </header>

  <!-- STYLE PANEL -->
  <div id="style-panel" hidden>
    <div class="sp-header"><span>Stil-Einstellungen</span><button class="sp-close" id="btn-style-close">✕</button></div>
    <div class="sp-section">
      <label class="sp-label">Thema</label>
      <div class="theme-grid">
        <button class="theme-btn" data-theme="cosmos"  style="--tc:#1a1035;--ta:#c9a84c">Cosmos</button>
        <button class="theme-btn" data-theme="forest"  style="--tc:#0d1f12;--ta:#6ab04c">Wald</button>
        <button class="theme-btn" data-theme="ocean"   style="--tc:#071428;--ta:#4fc3f7">Ozean</button>
        <button class="theme-btn" data-theme="crimson" style="--tc:#1a0a0a;--ta:#e57373">Rubin</button>
        <button class="theme-btn" data-theme="sepia"   style="--tc:#f5f0e8;--ta:#8b6914">Sepia</button>
        <button class="theme-btn" data-theme="mint"    style="--tc:#e8f5f0;--ta:#00897b">Mint</button>
      </div>
    </div>
    <div class="sp-section">
      <label class="sp-label">Schriftart</label>
      <div class="font-grid">
        <button class="font-btn" data-font="Lora">Lora</button>
        <button class="font-btn" data-font="Playfair Display">Playfair</button>
        <button class="font-btn" data-font="Crimson Text">Crimson</button>
        <button class="font-btn" data-font="EB Garamond">Garamond</button>
        <button class="font-btn" data-font="Libre Baskerville">Baskerville</button>
        <button class="font-btn" data-font="Cormorant Garamond">Cormorant</button>
        <button class="font-btn" data-font="Source Serif 4">Source Serif</button>
        <button class="font-btn" data-font="Bitter">Bitter</button>
      </div>
    </div>
    <div class="sp-section">
      <label class="sp-label">Schriftgröße: <span id="font-size-val">15</span>px</label>
      <input type="range" id="font-size-slider" min="11" max="24" value="15" class="sp-slider">
    </div>
    <div class="sp-section">
      <label class="sp-label">Zeilenabstand: <span id="line-height-val">1.7</span></label>
      <input type="range" id="line-height-slider" min="1.2" max="2.4" step="0.1" value="1.7" class="sp-slider">
    </div>
    <div class="sp-section">
      <label class="sp-label">Seitenbreite: <span id="page-width-val">75</span>%</label>
      <input type="range" id="page-width-slider" min="40" max="96" value="75" class="sp-slider">
    </div>
    <div class="sp-section">
      <label class="sp-label">Akzentfarbe</label>
      <div class="color-row"><input type="color" id="accent-color-picker" value="${accent}" class="sp-color-input"><span class="color-hint">Schaltflächen & Hervorhebungen</span></div>
    </div>
    <div class="sp-section">
      <label class="sp-label">Papierfarbe</label>
      <div class="color-row"><input type="color" id="paper-color-picker" value="${paper}" class="sp-color-input"><span class="color-hint">Seitenhintergrund</span></div>
    </div>
    <div class="sp-section">
      <label class="sp-label">Textfarbe</label>
      <div class="color-row"><input type="color" id="text-color-picker" value="${text}" class="sp-color-input"><span class="color-hint">Fließtext</span></div>
    </div>
    <div class="sp-section">
      <label class="sp-label">Seitenlayout</label>
      <div class="layout-row">
        <button class="layout-btn active" data-layout="double">
          <svg viewBox="0 0 40 28"><rect x="1" y="1" width="17" height="26" rx="2" fill="currentColor" opacity="0.3" stroke="currentColor"/><rect x="22" y="1" width="17" height="26" rx="2" fill="currentColor" opacity="0.3" stroke="currentColor"/></svg>
          Doppelseite
        </button>
        <button class="layout-btn" data-layout="single">
          <svg viewBox="0 0 40 28"><rect x="10" y="1" width="20" height="26" rx="2" fill="currentColor" opacity="0.3" stroke="currentColor"/></svg>
          Einzelseite
        </button>
      </div>
    </div>
  </div>

  <!-- TOC OVERLAY -->
  <div id="toc-overlay" hidden>
    <div class="toc-inner">
      <div class="toc-header"><span>Inhaltsverzeichnis</span><button id="btn-toc-close">✕</button></div>
      <div id="toc-list"></div>
    </div>
  </div>

  <main id="book-stage">
    <div id="book-container">
      <div class="book-pages-wrapper">
        <div class="pages-track">
          <!-- Doppelseiten-Spreads -->
          ${buildSpreadsHtml(state.pages)}
        </div>
      </div>
    </div>
  </main>

  <div id="statusbar">
    <div class="sb-left"><span id="word-count">${state.wordCount.toLocaleString('de-DE')} Wörter</span></div>
    <div class="sb-center"><div id="page-dots"></div></div>
    <div class="sb-right"><span id="reading-time">≈ ${Math.ceil(state.wordCount/200)} Min</span></div>
  </div>
</div>

<div id="toast"></div>
<script src="script.js"></script>
</body>
</html>`;
}

function buildSpreadsHtml(pages) {
    let html = '';
    for (let s = 0; s < Math.ceil(pages.length / 2); s++) {
        html += `<div class="page-spread double">`;
        for (let p = s*2; p < s*2+2 && p < pages.length; p++) {
            html += `<div class="book-page"><div class="page-inner">${pages[p]}</div><div class="page-num">— ${p+1} —</div></div>`;
        }
        html += `</div>`;
    }
    return html;
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ════════════════════════════════
   STYLE PANEL LOGIC
   ════════════════════════════════ */
function initStylePanel() {
    document.querySelectorAll('.theme-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            setTheme(btn.dataset.theme);
        });
    });

    document.querySelectorAll('.font-btn').forEach(btn => {
        btn.style.fontFamily = `'${btn.dataset.font}',serif`;
        btn.addEventListener('click', () => {
            document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.body.dataset.font = btn.dataset.font;
            document.documentElement.style.setProperty('--font-body', `'${btn.dataset.font}',serif`);
        });
    });

    const fsS = $('font-size-slider'), fsV = $('font-size-val');
    fsS.addEventListener('input', () => { fsV.textContent = fsS.value; document.documentElement.style.setProperty('--font-size', fsS.value+'px'); });

    const lhS = $('line-height-slider'), lhV = $('line-height-val');
    lhS.addEventListener('input', () => { lhV.textContent = parseFloat(lhS.value).toFixed(1); document.documentElement.style.setProperty('--line-height', lhS.value); });

    const pwS = $('page-width-slider'), pwV = $('page-width-val');
    pwS.addEventListener('input', () => { pwV.textContent = pwS.value; document.documentElement.style.setProperty('--page-width', pwS.value+'%'); });

    $('accent-color-picker').addEventListener('input', e => document.documentElement.style.setProperty('--accent', e.target.value));
    $('paper-color-picker').addEventListener('input',  e => document.documentElement.style.setProperty('--paper',  e.target.value));
    $('text-color-picker').addEventListener('input',   e => document.documentElement.style.setProperty('--text',   e.target.value));

    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.layout = btn.dataset.layout;
            if (state.pages.length > 0) renderReader();
        });
    });
}

function setTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\S+/,'').trim() + ' theme-' + theme;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    const d = { cosmos:{paper:'#fdfaf3',text:'#2c3e50',accent:'#c9a84c'}, forest:{paper:'#f5fdf5',text:'#1a2d1a',accent:'#6ab04c'}, ocean:{paper:'#f0f8ff',text:'#0d2040',accent:'#4fc3f7'}, crimson:{paper:'#fff5f5',text:'#2d0a0a',accent:'#e57373'}, sepia:{paper:'#f9f4e8',text:'#3b2e1a',accent:'#8b6914'}, mint:{paper:'#f5faf8',text:'#1a3d2e',accent:'#00897b'} };
    const v = d[theme] || d.cosmos;
    document.documentElement.style.setProperty('--paper',  v.paper);
    document.documentElement.style.setProperty('--text',   v.text);
    document.documentElement.style.setProperty('--accent', v.accent);
    $('paper-color-picker').value  = v.paper;
    $('text-color-picker').value   = v.text;
    $('accent-color-picker').value = v.accent;
}

/* ════════════════════════════════
   TOAST
   ════════════════════════════════ */
let toastTimer;
function showToast(msg) {
    $('toast').textContent = msg;
    $('toast').classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $('toast').classList.remove('show'), 2800);
}

/* ════════════════════════════════
   INIT
   ════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initStylePanel();

    $('btn-prev').addEventListener('click', prev);
    $('btn-next').addEventListener('click', next);
    $('btn-speak').addEventListener('click', toggleSpeech);
    $('btn-bookmark').addEventListener('click', saveBookmark);
    $('btn-preview').addEventListener('click', openPreview);
    $('btn-save').addEventListener('click', openSaveDialog);
    $('btn-pick-folder').addEventListener('click', saveToFolder);
    $('btn-save-close').addEventListener('click', () => $('save-dialog').hidden = true);
    $('save-dialog').addEventListener('click', e => { if (e.target === $('save-dialog')) $('save-dialog').hidden = true; });

    $('btn-back').addEventListener('click', () => {
        stopSpeech();
        $('reader-screen').hidden = true;
        const us = $('upload-screen');
        us.hidden = false; us.style.opacity = '1'; us.style.transform = 'none';
        $('progress-wrap').hidden = true;
        $('progress-fill').style.width = '0%';
        $('file-input').value = '';
        const dz = $('drop-zone');
        dz.style.opacity = '1'; dz.style.pointerEvents = '';
    });

    $('btn-toc').addEventListener('click', () => $('toc-overlay').hidden = false);
    $('btn-toc-close').addEventListener('click', () => $('toc-overlay').hidden = true);
    $('toc-overlay').addEventListener('click', e => { if (e.target === $('toc-overlay')) $('toc-overlay').hidden = true; });

    $('btn-style-panel').addEventListener('click', () => {
        const sp = $('style-panel');
        const open = sp.hidden;
        sp.hidden = !open;
        $('btn-style-panel').classList.toggle('active', open);
    });
    $('btn-style-close').addEventListener('click', () => {
        $('style-panel').hidden = true;
        $('btn-style-panel').classList.remove('active');
    });

    $('btn-dark').addEventListener('click', () => {
        const light = ['sepia','mint'].some(t => document.body.classList.contains('theme-'+t));
        setTheme(light ? 'cosmos' : 'sepia');
    });

    $('btn-zen').addEventListener('click', () => {
        $('reader-screen').classList.toggle('zen-mode');
        if ($('reader-screen').classList.contains('zen-mode')) showToast('Zen-Modus — ESC zum Beenden');
    });

    $('btn-fullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); $('btn-fullscreen').classList.add('active'); }
        else { document.exitFullscreen?.(); $('btn-fullscreen').classList.remove('active'); }
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('btn-fullscreen').classList.remove('active'); });
});
