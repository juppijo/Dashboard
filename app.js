/* ══════════════════════════════════════════
   DASHBOARD · app.js
   ══════════════════════════════════════════ */

'use strict';

/* ─────────────────────────────────────────
   CONFIG
───────────────────────────────────────── */
const CFG_KEY = 'db_cfg_v1';
let cfg = { interval: 5, cityId: '2792119', apiKey: '' };

function loadCfg() {
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch (e) {}
}
function saveCfg() {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

/* ─────────────────────────────────────────
   THEMES & MODE
───────────────────────────────────────── */
const THEMES = ['cosmos', 'dawn', 'forest', 'arctic', 'ember'];
let themeIdx = 0;

function applyAppearance() {
  document.documentElement.setAttribute('data-theme', THEMES[themeIdx]);
  document.documentElement.setAttribute('data-mode', cfg.mode || 'dark');
  document.getElementById('btnMode').textContent = (cfg.mode === 'dark') ? '☀' : '☾';
}

document.getElementById('btnTheme').addEventListener('click', function () {
  themeIdx = (themeIdx + 1) % THEMES.length;
  cfg.theme = THEMES[themeIdx];
  saveCfg();
  applyAppearance();
});

document.getElementById('btnMode').addEventListener('click', function () {
  cfg.mode = (cfg.mode === 'dark') ? 'light' : 'dark';
  saveCfg();
  applyAppearance();
});

/* ─────────────────────────────────────────
   FULLSCREEN
───────────────────────────────────────── */
document.getElementById('btnFullscreen').addEventListener('click', function () {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(function () {});
  } else {
    document.exitFullscreen();
  }
});
document.addEventListener('fullscreenchange', function () {
  document.getElementById('btnFullscreen').textContent = document.fullscreenElement ? '✕' : '⛶';
});

/* ─────────────────────────────────────────
   SETTINGS MODAL
───────────────────────────────────────── */
var overlay = document.getElementById('overlay');
var modal   = document.getElementById('settingsModal');

function openModal() {
  document.getElementById('cfgInterval').value = cfg.interval;
  document.getElementById('cfgCityId').value   = cfg.cityId;
  document.getElementById('cfgApiKey').value   = cfg.apiKey;
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
}
function closeModal() {
  overlay.classList.add('hidden');
  modal.classList.add('hidden');
}

document.getElementById('btnSettings').addEventListener('click', openModal);
document.getElementById('cfgClose').addEventListener('click', closeModal);
overlay.addEventListener('click', closeModal);

document.getElementById('cfgSave').addEventListener('click', function () {
  cfg.interval = Math.max(1, parseInt(document.getElementById('cfgInterval').value) || 5);
  cfg.cityId   = document.getElementById('cfgCityId').value.trim() || '2792119';
  cfg.apiKey   = document.getElementById('cfgApiKey').value.trim();
  saveCfg();
  closeModal();
  resetSlideTimer();
  if (cfg.apiKey) fetchSunTimes();
});

document.getElementById('cfgResetLayout').addEventListener('click', function () {
  if (confirm('Layout auf Standard zurücksetzen?')) {
    localStorage.removeItem(LAYOUT_KEY);
    closeModal();
    location.reload();
  }
});

/* ─────────────────────────────────────────
   LAYOUT — drag & resize
   Cards are absolutely positioned inside #grid.
   Layout is persisted in localStorage.
───────────────────────────────────────── */
const LAYOUT_KEY = 'db_layout_v1';

/* Default positions (designed for ~1280 px viewport).
   x/y = left/top in px inside #grid  |  w/h = width/height in px  */
const DEFAULT_LAYOUT = {
  cardClock:   { x: 0,   y: 0,   w: 260, h: 300 },
  cardWeather: { x: 276, y: 0,   w: 656, h: 300 },
  cardSlide:   { x: 948, y: 0,   w: 300, h: 632 },
  cardCal:     { x: 0,   y: 316, w: 932, h: 300 },
  Gkeep:       { x: 948, y: 316, w: 300, h: 150 },
  cardTasks:   { x: 0,   y: 632, w: 260, h: 250 },
  cardNotes:   { x: 276, y: 632, w: 420, h: 250 },
  cardInfo:    { x: 712, y: 632, w: 220, h: 250 },
};

let layout = {};

function loadLayout() {
  try {
    var saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    // start from defaults, overlay saved values
    Object.keys(DEFAULT_LAYOUT).forEach(function (id) {
      layout[id] = Object.assign({}, DEFAULT_LAYOUT[id], saved[id] || {});
    });
  } catch (e) {
    Object.keys(DEFAULT_LAYOUT).forEach(function (id) {
      layout[id] = Object.assign({}, DEFAULT_LAYOUT[id]);
    });
  }
}

function saveLayout() {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

function applyLayout() {
  Object.keys(layout).forEach(function (id) {
    var el = document.getElementById(id);
    if (!el) return;
    var p = layout[id];
    el.style.left   = p.x + 'px';
    el.style.top    = p.y + 'px';
    el.style.width  = p.w + 'px';
    el.style.height = p.h + 'px';
  });
}

/* ── Drag via card-label ── */
function initDrag(card, id) {
  var label = card.querySelector('.card-label');
  if (!label) return;

  label.addEventListener('mousedown', function (e) {
    // ignore clicks on buttons inside the label
    if (e.target.closest('button')) return;
    e.preventDefault();

    var startX = e.clientX - layout[id].x;
    var startY = e.clientY - layout[id].y;

    card.style.zIndex = '50';
    card.classList.add('dragging');

    function onMove(e) {
      layout[id].x = Math.max(0, e.clientX - startX);
      layout[id].y = Math.max(0, e.clientY - startY);
      card.style.left = layout[id].x + 'px';
      card.style.top  = layout[id].y + 'px';
    }

    function onUp() {
      card.style.zIndex = '';
      card.classList.remove('dragging');
      saveLayout();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  /* Touch support for drag */
  label.addEventListener('touchstart', function (e) {
    if (e.target.closest('button')) return;
    var t0 = e.touches[0];
    var startX = t0.clientX - layout[id].x;
    var startY = t0.clientY - layout[id].y;
    card.style.zIndex = '50';
    card.classList.add('dragging');

    function onMove(e) {
      var t = e.touches[0];
      layout[id].x = Math.max(0, t.clientX - startX);
      layout[id].y = Math.max(0, t.clientY - startY);
      card.style.left = layout[id].x + 'px';
      card.style.top  = layout[id].y + 'px';
    }
    function onEnd() {
      card.style.zIndex = '';
      card.classList.remove('dragging');
      saveLayout();
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, { passive: true });
}

/* ── Resize via .resize-handle ── */
function initResize(card, id) {
  var handle = card.querySelector('.resize-handle');
  if (!handle) return;

  var MIN_W = 180, MIN_H = 130;

  handle.addEventListener('mousedown', function (e) {
    e.preventDefault();
    e.stopPropagation();

    var startX = e.clientX, startY = e.clientY;
    var startW = layout[id].w, startH = layout[id].h;

    card.style.zIndex = '50';
    card.style.transition = 'none';

    function onMove(e) {
      layout[id].w = Math.max(MIN_W, startW + (e.clientX - startX));
      layout[id].h = Math.max(MIN_H, startH + (e.clientY - startY));
      card.style.width  = layout[id].w + 'px';
      card.style.height = layout[id].h + 'px';
    }
    function onUp() {
      card.style.zIndex = '';
      card.style.transition = '';
      saveLayout();
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  /* Touch support for resize */
  handle.addEventListener('touchstart', function (e) {
    e.stopPropagation();
    var t0 = e.touches[0];
    var startX = t0.clientX, startY = t0.clientY;
    var startW = layout[id].w, startH = layout[id].h;
    card.style.zIndex = '50';
    card.style.transition = 'none';

    function onMove(e) {
      var t = e.touches[0];
      layout[id].w = Math.max(MIN_W, startW + (t.clientX - startX));
      layout[id].h = Math.max(MIN_H, startH + (t.clientY - startY));
      card.style.width  = layout[id].w + 'px';
      card.style.height = layout[id].h + 'px';
    }
    function onEnd() {
      card.style.zIndex = '';
      card.style.transition = '';
      saveLayout();
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }, { passive: true });
}

function initDragResize() {
  Object.keys(layout).forEach(function (id) {
    var card = document.getElementById(id);
    if (!card) return;
    initDrag(card, id);
    initResize(card, id);
  });
}

/* ─────────────────────────────────────────
   UHR — Analog (Canvas) + Digital
───────────────────────────────────────── */
var canvas = document.getElementById('analogClock');
var ctx    = canvas.getContext('2d');
var CX = canvas.width / 2, CY = canvas.height / 2, CR = CX;

function drawClock() {
  var now  = new Date();
  var sec  = now.getSeconds() + now.getMilliseconds() / 1000;
  var min  = now.getMinutes() + sec / 60;
  var hour = (now.getHours() % 12) + min / 60;

  var cs      = getComputedStyle(document.documentElement);
  var accent  = cs.getPropertyValue('--ac').trim();
  var text    = cs.getPropertyValue('--tx').trim();
  var border  = cs.getPropertyValue('--bd').trim();
  var surface = cs.getPropertyValue('--sf').trim();

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Face
  ctx.beginPath();
  ctx.arc(CX, CY, CR - 3, 0, Math.PI * 2);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Ticks
  for (var i = 0; i < 12; i++) {
    var a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    var big = i % 3 === 0;
    ctx.beginPath();
    ctx.moveTo(CX + Math.cos(a) * (CR - (big ? 18 : 12)), CY + Math.sin(a) * (CR - (big ? 18 : 12)));
    ctx.lineTo(CX + Math.cos(a) * (CR - 6),               CY + Math.sin(a) * (CR - 6));
    ctx.strokeStyle = big ? accent : border;
    ctx.lineWidth   = big ? 2 : 1;
    ctx.stroke();
  }

  // Hour hand
  hand(ctx, CX, CY, (hour / 12) * Math.PI * 2 - Math.PI / 2, CR * 0.47, 3.5, text);
  // Minute hand
  hand(ctx, CX, CY, (min  / 60) * Math.PI * 2 - Math.PI / 2, CR * 0.63, 2.5, text);
  // Second hand
  hand(ctx, CX, CY, (sec  / 60) * Math.PI * 2 - Math.PI / 2, CR * 0.70, 1.2, accent);

  // Center dot
  ctx.beginPath();
  ctx.arc(CX, CY, 4, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
}

function hand(ctx, cx, cy, angle, len, width, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
  ctx.strokeStyle = color;
  ctx.lineWidth   = width;
  ctx.lineCap     = 'round';
  ctx.stroke();
}

function updateDigital() {
  var now = new Date();
  var h = String(now.getHours()).padStart(2, '0');
  var m = String(now.getMinutes()).padStart(2, '0');
  var s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('digitalClock').textContent = h + ':' + m + ':' + s;
}

function updateDate() {
  var now  = new Date();
  var opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent = now.toLocaleDateString('de-DE', opts);
}

function updateInfo() {
  var now   = new Date();
  // Kalenderwoche
  var d     = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  var yw    = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  var kw    = Math.ceil((((d - yw) / 86400000) + 1) / 7);
  // Tag des Jahres
  var start = new Date(now.getFullYear(), 0, 0);
  var doy   = Math.floor((now - start) / 86400000);

  document.getElementById('iKW').textContent  = kw;
  document.getElementById('iDOY').textContent = doy + ' / 365';
}

function clockTick() {
  drawClock();
  updateDigital();
  updateDate();
  updateInfo();
}
setInterval(clockTick, 100);
clockTick();

/* ─────────────────────────────────────────
   SUNRISE / SUNSET  (OpenWeather API)
───────────────────────────────────────── */
function fetchSunTimes() {
  if (!cfg.apiKey) return;
  fetch('https://api.openweathermap.org/data/2.5/weather?id=' + cfg.cityId + '&appid=' + cfg.apiKey)
    .then(function (r) { return r.json(); })
    .then(function (d) {
      if (d.sys) {
        document.getElementById('iRise').textContent =
          new Date(d.sys.sunrise * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('iSet').textContent =
          new Date(d.sys.sunset  * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
      }
    })
    .catch(function () {});
}
setInterval(fetchSunTimes, 600000); // alle 10 Min

/* ─────────────────────────────────────────
   DIASCHAU
───────────────────────────────────────── */
var slides      = [];
var slideIdx    = 0;
var slidePlaying= false;
var slideTimer  = null;

var slideImg  = document.getElementById('slideImg');
var slideCap  = document.getElementById('slideCap');
var sCnt      = document.getElementById('sCnt');
var slideArea = document.getElementById('slideArea');
var slideEmpty= document.getElementById('slideEmpty');

// Gespeicherte Slides laden
try {
  var saved = JSON.parse(localStorage.getItem('db_slides') || '[]');
  slides = saved;
} catch (e) { slides = []; }

function saveSlides() {
  var toSave = slides.slice(-30).map(function (s) {
    return { name: s.name, url: s.url.substring(0, 300000) };
  });
  try { localStorage.setItem('db_slides', JSON.stringify(toSave)); } catch (err) {}
}

function showSlide(idx) {
  if (slides.length === 0) {
    document.getElementById('slideFrame').style.display = 'none';
    slideEmpty.style.display = 'block';
    sCnt.textContent = '0 / 0';
    return;
  }
  document.getElementById('slideFrame').style.display = 'flex';
  slideEmpty.style.display = 'none';
  slideArea.style.display = 'flex';
  slideIdx = ((idx % slides.length) + slides.length) % slides.length;
  slideImg.style.opacity = '0';
  setTimeout(function () {
    slideImg.src = slides[slideIdx].url;
    slideCap.textContent = slides[slideIdx].name;
    slideImg.style.opacity = '1';
  }, 300);
  sCnt.textContent = (slideIdx + 1) + ' / ' + slides.length;
}

function resetSlideTimer() {
  clearInterval(slideTimer);
  if (slidePlaying && slides.length > 1) {
    slideTimer = setInterval(function () { showSlide(slideIdx + 1); }, cfg.interval * 1000);
  }
}

document.getElementById('sPrev').addEventListener('click', function () { showSlide(slideIdx - 1); });
document.getElementById('sNext').addEventListener('click', function () { showSlide(slideIdx + 1); });

document.getElementById('sPlay').addEventListener('click', function () {
  slidePlaying = !slidePlaying;
  this.innerHTML = slidePlaying ? '&#9646;&#9646;' : '&#9654;';
  resetSlideTimer();
});

/* ── Bild löschen ── */
document.getElementById('sDel').addEventListener('click', function () {
  if (slides.length === 0) return;
  var name = slides[slideIdx].name;
  if (!confirm('Bild löschen: ' + name + '?')) return;
  slides.splice(slideIdx, 1);
  saveSlides();
  showSlide(Math.min(slideIdx, slides.length - 1));
  resetSlideTimer();
});

document.getElementById('sInput').addEventListener('change', function (e) {
  var files = Array.from(e.target.files);
  var count = 0;
  files.forEach(function (file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      slides.push({ name: file.name, url: ev.target.result });
      count++;
      if (count === files.length) {
        saveSlides();
        showSlide(slides.length - 1);
        resetSlideTimer();
      }
    };
    reader.readAsDataURL(file);
  });
  e.target.value = '';
});

// Keyboard
document.addEventListener('keydown', function (e) {
  if (e.target.matches('input, textarea')) return;
  if (e.key === 'ArrowRight') showSlide(slideIdx + 1);
  if (e.key === 'ArrowLeft')  showSlide(slideIdx - 1);
  if (e.key === 'Delete' && slides.length > 0) {
    var name = slides[slideIdx].name;
    if (confirm('Bild löschen: ' + name + '?')) {
      slides.splice(slideIdx, 1);
      saveSlides();
      showSlide(Math.min(slideIdx, slides.length - 1));
      resetSlideTimer();
    }
  }
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(function () {});
    else document.exitFullscreen();
  }
});

showSlide(0);

/* ─────────────────────────────────────────
   AUFGABEN  (localStorage)
───────────────────────────────────────── */
var tasks = [];
try { tasks = JSON.parse(localStorage.getItem('db_tasks') || '[]'); } catch (e) {}

function saveTasks() { localStorage.setItem('db_tasks', JSON.stringify(tasks)); }

function renderTasks() {
  var list = document.getElementById('taskList');
  list.innerHTML = '';
  tasks.forEach(function (t, i) {
    var div = document.createElement('div');
    div.className = 'titem' + (t.done ? ' done' : '');
    div.innerHTML =
      '<input type="checkbox" class="tchk"' + (t.done ? ' checked' : '') + ' data-i="' + i + '" />' +
      '<span class="ttitle">' + esc(t.title) + '</span>' +
      '<button class="tdel" data-i="' + i + '">✕</button>';
    list.appendChild(div);
  });
  list.querySelectorAll('.tchk').forEach(function (cb) {
    cb.addEventListener('change', function () {
      tasks[this.dataset.i].done = this.checked;
      saveTasks(); renderTasks();
    });
  });
  list.querySelectorAll('.tdel').forEach(function (btn) {
    btn.addEventListener('click', function () {
      tasks.splice(this.dataset.i, 1);
      saveTasks(); renderTasks();
    });
  });
}

function addTask() {
  var inp = document.getElementById('taskInput');
  var val = inp.value.trim();
  if (!val) return;
  tasks.unshift({ title: val, done: false });
  inp.value = '';
  saveTasks(); renderTasks();
}

document.getElementById('taskAdd').addEventListener('click', addTask);
document.getElementById('taskInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') addTask();
});

renderTasks();

/* ─────────────────────────────────────────
   NOTIZEN  (localStorage)
───────────────────────────────────────── */
var notes = [];
try { notes = JSON.parse(localStorage.getItem('db_notes') || '[]'); } catch (e) {}

function saveNotes() { localStorage.setItem('db_notes', JSON.stringify(notes)); }

function renderNotes() {
  var grid = document.getElementById('noteGrid');
  grid.innerHTML = '';
  notes.forEach(function (n, i) {
    var card = document.createElement('div');
    card.className = 'ncard';
    card.innerHTML =
      '<button class="ndel" data-i="' + i + '">✕</button>' +
      '<textarea class="ntxt" data-i="' + i + '" placeholder="Notiz…">' + esc(n.text) + '</textarea>' +
      '<div class="ndate">' + n.date + '</div>';
    grid.appendChild(card);
  });
  grid.querySelectorAll('.ndel').forEach(function (btn) {
    btn.addEventListener('click', function () {
      notes.splice(this.dataset.i, 1);
      saveNotes(); renderNotes();
    });
  });
  grid.querySelectorAll('.ntxt').forEach(function (ta) {
    ta.addEventListener('input', function () {
      notes[this.dataset.i].text = this.value;
      saveNotes();
    });
  });
}

document.getElementById('btnAddNote').addEventListener('click', function () {
  notes.unshift({ text: '', date: new Date().toLocaleDateString('de-DE') });
  saveNotes(); renderNotes();
  setTimeout(function () {
    var first = document.querySelector('.ntxt');
    if (first) first.focus();
  }, 50);
});

renderNotes();

/* ─────────────────────────────────────────
   CUSTOM CARDS  (user-created link/embed cards)
───────────────────────────────────────── */
const CC_KEY = 'db_custom_cards_v1';
var customCards = [];

try { customCards = JSON.parse(localStorage.getItem(CC_KEY) || '[]'); } catch(e) {}

function saveCustomCards() {
  localStorage.setItem(CC_KEY, JSON.stringify(customCards));
}

/* Build DOM for one custom card and mount it into #grid */
function mountCustomCard(card) {
  var grid = document.getElementById('grid');
  var el = document.createElement('article');
  el.className = 'card';
  el.id = card.id;

  /* Label with delete button */
  var labelHtml =
    '<div class="card-label">' + esc(card.title) +
    '<button class="cc-del-btn" data-ccid="' + card.id + '" title="Karte löschen">✕</button>' +
    '</div>';

  var contentHtml = '';

  if (card.type === 'link') {
    contentHtml =
      '<div class="cc-link-wrap">' +
      '<a class="cc-link-btn" href="' + esc(card.url) + '" target="_blank" rel="noopener">🔗 ' + esc(card.title) + ' ↗</a>' +
      '</div>';
  } else if (card.type === 'embed') {
    contentHtml = '<iframe class="cc-frame" src="' + esc(card.url) + '" loading="lazy" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups"></iframe>';
  } else {
    /* both */
    contentHtml =
      '<div class="cc-link-wrap" style="padding:.4rem 0 .5rem">' +
      '<a class="cc-link-btn" href="' + esc(card.url) + '" target="_blank" rel="noopener">🔗 In neuem Tab ↗</a>' +
      '</div>' +
      '<iframe class="cc-frame" src="' + esc(card.url) + '" loading="lazy" allowfullscreen sandbox="allow-scripts allow-same-origin allow-forms allow-popups" style="height:calc(100% - 3.8rem)"></iframe>';
  }

  el.innerHTML = labelHtml + contentHtml + '<div class="resize-handle" data-id="' + card.id + '"></div>';
  grid.appendChild(el);

  /* Wire delete button */
  el.querySelector('.cc-del-btn').addEventListener('click', function() {
    var ccid = this.dataset.ccid;
    if (!confirm('Karte "' + card.title + '" löschen?')) return;
    customCards = customCards.filter(function(c){ return c.id !== ccid; });
    saveCustomCards();
    /* remove from layout */
    delete layout[ccid];
    saveLayout();
    el.remove();
  });

  /* Apply saved or default position */
  if (!layout[card.id]) {
    /* place in a free spot: offset each new card slightly */
    var offset = Object.keys(layout).length * 16;
    layout[card.id] = { x: 80 + offset, y: 80 + offset, w: 340, h: 260 };
    saveLayout();
  }
  var p = layout[card.id];
  el.style.left   = p.x + 'px';
  el.style.top    = p.y + 'px';
  el.style.width  = p.w + 'px';
  el.style.height = p.h + 'px';

  /* Enable drag + resize */
  initDrag(el, card.id);
  initResize(el, card.id);
}

/* Restore persisted custom cards on load */
function restoreCustomCards() {
  customCards.forEach(function(c) { mountCustomCard(c); });
}

/* ── Modal logic ── */
var cardModal = document.getElementById('cardModal');

document.getElementById('btnAddCard').addEventListener('click', function() {
  document.getElementById('ccTitle').value = '';
  document.getElementById('ccUrl').value   = '';
  document.getElementById('ccType').value  = 'link';
  document.getElementById('ccEmbedHint').style.display = 'none';
  overlay.classList.remove('hidden');
  cardModal.classList.remove('hidden');
  document.getElementById('ccTitle').focus();
});

document.getElementById('ccType').addEventListener('change', function() {
  var hint = document.getElementById('ccEmbedHint');
  hint.style.display = (this.value === 'embed' || this.value === 'both') ? 'block' : 'none';
});

document.getElementById('ccClose').addEventListener('click', function() {
  overlay.classList.add('hidden');
  cardModal.classList.add('hidden');
});

document.getElementById('ccSave').addEventListener('click', function() {
  var title = document.getElementById('ccTitle').value.trim();
  var url   = document.getElementById('ccUrl').value.trim();
  var type  = document.getElementById('ccType').value;

  if (!title) { document.getElementById('ccTitle').focus(); return; }
  if (!url)   { document.getElementById('ccUrl').focus();   return; }

  /* Ensure URL has protocol */
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;

  var newCard = {
    id:    'cc_' + Date.now(),
    title: title,
    url:   url,
    type:  type
  };

  customCards.push(newCard);
  saveCustomCards();
  mountCustomCard(newCard);

  overlay.classList.add('hidden');
  cardModal.classList.add('hidden');
});

/* close modal on overlay click (shared overlay) — re-wire to handle both modals */
overlay.removeEventListener('click', closeModal);
overlay.addEventListener('click', function() {
  closeModal();
  overlay.classList.add('hidden');
  cardModal.classList.add('hidden');
});

/* ─────────────────────────────────────────
   HELPER
───────────────────────────────────────── */
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/* ─────────────────────────────────────────
   INIT
───────────────────────────────────────── */
loadCfg();
themeIdx = Math.max(0, THEMES.indexOf(cfg.theme || 'cosmos'));
applyAppearance();
fetchSunTimes();

// Layout muss nach applyAppearance laufen
loadLayout();
applyLayout();
initDragResize();

// Custom cards nach Layout init
restoreCustomCards();
