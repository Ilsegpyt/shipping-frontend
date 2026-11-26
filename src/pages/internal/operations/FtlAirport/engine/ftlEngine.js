/* eslint-disable */
/* =============================================================================
   FTL Airport Dashboard engine
   -----------------------------------------------------------------------------
   Ported verbatim from FTL_Airport_Dashboard.html. The business logic, i18n,
   validation, charts and Excel/PDF export are unchanged. What was changed so it
   can live inside a React host application:

   • Libraries are ES imports instead of inlined <script> bundles.
   • All state lives in the closure of createFtlEngine(), so the dashboard can be
     mounted, unmounted and mounted again (React StrictMode safe).
   • DOM lookups, theme (data-theme), direction (dir/lang) and popovers are
     scoped to the root element instead of <html>/<body>.
   • Every document/window listener is tracked and removed by destroy().
   • window.ILS_API / ILS_SAVE / ILS_MAIL / ILS_OUTLOOK globals were replaced by
     the `host` object passed in options (see FtlDashboard.jsx).
   • Inline onclick handlers call window.__FTL__.* (the only global left).
   ============================================================================= */
import * as XLSX from 'xlsx';
import Chart from 'chart.js/auto';
import ExcelJS from 'exceljs';
import * as PDFLib from 'pdf-lib';
import { getMarkup } from './markup.js';

export const HANDLER_NAMESPACE = '__FTL__';
let ACTIVE_ENGINE = null;

/**
 * Mounts the dashboard inside `root` and returns a controller.
 * @param {HTMLElement} root  empty element that becomes the dashboard root (.ftl-root)
 * @param {object} options
 * @param {object}   options.host       live object with getters: api, save, mail, outlook
 * @param {'en'|'ar'} [options.language]
 * @param {'light'|'dark'} [options.theme]
 * @param {object}   [options.initialWorkspace]  offline mode: {version, shipments[]} to preload
 * @param {(type:string, detail:any)=>void} [options.onEvent]
 */
export function createFtlEngine(root, options = {}) {
  if (!root) throw new Error('createFtlEngine: root element is required');
  if (ACTIVE_ENGINE) {
    try { ACTIVE_ENGINE.destroy?.(); } catch (e) { /* ignore */ }
    ACTIVE_ENGINE = null;
  }

  /* ---------------- integration plumbing ---------------- */
  let destroyed = false;
  const __cleanups = [];
  const __on = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); __cleanups.push(() => target.removeEventListener(type, fn, opts)); };
  const __layer = () => root;                       // popovers, tooltips and helpers live inside the root
  const __emit = (type, detail) => { if (!destroyed) { try { options.onEvent && options.onEvent(type, detail); } catch (e) { console.error(e); } } };
  const ILS = options.host || {};
  const __extra = {};
  let LAST_COUNTS = options.counts ? { ...options.counts } : null;
  const LOADED_DIRS = new Set();
  const printHost = document.createElement('div');
  printHost.className = 'ftl-root ftl-print-host';
  printHost.setAttribute('data-theme', 'light');

  root.classList.add('ftl-root');
  root.setAttribute('data-theme', 'light');
  root.dir = 'ltr';
  root.lang = 'en';
  root.innerHTML = getMarkup();

  if (options.counts) {
    LAST_COUNTS = { ...options.counts };
  }

  /* Keep root stacking context elevated above app sticky headers when any modal is open */
  const updateModalState = () => {
    const hasOpen = Boolean(root.querySelector('.modal.open'));
    root.classList.toggle('ftl-has-modal', hasOpen);
    document.body.classList.toggle('ftl-modal-open', hasOpen);
  };
  const modalObserver = new MutationObserver(updateModalState);
  modalObserver.observe(root, { subtree: true, attributes: true, attributeFilter: ['class'] });
  __cleanups.push(() => {
    modalObserver.disconnect();
    root.classList.remove('ftl-has-modal');
    document.body.classList.remove('ftl-modal-open');
    resolveDiscardConfirm(false);
  });

  __on(document, 'keydown', e => {
    if (e.key === 'Escape') {
      if ($('ftlDiscardConfirmModal')?.classList.contains('open')) {
        closeM('ftlDiscardConfirmModal');
        return;
      }
      const openModals = root.querySelectorAll('.modal.open');
      if (openModals.length) {
        openModals.forEach(m => m.classList.remove('open'));
        updateModalState();
      }
    }
  });

  /* ---------------- original application code ---------------- */


  /* =====================================================================
     ILS Egypt — Transport Dashboard (road haulage)
     Data: TPT_REPORT — two main tabs: IMPORT (port → client site)
                                       EXPORT (client site → port)
     Each row = one container = one truck trip. Group columns are merged in
     Excel (only the first row of an operation carries them) -> fill-down.
     ===================================================================== */
  'use strict';
  const $ = id => { const el = document.getElementById(id); if (el && (root.contains(el) || printHost.contains(el))) return el; return root.querySelector('#' + CSS.escape(id)) || printHost.querySelector('#' + CSS.escape(id)); };

  /* ============================ 1. i18n ============================ */
  let LANG = 'en';
  const T = {
    en: {
      workflow: { deliveredShipments: 'Delivered shipments', inactiveShipments: 'Inactive shipments', selectShipment: 'Shipment', reopen: 'Reopen shipment', reopenInactive: 'Restore operation', noDelivered: 'No delivered shipments yet', noInactive: 'No inactive shipments yet', open: 'Open', delivered: 'Delivered', inactive: 'Inactive', markDelivered: 'Mark shipment delivered', deliveryStatus: 'Delivery status', allShipments: 'All shipments', fclTitle: 'FCL · Full Container Load', fclSubtitle: 'Import to export container opportunities', fclLine: 'Shipping line ', fclSize: 'Container type ', fclPort: 'Transfer port ', fclWindow: 'Time window ', fclAllLines: 'All lines', fclAllTypes: 'All types', fclAllPorts: 'All ports', fclHours: n => `${n} hours`, fclIntro: 'Reuse an import container for an export load. Import actual arrival must be 0–24 hours before export required loading; container type, shipping line and import POD / export POL must match. Confirm unloading, availability and booking before assigning.', fclOptions: 'Matching options', fclContainers: 'Import containers', fclExports: 'Export shipments', fclSixHours: 'Within 6 hours', fclActual: 'IMPORT · actual arrival', fclRequired: 'EXPORT · required loading', fclCandidate: 'Candidate only; the same container may appear for multiple export loads.', fclEmpty: 'No eligible match for these filters. Check import actual arrival date/time and export required loading date/time.' },
      title: 'Transport Dashboard', sub: 'Road haulage · TPT report · Insights',
      kicker: 'ILS EGYPT · TRANSPORT', eKicker: 'TRANSPORT · TRIPS & TRUCKERS REPORT',
      noData: 'No data loaded', tagImport: 'import', tagExport: 'export', dashBtn: 'Dashboard', upload: 'Upload TPT file', clear: 'Clear', exportBtn: 'Export Dashboard', raw: 'Raw Data', quality: 'Data quality', help: 'Help', fields: 'Fields', langBtn: 'عربي',
      eH: 'Drop the TPT transport report here',
      eP: 'Upload an Import tab, an Export tab, or one workbook with both. The new column layout is read by header. Required operation fields and container volume are checked on every shipment, including merged cells. An incomplete upload is rejected in full with the exact tab and cell shown in the quality report.',
      eBtn: 'Choose file', reqCol: 'Required tabs:', recCols: 'Recognized columns:',
      eH: 'Start a transport report', eP: 'Pick the direction and fill the trips directly here — one row per container, exactly like the sheet. Every cell is checked while you type, and nothing reaches the dashboard until the required fields are valid.',
      lcImpT: 'Import trips', lcImpS: 'Port → client site', lcExpT: 'Export trips', lcExpS: 'Client site → port',
      lAlt: 'Already have the file?', lAltBtn: 'upload an existing TPT file', entryBtn: 'Data entry',
      dev: {
        title: 'Database integration — everything the developer needs', s1: '1 · Endpoints', p1: 'The screen already speaks this contract. Implement these and the dashboard becomes live; nothing else changes.',
        method: 'Method', endpoint: 'Endpoint', purpose: 'Purpose',
        s2: '2 · The only hook to add', p2: 'Define ILS.api before the page loads. If it is missing, the dashboard keeps working offline exactly as it does now.',
        s3: '3 · Column → field map (generated from the sheet)', p3: 'These are the table fields. Keep the field names — they are what the payloads use.',
        colH: 'Sheet column', fieldH: 'Field', typeH: 'Type', reqH: 'Required', listH: 'Drop-down list',
        s4: '4 · Payload shape', p4: 'What the front-end sends when an operation is created, and what it expects back from GET /trips.',
        s5: '5 · Behaviour without a database', p5: 'With no ILS_API the app stays one-time: data lives in the page, Export to Excel keeps the sheet structure, and the PDF export works. Connecting the API only adds persistence — no feature is lost either way.',
        copy: 'Copy', copied: 'Copied'
      },
      mail: {
        title: 'Send by email', kindExcel: 'Excel file', kindDash: 'Dashboard (KPIs + charts)', to: 'To', note: 'Message (optional)', notePh: 'A line for the reader…',
        allCols: 'all columns', allCharts: 'All visible charts', kpis: 'Include the KPI figures',
        send: 'Open email now', fallback: 'Outlook draft with attachment (.eml)',
        how: '<b>Open email now</b> opens your mail app immediately with the address, subject and message filled in, and downloads the Excel file so you can drop it into the email. <b>Outlook draft</b> gives you a ready message with the branded body and the attachment already inside — open the downloaded .eml and press Send.',
        openedMailtoDash: 'Mail app opened with the dashboard summary',
        subjExcel: d => `ILS Transport report — ${d}`, subjDash: (m, d) => `ILS Transport dashboard (${m}) — ${d}`,
        titleExcel: 'Transport report', titleDash: 'Transport dashboard',
        introExcel: 'Please find attached the transport report exported from the ILS Transport Dashboard. The file follows the TPT sheet exactly (same columns, colours and merged shipments) and can be uploaded back at any time.',
        introDash: s => `Snapshot of the transport dashboard for: <b>${s}</b>. Figures and charts below reflect the data at the time of sending.`,
        greeting: 'Dear team,', signature: 'Best regards,\nILS Egypt · Transport', introExcelPlain: 'Please find attached the transport report exported from the ILS Transport Dashboard (same columns, colours and merged shipments as the TPT sheet).', introDashPlain: s => `Snapshot of the transport dashboard for: ${s}.`,
        rOps: 'Operations', rImp: 'Import trips', rExp: 'Export trips', rCols: 'Columns included (Import / Export)', rBy: 'Prepared by',
        footer: 'Generated by the ILS Transport Dashboard. Figures are computed from the TPT report; see the dashboard Help centre for how each number is calculated.',
        attachNote: n => `Attachment: ${n} (downloaded to this device — please attach before sending).`,
        openedEml: 'Draft downloaded — open it and Outlook shows the ready message', openedMailto: 'Mail app opened — drop the downloaded Excel file into it before sending'
      },
      entry: {
        hint: 'Create an operation above, or type straight into the table. You can also paste a block copied from Excel, and drag the small square at the corner of a cell to copy it down or across. <b>Enter</b>/<b>↓</b> moves down, <b>Tab</b> across. Nothing blocks you: rows with a container number are always accepted, and anything odd — duplicates, unreadable dates, blanks — is listed in the data-quality report after you apply, exactly like uploading the file.',
        add: 'Add rows', fill: 'Fill down', save: 'Save as Excel', clear: 'Clear tab', apply: 'Apply to dashboard',
        opCount: 'Containers in this operation', optional: '(optional)', powHint: 'Leave empty to use the POL',
        emptyTable: 'No operations yet — create one from the form above and its container rows will appear here.',
        lockedTip: 'Set in the operation form or calculated automatically — read only', lockedToast: 'This field is set in the operation form or calculated automatically; it cannot be edited here',
        editFirstToast: 'Please click "Edit" first to modify this operation',
        mergeTip: 'Merge this column across the shipment (one value)', unmergeTip: 'Un-merge: give each container its own value',
        merged: 'Merged — one value for the whole shipment', unmerged: 'Un-merged — each container has its own value now',
        delShip: 'Delete this operation and its containers', confirmDelShip: 'Delete this whole operation (all its container rows)?',
        updTitle: 'Updates', updPlaceholder: 'Type the update and press Enter…', updAdd: 'Add update', updAs: u => `Will be recorded as ${u}`,
        updAdded: 'Update recorded — Updates Date set to now', updLatest: 'latest', updNone: 'No updates yet', updTip: 'Hover to see all updates · click to add',
        readyShip: (s, t2) => `${s} operations · ${t2} trips`, colMeta: 'Operation / entered',
        kbdHint: '<b>↑ ↓ ← →</b> move · <b>Enter</b> edits · <b>Tab</b> next cell · use the checkbox at the end of the shipment row to select its shipment · <b>Ctrl/⌘+C</b> copies · <b>Esc</b> clears the selection or cancels editing',
        addNew: 'Add new…', addNewPrompt: 'Type the new value:',
        ready: n => `${n} trips ready`, errN: n => `${n} to fix`, warnN: n => `${n} to check`,
        vReq: 'Required field', vDate: 'Invalid date — use DD-MMM-YYYY (for example 24-SEP-2026)', vYear: 'Unusual year — please confirm',
        vSize: "Use 20, 40 or LCL", vDup: r => `Duplicate container — already on row ${r}`, vCntrFmt: 'Unusual container format (4 letters + 7 digits)',
        vMob: 'Unusual phone number', vNum: 'Should be a number',
        vMissing: 'Empty — the trip is still counted, the value just stays blank in the report',
        vNoCntr: 'No container number — this row will be skipped, exactly like the file import does',
        added: n => `${n} rows added`, filled: n => `${n} cells filled`,
        opSub: d => `New ${d.toLowerCase()} operation · fill the shared details once`,
        opCreate: 'Create operation',
        opHint: 'Fill the shipment details once and press Create — a filled row is added to the table below and you complete the rest there. Rows that share one M/BL are grouped together automatically.',
        opOpen: 'Show form', opClose: 'Hide form',
        opMissing: l => `Every field is needed to create the operation — still missing: ${l}`,
        opCreated: (n, ref) => `${ref} added to the table — complete the rest below`,
        mail: 'Email it', mailTo: 'Send the Excel file to which address?',
        mailSubject: d => `ILS Transport report — ${d}`,
        mailBody: (t2, sh, d) => `Please find the transport report attached (${t2} trips · ${sh} shipments), generated ${d}.\n\nThe file has just been downloaded to this device — attach it to this email before sending.\n\nILS Egypt · Transport`,
        mailOpened: 'Your email app is opening — attach the file that was just downloaded',
        mailPdfOpt: 'Email the PDF after exporting', mailPdfSubject: d => `ILS Transport dashboard — ${d}`,
        mailPdfBody: (f, d) => `Attached is the transport dashboard export (${f}), generated ${d}.\n\nSave the PDF from the print dialog, then attach it here before sending.\n\nILS Egypt · Transport`,
        live: 'Live · connected', savedLive: t2 => `Saved to the database ${t2}`,
        nothingToSave: 'Nothing to export yet', saved: 'Excel file downloaded — same sheet structure, ready to re-upload',
        draft: 'Draft', saving: 'Saving…', savedAt: t => `Saved ${t}`, byUser: u => `Entered by ${u}`,
        opsCount: (o, t2) => `${o} operation${o === 1 ? '' : 's'} · ${t2} trips`,
        filledDownN: n => `${n} blank cells filled from the row above`,
        filledCol: (n, c) => `${n} cells filled down in "${c}"`,
        nothingToFill: 'Nothing to fill — every shared value is already in place. Click a cell first to fill that column down.',
        fillTip: 'Click a cell to fill that column down, or press it with no cell selected to fill every shared column (client, trucker, dates, site) into the blank rows of each operation.',
        addTip: 'Type how many rows you need, then press', vDemurrage: 'Free time ends before the loading date — this trip counts as demurrage risk',
        vCut: 'Cut-off is before the loading date — please confirm',
        delRow: 'Delete row', confirmClear: 'Clear all rows in this tab?', filledDown: 'Shared values filled down',
        pasted: n => `Pasted ${n} rows`, pastedFilled: n => `Pasted ${n} rows — merged values filled down automatically`, applied: n => `${n} trips applied to the dashboard`, source: 'Entered in the dashboard'
      },
      lDir: 'Direction', allDir: 'Overview', overview: 'Overview', lClient: 'Client', allClients: 'All clients', lTrucker: 'Transporter', allTruckers: 'All transporters',
      lDest: 'Site / destination', allDest: 'All sites', lSize: 'Container', allSizes: 'All sizes', lOper: 'Operations staff', allOper: 'Everyone',
      lLine: 'Shipping line', allLines: 'All lines', lPort: 'Port', allPorts: 'All ports', lRisk: 'Demurrage', allRisk: 'All trips',
      risk: { Late: 'Pulled after free time', OK: 'Within free time' },
      lBasis: 'Date basis', bLoad: 'Offloading date', bReq: 'Required offloading', bAct: 'Actual offloading', bGate: 'Gate in', bFree: 'Free-time end',
      lFrom: 'From', lTo: 'To', lQuick: 'Quick range', last30: 'Last 30 days', last90: 'Last 90 days', allTime: 'All time', reset: 'Clear filters',
      dir: { Import: 'Import', Export: 'Export' },
      kShip: 'Shipments', kShipSub: a => `${a} trips per shipment on average`,
      kOnTime: 'Arrived on time', kOnTimeSub: (o, n) => `${o} of ${n} at or before the required time`, kOnTimeNone: 'no actual arrive dates yet',
      kOffDelay: 'Arrival delay', kOffDelaySub: (l, n, p) => `${l} of ${n} late (${p}%) vs required date/time`, kOffDelayNone: 'no actual arrive times yet',
      kTransit: 'Gate → site transit', kTransitSub: n => `avg hours from gate out to arrival · ${n} trips`, kTransitNone: 'no gate out + arrive pairs yet', hrs: 'h',
      kDestU: 'Destinations', kDestUSub: (d, p) => `${d} takes ${p}% of the trips`,
      kPortU: 'Ports (POD)', kPortUSub: (d, p) => `${d} takes ${p}% of the trips`,
      offBuckets: ['6h+ early', 'On time', 'Up to 6h late', '6–24h late', 'Over a day late'],
      onTimeL: 'On time', lateL: 'Late',
      kTrips: 'Truck trips', kTripsSub: (i, e) => `${i} import · ${e} export`,
      kCont: 'Containers', kContSub: (a, b, l) => `${a}×20' · ${b}×40'${l ? ` · ${l} LCL` : ''}`,
      kClients: 'Clients served', kClientsSub: n => `across ${n} sites`,
      kTruckers: 'Truckers used', kTruckersSub: p => `top 3 carry ${p}% of trips`,
      kRisk: 'Demurrage risk', kRiskSub: (n, d) => `${n} of ${d} trips with known free time`,
      kFree: 'Free time left', kFreeSub: 'avg days between activity date and free-time end',
      kOper: 'Operations staff', kOperSub: n => `busiest handles ${n}% of trips`,
      kTrucks: 'Trucks used', kTrucksSub: a => `${a} trips per truck on average`,
      kCut: 'Cut-off buffer', kCutSub: (l, n) => `${l} of ${n} after the cut-off (actual arrival, or required date)`, kCutSubNone: 'no CUT OFF dates recorded yet',
      kRoute: 'Routes', kRouteSub: n => `to ${n} destination port${n == 1 ? '' : 's'}`,
      days: 'd',
      charts: {
        chMonthly: ['Trips by month', b => `Truck trips by ${b} month — click a month to focus`],
        chDaily: ['Daily load pattern', 'Trips per day — click a point to focus on that day'],
        chDir: ['Import vs Export', 'Direction of the trip'],
        chClient: ['Trips by client', 'Volume share — click a client to focus'],
        chTrucker: ['Trips by trucker', 'Who moves our containers — click to focus'],
        chDest: ['Sites & destinations', 'Where containers are delivered or loaded'],
        chOper: ['Workload by operations staff', 'Trips handled per team member'],
        chLine: ['Shipping lines', 'Line of the containers moved'],
        chFree: ['Free-time usage', 'Days left before demurrage when the container was pulled'],
        chRiskClient: ['Demurrage risk by client', '% of trips pulled after the free-time end'],
        chTruckerClient: ['Trucker coverage', 'Clients served by each trucker'],
        chOffDelay: ['Required vs actual arrival', 'How far the actual arrive time falls from the required offloading / loading time'],
        chOnTime: ['Arrival performance', 'Actual arrive against the required date & time'],
        chDelayTrucker: ['Delay share by trucker', '% of each trucker\u2019s trips that arrived late — min 3 trips'],
        chStatus: ['Delivery status', 'Open and delivered export trips'],
        chPort: ['Ports', 'Port the containers came from'],
        chRoute: ['Export routes', 'Loading port → destination port']
      },
      basisNames: { load: 'offloading date', reqDate: 'required offloading', actDate: 'actual offloading', gateIn: 'gate in', free: 'free-time end' },
      fBasisName: { load: 'Offloading', reqDate: 'Required', actDate: 'Actual', gateIn: 'Gate in', free: 'Free-time end' },
      dsTrips: 'Trips', axTrips: 'Trips', axDays: 'Days', axPct: '% of trips', axClients: 'Clients',
      freeBuckets: ['Pulled late', 'Same day', '1–2 days left', '3–5 days left', '6+ days left'],
      tip: 'Tip: click any bar, slice, or month to cross-filter the whole dashboard',
      filteredBy: 'Filtered by', clickAgain: '— click a highlighted element again to clear it',
      fNames: { dir: 'direction', pol: 'POL', status: 'status', day: 'day', client: 'client', trucker: 'trucker', dest: 'site', size: 'container', oper: 'operations', line: 'line', port: 'port', risk: 'demurrage', free: 'free time' },
      insH: 'Auto insights', insHMode: d => `Auto insights — ${d}`, insSub: 'Generated from the filtered data',
      fieldsTitle: 'Fields', searchFields: 'Search fields', fieldsMeta: n => `${n} trips`, fillPct: 'filled', distinct: 'distinct values',
      fMin: 'Min', fAvg: 'Average', fMax: 'Max', fTotal: 'Total', fEarliest: 'Earliest', fLatest: 'Latest',
      groups: { Trip: 'The columns of the report', Dates: 'Dates & times', Measures: 'How every number is calculated', 'Data entry': 'How data entry works', 'Data handling': 'How the data is cleaned', Filters: 'How the tabs & filters work', Workflow: 'Delivery status, permissions & FCL', ImportCols: 'IMPORT sheet columns', ExportCols: 'EXPORT sheet columns', Both: 'Both directions' },
      hTitle: 'Help center — data entry, columns & calculations', hSearch: 'Search help', noMatch: 'No matches.',
      qTitle: 'Data quality report', qNothing: 'Nothing uploaded yet.', qSkipped: 'Skipped (not a data tab)', qRejected: 'Rejected', qLoaded: n => `${n} trips loaded`, qDup: n => ` · ${n} skipped`, sheet: 'tab',
      rTitle: 'Raw data — as uploaded', rSearch: 'Search in this tab', rMeta: (s, tt, c) => `${s} of ${tt} rows · ${c} columns`, rCap: '(showing first 500 — use search to narrow)',
      filesTag: (n, c) => `${n} trips · ${c} clients`, loadedOk: n => `Loaded ${n} trips — no issues found`, cleared: 'Data cleared',
      tags: { E: 'ERROR', W: 'WARNING', I: 'INFO' },
      msg: {
        notData: p => `Tab <code>${p.sheet}</code> is not an IMPORT/EXPORT data tab — skipped (summary or notes sheet).`,
        sheetLoaded: p => `Read as <b>${p.dir}</b> trips from tab <code>${p.sheet}</code> (${p.n} rows).`,
        filledDown: p => `${p.n} merged cell values filled down from the first row of each operation (dates, client, trucker, destination).`,
        skippedNoCntr: p => `${p.n} row${p.n > 1 ? 's' : ''} skipped — no container number: ${p.rows}.`,
        dupCntr: p => `${p.n} duplicate container number${p.n > 1 ? 's' : ''} in this tab (kept the first): ${p.list}.`,
        badDates: p => `${p.n} date value${p.n > 1 ? 's' : ''} could not be read and were left blank: ${p.list}.`,
        outOfRange: p => `${p.n} date${p.n > 1 ? 's' : ''} outside a plausible range were cleared (likely typos): ${p.list}.`,
        noDate: p => `${p.n} trip${p.n > 1 ? 's' : ''} have no loading date — counted in totals, but excluded from date ranges and monthly charts.`,
        emptyCols: p => `${p.n > 1 ? 'Columns' : 'Column'} ${p.list} ${p.n > 1 ? 'are' : 'is'} empty in this file — the related KPIs stay blank until filled.`,
        readFail: p => `Could not read this file: ${p.err}`,
        uploadInvalid: p => `Upload rejected: ${p.list}`,
        dateSwap: () => `Day and month were swapped in this tab's dates (Excel read dd/mm as mm/dd) — corrected automatically.`,
        missingVals: p => `Some values were left blank: ${p.list} — the trips are still counted, those fields just stay empty in the report.`,
        entered: p => `${p.n} trips were entered directly in the dashboard and validated while typing${p.w ? ` · ${p.w} cell${p.w > 1 ? 's' : ''} flagged for review (kept as entered)` : ' · no issues'}.`,
        oddYear: p => `${p.n} trip${p.n > 1 ? 's' : ''} have a loading year different from ${p.dom} — likely a typing mistake in the sheet, kept as they are: ${p.list}.`,
        more: n => `(+${n} more)`
      },
      x: {
        title: 'Export Dashboard to PDF', hint: 'Pick what goes into the PDF. The first page is a cover with the ILS identity and the active filters; charts follow four per page. In the print dialog choose "Save as PDF" and keep "Background graphics" on.',
        cover: 'Cover page (identity + active filters)', insights: 'Auto insights', kpis: 'KPIs', charts: 'Charts', go: 'Export PDF', count: (k, c) => `${k} KPIs · ${c} charts selected`,
        kicker: 'ILS EGYPT · TRANSPORT', generated: 'Generated', period: 'Data period', ops: 'Truck trips', clients: 'Clients', filters: 'Active filters', allData: 'All data', basis: 'Date basis'
      },
      ready: {
        title: 'Ready to switch on', count: n => `${n} columns`, tag: 'WHEN FILLED',
        unlockOff: 'turns on the offloading delay KPI, the required-vs-actual chart and the delay share per trucker.',
        unlockArr: 'turns on the on-time arrival rate against the required offloading.',
        unlockPort: 'measures how long each container sits in the port before it moves.',
        unlockInv: 'measures the gap between delivery and invoicing.'
      },
      ins: {
        none: 'No trips match the current filter.',
        topClient: (c, p) => `<b>${c}</b> is the largest account: ${p}% of all trips in this view.`,
        top3: (p, names) => `Top 3 truckers carry <b>${p}%</b> of trips (${names}) — the main concentration risk.`,
        topTrucker: (t, n, p) => `<b>${t}</b> is the most used trucker: ${n} trips (${p}%).`,
        dest: (d, p) => `<b>${d}</b> is the busiest site with ${p}% of trips.`,
        risk: (n, p) => `<b>${n} trips (${p}%)</b> were pulled after the free-time end — direct demurrage exposure.`,
        riskClient: (c, p) => `Highest demurrage risk: <b>${c}</b> with ${p}% of its trips pulled late.`,
        free: d => `On average containers are pulled with <b>${d} days</b> of free time left.`,
        size: p => `<b>${p}%</b> of moves are 40' containers.`,
        oper: (u, p) => `<b>${u}</b> handles the most files: ${p}% of trips.`,
        truck: (n, a) => `<b>${n}</b> trucks used · ${a} trips per truck on average.`,
        exportShare: p => `Export trips are <b>${p}%</b> of the total — the flow is mostly inbound.`,
        mom: (m, ch) => `Trips in ${m} are <b>${ch >= 0 ? '+' : ''}${ch}%</b> vs the previous month.`,
        cut: (d, l) => `Containers are loaded on average <b>${d} days</b> before the cut-off${l ? ` · ${l} after it` : ''}.`,
        route: (r, p) => `Busiest route: <b>${r}</b> with ${p}% of the trips.`,
        port: (p, pc) => `<b>${p}</b> handles ${pc}% of the import containers.`,
        gap: c => `Data gap: <b>${c}</b> is empty in this file, so the related KPI cannot be calculated yet.`
      }
    },
    ar: {
      workflow: { deliveredShipments: 'الشحنات المُسلّمة', inactiveShipments: 'الشحنات غير النشطة', selectShipment: 'الشحنة', reopen: 'إعادة فتح الشحنة', reopenInactive: 'استعادة العملية', noDelivered: 'لا توجد شحنات مُسلّمة', noInactive: 'لا توجد شحنات غير نشطة', open: 'مفتوحة', delivered: 'مُسلّمة', inactive: 'غير نشطة', markDelivered: 'تحديد الشحنة كمُسلّمة', deliveryStatus: 'حالة التسليم', allShipments: 'كل الشحنات', fclTitle: 'FCL · تحميل حاوية كاملة', fclSubtitle: 'فرص استخدام الحاوية بين الوارد والصادر', fclLine: 'الخط الملاحي ', fclSize: 'نوع الحاوية ', fclPort: 'ميناء الربط ', fclWindow: 'الوقت المتاح ', fclAllLines: 'كل الخطوط', fclAllTypes: 'كل المقاسات', fclAllPorts: 'كل الموانئ', fclHours: n => `${n} ساعة`, fclIntro: 'فرص استغلال نفس الحاوية للوارد ثم الصادر: الوصول الفعلي للوارد قبل موعد التحميل المطلوب للصادر بـ 24 ساعة أو أقل، مع تطابق نوع الحاوية والخط الملاحي وميناء الوصول مع ميناء الشحن. الاقتراح يحتاج تأكيد التشغيل وتوافر الحاوية.', fclOptions: 'فرص مطابقة', fclContainers: 'حاويات وارد متاحة', fclExports: 'شحنات صادر محتملة', fclSixHours: 'خلال 6 ساعات', fclActual: 'الوارد · وصول فعلي', fclRequired: 'الصادر · تحميل مطلوب', fclCandidate: 'توصية مبدئية؛ نفس الحاوية قد تظهر لأكثر من شحنة صادر.', fclEmpty: 'لا توجد مطابقة ضمن البيانات والوقت المختار. راجع وقت الوصول الفعلي للوارد ووقت التحميل المطلوب للصادر.' },
      title: 'لوحة النقل', sub: 'نقل بري · تقرير TPT · Insights',
      kicker: 'ILS EGYPT · النقل', eKicker: 'النقل · تقرير النقلات والمقاولين',
      noData: 'لا توجد بيانات بعد', tagImport: 'استيراد', tagExport: 'تصدير', dashBtn: 'اللوحة', upload: 'رفع ملف TPT', clear: 'مسح', exportBtn: 'تصدير اللوحة', raw: 'البيانات الخام', quality: 'جودة البيانات', help: 'مساعدة', fields: 'الحقول', langBtn: 'EN',
      eH: 'اسحب تقرير النقل (TPT) هنا',
      eP: 'ارفع تاب استيراد أو تصدير أو ملف فيه التابين معًا. بنقرأ التقسيمة الجديدة من أسماء الأعمدة، وبنراجع الحقول الإلزامية وعدد الحاويات حتى في الخلايا المدمجة. لو فيه خلية إلزامية ناقصة بنرفض الرفع كله وبنحدد التاب وعنوان الخلية في تقرير الجودة.',
      eBtn: 'اختيار الملف', reqCol: 'التابات المطلوبة:', recCols: 'الأعمدة المعروفة:',
      eH: 'ابدأ تقرير النقل', eP: 'اختار الاتجاه واملا النقلات من هنا مباشرة — صف لكل حاوية، بالظبط زي الشيت. كل خانة بتتراجع وأنت بتكتب، ومفيش حاجة بتوصل للوحة قبل ما الحقول المطلوبة تبقى سليمة.',
      lcImpT: 'نقلات الاستيراد', lcImpS: 'من الميناء لموقع العميل', lcExpT: 'نقلات التصدير', lcExpS: 'من موقع العميل للميناء',
      lAlt: 'عندك الملف جاهز؟', lAltBtn: 'ارفع ملف TPT موجود', entryBtn: 'إدخال البيانات',
      dev: {
        title: 'الربط بقاعدة البيانات — كل اللي المطوّر محتاجه', s1: '1 · نقاط النهاية (Endpoints)', p1: 'الواجهة بتتكلم بالعقد ده بالفعل. نفّذ النقاط دي واللوحة تبقى لايف، ومفيش حاجة تانية بتتغير.',
        method: 'الطريقة', endpoint: 'المسار', purpose: 'الغرض',
        s2: '2 · الهوك الوحيد المطلوب', p2: 'عرّف ILS.api قبل تحميل الصفحة. لو مش موجود، اللوحة بتفضل شغالة أوفلاين زي دلوقتي بالظبط.',
        s3: '3 · خريطة الأعمدة ← الحقول (متولّدة من الشيت)', p3: 'دي حقول الجدول. حافظ على الأسماء دي لأنها المستخدمة في البايلود.',
        colH: 'عمود الشيت', fieldH: 'الحقل', typeH: 'النوع', reqH: 'إلزامي', listH: 'قائمة منسدلة',
        s4: '4 · شكل البايلود', p4: 'اللي الواجهة بتبعته عند إنشاء عملية، واللي بتتوقعه من GET /trips.',
        s5: '5 · السلوك من غير قاعدة بيانات', p5: 'من غير ILS_API اللوحة بتفضل ون-تايم: الداتا في الصفحة، والتصدير لإكسيل بيحافظ على استراكتشر الشيت، وتصدير PDF شغال. الربط بيضيف الحفظ الدائم بس — مفيش أي ميزة بتضيع في الحالتين.',
        copy: 'نسخ', copied: 'تم النسخ'
      },
      mail: {
        title: 'إرسال بالإيميل', kindExcel: 'ملف إكسيل', kindDash: 'الداشبورد (مؤشرات + تشارتات)', to: 'إلى', note: 'رسالة (اختياري)', notePh: 'سطر للقارئ…',
        allCols: 'كل الأعمدة', allCharts: 'كل التشارتات الظاهرة', kpis: 'تضمين أرقام المؤشرات',
        send: 'افتح الإيميل دلوقتي', fallback: 'مسودة Outlook بالمرفق (.eml)',
        how: '<b>افتح الإيميل دلوقتي</b> بيفتح برنامج الإيميل فورًا بالعنوان والموضوع والرسالة، وبينزّل ملف الإكسيل عشان تسحبه في الإيميل. <b>مسودة Outlook</b> بتديك رسالة جاهزة بالقالب والمرفق جواها — افتح ملف الـ .eml اللي اتنزّل ودوس Send.',
        openedMailtoDash: 'اتفتح برنامج الإيميل بملخص اللوحة',
        subjExcel: d => `تقرير النقل — ILS — ${d}`, subjDash: (m, d) => `لوحة النقل (${m}) — ILS — ${d}`,
        titleExcel: 'تقرير النقل', titleDash: 'لوحة النقل',
        introExcel: 'مرفق تقرير النقل المُصدَّر من لوحة النقل. الملف بنفس شكل شيت TPT (نفس الأعمدة والألوان ودمج الشحنات) ويمكن رفعه مرة أخرى في أي وقت.',
        introDash: s => `لقطة من لوحة النقل لـ: <b>${s}</b>. الأرقام والتشارتات أدناه تعكس البيانات وقت الإرسال.`,
        greeting: 'السلام عليكم،', signature: 'مع التحية،\nILS Egypt · النقل', introExcelPlain: 'مرفق تقرير النقل المُصدَّر من لوحة النقل (نفس أعمدة وألوان ودمج شيت TPT).', introDashPlain: s => `لقطة من لوحة النقل لـ: ${s}.`,
        rOps: 'العمليات', rImp: 'نقلات الاستيراد', rExp: 'نقلات التصدير', rCols: 'الأعمدة المضمّنة (استيراد / تصدير)', rBy: 'أعدّها',
        footer: 'صادر من لوحة النقل ILS. الأرقام محسوبة من تقرير TPT؛ راجع مركز المساعدة في اللوحة لطريقة حساب كل رقم.',
        attachNote: n => `المرفق: ${n} (اتنزّل على الجهاز — ارفقه قبل الإرسال).`,
        openedEml: 'اتنزّلت المسودة — افتحها وهتلاقي الرسالة جاهزة في Outlook', openedMailto: 'اتفتح برنامج الإيميل — اسحب ملف الإكسيل اللي اتنزّل جواه قبل الإرسال'
      },
      entry: {
        hint: 'أنشئ عملية من فوق، أو اكتب في الجدول مباشرة. وتقدر كمان تلصق بلوك منسوخ من إكسيل، وتسحب المربع الصغير في ركن الخانة عشان تنسخها لتحت أو للجنب. <b>Enter</b>/<b>↓</b> للنزول و<b>Tab</b> للتنقل. مفيش حاجة بتوقفك: أي صف فيه رقم حاوية بيتقبل، وأي ملاحظة — تكرار، تاريخ غير مقروء، خانات فاضية — بتتعرض في تقرير جودة البيانات بعد التطبيق، بالظبط زي رفع الملف.',
        add: 'إضافة صفوف', fill: 'تعبية لأسفل', save: 'حفظ كملف إكسيل', clear: 'مسح التاب', apply: 'تطبيق على اللوحة',
        opCount: 'عدد الحاويات في العملية', optional: '(اختياري)', powHint: 'سيبها فاضية عشان تاخد قيمة POL',
        emptyTable: 'مفيش عمليات لسه — أنشئ عملية من النموذج اللي فوق وصفوف حاوياتها هتظهر هنا.',
        lockedTip: 'من نموذج العملية أو محسوبة تلقائيًا — غير قابلة للتعديل', lockedToast: 'الخانة دي من نموذج العملية أو محسوبة تلقائيًا، ومش بتتعدل من الجدول',
        editFirstToast: 'اضغط على زر "تعديل" أولاً لبدء تعديل بيانات هذه العملية',
        mergeTip: 'دمج العمود ده على مستوى الشحنة (قيمة واحدة)', unmergeTip: 'فك الدمج: كل حاوية بقيمتها',
        merged: 'تم الدمج — قيمة واحدة للشحنة كلها', unmerged: 'تم فك الدمج — كل حاوية ليها قيمتها دلوقتي',
        delShip: 'حذف العملية وحاوياتها', confirmDelShip: 'حذف العملية كلها (كل صفوف حاوياتها)؟',
        updTitle: 'التحديثات', updPlaceholder: 'اكتب التحديث واضغط Enter…', updAdd: 'إضافة تحديث', updAs: u => `هيتسجل باسم ${u}`,
        updAdded: 'تم تسجيل التحديث — وتاريخ التحديث اتحدّث لدلوقتي', updLatest: 'الأحدث', updNone: 'لا توجد تحديثات', updTip: 'مرّر الماوس لعرض كل التحديثات · دوس للإضافة',
        readyShip: (s, t2) => `${s} عملية · ${t2} نقلة`, colMeta: 'العملية / الإدخال',
        kbdHint: '<b>↑ ↓ ← →</b> للتنقل · <b>Enter</b> للتعديل · <b>Tab</b> للخانة التالية · اضغط مربع التحديد في آخر صف الشحنة لتحديد الشحنة · <b>Ctrl/⌘+C</b> للنسخ · <b>Esc</b> لإلغاء التحديد أو التعديل',
        addNew: 'إضافة جديد…', addNewPrompt: 'اكتب القيمة الجديدة:',
        ready: n => `${n} نقلة جاهزة`, errN: n => `${n} تحتاج تصحيح`, warnN: n => `${n} تحتاج مراجعة`,
        vReq: 'حقل مطلوب', vDate: 'تاريخ غير صالح — استخدم يوم-شهر-سنة (مثال 24-09-2026)', vYear: 'سنة غير معتادة — من فضلك تأكد',
        vSize: 'استخدم 20 أو 40 أو LCL', vDup: r => `حاوية مكررة — موجودة في الصف ${r}`, vCntrFmt: 'صيغة رقم حاوية غير معتادة (4 حروف + 7 أرقام)',
        vMob: 'رقم تليفون غير معتاد', vNum: 'المفروض يكون رقم',
        vMissing: 'فاضية — النقلة هتتحسب عادي، القيمة بس هتفضل فاضية في التقرير',
        vNoCntr: 'مفيش رقم حاوية — الصف ده هيتخطى، بالظبط زي ما بيحصل في رفع الملف',
        added: n => `تمت إضافة ${n} صف`, filled: n => `تم تعبية ${n} خانة`,
        opSub: d => `عملية ${d} جديدة · املا البيانات المشتركة مرة واحدة`,
        opCreate: 'إنشاء العملية',
        opHint: 'املا بيانات الشحنة مرة واحدة واضغط إنشاء — هيتضاف صف معبّى في الجدول تحت وتكمّل الباقي هناك. والصفوف اللي بنفس رقم البوليصة بتتجمع مع بعض تلقائيًا.',
        opOpen: 'إظهار النموذج', opClose: 'إخفاء النموذج',
        opMissing: l => `كل الخانات مطلوبة لإنشاء العملية — الناقص: ${l}`,
        opCreated: (n, ref) => `تمت إضافة ${ref} للجدول — كمّل باقي البيانات تحت`,
        mail: 'إرسال بالإيميل', mailTo: 'تبعت ملف الإكسيل لأنهي إيميل؟',
        mailSubject: d => `تقرير النقل — ILS — ${d}`,
        mailBody: (t2, sh, d) => `مرفق تقرير النقل (${t2} نقلة · ${sh} شحنة)، صادر بتاريخ ${d}.\n\nالملف اتنزّل على الجهاز دلوقتي — ارفقه مع الإيميل قبل الإرسال.\n\nILS Egypt · النقل`,
        mailOpened: 'برنامج الإيميل بيفتح — ارفق الملف اللي اتنزّل دلوقتي',
        mailPdfOpt: 'إرسال الـ PDF بالإيميل بعد التصدير', mailPdfSubject: d => `لوحة النقل — ILS — ${d}`,
        mailPdfBody: (f, d) => `مرفق تصدير لوحة النقل (${f})، صادر بتاريخ ${d}.\n\nاحفظ الـ PDF من نافذة الطباعة وارفقه هنا قبل الإرسال.\n\nILS Egypt · النقل`,
        live: 'لايف · متصل', savedLive: t2 => `محفوظ في قاعدة البيانات ${t2}`,
        nothingToSave: 'مفيش حاجة تتصدّر لسه', saved: 'تم تنزيل ملف الإكسيل — بنفس استراكتشر الشيت وجاهز للرفع تاني',
        draft: 'مسودة', saving: 'جاري الحفظ…', savedAt: t => `محفوظ ${t}`, byUser: u => `أدخلها ${u}`,
        opsCount: (o, t2) => `${o} عملية · ${t2} نقلة`,
        filledDownN: n => `تم تعبية ${n} خانة فاضية من الصف اللي فوقها`,
        filledCol: (n, c) => `تم تعبية ${n} خانة لتحت في عمود "${c}"`,
        nothingToFill: 'مفيش حاجة تتعبى — كل القيم المشتركة موجودة أصلاً. دوس على خانة الأول عشان تعبّي عمودها لتحت.',
        fillTip: 'دوس على خانة عشان تعبّي عمودها لتحت، أو اضغطه من غير ما تختار خانة عشان يعبّي كل الأعمدة المشتركة (العميل، المقاول، التواريخ، الموقع) في الصفوف الفاضية بتاعة كل عملية.',
        addTip: 'اكتب عدد الصفوف اللي محتاجه وبعدين اضغط', vDemurrage: 'فترة السماح تنتهي قبل تاريخ التعتيق — النقلة دي هتتحسب خطر أرضيات',
        vCut: 'آخر ميعاد للتسليم قبل تاريخ التحميل — من فضلك تأكد',
        delRow: 'حذف الصف', confirmClear: 'مسح كل الصفوف في التاب ده؟', filledDown: 'تم تعبية القيم المشتركة',
        pasted: n => `تم لصق ${n} صف`, pastedFilled: n => `تم لصق ${n} صف — والقيم المدمجة اتعبّت تلقائيًا`, applied: n => `تم تطبيق ${n} نقلة على اللوحة`, source: 'إدخال من داخل اللوحة'
      },
      lDir: 'الاتجاه', allDir: 'نظرة عامة', overview: 'نظرة عامة', lClient: 'العميل', allClients: 'كل العملاء', lTrucker: 'الناقل', allTruckers: 'كل الناقلين',
      lDest: 'الموقع / الوجهة', allDest: 'كل المواقع', lSize: 'الحاوية', allSizes: 'كل المقاسات', lOper: 'موظف الأوبريشن', allOper: 'الكل',
      lLine: 'الخط الملاحي', allLines: 'كل الخطوط', lPort: 'الميناء', allPorts: 'كل الموانئ', lRisk: 'الأرضيات', allRisk: 'كل النقلات',
      risk: { Late: 'اتسحبت بعد فترة السماح', OK: 'داخل فترة السماح' },
      lBasis: 'أساس التاريخ', bLoad: 'تاريخ التعتيق', bReq: 'التعتيق المطلوب', bAct: 'التعتيق الفعلي', bGate: 'دخول البوابة', bFree: 'نهاية فترة السماح',
      lFrom: 'من', lTo: 'إلى', lQuick: 'نطاق سريع', last30: 'آخر 30 يوم', last90: 'آخر 90 يوم', allTime: 'كل الفترة', reset: 'مسح الفلاتر',
      dir: { Import: 'استيراد', Export: 'تصدير' },
      kShip: 'الشحنات', kShipSub: a => `${a} نقلة لكل شحنة في المتوسط`,
      kOnTime: 'الوصول في الميعاد', kOnTimeSub: (o, n) => `${o} من ${n} في الوقت المطلوب أو قبله`, kOnTimeNone: 'لا توجد تواريخ وصول فعلية بعد',
      kOffDelay: 'تأخير الوصول', kOffDelaySub: (l, n, p) => `${l} من ${n} متأخرة (${p}%) عن التاريخ/الوقت المطلوب`, kOffDelayNone: 'لا توجد أوقات وصول فعلية بعد',
      kTransit: 'من البوابة للموقع', kTransitSub: n => `متوسط الساعات من الخروج من البوابة للوصول · ${n} نقلة`, kTransitNone: 'لا توجد أزواج خروج/وصول بعد', hrs: 'س',
      kDestU: 'الوجهات', kDestUSub: (d, p) => `${d} بتاخد ${p}% من النقلات`,
      kPortU: 'الموانئ (POD)', kPortUSub: (d, p) => `${d} بياخد ${p}% من النقلات`,
      offBuckets: ['بدري 6 ساعات أو أكتر', 'في الميعاد', 'متأخر لحد 6 ساعات', 'متأخر 6–24 ساعة', 'متأخر أكتر من يوم'],
      onTimeL: 'في الميعاد', lateL: 'متأخرة',
      kTrips: 'نقلات العربيات', kTripsSub: (i, e) => `${i} استيراد · ${e} تصدير`,
      kCont: 'الحاويات', kContSub: (a, b, l) => `${a}×20 قدم · ${b}×40 قدم${l ? ` · ${l} LCL` : ''}`,
      kClients: 'العملاء المخدومون', kClientsSub: n => `على ${n} موقع`,
      kTruckers: 'المقاولون المستخدمون', kTruckersSub: p => `أكبر 3 يشيلون ${p}% من النقلات`,
      kRisk: 'خطر الأرضيات', kRiskSub: (n, d) => `${n} من ${d} نقلة معروفة فترة سماحها`,
      kFree: 'أيام السماح المتبقية', kFreeSub: 'متوسط الأيام بين التعتيق ونهاية السماح',
      kOper: 'موظفو الأوبريشن', kOperSub: n => `الأكثر انشغالًا يتولى ${n}% من النقلات`,
      kTrucks: 'العربيات المستخدمة', kTrucksSub: a => `${a} نقلة لكل عربية في المتوسط`,
      kCut: 'المهلة قبل الـ CUT OFF', kCutSub: (l, n) => `${l} من ${n} اتحملت بعد آخر ميعاد`, kCutSubNone: 'مفيش تواريخ CUT OFF مسجلة',
      kRoute: 'خطوط السير', kRouteSub: n => `إلى ${n} ميناء وصول`,
      days: 'يوم',
      charts: {
        chMonthly: ['النقلات شهريًا', b => `نقلات العربيات شهريًا حسب ${b} — اضغط على شهر للتركيز`],
        chDaily: ['نمط التحميل اليومي', 'عدد النقلات في اليوم — اضغط على نقطة للتركيز على يومها'],
        chDir: ['استيراد مقابل تصدير', 'اتجاه النقلة'],
        chClient: ['النقلات حسب العميل', 'حصة كل عميل — اضغط للتركيز'],
        chTrucker: ['النقلات حسب المقاول', 'مين بينقل حاوياتنا — اضغط للتركيز'],
        chDest: ['المواقع والوجهات', 'فين بتتسلم أو بتتحمل الحاويات'],
        chOper: ['توزيع الشغل على الأوبريشن', 'عدد النقلات لكل موظف'],
        chLine: ['الخطوط الملاحية', 'الخط الملاحي للحاويات المنقولة'],
        chFree: ['استغلال فترة السماح', 'الأيام المتبقية قبل الأرضيات وقت سحب الحاوية'],
        chRiskClient: ['خطر الأرضيات حسب العميل', 'نسبة النقلات اللي اتسحبت بعد نهاية فترة السماح'],
        chTruckerClient: ['تغطية المقاولين', 'عدد العملاء اللي بيخدمهم كل مقاول'],
        chOffDelay: ['الوصول المطلوب مقابل الفعلي', 'بُعد وقت الوصول الفعلي عن وقت التعتيق / التحميل المطلوب'],
        chOnTime: ['أداء الوصول', 'الوصول الفعلي مقارنة بالتاريخ والوقت المطلوب'],
        chDelayTrucker: ['نسبة التأخير لكل مقاول', 'نسبة نقلات كل مقاول اللي وصلت متأخرة — 3 نقلات على الأقل'],
        chStatus: ['حالة التسليم', 'الشحنات المفتوحة والمُسلّمة في التصدير'],
        chPort: ['الموانئ', 'الميناء اللي الحاويات جات منه'],
        chRoute: ['خطوط سير التصدير', 'ميناء الشحن ← ميناء الوصول']
      },
      basisNames: { load: 'تاريخ التعتيق', reqDate: 'التعتيق المطلوب', actDate: 'التعتيق الفعلي', gateIn: 'دخول البوابة', free: 'نهاية فترة السماح' },
      fBasisName: { load: 'التعتيق', reqDate: 'المطلوب', actDate: 'الفعلي', gateIn: 'البوابة', free: 'نهاية السماح' },
      dsTrips: 'النقلات', axTrips: 'نقلات', axDays: 'أيام', axPct: '% من النقلات', axClients: 'عملاء',
      freeBuckets: ['اتسحبت متأخرة', 'نفس اليوم', 'باقي 1–2 يوم', 'باقي 3–5 أيام', 'باقي 6 أيام أو أكثر'],
      tip: 'جرّب: اضغط على أي عمود أو شريحة أو شهر — اللوحة كلها هتتفلتر عليه',
      filteredBy: 'مفلتر حسب', clickAgain: '— اضغط على العنصر المضيء مرة أخرى لإلغاء الفلتر',
      fNames: { dir: 'الاتجاه', pol: 'POL', status: 'الحالة', day: 'اليوم', client: 'العميل', trucker: 'المقاول', dest: 'الموقع', size: 'الحاوية', oper: 'الأوبريشن', line: 'الخط', port: 'الميناء', risk: 'الأرضيات', free: 'فترة السماح' },
      insH: 'قراءات تلقائية', insHMode: d => `قراءات تلقائية — ${d}`, insSub: 'تُكتب تلقائيًا من البيانات المفلترة',
      fieldsTitle: 'الحقول', searchFields: 'ابحث في الحقول', fieldsMeta: n => `${n} نقلة`, fillPct: 'نسبة الامتلاء', distinct: 'قيمة مميزة',
      fMin: 'الأدنى', fAvg: 'المتوسط', fMax: 'الأقصى', fTotal: 'الإجمالي', fEarliest: 'الأقدم', fLatest: 'الأحدث',
      groups: { Trip: 'أعمدة التقرير', Dates: 'التواريخ والأوقات', Measures: 'إزاي كل رقم بيتحسب', 'Data entry': 'إزاي إدخال البيانات بيشتغل', 'Data handling': 'إزاي البيانات بتتنظف', Filters: 'إزاي التابات والفلاتر بتشتغل', Workflow: 'حالات الشحنات والصلاحيات وFCL', ImportCols: 'أعمدة شيت IMPORT', ExportCols: 'أعمدة شيت EXPORT', Both: 'المشترك بين الاتجاهين' },
      hTitle: 'مركز المساعدة — الإدخال والأعمدة والحسابات', hSearch: 'ابحث في المساعدة', noMatch: 'لا توجد نتائج.',
      qTitle: 'تقرير جودة البيانات', qNothing: 'لم يُرفع أي ملف بعد.', qSkipped: 'تم تجاهله (ليس تاب بيانات)', qRejected: 'مرفوض', qLoaded: n => `تم تحميل ${n} نقلة`, qDup: n => ` · تم تخطي ${n}`, sheet: 'تاب',
      rTitle: 'البيانات الخام — كما رُفعت', rSearch: 'ابحث في هذا التاب', rMeta: (s, tt, c) => `${s} من ${tt} صف · ${c} عمود`, rCap: '(معروض أول 500 — استخدم البحث للتضييق)',
      filesTag: (n, c) => `${n} نقلة · ${c} عملاء`, loadedOk: n => `تم تحميل ${n} نقلة — لا توجد ملاحظات`, cleared: 'تم مسح البيانات',
      tags: { E: 'خطأ', W: 'تنبيه', I: 'معلومة' },
      msg: {
        notData: p => `التاب <code>${p.sheet}</code> ليس تاب بيانات IMPORT/EXPORT — تم تجاهله (ملخص أو ملاحظات).`,
        sheetLoaded: p => `تمت القراءة كنقلات <b>${p.dir}</b> من التاب <code>${p.sheet}</code> (${p.n} صف).`,
        filledDown: p => `تم تعبية ${p.n} قيمة من الخلايا المدمجة من أول صف في كل عملية لباقي صفوفها (التواريخ، العميل، المقاول، الوجهة).`,
        skippedNoCntr: p => `تم تخطي ${p.n} ${p.n > 1 ? 'صفوف' : 'صف'} — بدون رقم حاوية: ${p.rows}.`,
        dupCntr: p => `${p.n} ${p.n > 1 ? 'أرقام حاويات مكررة' : 'رقم حاوية مكرر'} في نفس التاب (تم الاحتفاظ بالأول): ${p.list}.`,
        badDates: p => `${p.n} ${p.n > 1 ? 'قيم تاريخ' : 'قيمة تاريخ'} تعذّرت قراءتها وتُركت فارغة: ${p.list}.`,
        outOfRange: p => `تم مسح ${p.n} ${p.n > 1 ? 'تواريخ' : 'تاريخ'} خارج النطاق المنطقي (أخطاء إدخال محتملة): ${p.list}.`,
        noDate: p => `${p.n} ${p.n > 1 ? 'نقلات' : 'نقلة'} بدون تاريخ تعتيق — بتتحسب في الإجماليات لكن بتُستبعد من نطاقات التاريخ والرسوم الشهرية.`,
        emptyCols: p => `${p.n > 1 ? 'الأعمدة' : 'العمود'} ${p.list} فاضية في الملف — المؤشرات المرتبطة بيها هتفضل فاضية لحد ما تتملى.`,
        readFail: p => `تعذّرت قراءة هذا الملف: ${p.err}`,
        uploadInvalid: p => `تم رفض الرفع: ${p.list}`,
        dateSwap: () => `اليوم والشهر كانوا مقلوبين في تواريخ هذا التاب (إكسيل قرأ يوم/شهر كشهر/يوم) — تم التصحيح تلقائيًا.`,
        missingVals: p => `Some values were left blank: ${p.list} — the trips are still counted, those fields just stay empty in the report.`,
        missingVals: p => `فيه قيم اتسابت فاضية: ${p.list} — النقلات بتتحسب عادي، بس الخانات دي هتفضل فاضية في التقرير.`,
        entered: p => `تم إدخال ${p.n} نقلة مباشرة في اللوحة ومراجعتها أثناء الكتابة${p.w ? ` · ${p.w} خانة تحتاج مراجعة (اتسجلت كما أُدخلت)` : ' · لا توجد ملاحظات'}.`,
        oddYear: p => `${p.n} ${p.n > 1 ? 'نقلات سنتها' : 'نقلة سنتها'} مختلفة عن ${p.dom} — على الأغلب خطأ كتابة في الشيت، وتُركت كما هي: ${p.list}.`,
        more: n => `(+${n} أخرى)`
      },
      x: {
        title: 'تصدير اللوحة إلى PDF', hint: 'اختار اللي يدخل في الـ PDF. أول صفحة كفر بهوية ILS والفلاتر المفعّلة، وبعدها التشارتات أربعة في كل صفحة. في نافذة الطباعة اختار "حفظ كـ PDF" وسيب "Background graphics" مفعّلة.',
        cover: 'صفحة الكفر (الهوية + الفلاتر المفعّلة)', insights: 'القراءات التلقائية', kpis: 'المؤشرات', charts: 'التشارتات', go: 'تصدير PDF', count: (k, c) => `${k} مؤشر · ${c} تشارت مختار`,
        kicker: 'ILS EGYPT · النقل', generated: 'تاريخ الإصدار', period: 'فترة البيانات', ops: 'نقلات العربيات', clients: 'العملاء', filters: 'الفلاتر المفعّلة', allData: 'كل البيانات', basis: 'أساس التاريخ'
      },
      ready: {
        title: 'جاهزة تشتغل أول ما تتملى', count: n => `${n} أعمدة`, tag: 'لما تتملى',
        unlockOff: 'هيشغّل مؤشر تأخير التفريغ وتشارت المطلوب مقابل الفعلي ونسبة التأخير لكل مقاول.',
        unlockArr: 'هيشغّل نسبة الوصول في الميعاد مقارنة بالتعتيق المطلوب.',
        unlockPort: 'هيقيس مدة مكوث كل حاوية في الميناء قبل ما تتحرك.',
        unlockInv: 'هيقيس الفرق بين التسليم وإصدار الفاتورة.'
      },
      ins: {
        none: 'لا توجد نقلات مطابقة للفلتر الحالي.',
        topClient: (c, p) => `<b>${c}</b> أكبر حساب: ${p}% من كل النقلات في العرض الحالي.`,
        top3: (p, names) => `أكبر 3 مقاولين يشيلون <b>${p}%</b> من النقلات (${names}) — أهم خطر تركّز.`,
        topTrucker: (t, n, p) => `<b>${t}</b> أكثر مقاول استخدامًا: ${n} نقلة (${p}%).`,
        dest: (d, p) => `<b>${d}</b> أنشط موقع بنسبة ${p}% من النقلات.`,
        risk: (n, p) => `<b>${n} نقلة (${p}%)</b> اتسحبت بعد نهاية فترة السماح — تعرّض مباشر للأرضيات.`,
        riskClient: (c, p) => `أعلى خطر أرضيات: <b>${c}</b> بنسبة ${p}% من نقلاته اتسحبت متأخرة.`,
        free: d => `في المتوسط الحاويات بتتسحب وباقي <b>${d} يوم</b> من فترة السماح.`,
        size: p => `<b>${p}%</b> من النقلات حاويات 40 قدم.`,
        oper: (u, p) => `<b>${u}</b> يتولى أكبر عدد ملفات: ${p}% من النقلات.`,
        truck: (n, a) => `<b>${n}</b> عربية مستخدمة · ${a} نقلة لكل عربية في المتوسط.`,
        exportShare: p => `نقلات التصدير <b>${p}%</b> من الإجمالي — الحركة في الأساس واردة.`,
        mom: (m, ch) => `النقلات في ${m} <b>${ch >= 0 ? '+' : ''}${ch}%</b> مقارنة بالشهر السابق.`,
        cut: (d, l) => `الحاويات بتتحمل في المتوسط قبل الـ CUT OFF بـ <b>${d} يوم</b>${l ? ` · و${l} بعده` : ''}.`,
        route: (r, p) => `أكثر خط سير: <b>${r}</b> بنسبة ${p}% من النقلات.`,
        port: (p, pc) => `<b>${p}</b> بيستقبل ${pc}% من حاويات الاستيراد.`,
        gap: c => `فجوة بيانات: العمود <b>${c}</b> فاضي في الملف، فالمؤشر المرتبط بيه لا يمكن حسابه حاليًا.`
      }
    }
  };
  const t = k => T[LANG][k];
  const dirLabel = d => t('dir')[d] || d;
  const riskLabel = r => t('risk')[r] || r;
  const monthLocale = () => LANG === 'ar' ? 'ar-EG-u-nu-latn' : 'en';
  const AR = () => LANG === 'ar';

  /* Help: [EN name, EN desc, AR name, AR desc] */
  const HELP = [
    ['Workflow', [
      ['Open and Delivered', 'A new shipment starts Open. Open its Status dropdown and choose Delivered to move it into Delivered shipments, where the status appears green. The dashboard includes both statuses by default and offers a delivery filter.', 'مفتوحة ومُسلّمة', 'الشحنة الجديدة تبدأ مفتوحة. افتح قائمة Status واختار Delivered لتنقلها إلى الشحنات المُسلّمة، وتظهر حالتها باللون الأخضر. الداشبورد يعرض الحالتين افتراضيًا، مع فلتر لحالة التسليم.'],
      ['Delivered shipments are read only', 'The archive shows the same columns and data on pages. Its shipment checkboxes only select rows for copying or export; shipment data cannot be edited there.', 'الشحنات المُسلّمة للعرض فقط', 'النافذة تعرض نفس الأعمدة والبيانات على صفحات. مربعات التحديد تختار الشحنات للنسخ أو التصدير فقط؛ بيانات الشحنات لا يمكن تعديلها فيها.'],
      ['Copy, Excel and email in Delivered', 'Use the far-right checkboxes to select shipments, or Select all across pages. Copy includes headers and every container row. Excel and email let you choose columns and delivered shipments only; the coloured column groups match the active table.', 'النسخ والإكسيل والإيميل في الشحنات المُسلّمة', 'حدد الشحنات من مربعات آخر الصف أو اختار الكل عبر الصفحات. النسخ يشمل العناوين وصفوف الحاويات. تصدير Excel والإيميل يتيحان اختيار الأعمدة والشحنات المُسلّمة فقط، بنفس ألوان مجموعات الجدول الأساسي.'],
      ['Reopen and Delete permissions', 'Both actions are hidden in this demo. After account integration, Reopen can appear outside the archived table only for the reopen_shipments role. The server must authorize the request. Delete likewise requires delete_shipments.', 'صلاحيات إعادة الفتح والحذف', 'الإجراءان مخفيان في الديمو. بعد ربط المستخدمين يظهر Reopen خارج الجدول المؤرشف فقط لرول لديه reopen_shipments، ويتحقق السيرفر من الصلاحية عند الطلب. الحذف يتطلب delete_shipments.'],
      ['FCL recommendation', 'Import actual arrival must be 0–24 hours before Export required loading. Container type and shipping line must match, and Import POD must equal Export POL. An already assigned different Export container excludes the match. Confirm availability before using a suggestion.', 'اقتراح FCL', 'الوصول الفعلي للوارد يسبق التحميل المطلوب للصادر بـ 0–24 ساعة، مع تطابق نوع الحاوية والخط الملاحي وميناء POD الوارد مع POL الصادر. وجود حاوية مختلفة محددة للصادر يستبعد المطابقة. تأكد من توافر الحاوية قبل اعتماد الاقتراح.']]],
    ['Filters', [
      ['Import, Export and FCL', 'Import and Export each show their own measures. Both include Open and Delivered by default; use the delivery filter to show one status. FCL has its own line, container type, port and time filters.', 'الاستيراد والتصدير وFCL', 'لكل من الاستيراد والتصدير مؤشرات خاصة ويعرضان المفتوح والمُسلّم افتراضيًا؛ فلتر حالة التسليم يحدد حالة واحدة. FCL له فلاتر الخط ونوع الحاوية والميناء والوقت.'],
      ['Cross-filtering', 'Click any bar, slice, month or day and the whole dashboard filters on it; click it again to release. The filter line under the tabs always says what is applied.', 'الفلترة المتبادلة', 'دوس على أي عمود أو شريحة أو شهر أو يوم واللوحة كلها تتفلتر عليه؛ دوس تاني تلغي. وسطر الفلاتر تحت التابات بيقول دايمًا إيه المطبّق.'],
      ['Date basis', 'The date the filters and the monthly / daily charts run on: activity date (default), required, actual arrive, gate out, or free-time end.', 'أساس التاريخ', 'التاريخ اللي الفلاتر والتشارتات الشهرية واليومية بتشتغل عليه: تاريخ النشاط (الافتراضي)، المطلوب، الوصول الفعلي، الخروج من البوابة، أو نهاية السماح.']]],
    ['Trip', [
      ['CNTR Volume — عدد الحاويات', 'How many containers the operation holds. Written by the system from "Containers in this operation" and shown once per shipment.', 'عدد الحاويات', 'عدد حاويات العملية. بيتكتب تلقائيًا من "عدد الحاويات في العملية" وبيظهر مرة واحدة للشحنة.'],
      ['operation — اسم الاوبريشن', 'The operations person who owns the file. Drives the workload chart, and is the name stamped on every update until the login is connected.', 'اسم الاوبريشن', 'موظف الأوبريشن المسؤول عن الملف. منه تشارت توزيع الشغل، وهو الاسم اللي بيتسجل على كل تحديث لحد ما اللوجين يتربط.'],
      ['Certificate Number · Clearance Type · Customs (Export)', 'Export clearance is CERT (certificate number) or BOSLA (Customs).', 'رقم الشهادة · نوع التخليص · الجمارك (تصدير)', 'نوع التخليص CERT لرقم الشهادة أو BOSLA للجمارك.'],
      ['CLEINT — اسم العميل', 'The client. Spelling variants are unified so one client never appears twice.', 'اسم العميل', 'العميل. الاختلافات الإملائية بتتوحد فالعميل الواحد ما يظهرش مرتين.'],
      ['M/BL · BOOKING NO.', 'The Bill of Lading (import) or booking (export). <b>This defines the shipment</b>: its containers are one operation and several trips.', 'رقم البوليصة · رقم البوكينج', 'البوليصة (استيراد) أو البوكينج (تصدير). <b>دي اللي بتعرّف الشحنة</b>: حاوياتها عملية واحدة وكذا نقلة.'],
      ['Shipping Line · destination · POD · POL · POW', 'Carrier, the site, the port of discharge, and for export the port of loading and the port of… waiting (POW). If POW is left empty on the form it takes the POL value.', 'الخط الملاحي · الوجهة · POD · POL · POW', 'الخط الملاحي، الموقع، ميناء التفريغ، وللتصدير ميناء الشحن وميناء العبور (POW). لو POW اتساب فاضي في النموذج بياخد قيمة POL.'],
      ['cntr type · cntr#', 'Per container: size and number. <b>One row = one container = one trip.</b> These never merge across a shipment.', 'مقاس الحاوية · رقم الحاوية', 'لكل حاوية: المقاس والرقم. <b>صف واحد = حاوية واحدة = نقلة واحدة.</b> ودول ما بيتدمجوش على مستوى الشحنة أبدًا.'],
      ['Transporter · Car No. · Driver Name · MOB', 'Transporter is shared at shipment level; car, driver and mobile belong to each container. Export Transporter has no Unmerge option.', 'الناقل · رقم السيارة · السائق · الموبايل', 'الناقل مشترك على مستوى الشحنة، والعربية والسائق والموبايل لكل حاوية. الناقل في التصدير بلا خيار فك دمج.'],
      ['Status in both directions', 'One shipment-level status: Open by default and Delivered after marking it. The status column is at the end of either table, before the selection checkbox.', 'الحالة في الاتجاهين', 'حالة واحدة للشحنة: مفتوحة افتراضيًا ثم مُسلّمة عند تغييرها. عمود الحالة في آخر الجدول قبل مربع التحديد.'],
      ['Missing Docs · Receive Date of Mssing Docs · INVOICES Receive Date', 'Which papers are missing, when they arrived, and when the invoices were received.', 'المستندات الناقصة · تاريخ استلامها · تاريخ استلام الفواتير', 'المستندات الناقصة ومتى وصلت، ومتى اتسلمت الفواتير.']]],
    ['Dates', [
      ['free time till (import)', 'Last free day before demurrage. Against the activity date it gives the free time left and the demurrage risk.', 'فترة السماح (استيراد)', 'آخر يوم قبل الأرضيات. مقارنته بتاريخ النشاط بتدي أيام السماح المتبقية وخطر الأرضيات.'],
      ['Required Offloading / loading Date & Time', 'The promise: when the container must be at the site (import) or loaded (export). Every arrival measure compares against it.', 'تاريخ ووقت التعتيق / التحميل المطلوب', 'الوعد: امتى الحاوية لازم تكون في الموقع (استيراد) أو تتحمل (تصدير). كل مقاييس الوصول بتتقارن بيه.'],
      ['Actual Arrive Date & Time', 'When it really arrived. Actual − Required = the arrival delay, counted in hours so the time of day matters.', 'تاريخ ووقت الوصول الفعلي', 'وقت الوصول الحقيقي. الفعلي − المطلوب = تأخير الوصول، بالساعات فوقت اليوم بيفرق.'],
      ['Gate out Date & Time', 'When the container left the gate. Gate out → Actual arrive = the transit time.', 'تاريخ ووقت الخروج من البوابة', 'وقت خروج الحاوية من البوابة. الخروج ← الوصول الفعلي = زمن الانتقال.'],
      ['CHECK Out From the Port (import)', 'When the container physically left the port.', 'الخروج من الميناء (استيراد)', 'وقت خروج الحاوية فعليًا من الميناء.'],
      ['CUT OFF (Export)', 'The shipping line deadline can be edited in the active Export table. The cut-off buffer compares it with actual arrival or required loading date.', 'CUT OFF (تصدير)', 'آخر ميعاد للخط الملاحي قابل للتعديل من جدول التصدير المفتوح. المهلة تقارنه بتاريخ الوصول الفعلي أو التحميل المطلوب.'],
      ['Updates Date · Latest Updates', 'Every update you add stamps the Updates Date with the date and time, and records who added it. Hover Latest Updates to read them all, click to add one.', 'تاريخ التحديث · آخر التحديثات', 'كل تحديث تضيفه بيكتب التاريخ والوقت في Updates Date وبيسجّل مين أضافه. مرّر الماوس على آخر التحديثات تقراها كلها، ودوس تضيف واحد.']]],
    ['Measures', [
      ['Operations (shipments) vs trips', 'An operation is one B/L or booking with N containers; a trip is one container. Both are separate KPIs.', 'العمليات (الشحنات) مقابل النقلات', 'العملية = بوليصة أو بوكينج بـ N حاوية؛ النقلة = حاوية واحدة. الاتنين مؤشرين منفصلين.'],
      ['Arrival delay · Arrived on time %', 'Actual Arrive (date+time) − Required (date+time) in hours. Positive = late. On-time % = trips at or before the required time ÷ trips where both are known.', 'تأخير الوصول · نسبة الوصول في الميعاد', 'الوصول الفعلي (تاريخ+وقت) − المطلوب (تاريخ+وقت) بالساعات. الموجب = متأخر. النسبة = النقلات في الميعاد أو قبله ÷ النقلات اللي التاريخين معروفين فيها.'],
      ['Delay share by trucker', 'Per trucker: late trips ÷ its measured trips ×100 — only truckers with 3+ measured trips are charted.', 'نسبة التأخير لكل مقاول', 'لكل مقاول: نقلاته المتأخرة ÷ نقلاته المقيسة ×100 — بيظهر اللي عنده 3 نقلات مقيسة على الأقل.'],
      ['Gate → site transit', 'Average hours from Gate out to Actual arrive.', 'من البوابة للموقع', 'متوسط الساعات من الخروج من البوابة للوصول الفعلي.'],
      ['Demurrage risk · Free time left (import)', 'Trips whose activity date is after free time till ÷ trips with a known free time; and the average days left.', 'خطر الأرضيات · أيام السماح (استيراد)', 'النقلات اللي تاريخ نشاطها بعد فترة السماح ÷ النقلات اللي فترة سماحها معروفة؛ ومتوسط الأيام المتبقية.'],
      ['Destinations · Ports (POD)', 'Distinct sites / ports in the view, with the share of the busiest one.', 'الوجهات · الموانئ', 'عدد المواقع / الموانئ المختلفة في العرض، مع حصة الأكثر ازدحامًا.']]],
    ['Data entry', [
      ['Input validation', 'Container count must be 1–200. Certificate numbers accept digits and preserve leading zeros; phone numbers accept 7–15 digits and an initial +. Container IDs use 4 letters and 7 digits; search accepts a partial ID. Dates must be real calendar dates and times use 00:00–23:59. Invalid values show an inline message and cannot be saved.', 'التحقق من الإدخال', 'عدد الحاويات من 1 إلى 200. رقم الشهادة أرقام فقط مع الحفاظ على الأصفار في البداية؛ التليفون من 7 إلى 15 رقم ومسموح + في الأول. رقم الحاوية 4 حروف و7 أرقام، والبحث يقبل جزء منه. التاريخ لازم يكون صحيح والوقت من 00:00 إلى 23:59. القيمة الغلط بيظهر جنبها السبب ومش بتتحفظ.'],
      ['Shipment number', 'Enter Shipment # directly in the first table column. It merges across the shipment by default, can be edited there, and is included in duplicate validation.', 'رقم الشحنة', 'اكتب رقم الشحنة مباشرة في أول عمود في الجدول. بيتدمج افتراضيًا على مستوى الشحنة، قابل للتعديل من الجدول، وداخل في منع التكرار.'],
      ['Search and sort shipments', 'Above the table, choose a key and type a value to filter whole shipments. Shipment # is entered directly in the first table column and is searchable; a matching container row keeps its shipment visible. Add rules with AND (both), OR (either) or NOT (exclude matches). Sort by a key in ascending or descending order. Clear removes the search rules.', 'البحث وترتيب الشحنات', 'فوق الجدول اختار العمود واكتب القيمة عشان تفلتر الشحنات كاملة. «رقم الشحنة» بيتكتب مباشرة في أول عمود وبيظهر في البحث؛ لو أي صف حاوية طابق البحث، الشحنة بتظهر كلها. أضف شروط AND (الاتنين) أو OR (أي واحد) أو NOT (استبعاد المطابق). اختار عمود الترتيب وتصاعدي أو تنازلي. «مسح» يشيل شروط البحث.'],
      ['Field types and date format', 'The type shown under each header also appears beside its search key: Number, Number / ID, Text, Date, Time or Date & time. Container numbers and other IDs are kept as identifiers to preserve letters and leading zeros. A selected calendar date displays as <b>24-SEP-2026</b>; times use <b>24-hour HH:mm</b> such as 14:50.', 'أنواع البيانات وشكل التاريخ', 'نوع كل عمود بيظهر تحت عنوانه وبجنب مفتاح البحث: رقم، رقم / كود، نص، تاريخ، وقت، أو تاريخ ووقت. أرقام الحاويات والأكواد بتفضل معرّفات عشان الحروف والأصفار في أولها ما تضيعش. التاريخ بعد التقويم بيظهر بالشكل <b>24-SEP-2026</b>، والوقت بنظام <b>24 ساعة HH:mm</b> زي 14:50.'],
      ['Operations come from the form only', 'Fill the form (all fields needed), set <b>Containers in this operation</b>, press Create: a shipment appears in the table with one row per container. The table itself never adds rows.', 'العمليات من النموذج بس', 'املا النموذج (كل الخانات مطلوبة)، حدد <b>عدد الحاويات في العملية</b>، دوس إنشاء: الشحنة تظهر في الجدول بصف لكل حاوية. الجدول نفسه ما بيضيفش صفوف.'],
      ['Editing operations', 'Fields entered in the operation form and fields generated by the system are locked in the table. Fill the remaining trip fields in the table; editable shared cells update all rows in the shipment.', 'تعديل العملية', 'الحقول اللي اتدخلت في نموذج العملية والحقول اللي النظام بيحسبها مقفولة في الجدول. كمّل بيانات النقلات الباقية من الجدول؛ الخانات المشتركة القابلة للتعديل بتحدّث كل صفوف الشحنة.'],
      ['Fixed and optional merges', 'No Unmerge on Import: POD, operation, client, certificate number, M/BL, Shipment #, invoices receive date, shipping line, CNTR Volume. Export: clearance type, operation, CNTR Volume, Shipment #, certificate number, customs, booking number, client, shipping line, POL, POD, POW, transporter, invoices receive date. Other eligible columns retain Merge / Unmerge; per-container columns stay separate.', 'الدمج الثابت والاختياري', 'بدون فك دمج في الوارد: POD، الأوبريشن، العميل، رقم الشهادة، M/BL، رقم الشحنة، تاريخ استلام الفواتير، الخط الملاحي، وعدد الحاويات. وفي الصادر: نوع التخليص، الأوبريشن، عدد الحاويات، رقم الشحنة، رقم الشهادة، الجمارك، البوكينج، العميل، الخط الملاحي، POL، POD، POW، الناقل، وتاريخ استلام الفواتير. باقي الأعمدة المؤهلة لها دمج وفك دمج، وحقول الحاويات منفصلة.'],
      ['Keyboard and copying', 'The selection checkbox is at the far end of each shipment row. Ctrl/⌘+C copies headers and all selected container rows; empty values become a dash. Esc clears selection or cancels editing. The table shows up to 70 trips per page.', 'الكيبورد والنسخ', 'مربع التحديد في أقصى آخر صف الشحنة. Ctrl/⌘+C ينسخ العناوين وصفوف الحاويات المحددة؛ الخانات الفاضية شرطة. Esc يلغي التحديد أو التعديل. يعرض الجدول حتى 70 نقلة في الصفحة.'],
      ['Duplicate shipments', 'Shipment # and HAWB cannot belong to different shipments. The same MAWB + HAWB pair cannot repeat. The same Certificate Number + Shipment # pair cannot belong to different shipments; certificate number alone may repeat across shipments.', 'تكرار الشحنات', 'رقم الشحنة وبوليصة HAWB لا يتكرران نهائياً بين شحنات مختلفة. نفس زوج MAWB + HAWB لا يتكرر معاً. رقم الشهادة مع رقم الشحنة لا يتكرران معاً في شحنة أخرى؛ بينما رقم الشهادة بمفرده يمكن أن يتكرر بحرية عبر الشحنات.'],
      ['Drop-down lists', 'Operation, client, line, container type, POD/POL/POW and transporter use value lists. Delivery status is a separate Open / Delivered control.', 'القوائم المنسدلة', 'الأوبريشن والعميل والخط والمقاس وPOD/POL/POW والناقل لهم قوائم قيم. حالة التسليم اختيار منفصل مفتوحة / مُسلّمة.'],
      ['Save as Excel · Email', 'Choose both columns and operations (shipments), then export only that selection. Excel preserves shared shipment cells and includes an ENTRY LOG. Email prepares an Outlook draft when connected, or downloads a .eml draft with the attachment when working locally; open the draft and send it yourself.', 'حفظ إكسيل · إيميل', 'اختار الأعمدة والعمليات (الشحنات) اللي محتاجها، وبعدها صدّر المحدد بس. الإكسيل بيحافظ على خانات الشحنة المشتركة وفيه ENTRY LOG. الإيميل بيجهز مسودة Outlook عند الربط أو ينزّل ملف .eml فيه المرفق محليًا؛ افتح المسودة وابعتها.']]],
    ['Data handling', [
      ['Uploading the TPT file', 'Use Upload TPT file in Data entry or the dashboard. Uploading from Data entry adds shipments while keeping the rows already in progress. A workbook can contain Import, Export or both. Required fields are checked, and any invalid cell rejects the whole upload with its sheet and address in the quality report.', 'رفع ملف TPT', 'ارفع الملف من زر Upload TPT file في شاشة إدخال البيانات أو الداشبورد. الرفع من شاشة الإدخال بيضيف الشحنات ويحافظ على الصفوف اللي شغال عليها. الملف ممكن يكون فيه Import أو Export أو الاتنين، وأي خلية إلزامية غير صحيحة بترفض الرفع كله مع اسم التاب وعنوان الخلية في تقرير الجودة.'],
      ['Names are unified', 'Clients, truckers, lines and sites are normalised (case, spaces, common misspellings) so counts are never split by spelling.', 'الأسماء بتتوحد', 'العملاء والمقاولين والخطوط والمواقع بتتوحد (حالة الأحرف، المسافات، الأخطاء الشائعة) فالأرقام ما بتتقسمش بالإملاء.'],
      ['Dates & times read as written', 'dd/mm/yyyy, 1/Jan/26 and Excel dates are all accepted; 8:00AM and 14:30 both become 08:00 / 14:30. Two dots (..) mean empty.', 'التواريخ والأوقات بتتقرا زي ما هي', 'dd/mm/yyyy و 1/Jan/26 وتواريخ إكسيل كلها مقبولة؛ 8:00AM و 14:30 بيبقوا 08:00 / 14:30. والنقطتين (..) معناها فاضي.'],
      ['Data-quality report', 'Every upload or apply produces a report: skipped rows, duplicates, unreadable dates, empty columns, and which KPIs switch on once a column is filled.', 'تقرير جودة البيانات', 'كل رفع أو تطبيق بيطلّع تقرير: الصفوف المتخطاة، المكرر، التواريخ غير المقروءة، الأعمدة الفاضية، وأنهي مؤشرات هتشتغل أول ما عمود يتملى.']]]
  ];

  /* ======================= 2. utils & cleaning ======================= */
  const fmtN = n => Math.round(n).toLocaleString('en-US');
  const fmtM = n => Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : Math.abs(n) >= 1e3 ? (n / 1e3).toFixed(1) + 'K' : (+n).toFixed(0);
  const iso = (y, m, d) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  const validD = (y, m, d) => { const x = new Date(y, m - 1, d); return x.getMonth() === m - 1 && x.getDate() === d; };
  const serialToISO = n => { const d = new Date(Math.round((n - 25569) * 86400 * 1000)); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()); };
  /* Some exports store dd/mm as text that Excel misparsed to mm/dd (day and month swapped);
     others are stored correctly. SWAP is decided per sheet by dateSwapNeeded() below. */
  let SWAP = false;
  function fixDate(v, swap) {
    const sw = swap === undefined ? SWAP : swap;
    if (v === null || v === undefined) return null;
    if (typeof v === 'string' && /^[\s.\-]*$/.test(v)) return null;   // '', '..', '-', '. .'
    if (v instanceof Date) {
      const y = v.getFullYear(), m = v.getMonth() + 1, d = v.getDate();
      if (sw && d <= 12 && validD(y, d, m)) return iso(y, d, m); return iso(y, m, d);
    }
    if (typeof v === 'number') return (v > 30000 && v < 60000) ? serialToISO(v) : null;
    const raw = String(v).trim(), s = raw.split(/[\s\n]/)[0];
    let m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      const d = +m[1], mo = +m[2]; let y = +m[3]; if (y < 100) y += 2000;   // text is dd/mm by convention
      if (mo <= 12 && validD(y, mo, d)) return iso(y, mo, d);
      if (d <= 12 && validD(y, d, mo)) return iso(y, d, mo); return null;
    }
    m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return validD(+m[1], +m[2], +m[3]) ? s.slice(0, 10) : null;
    // Short format: 'DD/MM' or 'DD-MM' (defaults to current year)
    let mShort = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
    if (mShort) {
      const d = +mShort[1], mo = +mShort[2], y = new Date().getFullYear();
      if (mo <= 12 && validD(y, mo, d)) return iso(y, mo, d);
      if (d <= 12 && validD(y, d, mo)) return iso(y, d, mo);
    }
    // Short format with month name: '4/Jan' or '04-Nov' (defaults to current year)
    let mShortNamed = raw.match(/^(\d{1,2})\s*[-\/\s]\s*([A-Za-z]{3,9})$/);
    if (mShortNamed) {
      const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(mShortNamed[2].slice(0, 3).toLowerCase()) + 1;
      const y = new Date().getFullYear();
      if (mo && validD(y, mo, +mShortNamed[1])) return iso(y, mo, +mShortNamed[1]);
    }
    m = raw.match(/^(\d{1,2})\s*[-\/\s]\s*([A-Za-z]{3,9})\s*[-\/\s]\s*(\d{2,4})$/);   // 1/Jan/26 · 1-Jan-2026 · 1 Jan 26
    if (m) {
      const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[2].slice(0, 3).toLowerCase()) + 1;
      let y = +m[3]; if (y < 100) y += 2000; if (mo && validD(y, mo, +m[1])) return iso(y, mo, +m[1]);
    }
    m = raw.match(/^([A-Za-z]{3,9})\s*[-\/\s]\s*(\d{1,2})\s*[-\/\s]\s*(\d{2,4})$/);   // Jan/1/26
    if (m) {
      const mo = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(m[1].slice(0, 3).toLowerCase()) + 1;
      let y = +m[3]; if (y < 100) y += 2000; if (mo && validD(y, mo, +m[2])) return iso(y, mo, +m[2]);
    }
    return null;
  }
  const txt = v => { if (v === null || v === undefined) return null; const s = String(v).trim(); return (!s || s === '..' || s === '-' || s === '.') ? null : s; };
  const num = v => { if (v === null || v === undefined || v === '') return null; const n = parseFloat(String(v).replace(/,/g, '')); return isNaN(n) ? null : n; };
  const titleCase = s => s ? s.replace(/\S+/g, w => w[0].toUpperCase() + w.slice(1).toLowerCase()) : s;
  function cleanDocValue(val) {
    if (!val) return '';
    const s = String(val).trim();
    if (/^[-—_.\s]+$/.test(s) || s.toLowerCase() === 'none' || s === 'لا يوجد' || s === 'مكتمل' || s === 'لايوجد' || s.toLowerCase() === 'null' || s.toLowerCase() === 'undefined') {
      return '';
    }
    return s;
  }
  function normClient(v) {
    let s = (txt(v) || '').toUpperCase().replace(/\s+/g, ' ');
    if (!s) return null;
    if (s.startsWith('CHMICAL') || s.startsWith('CHEMICAL')) return 'CHEMICALS';
    return s;
  }
  function normSite(v) {
    const s = (txt(v) || '').toUpperCase().replace(/\s+/g, ' ');
    if (!s) return null;
    const map = { 'BORG ELARAB': 'BORG EL ARAB', 'WADI ELNATRUN': 'WADI EL NATRUN', 'ELSADAT': 'EL SADAT', 'ALEXCANDRIA': 'ALEXANDRIA', 'ALEXANDRAIA': 'ALEXANDRIA' };
    return map[s] || s;
  }
  function normLine(v) {
    const s = (txt(v) || '').toUpperCase();
    if (!s) return null;
    if (s.startsWith('HAPAG')) return 'HAPAG-LLOYD';
    if (s === 'MSK' || s === 'MAERSK') return 'MAERSK';
    if (s.startsWith('CMA')) return 'CMA CGM';
    return s;
  }
  function normTrucker(v) {
    const s = txt(v); if (!s) return null;
    const u = s.toUpperCase().replace(/\s+/g, ' ');
    const map = {
      'ALRIHAB': 'ALRihab', 'AL RIHAB': 'ALRihab', 'ELDAWLYA': 'Eldawlya', 'RANIN': 'Ranin', 'TAQA': 'TAQA', 'MEDIL EAST': 'Medil East',
      'ALDAMNHORY': 'ALDamnhory', 'EURO': 'EURO', 'ELSAFA': 'ElSafa', 'AL SAFA': 'ElSafa'
    };
    return map[u] || titleCase(s);
  }
  function normSize(type) {
    const s = (txt(type) || '').toUpperCase(); if (!s) return null;
    if (s.includes('LCL')) return 'LCL';
    const n = num(type); if (n === 20) return "20'"; if (n === 40 || n === 45) return "40'";
    if (s.includes('20')) return "20'"; if (s.includes('40')) return "40'";
    return null;
  }
  const fmtRows = (list, max = 6) => { const s = list.slice(0, max).join('، '); return list.length > max ? `${s} ${t('msg').more(list.length - max)}` : s; };

  /* ======================= 3. parse & validate ======================= */
  let DATA = [], VIEW = [], QREPORT = [], RAW = [];
  const GROUP_COLS = ['CNTR Volume', 'cntr volume', 'operation', 'CERTEFICATE NUMBER', 'CERT', 'Clearness Type', 'Customs', 'M/BL', 'BOOKING NO.', 'FORWARDER', 'CLEINT', 'Shipping Line', 'destination', 'POD', 'POL', 'POW', 'Port', 'date of loading', 'time of loading',
    'free time till', 'demurrage till', 'Required Offloading Date', 'Required Offloading Time', 'Required loading Date', 'Required loading Time', 'Actual Arrive Date', 'Actual Arrive  Date', 'Actual Arrive Time', 'CUT OFF', 'Trucker Name', 'TPT BY', 'STATUS', 'month', 'FROM', 'TO', 'RELEASE ORDER', 'INVOICES Receive Date', 'Missing Docs', 'Receive Date of Mssing Docs'];
  const HEADER_ALIASES = { 'Required offloading date': 'reqDate', 'Required offloading time': 'reqTime', 'Actual offloading date': 'actDate', 'Actual offloading time': 'actTime', 'Actual arriving date': 'arrDate', 'gate in Date': 'gateIn', 'Updates Date': 'updates', 'INVOICES Receive Date': 'invRcv', 'POD': 'pod', 'Note': 'note' };
  const KNOWN = ['NO', 'NO#', 'CNTR Volume', 'cntr volume', 'operation', 'CERTEFICATE NUMBER', 'CERT', 'Clearness Type', 'Customs', 'BOOKING NO.', 'CLEINT', 'M/BL', 'Shipping Line', 'destination', 'POD', 'POL', 'POW', 'free time till', 'demurrage till', 'CUT OFF',
    'Required Offloading Date', 'Required Offloading Time', 'Required loading Date', 'Required loading Time', 'Actual Arrive Date', 'Actual Arrive  Date', 'Actual Arrive Time', 'Gate out Date', 'Gate out Time',
    'cntr type', 'cntr#', 'cntr no#', 'Trucker Name', 'TPT BY', 'Car No.', 'Car No#', 'Driver Name', 'MOB', 'CHECK Out From the Port', 'STATUS', 'Updates Date', 'INVOICES Receive Date', 'Missing Docs', 'Receive Date of Mssing Docs', 'Latest Updates',
    'date of loading', 'time of loading', 'Port', 'FORWARDER', 'NOTE', 'Note', 'COMMENT', 'INVOICES', 'RELEASE ORDER', 'month', 'FROM', 'TO', 'Delay', 'check in date'];

  /* Decide swap per sheet: real monthly transport data sits in one or a few months.
     Whichever reading (as-stored vs swapped) yields fewer distinct months wins. */
  function dateSwapNeeded(aoa, hi, dateIdx) {
    const cells = [];
    for (let i = hi + 1; i < aoa.length; i++) {
      const row = aoa[i] || [];
      dateIdx.forEach(ci => { const v = row[ci]; if (v instanceof Date) cells.push(v); });
    }
    if (cells.length < 6) return false;
    const months = sw => new Set(cells.map(v => { const p = fixDate(v, sw); return p ? p.slice(0, 7) : null; }).filter(Boolean)).size;
    const asIs = months(false), swapped = months(true);
    return swapped < asIs;
  }
  const detectDirection = name => {
    const u = name.trim().toUpperCase();
    if (u === 'IMPORT' || u.startsWith('IMP')) return 'Import';
    if (u === 'EXPORT' || u.startsWith('EXP')) return 'Export'; return null;
  };

  const uploadHeaderKey = v => String(v ?? '').normalize('NFKC').toUpperCase().replace(/[^\p{L}\p{N}]/gu, '');
  const UPLOAD_ALIASES = {
    shipNo: ['SHIPMENT #', 'SHIPMENT NO', 'SHIPMENT NUMBER'], vol: ['CNTR Volume', 'cntr volume'],
    cert: ['CERTEFICATE NUMBER', 'CERTIFICATE NUMBER', 'CERT'], client: ['CLEINT', 'CLIENT'],
    booking: ['BOOKING NO.', 'BOOKING NUMBER', 'BOOKING #'], clrType: ['Clearness Type', 'Clearance Type'],
    cntr: ['cntr#', 'cntr no#', 'CNTR NUMBER', 'CONTAINER NUMBER'], car: ['Car No.', 'Car No#'], trucker: ['Trucker Name', 'Transporter'],
    free: ['free time till', 'demurrage till'], arrDate: ['Actual Arrive Date', 'Actual Arrive  Date'],
    missRcv: ['Receive Date of Mssing Docs', 'Receive Date of Missing Docs']
  };
  function uploadColumns(dir, headers) {
    const keys = headers.map(uploadHeaderKey), cols = {};
    COLS[dir].forEach(c => {
      const aliases = [c.h, ...(UPLOAD_ALIASES[c.k] || [])].map(uploadHeaderKey);
      cols[c.k] = keys.findIndex(k => k && aliases.includes(k));
    });
    return cols;
  }
  function uploadDirection(name, headers) {
    const named = detectDirection(name), keys = new Set(headers.map(uploadHeaderKey));
    const imp = keys.has(uploadHeaderKey('M/BL')), exp = keys.has(uploadHeaderKey('BOOKING NO.')) || keys.has(uploadHeaderKey('BOOKING NUMBER'));
    if (imp && exp) return { dir: null, error: AR() ? 'الهيدر فيه أعمدة استيراد وتصدير معًا؛ افصلهم في تابين.' : 'The header mixes Import and Export columns; put them in separate tabs.' };
    const inferred = imp ? 'Import' : exp ? 'Export' : null;
    if (named && inferred && named !== inferred) return { dir: named, error: AR() ? 'اسم التاب لا يطابق أعمدته.' : 'The tab name conflicts with its Import/Export columns.' };
    return { dir: named || inferred, error: null };
  }
  const uploadBlank = v => v === null || v === undefined || !String(v).trim() || /^[.\-\s]+$/.test(String(v));
  function uploadTime(v) {
    if (v instanceof Date) return normTime(v);
    if (typeof v === 'number') return v >= 0 && v < 1 ? normTime(v) : '';
    const s = String(v ?? '').trim();
    if (!/^(?:[01]?\d|2[0-3])[:.][0-5]\d\s*(?:[AaPp][Mm]?)?$/.test(s)) return '';
    return normTime(s);
  }
  function uploadRequiredValue(c, v) {
    if (uploadBlank(v)) return { ok: false, reason: AR() ? 'فاضية' : 'empty' };
    if (c.t === 'date') return fixDate(v, false) ? { ok: true, value: fixDate(v, false) } : { ok: false, reason: AR() ? 'تاريخ غير صحيح' : 'invalid date' };
    if (c.t === 'time') return uploadTime(v) ? { ok: true, value: uploadTime(v) } : { ok: false, reason: AR() ? 'وقت غير صحيح' : 'invalid time' };
    const result = validateField(c, String(v));
    if (!result.ok) return { ok: false, reason: result.message };
    return { ok: true, value: result.value };
  }

  function parseUploadSheet(ws, name, file) {
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    const rep = { file, sheet: name, dir: detectDirection(name), rows: 0, skipped: 0, notData: false, errors: [], warnings: [], infos: [] };
    let hi = -1, headers = [], direction;
    for (let i = 0; i < Math.min(12, aoa.length); i++) {
      const h = (aoa[i] || []).map(v => v == null ? '' : String(v).trim());
      const keys = h.map(uploadHeaderKey);
      if ((keys.includes('CNTR') || keys.includes('CNTRNO') || keys.includes('CONTAINERNUMBER')) &&
        (keys.includes('MBL') || keys.includes('BOOKINGNO') || keys.includes('BOOKINGNUMBER'))) {
        hi = i; headers = h; direction = uploadDirection(name, h); break;
      }
    }
    if (hi < 0) {
      if (rep.dir && aoa.some(r => (r || []).some(v => !uploadBlank(v))))
        rep.errors.push({ k: 'uploadInvalid', p: { list: AR() ? 'هيدر التاب غير معروف؛ تأكد من أعمدة التقسيمة الجديدة.' : 'Unrecognized tab header; use the new sheet columns.' } });
      else { rep.notData = true; rep.infos.push({ k: 'notData', p: { sheet: name } }); }
      return { rows: [], rep, raw: null };
    }
    rep.dir = direction.dir;
    if (direction.error) { rep.errors.push({ k: 'uploadInvalid', p: { list: direction.error } }); return { rows: [], rep, raw: null }; }
    const dir = direction.dir, cols = uploadColumns(dir, headers), mandatory = COLS[dir].filter(c => c.op && !c.opt);
    const vol = COLS[dir].find(c => c.k === 'vol');
    const missing = [...mandatory, vol].filter(c => cols[c.k] < 0);
    if (missing.length) {
      rep.errors.push({ k: 'uploadInvalid', p: { list: (AR() ? 'أعمدة إلزامية ناقصة في الصف ' : 'Missing mandatory columns in row ') + (hi + 1) + ': ' + missing.map(c => AR() ? (c.ar || c.h) : c.h).join(', ') } });
      return { rows: [], rep, raw: null };
    }
    const merges = ws['!merges'] || [];
    const anchor = (r, c) => merges.find(m => m.s.r <= r && r <= m.e.r && m.s.c <= c && c <= m.e.c);
    const get = (r, k) => {
      const c = cols[k]; if (c == null || c < 0) return null;
      let v = (aoa[r] || [])[c];
      if (uploadBlank(v)) {
        const m = anchor(r, c);
        if (m && (m.s.r !== r || m.s.c !== c)) v = (aoa[m.s.r] || [])[m.s.c];
      }
      return v;
    };
    const addr = (r, k) => XLSX.utils.encode_cell({ r, c: cols[k] });
    const keyField = dir === 'Import' ? 'bl' : 'booking', issues = [], out = [], rawRows = [];
    let groupStart = -1, groupVol = null, groupId = '', lastKey = '', lastCert = '', lastShip = '';
    for (let r = hi + 1; r < aoa.length; r++) {
      const row = aoa[r] || [];
      if (row.every(uploadBlank)) continue;
      const arabic = row.filter(v => typeof v === 'string' && /[\u0600-\u06FF]/.test(v)).length;
      const filled = row.filter(v => !uploadBlank(v)).length;
      if (r <= hi + 3 && arabic >= 1 &&
        uploadBlank(row[cols?.bl ?? -1]) && uploadBlank(row[cols?.booking ?? -1]) &&
        uploadBlank(row[cols?.vol ?? -1]) && uploadBlank(row[cols?.cntr ?? -1])) continue;
      const m = anchor(r, cols[keyField]), rawKey = row[cols[keyField]];
      const shipMerge = cols.shipNo >= 0 && anchor(r, cols.shipNo);
      const sameIdentity = groupStart >= 0 && String(get(r, keyField) ?? '') === lastKey &&
        String(get(r, 'cert') ?? '') === lastCert && String(get(r, 'shipNo') ?? '') === lastShip;
      const continuation = (m && m.s.r < r) || (shipMerge && shipMerge.s.r < r) ||
        (sameIdentity && uploadBlank(row[cols.vol]));
      if (!continuation || groupStart < 0) {
        groupStart = r; groupVol = get(r, 'vol'); groupId = file + '|' + name + '|' + (r + 1);
      }
      lastKey = String(get(r, keyField) ?? ''); lastCert = String(get(r, 'cert') ?? ''); lastShip = String(get(r, 'shipNo') ?? '');
      if (uploadBlank(get(r, keyField))) {
        issues.push(addr(r, keyField) + ' (' + headers[cols[keyField]] + ': ' + (AR() ? 'فاضية' : 'empty') + ')');
        continue;
      }
      for (const c of mandatory) {
        const result = uploadRequiredValue(c, get(r, c.k));
        if (!result.ok) issues.push(addr(r, c.k) + ' (' + c.h + ': ' + result.reason + ')');
      }
      if (r === groupStart) {
        const result = uploadRequiredValue(vol, groupVol);
        if (!result.ok) issues.push(addr(r, 'vol') + ' (CNTR Volume: ' + result.reason + ')');
      }
      const v = k => get(r, k), d = k => fixDate(v(k), false), t = k => uploadTime(v(k));
      const entry = {
        dir, shipNo: txt(v('shipNo')), vol: txt(groupVol), oper: titleCase(txt(v('oper'))),
        cert: txt(v('cert')), client: normClient(v('client')), bl: txt(v('bl')), booking: txt(v('booking')),
        clrType: txt(v('clrType')), customs: txt(v('customs')), line: normLine(v('line')),
        dest: normSite(v('dest')), pod: normSite(v('pod')), pol: normSite(v('pol')), pow: normSite(v('pow')),
        free: d('free'), cut: d('cut'), reqDate: d('reqDate'), reqTime: t('reqTime'),
        arrDate: d('arrDate'), arrTime: t('arrTime'), gateOut: d('gateOut'), gateOutT: t('gateOutT'),
        size: normSize(v('size')), cntr: txt(v('cntr')), trucker: normTrucker(v('trucker')),
        car: txt(v('car')) ? String(v('car')).trim().toUpperCase() : '', driver: titleCase(txt(v('driver'))), mob: txt(v('mob')) ? String(v('mob')).trim() : '',
        checkout: d('checkout'), updDate: txt(v('updDate')), invRcv: d('invRcv'),
        missDoc: cleanDocValue(v('missDoc')), missRcv: d('missRcv'), updates: txt(v('updates')), status: String(v('status') || '').trim().toLowerCase() === 'delivered' ? 'Delivered' : 'Open',
        fwd: 'ILS', note: txt(v('note')), _file: file, _sheet: name, _row: r + 1, _uploadGroup: groupId
      };
      entry.load = entry.arrDate || entry.reqDate || entry.gateOut || null;
      out.push(entry);
      rawRows.push(row.map(x => x instanceof Date ? (fixDate(x, false) || '') : x == null ? '' : String(x)));
    }
    if (!out.length && !issues.length) issues.push(AR() ? 'لا توجد صفوف شحنات.' : 'No shipment rows found.');
    const groupCounts = new Map();
    out.forEach(x => groupCounts.set(x._uploadGroup, (groupCounts.get(x._uploadGroup) || 0) + 1));
    out.filter(x => x._row === Number(x._uploadGroup.split('|').pop())).forEach(x => {
      const n = Number(x.vol);
      if (Number.isInteger(n) && n !== groupCounts.get(x._uploadGroup))
        issues.push(addr(x._row - 1, 'vol') + ' (CNTR Volume: ' + (AR() ? 'العدد لا يطابق صفوف الشحنة' : 'count does not match shipment rows') + ')');
    });
    if (issues.length) rep.errors.push({ k: 'uploadInvalid', p: { list: issues.length + ' ' + (AR() ? 'خلية إلزامية ناقصة أو غير صحيحة' : 'missing or invalid mandatory cells') + ': ' + issues.join('، ') } });
    rep.rows = rep.errors.length ? 0 : out.length;
    if (!rep.errors.length) rep.infos.push({ k: 'sheetLoaded', p: { dir: dirLabel(dir), sheet: name, n: out.length } });
    return { rows: rep.errors.length ? [] : out, rep, raw: { sheet: name, file, dir, headers, rows: rawRows } };
  }
  function parseSheet(ws, sheetName, fname) { return parseUploadSheet(ws, sheetName, fname); }

  /* ============================ 4. enrich ============================ */
  function normTime(v) {
    if (v === null || v === undefined || v === '') return '';
    if (typeof v === 'number') { const m = Math.round(v * 24 * 60) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
    if (v instanceof Date) return String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
    const str = String(v).trim();
    let m = str.match(/^(\d{1,2})[:.](\d{2})\s*([AaPp][Mm]?)?/);
    let h = 0, mi = 0, ap = '';
    if (m) {
      h = +m[1]; mi = +m[2]; ap = (m[3] || '').toLowerCase();
    } else {
      const mSingle = str.match(/^(\d{1,2})\s*([AaPp][Mm]?)?$/);
      if (mSingle) {
        h = +mSingle[1]; mi = 0; ap = (mSingle[2] || '').toLowerCase();
      } else {
        return '';
      }
    }
    if (ap.startsWith('p') && h < 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
    if (h > 23 || mi > 59) return '';
    return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
  }
  function enrich(rows) {
    const counts = {}; rows.forEach(r => { const k = (r.dir || '') + '|' + ((r.dir === 'Import' ? r.bl : r.booking) || ('#' + r.cntr)); counts[k] = (counts[k] || 0) + 1; });
    const days = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);
    const at = (d, t2) => { if (!d) return null; const hm = normTime(t2); return new Date(`${d}T${hm || '00:00'}:00`); };
    return rows.map(r => {
      const o = { ...r };
      o.status = String(o.status || '').trim().toLowerCase() === 'delivered' ? 'Delivered' : 'Open';
      /* the report has no single "loading date": the activity date is when the container
         actually moved — actual offloading, else the required date, else the gate-out */
      o.load = o.load || o.arrDate || o.reqDate || o.gateOut || null;
      o.freeDays = (o.free && o.load) ? days(o.free, o.load) : null;
      if (o.freeDays !== null && (o.freeDays < -60 || o.freeDays > 90)) o.freeDays = null;
      o.risk = o.freeDays === null ? null : (o.freeDays < 0 ? 'Late' : 'OK');
      o.cutDays = (o.cut && o.load) ? days(o.cut, o.load) : null;
      if (o.cutDays !== null && (o.cutDays < -60 || o.cutDays > 90)) o.cutDays = null;
      /* required vs actual offloading — in hours, so the time of day counts */
      const rq = at(o.reqDate, o.reqTime), ac = at(o.arrDate, o.arrTime), ar = ac, go = at(o.gateOut, o.gateOutT);
      o.gateToArrH = (go && ac) ? Math.round((ac - go) / 36e5) : null;
      if (o.gateToArrH !== null && (o.gateToArrH < 0 || o.gateToArrH > 24 * 30)) o.gateToArrH = null;
      o.offDelayH = (rq && ac) ? Math.round((ac - rq) / 36e5) : null;
      if (o.offDelayH !== null && Math.abs(o.offDelayH) > 24 * 60) o.offDelayH = null;
      o.offDelayD = o.offDelayH === null ? null : +(o.offDelayH / 24).toFixed(2);
      o.offLate = o.offDelayH === null ? null : (o.offDelayH > 0 ? 'Late' : 'On time');
      o.arrDelayH = (rq && ar) ? Math.round((ar - rq) / 36e5) : null;
      if (o.arrDelayH !== null && Math.abs(o.arrDelayH) > 24 * 60) o.arrDelayH = null;
      o.arrOnTime = o.arrDelayH === null ? null : (o.arrDelayH <= 0 ? 'On time' : 'Late');
      o.shipKey = (o.dir === 'Import' ? (o.bl || '') : (o.booking || '')) || ('#' + o.cntr);
      if (!o.vol) o.vol = String(counts[(o.dir || '') + '|' + o.shipKey] || 1);
      if (o.cut && (o.arrDate || o.reqDate)) { o.cutDays = days(o.cut, o.arrDate || o.reqDate); if (o.cutDays < -60 || o.cutDays > 90) o.cutDays = null; }
      return o;
    });
  }

  /* ============================ 5. filters ============================ */
  let freeSel = null, monthSel = null, daySel = null, charts = {}, deliveryFilter = 'All';
  $('deliveryFilter')?.addEventListener('change', e => { deliveryFilter = e.target.value; applyFilters(); });
  const FREE_BUCKETS = [[0, d => d < 0, '#cf4d4d'], [1, d => d === 0, '#e07b3a'], [2, d => d >= 1 && d <= 2, '#dd9a1f'], [3, d => d >= 3 && d <= 5, '#8aa832'], [4, d => d >= 6, '#1f8f63']];
  const bucketLabel = i => t('freeBuckets')[i];
  const SELECTS = [['fDir', 'dir'], ['fClient', 'client'], ['fTrucker', 'trucker'], ['fDest', 'dest'], ['fOper', 'oper'], ['fLine', 'line'], ['fPort', 'port'], ['fRisk', 'risk'], ['fFrom', 'pol']];
  /* '' = Overview · 'Import' · 'Export' */
  const MODE = () => $('fDir')?.value || 'Import';
  /* what belongs to which mode */
  const KPI_MODE = {
    kpiTrips: '*', kpiShip: '*', kpiCont: '*', kpiClients: '*', kpiTruckers: '*', kpiOper: '*', kpiTrucks: '*', kpiDestU: '*', kpiPortU: '*',
    kpiRisk: 'Import', kpiFree: 'Import', kpiOnTime: '*', kpiOffDelay: '*', kpiTransit: '*', kpiCut: 'Export', kpiRoute: 'Export'
  };
  const CHART_MODE = {
    chMonthly: '*', chDaily: '*', chClient: '*', chTrucker: '*', chDest: '*', chOper: '*', chLine: '*', chTruckerClient: '*',
    chDir: 'Overview', chFree: 'Import', chRiskClient: 'Import', chPort: '*', chRoute: 'Export', chStatus: 'Export',
    chOffDelay: '*', chOnTime: '*', chDelayTrucker: '*'
  };
  /* a direction-specific card shows in its own tab, and in Overview only when
     that direction actually has trips — no empty cards, no zero KPIs */
  const inMode = (scope, m) => scope === '*' ? true : scope === 'Overview' ? false : scope === m;
  /* preferred width of every chart (out of 12) — the packer stretches whatever is
     visible so a row is always full, whichever tab you are on */
  const SPAN = {
    chMonthly: 8, chDir: 4, chDaily: 12, chClient: 6, chTrucker: 6, chRiskClient: 7, chFree: 5,
    chPort: 6, chRoute: 6, chDest: 5, chLine: 4, chSize: 3, chOper: 6, chTruckerClient: 6,
    chOffDelay: 7, chOnTime: 5, chDelayTrucker: 12, chStatus: 4
  };
  function packGrid() {
    const grid = root.querySelector('.grid'); if (!grid) return;
    const cards = [...grid.children].filter(c => c.style.display !== 'none');
    cards.forEach(c => { c.style.order = ''; });
    if (innerWidth <= 1200) { cards.forEach(c => c.style.gridColumn = ''); return; }
    const span = el => Math.min(SPAN[el.querySelector('canvas')?.id] || 6, 12);
    const pool = cards.slice();
    let ord = 0, row = [], sum = 0;
    const flush = () => {
      if (!row.length) return;
      let left = 12 - sum;
      if (left > 0) {
        const add = Math.floor(left / row.length); let rem = left - add * row.length;
        row.forEach((it, i) => { it.span += add + (i >= row.length - rem ? 1 : 0); });
      }
      row.forEach(it => { it.el.style.gridColumn = `span ${it.span}`; it.el.style.order = ord++; });
      row = []; sum = 0;
    };
    while (pool.length) {
      const el = pool.shift(), sp = span(el);
      if (sum + sp > 12) flush();
      row.push({ el, span: sp }); sum += sp;
      /* row not full? pull the first later card that fits the gap, so nothing is left stretched alone */
      while (sum < 12 && pool.length) {
        const i = pool.findIndex(c => span(c) <= 12 - sum);
        if (i < 0) break;
        const next = pool.splice(i, 1)[0];
        row.push({ el: next, span: span(next) }); sum += span(next);
      }
      if (sum >= 12) flush();
    }
    flush();
  }
  let _packT; __on(window, 'resize', () => { clearTimeout(_packT); _packT = setTimeout(packGrid, 150); });

  function applyMode() {
    const m = MODE();
    if (typeof buildFields === 'function' && DATA.length) buildFields();
    Object.entries(KPI_MODE).forEach(([id, scope]) => { const el = $(id); if (el) el.style.display = inMode(scope, m) ? '' : 'none'; });
    Object.entries(CHART_MODE).forEach(([id, scope]) => { const c = $(id)?.closest('.card'); if (c) c.style.display = inMode(scope, m) ? '' : 'none'; });
    $('fldRisk').style.display = (m === 'Export') ? 'none' : '';
    $('fldFrom').style.display = (m === 'Import') ? 'none' : '';
    $('fldTo').style.display = 'none';
    if (m === 'Export') { $('fRisk').value = ''; }
    if (m === 'Import') { $('fFrom').value = ''; $('fTo').value = ''; }
    $('hTitle').textContent = AR() ? `لوحة النقل — ${dirLabel(m)}` : `Transport Dashboard — ${dirLabel(m)}`;
    $('hSub').textContent = AR() ? 'متابعة النقلات والشحنات وأداء النقل' : 'Trips, Shipments and Transport Performance';
    packGrid();
  }
  const monthOf = r => { const d = r[$('dateBasis').value]; return d ? d.slice(0, 7) : null; };

  function rowPass(r, skip = '') {
    const basis = $('dateBasis').value;
    if (skip !== 'month') {
      const from = $('dFrom').value, to = $('dTo').value, d = r[basis];
      if (from && (!d || d < from)) return false; if (to && (!d || d > to)) return false;
    }
    if (skip !== 'day' && daySel) { if (r[basis] !== daySel) return false; }
    if (skip !== 'created') { const cf = $('cFrom').value, ct = $('cTo').value, cd = r.created || ''; if (cf && (!cd || cd < cf)) return false; if (ct && (!cd || cd > ct)) return false; }
    for (const [id, key] of SELECTS) { if (skip !== key && $(id).value) { const rv = key === 'port' ? (r.pod || r.port) : r[key]; if (rv !== $(id).value) return false; } }
    if (skip !== 'free' && freeSel !== null) { if (r.freeDays === null || !FREE_BUCKETS[freeSel][1](r.freeDays)) return false; }
    return true;
  }
  const viewExcept = skip => DATA.filter(r => rowPass(r, skip));

  function fillSelect(id, values, labelFn) {
    const sel = $(id); if (!sel) return;
    const keep = sel.value; while (sel.options.length > 1) sel.remove(1);
    values.forEach(v => { const o = document.createElement('option'); o.value = v; o.textContent = labelFn ? labelFn(v) : v; sel.appendChild(o); });
    sel.value = [...sel.options].some(o => o.value === keep) ? keep : '';
  }
  function directionRows() { const m = MODE(); return DATA.filter(r => r.dir === m); }
  function dateBasisOptions() {
    const imp = MODE() === 'Import';
    return [['load', AR() ? 'تاريخ النشاط' : 'Activity date'], ['reqDate', AR() ? (imp ? 'تاريخ التعتيق المطلوب' : 'تاريخ التحميل المطلوب') : (imp ? 'Required offloading date' : 'Required loading date')], ['arrDate', AR() ? 'تاريخ الوصول الفعلي' : 'Actual arrival date'], ['gateOut', AR() ? 'تاريخ الخروج من البوابة' : 'Gate-out date'], [imp ? 'free' : 'cut', AR() ? (imp ? 'نهاية فترة السماح' : 'آخر موعد للتسليم') : (imp ? 'Free-time end' : 'Cut-off date')]];
  }
  function dateBasisLabel() { return dateBasisOptions().find(x => x[0] === $('dateBasis')?.value)?.[1] || ''; }
  function syncDateBasis() {
    const el = $('dateBasis'); if (!el) return;
    const keep = el.value;
    el.innerHTML = dateBasisOptions().map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
    if ([...el.options].some(o => o.value === keep)) el.value = keep;
  }
  function refreshDirectionFilters() {
    const rows = directionRows(), uniq = k => [...new Set(rows.map(r => r[k]).filter(Boolean))].sort();
    for (const [id, key] of SELECTS) {
      if (id === 'fDir') continue;
      const el = $(id);
      if (!el) continue;
      let values = key === 'port' ? [...new Set(rows.map(r => r.pod || r.port).filter(Boolean))].sort() : uniq(key);
      if (key === 'size') values = values.filter(v => !/^45(?:\D|$)/.test(v));
      fillSelect(id, values, key === 'risk' ? riskLabel : undefined);
      el.disabled = values.length === 0;
    }
    if ($('lCreatedFrom')) $('lCreatedFrom').textContent = AR() ? 'إنشاء العملية من' : 'Created from';
    if ($('lCreatedTo')) $('lCreatedTo').textContent = AR() ? 'إنشاء العملية إلى' : 'Created to';
    if ($('fFrom')?.options?.[0]) $('fFrom').options[0].text = AR() ? 'كل موانئ الشحن' : 'All loading ports';
    if ($('fTo')?.options?.[0]) $('fTo').options[0].text = AR() ? 'كل حالات النقل' : 'All transport statuses';
    const W = t('workflow');
    if ($('deliveryFilterLabel')) $('deliveryFilterLabel').textContent = W.deliveryStatus;
    if ($('deliveryFilter')?.options?.length >= 3) {
      $('deliveryFilter').options[0].text = W.allShipments;
      $('deliveryFilter').options[1].text = W.open;
      $('deliveryFilter').options[2].text = W.delivered;
    }
    if ($('lDest')) $('lDest').textContent = AR() ? (MODE() === 'Import' ? 'موقع التعتيق' : 'موقع التحميل') : (MODE() === 'Import' ? 'Offloading site' : 'Loading site');
    syncDateBasis();
  }
  function initFilters() {
    const fDirEl = $('fDir');
    if (fDirEl) {
      fillSelect('fDir', ['Import', 'Export', 'FCL'], dirLabel);
      if (fDirEl.value !== 'FCL' && !DATA.some(r => r.dir === fDirEl.value)) fDirEl.value = DATA.some(r => r.dir === 'Import') ? 'Import' : 'Export';
    }
    refreshDirectionFilters(); syncDirTabs();
  }

  function filterParts() {
    const basis = $('dateBasis')?.value || '', from = $('dFrom')?.value || '', to = $('dTo')?.value || '', parts = [], N = t('fNames');
    if (from || to) parts.push(`${dateBasisLabel()} ${fmtDay(from) || '…'} ← ${fmtDay(to) || '…'}`);
    { const cf = $('cFrom')?.value || '', ct = $('cTo')?.value || ''; if (cf || ct) parts.push(`${AR() ? 'تاريخ إنشاء العملية' : 'Operation created'} ${fmtDay(cf) || '…'} ← ${fmtDay(ct) || '…'}`); }
    const labels = { fDir: dirLabel, fRisk: riskLabel };
    SELECTS.forEach(([id, key]) => { if (id === 'fDir') return; const v = $(id)?.value; if (v) parts.push(`${N[key]}: ${labels[id] ? labels[id](v) : v}`); });
    if (deliveryFilter !== 'All') { const sl = deliveryFilter === 'Open' ? t('workflow').open : t('workflow').delivered; parts.push(AR() ? 'الحالة: ' + sl : 'Delivery: ' + sl); }
    if (freeSel !== null) parts.push(`${N.free}: ${bucketLabel(freeSel)}`);
    if (daySel) parts.push(`${N.day}: ${daySel}`);
    return parts;
  }
  function syncDirTabs() {
    const cur = $('fDir')?.value || 'Import';
    root.querySelectorAll('.dtab').forEach(b => {
      const d = b.dataset.dir; b.classList.toggle('on', d === cur);
      const n = d === 'FCL' ? fclCandidates().length : (d ? DATA.filter(r => r.dir === d).length : DATA.length);
      b.disabled = d === 'FCL' ? false : n === 0; b.setAttribute('aria-disabled', String(b.disabled)); b.title = b.disabled ? (AR() ? 'لا توجد بيانات لهذا الاتجاه' : 'No data for this direction') : '';
      const cntEl = b.querySelector('.cnt'); if (cntEl) cntEl.textContent = fmtN(n);
      const lblEl = b.querySelector('.lbl'); if (lblEl) lblEl.textContent = d === 'FCL' ? 'FCL' : d ? dirLabel(d) : t('overview');
    });
  }
  root.querySelectorAll('.dtab').forEach(b => b.addEventListener('click', () => {
    if (b.disabled) return;
    const fDirEl = $('fDir');
    if (fDirEl) fDirEl.value = b.dataset.dir;
    resetFilters();
  }));

  function fclCandidates() {
    const imported = DATA.filter(r => r.dir === 'Import' && String(r.cntr || '').trim() && !/^\(/.test(r.cntr) && r.arrDate && r.arrTime && r.size && r.line && r.pod);
    const exports = DATA.filter(r => r.dir === 'Export' && r.reqDate && r.reqTime && r.size && r.line && r.pol);
    const norm = v => String(v || '').trim().toLocaleUpperCase().replace(/\s+/g, ' ');
    const when = (day, time) => new Date(`${day}T${normTime(time)}:00`).getTime();
    const index = new Map();
    for (const ex of exports) {
      const key = [norm(ex.size), norm(ex.line), norm(ex.pol)].join('|'), departure = when(ex.reqDate, ex.reqTime);
      if (!Number.isFinite(departure)) continue;
      if (!index.has(key)) index.set(key, []); index.get(key).push({ ex, departure });
    }
    for (const group of index.values()) group.sort((a, b) => a.departure - b.departure);
    const matches = []; const seen = new Set();
    for (const im of imported) {
      const arrival = when(im.arrDate, im.arrTime), group = index.get([norm(im.size), norm(im.line), norm(im.pod)].join('|')) || [];
      if (!Number.isFinite(arrival)) continue;
      let low = 0, high = group.length;
      while (low < high) { const mid = (low + high) >> 1; if (group[mid].departure < arrival) low = mid + 1; else high = mid; }
      for (let j = low; j < group.length && group[j].departure - arrival <= 864e5; j++) {
        const { ex, departure } = group[j], hours = (departure - arrival) / 36e5;
        if (ex.cntr && norm(ex.cntr) !== norm(im.cntr)) continue;
        const key = [im._ref || im.shipNo || im.bl, im.cntr, ex._ref || ex.shipNo || ex.booking].join('|'); if (seen.has(key)) continue; seen.add(key);
        matches.push({ im, ex, hours });
      }
    }
    return matches.sort((a, b) => a.hours - b.hours);
  }
  function renderFCL() {
    const W = t('workflow'), all = fclCandidates(), line = $('fclLine'), size = $('fclSize'), port = $('fclPort');
    const fill = (el, items, label) => { const v = el.value; el.innerHTML = `<option value="">${label}</option>` + [...new Set(items)].sort().map(x => `<option value="${esc(x)}">${esc(x)}</option>`).join(''); el.value = v; };
    fill(line, all.map(m => m.im.line), W.fclAllLines); fill(size, all.map(m => m.im.size), W.fclAllTypes); fill(port, all.map(m => m.im.pod), W.fclAllPorts);
    $('fclLineLabel').firstChild.textContent = W.fclLine;
    $('fclSizeLabel').firstChild.textContent = W.fclSize;
    $('fclPortLabel').firstChild.textContent = W.fclPort;
    $('fclWindowLabel').firstChild.textContent = W.fclWindow;
    [...$('fclHours').options].forEach(o => o.textContent = W.fclHours(o.value));
    $('fclPanel').querySelector('h2').textContent = W.fclTitle;
    $('fclExplanation').textContent = W.fclIntro;
    const filtered = all.filter(m => (!line.value || m.im.line === line.value) && (!size.value || m.im.size === size.value) && (!port.value || m.im.pod === port.value) && m.hours <= Number($('fclHours').value));
    const expCount = new Set(filtered.map(m => m.ex._ref || m.ex.shipNo || m.ex.booking));
    $('fclMetrics').innerHTML = `<div><strong>${filtered.length}</strong><span>${W.fclOptions}</span></div><div><strong>${new Set(filtered.map(m => m.im.cntr)).size}</strong><span>${W.fclContainers}</span></div><div><strong>${expCount.size}</strong><span>${W.fclExports}</span></div><div><strong>${filtered.filter(m => m.hours <= 6).length}</strong><span>${W.fclSixHours}</span></div>`;
    $('fclCards').innerHTML = filtered.length ? filtered.slice(0, 100).map(({ im, ex, hours }) => `<article class="fcl-card"><div class="fcl-card-head"><strong>${esc(im.cntr)}</strong><span>${hours.toFixed(1)} ${W.fclHours('')} · ${esc(im.size)} · ${esc(im.line)}</span></div><div class="fcl-pair"><div><small>${W.fclActual}</small><b>${esc(im.shipNo || im.bl || im._ref || '—')}</b><span>${esc(fmtDay(im.arrDate))} ${esc(im.arrTime)} · POD ${esc(im.pod)}</span></div><span class="fcl-arrow">→</span><div><small>${W.fclRequired}</small><b>${esc(ex.shipNo || ex.booking || ex._ref || '—')}</b><span>${esc(fmtDay(ex.reqDate))} ${esc(ex.reqTime)} · POL ${esc(ex.pol)}</span></div></div><div class="fcl-meter"><i style="width:${Math.max(5, 100 - hours / 24 * 100)}%"></i></div><p>${W.fclCandidate}</p></article>`).join('') : (`<div class="fcl-empty">${W.fclEmpty}</div>`);
  }
  ['fclLine', 'fclSize', 'fclPort', 'fclHours'].forEach(id => $(id).addEventListener('change', renderFCL));

  function applyFilters() {
    refreshDirectionFilters();
    const dFromVal = $('dFrom')?.value, dToVal = $('dTo')?.value;
    const invalid = dFromVal && dToVal && dFromVal > dToVal;
    if ($('dTo')) $('dTo').setCustomValidity(invalid ? (AR() ? 'تاريخ النهاية قبل البداية' : 'End date must be on or after start date') : '');
    if (invalid) { $('dTo')?.reportValidity(); return; }
    if (MODE() === 'FCL') { root.classList.add('fcl-mode'); if ($('fclPanel')) $('fclPanel').hidden = false; syncDirTabs(); renderFCL(); if ($('hTitle')) $('hTitle').textContent = t('workflow').fclTitle; if ($('hSub')) $('hSub').textContent = t('workflow').fclSubtitle; return; }
    root.classList.remove('fcl-mode'); if ($('fclPanel')) $('fclPanel').hidden = true;
    VIEW = DATA.filter(r => rowPass(r) && (deliveryFilter === 'All' || (r.status || 'Open') === deliveryFilter));
    syncDirTabs(); applyMode(); updateTag();
    const parts = filterParts();
    if ($('activeNote')) $('activeNote').textContent = parts.length ? `${t('filteredBy')} ${parts.join(' · ')} ${t('clickAgain')}` : t('tip');
    render();
  }
  function resetFilters() {
    const dir = MODE();
    SELECTS.forEach(([id]) => { const el = $(id); if (el) el.value = ''; });
    const fDirEl = $('fDir');
    if (fDirEl) fDirEl.value = dir === 'FCL' ? 'FCL' : DATA.some(r => r.dir === dir) ? dir : (DATA.some(r => r.dir === 'Import') ? 'Import' : 'Export');
    if ($('dateBasis')) $('dateBasis').value = 'load';
    deliveryFilter = 'All';
    if ($('deliveryFilter')) $('deliveryFilter').value = 'All';
    if ($('dFrom')) $('dFrom').value = '';
    if ($('dTo')) $('dTo').value = '';
    if ($('cFrom')) $('cFrom').value = '';
    if ($('cTo')) $('cTo').value = '';
    freeSel = null; monthSel = null; daySel = null;
    root.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.preset === 'all'));
    applyFilters();
  }
  function applyPreset(days) {
    const basis = $('dateBasis')?.value;
    if (!basis) return;
    const maxd = directionRows().reduce((m, r) => r[basis] && r[basis] > m ? r[basis] : m, '0');
    const end = maxd > '0' ? new Date(maxd) : new Date(); const start = new Date(end); start.setDate(start.getDate() - days);
    if ($('dFrom')) $('dFrom').value = start.toISOString().slice(0, 10);
    if ($('dTo')) $('dTo').value = end.toISOString().slice(0, 10);
  }
  root.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    root.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); c.classList.add('on'); monthSel = null;
    if (c.dataset.preset === 'all') { if ($('dFrom')) $('dFrom').value = ''; if ($('dTo')) $('dTo').value = ''; } else applyPreset(+c.dataset.preset);
    applyFilters();
  }));
  ['dFrom', 'dTo'].forEach(id => $(id)?.addEventListener('change', () => { monthSel = null; root.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); applyFilters(); }));
  ['cFrom', 'cTo'].forEach(id => $(id)?.addEventListener('change', () => { const invalid = $('cFrom')?.value && $('cTo')?.value && $('cFrom').value > $('cTo').value; if ($('cTo')) $('cTo').setCustomValidity(invalid ? (AR() ? 'تاريخ النهاية قبل البداية' : 'End date must be on or after start date') : ''); if (invalid) { $('cTo')?.reportValidity(); return; } applyFilters(); }));
  SELECTS.forEach(([id]) => $(id)?.addEventListener('change', applyFilters));
  $('dateBasis')?.addEventListener('change', () => {
    monthSel = null; daySel = null;
    const a = root.querySelector('.chip.on'); if (a && a.dataset.preset !== 'all') applyPreset(+a.dataset.preset); applyFilters();
  });
  function toggleSelect(id, val) { $(id).value = ($(id).value === val) ? '' : val; setTimeout(applyFilters, 0); }
  function setDayFilter(d) {
    daySel = (daySel === d) ? null : d;
    setTimeout(applyFilters, 0);
  }
  function setMonthFilter(m) {
    daySel = null;
    if (monthSel === m) { monthSel = null; $('dFrom').value = ''; $('dTo').value = ''; }
    else { monthSel = m; const [y, mo] = m.split('-').map(Number); $('dFrom').value = `${m}-01`; $('dTo').value = new Date(y, mo, 0).toISOString().slice(0, 10); }
    root.querySelectorAll('.chip').forEach(x => x.classList.remove('on')); setTimeout(applyFilters, 0);
  }

  /* ============================ 6. render ============================ */
  Chart.defaults.font.family = 'Inter'; Chart.defaults.font.size = 11.5; Chart.defaults.animation.duration = 260;
  const gridColor = () => root.getAttribute('data-theme') === 'dark' ? '#2b333d' : '#e9ecef';
  const gridOpts = () => ({ grid: { color: gridColor() }, border: { display: false } });
  const noGrid = { grid: { display: false }, border: { display: false } };
  const dim = (hex, on) => on ? hex : hex + '33';
  const PAL = ['#0b4f7a', '#0e7c86', '#22b8cf', '#5ed0e3', '#8fd9e6', '#66788c', '#d8a84a', '#2a6f97', '#61a5c2', '#9aa6b4'];
  const cardBg = () => getComputedStyle(root).getPropertyValue('--card').trim() || '#fff';
  function bandIndex(e, chart) { const axis = chart.options.indexAxis === 'y' ? 'y' : 'x'; const p = chart.getElementsAtEventForMode(e, 'index', { intersect: false, axis }, true); return p.length ? p[0].index : null; }
  function ringIndex(e, chart) {
    const arcs = chart.getDatasetMeta(0).data; if (!arcs.length) return null;
    const pos = Chart.helpers.getRelativePosition(e, chart), a0 = arcs[0], dx = pos.x - a0.x, dy = pos.y - a0.y, dist = Math.hypot(dx, dy);
    const onRing = dist >= a0.innerRadius - 14 && dist <= a0.outerRadius + 14;
    let ang = Math.atan2(dy, dx); if (ang < -Math.PI / 2) ang += Math.PI * 2;
    if (onRing) {
      for (let i = 0; i < arcs.length; i++) {
        const w = arcs[i].endAngle - arcs[i].startAngle;
        if (w < 0.05 && Math.abs(ang - (arcs[i].startAngle + w / 2)) < 0.035) return i;
      }
    }
    const els = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true); if (els.length) return els[0].index;
    if (!onRing) return null;
    for (let i = 0; i < arcs.length; i++) if (ang >= arcs[i].startAngle && ang <= arcs[i].endAngle) return i; return null;
  }
  const clickable = { onHover: (e, els, ch) => { e.native.target.style.cursor = bandIndex(e, ch) !== null ? 'pointer' : 'default'; } };
  const arcClickable = { onHover: (e, els, ch) => { e.native.target.style.cursor = ringIndex(e, ch) !== null ? 'pointer' : 'default'; } };
  function mkChart(id, cfg) { if (charts[id]) charts[id].destroy(); charts[id] = new Chart($(id), cfg); }
  const setSub = (id, s) => { $(id).closest('.card').querySelector('.sub').textContent = s; };
  const mLabel = m => new Date(m + '-01').toLocaleString(monthLocale(), { month: 'short', year: '2-digit' });
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;

  function setVal(id, text) {
    const el = $(id), m = String(text).match(/^([\d,]+(?:\.\d+)?)(.*)$/); if (!m) { el.textContent = text; return; }
    const target = parseFloat(m[1].replace(/,/g, '')), suf = m[2], dec = (m[1].split('.')[1] || '').length, comma = m[1].includes(','), t0 = performance.now();
    (function f(now) {
      const p = Math.min(1, (now - t0) / 550), e = 1 - Math.pow(1 - p, 3), v = target * e;
      el.textContent = (comma ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec)) + suf; if (p < 1) requestAnimationFrame(f);
    })(t0);
  }
  function renderSpark(id, series) {
    const el = $(id); if (!el) return; el.innerHTML = ''; const mx = Math.max(...series, 1);
    series.slice(-12).forEach(v => { const i = document.createElement('i'); i.style.height = Math.max(4, Math.round(19 * v / mx)) + 'px'; el.appendChild(i); });
  }

  function renderKPIs() {
    const n = VIEW.length;
    const imp = VIEW.filter(r => r.dir === 'Import').length, exp = n - imp;
    /* shipments (one B/L) vs trips (one container) */
    const ships = new Set(VIEW.map(r => r.shipKey)).size;
    setVal('kShip', fmtN(ships)); $('kShipSub').textContent = t('kShipSub')(ships ? (n / ships).toFixed(1) : '0');
    /* required vs actual offloading */
    const od = VIEW.filter(r => r.offDelayH !== null);
    if (!od.length) { $('kOffDelay').textContent = '–'; $('kOffDelaySub').textContent = t('kOffDelayNone'); }
    else {
      const late = od.filter(r => r.offDelayH > 0);
      setVal('kOffDelay', (avg(od.map(r => r.offDelayH)) / 24).toFixed(1) + ' ' + t('days'));
      $('kOffDelaySub').textContent = t('kOffDelaySub')(fmtN(late.length), fmtN(od.length), Math.round(100 * late.length / od.length));
    }
    const ar = VIEW.filter(r => r.arrOnTime !== null);
    if (!ar.length) { $('kOnTime').textContent = '–'; $('kOnTimeSub').textContent = t('kOnTimeNone'); }
    else {
      const ok = ar.filter(r => r.arrOnTime === 'On time').length;
      setVal('kOnTime', Math.round(100 * ok / ar.length) + '%'); $('kOnTimeSub').textContent = t('kOnTimeSub')(fmtN(ok), fmtN(ar.length));
    }
    /* unique destinations / ports with a useful share */
    const dc = {}; VIEW.forEach(r => { if (r.dest) dc[r.dest] = (dc[r.dest] || 0) + 1; });
    const dtop = Object.entries(dc).sort((a, b) => b[1] - a[1])[0];
    setVal('kDestU', fmtN(Object.keys(dc).length));
    $('kDestUSub').textContent = dtop ? t('kDestUSub')(dtop[0], Math.round(100 * dtop[1] / n)) : '';
    const pc = {}; VIEW.forEach(r => { const p = r.pod || r.port; if (p) pc[p] = (pc[p] || 0) + 1; });
    const ptop = Object.entries(pc).sort((a, b) => b[1] - a[1])[0];
    setVal('kPortU', fmtN(Object.keys(pc).length));
    $('kPortUSub').textContent = ptop ? t('kPortUSub')(ptop[0], Math.round(100 * ptop[1] / n)) : '';
    setVal('kTrips', fmtN(n)); $('kTripsSub').textContent = AR() ? `${fmtN(n)} نقلة ${dirLabel(MODE())}` : `${fmtN(n)} ${dirLabel(MODE()).toLowerCase()} trips`;
    const c20 = VIEW.filter(r => r.size === "20'").length, c40 = VIEW.filter(r => r.size === "40'").length, lcl = VIEW.filter(r => r.size === 'LCL').length;
    setVal('kCont', fmtN(c20 + c40 + lcl)); $('kContSub').textContent = t('kContSub')(fmtN(c20), fmtN(c40), lcl ? fmtN(lcl) : 0);
    const clients = new Set(VIEW.map(r => r.client).filter(Boolean)).size, sites = new Set(VIEW.map(r => r.dest).filter(Boolean)).size;
    setVal('kClients', fmtN(clients)); $('kClientsSub').textContent = t('kClientsSub')(fmtN(sites));
    const byT = {}; VIEW.forEach(r => { if (r.trucker) byT[r.trucker] = (byT[r.trucker] || 0) + 1; });
    const ts = Object.entries(byT).sort((a, b) => b[1] - a[1]);
    const top3 = ts.slice(0, 3).reduce((s, x) => s + x[1], 0), tot = ts.reduce((s, x) => s + x[1], 0);
    setVal('kTruckers', fmtN(ts.length)); $('kTruckersSub').textContent = t('kTruckersSub')(tot ? Math.round(100 * top3 / tot) : 0);
    const known = VIEW.filter(r => r.risk !== null), late = known.filter(r => r.risk === 'Late');
    if (!known.length) { $('kRisk').textContent = '–'; $('kRiskSub').textContent = t('kRiskSub')(0, 0); }
    else { setVal('kRisk', Math.round(100 * late.length / known.length) + '%'); $('kRiskSub').textContent = t('kRiskSub')(fmtN(late.length), fmtN(known.length)); }
    const fd = VIEW.filter(r => r.freeDays !== null).map(r => r.freeDays);
    if (!fd.length) $('kFree').textContent = '–'; else setVal('kFree', avg(fd).toFixed(1) + ' ' + t('days'));
    $('kFreeSub').textContent = t('kFreeSub');
    const byO = {}; VIEW.forEach(r => { if (r.oper) byO[r.oper] = (byO[r.oper] || 0) + 1; });
    const os = Object.entries(byO).sort((a, b) => b[1] - a[1]);
    setVal('kOper', fmtN(os.length)); $('kOperSub').textContent = t('kOperSub')(os.length ? Math.round(100 * os[0][1] / n) : 0);
    const cars = new Set(VIEW.map(r => r.car).filter(Boolean)).size;
    setVal('kTrucks', fmtN(cars)); $('kTrucksSub').textContent = t('kTrucksSub')(cars ? (n / cars).toFixed(1) : '0');
    /* export-only: buffer between loading and the line's cut-off */
    const cb = VIEW.filter(r => r.cutDays !== null && r.cutDays !== undefined).map(r => r.cutDays).filter(d => d >= -30 && d <= 60);
    if (!cb.length) { $('kCut').textContent = '–'; $('kCutSub').textContent = t('kCutSubNone'); }
    else { setVal('kCut', avg(cb).toFixed(1) + ' ' + t('days')); $('kCutSub').textContent = t('kCutSub')(fmtN(cb.filter(d => d < 0).length), fmtN(cb.length)); }
    const tr = VIEW.filter(r => r.gateToArrH !== null).map(r => r.gateToArrH);
    if (!tr.length) { $('kTransit').textContent = '–'; $('kTransitSub').textContent = t('kTransitNone'); }
    else { setVal('kTransit', (avg(tr)).toFixed(1) + ' ' + t('hrs')); $('kTransitSub').textContent = t('kTransitSub')(fmtN(tr.length)); }
    const routes = new Set(VIEW.filter(r => r.dir === 'Export' && (r.pol || r.pod || r.from || r.to)).map(r => `${r.pol || r.from || '?'}→${r.pod || r.to || '?'}`));
    setVal('kRoute', fmtN(routes.size)); $('kRouteSub').textContent = t('kRouteSub')(fmtN(new Set(VIEW.filter(r => r.dir === 'Export').map(r => r.pod || r.to).filter(Boolean)).size));
    const sm = {}; VIEW.forEach(r => { const m = monthOf(r); if (!m) return; sm[m] = (sm[m] || 0) + 1; });
    const dm = {}; VIEW.forEach(r => { if (r.load) dm[r.load] = (dm[r.load] || 0) + 1; });
    const ks = Object.keys(sm).sort(), ds = Object.keys(dm).sort();
    renderSpark('sTrips', ks.length > 1 ? ks.map(k => sm[k]) : ds.map(k => dm[k]));
    renderSpark('sCont', ds.map(k => dm[k]));
  }

  function renderCharts() {
    const basisLbl = dateBasisLabel(), C = { ...t('charts') };
    const imp = MODE() === 'Import';
    C.chDest = AR() ? [imp ? 'مواقع التعتيق' : 'مواقع التحميل', imp ? 'مواقع تسليم الحاويات' : 'مواقع تحميل الحاويات'] : [imp ? 'Offloading sites' : 'Loading sites', imp ? 'Container delivery locations' : 'Container loading locations'];
    C.chOffDelay = AR() ? ['الوصول المطلوب والفعلي', imp ? 'الوصول الفعلي مقارنة بموعد التعتيق المطلوب' : 'الوصول الفعلي مقارنة بموعد التحميل المطلوب'] : ['Required vs actual arrival', imp ? 'Actual arrival against required offloading date and time' : 'Actual arrival against required loading date and time'];
    C.chPort = AR() ? ['موانئ الوصول', 'توزيع النقلات حسب ميناء الوصول'] : ['Destination ports (POD)', 'Trips by destination port'];
    C.chDaily = AR() ? ['النقلات اليومية', `حسب ${basisLbl} — اضغط لتصفية اليوم`] : ['Daily trips', `By ${basisLbl} — click a point to filter`];
    Object.keys(C).forEach(id => {
      const [title, sub] = C[id];
      root.querySelector(`h3[data-c="${id}"]`).textContent = title; if (typeof sub === 'string') setSub(id, sub);
    });
    const vMonth = viewExcept('month');

    /* trips by month */
    const byM = {}; vMonth.forEach(r => { const m = monthOf(r); if (!m) return; byM[m] = (byM[m] || 0) + 1; });
    const months = Object.keys(byM).sort(); setSub('chMonthly', C.chMonthly[1](basisLbl));
    mkChart('chMonthly', {
      type: 'bar', data: {
        labels: months.map(mLabel), datasets: [{
          label: t('dsTrips'), data: months.map(m => byM[m]),
          backgroundColor: months.map(m => dim('#0b4f7a', monthSel === null || monthSel === m)), borderRadius: 5, maxBarThickness: 44
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) setMonthFilter(months[i]); },
        plugins: { legend: { display: false } }, scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    /* daily pattern */
    const vDay = viewExcept('day'), byD = {}; vDay.forEach(r => { const d = r[$('dateBasis').value]; if (d) byD[d] = (byD[d] || 0) + 1; });
    const days = Object.keys(byD).sort();
    setSub('chDaily', C.chDaily[1]);
    mkChart('chDaily', {
      type: 'line', data: {
        labels: days.map(d => d.slice(5)), datasets: [{
          label: t('dsTrips'), data: days.map(d => byD[d]),
          borderColor: '#0e7c86', backgroundColor: '#22b8cf33', fill: true, tension: .3,
          pointRadius: days.map(d => daySel === d ? 6 : 3), pointHoverRadius: 7,
          pointBackgroundColor: days.map(d => daySel && daySel !== d ? '#0e7c8655' : '#0e7c86'),
          pointBorderColor: days.map(d => daySel === d ? '#0b4f7a' : '#0e7c86'), pointBorderWidth: days.map(d => daySel === d ? 2 : 1)
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable,
        onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) setDayFilter(days[i]); },
        plugins: { legend: { display: false }, tooltip: { callbacks: { title: it => days[it[0].dataIndex] } } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    /* direction doughnut */
    const vDir = viewExcept('dir'), dk = ['Import', 'Export'], dSel = $('fDir').value;
    mkChart('chDir', {
      type: 'doughnut', data: {
        labels: dk.map(dirLabel), datasets: [{
          data: dk.map(k => vDir.filter(r => r.dir === k).length),
          backgroundColor: dk.map((k, i) => dim(['#0b4f7a', '#22b8cf'][i], !dSel || dSel === k)), borderWidth: 2, borderColor: cardBg()
        }]
      },
      options: {
        maintainAspectRatio: false, cutout: '62%', ...arcClickable, onClick: (e, els, ch) => { const i = ringIndex(e, ch); if (i !== null) toggleSelect('fDir', dk[i]); },
        plugins: { legend: { position: 'bottom', onClick: (e, it) => toggleSelect('fDir', dk[it.index]) } }
      }
    });

    /* clients */
    const vCl = viewExcept('client'), byC = {}; vCl.forEach(r => { if (r.client) byC[r.client] = (byC[r.client] || 0) + 1; });
    const cs = Object.entries(byC).sort((a, b) => b[1] - a[1]).slice(0, 10), clSel = $('fClient').value, cTot = cs.reduce((s, x) => s + x[1], 0) || 1;
    mkChart('chClient', {
      type: 'bar', data: {
        labels: cs.map(c => c[0]), datasets: [{
          data: cs.map(c => c[1]),
          backgroundColor: cs.map((c, i) => dim(PAL[i % PAL.length], !clSel || clSel === c[0])), borderRadius: 5, maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fClient', cs[i][0]); },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} ${t('axTrips').toLowerCase()} (${Math.round(100 * c.raw / cTot)}%)` } } },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    /* truckers */
    const vTr = viewExcept('trucker'), byT = {}; vTr.forEach(r => { if (r.trucker) byT[r.trucker] = (byT[r.trucker] || 0) + 1; });
    const trs = Object.entries(byT).sort((a, b) => b[1] - a[1]), trSel = $('fTrucker').value, tTot = trs.reduce((s, x) => s + x[1], 0) || 1;
    mkChart('chTrucker', {
      type: 'bar', data: {
        labels: trs.map(x => x[0]), datasets: [{
          data: trs.map(x => x[1]),
          backgroundColor: trs.map((x, i) => dim(i < 3 ? '#0e7c86' : '#66788c', !trSel || trSel === x[0])), borderRadius: 5, maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fTrucker', trs[i][0]); },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} ${t('axTrips').toLowerCase()} (${Math.round(100 * c.raw / tTot)}%)` } } },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    /* destinations */
    const vDe = viewExcept('dest'), byDe = {}; vDe.forEach(r => { if (r.dest) byDe[r.dest] = (byDe[r.dest] || 0) + 1; });
    const des = Object.entries(byDe).sort((a, b) => b[1] - a[1]).slice(0, 10), deSel = $('fDest').value;
    mkChart('chDest', {
      type: 'bar', data: {
        labels: des.map(d => d[0]), datasets: [{
          data: des.map(d => d[1]),
          backgroundColor: des.map(d => dim('#22b8cf', !deSel || deSel === d[0])), borderRadius: 5, maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fDest', des[i][0]); },
        plugins: { legend: { display: false } }, scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    /* operations workload */
    const vOp = viewExcept('oper'), byO = {}; vOp.forEach(r => { if (r.oper) byO[r.oper] = (byO[r.oper] || 0) + 1; });
    const os = Object.entries(byO).sort((a, b) => b[1] - a[1]), oSel = $('fOper').value;
    mkChart('chOper', {
      type: 'bar', data: {
        labels: os.map(o => o[0]), datasets: [{
          data: os.map(o => o[1]),
          backgroundColor: os.map(o => dim('#0b4f7a', !oSel || oSel === o[0])), borderRadius: 5, maxBarThickness: 34
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fOper', os[i][0]); },
        plugins: { legend: { display: false } }, scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    /* shipping lines */
    const vLn = viewExcept('line'), byL = {}; vLn.forEach(r => { if (r.line) byL[r.line] = (byL[r.line] || 0) + 1; });
    const ls = Object.entries(byL).sort((a, b) => b[1] - a[1]).slice(0, 8), lSel = $('fLine').value;
    mkChart('chLine', {
      type: 'bar', data: {
        labels: ls.map(l => l[0]), datasets: [{
          data: ls.map(l => l[1]),
          backgroundColor: ls.map(l => dim('#66788c', !lSel || lSel === l[0])), borderRadius: 5, maxBarThickness: 20
        }]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fLine', ls[i][0]); },
        plugins: { legend: { display: false } }, scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    /* free-time usage buckets */
    const fd = viewExcept('free').filter(r => r.freeDays !== null).map(r => r.freeDays);
    mkChart('chFree', {
      type: 'bar', data: {
        labels: FREE_BUCKETS.map(b => bucketLabel(b[0])), datasets: [{
          data: FREE_BUCKETS.map(b => fd.filter(b[1]).length),
          backgroundColor: FREE_BUCKETS.map((b, i) => dim(b[2], freeSel === null || freeSel === i)), borderRadius: 5, maxBarThickness: 48
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) { freeSel = (freeSel === i) ? null : i; setTimeout(applyFilters, 0); } },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw} (${fd.length ? Math.round(100 * c.raw / fd.length) : 0}%)` } } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    /* demurrage risk by client */
    const byR = {}; vCl.forEach(r => { if (!r.client || r.risk === null) return; byR[r.client] = byR[r.client] || { n: 0, late: 0 }; byR[r.client].n++; if (r.risk === 'Late') byR[r.client].late++; });
    const rs = Object.entries(byR).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, 100 * v.late / v.n, v.n, v.late]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    mkChart('chRiskClient', {
      type: 'bar', data: {
        labels: rs.map(x => x[0]), datasets: [{
          data: rs.map(x => +x[1].toFixed(1)),
          backgroundColor: rs.map(x => dim(x[1] >= 30 ? '#cf4d4d' : x[1] >= 10 ? '#dd9a1f' : '#1f8f63', !clSel || clSel === x[0])), borderRadius: 5, maxBarThickness: 26
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fClient', rs[i][0]); },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw}% · ${rs[c.dataIndex][3]}/${rs[c.dataIndex][2]}` } } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axPct') }, max: 100 }, x: noGrid }
      }
    });

    /* ports (import) */
    const vPo = viewExcept('port'), byPo = {}; vPo.forEach(r => { const p = r.pod || r.port; if (p) byPo[p] = (byPo[p] || 0) + 1; });
    const pos = Object.entries(byPo).sort((a, b) => b[1] - a[1]).slice(0, 8), poSel = $('fPort').value;
    mkChart('chPort', {
      type: 'bar', data: {
        labels: pos.map(p => p[0]), datasets: [{
          data: pos.map(p => p[1]),
          backgroundColor: pos.map(p => dim('#66788c', !poSel || poSel === p[0])), borderRadius: 5, maxBarThickness: 26
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fPort', pos[i][0]); },
        plugins: { legend: { display: false } }, scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    /* routes FROM → TO (export) */
    const byRt = {}; VIEW.forEach(r => { if (r.dir !== 'Export') return; const a = r.pol || r.from, b2 = r.pod || r.to; if (!a && !b2) return; const k = `${a || '?'} → ${b2 || '?'}`; byRt[k] = (byRt[k] || 0) + 1; });
    const rts = Object.entries(byRt).sort((a, b) => b[1] - a[1]).slice(0, 10);
    mkChart('chRoute', {
      type: 'bar', data: {
        labels: rts.map(x => x[0]), datasets: [{
          data: rts.map(x => x[1]),
          backgroundColor: '#22b8cf', borderRadius: 5, maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    /* required vs actual offloading — distribution */
    const OFF_BUCKETS = [['early', h2 => h2 <= -6, '#1f8f63'], ['onTime', h2 => h2 > -6 && h2 <= 0, '#54b083'], ['h6', h2 => h2 > 0 && h2 <= 6, '#dd9a1f'], ['h24', h2 => h2 > 6 && h2 <= 24, '#e07b3a'], ['d1', h2 => h2 > 24, '#cf4d4d']];
    const odv = VIEW.filter(r => r.offDelayH !== null).map(r => r.offDelayH);
    mkChart('chOffDelay', {
      type: 'bar', data: {
        labels: t('offBuckets'), datasets: [{
          data: OFF_BUCKETS.map(b => odv.filter(b[1]).length),
          backgroundColor: OFF_BUCKETS.map(b => b[2]), borderRadius: 5, maxBarThickness: 48
        }]
      },
      options: {
        maintainAspectRatio: false, plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw} (${odv.length ? Math.round(100 * c.raw / odv.length) : 0}%)` } }
        },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    /* arrived on time vs late (actual arriving vs required offloading) */
    const arv = VIEW.filter(r => r.arrOnTime !== null);
    const okN = arv.filter(r => r.arrOnTime === 'On time').length;
    mkChart('chOnTime', {
      type: 'doughnut', data: {
        labels: [t('onTimeL'), t('lateL')], datasets: [{
          data: [okN, arv.length - okN],
          backgroundColor: ['#1f8f63', '#cf4d4d'], borderWidth: 2, borderColor: cardBg()
        }]
      },
      options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' } } }
    });

    /* delay share per trucker */
    const byTD = {}; vTr.forEach(r => { if (!r.trucker || r.offDelayH === null) return; byTD[r.trucker] = byTD[r.trucker] || { n: 0, l: 0 }; byTD[r.trucker].n++; if (r.offDelayH > 0) byTD[r.trucker].l++; });
    const tds = Object.entries(byTD).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, 100 * v.l / v.n, v.n, v.l]).sort((a, b) => b[1] - a[1]);
    mkChart('chDelayTrucker', {
      type: 'bar', data: {
        labels: tds.map(x => x[0]), datasets: [{
          data: tds.map(x => +x[1].toFixed(1)),
          backgroundColor: tds.map(x => dim(x[1] >= 30 ? '#cf4d4d' : x[1] >= 10 ? '#dd9a1f' : '#1f8f63', !trSel || trSel === x[0])), borderRadius: 5, maxBarThickness: 34
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fTrucker', tds[i][0]); },
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => `${c.raw}% · ${tds[c.dataIndex][3]}/${tds[c.dataIndex][2]} ${t('axTrips').toLowerCase()}` } } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axPct') }, max: 100 }, x: noGrid }
      }
    });

    /* export status */
    const bySt = {}; VIEW.forEach(r => { if (r.dir === "Export" && r.status) bySt[r.status] = (bySt[r.status] || 0) + 1; });
    const sts = Object.entries(bySt).sort((a, b) => b[1] - a[1]);
    mkChart('chStatus', {
      type: 'doughnut', data: { labels: sts.map(x => x[0]), datasets: [{ data: sts.map(x => x[1]), backgroundColor: sts.map((x, i) => PAL[i % PAL.length]), borderWidth: 2, borderColor: cardBg() }] },
      options: { maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' } } }
    });

    /* trucker coverage: distinct clients per trucker */
    const cov = {}; vTr.forEach(r => { if (!r.trucker) return; cov[r.trucker] = cov[r.trucker] || new Set(); if (r.client) cov[r.trucker].add(r.client); });
    const cvs = Object.entries(cov).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    mkChart('chTruckerClient', {
      type: 'bar', data: {
        labels: cvs.map(x => x[0]), datasets: [{
          data: cvs.map(x => x[1]),
          backgroundColor: cvs.map(x => dim('#0e7c86', !trSel || trSel === x[0])), borderRadius: 5, maxBarThickness: 26
        }]
      },
      options: {
        maintainAspectRatio: false, ...clickable, onClick: (e, els, ch) => { const i = bandIndex(e, ch); if (i !== null) toggleSelect('fTrucker', cvs[i][0]); },
        plugins: { legend: { display: false } }, scales: { y: { ...gridOpts(), title: { display: true, text: t('axClients') } }, x: noGrid }
      }
    });
  }

  function renderInsights() {
    const ul = $('insightList'); ul.innerHTML = ''; const I = t('ins'); const m = MODE();
    const add = s => { const li = document.createElement('li'); li.innerHTML = s; ul.appendChild(li); };
    root.querySelector('#insCard h3').textContent = m === 'Overview' ? t('insH') : t('insHMode')(dirLabel(m));
    if (!VIEW.length) { add(I.none); return; }
    const n = VIEW.length;
    const byC = {}; VIEW.forEach(r => { if (r.client) byC[r.client] = (byC[r.client] || 0) + 1; });
    const cs = Object.entries(byC).sort((a, b) => b[1] - a[1]);
    if (cs.length > 1) add(I.topClient(cs[0][0], Math.round(100 * cs[0][1] / n)));
    const byT = {}; VIEW.forEach(r => { if (r.trucker) byT[r.trucker] = (byT[r.trucker] || 0) + 1; });
    const ts = Object.entries(byT).sort((a, b) => b[1] - a[1]);
    if (ts.length >= 4) { const t3 = ts.slice(0, 3); add(I.top3(Math.round(100 * t3.reduce((s, x) => s + x[1], 0) / n), t3.map(x => x[0]).join(', '))); }
    else if (ts.length) add(I.topTrucker(ts[0][0], ts[0][1], Math.round(100 * ts[0][1] / n)));
    const known = VIEW.filter(r => r.risk !== null), late = known.filter(r => r.risk === 'Late');
    if (known.length && m !== 'Export') {
      add(I.risk(late.length, Math.round(100 * late.length / known.length)));
      const byR = {}; known.forEach(r => { if (!r.client) return; byR[r.client] = byR[r.client] || { n: 0, l: 0 }; byR[r.client].n++; if (r.risk === 'Late') byR[r.client].l++; });
      const worst = Object.entries(byR).filter(([, v]) => v.n >= 3).map(([k, v]) => [k, 100 * v.l / v.n]).sort((a, b) => b[1] - a[1])[0];
      if (worst && worst[1] > 0) add(I.riskClient(worst[0], Math.round(worst[1])));
      const fd = known.map(r => r.freeDays); add(I.free(avg(fd).toFixed(1)));
    }
    const byD = {}; VIEW.forEach(r => { if (r.dest) byD[r.dest] = (byD[r.dest] || 0) + 1; });
    const ds = Object.entries(byD).sort((a, b) => b[1] - a[1])[0];
    if (ds) add(I.dest(ds[0], Math.round(100 * ds[1] / n)));
    const c40 = VIEW.filter(r => r.size === "40'").length; if (c40) add(I.size(Math.round(100 * c40 / n)));
    const byO = {}; VIEW.forEach(r => { if (r.oper) byO[r.oper] = (byO[r.oper] || 0) + 1; });
    const os = Object.entries(byO).sort((a, b) => b[1] - a[1])[0];
    if (os && Object.keys(byO).length > 1) add(I.oper(os[0], Math.round(100 * os[1] / n)));
    const cars = new Set(VIEW.map(r => r.car).filter(Boolean)).size;
    if (cars) add(I.truck(cars, (n / cars).toFixed(1)));
    if (m === 'Overview') {
      const exp = VIEW.filter(r => r.dir === 'Export').length;
      if (exp && exp < n) add(I.exportShare(Math.round(100 * exp / n)));
    }
    if (m !== 'Import') {
      const cb = VIEW.filter(r => r.cutDays !== null && r.cutDays !== undefined).map(r => r.cutDays).filter(d => d >= -30 && d <= 60);
      if (cb.length) add(I.cut(avg(cb).toFixed(1), cb.filter(d => d < 0).length));
      const rts = {}; VIEW.forEach(r => { if (r.dir !== 'Export') return; const a = r.pol || r.from, b2 = r.pod || r.to; if (!a && !b2) return; const k = `${a || '?'} → ${b2 || '?'}`; rts[k] = (rts[k] || 0) + 1; });
      const top = Object.entries(rts).sort((a, b) => b[1] - a[1])[0];
      if (top) add(I.route(top[0], Math.round(100 * top[1] / n)));
    }
    if (m === 'Import') {
      const byPo = {}; VIEW.forEach(r => { if (r.port) byPo[r.port] = (byPo[r.port] || 0) + 1; });
      const tp = Object.entries(byPo).sort((a, b) => b[1] - a[1])[0];
      if (tp && Object.keys(byPo).length > 1) add(I.port(tp[0], Math.round(100 * tp[1] / n)));
    }
    const mc = {}; VIEW.forEach(r => { const m = monthOf(r); if (m) mc[m] = (mc[m] || 0) + 1; });
    const months = Object.keys(mc).filter(m => mc[m] >= Math.max(5, n * 0.05)).sort();   // ignore stray typo months
    if (months.length >= 2) {
      const m1 = months[months.length - 1], m0 = months[months.length - 2];
      if (mc[m0]) add(I.mom(new Date(m1 + '-01').toLocaleString(AR() ? 'ar-EG' : 'en', { month: 'long' }), Math.round(100 * (mc[m1] - mc[m0]) / mc[m0])));
    }
    if (m !== 'Export' && directionRows().every(r => !r.checkout)) add(I.gap('CHECK Out From the Port'));
  }

  function render() { renderKPIs(); renderCharts(); renderInsights(); }

  /* =====================================================================
     9. DATA ENTRY — Excel-like grid inside the page (transport only)
     Staff pick Import or Export, fill the columns, every cell is validated
     live, then "Apply to dashboard" turns the rows into trips.
     ===================================================================== */

  /* column definitions per direction. req: must be filled · grp: merged/fill-down column */
  /* Columns are in the EXACT order and wording of the TPT sheet, so the screen
     reads like the file the team already fills. req: must be filled · grp: merged/fill-down */
  /* EXACTLY the columns of the TPT sheet — same order, same English headers,
     same Arabic sub-headers (blank where the sheet leaves them blank).
     req: must be filled · grp: merged cell, inherited from the row above */
  /* ===================== SHEET STRUCTURE =====================
     IMPORT follows the new sheet layout, in 6 colour-coded groups.
     g = group id · t = text|list|size|date|time · req = required to open an operation
     op:true = asked on the "new operation" form (operation … destination)
     Export is unchanged.
     ========================================================== */
  /* ===================== SHEET STRUCTURE (read from TPT_REPORT_NEW_2026.xlsx, 24 Sep 2026) =====================
     Column groups carry the exact fill colours of the sheet headers.
     t     = text | list | date | time | upd (updates log) | num
     op    = asked on the "new operation" form; those cells are locked in the table
     uniq  = false -> may differ per container (never merged) · everything else merges across a shipment by default
     auto  = written by the system (CNTR Volume, Updates Date, Latest Updates)
     ============================================================================================================ */
  const GROUPS = {
    g1: { c: '#9BBB59' }, g2: { c: '#4BACC6' }, g3: { c: '#C0504D' }, g4: { c: '#FF66FF' },
    g5: { c: '#66FFCC' }, g6: { c: '#FFFF99' }, g7: { c: '#31859B' },
  };
  const COLS = {
    Import: [
      { k: 'shipNo', h: 'Shipment #', ar: 'رقم الشحنة', t: 'text', g: 'g1', w: 155 },
      { k: 'vol', h: 'Shipments', ar: 'عدد الشحنات', t: 'num', g: 'g1', auto: true, w: 125 },
      { k: 'oper', h: 'operation', ar: 'اسم الاوبريشن', t: 'list', g: 'g1', op: true, w: 140, src: 'oper' },
      { k: 'cert', h: 'Certificate Number', ar: 'رقم الشهادة', t: 'text', g: 'g1', w: 200 },
      { k: 'client', h: 'CLEINT', ar: 'اسم العميل', t: 'list', g: 'g1', w: 320, src: 'client' },
      { k: 'mawb', h: 'MAWB', ar: 'البوليصة الرئيسية', t: 'text', g: 'g2', w: 170 },
      { k: 'hawb', h: 'HAWB', ar: 'البوليصة الفرعية', t: 'text', g: 'g2', w: 145 },
      { k: 'line', h: 'Air Terminal', ar: 'المحطة الجوية', t: 'list', g: 'g2', w: 170, src: 'line' },
      { k: 'dest', h: 'destination', ar: 'مكان التعتيق', t: 'list', g: 'g2', w: 190, src: 'dest' },
      { k: 'fullAddress', h: 'Full Address', ar: 'العنوان التفصيلي', t: 'text', g: 'g2', w: 260 },
      { k: 'aod', h: 'AOD', ar: 'مطار الوصول', t: 'list', g: 'g2', w: 140, src: 'aod' },
      { k: 'free', h: 'free time till', ar: 'فترة السماح للشحنة', t: 'date', g: 'g2', w: 150 },
      { k: 'reqDate', h: 'Required Offloading Date', ar: 'تاريخ التعتيق المطلوب', t: 'date', g: 'g3', w: 200 },
      { k: 'reqTime', h: 'Required Offloading Time', ar: 'وقت التعتيق المطلوب', t: 'time', g: 'g3', w: 200 },
      { k: 'arrDate', h: 'Actual Arrive Date', ar: 'تاريخ الوصول الفعلي', t: 'date', g: 'g3', w: 170 },
      { k: 'arrTime', h: 'Actual Arrive Time', ar: 'وقت الوصول الفعلي', t: 'time', g: 'g3', w: 170 },
      { k: 'gateOut', h: 'Gate out Date', ar: 'تاريخ الخروج من البوابة', t: 'date', g: 'g3', uniq: false, w: 160 },
      { k: 'gateOutT', h: 'Gate out Time', ar: 'وقت الخروج من البوابة', t: 'time', g: 'g3', uniq: false, w: 160 },
      { k: 'cntr', h: 'cntr#', ar: 'رقم الحاوية', t: 'text', g: 'g4', uniq: false, w: 270 },
      { k: 'loadedPackages', h: 'Loaded Pkgs', ar: 'الطرود المحملة', t: 'num', g: 'g4', auto: true, uniq: false, w: 130 },
      { k: 'loadStatus', h: 'Load Status', ar: 'حالة التحميل', t: 'text', g: 'g4', auto: true, uniq: false, w: 130 },
      { k: 'trucker', h: 'Transporter', ar: 'مقاول النقل', t: 'list', g: 'g5', w: 190, src: 'trucker' },
      { k: 'car', h: 'Car No.', ar: 'رقم السيارة', t: 'text', g: 'g5', uniq: false, w: 130 },
      { k: 'driver', h: 'Driver Name', ar: 'اسم السائق', t: 'text', combo: true, src: 'driver', g: 'g5', uniq: false, w: 190 },
      { k: 'mob', h: 'MOB', ar: 'رقم السائق', t: 'text', combo: true, src: 'mob', g: 'g5', uniq: false, w: 160 },
      { k: 'checkout', h: 'CHECK Out From the Port', ar: 'الخروج من الميناء', t: 'date', g: 'g6', uniq: false, w: 205 },
      { k: 'updDate', h: 'Updates Date', ar: 'تاريخ التحديث', t: 'text', g: 'g6', auto: true, w: 150 },
      { k: 'invRcv', h: 'Invoices Received Date', ar: 'تاريخ استلام الفواتير', t: 'date', g: 'g6', w: 195 },
      { k: 'missDoc', h: 'Missing Docs', ar: 'المستندات الناقصة', t: 'text', g: 'g6', w: 150 },
      { k: 'missRcv', h: 'Receive Date of Mssing Docs', ar: 'تاريخ استلام المستندات', t: 'date', g: 'g6', w: 225 },
      { k: 'updates', h: 'Latest Updates', ar: 'آخر التحديثات', t: 'upd', g: 'g6', auto: true, w: 230 },
    ],
    Export: [
      { k: 'shipNo', h: 'Shipment #', ar: 'رقم الشحنة', t: 'text', g: 'g1', w: 155 },
      { k: 'vol', h: 'Shipments', ar: 'عدد الشحنات', t: 'num', g: 'g1', auto: true, w: 120 },
      { k: 'oper', h: 'operation', ar: 'اسم الاوبريشن', t: 'list', g: 'g1', op: true, w: 140, src: 'oper' },
      { k: 'clrType', h: 'Clearance Type', ar: 'نوع التخليص', t: 'list', g: 'g1', w: 140, src: 'clrType' },
      { k: 'cert', h: 'Certificate Number', ar: 'رقم الشهادة', t: 'text', g: 'g1', w: 200 },
      { k: 'customs', h: 'Customs', ar: 'الجمارك', t: 'text', g: 'g1', w: 170 },
      { k: 'mawb', h: 'MAWB', ar: 'البوليصة الرئيسية', t: 'text', g: 'g1', w: 170 },
      { k: 'hawb', h: 'HAWB', ar: 'البوليصة الفرعية', t: 'text', g: 'g1', w: 145 },
      { k: 'client', h: 'CLEINT', ar: 'اسم العميل', t: 'list', g: 'g1', w: 320, src: 'client' },
      { k: 'line', h: 'Air Terminal', ar: 'المحطة الجوية', t: 'list', g: 'g2', w: 170, src: 'line' },
      { k: 'dest', h: 'destination', ar: 'مكان التحميل', t: 'list', g: 'g2', w: 190, src: 'dest' },
      { k: 'fullAddress', h: 'Full Address', ar: 'العنوان التفصيلي', t: 'text', g: 'g2', w: 260 },
      { k: 'pol', h: 'POL', ar: 'ميناء الشحن', t: 'list', g: 'g2', w: 140, src: 'pol' },
      { k: 'aod', h: 'AOD', ar: 'مطار الوصول', t: 'list', g: 'g2', w: 140, src: 'aod' },
      { k: 'pow', h: 'POW', ar: 'ميناء العبور', t: 'list', g: 'g2', opt: true, w: 140, src: 'pow' },
      { k: 'cut', h: 'CUT OFF', ar: 'آخر ميعاد التسليم', t: 'date', g: 'g3', w: 150 },
      { k: 'reqDate', h: 'Required loading Date', ar: 'تاريخ التحميل المطلوب', t: 'date', g: 'g3', w: 185 },
      { k: 'reqTime', h: 'Required loading Time', ar: 'وقت التحميل المطلوب', t: 'time', g: 'g3', w: 185 },
      { k: 'arrDate', h: 'Actual Arrive Date', ar: 'تاريخ الوصول الفعلي', t: 'date', g: 'g3', w: 170 },
      { k: 'arrTime', h: 'Actual Arrive Time', ar: 'وقت الوصول الفعلي', t: 'time', g: 'g3', w: 170 },
      { k: 'gateOut', h: 'Gate out Date', ar: 'تاريخ الخروج من البوابة', t: 'date', g: 'g3', uniq: false, w: 160 },
      { k: 'gateOutT', h: 'Gate out Time', ar: 'وقت الخروج من البوابة', t: 'time', g: 'g3', uniq: false, w: 160 },
      { k: 'cntr', h: 'cntr no#', ar: 'رقم الحاوية', t: 'text', g: 'g4', uniq: false, w: 270 },
      { k: 'loadedPackages', h: 'Loaded Pkgs', ar: 'الطرود المحملة', t: 'num', g: 'g4', auto: true, uniq: false, w: 130 },
      { k: 'loadStatus', h: 'Load Status', ar: 'حالة التحميل', t: 'text', g: 'g4', auto: true, uniq: false, w: 130 },
      { k: 'trucker', h: 'Transporter', ar: 'مقاول النقل', t: 'list', g: 'g5', w: 190, src: 'trucker' },
      { k: 'car', h: 'Car No#', ar: 'رقم السيارة', t: 'text', g: 'g5', uniq: false, w: 130 },
      { k: 'driver', h: 'Driver Name', ar: 'اسم السائق', t: 'text', combo: true, src: 'driver', g: 'g5', uniq: false, w: 190 },
      { k: 'mob', h: 'MOB', ar: 'رقم السائق', t: 'text', combo: true, src: 'mob', g: 'g5', uniq: false, w: 160 },
      { k: 'updDate', h: 'Updates Date', ar: 'تاريخ التحديث', t: 'text', g: 'g6', auto: true, w: 150 },
      { k: 'invRcv', h: 'Invoices Received Date', ar: 'تاريخ استلام الفواتير', t: 'date', g: 'g6', w: 195 },
      { k: 'missDoc', h: 'Missing Docs', ar: 'المستندات الناقصة', t: 'text', g: 'g6', w: 150 },
      { k: 'missRcv', h: 'Receive Date of Mssing Docs', ar: 'تاريخ استلام المستندات', t: 'date', g: 'g6', w: 225 },
      { k: 'updates', h: 'Latest Updates', ar: 'آخر التحديثات', t: 'upd', g: 'g6', auto: true, w: 230 },
    ]
  };
  /* Import merge defaults follow the approved sheet layout: only the listed shipment-level fields merge automatically. */
  const IMPORT_DEFAULT_MERGED = new Set(['shipNo', 'vol', 'oper', 'cert', 'client', 'mawb', 'bl', 'hawb', 'line', 'dest', 'fullAddress', 'aod', 'free']);
  COLS.Import.forEach(c => { if (!IMPORT_DEFAULT_MERGED.has(c.k)) c.uniq = false; });
  /* Export merge defaults follow the approved sheet layout: only the listed shipment-level fields merge automatically. */
  const EXPORT_DEFAULT_MERGED = new Set(['shipNo', 'vol', 'oper', 'clrType', 'cert', 'customs', 'mawb', 'booking', 'hawb', 'client', 'line', 'dest', 'fullAddress', 'pol', 'aod', 'pow']);
  COLS.Export.forEach(c => { if (!EXPORT_DEFAULT_MERGED.has(c.k)) c.uniq = false; });
  for (const dir of ['Import', 'Export']) {
    const cols = COLS[dir], index = cols.findIndex(c => c.k === 'updates');
    const [updates] = cols.splice(index, 1); updates.g = cols.find(c => c.k === 'cntr').g;
    cols.splice(cols.findIndex(c => c.k === 'cntr') + 1, 0, updates);
    cols.push({ k: 'status', h: 'Status', ar: 'حالة الشحنة', t: 'text', g: 'g7', w: 145, auto: true, uniq: true });
  }
  const opFields = dir => COLS[dir].filter(c => c.op && c.k !== 'cut');
  const isMergeCol = c => !!c && c.uniq !== false;
  const FIXED_MERGE = { Import: new Set(['aod', 'oper', 'client', 'cert', 'mawb', 'bl', 'shipNo', 'invRcv', 'line', 'vol', 'fullAddress']), Export: new Set(['clrType', 'oper', 'vol', 'shipNo', 'cert', 'customs', 'mawb', 'booking', 'client', 'line', 'pol', 'aod', 'pow', 'trucker', 'invRcv', 'fullAddress']) };
  for (const dir of ['Import', 'Export']) COLS[dir].forEach(c => { if (FIXED_MERGE[dir].has(c.k)) c.uniq = true; });
  const canToggleMerge = (dir, c) => !!c && c.k === 'trucker';   /* Transporter is the only column with a manual Merge / Un-merge */
  const MASTER_SEED = { "oper": ["Fatma", "Hager", "Mohamed", "Nadia", "Sara", "Yasmin"], "client": ["CHEMICALS", "CHMICALS", "DICE", "DICOOMIX", "FUFENG", "GERMAN COMPANY", "GOLDEN SUN", "HENG TONG", "LANDMARK", "London Foods", "MIDEA", "MIDEA ELECTRICS", "MIDEA KITCHEN", "MIDEA Washing", "MIRACO"], "line": ["EgyptAir Cargo", "Cairo Cargo City", "EAS Cargo", "Lufthansa Cargo", "Emirates SkyCargo"], "aod": ["Cairo (CAI)", "Borg El Arab (HBE)", "Luxor (LXR)", "Aswan (ASW)", "Hurghada (HRG)", "Sharm El Sheikh (SSH)"], "pol": ["Cairo (CAI)", "Borg El Arab (HBE)"], "pow": [], "dest": ["10OF RAMDAN", "ABOR", "ABU RAWASH", "ALSDAT", "Borg Elarab", "Elkhanka", "Elsadat", "Elsalhya", "Helwan", "OCTOBER", "Qalyoub", "SOKHNA", "WADI ELNATRUN"], "trucker": ["ABU ELDAHAB", "ALDAMNHORY", "ALRihab", "Ayman", "Darwesh", "EURO", "Eldawlya", "MEDIL EAST", "Ranin", "TAQA"], "status": [] };
  /* drop-down lists start from the values already in the TPT report (cleaned), grow with "＋ Add new" and with uploads */
  let MASTER = { oper: [], client: [], line: [], aod: [], pol: [], pow: [], dest: [], trucker: [], fwd: ['ILS'], clrType: ['CERT', 'BOSLA'], status: [] };
  function seedMaster() {
    const NORM = { client: normClient, dest: normSite, pod: normSite, pol: normSite, pow: normSite, line: normLine, trucker: normTrucker, oper: titleCase, size: normSize };
    Object.entries(MASTER_SEED).forEach(([k, list]) => {
      const f = NORM[k] || (x => String(x).trim());
      MASTER[k] = [...new Set(list.map(v => f(v)).filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b));
    });
    MASTER.clrType = ['CERT', 'BOSLA'];
    MASTER.status = [...new Set([...(MASTER.status || []), 'In progress', 'Delivered', 'On hold'])];
  }
  function growMaster() {
    ['oper', 'client', 'line', 'aod', 'pol', 'pow', 'dest', 'trucker', 'status'].forEach(k => {
      MASTER[k] = [...new Set([...(MASTER[k] || []), ...DATA.map(r => r[k]).filter(Boolean).map(String)])].sort((a, b) => a.localeCompare(b));
    });
  }

  let ENTRY = { Import: [], Export: [] };
  let EDIR = 'Import';
  let CURRENT_TAB = 'Import';
  let ARCHIVE_FILTER_DIR = '';
  const ARCHIVE_STORE = {
    delivered: { Import: { ships: {}, entry: [], rowmeta: {} }, Export: { ships: {}, entry: [], rowmeta: {} } },
    inactive: { Import: { ships: {}, entry: [], rowmeta: {} }, Export: { ships: {}, entry: [], rowmeta: {} } },
    activeExport: { Import: { ships: {}, entry: [], rowmeta: {} }, Export: { ships: {}, entry: [], rowmeta: {} } }
  };
  const isArchiveScope = (scope) => scope === 'delivered' || scope === 'inactive' || scope === 'activeExport';
  const isServerPagedEntry = () => LIVE && typeof ILS.api?.getPagedOperations === 'function';
  const ENTRY_PAGING = {
    Import: { totalCount: 0, totalTrucks: 0, totalPages: 1, loading: false, cache: {}, seq: 0, abort: null },
    Export: { totalCount: 0, totalTrucks: 0, totalPages: 1, loading: false, cache: {}, seq: 0, abort: null }
  };
  function invalidateEntryCache(dir) {
    if (dir && ENTRY_PAGING[dir]) {
      ENTRY_PAGING[dir].cache = {};
    } else {
      ENTRY_PAGING.Import.cache = {};
      ENTRY_PAGING.Export.cache = {};
    }
  }
  function hasUnsavedActiveEdits() {
    if (typeof ACTIVE_EDIT_SHIPS !== 'undefined' && ACTIVE_EDIT_SHIPS.size > 0) {
      toast(AR() ? 'يرجى حفظ أو إلغاء التعديلات المفتوحة أولاً قبل الانتقال أو البحث' : 'Please save or cancel open edits before changing page or searching', 'warning');
      return true;
    }
    return false;
  }

  /* =====================================================================
     ENTRY ENGINE
     · An operation (shipment) is created ONLY from the form above; it produces
       N container rows (N = "containers in this operation" → CNTR Volume).
     · Form fields are locked in the table. Everything else is completed there.
     · Columns merge across a shipment (one cell spanning its rows) unless the
       sheet marks them per-container; any merged cell can be un-merged and
       merged back.
     · Keyboard first: arrows move between cells, Enter edits, Esc cancels,
       Tab/Shift+Tab move across.
     ===================================================================== */
  const isBlank = v => { const x = String(v ?? '').trim(); return x === '' || /^[.\-\s]*$/.test(x); };
  const cellVal = (r, k) => { const v = String(r?.[k] ?? '').trim(); return isBlank(v) ? '' : v; };
  const isBoslaClr = v => { const s = String(v ?? '').trim().toUpperCase(); return s === 'BOSLA' || s.startsWith('BOS') || s.includes('بوصل'); };
  const normClr = v => isBoslaClr(v) ? 'BOSLA' : (String(v ?? '').trim().toUpperCase().startsWith('CERT') || String(v ?? '').includes('شهد') ? 'CERT' : String(v ?? '').trim().toUpperCase());
  const BOSLA_CUSTOMS = ['ODP', '10TH of Ramadan Dry Port', 'Sokhna Port', 'Al Obour Dry Port'];
  const CERT_CUSTOMS = ['Cairo Airport Customs'];
  const nowHM = () => new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const today = () => new Date().toISOString().slice(0, 10);
  const fmtDay = d => {
    if (!d) return ''; const p = fixDate(d, false); if (!p) return d;
    const [y, m, dd] = p.split('-');
    const mo = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'][+m - 1] || m;
    return `${dd}-${mo}-${y}`;
  };
  const fmtDateTime = v => {
    const s = String(v ?? '').trim(); if (!s) return '';
    const m = s.match(/^(.+?)(?:\s+|T)(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
    if (!m) return fmtDay(s);
    let h = +m[2]; const minute = +m[3]; if (h > 23 || minute > 59) return s;
    if (m[4]) { if (h > 12 || h === 0) return s; if (m[4].toLowerCase() === 'pm' && h < 12) h += 12; if (m[4].toLowerCase() === 'am' && h === 12) h = 0; }
    return `${fmtDay(m[1])} ${String(h).padStart(2, '0')}:${m[3]}`;
  };
  const fmtTime12 = v => {
    if (v === null || v === undefined || v === '') return '';
    const nt = normTime(v);
    if (!nt) return String(v);
    const parts = nt.split(':');
    let h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    if (isNaN(h)) return String(v);
    const ap = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    return `${String(h).padStart(2, '0')}:${m} ${ap}`;
  };
  const CAL_ICON_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;display:inline-block;vertical-align:middle"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>';
  const CLK_ICON_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="pointer-events:none;display:inline-block;vertical-align:middle"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';

  let SHIPS = { Import: {}, Export: {} };          // ref -> {ref, dir, rows:[idx…], unmerged:Set(cols), at, user}
  const TRIP_SELECTED = { Import: new Set(), Export: new Set() };
  const TRIP_SEARCH = { Import: [], Export: [] };
  const TRIP_SORT = { Import: { key: '__tripNo', dir: 'asc' }, Export: { key: '__tripNo', dir: 'asc' } };
  const TRIP_PAGE = { Import: 0, Export: 0 };
  let TRIPS_PER_PAGE = 20;
  function shipmentPages(ships) {
    const pages = []; let page = [], trips = 0;
    ships.forEach(sh => {
      if (page.length && trips + sh.rows.length > TRIPS_PER_PAGE) { pages.push(page); page = []; trips = 0; }
      page.push(sh); trips += sh.rows.length;
    });
    if (page.length) pages.push(page);
    return pages;
  }
  let TRIP_SEARCH_DIR = null;
  const ID_KEYS = new Set(['shipNo', 'cert', 'mawb', 'bl', 'booking', 'cntr', 'car', 'mob']);
  const NUMERIC_ID_KEYS = new Set(['mob']);
  const tripType = c => NUMERIC_ID_KEYS.has(c?.k) ? 'numericId' : c?.k === 'updDate' ? 'datetime' : c?.t === 'date' ? 'date' : c?.t === 'time' ? 'time' : c?.t === 'num' || c?.k === 'vol' ? 'number' : ID_KEYS.has(c?.k) ? 'id' : 'text';
  const tripTypeLabel = (type) => ({ date: AR() ? 'تاريخ' : 'Date', datetime: AR() ? 'تاريخ ووقت' : 'Date & time', time: AR() ? 'وقت' : 'Time', number: AR() ? 'عدد' : 'Number', numericId: AR() ? 'أرقام فقط' : 'Digits only', id: AR() ? 'رقم أو كود' : 'Number / ID', text: AR() ? 'نص' : 'Text' })[type];
  function normalizeDigits(v) { return String(v ?? '').replace(/[٠-٩۰-۹]/g, c => String(c.charCodeAt(0) - (c <= '٩' ? 1632 : 1776))); }
  function strictEntryDate(v) {
    let m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/), y, mo, d;
    if (m) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = v.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/))) { d = +m[1]; mo = +m[2]; y = +m[3]; }
    else if ((m = v.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/))) { d = +m[1]; mo = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].indexOf(m[2].toUpperCase()) + 1; y = +m[3]; }
    else return null;
    return y >= 1000 && y <= 9999 && mo >= 1 && mo <= 12 && d >= 1 && d <= new Date(Date.UTC(y, mo, 0)).getUTCDate() ? `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}` : null;
  }
  function validateField(c, raw, search = false) {
    const v = normalizeDigits(raw).trim(), type = tripType(c), bad = (en, ar) => ({ ok: false, value: v, message: AR() ? ar : en });
    if (!v) return { ok: true, value: '' };
    if (type === 'number') {
      if (!/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) < 1 || (c.k === 'opCount' && Number(v) > 200)) return bad(c.k === 'opCount' ? 'Enter a whole number from 1 to 200' : 'Enter a positive whole number', c.k === 'opCount' ? 'اكتب عدد صحيح من 1 إلى 200' : 'اكتب عدد صحيح أكبر من صفر');
    } else if (c.k === 'clrType') {
      const norm = normClr(v);
      if (!['CERT', 'BOSLA'].includes(norm)) return bad('Choose CERT or BOSLA', 'اختار CERT أو BOSLA');
      return { ok: true, value: norm };
    } else if (c.k === 'cert') {
      if (!/^\d+$/.test(v)) return bad('Certificate number: digits only', 'رقم الشهادة: أرقام فقط');
    } else if (c.k === 'missDoc') {
      return { ok: true, value: cleanDocValue(v) };
    } else if (c.k === 'mob') {
      if (!/^\+?[\d ()-]+$/.test(v)) return bad('Phone: digits and + only', 'التليفون: أرقام ومسموح +');
      return { ok: true, value: v };
    } else if (c.k === 'size') {
      if (!/^(20|40)['’]?$|^LCL$/i.test(v)) return bad('Choose 20, 40 or LCL', 'اختار 20 أو 40 أو LCL');
    } else if (c.k === 'cntr') {
      if (!(search ? /^[A-Za-z0-9]*$/ : /^[A-Za-z]{4}\d{7}$/).test(v)) return bad(search ? 'Use container letters or digits' : 'Container number: 4 letters followed by 7 digits', search ? 'اكتب حروف أو أرقام الحاوية' : 'رقم الحاوية: 4 حروف إنجليزية وبعدها 7 أرقام');
      return { ok: true, value: v.toUpperCase() };
    } else if (['mawb', 'bl', 'booking', 'car'].includes(c.k)) {
      if (!/^[\p{L}\d /_.-]+$/u.test(v) || (!search && !/\d/.test(v))) return bad('Use an ID containing digits; letters, spaces, /, -, _ and . are allowed', 'اكتب كود يحتوي أرقام؛ مسموح حروف ومسافات و / و - و _ و .');
      return { ok: true, value: c.k === 'car' ? v.toUpperCase() : v };
    } else if (type === 'time') {
      const nt = normTime(v);
      if (!nt) return bad('Use time like 8, 2p, or 14:30', 'استخدم وقت مثل 8 أو 2p أو 14:30');
      return { ok: true, value: nt };
    } else if (type === 'date') {
      const date = fixDate(v, false);
      if (!date) return bad('Enter a real date, for example 1/11 or 24-SEP-2026', 'اكتب تاريخًا صحيحًا، مثال 1/11 أو 24-09-2026');
      return { ok: true, value: date };
    } else if (type === 'datetime') {
      const parts = v.match(/^(.+) (\d{1,2}:\d{2})$/);
      if (!parts || !fixDate(parts[1], false) || !normTime(parts[2])) return bad('Use DD-MMM-YYYY HH:mm', 'استخدم DD-MMM-YYYY HH:mm');
    }
    return { ok: true, value: v };
  }
  function fieldFeedback(el, result) {
    if (!el) return;
    el.setCustomValidity(result?.ok ? '' : (result?.message || ''));
    el.setAttribute('aria-invalid', String(!result?.ok));
    if (el.classList.contains('ed') || el.closest('#eTable') || el.closest('#eBody')) return;
    const host = el.closest('.datetime-control') || el;
    let note = host.nextElementSibling;
    if (!note?.classList.contains('field-error')) {
      note = document.createElement('small');
      note.className = 'field-error';
      note.setAttribute('role', 'status');
      host.after(note);
    }
    note.textContent = result?.ok ? '' : (result?.message || '');
    note.hidden = Boolean(result?.ok);
  }
  function inputColumn(el) {
    if (el.id === 'opCount') return { k: 'opCount', t: 'num' };
    if (el.id?.startsWith('op_')) return COLS[EDIR].find(c => c.k === el.id.slice(3));
    if (el.classList.contains('ed')) return COLS[EDIR].find(c => c.k === el.dataset.k);
    if (el.classList.contains('tripvalue')) { const key = (el.closest('#deliveredSearch') ? DELIVERED_SEARCH : TRIP_SEARCH)[EDIR][+el.closest('.triprule').dataset.ix]?.k; return COLS[EDIR].find(c => c.k === key) || { k: key, t: key === '__tripNo' ? 'num' : key === '__created' ? 'date' : 'text' }; }
  }
  function allowedFieldCharacters(c, v) {
    if (!v) return true;
    if (c?.k === '__all' || document.activeElement?.classList?.contains('tripvalue')) return true;
    if (tripType(c) === 'number' || c.k === 'cert') return /^\d*$/.test(v);
    if (c.k === 'mob') return /^\+?[\d ()-]*$/.test(v);
    if (c.k === 'cntr') return /^[a-zA-Z0-9]*$/.test(v);
    if (tripType(c) === 'time') return /^[\d\s:a-zA-Z]*$/.test(v);
    if (tripType(c) === 'date') return /^[\d\s\/\-a-zA-Z]*$/.test(v);
    return true;
  }
  __on(document, 'focusin', e => { const el = e.target; if (el.tagName === 'INPUT' && inputColumn(el)) el.dataset.acceptedValue = el.value; });
  __on(document, 'beforeinput', e => {
    const el = e.target; if (el.tagName !== 'INPUT') return; const c = inputColumn(el); if (!c || e.data == null || e.isComposing) return;
    if (el.classList.contains('ed') || el.classList.contains('tripvalue')) return;
    const candidate = normalizeDigits(el.value.slice(0, el.selectionStart ?? el.value.length) + e.data + el.value.slice(el.selectionEnd ?? el.value.length));
    if (!allowedFieldCharacters(c, candidate)) { e.preventDefault(); fieldFeedback(el, { ok: false, message: AR() ? 'القيمة دي مش مناسبة لنوع الخانة' : 'This value does not match the field type' }); }
  });
  __on(document, 'input', e => {
    const el = e.target; if (el.tagName !== 'INPUT') return; const c = inputColumn(el); if (!c) return;
    if (el.classList.contains('tripvalue')) return;
    const value = normalizeDigits(el.value);
    if (!allowedFieldCharacters(c, value)) {
      el.value = el.dataset.acceptedValue || '';
      if (!el.classList.contains('ed')) {
        fieldFeedback(el, { ok: false, message: AR() ? 'القيمة المرفوضة فيها حروف غير مسموحة' : 'Rejected value contains unsupported characters' });
      }
      e.stopImmediatePropagation();
      return;
    }
    el.value = value;
    el.dataset.acceptedValue = value;
    if (!el.classList.contains('ed')) {
      fieldFeedback(el, validateField(c, value, el.classList.contains('tripvalue')));
    }
  }, true);
  function tripSearchKeys(dir) {
    return [
      { k: '__all', h: AR() ? 'جميع الأعمدة (بحث عام)' : 'All columns (Quick search)', t: 'text' },
      { k: '__ref', h: AR() ? 'رقم العملية' : 'Operation ref', t: 'text' },
      { k: '__tripNo', h: AR() ? 'ترتيب الإنشاء' : 'Created order', t: 'number' },
      { k: '__created', h: AR() ? 'تاريخ إنشاء العملية' : 'Operation created date', t: 'date' },
      ...COLS[dir].filter(c => c.t !== 'upd').map(c => ({ k: c.k, h: AR() ? (c.ar || c.h) : c.h, t: tripType(c) }))
    ];
  }
  function tripRuleMatches(row, ship, rule, dir) {
    const value = String(rule.v ?? '').trim();
    if (!value) return true;
    const q = value.toLocaleLowerCase();

    if (rule.k === '__all') {
      if (ship.ref && ship.ref.toLocaleLowerCase().includes(q)) return true;
      if (ship.day && String(ship.day).toLocaleLowerCase().includes(q)) return true;
      if (ship.user && String(ship.user).toLocaleLowerCase().includes(q)) return true;
      return Object.values(row).some(cellVal => String(cellVal ?? '').toLocaleLowerCase().includes(q));
    }

    const key = tripSearchKeys(dir).find(c => c.k === rule.k);
    if (!key) return true;
    const raw = rule.k === '__tripNo'
      ? String(Object.keys(SHIPS[dir]).indexOf(ship.ref) + 1)
      : rule.k === '__ref'
        ? (ship.ref || '')
        : rule.k === '__created'
          ? String(ship.day || '')
          : String(row[rule.k] ?? '');

    if (key.t === 'number') {
      return raw.trim() !== '' && (raw.includes(value) || Number(raw) === Number(value));
    }
    if (key.t === 'date' || key.t === 'datetime') {
      const entered = fixDate(value, false), actual = fixDate(raw, false);
      return raw.toLocaleLowerCase().includes(q) || (!!entered && !!actual && entered === actual);
    }
    if (key.t === 'time') {
      const entered = normTime(value), actual = normTime(raw);
      return raw.toLocaleLowerCase().includes(q) || (!!entered && !!actual && entered === actual);
    }
    return raw.toLocaleLowerCase().includes(q);
  }
  function tripMatches(ship, dir, list = TRIP_SEARCH[dir]) {
    const rules = list.filter(r => String(r.v ?? '').trim());
    if (!rules.length) return true;
    const match = r => ship.rows.some(i => tripRuleMatches(ENTRY[dir][i], ship, r, dir));
    return rules.reduce((result, r, i) => i === 0 ? match(r) : r.join === 'OR' ? result || match(r) : r.join === 'NOT' ? result && !match(r) : result && match(r), false);
  }
  let ENTRY_QUICK_SEARCH = '';
  let entryQuickSearchTimer = null;
  function getActiveEntryRules(dir) {
    return (TRIP_SEARCH[dir] || [])
      .filter(r => String(r.v ?? '').trim() !== '')
      .map(r => ({ k: r.k || '__all', v: String(r.v).trim(), join: r.join || 'AND' }));
  }
  function entryQueryKey(dir) {
    const page = (TRIP_PAGE[dir] || 0) + 1;
    const ps = TRIPS_PER_PAGE || 20;
    const q = ENTRY_QUICK_SEARCH.trim().toLowerCase();
    const s = TRIP_SORT[dir] || { key: '__tripNo', dir: 'asc' };
    const r = getActiveEntryRules(dir);
    return `p_${page}_ps_${ps}_q_${q}_sk_${s.key}_sd_${s.dir}_r_${JSON.stringify(r)}`;
  }
  async function loadEntryPage(dir, { silent = false, force = false } = {}) {
    if (!isServerPagedEntry()) {
      renderEntry();
      return;
    }
    const pg = ENTRY_PAGING[dir];
    if (!pg) return;
    const key = entryQueryKey(dir);
    const cached = !force ? pg.cache[key] : null;
    if (cached) {
      pg.totalCount = cached.totalCount;
      pg.totalTrucks = cached.totalTrucks;
      pg.totalPages = cached.totalPages;
      pg.loading = false;
      hydrateWorkspace({ shipments: cached.items }, dir);
      LOADED_DIRS.add(dir);
      renderEntry();
      if (!silent) {
        loadEntryPage(dir, { silent: true, force: true });
      }
      return;
    }

    if (pg.abort) {
      try { pg.abort.abort(); } catch (e) { }
    }
    const controller = new AbortController();
    pg.abort = controller;
    const seq = ++pg.seq;

    if (!silent) {
      pg.loading = true;
      renderEntry();
    }

    try {
      const rules = getActiveEntryRules(dir);
      const q = ENTRY_QUICK_SEARCH.trim();
      const sort = TRIP_SORT[dir] || { key: '__tripNo', dir: 'asc' };
      const res = await ILS.api.getPagedOperations(
        {
          page: (TRIP_PAGE[dir] || 0) + 1,
          pageSize: TRIPS_PER_PAGE || 20,
          operationType: dir,
          onlyActive: true,
          isDeleted: false,
          search: q || undefined,
          sortBy: sort.key || '__tripNo',
          sortDirection: sort.dir || 'asc',
          rulesJson: rules.length ? JSON.stringify(rules) : undefined,
        },
        { signal: controller.signal }
      );

      if (seq !== pg.seq || destroyed) return;

      const items = Array.isArray(res?.items) ? res.items : [];
      const totalCount = res?.totalCount ?? 0;
      const totalTrucks = res?.totalTrucksCount ?? 0;
      const totalPages = Math.max(1, res?.totalPages ?? 1);

      if ((TRIP_PAGE[dir] || 0) >= totalPages && totalPages > 0) {
        TRIP_PAGE[dir] = Math.max(0, totalPages - 1);
        pg.loading = false;
        return loadEntryPage(dir, { silent, force: true });
      }

      pg.totalCount = totalCount;
      pg.totalTrucks = totalTrucks;
      pg.totalPages = totalPages;
      pg.loading = false;

      hydrateWorkspace({ shipments: items }, dir);
      LOADED_DIRS.add(dir);

      if (!q && !rules.length) {
        LAST_COUNTS = LAST_COUNTS || {};
        if (dir === 'Import') LAST_COUNTS.activeImportCount = totalCount;
        if (dir === 'Export') LAST_COUNTS.activeExportCount = totalCount;
        setCounts(LAST_COUNTS);
      }

      pg.cache[key] = { items, totalCount, totalTrucks, totalPages, timestamp: Date.now() };
      renderEntry();
    } catch (err) {
      if (err?.name === 'CanceledError' || err?.name === 'AbortError') return;
      if (seq === pg.seq) {
        pg.loading = false;
        console.error('Failed to load paged FTL operations for ' + dir + ':', err);
        if (!silent) renderEntry();
      }
    }
  }
  function sortedTripShips(dir, sort = TRIP_SORT[dir], rules = TRIP_SEARCH[dir]) {
    const keys = tripSearchKeys(dir), kind = keys.find(k => k.k === sort.key)?.t || 'text';
    const original = Object.keys(SHIPS[dir]);
    const value = ship => {
      if (!ship) return '';
      if (sort.key === '__all' || sort.key === '__ref') return ship.ref || '';
      if (sort.key === '__tripNo') return original.indexOf(ship.ref) + 1;
      if (sort.key === '__created') return ship.day || '';
      const firstRow = ship.rows && ship.rows.length ? ENTRY[dir][ship.rows[0]] : null;
      return firstRow?.[sort.key] ?? '';
    };
    const collator = new Intl.Collator(AR() ? 'ar' : 'en', { numeric: true, sensitivity: 'base' });
    return Object.values(SHIPS[dir]).filter(sh => {
      if (ENTRY_QUICK_SEARCH.trim()) {
        const q = ENTRY_QUICK_SEARCH.trim().toLowerCase();
        const refMatch = sh.ref && sh.ref.toLowerCase().includes(q);
        const dayMatch = sh.day && String(sh.day).toLowerCase().includes(q);
        const userMatch = sh.user && String(sh.user).toLowerCase().includes(q);
        if (!refMatch && !dayMatch && !userMatch) {
          const rule = { k: '__all', v: q };
          const rowMatch = Array.isArray(sh.rows) && sh.rows.some(i => ENTRY[dir][i] && tripRuleMatches(ENTRY[dir][i], sh, rule, dir));
          if (!rowMatch) return false;
        }
      }
      return tripMatches(sh, dir, rules);
    }).sort((a, b) => {
      let av = value(a), bv = value(b), result;
      if (kind === 'number') result = (Number(av) || 0) - (Number(bv) || 0);
      else if (kind === 'date') result = String(fixDate(av, false) || av || '').localeCompare(String(fixDate(bv, false) || bv || ''));
      else if (kind === 'time') result = String(normTime(av) || av || '').localeCompare(String(normTime(bv) || bv || ''));
      else result = collator.compare(String(av), String(bv));
      return (sort.dir === 'desc' ? -1 : 1) * (result || (original.indexOf(a.ref) - original.indexOf(b.ref)));
    });
  }
  function renderTripSort() {
    const key = $('tripSortKey'), dir = $('tripSortDir'); if (key.dataset.direction !== EDIR || key.dataset.lang !== LANG) {
      key.dataset.direction = EDIR; key.dataset.lang = LANG; key.innerHTML = tripSearchKeys(EDIR).map(c => `<option value="${esc(c.k)}">${esc(c.h)}</option>`).join('');
    }
    key.value = TRIP_SORT[EDIR].key; dir.value = TRIP_SORT[EDIR].dir;
    dir.options[0].textContent = AR() ? 'تصاعدي ↑' : 'Ascending ↑'; dir.options[1].textContent = AR() ? 'تنازلي ↓' : 'Descending ↓';
    $('tripSortLabel').textContent = AR() ? 'ترتيب حسب' : 'Sort by';
  }
  $('tripSortKey').addEventListener('change', e => {
    if (isServerPagedEntry() && hasUnsavedActiveEdits()) { e.target.value = TRIP_SORT[EDIR].key; return; }
    TRIP_SORT[EDIR].key = e.target.value; TRIP_PAGE[EDIR] = 0;
    if (isServerPagedEntry()) loadEntryPage(EDIR); else renderEntry();
  });
  $('tripSortDir').addEventListener('change', e => {
    if (isServerPagedEntry() && hasUnsavedActiveEdits()) { e.target.value = TRIP_SORT[EDIR].dir; return; }
    TRIP_SORT[EDIR].dir = e.target.value; TRIP_PAGE[EDIR] = 0;
    if (isServerPagedEntry()) loadEntryPage(EDIR); else renderEntry();
  });

  const qsInput = $('entryQuickSearch');
  const qsClear = $('entryQuickSearchClear');

  if (qsInput) {
    qsInput.addEventListener('input', e => {
      if (isServerPagedEntry() && hasUnsavedActiveEdits()) { e.target.value = ENTRY_QUICK_SEARCH; return; }
      ENTRY_QUICK_SEARCH = e.target.value;
      if (qsClear) qsClear.style.display = ENTRY_QUICK_SEARCH ? 'inline-flex' : 'none';
      TRIP_PAGE[EDIR] = 0;
      if (isServerPagedEntry()) {
        clearTimeout(entryQuickSearchTimer);
        entryQuickSearchTimer = setTimeout(() => { loadEntryPage(EDIR); }, 250);
      } else {
        renderEntry();
      }
    });

    qsInput.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        if (qsInput.value) {
          if (isServerPagedEntry() && hasUnsavedActiveEdits()) return;
          qsInput.value = '';
          ENTRY_QUICK_SEARCH = '';
          if (qsClear) qsClear.style.display = 'none';
          TRIP_PAGE[EDIR] = 0;
          if (isServerPagedEntry()) { clearTimeout(entryQuickSearchTimer); loadEntryPage(EDIR); } else renderEntry();
        } else {
          qsInput.blur();
        }
      }
    });
  }

  if (qsClear) {
    qsClear.addEventListener('click', () => {
      if (isServerPagedEntry() && hasUnsavedActiveEdits()) return;
      ENTRY_QUICK_SEARCH = '';
      if (qsInput) {
        qsInput.value = '';
        qsInput.focus();
      }
      qsClear.style.display = 'none';
      TRIP_PAGE[EDIR] = 0;
      if (isServerPagedEntry()) { clearTimeout(entryQuickSearchTimer); loadEntryPage(EDIR); } else renderEntry();
    });
  }

  const quickSearchKeydown = e => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
      const qInput = $('entryQuickSearch');
      if (qInput && $('entryGridWrap') && $('entryGridWrap').style.display !== 'none') {
        e.preventDefault();
        qInput.focus();
        qInput.select();
      }
    }
  };
  document.addEventListener('keydown', quickSearchKeydown);
  __cleanups.push(() => document.removeEventListener('keydown', quickSearchKeydown));
  let tripSearchTimer;
  const DELIVERED_SEARCH = { Import: [], Export: [] };
  const DELIVERED_SORT = { Import: { key: '__ref', dir: 'desc' }, Export: { key: '__ref', dir: 'desc' } };
  function renderRuleSearch(box, dir, list, onChange, rerender) {
    if (!box) return;
    if (!list.length) list.push({ k: '__all', v: '', join: 'AND' });
    const keys = tripSearchKeys(dir);
    box.innerHTML = list.map((r, i) => {
      const selected = keys.find(c => c.k === r.k) || keys[0]; const type = selected.t;
      return `<div class="triprule" data-ix="${i}">${i ? `<select class="tripjoin" aria-label="${AR() ? 'ربط الشرط' : 'Join rule'}"><option${r.join === 'AND' ? ' selected' : ''}>AND</option><option${r.join === 'OR' ? ' selected' : ''}>OR</option><option${r.join === 'NOT' ? ' selected' : ''}>NOT</option></select>` : ''}
        <select class="tripkey" aria-label="${AR() ? 'العمود' : 'Column'}">${keys.map(c => `<option value="${esc(c.k)}"${c.k === selected.k ? ' selected' : ''}>${esc(c.h)}</option>`).join('')}</select><span class="triptype">${tripTypeLabel(type)}</span>
        ${type === 'date' || type === 'datetime' ? `<span class="datetime-control"><input class="tripvalue" type="text" value="${esc(r.v || '')}" placeholder="${type === 'date' ? (AR() ? 'مثال: 1/11 أو 24-09-2026' : 'DD-MMM-YYYY (e.g. 1/11)') : (AR() ? '24-09-2026 14:50' : 'DD-MMM-YYYY HH:mm')}" aria-label="${AR() ? 'القيمة' : 'Value'}"><button type="button" class="pickdate" onclick="__FTL__.openNativeDate(this)" title="${AR() ? 'اختيار من التقويم' : 'Choose from calendar'}">${CAL_ICON_SVG}</button><input class="native-date sr-only" type="date" tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></span>` :
          `<span class="${type === 'time' ? 'datetime-control' : 'tripvalue-wrap'}"><input class="tripvalue" type="text" value="${esc(r.v || '')}" ${type === 'time' || type === 'numericId' || type === 'number' ? 'inputmode="text"' : ''} placeholder="${type === 'time' ? (AR() ? 'مثال: 8 أو 2p أو 14:30' : 'e.g. 8 or 2p or 14:30') : type === 'text' || type === 'id' ? (AR() ? 'اكتب القيمة' : 'Type a value') : ''}" aria-label="${AR() ? 'القيمة' : 'Value'}">${type === 'time' ? `<button type="button" class="pickdate picktime" onclick="__FTL__.openTimePicker(this)" title="${AR() ? 'اختيار الوقت' : 'Choose time'}">${CLK_ICON_SVG}</button><input class="native-time sr-only" type="time" tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;">` : ''}</span>`}
        ${i ? `<button type="button" class="tripremove" title="${AR() ? 'حذف الشرط' : 'Remove rule'}">×</button>` : ''}</div>`;
    }).join('') +
      `<button class="tripadd" type="button"><span aria-hidden="true">+</span><span>${AR() ? 'شرط' : 'Rule'}</span></button><button class="tripclear" type="button">${AR() ? 'مسح' : 'Clear'}</button>`;
    box.querySelectorAll('.triprule').forEach(el => {
      const i = +el.dataset.ix;
      el.querySelector('.tripkey').onchange = e => { list[i].k = e.target.value; list[i].v = ''; rerender(); onChange(); };
      el.querySelector('.tripjoin')?.addEventListener('change', e => { list[i].join = e.target.value; onChange(); });
      el.querySelector('.tripvalue').oninput = e => {
        list[i].v = e.target.value;
        clearTimeout(tripSearchTimer);
        tripSearchTimer = setTimeout(() => { if (EDIR === dir) onChange(); }, 120);
      };
      el.querySelector('.tripremove')?.addEventListener('click', () => { list.splice(i, 1); rerender(); onChange(); });
    });
    box.querySelector('.tripadd').onclick = () => { list.push({ k: '__all', v: '', join: 'AND' }); rerender(); onChange(); };
    box.querySelector('.tripclear').onclick = () => { list.splice(0, list.length, { k: '__all', v: '', join: 'AND' }); rerender(); onChange(); };
  }
  function renderTripSearch() {
    const dir = EDIR; if (TRIP_SEARCH_DIR !== dir + LANG) TRIP_SEARCH_DIR = dir + LANG;
    renderRuleSearch($('tripSearch'), dir, TRIP_SEARCH[dir], () => {
      if (isServerPagedEntry() && hasUnsavedActiveEdits()) return;
      TRIP_PAGE[dir] = 0;
      if (isServerPagedEntry()) loadEntryPage(dir); else renderEntry();
    }, renderTripSearch);
  }
  function renderDeliveredSearch() {
    const dir = EDIR;
    renderRuleSearch($('deliveredSearch'), dir, DELIVERED_SEARCH[dir], () => { DELIVERED_PAGE = 0; renderDelivered(); }, renderDeliveredSearch);
    const key = $('deliveredSortKey'), sd = $('deliveredSortDir');
    key.innerHTML = tripSearchKeys(dir).map(c => `<option value="${esc(c.k)}">${esc(c.h)}</option>`).join('');
    key.value = DELIVERED_SORT[dir].key; sd.value = DELIVERED_SORT[dir].dir;
    sd.options[0].textContent = AR() ? 'تصاعدي ↑' : 'Ascending ↑'; sd.options[1].textContent = AR() ? 'تنازلي ↓' : 'Descending ↓';
    $('deliveredSortLabel').textContent = AR() ? 'ترتيب حسب' : 'Sort by';
  }
  $('deliveredSortKey').addEventListener('change', e => { DELIVERED_SORT[EDIR].key = e.target.value; DELIVERED_PAGE = 0; renderDelivered(); });
  $('deliveredSortDir').addEventListener('change', e => { DELIVERED_SORT[EDIR].dir = e.target.value; DELIVERED_PAGE = 0; renderDelivered(); });
  function toggleTripSelection(ref, multi = false) {
    if (EDITING && !commitEdit()) return; const selected = TRIP_SELECTED[EDIR];
    if (multi) { if (selected.has(ref)) selected.delete(ref); else selected.add(ref); } else if (selected.size === 1 && selected.has(ref)) selected.clear(); else { selected.clear(); selected.add(ref); }
    $('eBody').querySelectorAll('tr[data-r]').forEach(tr => tr.classList.toggle('trip-selected', selected.has(rowShip(EDIR, +tr.dataset.r)?.ref)));
    $('eBody').querySelectorAll('.ship-select').forEach(button => { const on = selected.has(button.dataset.ref); button.setAttribute('aria-pressed', String(on)); button.textContent = on ? '✓' : '□'; });
    $('tripCopy').textContent = AR() ? `نسخ المحدد (${selected.size})` : `Copy selected (${selected.size})`; $('tripCopy').disabled = !selected.size;
  }
  function selectedTripClipboard(dir, refs = TRIP_SELECTED[dir], scope = 'active') {
    const cols = COLS[dir];
    const clean = v => String(v ?? '').replace(/[\t\r\n]+/g, ' ').trim() || '-';
    const headers = [AR() ? 'رقم العملية' : 'Operation ref', ...cols.map(c => AR() ? (c.ar || c.h) : c.h)];
    const store = (scope === 'delivered' || scope === 'inactive') ? ARCHIVE_STORE[scope]?.[dir] : null;
    const targetEntry = store ? store.entry : ENTRY[dir];
    const targetRowmeta = store ? store.rowmeta : ROWMETA[dir];
    const targetShips = store ? store.ships : SHIPS[dir];
    const rows = targetEntry.flatMap((r, i) => {
      const shipRef = store ? targetRowmeta[i]?.ref : rowShip(dir, i)?.ref;
      if (!refs.has(shipRef)) return [];
      return [[clean(targetRowmeta[i]?.ref), ...cols.map(c => clean(c.t === 'upd' ? (targetRowmeta[i]?.updates || []).map(u => u.text).join(' | ') : displayValue(c, r[c.k])))]];
    });
    const matrix = [headers, ...rows];
    const text = matrix.map(r => r.join('\t')).join('\r\n');
    const csv = matrix.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const cell = (v, tag) => '<' + tag + ' style="border:1px solid #cbd9e3;padding:8px 10px;text-align:center;vertical-align:middle;white-space:nowrap;' + (tag === 'th' ? 'background:#0b4f7a;color:#ffffff;font-weight:700;' : 'background:#f5fafc;color:#243e50;') + '">' + esc(v) + '</' + tag + '>';
    const html = '<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table border="1" dir="ltr" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:12px"><thead><tr>' + headers.map(v => cell(v, 'th')).join('') + '</tr></thead><tbody>' + rows.map(r => '<tr>' + r.map(v => cell(v, 'td')).join('') + '</tr>').join('') + '</tbody></table></body></html>';
    return { text, csv, html, count: rows.length };
  }
  function selectedTripText(dir) { return selectedTripClipboard(dir).text; }
  async function copySelectedTrips() {
    if (!TRIP_SELECTED[EDIR].size) return; if (EDITING && !commitEdit()) return;
    return writeTripClipboard(selectedTripClipboard(EDIR));
  }
  async function writeTripClipboard(data) {
    let copied = false;
    try {
      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        await navigator.clipboard.write([new ClipboardItem({ 'text/plain': new Blob([data.text], { type: 'text/plain;charset=utf-8' }), 'text/csv': new Blob([data.csv], { type: 'text/csv;charset=utf-8' }), 'text/html': new Blob([data.html], { type: 'text/html;charset=utf-8' }) })]); copied = true;
      }
    } catch (e) { }
    if (!copied) {
      const active = document.activeElement, area = document.createElement('textarea'); area.value = data.text; area.style.cssText = 'position:fixed;left:-9999px;top:0'; __layer().appendChild(area); area.select();
      const copy = e => { e.clipboardData.setData('text/plain', data.text); e.clipboardData.setData('text/csv', data.csv); e.clipboardData.setData('text/html', data.html); e.preventDefault(); };
      __on(document, 'copy', copy); try { copied = document.execCommand('copy'); } catch (e) { } finally { document.removeEventListener('copy', copy); area.remove(); active?.focus({ preventScroll: true }); }
      if (!copied) try { await navigator.clipboard.writeText(data.text); copied = true; } catch (e) { }
    }
    toast(copied ? (AR() ? `تم نسخ ${data.count} صف بالهيدر` : `Copied ${data.count} rows with headers`) : (AR() ? 'تعذّر النسخ؛ راجع إذن الحافظة في المتصفح' : 'Copy failed; check browser clipboard permission'));
  }
  __on(document, 'copy', e => {
    if ($('deliveredModal').classList.contains('open')) {
      if (!DELIVERED_SELECTED[EDIR].size || document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return;
      if (e.clipboardData) { const data = selectedTripClipboard(EDIR, DELIVERED_SELECTED[EDIR]); e.clipboardData.setData('text/plain', data.text); e.clipboardData.setData('text/csv', data.csv); e.clipboardData.setData('text/html', data.html); e.preventDefault(); }
      return;
    }
    if (VIEW_MODE !== 'entry' || !TRIP_SELECTED[EDIR].size || document.activeElement?.matches('input,textarea,select,[contenteditable="true"]')) return;
    if (e.clipboardData) { const data = selectedTripClipboard(EDIR); e.clipboardData.setData('text/plain', data.text); e.clipboardData.setData('text/csv', data.csv); e.clipboardData.setData('text/html', data.html); e.preventDefault(); }
  });
  __on(document, 'keydown', e => {
    if ($('deliveredModal').classList.contains('open')) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && DELIVERED_SELECTED[EDIR].size && !e.target.closest('input,textarea,select,[contenteditable="true"]')) { e.preventDefault(); copyDeliveredTrips(); }
      if (e.key === 'Escape' && DELIVERED_SELECTED[EDIR].size) { DELIVERED_SELECTED[EDIR].clear(); renderDelivered(); }
      return;
    }
    if (VIEW_MODE !== 'entry' || !TRIP_SELECTED[EDIR].size) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && !e.target.closest('input,textarea,select,[contenteditable="true"]')) {
      e.preventDefault(); copySelectedTrips(); return;
    }
    if (e.key === 'Escape' && !EDITING) { TRIP_SELECTED[EDIR].clear(); renderEntry(); }
  });
  let ROWMETA = { Import: {}, Export: {} };        // idx -> {ref, user, at, updates:[{day,at,user,text}]}
  let CURSOR = { r: -1, k: null };                 // keyboard cursor
  let EDITING = null;                          // {r,k} while a cell is in edit mode
  let OPSEQ = 1, SAVED_AT = null, DIRTY = false, WORKSPACE_VERSION = 0;
  let OP_USER = 'ILS · Transport', OP_USER_ID = null;
  const opRefFor = n => `OPS-${new Date().getFullYear()}-${String(n).padStart(4, '0')}`;
  const filledRows = dir => (dir && ENTRY[dir] ? ENTRY[dir].filter(r => COLS[dir]?.some(c => cellVal(r, c.k))) : []);
  const tripRows = dir => (dir && ENTRY[dir] ? ENTRY[dir].filter(r => COLS[dir]?.some(c => cellVal(r, c.k))) : []);
  const rowShip = (dir, i) => SHIPS[dir][ROWMETA[dir][i]?.ref];
  /* Soft Concurrency & Edit Mode state (matching FCL) */
  const ACTIVE_EDIT_SHIPS = new Set();
  const SAVING_SHIPS = new Set();
  const OPENING_EDIT_SHIPS = new Set();
  const CHECKING_LOCK_SHIPS = new Set();
  let LAST_CONFLICT_SHIP = null;
  const OP_SNAPSHOTS = {};
  const LOCK_HEARTBEATS = {};
  let LAST_OPEN_MANIFEST = null;
  let MANIFEST_GRID_SCROLL = null;
  const ACTIVE_MODAL_EDIT = { ref: null, type: null, rowIndex: null };

  const isLockActive = (lockedAtUtc, timeoutMinutes = 10) => {
    if (!lockedAtUtc) return false;
    const lockTime = new Date(lockedAtUtc).getTime();
    if (isNaN(lockTime)) return false;
    return (Date.now() - lockTime) < timeoutMinutes * 60 * 1000;
  };

  const isShipLockedByOther = (ship) => {
    if (!ship || !ship.lockedByUserId) return false;
    const myId = String(ILS.user?.id || OP_USER_ID || '').toLowerCase();
    const lockerId = String(ship.lockedByUserId).toLowerCase();
    if (myId && lockerId === myId) return false;
    return isLockActive(ship.lockedAtUtc, 10);
  };

  const isModalEditActive = (ref, rowIndex, type) => {
    if (!ref) return false;
    if (ACTIVE_EDIT_SHIPS.has(ref)) return true;
    if (ACTIVE_MODAL_EDIT.ref !== ref) return false;
    if (type && ACTIVE_MODAL_EDIT.type && ACTIVE_MODAL_EDIT.type !== type) return false;
    return true;
  };

  const canMutateOperation = (ref) => {
    if (!ref) return false;
    const ship = SHIPS[EDIR]?.[ref];
    if (isShipLockedByOther(ship)) return false;
    return ACTIVE_EDIT_SHIPS.has(ref) || ACTIVE_MODAL_EDIT.ref === ref;
  };

  const isLocked = (dir, c, i) => {
    if (!c) return true;
    // When a row index is given, check if that operation is in Edit Mode
    if (i !== undefined && i !== null && i >= 0) {
      const ship = rowShip(dir, i);
      const ref = ship?.ref;
      if (!ref || !ACTIVE_EDIT_SHIPS.has(ref)) return true; // Entire table is read-only until user clicks Edit!
      if (ship?.status === 'Delivered') return true;
      if (isShipLockedByOther(ship)) return true;
    }
    // Fields permanently locked:
    if (c.k === 'vol') return true; // Number of shipments cannot be edited after creation
    if (c.k === 'loadedPackages') return true; // Loaded pkgs is strictly read-only
    if (c.auto) return true;

    // Export clearance type rules:
    if (dir === 'Export' && i !== undefined && i !== null && i >= 0) {
      const isBosla = isBoslaClr(cellVal(ENTRY[dir][i], 'clrType'));
      if (c.k === 'customs' && !isBosla) return true; // Only BOSLA allows typing in Customs Area
      if (c.k === 'cert' && isBosla) return true;    // BOSLA does not have Certificate Number
    }

    return !!(c.op && c.k !== 'cut');
  };
  const userOf = (dir, i) => LIVE ? OP_USER : (cellVal(ENTRY[dir][i], 'oper') || OP_USER);

  /* ---------- master lists ---------- */
  function suggestionsFor(src, rowIdx) {
    if (src === 'customs') {
      if (rowIdx !== undefined && rowIdx !== null && rowIdx >= 0) {
        const isBosla = isBoslaClr(cellVal(ENTRY[EDIR]?.[rowIdx], 'clrType'));
        return isBosla ? [...BOSLA_CUSTOMS] : [...CERT_CUSTOMS];
      }
      return [...BOSLA_CUSTOMS, ...CERT_CUSTOMS];
    }
    const live = new Set(MASTER[src] || []);
    if (!LIVE) DATA.forEach(r => { const v = r[src]; if (v) live.add(String(v)); });
    return [...live].filter(v => v && (src !== 'size' || !/^45(?:\D|$)/.test(v))).sort((a, b) => a.localeCompare(b));
  }
  const ADD_NEW = '__add_new__';
  let DATE_PICKING = false, TIME_PICKING = false, TIME_POPOVER = null;
  let DATE_POPOVER = null;
  function closeDatePicker() {
    if (DATE_POPOVER) { DATE_POPOVER.remove(); DATE_POPOVER = null; }
    DATE_PICKING = false;
  }
  /* writes a picked value back to the text field and lets the table / search / form react to it */
  function pickerApply(visible, value) {
    visible.value = value;
    if (!document.contains(visible)) return;
    if (visible.classList.contains('ed')) { commitEdit(); return; }
    visible.dispatchEvent(new Event('input', { bubbles: true }));
    if (!visible.classList.contains('tripvalue')) visible.dispatchEvent(new Event('change', { bubbles: true }));
    visible.focus();
  }
  function openNativeDate(button) {
    const wrapper = button.closest('.datetime-control'), visible = wrapper?.querySelector('input[type="text"]');
    if (!wrapper || !visible) return;
    let native = wrapper.querySelector('.native-date');
    if (!native) {
      native = document.createElement('input');
      native.type = 'date';
      native.className = 'native-date sr-only';
      native.tabIndex = -1;
      native.setAttribute('aria-hidden', 'true');
      native.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;';
      wrapper.appendChild(native);
    }
    const curIso = fixDate(visible.value, false);
    if (curIso) native.value = curIso;
    native.onchange = () => {
      if (native.value) {
        pickerApply(visible, fmtDay(native.value));
      }
    };
    if (typeof native.showPicker === 'function') {
      try {
        native.showPicker();
        return;
      } catch (err) { }
    }
    if (DATE_POPOVER && DATE_POPOVER._for === visible) { closeDatePicker(); return; }
    closeDatePicker(); closeTimePicker(); DATE_PICKING = true;
    const timePart = visible.classList.contains('tripvalue') ? (visible.value.match(/\b\d{1,2}:\d{2}$/) || [])[0] : null;
    const parsed = fixDate(visible.value.replace(/\s+\d{1,2}:\d{2}$/, ''), false);
    const now = new Date(), todayIso = iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
    let view = parsed ? { y: +parsed.slice(0, 4), m: +parsed.slice(5, 7) - 1 } : { y: now.getFullYear(), m: now.getMonth() };
    const pop = document.createElement('div'); pop.className = 'date-popover'; pop.setAttribute('role', 'dialog'); pop._for = visible;
    pop.setAttribute('aria-label', AR() ? 'اختيار التاريخ' : 'Choose a date');
    __layer().appendChild(pop); DATE_POPOVER = pop;
    const MONTHS = AR() ? ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'] : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const DOWS = AR() ? ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
    const first = AR() ? 6 : 0;   /* week starts Saturday in Arabic, Sunday in English */
    const render = () => {
      const { y, m } = view, days = new Date(y, m + 1, 0).getDate(), lead = (new Date(y, m, 1).getDay() - first + 7) % 7;
      let cells = ''; for (let i = 0; i < lead; i++)cells += '<span></span>';
      for (let d = 1; d <= days; d++) { const v = iso(y, m + 1, d); cells += `<button type="button" data-iso="${v}" class="${v === parsed ? 'sel' : ''}${v === todayIso ? ' today' : ''}">${d}</button>`; }
      pop.innerHTML = `<div class="dp-head"><button type="button" data-nav="-12" title="${AR() ? 'السنة السابقة' : 'Previous year'}">«</button><button type="button" data-nav="-1" title="${AR() ? 'الشهر السابق' : 'Previous month'}">‹</button><b>${MONTHS[m]} ${y}</b><button type="button" data-nav="1" title="${AR() ? 'الشهر التالي' : 'Next month'}">›</button><button type="button" data-nav="12" title="${AR() ? 'السنة التالية' : 'Next year'}">»</button></div>
        <div class="dp-dow">${DOWS.map(d => `<span>${d}</span>`).join('')}</div><div class="dp-grid">${cells}</div>
        <div class="dp-foot"><button type="button" data-today="1">${AR() ? 'اليوم' : 'Today'}</button><button type="button" data-clear="1">${AR() ? 'مسح' : 'Clear'}</button><button type="button" data-close="1">${AR() ? 'إغلاق' : 'Close'}</button></div>`;
    };
    render();
    const choose = v => { closeDatePicker(); pickerApply(visible, v ? fmtDay(v) + (timePart ? ' ' + timePart : '') : ''); };
    pop.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; e.stopPropagation();
      if (b.dataset.nav) { const n = view.m + Number(b.dataset.nav); view = { y: view.y + Math.floor(n / 12), m: ((n % 12) + 12) % 12 }; render(); return; }
      if (b.dataset.iso) { choose(b.dataset.iso); return; }
      if (b.dataset.today) { choose(todayIso); return; }
      if (b.dataset.clear) { choose(''); return; }
      if (b.dataset.close) { closeDatePicker(); visible.focus(); }
    });
    const rect = button.getBoundingClientRect(), h = pop.offsetHeight, w = pop.offsetWidth;
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - w - 8)) + 'px';
    pop.style.top = (rect.bottom + h + 8 > window.innerHeight ? Math.max(8, rect.top - h - 6) : rect.bottom + 6) + 'px';
  }
  function closeTimePicker() {
    if (TIME_POPOVER) { TIME_POPOVER.remove(); TIME_POPOVER = null; }
    TIME_PICKING = false;
  }
  function openTimePicker(button) {
    const wrapper = button.closest('.datetime-control'), visible = wrapper?.querySelector('input[type="text"]');
    if (!wrapper || !visible) return;
    let native = wrapper.querySelector('.native-time');
    if (!native) {
      native = document.createElement('input');
      native.type = 'time';
      native.className = 'native-time sr-only';
      native.tabIndex = -1;
      native.setAttribute('aria-hidden', 'true');
      native.style.cssText = 'position:absolute;opacity:0;pointer-events:none;width:0;height:0;';
      wrapper.appendChild(native);
    }
    const curTime = normTime(visible.value);
    if (curTime) native.value = curTime;
    native.onchange = () => {
      if (native.value) {
        pickerApply(visible, fmtTime12(native.value));
      }
    };
    if (typeof native.showPicker === 'function') {
      try {
        native.showPicker();
        return;
      } catch (err) { }
    }
    closeTimePicker(); TIME_PICKING = true;
    const current = normTime(visible.value) || '00:00';
    const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
    const minutes = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));
    const options = (values, value) => values.map(v => `<option value="${v}"${v === value ? ' selected' : ''}>${v}</option>`).join('');
    const pop = document.createElement('div'); pop.className = 'time-popover'; pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', AR() ? 'اختيار الوقت' : 'Choose time');
    pop.innerHTML = `<select aria-label="${AR() ? 'الساعة' : 'Hour'}">${options(hours, current.slice(0, 2))}</select><span class="time-sep">:</span><select aria-label="${AR() ? 'الدقيقة' : 'Minute'}">${options(minutes, current.slice(3, 5))}</select><button type="button">${AR() ? 'اختيار' : 'Set'}</button>`;
    __layer().appendChild(pop); TIME_POPOVER = pop; pop._for = visible; closeDatePicker();
    const rect = button.getBoundingClientRect(), height = pop.offsetHeight;
    pop.style.left = Math.max(8, Math.min(rect.left, window.innerWidth - pop.offsetWidth - 8)) + 'px';
    pop.style.top = (rect.bottom + height + 8 > window.innerHeight ? Math.max(8, rect.top - height - 6) : rect.bottom + 6) + 'px';
    pop.querySelector('button').onclick = () => {
      const selected = pop.querySelectorAll('select')[0].value + ':' + pop.querySelectorAll('select')[1].value;
      pickerApply(visible, fmtTime12(selected));
      closeTimePicker();
    };
    pop.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); closeTimePicker(); visible.focus(); } };
    pop.querySelector('select').focus();
  }
  __on(document, 'pointerdown', e => {
    if (TIME_POPOVER && !TIME_POPOVER.contains(e.target) && !e.target.closest('.picktime')) { const v = TIME_POPOVER._for; closeTimePicker(); if (v?.classList.contains('ed') && document.contains(v) && !e.target.closest('#eBody')) setTimeout(() => { if (EDITING && !document.activeElement?.classList.contains('ed')) commitEdit(); }, 0); }
    if (DATE_POPOVER && !DATE_POPOVER.contains(e.target) && !e.target.closest('.pickdate')) closeDatePicker();
  }, true);
  /* the picker buttons must not steal focus from the cell editor, otherwise the cell commits before the picker opens */
  __on(document, 'mousedown', e => { if (e.target.closest('.pickdate') || e.target.closest('.date-popover') || e.target.closest('.time-popover button')) e.preventDefault(); }, true);
  __on(document, 'keydown', e => { if (e.key === 'Escape' && (DATE_POPOVER || TIME_POPOVER)) { e.stopPropagation(); e.preventDefault(); const v = DATE_POPOVER?._for || TIME_POPOVER?._for; closeDatePicker(); closeTimePicker(); v?.focus(); } }, true);
  __on(window, 'resize', () => { closeDatePicker(); closeTimePicker(); });

  /* ---------- operation form ---------- */
  function renderOpForm() {
    const dir = EDIR, E = t('entry');
    const grid = $('opGrid'); grid.dataset.cutDraft = grid.dataset.direction === dir ? $('op_cut')?.value || '' : ''; const old = grid.dataset.direction === dir ?
      Object.fromEntries(opFields(dir).map(c => [c.k, $('op_' + c.k)?.value ?? ''])) : {};
    $('opRef').textContent = opRefFor(OPSEQ);
    $('opSub').textContent = E.opSub(dirLabel(dir));
    $('lOpCount').textContent = E.opCount;
    $('opCreate').textContent = E.opCreate;
    $('opHint').innerHTML = E.opHint;
    $('opToggle').textContent = $('opForm').classList.contains('closed') ? E.opOpen : E.opClose;
    grid.dataset.direction = dir;
    grid.innerHTML = opFields(dir).map(c => {
      const lab = AR() ? (c.ar || c.h) : c.h;
      let field;
      if (c.t === 'list') {
        const opts = suggestionsFor(c.src);
        field = `<select id="op_${c.k}" data-src="${c.src}" class="op-sel"><option value=""></option>
          ${opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
      } else if (c.t === 'date') field = `<div class="datetime-control"><input id="op_${c.k}" type="text" inputmode="text" placeholder="${AR() ? 'مثال: 1/11 أو 24-09-2026' : 'DD-MMM-YYYY (e.g. 1/11)'}" autocomplete="off"><button type="button" class="pickdate" onclick="__FTL__.openNativeDate(this)" title="${AR() ? 'اختيار من التقويم' : 'Choose from calendar'}">${CAL_ICON_SVG}</button><input class="native-date sr-only" type="date" tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></div>`;
      else if (c.t === 'time') field = `<div class="datetime-control"><input id="op_${c.k}" type="text" inputmode="text" placeholder="${AR() ? 'مثال: 8 أو 2p أو 14:30' : 'e.g. 8 or 2p or 14:30'}" autocomplete="off"><button type="button" class="pickdate picktime" onclick="__FTL__.openTimePicker(this)" title="${AR() ? 'اختيار الوقت' : 'Choose time'}">${CLK_ICON_SVG}</button><input class="native-time sr-only" type="time" tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></div>`;
      else field = `<input id="op_${c.k}" type="text" ${NUMERIC_ID_KEYS.has(c.k) ? 'inputmode="numeric"' : ''} autocomplete="off">`;
      const hint = c.k === 'pow' ? `<small class="opopt">${E.powHint}</small>` : '';
      return `<div class="opf" style="--gc:${GROUPS[c.g].c}"><label for="op_${c.k}">${lab}<small class="optype">${tripTypeLabel(tripType(c))}</small>${c.opt ? ` <em>${E.optional}</em>` : ''}</label>${field}${hint}</div>`;
    }).join('');
    opFields(dir).forEach(c => { const el = $('op_' + c.k); if (el && old[c.k] !== undefined) el.value = old[c.k]; });
    if (LIVE && $('op_oper')) { const el = $('op_oper'); el.innerHTML = `<option value="${esc(OP_USER)}">${esc(OP_USER)}</option>`; el.value = OP_USER; el.disabled = true; }
    if (dir === 'Export') { const cut = COLS.Export.find(c => c.k === 'cut'); const box = document.createElement('div'); box.className = 'opf'; box.style.setProperty('--gc', GROUPS[cut.g].c); box.innerHTML = `<label for="op_cut">${AR() ? cut.ar : cut.h} <em>(${E.optional})</em></label><div class="datetime-control"><input id="op_cut" type="text" placeholder="${AR() ? 'مثال: 1/11 أو 24-09-2026' : 'DD-MMM-YYYY (e.g. 1/11)'}" autocomplete="off"><button type="button" class="pickdate" onclick="__FTL__.openNativeDate(this)">${CAL_ICON_SVG}</button><input class="native-date sr-only" type="date" tabindex="-1" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></div>`; grid.appendChild(box); if (grid.dataset.cutDraft) $('op_cut').value = grid.dataset.cutDraft; }
  }
  function toggleOpForm() { $('opForm').classList.toggle('closed'); renderOpForm(); }
  function stepOpCount(delta) {
    const el = $('opCount'); if (!el) return;
    const raw = String(el.value || '').replace(/[^0-9]/g, '');
    const cur = Math.max(1, Math.min(200, Number(raw) || 1));
    el.value = String(Math.max(1, Math.min(200, cur + Number(delta || 0))));
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }

  function rowShipIndex(dir, r) {
    const ship = rowShip(dir, r);
    if (!ship) return -1;
    const rIdx = (ship.rows || []).indexOf(r);
    if (rIdx < 0) return 0;
    const spans = ship.shpSpans || [];
    const idx = spans.findIndex(s => s.length >= 2 && rIdx >= s[0] && rIdx < s[0] + s[1]);
    return idx >= 0 ? idx : 0;
  }
  function shipmentKeys(dir, row) {
    const id = v => normalizeDigits(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
    const no = id(row.shipNo);
    const mawbVal = id(row.mawb || (dir === 'Export' ? row.booking : row.bl));
    const hawb = id(row.hawb);
    const cert = id(row.cert);
    return {
      no: no || null,
      hawb: hawb || null,
      cert: cert || null,
      pair: mawbVal && hawb ? JSON.stringify([mawbVal, hawb]) : null,
      certShip: cert && no ? JSON.stringify([cert, no]) : null
    };
  }
  function shipmentIdentity(dir, row) { return shipmentKeys(dir, row).pair; }
  function shipmentConflict(dir, candidate, excludeRef, excludeRowIndex) {
    const wanted = shipmentKeys(dir, candidate);
    if (!wanted.no && !wanted.hawb && !wanted.pair && !wanted.cert) return null;
    const candShipIdx = excludeRowIndex !== undefined && excludeRowIndex !== null ? rowShipIndex(dir, excludeRowIndex) : -1;
    for (const d of ['Import', 'Export']) {
      const hit = (ENTRY[d] || []).find((row, i) => {
        if (excludeRef && rowShip(d, i)?.ref === excludeRef) {
          if (candShipIdx >= 0 && rowShipIndex(d, i) === candShipIdx) return false;
          if (candShipIdx < 0) return false;
        }
        const other = shipmentKeys(d, row);
        return (wanted.no && other.no && wanted.no === other.no) ||
          (wanted.hawb && other.hawb && wanted.hawb === other.hawb) ||
          (wanted.pair && other.pair && wanted.pair === other.pair) ||
          (wanted.cert && wanted.no && other.cert && other.no && wanted.cert === other.cert && wanted.no === other.no);
      });
      if (hit) {
        const other = shipmentKeys(d, hit);
        if (wanted.no && other.no && wanted.no === other.no) return AR() ? `رقم الشحنة "${candidate.shipNo}" موجود بالفعل في شحنة أخرى` : `Shipment Number "${candidate.shipNo}" already exists in another shipment`;
        if (wanted.hawb && other.hawb && wanted.hawb === other.hawb) return AR() ? `رقم البوليصة الفرعية (HAWB) "${candidate.hawb}" موجود بالفعل في شحنة أخرى` : `HAWB "${candidate.hawb}" already belongs to another shipment`;
        if (wanted.pair && other.pair && wanted.pair === other.pair) return AR() ? 'نفس بوليصة MAWB و HAWB مسجلان معاً بالفعل في شحنة أخرى' : 'The same MAWB + HAWB already belongs to another shipment';
        if (wanted.cert && wanted.no && other.cert && other.no && wanted.cert === other.cert && wanted.no === other.no) return AR() ? `رقم الشهادة "${candidate.cert}" مع رقم الشحنة "${candidate.shipNo}" مسجلان معاً بالفعل في شحنة أخرى` : `Certificate Number "${candidate.cert}" with Shipment Number "${candidate.shipNo}" already belongs to another shipment`;
      }
    }
    return null;
  }
  function cellIdentityConflict(dir, i, k, value) {
    if (!['shipNo', 'mawb', 'bl', 'booking', 'hawb', 'cert'].includes(k)) return null;
    return shipmentConflict(dir, { ...ENTRY[dir][i], [k]: value }, rowShip(dir, i)?.ref, i);
  }
  function entryIdentityValid() {
    for (const dir of ['Import', 'Export']) {
      for (let i = 0; i < ENTRY[dir].length; i++) {
        const msg = shipmentConflict(dir, ENTRY[dir][i], rowShip(dir, i)?.ref, i);
        if (msg) { toast(msg); return false; }
      }
    }
    return true;
  }
  async function createOperation() {
    if (CURRENT_TAB !== 'Import' && CURRENT_TAB !== 'Export') {
      toast(AR() ? 'يجب اختيار تبويب Import أو Export أولاً لإنشاء شحنة' : 'Please select either Import or Export tab to create a shipment', 'error');
      return;
    }
    const dir = EDIR, E = t('entry');
    const shared = {}, missing = []; let invalid = false;
    opFields(dir).forEach(c => {
      const el = $('op_' + c.k); const v = el ? String(el.value || '').trim() : '';
      if (v && v !== ADD_NEW) {
        const result = validateField(c, v); fieldFeedback(el, result); if (!result.ok) { if (!invalid) el.focus(); invalid = true; return; }
        if (c.t === 'date') { const parsed = fixDate(v, false); if (!parsed) { if (!invalid) { toast(AR() ? `تاريخ غير صحيح: ${c.ar || c.h}` : `Invalid date: ${c.h}`); $('op_' + c.k).focus(); } invalid = true; return; } shared[c.k] = parsed; }
        else if (c.t === 'time') { const parsed = normTime(v); if (!parsed) { if (!invalid) { toast(AR() ? `اكتب الوقت بنظام 24 ساعة: ${c.ar || c.h}` : `Enter 24-hour time: ${c.h}`); $('op_' + c.k).focus(); } invalid = true; return; } shared[c.k] = parsed; }
        else shared[c.k] = result.value;
      } else if (!c.opt) missing.push(AR() ? (c.ar || c.h) : c.h);
    });
    if (invalid) return;
    const conflict = shipmentConflict(dir, shared); if (conflict) { const el = $('op_mawb') || $('op_' + (dir === 'Export' ? 'booking' : 'bl')); fieldFeedback(el, { ok: false, message: conflict }); el.focus(); return; }
    if (missing.length) { toast(E.opMissing(missing.join('، '))); return; }
    if (dir === 'Export' && !shared.pow) shared.pow = shared.pol;              /* POW defaults to POL */
    const count = validateField({ k: 'opCount', t: 'num' }, $('opCount').value); if (!count.ok || !count.value) { fieldFeedback($('opCount'), { ok: false, message: AR() ? 'عدد الحاويات لازم يكون من 1 إلى 200' : 'Container count must be 1–200' }); $('opCount').focus(); return; }
    const n = Number(count.value);
    if (dir === 'Export') { const cut = $('op_cut')?.value.trim(); if (cut) { const check = validateField(COLS.Export.find(c => c.k === 'cut'), cut); if (!check.ok) { fieldFeedback($('op_cut'), check); return; } shared.cut = fixDate(cut, false) || ''; } }
    let created = null;
    if (LIVE) {
      shared.oper = OP_USER;
      try {
        if (!ILS.api?.createOperation) throw Error('Create operation endpoint unavailable');
        created = await ILS.api.createOperation({ direction: dir, containerCount: n, shared, requestId: crypto.randomUUID() });
        if (!created?.ref || !Array.isArray(created.trips) || created.trips.length !== n) throw Error('Invalid create operation response');
      } catch (e) { toast(e.message || 'Could not create operation'); return; }
    }
    const ref = created?.ref || opRefFor(OPSEQ++), at = created?.at || nowHM(), day = created?.day || today();
    const user = LIVE ? OP_USER : (shared.oper || OP_USER);
    const idxs = [];
    for (let i = 0; i < n; i++) {
      const row = { ...shared, vol: String(n), status: 'Open' };
      if (dir === 'Export') { row.customs = shared.clrType === 'BOSLA' ? '' : (shared.clrType === 'CERT' ? 'Cairo Airport Customs' : ''); }
      const idx = ENTRY[dir].length;
      ROWMETA[dir][idx] = { id: created?.trips[i]?.id || null, ref, user, at, day, updates: [] };
      ENTRY[dir].push(row); idxs.push(idx);
    }
    SHIPS[dir][ref] = { ref, dir, rows: idxs, unmerged: new Set(), at, day, user, status: 'Open' };
    if (LAST_COUNTS) {
      if (dir === 'Import') LAST_COUNTS.activeImportCount = (LAST_COUNTS.activeImportCount || 0) + 1;
      if (dir === 'Export') LAST_COUNTS.activeExportCount = (LAST_COUNTS.activeExportCount || 0) + 1;
      setCounts(LAST_COUNTS);
    }
    TRIP_SEARCH[dir] = [{ k: '__tripNo', v: '', join: 'AND' }]; renderTripSearch();
    TRIP_SORT[dir] = { key: '__tripNo', dir: 'asc' };
    opFields(dir).forEach(c => { if (c.src && shared[c.k] && c.src !== 'clrType') MASTER[c.src] = [...new Set([...(MASTER[c.src] || []), shared[c.k]])].sort(); });
    ['mawb', 'bl', 'booking', 'free', 'reqDate', 'reqTime', 'cut'].forEach(k => { const el = $('op_' + k); if (el) el.value = ''; });
    $('opCount').value = 1;
    markDirty(); renderEntry();
    setTab(dir);
    __emit('tabChange', dir);
    __emit('countsChanged');
    toast(E.opCreated(n, ref));
    const firstEditable = COLS[dir].find(c => !isLocked(dir, c));
    setCursor(idxs[0], firstEditable.k, true);
  }

  /* ---------- merge model ---------- */
  /* a column is merged for a shipment when it is mergeable and not un-merged by the user */
  /* FTL Airport merge levels
     op  – one value for the whole operation (MAWB level). Always merged, never split.
     shp – shipment identity (Shipment Number, HAWB, Certificate Number). Merged when the
           operation is ONE shipment; one value per row when a truck carries several shipments.
     trk – truck, driver, gate and Latest Updates. One value per truck: merged over the
           shipment rows that truck carries, never merged across different trucks. */
  const MERGE_LEVEL = {
    trk: new Set(['trucker', 'truckType', 'cntr', 'driver', 'mob', 'gateIn', 'gateInT', 'gateOut', 'gateOutT', 'updates', 'updDate', 'transInv', 'arrDate', 'arrTime', 'reqDate', 'reqTime']),
    shp: new Set(['shipNo', 'size', 'hawb', 'cert', 'customs', 'client', 'mawb', 'bl', 'booking', 'packages', 'weight', 'commodity', 'cbm', 'line', 'dest', 'fullAddress', 'aod', 'clrType', 'invRcv', 'missDoc', 'missRcv']),
    row: new Set(['loadedPackages', 'loadStatus']),
    op: new Set(['vol', 'movement', 'status', 'oper'])
  };
  const FIXED_LISTS = new Set(['clrType', 'truckType', 'customs']);
  const colLevel = c => !c ? 'row' : MERGE_LEVEL.row.has(c.k) ? 'row' : MERGE_LEVEL.trk.has(c.k) ? 'trk' : MERGE_LEVEL.op.has(c.k) ? 'op' : MERGE_LEVEL.shp.has(c.k) ? 'shp' : isMergeCol(c) ? 'shp' : 'row';
  const shipPer = ship => { const n = ship?.rows?.length || 0, p = Math.max(1, Number(ship?.per) || 1); return p > 1 && n % p === 0 ? p : 1; };
  /* FTL Airport layout — an operation has S shipments and T trucks, two independent counts.
     Rows = max(S,T). Shipment columns are S cells spread over the rows, truck columns are T cells,
     operation columns (Number of Shipments, Movement Type, Status) are one cell, and row columns
     (Arrival Date / Time) are one per row. Transporter is merged over the operation unless un-merged. */
  function evenSpans(n, R) {
    n = Math.max(1, Math.min(Math.floor(Number(n)) || 1, R));
    const base = Math.floor(R / n);
    const rem = R % n;
    const lens = new Array(n).fill(base);
    if (rem > 0) {
      // Distribute extra rows symmetrically starting from the center outward
      const center = (n - 1) / 2;
      const order = [...Array(n).keys()].sort((a, b) => {
        const da = Math.abs(a - center), db = Math.abs(b - center);
        return da !== db ? da - db : a - b;
      });
      for (let i = 0; i < rem; i++) {
        lens[order[i]]++;
      }
    }
    const out = [];
    let start = 0;
    for (let i = 0; i < n; i++) {
      out.push([start, lens[i]]);
      start += lens[i];
    }
    return out;
  }
  function dataSpans(dir, idxs, keys, blankSeparate = false) {
    if (!idxs.length) return [];
    const sig = i => keys.map(k => k === 'updates' ? JSON.stringify(ROWMETA[dir][i]?.updates || []) : String(ENTRY[dir][i]?.[k] ?? '').trim().toUpperCase()).join('\u0001');
    const blank = s => !s.replace(/\u0001/g, '').trim() || s.replace(/\u0001/g, '') === '[]';
    const out = []; let start = 0, cur = sig(idxs[0]);
    for (let r = 1; r <= idxs.length; r++) { const s = r < idxs.length ? sig(idxs[r]) : null; if (r === idxs.length || s !== cur || (blankSeparate && blank(cur))) { out.push([start, r - start]); start = r; cur = s; } }
    return out;
  }
  const validSpans = (spans, R) => Array.isArray(spans) && spans.length && spans.every(s => Array.isArray(s) && s.length === 2 && Number.isInteger(s[0]) && Number.isInteger(s[1]) && s[1] > 0) && spans[0][0] === 0 && spans.every((s, i) => i === 0 || s[0] === spans[i - 1][0] + spans[i - 1][1]) && spans[spans.length - 1][0] + spans[spans.length - 1][1] === R;
  const laneKeys = (dir, lane) => COLS[dir].filter(c => colLevel(c) === lane).map(c => c.k);

  function ensureContiguousTrucks(dir, ship) {
    if (!ship || !ship.rows || ship.rows.length <= 1) return false;
    const R = ship.rows.length;
    const rows = ENTRY[dir];
    if (!rows) return false;

    const origRows = ship.rows.slice();
    const origTrkOf = (ship.trkOf || trkOfFromSpans(ship.trkSpans, R)).slice();

    // Map each truck number to its plate so all rows of the same truck share the same key
    const trkNoToPlate = new Map();
    origRows.forEach((rx, rIdx) => {
      const tNo = origTrkOf?.[rIdx];
      const plate = (rows[rx]?.cntr || '').trim().toUpperCase();
      if (tNo !== undefined && tNo !== null && plate && !trkNoToPlate.has(tNo)) {
        trkNoToPlate.set(tNo, plate);
      }
    });

    // Helper to get truck key for a row
    const getTrkKey = (rx, rIdx) => {
      const plate = (rows[rx]?.cntr || '').trim().toUpperCase();
      if (plate) return 'p:' + plate;
      const origIdx = origRows.indexOf(rx);
      const tNo = (origIdx >= 0 ? origTrkOf[origIdx] : null) ?? ship.trkOf?.[rIdx];
      if (tNo !== null && tNo !== undefined) {
        const known = trkNoToPlate.get(tNo);
        if (known) return 'p:' + known;
        return 't:' + tNo;
      }
      return 'r:' + rx;
    };

    // Helper to get shipment key for a row
    const getShpKey = (rx, rIdx) => {
      const sNo = (rows[rx]?.shipNo || '').trim().toUpperCase();
      if (sNo) return 'no:' + sNo;
      const hawb = (rows[rx]?.hawb || '').trim().toUpperCase();
      if (hawb) return 'h:' + hawb;
      const mawb = (rows[rx]?.mawb || rows[rx]?.bl || rows[rx]?.booking || '').trim().toUpperCase();
      if (mawb) return 'mawb:' + mawb;
      if (Array.isArray(ship.shpSpans)) {
        const spanIdx = ship.shpSpans.findIndex(([st, len]) => rIdx >= st && rIdx < st + len);
        if (spanIdx >= 0) return 's:' + spanIdx;
      }
      return 'rx:' + rx;
    };

    const trkKeys = ship.rows.map((rx, rIdx) => getTrkKey(rx, rIdx));
    const shpKeys = ship.rows.map((rx, rIdx) => getShpKey(rx, rIdx));

    // Map truck key -> Set of shipment keys it belongs to
    const truckToShipments = new Map();
    ship.rows.forEach((rx, rIdx) => {
      const tKey = trkKeys[rIdx];
      const sKey = shpKeys[rIdx];
      if (!truckToShipments.has(tKey)) truckToShipments.set(tKey, new Set());
      truckToShipments.get(tKey).add(sKey);
    });

    const isSharedTruck = tKey => (truckToShipments.get(tKey)?.size || 0) > 1;

    // Only run contiguous optimization if there is at least one shared truck across shipments
    const hasAnyShared = [...truckToShipments.keys()].some(isSharedTruck);
    if (!hasAnyShared) {
      return false;
    }

    // Group rows by shipment key in order of initial appearance
    const shipmentOrder = [];
    const shipmentGroups = new Map();
    shpKeys.forEach((sKey, rIdx) => {
      if (!shipmentGroups.has(sKey)) {
        shipmentOrder.push(sKey);
        shipmentGroups.set(sKey, []);
      }
      shipmentGroups.get(sKey).push({
        rx: ship.rows[rIdx],
        rIdx,
        tKey: trkKeys[rIdx]
      });
    });

    // Check if both shipments and trucks are ALREADY contiguous
    let shpContiguous = true;
    const seenShp = new Set();
    let prevShp = null;
    for (const s of shpKeys) {
      if (s !== prevShp) {
        if (seenShp.has(s)) { shpContiguous = false; break; }
        seenShp.add(s);
        prevShp = s;
      }
    }

    let trkContiguous = true;
    const seenTrk = new Set();
    let prevTrk = null;
    for (const t of trkKeys) {
      if (t !== prevTrk) {
        if (seenTrk.has(t)) { trkContiguous = false; break; }
        seenTrk.add(t);
        prevTrk = t;
      }
    }

    if (shpContiguous && trkContiguous) {
      return false;
    }

    // Order shipments so that shipments sharing a truck are placed adjacent to each other
    const orderedShipments = [];
    const unvisited = new Set(shipmentOrder);

    while (unvisited.size > 0) {
      let cur = null;
      if (orderedShipments.length > 0) {
        const lastShp = orderedShipments[orderedShipments.length - 1];
        const lastSharedTrucks = new Set(
          shipmentGroups.get(lastShp).map(item => item.tKey).filter(isSharedTruck)
        );
        for (const cand of unvisited) {
          const candTrucks = shipmentGroups.get(cand).map(item => item.tKey);
          if (candTrucks.some(t => lastSharedTrucks.has(t))) {
            cur = cand;
            break;
          }
        }
      }
      if (!cur) {
        for (const s of shipmentOrder) {
          if (unvisited.has(s)) { cur = s; break; }
        }
      }
      unvisited.delete(cur);
      orderedShipments.push(cur);
    }

    // Order rows within each shipment:
    // If S[i] shares truck with S[i-1], put that truck at the START.
    // If S[i] shares truck with S[i+1], put that truck at the END.
    const newRows = [];
    const newShpSpans = [];
    let startRow = 0;

    orderedShipments.forEach((sKey, sIdx) => {
      const items = shipmentGroups.get(sKey).slice();
      let tPrev = null;
      if (sIdx > 0) {
        const prevKey = orderedShipments[sIdx - 1];
        const prevTrucks = new Set(shipmentGroups.get(prevKey).map(it => it.tKey).filter(isSharedTruck));
        const match = items.find(it => prevTrucks.has(it.tKey));
        if (match) tPrev = match.tKey;
      }

      let tNext = null;
      if (sIdx < orderedShipments.length - 1) {
        const nextKey = orderedShipments[sIdx + 1];
        const nextTrucks = new Set(shipmentGroups.get(nextKey).map(it => it.tKey).filter(isSharedTruck));
        const match = items.find(it => nextTrucks.has(it.tKey));
        if (match) tNext = match.tKey;
      }

      items.sort((a, b) => {
        if (tPrev && a.tKey === tPrev && b.tKey !== tPrev) return -1;
        if (tPrev && b.tKey === tPrev && a.tKey !== tPrev) return 1;
        if (tNext && a.tKey === tNext && b.tKey !== tNext) return 1;
        if (tNext && b.tKey === tNext && a.tKey !== tNext) return -1;
        return a.rIdx - b.rIdx;
      });

      const spanLen = items.length;
      newShpSpans.push([startRow, spanLen]);
      startRow += spanLen;

      items.forEach(it => newRows.push(it.rx));
    });

    if (newRows.length === R) {
      ship.rows = newRows;
      ship.shpSpans = newShpSpans;
      ship.per = newShpSpans.length;

      // Recompute trkSpans and trkOf preserving existing truck groupings
      const finalTrkKeys = ship.rows.map((rx, rIdx) => getTrkKey(rx, rIdx));

      const newTrkSpans = [];
      const newTrkOf = new Array(R).fill(1);
      let tStart = 0;
      let truckNum = 1;

      for (let r = 1; r <= R; r++) {
        const prevKey = finalTrkKeys[r - 1];
        const curKey = r < R ? finalTrkKeys[r] : null;
        if (r === R || curKey !== prevKey) {
          const spanLen = r - tStart;
          newTrkSpans.push([tStart, spanLen]);
          for (let j = tStart; j < r; j++) {
            newTrkOf[j] = truckNum;
          }
          truckNum++;
          tStart = r;
        }
      }

      ship.trkSpans = newTrkSpans;
      ship.trkOf = newTrkOf;

      // Sync truck-level metadata across merged truck spans
      newTrkSpans.forEach(([st, len]) => {
        if (len > 1) {
          const headRow = rows[ship.rows[st]] || {};
          for (let j = st + 1; j < st + len; j++) {
            const row = rows[ship.rows[j]];
            if (row) {
              row.cntr = headRow.cntr || row.cntr;
              if (headRow.driver) row.driver = headRow.driver;
              if (headRow.mob) row.mob = headRow.mob;
              if (headRow.truckType) row.truckType = headRow.truckType;
              if (headRow.trucker) row.trucker = headRow.trucker;
            }
          }
        }
      });

      return true;
    }
    return false;
  }

  function computeAllocLoadStatus(ship, dir, allocations, sum) {
    if (!sum || sum <= 0 || !Array.isArray(allocations) || !allocations.length) return '';
    const rows = ENTRY[dir] || [];
    const allFull = allocations.every(a => {
      const sIdx = a.shpIdx;
      const sSpan = ship?.shpSpans?.[sIdx];
      const sRow = sSpan ? rows[ship.rows[sSpan[0]]] : null;
      const sTot = parseInt(normalizeDigits(sRow?.packages || '0'), 10) || 0;
      return sTot > 0 && (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0) >= sTot;
    });
    return allFull ? 'Full' : 'Partial';
  }

  function layoutShip(dir, ship, opts = {}) {
    const inShpSpans = opts.shpSpans || ship.shpSpans;
    const inTrkSpans = opts.trkSpans || ship.trkSpans;
    const inTrkOf = opts.trkOf || ship.trkOf;
    const shp = Number(opts.shp) || Number(ship.initialShipCount || 0) || (Array.isArray(inShpSpans) ? inShpSpans.length : 0);
    const trk = Number(opts.trk) || Number(ship.targetTruckCount || 0) || (Array.isArray(inTrkSpans) ? inTrkSpans.length : 0);

    // Universal invariant: ensure the main table rows NEVER exceed max(shp, trk)!
    const maxAllowedRows = Math.max(shp || 0, trk || 0);
    if (maxAllowedRows > 0 && ship.rows && ship.rows.length > maxAllowedRows) {
      ship.rows = ship.rows.slice(0, maxAllowedRows);
    }
    const R = ship.rows.length; ship.unmerged = ship.unmerged || new Set();
    if (!R) { ship.shpSpans = []; ship.trkSpans = []; ship.trkOf = []; ship.per = 1; return ship; }

    // In Shipments > Trucks: enforce exactly S shipment rows and T truck spans strictly without duplicates or unassigned rows
    if (shp > 0 && trk > 0 && shp > trk) {
      ship.shpSpans = evenSpans(shp, R);
      ship.trkSpans = evenSpans(trk, R);
      ship.trkOf = trkOfFromSpans(ship.trkSpans, R);
      ship.per = ship.shpSpans.length;
      return ship;
    }

    // If explicit shipment/truck counts were given (e.g. from createOperation), respect them 100%
    if (shp > 0 && trk > 0 && (opts.shp !== undefined || opts.trk !== undefined)) {
      ship.shpSpans = evenSpans(shp, R);
      ship.trkSpans = evenSpans(trk, R);
      ship.trkOf = trkOfFromSpans(ship.trkSpans, R);
      ship.per = ship.shpSpans.length;
      return ship;
    }

    const validTrkOf = Array.isArray(inTrkOf) && inTrkOf.length === R && inTrkOf.every(v => Number.isInteger(v) && v >= 0);
    if (validTrkOf) ship.trkOf = inTrkOf.slice(); else ship.trkOf = null;
    if (validTrkOf && validSpans(inShpSpans, R)) {
      ship.shpSpans = inShpSpans.map(s => [s[0], s[1]]);
      ship.trkSpans = spansFromTrkOf(ship.trkOf);
    }
    else if (validSpans(inShpSpans, R) && validSpans(inTrkSpans, R)) {
      ship.shpSpans = inShpSpans.map(s => [s[0], s[1]]);
      ship.trkSpans = inTrkSpans.map(s => [s[0], s[1]]);
    }
    else if (shp > 0 && trk > 0) {
      ship.shpSpans = evenSpans(shp, R);
      ship.trkSpans = evenSpans(trk, R);
      ship.trkOf = trkOfFromSpans(ship.trkSpans, R);
    }
    else {
      let sp = dataSpans(dir, ship.rows, laneKeys(dir, 'shp'));
      const want = shp || parseInt(normalizeDigits(cellVal(ENTRY[dir][ship.rows[0]], 'vol')), 10) || 0;
      if (want > sp.length && want <= R) sp = evenSpans(want, R);
      ship.shpSpans = sp;
      ship.trkSpans = trk > 0 ? evenSpans(trk, R) : dataSpans(dir, ship.rows, laneKeys(dir, 'trk').filter(k => k !== 'trucker'), true);
      const tv = new Set(ship.rows.map(i => cellVal(ENTRY[dir][i], 'trucker').toUpperCase()).filter(Boolean));
      if (tv.size > 1) ship.unmerged.add('trucker');
    }
    if (!Array.isArray(ship.trkOf) || ship.trkOf.length !== R) ship.trkOf = trkOfFromSpans(ship.trkSpans, R);
    ship.trkSpans = spansFromTrkOf(ship.trkOf);
    ship.per = ship.shpSpans.length;
    return ship;
  }
  const trkOfFromSpans = (spans, R) => { const out = new Array(R).fill(1); (spans || []).forEach(([a, l], k) => { for (let r = a; r < a + l && r < R; r++)out[r] = k + 1; }); return out; };
  const spansFromTrkOf = trkOf => { const out = []; let start = 0; for (let r = 1; r <= trkOf.length; r++) { if (r === trkOf.length || trkOf[r] !== trkOf[start]) { out.push([start, r - start]); start = r; } } return out; };
  const truckNumbers = ship => [...new Set(ship?.trkOf || [])].filter(v => v > 0).sort((a, b) => a - b);
  const truckCount = ship => Number(ship?.targetTruckCount) || truckNumbers(ship).length || 1;
  const spanIn = (spans, ri) => { const sp = (spans || []).find(([a, l]) => ri >= a && ri < a + l); return sp ? { start: sp[0], len: sp[1] } : { start: ri, len: 1 }; };
  function spanOf(ship, c, ri) {
    const n = ship.rows.length;
    const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
    if (isSGreater && (c.k === 'loadedPackages' || c.k === 'loadStatus')) {
      return spanIn(ship.trkSpans, ri);
    }
    const lv = colLevel(c);
    if (lv === 'op') return { start: 0, len: n };
    if (lv === 'row') return { start: ri, len: 1 };
    if (!validSpans(ship.shpSpans, n) || !validSpans(ship.trkSpans, n) || !Array.isArray(ship.trkOf) || ship.trkOf.length !== n) layoutShip(ship.dir, ship, { shpSpans: ship.shpSpans, trkSpans: ship.trkSpans, trkOf: ship.trkOf });
    if (lv === 'trk') { if (c.k === 'trucker' && !ship.unmerged.has('trucker')) return { start: 0, len: n }; return spanIn(ship.trkSpans, ri); }
    return spanIn(ship.shpSpans, ri);   /* shipment columns: one cell per shipment */
  }
  function groupRows(ship, c, i) {
    const ri = ship.rows.indexOf(i); if (ri < 0) return [i];
    const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
    if ((colLevel(c) === 'trk' || (isSGreater && (c.k === 'loadedPackages' || c.k === 'loadStatus'))) && !(c.k === 'trucker' && !ship.unmerged.has('trucker'))) {
      spanOf(ship, c, ri);
      const n = (ship.trkOf && ship.trkOf[ri] !== undefined) ? ship.trkOf[ri] : (ri + 1);
      return ship.rows.filter((_, k) => ((ship.trkOf && ship.trkOf[k] !== undefined) ? ship.trkOf[k] : (k + 1)) === n);
    }
    const sp = spanOf(ship, c, ri); return ship.rows.slice(sp.start, sp.start + sp.len);
  }
  const mergedFor = (ship, c) => !!ship && spanOf(ship, c, 0).len === ship.rows.length;
  const canToggleShip = (ship, c) => false;   /* FTL Airport: merge layout follows the business rules, no manual Merge / Unmerge */
  function shipmentUpdateLog(dir, rows) {
    const seen = new Set(); return rows.flatMap(i => ROWMETA[dir][i]?.updates || []).filter(u => { const key = JSON.stringify(u); if (seen.has(key)) return false; seen.add(key); return true; }).sort((a, b) => (a.day + ' ' + a.at).localeCompare(b.day + ' ' + b.at));
  }
  let mergeConfirmCallback = null;
  function openMergeConfirmModal({ title, sub, msg, confirmTxt, onConfirm }) {
    mergeConfirmCallback = onConfirm;
    const isAr = AR();
    const titleEl = $('ftlMergeConfirmTitle');
    if (titleEl) titleEl.textContent = title || (isAr ? 'دمج العمود للشحنة' : 'Merge Column Values');
    const subEl = $('ftlMergeConfirmSub');
    if (subEl) subEl.textContent = sub || (isAr ? 'تنبيه اختلاف القيم بين النقلات' : 'Different Values Detected');
    const msgEl = $('ftlMergeConfirmMsg');
    if (msgEl) msgEl.textContent = msg || (isAr ? 'القيم مختلفة. الدمج هيستخدم قيمة أول نقلة لكل الشحنة. تكمل؟' : 'Values differ. Merge will use the first trip’s value for the whole shipment. Continue?');
    const cancelEl = $('ftlMergeConfirmCancel');
    if (cancelEl) cancelEl.textContent = isAr ? 'إلغاء' : 'Cancel';
    const okTxtEl = $('ftlMergeConfirmOkTxt');
    if (okTxtEl) okTxtEl.textContent = confirmTxt || (isAr ? 'نعم، ادمج' : 'Yes, Merge');

    const okBtn = $('ftlMergeConfirmOk');
    if (okBtn) {
      okBtn.onclick = () => {
        closeM('ftlMergeConfirmModal');
        if (typeof mergeConfirmCallback === 'function') {
          const cb = mergeConfirmCallback;
          mergeConfirmCallback = null;
          cb();
        }
      };
    }
    const cancelBtn = $('ftlMergeConfirmCancel');
    if (cancelBtn) {
      cancelBtn.onclick = () => {
        mergeConfirmCallback = null;
        closeM('ftlMergeConfirmModal');
      };
    }

    $('ftlMergeConfirmModal')?.classList.add('open');
  }

  function toggleMerge(ref, k) {
    const ship = SHIPS[EDIR][ref], col = COLS[EDIR].find(c => c.k === k);
    if (!ship || !canToggleMerge(EDIR, col)) return;
    if (EDITING && !commitEdit()) return;
    if (ship.unmerged.has(k)) {
      if (col.t === 'upd') {
        const log = shipmentUpdateLog(EDIR, ship.rows);
        ship.rows.forEach(i => { ROWMETA[EDIR][i].updates = log.map(u => ({ ...u })); });
        ship.unmerged.delete(k); toast(t('entry').merged);
        markDirty(); renderEntry();
      } else {
        const values = ship.rows.map(i => String(ENTRY[EDIR][i][k] ?? ''));
        const executeColMerge = () => {
          const v = ENTRY[EDIR][ship.rows[0]][k];
          ship.rows.forEach(i => ENTRY[EDIR][i][k] = v);
          ship.unmerged.delete(k);
          toast(t('entry').merged);
          markDirty();
          renderEntry();
        };

        if (new Set(values).size > 1) {
          if (isLocked(EDIR, col)) { toast(AR() ? 'القيم المقفولة مختلفة؛ تفضل منفصلة للحفاظ عليها' : 'Locked values differ; they must remain separate'); return; }
          openMergeConfirmModal({
            title: AR() ? 'دمج العمود للشحنة' : 'Merge Column Values',
            sub: AR() ? 'اكتشاف اختلاف القيم بين النقلات' : 'Different Values Detected',
            msg: AR() ? 'القيم مختلفة. الدمج هيستخدم قيمة أول نقلة لكل الشحنة. تكمل؟' : 'Values differ. Merge will use the first trip’s value for the whole shipment. Continue?',
            confirmTxt: AR() ? 'نعم، ادمج' : 'Yes, Merge',
            onConfirm: () => executeColMerge()
          });
          return;
        }
        executeColMerge();
      }
    } else { ship.unmerged.add(k); toast(t('entry').unmerged); markDirty(); renderEntry(); }
  }
  function recalculateTruckSpans(dir, ship) {
    if (!ship || !ship.rows || ship.rows.length <= 1) return;
    const isSGreater = ship.shpSpans && ship.shpSpans.length > truckCount(ship);
    if (isSGreater) return;
    const R = ship.rows.length;
    const plates = ship.rows.map(ix => (ENTRY[dir][ix]?.cntr || '').trim().toUpperCase());
    if (!plates.some(Boolean)) return;
    const trkOf = ship.trkOf || trkOfFromSpans(ship.trkSpans, R);

    const newSpans = [];
    let start = 0;
    for (let r = 1; r <= R; r++) {
      if (r === R) {
        newSpans.push([start, r - start]);
        break;
      }
      const prevPlate = plates[r - 1];
      const curPlate = plates[r];
      const bothNamedAndDifferent = prevPlate && curPlate && prevPlate !== curPlate;
      const sameTruck = trkOf && trkOf[r - 1] > 0 && trkOf[r] > 0 && (trkOf[r - 1] === trkOf[r]);

      let same;
      if (bothNamedAndDifferent) {
        same = false;
      } else {
        // Preserve defined truck grouping from layout/trkOf; do not merge rows just because plates match
        same = !!sameTruck;
      }

      if (!same) {
        newSpans.push([start, r - start]);
        start = r;
      }
    }
    if (validSpans(newSpans, R)) {
      ship.trkSpans = newSpans;
      ship.trkOf = trkOfFromSpans(newSpans, R);
      newSpans.forEach(([st, len]) => {
        if (len > 1) {
          const headRow = ENTRY[dir][ship.rows[st]] || {};
          for (let j = st + 1; j < st + len; j++) {
            const row = ENTRY[dir][ship.rows[j]];
            if (row) {
              row.cntr = headRow.cntr || row.cntr;
              if (headRow.driver) row.driver = headRow.driver;
              if (headRow.mob) row.mob = headRow.mob;
              if (headRow.truckType) row.truckType = headRow.truckType;
              if (headRow.trucker) row.trucker = headRow.trucker;
            }
          }
        }
      });
    }
  }

  /* writing to a merged cell writes to every row of the shipment */
  function setCell(i, k, v) {
    const dir = EDIR, col = COLS[dir].find(c => c.k === k), ship = rowShip(dir, i);
    if (!col || isLocked(dir, col, i)) return;
    {
      const isBosla = isBoslaClr(cellVal(ENTRY[dir][i], 'clrType'));
      if (v && ((k === 'cert' && isBosla) || (k === 'customs' && !isBosla))) {
        toast(k === 'cert' ? (AR() ? 'التخليص بوليصة (BOSLA) — مفيش رقم شهادة' : 'BOSLA clearance — no Certificate Number') : (AR() ? 'التخليص شهادة (CERT) — منطقة الجمارك محددة تلقائياً بـ Cairo Airport Customs وغير قابلة للتعديل' : 'CERT clearance — Customs Area is fixed to Cairo Airport Customs and locked'));
        return false;
      }
    }
    if (k === 'loadedPackages' && ship) {
      const ri = ship.rows.indexOf(i);
      const isSGreater = ship.shpSpans && ship.shpSpans.length > truckCount(ship);
      const trkNo = ship.trkOf?.[ri];
      const hasTruck = (ENTRY[dir][i]?.cntr && ENTRY[dir][i].cntr.trim()) || (trkNo && trkNo > 0);
      if (isSGreater && !hasTruck) {
        toast(AR() ? 'يرجى تعيين شاحنة لهذه الشحنة أولاً من بيان الشاحنة (Truck Manifest)' : 'Please assign a truck to this shipment first');
        return false;
      }
    }
    const result = validateField(col, v); if (!result.ok) return false; v = result.value;
    if (k === 'missDoc') v = cleanDocValue(v);
    else if (k === 'car' && v) v = String(v).trim().toUpperCase();
    else if (k === 'driver' && v) v = titleCase(String(v).trim());
    else if (k === 'mob' && v) v = String(v).replace(/\s+/g, ' ').trim();
    else if (k === 'client' && v) v = normClient(v) || String(v).trim();
    else if (k === 'line' && v) v = normLine(v) || String(v).trim();
    else if (['dest', 'aod', 'pod', 'pol', 'pow'].includes(k) && v) v = normSite(v) || String(v).trim();
    else if (k === 'trucker' && v) v = normTrucker(v) || String(v).trim();
    else if (k === 'clrType') {
      v = normClr(v);
      const isB = v === 'BOSLA';
      const targetRows = ship ? groupRows(ship, col, i) : [i];
      targetRows.forEach(r => {
        if (isB) {
          if (ENTRY[dir][r]?.cert) ENTRY[dir][r].cert = '';
          if (ENTRY[dir][r]?.customs === 'Cairo Airport Customs') ENTRY[dir][r].customs = '';
        } else if (v === 'CERT') {
          ENTRY[dir][r].customs = 'Cairo Airport Customs';
        }
      });
    }
    const conflict = cellIdentityConflict(dir, i, k, v); if (conflict) { toast(conflict); return false; }
    if (ship) {
      const rowsToUpdate = new Set(groupRows(ship, col, i));
      rowsToUpdate.forEach(r => ENTRY[dir][r][k] = v);
    }
    else ENTRY[dir][i][k] = v;
    if (col.src && v && !FIXED_LISTS.has(col.src)) MASTER[col.src] = [...new Set([...(MASTER[col.src] || []), v])].sort();

    /* Driver Mobile <-> Driver Name Auto-Fill */
    if (k === 'mob' && v) {
      const cleanMob = String(v).replace(/\s+/g, '');
      const allRows = [...(ENTRY.Import || []), ...(ENTRY.Export || []), ...(DATA || [])];
      const match = allRows.find(r => r.mob && String(r.mob).replace(/\s+/g, '') === cleanMob && r.driver && r.driver.trim());
      if (match && !ENTRY[dir][i].driver) {
        const rows = ship ? groupRows(ship, col, i) : [i];
        rows.forEach(r => { ENTRY[dir][r].driver = match.driver; });
        toast(AR() ? `تم التعرف على السائق: ${match.driver}` : `Driver recognized: ${match.driver}`);
      }
    } else if (k === 'driver' && v) {
      const cleanDriver = String(v).trim().toLowerCase();
      const allRows = [...(ENTRY.Import || []), ...(ENTRY.Export || []), ...(DATA || [])];
      const match = allRows.find(r => r.driver && String(r.driver).trim().toLowerCase() === cleanDriver && r.mob && r.mob.trim());
      if (match && !ENTRY[dir][i].mob) {
        const rows = ship ? groupRows(ship, col, i) : [i];
        rows.forEach(r => { ENTRY[dir][r].mob = match.mob; });
        toast(AR() ? `تم ملء رقم الهاتف: ${match.mob}` : `Phone auto-filled: ${match.mob}`);
      }
    }

    /* Truck Plate Auto-Fill and dynamic span merging when consecutive rows share the same plate */
    if (k === 'cntr') {
      const cleanPlate = String(v || '').trim().toUpperCase();
      if (cleanPlate) {
        const allRows = [...(ENTRY.Import || []), ...(ENTRY.Export || []), ...(DATA || [])];
        const match = allRows.find((r) => r !== ENTRY[dir][i] && r.cntr && String(r.cntr).trim().toUpperCase() === cleanPlate && (r.driver || r.mob || r.truckType || r.trucker));
        if (match) {
          const rowsToUpdate = ship ? groupRows(ship, col, i) : [i];
          rowsToUpdate.forEach(r => {
            if (!ENTRY[dir][r].driver && match.driver) ENTRY[dir][r].driver = match.driver;
            if (!ENTRY[dir][r].mob && match.mob) ENTRY[dir][r].mob = match.mob;
            if (!ENTRY[dir][r].truckType && match.truckType) ENTRY[dir][r].truckType = match.truckType;
            if (!ENTRY[dir][r].trucker && match.trucker) ENTRY[dir][r].trucker = match.trucker;
          });
          toast(AR() ? `✓ شاحنة مشتركة (${cleanPlate}): تم ملء بيانات السائق تلقائياً` : `Shared truck auto-filled`);
        }
      }
      if (ship) {
        recalculateTruckSpans(dir, ship);
      }
    }

    /* Auto-update loadStatus based on packages and loadedPackages */
    if (['loadedPackages', 'packages'].includes(k)) {
      const rowsToUpdate = ship ? groupRows(ship, col, i) : [i];
      const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
      rowsToUpdate.forEach(r => {
        const row = ENTRY[dir][r];
        if (row) {
          const tot = parseInt(normalizeDigits(row.packages || '0'), 10) || 0;
          const lod = parseInt(normalizeDigits(row.loadedPackages || '0'), 10) || 0;
          if (isSGreater) {
            if (lod <= 0) {
              row.loadStatus = '';
            } else if (Array.isArray(row._allocations) && row._allocations.length > 1) {
              row.loadStatus = computeAllocLoadStatus(ship, dir, row._allocations, lod);
            } else {
              row.loadStatus = lod > 0 ? (tot > 0 && lod === tot ? 'Full' : lod > tot ? 'Overload' : 'Partial') : '';
            }
          } else {
            row.loadStatus = lod > 0 ? (tot > 0 && lod === tot ? 'Full' : lod > tot ? 'Overload' : 'Partial') : '';
          }
          if (k === 'loadedPackages') {
            if (row.assignedShp != null) {
              const curShp = parseInt(row.assignedShp, 10);
              if (!row._allocations || !row._allocations.length) {
                row._allocations = [{ shpIdx: curShp, pkgs: lod }];
              } else if (row._allocations.length === 1) {
                row._allocations[0].pkgs = lod;
              }
            } else if (row._allocations && row._allocations.length === 1) {
              row._allocations[0].pkgs = lod;
            }
            if (ship) saveShipmentAllocationsDraft(ship.ref, dir);
          }
        }
      });
    }

    /* Real-time Operation & Shipment Package Reconciliation Notification */
    if (['packages', 'loadedPackages'].includes(k) && ship) {
      setTimeout(() => {
        const recon = operationPackageReconciliation(dir, ship.ref);
        if (recon && recon.totalShipmentPkgs > 0) {
          if (recon.anyOverload) {
            const overShp = recon.shipments?.find(s => s.status === 'overload');
            toast(AR()
              ? `🚨 تحذير حمولة زائدة: ${overShp ? `شحنة ${overShp.index} (${overShp.ref}) محملة بـ ${overShp.loadedPackages} طرد وتجاوزت إجمالي بوليصتها (${overShp.packages}) بـ ${Math.abs(overShp.diff)} طرد زائد!` : 'يوجد طرود زائدة عن بوليصة إحدى الشحنات!'}`
              : `🚨 Overload warning: Shipment ${overShp?.index} (${overShp?.loadedPackages} pkgs) exceeds original total (${overShp?.packages}) by ${Math.abs(overShp?.diff || 0)} extra pkgs!`);
          } else if (recon.anyPartial) {
            const partShp = recon.shipments?.find(s => s.status === 'partial');
            toast(AR()
              ? `⚡ ميزان الشحنات: ${partShp ? `شحنة ${partShp.index} (${partShp.ref}) متبقي ${partShp.diff} طرد لم يُحمل بعد (${partShp.loadedPackages}/${partShp.packages})` : `متبقي ${recon.diff} طرد لم يُحمل بعد`}`
              : `⚡ Balance alert: Shipment ${partShp?.index} remaining ${partShp?.diff} pkgs (${partShp?.loadedPackages}/${partShp?.packages})`);
          } else if (recon.status === 'balanced') {
            toast(AR()
              ? `✓ ممتاز! اكتمل توزيع طرود جميع شحنات العملية بالكامل (${recon.totalShipmentPkgs}/${recon.totalShipmentPkgs} طرد)`
              : `✓ All shipments in operation fully balanced (${recon.totalShipmentPkgs}/${recon.totalShipmentPkgs} pkgs)!`);
          }
        }
      }, 60);
    }

    stampUpdate(i, null, true);
    if (ship?.ref) {
      try {
        localStorage.setItem(`ftl_draft_${ship.ref}`, JSON.stringify({
          shipRef: ship.ref,
          dir,
          savedAt: new Date().toISOString(),
          rows: ship.rows.map(idx => ENTRY[dir][idx])
        }));
      } catch (e) { }
    }
    markDirty();
  }

  /* ---------- updates log ---------- */
  function stampUpdate(i, text, silent) {
    const dir = EDIR, m = ROWMETA[dir][i]; if (!m) return;
    const day = today(), at = nowHM(), user = userOf(dir, i);
    const ship = rowShip(dir, i);
    const updCol = COLS[dir].find(c => c.k === 'updates');
    const targets = (ship && updCol) ? groupRows(ship, updCol, i) : [i];
    if (text) {
      targets.forEach(r => {
        if (!ROWMETA[dir][r].updates) ROWMETA[dir][r].updates = [];
        ROWMETA[dir][r].updates.push({ id: '', day, at, user, by: user, text, note: text });
        ENTRY[dir][r].updates = text;
      });
    }
    const stamp = `${fmtDay(day)} ${at}`;
    targets.forEach(r => { ENTRY[dir][r].updDate = stamp; });
    if (!silent) markDirty();
  }
  function openUpdates(i) {
    const dir = EDIR, E = t('entry'), m = ROWMETA[dir][i];
    const list = (m && m.updates) || [];
    const isAr = AR();
    const currentUser = userOf(dir, i);
    $('uTitleTxt').textContent = `${E.updTitle} — ${m?.ref || ''}`;
    $('uBody').innerHTML = `
      <div class="updadd">
        <input id="uText" placeholder="${E.updPlaceholder}" autocomplete="off">
        <button type="button" class="updadd-btn" onclick="__FTL__.addUpdate(${i})">+ ${E.updAdd}</button>
      </div>
      <div class="updmeta">${isAr ? `هيتسجل باسم <span class="upduser">${esc(currentUser)}</span>` : `Will be recorded as <span class="upduser">${esc(currentUser)}</span>`}</div>
      ${list.length ? `
        <div class="updlist">
          ${list.slice().reverse().map((u, ix) => `
            <div class="updrow">
              <div class="upd-left">
                <div class="updn2">${list.length - ix}</div>
                <div class="upd-info">
                  <span class="updtext">${esc(u.text || u.note || '')}</span>
                  <span class="updsub">${fmtDay(u.day)} · ${u.at || ''} · <span class="updby">${esc(u.user || u.by || 'Ops')}</span></span>
                </div>
              </div>
              ${ix === 0 ? `<span class="updlatest">${E.updLatest || 'latest'}</span>` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <div class="updnone">${E.updNone}</div>
      `}
    `;
    $('uModal').classList.add('open');
    setTimeout(() => $('uText')?.focus(), 50);
    $('uText').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); addUpdate(i); } };
  }
  async function addUpdate(i) {
    const v = $('uText').value.trim(); if (!v) return;
    const dir = EDIR, m = ROWMETA[dir][i];
    const ship = rowShip(dir, i);
    const ref = m?.ref || ship?.ref;
    const tripId = m?.id;

    stampUpdate(i, v);
    renderEntry(); openUpdates(i); toast(t('entry').updAdded);

    if (LIVE && ILS.api?.addTruckUpdate && ref) {
      try {
        await ILS.api.addTruckUpdate(ref, tripId, v);
      } catch (err) {
        console.warn('Failed to persist truck update immediately:', err);
      }
    }
  }
  const esc = x => String(x ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

  /* ---------- rendering ---------- */
  function displayValue(c, v) {
    if (!v) return '';
    if (c.t === 'date') return fmtDay(v);
    if (c.k === 'updDate') return fmtDateTime(v);
    if (c.t === 'time') return fmtTime12(v);
    return v;
  }
  function changeTripPage(delta) {
    if (EDITING && !commitEdit()) return;
    if (isServerPagedEntry() && hasUnsavedActiveEdits()) return;
    TRIP_PAGE[EDIR] += delta; CURSOR = { r: -1, k: null };
    if (isServerPagedEntry()) loadEntryPage(EDIR); else renderEntry();
    root.querySelector('.egrid')?.scrollTo({ top: 0 });
  }
  $('tripPagePrev').addEventListener('click', () => changeTripPage(-1));
  $('tripPageNext').addEventListener('click', () => changeTripPage(1));
  $('tripPageSize')?.addEventListener('change', (e) => {
    if (EDITING && !commitEdit()) return;
    if (isServerPagedEntry() && hasUnsavedActiveEdits()) { e.target.value = String(TRIPS_PER_PAGE || 20); return; }
    TRIPS_PER_PAGE = Number(e.target.value) || 20;
    TRIP_PAGE[EDIR] = 0;
    CURSOR = { r: -1, k: null };
    if (isServerPagedEntry()) loadEntryPage(EDIR); else renderEntry();
    root.querySelector('.egrid')?.scrollTo({ top: 0 });
  });
  async function setShipmentStatus(ref, next) {
    const ship = SHIPS[EDIR][ref]; if (!ship || !['Open', 'Delivered'].includes(next)) return;
    if (next === 'Open' && ((ship.status || '').toLowerCase() !== 'delivered' || !LIVE || !REOPEN_GRANTED)) return;
    if (next === 'Delivered' && (ship.status || 'Open').toLowerCase() !== 'open') return;
    if (LIVE) {
      if (!ILS.api?.updateShipmentStatus) { toast(AR() ? 'ربط تغيير الحالة غير مكتمل' : 'Status endpoint unavailable'); return; }
      try {
        await ILS.api.updateShipmentStatus(ref, next);
      } catch (e) {
        console.error('[FTL] Status update failed:', e);
        const errMsg = e?.response?.data?.error || e?.message || (AR() ? 'تعذّر حفظ الحالة' : 'Could not save status');
        toast(errMsg, 'error');
        return;
      }
    }
    ship.status = next;
    if (next === 'Delivered') {
      ship.deliveredAt = new Date().toISOString();
      ship.deliveredBy = OP_USER;
      if (LAST_COUNTS) {
        LAST_COUNTS.deliveredCount = (LAST_COUNTS.deliveredCount || 0) + 1;
        if (EDIR === 'Import') LAST_COUNTS.activeImportCount = Math.max(0, (LAST_COUNTS.activeImportCount || 0) - 1);
        if (EDIR === 'Export') LAST_COUNTS.activeExportCount = Math.max(0, (LAST_COUNTS.activeExportCount || 0) - 1);
      }
    } else if (next === 'Open') {
      ship.reopenedAt = new Date().toISOString();
      ship.reopenedBy = OP_USER;
      if (LAST_COUNTS) {
        LAST_COUNTS.deliveredCount = Math.max(0, (LAST_COUNTS.deliveredCount || 0) - 1);
        if (EDIR === 'Import') LAST_COUNTS.activeImportCount = (LAST_COUNTS.activeImportCount || 0) + 1;
        if (EDIR === 'Export') LAST_COUNTS.activeExportCount = (LAST_COUNTS.activeExportCount || 0) + 1;
      }
    }
    ship.rows.forEach(i => ENTRY[EDIR][i].status = next);
    DATA.filter(r => r.dir === EDIR && (r._ref === ref || (ship.uploadGroup && r._uploadGroup === ship.uploadGroup) || ship.rows.some(i => ENTRY[EDIR][i].shipNo && ENTRY[EDIR][i].shipNo === r.shipNo))).forEach(r => r.status = next);
    TRIP_SELECTED[EDIR].delete(ref); CURSOR = { r: -1, k: null }; EDITING = null; markDirty();
    if (LAST_COUNTS) setCounts(LAST_COUNTS);
    if (isServerPagedEntry()) {
      invalidateEntryCache(EDIR);
      ENTRY_PAGING[EDIR].totalCount = Math.max(0, (ENTRY_PAGING[EDIR].totalCount || 1) - 1);
      await loadEntryPage(EDIR, { force: true });
    } else {
      renderEntry();
    }
    __emit('countsChanged');
    if ($('deliveredModal').classList.contains('open')) renderDelivered();
    if (VIEW_MODE === 'dash') applyFilters();
  }
  async function changeShipmentStatus(target, ref) {
    const next = typeof target === 'string' ? target : target?.value;
    if (next !== 'Delivered' && next !== 'Open') return;
    await setShipmentStatus(ref, next);
  }

  function toggleStatusMenu(ref, btnEl) {
    const ship = SHIPS[EDIR]?.[ref];
    if (isShipLockedByOther(ship)) {
      toast(AR() ? `العملية مقفولة حالياً بواسطة ${ship.lockedByName || 'مستخدم آخر'}` : `Operation is currently locked by ${ship.lockedByName || 'another user'}`, 'warning');
      return;
    }
    const container = btnEl.closest('.fcl-status-container');
    const existing = document.querySelector('.fcl-status-menu');
    if (existing) {
      const isSame = existing.dataset.ref === ref;
      const prevContainer = existing.closest('.fcl-status-container');
      if (prevContainer) prevContainer.classList.remove('menu-open');
      existing.remove();
      if (isSame) return;
    }
    if (!container) return;
    container.classList.add('menu-open');
    const isAr = AR();
    const isDelivered = (ship?.status || 'Open') === 'Delivered';
    const menu = document.createElement('div');
    menu.className = 'fcl-status-menu';
    menu.dataset.ref = ref;
    menu.onclick = (e) => e.stopPropagation();

    const checkIcon = `<svg class="fcl-check-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;

    menu.innerHTML = `
      <button type="button" class="fcl-menu-item ${!isDelivered ? 'active open' : ''}" onclick="event.stopPropagation();__FTL__.setAndCloseStatus('${esc(ref)}', 'Open')">
        <div class="fcl-menu-item-left">
          <span class="fcl-status-dot open"></span>
          <span>Open</span>
        </div>
        ${!isDelivered ? checkIcon : ''}
      </button>
      <button type="button" class="fcl-menu-item ${isDelivered ? 'active delivered' : ''}" onclick="event.stopPropagation();__FTL__.setAndCloseStatus('${esc(ref)}', 'Delivered')">
        <div class="fcl-menu-item-left">
          <span class="fcl-status-dot delivered"></span>
          <span>Delivered</span>
        </div>
        ${isDelivered ? checkIcon : ''}
      </button>
    `;
    container.appendChild(menu);

    const onDocClick = (e) => {
      if (!menu.contains(e.target)) {
        menu.remove();
        container.classList.remove('menu-open');
        document.removeEventListener('click', onDocClick);
      }
    };
    setTimeout(() => document.addEventListener('click', onDocClick), 0);
  }

  async function setAndCloseStatus(ref, newStatus) {
    const existing = document.querySelector('.fcl-status-menu');
    if (existing) {
      const container = existing.closest('.fcl-status-container');
      if (container) container.classList.remove('menu-open');
      existing.remove();
    }
    await setShipmentStatus(ref, newStatus);
  }

  /* ---------- Active Operation Details Drawer (Read-Only Info + Editable Trip Update) ---------- */
  function buildActiveDetailsPayload(dir, ref, clickedRowIdx, clickedColKey) {
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !Array.isArray(ship.rows) || !ship.rows.length) return null;
    const rows = ENTRY[dir] || [];
    const metas = ROWMETA[dir] || [];
    const R = ship.rows.length;

    if (!validSpans(ship.shpSpans, R) || !validSpans(ship.trkSpans, R) || !Array.isArray(ship.trkOf) || ship.trkOf.length !== R) {
      layoutShip(dir, ship, { shpSpans: ship.shpSpans, trkSpans: ship.trkSpans, trkOf: ship.trkOf });
    }

    const firstOpRow = rows[ship.rows[0]] || {};
    const shipments = (ship.shpSpans || [[0, R]]).map(([sStart], sIdx) => {
      const sRowIdx = ship.rows[sStart];
      const sRow = rows[sRowIdx] || {};
      return {
        shpIdx: sIdx,
        rowIdx: sRowIdx,
        shipNo: sRow.shipNo || '',
        mawb: sRow.mawb || '',
        hawb: sRow.hawb || '',
        cert: sRow.cert || '',
        customs: sRow.customs || '',
        packages: sRow.packages || '',
        weight: sRow.weight || '',
        cbm: sRow.cbm || '',
        dest: sRow.dest || firstOpRow.dest || '',
        fullAddress: sRow.fullAddress || firstOpRow.fullAddress || '',
        client: sRow.client || firstOpRow.client || '',
        line: sRow.line || firstOpRow.line || '',
        aod: sRow.aod || firstOpRow.aod || '',
        pol: sRow.pol || firstOpRow.pol || '',
        pow: sRow.pow || firstOpRow.pow || '',
        clrType: sRow.clrType || firstOpRow.clrType || '',
        invRcv: sRow.invRcv || firstOpRow.invRcv || '',
        free: sRow.free || firstOpRow.free || '',
        cut: sRow.cut || firstOpRow.cut || '',
      };
    });

    const isSGreater = Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
    const truckMap = new Map();

    (ship.trkSpans || [[0, R]]).forEach(([tStart, tLen], tIdx) => {
      const sliceRowIndices = ship.rows.slice(tStart, tStart + tLen);
      const headRowIdx = sliceRowIndices[0];
      const headRow = rows[headRowIdx] || {};
      const headMeta = metas[headRowIdx] || {};
      const trkNo = ship.trkOf?.[tStart] ?? (tIdx + 1);
      const rawTripId = headMeta.id ? String(headMeta.id) : '';
      const isSavedTripId = Boolean(rawTripId && !rawTripId.startsWith('local-') && !rawTripId.startsWith('temp'));
      const dedupKey = isSavedTripId
        ? `id:${rawTripId}`
        : (headRow._coLoadId ? `co:${headRow._coLoadId}` : `trk:${trkNo}:${tIdx}`);

      // Resolve carried shipments for this truck slot
      const carriedSet = new Map();
      const addCarried = (sIdx, pkgs) => {
        const s = shipments[sIdx];
        if (!s) return;
        const label = s.shipNo || s.hawb || s.mawb || `#${sIdx + 1}`;
        const prev = carriedSet.get(sIdx);
        const pkgNum = parseInt(normalizeDigits(String(pkgs || '0')), 10) || 0;
        carriedSet.set(sIdx, {
          shpIdx: sIdx,
          label,
          pkgs: prev ? (prev.pkgs + pkgNum) : pkgNum,
        });
      };

      if (Array.isArray(headRow._allocations) && headRow._allocations.length > 0) {
        headRow._allocations.forEach((a) => {
          const sIdx = parseInt(a.shpIdx, 10);
          if (!isNaN(sIdx)) addCarried(sIdx, a.pkgs);
        });
      } else if (headRow.assignedShp !== undefined && headRow.assignedShp !== null && headRow.assignedShp !== '') {
        addCarried(parseInt(headRow.assignedShp, 10), headRow.loadedPackages);
      } else if (shipments.length === 1) {
        addCarried(0, headRow.loadedPackages);
      }

      const existing = truckMap.get(dedupKey);
      const sliceUpdates = (headMeta.updates || []).map((u) => ({ ...u }));

      if (existing) {
        sliceRowIndices.forEach((ri) => {
          if (!existing.rowIndices.includes(ri)) existing.rowIndices.push(ri);
        });
        carriedSet.forEach((v, k) => {
          if (!existing._carriedMap.has(k)) existing._carriedMap.set(k, v);
        });
        sliceUpdates.forEach((u) => {
          const dup = existing.updates.some((ex) => (u.id && ex.id === u.id) || (ex.text === u.text && ex.day === u.day && ex.at === u.at));
          if (!dup) existing.updates.push(u);
        });
      } else {
        const plate = (headRow.cntr || '').trim();
        const carriedMap = new Map(carriedSet);
        truckMap.set(dedupKey, {
          truckKey: dedupKey,
          trkNo,
          tripId: isSavedTripId ? rawTripId : null,
          isSavedTripId,
          isUnassigned: !plate && !isSavedTripId,
          plate,
          truckType: headRow.truckType || '',
          trucker: headRow.trucker || '',
          driver: headRow.driver || '',
          mob: headRow.mob || '',
          dest: headRow.dest || '',
          arrDate: headRow.arrDate || '',
          arrTime: headRow.arrTime || '',
          gateIn: headRow.gateIn || '',
          gateInT: headRow.gateInT || '',
          gateOut: headRow.gateOut || '',
          gateOutT: headRow.gateOutT || '',
          checkout: headRow.checkout || '',
          loadedPackages: headRow.loadedPackages || '',
          loadedWeight: headRow.loadedWeight || '',
          loadedCbm: headRow.loadedCbm || '',
          rowIndices: [...sliceRowIndices],
          _carriedMap: carriedMap,
          updates: sliceUpdates,
        });
      }
    });

    const trucks = Array.from(truckMap.values()).map((t) => {
      const carriedShipments = Array.from(t._carriedMap.values());
      const { _carriedMap, ...rest } = t;
      return { ...rest, carriedShipments };
    });

    const TRUCK_CLICK_KEYS = new Set([
      'cntr', 'car', 'driver', 'mob', 'gateOut', 'gateOutT',
      'checkout', 'arrDate', 'arrTime', 'loadedPackages', 'loadStatus',
    ]);
    const clickedCol = (clickedColKey && clickedColKey !== '__meta__')
      ? (COLS[dir] || []).find((c) => c.k === clickedColKey)
      : null;
    const isTruckCell = Boolean(
      clickedCol &&
        (TRUCK_CLICK_KEYS.has(clickedCol.k) ||
          (clickedCol.k === 'trucker' && ship.unmerged?.has('trucker')))
    );

    let initialSelectedTruckKey = null;
    if (trucks.length === 1) {
      initialSelectedTruckKey = trucks[0].truckKey;
    } else if (trucks.length > 1 && isTruckCell) {
      const matched = trucks.find((t) => t.rowIndices.includes(clickedRowIdx));
      if (matched) initialSelectedTruckKey = matched.truckKey;
    }

    // Identify which shipment was clicked (if any) instead of always forcing shipment #1
    const clickedRelIdx = ship.rows.indexOf(clickedRowIdx);
    let clickedShipmentIdx = null;
    if (shipments.length === 1) {
      clickedShipmentIdx = 0;
    } else if (clickedRelIdx >= 0 && clickedCol && !isTruckCell && colLevel(clickedCol) !== 'op') {
      const spIdx = (ship.shpSpans || []).findIndex(
        ([sStart, sLen]) => clickedRelIdx >= sStart && clickedRelIdx < sStart + sLen
      );
      if (spIdx >= 0) clickedShipmentIdx = spIdx;
    }

    const firstRowIdx = ship.rows[0];
    const focusRowIdx = (clickedShipmentIdx !== null && shipments[clickedShipmentIdx])
      ? shipments[clickedShipmentIdx].rowIdx
      : firstRowIdx;
    const focusRow = rows[focusRowIdx] || rows[firstRowIdx] || {};
    const firstRow = rows[firstRowIdx] || {};
    const firstMeta = metas[firstRowIdx] || {};

    return {
      ref,
      id: ship.id || ref,
      dir,
      status: ship.status || 'Open',
      client: focusRow.client || firstRow.client || firstMeta.client || '',
      line: focusRow.line || firstRow.line || '',
      aod: focusRow.aod || firstRow.aod || '',
      pol: focusRow.pol || firstRow.pol || '',
      pow: focusRow.pow || firstRow.pow || '',
      dest: focusRow.dest || firstRow.dest || '',
      fullAddress: focusRow.fullAddress || firstRow.fullAddress || '',
      clrType: focusRow.clrType || firstRow.clrType || '',
      cert: focusRow.cert || firstRow.cert || '',
      customs: focusRow.customs || firstRow.customs || '',
      mawb: focusRow.mawb || firstRow.mawb || '',
      hawb: focusRow.hawb || firstRow.hawb || '',
      invRcv: focusRow.invRcv || firstRow.invRcv || '',
      free: focusRow.free || firstRow.free || '',
      cut: focusRow.cut || firstRow.cut || '',
      createdByName: firstMeta.user || ship.user || OP_USER || '',
      day: firstMeta.day || ship.day || '',
      at: firstMeta.at || ship.time || '',
      createdAtUtc: (firstMeta.day && firstMeta.at) ? `${firstMeta.day}T${firstMeta.at}` : (ship.day && ship.time ? `${ship.day}T${ship.time}` : null),
      firstRowIdx,
      clickedShipmentIdx,
      shipments,
      trucks,
      initialSelectedTruckKey,
      statusHistoryPayload: {
        ref,
        id: ship.id || ref,
        shipNo: firstRow.shipNo || firstMeta.shipNo || ref,
        client: firstRow.client || firstMeta.client || '—',
        status: ship.status || 'Open',
        day: firstMeta.day || ship.day,
        at: firstMeta.at || ship.time,
        createdByName: firstMeta.user || ship.user || OP_USER,
        createdAtUtc: (firstMeta.day && firstMeta.at) ? `${firstMeta.day}T${firstMeta.at}` : (ship.day && ship.time ? `${ship.day}T${ship.time}` : null),
        deliveredAtUtc: ship.deliveredAt,
        deliveredByName: ship.deliveredBy,
        trips: [{ fields: { ...firstRow } }],
      },
    };
  }

  function openActiveDetailsDrawer(dir, ref, clickedRowIdx, clickedColKey) {
    if (EDITING && !commitEdit()) return;
    const payload = buildActiveDetailsPayload(dir, ref, clickedRowIdx, clickedColKey);
    if (!payload) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ftl:open-op-details', { detail: payload }));
    }
  }

  function appendTripUpdateFromDrawer(dir, ref, rowIndices = [], updateObj = {}) {
    const targetDir = dir || EDIR;
    const ship = SHIPS[targetDir]?.[ref];
    const metas = ROWMETA[targetDir];
    const rows = ENTRY[targetDir];
    if (!metas || !rows) return;

    const targetSet = new Set(Array.isArray(rowIndices) ? rowIndices : []);
    if (ship && Array.isArray(ship.rows) && targetSet.size > 0) {
      // Include any sibling rows sharing the same tripId or truck ordinal
      const matchedTripIds = new Set();
      const matchedTrkOrds = new Set();
      targetSet.forEach((ri) => {
        if (metas[ri]?.id) matchedTripIds.add(String(metas[ri].id));
        const pos = ship.rows.indexOf(ri);
        if (pos >= 0 && ship.trkOf?.[pos]) matchedTrkOrds.add(ship.trkOf[pos]);
      });
      ship.rows.forEach((ri, pos) => {
        if (metas[ri]?.id && matchedTripIds.has(String(metas[ri].id))) targetSet.add(ri);
        if (ship.trkOf?.[pos] && matchedTrkOrds.has(ship.trkOf[pos])) targetSet.add(ri);
      });
    }

    const day = updateObj.day || today();
    const at = updateObj.at || nowHM();
    const user = updateObj.by || updateObj.user || OP_USER;
    const text = updateObj.text || updateObj.note || '';
    const entryObj = {
      id: updateObj.id || '',
      day,
      at,
      user,
      by: user,
      text,
      note: text,
    };
    const stamp = `${fmtDay(day)} ${at}`;

    targetSet.forEach((rIdx) => {
      if (!metas[rIdx]) return;
      if (!Array.isArray(metas[rIdx].updates)) metas[rIdx].updates = [];
      const alreadyExists = entryObj.id && metas[rIdx].updates.some((u) => u.id === entryObj.id);
      if (!alreadyExists) {
        metas[rIdx].updates.push({ ...entryObj });
      }
      if (rows[rIdx]) {
        rows[rIdx].updates = text;
        rows[rIdx].updDate = stamp;
      }
    });

    if (EDIR === targetDir) {
      renderEntry();
    }
  }

  /* ---------- Operation Status History Drawer (Audit Log & Lifecycle Timeline) ---------- */
  async function openStatusHistory(ref, rowIdx) {
    if (EDITING && !commitEdit()) return;
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    const rIdx = (rowIdx != null && rowIdx >= 0) ? rowIdx : (ship?.rows?.[0] ?? -1);
    const row = rIdx >= 0 ? ENTRY[dir]?.[rIdx] : null;
    const meta = rIdx >= 0 ? ROWMETA[dir]?.[rIdx] : null;

    const shipRef = ref || meta?.ref || '—';
    const clientName = (row && (row.client || cellVal(row, 'client'))) || (meta && meta.client) || '—';
    const currentStatus = ship?.status || 'Open';
    const isDelivered = currentStatus === 'Delivered';

    // Dispatch unified status history event for React Modal (Identical to FCL 1:1)
    if (typeof window !== 'undefined') {
      try {
        const shipPayload = {
          ref: shipRef,
          id: ship?.id || shipRef,
          shipNo: (row && (row.shipNo || cellVal(row, 'shipNo'))) || meta?.shipNo || shipRef,
          client: clientName,
          status: currentStatus,
          day: meta?.day || ship?.day,
          at: meta?.at || ship?.time,
          createdByName: meta?.user || ship?.user || OP_USER,
          createdAtUtc: (meta?.day && meta?.at) ? `${meta.day}T${meta.at}` : (ship?.day && ship?.time ? `${ship.day}T${ship.time}` : null),
          deliveredAtUtc: ship?.deliveredAt,
          deliveredByName: ship?.deliveredBy,
          trips: [{ fields: row || {} }],
        };
        window.dispatchEvent(new CustomEvent('ftl:open-status-history', { detail: shipPayload }));
        return;
      } catch (e) {
        // Fallback to internal DOM drawer if running without React host
      }
    }

    // Update Header labels for current language
    const isAr = AR();
    if ($('ftlStatusHistTitle')) $('ftlStatusHistTitle').textContent = isAr ? 'سجل وتاريخ حالات الشحنة' : 'Operation Status History';
    if ($('ftlStatusHistSub')) $('ftlStatusHistSub').textContent = 'Audit Log & Lifecycle Timeline';
    if ($('ftlStatusHistRefLbl')) $('ftlStatusHistRefLbl').textContent = isAr ? 'الشحنة / البوليصة' : 'Shipment / MAWB';
    if ($('ftlStatusHistClientLbl')) $('ftlStatusHistClientLbl').textContent = isAr ? 'العميل' : 'Client';
    if ($('ftlStatusHistStatusLbl')) $('ftlStatusHistStatusLbl').textContent = isAr ? 'الحالة الحالية' : 'Current';
    if ($('ftlStatusHistFooterText')) $('ftlStatusHistFooterText').textContent = isAr ? 'سجل غير قابل للتعديل (Audit Log)' : 'Immutable Audit Log';
    if ($('ftlStatusHistCloseBtn')) $('ftlStatusHistCloseBtn').textContent = isAr ? 'إغلاق' : 'Close';

    // Populate Info Bar
    if ($('ftlStatusHistRef')) $('ftlStatusHistRef').textContent = shipRef;
    if ($('ftlStatusHistClient')) $('ftlStatusHistClient').textContent = clientName;
    if ($('ftlStatusHistStatusBadge')) {
      const badge = $('ftlStatusHistStatusBadge');
      badge.className = `ftl-sh-status-pill ${isDelivered ? 'delivered' : 'open'}`;
      if ($('ftlStatusHistStatusDot')) {
        $('ftlStatusHistStatusDot').className = `ftl-sh-status-dot ${isDelivered ? 'delivered' : 'open'}`;
      }
      if ($('ftlStatusHistStatusText')) {
        $('ftlStatusHistStatusText').textContent = isDelivered ? (t('workflow')?.delivered || 'Delivered') : (t('workflow')?.open || 'Open');
      }
    }

    // Helper to format date matching FCL image 2: "03-NOV-2026 - 09:00"
    function fmtStatusDateTime(val) {
      if (!val) return '';
      try {
        const d = new Date(val);
        if (isNaN(d.getTime())) return String(val);
        const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
        const day = String(d.getDate()).padStart(2, '0');
        const mmm = months[d.getMonth()];
        const yyyy = d.getFullYear();
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        return `${day}-${mmm}-${yyyy} - ${hh}:${mm}`;
      } catch (e) {
        return String(val);
      }
    }

    // Helper to resolve user name (clean up UUIDs if present)
    function resolveUserName(rawVal, fallback) {
      if (!rawVal) return fallback || OP_USER || (isAr ? 'فريق العمليات' : 'Operations Team');
      const str = String(rawVal).trim();
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
      if (isGuid) {
        return fallback || OP_USER || (isAr ? 'فريق العمليات' : 'Operations Team');
      }
      return str;
    }

    // Base "Operation Created" event
    const createdUser = resolveUserName(ship?.user || meta?.user || OP_USER);
    let createdTimestamp = '';
    if (meta?.day && meta?.at) {
      try {
        createdTimestamp = fmtStatusDateTime(`${meta.day}T${meta.at}`);
      } catch (e) {
        createdTimestamp = `${meta.day} ${meta.at}`;
      }
    } else if (ship?.day && ship?.time) {
      try {
        createdTimestamp = fmtStatusDateTime(`${ship.day}T${ship.time}`);
      } catch (e) {
        createdTimestamp = `${ship.day} ${ship.time}`;
      }
    } else {
      createdTimestamp = fmtStatusDateTime(new Date());
    }

    const defaultEvents = [
      {
        id: 'created',
        type: 'Created',
        title: isAr ? 'إنشاء العملية (Created)' : 'Operation Created',
        userName: createdUser,
        timestamp: createdTimestamp,
        sortTime: (meta?.day && meta?.at) ? new Date(`${meta.day}T${meta.at}`).getTime() : 0,
        color: 'created',
      }
    ];

    if (isDelivered) {
      defaultEvents.unshift({
        id: 'delivered_current',
        type: 'Delivered',
        title: isAr ? 'تم التسليم (Delivered)' : 'Marked as Delivered',
        userName: resolveUserName(ship?.deliveredBy || ship?.user || OP_USER),
        timestamp: fmtStatusDateTime(ship?.deliveredAt || new Date()),
        sortTime: Date.now(),
        color: 'delivered',
      });
    }

    // Render local/cached events immediately so drawer opens instantaneously
    renderStatusTimeline(defaultEvents);
    $('ftlStatusHistoryModal').classList.add('open');

    // Asynchronously fetch status audits from backend FtlStatusAudits table
    try {
      let audits = null;
      if (ILS.api?.getStatusAudits) {
        try {
          audits = await ILS.api.getStatusAudits(shipRef);
        } catch (e) {
          // ignore
        }
      }

      if (!audits) {
        const token = localStorage.getItem('accessToken') || localStorage.getItem('token') || '';
        const headers = { 'Accept': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        try {
          const res = await fetch(`/api/v1/ftl/operations/${encodeURIComponent(shipRef)}/status-audits`, { headers });
          if (res.ok) audits = await res.json();
        } catch (e) { }

        if (!audits) {
          try {
            const res = await fetch(`/api/operations/ftl/${encodeURIComponent(shipRef)}/status-audits`, { headers });
            if (res.ok) audits = await res.json();
          } catch (e) { }
        }
      }

      if (Array.isArray(audits) && audits.length > 0) {
        const events = audits.map((a, idx) => {
          const isDeliv = a.afterStatus === 'Delivered';
          const isReopen = a.afterStatus === 'Open' && a.beforeStatus === 'Delivered';
          const type = isDeliv ? 'Delivered' : (isReopen ? 'Reopened' : 'StatusChange');
          let title = '';
          if (isDeliv) {
            title = isAr ? 'تم التسليم (Delivered)' : 'Marked as Delivered';
          } else if (isReopen) {
            title = isAr ? 'إعادة فتح العملية (Reopened to Open)' : 'Reopened to Open';
          } else {
            title = isAr ? `تغيير الحالة إلى ${a.afterStatus}` : `Status changed to ${a.afterStatus}`;
          }

          return {
            id: a.id || `audit_${idx}`,
            type,
            title,
            userName: resolveUserName(a.userName || a.userId, createdUser),
            timestamp: fmtStatusDateTime(a.atUtc),
            sortTime: new Date(a.atUtc || 0).getTime(),
            reason: a.reason || null,
            color: isDeliv ? 'delivered' : (isReopen ? 'reopened' : 'other'),
          };
        });

        // Ensure "Operation Created" is present
        const hasCreated = events.some(e => e.type === 'Created');
        if (!hasCreated) {
          events.push(defaultEvents[defaultEvents.length - 1]);
        }

        // Sort descending by timestamp
        events.sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0));
        renderStatusTimeline(events);
      }
    } catch (err) {
      console.warn('Could not fetch FTL status audits:', err);
    }
  }

  function renderStatusTimeline(events) {
    const body = $('ftlStatusHistBody');
    if (!body) return;
    const isAr = AR();

    if (!events || events.length === 0) {
      body.innerHTML = `
        <div style="padding:80px 20px;text-align:center;color:#94a3b8;font-size:12px">
          <div style="font-size:32px;margin-bottom:8px;opacity:0.4">🕒</div>
          <div>${isAr ? 'لا يوجد سجلات سابقة مسجلة' : 'No status history records found'}</div>
        </div>
      `;
      return;
    }

    let html = `
      <div class="ftl-sh-timeline-wrap">
        <div class="ftl-sh-line"></div>
        <div class="ftl-sh-list">
    `;

    events.forEach(item => {
      const isDelivered = item.type === 'Delivered';
      const isReopened = item.type === 'Reopened';
      const isCreated = item.type === 'Created';

      let nodeClass = 'created';
      let iconSvg = '';
      if (isDelivered) {
        nodeClass = 'delivered';
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      } else if (isReopened) {
        nodeClass = 'reopened';
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`;
      } else if (isCreated) {
        nodeClass = 'created';
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`;
      } else {
        nodeClass = 'other';
        iconSvg = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      }

      html += `
        <div class="ftl-sh-item">
          <!-- Timeline Node Badge -->
          <div class="ftl-sh-node ${nodeClass}">
            ${iconSvg}
          </div>

          <!-- Event Card -->
          <div class="ftl-sh-card">
            <div class="ftl-sh-card-top">
              <span class="ftl-sh-card-title ${nodeClass}">${esc(item.title)}</span>
              <span class="ftl-sh-card-time">${esc(item.timestamp || (isAr ? 'غير محدد' : 'Unknown'))}</span>
            </div>
            <div class="ftl-sh-card-user">
              <span class="by-lbl">${isAr ? 'بواسطة:' : 'By:'}</span>
              <span class="user-badge">${esc(item.userName)}</span>
            </div>
            ${item.reason ? `
              <div class="ftl-sh-card-reason">
                <span class="reason-lbl">${isAr ? 'سبب إعادة الفتح:' : 'Reopen Reason:'}</span>
                <span class="reason-txt">"${esc(item.reason)}"</span>
              </div>
            ` : ''}
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;

    body.innerHTML = html;
  }
  let DELIVERED_PAGE = 0;
  let REOPEN_GRANTED = false;
  const DELIVERED_SELECTED = { Import: new Set(), Export: new Set() };
  function toggleDeliveredSelection(ref) {
    const set = DELIVERED_SELECTED[EDIR]; if (!SHIPS[EDIR][ref] || SHIPS[EDIR][ref].status !== 'Delivered') return;
    if (set.has(ref)) set.delete(ref); else set.add(ref); renderDelivered();
  }
  function toggleAllDelivered() {
    const set = DELIVERED_SELECTED[EDIR], refs = sortedTripShips(EDIR, DELIVERED_SORT[EDIR], DELIVERED_SEARCH[EDIR]).filter(sh => sh.status === 'Delivered').map(sh => sh.ref);
    if (refs.every(ref => set.has(ref))) refs.forEach(ref => set.delete(ref)); else refs.forEach(ref => set.add(ref));
    renderDelivered();
  }
  async function copyDeliveredTrips() {
    if (!DELIVERED_SELECTED[EDIR].size) return;
    return writeTripClipboard(selectedTripClipboard(EDIR, DELIVERED_SELECTED[EDIR]));
  }
  async function reopenSelectedShipment() {
    if (!REOPEN_GRANTED || !LIVE) return;
    const ref = $('reopenShipment').value; if (!ref || SHIPS[EDIR][ref]?.status !== 'Delivered') return;
    $('reopenAction').disabled = true;
    try { await setShipmentStatus(ref, 'Open'); } finally { $('reopenAction').disabled = false; }
  }
  function renderDelivered() {
    const dir = EDIR, cols = COLS[dir], allDelivered = Object.values(SHIPS[dir]).filter(sh => sh.status === 'Delivered');
    const ships = sortedTripShips(dir, DELIVERED_SORT[dir], DELIVERED_SEARCH[dir]).filter(sh => sh.status === 'Delivered');
    const selectedRefs = DELIVERED_SELECTED[dir];
    for (const ref of selectedRefs) if (SHIPS[dir][ref]?.status !== 'Delivered') selectedRefs.delete(ref);
    const pages = shipmentPages(ships); DELIVERED_PAGE = Math.max(0, Math.min(DELIVERED_PAGE, pages.length - 1));
    const shown = pages[DELIVERED_PAGE] || [];
    $('deliveredTitle').textContent = t('workflow').deliveredShipments + ' · ' + dirLabel(dir);
    const filtered = DELIVERED_SEARCH[dir].some(r => String(r.v ?? '').trim());
    $('deliveredCount').textContent = AR() ? (filtered ? `${ships.length} من ${allDelivered.length} شحنة` : `${ships.length} شحنة`) : (filtered ? `${ships.length} of ${allDelivered.length} shipments` : `${ships.length} shipments`);
    const E = t('entry');
    $('deliveredSelectAll').textContent = AR() ? 'تحديد الكل' : 'Select all';
    $('deliveredSelectAll').disabled = !ships.length; $('deliveredSelectAll').textContent = ships.length && ships.every(sh => selectedRefs.has(sh.ref)) ? (AR() ? 'إلغاء التحديد' : 'Clear selection') : (AR() ? 'تحديد الكل' : 'Select all');
    $('deliveredCopy').textContent = AR() ? `نسخ المحدد (${selectedRefs.size})` : `Copy selected (${selectedRefs.size})`;
    $('deliveredCopy').disabled = !selectedRefs.size;
    $('deliveredExport').textContent = E.save; $('deliveredMail').textContent = E.mail;
    $('deliveredExport').disabled = !ships.length; $('deliveredMail').disabled = !ships.length;
    const W = t('workflow'), actions = $('deliveredActions'), selected = $('reopenShipment').value;
    actions.hidden = !REOPEN_GRANTED || !LIVE || !ships.length;
    $('reopenLabel').textContent = W.selectShipment; $('reopenAction').textContent = W.reopen;
    $('reopenShipment').innerHTML = ships.map(sh => `<option value="${esc(sh.ref)}">${esc(ENTRY[dir][sh.rows[0]]?.shipNo || sh.ref)}</option>`).join('');
    if (ships.some(sh => sh.ref === selected)) $('reopenShipment').value = selected;
    $('deliveredPage').hidden = pages.length <= 1; $('deliveredPrev').disabled = DELIVERED_PAGE === 0; $('deliveredNext').disabled = DELIVERED_PAGE >= pages.length - 1;
    $('deliveredPageInfo').textContent = pages.length ? `${DELIVERED_PAGE + 1} / ${pages.length}` : '';
    $('deliveredHead').innerHTML = '<tr>' + cols.map(c => `<th class="grp-${c.g}" style="--gc:${GROUPS[c.g].c}"><span>${esc(AR() ? (c.ar || c.h) : c.h)}</span></th>`).join('') + `<th class="archive-select">${AR() ? 'تحديد' : 'Select'}</th></tr>`;
    $('deliveredBody').innerHTML = shown.length ? shown.map(sh => sh.rows.map((i, ri) => {
      const row = ENTRY[dir][i]; return '<tr>' + cols.map(c => {
        const sp = spanOf(sh, c, ri); if (sp.start !== ri) return '';
        const value = c.k === 'status' ? W.delivered : c.k === 'updates' ? ((ROWMETA[dir][i]?.updates || []).map(u => u.text).join(' | ')) : displayValue(c, row[c.k] || '');
        return `<td class="grp-${c.g}" style="--gc:${GROUPS[c.g].c}" ${sp.len > 1 ? `rowspan="${sp.len}"` : ''}><span>${c.k === 'status' ? `<span class="status-pill delivered">${esc(W.delivered)}</span>` : esc(value || '—')}</span></td>`;
      }).join('') + (ri ? '' : `<td class="archive-select" rowspan="${sh.rows.length}"><input type="checkbox" aria-label="${AR() ? 'تحديد الشحنة' : 'Select shipment'} ${esc(sh.ref)}" data-ref="${esc(sh.ref)}" ${selectedRefs.has(sh.ref) ? 'checked' : ''} onchange="__FTL__.toggleDeliveredSelection(this.dataset.ref)"></td>`) + '</tr>';
    }).join('')).join('') : `<tr><td colspan="${cols.length + 1}">${allDelivered.length ? (AR() ? 'لا توجد شحنات مسلّمة مطابقة للفلتر' : 'No delivered shipments match the filter') : W.noDelivered}</td></tr>`;
  }
  async function openDelivered() {
    setTab('Delivered');
    __emit('tabChange', 'Delivered');
  }

  /* =====================================================================
     INACTIVE ARCHIVE (Soft-deleted operations)
     ===================================================================== */
  let INACTIVE_PAGE = 0;
  const INACTIVE_SELECTED = { Import: new Set(), Export: new Set() };
  const INACTIVE_SORT = { Import: [{ k: 'day', d: 'desc' }], Export: [{ k: 'day', d: 'desc' }] };
  const INACTIVE_SEARCH = { Import: [], Export: [] };

  function toggleInactiveSelection(ref) {
    const set = INACTIVE_SELECTED[EDIR]; if (!SHIPS[EDIR][ref] || SHIPS[EDIR][ref].status !== 'Inactive') return;
    if (set.has(ref)) set.delete(ref); else set.add(ref); renderInactive();
  }
  function toggleAllInactive() {
    const set = INACTIVE_SELECTED[EDIR], refs = sortedTripShips(EDIR, INACTIVE_SORT[EDIR], INACTIVE_SEARCH[EDIR]).filter(sh => sh.status === 'Inactive').map(sh => sh.ref);
    if (refs.every(ref => set.has(ref))) refs.forEach(ref => set.delete(ref)); else refs.forEach(ref => set.add(ref));
    renderInactive();
  }
  async function copyInactiveTrips() {
    if (!INACTIVE_SELECTED[EDIR].size) return;
    return writeTripClipboard(selectedTripClipboard(EDIR, INACTIVE_SELECTED[EDIR]));
  }
  async function reopenSelectedInactive() {
    const ref = $('reopenInactiveShipment').value; if (!ref || SHIPS[EDIR][ref]?.status !== 'Inactive') return;
    $('reopenInactiveAction').disabled = true;
    try {
      await setShipmentStatus(ref, 'Open');
      toast(AR() ? 'تمت استعادة العملية بنجاح إلى جدول العمليات' : 'Operation restored successfully to active table');
    } finally {
      $('reopenInactiveAction').disabled = false;
      renderInactive();
      renderEntry();
    }
  }
  function renderInactive() {
    const dir = EDIR, cols = COLS[dir], allInactive = Object.values(SHIPS[dir]).filter(sh => sh.status === 'Inactive');
    const ships = sortedTripShips(dir, INACTIVE_SORT[dir], INACTIVE_SEARCH[dir]).filter(sh => sh.status === 'Inactive');
    const selectedRefs = INACTIVE_SELECTED[dir];
    for (const ref of selectedRefs) if (SHIPS[dir][ref]?.status !== 'Inactive') selectedRefs.delete(ref);
    const pages = shipmentPages(ships); INACTIVE_PAGE = Math.max(0, Math.min(INACTIVE_PAGE, pages.length - 1));
    const shown = pages[INACTIVE_PAGE] || [];
    $('inactiveTitle').textContent = (t('workflow').inactiveShipments || 'Inactive shipments') + ' · ' + dirLabel(dir);
    const filtered = INACTIVE_SEARCH[dir].some(r => String(r.v ?? '').trim());
    $('inactiveCount').textContent = AR() ? (filtered ? `${ships.length} من ${allInactive.length} شحنة` : `${ships.length} شحنة`) : (filtered ? `${ships.length} of ${allInactive.length} shipments` : `${ships.length} shipments`);
    const E = t('entry');
    $('inactiveSelectAll').textContent = AR() ? 'تحديد الكل' : 'Select all';
    $('inactiveSelectAll').disabled = !ships.length; $('inactiveSelectAll').textContent = ships.length && ships.every(sh => selectedRefs.has(sh.ref)) ? (AR() ? 'إلغاء التحديد' : 'Clear selection') : (AR() ? 'تحديد الكل' : 'Select all');
    $('inactiveCopy').textContent = AR() ? `نسخ المحدد (${selectedRefs.size})` : `Copy selected (${selectedRefs.size})`;
    $('inactiveCopy').disabled = !selectedRefs.size;
    if ($('inactiveExport')) {
      $('inactiveExport').textContent = E.save;
      $('inactiveExport').disabled = !ships.length;
    }
    if ($('inactiveMail')) {
      $('inactiveMail').textContent = E.mail;
      $('inactiveMail').disabled = !ships.length;
    }
    const W = t('workflow'), actions = $('inactiveActions'), selected = $('reopenInactiveShipment').value;
    actions.hidden = !ships.length;
    $('reopenInactiveLabel').textContent = W.selectShipment; $('reopenInactiveAction').textContent = W.reopenInactive || (AR() ? 'استعادة العملية' : 'Restore operation');
    $('reopenInactiveShipment').innerHTML = ships.map(sh => `<option value="${esc(sh.ref)}">${esc(ENTRY[dir][sh.rows[0]]?.shipNo || sh.ref)}</option>`).join('');
    if (ships.some(sh => sh.ref === selected)) $('reopenInactiveShipment').value = selected;
    $('inactivePage').hidden = pages.length <= 1; $('inactivePrev').disabled = INACTIVE_PAGE === 0; $('inactiveNext').disabled = INACTIVE_PAGE >= pages.length - 1;
    $('inactivePageInfo').textContent = pages.length ? `${INACTIVE_PAGE + 1} / ${pages.length}` : '';
    $('inactiveHead').innerHTML = '<tr>' + cols.map(c => `<th class="grp-${c.g}" style="--gc:${GROUPS[c.g].c}"><span>${esc(AR() ? (c.ar || c.h) : c.h)}</span></th>`).join('') + `<th class="archive-select">${AR() ? 'تحديد' : 'Select'}</th></tr>`;
    $('inactiveBody').innerHTML = shown.length ? shown.map(sh => sh.rows.map((i, ri) => {
      const row = ENTRY[dir][i]; return '<tr>' + cols.map(c => {
        const sp = spanOf(sh, c, ri); if (sp.start !== ri) return '';
        const value = c.k === 'status' ? W.inactive : c.k === 'updates' ? ((ROWMETA[dir][i]?.updates || []).map(u => u.text).join(' | ')) : displayValue(c, row[c.k] || '');
        return `<td class="grp-${c.g}" style="--gc:${GROUPS[c.g].c}" ${sp.len > 1 ? `rowspan="${sp.len}"` : ''}><span>${c.k === 'status' ? `<span class="status-pill inactive" style="background:#fff1f2;color:#be123c;border:1px solid #fecdd3;padding:2px 8px;border-radius:999px;font-weight:700">${esc(W.inactive)}</span>` : esc(value || '—')}</span></td>`;
      }).join('') + (ri ? '' : `<td class="archive-select" rowspan="${sh.rows.length}"><input type="checkbox" aria-label="${AR() ? 'تحديد الشحنة' : 'Select shipment'} ${esc(sh.ref)}" data-ref="${esc(sh.ref)}" ${selectedRefs.has(sh.ref) ? 'checked' : ''} onchange="__FTL__.toggleInactiveSelection(this.dataset.ref)"></td>`) + '</tr>';
    }).join('')).join('') : `<tr><td colspan="${cols.length + 1}">${allInactive.length ? (AR() ? 'لا توجد شحنات غير نشطة مطابقة للفلتر' : 'No inactive shipments match the filter') : W.noInactive}</td></tr>`;
  }
  function openInactive() {
    setTab('Inactive');
    __emit('tabChange', 'Inactive');
  }

  /* =====================================================================
     OPERATION & SHIPMENT PACKAGE RECONCILIATION & BALANCE ALERTS
     ===================================================================== */
  function operationPackageReconciliation(dir, ref) {
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !ship.rows.length) return null;
    let totalShipmentPkgs = 0;
    let totalLoadedPkgs = 0;
    const shipmentRecons = [];

    const shpSpans = (Array.isArray(ship.shpSpans) && ship.shpSpans.length)
      ? ship.shpSpans
      : [[0, ship.rows.length]];

    let anyOverload = false;
    let anyPartial = false;

    const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);

    shpSpans.forEach(([start, len], shpIdx) => {
      const shpRow = ENTRY[dir][ship.rows[start]] || {};
      const shpPkgs = parseInt(normalizeDigits(shpRow.packages || '0'), 10) || 0;
      totalShipmentPkgs += shpPkgs;

      let loadedForThisShp = 0;
      const hasAnyAlloc = ship.rows.some(rx => (Array.isArray(ENTRY[dir][rx]?._allocations) && ENTRY[dir][rx]._allocations.length) || (ENTRY[dir][rx]?.assignedShp != null && ENTRY[dir][rx]?.assignedShp !== ''));
      const isMultiShip = shpSpans.length > 1;
      if (isSGreater || hasAnyAlloc || isMultiShip) {
        const seenTrucks = new Set();
        ship.rows.forEach(rx => {
          const row = ENTRY[dir][rx];
          const trkId = row?._coLoadId || ship.trkOf?.[ship.rows.indexOf(rx)] || rx;
          if (seenTrucks.has(trkId)) return;
          seenTrucks.add(trkId);
          if (row && Array.isArray(row._allocations) && row._allocations.length) {
            row._allocations.forEach(a => {
              if (parseInt(a.shpIdx, 10) === shpIdx) {
                loadedForThisShp += (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0);
              }
            });
          } else if (row && row.assignedShp !== undefined && row.assignedShp !== null && row.assignedShp !== '') {
            if (parseInt(row.assignedShp, 10) === shpIdx) {
              loadedForThisShp += (parseInt(normalizeDigits(row.loadedPackages || '0'), 10) || 0);
            }
          }
        });
      } else {
        for (let r = start; r < start + len && r < ship.rows.length; r++) {
          const row = ENTRY[dir][ship.rows[r]];
          if (row) {
            loadedForThisShp += (parseInt(normalizeDigits(row.loadedPackages || '0'), 10) || 0);
          }
        }
      }
      totalLoadedPkgs += loadedForThisShp;

      const diff = shpPkgs - loadedForThisShp;
      let shpStatus = 'neutral';
      if (shpPkgs > 0) {
        if (loadedForThisShp === 0) shpStatus = 'unloaded';
        else if (loadedForThisShp === shpPkgs) shpStatus = 'balanced';
        else if (loadedForThisShp < shpPkgs) { shpStatus = 'partial'; anyPartial = true; }
        else if (loadedForThisShp > shpPkgs) { shpStatus = 'overload'; anyOverload = true; }
      }

      shipmentRecons.push({
        index: shpIdx + 1,
        ref: shpRow.shipNo || `SHP-${shpIdx + 1}`,
        hawb: shpRow.hawb || '',
        client: shpRow.client || '',
        packages: shpPkgs,
        loadedPackages: loadedForThisShp,
        diff,
        status: shpStatus,
        truckCount: len
      });
    });

    const diff = totalShipmentPkgs - totalLoadedPkgs;
    let status = 'neutral';
    if (totalShipmentPkgs > 0) {
      if (anyOverload) status = 'overload';
      else if (anyPartial) status = 'partial';
      else if (totalLoadedPkgs === totalShipmentPkgs) status = 'balanced';
      else if (totalLoadedPkgs === 0) status = 'unloaded';
    }

    return {
      totalShipmentPkgs,
      totalLoadedPkgs,
      diff,
      status,
      anyOverload,
      anyPartial,
      shipments: shipmentRecons,
      pct: totalShipmentPkgs > 0 ? Math.round((totalLoadedPkgs / totalShipmentPkgs) * 100) : 0
    };
  }

  function setTruckShipment(ref, ri, targetVal, trkNo) {
    const dir = EDIR, ship = SHIPS[dir]?.[ref];
    if (!ship || !Array.isArray(ship.shpSpans)) return;
    if (EDITING && !commitEdit()) return;

    const S = ship.shpSpans.length;
    const rows = ENTRY[dir];
    const sourceRowIdx = ship.rows[ri];
    const sourceRow = rows[sourceRowIdx];
    if (!sourceRow) return;

    const plate = sourceRow.cntr || '—';

    // 1. Unassign action: user selected "-- Select Shipment --"
    if (targetVal === '' || targetVal === null || targetVal === undefined || isNaN(parseInt(targetVal, 10))) {
      sourceRow.assignedShp = null;
      sourceRow.loadedPackages = '';
      sourceRow.loadStatus = '';
      sourceRow._allocations = [];
      saveShipmentAllocationsDraft(ship.ref, dir);
      markDirty();
      renderEntry();
      scheduleSave();
      openTruckManifest(plate, sourceRowIdx);
      toast(AR() ? '✓ تم فك ربط الشاحنة بالشحنة' : '✓ Truck unassigned');
      return;
    }

    const targetShpIdx = parseInt(targetVal, 10);
    if (isNaN(targetShpIdx) || targetShpIdx < 0 || targetShpIdx >= S) return;

    const curSpanIdx = ship.shpSpans.findIndex(([a, l]) => ri >= a && ri < a + l);
    const curSpan = ship.shpSpans[curSpanIdx];
    const curSpanLen = curSpan ? curSpan[1] : 1;
    const T = truckCount(ship);
    const isShipmentsGreaterThanTrucks = S > T;

    // Dedicated handler for Shipments > Trucks (e.g. 4 shipments, 3 trucks):
    // When the user assigns a shipment from inside Truck Manifest, fetch and populate
    // its details directly into this row in front of the user!
    if (isShipmentsGreaterThanTrucks) {
      sourceRow.assignedShp = targetShpIdx;

      const targetSpan = ship.shpSpans[targetShpIdx];
      const targetMasterRowIdx = targetSpan ? ship.rows[targetSpan[0]] : -1;
      const targetMasterRow = targetMasterRowIdx >= 0 ? rows[targetMasterRowIdx] : null;

      const totTargetPkgs = parseInt(normalizeDigits(targetMasterRow?.packages || sourceRow.packages || '0'), 10) || 0;
      const loaded = parseInt(normalizeDigits(sourceRow.loadedPackages || '0'), 10) || 0;
      sourceRow.loadStatus = loaded > 0 ? (totTargetPkgs > 0 && loaded >= totTargetPkgs ? 'Full' : 'Partial') : '';
      if (!Array.isArray(sourceRow._allocations) || sourceRow._allocations.length <= 1) {
        sourceRow._allocations = [{ shpIdx: targetShpIdx, pkgs: loaded }];
      }
      saveShipmentAllocationsDraft(ship.ref, dir);

      markDirty();
      renderEntry();
      scheduleSave();
      openTruckManifest(plate, sourceRowIdx);

      const targetLabel = AR() ? `شحنة ${targetShpIdx + 1}` : `Shipment ${targetShpIdx + 1}`;
      toast(AR() ? `✓ تم تعيين الشاحنة إلى ${targetLabel}` : `✓ Truck assigned to ${targetLabel}`);
      return;
    }

    // If already in the target shipment span, just confirm the assignment
    if (curSpanIdx === targetShpIdx) {
      sourceRow.assignedShp = targetShpIdx;
      const shpRow = rows[ship.rows[ship.shpSpans[targetShpIdx][0]]] || sourceRow;
      const totTargetPkgs = parseInt(normalizeDigits(shpRow.packages || '0'), 10) || 0;
      const loaded = parseInt(normalizeDigits(sourceRow.loadedPackages || '0'), 10) || 0;
      sourceRow.loadStatus = loaded > 0 ? (totTargetPkgs > 0 && loaded >= totTargetPkgs ? 'Full' : 'Partial') : '';
      if (!Array.isArray(sourceRow._allocations) || sourceRow._allocations.length <= 1) {
        sourceRow._allocations = [{ shpIdx: targetShpIdx, pkgs: loaded }];
      }
      saveShipmentAllocationsDraft(ship.ref, dir);
      markDirty();
      renderEntry();
      scheduleSave();
      openTruckManifest(plate, sourceRowIdx);
      const targetLabel = AR() ? `شحنة ${targetShpIdx + 1}` : `Shipment ${targetShpIdx + 1}`;
      toast(AR() ? `✓ تم ربط الشاحنة بـ ${targetLabel}` : `✓ Truck assigned to ${targetLabel}`);
      return;
    }

    // If source shipment only has 1 truck row, SWAP with target shipment row so source shipment never vanishes
    if (curSpanLen === 1) {
      const targetSpan = ship.shpSpans[targetShpIdx];
      const swapRi = targetSpan ? targetSpan[0] : -1;
      if (swapRi >= 0 && swapRi !== ri) {
        const swapRowIdx = ship.rows[swapRi];
        const swapRow = rows[swapRowIdx];

        // Swap truck columns
        const trkKeys = laneKeys(dir, 'trk');
        trkKeys.forEach(k => {
          const tmp = sourceRow[k];
          sourceRow[k] = swapRow[k];
          swapRow[k] = tmp;
        });

        // Swap loadedPackages and loadStatus
        const tmpPkgs = sourceRow.loadedPackages;
        sourceRow.loadedPackages = swapRow.loadedPackages;
        swapRow.loadedPackages = tmpPkgs;

        const tmpStat = sourceRow.loadStatus;
        sourceRow.loadStatus = swapRow.loadStatus;
        swapRow.loadStatus = tmpStat;

        const tmpAssigned = sourceRow.assignedShp;
        sourceRow.assignedShp = swapRow.assignedShp;
        swapRow.assignedShp = targetShpIdx;

        const tmpAlloc = sourceRow._allocations;
        sourceRow._allocations = swapRow._allocations;
        swapRow._allocations = tmpAlloc;
        saveShipmentAllocationsDraft(ship.ref, dir);

        if (Array.isArray(ship.trkOf)) {
          const tmpTrk = ship.trkOf[ri];
          ship.trkOf[ri] = ship.trkOf[swapRi];
          ship.trkOf[swapRi] = tmpTrk;
          ship.trkSpans = spansFromTrkOf(ship.trkOf);
        }

        if (ROWMETA[dir][sourceRowIdx] && ROWMETA[dir][swapRowIdx]) {
          const tmpUpd = ROWMETA[dir][sourceRowIdx].updates;
          ROWMETA[dir][sourceRowIdx].updates = ROWMETA[dir][swapRowIdx].updates;
          ROWMETA[dir][swapRowIdx].updates = tmpUpd;
        }

        markDirty();
        renderEntry();
        scheduleSave();

        const targetLabel = AR() ? `شحنة ${targetShpIdx + 1}` : `Shipment ${targetShpIdx + 1}`;
        toast(AR() ? `✓ تم تغيير الشاحنة إلى ${targetLabel}` : `✓ Truck changed to ${targetLabel}`);
        openTruckManifest(plate, swapRowIdx);
        return;
      }
    }

    // If source shipment has multiple trucks, we can move this row into target shipment span
    const currentAssignments = ship.rows.map((rx, k) => {
      const r = rows[rx];
      if (r?.assignedShp !== undefined && r?.assignedShp !== null && r?.assignedShp !== '') {
        const p = parseInt(r.assignedShp, 10);
        if (!isNaN(p) && p >= 0 && p < S) return p;
      }
      return ship.shpSpans.findIndex(([a, l]) => k >= a && k < a + l);
    });

    const newAssignments = currentAssignments.slice();
    newAssignments[ri] = targetShpIdx;

    const shpData = ship.shpSpans.map(([start]) => {
      const row = rows[ship.rows[start]] || {};
      const d = {};
      laneKeys(dir, 'shp').forEach(k => { d[k] = row[k] ?? ''; });
      return d;
    });

    const trkData = ship.rows.map((rowIdx, k) => {
      const row = rows[rowIdx] || {};
      const d = {};
      laneKeys(dir, 'trk').forEach(k2 => { d[k2] = row[k2] ?? ''; });
      d.loadedPackages = row.loadedPackages ?? '';
      d.loadStatus = row.loadStatus ?? '';
      d.metaUpdates = (ROWMETA[dir][rowIdx]?.updates || []).map(u => ({ ...u }));
      d.assignedShp = (k === ri) ? targetShpIdx : newAssignments[k];
      d._allocations = Array.isArray(row._allocations) ? row._allocations.map(a => ({ ...a })) : [];
      d.trkNo = ship.trkOf ? ship.trkOf[k] : (k + 1);
      d.isTargetTruck = (k === ri);
      return d;
    });

    trkData.sort((a, b) => a.assignedShp - b.assignedShp);

    const newTrkOf = trkData.map(td => td.trkNo);
    ship.trkOf = newTrkOf;
    ship.trkSpans = spansFromTrkOf(newTrkOf);

    const newSpans = [];
    let curStart = 0;
    for (let s = 0; s < S; s++) {
      const count = trkData.filter(t => t.assignedShp === s).length;
      newSpans.push([curStart, count]);
      curStart += count;
    }

    trkData.forEach((td, k) => {
      const rIdx = ship.rows[k];
      laneKeys(dir, 'trk').forEach(k2 => {
        ENTRY[dir][rIdx][k2] = td[k2] ?? '';
      });
      ENTRY[dir][rIdx].loadedPackages = td.loadedPackages;
      ENTRY[dir][rIdx].loadStatus = td.loadStatus;
      ENTRY[dir][rIdx].assignedShp = td.assignedShp;
      ENTRY[dir][rIdx]._allocations = td._allocations;
      if (ROWMETA[dir][rIdx]) {
        ROWMETA[dir][rIdx].updates = td.metaUpdates;
      }
    });

    newSpans.forEach(([start, len], sIdx) => {
      const data = shpData[sIdx];
      for (let r = start; r < start + len && r < ship.rows.length; r++) {
        const rIdx = ship.rows[r];
        laneKeys(dir, 'shp').forEach(k => {
          ENTRY[dir][rIdx][k] = data[k] ?? '';
        });
      }
    });

    ship.shpSpans = newSpans;
    ship.per = newSpans.length;
    saveShipmentAllocationsDraft(ship.ref, dir);
    markDirty();
    renderEntry();
    scheduleSave();

    const newTargetRelIdx = trkData.findIndex(td => td.isTargetTruck);
    const newRowIdx = (newTargetRelIdx >= 0) ? ship.rows[newTargetRelIdx] : sourceRowIdx;
    const targetLabel = AR() ? `شحنة ${targetShpIdx + 1}` : `Shipment ${targetShpIdx + 1}`;
    toast(AR() ? `✓ تم تغيير الشاحنة إلى ${targetLabel}` : `✓ Truck changed to ${targetLabel}`);
    openTruckManifest(plate, newRowIdx);
  }

  /* ---------- Co-loading & Multi-Shipment Truck Allocation ---------- */
  function addTruckCoLoad(ref, truckRowIndex, targetShpIdx, loadedPkgs, reopenManifest = true) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !Array.isArray(ship.shpSpans) || !ship.rows.length) return false;
    if (EDITING && !commitEdit()) return false;
    if (!canMutateOperation(ref)) {
      toast(AR() ? '⚠️ يجب تفعيل وضع التعديل أولاً لإجراء أي تغييرات' : 'Please enable Edit mode first to make changes', 'error');
      return false;
    }

    const rows = ENTRY[dir];
    const sourceRow = rows[truckRowIndex];
    if (!sourceRow) return false;

    const ri = ship.rows.indexOf(truckRowIndex);
    if (ri < 0) return false;

    const S = ship.shpSpans.length;
    if (targetShpIdx < 0 || targetShpIdx >= S) return false;

    // In all modes: Co-load allocations are tracked cleanly on the truck's allocations array
    if (!Array.isArray(sourceRow._allocations)) {
      sourceRow._allocations = [];
    }
    if (!sourceRow._allocations.length) {
      if (sourceRow.assignedShp != null) {
        const curShp = parseInt(sourceRow.assignedShp, 10);
        const curP = parseInt(normalizeDigits(sourceRow.loadedPackages || '0'), 10) || 0;
        if (curP > 0) sourceRow._allocations = [{ shpIdx: Math.max(0, curShp), pkgs: curP }];
      } else if (S === 1) {
        const curP = parseInt(normalizeDigits(sourceRow.loadedPackages || '0'), 10) || 0;
        sourceRow._allocations = [{ shpIdx: 0, pkgs: curP }];
        sourceRow.assignedShp = 0;
      }
    }
    if (sourceRow.assignedShp == null) {
      sourceRow.assignedShp = targetShpIdx;
    }

    const existing = sourceRow._allocations.find(a => a.shpIdx === targetShpIdx);
    const pkgsNum = parseInt(normalizeDigits(String(loadedPkgs || '0')), 10) || 0;
    if (existing) {
      existing.pkgs = pkgsNum;
    } else {
      sourceRow._allocations.push({ shpIdx: targetShpIdx, pkgs: pkgsNum });
    }

    const sum = sourceRow._allocations.reduce((acc, a) => acc + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0);
    const grp = groupRows(ship, COLS[dir].find(c => c.k === 'loadedPackages'), truckRowIndex);
    const calcStatus = computeAllocLoadStatus(ship, dir, sourceRow._allocations, sum) || (sum > 0 ? 'Full' : '');
    grp.forEach(r => {
      const row = rows[r];
      if (row) {
        row._allocations = sourceRow._allocations.map(a => ({ ...a }));
        row.loadedPackages = sum > 0 ? String(sum) : '';
        row.loadStatus = calcStatus;
        row.assignedShp = sourceRow.assignedShp;
      }
    });

    saveShipmentAllocationsDraft(dir, ship.ref);
    markDirty();
    renderEntry();
    scheduleSave();
    if (reopenManifest) openTruckManifest(sourceRow.cntr || '', truckRowIndex);

    const targetRow = rows[ship.rows[ship.shpSpans[targetShpIdx][0]]];
    const targetShpName = targetRow?.shipNo || `SHP-${targetShpIdx + 1}`;
    toast(AR() ? `✓ تم إضافة حمولة من (${targetShpName}) للشاحنة بنجاح!` : `✓ Shipment allocation added to truck!`);
    return true;
  }

  function removeTruckCoLoad(ref, truckRowIndex, allocIdx) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !ship.rows.length) return false;
    if (EDITING && !commitEdit()) return false;
    if (!canMutateOperation(ref)) {
      toast(AR() ? '⚠️ يجب تفعيل وضع التعديل أولاً لإجراء أي تغييرات' : 'Please enable Edit mode first to make changes', 'error');
      return false;
    }

    const ri = ship.rows.indexOf(truckRowIndex);
    if (ri < 0) return false;

    const rows = ENTRY[dir];
    const targetRow = rows[truckRowIndex];
    if (!targetRow) return false;

    const grp = groupRows(ship, COLS[dir].find(c => c.k === 'loadedPackages'), truckRowIndex);
    if (Array.isArray(targetRow._allocations) && targetRow._allocations.length > 1) {
      const idx = typeof allocIdx === 'number' ? allocIdx : (targetRow._allocations.length - 1);
      if (idx >= 0 && idx < targetRow._allocations.length) {
        targetRow._allocations.splice(idx, 1);
      }
      const sum = targetRow._allocations.reduce((acc, a) => acc + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0);
      const calcStatus = computeAllocLoadStatus(ship, dir, targetRow._allocations, sum) || (sum > 0 ? 'Full' : '');
      grp.forEach(r => {
        const row = rows[r];
        if (row) {
          row._allocations = targetRow._allocations.map(a => ({ ...a }));
          row.loadedPackages = sum > 0 ? String(sum) : '';
          row.loadStatus = calcStatus;
          if (row.assignedShp != null && !targetRow._allocations.some(a => a.shpIdx === row.assignedShp)) {
            row.assignedShp = targetRow._allocations[0]?.shpIdx ?? null;
          }
        }
      });
    } else {
      grp.forEach(r => {
        const row = rows[r];
        if (row) {
          row.loadedPackages = '';
          row.loadStatus = '';
          row._allocations = [];
          row.assignedShp = null;
        }
      });
      targetRow.loadedPackages = '';
      targetRow.loadStatus = '';
      targetRow._allocations = [];
      targetRow.assignedShp = null;
    }

    saveShipmentAllocationsDraft(dir, ship.ref);
    markDirty();
    renderEntry();
    scheduleSave();
    openTruckManifest(targetRow.cntr || '', truckRowIndex);

    toast(AR() ? '✓ تم إزالة حصة الشحنة من الشاحنة.' : '✓ Shipment allocation removed from truck.');
    return true;
  }

  function updateTruckAllocationPkgs(ref, truckRowIndex, pkgs, allocIdx) {
    const dir = EDIR;
    const row = ENTRY[dir]?.[truckRowIndex];
    if (!row) return;
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !canMutateOperation(ref)) {
      toast(AR() ? '⚠️ يجب تفعيل وضع التعديل أولاً لإجراء أي تغييرات' : 'Please enable Edit mode first to make changes', 'error');
      return;
    }
    const val = parseInt(normalizeDigits(String(pkgs || '0')), 10) || 0;
    const S = ship?.shpSpans?.length || 1;

    if (!Array.isArray(row._allocations) || !row._allocations.length) {
      if (row.assignedShp != null) {
        const curShp = parseInt(row.assignedShp, 10);
        row._allocations = [{ shpIdx: Math.max(0, curShp), pkgs: val }];
      } else if (S === 1) {
        row._allocations = [{ shpIdx: 0, pkgs: val }];
        row.assignedShp = 0;
      } else {
        row._allocations = [];
      }
    } else {
      const idx = (typeof allocIdx === 'number' && allocIdx >= 0 && allocIdx < row._allocations.length) ? allocIdx : 0;
      if (row._allocations[idx]) row._allocations[idx].pkgs = val;
    }
    const sum = (row._allocations || []).reduce((acc, a) => acc + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0);
    const grp = ship ? groupRows(ship, COLS[dir].find(c => c.k === 'loadedPackages'), truckRowIndex) : [truckRowIndex];
    const calcStatus = computeAllocLoadStatus(ship, dir, row._allocations, sum) || (sum > 0 ? 'Full' : '');
    grp.forEach(r => {
      const rx = ENTRY[dir]?.[r];
      if (rx) {
        rx._allocations = (row._allocations || []).map(a => ({ ...a }));
        rx.loadedPackages = sum > 0 ? String(sum) : '';
        rx.loadStatus = calcStatus;
        rx.assignedShp = row.assignedShp;
      }
    });
    saveShipmentAllocationsDraft(dir, ship?.ref);
    markDirty();
    renderEntry();
    scheduleSave();
    openTruckManifest(row.cntr || '', truckRowIndex);
  }

  function changeTruckAllocShp(ref, truckRowIndex, allocIdx, newShpIdx) {
    const dir = EDIR;
    const row = ENTRY[dir]?.[truckRowIndex];
    if (!row || !Array.isArray(row._allocations)) return;
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !canMutateOperation(ref)) {
      toast(AR() ? '⚠️ يجب تفعيل وضع التعديل أولاً لإجراء أي تغييرات' : 'Please enable Edit mode first to make changes', 'error');
      return;
    }
    if (row._allocations[allocIdx]) {
      row._allocations[allocIdx].shpIdx = newShpIdx;
      if (allocIdx === 0) row.assignedShp = newShpIdx;
      if (ship) {
        const grp = groupRows(ship, COLS[dir].find(c => c.k === 'loadedPackages'), truckRowIndex);
        grp.forEach(r => {
          const rx = ENTRY[dir]?.[r];
          if (rx) {
            rx._allocations = row._allocations.map(a => ({ ...a }));
            if (allocIdx === 0) rx.assignedShp = newShpIdx;
          }
        });
      }
      saveShipmentAllocationsDraft(dir, ship?.ref);
      markDirty();
      renderEntry();
      scheduleSave();
      openTruckManifest(row.cntr || '', truckRowIndex);
    }
  }

  /* =====================================================================
     POPOVERS: TRUCK MANIFEST & SHIPMENT BREAKDOWN
     ===================================================================== */
  function openTruckManifest(plateOrVal, rowIndex) {
    $('shipmentBreakdownModal')?.classList.remove('open');
    const dir = EDIR, rows = ENTRY[dir] || [];
    const targetRow = rows[rowIndex] || {};
    const ship = rowShip(dir, rowIndex);
    const shipRows = ship ? ship.rows.map(ix => rows[ix]) : [targetRow];
    const plate = targetRow.cntr || plateOrVal || '—';
    const ri = ship ? ship.rows.indexOf(rowIndex) : 0;
    const trkNo = (ship && Array.isArray(ship.trkOf)) ? ship.trkOf[ri] : null;

    const S = ship?.shpSpans?.length || 0;
    const T = ship ? truckCount(ship) : 0;
    const isSGreater = S > T;
    const ref = ship?.ref || '';
    const isEditMode = Boolean(ref && isModalEditActive(ref, rowIndex, 'truck'));
    const isSaving = Boolean(ref && SAVING_SHIPS.has(ref));
    LAST_OPEN_MANIFEST = { type: 'truck', ident: plateOrVal, rowIndex, ref };
    if (!MANIFEST_GRID_SCROLL) {
      const g = root.querySelector('.egrid');
      if (g) MANIFEST_GRID_SCROLL = { left: g.scrollLeft, top: g.scrollTop };
    }

    let truckRows = shipRows.filter(r => {
      const ix = rows.indexOf(r);
      const r_ri = ship ? ship.rows.indexOf(ix) : -1;
      if (r === targetRow) return true;
      if (plate && plate !== '—' && r.cntr && String(r.cntr).trim().toUpperCase() === String(plate).trim().toUpperCase()) return true;
      if (targetRow.cntr && String(targetRow.cntr).trim() && r.cntr && String(r.cntr).trim().toUpperCase() === String(targetRow.cntr).trim().toUpperCase()) return true;
      if (targetRow._coLoadId && r._coLoadId && r._coLoadId === targetRow._coLoadId) return true;
      if (!isSGreater && trkNo !== null && trkNo !== undefined && r_ri >= 0 && ship.trkOf?.[r_ri] === trkNo) return true;
      return false;
    });
    if (!truckRows.length) truckRows = [targetRow];

    const driverName = targetRow.driver || truckRows.find(r => r.driver)?.driver || '—';
    const driverMob = targetRow.mob || truckRows.find(r => r.mob)?.mob || '—';
    const truckType = targetRow.truckType || truckRows.find(r => r.truckType)?.truckType || '—';
    const trucker = targetRow.trucker || truckRows.find(r => r.trucker)?.trucker || '—';

    if (!Array.isArray(targetRow._allocations) || !targetRow._allocations.length) {
      if (targetRow.assignedShp != null) {
        const curShp = parseInt(targetRow.assignedShp, 10);
        const curP = parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0;
        targetRow._allocations = [{ shpIdx: Math.max(0, curShp), pkgs: curP }];
      } else if (S === 1) {
        const curP = parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0;
        targetRow._allocations = [{ shpIdx: 0, pkgs: curP }];
        targetRow.assignedShp = 0;
      } else {
        targetRow._allocations = [];
        targetRow.assignedShp = null;
      }
    }

    const totalTruckPkgs = (targetRow._allocations || []).reduce((acc, a) => acc + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0)
      || parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0;
    const totalTruckWt = truckRows.reduce((acc, r) => acc + (parseFloat(normalizeDigits(r.weight || '0')) || 0), 0);

    const trkLabel = (plate && plate !== '—') ? plate : (AR() ? `شاحنة ${trkNo || 1}` : `Truck ${trkNo || 1}`);
    $('truckManifestTitle').textContent = AR() ? `🚚 بيان حمولة الشاحنة (${trkLabel})` : `🚚 Truck Manifest (${trkLabel})`;
    const pillsEl = $('truckManifestPills');
    if (pillsEl) {
      pillsEl.innerHTML = (plate && plate !== '—')
        ? `<div class="egypt-plate-badge"><span class="plate-egypt">مصر</span><span class="plate-code">${esc(plate)}</span></div>`
        : `<div class="egypt-plate-badge"><span class="plate-code">${AR() ? 'شاحنة ' + (trkNo || 1) : 'Truck ' + (trkNo || 1)}</span></div>`;
    }

    const actionsEl = $('truckManifestActions');
    if (actionsEl) {
      if (isShipLockedByOther(ship)) {
        actionsEl.innerHTML = `
          <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fde68a;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>${AR() ? `قيد التعديل (${esc(ship?.lockedByName || 'مستخدم آخر')})` : `Locked (${esc(ship?.lockedByName || 'Other')})`}</span>
          </div>
        `;
      } else if (!isEditMode) {
        actionsEl.innerHTML = `
          <button type="button" class="manifest-action-btn edit" onclick="__FTL__.startEditFromManifest('${esc(ref)}', '${esc(plate)}', ${rowIndex}, 'truck')" title="${AR() ? 'تفعيل وضع التعديل لتعديل الحمولات وتوزيع الطرود' : 'Enable edit mode'}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:750;background:#ffffff;color:#0369a1;border:1.5px solid #7dd3fc;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.12);transition:all 0.15s">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <span>${AR() ? 'تعديل التوزيع' : 'Edit Allocation'}</span>
          </button>
        `;
      } else if (ACTIVE_EDIT_SHIPS.has(ref)) {
        actionsEl.innerHTML = `
          <button type="button" class="manifest-action-btn done" onclick="__FTL__.closeM('truckManifestModal')" style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:8px;font-size:12.5px;font-weight:750;background:#0284c7;color:#ffffff;border:none;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);transition:all 0.15s">
            <span>✓ ${AR() ? 'تم وتطبيق التوزيع' : 'Done & Apply'}</span>
          </button>
        `;
      } else {
        actionsEl.innerHTML = `
          <button type="button" class="manifest-action-btn save" onclick="__FTL__.saveFromManifest('${esc(ref)}', '${esc(plate)}', ${rowIndex}, 'truck')" ${isSaving ? 'disabled' : ''} style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:750;background:#10b981;color:#ffffff;border:none;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);transition:all 0.15s">
            ${isSaving ? (AR() ? '⏳ جاري الحفظ...' : 'Saving...') : '💾 ' + (AR() ? 'حفظ التوزيع' : 'Save Allocation')}
          </button>
          <button type="button" class="manifest-cancel-btn" onclick="__FTL__.cancelFromManifest('${esc(ref)}', '${esc(plate)}', ${rowIndex}, 'truck')" ${isSaving ? 'disabled' : ''} style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:650;background:#ffffff;color:#475569;border:1px solid #cbd5e1;cursor:pointer">
            ✕ ${AR() ? 'إلغاء' : 'Cancel'}
          </button>
        `;
      }
    }

    const isMultiShip = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > 1;

    let tblRows = '';
    if (!(targetRow._allocations || []).length) {
      tblRows = `<tr><td colspan="10" style="text-align:center;color:#64748b;padding:16px;font-weight:700">⏳ ${AR() ? 'لم يتم تعيين أي شحنة لهذه الشاحنة بعد — يمكنك اختيار شحنة وإدخال الطرود من الأسفل' : 'No shipments assigned to this truck yet — select a shipment below'}</td></tr>`;
    } else {
      tblRows = (targetRow._allocations || []).map((alloc, allocIdx) => {
        const curShpIdx = alloc.shpIdx;
        const shpSpan = (curShpIdx >= 0 && ship?.shpSpans) ? ship.shpSpans[curShpIdx] : null;
        const shpRow = (ship && shpSpan) ? rows[ship.rows[shpSpan[0]]] || null : null;

        const effectiveShipNo = shpRow?.shipNo || (AR() ? `شحنة ${curShpIdx + 1}` : `Shipment ${curShpIdx + 1}`);
        const hawb = shpRow?.hawb || '—';
        const client = shpRow?.client || '—';
        const loadedPkgs = parseInt(normalizeDigits(String(alloc.pkgs || '0')), 10) || 0;
        const totalShipmentPkgs = parseInt(normalizeDigits(shpRow?.packages || '0'), 10) || 0;

        let statusHtml = '';
        if (loadedPkgs === 0) {
          statusHtml = `<span style="background:#fef3c7;color:#92400e;padding:3px 8px;border-radius:4px;font-weight:700;font-size:11px">📦 ${AR() ? 'لم يتم إدخال الطرود' : 'Pkgs not entered'}</span>`;
        } else if (totalShipmentPkgs > 0 && loadedPkgs >= totalShipmentPkgs) {
          statusHtml = `<span class="manifest-tag-full">✓ ${AR() ? 'حمولة كاملة (100%)' : 'Full (100%)'}</span>`;
        } else if (totalShipmentPkgs > 0 && loadedPkgs < totalShipmentPkgs) {
          const pct = Math.round((loadedPkgs / totalShipmentPkgs) * 100);
          statusHtml = `<span class="manifest-tag-partial">⚡ ${AR() ? `جزء من الشحنة (${loadedPkgs} من ${totalShipmentPkgs} · ${pct}%)` : `Partial (${loadedPkgs}/${totalShipmentPkgs} · ${pct}%)`}</span>`;
        } else {
          statusHtml = `<span class="manifest-tag-full">${loadedPkgs} ${AR() ? 'طرد' : 'pkgs'}</span>`;
        }

        const term = shpRow?.line || shpRow?.aod || 'CAI';
        const dest = shpRow?.dest || '—';
        const canDeleteAllocation = S > 1 ? (targetRow._allocations || []).length > 0 : (targetRow._allocations || []).length > 1;

        const shpOptionsHtml = (ship && Array.isArray(ship.shpSpans)) ? ship.shpSpans.map(([start, len], sIdx) => {
          const sRow = rows[ship.rows[start]] || {};
          const isPl = plate && plate !== '—' && sRow.shipNo && sRow.shipNo.trim().toUpperCase() === plate;
          const sName = (sRow.shipNo && !isPl) ? sRow.shipNo : (AR() ? `شحنة ${sIdx + 1}` : `Shipment ${sIdx + 1}`);
          const sClient = sRow.client ? ` · ${sRow.client}` : '';
          const sPkgs = sRow.packages ? ` (${sRow.packages} طرد)` : '';
          const isSelected = (sIdx === curShpIdx);
          return `<option value="${sIdx}" ${isSelected ? 'selected' : ''}>${esc(sName)}${esc(sClient)}${esc(sPkgs)}</option>`;
        }).join('') : '';

        const shpSelectHtml = isMultiShip
          ? (isEditMode
            ? `<select class="manifest-select" style="max-width:220px;width:100%;padding:4px 8px;border:1.5px solid #0284c7;border-radius:8px;font-weight:750;color:#0b4f7a;background:#f0f9ff;font-size:12px;cursor:pointer;text-overflow:ellipsis" onchange="__FTL__.changeTruckAllocShp('${esc(ship.ref)}', ${rowIndex}, ${allocIdx}, parseInt(this.value, 10));">
                ${shpOptionsHtml}
              </select>`
            : `<span style="display:inline-block;max-width:220px;padding:4px 10px;background:#f1f5f9;color:#0b4f7a;border-radius:6px;font-weight:750;font-size:12px;border:1px solid #cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${esc(effectiveShipNo)}">${esc(effectiveShipNo)}</span>`
          )
          : `<span style="font-weight:700;color:#0b4f7a;white-space:nowrap">${esc(effectiveShipNo)}</span>`;

        const pkgsCellHtml = isEditMode
          ? `<input type="number" min="0" value="${loadedPkgs > 0 ? loadedPkgs : ''}" placeholder="${AR() ? 'أدخل الطرود' : '0'}" style="width:75px;padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px;font-weight:800;text-align:center;color:#b45309" onchange="__FTL__.updateTruckAllocationPkgs('${esc(ship ? ship.ref : '')}',${rowIndex},this.value,${allocIdx})">`
          : `<span style="display:inline-block;min-width:55px;padding:3px 8px;border-radius:6px;font-weight:800;font-size:13.5px;text-align:center;color:#b45309;background:#fef3c7;border:1px solid #fde68a">${loadedPkgs > 0 ? `${loadedPkgs} ${AR() ? 'طرد' : 'pkgs'}` : `<span style="color:#94a3b8">—</span>`}</span>`;

        const actionCellHtml = isEditMode
          ? (canDeleteAllocation
            ? `<button type="button" class="delbtn" style="background:#fee2e2;border:none;border-radius:4px;color:#dc2626;cursor:pointer;padding:3px 8px;font-weight:700;font-size:11px" onclick="__FTL__.removeTruckCoLoad('${esc(ship ? ship.ref : '')}',${rowIndex},${allocIdx})" title="${AR() ? 'إزالة هذه الشحنة من الشاحنة' : 'Remove shipment from truck'}">🗑️ ${AR() ? 'إزالة' : 'Remove'}</button>`
            : '<span style="color:#94a3b8;font-size:11px">—</span>')
          : `<span style="color:#94a3b8;font-size:11px;font-weight:600">🔒 ${AR() ? 'للعرض فقط' : 'View only'}</span>`;

        return `<tr>
        <td style="font-weight:700;color:#64748b;text-align:center;width:38px">${allocIdx + 1}</td>
        <td style="font-weight:700;color:#0b4f7a;white-space:nowrap">${shpSelectHtml}</td>
        <td><div class="manifest-client-name" title="${esc(client)}">${esc(client)}</div></td>
        <td style="font-weight:600;font-family:monospace;white-space:nowrap">${esc(hawb)}</td>
        <td style="font-weight:800;color:#0284c7;font-size:13.5px;white-space:nowrap">${totalShipmentPkgs > 0 ? `${totalShipmentPkgs} ${AR() ? 'طرد' : 'pkgs'}` : '<span style="color:#94a3b8">—</span>'}</td>
        <td style="font-weight:800;color:#b45309;font-size:14px;white-space:nowrap">${pkgsCellHtml}</td>
        <td style="white-space:nowrap">${statusHtml}</td>
        <td style="font-weight:600;font-size:12px;white-space:nowrap">${esc(term)}</td>
        <td style="font-weight:600;font-size:12px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${esc(dest)}">${esc(dest)}</td>
        <td style="text-align:center;white-space:nowrap">${actionCellHtml}</td>
      </tr>`;
      }).join('');
    }

    const recon = ship ? operationPackageReconciliation(dir, ship.ref) : null;
    let reconNotice = '';
    if (recon && recon.totalShipmentPkgs > 0) {
      reconNotice = `<div class="manifest-recon-footer">
        <div class="manifest-recon-title">📦 ${AR() ? 'ميزان طرود العملية ككل:' : 'Full Operation Package Balance:'}</div>
        <div class="manifest-recon-items">
          <span class="manifest-recon-chip"><b>${recon.totalShipmentPkgs}</b> ${AR() ? 'طرد إجمالي الشحنات' : 'total shipment pkgs'}</span>
          <span class="manifest-recon-chip amber"><b>${recon.totalLoadedPkgs}</b> ${AR() ? 'محمل على السيارات' : 'loaded on all trucks'}</span>
          <span class="manifest-recon-status-badge ${recon.status === 'balanced' ? 'balanced' : recon.status === 'overload' ? 'overload' : 'remaining'}">
            <b>${recon.status === 'balanced' ? (AR() ? '✓ تم توزيع كل الطرود بالكامل والميزان سليم' : '✓ Fully balanced') : recon.status === 'overload' ? (AR() ? '🚨 تحذير: يوجد حمولة زائدة عن إجمالي البوليصة' : '🚨 Overload alert') : (AR() ? `⚡ متبقي ${recon.diff} طرد لم يُحمل بعد` : `⚡ ${recon.diff} pkgs remaining`)}</b>
          </span>
        </div>
      </div>`;
    }

    let coloadAdderHtml = '';
    if (ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > 1) {
      if (isEditMode) {
        const hasAllocs = (targetRow._allocations || []).length > 0;
        const adderLabel = hasAllocs
          ? `➕ ${AR() ? 'تحميل شحنة أخرى على هذه الشاحنة (Co-load):' : 'Co-load Another Shipment on this Truck:'}`
          : `➕ ${AR() ? 'تعيين شحنة وحمولة لهذه الشاحنة:' : 'Assign Shipment & Load to this Truck:'}`;
        const adderBtn = hasAllocs
          ? `➕ ${AR() ? 'إضافة الحصة للعربة' : 'Add to Truck'}`
          : `➕ ${AR() ? 'تعيين للشاحنة' : 'Assign to Truck'}`;

        const shpOptions = ship.shpSpans.map(([start, len], sIdx) => {
          const shRow = rows[ship.rows[start]] || {};
          const isPlateVal = plate && plate !== '—' && shRow.shipNo && shRow.shipNo.trim().toUpperCase() === plate;
          const sRef = (shRow.shipNo && !isPlateVal) ? shRow.shipNo : (AR() ? `شحنة ${sIdx + 1}` : `Shipment ${sIdx + 1}`);
          const sClient = shRow.client ? ` · ${shRow.client}` : '';
          const sPkgs = shRow.packages ? ` (${shRow.packages} طرد)` : '';
          return `<option value="${sIdx}">${esc(sRef)}${esc(sClient)}${esc(sPkgs)}</option>`;
        }).join('');

        coloadAdderHtml = `
          <div class="coload-adder-bar" style="margin-top:14px;padding:12px;background:#f8fafc;border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-weight:800;color:#0369a1;font-size:13px">${adderLabel}</span>
            <select id="coloadShpSelect" style="padding:6px 10px;border-radius:6px;border:1px solid #94a3b8;font-weight:700;font-size:12px">
              ${shpOptions}
            </select>
            <input type="number" id="coloadPkgsInput" placeholder="${AR() ? 'عدد الطرود' : 'Pkgs count'}" style="width:110px;padding:6px 10px;border-radius:6px;border:1px solid #94a3b8;font-weight:700;font-size:12px">
            <button type="button" class="ebtn" style="background:#0284c7;color:#fff;font-weight:800;border:none;border-radius:6px;padding:6px 14px;cursor:pointer" onclick="const sEl=document.getElementById('coloadShpSelect');const pEl=document.getElementById('coloadPkgsInput');if(sEl&&pEl&&pEl.value){__FTL__.addTruckCoLoad('${esc(ship ? ship.ref : '')}',${rowIndex},parseInt(sEl.value,10),parseInt(pEl.value,10));__FTL__.openTruckManifest('${esc(plate)}',${rowIndex});}">${adderBtn}</button>
          </div>
        `;
      } else {
        coloadAdderHtml = `
          <div class="coload-adder-bar view-only" style="margin-top:14px;padding:10px 16px;background:rgba(241, 245, 249, 0.7);border:1px dashed #cbd5e1;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <span style="font-weight:650;color:#64748b;font-size:12.5px">🔒 ${AR() ? 'بيان الشاحنة في وضع القراءة فقط. اضغط على زر "تعديل التوزيع" بالأعلى لإضافة أو تعديل الحمولات.' : 'Truck manifest is in view-only mode. Click "Edit Allocation" above to modify loads.'}</span>
            <button type="button" onclick="__FTL__.startEditFromManifest('${esc(ref)}', '${esc(plate)}', ${rowIndex}, 'truck')" style="background:#0284c7;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-weight:750;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px">✏️ ${AR() ? 'تعديل التوزيع الآن' : 'Edit Allocation Now'}</button>
          </div>
        `;
      }
    }

    const carryingCount = (targetRow._allocations || []).length;
    $('truckManifestBody').innerHTML = `
      <div class="manifest-hero-grid">
        <div class="manifest-card truck-hero-card">
          <div class="card-top-label">🚛 ${AR() ? 'الشاحنة والناقل' : 'Truck & Transporter'}</div>
          <div class="card-main-val">🚚 ${esc(plate)} · <small style="font-weight:600;color:#64748b">${esc(truckType)}</small></div>
          <div class="card-sub-val">🏢 ${AR() ? 'شركة النقل:' : 'Carrier:'} <b>${esc(trucker)}</b></div>
        </div>
        <div class="manifest-card truck-hero-card">
          <div class="card-top-label">👤 ${AR() ? 'السائق والتواصل' : 'Driver & Contact'}</div>
          <div class="card-main-val">👤 ${esc(driverName)}</div>
          <div class="card-sub-val">
            ${driverMob && driverMob !== '—' ? `<a href="tel:${esc(driverMob)}" class="driver-call-btn">📞 ${esc(driverMob)}</a>` : '<span style="color:#94a3b8">—</span>'}
          </div>
        </div>
        <div class="manifest-card truck-hero-card">
          <div class="card-top-label">📦 ${AR() ? 'إجمالي حمولة السيارة' : 'Total Onboard Load'}</div>
          <div class="hero-huge-metric amber">${totalTruckPkgs} <small>${AR() ? 'طرد' : 'pkgs'}</small></div>
          <div class="card-sub-val">${carryingCount > 0 ? (AR() ? `شايلة ${carryingCount} شحنات` : `Carrying ${carryingCount} shipments`) : (AR() ? 'لم يتم تعيين أي شحنة بعد' : 'No shipment assigned yet')} ${totalTruckWt ? `· ${totalTruckWt.toFixed(1)} kg` : ''}</div>
        </div>
      </div>
      <div style="margin-bottom:10px;font-weight:800;font-size:14px;color:#1e293b;display:flex;align-items:center;justify-content:space-between">
        <span>📋 ${AR() ? `كشف الشحنات المحملة على هذه الشاحنة (${carryingCount})` : `Shipments Loaded on this Truck (${carryingCount})`}</span>
      </div>
      <div class="manifest-table-wrap">
        <table class="manifest-table truck-theme" dir="${AR() ? 'rtl' : 'ltr'}">
          <thead>
            <tr>
              <th style="width:40px;text-align:center">#</th>
              <th>${AR() ? 'رقم الشحنة' : 'Shipment #'}</th>
              <th>${AR() ? 'العميل' : 'Client'}</th>
              <th>${AR() ? 'بوليصة العميل (HAWB)' : 'HAWB'}</th>
              <th style="color:#0284c7;background:#f0f9ff">${AR() ? 'إجمالي طرود الشحنة' : 'Total Pkgs'}</th>
              <th>${AR() ? 'الطرود على الشاحنة' : 'Loaded Pkgs'}</th>
              <th>${AR() ? 'حالة الحمولة' : 'Load Status'}</th>
              <th>${AR() ? 'المحطة الجوية' : 'Terminal'}</th>
              <th>${AR() ? 'وجهة التسليم' : 'Destination'}</th>
              <th style="width:70px;text-align:center">${AR() ? 'إجراء' : 'Action'}</th>
            </tr>
          </thead>
          <tbody>${tblRows}</tbody>
        </table>
      </div>
      ${reconNotice}
      ${coloadAdderHtml}`;
    $('truckManifestModal').classList.add('open');
  }

  function addShipmentTruckAllocation(ref, shpIdx, truckRowIndex, pkgs) {
    return addTruckCoLoad(ref, truckRowIndex, shpIdx, pkgs, false);
  }

  function updateShipmentTruckAllocation(ref, shpIdx, truckRowIndex, pkgs) {
    const dir = EDIR, ship = SHIPS[dir]?.[ref], rows = ENTRY[dir];
    const targetRow = rows?.[truckRowIndex];
    if (!targetRow || !ship) return;
    if (!canMutateOperation(ref)) {
      toast(AR() ? '⚠️ يجب تفعيل وضع التعديل أولاً لإجراء أي تغييرات' : 'Please enable Edit mode first to make changes', 'error');
      return;
    }
    const val = parseInt(normalizeDigits(String(pkgs || '0')), 10) || 0;
    const S = ship.shpSpans?.length || 1;

    if (!Array.isArray(targetRow._allocations) || !targetRow._allocations.length) {
      if (targetRow.assignedShp != null) {
        const curShp = parseInt(targetRow.assignedShp, 10);
        const curP = parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0;
        targetRow._allocations = [{ shpIdx: Math.max(0, curShp), pkgs: curP }];
      } else if (S === 1) {
        targetRow._allocations = [{ shpIdx: 0, pkgs: parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0 }];
        targetRow.assignedShp = 0;
      } else {
        targetRow._allocations = [];
      }
    }

    const a = targetRow._allocations.find(x => x.shpIdx === shpIdx);
    if (a) {
      a.pkgs = val;
    } else {
      targetRow._allocations.push({ shpIdx, pkgs: val });
    }
    if (targetRow.assignedShp == null) {
      targetRow.assignedShp = shpIdx;
    }
    const sum = targetRow._allocations.reduce((acc, x) => acc + (parseInt(normalizeDigits(String(x.pkgs || '0')), 10) || 0), 0);
    const grp = groupRows(ship, COLS[dir].find(c => c.k === 'loadedPackages'), truckRowIndex);
    const calcStatus = computeAllocLoadStatus(ship, dir, targetRow._allocations, sum) || (sum > 0 ? 'Full' : '');
    grp.forEach(r => {
      const rx = rows[r];
      if (rx) {
        rx._allocations = targetRow._allocations.map(x => ({ ...x }));
        rx.loadedPackages = sum > 0 ? String(sum) : '';
        rx.loadStatus = calcStatus;
        rx.assignedShp = targetRow.assignedShp;
      }
    });
    saveShipmentAllocationsDraft(dir, ship?.ref);
    markDirty(); renderEntry(); scheduleSave();
  }

  function removeShipmentTruckAllocation(ref, shpIdx, truckRowIndex) {
    const dir = EDIR, ship = SHIPS[dir]?.[ref], rows = ENTRY[dir];
    const targetRow = rows?.[truckRowIndex];
    if (!targetRow || !ship) return;
    if (!canMutateOperation(ref)) {
      toast(AR() ? '⚠️ يجب تفعيل وضع التعديل أولاً لإجراء أي تغييرات' : 'Please enable Edit mode first to make changes', 'error');
      return;
    }
    const S = ship.shpSpans?.length || 1;

    if (!Array.isArray(targetRow._allocations) || !targetRow._allocations.length) {
      if (targetRow.assignedShp != null) {
        const curShp = parseInt(targetRow.assignedShp, 10);
        targetRow._allocations = [{ shpIdx: curShp, pkgs: parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0 }];
      } else if (S === 1) {
        targetRow._allocations = [{ shpIdx: 0, pkgs: parseInt(normalizeDigits(targetRow.loadedPackages || '0'), 10) || 0 }];
        targetRow.assignedShp = 0;
      } else {
        targetRow._allocations = [];
      }
    }

    const idx = targetRow._allocations.findIndex(x => x.shpIdx === shpIdx);
    if (idx >= 0) targetRow._allocations.splice(idx, 1);

    const hasAllocs = targetRow._allocations.length > 0;
    const sum = hasAllocs ? targetRow._allocations.reduce((acc, x) => acc + (parseInt(normalizeDigits(String(x.pkgs || '0')), 10) || 0), 0) : 0;
    const grp = groupRows(ship, COLS[dir].find(c => c.k === 'loadedPackages'), truckRowIndex);
    const calcStatus = computeAllocLoadStatus(ship, dir, targetRow._allocations, sum) || (sum > 0 ? 'Full' : '');
    grp.forEach(r => {
      const rx = rows[r];
      if (rx) {
        rx._allocations = hasAllocs ? targetRow._allocations.map(x => ({ ...x })) : [];
        rx.loadedPackages = sum > 0 ? String(sum) : '';
        rx.loadStatus = calcStatus;
        if (!hasAllocs) {
          rx.assignedShp = null;
        } else if (rx.assignedShp === shpIdx) {
          rx.assignedShp = targetRow._allocations[0].shpIdx;
        }
      }
    });
    saveShipmentAllocationsDraft(dir, ship?.ref);
    markDirty(); renderEntry(); scheduleSave();
  }

  function openShipmentBreakdown(shipNoOrVal, rowIndex) {
    $('truckManifestModal')?.classList.remove('open');
    const dir = EDIR, rows = ENTRY[dir] || [];
    const targetRow = rows[rowIndex] || {};
    const ship = rowShip(dir, rowIndex);
    const ri = ship ? ship.rows.indexOf(rowIndex) : 0;
    const curShpIdx = (ship && Array.isArray(ship.shpSpans)) ? ship.shpSpans.findIndex(([a, l]) => ri >= a && ri < a + l) : -1;
    const shpSpan = (curShpIdx >= 0 && ship.shpSpans) ? ship.shpSpans[curShpIdx] : [0, ship?.rows?.length || 1];
    const shpHeadRow = (ship && shpSpan) ? rows[ship.rows[shpSpan[0]]] || targetRow : targetRow;

    const shpRows = ship ? ship.rows.slice(shpSpan[0], shpSpan[0] + shpSpan[1]).map(ix => rows[ix]) : [targetRow];
    const shpIdent = shpHeadRow.shipNo || shpHeadRow.hawb || shipNoOrVal || ship?.ref || `SHP-${curShpIdx + 1}`;

    const client = shpHeadRow.client || '—';
    const mawb = shpHeadRow.mawb || shpHeadRow.bl || shpHeadRow.booking || '—';
    const hawb = shpHeadRow.hawb || '—';
    const aod = shpHeadRow.aod || 'CAI';
    const term = shpHeadRow.line || shpHeadRow.customs || '—';
    const dest = shpHeadRow.dest || '—';
    const totalShipmentPkgs = parseInt(normalizeDigits(shpHeadRow.packages || '0'), 10) || 0;
    const S = ship?.shpSpans?.length || 0;
    const T = ship ? truckCount(ship) : 0;
    const isSGreater = S > T;
    const ref = ship?.ref || '';
    const isEditMode = Boolean(ref && isModalEditActive(ref, rowIndex, 'shipment'));
    const isSaving = Boolean(ref && SAVING_SHIPS.has(ref));
    LAST_OPEN_MANIFEST = { type: 'shipment', ident: shipNoOrVal, rowIndex, ref };
    if (!MANIFEST_GRID_SCROLL) {
      const g = root.querySelector('.egrid');
      if (g) MANIFEST_GRID_SCROLL = { left: g.scrollLeft, top: g.scrollTop };
    }

    if ($('shipmentBreakdownTitle')) {
      $('shipmentBreakdownTitle').textContent = AR()
        ? `📦 بيان وتوزيع الشحنة على السيارات (${shpIdent})`
        : `📦 Shipment Distribution (${shpIdent})`;
    }
    const pillsEl = $('shipmentBreakdownPills');
    if (pillsEl) {
      pillsEl.innerHTML = `<div class="air-ship-badge">✈️ HAWB ${esc(hawb || '—')}</div>`;
    }

    const actionsEl = $('shipmentBreakdownActions');
    if (actionsEl) {
      if (isShipLockedByOther(ship)) {
        actionsEl.innerHTML = `
          <div style="display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:700;background:#fef3c7;color:#92400e;border:1px solid #fde68a;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            <span>${AR() ? `قيد التعديل (${esc(ship?.lockedByName || 'مستخدم آخر')})` : `Locked (${esc(ship?.lockedByName || 'Other')})`}</span>
          </div>
        `;
      } else if (!isEditMode) {
        actionsEl.innerHTML = `
          <button type="button" class="manifest-action-btn edit" onclick="__FTL__.startEditFromManifest('${esc(ref)}', '${esc(shpIdent)}', ${rowIndex}, 'shipment')" title="${AR() ? 'تفعيل وضع التعديل لتوزيع طرود الشحنة على الشاحنات' : 'Enable edit mode'}" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:750;background:#ffffff;color:#166534;border:1.5px solid #86efac;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.12);transition:all 0.15s">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            <span>${AR() ? 'تعديل التوزيع' : 'Edit Allocation'}</span>
          </button>
        `;
      } else if (ACTIVE_EDIT_SHIPS.has(ref)) {
        actionsEl.innerHTML = `
          <button type="button" class="manifest-action-btn done" onclick="__FTL__.closeM('shipmentBreakdownModal')" style="display:inline-flex;align-items:center;gap:6px;padding:6px 16px;border-radius:8px;font-size:12.5px;font-weight:750;background:#16a34a;color:#ffffff;border:none;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);transition:all 0.15s">
            <span>✓ ${AR() ? 'تم وتطبيق التوزيع' : 'Done & Apply'}</span>
          </button>
        `;
      } else {
        actionsEl.innerHTML = `
          <button type="button" class="manifest-action-btn save" onclick="__FTL__.saveFromManifest('${esc(ref)}', '${esc(shpIdent)}', ${rowIndex}, 'shipment')" ${isSaving ? 'disabled' : ''} style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:8px;font-size:12.5px;font-weight:750;background:#10b981;color:#ffffff;border:none;cursor:pointer;box-shadow:0 2px 4px rgba(0,0,0,0.15);transition:all 0.15s">
            ${isSaving ? (AR() ? '⏳ جاري الحفظ...' : 'Saving...') : '💾 ' + (AR() ? 'حفظ التوزيع' : 'Save Allocation')}
          </button>
          <button type="button" class="manifest-cancel-btn" onclick="__FTL__.cancelFromManifest('${esc(ref)}', '${esc(shpIdent)}', ${rowIndex}, 'shipment')" ${isSaving ? 'disabled' : ''} style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;border-radius:8px;font-size:12px;font-weight:650;background:#ffffff;color:#475569;border:1px solid #cbd5e1;cursor:pointer">
            ✕ ${AR() ? 'إلغاء' : 'Cancel'}
          </button>
        `;
      }
    }

    let totalLoadedAcrossTrucks = 0;
    let tblRows = '';
    let carryingTrucksCount = 0;

    if (curShpIdx >= 0) {
      const breakdownTrucks = [];
      const seen = new Set();
      ship.rows.forEach((rx, k) => {
        const r = rows[rx];
        const trkNo = ship.trkOf?.[k] || (k + 1);
        if (seen.has(trkNo)) return;
        seen.add(trkNo);
        let pkgsOnTruck = 0;
        let hasAlloc = false;
        if (Array.isArray(r._allocations) && r._allocations.length) {
          const a = r._allocations.find(x => parseInt(x.shpIdx, 10) === curShpIdx);
          if (a) {
            hasAlloc = true;
            pkgsOnTruck = parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0;
          }
        } else if (r.assignedShp !== undefined && r.assignedShp !== null && r.assignedShp !== '') {
          if (parseInt(r.assignedShp, 10) === curShpIdx) {
            hasAlloc = true;
            pkgsOnTruck = parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0;
          }
        } else if (S === 1 && ship && shpSpan && k >= shpSpan[0] && k < shpSpan[0] + shpSpan[1]) {
          hasAlloc = true;
          pkgsOnTruck = parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0;
        }
        if (hasAlloc) {
          breakdownTrucks.push({ r, pkgsOnTruck, trkNo, rx });
        }
      });

      totalLoadedAcrossTrucks = breakdownTrucks.reduce((sum, item) => sum + item.pkgsOnTruck, 0);
      carryingTrucksCount = breakdownTrucks.length;

      if (!breakdownTrucks.length) {
        tblRows = `<tr><td colspan="8" style="text-align:center;color:#64748b;padding:16px;font-weight:700">⏳ ${AR() ? 'لم يتم تعيين أي سيارة لهذه الشحنة بعد — يمكنك اختيار سيارة وإضافة حصة من النموذج بالأسفل' : 'No trucks assigned to this shipment yet — allocate a truck below'}</td></tr>`;
      } else {
        tblRows = breakdownTrucks.map((item, idx) => {
          const r = item.r;
          const plate = r.cntr || `${AR() ? 'شاحنة' : 'Truck'} ${item.trkNo || (idx + 1)}`;
          const truckType = r.truckType || '—';
          const trucker = r.trucker || '—';
          const driver = r.driver || '—';
          const mob = r.mob || '—';
          const pkgsOnTruck = item.pkgsOnTruck;
          const sharePct = totalShipmentPkgs > 0 ? Math.round((pkgsOnTruck / totalShipmentPkgs) * 100) : 0;
          const pkgsCellHtml = isEditMode
            ? `<input type="number" min="0" value="${pkgsOnTruck > 0 ? pkgsOnTruck : ''}" placeholder="${AR() ? 'أدخل الطرود' : '0'}" style="width:75px;padding:3px 6px;border:1px solid #cbd5e1;border-radius:4px;font-weight:800;text-align:center;color:#059669" onchange="__FTL__.updateShipmentTruckAllocation('${esc(ship ? ship.ref : '')}', ${curShpIdx}, ${item.rx}, this.value);__FTL__.openShipmentBreakdown('${esc(shpIdent)}', ${rowIndex})">`
            : `<span style="display:inline-block;min-width:55px;padding:3px 8px;border-radius:6px;font-weight:800;font-size:13.5px;text-align:center;color:#059669;background:#ecfdf5;border:1px solid #a7f3d0">${pkgsOnTruck > 0 ? `${pkgsOnTruck} ${AR() ? 'طرد' : 'pkgs'}` : `<span style="color:#94a3b8">—</span>`}</span>`;

          const actionCellHtml = isEditMode
            ? `<button type="button" class="delbtn" style="background:#fee2e2;border:none;border-radius:4px;color:#dc2626;cursor:pointer;padding:3px 8px;font-weight:700;font-size:11px" onclick="__FTL__.removeShipmentTruckAllocation('${esc(ship ? ship.ref : '')}', ${curShpIdx}, ${item.rx});__FTL__.openShipmentBreakdown('${esc(shpIdent)}', ${rowIndex})" title="${AR() ? 'إزالة هذه الشاحنة من الشحنة' : 'Remove truck from shipment'}">🗑️ ${AR() ? 'إزالة' : 'Remove'}</button>`
            : `<span style="color:#94a3b8;font-size:11px;font-weight:600">🔒 ${AR() ? 'للعرض فقط' : 'View only'}</span>`;

          return `<tr>
            <td style="font-weight:700;color:#64748b;text-align:center;width:38px">${idx + 1}</td>
            <td style="font-weight:700;color:#0b4f7a;white-space:nowrap">🚚 ${esc(plate)} · <small style="font-weight:600;color:#64748b">${esc(truckType)}</small></td>
            <td style="font-weight:600;white-space:nowrap">🏢 ${esc(trucker)}</td>
            <td style="font-weight:700;white-space:nowrap">👤 ${esc(driver)}</td>
            <td style="white-space:nowrap">${mob && mob !== '—' ? `<a href="tel:${esc(mob)}" class="driver-call-btn">📞 ${esc(mob)}</a>` : '<span style="color:#94a3b8">—</span>'}</td>
            <td style="font-weight:800;color:#059669;font-size:14px;white-space:nowrap">${pkgsCellHtml}</td>
            <td style="white-space:nowrap">
              <div class="mini-bar-wrap">
                <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${sharePct}%"></div></div>
                <span class="mini-bar-text">${sharePct}%</span>
              </div>
            </td>
            <td style="text-align:center;white-space:nowrap">${actionCellHtml}</td>
          </tr>`;
        }).join('');
      }
    } else {
      totalLoadedAcrossTrucks = shpRows.reduce((sum, r) => sum + (parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0), 0);
      carryingTrucksCount = shpRows.length;
      tblRows = shpRows.map((r, idx) => {
        const plate = r.cntr || `${AR() ? 'شاحنة' : 'Truck'} ${idx + 1}`;
        const truckType = r.truckType || '—';
        const trucker = r.trucker || '—';
        const driver = r.driver || '—';
        const mob = r.mob || '—';
        const pkgsOnTruck = parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0;
        const sharePct = totalShipmentPkgs > 0 ? Math.round((pkgsOnTruck / totalShipmentPkgs) * 100) : (shpRows.length === 1 ? 100 : 0);
        return `<tr>
          <td style="font-weight:700;color:#64748b;text-align:center;width:38px">${idx + 1}</td>
          <td style="font-weight:700;color:#0b4f7a;white-space:nowrap">🚚 ${esc(plate)} · <small style="font-weight:600;color:#64748b">${esc(truckType)}</small></td>
          <td style="font-weight:600;white-space:nowrap">🏢 ${esc(trucker)}</td>
          <td style="font-weight:700;white-space:nowrap">👤 ${esc(driver)}</td>
          <td style="white-space:nowrap">${mob && mob !== '—' ? `<a href="tel:${esc(mob)}" class="driver-call-btn">📞 ${esc(mob)}</a>` : '<span style="color:#94a3b8">—</span>'}</td>
          <td style="font-weight:800;color:#059669;font-size:14px;white-space:nowrap">${pkgsOnTruck} ${AR() ? 'طرد' : 'pkgs'}</td>
          <td style="white-space:nowrap">
            <div class="mini-bar-wrap">
              <div class="mini-bar-track"><div class="mini-bar-fill" style="width:${sharePct}%"></div></div>
              <span class="mini-bar-text">${sharePct}%</span>
            </div>
          </td>
        </tr>`;
      }).join('');
    }

    const pctDone = totalShipmentPkgs > 0 ? Math.min(100, Math.round((totalLoadedAcrossTrucks / totalShipmentPkgs) * 100)) : 0;
    const remainingPkgs = Math.max(0, totalShipmentPkgs - totalLoadedAcrossTrucks);

    const recon = ship ? operationPackageReconciliation(dir, ship.ref) : null;
    let reconNotice = '';
    if (recon && recon.totalShipmentPkgs > 0) {
      reconNotice = `<div class="manifest-recon-footer">
        <div class="manifest-recon-title">📦 ${AR() ? 'ميزان طرود العملية ككل:' : 'Full Operation Package Balance:'}</div>
        <div class="manifest-recon-items">
          <span class="manifest-recon-chip"><b>${recon.totalShipmentPkgs}</b> ${AR() ? 'طرد إجمالي الشحنات' : 'total shipment pkgs'}</span>
          <span class="manifest-recon-chip emerald"><b>${recon.totalLoadedPkgs}</b> ${AR() ? 'محمل على السيارات' : 'loaded on all trucks'}</span>
          <span class="manifest-recon-status-badge ${recon.diff === 0 ? 'balanced' : recon.diff < 0 ? 'overload' : 'remaining'}">
            <b>${recon.diff > 0 ? (AR() ? `متبقي ${recon.diff} طرد لم يُحمل بعد` : `${recon.diff} pkgs remaining`) : recon.diff < 0 ? (AR() ? `تحذير: زائد +${Math.abs(recon.diff)} طرد` : `+${Math.abs(recon.diff)} pkgs overload`) : (AR() ? '✓ تم توزيع كل الطرود بالكامل' : '✓ Fully balanced')}</b>
          </span>
        </div>
      </div>`;
    }

    let truckAdderHtml = '';
    if (ship && Array.isArray(ship.shpSpans)) {
      if (isEditMode) {
        const distinctTrucks = [];
        const seenT = new Set();
        ship.rows.forEach((rx, k) => {
          const r = rows[rx];
          const tNo = ship.trkOf?.[k] || (k + 1);
          if (seenT.has(tNo)) return;
          seenT.add(tNo);
          const pl = (r?.cntr && r.cntr.trim()) ? r.cntr.trim() : (AR() ? `شاحنة ${tNo}` : `Truck ${tNo}`);
          const dr = (r?.driver && r.driver.trim()) ? ` · ${r.driver.trim()}` : '';
          distinctTrucks.push({ rx, tNo, label: pl + dr });
        });

        const trkOptions = distinctTrucks.map(t => `<option value="${t.rx}">${esc(t.label)}</option>`).join('');

        truckAdderHtml = `
          <div class="coload-adder-bar" style="margin-top:14px;padding:12px;background:#f0fdf4;border:1px dashed #86efac;border-radius:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
            <span style="font-weight:800;color:#166534;font-size:13px">➕ ${AR() ? 'تحميل طرود من هذه الشحنة على سيارة:' : 'Allocate packages to a truck:'}</span>
            <select id="shipAllocTruckSelect" style="padding:6px 10px;border-radius:6px;border:1px solid #86efac;font-weight:700;font-size:12px">
              ${trkOptions}
            </select>
            <input type="number" id="shipAllocPkgsInput" placeholder="${AR() ? 'عدد الطرود' : 'Pkgs count'}" style="width:110px;padding:6px 10px;border-radius:6px;border:1px solid #86efac;font-weight:700;font-size:12px">
            <button type="button" class="ebtn" style="background:#16a34a;color:#fff;font-weight:800;border:none;border-radius:6px;padding:6px 14px;cursor:pointer" onclick="const tEl=document.getElementById('shipAllocTruckSelect');const pEl=document.getElementById('shipAllocPkgsInput');if(tEl&&pEl&&pEl.value){__FTL__.addShipmentTruckAllocation('${esc(ship ? ship.ref : '')}', ${curShpIdx}, parseInt(tEl.value, 10), parseInt(pEl.value, 10));__FTL__.openShipmentBreakdown('${esc(shpIdent)}', ${rowIndex});}">➕ ${AR() ? 'إضافة للشاحنة' : 'Add to Truck'}</button>
          </div>
        `;
      } else {
        truckAdderHtml = `
          <div class="coload-adder-bar view-only" style="margin-top:14px;padding:10px 16px;background:rgba(240, 253, 244, 0.7);border:1px dashed #86efac;border-radius:8px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
            <span style="font-weight:650;color:#166534;font-size:12.5px">🔒 ${AR() ? 'كشف الشحنة في وضع القراءة فقط. اضغط على زر "تعديل التوزيع" بالأعلى لإضافة أو تعديل الحمولات على الشاحنات.' : 'Shipment distribution is in view-only mode. Click "Edit Allocation" above to modify truck allocations.'}</span>
            <button type="button" onclick="__FTL__.startEditFromManifest('${esc(ref)}', '${esc(shpIdent)}', ${rowIndex}, 'shipment')" style="background:#16a34a;color:#fff;border:none;border-radius:6px;padding:5px 14px;font-weight:750;font-size:12px;cursor:pointer;display:inline-flex;align-items:center;gap:5px">✏️ ${AR() ? 'تعديل التوزيع الآن' : 'Edit Allocation Now'}</button>
          </div>
        `;
      }
    }

    $('shipmentBreakdownBody').innerHTML = `
      <div class="manifest-hero-grid">
        <div class="manifest-card shipment-hero-card">
          <div class="card-top-label">🏭 ${AR() ? 'العميل والبوليصة' : 'Client & HAWB'}</div>
          <div class="card-main-val">🏭 ${esc(client)}</div>
          <div class="card-sub-val">MAWB: <b>${esc(mawb)}</b> · شحنة: <b>${esc(shpIdent)}</b></div>
        </div>
        <div class="manifest-card shipment-hero-card">
          <div class="card-top-label">✈️ ${AR() ? 'المطار والمحطة' : 'Airport & Terminal'}</div>
          <div class="card-main-val">✈️ ${esc(aod)} · <small style="font-weight:600;color:#64748b">${esc(term)}</small></div>
          <div class="card-sub-val">📍 ${AR() ? 'الوجهة:' : 'Dest:'} <b>${esc(dest)}</b></div>
        </div>
        <div class="manifest-card shipment-hero-card">
          <div class="card-top-label">📊 ${AR() ? 'إجمالي الشحنة والتوزيع' : 'Total Shipment & Progress'}</div>
          <div class="hero-huge-metric emerald">${totalShipmentPkgs} <small>${AR() ? 'طرد' : 'pkgs'}</small></div>
          <div class="shipment-progress-bar"><div class="shipment-progress-fill" style="width:${pctDone}%"></div></div>
          <div class="shipment-progress-label">
            <span>${AR() ? `تم توزيع: ${totalLoadedAcrossTrucks} (${pctDone}%)` : `Loaded: ${totalLoadedAcrossTrucks} (${pctDone}%)`}</span>
            <span>${remainingPkgs > 0 ? (AR() ? `متبقي: ${remainingPkgs}` : `Remaining: ${remainingPkgs}`) : (AR() ? '✓ اكتمل' : '✓ Done')}</span>
          </div>
        </div>
      </div>
      <div style="margin-bottom:10px;font-weight:800;font-size:14px;color:#1e293b;display:flex;align-items:center;justify-content:space-between">
        <span>🚚 ${AR() ? `توزيع الشحنة على سيارات النقل والسائقين (${carryingTrucksCount})` : `Trucks Carrying this Shipment (${carryingTrucksCount})`}</span>
      </div>
      <div class="manifest-table-wrap">
        <table class="manifest-table shipment-theme" dir="${AR() ? 'rtl' : 'ltr'}">
          <thead>
            <tr>
              <th style="width:40px;text-align:center">#</th>
              <th>${AR() ? 'رقم اللوحة والنوع' : 'Plate No & Type'}</th>
              <th>${AR() ? 'شركة النقل' : 'Transporter'}</th>
              <th>${AR() ? 'السائق' : 'Driver'}</th>
              <th>${AR() ? 'رقم الموبايل' : 'Mobile'}</th>
              <th>${AR() ? 'الطرود مع السائق' : 'Packages on Truck'}</th>
              <th>${AR() ? 'نسبة المساهمة' : 'Share'}</th>
              ${curShpIdx >= 0 ? `<th style="width:70px;text-align:center">${AR() ? 'إجراء' : 'Action'}</th>` : ''}
            </tr>
          </thead>
          <tbody>${tblRows}</tbody>
        </table>
      </div>
      ${reconNotice}
      ${truckAdderHtml}`;
    $('shipmentBreakdownModal').classList.add('open');
  }
  function activeOpCount(d) {
    if (isServerPagedEntry()) {
      if (LAST_COUNTS) {
        return d === 'Import' ? (LAST_COUNTS.activeImportCount ?? 0) : (LAST_COUNTS.activeExportCount ?? 0);
      }
      return ENTRY_PAGING[d]?.totalCount ?? 0;
    }
    const hasLoaded = LOADED_DIRS.has(d) && Object.keys(SHIPS[d] || {}).length > 0;
    if (hasLoaded) {
      return Object.values(SHIPS[d]).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive').length;
    }
    if (LAST_COUNTS) {
      return d === 'Import' ? (LAST_COUNTS.activeImportCount ?? 0) : (LAST_COUNTS.activeExportCount ?? 0);
    }
    return 0;
  }
  function renderEntry() {
    const dir = EDIR, cols = COLS[dir], E = t('entry');
    const gridEl = root.querySelector('.egrid');
    const prevScrollLeft = gridEl ? gridEl.scrollLeft : null;
    const prevScrollTop = gridEl ? gridEl.scrollTop : null;
    const searchFocused = !!document.activeElement?.closest('.tripsearch');
    if (TRIP_SEARCH_DIR !== dir + LANG) renderTripSearch();
    renderOpForm(); renderTripSort(); renderSysBar();
    root.querySelectorAll('.etab[data-dir]').forEach(b => {
      const d = b.dataset.dir;
      if (!d || !ENTRY[d]) return;
      b.classList.toggle('on', d === dir);
      const lbl = b.querySelector('.lbl');
      if (lbl) lbl.textContent = dirLabel(d);
      const cnt = b.querySelector('.cnt');
      if (cnt) cnt.textContent = fmtN(activeOpCount(d));
    });
    const dCnt = root.querySelector('#deliveredOpenCnt') || $('deliveredOpenCnt');
    if (dCnt && LAST_COUNTS?.deliveredCount != null) dCnt.textContent = fmtN(LAST_COUNTS.deliveredCount);
    const iCnt = root.querySelector('#inactiveOpenCnt') || $('inactiveOpenCnt');
    if (iCnt && LAST_COUNTS?.inactiveCount != null) iCnt.textContent = fmtN(LAST_COUNTS.inactiveCount);
    $('eHead').innerHTML = `<tr>${cols.map(c => {
      const hTxt = AR() ? (c.ar || c.h) : c.h;
      return `<th style="--gc:${GROUPS[c.g].c};--w:${c.w}px" title="${esc(hTxt)}"><span title="${esc(hTxt)}">${esc(hTxt)}<small class="dtype">${tripTypeLabel(tripType(c))}</small></span>${isLocked(dir, c) ? '<i class="lk" title="' + E.lockedTip + '">🔒</i>' : ''}</th>`;
    }).join('')}<th class="actions-head" style="--gc:#8fa3b4;--w:115px" title="${AR() ? 'الإجراءات' : 'Actions'}"><span title="${AR() ? 'الإجراءات' : 'Actions'}">${AR() ? 'الإجراءات' : 'Actions'}</span></th><th class="meta" style="--gc:#8fa3b4;--w:170px" title="${AR() ? 'العملية والمدخل' : 'Operation / entered'}"><span title="${AR() ? 'العملية والمدخل' : 'Operation / entered'}">${AR() ? 'العملية والمدخل' : 'Operation / entered'}</span></th><th class="select-head" style="--w:68px" title="${AR() ? 'تحديد' : 'Select'}"><span title="${AR() ? 'تحديد' : 'Select'}">${AR() ? 'تحديد' : 'Select'}</span></th></tr>`;
    const rows = ENTRY[dir];
    const serverPaged = isServerPagedEntry();
    const pg = ENTRY_PAGING[dir];
    const visible = serverPaged
      ? Object.values(SHIPS[dir]).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive')
      : sortedTripShips(dir).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive');
    const pages = serverPaged ? null : shipmentPages(visible);
    const totalPages = serverPaged ? Math.max(1, pg.totalPages || 1) : Math.max(1, pages.length);
    TRIP_PAGE[dir] = Math.max(0, Math.min(TRIP_PAGE[dir], totalPages - 1));
    const shown = serverPaged ? visible : (pages[TRIP_PAGE[dir]] || []);
    const totalCount = serverPaged ? (pg.totalCount || 0) : visible.length;
    $('tripPage').hidden = !totalCount;
    $('tripPagePrev').setAttribute('aria-label', AR() ? 'الشحنات السابقة' : 'Previous shipments');
    $('tripPageNext').setAttribute('aria-label', AR() ? 'الشحنات التالية' : 'Next shipments');
    if ($('tripPageSizeLbl')) {
      $('tripPageSizeLbl').textContent = AR() ? 'لكل صفحة:' : 'Per page:';
    }
    const curPage = TRIP_PAGE[dir] + 1;
    const before = serverPaged
      ? (TRIP_PAGE[dir] * (TRIPS_PER_PAGE || 20))
      : pages.slice(0, TRIP_PAGE[dir]).reduce((n, p) => n + p.length, 0);
    $('tripPageInfo').textContent = AR()
      ? `شحنات ${totalCount ? before + 1 : 0}–${before + shown.length} من ${totalCount} · صفحة ${curPage}/${totalPages}`
      : `Shipments ${totalCount ? before + 1 : 0}–${before + shown.length} of ${totalCount} · Page ${curPage}/${totalPages}`;
    $('tripPagePrev').disabled = TRIP_PAGE[dir] <= 0;
    $('tripPageNext').disabled = TRIP_PAGE[dir] >= totalPages - 1;

    const numsEl = $('tripPageNums');
    if (numsEl) {
      numsEl.innerHTML = '';
      if (totalPages > 1) {
        const start = Math.max(0, Math.min(TRIP_PAGE[dir] - 2, totalPages - 5));
        const end = Math.min(totalPages, start + 5);
        for (let p = start; p < end; p++) {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = p + 1;
          if (p === TRIP_PAGE[dir]) btn.classList.add('active');
          btn.addEventListener('click', () => {
            if (EDITING && !commitEdit()) return;
            if (serverPaged && hasUnsavedActiveEdits()) return;
            TRIP_PAGE[dir] = p;
            CURSOR = { r: -1, k: null };
            if (serverPaged) loadEntryPage(dir); else renderEntry();
            root.querySelector('.egrid')?.scrollTo({ top: 0 });
          });
          numsEl.appendChild(btn);
        }
      }
    }
    if (!shown.length) {
      $('eBody').innerHTML = '';
      $('eEmpty').style.display = '';
      if (serverPaged && pg.loading) {
        $('eEmpty').textContent = AR() ? 'جاري تحميل الشحنات...' : 'Loading shipments...';
      } else {
        const hasSearchOrFilter = ENTRY_QUICK_SEARCH.trim() || TRIP_SEARCH[dir].some(r => r.v);
        $('eEmpty').textContent = (rows.length || hasSearchOrFilter || activeOpCount(dir) > 0)
          ? (AR() ? 'لا توجد شحنات مفتوحة مطابقة؛ راجع الشحنات المُسلّمة وغير النشطة' : 'No matching open shipments; check Delivered or Inactive shipments')
          : E.emptyTable;
      }
    } else {
      $('eEmpty').style.display = 'none';
    }
    const html = [];
    shown.flatMap(sh => sh.rows).forEach(i => {
      const r = rows[i];
      const ship = rowShip(dir, i); const first = ship ? ship.rows[0] === i : true; const last = ship ? ship.rows[ship.rows.length - 1] === i : true;
      const span = ship ? ship.rows.length : 1;
      const ri = ship ? ship.rows.indexOf(i) : 0;
      const isShipEditing = !!(ship?.ref && ACTIVE_EDIT_SHIPS.has(ship.ref));
      const isShipDelivered = (ship?.status || 'Open') === 'Delivered';
      if (ship && (!validSpans(ship.shpSpans, ship.rows.length) || !validSpans(ship.trkSpans, ship.rows.length))) layoutShip(dir, ship, { shpSpans: ship.shpSpans, trkSpans: ship.trkSpans });
      const truckStart = !!ship && ri > 0 && ship.trkSpans.some(([a]) => a === ri);
      const rTrkNo = ship?.trkOf?.[ri];
      const rCleanPlate = (r.cntr || '').trim().toUpperCase();
      const rTrkKey = rCleanPlate || (rTrkNo !== undefined ? ('trk-' + rTrkNo) : '');
      let tr = `<tr class="${ship && span > 1 ? (first ? 'ship-start' : last ? 'ship-end' : 'ship-mid') : ''}${ship && TRIP_SELECTED[dir].has(ship.ref) ? ' trip-selected' : ''}" data-r="${i}" data-truck-plate="${esc(rTrkKey)}">`;

      cols.forEach(c => {
        const sp = ship ? spanOf(ship, c, ri) : { start: 0, len: 1 };
        if (sp.start !== ri) return;                             /* covered by the rowspan of the group's first row */
        const merged = sp.len > 1;
        const v = String(r[c.k] ?? '');
        const locked = isLocked(dir, c, i);
        const isBosla = isBoslaClr(cellVal(r, 'clrType'));
        const dimmed = (c.k === 'cert' && isBosla) || (c.k === 'customs' && !isBosla);   /* CERT → Certificate Number · BOSLA → Customs Area */
        const cur = CURSOR.r === i && CURSOR.k === c.k;
        const editing = EDITING && EDITING.r === i && EDITING.k === c.k;
        let inner;
        let cellTip = '';
        const rawDisp = displayValue(c, v);
        if (rawDisp !== undefined && rawDisp !== null && String(rawDisp).trim()) {
          cellTip = String(rawDisp).trim();
        }
        if (c.t === 'upd') {
          const u = (ROWMETA[dir][i]?.updates) || []; const lastU = u[u.length - 1];
          const hasUpdates = u.length > 0 && !!lastU;
          cellTip = hasUpdates ? `${lastU.text} (${lastU.user} · ${lastU.at})` : (AR() ? 'لا توجد تحديثات بعد' : 'No updates yet');
          const tipHistory = u.slice().reverse().map((x, ix) => `${u.length - ix}. ${esc(x.text)} — ${esc(x.user)} (${esc(x.at)})`).join('&#10;');
          inner = `<button type="button" class="updbtn" onclick="__FTL__.openUpdates(${i})" title="${esc(cellTip)}" data-tip="${tipHistory}">
                    ${hasUpdates ? `
                      <div class="upd-body">
                        <span class="updtxt">${esc(lastU.text)}</span>
                        <span class="updby">${esc(lastU.user)} · ${esc(lastU.at)}</span>
                      </div>
                      <span class="updn">${u.length}</span>
                    ` : `<span class="updtxt muted">${AR() ? 'لا توجد تحديثات بعد' : 'No updates yet'}</span>`}
                  </button>`;
        } else if (editing) {
          inner = editorHTML(c, v, i);
        } else if (c.k === 'cntr') {
          let extraBadges = '';
          const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
          const isMergedTruck = isSGreater
            ? (Array.isArray(r._allocations) && r._allocations.length > 1)
            : (merged && sp.len > 1);
          const cleanPlate = v.trim().toUpperCase();
          const trkNo = ship?.trkOf?.[ri];
          const isUnassignedTruck = !cleanPlate && (!trkNo || trkNo === 0);
          const allTruckRows = ship ? ship.rows.filter(ix => {
            const ixPlate = (rows[ix]?.cntr || '').trim().toUpperCase();
            if (cleanPlate && ixPlate) return ixPlate === cleanPlate;
            const ix_ri = ship.rows.indexOf(ix);
            return trkNo !== undefined && trkNo > 0 && ix_ri >= 0 && ship.trkOf?.[ix_ri] === trkNo;
          }) : [i];
          const totalShares = isUnassignedTruck ? 0 : allTruckRows.length;
          const shareIdx = isUnassignedTruck ? 0 : allTruckRows.indexOf(i) + 1;

          if (isMergedTruck) {
            const trkShipCount = isSGreater ? (r._allocations?.length || sp.len) : sp.len;
            extraBadges += `<span class="shared-truck-tag" style="background:#f1f5f9;color:#1e293b;border:1px solid #cbd5e1;font-size:9.5px;font-weight:750;padding:1px 5px;border-radius:5px;display:inline-flex;align-items:center;gap:3px" title="${AR() ? `عربة موحدة مدموجة بين ${trkShipCount} شحنات` : `Unified truck carrying ${trkShipCount} shipments`}"><span class="shared-truck-dot" style="background:#3b82f6;width:5px;height:5px;border-radius:50%;display:inline-block"></span>🚚 ${AR() ? `عربة موحدة مدموجة` : `Merged Truck`}</span>`;
          } else if (totalShares > 1 && !isSGreater) {
            extraBadges += `<span class="shared-truck-tag multi" style="background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;font-size:9.5px;font-weight:750;padding:1px 5px;border-radius:5px;display:inline-flex;align-items:center;gap:3px" title="${AR() ? `هذه الشاحنة مشتركة في ${totalShares} شحنات [حصة ${shareIdx} من ${totalShares}]` : `Shared truck (${shareIdx} of ${totalShares})`}"><span class="shared-truck-dot" style="background:#2563eb;width:5px;height:5px;border-radius:50%;display:inline-block"></span>${AR() ? `مشتركة [${shareIdx}/${totalShares}]` : `Shared [${shareIdx}/${totalShares}]`}</span>`;
          }

          const trkLoadedTotal = isUnassignedTruck ? 0 : ((Array.isArray(r._allocations) && r._allocations.length)
            ? r._allocations.reduce((sum, a) => sum + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0)
            : (parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0));
          const trkLoadBadge = trkLoadedTotal > 0
            ? `<span class="trk-total-pkgs-pill" style="font-size:9.5px;font-weight:750;color:#0369a1;background:#f0f9ff;border:1px solid #7dd3fc;border-radius:5px;padding:1px 5px;display:inline-flex;align-items:center;gap:3px" title="${AR() ? `إجمالي ما تحمله الشاحنة: ${trkLoadedTotal} طرد` : `Truck total cargo: ${trkLoadedTotal} pkgs`}">📦 ${AR() ? 'الحمولة:' : 'Load:'} <b>${trkLoadedTotal}</b></span>`
            : '';

          const fallbackTrk = (trkNo && trkNo > 0) ? (AR() ? `شاحنة ${trkNo}` : `Truck ${trkNo}`) : '';
          const trkText = esc(displayValue(c, v)) || (fallbackTrk ? `<span style="font-weight:750;color:#0b4f7a">${fallbackTrk}</span>` : (isUnassignedTruck ? `<span style="color:#94a3b8;font-size:11px;font-style:italic">⏳ ${AR() ? 'في انتظار التعيين' : 'Unassigned'}</span>` : '<span class="ph">' + (locked ? '' : '&nbsp;') + '</span>'));
          const manifestTitle = isUnassignedTruck ? (AR() ? 'في انتظار تعيين شاحنة لهذه الشحنة' : 'Unassigned') : (AR() ? 'عرض بيان حمولة العربية (Truck Manifest)' : 'View Truck Manifest');
          const manifestBtn = isUnassignedTruck
            ? `<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#f1f5f9;border:1px solid #e2e8f0;color:#94a3b8;font-size:12px;opacity:0.6" title="${manifestTitle}">🚚</span>`
            : `<button type="button" class="truck-manifest-icon-btn" onclick="event.stopPropagation();__FTL__.openTruckManifest('${esc(v || fallbackTrk)}',${i})" title="${manifestTitle}" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#e0f2fe;border:1px solid #7dd3fc;color:#0369a1;cursor:pointer;font-size:12px;line-height:1;transition:all 0.15s;padding:0;box-shadow:0 1px 2px rgba(0,0,0,0.04)" onmouseover="this.style.background='#bae6fd';this.style.borderColor='#38bdf8'" onmouseout="this.style.background='#e0f2fe';this.style.borderColor='#7dd3fc'">🚚</button>`;

          const editPlateTitle = locked ? (AR() ? 'انقر على "تعديل" لتعديل بيانات العملية' : 'Click Edit to modify') : (AR() ? 'انقر لتعديل رقم لوحة الشاحنة' : 'Click to edit truck plate');
          const platePill = `<span class="truck-plate-pill" title="${editPlateTitle}" style="display:inline-flex;align-items:center;padding:3px 9px;font-weight:750;border-radius:7px;font-size:12px;background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;cursor:pointer;white-space:nowrap;min-width:32px;justify-content:center"><span>${trkText}</span></span>`;

          const badgesRow = (extraBadges || trkLoadBadge) ? `<div style="display:flex;align-items:center;justify-content:center;gap:3px;flex-wrap:wrap;margin-top:2px">${extraBadges}${trkLoadBadge}</div>` : '';

          inner = `<span class="cv" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;padding:4px"><div style="display:inline-flex;align-items:center;justify-content:center;gap:5px">${manifestBtn}${platePill}</div>${badgesRow}</span>`;
        } else if (c.k === 'loadedPackages') {
          const trkLoadedTotal = (Array.isArray(r._allocations) && r._allocations.length)
            ? r._allocations.reduce((sum, a) => sum + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0)
            : (parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0);
          const disp = trkLoadedTotal > 0 ? trkLoadedTotal : (v || '');
          inner = `<span class="cv">${esc(displayValue(c, disp)) || '<span class="ph">' + (locked ? '' : '&nbsp;') + '</span>'}</span>`;
        } else if (c.k === 'packages') {
          const totalPkgs = parseInt(normalizeDigits(r.packages || '0'), 10) || 0;
          const sIdx = ship?.shpSpans ? ship.shpSpans.findIndex(([a, l]) => ri >= a && ri < a + l) : -1;
          const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
          const isMultiShip = ship?.shpSpans && ship.shpSpans.length > 1;
          const hasAnyAlloc = ship && ship.rows && ship.rows.some(rx => (Array.isArray(rows[rx]?._allocations) && rows[rx]._allocations.length > 0) || (rows[rx]?.assignedShp != null && rows[rx]?.assignedShp !== ''));
          let shpLoadedTotal = 0;
          if ((isSGreater || hasAnyAlloc || isMultiShip) && sIdx >= 0) {
            const seenTrucks = new Set();
            ship.rows.forEach(rx => {
              const row = rows[rx];
              const trkId = row?._coLoadId || ship.trkOf?.[ship.rows.indexOf(rx)] || rx;
              if (seenTrucks.has(trkId)) return;
              seenTrucks.add(trkId);
              if (row && Array.isArray(row._allocations) && row._allocations.length) {
                row._allocations.forEach(a => {
                  if (parseInt(a.shpIdx, 10) === sIdx) {
                    shpLoadedTotal += (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0);
                  }
                });
              } else if (row && row.assignedShp !== undefined && row.assignedShp !== null && row.assignedShp !== '') {
                if (parseInt(row.assignedShp, 10) === sIdx) {
                  shpLoadedTotal += (parseInt(normalizeDigits(row.loadedPackages || '0'), 10) || 0);
                }
              } else if (!isMultiShip) {
                const trkRi = ship.rows.indexOf(rx);
                if (ship.shpSpans && sIdx >= 0) {
                  const spSpan = ship.shpSpans[sIdx];
                  if (spSpan && trkRi >= spSpan[0] && trkRi < spSpan[0] + spSpan[1]) {
                    shpLoadedTotal += (parseInt(normalizeDigits(row?.loadedPackages || '0'), 10) || 0);
                  }
                }
              }
            });
          } else {
            const shpRows = ship ? ship.rows.slice(sp.start, sp.start + sp.len) : [i];
            shpLoadedTotal = shpRows.reduce((acc, rx) => acc + (parseInt(normalizeDigits(rows[rx]?.loadedPackages || '0'), 10) || 0), 0);
          }
          let shpBalBadge = '';
          if (totalPkgs > 0) {
            if (shpLoadedTotal === totalPkgs) {
              shpBalBadge = `<div style="margin-top:2px;font-size:9.5px;font-weight:800;color:#059669" title="${AR() ? 'اكتمل توزيع طرود الشحنة بالكامل' : 'Fully allocated'}">✓ ${AR() ? 'مكتملة بالكامل' : 'Completed'}</div>`;
            } else if (shpLoadedTotal > totalPkgs) {
              shpBalBadge = `<div style="margin-top:2px;font-size:9.5px;font-weight:800;color:#dc2626" title="${AR() ? `فائض ${shpLoadedTotal - totalPkgs} طرد` : 'Overload'}">🚨 +${shpLoadedTotal - totalPkgs}</div>`;
            } else if (shpLoadedTotal > 0 && sp.len > 1) {
              shpBalBadge = `<div style="margin-top:2px;font-size:9.5px;font-weight:800;color:#d97706" title="${AR() ? `متبقي ${totalPkgs - shpLoadedTotal} طرد لم يُحمل` : 'Remaining'}">⚡ ${shpLoadedTotal}/${totalPkgs}</div>`;
            }
          }
          inner = `<span class="cv"><span class="val">${esc(displayValue(c, v)) || '<span class="ph">' + (locked ? '' : '&nbsp;') + '</span>'}</span>${shpBalBadge}</span>`;
        } else if (c.k === 'shipNo') {
          const valText = esc(displayValue(c, v));
          const disp = valText ? `<span>${valText}</span>` : '<span class="ph">' + (locked ? '' : '&nbsp;') + '</span>';
          const editShipTitle = locked ? (AR() ? 'انقر على "تعديل" لتعديل بيانات العملية' : 'Click Edit to modify') : (AR() ? 'انقر لتعديل رقم الشحنة' : 'Click to edit shipment number');
          const breakdownBtn = `<button type="button" class="shipment-breakdown-icon-btn" onclick="event.stopPropagation();__FTL__.openShipmentBreakdown('${esc(v)}',${i})" title="${AR() ? 'عرض وتوزيع طرود الشحنة (Shipment Breakdown)' : 'View Shipment Breakdown'}" style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#f1f5f9;border:1px solid #cbd5e1;cursor:pointer;font-size:12px;line-height:1;transition:all 0.15s;padding:0;box-shadow:0 1px 2px rgba(0,0,0,0.04)" onmouseover="this.style.background='#e2e8f0';this.style.borderColor='#94a3b8'" onmouseout="this.style.background='#f1f5f9';this.style.borderColor='#cbd5e1'">📦</button>`;
          const shipPill = `<span class="ship-number-pill" title="${editShipTitle}" style="display:inline-flex;align-items:center;padding:3px 9px;border-radius:7px;font-weight:750;font-size:12px;background:#f8fafc;border:1px solid #e2e8f0;color:#1e293b;cursor:pointer;white-space:nowrap;min-width:32px;justify-content:center">${disp}</span>`;
          inner = `<span class="cv" style="display:flex;align-items:center;justify-content:center;width:100%"><div style="display:inline-flex;align-items:center;justify-content:center;gap:5px">${breakdownBtn}${shipPill}</div></span>`;
        } else if (c.k === 'loadStatus') {
          const isSGreater = ship && Array.isArray(ship.shpSpans) && ship.shpSpans.length > truckCount(ship);
          if (isSGreater) {
            const rawAllocs = Array.isArray(r._allocations) && r._allocations.length ? r._allocations : null;
            const activeAllocs = rawAllocs ? rawAllocs.filter(a => (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0) > 0) : [];
            let allocsToUse = null;
            if (activeAllocs.length > 0) {
              allocsToUse = activeAllocs;
            } else if (rawAllocs && rawAllocs.length > 0) {
              allocsToUse = rawAllocs;
            } else if (r.assignedShp !== undefined && r.assignedShp !== null && r.assignedShp !== '') {
              const p = parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0;
              allocsToUse = [{ shpIdx: parseInt(r.assignedShp, 10), pkgs: p }];
            } else {
              const curSpanIdx = (ship && Array.isArray(ship.shpSpans))
                ? ship.shpSpans.findIndex(([a, l]) => ri >= a && ri < a + l)
                : -1;
              const p = parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0;
              allocsToUse = [{ shpIdx: curSpanIdx >= 0 ? curSpanIdx : 0, pkgs: p }];
            }

            const getShpTotal = (sIdx) => {
              if (ship && Array.isArray(ship.shpSpans) && sIdx >= 0 && sIdx < ship.shpSpans.length) {
                const sStart = ship.shpSpans[sIdx][0];
                const sRow = rows[ship.rows[sStart]];
                return parseInt(normalizeDigits(sRow?.packages || '0'), 10) || 0;
              }
              return parseInt(normalizeDigits(r.packages || '0'), 10) || 0;
            };

            const trkLoadedTotal = (Array.isArray(r._allocations) && r._allocations.length)
              ? r._allocations.reduce((sum, a) => sum + (parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0), 0)
              : (parseInt(normalizeDigits(r.loadedPackages || '0'), 10) || 0);

            if (trkLoadedTotal <= 0) {
              inner = `<span class="cv"><span class="ph" style="color:#94a3b8;font-size:12px">—</span></span>`;
            } else if (allocsToUse.length === 1) {
              const alloc = allocsToUse[0];
              const sIdx = alloc.shpIdx !== undefined && alloc.shpIdx !== null ? parseInt(alloc.shpIdx, 10) : 0;
              const loaded = parseInt(normalizeDigits(String(alloc.pkgs || trkLoadedTotal)), 10) || trkLoadedTotal;
              const totalPkgs = getShpTotal(sIdx);

              if (totalPkgs > 0 && loaded > totalPkgs) {
                const extra = loaded - totalPkgs;
                inner = `<span class="cv"><span class="manifest-tag-overload" style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-weight:800;border-radius:5px;padding:2px 8px;font-size:11px" title="${AR() ? `حمولة زائدة عن إجمالي بوليصة الشحنة (${loaded} من أصل ${totalPkgs} · زيادة ${extra} طرد)` : `Overload: +${extra} pkgs`}">🚨 ${AR() ? `فائض (+${extra})` : `Over (+${extra})`}</span></span>`;
              } else if (totalPkgs > 0 && loaded === totalPkgs) {
                inner = `<span class="cv"><span class="manifest-tag-full" title="${AR() ? 'حمولة كاملة للشحنة (100%)' : 'Full Load (100%)'}">✓ ${AR() ? 'كلي (Full)' : 'Full'}</span></span>`;
              } else if (totalPkgs > 0 && loaded < totalPkgs) {
                const pct = Math.round((loaded / totalPkgs) * 100);
                inner = `<span class="cv"><span class="manifest-tag-partial" title="${AR() ? `جزء من الشحنة (${loaded} من أصل ${totalPkgs} طرد)` : `Partial (${loaded} of ${totalPkgs} pkgs)`}">⚡ ${AR() ? `جزئي (${pct}%)` : `Partial (${pct}%)`}</span></span>`;
              } else {
                inner = `<span class="cv"><span class="manifest-tag-full">${loaded} ${AR() ? 'طرد' : 'pkgs'}</span></span>`;
              }
            } else {
              const pctParts = [];
              const tipParts = [];
              const badges = [];

              allocsToUse.forEach(alloc => {
                const sIdx = alloc.shpIdx !== undefined && alloc.shpIdx !== null ? parseInt(alloc.shpIdx, 10) : 0;
                const p = parseInt(normalizeDigits(String(alloc.pkgs || '0')), 10) || 0;
                const tot = getShpTotal(sIdx);
                const sLabel = AR() ? `شحنة ${sIdx + 1}` : `Shipment ${sIdx + 1}`;

                if (tot > 0) {
                  if (p > tot) {
                    const extra = p - tot;
                    pctParts.push(`+${extra}`);
                    tipParts.push(`${sLabel}: ${p}/${tot} (${AR() ? `فائض +${extra}` : `+${extra}`})`);
                    badges.push(`<span class="manifest-tag-overload" style="background:#fef2f2;border:1px solid #fca5a5;color:#b91c1c;font-weight:800;border-radius:5px;padding:2px 7px;font-size:10.5px" title="${esc(sLabel)}: ${p}/${tot}">🚨 ${AR() ? 'فائض' : 'Over'}</span>`);
                  } else if (p === tot) {
                    pctParts.push('100%');
                    tipParts.push(`${sLabel}: ${p}/${tot} (100%)`);
                    badges.push(`<span class="manifest-tag-full" style="padding:2px 7px;font-size:10.5px" title="${esc(sLabel)}: ${p}/${tot} (100%)">✓ ${AR() ? 'كلي' : 'Full'}</span>`);
                  } else {
                    const pct = Math.round((p / tot) * 100);
                    pctParts.push(`${pct}%`);
                    tipParts.push(`${sLabel}: ${p}/${tot} (${pct}%)`);
                    badges.push(`<span class="manifest-tag-partial" style="padding:2px 7px;font-size:10.5px" title="${esc(sLabel)}: ${p}/${tot} (${pct}%)">⚡ ${AR() ? `جزئي (${pct}%)` : `Partial (${pct}%)`}</span>`);
                  }
                } else if (p > 0) {
                  pctParts.push(`${p}p`);
                  tipParts.push(`${sLabel}: ${p} ${AR() ? 'طرد' : 'pkgs'}`);
                  badges.push(`<span class="manifest-tag-full" style="padding:2px 7px;font-size:10.5px" title="${esc(sLabel)}: ${p} pkgs">${p} ${AR() ? 'طرد' : 'p'}</span>`);
                }
              });

              const tipStr = tipParts.join(' · ');
              if (badges.length > 0) {
                inner = `<span class="cv"><div style="display:inline-flex;align-items:center;justify-content:center;gap:4px;flex-wrap:wrap" title="${esc(tipStr)}">${badges.join('')}</div></span>`;
              } else {
                inner = `<span class="cv"><span class="ph" style="color:#94a3b8;font-size:12px">—</span></span>`;
              }
            }
          } else {
            inner = `<span class="cv" ${cellTip ? `title="${esc(cellTip)}"` : ''}>${esc(displayValue(c, v)) || '<span class="ph">' + (locked ? '' : '&nbsp;') + '</span>'}</span>`;
          }
        } else {
          inner = `<span class="cv" ${cellTip ? `title="${esc(cellTip)}"` : ''}>${esc(displayValue(c, v)) || '<span class="ph">' + (locked ? '' : '&nbsp;') + '</span>'}</span>`;
        }
        if (c.k === 'status' && first && ship) {
          const isDelivered = (ship.status || 'Open') === 'Delivered';
          inner = `
            <div class="fcl-status-container" onclick="event.stopPropagation()">
              <button type="button" class="fcl-status-pill ${isDelivered ? 'delivered' : 'open'}" onclick="__FTL__.toggleStatusMenu('${esc(ship.ref)}', this)" title="${AR() ? 'تغيير حالة الشحنة' : 'Change status'}">
                <span class="fcl-status-dot ${isDelivered ? 'delivered' : 'open'}"></span>
                <span class="fcl-status-text">${isDelivered ? 'Delivered' : 'Open'}</span>
                <svg class="fcl-status-arrow" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <button type="button" class="fcl-status-history-btn" onclick="__FTL__.openStatusHistory('${esc(ship.ref)}', ${ship.rows[0]})" title="${AR() ? 'سجل وتاريخ تغيرات الحالة (Status History Timeline)' : 'Status History Timeline'}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>
              </button>
            </div>
          `;
        }
        const mergeBtn = (ship && span > 1 && canToggleMerge(dir, c))
          ? `<button class="mg" title="${merged ? E.unmergeTip : E.mergeTip}" onclick="event.stopPropagation();__FTL__.toggleMerge('${ship.ref}','${c.k}')">${merged ? '⧉' : '⊞'}</button>` : '';
        const sepHandle = '';
        const isClickableActiveCell = Boolean(ship && !isShipEditing && !isShipDelivered && c.t !== 'upd' && c.k !== 'status');
        const cellTipAttr = cellTip ? `title="${esc(cellTip)}"` : '';
        tr += `<td ${merged ? `rowspan="${sp.len}"` : ''} class="c${cur ? ' cur' : ''}${locked ? ' locked' : ''}${dimmed ? ' dimmed' : ''}${merged ? ' merged' : ''}${isClickableActiveCell ? ' ftl-op-clickable' : ''}" data-r="${i}" data-k="${c.k}" data-truck-plate="${esc(rTrkKey)}" tabindex="${locked || dimmed ? -1 : 0}" style="--gc:${GROUPS[c.g].c};--w:${c.w}px" ${cellTipAttr}>
                 ${sepHandle}<span class="cbox" ${cellTipAttr}>${inner}${mergeBtn}</span></td>`;
      });
      if (first) {
        const m = ROWMETA[dir][i];
        const recon = operationPackageReconciliation(dir, ship.ref);
        let reconHtml = '';
        if (recon && recon.totalShipmentPkgs > 0) {
          if (recon.status === 'balanced') {
            reconHtml = `<div class="op-recon-pill balanced" title="${AR() ? 'تم اكتمال وتحميل كافة طرود العملية بالكامل' : 'All operation packages fully loaded'}">✓ ${AR() ? `مكتمل (${recon.totalLoadedPkgs}/${recon.totalShipmentPkgs})` : `Full (${recon.totalLoadedPkgs}/${recon.totalShipmentPkgs})`}</div>`;
          } else if (recon.status === 'overload') {
            const overShp = recon.shipments?.find(s => s.status === 'overload');
            const diffTxt = overShp ? `+${Math.abs(overShp.diff)} (شحنة ${overShp.index})` : `+${Math.abs(recon.diff)}`;
            reconHtml = `<div class="op-recon-pill overload" title="${AR() ? `تحذير: طرود زائدة ${overShp ? `على شحنة ${overShp.index} (+${Math.abs(overShp.diff)} طرد)` : ''}` : 'Overload alert'}"><span class="pulse-dot"></span>🚨 ${AR() ? `حمولة زائدة ${diffTxt}` : `Overload ${diffTxt}`}</div>`;
          } else if (recon.status === 'partial') {
            reconHtml = `<div class="op-recon-pill partial" title="${AR() ? `متبقي ${recon.diff} طرد لم يتم تحميلهم على الشاحنات بعد` : `${recon.diff} packages not loaded yet`}">⚡ ${AR() ? `متبقي ${recon.diff} (${recon.totalLoadedPkgs}/${recon.totalShipmentPkgs})` : `Remaining ${recon.diff} (${recon.totalLoadedPkgs}/${recon.totalShipmentPkgs})`}</div>`;
          } else {
            reconHtml = `<div class="op-recon-pill unloaded" title="${AR() ? 'إجمالي طرود العملية للتحميل' : 'Operation packages to load'}">📦 ${AR() ? `${recon.totalShipmentPkgs} طرد للتحميل` : `${recon.totalShipmentPkgs} pkgs to load`}</div>`;
          }
        }
        const isEditingThis = ACTIVE_EDIT_SHIPS.has(ship.ref);
        const isSavingThis = SAVING_SHIPS.has(ship.ref);
        const isOpeningThis = OPENING_EDIT_SHIPS.has(ship.ref);
        const isCheckingThis = CHECKING_LOCK_SHIPS.has(ship.ref);
        const validDraftRows = getValidFtlDraft(dir, ship.ref);
        const hasDraft = Boolean(validDraftRows);
        const isDeliveredStatus = ship.status === 'Delivered';
        const lockedByOther = isShipLockedByOther(ship);

        const draftBadge = hasDraft ? (
          isEditingThis ? `
            <div class="ftl-draft-pill" style="display:flex;flex-direction:column;align-items:center;gap:3px;width:100%;max-width:95px;border-radius:7px;background:#fffbeb;color:#92400e;border:1px solid #fcd34d;padding:4px;box-shadow:0 1px 2px rgba(0,0,0,0.04);margin-top:2px">
              <span style="font-size:9.5px;font-weight:750;color:#92400e;text-align:center;line-height:1.2">⚠️ ${AR() ? 'يوجد مسودة' : 'Draft exists'}</span>
              <div style="display:flex;align-items:center;gap:3px;width:100%">
                <button type="button" onclick="event.stopPropagation();__FTL__.restoreDraft('${esc(ship.ref)}')" title="${AR() ? 'استرجاع التعديلات التي تم حفظها كمسودة سابقة' : 'Restore saved draft edits'}" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:2px;padding:3.5px 3px;font-size:9.5px;font-weight:800;background:#d97706;color:#ffffff;border:none;border-radius:4px;cursor:pointer">
                  <span>📝 ${AR() ? 'استرجاع' : 'Restore'}</span>
                </button>
                <button type="button" onclick="event.stopPropagation();__FTL__.discardDraft('${esc(ship.ref)}')" title="${AR() ? 'تجاهل وحذف المسودة نهائياً' : 'Discard and delete draft'}" style="display:inline-flex;align-items:center;justify-content:center;padding:3.5px 5px;background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;border-radius:4px;cursor:pointer;font-weight:800;font-size:10px" onmouseover="this.style.color='#991b1b';this.style.background='#fecaca'" onmouseout="this.style.color='#b91c1c';this.style.background='#fee2e2'">
                  ✕
                </button>
              </div>
            </div>
          ` : `
            <div class="ftl-draft-pill" style="display:inline-flex;align-items:center;justify-content:space-between;width:100%;max-width:95px;border-radius:7px;background:#fef3c7;color:#92400e;border:1px solid #fde68a;overflow:hidden;box-shadow:0 1px 2px rgba(0,0,0,0.04);margin-top:2px">
              <button type="button" onclick="event.stopPropagation();__FTL__.restoreDraft('${esc(ship.ref)}')" title="${AR() ? 'استرجاع التعديلات التي تم حفظها كمسودة سابقة' : 'Restore saved draft edits'}" style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:3px;padding:3.5px 4px;font-size:9.5px;font-weight:750;background:transparent;color:#92400e;border:none;cursor:pointer">
                <span>📝 ${AR() ? 'استرجاع' : 'Restore'}</span>
              </button>
              <button type="button" onclick="event.stopPropagation();__FTL__.discardDraft('${esc(ship.ref)}')" title="${AR() ? 'تجاهل وحذف المسودة نهائياً' : 'Discard and delete draft'}" style="display:inline-flex;align-items:center;justify-content:center;padding:3.5px 6px;background:transparent;color:#b45309;border:none;border-inline-start:1px solid #fde68a;cursor:pointer;font-weight:800;font-size:10px" onmouseover="this.style.color='#e11d48';this.style.background='#ffe4e6'" onmouseout="this.style.color='#b45309';this.style.background='transparent'">
                ✕
              </button>
            </div>
          `
        ) : '';

        let opControls = '';
        if (isEditingThis) {
          opControls = `
            <button type="button" class="save-edit-btn" onclick="event.stopPropagation();__FTL__.saveShipmentEdits('${esc(ship.ref)}')" ${isSavingThis ? 'disabled' : ''} style="display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;max-width:95px;padding:6px 10px;border-radius:8px;font-size:11.5px;font-weight:750;background:#10b981;color:#ffffff;border:none;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,0.06)">
              ${isSavingThis ? (AR() ? '⏳ جاري الحفظ...' : 'Saving...') : '💾 ' + (AR() ? 'حفظ' : 'Save')}
            </button>
            <button type="button" class="cancel-edit-btn" onclick="event.stopPropagation();__FTL__.cancelEditShipment('${esc(ship.ref)}')" ${isSavingThis ? 'disabled' : ''} style="display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;max-width:95px;padding:5px 8px;border-radius:8px;font-size:11px;font-weight:600;background:#f1f5f9;color:#475569;border:1px solid #cbd5e1;cursor:pointer">
              ✕ ${AR() ? 'إلغاء' : 'Cancel'}
            </button>
            ${draftBadge}
          `;
        } else if (isDeliveredStatus) {
          opControls = `
            <div style="display:inline-flex;align-items:center;justify-content:center;gap:5px;width:100%;max-width:95px;padding:5px 8px;border-radius:8px;font-size:11px;font-weight:700;background:#f1f5f9;color:#64748b;border:1px solid #cbd5e1" title="${AR() ? 'العملية مُسلّمة' : 'Operation is Delivered'}">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
              <span>${AR() ? 'مُسلّم' : 'Delivered'}</span>
            </div>
          `;
        } else if (lockedByOther) {
          opControls = `
            <div class="fcl-locked-actions" style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;max-width:105px">
              <button type="button" class="check-lock-btn" ${isCheckingThis ? 'disabled' : ''} onclick="event.stopPropagation();__FTL__.checkAndEditShipment('${esc(ship.ref)}')" style="display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;width:100%;padding:5px 6px;border-radius:8px;font-size:11px;font-weight:700;background:#fffbeb;color:#92400e;border:1px solid #fcd34d;cursor:pointer;text-align:center;transition:all 0.15s;box-shadow:0 1px 2px rgba(0,0,0,0.03)" title="${AR() ? 'الشحنة مقفولة حالياً. انقر هنا للتحقق مما إذا كان زميلك قد انتهى والبدء في التعديل فوراً دون رفرش' : 'Locked. Click to check if lock is free and start editing immediately'}">
                <div style="display:flex;align-items:center;gap:4px;font-weight:800;color:#92400e">
                  ${isCheckingThis ? `<span class="spin">⏳</span>` : `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`}
                  <span>${isCheckingThis ? (AR() ? 'جاري الفحص...' : 'Checking...') : (AR() ? 'قيد التعديل' : 'Locked')}</span>
                </div>
                <span style="font-size:10px;color:#b45309;font-weight:600;max-width:90px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(ship.lockedByName || (AR() ? 'مستخدم آخر' : 'Other User'))}</span>
                <span style="font-size:9px;color:#d97706;text-decoration:underline;text-decoration-style:dotted">${AR() ? 'انقر للتحقق والبدء' : 'Click to check & edit'}</span>
              </button>
              ${REOPEN_GRANTED ? `
                <button type="button" class="takeover-btn" onclick="event.stopPropagation();__FTL__.takeOverShipment('${esc(ship.ref)}')" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;padding:4px 6px;border-radius:8px;font-size:10.5px;font-weight:700;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;cursor:pointer;transition:all 0.15s" title="${AR() ? 'سحب القفل للبدء في التعديل بصفتك مدير' : 'Take over lock as manager'}">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/></svg>
                  <span>${AR() ? 'فك القفل' : 'Take Over'}</span>
                </button>
              ` : ''}
            </div>
          `;
        } else {
          opControls = `
            <button type="button" class="start-edit-btn" ${isOpeningThis ? 'disabled' : ''} onclick="event.stopPropagation();__FTL__.startEditShipment('${esc(ship.ref)}')" style="display:inline-flex;align-items:center;justify-content:center;gap:5px;width:100%;max-width:95px;padding:5px 10px;border-radius:8px;font-size:12px;font-weight:700;background:#f0f9ff;color:#0369a1;border:1px solid #7dd3fc;cursor:${isOpeningThis ? 'not-allowed' : 'pointer'};opacity:${isOpeningThis ? '0.6' : '1'};transition:all 0.15s;box-shadow:0 1px 2px rgba(0,0,0,0.03)">
              ${isOpeningThis ? `<span class="spin">⏳</span>` : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`}
              <span>${isOpeningThis ? (AR() ? 'جاري الفتح...' : 'Opening...') : (AR() ? 'تعديل' : 'Edit')}</span>
            </button>
            <button type="button" class="delbtn" onclick="event.stopPropagation();__FTL__.delShip('${esc(ship.ref)}',${i})" title="${AR() ? 'حذف هذه الشحنة ونقلها للمحذوفات' : 'Delete shipment'}" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;width:100%;max-width:95px;padding:4.5px 8px;border-radius:8px;font-size:11.5px;font-weight:650;background:#fff1f2;color:#e11d48;border:1px solid #fecdd3;cursor:pointer;transition:all 0.15s;box-shadow:0 1px 2px rgba(0,0,0,0.03)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              <span>${AR() ? 'حذف' : 'Delete'}</span>
            </button>
            ${draftBadge}
          `;
        }

        const actionsTd = `
          <td class="actions-td" rowspan="${span}" style="width:115px;vertical-align:middle;text-align:center;padding:4px">
            <div class="fcl-actions-cell" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:100%">
              ${opControls}
            </div>
          </td>
        `;

        const opCard = `
          <div class="fcl-op-card" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:8px 12px;border-radius:16px;border:1px solid rgba(226, 232, 240, 0.9);background:linear-gradient(to bottom, #ffffff, rgba(240, 249, 255, 0.45));box-shadow:0 1px 3px rgba(6, 42, 74, 0.05);text-align:center;width:100%;min-height:58px;box-sizing:border-box">
            <span class="fcl-op-ref" style="font-size:12px;font-weight:700;color:#334155;letter-spacing:-0.01em">${esc(m?.ref || ship.ref)}</span>
            <span class="fcl-op-date" style="font-size:10px;color:#64748b;margin:2px 0;font-weight:500">${m ? `${fmtDay(m.day)} · ${esc(m.at)}` : ''}</span>
            <span class="fcl-op-user" style="font-size:12px;font-weight:800;color:#0f172a">${esc(m?.user || '—')}</span>
          </div>
        `;

        const isMetaClickable = Boolean(!isEditingThis && !isDeliveredStatus);
        tr += `${actionsTd}<td class="meta${isMetaClickable ? ' ftl-op-clickable' : ''}" rowspan="${span}" style="width:170px;vertical-align:middle;padding:4px" ${isMetaClickable ? `title="${esc(AR() ? 'انقر لعرض تفاصيل العملية وإضافة تحديث' : 'Click to view operation details & add update')}"` : ''}><span class="cbox" style="flex-direction:column;align-items:stretch;padding:0;min-width:160px;height:auto;border:none;background:transparent;box-shadow:none">${opCard}</span></td><td class="select-last" rowspan="${span}"><button type="button" class="ship-select" data-ref="${esc(ship.ref)}" aria-pressed="${TRIP_SELECTED[dir].has(ship.ref)}" aria-label="${AR() ? 'تحديد الشحنة ' : 'Select shipment '}${esc(ship.ref)}">${TRIP_SELECTED[dir].has(ship.ref) ? '✓' : '□'}</button></td>`;
      }
      tr += '</tr>'; html.push(tr);
      if (last) {
        html.push(`<tr class="op-separator-row" aria-hidden="true"><td colspan="100"></td></tr>`);
      }
    });
    $('eBody').innerHTML = html.join('');
    fitEntryGrid();
    if (gridEl && prevScrollLeft !== null) {
      gridEl.scrollLeft = prevScrollLeft;
      gridEl.scrollTop = prevScrollTop;
    }
    NAV_CELLS = [...$('eBody').querySelectorAll('td.c[tabindex="0"]')].map(td => ({ r: +td.dataset.r, k: td.dataset.k, el: td }));
    if (serverPaged) {
      $('tripSearchCount').textContent = TRIP_SEARCH[dir].some(r => r.v)
        ? (AR() ? `${totalCount} من ${activeOpCount(dir)} شحنة` : `${totalCount} of ${activeOpCount(dir)} shipments`)
        : '';
    } else {
      $('tripSearchCount').textContent = TRIP_SEARCH[dir].some(r => r.v) ? (AR() ? `${visible.length} من ${Object.keys(SHIPS[dir]).length} شحنة` : `${visible.length} of ${Object.keys(SHIPS[dir]).length} shipments`) : '';
    }
    $('tripCopy').textContent = AR() ? `نسخ المحدد (${TRIP_SELECTED[dir].size})` : `Copy selected (${TRIP_SELECTED[dir].size})`;
    $('tripCopy').disabled = !TRIP_SELECTED[dir].size;
    const nR = serverPaged ? (pg.totalTrucks || tripRows(dir).length) : tripRows(dir).length;
    const nS = serverPaged ? (pg.totalCount || 0) : Object.keys(SHIPS[dir]).length;
    $('eStatus').innerHTML = `<span class="s-ok">${E.readyShip(fmtN(nS), fmtN(nR))}</span>`;
    $('eApply').disabled = (tripRows('Import').length + tripRows('Export').length) === 0;
    if (LAST_COUNTS) {
      setCounts(LAST_COUNTS);
    }
    if (EDITING) { const el = root.querySelector(`#eBody td[data-r="${EDITING.r}"][data-k="${EDITING.k}"] .ed`); if (el) { el.focus(); if (el.select) try { el.select(); } catch (e) { } } }
    else if (CURSOR.r >= 0 && !searchFocused) { const td = root.querySelector(`#eBody td[data-r="${CURSOR.r}"][data-k="${CURSOR.k}"]`); if (td) td.focus({ preventScroll: true }); }
  }
  /* ---------- drag a truck separator to change how many shipments each truck carries ---------- */
  let SEP_DRAG = null;
  const sepLine = (() => { const el = document.createElement('div'); el.className = 'trksep-line'; el.hidden = true; __layer().appendChild(el); return el; })();
  function truckBoundaries(ship) { return spansFromTrkOf(ship.trkOf).slice(1).map(([a]) => a); }
  function applyTruckBoundaries(ref, bounds) {
    const dir = EDIR, ship = SHIPS[dir][ref]; if (!ship) return;
    const R = ship.rows.length, trkOf = new Array(R).fill(1);
    bounds.forEach((b, k) => { for (let r = b; r < R; r++)trkOf[r] = k + 2; });
    if (ship.trkOf.every((v, ri) => v === trkOf[ri])) return;
    ship.trkOf = trkOf; ship.trkSpans = spansFromTrkOf(trkOf);
    /* every row of a truck gets that truck's data (taken from its first row) */
    const keys = laneKeys(dir, 'trk');
    [...new Set(trkOf)].forEach(n => {
      const rows = ship.rows.filter((_, ri) => trkOf[ri] === n), src = rows[0];
      keys.forEach(k => {
        if (k === 'trucker' && !ship.unmerged.has('trucker')) return;
        if (k === 'updates') { const log = ROWMETA[dir][src]?.updates || []; rows.forEach(i => { ROWMETA[dir][i].updates = log.map(u => ({ ...u })); }); return; }
        const v = ENTRY[dir][src][k] ?? ''; rows.forEach(i => { ENTRY[dir][i][k] = v; });
      });
    });
    markDirty(); CURSOR = { r: -1, k: null }; renderEntry();
    toast(t('entry').trkSepApplied(spansFromTrkOf(trkOf).map(([, l]) => l).join(' · ')));
  }
  function sepTargetFromPoint(x, y) {
    const td = document.elementFromPoint(x, y)?.closest('#eBody td[data-r]'); if (!td) return null;
    const ship = rowShip(EDIR, +td.dataset.r); if (!ship || ship.ref !== SEP_DRAG.ref) return null;
    const rowTr = root.querySelector(`#eBody tr[data-r="${td.dataset.r}"]`), rc = rowTr.getBoundingClientRect();
    const ri = ship.rows.indexOf(+td.dataset.r);
    return y < rc.top + rc.height / 2 ? ri : ri + 1;
  }
  function sepBoundsWith(ship, k, target) {
    const R = ship.rows.length, b = truckBoundaries(ship).slice();
    b[k] = Math.max(k + 1, Math.min(R - (b.length - k), target));
    for (let i = k + 1; i < b.length; i++)b[i] = Math.max(b[i], b[i - 1] + 1);
    for (let i = k - 1; i >= 0; i--)b[i] = Math.min(b[i], b[i + 1] - 1);
    return b;
  }
  function drawSepLine(ship, ri) {
    const i = ship.rows[Math.min(ri, ship.rows.length - 1)], tr = root.querySelector(`#eBody tr[data-r="${i}"]`); if (!tr) { sepLine.hidden = true; return; }
    const rc = tr.getBoundingClientRect(), top = ri >= ship.rows.length ? rc.bottom : rc.top;
    const cells = [...root.querySelectorAll('#eBody td.c')].filter(td => colLevel(COLS[EDIR].find(c => c.k === td.dataset.k)) === 'trk' && !(td.dataset.k === 'trucker' && !ship.unmerged.has('trucker')) && rowShip(EDIR, +td.dataset.r)?.ref === ship.ref);
    if (!cells.length) { sepLine.hidden = true; return; }
    const left = Math.min(...cells.map(td => td.getBoundingClientRect().left)), right = Math.max(...cells.map(td => td.getBoundingClientRect().right));
    const grid = root.querySelector('.egrid').getBoundingClientRect();
    Object.assign(sepLine.style, { left: Math.max(left, grid.left) + 'px', width: (Math.min(right, grid.right) - Math.max(left, grid.left)) + 'px', top: (top - 1) + 'px' }); sepLine.hidden = false;
  }
  $('eBody').addEventListener('pointerdown', e => {
    const h = e.target.closest('.trksep'); if (!h) return;
    if (EDITING && !commitEdit()) return;
    const ship = SHIPS[EDIR][h.dataset.ref]; if (!ship) return;
    e.preventDefault(); e.stopPropagation();
    const k = truckBoundaries(ship).indexOf(+h.dataset.ri); if (k < 0) return;
    SEP_DRAG = { ref: ship.ref, k, bounds: truckBoundaries(ship), pointer: e.pointerId };
    root.classList.add('trksep-dragging'); drawSepLine(ship, +h.dataset.ri);
  }, true);
  __on(document, 'pointermove', e => {
    if (!SEP_DRAG) return; const ship = SHIPS[EDIR][SEP_DRAG.ref]; if (!ship) { SEP_DRAG = null; return; }
    const target = sepTargetFromPoint(e.clientX, e.clientY); if (target === null) return;
    SEP_DRAG.bounds = sepBoundsWith(ship, SEP_DRAG.k, target); drawSepLine(ship, SEP_DRAG.bounds[SEP_DRAG.k]);
  });
  __on(document, 'pointerup', e => {
    if (!SEP_DRAG) return; const d = SEP_DRAG; SEP_DRAG = null; sepLine.hidden = true; root.classList.remove('trksep-dragging');
    applyTruckBoundaries(d.ref, d.bounds);
  });
  __on(document, 'keydown', e => { if (e.key === 'Escape' && SEP_DRAG) { SEP_DRAG = null; sepLine.hidden = true; root.classList.remove('trksep-dragging'); } }, true);
  /* the table gets everything below the tool strips: its scroll height is measured, not guessed */
  function fitEntryGrid() { const g = root.querySelector('#entryView .egrid'); if (!g || $('entryView').style.display === 'none') return; const top = g.getBoundingClientRect().top; g.style.maxHeight = Math.max(260, innerHeight - top - 14) + 'px'; }
  __on(window, 'resize', () => { clearTimeout(fitEntryGrid._t); fitEntryGrid._t = setTimeout(fitEntryGrid, 120); });
  $('eBody').addEventListener('click', e => { const button = e.target.closest('.ship-select'); if (button) { e.stopPropagation(); toggleTripSelection(button.dataset.ref, true); } }, true);
  function editorHTML(c, v, i) {
    const E = t('entry');
    if (c.k === 'customs') {
      const isBosla = isBoslaClr(cellVal(ENTRY[EDIR]?.[i], 'clrType'));
      const opts = isBosla ? BOSLA_CUSTOMS : CERT_CUSTOMS;
      const cur = (v || '').trim();
      return `<select class="ed" data-r="${i}" data-k="${c.k}"><option value=""></option>${cur && !opts.includes(cur) ? `<option selected>${esc(cur)}</option>` : ''}
        ${opts.map(o => `<option value="${esc(o)}"${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (c.combo) {
      const opts = suggestionsFor(c.src, i);
      return `<input class="ed" type="text" list="dl_${c.k}_${i}" value="${esc(v)}" data-r="${i}" data-k="${c.k}" autocomplete="off" spellcheck="false" placeholder="${AR() ? 'اختار أو اكتب' : 'Pick or type'}"><datalist id="dl_${c.k}_${i}">${opts.map(o => `<option value="${esc(o)}"></option>`).join('')}</datalist>`;
    }
    if (c.t === 'list') {
      const opts = suggestionsFor(c.src, i);
      const cur = c.src === 'clrType' ? (normClr(v) || v.trim()) : v.trim();
      return `<select class="ed" data-r="${i}" data-k="${c.k}"><option value=""></option>${cur && !opts.includes(cur) ? `<option selected>${esc(cur)}</option>` : ''}
        ${opts.map(o => `<option value="${esc(o)}"${o === cur ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
    }
    if (c.t === 'date') return `<span class="datetime-control"><input class="ed" type="text" dir="ltr" value="${esc(fmtDay(v))}" placeholder="${AR() ? 'مثال: 1/11 أو 24-09-2026' : 'DD-MMM-YYYY (e.g. 1/11)'}" data-r="${i}" data-k="${c.k}" autocomplete="off"><button type="button" class="pickdate" onclick="event.stopPropagation();__FTL__.openNativeDate(this)" title="${AR() ? 'اختيار من التقويم' : 'Choose from calendar'}">${CAL_ICON_SVG}</button><input class="native-date sr-only" type="date" tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></span>`;
    if (c.t === 'time') return `<span class="datetime-control"><input class="ed" type="text" dir="ltr" inputmode="text" placeholder="${AR() ? 'مثال: 8 أو 2p أو 14:30' : 'e.g. 8 or 2p or 14:30'}" value="${esc(fmtTime12(v))}" data-r="${i}" data-k="${c.k}" autocomplete="off"><button type="button" class="pickdate picktime" onclick="event.stopPropagation();__FTL__.openTimePicker(this)" title="${AR() ? 'اختيار الوقت' : 'Choose time'}">${CLK_ICON_SVG}</button><input class="native-time sr-only" type="time" tabindex="-1" aria-hidden="true" style="position:absolute;opacity:0;pointer-events:none;width:0;height:0;"></span>`;
    const type = c.t === 'num' ? 'number' : 'text';
    return `<input class="ed" type="${type}" ${c.t === 'time' || NUMERIC_ID_KEYS.has(c.k) ? 'inputmode="numeric"' : ''} ${c.t === 'time' ? 'placeholder="HH:mm (24h)" maxlength="5"' : ''} value="${esc(c.t === 'time' ? normTime(v) || v : v)}" data-r="${i}" data-k="${c.k}" autocomplete="off" spellcheck="false">`;
  }
  /* Soft Concurrency & Edit Lifecycle Management (Matching FCL) */
  function showConflictModal({ title, message, conflictType, lockerName, onAction, actionLabel, shipRef }) {
    const modal = $('ftlConflictModal');
    if (!modal) {
      alert(message);
      return;
    }
    if (shipRef && SHIPS[EDIR]?.[shipRef]) {
      LAST_CONFLICT_SHIP = {
        ref: shipRef,
        dir: EDIR,
        rows: (SHIPS[EDIR][shipRef].rows || []).map(idx => ({ ...ENTRY[EDIR][idx] }))
      };
    }
    const titleEl = $('ftlConflictTitle');
    const bodyEl = $('ftlConflictBody');
    const actBtn = $('ftlConflictAction');
    const copyBtn = $('ftlConflictCopyExcel');
    if (titleEl) titleEl.textContent = title || (AR() ? 'تعارض في قفل العملية' : 'Lock Conflict');
    if (bodyEl) {
      bodyEl.innerHTML = `
        <div style="font-weight:700;margin-bottom:8px;color:#b91c1c">${esc(message)}</div>
        ${lockerName ? `<div style="font-size:12px;color:#64748b;margin-bottom:4px">${AR() ? 'الموظف المسؤول عن القفل:' : 'Locked by:'} <b>${esc(lockerName)}</b></div>` : ''}
        <div style="font-size:11.5px;color:#64748b;background:#ffffff;border:1px dashed #cbd5e1;padding:8px;border-radius:6px;margin-top:8px">
          💡 ${conflictType === 'MODIFIED_BY_OTHER'
          ? (AR() ? 'تم إيقاف الحفظ لحماية البيانات من الاستبدال. تم الاحتفاظ بتعديلاتك في مسودة محلية بأمان.' : 'Save halted to prevent overwrite. Changes preserved in local draft.')
          : (AR() ? 'لا يمكن فتح وضع التعديل طالما العملية محجوزة بواسطة موظف آخر، منعاً لتضارب البيانات.' : 'Operation cannot be edited while locked by another user.')}
        </div>
      `;
    }
    if (copyBtn) {
      copyBtn.style.display = LAST_CONFLICT_SHIP ? '' : 'none';
      copyBtn.onclick = () => copyConflictData();
    }
    if (actBtn) {
      if (onAction && actionLabel) {
        actBtn.style.display = '';
        actBtn.textContent = actionLabel;
        actBtn.onclick = () => { closeM('ftlConflictModal'); onAction(); };
      } else {
        actBtn.style.display = 'none';
      }
    }
    modal.style.display = 'flex';
    modal.classList.add('open');
  }

  function copyConflictData() {
    if (!LAST_CONFLICT_SHIP) return;
    const { ref, dir, rows } = LAST_CONFLICT_SHIP;
    if (!rows || !rows.length) return;
    const activeCols = (COLS[dir] || []).filter(c => !['actions', 'sel'].includes(c.k));
    const headers = activeCols.map(c => AR() ? (c.ar || c.h) : c.h);
    const escapeTsv = val => {
      const str = String(val ?? '');
      if (str.includes('\t') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const tsv = [
      headers.map(escapeTsv).join('\t'),
      ...rows.map(row => activeCols.map(c => escapeTsv(row[c.k] ?? '')).join('\t'))
    ].join('\r\n');

    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(tsv).then(() => {
        toast(AR() ? '📋 تم نسخ بيانات الشحنة إلى الحافظة بنجاح (يمكنك لصقها في Excel)' : 'Copied shipment rows to clipboard as TSV for Excel', 'success');
      }).catch(() => {
        toast(AR() ? 'تعذر النسخ إلى الحافظة' : 'Failed to copy to clipboard', 'error');
      });
    } else {
      toast(AR() ? 'الحافظة غير مدعومة في هذا المتصفح' : 'Clipboard not supported', 'error');
    }
  }

  /* ---------- FTL Draft Management (Aligned with FCL Robust Concurrency Logic) ---------- */
  function hasFtlShipmentEdits(rowsA, rowsB) {
    if (!rowsA || !rowsB) return false;
    if (rowsA.length !== rowsB.length) return true;
    const checkKeys = [
      'shipNo', 'cert', 'client', 'mawb', 'hawb', 'line', 'dest', 'fullAddress',
      'aod', 'free', 'reqDate', 'reqTime', 'arrDate', 'arrTime', 'gateOut', 'gateOutT',
      'cntr', 'trucker', 'car', 'driver', 'mob', 'invRcv', 'clrType', 'customs', 'cut',
      'packages', 'loadedPackages', 'truckType', 'loadStatus', 'trailerPlates', 'transporter'
    ];
    for (let i = 0; i < rowsA.length; i++) {
      const a = rowsA[i];
      const b = rowsB[i];
      if (!a || !b) return true;
      for (const k of checkKeys) {
        const vA = (a[k] ?? '').toString().trim();
        const vB = (b[k] ?? '').toString().trim();
        if (vA !== vB) return true;
      }
    }
    return false;
  }

  function getValidFtlDraft(dir, ref) {
    if (!ref) return null;
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !Array.isArray(ship.rows) || !ship.rows.length) return null;
    const draftKey = `ftl_draft_${ref}`;
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      const draftRows = Array.isArray(parsed) ? parsed : (parsed?.rows || []);
      if (!draftRows || !draftRows.length) {
        localStorage.removeItem(draftKey);
        return null;
      }

      const isEditing = ACTIVE_EDIT_SHIPS.has(ref);
      const serverRows = (isEditing && OP_SNAPSHOTS[ref])
        ? OP_SNAPSHOTS[ref]
        : ship.rows.map(idx => ENTRY[dir]?.[idx]);

      // Check if draft has actual changes compared to the server baseline data
      const hasEditsVsServer = hasFtlShipmentEdits(draftRows, serverRows);
      if (!hasEditsVsServer) {
        // If the draft is identical to server baseline, clean it up!
        localStorage.removeItem(draftKey);
        return null;
      }

      // If user is actively editing, only offer "Restore" if current screen rows differ from draft
      if (isEditing) {
        const currentScreenRows = ship.rows.map(idx => ENTRY[dir]?.[idx]);
        const differsFromScreen = hasFtlShipmentEdits(draftRows, currentScreenRows);
        if (!differsFromScreen) {
          // Edits are already in the table screen! Keep localStorage safe, but don't show "Restore" button.
          return null;
        }
      }

      return draftRows;
    } catch (e) {
      return null;
    }
  }

  function applyDraftToShipmentRows(dir, ship, draftRows) {
    if (!ship || !Array.isArray(draftRows) || !draftRows.length) return;
    const rows = ENTRY[dir];
    if (!rows) return;
    ship.rows.forEach((idx, rIdx) => {
      const targetRow = rows[idx];
      if (!targetRow) return;
      // Prefer matching by trip/truck identifier if present, otherwise by row index
      const draftRow = draftRows.find((dr) => (
        (dr._tripId && dr._tripId === targetRow._tripId) ||
        (dr.car && targetRow.car && String(dr.car).trim() === String(targetRow.car).trim()) ||
        (dr.cntr && targetRow.cntr && String(dr.cntr).trim() === String(targetRow.cntr).trim())
      )) || draftRows[rIdx];

      if (draftRow) {
        Object.keys(draftRow).forEach(k => {
          if (!k.startsWith('_') || k === '_allocations') {
            targetRow[k] = draftRow[k];
          }
        });
      }
    });
  }

  async function startEditShipment(ref, isAlreadyLocked = false, applyDraft = false) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship) return;
    if (OPENING_EDIT_SHIPS.has(ref)) return;

    if (ship.status === 'Delivered') {
      toast(AR() ? 'العملية مُسلّمة ولا يمكن تعديلها' : 'Operation is Delivered and cannot be edited', 'warning');
      return;
    }

    if (!isAlreadyLocked && isShipLockedByOther(ship)) {
      toast(AR() ? `العملية مقفولة حالياً بواسطة (${ship.lockedByName || 'موظف آخر'})` : `Operation is currently locked by (${ship.lockedByName || 'another user'})`, 'warning');
      return;
    }

    OPENING_EDIT_SHIPS.add(ref);
    renderEntry();

    try {
      if (!isAlreadyLocked && LIVE && ILS.api?.lockOperation) {
        try {
          const lockRes = await ILS.api.lockOperation(ref);
          if (lockRes && lockRes.isLocked === false) {
            ship.lockedByName = lockRes.lockedByName;
            showConflictModal({
              title: AR() ? 'العملية قيد التعديل حالياً' : 'Operation Currently Locked',
              message: AR() ? `العملية (${ref}) مقفولة ومحجوزة للتعديل بواسطة: ${lockRes.lockedByName || 'موظف آخر'}` : `Operation is currently locked by ${lockRes.lockedByName || 'another user'}`,
              conflictType: 'LOCKED_BY_OTHER',
              lockerName: lockRes.lockedByName,
              shipRef: ref
            });
            return;
          }
          if (lockRes) {
            ship.lockedByUserId = lockRes.lockedByUserId || OP_USER_ID;
            ship.lockedByName = lockRes.lockedByName || OP_USER;
            ship.lockedAtUtc = lockRes.lockedAtUtc || new Date().toISOString();
          }
        } catch (err) {
          const errMsg = err?.message || String(err);
          if (errMsg.includes('locked by') || errMsg.includes('مقفولة')) {
            showConflictModal({
              title: AR() ? 'العملية قيد التعديل حالياً' : 'Operation Currently Locked',
              message: errMsg,
              conflictType: 'LOCKED_BY_OTHER',
              shipRef: ref
            });
            return;
          }
          console.warn('lockOperation error:', err);
        }
      }

      OP_SNAPSHOTS[ref] = JSON.parse(JSON.stringify(ship.rows.map(idx => ({ ...ENTRY[dir][idx] }))));
      ACTIVE_EDIT_SHIPS.add(ref);

      // Check draft: if applyDraft requested, apply it; otherwise alert user transparently
      if (applyDraft) {
        const draftRows = getValidFtlDraft(dir, ref);
        if (draftRows) {
          applyDraftToShipmentRows(dir, ship, draftRows);
          toast(AR() ? `📝 تم استعادة المسودة بنجاح إلى حقول الشحنة (${ref})` : `Restored local draft for ${ref}`, 'success');
        }
      } else {
        const draftRows = getValidFtlDraft(dir, ref);
        if (draftRows) {
          toast(AR() ? `⚠️ يوجد مسودة غير محفوظة للعملية (${ref})، اضغط [استرجاع] لتطبيقها أو [✕] لتجاهلها` : `Unsaved draft exists for ${ref}. Click [Restore] to apply or [✕] to discard.`, 'warning');
        }
      }

      if (LOCK_HEARTBEATS[ref]) clearInterval(LOCK_HEARTBEATS[ref]);
      LOCK_HEARTBEATS[ref] = setInterval(() => {
        if (ACTIVE_EDIT_SHIPS.has(ref) && LIVE && ILS.api?.lockOperation) {
          ILS.api.lockOperation(ref).catch(err => console.warn('Heartbeat lock renewal failed:', err));
        }
      }, 210000);

      toast(AR() ? `✓ تم حجز القفل وفتح وضع التعديل للعملية (${ref})` : `Edit mode activated for ${ref}`);

      const firstRow = ship.rows[0];
      const firstCol = COLS[dir].find(c => !isLocked(dir, c, firstRow));
      if (firstCol) setCursor(firstRow, firstCol.k, true);
    } finally {
      OPENING_EDIT_SHIPS.delete(ref);
      renderEntry();
    }
  }

  async function saveShipmentEdits(ref) {
    const dir = EDIR;
    const ship = SHIPS[dir][ref];
    if (!ship) return;
    if (EDITING && !commitEdit()) return;

    for (const r of (ship.rows || [])) {
      const conflictMsg = shipmentConflict(dir, ENTRY[dir][r], ref, r);
      if (conflictMsg) {
        toast(conflictMsg, 'error');
        return;
      }
    }

    SAVING_SHIPS.add(ref);
    renderEntry();

    let saveSuccess = false;
    try {
      const opData = serializeSingleShipment(dir, ref);
      if (LIVE) {
        if (ILS.api?.updateOperation) {
          await ILS.api.updateOperation(ref, opData);
          saveSuccess = true;
        } else if (ILS.api?.updateShipment) {
          await ILS.api.updateShipment(ref, opData);
          saveSuccess = true;
        } else {
          saveSuccess = true;
        }
      } else {
        saveSuccess = true;
      }
    } catch (err) {
      try {
        localStorage.setItem(`ftl_draft_${ref}`, JSON.stringify({
          shipRef: ref,
          dir,
          savedAt: new Date().toISOString(),
          rows: ship.rows.map(idx => ENTRY[dir][idx])
        }));
      } catch (e) { }

      if (err.status === 409 || String(err.message || '').includes('conflict') || String(err.message || '').includes('changed on the server')) {
        showConflictModal({
          title: AR() ? 'تعارض في حفظ البيانات' : 'Save Conflict',
          message: AR() ? 'قام موظف آخر بتعديل وحفظ هذه الشحنة أثناء عملك. تم إيقاف الحفظ لحماية البيانات، وتم الاحتفاظ بتعديلاتك في مسودة محلية بأمان.' : 'Another user modified and saved this shipment. Save stopped to prevent overwriting.',
          conflictType: 'MODIFIED_BY_OTHER',
          shipRef: ref
        });
        SAVING_SHIPS.delete(ref);
        renderEntry();
        return;
      } else {
        console.error('[FTL saveShipmentEdits error]', err);
        const status = err.status || err.response?.status;
        const serverMsg = err.response?.data?.error || err.response?.data?.message || err.message;
        if (status === 401) {
          toast(AR() ? '⚠️ انتهت جلسة تسجيل الدخول (401 Unauthorized). تم حفظ تعديلاتك في المسودة، سجّل الدخول مجدداً ثم اضغط حفظ.' : 'Session expired (401 Unauthorized). Changes saved in local draft; please log in again and click Save.', 'error');
        } else if (status === 403) {
          toast(AR() ? '⚠️ لا توجد صلاحية لحفظ تعديلات FTL (403 Forbidden).' : 'You do not have permission to edit FTL operations (403 Forbidden).', 'error');
        } else if (serverMsg && serverMsg !== 'Error') {
          toast((AR() ? '⚠️ تعذر الحفظ: ' : 'Could not save: ') + serverMsg, 'error');
        } else {
          toast(AR() ? '⚠️ تعذر الاتصال بالسيرفر. تم الاحتفاظ بتعديلاتك في مسودة محلية بأمان. اضغط حفظ لإعادة المحاولة.' : 'Could not save. Changes preserved in local draft.');
        }
        SAVING_SHIPS.delete(ref);
        renderEntry();
        return;
      }
    }

    if (saveSuccess) {
      saveShipmentAllocationsDraft(dir, ref);
      try {
        localStorage.removeItem(`ftl_draft_${ref}`);
      } catch (e) { }

      if (LIVE && ILS.api?.unlockOperation) {
        try {
          await ILS.api.unlockOperation(ref);
        } catch (e) {
          console.warn('Unlock error on save:', e);
        }
      }

      if (LOCK_HEARTBEATS[ref]) {
        clearInterval(LOCK_HEARTBEATS[ref]);
        delete LOCK_HEARTBEATS[ref];
      }

      delete OP_SNAPSHOTS[ref];
      ACTIVE_EDIT_SHIPS.delete(ref);
      ACTIVE_MODAL_EDIT.ref = null;
      ACTIVE_MODAL_EDIT.type = null;
      ACTIVE_MODAL_EDIT.rowIndex = null;
      SAVING_SHIPS.delete(ref);
      SAVED_AT = new Date();
      DIRTY = false;
      if (isServerPagedEntry()) invalidateEntryCache(dir);

      renderEntry();
      if (LAST_OPEN_MANIFEST && LAST_OPEN_MANIFEST.ref === ref) {
        if (LAST_OPEN_MANIFEST.type === 'truck' && $('truckManifestModal')?.classList.contains('open')) {
          openTruckManifest(LAST_OPEN_MANIFEST.ident, LAST_OPEN_MANIFEST.rowIndex);
        } else if (LAST_OPEN_MANIFEST.type === 'shipment' && $('shipmentBreakdownModal')?.classList.contains('open')) {
          openShipmentBreakdown(LAST_OPEN_MANIFEST.ident, LAST_OPEN_MANIFEST.rowIndex);
        }
      }
      toast(AR() ? `✓ تم حفظ تعديلات العملية (${ref}) بنجاح وفك القفل` : `Saved ${ref} successfully`);
    }
  }

  let discardConfirmResolve = null;
  function resolveDiscardConfirm(confirmed) {
    $('ftlDiscardConfirmModal')?.classList.remove('open');
    if (typeof discardConfirmResolve === 'function') {
      const resolve = discardConfirmResolve;
      discardConfirmResolve = null;
      resolve(Boolean(confirmed));
    }
  }

  function openDiscardConfirmModal(ref) {
    if (typeof discardConfirmResolve === 'function') {
      resolveDiscardConfirm(false);
    }
    const modal = $('ftlDiscardConfirmModal');
    if (!modal) {
      return Promise.resolve(confirm(AR() ? 'هل أنت متأكد من إلغاء التعديلات والتراجع عن التغييرات غير المحفوظة؟' : 'Discard unsaved changes?'));
    }

    const isAr = AR();
    const titleEl = $('ftlDiscardConfirmTitle');
    if (titleEl) titleEl.textContent = isAr ? 'تجاهل التعديلات غير المحفوظة؟' : 'Discard Unsaved Changes?';
    const subEl = $('ftlDiscardConfirmSub');
    if (subEl) subEl.textContent = ref ? `${isAr ? 'العملية:' : 'Operation:'} ${ref}` : (isAr ? 'إلغاء وضع التعديل' : 'Cancel Edit Mode');
    const msgEl = $('ftlDiscardConfirmMsg');
    if (msgEl) {
      msgEl.textContent = isAr
        ? 'هل أنت متأكد من إلغاء التعديلات؟ سيتم التراجع عن جميع التغييرات غير المحفوظة واسترجاع آخر بيانات محفوظة وفك قفل العملية.'
        : 'Are you sure you want to cancel editing? All unsaved changes will be discarded, the last saved data will be restored, and the operation lock will be released.';
    }
    const cancelEl = $('ftlDiscardConfirmCancel');
    if (cancelEl) cancelEl.textContent = isAr ? 'إبقاء التعديلات' : 'Keep Editing';
    const okTxtEl = $('ftlDiscardConfirmOkTxt');
    if (okTxtEl) okTxtEl.textContent = isAr ? 'نعم، تجاهل التعديلات' : 'Yes, Discard Changes';

    return new Promise((resolve) => {
      discardConfirmResolve = resolve;
      const okBtn = $('ftlDiscardConfirmOk');
      if (okBtn) okBtn.onclick = () => resolveDiscardConfirm(true);
      if (cancelEl) cancelEl.onclick = () => resolveDiscardConfirm(false);
      modal.classList.add('open');
      setTimeout(() => cancelEl?.focus(), 20);
    });
  }

  async function cancelEditShipment(ref) {
    const dir = EDIR;
    const ship = SHIPS[dir][ref];
    if (!ship) return false;

    if (OP_SNAPSHOTS[ref]) {
      const isDirty = JSON.stringify(ship.rows.map(idx => ENTRY[dir][idx])) !== JSON.stringify(OP_SNAPSHOTS[ref]);
      if (isDirty) {
        const confirmed = await openDiscardConfirmModal(ref);
        if (!confirmed) {
          return false;
        }
      }
      ship.rows.forEach((idx, rIdx) => {
        if (OP_SNAPSHOTS[ref][rIdx]) {
          ENTRY[dir][idx] = { ...OP_SNAPSHOTS[ref][rIdx] };
        }
      });
      delete OP_SNAPSHOTS[ref];
      saveShipmentAllocationsDraft(dir, ref);
    }

    try {
      localStorage.removeItem(`ftl_draft_${ref}`);
    } catch (e) { }

    if (LIVE && ILS.api?.unlockOperation) {
      try {
        await ILS.api.unlockOperation(ref);
      } catch (e) {
        console.warn('Unlock on cancel error:', e);
      }
    }

    if (LOCK_HEARTBEATS[ref]) {
      clearInterval(LOCK_HEARTBEATS[ref]);
      delete LOCK_HEARTBEATS[ref];
    }

    ACTIVE_EDIT_SHIPS.delete(ref);
    ACTIVE_MODAL_EDIT.ref = null;
    ACTIVE_MODAL_EDIT.type = null;
    ACTIVE_MODAL_EDIT.rowIndex = null;
    SAVING_SHIPS.delete(ref);
    EDITING = null;
    renderEntry();
    if (LAST_OPEN_MANIFEST && LAST_OPEN_MANIFEST.ref === ref) {
      if (LAST_OPEN_MANIFEST.type === 'truck' && $('truckManifestModal')?.classList.contains('open')) {
        openTruckManifest(LAST_OPEN_MANIFEST.ident, LAST_OPEN_MANIFEST.rowIndex);
      } else if (LAST_OPEN_MANIFEST.type === 'shipment' && $('shipmentBreakdownModal')?.classList.contains('open')) {
        openShipmentBreakdown(LAST_OPEN_MANIFEST.ident, LAST_OPEN_MANIFEST.rowIndex);
      }
    }
    toast(AR() ? `تم إلغاء التعديل وفك قفل العملية (${ref})` : `Edit cancelled for ${ref}`);
    return true;
  }

  async function takeOverShipment(ref) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship) return;
    if (!REOPEN_GRANTED) {
      toast(AR() ? 'غير مصرح لك بسحب القفل كمدير' : 'Unauthorized to take over lock', 'error');
      return;
    }
    if (ship.status === 'Delivered') {
      toast(AR() ? 'العملية مُسلّمة ولا يمكن سحب قفلها' : 'Operation is Delivered and cannot be taken over', 'warning');
      return;
    }
    try {
      if (LIVE && ILS.api?.takeOverOperation) {
        await ILS.api.takeOverOperation(ref);
      }
      ship.lockedByUserId = OP_USER_ID;
      ship.lockedByName = OP_USER;
      ship.lockedAtUtc = new Date().toISOString();
      toast(AR() ? 'تم سحب القفل بنجاح كمدير، وجاري فتح التعديل الآن' : 'Lock seized successfully as manager. Edit mode active.', 'success');
      await startEditShipment(ref, true);
    } catch (err) {
      console.error('takeOver error:', err);
      const errMsg = err?.message || String(err);
      toast((AR() ? 'تعذر سحب القفل: ' : 'Failed to take over lock: ') + errMsg, 'error');
    }
  }

  async function checkAndEditShipment(ref) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship) return;
    if (CHECKING_LOCK_SHIPS.has(ref)) return;
    CHECKING_LOCK_SHIPS.add(ref);
    renderEntry();
    try {
      if (LIVE && ILS.api?.lockOperation) {
        const lockRes = await ILS.api.lockOperation(ref);
        if (lockRes && lockRes.isLocked === false) {
          ship.lockedByName = lockRes.lockedByName;
          toast(AR() ? `الشحنة ما زالت قيد التعديل حالياً بواسطة (${lockRes.lockedByName || 'موظف آخر'}).` : `Operation is still being edited by (${lockRes.lockedByName || 'other user'}).`, 'warning');
          return;
        }
      }
      ship.lockedByUserId = OP_USER_ID;
      ship.lockedByName = OP_USER;
      ship.lockedAtUtc = new Date().toISOString();
      toast(AR() ? 'تم تحرير الشحنة بنجاح! وضع التعديل متاح الآن.' : 'Lock acquired! Edit mode active.', 'success');
      await startEditShipment(ref, true);
    } catch (err) {
      console.error('checkAndEditShipment error:', err);
      const errMsg = err?.message || String(err);
      toast(errMsg, 'warning');
    } finally {
      CHECKING_LOCK_SHIPS.delete(ref);
      renderEntry();
    }
  }

  function restoreDraft(ref) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship) return;
    if (ACTIVE_EDIT_SHIPS.has(ref)) {
      const draftRows = getValidFtlDraft(dir, ref);
      if (draftRows) {
        applyDraftToShipmentRows(dir, ship, draftRows);
        markDirty();
        renderEntry();
        toast(AR() ? `📝 تم استعادة المسودة بنجاح إلى حقول الشحنة (${ref})` : `Restored local draft for ${ref}`, 'success');
      }
    } else {
      startEditShipment(ref, false, true);
    }
  }

  function discardDraft(ref) {
    try {
      localStorage.removeItem(`ftl_draft_${ref}`);
    } catch (e) { }
    if (ACTIVE_EDIT_SHIPS.has(ref) && OP_SNAPSHOTS[ref]) {
      const dir = EDIR;
      const ship = SHIPS[dir]?.[ref];
      if (ship && Array.isArray(ship.rows)) {
        ship.rows.forEach((idx, rIdx) => {
          if (OP_SNAPSHOTS[ref][rIdx]) ENTRY[dir][idx] = { ...OP_SNAPSHOTS[ref][rIdx] };
        });
      }
    }
    renderEntry();
    toast(AR() ? '✓ تم تجاهل المسودة وحذفها بنجاح' : 'Draft discarded successfully', 'info');
  }

  async function startEditFromManifest(ref, ident, rowIndex, type) {
    if (!ref) return;
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (!ship) return;

    if (ship.status === 'Delivered') {
      toast(AR() ? 'العملية مُسلّمة ولا يمكن تعديل توزيعها' : 'Operation is Delivered and cannot be edited', 'warning');
      return;
    }

    if (isShipLockedByOther(ship)) {
      toast(AR() ? `العملية مقفولة حالياً بواسطة (${ship.lockedByName || 'موظف آخر'})` : `Operation is currently locked by (${ship.lockedByName || 'another user'})`, 'warning');
      return;
    }

    if (LIVE && ILS.api?.lockOperation) {
      try {
        const lockRes = await ILS.api.lockOperation(ref);
        if (lockRes && lockRes.isLocked === false) {
          showConflictModal({
            title: AR() ? 'العملية قيد التعديل حالياً' : 'Operation Currently Locked',
            message: AR() ? `العملية (${ref}) مقفولة ومحجوزة للتعديل بواسطة: ${lockRes.lockedByName || 'موظف آخر'}` : `Operation is currently locked by ${lockRes.lockedByName || 'another user'}`,
            conflictType: 'LOCKED_BY_OTHER',
            lockerName: lockRes.lockedByName,
            shipRef: ref
          });
          return;
        }
        if (lockRes) {
          ship.lockedByUserId = lockRes.lockedByUserId || OP_USER_ID;
          ship.lockedByName = lockRes.lockedByName || OP_USER;
          ship.lockedAtUtc = lockRes.lockedAtUtc || new Date().toISOString();
        }
      } catch (err) {
        const errMsg = err?.message || String(err);
        if (errMsg.includes('locked by') || errMsg.includes('مقفولة')) {
          showConflictModal({
            title: AR() ? 'العملية قيد التعديل حالياً' : 'Operation Currently Locked',
            message: errMsg,
            conflictType: 'LOCKED_BY_OTHER',
            shipRef: ref
          });
          return;
        }
        console.warn('lockOperation error:', err);
      }
    }

    if (!OP_SNAPSHOTS[ref]) {
      OP_SNAPSHOTS[ref] = JSON.parse(JSON.stringify(ship.rows.map(idx => ({ ...ENTRY[dir][idx] }))));
    }

    ACTIVE_MODAL_EDIT.ref = ref;
    ACTIVE_MODAL_EDIT.type = type;
    ACTIVE_MODAL_EDIT.rowIndex = rowIndex;

    if (LOCK_HEARTBEATS[ref]) clearInterval(LOCK_HEARTBEATS[ref]);
    LOCK_HEARTBEATS[ref] = setInterval(() => {
      if ((ACTIVE_EDIT_SHIPS.has(ref) || ACTIVE_MODAL_EDIT.ref === ref) && LIVE && ILS.api?.lockOperation) {
        ILS.api.lockOperation(ref).catch(err => console.warn('Heartbeat lock renewal failed:', err));
      }
    }, 210000);

    toast(AR() ? `✏️ تم فتح وضع تعديل التوزيع للعملية (${ref})` : `Allocation edit mode opened for ${ref}`);
    if (type === 'truck') {
      openTruckManifest(ident, rowIndex);
    } else {
      openShipmentBreakdown(ident, rowIndex);
    }
  }

  async function saveFromManifest(ref, ident, rowIndex, type) {
    if (!ref) return;
    SAVING_SHIPS.add(ref);
    if (type === 'truck') {
      openTruckManifest(ident, rowIndex);
    } else {
      openShipmentBreakdown(ident, rowIndex);
    }
    await saveShipmentEdits(ref);
  }

  async function cancelFromManifest(ref, ident, rowIndex, type) {
    if (!ref) return;
    await cancelEditShipment(ref);
  }

  __on(window, 'pagehide', () => {
    if ((ACTIVE_EDIT_SHIPS.size > 0 || ACTIVE_MODAL_EDIT.ref) && LIVE) {
      const token = localStorage.getItem('accessToken');
      const apiBase = (import.meta.env?.VITE_API_BASE_URL ?? '').replace(/\/+$/, '');
      const refs = new Set([...ACTIVE_EDIT_SHIPS]);
      if (ACTIVE_MODAL_EDIT.ref) refs.add(ACTIVE_MODAL_EDIT.ref);
      for (const ref of refs) {
        try {
          fetch(`${apiBase}/api/v1/ftl/operations/${encodeURIComponent(ref)}/unlock`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            keepalive: true
          });
        } catch (e) { }
      }
    }
  });

  async function delShip(ref, i) {
    const dir = EDIR;
    const ship = SHIPS[dir]?.[ref];
    if (isShipLockedByOther(ship)) {
      toast(AR() ? `لا يمكن حذف العملية لأنها مقفولة حالياً بواسطة (${ship.lockedByName || 'موظف آخر'})` : `Cannot delete operation while locked by (${ship.lockedByName || 'another user'})`, 'warning');
      return;
    }
    const firstRow = ship?.rows?.[0] !== undefined ? ENTRY[dir]?.[ship.rows[0]] : null;
    __emit('requestDelete', {
      ref,
      dir,
      shipNo: firstRow?.shipNo || ref,
      mawb: firstRow?.mawb || firstRow?.bl || '',
      client: firstRow?.client || '',
      transporter: firstRow?.trucker || '',
      trucksCount: ship?.rows?.length || 1,
    });
  }

  function removeShipmentLocally(ref, dirOrIndex) {
    let dir = typeof dirOrIndex === 'string' ? dirOrIndex : null;
    if (!dir) {
      if (SHIPS.Import && SHIPS.Import[ref]) dir = 'Import';
      else if (SHIPS.Export && SHIPS.Export[ref]) dir = 'Export';
      else dir = EDIR;
    }
    const ship = SHIPS[dir]?.[ref];
    const drop = new Set();
    if (ship && Array.isArray(ship.rows)) {
      ship.rows.forEach(ix => drop.add(ix));
    }
    if (ROWMETA[dir]) {
      Object.entries(ROWMETA[dir]).forEach(([ix, m]) => {
        if (m?.ref === ref) drop.add(Number(ix));
      });
    }
    if (typeof dirOrIndex === 'number') {
      drop.add(dirOrIndex);
    }

    const remap = {}, keep = [];
    (ENTRY[dir] || []).forEach((r, ix) => {
      if (!drop.has(ix)) {
        remap[ix] = keep.length;
        keep.push(r);
      }
    });

    const meta = {};
    Object.entries(ROWMETA[dir] || {}).forEach(([ix, m]) => {
      if (remap[ix] !== undefined) meta[remap[ix]] = m;
    });

    ENTRY[dir] = keep;
    ROWMETA[dir] = meta;
    if (SHIPS[dir]) {
      delete SHIPS[dir][ref];
      TRIP_SELECTED[dir]?.delete(ref);
      Object.values(SHIPS[dir]).forEach(sh => {
        if (sh && Array.isArray(sh.rows)) {
          sh.rows = sh.rows.map(ix => remap[ix]).filter(ix => ix !== undefined);
        }
      });
    }

    DATA = DATA.filter(r => r._ref !== ref && !(ship?.uploadGroup && r._uploadGroup === ship.uploadGroup));

    if (LAST_COUNTS) {
      LAST_COUNTS.inactiveCount = (LAST_COUNTS.inactiveCount || 0) + 1;
      if (dir === 'Import') LAST_COUNTS.activeImportCount = Math.max(0, (LAST_COUNTS.activeImportCount || 0) - 1);
      if (dir === 'Export') LAST_COUNTS.activeExportCount = Math.max(0, (LAST_COUNTS.activeExportCount || 0) - 1);
      setCounts(LAST_COUNTS);
    }

    if (isServerPagedEntry() && ENTRY_PAGING[dir]) {
      invalidateEntryCache(dir);
      ENTRY_PAGING[dir].totalCount = Math.max(0, (ENTRY_PAGING[dir].totalCount || 1) - 1);
      if (Object.keys(SHIPS[dir] || {}).length === 0 && ENTRY_PAGING[dir].totalCount > 0) {
        if (TRIP_PAGE[dir] > 0) TRIP_PAGE[dir] = Math.max(0, TRIP_PAGE[dir] - 1);
        loadEntryPage(dir, { force: true });
      }
    } else if (TRIP_PAGE && TRIP_PAGE[dir] > 0) {
      const activeOps = Object.values(SHIPS[dir] || {}).filter(s => s.status !== 'Delivered' && s.status !== 'Inactive');
      const maxPages = Math.ceil(activeOps.length / (TRIPS_PER_PAGE || 20));
      if (TRIP_PAGE[dir] >= maxPages) {
        TRIP_PAGE[dir] = Math.max(0, maxPages - 1);
      }
    }

    CURSOR = { r: -1, k: null };
    EDITING = null;
    renderEntry();
    __emit('countsChanged');
  }
  /* ---------- keyboard-first navigation ---------- */
  let NAV_CELLS = [];
  function setCursor(r, k, scroll) {
    const old = root.querySelector('#eBody td.c.cur'); old?.classList.remove('cur');
    CURSOR = { r, k }; EDITING = null;
    const td = root.querySelector(`#eBody td[data-r="${r}"][data-k="${k}"]`);
    if (!td) { renderEntry(); return; }
    td.classList.add('cur'); td.focus({ preventScroll: true });
    if (scroll) td.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  function navigableCells() {
    return NAV_CELLS;
  }
  function moveCursor(dr, dc) {
    const dir = EDIR, cols = COLS[dir].filter(c => c.t !== 'upd');
    const cells = navigableCells(); if (!cells.length) return;
    let { r, k } = CURSOR; if (r < 0) { setCursor(cells[0].r, cells[0].k, true); return; }
    const ci = cols.findIndex(c => c.k === k);
    if (dc) {
      let j = ci; for (let step = 0; step < cols.length; step++) {
        j += dc; if (j < 0 || j >= cols.length) return;
        const sh = rowShip(dir, r), inGroup = sh ? groupRows(sh, cols[j], r) : [r]; const cand = cells.find(x => x.r === r && x.k === cols[j].k) || cells.find(x => x.k === cols[j].k && inGroup.includes(x.r));
        if (cand) { setCursor(cand.r, cand.k, true); return; }
      }
    }
    if (dr) {
      const sameCol = cells.filter(x => x.k === k).sort((a, b) => a.r - b.r);
      const pos = sameCol.findIndex(x => x.r === r);
      const next = sameCol[pos + dr]; if (next) setCursor(next.r, next.k, true);
      else if (!$('tripPage').hidden && ((dr > 0 && !$('tripPageNext').disabled) || (dr < 0 && !$('tripPagePrev').disabled))) {
        changeTripPage(dr);
        const across = navigableCells().filter(x => x.k === k);
        const target = dr > 0 ? across[0] : across[across.length - 1];
        if (target) setCursor(target.r, target.k, true);
      }
    }
  }
  function startEdit() { if (CURSOR.r < 0 || isLocked(EDIR, COLS[EDIR].find(c => c.k === CURSOR.k), CURSOR.r)) return; const td = root.querySelector(`#eBody td[data-r="${CURSOR.r}"][data-k="${CURSOR.k}"]`); if (!td || td.classList.contains('locked') || td.classList.contains('dimmed')) return; EDITING = { ...CURSOR }; renderEntry(); }
  function commitEdit() {
    if (!EDITING) return;
    const el = root.querySelector('#eBody .ed'); const { r, k } = EDITING;
    if (el) {
      let v = el.value;
      const col = COLS[EDIR].find(c => c.k === k);
      if (isLocked(EDIR, col, r)) { EDITING = null; renderEntry(); return; }
      if (v && col.t === 'date') { const parsed = fixDate(v, false); if (!parsed) { toast(AR() ? 'تاريخ غير صحيح (مثال: 1/11 أو 24-09-2026)' : 'Invalid date (e.g. 1/11 or 24-SEP-2026)'); el.focus(); return false; } v = parsed; }
      if (v && col.t === 'time') { const parsed = normTime(v); if (!parsed) { toast(AR() ? 'اكتب الوقت مثل 8 أو 2p أو 14:30' : 'Enter time (e.g. 8, 2p, 14:30)'); el.focus(); return false; } v = parsed; }
      const result = validateField(col, v);
      if (!result.ok) { toast(result.message); el.focus(); return false; }
      v = result.value;
      const finalValue = validateField(col, v);
      if (!finalValue.ok) { toast(finalValue.message); el.focus(); return false; }
      v = finalValue.value;
      const conflict = cellIdentityConflict(EDIR, r, k, v);
      if (conflict) { toast(conflict); el.focus(); return false; }
      if (String(ENTRY[EDIR][r][k] ?? '') !== String(v) && setCell(r, k, v) === false) return false;
    }
    EDITING = null;
    renderEntry(); return true;
  }
  function cancelEdit() { EDITING = null; renderEntry(); }

  $('eBody').addEventListener('keydown', e => {
    if (e.target.closest('button,.status-select')) return;
    const inEditor = e.target.classList.contains('ed');
    if (inEditor) {
      if (e.key === 'Enter') { e.preventDefault(); if (commitEdit()) moveCursor(1, 0); }
      else if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
      else if (e.key === 'Tab') { e.preventDefault(); if (commitEdit()) moveCursor(0, e.shiftKey ? -1 : 1); }
      return;
    }
    const td = e.target.closest('td.c'); if (!td) return;
    CURSOR = { r: +td.dataset.r, k: td.dataset.k };
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); moveCursor(0, AR() ? -1 : 1); break;
      case 'ArrowLeft': e.preventDefault(); moveCursor(0, AR() ? 1 : -1); break;
      case 'ArrowDown': e.preventDefault(); moveCursor(1, 0); break;
      case 'ArrowUp': e.preventDefault(); moveCursor(-1, 0); break;
      case 'Tab': e.preventDefault(); moveCursor(0, e.shiftKey ? -1 : 1); break;
      case 'Enter': case 'F2': e.preventDefault(); startEdit(); break;
      case 'Delete': case 'Backspace': { e.preventDefault(); const c = COLS[EDIR].find(x => x.k === CURSOR.k); if (!isLocked(EDIR, c, CURSOR.r)) { setCell(CURSOR.r, CURSOR.k, ''); renderEntry(); } break; }
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) { /* start typing = start editing with that character */
          const c = COLS[EDIR].find(x => x.k === CURSOR.k);
          if (c && !isLocked(EDIR, c, CURSOR.r) && c.t !== 'date' && c.t !== 'time' && c.t !== 'list') { e.preventDefault(); EDITING = { ...CURSOR }; renderEntry(); const el = root.querySelector('#eBody .ed'); if (el) { el.value = e.key; } }
        }
    }
  });
  /* floating tooltip for the updates cell (escapes the table's scroll clipping) */
  const TIP = document.createElement('div'); TIP.className = 'floattip'; __layer().appendChild(TIP);
  $('eBody').addEventListener('mouseover', e => {
    const btn = e.target.closest('.updbtn'); if (!btn) return;
    const r = +btn.closest('td').dataset.r, u = (ROWMETA[EDIR][r]?.updates) || [];
    if (!u.length) return;
    TIP.innerHTML = `<b>${t('entry').updTitle}</b>` + u.slice().reverse().map((x, ix) => `<div class="ftrow"><span>${u.length - ix}</span><div>${esc(x.text)}<small>${fmtDay(x.day)} · ${x.at} · ${esc(x.user)}</small></div></div>`).join('');
    const rc = btn.getBoundingClientRect(); TIP.style.display = 'block';
    const w = TIP.offsetWidth, h = TIP.offsetHeight;
    let left = Math.min(Math.max(8, rc.left), innerWidth - w - 8), top = rc.top - h - 8; if (top < 8) top = rc.bottom + 8;
    TIP.style.left = left + 'px'; TIP.style.top = top + 'px';
  });
  $('eBody').addEventListener('mouseout', e => {
    if (e.target.closest('.updbtn')) TIP.style.display = 'none';
  });
  $('eBody').addEventListener('click', e => {
    if (
      e.target.closest('.mg') ||
      e.target.closest('.updbtn') ||
      e.target.closest('.ed') ||
      e.target.closest('.status-select') ||
      e.target.closest('.fcl-status-container') ||
      e.target.closest('.truck-manifest-icon-btn') ||
      e.target.closest('.shipment-breakdown-icon-btn') ||
      e.target.closest('.ship-select') ||
      e.target.closest('.actions-td')
    ) return;

    const metaTd = e.target.closest('td.meta');
    if (metaTd) {
      const trEl = metaTd.closest('tr[data-r]');
      const rIdx = trEl ? +trEl.dataset.r : NaN;
      const ship = !isNaN(rIdx) ? rowShip(EDIR, rIdx) : null;
      if (ship && ship.status !== 'Delivered' && !ACTIVE_EDIT_SHIPS.has(ship.ref)) {
        const sel = window.getSelection ? String(window.getSelection() || '') : '';
        if (!sel.trim()) openActiveDetailsDrawer(EDIR, ship.ref, rIdx, '__meta__');
      }
      return;
    }

    const td = e.target.closest('td.c'); if (!td) return;
    const r = +td.dataset.r;
    const ship = !isNaN(r) ? rowShip(EDIR, r) : null;
    const isEditing = Boolean(ship?.ref && ACTIVE_EDIT_SHIPS.has(ship.ref));
    if (ship && ship.status !== 'Delivered' && !isEditing && td.dataset.k !== 'status' && td.dataset.k !== 'updates') {
      const sel = window.getSelection ? String(window.getSelection() || '') : '';
      if (!sel.trim()) openActiveDetailsDrawer(EDIR, ship.ref, r, td.dataset.k);
      return;
    }

    if (td.classList.contains('dimmed')) { toast(td.dataset.k === 'cert' ? (AR() ? 'التخليص بوليصة (BOSLA) — خانة رقم الشهادة مش مستخدمة' : 'BOSLA clearance — Certificate Number is not used') : (AR() ? 'التخليص شهادة (CERT) — منطقة الجمارك محددة تلقائياً بـ Cairo Airport Customs وغير قابلة للتعديل' : 'CERT clearance — Customs Area is fixed to Cairo Airport Customs and locked')); return; }
    if (td.classList.contains('locked')) {
      if (!isEditing) {
        toast(t('entry').editFirstToast || (AR() ? 'اضغط على زر "تعديل" أولاً لبدء تعديل بيانات هذه العملية' : 'Please click "Edit" first to modify this operation'));
      } else {
        toast(t('entry').lockedToast);
      }
      return;
    }
    if (EDITING && !commitEdit()) return;
    const same = CURSOR.r === +td.dataset.r && CURSOR.k === td.dataset.k;
    CURSOR = { r: +td.dataset.r, k: td.dataset.k };
    if (same || e.detail === 2) startEdit(); else setCursor(CURSOR.r, CURSOR.k, false);
  });
  let draftSyncTimer = null;
  function saveActiveDraftNow(shipRef) {
    const dir = EDIR;
    let ref = shipRef;
    if (!ref && EDITING) {
      const s = rowShip(dir, EDITING.r);
      if (s) ref = s.ref;
    }
    if (!ref && ACTIVE_EDIT_SHIPS.size === 1) {
      ref = Array.from(ACTIVE_EDIT_SHIPS)[0];
    }
    if (!ref) return;
    const ship = SHIPS[dir]?.[ref];
    if (!ship || !Array.isArray(ship.rows) || !ship.rows.length) return;
    try {
      const activeRows = ship.rows.map(idx => {
        const rowData = { ...(ENTRY[dir]?.[idx] || {}) };
        if (EDITING && EDITING.r === idx) {
          const el = root.querySelector('#eBody .ed');
          if (el) rowData[EDITING.k] = el.value;
        }
        return rowData;
      });
      const baseRows = OP_SNAPSHOTS[ref] || ship.rows.map(idx => ENTRY[dir]?.[idx]);
      if (hasFtlShipmentEdits(activeRows, baseRows)) {
        localStorage.setItem(`ftl_draft_${ref}`, JSON.stringify({
          shipRef: ref,
          dir,
          savedAt: new Date().toISOString(),
          rows: activeRows
        }));
      }
    } catch (e) { }
  }

  $('eBody').addEventListener('focusout', e => { if (e.target.classList.contains('ed')) setTimeout(() => { if (EDITING && !DATE_PICKING && !TIME_PICKING && !document.activeElement?.classList.contains('ed')) commitEdit(); }, 80); });
  $('eBody').addEventListener('change', e => { if (e.target.classList.contains('ed') && e.target.tagName === 'SELECT') { commitEdit(); } });
  $('eBody').addEventListener('input', e => {
    if (e.target.classList.contains('ed')) {
      clearTimeout(draftSyncTimer);
      draftSyncTimer = setTimeout(() => saveActiveDraftNow(), 120);
    }
  });

  window.addEventListener('beforeunload', () => {
    if (EDITING) saveActiveDraftNow();
  });
  window.addEventListener('pagehide', () => {
    if (EDITING) saveActiveDraftNow();
  });


  /* =====================================================================
     EXCEL EXPORT — real .xlsx that looks like the TPT sheet:
     coloured header groups, merged cells inside a shipment, frozen header,
     auto widths, an ENTRY LOG sheet and (optionally) only chosen columns.
     ===================================================================== */
  function hexToARGB(h) { return 'FF' + h.replace('#', '').toUpperCase(); }
  function luminance(h) { const r = parseInt(h.slice(1, 3), 16), g = parseInt(h.slice(3, 5), 16), b = parseInt(h.slice(5, 7), 16); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; }
  async function buildWorkbook(opts = {}) {
    const wb = new ExcelJS.Workbook(); wb.creator = 'ILS Egypt · FTL Airport Dashboard'; wb.created = new Date();
    let sheets = 0;
    const scope = opts.scope || (CURRENT_TAB === 'Delivered' ? 'delivered' : (CURRENT_TAB === 'Inactive' ? 'inactive' : 'active'));
    for (const d of ['Import', 'Export']) {
      if (opts.directions && !opts.directions.includes(d)) continue;
      const store = isArchiveScope(scope) ? ARCHIVE_STORE[scope]?.[d] : null;
      const targetEntry = store ? store.entry : ENTRY[d];
      const targetShips = store ? store.ships : SHIPS[d];
      const targetRowmeta = store ? store.rowmeta : ROWMETA[d];
      const getShipRef = (dirKey, idx) => targetShips[targetRowmeta[idx]?.ref]?.ref;

      const included = (opts.operations?.[d] && opts.operations[d].length) ? new Set(opts.operations[d]) : null;
      const allowedRows = (opts.rowIndices && opts.rowIndices[d] && opts.rowIndices[d].length) ? new Set(opts.rowIndices[d]) : null;
      const rows = targetEntry.map((r, i) => ({ r, i })).filter(({ i }) => (!included || included.has(getShipRef(d, i))) && (!allowedRows || allowedRows.has(i)));
      if (!rows.length) continue;
      const rowNumbers = new Map(rows.map(({ i }, position) => [i, position + 2]));
      const pick = (opts.columns && opts.columns[d]) ? COLS[d].filter(c => opts.columns[d].includes(c.k)) : COLS[d].filter(c => c.t !== 'upd');
      const ws = wb.addWorksheet(AR() ? (d === 'Import' ? 'استيراد جوي' : 'تصدير جوي') : (d === 'Import' ? 'Air Import' : 'Air Export'), { views: [{ state: 'frozen', ySplit: 1 }] });
      /* header */
      const head = ws.addRow(pick.map(c => AR() ? (c.ar || c.h) : c.h));
      head.height = 28;
      pick.forEach((c, ci) => {
        const cell = head.getCell(ci + 1); const col = GROUPS[c.g]?.c || '#0B4F7A';
        const isDark = luminance(col) < 0.58;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToARGB(col) } };
        cell.font = { name: 'Calibri', bold: true, size: 11, color: { argb: isDark ? 'FFFFFFFF' : 'FF1F2937' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.border = { top: { style: 'thin', color: { argb: 'FFB7C1CC' } }, bottom: { style: 'medium', color: { argb: 'FF334155' } }, left: { style: 'thin', color: { argb: 'FFB7C1CC' } }, right: { style: 'thin', color: { argb: 'FFB7C1CC' } } };
      });
      /* data */
      rows.forEach(({ r }, i) => {
        const row = ws.addRow(pick.map(c => {
          const v = String(r[c.k] ?? '').trim();
          if (c.t === 'date') return fmtDay(v);
          if (c.k === 'updDate') return fmtDateTime(v);
          if (c.t === 'time' && v) return normTime(v) || v;
          if ((c.t === 'num' || (/^\d+$/.test(v) && !/^0\d+/.test(v) && v.length < 15)) && !isNaN(+v) && v !== '') return +v;
          if (c.k === 'movement') return AR() ? dirLabel(v) : v;
          if (c.k === 'status') return AR() ? (v === 'Delivered' ? t('workflow').delivered : (v === 'Inactive' ? (t('workflow').inactive || 'غير نشط') : t('workflow').open)) : v;
          return v;
        }));
        row.height = 20;
        pick.forEach((c, ci) => {
          const cell = row.getCell(ci + 1);
          const col = GROUPS[c.g]?.c || '#FFFFFF';
          const isDark = luminance(col) < 0.58;
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: hexToARGB(col) } };
          cell.font = { name: 'Calibri', size: 10, bold: false, color: { argb: isDark ? 'FFFFFFFF' : 'FF1F2937' } };
          cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
          cell.border = { top: { style: 'thin', color: { argb: 'FFB7C1CC' } }, bottom: { style: 'thin', color: { argb: 'FFB7C1CC' } }, left: { style: 'thin', color: { argb: 'FFB7C1CC' } }, right: { style: 'thin', color: { argb: 'FFB7C1CC' } } };
          if (c.t === 'date') cell.numFmt = '@';
        });
      });
      /* merges: mergeable columns across each shipment (unless un-merged) */
      Object.values(targetShips).filter(sh => !included || included.has(sh.ref)).forEach(sh => {
        const renderRows = sh.rows.filter(r => !allowedRows || allowedRows.has(r));
        if (renderRows.length < 2 || renderRows.length !== sh.rows.length) return;
        pick.forEach((c, ci) => {
          const done = new Set(); sh.rows.forEach((_, ri) => {
            const sp = spanOf(sh, c, ri); if (sp.len < 2 || done.has(sp.start)) return; done.add(sp.start);
            const a = rowNumbers.get(sh.rows[sp.start]), b = rowNumbers.get(sh.rows[sp.start + sp.len - 1]); if (a && b && b > a) { try { ws.mergeCells(a, ci + 1, b, ci + 1); } catch (e) { } }
          });
        });
      });
      /* a border around the rows of every operation, so each shipment block is separated from the next */
      const BOX = { style: 'medium', color: { argb: 'FF0B4F7A' } };
      Object.values(targetShips).filter(sh => !included || included.has(sh.ref)).forEach(sh => {
        const nums = sh.rows.map(i => rowNumbers.get(i)).filter(Boolean); if (!nums.length) return;
        const r0 = Math.min(...nums), r1 = Math.max(...nums);
        const edge = (cell, sides) => { const border = { ...(cell.border || {}) }; sides.forEach(s => border[s] = BOX); cell.style = { ...cell.style, border }; };
        for (let r = r0; r <= r1; r++)pick.forEach((c, ci) => {
          const cell = ws.getCell(r, ci + 1), sides = [];
          if (r === r0) sides.push('top'); if (r === r1) sides.push('bottom'); if (ci === 0) sides.push('left'); if (ci === pick.length - 1) sides.push('right');
          if (!sides.length) return;
          edge(cell, sides);
          const master = cell.master; if (master && master !== cell) edge(master, sides);   /* Excel draws a merged cell's outline from its top-left cell */
        });
      });
      pick.forEach((c, ci) => {
        const title = AR() ? (c.ar || c.h) : c.h;
        const titleLen = (title || '').length;
        const w = Math.max(15, titleLen + 5, Math.round((c.w || 150) / 6.8));
        ws.getColumn(ci + 1).width = Math.min(w, 60);
      });
      ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: pick.length } };
      sheets++;
    }
    /* entry log */
    const log = wb.addWorksheet(AR() ? 'سجل الإدخال' : 'ENTRY LOG');
    log.addRow(AR() ? ['التاب', 'مرجع الشحنة', 'الصف', 'رقم العربية', 'أدخلها', 'التاريخ', 'الوقت', 'التحديثات'] : ['Sheet', 'Shipment ref', 'Row', 'Truck No.', 'Entered by', 'Date', 'Time', 'Updates']).eachCell(c => { c.font = { bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B4F7A' } }; });
    ['Import', 'Export'].filter(d => !opts.directions || opts.directions.includes(d)).forEach(d => {
      const store = isArchiveScope(scope) ? ARCHIVE_STORE[scope]?.[d] : null;
      const targetEntry = store ? store.entry : ENTRY[d];
      const targetShips = store ? store.ships : SHIPS[d];
      const targetRowmeta = store ? store.rowmeta : ROWMETA[d];
      targetEntry.forEach((r, i) => {
        if (opts.operations?.[d] && !opts.operations[d].includes(targetShips[targetRowmeta[i]?.ref]?.ref)) return;
        const m = targetRowmeta[i] || {};
        log.addRow([AR() ? dirLabel(d) : d.toUpperCase(), m.ref || '', i + 1, cellVal(r, 'cntr'), m.user || '', m.day ? fmtDay(m.day) : '', m.at || '', (m.updates || []).map(u => `${fmtDay(u.day)} ${u.at} ${u.user}: ${u.text}`).join(' | ')]);
      });
    });
    [10, 16, 6, 16, 16, 12, 8, 60].forEach((w, i) => log.getColumn(i + 1).width = w);
    return sheets ? wb : null;
  }
  async function workbookBlob(opts) { const wb = await buildWorkbook(opts); if (!wb) return null; const buf = await wb.xlsx.writeBuffer(); return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }); }
  function saveBlob(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.style.display = 'none'; __layer().appendChild(a); a.click();
    setTimeout(() => { try { a.remove(); } catch (e) { } URL.revokeObjectURL(url); }, 5000);
  }
  async function downloadEntry(opts) {
    const blob = await workbookBlob(opts); if (!blob) { toast(t('entry').nothingToSave); return null; }
    const name = `ILS_AIR_FREIGHT_REPORT_${new Date().toISOString().slice(0, 10)}.xlsx`;
    saveBlob(blob, name); SAVED_AT = new Date(); DIRTY = false; renderSysBar(); toast(t('entry').saved);
    return { blob, name };
  }
  function tripPickerHTML(dir, prefix, defaults, scope = 'active') {
    const isAll = dir === 'ALL';
    const cols = isAll
      ? [...COLS.Import.filter(c => c.t !== 'upd'), ...COLS.Export.filter(c => c.t !== 'upd' && !COLS.Import.some(ic => ic.k === c.k))]
      : (COLS[dir] || COLS.Import).filter(c => c.t !== 'upd');
    let ships = [];
    let getRowForShip = null;
    if (isArchiveScope(scope)) {
      const store = ARCHIVE_STORE[scope];
      if (isAll) {
        const impShips = Object.values(store?.Import?.ships || {}).map(s => ({ ...s, dir: 'Import' }));
        const expShips = Object.values(store?.Export?.ships || {}).map(s => ({ ...s, dir: 'Export' }));
        ships = [...impShips, ...expShips];
        getRowForShip = (sh, ri) => (sh.dir === 'Export' ? store?.Export?.entry?.[ri] : store?.Import?.entry?.[ri]) || {};
      } else {
        const dirStore = store?.[dir];
        ships = Object.values(dirStore?.ships || {}).map(s => ({ ...s, dir }));
        getRowForShip = (sh, ri) => dirStore?.entry?.[ri] || {};
      }
    } else {
      if (isAll) {
        const impShips = Object.values(SHIPS.Import || {}).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive').map(s => ({ ...s, dir: 'Import' }));
        const expShips = Object.values(SHIPS.Export || {}).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive').map(s => ({ ...s, dir: 'Export' }));
        ships = [...impShips, ...expShips];
        getRowForShip = (sh, ri) => (sh.dir === 'Export' ? ENTRY.Export?.[ri] : ENTRY.Import?.[ri]) || {};
      } else {
        ships = Object.values(SHIPS[dir] || {}).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive').map(s => ({ ...s, dir }));
        getRowForShip = (sh, ri) => ENTRY[dir]?.[ri] || {};
      }
    }
    const chosen = Array.isArray(defaults) ? new Set(defaults) : null;
    const clientList = [...new Set(ships.map(sh => cellVal(getRowForShip(sh, sh.rows[0]), 'client')).filter(Boolean))].sort((a, b) => a.localeCompare(b));
    return `<div class="xsec xsec-cols">
      <div class="xsec-head">
        <label class="xall"><input type="checkbox" class="${prefix}AllCols" checked> <b>${AR() ? 'الأعمدة' : 'Columns'}</b></label>
        <span class="xsec-count">${cols.length} ${AR() ? 'عمود' : 'columns'}</span>
      </div>
      <div class="xgrid">${cols.map(c => `<label><input type="checkbox" class="${prefix}Col" value="${esc(c.k)}" checked> <span>${esc(AR() ? (c.ar || c.h) : c.h)}</span></label>`).join('')}</div>
    </div>
    <div class="xsec xsec-ops">
      <div class="xsec-head">
        <b>${AR() ? 'الشحنات / العمليات' : 'Shipments / operations'}</b>
        <span class="xsec-count">${ships.length} ${AR() ? 'عملية' : 'operations'}</span>
      </div>
      <div class="pick-filters-wrap">
        <div class="pickhead pick-search-row">
          <label class="pick-select-all"><input type="checkbox" class="${prefix}AllOps" ${chosen ? '' : 'checked'}> <span>${AR() ? 'اختيار الكل' : 'Select all'}</span></label>
          <div class="pick-search-box">
            <span class="pick-search-icon">🔍</span>
            <input type="search" class="${prefix}OpSearch" placeholder="${AR() ? 'ابحث عن شحنة أو عميل أو رقم شهادة...' : 'Find an operation, client, MAWB, certificate...'}">
          </div>
        </div>
        <div class="pickhead pickcreated">
          <div class="pick-filter-item">
            <label for="${prefix}ClientFilter">${AR() ? 'تصفية بالعميل:' : 'Filter by Client:'}</label>
            <select class="${prefix}ClientFilter" id="${prefix}ClientFilter">
              <option value="">${AR() ? '-- كل العملاء --' : '-- All Clients --'}</option>
              ${clientList.map(cl => `<option value="${esc(cl)}">${esc(cl)}</option>`).join('')}
            </select>
          </div>
          <div class="pick-filter-item pick-date-range">
            <label for="${prefix}CFrom">${AR() ? 'تاريخ الإنشاء من:' : 'Operation created from:'}</label>
            <input type="date" id="${prefix}CFrom" class="${prefix}CFrom">
            <label for="${prefix}CTo">${AR() ? 'إلى:' : 'to:'}</label>
            <input type="date" id="${prefix}CTo" class="${prefix}CTo">
          </div>
        </div>
      </div>
      <div class="picklist">${ships.length ? ships.map((sh, i) => {
      const r = getRowForShip(sh, sh.rows[0]) || {}; const cl = cellVal(r, 'client');
      const mawbVal = cellVal(r, 'mawb') || (sh.dir === 'Import' ? cellVal(r, 'bl') : cellVal(r, 'booking'));
      const countInfo = (sh.rows.length > 1) ? ` (${sh.rows.length} ${AR() ? 'نقلات' : 'trips'})` : '';
      const dirBadge = isAll ? `<span class="op-pick-badge" style="background:${sh.dir === 'Import' ? '#e0f2fe;color:#0369a1' : '#fef3c7;color:#92400e'};margin-inline-end:6px;font-size:10px">${dirLabel(sh.dir)}</span>` : '';
      const label = `#${i + 1} · ${isAll ? dirLabel(sh.dir) + ' · ' : ''}${sh.ref}${mawbVal ? ' · ' + mawbVal : ''}${cl ? ' · ' + cl : ''}${sh.day ? ' · ' + fmtDay(sh.day) : ''}${countInfo}`;

      let subItems = '';
      if (sh.rows.length > 1) {
        subItems = `<div class="sub-pick-list">
          ${sh.rows.map((ri, rIdx) => {
          const row = getRowForShip(sh, ri) || {};
          const trk = row.cntr || row.car || row.driver || '';
          const pkgs = row.loadedPackages || row.packages || '';
          const subLbl = `${AR() ? 'نقلة' : 'Trip'} ${rIdx + 1}: ${row.shipNo ? `#${row.shipNo}` : ''} ${row.hawb || row.cert ? `· ${row.hawb || row.cert}` : ''} ${pkgs ? `· ${pkgs} ${AR() ? 'طرد' : 'pkgs'}` : ''} ${trk ? `· 🚚 ${trk}` : ''}`;
          return `<label class="sub-pick-item">
              <input type="checkbox" class="${prefix}SubRow" data-dir="${esc(sh.dir)}" data-ref="${esc(sh.ref)}" data-row="${ri}" value="${ri}" ${!chosen || chosen.has(sh.ref) ? 'checked' : ''}>
              <span>${esc(subLbl)}</span>
            </label>`;
        }).join('')}
        </div>`;
      } else {
        subItems = `<input type="checkbox" class="${prefix}SubRow" data-dir="${esc(sh.dir)}" data-ref="${esc(sh.ref)}" data-row="${sh.rows[0]}" value="${sh.rows[0]}" ${!chosen || chosen.has(sh.ref) ? 'checked' : ''} style="display:none">`;
      }

      return `<div class="op-pick-group" data-client="${esc(cl || '')}" data-created="${esc(sh.day || '')}">
        <label title="${esc(label)}" class="op-pick-label">
          <input type="checkbox" class="${prefix}Op" data-dir="${esc(sh.dir)}" data-ref="${esc(sh.ref)}" value="${esc(sh.ref)}" ${!chosen || chosen.has(sh.ref) ? 'checked' : ''}>
          <span class="op-pick-info">
            <span class="op-pick-badge">#${i + 1}</span>
            ${dirBadge}
            <span class="op-pick-ref">${esc(sh.ref)}</span>
            ${mawbVal ? `<span class="op-pick-mawb">· ${esc(mawbVal)}</span>` : ''}
            ${cl ? `<span class="op-pick-client">· ${esc(cl)}</span>` : ''}
            ${sh.day ? `<span class="op-pick-day">· ${esc(fmtDay(sh.day))}</span>` : ''}
            ${countInfo ? `<span class="op-pick-count">${esc(countInfo)}</span>` : ''}
          </span>
        </label>
        ${subItems}
      </div>`;
    }).join('') : `<div class="picklist-empty" style="padding:16px;text-align:center;color:#94a3b8;font-size:12px">${AR() ? 'لا توجد شحنات لعرضها' : 'No shipments to display'}</div>`}</div></div>`;
  }
  function composeClientShipmentSummary(dir, clientName, scope = 'active', allowedRowIndices = null) {
    if (!clientName) return '';
    const dirs = dir === 'ALL' ? ['Import', 'Export'] : [dir];
    const rows = [];
    dirs.forEach(d => {
      const store = isArchiveScope(scope) ? ARCHIVE_STORE[scope]?.[d] : null;
      const targetEntry = store ? store.entry : ENTRY[d];
      (targetEntry || []).forEach((r, i) => {
        if ((r.client || '').trim().toLowerCase() === clientName.trim().toLowerCase()) {
          if (!allowedRowIndices || allowedRowIndices.has(i)) {
            rows.push(r);
          }
        }
      });
    });
    if (!rows.length) return '';
    const totalPkgs = rows.reduce((s, r) => s + (parseInt(normalizeDigits(r.loadedPackages || r.packages || r.pkgs || '0'), 10) || 0), 0);
    const truckMap = new Map();
    rows.forEach(r => {
      const key = r.cntr || r.car || r.driver || 'truck';
      const label = r.driver ? `سيارة ${r.driver}${r.mob ? ` (${r.mob})` : ''}` : (r.cntr ? `سيارة لوحة (${r.cntr})` : (r.car ? `سيارة لوحة (${r.car})` : 'سيارة النقل'));
      const pkgs = parseInt(normalizeDigits(r.loadedPackages || r.packages || r.pkgs || '0'), 10) || 0;
      truckMap.set(key, { label, pkgs: (truckMap.get(key)?.pkgs || 0) + pkgs });
    });
    const truckList = Array.from(truckMap.values());
    if (truckList.length === 1) {
      return AR()
        ? `شحنتكم محملة بالكامل على ${truckList[0].label}${totalPkgs ? ` (${totalPkgs} طرد)` : ''}.`
        : `Your shipment is fully loaded on ${truckList[0].label}${totalPkgs ? ` (${totalPkgs} pkgs)` : ''}.`;
    }
    const sep = AR() ? ' و ' : ' and ';
    const breakdown = truckList.map(t => `${t.label}${t.pkgs ? ` (${t.pkgs} ${AR() ? 'طرد' : 'pkgs'})` : ''}`).join(sep);
    return AR()
      ? `شحنتكم ${totalPkgs ? `${totalPkgs} طرد ` : ''}محملة على ${truckList.length} سيارات: ${breakdown}.`
      : `Your shipment ${totalPkgs ? `(${totalPkgs} pkgs) ` : ''}is loaded on ${truckList.length} trucks: ${breakdown}.`;
  }

  function wireTripPicker(root, prefix) {
    root.querySelector(`.${prefix}AllCols`).onchange = e => root.querySelectorAll(`.${prefix}Col`).forEach(c => c.checked = e.target.checked);
    /* "Select all" and the search / created-date filters work together: hidden operations are never (un)selected by Select all */
    const visibleOps = () => [...root.querySelectorAll(`.${prefix}Op`)].filter(c => c.closest('.op-pick-group')?.style.display !== 'none');

    const updateMailNote = () => {
      if (prefix !== 'm') return;
      const clientRawName = root.querySelector(`.${prefix}ClientFilter`)?.value || '';
      if (!clientRawName) return;
      const checkedSubs = [...root.querySelectorAll(`.${prefix}SubRow:checked`)];
      const selectedIndices = new Set(checkedSubs.map(x => +x.dataset.row));
      const summary = composeClientShipmentSummary(root.dataset.dir || EDIR, clientRawName, root.dataset.scope || 'active', selectedIndices);
      if ($('mSubject')) {
        $('mSubject').value = AR()
          ? `بيان شحن وتوزيع البضاعة — ${clientRawName} — ILS Egypt`
          : `Shipment & Transport Report — ${clientRawName} — ILS Egypt`;
      }
      if ($('mNote') && summary) {
        $('mNote').value = AR()
          ? `مرحبًا فريق العمل لدى ${clientRawName}،\n\nنحيط سيادتكم علمًا ببيان وتفاصيل نقل شحنتكم من المطار:\n${summary}\n\nيرجى مراجعة الجدول المرفق أدناه للبيانات التفصيلية.\n\nمع التحية والتقدير،\nILS Egypt · فريق العمليات الجوية`
          : `Dear ${clientRawName} team,\n\nPlease find the transport breakdown of your shipment from airport:\n${summary}\n\nBest regards,\nILS Egypt · Air Operations`;
      }
    };

    const applyPick = () => {
      const q = (root.querySelector(`.${prefix}OpSearch`).value || '').toLocaleLowerCase();
      const cf = root.querySelector(`.${prefix}CFrom`)?.value || '';
      const ct = root.querySelector(`.${prefix}CTo`)?.value || '';
      const clFilter = (root.querySelector(`.${prefix}ClientFilter`)?.value || '').toLocaleLowerCase();
      root.querySelectorAll(`.${prefix}Op`).forEach(c => {
        const group = c.closest('.op-pick-group');
        const d = group?.dataset.created || '', opCl = (group?.dataset.client || '').toLocaleLowerCase();
        const matchesClient = !clFilter || opCl === clFilter;
        const matchesSearch = group?.textContent.toLocaleLowerCase().includes(q);
        const matchesDate = (!cf || (d && d >= cf)) && (!ct || (d && d <= ct));
        const show = matchesClient && matchesSearch && matchesDate;
        if (group) group.style.display = show ? '' : 'none';
        if (!show) {
          c.checked = false;
          root.querySelectorAll(`.${prefix}SubRow[data-ref="${c.dataset.ref}"]`).forEach(sub => { sub.checked = false; });
        }
        else if (clFilter) {
          c.checked = true;
          root.querySelectorAll(`.${prefix}SubRow[data-ref="${c.dataset.ref}"]`).forEach(sub => { sub.checked = true; });
        }
      });
      const vis = visibleOps();
      root.querySelector(`.${prefix}AllOps`).checked = vis.length > 0 && vis.every(c => c.checked);

      updateMailNote();
    };
    root.querySelector(`.${prefix}AllOps`).onchange = e => {
      visibleOps().forEach(c => {
        c.checked = e.target.checked;
        root.querySelectorAll(`.${prefix}SubRow[data-ref="${c.dataset.ref}"]`).forEach(sub => { sub.checked = e.target.checked; });
      });
      updateMailNote();
    };
    root.querySelector(`.${prefix}OpSearch`).oninput = applyPick;
    root.querySelectorAll(`.${prefix}CFrom,.${prefix}CTo`).forEach(el => el.onchange = applyPick);
    root.querySelector(`.${prefix}ClientFilter`)?.addEventListener('change', applyPick);
    root.querySelectorAll(`.${prefix}Col`).forEach(c => c.onchange = () => root.querySelector(`.${prefix}AllCols`).checked = [...root.querySelectorAll(`.${prefix}Col`)].every(x => x.checked));
    root.querySelectorAll(`.${prefix}Op`).forEach(c => c.onchange = (e) => {
      const ref = e.target.dataset.ref || e.target.value;
      root.querySelectorAll(`.${prefix}SubRow[data-ref="${ref}"]`).forEach(sub => { sub.checked = e.target.checked; });
      const vis = visibleOps();
      root.querySelector(`.${prefix}AllOps`).checked = vis.length > 0 && vis.every(x => x.checked);
      updateMailNote();
    });
    root.querySelectorAll(`.${prefix}SubRow`).forEach(sub => sub.onchange = (e) => {
      const ref = e.target.dataset.ref;
      const parentOp = root.querySelector(`.${prefix}Op[data-ref="${ref}"]`);
      if (parentOp) {
        const allSubs = [...root.querySelectorAll(`.${prefix}SubRow[data-ref="${ref}"]`)];
        const anyChecked = allSubs.some(x => x.checked);
        const allChecked = allSubs.every(x => x.checked);
        parentOp.checked = anyChecked;
        parentOp.indeterminate = anyChecked && !allChecked;
      }
      const vis = visibleOps();
      root.querySelector(`.${prefix}AllOps`).checked = vis.length > 0 && vis.every(x => x.checked);
      updateMailNote();
    });
  }
  function pickedTripOptions(root, prefix, dir) {
    const columns = [...root.querySelectorAll(`.${prefix}Col:checked`)].map(x => x.value);
    const checkedSubs = [...root.querySelectorAll(`.${prefix}SubRow:checked`)];
    const rowIndices = { Import: [], Export: [] };
    const operations = { Import: [], Export: [] };
    const dirsSet = new Set();

    checkedSubs.forEach(x => {
      const d = x.dataset.dir || (dir !== 'ALL' ? dir : 'Import');
      if (rowIndices[d]) {
        dirsSet.add(d);
        rowIndices[d].push(+x.dataset.row);
        if (x.dataset.ref) operations[d].push(x.dataset.ref);
      }
    });

    const opChecked = [...root.querySelectorAll(`.${prefix}Op:checked`)];
    opChecked.forEach(x => {
      const d = x.dataset.dir || (dir !== 'ALL' ? dir : 'Import');
      if (operations[d]) {
        dirsSet.add(d);
        operations[d].push(x.value);
      }
    });

    operations.Import = [...new Set(operations.Import)];
    operations.Export = [...new Set(operations.Export)];

    const hasAnyOps = operations.Import.length > 0 || operations.Export.length > 0;
    const hasAnyRows = rowIndices.Import.length > 0 || rowIndices.Export.length > 0;

    if (!columns.length || (!hasAnyOps && !hasAnyRows)) {
      throw new Error(AR() ? 'اختار عمودًا وشحنة واحدة على الأقل.' : 'Select at least one column and one shipment.');
    }

    const activeDirs = dir === 'ALL'
      ? ['Import', 'Export'].filter(d => operations[d].length > 0 || rowIndices[d].length > 0)
      : [dir];

    return {
      directions: activeDirs.length ? activeDirs : (dir === 'ALL' ? ['Import', 'Export'] : [dir]),
      columns: {
        Import: columns.filter(k => COLS.Import.some(c => c.k === k)),
        Export: columns.filter(k => COLS.Export.some(c => c.k === k)),
        [dir]: columns
      },
      operations: {
        ...operations,
        [dir]: dir !== 'ALL' ? operations[dir] : [...operations.Import, ...operations.Export]
      },
      rowIndices: {
        ...rowIndices,
        [dir]: dir !== 'ALL' ? rowIndices[dir] : [...rowIndices.Import, ...rowIndices.Export]
      }
    };
  }
  function tripExportDefaults(dir, scope = 'active') {
    if (isArchiveScope(scope)) {
      if (scope === 'activeExport' && dir !== 'ALL' && TRIP_SELECTED[dir]?.size) {
        return [...TRIP_SELECTED[dir]];
      }
      const store = ARCHIVE_STORE[scope];
      if (dir === 'ALL') {
        const impKeys = Object.keys(store?.Import?.ships || {});
        const expKeys = Object.keys(store?.Export?.ships || {});
        return [...impKeys, ...expKeys];
      }
      return Object.keys(store?.[dir]?.ships || {});
    }
    if (dir === 'ALL') {
      const selected = [...TRIP_SELECTED.Import, ...TRIP_SELECTED.Export];
      if (selected.length) return selected;
      return null;
    }
    if (TRIP_SELECTED[dir]?.size) return [...TRIP_SELECTED[dir]];
    if (TRIP_SEARCH[dir]?.some(r => r.v)) {
      return Object.values(SHIPS[dir] || {})
        .filter(s => s.status !== 'Delivered' && s.status !== 'Inactive')
        .filter(s => tripMatches(s, dir))
        .map(s => s.ref);
    }
    return null;
  }
  async function prepareActiveExportStore(dir) {
    if (!isServerPagedEntry()) return 'active';
    const targetDirs = dir === 'ALL' ? ['Import', 'Export'] : [dir];
    if (
      dir !== 'ALL' &&
      LOADED_DIRS.has(dir) &&
      (ENTRY_PAGING[dir]?.totalCount || 0) <= Object.keys(SHIPS[dir] || {}).length
    ) {
      return 'active';
    }
    const allOps = [];
    for (const d of targetDirs) {
      const q = (d === EDIR ? ENTRY_QUICK_SEARCH.trim() : '');
      const rules = d === EDIR ? getActiveEntryRules(d) : [];
      const sort = TRIP_SORT[d] || { key: '__tripNo', dir: 'asc' };
      let page = 1;
      let totalPages = 1;
      do {
        const res = await ILS.api.getPagedOperations({
          page,
          pageSize: 100,
          operationType: d,
          onlyActive: true,
          isDeleted: false,
          search: q || undefined,
          sortBy: sort.key || '__tripNo',
          sortDirection: sort.dir || 'asc',
          rulesJson: rules.length ? JSON.stringify(rules) : undefined,
        });
        if (Array.isArray(res?.items)) allOps.push(...res.items);
        totalPages = Math.max(1, res?.totalPages ?? 1);
        page++;
      } while (page <= totalPages);
    }
    hydrateStoreOperations('activeExport', allOps, 'Open');
    return 'activeExport';
  }
  async function openTripExport(scope, forceDir) {
    if (EDITING && !commitEdit()) return;
    const isDelivered = scope === 'delivered' || CURRENT_TAB === 'Delivered' || Boolean($('deliveredOpen')?.classList.contains('on'));
    const isInactive = scope === 'inactive' || CURRENT_TAB === 'Inactive' || Boolean($('inactiveOpen')?.classList.contains('on'));
    let effectiveScope = isDelivered ? 'delivered' : (isInactive ? 'inactive' : 'active');
    let dir = forceDir;
    if (!dir) {
      if (effectiveScope === 'delivered' || effectiveScope === 'inactive') {
        if (ARCHIVE_FILTER_DIR === 'Import') {
          dir = 'Import';
        } else if (ARCHIVE_FILTER_DIR === 'Export') {
          dir = 'Export';
        } else {
          dir = 'ALL';
        }
      } else {
        const activeTabEl = root.querySelector('.etab.on[data-dir]');
        dir = activeTabEl?.dataset.dir || (CURRENT_TAB === 'Export' || CURRENT_TAB === 'Import' ? CURRENT_TAB : (EDIR || 'Import'));
      }
    }
    if (effectiveScope === 'active' && isServerPagedEntry()) {
      try {
        effectiveScope = await prepareActiveExportStore(dir);
      } catch (err) {
        console.warn('[FTL] Failed to fetch all active operations for export, using current page:', err);
      }
    }
    const modalBody = $('tripExportBody');
    $('tripExportTitle').textContent = AR() ? 'تصدير Excel' : 'Export Excel';
    const subKind = effectiveScope === 'delivered' ? ` · ${AR() ? 'الشحنات المسلّمة' : 'Delivered'}` : (effectiveScope === 'inactive' ? ` · ${AR() ? 'غير النشطة' : 'Inactive'}` : '');
    const dirTitle = dir === 'ALL' ? (AR() ? 'كل الشحنات' : 'All Shipments') : dirLabel(dir);
    modalBody.dataset.dir = dir;
    modalBody.dataset.scope = effectiveScope;
    modalBody.innerHTML = `<div class="mkind">${dirTitle}${subKind} · Excel</div>${tripPickerHTML(dir, 'te', tripExportDefaults(dir, effectiveScope), effectiveScope)}`;
    $('tripExportGo').textContent = AR() ? 'تحميل Excel' : 'Download Excel';
    if ($('tripExportCancel')) $('tripExportCancel').textContent = AR() ? 'إلغاء' : 'Cancel';
    wireTripPicker(modalBody, 'te');
    modalBody.scrollTop = 0;
    $('tripExportModal').classList.add('open');
  }
  async function saveTripExport() {
    try {
      const modalBody = $('tripExportBody'), opts = pickedTripOptions(modalBody, 'te', modalBody.dataset.dir);
      opts.scope = modalBody.dataset.scope || 'active';
      $('tripExportGo').disabled = true; await downloadEntry(opts); closeM('tripExportModal');
    } catch (e) { toast(e.message); } finally { $('tripExportGo').disabled = false; }
  }

  /* ---------- system strip / save ---------- */
  let CHANGE_SEQ = 0, SAVE_IN_FLIGHT = false;
  function markDirty() { DIRTY = true; CHANGE_SEQ++; __emit('change', null); renderSysBar(); }
  let _saveT;
  function scheduleSave() {
    /* Autosave disabled — all edits are committed per-operation via Edit -> Save */
  }
  async function flushWorkspace() {
    /* Whole-workspace auto-flushing disabled */
  }
  function renderSysBar() {
    const E = t('entry');
    const time = SAVED_AT ? SAVED_AT.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : null;
    const el = $('sysSaved');
    if (el) {
      el.className = 'chipst' + (DIRTY ? ' dirty' : '');
      const live = typeof LIVE !== 'undefined' && LIVE;
      el.textContent = DIRTY ? E.saving : (time ? (live ? E.savedLive(time) : E.savedAt(time)) : (live ? E.live : E.draft));
    }
    const userEl = $('sysUser');
    if (userEl) userEl.textContent = E.byUser(AR() ? 'آي إل إس · الشحن الجوي' : OP_USER);
    const opsEl = $('sysOps');
    if (opsEl) {
      if (isServerPagedEntry()) {
        const pg = ENTRY_PAGING[EDIR] || { totalCount: 0, totalTrucks: 0 };
        const filteredTotal = pg.totalCount || 0;
        const totalTrucks = pg.totalTrucks || 0;
        const unfilteredTotal = activeOpCount(EDIR);
        if (ENTRY_QUICK_SEARCH.trim() || getActiveEntryRules(EDIR).length) {
          opsEl.textContent = AR()
            ? `${filteredTotal} من أصل ${unfilteredTotal} عمليات (${totalTrucks} نقلة)`
            : `${filteredTotal} of ${unfilteredTotal} operations (${totalTrucks} trips)`;
        } else {
          opsEl.textContent = E.opsCount(filteredTotal, totalTrucks);
        }
      } else {
        const activeShips = Object.values(SHIPS[EDIR] || {}).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive');
        const allOps = activeShips.length;
        const allTrips = activeShips.reduce((acc, sh) => acc + (sh.rows?.length || 0), 0);
        if (ENTRY_QUICK_SEARCH.trim()) {
          const visibleOps = sortedTripShips(EDIR).filter(sh => sh.status !== 'Delivered' && sh.status !== 'Inactive').length;
          opsEl.textContent = AR()
            ? `${visibleOps} من أصل ${allOps} عمليات (${allTrips} نقلة)`
            : `${visibleOps} of ${allOps} operations (${allTrips} trips)`;
        } else {
          opsEl.textContent = E.opsCount(allOps, allTrips);
        }
      }
    }
    const qInp = $('entryQuickSearch');
    if (qInp) {
      qInp.placeholder = AR()
        ? 'بحث شامل بالشحنة، البوليصة MAWB/HAWB، العميل، الناقل، رقم السيارة، السائق... (Ctrl + K)'
        : 'Search by Shipment #, MAWB, HAWB, Client, Transporter, Truck Plate, Driver... (Ctrl + K)';
      if (qInp.value !== ENTRY_QUICK_SEARCH) {
        qInp.value = ENTRY_QUICK_SEARCH;
      }
      const qClr = $('entryQuickSearchClear');
      if (qClr) {
        qClr.style.display = ENTRY_QUICK_SEARCH ? 'inline-flex' : 'none';
      }
    }
  }
  function exportPayload() {
    const pack = d => ({
      columns: COLS[d].map(c => c.h), rows: filledRows(d).map(r => COLS[d].map(c => String(r[c.k] ?? ''))),
      shipments: Object.values(SHIPS[d]).map(s => ({ ref: s.ref, rows: s.rows, per: s.per || 1, shp: (s.shpSpans || []).length || 1, trk: truckCount(s), shpSpans: s.shpSpans || [], trkSpans: s.trkSpans || [], trkOf: s.trkOf || [], unmerged: [...s.unmerged], at: s.at, day: s.day, user: s.user, status: s.status || 'Open' })),
      updates: Object.fromEntries(Object.entries(ROWMETA[d]).map(([i, m]) => [i, m.updates]))
    });
    return { Import: pack('Import'), Export: pack('Export') };
  }
  function sanitizeTripFields(dir, row) {
    if (!row) return {};
    const fields = {};
    if (COLS[dir]) {
      COLS[dir].forEach(c => {
        if (c.k && c.k !== 'updates') {
          let v = row[c.k];
          if (c.k === 'missDoc') v = cleanDocValue(v);
          else if ((c.k === 'car' || c.k === 'cntr') && v) v = String(v).trim().toUpperCase();
          else if (c.k === 'driver' && v) v = titleCase(String(v).trim());
          else if (c.k === 'mob' && v) v = String(v).replace(/\s+/g, ' ').trim();
          else if (c.k === 'client' && v) v = normClient(v) || String(v).trim();
          else if (c.k === 'line' && v) v = normLine(v) || String(v).trim();
          else if (['dest', 'aod', 'pod', 'pol', 'pow'].includes(c.k) && v) v = normSite(v) || String(v).trim();
          else if (c.k === 'fullAddress' && v) v = String(v).trim();
          else if (c.k === 'trucker' && v) v = normTrucker(v) || String(v).trim();
          fields[c.k] = (v === null || v === undefined) ? '' : String(v);
        }
      });
      if (fields.cntr && !fields.car) fields.car = fields.cntr;
      if (fields.car && !fields.cntr) fields.cntr = fields.car;
    }
    const skip = new Set(['assignedShp', '_allocations', '_file', '_sheet', '_row', '_uploadGroup', '_ref', '_updates', 'updates']);
    for (const [k, v] of Object.entries(row)) {
      if (skip.has(k) || k.startsWith('_')) continue;
      if (fields[k] === undefined && v !== null && v !== undefined && typeof v !== 'object' && typeof v !== 'function') {
        fields[k] = String(v);
      }
    }
    if (row.updates !== undefined && row.updates !== null) fields.updates = String(row.updates);
    if (row.updDate !== undefined && row.updDate !== null) fields.updDate = String(row.updDate);
    return fields;
  }
  function getShipmentAllocationsMap(dir, ref) {
    const sh = SHIPS[dir]?.[ref];
    if (!sh || !sh.rows) return {};
    const map = {};
    sh.rows.forEach((rIdx, ord) => {
      const r = ENTRY[dir][rIdx];
      if (r) {
        const allocs = Array.isArray(r._allocations) ? r._allocations : [];
        const assigned = (r.assignedShp !== undefined && r.assignedShp !== null && r.assignedShp !== '')
          ? parseInt(r.assignedShp, 10)
          : null;
        if (allocs.length > 0 || assigned !== null) {
          map[ord] = {
            assignedShp: assigned,
            allocations: allocs.map(a => ({ shpIdx: parseInt(a.shpIdx, 10), pkgs: parseInt(normalizeDigits(String(a.pkgs || '0')), 10) || 0 }))
          };
        }
      }
    });
    return map;
  }
  function saveShipmentAllocationsDraft(arg1, arg2) {
    const dir = (arg1 === 'Import' || arg1 === 'Export') ? arg1 : ((arg2 === 'Import' || arg2 === 'Export') ? arg2 : EDIR);
    const ref = (arg1 !== 'Import' && arg1 !== 'Export') ? arg1 : arg2;
    if (!ref) return;
    try {
      const map = getShipmentAllocationsMap(dir, ref);
      localStorage.setItem(`ftl_allocations_${ref}`, JSON.stringify(map));
    } catch (e) { }
  }
  function serializeSingleShipment(dir, ref) {
    const sh = SHIPS[dir]?.[ref];
    if (!sh) return null;
    const truckAllocations = getShipmentAllocationsMap(dir, ref);
    return {
      ref: sh.ref,
      direction: dir,
      status: sh.status,
      per: sh.per || 1,
      shp: (sh.shpSpans || []).length || 1,
      trk: truckCount(sh),
      shpSpans: sh.shpSpans || [],
      trkSpans: sh.trkSpans || [],
      trkOf: sh.trkOf || [],
      allocations: truckAllocations,
      day: sh.day || '',
      at: sh.at || '',
      enteredBy: { id: OP_USER_ID || 'local', displayName: sh.user || OP_USER },
      unmerged: [...sh.unmerged],
      trips: sh.rows.map((i, ordinal) => ({
        id: ROWMETA[dir][i]?.id,
        ordinal,
        fields: sanitizeTripFields(dir, ENTRY[dir][i]),
        updates: (ROWMETA[dir][i]?.updates || []).map(u => ({
          id: u.id || '',
          text: u.text || u.note || '',
          note: u.text || u.note || '',
          at: u.at || '',
          by: u.user || u.by || '',
          user: u.user || u.by || '',
          day: u.day || ''
        }))
      }))
    };
  }
  function workspaceShipments() {
    return ['Import', 'Export'].flatMap(direction => Object.values(SHIPS[direction]).map(sh => ({
      ref: sh.ref, direction, status: sh.status, per: sh.per || 1, shp: (sh.shpSpans || []).length || 1, trk: truckCount(sh), shpSpans: sh.shpSpans || [], trkSpans: sh.trkSpans || [], trkOf: sh.trkOf || [], allocations: getShipmentAllocationsMap(direction, sh.ref), day: sh.day || '', at: sh.at || '',
      enteredBy: { id: OP_USER_ID || 'local', displayName: sh.user || OP_USER },
      unmerged: [...sh.unmerged],
      trips: sh.rows.map((i, ordinal) => ({
        id: ROWMETA[direction][i]?.id, ordinal, fields: sanitizeTripFields(direction, ENTRY[direction][i]),
        updates: (ROWMETA[direction][i]?.updates || []).map(u => ({
          id: u.id || '',
          text: u.text || u.note || '',
          note: u.text || u.note || '',
          at: u.at || '',
          by: u.user || u.by || '',
          user: u.user || u.by || '',
          day: u.day || ''
        }))
      }))
    })));
  }

  /* ---------- validation summary used by apply ---------- */
  function validateGrid(dir) { return { errs: {}, warns: {} }; }

  /* ---------- apply to dashboard ---------- */
  function entryToTrips(dir, rep) {
    const out = [], seen = new Map(), dup = [], missing = {};
    const NORM = { client: normClient, dest: normSite, pod: normSite, pol: normSite, pow: normSite, line: normLine, trucker: normTrucker, oper: titleCase, driver: titleCase, size: normSize };
    ENTRY[dir].forEach((r, i) => {
      const row = i + 1, cntr = cellVal(r, 'cntr');
      const key = cntr ? cntr.toUpperCase() : null;
      // Repeated per-trip values are valid; keep every trip.
      const m = ROWMETA[dir][i] || {};
      const o = { dir, status: rowShip(dir, i)?.status || 'Open', cntr: cntr || `(${m.ref || 'row'} #${row})`, _file: t('entry').source, _sheet: dir, _row: row, _ref: m.ref || null, _by: m.user || null, _updates: m.updates || [], created: m.day || null, createdAt: m.at || null };
      COLS[dir].forEach(c => {
        if (c.t === 'upd') { o[c.k] = (m.updates || []).map(u => `${fmtDay(u.day)} ${u.at} ${u.user}: ${u.text}`); return; }
        const raw = cellVal(r, c.k);
        if (!raw) { if (!c.auto && !c.opt && (c.op || c.k === 'cntr')) missing[c.h] = (missing[c.h] || 0) + 1; o[c.k] = null; return; }
        if (c.t === 'date') { const p = fixDate(raw, false) || fixDate(raw, true); o[c.k] = p || null; return; }
        o[c.k] = NORM[c.k] ? NORM[c.k](raw) : raw;
      });
      out.push(o);
    });
    if (out.length) {
      rep.push({
        file: t('entry').source, sheet: dir, dir, rows: out.length, skipped: 0, notData: false,
        errors: dup.length ? [{ k: 'dupCntr', p: { n: dup.length, list: fmtRows(dup, 4) } }] : [],
        warnings: Object.keys(missing).length ? [{ k: 'missingVals', p: { list: Object.entries(missing).map(([c, n]) => `<code>${c}</code> (${n})`).join('، ') } }] : [],
        infos: [{ k: 'sheetLoaded', p: { dir: dirLabel(dir), sheet: dir, n: out.length } }]
      });
    }
    return out;
  }
  function applyEntry() {
    if (EDITING && !commitEdit()) return;
    if (!entryIdentityValid()) return;
    const rep = [];
    const rows = [...entryToTrips('Import', rep), ...entryToTrips('Export', rep)];
    if (!rows.length) return;
    DATA = enrich(rows);
    RAW = ['Import', 'Export'].filter(d => filledRows(d).length).map(d => ({
      sheet: d, file: t('entry').source,
      headers: COLS[d].map(c => AR() ? (c.ar || c.h) : c.h), rows: filledRows(d).map(r => COLS[d].map(c => String(r[c.k] ?? '')))
    }));
    QREPORT = rep;
    initFilters(); if (DATA.some(r => r.dir === EDIR)) $('fDir').value = EDIR; showEntry(false); showDash(true); resetFilters(); buildFields(); updateTag();
    const issues = rep.reduce((s, r) => s + r.errors.length + r.warnings.length, 0);
    if (issues) openQuality(); else toast(t('entry').applied(fmtN(rows.length)));
  }
  /* seed the table from an uploaded file: one shipment per (operation ref / B/L-booking) group */
  function seedEntryFromData(source = DATA, append = false) {
    ['Import', 'Export'].forEach(d => {
      if (!append) { TRIP_SELECTED[d].clear(); ENTRY[d] = []; ROWMETA[d] = {}; SHIPS[d] = {}; }
      const groups = new Map();
      source.filter(r => r.dir === d).forEach(r => { const key = r._uploadGroup || r.shipKey || ('#' + r.cntr); if (!groups.has(key)) groups.set(key, []); groups.get(key).push(r); });
      groups.forEach(list => {
        const ref = opRefFor(OPSEQ++), idxs = [];
        const day = list[0].created || today(), at = list[0].createdAt || nowHM();
        const vol = String(Math.max(1, parseInt(normalizeDigits(list[0].vol ?? ''), 10) || 1));
        list.forEach(r => {
          const o = {}; COLS[d].forEach(c => { const v = r[c.k]; o[c.k] = v == null ? '' : String(v); }); o.vol = vol; o.status = r.status === 'Delivered' ? 'Delivered' : 'Open';
          const idx = ENTRY[d].length; ROWMETA[d][idx] = { ref, user: r.oper || OP_USER, at, day, updates: (r._updates || []).map(u => ({ ...u })) }; ENTRY[d].push(o); idxs.push(idx);
        });
        SHIPS[d][ref] = { ref, dir: d, rows: idxs, per: 1, unmerged: new Set(), at, day, user: list[0].oper || OP_USER, status: list[0].status === 'Delivered' ? 'Delivered' : 'Open', uploadGroup: list[0]._uploadGroup };
        layoutShip(d, SHIPS[d][ref]);
        /* shipment cells that are merged in the file share one value: fill blanks inside each merged cell from its filled row */
        COLS[d].filter(c => colLevel(c) === 'shp' || (c.k === 'trucker' && !SHIPS[d][ref].unmerged.has('trucker'))).forEach(c => {
          const spans = c.k === 'trucker' ? [[0, idxs.length]] : SHIPS[d][ref].shpSpans;
          spans.forEach(([a, l]) => { const blk = idxs.slice(a, a + l); const keep = blk.map(i => String(ENTRY[d][i][c.k] ?? '').trim()).find(Boolean); if (keep) blk.forEach(i => { if (!String(ENTRY[d][i][c.k] ?? '').trim()) ENTRY[d][i][c.k] = keep; }); });
        });
        idxs.forEach(i => ENTRY[d][i].status = SHIPS[d][ref].status);
      });
    });
  }
  let VIEW_MODE = 'entry';
  function headerFor(view) {
    const has = DATA.length > 0;
    const show = {
      uploadBtn: view === 'dash', qualityBtn: view === 'dash' && has, entryBtn: view === 'dash' && has, dashBtn: view === 'entry' && has,
      clearBtn: true,
      exportBtn: view === 'dash' && has, panelToggle: view === 'dash' && has
    };
    Object.entries(show).forEach(([id, v]) => { const el = $(id); if (el) el.style.display = v ? '' : 'none'; });
    if (view !== 'dash' && $('fieldsPanel')) $('fieldsPanel').style.display = 'none';
  }
  function showEntry(on) {
    $('entryView').style.display = on ? '' : 'none';
    if (on) { if (VIEW_MODE === 'dash' && MODE() !== 'FCL') EDIR = MODE(); $('dash').style.display = 'none'; VIEW_MODE = 'entry'; renderEntry(); }
    headerFor(VIEW_MODE);
  }
  async function switchEntryDir(d) {
    if (EDITING && !commitEdit()) return;
    CURRENT_TAB = d;
    EDIR = d;
    CURSOR = { r: -1, k: null };
    EDITING = null;
    const wrap = $('entryGridWrap');
    if (wrap) wrap.style.display = '';
    const slot = $('entryArchiveSlot');
    if (slot) slot.style.display = 'none';
    const opForm = $('opForm');
    if (opForm) opForm.style.display = '';
    const opWrap = root.querySelector('.opwrap');
    if (opWrap) opWrap.style.display = '';
    $('deliveredOpen')?.classList.remove('on');
    $('inactiveOpen')?.classList.remove('on');

    if (LIVE && !LOADED_DIRS.has(d)) {
      if (isServerPagedEntry()) {
        await loadEntryPage(d);
      } else if (ILS.api?.load) {
        try {
          const payload = await ILS.api.load(d);
          if (payload && Array.isArray(payload.shipments)) {
            hydrateWorkspace(payload, d);
            LOADED_DIRS.add(d);
          }
        } catch (err) {
          console.error('Failed to lazy load ' + d + ' operations:', err);
        }
      }
    }

    renderEntry();
    __emit('tabChange', d);
  }

  function hydrateStoreOperations(key, ops, targetStatus) {
    ARCHIVE_STORE[key] = {
      Import: { ships: {}, entry: [], rowmeta: {} },
      Export: { ships: {}, entry: [], rowmeta: {} }
    };
    if (!Array.isArray(ops) || !ops.length) return;
    for (const sh of ops) {
      const d = sh.direction || 'Import';
      if (!COLS[d] || !sh.ref) continue;
      const store = ARCHIVE_STORE[key][d];
      const idxs = [];
      const trips = Array.isArray(sh.trips) && sh.trips.length ? sh.trips : [{ id: 'tr-' + sh.ref, fields: {} }];
      for (const tr of trips) {
        const row = {};
        COLS[d].forEach(c => {
          let val = tr.fields?.[c.k];
          if (c.k === 'vol' && (val === undefined || val === null || val === '')) {
            val = sh.shp || sh.per || sh.totalShipments || (sh.shpSpans ? sh.shpSpans.length : 1);
          }
          if (c.k === 'mawb' && (val === undefined || val === null || val === '')) {
            val = tr.fields?.mawb || tr.fields?.bl || tr.fields?.booking || '';
          }
          if (c.k === 'cntr' && (val === undefined || val === null || val === '')) {
            val = tr.fields?.cntr || tr.fields?.car || '';
          }
          row[c.k] = c.k === 'missDoc' ? cleanDocValue(val) : String(val ?? '');
        });
        row.status = targetStatus;
        const idx = store.entry.length;
        store.entry.push(row);
        idxs.push(idx);

        const parsedUpdates = (tr.updates || []).map(u => ({
          id: u.id || '',
          text: u.text || u.note || '',
          day: u.day || (u.at && u.at.length >= 10 ? u.at.slice(0, 10) : sh.day || ''),
          at: (u.at && u.at.length > 10 ? u.at.slice(11, 16) : u.at) || '',
          user: u.user || u.by || '',
          by: u.by || u.user || ''
        }));
        if (parsedUpdates.length > 0) {
          const lastU = parsedUpdates[parsedUpdates.length - 1];
          if (!row.updDate) row.updDate = `${fmtDay(lastU.day)} ${lastU.at}`.trim();
          if (!row.updates) row.updates = lastU.text;
        }

        store.rowmeta[idx] = {
          id: tr.id || ('tr-' + idx),
          ref: sh.ref,
          user: sh.enteredBy?.displayName || sh.enteredBy || '',
          day: sh.day || '',
          at: sh.at || '',
          updates: parsedUpdates
        };
      }
      const shipObj = {
        ref: sh.ref,
        dir: d,
        rows: idxs,
        per: Math.max(1, Number(sh.per) || 1),
        unmerged: new Set((sh.unmerged || []).filter(k => canToggleMerge(d, COLS[d].find(c => c.k === k)))),
        at: sh.at || '',
        day: sh.day || '',
        user: sh.enteredBy?.displayName || sh.enteredBy || '',
        status: targetStatus,
        shpSpans: sh.shpSpans || [],
        trkSpans: sh.trkSpans || [],
        trkOf: sh.trkOf || [],
        shp: sh.shp,
        trk: sh.trk
      };
      layoutShip(d, shipObj, {
        shpSpans: sh.shpSpans,
        trkSpans: sh.trkSpans,
        trkOf: sh.trkOf,
        shp: sh.shp,
        trk: sh.trk
      });
      store.ships[sh.ref] = shipObj;
    }
  }

  function setArchiveOperations(tab, ops, directionFilter = '', totalCount = null) {
    ARCHIVE_FILTER_DIR = directionFilter || '';
    const key = tab === 'Delivered' ? 'delivered' : (tab === 'Inactive' ? 'inactive' : null);
    if (!key) return;

    const effectiveCount = totalCount != null ? totalCount : (Array.isArray(ops) ? ops.length : null);
    if (effectiveCount != null) {
      LAST_COUNTS = LAST_COUNTS || {};
      if (tab === 'Delivered') LAST_COUNTS.deliveredCount = effectiveCount;
      if (tab === 'Inactive') LAST_COUNTS.inactiveCount = effectiveCount;
      const dCnt = root.querySelector('#deliveredOpenCnt') || $('deliveredOpenCnt');
      if (dCnt && LAST_COUNTS.deliveredCount != null) dCnt.textContent = fmtN(LAST_COUNTS.deliveredCount);
      const iCnt = root.querySelector('#inactiveOpenCnt') || $('inactiveOpenCnt');
      if (iCnt && LAST_COUNTS.inactiveCount != null) iCnt.textContent = fmtN(LAST_COUNTS.inactiveCount);
    }
    const targetStatus = tab === 'Delivered' ? 'Delivered' : 'Inactive';
    hydrateStoreOperations(key, ops, targetStatus);
  }

  function setTab(tab) {
    CURRENT_TAB = tab;
    if ($('entryView')?.style.display === 'none') {
      showEntry(true);
    }
    const wrap = $('entryGridWrap');
    const slot = $('entryArchiveSlot');
    const opForm = $('opForm');
    const opWrap = root.querySelector('.opwrap');
    if (tab === 'Import' || tab === 'Export') {
      if (wrap) wrap.style.display = '';
      if (slot) slot.style.display = 'none';
      if (opForm) opForm.style.display = '';
      if (opWrap) opWrap.style.display = '';
      if (EDIR !== tab) {
        if (EDITING && !commitEdit()) return;
        EDIR = tab;
        CURSOR = { r: -1, k: null };
        EDITING = null;
        if (isServerPagedEntry() && !LOADED_DIRS.has(tab)) {
          loadEntryPage(tab);
        } else {
          renderEntry();
        }
      }
      root.querySelectorAll('.etab[data-dir]').forEach(b => b.classList.toggle('on', b.dataset.dir === tab));
      $('deliveredOpen')?.classList.remove('on');
      $('inactiveOpen')?.classList.remove('on');
    } else if (tab === 'Delivered') {
      if (wrap) wrap.style.display = 'none';
      if (slot) slot.style.display = '';
      if (opForm) opForm.style.display = 'none';
      if (opWrap) opWrap.style.display = 'none';
      root.querySelectorAll('.etab[data-dir]').forEach(b => b.classList.remove('on'));
      $('deliveredOpen')?.classList.add('on');
      $('inactiveOpen')?.classList.remove('on');
    } else if (tab === 'Inactive') {
      if (wrap) wrap.style.display = 'none';
      if (slot) slot.style.display = '';
      if (opForm) opForm.style.display = 'none';
      if (opWrap) opWrap.style.display = 'none';
      root.querySelectorAll('.etab[data-dir]').forEach(b => b.classList.remove('on'));
      $('deliveredOpen')?.classList.remove('on');
      $('inactiveOpen')?.classList.add('on');
    }
  }

  function setCounts(c) {
    if (!c) return;
    LAST_COUNTS = { ...c };
    const W = t('workflow');
    const dLbl = $('deliveredOpenLbl');
    if (dLbl) dLbl.textContent = AR() ? 'الشحنات المسلّمة' : (W.deliveredShipments || 'Delivered shipments');
    const dCnt = root.querySelector('#deliveredOpenCnt') || $('deliveredOpenCnt');
    if (dCnt && c.deliveredCount != null) dCnt.textContent = fmtN(c.deliveredCount);

    const iLbl = $('inactiveOpenLbl');
    if (iLbl) iLbl.textContent = AR() ? 'غير النشطة' : (W.inactiveShipments || 'Inactive');
    const iCnt = root.querySelector('#inactiveOpenCnt') || $('inactiveOpenCnt');
    if (iCnt && c.inactiveCount != null) iCnt.textContent = fmtN(c.inactiveCount);

    const imp = root.querySelector('.etab[data-dir="Import"] .cnt');
    if (imp) imp.textContent = fmtN(activeOpCount('Import'));

    const exp = root.querySelector('.etab[data-dir="Export"] .cnt');
    if (exp) exp.textContent = fmtN(activeOpCount('Export'));
  }
  function clearEntry() { if (!confirm(t('entry').confirmClear)) return; ENTRY[EDIR] = []; ROWMETA[EDIR] = {}; SHIPS[EDIR] = {}; TRIP_SELECTED[EDIR].clear(); CURSOR = { r: -1, k: null }; renderEntry(); }
  root.querySelectorAll('.etab[data-dir]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.dir) switchEntryDir(b.dataset.dir);
  }));

  /* ============================ 7. panels ============================ */
  /* The Fields panel is generated from COLS — i.e. from the sheet itself — so every
     column of IMPORT and of EXPORT is present, plus the measures the dashboard derives.
     Import tab shows the IMPORT columns · Export tab the EXPORT columns ·
     Overview shows both, in two labelled sections.                                   */
  const FIELD_TYPE = { date: 'date', time: 'txt', size: 'txt', list: 'txt', text: 'txt' };
  const MEASURES = {
    Import: [['freeDays', 'Free time left (days)', 'أيام السماح المتبقية'], ['risk', 'Demurrage risk', 'خطر الأرضيات'], ['offDelayH', 'Arrival delay (hours)', 'تأخير الوصول (ساعات)'], ['arrOnTime', 'Arrived on time', 'الوصول في الميعاد'], ['gateToArrH', 'Gate → site transit (hours)', 'من البوابة للموقع (ساعات)']],
    Export: [['cutDays', 'Cut-off buffer (days)', 'المهلة قبل الـ CUT OFF'], ['offDelayH', 'Arrival delay (hours)', 'تأخير الوصول (ساعات)'], ['arrOnTime', 'Arrived on time', 'الوصول في الميعاد'], ['gateToArrH', 'Gate → site transit (hours)', 'من البوابة للموقع (ساعات)']],
    Both: [['dir', 'Direction', 'الاتجاه']]
  };
  const NUMERIC_KEYS = new Set(['vol']);
  function fieldsFor(dir) {
    const out = COLS[dir].map(c => [c.k, NUMERIC_KEYS.has(c.k) ? 'num' : (FIELD_TYPE[c.t] || 'txt'), c.h, (c.ar || c.h)]);
    MEASURES[dir].forEach(([k, en, ar]) => out.push([k, 'fx', en, ar]));
    return out;
  }
  function fieldGroups() {
    const m = MODE();
    if (m === 'Import') return [[t('groups').ImportCols, fieldsFor('Import')]];
    if (m === 'Export') return [[t('groups').ExportCols, fieldsFor('Export')]];
    return [[t('groups').Both, MEASURES.Both.map(([k, en, ar]) => [k, 'fx', en, ar])],
    [t('groups').ImportCols, fieldsFor('Import')],
    [t('groups').ExportCols, fieldsFor('Export')]];
  }
  function buildFields() {
    const box = $('fieldGroups'); box.innerHTML = '';
    const rowsFor = k => {
      const m = MODE();
      if (m === 'Overview') return VIEW;                       // both directions in view
      return VIEW;                                            // already filtered by tab
    };
    fieldGroups().forEach(([title, list]) => {
      const div = document.createElement('div'); div.className = 'fgroup';
      div.innerHTML = `<div class="g-title"><span class="tri">▼</span>${title}<span class="g-count">${list.length}</span></div>`;
      div.querySelector('.g-title').onclick = () => div.classList.toggle('collapsed');
      list.forEach(([key, type, en, ar]) => {
        const label = AR() ? ar : en;
        const base = rowsFor(key); const src = base || [];
        const filled = src.filter(r => r[key] !== null && r[key] !== undefined && r[key] !== '' && r[key] !== 0).length;
        const pct = src.length ? Math.round(100 * filled / src.length) : 0;
        const f = document.createElement('div'); f.className = 'field'; f.dataset.label = (en + ' ' + ar).toLowerCase();
        f.innerHTML = `<span class="ficon ${type}">${type === 'date' ? '📅' : type === 'num' ? '#' : type === 'fx' ? 'fx' : 'A'}</span><span>${label}</span><span class="fill">${pct}%</span>`;
        f.onclick = e => showFieldPop(e, key, type, label, pct); div.appendChild(f);
      });
      box.appendChild(div);
    });
    $('fieldsMeta').textContent = t('fieldsMeta')(VIEW.length);
  }
  function showFieldPop(e, key, type, label, pct) {
    const pop = $('fpop'); const vals = VIEW.map(r => r[key]).filter(v => v !== null && v !== undefined && v !== ''); let body = '';
    if (type === 'num' || (type === 'fx' && typeof vals[0] === 'number')) {
      const nums = vals.filter(v => typeof v === 'number');
      if (nums.length) { body = `<div class="row"><span>${t('fMin')}</span><span>${fmtN(Math.min(...nums))}</span></div><div class="row"><span>${t('fAvg')}</span><span>${(+avg(nums).toFixed(1)).toLocaleString('en-US')}</span></div><div class="row"><span>${t('fMax')}</span><span>${fmtN(Math.max(...nums))}</span></div><div class="row"><span>${t('fTotal')}</span><span>${fmtM(nums.reduce((a, b) => a + b, 0))}</span></div>`; }
    }
    else if (type === 'date') { const s = [...vals].sort(); body = `<div class="row"><span>${t('fEarliest')}</span><span>${fmtDay(s[0]) || '–'}</span></div><div class="row"><span>${t('fLatest')}</span><span>${fmtDay(s[s.length - 1]) || '–'}</span></div>`; }
    else { const c = {}; vals.forEach(v => c[v] = (c[v] || 0) + 1); body = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([v, n]) => `<div class="row"><span title="${v}">${String(v).slice(0, 22)}</span><span>${n}</span></div>`).join(''); }
    pop.innerHTML = `<h4>${label}</h4><div class="meta">${pct}% ${t('fillPct')} · ${new Set(vals.map(String)).size} ${t('distinct')}</div>${body}`;
    pop.style.display = 'block'; const r = e.currentTarget.getBoundingClientRect();
    pop.style.top = Math.min(r.top, innerHeight - 260) + 'px'; pop.style.left = (root.dir === 'rtl' ? r.right + 12 : r.left - 262) + 'px';
  }
  __on(document, 'click', e => { if (!e.target.closest('.field') && !e.target.closest('.fpop')) $('fpop').style.display = 'none'; });
  $('fieldSearch').addEventListener('input', e => { const q = e.target.value.toLowerCase(); root.querySelectorAll('.field').forEach(f => f.style.display = f.dataset.label.includes(q) ? '' : 'none'); });
  function togglePanel() { $('fieldsPanel').classList.toggle('closed'); }

  /* help */
  function openHelp() { $('hTitleTxt').textContent = t('hTitle'); $('helpSearch').placeholder = t('hSearch'); $('helpSearch').value = ''; renderHelp(''); $('hModal').classList.add('open'); }
  function renderHelp(q) {
    const box = $('hBody'); box.innerHTML = '';
    HELP.forEach(([grp, items]) => {
      const rows = items.filter(([en, ed, ar, ad]) => !q || (en + ed + ar + ad).toLowerCase().includes(q)); if (!rows.length) return;
      const g = document.createElement('div'); g.className = 'hgrp'; g.innerHTML = `<b>${t('groups')[grp] || grp}</b>`;
      rows.forEach(([en, ed, ar, ad]) => { const r = document.createElement('div'); r.className = 'hrow'; r.innerHTML = AR() ? `<b>${ar}</b><span>${ad}</span>` : `<b>${en}</b><span>${ed}</span>`; g.appendChild(r); });
      box.appendChild(g);
    });
    if (!box.children.length) box.innerHTML = `<p style="color:var(--steel);padding:12px 2px">${t('noMatch')}</p>`;
  }
  $('helpSearch').addEventListener('input', e => renderHelp(e.target.value.trim().toLowerCase()));

  /* raw data — excel-like tabs per client sheet */
  let rawTab = 0;
  function openRaw() { $('rTitleTxt').textContent = t('rTitle'); $('rSearch').placeholder = t('rSearch'); $('rSearch').value = ''; rawTab = Math.min(rawTab, RAW.length - 1); renderRaw(); $('rModal').classList.add('open'); }
  function renderRaw() {
    const ORDER = { IMPORT: 0, EXPORT: 1 };
    const scoped = RAW.filter(s => (s.dir || detectDirection(s.sheet)) === MODE());
    scoped.sort((a, b) => (ORDER[a.sheet.toUpperCase()] ?? 9) - (ORDER[b.sheet.toUpperCase()] ?? 9));
    rawTab = Math.min(rawTab, Math.max(0, scoped.length - 1));
    $('xtabs').innerHTML = scoped.map((s, i) => `<button class="xtab ${i === rawTab ? 'on' : ''}" onclick="__FTL__.setRawTab(${i});__FTL__.renderRaw()">${s.sheet} <span style="opacity:.6;font-weight:500">(${s.rows.length})</span></button>`).join('');
    const s = scoped[rawTab]; if (!s) { $('rTable').innerHTML = ''; $('rMeta').textContent = ''; return; }
    const q = $('rSearch').value.trim().toLowerCase();
    let rows = s.rows.map((r, i) => [i + 2, ...r]); if (q) rows = rows.filter(r => r.some(v => String(v).toLowerCase().includes(q)));
    const shown = rows.slice(0, 500);
    $('rTable').innerHTML = `<thead><tr><th>#</th>${s.headers.map(h => `<th>${h || ''}</th>`).join('')}</tr></thead><tbody>${shown.map(r => `<tr>${r.map(v => `<td>${String(v).replace(/</g, '&lt;')}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $('rMeta').textContent = t('rMeta')(fmtN(shown.length), fmtN(rows.length), s.headers.length) + (rows.length > 500 ? ' ' + t('rCap') : '');
  }
  $('rSearch').addEventListener('input', renderRaw);

  /* quality */
  /* which of the new columns are still empty, and what each one unlocks when filled */
  const UNLOCKS = [
    ['arrDate', 'Actual Arrive Date', 'unlockOff'],
    ['gateOut', 'Gate out Date', 'unlockArr'],
    ['checkout', 'CHECK Out From the Port', 'unlockPort'],
    ['invRcv', 'INVOICES Receive Date', 'unlockInv'],
  ];
  function readinessHTML() {
    if (!DATA.length) return '';
    const imp = directionRows(); if (!imp.length) return '';
    const miss = UNLOCKS.filter(([k]) => imp.every(r => !r[k]));
    if (!miss.length) return '';
    const R = t('ready');
    return `<div class="qfile"><div class="qhead"><b>${R.title}</b><span>${R.count(miss.length)}</span></div>`
      + miss.map(([k, h, u]) => `<div class="qitem"><span class="qtag info">${R.tag}</span><div><code>${h}</code> — ${R[u]}</div></div>`).join('')
      + `</div>`;
  }
  function openQuality(showAll = false) {
    $('qTitleTxt').textContent = t('qTitle'); const box = $('qBody'); box.innerHTML = readinessHTML();
    if (!QREPORT.length) box.innerHTML = `<p style="color:var(--steel);padding:14px 2px">${t('qNothing')}</p>`;
    const tags = t('tags'), render = x => t('msg')[x.k](x.p);
    QREPORT.filter(rep => showAll || rep.dir === MODE()).forEach(rep => {
      const div = document.createElement('div'); div.className = 'qfile';
      const status = rep.errors.length ? `<span class="fail">${t('qRejected')}</span>` : rep.notData ? `<span class="skip">${t('qSkipped')}</span>` : (rep.errors.length && !rep.rows) ? `<span class="fail">${t('qRejected')}</span>`
        : `<span class="ok">${t('qLoaded')(fmtN(rep.rows))}</span>${rep.skipped ? `<span style="color:var(--steel);font-weight:400">${t('qDup')(rep.skipped)}</span>` : ''}`;
      div.innerHTML = `<div class="qf-head"><span>${rep.file} — ${t('sheet')} <code>${rep.sheet}</code></span><span>${status}</span></div>`;
      rep.errors.forEach(x => div.innerHTML += `<div class="qitem"><span class="tagE">${tags.E}</span><span>${render(x)}</span></div>`);
      rep.warnings.forEach(x => div.innerHTML += `<div class="qitem"><span class="tagW">${tags.W}</span><span>${render(x)}</span></div>`);
      rep.infos.forEach(x => div.innerHTML += `<div class="qitem"><span class="tagI">${tags.I}</span><span>${render(x)}</span></div>`);
      box.appendChild(div);
    });
    $('qModal').classList.add('open');
  }
  function closeM(id) {
    if (id === 'ftlDiscardConfirmModal') {
      resolveDiscardConfirm(false);
      return;
    }
    $(id)?.classList.remove('open');
    if (id === 'truckManifestModal' || id === 'shipmentBreakdownModal') {
      LAST_OPEN_MANIFEST = null;
      if (ACTIVE_MODAL_EDIT.ref) {
        const ref = ACTIVE_MODAL_EDIT.ref;
        if (OP_SNAPSHOTS[ref] && !ACTIVE_EDIT_SHIPS.has(ref)) {
          const dir = EDIR;
          const ship = SHIPS[dir]?.[ref];
          if (ship) {
            ship.rows.forEach((idx, rIdx) => {
              if (OP_SNAPSHOTS[ref][rIdx]) {
                ENTRY[dir][idx] = { ...OP_SNAPSHOTS[ref][rIdx] };
              }
            });
            saveShipmentAllocationsDraft(dir, ref);
          }
          delete OP_SNAPSHOTS[ref];
        }
        if (!ACTIVE_EDIT_SHIPS.has(ref) && LIVE && ILS.api?.unlockOperation) {
          try { ILS.api.unlockOperation(ref); } catch (e) { }
        }
        if (!ACTIVE_EDIT_SHIPS.has(ref) && LOCK_HEARTBEATS[ref]) {
          clearInterval(LOCK_HEARTBEATS[ref]);
          delete LOCK_HEARTBEATS[ref];
        }
        ACTIVE_MODAL_EDIT.ref = null;
        ACTIVE_MODAL_EDIT.type = null;
        ACTIVE_MODAL_EDIT.rowIndex = null;
        renderEntry();
      }
      if (MANIFEST_GRID_SCROLL) {
        const grid = root.querySelector('.egrid');
        if (grid) {
          grid.scrollLeft = MANIFEST_GRID_SCROLL.left;
          grid.scrollTop = MANIFEST_GRID_SCROLL.top;
        }
        MANIFEST_GRID_SCROLL = null;
      }
    }
  }
  function closeMToAlert() {
    closeM('mToAlertModal');
    setTimeout(() => {
      const toInput = $('mTo');
      if (toInput) toInput.focus();
    }, 50);
  }
  ['hModal', 'qModal', 'rModal', 'xModal', 'uModal', 'mModal', 'tripExportModal', 'deliveredModal', 'ftlStatusHistoryModal', 'mToAlertModal', 'ftlMergeConfirmModal', 'ftlDiscardConfirmModal'].forEach(id => $(id)?.addEventListener('click', e => { if (e.target.id === id) closeM(id); }));

  /* upload */
  function openTptUpload() { if (VIEW_MODE === 'entry' && EDITING && !commitEdit()) return; $('fileInput').click(); }
  $('fileInput').addEventListener('change', e => handleFiles([...e.target.files], e.target));
  async function handleFiles(files, inputEl) {
    if (!files.length) return;
    const openedFromEntry = VIEW_MODE === 'entry';
    let added = [], reports = [], raw = [];
    for (const f of files) {
      try {
        const wb = XLSX.read(await f.arrayBuffer(), { cellDates: true });
        for (const name of wb.SheetNames) { const { rows, rep, raw: sheetRaw } = parseSheet(wb.Sheets[name], name, f.name); reports.push(rep); added = added.concat(rows); if (sheetRaw) raw.push(sheetRaw); }
      } catch (err) { reports.push({ file: f.name, sheet: '—', dir: null, rows: 0, skipped: 0, errors: [{ k: 'readFail', p: { err: String(err.message).replace(/[<>&]/g, '') } }], warnings: [], infos: [] }); }
    }
    const identities = new Map();
    const identity = (r, group, incoming) => {
      const keys = [];
      if (r.shipNo) keys.push(r.dir + '|ship|' + String(r.shipNo).trim().toUpperCase());
      const base = r.mawb || (r.dir === 'Import' ? r.bl : r.booking);
      if (base && r.hawb) keys.push(r.dir + '|pair|' + String(base).trim().toUpperCase() + '|' + String(r.hawb).trim().toUpperCase());
      if (r.cert) keys.push(r.dir + '|cert|' + String(r.cert).trim().toUpperCase());
      keys.forEach(key => {
        const prev = identities.get(key);
        if (prev && prev !== group && incoming) {
          const rep = reports.find(x => x.file === r._file && x.sheet === r._sheet);
          if (rep) { const what = key.includes('|ship|') ? (AR() ? 'رقم الشحنة' : 'Shipment Number') : key.includes('|cert|') ? (AR() ? 'رقم الشهادة' : 'Certificate Number') : 'MAWB + HAWB'; rep.errors.push({ k: 'uploadInvalid', p: { list: (AR() ? 'تكرار شحنة في الصف ' : 'Duplicate shipment at row ') + r._row + ' (' + what + ').' } }); }
        } else if (!prev) identities.set(key, group);
      });
    };
    DATA.forEach(r => identity(r, r._uploadGroup || r._ref || r.shipKey || 'existing', false));
    if (openedFromEntry) ['Import', 'Export'].forEach(d => ENTRY[d].forEach((r, i) => identity({ ...r, dir: d }, rowShip(d, i)?.ref || d + '|draft|' + i, false)));
    added.forEach(r => identity(r, r._uploadGroup, true));
    if (!added.length && !reports.some(r => r.errors.length))
      reports.push({ file: files.map(f => f.name).join(', '), sheet: '—', dir: null, rows: 0, skipped: 0, errors: [{ k: 'uploadInvalid', p: { list: AR() ? 'لا يوجد تاب استيراد أو تصدير فيه بيانات.' : 'No Import or Export data tab was found.' } }], warnings: [], infos: [] });
    const failed = reports.some(r => r.errors.length);
    QREPORT = QREPORT.concat(reports);
    if (!failed) {
      if (LIVE) {
        try {
          if (DIRTY) { await flushWorkspace(); if (DIRTY) throw Error('Save pending changes before import'); }
          await ILS.api.importTrips({ requestId: crypto.randomUUID(), trips: added.map(r => ({ direction: r.dir, group: r._uploadGroup || r.shipKey, fields: Object.fromEntries(COLS[r.dir].filter(c => !c.auto).map(c => [c.k, r[c.k] ?? ''])) })) });
          LOADED_DIRS.clear();
          invalidateEntryCache();
          if (isServerPagedEntry()) {
            TRIP_PAGE[EDIR] = 0;
            await loadEntryPage(EDIR, { force: true });
          } else {
            hydrateWorkspace(await ILS.api.load(EDIR), EDIR);
            LOADED_DIRS.add(EDIR);
          }
          __emit('countsChanged');
          initFilters(); buildFields(); if (openedFromEntry) showEntry(true); else { showDash(true); resetFilters(); }
          SAVED_AT = new Date(); DIRTY = false; renderSysBar(); updateTag(); toast(t('loadedOk')(fmtN(added.length)));
        } catch (e) { toast(e.message || 'Import failed'); openQuality(true); }
        if (inputEl) inputEl.value = '';
        return;
      }
      const uploaded = enrich(added); RAW.push(...raw); DATA = DATA.concat(uploaded);
      growMaster(); initFilters(); buildFields(); seedEntryFromData(openedFromEntry ? uploaded : DATA, openedFromEntry);
      if (openedFromEntry) showEntry(true); else { showDash(true); resetFilters(); }
    }
    updateTag();
    if (failed) { openQuality(true); toast(AR() ? 'الرفع اترفض بالكامل؛ راجع التاب والخلايا في تقرير الجودة.' : 'Upload rejected in full; check the tab and cells in the quality report.'); }
    else toast(t('loadedOk')(fmtN(added.length)));
    if (inputEl) inputEl.value = '';
  }
  function updateTag() {
    const L = T[LANG];
    if (!DATA.length) { $('dataTag').textContent = L.noData; }
    else {
      const d = VIEW_MODE === 'entry' ? EDIR : MODE(); const n = d === 'FCL' ? fclCandidates().length : DATA.filter(r => r.dir === d).length;
      $('dataTag').textContent = `${fmtN(n)} ${dirLabel(d)}`;
    }
    const nQ = QREPORT.reduce((a, r) => a + r.errors.length + r.warnings.length, 0);
    $('qualityBtn').textContent = L.quality + (nQ ? ` (${nQ})` : '');
    headerFor(VIEW_MODE);
  }
  function showDash(on) { $('dash').style.display = on ? '' : 'none'; if (on) { $('entryView').style.display = 'none'; VIEW_MODE = 'dash'; } $('fieldsPanel').style.display = on ? '' : 'none'; headerFor(VIEW_MODE); }
  async function clearData() {
    DATA = []; VIEW = []; QREPORT = []; RAW = []; freeSel = null; monthSel = null;
    ENTRY = { Import: [], Export: [] };
    SHIPS = { Import: {}, Export: {} };
    ROWMETA = { Import: {}, Export: {} };
    EDIR = 'Import';
    root.classList.remove('fcl-mode');
    $('fclPanel').hidden = true;
    showDash(false);
    showEntry(true);
    renderEntry();
    updateTag();
    try {
      localStorage.removeItem('ftl-airport-mock-workspace');
    } catch { }
    toast(t('cleared') || (AR() ? 'تم مسح جميع البيانات بنجاح' : 'All data cleared successfully'));
  }
  let toastT = null;
  function dismissToast() {
    if (toastT) {
      clearTimeout(toastT);
      toastT = null;
    }
    const el = $('toast');
    if (!el) return;
    el.classList.remove('show');
  }

  function toast(m, type, options = {}) {
    const el = $('toast');
    if (!el) return;
    const msg = (m && typeof m === 'object' && m.message) ? m.message : String(m || '').trim();
    if (!msg) return;

    // Detect type intelligently if not explicitly provided
    let finalType = typeof type === 'string' ? type.toLowerCase() : (typeof options === 'object' && options?.type ? options.type : null);
    if (!finalType) {
      const lower = msg.toLowerCase();
      if (
        msg.includes('✓') ||
        msg.includes('بنجاح') ||
        msg.includes('تم حفظ') ||
        msg.includes('تم إنشاء') ||
        msg.includes('تم مسح') ||
        msg.includes('تم نقل') ||
        msg.includes('تمت استعادة') ||
        msg.includes('تم نسخ') ||
        msg.includes('تم ملء') ||
        msg.includes('تم التعرف') ||
        msg.includes('تم ربط') ||
        msg.includes('تم تعيين') ||
        msg.includes('تم إضافة') ||
        lower.includes('successfully') ||
        lower.includes('restored') ||
        lower.includes('created') ||
        lower.includes('copied') ||
        lower.includes('saved') ||
        lower.includes('applied')
      ) {
        finalType = 'success';
      } else if (
        msg.includes('⚠️') ||
        msg.includes('تنبيه') ||
        msg.includes('يرجى') ||
        msg.includes('لا يمكن') ||
        msg.includes('مقفولة') ||
        msg.includes('تحذير') ||
        msg.includes('محملة بالفعل') ||
        lower.includes('warning') ||
        lower.includes('please') ||
        lower.includes('already') ||
        lower.includes('cannot')
      ) {
        finalType = 'warning';
      } else if (
        msg.includes('خطأ') ||
        msg.includes('تعذّر') ||
        msg.includes('تعذر') ||
        msg.includes('فشل') ||
        msg.includes('غير صحيح') ||
        msg.includes('مرفوض') ||
        msg.includes('اترفض') ||
        msg.includes('تعارض') ||
        lower.includes('error') ||
        lower.includes('failed') ||
        lower.includes('invalid') ||
        lower.includes('rejected') ||
        lower.includes('conflict') ||
        lower.includes('unavailable')
      ) {
        finalType = 'error';
      } else {
        finalType = 'info';
      }
    }
    if (finalType === 'warn') finalType = 'warning';

    // Duration: default 10,000ms (10 seconds) matching FCL
    const optObj = typeof type === 'object' ? type : options;
    const duration = typeof optObj === 'number' ? optObj : (optObj?.duration || 10000);


    // Title matching FCL in Arabic & English
    const title = optObj?.title || (
      finalType === 'error'
        ? (AR() ? 'تنبيه خطأ' : 'Error Notice')
        : finalType === 'warning'
          ? (AR() ? 'تنبيه مهم' : 'Warning')
          : finalType === 'success'
            ? (AR() ? 'تمت العملية بنجاح' : 'Success')
            : (AR() ? 'إشعار' : 'Notice')
    );

    // SVG icons matching Lucide icons in FCL
    let iconSvg = '';
    if (finalType === 'error') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else if (finalType === 'warning') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    } else if (finalType === 'success') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    const closeTitle = AR() ? 'إغلاق' : 'Close';
    const closeSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
    const safeEsc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    el.setAttribute('dir', AR() ? 'rtl' : 'ltr');
    el.className = `toast ${finalType} toast-${finalType}`;
    el.innerHTML = `
      <div class="ftl-toast-icon-wrap">
        <div class="ftl-toast-icon-box ${finalType}">
          ${iconSvg}
        </div>
      </div>
      <div class="ftl-toast-body">
        ${title ? `<div class="ftl-toast-title"><span>${safeEsc(title)}</span></div>` : ''}
        <div class="ftl-toast-message">${safeEsc(msg)}</div>
      </div>
      <button type="button" class="ftl-toast-close" onclick="__FTL__.dismissToast()" title="${closeTitle}" aria-label="${closeTitle}">
        ${closeSvg}
      </button>
    `;

    // Pause on hover
    el.onmouseenter = () => {
      if (toastT) clearTimeout(toastT);
      toastT = null;
    };
    el.onmouseleave = () => {
      if (toastT) clearTimeout(toastT);
      toastT = setTimeout(dismissToast, 4000);
    };

    el.classList.add('show');
    if (toastT) clearTimeout(toastT);
    toastT = setTimeout(dismissToast, duration);
  }


  /* ============================ 8. export to PDF ============================ */
  const KPI_IDS = [...root.querySelectorAll('.kpi')].map(k => [k.querySelector('.k-val').id, k.querySelector('.k-label').id, k.querySelector('.k-sub').id, '#0b4f7a']);
  const CHART_IDS = [...root.querySelectorAll('h3[data-c]')].map(h => h.dataset.c);
  const visibleKpis = () => KPI_IDS.filter(([id]) => $(id).closest('.kpi').style.display !== 'none');
  const visibleCharts = () => CHART_IDS.filter(id => $(id)?.closest('.card').style.display !== 'none' && charts[id]);
  function openExport() {
    const X = t('x'); $('xTitleTxt').textContent = X.title; $('xHint').textContent = X.hint; $('xCoverL').textContent = X.cover; $('xInsightsL').textContent = X.insights;
    $('xKpiL').textContent = X.kpis; $('xChL').textContent = X.charts; $('xGo').textContent = X.go;
    $('xKpis').innerHTML = visibleKpis().map(([id, l]) => `<label><input type="checkbox" class="xk" data-id="${id}" checked onchange="__FTL__.xCount()"> ${$(l).textContent}</label>`).join('');
    $('xCharts').innerHTML = visibleCharts().map(id => `<label><input type="checkbox" class="xc" data-id="${id}" checked onchange="__FTL__.xCount()"> ${root.querySelector(`h3[data-c="${id}"]`).textContent}</label>`).join('');
    $('xKpiAll').checked = true; $('xChAll').checked = true; xCount(); $('xModal').classList.add('open');
  }
  function xToggleAll(kind, on) { root.querySelectorAll(kind === 'kpi' ? '.xk' : '.xc').forEach(c => c.checked = on); xCount(); }
  function xCount() {
    const k = [...root.querySelectorAll('.xk:checked')].length, c = [...root.querySelectorAll('.xc:checked')].length;
    $('xKpiAll').checked = k === visibleKpis().length; $('xChAll').checked = c === visibleCharts().length; $('xCount').textContent = t('x').count(k, c);
  }
  function exportSelection() {
    return {
      cover: $('xCover').checked, insights: $('xInsights').checked,
      kpis: [...root.querySelectorAll('.xk:checked')].map(c => c.dataset.id), charts: [...root.querySelectorAll('.xc:checked')].map(c => c.dataset.id)
    };
  }
  function buildExport(sel) {
    const X = t('x'), root = $('exportRoot'), esc = s => String(s).replace(/</g, '&lt;');
    const exportGlyph = root.querySelector('.h-kicker .glyph')?.outerHTML || '';
    const basis = $('dateBasis').value, dates = VIEW.map(r => r[basis]).filter(Boolean).sort();
    const now = fmtDay(today());
    const parts = filterParts();
    const chips = parts.length ? parts.map(p => { const i = p.indexOf(':'); return i > 0 ? `<span class="chip2"><b>${esc(p.slice(0, i))}:</b> ${esc(p.slice(i + 1))}</span>` : `<span class="chip2">${esc(p)}</span>`; }).join('')
      : `<span class="chip2">${X.allData}</span>`;
    const basisChip = `<span class="chip2"><b>${X.basis}:</b> ${dateBasisLabel()}</span>`;
    let html = '';
    if (sel.cover) html += `<section class="xp-cover"><div class="dots"></div>
      <svg class="route" viewBox="0 0 420 74" fill="none"><path d="M14 58 C 120 8, 300 8, 406 52" stroke="#bff0f7" stroke-width="1.6" stroke-dasharray="1 9" stroke-linecap="round"/><circle cx="14" cy="58" r="4" fill="#bff0f7"/><circle cx="406" cy="52" r="4" fill="#ffd98a"/><path d="M196 24 l14 0 l6 7 l-24 0 z M199 20 l8 0 l0 4 l-8 0 z" fill="#dff0fc"/></svg>
      <svg class="wave" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0 60 C 150 10, 250 110, 400 60 S 650 10, 800 60 S 1050 110, 1200 60 V 120 H 0 Z" fill="#bff0f7"/><path d="M0 80 C 150 40, 250 120, 400 80 S 650 40, 800 80 S 1050 120, 1200 80 V 120 H 0 Z" fill="#22b8cf" opacity=".6"/></svg>
      <div class="logo"><img src="${$('logoImg').src}" alt="ILS">${exportGlyph}</div>
      <div class="kicker">${X.kicker}</div><h1>${$('hTitle').textContent}</h1><div class="sub">${$('hSub').textContent}</div>
      <div class="meta"><div><b>${fmtN(VIEW.length)}</b>${X.ops}</div><div><b>${new Set(VIEW.map(r => r.client)).size}</b>${X.clients}</div>
        <div><b>${dates.length ? `${fmtDay(dates[0])} → ${fmtDay(dates[dates.length - 1])}` : '—'}</b>${X.period}</div><div><b>${now}</b>${X.generated}</div></div>
      <div class="filters"><div class="lbl">${X.filters}</div><div class="chips">${basisChip}${chips}</div></div></section>`;
    const head = `<div class="xp-head"><span class="t">${$('hTitle').textContent} — ILS Egypt</span><span class="d">${now} · ${parts.length ? esc(parts.join(' · ')) : X.allData}</span></div>`;
    html += head;
    if (sel.kpis.length) {
      html += `<div class="xp-sec xp-kpis">` + sel.kpis.map(id => {
        const k = KPI_IDS.find(x => x[0] === id);
        return `<div class="xp-kpi" style="--xa:${k[3]}"><div class="lab">${esc($(k[1]).textContent)}</div><div class="val">${esc($(id).textContent)}</div><div class="sb">${esc($(k[2]).textContent)}</div></div>`;
      }).join('') + `</div>`;
    }
    if (sel.insights) { const items = [...$('insightList').children].map(li => li.innerHTML); html += `<div class="xp-sec xp-ins"><h4>${t('insH')}</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`; }
    if (sel.charts.length) {
      html += `<div class="xp-charts">` + sel.charts.map(id => {
        const card = $(id).closest('.card');
        const title = card.querySelector('h3').textContent, sub = card.querySelector('.sub').textContent.split(' — ')[0];
        const ch = charts[id], prevDpr = ch.options.devicePixelRatio; ch.options.devicePixelRatio = 2.5; ch.resize();
        const img = ch.toBase64Image('image/png', 1); ch.options.devicePixelRatio = prevDpr; ch.resize();
        return `<div class="xp-chart"><h4>${esc(title)}</h4><div class="s">${esc(sub)}</div><img src="${img}"></div>`;
      }).join('') + `</div>`;
    }
    root.innerHTML = html;
  }
  function runExport() {
    const sel = exportSelection(); if (!sel.kpis.length && !sel.charts.length && !sel.insights && !sel.cover) { return; }
    try {
      buildExport(sel);
      if (!$('exportRoot').innerHTML.trim()) throw new Error(AR() ? 'تعذر تجهيز نسخة التصدير.' : 'Could not prepare the dashboard export.');
      closeM('xModal');
      printHost.dir = root.dir; printHost.lang = root.lang; printHost.appendChild($('exportRoot')); document.body.appendChild(printHost); document.body.classList.add('ftl-printing');
      setTimeout(() => { window.print(); }, 150);
    } catch (e) { toast(e.message || (AR() ? 'فشل تصدير اللوحة.' : 'Dashboard export failed.')); }
  }
  __on(window, 'afterprint', () => { const er = $('exportRoot'); if (er) { er.innerHTML = ''; root.appendChild(er); } printHost.remove(); document.body.classList.remove('ftl-printing'); });

  /* =====================================================================
     10. INTEGRATION LAYER  —  everything the developer needs to make this
     a live, database-backed dashboard. The whole app already runs without
     a server (one-time mode); wiring these hooks turns it live without
     touching any other part of the code.
     ===================================================================== */

  /* ---------- the contract ---------- */
  const ILS_API_SPEC = {
    version: '2.0',
    base: '/api',
    auth: 'Authenticated session; the server resolves the user and enforces roles',
    endpoints: [
      ['GET', '/me', 'Signed-in user ID and display name'],
      ['GET', '/workspace', 'Versioned shipment aggregate with stable trip IDs'],
      ['PUT', '/workspace', 'Atomic optimistic-concurrency save; returns a new version'],
      ['POST', '/operations', 'Server creates reference and container IDs'],
      ['POST', '/imports', 'Validate and commit the whole Excel upload'],
      ['GET', '/master', 'Active dropdown values'],
      ['POST', '/master/:list', 'Create allowed dropdown value'],
      ['GET', '/permissions', 'Capabilities, including reopen_shipments and delete_shipments'],
      ['PATCH', '/shipments/:ref/status', 'Atomic transition; reopening requires permission'],
      ['GET', '/shipments/:ref/permissions', 'Confirm server capability before showing destructive action'],
      ['DELETE', '/shipments/:ref', 'Delete requires permission and audit on server'],
      ['POST', '/mail/drafts', 'ILS.mail.compose(message): create an Outlook draft from {to, subject, text, html, inline[], attachments[]} (base64 contentBytes) and return {url}'],
    ]
  };

  /* Column → database field map, generated from the sheet definition itself,
     so it can never drift from what the screen shows. */
  function ilsSchema(dir) {
    const type = c => c.t === 'date' ? 'date' : c.t === 'time' ? 'time' : c.t === 'upd' ? 'timestamp[]' : 'text';
    return COLS[dir].map(c => ({
      column: c.h, field: c.k, type: type(c), group: c.g, colour: GROUPS[c.g].c,
      on_operation_form: !!c.op, required: !!c.op && !c.opt, optional: !!c.opt, system_written: !!c.auto, per_container: c.uniq === false, merges_across_shipment: isMergeCol(c), dropdown: c.t === 'list' ? c.src : null
    }));
  }

  /* The exact JSON the front-end sends/expects. */
  function ilsPayloadSample() {
    return {
      shipments: [{
        ref: 'OPS-2026-0001', direction: 'Import',
        status: 'Open', enteredBy: { id: 'user-1', displayName: 'Signed-in user' }, day: '2026-09-29', at: '09:12',
        unmerged: [], trips: [{ id: 'trip-1', ordinal: 0, fields: { shipNo: 'IMP-1', oper: 'Signed-in user', status: 'Open' }, updates: [] }]
      }]
    };
  }

  /* The versioned aggregate contract and SQL constraints are specified in the
     companion developer handoff. Server IDs, audit identity and authorization
     are authoritative; the local state is only a UI projection. */
  function hydrateWorkspace(payload, targetDir) {
    if (!payload || !Array.isArray(payload.shipments)) throw Error('Invalid workspace payload');
    if (payload.version != null) WORKSPACE_VERSION = payload.version;
    if (targetDir === 'Import' || targetDir === 'Export') {
      ENTRY[targetDir] = [];
      SHIPS[targetDir] = {};
      ROWMETA[targetDir] = {};
      TRIP_SELECTED[targetDir]?.clear();
      DELIVERED_SELECTED[targetDir]?.clear();
    } else {
      ENTRY = { Import: [], Export: [] };
      SHIPS = { Import: {}, Export: {} };
      ROWMETA = { Import: {}, Export: {} };
      ['Import', 'Export'].forEach(d => { TRIP_SELECTED[d]?.clear(); DELIVERED_SELECTED[d]?.clear(); });
    }
    for (const sh of payload.shipments) {
      const d = sh.direction;
      if (targetDir && d !== targetDir) continue;
      if (!SHIPS[d] || !sh.ref || !Array.isArray(sh.trips) || !sh.trips.length) throw Error('Invalid shipment payload');
      if (SHIPS[d][sh.ref]) continue;
      const idxs = [], status = sh.status === 'Delivered' ? 'Delivered' : 'Open';
      for (const tr of sh.trips) {
        if (!tr.id || !tr.fields) throw Error('Missing server trip ID or fields');
        const row = {};
        COLS[d].forEach(c => {
          let val = tr.fields[c.k];
          if (c.k === 'vol' && (val === undefined || val === null || val === '')) {
            val = sh.shp || sh.per || sh.totalShipments || (sh.shpSpans ? sh.shpSpans.length : 1);
          }
          if (c.k === 'mawb' && (val === undefined || val === null || val === '')) {
            val = tr.fields.mawb || tr.fields.bl || tr.fields.booking || '';
          }
          if (c.k === 'cntr' && (val === undefined || val === null || val === '')) {
            val = tr.fields.cntr || tr.fields.car || '';
          }
          if (c.k === 'clrType' && val) {
            val = normClr(val);
          }
          if (d === 'Export' && c.k === 'customs') {
            const clr = normClr(tr.fields?.clrType || row.clrType);
            if (clr === 'CERT' && !val) val = 'Cairo Airport Customs';
          }
          if (d === 'Export' && c.k === 'cert' && isBoslaClr(tr.fields?.clrType || row.clrType)) {
            val = '';
          }
          row[c.k] = c.k === 'missDoc' ? cleanDocValue(val) : String(val ?? '');
        });
        row.status = status;
        const idx = ENTRY[d].length; ENTRY[d].push(row); idxs.push(idx);
        const parsedUpdates = (tr.updates || []).map(u => ({
          id: u.id,
          text: u.text || u.note || '',
          day: u.day || (u.at && u.at.length >= 10 ? u.at.slice(0, 10) : sh.day || ''),
          at: (u.at && u.at.length > 10 ? u.at.slice(11, 16) : u.at) || '',
          user: u.user || u.by || '',
          by: u.by || u.user || ''
        }));
        if (parsedUpdates.length > 0) {
          const lastU = parsedUpdates[parsedUpdates.length - 1];
          if (!row.updDate) row.updDate = `${fmtDay(lastU.day)} ${lastU.at}`.trim();
          if (!row.updates) row.updates = lastU.text;
        } else if (row.updates) {
          parsedUpdates.push({
            id: '',
            text: row.updates,
            day: sh.day || today(),
            at: sh.at || nowHM(),
            user: sh.enteredBy?.displayName || sh.enteredBy || 'User',
            by: sh.enteredBy?.displayName || sh.enteredBy || 'User'
          });
        }
        ROWMETA[d][idx] = { id: tr.id, ref: sh.ref, user: sh.enteredBy?.displayName || sh.enteredBy || '', day: sh.day || '', at: sh.at || '', updates: parsedUpdates };
      }
      SHIPS[d][sh.ref] = {
        ref: sh.ref,
        dir: d,
        rows: idxs,
        per: Math.max(1, Number(sh.per) || 1),
        unmerged: new Set((sh.unmerged || []).filter(k => canToggleMerge(d, COLS[d].find(c => c.k === k)))),
        at: sh.at || '',
        day: sh.day || '',
        user: sh.enteredBy?.displayName || sh.enteredBy || '',
        status,
        targetTruckCount: sh.trk,
        initialShipCount: sh.shp,
        lockedByUserId: sh.lockedByUserId || null,
        lockedByName: sh.lockedByName || null,
        lockedAtUtc: sh.lockedAtUtc || null,
        isLocked: Boolean(sh.isLocked)
      };
      layoutShip(d, SHIPS[d][sh.ref], { shpSpans: sh.shpSpans, trkSpans: sh.trkSpans, trkOf: sh.trkOf, shp: sh.shp, trk: sh.trk });
      const numShipments = (sh.shpSpans ? sh.shpSpans.length : (Number(sh.shp) || Number(sh.per) || 1));
      let savedAllocs = sh.allocations;
      if (!savedAllocs) {
        try {
          const raw = localStorage.getItem(`ftl_allocations_${sh.ref}`);
          if (raw) savedAllocs = JSON.parse(raw);
        } catch (e) { }
      }
      idxs.forEach((rIdx, ord) => {
        const row = ENTRY[d][rIdx];
        const allocData = savedAllocs ? (savedAllocs[ord] || savedAllocs[String(ord)]) : null;
        if (allocData) {
          row._allocations = Array.isArray(allocData.allocations) ? allocData.allocations.map(a => ({ ...a })) : [];
          row.assignedShp = (allocData.assignedShp !== undefined && allocData.assignedShp !== null && allocData.assignedShp !== '')
            ? parseInt(allocData.assignedShp, 10)
            : null;
        } else if (numShipments === 1) {
          const p = parseInt(normalizeDigits(row.loadedPackages || '0'), 10) || 0;
          row.assignedShp = 0;
          row._allocations = [{ shpIdx: 0, pkgs: p }];
        } else {
          row._allocations = [];
          row.assignedShp = null;
        }
      });
    }
    const rep = []; DATA = enrich(['Import', 'Export'].flatMap(d => entryToTrips(d, rep))); QREPORT = rep; RAW = [];
  }
  async function ilsBoot() {
    if (typeof ILS.api !== 'object' || !ILS.api) return false;   /* offline / one-time mode */
    try {
      const api = ILS.api;
      for (const name of ['getCurrentUser', 'loadMaster', 'load', 'createOperation', 'updateOperation', 'updateShipmentStatus', 'loadPermissions', 'addMaster', 'importTrips'])
        if (typeof api[name] !== 'function') throw Error('Missing ILS_API.' + name);
      const bootDir = EDIR || 'Import';
      LOADED_DIRS.clear();
      invalidateEntryCache();
      const usePagedBoot = typeof api.getPagedOperations === 'function';
      const [identity, m, d, perms] = await Promise.all([
        api.getCurrentUser(),
        api.loadMaster(),
        usePagedBoot
          ? api.getPagedOperations({
              page: (TRIP_PAGE[bootDir] || 0) + 1,
              pageSize: TRIPS_PER_PAGE || 20,
              operationType: bootDir,
              onlyActive: true,
              isDeleted: false,
              sortBy: TRIP_SORT[bootDir]?.key || '__tripNo',
              sortDirection: TRIP_SORT[bootDir]?.dir || 'asc',
            })
          : api.load(bootDir),
        api.loadPermissions ? api.loadPermissions().catch(() => ({})) : Promise.resolve({})
      ]);
      if (destroyed) return false;
      if (!identity?.id || !identity?.displayName) throw Error('Missing signed-in identity');
      OP_USER_ID = identity.id; OP_USER = identity.displayName;
      if (perms?.reopen_shipments != null) REOPEN_GRANTED = Boolean(perms.reopen_shipments);
      Object.keys(MASTER).forEach(k => { if (Array.isArray(m?.[k]) && m[k].length) MASTER[k] = m[k]; });
      if (Array.isArray(m?.aod) && m.aod.length) MASTER.aod = m.aod;
      else if (Array.isArray(m?.pod) && m.pod.length) MASTER.aod = m.pod;
      if (Array.isArray(m?.pol) && m.pol.length) MASTER.pol = m.pol;
      else if (Array.isArray(m?.pod) && m.pod.length) MASTER.pol = m.pod;
      else if (Array.isArray(m?.aod) && m.aod.length) MASTER.pol = m.aod;
      if (Array.isArray(m?.clients) && m.clients.length) MASTER.client = m.clients;
      if (Array.isArray(m?.lines) && m.lines.length) MASTER.line = m.lines;
      if (Array.isArray(m?.destinations) && m.destinations.length) MASTER.dest = m.destinations;
      if (Array.isArray(m?.truckers) && m.truckers.length) MASTER.trucker = m.truckers;
      LIVE = true;
      if (usePagedBoot) {
        const items = Array.isArray(d?.items) ? d.items : (Array.isArray(d?.shipments) ? d.shipments : []);
        const totalCount = d?.totalCount ?? items.length;
        const totalTrucks = d?.totalTrucksCount ?? items.reduce((a, s) => a + (s.trips?.length || 0), 0);
        const totalPages = Math.max(1, d?.totalPages ?? 1);
        ENTRY_PAGING[bootDir].totalCount = totalCount;
        ENTRY_PAGING[bootDir].totalTrucks = totalTrucks;
        ENTRY_PAGING[bootDir].totalPages = totalPages;
        hydrateWorkspace({ shipments: items }, bootDir);
        ENTRY_PAGING[bootDir].cache[entryQueryKey(bootDir)] = { items, totalCount, totalTrucks, totalPages, timestamp: Date.now() };
      } else {
        hydrateWorkspace(d, bootDir);
      }
      LOADED_DIRS.add(bootDir);
      if (destroyed) return false;
      initFilters(); buildFields(); if (!usePagedBoot && DATA.length) { showDash(true); resetFilters(); } else renderEntry();
      SAVED_AT = new Date(); DIRTY = false; renderSysBar(); updateTag();
      return true;
    } catch (e) {
      if (destroyed) return false;
      console.error('ILS_API boot failed:', e);
      toast(e.message || 'Could not load live data');
      return false;
    }
  }
  let LIVE = false;

  /* ---------- email ---------- */





  /* =====================================================================
     EMAIL — opens Outlook with a ready, branded draft.
     We generate an .eml with the X-Unsent flag: Outlook opens it as an unsent
     message (To/Subject/HTML body/attachments all filled), the user just
     presses Send. A mailto: link is kept as the fallback for other clients.
     ===================================================================== */
  const LOGO_DATA = () => document.getElementById('logoImg')?.getAttribute('src') || '';
  function emailTemplate({ title, intro, rows, charts, footer }) {
    const brand = '#0b4f7a', aqua = '#22b8cf';
    const kpiRows = (rows || []).map(([k, v]) => `<tr><td style="padding:7px 12px;border-bottom:1px solid #e6eef3;color:#4b5b6b;font-size:13px">${esc(k)}</td><td style="padding:7px 12px;border-bottom:1px solid #e6eef3;text-align:right;font-weight:700;color:#12263a;font-size:13px">${esc(v)}</td></tr>`).join('');
    const chartImgs = (charts || []).map(c => `<div style="margin:14px 0"><div style="font-weight:700;color:${brand};font-size:13px;margin-bottom:6px">${esc(c.title)}</div><img src="cid:${c.cid}" width="600" style="display:block;max-width:100%;border:1px solid #e6eef3;border-radius:8px"></div>`).join('');
    return `<!doctype html><html><body style="margin:0;background:#f2f6f9;font-family:Segoe UI,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f9;padding:24px 0"><tr><td align="center">
    <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 18px rgba(6,42,74,.08)">
      <tr><td style="background:linear-gradient(100deg,#062a4a,#0b4f7a 55%,#0e7c86);background-color:${brand};padding:22px 26px">
        <table role="presentation" width="100%"><tr>
          <td style="font-size:25px;font-weight:700;color:white">ILS</td>
          <td align="right" style="color:#bff0f7;font-size:11px;letter-spacing:.25em;font-weight:700">ILS EGYPT · TRANSPORT</td></tr></table>
        <div style="color:#ffffff;font-size:22px;font-weight:800;margin-top:14px">${esc(title)}</div>
        <div style="color:#a9dce6;font-size:12.5px;margin-top:4px">${esc(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))}</div>
      </td></tr>
      <tr><td style="padding:22px 26px 6px;color:#2b3a4a;font-size:14px;line-height:1.65">${intro}</td></tr>
      ${kpiRows ? `<tr><td style="padding:6px 26px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6eef3;border-radius:10px;overflow:hidden">${kpiRows}</table></td></tr>` : ''}
      ${chartImgs ? `<tr><td style="padding:0 26px 10px">${chartImgs}</td></tr>` : ''}
      <tr><td style="padding:14px 26px 24px;color:#66788c;font-size:12px;line-height:1.6;border-top:1px solid #e6eef3">${footer || ''}</td></tr>
      <tr><td style="background:#0b4f7a;height:6px;background-image:linear-gradient(90deg,#0b4f7a,${aqua})"></td></tr>
    </table></td></tr></table></body></html>`;
  }
  /* =====================================================================
     EMAIL ARCHITECTURE
     1. buildMailMessage() turns what the user picked into ONE provider-agnostic
        message: {to, subject, text, html, inline:[{cid,name,mime,blob}], attachments:[{name,mime,blob}]}
        · "table" mail embeds the selected rows / columns of the table in the body (merged cells kept)
        · "dash"  mail embeds the KPIs and the selected charts (inline images) and attaches the PDF
     2. A MAIL PROVIDER only knows how to deliver that message as a DRAFT the user reviews and sends:
        · eml      – offline: downloads an unsent .eml (X-Unsent: 1) that opens in Outlook / Mail
        · outlook  – Microsoft Graph draft (ILS.outlook.getAccessToken() → delegated Mail.ReadWrite token)
        · backend  – ILS.mail.compose(message) → the hosting system creates the draft server-side
                     with its own Outlook service-provider connection and returns {url} (optional)
     Nothing else in the app knows about e-mail transport, so wiring the back end later is one object.
     ===================================================================== */
  let MAIL_KIND = 'table', MAIL_TO_LAST = '', MAIL_BUSY = false;
  const mailDirection = () => VIEW_MODE === 'entry' ? EDIR : MODE();
  async function blobToB64(blob) { const bytes = new Uint8Array(await blob.arrayBuffer()); let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000)bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); }
  const MAIL_FILE_NAME = () => `ILS_${MAIL_KIND}_${new Date().toISOString().slice(0, 10)}.eml`;
  const MAIL_PROVIDERS = {
    backend: {
      id: 'backend', available: () => typeof ILS.mail?.compose === 'function',
      label: () => AR() ? 'إنشاء مسودة في Outlook' : 'Create Outlook draft',
      done: () => AR() ? 'اتعملت المسودة في Outlook. راجعها واضغط إرسال من Outlook.' : 'Draft created in Outlook. Review and send it from Outlook.',
      async compose(message) {
        const wire = { ...message, inline: await Promise.all(message.inline.map(async a => ({ cid: a.cid, name: a.name, mime: a.mime, contentBytes: await blobToB64(a.blob) }))), attachments: await Promise.all(message.attachments.map(async a => ({ name: a.name, mime: a.mime, contentBytes: await blobToB64(a.blob) }))) };
        const result = await ILS.mail.compose(wire); return result?.url || null;
      }
    },
    outlook: {
      id: 'outlook', available: () => typeof ILS.outlook?.getAccessToken === 'function',
      label: () => AR() ? 'فتح مسودة Outlook' : 'Open Outlook draft',
      done: () => AR() ? 'تم فتح مسودة Outlook. راجعها واضغط إرسال من Outlook.' : 'Outlook draft opened. Review and send it in Outlook.',
      async compose(message) { const token = await ILS.outlook.getAccessToken(); if (!token) throw new Error(AR() ? 'لم يكتمل تسجيل الدخول.' : 'Sign-in was not completed.'); return createOutlookDraft({ token, message }); }
    },
    eml: {
      id: 'eml', available: () => true,
      label: () => AR() ? 'تحميل مسودة الإيميل (.eml)' : 'Download email draft (.eml)',
      done: () => AR() ? 'اتحمّلت مسودة الإيميل. افتح ملف EML في Outlook أو تطبيق الإيميل، راجعها واضغط إرسال.' : 'Email draft downloaded. Open the EML file in Outlook or your mail app, review it and send.',
      async compose(message) { await downloadMailDraft(message); return null; }
    }
  };
  const mailProvider = () => MAIL_PROVIDERS.backend.available() ? MAIL_PROVIDERS.backend : MAIL_PROVIDERS.outlook.available() ? MAIL_PROVIDERS.outlook : MAIL_PROVIDERS.eml;
  function showToAlert() {
    const toInput = $('mTo');
    const toErr = $('mToErr');
    if (toInput) {
      toInput.style.borderColor = '#f43f5e';
      toInput.style.backgroundColor = '#fff1f2';
    }
    if (toErr) {
      toErr.textContent = AR() ? 'يرجى إدخال البريد الإلكتروني (To) هنا' : 'Please enter recipient email address (To)';
      toErr.style.display = 'block';
    }
    const tTitle = $('mToAlertTitle'), tDesc = $('mToAlertDesc'), tOk = $('mToAlertOk');
    if (tTitle) tTitle.textContent = AR() ? 'البريد الإلكتروني (To) مطلوب' : 'Recipient Email (To) Required';
    if (tDesc) tDesc.textContent = AR()
      ? 'يرجى كتابة البريد الإلكتروني للمستلم في خانة (To) أولاً لتتمكن من تنزيل مسودة الإيميل.'
      : 'Please enter the recipient email address in the "To" field before downloading the draft.';
    if (tOk) tOk.textContent = AR() ? 'حسناً، فهمت' : 'OK, Got it';
    $('mToAlertModal')?.classList.add('open');
  }

  async function openMail(kind, scope = 'active', forceDir) {
    if (EDITING && !commitEdit()) return;
    if (!entryIdentityValid()) return;
    const isDelivered = (scope && scope === 'delivered') || CURRENT_TAB === 'Delivered' || Boolean($('deliveredOpen')?.classList.contains('on'));
    const isInactive = (scope && scope === 'inactive') || CURRENT_TAB === 'Inactive' || Boolean($('inactiveOpen')?.classList.contains('on'));
    let effectiveScope = isDelivered ? 'delivered' : (isInactive ? 'inactive' : 'active');
    MAIL_KIND = (kind === 'excel' || kind === 'table') ? 'table' : 'dash';
    let d = forceDir;
    if (!d) {
      if (effectiveScope === 'delivered' || effectiveScope === 'inactive') {
        if (ARCHIVE_FILTER_DIR === 'Import') {
          d = 'Import';
        } else if (ARCHIVE_FILTER_DIR === 'Export') {
          d = 'Export';
        } else {
          d = 'ALL';
        }
      } else {
        const activeTabEl = root.querySelector('.etab.on[data-dir]');
        d = activeTabEl?.dataset.dir || (CURRENT_TAB === 'Export' || CURRENT_TAB === 'Import' ? CURRENT_TAB : (EDIR || mailDirection()));
      }
    }
    if (MAIL_KIND === 'table' && effectiveScope === 'active' && isServerPagedEntry()) {
      try {
        effectiveScope = await prepareActiveExportStore(d);
      } catch (err) {
        console.warn('[FTL] Failed to fetch all active operations for email, using current page:', err);
      }
    }
    const isTable = MAIL_KIND === 'table', P = mailProvider();
    $('mTitleTxt').textContent = P.label();
    const subKind = effectiveScope === 'delivered' ? ` · ${AR() ? 'الشحنات المسلّمة' : 'Delivered'}` : (effectiveScope === 'inactive' ? ` · ${AR() ? 'غير النشطة' : 'Inactive'}` : '');
    const dirTitle = d === 'ALL' ? (AR() ? 'كل الشحنات' : 'All Shipments') : dirLabel(d);
    const subject = isTable ? `${t('mail').subjExcel(dirTitle)}${subKind}` : t('mail').subjDash(dirTitle, new Date().toISOString().slice(0, 10));
    const defaultNote = isTable
      ? (AR() ? 'مرحبًا،\n\nبرجاء الاطلاع على بيانات الشحنات أدناه.\n\nمع التحية،\nILS Egypt' : 'Dear team,\n\nPlease find the shipment details below.\n\nBest regards,\nILS Egypt')
      : (AR() ? 'مرحبًا،\n\nبرجاء الاطلاع على ملخص الداشبورد أدناه.\n\nمع التحية،\nILS Egypt' : 'Dear team,\n\nPlease find the dashboard summary below.\n\nBest regards,\nILS Egypt');
    const fields = isTable ? tripPickerHTML(d, 'm', tripExportDefaults(d, effectiveScope), effectiveScope) :
      `<div class="xsec"><label class="xall"><input type="checkbox" id="mAllCh" checked><b>${AR() ? 'كل الرسومات' : 'All charts'}</b></label><div class="xgrid">${visibleCharts().map(id => `<label><input class="mCh" type="checkbox" value="${id}" checked>${esc(root.querySelector(`h3[data-c="${id}"]`).textContent)}</label>`).join('')}</div></div><div class="xsec"><label class="xall"><input type="checkbox" id="mKpis" checked>${AR() ? 'المؤشرات' : 'KPIs'}</label><label class="xall"><input type="checkbox" id="mInsights" checked>${AR() ? 'القراءات' : 'Insights'}</label><label class="xall"><input type="checkbox" id="mPdf" checked>${AR() ? 'إرفاق نسخة PDF' : 'Attach a PDF copy'}</label></div>`;
    $('mBody').dataset.scope = effectiveScope;
    $('mBody').dataset.dir = d;
    $('mBody').innerHTML = `<div class="mkind">${dirTitle}${subKind} · ${isTable ? (AR() ? 'الجدول داخل الإيميل' : 'Table embedded in the email') : (AR() ? 'الداشبورد داخل الإيميل' : 'Dashboard embedded in the email')}</div>
      <div class="xsec email-field-sec" id="mToWrap">
        <label for="mTo" class="email-field-lbl">
          <span>${AR() ? 'إلى' : 'To'}</span>
          <span class="required-star">*</span>
        </label>
        <input id="mTo" class="email-input" placeholder="name@company.com; other@company.com" value="${esc(MAIL_TO_LAST)}">
        <div id="mToErr" style="display:none;color:#e11d48;font-size:11px;font-weight:600;margin-top:4px;">${AR() ? 'يرجى إدخال البريد الإلكتروني (To) هنا' : 'Please enter recipient email address (To)'}</div>
      </div>
      <div class="xsec email-field-sec">
        <label for="mSubject" class="email-field-lbl">${AR() ? 'الموضوع' : 'Subject'}</label>
        <input id="mSubject" class="email-input" value="${esc(subject)}">
      </div>
      <div class="xsec email-field-sec">
        <label for="mNote" class="email-field-lbl">${AR() ? 'الرسالة' : 'Message'}</label>
        <textarea id="mNote" class="email-textarea">${esc(defaultNote)}</textarea>
      </div>
      ${fields}<div id="mStatus" role="status"></div>`;
    $('mGo').textContent = P.label(); $('mGo').disabled = false;
    if ($('mCancel')) $('mCancel').textContent = AR() ? 'إلغاء' : 'Cancel';
    const copyReplyBtn = $('mCopyReply');
    if (copyReplyBtn) {
      copyReplyBtn.classList.remove('copied');
      copyReplyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>${AR() ? 'نسخ للرد في سكونس (Copy)' : 'Copy for Reply'}</span>
      `;
      copyReplyBtn.title = AR() ? 'انسخ الجدول للرد في سكونس مفتوح بالآوتلوك' : 'Copy formatted table to reply into an existing Outlook thread';
    }
    $('mStatus').textContent = P.id === 'eml' ? (isTable ? (AR() ? 'يمكنك تحميل مسودة (.eml) لفتح إيميل جديد، أو نسخ المحتوى والجدول للرد مباشرة في سكونس مفتوح بالآوتلوك.' : 'Download an unsent .eml draft to open a new email, or copy formatted table to reply directly in an existing Outlook thread.') : (AR() ? 'هتتحمّل مسودة .eml فيها المؤشرات والرسومات المختارة داخل الإيميل. افتحها في Outlook، راجعها واضغط إرسال.' : 'An unsent .eml draft will download with the KPIs and selected charts embedded in the body. Open it in Outlook, review it and send.')) : '';
    if (isTable) wireTripPicker($('mBody'), 'm');
    $('mAllCh')?.addEventListener('change', e => root.querySelectorAll('.mCh').forEach(c => c.checked = e.target.checked));
    $('mTo')?.addEventListener('input', e => {
      if (e.target.value.trim()) {
        e.target.style.borderColor = '';
        e.target.style.backgroundColor = '';
        const errEl = $('mToErr');
        if (errEl) errEl.style.display = 'none';
      }
    });
    const mBodyEl = $('mBody');
    if (mBodyEl) mBodyEl.scrollTop = 0;
    $('mModal').classList.add('open');
  }
  function switchMail(k) { openMail(k); }
  function parseMailRecipients(value) {
    const list = value.split(/[;,]/).map(v => v.trim()).filter(Boolean);
    if (!list.length) {
      showToAlert();
      throw new Error(AR() ? 'يرجى كتابة البريد الإلكتروني للمستلم.' : 'Please enter recipient email address.');
    }
    if (list.some(v => !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(v))) {
      const toInput = $('mTo');
      if (toInput) {
        toInput.style.borderColor = '#f43f5e';
        toInput.style.backgroundColor = '#fff1f2';
        toInput.focus();
      }
      const toErr = $('mToErr');
      if (toErr) {
        toErr.textContent = AR() ? 'اكتب عنوان إيميل كامل وصحيح (مثال: name@company.com)' : 'Enter a complete, valid email address (e.g. name@company.com)';
        toErr.style.display = 'block';
      }
      throw new Error(AR() ? 'اكتب عنوان إيميل كامل وصحيح.' : 'Enter a complete, valid email address.');
    }
    return [...new Set(list)];
  }
  /* the selected rows / columns of the table as e-mail HTML — same merged layout as the screen and the Excel export */
  function tableEmailHTML(dir, opts) {
    const scope = opts.scope || (CURRENT_TAB === 'Delivered' ? 'delivered' : (CURRENT_TAB === 'Inactive' ? 'inactive' : 'active'));
    const dirs = (dir === 'ALL' || (opts.directions && opts.directions.length > 1))
      ? (opts.directions || ['Import', 'Export'])
      : [dir];

    let totalRows = 0, totalShips = 0;
    const tablesHtml = [];

    dirs.forEach(d => {
      const store = isArchiveScope(scope) ? ARCHIVE_STORE[scope]?.[d] : null;
      const targetEntry = store ? store.entry : ENTRY[d];
      const targetShips = store ? store.ships : SHIPS[d];
      const targetRowmeta = store ? store.rowmeta : ROWMETA[d];

      const pick = (opts.columns && opts.columns[d]) ? COLS[d].filter(c => opts.columns[d].includes(c.k)) : COLS[d].filter(c => c.t !== 'upd');
      const included = (opts.operations?.[d] && opts.operations[d].length) ? new Set(opts.operations[d]) : null;
      const allowedRows = (opts.rowIndices && opts.rowIndices[d] && opts.rowIndices[d].length) ? new Set(opts.rowIndices[d]) : null;
      const ships = Object.values(targetShips || {}).filter(sh => (!included || included.has(sh.ref)) && (!allowedRows || sh.rows.some(r => allowedRows.has(r))));
      if (!ships.length) return;

      const th = c => { const col = GROUPS[c.g].c, dark = luminance(col) < 0.55; return `<th style="padding:7px 9px;border:1px solid #b7c1cc;background:${col};color:${dark ? '#ffffff' : '#1f2937'};font-size:12px;font-weight:700;white-space:nowrap">${esc(AR() ? (c.ar || c.h) : c.h)}</th>`; };
      const value = (c, i) => { const r = targetEntry[i]; if (c.t === 'upd') return (targetRowmeta[i]?.updates || []).map(u => `${fmtDay(u.day)} ${u.at} ${u.user}: ${u.text}`).join(' | '); return displayValue(c, String(r[c.k] ?? '')); };
      let rows = '', n = 0;
      ships.forEach((sh, si) => {
        const renderRows = sh.rows.filter(r => !allowedRows || allowedRows.has(r));
        const canMerge = renderRows.length > 1 && renderRows.length === sh.rows.length;
        renderRows.forEach((i, ri) => {
          n++;
          const cellParts = [];
          pick.forEach(c => {
            const sp = canMerge ? spanOf(sh, c, ri) : { start: ri, len: 1 };
            if (sp.len > 1 && ri > sp.start) {
              return;
            }
            const rowSpanAttr = sp.len > 1 ? ` rowspan="${sp.len}"` : '';
            const v = value(c, i);
            const isTop = sp.start === 0;
            const isBottom = (sp.start + sp.len) === renderRows.length;
            const borderStyle = `${isTop ? 'border-top:2px solid #0b4f7a;' : ''}${isBottom ? 'border-bottom:2px solid #0b4f7a;' : ''}`;
            const bg = si % 2 ? '#f7fafc' : '#ffffff';
            cellParts.push(`<td${rowSpanAttr} style="padding:6px 9px;border:1px solid #d8e3ea;${borderStyle}background:${bg};font-size:12px;color:#243e50;text-align:center;vertical-align:middle;white-space:nowrap">${esc(v) || '&nbsp;'}</td>`);
          });
          rows += `<tr>${cellParts.join('')}</tr>`;
        });
      });
      if (n > 0) {
        totalRows += n;
        totalShips += ships.length;
        const dirHeader = dirs.length > 1 ? `<div style="font-weight:700;color:#0b4f7a;margin:12px 0 6px 0;font-size:13px">${dirLabel(d)}</div>` : '';
        tablesHtml.push(`${dirHeader}<table role="presentation" cellpadding="0" cellspacing="0" dir="${AR() ? 'rtl' : 'ltr'}" style="border-collapse:collapse;font-family:Segoe UI,Arial,sans-serif;border:2px solid #0b4f7a;margin-bottom:14px"><thead><tr>${pick.map(th).join('')}</tr></thead><tbody>${rows}</tbody></table>`);
      }
    });

    if (!totalRows) throw new Error(t('entry').nothingToSave);
    return { rows: totalRows, ships: totalShips, html: tablesHtml.join('') };
  }
  function mailWrap({ intro, content, footer }) {
    const brand = '#0b4f7a', aqua = '#22b8cf';
    return `<!doctype html><html><body style="margin:0;background:#f2f6f9;font-family:Segoe UI,Arial,sans-serif" dir="${AR() ? 'rtl' : 'ltr'}">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f9;padding:18px 0"><tr><td align="center">
    <table role="presentation" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;max-width:96%;box-shadow:0 4px 18px rgba(6,42,74,.08)">
      <tr><td style="background:${brand};padding:16px 22px;border-radius:12px 12px 0 0"><span style="font-size:20px;font-weight:800;color:#fff">ILS EGYPT · FTL AIRPORT</span><span style="float:${AR() ? 'left' : 'right'};color:#a9dce6;font-size:12px;padding-top:6px">${esc(new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }))}</span></td></tr>
      <tr><td style="padding:16px 22px 10px;color:#2b3a4a;font-size:14px;line-height:1.6">${intro}</td></tr>
      <tr><td style="padding:4px 22px 16px;overflow:auto">${content}</td></tr>
      <tr><td style="padding:12px 22px 18px;color:#66788c;font-size:12px;border-top:1px solid #e6eef3">${footer}</td></tr>
      <tr><td style="height:6px;background:${aqua};border-radius:0 0 12px 12px"></td></tr>
    </table></td></tr></table></body></html>`;
  }
  /* everything the user chose → one message object; providers never look at the UI */
  async function buildMailMessage() {
    const to = parseMailRecipients($('mTo').value), subject = $('mSubject').value.trim();
    if (!subject) throw new Error(AR() ? 'اكتب موضوع الإيميل.' : 'Enter an email subject.');
    const note = $('mNote').value, d = mailDirection(), date = new Date().toISOString().slice(0, 10);
    const noteHtml = esc(note).replace(/\n/g, '<br>');
    const message = { kind: MAIL_KIND, direction: d, to, subject, text: note, html: '', inline: [], attachments: [], meta: {} };
    if (MAIL_KIND === 'table') {
      const d = $('mBody')?.dataset.dir || mailDirection();
      const effectiveScope = $('mBody')?.dataset.scope || (CURRENT_TAB === 'Delivered' ? 'delivered' : (CURRENT_TAB === 'Inactive' ? 'inactive' : 'active'));
      const picked = pickedTripOptions($('mBody'), 'm', d);
      picked.scope = effectiveScope;
      const table = tableEmailHTML(d, picked);
      message.meta = { rows: table.rows, operations: table.ships, columns: picked.columns };
      const dirTitle = d === 'ALL' ? (AR() ? 'كل الشحنات' : 'All Shipments') : dirLabel(d);
      message.text = `${note}\n\n${dirTitle} · ${table.ships} ${AR() ? 'عملية' : 'operations'} · ${table.rows} ${AR() ? 'صف' : 'rows'}`;
      message.html = mailWrap({ intro: noteHtml, content: `<div style="font-size:12px;color:#66788c;margin-bottom:6px">${esc(dirTitle)} · ${table.ships} ${AR() ? 'عملية' : 'operations'} · ${table.rows} ${AR() ? 'صف' : 'rows'}</div>${table.html}`, footer: esc(t('mail').footer) });
    } else {
      const ids = [...root.querySelectorAll('.mCh:checked')].map(x => x.value), withKpis = $('mKpis').checked, withIns = $('mInsights').checked;
      const kpiRows = withKpis ? visibleKpis().map(([id, l, sub]) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #e6eef3;color:#4b5b6b;font-size:13px">${esc($(l).textContent)}</td><td style="padding:6px 10px;border-bottom:1px solid #e6eef3;font-weight:700;color:#12263a;font-size:13px;text-align:${AR() ? 'left' : 'right'}">${esc($(id).textContent)}</td><td style="padding:6px 10px;border-bottom:1px solid #e6eef3;color:#8a9aaa;font-size:11px">${esc($(sub).textContent)}</td></tr>`).join('') : '';
      const ins = withIns ? [...$('insightList').children].map(li => `<li style="margin:3px 0">${li.innerHTML}</li>`).join('') : '';
      let imgs = '';
      for (const id of ids) {
        if (!visibleCharts().includes(id)) continue; const ch = charts[id], card = $(id).closest('.card'), title = card.querySelector('h3').textContent;
        const prev = ch.options.devicePixelRatio; ch.options.devicePixelRatio = 2; ch.resize(); ch.update('none'); const dataUrl = ch.toBase64Image('image/png', 1); ch.options.devicePixelRatio = prev; ch.resize(); ch.update('none');
        const blob = await (await fetch(dataUrl)).blob(), cid = `chart-${id}@ils`; message.inline.push({ cid, name: `${id}.png`, mime: 'image/png', blob });
        imgs += `<div style="margin:12px 0"><div style="font-weight:700;color:#0b4f7a;font-size:13px;margin-bottom:5px">${esc(title)}</div><img src="cid:${cid}" width="620" alt="${esc(title)}" style="display:block;max-width:100%;border:1px solid #e6eef3;border-radius:8px"></div>`;
      }
      const filters = [dateBasisLabel(), ...filterParts()].join(' · ');
      message.html = mailWrap({ intro: noteHtml, content: `<div style="font-size:12px;color:#66788c;margin-bottom:8px">${esc(dirLabel(d))} · ${fmtN(VIEW.length)} ${AR() ? 'صف نقل' : 'transport rows'} · ${esc(filters)}</div>${kpiRows ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e6eef3;border-radius:10px;margin-bottom:10px">${kpiRows}</table>` : ''}${ins ? `<ul style="padding-inline-start:18px;color:#2b3a4a;font-size:13px">${ins}</ul>` : ''}${imgs}`, footer: esc(t('mail').footer) });
      message.text = `${note}\n\n${dirLabel(d)} · ${filters}\n` + (withKpis ? visibleKpis().map(([id, l]) => `${$(l).textContent}: ${$(id).textContent}`).join('\n') : '');
      if ($('mPdf')?.checked) message.attachments.push({ name: `ILS_${d}_${date}.pdf`, mime: 'application/pdf', blob: await dashboardPdfBlob({ charts: ids, kpis: withKpis, insights: withIns }) });
      message.meta = { charts: ids, kpis: withKpis, insights: withIns };
    }
    return message;
  }
  /* Microsoft Graph provider: HTML body, inline images, file attachments (upload session above 3 MB) */
  async function createOutlookDraft({ token, message }) {
    const root = 'https://graph.microsoft.com/v1.0', H = { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' };
    const small = message.attachments.filter(a => a.blob.size < 3 * 1024 * 1024), large = message.attachments.filter(a => a.blob.size >= 3 * 1024 * 1024);
    const attachments = [...await Promise.all(message.inline.map(async a => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: a.name, contentType: a.mime, contentId: a.cid, isInline: true, contentBytes: await blobToB64(a.blob) }))),
    ...await Promise.all(small.map(async a => ({ '@odata.type': '#microsoft.graph.fileAttachment', name: a.name, contentType: a.mime, contentBytes: await blobToB64(a.blob) })))];
    const draft = { subject: message.subject, body: { contentType: 'HTML', content: message.html }, toRecipients: message.to.map(address => ({ emailAddress: { address } })), attachments };
    const response = await fetch(root + '/me/messages', { method: 'POST', headers: H, body: JSON.stringify(draft) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(AR() ? 'تعذّر إنشاء المسودة في Outlook. راجع اتصال الحساب وصلاحية إنشاء المسودات.' : 'Outlook could not create the draft. Check the account connection and draft permissions.');
    for (const a of large) {
      if (!result.id) throw new Error(AR() ? 'المسودة اتعملت، لكن المرفق محتاج تضافه من مسودات Outlook.' : 'Draft created. Add the attachment from Outlook Drafts.');
      const sessionResponse = await fetch(`${root}/me/messages/${encodeURIComponent(result.id)}/attachments/createUploadSession`, { method: 'POST', headers: H, body: JSON.stringify({ AttachmentItem: { attachmentType: 'file', name: a.name, size: a.blob.size, contentType: a.mime } }) });
      const session = await sessionResponse.json().catch(() => ({})); if (!sessionResponse.ok || !session.uploadUrl) throw new Error(AR() ? 'المسودة اتعملت لكن رفع المرفق فشل. افتحها من مسودات Outlook.' : 'Draft created but attachment upload failed. Open it in Outlook Drafts.');
      const chunk = 320 * 1024; for (let start = 0; start < a.blob.size; start += chunk) {
        const end = Math.min(start + chunk, a.blob.size);
        const upload = await fetch(session.uploadUrl, { method: 'PUT', headers: { 'Content-Range': `bytes ${start}-${end - 1}/${a.blob.size}` }, body: a.blob.slice(start, end) });
        if (!upload.ok) throw new Error(AR() ? 'المسودة اتعملت لكن رفع المرفق توقف. راجعها من Outlook.' : 'Draft created but attachment upload stopped. Check Outlook Drafts.');
      }
    }
    if (!result.webLink) throw new Error(AR() ? 'تم إنشاء المسودة. افتح مجلد المسودات في Outlook.' : 'Draft created. Open your Drafts folder in Outlook.');
    const url = new URL(result.webLink);
    if (url.protocol !== 'https:' || !['outlook.office.com', 'outlook.office365.com', 'outlook.live.com'].includes(url.hostname)) throw new Error('Draft created. Open Outlook Drafts to review it.');
    return url.href;
  }
  /* .eml provider: multipart/mixed → multipart/related → multipart/alternative (text + HTML), inline cid images, attachments; X-Unsent opens it as a draft */
  async function downloadMailDraft(message) {
    const b64text = s => btoa(unescape(encodeURIComponent(s))).match(/.{1,76}/g)?.join('\r\n') || '';
    const b64blob = async blob => (await blobToB64(blob)).match(/.{1,76}/g)?.join('\r\n') || '';
    const bnd = p => `ILS-${p}-${Math.random().toString(36).slice(2)}`, bMixed = bnd('mixed'), bRelated = bnd('related'), bAlt = bnd('alt');
    const subject = `=?UTF-8?B?${btoa(unescape(encodeURIComponent(message.subject)))}?=`;
    let eml = `To: ${message.to.join(', ')}\r\nSubject: ${subject}\r\nDate: ${new Date().toUTCString()}\r\nMIME-Version: 1.0\r\nX-Unsent: 1\r\nX-ILS-Kind: ${message.kind}\r\nContent-Type: multipart/mixed; boundary="${bMixed}"\r\n\r\n`;
    eml += `--${bMixed}\r\nContent-Type: multipart/related; boundary="${bRelated}"; type="multipart/alternative"\r\n\r\n`;
    eml += `--${bRelated}\r\nContent-Type: multipart/alternative; boundary="${bAlt}"\r\n\r\n`;
    eml += `--${bAlt}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64text(message.text)}\r\n`;
    eml += `--${bAlt}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${b64text(message.html)}\r\n--${bAlt}--\r\n`;
    for (const a of message.inline) eml += `--${bRelated}\r\nContent-Type: ${a.mime}; name="${a.name}"\r\nContent-ID: <${a.cid}>\r\nContent-Disposition: inline; filename="${a.name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${await b64blob(a.blob)}\r\n`;
    eml += `--${bRelated}--\r\n`;
    for (const a of message.attachments) eml += `--${bMixed}\r\nContent-Type: ${a.mime}; name="${a.name}"\r\nContent-Disposition: attachment; filename="${a.name}"\r\nContent-Transfer-Encoding: base64\r\n\r\n${await b64blob(a.blob)}\r\n`;
    eml += `--${bMixed}--\r\n`;
    saveBlob(new Blob([eml], { type: 'message/rfc822' }), MAIL_FILE_NAME());
  }
  async function sendMail() {
    const rawTo = ($('mTo')?.value || '').trim();
    if (!rawTo) {
      showToAlert();
      return;
    }
    if (MAIL_BUSY) return; let popup; const P = mailProvider();
    try {
      MAIL_BUSY = true; $('mGo').disabled = true; $('mStatus').textContent = AR() ? 'جاري تجهيز الإيميل…' : 'Preparing the email…';
      if (P.id === 'outlook') { popup = window.open('about:blank', '_blank'); if (!popup) throw new Error(AR() ? 'اسمح بفتح نافذة Outlook وحاول مرة أخرى.' : 'Allow the Outlook popup and try again.'); popup.opener = null; }
      const message = await buildMailMessage();
      const url = await P.compose(message);
      if (popup) { if (url) popup.location.href = url; else popup.close(); }
      else if (url) window.open(url, '_blank', 'noopener');
      $('mStatus').textContent = P.done(); MAIL_TO_LAST = $('mTo').value;
    } catch (e) { if (popup && !popup.closed) popup.close(); $('mStatus').textContent = e.message; }
    finally { MAIL_BUSY = false; $('mGo').disabled = false; }
  }
  async function copyMailForReply() {
    try {
      const d = $('mBody')?.dataset.dir || mailDirection();
      const effectiveScope = $('mBody')?.dataset.scope || (CURRENT_TAB === 'Delivered' ? 'delivered' : (CURRENT_TAB === 'Inactive' ? 'inactive' : 'active'));
      let replyHtml = '', plainText = '';
      const note = ($('mNote')?.value || '').trim();
      const noteHtml = esc(note).replace(/\n/g, '<br>');

      if (MAIL_KIND === 'table') {
        const picked = pickedTripOptions($('mBody'), 'm', d);
        picked.scope = effectiveScope;
        const table = tableEmailHTML(d, picked);
        if (!table || !table.rows) {
          toast(AR() ? 'يرجى اختيار شحنة وعمود واحد على الأقل.' : 'Please select at least one shipment and column.');
          return;
        }
        const dirTitle = d === 'ALL' ? (AR() ? 'كل الشحنات' : 'All Shipments') : dirLabel(d);
        replyHtml = `
          <div style="font-family:'Segoe UI',Calibri,-apple-system,Arial,sans-serif;font-size:13px;color:#1e293b;line-height:1.5;">
            ${noteHtml ? `<div style="font-size:14px;margin-bottom:16px;color:#0f172a;">${noteHtml}</div>` : ''}
            <div style="font-size:12px;color:#66788c;margin-bottom:8px;">${esc(dirTitle)} · ${table.ships} ${AR() ? 'عملية' : 'operations'} · ${table.rows} ${AR() ? 'صف' : 'rows'}</div>
            ${table.html}
          </div>
        `;
        plainText = note ? `${note}\n\n[Table content copied]` : '[Table content copied]';
      } else {
        const message = await buildMailMessage();
        replyHtml = message.html;
        plainText = message.text;
      }

      if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([replyHtml], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        const listener = (e) => {
          e.clipboardData.setData('text/html', replyHtml);
          e.clipboardData.setData('text/plain', plainText);
          e.preventDefault();
        };
        document.addEventListener('copy', listener);
        document.execCommand('copy');
        document.removeEventListener('copy', listener);
      }

      const copyBtn = $('mCopyReply');
      if (copyBtn) {
        const origContent = copyBtn.innerHTML;
        copyBtn.classList.add('copied');
        copyBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span>${AR() ? 'تم النسخ!' : 'Copied!'}</span>
        `;
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyBtn.innerHTML = origContent;
        }, 2500);
      }

      toast(
        AR()
          ? 'تم نسخ الجدول بنجاح! افتح الآوتلوك واضغط Reply ثم الصق (Ctrl + V).'
          : 'Copied! Open Outlook, click Reply, and paste (Ctrl + V).',
        'success'
      );
    } catch (err) {
      console.error('Failed to copy for reply:', err);
      toast(AR() ? 'تعذر نسخ الجدول' : 'Failed to copy to clipboard', 'error');
    }
  }
  /* PDF stays in memory. Text is painted by the browser to preserve Arabic
     shaping; chart images are included in the PDF, never substituted for it. */
  async function dashboardPdfBlob({ charts: ids = visibleCharts(), kpis = true, insights = true } = {}) {
    const pdf = await PDFLib.PDFDocument.create(), W = 1600, H = 1132, margin = 80; let canvas, ctx, y, pageNo = 0;
    const font = 'Arial, sans-serif', rtl = AR();
    const text = (s, x, yy, size = 24, color = '#16324a', bold = false) => { ctx.font = `${bold ? 'bold ' : ''}${size}px ${font}`; ctx.fillStyle = color; ctx.direction = rtl ? 'rtl' : 'ltr'; ctx.textAlign = rtl ? 'right' : 'left'; ctx.fillText(String(s), x, yy); };
    function lines(s, width, size = 24) { ctx.font = `${size}px ${font}`; const result = []; for (const para of String(s).split('\n')) { let line = ''; for (const word of para.split(/\s+/)) { const n = line ? line + ' ' + word : word; if (ctx.measureText(n).width > width && line) { result.push(line); line = word; } else line = n; } result.push(line); } return result; }
    function newPage(cover = false) { canvas = document.createElement('canvas'); canvas.width = W; canvas.height = H; ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H); y = 150; pageNo++; if (!cover) { ctx.fillStyle = '#062a4a'; ctx.fillRect(0, 0, W, 96); text(`ILS · ${dirLabel(MODE())}`, rtl ? W - margin : margin, 62, 30, '#fff', true); } }
    async function finish() { text(String(pageNo), rtl ? margin : W - margin, 1092, 19, '#64748b'); const bytes = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .88)); const img = await pdf.embedJpg(await bytes.arrayBuffer()); const p = pdf.addPage([841.89, 595.28]); p.drawImage(img, { x: 0, y: 0, width: 841.89, height: 595.28 }); }
    async function ensure(h) { if (y + h > H - 90) { await finish(); newPage(); } }
    newPage(true); ctx.fillStyle = '#062a4a'; ctx.fillRect(0, 0, W, H); ctx.fillStyle = '#0e7c86'; ctx.fillRect(0, H - 26, W, 26);
    const logo = $('logoImg'); if (logo.complete && logo.naturalWidth) ctx.drawImage(logo, margin, 80, 190, 190 * logo.naturalHeight / logo.naturalWidth);
    text(AR() ? 'تقرير الشحن الجوي' : 'AIR FREIGHT REPORT', rtl ? W - margin : margin, 350, 55, '#fff', true);
    text(dirLabel(MODE()), rtl ? W - margin : margin, 430, 42, '#22b8cf', true);
    text(new Date().toISOString().slice(0, 10), rtl ? W - margin : margin, 500, 26, '#cbd5e1');
    text(`${fmtN(VIEW.length)} ${AR() ? 'نقلة' : 'trips'}`, rtl ? W - margin : margin, 600, 40, '#fff', true);
    let cy = 715; for (const l of lines([dateBasisLabel(), ...filterParts()].join(' · '), W - margin * 2, 24)) { text(l, rtl ? W - margin : margin, cy, 24, '#d4edf1'); cy += 36; }
    await finish(); newPage();
    if (kpis) {
      for (const [id, label, sub] of visibleKpis()) {
        const detail = lines($(sub).textContent, W - margin * 2 - 48, 21), h = 114 + detail.length * 27; await ensure(h);
        ctx.fillStyle = '#f1f7fa'; ctx.fillRect(margin, y - 25, W - margin * 2, h - 14);
        text($(label).textContent, rtl ? W - margin - 24 : margin + 24, y + 6, 23, '#52667a');
        text($(id).textContent, rtl ? W - margin - 24 : margin + 24, y + 51, 35, '#062a4a', true);
        detail.forEach((l, i) => text(l, rtl ? W - margin - 24 : margin + 24, y + 86 + i * 27, 21, '#52667a')); y += h;
      }
    }
    if (insights) { for (const li of $('insightList').children) { const ls = lines(li.textContent, W - margin * 2, 24); await ensure(ls.length * 34 + 24); ls.forEach(l => { text(l, rtl ? W - margin : margin, y, 24); y += 34; }); y += 24; } }
    for (const id of ids) {
      if (!visibleCharts().includes(id)) continue; const card = $(id).closest('.card'), title = card.querySelector('h3').textContent, sub = card.querySelector('.sub').textContent;
      const titleLines = lines(title, W - margin * 2, 30), subLines = lines(sub, W - margin * 2, 21); const ch = charts[id], prev = ch.options.devicePixelRatio; ch.options.devicePixelRatio = 2; ch.resize(); ch.update('none');
      const im = new Image(); im.src = ch.toBase64Image('image/png', 1); await im.decode(); ch.options.devicePixelRatio = prev; ch.resize(); ch.update('none');
      const iw = W - margin * 2, ih = Math.min(600, iw * im.height / im.width), h = ih + titleLines.length * 38 + subLines.length * 28 + 60; await ensure(h);
      titleLines.forEach(l => { text(l, rtl ? W - margin : margin, y, 30, '#062a4a', true); y += 38; }); subLines.forEach(l => { text(l, rtl ? W - margin : margin, y, 21, '#52667a'); y += 28; });
      ctx.drawImage(im, margin, y, iw, ih); y += ih + 45;
    }
    if (y > 150) await finish(); return new Blob([await pdf.save()], { type: 'application/pdf' });
  }
  function emailEntry() {
    const effectiveScope = CURRENT_TAB === 'Delivered' ? 'delivered' : (CURRENT_TAB === 'Inactive' ? 'inactive' : 'active');
    openMail('table', effectiveScope);
  }

  /* ---------- the panel the developer reads ---------- */
  function openDev() {
    const D = t('dev');
    $('dTitleTxt').textContent = D.title;
    const esc = x => String(x).replace(/</g, '&lt;');
    const schema = ilsSchema('Import');
    const rows = schema.map(f => `<tr><td><code>${esc(f.column)}</code></td><td><code>${f.field}</code></td><td>${f.type}</td>
       <td>${f.required ? '✓' : ''}</td><td>${f.dropdown ? `<code>${f.dropdown}</code>` : ''}</td></tr>`).join('');
    const code = JSON.stringify(ilsPayloadSample(), null, 2);
    const hooks = `// Pass this object to <FtlDashboard api={...} /> (see src/api/httpApi.js).
  const api = {
    getCurrentUser: () => request('GET','/me'),
    load: () => request('GET','/workspace'),
    saveWorkspace: p => request('PUT','/workspace',p),
    createOperation: p => request('POST','/operations',p),
    importTrips: p => request('POST','/imports',p),
    loadMaster: () => request('GET','/master'),
    addMaster: (list,value) => request('POST','/master/'+encodeURIComponent(list),{value}),
    loadPermissions: () => request('GET','/permissions'),
    updateShipmentStatus: (ref,status,version) => request('PATCH','/shipments/'+encodeURIComponent(ref)+'/status',{status,version}),
    authorizeDeleteShipment: async ref => (await request('GET','/shipments/'+encodeURIComponent(ref)+'/permissions')).delete_shipments===true,
    deleteShipment: (ref,version) => request('DELETE','/shipments/'+encodeURIComponent(ref),{version})
  };
  async function request(method,path,body){
    const r=await fetch('/api'+path,{method,credentials:'include',headers:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
    if(!r.ok){const e=new Error((await r.json().catch(()=>({}))).message||r.statusText);e.status=r.status;throw e;}
    return r.status===204?{}:r.json();
  }`;
    const eps = ILS_API_SPEC.endpoints.map(([m, p, d]) => `<tr><td><code>${m}</code></td><td><code>${esc(p)}</code></td><td>${d}</td></tr>`).join('');
    $('dBody').innerHTML = `
     <div class="devsec"><b>${D.s1}</b><p>${D.p1}</p>
       <table class="devtbl"><tr><th>${D.method}</th><th>${D.endpoint}</th><th>${D.purpose}</th></tr>${eps}</table></div>
     <div class="devsec"><b>${D.s2}</b><p>${D.p2}</p>
       <div class="devcode" id="devHooks">${esc(hooks)}</div>
       <button class="devcopy" onclick="__FTL__.devCopy('devHooks')">${D.copy}</button></div>
     <div class="devsec"><b>${D.s3}</b><p>${D.p3}</p>
       <table class="devtbl"><tr><th>${D.colH}</th><th>${D.fieldH}</th><th>${D.typeH}</th><th>${D.reqH}</th><th>${D.listH}</th></tr>${rows}</table></div>
     <div class="devsec"><b>${D.s4}</b><p>${D.p4}</p>
       <div class="devcode" id="devJson">${esc(code)}</div>
       <button class="devcopy" onclick="__FTL__.devCopy('devJson')">${D.copy}</button></div>
     <div class="devsec"><b>${D.s5}</b><p>${D.p5}</p></div>`;
    $('dModal').classList.add('open');
  }
  function devCopy(id) { navigator.clipboard?.writeText($(id).textContent); toast(t('dev').copied); }

  /* ======================= i18n apply / theme / boot ======================= */
  function applyStatic() {
    const L = T[LANG];
    $('hTitle').textContent = L.title; $('hSub').textContent = L.sub; $('hKicker').textContent = L.kicker; $('clearBtn').textContent = L.clear; $('entryBtn').textContent = L.entryBtn; $('dashBtn').textContent = L.dashBtn; $('exportBtn').textContent = L.exportBtn; $('uploadBtn').textContent = L.upload; $('entryUpload').textContent = L.upload;
    $('helpBtn').textContent = L.help; $('langBtn').textContent = L.langBtn;
    if ($('ebarLangText')) $('ebarLangText').textContent = L.langBtn;
    else if ($('ebarLang')) $('ebarLang').textContent = L.langBtn;
    $('panelToggle').textContent = L.fields;
    const E = L.entry;
    if ($('eSaveText')) $('eSaveText').textContent = E.save;
    else if ($('eSave')) $('eSave').textContent = E.save;
    if ($('eMailText')) $('eMailText').textContent = E.mail;
    else if ($('eMail')) $('eMail').textContent = E.mail;
    $('xMail').textContent = t('mail').title; $('eApply').textContent = E.apply;
    if ($('entryView').style.display !== 'none') { TRIP_SEARCH_DIR = null; renderEntry(); }
    ['lClient', 'lTrucker', 'lDest', 'lOper', 'lLine', 'lPort', 'lRisk', 'lBasis', 'lFrom', 'lTo', 'lQuick'].forEach(id => $(id).textContent = L[id]);
    $('lFrom2').textContent = 'POL'; $('lTo2').textContent = 'STATUS'; $('lPort').textContent = 'POD';
    [['lCut', 'kCut'], ['lRoute', 'kRoute']].forEach(([id, k]) => $(id).textContent = L[k]);
    $('fFrom').options[0].text = L.allDest; $('fTo').options[0].text = L.allDest;
    $('lFrom2').textContent = 'POL'; $('lTo2').textContent = 'STATUS'; $('lPort').textContent = 'POD';
    [['lCut', 'kCut'], ['lRoute', 'kRoute']].forEach(([id, k]) => $(id).textContent = L[k]);
    $('fFrom').options[0].text = L.allDest; $('fTo').options[0].text = L.allDest;
    if (DATA.length) syncDirTabs(); else root.querySelectorAll('.dtab').forEach(b => { b.querySelector('.lbl').textContent = b.dataset.dir ? dirLabel(b.dataset.dir) : L.allDir; b.querySelector('.cnt').textContent = ''; });
    syncDateBasis();
    root.querySelector('[data-preset="30"]').textContent = L.last30; root.querySelector('[data-preset="90"]').textContent = L.last90; root.querySelector('[data-preset="all"]').textContent = L.allTime;
    [['fClient', 'allClients'], ['fTrucker', 'allTruckers'], ['fDest', 'allDest'], ['fOper', 'allOper'], ['fLine', 'allLines'], ['fPort', 'allPorts'], ['fRisk', 'allRisk']].forEach(([id, k]) => $(id).options[0].text = L[k]);
    $('resetBtn').textContent = L.reset;
    [['lShip', 'kShip'], ['lOnTime', 'kOnTime'], ['lOffDelay', 'kOffDelay'], ['lTransit', 'kTransit'], ['lDestU', 'kDestU'], ['lPortU', 'kPortU'], ['lTrips', 'kTrips'], ['lCont', 'kCont'], ['lClients', 'kClients'], ['lTruckers', 'kTruckers'], ['lRiskK', 'kRisk'], ['lFree', 'kFree'], ['lOperK', 'kOper'], ['lTrucks', 'kTrucks']].forEach(([id, k]) => $(id).textContent = L[k]);
    $('insH').textContent = L.insH; $('insSub').textContent = L.insSub; $('fieldsTitle').textContent = L.fieldsTitle; $('fieldSearch').placeholder = L.searchFields;
    if (LAST_COUNTS) setCounts(LAST_COUNTS);
    updateTag();
  }
  function toggleLang() {
    LANG = LANG === 'en' ? 'ar' : 'en'; root.dir = LANG === 'ar' ? 'rtl' : 'ltr'; root.lang = LANG; __emit('language', LANG);
    applyStatic(); if (DATA.length) { initFilters(); buildFields(); applyFilters(); }
  }
  function toggleTheme() {
    const h = root, dark = h.getAttribute('data-theme') === 'dark';
    h.setAttribute('data-theme', dark ? 'light' : 'dark'); __emit('theme', dark ? 'light' : 'dark'); $('themeBtn').textContent = dark ? '🌙' : '☀️';
    Chart.defaults.color = getComputedStyle(root).getPropertyValue('--steel').trim(); if (DATA.length) render();
  }
  Chart.defaults.color = getComputedStyle(root).getPropertyValue('--steel').trim();

  /* ===================== AIR FREIGHT ADAPTATION =====================
     Built on the approved Ocean dashboard UI. Only the data model,
     validation, terminology and air-specific business logic change.
     ================================================================ */
  (function () {
    const AIR_COLORS = { g1: '#8F8F8F', g2: '#F07CF2', g3: '#7030A0', g4: '#C00000', g5: '#00B050', g6: '#66FFCC', g7: '#FFC000', g8: '#0070C0' };
    Object.entries(AIR_COLORS).forEach(([k, c]) => GROUPS[k] = { c });
    const st = document.createElement('style'); st.textContent = `
      .ftl-root #eTable th.grp-g7,.ftl-root #eTable td.grp-g7{background:color-mix(in srgb,#FFC000 15%,transparent)}
      .ftl-root #eTable th.grp-g8,.ftl-root #eTable td.grp-g8{background:color-mix(in srgb,#0070C0 10%,transparent)}
      .ftl-root .opf.grp-g7 label{color:#9a6b00}.ftl-root .opf.grp-g8 label{color:#0064aa}
      .ftl-root[data-theme="dark"] .opf.grp-g7 label{color:#ffd45e}.ftl-root[data-theme="dark"] .opf.grp-g8 label{color:#6fb8ef}
      .ftl-root #dtFcl,.ftl-root #fclPanel{display:none!important}
      /* Keep the approved Ocean dashboard geometry unchanged. Air only adds its own column colours. */
      .ftl-root #entryView .opstepper{display:grid;grid-template-columns:32px 64px 32px;align-items:stretch;width:max-content;height:36px;border:1px solid var(--line);border-radius:9px;overflow:hidden;background:var(--card);box-shadow:0 1px 3px rgba(6,42,74,.06)}
      .ftl-root #entryView .opstepper button{width:32px;height:36px;border:0;background:color-mix(in srgb,var(--mist) 58%,var(--card));color:var(--brand-3);font:800 17px/1 var(--disp);cursor:pointer;padding:0;display:flex;align-items:center;justify-content:center;transition:background 0.15s}
      .ftl-root #entryView .opstepper button:hover{background:color-mix(in srgb,var(--aqua) 16%,var(--card))}
      .ftl-root #entryView .opstepper button:focus-visible{outline:2px solid var(--aqua);outline-offset:-2px}
      .ftl-root #entryView .opstepper input{width:64px!important;height:36px!important;min-height:36px!important;padding:2px 4px!important;border:0!important;border-inline:1px solid var(--line)!important;border-radius:0!important;box-shadow:none!important;text-align:center!important;background:var(--card);font-size:14px!important;font-weight:700!important}
      .ftl-root[dir="rtl"] #entryView .opstepper{direction:ltr}

      /* Air labels are longer than Ocean labels; keep the same compact geometry while
         giving every control an identical baseline. */
      .ftl-root #entryView .opgrid{grid-template-columns:repeat(auto-fill,minmax(108px,1fr));gap:4px 6px;align-items:start}
      .ftl-root #entryView .opf{min-width:0;display:grid;grid-template-rows:28px 27px;gap:2px}
      .ftl-root #entryView .opf>label{height:28px;min-height:28px!important;display:flex;align-items:flex-start;justify-content:space-between;gap:5px;overflow:hidden;line-height:1.08!important}
      .ftl-root #entryView .opf .oplabel{min-width:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-size:9.6px;font-weight:700;color:inherit}
      .ftl-root #entryView .opf .optype{flex:0 0 auto;white-space:nowrap;margin:0!important;font-size:8.7px!important;line-height:1.1;color:var(--steel);font-weight:500}
      .ftl-root #entryView .opf>input,.ftl-root #entryView .opf>select,.ftl-root #entryView .opf>.datetime-control{height:27px;min-height:27px;margin:0;align-self:end;box-sizing:border-box}
      .ftl-root #entryView .opf>.datetime-control>input{height:27px!important;min-height:27px!important;margin:0}
      .ftl-root #entryView .opf>.datetime-control>.pickdate{height:27px;min-width:27px;display:flex;align-items:center;justify-content:center;padding:0 5px}
      .ftl-root #entryView .opfoot{align-items:flex-end;gap:16px}
      .ftl-root #entryView .opcount{gap:4px}
      .ftl-root #entryView .opcount>label{font-size:11.5px;font-weight:700;color:var(--steel);margin-bottom:2px}
      .ftl-root #entryView #opCreate, .ftl-root #entryView .opCreate{height:36px;padding:0 22px;border-radius:9px;font-size:13px;font-weight:700;display:inline-flex;align-items:center;justify-content:center;box-shadow:0 2px 5px rgba(11,79,122,0.22);transition:all .15s ease}
      .ftl-root #entryView #opCreate:hover{transform:translateY(-1px);box-shadow:0 4px 8px rgba(11,79,122,0.3)}
      .ftl-root[dir="rtl"] #entryView .opf>label{text-align:right}
      .ftl-root #entryView .reqmark{color:#c62828;font-size:10px;line-height:1;margin-inline-start:2px}

      /* FTL Airport: only two counters above the table, so the form is one compact strip and the grid takes the page */
      .ftl-root #entryView .opwrap{margin-bottom:8px}
      .ftl-root #entryView .opcard{padding:8px 14px 10px;border-radius:12px}
      .ftl-root #entryView .ophead{margin-bottom:0;align-items:center}
      .ftl-root #entryView .opfoot{margin-top:6px;padding-top:0;border-top:0;gap:16px;align-items:flex-end}
      .ftl-root #entryView .opcount{gap:4px}
      .ftl-root #entryView .opcount>label{font-size:11.5px;font-weight:700;color:var(--steel);margin-bottom:2px}
      .ftl-root #entryView .ophint{font-size:12px;color:var(--steel);margin-bottom:6px}
      .ftl-root #entryView .ebar{margin-bottom:12px}
      .ftl-root #entryView .sysbar{margin-bottom:0}
      .ftl-root #entryView .triptools{padding:0;margin-bottom:0;border-radius:0;gap:8px}
      .ftl-root #entryView .trip-page{margin-bottom:8px}
      .ftl-root #entryView .egrid{max-height:none;min-height:260px}
      .ftl-root .date-popover{position:fixed;z-index:9999;width:252px;padding:8px;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:11px;box-shadow:0 12px 32px rgba(6,42,74,.2);font-size:12px;direction:ltr}
      .ftl-root[dir="rtl"] .date-popover{direction:rtl}
      .ftl-root .date-popover .dp-head{display:flex;align-items:center;gap:3px;margin-bottom:5px}
      .ftl-root .date-popover .dp-head b{flex:1;text-align:center;font-size:12.5px}
      .ftl-root .date-popover .dp-head button,.ftl-root .date-popover .dp-foot button{border:1px solid var(--line);background:var(--card);color:var(--navy);border-radius:6px;height:24px;min-width:24px;padding:0 6px;cursor:pointer;font:inherit}
      .ftl-root .date-popover .dp-dow,.ftl-root .date-popover .dp-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:2px}
      .ftl-root .date-popover .dp-dow span{text-align:center;font-size:10px;color:var(--steel);font-weight:700;padding:2px 0}
      .ftl-root .date-popover .dp-grid button{border:1px solid transparent;background:transparent;color:var(--ink);border-radius:6px;height:26px;cursor:pointer;font:inherit;font-variant-numeric:tabular-nums}
      .ftl-root .date-popover .dp-grid button:hover{background:color-mix(in srgb,var(--aqua) 15%,var(--card))}
      .ftl-root .date-popover .dp-grid button.today{border-color:var(--aqua)}
      .ftl-root .date-popover .dp-grid button.sel{background:var(--brand-3,#0b4f7a);color:#fff}
      .ftl-root .date-popover .dp-foot{display:flex;justify-content:flex-end;gap:4px;margin-top:6px}
      .ftl-root .trksep, .ftl-root .trksep-line {display:none!important}


      /* Keep every dashboard-header action visible, including Fields, at normal laptop widths. */
      .ftl-root header>.vdiv+div{min-width:0;flex:0 1 auto}
      .ftl-root header>.spacer{min-width:6px}
      @media(max-width:1700px){
        .ftl-root header{gap:7px;padding-inline:14px}
        .ftl-root .logo img{height:42px}
        .ftl-root .vdiv{margin:0 1px}
        .ftl-root .h-title{font-size:16.5px}
        .ftl-root .h-sub{font-size:10.8px;max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .ftl-root .h-kicker{gap:7px;font-size:8.4px;letter-spacing:.22em}
        .ftl-root[dir="rtl"] .h-kicker{font-size:10px}
        .ftl-root .h-kicker .glyph{width:36px}
        .ftl-root .hbtn{padding:7px 9px;font-size:11.4px;border-radius:9px}
        .ftl-root .tag{padding:5px 9px;font-size:10.8px}
      }
      @media(max-width:1480px){
        .ftl-root header{gap:5px;padding-inline:10px}
        .ftl-root .logo img{height:38px}
        .ftl-root .h-title{font-size:15px}
        .ftl-root .h-sub{display:none}
        .ftl-root .h-kicker{font-size:7.7px;letter-spacing:.16em;margin-bottom:2px}
        .ftl-root .h-kicker .glyph{width:31px}
        .ftl-root .hbtn{padding:6px 7px;font-size:10.5px}
        .ftl-root .tag{padding:5px 7px;font-size:10.2px}
        .ftl-root #uploadBtn{max-width:128px;overflow:hidden;text-overflow:ellipsis}
      }
      @media(max-width:1260px){
        .ftl-root .h-kicker span{display:none}
        .ftl-root .h-kicker .glyph{width:28px}
        .ftl-root .h-title{font-size:14px}
        .ftl-root .hbtn{padding:6px;font-size:10px}
        .ftl-root #dataTag{display:none!important}
      }
    `; root.appendChild(st);

    /* FTL Airport layout
       · Top form  = mandatory operation (MAWB-level) inputs → locked in the table, merged over the operation.
       · Shipment Number / HAWB / Certificate Number are completed in the table (one per shipment).
       · Truck, driver, gate and Latest Updates are one per truck.
       Rows = Number of Shipments × Trucks. */
    /* Columns follow the approved Air Import / Air Export sheet exactly (Shipment Type removed).
       Only Number of Shipments and the Trucks count are entered in the form; every other cell is completed in the table. */
    const TRUCK_COLS = [
      { k: 'trucker', h: 'Transporter', ar: 'شركة النقل', t: 'list', g: 'g6', w: 280, src: 'trucker' },
      { k: 'truckType', h: 'Truck Type', ar: 'نوع السيارة', t: 'list', g: 'g6', w: 165, src: 'truckType' },
      { k: 'cntr', h: 'Truck No.', ar: 'رقم السيارة', t: 'text', g: 'g6', w: 270 },
      { k: 'loadedPackages', h: 'Loaded Pkgs', ar: 'الطرود المحملة', t: 'num', g: 'g6', w: 130 },
      { k: 'loadStatus', h: 'Load Status', ar: 'حالة التحميل', t: 'text', g: 'g6', auto: true, w: 135 },
      { k: 'driver', h: 'Driver', ar: 'السائق', t: 'text', g: 'g6', w: 165 },
      { k: 'mob', h: 'Driver Mobile', ar: 'رقم هاتف السائق', t: 'text', g: 'g6', w: 170 },
      { k: 'gateIn', h: 'Gate In Date', ar: 'تاريخ دخول البوابة', t: 'date', g: 'g7', w: 145 },
      { k: 'gateInT', h: 'Gate In Time', ar: 'وقت دخول البوابة', t: 'time', g: 'g7', w: 135 },
      { k: 'gateOut', h: 'Gate Out Date', ar: 'تاريخ خروج البوابة', t: 'date', g: 'g7', w: 145 },
      { k: 'gateOutT', h: 'Gate Out Time', ar: 'وقت خروج البوابة', t: 'time', g: 'g7', w: 135 },
      { k: 'updates', h: 'Latest Updates', ar: 'آخر التحديثات', t: 'upd', g: 'g7', auto: true, w: 260 },
      { k: 'invRcv', h: 'Invoices Received Date', ar: 'تاريخ استلام الفواتير', t: 'date', g: 'g8', w: 190 },
      { k: 'transInv', h: 'Transporter Invoice No.', ar: 'رقم فاتورة الناقل', t: 'text', g: 'g8', w: 175 },
      { k: 'missDoc', h: 'Missing Docs', ar: 'المستندات الناقصة', t: 'text', g: 'g8', w: 145 },
      { k: 'missRcv', h: 'Missing Docs Receive Date', ar: 'تاريخ استلام المستندات الناقصة', t: 'date', g: 'g8', w: 220 },
      { k: 'status', h: 'Status', ar: 'حالة الشحنة', t: 'text', g: 'g8', auto: true, uniq: true, w: 155 }
    ];
    const HEAD_COLS = (mawb, clearance) => [
      { k: 'vol', h: 'Number of Shipments', ar: 'عدد الشحنات', t: 'num', g: 'g1', op: true, uniq: true, w: 165 },
      { k: 'shipNo', h: 'Shipment Number', ar: 'رقم الشحنة', t: 'text', g: 'g1', w: 160 },
      ...(clearance ? [{ k: 'clrType', h: 'Clearance Type', ar: 'نوع التخليص', t: 'list', g: 'g1', w: 140, src: 'clrType' }] : []),
      { k: 'client', h: 'Client', ar: 'العميل', t: 'list', g: 'g1', w: 320, src: 'client' },
      { k: mawb, h: 'MAWB', ar: 'البوليصة الرئيسية', t: 'text', g: 'g2', w: 145 },
      { k: 'hawb', h: 'HAWB', ar: 'البوليصة الفرعية', t: 'text', g: 'g2', w: 145 },
      { k: 'cert', h: 'Certificate Number', ar: 'رقم الشهادة', t: 'text', g: 'g2', w: 170, src: 'cert', combo: true },
      ...(clearance ? [{ k: 'customs', h: 'Customs Area', ar: 'منطقة الجمارك', t: 'list', g: 'g2', w: 185, src: 'customs' }] : []),
      { k: 'packages', h: 'Packages', ar: 'عدد الطرود', t: 'num', g: 'g3', w: 115 },
      { k: 'weight', h: 'Weight', ar: 'الوزن', t: 'num', g: 'g3', w: 115 },
      { k: 'commodity', h: 'Commodity', ar: 'نوع البضاعة', t: 'text', g: 'g3', w: 165 },
      { k: 'cbm', h: 'CBM', ar: 'الحجم بالمتر المكعب', t: 'num', g: 'g3', w: 105 }
    ];
    const imp = [...HEAD_COLS('bl', false),
    { k: 'line', h: 'Import Terminal', ar: 'محطة الاستيراد', t: 'list', g: 'g4', w: 290, src: 'line' },
    { k: 'dest', h: 'Destination', ar: 'الوجهة', t: 'list', g: 'g4', w: 230, src: 'dest' },
    { k: 'aod', h: 'AOD', ar: 'مطار الوصول', t: 'list', g: 'g4', w: 140, src: 'aod' },
    { k: 'arrDate', h: 'Arrival Date', ar: 'تاريخ الوصول', t: 'date', g: 'g5', w: 145 },
    { k: 'arrTime', h: 'Arrival Time', ar: 'وقت الوصول', t: 'time', g: 'g5', w: 135 },
    ...TRUCK_COLS.map(c => ({ ...c }))];
    const exp = [...HEAD_COLS('booking', true),
    { k: 'line', h: 'Export Terminal', ar: 'محطة التصدير', t: 'list', g: 'g4', w: 290, src: 'line' },
    { k: 'dest', h: 'Destination', ar: 'الوجهة', t: 'list', g: 'g4', w: 230, src: 'dest' },
    { k: 'reqDate', h: 'Required Arrival Date', ar: 'تاريخ الوصول المطلوب', t: 'date', g: 'g5', w: 175 },
    { k: 'reqTime', h: 'Required Arrival Time', ar: 'وقت الوصول المطلوب', t: 'time', g: 'g5', w: 175 },
    ...TRUCK_COLS.map(c => ({ ...c }))];
    COLS.Import.splice(0, COLS.Import.length, ...imp); COLS.Export.splice(0, COLS.Export.length, ...exp);
    /* merge levels
       op  – one cell for the whole operation: Number of Shipments, Movement Type, Status
       shp – one cell per shipment: every other shipment column
       trk – one cell per truck: Transporter (merged with an Un-merge option), Truck Type, Truck No., Driver, Driver Mobile,
             Gate In / Gate Out (date & time) and Latest Updates
       row – one cell per row: Arrival Date / Arrival Time, Load Status, Loaded Pkgs */
    FIXED_MERGE.Import = new Set(['vol', 'movement', 'status']); FIXED_MERGE.Export = new Set(['vol', 'movement', 'status']);
    MERGE_LEVEL.trk = new Set(['trucker', 'truckType', 'cntr', 'driver', 'mob', 'gateIn', 'gateInT', 'gateOut', 'gateOutT', 'updates']);
    MERGE_LEVEL.shp = new Set(['shipNo', 'clrType', 'client', 'bl', 'booking', 'hawb', 'cert', 'customs', 'packages', 'weight', 'commodity', 'cbm', 'line', 'dest', 'aod', 'reqDate', 'reqTime', 'invRcv', 'transInv', 'missDoc', 'missRcv']);
    ['Import', 'Export'].forEach(d => COLS[d].forEach(c => { c.uniq = FIXED_MERGE[d].has(c.k); }));
    ['packages', 'weight', 'cbm', 'loadedPackages'].forEach(k => NUMERIC_KEYS.add(k));

    const AIR_SEED = {
      line: ['CACC Terminal', 'Cairo Cargo Village', 'EgyptAir Cargo Terminal'],
      aod: ['Cairo (CAI)', 'Borg El Arab (HBE)', 'Luxor (LXR)', 'Aswan (ASW)'],
      pod: ['Cairo (CAI)', 'Borg El Arab (HBE)'],
      truckType: ['Dabbaba', 'Jambo 4m', 'Jambo 6m', 'Trailer 6m', 'Trailer 12m'],   /* Truck Type drop-down of the FTL sheet */
      clrType: ['CERT', 'BOSLA'], customs: ['Cairo Airport Customs', ...BOSLA_CUSTOMS]
    };
    MASTER = { client: [], line: [], dest: [], aod: [], pod: [], pol: [], cert: [], customs: ['Cairo Airport Customs', ...BOSLA_CUSTOMS], trucker: [], truckType: [], clrType: [], status: ['Open', 'Delivered'] };
    seedMaster = function () { Object.entries(AIR_SEED).forEach(([k, v]) => { MASTER[k] = [...new Set([...(MASTER[k] || []), ...v])]; }); MASTER.truckType = [...AIR_SEED.truckType]; MASTER.clrType = [...AIR_SEED.clrType]; MASTER.status = ['Open', 'Delivered']; };
    growMaster = function () { ['client', 'line', 'dest', 'aod', 'pod', 'pol', 'cert', 'customs', 'trucker', 'truckType'].forEach(k => { MASTER[k] = [...new Set([...(MASTER[k] || []), ...DATA.map(r => r[k]).filter(Boolean).map(String)])].sort((a, b) => a.localeCompare(b)); }); };
    OP_USER = 'ILS · FTL Airport';

    const airText = v => { const s = String(v ?? '').trim().replace(/\s+/g, ' '); return s || null; };
    normClient = airText; normSite = airText; normLine = airText; normTrucker = airText; normSize = airText;

    Object.assign(UPLOAD_ALIASES, {
      vol: ['number of shipments', 'number of shipment'], shipNo: ['Shipment Number', 'Shipment #', 'Shipment No'],
      bl: ['MAWB'], booking: ['MAWB'], hawb: ['HAWB'], cert: ['Certificate number', 'Certificate Number'],
      clrType: ['Clearance Type', 'Clearness Type', 'Clearance', 'نوع التخليص'], customs: ['Customs Area', 'Customs Area (BOSLA)', 'Customs', 'منطقة الجمارك'], airline: ['AIR LINE', 'Airline', 'Air Line', 'Airlines', 'شركة الطيران'], packages: ['Packages'], weight: ['Weight'], commodity: ['Commodity'], cbm: ['CBM'],
      line: ['Import Terminal', 'Export Terminal'], dest: ['Destination'], pod: ['AOD', 'AOD / مطار الوصول'],
      arrDate: ['Arrival Date'], arrTime: ['Arrival Time'], reqDate: ['Required Arrival Date', 'Rquired Arrival Date'], reqTime: ['Required Arrival Time', 'Rquired Arrival Time'],
      truckType: ['Truck Type / نوع السيارة', 'Truck Type'], cntr: ['Truck No. / رقم السيارة', 'Truck No.', 'Truck No'],
      driver: ['Driver / السائق', 'Driver'], mob: ['Driver Mobile / موبايل السائق', 'Driver Mobile', 'رقم هاتف السائق'], gateIn: ['GATE IN Date', 'Gate In Date'], gateInT: ['GATE IN Time', 'Gate In Time'],
      gateOut: ['GATE OUT Date', 'Gate Out Date', 'تاريخ خروج البوابة'], gateOutT: ['GATE OUT Time', 'Gate Out Time', 'وقت خروج البوابة'], transInv: ['Transportar INV#', 'Transporter INV#', 'Transporter Invoice No.', 'رقم فاتورة الناقل'], missRcv: ['Receive Date of Mssing Docs', 'Receive Date of Missing Docs', 'Missing Docs Receive Date', 'تاريخ استلام المستندات الناقصة'],
      movement: ['Movement Type', 'Movement Type / نوع الحركة', 'نوع الحركة'], client: ['Client', 'العميل'], packages: ['Packages', 'عدد الطرود'], weight: ['Weight', 'الوزن'], commodity: ['Commodity', 'نوع البضاعة'], cbm: ['CBM', 'الحجم بالمتر المكعب'],
      line: ['Import Terminal', 'Export Terminal', 'محطة الاستيراد', 'محطة التصدير'], dest: ['Destination', 'الوجهة'], pod: ['AOD', 'AOD / مطار الوصول', 'Arrival Airport (AOD)', 'مطار الوصول'], arrDate: ['Arrival Date', 'تاريخ الوصول'], arrTime: ['Arrival Time', 'وقت الوصول'], reqDate: ['Required Arrival Date', 'Rquired Arrival Date', 'تاريخ الوصول المطلوب'], reqTime: ['Required Arrival Time', 'Rquired Arrival Time', 'وقت الوصول المطلوب'],
      trucker: ['Transporter', 'Transporter / شركة النقل', 'Transporter  / شركة النقل', 'شركة النقل'], truckType: ['Truck Type / نوع السيارة', 'Truck Type', 'نوع السيارة'], cntr: ['Truck No. / رقم السيارة', 'Truck No.', 'Truck No', 'رقم السيارة'], driver: ['Driver / السائق', 'Driver', 'السائق'], mob: ['Driver Mobile / موبايل السائق', 'Driver Mobile', 'موبايل السائق', 'رقم هاتف السائق'], gateIn: ['GATE IN Date', 'Gate In Date', 'تاريخ دخول البوابة'], gateInT: ['GATE IN Time', 'Gate In Time', 'وقت دخول البوابة'],
      invRcv: ['INVOICES Receive Date', 'Invoices Received Date', 'تاريخ استلام الفواتير'], missDoc: ['Missing Docs', 'المستندات الناقصة'], shipNo: ['Shipment Number', 'Shipment #', 'Shipment No', 'رقم الشحنة'], bl: ['MAWB', 'البوليصة الرئيسية'], booking: ['MAWB', 'البوليصة الرئيسية'], hawb: ['HAWB', 'البوليصة الفرعية'], cert: ['Certificate number', 'Certificate Number', 'رقم الشهادة'], customs: ['Customs Area', 'منطقة الجمارك']
    });

    validateField = function (c, raw, search = false) {
      const v = normalizeDigits(raw).trim(), type = tripType(c), bad = (en, ar) => ({ ok: false, value: v, message: AR() ? ar : en });
      if (!v) return { ok: true, value: '' };
      if (type === 'number') {
        const dec = ['weight', 'cbm'].includes(c.k);
        const n = Number(v);
        if (!(dec ? /^\d+(?:\.\d+)?$/.test(v) : /^\d+$/.test(v)) || !Number.isFinite(n) || (c.k === 'opCount' && (n < 1 || n > 200))) return bad(dec ? 'Enter a positive number' : 'Enter a positive whole number', dec ? 'اكتب رقم موجب' : 'اكتب عدد صحيح موجب');
        if (n <= 0) return bad(dec ? 'Enter a number greater than zero' : 'Enter a whole number greater than zero', dec ? 'اكتب رقم أكبر من صفر' : 'اكتب عدد صحيح أكبر من صفر');
        if (c.k === 'vol' && n > 200) return bad('Number of Shipments: 1–200', 'عدد الشحنات من 1 إلى 200');
      } else if (c.k === 'customs') {
        if (!/^[\p{L}\d ()/_.,&-]+$/u.test(v)) return bad('Use letters, digits and spaces', 'استخدم حروف وأرقام ومسافات');
      } else if (c.k === 'cert') {
        if (!/^[\p{L}\d /_.-]+$/u.test(v)) return bad('Use letters or digits; / - _ . are allowed', 'استخدم حروف أو أرقام؛ مسموح / - _ .');
        return { ok: true, value: v.toUpperCase() };
      } else if (c.k === 'mob') {
        if (!/^\+?[\d ()-]+$/.test(v)) return bad('Phone: digits and + only', 'التليفون: أرقام ومسموح +');
        return { ok: true, value: v };
      } else if (['bl', 'booking', 'hawb', 'shipNo', 'cntr', 'transInv'].includes(c.k)) {
        if (!/^[\p{L}\d /_.-]+$/u.test(v)) return bad('Use letters, digits, spaces, /, -, _ or .', 'استخدم حروف أو أرقام ومسافات و / و - و _ و .');
        return { ok: true, value: v.toUpperCase() };
      } else if (type === 'time') {
        const nt = normTime(v);
        if (!nt) return bad('Use time like 8, 2p, or 14:30', 'استخدم وقت مثل 8 أو 2p أو 14:30');
        return { ok: true, value: nt };
      } else if (type === 'date') {
        const date = fixDate(v, false);
        if (!date) return bad('Enter a real date, for example 1/11 or 24-SEP-2026', 'اكتب تاريخًا صحيحًا، مثال 1/11 أو 24-09-2026');
        return { ok: true, value: date };
      }
      return { ok: true, value: v };
    };
    allowedFieldCharacters = function (c, v) {
      if (!v) return true;
      if (c.k === 'weight' || c.k === 'cbm') return /^\d*(?:\.\d*)?$/.test(v);
      if (tripType(c) === 'number') return /^\d*$/.test(v);
      if (c.k === 'mob') return /^\+?[\d ()-]*$/.test(v);
      if (tripType(c) === 'time') return /^[\d\s:a-zA-Z]*$/.test(v);
      if (tripType(c) === 'date') return /^[\d\s\/\-a-zA-Z]*$/.test(v);
      return true;
    };

    uploadDirection = function (name, headers) {
      const n = String(name || '').trim().toUpperCase(), keys = new Set(headers.map(uploadHeaderKey));
      const rawName = String(name || '').trim(), byName = (n.includes('IMPORT') || rawName.includes('استيراد')) ? 'Import' : (n.includes('EXPORT') || rawName.includes('تصدير')) ? 'Export' : null;
      const byHeader = keys.has(uploadHeaderKey('Import Terminal')) ? 'Import' : keys.has(uploadHeaderKey('Export Terminal')) ? 'Export' : null;
      if (byName && byHeader && byName !== byHeader) return { dir: byName, error: AR() ? 'اسم التاب لا يطابق أعمدته.' : 'The tab name conflicts with its Import/Export columns.' };
      return { dir: byName || byHeader, error: null };
    };
    const airRequiredCols = dir => COLS[dir].filter(c => c.op && !c.auto);
    const airMandatoryCols = dir => airRequiredCols(dir);
    const airNorm = v => normalizeDigits(v ?? '').trim().replace(/\s+/g, ' ').toUpperCase();
    const airSame = (c, a, b) => {
      if (c.t === 'date') return (fixDate(a, false) || '') === (fixDate(b, false) || '');
      if (c.t === 'time') return (uploadTime(a) || '') === (uploadTime(b) || '');
      if (c.t === 'num') return Number(String(a ?? '').replace(/,/g, '')) === Number(String(b ?? '').replace(/,/g, ''));
      return airNorm(a) === airNorm(b);
    };
    parseUploadSheet = function (ws, name, file) {
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
      const rep = { file, sheet: name, dir: null, rows: 0, skipped: 0, notData: false, errors: [], warnings: [], infos: [] };
      if (/^\s*(entry log|سجل الإدخال)\s*$/i.test(String(name || ''))) { rep.notData = true; rep.infos.push({ k: 'notData', p: { sheet: name } }); return { rows: [], rep, raw: null }; }   /* our own exported log sheet */
      let hi = -1, headers = [], direction = null;
      for (let i = 0; i < Math.min(12, aoa.length); i++) {
        const h = (aoa[i] || []).map(v => v == null ? '' : String(v).trim()), keys = h.map(uploadHeaderKey);
        if (keys.includes(uploadHeaderKey('MAWB')) && (keys.includes(uploadHeaderKey('Commodity')) || keys.includes(uploadHeaderKey('Client')))) { hi = i; headers = h; direction = uploadDirection(name, h); break; }
      }
      if (hi < 0) {
        const hasContent = aoa.some(r => (r || []).some(v => !uploadBlank(v)));
        if (hasContent) rep.errors.push({ k: 'uploadInvalid', p: { list: AR() ? 'هيدر التاب غير معروف؛ استخدم تقسيمة Air Import / Air Export المعتمدة.' : 'Unrecognized sheet header; use the approved Air Import / Air Export columns.' } });
        else { rep.notData = true; rep.infos.push({ k: 'notData', p: { sheet: name } }); }
        return { rows: [], rep, raw: null };
      }
      if (direction?.error) { rep.errors.push({ k: 'uploadInvalid', p: { list: direction.error } }); return { rows: [], rep, raw: null }; }
      const dir = direction?.dir; if (!dir) { rep.errors.push({ k: 'uploadInvalid', p: { list: AR() ? 'تعذر تحديد Import أو Export من اسم التاب أو الهيدر.' : 'Could not determine Import or Export from the sheet name or headers.' } }); return { rows: [], rep, raw: null }; }
      rep.dir = dir;
      const cols = uploadColumns(dir, headers);
      /* Clearance Type and Air Line are new FTL columns: older sheets without them still upload.
         Clearance Type is then derived (Certificate Number present → CERT); Air Line stays blank. */
      const SOFT = new Set(['clrType', 'vol']), softMissing = COLS[dir].filter(c => SOFT.has(c.k) && cols[c.k] < 0);
      const mandatory = airRequiredCols(dir).filter(c => !SOFT.has(c.k));
      const missingHeaders = mandatory.filter(c => cols[c.k] < 0);
      if (missingHeaders.length) {
        rep.errors.push({ k: 'uploadInvalid', p: { list: (AR() ? 'أعمدة إلزامية ناقصة: ' : 'Missing mandatory columns: ') + missingHeaders.map(c => AR() ? (c.ar || c.h) : c.h).join(', ') } });
        return { rows: [], rep, raw: null };
      }
      const merges = ws['!merges'] || [], anchor = (r, c) => merges.find(m => m.s.r <= r && r <= m.e.r && m.s.c <= c && c <= m.e.c);
      const get = (r, k) => {
        const c = cols[k];
        if (c == null || c < 0) {
          if (k === 'clrType' && softMissing.some(x => x.k === 'clrType')) { const cert = get(r, 'cert'), cus = get(r, 'customs'); return !uploadBlank(cert) ? 'CERT' : !uploadBlank(cus) ? 'BOSLA' : null; }
          if (k === 'vol') return 1;
          return null;
        }
        let v = (aoa[r] || [])[c];
        if (uploadBlank(v)) {
          const m = anchor(r, c);
          if (m && (m.s.r !== r || m.s.c !== c)) v = (aoa[m.s.r] || [])[m.s.c];
        }
        if (k === 'clrType' && !uploadBlank(v)) { const u = String(v).trim().toUpperCase(); if (u.startsWith('CERT')) v = 'CERT'; else if (u.startsWith('BOS') || u.includes('بوصل')) v = 'BOSLA'; }
        return v;
      };
      const addr = (r, k) => cols[k] >= 0 ? XLSX.utils.encode_cell({ r, c: cols[k] }) : '?';
      const label = c => AR() ? (c.ar || c.h) : c.h;
      const issues = [], out = [], rawRows = [];
      for (let r = hi + 1; r < aoa.length; r++) {
        const row = aoa[r] || [];
        if (row.every(uploadBlank)) continue;
        const known = COLS[dir].filter(c => cols[c.k] >= 0).some(c => !uploadBlank(get(r, c.k)));
        if (!known) continue;
        for (const c of mandatory) {
          const z = uploadRequiredValue(c, get(r, c.k));
          if (!z.ok) issues.push(`${name}!${addr(r, c.k)} (${label(c)}: ${z.reason})`);
        }
        const o = { dir, _file: file, _sheet: name, _row: r + 1, status: 'Open', created: today(), createdAt: nowHM() };
        COLS[dir].forEach(c => {
          if (c.k === 'status' || c.t === 'upd' || c.k === 'movement') return;
          let v = get(r, c.k);
          if (c.t === 'date') v = fixDate(v, false) || '';
          else if (c.t === 'time') v = uploadTime(v);
          else if (c.t === 'num') v = uploadBlank(v) ? '' : String(v).replace(/,/g, '').trim();
          else v = uploadBlank(v) ? '' : String(v).trim();
          o[c.k] = v;
        });
        if (!o.vol || !(Number(o.vol) > 0)) o.vol = '1';
        o.movement = dir;
        const base = dir === 'Import' ? o.bl : o.booking;
        o._uploadGroup = [dir, airNorm(base) || ('row' + r), file, name].join('|');
        out.push(o); rawRows.push(row.map(x => x instanceof Date ? (fixDate(x, false) || '') : x == null ? '' : String(x)));
      }
      if (!out.length && !issues.length) issues.push(AR() ? 'لا توجد صفوف شحنات.' : 'No shipment rows found.');

      // Locked shipment-level values must be consistent on every transport row of the same shipment.
      const groups = new Map();
      out.forEach(o => {
        const key = airNorm(dir === 'Import' ? o.bl : o.booking);
        if (!key) return;
        if (!groups.has(key)) { groups.set(key, o); return; }
        const first = groups.get(key);
        mandatory.forEach(c => {
          if (!airSame(c, first[c.k], o[c.k])) issues.push(`${name}!${addr(o._row - 1, c.k)} (${label(c)}: ${AR() ? 'قيمة مختلفة عن باقي صفوف نفس الشحنة' : 'value differs from the other rows of the same shipment'})`);
        });
      });

      if (issues.length) rep.errors.push({ k: 'uploadInvalid', p: { list: issues.length + ' ' + (AR() ? 'خلية إلزامية ناقصة أو غير صحيحة' : 'missing or invalid mandatory cells') + ': ' + issues.join('، ') } });
      rep.rows = rep.errors.length ? 0 : out.length;
      if (!rep.errors.length && softMissing.length) rep.warnings.push({ k: 'missingVals', p: { list: softMissing.map(c => `<code>${label(c)}</code> (${AR() ? 'العمود مش موجود في الملف' : 'column not in this file'}${c.k === 'clrType' ? (AR() ? ' — اتحسب CERT لو فيه رقم شهادة، وBOSLA لو فيه منطقة جمارك بس' : ' — set to CERT where a Certificate Number exists, BOSLA where only a Customs Area exists') : c.k === 'vol' ? (AR() ? ' — اتحسب 1' : ' — set to 1') : ''})`).join('، ') } });
      if (!rep.errors.length) rep.infos.push({ k: 'sheetLoaded', p: { dir: dirLabel(dir), sheet: name, n: out.length } });
      return { rows: rep.errors.length ? [] : out, rep, raw: { sheet: name, file, dir, headers, rows: rawRows } };
    };

    shipmentKeys = function (dir, row) {
      const id = v => normalizeDigits(v ?? '').trim().toUpperCase().replace(/\s+/g, '');
      const no = id(row.shipNo);
      const mawbVal = id(row.mawb || (dir === 'Export' ? row.booking : row.bl));
      const hawb = id(row.hawb);
      const cert = id(row.cert);
      return {
        no: no || null,
        hawb: hawb || null,
        cert: cert || null,
        pair: mawbVal && hawb ? JSON.stringify([mawbVal, hawb]) : null,
        certShip: cert && no ? JSON.stringify([cert, no]) : null
      };
    };
    shipmentConflict = function (dir, candidate, excludeRef, excludeRowIndex) {
      const wanted = shipmentKeys(dir, candidate);
      if (!wanted.no && !wanted.hawb && !wanted.pair && !wanted.cert) return null;
      const candShipIdx = excludeRowIndex !== undefined && excludeRowIndex !== null ? rowShipIndex(dir, excludeRowIndex) : -1;
      for (const d of ['Import', 'Export']) {
        const hit = (ENTRY[d] || []).find((row, i) => {
          if (excludeRef && rowShip(d, i)?.ref === excludeRef) {
            if (candShipIdx >= 0 && rowShipIndex(d, i) === candShipIdx) return false;
            if (candShipIdx < 0) return false;
          }
          const other = shipmentKeys(d, row);
          return (wanted.no && other.no && wanted.no === other.no) ||
            (wanted.hawb && other.hawb && wanted.hawb === other.hawb) ||
            (wanted.pair && other.pair && wanted.pair === other.pair) ||
            (wanted.cert && wanted.no && other.cert && other.no && wanted.cert === other.cert && wanted.no === other.no);
        });
        if (hit) {
          const other = shipmentKeys(d, hit);
          if (wanted.no && other.no && wanted.no === other.no) return AR() ? `رقم الشحنة "${candidate.shipNo}" موجود بالفعل في شحنة أخرى` : `Shipment Number "${candidate.shipNo}" already exists in another shipment`;
          if (wanted.hawb && other.hawb && wanted.hawb === other.hawb) return AR() ? `رقم البوليصة الفرعية (HAWB) "${candidate.hawb}" موجود بالفعل في شحنة أخرى` : `HAWB "${candidate.hawb}" already belongs to another shipment`;
          if (wanted.pair && other.pair && wanted.pair === other.pair) return AR() ? 'نفس بوليصة MAWB و HAWB مسجلان معاً بالفعل في شحنة أخرى' : 'The same MAWB + HAWB already belongs to another shipment';
          if (wanted.cert && wanted.no && other.cert && other.no && wanted.cert === other.cert && wanted.no === other.no) return AR() ? `رقم الشهادة "${candidate.cert}" مع رقم الشحنة "${candidate.shipNo}" مسجلان معاً بالفعل في شحنة أخرى` : `Certificate Number "${candidate.cert}" with Shipment Number "${candidate.shipNo}" already belongs to another shipment`;
        }
      }
      return null;
    };
    cellIdentityConflict = function (dir, i, k, value) {
      if (!['shipNo', 'mawb', 'bl', 'booking', 'hawb', 'cert'].includes(k)) return null;
      return shipmentConflict(dir, { ...ENTRY[dir][i], [k]: value }, rowShip(dir, i)?.ref, i);
    };

    let AIR_PREVIEW = null;
    __extra.stepOpShip = function (delta) { const el = $('op_vol'); if (!el) return; const cur = Math.max(1, Math.min(200, Number(String(el.value || '').replace(/[^0-9]/g, '')) || 1)); el.value = String(Math.max(1, Math.min(200, cur + Number(delta || 0)))); el.dispatchEvent(new Event('input', { bubbles: true })); };
    renderOpForm = function () {
      const dir = EDIR, E = t('entry'), grid = $('opGrid'), old = $('op_vol')?.value ?? '';
      $('opRef').textContent = opRefFor(OPSEQ); $('opSub').textContent = E.opSub(dirLabel(dir)); $('lOpCount').textContent = E.opCount; if ($('opCountMinus')) $('opCountMinus').setAttribute('aria-label', AR() ? 'تقليل العدد' : 'Decrease count'); if ($('opCountPlus')) $('opCountPlus').setAttribute('aria-label', AR() ? 'زيادة العدد' : 'Increase count'); if ($('opCount')) $('opCount').setAttribute('aria-label', E.opCount); $('opCreate').textContent = E.opCreate; $('opHint').innerHTML = E.opHint; $('opToggle').textContent = $('opForm').classList.contains('closed') ? E.opOpen : E.opClose; grid.dataset.direction = dir;
      /* the only inputs are the two counters, side by side: Number of Shipments and Trucks */
      grid.innerHTML = ''; grid.style.display = 'none';
      let shipBox = $('opShipBox');
      if (!shipBox) { shipBox = document.createElement('div'); shipBox.className = 'opcount'; shipBox.id = 'opShipBox'; $('opForm').querySelector('.opfoot').prepend(shipBox); }
      const volCol = COLS[dir].find(c => c.k === 'vol');
      shipBox.innerHTML = `<label for="op_vol">${esc(AR() ? (volCol.ar || volCol.h) : volCol.h)}</label><div class="opstepper" role="group" aria-label="${esc(AR() ? volCol.ar : volCol.h)}"><button type="button" onclick="__FTL__.stepOpShip(-1)" aria-label="${AR() ? 'تقليل العدد' : 'Decrease count'}">−</button><input type="text" inputmode="numeric" id="op_vol" value="${esc(old || '1')}" aria-label="${esc(AR() ? volCol.ar : volCol.h)}"><button type="button" onclick="__FTL__.stepOpShip(1)" aria-label="${AR() ? 'زيادة العدد' : 'Increase count'}">+</button></div>`;
      const preview = () => { const sN = Math.max(1, parseInt(normalizeDigits($('op_vol')?.value || ''), 10) || 1), tN = Math.max(1, parseInt(normalizeDigits($('opCount')?.value || ''), 10) || 1); $('opHint').innerHTML = (AR() ? `${E.opHint} <b>الصفوف اللي هتتعمل: ${Math.max(sN, tN)}</b>` : `${E.opHint} <b>Rows to create: ${Math.max(sN, tN)}</b>`); };
      $('op_vol').addEventListener('input', preview); if ($('opCount') && !$('opCount').dataset.previewBound) { $('opCount').dataset.previewBound = '1'; $('opCount').addEventListener('input', () => { if (typeof AIR_PREVIEW === 'function') AIR_PREVIEW(); }); }
      AIR_PREVIEW = preview; preview();
    };
    createOperation = async function () {
      if (CURRENT_TAB !== 'Import' && CURRENT_TAB !== 'Export') {
        toast(AR() ? 'يجب اختيار تبويب Import أو Export أولاً لإنشاء شحنة' : 'Please select either Import or Export tab to create a shipment', 'error');
        return;
      }
      const dir = EDIR, E = t('entry');
      const ships = validateField(COLS[dir].find(c => c.k === 'vol'), $('op_vol').value); if (!ships.ok || !ships.value) { fieldFeedback($('op_vol'), { ok: false, message: AR() ? 'عدد الشحنات من 1 إلى 200' : 'Shipments must be 1–200' }); $('op_vol').focus(); return; }
      const count = validateField({ k: 'opCount', t: 'num' }, $('opCount').value); if (!count.ok || !count.value) { fieldFeedback($('opCount'), { ok: false, message: AR() ? 'عدد العربيات من 1 إلى 200' : 'Trucks must be 1–200' }); $('opCount').focus(); return; }
      fieldFeedback($('op_vol'), { ok: true }); fieldFeedback($('opCount'), { ok: true });
      const shipments = Number(ships.value), trucks = Number(count.value), n = Math.max(shipments, trucks);   /* the two counts are independent: one row per shipment or truck, whichever is larger */
      const shared = { movement: dir, vol: String(shipments) };
      let created = null; if (LIVE) { try { if (!ILS.api?.createOperation) throw Error('Create operation endpoint unavailable'); created = await ILS.api.createOperation({ direction: dir, rowCount: n, shipments, trucks, shared, requestId: crypto.randomUUID() }); if (!created?.ref || !Array.isArray(created.trips) || created.trips.length !== n) throw Error('Invalid create operation response'); if (created.version != null) WORKSPACE_VERSION = created.version; } catch (e) { toast(e.message || 'Could not create shipment'); return; } }
      const ref = created?.ref || opRefFor(OPSEQ++), at = created?.at || nowHM(), day = created?.day || today(), user = OP_USER, idxs = [];
      for (let i = 0; i < n; i++) {
        const row = { ...shared, status: 'Open' };
        if (dir === 'Export' && shared.clrType === 'CERT') { row.customs = 'Cairo Airport Customs'; }
        const idx = ENTRY[dir].length;
        ROWMETA[dir][idx] = { id: created?.trips[i]?.id || null, ref, user, at, day, updates: [] };
        ENTRY[dir].push(row);
        idxs.push(idx);
      }
      const newShipObj = { ref, dir, rows: idxs, per: shipments, unmerged: new Set(), at, day, user, status: 'Open', targetTruckCount: trucks, initialShipCount: shipments };
      SHIPS[dir] = isServerPagedEntry() ? { [ref]: newShipObj, ...SHIPS[dir] } : { ...SHIPS[dir], [ref]: newShipObj };
      layoutShip(dir, SHIPS[dir][ref], { shp: shipments, trk: trucks });
      TRIP_SEARCH[dir] = [{ k: '__tripNo', v: '', join: 'AND' }]; TRIP_SORT[dir] = { key: '__tripNo', dir: 'asc' };
      ENTRY_QUICK_SEARCH = '';
      TRIP_PAGE[dir] = 0;
      if (isServerPagedEntry()) {
        invalidateEntryCache(dir);
        ENTRY_PAGING[dir].totalCount = (ENTRY_PAGING[dir].totalCount || 0) + 1;
        ENTRY_PAGING[dir].totalTrucks = (ENTRY_PAGING[dir].totalTrucks || 0) + trucks;
      }
      if (LAST_COUNTS) {
        if (dir === 'Import') LAST_COUNTS.activeImportCount = (LAST_COUNTS.activeImportCount || 0) + 1;
        if (dir === 'Export') LAST_COUNTS.activeExportCount = (LAST_COUNTS.activeExportCount || 0) + 1;
        setCounts(LAST_COUNTS);
      }
      $('op_vol').value = 1; $('opCount').value = 1; markDirty(); renderEntry(); __emit('countsChanged'); toast(E.opCreated(n, ref, shipments, trucks)); const firstEditable = COLS[dir].find(c => !isLocked(dir, c)); if (firstEditable) setCursor(idxs[0], firstEditable.k, true);
    };

    enrich = function (rows) {
      const at = (d, t2) => { if (!d) return null; const hm = normTime(t2); return new Date(`${d}T${hm || '00:00'}:00`); };
      return rows.map(r => {
        const o = { ...r }; o.status = String(o.status || '').toLowerCase() === 'delivered' ? 'Delivered' : 'Open'; o.movement = o.movement || o.dir;
        const mawb = o.dir === 'Import' ? o.bl : o.booking; o.shipKey = o.shipNo || [mawb, o.hawb || o.cert].filter(Boolean).join('|') || ('#' + (o.cntr || o._row || Math.random()));
        o.opKey = o._ref || o._uploadGroup || (o.dir + '|' + (mawb || o.shipKey)); o.pod = o.pod || '';
        o.load = o.dir === 'Import' ? (o.arrDate || o.gateIn || o.gateOut || o.invRcv || null) : (o.reqDate || o.gateIn || o.gateOut || o.invRcv || null);
        const gi = at(o.gateIn, o.gateInT), go = at(o.gateOut, o.gateOutT); o.gateToArrH = (gi && go) ? Math.round((go - gi) / 36e5) : null; if (o.gateToArrH !== null && (o.gateToArrH < 0 || o.gateToArrH > 24 * 14)) o.gateToArrH = null;
        if (o.dir === 'Export') { const rq = at(o.reqDate, o.reqTime); o.offDelayH = (rq && gi) ? Math.round((gi - rq) / 36e5) : null; if (o.offDelayH !== null && Math.abs(o.offDelayH) > 24 * 30) o.offDelayH = null; o.offDelayD = o.offDelayH === null ? null : +(o.offDelayH / 24).toFixed(2); o.offLate = o.offDelayH === null ? null : (o.offDelayH > 0 ? 'Late' : 'On time'); o.arrOnTime = o.offDelayH === null ? null : (o.offDelayH <= 0 ? 'On time' : 'Late'); } else { o.offDelayH = null; o.offDelayD = null; o.offLate = null; o.arrOnTime = null; }
        o.car = o.cntr || ''; o.port = o.pod || o.line || ''; if (o.dir === 'Export') { o.pol = o.line || ''; o.pod = o.dest || ''; } o.freeDays = null; o.risk = null; o.cutDays = null;
        o.packagesN = Number(String(o.packages || '').replace(/,/g, '')) || 0; o.weightN = Number(String(o.weight || '').replace(/,/g, '')) || 0; o.cbmN = Number(String(o.cbm || '').replace(/,/g, '')) || 0; return o;
      });
    };

    dateBasisOptions = function () { const imp = MODE() === 'Import'; return [['load', AR() ? (imp ? 'تاريخ وصول الشحنة' : 'تاريخ الوصول المطلوب') : (imp ? 'Shipment arrival date' : 'Required arrival date')], ['gateIn', AR() ? 'تاريخ دخول البوابة' : 'Gate-in date'], ['gateOut', AR() ? 'تاريخ خروج البوابة' : 'Gate-out date'], ['invRcv', AR() ? 'تاريخ استلام الفواتير' : 'Invoices received date']]; };
    const _airDisplayValue = displayValue; displayValue = function (c, v) { const raw = _airDisplayValue(c, v); if (!raw) return raw; if (c.k === 'movement') return raw === 'Import' ? dirLabel('Import') : raw === 'Export' ? dirLabel('Export') : raw; if (c.k === 'status') return raw === 'Delivered' ? t('workflow').delivered : raw === 'Open' ? t('workflow').open : raw; if (c.k === 'loadStatus') return raw === 'Full' ? (AR() ? 'كلي' : 'Full') : raw === 'Partial' ? (AR() ? 'جزئي' : 'Partial') : raw === 'Overload' ? (AR() ? 'فائض' : 'Overload') : raw; return raw; };
    MEASURES.Import.splice(0, MEASURES.Import.length, ['gateToArrH', 'Gate dwell (hours)', 'مدة البوابة (ساعات)'], ['packagesN', 'Packages', 'الطرود'], ['weightN', 'Weight', 'الوزن'], ['cbmN', 'CBM', 'الحجم بالمتر المكعب']);
    MEASURES.Export.splice(0, MEASURES.Export.length, ['offDelayH', 'Gate-in delay vs required (hours)', 'تأخير دخول البوابة عن المطلوب (ساعات)'], ['arrOnTime', 'On-time gate in', 'دخول البوابة في الميعاد'], ['gateToArrH', 'Gate dwell (hours)', 'مدة البوابة (ساعات)'], ['packagesN', 'Packages', 'الطرود'], ['weightN', 'Weight', 'الوزن'], ['cbmN', 'CBM', 'الحجم بالمتر المكعب']);

    Object.assign(KPI_MODE, { kpiTrips: '*', kpiShip: '*', kpiCont: '*', kpiClients: '*', kpiTruckers: '*', kpiRisk: '*', kpiFree: '*', kpiOper: '*', kpiTrucks: '*', kpiCut: '*', kpiTransit: '*', kpiDestU: '*', kpiPortU: '*', kpiRoute: '*', kpiOnTime: 'Export', kpiOffDelay: 'Export' });
    Object.assign(CHART_MODE, { chMonthly: '*', chDaily: '*', chClient: '*', chTrucker: '*', chDest: '*', chLine: '*', chTruckerClient: '*', chPort: '*', chRoute: 'Export', chStatus: '*', chOffDelay: 'Export', chOnTime: 'Export', chDelayTrucker: 'Export', chDir: 'Hidden', chFree: 'Hidden', chRiskClient: 'Hidden', chOper: 'Hidden' });

    renderKPIs = function () {
      const n = VIEW.length, byShip = new Map(); VIEW.forEach(r => { if (!byShip.has(r.opKey)) byShip.set(r.opKey, r); }); const sh = [...byShip.values()], shipRecords = sh.length;
      const shipCount = sh.reduce((a, r) => a + (Number(r.vol) || 1), 0), sum = k => sh.reduce((a, r) => a + (Number(r[k]) || 0), 0);
      setVal('kShip', fmtN(shipCount)); $('kShipSub').textContent = AR() ? `${fmtN(shipRecords)} عملية (MAWB) · ${fmtN(n)} صف نقل` : `${fmtN(shipRecords)} operations (MAWB) · ${fmtN(n)} transport rows`;
      setVal('kTrips', fmtN(n)); $('kTripsSub').textContent = AR() ? `${dirLabel(MODE())} · صف لكل حركة سيارة` : `${dirLabel(MODE())} · one row per truck movement`;
      setVal('kCont', fmtN(sum('packages'))); $('kContSub').textContent = AR() ? 'إجمالي الطرود على مستوى الشحنات' : 'Total packages at shipment level';
      const clients = new Set(sh.map(r => r.client).filter(Boolean)); setVal('kClients', fmtN(clients.size)); $('kClientsSub').textContent = AR() ? `${fmtN(new Set(sh.map(r => r.dest).filter(Boolean)).size)} وجهة` : `${fmtN(new Set(sh.map(r => r.dest).filter(Boolean)).size)} destinations`;
      const tr = [...new Set(VIEW.map(r => r.trucker).filter(Boolean))]; setVal('kTruckers', fmtN(tr.length)); $('kTruckersSub').textContent = AR() ? 'شركات نقل مستخدمة في العرض الحالي' : 'Transport companies used in the current view';
      const missing = sh.filter(r => String(r.missDoc || '').trim()).length; setVal('kRisk', fmtN(missing)); $('kRiskSub').textContent = AR() ? `${shipRecords ? Math.round(100 * missing / shipRecords) : 0}% من سجلات الشحنات` : `${shipRecords ? Math.round(100 * missing / shipRecords) : 0}% of shipment records`;
      const inv = sh.filter(r => r.invRcv).length; setVal('kFree', shipRecords ? Math.round(100 * inv / shipRecords) + '%' : '–'); $('kFreeSub').textContent = AR() ? `${fmtN(inv)} من ${fmtN(shipRecords)} استُلمت فواتيرها` : `${fmtN(inv)} of ${fmtN(shipRecords)} have invoice receive dates`;
      setVal('kOper', sum('weight').toLocaleString('en-US', { maximumFractionDigits: 2 })); $('kOperSub').textContent = AR() ? 'إجمالي الوزن المسجل' : 'Total recorded weight';
      const trucks = new Set(VIEW.map(r => r.cntr).filter(Boolean)); setVal('kTrucks', fmtN(trucks.size)); $('kTrucksSub').textContent = AR() ? (trucks.size ? `${(n / trucks.size).toFixed(1)} حركة لكل سيارة` : 'لا توجد أرقام سيارات') : (trucks.size ? `${(n / trucks.size).toFixed(1)} movements per truck` : 'No truck numbers yet');
      setVal('kCut', sum('cbm').toLocaleString('en-US', { maximumFractionDigits: 2 })); $('kCutSub').textContent = AR() ? 'إجمالي الحجم بالمتر المكعب على مستوى الشحنات' : 'Total CBM at shipment level';
      const dwell = VIEW.map(r => r.gateToArrH).filter(v => v !== null); if (dwell.length) { setVal('kTransit', avg(dwell).toFixed(1) + ' ' + t('hrs')); $('kTransitSub').textContent = AR() ? `${fmtN(dwell.length)} حركة بوقت دخول وخروج معروف` : `${fmtN(dwell.length)} movements with gate-in and gate-out`; } else { $('kTransit').textContent = '–'; $('kTransitSub').textContent = AR() ? 'لا توجد أزواج دخول وخروج من البوابة بعد' : 'No Gate In / Gate Out pairs yet'; }
      const dest = [...new Set(sh.map(r => r.dest).filter(Boolean))]; setVal('kDestU', fmtN(dest.length)); $('kDestUSub').textContent = dest[0] ? (AR() ? 'وجهات مختلفة للشحنات' : 'Distinct shipment destinations') : '';
      const terminals = [...new Set(sh.map(r => r.line).filter(Boolean))]; setVal('kPortU', fmtN(terminals.length)); $('kPortUSub').textContent = AR() ? 'محطات جوية مستخدمة' : 'Air terminals used';
      const comm = [...new Set(sh.map(r => r.commodity).filter(Boolean))]; setVal('kRoute', fmtN(comm.length)); $('kRouteSub').textContent = AR() ? 'أنواع بضائع مختلفة' : 'Distinct commodity values';
      const od = VIEW.filter(r => r.dir === 'Export' && r.offDelayH !== null); if (od.length) { const late = od.filter(r => r.offDelayH > 0); setVal('kOffDelay', avg(od.map(r => r.offDelayH)).toFixed(1) + ' ' + t('hrs')); $('kOffDelaySub').textContent = AR() ? `${fmtN(late.length)} من ${fmtN(od.length)} متأخرة عن الوصول المطلوب` : `${fmtN(late.length)} of ${fmtN(od.length)} late vs required arrival`; } else { $('kOffDelay').textContent = '–'; $('kOffDelaySub').textContent = AR() ? 'لا توجد أزواج بين وقت الوصول المطلوب ودخول البوابة' : 'No Required Arrival / Gate In pairs yet'; }
      const measured = VIEW.filter(r => r.dir === 'Export' && r.arrOnTime !== null), ok = measured.filter(r => r.arrOnTime === 'On time').length; if (measured.length) { setVal('kOnTime', Math.round(100 * ok / measured.length) + '%'); $('kOnTimeSub').textContent = AR() ? `${fmtN(ok)} من ${fmtN(measured.length)} في الموعد أو قبله` : `${fmtN(ok)} of ${fmtN(measured.length)} at or before required time`; } else { $('kOnTime').textContent = '–'; $('kOnTimeSub').textContent = AR() ? 'لا توجد قياسات وصول بعد' : 'No measured arrivals yet'; }
      const sm = {}; VIEW.forEach(r => { const m = monthOf(r); if (m) sm[m] = (sm[m] || 0) + 1; }); const ks = Object.keys(sm).sort(); renderSpark('sTrips', ks.map(k => sm[k])); renderSpark('sCont', ks.map(k => sm[k]));
    };

    const _renderCharts = renderCharts; renderCharts = function () {
      _renderCharts(); const imp = MODE() === 'Import', labels = {
        chMonthly: [AR() ? 'الحركات حسب الشهر' : 'Movements by month', AR() ? 'صفوف النقل حسب أساس التاريخ المختار' : 'Transport rows by selected date basis'],
        chDaily: [AR() ? 'الحركات اليومية' : 'Daily movements', AR() ? 'صفوف النقل يوميًا' : 'Transport rows per day'],
        chClient: [AR() ? 'الحركات حسب العميل' : 'Movements by client', AR() ? 'توزيع صفوف النقل على العملاء' : 'Transport-row distribution by client'],
        chTrucker: [AR() ? 'الحركات حسب شركة النقل' : 'Movements by transporter', AR() ? 'استخدام شركات النقل' : 'Transporter usage'],
        chDest: [AR() ? 'الوجهات' : 'Destinations', AR() ? 'أكثر الوجهات نشاطًا' : 'Most active destinations'],
        chLine: [AR() ? 'المحطات الجوية' : 'Air terminals', AR() ? 'الحركة حسب الترمينال' : 'Movements by terminal'],
        chPort: [AR() ? (imp ? 'مطارات الوصول (AOD)' : 'الوجهات') : (imp ? 'Arrival airports (AOD)' : 'Export destinations'), AR() ? 'نقاط المسار المسجلة' : 'Recorded route points'],
        chRoute: [AR() ? 'مسارات التصدير' : 'Export routes', AR() ? 'الترمينال ← الوجهة' : 'Terminal → destination'],
        chOffDelay: [AR() ? 'الوصول المطلوب مقابل دخول البوابة' : 'Required arrival vs Gate In', AR() ? 'فرق وقت دخول البوابة عن الوصول المطلوب' : 'Gate-in time against required arrival'],
        chOnTime: [AR() ? 'أداء الوصول للمحطة الجوية' : 'Terminal arrival performance', AR() ? 'دخول البوابة مقارنة بالوقت المطلوب' : 'Gate In vs required arrival'],
        chDelayTrucker: [AR() ? 'التأخير حسب شركة النقل' : 'Late share by transporter', AR() ? 'نسبة الحركات المتأخرة لكل ناقل' : 'Share of measured movements arriving late'],
        chStatus: [AR() ? 'حالة الشحنات' : 'Shipment status', AR() ? 'مفتوحة ومُسلّمة' : 'Open and Delivered'],
        chTruckerClient: [AR() ? 'تغطية شركات النقل' : 'Transporter coverage', AR() ? 'عدد العملاء لكل شركة نقل' : 'Clients served by each transporter']
      };
      Object.entries(labels).forEach(([id, [a, b]]) => { const h = root.querySelector(`h3[data-c="${id}"]`); if (h) { h.textContent = a; setSub(id, b); } });
    };
    renderInsights = function () {
      const box = $('insightList'); box.innerHTML = ''; if (!VIEW.length) { box.innerHTML = `<li>${AR() ? 'لا توجد بيانات مطابقة للفلاتر.' : 'No data matches the current filters.'}</li>`; return; } const byShip = new Map(); VIEW.forEach(r => { if (!byShip.has(r.opKey)) byShip.set(r.opKey, r); }); const sh = [...byShip.values()], add = x => { const li = document.createElement('li'); li.innerHTML = x; box.appendChild(li); };
      const top = (key, rows = VIEW) => { const c = {}; rows.forEach(r => { if (r[key]) c[r[key]] = (c[r[key]] || 0) + 1; }); return Object.entries(c).sort((a, b) => b[1] - a[1])[0]; }; const tc = top('client', sh), tt = top('trucker'), td = top('dest', sh), co = top('commodity', sh); if (tc) add(AR() ? `<b>${tc[0]}</b> هو العميل الأعلى في العرض الحالي (${tc[1]} سجل شحنة).` : `<b>${tc[0]}</b> is the top client in the current view (${tc[1]} shipment records).`); if (tt) add(AR() ? `<b>${tt[0]}</b> أكثر شركة نقل استخدامًا (${tt[1]} حركة).` : `<b>${tt[0]}</b> is the most-used transporter (${tt[1]} movements).`); if (td) add(AR() ? `أكثر وجهة نشاطًا: <b>${td[0]}</b>.` : `Busiest destination: <b>${td[0]}</b>.`); if (co) add(AR() ? `أكثر نوع بضاعة تكرارًا: <b>${co[0]}</b>.` : `Most frequent commodity: <b>${co[0]}</b>.`); const miss = sh.filter(r => String(r.missDoc || '').trim()).length; if (miss) add(AR() ? `يوجد <b>${miss}</b> سجل شحنة عليه مستندات ناقصة.` : `<b>${miss}</b> shipment records currently have missing documents.`); if (MODE() === 'Export') { const m = VIEW.filter(r => r.offDelayH !== null), late = m.filter(r => r.offDelayH > 0).length; if (m.length) add(AR() ? `<b>${Math.round(100 * late / m.length)}%</b> من الحركات المقيسة دخلت البوابة بعد الوقت المطلوب.` : `<b>${Math.round(100 * late / m.length)}%</b> of measured movements gated in after the required time.`); }
    };

    // Language and product wording.
    Object.assign(T.en, {
      title: 'FTL Airport Dashboard', sub: 'Airport FTL · Import & Export · Operations', kicker: 'ILS EGYPT · FTL AIRPORT', eKicker: 'FTL AIRPORT · SHIPMENTS & TRANSPORT', upload: 'Upload File', eH: 'Start an Air Freight report', eP: 'Create Import or Export air shipments using the mandatory shipment fields, then complete truck and gate details in the table. You can also upload the Air Import / Air Export workbook.', lAltBtn: 'upload an existing Air Freight file',
      lTrucker: 'Transporter', allTruckers: 'All transporters', lDest: 'Destination', allDest: 'All destinations', lSize: 'Shipment type', allSizes: 'All shipment types', lLine: 'Air terminal', allLines: 'All terminals',
      kTrips: 'Transport rows', kCont: 'Packages', kClients: 'Clients', kTruckers: 'Transporters', kRisk: 'Missing docs', kFree: 'Invoices received', kOper: 'Total weight', kTrucks: 'Trucks used', kCut: 'Total CBM', kShip: 'Shipments', kOnTime: 'On-time gate in', kOffDelay: 'Arrival delay', kTransit: 'Gate dwell', kDestU: 'Destinations', kPortU: 'Terminals', kRoute: 'Commodities',
      hTitle: 'Help center — Air Freight data entry, columns & rules', groups: { ...T.en.groups, Workflow: 'Shipment status & permissions', Filters: 'Dashboard filters', Trip: 'Air Freight columns', Dates: 'Dates & gate times', Measures: 'How the Air Freight KPIs are calculated', 'Data entry': 'Air Freight data entry', 'Data handling': 'Upload & data handling', ImportCols: 'AIR IMPORT columns', ExportCols: 'AIR EXPORT columns' },
      mail: { ...T.en.mail, subjExcel: d => `ILS FTL Airport report — ${d}`, subjDash: (m, d) => `ILS FTL Airport dashboard (${m}) — ${d}`, titleExcel: 'FTL Airport report', titleDash: 'FTL Airport dashboard', introExcel: 'Please find the FTL Airport shipment table below, sent from the ILS FTL Airport Dashboard.', signature: 'Best regards,\nILS Egypt · FTL Airport', footer: 'Generated by the ILS FTL Airport Dashboard.' }
    });
    Object.assign(T.en.fNames, { dir: 'direction', status: 'status', day: 'day', client: 'client', trucker: 'transporter', dest: 'destination', size: 'shipment type', oper: 'user', line: 'air terminal', port: 'arrival airport', risk: 'missing documents', free: 'invoices received' });
    Object.assign(T.en.basisNames, { load: 'Shipment activity date', arrDate: 'Arrival date', reqDate: 'Required arrival date', gateIn: 'Gate-in date', gateOut: 'Gate-out date', invRcv: 'Invoices received date' });
    Object.assign(T.en.fBasisName, { load: 'Activity', arrDate: 'Arrival', reqDate: 'Required arrival', gateIn: 'Gate in', gateOut: 'Gate out', invRcv: 'Invoices received' });
    Object.assign(T.en.entry, { opCount: 'Trucks', opSub: d => `${d} shipment · set the two counts, then fill everything in the table`, opHint: 'Number of Shipments and Trucks are the only mandatory inputs; every other cell is completed in the table.', opCreate: 'Create shipment', opMissing: l => `The shipment cannot be created until all mandatory fields are filled — missing: ${l}`, opCreated: (n, ref, s, tr) => `${ref} created — ${s || 1} shipment${(s || 1) === 1 ? '' : 's'} · ${tr || n} truck${(tr || n) === 1 ? '' : 's'} · ${n} row${n === 1 ? '' : 's'}. Complete the rest in the table`, trkSepTip: 'Drag this line up or down to change how many shipments ride on each truck', trkSepApplied: s => `Shipments per truck: ${s}`, lockedTip: 'Set from the counters or written by the system — read only', lockedToast: 'This value comes from the counters or is written by the system; it cannot be edited here', mergeTip: 'Merge Transporter over the whole operation (one value)', unmergeTip: 'Un-merge: one Transporter per truck', merged: 'Merged — one Transporter for the whole operation', unmerged: 'Un-merged — each truck has its own Transporter now', emptyTable: 'No shipments yet — create one from the form above and its transport rows will appear here.', readyShip: (s, t2) => `${s} operation${s == 1 ? '' : 's'} · ${t2} transport rows`, source: 'Air Freight data entry' });
    Object.assign(T.ar, {
      title: 'FTL Airport Dashboard', sub: 'نقل المطار FTL · استيراد وتصدير · تشغيل', kicker: 'آي إل إس إيجيبت · FTL المطار', eKicker: 'FTL المطار · الشحنات والنقل', upload: 'رفع ملف', eH: 'ابدأ تقرير الشحن الجوي', eP: 'أنشئ شحنة استيراد أو تصدير من الحقول الإلزامية، ثم أكمل بيانات شركة النقل والعربية والسائق والدخول والخروج من البوابة في الجدول. ويمكنك أيضًا رفع ملف يحتوي على تاب للاستيراد الجوي أو التصدير الجوي أو كليهما.', lAltBtn: 'رفع ملف شحن جوي موجود',
      lTrucker: 'شركة النقل', allTruckers: 'كل شركات النقل', lDest: 'الوجهة', allDest: 'كل الوجهات', lSize: 'نوع الشحنة', allSizes: 'كل أنواع الشحنات', lLine: 'المحطة الجوية', allLines: 'كل المحطات الجوية',
      kTrips: 'صفوف النقل', kCont: 'الطرود', kClients: 'العملاء', kTruckers: 'شركات النقل', kRisk: 'مستندات ناقصة', kFree: 'استلام الفواتير', kOper: 'إجمالي الوزن', kTrucks: 'العربيات المستخدمة', kCut: 'إجمالي الحجم', kShip: 'الشحنات', kOnTime: 'دخول البوابة في الموعد', kOffDelay: 'تأخير الوصول', kTransit: 'مدة البوابة', kDestU: 'الوجهات', kPortU: 'المحطات الجوية', kRoute: 'أنواع البضائع',
      fNames: { ...T.ar.fNames, dir: 'الاتجاه', status: 'الحالة', day: 'اليوم', client: 'العميل', trucker: 'شركة النقل', dest: 'الوجهة', size: 'نوع الشحنة', oper: 'المستخدم', line: 'المحطة الجوية', port: 'مطار الوصول', risk: 'المستندات الناقصة', free: 'استلام الفواتير' },
      basisNames: { ...T.ar.basisNames, load: 'تاريخ نشاط الشحنة', arrDate: 'تاريخ الوصول', reqDate: 'تاريخ الوصول المطلوب', gateIn: 'تاريخ دخول البوابة', gateOut: 'تاريخ خروج البوابة', invRcv: 'تاريخ استلام الفواتير' },
      fBasisName: { ...T.ar.fBasisName, load: 'النشاط', arrDate: 'الوصول', reqDate: 'الوصول المطلوب', gateIn: 'دخول البوابة', gateOut: 'خروج البوابة', invRcv: 'استلام الفواتير' },
      hTitle: 'مركز المساعدة — إدخال بيانات الشحن الجوي والأعمدة والقواعد', groups: { ...T.ar.groups, Workflow: 'حالة الشحنة والصلاحيات', Filters: 'فلاتر اللوحة', Trip: 'أعمدة الشحن الجوي', Dates: 'التواريخ وأوقات البوابة', Measures: 'طريقة حساب مؤشرات الشحن الجوي', 'Data entry': 'إدخال بيانات الشحن الجوي', 'Data handling': 'رفع البيانات ومعالجتها', ImportCols: 'أعمدة الاستيراد الجوي', ExportCols: 'أعمدة التصدير الجوي' },
      mail: { ...T.ar.mail, subjExcel: d => `تقرير FTL المطار — آي إل إس — ${d}`, subjDash: (m, d) => `لوحة FTL المطار (${m}) — آي إل إس — ${d}`, titleExcel: 'تقرير FTL المطار', titleDash: 'لوحة FTL المطار', introExcel: 'جدول شحنات FTL المطار أدناه، مُرسل من FTL Airport Dashboard.', signature: 'مع التحية،\nآي إل إس إيجيبت · FTL المطار', footer: 'صادر من FTL Airport Dashboard.' }
    });
    Object.assign(T.ar.entry, { opCount: 'عدد العربيات', opSub: d => `شحنة ${d} · حدد العددين وأكمل كل البيانات من الجدول`, opHint: 'عدد الشحنات وعدد العربيات هما الإدخالان الإلزاميان فقط، وباقي الخانات بتتكمل من الجدول.', opCreate: 'إنشاء الشحنة', opMissing: l => `لن يتم إنشاء الشحنة قبل استكمال كل الحقول الإلزامية — الناقص: ${l}`, opCreated: (n, ref, s, tr) => `تم إنشاء ${ref} — ${s || 1} شحنة · ${tr || n} عربية · ${n} صف. أكمل الباقي في الجدول`, trkSepTip: 'اسحب الخط ده لفوق أو لتحت عشان تغيّر عدد الشحنات على كل عربية', trkSepApplied: s => `الشحنات على كل عربية: ${s}`, lockedTip: 'جاية من العدادات أو بيكتبها النظام — للقراءة فقط', lockedToast: 'القيمة دي جاية من العدادات أو بيكتبها النظام؛ مش بتتعدل هنا', mergeTip: 'دمج شركة النقل على العملية كلها (قيمة واحدة)', unmergeTip: 'فك الدمج: شركة نقل لكل عربية', merged: 'تم الدمج — شركة نقل واحدة للعملية كلها', unmerged: 'تم فك الدمج — كل عربية ليها شركة نقل', emptyTable: 'لا توجد شحنات بعد — أنشئ شحنة من النموذج بالأعلى وستظهر صفوف النقل هنا.', readyShip: (s, t2) => `${s} عملية · ${t2} صف نقل`, source: 'إدخال الشحن الجوي' });

    const AIR_HELP = [
      ['Workflow', [
        ['Open and Delivered', 'Every new air shipment starts Open. Changing Status to Delivered moves it to the read-only Delivered shipments view.', 'الشحنات المفتوحة والمُسلّمة', 'كل شحنة جوية جديدة تبدأ بالحالة مفتوحة. عند تغيير الحالة إلى مُسلّمة تنتقل إلى شاشة الشحنات المُسلّمة للعرض فقط.'],
        ['Delivered is read only', 'Delivered shipments keep copy, Excel, email and selection, but shipment data cannot be edited there. Reopen and Delete stay permission-gated for integration.', 'الشحنات المُسلّمة للعرض فقط', 'الشحنات المُسلّمة تحتفظ بالنسخ والتصدير والإرسال بالبريد والتحديد، لكن بياناتها لا يمكن تعديلها. إعادة الفتح والحذف يظلان مرتبطين بصلاحيات المستخدم عند الربط.']]],
      ['Trip', [
        ['Mandatory inputs', 'Only two inputs are mandatory: Number of Shipments and Trucks, the two counters above the table. Number of Shipments is shown in its column and cannot be edited; every other column is completed in the table.', 'الإدخالات الإلزامية', 'الإلزامي حاجتين بس: عدد الشحنات وعدد العربيات، العدادين اللي فوق الجدول. عدد الشحنات بيظهر في عموده ومش بيتعدل، وكل الأعمدة التانية بتتكمل من الجدول.'],
        ['Shipments and trucks are independent', 'There is no relation between the two counts. The operation gets one row per shipment or per truck, whichever is larger. Shipment columns get one cell per shipment; Truck Type, Truck No., Driver, Driver Mobile, Gate In / Gate Out (date & time) and Latest Updates get one cell per truck.', 'عدد الشحنات وعدد العربيات مستقلين', 'مفيش علاقة بين العددين. العملية بتاخد صف لكل شحنة أو لكل عربية أيهما أكبر. أعمدة الشحنة خانة لكل شحنة، ونوع العربية ورقمها والسائق ورقمه ودخول/خروج البوابة (تاريخ ووقت) وآخر التحديثات خانة لكل عربية.'],
        ['Which shipments ride on which truck', 'The dashed line between two trucks can be dragged. Move it up or down to change how many shipment rows each truck carries — for example 6 shipments on 3 trucks: drag the first line below row 4 to get 4 shipments on truck 1 and one shipment on each of the other two. Every truck keeps at least one row; the truck cells on the moved rows take that truck\'s values.', 'مين على أنهي عربية', 'الخط المتقطع بين عربيتين بيتسحب. حرّكه لفوق أو لتحت عشان تغيّر عدد صفوف الشحنات على كل عربية — مثلًا 6 شحنات على 3 عربيات: اسحب الخط الأول لتحت الصف 4 فتبقى 4 شحنات على عربية 1 وشحنة على كل عربية من الاتنين الباقيين. كل عربية بتفضل بصف واحد على الأقل، وخانات العربية في الصفوف اللي اتنقلت بتاخد قيم العربية دي.'],
        ['Transporter · Driver · Driver Mobile', 'Transporter is merged over the whole operation by default and has a Merge / Un-merge button to give each truck its own transporter. Driver and Driver Mobile are always one per truck. Truck Type uses the FTL sheet list (Dabbaba, Jambo 4m, Jambo 6m, Trailer 6m, Trailer 12m).', 'شركة النقل · السائق · رقم السائق', 'شركة النقل مدموجة على العملية كلها افتراضيًا ولها زرار دمج / فك دمج عشان كل عربية تاخد شركة نقل لوحدها. السائق ورقمه دايمًا قيمة لكل عربية. نوع العربية من قائمة شيت الـ FTL.'],
        ['Arrival Date · Arrival Time', 'Import arrival date and time are un-merged: one editable value per row.', 'تاريخ ووقت الوصول', 'تاريخ ووقت الوصول في الاستيراد مش مدموجين: قيمة قابلة للتعديل في كل صف.'],
        ['Clearance Type (Export only)', 'CERT or BOSLA, chosen in the Export table. CERT → the Certificate Number cell is active and Customs Area is automatically set to Cairo Airport Customs and locked. BOSLA → the Customs Area dropdown is active with Bosla dry ports and Certificate Number is greyed out. Import follows the Air Import sheet exactly and has no Clearance Type.', 'نوع التخليص (التصدير فقط)', 'CERT أو BOSLA من جدول التصدير. CERT → خانة رقم الشهادة شغالة ومنطقة الجمارك تُحدد تلقائياً بـ Cairo Airport Customs ومقفولة. BOSLA → خانة منطقة الجمارك شغالة بالموانئ الجافة ورقم الشهادة مقفول. الاستيراد بيلتزم بأعمدة شيت الاستيراد الجوي ومفيهوش نوع تخليص.'],
        ['Shipment Number · HAWB · Certificate', 'Completed in the table, one value per shipment. Certificate Number offers a drop list of numbers already used and accepts a new one. Duplicates across different operations are blocked.', 'رقم الشحنة · HAWB · رقم الشهادة', 'بتتكمل من الجدول، قيمة لكل شحنة. رقم الشهادة فيه قائمة بالأرقام المستخدمة وتقدر تكتب رقم جديد. التكرار بين عمليات مختلفة ممنوع.'],
        ['Latest Updates', 'One updates cell per truck — the number of updates cells equals the number of trucks.', 'آخر التحديثات', 'خانة تحديثات لكل عربية — عدد خانات التحديثات = عدد العربيات.'],
        ['Excel export', 'The exported file keeps the merged cells and draws a border around the rows of every operation, so each shipment block is separated from the next.', 'تصدير الإكسيل', 'الملف المُصدَّر بيحافظ على الخلايا المدموجة وبيرسم إطار حوالين صفوف كل عملية عشان كل شحنة تبقى منفصلة عن اللي بعدها.']]],
      ['Dates', [
        ['Import Arrival Date & Time', 'The actual air shipment arrival date and time for Import.', 'تاريخ ووقت وصول الاستيراد', 'التاريخ والوقت الفعليان لوصول الشحنة الجوية في الاستيراد.'],
        ['Export Required Arrival Date & Time', 'The target time the export transport should reach the terminal. Export on-time and delay metrics compare Gate In against this timestamp.', 'تاريخ ووقت الوصول المطلوب للتصدير', 'الموعد المطلوب لوصول نقلة التصدير إلى المحطة الجوية. مؤشرات الالتزام والتأخير تقارن وقت دخول البوابة بهذا الموعد.'],
        ['Gate In / Gate Out', 'Gate In and Gate Out (date & time) are truck columns (one cell per truck). Their difference is the Gate dwell KPI.', 'دخول البوابة / خروج البوابة', 'تاريخ ووقت دخول وخروج البوابة من أعمدة العربية (خانة لكل عربية)، والفرق بينهما هو مؤشر مدة البوابة.'],
        ['Latest Updates', 'Click Latest Updates to add a timestamped operational update; the signed-in user is stored with it when integration is active.', 'آخر التحديثات', 'اضغط على آخر التحديثات لإضافة تحديث تشغيلي بتاريخ ووقت، ومع الربط يُسجل اسم المستخدم الذي أضاف التحديث.']]],
      ['Data entry', [
        ['Two counters', 'Set Number of Shipments and Trucks, then press Create. The rows appear in the table and everything else is filled there.', 'عدادان فقط', 'حدد عدد الشحنات وعدد العربيات واضغط إنشاء. الصفوف بتظهر في الجدول وكل الباقي بيتكمل هناك.'],
        ['Locked vs editable cells', 'Only Number of Shipments and Status are locked (🔒). Every other cell is editable in the table — merged cells write one value for their whole group, un-merged cells take one value per row.', 'الخلايا المقفولة والقابلة للتعديل', 'المقفول (🔒) هو عدد الشحنات والحالة فقط. أي خلية تانية قابلة للتعديل في الجدول — الخلية المدمجة بتكتب قيمة واحدة لكل المجموعة، والمفكوكة قيمة لكل صف.'],
        ['Operation created date', 'Every operation remembers the date it was created. It is available as a search rule and a sort key in the table, as a from / to filter on the dashboard, and in the Excel export / email picker.', 'تاريخ إنشاء العملية', 'كل عملية بتحتفظ بتاريخ إنشائها. متاح كشرط بحث وكمفتاح ترتيب في الجدول، وكفلتر من / إلى في اللوحة، وفي اختيار العمليات عند التصدير أو الإرسال.'],
        ['Delivered shipments', 'The Delivered shipments window has the same AND / OR / NOT filters and sorting as the main table; Select all, Copy, Excel and Email work on the filtered result.', 'الشحنات المسلّمة', 'شاشة الشحنات المسلّمة فيها نفس فلاتر AND / OR / NOT والترتيب زي الجدول الرئيسي، وتحديد الكل والنسخ والإكسيل والإيميل بيشتغلوا على النتيجة المفلترة.'],
        ['Search, sort and copy', 'The same Ocean-dashboard behavior is preserved: AND / OR / NOT shipment search, sorting, shipment selection from the Select column at the end of the row, Ctrl/Cmd+C with headers, Esc to clear, and pagination for large data.', 'البحث والترتيب والنسخ', 'نفس سلوك مرجع النقل البحري محفوظ: البحث المركب، الترتيب، تحديد الشحنة من أقصى الجدول، النسخ مع أسماء الأعمدة، إلغاء التحديد من لوحة المفاتيح، وتقسيم الصفحات عند زيادة البيانات.'],
        ['Excel upload validation', 'A workbook can contain Air Import, Air Export or both, with the approved sheet columns. Rows are grouped by MAWB; merged cells in the file are read as one value. Number of Shipments defaults to 1 when blank, and Export sheets without Clearance Type still upload (CERT where a Certificate Number exists, BOSLA where only a Customs Area exists). A duplicated Shipment Number, Certificate Number or MAWB + HAWB rejects the whole upload; the quality report identifies the sheet, exact cell and field.', 'التحقق عند رفع ملف إكسيل', 'يمكن أن يحتوي الملف على تاب استيراد جوي أو تصدير جوي أو كليهما بأعمدة الشيت المعتمدة. الصفوف بتتجمع حسب الـ MAWB، والخلايا المدموجة في الملف بتتقرأ كقيمة واحدة. عدد الشحنات بيبقى 1 لو فاضي، وشيت التصدير من غير نوع التخليص بيترفع (CERT لو فيه رقم شهادة وBOSLA لو فيه منطقة جمارك بس). تكرار رقم الشحنة أو رقم الشهادة أو MAWB + HAWB بيرفض الرفع كله، وتقرير الجودة بيحدد التاب والخلية والحقل.']]],
      ['Measures', [
        ['Shipments vs transport rows', 'Shipment KPIs are deduplicated by Shipment Number / MAWB identity, while transport rows count truck movements. Packages, Weight and CBM are summed once per shipment to avoid double counting merged values.', 'الشحنات مقابل صفوف النقل', 'مؤشرات الشحنات تُحسب مرة واحدة حسب هوية الشحنة، بينما صفوف النقل تعد حركات العربيات. الطرود والوزن والحجم تُجمع مرة واحدة لكل شحنة لتجنب تكرار القيم المدمجة.'],
        ['Export on-time arrival', 'Gate In ≤ Required Arrival is On time. Delay is Gate In − Required Arrival in hours.', 'الالتزام بموعد الوصول في التصدير', 'إذا كان دخول البوابة قبل أو يساوي وقت الوصول المطلوب فتُعتبر الحركة في الموعد. التأخير هو الفرق بالساعات بين دخول البوابة ووقت الوصول المطلوب.'],
        ['Gate dwell', 'Average Gate Out − Gate In across rows where both date/time values are available.', 'مدة البوابة', 'متوسط الفرق بين وقت خروج البوابة ووقت دخولها للصفوف التي تحتوي على التاريخ والوقت لكليهما.']]],
      ['Filters', [
        ['Import and Export only', 'The dashboard has only Import and Export modes. Filters cover Client, Transporter, Destination and Air Terminal, plus the date basis, the operation created date (from / to) and delivery status.', 'الاستيراد والتصدير فقط', 'اللوحة تحتوي على الاستيراد والتصدير فقط. الفلاتر تشمل العميل وشركة النقل والوجهة والمحطة الجوية، بالإضافة إلى أساس التاريخ وتاريخ إنشاء العملية (من / إلى) وحالة الشحنة.']]]
    ]; HELP.splice(0, HELP.length, ...AIR_HELP);

    const _applyMode = applyMode; applyMode = function () { _applyMode(); if ($('dtFcl')) $('dtFcl').style.display = 'none'; if ($('fldRisk')) $('fldRisk').style.display = 'none'; if ($('fldFrom')) $('fldFrom').style.display = 'none'; if ($('fldTo')) $('fldTo').style.display = 'none'; if ($('fldPort')) $('fldPort').style.display = 'none'; const op = $('fOper')?.closest('.fld'); if (op) op.style.display = 'none'; if ($('hTitle')) $('hTitle').textContent = 'FTL Airport Dashboard'; if ($('hSub')) $('hSub').textContent = AR() ? `${dirLabel(MODE())} · الشحنات وحركات النقل وأداء البوابات` : `${dirLabel(MODE())} · Shipments, truck movements and gate performance`; };
    const _applyStatic = applyStatic; applyStatic = function () { _applyStatic(); if ($('dtFcl')) $('dtFcl').style.display = 'none'; if ($('lLine')) $('lLine').textContent = AR() ? 'المحطة الجوية' : 'Air terminal'; if ($('lTrucker')) $('lTrucker').textContent = AR() ? 'شركة النقل' : 'Transporter'; if ($('lDest')) $('lDest').textContent = AR() ? 'الوجهة' : 'Destination'; if ($('deliveryFilterLabel')) $('deliveryFilterLabel').textContent = AR() ? 'حالة الشحنة' : 'Shipment status'; $('kpiPortU')?.querySelector('.k-ico') && ($('kpiPortU').querySelector('.k-ico').textContent = '🛫'); $('kpiRoute')?.querySelector('.k-ico') && ($('kpiRoute').querySelector('.k-ico').textContent = '📦'); };
    const _airRefreshDirectionFilters = refreshDirectionFilters; refreshDirectionFilters = function () { _airRefreshDirectionFilters(); if ($('lDest')) $('lDest').textContent = AR() ? 'الوجهة' : 'Destination'; if ($('lLine')) $('lLine').textContent = AR() ? 'المحطة الجوية' : 'Air terminal'; if ($('lTrucker')) $('lTrucker').textContent = AR() ? 'شركة النقل' : 'Transporter'; if ($('deliveryFilterLabel')) $('deliveryFilterLabel').textContent = AR() ? 'حالة الشحنة' : 'Shipment status'; };
  })();
  /* boot is performed by the wrapper below */





  /* ---------------- wrapper: snapshot, handlers, boot, controller ---------------- */
  function __snapshot() {
    return {
      version: WORKSPACE_VERSION ?? 0,
      shipments: workspaceShipments().map(s => ({
        ...s,
        enteredBy: { id: OP_USER_ID || 'local', displayName: (SHIPS[s.direction][s.ref] || {}).user || OP_USER },
        trips: s.trips.map((tr, i) => ({ ...tr, id: tr.id || ('local-' + s.ref + '-' + i) })),
      })),
    };
  }

  const handlers = {
    addUpdate, applyEntry, changeShipmentStatus, clearData, closeM, closeMToAlert, copyDeliveredTrips, copySelectedTrips,
    createOperation, devCopy, emailEntry, openDelivered, openExport, openHelp, openMail, openNativeDate,
    openQuality, openTimePicker, openTptUpload, openTripExport, openUpdates, renderDelivered, renderRaw,
    reopenSelectedShipment, resetFilters, runExport, saveTripExport, sendMail, copyMailForReply, showDash, showEntry,
    stepOpCount, toggleAllDelivered, toggleDeliveredSelection, toggleLang, toggleMerge, toggleOpForm,
    togglePanel, toggleTheme, xCount, xToggleAll,
    toggleStatusMenu, setAndCloseStatus, openStatusHistory,
    openTruckManifest, openShipmentBreakdown, setTruckShipment, addTruckCoLoad, removeTruckCoLoad, updateTruckAllocationPkgs, changeTruckAllocShp,
    addShipmentTruckAllocation, updateShipmentTruckAllocation, removeShipmentTruckAllocation,
    openInactive, renderInactive, toggleAllInactive, toggleInactiveSelection, copyInactiveTrips, delShip,
    startEditShipment, saveShipmentEdits, cancelEditShipment, restoreDraft, discardDraft,
    takeOverShipment, checkAndEditShipment, copyConflictData,
    startEditFromManifest, saveFromManifest, cancelFromManifest,
    pageInactive: (d) => { INACTIVE_PAGE += d; },
    stepOpShip: (d) => __extra.stepOpShip && __extra.stepOpShip(d),
    setRawTab: (i) => { rawTab = i; },
    pageDelivered: (d) => { DELIVERED_PAGE += d; },
    openDev,
    setArchiveOperations,
    dismissToast,
  };
  window[HANDLER_NAMESPACE] = handlers;
  ACTIVE_ENGINE = handlers;

  function __afterLoad() {
    initFilters(); buildFields();
    if (DATA.length) { showDash(true); resetFilters(); } else { showEntry(true); }
    renderSysBar(); updateTag();
  }

  seedMaster();
  applyStatic(); showDash(false); showEntry(true);
  if (options.language === 'ar') toggleLang();
  if (options.theme === 'dark') toggleTheme();
  if (options.initialWorkspace && !(ILS.api && typeof ILS.api === 'object')) {
    try { hydrateWorkspace(options.initialWorkspace); __afterLoad(); }
    catch (e) { console.error('initialWorkspace rejected:', e); toast(e.message || 'Could not load workspace'); }
  }
  const ready = ilsBoot().then(live => { __emit('ready', { live }); return live; });

  const currentLang = () => LANG;
  const currentTheme = () => root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  return {
    ready,
    /** 'en' | 'ar' */
    setLanguage(lang) { if (!destroyed && (lang === 'ar' || lang === 'en') && lang !== currentLang()) toggleLang(); },
    /** 'light' | 'dark' */
    setTheme(theme) { if (!destroyed && (theme === 'dark' || theme === 'light') && theme !== currentTheme()) toggleTheme(); },
    getLanguage: currentLang,
    getTheme: currentTheme,
    showDashboard() { if (!DATA.length) return false; showEntry(false); showDash(true); return true; },
    showDataEntry() { showEntry(true); },
    /** Import Excel workbooks (File objects) exactly like the Upload button. */
    importFiles(files) { return handleFiles([...(files || [])], null); },
    /** Hydrate from a {version, shipments[]} payload (the GET /workspace contract). */
    loadWorkspace(payload) { hydrateWorkspace(payload); __afterLoad(); },
    /** Current data in the GET /workspace contract (round-trips through loadWorkspace). */
    getWorkspace: __snapshot,
    /** Current data in the legacy column/row export format. */
    getExportPayload: () => exportPayload(),
    /** Enriched trip rows the dashboard is computed from. */
    getTrips: () => DATA.map(r => ({ ...r })),
    /** Column → field schema per direction ('Import' | 'Export'). */
    getSchema: (dir) => ilsSchema(dir || 'Import'),
    apiSpec: ILS_API_SPEC,
    isLive: () => LIVE,
    isDirty: () => DIRTY,
    /** Force pending changes to be saved now. */
    flush: () => flushWorkspace(),
    /** Re-run the live boot (reload user, master lists and workspace). */
    reload: () => ilsBoot(),
    openExport: () => { if (DATA.length) openExport(); },
    openHelp: () => openHelp(),
    openDeveloperPanel: () => openDev(),
    setArchiveOperations: (tab, ops, dir, totalCount) => setArchiveOperations(tab, ops, dir, totalCount),
    setTab: (tab) => setTab(tab),
    switchDir: (dir) => switchEntryDir(dir),
    invalidateLoadedDirs: () => { LOADED_DIRS.clear(); invalidateEntryCache(); },
    removeShipmentLocally: (ref, dir) => removeShipmentLocally(ref, dir),
    appendTripUpdate: (dir, ref, rowIndices, updateObj) => appendTripUpdateFromDrawer(dir, ref, rowIndices, updateObj),
    clear: () => clearData(),
    toast: (msg, type, options) => toast(msg, type, options),
    dismissToast: () => dismissToast(),
    destroy() {
      if (destroyed) return;
      destroyed = true;
      if (DIRTY && !LIVE && typeof ILS.save === 'function') { try { ILS.save(exportPayload(), __snapshot()); } catch (e) { /* ignore */ } }
      clearTimeout(_saveT); clearTimeout(toastT); clearTimeout(_packT);
      Object.values(charts).forEach(c => { try { c.destroy(); } catch (e) { /* ignore */ } });
      root.querySelectorAll('canvas').forEach(cv => { const c = Chart.getChart(cv); if (c) c.destroy(); });
      __cleanups.splice(0).forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
      printHost.remove(); document.body.classList.remove('ftl-printing');
      root.innerHTML = '';
      root.removeAttribute('data-theme'); root.removeAttribute('dir'); root.removeAttribute('lang');
      if (window[HANDLER_NAMESPACE] === handlers) delete window[HANDLER_NAMESPACE];
      if (ACTIVE_ENGINE === handlers) ACTIVE_ENGINE = null;
    },
  };
}
