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

// Gespeicherte Slides laden (nur Metadaten + kleine Thumbnails)
try {
  var saved = JSON.parse(localStorage.getItem('db_slides') || '[]');
  slides = saved;
} catch (e) { slides = []; }

function showSlide(idx) {
  if (slides.length === 0) {
    // Bar bleibt sichtbar, nur Bild-Frame ausblenden
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

document.getElementById('sInput').addEventListener('change', function (e) {
  var files = Array.from(e.target.files);
  var count = 0;
  files.forEach(function (file) {
    var reader = new FileReader();
    reader.onload = function (ev) {
      slides.push({ name: file.name, url: ev.target.result });
      count++;
      if (count === files.length) {
        // Speichere max. 30 Slides; kürze DataURL auf 300 KB pro Bild
        var toSave = slides.slice(-30).map(function (s) {
          return { name: s.name, url: s.url.substring(0, 300000) };
        });
        try { localStorage.setItem('db_slides', JSON.stringify(toSave)); } catch (err) {}
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
