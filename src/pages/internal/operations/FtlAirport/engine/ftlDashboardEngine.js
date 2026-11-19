import Chart from 'chart.js/auto';
import { getDashboardMarkup } from './dashboardMarkup.js';

export const DASHBOARD_NAMESPACE = '__FTL_DASH__';
let ACTIVE_DASHBOARD_ENGINE = null;

export function createFtlDashboardEngine(root, options = {}) {
  if (!root) throw new Error('createFtlDashboardEngine: root element is required');
  if (ACTIVE_DASHBOARD_ENGINE) {
    try { ACTIVE_DASHBOARD_ENGINE.destroy?.(); } catch (e) { /* ignore */ }
    ACTIVE_DASHBOARD_ENGINE = null;
  }

  let destroyed = false;
  const __cleanups = [];
  const __on = (target, type, fn, opts) => {
    target.addEventListener(type, fn, opts);
    __cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const __emit = (type, detail) => {
    if (!destroyed && options.onEvent) {
      try { options.onEvent(type, detail); } catch (e) { console.error(e); }
    }
  };

  const printHost = document.createElement('div');
  printHost.className = 'ftl-root ftl-print-host';
  printHost.setAttribute('data-theme', 'light');

  let LANG = options.language === 'ar' ? 'ar' : 'en';
  let THEME = options.theme === 'dark' ? 'dark' : 'light';

  root.classList.add('ftl-root');
  root.setAttribute('data-theme', THEME);
  root.dir = LANG === 'ar' ? 'rtl' : 'ltr';
  root.lang = LANG;
  root.innerHTML = getDashboardMarkup();

  const $ = id => root.querySelector('#' + CSS.escape(id)) || printHost.querySelector('#' + CSS.escape(id));

  /* ============================ 1. i18n ============================ */
  const T = {
    en: {
      title: 'FTL Airport Dashboard',
      sub: 'Air shipments · Import & Export · Operations',
      kicker: 'ILS EGYPT · FTL AIRPORT',
      noData: 'No data loaded',
      overview: 'Overview',
      refresh: '↻ Refresh',
      exportBtn: 'Export Dashboard',
      help: 'Help',
      langBtn: 'عربي',
      days: 'd', hrs: 'h',
      kShip: 'Shipments', kShipSub: a => `${a} trips per shipment on avg`,
      kOnTime: 'Arrived on time', kOnTimeSub: (o, n) => `${o} of ${n} at or before required time`, kOnTimeNone: 'no actual arrive dates',
      kOffDelay: 'Offloading delay', kOffDelaySub: (l, n, p) => `${l} of ${n} late (${p}%) vs required date/time`, kOffDelayNone: 'no actual arrival times',
      kTransit: 'Transit time', kTransitSub: n => `avg hours from gate out to arrival · ${n} trips`, kTransitNone: 'no gate out & arrive pairs',
      kDestU: 'Destinations', kDestUSub: (d, p) => `${d} takes ${p}% of trips`,
      kPortU: 'Terminals / Ports', kPortUSub: (d, p) => `${d} takes ${p}% of trips`,
      kTrips: 'Truck trips', kTripsSub: (i, e) => `${i} import · ${e} export`,
      kCont: 'Packages / Volume', kContSub: (a, b, l) => `${a} packages · ${b} kg · ${l} cbm`,
      kClients: 'Clients', kClientsSub: n => `across ${n} sites`,
      kTruckers: 'Transporters', kTruckersSub: p => `top 3 carry ${p}% of trips`,
      kRisk: 'Late arrival risk', kRiskSub: (n, d) => `${n} of ${d} trips late vs schedule`,
      kFree: 'Free time buffer', kFreeSub: 'avg days before free-time end',
      kOper: 'Operations staff', kOperSub: n => `busiest handles ${n}% of trips`,
      kTrucks: 'Trucks used', kTrucksSub: a => `${a} trips per truck on average`,
      kCut: 'Cut-off buffer', kCutSub: (l, n) => `${l} of ${n} after cut-off`, kCutSubNone: 'no cut-off dates recorded',
      kRoute: 'Routes', kRouteSub: n => `across ${n} routes`,
      offBuckets: ['6h+ early', 'On time', 'Up to 6h late', '6–24h late', 'Over a day late'],
      onTimeL: 'On time', lateL: 'Late',
      charts: {
        chMonthly: ['Trips by month', b => `Truck trips by ${b} month — click a month to filter`],
        chDaily: ['Daily pattern', 'Trips per day — click a point to filter'],
        chDir: ['Import vs Export', 'Direction breakdown'],
        chClient: ['Top clients', 'Volume share — click to filter'],
        chTrucker: ['Transporters', 'Trips by transport company — click to filter'],
        chDest: ['Delivery sites', 'Where shipments are delivered or picked up'],
        chOper: ['Operations workload', 'Trips handled per operations coordinator'],
        chLine: ['Terminals / Airlines', 'Terminal & airline distribution'],
        chFree: ['Free-time usage', 'Days left before demurrage when pulled'],
        chRiskClient: ['Late arrivals by client', '% of trips arriving late per client'],
        chTruckerClient: ['Transporter coverage', 'Distinct clients served per transporter'],
        chOffDelay: ['Required vs actual arrival', 'Arrival deviation from required offloading time'],
        chOnTime: ['Arrival performance', 'Actual arrival against required schedule'],
        chDelayTrucker: ['Delay share per transporter', '% of transporter trips arriving late (min 3)'],
        chStatus: ['Status distribution', 'Open vs Delivered shipments'],
        chPort: ['Airports / Ports', 'Arrival / Destination airports (AOD)'],
        chRoute: ['Routes', 'Origin → Destination routes']
      },
      basisNames: { load: 'offloading date', reqDate: 'required offloading', arrDate: 'actual arrival', gateIn: 'gate in', gateOut: 'gate out', free: 'free-time end' },
      dsTrips: 'Trips', axTrips: 'Trips', axDays: 'Days', axPct: '% of trips', axClients: 'Clients',
      freeBuckets: ['Late', 'Same day', '1–2 days left', '3–5 days left', '6+ days left'],
      tip: 'Tip: click any bar, slice, or point to cross-filter the whole dashboard',
      filteredBy: 'Filtered by', clickAgain: '— click again to clear filter',
      fNames: { dir: 'direction', client: 'client', trucker: 'transporter', dest: 'site', oper: 'operations', line: 'terminal', port: 'airport/port', risk: 'demurrage', free: 'free time', day: 'day' },
      insH: 'Key observations', insHMode: d => `Key observations — ${d}`, insSub: 'Generated dynamically from live filtered data',
      dir: { Import: 'Import', Export: 'Export' },
      risk: { Late: 'Late arrival', OK: 'On time' },
      workflow: { open: 'Open', delivered: 'Delivered', allShipments: 'All shipments', deliveryStatus: 'Delivery status' },
      x: {
        title: 'Export Dashboard to PDF',
        hint: 'Pick what to include in the export. Choose "Save as PDF" and keep "Background graphics" on in the print window.',
        cover: 'Cover page (identity + active filters)', insights: 'Key observations', kpis: 'KPI metrics', charts: 'Charts',
        go: 'Print / Save PDF', count: (k, c) => `${k} KPIs · ${c} charts selected`,
        kicker: 'ILS EGYPT · FTL AIRPORT', generated: 'Generated', period: 'Data period', ops: 'Truck trips', clients: 'Clients', filters: 'Active filters', allData: 'All data', basis: 'Date basis'
      },
      ins: {
        none: 'No trips match the current filter.',
        topClient: (c, p) => `<b>${c}</b> is the largest account: ${p}% of all trips in this view.`,
        top3: (p, names) => `Top 3 transporters carry <b>${p}%</b> of trips (${names}).`,
        topTrucker: (t, n, p) => `<b>${t}</b> is the most used transporter: ${n} trips (${p}%).`,
        dest: (d, p) => `<b>${d}</b> is the busiest site with ${p}% of trips.`,
        risk: (n, p) => `<b>${n} trips (${p}%)</b> arrived late vs required schedule.`,
        riskClient: (c, p) => `Highest delay share: <b>${c}</b> with ${p}% of trips arriving late.`,
        free: d => `On average shipments have <b>${d} days</b> of buffer.`,
        oper: (u, p) => `<b>${u}</b> coordinates the most shipments: ${p}% of trips.`,
        truck: (n, a) => `<b>${n}</b> trucks used · ${a} trips per truck on average.`,
        exportShare: p => `Export trips are <b>${p}%</b> of the total.`,
        mom: (m, ch) => `Trips in ${m} are <b>${ch >= 0 ? '+' : ''}${ch}%</b> vs previous month.`,
        route: (r, p) => `Busiest route: <b>${r}</b> with ${p}% of trips.`,
        port: (p, pc) => `<b>${p}</b> handles ${pc}% of inbound volume.`
      }
    },
    ar: {
      title: 'لوحة تحليلات FTL Airport',
      sub: 'شحنات المطار · الاستيراد والتصدير · العمليات',
      kicker: 'ILS EGYPT · FTL AIRPORT',
      noData: 'لا توجد بيانات مسجلة',
      overview: 'نظرة عامة',
      refresh: '↻ تحديث البيانات',
      exportBtn: 'تصدير اللوحة',
      help: 'مساعدة',
      langBtn: 'EN',
      days: 'يوم', hrs: 'ساعة',
      kShip: 'الشحنات', kShipSub: a => `${a} نقلة لكل شحنة في المتوسط`,
      kOnTime: 'الوصول في الميعاد', kOnTimeSub: (o, n) => `${o} من ${n} في الموعد المحدد أو قبله`, kOnTimeNone: 'لا توجد تواريخ وصول فعلية',
      kOffDelay: 'تأخير التعتيق', kOffDelaySub: (l, n, p) => `${l} من ${n} متأخرة (${p}%) عن الموعد المطلوب`, kOffDelayNone: 'لا توجد أوقات وصول فعلية',
      kTransit: 'زمن العبور', kTransitSub: n => `متوسط الساعات من خروج البوابة للوصول · ${n} نقلة`, kTransitNone: 'لا توجد أزواج خروج ووصول',
      kDestU: 'الوجهات', kDestUSub: (d, p) => `${d} تستحوذ على ${p}% من النقلات`,
      kPortU: 'المحطات / الموانئ', kPortUSub: (d, p) => `${d} تستقبل ${p}% من النقلات`,
      kTrips: 'نقلات السيارات', kTripsSub: (i, e) => `${i} استيراد · ${e} تصدير`,
      kCont: 'الطرود / الحجم', kContSub: (a, b, l) => `${a} طرد · ${b} كجم · ${l} م³`,
      kClients: 'العملاء', kClientsSub: n => `على ${n} موقع تسليم`,
      kTruckers: 'شركات النقل', kTruckersSub: p => `أكبر 3 شركات تنقل ${p}% من النقلات`,
      kRisk: 'نسبة التأخير', kRiskSub: (n, d) => `${n} من ${d} نقلة متأخرة عن الموعد المطلوب`,
      kFree: 'مهلة السماح', kFreeSub: 'متوسط الأيام المتبقية قبل انتهاء المهلة',
      kOper: 'موظفو العمليات', kOperSub: n => `الأكثر انشغالاً يتولى ${n}% من النقلات`,
      kTrucks: 'السيارات المستخدمة', kTrucksSub: a => `${a} نقلة لكل سيارة في المتوسط`,
      kCut: 'المهلة قبل الميعاد', kCutSub: (l, n) => `${l} من ${n} بعد الموعد المحدد`, kCutSubNone: 'لا توجد تواريخ مسجلة',
      kRoute: 'خطوط السير', kRouteSub: n => `عبر ${n} خط سير`,
      offBuckets: ['مبكر 6+ ساعات', 'في الميعاد', 'متأخر حتى 6 س', 'متأخر 6–24 س', 'متأخر أكثر من يوم'],
      onTimeL: 'في الميعاد', lateL: 'متأخر',
      charts: {
        chMonthly: ['النقلات شهرياً', b => `نقلات السيارات شهرياً حسب ${b} — اضغط على شهر للفلترة`],
        chDaily: ['النمط اليومي', 'عدد النقلات يومياً — اضغط على يوم للفلترة'],
        chDir: ['استيراد مقابل تصدير', 'توزيع اتجاه الحركة'],
        chClient: ['أكبر العملاء', 'حصة حجم النقلات — اضغط للفلترة'],
        chTrucker: ['شركات النقل', 'حصة كل ناقل من النقلات — اضغط للفلترة'],
        chDest: ['مواقع التسليم', 'المواقع الأكثر استقبالاً للشحنات'],
        chOper: ['توزيع العمليات', 'عدد النقلات المنسقة بواسطة كل موظف'],
        chLine: ['المحطات / الخطوط', 'توزيع محطات المطار وشركات الطيران'],
        chFree: ['استغلال المهل', 'الأيام المتبقية وقت التحرك'],
        chRiskClient: ['نسبة التأخير حسب العميل', 'نسبة النقلات المتأخرة لكل عميل'],
        chTruckerClient: ['تغطية شركات النقل', 'عدد العملاء الذين يخدمهم كل ناقل'],
        chOffDelay: ['الموعد المطلوب مقابل الفعلي', 'مدى انحراف الوصول الفعلي عن الموعد المطلوب'],
        chOnTime: ['أداء الالتزام بالمواعيد', 'الوصول الفعلي مقارنة بالمطلوب'],
        chDelayTrucker: ['نسبة التأخير لكل ناقل', 'نسبة نقلات كل شركة نقل التي وصلت متأخرة'],
        chStatus: ['حالة الشحنات', 'توزيع الشحنات المفتوحة والمسلمة'],
        chPort: ['المطارات / الموانئ', 'مطارات الوصول (AOD) والموانئ'],
        chRoute: ['خطوط السير', 'مسار الشحن ← مسار الوصول']
      },
      basisNames: { load: 'تاريخ التعتيق', reqDate: 'التعتيق المطلوب', arrDate: 'الوصول الفعلي', gateIn: 'دخول البوابة', gateOut: 'خروج البوابة', free: 'نهاية السماح' },
      dsTrips: 'النقلات', axTrips: 'نقلات', axDays: 'أيام', axPct: '% من النقلات', axClients: 'عملاء',
      freeBuckets: ['متأخر', 'نفس اليوم', 'باقي 1–2 يوم', 'باقي 3–5 أيام', 'باقي 6+ أيام'],
      tip: 'جرّب: اضغط على أي عمود أو شريحة — اللوحة بالكامل ستتفلتر تلقائياً',
      filteredBy: 'مفلتر حسب', clickAgain: '— اضغط مرة أخرى لإلغاء الفلتر',
      fNames: { dir: 'الاتجاه', client: 'العميل', trucker: 'شركة النقل', dest: 'الموقع', oper: 'العمليات', line: 'المحطة', port: 'المطار/الميناء', risk: 'التأخير', free: 'فترة السماح', day: 'اليوم' },
      insH: 'تحليلات ذكية وملاحظات', insHMode: d => `تحليلات ذكية — ${d}`, insSub: 'مستخرجة تلقائياً من البيانات الحقيقية المفلترة',
      dir: { Import: 'استيراد', Export: 'تصدير' },
      risk: { Late: 'متأخر', OK: 'في الميعاد' },
      workflow: { open: 'مفتوحة', delivered: 'مُسلّمة', allShipments: 'كل الشحنات', deliveryStatus: 'حالة التسليم' },
      x: {
        title: 'تصدير لوحة التحليلات إلى PDF',
        hint: 'حدد العناصر المراد تضمينها في التقرير. في نافذة الطباعة اختر "حفظ كـ PDF" وتأكد من تفعيل "Background graphics".',
        cover: 'صفحة الغلاف (الهوية + الفلاتر المطبقة)', insights: 'التحليلات الذكية', kpis: 'المؤشرات الرقمية', charts: 'الرسوم البيانية',
        go: 'طباعة / حفظ PDF', count: (k, c) => `${k} مؤشر · ${c} رسم بياني مختار`,
        kicker: 'ILS EGYPT · FTL AIRPORT', generated: 'تاريخ الإصدار', period: 'فترة البيانات', ops: 'نقلات السيارات', clients: 'العملاء', filters: 'الفلاتر النشطة', allData: 'كل البيانات', basis: 'أساس التاريخ'
      },
      ins: {
        none: 'لا توجد نقلات مطابقة للفلاتر المحددة حالياً.',
        topClient: (c, p) => `<b>${c}</b> أكبر حساب عميل: ${p}% من إجمالي النقلات المعروضة.`,
        top3: (p, names) => `أكبر 3 شركات نقل تستحوذ على <b>${p}%</b> من النقلات (${names}).`,
        topTrucker: (t, n, p) => `<b>${t}</b> أكثر ناقل استخداماً: ${n} نقلة (${p}%).`,
        dest: (d, p) => `<b>${d}</b> أكثر موقع تسليم نشاطاً بنسبة ${p}% من النقلات.`,
        risk: (n, p) => `<b>${n} نقلة (${p}%)</b> وصلت متأخرة عن الموعد المطلوب.`,
        riskClient: (c, p) => `أعلى نسبة تأخير: <b>${c}</b> بنسبة ${p}% من نقلاته وصلت متأخرة.`,
        free: d => `في المتوسط الشحنات تتحرك وباقي <b>${d} يوم</b> كمهلة أمان.`,
        oper: (u, p) => `<b>${u}</b> ينسق أكبر عدد من العمليات: ${p}% من النقلات.`,
        truck: (n, a) => `<b>${n}</b> سيارة مستخدمة · ${a} نقلة لكل سيارة في المتوسط.`,
        exportShare: p => `نقلات التصدير تمثل <b>${p}%</b> من الإجمالي.`,
        mom: (m, ch) => `النقلات في ${m} تغيرت بنسبة <b>${ch >= 0 ? '+' : ''}${ch}%</b> عن الشهر السابق.`,
        route: (r, p) => `أنشط خط سير: <b>${r}</b> بنسبة ${p}% من النقلات.`,
        port: (p, pc) => `<b>${p}</b> تستقبل ${pc}% من حركة الوارد.`
      }
    }
  };

  const t = k => T[LANG][k];
  const dirLabel = d => t('dir')[d] || d;
  const riskLabel = r => t('risk')[r] || r;
  const AR = () => LANG === 'ar';
  const monthLocale = () => AR() ? 'ar-EG-u-nu-latn' : 'en';

  /* ============================ 2. state ============================ */
  let DATA = [];
  let VIEW = [];
  let charts = {};
  let freeSel = null, monthSel = null, daySel = null;
  let deliveryFilter = 'All';

  const SELECTS = [
    ['fDir', 'dir'],
    ['fClient', 'client'],
    ['fTrucker', 'trucker'],
    ['fDest', 'dest'],
    ['fOper', 'oper'],
    ['fLine', 'line'],
    ['fPort', 'port'],
    ['fRisk', 'risk']
  ];

  const FREE_BUCKETS = [
    [0, d => d < 0, '#cf4d4d'],
    [1, d => d === 0, '#e07b3a'],
    [2, d => d >= 1 && d <= 2, '#dd9a1f'],
    [3, d => d >= 3 && d <= 5, '#8aa832'],
    [4, d => d >= 6, '#1f8f63']
  ];

  const KPI_MODE = {
    kpiTrips: '*', kpiShip: '*', kpiCont: '*', kpiClients: '*', kpiTruckers: '*',
    kpiOper: '*', kpiTrucks: '*', kpiDestU: '*', kpiPortU: '*', kpiRisk: '*',
    kpiFree: 'Import', kpiOnTime: '*', kpiOffDelay: '*', kpiTransit: '*',
    kpiCut: 'Export', kpiRoute: 'Export'
  };

  const CHART_MODE = {
    chMonthly: '*', chDaily: '*', chClient: '*', chTrucker: '*', chDest: '*',
    chOper: '*', chLine: '*', chTruckerClient: '*', chDir: 'Overview',
    chFree: 'Import', chRiskClient: '*', chPort: '*', chRoute: 'Export',
    chStatus: '*', chOffDelay: '*', chOnTime: '*', chDelayTrucker: '*'
  };

  const SPAN = {
    chMonthly: 8, chDir: 4, chDaily: 12, chClient: 6, chTrucker: 6,
    chRiskClient: 7, chFree: 5, chPort: 6, chRoute: 6, chDest: 5,
    chLine: 4, chOper: 6, chTruckerClient: 6, chOffDelay: 7,
    chOnTime: 5, chDelayTrucker: 12, chStatus: 4
  };

  const KPI_IDS = [
    ['kTrips', 'lTrips', 'kTripsSub', '#0b4f7a'],
    ['kCont', 'lCont', 'kContSub', '#22b8cf'],
    ['kClients', 'lClients', 'kClientsSub', '#0b4f7a'],
    ['kTruckers', 'lTruckers', 'kTruckersSub', '#d8a84a'],
    ['kRisk', 'lRiskK', 'kRiskSub', '#cf4d4d'],
    ['kFree', 'lFree', 'kFreeSub', '#1f8f63'],
    ['kOper', 'lOperK', 'kOperSub', '#0b4f7a'],
    ['kTrucks', 'lTrucks', 'kTrucksSub', '#dd9a1f'],
    ['kCut', 'lCut', 'kCutSub', '#1f8f63'],
    ['kShip', 'lShip', 'kShipSub', '#0b4f7a'],
    ['kOnTime', 'lOnTime', 'kOnTimeSub', '#1f8f63'],
    ['kOffDelay', 'lOffDelay', 'kOffDelaySub', '#cf4d4d'],
    ['kTransit', 'lTransit', 'kTransitSub', '#0e7c86'],
    ['kDestU', 'lDestU', 'kDestUSub', '#22b8cf'],
    ['kPortU', 'lPortU', 'kPortUSub', '#0b4f7a'],
    ['kRoute', 'lRoute', 'kRouteSub', '#22b8cf']
  ];

  const PAL = ['#0b4f7a', '#0e7c86', '#22b8cf', '#5ed0e3', '#8fd9e6', '#66788c', '#d8a84a', '#2a6f97', '#61a5c2', '#9aa6b4'];

  const MODE = () => $('fDir')?.value || '';
  const inMode = (scope, m) => scope === '*' ? true : (scope === 'Overview' ? !m : scope === m);
  const cardBg = () => getComputedStyle(root).getPropertyValue('--card').trim() || '#fff';
  const gridColor = () => root.getAttribute('data-theme') === 'dark' ? '#2b333d' : '#e9ecef';
  const gridOpts = () => ({ grid: { color: gridColor() }, border: { display: false } });
  const noGrid = { grid: { display: false }, border: { display: false } };
  const dim = (hex, on) => on ? hex : hex + '33';
  const fmtN = n => Number(n || 0).toLocaleString('en-US');
  const avg = a => a.length ? a.reduce((x, y) => x + y, 0) / a.length : null;
  const bucketLabel = i => t('freeBuckets')[i] || '';
  const mLabel = m => {
    try { return new Date(m + '-01').toLocaleString(monthLocale(), { month: 'short', year: '2-digit' }); }
    catch { return m; }
  };
  const fmtDay = d => {
    if (!d) return '';
    try { return new Date(d + 'T00:00:00').toLocaleDateString(monthLocale(), { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };
  const normTime = v => {
    if (!v) return null;
    const s = String(v).trim().replace(/\s+/g, '');
    const m = s.match(/^(\d{1,2}):(\d{1,2})/);
    if (!m) return null;
    return String(m[1]).padStart(2, '0') + ':' + String(m[2]).padStart(2, '0');
  };

  function dateBasisLabel() {
    const val = $('dateBasis')?.value || 'load';
    return t('basisNames')[val] || val;
  }

  function bandIndex(e, chart) {
    const axis = chart.options.indexAxis === 'y' ? 'y' : 'x';
    const p = chart.getElementsAtEventForMode(e, 'index', { intersect: false, axis }, true);
    return p.length ? p[0].index : null;
  }

  function ringIndex(e, chart) {
    const arcs = chart.getDatasetMeta(0).data;
    if (!arcs.length) return null;
    const pos = Chart.helpers.getRelativePosition(e, chart);
    const a0 = arcs[0];
    const dx = pos.x - a0.x, dy = pos.y - a0.y, dist = Math.hypot(dx, dy);
    const onRing = dist >= a0.innerRadius - 14 && dist <= a0.outerRadius + 14;
    let ang = Math.atan2(dy, dx);
    if (ang < -Math.PI / 2) ang += Math.PI * 2;
    if (onRing) {
      for (let i = 0; i < arcs.length; i++) {
        const w = arcs[i].endAngle - arcs[i].startAngle;
        if (w < 0.05 && Math.abs(ang - (arcs[i].startAngle + w / 2)) < 0.035) return i;
      }
    }
    const els = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
    if (els.length) return els[0].index;
    if (!onRing) return null;
    for (let i = 0; i < arcs.length; i++) {
      if (ang >= arcs[i].startAngle && ang <= arcs[i].endAngle) return i;
    }
    return null;
  }

  const clickable = {
    onHover: (e, els, ch) => {
      if (e.native?.target) e.native.target.style.cursor = bandIndex(e, ch) !== null ? 'pointer' : 'default';
    }
  };
  const arcClickable = {
    onHover: (e, els, ch) => {
      if (e.native?.target) e.native.target.style.cursor = ringIndex(e, ch) !== null ? 'pointer' : 'default';
    }
  };

  function mkChart(id, cfg) {
    if (charts[id]) {
      try { charts[id].destroy(); } catch { /* ignore */ }
    }
    const el = $(id);
    if (!el) return;
    charts[id] = new Chart(el, cfg);
  }

  function setVal(id, text) {
    const el = $(id);
    if (!el) return;
    const m = String(text).match(/^([\d,]+(?:\.\d+)?)(.*)$/);
    if (!m) { el.textContent = text; return; }
    const target = parseFloat(m[1].replace(/,/g, ''));
    const suf = m[2];
    const dec = (m[1].split('.')[1] || '').length;
    const comma = m[1].includes(',');
    const t0 = performance.now();
    (function f(now) {
      const p = Math.min(1, (now - t0) / 450);
      const e = 1 - Math.pow(1 - p, 3);
      const v = target * e;
      el.textContent = (comma ? Math.round(v).toLocaleString('en-US') : v.toFixed(dec)) + suf;
      if (p < 1) requestAnimationFrame(f);
    })(t0);
  }

  function renderSpark(id, series) {
    const el = $(id);
    if (!el) return;
    el.innerHTML = '';
    const mx = Math.max(...series, 1);
    series.slice(-12).forEach(v => {
      const i = document.createElement('i');
      i.style.height = Math.max(4, Math.round(19 * v / mx)) + 'px';
      el.appendChild(i);
    });
  }

  const setSub = (id, s) => {
    const sub = $(id)?.closest('.card')?.querySelector('.sub');
    if (sub) sub.textContent = s;
  };

  /* ============================ 3. Data Mapping & Enrichment ============================ */
  function mapBackendShipmentsToTripRows(shipments = []) {
    const rows = [];
    (shipments || []).forEach(sh => {
      if (sh.isDeleted || sh.IsDeleted) return;
      const ref = sh.ref || sh.Ref || '';
      const dir = sh.direction || sh.movement || sh.Direction || 'Import';
      const status = sh.status || sh.Status || 'Open';
      const enteredBy = sh.enteredBy?.displayName || sh.enteredBy?.name || sh.createdByName || '';
      const createdDay = sh.day || (sh.createdAtUtc ? String(sh.createdAtUtc).slice(0, 10) : '');
      const createdAt = sh.at || (sh.createdAtUtc ? String(sh.createdAtUtc).slice(11, 16) : '');

      const trips = Array.isArray(sh.trips) && sh.trips.length > 0 ? sh.trips : [{}];
      trips.forEach((t, idx) => {
        const f = t.fields || {};
        const row = {
          _ref: ref,
          _tripId: t.id || `${ref}-${idx}`,
          dir: f.movement || dir,
          movement: f.movement || dir,
          status: f.status || status,
          oper: enteredBy,
          created: createdDay,
          createdAt,
          client: f.client || '',
          line: f.line || f.terminal || '',
          dest: f.dest || f.destination || '',
          pod: f.aod || f.pod || '',
          trucker: f.trucker || f.transporter || '',
          car: f.car || f.cntr || '',
          driver: f.driver || '',
          mob: f.mob || '',
          arrDate: f.arrDate || '',
          arrTime: f.arrTime || '',
          reqDate: f.reqDate || f.reqArrDate || '',
          reqTime: f.reqTime || f.reqArrTime || '',
          gateIn: f.gateIn || '',
          gateInT: f.gateInT || '',
          gateOut: f.gateOut || '',
          gateOutT: f.gateOutT || '',
          packages: f.packages || '',
          weight: f.weight || '',
          cbm: f.cbm || '',
          bl: f.mawb || f.bl || '',
          booking: f.mawb || f.booking || '',
          cert: f.cert || '',
          clrType: f.clrType || '',
          customs: f.customs || '',
          risk: null,
          freeDays: null,
          cutDays: null,
          ...f
        };

        row.load = row.arrDate || row.reqDate || row.gateOut || row.gateIn || createdDay || null;
        rows.push(row);
      });
    });
    return rows;
  }

  function enrich(rows) {
    const days = (a, b) => Math.round((new Date(a) - new Date(b)) / 864e5);
    const at = (d, t2) => {
      if (!d) return null;
      const hm = normTime(t2);
      return new Date(`${d}T${hm || '00:00'}:00`);
    };

    return rows.map(r => {
      const o = { ...r };
      o.dir = o.dir || o.movement || 'Import';
      o.status = String(o.status || '').trim().toLowerCase() === 'delivered' ? 'Delivered' : 'Open';
      o.load = o.load || o.arrDate || o.reqDate || o.gateOut || o.gateIn || o.created || null;

      // Required vs actual arrival / offloading
      const rq = at(o.reqDate, o.reqTime);
      const ac = at(o.arrDate, o.arrTime);
      const go = at(o.gateOut, o.gateOutT);

      // Gate out to arrival (transit hours)
      o.gateToArrH = (go && ac) ? Math.round((ac - go) / 36e5) : null;
      if (o.gateToArrH !== null && (o.gateToArrH < 0 || o.gateToArrH > 24 * 30)) o.gateToArrH = null;

      // Offloading delay in hours
      o.offDelayH = (rq && ac) ? Math.round((ac - rq) / 36e5) : null;
      if (o.offDelayH !== null && Math.abs(o.offDelayH) > 24 * 60) o.offDelayH = null;
      o.offDelayD = o.offDelayH === null ? null : +(o.offDelayH / 24).toFixed(2);
      o.offLate = o.offDelayH === null ? null : (o.offDelayH > 0 ? 'Late' : 'On time');

      // Arrival on-time
      o.arrDelayH = o.offDelayH;
      o.arrOnTime = o.arrDelayH === null ? null : (o.arrDelayH <= 0 ? 'On time' : 'Late');

      // Free time buffer
      if (o.free && o.load) {
        o.freeDays = days(o.free, o.load);
        if (o.freeDays < -60 || o.freeDays > 90) o.freeDays = null;
      }
      o.risk = o.offLate === 'Late' ? 'Late' : (o.offLate === 'On time' ? 'OK' : null);

      // Export cut-off buffer
      if (o.cut && o.load) {
        o.cutDays = days(o.cut, o.load);
        if (o.cutDays < -60 || o.cutDays > 90) o.cutDays = null;
      }

      o.shipKey = (o.dir === 'Import' ? (o.bl || '') : (o.booking || '')) || o._ref || ('#' + (o.car || o.cntr || '1'));
      return o;
    });
  }

  /* ============================ 4. Filtering ============================ */
  function rowPass(r, skip = '') {
    const basis = $('dateBasis')?.value || 'load';
    if (skip !== 'month') {
      const from = $('dFrom')?.value, to = $('dTo')?.value, d = r[basis];
      if (from && (!d || d < from)) return false;
      if (to && (!d || d > to)) return false;
    }
    if (skip !== 'day' && daySel) {
      if (r[basis] !== daySel) return false;
    }
    if (skip !== 'created') {
      const cf = $('cFrom')?.value, ct = $('cTo')?.value, cd = r.created || '';
      if (cf && (!cd || cd < cf)) return false;
      if (ct && (!cd || cd > ct)) return false;
    }
    for (const [id, key] of SELECTS) {
      if (skip !== key && $(id)?.value) {
        const rv = key === 'port' ? (r.pod || r.port) : r[key];
        if (rv !== $(id).value) return false;
      }
    }
    if (skip !== 'free' && freeSel !== null) {
      if (r.freeDays === null || !FREE_BUCKETS[freeSel][1](r.freeDays)) return false;
    }
    return true;
  }

  const viewExcept = skip => DATA.filter(r => rowPass(r, skip));

  function fillSelect(id, values, labelFn) {
    const sel = $(id);
    if (!sel) return;
    const keep = sel.value;
    while (sel.options.length > 1) sel.remove(1);
    values.forEach(v => {
      const o = document.createElement('option');
      o.value = v;
      o.textContent = labelFn ? labelFn(v) : v;
      sel.appendChild(o);
    });
    sel.value = [...sel.options].some(o => o.value === keep) ? keep : '';
  }

  function buildFields() {
    const listFor = key => {
      const vals = new Set();
      DATA.forEach(r => {
        const v = key === 'port' ? (r.pod || r.port) : r[key];
        if (v && String(v).trim()) vals.add(String(v).trim());
      });
      return [...vals].sort((a, b) => a.localeCompare(b));
    };

    SELECTS.forEach(([id, key]) => {
      if (id === 'fDir') return;
      const values = listFor(key);
      fillSelect(id, values, key === 'risk' ? riskLabel : undefined);
      if ($(id)) $(id).disabled = values.length === 0;
    });

    if ($('lCreatedFrom')) $('lCreatedFrom').textContent = AR() ? 'إنشاء العملية من' : 'Created from';
    if ($('lCreatedTo')) $('lCreatedTo').textContent = AR() ? 'إنشاء العملية إلى' : 'Created to';
    const W = t('workflow');
    if ($('deliveryFilterLabel')) $('deliveryFilterLabel').textContent = W.deliveryStatus;
    if ($('deliveryFilter')) {
      $('deliveryFilter').options[0].text = W.allShipments;
      $('deliveryFilter').options[1].text = W.open;
      $('deliveryFilter').options[2].text = W.delivered;
    }
    if ($('lDest')) $('lDest').textContent = AR() ? (MODE() === 'Import' ? 'موقع التعتيق' : 'موقع التحميل') : (MODE() === 'Import' ? 'Offloading site' : 'Loading site');
  }

  function initFilters() {
    fillSelect('fDir', ['Import', 'Export'], dirLabel);
    if ($('fDir') && !DATA.some(r => r.dir === $('fDir').value)) {
      $('fDir').value = DATA.some(r => r.dir === 'Import') ? 'Import' : (DATA.some(r => r.dir === 'Export') ? 'Export' : '');
    }
    syncDirTabs();
  }

  function filterParts() {
    const basis = $('dateBasis')?.value || 'load';
    const from = $('dFrom')?.value, to = $('dTo')?.value, parts = [];
    const N = t('fNames');
    if (from || to) parts.push(`${dateBasisLabel()} ${fmtDay(from) || '…'} ← ${fmtDay(to) || '…'}`);
    const cf = $('cFrom')?.value, ct = $('cTo')?.value;
    if (cf || ct) parts.push(`${AR() ? 'تاريخ إنشاء العملية' : 'Created'} ${fmtDay(cf) || '…'} ← ${fmtDay(ct) || '…'}`);
    const labels = { fDir: dirLabel, fRisk: riskLabel };
    SELECTS.forEach(([id, key]) => {
      if (id === 'fDir') return;
      const v = $(id)?.value;
      if (v) parts.push(`${N[key] || key}: ${labels[id] ? labels[id](v) : v}`);
    });
    if (deliveryFilter !== 'All') {
      const sl = deliveryFilter === 'Open' ? t('workflow').open : t('workflow').delivered;
      parts.push(AR() ? 'الحالة: ' + sl : 'Delivery: ' + sl);
    }
    if (freeSel !== null) parts.push(`${N.free}: ${bucketLabel(freeSel)}`);
    if (daySel) parts.push(`${N.day}: ${daySel}`);
    return parts;
  }

  function syncDirTabs() {
    const cur = $('fDir')?.value || '';
    root.querySelectorAll('.dtab').forEach(b => {
      const d = b.dataset.dir;
      b.classList.toggle('on', d === cur);
      const n = d ? DATA.filter(r => r.dir === d).length : DATA.length;
      b.disabled = n === 0 && d !== '';
      b.querySelector('.cnt').textContent = fmtN(n);
      b.querySelector('.lbl').textContent = d ? dirLabel(d) : t('overview');
    });
  }

  function applyMode() {
    const m = MODE();
    Object.entries(KPI_MODE).forEach(([id, scope]) => {
      const el = $(id);
      if (el) el.style.display = inMode(scope, m) ? '' : 'none';
    });
    Object.entries(CHART_MODE).forEach(([id, scope]) => {
      const c = $(id)?.closest('.card');
      if (c) c.style.display = inMode(scope, m) ? '' : 'none';
    });
    const titleEl = $('hTitle');
    if (titleEl) {
      titleEl.textContent = m ? (AR() ? `لوحة تحليلات — ${dirLabel(m)}` : `FTL Dashboard — ${dirLabel(m)}`) : (AR() ? 'لوحة تحليلات FTL Airport' : 'FTL Airport Dashboard');
    }
  }

  function applyFilters() {
    const invalid = $('dFrom')?.value && $('dTo')?.value && $('dFrom').value > $('dTo').value;
    if ($('dTo')) $('dTo').setCustomValidity(invalid ? (AR() ? 'تاريخ النهاية قبل البداية' : 'End date must be on or after start date') : '');
    if (invalid) { $('dTo')?.reportValidity(); return; }

    VIEW = DATA.filter(r => rowPass(r) && (deliveryFilter === 'All' || (r.status || 'Open') === deliveryFilter));
    syncDirTabs();
    applyMode();
    updateTag();

    const parts = filterParts();
    const noteEl = $('activeNote');
    if (noteEl) {
      noteEl.textContent = parts.length ? `${t('filteredBy')} ${parts.join(' · ')} ${t('clickAgain')}` : t('tip');
    }
    render();
    packGrid();
  }

  function resetFilters() {
    const dir = MODE();
    SELECTS.forEach(([id]) => { const el = $(id); if (el) el.value = ''; });
    if ($('fDir')) $('fDir').value = dir;
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

  function applyPreset(daysCount) {
    const basis = $('dateBasis')?.value || 'load';
    const dates = DATA.map(r => r[basis]).filter(Boolean).sort();
    if (!dates.length) return;
    const maxd = dates[dates.length - 1];
    if (daysCount === 'all') {
      if ($('dFrom')) $('dFrom').value = '';
      if ($('dTo')) $('dTo').value = '';
    } else {
      const dt = new Date(maxd + 'T00:00:00');
      dt.setDate(dt.getDate() - Number(daysCount) + 1);
      if ($('dFrom')) $('dFrom').value = dt.toISOString().slice(0, 10);
      if ($('dTo')) $('dTo').value = maxd;
    }
    applyFilters();
  }

  function updateTag() {
    const el = $('dataTag');
    if (!el) return;
    if (!DATA.length) {
      el.textContent = t('noData');
      el.className = 'tag';
      return;
    }
    const imp = DATA.filter(r => r.dir === 'Import').length;
    const exp = DATA.length - imp;
    el.textContent = `${fmtN(DATA.length)} ${t('dsTrips').toLowerCase()} (${fmtN(imp)} ${t('dir').Import} · ${fmtN(exp)} ${t('dir').Export})`;
    el.className = 'tag ok';
  }

  function monthOf(r) {
    const basis = $('dateBasis')?.value || 'load';
    const d = r[basis];
    return (d && d.length >= 7) ? d.slice(0, 7) : null;
  }

  function toggleSelect(id, val) {
    const sel = $(id);
    if (!sel) return;
    sel.value = sel.value === val ? '' : val;
    applyFilters();
  }

  function setMonthFilter(m) {
    monthSel = (monthSel === m) ? null : m;
    if (monthSel) {
      if ($('dFrom')) $('dFrom').value = monthSel + '-01';
      const last = new Date(+monthSel.slice(0, 4), +monthSel.slice(5, 7), 0).getDate();
      if ($('dTo')) $('dTo').value = `${monthSel}-${String(last).padStart(2, '0')}`;
    } else {
      if ($('dFrom')) $('dFrom').value = '';
      if ($('dTo')) $('dTo').value = '';
    }
    applyFilters();
  }

  function setDayFilter(d) {
    daySel = (daySel === d) ? null : d;
    applyFilters();
  }

  /* ============================ 5. Grid Packing ============================ */
  function packGrid() {
    const grid = root.querySelector('.grid');
    if (!grid) return;
    const cards = [...grid.children].filter(c => c.style.display !== 'none');
    cards.forEach(c => { c.style.order = ''; });
    if (window.innerWidth <= 1200) {
      cards.forEach(c => { c.style.gridColumn = ''; });
      return;
    }
    const span = el => Math.min(SPAN[el.querySelector('canvas')?.id] || 6, 12);
    const pool = cards.slice();
    let ord = 0, row = [], sum = 0;
    const flush = () => {
      if (!row.length) return;
      const left = 12 - sum;
      if (left > 0) {
        const add = Math.floor(left / row.length);
        const rem = left - add * row.length;
        row.forEach((it, i) => { it.span += add + (i >= row.length - rem ? 1 : 0); });
      }
      row.forEach(it => {
        it.el.style.gridColumn = `span ${it.span}`;
        it.el.style.order = ord++;
      });
      row = []; sum = 0;
    };
    while (pool.length) {
      const el = pool.shift(), sp = span(el);
      if (sum + sp > 12) flush();
      row.push({ el, span: sp }); sum += sp;
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

  /* ============================ 6. Render KPIs ============================ */
  function renderKPIs() {
    const n = VIEW.length;
    const ships = new Set(VIEW.map(r => r.shipKey)).size;
    setVal('kShip', fmtN(ships));
    if ($('kShipSub')) $('kShipSub').textContent = t('kShipSub')(ships ? (n / ships).toFixed(1) : '0');

    const od = VIEW.filter(r => r.offDelayH !== null);
    if (!od.length) {
      if ($('kOffDelay')) $('kOffDelay').textContent = '–';
      if ($('kOffDelaySub')) $('kOffDelaySub').textContent = t('kOffDelayNone');
    } else {
      const late = od.filter(r => r.offDelayH > 0);
      setVal('kOffDelay', (avg(od.map(r => r.offDelayH)) / 24).toFixed(1) + ' ' + t('days'));
      if ($('kOffDelaySub')) $('kOffDelaySub').textContent = t('kOffDelaySub')(fmtN(late.length), fmtN(od.length), Math.round(100 * late.length / od.length));
    }

    const ar = VIEW.filter(r => r.arrOnTime !== null);
    if (!ar.length) {
      if ($('kOnTime')) $('kOnTime').textContent = '–';
      if ($('kOnTimeSub')) $('kOnTimeSub').textContent = t('kOnTimeNone');
    } else {
      const ok = ar.filter(r => r.arrOnTime === 'On time').length;
      setVal('kOnTime', Math.round(100 * ok / ar.length) + '%');
      if ($('kOnTimeSub')) $('kOnTimeSub').textContent = t('kOnTimeSub')(fmtN(ok), fmtN(ar.length));
    }

    const dc = {};
    VIEW.forEach(r => { if (r.dest) dc[r.dest] = (dc[r.dest] || 0) + 1; });
    const dtop = Object.entries(dc).sort((a, b) => b[1] - a[1])[0];
    setVal('kDestU', fmtN(Object.keys(dc).length));
    if ($('kDestUSub')) $('kDestUSub').textContent = dtop ? t('kDestUSub')(dtop[0], Math.round(100 * dtop[1] / n)) : '';

    const pc = {};
    VIEW.forEach(r => { const p = r.pod || r.port; if (p) pc[p] = (pc[p] || 0) + 1; });
    const ptop = Object.entries(pc).sort((a, b) => b[1] - a[1])[0];
    setVal('kPortU', fmtN(Object.keys(pc).length));
    if ($('kPortUSub')) $('kPortUSub').textContent = ptop ? t('kPortUSub')(ptop[0], Math.round(100 * ptop[1] / n)) : '';

    setVal('kTrips', fmtN(n));
    if ($('kTripsSub')) {
      const imp = VIEW.filter(r => r.dir === 'Import').length;
      $('kTripsSub').textContent = t('kTripsSub')(fmtN(imp), fmtN(n - imp));
    }

    let totPkgs = 0, totWeight = 0, totCbm = 0;
    VIEW.forEach(r => {
      totPkgs += parseFloat(r.packages) || 0;
      totWeight += parseFloat(r.weight) || 0;
      totCbm += parseFloat(r.cbm) || 0;
    });
    setVal('kCont', fmtN(totPkgs || n));
    if ($('kContSub')) $('kContSub').textContent = t('kContSub')(fmtN(totPkgs), fmtN(Math.round(totWeight)), totCbm.toFixed(1));

    const clients = new Set(VIEW.map(r => r.client).filter(Boolean)).size;
    const sites = new Set(VIEW.map(r => r.dest).filter(Boolean)).size;
    setVal('kClients', fmtN(clients));
    if ($('kClientsSub')) $('kClientsSub').textContent = t('kClientsSub')(fmtN(sites));

    const byT = {};
    VIEW.forEach(r => { if (r.trucker) byT[r.trucker] = (byT[r.trucker] || 0) + 1; });
    const ts = Object.entries(byT).sort((a, b) => b[1] - a[1]);
    const top3 = ts.slice(0, 3).reduce((s, x) => s + x[1], 0);
    const tot = ts.reduce((s, x) => s + x[1], 0);
    setVal('kTruckers', fmtN(ts.length));
    if ($('kTruckersSub')) $('kTruckersSub').textContent = t('kTruckersSub')(tot ? Math.round(100 * top3 / tot) : 0);

    const known = VIEW.filter(r => r.risk !== null);
    const lateArrivals = known.filter(r => r.risk === 'Late');
    if (!known.length) {
      if ($('kRisk')) $('kRisk').textContent = '–';
      if ($('kRiskSub')) $('kRiskSub').textContent = t('kRiskSub')(0, 0);
    } else {
      setVal('kRisk', Math.round(100 * lateArrivals.length / known.length) + '%');
      if ($('kRiskSub')) $('kRiskSub').textContent = t('kRiskSub')(fmtN(lateArrivals.length), fmtN(known.length));
    }

    const fd = VIEW.filter(r => r.freeDays !== null).map(r => r.freeDays);
    if (!fd.length) {
      if ($('kFree')) $('kFree').textContent = '–';
    } else {
      setVal('kFree', avg(fd).toFixed(1) + ' ' + t('days'));
    }
    if ($('kFreeSub')) $('kFreeSub').textContent = t('kFreeSub');

    const byO = {};
    VIEW.forEach(r => { if (r.oper) byO[r.oper] = (byO[r.oper] || 0) + 1; });
    const os = Object.entries(byO).sort((a, b) => b[1] - a[1]);
    setVal('kOper', fmtN(os.length));
    if ($('kOperSub')) $('kOperSub').textContent = t('kOperSub')(os.length ? Math.round(100 * os[0][1] / n) : 0);

    const cars = new Set(VIEW.map(r => r.car).filter(Boolean)).size;
    setVal('kTrucks', fmtN(cars));
    if ($('kTrucksSub')) $('kTrucksSub').textContent = t('kTrucksSub')(cars ? (n / cars).toFixed(1) : '0');

    const cb = VIEW.filter(r => r.cutDays !== null && r.cutDays !== undefined).map(r => r.cutDays).filter(d => d >= -30 && d <= 60);
    if (!cb.length) {
      if ($('kCut')) $('kCut').textContent = '–';
      if ($('kCutSub')) $('kCutSub').textContent = t('kCutSubNone');
    } else {
      setVal('kCut', avg(cb).toFixed(1) + ' ' + t('days'));
      if ($('kCutSub')) $('kCutSub').textContent = t('kCutSub')(fmtN(cb.filter(d => d < 0).length), fmtN(cb.length));
    }

    const tr = VIEW.filter(r => r.gateToArrH !== null).map(r => r.gateToArrH);
    if (!tr.length) {
      if ($('kTransit')) $('kTransit').textContent = '–';
      if ($('kTransitSub')) $('kTransitSub').textContent = t('kTransitNone');
    } else {
      setVal('kTransit', avg(tr).toFixed(1) + ' ' + t('hrs'));
      if ($('kTransitSub')) $('kTransitSub').textContent = t('kTransitSub')(fmtN(tr.length));
    }

    const routes = new Set(VIEW.filter(r => r.dir === 'Export' && (r.line || r.dest)).map(r => `${r.line || '?'}→${r.dest || '?'}`));
    setVal('kRoute', fmtN(routes.size));
    if ($('kRouteSub')) $('kRouteSub').textContent = t('kRouteSub')(fmtN(routes.size));

    // Sparklines
    const sm = {};
    VIEW.forEach(r => { const m = monthOf(r); if (m) sm[m] = (sm[m] || 0) + 1; });
    const dm = {};
    VIEW.forEach(r => { if (r.load) dm[r.load] = (dm[r.load] || 0) + 1; });
    const ks = Object.keys(sm).sort(), ds = Object.keys(dm).sort();
    renderSpark('sTrips', ks.length > 1 ? ks.map(k => sm[k]) : ds.map(k => dm[k]));
    renderSpark('sCont', ds.map(k => dm[k]));
  }

  /* ============================ 7. Render Charts ============================ */
  function renderCharts() {
    const basisLbl = dateBasisLabel();
    const C = { ...t('charts') };
    const imp = MODE() === 'Import';

    C.chDest = AR() ? [imp ? 'مواقع التعتيق' : 'مواقع التحميل', imp ? 'مواقع تسليم الشحنات' : 'مواقع استلام الشحنات'] : [imp ? 'Offloading sites' : 'Loading sites', imp ? 'Delivery locations' : 'Loading locations'];
    C.chOffDelay = AR() ? ['الوصول المطلوب والفعلي', 'الوصول الفعلي مقارنة بموعد التعتيق المطلوب'] : ['Required vs actual arrival', 'Actual arrival against required schedule'];
    C.chDaily = AR() ? ['النقلات اليومية', `حسب ${basisLbl} — اضغط لتصفية اليوم`] : ['Daily trips', `By ${basisLbl} — click a point to filter`];

    Object.keys(C).forEach(id => {
      const [title, sub] = C[id];
      const h3 = root.querySelector(`h3[data-c="${id}"]`);
      if (h3) h3.textContent = title;
      if (typeof sub === 'string') setSub(id, sub);
    });

    const vMonth = viewExcept('month');
    const byM = {};
    vMonth.forEach(r => { const m = monthOf(r); if (m) byM[m] = (byM[m] || 0) + 1; });
    const months = Object.keys(byM).sort();
    setSub('chMonthly', C.chMonthly[1](basisLbl));

    mkChart('chMonthly', {
      type: 'bar',
      data: {
        labels: months.map(mLabel),
        datasets: [{
          label: t('dsTrips'),
          data: months.map(m => byM[m]),
          backgroundColor: months.map(m => dim('#0b4f7a', monthSel === null || monthSel === m)),
          borderRadius: 5,
          maxBarThickness: 44
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) setMonthFilter(months[i]);
        },
        plugins: { legend: { display: false } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    const vDay = viewExcept('day');
    const byD = {};
    const dateBasisKey = $('dateBasis')?.value || 'load';
    vDay.forEach(r => { const d = r[dateBasisKey]; if (d) byD[d] = (byD[d] || 0) + 1; });
    const days = Object.keys(byD).sort();
    setSub('chDaily', C.chDaily[1]);

    mkChart('chDaily', {
      type: 'line',
      data: {
        labels: days.map(d => d.slice(5)),
        datasets: [{
          label: t('dsTrips'),
          data: days.map(d => byD[d]),
          borderColor: '#0e7c86',
          backgroundColor: '#22b8cf33',
          fill: true,
          tension: 0.3,
          pointRadius: days.map(d => daySel === d ? 6 : 3),
          pointHoverRadius: 7,
          pointBackgroundColor: days.map(d => daySel && daySel !== d ? '#0e7c8655' : '#0e7c86'),
          pointBorderColor: days.map(d => daySel === d ? '#0b4f7a' : '#0e7c86'),
          pointBorderWidth: days.map(d => daySel === d ? 2 : 1)
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) setDayFilter(days[i]);
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { title: it => days[it[0].dataIndex] } }
        },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    const vDir = viewExcept('dir');
    const dk = ['Import', 'Export'];
    const dSel = $('fDir')?.value;
    mkChart('chDir', {
      type: 'doughnut',
      data: {
        labels: dk.map(dirLabel),
        datasets: [{
          data: dk.map(k => vDir.filter(r => r.dir === k).length),
          backgroundColor: dk.map((k, i) => dim(['#0b4f7a', '#22b8cf'][i], !dSel || dSel === k)),
          borderWidth: 2,
          borderColor: cardBg()
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutout: '62%',
        ...arcClickable,
        onClick: (e, els, ch) => {
          const i = ringIndex(e, ch);
          if (i !== null) toggleSelect('fDir', dk[i]);
        },
        plugins: {
          legend: { position: 'bottom', onClick: (e, it) => toggleSelect('fDir', dk[it.index]) }
        }
      }
    });

    const vCl = viewExcept('client');
    const byC = {};
    vCl.forEach(r => { if (r.client) byC[r.client] = (byC[r.client] || 0) + 1; });
    const cs = Object.entries(byC).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const clSel = $('fClient')?.value;
    const cTot = cs.reduce((s, x) => s + x[1], 0) || 1;
    mkChart('chClient', {
      type: 'bar',
      data: {
        labels: cs.map(c => c[0]),
        datasets: [{
          data: cs.map(c => c[1]),
          backgroundColor: cs.map((c, i) => dim(PAL[i % PAL.length], !clSel || clSel === c[0])),
          borderRadius: 5,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fClient', cs[i][0]);
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw} ${t('axTrips').toLowerCase()} (${Math.round(100 * c.raw / cTot)}%)` } }
        },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    const vTr = viewExcept('trucker');
    const byT = {};
    vTr.forEach(r => { if (r.trucker) byT[r.trucker] = (byT[r.trucker] || 0) + 1; });
    const trs = Object.entries(byT).sort((a, b) => b[1] - a[1]);
    const trSel = $('fTrucker')?.value;
    const tTot = trs.reduce((s, x) => s + x[1], 0) || 1;
    mkChart('chTrucker', {
      type: 'bar',
      data: {
        labels: trs.map(x => x[0]),
        datasets: [{
          data: trs.map(x => x[1]),
          backgroundColor: trs.map((x, i) => dim(i < 3 ? '#0e7c86' : '#66788c', !trSel || trSel === x[0])),
          borderRadius: 5,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fTrucker', trs[i][0]);
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw} ${t('axTrips').toLowerCase()} (${Math.round(100 * c.raw / tTot)}%)` } }
        },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    const vDe = viewExcept('dest');
    const byDe = {};
    vDe.forEach(r => { if (r.dest) byDe[r.dest] = (byDe[r.dest] || 0) + 1; });
    const des = Object.entries(byDe).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const deSel = $('fDest')?.value;
    mkChart('chDest', {
      type: 'bar',
      data: {
        labels: des.map(d => d[0]),
        datasets: [{
          data: des.map(d => d[1]),
          backgroundColor: des.map(d => dim('#22b8cf', !deSel || deSel === d[0])),
          borderRadius: 5,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fDest', des[i][0]);
        },
        plugins: { legend: { display: false } },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    const vOp = viewExcept('oper');
    const byO = {};
    vOp.forEach(r => { if (r.oper) byO[r.oper] = (byO[r.oper] || 0) + 1; });
    const os = Object.entries(byO).sort((a, b) => b[1] - a[1]);
    const oSel = $('fOper')?.value;
    mkChart('chOper', {
      type: 'bar',
      data: {
        labels: os.map(o => o[0]),
        datasets: [{
          data: os.map(o => o[1]),
          backgroundColor: os.map(o => dim('#0b4f7a', !oSel || oSel === o[0])),
          borderRadius: 5,
          maxBarThickness: 34
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fOper', os[i][0]);
        },
        plugins: { legend: { display: false } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    const vLn = viewExcept('line');
    const byL = {};
    vLn.forEach(r => { if (r.line) byL[r.line] = (byL[r.line] || 0) + 1; });
    const ls = Object.entries(byL).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const lSel = $('fLine')?.value;
    mkChart('chLine', {
      type: 'bar',
      data: {
        labels: ls.map(l => l[0]),
        datasets: [{
          data: ls.map(l => l[1]),
          backgroundColor: ls.map(l => dim('#66788c', !lSel || lSel === l[0])),
          borderRadius: 5,
          maxBarThickness: 20
        }]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fLine', ls[i][0]);
        },
        plugins: { legend: { display: false } },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    const fd = viewExcept('free').filter(r => r.freeDays !== null).map(r => r.freeDays);
    mkChart('chFree', {
      type: 'bar',
      data: {
        labels: FREE_BUCKETS.map(b => bucketLabel(b[0])),
        datasets: [{
          data: FREE_BUCKETS.map(b => fd.filter(b[1]).length),
          backgroundColor: FREE_BUCKETS.map((b, i) => dim(b[2], freeSel === null || freeSel === i)),
          borderRadius: 5,
          maxBarThickness: 48
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) {
            freeSel = (freeSel === i) ? null : i;
            setTimeout(applyFilters, 0);
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw} (${fd.length ? Math.round(100 * c.raw / fd.length) : 0}%)` } }
        },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    const byR = {};
    vCl.forEach(r => {
      if (!r.client || r.risk === null) return;
      byR[r.client] = byR[r.client] || { n: 0, late: 0 };
      byR[r.client].n++;
      if (r.risk === 'Late') byR[r.client].late++;
    });
    const rs = Object.entries(byR).filter(([, v]) => v.n >= 2).map(([k, v]) => [k, 100 * v.late / v.n, v.n, v.late]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    mkChart('chRiskClient', {
      type: 'bar',
      data: {
        labels: rs.map(x => x[0]),
        datasets: [{
          data: rs.map(x => +x[1].toFixed(1)),
          backgroundColor: rs.map(x => dim(x[1] >= 30 ? '#cf4d4d' : x[1] >= 10 ? '#dd9a1f' : '#1f8f63', !clSel || clSel === x[0])),
          borderRadius: 5,
          maxBarThickness: 26
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fClient', rs[i][0]);
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw}% · ${rs[c.dataIndex][3]}/${rs[c.dataIndex][2]}` } }
        },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axPct') }, max: 100 }, x: noGrid }
      }
    });

    const vPo = viewExcept('port');
    const byPo = {};
    vPo.forEach(r => { const p = r.pod || r.port; if (p) byPo[p] = (byPo[p] || 0) + 1; });
    const pos = Object.entries(byPo).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const poSel = $('fPort')?.value;
    mkChart('chPort', {
      type: 'bar',
      data: {
        labels: pos.map(p => p[0]),
        datasets: [{
          data: pos.map(p => p[1]),
          backgroundColor: pos.map(p => dim('#66788c', !poSel || poSel === p[0])),
          borderRadius: 5,
          maxBarThickness: 26
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fPort', pos[i][0]);
        },
        plugins: { legend: { display: false } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    const byRt = {};
    VIEW.forEach(r => {
      const a = r.line || r.pod || 'CAI';
      const b2 = r.dest || '';
      if (!a && !b2) return;
      const k = `${a} → ${b2 || '?'}`;
      byRt[k] = (byRt[k] || 0) + 1;
    });
    const rts = Object.entries(byRt).sort((a, b) => b[1] - a[1]).slice(0, 10);
    mkChart('chRoute', {
      type: 'bar',
      data: {
        labels: rts.map(x => x[0]),
        datasets: [{
          data: rts.map(x => x[1]),
          backgroundColor: '#22b8cf',
          borderRadius: 5,
          maxBarThickness: 22
        }]
      },
      options: {
        indexAxis: 'y',
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, y: noGrid }
      }
    });

    const OFF_BUCKETS = [
      ['early', h2 => h2 <= -6, '#1f8f63'],
      ['onTime', h2 => h2 > -6 && h2 <= 0, '#54b083'],
      ['h6', h2 => h2 > 0 && h2 <= 6, '#dd9a1f'],
      ['h24', h2 => h2 > 6 && h2 <= 24, '#e07b3a'],
      ['d1', h2 => h2 > 24, '#cf4d4d']
    ];
    const odv = VIEW.filter(r => r.offDelayH !== null).map(r => r.offDelayH);
    mkChart('chOffDelay', {
      type: 'bar',
      data: {
        labels: t('offBuckets'),
        datasets: [{
          data: OFF_BUCKETS.map(b => odv.filter(b[1]).length),
          backgroundColor: OFF_BUCKETS.map(b => b[2]),
          borderRadius: 5,
          maxBarThickness: 48
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw} (${odv.length ? Math.round(100 * c.raw / odv.length) : 0}%)` } }
        },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axTrips') } }, x: noGrid }
      }
    });

    const arv = VIEW.filter(r => r.arrOnTime !== null);
    const okN = arv.filter(r => r.arrOnTime === 'On time').length;
    mkChart('chOnTime', {
      type: 'doughnut',
      data: {
        labels: [t('onTimeL'), t('lateL')],
        datasets: [{
          data: [okN, arv.length - okN],
          backgroundColor: ['#1f8f63', '#cf4d4d'],
          borderWidth: 2,
          borderColor: cardBg()
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: { legend: { position: 'bottom' } }
      }
    });

    const byTD = {};
    vTr.forEach(r => {
      if (!r.trucker || r.offDelayH === null) return;
      byTD[r.trucker] = byTD[r.trucker] || { n: 0, l: 0 };
      byTD[r.trucker].n++;
      if (r.offDelayH > 0) byTD[r.trucker].l++;
    });
    const tds = Object.entries(byTD).filter(([, v]) => v.n >= 2).map(([k, v]) => [k, 100 * v.l / v.n, v.n, v.l]).sort((a, b) => b[1] - a[1]);
    mkChart('chDelayTrucker', {
      type: 'bar',
      data: {
        labels: tds.map(x => x[0]),
        datasets: [{
          data: tds.map(x => +x[1].toFixed(1)),
          backgroundColor: tds.map(x => dim(x[1] >= 30 ? '#cf4d4d' : x[1] >= 10 ? '#dd9a1f' : '#1f8f63', !trSel || trSel === x[0])),
          borderRadius: 5,
          maxBarThickness: 34
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fTrucker', tds[i][0]);
        },
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: c => `${c.raw}% · ${tds[c.dataIndex][3]}/${tds[c.dataIndex][2]} ${t('axTrips').toLowerCase()}` } }
        },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axPct') }, max: 100 }, x: noGrid }
      }
    });

    const bySt = {};
    VIEW.forEach(r => {
      const s = r.status || 'Open';
      bySt[s] = (bySt[s] || 0) + 1;
    });
    const sts = Object.entries(bySt).sort((a, b) => b[1] - a[1]);
    mkChart('chStatus', {
      type: 'doughnut',
      data: {
        labels: sts.map(x => x[0] === 'Delivered' ? t('workflow').delivered : t('workflow').open),
        datasets: [{
          data: sts.map(x => x[1]),
          backgroundColor: sts.map(x => x[0] === 'Delivered' ? '#1f8f63' : '#0b4f7a'),
          borderWidth: 2,
          borderColor: cardBg()
        }]
      },
      options: {
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: { legend: { position: 'bottom' } }
      }
    });

    const cov = {};
    vTr.forEach(r => {
      if (!r.trucker) return;
      cov[r.trucker] = cov[r.trucker] || new Set();
      if (r.client) cov[r.trucker].add(r.client);
    });
    const cvs = Object.entries(cov).map(([k, v]) => [k, v.size]).sort((a, b) => b[1] - a[1]).slice(0, 10);
    mkChart('chTruckerClient', {
      type: 'bar',
      data: {
        labels: cvs.map(x => x[0]),
        datasets: [{
          data: cvs.map(x => x[1]),
          backgroundColor: cvs.map(x => dim('#0e7c86', !trSel || trSel === x[0])),
          borderRadius: 5,
          maxBarThickness: 26
        }]
      },
      options: {
        maintainAspectRatio: false,
        ...clickable,
        onClick: (e, els, ch) => {
          const i = bandIndex(e, ch);
          if (i !== null) toggleSelect('fTrucker', cvs[i][0]);
        },
        plugins: { legend: { display: false } },
        scales: { y: { ...gridOpts(), title: { display: true, text: t('axClients') } }, x: noGrid }
      }
    });
  }

  /* ============================ 8. Render Insights ============================ */
  function renderInsights() {
    const ul = $('insightList');
    if (!ul) return;
    ul.innerHTML = '';
    const I = t('ins');
    const m = MODE();
    const add = s => {
      const li = document.createElement('li');
      li.innerHTML = s;
      ul.appendChild(li);
    };

    const insH = root.querySelector('#insCard h3');
    if (insH) insH.textContent = m === '' ? t('insH') : t('insHMode')(dirLabel(m));

    if (!VIEW.length) {
      add(I.none);
      return;
    }
    const n = VIEW.length;
    const byC = {};
    VIEW.forEach(r => { if (r.client) byC[r.client] = (byC[r.client] || 0) + 1; });
    const cs = Object.entries(byC).sort((a, b) => b[1] - a[1]);
    if (cs.length > 0) add(I.topClient(cs[0][0], Math.round(100 * cs[0][1] / n)));

    const byT = {};
    VIEW.forEach(r => { if (r.trucker) byT[r.trucker] = (byT[r.trucker] || 0) + 1; });
    const ts = Object.entries(byT).sort((a, b) => b[1] - a[1]);
    if (ts.length >= 3) {
      const t3 = ts.slice(0, 3);
      add(I.top3(Math.round(100 * t3.reduce((s, x) => s + x[1], 0) / n), t3.map(x => x[0]).join(', ')));
    } else if (ts.length) {
      add(I.topTrucker(ts[0][0], ts[0][1], Math.round(100 * ts[0][1] / n)));
    }

    const known = VIEW.filter(r => r.risk !== null);
    const lateArrivals = known.filter(r => r.risk === 'Late');
    if (known.length) {
      add(I.risk(lateArrivals.length, Math.round(100 * lateArrivals.length / known.length)));
      const byR = {};
      known.forEach(r => {
        if (!r.client) return;
        byR[r.client] = byR[r.client] || { n: 0, l: 0 };
        byR[r.client].n++;
        if (r.risk === 'Late') byR[r.client].l++;
      });
      const worst = Object.entries(byR).filter(([, v]) => v.n >= 2).map(([k, v]) => [k, 100 * v.l / v.n]).sort((a, b) => b[1] - a[1])[0];
      if (worst && worst[1] > 0) add(I.riskClient(worst[0], Math.round(worst[1])));
    }

    const byD = {};
    VIEW.forEach(r => { if (r.dest) byD[r.dest] = (byD[r.dest] || 0) + 1; });
    const ds = Object.entries(byD).sort((a, b) => b[1] - a[1])[0];
    if (ds) add(I.dest(ds[0], Math.round(100 * ds[1]/ n)));

    const byO = {};
    VIEW.forEach(r => { if (r.oper) byO[r.oper] = (byO[r.oper] || 0) + 1; });
    const os = Object.entries(byO).sort((a, b) => b[1] - a[1])[0];
    if (os && Object.keys(byO).length > 1) add(I.oper(os[0], Math.round(100 * os[1] / n)));

    const cars = new Set(VIEW.map(r => r.car).filter(Boolean)).size;
    if (cars) add(I.truck(cars, (n / cars).toFixed(1)));

    if (!m) {
      const exp = VIEW.filter(r => r.dir === 'Export').length;
      if (exp && exp < n) add(I.exportShare(Math.round(100 * exp / n)));
    }

    const mc = {};
    VIEW.forEach(r => { const mStr = monthOf(r); if (mStr) mc[mStr] = (mc[mStr] || 0) + 1; });
    const months = Object.keys(mc).sort();
    if (months.length >= 2) {
      const m1 = months[months.length - 1], m0 = months[months.length - 2];
      if (mc[m0]) add(I.mom(new Date(m1 + '-01').toLocaleString(monthLocale(), { month: 'long' }), Math.round(100 * (mc[m1] - mc[m0]) / mc[m0])));
    }
  }

  function render() {
    renderKPIs();
    renderCharts();
    renderInsights();
  }

  /* ============================ 9. Export / Print ============================ */
  function visibleKpis() {
    return KPI_IDS.filter(([id]) => {
      const el = $(id);
      return el && el.closest('.kpi') && el.closest('.kpi').style.display !== 'none';
    });
  }

  function visibleCharts() {
    return Object.keys(CHART_MODE).filter(id => {
      const c = $(id)?.closest('.card');
      return c && c.style.display !== 'none';
    });
  }

  function openExport() {
    const X = t('x');
    if ($('xTitleTxt')) $('xTitleTxt').textContent = X.title;
    if ($('xHint')) $('xHint').textContent = X.hint;
    if ($('xCoverL')) $('xCoverL').textContent = X.cover;
    if ($('xInsightsL')) $('xInsightsL').textContent = X.insights;
    if ($('xKpiL')) $('xKpiL').textContent = X.kpis;
    if ($('xChL')) $('xChL').textContent = X.charts;
    if ($('xGo')) $('xGo').textContent = X.go;

    if ($('xKpis')) {
      $('xKpis').innerHTML = visibleKpis().map(([id, l]) =>
        `<label><input type="checkbox" class="xk" data-id="${id}" checked onchange="${DASHBOARD_NAMESPACE}.xCount()"> ${$(l)?.textContent || id}</label>`
      ).join('');
    }
    if ($('xCharts')) {
      $('xCharts').innerHTML = visibleCharts().map(id =>
        `<label><input type="checkbox" class="xc" data-id="${id}" checked onchange="${DASHBOARD_NAMESPACE}.xCount()"> ${root.querySelector(`h3[data-c="${id}"]`)?.textContent || id}</label>`
      ).join('');
    }
    if ($('xKpiAll')) $('xKpiAll').checked = true;
    if ($('xChAll')) $('xChAll').checked = true;
    xCount();
    $('xModal')?.classList.add('open');
  }

  function xToggleAll(kind, on) {
    root.querySelectorAll(kind === 'kpi' ? '.xk' : '.xc').forEach(c => c.checked = on);
    xCount();
  }

  function xCount() {
    const k = [...root.querySelectorAll('.xk:checked')].length;
    const c = [...root.querySelectorAll('.xc:checked')].length;
    if ($('xKpiAll')) $('xKpiAll').checked = k === visibleKpis().length;
    if ($('xChAll')) $('xChAll').checked = c === visibleCharts().length;
    if ($('xCount')) $('xCount').textContent = t('x').count(k, c);
  }

  function buildExport(sel) {
    const X = t('x'), rootExport = $('exportRoot'), esc = s => String(s || '').replace(/</g, '&lt;');
    const exportGlyph = root.querySelector('.h-kicker .glyph')?.outerHTML || '';
    const basis = $('dateBasis')?.value || 'load';
    const dates = VIEW.map(r => r[basis]).filter(Boolean).sort();
    const now = fmtDay(new Date().toISOString().slice(0, 10));
    const parts = filterParts();
    const chips = parts.length ? parts.map(p => {
      const i = p.indexOf(':');
      return i > 0 ? `<span class="chip2"><b>${esc(p.slice(0, i))}:</b> ${esc(p.slice(i + 1))}</span>` : `<span class="chip2">${esc(p)}</span>`;
    }).join('') : `<span class="chip2">${X.allData}</span>`;
    const basisChip = `<span class="chip2"><b>${X.basis}:</b> ${dateBasisLabel()}</span>`;

    let html = '';
    if (sel.cover) {
      html += `<section class="xp-cover"><div class="dots"></div>
        <div class="logo"><img src="${$('logoImg')?.src || ''}" alt="ILS">${exportGlyph}</div>
        <div class="kicker">${X.kicker}</div><h1>${$('hTitle')?.textContent || 'FTL Dashboard'}</h1><div class="sub">${$('hSub')?.textContent || ''}</div>
        <div class="meta">
          <div><b>${fmtN(VIEW.length)}</b>${X.ops}</div>
          <div><b>${new Set(VIEW.map(r => r.client)).size}</b>${X.clients}</div>
          <div><b>${dates.length ? `${fmtDay(dates[0])} → ${fmtDay(dates[dates.length - 1])}` : '—'}</b>${X.period}</div>
          <div><b>${now}</b>${X.generated}</div>
        </div>
        <div class="filters"><div class="lbl">${X.filters}</div><div class="chips">${basisChip}${chips}</div></div>
      </section>`;
    }
    const head = `<div class="xp-head"><span class="t">${$('hTitle')?.textContent || 'FTL Dashboard'} — ILS Egypt</span><span class="d">${now} · ${parts.length ? esc(parts.join(' · ')) : X.allData}</span></div>`;
    html += head;

    if (sel.kpis.length) {
      html += `<div class="xp-sec xp-kpis">` + sel.kpis.map(id => {
        const k = KPI_IDS.find(x => x[0] === id);
        if (!k) return '';
        return `<div class="xp-kpi" style="--xa:${k[3]}"><div class="lab">${esc($(k[1])?.textContent || '')}</div><div class="val">${esc($(id)?.textContent || '')}</div><div class="sb">${esc($(k[2])?.textContent || '')}</div></div>`;
      }).join('') + `</div>`;
    }
    if (sel.insights) {
      const items = [...($('insightList')?.children || [])].map(li => li.innerHTML);
      html += `<div class="xp-sec xp-ins"><h4>${t('insH')}</h4><ul>${items.map(i => `<li>${i}</li>`).join('')}</ul></div>`;
    }
    if (sel.charts.length) {
      html += `<div class="xp-charts">` + sel.charts.map(id => {
        const card = $(id)?.closest('.card');
        if (!card) return '';
        const title = card.querySelector('h3')?.textContent || '';
        const sub = (card.querySelector('.sub')?.textContent || '').split(' — ')[0];
        const ch = charts[id];
        if (!ch) return '';
        const img = ch.toBase64Image('image/png', 1);
        return `<div class="xp-chart"><h4>${esc(title)}</h4><div class="s">${esc(sub)}</div><img src="${img}"></div>`;
      }).join('') + `</div>`;
    }
    if (rootExport) rootExport.innerHTML = html;
  }

  function runExport() {
    const sel = {
      cover: $('xCover')?.checked,
      insights: $('xInsights')?.checked,
      kpis: [...root.querySelectorAll('.xk:checked')].map(c => c.dataset.id),
      charts: [...root.querySelectorAll('.xc:checked')].map(c => c.dataset.id)
    };
    if (!sel.kpis.length && !sel.charts.length && !sel.insights && !sel.cover) return;
    try {
      buildExport(sel);
      closeM('xModal');
      printHost.dir = root.dir;
      printHost.lang = root.lang;
      const expRoot = $('exportRoot');
      if (expRoot) printHost.appendChild(expRoot);
      document.body.appendChild(printHost);
      document.body.classList.add('ftl-printing');
      setTimeout(() => { window.print(); }, 150);
    } catch (e) {
      toast(e.message || (AR() ? 'فشل تصدير اللوحة.' : 'Dashboard export failed.'));
    }
  }

  __on(window, 'afterprint', () => {
    const er = $('exportRoot');
    if (er) { er.innerHTML = ''; root.appendChild(er); }
    printHost.remove();
    document.body.classList.remove('ftl-printing');
  });

  /* ============================ 10. Help modal ============================ */
  function openHelp() {
    const el = $('hBody');
    if (!el) return;
    if ($('hTitleTxt')) $('hTitleTxt').textContent = t('hTitle');
    el.innerHTML = `
      <div style="font-size:13px;line-height:1.6;color:var(--ink);">
        <p><b>${AR() ? 'لوحة تحليلات شحنات ونقل المطار (FTL Airport Dashboard)' : 'FTL Airport Operations Dashboard'}</b></p>
        <p>${AR() ? 'اللوحة تعرض تحليلات متكاملة ومؤشرات أداء (KPIs) مبنية على بيانات الشحنات والنقلات الحقيقية المسجلة على النظام مباشرة.' : 'Displays real-time KPIs, arrival performance, offloading delays, and transporter analytics computed directly from live shipment records.'}</p>
        <hr style="margin:12px 0;border:0;border-top:1px solid var(--line);">
        <ul style="padding-left:20px;padding-right:20px;display:flex;flex-direction:column;gap:8px;">
          <li><b>${t('kTrips')}:</b> ${AR() ? 'إجمالي عدد نقلات الشاحنات المسجلة خلال الفترة المحددة.' : 'Total number of truck trips registered.'}</li>
          <li><b>${t('kOnTime')}:</b> ${AR() ? 'نسبة النقلات التي وصلت في الموعد المطلوب أو قبله.' : 'Percentage of trips arriving at or before the required offloading time.'}</li>
          <li><b>${t('kOffDelay')}:</b> ${AR() ? 'متوسط التأخير بالأيام والساعات عن الموعد المطلوب للتعتيق.' : 'Average delay in days/hours against required offloading time.'}</li>
          <li><b>${t('kTransit')}:</b> ${AR() ? 'متوسط زمن العبور من خروج البوابة وحتى الوصول للموقع.' : 'Average transit hours from terminal gate-out to destination arrival.'}</li>
        </ul>
      </div>
    `;
    $('hModal')?.classList.add('open');
  }

  function closeM(id) {
    $(id)?.classList.remove('open');
  }

  function toast(msg) {
    const el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2600);
  }

  /* ============================ 11. Event Bindings ============================ */
  root.querySelectorAll('.dtab').forEach(b => {
    b.addEventListener('click', () => {
      if (b.disabled) return;
      if ($('fDir')) $('fDir').value = b.dataset.dir || '';
      resetFilters();
    });
  });

  SELECTS.forEach(([id]) => {
    const el = $(id);
    if (el) el.addEventListener('change', () => applyFilters());
  });

  ['dFrom', 'dTo', 'cFrom', 'cTo', 'dateBasis'].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('change', () => applyFilters());
      el.addEventListener('input', () => applyFilters());
    }
  });

  const resetBtn = $('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      resetFilters();
    });
  }

  const delSel = $('deliveryFilter');
  if (delSel) {
    delSel.addEventListener('change', e => {
      deliveryFilter = e.target.value;
      applyFilters();
    });
  }

  root.querySelectorAll('.chip').forEach(c => {
    c.addEventListener('click', () => {
      root.querySelectorAll('.chip').forEach(x => x.classList.remove('on'));
      c.classList.add('on');
      applyPreset(c.dataset.preset);
    });
  });

  let _packT;
  __on(window, 'resize', () => {
    clearTimeout(_packT);
    _packT = setTimeout(packGrid, 150);
  });

  __on(document, 'keydown', e => {
    if (e.key === 'Escape') {
      root.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
    }
  });

  /* ============================ 12. Public Namespace ============================ */
  window[DASHBOARD_NAMESPACE] = {
    openExport,
    runExport,
    xToggleAll,
    xCount,
    openHelp,
    closeM,
    resetFilters,
    reload: () => __emit('reload'),
    toggleLang: () => {
      controller.setLanguage(LANG === 'en' ? 'ar' : 'en');
      __emit('language', LANG);
    },
    toggleTheme: () => {
      controller.setTheme(THEME === 'light' ? 'dark' : 'light');
      __emit('theme', THEME);
    }
  };

  /* ============================ 13. Controller ============================ */
  const controller = {
    loadShipments(shipments) {
      const rawRows = mapBackendShipmentsToTripRows(shipments);
      DATA = enrich(rawRows);
      initFilters();
      buildFields();
      resetFilters();
    },
    setLanguage(lang) {
      LANG = lang === 'ar' ? 'ar' : 'en';
      root.dir = LANG === 'ar' ? 'rtl' : 'ltr';
      root.lang = LANG;
      if ($('langBtn')) $('langBtn').textContent = LANG === 'ar' ? 'EN' : 'عربي';
      if ($('hKicker')) $('hKicker').textContent = t('kicker');
      if ($('hSub')) $('hSub').textContent = t('sub');
      if ($('refreshBtn')) $('refreshBtn').textContent = t('refresh');
      if ($('exportBtn')) $('exportBtn').textContent = t('exportBtn');
      if ($('helpBtn')) $('helpBtn').textContent = t('help');
      if ($('resetBtn')) $('resetBtn').textContent = t('reset');
      if ($('lBasis')) $('lBasis').textContent = t('lBasis');
      if ($('lFrom')) $('lFrom').textContent = t('lFrom');
      if ($('lTo')) $('lTo').textContent = t('lTo');
      if ($('lQuick')) $('lQuick').textContent = t('lQuick');
      const chips = root.querySelectorAll('.presets .chip');
      if (chips[0]) chips[0].textContent = t('last30');
      if (chips[1]) chips[1].textContent = t('last90');
      if (chips[2]) chips[2].textContent = t('allTime');

      buildFields();
      applyFilters();
    },
    setTheme(theme) {
      THEME = theme === 'dark' ? 'dark' : 'light';
      root.setAttribute('data-theme', THEME);
      printHost.setAttribute('data-theme', THEME);
      if ($('themeBtn')) $('themeBtn').textContent = THEME === 'dark' ? '☀️' : '🌙';
      Chart.defaults.color = getComputedStyle(root).getPropertyValue('--steel').trim() || '#555';
      if (DATA.length) render();
    },
    destroy() {
      destroyed = true;
      clearTimeout(_packT);
      Object.keys(charts).forEach(id => {
        try { charts[id].destroy(); } catch { /* ignore */ }
      });
      charts = {};
      __cleanups.forEach(fn => { try { fn(); } catch { /* ignore */ } });
      __cleanups.length = 0;
      delete window[DASHBOARD_NAMESPACE];
      if (ACTIVE_DASHBOARD_ENGINE === controller) {
        ACTIVE_DASHBOARD_ENGINE = null;
      }
    }
  };

  ACTIVE_DASHBOARD_ENGINE = controller;
  return controller;
}
