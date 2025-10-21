// App script (classic). NodeUI is available as a global from node.js.

// Canvas stadokte
const state = {
  scale: 1,
  pan: { x: 0, y: 0 },
  connectingFrom: null,
};

// (node event recording removed)

// Data model (array of nodes) with nested groups
const connectGraph = {
  start: { next: "einschr" },
  einschr: { next: "verw" },
  verw: { next: "habenSieTermin" },

  // السؤال الرئيسي
  habenSieTermin: {
    question: true,
    branch: {
      ja: "wartennummer",
      nein: "dienst"
    }
  },

  // فرع عنده موعد (ja)
  wartennummer: {
    question: true,
    branch: {
      ja: "zusammenfassungAnmeldung",  // معه رقم انتظار
      nein: "geburtsdatum"             // ما معه رقم → نسأله تاريخ الميلاد
    }
  },
  geburtsdatum: { next: "zusammenfassungAnmeldung" },
  zusammenfassungAnmeldung: { next: "abschlussAnmeldung" },
  abschlussAnmeldung: { end: true },

  // فرع ما عنده موعد (nein)
  dienst: { next: "terminOpt" },

  terminOpt: {
    question: true,
    branch: {
      ja: "zusammenfassungTermin",
      nein: "zusammenfassungTicket"
    }
  },

  // مع حجز موعد
  zusammenfassungTermin: { next: "abschlussTermin" },
  abschlussTermin: { end: true },

  // بدون حجز موعد
  zusammenfassungTicket: { next: "abschlussTicket" },
  abschlussTicket: { end: true }
};


/** 2) العقد والمجموعات (Nodes) — مع question:true ومواقع x/y مضبوطة */
const nodes = [
  // ===== Groups =====
  { id:'g-auswahl', type:'group', groupKind:'auswahl', label:'Vorauswahl',
    position:{x:20,y:20}, size:{w:980,h:120}, state:'enabled' },
  { id:'g-menubaum', type:'group', groupKind:'menubaum', label:'Menübaum',
    position:{x:20,y:160}, size:{w:980,h:680}, state:'enabled' },

  // Sub-groups (inside Menübaum)
  { id:'g-buchung-sub', type:'group', groupKind:'buchung', label:'Buchung',
    position:{x:40,y:210}, size:{w:460,h:150}, state:'enabled', groupId:'g-menubaum' },
  { id:'g-terminanmeldung-sub', type:'group', groupKind:'terminanmeldung', label:'Terminanmeldung',
    position:{x:520,y:210}, size:{w:460,h:150}, state:'enabled', groupId:'g-menubaum' },
  { id:'g-abschluss-sub', type:'group', groupKind:'abschluss', label:'Abschluss',
    position:{x:40,y:380}, size:{w:940,h:340}, state:'enabled', groupId:'g-menubaum' },
  { id:'g-sonstiges-sub', type:'group', groupKind:'sonstiges', label:'Sonstiges',
    position:{x:40,y:740}, size:{w:940,h:120}, state:'enabled', groupId:'g-menubaum' },

  // Sub-groups (inside Abschluss)
  { id:'g-terminbuchung-sub', type:'group', groupKind:'terminbuchung', label:'Terminbuchung',
    position:{x:60,y:410}, size:{w:280,h:120}, state:'enabled', groupId:'g-abschluss-sub' },
  { id:'g-ticket-sub', type:'group', groupKind:'ticket', label:'Ticket',
    position:{x:360,y:410}, size:{w:280,h:120}, state:'enabled', groupId:'g-abschluss-sub' },
  { id:'g-anmeldung-sub', type:'group', groupKind:'anmeldung', label:'Anmeldung',
    position:{x:660,y:410}, size:{w:280,h:120}, state:'enabled', groupId:'g-abschluss-sub' },

  // ===== Vorauswahl =====
  { id:'start', label:'Sprachauswahl', tag:'(Start)', state:'enabled',
    position:{x:60,y:60}, groupId:'g-auswahl', connections:['einschr'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'einschr', label:'Einschränkungen', state:'enabled',
    position:{x:360,y:60}, groupId:'g-auswahl', connections:['verw'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'verw', label:'Verwaltungseinheiten', state:'enabled',
    position:{x:760,y:60}, groupId:'g-auswahl', connections:['habenSieTermin'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },

  // ===== Buchung =====
  { id:'dienst', label:'Dienstleistungserfassung', state:'enabled',
    position:{x:80,y:250}, groupId:'g-buchung-sub', connections:['terminOpt'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'terminOpt', label:'Option Terminbuchung', state:'enabled', question:true,
    position:{x:80,y:300}, groupId:'g-buchung-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },

  // ===== Terminanmeldung =====
  { id:'wartennummer', label:'Anmeldung per Wartennummer', state:'enabled', question:true,
    position:{x:560,y:250}, groupId:'g-terminanmeldung-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  // سؤال رئيسي موضوعه وسط الـMenübaum (كما بالصورة)
  { id:'habenSieTermin', label:'Haben Sie für heute einen Termin?', state:'enabled', question:true,
    checkbox: false,
    position:{x:470,y:210}, groupId:'g-menubaum',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'geburtsdatum', label:'Anmeldung per Geburtsdatum', state:'enabled',
    position:{x:560,y:300}, groupId:'g-terminanmeldung-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },

  // ===== Abschluss → Terminbuchung =====
  { id:'zusammenfassungTermin', label:'Zusammenfassung Terminbuchung', state:'enabled',
    position:{x:100,y:450}, groupId:'g-terminbuchung-sub', connections:['abschlussTermin'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'abschlussTermin', label:'Abschluss Terminbuchung', state:'enabled',
    position:{x:100,y:490}, groupId:'g-terminbuchung-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },

  // ===== Abschluss → Ticket =====
  { id:'zusammenfassungTicket', label:'Zusammenfassung Ticket', state:'enabled',
    position:{x:400,y:450}, groupId:'g-ticket-sub', connections:['abschlussTicket'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'abschlussTicket', label:'Abschluss Ticket', state:'enabled',
    position:{x:400,y:490}, groupId:'g-ticket-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },

  // ===== Abschluss → Anmeldung =====
  { id:'zusammenfassungAnmeldung', label:'Zusammenfassung Anmeldung', state:'enabled',
    position:{x:700,y:450}, groupId:'g-anmeldung-sub', connections:['abschlussAnmeldung'],
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'abschlussAnmeldung', label:'Abschluss Anmeldung', state:'enabled',
    position:{x:700,y:490}, groupId:'g-anmeldung-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },

  // ===== Sonstiges =====
  { id:'bildschirmschoner', label:'Bildschirmschoner', state:'enabled',
    position:{x:80,y:780}, groupId:'g-sonstiges-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'sperrseiten', label:'Sperrseiten', state:'enabled',
    position:{x:280,y:780}, groupId:'g-sonstiges-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'oeffnungszeiten', label:'Öffnungszeiten', state:'enabled',
    position:{x:480,y:780}, groupId:'g-sonstiges-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'wegbeschreibung', label:'Wegbeschreibung', state:'enabled',
    position:{x:680,y:780}, groupId:'g-sonstiges-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} },
  { id:'treffen-optionen', label:'Treffen-Optionen', state:'enabled',
    position:{x:880,y:780}, groupId:'g-sonstiges-sub',
    openConfig:()=>{}, openHelp:()=>{}, openEdit:()=>{}, onChangeCheckbox:()=>{} }
];


/** 3) Connection — مصفوفة واحدة تشمل كل الفروع (ja / nein) */
const fullConnection = [
  "start","einschr","verw",

  // عنده موعد (ja) → سؤال رقم الانتظار
  "habenSieTermin:ja",
  "wartennummer:ja","zusammenfassungAnmeldung","abschlussAnmeldung",
  "wartennummer:nein","geburtsdatum","zusammenfassungAnmeldung","abschlussAnmeldung",

  // ما عنده موعد (nein) → Buchung → Option Termin
  "habenSieTermin:nein","dienst",
  "terminOpt:ja","zusammenfassungTermin","abschlussTermin",
  "terminOpt:nein","zusammenfassungTicket","abschlussTicket"
];


/** 4) Render — بناء اللوحة */
const nodesUI = new NodeUI();
const targetContainer = '.canvas-container';
nodesUI.build(targetContainer, nodes, {
  width: 2000,
  height: 1200,
  panZoomEnabled: true,
  state: typeof state !== "undefined" ? state : "enabled",
  graph: connectGraph,        // مفيد للتحقق/التلوين بحسب الفروع
  connection: fullConnection, // المصفوفة الشاملة
  dragEnabled: true
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
