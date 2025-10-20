function safeSvg(svgStr){
const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
const svg = doc.querySelector('svg');
if(!svg) return null;

// Remove scripts/foreign content
svg.querySelectorAll('script, foreignObject').forEach(n => n.remove());

// Strip event handlers and CSS url() refs
[...svg.querySelectorAll('*')].forEach(el => {
[...el.attributes].forEach(a => {
const n = a.name.toLowerCase(), v = a.value;
if (n.startsWith('on') || /url\(/i.test(v)) el.removeAttribute(a.name);
});
});

return svg.outerHTML;
}

// usage:
if (iconStr.startsWith('<svg')) {
const safe = safeSvg(iconStr);
if (safe) iconWrap.innerHTML = safe;
}
(Optional hardening later: add allow-lists for elements/attributes; reject external href/data URIs; set rel="noopener" on any links if ever allowed.)

Drag performance & connection redraw
Don’t re-render on every mousemove; batch via requestAnimationFrame.

js
Copy code
let rafId = null;
const redraw = () => {
if (rafId) return;
rafId = requestAnimationFrame(() => {
this.renderConnections(svg, canvasInner, nodes);
rafId = null;
});
};
// inside onMove:
redraw();
Accurate node anchors within the canvas context
document.querySelector can hit the wrong canvas. Scope to the current canvas and compute centers relative to the inner container.

js
Copy code
_nodeAnchor(id){
const scope = this._ctx?.wrapper || document;
const el = scope.querySelector(`[data-node-id="${id}"]`);
if(!el) return {x:0,y:0};
const r = el.getBoundingClientRect();
const base = this._ctx?.inner?.getBoundingClientRect() || {left:0,top:0};
return { x: r.left - base.left + r.width/2, y: r.top - base.top + r.height/2 };
}
Avoid full DOM teardown on refresh
Full re-builds drop focus and input state. Switch to a simple diff/update. First step: separate nodes vs. connections and call the minimal refresh in interactions.

js
Copy code
refreshNodesOnly(){
if(!this._ctx) return;
this.renderNodes(this._ctx.nodesLayer, this._ctx.nodes, this._getRenderOptions());
}
refreshConnectionsOnly(){
if(!this._ctx) return;
this.renderConnections(this._ctx.svg, this._ctx.inner, this._ctx.nodes);
}
// use these during drag/activation instead of full rerender()
Keyboard support & accessibility
You added roles and tabindex (nice). Add keyboard drag (arrows, with Ctrl = 10px) and ARIA for “active” state.

js
Copy code
option.addEventListener('keydown', e=>{
const step = e.ctrlKey ? 10 : 1;
if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)){
e.preventDefault();
n.position.y += (e.key==='ArrowDown')?  step : (e.key==='ArrowUp' ? -step : 0);
n.position.x += (e.key==='ArrowRight')? step : (e.key==='ArrowLeft'? -step : 0);
container.style.left = n.position.x + 'px';
container.style.top  = n.position.y + 'px';
document.dispatchEvent(new CustomEvent('node-position-changed', {
detail:{ id:n.id, position:{...n.position} }
}));
this.renderConnections(this._ctx.svg, this._ctx.inner, this._ctx.nodes);
}
});
// also keep ARIA updated:
container.setAttribute('aria-pressed', String(n.active));
Nicer pan/zoom
Currently zoom needs Ctrl. Add panning bounds and a “reset” action.

js
Copy code
resetView(){
this._scale = 1;
this._pan = {x:0, y:0};
this._applyTransform(this._pz?.inner);
}
Use pointerdown instead of mousedown to support touch/pen.

Auto size
On container resize, update the SVG viewBox and dimensions.

js
Copy code
installResizeObserver(wrapper, inner, svg){
const ro = new ResizeObserver(()=>{
svg.setAttribute('width',  inner.clientWidth);
svg.setAttribute('height', inner.clientHeight);
svg.setAttribute('viewBox', `0 0 ${inner.clientWidth} ${inner.clientHeight}`);
this.renderConnections(svg, inner, this._ctx?.nodes);
});
ro.observe(inner);
this._ro = ro;
}
// call inside ensureCanvas()
“Train” application robustness
_applyConnectionsFromTrain currently wipes connections. Add an option to preserve manual connections, and warn (don’t crash) if the train references unknown IDs.

js
Copy code
_applyConnectionsFromTrain({ preserveManual = false } = {}){
// if preserveManual === true, keep connections not marked as train-generated
// log warnings for unknown node ids instead of throwing
}
State vs. view + TypeScript
Define a stable node model (id, label, position, state, connections, …) and proper types. This makes adding states like “warning” trivial later.

Handy UX touches
Larger invisible hit area for connection paths (separate stroke-width for events vs. visible stroke).

Warning icon with a clickable cause → opens detail panel.

i18n: pull all labels (title, aria-label, etc.) from a dictionary, not hardcoded strings.

1️⃣ Node types & named ports (Yes / No / Weiter)

Add type and ports to each node, instead of a single anchor point.
This enables decision nodes like “Do you have an appointment?” with separate Yes/No outputs.

// Example node structure
// { id, type:'decision'|'task'|'summary'|'group', label, tag, position, state, ports, connections }

n.ports = {
out_yes: { side:'right' },
out_no:  { side:'left'  },
in:      { side:'top'   }
};

// Example connection:
// connections: [{ from:'out_yes', to:{ id:'x', port:'in' }, label:'ja' }]


Add a per-port anchor:

_portAnchor(nodeId, portName){
const scope = this._ctx?.wrapper || document;
const el = scope.querySelector(`[data-node-id="${nodeId}"]`);
if(!el) return {x:0, y:0};
const r = el.getBoundingClientRect();
const innerR = this._ctx?.inner?.getBoundingClientRect() || {left:0, top:0};
const side = (this._getNode(nodeId)?.ports?.[portName]?.side) || 'right';
const cx = r.left - innerR.left, cy = r.top - innerR.top;
const w = r.width, h = r.height;
const map = {
left:   {x: cx,      y: cy + h/2},
right:  {x: cx + w,  y: cy + h/2},
top:    {x: cx + w/2,y: cy},
bottom: {x: cx + w/2,y: cy + h}
};
return map[side] || {x: cx + w, y: cy + h/2};
}

_getNode(id){
const N = this._ctx?.nodes;
const isMap = N && typeof N.get === 'function';
return isMap ? N.get(id) : (Array.isArray(N) ? N.find(m => m.id === id) : null);
}

2️⃣ Connection labels (“ja / nein / Weiter”)

Draw text along the SVG path:

_renderEdge(svg, a, b, label){
const id = `p${Math.random().toString(36).slice(2)}`;
const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
path.setAttribute('id', id);
path.setAttribute('d', this._bezierPath(a, b));
path.setAttribute('fill', 'none');
path.setAttribute('stroke', 'var(--blue-600)');
path.setAttribute('stroke-width', '2');
path.setAttribute('marker-end', 'url(#arrow)');
svg.appendChild(path);

if(label){
const text = document.createElementNS('http://www.w3.org/2000/svg','text');
text.setAttribute('font-size','11');
text.setAttribute('dominant-baseline','middle');
const tp = document.createElementNS('http://www.w3.org/2000/svg','textPath');
tp.setAttribute('href', `#${id}`);
tp.setAttribute('startOffset','50%');
tp.setAttribute('text-anchor','middle');
tp.textContent = label;
text.appendChild(tp);
svg.appendChild(text);
}
}


Use it in renderConnections:

list.forEach(n=>{
(n.connections || []).forEach(conn=>{
const t = getById(conn.to?.id || conn);
if(!t) return;
const a = this._portAnchor(n.id, conn.from || 'out');
const b = this._portAnchor(t.id, conn.to?.port || 'in');
this._renderEdge(svg, a, b, conn.label);
});
});

3️⃣ Group nodes / sections (“Buchung”, “Termin anmeldung”, …)

Add a group node type — rendered as a titled box that visually contains inner nodes.

// Example group node
{ id:'grp1', type:'group', label:'Buchung', position:{x:20, y:240}, size:{w:380, h:220} }


Render the group:

_renderGroup(container, n){
const box = document.createElement('div');
box.className = 'group-box';
box.style.left   = n.position.x + 'px';
box.style.top    = n.position.y + 'px';
box.style.width  = (n.size?.w || 300) + 'px';
box.style.height = (n.size?.h || 200) + 'px';
box.innerHTML = `<div class="group-title">${escapeHtml(n.label)}</div>`;
container.appendChild(box);
}


In renderNodes, draw groups first, then normal nodes.

CSS:

.group-box {
position: absolute;
border: 2px solid var(--gray-300);
border-radius: 10px;
background: var(--gray-50);
}
.group-title {
height: 28px;
line-height: 28px;
padding: 0 10px;
font-weight: 600;
border-bottom: 1px solid var(--gray-200);
background: var(--gray-100);
}

4️⃣ Validation layer & warning marks (!!)

Add a validation step to flag nodes with missing connections and show “!!” on them:

validate(nodes){
const problems = [];
const list = Array.isArray(nodes) ? nodes : Array.from(nodes.values());
list.forEach(n=>{
if(n.type !== 'group' && (!n.connections || n.connections.length === 0) && n.requiredOutput){
n.state = 'warning';
problems.push({ id: n.id, reason: 'Missing connection' });
}
});
this.refreshConnectionsOnly?.(); // avoid full DOM rebuild
return problems;
}

5️⃣ Make the “train” layout optional

Not all screens are linear sequences — make the train logic optional.

build(target, nodes, option = {}){
const useTrain = !!option.useTrain; // NEW
this._ctx = { /*...*/, train: useTrain ? parsedTrain : null };
if (useTrain) this._applyConnectionsFromTrain();
this.rerender(nodesLayer, svg, inner, nodes, makeOptions());
}

6️⃣ Snap to grid + simple orthogonal routing

Snap node positions during drag:

const GRID = 10;
n.position.x = Math.round((orig.x + dx) / GRID) * GRID;
n.position.y = Math.round((orig.y + dy) / GRID) * GRID;


Add an orthogonal path option (instead of Bézier):

_orthoPath(a, b){
const midX = (a.x + b.x) / 2;
return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
}
// allow edgeStyle: 'bezier' | 'ortho'

7️⃣ Inline buttons inside nodes (e.g., “Weiter”)

Support n.inlineActions = [{ label:'Weiter', onClick }]:

if (Array.isArray(n.inlineActions)){
const bar = document.createElement('span');
bar.className = 'inline-actions';
n.inlineActions.forEach(a=>{
const b = document.createElement('button');
b.className = 'chip';
b.textContent = a.label;
b.addEventListener('click', ev=>{
ev.stopPropagation();
a.onClick?.(n.id);
});
bar.appendChild(b);
});
option.appendChild(bar);
}

8️⃣ Top toolbar (Save / Run / Settings + Zoom)

Add a reusable toolbar API:

mountToolbar(container, { onPlay, onSave, onSettings }){
const t = document.createElement('div');
t.className = 'toolbar';
t.innerHTML = `
    <button class="icon play" title="Run">▶</button>
    <button class="icon save" title="Save">💾</button>
    <button class="icon gear" title="Settings">⚙️</button>
    <span class="zoom">
      <button class="icon" data-z="-">−</button>
      <span class="zv">${(this._scale * 100) | 0}%</span>
      <button class="icon" data-z="+">+</button>
      <button class="icon" data-z="0">⤾</button>
    </span>`;
container.prepend(t);

t.addEventListener('click', (e)=>{
const z = e.target?.dataset?.z;
if(z === '+') this.setScale(this._scale * 1.1, this._pz?.inner);
else if(z === '-') this.setScale(this._scale * 0.9, this._pz?.inner);
else if(z === '0') this.resetView();
t.querySelector('.zv').textContent = ((this._scale * 100) | 0) + '%';
if(e.target.classList.contains('play')) onPlay?.();
if(e.target.classList.contains('save')) onSave?.();
if(e.target.classList.contains('gear')) onSettings?.();
});
}

9️⃣ Diagram serialization / loading

Save and restore layout and state.

toJSON(){
const isMap = this._ctx?.nodes && typeof this._ctx.nodes.get === 'function';
const list = isMap ? Array.from(this._ctx.nodes.values()) : this._ctx.nodes;
return JSON.stringify({
nodes: list,
state: { pan: this._pan, scale: this._scale }
});
}

fromJSON(json){
const data = typeof json === 'string' ? JSON.parse(json) : json;
this._pan   = data.state?.pan   || {x:0, y:0};
this._scale = data.state?.scale || 1;
this.setPan(this._pan, this._ctx?.inner);
this.setScale(this._scale, this._ctx?.inner);
this.setNodes(data.nodes);
this.refresh(this._getRenderOptions?.());
}
1) Accept a train start node

Add startId to build(...) (or option.state.startId), store it in context, and expose setters/getters.

// inside build(...)
const startId = option.startId || option.state?.startId || null;
this._ctx = { wrapper, inner, svg, nodesLayer, nodes, state: option.state || null, train: parsedTrain, startId };

// public API
setStart(id, { refresh = true } = {}){
if(!this._ctx) return;
this._ctx.startId = id;
if (refresh) this.refresh?.(this._getRenderOptions?.());
}
getStart(){ return this._ctx?.startId || null; }

2) Apply train while respecting the start (logic unchanged)

Keep your existing logic; just ensure the first active node becomes startId if none is set.

_applyConnectionsFromTrain() {
if (!this._ctx || !Array.isArray(this._ctx.train)) return;
const N = this._ctx.nodes;
const isMap = N && typeof N.get === 'function';
const byId = id => isMap ? N.get(id) : (Array.isArray(N) ? N.find(x => x?.id === id) : null);

const list = isMap ? Array.from(N.values()) : (Array.isArray(N) ? N : []);
list.forEach(n => { if (n) n.connections = []; });

const t = this._ctx.train.slice();

// If startId not specified, pick the first *active* node in the train
let startId = this._ctx.startId;
if (!startId) {
const first = t.find(id => (byId(id)?.state !== 'disabled'));
this._ctx.startId = first || null;
}

// Connect each active node to the next active node
for (let i = 0; i < t.length; i++) {
const a = byId(t[i]); if (!a || a.state === 'disabled') continue;
let target = null;
for (let j = i + 1; j < t.length; j++){
const b = byId(t[j]);
if (b && b.state !== 'disabled') { target = b.id; break; }
}
a.connections = target ? [target] : [];
}
}

3) Draw a “start-of-line” arrow

Call this after you draw edges in renderConnections:

// after the connections loop
this._renderStartArrow(svg, canvasInner);


Implementation (uses a <g class="start-arrow"> so re-renders don’t stack):

_renderStartArrow(svg, canvasInner){
const startId = this._ctx?.startId; if (!startId) return;

// Clear previous
svg.querySelectorAll('g.start-arrow').forEach(g => g.remove());

const scope = this._ctx?.wrapper || document;
const startEl = scope.querySelector(`[data-node-id="${startId}"]`);
if (!startEl) return;

const r = startEl.getBoundingClientRect();
const base = this._ctx?.inner?.getBoundingClientRect() || { left:0, top:0 };
const nodeCenterY = r.top  - base.top  + r.height/2;
const nodeLeftX   = r.left - base.left;

const from = { x: Math.max(10, nodeLeftX - 80), y: nodeCenterY };
const to   = { x: nodeLeftX, y: nodeCenterY };

const g = document.createElementNS('http://www.w3.org/2000/svg','g');
g.setAttribute('class','start-arrow');

const path = document.createElementNS('http://www.w3.org/2000/svg','path');
path.setAttribute('d', `M ${from.x} ${from.y} L ${to.x} ${to.y}`);
path.setAttribute('fill','none');
path.setAttribute('stroke','var(--blue-700)');
path.setAttribute('stroke-width','3');
path.setAttribute('marker-end','url(#arrow)');
g.appendChild(path);

const c = document.createElementNS('http://www.w3.org/2000/svg','circle');
c.setAttribute('cx', from.x);
c.setAttribute('cy', from.y);
c.setAttribute('r', '5');
c.setAttribute('fill', 'var(--blue-700)');
g.appendChild(c);

svg.appendChild(g);
}

4) Quick UI usage
   nodesUI.build('#canvas', nodes, {
   connection: ['lang', 'einschr', 'verwaltung', 'frage', 'buchung', 'abschluss'],
   startId: 'lang',           // set the start here
   panZoomEnabled: true
   });

// Change start live (e.g., context menu “Make start”)
nodesUI.setStart('verwaltung'); // auto re-renders the entry arrow

5) UX polish (optional)

CSS highlight for start:

svg .start-arrow { stroke-dasharray: 5 3; }
[data-node-id].is-start .option-js {
box-shadow: 0 0 0 2px var(--blue-500) inset;
}


Add the class during node render:

// in renderNodes, after creating node element `el`
if (this._ctx?.startId === n.id) el.classList.add('is-start');
else el.classList.remove('is-start');