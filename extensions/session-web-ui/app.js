/**
 * pi Session Web UI — Application Logic
 *
 * Z-Index Scale (see index.html CSS for layer documentation):
 *   Layer 0    — Content (default stacking)
 *   Layer 10   — Fixed elements (header, scroll-to-bottom btn)
 *   Layer 50   — Overlays
 *   Layer 100  — Modals (popups, dialogs)
 *   Layer 9999 — Global effects (noise grain texture)
 */

// ═══════════════════════════════════════════════════════════════════
// SVG Icon Library — lightweight inline icons, no emoji
// ═══════════════════════════════════════════════════════════════════
const ICONS = {
  /* ── Tool type icons (16×16, stroke-width 1.5) ── */
  bash:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<rect x="1.5" y="2.5" width="13" height="11" rx="2"/><polyline points="4.5 6.5 6.5 8.5 4.5 10.5"/><line x1="8" y1="10.5" x2="10" y2="10.5"/></svg>',
  read:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M3 1.5h6.17a2 2 0 0 1 1.41.59l2.33 2.33a2 2 0 0 1 .59 1.41V13.5a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1z"/><line x1="5" y1="8" x2="11" y2="8"/><line x1="5" y1="10.5" x2="9" y2="10.5"/></svg>',
  edit:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 2.5a1.41 1.41 0 0 1 2 2L5.5 12l-3 1 1-3L11 2.5z"/></svg>',
  write:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M11 2.5a1.41 1.41 0 0 1 2 2L5.5 12l-3 1 1-3L11 2.5z"/></svg>',
  grep:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>',
  glob:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="6.5" cy="6.5" r="4.5"/><line x1="10" y1="10" x2="14" y2="14"/></svg>',
  list:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M2 4a2 2 0 0 1 2-2h2.17a2 2 0 0 1 1.41.59l1 1a2 2 0 0 0 1.41.59H13a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z"/></svg>',
  web:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="8" cy="8" r="6.5"/><ellipse cx="8" cy="8" rx="3" ry="6.5"/><line x1="1.5" y1="8" x2="14.5" y2="8"/></svg>',
  task:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polygon points="8.5 1.5 3.5 9 7 9 5.5 14.5 12 7 8 7 10 1.5"/></svg>',
  question:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<circle cx="8" cy="8" r="6.5"/><path d="M6 6a2 2 0 0 1 2-2 2 2 0 0 1 2 2c0 1.5-2 2-2 3"/><circle cx="8" cy="12" r="0.5" fill="currentColor" stroke="none"/></svg>',
  mcp:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M7 2H3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h2.5a1.5 1.5 0 0 1 0 3H3a1 1 0 0 0-1 1v3a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-2.5a1.5 1.5 0 0 1 3 0V13a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2.5a1.5 1.5 0 0 1 0-3H13a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1h-3a1 1 0 0 0-1 1v2.5a1.5 1.5 0 0 1-3 0V3a1 1 0 0 0-1-1z"/></svg>',
  default:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
    '<polyline points="5 2 1 6 5 10"/><polyline points="11 2 15 6 11 10"/><line x1="9" y1="2" x2="7" y2="14"/></svg>',

  /* ── UI chrome icons ── */
  chevronDown:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6l4 4 4-4"/></svg>',
  chevronRight:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4l4 4-4 4"/></svg>',
  arrowDown:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 8 11 13 6"/></svg>',
  copy:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
  check:
    '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
  send:
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>',
  stop:
    '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="3" width="10" height="10" rx="2"/></svg>',
  folderOpen:
    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4a2 2 0 0 1 2-2h2.17a2 2 0 0 1 1.41.59l1.42 1.41a2 2 0 0 0 1.41.59H13a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4z"/></svg>',
  menu:
    '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 4h12M2 8h12M2 12h12"/></svg>',
  close:
    '<svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="3" x2="13" y2="13"/><line x1="13" y1="3" x2="3" y2="13"/></svg>',
  themeSystem:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>',
  themeDark:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>',
  themeLight:
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
};

// ═══════════════════════════════════════════════════════════════════
// State
// ═══════════════════════════════════════════════════════════════════
const state = {
  connected: false, streaming: false, thinking: false, agentActive: false,
  model: null, cwd: '', sessionId: null, reconnecting: false, eventSource: null,
  toolOutputs: new Map(),
  currentAssistantEl: null, currentThinkingEl: null,
  theme: 'system', _mdTimer: null,
  modelPopupOpen: false, modelPopupEl: null, availableModels: [],
  activeCwd: null,
  // Timers for running tools & thinking
  _toolTimers: new Map(), _thinkStart: null,
  _lastMsgDate: null,
  // Stats popup
  statsPopupOpen: false,
  usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, reasoning: null, cacheHitRate: 0 },
  context: { tokens: null, window: 0, maxTokens: 0 },
};

// ═══════════════════════════════════════════════════════════════════
// DOM refs
// ═══════════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const D = {
  dot: $('connectionDot'),
  modelBadge: $('modelBadge'), modelProv: $('modelProvider'), modelName: $('modelName'),
  cwd: $('headerCwd'),
  thinkInd: $('thinkingIndicator'), thinkTime: $('thinkTime'),
  themeBtn: $('themeToggle'), themeIcon: $('themeIcon'),
  msgCtr: $('messagesContainer'), msgList: $('messagesList'), empty: $('emptyState'),
  scrollBtn: $('scrollBottomBtn'),
  input: $('messageInput'), send: $('btnSend'),
  statsBtn: $('statsBtn'), statsPopup: $('statsPopup'),
  statsInput: $('statsInput'), statsOutput: $('statsOutput'), statsReasoning: $('statsReasoning'),
  statsCacheRead: $('statsCacheRead'), statsCacheWrite: $('statsCacheWrite'), statsCacheHitRate: $('statsCacheHitRate'),
  statsContextTokens: $('statsContextTokens'), statsMaxTokens: $('statsMaxTokens'),
};

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════
function esc(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function trunc(s, n) { if (!s) return ''; return s.length <= n ? s : s.slice(0, n) + '\u2026'; }
function mkEl(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }

/**
 * Format number with k/M abbreviation.
 * < 1000: raw number (e.g. 123)
 * 1,000 - 999,999: k (e.g. 12.3k)
 * ≥ 1,000,000: M (e.g. 1.2M)
 */
function formatTokens(n) {
  if (n == null) return '--';
  if (n < 1000) return n.toString();
  if (n < 1000000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
}

// ═══════════════════════════════════════════════════════════════════
// Theme
// ═══════════════════════════════════════════════════════════════════
const THEME_CYCLE = ['system', 'dark', 'light'];
const THEME_ICONS = { system: ICONS.themeSystem, dark: ICONS.themeDark, light: ICONS.themeLight };

function getTheme() { try { return localStorage.getItem('pi-web-theme') || 'system'; } catch { return 'system'; } }
function setTheme(t) { try { localStorage.setItem('pi-web-theme', t); } catch {} }

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  state.theme = t;
  D.themeIcon.innerHTML = THEME_ICONS[t] || ICONS.themeSystem;
}

applyTheme(getTheme());
D.themeBtn.addEventListener('click', () => {
  const i = THEME_CYCLE.indexOf(state.theme);
  const n = THEME_CYCLE[(i + 1) % 3];
  applyTheme(n); setTheme(n);
});

// ═══════════════════════════════════════════════════════════════════
// Tool Metadata
// ═══════════════════════════════════════════════════════════════════
const TOOL_META = {
  bash:     { icon: ICONS.bash,     cls: 'bash',     label: 'shell' },
  read:     { icon: ICONS.read,     cls: 'read',     label: 'read' },
  edit:     { icon: ICONS.edit,     cls: 'edit',     label: 'edit' },
  write:    { icon: ICONS.write,    cls: 'write',    label: 'write' },
  grep:     { icon: ICONS.grep,     cls: 'grep',     label: 'search' },
  glob:     { icon: ICONS.glob,     cls: 'grep',     label: 'find' },
  list:     { icon: ICONS.list,     cls: 'list',     label: 'list' },
  webfetch: { icon: ICONS.web,      cls: 'web',      label: 'web fetch' },
  websearch:{ icon: ICONS.web,      cls: 'web',      label: 'web search' },
  task:     { icon: ICONS.task,     cls: 'task',     label: 'sub-agent' },
  question: { icon: ICONS.question, cls: 'question', label: 'question' },
  mcp:      { icon: ICONS.mcp,      cls: 'mcp',      label: 'mcp' },
};
function toolMeta(name) { return TOOL_META[name] || { icon: ICONS.default, cls: 'default', label: name }; }

function toolSub(name, args) {
  if (!args) return '';
  switch (name) {
    case 'bash': return args.command || '';
    case 'read': case 'edit': case 'write': return args.filePath || args.path || '';
    case 'grep': return args.pattern ? '/' + args.pattern + '/' : '';
    case 'glob': return args.pattern || '';
    case 'list': return args.path || '';
    case 'webfetch': return args.url || '';
    case 'websearch': return args.query || '';
    default: return args.subject || args.description || '';
  }
}

function buildCmdLine(name, args) {
  if (!args) return '$ ' + name;
  switch (name) {
    case 'bash': return '$ ' + (args.command || 'bash');
    case 'read': return '$ read ' + (args.filePath || args.path || '');
    case 'edit': return '$ edit ' + (args.filePath || args.path || '');
    case 'write': return '$ write ' + (args.filePath || args.path || '');
    case 'grep': return '$ grep ' + (args.pattern || '');
    case 'glob': return '$ find ' + (args.pattern || '');
    case 'list': return '$ ls ' + (args.path || '');
    case 'webfetch': return '$ fetch ' + (args.url || '');
    case 'websearch': return '$ search ' + (args.query || '');
    default: return '$ ' + name;
  }
}

function toolDisplayContent(card, output) {
  const cmd = card.dataset.cmdLine || '';
  if (!output) return cmd;
  return cmd + '\n' + output;
}

// ═══════════════════════════════════════════════════════════════════
// Markdown — with optional highlight.js integration
// ═══════════════════════════════════════════════════════════════════
(function initMarked() {
  const renderer = new marked.Renderer();

  renderer.link = ({ href, title, text: t }) => {
    const titleAttr = title ? ` title="${esc(title)}"` : '';
    return `<a href="${esc(href)}" target="_blank" rel="noopener"${titleAttr}>${t}</a>`;
  };

  renderer.code = ({ text: code, lang }) => {
    const l = lang ? esc(lang) : '';
    const label = l ? `<span class="code-lang">${l}</span>` : '';
    let highlighted;
    if (l && typeof hljs !== 'undefined' && hljs.getLanguage(l)) {
      try {
        highlighted = hljs.highlight(code, { language: l }).value;
      } catch { highlighted = esc(code); }
    } else {
      highlighted = esc(code);
    }
    return `<div style="position:relative"><pre><code class="language-${l} hljs">${highlighted}</code>${label}</pre></div>\n`;
  };

  marked.setOptions({
    renderer,
    gfm: true,
    breaks: true,
  });
})();

function md(text) {
  if (!text) return '';
  try {
    return marked.parse(text);
  } catch (e) {
    console.error('md parse error:', e);
    return esc(text);
  }
}

// ═══════════════════════════════════════════════════════════════════
// Date Separator
// ═══════════════════════════════════════════════════════════════════
function dateKey(ts) {
  if (!ts) return null;
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function insertDateSep(ts) {
  const dk = dateKey(ts);
  if (!dk || dk === state._lastMsgDate) return;
  state._lastMsgDate = dk;
  const sep = mkEl('div', 'date-separator');
  sep.innerHTML = '<span>' + esc(dk) + '</span>';
  D.msgList.appendChild(sep);
}

// ═══════════════════════════════════════════════════════════════════
// Input
// ═══════════════════════════════════════════════════════════════════
D.input.addEventListener('input', () => {
  D.input.style.height = 'auto';
  D.input.style.height = Math.min(D.input.scrollHeight, 200) + 'px';
  if (!D.send.classList.contains('stop-mode')) {
    D.send.disabled = !D.input.value.trim();
  }
});

D.input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    if (D.send.classList.contains('stop-mode')) {
      interrupt();
    } else {
      sendMsg();
    }
  }
});

D.send.addEventListener('click', () => {
  if (D.send.classList.contains('stop-mode')) {
    interrupt();
  } else {
    sendMsg();
  }
});

document.addEventListener('keydown', e => {
  if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
    const t = document.activeElement?.tagName;
    if (t !== 'INPUT' && t !== 'TEXTAREA') { e.preventDefault(); D.input.focus(); }
  }
});

async function sendMsg() {
  const text = D.input.value.trim();
  if (!text || !state.connected) return;
  D.input.value = ''; D.input.style.height = 'auto'; D.send.disabled = true;
  try {
    const r = await fetch('/message', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
    if (!r.ok) throw Error('send failed');
  } catch (e) { console.error('send err:', e); }
}

// ═══════════════════════════════════════════════════════════════════
// Interrupt
// ═══════════════════════════════════════════════════════════════════
async function interrupt() {
  try { await fetch('/interrupt', { method: 'POST' }); } catch (e) { console.error('interrupt err:', e); }
}

// ═══════════════════════════════════════════════════════════════════
// Connection Status
// ═══════════════════════════════════════════════════════════════════
function setBanner(status, text) {
  const label = D.dot.querySelector('.connection-chip-label');
  if (label) label.textContent = status;
  D.dot.className = 'connection-chip ' + status;
  D.dot.title = status.charAt(0).toUpperCase() + status.slice(1);
}

// ═══════════════════════════════════════════════════════════════════
// UI Refreshes
// ═══════════════════════════════════════════════════════════════════
function updateSendBtn() {
  const isActive = (state.streaming || state.thinking || state.agentActive) && state.connected;
  D.send.classList.toggle('stop-mode', isActive);
  D.send.disabled = isActive ? false : !D.input.value.trim();
  D.send.querySelector('.btn-send-icon').innerHTML = isActive ? ICONS.stop : ICONS.send;
}

function shortCwd(fullPath) {
  if (!fullPath) return '';
  // On narrow screens (≤768px) show only the last directory component
  if (window.innerWidth <= 768) {
    const lastSep = fullPath.lastIndexOf('/');
    return lastSep >= 0 ? fullPath.slice(lastSep + 1) || '/' : fullPath;
  }
  return fullPath;
}

function formatCwd(fullPath) {
  return shortCwd(fullPath);
}

// Re-render CWD on window resize (debounced)
let _cwdResizeTimer = null;
window.addEventListener('resize', () => {
  if (_cwdResizeTimer) clearTimeout(_cwdResizeTimer);
  _cwdResizeTimer = setTimeout(() => {
    if (state.cwd) {
      const span = D.cwd.querySelector('span');
      if (span) span.textContent = formatCwd(state.cwd);
    }
  }, 150);
});

function refresh() {
  if (state.model) {
    D.modelProv.textContent = state.model.provider || '-';
    D.modelName.textContent = state.model.name || 'unknown';
    D.modelBadge.title = state.model.provider + ' / ' + (state.model.name || 'unknown');
    D.modelBadge.classList.remove('hidden');
  } else {
    D.modelBadge.classList.add('hidden');
  }
  if (state.cwd) {
    const span = D.cwd.querySelector('span');
    if (span) span.textContent = formatCwd(state.cwd);
    D.cwd.title = state.cwd;
    D.cwd.classList.remove('hidden');
  } else {
    D.cwd.classList.add('hidden');
  }
  updateSendBtn();
  if (state.modelPopupOpen) updatePopupCheck();
}

// ═══════════════════════════════════════════════════════════════════
// Stats Popup
// ═══════════════════════════════════════════════════════════════════
function updateStatsPopup() {
  const { usage, context } = state;
  D.statsInput.textContent = formatTokens(usage.input);
  D.statsOutput.textContent = formatTokens(usage.output);
  D.statsReasoning.textContent = usage.reasoning != null ? formatTokens(usage.reasoning) : '-';
  D.statsCacheRead.textContent = formatTokens(usage.cacheRead);
  D.statsCacheWrite.textContent = formatTokens(usage.cacheWrite);
  D.statsCacheHitRate.textContent = usage.cacheHitRate.toFixed(1) + '%';
  D.statsContextTokens.textContent = formatTokens(context.tokens) + ' / ' + formatTokens(context.window);
  D.statsMaxTokens.textContent = formatTokens(context.maxTokens);
}

function positionStatsPopup() {
  const btnRect = D.statsBtn.getBoundingClientRect();
  const popup = D.statsPopup;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;

  popup.style.position = 'fixed';
  // Temporarily show to measure actual size, then hide again
  popup.classList.remove('hidden');
  const popupWidth = Math.max(popup.offsetWidth || 240, 200);
  const popupHeight = Math.max(popup.offsetHeight || 300, 200);
  popup.classList.add('hidden');

  let top = btnRect.bottom + 6;
  let left = btnRect.right - popupWidth; // right-align to button

  // Ensure popup doesn't go off edges
  if (left < 16) left = 16;
  if (left + popupWidth > viewportWidth - 16) left = viewportWidth - popupWidth - 16;
  if (top + popupHeight > viewportHeight - 16 - safeBottom) top = btnRect.top - popupHeight - 6;

  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
}

function toggleStatsPopup(e) {
  e.stopPropagation();
  if (state.statsPopupOpen) {
    closeStatsPopup();
  } else {
    openStatsPopup();
  }
}

function openStatsPopup() {
  state.statsPopupOpen = true;
  updateStatsPopup();
  positionStatsPopup();
  D.statsPopup.classList.remove('hidden');
}

function closeStatsPopup() {
  state.statsPopupOpen = false;
  D.statsPopup.classList.add('hidden');
}

D.statsBtn.addEventListener('click', toggleStatsPopup);

// Close stats popup on click outside
document.addEventListener('click', e => {
  if (state.statsPopupOpen && !D.statsPopup.contains(e.target) && e.target !== D.statsBtn && !D.statsBtn.contains(e.target)) {
    closeStatsPopup();
  }
});

// Close stats popup on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.statsPopupOpen) {
    closeStatsPopup();
    e.stopPropagation();
  }
});

// ═══════════════════════════════════════════════════════════════════
// Model Popup (with search)
// ═══════════════════════════════════════════════════════════════════
D.modelBadge.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (state.modelPopupOpen) { closeModelPopup(); return; }
  await openModelPopup();
});

async function openModelPopup() {
  state.modelPopupOpen = true;
  if (state.modelPopupEl) { state.modelPopupEl.remove(); state.modelPopupEl = null; }

  const popup = mkEl('div', 'model-popup');
  popup.innerHTML = '<div class="model-popup-loading"><div class="spinner"></div><div style="margin-top:8px">Loading models...</div></div>';
  
  // Position popup using fixed positioning
  const badgeRect = D.modelBadge.getBoundingClientRect();
  popup.style.position = 'fixed';
  
  // Calculate initial position
  let top = badgeRect.bottom + 6;
  let left = badgeRect.left;
  
  // Get viewport dimensions
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const safeBottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
  
  // Dynamic sizing: min(desired, viewport - margins)
  const desiredWidth = Math.min(360, viewportWidth - 32);
  const desiredMaxHeight = Math.min(360, viewportHeight - 32 - safeBottom);
  
  // Ensure popup doesn't go off right edge
  if (left + desiredWidth > viewportWidth - 16) {
    left = viewportWidth - desiredWidth - 16;
  }
  
  // Ensure popup doesn't go off left edge
  if (left < 16) left = 16;
  
  // Ensure popup doesn't go off bottom
  if (top + desiredMaxHeight > viewportHeight - 16 - safeBottom) {
    top = badgeRect.top - desiredMaxHeight - 6;
  }
  
  popup.style.top = top + 'px';
  popup.style.left = left + 'px';
  popup.style.maxHeight = desiredMaxHeight + 'px';
  
  state.modelPopupEl = popup;
  document.body.appendChild(popup);

  // Fetch models
  try {
    const r = await fetch('/models');
    const data = await r.json();
    state.availableModels = data.models || [];
    
    popup.innerHTML = '';
    
    // Header
    const header = mkEl('div', 'model-popup-header');
    header.innerHTML = '<span>Switch Model</span><span style="font-size:11px;color:var(--text-faint)">' + (state.availableModels.length) + ' available</span>';
    popup.appendChild(header);
    
    // Search input
    const searchContainer = mkEl('div', 'model-popup-search');
    searchContainer.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input type="text" class="model-popup-search-input" placeholder="Search models..." autofocus>';
    popup.appendChild(searchContainer);
    
    const searchInput = searchContainer.querySelector('input');
    
    // Model list container
    const listContainer = mkEl('div', 'model-popup-list');
    listContainer.style.maxHeight = (desiredMaxHeight - 100) + 'px';
    listContainer.style.overflowY = 'auto';
    popup.appendChild(listContainer);
    
    function renderModels(filter = '') {
      listContainer.innerHTML = '';
      const filtered = state.availableModels.filter(m => {
        if (!filter) return true;
        const f = filter.toLowerCase();
        return (m.provider && m.provider.toLowerCase().includes(f)) ||
               (m.name && m.name.toLowerCase().includes(f)) ||
               (m.id && m.id.toLowerCase().includes(f));
      });
      
      if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="model-popup-loading">No models match</div>';
        return;
      }
      
      for (const m of filtered) {
        const item = mkEl('div', 'model-popup-item');
        const isActive = state.model && m.provider === state.model.provider && m.id === state.model.id;
        if (isActive) item.classList.add('active');
        
        item.innerHTML = `
          <span class="popup-provider">${esc(m.provider)}</span>
          <span class="popup-name">${esc(m.name || m.id)}</span>
          ${isActive ? '<span class="popup-check">' + ICONS.check + '</span>' : ''}
        `;
        
        item.addEventListener('click', async () => {
          try {
            const r = await fetch('/model', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ provider: m.provider, id: m.id })
            });
            const result = await r.json();
            if (result.ok) {
              state.model = m;
              refresh();
              closeModelPopup();
            } else {
              item.style.background = 'var(--bg-danger)';
              setTimeout(() => item.style.background = '', 1000);
            }
          } catch (e) {
            console.error('model switch err:', e);
          }
        });
        
        listContainer.appendChild(item);
      }
    }
    
    renderModels();
    searchInput.focus();
    
    searchInput.addEventListener('input', () => {
      renderModels(searchInput.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModelPopup();
      }
    });
    
  } catch (e) {
    popup.innerHTML = '<div class="model-popup-error">Failed to load models</div>';
  }
}

function updatePopupCheck() {
  if (!state.modelPopupEl) return;
  state.modelPopupEl.querySelectorAll('.model-popup-item').forEach(item => {
    const provider = item.querySelector('.popup-provider')?.textContent;
    const name = item.querySelector('.popup-name')?.textContent;
    const isActive = state.model && provider === state.model.provider && (name === state.model.name || name === state.model.id);
    
    const existingCheck = item.querySelector('.popup-check');
    if (isActive && !existingCheck) {
      const checkSpan = mkEl('span', 'popup-check');
      checkSpan.innerHTML = ICONS.check;
      item.appendChild(checkSpan);
      item.classList.add('active');
    } else if (!isActive && existingCheck) {
      existingCheck.remove();
      item.classList.remove('active');
    }
  });
}

function closeModelPopup() {
  state.modelPopupOpen = false;
  if (state.modelPopupEl) {
    state.modelPopupEl.remove();
    state.modelPopupEl = null;
  }
}

// Close model popup on click outside
document.addEventListener('click', e => {
  if (state.modelPopupOpen && state.modelPopupEl && !state.modelPopupEl.contains(e.target) && !D.modelBadge.contains(e.target)) {
    closeModelPopup();
  }
});

// ═══════════════════════════════════════════════════════════════════
// Messages
// ═══════════════════════════════════════════════════════════════════
function addUserMsg(msg) {
  const el = mkEl('div', 'message user');
  el.dataset.msgId = msg.id || '';
  const ts = msg.time?.created || msg.timestamp;
  const t = ts ? new Date(ts).toLocaleTimeString() : '';
  const text = getHistoryText(msg);
  el.innerHTML = `
    <div class="message-header">
      <span class="message-meta">${t}</span>
    </div>
    <div class="message-content">${esc(text)}</div>`;
  D.msgList.appendChild(el);
}

function addAssistantMsg(msg) {
  const el = mkEl('div', 'message assistant streaming');
  el.dataset.msgId = msg?.id || '';
  const ts = msg?.time?.created || msg?.timestamp;
  const t = ts ? new Date(ts).toLocaleTimeString() : '';
  el.innerHTML = `
    <div class="message-header">
      <span class="message-role">pi</span>
      <span class="message-meta">${t}</span>
    </div>
    <div class="message-content"></div>`;
  D.msgList.appendChild(el);
  return el;
}

function hideEmpty() {
  if (D.empty) D.empty.classList.add('hidden');
}

function scrollDown(instant) {
  requestAnimationFrame(() => {
    D.msgCtr.scrollTo({ top: D.msgCtr.scrollHeight, behavior: instant ? 'instant' : 'smooth' });
  });
}

// ═══════════════════════════════════════════════════════════════════
// Streaming
// ═══════════════════════════════════════════════════════════════════
function streamText(delta) {
  if (!state.currentAssistantEl) state.currentAssistantEl = addAssistantMsg({ id: 't-' + Date.now() });
  const bubble = state.currentAssistantEl.querySelector('.message-content');
  let ce = bubble;
  if (!ce) { ce = mkEl('div', 'message-content'); state.currentAssistantEl.appendChild(ce); }
  const plain = (ce.getAttribute('data-plain') || '') + delta;
  ce.setAttribute('data-plain', plain);

  if (state._mdTimer) clearTimeout(state._mdTimer);
  state._mdTimer = setTimeout(() => {
    ce.innerHTML = md(plain);
    ce.classList.add('streaming-cursor');
    scrollDown();
  }, 40);
}

function streamThinking(delta) {
  if (!state.currentAssistantEl) state.currentAssistantEl = addAssistantMsg({ id: 't-' + Date.now() });
  if (!state._thinkStart) state._thinkStart = Date.now();
  let tb = state.currentAssistantEl.querySelector('.thinking-block');
  if (!tb) {
    tb = mkEl('div', 'thinking-block');
    tb.innerHTML = `
      <div class="thinking-label">
        <span class="thinking-toggle">${ICONS.chevronRight}</span>
        <span>thinking</span>
        <span class="think-elapsed" style="margin-left:auto;font-variant-numeric:tabular-nums;opacity:0.6"></span>
      </div>
      <div class="thinking-text"></div>`;
    tb.querySelector('.thinking-label').addEventListener('click', () => {
      tb.classList.toggle('open');
    });
    const bubble = state.currentAssistantEl.querySelector('.message-content');
    if (bubble) bubble.parentNode.insertBefore(tb, bubble);
    else state.currentAssistantEl.appendChild(tb);
    state.currentThinkingEl = tb;
    _startThinkTimer(tb);
  }
  const tt = tb.querySelector('.thinking-text');
  if (tt) tt.textContent += delta;
  scrollDown();
}

function _startThinkTimer(tb) {
  if (!tb) return;
  const elapsedEl = tb.querySelector('.think-elapsed');
  if (!elapsedEl) return;
  const update = () => {
    if (!state._thinkStart) { elapsedEl.textContent = ''; return; }
    const s = Math.floor((Date.now() - state._thinkStart) / 1000);
    elapsedEl.textContent = s > 0 ? s + 's' : '';
  };
  update();
  state._toolTimers.set('__think__', setInterval(update, 1000));
}

function finalizeAssistant() {
  if (state._mdTimer) { clearTimeout(state._mdTimer); state._mdTimer = null; }
  if (state._thinkStart) {
    const ti = state._toolTimers.get('__think__');
    if (ti) { clearInterval(ti); state._toolTimers.delete('__think__'); }
    state._thinkStart = null;
  }
  if (state.currentAssistantEl) {
    const ce = state.currentAssistantEl.querySelector('.message-content');
    if (ce) {
      ce.classList.remove('streaming-cursor');
      const plain = ce.getAttribute('data-plain') || '';
      if (plain.trim()) {
        ce.innerHTML = md(plain);
      } else {
        ce.remove();
      }
    }
    // Remove elapsed timer from thinking blocks
    state.currentAssistantEl.querySelectorAll('.think-elapsed').forEach(el => el.textContent = '');
    const hasContent = state.currentAssistantEl.querySelector('.message-content, .thinking-block, .tool-card');
    if (!hasContent) {
      state.currentAssistantEl.remove();
      state.currentAssistantEl = null;
      state.currentThinkingEl = null;
      return;
    }
    state.currentAssistantEl.classList.remove('streaming');
    state.currentAssistantEl = null;
    state.currentThinkingEl = null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// Tool Card (with elapsed timer)
// ═══════════════════════════════════════════════════════════════════
function addTool(data) {
  const { toolCallId: id, toolName: name, args } = data;
  const meta = toolMeta(name);
  const card = mkEl('div', 'tool-card');
  card.dataset.id = id; card.dataset.name = name;
  state.toolOutputs.set(id, '');
  const startTime = Date.now();

  card.innerHTML = `
    <div class="tool-card-header">
      <div class="tool-card-info">
        <div class="tool-icon ${meta.cls}">${meta.icon}</div>
        <div><div class="tool-label">${meta.label}</div>
        <div class="tool-subtitle">${esc(toolSub(name, args))}</div></div>
      </div>
      <div class="tool-status"><div class="spinner"></div><span>running</span><span class="tool-elapsed"></span></div>
      <span class="chevron">${ICONS.chevronDown}</span>
    </div>
    <div class="tool-card-body">
      <button class="tool-copy-btn" onclick="copyToolOutput(this)" title="Copy output">${ICONS.copy} <span>Copy</span></button>
      <pre></pre>
    </div>`;

  card.dataset.cmdLine = buildCmdLine(name, args);
  card.querySelector('pre').textContent = card.dataset.cmdLine;

  card.querySelector('.tool-card-header').addEventListener('click', () => {
    const body = card.querySelector('.tool-card-body');
    const ch = card.querySelector('.tool-card-header .chevron');
    body.classList.toggle('open'); ch.classList.toggle('open');
  });

  // Start elapsed timer
  const timer = setInterval(() => {
    const elapsed = card.querySelector('.tool-elapsed');
    if (elapsed) {
      const s = Math.floor((Date.now() - startTime) / 1000);
      elapsed.textContent = s > 0 ? ' ' + s + 's' : '';
    }
  }, 1000);
  state._toolTimers.set(id, { timer, startTime });

  D.msgList.appendChild(card); scrollDown();
}

function updateTool(data) {
  const { toolCallId: id, partialResult: pr } = data;
  const card = D.msgList.querySelector(`.tool-card[data-id="${id}"]`);
  if (!card) return;
  const body = card.querySelector('.tool-card-body'), pre = body?.querySelector('pre');
  const out = state.toolOutputs.get(id) || '';

  let add = '';
  if (typeof pr === 'string') add = pr;
  else if (pr?.content) {
    add = Array.isArray(pr.content) ? pr.content.map(c => c.text || '').join('') : String(pr.content);
  }
  const nout = out + add;
  state.toolOutputs.set(id, nout);
  if (pre) pre.textContent = toolDisplayContent(card, nout);
}

function finalizeTool(data) {
  const { toolCallId: id, result, isError } = data;
  const card = D.msgList.querySelector(`.tool-card[data-id="${id}"]`);
  if (!card) return;
  // Stop timer
  const timerInfo = state._toolTimers.get(id);
  if (timerInfo) { clearInterval(timerInfo.timer); state._toolTimers.delete(id); }
  const status = card.querySelector('.tool-status');
  const elapsed = card.querySelector('.tool-elapsed');
  if (isError) {
    status.innerHTML = '<div class="dot-error"></div><span style="color:var(--text-danger)">error</span>';
  } else {
    status.innerHTML = '<div class="dot-success"></div><span style="color:var(--text-success)">done</span>';
  }
  if (elapsed) {
    const s = timerInfo ? Math.floor((Date.now() - timerInfo.startTime) / 1000) : 0;
    elapsed.textContent = s > 0 ? ' ' + s + 's' : '';
  }

  const body = card.querySelector('.tool-card-body'), pre = body?.querySelector('pre');
  if (pre && result) {
    let txt = '';
    if (typeof result === 'string') txt = result;
    else if (result.content) {
      txt = Array.isArray(result.content) ? result.content.map(c => c.text || '').join('\n') : String(result.content);
    } else txt = JSON.stringify(result, null, 2);
    pre.textContent = toolDisplayContent(card, txt);
    state.toolOutputs.set(id, txt);
  }
}

// ═══════════════════════════════════════════════════════════════════
// History Renderer
// ═══════════════════════════════════════════════════════════════════
function renderHistory(history) {
  if (!Array.isArray(history) || history.length === 0) return;
  state._lastMsgDate = null;

  let pendingToolCallCards = [];

  for (const msg of history) {
    const role = msg.role;
    const ts = msg.time?.created || msg.time;

    if (role === 'user') {
      insertDateSep(ts);
      const el = mkEl('div', 'message user');
      el.dataset.msgId = msg.id || '';
      const t = ts ? new Date(ts).toLocaleTimeString() : '';
      const text = getHistoryText(msg);
      el.innerHTML = `
        <div class="message-header">
          <span class="message-meta">${t}</span>
        </div>
        <div class="message-content">${esc(text)}</div>`;
      D.msgList.appendChild(el);
    }

    else if (role === 'assistant') {
      insertDateSep(ts);
      const el = mkEl('div', 'message assistant');
      el.dataset.msgId = msg.id || '';
      const t = ts ? new Date(ts).toLocaleTimeString() : '';
      el.innerHTML = `
        <div class="message-header">
          <span class="message-role">pi</span>
          <span class="message-meta">${t}</span>
        </div>`;
      D.msgList.appendChild(el);

      const content = Array.isArray(msg.content) ? msg.content : [];
      let textParts = [];

      for (const block of content) {
        if (block.type === 'thinking') {
          const tb = mkEl('div', 'thinking-block');
          tb.innerHTML = `
            <div class="thinking-label">
              <span class="thinking-toggle">${ICONS.chevronRight}</span>
              <span>thinking</span>
            </div>
            <div class="thinking-text">${esc(block.thinking || '')}</div>`;
          tb.querySelector('.thinking-label').addEventListener('click', () => {
            tb.classList.toggle('open');
          });
          el.appendChild(tb);
        } else if (block.type === 'toolCall') {
          const meta = toolMeta(block.name || 'unknown');
          const card = mkEl('div', 'tool-card');
          const callId = block.id || 'hist-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
          card.dataset.id = callId;
          card.dataset.name = block.name || '';
          card.innerHTML = `
            <div class="tool-card-header">
              <div class="tool-card-info">
                <div class="tool-icon ${meta.cls}">${meta.icon}</div>
                <div><div class="tool-label">${meta.label}</div>
                <div class="tool-subtitle">${esc(toolSub(block.name, block.input || block.arguments))}</div></div>
              </div>
              <div class="tool-status"><div class="spinner"></div><span>waiting</span></div>
              <span class="chevron">${ICONS.chevronDown}</span>
            </div>
            <div class="tool-card-body">
              <button class="tool-copy-btn" onclick="copyToolOutput(this)" title="Copy output">${ICONS.copy} <span>Copy</span></button>
              <pre></pre>
            </div>`;
          card.dataset.cmdLine = buildCmdLine(block.name, block.input || block.arguments);
          card.querySelector('pre').textContent = card.dataset.cmdLine;
          card.querySelector('.tool-card-header').addEventListener('click', () => {
            card.querySelector('.tool-card-body').classList.toggle('open');
            card.querySelector('.tool-card-header .chevron').classList.toggle('open');
          });
          el.appendChild(card);
          pendingToolCallCards.push({ id: callId, toolName: block.name, card });
        } else if (block.type === 'text') {
          textParts.push(block.text || '');
        }
      }

      if (textParts.length > 0) {
        const textDiv = mkEl('div', 'message-content');
        textDiv.innerHTML = md(textParts.join('\n'));
        el.appendChild(textDiv);
      }
    }

    else if (role === 'toolResult') {
      const callId = msg.toolCallId || '';
      let card = null;

      if (callId) {
        const idx = pendingToolCallCards.findIndex(p => p.id === callId);
        if (idx !== -1) {
          card = pendingToolCallCards[idx].card;
          pendingToolCallCards.splice(idx, 1);
        } else {
          const byName = pendingToolCallCards.find(p => p.toolName === msg.toolName);
          if (byName) {
            card = byName.card;
            pendingToolCallCards.splice(pendingToolCallCards.indexOf(byName), 1);
          }
        }
      }

      if (card) {
        const status = card.querySelector('.tool-status');
        if (msg.isError) {
          status.innerHTML = '<div class="dot-error"></div><span style="color:var(--text-danger)">error</span>';
        } else {
          status.innerHTML = '<div class="dot-success"></div><span style="color:var(--text-success)">done</span>';
        }
        const body = card.querySelector('.tool-card-body');
        const pre = body?.querySelector('pre');
        if (pre) {
          const resultText = getToolResultText(msg);
          pre.textContent = toolDisplayContent(card, resultText);
        }
        card.dataset.id = callId || msg.toolName + '-result';
      } else {
        const meta = toolMeta(msg.toolName || 'unknown');
        const standaloneCard = mkEl('div', 'tool-card');
        standaloneCard.dataset.id = callId || 'standalone-' + Date.now();
        standaloneCard.dataset.name = msg.toolName || '';
        const resultText = getToolResultText(msg);
        standaloneCard.innerHTML = `
          <div class="tool-card-header">
            <div class="tool-card-info">
              <div class="tool-icon ${meta.cls}">${meta.icon}</div>
              <div><div class="tool-label">${meta.label}</div>
              <div class="tool-subtitle">result</div></div>
            </div>
            <div class="tool-status">${msg.isError ? '<div class="dot-error"></div><span style="color:var(--text-danger)">error</span>' : '<div class="dot-success"></div><span style="color:var(--text-success)">done</span>'}</div>
            <span class="chevron">${ICONS.chevronDown}</span>
          </div>
          <div class="tool-card-body open">
            <button class="tool-copy-btn" onclick="copyToolOutput(this)" title="Copy output">${ICONS.copy} <span>Copy</span></button>
            <pre>${esc(resultText.slice(0, 500))}${resultText.length > 500 ? esc('\n\u2026') : ''}</pre>
          </div>`;
        standaloneCard.dataset.cmdLine = buildCmdLine(msg.toolName || 'unknown', {});
        standaloneCard.querySelector('.tool-card-header').addEventListener('click', () => {
          standaloneCard.querySelector('.tool-card-body').classList.toggle('open');
          standaloneCard.querySelector('.tool-card-header .chevron').classList.toggle('open');
        });
        D.msgList.appendChild(standaloneCard);
      }
    }
  }

  scrollDown(true);
}

function getHistoryText(msg) {
  if (!msg) return '';
  if (Array.isArray(msg.content)) {
    return msg.content.filter(c => c.type === 'text').map(c => c.text || '').join('\n');
  }
  if (typeof msg.content === 'string') return msg.content;
  return msg.text || '';
}

function getToolResultText(msg) {
  if (!msg) return '';
  if (msg.result) {
    if (typeof msg.result === 'string') return msg.result;
    if (msg.result.content) {
      const c = msg.result.content;
      return Array.isArray(c) ? c.map(x => x.text || '').join('\n') : String(c);
    }
    return JSON.stringify(msg.result, null, 2);
  }
  if (Array.isArray(msg.content)) {
    return msg.content.filter(c => c.type === 'text').map(c => c.text || '').join('\n');
  }
  return '';
}

// ═══════════════════════════════════════════════════════════════════
// Copy Tool Output
// ═══════════════════════════════════════════════════════════════════
window.copyToolOutput = function(btn) {
  const body = btn.closest('.tool-card-body');
  const pre = body?.querySelector('pre');
  if (pre) {
    navigator.clipboard.writeText(pre.textContent).then(() => {
      const span = btn.querySelector('span');
      if (span) span.textContent = 'Copied!';
      setTimeout(() => { if (span) span.textContent = 'Copy'; }, 1500);
    });
  }
};

// ═══════════════════════════════════════════════════════════════════
// Scroll to Bottom Button
// ═══════════════════════════════════════════════════════════════════
D.scrollBtn.addEventListener('click', () => scrollDown(true));

D.msgCtr.addEventListener('scroll', () => {
  const atBottom = D.msgCtr.scrollHeight - D.msgCtr.scrollTop - D.msgCtr.clientHeight < 100;
  D.scrollBtn.classList.toggle('visible', !atBottom);
  D.scrollBtn.querySelector('.badge').classList.toggle('streaming', state.streaming);
});

// ═══════════════════════════════════════════════════════════════════
// SSE Connection
// ═══════════════════════════════════════════════════════════════════
function connect() {
  if (state.eventSource) state.eventSource.close();
  setBanner('reconnecting', 'connecting...');

  const es = new EventSource('/events');
  state.eventSource = es;
  let rt = null;

  es.addEventListener('connected', e => {
    state.connected = true; state.reconnecting = false;
    setBanner('connected', 'connected');
    try {
      const d = JSON.parse(e.data);
      if (d.model) state.model = d.model;
      if (d.cwd) { state.cwd = d.cwd; state.activeCwd = d.cwd; }
      if (d.sessionId) state.sessionId = d.sessionId;
      if (d.streaming !== undefined) state.streaming = d.streaming;
      if (d.thinking !== undefined) state.thinking = d.thinking;
      if (d.agentActive !== undefined) state.agentActive = d.agentActive;
      if (d.usage) state.usage = d.usage;
      if (d.context) state.context = d.context;
      if (Array.isArray(d.history) && d.history.length > 0) {
        D.msgList.innerHTML = '';
        D.empty.classList.add('hidden');
        renderHistory(d.history);
        hideEmpty();
      } else if (!d.history || d.history.length === 0) {
        if (D.msgList.children.length === 0) D.empty.classList.remove('hidden');
      }
      refresh();
    } catch {}
  });

  es.addEventListener('session_start', e => {
    try { const d = JSON.parse(e.data); if (d.sessionId) state.sessionId = d.sessionId; } catch {}
  });

  es.addEventListener('agent_start', () => {
    state.agentActive = true; state.streaming = false; state.thinking = false; refresh();
  });

  es.addEventListener('agent_end', () => {
    state.agentActive = false; state.streaming = false; state.thinking = false; refresh(); scrollDown(true);
  });

  es.addEventListener('message_start', e => {
    try {
      const d = JSON.parse(e.data), msg = d.message;
      if (!msg) return;
      if (msg.role === 'user') { addUserMsg(msg); hideEmpty(); scrollDown(true); }
      else if (msg.role === 'assistant') {
        state.currentAssistantEl = addAssistantMsg(msg);
        state.currentThinkingEl = null;
        scrollDown();
      }
    } catch {}
  });

  es.addEventListener('message_update', e => {
    try {
      const d = JSON.parse(e.data), delta = d.delta, msg = d.message;
      if (delta?.type === 'text_delta' && delta.delta) {
        state.streaming = true; state.thinking = false;
        streamText(delta.delta); refresh();
      }
      if (delta?.type === 'thinking_delta' && delta.delta) {
        state.thinking = true;
        streamThinking(delta.delta); refresh();
      }
    } catch {}
  });

  es.addEventListener('message_end', e => {
    try {
      const d = JSON.parse(e.data), msg = d.message;
      if (msg?.role === 'assistant') finalizeAssistant();
      state.streaming = false; state.thinking = false; refresh(); scrollDown(true);
    } catch {}
  });

  es.addEventListener('tool_execution_start', e => {
    try { const d = JSON.parse(e.data); addTool(d); hideEmpty(); } catch {}
  });

  es.addEventListener('tool_execution_update', e => {
    try { const d = JSON.parse(e.data); updateTool(d); } catch {}
  });

  es.addEventListener('tool_execution_end', e => {
    try { const d = JSON.parse(e.data); finalizeTool(d); scrollDown(); } catch {}
  });

  es.addEventListener('model_select', e => {
    try { const d = JSON.parse(e.data); if (d.model) { state.model = d.model; refresh(); } } catch {}
  });

  es.addEventListener('usage_update', e => {
    try {
      const d = JSON.parse(e.data);
      if (d.usage) state.usage = d.usage;
      if (d.context) state.context = d.context;
      if (state.statsPopupOpen) updateStatsPopup();
    } catch {}
  });

  es.addEventListener('interrupted', () => {
    state.streaming = false; state.thinking = false; state.agentActive = false;
    finalizeAssistant(); refresh();
  });

  es.onerror = () => {
    state.connected = false; state.reconnecting = true;
    setBanner('reconnecting', 'connection lost, retrying...');
    refresh();
    es.close(); state.eventSource = null;
    if (rt) clearTimeout(rt);
    rt = setTimeout(connect, 2000);
  };
}

// ═══════════════════════════════════════════════════════════════════
// Init
// ═══════════════════════════════════════════════════════════════════
connect();
