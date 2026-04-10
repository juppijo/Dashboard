/* ═══════════════════════════════════════════════
   DASHBOARD — app.js
   ═══════════════════════════════════════════════ */

'use strict';

// ══════════════════════════════════════════════
// CONFIG  (geladen aus localStorage)
// ══════════════════════════════════════════════
const CFG_KEY = 'dashboardConfig';
let cfg = {
  weatherKey:     '',
  weatherCity:    'Welkenraedt,BE',
  googleClientId: '',
  slideInterval:  5,
  theme:          'cosmos',
  mode:           'dark',
};

function loadCfg() {
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(CFG_KEY) || '{}')); } catch {}
}
function saveCfg() {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

// ══════════════════════════════════════════════
// THEME & MODE
// ══════════════════════════════════════════════
const THEMES = ['cosmos', 'dawn', 'forest', 'arctic', 'ember'];
let themeIdx = 0;

function applyTheme() {
  document.documentElement.setAttribute('data-theme', cfg.theme);
  document.documentElement.setAttribute('data-mode',  cfg.mode);
  const btn = document.getElementById('btnMode');
  btn.textContent = cfg.mode === 'dark' ? '☀' : '☾';
}

document.getElementById('btnTheme').addEventListener('click', () => {
  themeIdx = (themeIdx + 1) % THEMES.length;
  cfg.theme = THEMES[themeIdx];
  saveCfg(); applyTheme();
});
document.getElementById('btnMode').addEventListener('click', () => {
  cfg.mode = cfg.mode === 'dark' ? 'light' : 'dark';
  saveCfg(); applyTheme();
});

// ══════════════════════════════════════════════
// FULLSCREEN
// ══════════════════════════════════════════════
document.getElementById('btnFullscreen').addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => {});
    document.getElementById('btnFullscreen').textContent = '⛶';
  } else {
    document.exitFullscreen();
    document.getElementById('btnFullscreen').textContent = '⛶';
  }
});
document.addEventListener('fullscreenchange', () => {
  document.getElementById('btnFullscreen').textContent = document.fullscreenElement ? '✕' : '⛶';
});

// ══════════════════════════════════════════════
// SETTINGS MODAL
// ══════════════════════════════════════════════
const modal        = document.getElementById('settingsModal');
const overlay      = document.getElementById('modalOverlay');
const cfgWeatherKey  = document.getElementById('cfgWeatherKey');
const cfgWeatherCity = document.getElementById('cfgWeatherCity');
const cfgGClientId   = document.getElementById('cfgGoogleClientId');
const cfgSlideInt    = document.getElementById('cfgSlideInterval');

function openSettings() {
  cfgWeatherKey.value   = cfg.weatherKey;
  cfgWeatherCity.value  = cfg.weatherCity;
  cfgGClientId.value    = cfg.googleClientId;
  cfgSlideInt.value     = cfg.slideInterval;
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
}
function closeSettings() {
  modal.classList.add('hidden');
  overlay.classList.add('hidden');
}

document.getElementById('btnSettings').addEventListener('click', openSettings);
document.getElementById('btnSettingsClose').addEventListener('click', closeSettings);
overlay.addEventListener('click', closeSettings);

document.getElementById('btnSettingsSave').addEventListener('click', () => {
  cfg.weatherKey    = cfgWeatherKey.value.trim();
  cfg.weatherCity   = cfgWeatherCity.value.trim() || 'Welkenraedt,BE';
  cfg.googleClientId = cfgGClientId.value.trim();
  cfg.slideInterval  = parseInt(cfgSlideInt.value) || 5;
  saveCfg();
  closeSettings();
  initWeather();
  initSlideAuto();
  if (cfg.googleClientId) loadGoogleApi();
});

// ══════════════════════════════════════════════
// CLOCK — ANALOG + DIGITAL
// ══════════════════════════════════════════════
const canvas = document.getElementById('analogClock');
const ctx    = canvas.getContext('2d');
const W = canvas.width, H = canvas.height, R = W / 2;

function drawClock() {
  const now = new Date();
  const s = now.getSeconds() + now.getMilliseconds() / 1000;
  const m = now.getMinutes() + s / 60;
  const h = (now.getHours() % 12) + m / 60;

  // Get CSS colors
  const cs = getComputedStyle(document.documentElement);
  const accent   = cs.getPropertyValue('--accent').trim();
  const text     = cs.getPropertyValue('--text').trim();
  const textDim  = cs.getPropertyValue('--text-dim').trim();
  const surface  = cs.getPropertyValue('--surface').trim();
  const border   = cs.getPropertyValue('--border').trim();

  ctx.clearRect(0, 0, W, H);

  // Face
  ctx.beginPath();
  ctx.arc(R, R, R - 4, 0, Math.PI * 2);
  ctx.fillStyle = surface;
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Hour ticks
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const outer = R - 8;
    const inner = i % 3 === 0 ? R - 20 : R - 14;
    ctx.beginPath();
    ctx.moveTo(R + Math.cos(angle) * inner, R + Math.sin(angle) * inner);
    ctx.lineTo(R + Math.cos(angle) * outer, R + Math.sin(angle) * outer);
    ctx.strokeStyle = i % 3 === 0 ? accent : border;
    ctx.lineWidth = i % 3 === 0 ? 2 : 1;
    ctx.stroke();
  }

  // Hour hand
  drawHand(ctx, R, (h / 12) * Math.PI * 2 - Math.PI / 2, R * 0.48, 3.5, text);
  // Minute hand
  drawHand(ctx, R, (m / 60) * Math.PI * 2 - Math.PI / 2, R * 0.64, 2.5, text);
  // Second hand
  drawHand(ctx, R, (s / 60) * Math.PI * 2 - Math.PI / 2, R * 0.70, 1.2, accent);

  // Center dot
  ctx.beginPath();
  ctx.arc(R, R, 4, 0, Math.PI * 2);
  ctx.fillStyle = accent;
  ctx.fill();
}

function drawHand(ctx, cx, angle, length, width, color) {
  ctx.beginPath();
  ctx.moveTo(cx, cx);
  ctx.lineTo(cx + Math.cos(angle) * length, cx + Math.sin(angle) * length);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.stroke();
}

function updateDigitalClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('digitalClock').textContent = `${h}:${m}:${s}`;
}

function updateDateDisplay() {
  const now = new Date();
  const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dateDisplay').textContent =
    now.toLocaleDateString('de-DE', opts);
}

function updateMiniInfo() {
  const now  = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff  = now - start;
  const day   = Math.floor(diff / 86400000);
  // KW
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yw = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const kw = Math.ceil((((d - yw) / 86400000) + 1) / 7);
  document.getElementById('miniWeek').textContent = kw;
  document.getElementById('miniDayOfYear').textContent = `${day} / 365`;
}

function clockTick() {
  drawClock(); updateDigitalClock(); updateDateDisplay(); updateMiniInfo();
}
setInterval(clockTick, 100);
clockTick();

// ══════════════════════════════════════════════
// WEATHER — OpenWeather API
// ══════════════════════════════════════════════
const WX_ICONS = {
  '01d':'☀️','01n':'🌙','02d':'⛅','02n':'⛅',
  '03d':'☁️','03n':'☁️','04d':'☁️','04n':'☁️',
  '09d':'🌧','09n':'🌧','10d':'🌦','10n':'🌦',
  '11d':'⛈','11n':'⛈','13d':'❄️','13n':'❄️',
  '50d':'🌫','50n':'🌫',
};

async function initWeather() {
  if (!cfg.weatherKey) return;
  const div = document.getElementById('weatherContent');
  div.innerHTML = '<div class="placeholder-msg">Lade…</div>';
  try {
    const [cur, fore] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cfg.weatherCity)}&appid=${cfg.weatherKey}&units=metric&lang=de`).then(r => r.json()),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(cfg.weatherCity)}&appid=${cfg.weatherKey}&units=metric&lang=de`).then(r => r.json()),
    ]);
    if (cur.cod !== 200) { div.innerHTML = `<div class="placeholder-msg">Fehler: ${cur.message}</div>`; return; }
    renderWeather(div, cur, fore);
    // Sunrise/Sunset
    document.getElementById('miniSunrise').textContent = new Date(cur.sys.sunrise*1000).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
    document.getElementById('miniSunset').textContent  = new Date(cur.sys.sunset*1000).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'});
  } catch(e) {
    div.innerHTML = `<div class="placeholder-msg">Netzwerkfehler: ${e.message}</div>`;
  }
}

function renderWeather(div, cur, fore) {
  const ico = WX_ICONS[cur.weather[0].icon] || '🌡';
  const temp = Math.round(cur.main.temp);
  const feels = Math.round(cur.main.feels_like);
  const wind  = Math.round(cur.wind.speed * 3.6);

  // 3-day forecast (one entry per day at noon)
  const days = {};
  fore.list.forEach(item => {
    const d = new Date(item.dt * 1000);
    const key = d.toLocaleDateString('de-DE', { weekday: 'short' });
    const h = d.getHours();
    if (h >= 11 && h <= 13 && !days[key]) days[key] = item;
    else if (!days[key]) days[key] = item;
  });
  const fcDays = Object.entries(days).slice(1, 4);

  div.innerHTML = `
    <div class="weather-city">${cur.name.toUpperCase()}, ${cur.sys.country}</div>
    <div class="weather-main">
      <div class="weather-icon">${ico}</div>
      <div>
        <div class="weather-temp">${temp}<sup>°C</sup></div>
        <div class="weather-desc">${cur.weather[0].description}</div>
      </div>
    </div>
    <div class="weather-details">
      <div class="wdetail"><span class="wdetail-label">Gefühlt</span><span class="wdetail-val">${feels}°</span></div>
      <div class="wdetail"><span class="wdetail-label">Feuchte</span><span class="wdetail-val">${cur.main.humidity}%</span></div>
      <div class="wdetail"><span class="wdetail-label">Wind</span><span class="wdetail-val">${wind} km/h</span></div>
      <div class="wdetail"><span class="wdetail-label">Druck</span><span class="wdetail-val">${cur.main.pressure} hPa</span></div>
    </div>
    <div class="weather-forecast">
      ${fcDays.map(([day, item]) => `
        <div class="fc-day">
          <div class="fc-day-name">${day}</div>
          <div class="fc-day-icon">${WX_ICONS[item.weather[0].icon] || '🌡'}</div>
          <div class="fc-day-temp">${Math.round(item.main.temp)}°</div>
        </div>
      `).join('')}
    </div>`;
}

// Wetter alle 10 Minuten aktualisieren
setInterval(initWeather, 600_000);

// ══════════════════════════════════════════════
// SLIDESHOW
// ══════════════════════════════════════════════
let slides = JSON.parse(localStorage.getItem('dashSlides') || '[]');
// slides = [{name, dataUrl}]
let slideIdx  = 0;
let slideTimer = null;
let slidePlaying = false;

const slideImg     = document.getElementById('slideImg');
const slideCaption = document.getElementById('slideCaption');
const slideCounter = document.getElementById('slideCounter');
const slideEmpty   = document.getElementById('slideEmpty');
const slideshowDiv = document.getElementById('slideshow');

function showSlide(idx) {
  if (!slides.length) {
    slideshowDiv.style.display = 'none';
    slideEmpty.style.display = '';
    return;
  }
  slideshowDiv.style.display = '';
  slideEmpty.style.display = 'none';
  slideIdx = ((idx % slides.length) + slides.length) % slides.length;
  slideImg.style.opacity = 0;
  setTimeout(() => {
    slideImg.src = slides[slideIdx].dataUrl;
    slideCaption.textContent = slides[slideIdx].name;
    slideImg.style.opacity = 1;
  }, 300);
  slideCounter.textContent = `${slideIdx + 1} / ${slides.length}`;
}

document.getElementById('slidePrev').addEventListener('click', () => showSlide(slideIdx - 1));
document.getElementById('slideNext').addEventListener('click', () => showSlide(slideIdx + 1));

document.getElementById('slidePlay').addEventListener('click', function() {
  slidePlaying = !slidePlaying;
  this.textContent = slidePlaying ? '⏸' : '▶';
  initSlideAuto();
});

function initSlideAuto() {
  clearInterval(slideTimer);
  if (slidePlaying && slides.length > 1) {
    slideTimer = setInterval(() => showSlide(slideIdx + 1), cfg.slideInterval * 1000);
  }
}

document.getElementById('slideInput').addEventListener('change', function(e) {
  const files = Array.from(e.target.files);
  let loaded = 0;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      slides.push({ name: file.name, dataUrl: ev.target.result });
      loaded++;
      if (loaded === files.length) {
        // Save only first 20 slides (localStorage limit)
        const toSave = slides.slice(-20).map(s => ({ name: s.name, dataUrl: s.dataUrl.slice(0, 200000) }));
        try { localStorage.setItem('dashSlides', JSON.stringify(toSave)); } catch {}
        showSlide(slides.length - 1);
        initSlideAuto();
      }
    };
    reader.readAsDataURL(file);
  });
  this.value = '';
});

showSlide(0);

// ══════════════════════════════════════════════
// NOTES  (localStorage)
// ══════════════════════════════════════════════
let notes = JSON.parse(localStorage.getItem('dashNotes') || '[]');
// notes = [{id, text, date}]

function saveNotes() { localStorage.setItem('dashNotes', JSON.stringify(notes)); }

function renderNotes() {
  const list = document.getElementById('notesList');
  list.innerHTML = '';
  notes.forEach(n => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.innerHTML = `
      <button class="note-card-del" data-id="${n.id}">✕</button>
      <textarea class="note-card-text" data-id="${n.id}" placeholder="Notiz…">${n.text}</textarea>
      <div class="note-card-date">${n.date}</div>`;
    list.appendChild(card);
  });
  // Events
  list.querySelectorAll('.note-card-del').forEach(btn => {
    btn.addEventListener('click', () => {
      notes = notes.filter(n => n.id !== btn.dataset.id);
      saveNotes(); renderNotes();
    });
  });
  list.querySelectorAll('.note-card-text').forEach(ta => {
    ta.addEventListener('input', () => {
      const n = notes.find(x => x.id === ta.dataset.id);
      if (n) { n.text = ta.value; saveNotes(); }
    });
  });
}

document.getElementById('btnAddNote').addEventListener('click', () => {
  notes.unshift({ id: Date.now().toString(), text: '', date: new Date().toLocaleDateString('de-DE') });
  saveNotes(); renderNotes();
  // Focus new note
  setTimeout(() => document.querySelector('.note-card-text')?.focus(), 50);
});

document.getElementById('btnClearNotes').addEventListener('click', () => {
  if (confirm('Alle Notizen löschen?')) { notes = []; saveNotes(); renderNotes(); }
});

renderNotes();

// ══════════════════════════════════════════════
// TASKS  (local + optional Google Tasks API)
// ══════════════════════════════════════════════
let localTasks = JSON.parse(localStorage.getItem('dashTasks') || '[]');
let googleTasksReady = false;

function saveLocalTasks() { localStorage.setItem('dashTasks', JSON.stringify(localTasks)); }

function renderLocalTasks() {
  const content = document.getElementById('tasksContent');
  content.innerHTML = `
    <div class="task-input-row">
      <input class="task-input" id="taskNewInput" placeholder="Neue Aufgabe…" />
      <button class="task-add-btn" id="taskAddBtn">+</button>
    </div>
    <div class="task-list" id="taskList"></div>
    ${googleTasksReady ? '' : '<button class="api-btn" id="btnTasksAuth2" style="margin-top:.4rem">Google Tasks verbinden</button>'}`;

  const list = document.getElementById('taskList');
  localTasks.forEach((t, i) => {
    const item = document.createElement('div');
    item.className = 'task-item' + (t.done ? ' done' : '');
    item.innerHTML = `
      <input type="checkbox" class="task-check" ${t.done ? 'checked' : ''} data-i="${i}" />
      <span class="task-title">${escHtml(t.title)}</span>
      <button class="task-del" data-i="${i}">✕</button>`;
    list.appendChild(item);
  });

  list.querySelectorAll('.task-check').forEach(cb => {
    cb.addEventListener('change', () => {
      localTasks[cb.dataset.i].done = cb.checked;
      saveLocalTasks(); renderLocalTasks();
    });
  });
  list.querySelectorAll('.task-del').forEach(btn => {
    btn.addEventListener('click', () => {
      localTasks.splice(btn.dataset.i, 1);
      saveLocalTasks(); renderLocalTasks();
    });
  });

  document.getElementById('taskAddBtn').addEventListener('click', addTask);
  document.getElementById('taskNewInput').addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });
  document.getElementById('btnTasksAuth2')?.addEventListener('click', () => initGoogleAuth());
}

function addTask() {
  const inp = document.getElementById('taskNewInput');
  const val = inp.value.trim();
  if (!val) return;
  localTasks.unshift({ title: val, done: false, id: Date.now().toString() });
  inp.value = ''; saveLocalTasks(); renderLocalTasks();
}

document.getElementById('btnTasksAuth').addEventListener('click', initGoogleAuth);

renderLocalTasks();

// ══════════════════════════════════════════════
// GOOGLE API  (Calendar + Tasks)
// ══════════════════════════════════════════════
const SCOPES = 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/tasks';
let tokenClient = null;
let gapiInited  = false;
let gsiInited   = false;

function loadGoogleApi() {
  if (!cfg.googleClientId) return;
  // Load gapi
  if (typeof gapi !== 'undefined') {
    gapi.load('client', async () => {
      await gapi.client.init({
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest',
          'https://www.googleapis.com/discovery/v1/apis/tasks/v1/rest',
        ],
      });
      gapiInited = true;
      maybeInitGsi();
    });
  }
  // GSI (token)
  if (typeof google !== 'undefined' && google.accounts) {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: cfg.googleClientId,
      scope: SCOPES,
      callback: handleTokenResponse,
    });
    gsiInited = true;
    maybeInitGsi();
  } else {
    // wait for gsi script
    window.addEventListener('gsiLoad', () => {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: cfg.googleClientId,
        scope: SCOPES,
        callback: handleTokenResponse,
      });
      gsiInited = true;
      maybeInitGsi();
    });
  }
}

function maybeInitGsi() {
  if (gapiInited && gsiInited) {
    // Both ready – show auth buttons
    document.getElementById('btnCalAuth').style.display = '';
  }
}

function initGoogleAuth() {
  if (!cfg.googleClientId) { openSettings(); return; }
  if (!tokenClient) { loadGoogleApi(); setTimeout(initGoogleAuth, 1500); return; }
  tokenClient.requestAccessToken({ prompt: '' });
}

document.getElementById('btnCalAuth').addEventListener('click', initGoogleAuth);

async function handleTokenResponse(resp) {
  if (resp.error) { console.error(resp); return; }
  await fetchCalendar();
  await fetchGoogleTasks();
}

async function fetchCalendar() {
  try {
    const now = new Date().toISOString();
    const end = new Date(Date.now() + 7 * 86400000).toISOString();
    const res = await gapi.client.calendar.events.list({
      calendarId: 'primary',
      timeMin: now, timeMax: end,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 8,
    });
    renderCalendar(res.result.items || []);
  } catch(e) { console.error('Calendar:', e); }
}

function renderCalendar(events) {
  const div = document.getElementById('calendarContent');
  if (!events.length) { div.innerHTML = '<div class="placeholder-msg">Keine Termine in den nächsten 7 Tagen</div>'; return; }
  div.innerHTML = '<div class="cal-events">' +
    events.map(ev => {
      const start = ev.start?.dateTime ? new Date(ev.start.dateTime) : new Date(ev.start.date);
      const time  = ev.start?.dateTime
        ? start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
        : 'ganztags';
      const date  = start.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });
      return `<div class="cal-event">
        <div>
          <div class="cal-event-date">${date}</div>
          <div class="cal-event-time">${time}</div>
        </div>
        <div class="cal-event-title">${escHtml(ev.summary || '(kein Titel)')}</div>
      </div>`;
    }).join('') + '</div>';
}

async function fetchGoogleTasks() {
  try {
    const listsRes = await gapi.client.tasks.tasklists.list({ maxResults: 1 });
    const listId   = listsRes.result.items?.[0]?.id;
    if (!listId) return;
    const tasksRes = await gapi.client.tasks.tasks.list({
      tasklist: listId, showCompleted: false, maxResults: 15,
    });
    const gTasks = (tasksRes.result.items || []).map(t => ({
      title: t.title, done: t.status === 'completed', id: 'g_' + t.id,
    }));
    // Merge: add google tasks that aren't already local
    const existing = new Set(localTasks.map(t => t.title));
    gTasks.forEach(t => { if (!existing.has(t.title)) localTasks.unshift(t); });
    googleTasksReady = true;
    saveLocalTasks(); renderLocalTasks();
  } catch(e) { console.error('Tasks:', e); }
}

// ══════════════════════════════════════════════
// GOOGLE GSI callback (script loads async)
// ══════════════════════════════════════════════
window.onGoogleScriptLoad = function() {
  window.dispatchEvent(new Event('gsiLoad'));
};

// ══════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════════════
// INIT
// ══════════════════════════════════════════════
loadCfg();
themeIdx = THEMES.indexOf(cfg.theme);
if (themeIdx < 0) themeIdx = 0;
applyTheme();
initWeather();
if (cfg.googleClientId) {
  // lazy init after scripts load
  window.addEventListener('load', () => setTimeout(loadGoogleApi, 800));
}

// ── Keyboard shortcuts ──
document.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight' && !e.target.matches('input,textarea')) showSlide(slideIdx + 1);
  if (e.key === 'ArrowLeft'  && !e.target.matches('input,textarea')) showSlide(slideIdx - 1);
  if (e.key === 'f' || e.key === 'F') {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
    else document.exitFullscreen();
  }
});

console.log('%c◈ DASHBOARD geladen', 'color:#f0a030;font-family:monospace;font-size:14px;');
