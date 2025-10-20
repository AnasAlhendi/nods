// App script (classic). Uses NodeUI from node.js (window.NodeUI).

// Canvas stadokte
const state = {
  scale: 1,
  pan: { x: 0, y: 0 },
  connectingFrom: null,
};

// Event helper
function emit(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// Data model (array of nodes)
const nodes = [
  { id: 'start', label: 'Sprachauswahl', tag: '(Start)',  state: 'enabled', position: { x: 160,  y: 220 }, connections: ['menu'],
    openConfig:   (id) => { recordNodeEvent(id, 'open-config'); nodesUI.handleOptionClick(nodes, id, state, svg, canvasInner, () => nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent))); },
    openEdit:     (id) => { recordNodeEvent(id, 'open-edit'); },
    onChangeCheckbox: (id, enabled) => {
      recordNodeEvent(id, 'enable-change', { enabled });
      const node = getNode(id); if (!node) return;
      node.state = enabled ? 'enabled' : 'disabled';
      if (!enabled) {
        node.lastTarget = Array.isArray(node.connections) && node.connections[0] ? node.connections[0] : node.lastTarget;
        node.connections = [];
        if (state.connectingFrom === id) state.connectingFrom = null;
      }
      nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent));
    },
  },
  { id: 'menu',  label: 'Menu00FC',       tag: '(Weiter)', state: 'enabled', position: { x: 1040, y: 300 }, connections: ['end'],
    openConfig:   (id) => { recordNodeEvent(id, 'open-config'); nodesUI.handleOptionClick(nodes, id, state, svg, canvasInner, () => nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent))); },
    openEdit:     (id) => { recordNodeEvent(id, 'open-edit'); },
    onChangeCheckbox: (id, enabled) => {
      recordNodeEvent(id, 'enable-change', { enabled });
      const node = getNode(id); if (!node) return;
      node.state = enabled ? 'enabled' : 'disabled';
      if (!enabled) {
        node.lastTarget = Array.isArray(node.connections) && node.connections[0] ? node.connections[0] : node.lastTarget;
        node.connections = [];
        if (state.connectingFrom === id) state.connectingFrom = null;
      }
      nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent));
    },
  },
  { id: 'help',  label: 'Hilfe',          tag: '',        state: 'warning', position: { x: 240,  y: 640 }, connections: [],
    openConfig:   (id) => { recordNodeEvent(id, 'open-config'); nodesUI.handleOptionClick(nodes, id, state, svg, canvasInner, () => nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent))); },
    openEdit:     (id) => { recordNodeEvent(id, 'open-edit'); },
    onChangeCheckbox: (id, enabled) => {
      recordNodeEvent(id, 'enable-change', { enabled });
      const node = getNode(id); if (!node) return;
      node.state = enabled ? 'enabled' : 'disabled';
      if (!enabled) {
        node.lastTarget = Array.isArray(node.connections) && node.connections[0] ? node.connections[0] : node.lastTarget;
        node.connections = [];
        if (state.connectingFrom === id) state.connectingFrom = null;
      }
      nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent));
    },
  },
  { id: 'end',   label: 'Beenden',        tag: '',        state: 'disabled', position: { x: 1480, y: 720 }, connections: [],
    openConfig:   (id) => { recordNodeEvent(id, 'open-config'); nodesUI.handleOptionClick(nodes, id, state, svg, canvasInner, () => nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent))); },
    openEdit:     (id) => { recordNodeEvent(id, 'open-edit'); },
    onChangeCheckbox: (id, enabled) => {
      recordNodeEvent(id, 'enable-change', { enabled });
      const node = getNode(id); if (!node) return;
      node.state = enabled ? 'enabled' : 'disabled';
      if (!enabled) {
        node.lastTarget = Array.isArray(node.connections) && node.connections[0] ? node.connections[0] : node.lastTarget;
        node.connections = [];
        if (state.connectingFrom === id) state.connectingFrom = null;
      }
      nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent));
    },
  },
];

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
function openModal(title, contentNode) { modalTitle.textContent = title; modalBody.innerHTML = ''; if (contentNode) modalBody.appendChild(contentNode); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.setAttribute('aria-hidden', 'true'); }

function getNode(id){ return nodes.find(n => n.id === id); }

function openSettings() {
  const div = document.createElement('div');
  div.innerHTML = `
    <p>Konfigurationsdialog (Platzhalter).</p>
    <ul>
      <li>UI-Skalierung: <code>${state.scale.toFixed(2)}</code></li>
      <li>Pan: <code>(${state.pan.x.toFixed(0)}, ${state.pan.y.toFixed(0)})</code></li>
      <li>Knoten: <code>${nodes.length}</code></li>
    </ul>
  `;
  openModal('Einstellungen', div);
}

function saveDesign() {
  // Exclude function-valued fields from JSON output
  const data = {
    nodes: nodes.map(n => {
      const entries = Object.entries(n).filter(([, v]) => typeof v !== 'function');
      return Object.fromEntries(entries);
    })
  };
  const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.textContent = JSON.stringify(data, null, 2);
  openModal('Speichern', pre);
}

function runSimulation() {
  const startNode = nodes.find(n => (n.tag || '').toLowerCase().includes('start')) || nodes[0];
  const visited = new Set(); const path = []; let current = startNode;
  while (current && !visited.has(current.id)) { path.push(current.id); visited.add(current.id); current = getNode(current.connections[0]); }
  let i = 0; const timer = setInterval(() => {
    if (i > 0) { const prev = document.querySelector(`[data-node-id="${path[i-1]}"] .option-js`); if (prev) prev.style.background = 'var(--blue-900)'; }
    if (i >= path.length) { clearInterval(timer); return; }
    const el = document.querySelector(`[data-node-id="${path[i]}"] .option-js`); if (el) el.style.background = '#0E9F6E'; i++;
  }, 400);
}

// Node rendering using window.NodeUI
const nodesUI = new window.NodeUI();

// Connections (moved to node.js)
// Connect/option events
// Connect helpers moved into NodeUI (handleOptionClick/handleConnectToggle)

// Pan & zoom
canvasWrapper.addEventListener('wheel',(e)=>{ if(e.ctrlKey){ e.preventDefault(); const factor=e.deltaY<0?1.1:0.9; const prev=state.scale; const next=Math.max(0.4, Math.min(2.5, prev*factor)); const rect=canvasWrapper.getBoundingClientRect(); const cx=(e.clientX-rect.left-state.pan.x)/prev; const cy=(e.clientY-rect.top-state.pan.y)/prev; state.pan.x -= cx*(next-prev); state.pan.y -= cy*(next-prev); state.scale=next; applyTransform(); } },{passive:false});
let panning=false; let panStart={x:0,y:0};
canvasWrapper.addEventListener('mousedown',(e)=>{ if (e.target===canvasWrapper || e.target===canvasInner){ panning=true; panStart={x:e.clientX-state.pan.x, y:e.clientY-state.pan.y}; addEventListener('mousemove', onPan); addEventListener('mouseup', endPan, {once:true}); }});
function onPan(e){ if(!panning) return; state.pan.x=e.clientX-panStart.x; state.pan.y=e.clientY-panStart.y; applyTransform(); }
function endPan(){ panning=false; removeEventListener('mousemove', onPan); }
function applyTransform(){ canvasInner.style.transform=`translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.scale})`; }

// Node dialogs (removed)

// (no extra utilities)

// Node events recorder
// Global event log (decoupled from nodes)
const eventLog = [];
function recordNodeEvent(id, name, payload){
  const entry = { id, name, at: Date.now(), ...(payload?{payload}: {}) };
  eventLog.push(entry);
  emit('node-event', entry); // optional: broadcast for listeners
}

// Initial render
nodesUI.rerender(nodesLayer, svg, canvasInner, nodes, nodesUI.defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent));
applyTransform();
addEventListener('resize', () => { nodesUI.renderConnections(svg, canvasInner, nodes); });
