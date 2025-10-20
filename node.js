// Node UI class: builds node DOM and exposes helpers (ES module)

class NodeUI {
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
      if (iconStr.startsWith('<svg')) { iconWrap.innerHTML = iconStr; }
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
        if (typeof onEnableChange === 'function') onEnableChange(n.id, nextEnabled);
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

  renderConnections(svg, canvasInner, nodes) {
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    svg.setAttribute('width', canvasInner.style.width || '2000px');
    svg.setAttribute('height', canvasInner.style.height || '1200px');
    svg.setAttribute('viewBox', `0 0 ${parseInt(canvasInner.style.width||2000)} ${parseInt(canvasInner.style.height||1200)}`);
    const isMap = nodes && typeof nodes.get === 'function';
    const getById = (id) => isMap ? nodes.get(id) : (Array.isArray(nodes) ? nodes.find(x => x.id === id) : null);
    const list = isMap ? Array.from(nodes.values()) : (Array.isArray(nodes) ? nodes : []);
    list.forEach(n => {
      (n.connections || []).forEach(targetId => {
        const t = getById(targetId); if (!t) return;
        const a = this._nodeAnchor(n.id); const b = this._nodeAnchor(t.id);
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', this._bezierPath(a, b));
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', 'var(--blue-600)');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('marker-end', 'url(#arrow)');
        path.addEventListener('mouseenter', () => path.setAttribute('stroke', '#2563EB'));
        path.addEventListener('mouseleave', () => path.setAttribute('stroke', 'var(--blue-600)'));
        svg.appendChild(path);
      });
    });
    this._ensureArrowMarker(svg);
  }

  _ensureArrowMarker(svg){ let defs=svg.querySelector('defs'); if(!defs){ defs=document.createElementNS('http://www.w3.org/2000/svg','defs'); svg.prepend(defs);} let marker=svg.querySelector('#arrow'); if(!marker){ marker=document.createElementNS('http://www.w3.org/2000/svg','marker'); marker.setAttribute('id','arrow'); marker.setAttribute('markerWidth','10'); marker.setAttribute('markerHeight','7'); marker.setAttribute('refX','9'); marker.setAttribute('refY','3.5'); marker.setAttribute('orient','auto'); const poly=document.createElementNS('http://www.w3.org/2000/svg','polygon'); poly.setAttribute('points','0 0, 10 3.5, 0 7'); poly.setAttribute('fill','var(--blue-600)'); marker.appendChild(poly); defs.appendChild(marker);} }

  _nodeAnchor(id){ const el=document.querySelector(`[data-node-id="${id}"]`); if(!el) return {x:0,y:0}; const x=parseFloat(el.style.left)+el.offsetWidth/2; const y=parseFloat(el.style.top)+el.offsetHeight/2; return {x,y}; }

  _bezierPath(a,b){ const dx=Math.max(60, Math.abs(b.x-a.x)*0.4); const c1={x:a.x+dx,y:a.y}; const c2={x:b.x-dx,y:b.y}; return `M ${a.x} ${a.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`; }
  // (optionSelector removed; not used)

  // Render a list of nodes (Map or Array) into a container
  renderNodes(container, nodes, {
    connectingFromId,
    getScale,
    onPositionChange,
    onDragStart,
    onDragEnd,
    controls = { enableToggle: { visible: true }, connectToggle: { visible: false }, editButton: { visible: true }, helpButton: { visible: true } },
  } = {}) {
    while (container.firstChild) container.removeChild(container.firstChild);
    const isMap = nodes && typeof nodes.get === 'function';
    const list = isMap ? Array.from(nodes.values()) : (Array.isArray(nodes) ? nodes : []);
    list.forEach(n => {
      const el = this.buildNodeElement(n, {
        onOpenConfig: n.openConfig,
        onOpenEdit:   n.openEdit,
        onEnableChange: n.onChangeCheckbox,
        connectingFromId,
        connectChecked: connectingFromId === n.id || (Array.isArray(n.connections) && n.connections.length > 0),
        dragEnabled: true,
        getScale,
        onPositionChange,
        onDragStart,
        onDragEnd,
        controls,
      });
      container.appendChild(el);
    });
  }

  // Handle connect mode via option click
  handleOptionClick(nodes, id, state, svg, canvasInner, rerender){
    const isMap = nodes && typeof nodes.get === 'function';
    const getById = (nid) => isMap ? nodes.get(nid) : (Array.isArray(nodes) ? nodes.find(x => x.id === nid) : null);
    if (!state.connectingFrom) {
      state.connectingFrom = id;
      if (typeof rerender === 'function') rerender();
      return;
    }
    if (state.connectingFrom && id !== state.connectingFrom) {
      const from = getById(state.connectingFrom);
      if (from) { from.connections = [id]; from.lastTarget = id; }
      state.connectingFrom = null;
      this.renderConnections(svg, canvasInner, nodes);
      if (typeof rerender === 'function') rerender();
      return;
    }
    if (state.connectingFrom && id === state.connectingFrom) {
      state.connectingFrom = null;
      if (typeof rerender === 'function') rerender();
    }
  }

  // (connect toggle handler removed; not used in current UI)

  // Convenience: render nodes and connections together
  rerender(container, svg, canvasInner, nodes, options = {}) {
    this.renderNodes(container, nodes, options);
    this.renderConnections(svg, canvasInner, nodes);
  }

  // Produce default render options wired for drag/position with provided event logger
  defaultRenderOptions(state, svg, canvasInner, nodes, recordNodeEvent) {
    return {
      connectingFromId: state && state.connectingFrom,
      getScale: () => (state && typeof state.scale === 'number' ? state.scale : 1),
      onPositionChange: (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'position-change', { position: { ...nodeObj.position } }); this.renderConnections(svg, canvasInner, nodes); },
      onDragStart:      (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'drag-start', { position: { ...nodeObj.position } }); },
      onDragEnd:        (nodeObj) => { if (recordNodeEvent) recordNodeEvent(nodeObj.id, 'drag-end',   { position: { ...nodeObj.position } }); },
      controls: { enableToggle: { visible: true }, connectToggle: { visible: false }, editButton: { visible: true }, helpButton: { visible: true } },
    };
  }
}

function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }

// Centralized icon set for NodeUI controls
NodeUI.ICONS = {
  edit: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z"/></svg>`,
  help: `<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 17h-2v-2h2v2zm2.07-7.75-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26a2 2 0 1 0-3.41-1.41H8a4 4 0 1 1 7.07 2.25z"/></svg>`,
  check: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>`,
  warn: `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
  dot:  `<svg viewBox="0 0 24 24" width="10" height="10" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="currentColor"/></svg>`,
};

// Expose on window for classic usage
window.NodeUI = NodeUI;
