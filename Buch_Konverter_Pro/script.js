'use strict';

/* ════════════════════════════════
   STATE
   ════════════════════════════════ */
const state = {
    pages:         [],
    images:        [],
    currentSpread: 0,
    totalSpreads:  0,
    layout:        'double',
    speaking:      false,
    title:         'Mein Buch',
    wordCount:     0
};

const $ = id => document.getElementById(id);

/* ════════════════════════════════
   UPLOAD
   ════════════════════════════════ */
function initUpload() {
    const fi = $('file-input');
    const dz = $('drop-zone');

    fi.addEventListener('change', e => { if (e.target.files[0]) processFile(e.target.files[0]); });

    dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('drag-over'); });
    dz.addEventListener('dragleave', ()  => dz.classList.remove('drag-over'));
    dz.addEventListener('drop', e => {
        e.preventDefault(); dz.classList.remove('drag-over');
        const f = e.dataTransfer.files[0];
        if (f && f.name.endsWith('.docx')) processFile(f);
        else showToast('Bitte eine .docx Datei wählen');
    });
    dz.addEventListener('click', e => {
        if (!e.target.classList.contains('btn-upload-choose')) fi.click();
    });
}

async function processFile(file) {
    state.title  = file.name.replace(/\.docx$/i, '');
    state.images = [];

    $('progress-wrap').hidden = false;
    const dz = $('drop-zone');
    dz.style.opacity = '0.4';
    dz.style.pointerEvents = 'none';
    setProgress(10, 'Datei wird gelesen…');

    try {
        const arrayBuffer = await file.arrayBuffer();
        setProgress(30, 'Bilder & Text extrahieren…');

        // Mammoth OHNE eigenen Image-Handler → bettet Bilder automatisch
        // als data:image/...;base64,... URLs direkt ins HTML ein.
        // Das funktioniert garantiert in jedem Browser.
        const result = await mammoth.convertToHtml({ arrayBuffer });

        setProgress(60, 'Bilder für ZIP vorbereiten…');

        // Jetzt die eingebetteten data-URLs aus dem HTML extrahieren
        // und als Blobs in state.images speichern (für ZIP-Export)
        const dataUrlRegex = /src="(data:(image\/[^;]+);base64,([^"]+))"/g;
        let match;
        let counter = 0;
        let processedHtml = result.value;

        // Alle data-URLs einsammeln
        while ((match = dataUrlRegex.exec(result.value)) !== null) {
            counter++;
            const fullDataUrl = match[1];
            const mimeType    = match[2];
            const b64data     = match[3];
            const ext         = mimeType.split('/')[1]
                                  .replace('jpeg','jpg')
                                  .replace('svg+xml','svg');
            const filename    = 'bild_' + String(counter).padStart(3,'0') + '.' + ext;

            // Blob für ZIP
            const byteChars = atob(b64data);
            const byteArr   = new Uint8Array(byteChars.length);
            for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
            const blob = new Blob([byteArr], { type: mimeType });

            state.images.push({ filename, blob, dataUrl: fullDataUrl, mimeType });
        }

        setProgress(75, 'Seiten aufbauen…');
        // HTML direkt übergeben — data-URLs bleiben drin → Bilder sofort sichtbar
        buildPages(processedHtml);
        setProgress(100, 'Fertig!');
        await pause(300);

        const us = $('upload-screen');
        us.style.transition = 'opacity .4s, transform .4s';
        us.style.opacity    = '0';
        us.style.transform  = 'scale(1.04)';
        await pause(400);
        us.hidden = true;
        $('reader-screen').hidden = false;
        updateSaveInfo();

    } catch(err) {
        console.error(err);
        showToast('Fehler: ' + err.message);
        dz.style.opacity = '1';
        dz.style.pointerEvents = '';
        $('progress-wrap').hidden = true;
    }
}

function setProgress(pct, txt) {
    $('progress-fill').style.width = pct + '%';
    $('progress-text').textContent = txt;
}

const pause = ms => new Promise(r => setTimeout(r, ms));

/* ════════════════════════════════
   PAGE BUILDING
   ════════════════════════════════ */
function buildPages(rawHtml) {
    const doc  = new DOMParser().parseFromString('<div id="r">' + rawHtml + '</div>', 'text/html');
    const root = doc.getElementById('r');
    const raw  = [];
    let cur = '';

    for (const node of root.childNodes) {
        const s = node.outerHTML || node.textContent || '';
        if (s.includes('###')) {
            cur += s.replace(/###/g, '');
            if (cur.trim()) { raw.push(cur); cur = ''; }
        } else {
            cur += s;
        }
    }
    if (cur.trim()) raw.push(cur);

    const toc  = buildTocPage(raw);
    state.pages = raw.length > 0 ? [raw[0], toc, ...raw.slice(1)] : [toc];

    if (state.pages.length % 2 !== 0) {
        state.pages.push('<p style="text-align:center;margin-top:42%;opacity:.25;font-family:\'Playfair Display\',serif;letter-spacing:.15em">&#8213; FINIS &#8213;</p>');
    }

    const txt = state.pages.join(' ').replace(/<[^>]+>/g,' ');
    state.wordCount = txt.split(/\s+/).filter(Boolean).length;
    $('book-title-display').textContent = state.title;

    renderReader();
    restoreBookmark();
}

// Für den ZIP-Export: ersetzt data:... URLs zurück zu relativen images/-Pfaden
function dataUrlsToRelative(html) {
    state.images.forEach(img => {
        // data URL kann sehr lang sein — einfacher Split ist zuverlässiger als Regex
        html = html.split(img.dataUrl).join('images/' + img.filename);
    });
    return html;
}

function buildTocPage(pages) {
    let li = '';
    pages.forEach((p, i) => {
        const m = p.match(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
        if (m && i > 0) {
            const lvl  = parseInt(m[1]);
            const text = m[2].replace(/<[^>]+>/g,'').trim();
            const cls  = lvl === 2 ? ' class="toc-h2"' : lvl === 3 ? ' class="toc-h3"' : '';
            li += '<li' + cls + ' data-target="' + (i+2) + '"><span>' + text + '</span><span class="toc-num">' + (i+2) + '</span></li>';
        }
    });
    return '<div class="toc-page-title">Inhaltsverzeichnis</div><ul class="toc-page-list">' + li + '</ul>';
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
        html += '<div class="page-spread ' + state.layout + '">';
        const start = s * pps;
        for (let p = start; p < start + pps && p < state.pages.length; p++) {
            html += '<div class="book-page"><div class="page-inner">' + state.pages[p] + '</div><div class="page-num">&#8212; ' + (p+1) + ' &#8212;</div></div>';
        }
        html += '</div>';
    }
    html += '</div></div>';
    $('book-container').innerHTML = html;

    $('book-container').querySelectorAll('.toc-page-list li[data-target]').forEach(li => {
        li.addEventListener('click', () => {
            const p   = parseInt(li.dataset.target) - 1;
            const pps = state.layout === 'double' ? 2 : 1;
            goToSpread(Math.floor(p / pps));
        });
    });

    updateView();
    buildTocOverlay();
    buildDots();
    updateStats();
}

function goToSpread(idx) {
    state.currentSpread = Math.max(0, Math.min(idx, state.totalSpreads - 1));
    updateView();
}

function updateView() {
    const track = $('book-container').querySelector('.pages-track');
    if (track) track.style.transform = 'translateX(-' + (state.currentSpread * 100) + '%)';

    const pps   = state.layout === 'double' ? 2 : 1;
    const first = state.currentSpread * pps + 1;
    const last  = Math.min(first + pps - 1, state.pages.length);
    $('page-info').textContent = first === last
        ? first + ' / ' + state.pages.length
        : first + '\u2013' + last + ' / ' + state.pages.length;

    $('btn-prev').style.opacity = state.currentSpread === 0 ? '.3' : '1';
    $('btn-next').style.opacity = state.currentSpread >= state.totalSpreads - 1 ? '.3' : '1';
    buildDots();
}

function buildDots() {
    const el  = $('page-dots');
    const max = 14;
    if (state.totalSpreads <= 1) { el.innerHTML = ''; return; }
    const cnt = Math.min(state.totalSpreads, max);
    let h = '';
    for (let i = 0; i < cnt; i++) {
        const idx = state.totalSpreads > max ? Math.round(i * (state.totalSpreads-1) / (max-1)) : i;
        h += '<div class="page-dot' + (idx === state.currentSpread ? ' active' : '') + '" data-idx="' + idx + '"></div>';
    }
    el.innerHTML = h;
    el.querySelectorAll('.page-dot').forEach(d => {
        d.addEventListener('click', () => goToSpread(parseInt(d.dataset.idx)));
    });
}

function buildTocOverlay() {
    const pps = state.layout === 'double' ? 2 : 1;
    let h = '';
    state.pages.forEach((p, i) => {
        const m = p.match(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/i);
        if (m && i > 1) {
            const lvl  = parseInt(m[1]);
            const text = m[2].replace(/<[^>]+>/g,'').trim();
            const si   = Math.floor(i / pps);
            const ind  = (lvl-1) * 16;
            const fsz  = lvl === 1 ? '1em' : lvl === 2 ? '.9em' : '.82em';
            h += '<div class="toc-entry" data-spread="' + si + '" style="padding:7px 0 7px ' + ind + 'px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;display:flex;justify-content:space-between;font-size:' + fsz + ';color:rgba(255,255,255,.72);transition:color .18s" onmouseover="this.style.color=\'var(--accent)\'" onmouseout="this.style.color=\'rgba(255,255,255,.72)\'">'
                + '<span>' + text + '</span>'
                + '<span style="font-size:.74em;opacity:.45;font-family:monospace;margin-left:12px">' + (i+1) + '</span></div>';
        }
    });
    $('toc-list').innerHTML = h || '<p style="opacity:.38;font-size:.85rem;padding:8px 0">Keine Überschriften gefunden</p>';
    $('toc-list').querySelectorAll('.toc-entry').forEach(el => {
        el.addEventListener('click', () => {
            goToSpread(parseInt(el.dataset.spread));
            $('toc-overlay').hidden = true;
        });
    });
}

function updateStats() {
    $('word-count').textContent  = state.wordCount.toLocaleString('de-DE') + ' W\u00f6rter';
    $('reading-time').textContent = '\u2248 ' + Math.ceil(state.wordCount / 200) + ' Min';
    const n = state.images.length;
    $('img-count-display').textContent = n > 0 ? '\uD83D\uDDBC ' + n + ' Bild' + (n !== 1 ? 'er' : '') : '';
}

function updateSaveInfo() {
    $('ft-folder-name').textContent = state.title;
    const n = state.images.length;
    $('ft-img-count').textContent = n > 0 ? n + ' Datei' + (n !== 1 ? 'en' : '') : 'leer';
}

/* ════════════════════════════════
   NAVIGATION
   ════════════════════════════════ */
function prev() { stopSpeech(); if (state.currentSpread > 0) navigateTo(state.currentSpread - 1, 'back'); }
function next() { stopSpeech(); if (state.currentSpread < state.totalSpreads - 1) navigateTo(state.currentSpread + 1, 'forward'); }

function navigateTo(idx, direction) {
    const anim = document.body.dataset.anim || 'slide';

    if (anim === 'none') {
        state.currentSpread = idx; updateView(); return;
    }
    if (anim === 'slide') {
        state.currentSpread = idx; updateView(); return;
    }
    if (anim === 'fade') {
        doFade(idx); return;
    }
    if (anim === 'flip') {
        doFlip(idx, direction); return;
    }
    state.currentSpread = idx; updateView();
}

function doFade(idx) {
    const track = $('book-container').querySelector('.pages-track');
    if (!track) { state.currentSpread = idx; updateView(); return; }
    track.style.opacity = '0';
    track.style.transition = 'opacity .3s ease';
    setTimeout(() => {
        state.currentSpread = idx;
        updateView();
        track.style.opacity = '1';
    }, 300);
}

function doFlip(idx, direction) {
    const container = $('book-container');
    const spreads   = container.querySelectorAll('.page-spread');
    const oldSpread = spreads[state.currentSpread];
    if (!oldSpread) { state.currentSpread = idx; updateView(); return; }

    // Snapshot der aktuellen Seite klonen
    const clone = oldSpread.cloneNode(true);
    clone.style.position = 'absolute';
    clone.style.inset = '0';
    clone.style.zIndex = '10';
    container.style.position = 'relative';
    container.appendChild(clone);

    // Flip-Shadow
    const shadow = document.createElement('div');
    shadow.className = 'flip-shadow';
    clone.appendChild(shadow);

    // Richtung bestimmen
    clone.classList.add(direction === 'forward' ? 'flip-out' : 'flip-out-back');

    setTimeout(() => {
        state.currentSpread = idx;
        updateView();
        const newSpread = container.querySelectorAll('.page-spread')[idx];
        if (newSpread) {
            newSpread.classList.add(direction === 'forward' ? 'flip-in' : 'flip-in-back');
            setTimeout(() => newSpread.classList.remove('flip-in', 'flip-in-back'), 520);
        }
    }, 260);

    setTimeout(() => {
        if (clone.parentNode) clone.parentNode.removeChild(clone);
    }, 520);
}

document.addEventListener('keydown', e => {
    if ($('reader-screen').hidden) return;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next();
    if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')   prev();
    if (e.key === 'Escape') {
        $('style-panel').hidden  = true;
        $('btn-style-panel').classList.remove('active');
        $('toc-overlay').hidden  = true;
        $('save-dialog').hidden  = true;
        $('reader-screen').classList.remove('zen-mode');
        if (document.fullscreenElement) document.exitFullscreen();
    }
});

let touchX = 0;
document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
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
    const b = $('btn-speak');
    if (b) b.classList.remove('speaking');
}

function toggleSpeech() {
    const sy = window.speechSynthesis;
    if (!sy) { showToast('Sprachausgabe nicht verf\u00fcgbar'); return; }
    if (sy.speaking) { stopSpeech(); return; }

    const pps   = state.layout === 'double' ? 2 : 1;
    const start = state.currentSpread * pps;
    let txt = '';
    for (let i = start; i < start + pps && i < state.pages.length; i++) {
        const d = document.createElement('div');
        d.innerHTML = state.pages[i];
        txt += ' ' + (d.innerText || d.textContent);
    }
    const u = new SpeechSynthesisUtterance(txt.trim());
    u.lang = 'de-DE'; u.rate = 0.94;
    u.onend = () => { if (state.speaking) { next(); setTimeout(() => state.currentSpread < state.totalSpreads - 1 ? toggleSpeech() : stopSpeech(), 700); } };
    sy.speak(u);
    state.speaking = true;
    $('btn-speak').classList.add('speaking');
}

/* ════════════════════════════════
   BOOKMARK
   ════════════════════════════════ */
function saveBookmark() {
    localStorage.setItem('bm_' + state.title, state.currentSpread);
    showToast('\uD83D\uDD16 Lesezeichen gesetzt');
    $('btn-bookmark').classList.add('active');
    setTimeout(() => $('btn-bookmark').classList.remove('active'), 1400);
}

function restoreBookmark() {
    const s = localStorage.getItem('bm_' + state.title);
    if (s && parseInt(s) > 0) {
        setTimeout(() => { if (confirm('Lesezeichen gefunden. Weiter ab Seite ' + (parseInt(s)+1) + '?')) goToSpread(parseInt(s)); }, 500);
    }
}

/* ════════════════════════════════
   VORSCHAU
   ════════════════════════════════ */

/* ════════════════════════════════
   DIN A4 DRUCKEN
   ════════════════════════════════ */
function openPrint() {
    if (!state.pages.length) { showToast('Bitte zuerst eine Datei laden'); return; }

    const cs     = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#c9a84c';
    const paper  = cs.getPropertyValue('--paper').trim()  || '#fdfaf3';
    const text   = cs.getPropertyValue('--text').trim()   || '#2c3e50';
    const font   = document.body.dataset.font || 'Lora';
    const fsize  = cs.getPropertyValue('--font-size').trim() || '15px';
    const lh     = cs.getPropertyValue('--line-height').trim() || '1.7';

    // Bilder sind bereits als data-URLs in state.pages eingebettet — direkt verwenden
    let pagesHtml = '';
    state.pages.forEach((p, i) => {
        pagesHtml += '<div class="a4-page">' + p + '</div>\n';
    });

    const doc = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>${escHtml(state.title)}</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=${encodeURIComponent(font)}:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
<style>
/* ── Bildschirm-Vorschau ── */
* { box-sizing: border-box; margin: 0; padding: 0; }
:root { --accent: ${accent}; --paper: ${paper}; --text: ${text}; }
html { background: #888; }
body {
    font-family: '${font}', serif;
    font-size: ${fsize};
    line-height: ${lh};
    color: var(--text);
    padding: 20px;
}

/* Druckoptionen-Leiste (nur Bildschirm) */
.print-bar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 999;
    display: flex; align-items: center; gap: 12px;
    padding: 10px 20px;
    background: #222; color: #fff;
    font-family: sans-serif; font-size: 13px;
    box-shadow: 0 2px 8px rgba(0,0,0,.4);
}
.print-bar label { display: flex; align-items: center; gap: 6px; cursor: pointer; }
.print-bar select, .print-bar input[type=range] { background: #444; color: #fff; border: 1px solid #666; border-radius: 4px; padding: 3px 6px; cursor: pointer; }
.print-bar button {
    background: ${accent}; color: #fff; border: none;
    padding: 7px 18px; border-radius: 6px; font-size: 13px;
    font-weight: 700; cursor: pointer; margin-left: auto;
}
.print-bar button:hover { opacity: .85; }
.bar-sep { width: 1px; height: 20px; background: #555; }
#font-size-disp { min-width: 26px; }

/* DIN A4 Seiten */
.pages-wrap { padding-top: 58px; }
.a4-page {
    width: 210mm;
    min-height: 297mm;
    margin: 0 auto 12px;
    padding: var(--pg-padding, 20mm 18mm 22mm);
    background: var(--paper);
    box-shadow: 0 4px 20px rgba(0,0,0,.35);
    position: relative;
    page-break-after: always;
    page-break-inside: avoid;
}
.a4-page h1 {
    font-family: 'Playfair Display', serif; font-size: 1.65em; font-weight: 700;
    border-bottom: 2px solid var(--accent); padding-bottom: .28em; margin-bottom: .55em;
    line-height: 1.2;
}
.a4-page h2 { font-family: 'Playfair Display', serif; font-size: 1.28em; font-weight: 700; margin: 1em 0 .4em; }
.a4-page h3, .a4-page h4 { font-size: 1.08em; font-weight: 600; margin: .9em 0 .35em; }
.a4-page p  { margin-bottom: .82em; text-align: justify; hyphens: auto; }
.a4-page p:first-of-type::first-letter {
    float: left; font-family: 'Playfair Display', serif;
    font-size: 3em; line-height: .82; margin: .05em .08em 0 0;
    color: var(--accent); font-weight: 700;
}
.a4-page blockquote { border-left: 3px solid var(--accent); padding: 6px 14px; margin: 1em 0; font-style: italic; opacity: .8; }
.a4-page img { max-width: 100%; max-height: 160mm; display: block; margin: 14px auto; }
.a4-page ul, .a4-page ol { padding-left: 1.4em; margin-bottom: .82em; }
.a4-page li { margin-bottom: .26em; }
.a4-page table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: .9em; }
.a4-page th { padding: 5px 8px; border-bottom: 2px solid var(--accent); font-weight: 600; text-align: left; }
.a4-page td { padding: 4px 8px; border-bottom: 1px solid rgba(0,0,0,.1); }
/* TOC Seite */
.a4-page .toc-page-title { font-family: 'Playfair Display', serif; font-size: 1.5em; font-weight: 700; margin-bottom: 1.2em; padding-bottom: .3em; border-bottom: 2px solid var(--accent); }
.a4-page .toc-page-list  { list-style: none; }
.a4-page .toc-page-list li { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px dotted rgba(0,0,0,.12); }
.a4-page .toc-num  { font-family: monospace; font-size: .8em; opacity: .55; }
.a4-page .toc-h2   { padding-left: 14px; font-size: .92em; }
.a4-page .toc-h3   { padding-left: 28px; font-size: .85em; opacity: .78; }

/* Seitenzahl unten rechts */
.a4-page::after {
    content: attr(data-page);
    position: absolute; bottom: 10mm; right: 14mm;
    font-size: 9pt; color: rgba(0,0,0,.35); font-family: serif;
}

/* ── Druckmedium ── */
@media print {
    html { background: none; }
    body { padding: 0; margin: 0; }
    .print-bar { display: none; }
    .pages-wrap { padding-top: 0; }
    .a4-page {
        width: 100%;
        min-height: 0;
        margin: 0;
        box-shadow: none;
        padding: var(--pg-padding, 20mm 18mm 22mm);
        page-break-after: always;
    }
    .a4-page:last-child { page-break-after: avoid; }
    @page { size: A4; margin: 0; }
}
</style>
</head>
<body>

<div class="print-bar" id="printBar">
    <span style="font-weight:700;color:${accent};margin-right:4px">&#9113;</span>
    <span style="font-weight:700">${escHtml(state.title)}</span>
    <div class="bar-sep"></div>
    <label>
        Schrift:
        <input type="range" id="fsize" min="8" max="16" value="${parseInt(fsize)||11}" step=".5"
               oninput="document.getElementById('font-size-disp').textContent=this.value+'pt';
                        document.querySelectorAll('.a4-page').forEach(p=>p.style.fontSize=this.value+'pt')">
        <span id="font-size-disp">${parseInt(fsize)||11}pt</span>
    </label>
    <div class="bar-sep"></div>
    <label>
        Rand:
        <select id="margin-sel" onchange="
            const v=this.value;
            document.documentElement.style.setProperty('--pg-padding',v);
            document.querySelectorAll('.a4-page').forEach(p=>p.style.padding=v)">
            <option value="15mm 14mm 18mm">Schmal (15mm)</option>
            <option value="20mm 18mm 22mm" selected>Normal (20mm)</option>
            <option value="25mm 22mm 28mm">Breit (25mm)</option>
        </select>
    </label>
    <div class="bar-sep"></div>
    <label>
        <input type="checkbox" id="chk-dropcap" checked
               onchange="document.getElementById('drop-style').disabled=!this.checked">
        Initiale
    </label>
    <label>
        <input type="checkbox" id="chk-pagenr" checked
               onchange="document.querySelectorAll('.a4-page').forEach(p=>p.style.setProperty('--show-num',this.checked?'':'none'))">
        Seitenzahl
    </label>
    <button onclick="window.print()">&#128438; DIN A4 drucken / PDF</button>
</div>

<style id="drop-style">
/* Initiale ein/ausblenden */
</style>

<div class="pages-wrap">
${pagesHtml}
</div>

<script>
// Seitenzahlen setzen
document.querySelectorAll('.a4-page').forEach((p,i) => p.setAttribute('data-page', i+1));
// Initiale-Toggle
document.getElementById('drop-style').textContent =
    '.a4-page p:first-of-type::first-letter{float:left;font-family:\\'Playfair Display\\',serif;font-size:3em;line-height:.82;margin:.05em .08em 0 0;color:var(--accent);font-weight:700}';
document.getElementById('chk-dropcap').addEventListener('change', function() {
    document.getElementById('drop-style').textContent = this.checked
        ? '.a4-page p:first-of-type::first-letter{float:left;font-family:\\'Playfair Display\\',serif;font-size:3em;line-height:.82;margin:.05em .08em 0 0;color:var(--accent);font-weight:700}'
        : '.a4-page p:first-of-type::first-letter{}';
});
<\/script>
</body>
</html>`;

    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank');
    showToast('Druckansicht ge\u00f6ffnet \u2014 DIN A4');
}

function openPreview() {
    if (!state.pages.length) { showToast('Kein Inhalt'); return; }

    const cs     = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#c9a84c';
    const paper  = cs.getPropertyValue('--paper').trim()  || '#fdfaf3';
    const text   = cs.getPropertyValue('--text').trim()   || '#2c3e50';
    const font   = document.body.dataset.font || 'Lora';
    const fsize  = cs.getPropertyValue('--font-size').trim() || '15px';
    const lh     = cs.getPropertyValue('--line-height').trim() || '1.7';

    let pagesHtml = '';
    state.pages.forEach((p, i) => {
        // Bilder sind bereits als data-URLs eingebettet — direkt verwenden
        pagesHtml += '<article class="page-block" id="p' + (i+1) + '">'
                   + '<div class="page-num-label">Seite ' + (i+1) + '</div>'
                   + p + '</article>\n<hr class="page-divider">\n';
    });

    const doc = '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8">'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">'
        + '<title>Vorschau \u2013 ' + escHtml(state.title) + '</title>'
        + '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family='
        + encodeURIComponent(font) + ':ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">'
        + '<style>'
        + ':root{--accent:' + accent + ';--paper:' + paper + ';--text:' + text + '}'
        + '*{box-sizing:border-box;margin:0;padding:0}'
        + 'body{background:#1a1428;font-family:\'' + font + '\',serif;font-size:' + fsize + ';line-height:' + lh + ';color:var(--text);padding:40px 20px 80px}'
        + '.preview-header{text-align:center;margin-bottom:40px;font-family:\'Playfair Display\',serif;color:rgba(255,255,255,.6)}'
        + '.preview-header h1{font-size:1.6rem;color:var(--accent);margin-bottom:6px}'
        + '.page-block{background:var(--paper);color:var(--text);max-width:740px;margin:0 auto;padding:52px 56px 44px;border-radius:4px;box-shadow:0 20px 60px rgba(0,0,0,.55);position:relative}'
        + '.page-num-label{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);font-size:.7rem;opacity:.4;letter-spacing:.1em;font-family:monospace}'
        + '.page-divider{border:none;max-width:740px;margin:28px auto;border-top:1px dashed rgba(255,255,255,.1)}'
        + 'h1{font-family:\'Playfair Display\',serif;font-size:1.65em;font-weight:700;border-bottom:2px solid var(--accent);padding-bottom:.28em;margin-bottom:.55em}'
        + 'h2{font-family:\'Playfair Display\',serif;font-size:1.3em;font-weight:700;margin:1.1em 0 .45em}'
        + 'h3,h4{font-size:1.08em;font-weight:600;margin:.9em 0 .35em}'
        + 'p{margin-bottom:.85em;text-align:justify;hyphens:auto}'
        + 'p:first-of-type::first-letter{float:left;font-family:\'Playfair Display\',serif;font-size:3.1em;line-height:.8;margin:.05em .08em 0 0;color:var(--accent);font-weight:700}'
        + 'blockquote{border-left:3px solid var(--accent);padding:6px 14px;margin:1em 0;font-style:italic;opacity:.8}'
        + 'img{max-width:100%;max-height:50vh;display:block;margin:18px auto;border-radius:4px}'
        + 'ul,ol{padding-left:1.4em;margin-bottom:.85em}'
        + 'li{margin-bottom:.28em}'
        + '.toc-page-title{font-family:\'Playfair Display\',serif;font-size:1.5em;font-weight:700;margin-bottom:1.4em;padding-bottom:.35em;border-bottom:2px solid var(--accent)}'
        + '.toc-page-list{list-style:none}'
        + '.toc-page-list li{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px dotted rgba(0,0,0,.1)}'
        + '.toc-num{font-family:monospace;font-size:.8em;opacity:.55}'
        + '.toc-h2{padding-left:14px;font-size:.92em}'
        + '.toc-h3{padding-left:28px;font-size:.85em;opacity:.78}'
        + '</style></head><body>'
        + '<div class="preview-header"><h1>' + escHtml(state.title) + '</h1>'
        + '<p>' + state.pages.length + ' Seiten \u00b7 ' + state.wordCount.toLocaleString('de-DE') + ' W\u00f6rter \u00b7 ' + state.images.length + ' Bild' + (state.images.length !== 1 ? 'er' : '') + '</p></div>'
        + pagesHtml
        + '</body></html>';

    const blob = new Blob([doc], { type: 'text/html;charset=utf-8' });
    window.open(URL.createObjectURL(blob), '_blank');
    showToast('Vorschau in neuem Tab ge\u00f6ffnet');
}

/* ════════════════════════════════
   ZIP-SPEICHERN
   ════════════════════════════════ */
function openSaveDialog() {
    if (!state.pages.length) { showToast('Bitte zuerst eine Datei laden'); return; }
    $('save-dialog').hidden     = false;
    $('save-prog').hidden       = true;
    $('save-done').hidden       = true;
    $('btn-pick-folder').hidden = false;
    updateSaveInfo();
}

async function saveToFolder() {
    if (typeof JSZip === 'undefined') {
        showToast('JSZip nicht geladen \u2013 Internetverbindung pr\u00fcfen');
        return;
    }

    $('btn-pick-folder').hidden = true;
    $('save-prog').hidden       = false;
    $('save-done').hidden       = true;

    const setP = (pct, msg) => {
        $('sp2-fill').style.width = pct + '%';
        $('sp2-text').textContent = msg;
    };

    try {
        const zip   = new JSZip();
        const dir   = zip.folder(state.title);
        const imgDir = state.images.length > 0 ? dir.folder('images') : null;

        // Bilder
        for (let i = 0; i < state.images.length; i++) {
            const img = state.images[i];
            imgDir.file(img.filename, img.blob);
            setP(Math.round((i+1) / (state.images.length + 3) * 80), 'Bild ' + (i+1) + '/' + state.images.length + ': ' + img.filename);
            await pause(0);
        }

        // style.css
        setP(82, 'style.css…');
        dir.file('style.css', buildOutputCss());
        await pause(0);

        // script.js (schlanker Reader)
        setP(87, 'script.js…');
        dir.file('script.js', buildReaderScript());
        await pause(0);

        // index.html
        setP(92, 'index.html…');
        dir.file('index.html', buildOutputHtml());
        await pause(0);

        // ZIP erzeugen
        setP(95, 'Komprimiere…');
        const blob = await zip.generateAsync(
            { type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } },
            meta => setP(95 + Math.round(meta.percent * 0.05), 'Komprimiere… ' + Math.round(meta.percent) + '%')
        );

        setP(100, 'Fertig!');
        await pause(200);

        // Download
        const url = URL.createObjectURL(blob);
        const a   = document.createElement('a');
        a.href     = url;
        a.download = state.title + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 8000);

        $('save-prog').hidden = true;
        $('save-done').hidden = false;
        $('save-done-path').textContent = 'ZIP entpacken \u2192 ' + state.title + '/ \u2192 index.html \u00f6ffnen';
        showToast('\u2713 ' + state.title + '.zip heruntergeladen');

    } catch(err) {
        console.error(err);
        setP(0, 'Fehler: ' + err.message);
        $('btn-pick-folder').hidden = false;
    }
}

/* ════════════════════════════════
   BUILD OUTPUT FILES
   ════════════════════════════════ */
function buildOutputHtml() {
    const cs     = getComputedStyle(document.documentElement);
    const accent = cs.getPropertyValue('--accent').trim() || '#c9a84c';
    const paper  = cs.getPropertyValue('--paper').trim()  || '#fdfaf3';
    const text   = cs.getPropertyValue('--text').trim()   || '#2c3e50';
    const font   = document.body.dataset.font || 'Lora';
    const fsize  = cs.getPropertyValue('--font-size').trim() || '15px';
    const lh     = cs.getPropertyValue('--line-height').trim() || '1.7';
    const theme  = (document.body.className.match(/theme-(\S+)/) || ['','cosmos'])[1];

    const pps    = 2;
    const spreads = Math.ceil(state.pages.length / pps);
    let spreadHtml = '';
    for (let s = 0; s < spreads; s++) {
        spreadHtml += '<div class="page-spread double">';
        for (let p = s*pps; p < s*pps+pps && p < state.pages.length; p++) {
            // Data-URLs → relative images/-Pfade zurückkonvertieren für gespeicherte Version
            const pageHtml = dataUrlsToRelative(state.pages[p]);
            spreadHtml += '<div class="book-page"><div class="page-inner">' + pageHtml + '</div><div class="page-num">&#8212; ' + (p+1) + ' &#8212;</div></div>';
        }
        spreadHtml += '</div>';
    }

    return '<!DOCTYPE html>\n<html lang="de">\n<head>\n'
        + '<meta charset="UTF-8">\n'
        + '<meta name="viewport" content="width=device-width,initial-scale=1">\n'
        + '<title>' + escHtml(state.title) + '</title>\n'
        + '<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family='
        + encodeURIComponent(font) + ':ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">\n'
        + '<link rel="stylesheet" href="style.css">\n'
        + '<style>:root{--accent:' + accent + ';--paper:' + paper + ';--text:' + text + ';--font-body:\'' + font + '\',serif;--font-size:' + fsize + ';--line-height:' + lh + '}</style>\n'
        + '</head>\n<body class="theme-' + theme + '" data-font="' + font + '">\n'
        + '<div id="reader-screen">\n'
        + '  <header id="topbar">\n'
        + '    <div class="bar-left"><span class="book-title-display">' + escHtml(state.title) + '</span></div>\n'
        + '    <div class="bar-center">\n'
        + '      <button class="bar-btn" id="btn-toc" title="Inhaltsverzeichnis"><svg viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h10"/></svg></button>\n'
        + '      <button class="bar-btn" id="btn-prev"><svg viewBox="0 0 24 24"><path d="M15 18l-6-6 6-6"/></svg></button>\n'
        + '      <span id="page-info">1 / ' + state.pages.length + '</span>\n'
        + '      <button class="bar-btn" id="btn-next"><svg viewBox="0 0 24 24"><path d="M9 18l6-6-6-6"/></svg></button>\n'
        + '      <button class="bar-btn" id="btn-bookmark"><svg viewBox="0 0 24 24"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg></button>\n'
        + '      <button class="bar-btn" id="btn-speak"><svg viewBox="0 0 24 24"><path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg></button>\n'
        + '    </div>\n'
        + '    <div class="bar-right">\n'
        + '      <button class="bar-btn" id="btn-style-panel"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 004.93 19.07M12 2v2M12 20v2M2 12h2M20 12h2"/></svg></button>\n'
        + '      <button class="bar-btn" id="btn-dark"><svg viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg></button>\n'
        + '      <button class="bar-btn" id="btn-zen"><svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></button>\n'
        + '      <button class="bar-btn" id="btn-fullscreen"><svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"/></svg></button>\n'
        + '    </div>\n  </header>\n'
        + buildStylePanelHtml(accent, paper, text)
        + '  <div id="toc-overlay" hidden><div class="toc-inner"><div class="toc-header"><span>Inhaltsverzeichnis</span><button id="btn-toc-close">\u2715</button></div><div id="toc-list"></div></div></div>\n'
        + '  <main id="book-stage"><div id="book-container"><div class="book-pages-wrapper"><div class="pages-track">'
        + spreadHtml
        + '</div></div></div></main>\n'
        + '  <div id="statusbar"><div class="sb-left"><span id="word-count">' + state.wordCount.toLocaleString('de-DE') + ' W\u00f6rter</span></div><div class="sb-center"><div id="page-dots"></div></div><div class="sb-right"><span id="reading-time">\u2248 ' + Math.ceil(state.wordCount/200) + ' Min</span></div></div>\n'
        + '</div>\n'
        + '<div id="toast"></div>\n'
        + '<script src="script.js"><\/script>\n'
        + '</body>\n</html>';
}

function buildStylePanelHtml(accent, paper, text) {
    return '  <div id="style-panel" hidden>\n'
        + '    <div class="sp-header"><span>Stil-Einstellungen</span><button class="sp-close" id="btn-style-close">\u2715</button></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Thema</label><div class="theme-grid">'
        + '<button class="theme-btn" data-theme="cosmos" style="--tc:#1a1035;--ta:#c9a84c">Cosmos</button>'
        + '<button class="theme-btn" data-theme="forest" style="--tc:#0d1f12;--ta:#6ab04c">Wald</button>'
        + '<button class="theme-btn" data-theme="ocean"  style="--tc:#071428;--ta:#4fc3f7">Ozean</button>'
        + '<button class="theme-btn" data-theme="crimson"style="--tc:#1a0a0a;--ta:#e57373">Rubin</button>'
        + '<button class="theme-btn" data-theme="sepia"  style="--tc:#f5f0e8;--ta:#8b6914">Sepia</button>'
        + '<button class="theme-btn" data-theme="mint"   style="--tc:#e8f5f0;--ta:#00897b">Mint</button>'
        + '</div></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Schriftart</label><div class="font-grid">'
        + '<button class="font-btn" data-font="Lora">Lora</button>'
        + '<button class="font-btn" data-font="Playfair Display">Playfair</button>'
        + '<button class="font-btn" data-font="Crimson Text">Crimson</button>'
        + '<button class="font-btn" data-font="EB Garamond">Garamond</button>'
        + '<button class="font-btn" data-font="Libre Baskerville">Baskerville</button>'
        + '<button class="font-btn" data-font="Cormorant Garamond">Cormorant</button>'
        + '<button class="font-btn" data-font="Source Serif 4">Source Serif</button>'
        + '<button class="font-btn" data-font="Bitter">Bitter</button>'
        + '</div></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Schriftgr\u00f6\u00dfe: <span id="font-size-val">15</span>px</label><input type="range" id="font-size-slider" min="11" max="24" value="15" class="sp-slider"></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Zeilenabstand: <span id="line-height-val">1.7</span></label><input type="range" id="line-height-slider" min="1.2" max="2.4" step="0.1" value="1.7" class="sp-slider"></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Seitenbreite: <span id="page-width-val">75</span>%</label><input type="range" id="page-width-slider" min="40" max="96" value="75" class="sp-slider"></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Akzentfarbe</label><div class="color-row"><input type="color" id="accent-color-picker" value="' + accent + '" class="sp-color-input"><span class="color-hint">Schaltfl\u00e4chen &amp; Hervorhebungen</span></div></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Papierfarbe</label><div class="color-row"><input type="color" id="paper-color-picker" value="' + paper + '" class="sp-color-input"><span class="color-hint">Seitenhintergrund</span></div></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Textfarbe</label><div class="color-row"><input type="color" id="text-color-picker" value="' + text + '" class="sp-color-input"><span class="color-hint">Flie\u00dftext</span></div></div>\n'
        + '    <div class="sp-section"><label class="sp-label">Seitenlayout</label><div class="layout-row">'
        + '<button class="layout-btn active" data-layout="double"><svg viewBox="0 0 40 28"><rect x="1" y="1" width="17" height="26" rx="2" fill="currentColor" opacity=".3" stroke="currentColor"/><rect x="22" y="1" width="17" height="26" rx="2" fill="currentColor" opacity=".3" stroke="currentColor"/></svg>Doppelseite</button>'
        + '<button class="layout-btn" data-layout="single"><svg viewBox="0 0 40 28"><rect x="10" y="1" width="20" height="26" rx="2" fill="currentColor" opacity=".3" stroke="currentColor"/></svg>Einzelseite</button>'
        + '</div></div>\n  </div>\n';
}

function buildOutputCss() {
    // Liest das tatsächliche Stylesheet aus — funktioniert wenn index.html per HTTP geöffnet wird
    // Fallback: komplettes CSS als String
    try {
        for (const sheet of document.styleSheets) {
            if (sheet.href && sheet.href.includes('style.css')) {
                const rules = Array.from(sheet.cssRules).map(r => r.cssText).join('\n');
                if (rules.length > 100) return rules;
            }
        }
    } catch(e) { /* CORS auf file:// — Fallback */ }
    // Fallback: style.css direkt einbetten (identisch zur geladenen Datei)
    return STYLE_CSS_CONTENT;
}

function buildReaderScript() {
    // Gibt den Inhalt dieser Datei (script.js) zurück — aber nur den Reader-Teil.
    // Da wir kein fetch auf file:// machen können, ist der Reader-Code
    // direkt als Konstante am Ende dieser Datei gespeichert.
    return READER_SCRIPT_CONTENT;
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
        btn.style.fontFamily = "'" + btn.dataset.font + "',serif";
        btn.addEventListener('click', () => {
            document.querySelectorAll('.font-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.body.dataset.font = btn.dataset.font;
            document.documentElement.style.setProperty('--font-body', "'" + btn.dataset.font + "',serif");
        });
    });
    wireSlider('font-size-slider',   'font-size-val',   v => v + 'px',    '--font-size');
    wireSlider('line-height-slider', 'line-height-val', v => parseFloat(v).toFixed(1), '--line-height');
    wireSlider('page-width-slider',  'page-width-val',  v => v + '%',     '--page-width');
    wirePicker('accent-color-picker', '--accent');
    wirePicker('paper-color-picker',  '--paper');
    wirePicker('text-color-picker',   '--text');

    // Hintergrundfarbe
    $('bg-color-picker').addEventListener('input', e => {
        document.documentElement.style.setProperty('--bg', e.target.value);
        document.body.style.background = e.target.value;
        highlightBgPreset(e.target.value);
    });
    document.querySelectorAll('.bg-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const c = btn.dataset.color;
            document.documentElement.style.setProperty('--bg', c);
            document.body.style.background = c;
            $('bg-color-picker').value = c;
            highlightBgPreset(c);
        });
    });

    // Breiten-Presets
    document.querySelectorAll('.pw-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            const v = btn.dataset.val;
            $('page-width-slider').value = v;
            $('page-width-val').textContent = v;
            document.documentElement.style.setProperty('--page-width', v + '%');
            document.querySelectorAll('.pw-preset').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            // Vollbild = kein Padding auf book-stage
            $('book-stage').style.padding = v >= 98 ? '0' : '14px';
        });
    });

    // Animations-Buttons
    document.querySelectorAll('.anim-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.body.dataset.anim = btn.dataset.anim;
        });
    });

    // Layout-Buttons (jetzt inkl. mobile)
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const layout = btn.dataset.layout;
            if (layout === 'mobile') {
                state.layout = 'single';
                $('book-stage').classList.add('mobile-mode');
            } else {
                state.layout = layout;
                $('book-stage').classList.remove('mobile-mode');
            }
            if (state.pages.length > 0) renderReader();
        });
    });
}

function highlightBgPreset(color) {
    document.querySelectorAll('.bg-preset').forEach(b => {
        b.classList.toggle('active', b.dataset.color === color);
    });
}

function wireSlider(sliderId, valId, fmt, prop) {
    const s = $(sliderId), v = $(valId);
    if (!s) return;
    s.addEventListener('input', () => { v.textContent = fmt(s.value); document.documentElement.style.setProperty(prop, fmt(s.value)); });
}
function wirePicker(pickerId, prop) {
    const p = $(pickerId);
    if (!p) return;
    p.addEventListener('input', e => document.documentElement.style.setProperty(prop, e.target.value));
}

function setTheme(theme) {
    document.body.className = document.body.className.replace(/theme-\S+/,'').trim() + ' theme-' + theme;
    document.querySelectorAll('.theme-btn').forEach(b => b.classList.toggle('active', b.dataset.theme === theme));
    const d = { cosmos:{paper:'#fdfaf3',text:'#2c3e50',accent:'#c9a84c'}, forest:{paper:'#f5fdf5',text:'#1a2d1a',accent:'#6ab04c'}, ocean:{paper:'#f0f8ff',text:'#0d2040',accent:'#4fc3f7'}, crimson:{paper:'#fff5f5',text:'#2d0a0a',accent:'#e57373'}, sepia:{paper:'#f9f4e8',text:'#3b2e1a',accent:'#8b6914'}, mint:{paper:'#f5faf8',text:'#1a3d2e',accent:'#00897b'} };
    const v = d[theme] || d.cosmos;
    document.documentElement.style.setProperty('--paper',  v.paper);
    document.documentElement.style.setProperty('--text',   v.text);
    document.documentElement.style.setProperty('--accent', v.accent);
    const ac = $('accent-color-picker'); if (ac) ac.value = v.accent;
    const pc = $('paper-color-picker');  if (pc) pc.value = v.paper;
    const tc = $('text-color-picker');   if (tc) tc.value = v.text;
}

/* ════════════════════════════════
   TOAST
   ════════════════════════════════ */
let toastTimer;
function showToast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ════════════════════════════════
   INIT
   ════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
    initUpload();
    initStylePanel();
    initLibrary();

    $('btn-prev').addEventListener('click', prev);
    $('btn-next').addEventListener('click', next);
    $('btn-speak').addEventListener('click', toggleSpeech);
    $('btn-bookmark').addEventListener('click', saveBookmark);
    $('btn-preview').addEventListener('click', openPreview);
    $('btn-print').addEventListener('click', openPrint);
    $('btn-save').addEventListener('click', openSaveDialog);
    $('btn-pick-folder').addEventListener('click', saveToFolder);
    $('btn-save-lib').addEventListener('click', saveToLibrary);
    $('btn-save-close').addEventListener('click', () => { $('save-dialog').hidden = true; });
    $('save-dialog').addEventListener('click', e => { if (e.target === $('save-dialog')) $('save-dialog').hidden = true; });

    $('btn-open-library').addEventListener('click', openLibraryScreen);
    $('btn-lib-back').addEventListener('click', closeLibraryScreen);
    $('btn-lib-new').addEventListener('click', closeLibraryScreen);
    $('btn-lib-export').addEventListener('click', exportLibrary);
    $('btn-lib-import').addEventListener('click', () => $('lib-import-input').click());
    $('lib-import-input').addEventListener('change', e => { if (e.target.files[0]) importLibrary(e.target.files[0]); });

    $('btn-back').addEventListener('click', () => {
        stopSpeech();
        $('reader-screen').hidden = true;
        const us = $('upload-screen');
        us.hidden = false; us.style.opacity = '1'; us.style.transform = 'none';
        $('progress-wrap').hidden = true;
        $('progress-fill').style.width = '0';
        $('file-input').value = '';
        $('drop-zone').style.opacity = '1';
        $('drop-zone').style.pointerEvents = '';
    });

    $('btn-toc').addEventListener('click', () => $('toc-overlay').hidden = false);
    $('btn-toc-close').addEventListener('click', () => $('toc-overlay').hidden = true);
    $('toc-overlay').addEventListener('click', e => { if (e.target === $('toc-overlay')) $('toc-overlay').hidden = true; });

    $('btn-style-panel').addEventListener('click', () => {
        const sp   = $('style-panel');
        const open = sp.hidden;
        sp.hidden  = !open;
        $('btn-style-panel').classList.toggle('active', open);
    });
    $('btn-style-close').addEventListener('click', () => {
        $('style-panel').hidden = true;
        $('btn-style-panel').classList.remove('active');
    });

    $('btn-dark').addEventListener('click', () => {
        const isLight = ['sepia','mint'].some(t => document.body.classList.contains('theme-' + t));
        setTheme(isLight ? 'cosmos' : 'sepia');
    });

    $('btn-zen').addEventListener('click', () => {
        $('reader-screen').classList.toggle('zen-mode');
        if ($('reader-screen').classList.contains('zen-mode')) showToast('Zen-Modus \u2014 ESC zum Beenden');
    });

    $('btn-fullscreen').addEventListener('click', () => {
        if (!document.fullscreenElement) { document.documentElement.requestFullscreen?.(); $('btn-fullscreen').classList.add('active'); }
        else { document.exitFullscreen?.(); $('btn-fullscreen').classList.remove('active'); }
    });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('btn-fullscreen').classList.remove('active'); });
});

/* ════════════════════════════════
   BIBLIOTHEK  (IndexedDB)
   ════════════════════════════════ */

const DB_NAME    = 'BuchKonverter';
const DB_VERSION = 1;
const STORE      = 'books';
let   db         = null;

function openDB() {
    return new Promise((resolve, reject) => {
        if (db) { resolve(db); return; }
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const d = e.target.result;
            if (!d.objectStoreNames.contains(STORE)) {
                const os = d.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
                os.createIndex('title', 'title', { unique: false });
            }
        };
        req.onsuccess = e => { db = e.target.result; resolve(db); };
        req.onerror   = e => reject(e.target.error);
    });
}

function dbAll() {
    return openDB().then(d => new Promise((res, rej) => {
        const req = d.transaction(STORE, 'readonly').objectStore(STORE).getAll();
        req.onsuccess = () => res(req.result);
        req.onerror   = () => rej(req.error);
    }));
}

function dbGet(id) {
    return openDB().then(d => new Promise((res, rej) => {
        const req = d.transaction(STORE, 'readonly').objectStore(STORE).get(id);
        req.onsuccess = () => res(req.result);
        req.onerror   = () => rej(req.error);
    }));
}

function dbPut(book) {
    return openDB().then(d => new Promise((res, rej) => {
        const req = d.transaction(STORE, 'readwrite').objectStore(STORE).put(book);
        req.onsuccess = () => res(req.result);
        req.onerror   = () => rej(req.error);
    }));
}

function dbDelete(id) {
    return openDB().then(d => new Promise((res, rej) => {
        const req = d.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
        req.onsuccess = () => res();
        req.onerror   = () => rej(req.error);
    }));
}

/* ── In Bibliothek speichern ── */
async function saveToLibrary() {
    if (!state.pages.length) { showToast('Bitte zuerst eine Datei laden'); return; }

    // Overlay anzeigen
    let overlay = $('lib-save-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'lib-save-overlay';
        overlay.innerHTML = '<div class="lib-save-box">'
            + '<h3>In Bibliothek speichern</h3>'
            + '<p id="lib-save-sub">' + escHtml(state.title) + '</p>'
            + '<div class="lib-save-bar"><div class="lib-save-fill" id="lib-save-fill"></div></div>'
            + '<div class="lib-save-status" id="lib-save-status">Vorbereite…</div>'
            + '</div>';
        document.body.appendChild(overlay);
    }
    overlay.hidden = false;

    const setLP = (pct, msg) => {
        $('lib-save-fill').style.width = pct + '%';
        $('lib-save-status').textContent = msg;
    };

    try {
        setLP(20, 'Seiten verarbeiten…');
        await pause(30);

        // Prüfen ob Buch mit diesem Titel schon existiert
        const all      = await dbAll();
        const existing = all.find(b => b.title === state.title);

        setLP(50, 'Bilder speichern…');
        await pause(30);

        const bookRecord = {
            title:     state.title,
            pages:     state.pages,          // inkl. eingebetteter data-URLs
            images:    state.images.map(img => ({
                filename: img.filename,
                mimeType: img.mimeType,
                dataUrl:  img.dataUrl        // als String — IndexedDB kann das
            })),
            wordCount: state.wordCount,
            pageCount: state.pages.length,
            savedAt:   new Date().toISOString(),
            layout:    state.layout
        };

        if (existing) bookRecord.id = existing.id;  // überschreiben

        setLP(80, 'In Datenbank schreiben…');
        await pause(30);

        await dbPut(bookRecord);
        setLP(100, 'Gespeichert!');
        await pause(600);

        overlay.hidden = true;
        $('btn-save-lib').classList.add('active');
        setTimeout(() => $('btn-save-lib').classList.remove('active'), 2000);
        showToast('\uD83D\uDCDA "' + state.title + '" in Bibliothek gespeichert');

    } catch(err) {
        console.error(err);
        overlay.hidden = true;
        showToast('Fehler beim Speichern: ' + err.message);
    }
}

/* ── Bibliotheks-Screen öffnen/schließen ── */
function openLibraryScreen() {
    $('upload-screen').hidden  = true;
    $('reader-screen').hidden  = true;
    $('library-screen').hidden = false;
    renderLibrary();
}

function closeLibraryScreen() {
    $('library-screen').hidden = true;
    $('upload-screen').hidden  = false;
}

/* ── Bibliothek rendern ── */
async function renderLibrary() {
    const grid = $('lib-grid');
    grid.innerHTML = '<div style="opacity:.4;font-size:.85rem;padding:20px">Lade…</div>';
    $('lib-empty').hidden = true;

    try {
        const books = await dbAll();
        // Neueste zuerst
        books.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));

        $('lib-count').textContent = books.length + ' Buch' + (books.length !== 1 ? '\u00f6cher' : '');

        if (books.length === 0) {
            grid.innerHTML = '';
            $('lib-empty').hidden = false;
            return;
        }

        grid.innerHTML = books.map(b => {
            const date = new Date(b.savedAt).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
            const time = new Date(b.savedAt).toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
            const imgs = b.images ? b.images.length : 0;
            // Cover: erste ~80 Zeichen des Titels
            const coverText = b.title.length > 40 ? b.title.slice(0, 38) + '\u2026' : b.title;
            return '<div class="lib-card" data-id="' + b.id + '">'
                + '<div class="lib-card-cover">'
                + '<div class="lib-card-cover-deco"></div>'
                + '<div class="lib-card-cover-text">' + escHtml(coverText) + '</div>'
                + '</div>'
                + '<div class="lib-card-body">'
                + '<div class="lib-card-title" title="' + escHtml(b.title) + '">' + escHtml(b.title) + '</div>'
                + '<div class="lib-card-meta">'
                + '<span>\uD83D\uDCCB ' + b.pageCount + ' Seiten</span>'
                + (imgs > 0 ? '<span>\uD83D\uDDBC ' + imgs + ' Bilder</span>' : '')
                + '</div>'
                + '<div class="lib-card-date">' + date + ' \u00b7 ' + time + '</div>'
                + '</div>'
                + '<div class="lib-card-actions">'
                + '<button class="lib-card-btn lib-card-btn-open" data-id="' + b.id + '">\u25B6 \u00d6ffnen</button>'
                + '<button class="lib-card-btn lib-card-btn-del"  data-id="' + b.id + '">\uD83D\uDDD1</button>'
                + '</div></div>';
        }).join('');

        // Event-Listener auf Karten
        grid.querySelectorAll('.lib-card-btn-open').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); openBookFromLibrary(parseInt(btn.dataset.id)); });
        });
        grid.querySelectorAll('.lib-card-btn-del').forEach(btn => {
            btn.addEventListener('click', e => {
                e.stopPropagation();
                if (confirm('Buch wirklich löschen?')) {
                    dbDelete(parseInt(btn.dataset.id)).then(() => renderLibrary());
                }
            });
        });
        // Klick auf Karte = öffnen
        grid.querySelectorAll('.lib-card').forEach(card => {
            card.addEventListener('click', () => openBookFromLibrary(parseInt(card.dataset.id)));
        });

    } catch(err) {
        grid.innerHTML = '<div style="color:rgba(255,80,80,.7);padding:20px">Fehler: ' + err.message + '</div>';
    }
}

/* ── Buch aus Bibliothek öffnen ── */
async function openBookFromLibrary(id) {
    showToast('Lade Buch…');
    try {
        const book = await dbGet(id);
        if (!book) { showToast('Buch nicht gefunden'); return; }

        // State wiederherstellen
        state.title     = book.title;
        state.pages     = book.pages;
        state.wordCount = book.wordCount || 0;
        state.layout    = book.layout || 'double';
        state.images    = (book.images || []).map(img => ({
            filename: img.filename,
            mimeType: img.mimeType,
            dataUrl:  img.dataUrl,
            blob:     null   // Blob nicht nötig für Reader
        }));
        state.currentSpread = 0;

        $('book-title-display').textContent = book.title;
        $('library-screen').hidden = true;
        $('upload-screen').hidden  = true;
        $('reader-screen').hidden  = false;

        renderReader();
        updateSaveInfo();
        restoreBookmark();
        showToast('\uD83D\uDCDA "' + book.title + '" geladen');

    } catch(err) {
        showToast('Fehler beim Laden: ' + err.message);
    }
}

function initLibrary() {
    // IndexedDB vorab öffnen (damit erster Zugriff schnell ist)
    openDB().catch(err => console.warn('IndexedDB:', err));
}

/* ── Bibliothek exportieren ── */
async function exportLibrary() {
    const overlay = showIOOverlay('Bibliothek exportieren');
    try {
        setIO(overlay, 20, 'Bücher laden…');
        const books = await dbAll();
        if (books.length === 0) {
            removeIOOverlay(overlay);
            showToast('Bibliothek ist leer — nichts zu exportieren');
            return;
        }

        setIO(overlay, 60, books.length + ' Bücher serialisieren…');
        await pause(30);

        // Alles als JSON — data-URLs sind bereits Strings, kein Problem
        const json = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), books }, null, 0);

        setIO(overlay, 90, 'Download vorbereiten…');
        await pause(30);

        const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        const ts   = new Date().toISOString().slice(0,10);
        a.href     = url;
        a.download = 'Bibliothek_' + ts + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 5000);

        setIO(overlay, 100, 'Fertig!');
        await pause(600);
        removeIOOverlay(overlay);
        showToast('\u2713 ' + books.length + ' Bücher exportiert');

    } catch(err) {
        removeIOOverlay(overlay);
        showToast('Fehler: ' + err.message);
        console.error(err);
    }
}

/* ── Bibliothek importieren ── */
async function importLibrary(file) {
    const overlay = showIOOverlay('Bibliothek importieren');
    try {
        setIO(overlay, 15, 'Datei lesen…');
        const text = await file.text();

        setIO(overlay, 30, 'JSON parsen…');
        await pause(20);
        const data = JSON.parse(text);

        if (!data.books || !Array.isArray(data.books)) {
            throw new Error('Ungültiges Format — keine "books"-Liste gefunden');
        }

        const books = data.books;
        setIO(overlay, 40, '0 / ' + books.length + ' Bücher importieren…');

        // Bestehende Bücher laden um Duplikate zu erkennen
        const existing = await dbAll();
        const existTitles = new Set(existing.map(b => b.title));

        let imported = 0, skipped = 0, overwritten = 0;

        for (let i = 0; i < books.length; i++) {
            const book = books[i];
            if (!book.title || !book.pages) { skipped++; continue; }

            const pct = 40 + Math.round((i+1) / books.length * 55);
            setIO(overlay, pct, (i+1) + ' / ' + books.length + ': ' + book.title.slice(0,30));
            await pause(0);

            if (existTitles.has(book.title)) {
                // Gleichen Titel überschreiben
                const ex = existing.find(b => b.title === book.title);
                book.id = ex.id;
                overwritten++;
            } else {
                delete book.id;   // neue ID vergeben lassen
                imported++;
            }
            await dbPut(book);
        }

        setIO(overlay, 100, 'Fertig!');
        await pause(600);
        removeIOOverlay(overlay);

        $('lib-import-input').value = '';
        renderLibrary();

        const msg = imported + ' neu, ' + overwritten + ' aktualisiert'
                  + (skipped ? ', ' + skipped + ' übersprungen' : '');
        showToast('\u2713 Import abgeschlossen: ' + msg);

    } catch(err) {
        removeIOOverlay(overlay);
        showToast('Import-Fehler: ' + err.message);
        console.error(err);
    }
}

/* ── Overlay-Hilfsfunktionen ── */
function showIOOverlay(title) {
    const el = document.createElement('div');
    el.className = 'lib-io-overlay';
    el.innerHTML = '<div class="lib-io-box">'
        + '<h3>' + escHtml(title) + '</h3>'
        + '<div class="lib-io-bar"><div class="lib-io-fill" style="width:0%"></div></div>'
        + '<div class="lib-io-msg">Bitte warten…</div>'
        + '</div>';
    document.body.appendChild(el);
    return el;
}
function setIO(el, pct, msg) {
    el.querySelector('.lib-io-fill').style.width = pct + '%';
    el.querySelector('.lib-io-msg').textContent  = msg;
}
function removeIOOverlay(el) {
    if (el && el.parentNode) el.parentNode.removeChild(el);
}

/* ════════════════════════════════
   READER-ONLY SCRIPT (für gespeicherte ZIP-Version)
   Kein fetch(), kein Konverter-Code — nur der reine Buch-Reader
   ════════════════════════════════ */
const READER_SCRIPT_CONTENT = `'use strict';
const $ = id => document.getElementById(id);
const RS = { currentSpread:0, totalSpreads:0, layout:'double', speaking:false };

document.addEventListener('DOMContentLoaded', () => {
    const spreads = document.querySelectorAll('.page-spread');
    RS.totalSpreads = spreads.length;
    const savedLayout = localStorage.getItem('reader_layout') || 'double';
    setLayout(savedLayout);
    document.querySelectorAll('.layout-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === savedLayout));
    buildDots(); updateView(); restoreBookmark(); initSP();
    $('btn-prev').addEventListener('click', prev);
    $('btn-next').addEventListener('click', next);
    $('btn-bookmark').addEventListener('click', () => { localStorage.setItem('bm_r', RS.currentSpread); showToast('Lesezeichen gesetzt'); });
    $('btn-speak').addEventListener('click', toggleSpeech);
    $('btn-toc').addEventListener('click', () => { buildToc(); $('toc-overlay').hidden = false; });
    $('btn-toc-close').addEventListener('click', () => $('toc-overlay').hidden = true);
    $('toc-overlay').addEventListener('click', e => { if (e.target === $('toc-overlay')) $('toc-overlay').hidden = true; });
    $('btn-style-panel').addEventListener('click', () => { const sp=$('style-panel'); const o=sp.hidden; sp.hidden=!o; $('btn-style-panel').classList.toggle('active',o); });
    $('btn-style-close').addEventListener('click', () => { $('style-panel').hidden=true; $('btn-style-panel').classList.remove('active'); });
    $('btn-dark').addEventListener('click', () => { const l=['sepia','mint'].some(t=>document.body.classList.contains('theme-'+t)); setTheme(l?'cosmos':'sepia'); });
    $('btn-zen').addEventListener('click', () => { $('reader-screen').classList.toggle('zen-mode'); });
    $('btn-fullscreen').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen?.(); else document.exitFullscreen?.(); });
    document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) $('btn-fullscreen').classList.remove('active'); });
    document.addEventListener('keydown', e => {
        if (e.key==='ArrowRight'||e.key==='ArrowDown') next();
        if (e.key==='ArrowLeft' ||e.key==='ArrowUp')   prev();
        if (e.key==='Escape') { $('toc-overlay').hidden=true; $('style-panel').hidden=true; $('reader-screen').classList.remove('zen-mode'); if(document.fullscreenElement)document.exitFullscreen(); }
    });
    let tx=0;
    document.addEventListener('touchstart', e=>{tx=e.touches[0].clientX;},{passive:true});
    document.addEventListener('touchend', e=>{const dx=e.changedTouches[0].clientX-tx;if(Math.abs(dx)>48) dx<0?next():prev();});
});

function prev() { stopSpeech(); if(RS.currentSpread>0){RS.currentSpread--;updateView();} }
function next() { stopSpeech(); if(RS.currentSpread<RS.totalSpreads-1){RS.currentSpread++;updateView();} }

function setLayout(l) {
    RS.layout=l;
    const pps=l==='double'?2:1;
    document.querySelectorAll('.page-spread').forEach(s=>{s.classList.remove('double','single');s.classList.add(l);});
    RS.totalSpreads=Math.ceil(document.querySelectorAll('.book-page').length/pps);
    RS.currentSpread=Math.min(RS.currentSpread,RS.totalSpreads-1);
    localStorage.setItem('reader_layout',l);
    updateView();
}

function updateView() {
    const track=document.querySelector('.pages-track');
    if(track)track.style.transform='translateX(-'+(RS.currentSpread*100)+'%)';
    const pps=RS.layout==='double'?2:1;
    const total=document.querySelectorAll('.book-page').length;
    const first=RS.currentSpread*pps+1;
    const last=Math.min(first+pps-1,total);
    $('page-info').textContent=first===last?first+' / '+total:first+'-'+last+' / '+total;
    $('btn-prev').style.opacity=RS.currentSpread===0?'.3':'1';
    $('btn-next').style.opacity=RS.currentSpread>=RS.totalSpreads-1?'.3':'1';
    buildDots();
}

function buildDots() {
    const el=$('page-dots');if(!el)return;
    if(RS.totalSpreads<=1){el.innerHTML='';return;}
    const max=14,cnt=Math.min(RS.totalSpreads,max);
    let h='';
    for(let i=0;i<cnt;i++){
        const idx=RS.totalSpreads>max?Math.round(i*(RS.totalSpreads-1)/(max-1)):i;
        h+='<div class="page-dot'+(idx===RS.currentSpread?' active':'')+'" onclick="(function(){RS.currentSpread='+idx+';updateView();})()"></div>';
    }
    el.innerHTML=h;
}

function buildToc() {
    const pps=RS.layout==='double'?2:1;
    const pages=document.querySelectorAll('.book-page');
    let h='';
    pages.forEach((page,i)=>{
        const hd=page.querySelector('h1,h2,h3');
        if(hd&&i>1){
            const lvl=parseInt(hd.tagName[1]);
            const si=Math.floor(i/pps);
            const ind=(lvl-1)*16;
            h+='<div style="padding:7px 0 7px '+ind+'px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;display:flex;justify-content:space-between;font-size:'+(lvl===1?'1em':'.88em')+';color:rgba(255,255,255,.72)" onclick="RS.currentSpread='+si+';updateView();$(\\'toc-overlay\\').hidden=true"><span>'+hd.innerText+'</span><span style="font-size:.74em;opacity:.4;font-family:monospace">'+(i+1)+'</span></div>';
        }
    });
    $('toc-list').innerHTML=h||'<p style="opacity:.38;font-size:.85rem">Keine Ueberschriften</p>';
}

function restoreBookmark(){const s=localStorage.getItem('bm_r');if(s&&parseInt(s)>0)setTimeout(()=>{if(confirm('Lesezeichen laden?')){RS.currentSpread=parseInt(s);updateView();}},500);}
function stopSpeech(){if(window.speechSynthesis)window.speechSynthesis.cancel();RS.speaking=false;const b=$('btn-speak');if(b)b.classList.remove('speaking');}
function toggleSpeech(){const sy=window.speechSynthesis;if(!sy)return;if(sy.speaking){stopSpeech();return;}const pps=RS.layout==='double'?2:1;const pages=document.querySelectorAll('.book-page');let txt='';for(let i=RS.currentSpread*pps;i<RS.currentSpread*pps+pps&&i<pages.length;i++)txt+=' '+(pages[i].querySelector('.page-inner').innerText||'');const u=new SpeechSynthesisUtterance(txt.trim());u.lang='de-DE';u.rate=0.94;u.onend=()=>{if(RS.speaking){next();setTimeout(()=>RS.currentSpread<RS.totalSpreads-1?toggleSpeech():stopSpeech(),700);}};sy.speak(u);RS.speaking=true;$('btn-speak').classList.add('speaking');}

function initSP(){
    document.querySelectorAll('.theme-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.theme-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');setTheme(b.dataset.theme);}));
    document.querySelectorAll('.font-btn').forEach(b=>{b.style.fontFamily="'"+b.dataset.font+"',serif";b.addEventListener('click',()=>{document.querySelectorAll('.font-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.documentElement.style.setProperty('--font-body',"'"+b.dataset.font+"',serif");});});
    const fsS=$('font-size-slider'),fsV=$('font-size-val');if(fsS)fsS.addEventListener('input',()=>{fsV.textContent=fsS.value;document.documentElement.style.setProperty('--font-size',fsS.value+'px');});
    const lhS=$('line-height-slider'),lhV=$('line-height-val');if(lhS)lhS.addEventListener('input',()=>{lhV.textContent=parseFloat(lhS.value).toFixed(1);document.documentElement.style.setProperty('--line-height',lhS.value);});
    const pwS=$('page-width-slider'),pwV=$('page-width-val');if(pwS)pwS.addEventListener('input',()=>{pwV.textContent=pwS.value;document.documentElement.style.setProperty('--page-width',pwS.value+'%');});
    const ac=$('accent-color-picker');if(ac)ac.addEventListener('input',e=>document.documentElement.style.setProperty('--accent',e.target.value));
    const pc=$('paper-color-picker'); if(pc)pc.addEventListener('input',e=>document.documentElement.style.setProperty('--paper',e.target.value));
    const tc=$('text-color-picker');  if(tc)tc.addEventListener('input',e=>document.documentElement.style.setProperty('--text',e.target.value));
    document.querySelectorAll('.layout-btn').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.layout-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');setLayout(b.dataset.layout);}));
}

function setTheme(t){
    document.body.className=document.body.className.replace(/theme-\S+/,'').trim()+' theme-'+t;
    document.querySelectorAll('.theme-btn').forEach(b=>b.classList.toggle('active',b.dataset.theme===t));
    const d={cosmos:{p:'#fdfaf3',t:'#2c3e50',a:'#c9a84c'},forest:{p:'#f5fdf5',t:'#1a2d1a',a:'#6ab04c'},ocean:{p:'#f0f8ff',t:'#0d2040',a:'#4fc3f7'},crimson:{p:'#fff5f5',t:'#2d0a0a',a:'#e57373'},sepia:{p:'#f9f4e8',t:'#3b2e1a',a:'#8b6914'},mint:{p:'#f5faf8',t:'#1a3d2e',a:'#00897b'}};
    const v=d[t]||d.cosmos;
    document.documentElement.style.setProperty('--paper',v.p);
    document.documentElement.style.setProperty('--text',v.t);
    document.documentElement.style.setProperty('--accent',v.a);
    const ac=$('accent-color-picker');if(ac)ac.value=v.a;
    const pc=$('paper-color-picker'); if(pc)pc.value=v.p;
    const tc=$('text-color-picker');  if(tc)tc.value=v.t;
}

let toastT;
function showToast(m){const t=$('toast');if(!t)return;t.textContent=m;t.classList.add('show');clearTimeout(toastT);toastT=setTimeout(()=>t.classList.remove('show'),2800);}
`;

/* Inline-CSS für die gespeicherte Version (Fallback wenn style.css nicht gelesen werden kann) */
const STYLE_CSS_CONTENT = `/* Buch-Reader style.css */
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--accent:#c9a84c;--accent-dim:#a87e2e;--paper:#fdfaf3;--text:#2c3e50;--text-muted:#7a869a;--bg:#0d0920;--bar-bg:rgba(10,7,30,.88);--bar-border:rgba(255,255,255,.07);--sp-bg:#100d28;--sp-border:rgba(255,255,255,.09);--overlay-bg:rgba(0,0,0,.65);--font-body:'Lora',serif;--font-size:15px;--line-height:1.7;--page-width:75%;--tr:0.22s cubic-bezier(.4,0,.2,1)}
body.theme-cosmos{--bg:#0d0920;--sp-bg:#100d28}body.theme-forest{--bg:#0a1a0d;--accent:#6ab04c;--sp-bg:#0c1810}body.theme-ocean{--bg:#060e1e;--accent:#4fc3f7;--sp-bg:#081022}body.theme-crimson{--bg:#140606;--accent:#e57373;--sp-bg:#160808}body.theme-sepia{--bg:#ede8df;--paper:#f9f4e8;--text:#3b2e1a;--accent:#8b6914;--bar-bg:rgba(50,35,15,.92);--sp-bg:#faf5ea;--sp-border:rgba(0,0,0,.1);--text-muted:#8b7355}body.theme-mint{--bg:#e8f5f0;--paper:#f5faf8;--text:#1a3d2e;--accent:#00897b;--bar-bg:rgba(10,50,35,.92);--sp-bg:#f0faf5;--text-muted:#4a7a68}
html,body{height:100%;overflow:hidden}
body{font-family:var(--font-body);background:var(--bg);color:var(--text);transition:background var(--tr),color var(--tr)}
#reader-screen{height:100vh;display:flex;flex-direction:column;overflow:hidden}
#reader-screen.zen-mode #topbar,#reader-screen.zen-mode #statusbar{opacity:0;pointer-events:none}
#topbar{display:flex;align-items:center;justify-content:space-between;padding:0 12px;height:54px;flex-shrink:0;background:var(--bar-bg);border-bottom:1px solid var(--bar-border);backdrop-filter:blur(16px);z-index:100}
.bar-left,.bar-right{display:flex;align-items:center;gap:3px}.bar-center{display:flex;align-items:center;gap:3px}
.book-title-display{font-family:'Playfair Display',serif;font-size:.84rem;color:rgba(255,255,255,.45);margin-left:8px;max-width:160px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
body.theme-sepia .book-title-display,body.theme-mint .book-title-display{color:var(--text-muted)}
#page-info{font-size:.78rem;color:rgba(255,255,255,.5);min-width:62px;text-align:center;font-family:monospace}
body.theme-sepia #page-info,body.theme-mint #page-info{color:var(--text-muted)}
.bar-btn{height:34px;padding:0 8px;min-width:34px;display:flex;align-items:center;justify-content:center;gap:5px;background:transparent;border:none;border-radius:7px;cursor:pointer;color:rgba(255,255,255,.52);transition:all var(--tr);font-size:.75rem;font-weight:600;white-space:nowrap}
body.theme-sepia .bar-btn,body.theme-mint .bar-btn{color:var(--text-muted)}
.bar-btn:hover{background:rgba(255,255,255,.08);color:var(--accent)}.bar-btn.active{color:var(--accent);background:rgba(201,168,76,.12)}
.bar-btn svg{width:17px;height:17px;flex-shrink:0;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.bar-btn#btn-speak.speaking{color:var(--accent);animation:pulse 1.5s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
#book-stage{flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;position:relative;padding:14px}
#book-container{width:var(--page-width);max-width:980px;height:100%;display:flex;flex-direction:column;transition:width .4s}
.book-pages-wrapper{flex:1;overflow:hidden;position:relative}
.pages-track{display:flex;height:100%;transition:transform .5s cubic-bezier(.4,0,.2,1)}
.page-spread{min-width:100%;height:100%;display:grid;gap:14px;padding:0 3px}
.page-spread.double{grid-template-columns:1fr 1fr}.page-spread.single{grid-template-columns:1fr;max-width:640px;margin:0 auto;width:100%}
.book-page{background:var(--paper);border-radius:3px;box-shadow:0 28px 80px rgba(0,0,0,.68),0 0 0 1px rgba(0,0,0,.25);overflow:hidden;display:flex;flex-direction:column}
.page-inner{flex:1;overflow-y:auto;padding:48px 46px 36px;font-family:var(--font-body);font-size:var(--font-size);line-height:var(--line-height);color:var(--text);text-align:justify;hyphens:auto}
.page-num{text-align:center;font-size:.7rem;color:var(--text-muted);padding:7px 0 12px;letter-spacing:.09em;border-top:1px solid rgba(0,0,0,.06);opacity:.65}
.page-inner h1{font-family:'Playfair Display',serif;font-size:1.65em;font-weight:700;border-bottom:2px solid var(--accent);padding-bottom:.28em;margin-bottom:.55em}
.page-inner h2{font-family:'Playfair Display',serif;font-size:1.3em;font-weight:700;margin:1.1em 0 .45em}
.page-inner h3,.page-inner h4{font-size:1.08em;font-weight:600;margin:.9em 0 .35em}
.page-inner p{margin-bottom:.85em}
.page-inner p:first-of-type::first-letter{float:left;font-family:'Playfair Display',serif;font-size:3.1em;line-height:.8;margin:.05em .08em 0 0;color:var(--accent);font-weight:700}
.page-inner blockquote{border-left:3px solid var(--accent);padding:6px 14px;margin:1em 0;font-style:italic;opacity:.78}
.page-inner img{max-width:100%;max-height:48vh;display:block;margin:18px auto;border-radius:4px;box-shadow:0 4px 16px rgba(0,0,0,.18)}
.page-inner ul,.page-inner ol{padding-left:1.4em;margin-bottom:.85em}.page-inner li{margin-bottom:.28em}
.toc-page-title{font-family:'Playfair Display',serif;font-size:1.5em;font-weight:700;margin-bottom:1.4em;padding-bottom:.35em;border-bottom:2px solid var(--accent)}
.toc-page-list{list-style:none}.toc-page-list li{display:flex;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px dotted rgba(0,0,0,.1);cursor:pointer}
.toc-page-list li:hover{color:var(--accent)}.toc-page-list li .toc-num{font-size:.78em;color:var(--text-muted);font-family:monospace}
.toc-h2{padding-left:14px;font-size:.92em}.toc-h3{padding-left:28px;font-size:.85em;opacity:.78}
#statusbar{height:30px;display:flex;align-items:center;justify-content:space-between;padding:0 18px;flex-shrink:0;background:var(--bar-bg);border-top:1px solid var(--bar-border);backdrop-filter:blur(16px);font-size:.73rem;color:rgba(255,255,255,.28)}
body.theme-sepia #statusbar,body.theme-mint #statusbar{color:var(--text-muted)}
.sb-center{flex:1;display:flex;justify-content:center}
#page-dots{display:flex;gap:5px;align-items:center}
.page-dot{width:5px;height:5px;border-radius:50%;background:rgba(255,255,255,.18);transition:all var(--tr);cursor:pointer}
.page-dot.active{background:var(--accent);transform:scale(1.5)}
#style-panel{position:fixed;top:54px;right:0;width:298px;height:calc(100vh - 54px);background:var(--sp-bg);border-left:1px solid var(--sp-border);z-index:200;overflow-y:auto;backdrop-filter:blur(20px);box-shadow:-18px 0 50px rgba(0,0,0,.28);animation:slideIn .24s cubic-bezier(.4,0,.2,1)}
@keyframes slideIn{from{transform:translateX(100%)}to{transform:none}}
.sp-header{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid var(--sp-border);font-size:.84rem;font-weight:600;color:rgba(255,255,255,.8);position:sticky;top:0;background:var(--sp-bg);z-index:1}
body.theme-sepia .sp-header,body.theme-mint .sp-header{color:var(--text)}
.sp-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.38);font-size:1rem;padding:3px 7px;border-radius:4px}
.sp-section{padding:16px 18px;border-bottom:1px solid var(--sp-border)}
.sp-label{display:block;font-size:.7rem;font-weight:700;text-transform:uppercase;letter-spacing:.09em;color:rgba(255,255,255,.3);margin-bottom:11px}
body.theme-sepia .sp-label,body.theme-mint .sp-label{color:var(--text-muted)}
.theme-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.theme-btn{padding:9px 5px;border-radius:8px;border:2px solid transparent;cursor:pointer;font-size:.76rem;font-weight:700;background:var(--tc,#222);color:var(--ta,#fff);transition:all var(--tr)}
.theme-btn.active{border-color:var(--accent)}
.font-grid{display:grid;grid-template-columns:1fr 1fr;gap:5px}
.font-btn{padding:7px 9px;border-radius:6px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:rgba(255,255,255,.6);cursor:pointer;font-size:.78rem}
body.theme-sepia .font-btn,body.theme-mint .font-btn{color:var(--text);border-color:rgba(0,0,0,.1);background:rgba(0,0,0,.04)}
.font-btn.active{border-color:var(--accent);background:rgba(201,168,76,.1);color:var(--accent)}
.sp-slider{width:100%;-webkit-appearance:none;height:4px;background:rgba(255,255,255,.1);border-radius:4px;outline:none}
.sp-slider::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:var(--accent);cursor:pointer}
.color-row{display:flex;align-items:center;gap:11px}
.sp-color-input{width:38px;height:30px;border:2px solid rgba(255,255,255,.1);border-radius:6px;cursor:pointer;background:none;padding:2px}
.color-hint{font-size:.76rem;color:rgba(255,255,255,.32)}
body.theme-sepia .color-hint,body.theme-mint .color-hint{color:var(--text-muted)}
.layout-row{display:flex;gap:9px}
.layout-btn{flex:1;padding:9px;border-radius:8px;border:2px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);color:rgba(255,255,255,.48);cursor:pointer;font-size:.76rem;display:flex;flex-direction:column;align-items:center;gap:5px;transition:all var(--tr)}
.layout-btn svg{width:38px;height:26px}
.layout-btn.active,.layout-btn:hover{border-color:var(--accent);color:var(--accent)}
#toc-overlay{position:fixed;inset:0;background:var(--overlay-bg);z-index:300;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px)}
.toc-inner{background:var(--sp-bg);border:1px solid var(--sp-border);border-radius:16px;width:min(540px,90vw);max-height:74vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 40px 100px rgba(0,0,0,.5)}
.toc-header{display:flex;justify-content:space-between;align-items:center;padding:16px 20px;border-bottom:1px solid var(--sp-border);font-size:.88rem;font-weight:700;font-family:'Playfair Display',serif;color:rgba(255,255,255,.82);flex-shrink:0}
body.theme-sepia .toc-header,body.theme-mint .toc-header{color:var(--text)}
#btn-toc-close{background:none;border:none;cursor:pointer;color:rgba(255,255,255,.38);font-size:1rem;padding:3px 7px;border-radius:4px}
#toc-list{overflow-y:auto;padding:14px 20px;flex:1}
#toast{position:fixed;bottom:46px;left:50%;transform:translateX(-50%) translateY(16px);background:rgba(15,12,40,.96);color:#fff;padding:9px 20px;border-radius:50px;font-size:.81rem;opacity:0;pointer-events:none;transition:all .28s;border:1px solid rgba(255,255,255,.09);backdrop-filter:blur(12px);z-index:9999;white-space:nowrap}
#toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(max-width:680px){.page-spread.double{grid-template-columns:1fr}#style-panel{width:100vw}.page-inner{padding:28px 20px 24px}:root{--page-width:95%}}
`;
