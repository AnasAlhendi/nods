//
// Node UI class: builds node DOM and exposes helpers (ES module)
// ** Simplified and enhanced version **
// This version is modified to mimic GoJS-style line/connection control.
//

/**
 * Escapes special HTML characters in a string.
 * @param {string} s The string to escape.
 * @returns {string} The escaped string.
 */
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    '\'': '&#39;'
  }[c]));
}

class NodeUI {
  /**
   * Static object containing SVG icons used in the UI.
   */
  static ICONS = {
    edit: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>`,
    help: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H8a4 4 0 1 1 7.07 2.25z"/></svg>`,
  };

  /**
   * Initializes a new NodeUI instance.
   */
  constructor() {
    this._scale = 1;
    this._pan = { x: 0, y: 0 };
    this._pz = { enabled: false };
    this._ctx = null;
    this._getRenderOptions = null;
    this._nodes = null;
  }

  /**
   * Parses a string like "100 200" into a point object.
   * @param {string} str The string to parse.
   * @returns {{x: number, y: number}}
   */
  parsePoint(str) {
    if (typeof str !== 'string') return { x: 0, y: 0 };
    const parts = str.split(' ').map(s => parseFloat(s));
    return { x: parts[0] || 0, y: parts[1] || 0 };
  }

  /**
   * Converts a point object into a string like "100 200".
   * @param {{x: number, y: number}} point The point object.
   * @returns {string}
   */
  stringifyPoint(point) {
    if (!point) return "0 0";
    return `${Math.round(point.x)} ${Math.round(point.y)}`;
  }

  /**
   * Builds the DOM element for a single node.
   * @param {object} n The node data object.
   * @param {object} options Configuration for events and controls.
   * @returns {HTMLElement}
   */
  buildNodeElement(
      n,
      {
        onOpenConfig, onOpenEdit, onOpenHelp, onEnableChange,
        dragEnabled = false, onPositionChange, onDragStart, onDragEnd, getScale,
        controls = {},
      } = {}
  ) {
    const container = document.createElement('div');
    container.className = 'node-js';
    if (n.category) container.classList.add(`node-category-${n.category.toLowerCase()}`);

    const position = this.parsePoint(n.loc);
    if (n.state === 'disabled') container.classList.add('disabled');
    container.style.left = position.x + 'px';
    container.style.top = position.y + 'px';
    container.dataset.nodeId = n.id;
    container.title = `${n.label || n.text || ''} ${n.tag || ''}`.trim();

    const option = document.createElement('div');
    option.className = 'option-js';
    option.setAttribute('role', 'button');
    option.setAttribute('tabindex', '0');
    option.setAttribute('aria-label', `${n.label || n.text || ''} ${n.tag || ''}`.trim());
    if (n.state === 'disabled') option.setAttribute('aria-disabled', 'true');

    const label = document.createElement('span');
    label.className = 'label';
    label.innerHTML = `${escapeHtml(n.label || n.text || '')}${n.tag ? ` <span class="tag">${escapeHtml(n.tag)}</span>` : ''}`;

    const actions = document.createElement('span');
    actions.className = 'actions';

    const enableCfg = Object.assign({ visible: true, disabled: false }, controls.enableToggle || {});
    const editCfg = Object.assign({ visible: true, disabled: false }, controls.editButton || {});
    const helpCfg = Object.assign({ visible: true, disabled: false }, controls.helpButton || {});

    if (enableCfg.visible) {
      const enable = document.createElement('label');
      enable.className = 'enable-toggle';
      enable.title = 'Aktivieren/Deaktivieren';
      const enableInput = document.createElement('input');
      enableInput.type = 'checkbox';
      enableInput.checked = n.state !== 'disabled';
      if (enableCfg.disabled) enableInput.disabled = true;
      enableInput.addEventListener('click', (ev) => {
        ev.stopPropagation();
        n.state = enableInput.checked ? 'enabled' : 'disabled';
        if (typeof onEnableChange === 'function') onEnableChange(n.id, n.state === 'enabled');
        if (this._ctx) this.refresh();
      });
      enable.appendChild(enableInput);
      option.appendChild(enable);
    }

    option.appendChild(label);

    if (editCfg.visible) {
      const btnEdit = document.createElement('button');
      btnEdit.className = 'mini-btn';
      btnEdit.title = 'Bearbeiten';
      btnEdit.innerHTML = NodeUI.ICONS.edit;
      if (editCfg.disabled || n.state === 'disabled') btnEdit.disabled = true;
      btnEdit.addEventListener('click', (ev) => { ev.stopPropagation(); onOpenEdit && onOpenEdit(n.id); });
      actions.appendChild(btnEdit);
    }

    if (helpCfg.visible) {
      const btnHelp = document.createElement('button');
      btnHelp.className = 'mini-btn';
      btnHelp.title = 'Hilfe';
      btnHelp.innerHTML = NodeUI.ICONS.help;
      if (helpCfg.disabled || n.state === 'disabled') btnHelp.disabled = true;
      btnHelp.addEventListener('click', (ev) => { ev.stopPropagation(); onOpenHelp && onOpenHelp(n.id); });
      actions.appendChild(btnHelp);
    }

    option.appendChild(actions);

    option.addEventListener('click', () => onOpenConfig && onOpenConfig(n.id));
    option.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenConfig && onOpenConfig(n.id); } });
    option.addEventListener('focus', () => option.classList.add('focus-ring'));
    option.addEventListener('blur', () => option.classList.remove('focus-ring'));

    if (dragEnabled) {
      const getScaleSafe = typeof getScale === 'function' ? getScale : () => 1;
      const onMouseDown = (e) => {
        if (e.button !== 0 || n.state === 'disabled') return;
        const start = { x: e.clientX, y: e.clientY };
        const origPos = this.parsePoint(n.loc);
        const onMove = (ev) => {
          const scale = getScaleSafe() || 1;
          const currentPos = {
            x: Math.round(origPos.x + (ev.clientX - start.x) / scale),
            y: Math.round(origPos.y + (ev.clientY - start.y) / scale)
          };
          container.style.left = currentPos.x + 'px';
          container.style.top = currentPos.y + 'px';
          n.loc = this.stringifyPoint(currentPos);
          if (typeof onPositionChange === 'function') onPositionChange(n);
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (typeof onDragEnd === 'function') onDragEnd(n);
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp, { once: true });
        if (typeof onDragStart === 'function') onDragStart(n);
      };
      container.addEventListener('mousedown', onMouseDown);
    }

    container.appendChild(option);
    return container;
  }

  /**
   * Ensures the canvas structure exists inside a container.
   * @param {HTMLElement} container The parent element for the canvas.
   * @param {object} options Canvas dimensions and behavior.
   * @returns {{wrapper: HTMLElement, inner: HTMLElement, svg: SVGElement, nodesLayer: HTMLElement}}
   */
  ensureCanvas(container, { width = 2000, height = 1200, panZoomEnabled = false } = {}) {
    if (!container) throw new Error('ensureCanvas: container is required');
    let wrapper = container.querySelector('.canvas-wrapper');
    if (!wrapper) {
      wrapper = document.createElement('div');
      wrapper.className = 'canvas-wrapper';
      container.appendChild(wrapper);
    }
    let inner = wrapper.querySelector('.canvas-inner');
    if (!inner) {
      inner = document.createElement('div');
      inner.className = 'canvas-inner';
      wrapper.appendChild(inner);
    }
    if (!inner.style.width) inner.style.width = width + 'px';
    if (!inner.style.height) inner.style.height = height + 'px';

    let svg = inner.querySelector('svg.connections-layer');
    if (!svg) {
      svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('class', 'connections-layer');
      inner.appendChild(svg);
    }
    let nodesLayer = inner.querySelector('.nodes-layer');
    if (!nodesLayer) {
      nodesLayer = document.createElement('div');
      nodesLayer.className = 'nodes-layer';
      inner.appendChild(nodesLayer);
    }

    svg.setAttribute('width', inner.style.width || (width + 'px'));
    svg.setAttribute('height', inner.style.height || (height + 'px'));
    svg.setAttribute('viewBox', `0 0 ${parseInt(inner.style.width||width)} ${parseInt(inner.style.height||height)}`);

    if (panZoomEnabled) this.enablePanZoom(wrapper, inner);
    return { wrapper, inner, svg, nodesLayer };
  }

  build(target, nodes, option = {}){
    let mount = null;
    if (typeof target === 'string') {
      mount = document.querySelector(target);
    } else if (target && target.nodeType === 1) {
      mount = target;
    }
    if (!mount) mount = document.body;

    const { wrapper, inner, svg, nodesLayer } = this.ensureCanvas(mount, option);

    if (option.state && typeof option.state === 'object') {
      if (typeof option.state.scale === 'number') this.setScale(option.state.scale, inner);
      if (option.state.pan) this.setPan(option.state.pan, inner);
    }

    this._ctx = { wrapper, inner, svg, nodesLayer, nodes, state: option.state || null };
    // Feature flags / options
    this._ctx.lineControlsEnabled = !!option.lineControlsEnabled;
    this._getRenderOptions = () => option.renderOptions || this.defaultRenderOptions(
        this._ctx.state, svg, inner, this._ctx.nodes
    );

    this.rerender(nodesLayer, svg, inner, nodes, this._getRenderOptions());
    return { wrapper, inner, svg, nodesLayer };
  }

  /**
   * Updates the node data array used by the UI.
   * @param {Array<object>} nodes New array of node data.
   */
  setNodes(nodes){ if (this._ctx) this._ctx.nodes = nodes; }

  /**
   * Forces a full refresh of the UI.
   * @param {object} options Optional new render options.
   */
  refresh(options){ if (!this._ctx) return; this.rerender(this._ctx.nodesLayer, this._ctx.svg, this._ctx.inner, this._ctx.nodes, options || (this._getRenderOptions ? this._getRenderOptions() : {})); }

  /**
   * Enables pan and zoom functionality on the canvas.
   * @param {HTMLElement} wrapper The outer scrollable/panning container.
   * @param {HTMLElement} inner The inner zoomable container.
   */
  enablePanZoom(wrapper, inner) {
    if (this._pz.enabled) return;
    const onWheel = (e) => {
      if (!e.ctrlKey) return; // Zoom only with Ctrl key
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.1 : 0.9;
      const prev = this._scale;
      const next = Math.max(0.4, Math.min(2.5, prev * factor));
      const rect = wrapper.getBoundingClientRect();
      const cx = (e.clientX - rect.left - this._pan.x) / prev;
      const cy = (e.clientY - rect.top - this._pan.y) / prev;
      this._pan.x -= cx * (next - prev);
      this._pan.y -= cy * (next - prev);
      this._scale = next;
      this._applyTransform(inner);
    };
    let panning = false; let panStart = { x: 0, y: 0 };
    const onPanMove = (e) => {
      if (!panning) return;
      this._pan.x = e.clientX - panStart.x;
      this._pan.y = e.clientY - panStart.y;
      this._applyTransform(inner);
    };
    const onPanEnd = () => {
      panning = false;
      document.removeEventListener('mousemove', onPanMove);
    };
    const onMouseDown = (e) => {
      if (e.target === wrapper || e.target === inner) {
        panning = true;
        panStart = { x: e.clientX - this._pan.x, y: e.clientY - this._pan.y };
        document.addEventListener('mousemove', onPanMove);
        document.addEventListener('mouseup', onPanEnd, { once: true });
      }
    };
    wrapper.addEventListener('wheel', onWheel, { passive: false });
    wrapper.addEventListener('mousedown', onMouseDown);
    this._pz = { enabled: true, wrapper, inner, onWheel, onMouseDown };
    this._applyTransform(inner);
  }

  /**
   * Disables pan and zoom functionality.
   */
  disablePanZoom(){
    if (!this._pz.enabled) return;
    const { wrapper, onWheel, onMouseDown } = this._pz;
    if (wrapper && onWheel) wrapper.removeEventListener('wheel', onWheel);
    if (wrapper && onMouseDown) wrapper.removeEventListener('mousedown', onMouseDown);
    this._pz.enabled = false;
  }

  /**
   * Applies the current pan and zoom transform to the canvas inner element.
   * @param {HTMLElement} inner
   */
  _applyTransform(inner){
    if (inner) inner.style.transform = `translate(${this._pan.x}px, ${this._pan.y}px) scale(${this._scale})`;
  }

  getScale(){ return this._scale; }
  getPan(){ return { ...this._pan }; }
  setScale(v, inner){ this._scale = Math.max(0.1, Math.min(10, Number(v) || 1)); this._applyTransform(inner || (this._pz && this._pz.inner)); }
  setPan(p, inner){ this._pan = { x: Number(p.x)||0, y: Number(p.y)||0 }; this._applyTransform(inner || (this._pz && this._pz.inner)); }

  /**
   * Renders all connections (lines) between nodes.
   * @param {SVGElement} svg The SVG layer for connections.
   * @param {HTMLElement} canvasInner The main canvas content area.
   * @param {Array<object>} nodes The array of node data.
   */
  renderConnections(svg, canvasInner, nodes) {
    this._nodes = nodes;
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    svg.setAttribute('viewBox', `0 0 ${parseInt(canvasInner.style.width||2000)} ${parseInt(canvasInner.style.height||1200)}`);

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

        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        if (conn.fromShortLength > 0) {
          a.x += Math.cos(angle) * conn.fromShortLength;
          a.y += Math.sin(angle) * conn.fromShortLength;
        }
        if (conn.toShortLength > 0) {
          b.x -= Math.cos(angle) * conn.toShortLength;
          b.y -= Math.sin(angle) * conn.toShortLength;
        }

        const hasManualPoints = Array.isArray(conn.points) && conn.points.length > 0;
        const buildPathWithPoints = (start, end, points) => {
          const pts = [start, ...points, end];
          return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
        };
        const d = hasManualPoints
          ? buildPathWithPoints(a, b, conn.points)
          : this._drawPath(a, b, conn.routing || 'bezier', n.id, t.id);

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', conn.color || '#3b82f6');
        path.setAttribute('stroke-width', conn.strokeWidth || '2');
        if (conn.dashArray) path.setAttribute('stroke-dasharray', conn.dashArray.join(' '));
        path.setAttribute('marker-end', 'url(#arrow)');

        path.addEventListener('mouseenter', () => path.setAttribute('stroke', '#2563EB'));
        path.addEventListener('mouseleave', () => path.setAttribute('stroke', conn.color || '#3b82f6'));
        svg.appendChild(path);

        if (conn.text) {
          setTimeout(() => {
            if (path.getTotalLength) {
              const midPoint = path.getPointAtLength(path.getTotalLength() / 2);
              const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
              text.setAttribute('x', midPoint.x);
              text.setAttribute('y', midPoint.y);
              text.setAttribute('text-anchor', 'middle');
              text.setAttribute('dy', '-5');
              text.textContent = conn.text;
              text.style.fill = 'black';
              text.style.fontSize = '12px';
              text.style.pointerEvents = 'none';
              svg.appendChild(text);
            }
          }, 0);
        }

        // Draw.io-like line control: only when enabled via option
        const showHandles = !!(this._ctx && this._ctx.lineControlsEnabled);
        if (showHandles) {
          const makeHandle = (cx, cy, cls) => {
            const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            c.setAttribute('cx', cx);
            c.setAttribute('cy', cy);
            c.setAttribute('r', cls === 'edge-mid-handle' ? 4 : 5);
            c.setAttribute('class', cls);
            svg.appendChild(c);
            return c;
          };
          const toCanvas = (clientX, clientY) => {
            const rect = canvasInner.getBoundingClientRect();
            const scale = this.getScale();
            const pan = this.getPan();
            return {
              x: (clientX - rect.left - pan.x) / scale,
              y: (clientY - rect.top - pan.y) / scale,
            };
          };

          // Existing bends: draggable circles
          if (hasManualPoints) {
            conn.points.forEach((p, idx) => {
              const h = makeHandle(p.x, p.y, 'edge-handle');
              let dragging = false;
              const onMove = (ev) => {
                if (!dragging) return;
                const pos = toCanvas(ev.clientX, ev.clientY);
                p.x = Math.round(pos.x);
                p.y = Math.round(pos.y);
                h.setAttribute('cx', p.x);
                h.setAttribute('cy', p.y);
                path.setAttribute('d', buildPathWithPoints(a, b, conn.points));
              };
              const onUp = () => {
                dragging = false;
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
                this.renderConnections(svg, canvasInner, nodes);
              };
              h.addEventListener('mousedown', (ev) => {
                ev.stopPropagation();
                dragging = true;
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp, { once: true });
              });
              h.addEventListener('dblclick', (ev) => {
                ev.stopPropagation();
                conn.points.splice(idx, 1);
                this.renderConnections(svg, canvasInner, nodes);
              });
            });
          }

          // Insert handles at midpoints between consecutive route points
          const routePts = [a, ...(hasManualPoints ? conn.points : []), b];
          if (routePts.length >= 2) {
            for (let i = 0; i < routePts.length - 1; i++) {
              const p1 = routePts[i], p2 = routePts[i+1];
              const mx = (p1.x + p2.x) / 2;
              const my = (p1.y + p2.y) / 2;
              const insertIndex = Math.min(i, (conn.points ? conn.points.length : 0));
              const midH = makeHandle(mx, my, 'edge-mid-handle');
              midH.addEventListener('mousedown', (ev) => {
                ev.stopPropagation();
                if (!Array.isArray(conn.points)) conn.points = [];
                conn.points.splice(insertIndex, 0, { x: Math.round(mx), y: Math.round(my) });
                this.renderConnections(svg, canvasInner, nodes);
              });
            }
          }
        }
      });
    });
    this._ensureArrowMarker(svg);
  }

  /**
   * Selects the correct path drawing function based on the routing type.
   */
  _drawPath(a, b, routing, fromId, toId) {
    switch (routing) {
      case 'orthogonal': return this._orthogonalPath(a, b);
      case 'avoidsNodes': return this._avoidsNodesPath(a, b, fromId, toId);
      case 'bezier': default: return this._bezierPath(a, b);
    }
  }

  /**
   * Generates an SVG path string for a Bezier curve.
   */
  _bezierPath(a, b) {
    const dx = Math.max(60, Math.abs(b.x - a.x) * 0.4);
    return `M ${a.x} ${a.y} C ${a.x + dx} ${a.y}, ${b.x - dx} ${b.y}, ${b.x} ${b.y}`;
  }

  /**
   * Generates an SVG path string for an orthogonal (right-angled) line.
   */
  _orthogonalPath(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const midX = a.x + dx / 2;
    return `M ${a.x} ${a.y} L ${midX} ${a.y} L ${midX} ${b.y} L ${b.x} ${b.y}`;
  }

  /**
   * Generates a path that attempts to avoid other nodes. (Simple implementation)
   */
  _avoidsNodesPath(a, b, fromId, toId) {
    const obstacles = [];
    const list = Array.isArray(this._nodes) ? this._nodes : [];
    list.forEach(node => {
      if (node.id !== fromId && node.id !== toId) obstacles.push(this._getNodeRect(node.id));
    });
    const midX = (a.x + b.x) / 2;
    let pathPoints = [a, { x: midX, y: a.y }, { x: midX, y: b.y }, b];
    const verticalSegment = { p1: pathPoints[1], p2: pathPoints[2] };
    const collidingObstacles = obstacles.filter(rect => this._lineIntersectsRect(verticalSegment.p1, verticalSegment.p2, rect));
    if (collidingObstacles.length > 0) {
      let maxRight = -Infinity;
      collidingObstacles.forEach(rect => { maxRight = Math.max(maxRight, rect.x + rect.width); });
      const detour = maxRight + 20;
      pathPoints[1].x = detour;
      pathPoints[2].x = detour;
    }
    return pathPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  _getNodeRect(id) {
    const el = document.querySelector(`[data-node-id="${id}"]`);
    if (!el) return { x: 0, y: 0, width: 0, height: 0 };
    const position = this.parsePoint(el.style.left.replace('px','') + ' ' + el.style.top.replace('px',''));
    return { x: position.x, y: position.y, width: el.offsetWidth, height: el.offsetHeight };
  }

  _lineIntersectsRect(p1, p2, rect) {
    const minX = rect.x, maxX = rect.x + rect.width, minY = rect.y, maxY = rect.y + rect.height;
    const checkLine = (x1, y1, x2, y2) => {
      const den = (p1.x - p2.x) * (y1 - y2) - (p1.y - p2.y) * (x1 - x2);
      if (den === 0) return false;
      const t = ((p1.x - x1) * (y1 - y2) - (p1.y - y1) * (x1 - x2)) / den;
      const u = -((p1.x - p2.x) * (p1.y - y1) - (p1.y - p2.y) * (p1.x - x1)) / den;
      return t > 0 && t < 1 && u > 0 && u < 1;
    };
    return checkLine(minX, minY, maxX, minY) || checkLine(minX, minY, minX, maxY) || checkLine(maxX, minY, maxX, maxY) || checkLine(minX, maxY, maxX, maxY);
  }

  /**
   * Ensures the SVG arrow marker definition exists.
   * @param {SVGElement} svg
   */
  _ensureArrowMarker(svg){ let defs=svg.querySelector('defs'); if(!defs){ defs=document.createElementNS('http://www.w3.org/2000/svg','defs'); svg.prepend(defs);} let marker=svg.querySelector('#arrow'); if(!marker){ marker=document.createElementNS('http://www.w3.org/2000/svg','marker'); marker.setAttribute('id','arrow'); marker.setAttribute('markerWidth','10'); marker.setAttribute('markerHeight','7'); marker.setAttribute('refX','9'); marker.setAttribute('refY','3.5'); marker.setAttribute('orient','auto'); const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon'); poly.setAttribute('points','0 0, 10 3.5, 0 7'); poly.setAttribute('fill','currentColor'); marker.appendChild(poly); defs.appendChild(marker);} }

  /**
   * Calculates the anchor point on a node based on a spot.
   * @param {string|number} id The ID of the node.
   * @param {string} spot The spot name ('Top', 'Bottom', 'Left', 'Right', 'Center').
   * @returns {{x: number, y: number}}
   */
  _getNodeAnchor(id, spot = 'Center') {
    const el = document.querySelector(`[data-node-id="${id}"]`);
    if (!el) return { x: 0, y: 0 };

    const pos = this.parsePoint(el.style.left.replace('px','') + ' ' + el.style.top.replace('px',''));
    const width = el.offsetWidth;
    const height = el.offsetHeight;

    switch (spot) {
      case 'Top':
        return { x: pos.x + width / 2, y: pos.y };
      case 'Bottom':
        return { x: pos.x + width / 2, y: pos.y + height };
      case 'Left':
        return { x: pos.x, y: pos.y + height / 2 };
      case 'Right':
        return { x: pos.x + width, y: pos.y + height / 2 };
      case 'TopLeft':
        return { x: pos.x, y: pos.y };
      case 'TopRight':
        return { x: pos.x + width, y: pos.y };
      case 'BottomLeft':
        return { x: pos.x, y: pos.y + height };
      case 'BottomRight':
        return { x: pos.x + width, y: pos.y + height };
      case 'Center':
      default:
        return { x: pos.x + width / 2, y: pos.y + height / 2 };
    }
  }

  /**
   * Renders all nodes into the container.
   * @param {HTMLElement} container The layer for node elements.
   * @param {Array<object>} nodes The array of node data.
   * @param {object} options Options for rendering.
   */
  renderNodes(container, nodes, options = {}) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const list = Array.isArray(nodes) ? nodes : (nodes && typeof nodes.values === 'function' ? Array.from(nodes.values()) : []);
    list.forEach(n => {
      const el = this.buildNodeElement(n, {
        onOpenConfig: n.openConfig, onOpenEdit: n.openEdit, onOpenHelp: n.openHelp, onEnableChange: n.onChangeCheckbox,
        dragEnabled: true,
        getScale: options.getScale, onPositionChange: options.onPositionChange,
        onDragStart: options.onDragStart, onDragEnd: options.onDragEnd,
        controls: options.controls,
      });
      container.appendChild(el);
    });
  }

  /**
   * Rerenders both nodes and connections.
   */
  rerender(container, svg, canvasInner, nodes, options = {}) {
    this.renderNodes(container, nodes, options);
    // Use requestAnimationFrame to ensure nodes are in the DOM and have dimensions before drawing lines.
    requestAnimationFrame(() => this.renderConnections(svg, canvasInner, nodes));
  }

  /**
   * Provides default render options.
   */
  defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent) {
    const onPositionChange = (nodeObj) => {
      if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'position-change', { loc: nodeObj.loc });
      this.renderConnections(svg, canvasInner, nodes);
    };
    return {
      getScale: () => (state && typeof state.scale === 'number' ? state.scale : this.getScale()),
      onPositionChange,
      onDragStart: (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'drag-start',   { loc: nodeObj.loc }); },
      onDragEnd: (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'drag-end',     { loc: nodeObj.loc }); },
      controls: { enableToggle: { visible: true }, connectToggle: { visible: false }, editButton: { visible: true }, helpButton: { visible: true } },
    };
  }
}

// NOTE: The `buildNodeElement` function and other parts of the class
// were included for completeness, but the primary changes are in `renderConnections`,
// `_getNodeAnchor`, and `_orthogonalPath`.
