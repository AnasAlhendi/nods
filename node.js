// Node UI class: builds node DOM and exposes helpers (ES module)

class NodeUI {
  static ICONS = {
    edit: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>`,
    help: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H8a4 4 0 1 1 7.07 2.25z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`,
    warn: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    dot:  `<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
  };
  constructor(){
    this._scale = 1;
    this._pan = { x: 0, y: 0 };
    this._pz = { enabled: false };
    this._ctx = null; // { wrapper, inner, svg, nodesLayer, nodes }
    this._getRenderOptions = null;
  }

  // (getNode removed; not used by current app)
  buildNodeElement(
    n,
    {
      onOpenConfig,
      onOpenEdit,
      onOpenHelp,
      onStartDrag,
      onConnectToggle,
      onEnableChange,
      connectingFromId,
      connectChecked,
      // Drag options
      dragEnabled = false,
      onPositionChange,
      onDragStart,
      onDragEnd,
      getScale,
      // Controls
      controls = {},
    } = {}
  ) {
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
        const safe = this._safeSvg(iconStr);
        if (safe) iconWrap.innerHTML = safe;
      }
      else if (/^https?:\/\//i.test(iconStr) || /\.(png|jpe?g|gif|svg)$/i.test(iconStr)) {
        const img = document.createElement('img'); img.src = iconStr; img.alt = ''; img.width = 18; img.height = 18; img.decoding = 'async';
        iconWrap.appendChild(img);
      } else { iconWrap.textContent = iconStr; }
    }
    const label = document.createElement('span');
    label.className = 'label';
    label.innerHTML = `${escapeHtml(n.label)}${n.tag ? ` <span class="tag">${escapeHtml(n.tag)}</span>` : ''}`;

    const actions = document.createElement('span');
    actions.className = 'actions';

    // Controls configuration (visibility/disabled)
    const enableCfg = Object.assign({ visible: true, disabled: false }, controls.enableToggle || {});
    if (typeof n.checkbox === 'boolean') enableCfg.visible = n.checkbox;
    // Only one checkbox per node: hide connect toggle by default
    const connectCfg = Object.assign({ visible: false, disabled: false }, controls.connectToggle || {});
    const editCfg = Object.assign({ visible: true, disabled: false }, controls.editButton || {});
    const helpCfg = Object.assign({ visible: true, disabled: false }, controls.helpButton || {});

    // Enable/disable toggle
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
        // Always apply default toggle/disconnect/reconnect behavior
        n.state = nextEnabled ? 'enabled' : 'disabled';
        if (!nextEnabled) {
          if (Array.isArray(n.connections) && n.connections[0]) {
            n.lastTarget = n.connections[0];
          }
          n.connections = [];
          if (this._ctx && this._ctx.state && this._ctx.state.connectingFrom === n.id) {
            this._ctx.state.connectingFrom = null;
          }
          // Also update inbound links pointing to this node
          if (this._ctx && this._ctx.nodes) {
            const nodesRef = this._ctx.nodes;
            const isMap = nodesRef && typeof nodesRef.get === 'function';
            const list = isMap ? Array.from(nodesRef.values()) : (Array.isArray(nodesRef) ? nodesRef : []);
            // Determine train neighbors for bypass
            let nextInTrain = null, prevInTrain = null;
            if (this._ctx && Array.isArray(this._ctx.train)) {
              const idx = this._ctx.train.indexOf(n.id);
              if (idx > 0) prevInTrain = this._ctx.train[idx - 1];
              if (idx >= 0 && idx < this._ctx.train.length - 1) nextInTrain = this._ctx.train[idx + 1];
            }
            list.forEach(m => {
              if (!m || !Array.isArray(m.connections)) return;
              if (m.connections.indexOf(n.id) !== -1) {
                // Remember original upstream target as this node
                m.lastTarget = n.id;
                // If train info available and there is a next after this node, bypass to it
                if (nextInTrain) {
                  m.connections = [nextInTrain];
                } else {
                  m.connections = [];
                }
              }
            });
          }
        } else {
          // Recompute all connections from train for current enabled/disabled state
          this._applyConnectionsFromTrain();
        }
        // Notify callback if present (after state changes)
        if (typeof onEnableChange === 'function') onEnableChange(n.id, nextEnabled);
        if (this._ctx) this.refresh(this._getRenderOptions ? this._getRenderOptions() : undefined);
      });
      enable.appendChild(enableInput);
    }

    // Connect toggle
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

    // Edit button
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

    // Help button
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

    // Order: enable â€¢ connect â€¢ label â€¢ actions
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
    option.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenConfig && onOpenConfig(n.id); }
    });
    option.addEventListener('focus', () => option.classList.add('focus-ring'));
    option.addEventListener('blur', () => option.classList.remove('focus-ring'));

    // Dragging (optional)
    if (dragEnabled) {
      const getScaleSafe = typeof getScale === 'function' ? getScale : () => 1;
      const onMouseDown = (e) => {
        if (e.button !== 0) return; // left only
        if (n.state === 'disabled') return;
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
    } else {
      container.addEventListener('mousedown', (e) => onStartDrag && onStartDrag(e, n.id));
    }

    // visual hints for connect mode
    if (connectingFromId) {
      if (connectingFromId === n.id) option.classList.add('connect-source');
      else option.classList.add('connect-pick');
    }

    container.appendChild(option);
    return container;
  }

  // Ensure a canvas structure exists inside a container, creating if missing.
  // Returns references: { wrapper, inner, svg, nodesLayer }
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

    // Optionally enable pan & zoom
    if (panZoomEnabled) this.enablePanZoom(wrapper, inner, { enabled: true });
    return { wrapper, inner, svg, nodesLayer };
  }

  // Convenience: create canvas in a container and render nodes + connections.
  // Returns the created DOM references.
  renderInto(container, nodes, options = {}, canvasOptions = {}) {
    const { svg, inner, nodesLayer } = this.ensureCanvas(container, canvasOptions);
    this.rerender(nodesLayer, svg, inner, nodes, options);
    return { svg, canvasInner: inner, nodesLayer };
  }

  // Build helper: nodesUI.build(target, nodes, option)
  // - target: selector string (e.g., '.canvas-container'), HTMLElement, or object with { target } or { traget }
  // - nodes: Map or Array of nodes
  // - option: { width, height, panZoomEnabled, connectingFromId, recordNodeEvent, renderOptions }
  build(target, nodes, option = {}){
    let mount = null;
    if (typeof target === 'string') {
      mount = document.querySelector(target) || document.body;
    } else if (target && typeof target === 'object' && (target.target || target.traget)) {
      const sel = target.target || target.traget;
      mount = typeof sel === 'string' ? (document.querySelector(sel) || document.body) : (sel || document.body);
    } else if (target && target.nodeType === 1) {
      mount = target;
    } else {
      mount = document.body;
    }

    const width = typeof option.width === 'number' ? option.width : 2000;
    const height = typeof option.height === 'number' ? option.height : 1200;
    const panZoomEnabled = !!option.panZoomEnabled;
    const recordNodeEvent = option.recordNodeEvent;

    const { wrapper, inner, svg, nodesLayer } = this.ensureCanvas(mount, { width, height, panZoomEnabled });

    // If state is provided, apply initial pan/scale
    if (option.state && typeof option.state === 'object') {
      if (typeof option.state.scale === 'number') this.setScale(option.state.scale, inner);
      if (option.state.pan && typeof option.state.pan.x === 'number' && typeof option.state.pan.y === 'number') {
        this.setPan(option.state.pan, inner);
      }
    }

    // Apply graph-based connections if provided
    if (option.graph && (Array.isArray(nodes) || (nodes && typeof nodes.get === 'function'))) {
      try { this._applyGraph(option.graph, nodes); } catch(e) { /* ignore */ }
    }

    // Parse connection chain (train) if provided
    let parsedTrain = [];
    if (option.connection) {
      if (Array.isArray(option.connection)) parsedTrain = option.connection.slice();
      else if (typeof option.connection === 'string') {
        parsedTrain = option.connection.split(/[>,\s,]+/).map(s => s.trim()).filter(Boolean);
      }
      // do not set here; applied below
    }

    const recordEvent = recordNodeEvent;
    const makeOptions = () => option.renderOptions || this.defaultRenderOptions(
      (option.state
        ? { connectingFrom: (option.state.connectingFromId ?? option.state.connectingFrom ?? null), scale: (typeof option.state.scale === 'number' ? option.state.scale : (typeof this.getScale === 'function' ? this.getScale() : 1)) }
        : { connectingFrom: option.connectingFromId || null, scale: (typeof this.getScale === 'function' ? this.getScale() : 1) }
      ),
      svg,
      inner,
      this._ctx ? this._ctx.nodes : nodes,
      recordEvent,
      option.dragEnabled !== false // default true unless explicitly false
    );
    // store context for future auto-renders
    this._ctx = { wrapper, inner, svg, nodesLayer, nodes, state: option.state || null, train: parsedTrain };
    this._getRenderOptions = makeOptions;
    // Apply train-derived connections once before first render
    if (!option.graph) this._applyConnectionsFromTrain();
    this.rerender(nodesLayer, svg, inner, nodes, makeOptions());
    return { wrapper, inner, svg, nodesLayer };
  }

  setNodes(nodes){ if (this._ctx) this._ctx.nodes = nodes; }
  refresh(options){ if (!this._ctx) return; this.rerender(this._ctx.nodesLayer, this._ctx.svg, this._ctx.inner, this._ctx.nodes, options || (this._getRenderOptions ? this._getRenderOptions() : {})); }

  // Pan & zoom management
  enablePanZoom(wrapper, inner, { enabled = true } = {}){
    if (!enabled) return this.disablePanZoom();
    this.disablePanZoom();
    const onWheel = (e) => {
      if (!e.ctrlKey) return; // only zoom with Ctrl
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
      removeEventListener('mousemove', onPanMove);
    };
    const onMouseDown = (e) => {
      if (e.target === wrapper || e.target === inner) {
        panning = true;
        panStart = { x: e.clientX - this._pan.x, y: e.clientY - this._pan.y };
        addEventListener('mousemove', onPanMove);
        addEventListener('mouseup', onPanEnd, { once: true });
      }
    };
    wrapper.addEventListener('wheel', onWheel, { passive: false });
    wrapper.addEventListener('mousedown', onMouseDown);
    this._pz = { enabled: true, wrapper, inner, onWheel, onMouseDown };
    this._applyTransform(inner);
  }

  disablePanZoom(){
    if (!this._pz || !this._pz.enabled) return;
    const { wrapper, onWheel, onMouseDown } = this._pz;
    if (wrapper && onWheel) wrapper.removeEventListener('wheel', onWheel);
    if (wrapper && onMouseDown) wrapper.removeEventListener('mousedown', onMouseDown);
    this._pz = { enabled: false };
  }

  _applyTransform(inner){
    if (!inner) return;
    inner.style.transform = `translate(${this._pan.x}px, ${this._pan.y}px) scale(${this._scale})`;
  }

  getScale(){ return this._scale; }
  getPan(){ return { ...this._pan }; }
  setScale(v, inner){ this._scale = Math.max(0.1, Math.min(10, Number(v) || 1)); this._applyTransform(inner || (this._pz && this._pz.inner)); }
  setPan(p, inner){ this._pan = { x: Number(p.x)||0, y: Number(p.y)||0 }; this._applyTransform(inner || (this._pz && this._pz.inner)); }

  renderConnections(svg, canvasInner, nodes) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', canvasInner.style.width || '2000px');
    svg.setAttribute('height', canvasInner.style.height || '1200px');
    svg.setAttribute('viewBox', `0 0 ${parseInt(canvasInner.style.width||2000)} ${parseInt(canvasInner.style.height||1200)}`);
    const isMap = nodes && typeof nodes.get === 'function';
    const getById = (id) => isMap ? nodes.get(id) : (Array.isArray(nodes) ? nodes.find(x => x.id === id) : null);
    const list = isMap ? Array.from(nodes.values()) : (Array.isArray(nodes) ? nodes : []);
    list.forEach(n => {
      (n.connections || []).forEach(conn => {
        let targetId = null, label = null;
        if (typeof conn === 'string') targetId = conn;
        else if (conn && typeof conn === 'object') { targetId = conn.to || conn.id; label = conn.label || null; }
        const t = getById(targetId); if (!t) return;
        const a = this._nodeAnchor(n.id); const b = this._nodeAnchor(t.id);
        this._renderEdge(svg, a, b, label);
      });
    });
    this._ensureArrowMarker(svg);
  }

  _renderEdge(svg, a, b, label){
    const id = `p${Math.random().toString(36).slice(2)}`;
    const d = this._bezierPath(a, b);
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('id', id);
    path.setAttribute('d', d);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'var(--blue-600)');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('marker-end', 'url(#arrow)');
    svg.appendChild(path);
    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hit.setAttribute('d', d);
    hit.setAttribute('fill', 'none');
    hit.setAttribute('stroke', 'transparent');
    hit.setAttribute('stroke-width', '12');
    hit.style.pointerEvents = 'stroke';
    svg.appendChild(hit);
    if (label) {
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

  _ensureArrowMarker(svg) {
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      svg.prepend(defs);
    }
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

  _nodeAnchor(id) {
    const el = document.querySelector(`[data-node-id="${id}"]`);
    if (!el) return { x: 0, y: 0 };
    const x = parseFloat(el.style.left) + el.offsetWidth / 2;
    const y = parseFloat(el.style.top) + el.offsetHeight / 2;
    return { x, y };
  }

  _bezierPath(a, b) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
  }

  renderNodes(container, nodes, {
    connectingFromId,
    getScale,
    onPositionChange,
    onDragStart,
    onDragEnd,
    dragEnabled = true,
    controls = { enableToggle: { visible: true }, connectToggle: { visible: false }, editButton: { visible: true }, helpButton: { visible: true } },
  } = {}) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const isMap = nodes && typeof nodes.get === 'function';
    const list = isMap ? Array.from(nodes.values()) : (Array.isArray(nodes) ? nodes : []);
    
    const groups = list.filter(n => n && n.type === 'group');
    groups.forEach(g => this._renderGroup(container, g));

    list.filter(n => n && n.type !== 'group').forEach(n => {
      const el = this.buildNodeElement(n, {
        onOpenConfig: n.openConfig,
        onOpenEdit:   n.openEdit,
        onOpenHelp:   n.openHelp,
        onEnableChange: n.onChangeCheckbox,
        connectingFromId,
        connectChecked: connectingFromId === n.id || (Array.isArray(n.connections) && n.connections.length > 0),
        dragEnabled: dragEnabled,
        getScale,
        onPositionChange,
        onDragStart,
        onDragEnd,
        controls,
      });
      container.appendChild(el);
    });
  }

  // (handleOptionClick removed; connections are managed by train only)

  // Apply connections strictly from the stored train and current enabled/disabled state.
  _applyConnectionsFromTrain() {
    if (!this._ctx || !Array.isArray(this._ctx.train)) return;
    const nodesRef = this._ctx.nodes;
    if (!nodesRef) return;
    const isMap = nodesRef && typeof nodesRef.get === 'function';
    const getById = (id) => isMap ? nodesRef.get(id) : (Array.isArray(nodesRef) ? nodesRef.find(x => x && x.id === id) : null);
    const list = isMap ? Array.from(nodesRef.values()) : (Array.isArray(nodesRef) ? nodesRef : []);
    // Clear all connections
    list.forEach(n => { if (n) n.connections = []; });
    const t = this._ctx.train;
    for (let i = 0; i < t.length; i++) {
      const aId = t[i];
      const a = getById(aId);
      if (!a || a.state === 'disabled') continue;
      // find next enabled in train
      let target = null;
      for (let j = i + 1; j < t.length; j++) {
        const b = getById(t[j]);
        if (b && b.state !== 'disabled') { target = b.id; break; }
      }
      if (target) a.connections = [target]; else a.connections = [];
    }
  }

  // Re-apply a new train and refresh
  applyTrain(chain, { refresh = true, useGraph = false } = {}) {
    if (!this._ctx) return;
    if (Array.isArray(chain)) this._ctx.train = chain.slice();
    if (!useGraph) this._applyConnectionsFromTrain();
    if (refresh) this.refresh(this._getRenderOptions ? this._getRenderOptions() : undefined);
  }
  // (connect toggle handler removed; not used in current UI)

  // Convenience: render nodes and connections together
  rerender(container, svg, canvasInner, nodes, options = {}) {
    this.renderNodes(container, nodes, options);
    this.renderConnections(svg, canvasInner, nodes);
  }

  // (panels-layer removed; groups are rendered within nodes layer)

  // (renderConnectionsAuto removed; not used by current app)

  // Produce default render options wired for drag/position with provided event logger
  defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent, dragEnabled = true) {
    return {
      connectingFromId: state && state.connectingFrom,
      getScale: () => (state && typeof state.scale === 'number' ? state.scale : (typeof this.getScale === 'function' ? this.getScale() : 1)),
      onPositionChange: (nodeObj) => {
        if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'position-change', { position: { ...nodeObj.position } });
        this.renderConnections(svg, canvasInner, nodes);
      },
      onDragStart:      (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'drag-start', { position: { ...nodeObj.position } }); },
      onDragEnd:        (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'drag-end',   { position: { ...nodeObj.position } }); },
      dragEnabled: dragEnabled,
      controls: { enableToggle: { visible: true }, connectToggle: { visible: false }, editButton: { visible: true }, helpButton: { visible: true } },
    };
  }
  // Safe SVG validation method
  _safeSvg(svgStr){
    try{
      const doc = new DOMParser().parseFromString(svgStr, 'image/svg+xml');
      const svg = doc.querySelector('svg'); if(!svg) return null;
      svg.querySelectorAll('script, foreignObject').forEach(n=>n.remove());
      [...svg.querySelectorAll('*')].forEach(el=>{
        [...el.attributes].forEach(a=>{
          const n = a.name.toLowerCase(), v = a.value;
          if (n.startsWith('on') || /url\(/i.test(v)) el.removeAttribute(a.name);
        });
      });
      return svg.outerHTML;
    } catch(e){ return null; }
  }

  // Render a group container
  _renderGroup(container, n){
    const box = document.createElement('div');
    box.className = 'group-box';
    if (n.groupKind) box.classList.add(n.groupKind); // auswahl|menubaum|buchung|terminanmeldung|abschluss|sonstiges
    if (n.state === 'warning') box.classList.add('warning');

    box.style.left   = (n.position.x) + 'px';
    box.style.top    = (n.position.y) + 'px';
    box.style.width  = ((n.size?.w) || 300) + 'px';
    box.style.height = ((n.size?.h) || 200) + 'px';
    box.dataset.groupId = n.id;

    box.innerHTML = `
      <div class="group-header">${escapeHtml(n.label || '')}</div>
      <div class="group-body"></div>
    `;

    // Dragging the group moves its contained elements (by groupId or position)
    box.addEventListener('mousedown', (e) => this._handleGroupDrag(e, box));

    container.appendChild(box);
    return box;
  }

  // Check if a node is inside a group bounds
  _isInsideGroup(node, group){
    const gx = group.position.x, gy = group.position.y;
    const gw = group.size?.w || 300, gh = group.size?.h || 200;
    const nx = node.position.x, ny = node.position.y;
    return nx >= gx && nx <= gx+gw && ny >= gy && ny <= gy+gh;
  }

  // Handle group dragging functionality
  _handleGroupDrag(e, box) {
    if (e.button !== 0) return;
    const start = { x: e.clientX, y: e.clientY };
    const orig = { x: parseFloat(box.style.left), y: parseFloat(box.style.top) };

    const nodesRef = this._ctx?.nodes;
    const isMap = nodesRef && typeof nodesRef.get === 'function';
    const list = isMap ? Array.from(nodesRef.values()) : (Array.isArray(nodesRef) ? nodesRef : []);

    // Active members: by groupId or within box bounds
    const groupNode = list.find(n => n?.id === box.dataset.groupId);
    
    // Get all directly attached nodes + nodes inside group bounds
    const directChildren = list.filter(n => n && n.type !== 'group' && n.groupId === groupNode.id);
    const insideChildren = list.filter(n => n && n.type !== 'group' && this._isInsideGroup(n, groupNode));
    
    // Merge lists and remove duplicates
    const children = [...new Set([...directChildren, ...insideChildren])];
    
    // Get all sub-groups within this group
    const subGroups = list.filter(n => n && n.type === 'group' && this._isInsideGroup(n, groupNode));
    
    // Store original positions for nodes and sub-groups
    const originalPositions = children.map(c => ({
      id: c.id,
      x: c.position.x,
      y: c.position.y
    }));
    
    const originalGroupPositions = subGroups.map(g => ({
      id: g.id,
      x: g.position.x,
      y: g.position.y
    }));

    const onMove = (ev) => {
      const scale = this.getScale?.() || 1;
      const dx = (ev.clientX - start.x) / scale;
      const dy = (ev.clientY - start.y) / scale;
      const nx = Math.round(orig.x + dx), ny = Math.round(orig.y + dy);
      box.style.left = nx + 'px';
      box.style.top = ny + 'px';
      groupNode.position.x = nx;
      groupNode.position.y = ny;

      // Move children by the same offset from their original positions
      children.forEach(c => {
        const original = originalPositions.find(p => p.id === c.id);
        if (original) {
          c.position.x = Math.round(original.x + dx);
          c.position.y = Math.round(original.y + dy);
          const el = this._ctx?.wrapper?.querySelector(`[data-node-id="${c.id}"]`);
          if (el) {
            el.style.left = c.position.x + 'px';
            el.style.top = c.position.y + 'px';
          }
        }
      });
      
      // Move sub-groups and their elements
      subGroups.forEach(g => {
        const originalGroup = originalGroupPositions.find(p => p.id === g.id);
        if (originalGroup) {
          g.position.x = Math.round(originalGroup.x + dx);
          g.position.y = Math.round(originalGroup.y + dy);
          const groupEl = this._ctx?.wrapper?.querySelector(`[data-group-id="${g.id}"]`);
          if (groupEl) {
            groupEl.style.left = g.position.x + 'px';
            groupEl.style.top = g.position.y + 'px';
          }
          
          // Move all elements inside the sub-group
          const subGroupChildren = list.filter(n => n && n.type !== 'group' &&
            (n.groupId === g.id || this._isInsideGroup(n, g)));
          
          subGroupChildren.forEach(child => {
            const childOriginal = originalPositions.find(p => p.id === child.id);
            if (childOriginal) {
              child.position.x = Math.round(childOriginal.x + dx);
              child.position.y = Math.round(childOriginal.y + dy);
              const childEl = this._ctx?.wrapper?.querySelector(`[data-node-id="${child.id}"]`);
              if (childEl) {
                childEl.style.left = child.position.x + 'px';
                childEl.style.top = child.position.y + 'px';
              }
            }
          });
        }
      });

      this.renderConnections(this._ctx.svg, this._ctx.inner, this._ctx.nodes);
    };
    
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
    };
    
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp, { once: true });
  }
}




// Set node.connections from a declarative graph object
NodeUI.prototype._applyGraph = function(graph, nodes){
  if (!graph) return;
  const isMap = nodes && typeof nodes.get === 'function';
  const getById = (id) => isMap ? nodes.get(id) : (Array.isArray(nodes) ? nodes.find(n => n && n.id === id) : null);
  const setConns = (id, targets) => { const n = getById(id); if (n) n.connections = targets.slice(); };
  if (isMap) { nodes.forEach(n => { if (n) n.connections = []; }); }
  else if (Array.isArray(nodes)) { nodes.forEach(n => { if (n) n.connections = []; }); }
  Object.keys(graph).forEach(id => {
    const spec = graph[id] || {};
    if (spec && typeof spec.next === 'string') setConns(id, [spec.next]);
    else if (spec && spec.branch && typeof spec.branch === 'object') {
      const outs = Object.values(spec.branch).filter(Boolean);
      if (outs.length) setConns(id, outs);
    }
  });
};function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }




