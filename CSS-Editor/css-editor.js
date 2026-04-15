/* ══════════════════════════════════════════════════════
   CSS FORGE — Visual CSS Editor Logic
   ══════════════════════════════════════════════════════ */

'use strict';

// ═══════════════════════════════════════════════════════
// ELEMENT PRESETS
// ═══════════════════════════════════════════════════════

const ELEMENTS = {
  box: {
    tag: 'div',
    html: false,
    content: 'Box Element',
  },
  button: {
    tag: 'button',
    html: false,
    content: 'Klick Mich ›',
  },
  input: {
    tag: 'input',
    html: false,
    content: '',
    attrs: { type: 'text', placeholder: 'Eingabe...', value: 'Beispieltext' },
  },
  link: {
    tag: 'a',
    html: false,
    content: '→ Mein Link',
    attrs: { href: '#' },
  },
  text: {
    tag: 'p',
    html: false,
    content: 'Das ist ein Beispieltext mit mehreren Zeilen für den CSS-Editor. Passen Sie Schrift, Farbe und Abstände direkt an.',
  },
  card: {
    tag: 'div',
    html: true,
    content: `
      <div style="font-size:18px;font-weight:700;margin-bottom:8px">Karten Titel</div>
      <div style="font-size:13px;opacity:.7;line-height:1.5;margin-bottom:12px">
        Eine Karte mit Beschreibungstext. Ideal zum Stylen von Containern und Panels.
      </div>
      <div style="display:flex;gap:8px">
        <span style="background:rgba(245,158,11,.2);color:#f59e0b;font-size:11px;padding:3px 8px;border-radius:3px">Tag A</span>
        <span style="background:rgba(34,211,238,.15);color:#22d3ee;font-size:11px;padding:3px 8px;border-radius:3px">Tag B</span>
      </div>`,
  },
  badge: {
    tag: 'span',
    html: false,
    content: 'NEU',
  },
  image: {
    tag: 'div',
    html: true,
    content: `
      <div style="width:64px;height:64px;margin:0 auto 12px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444)"></div>
      <div style="font-size:14px;font-weight:600;text-align:center">Bild-Platzhalter</div>
      <div style="font-size:11px;opacity:.5;text-align:center;margin-top:4px">800 × 600</div>`,
  },
};

// ═══════════════════════════════════════════════════════
// PROPERTY DEFINITIONS
// ═══════════════════════════════════════════════════════

const PROPS = {
  layout: {
    sections: [
      {
        title: 'Dimensionen',
        props: [
          { id: 'width',     label: 'Breite',    type: 'ru', min:0,   max:800,  def:200, defUnit:'px',  units:['px','%','em','rem','vw','auto'] },
          { id: 'height',    label: 'Höhe',      type: 'ru', min:0,   max:600,  def:100, defUnit:'px',  units:['px','%','em','rem','vh','auto'] },
          { id: 'min-width', label: 'Min-Breite',type: 'ru', min:0,   max:800,  def:0,   defUnit:'px',  units:['px','%','em','none'] },
          { id: 'max-width', label: 'Max-Breite',type: 'ru', min:0,   max:1600, def:600, defUnit:'px',  units:['px','%','em','none'] },
        ]
      },
      {
        title: 'Abstände',
        props: [
          { id: 'padding',        label: 'Padding',     type: 'r', min:0,  max:120, def:16, unit:'px' },
          { id: 'padding-top',    label: 'Padding ↑',   type: 'r', min:0,  max:120, def:16, unit:'px' },
          { id: 'padding-right',  label: 'Padding →',   type: 'r', min:0,  max:120, def:16, unit:'px' },
          { id: 'padding-bottom', label: 'Padding ↓',   type: 'r', min:0,  max:120, def:16, unit:'px' },
          { id: 'padding-left',   label: 'Padding ←',   type: 'r', min:0,  max:120, def:16, unit:'px' },
          { id: 'margin',         label: 'Margin',      type: 'r', min:-60,max:120, def:0,  unit:'px' },
        ]
      },
      {
        title: 'Layout & Anzeige',
        props: [
          { id: 'display',   label: 'Display',   type: 's', def:'block',    opts:['block','inline-block','inline','flex','inline-flex','grid','none'] },
          { id: 'overflow',  label: 'Overflow',  type: 's', def:'visible',  opts:['visible','hidden','scroll','auto','clip'] },
          { id: 'position',  label: 'Position',  type: 's', def:'relative', opts:['static','relative','absolute','fixed','sticky'] },
          { id: 'z-index',   label: 'Z-Index',   type: 'r', min:-10, max:100, step:1, def:0, unit:'' },
          { id: 'opacity',   label: 'Opacity',   type: 'r', min:0,   max:1, step:0.01, def:1, unit:'' },
        ]
      },
    ]
  },
  typography: {
    sections: [
      {
        title: 'Schriftart',
        props: [
          { id: 'font-size',   label: 'Größe',      type: 'r', min:8,  max:96,  def:16, unit:'px' },
          { id: 'font-weight', label: 'Gewicht',    type: 's', def:'400', opts:['100','200','300','400','500','600','700','800','900'] },
          { id: 'font-style',  label: 'Stil',       type: 's', def:'normal', opts:['normal','italic','oblique'] },
          { id: 'font-family', label: 'Schriftart', type: 's', def:'Arial',
            opts:['Arial','Georgia','"Times New Roman"','"Courier New"','Verdana','Helvetica',
                  '"Trebuchet MS"','"Palatino Linotype"','"Orbitron"','"Rajdhani"','"JetBrains Mono"',
                  '"Comic Sans MS"'] },
        ]
      },
      {
        title: 'Text & Abstände',
        props: [
          { id: 'line-height',     label: 'Zeilenhöhe', type: 'r', min:0.5, max:4, step:0.05, def:1.5,  unit:''   },
          { id: 'letter-spacing',  label: 'Zeichenabst',type: 'r', min:-5,  max:20, step:0.1, def:0,    unit:'px' },
          { id: 'word-spacing',    label: 'Wortabstand',type: 'r', min:-5,  max:30, step:0.5, def:0,    unit:'px' },
          { id: 'text-align',      label: 'Ausrichtung',type: 's', def:'left',    opts:['left','center','right','justify'] },
          { id: 'text-transform',  label: 'Transform',  type: 's', def:'none',    opts:['none','uppercase','lowercase','capitalize'] },
          { id: 'text-decoration', label: 'Dekoration', type: 's', def:'none',    opts:['none','underline','line-through','overline'] },
          { id: 'white-space',     label: 'Whitespace', type: 's', def:'normal',  opts:['normal','nowrap','pre','pre-line','pre-wrap'] },
        ]
      },
    ]
  },
  colors: {
    sections: [
      {
        title: 'Grundfarben',
        props: [
          { id: 'color',            label: 'Textfarbe',  type: 'c', def:'#f0f0f0' },
          { id: 'background-color', label: 'Hintergrund',type: 'c', def:'#1a1a2e' },
        ]
      },
      {
        title: 'Hintergrund-Gradient',
        props: [
          { id: 'background-image', label: 'BG Gradient', type: 's', def:'none',
            opts:['none',
                  'linear-gradient(135deg, #667eea, #764ba2)',
                  'linear-gradient(to right, #f59e0b, #ef4444)',
                  'linear-gradient(135deg, #0f0c29, #302b63)',
                  'linear-gradient(to right, #11998e, #38ef7d)',
                  'linear-gradient(to right, #fc5c7d, #6a3093)',
                  'radial-gradient(circle, #1a1a2e, #0a0a0f)',
                  'linear-gradient(135deg, #f093fb, #f5576c)',
                  'linear-gradient(180deg, #23a6d5, #23d5ab)',
                  'linear-gradient(to bottom right, #ffecd2, #fcb69f)'] },
        ]
      },
      {
        title: 'Weitere',
        props: [
          { id: 'border-color', label: 'Rahmenfarbe', type: 'c', def:'#f59e0b' },
          { id: 'caret-color',  label: 'Cursor-Farbe',type: 'c', def:'#f59e0b' },
        ]
      }
    ]
  },
  border: {
    sections: [
      {
        title: 'Rahmen',
        props: [
          { id: 'border-width', label: 'Breite', type: 'r', min:0,  max:20,  def:0, unit:'px' },
          { id: 'border-style', label: 'Stil',   type: 's', def:'solid', opts:['none','solid','dashed','dotted','double','groove','ridge','inset','outset'] },
        ]
      },
      {
        title: 'Eckenradius',
        props: [
          { id: 'border-radius',              label: 'Alle Ecken', type: 'r', min:0, max:250, def:4, unit:'px' },
          { id: 'border-top-left-radius',     label: 'Ecke ↖',     type: 'r', min:0, max:250, def:4, unit:'px' },
          { id: 'border-top-right-radius',    label: 'Ecke ↗',     type: 'r', min:0, max:250, def:4, unit:'px' },
          { id: 'border-bottom-right-radius', label: 'Ecke ↘',     type: 'r', min:0, max:250, def:4, unit:'px' },
          { id: 'border-bottom-left-radius',  label: 'Ecke ↙',     type: 'r', min:0, max:250, def:4, unit:'px' },
        ]
      },
      {
        title: 'Outline',
        props: [
          { id: 'outline-width',  label: 'Breite',  type: 'r', min:0,  max:12, def:0, unit:'px' },
          { id: 'outline-style',  label: 'Stil',    type: 's', def:'none', opts:['none','solid','dashed','dotted','double'] },
          { id: 'outline-color',  label: 'Farbe',   type: 'c', def:'#22d3ee' },
          { id: 'outline-offset', label: 'Abstand', type: 'r', min:-10, max:20, def:0, unit:'px' },
        ]
      },
    ]
  },
  shadow: {
    sections: [
      {
        title: 'Box-Schatten',
        props: [
          { id: '__bsx', label: 'X Offset',    type: 'r', min:-80, max:80,  def:0,   unit:'px', virtual:'box-shadow' },
          { id: '__bsy', label: 'Y Offset',    type: 'r', min:-80, max:80,  def:5,   unit:'px', virtual:'box-shadow' },
          { id: '__bsb', label: 'Unschärfe',   type: 'r', min:0,   max:120, def:15,  unit:'px', virtual:'box-shadow' },
          { id: '__bss', label: 'Ausbreitung', type: 'r', min:-30, max:80,  def:0,   unit:'px', virtual:'box-shadow' },
          { id: '__bsc', label: 'Farbe',       type: 'c',                   def:'#000000',       virtual:'box-shadow' },
          { id: '__bsa', label: 'Alpha',       type: 'r', min:0, max:1, step:0.01, def:0.5, unit:'', virtual:'box-shadow' },
          { id: '__bsi', label: 'Inset',       type: 't',                   def:false,           virtual:'box-shadow' },
        ]
      },
      {
        title: 'Text-Schatten',
        props: [
          { id: '__tsx', label: 'X Offset',  type: 'r', min:-30, max:30, def:0,  unit:'px', virtual:'text-shadow' },
          { id: '__tsy', label: 'Y Offset',  type: 'r', min:-30, max:30, def:2,  unit:'px', virtual:'text-shadow' },
          { id: '__tsb', label: 'Unschärfe', type: 'r', min:0,   max:40, def:4,  unit:'px', virtual:'text-shadow' },
          { id: '__tsc', label: 'Farbe',     type: 'c',                  def:'#000000',     virtual:'text-shadow' },
          { id: '__tsa', label: 'Alpha',     type: 'r', min:0, max:1, step:0.01, def:0, unit:'', virtual:'text-shadow' },
        ]
      },
    ]
  },
  effects: {
    sections: [
      {
        title: 'CSS Filter',
        props: [
          { id: '__fblur',     label: 'Blur',        type: 'r', min:0, max:20,  step:0.1,  def:0, unit:'px', virtual:'filter' },
          { id: '__fbright',   label: 'Helligkeit',  type: 'r', min:0, max:3,   step:0.05, def:1, unit:'',   virtual:'filter' },
          { id: '__fcontrast', label: 'Kontrast',    type: 'r', min:0, max:3,   step:0.05, def:1, unit:'',   virtual:'filter' },
          { id: '__fsaturate', label: 'Sättigung',   type: 'r', min:0, max:3,   step:0.05, def:1, unit:'',   virtual:'filter' },
          { id: '__fhue',      label: 'Farbton',     type: 'r', min:0, max:360, step:1,    def:0, unit:'deg',virtual:'filter' },
          { id: '__fsepia',    label: 'Sepia',       type: 'r', min:0, max:1,   step:0.01, def:0, unit:'',   virtual:'filter' },
          { id: '__finvert',   label: 'Invertiert',  type: 'r', min:0, max:1,   step:0.01, def:0, unit:'',   virtual:'filter' },
        ]
      },
      {
        title: 'Transform',
        props: [
          { id: '__trotate', label: 'Rotation',   type: 'r', min:-180,max:180, step:1,    def:0,  unit:'deg',virtual:'transform' },
          { id: '__tscale',  label: 'Skalierung', type: 'r', min:0.1, max:4,   step:0.05, def:1,  unit:'',   virtual:'transform' },
          { id: '__tskewx',  label: 'Schräge X',  type: 'r', min:-60, max:60,  step:1,    def:0,  unit:'deg',virtual:'transform' },
          { id: '__tskewy',  label: 'Schräge Y',  type: 'r', min:-60, max:60,  step:1,    def:0,  unit:'deg',virtual:'transform' },
          { id: '__ttx',     label: 'Versatz X',  type: 'r', min:-300,max:300, step:1,    def:0,  unit:'px', virtual:'transform' },
          { id: '__tty',     label: 'Versatz Y',  type: 'r', min:-300,max:300, step:1,    def:0,  unit:'px', virtual:'transform' },
        ]
      },
      {
        title: 'Übergang & Sonstiges',
        props: [
          { id: 'transition-duration',        label: 'Übergang ms', type: 'r', min:0,  max:3000, step:50, def:300, unit:'ms' },
          { id: 'transition-timing-function', label: 'Timing',      type: 's', def:'ease', opts:['ease','linear','ease-in','ease-out','ease-in-out'] },
          { id: 'cursor', label: 'Cursor', type: 's', def:'default',
            opts:['default','pointer','crosshair','move','text','wait','not-allowed','grab','zoom-in','none'] },
        ]
      },
    ]
  },
};

// ═══════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════

let state       = {};
let currentTab  = 'layout';
let currentEl   = 'box';
let autoSync    = true;
let isDark      = true;
let isFS        = false;
let hoverSim    = false;
let ignoreCodeChange = false;

function flatProps() {
  const all = [];
  Object.values(PROPS).forEach(tab => {
    tab.sections.forEach(sec => {
      sec.props.forEach(p => all.push(p));
    });
  });
  return all;
}

function initState() {
  state = {};
  flatProps().forEach(p => {
    if (p.type === 'ru') {
      state[p.id] = { value: p.def, unit: p.defUnit };
    } else if (p.type === 'r') {
      state[p.id] = p.def;
    } else if (p.type === 't') {
      state[p.id] = p.def;
    } else {
      state[p.id] = p.def;
    }
  });
}

function isDefault(p) {
  const v = state[p.id];
  if (p.type === 'ru') return v.value === p.def && v.unit === p.defUnit;
  return v === p.def;
}

// ═══════════════════════════════════════════════════════
// COMPUTE CSS
// ═══════════════════════════════════════════════════════

function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const n = parseInt(hex, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex(color) {
  if (!color) return '#000000';
  if (/^#[0-9a-fA-F]{6}$/.test(color)) return color;
  if (/^#[0-9a-fA-F]{3}$/.test(color)) {
    return '#' + color.slice(1).split('').map(c => c + c).join('');
  }
  const m = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (m) return '#' + [m[1],m[2],m[3]].map(x => parseInt(x).toString(16).padStart(2,'0')).join('');
  return '#000000';
}

function computeProps() {
  const out = {};

  flatProps().forEach(p => {
    if (p.virtual) return;
    const v = state[p.id];
    if (v === undefined || v === null) return;

    if (p.type === 'ru') {
      if (v.unit === 'auto' || v.unit === 'none') out[p.id] = v.unit;
      else out[p.id] = `${v.value}${v.unit}`;
    } else if (p.type === 'r') {
      out[p.id] = p.unit ? `${v}${p.unit}` : String(v);
    } else {
      out[p.id] = String(v);
    }
  });

  // ── Box-Shadow ──────────────────────────────────────
  const bsx  = state['__bsx'] ?? 0;
  const bsy  = state['__bsy'] ?? 5;
  const bsb  = state['__bsb'] ?? 15;
  const bss  = state['__bss'] ?? 0;
  const bsc  = state['__bsc'] ?? '#000000';
  const bsa  = state['__bsa'] ?? 0.5;
  const bsi  = state['__bsi'] ?? false;
  const [br, bg, bb] = hexToRgb(bsc);
  const inset = bsi ? 'inset ' : '';
  out['box-shadow'] = `${inset}${bsx}px ${bsy}px ${bsb}px ${bss}px rgba(${br},${bg},${bb},${bsa})`;

  // ── Text-Shadow ─────────────────────────────────────
  const tsx = state['__tsx'] ?? 0;
  const tsy = state['__tsy'] ?? 2;
  const tsb = state['__tsb'] ?? 4;
  const tsc = state['__tsc'] ?? '#000000';
  const tsa = state['__tsa'] ?? 0;
  if (tsa > 0 || tsx !== 0 || tsy !== 0) {
    const [tr, tg, tb] = hexToRgb(tsc);
    out['text-shadow'] = `${tsx}px ${tsy}px ${tsb}px rgba(${tr},${tg},${tb},${tsa})`;
  }

  // ── Filter ──────────────────────────────────────────
  const fblur  = state['__fblur']     ?? 0;
  const fbr    = state['__fbright']   ?? 1;
  const fcon   = state['__fcontrast'] ?? 1;
  const fsat   = state['__fsaturate'] ?? 1;
  const fhue   = state['__fhue']      ?? 0;
  const fsepia = state['__fsepia']    ?? 0;
  const finv   = state['__finvert']   ?? 0;
  const fparts = [];
  if (fblur  !== 0)   fparts.push(`blur(${fblur}px)`);
  if (fbr    !== 1)   fparts.push(`brightness(${fbr})`);
  if (fcon   !== 1)   fparts.push(`contrast(${fcon})`);
  if (fsat   !== 1)   fparts.push(`saturate(${fsat})`);
  if (fhue   !== 0)   fparts.push(`hue-rotate(${fhue}deg)`);
  if (fsepia !== 0)   fparts.push(`sepia(${fsepia})`);
  if (finv   !== 0)   fparts.push(`invert(${finv})`);
  if (fparts.length)  out['filter'] = fparts.join(' ');

  // ── Transform ───────────────────────────────────────
  const rot  = state['__trotate'] ?? 0;
  const scl  = state['__tscale']  ?? 1;
  const skx  = state['__tskewx']  ?? 0;
  const sky  = state['__tskewy']  ?? 0;
  const tx   = state['__ttx']     ?? 0;
  const ty   = state['__tty']     ?? 0;
  const tparts = [];
  if (rot !== 0)       tparts.push(`rotate(${rot}deg)`);
  if (scl !== 1)       tparts.push(`scale(${scl})`);
  if (skx !== 0)       tparts.push(`skewX(${skx}deg)`);
  if (sky !== 0)       tparts.push(`skewY(${sky}deg)`);
  if (tx  !== 0 || ty !== 0) tparts.push(`translate(${tx}px,${ty}px)`);
  if (tparts.length)   out['transform'] = tparts.join(' ');

  return out;
}

function buildCSSText(selector) {
  const sel  = selector || document.getElementById('selectorInput').value || '.element';
  const props = computeProps();
  let css = `${sel} {\n`;
  Object.entries(props).forEach(([k, v]) => {
    css += `  ${k}: ${v};\n`;
  });
  css += `}`;
  return css;
}

// ═══════════════════════════════════════════════════════
// PREVIEW
// ═══════════════════════════════════════════════════════

function applyPreview() {
  const el = document.getElementById('previewEl');
  if (!el) return;

  const props = computeProps();
  let cssText = '';
  Object.entries(props).forEach(([k, v]) => {
    cssText += `${k}:${v};`;
  });

  if (hoverSim) {
    cssText += 'filter:' + (props['filter'] || '') + ' brightness(1.15);';
  }

  el.style.cssText = cssText;

  // Update code textarea (if auto-sync)
  if (autoSync) {
    ignoreCodeChange = true;
    const ta = document.getElementById('cssCode');
    if (ta) ta.value = buildCSSText();
    ignoreCodeChange = false;
  }

  // Flash live dot
  const dot = document.getElementById('liveDot');
  if (dot) {
    dot.style.background = '#f59e0b';
    clearTimeout(dot._t);
    dot._t = setTimeout(() => { dot.style.background = ''; }, 400);
  }
}

// ═══════════════════════════════════════════════════════
// ELEMENT SWITCHING
// ═══════════════════════════════════════════════════════

function setElement(key) {
  const preset = ELEMENTS[key];
  if (!preset) return;
  currentEl = key;

  const wrap = document.getElementById('previewWrap');
  const old  = document.getElementById('previewEl');
  if (old) old.remove();

  let el;
  if (preset.tag === 'input') {
    el = document.createElement('input');
    Object.entries(preset.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  } else {
    el = document.createElement(preset.tag);
    if (preset.html) el.innerHTML = preset.content;
    else             el.textContent = preset.content;
    Object.entries(preset.attrs || {}).forEach(([k, v]) => el.setAttribute(k, v));
  }
  el.id = 'previewEl';
  wrap.appendChild(el);
  applyPreview();
}

// ═══════════════════════════════════════════════════════
// RENDER CONTROLS
// ═══════════════════════════════════════════════════════

function renderControls(tabKey) {
  const area = document.getElementById('controlsArea');
  if (!area) return;

  const tabData = PROPS[tabKey];
  if (!tabData) return;

  let html = '';
  tabData.sections.forEach(sec => {
    html += `<div class="ctrl-section">${sec.title}</div>`;
    sec.props.forEach(p => {
      html += renderRow(p);
    });
  });

  area.innerHTML = html;

  // Bind events
  tabData.sections.forEach(sec => {
    sec.props.forEach(p => bindRow(p));
  });
}

function renderRow(p) {
  const modified = !isDefault(p) ? ' modified' : '';
  return `<div class="ctrl-row${modified}" data-id="${p.id}">${renderCtrl(p)}</div>`;
}

function renderCtrl(p) {
  switch (p.type) {
    case 'r':  return renderRange(p);
    case 'ru': return renderRangeUnit(p);
    case 'c':  return renderColor(p);
    case 's':  return renderSelect(p);
    case 't':  return renderToggle(p);
    default:   return '';
  }
}

function renderRange(p) {
  const v    = state[p.id] ?? p.def;
  const step = p.step ?? 1;
  const unit = p.unit ? `<span class="ctrl-unit-lbl">${p.unit}</span>` : '';
  return `
    <span class="ctrl-label" title="${p.id}">${p.label}</span>
    <div class="ctrl-slider-wrap">
      <input type="range" min="${p.min}" max="${p.max}" step="${step}" value="${v}"
             data-id="${p.id}" data-role="slider">
    </div>
    <input type="number" class="ctrl-number" value="${v}"
           min="${p.min}" max="${p.max}" step="${step}"
           data-id="${p.id}" data-role="num">
    ${unit}`;
}

function renderRangeUnit(p) {
  const sv   = state[p.id] ?? { value: p.def, unit: p.defUnit };
  const v    = sv.value;
  const u    = sv.unit;
  const step = p.step ?? 1;
  const unitOpts = p.units.map(x =>
    `<option value="${x}" ${x === u ? 'selected' : ''}>${x}</option>`
  ).join('');
  return `
    <span class="ctrl-label" title="${p.id}">${p.label}</span>
    <div class="ctrl-slider-wrap">
      <input type="range" min="${p.min}" max="${p.max}" step="${step}" value="${v}"
             data-id="${p.id}" data-role="slider">
    </div>
    <input type="number" class="ctrl-number" value="${v}"
           min="${p.min}" max="${p.max}" step="${step}"
           data-id="${p.id}" data-role="num">
    <select class="ctrl-unit" data-id="${p.id}" data-role="unit">${unitOpts}</select>`;
}

function renderColor(p) {
  const v   = state[p.id] ?? p.def;
  const hex = toHex(v);
  return `
    <span class="ctrl-label" title="${p.id}">${p.label}</span>
    <div class="ctrl-color-wrap">
      <input type="color" value="${hex}" data-id="${p.id}" data-role="picker">
      <input type="text"  class="ctrl-hex" value="${v}" placeholder="#rrggbb / rgba()"
             data-id="${p.id}" data-role="hex">
    </div>`;
}

function renderSelect(p) {
  const v    = state[p.id] ?? p.def;
  const opts = p.opts.map(o =>
    `<option value="${o}" ${o === v ? 'selected' : ''}>${o}</option>`
  ).join('');
  return `
    <span class="ctrl-label" title="${p.id}">${p.label}</span>
    <select class="ctrl-select" data-id="${p.id}" data-role="sel">${opts}</select>`;
}

function renderToggle(p) {
  const v = state[p.id] ?? p.def;
  return `
    <span class="ctrl-label" title="${p.id}">${p.label}</span>
    <div class="ctrl-toggle-wrap">
      <label class="toggle-sw">
        <input type="checkbox" ${v ? 'checked' : ''} data-id="${p.id}" data-role="tog">
        <span class="toggle-track"></span>
        <span class="toggle-thumb"></span>
      </label>
      <span class="toggle-lbl" data-id="${p.id}-lbl">${v ? 'AN' : 'AUS'}</span>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// BIND EVENTS
// ═══════════════════════════════════════════════════════

function bindRow(p) {
  const area = document.getElementById('controlsArea');

  function markModified() {
    const row = area.querySelector(`[data-id="${p.id}"]`);
    if (row) row.classList.toggle('modified', !isDefault(p));
  }

  if (p.type === 'r') {
    const slider = area.querySelector(`[data-id="${p.id}"][data-role="slider"]`);
    const num    = area.querySelector(`[data-id="${p.id}"][data-role="num"]`);
    const sync   = v => {
      state[p.id] = v;
      if (slider && parseFloat(slider.value) !== v) slider.value = v;
      if (num    && parseFloat(num.value)    !== v) num.value    = v;
      markModified(); applyPreview();
    };
    if (slider) slider.addEventListener('input', e => sync(parseFloat(e.target.value)));
    if (num)    num.addEventListener('input',   e => { const n = parseFloat(e.target.value); if (!isNaN(n)) sync(n); });
    if (num)    num.addEventListener('change',  e => { const n = parseFloat(e.target.value); if (!isNaN(n)) sync(n); });
  }

  if (p.type === 'ru') {
    const slider = area.querySelector(`[data-id="${p.id}"][data-role="slider"]`);
    const num    = area.querySelector(`[data-id="${p.id}"][data-role="num"]`);
    const unit   = area.querySelector(`[data-id="${p.id}"][data-role="unit"]`);
    const syncV  = v => {
      state[p.id] = { ...state[p.id], value: v };
      if (slider && parseFloat(slider.value) !== v) slider.value = v;
      if (num    && parseFloat(num.value)    !== v) num.value    = v;
      markModified(); applyPreview();
    };
    if (slider) slider.addEventListener('input',  e => syncV(parseFloat(e.target.value)));
    if (num)    num.addEventListener('input',     e => { const n = parseFloat(e.target.value); if (!isNaN(n)) syncV(n); });
    if (num)    num.addEventListener('change',    e => { const n = parseFloat(e.target.value); if (!isNaN(n)) syncV(n); });
    if (unit)   unit.addEventListener('change',   e => {
      state[p.id] = { ...state[p.id], unit: e.target.value };
      markModified(); applyPreview();
    });
  }

  if (p.type === 'c') {
    const picker = area.querySelector(`[data-id="${p.id}"][data-role="picker"]`);
    const hex    = area.querySelector(`[data-id="${p.id}"][data-role="hex"]`);
    if (picker) picker.addEventListener('input', e => {
      state[p.id] = e.target.value;
      if (hex) hex.value = e.target.value;
      markModified(); applyPreview();
    });
    if (hex) {
      hex.addEventListener('change', e => {
        state[p.id] = e.target.value;
        if (picker) picker.value = toHex(e.target.value);
        markModified(); applyPreview();
      });
      hex.addEventListener('input', e => {
        const v = e.target.value.trim();
        if (/^#[0-9a-fA-F]{6}$/.test(v) || /^rgba?\(/.test(v)) {
          state[p.id] = v;
          if (picker) picker.value = toHex(v);
          markModified(); applyPreview();
        }
      });
    }
  }

  if (p.type === 's') {
    const sel = area.querySelector(`[data-id="${p.id}"][data-role="sel"]`);
    if (sel) sel.addEventListener('change', e => {
      state[p.id] = e.target.value;
      markModified(); applyPreview();
    });
  }

  if (p.type === 't') {
    const tog = area.querySelector(`[data-id="${p.id}"][data-role="tog"]`);
    if (tog) tog.addEventListener('change', e => {
      state[p.id] = e.target.checked;
      const lbl = area.querySelector(`[data-id="${p.id}-lbl"]`);
      if (lbl) lbl.textContent = e.target.checked ? 'AN' : 'AUS';
      markModified(); applyPreview();
    });
  }
}

// ═══════════════════════════════════════════════════════
// CSS PARSER (back-sync from textarea)
// ═══════════════════════════════════════════════════════

function parseCSS(text) {
  const bodyMatch = text.match(/\{([\s\S]*)\}/);
  if (!bodyMatch) return;
  const body = bodyMatch[1];
  const decls = body.split(';').map(s => s.trim()).filter(Boolean);

  const allProps = flatProps();

  decls.forEach(decl => {
    const ci = decl.indexOf(':');
    if (ci < 0) return;
    const prop = decl.slice(0, ci).trim();
    const val  = decl.slice(ci + 1).trim();

    // Find matching property definition
    const def = allProps.find(p => p.id === prop);
    if (!def) return;

    if (def.type === 'ru') {
      const m = val.match(/^([\d.]+)(px|%|em|rem|vw|vh)$/);
      if (m) state[def.id] = { value: parseFloat(m[1]), unit: m[2] };
      else if (val === 'auto' || val === 'none') state[def.id] = { ...state[def.id], unit: val };
    } else if (def.type === 'r') {
      const m = val.match(/^-?[\d.]+/);
      if (m) state[def.id] = parseFloat(m[0]);
    } else {
      state[def.id] = val;
    }
  });
}

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════

let toastTimer;
function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

// ═══════════════════════════════════════════════════════
// FILE OPERATIONS
// ═══════════════════════════════════════════════════════

function doLoad() {
  document.getElementById('fileInput').click();
}

function doSave() {
  const css  = document.getElementById('cssCode').value;
  const sel  = document.getElementById('selectorInput').value;
  const name = (sel.replace(/[^a-zA-Z0-9_-]/g, '') || 'style') + '.css';
  const blob = new Blob([css], { type: 'text/css' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
  toast(`✓ Gespeichert: ${name}`);
}

function doCopy() {
  const css = document.getElementById('cssCode').value;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(css).then(() => toast('✓ CSS in Zwischenablage'));
  } else {
    const ta = document.getElementById('cssCode');
    ta.select();
    document.execCommand('copy');
    toast('✓ Kopiert!');
  }
}

function doReset() {
  initState();
  renderControls(currentTab);
  applyPreview();
  toast('↺ Alle Werte zurückgesetzt');
}

function doFormat() {
  const ta  = document.getElementById('cssCode');
  const sel = document.getElementById('selectorInput').value;
  parseCSS(ta.value);
  renderControls(currentTab);
  ignoreCodeChange = true;
  ta.value = buildCSSText(sel);
  ignoreCodeChange = false;
  applyPreview();
  ta.classList.add('flash');
  setTimeout(() => ta.classList.remove('flash'), 500);
  toast('⊞ CSS formatiert & synchronisiert');
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {

  // ── Initial setup ──────────────────────────────────
  initState();
  renderControls(currentTab);
  setElement(currentEl);

  // ── Tabs ───────────────────────────────────────────
  document.getElementById('tabBar').addEventListener('click', e => {
    const btn = e.target.closest('.tab');
    if (!btn) return;
    currentTab = btn.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    renderControls(currentTab);
  });

  // ── Element selector ───────────────────────────────
  document.getElementById('elementNav').addEventListener('click', e => {
    const btn = e.target.closest('.el-btn');
    if (!btn || !btn.dataset.el) return;
    document.querySelectorAll('.el-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    setElement(btn.dataset.el);
  });

  // ── Toolbar ────────────────────────────────────────
  document.getElementById('btnLoad').addEventListener('click', doLoad);
  document.getElementById('btnSave').addEventListener('click', doSave);
  document.getElementById('btnCopy').addEventListener('click', doCopy);
  document.getElementById('btnReset').addEventListener('click', doReset);

  // ── File input ─────────────────────────────────────
  document.getElementById('fileInput').addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const css = ev.target.result;
      document.getElementById('cssCode').value = css;
      parseCSS(css);
      renderControls(currentTab);
      applyPreview();
      toast(`✓ Geladen: ${file.name}`);
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  // ── Theme toggle ───────────────────────────────────
  document.getElementById('btnTheme').addEventListener('click', () => {
    isDark = !isDark;
    document.body.classList.toggle('dark',  isDark);
    document.body.classList.toggle('light', !isDark);
    toast(isDark ? '🌙 Dunkel-Modus' : '☀ Hell-Modus');
  });

  // ── Fullscreen ─────────────────────────────────────
  document.getElementById('btnFS').addEventListener('click', () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {
        toast('⚠ Vollbild nicht verfügbar');
      });
    } else {
      document.exitFullscreen();
    }
  });
  document.addEventListener('fullscreenchange', () => {
    isFS = !!document.fullscreenElement;
    document.body.classList.toggle('fullscreen', isFS);
  });

  // ── Selector input ─────────────────────────────────
  document.getElementById('selectorInput').addEventListener('input', () => {
    if (autoSync) {
      ignoreCodeChange = true;
      document.getElementById('cssCode').value = buildCSSText();
      ignoreCodeChange = false;
    }
  });

  // ── Auto-sync toggle ───────────────────────────────
  document.getElementById('btnAutoSync').addEventListener('click', function () {
    autoSync = !autoSync;
    this.classList.toggle('active', autoSync);
    toast(autoSync ? '⟳ Auto-Sync aktiviert' : '⊠ Auto-Sync deaktiviert');
    if (autoSync) applyPreview();
  });

  // ── Format button ──────────────────────────────────
  document.getElementById('btnFormat').addEventListener('click', doFormat);

  // ── CSS textarea manual edit ────────────────────────
  document.getElementById('cssCode').addEventListener('input', function () {
    if (ignoreCodeChange || !autoSync) return;
    parseCSS(this.value);
    renderControls(currentTab);
    applyPreview();
  });

  // ── Hover simulation ───────────────────────────────
  document.getElementById('hoverSim').addEventListener('change', function () {
    hoverSim = this.checked;
    applyPreview();
    toast(hoverSim ? '👆 :hover Simulation AN' : '👆 :hover Simulation AUS');
  });

  // ── Preview background swatches ────────────────────
  document.querySelectorAll('.swatch').forEach(sw => {
    sw.addEventListener('click', function () {
      document.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
      this.classList.add('active');
      const box = document.getElementById('previewBox');
      // Remove all bg-* classes
      [...box.classList].filter(c => c.startsWith('bg-')).forEach(c => box.classList.remove(c));
      box.classList.add(`bg-${this.dataset.bg}`);
    });
  });

  // ── Keyboard shortcuts ─────────────────────────────
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault(); doSave();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault(); doReset();
    }
    if (e.key === 'F11') {
      e.preventDefault();
      document.getElementById('btnFS').click();
    }
  });

  // ── Panel Resize Logic ──────────────────────────────

  (function initResizers() {
    const workspace   = document.getElementById('workspace');
    const leftPanel   = document.getElementById('leftPanel');
    const rightPanel  = document.getElementById('rightPanel');
    const previewPane = document.getElementById('previewPane');
    const codePane    = document.getElementById('codePane');
    const handleV     = document.getElementById('resizeV');
    const handleH     = document.getElementById('resizeH');

    // ── Saved sizes (localStorage) ──────────────────
    const stored = (() => {
      try { return JSON.parse(localStorage.getItem('cssforge-sizes') || '{}'); }
      catch { return {}; }
    })();
    const saveSize = (key, val) => {
      try {
        const d = JSON.parse(localStorage.getItem('cssforge-sizes') || '{}');
        d[key] = val;
        localStorage.setItem('cssforge-sizes', JSON.stringify(d));
      } catch {}
    };

    // ── Apply stored left-panel width ────────────────
    if (stored.leftW && stored.leftW >= 180 && stored.leftW <= 700) {
      leftPanel.style.width = stored.leftW + 'px';
    }
    // ── Apply stored code-pane height ────────────────
    if (stored.codeH && stored.codeH >= 80) {
      codePane.style.height = stored.codeH + 'px';
    }

    // ── Vertical handle (left ↔ right) ───────────────
    let vDragging = false, vStartX = 0, vStartW = 0;

    handleV.addEventListener('mousedown', e => {
      vDragging = true;
      vStartX   = e.clientX;
      vStartW   = leftPanel.getBoundingClientRect().width;
      handleV.classList.add('dragging');
      document.body.classList.add('resizing', 'resizing-v');
      e.preventDefault();
    });

    // ── Horizontal handle (preview ↕ code) ───────────
    let hDragging = false, hStartY = 0, hStartH = 0, hTotalH = 0;

    handleH.addEventListener('mousedown', e => {
      hDragging = true;
      hStartY   = e.clientY;
      hStartH   = codePane.getBoundingClientRect().height;
      hTotalH   = rightPanel.getBoundingClientRect().height;
      handleH.classList.add('dragging');
      document.body.classList.add('resizing', 'resizing-h');
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (vDragging) {
        const delta  = e.clientX - vStartX;
        const newW   = Math.min(700, Math.max(180, vStartW + delta));
        leftPanel.style.width = newW + 'px';
      }
      if (hDragging) {
        const delta      = hStartY - e.clientY;          // drag up = bigger code
        const newCodeH   = Math.min(hTotalH - 100, Math.max(80, hStartH + delta));
        codePane.style.height = newCodeH + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      if (vDragging) {
        vDragging = false;
        handleV.classList.remove('dragging');
        document.body.classList.remove('resizing', 'resizing-v');
        saveSize('leftW', parseInt(leftPanel.style.width));
      }
      if (hDragging) {
        hDragging = false;
        handleH.classList.remove('dragging');
        document.body.classList.remove('resizing', 'resizing-h');
        saveSize('codeH', parseInt(codePane.style.height));
      }
    });

    // ── Touch support ────────────────────────────────
    handleV.addEventListener('touchstart', e => {
      vDragging = true;
      vStartX   = e.touches[0].clientX;
      vStartW   = leftPanel.getBoundingClientRect().width;
      handleV.classList.add('dragging');
    }, { passive: true });

    handleH.addEventListener('touchstart', e => {
      hDragging = true;
      hStartY   = e.touches[0].clientY;
      hStartH   = codePane.getBoundingClientRect().height;
      hTotalH   = rightPanel.getBoundingClientRect().height;
      handleH.classList.add('dragging');
    }, { passive: true });

    document.addEventListener('touchmove', e => {
      if (vDragging) {
        const delta = e.touches[0].clientX - vStartX;
        const newW  = Math.min(700, Math.max(180, vStartW + delta));
        leftPanel.style.width = newW + 'px';
      }
      if (hDragging) {
        const delta    = hStartY - e.touches[0].clientY;
        const newCodeH = Math.min(hTotalH - 100, Math.max(80, hStartH + delta));
        codePane.style.height = newCodeH + 'px';
      }
    }, { passive: true });

    document.addEventListener('touchend', () => {
      if (vDragging) { vDragging = false; handleV.classList.remove('dragging'); saveSize('leftW', parseInt(leftPanel.style.width)); }
      if (hDragging) { hDragging = false; handleH.classList.remove('dragging'); saveSize('codeH', parseInt(codePane.style.height)); }
    });

    // ── Double-click: reset to default ───────────────
    handleV.addEventListener('dblclick', () => {
      leftPanel.style.width = '318px';
      saveSize('leftW', 318);
      toast('↺ Linkes Panel zurückgesetzt');
    });
    handleH.addEventListener('dblclick', () => {
      codePane.style.height = '';
      saveSize('codeH', null);
      toast('↺ Code-Panel zurückgesetzt');
    });
  })();


  // ── Initial CSS output ─────────────────────────────
  applyPreview();

  // ── Hint toast ─────────────────────────────────────
  setTimeout(() => toast('⬡ CSS FORGE bereit — Strg+S zum Speichern'), 800);
});
