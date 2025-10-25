//
// Node Editor – modular single-file version
// Split into focused classes for readability while keeping one file.
//

// ---------- Utils ----------
function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[c]));
}

function h(tag, props = {}, attrs = {}) {
    const el = document.createElement(tag);
    Object.assign(el, props);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

function sv(tag, attrs = {}) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, String(v));
    return el;
}

class GeometryUtils {
    parsePoint(str) {
        if (typeof str !== 'string') return {x: 0, y: 0};
        const p = str.split(' ').map(Number);
        return {x: p[0] || 0, y: p[1] || 0};
    }

    stringifyPoint(pt) {
        if (!pt) return '0 0';
        return `${Math.round(pt.x)} ${Math.round(pt.y)}`;
    }
}

class CanvasManager {
    constructor() {
        this._scale = 1;
        this._pan = {x: 0, y: 0};
        this._pz = {enabled: false};
        this.inner = null;
        this.wrapper = null;
    }

    attach(wrapper, inner) {
        this.wrapper = wrapper;
        this.inner = inner;
        this._apply();
    }

    enablePanZoom() {
        if (this._pz.enabled || !this.wrapper || !this.inner) return;
        const onWheel = (e) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const f = e.deltaY < 0 ? 1.1 : 0.9;
            const prev = this._scale;
            const next = Math.max(0.4, Math.min(2.5, prev * f));
            const r = this.wrapper.getBoundingClientRect();
            const cx = (e.clientX - r.left - this._pan.x) / prev;
            const cy = (e.clientY - r.top - this._pan.y) / prev;
            this._pan.x -= cx * (next - prev);
            this._pan.y -= cy * (next - prev);
            this._scale = next;
            this._apply();
        };
        let pan = false, start = {x: 0, y: 0};
        const onMove = (e) => {
            if (!pan) return;
            this._pan.x = e.clientX - start.x;
            this._pan.y = e.clientY - start.y;
            this._apply();
        };
        const onUp = () => {
            pan = false;
            document.removeEventListener('mousemove', onMove);
        };
        const onDown = (e) => {
            if (e.target === this.wrapper || e.target === this.inner) {
                pan = true;
                start = {x: e.clientX - this._pan.x, y: e.clientY - this._pan.y};
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp, {once: true});
            }
        };
        this.wrapper.addEventListener('wheel', onWheel, {passive: false});
        this.wrapper.addEventListener('mousedown', onDown);
        this._pz = {enabled: true, onWheel, onDown};
        this._apply();
    }

    disablePanZoom() {
        if (!this._pz.enabled) return;
        const {onWheel, onDown} = this._pz;
        if (this.wrapper) {
            if (onWheel) this.wrapper.removeEventListener('wheel', onWheel);
            if (onDown) this.wrapper.removeEventListener('mousedown', onDown);
        }
        this._pz.enabled = false;
    }

    _apply() { if (this.inner) this.inner.style.transform = `translate(${this._pan.x}px, ${this._pan.y}px) scale(${this._scale})`; }

    setScale(v) {
        this._scale = Math.max(0.1, Math.min(10, Number(v) || 1));
        this._apply();
    }

    setPan(p) {
        this._pan = {x: Number(p.x) || 0, y: Number(p.y) || 0};
        this._apply();
    }

    getScale() { return this._scale; }

    getPan() { return {...this._pan}; }

    toCanvas(clientX, clientY) {
        const rect = this.inner.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this._pan.x) / this._scale,
            y: (clientY - rect.top - this._pan.y) / this._scale
        }
    }
}

class NodeRenderer {
    constructor(geom) { this.g = geom; }

    buildNodeElement(n, {
        onOpenConfig,
        onOpenEdit,
        onOpenHelp,
        onEnableChange,
        dragEnabled = false,
        onPositionChange,
        onDragStart,
        onDragEnd,
        getScale,
        controls = {}
    } = {}) {
        const container = h('div', {className: 'node-js'});
        if (n.category) container.classList.add(`node-category-${n.category.toLowerCase()}`);
        const pos = this.g.parsePoint(n.loc);
        // No disabled class coupling; checkbox is purely informational unless app hooks it
        Object.assign(container.style, {left: pos.x + 'px', top: pos.y + 'px'});
        container.setAttribute('data-node-id', n.id);
        container.title = `${n.label || n.text || ''} ${n.tag || ''}`.trim();
        const option = h('div', {className: 'option-js'}, {
            role: 'button',
            tabindex: '0',
            'aria-label': `${n.label || n.text || ''} ${n.tag || ''}`.trim()
        });
        // Do not set aria-disabled based on state; app can control aria via callbacks if needed
        const label = h('span', {className: 'label'});
        label.innerHTML = escapeHtml(n.label || n.text || '') + (n.tag ? ` <span class="tag">${escapeHtml(n.tag)}</span>` : '');
        const actions = h('span', {className: 'actions'});
        const enableCfg = Object.assign({visible: true, disabled: false}, controls.enableToggle || {});
        const editCfg = Object.assign({visible: true, disabled: false}, controls.editButton || {});
        const helpCfg = Object.assign({visible: true, disabled: false}, controls.helpButton || {});
        if (enableCfg.visible) {
            const enable = h('label', {className: 'enable-toggle', title: 'Aktivieren/Deaktivieren'});
            const cb = h('input', {type: 'checkbox', checked: n.state !== 'disabled'});
            if (enableCfg.disabled) cb.disabled = true;
            cb.addEventListener('click', (ev) => {
                ev.stopPropagation();
                // Do not change internal node state here; delegate behavior to app via callback
                if (typeof onEnableChange === 'function') onEnableChange(n.id, !!cb.checked);
            });
            enable.appendChild(cb);
            option.appendChild(enable);
        }
        option.appendChild(label);
        if (editCfg.visible) {
            const btn = h('button', {className: 'mini-btn', title: 'Bearbeiten'});
            btn.innerHTML = NodeUI.ICONS.edit;
            if (editCfg.disabled) btn.disabled = true;
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                onOpenEdit && onOpenEdit(n.id);
            });
            actions.appendChild(btn);
        }
        if (helpCfg.visible) {
            const btn = h('button', {className: 'mini-btn', title: 'Hilfe'});
            btn.innerHTML = NodeUI.ICONS.help;
            if (helpCfg.disabled) btn.disabled = true;
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                onOpenHelp && onOpenHelp(n.id);
            });
            actions.appendChild(btn);
        }
        option.appendChild(actions);
        option.addEventListener('click', () => onOpenConfig && onOpenConfig(n.id));
        option.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onOpenConfig && onOpenConfig(n.id);
            }
        });
        option.addEventListener('focus', () => option.classList.add('focus-ring'));
        option.addEventListener('blur', () => option.classList.remove('focus-ring'));
        if (dragEnabled) {
            const getScaleSafe = typeof getScale === 'function' ? getScale : () => 1;
            const onDown = (e) => {
                if (e.button !== 0) return;
                const start = {x: e.clientX, y: e.clientY};
                const orig = this.g.parsePoint(n.loc);
                const onMove = (ev) => {
                    const s = getScaleSafe() || 1;
                    const cur = {
                        x: Math.round(orig.x + (ev.clientX - start.x) / s),
                        y: Math.round(orig.y + (ev.clientY - start.y) / s)
                    };
                    Object.assign(container.style, {left: cur.x + 'px', top: cur.y + 'px'});
                    n.loc = this.g.stringifyPoint(cur);
                    if (typeof onPositionChange === 'function') onPositionChange(n);
                };
                const onUp = () => {
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    if (typeof onDragEnd === 'function') onDragEnd(n);
                };
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp, {once: true});
                if (typeof onDragStart === 'function') onDragStart(n);
            };
            container.addEventListener('mousedown', onDown);
        }
        container.appendChild(option);
        return container;
    }

    renderNodes(layer, nodes, options = {}) {
        while (layer.firstChild) layer.removeChild(layer.firstChild);
        const list = Array.isArray(nodes) ? nodes : (nodes && typeof nodes.values === 'function' ? Array.from(nodes.values()) : []);
        list.forEach(n => {
            const el = this.buildNodeElement(n, {
                onOpenConfig: n.openConfig,
                onOpenEdit: n.openEdit,
                onOpenHelp: n.openHelp,
                onEnableChange: n.onChangeCheckbox,
                dragEnabled: true,
                getScale: options.getScale,
                onPositionChange: options.onPositionChange,
                onDragStart: options.onDragStart,
                onDragEnd: options.onDragEnd,
                controls: options.controls
            });
            layer.appendChild(el);
        });
    }
}

class EdgeHandleController {
    constructor(canvas) { this.canvas = canvas; }

    attach({svg, inner, a, b, conn, nodes, rebuildPath, rerender}) {
        const toCanvas = (ev) => this.canvas.toCanvas(ev.clientX, ev.clientY);
        const makeHandle = (x, y, cls) => {
            const c = sv('circle', {
                cx: x,
                cy: y,
                r: cls === 'edge-mid-handle' ? 4 : 5,
                class: cls
            });
            svg.appendChild(c);
            return c;
        };
        const hasPts = Array.isArray(conn.points) && conn.points.length > 0;
        const route = [a, ...(hasPts ? conn.points : []), b];
        if (hasPts) {
            conn.points.forEach((p, idx) => {
                const h = makeHandle(p.x, p.y, 'edge-handle');
                let drag = false;
                const onMove = (ev) => {
                    if (!drag) return;
                    const pos = toCanvas(ev);
                    p.x = Math.round(pos.x);
                    p.y = Math.round(pos.y);
                    h.setAttribute('cx', p.x);
                    h.setAttribute('cy', p.y);
                    rebuildPath();
                };
                const onUp = () => {
                    drag = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    rerender();
                };
                h.addEventListener('mousedown', (ev) => {
                    ev.stopPropagation();
                    drag = true;
                    document.addEventListener('mousemove', onMove);
                    document.addEventListener('mouseup', onUp, {once: true});
                });
                h.addEventListener('dblclick', (ev) => {
                    ev.stopPropagation();
                    conn.points.splice(idx, 1);
                    rerender();
                });
            });
        }
        for (let i = 0; i < route.length - 1; i++) {
            const p1 = route[i], p2 = route[i + 1];
            const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
            const insertIndex = Math.min(i, (conn.points ? conn.points.length : 0));
            const mid = makeHandle(mx, my, 'edge-mid-handle');
            mid.addEventListener('mousedown', (ev) => {
                ev.stopPropagation();
                if (!Array.isArray(conn.points)) conn.points = [];
                conn.points.splice(insertIndex, 0, {x: Math.round(mx), y: Math.round(my)});
                rerender();
            });
        }
    }
}

class EdgeRenderer {
    constructor(geom, canvas, handles) {
        this.g = geom;
        this.canvas = canvas;
        this.handles = handles;
        this._nodes = null;
    }

    _ensureArrowMarker(svg) {
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = sv('defs');
            svg.prepend(defs);
        }
        let m = svg.querySelector('#arrow');
        if (!m) {
            m = sv('marker', {id: 'arrow', markerWidth: 10, markerHeight: 7, refX: 9, refY: 3.5, orient: 'auto'});
            const poly = sv('polygon', {points: '0 0, 10 3.5, 0 7', fill: 'currentColor'});
            m.appendChild(poly);
            defs.appendChild(m);
        }
    }

    _getNodeAnchor(id, spot = 'Center') {
        const el = document.querySelector(`[data-node-id="${id}"]`);
        if (!el) return {x: 0, y: 0};
        const pos = this.g.parsePoint(el.style.left.replace('px', '') + ' ' + el.style.top.replace('px', ''));
        const w = el.offsetWidth, h = el.offsetHeight;
        switch (spot) {
            case 'Top':
                return {x: pos.x + w / 2, y: pos.y};
            case 'Bottom':
                return {x: pos.x + w / 2, y: pos.y + h};
            case 'Left':
                return {x: pos.x, y: pos.y + h / 2};
            case 'Right':
                return {x: pos.x + w, y: pos.y + h / 2};
            case 'TopLeft':
                return {x: pos.x, y: pos.y};
            case 'TopRight':
                return {x: pos.x + w, y: pos.y};
            case 'BottomLeft':
                return {x: pos.x, y: pos.y + h};
            case 'BottomRight':
                return {x: pos.x + w, y: pos.y + h};
            default:
                return {x: pos.x + w / 2, y: pos.y + h / 2};
        }
    }

    _orth(a, b) {
        const dx = b.x - a.x;
        const midX = a.x + dx / 2;
        return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
    }

    _route(a, b, routing, fromId, toId) {
        // Simplified: only orthogonal routing is supported
        return this._orth(a, b);
    }

    render(svg, inner, nodes, ctx) {
        this._nodes = nodes;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        svg.setAttribute('viewBox', `0 0 ${parseInt(inner.style.width || 2000)} ${parseInt(inner.style.height || 1200)}`);
        const isMap = nodes && typeof nodes.get === 'function';
        const getById = (id) => isMap ? nodes.get(id) : (Array.isArray(nodes) ? nodes.find(x => x.id === id) : null);
        const list = isMap ? Array.from(nodes.values()) : (Array.isArray(nodes) ? nodes : []);
        list.forEach(n => {
            (n.connections || []).forEach(conn => {
                const t = getById(conn.to);
                if (!t) return;
                let a = this._getNodeAnchor(n.id, conn.fromSpot || 'Center');
                let b = this._getNodeAnchor(t.id, conn.toSpot || 'Center');
                if ((a.x === 0 && a.y === 0 && n.id !== 0) || (b.x === 0 && b.y === 0 && t.id !== 0)) return;
                const ang = Math.atan2(b.y - a.y, b.x - a.x);
                if (conn.fromShortLength > 0) {
                    a.x += Math.cos(ang) * conn.fromShortLength;
                    a.y += Math.sin(ang) * conn.fromShortLength;
                }
                if (conn.toShortLength > 0) {
                    b.x -= Math.cos(ang) * conn.toShortLength;
                    b.y -= Math.sin(ang) * conn.toShortLength;
                }
                const hasPts = Array.isArray(conn.points) && conn.points.length > 0;
                const build = (s, e, pts) => [s, ...pts, e].map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
                const d = hasPts ? build(a, b, conn.points) : this._route(a, b, 'orthogonal', n.id, t.id);
                const path = sv('path', {
                    d,
                    fill: 'none',
                    stroke: conn.color || '#3b82f6',
                    'stroke-width': String(conn.strokeWidth || 2),
                    'marker-end': 'url(#arrow)'
                });
                if (conn.dashArray) path.setAttribute('stroke-dasharray', conn.dashArray.join(' '));
                if (conn.dashed) path.setAttribute('stroke-dasharray', '6,4');
                path.addEventListener('mouseenter', () => path.setAttribute('stroke', '#2563EB'));
                path.addEventListener('mouseleave', () => path.setAttribute('stroke', conn.color || '#3b82f6'));
                svg.appendChild(path);
                if (conn.text) {
                    setTimeout(() => {
                        if (path.getTotalLength) {
                            const mid = path.getPointAtLength(path.getTotalLength() / 2);
                            const txt = sv('text', {x: mid.x, y: mid.y, 'text-anchor': 'middle', dy: '-5'});
                            txt.textContent = conn.text;
                            Object.assign(txt.style, {fill: 'black', fontSize: '12px', pointerEvents: 'none'});
                            svg.appendChild(txt);
                        }
                    }, 0);
                }
                this._ensureArrowMarker(svg);
                if (ctx && ctx.lineControlsEnabled) {
                    const rerender = () => { requestAnimationFrame(() => this.render(svg, inner, nodes, ctx)); };
                    const rebuildPath = () => {
                        const dNew = hasPts ? build(a, b, conn.points) : this._route(a, b, 'orthogonal', n.id, t.id);
                        path.setAttribute('d', dNew);
                    };
                    this.handles.attach({svg, inner, a, b, conn, nodes, rebuildPath, rerender});
                }
            });
        });
    }
}

class NodeUI {
    static ICONS = {
        edit: `<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z\"/></svg>`,
        help: `<svg viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" aria-hidden=\"true\"><path fill=\"currentColor\" d=\"M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H8a4 4 0 1 1 7.07 2.25z\"/></svg>`
    };

    constructor() {
        this.g = new GeometryUtils();
        this.canvas = new CanvasManager();
        this.nodes = new NodeRenderer(this.g);
        this.handles = new EdgeHandleController(this.canvas);
        this.edges = new EdgeRenderer(this.g, this.canvas, this.handles);
        this._ctx = null;
        this._getRenderOptions = null;
    }

    ensureCanvas(container, {width = 2000, height = 1200, panZoomEnabled = false} = {}) {
        if (!container) throw new Error('ensureCanvas: container is required');
        let wrapper = container.querySelector('.canvas-wrapper');
        if (!wrapper) {
            wrapper = h('div', {className: 'canvas-wrapper'});
            container.appendChild(wrapper);
        }
        let inner = wrapper.querySelector('.canvas-inner');
        if (!inner) {
            inner = h('div', {className: 'canvas-inner'});
            wrapper.appendChild(inner);
        }
        if (!inner.style.width) inner.style.width = width + 'px';
        if (!inner.style.height) inner.style.height = height + 'px';
        let svg = inner.querySelector('svg.connections-layer');
        if (!svg) {
            svg = sv('svg', {class: 'connections-layer'});
            inner.appendChild(svg);
        }
        let nodesLayer = inner.querySelector('.nodes-layer');
        if (!nodesLayer) {
            nodesLayer = h('div', {className: 'nodes-layer'});
            inner.appendChild(nodesLayer);
        }
        svg.setAttribute('width', inner.style.width || width + 'px');
        svg.setAttribute('height', inner.style.height || height + 'px');
        svg.setAttribute('viewBox', `0 0 ${parseInt(inner.style.width || width)} ${parseInt(inner.style.height || height)}`);
        this.canvas.attach(wrapper, inner);
        if (panZoomEnabled) this.canvas.enablePanZoom();
        return {wrapper, inner, svg, nodesLayer};
    }

    build(target, nodes, option = {}) {
        let mount = null;
        if (typeof target === 'string') mount = document.querySelector(target); else if (target && target.nodeType === 1) mount = target;
        if (!mount) mount = document.body;
        const {wrapper, inner, svg, nodesLayer} = this.ensureCanvas(mount, option);
        if (option.state && typeof option.state === 'object') {
            if (typeof option.state.scale === 'number') this.canvas.setScale(option.state.scale);
            if (option.state.pan) this.canvas.setPan(option.state.pan);
        }
        this._ctx = {
            wrapper,
            inner,
            svg,
            nodesLayer,
            nodes,
            state: option.state || null,
            lineControlsEnabled: !!option.lineControlsEnabled
        };
        this._getRenderOptions = () => option.renderOptions || this.defaultRenderOptions(this._ctx.state, svg, inner, this._ctx.nodes);
        this.rerender(nodesLayer, svg, inner, nodes, this._getRenderOptions());
        return {wrapper, inner, svg, nodesLayer};
    }

    setLineControlsEnabled(flag) {
        if (!this._ctx) return;
        this._ctx.lineControlsEnabled = !!flag;
        this.refresh();
    }

    setNodes(nodes) { if (this._ctx) this._ctx.nodes = nodes; }

    refresh(options) {
        if (!this._ctx) return;
        this.rerender(this._ctx.nodesLayer, this._ctx.svg, this._ctx.inner, this._ctx.nodes, options || (this._getRenderOptions ? this._getRenderOptions() : {}));
    }

    rerender(container, svg, inner, nodes, options = {}) {
        this.nodes.renderNodes(container, nodes, options);
        requestAnimationFrame(() => this.edges.render(svg, inner, nodes, this._ctx));
    }

    defaultRenderOptions(state, svg, inner, nodes, record) {
        const onPositionChange = (nodeObj) => {
            if (record) record(nodeObj.id, 'position-change', {loc: nodeObj.loc});
            this.edges.render(svg, inner, nodes, this._ctx);
        };
        return {
            getScale: () => (state && typeof state.scale === 'number' ? state.scale : this.canvas.getScale()),
            onPositionChange,
            onDragStart: (n) => { if (record) record(n.id, 'drag-start', {loc: n.loc}); },
            onDragEnd: (n) => { if (record) record(n.id, 'drag-end', {loc: n.loc}); },
            controls: {
                enableToggle: {visible: true},
                connectToggle: {visible: false},
                editButton: {visible: true},
                helpButton: {visible: true}
            }
        };
    }
}
