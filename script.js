// Basic UI and node editor per test.md spec (ES modules, no window globals)
// NodeUI class (embedded for classic script usage)
class NodeUI {
  buildNodeElement(n, { onOpenConfig, onOpenEdit, onOpenHelp, onStartDrag, onConnectToggle, onEnableChange, connectingFromId, connectChecked, dragEnabled = false, onPositionChange, onDragStart, onDragEnd, getScale, controls = {} } = {}) {
    const container = document.createElement('div');
    container.className = 'node-js';
    if (n.state === 'disabled') container.classList.add('disabled');
    container.style.left = n.position.x + 'px';
    container.style.top = n.position.y + 'px';
    container.dataset.nodeId = n.id;
    container.title = `${n.label} ${n.tag || ''}`.trim();

    const option = document.createElement('div');
    option.className = 'option-js';
    option.setAttribute('role', 'button');
    option.setAttribute('tabindex', '0');
    option.setAttribute('aria-label', `${n.label} ${n.tag || ''}`.trim());
    if (n.state === 'disabled') option.setAttribute('aria-disabled', 'true');

    // Optional icon support inside the node pill
    let iconWrap = null;
    if (n.icon) {
      iconWrap = document.createElement('span');
      iconWrap.className = 'state-icon';
      const iconStr = String(n.icon).trim();
      if (iconStr.startsWith('<svg')) {
        iconWrap.innerHTML = iconStr;
      } else if (/^https?:\/\//i.test(iconStr) || /\.(png|jpe?g|gif|svg)$/i.test(iconStr)) {
        const img = document.createElement('img');
        img.src = iconStr; img.alt = ''; img.width = 18; img.height = 18; img.decoding = 'async';
        iconWrap.appendChild(img);
      } else {
        iconWrap.textContent = iconStr; // emoji or short text
      }
    }

    const label = document.createElement('span');
    label.className = 'label';
    label.innerHTML = `${escapeHtml(n.label)}${n.tag ? ` <span class="tag">${escapeHtml(n.tag)}</span>` : ''}`;

    const actions = document.createElement('span');
    actions.className = 'actions';

    const enableCfg = Object.assign({ visible: true, disabled: false }, controls.enableToggle || {});
    const connectCfg = Object.assign({ visible: true, disabled: false }, controls.connectToggle || {});
    const editCfg = Object.assign({ visible: true, disabled: false }, controls.editButton || {});
    const helpCfg = Object.assign({ visible: true, disabled: false }, controls.helpButton || {});

    let enable = null;
    if (enableCfg.visible) {
      enable = document.createElement('label');
      enable.className = 'enable-toggle';
      enable.title = 'Aktivieren/Deaktivieren';
      const enableInput = document.createElement('input');
      enableInput.type = 'checkbox';
      enableInput.checked = n.state !== 'disabled';
      if (enableCfg.disabled) enableInput.disabled = true;
      enableInput.addEventListener('click', (ev) => {
        ev.stopPropagation();
        const nextEnabled = !!enableInput.checked;
        if (typeof onEnableChange === 'function') onEnableChange(n.id, nextEnabled);
      });
      enable.appendChild(enableInput);
    }

    let connect = null;
    if (connectCfg.visible) {
      connect = document.createElement('label');
      connect.className = 'connect-toggle';
      connect.title = 'Verbinden';
      const connectInput = document.createElement('input');
      connectInput.type = 'checkbox';
      connectInput.checked = !!connectChecked;
      if (connectCfg.disabled || n.state === 'disabled') connectInput.disabled = true;
      connectInput.addEventListener('click', (ev) => { ev.stopPropagation(); onConnectToggle && onConnectToggle(n.id, connectInput.checked); });
      connect.appendChild(connectInput);
    }

    let btnEdit = null;
    if (editCfg.visible) {
      btnEdit = document.createElement('button');
      btnEdit.className = 'mini-btn';
      btnEdit.title = 'Bearbeiten';
      btnEdit.setAttribute('aria-label', 'Bearbeiten');
      btnEdit.innerHTML = (NodeUI.ICONS && NodeUI.ICONS.edit) ? NodeUI.ICONS.edit : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>';
      if (editCfg.disabled || n.state === 'disabled') btnEdit.disabled = true;
      btnEdit.addEventListener('click', (ev) => { ev.stopPropagation(); onOpenEdit && onOpenEdit(n.id); });
    }

    let btnHelp = null;
    if (helpCfg.visible) {
      btnHelp = document.createElement('button');
      btnHelp.className = 'mini-btn';
      btnHelp.title = 'Hilfe';
      btnHelp.setAttribute('aria-label', 'Hilfe');
      btnHelp.innerHTML = (NodeUI.ICONS && NodeUI.ICONS.help) ? NodeUI.ICONS.help : '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H8a4 4 0 1 1 7.07 2.25z"/></svg>';
      if (helpCfg.disabled || n.state === 'disabled') btnHelp.disabled = true;
      btnHelp.addEventListener('click', (ev) => { ev.stopPropagation(); onOpenHelp && onOpenHelp(n.id); });
    }

    if (enable) option.appendChild(enable);
    if (connect) option.appendChild(connect);
    if (iconWrap) option.appendChild(iconWrap);
    option.appendChild(label);
    if (btnEdit) actions.appendChild(btnEdit);
    if (btnHelp) actions.appendChild(btnHelp);
    option.appendChild(actions);

    if (n.state === 'warning') {
      const badge = document.createElement('span');
      badge.className = 'warning-badge';
      badge.title = 'UnvollstÃ¤ndige Konfiguration';
      option.appendChild(badge);
    }

    option.addEventListener('click', () => onOpenConfig && onOpenConfig(n.id));
    option.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenConfig && onOpenConfig(n.id); } });
    option.addEventListener('focus', () => option.classList.add('focus-ring'));
    option.addEventListener('blur', () => option.classList.remove('focus-ring'));

    if (dragEnabled) {
      const getScaleSafe = typeof getScale === 'function' ? getScale : () => 1;
      const onMouseDown = (e) => {
        if (e.button !== 0) return; if (n.state === 'disabled') return;
        const start = { x: e.clientX, y: e.clientY };
        const orig = { x: n.position.x, y: n.position.y };
        const onMove = (ev) => {
          const scale = getScaleSafe() || 1;
          const dx = (ev.clientX - start.x) / scale;
          const dy = (ev.clientY - start.y) / scale;
          n.position.x = Math.round(orig.x + dx);
          n.position.y = Math.round(orig.y + dy);
          container.style.left = n.position.x + 'px';
          container.style.top = n.position.y + 'px';
          if (typeof onPositionChange === 'function') onPositionChange(n);
          document.dispatchEvent(new CustomEvent('node-position-changed', { detail: { id: n.id, position: { ...n.position } } }));
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (typeof onDragEnd === 'function') onDragEnd(n); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp, { once: true });
        if (typeof onDragStart === 'function') onDragStart(n);
      };
      container.addEventListener('mousedown', onMouseDown);
    } else {
      container.addEventListener('mousedown', (e) => onStartDrag && onStartDrag(e, n.id));
    }

    if (connectingFromId) { if (connectingFromId === n.id) option.classList.add('connect-source'); else option.classList.add('connect-pick'); }

    container.appendChild(option);
    return container;
  }
  optionSelector(id) { return document.querySelector(`[data-node-id="${id}"] .option-js`); }
}

// Centralized icon set for NodeUI controls
NodeUI.ICONS = {
  edit: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>`,
  help: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H8a4 4 0 1 1 7.07 2.25z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  dot:  `<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
};

// Canvas state
const state = {
  scale: 1,
  pan: { x: 0, y: 0 },
  dragging: null, // { id, start: {x,y}, orig: {x,y} }
  connectingFrom: null,
};

// Event helper: dispatch custom events on document
function emit(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// Example data model (can be saved as JSON)
// Node { id, label, tag?, state: 'enabled'|'disabled'|'warning', position: {x,y}, connections: string[] }
const nodes = new Map([
  ['start', { id: 'start', label: 'Sprachauswahl', tag: '(Start)',  state: 'enabled', position: { x: 160,  y: 220 }, connections: ['menu'], events: [] }],
  ['menu',  { id: 'menu',  label: 'Menu00FC',         tag: '(Weiter)', state: 'enabled', position: { x: 1040, y: 300 }, connections: ['end'],  events: [] }],
  ['help',  { id: 'help',  label: 'Hilfe',          tag: '',        state: 'warning', position: { x: 240,  y: 640 }, connections: [],          events: [] }],
  ['end',   { id: 'end',   label: 'Beenden',        tag: '',        state: 'disabled', position: { x: 1480, y: 720 }, connections: [],          events: [] }],
]);

// DOM refs
const canvasWrapper = document.getElementById('canvasWrapper');
const canvasInner   = document.getElementById('canvasInner');
const nodesLayer    = document.getElementById('nodesLayer');
const svg           = document.getElementById('connections');

// Header buttons
document.getElementById('btnSettings').addEventListener('click', () => openSettings());
document.getElementById('btnRun').addEventListener('click',      () => runSimulation());
document.getElementById('btnSave').addEventListener('click',     () => saveDesign());

// Modal helpers
const modal     = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalTitle= document.getElementById('modalTitle');
modal.addEventListener('click', (e) => {
  if (e.target.matches('[data-modal-close], .modal-backdrop')) closeModal();
});
function openModal(title, contentNode) {
  modalTitle.textContent = title;
  modalBody.innerHTML = '';
  if (contentNode) modalBody.appendChild(contentNode);
  modal.setAttribute('aria-hidden', 'false');
}
function closeModal() { modal.setAttribute('aria-hidden', 'true'); }

function openSettings() {
  const div = document.createElement('div');
  div.innerHTML = `
    <p>Konfigurationsdialog (Platzhalter).</p>
    <ul>
      <li>UI-Skalierung: <code>${state.scale.toFixed(2)}</code></li>
      <li>Pan: <code>(${state.pan.x.toFixed(0)}, ${state.pan.y.toFixed(0)})</code></li>
      <li>Knoten: <code>${nodes.size}</code></li>
    </ul>
  `;
  openModal('Einstellungen', div);
}

function saveDesign() {
  const data = {
    nodes: Array.from(nodes.values()).map(n => ({ ...n })),
  };
  const pre = document.createElement('pre');
  pre.style.whiteSpace = 'pre-wrap';
  pre.textContent = JSON.stringify(data, null, 2);
  openModal('Speichern', pre);
}

function runSimulation() {
  // Simple traversal starting from a node whose tag contains "(Start)"
  const startNode = Array.from(nodes.values()).find(n => (n.tag || '').toLowerCase().includes('start')) || nodes.values().next().value;
  const visited = new Set();
  const path = [];
  let current = startNode;
  while (current && !visited.has(current.id)) {
    path.push(current.id);
    visited.add(current.id);
    current = nodes.get(current.connections[0]);
  }
  highlightPath(path);
}

function highlightPath(ids) {
  let i = 0;
  const timer = setInterval(() => {
    if (i > 0) {
      const prev = document.querySelector(`[data-node-id="${ids[i-1]}"] .option-js`);
      if (prev) prev.style.background = 'var(--blue-900)';
    }
    if (i >= ids.length) { clearInterval(timer); return; }
    const el = document.querySelector(`[data-node-id="${ids[i]}"] .option-js`);
    if (el) el.style.background = '#0E9F6E';
    i++;
  }, 400);
}

// Local NodeUI instance (no window globals)
const nodesUI = new NodeUI();

// Render nodes
function renderNodes() {
  nodesLayer.innerHTML = '';
  nodes.forEach(n => {
    const el = nodesUI.buildNodeElement(n, {
      // Record and forward events so each node keeps its own event log
      onOpenConfig: (id) => { recordNodeEvent(id, 'open-config'); optionClick(id); },
      onOpenEdit:  (id) => { recordNodeEvent(id, 'open-edit'); openEditDialog(id); },
      onOpenHelp:  (id) => { recordNodeEvent(id, 'open-help'); showHelp(id); },
      onConnectToggle: (id, checked) => { recordNodeEvent(id, 'connect-toggle', { checked }); onConnectToggle(id, checked); },
      onEnableChange: (id, enabled) => {
        recordNodeEvent(id, 'enable-change', { enabled });
        const node = nodes.get(id); if (!node) return;
        node.state = enabled ? 'enabled' : 'disabled';
        if (!enabled) {
          node.lastTarget = Array.isArray(node.connections) && node.connections[0] ? node.connections[0] : node.lastTarget;
          node.connections = [];
          if (state.connectingFrom === id) state.connectingFrom = null;
        }
        renderNodes();
        renderConnections();
      },
      connectingFromId: state.connectingFrom,
      connectChecked: state.connectingFrom === n.id || (Array.isArray(n.connections) && n.connections.length > 0),
      // Dragging managed inside NodeUI
      dragEnabled: true,
      getScale: () => state.scale,
      onDragStart: (nodeObj) => recordNodeEvent(nodeObj.id, 'drag-start', { position: { ...nodeObj.position } }),
      onPositionChange: (nodeObj) => { recordNodeEvent(nodeObj.id, 'position-change', { position: { ...nodeObj.position } }); renderConnections(); },
      onDragEnd: (nodeObj) => recordNodeEvent(nodeObj.id, 'drag-end', { position: { ...nodeObj.position } }),
      controls: {
        enableToggle: { visible: true },
        connectToggle: { visible: true },
        editButton: { visible: true },
        helpButton: { visible: true },
      },
    });
    nodesLayer.appendChild(el);
  });
}

// Helper: append an event record into the node's events array
function recordNodeEvent(id, name, payload) {
  const node = nodes.get(id);
  if (!node) return;
  if (!Array.isArray(node.events)) node.events = [];
  node.events.push({ name, at: Date.now(), ...(payload ? { payload } : {}) });
}

function iconForState(state) {
  switch (state) {
    case 'enabled': return ICONS.check;
    case 'disabled': return ICONS.dot;
    case 'warning': return ICONS.warn;
    default: return ICONS.dot;
  }
}

// Connections
function renderConnections() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  // Sync svg size to canvasInner size
  svg.setAttribute('width', canvasInner.style.width || '2000px');
  svg.setAttribute('height', canvasInner.style.height || '1200px');
  svg.setAttribute('viewBox', `0 0 ${parseInt(canvasInner.style.width||2000)} ${parseInt(canvasInner.style.height||1200)}`);

  nodes.forEach(n => {
    n.connections.forEach(targetId => {
      const t = nodes.get(targetId);
      if (!t) return;
      const a = nodeAnchor(n.id);
      const b = nodeAnchor(t.id);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', bezierPath(a, b));
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'var(--blue-600)');
      path.setAttribute('stroke-width', '2');
      path.setAttribute('marker-end', 'url(#arrow)');
      path.addEventListener('mouseenter', () => path.setAttribute('stroke', '#2563EB'));
      path.addEventListener('mouseleave', () => path.setAttribute('stroke', 'var(--blue-600)'));
      svg.appendChild(path);
    });
  });

  ensureArrowMarker();
}

function ensureArrowMarker() {
  let defs = svg.querySelector('defs');
  if (!defs) { defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs'); svg.prepend(defs); }
  let marker = svg.querySelector('#arrow');
  if (!marker) {
    marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrow');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    poly.setAttribute('points', '0 0, 10 3.5, 0 7');
    poly.setAttribute('fill', 'var(--blue-600)');
    marker.appendChild(poly);
    defs.appendChild(marker);
  }
}

function nodeAnchor(id) {
  const el = document.querySelector(`[data-node-id="${id}"]`);
  if (!el) return { x: 0, y: 0 };
  const x = parseFloat(el.style.left) + el.offsetWidth / 2;
  const y = parseFloat(el.style.top) + el.offsetHeight / 2;
  return { x, y };
}

function bezierPath(a, b) {
  const dx = Math.max(60, Math.abs(b.x - a.x) * 0.4);
  const c1 = { x: a.x + dx, y: a.y };
  const c2 = { x: b.x - dx, y: b.y };
  return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
}

// Connect checkbox behavior: user chooses the target by clicking another node
function onConnectToggle(id, checked) {
  const current = nodes.get(id);
  if (!current) return;
  emit('node-connect-toggle', { id, checked });

  // If we're already in connect mode and a different node is checked, complete the connection
  if (checked && state.connectingFrom && state.connectingFrom !== id) {
    const from = nodes.get(state.connectingFrom);
    if (from) {
      from.connections = [id];
      from.lastTarget = id; // remember last connected target
    }
    state.connectingFrom = null;
    emit('node-connection-changed', { fromId: from?.id, toId: id, action: 'set', via: 'checkbox' });
    renderConnections();
    renderNodes();
    return;
  }
  if (checked) {
    // If this node had a last target and it's valid, auto-reconnect
    if ((!current.connections || current.connections.length === 0) && current.lastTarget && nodes.has(current.lastTarget)) {
      current.connections = [current.lastTarget];
      emit('node-connection-changed', { fromId: id, toId: current.lastTarget, action: 'set', via: 'auto' });
      renderConnections();
      renderNodes();
      return;
    }
    // Start connect mode from this node
    state.connectingFrom = id;
    emit('node-connect-started', { fromId: id });
    renderNodes();
    return;
  }
  // Unchecked: clear this node's connection and exit connect mode if it was the source
  if (state.connectingFrom === id) state.connectingFrom = null;
  // Special rule: if 'start' is unchecked, connect it to 'help'
  if (id === 'start') {
    if (nodes.has('help')) {
      current.connections = ['help'];
      current.lastTarget = 'help';
      emit('node-connection-changed', { fromId: 'start', toId: 'help', action: 'set', via: 'rule' });
    } else {
      current.connections = [];
      emit('node-connection-changed', { fromId: 'start', toId: null, action: 'clear', via: 'rule' });
    }
    renderConnections();
    renderNodes();
    return;
  }
  // Default: clear connection and remember last target
  if (Array.isArray(current.connections) && current.connections.length > 0) {
    current.lastTarget = current.connections[0];
  }
  current.connections = [];
  emit('node-connection-changed', { fromId: id, toId: current.lastTarget || null, action: 'clear', via: 'checkbox' });
  renderConnections();
  renderNodes();
}

function optionClick(id) {
  if (state.connectingFrom && id !== state.connectingFrom) {
    const from = nodes.get(state.connectingFrom);
    if (from) {
      from.connections = [id];
      from.lastTarget = id; // remember last connected target
    }
    state.connectingFrom = null;
    emit('node-connection-changed', { fromId: from?.id, toId: id, action: 'set', via: 'click' });
    renderConnections();
    renderNodes();
    return;
  }
  if (state.connectingFrom && id === state.connectingFrom) {
    emit('node-connect-cancelled', { fromId: id });
    state.connectingFrom = null;
    renderNodes();
  }
}

// Drag logic
// Dragging handled inside NodeUI when dragEnabled is true

// Pan and zoom
canvasWrapper.addEventListener('wheel', (e) => {
  if (e.ctrlKey) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const prev = state.scale;
    const next = clamp(prev * factor, 0.4, 2.5);
    // Zoom relative to cursor position
    const rect = canvasWrapper.getBoundingClientRect();
    const cx = (e.clientX - rect.left - state.pan.x) / prev;
    const cy = (e.clientY - rect.top - state.pan.y) / prev;
    state.pan.x -= cx * (next - prev);
    state.pan.y -= cy * (next - prev);
    state.scale = next;
    applyTransform();
  }
}, { passive: false });

let panning = false;
let panStart = { x: 0, y: 0 };
canvasWrapper.addEventListener('mousedown', (e) => {
  // start panning when background is clicked (not a node)
  if (e.target === canvasWrapper || e.target === canvasInner) {
    panning = true; panStart = { x: e.clientX - state.pan.x, y: e.clientY - state.pan.y };
    addEventListener('mousemove', onPan);
    addEventListener('mouseup', endPan, { once: true });
  }
});
function onPan(e) {
  if (!panning) return;
  state.pan.x = e.clientX - panStart.x;
  state.pan.y = e.clientY - panStart.y;
  applyTransform();
}
function endPan() {
  panning = false; removeEventListener('mousemove', onPan);
}

function applyTransform() {
  canvasInner.style.transform = `translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.scale})`;
}

// Node actions
function openNodeConfig(id) {
  const n = nodes.get(id);
  if (!n) return;
  const wrap = document.createElement('div');
  wrap.innerHTML = `
    <div style="display:grid; grid-template-columns: 120px 1fr; gap: 8px; align-items:center;">
      <label>Name</label><input id="cfgLabel" value="${escapeAttr(n.label)}" />
      <label>Tag</label><input id="cfgTag" value="${escapeAttr(n.tag || '')}" />
      <label>Status</label>
      <select id="cfgState">
        <option value="enabled" ${n.state === 'enabled' ? 'selected' : ''}>aktiv</option>
        <option value="disabled" ${n.state === 'disabled' ? 'selected' : ''}>inaktiv</option>
        <option value="warning" ${n.state === 'warning' ? 'selected' : ''}>Warnung</option>
      </select>
    </div>
    <div style="margin-top:12px; display:flex; gap:8px;">
      <button class="btn" id="cfgSave">Speichern</button>
    </div>
  `;
  openModal(`Knoten: ${n.label}`, wrap);
  wrap.querySelector('#cfgSave').addEventListener('click', () => {
    n.label = wrap.querySelector('#cfgLabel').value;
    n.tag = wrap.querySelector('#cfgTag').value;
    n.state = wrap.querySelector('#cfgState').value;
    renderNodes();
    renderConnections();
    closeModal();
  });
}
function openEditDialog(id) { openNodeConfig(id); }
function showHelp(id) {
  const n = nodes.get(id);
  const div = document.createElement('div');
  div.innerHTML = `<p>Hilfe zu <strong>${escapeHtml(n?.label || id)}</strong>.</p><p class="muted">Hier k\u00F6nnten Tooltips oder Dokumentation stehen.</p>`;
  openModal('Hilfe', div);
}

// Utilities
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

// Icons


// Initial render
renderNodes();
renderConnections();
applyTransform();

// Re-render connections on resize (node sizes may change)
addEventListener('resize', () => { renderConnections(); });

// (No window.* globals; ES module only)
