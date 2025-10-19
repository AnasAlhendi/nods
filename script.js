// App script (classic). Uses NodeUI from node.js (window.NodeUI).

// Canvas state
const state = {
  scale: 1,
  pan: { x: 0, y: 0 },
  connectingFrom: null,
};

// Event helper
function emit(eventName, detail) {
  document.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// Data model
const nodes = new Map([
  ['start', { id: 'start', label: 'Sprachauswahl', tag: '(Start)',  state: 'enabled', position: { x: 160,  y: 220 }, connections: ['menu'], events: [] }],
  ['menu',  { id: 'menu',  label: 'Menu00FC',       tag: '(Weiter)', state: 'enabled', position: { x: 1040, y: 300 }, connections: ['end'],  events: [] }],
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
function openModal(title, contentNode) { modalTitle.textContent = title; modalBody.innerHTML = ''; if (contentNode) modalBody.appendChild(contentNode); modal.setAttribute('aria-hidden', 'false'); }
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
  const data = { nodes: Array.from(nodes.values()).map(n => ({ ...n })) };
  const pre = document.createElement('pre'); pre.style.whiteSpace = 'pre-wrap'; pre.textContent = JSON.stringify(data, null, 2);
  openModal('Speichern', pre);
}

function runSimulation() {
  const startNode = Array.from(nodes.values()).find(n => (n.tag || '').toLowerCase().includes('start')) || nodes.values().next().value;
  const visited = new Set(); const path = []; let current = startNode;
  while (current && !visited.has(current.id)) { path.push(current.id); visited.add(current.id); current = nodes.get(current.connections[0]); }
  let i = 0; const timer = setInterval(() => {
    if (i > 0) { const prev = document.querySelector(`[data-node-id="${path[i-1]}"] .option-js`); if (prev) prev.style.background = 'var(--blue-900)'; }
    if (i >= path.length) { clearInterval(timer); return; }
    const el = document.querySelector(`[data-node-id="${path[i]}"] .option-js`); if (el) el.style.background = '#0E9F6E'; i++;
  }, 400);
}

// Node rendering using window.NodeUI
const nodesUI = new window.NodeUI();
function renderNodes() {
  nodesLayer.innerHTML = '';
  nodes.forEach(n => {
    const el = nodesUI.buildNodeElement(n, {
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
        renderNodes(); renderConnections();
      },
      connectingFromId: state.connectingFrom,
      connectChecked: state.connectingFrom === n.id || (Array.isArray(n.connections) && n.connections.length > 0),
      dragEnabled: true,
      getScale: () => state.scale,
      onPositionChange: (nodeObj) => { recordNodeEvent(nodeObj.id, 'position-change', { position: { ...nodeObj.position } }); renderConnections(); },
      onDragStart: (nodeObj) => recordNodeEvent(nodeObj.id, 'drag-start', { position: { ...nodeObj.position } }),
      onDragEnd: (nodeObj) => recordNodeEvent(nodeObj.id, 'drag-end', { position: { ...nodeObj.position } }),
      controls: { enableToggle: { visible: true }, connectToggle: { visible: true }, editButton: { visible: true }, helpButton: { visible: true } },
    });
    nodesLayer.appendChild(el);
  });
}

// Connections
function renderConnections() {
  while (svg.firstChild) svg.removeChild(svg.firstChild);
  svg.setAttribute('width', canvasInner.style.width || '2000px');
  svg.setAttribute('height', canvasInner.style.height || '1200px');
  svg.setAttribute('viewBox', `0 0 ${parseInt(canvasInner.style.width||2000)} ${parseInt(canvasInner.style.height||1200)}`);
  nodes.forEach(n => {
    n.connections.forEach(targetId => {
      const t = nodes.get(targetId); if (!t) return;
      const a = nodeAnchor(n.id); const b = nodeAnchor(t.id);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', bezierPath(a, b)); path.setAttribute('fill', 'none'); path.setAttribute('stroke', 'var(--blue-600)'); path.setAttribute('stroke-width', '2'); path.setAttribute('marker-end', 'url(#arrow)');
      path.addEventListener('mouseenter', () => path.setAttribute('stroke', '#2563EB'));
      path.addEventListener('mouseleave', () => path.setAttribute('stroke', 'var(--blue-600)'));
      svg.appendChild(path);
    });
  });
  ensureArrowMarker();
}
function ensureArrowMarker(){ let defs=svg.querySelector('defs'); if(!defs){ defs=document.createElementNS('http://www.w3.org/2000/svg','defs'); svg.prepend(defs);} let marker=svg.querySelector('#arrow'); if(!marker){ marker=document.createElementNS('http://www.w3.org/2000/svg','marker'); marker.setAttribute('id','arrow'); marker.setAttribute('markerWidth','10'); marker.setAttribute('markerHeight','7'); marker.setAttribute('refX','9'); marker.setAttribute('refY','3.5'); marker.setAttribute('orient','auto'); const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon'); poly.setAttribute('points','0 0, 10 3.5, 0 7'); poly.setAttribute('fill','var(--blue-600)'); marker.appendChild(poly); defs.appendChild(marker);} }
function nodeAnchor(id){ const el=document.querySelector(`[data-node-id="${id}"]`); if(!el) return {x:0,y:0}; const x=parseFloat(el.style.left)+el.offsetWidth/2; const y=parseFloat(el.style.top)+el.offsetHeight/2; return {x,y}; }
function bezierPath(a,b){ const dx=Math.max(60, Math.abs(b.x-a.x)*0.4); const c1={x:a.x+dx,y:a.y}; const c2={x:b.x-dx,y:b.y}; return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`; }

// Connect/option events
function onConnectToggle(id, checked){ const current=nodes.get(id); if(!current) return; emit('node-connect-toggle', { id, checked }); if (checked && state.connectingFrom && state.connectingFrom!==id){ const from=nodes.get(state.connectingFrom); if(from){ from.connections=[id]; from.lastTarget=id; } state.connectingFrom=null; renderConnections(); renderNodes(); return; } if(checked){ if((!current.connections||current.connections.length===0)&& current.lastTarget && nodes.has(current.lastTarget)){ current.connections=[current.lastTarget]; renderConnections(); renderNodes(); return; } state.connectingFrom=id; renderNodes(); return; } if (state.connectingFrom===id) state.connectingFrom=null; if (Array.isArray(current.connections)&&current.connections.length>0){ current.lastTarget=current.connections[0]; } current.connections=[]; renderConnections(); renderNodes(); }
function optionClick(id){ if (state.connectingFrom && id!==state.connectingFrom){ const from=nodes.get(state.connectingFrom); if(from){ from.connections=[id]; from.lastTarget=id; } state.connectingFrom=null; renderConnections(); renderNodes(); return; } if (state.connectingFrom && id===state.connectingFrom){ state.connectingFrom=null; renderNodes(); } }

// Pan & zoom
canvasWrapper.addEventListener('wheel',(e)=>{ if(e.ctrlKey){ e.preventDefault(); const factor=e.deltaY<0?1.1:0.9; const prev=state.scale; const next=Math.max(0.4, Math.min(2.5, prev*factor)); const rect=canvasWrapper.getBoundingClientRect(); const cx=(e.clientX-rect.left-state.pan.x)/prev; const cy=(e.clientY-rect.top-state.pan.y)/prev; state.pan.x -= cx*(next-prev); state.pan.y -= cy*(next-prev); state.scale=next; applyTransform(); } },{passive:false});
let panning=false; let panStart={x:0,y:0};
canvasWrapper.addEventListener('mousedown',(e)=>{ if (e.target===canvasWrapper || e.target===canvasInner){ panning=true; panStart={x:e.clientX-state.pan.x, y:e.clientY-state.pan.y}; addEventListener('mousemove', onPan); addEventListener('mouseup', endPan, {once:true}); }});
function onPan(e){ if(!panning) return; state.pan.x=e.clientX-panStart.x; state.pan.y=e.clientY-panStart.y; applyTransform(); }
function endPan(){ panning=false; removeEventListener('mousemove', onPan); }
function applyTransform(){ canvasInner.style.transform=`translate(${state.pan.x}px, ${state.pan.y}px) scale(${state.scale})`; }

// Node dialogs
function openNodeConfig(id){ const n=nodes.get(id); if(!n) return; const wrap=document.createElement('div'); wrap.innerHTML = `
  <div style="display:grid; grid-template-columns: 120px 1fr; gap: 8px; align-items:center;">
    <label>Name</label><input id="cfgLabel" value="${escapeAttr(n.label)}" />
    <label>Tag</label><input id="cfgTag" value="${escapeAttr(n.tag||'')}" />
    <label>Status</label>
    <select id="cfgState">
      <option value="enabled" ${n.state==='enabled'?'selected':''}>aktiv</option>
      <option value="disabled" ${n.state==='disabled'?'selected':''}>inaktiv</option>
      <option value="warning" ${n.state==='warning'?'selected':''}>Warnung</option>
    </select>
  </div>
  <div style="margin-top:12px; display:flex; gap:8px;"><button class="btn" id="cfgSave">Speichern</button></div>`; openModal(`Knoten: ${n.label}`, wrap); wrap.querySelector('#cfgSave').addEventListener('click', ()=>{ n.label=wrap.querySelector('#cfgLabel').value; n.tag=wrap.querySelector('#cfgTag').value; n.state=wrap.querySelector('#cfgState').value; renderNodes(); renderConnections(); closeModal(); }); }
function openEditDialog(id){ openNodeConfig(id); }
function showHelp(id){ const n=nodes.get(id); const div=document.createElement('div'); div.innerHTML = `<p>Hilfe zu <strong>${escapeHtml(n?.label || id)}</strong>.</p><p class="muted">Hier k\u00F6nnten Tooltips oder Dokumentation stehen.</p>`; openModal('Hilfe', div); }

// Utilities
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function escapeAttr(s) { return escapeHtml(s).replace(/"/g, '&quot;'); }

// Node events recorder
function recordNodeEvent(id, name, payload){ const node=nodes.get(id); if(!node) return; if(!Array.isArray(node.events)) node.events=[]; node.events.push({ name, at: Date.now(), ...(payload?{payload}: {}) }); }

// Initial render
renderNodes();
renderConnections();
applyTransform();
addEventListener('resize', () => { renderConnections(); });

