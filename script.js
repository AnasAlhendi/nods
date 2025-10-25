// App script (classic). NodeUI is available as a global from node.js.

// Canvas state for the main diagram
const diagramState = {
  scale: 1,
  pan: { x: 0, y: 0 },
  connectingFrom: null,
};

// Toggle: enable/disable draw.io-like line controls (bend handles)
let enableLineControls = true; // toggle at runtime via header button

// --- البيانات الرئيسية للوحة الرسم ---
const diagramNodes = [
  {
    id: 'start',
    category: 'Start',
    label: 'Sprachauswahl',
    tag: '(Start)',
    state: 'enabled',
    loc: '160 220',
    connections: [ { to: 'menu' } ],
    openConfig: (id) => {}, openHelp: (id) => {}, openEdit: (id) => {}, onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'menu',
    category: 'Conditional',
    label: 'Menu?',
    state: 'enabled',
    loc: '440 220',
    connections: [
      { to: 'help', text: 'Yes' },
      { to: 'end', text: 'No' }
    ],
  },
  {
    id: 'help',
    label: 'Hilfe',
    state: 'enabled',
    loc: '440 400',
    connections: [ { to: 'end' } ],
  },
  {
    id: 'end',
    category: 'End',
    label: 'Beenden',
    state: 'enabled',
    loc: '780 220',
    connections: [],
  },
  {
    id: 'comment-1',
    category: 'Comment',
    text: 'This is a comment node.',
    loc: '160 400',
    connections: [],
  }
];

// (Behavior rules removed per user request — checkbox toggles remain app-level hooks)

/*
// --- بيانات لوحة الأدوات (Palette) ---
// *** تم التعليق على هذا الجزء بالكامل لحذفه ***
const paletteNodes = [
  { category: 'Start', label: 'Start' },
  { label: 'Step' },
  { category: 'Conditional', label: '???' },
  { category: 'End', label: 'End' },
  { category: 'Comment', text: 'Comment' }
];
*/


// =============================================================
// === تهيئة لوحة الرسم الرئيسية فقط ===
// =============================================================

// إنشاء نسخة من NodeUI للوحة الرسم
const diagramUI = new NodeUI();

// 1. إعداد لوحة الرسم الرئيسية (Diagram)
const diagramContainer = '.canvas-container';
diagramUI.build(diagramContainer, diagramNodes, {
  width: 2000,
  height: 1200,
  panZoomEnabled: true,
  state: diagramState,
  lineControlsEnabled: enableLineControls,
});



// Header buttons
var btnSettings = document.getElementById('btnSettings');
if (btnSettings) btnSettings.addEventListener('click', function () { /* openSettings(); */ });
var btnRun = document.getElementById('btnRun');
if (btnRun) btnRun.addEventListener('click', function () { /* runSimulation(nodes); */ });
var btnSave = document.getElementById('btnSave');
if (btnSave) btnSave.addEventListener('click', function () { /* openModal('Speichern', saveDesign(nodes)); */ });

// Toggle edge handles (line controls)
var btnHandles = document.getElementById('btnHandles');
if (btnHandles) {
  btnHandles.addEventListener('click', function () {
    enableLineControls = !enableLineControls;
    btnHandles.setAttribute('aria-pressed', String(enableLineControls));
    try { diagramUI.setLineControlsEnabled(enableLineControls); } catch (e) {}
  });
}

// Checkbox: you can still add onChangeNode(checked) per node; NodeUI will call it

// (Agent code removed; behavior lives inside node.js NodeUI)

// Modal helpers
// ... (لا تغيير هنا)
