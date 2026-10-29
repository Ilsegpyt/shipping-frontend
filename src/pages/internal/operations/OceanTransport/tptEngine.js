// TPT Engine — Processing, Date Formatting, Metric Enrichment & Excel I/O
import * as XLSX from 'xlsx';
import { COLS } from './constants';
import { normalizeContainerType } from './operationsAdapter';

export const fmtDay = (d) => {
  if (!d) return '';
  const p = fixDate(d);
  if (!p) return String(d);
  const [y, m, dd] = p.split('-');
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${dd}-${months[+m - 1] || m}-${y}`;
};

export const fixDate = (v) => {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string' && /^[\s.\-]*$/.test(v)) return null;

  // 1. Excel serial date code (number like 46026) using exact SSF formula
  if (typeof v === 'number' && v > 10000 && v < 80000) {
    try {
      const p = XLSX.SSF.parse_date_code(v);
      if (p && p.y && p.m && p.d) {
        return `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}`;
      }
    } catch (e) {
      // Fallback below
    }
  }

  // 2. JavaScript Date object: add 12 hours to safely prevent UTC timezone day-rollback
  if (v instanceof Date) {
    const d = new Date(v.getTime() + 12 * 3600 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // 3. String dates
  const s = String(v).trim();
  
  // Format with month names: '4/Jan/26' or '4-Jan-2026' or '04 Jan 2026'
  const monthsMap = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12'
  };
  const mNamed = s.match(/^(\d{1,2})[\s/-]+([A-Za-z]{3,})[\s/-]+(\d{2,4})/);
  if (mNamed) {
    const d = mNamed[1].padStart(2, '0');
    const mon = mNamed[2].toLowerCase().slice(0, 3);
    const mo = monthsMap[mon];
    let y = +mNamed[3];
    if (y < 100) y += 2000;
    if (mo) return `${y}-${mo}-${d}`;
  }

  // Format: 'YYYY-MM-DD'
  const mIso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (mIso) return `${mIso[1]}-${mIso[2]}-${mIso[3]}`;

  // Format: 'DD/MM/YYYY' or 'D/M/YY'
  const mNum = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/);
  if (mNum) {
    const d = +mNum[1];
    const mo = +mNum[2];
    let y = +mNum[3];
    if (y < 100) y += 2000;
    if (mo <= 12) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  return null;
};

export const normTime = (v) => {
  if (v === null || v === undefined || v === '') return '';
  if (typeof v === 'number') {
    const m = Math.round(v * 24 * 60) % 1440;
    return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  }
  if (v instanceof Date) {
    return String(v.getHours()).padStart(2, '0') + ':' + String(v.getMinutes()).padStart(2, '0');
  }
  const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})\s*([AaPp][Mm]?)?/);
  if (!m) return '';
  let h = +m[1];
  const mi = +m[2];
  const ap = (m[3] || '').toLowerCase();
  if (ap.startsWith('p') && h < 12) h += 12;
  if (ap.startsWith('a') && h === 12) h = 0;
  if (h > 23 || mi > 59) return '';
  return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
};

export const enrich = (rows) => {
  const counts = {};
  rows.forEach((r) => {
    const k = (r.dir || '') + '|' + ((r.dir === 'Import' ? r.bl : r.booking) || ('#' + r.cntr));
    counts[k] = (counts[k] || 0) + 1;
  });

  const days = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);
  const at = (d, t2) => {
    if (!d) return null;
    const hm = normTime(t2);
    return new Date(`${d}T${hm || '00:00'}:00`);
  };

  return rows.map((r) => {
    const o = { ...r };
    o.status = String(o.status || '').trim().toLowerCase() === 'delivered' ? 'Delivered' : (o.status || 'Open');
    o.load = o.load || o.arrDate || o.reqDate || o.gateOut || null;
    o.freeDays = (o.free && o.load) ? days(o.free, o.load) : null;
    if (o.freeDays !== null && (o.freeDays < -60 || o.freeDays > 90)) o.freeDays = null;
    o.risk = o.freeDays === null ? null : (o.freeDays < 0 ? 'Late' : 'OK');
    o.cutDays = (o.cut && o.load) ? days(o.cut, o.load) : null;
    if (o.cutDays !== null && (o.cutDays < -60 || o.cutDays > 90)) o.cutDays = null;

    const rq = at(o.reqDate, o.reqTime);
    const ac = at(o.arrDate, o.arrTime);
    const go = at(o.gateOut, o.gateOutT);

    o.gateToArrH = (go && ac) ? Math.round((ac - go) / 36e5) : null;
    if (o.gateToArrH !== null && (o.gateToArrH < 0 || o.gateToArrH > 24 * 30)) o.gateToArrH = null;

    o.offDelayH = (rq && ac) ? Math.round((ac - rq) / 36e5) : null;
    if (o.offDelayH !== null && Math.abs(o.offDelayH) > 24 * 60) o.offDelayH = null;
    o.offDelayD = o.offDelayH === null ? null : +(o.offDelayH / 24).toFixed(2);
    o.offLate = o.offDelayH === null ? null : (o.offDelayH > 0 ? 'Late' : 'On time');

    o.arrDelayH = (rq && ac) ? Math.round((ac - rq) / 36e5) : null;
    o.arrOnTime = o.arrDelayH === null ? null : (o.arrDelayH <= 0 ? 'On time' : 'Late');

    o.shipKey = (o.dir === 'Import' ? (o.bl || '') : (o.booking || '')) || ('#' + o.cntr);
    if (!o.vol) o.vol = String(counts[(o.dir || '') + '|' + o.shipKey] || 1);

    return o;
  });
};

export const exportToExcel = (entry, ships, direction = 'Import') => {
  const wb = XLSX.utils.book_new();
  const dirs = direction === 'Both' ? ['Import', 'Export'] : [direction];

  dirs.forEach((dir) => {
    const rawCols = COLS[dir] || [];
    const cols = rawCols.filter((c) => c.k !== 'actions' && c.k !== 'sel');
    const rows = entry[dir] || [];
    const sheetData = [];

    // Header row
    sheetData.push(cols.map((c) => c.h));

    // Data rows
    rows.forEach((r) => {
      sheetData.push(cols.map((c) => {
        const val = r[c.k] ?? '';
        if (c.t === 'date') return fmtDay(val);
        if (c.t === 'time') return normTime(val) || val;
        return val;
      }));
    });

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    
    // Auto column widths
    const colWidths = cols.map((c) => ({ wch: Math.max(12, Math.min(30, Math.round((c.w || 120) / 7))) }));
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, dir.toUpperCase());
  });

  const fileName = `TPT_REPORT_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Detects whether a sheet is Import or Export dynamically by analyzing its header column names.
 * Does not rely on the sheet name.
 */
export const detectSheetDirection = (headers = [], sheetName = '') => {
  if (!headers || !headers.length) return null;
  const rawText = headers.map((h) => String(h || '').toUpperCase().trim()).join(' ');

  // Distinctive Export markers
  const exportMarkers = [
    'BOOKING',
    'POL',
    'POW',
    'CUT OFF',
    'CUTOFF',
    'CLEARNESS',
    'CLEARANCE',
    'LOADING DATE',
    'LOADING TIME',
    'CUSTOMS',
    'BOSLA',
  ];

  // Distinctive Import markers
  const importMarkers = [
    'M/BL',
    'MBL',
    'FREE TIME',
    'OFFLOAD',
    'OFFLOADING',
    'CHECK OUT FROM THE PORT',
    'CHECK OUT PORT',
  ];

  let exportScore = 0;
  exportMarkers.forEach((m) => {
    if (rawText.includes(m)) exportScore += 2;
  });

  let importScore = 0;
  importMarkers.forEach((m) => {
    if (rawText.includes(m)) importScore += 2;
  });

  if (rawText.includes('POD') && !rawText.includes('POL')) {
    importScore += 1;
  }
  if (rawText.includes('POL')) {
    exportScore += 1;
  }

  if (exportScore > importScore && exportScore >= 2) return 'Export';
  if (importScore > exportScore && importScore >= 2) return 'Import';

  // Fallback to sheet name if headers were ambiguous
  const u = String(sheetName || '').toUpperCase();
  if (u.includes('IMP') || u === 'IMPORT') return 'Import';
  if (u.includes('EXP') || u === 'EXPORT') return 'Export';
  return null;
};

/**
 * Maps raw Excel header names to internal field keys
 */
export const mapHeadersToKeys = (headers = []) => {
  const colMap = {};
  headers.forEach((h, idx) => {
    const raw = String(h || '').trim();
    if (!raw) return;
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');

    if (clean.includes('CNTRVOL') || clean === 'VOL' || clean === 'CNTRVOLUME') colMap.vol = idx;
    else if (clean.includes('OPERAT')) colMap.oper = idx;
    else if (clean.includes('CERT')) colMap.cert = idx;
    else if (clean.includes('CLIENT') || clean.includes('CLEINT')) colMap.client = idx;
    else if (clean.includes('MBL') || clean === 'BL') colMap.bl = idx;
    else if (clean.includes('BOOKING')) colMap.booking = idx;
    else if (clean.includes('LINE')) colMap.line = idx;
    else if (clean.includes('DEST')) colMap.dest = idx;
    else if (clean.includes('POL')) colMap.pol = idx;
    else if (clean.includes('POD')) colMap.pod = idx;
    else if (clean.includes('POW')) colMap.pow = idx;
    else if (clean.includes('FREETIME') || clean.includes('FREE')) colMap.free = idx;
    else if (clean.includes('CUTOFF') || clean.includes('CUT')) colMap.cut = idx;
    else if (clean.includes('OFFLOAD') && clean.includes('DATE')) colMap.reqDate = idx;
    else if (clean.includes('OFFLOAD') && clean.includes('TIME')) colMap.reqTime = idx;
    else if (clean.includes('LOAD') && clean.includes('DATE') && !clean.includes('OFFLOAD')) colMap.reqDate = idx;
    else if (clean.includes('LOAD') && clean.includes('TIME') && !clean.includes('OFFLOAD')) colMap.reqTime = idx;
    else if (clean.includes('ARRIVE') && clean.includes('DATE')) colMap.arrDate = idx;
    else if (clean.includes('ARRIVE') && clean.includes('TIME')) colMap.arrTime = idx;
    else if (clean.includes('GATEOUT') && clean.includes('DATE')) colMap.gateOut = idx;
    else if (clean.includes('GATEOUT') && clean.includes('TIME')) colMap.gateOutT = idx;
    else if (clean.includes('TYPE') && (clean.includes('CNTR') || clean.includes('CONTAINER'))) colMap.size = idx;
    else if (clean.includes('CNTRNO') || clean.includes('CNTR#') || clean === 'CNTR') colMap.cntr = idx;
    else if (clean.includes('TRUCK') || clean.includes('TRANSPORTER')) colMap.trucker = idx;
    else if (clean.includes('CAR')) colMap.car = idx;
    else if (clean.includes('DRIVER')) colMap.driver = idx;
    else if (clean.includes('MOB')) colMap.mob = idx;
    else if (clean.includes('CHECKOUT')) colMap.checkout = idx;
    else if (clean.includes('STATUS')) colMap.status = idx;
    else if (clean.includes('INVOICE')) colMap.invRcv = idx;
    else if (clean.includes('MISSDOC') || clean.includes('MISSINGDOCS')) colMap.missDoc = idx;
    else if (clean.includes('RECEIVEDATEOFMSSING') || clean.includes('RCVMISS')) colMap.missRcv = idx;
    else if (clean.includes('CLEAR') || clean.includes('CLRTYPE')) colMap.clrType = idx;
    else if (clean.includes('CUSTOM')) colMap.customs = idx;
    else if (clean.includes('SHIPMENT') || clean.includes('SHIPNO')) colMap.shipNo = idx;
  });
  return colMap;
};

/**
 * Validates a single row according to Backend Database Validation Rules
 */
export const validateOperationRow = (row, dir, excelRowNum, sheetName) => {
  const issues = [];
  const ref = (dir === 'Import' ? row.bl : row.booking) || `Row ${excelRowNum}`;

  // === 1. FATAL ERRORS (Blockers) ===
  if (dir === 'Import') {
    if (!row.bl || !row.bl.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'M/BL (رقم البوليصة)',
        severity: 'error',
        message: 'رقم بوليصة الشحن (M/BL) مطلوب ولا يمكن أن يكون فارغاً طبقاً لقواعد قاعدة البيانات.',
        action: 'أدخل رقم البوليصة لهذا الصف أو تأكد من دمجه مع الشحنة الرئيسية.',
      });
    } else if (row.bl.length > 120) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'M/BL (رقم البوليصة)',
        severity: 'error',
        message: `رقم البوليصة يتجاوز الحد الأقصى المسموح (120 حرفاً). الطول الحالي: ${row.bl.length}`,
        action: 'قم باختصار رقم البوليصة ليصبح 120 حرفاً كحد أقصى.',
      });
    }

    if (!row.client || !row.client.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Client (اسم العميل)',
        severity: 'error',
        message: 'اسم العميل مطلوب للشحنة الوارد.',
        action: 'حدد اسم العميل التابع له الشحنة.',
      });
    }

    if (!row.line || !row.line.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Shipping Line (الخط الملاحي)',
        severity: 'error',
        message: 'الخط الملاحي مطلوب.',
        action: 'حدد اسم الخط الملاحي في الشيت.',
      });
    }

    if (!row.dest || !row.dest.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Destination (مكان التعتيق)',
        severity: 'error',
        message: 'مكان التعتيق (Destination) مطلوب في الوارد.',
        action: 'أدخل مكان التعتيق للشحنة.',
      });
    }

    if (!row.pod || !row.pod.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'POD (ميناء الوصول)',
        severity: 'error',
        message: 'ميناء الوصول (POD) مطلوب.',
        action: 'أدخل ميناء الوصول.',
      });
    }

    if (row.cntr && row.cntr.length > 20) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr,
        field: 'Container # (رقم الحاوية)',
        severity: 'error',
        message: `رقم الحاوية يتجاوز 20 حرفاً في الوارد (${row.cntr}).`,
        action: 'تأكد من صحة رقم الحاوية واحذف أي مسافات زائدة.',
      });
    }
  } else {
    // Export Validations
    if (!row.booking || !row.booking.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Booking No. (رقم الحجز)',
        severity: 'error',
        message: 'رقم الحجز (Booking No) مطلوب في الصادر ولا يمكن أن يكون فارغاً.',
        action: 'أدخل رقم البوكينج لهذا الصف.',
      });
    } else if (row.booking.length > 120) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Booking No. (رقم الحجز)',
        severity: 'error',
        message: `رقم البوكينج يتجاوز الحد الأقصى (120 حرفاً). الطول الحالي: ${row.booking.length}`,
        action: 'اختصر رقم البوكينج.',
      });
    }

    if (!row.client || !row.client.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Client (اسم العميل)',
        severity: 'error',
        message: 'اسم العميل مطلوب للشحنة الصادر.',
        action: 'حدد اسم العميل.',
      });
    }

    if (!row.line || !row.line.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Shipping Line (الخط الملاحي)',
        severity: 'error',
        message: 'الخط الملاحي مطلوب.',
        action: 'حدد اسم الخط الملاحي.',
      });
    }

    if (!row.pol || !row.pol.trim()) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'POL (ميناء الشحن)',
        severity: 'error',
        message: 'ميناء الشحن (POL) مطلوب في الصادر.',
        action: 'حدد ميناء الشحن.',
      });
    }

    // Backend rule in UpdateExportValidator: ContainerNumber <= 11 characters
    if (row.cntr && row.cntr.length > 11) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr,
        field: 'Container No# (رقم الحاوية)',
        severity: 'error',
        message: `رقم الحاوية في الصادر يتجاوز 11 حرفاً (${row.cntr}). شرط الباك إند الصارم 11 حرف كحد أقصى.`,
        action: 'صحح رقم الحاوية ليكون 11 حرفاً كحد أقصى (4 أحرف + 7 أرقام).',
      });
    }
  }

  // Common Length Limits
  if (row.dest && row.dest.length > 200) {
    issues.push({
      sheet: sheetName,
      dir,
      rowNumber: excelRowNum,
      ref,
      cntr: row.cntr || '',
      field: 'Destination (الموقع)',
      severity: 'error',
      message: 'اسم الموقع يتجاوز الحد الأقصى (200 حرف).',
      action: 'اختصر اسم الموقع.',
    });
  }

  if (row.missDoc && row.missDoc.length > 500) {
    issues.push({
      sheet: sheetName,
      dir,
      rowNumber: excelRowNum,
      ref,
      cntr: row.cntr || '',
      field: 'Missing Docs (المستندات الناقصة)',
      severity: 'error',
      message: 'حقل المستندات الناقصة يتجاوز 500 حرف.',
      action: 'اختصر وصف المستندات الناقصة.',
    });
  }

  // === 2. OPERATIONAL WARNINGS (Actionable notices) ===
  if (dir === 'Import') {
    if (!row.free) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Free Time Till (تاريخ السماح)',
        severity: 'warning',
        message: 'تاريخ انتهاء فترة السماح غير محدد أو غير صالح.',
        action: 'يُفضل تسجيل تاريخ السماح لحساب غرامات الأرضيات والموانئ.',
      });
    }

    if (!row.reqDate) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Required Offloading Date (تاريخ التعتيق)',
        severity: 'warning',
        message: 'تاريخ التعتيق المطلوب غير مسجل أو غير صالح.',
        action: 'يُفضل تسجيل موعد التعتيق المطلوب لتنسيق حركة السيارات.',
      });
    }
  } else {
    // Export Warnings
    if (!row.cut) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Cut Off (آخر موعد للتسليم)',
        severity: 'warning',
        message: 'آخر موعد لتسليم الحاوية بالميناء (Cut Off) غير مسجل.',
        action: 'سجل موعد الـ Cut Off لتفادي فوات رحلة المركب.',
      });
    }

    const clr = String(row.clrType || '').toUpperCase().trim();
    if (!clr || (clr !== 'CERT' && clr !== 'BOSLA' && !clr.includes('BOSLA'))) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr || '',
        field: 'Clearance Type (نوع التخليص)',
        severity: 'warning',
        message: `نوع التخليص غير محدد كـ CERT أو BOSLA (القيمة: "${row.clrType || 'فارغ'}").`,
        action: 'سيتم تعيين نوع التخليص كـ CERT افتراضياً.',
      });
    }
  }

  // Container presence warning
  if (!row.cntr || !row.cntr.trim()) {
    issues.push({
      sheet: sheetName,
      dir,
      rowNumber: excelRowNum,
      ref,
      cntr: '',
      field: 'Container # (رقم الحاوية)',
      severity: 'warning',
      message: 'رقم الحاوية فارغ في هذا الصف.',
      action: 'يمكنك استيراد الصف واستكمال رقم الحاوية لاحقاً عند ورودها.',
    });
  } else {
    // ISO 6346 format check notice (4 letters + 7 numbers)
    const cleanCntr = row.cntr.trim().toUpperCase();
    if (!/^[A-Z]{4}\d{7}$/.test(cleanCntr)) {
      issues.push({
        sheet: sheetName,
        dir,
        rowNumber: excelRowNum,
        ref,
        cntr: row.cntr,
        field: 'Container # (رقم الحاوية)',
        severity: 'warning',
        message: `تنسيق الحاوية "${row.cntr}" قد لا يطابق المعيار الدولي ISO (4 أحرف + 7 أرقام).`,
        action: 'تأكد من دقة كتابة رقم الحاوية لتجنب أخطاء تتبع الخط الملاحي.',
      });
    }
  }

  return issues;
};

/**
 * Parses an Excel file with dynamic sheet classification, multi-container forward-filling,
 * and comprehensive row-by-row validation.
 */
export const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: false });
        const result = {
          Import: [],
          Export: [],
          issues: [],
          stats: {
            totalRows: 0,
            importRows: 0,
            exportRows: 0,
            errorCount: 0,
            warningCount: 0,
            validCount: 0,
            sheetsDetected: [],
          },
        };

        wb.SheetNames.forEach((sheetName) => {
          const ws = wb.Sheets[sheetName];
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
          if (!aoa.length) return;

          // Find header row (check first 10 rows for header tokens)
          let headerIdx = -1;
          for (let i = 0; i < Math.min(10, aoa.length); i++) {
            const rowStr = (aoa[i] || []).map((c) => String(c || '').toUpperCase()).join(' ');
            if (rowStr.includes('CNTR') || rowStr.includes('M/BL') || rowStr.includes('BOOKING') || rowStr.includes('VOLUME')) {
              headerIdx = i;
              break;
            }
          }
          if (headerIdx === -1) headerIdx = 0;

          const rawHeaders = aoa[headerIdx] || [];
          const dir = detectSheetDirection(rawHeaders, sheetName);
          if (!dir) return; // Skip non-operation sheets (e.g. UPLOAD REVIEW or empty)

          result.stats.sheetsDetected.push({ sheetName, dir });

          const colMap = mapHeadersToKeys(rawHeaders);
          let currentShipment = null;

          for (let rIdx = headerIdx + 1; rIdx < aoa.length; rIdx++) {
            const rawRow = aoa[rIdx];
            if (!rawRow || !rawRow.some((x) => x !== null && String(x).trim() !== '')) continue;

            // Skip Arabic subheader / translation rows
            const rowStr = rawRow.map((x) => String(x || '')).join(' ');
            if (rowStr.includes('رقم الشهاده') || rowStr.includes('تاريخ استلام') || rowStr.includes('اسم السائق')) {
              continue;
            }

            const getVal = (k) => {
              if (colMap[k] === undefined) return '';
              const val = rawRow[colMap[k]];
              return val !== null && val !== undefined ? String(val).trim() : '';
            };

            const getDateVal = (k) => {
              if (colMap[k] === undefined) return null;
              return fixDate(rawRow[colMap[k]]);
            };

            const getTimeVal = (k) => {
              if (colMap[k] === undefined) return '';
              return normTime(rawRow[colMap[k]]);
            };

            const rowShipKey = dir === 'Import' ? getVal('bl') : getVal('booking');
            const rowVol = getVal('vol');

            // Forward-Fill Check: A new shipment starts if BL / Booking is non-empty,
            // or if CNTR Volume is set on a new row.
            if (rowShipKey || (rowVol && !currentShipment)) {
              currentShipment = {
                shipNo: getVal('shipNo'),
                vol: rowVol,
                oper: getVal('oper'),
                cert: getVal('cert'),
                client: getVal('client'),
                line: getVal('line'),
                dest: getVal('dest'),
                pod: getVal('pod'),
                pol: getVal('pol'),
                pow: getVal('pow'),
                free: getDateVal('free'),
                cut: getDateVal('cut'),
                reqDate: getDateVal('reqDate'),
                reqTime: getTimeVal('reqTime'),
                clrType: getVal('clrType'),
                customs: getVal('customs'),
                bl: getVal('bl'),
                booking: getVal('booking'),
                invRcv: getDateVal('invRcv'),
              };
            }

            // Construct row with carry-forward shipment context
            const row = {
              ...(currentShipment || {}),
              dir,
              _rowId: `imp_${dir.toLowerCase()}_${rIdx + 1}_${Math.random().toString(36).slice(2, 7)}`,
              _excelRow: rIdx + 1,
              _sheet: sheetName,
              // Per-container fields
              size: normalizeContainerType(getVal('size') || currentShipment?.size || ''),
              cntr: getVal('cntr'),
              trucker: getVal('trucker'),
              car: getVal('car'),
              driver: getVal('driver'),
              mob: getVal('mob'),
              status: getVal('status') || 'Open',
              arrDate: getDateVal('arrDate'),
              arrTime: getTimeVal('arrTime'),
              gateOut: getDateVal('gateOut'),
              gateOutT: getTimeVal('gateOutT'),
              checkout: getDateVal('checkout'),
              missDoc: getVal('missDoc'),
              missRcv: getDateVal('missRcv'),
            };

            // If shipment-level attributes are overridden on this specific row, apply them
            if (getVal('client')) row.client = getVal('client');
            if (getVal('line')) row.line = getVal('line');
            if (getVal('dest')) row.dest = getVal('dest');
            if (getVal('clrType')) row.clrType = getVal('clrType');
            if (getVal('cert')) row.cert = getVal('cert');

            // Only proceed if row has at least an operational reference or container
            if (row.cntr || row.bl || row.booking || row.client) {
              const rowIssues = validateOperationRow(row, dir, rIdx + 1, sheetName);
              const hasErrors = rowIssues.some((i) => i.severity === 'error');
              const hasWarnings = rowIssues.some((i) => i.severity === 'warning');

              row._hasError = hasErrors;
              row._hasWarning = hasWarnings;
              row._issues = rowIssues;

              result.issues.push(...rowIssues);
              result[dir].push(row);
            }
          }
        });

        // Cross-Row Duplicate Checks:
        // 1. Shipment # must be unique across all operations (Import and Export together)
        const seenShipmentNumbers = new Map();
        const allParsedRows = [...result.Import, ...result.Export];

        allParsedRows.forEach((row) => {
          const shipNo = (row.shipNo || '').trim();
          if (!shipNo) return;
          const ref = (row.dir === 'Import' ? row.bl : row.booking) || shipNo;
          const key = shipNo.toLowerCase();

          if (!seenShipmentNumbers.has(key)) {
            seenShipmentNumbers.set(key, { ref, dir: row.dir, rowNum: row._excelRow, sheet: row._sheet });
          } else {
            const first = seenShipmentNumbers.get(key);
            if (first.ref !== ref || first.dir !== row.dir) {
              const issue = {
                sheet: row._sheet,
                dir: row.dir,
                rowNumber: row._excelRow,
                ref,
                cntr: row.cntr || '',
                field: 'Shipment # (رقم الشحنة)',
                severity: 'error',
                message: `رقم الشحنة "${shipNo}" مكرر ومسجل لشحنة أخرى في الملف (${first.dir === 'Import' ? 'الوارد' : 'الصادر'} - صف ${first.rowNum}). يجب أن يكون رقم الشحنة فريداً ومستقلاً على مستوى الوارد والصادر معاً.`,
                action: 'تأكد من إعطاء كل شحنة رقم شحنة فريد وغير مكرر.',
              };
              row._hasError = true;
              row._issues = row._issues || [];
              row._issues.push(issue);
              result.issues.push(issue);
            }
          }
        });

        // Enrich all rows with computed metrics
        result.Import = enrich(result.Import);
        result.Export = enrich(result.Export);

        const errorCount = result.issues.filter((i) => i.severity === 'error').length;
        const warningCount = result.issues.filter((i) => i.severity === 'warning').length;
        const totalRows = result.Import.length + result.Export.length;
        const validCount = result.Import.filter((r) => !r._hasError).length + result.Export.filter((r) => !r._hasError).length;

        result.stats = {
          ...result.stats,
          totalRows,
          importRows: result.Import.length,
          exportRows: result.Export.length,
          errorCount,
          warningCount,
          validCount,
        };

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Generates an Excel report of all validation issues for download
 */
export const exportValidationReport = (issues = [], fileName = 'TPT_Validation_Report.xlsx') => {
  if (!issues || !issues.length) return;
  const wb = XLSX.utils.book_new();

  const headers = [
    'نوع الشيت',
    'رقم الصف بالإكسيل',
    'الرقم المرجعي (Booking / M-BL)',
    'رقم الحاوية',
    'الحقل',
    'مستوى الخطورة',
    'تفاصيل المشكلة',
    'الإجراء المطلوب',
  ];

  const data = [headers];
  issues.forEach((i) => {
    data.push([
      i.dir === 'Import' ? 'وارد (Import)' : 'صادر (Export)',
      i.rowNumber,
      i.ref || '',
      i.cntr || '',
      i.field || '',
      i.severity === 'error' ? 'خطأ حرج (Error)' : 'تنبيه (Warning)',
      i.message || '',
      i.action || '',
    ]);
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 18 },
    { wch: 18 },
    { wch: 25 },
    { wch: 18 },
    { wch: 25 },
    { wch: 18 },
    { wch: 50 },
    { wch: 45 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'تقرير التدقيق والفحص');
  XLSX.writeFile(wb, fileName);
};
