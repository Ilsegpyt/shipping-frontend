// FCL Engine — Recommendation and Matching for Container Reuse
import { normTime } from './tptEngine';

export const FCL_RULE_KEYS = ['free', 'line', 'port', 'lead', 'size', 'dest'];

const fclNorm = (v) => String(v || '').trim().toLocaleUpperCase().replace(/\s+/g, ' ');

const fclAt = (day, time) => {
  if (!day) return null;
  const d = new Date(`${day}T${normTime(time) || '00:00'}:00`);
  return Number.isFinite(d.getTime()) ? d.getTime() : null;
};

export const fclEvaluate = (im, ex) => {
  const exReq = fclAt(ex.reqDate, ex.reqTime);
  const imReq = fclAt(im.reqDate, im.reqTime);
  const freeEnd = im.free ? fclAt(im.free, '23:59') : null;

  const freeMarginH = (freeEnd !== null && exReq !== null) ? (freeEnd - exReq) / 36e5 : null;
  const leadH = (imReq !== null && exReq !== null) ? (exReq - imReq) / 36e5 : null;

  const checks = {
    free: freeMarginH !== null && freeMarginH >= 48,
    line: !!fclNorm(im.line) && fclNorm(im.line) === fclNorm(ex.line),
    port: !!fclNorm(im.pod) && fclNorm(im.pod) === fclNorm(ex.pol),
    lead: leadH !== null && leadH >= 24,
    size: !!fclNorm(im.size) && fclNorm(im.size) === fclNorm(ex.size),
    dest: !!fclNorm(im.dest) && fclNorm(im.dest) === fclNorm(ex.dest),
  };

  const passed = FCL_RULE_KEYS.filter((k) => checks[k]).length;
  return {
    checks,
    passed,
    recommended: passed === 6,
    isNearMatch: passed === 5,
    freeMarginH: freeMarginH !== null ? Math.round(freeMarginH) : null,
    leadH: leadH !== null ? Math.round(leadH) : null,
  };
};

export const fclCandidates = (rows = [], approvals = new Set()) => {
  const normApprovals = new Set();
  (approvals || []).forEach((a) => {
    if (typeof a === 'string') {
      normApprovals.add(a.toLowerCase());
      normApprovals.add(a.toUpperCase());
    } else if (a) {
      normApprovals.add(String(a));
    }
  });

  // An import container is approved ONLY if it was approved under the exact same M/BL (or exact container ID)
  // If the same physical container arrives later with a DIFFERENT M/BL, it is considered a new trip and allowed!
  const isContainerApproved = (r) => {
    if (!r) return false;
    if (r._containerId && (normApprovals.has(String(r._containerId).toLowerCase()) || normApprovals.has(String(r._containerId)))) return true;

    const cntrNorm = fclNorm(r.cntr);
    const blNorm = fclNorm(r.bl);
    if (!cntrNorm) return false;

    // Check exact CNTR|MBL key
    if (blNorm) {
      const cntrBlKey = `${cntrNorm}|${blNorm}`;
      if (normApprovals.has(cntrBlKey) || normApprovals.has(cntrBlKey.toLowerCase())) return true;

      // Check backend approval key pattern: CNTR|MBL|BOOKING
      const prefix = `${cntrNorm}|${blNorm}|`;
      for (const a of normApprovals) {
        if (typeof a === 'string' && a.toUpperCase().startsWith(prefix)) {
          return true;
        }
      }
    }

    return false;
  };

  // Import candidates: Open status, has a container number, and not already approved in FclApprovals
  const imported = rows.filter((r) =>
    r.dir === 'Import' &&
    String(r.cntr || '').trim() &&
    !/^\(/.test(r.cntr) &&
    String(r.status || 'Open').trim().toLowerCase() === 'open' &&
    !isContainerApproved(r)
  );

  // Export candidates: Has required loading date, Open status, and doesn't already have an assigned container
  const exported = rows.filter((r) =>
    r.dir === 'Export' &&
    r.reqDate &&
    String(r.status || 'Open').trim().toLowerCase() === 'open' &&
    !String(r.cntr || '').trim()
  );

  const seenPairs = new Set();
  const matches = [];

  for (let i = 0; i < imported.length; i++) {
    const im = imported[i];

    for (let j = 0; j < exported.length; j++) {
      const ex = exported[j];

      const score = fclEvaluate(im, ex);
      if (!score.recommended && !score.isNearMatch) continue;

      const slotKey = ex._containerId || ex._rowId || ex.ordinal || `slot_${j}`;
      const pairKey = `${fclNorm(im.cntr)}|${fclNorm(im.bl)}|${fclNorm(ex.booking)}|${slotKey}`;
      if (seenPairs.has(pairKey)) continue;
      seenPairs.add(pairKey);

      const isApproved = normApprovals.has(pairKey) || normApprovals.has(pairKey.toLowerCase());
      if (isApproved) continue; // Don't show approved suggestions again

      matches.push({
        id: `fcl_${i}_${j}`,
        pairKey,
        im,
        ex,
        score,
        isApproved: false,
      });
      // Do NOT break! Show all matching export opportunities for this import container
      // so the operations specialist can choose the best one.
    }
  }

  return matches;
};
