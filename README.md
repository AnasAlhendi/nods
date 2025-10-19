# Node Editor (HTML/CSS/JS)

This project is a lightweight, file-based node editor UI implemented using plain HTML/CSS/JS. It renders draggable “node pills,” draws SVG connections between nodes, and provides simple actions (Edit, Help, Connect, Enable/Disable), plus pan/zoom and a Save/Run demo.

It has no build step and works offline (file://) when using the classic scripts. You can also serve it via a local HTTP server.

## Quick Start

- Open `index.html` in your browser.
- Drag nodes, toggle Enable or Connect per node, click Edit/Help.
- Use header buttons: Settings, Run (path highlight), Save (JSON preview).

If you prefer a local server (optional):
- Python: `py -m http.server 5500` → open `http://localhost:5500/`

## File Structure

- `index.html` — main HTML page; loads CSS and the two scripts (classic):
  - `node.js` — defines the `NodeUI` class and exposes it globally via `window.NodeUI`.
  - `script.js` — the app script; builds data, wires the UI using `window.NodeUI` and handles runtime logic.
- `styles.css` — base layout, header, canvas, modal, and general utility styles.
- `node.css` — node container positioning and disabled style.
- `option.css` — visual styling for the node pill and controls.

## Data Model

Nodes are kept in a `Map<string, Node>`:

```
Node {
  id: string,
  label: string,
  tag?: string,
  state: 'enabled' | 'disabled' | 'warning',
  position: { x: number, y: number },
  connections: string[],      // outgoing connection (first item used)
  events?: Array<{           // runtime event log (optional)
    name: string,
    at: number,              // Date.now()
    payload?: any
  }>,
  icon?: string,             // optional inline SVG, image URL, or emoji
}
```

Example (see `script.js`):
```
const nodes = new Map([
  ['start', { id: 'start', label: 'Sprachauswahl', tag: '(Start)', state: 'enabled', position: { x: 160, y: 220 }, connections: ['menu'], events: [] }],
  ['menu',  { id: 'menu',  label: 'Menu00FC',       tag: '(Weiter)', state: 'enabled', position: { x: 1040, y: 300 }, connections: ['end'],  events: [] }],
  ['help',  { id: 'help',  label: 'Hilfe',          tag: '',         state: 'warning', position: { x: 240, y: 640 }, connections: [],       events: [] }],
  ['end',   { id: 'end',   label: 'Beenden',        tag: '',         state: 'disabled', position: { x: 1480, y: 720 }, connections: [],      events: [] }],
]);
```

## NodeUI Class (from node.js)

`NodeUI` renders a node pill and wires interactions. The class is available as `window.NodeUI`.

### buildNodeElement

```
const el = new window.NodeUI().buildNodeElement(node, options)
```

Options (callbacks are optional):
- `onOpenConfig(id)` — called on node pill click; typically opens config dialog.
- `onOpenEdit(id)` — edit button.
- `onOpenHelp(id)` — help button.
- `onConnectToggle(id, checked)` — Connect checkbox toggled.
- `onEnableChange(id, enabled)` — Enable checkbox toggled (if enabled in controls).
- `connectingFromId?: string` — ID of node currently in “connect mode”.
- `connectChecked?: boolean` — initial Connect checkbox state.
- Dragging:
  - `dragEnabled?: boolean` — default `false`; when `true` NodeUI handles dragging internally.
  - `getScale?: () => number` — return current canvas scale to make drag scale-aware.
  - `onPositionChange?(node)` — called during drag updates; ideal for re-rendering connections.
  - `onDragStart?(node)` / `onDragEnd?(node)` — optional lifecycle hooks.
- Controls visibility/disabled (all default to `{ visible: true, disabled: false }`):
  - `controls.enableToggle`
  - `controls.connectToggle`
  - `controls.editButton`
  - `controls.helpButton`

Return: a DOM element (`<div.node-js>`) to be appended to a container.

### NodeUI.ICONS

Standard SVG icons used by NodeUI actions and state. Override globally:
```
NodeUI.ICONS.edit  = '<svg ...>...</svg>'
NodeUI.ICONS.help  = '<svg ...>...</svg>'
NodeUI.ICONS.check = '<svg ...>...</svg>'
NodeUI.ICONS.warn  = '<svg ...>...</svg>'
NodeUI.ICONS.dot   = '<svg ...>...</svg>'
```

### Per-node icon (n.icon)

Each node can provide a small icon rendered before its label:
- Inline SVG string
- Image URL (png/jpg/gif/svg)
- Emoji or short text

```
nodes.get('start').icon = '🏁'
// or
nodes.get('menu').icon = '<svg viewBox="0 0 16 16">...</svg>'
// or
nodes.get('help').icon = 'https://example.com/help.svg'
```

## App Logic (script.js)

- Renders nodes using `window.NodeUI` with:
  - Enable/Connect/Edit/Help controls
  - Dragging enabled (scale-aware)
- Renders SVG connections with arrow markers; updates on drag/resize.
- Pan/Zoom on the canvas background (wheel + Ctrl for zoom).
- Shows a simple Settings modal.
- Run simulation: highlights a path by following the first outgoing connection from a start node (`tag` containing “(Start)”).
- Save: shows current `nodes` state as JSON in a modal.

### Per-node Event Log

Every interaction is recorded into `node.events` by `recordNodeEvent` in `script.js`:
- `open-config`, `open-edit`, `open-help`
- `connect-toggle` `{ checked }`
- `enable-change` `{ enabled }`
- `drag-start`, `position-change`, `drag-end` `{ position }`

Inspect in console:
```
> nodes.get('start').events
```

## CSS Overview

- `styles.css`: page layout, header, canvas grid, modal.
- `node.css`: `.node-js` positioning and disabled style.
- `option.css`: `.option-js` pill visual, `.state-icon`, action button styles.

## Extending

- Add nodes: push into the `nodes` map, then call `renderNodes()` and `renderConnections()`.
- Replace action icons globally: override `NodeUI.ICONS.*` in a small script block after loading `node.js`.
- Restrict controls per node: pass `controls: { ... }` in the `buildNodeElement` options when rendering.

## Accessibility

- Nodes are focusable (`role="button"`, `tabindex="0"`) and respond to Enter/Space.
- Title and aria-label are set based on `label` and `tag`.

## Known Tips

- For large canvases, ensure the SVG viewBox and canvas size are kept in sync (`renderConnections`).
- When switching to an HTTP server, you may use ES modules if desired, but the current configuration uses classic scripts so it works from `file://`.

---

If you want this documented inline as JSDoc on the `NodeUI` class and public methods, I can add that as well.
