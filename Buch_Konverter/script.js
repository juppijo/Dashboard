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
   SAVE TO FOLDER  (File System Access API)
   ════════════════════════════════ */
function openSaveDialog() {
    if (!state.pages.length) { showToast('Bitte zuerst eine Datei laden'); return; }
    if (!('showDirectoryPicker' in window)) {
        showToast('File System Access API nicht verfügbar (Chrome/Edge benötigt)');
        return;
    }
    $('save-dialog').hidden = false;
    $('save-prog').hidden = true;
    $('save-done').hidden = true;
    $('btn-pick-folder').hidden = false;
    updateSaveDialogInfo();
}

async function saveToFolder() {
    let dirHandle;
    try {
        dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch(e) {
        if (e.name !== 'AbortError') showToast('Ordner-Auswahl fehlgeschlagen');
        return;
    }

    $('btn-pick-folder').hidden = true;
    $('save-prog').hidden = false;
    $('save-done').hidden = true;

    try {
        const total = 3 + state.images.length; // index.html, style.css, script.js + Bilder
        let done = 0;

        const setP = (msg) => {
            $('sp2-fill').style.width = Math.round(done/total*100)+'%';
            $('sp2-text').textContent = msg;
        };

        // ── 1) images/ Unterordner anlegen ──
        let imgDir = null;
        if (state.images.length > 0) {
            imgDir = await dirHandle.getDirectoryHandle('images', { create: true });
        }

        // ── 2) Bilder speichern ──
        for (const img of state.images) {
            setP(`Bild: ${img.filename}`);
            const fh  = await imgDir.getFileHandle(img.filename, { create: true });
            const ws  = await fh.createWritable();
            await ws.write(img.blob);
            await ws.close();
            done++;
            setP(`Bild ${done}/${state.images.length} gespeichert…`);
        }

        // ── 3) style.css ──
        setP('Schreibe style.css…');
        await writeTextFile(dirHandle, 'style.css', await fetchLocalFile('style.css'));
        done++; setP('style.css ✓');

        // ── 4) script.js ──
        setP('Schreibe script.js…');
        await writeTextFile(dirHandle, 'script.js', await fetchLocalFile('script.js'));
        done++; setP('script.js ✓');

        // ── 5) index.html (mit eingebetteten Seiten) ──
        setP('Schreibe index.html…');
        const indexContent = buildOutputHtml();
        await writeTextFile(dirHandle, 'index.html', indexContent);
        done++; setP('Fertig!');

        $('sp2-fill').style.width = '100%';
        await new Promise(r => setTimeout(r, 200));
        $('save-prog').hidden = true;
        $('save-done').hidden = false;
        $('save-done-path').textContent = `→ ${dirHandle.name}/`;
        showToast('✓ Buch gespeichert in: ' + dirHandle.name);

    } catch(err) {
        console.error(err);
        $('sp2-text').textContent = 'Fehler: ' + err.message;
        showToast('Fehler beim Speichern: ' + err.message);
    }
}

async function writeTextFile(dirHandle, filename, content) {
    const fh = await dirHandle.getFileHandle(filename, { create: true });
    const ws = await fh.createWritable();
    await ws.write(content);
    await ws.close();
}

async function fetchLocalFile(filename) {
    const resp = await fetch(filename);
    return await resp.text();
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
