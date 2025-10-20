// App script (classic). NodeUI is available as a global from node.js.

// Canvas stadokte
const state = {
  scale: 1,
  pan: { x: 0, y: 0 },
  connectingFrom: null,
};

// (node event recording removed)

// Data model (array of nodes) with nested groups
const nodes = [
  // Main Groups
  {
    id:'g-auswahl',
    type:'group',
    groupKind:'auswahl',
    label:'Vorauswahl',
    position:{x:20,y:20},
    size:{w:980,h:140},
    state:'enabled'
  },
  {
    id:'g-menubaum',
    type:'group',
    groupKind:'menubaum',
    label:'Menübaum',
    position:{x:20,y:180},
    size:{w:980,h:600},
    state:'enabled'
  },

  // Sub-groups inside Menübaum
  {
    id:'g-buchung-sub',
    type:'group',
    groupKind:'buchung',
    label:'Buchung',
    position:{x:40,y:220},
    size:{w:900,h:100},
    state:'enabled',
    groupId: 'g-menubaum'
  },
  {
    id:'g-terminanmeldung-sub',
    type:'group',
    groupKind:'terminanmeldung',
    label:'Terminanmeldung',
    position:{x:40,y:340},
    size:{w:900,h:100},
    state:'enabled',
    groupId: 'g-menubaum'
  },
  {
    id:'g-abschluss-sub',
    type:'group',
    groupKind:'abschluss',
    label:'Abschluss',
    position:{x:40,y:460},
    size:{w:900,h:280},
    state:'enabled',
    groupId: 'g-menubaum'
  },
  {
    id:'g-sonstiges-sub',
    type:'group',
    groupKind:'sonstiges',
    label:'Sonstiges',
    position:{x:40,y:760},
    size:{w:900,h:200},
    state:'enabled',
    groupId: 'g-menubaum'
  },

  // Sub-groups inside Abschluss
  {
    id:'g-terminbuchung-sub',
    type:'group',
    groupKind:'terminbuchung',
    label:'Terminbuchung',
    position:{x:60,y:500},
    size:{w:260,h:120},
    state:'enabled',
    groupId: 'g-abschluss-sub'
  },
  {
    id:'g-ticket-sub',
    type:'group',
    groupKind:'ticket',
    label:'Ticket',
    position:{x:340,y:500},
    size:{w:260,h:120},
    state:'enabled',
    groupId: 'g-abschluss-sub'
  },
  {
    id:'g-anmeldung-sub',
    type:'group',
    groupKind:'anmeldung',
    label:'Anmeldung',
    position:{x:620,y:500},
    size:{w:260,h:120},
    state:'enabled',
    groupId: 'g-abschluss-sub'
  },

  // Nodes in Vorauswahl
  {
    id: 'start',
    label: 'Sprachauswahl',
    tag: '(Start)',
    state: 'enabled',
    position: { x: 60,  y: 70 },
    groupId: 'g-auswahl',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'einschr',
    label: 'Einschränkungen',
    state: 'enabled',
    position: { x: 360, y: 70 },
    groupId: 'g-auswahl',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'verw',
    label: 'Verwaltungseinheiten',
    state: 'enabled',
    position: { x: 660, y: 70 },
    groupId: 'g-auswahl',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },

  // Nodes in Buchung sub-group
  {
    id: 'dienst',
    label: 'Dienstleistungserfassung',
    state: 'enabled',
    position: { x: 80, y: 250 },
    groupId: 'g-buchung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'terminOpt',
    label: 'Option Terminbuchung',
    state: 'enabled',
    position: { x: 500, y: 250 },
    groupId: 'g-buchung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },

  // Nodes in Terminanmeldung sub-group
  {
    id: 'wartennummer',
    label: 'Anmeldung per Wartennummer',
    state: 'enabled',
    position: { x: 80, y: 370 },
    groupId: 'g-terminanmeldung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'geburtsdatum',
    label: 'Anmeldung per Geburtsdatum',
    state: 'enabled',
    position: { x: 500, y: 370 },
    groupId: 'g-terminanmeldung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },

  // Nodes in Terminbuchung sub-group
  {
    id: 'zusammenfassung-termin',
    label: 'Zusammenfassung Terminbuchung',
    state: 'enabled',
    position: { x: 100, y: 530 },
    groupId: 'g-terminbuchung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'abschluss-termin',
    label: 'Abschluss Terminbuchung',
    state: 'enabled',
    position: { x: 100, y: 570 },
    groupId: 'g-terminbuchung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },

  // Nodes in Ticket sub-group
  {
    id: 'zusammenfassung-ticket',
    label: 'Zusammenfassung Ticket',
    state: 'enabled',
    position: { x: 380, y: 530 },
    groupId: 'g-ticket-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'abschluss-ticket',
    label: 'Abschluss Ticket',
    state: 'enabled',
    position: { x: 380, y: 570 },
    groupId: 'g-ticket-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },

  // Nodes in Anmeldung sub-group
  {
    id: 'zusammenfassung-anmeldung',
    label: 'Zusammenfassung Anmeldung',
    state: 'enabled',
    position: { x: 660, y: 530 },
    groupId: 'g-anmeldung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'abschluss-anmeldung',
    label: 'Abschluss Anmeldung',
    state: 'enabled',
    position: { x: 660, y: 570 },
    groupId: 'g-anmeldung-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },

  // Nodes in Sonstiges
  {
    id: 'bildschirmschoner',
    label: 'Bildschirmschoner',
    state: 'enabled',
    position: { x: 80, y: 800 },
    groupId: 'g-sonstiges-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'sperrseiten',
    label: 'Sperrseiten',
    state: 'enabled',
    position: { x: 250, y: 800 },
    groupId: 'g-sonstiges-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'oeffnungszeiten',
    label: 'Öffnungszeiten',
    state: 'enabled',
    position: { x: 420, y: 800 },
    groupId: 'g-sonstiges-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'wegbeschreibung',
    label: 'Wegbeschreibung',
    state: 'enabled',
    position: { x: 590, y: 800 },
    groupId: 'g-sonstiges-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
  {
    id: 'treffen-optionen',
    label: 'Treffen-Optionen',
    state: 'enabled',
    position: { x: 760, y: 800 },
    groupId: 'g-sonstiges-sub',
    openConfig:   (id) => {},
    openHelp:     (id) => {},
    openEdit:     (id) => {},
    onChangeCheckbox: (id, enabled) => {},
  },
];


// Create canvas structure and render via NodeUI.build
const nodesUI = new NodeUI();
const targetContainer = '.canvas-container';
nodesUI.build(targetContainer, nodes, {
  width: 2000,
  height: 1200,
  panZoomEnabled: true,
  state: state,
  connection: ["start","menu","help"],
  dragEnabled: false
});

// Header buttons (without optional chaining for wider browser support)
var btnSettings = document.getElementById('btnSettings');
if (btnSettings) btnSettings.addEventListener('click', function () { openSettings(); });
var btnRun = document.getElementById('btnRun');
if (btnRun) btnRun.addEventListener('click', function () { runSimulation(nodes); });
var btnSave = document.getElementById('btnSave');
if (btnSave) btnSave.addEventListener('click', function () { openModal('Speichern', saveDesign(nodes)); });

// Modal helpers
const modal     = document.getElementById('modal');
const modalBody = document.getElementById('modalBody');
const modalTitle= document.getElementById('modalTitle');
modal.addEventListener('click', (e) => {
  if (e.target.matches('[data-modal-close], .modal-backdrop')) closeModal();
});
function openModal(title, contentNode) { modalTitle.textContent = title; modalBody.innerHTML = ''; if (contentNode) modalBody.appendChild(contentNode); modal.setAttribute('aria-hidden', 'false'); }
function closeModal() { modal.setAttribute('aria-hidden', 'true'); }

// getNode moved into NodeUI (nodesUI.getNode)
