/* =========================================================
   PDF EDITOR — SCRIPT
   Rendering: PDF.js   |   Export/Speichern: pdf-lib
   ========================================================= */

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/* ---------- Konfiguration ---------- */
const SCALE_MIN = 0.5, SCALE_MAX = 3, SCALE_STEP = 0.1;
const HISTORY_LIMIT = 60;
const EXPORT_FONT_CSS = {
  Helvetica:  "'Helvetica Neue', Arial, Helvetica, sans-serif",
  TimesRoman: "'Times New Roman', Times, serif",
  Courier:    "'Courier New', Courier, monospace"
};

/* ---------- Globaler Zustand ---------- */
let pdfjsDoc      = null;   // pdf.js-Dokument (Rendering)
let originalBytes = null;   // Uint8Array der Originaldatei (für Export)
let fileName      = 'dokument.pdf';

let state = { pages: [] };  // Modell: pro Seite {sourceIndex, rotation, edits, freeTexts, rects, deleted, isBlank, size}
let textCache      = [];    // pro Seite: Array extrahierter Text-Items (Position/Stil in PDF-Koordinaten)
let pageViewports  = [];    // aktuelle Viewports (für Koordinaten-Umrechnung)

let history = [], historyIndex = -1;

let scale = 1.2;
let currentTool = 'select'; // select | addtext | highlight | whiteout
let selection   = null;     // {kind:'text'|'free'|'rect', pageIndex, id, el, item?, ft?}
let activePageIndex = 0;
let isDirty = false;
let suppressApply = false;
let currentAlign = 'left';

let defaultTextStyle = { fontFamily:'Helvetica', size:12, color:'#1a1a1a', bg:'#ffffff', bgOpacity:0, bold:false, italic:false, underline:false, align:'left' };
let defaultAnnoStyle  = { color:'#f5d142', opacity:0.45 };  // Markieren (Hervorhebung)
let defaultCoverStyle = { color:'#ffffff', opacity:1 };     // Überdecken (frei wählbare Deckfarbe)

/* ---------- DOM-Referenzen ---------- */
const $ = (id) => document.getElementById(id);

const fileInput       = $('file-input');
const dropzone        = $('dropzone');
const viewerContainer  = $('viewer-container');
const pagesContainer   = $('pages-container');
const thumbnailsEl     = $('thumbnails');

const stylePanel  = $('style-panel');
const btnStyle    = $('btn-style');

const panelFont      = $('style-font');
const panelSize      = $('style-size');
const panelSizeVal   = $('style-size-value');
const panelColor     = $('style-color');
const panelBg        = $('style-bg');
const panelBgOpacity    = $('style-bg-opacity');
const panelBgOpacityVal = $('style-bg-opacity-value');
const panelBold      = $('style-bold');
const panelItalic    = $('style-italic');
const panelUnderline = $('style-underline');
const alignBtns      = { left:$('align-left'), center:$('align-center'), right:$('align-right') };

const annoColor       = $('anno-color');
const annoOpacity     = $('anno-opacity');
const annoOpacityVal  = $('anno-opacity-value');

const themeDark  = $('theme-dark');
const themeLight = $('theme-light');

/* ============================================================
   HILFSFUNKTIONEN
   ============================================================ */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

let _uidN = 0;
function uid(prefix) { return prefix + '_' + (++_uidN) + '_' + Math.random().toString(36).slice(2, 7); }

function toast(msg, type = 'info', timeout = 3200) {
  const c = $('toast-container');
  const el = document.createElement('div');
  el.className = 'toast' + (type !== 'info' ? ' ' + type : '');
  el.textContent = msg;
  c.appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .25s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 250);
  }, timeout);
}

function showLoading(text) {
  $('loading-text').textContent = text || 'Bitte warten …';
  $('loading-overlay').classList.remove('hidden');
}
function hideLoading() { $('loading-overlay').classList.add('hidden'); }

function hexToPdfRgb(hex) {
  hex = (hex || '#000000').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16) / 255 || 0;
  const g = parseInt(hex.substring(2, 4), 16) / 255 || 0;
  const b = parseInt(hex.substring(4, 6), 16) / 255 || 0;
  return PDFLib.rgb(r, g, b);
}

function hexToRgba(hex, alpha) {
  hex = (hex || '#ffffff').replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substring(0, 2), 16); const g = parseInt(hex.substring(2, 4), 16); const b = parseInt(hex.substring(4, 6), 16);
  return 'rgba(' + (r || 0) + ',' + (g || 0) + ',' + (b || 0) + ',' + clamp(alpha == null ? 1 : alpha, 0, 1) + ')';
}

function guessExportFamily(css) {
  css = (css || '').toLowerCase();
  if (css.includes('mono') || css.includes('courier')) return 'Courier';
  if (css.includes('serif') && !css.includes('sans')) return 'TimesRoman';
  return 'Helvetica';
}

function setToggle(btn, on) { btn.setAttribute('aria-pressed', on ? 'true' : 'false'); }

/* ============================================================
   VERLAUF (UNDO / REDO)
   ============================================================ */
function cloneState() {
  if (typeof structuredClone === 'function') return structuredClone(state.pages);
  return JSON.parse(JSON.stringify(state.pages));
}
function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(cloneState());
  if (history.length > HISTORY_LIMIT) history.shift();
  historyIndex = history.length - 1;
  updateUndoRedoButtons();
}
function updateUndoRedoButtons() {
  $('btn-undo').disabled = historyIndex <= 0;
  $('btn-redo').disabled = historyIndex >= history.length - 1;
}
async function undo() {
  if (historyIndex <= 0) return;
  historyIndex--;
  state.pages = JSON.parse(JSON.stringify(history[historyIndex]));
  clearSelection();
  await renderAllPages();
  updateUndoRedoButtons();
  markDirty();
}
async function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex++;
  state.pages = JSON.parse(JSON.stringify(history[historyIndex]));
  clearSelection();
  await renderAllPages();
  updateUndoRedoButtons();
  markDirty();
}

function markDirty() { isDirty = true; updateStatus(); }
function updateStatus() {
  $('status-file').textContent = state.pages.length ? fileName : 'Keine Datei geöffnet';
  $('status-dirty').textContent = isDirty ? '● ungespeicherte Änderungen' : '';
  $('btn-save').disabled = state.pages.length === 0;
  $('zoom-level').textContent = Math.round(scale * 100) + '%';
  if (state.pages.length) {
    $('status-page').textContent = 'Seite ' + (currentPageIndex() + 1) + ' / ' + state.pages.length;
  } else {
    $('status-page').textContent = 'Seite – / –';
  }
}

function enableEditingUI(on) {
  $('tools').dataset.disabled = on ? 'false' : 'true';
  $('page-tools').dataset.disabled = on ? 'false' : 'true';
  $('btn-zoom-in').disabled = !on;
  $('btn-zoom-out').disabled = !on;
}

/* ============================================================
   DATEI ÖFFNEN (Upload / Drag&Drop)
   ============================================================ */
function openFileDialog() { confirmReplaceIfNeeded(() => fileInput.click()); }

function confirmReplaceIfNeeded(cb) {
  if (state.pages.length > 0 && isDirty) {
    if (confirm('Es gibt ungespeicherte Änderungen. Trotzdem eine neue Datei öffnen und die aktuelle verwerfen?')) cb();
  } else cb();
}

async function loadPdfFile(file) {
  if (!file) return;
  showLoading('PDF wird geladen …');
  try {
    const buf = await file.arrayBuffer();
    originalBytes = new Uint8Array(buf);
    fileName = file.name || 'dokument.pdf';

    pdfjsDoc = await pdfjsLib.getDocument({ data: originalBytes.slice() }).promise;

    state.pages = [];
    for (let i = 0; i < pdfjsDoc.numPages; i++) {
      state.pages.push({ sourceIndex: i, rotation: 0, edits: {}, freeTexts: [], rects: [], deleted: false, isBlank: false, size: null });
    }
    textCache = new Array(state.pages.length).fill(null);
    history = []; historyIndex = -1;
    selection = null;
    isDirty = false;
    activePageIndex = 0;

    dropzone.classList.add('hidden');
    enableEditingUI(true);

    await renderAllPages();
    pushHistory();
    updateStatus();
    toast('„' + fileName + '“ geladen — ' + state.pages.length + ' Seite(n)', 'success');
  } catch (err) {
    console.error(err);
    toast('Die Datei konnte nicht geladen werden. Ist es eine gültige PDF?', 'error');
  } finally {
    hideLoading();
  }
}

/* ============================================================
   FARBEN AUS DEM CANVAS SCHÄTZEN (für „Style behalten“)
   ============================================================ */
function sampleColors(ctx, dpr, box) {
  try {
    const x = Math.max(0, Math.floor(box.left * dpr));
    const y = Math.max(0, Math.floor(box.top * dpr));
    const w = Math.max(1, Math.min(Math.ceil(box.width * dpr), ctx.canvas.width - x));
    const h = Math.max(1, Math.min(Math.ceil(box.height * dpr), ctx.canvas.height - y));
    if (w <= 0 || h <= 0) return { ink: '#1a1a1a', bg: '#ffffff' };
    const data = ctx.getImageData(x, y, w, h).data;
    let darkest = null, darkestLum = 999, lightest = null, lightestLum = -1;
    const step = 4 * Math.max(1, Math.floor((w * h) / 400));
    for (let i = 0; i < data.length; i += step) {
      const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
      if (a < 10) continue;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      if (lum < darkestLum) { darkestLum = lum; darkest = [r, g, b]; }
      if (lum > lightestLum) { lightestLum = lum; lightest = [r, g, b]; }
    }
    const hex = (c) => c ? ('#' + c.map(v => v.toString(16).padStart(2, '0')).join('')) : null;
    return { ink: hex(darkest) || '#1a1a1a', bg: hex(lightest) || '#ffffff' };
  } catch (e) {
    return { ink: '#1a1a1a', bg: '#ffffff' };
  }
}

function buildTextCache(textContent, dpr, ctx, viewport) {
  const styles = textContent.styles || {};
  const items = [];
  textContent.items.forEach((it, idx) => {
    if (!it.str || !it.str.trim()) return;
    const t = it.transform;
    const pdfFontSize = Math.hypot(t[2], t[3]) || 10;
    const pdfX = t[4], pdfY = t[5];
    const pdfWidth = it.width || (pdfFontSize * 0.5 * it.str.length);
    const styleInfo = styles[it.fontName] || {};
    const cssFontFamily = styleInfo.fontFamily || 'sans-serif';

    const topPdf = pdfY + pdfFontSize * 0.78;
    const botPdf = pdfY - pdfFontSize * 0.25;
    const p1 = viewport.convertToViewportPoint(pdfX, topPdf);
    const p2 = viewport.convertToViewportPoint(pdfX + pdfWidth, botPdf);
    const box = {
      left: Math.min(p1[0], p2[0]), top: Math.min(p1[1], p2[1]),
      width: Math.max(1, Math.abs(p2[0] - p1[0])), height: Math.max(1, Math.abs(p2[1] - p1[1]))
    };
    const colors = sampleColors(ctx, dpr, box);

    items.push({ id: 'it' + idx, str: it.str, pdfX, pdfY, pdfFontSize, pdfWidth, cssFontFamily, ink: colors.ink, bg: colors.bg });
  });
  return items;
}

/* ============================================================
   RENDERING DER SEITEN
   ============================================================ */
function makeFakeViewport(pdfW, pdfH, scl, rotation) {
  rotation = ((rotation % 360) + 360) % 360;
  const width = (rotation === 90 || rotation === 270) ? pdfH * scl : pdfW * scl;
  const height = (rotation === 90 || rotation === 270) ? pdfW * scl : pdfH * scl;
  return {
    scale: scl, width, height, rotation,
    convertToViewportPoint(x, y) {
      switch (rotation) {
        case 90:  return [(pdfH - y) * scl, (pdfW - x) * scl];
        case 180: return [(pdfW - x) * scl, y * scl];
        case 270: return [y * scl, x * scl];
        default:  return [x * scl, (pdfH - y) * scl];
      }
    },
    convertToPdfPoint(x, y) {
      switch (rotation) {
        case 90:  return [pdfH - (y / scl), pdfW - (x / scl)];
        case 180: return [pdfW - (x / scl), y / scl];
        case 270: return [y / scl, x / scl];
        default:  return [x / scl, pdfH - (y / scl)];
      }
    }
  };
}

async function renderAllPages() {
  pagesContainer.innerHTML = '';
  pageViewports = [];
  for (let i = 0; i < state.pages.length; i++) {
    const wrapper = await renderSinglePage(i, state.pages[i]);
    pagesContainer.appendChild(wrapper);
  }
  renderThumbnails();
  setupPageObserver();
  updateStatus();
}

async function renderSinglePage(i, pageModel) {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-wrapper';
  wrapper.dataset.pageIndex = i;
  wrapper.dataset.tool = currentTool;

  let viewport, canvas, ctx;
  const dpr = window.devicePixelRatio || 1;

  if (pageModel.isBlank) {
    const size = pageModel.size || [595.28, 841.89];
    viewport = makeFakeViewport(size[0], size[1], scale, pageModel.rotation);
    canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width * dpr);
    canvas.height = Math.ceil(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, viewport.width, viewport.height);
    wrapper.appendChild(canvas);
    if (!textCache[i]) textCache[i] = [];
  } else {
    const page = await pdfjsDoc.getPage(pageModel.sourceIndex + 1);
    viewport = page.getViewport({ scale, rotation: (page.rotate + pageModel.rotation) % 360 });
    canvas = document.createElement('canvas');
    canvas.width = Math.ceil(viewport.width * dpr);
    canvas.height = Math.ceil(viewport.height * dpr);
    canvas.style.width = viewport.width + 'px';
    canvas.style.height = viewport.height + 'px';
    ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    await page.render({ canvasContext: ctx, viewport }).promise;
    wrapper.appendChild(canvas);

    if (!textCache[i]) {
      const textContent = await page.getTextContent();
      textCache[i] = buildTextCache(textContent, dpr, ctx, viewport);
    }
  }

  pageViewports[i] = viewport;

  const textLayer = document.createElement('div');
  textLayer.className = 'text-layer';
  (textCache[i] || []).forEach(item => textLayer.appendChild(createTextSpan(i, item, viewport)));
  wrapper.appendChild(textLayer);

  const annoLayer = document.createElement('div');
  annoLayer.className = 'annotation-layer';
  pageModel.rects.forEach(r => annoLayer.appendChild(createRectElement(r, viewport)));
  pageModel.freeTexts.forEach(ft => annoLayer.appendChild(createFreeTextElement(i, ft, viewport)));
  wrapper.appendChild(annoLayer);

  wireDrawingHandlers(wrapper, i, viewport);

  const badge = document.createElement('div');
  badge.className = 'page-num-badge';
  badge.textContent = 'Seite ' + (i + 1);
  wrapper.appendChild(badge);

  return wrapper;
}

/* ============================================================
   ORIGINAL-TEXT: BEARBEITBARE OVERLAYS
   ============================================================ */
function getDefaultEditState(item) {
  return {
    text: item.str, fontFamily: guessExportFamily(item.cssFontFamily),
    size: item.pdfFontSize, color: item.ink, bg: item.bg, bgOpacity: 1,
    bold: false, italic: false, underline: false, align: 'left', dirty: false
  };
}
function getEditState(pageIndex, item) {
  return state.pages[pageIndex].edits[item.id] || getDefaultEditState(item);
}

function positionSpan(span, item, edit, viewport) {
  const top = item.pdfY + edit.size * 0.78;
  const bottom = item.pdfY - edit.size * 0.25;
  const left = item.pdfX;
  const estLen = Math.max(item.str.length, edit.text.length, 1);
  const right = item.pdfX + Math.max(item.pdfWidth, estLen * edit.size * 0.55);
  const p1 = viewport.convertToViewportPoint(left, top);
  const p2 = viewport.convertToViewportPoint(right, bottom);
  span.style.left = Math.min(p1[0], p2[0]) + 'px';
  span.style.top = Math.min(p1[1], p2[1]) + 'px';
  span.style.minWidth = Math.abs(p2[0] - p1[0]) + 'px';
  span.style.height = Math.abs(p2[1] - p1[1]) + 'px';
  span.style.lineHeight = Math.abs(p2[1] - p1[1]) + 'px';
  span.style.fontSize = (edit.size * viewport.scale) + 'px';
}

function applySpanStyle(span, edit, item) {
  span.style.fontFamily = edit.dirty ? (EXPORT_FONT_CSS[edit.fontFamily] || 'sans-serif') : (item.cssFontFamily || 'sans-serif');
  span.style.fontWeight = edit.bold ? '700' : '400';
  span.style.fontStyle = edit.italic ? 'italic' : 'normal';
  span.style.textDecoration = edit.underline ? 'underline' : 'none';
  if (edit.dirty) {
    span.style.color = edit.color;
    span.style.background = hexToRgba(edit.bg || '#ffffff', edit.bgOpacity == null ? 1 : edit.bgOpacity);
    span.classList.add('is-edited');
  } else {
    span.style.color = 'transparent';
    span.style.background = 'transparent';
    span.classList.remove('is-edited');
  }
}

function createTextSpan(pageIndex, item, viewport) {
  const edit = getEditState(pageIndex, item);
  const span = document.createElement('div');
  span.className = 'text-span';
  span.contentEditable = 'true';
  span.spellcheck = false;
  span.dataset.itemId = item.id;
  span.textContent = edit.text;
  positionSpan(span, item, edit, viewport);
  applySpanStyle(span, edit, item);
  wireSpanEvents(span, pageIndex, item);
  return span;
}

function wireSpanEvents(span, pageIndex, item) {
  span.addEventListener('focus', () => {
    if (currentTool !== 'select') { span.blur(); return; }
    span._before = JSON.stringify(getEditState(pageIndex, item));
    applySpanStyle(span, { ...getEditState(pageIndex, item), dirty: true }, item);
    setSelection({ kind: 'text', pageIndex, id: item.id, el: span, item });
  });
  span.addEventListener('click', () => {
    if (currentTool === 'select') setSelection({ kind: 'text', pageIndex, id: item.id, el: span, item });
  });
  span.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') { e.preventDefault(); span.blur(); }
    if (e.key === 'Enter') { e.preventDefault(); span.blur(); }
  });
  span.addEventListener('blur', () => commitTextSpan(pageIndex, item, span));
}

function commitTextSpan(pageIndex, item, span) {
  const newText = span.textContent;
  const prior = state.pages[pageIndex].edits[item.id];

  if (prior) {
    // Es gibt bereits einen gespeicherten Stil-Override (z. B. über das Style-Panel gesetzt,
    // etwa eine eigene Hintergrundfarbe). Dieser bleibt unangetastet — nur der Text wird übernommen.
    prior.text = newText;
    prior.dirty = true;
    applySpanStyle(span, prior, item);
    positionSpan(span, item, prior, pageViewports[pageIndex]);
    markDirty(); pushHistory();
    return;
  }

  const def = getDefaultEditState(item);
  if (newText === item.str) {
    // Nichts verändert: auf Original-Optik zurücksetzen.
    applySpanStyle(span, def, item);
    positionSpan(span, item, def, pageViewports[pageIndex]);
    return;
  }

  const finalEdit = { ...def, text: newText, dirty: true };
  state.pages[pageIndex].edits[item.id] = finalEdit;
  applySpanStyle(span, finalEdit, item);
  positionSpan(span, item, finalEdit, pageViewports[pageIndex]);
  markDirty(); pushHistory();
}

/* ============================================================
   FREITEXT-BOXEN
   ============================================================ */
function ftScreenBox(ft, viewport) {
  const p1 = viewport.convertToViewportPoint(ft.x, ft.y + ft.h);
  const p2 = viewport.convertToViewportPoint(ft.x + ft.w, ft.y);
  return { left: Math.min(p1[0], p2[0]), top: Math.min(p1[1], p2[1]), width: Math.abs(p2[0] - p1[0]), height: Math.abs(p2[1] - p1[1]) };
}
function applyFreeTextStyle(box, content, style, scl) {
  content.style.fontFamily = EXPORT_FONT_CSS[style.fontFamily] || 'sans-serif';
  content.style.fontSize = (style.size * scl) + 'px';
  content.style.color = style.color;
  content.style.fontWeight = style.bold ? '700' : '400';
  content.style.fontStyle = style.italic ? 'italic' : 'normal';
  content.style.textDecoration = style.underline ? 'underline' : 'none';
  content.style.textAlign = style.align || 'left';
  content.style.lineHeight = '1.25';
  const bgOp = style.bgOpacity == null ? 0 : style.bgOpacity;
  box.style.background = bgOp > 0 ? hexToRgba(style.bg || '#ffffff', bgOp) : 'transparent';
}

function createFreeTextElement(pageIndex, ft, viewport) {
  const box = document.createElement('div');
  box.className = 'free-text-box';
  box.dataset.ftId = ft.id;
  const b = ftScreenBox(ft, viewport);
  box.style.left = b.left + 'px'; box.style.top = b.top + 'px';
  box.style.width = b.width + 'px'; box.style.height = b.height + 'px';

  const content = document.createElement('div');
  content.className = 'ft-content';
  content.contentEditable = 'true';
  content.spellcheck = false;
  content.textContent = ft.text;
  applyFreeTextStyle(box, content, ft.style, viewport.scale);
  box.appendChild(content);

  const moveHandle = document.createElement('div'); moveHandle.className = 'ft-handle ft-move'; moveHandle.textContent = '⠿';
  const resizeHandle = document.createElement('div'); resizeHandle.className = 'ft-handle ft-resize'; resizeHandle.textContent = '⤡';
  const delHandle = document.createElement('div'); delHandle.className = 'ft-handle ft-delete'; delHandle.textContent = '✕';
  box.append(moveHandle, resizeHandle, delHandle);

  const select = () => setSelection({ kind: 'free', pageIndex, id: ft.id, el: box, ft });
  content.addEventListener('focus', () => { select(); content._before = content.textContent; });
  content.addEventListener('click', select);
  content.addEventListener('blur', () => {
    if (content.textContent !== content._before) { ft.text = content.textContent; markDirty(); pushHistory(); }
  });
  delHandle.addEventListener('click', (e) => {
    e.stopPropagation();
    const arr = state.pages[pageIndex].freeTexts;
    const idx = arr.findIndex(f => f.id === ft.id);
    if (idx > -1) arr.splice(idx, 1);
    box.remove();
    if (selection && selection.id === ft.id) clearSelection();
    markDirty(); pushHistory();
  });
  moveHandle.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); select(); startFreeTextDrag(ft, box, viewport, 'move', e); });
  resizeHandle.addEventListener('mousedown', (e) => { e.preventDefault(); e.stopPropagation(); select(); startFreeTextDrag(ft, box, viewport, 'resize', e); });

  return box;
}

function startFreeTextDrag(ft, box, viewport, mode, startEvent) {
  const startX = startEvent.clientX, startY = startEvent.clientY;
  const origin = { x: ft.x, y: ft.y, w: ft.w, h: ft.h };
  const topFixed = origin.y + origin.h;
  const brScreenStart = viewport.convertToViewportPoint(origin.x + origin.w, origin.y);

  function onMove(e) {
    const dxScreen = e.clientX - startX, dyScreen = e.clientY - startY;
    if (mode === 'move') {
      ft.x = origin.x + dxScreen / viewport.scale;
      ft.y = origin.y - dyScreen / viewport.scale;
    } else {
      const newBr = [brScreenStart[0] + dxScreen, brScreenStart[1] + dyScreen];
      const newBrPdf = viewport.convertToPdfPoint(newBr[0], newBr[1]);
      const minW = 24 / viewport.scale, minH = 16 / viewport.scale;
      ft.w = Math.max(minW, newBrPdf[0] - origin.x);
      ft.y = Math.min(newBrPdf[1], topFixed - minH);
      ft.h = topFixed - ft.y;
    }
    const b = ftScreenBox(ft, viewport);
    box.style.left = b.left + 'px'; box.style.top = b.top + 'px';
    box.style.width = b.width + 'px'; box.style.height = b.height + 'px';
  }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    markDirty(); pushHistory();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function placeFreeTextAt(pageIndex, wrapper, viewport, e) {
  const r = wrapper.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  const p1 = viewport.convertToPdfPoint(sx, sy);
  const defW = 160 / viewport.scale, defH = (defaultTextStyle.size * 1.5) / viewport.scale;
  const ft = { id: uid('ft'), x: p1[0], y: p1[1] - defH, w: defW, h: defH, text: '', style: { ...defaultTextStyle } };
  state.pages[pageIndex].freeTexts.push(ft);
  const el = createFreeTextElement(pageIndex, ft, viewport);
  wrapper.querySelector('.annotation-layer').appendChild(el);
  setTool('select');
  setSelection({ kind: 'free', pageIndex, id: ft.id, el, ft });
  el.querySelector('.ft-content').focus();
  markDirty(); pushHistory();
}

/* ============================================================
   MARKIEREN / WEISS ÜBERDECKEN (RECHTECK-ANNOTATIONEN)
   ============================================================ */
function positionRectElement(el, rect, viewport) {
  const p1 = viewport.convertToViewportPoint(rect.x, rect.y + rect.h);
  const p2 = viewport.convertToViewportPoint(rect.x + rect.w, rect.y);
  el.style.left = Math.min(p1[0], p2[0]) + 'px';
  el.style.top = Math.min(p1[1], p2[1]) + 'px';
  el.style.width = Math.abs(p2[0] - p1[0]) + 'px';
  el.style.height = Math.abs(p2[1] - p1[1]) + 'px';
}
function createRectElement(rect, viewport) {
  const el = document.createElement('div');
  el.className = 'rect-anno kind-' + rect.type;
  el.dataset.rectId = rect.id;
  positionRectElement(el, rect, viewport);
  el.style.background = rect.color;
  el.style.opacity = rect.opacity;
  return el;
}
function findRect(pageIndex, id) { return state.pages[pageIndex].rects.find(r => r.id === id); }

function startRectDraw(pageIndex, wrapper, viewport, kind, startEvent) {
  const wr = wrapper.getBoundingClientRect();
  const startScreen = [startEvent.clientX - wr.left, startEvent.clientY - wr.top];
  const band = document.createElement('div');
  band.className = 'draw-rubberband';
  wrapper.appendChild(band);

  function update(cur) {
    const left = Math.min(startScreen[0], cur[0]), top = Math.min(startScreen[1], cur[1]);
    const w = Math.abs(cur[0] - startScreen[0]), h = Math.abs(cur[1] - startScreen[1]);
    band.style.left = left + 'px'; band.style.top = top + 'px';
    band.style.width = w + 'px'; band.style.height = h + 'px';
    return { left, top, w, h };
  }
  let last = update(startScreen);

  function onMove(e) { last = update([e.clientX - wr.left, e.clientY - wr.top]); }
  function onUp() {
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    band.remove();
    if (last.w < 4 || last.h < 4) return;
    const p1 = viewport.convertToPdfPoint(last.left, last.top);
    const p2 = viewport.convertToPdfPoint(last.left + last.w, last.top + last.h);
    const x = Math.min(p1[0], p2[0]), x2 = Math.max(p1[0], p2[0]);
    const y = Math.min(p1[1], p2[1]), y2 = Math.max(p1[1], p2[1]);
    const rect = {
      id: uid('rect'), type: kind, x, y, w: x2 - x, h: y2 - y,
      color: kind === 'highlight' ? defaultAnnoStyle.color : defaultCoverStyle.color,
      opacity: kind === 'highlight' ? defaultAnnoStyle.opacity : defaultCoverStyle.opacity
    };
    state.pages[pageIndex].rects.push(rect);
    const annoLayer = wrapper.querySelector('.annotation-layer');
    const el = createRectElement(rect, viewport);
    annoLayer.appendChild(el);
    setTool('select');
    setSelection({ kind: 'rect', pageIndex, id: rect.id, el });
    markDirty(); pushHistory();
  }
  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
}

function wireDrawingHandlers(wrapper, pageIndex, viewport) {
  wrapper.addEventListener('mousedown', (e) => {
    if (e.target.closest('.text-span, .free-text-box, .ft-handle, .rect-anno')) return;
    if (currentTool === 'highlight' || currentTool === 'whiteout') startRectDraw(pageIndex, wrapper, viewport, currentTool, e);
    else if (currentTool === 'addtext') placeFreeTextAt(pageIndex, wrapper, viewport, e);
    else if (currentTool === 'select') clearSelection();
  });
  wrapper.addEventListener('click', (e) => {
    if (currentTool !== 'select') return;
    const rectEl = e.target.closest('.rect-anno');
    if (rectEl) setSelection({ kind: 'rect', pageIndex, id: rectEl.dataset.rectId, el: rectEl });
  });
}

/* ============================================================
   AUSWAHL & STYLE-PANEL-SYNCHRONISATION
   ============================================================ */
function setSelection(sel) {
  document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
  selection = sel;
  if (sel.el) sel.el.classList.add('is-selected');
  $('btn-delete-selection').disabled = false;
  syncPanelFromSelection();
}
function clearSelection() {
  document.querySelectorAll('.is-selected').forEach(el => el.classList.remove('is-selected'));
  selection = null;
  $('btn-delete-selection').disabled = true;
  syncAnnoPanelToContext();
}

function deleteSelection() {
  if (!selection) return;
  if (selection.kind === 'rect') {
    const arr = state.pages[selection.pageIndex].rects;
    const idx = arr.findIndex(r => r.id === selection.id);
    if (idx > -1) arr.splice(idx, 1);
    selection.el.remove();
  } else if (selection.kind === 'free') {
    const arr = state.pages[selection.pageIndex].freeTexts;
    const idx = arr.findIndex(f => f.id === selection.id);
    if (idx > -1) arr.splice(idx, 1);
    selection.el.remove();
  } else if (selection.kind === 'text') {
    selection.el.textContent = '';
    commitTextSpan(selection.pageIndex, selection.item, selection.el);
  }
  clearSelection();
  markDirty(); pushHistory();
}

function setAlign(a) {
  currentAlign = a;
  Object.entries(alignBtns).forEach(([k, b]) => setToggle(b, k === a));
}

function syncPanelFromSelection() {
  suppressApply = true;
  if (selection && selection.kind === 'text') {
    const def = getDefaultEditState(selection.item);
    const ed = state.pages[selection.pageIndex].edits[selection.id] || def;
    panelFont.value = ed.fontFamily;
    panelSize.value = Math.round(ed.size); panelSizeVal.textContent = Math.round(ed.size);
    panelColor.value = ed.color;
    panelBg.value = ed.bg || '#ffffff';
    const bgOp = ed.bgOpacity == null ? 1 : ed.bgOpacity;
    panelBgOpacity.value = Math.round(bgOp * 100);
    panelBgOpacityVal.textContent = Math.round(bgOp * 100) + '%';
    setToggle(panelBold, !!ed.bold); setToggle(panelItalic, !!ed.italic); setToggle(panelUnderline, !!ed.underline);
    setAlign(ed.align || 'left');
  } else if (selection && selection.kind === 'free') {
    const ft = selection.ft;
    panelFont.value = ft.style.fontFamily;
    panelSize.value = Math.round(ft.style.size); panelSizeVal.textContent = Math.round(ft.style.size);
    panelColor.value = ft.style.color;
    panelBg.value = ft.style.bg || '#ffffff';
    const ftBgOp = ft.style.bgOpacity == null ? 0 : ft.style.bgOpacity;
    panelBgOpacity.value = Math.round(ftBgOp * 100);
    panelBgOpacityVal.textContent = Math.round(ftBgOp * 100) + '%';
    setToggle(panelBold, !!ft.style.bold); setToggle(panelItalic, !!ft.style.italic); setToggle(panelUnderline, !!ft.style.underline);
    setAlign(ft.style.align || 'left');
  } else if (selection && selection.kind === 'rect') {
    const r = findRect(selection.pageIndex, selection.id);
    if (r) {
      annoColor.value = r.color;
      annoOpacity.value = Math.round(r.opacity * 100);
      annoOpacityVal.textContent = Math.round(r.opacity * 100) + '%';
    }
  }
  suppressApply = false;
}

function onPanelTextStyleChange() {
  if (suppressApply) return;
  const styleObj = {
    fontFamily: panelFont.value, size: parseFloat(panelSize.value) || 12, color: panelColor.value,
    bg: panelBg.value,
    bgOpacity: (parseInt(panelBgOpacity.value, 10) || 0) / 100,
    bold: panelBold.getAttribute('aria-pressed') === 'true',
    italic: panelItalic.getAttribute('aria-pressed') === 'true',
    underline: panelUnderline.getAttribute('aria-pressed') === 'true',
    align: currentAlign
  };
  defaultTextStyle = { ...styleObj };
  if (!selection) return;
  if (selection.kind === 'text') {
    const { pageIndex, id, el, item } = selection;
    const def = getDefaultEditState(item);
    const existing = state.pages[pageIndex].edits[id] || { ...def, text: el.textContent };
    Object.assign(existing, styleObj, { text: el.textContent, dirty: true });
    state.pages[pageIndex].edits[id] = existing;
    applySpanStyle(el, existing, item);
    positionSpan(el, item, existing, pageViewports[pageIndex]);
  } else if (selection.kind === 'free') {
    const ft = selection.ft;
    Object.assign(ft.style, styleObj);
    applyFreeTextStyle(selection.el, selection.el.querySelector('.ft-content'), ft.style, pageViewports[selection.pageIndex].scale);
  }
}
function onPanelAnnoStyleChange() {
  if (suppressApply) return;
  const val = { color: annoColor.value, opacity: (parseInt(annoOpacity.value, 10) || 45) / 100 };
  if (selection && selection.kind === 'rect') {
    const r = findRect(selection.pageIndex, selection.id);
    if (r) {
      r.color = val.color; r.opacity = val.opacity;
      selection.el.style.background = r.color; selection.el.style.opacity = r.opacity;
      if (r.type === 'highlight') defaultAnnoStyle = { ...val }; else defaultCoverStyle = { ...val };
    }
  } else if (currentTool === 'whiteout') {
    defaultCoverStyle = { ...val };
  } else {
    defaultAnnoStyle = { ...val };
  }
}

function syncAnnoPanelToContext() {
  if (selection) return; // bei aktiver Auswahl übernimmt syncPanelFromSelection die Werte
  suppressApply = true;
  const ctx = currentTool === 'whiteout' ? defaultCoverStyle : defaultAnnoStyle;
  annoColor.value = ctx.color;
  annoOpacity.value = Math.round(ctx.opacity * 100);
  annoOpacityVal.textContent = Math.round(ctx.opacity * 100) + '%';
  $('anno-context-hint').textContent = 'Gilt für: ' + (currentTool === 'whiteout' ? 'Überdecken-Werkzeug' : 'Markieren-Werkzeug');
  suppressApply = false;
}

/* ============================================================
   SEITEN: NAVIGATION, MINIATUREN, HINZUFÜGEN/LÖSCHEN/DREHEN
   ============================================================ */
let pageObserver = null;
function setupPageObserver() {
  if (pageObserver) pageObserver.disconnect();
  pageObserver = new IntersectionObserver((entries) => {
    let best = null;
    entries.forEach(en => { if (en.isIntersecting && (!best || en.intersectionRatio > best.intersectionRatio)) best = en; });
    if (best) {
      activePageIndex = parseInt(best.target.dataset.pageIndex, 10);
      updateStatus();
      document.querySelectorAll('.thumb').forEach(t => t.classList.toggle('active', parseInt(t.dataset.pageIndex, 10) === activePageIndex));
    }
  }, { root: viewerContainer, threshold: [0.25, 0.5, 0.75] });
  document.querySelectorAll('.page-wrapper').forEach(w => pageObserver.observe(w));
}
function currentPageIndex() { return clamp(activePageIndex, 0, Math.max(0, state.pages.length - 1)); }
function scrollToPage(i) {
  const el = pagesContainer.querySelector('.page-wrapper[data-page-index="' + i + '"]');
  if (el) el.scrollIntoView({ block: 'start', behavior: 'smooth' });
}

function renderThumbnails() {
  thumbnailsEl.innerHTML = '';
  state.pages.forEach((p, i) => {
    const t = document.createElement('div');
    t.className = 'thumb' + (i === activePageIndex ? ' active' : '');
    t.dataset.pageIndex = i;
    t.innerHTML = (i + 1) + '<div class="thumb-del" title="Seite löschen">✕</div>';
    t.addEventListener('click', (e) => {
      if (e.target.classList.contains('thumb-del')) { e.stopPropagation(); deletePageAt(i); }
      else scrollToPage(i);
    });
    thumbnailsEl.appendChild(t);
  });
}

async function deletePageAt(i) {
  if (state.pages.length <= 1) { toast('Das Dokument braucht mindestens eine Seite.', 'error'); return; }
  if (!confirm('Seite ' + (i + 1) + ' wirklich löschen?')) return;
  state.pages.splice(i, 1);
  textCache.splice(i, 1);
  clearSelection();
  await renderAllPages();
  pushHistory(); markDirty();
  toast('Seite gelöscht', 'success');
}

async function addBlankPage() {
  const insertAt = currentPageIndex() + 1;
  state.pages.splice(insertAt, 0, { sourceIndex: null, rotation: 0, edits: {}, freeTexts: [], rects: [], deleted: false, isBlank: true, size: [595.28, 841.89] });
  textCache.splice(insertAt, 0, []);
  await renderAllPages();
  pushHistory(); markDirty();
  scrollToPage(insertAt);
  toast('Neue Seite hinzugefügt', 'success');
}

async function rotateCurrentPage() {
  if (!state.pages.length) return;
  const idx = currentPageIndex();
  state.pages[idx].rotation = (state.pages[idx].rotation + 90) % 360;
  await renderAllPages();
  pushHistory(); markDirty();
  scrollToPage(idx);
}

/* ============================================================
   WERKZEUGLEISTE: WERKZEUGE, ZOOM, VOLLBILD, STYLE-PANEL
   ============================================================ */
function setTool(t) {
  currentTool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', b.dataset.tool === t ? 'true' : 'false'));
  document.querySelectorAll('.page-wrapper').forEach(w => w.dataset.tool = t);
  if (t !== 'select') clearSelection();
  syncAnnoPanelToContext();
}
document.querySelectorAll('[data-tool]').forEach(btn => {
  btn.addEventListener('click', () => {
    const t = btn.dataset.tool;
    setTool(t === 'select' ? 'select' : (currentTool === t ? 'select' : t));
  });
});

async function setZoom(v) {
  scale = clamp(Math.round(v * 100) / 100, SCALE_MIN, SCALE_MAX);
  const idx = currentPageIndex();
  await renderAllPages();
  updateStatus();
  scrollToPage(idx);
}
$('btn-zoom-in').addEventListener('click', () => setZoom(scale + SCALE_STEP));
$('btn-zoom-out').addEventListener('click', () => setZoom(scale - SCALE_STEP));

function toggleFullscreen() {
  const app = $('app');
  if (!document.fullscreenElement) {
    (app.requestFullscreen ? app.requestFullscreen() : Promise.reject()).catch(() => toast('Vollbild wird von diesem Browser nicht unterstützt.', 'error'));
  } else {
    document.exitFullscreen();
  }
}
$('btn-fullscreen').addEventListener('click', toggleFullscreen);
document.addEventListener('fullscreenchange', () => {
  $('btn-fullscreen').setAttribute('aria-pressed', document.fullscreenElement ? 'true' : 'false');
});

btnStyle.addEventListener('click', () => {
  const opening = stylePanel.classList.contains('hidden');
  stylePanel.classList.toggle('hidden', !opening);
  btnStyle.setAttribute('aria-pressed', opening ? 'true' : 'false');
});
$('btn-style-close').addEventListener('click', () => {
  stylePanel.classList.add('hidden');
  btnStyle.setAttribute('aria-pressed', 'false');
});

function setTheme(t) {
  document.body.dataset.theme = t === 'light' ? 'light' : '';
  setToggle(themeDark, t === 'dark'); setToggle(themeLight, t === 'light');
}
themeDark.addEventListener('click', () => setTheme('dark'));
themeLight.addEventListener('click', () => setTheme('light'));

/* ---- Style-Panel: Eingaben verdrahten ---- */
panelFont.addEventListener('change', () => { onPanelTextStyleChange(); markDirty(); pushHistory(); });
panelSize.addEventListener('input', () => { panelSizeVal.textContent = panelSize.value; onPanelTextStyleChange(); });
panelSize.addEventListener('change', () => { markDirty(); pushHistory(); });
panelColor.addEventListener('input', onPanelTextStyleChange);
panelColor.addEventListener('change', () => { markDirty(); pushHistory(); });
panelBg.addEventListener('input', onPanelTextStyleChange);
panelBg.addEventListener('change', () => { markDirty(); pushHistory(); });
panelBgOpacity.addEventListener('input', () => { panelBgOpacityVal.textContent = panelBgOpacity.value + '%'; onPanelTextStyleChange(); });
panelBgOpacity.addEventListener('change', () => { markDirty(); pushHistory(); });
[panelBold, panelItalic, panelUnderline].forEach(btn => {
  btn.addEventListener('click', () => { setToggle(btn, btn.getAttribute('aria-pressed') !== 'true'); onPanelTextStyleChange(); markDirty(); pushHistory(); });
});
Object.entries(alignBtns).forEach(([k, b]) => b.addEventListener('click', () => { setAlign(k); onPanelTextStyleChange(); markDirty(); pushHistory(); }));

annoColor.addEventListener('input', onPanelAnnoStyleChange);
annoColor.addEventListener('change', () => { markDirty(); pushHistory(); });
annoOpacity.addEventListener('input', () => { annoOpacityVal.textContent = annoOpacity.value + '%'; onPanelAnnoStyleChange(); });
annoOpacity.addEventListener('change', () => { markDirty(); pushHistory(); });

/* ============================================================
   PDF EXPORTIEREN (pdf-lib)
   ============================================================ */
function suggestExportName() { return fileName.replace(/\.pdf$/i, '') + '_bearbeitet.pdf'; }
function downloadBytes(bytes, name) {
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

async function exportPdf() {
  if (!state.pages.length) return;
  showLoading('PDF wird exportiert …');
  try {
    const outDoc = await PDFLib.PDFDocument.create();
    const srcDoc = originalBytes ? await PDFLib.PDFDocument.load(originalBytes.slice()) : null;
    const fontCache = {};

    async function getFont(family, bold, italic) {
      const key = family + (bold ? 'B' : '') + (italic ? 'I' : '');
      if (fontCache[key]) return fontCache[key];
      let std;
      if (family === 'TimesRoman') std = bold && italic ? PDFLib.StandardFonts.TimesRomanBoldItalic : bold ? PDFLib.StandardFonts.TimesRomanBold : italic ? PDFLib.StandardFonts.TimesRomanItalic : PDFLib.StandardFonts.TimesRoman;
      else if (family === 'Courier') std = bold && italic ? PDFLib.StandardFonts.CourierBoldOblique : bold ? PDFLib.StandardFonts.CourierBold : italic ? PDFLib.StandardFonts.CourierOblique : PDFLib.StandardFonts.Courier;
      else std = bold && italic ? PDFLib.StandardFonts.HelveticaBoldOblique : bold ? PDFLib.StandardFonts.HelveticaBold : italic ? PDFLib.StandardFonts.HelveticaOblique : PDFLib.StandardFonts.Helvetica;
      const f = await outDoc.embedFont(std);
      fontCache[key] = f;
      return f;
    }

    for (let idx = 0; idx < state.pages.length; idx++) {
      const pageModel = state.pages[idx];
      let pdfPage;
      if (pageModel.isBlank) {
        pdfPage = outDoc.addPage([pageModel.size[0], pageModel.size[1]]);
        if (pageModel.rotation) pdfPage.setRotation(PDFLib.degrees(pageModel.rotation));
      } else {
        const [copied] = await outDoc.copyPages(srcDoc, [pageModel.sourceIndex]);
        outDoc.addPage(copied);
        pdfPage = copied;
        if (pageModel.rotation) {
          const cur = pdfPage.getRotation().angle || 0;
          pdfPage.setRotation(PDFLib.degrees((cur + pageModel.rotation) % 360));
        }
      }

      const items = textCache[idx] || [];
      for (const item of items) {
        const edit = pageModel.edits[item.id];
        if (!edit || !edit.dirty) continue;
        const padX = item.pdfFontSize * 0.15;
        const estWidth = Math.max(item.pdfWidth, edit.text.length * edit.size * 0.52);
        const bgOpacity = edit.bgOpacity == null ? 1 : edit.bgOpacity;
        if (bgOpacity > 0) {
          pdfPage.drawRectangle({
            x: item.pdfX - padX, y: item.pdfY - edit.size * 0.28,
            width: estWidth + padX * 2, height: edit.size * 1.18,
            color: hexToPdfRgb(edit.bg || '#ffffff'), opacity: bgOpacity
          });
        }
        if (edit.text) {
          const font = await getFont(edit.fontFamily, edit.bold, edit.italic);
          pdfPage.drawText(edit.text, { x: item.pdfX, y: item.pdfY, size: edit.size, font, color: hexToPdfRgb(edit.color) });
          if (edit.underline) {
            pdfPage.drawLine({
              start: { x: item.pdfX, y: item.pdfY - edit.size * 0.12 },
              end: { x: item.pdfX + estWidth, y: item.pdfY - edit.size * 0.12 },
              thickness: Math.max(0.5, edit.size * 0.05), color: hexToPdfRgb(edit.color)
            });
          }
        }
      }

      for (const r of pageModel.rects) {
        pdfPage.drawRectangle({ x: r.x, y: r.y, width: r.w, height: r.h, color: hexToPdfRgb(r.color), opacity: r.opacity });
      }

      for (const ft of pageModel.freeTexts) {
        const ftBgOp = ft.style.bgOpacity == null ? 0 : ft.style.bgOpacity;
        if (ftBgOp > 0) {
          pdfPage.drawRectangle({ x: ft.x, y: ft.y, width: ft.w, height: ft.h, color: hexToPdfRgb(ft.style.bg || '#ffffff'), opacity: ftBgOp });
        }
        if (!ft.text) continue;
        const font = await getFont(ft.style.fontFamily, ft.style.bold, ft.style.italic);
        const lines = ft.text.split('\n');
        const lineH = ft.style.size * 1.25;
        let y = ft.y + ft.h - ft.style.size;
        for (const line of lines) {
          let x = ft.x;
          const w = font.widthOfTextAtSize(line, ft.style.size);
          if (ft.style.align === 'center') x = ft.x + (ft.w - w) / 2;
          else if (ft.style.align === 'right') x = ft.x + (ft.w - w);
          pdfPage.drawText(line, { x, y, size: ft.style.size, font, color: hexToPdfRgb(ft.style.color) });
          if (ft.style.underline) {
            pdfPage.drawLine({ start: { x, y: y - ft.style.size * 0.12 }, end: { x: x + w, y: y - ft.style.size * 0.12 }, thickness: Math.max(0.5, ft.style.size * 0.05), color: hexToPdfRgb(ft.style.color) });
          }
          y -= lineH;
        }
      }
    }

    const bytes = await outDoc.save();
    downloadBytes(bytes, suggestExportName());
    isDirty = false;
    updateStatus();
    toast('PDF gespeichert', 'success');
  } catch (err) {
    console.error(err);
    toast('Export fehlgeschlagen: ' + (err.message || err), 'error');
  } finally {
    hideLoading();
  }
}
$('btn-save').addEventListener('click', exportPdf);

/* ============================================================
   SEITEN-WERKZEUGE & DATEI-EVENTS VERDRAHTEN
   ============================================================ */
$('btn-add-page').addEventListener('click', addBlankPage);
$('btn-add-page-sidebar').addEventListener('click', addBlankPage);
$('btn-delete-page').addEventListener('click', () => deletePageAt(currentPageIndex()));
$('btn-rotate-page').addEventListener('click', rotateCurrentPage);
$('btn-delete-selection').addEventListener('click', deleteSelection);
$('btn-undo').addEventListener('click', undo);
$('btn-redo').addEventListener('click', redo);
$('btn-open').addEventListener('click', openFileDialog);
dropzone.addEventListener('click', openFileDialog);

fileInput.addEventListener('change', (e) => {
  const f = e.target.files[0];
  fileInput.value = '';
  if (f) loadPdfFile(f);
});

viewerContainer.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('drag-over'); });
viewerContainer.addEventListener('dragleave', () => dropzone.classList.remove('drag-over'));
viewerContainer.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  const f = e.dataTransfer.files && e.dataTransfer.files[0];
  if (f) confirmReplaceIfNeeded(() => loadPdfFile(f));
});
viewerContainer.addEventListener('mousedown', (e) => {
  if ((e.target === viewerContainer || e.target === pagesContainer) && currentTool === 'select') clearSelection();
});

/* ============================================================
   TASTATURKÜRZEL
   ============================================================ */
document.addEventListener('keydown', (e) => {
  const editing = document.activeElement && document.activeElement.isContentEditable;
  const mod = e.ctrlKey || e.metaKey;

  if (mod && !e.shiftKey && e.key.toLowerCase() === 's') { e.preventDefault(); if (!$('btn-save').disabled) exportPdf(); }
  else if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); openFileDialog(); }
  else if (mod && !e.shiftKey && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) { e.preventDefault(); redo(); }
  else if (e.key === 'Escape') {
    if (editing) document.activeElement.blur();
    else if (currentTool !== 'select') setTool('select');
    else if (selection) clearSelection();
    else if (document.fullscreenElement) document.exitFullscreen();
  }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && !editing && selection && selection.kind !== 'text') {
    e.preventDefault(); deleteSelection();
  }
});

window.addEventListener('beforeunload', (e) => {
  if (isDirty) { e.preventDefault(); e.returnValue = ''; }
});

/* ============================================================
   INITIALISIERUNG
   ============================================================ */
setTool('select');
syncAnnoPanelToContext();
updateUndoRedoButtons();
updateStatus();
