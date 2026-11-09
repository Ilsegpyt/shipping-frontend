// TPT Engine — Processing, Date Formatting, Metric Enrichment & Excel I/O
import * as XLSX from 'xlsx';
import { COLS } from './constants';
import { normalizeContainerType } from './operationsAdapter';

export const fmtDay = (d) => {
  if (!d) return '';
  const p = fixDate(d);
  if (!p) return String(d);
  const [y, m, dd] = p.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
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

  // Format with month name without year: '4/Jan' or '04-Nov' (defaults to current year)
  const mNamedShort = s.match(/^(\d{1,2})[\s/-]+([A-Za-z]{3,})$/);
  if (mNamedShort) {
    const d = mNamedShort[1].padStart(2, '0');
    const mon = mNamedShort[2].toLowerCase().slice(0, 3);
    const mo = monthsMap[mon];
    const y = new Date().getFullYear();
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

  // Format: 'DD/MM' or 'D/M' (defaults to current year)
  const mShort = s.match(/^(\d{1,2})[/-](\d{1,2})$/);
  if (mShort) {
    const d = +mShort[1];
    const mo = +mShort[2];
    const y = new Date().getFullYear();
    if (mo <= 12 && d <= 31) return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
  const str = String(v).trim();
  let m = str.match(/^(\d{1,2})[:.](\d{2})\s*([AaPp][Mm]?)?/);
  let h = 0;
  let mi = 0;
  let ap = '';
  if (m) {
    h = +m[1];
    mi = +m[2];
    ap = (m[3] || '').toLowerCase();
  } else {
    // Standalone hour: '8', '8am', '10pm', '22'
    const mSingle = str.match(/^(\d{1,2})\s*([AaPp][Mm]?)?$/);
    if (mSingle) {
      h = +mSingle[1];
      mi = 0;
      ap = (mSingle[2] || '').toLowerCase();
    } else {
      return '';
    }
  }
  if (ap.startsWith('p') && h < 12) h += 12;
  if (ap.startsWith('a') && h === 12) h = 0;
  if (h > 23 || mi > 59) return '';
  return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0');
};

export const fmtTime12 = (v) => {
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

export const safeTimeOnly = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const nt = normTime(v);
  return nt ? (nt.length === 5 ? nt + ':00' : nt.slice(0, 8)) : null;
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
        if (c.k === 'bayata') {
          const b = computeBayata(r);
          return b ? b.labelAr : '';
        }
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

/**
 * Safely parse a date and time value into a JavaScript Date object (in local timezone).
 * Supports standard dates, Excel parsed dates, 24-hour time "14:30", and 12-hour time "02:30 PM".
 */
export const parseDateTimeSafe = (dateVal, timeVal) => {
  if (!dateVal) return null;
  const dStr = fixDate(dateVal);
  if (!dStr) return null;

  let hours = 8;
  let minutes = 0;

  if (timeVal !== null && timeVal !== undefined) {
    const tTrim = String(timeVal).trim();
    if (tTrim) {
      // 12-hour format: '08:30 AM' or '8:30pm'
      const match12 = tTrim.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
      if (match12) {
        hours = parseInt(match12[1], 10);
        minutes = parseInt(match12[2], 10);
        const meridiem = (match12[3] || '').toUpperCase();
        if (meridiem === 'PM' && hours < 12) hours += 12;
        if (meridiem === 'AM' && hours === 12) hours = 0;
      } else {
        // Direct 24h 'HH:mm'
        const parts = tTrim.split(':');
        if (parts.length >= 2) {
          hours = parseInt(parts[0], 10) || 0;
          minutes = parseInt(parts[1], 10) || 0;
        }
      }
    }
  }

  const [y, m, d] = dStr.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
};

/**
 * Compute Bayata (Overnight / Demurrage at client site) for Import operations:
 * Rules:
 * 1. Required Offload Date + Time is client baseline.
 * 2. Grace period for driver arrival: max 2 hours after requested offloading time.
 * 3. If driver arrived > 2 hours late => Disqualified (0 bayata).
 * 4. Countdown baseline:
 *    - If arrived early (before reqDt) => start countdown from reqDt.
 *    - If arrived in range [reqDt, reqDt + 2h] => start countdown from arrDt.
 * 5. Free unloading window at client site: 24 hours.
 * 6. After 24 hours: any fractional day beyond 24h counts as full bayata day (Math.ceil((diffHours - 24) / 24)).
 * 7. If Gate Out is not yet recorded and > 24 hours elapsed => Pending / Warning status for operations.
 */
export const computeBayata = (r) => {
  if (!r) return null;

  const reqDt = parseDateTimeSafe(r.reqDate, r.reqTime);
  const arrDt = parseDateTimeSafe(r.arrDate, r.arrTime);

  if (!reqDt || !arrDt) {
    return {
      status: 'pending_arrival',
      labelAr: 'بانتظار الوصول',
      labelEn: 'Awaiting Arrival',
      days: 0,
      otla: 0,
    };
  }

  // Grace Period: 2 hours after requested time
  const maxAllowedArrival = new Date(reqDt.getTime() + 2 * 60 * 60 * 1000);

  // If driver arrived after maxAllowedArrival (> 2 hours late): Disqualified
  if (arrDt > maxAllowedArrival) {
    const lateHours = Math.round(((arrDt.getTime() - reqDt.getTime()) / (1000 * 60 * 60)) * 10) / 10;
    return {
      status: 'disqualified',
      labelAr: 'غير مستحق (تأخر في الوصول)',
      labelEn: 'Disqualified (Arrived Late)',
      lateHours,
      days: 0,
      otla: 0,
    };
  }

  // Fair Countdown Baseline:
  // - If driver arrived early (arrDt < reqDt): countdown starts strictly from reqDt (client appointment).
  // - If driver arrived in range [reqDt, reqDt + 2h]: countdown starts from driver arrival (arrDt).
  const countdownStart = arrDt < reqDt ? reqDt : arrDt;

  // Case 1: Gate Out recorded
  const gateOutDt = parseDateTimeSafe(r.gateOut, r.gateOutT);
  if (gateOutDt) {
    // If gate out was mistakenly entered before arrival
    if (gateOutDt < arrDt) {
      return {
        status: 'invalid',
        labelAr: 'تاريخ الخروج يسبق الوصول',
        labelEn: 'Invalid (Gate Out < Arrive)',
        days: 0,
        otla: 0,
      };
    }

    // If driver left before or at countdownStart (e.g. arrived early and left before appointment)
    if (gateOutDt <= countdownStart) {
      return {
        status: 'on_time',
        labelAr: 'في المهلة',
        labelEn: 'On Time',
        diffHours: 0,
        days: 0,
        otla: 0,
      };
    }

    const diffMs = gateOutDt.getTime() - countdownStart.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Rule 1: <= 10 hours => On Time (في المهلة)
    if (diffHours <= 10) {
      return {
        status: 'on_time',
        labelAr: 'في المهلة',
        labelEn: 'On Time',
        diffHours: Math.max(0, Math.round(diffHours * 10) / 10),
        days: 0,
        otla: 0,
      };
    }

    // Rule 2: > 10 hours and <= 24 hours => 1 Otla (1 عطلة)
    if (diffHours <= 24) {
      return {
        status: 'otla',
        labelAr: '1 عطلة',
        labelEn: '1 Otla',
        diffHours: Math.round(diffHours * 10) / 10,
        days: 0,
        otla: 1,
      };
    }

    // Rule 3: > 24 hours => Bayata (تُلغى العطلة تماماً وتحل البياتة محلها)
    // Any fraction beyond 24 hours counts as full day bayata:
    // 24.01h - 48.00h => 1 bayata
    // 48.01h - 72.00h => 2 bayata
    const extraHours = diffHours - 24;
    const bayataDays = Math.ceil(extraHours / 24);

    return {
      status: 'bayata',
      labelAr: `${bayataDays} بياتة`,
      labelEn: `${bayataDays} Bayata`,
      diffHours: Math.round(diffHours * 10) / 10,
      days: bayataDays,
      otla: 0,
    };
  }

  // Case 2: Gate Out NOT recorded yet -> Check against current time
  const now = new Date();

  // Driver ONLY gets 'early_arrival' if actual arrival was strictly earlier than the requested appointment AND requested appointment hasn't arrived yet
  if (arrDt < reqDt && now < reqDt) {
    return {
      status: 'early_arrival',
      labelAr: 'وصول مبكر (بانتظار الميعاد)',
      labelEn: 'Early Arrival (Awaiting Req Time)',
      diffHours: 0,
      days: 0,
      otla: 0,
      isPending: false,
    };
  }

  const diffMs = Math.max(0, now.getTime() - countdownStart.getTime());
  const diffHours = diffMs / (1000 * 60 * 60);

  // If elapsed time > 24 hours => Pending Bayata
  if (diffHours > 24) {
    const extraHours = diffHours - 24;
    const estDays = Math.ceil(extraHours / 24);
    return {
      status: 'pending_gateout',
      labelAr: `تجاوز 24س (${estDays} بياتة جارية)`,
      labelEn: `Over 24h (${estDays} Est. Bayata)`,
      diffHours: Math.round(diffHours * 10) / 10,
      days: estDays,
      otla: 0,
      isPending: true,
    };
  }

  // If elapsed time > 10 hours => Pending Otla
  if (diffHours > 10) {
    return {
      status: 'pending_otla',
      labelAr: 'تجاوز 10س (عطلة جارية)',
      labelEn: 'Over 10h (Pending Otla)',
      diffHours: Math.round(diffHours * 10) / 10,
      days: 0,
      otla: 1,
      isPending: true,
    };
  }

  return {
    status: 'in_progress',
    labelAr: 'جاري العمل',
    labelEn: 'In Progress',
    diffHours: Math.round(diffHours * 10) / 10,
    days: 0,
    otla: 0,
  };
};
