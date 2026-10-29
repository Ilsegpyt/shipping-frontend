import React, { useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  Truck,
  Ship,
  MapPin,
  Calendar,
  Layers,
  Users,
  Building2,
  FileText,
} from 'lucide-react';
import { MASTER_DEFAULTS } from '../constants';

export default function AnalyticsTab({ data = [], lang = 'en', direction = 'Import' }) {
  const isImport = direction === 'Import';

  // Rail Filters
  const [dateBasis, setDateBasis] = useState('load');
  const [dFrom, setDFrom] = useState('');
  const [dTo, setDTo] = useState('');
  const [deliveryStatus, setDeliveryStatus] = useState('All');
  const [preset, setPreset] = useState('all');
  const [fClient, setFClient] = useState('');
  const [fTrucker, setFTrucker] = useState('');
  const [fDest, setFDest] = useState('');
  const [fSize, setFSize] = useState('');
  const [fOper, setFOper] = useState('');
  const [fLine, setFLine] = useState('');
  const [fPort, setFPort] = useState('');
  const [fPol, setFPol] = useState('');
  const [fRisk, setFRisk] = useState('');

  // Overall metrics
  const totalTrips = isImport ? 469 : 73;
  const totalCont = isImport ? 469 : 73;
  const clientsCount = isImport ? 10 : 8;
  const truckersCount = isImport ? 10 : 7;
  const demurragePct = 5;
  const demurrageLateCount = 22;
  const freeDaysAvg = '12.9 d';
  const cutoffBufferAvg = '14.2 d';
  const routesCount = 16;
  const opStaffCount = 5;
  const trucksCount = isImport ? 195 : 45;
  const shipmentsCount = isImport ? 164 : 32;
  const destCount = isImport ? 12 : 5;
  const portsCount = isImport ? 2 : 6;

  // 1. Trips by month data
  const monthData = [
    { label: 'Nov 25', count: 45 },
    { label: 'Dec 25', count: 15 },
    { label: 'Jan 26', count: 409 },
  ];
  const maxMonth = Math.max(...monthData.map((d) => d.count), 1);

  // 2. Shipping lines data
  const lineData = [
    { name: 'COSCO', count: 118 },
    { name: 'PIL', count: 106 },
    { name: 'EGL', count: 98 },
    { name: 'CMA CGM', count: 44 },
    { name: 'GAC', count: 21 },
    { name: 'BSA', count: 15 },
    { name: 'GMAC', count: 14 },
    { name: 'PAN MARINE', count: 12 },
  ];
  const maxLine = Math.max(...lineData.map((d) => d.count), 1);

  // 3. Daily trips smooth wave data (01-02 to 01-22)
  const dailyPoints = [
    { day: '01-02', x: 25, y: 55, count: 32 },
    { day: '01-03', x: 75, y: 82, count: 15 },
    { day: '01-04', x: 125, y: 78, count: 17 },
    { day: '01-05', x: 175, y: 85, count: 12 },
    { day: '01-06', x: 225, y: 40, count: 42 },
    { day: '01-08', x: 275, y: 70, count: 22 },
    { day: '01-09', x: 325, y: 35, count: 48 },
    { day: '01-10', x: 375, y: 68, count: 24 },
    { day: '01-12', x: 425, y: 42, count: 39 },
    { day: '01-13', x: 475, y: 98, count: 4 },
    { day: '01-14', x: 525, y: 65, count: 26 },
    { day: '01-15', x: 575, y: 76, count: 18 },
    { day: '01-16', x: 625, y: 90, count: 10 },
    { day: '01-17', x: 675, y: 58, count: 28 },
    { day: '01-18', x: 725, y: 70, count: 21 },
    { day: '01-19', x: 775, y: 85, count: 12 },
    { day: '01-20', x: 825, y: 100, count: 2 },
    { day: '01-22', x: 875, y: 86, count: 11 },
  ];

  // 4. Trips by client
  const clientData = [
    { name: 'MIDEA', count: 162, pct: 34 },
    { name: 'MIRACO', count: 104, pct: 22 },
    { name: 'DICE', count: 64, pct: 14 },
    { name: 'CHEMICALS', count: 46, pct: 10 },
    { name: 'MIDEA KITCHEN', count: 36, pct: 8 },
    { name: 'MIDEA WASHING', count: 16, pct: 3 },
    { name: 'FUFENG', count: 12, pct: 3 },
    { name: 'LANDMARK', count: 8, pct: 2 },
    { name: 'GOLDEN SUN', count: 2, pct: 1 },
    { name: 'DICOOMIX', count: 1, pct: 1 },
  ];

  // 5. Trips by trucker
  const truckerData = [
    { name: 'ALRihab', count: 135, pct: 29 },
    { name: 'Eldawlya', count: 85, pct: 18 },
    { name: 'Ranin', count: 83, pct: 18 },
    { name: 'TAQA', count: 49, pct: 10 },
    { name: 'Medil East', count: 41, pct: 9 },
    { name: 'ALDamnhory', count: 38, pct: 8 },
    { name: 'EURO', count: 31, pct: 7 },
    { name: 'Abu Eldahab', count: 6, pct: 1 },
    { name: 'Ayman', count: 2, pct: 1 },
    { name: 'Darwesh', count: 2, pct: 1 },
  ];

  // 6. Demurrage risk by client
  const riskByClientData = [
    { name: 'FUFENG', pct: 33, color: '#cf4d4d' },
    { name: 'MIDEA', pct: 8, color: '#1f8f63' },
    { name: 'DICE', pct: 8, color: '#1f8f63' },
    { name: 'MIDEA KITCHEN', pct: 0, color: '#1f8f63' },
    { name: 'LANDMARK', pct: 0, color: '#1f8f63' },
    { name: 'CHEMICALS', pct: 0, color: '#1f8f63' },
    { name: 'MIDEA WASHING', pct: 0, color: '#1f8f63' },
    { name: 'MIRACO', pct: 0, color: '#1f8f63' },
  ];

  // 7. Free-time usage buckets
  const freeUsageData = [
    { label: 'Pulled late', count: 22, color: '#cf4d4d' },
    { label: 'Same day', count: 2, color: '#66788c' },
    { label: '1-2 days left', count: 12, color: '#d8a84a' },
    { label: '3-5 days left', count: 28, color: '#22b8cf' },
    { label: '6+ days left', count: 405, color: '#1f8f63' },
  ];

  // 8. Offloading sites
  const siteData = [
    { name: 'OCTOBER', count: 216 },
    { name: 'ABU RAWASH', count: 91 },
    { name: 'WADI EL NATRUN', count: 48 },
    { name: 'BORG EL ARAB', count: 42 },
    { name: 'SOKHNA', count: 27 },
    { name: 'EL SADAT', count: 22 },
    { name: 'ELKHANKA', count: 10 },
    { name: '10OF RAMDAN', count: 9 },
    { name: 'QALYOUB', count: 8 },
    { name: 'ALSDAT', count: 4 },
  ];
  const maxSite = Math.max(...siteData.map((d) => d.count), 1);

  // 9. Destination Ports (POD)
  const portData = isImport
    ? [
        { name: 'SOKHNA', count: 442 },
        { name: 'ALEXANDRIA', count: 13 },
      ]
    : [
        { name: 'JEDDAH', count: 24 },
        { name: 'BARCELONA', count: 18 },
        { name: 'TANGER MED', count: 12 },
        { name: 'BEIRUT', count: 9 },
        { name: 'GENOVA', count: 6 },
        { name: 'SINGAPORE', count: 4 },
      ];

  // 9b. Export Loading Sites & Routes & Status
  const loadingSitesData = [
    { name: '10OF RAMDAN', count: 28 },
    { name: 'EL SADAT', count: 18 },
    { name: 'OCTOBER', count: 14 },
    { name: 'BORG EL ARAB', count: 8 },
    { name: 'SUEZ', count: 5 },
  ];
  const maxLoadSite = Math.max(...loadingSitesData.map((d) => d.count), 1);

  const exportRoutesData = [
    { name: 'SOKHNA → JEDDAH', count: 24 },
    { name: 'ALEXANDRIA → BARCELONA', count: 18 },
    { name: 'SOKHNA → TANGER MED', count: 12 },
    { name: 'PORT SAID → BEIRUT', count: 9 },
    { name: 'ALEXANDRIA → GENOVA', count: 6 },
    { name: 'SOKHNA → SINGAPORE', count: 4 },
  ];
  const maxRoute = Math.max(...exportRoutesData.map((d) => d.count), 1);

  const exportStatusData = [
    { name: 'Delivered', count: 48, pct: 66, color: '#1f8f63' },
    { name: 'Open / In transit', count: 25, pct: 34, color: '#0b4f7a' },
  ];

  // 10. Required vs actual arrival (OFF_BUCKETS)
  const offDelayBuckets = [
    { label: 'Early (>6h)', count: 14, color: '#1f8f63' },
    { label: 'On time (±6h)', count: 185, color: '#54b083' },
    { label: 'Late 0–6h', count: 22, color: '#dd9a1f' },
    { label: 'Late 6–24h', count: 12, color: '#e07b3a' },
    { label: 'Late >24h', count: 8, color: '#cf4d4d' },
  ];
  const maxOffDelay = Math.max(...offDelayBuckets.map((b) => b.count), 1);

  // 11. Delay share by trucker (min 3 trips)
  const delayTruckerData = [
    { name: 'Eldawlya', pct: 28.2, late: 24, total: 85, color: '#cf4d4d' },
    { name: 'Medil East', pct: 24.4, late: 10, total: 41, color: '#dd9a1f' },
    { name: 'Ranin', pct: 18.1, late: 15, total: 83, color: '#dd9a1f' },
    { name: 'ALRihab', pct: 14.8, late: 20, total: 135, color: '#dd9a1f' },
    { name: 'TAQA', pct: 12.2, late: 6, total: 49, color: '#dd9a1f' },
    { name: 'ALDamnhory', pct: 7.9, late: 3, total: 38, color: '#1f8f63' },
    { name: 'EURO', pct: 0.0, late: 0, total: 31, color: '#1f8f63' },
  ];
  const maxDelayPct = 35;

  // 12. Operations workload
  const staffData = [
    { name: 'Fatma', count: 194 },
    { name: 'Nadia', count: 128 },
    { name: 'Hager', count: 119 },
    { name: 'Yasmin', count: 15 },
    { name: 'Mohamed', count: 13 },
  ];

  // 13. Trucker coverage
  const truckerCoverageData = [
    { name: 'ALRihab', count: 7 },
    { name: 'Medil East', count: 5 },
    { name: 'EURO', count: 4 },
    { name: 'Ranin', count: 4 },
    { name: 'TAQA', count: 4 },
    { name: 'Eldawlya', count: 3 },
    { name: 'ALDamnhory', count: 3 },
    { name: 'Abu Eldahab', count: 2 },
    { name: 'Ayman', count: 1 },
    { name: 'Darwesh', count: 1 },
  ];

  return (
    <div className="space-y-4">
      {/* 1. Filter Rail */}
      <div className="rail">
        <div className="rrow">
          <div className="fld">
            <label>{lang === 'ar' ? 'أساس التاريخ (Date basis)' : 'Date basis'}</label>
            <select value={dateBasis} onChange={(e) => setDateBasis(e.target.value)}>
              <option value="load">{lang === 'ar' ? 'تاريخ النشاط (Activity date)' : 'Activity date'}</option>
              <option value="reqDate">{lang === 'ar' ? 'تاريخ التعتيق المطلوب (Required offloading date)' : 'Required offloading date'}</option>
              <option value="arrDate">{lang === 'ar' ? 'تاريخ الوصول الفعلي (Actual Arrival Date)' : 'Actual Arrival Date'}</option>
              <option value="gateOut">{lang === 'ar' ? 'تاريخ الخروج من البوابة (Get-out date)' : 'Get-out date'}</option>
              <option value="free">{lang === 'ar' ? 'نهاية فترة السماح (Free-time end)' : 'Free-time end'}</option>
              <option value="created">{lang === 'ar' ? 'تاريخ الإنشاء (Creation date)' : 'Creation date'}</option>
            </select>
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'من' : 'From'}</label>
            <input type="date" value={dFrom} onChange={(e) => setDFrom(e.target.value)} />
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'إلى' : 'To'}</label>
            <input type="date" value={dTo} onChange={(e) => setDTo(e.target.value)} />
          </div>

          {/* Delivery status (Open / Delivered) added right next to To */}
          <div className="fld">
            <label>{lang === 'ar' ? 'حالة الشحنة (Delivery status)' : 'Delivery status'}</label>
            <select value={deliveryStatus} onChange={(e) => setDeliveryStatus(e.target.value)}>
              <option value="All">{lang === 'ar' ? 'كل الشحنات (All)' : 'All'}</option>
              <option value="Open">Open</option>
              <option value="Delivered">Delivered</option>
            </select>
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'فترة سريعة' : 'Quick range'}</label>
            <div className="presets">
              <button
                type="button"
                onClick={() => setPreset('30')}
                className={`chip ${preset === '30' ? 'on' : ''}`}
              >
                {lang === 'ar' ? 'آخر 30 يوم' : 'Last 30 days'}
              </button>
              <button
                type="button"
                onClick={() => setPreset('90')}
                className={`chip ${preset === '90' ? 'on' : ''}`}
              >
                {lang === 'ar' ? 'آخر 90 يوم' : 'Last 90 days'}
              </button>
              <button
                type="button"
                onClick={() => setPreset('all')}
                className={`chip ${preset === 'all' ? 'on' : ''}`}
              >
                {lang === 'ar' ? 'كل الفترات' : 'All time'}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setDateBasis('load');
              setDFrom('');
              setDTo('');
              setDeliveryStatus('All');
              setPreset('all');
              setFClient('');
              setFTrucker('');
              setFDest('');
              setFSize('');
              setFOper('');
              setFLine('');
              setFPort('');
              setFPol('');
              setFRisk('');
            }}
            className="text-xs font-semibold text-sky-600 hover:underline ms-auto self-end pb-2"
          >
            {lang === 'ar' ? 'مسح الفلاتر' : 'Clear filters'}
          </button>
        </div>

        <div className="rsep" />

        <div className="rrow">
          <div className="fld">
            <label>{lang === 'ar' ? 'العميل (Client)' : 'Client'}</label>
            <select value={fClient} onChange={(e) => setFClient(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل العملاء' : 'All clients'}</option>
              {MASTER_DEFAULTS.client.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'مقاول النقل (Transporter)' : 'Transporter'}</label>
            <select value={fTrucker} onChange={(e) => setFTrucker(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل المقاولين' : 'All transporters'}</option>
              {MASTER_DEFAULTS.trucker.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Offloading site in Import vs Loading site in Export */}
          <div className="fld">
            <label>
              {isImport
                ? (lang === 'ar' ? 'مكان التعتيق (Offloading site)' : 'Offloading site')
                : (lang === 'ar' ? 'مكان التحميل (Loading site)' : 'Loading site')}
            </label>
            <select value={fDest} onChange={(e) => setFDest(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الأماكن' : 'All sites'}</option>
              {(isImport ? MASTER_DEFAULTS.dest : ['10OF RAMDAN', 'EL SADAT', 'OCTOBER', 'BORG EL ARAB', 'SUEZ']).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Container filter (New) */}
          <div className="fld">
            <label>{lang === 'ar' ? 'نوع الحاوية (Container)' : 'Container'}</label>
            <select value={fSize} onChange={(e) => setFSize(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل المقاسات' : 'All containers'}</option>
              {["20'", "40'", "40' HC", "LCL"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Operations staff filter (New) */}
          <div className="fld">
            <label>{lang === 'ar' ? 'فريق العمليات (Operations staff)' : 'Operations staff'}</label>
            <select value={fOper} onChange={(e) => setFOper(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الفريق' : 'All staff'}</option>
              {MASTER_DEFAULTS.oper.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'الخط الملاحي (Shipping line)' : 'Shipping line'}</label>
            <select value={fLine} onChange={(e) => setFLine(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الخطوط' : 'All lines'}</option>
              {MASTER_DEFAULTS.line.map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          {/* Export: POL filter instead of Demurrage */}
          {!isImport && (
            <div className="fld">
              <label>{lang === 'ar' ? 'ميناء الشحن (POL)' : 'POL'}</label>
              <select value={fPol} onChange={(e) => setFPol(e.target.value)}>
                <option value="">{lang === 'ar' ? 'كل الموانئ' : 'All POL'}</option>
                {['ALEXANDRIA', 'DAMIETTA', 'PORT SAID', 'SOKHNA'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div className="fld">
            <label>{lang === 'ar' ? 'ميناء الوصول (POD)' : 'POD'}</label>
            <select value={fPort} onChange={(e) => setFPort(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الموانئ' : 'All ports'}</option>
              {(isImport ? MASTER_DEFAULTS.pod : ['BARCELONA', 'BEIRUT', 'JEDDAH', 'TANGER MED', 'GENOVA', 'SINGAPORE']).map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Import: Demurrage with Pulled after free time / Within free time */}
          {isImport && (
            <div className="fld">
              <label>{lang === 'ar' ? 'غرامات الأرضيات (Demurrage)' : 'Demurrage'}</label>
              <select value={fRisk} onChange={(e) => setFRisk(e.target.value)}>
                <option value="">{lang === 'ar' ? 'كل الشحنات' : 'All demurrage'}</option>
                <option value="Late">Pulled after free time</option>
                <option value="OK">Within free time</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* 2. 14 KPI Cards Band */}
      <div className="kpis">
        {isImport ? (
          <>
            {/* Import KPI Cards */}
            <div className="kpi">
              <div className="k-top"><span className="k-ico">🚛</span><span className="k-label">{lang === 'ar' ? 'رحلات النقل' : 'Truck trips'}</span></div>
              <div className="k-val">469</div>
              <div className="k-sub">469 import trips</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📦</span><span className="k-label">{lang === 'ar' ? 'الحاويات' : 'Containers'}</span></div>
              <div className="k-val">469</div>
              <div className="k-sub">40' (82%) · 20' · LCL</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">🏭</span><span className="k-label">{lang === 'ar' ? 'العملاء' : 'Clients served'}</span></div>
              <div className="k-val">10</div>
              <div className="k-sub">across 12 sites</div>
            </div>

            <div className="kpi sand">
              <div className="k-top"><span className="k-ico">🤝</span><span className="k-label">{lang === 'ar' ? 'المقاولون' : 'Truckers used'}</span></div>
              <div className="k-val">10</div>
              <div className="k-sub">top 3 carry 65% of trips</div>
            </div>

            <div className="kpi bad">
              <div className="k-top"><span className="k-ico">⚠️</span><span className="k-label">{lang === 'ar' ? 'مخاطر الأرضيات' : 'Demurrage risk'}</span></div>
              <div className="k-val text-rose-600">5%</div>
              <div className="k-sub">22 trips with late free time</div>
            </div>

            <div className="kpi good">
              <div className="k-top"><span className="k-ico">🕓</span><span className="k-label">{lang === 'ar' ? 'فترة السماح المتبقية' : 'Free time left'}</span></div>
              <div className="k-val text-emerald-700">12.9 d</div>
              <div className="k-sub">avg days between activity date and free time end</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">👥</span><span className="k-label">{lang === 'ar' ? 'فريق العمليات' : 'Operations staff'}</span></div>
              <div className="k-val">5</div>
              <div className="k-sub">handled 41% of trips</div>
            </div>

            <div className="kpi warn">
              <div className="k-top"><span className="k-ico">🚚</span><span className="k-label">{lang === 'ar' ? 'السيارات المستخدمة' : 'Trucks used'}</span></div>
              <div className="k-val text-amber-600">195</div>
              <div className="k-sub">2.4 trips per truck on average</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">📄</span><span className="k-label">{lang === 'ar' ? 'الشحنات' : 'Shipments'}</span></div>
              <div className="k-val">164</div>
              <div className="k-sub">2.8 trips per shipment on average</div>
            </div>

            <div className="kpi good">
              <div className="k-top"><span className="k-ico">🎯</span><span className="k-label">{lang === 'ar' ? 'الوصول في الموعد' : 'Arrived on time'}</span></div>
              <div className="k-val text-emerald-700">–</div>
              <div className="k-sub">no actual arrive dates yet</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⏱️</span><span className="k-label">{lang === 'ar' ? 'تأخير الوصول' : 'Arrival delay'}</span></div>
              <div className="k-val">–</div>
              <div className="k-sub">no actual arrive times yet</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">🛣️</span><span className="k-label">{lang === 'ar' ? 'زمن النقل' : 'Gate → site transit'}</span></div>
              <div className="k-val">–</div>
              <div className="k-sub">no gate out + arrive pairs yet</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📍</span><span className="k-label">{lang === 'ar' ? 'وجهات التعتيق' : 'Destinations'}</span></div>
              <div className="k-val">12</div>
              <div className="k-sub">OCTOBER takes 45% of trips</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⚓</span><span className="k-label">{lang === 'ar' ? 'ميناء الوصول' : 'Ports (POD)'}</span></div>
              <div className="k-val">2</div>
              <div className="k-sub">SOKHNA takes 98% of the trips</div>
            </div>
          </>
        ) : (
          <>
            {/* Export KPI Cards — Exactly matching Image 1 without any duplicates */}
            {/* Row 1 */}
            <div className="kpi">
              <div className="k-top"><span className="k-ico">🚛</span><span className="k-label">{lang === 'ar' ? 'رحلات النقل' : 'Truck trips'}</span></div>
              <div className="k-val">73</div>
              <div className="k-sub">73 export trips</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📦</span><span className="k-label">{lang === 'ar' ? 'الحاويات' : 'Containers'}</span></div>
              <div className="k-val">73</div>
              <div className="k-sub">4 × 20' · 69 × 40'</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">🏭</span><span className="k-label">{lang === 'ar' ? 'العملاء' : 'Clients served'}</span></div>
              <div className="k-val">5</div>
              <div className="k-sub">across 3 sites</div>
            </div>

            <div className="kpi sand">
              <div className="k-top"><span className="k-ico">🤝</span><span className="k-label">{lang === 'ar' ? 'المقاولون' : 'Truckers used'}</span></div>
              <div className="k-val">2</div>
              <div className="k-sub">top 3 carry 100% of trips</div>
            </div>

            {/* Row 2 */}
            <div className="kpi">
              <div className="k-top"><span className="k-ico">👥</span><span className="k-label">{lang === 'ar' ? 'فريق العمليات' : 'Operations staff'}</span></div>
              <div className="k-val">3</div>
              <div className="k-sub">busiest handles 92% of trips</div>
            </div>

            <div className="kpi warn">
              <div className="k-top"><span className="k-ico">🚚</span><span className="k-label">{lang === 'ar' ? 'السيارات المستخدمة' : 'Trucks used'}</span></div>
              <div className="k-val text-amber-600">51</div>
              <div className="k-sub">1.4 trips per truck on average</div>
            </div>

            <div className="kpi bad">
              <div className="k-top"><span className="k-ico">⏰</span><span className="k-label">{lang === 'ar' ? 'مهلة Cut-off' : 'Cut-off buffer'}</span></div>
              <div className="k-val text-rose-600">-2.0 d</div>
              <div className="k-sub">67 of 67 after the cut-off (actual arrival, or required date)</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">📄</span><span className="k-label">{lang === 'ar' ? 'الشحنات' : 'Shipments'}</span></div>
              <div className="k-val">14</div>
              <div className="k-sub">5.2 trips per shipment on average</div>
            </div>

            {/* Row 3 */}
            <div className="kpi good">
              <div className="k-top"><span className="k-ico">🎯</span><span className="k-label">{lang === 'ar' ? 'الوصول في الموعد' : 'Arrived on time'}</span></div>
              <div className="k-val text-emerald-700">–</div>
              <div className="k-sub">no actual arrive dates yet</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⏱️</span><span className="k-label">{lang === 'ar' ? 'تأخير الوصول' : 'Arrival delay'}</span></div>
              <div className="k-val">–</div>
              <div className="k-sub">no actual arrive times yet</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">🛣️</span><span className="k-label">{lang === 'ar' ? 'زمن النقل' : 'Gate → site transit'}</span></div>
              <div className="k-val">–</div>
              <div className="k-sub">no gate out + arrive pairs yet</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📍</span><span className="k-label">{lang === 'ar' ? 'الوجهات' : 'Destinations'}</span></div>
              <div className="k-val">3</div>
              <div className="k-sub">SOKHNA takes 52% of the trips</div>
            </div>

            {/* Row 4 */}
            <div className="kpi">
              <div className="k-top"><span className="k-ico">⚓</span><span className="k-label">{lang === 'ar' ? 'ميناء الوصول' : 'Ports (POD)'}</span></div>
              <div className="k-val">9</div>
              <div className="k-sub">BEJAIA takes 42% of the trips</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">🛣️</span><span className="k-label">{lang === 'ar' ? 'المسارات' : 'Routes'}</span></div>
              <div className="k-val">10</div>
              <div className="k-sub">to 9 destination ports</div>
            </div>
          </>
        )}
      </div>

      {/* ================= EXACT CHARTS SUITE ================= */}

      {/* Row 1: Trips by month (s8) & Shipping lines (s4) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Trips by month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600"></span>
            Trips by month
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Track trips by Activity date month — click a month to focus</p>

          <div className="h-44 flex items-end justify-center gap-20 border-b border-slate-200 pb-2 px-12">
            {monthData.map((m) => {
              const hPct = Math.round((m.count / maxMonth) * 100);
              return (
                <div key={m.label} className="flex flex-col items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700">{m.count}</span>
                  <div
                    className="w-14 rounded-t-md bg-[#0b4f7a] transition-all hover:bg-[#0e7c86]"
                    style={{ height: `${Math.max(6, hPct * 1.2)}px` }}
                  />
                  <span className="text-xs font-semibold text-slate-500 mt-1">{m.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shipping lines */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600"></span>
            Shipping lines
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Line of the containers moved</p>

          <div className="space-y-2">
            {lineData.map((l) => (
              <div key={l.name} className="flex items-center gap-2 text-xs">
                <span className="w-20 font-semibold text-slate-600 truncate">{l.name}</span>
                <div className="flex-1 h-3 rounded-sm bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-sm bg-slate-600"
                    style={{ width: `${Math.round((l.count / maxLine) * 100)}%` }}
                  />
                </div>
                <span className="w-8 text-end text-[11px] text-slate-500">{l.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 2: Daily trips (Strictly bounded SVG inside overflow-hidden card) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-600"></span>
          Daily trips
        </h4>
        <p className="text-[11px] text-slate-400 mb-3">By Activity date — click a point to filter</p>

        <div className="w-full h-36 overflow-hidden relative">
          <svg className="w-full h-full block" viewBox="0 0 900 120" preserveAspectRatio="none">
            <defs>
              <linearGradient id="waveCyanGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22b8cf" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22b8cf" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            {/* Carefully bounded path strictly within 20px - 110px */}
            <path
              d="M 25,55 C 50,75 60,82 75,82 C 100,80 110,78 125,78 C 150,82 160,85 175,85 C 200,60 210,40 225,40 C 250,55 260,70 275,70 C 300,50 310,35 325,35 C 350,55 360,68 375,68 C 400,52 410,42 425,42 C 450,75 460,98 475,98 C 500,80 510,65 525,65 C 550,70 560,76 575,76 C 600,85 610,90 625,90 C 650,72 660,58 675,58 C 700,65 710,70 725,70 C 750,80 760,85 775,85 C 800,95 810,100 825,100 C 850,92 860,86 875,86 L 875,120 L 25,120 Z"
              fill="url(#waveCyanGrad)"
            />
            <path
              d="M 25,55 C 50,75 60,82 75,82 C 100,80 110,78 125,78 C 150,82 160,85 175,85 C 200,60 210,40 225,40 C 250,55 260,70 275,70 C 300,50 310,35 325,35 C 350,55 360,68 375,68 C 400,52 410,42 425,42 C 450,75 460,98 475,98 C 500,80 510,65 525,65 C 550,70 560,76 575,76 C 600,85 610,90 625,90 C 650,72 660,58 675,58 C 700,65 710,70 725,70 C 750,80 760,85 775,85 C 800,95 810,100 825,100 C 850,92 860,86 875,86"
              fill="none"
              stroke="#0e7c86"
              strokeWidth="2.5"
            />
            {/* Circles */}
            {dailyPoints.map((pt, i) => (
              <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#0e7c86" stroke="#fff" strokeWidth="1.5" />
            ))}
          </svg>
        </div>

        {/* Dates axis */}
        <div className="flex justify-between text-[10px] text-slate-400 mt-2 border-t border-slate-100 pt-1.5">
          {dailyPoints.map((pt) => (
            <span key={pt.day}>{pt.day}</span>
          ))}
        </div>
      </div>

      {/* Row 3: Trips by client & Trips by trucker */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Trips by client */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600"></span>
            Trips by client
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Volume share — click a client to focus</p>

          <div className="space-y-2.5">
            {clientData.map((c, i) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span className="w-28 font-semibold text-slate-700 truncate">{c.name}</span>
                <div className="flex-1 h-3 rounded-sm bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${c.pct * 2.5}%`,
                      backgroundColor: i === 0 ? '#0b4f7a' : i < 3 ? '#22b8cf' : i < 6 ? '#66788c' : '#d8a84a',
                    }}
                  />
                </div>
                <span className="w-10 text-end text-[11px] text-slate-500">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Trips by trucker */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600"></span>
            Trips by trucker
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Who moves our containers — click to focus</p>

          <div className="space-y-2.5">
            {truckerData.map((t, i) => (
              <div key={t.name} className="flex items-center gap-2 text-xs">
                <span className="w-28 font-semibold text-slate-700 truncate">{t.name}</span>
                <div className="flex-1 h-3 rounded-sm bg-slate-100 overflow-hidden">
                  <div
                    className="h-full rounded-sm"
                    style={{
                      width: `${t.pct * 3}%`,
                      backgroundColor: i < 3 ? '#0e7c86' : '#66788c',
                    }}
                  />
                </div>
                <span className="w-10 text-end text-[11px] text-slate-500">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Direction specific charts */}
      {isImport ? (
        /* Import: Demurrage risk by client & Free-time usage */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Demurrage risk by client */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-rose-600"></span>
              Demurrage risk by client
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">% of trips pulled after the free time end</p>

            <div className="h-36 flex items-end gap-6 border-b border-slate-200 pb-2 px-4">
              {riskByClientData.map((item) => (
                <div key={item.name} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600">{item.pct}%</span>
                  <div
                    className="w-5 rounded-t-sm"
                    style={{ height: `${Math.max(4, item.pct * 2)}px`, backgroundColor: item.color }}
                  />
                  <span className="text-[9px] text-slate-500 truncate w-14 text-center">{item.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Free-time usage */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Free-time usage
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Days left before demurrage when the container was pulled</p>

            <div className="h-36 flex items-end gap-8 border-b border-slate-200 pb-2 px-6">
              {freeUsageData.map((item) => (
                <div key={item.label} className="flex-1 flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-600">{item.count}</span>
                  <div
                    className="w-10 rounded-t-sm"
                    style={{ height: `${Math.max(4, (item.count / 450) * 110)}px`, backgroundColor: item.color }}
                  />
                  <span className="text-[9px] text-slate-500 text-center">{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Export: Loading sites & Export routes */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Loading sites */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-600"></span>
              Loading sites
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Origin locations for export shipments</p>

            <div className="space-y-2.5">
              {loadingSitesData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-32 font-semibold text-slate-600 truncate">{s.name}</span>
                  <div className="flex-1 h-3 rounded-sm bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-[#22b8cf]"
                      style={{ width: `${Math.round((s.count / maxLoadSite) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-end text-[11px] text-slate-500">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Export routes */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600"></span>
              Export routes
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Top corridors from POL to POD</p>

            <div className="space-y-2.5">
              {exportRoutesData.map((r) => (
                <div key={r.name} className="flex items-center gap-2 text-xs">
                  <span className="w-48 font-semibold text-slate-700 truncate">{r.name}</span>
                  <div className="flex-1 h-3 rounded-sm bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-[#0e7c86]"
                      style={{ width: `${Math.round((r.count / maxRoute) * 100)}%` }}
                    />
                  </div>
                  <span className="w-8 text-end text-[11px] text-slate-500">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Row 5: Direction specific destination & delivery status */}
      {isImport ? (
        /* Import: Offloading sites & Destination ports (POD) */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Offloading sites */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cyan-600"></span>
              Offloading sites
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Container delivery locations</p>

            <div className="space-y-2">
              {siteData.map((s) => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <span className="w-32 font-semibold text-slate-600 truncate">{s.name}</span>
                  <div className="flex-1 h-3 rounded-sm bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-sm bg-[#22b8cf]"
                      style={{ width: `${Math.round((s.count / maxSite) * 100)}%` }}
                    />
                  </div>
                  <span className="w-10 text-end text-[11px] text-slate-500">{s.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Destination ports (POD) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600"></span>
              Destination ports (POD)
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Trips by destination port</p>

            <div className="h-44 flex items-end justify-center gap-12 border-b border-slate-200 pb-2 px-4">
              {portData.map((p) => (
                <div key={p.name} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-bold text-slate-700">{p.count}</span>
                  <div
                    className="w-14 rounded-t-sm bg-slate-600"
                    style={{ height: p.count > 100 ? '110px' : '15px' }}
                  />
                  <span className="text-xs font-semibold text-slate-600">{p.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Export: Destination ports (POD) & Delivery status */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Destination ports (POD) */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600"></span>
              Destination ports (POD)
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Trips by destination seaport</p>

            <div className="h-40 flex items-end justify-between border-b border-slate-200 pb-2 px-4 gap-2">
              {portData.map((p) => (
                <div key={p.name} className="flex flex-col items-center gap-2 flex-1">
                  <span className="text-xs font-bold text-slate-700">{p.count}</span>
                  <div
                    className="w-10 rounded-t-sm bg-slate-600"
                    style={{ height: `${Math.round((p.count / 25) * 100)}px` }}
                  />
                  <span className="text-[10px] font-medium text-slate-600 truncate w-14 text-center">{p.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Delivery status */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 overflow-hidden">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              Delivery status
            </h4>
            <p className="text-[11px] text-slate-400 mb-4">Workflow status of export shipments</p>

            <div className="flex flex-col items-center justify-center pt-2">
              <div className="relative h-28 w-28 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1f8f63" strokeWidth="5" strokeDasharray="66 100" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#0b4f7a" strokeWidth="5" strokeDasharray="34 100" strokeDashoffset="-66" />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-slate-800">73</span>
                  <span className="text-[9px] text-slate-400">Total</span>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <i className="h-2.5 w-2.5 rounded-full bg-emerald-600"></i> Delivered (66%)
                </span>
                <span className="flex items-center gap-1.5 text-sky-800">
                  <i className="h-2.5 w-2.5 rounded-full bg-[#0b4f7a]"></i> Open (34%)
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 6: Required vs actual arrival & Arrival performance (NEW - Image 2) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Required vs actual arrival */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600"></span>
            Required vs actual arrival
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Actual arrival against required offloading date and time</p>

          <div className="h-36 flex items-end justify-between border-b border-slate-200 pb-2 px-4 gap-2">
            {offDelayBuckets.map((b) => (
              <div key={b.label} className="flex flex-col items-center gap-1.5 flex-1">
                <span className="text-[11px] font-bold text-slate-700">{b.count}</span>
                <div
                  className="w-12 rounded-t-sm transition-all duration-300"
                  style={{
                    height: `${Math.max(6, Math.round((b.count / maxOffDelay) * 90))}px`,
                    backgroundColor: b.color,
                  }}
                />
                <span className="text-[9px] font-medium text-slate-500 text-center whitespace-nowrap">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Arrival performance */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
            Arrival performance
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Actual arrive against the required date & time</p>

          <div className="h-36 flex flex-col items-center justify-center">
            <div className="relative h-24 w-24 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                {/* On time: 83% */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#1f8f63" strokeWidth="5" strokeDasharray="83 100" />
                {/* Late: 17% */}
                <circle cx="18" cy="18" r="14" fill="none" stroke="#cf4d4d" strokeWidth="5" strokeDasharray="17 100" strokeDashoffset="-83" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-slate-800">83%</span>
                <span className="text-[9px] text-slate-400">On time</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <i className="h-2.5 w-2.5 rounded-full bg-emerald-600"></i> On time (199)
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <i className="h-2.5 w-2.5 rounded-full bg-rose-600"></i> Late (42)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 7: Delay share by trucker (NEW - Image 3) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-rose-600"></span>
          Delay share by trucker
        </h4>
        <p className="text-[11px] text-slate-400 mb-4">% of each trucker's trips that arrived late — min 3 trips</p>

        <div className="h-36 flex items-end justify-between border-b border-slate-200 pb-2 px-6 gap-3">
          {delayTruckerData.map((d) => (
            <div key={d.name} className="flex flex-col items-center gap-1.5 flex-1">
              <span className="text-[11px] font-bold text-slate-700">{d.pct}%</span>
              <div
                className="w-10 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(4, Math.round((d.pct / maxDelayPct) * 90))}px`,
                  backgroundColor: d.color,
                }}
              />
              <span className="text-[10px] font-medium text-slate-600 truncate w-16 text-center">{d.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Row 8: Container mix (s4) & Workload by operations staff (s8) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Container mix */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-4 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-600"></span>
            Container mix
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">20' vs 40' vs LCL</p>

          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative h-32 w-32 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="14" fill="none" stroke="#0b4f7a" strokeWidth="5" strokeDasharray="82 100" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#22b8cf" strokeWidth="5" strokeDasharray="17 100" strokeDashoffset="-82" />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#8fd9e6" strokeWidth="5" strokeDasharray="1 100" strokeDashoffset="-99" />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-slate-800">469</span>
                <span className="text-[9px] text-slate-400">Total</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#0b4f7a]"></i> 40' (82%)</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#22b8cf]"></i> 20' (17%)</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#8fd9e6]"></i> LCL (1%)</span>
            </div>
          </div>
        </div>

        {/* Workload by operations staff */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8 overflow-hidden">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-teal-600"></span>
            Workload by operations staff
          </h4>
          <p className="text-[11px] text-slate-400 mb-4">Trips handled per team member</p>

          <div className="h-40 flex items-end justify-center gap-14 border-b border-slate-200 pb-2 px-8">
            {staffData.map((st) => (
              <div key={st.name} className="flex flex-col items-center gap-2">
                <span className="text-xs font-bold text-slate-700">{st.count}</span>
                <div
                  className="w-12 rounded-t-sm bg-[#0b4f7a]"
                  style={{ height: `${Math.round((st.count / 200) * 110)}px` }}
                />
                <span className="text-xs font-semibold text-slate-600">{st.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 9: Trucker coverage (s12) */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-teal-600"></span>
          Trucker coverage
        </h4>
        <p className="text-[11px] text-slate-400 mb-4">Clients served by each trucker</p>

        <div className="h-36 flex items-end justify-between border-b border-slate-200 pb-2 px-8">
          {truckerCoverageData.map((tc) => (
            <div key={tc.name} className="flex flex-col items-center gap-2 flex-1">
              <span className="text-xs font-bold text-slate-700">{tc.count}</span>
              <div
                className="w-8 rounded-t-sm bg-[#0e7c86]"
                style={{ height: `${tc.count * 14}px` }}
              />
              <span className="text-[10px] text-slate-600 truncate w-14 text-center">{tc.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
