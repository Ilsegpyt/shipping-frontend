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

export const getScaleTicks = (maxVal) => {
  if (!maxVal || maxVal <= 0) return { maxScale: 10, ticks: [10, 8, 6, 4, 2, 0] };
  const raw = maxVal * 1.15;
  let step;
  if (raw <= 5) step = 1;
  else if (raw <= 10) step = 2;
  else if (raw <= 25) step = 5;
  else if (raw <= 50) step = 10;
  else if (raw <= 100) step = 20;
  else if (raw <= 150) step = 25;
  else if (raw <= 250) step = 50;
  else if (raw <= 500) step = 100;
  else if (raw <= 1000) step = 200;
  else step = Math.ceil(raw / 5 / 100) * 100;

  const maxScale = Math.ceil(raw / step) * step;
  const ticks = [];
  for (let v = maxScale; v >= 0; v -= step) {
    ticks.push(v);
  }
  return { maxScale, ticks };
};

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

  // 0. Dynamic dropdown options extracted from real loaded data
  const options = useMemo(() => {
    const clients = new Set();
    const truckers = new Set();
    const sites = new Set();
    const sizes = new Set();
    const opers = new Set();
    const lines = new Set();
    const pols = new Set();
    const pods = new Set();

    (data || []).forEach((r) => {
      if (r.client?.trim()) clients.add(r.client.trim());
      if (r.trucker?.trim()) truckers.add(r.trucker.trim());
      if (r.dest?.trim()) sites.add(r.dest.trim());
      if (r.size?.trim()) sizes.add(r.size.trim());
      if (r.oper?.trim()) opers.add(r.oper.trim());
      if (r.line?.trim()) lines.add(r.line.trim());
      if (r.pol?.trim()) pols.add(r.pol.trim());
      if (r.pod?.trim()) pods.add(r.pod.trim());
    });

    return {
      clients: Array.from(clients).sort((a, b) => a.localeCompare(b)),
      truckers: Array.from(truckers).sort((a, b) => a.localeCompare(b)),
      sites: Array.from(sites).sort((a, b) => a.localeCompare(b)),
      sizes: Array.from(sizes).sort((a, b) => a.localeCompare(b)),
      opers: Array.from(opers).sort((a, b) => a.localeCompare(b)),
      lines: Array.from(lines).sort((a, b) => a.localeCompare(b)),
      pols: Array.from(pols).sort((a, b) => a.localeCompare(b)),
      pods: Array.from(pods).sort((a, b) => a.localeCompare(b)),
    };
  }, [data]);

  // 1. Live Interactive Filtered Data
  const filteredData = useMemo(() => {
    return (data || []).filter((r) => {
      // Delivery status filter (All, Open, Delivered)
      if (deliveryStatus !== 'All') {
        const rowStatus = String(r.status || 'Open').toLowerCase();
        if (deliveryStatus.toLowerCase() !== rowStatus) return false;
      }

      // Client filter
      if (fClient && (r.client || '').trim() !== fClient) return false;

      // Transporter filter
      if (fTrucker && (r.trucker || '').trim() !== fTrucker) return false;

      // Site (Offloading in Import / Loading in Export)
      if (fDest && (r.dest || '').trim() !== fDest) return false;

      // Container size
      if (fSize && (r.size || '').trim() !== fSize) return false;

      // Operations staff
      if (fOper && (r.oper || '').trim() !== fOper) return false;

      // Shipping line
      if (fLine && (r.line || '').trim() !== fLine) return false;

      // POL (Export only)
      if (!isImport && fPol && (r.pol || '').trim() !== fPol) return false;

      // POD
      if (fPort && (r.pod || '').trim() !== fPort) return false;

      // Demurrage risk (Import only)
      if (isImport && fRisk) {
        if (fRisk === 'Late' && r.risk !== 'Late') return false;
        if (fRisk === 'OK' && r.risk !== 'OK') return false;
      }

      // Date basis filtering
      let dateVal = null;
      if (dateBasis === 'load') dateVal = r.load || r.arrDate || r.reqDate || r.gateOut || r.createdAt;
      else if (dateBasis === 'reqDate') dateVal = r.reqDate;
      else if (dateBasis === 'arrDate') dateVal = r.arrDate;
      else if (dateBasis === 'gateOut') dateVal = r.gateOut;
      else if (dateBasis === 'free') dateVal = r.free;
      else if (dateBasis === 'created') dateVal = r.createdAt || r._createdAtUtc;

      const dateStr = dateVal ? String(dateVal).slice(0, 10) : null;

      if (dFrom || dTo) {
        if (!dateStr) return false;
        if (dFrom && dateStr < dFrom) return false;
        if (dTo && dateStr > dTo) return false;
      }

      // Quick presets (last 30 days, last 90 days)
      if (preset === '30' || preset === '90') {
        const daysLimit = preset === '30' ? 30 : 90;
        if (!dateStr) return false;
        const dTime = new Date(dateStr).getTime();
        if (isNaN(dTime)) return false;
        const diffDays = (Date.now() - dTime) / (1000 * 60 * 60 * 24);
        if (diffDays < 0 || diffDays > daysLimit) return false;
      }

      return true;
    });
  }, [data, deliveryStatus, fClient, fTrucker, fDest, fSize, fOper, fLine, fPol, fPort, fRisk, dateBasis, dFrom, dTo, preset, isImport]);

  // 2. Compute 14 KPI Metrics dynamically from filteredData
  const metrics = useMemo(() => {
    const list = filteredData || [];
    const totalTrips = list.length;

    // Containers breakdown
    let count20 = 0;
    let count40 = 0;
    let count40HC = 0;
    let countLcl = 0;
    list.forEach((r) => {
      const s = String(r.size || '').toLowerCase();
      if (s.includes('20')) count20++;
      else if (s.includes('hc') || s.includes('high')) count40HC++;
      else if (s.includes('40')) count40++;
      else if (s.includes('lcl')) countLcl++;
      else count40++;
    });
    const total40Family = count40 + count40HC;
    const pct40 = totalTrips > 0 ? Math.round((total40Family / totalTrips) * 100) : 0;
    const pct20 = totalTrips > 0 ? Math.round((count20 / totalTrips) * 100) : 0;

    // Clients & Sites
    const clientSet = new Set();
    const siteSet = new Set();
    list.forEach((r) => {
      if (r.client?.trim()) clientSet.add(r.client.trim());
      if (r.dest?.trim()) siteSet.add(r.dest.trim());
    });
    const clientsCount = clientSet.size;
    const sitesCount = siteSet.size;

    // Truckers & Top 3 share
    const truckerMap = {};
    list.forEach((r) => {
      const t = r.trucker?.trim() || (lang === 'ar' ? 'أخرى' : 'Other');
      truckerMap[t] = (truckerMap[t] || 0) + 1;
    });
    const truckersList = Object.entries(truckerMap).sort((a, b) => b[1] - a[1]);
    const truckersCount = truckersList.length;
    const top3Trips = truckersList.slice(0, 3).reduce((sum, item) => sum + item[1], 0);
    const top3TruckersPct = totalTrips > 0 ? Math.round((top3Trips / totalTrips) * 100) : 0;

    // Operations staff & busiest
    const operMap = {};
    list.forEach((r) => {
      const op = r.oper?.trim() || (lang === 'ar' ? 'أخرى' : 'Other');
      operMap[op] = (operMap[op] || 0) + 1;
    });
    const opStaffList = Object.entries(operMap).sort((a, b) => b[1] - a[1]);
    const opStaffCount = opStaffList.length;
    const busiestStaffTrips = opStaffList[0]?.[1] || 0;
    const busiestStaffPct = totalTrips > 0 ? Math.round((busiestStaffTrips / totalTrips) * 100) : 0;

    // Trucks used
    const carSet = new Set();
    list.forEach((r) => {
      if (r.car?.trim()) carSet.add(r.car.trim());
    });
    const trucksCount = carSet.size;
    const avgTripsPerTruck = trucksCount > 0 ? (totalTrips / trucksCount).toFixed(1) : '0';

    // Shipments
    const shipSet = new Set();
    list.forEach((r) => {
      const k = r.shipKey || (isImport ? r.bl : r.booking) || r.shipNo || r.cntr;
      if (k) shipSet.add(k);
    });
    const shipmentsCount = shipSet.size;
    const avgTripsPerShipment = shipmentsCount > 0 ? (totalTrips / shipmentsCount).toFixed(1) : '0';

    // Arrived on time & Arrival delay & Transit
    let arrivedOnTimeCount = 0;
    let arrivedTotalCount = 0;
    let delayHoursSum = 0;
    let delayCount = 0;
    let transitHoursSum = 0;
    let transitPairsCount = 0;

    list.forEach((r) => {
      if (r.arrDate && r.reqDate) {
        arrivedTotalCount++;
        const arrDt = new Date(r.arrDate + 'T' + (r.arrTime || '00:00') + ':00');
        const reqDt = new Date(r.reqDate + 'T' + (r.reqTime || '00:00') + ':00');
        if (!isNaN(arrDt.getTime()) && !isNaN(reqDt.getTime())) {
          const diffH = (arrDt.getTime() - reqDt.getTime()) / (1000 * 3600);
          if (diffH <= 0) {
            arrivedOnTimeCount++;
          } else {
            delayHoursSum += diffH;
            delayCount++;
          }
        }
      }

      if (r.gateOut && r.arrDate) {
        const goDt = new Date(r.gateOut + 'T' + (r.gateOutT || '00:00') + ':00');
        const arrDt = new Date(r.arrDate + 'T' + (r.arrTime || '00:00') + ':00');
        if (!isNaN(goDt.getTime()) && !isNaN(arrDt.getTime())) {
          const diffH = (arrDt.getTime() - goDt.getTime()) / (1000 * 3600);
          if (diffH >= 0 && diffH <= 24 * 30) {
            transitHoursSum += diffH;
            transitPairsCount++;
          }
        }
      }
    });

    const arrivedOnTimePct = arrivedTotalCount > 0 ? Math.round((arrivedOnTimeCount / arrivedTotalCount) * 100) : null;
    const avgDelayHours = delayCount > 0 ? (delayHoursSum / delayCount).toFixed(1) : null;
    const avgTransitHours = transitPairsCount > 0 ? (transitHoursSum / transitPairsCount).toFixed(1) : null;

    // Destinations
    const destMap = {};
    list.forEach((r) => {
      if (r.dest?.trim()) {
        const d = r.dest.trim();
        destMap[d] = (destMap[d] || 0) + 1;
      }
    });
    const destList = Object.entries(destMap).sort((a, b) => b[1] - a[1]);
    const destCount = destList.length;
    const topDestName = destList[0]?.[0] || '–';
    const topDestPct = totalTrips > 0 && destList[0] ? Math.round((destList[0][1] / totalTrips) * 100) : 0;

    // Ports (POD)
    const podMap = {};
    list.forEach((r) => {
      if (r.pod?.trim()) {
        const p = r.pod.trim();
        podMap[p] = (podMap[p] || 0) + 1;
      }
    });
    const podList = Object.entries(podMap).sort((a, b) => b[1] - a[1]);
    const portsCount = podList.length;
    const topPodName = podList[0]?.[0] || '–';
    const topPodPct = totalTrips > 0 && podList[0] ? Math.round((podList[0][1] / totalTrips) * 100) : 0;

    // Import-specific Demurrage & Free time
    let demurrageLateCount = 0;
    let freeDaysSum = 0;
    let freeDaysCount = 0;
    if (isImport) {
      list.forEach((r) => {
        if (r.freeDays !== null && r.freeDays !== undefined) {
          freeDaysSum += r.freeDays;
          freeDaysCount++;
          if (r.freeDays < 0 || r.risk === 'Late') demurrageLateCount++;
        }
      });
    }
    const demurragePct = totalTrips > 0 ? Math.round((demurrageLateCount / totalTrips) * 100) : 0;
    const freeDaysAvg = freeDaysCount > 0 ? (freeDaysSum / freeDaysCount).toFixed(1) : '–';

    // Export-specific Cut-off & Routes
    let cutoffLateCount = 0;
    let cutoffDaysSum = 0;
    let cutoffCount = 0;
    const routeSet = new Set();
    if (!isImport) {
      list.forEach((r) => {
        if (r.cutDays !== null && r.cutDays !== undefined) {
          cutoffDaysSum += r.cutDays;
          cutoffCount++;
          if (r.cutDays < 0) cutoffLateCount++;
        }
        if (r.pol?.trim() && r.pod?.trim()) {
          routeSet.add(r.pol.trim() + ' → ' + r.pod.trim());
        }
      });
    }
    const cutoffBufferAvg = cutoffCount > 0 ? (cutoffDaysSum / cutoffCount).toFixed(1) : '–';
    const routesCount = routeSet.size;

    return {
      totalTrips,
      count20,
      count40,
      count40HC,
      countLcl,
      pct40,
      pct20,
      clientsCount,
      sitesCount,
      truckersCount,
      top3TruckersPct,
      opStaffCount,
      busiestStaffPct,
      trucksCount,
      avgTripsPerTruck,
      shipmentsCount,
      avgTripsPerShipment,
      arrivedOnTimePct,
      arrivedTotalCount,
      avgDelayHours,
      delayCount,
      avgTransitHours,
      transitPairsCount,
      destCount,
      topDestName,
      topDestPct,
      portsCount,
      topPodName,
      topPodPct,
      demurragePct,
      demurrageLateCount,
      freeDaysAvg,
      cutoffBufferAvg,
      cutoffLateCount,
      cutoffCount,
      routesCount,
    };
  }, [filteredData, isImport, lang]);

  // 3. Dynamic Charts Data
  // 3.1 Trips by month
  const monthData = useMemo(() => {
    const map = {};
    (filteredData || []).forEach((r) => {
      const dStr = r.load || r.arrDate || r.reqDate || r.gateOut || r.createdAt;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = d.getMonth();
          const sortKey = y * 100 + m;
          const label = d.toLocaleString('en-US', { month: 'short' }) + ' ' + String(y).slice(-2);
          if (!map[sortKey]) {
            map[sortKey] = { label, count: 0, sortKey };
          }
          map[sortKey].count++;
        }
      }
    });
    const res = Object.values(map)
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(({ label, count }) => ({ label, count }));
    return res.length > 0 ? res : [{ label: 'No data', count: 0 }];
  }, [filteredData]);
  const maxMonth = Math.max(...monthData.map((d) => d.count), 1);

  // Dynamic Y-axis scale and proportional bars for Trips by month
  const monthScale = useMemo(() => {
    const valid = monthData.filter((m) => m.label !== 'No data');
    const maxVal = Math.max(...valid.map((d) => d.count), 1);
    return getScaleTicks(maxVal);
  }, [monthData]);

  const monthBars = useMemo(() => {
    const valid = monthData.filter((m) => m.label !== 'No data');
    if (valid.length === 0) return [];
    const leftPad = 48;
    const rightPad = 20;
    const topPad = 22;
    const plotW = 650 - leftPad - rightPad;
    const plotH = 125;

    const n = valid.length;
    const step = plotW / (n + 1);
    const barW = Math.min(52, Math.max(28, step * 0.45));

    return valid.map((m, idx) => {
      const cx = leftPad + step * (idx + 1);
      const barH = Math.max(4, (m.count / monthScale.maxScale) * plotH);
      const x = cx - barW / 2;
      const y = topPad + plotH - barH;
      return { ...m, cx, x, y, barW, barH };
    });
  }, [monthData, monthScale]);

  // 3.1.1 Dynamic Auto-Insights Banner Generator (Derived dynamically from filteredData)
  const autoInsights = useMemo(() => {
    const list = filteredData || [];
    const totalTrips = list.length;
    if (totalTrips === 0) return [];

    const insights = [];

    // Helper month name map
    const monthFullNamesEn = {
      Jan: 'January', Feb: 'February', Mar: 'March', Apr: 'April',
      May: 'May', Jun: 'June', Jul: 'July', Aug: 'August',
      Sep: 'September', Oct: 'October', Nov: 'November', Dec: 'December'
    };
    const monthFullNamesAr = {
      Jan: 'يناير', Feb: 'فبراير', Mar: 'مارس', Apr: 'أبريل',
      May: 'مايو', Jun: 'يونيو', Jul: 'يوليو', Aug: 'أغسطس',
      Sep: 'سبتمبر', Oct: 'أكتوبر', Nov: 'نوفمبر', Dec: 'ديسمبر'
    };

    // 1. Largest Account (Import & Export)
    const clientMap = {};
    list.forEach((r) => {
      const c = r.client?.trim();
      if (c && c.toLowerCase() !== 'unknown' && c !== 'غير محدد') {
        clientMap[c] = (clientMap[c] || 0) + 1;
      }
    });
    const sortedClients = Object.entries(clientMap).sort((a, b) => b[1] - a[1]);
    if (sortedClients.length > 0) {
      const [topClient, topCount] = sortedClients[0];
      const pct = Math.round((topCount / totalTrips) * 100);
      insights.push({
        id: 'top-client',
        textEn: <><b>{topClient}</b> is the largest account: <b>{pct}%</b> of all trips in this view.</>,
        textAr: <><b>{topClient}</b> هو العميل الأكبر: يمثل <b>{pct}%</b> من إجمالي رحلات هذا العرض.</>,
      });
    }

    if (isImport) {
      // 2. Top 3 Truckers & Concentration Risk (Import)
      const truckerMap = {};
      list.forEach((r) => {
        const t = r.trucker?.trim();
        if (t && t.toLowerCase() !== 'unknown' && t !== 'غير محدد') {
          truckerMap[t] = (truckerMap[t] || 0) + 1;
        }
      });
      const sortedTruckers = Object.entries(truckerMap).sort((a, b) => b[1] - a[1]);
      if (sortedTruckers.length >= 3) {
        const top3 = sortedTruckers.slice(0, 3);
        const top3Names = top3.map((t) => t[0]).join(', ');
        const top3Trips = top3.reduce((sum, t) => sum + t[1], 0);
        const top3Pct = Math.round((top3Trips / totalTrips) * 100);
        insights.push({
          id: 'trucker-risk',
          textEn: <>Top 3 truckers carry <b>{top3Pct}%</b> of trips (<b>{top3Names}</b>) — the main concentration risk.</>,
          textAr: <>أكبر 3 مقاولي نقل ينفذون <b>{top3Pct}%</b> من الرحلات (<b>{top3Names}</b>) — يمثل مخاطرة تركز رئيسية.</>,
        });
      } else if (sortedTruckers.length > 0) {
        const [topTrucker, topTCount] = sortedTruckers[0];
        const pct = Math.round((topTCount / totalTrips) * 100);
        insights.push({
          id: 'trucker-risk',
          textEn: <><b>{topTrucker}</b> is the most used trucker: <b>{topTCount} trips ({pct}%)</b>.</>,
          textAr: <><b>{topTrucker}</b> هو مقاول النقل الأكثر استخداماً: <b>{topTCount} رحلة ({pct}%)</b>.</>,
        });
      }

      // 3. Demurrage Exposure (Import)
      const lateCount = metrics.demurrageLateCount;
      const latePct = metrics.demurragePct;
      if (lateCount > 0) {
        insights.push({
          id: 'demurrage-exposure',
          textEn: <><b>{lateCount} trips ({latePct}%)</b> were pulled after the free time end — direct demurrage exposure.</>,
          textAr: <><b>{lateCount} رحلة ({latePct}%)</b> تم سحبها بعد انتهاء فترة السماح — تعرض مباشر لغرامات الأرضيات.</>,
        });
      } else {
        insights.push({
          id: 'demurrage-exposure',
          textEn: <><b>0 trips</b> exceeded free time — zero demurrage exposure recorded in this view.</>,
          textAr: <><b>0 رحلات</b> تجاوزت فترة السماح — لا يوجد أي تعرض لغرامات الأرضيات في هذا العرض.</>,
        });
      }

      // 4. Highest Demurrage Risk Client (Import)
      const clientRiskMap = {};
      list.forEach((r) => {
        const c = r.client?.trim();
        if (c && c.toLowerCase() !== 'unknown' && c !== 'غير محدد') {
          if (!clientRiskMap[c]) clientRiskMap[c] = { total: 0, late: 0 };
          clientRiskMap[c].total++;
          if (r.freeDays < 0 || r.risk === 'Late') clientRiskMap[c].late++;
        }
      });
      const riskyClients = Object.entries(clientRiskMap)
        .filter(([_, v]) => v.late > 0)
        .map(([name, v]) => ({ name, late: v.late, total: v.total, pct: Math.round((v.late / v.total) * 100) }))
        .sort((a, b) => b.pct - a.pct || b.late - a.late);
      if (riskyClients.length > 0) {
        const topRisk = riskyClients[0];
        insights.push({
          id: 'client-demurrage-risk',
          textEn: <>Highest demurrage risk: <b>{topRisk.name}</b> with <b>{topRisk.pct}%</b> of its trips pulled late.</>,
          textAr: <>أعلى عميل في مخاطر غرامات الأرضيات: <b>{topRisk.name}</b> حيث تأخرت <b>{topRisk.pct}%</b> من رحلاته.</>,
        });
      }

      // 5. Average Free Time Left (Import)
      if (metrics.freeDaysAvg !== '-' && metrics.freeDaysAvg !== '–') {
        insights.push({
          id: 'avg-free-time',
          textEn: <>On average containers are pulled with <b>{metrics.freeDaysAvg} days</b> of free time left.</>,
          textAr: <>في المتوسط يتم سحب الحاويات ومتبقي <b>{metrics.freeDaysAvg} يوماً</b> من فترة السماح.</>,
        });
      }
    } else {
      // 2. Export Top Trucker
      const truckerMap = {};
      list.forEach((r) => {
        const t = r.trucker?.trim();
        if (t && t.toLowerCase() !== 'unknown' && t !== 'غير محدد') {
          truckerMap[t] = (truckerMap[t] || 0) + 1;
        }
      });
      const sortedTruckers = Object.entries(truckerMap).sort((a, b) => b[1] - a[1]);
      if (sortedTruckers.length > 0) {
        const [topTrucker, tCount] = sortedTruckers[0];
        const pct = Math.round((tCount / totalTrips) * 100);
        insights.push({
          id: 'export-trucker',
          textEn: <><b>{topTrucker}</b> is the most used trucker: <b>{tCount} trips ({pct}%)</b>.</>,
          textAr: <><b>{topTrucker}</b> هو مقاول النقل الأكثر استخداماً: <b>{tCount} رحلة ({pct}%)</b>.</>,
        });
      }
    }

    // 6. Busiest Destination / Site (Import & Export)
    if (metrics.topDestName && metrics.topDestName !== '–' && metrics.topDestName !== '-') {
      insights.push({
        id: 'top-site',
        textEn: <><b>{metrics.topDestName}</b> is the busiest site with <b>{metrics.topDestPct}%</b> of trips.</>,
        textAr: <><b>{metrics.topDestName}</b> هو الموقع الأكثر نشاطاً بنسبة <b>{metrics.topDestPct}%</b> من الرحلات.</>,
      });
    }

    // 7. Container Mix (40' or 20' majority)
    const pct40 = metrics.pct40;
    if (pct40 >= 50) {
      insights.push({
        id: 'container-mix',
        textEn: <><b>{pct40}%</b> of moves are <b>40'</b> containers.</>,
        textAr: <><b>{pct40}%</b> من حركات النقل هي لحاويات مقاس <b>40'</b>.</>,
      });
    } else {
      insights.push({
        id: 'container-mix',
        textEn: <><b>{metrics.pct20}%</b> of moves are <b>20'</b> containers.</>,
        textAr: <><b>{metrics.pct20}%</b> من حركات النقل هي لحاويات مقاس <b>20'</b>.</>,
      });
    }

    // 8. Staff Workload (Import & Export)
    const operMap = {};
    list.forEach((r) => {
      const op = r.oper?.trim();
      if (op && op.toLowerCase() !== 'unknown' && op !== 'غير محدد') {
        operMap[op] = (operMap[op] || 0) + 1;
      }
    });
    const sortedOper = Object.entries(operMap).sort((a, b) => b[1] - a[1]);
    if (sortedOper.length > 0) {
      const [topStaff, opCount] = sortedOper[0];
      const pct = Math.round((opCount / totalTrips) * 100);
      insights.push({
        id: 'top-staff',
        textEn: <><b>{topStaff}</b> handles the most files: <b>{pct}%</b> of trips.</>,
        textAr: <><b>{topStaff}</b> يتولى أكبر عدد من الملفات: <b>{pct}%</b> من الرحلات.</>,
      });
    }

    // 9. Trucks Used & Average Trips per Truck (Import & Export)
    if (metrics.trucksCount > 0) {
      insights.push({
        id: 'trucks-used',
        textEn: <><b>{metrics.trucksCount} trucks</b> used · <b>{metrics.avgTripsPerTruck} trips</b> per truck on average.</>,
        textAr: <><b>{metrics.trucksCount} سيارة</b> مستخدمة · <b>{metrics.avgTripsPerTruck} رحلة</b> لكل سيارة في المتوسط.</>,
      });
    }

    // 10. Export Specific: Cut-off buffer & Busiest Corridor
    if (!isImport) {
      if (metrics.cutoffBufferAvg !== '-' && metrics.cutoffBufferAvg !== '–') {
        insights.push({
          id: 'export-cutoff',
          textEn: <>Containers are loaded on average <b>{metrics.cutoffBufferAvg} days</b> before the cut-off · <b>{metrics.cutoffLateCount}</b> after it.</>,
          textAr: <>يتم تحميل الحاويات في المتوسط قبل موعد الـ Cut-off بـ <b>{metrics.cutoffBufferAvg} يوماً</b> · و <b>{metrics.cutoffLateCount}</b> بعده.</>,
        });
      }

      // Busiest route POL — POD
      const routeMap = {};
      list.forEach((r) => {
        const pol = (r.pol || '').trim();
        const pod = (r.pod || '').trim();
        if (pol && pod) {
          const key = `${pol} — ${pod}`;
          routeMap[key] = (routeMap[key] || 0) + 1;
        }
      });
      const sortedRoutes = Object.entries(routeMap).sort((a, b) => b[1] - a[1]);
      if (sortedRoutes.length > 0) {
        const [topRoute, rCount] = sortedRoutes[0];
        const rPct = Math.round((rCount / totalTrips) * 100);
        insights.push({
          id: 'export-route',
          textEn: <>Busiest route: <b>{topRoute}</b> with <b>{rPct}%</b> of the trips.</>,
          textAr: <>المسار الأكثر نشاطاً: <b>{topRoute}</b> بنسبة <b>{rPct}%</b> من الرحلات.</>,
        });
      }
    }

    // 11. Month-over-Month Growth / Trend
    const validMonths = monthData.filter((m) => m.label !== 'No data' && m.count > 0);
    if (validMonths.length >= 2) {
      const latest = validMonths[validMonths.length - 1];
      const prev = validMonths[validMonths.length - 2];
      const diff = latest.count - prev.count;
      const pct = prev.count > 0 ? Math.round((diff / prev.count) * 100) : 100;
      const sign = pct >= 0 ? '+' : '';
      const monthPrefix = latest.label.split(' ')[0];
      const fullEn = monthFullNamesEn[monthPrefix] || monthPrefix;
      const fullAr = monthFullNamesAr[monthPrefix] || monthPrefix;
      insights.push({
        id: 'mom-trend',
        textEn: <>Trips in <b>{fullEn}</b> are <b>{sign}{pct}%</b> vs the previous month.</>,
        textAr: <>رحلات شهر <b>{fullAr}</b> تغيرت بنسبة <b>{sign}{pct}%</b> مقارنة بالشهر السابق.</>,
      });
    }

    // 12. Data Quality / Data Gap Insight
    const hasGateOut = list.some((r) => !!r.gateOut || !!r.checkout);
    if (!hasGateOut) {
      insights.push({
        id: 'data-gap',
        textEn: <>Data gap: <b>CHECK Out From the Port</b> is empty in this file, so the related KPI cannot be calculated yet.</>,
        textAr: <>نقص بيانات: حقل <b>الخروج من الميناء (Check Out)</b> فارغ، لذا لم يتم احتساب مؤشر وقت العبور بعد.</>,
      });
    }

    return insights;
  }, [filteredData, metrics, monthData, isImport]);

  // 3.2 Shipping lines
  const lineData = useMemo(() => {
    const map = {};
    (filteredData || []).forEach((r) => {
      const name = r.line?.trim() || (lang === 'ar' ? 'أخرى' : 'Other');
      map[name] = (map[name] || 0) + 1;
    });
    const res = Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
    return res.length > 0 ? res : [{ name: 'No lines', count: 0 }];
  }, [filteredData, lang]);
  const maxLine = Math.max(...lineData.map((d) => d.count), 1);

  // 3.3 Daily trips smooth wave points with dynamic Left Y-Axis Scale
  const dailyScaleData = useMemo(() => {
    const map = {};
    (filteredData || []).forEach((r) => {
      const dStr = r.load || r.arrDate || r.reqDate || r.gateOut || r.createdAt;
      if (dStr) {
        const d = new Date(dStr);
        if (!isNaN(d.getTime())) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          const fullKey = `${y}-${m}-${day}`;
          const displayKey = `${day}.${m}`;
          if (!map[fullKey]) {
            map[fullKey] = { fullKey, displayKey, count: 0 };
          }
          map[fullKey].count++;
        }
      }
    });
    const sortedKeys = Object.keys(map).sort();
    if (sortedKeys.length === 0) return { maxScale: 10, ticks: [10, 5, 0], points: [] };

    // Display the most recent 18 active days
    const recentKeys = sortedKeys.slice(-18);
    const maxDayCount = Math.max(...recentKeys.map((k) => map[k].count), 1);
    const scale = getScaleTicks(maxDayCount);

    const leftPad = 20;
    const rightPad = 20;
    const plotH = 90;
    const plotW = 850 - leftPad - rightPad;

    const step = plotW / Math.max(1, recentKeys.length - 1);
    const points = recentKeys.map((k, idx) => {
      const { displayKey, count } = map[k];
      const x = Math.round(leftPad + idx * step);
      const y = Math.round(100 - Math.max(4, (count / scale.maxScale) * plotH));
      return { day: displayKey, x, y, count };
    });

    return { maxScale: scale.maxScale, ticks: scale.ticks, points };
  }, [filteredData]);

  const dailyPoints = dailyScaleData.points;
  const dailyScale = dailyScaleData;

  const { pathD, areaD } = useMemo(() => {
    if (dailyPoints.length === 0) return { pathD: '', areaD: '' };
    const baseY = 100;
    const leftX = 20;
    const rightX = 830;
    if (dailyPoints.length === 1) {
      const p = dailyPoints[0];
      return {
        pathD: `M ${leftX},${p.y} L ${rightX},${p.y}`,
        areaD: `M ${leftX},${p.y} L ${rightX},${p.y} L ${rightX},${baseY} L ${leftX},${baseY} Z`,
      };
    }
    const path = dailyPoints.reduce((acc, pt, i) => {
      if (i === 0) return `M ${pt.x},${pt.y}`;
      const prev = dailyPoints[i - 1];
      const cpX = (prev.x + pt.x) / 2;
      return `${acc} C ${cpX},${prev.y} ${cpX},${pt.y} ${pt.x},${pt.y}`;
    }, '');
    const first = dailyPoints[0];
    const last = dailyPoints[dailyPoints.length - 1];
    const area = `${path} L ${last.x},${baseY} L ${first.x},${baseY} Z`;
    return { pathD: path, areaD: area };
  }, [dailyPoints]);

  // 3.4 Trips by client
  const clientData = useMemo(() => {
    const map = {};
    const total = filteredData.length || 1;
    filteredData.forEach((r) => {
      const name = r.client?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData, lang]);
  const maxClient = Math.max(...clientData.map((d) => d.count), 1);

  // 3.5 Trips by trucker
  const truckerData = useMemo(() => {
    const map = {};
    const total = filteredData.length || 1;
    filteredData.forEach((r) => {
      const name = r.trucker?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData, lang]);
  const maxTrucker = Math.max(...truckerData.map((d) => d.count), 1);

  // 3.6 Demurrage risk by client (Import)
  const riskByClientData = useMemo(() => {
    if (!isImport) return [];
    const map = {};
    filteredData.forEach((r) => {
      const name = r.client?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      if (!map[name]) map[name] = { total: 0, late: 0 };
      map[name].total++;
      if (r.freeDays < 0 || r.risk === 'Late') map[name].late++;
    });
    return Object.entries(map)
      .map(([name, stat]) => {
        const pct = Math.round((stat.late / stat.total) * 100);
        return {
          name,
          pct,
          color: pct > 20 ? '#cf4d4d' : pct > 0 ? '#dd9a1f' : '#1f8f63',
        };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [filteredData, isImport, lang]);
  const maxRiskPct = Math.max(...riskByClientData.map((d) => d.pct), 1);

  // 3.7 Free-time usage buckets (Import)
  const freeUsageData = useMemo(() => {
    if (!isImport) return [];
    let pulledLate = 0;
    let sameDay = 0;
    let days12 = 0;
    let days35 = 0;
    let days6Plus = 0;

    filteredData.forEach((r) => {
      if (r.freeDays === null || r.freeDays === undefined) return;
      if (r.freeDays < 0) pulledLate++;
      else if (r.freeDays === 0) sameDay++;
      else if (r.freeDays <= 2) days12++;
      else if (r.freeDays <= 5) days35++;
      else days6Plus++;
    });

    return [
      { label: lang === 'ar' ? 'متأخر (Late)' : 'Pulled late', count: pulledLate, color: '#cf4d4d' },
      { label: lang === 'ar' ? 'نفس اليوم' : 'Same day', count: sameDay, color: '#66788c' },
      { label: lang === 'ar' ? 'باقي 1-2 يوم' : '1-2 days left', count: days12, color: '#d8a84a' },
      { label: lang === 'ar' ? 'باقي 3-5 أيام' : '3-5 days left', count: days35, color: '#22b8cf' },
      { label: lang === 'ar' ? 'باقي 6+ أيام' : '6+ days left', count: days6Plus, color: '#1f8f63' },
    ];
  }, [filteredData, isImport, lang]);
  const maxFreeCount = Math.max(...freeUsageData.map((d) => d.count), 1);

  // 3.8 Sites Data
  const siteData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const name = r.dest?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData, lang]);
  const maxSite = Math.max(...siteData.map((d) => d.count), 1);

  // 3.9 Destination Ports (POD)
  const portData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const name = r.pod?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      map[name] = (map[name] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredData, lang]);
  const maxPort = Math.max(...portData.map((d) => d.count), 1);

  // 3.10 Export Loading Sites & Routes & Status
  const loadingSitesData = siteData;
  const maxLoadSite = maxSite;

  const exportRoutesData = useMemo(() => {
    if (isImport) return [];
    const map = {};
    filteredData.forEach((r) => {
      if (r.pol && r.pod) {
        const key = r.pol.trim() + ' → ' + r.pod.trim();
        map[key] = (map[key] || 0) + 1;
      }
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredData, isImport]);
  const maxRoute = Math.max(...exportRoutesData.map((d) => d.count), 1);

  const exportStatusData = useMemo(() => {
    let delivered = 0;
    let open = 0;
    filteredData.forEach((r) => {
      if (String(r.status || '').toLowerCase() === 'delivered') delivered++;
      else open++;
    });
    const total = filteredData.length || 1;
    return [
      { name: 'Delivered', count: delivered, pct: Math.round((delivered / total) * 100), color: '#1f8f63' },
      { name: 'Open / In transit', count: open, pct: Math.round((open / total) * 100), color: '#0b4f7a' },
    ];
  }, [filteredData]);

  // 3.11 Required vs actual arrival (OFF_BUCKETS)
  const offDelayBuckets = useMemo(() => {
    let early = 0;
    let onTime = 0;
    let late06 = 0;
    let late624 = 0;
    let late24Plus = 0;

    filteredData.forEach((r) => {
      if (r.arrDelayH === null || r.arrDelayH === undefined) return;
      const h = r.arrDelayH;
      if (h < -6) early++;
      else if (h <= 6) onTime++;
      else if (h <= 24) late624++;
      else late24Plus++;
    });

    return [
      { label: lang === 'ar' ? 'مبكر (>6 س)' : 'Early (>6h)', count: early, color: '#1f8f63' },
      { label: lang === 'ar' ? 'في الموعد (±6 س)' : 'On time (±6h)', count: onTime, color: '#54b083' },
      { label: lang === 'ar' ? 'تأخير 0–6 س' : 'Late 0–6h', count: late06, color: '#dd9a1f' },
      { label: lang === 'ar' ? 'تأخير 6–24 س' : 'Late 6–24h', count: late624, color: '#e07b3a' },
      { label: lang === 'ar' ? 'تأخير >24 س' : 'Late >24h', count: late24Plus, color: '#cf4d4d' },
    ];
  }, [filteredData, lang]);
  const maxOffDelay = Math.max(...offDelayBuckets.map((b) => b.count), 1);

  // 3.12 Delay share by trucker
  const delayTruckerData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const t = r.trucker?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      if (!map[t]) map[t] = { total: 0, late: 0 };
      map[t].total++;
      if (r.arrDelayH > 0) map[t].late++;
    });
    return Object.entries(map)
      .filter(([_, stat]) => stat.total >= 1)
      .map(([name, stat]) => {
        const pct = +(stat.late / stat.total * 100).toFixed(1);
        return {
          name,
          pct,
          late: stat.late,
          total: stat.total,
          color: pct > 25 ? '#cf4d4d' : pct > 10 ? '#dd9a1f' : '#1f8f63',
        };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 8);
  }, [filteredData, lang]);
  const maxDelayPct = Math.max(...delayTruckerData.map((d) => d.pct), 1);

  // 3.13 Operations staff workload
  const staffData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const op = r.oper?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      map[op] = (map[op] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredData, lang]);

  const maxStaff = Math.max(...staffData.map((s) => s.count), 1);

  // 3.14 Trucker coverage
  const truckerCoverageData = useMemo(() => {
    const map = {};
    filteredData.forEach((r) => {
      const t = r.trucker?.trim() || (lang === 'ar' ? 'غير محدد' : 'Unknown');
      if (!map[t]) map[t] = new Set();
      if (r.client) map[t].add(r.client.trim());
    });
    return Object.entries(map)
      .map(([name, clientSet]) => ({ name, count: clientSet.size }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [filteredData, lang]);
  const maxCoverage = Math.max(...truckerCoverageData.map((t) => t.count), 1);

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
              {(options.clients.length > 0 ? options.clients : MASTER_DEFAULTS.client).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'مقاول النقل (Transporter)' : 'Transporter'}</label>
            <select value={fTrucker} onChange={(e) => setFTrucker(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل المقاولين' : 'All transporters'}</option>
              {(options.truckers.length > 0 ? options.truckers : MASTER_DEFAULTS.trucker).map((t) => (
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
              {(options.sites.length > 0 ? options.sites : (isImport ? MASTER_DEFAULTS.dest : ['10OF RAMDAN', 'EL SADAT', 'OCTOBER', 'BORG EL ARAB', 'SUEZ'])).map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Container filter (New) */}
          <div className="fld">
            <label>{lang === 'ar' ? 'نوع الحاوية (Container)' : 'Container'}</label>
            <select value={fSize} onChange={(e) => setFSize(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل المقاسات' : 'All containers'}</option>
              {(options.sizes.length > 0 ? options.sizes : ["20'", "40'", "40' HC", "LCL"]).map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Operations staff filter (New) */}
          <div className="fld">
            <label>{lang === 'ar' ? 'فريق العمليات (Operations staff)' : 'Operations staff'}</label>
            <select value={fOper} onChange={(e) => setFOper(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الفريق' : 'All staff'}</option>
              {(options.opers.length > 0 ? options.opers : MASTER_DEFAULTS.oper).map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="fld">
            <label>{lang === 'ar' ? 'الخط الملاحي (Shipping line)' : 'Shipping line'}</label>
            <select value={fLine} onChange={(e) => setFLine(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الخطوط' : 'All lines'}</option>
              {(options.lines.length > 0 ? options.lines : MASTER_DEFAULTS.line).map((l) => (
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
                {(options.pols.length > 0 ? options.pols : ['ALEXANDRIA', 'DAMIETTA', 'PORT SAID', 'SOKHNA']).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          )}

          <div className="fld">
            <label>{lang === 'ar' ? 'ميناء الوصول (POD)' : 'POD'}</label>
            <select value={fPort} onChange={(e) => setFPort(e.target.value)}>
              <option value="">{lang === 'ar' ? 'كل الموانئ' : 'All ports'}</option>
              {(options.pods.length > 0 ? options.pods : (isImport ? MASTER_DEFAULTS.pod : ['BARCELONA', 'BEIRUT', 'JEDDAH', 'TANGER MED', 'GENOVA', 'SINGAPORE'])).map((p) => (
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
              <div className="k-val">{metrics.totalTrips}</div>
              <div className="k-sub">{metrics.totalTrips} {lang === 'ar' ? 'رحلة وارد' : 'import trips'}</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📦</span><span className="k-label">{lang === 'ar' ? 'الحاويات' : 'Containers'}</span></div>
              <div className="k-val">{metrics.totalTrips}</div>
              <div className="k-sub">{metrics.count40 + metrics.count40HC} × 40' ({metrics.pct40}%) · {metrics.count20} × 20' ({metrics.pct20}%)</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">🏭</span><span className="k-label">{lang === 'ar' ? 'العملاء' : 'Clients served'}</span></div>
              <div className="k-val">{metrics.clientsCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'عبر ' + metrics.sitesCount + ' موقع' : 'across ' + metrics.sitesCount + ' sites'}</div>
            </div>

            <div className="kpi sand">
              <div className="k-top"><span className="k-ico">🤝</span><span className="k-label">{lang === 'ar' ? 'المقاولون' : 'Truckers used'}</span></div>
              <div className="k-val">{metrics.truckersCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'أكبر 3 ينقلون ' + metrics.top3TruckersPct + '%' : 'top 3 carry ' + metrics.top3TruckersPct + '% of trips'}</div>
            </div>

            <div className="kpi bad">
              <div className="k-top"><span className="k-ico">⚠️</span><span className="k-label">{lang === 'ar' ? 'مخاطر الأرضيات' : 'Demurrage risk'}</span></div>
              <div className="k-val text-rose-600">{metrics.demurragePct}%</div>
              <div className="k-sub">{metrics.demurrageLateCount} {lang === 'ar' ? 'رحلة متأخرة عن السماح' : 'trips with late free time'}</div>
            </div>

            <div className="kpi good">
              <div className="k-top"><span className="k-ico">🕓</span><span className="k-label">{lang === 'ar' ? 'فترة السماح المتبقية' : 'Free time left'}</span></div>
              <div className="k-val text-emerald-700">{metrics.freeDaysAvg} d</div>
              <div className="k-sub">{lang === 'ar' ? 'متوسط الأيام المتبقية في السماح' : 'avg days between activity date and free time end'}</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">👥</span><span className="k-label">{lang === 'ar' ? 'فريق العمليات' : 'Operations staff'}</span></div>
              <div className="k-val">{metrics.opStaffCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'أكثرهم نشاطاً يدير ' + metrics.busiestStaffPct + '%' : 'busiest handles ' + metrics.busiestStaffPct + '% of trips'}</div>
            </div>

            <div className="kpi warn">
              <div className="k-top"><span className="k-ico">🚚</span><span className="k-label">{lang === 'ar' ? 'السيارات المستخدمة' : 'Trucks used'}</span></div>
              <div className="k-val text-amber-600">{metrics.trucksCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'متوسط ' + metrics.avgTripsPerTruck + ' رحلة لكل سيارة' : metrics.avgTripsPerTruck + ' trips per truck on average'}</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">📄</span><span className="k-label">{lang === 'ar' ? 'الشحنات' : 'Shipments'}</span></div>
              <div className="k-val">{metrics.shipmentsCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'متوسط ' + metrics.avgTripsPerShipment + ' رحلة لكل شحنة' : metrics.avgTripsPerShipment + ' trips per shipment on avg'}</div>
            </div>

            <div className="kpi good">
              <div className="k-top"><span className="k-ico">🎯</span><span className="k-label">{lang === 'ar' ? 'الوصول في الموعد' : 'Arrived on time'}</span></div>
              <div className="k-val text-emerald-700">{metrics.arrivedOnTimePct !== null ? metrics.arrivedOnTimePct + '%' : '–'}</div>
              <div className="k-sub">{metrics.arrivedTotalCount > 0 ? (lang === 'ar' ? 'من إجمالي ' + metrics.arrivedTotalCount + ' تم وصولها' : 'from ' + metrics.arrivedTotalCount + ' arrived') : (lang === 'ar' ? 'لا توجد تواريخ وصول مسجلة بعد' : 'no actual arrive dates yet')}</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⏱️</span><span className="k-label">{lang === 'ar' ? 'تأخير الوصول' : 'Arrival delay'}</span></div>
              <div className="k-val">{metrics.avgDelayHours !== null ? metrics.avgDelayHours + ' h' : '–'}</div>
              <div className="k-sub">{metrics.delayCount > 0 ? (lang === 'ar' ? metrics.delayCount + ' رحلة متأخرة' : metrics.delayCount + ' delayed trips') : (lang === 'ar' ? 'لا يوجد تأخير مسجل' : 'no actual arrive delay yet')}</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">🛣️</span><span className="k-label">{lang === 'ar' ? 'زمن النقل' : 'Gate → site transit'}</span></div>
              <div className="k-val">{metrics.avgTransitHours !== null ? metrics.avgTransitHours + ' h' : '–'}</div>
              <div className="k-sub">{metrics.transitPairsCount > 0 ? (lang === 'ar' ? 'متوسط ' + metrics.transitPairsCount + ' رحلة' : 'across ' + metrics.transitPairsCount + ' trips') : (lang === 'ar' ? 'في انتظار اكتمال التواريخ' : 'no gate out + arrive pairs yet')}</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📍</span><span className="k-label">{lang === 'ar' ? 'وجهات التعتيق' : 'Destinations'}</span></div>
              <div className="k-val">{metrics.destCount}</div>
              <div className="k-sub">{metrics.topDestName} ({metrics.topDestPct}%)</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⚓</span><span className="k-label">{lang === 'ar' ? 'ميناء الوصول' : 'Ports (POD)'}</span></div>
              <div className="k-val">{metrics.portsCount}</div>
              <div className="k-sub">{metrics.topPodName} ({metrics.topPodPct}%)</div>
            </div>
          </>
        ) : (
          <>
            {/* Export KPI Cards */}
            <div className="kpi">
              <div className="k-top"><span className="k-ico">🚛</span><span className="k-label">{lang === 'ar' ? 'رحلات النقل' : 'Truck trips'}</span></div>
              <div className="k-val">{metrics.totalTrips}</div>
              <div className="k-sub">{metrics.totalTrips} {lang === 'ar' ? 'رحلة صادر' : 'export trips'}</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📦</span><span className="k-label">{lang === 'ar' ? 'الحاويات' : 'Containers'}</span></div>
              <div className="k-val">{metrics.totalTrips}</div>
              <div className="k-sub">{metrics.count40 + metrics.count40HC} × 40' ({metrics.pct40}%) · {metrics.count20} × 20' ({metrics.pct20}%)</div>
              <div className="spark"><i></i><i></i><i></i><i></i><i></i></div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">🏭</span><span className="k-label">{lang === 'ar' ? 'العملاء' : 'Clients served'}</span></div>
              <div className="k-val">{metrics.clientsCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'عبر ' + metrics.sitesCount + ' موقع' : 'across ' + metrics.sitesCount + ' sites'}</div>
            </div>

            <div className="kpi sand">
              <div className="k-top"><span className="k-ico">🤝</span><span className="k-label">{lang === 'ar' ? 'المقاولون' : 'Truckers used'}</span></div>
              <div className="k-val">{metrics.truckersCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'أكبر 3 ينقلون ' + metrics.top3TruckersPct + '%' : 'top 3 carry ' + metrics.top3TruckersPct + '% of trips'}</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">👥</span><span className="k-label">{lang === 'ar' ? 'فريق العمليات' : 'Operations staff'}</span></div>
              <div className="k-val">{metrics.opStaffCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'أكثرهم نشاطاً يدير ' + metrics.busiestStaffPct + '%' : 'busiest handles ' + metrics.busiestStaffPct + '% of trips'}</div>
            </div>

            <div className="kpi warn">
              <div className="k-top"><span className="k-ico">🚚</span><span className="k-label">{lang === 'ar' ? 'السيارات المستخدمة' : 'Trucks used'}</span></div>
              <div className="k-val text-amber-600">{metrics.trucksCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'متوسط ' + metrics.avgTripsPerTruck + ' رحلة لكل سيارة' : metrics.avgTripsPerTruck + ' trips per truck on average'}</div>
            </div>

            <div className="kpi bad">
              <div className="k-top"><span className="k-ico">⏰</span><span className="k-label">{lang === 'ar' ? 'مهلة Cut-off' : 'Cut-off buffer'}</span></div>
              <div className="k-val text-rose-600">{metrics.cutoffBufferAvg} d</div>
              <div className="k-sub">{metrics.cutoffCount > 0 ? (lang === 'ar' ? metrics.cutoffLateCount + ' من ' + metrics.cutoffCount + ' بعد الـ Cut-off' : metrics.cutoffLateCount + ' of ' + metrics.cutoffCount + ' after the cut-off') : (lang === 'ar' ? 'لا توجد تواريخ Cut-off مسجلة' : 'no cut-off dates yet')}</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">📄</span><span className="k-label">{lang === 'ar' ? 'الشحنات' : 'Shipments'}</span></div>
              <div className="k-val">{metrics.shipmentsCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'متوسط ' + metrics.avgTripsPerShipment + ' رحلة لكل شحنة' : metrics.avgTripsPerShipment + ' trips per shipment on avg'}</div>
            </div>

            <div className="kpi good">
              <div className="k-top"><span className="k-ico">🎯</span><span className="k-label">{lang === 'ar' ? 'الوصول في الموعد' : 'Arrived on time'}</span></div>
              <div className="k-val text-emerald-700">{metrics.arrivedOnTimePct !== null ? metrics.arrivedOnTimePct + '%' : '–'}</div>
              <div className="k-sub">{metrics.arrivedTotalCount > 0 ? (lang === 'ar' ? 'من إجمالي ' + metrics.arrivedTotalCount + ' تم وصولها' : 'from ' + metrics.arrivedTotalCount + ' arrived') : (lang === 'ar' ? 'لا توجد تواريخ وصول مسجلة بعد' : 'no actual arrive dates yet')}</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⏱️</span><span className="k-label">{lang === 'ar' ? 'تأخير الوصول' : 'Arrival delay'}</span></div>
              <div className="k-val">{metrics.avgDelayHours !== null ? metrics.avgDelayHours + ' h' : '–'}</div>
              <div className="k-sub">{metrics.delayCount > 0 ? (lang === 'ar' ? metrics.delayCount + ' رحلة متأخرة' : metrics.delayCount + ' delayed trips') : (lang === 'ar' ? 'لا يوجد تأخير مسجل' : 'no actual arrive delay yet')}</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">🛣️</span><span className="k-label">{lang === 'ar' ? 'زمن النقل' : 'Gate → site transit'}</span></div>
              <div className="k-val">{metrics.avgTransitHours !== null ? metrics.avgTransitHours + ' h' : '–'}</div>
              <div className="k-sub">{metrics.transitPairsCount > 0 ? (lang === 'ar' ? 'متوسط ' + metrics.transitPairsCount + ' رحلة' : 'across ' + metrics.transitPairsCount + ' trips') : (lang === 'ar' ? 'في انتظار اكتمال التواريخ' : 'no gate out + arrive pairs yet')}</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">📍</span><span className="k-label">{lang === 'ar' ? 'الوجهات' : 'Destinations'}</span></div>
              <div className="k-val">{metrics.destCount}</div>
              <div className="k-sub">{metrics.topDestName} ({metrics.topDestPct}%)</div>
            </div>

            <div className="kpi">
              <div className="k-top"><span className="k-ico">⚓</span><span className="k-label">{lang === 'ar' ? 'ميناء الوصول' : 'Ports (POD)'}</span></div>
              <div className="k-val">{metrics.portsCount}</div>
              <div className="k-sub">{metrics.topPodName} ({metrics.topPodPct}%)</div>
            </div>

            <div className="kpi aqua">
              <div className="k-top"><span className="k-ico">🛣️</span><span className="k-label">{lang === 'ar' ? 'المسارات' : 'Routes'}</span></div>
              <div className="k-val">{metrics.routesCount}</div>
              <div className="k-sub">{lang === 'ar' ? 'إلى ' + metrics.portsCount + ' موانئ وصول' : 'to ' + metrics.portsCount + ' destination ports'}</div>
            </div>
          </>
        )}
      </div>

      {/* 2.5 Dynamic Auto-Insights Banner (Import & Export) */}
      {autoInsights.length > 0 && (
        <div className="insights">
          <h3>
            {lang === 'ar'
              ? (isImport ? 'رؤى تلقائية — الوارد' : 'رؤى تلقائية — الصادر')
              : (isImport ? 'Auto Insights — Import' : 'Auto Insights — Export')}
          </h3>
          <div className="sub">
            {lang === 'ar' ? 'تم توليدها تلقائياً من البيانات المفلترة' : 'Generated from the filtered data'}
          </div>
          <ul>
            {autoInsights.map((item) => (
              <li key={item.id}>
                {lang === 'ar' ? item.textAr : item.textEn}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ================= EXACT CHARTS SUITE ================= */}

      {/* Row 1: Trips by month (s8) & Shipping lines (s4) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Trips by month */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-8 overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-teal-600"></span>
                {lang === 'ar' ? 'الرحلات شهرياً' : 'Trips by month'}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                {lang === 'ar' ? 'متابعة الرحلات حسب شهر تاريخ النشاط' : 'Track trips by Activity date month — click a month to focus'}
              </p>
            </div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
              {lang === 'ar' ? 'رحلات' : 'Trips'}
            </span>
          </div>

          <div className="flex items-stretch h-44 w-full gap-2 select-none">
            {/* Left Y-Axis Scale (Crisp HTML Typography, zero overlap) */}
            <div className="w-10 shrink-0 flex flex-col justify-between text-right pb-6 pt-1 text-[10px] font-bold text-slate-400">
              {monthScale.ticks.map((t) => (
                <span key={t} className="leading-none">{t}</span>
              ))}
            </div>

            {/* Plot Area with background grid lines and bars */}
            <div className="flex-1 relative pb-6 pt-1">
              {/* Horizontal Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-6 pt-1 pointer-events-none">
                {monthScale.ticks.map((t, idx) => (
                  <div
                    key={t}
                    className={`w-full ${idx === monthScale.ticks.length - 1 ? 'border-b border-slate-300' : 'border-b border-dashed border-slate-100'}`}
                  />
                ))}
              </div>

              {/* Bars */}
              <div className="absolute inset-x-0 bottom-6 top-1 flex items-end justify-around px-8 z-10">
                {monthData.map((m) => {
                  const barHeightPct = Math.min(100, Math.max(4, (m.count / monthScale.maxScale) * 100));
                  return (
                    <div key={m.label} className="flex flex-col items-center group cursor-pointer">
                      <span className="text-[11px] font-bold text-slate-700 mb-1.5 transition-transform group-hover:scale-110">
                        {m.count}
                      </span>
                      <div
                        className="w-14 rounded-t-md bg-[#0b4f7a] transition-all group-hover:bg-[#0e7c86] shadow-sm"
                        style={{ height: `${barHeightPct}%` }}
                      />
                      <span className="absolute -bottom-5 text-xs font-semibold text-slate-500 whitespace-nowrap">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
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

      {/* Row 2: Daily trips */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-teal-600"></span>
              {lang === 'ar' ? 'الرحلات اليومية' : 'Daily trips'}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {lang === 'ar' ? 'حسب تاريخ النشاط — اضغط على نقطة للفلترة' : 'By Activity date — click a point to filter'}
            </p>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 border border-slate-200 px-2 py-0.5 rounded">
            {lang === 'ar' ? 'رحلات' : 'Trips'}
          </span>
        </div>

        {dailyPoints.length === 0 ? (
          <div className="flex items-center justify-center h-36 text-xs text-slate-400">
            {lang === 'ar' ? 'لا توجد بيانات حركة يومية في هذا النطاق' : 'No daily activity in this range'}
          </div>
        ) : (
          <div className="flex items-stretch h-36 w-full gap-2 select-none">
            {/* Left Y-Axis Scale */}
            <div className="w-10 shrink-0 flex flex-col justify-between text-right pb-6 pt-1 text-[10px] font-bold text-slate-400">
              {dailyScale.ticks.map((t) => (
                <span key={t} className="leading-none">{t}</span>
              ))}
            </div>

            {/* Plot Area */}
            <div className="flex-1 relative pb-6 pt-1">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pb-6 pt-1 pointer-events-none">
                {dailyScale.ticks.map((t, idx) => (
                  <div
                    key={t}
                    className={`w-full ${idx === dailyScale.ticks.length - 1 ? 'border-b border-slate-300' : 'border-b border-dashed border-slate-100'}`}
                  />
                ))}
              </div>

              {/* Wave SVG Area */}
              <div className="absolute inset-x-0 bottom-6 top-1">
                <svg className="w-full h-full block" viewBox="0 0 850 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="waveCyanGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22b8cf" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#22b8cf" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>
                  <path d={areaD} fill="url(#waveCyanGrad)" />
                  <path d={pathD} fill="none" stroke="#0e7c86" strokeWidth="2.5" />
                  {dailyPoints.map((pt, i) => (
                    <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#0e7c86" stroke="#fff" strokeWidth="1.5" />
                  ))}
                </svg>
              </div>

              {/* Dates row below baseline */}
              <div className="absolute -bottom-5 inset-x-0 flex justify-between text-[10px] font-medium text-slate-400 px-2">
                {dailyPoints.map((pt) => (
                  <span key={pt.day}>{pt.day}</span>
                ))}
              </div>
            </div>
          </div>
        )}
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
                      width: `${Math.round((c.count / maxClient) * 100)}%`,
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
                      width: `${Math.round((t.count / maxTrucker) * 100)}%`,
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
                    style={{ height: `${Math.max(6, Math.round((item.pct / maxRiskPct) * 110))}px`, backgroundColor: item.color }}
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
                    style={{ height: `${Math.max(6, Math.round((item.count / maxFreeCount) * 110))}px`, backgroundColor: item.color }}
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
                    style={{ height: `${Math.max(10, Math.round((p.count / maxPort) * 110))}px` }}
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
                    style={{ height: `${Math.max(10, Math.round((p.count / maxPort) * 100))}px` }}
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
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#1f8f63" strokeWidth="5" pathLength="100" strokeDasharray={`${exportStatusData[0]?.pct || 0} 100`} />
                  <circle cx="18" cy="18" r="14" fill="none" stroke="#0b4f7a" strokeWidth="5" pathLength="100" strokeDasharray={`${exportStatusData[1]?.pct || 0} 100`} strokeDashoffset={`-${exportStatusData[0]?.pct || 0}`} />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-slate-800">{metrics.totalTrips}</span>
                  <span className="text-[9px] text-slate-400">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
                </div>
              </div>

              <div className="flex items-center gap-6 mt-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <i className="h-2.5 w-2.5 rounded-full bg-emerald-600"></i> Delivered ({exportStatusData[0]?.pct || 0}%)
                </span>
                <span className="flex items-center gap-1.5 text-sky-800">
                  <i className="h-2.5 w-2.5 rounded-full bg-[#0b4f7a]"></i> Open ({exportStatusData[1]?.pct || 0}%)
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
          <p className="text-[11px] text-slate-400 mb-4">
            {isImport
              ? (lang === 'ar' ? 'الوصول الفعلي مقابل تاريخ ووقت التعتيق المطلوب' : 'Actual arrival against required offloading date and time')
              : (lang === 'ar' ? 'الوصول الفعلي مقابل تاريخ ووقت التحميل المطلوب' : 'Actual arrival against required loading date and time')}
          </p>

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
                <circle cx="18" cy="18" r="14" fill="none" stroke="#1f8f63" strokeWidth="5" pathLength="100" strokeDasharray={`${metrics.arrivedOnTimePct !== null ? metrics.arrivedOnTimePct : 0} 100`} />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#cf4d4d" strokeWidth="5" pathLength="100" strokeDasharray={`${metrics.arrivedOnTimePct !== null ? (100 - metrics.arrivedOnTimePct) : 0} 100`} strokeDashoffset={`-${metrics.arrivedOnTimePct !== null ? metrics.arrivedOnTimePct : 0}`} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-slate-800">{metrics.arrivedOnTimePct !== null ? `${metrics.arrivedOnTimePct}%` : '–'}</span>
                <span className="text-[9px] text-slate-400">{lang === 'ar' ? 'في الموعد' : 'On time'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <i className="h-2.5 w-2.5 rounded-full bg-emerald-600"></i> {lang === 'ar' ? `في الموعد (${Math.max(0, metrics.arrivedTotalCount - metrics.delayCount)})` : `On time (${Math.max(0, metrics.arrivedTotalCount - metrics.delayCount)})`}
              </span>
              <span className="flex items-center gap-1.5 text-rose-700">
                <i className="h-2.5 w-2.5 rounded-full bg-rose-600"></i> {lang === 'ar' ? `متأخر (${metrics.delayCount})` : `Late (${metrics.delayCount})`}
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

        <div className={`h-36 flex items-end border-b border-slate-200 pb-2 px-6 gap-6 ${delayTruckerData.length <= 4 ? 'justify-center gap-16' : 'justify-between'}`}>
          {delayTruckerData.map((d) => (
            <div key={d.name} className="flex flex-col items-center gap-1.5 min-w-[70px]">
              <span className="text-[11px] font-bold text-slate-700">{d.pct}%</span>
              <div
                className="w-10 rounded-t-sm transition-all duration-300"
                style={{
                  height: `${Math.max(4, Math.round((d.pct / maxDelayPct) * 90))}px`,
                  backgroundColor: d.color,
                }}
              />
              <span className="text-[10px] font-medium text-slate-600 truncate max-w-[120px] text-center" title={d.name}>{d.name}</span>
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
                <circle cx="18" cy="18" r="14" fill="none" stroke="#0b4f7a" strokeWidth="5" pathLength="100" strokeDasharray={`${metrics.pct40} 100`} />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#22b8cf" strokeWidth="5" pathLength="100" strokeDasharray={`${metrics.pct20} 100`} strokeDashoffset={`-${metrics.pct40}`} />
                <circle cx="18" cy="18" r="14" fill="none" stroke="#8fd9e6" strokeWidth="5" pathLength="100" strokeDasharray={`${Math.max(0, 100 - metrics.pct40 - metrics.pct20)} 100`} strokeDashoffset={`-${metrics.pct40 + metrics.pct20}`} />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-sm font-black text-slate-800">{metrics.totalTrips}</span>
                <span className="text-[9px] text-slate-400">{lang === 'ar' ? 'الإجمالي' : 'Total'}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs font-semibold text-slate-600">
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#0b4f7a]"></i> 40' ({metrics.pct40}%)</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#22b8cf]"></i> 20' ({metrics.pct20}%)</span>
              <span className="flex items-center gap-1"><i className="h-2.5 w-2.5 rounded-full bg-[#8fd9e6]"></i> LCL ({Math.max(0, 100 - metrics.pct40 - metrics.pct20)}%)</span>
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
                  style={{ height: `${Math.round((st.count / maxStaff) * 110)}px` }}
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

        <div className={`h-36 flex items-end border-b border-slate-200 pb-2 px-8 gap-6 ${truckerCoverageData.length <= 4 ? 'justify-center gap-20' : 'justify-between'}`}>
          {truckerCoverageData.map((tc) => (
            <div key={tc.name} className="flex flex-col items-center gap-2 min-w-[80px]">
              <span className="text-xs font-bold text-slate-700">{tc.count}</span>
              <div
                className="w-10 rounded-t-sm bg-[#0e7c86]"
                style={{ height: `${Math.round((tc.count / maxCoverage) * 90)}px` }}
              />
              <span className="text-[10px] font-medium text-slate-600 truncate max-w-[140px] text-center" title={tc.name}>{tc.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
