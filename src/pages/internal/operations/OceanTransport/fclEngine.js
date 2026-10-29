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
  // Import candidates: Open status, has a container number
  const imported = rows.filter((r) =>
    r.dir === 'Import' &&
    String(r.cntr || '').trim() &&
    !/^\(/.test(r.cntr) &&
    String(r.status || 'Open').trim().toLowerCase() === 'open'
  );

  // Export candidates: Has required loading date
  const exported = rows.filter((r) =>
    r.dir === 'Export' &&
    r.reqDate &&
    String(r.status || 'Open').trim().toLowerCase() === 'open'
  );

  const rowKey = (r, dir, idx) =>
    `${dir}|${r._ref || ''}|${idx}|${fclNorm(r.cntr)}|${fclNorm(r.bl || r.booking)}`;

  const usedImports = new Set();
  const usedExports = new Set();
  const matches = [];

  for (let i = 0; i < imported.length; i++) {
    const im = imported[i];
    const imKey = rowKey(im, 'Import', i);
    if (usedImports.has(imKey)) continue;

    for (let j = 0; j < exported.length; j++) {
      const ex = exported[j];
      const exKey = rowKey(ex, 'Export', j);
      if (usedExports.has(exKey)) continue;

      const score = fclEvaluate(im, ex);
      if (!score.recommended && !score.isNearMatch) continue;

      const pairKey = `${fclNorm(im.cntr)}|${fclNorm(im.bl)}|${fclNorm(ex.booking)}`;
      const isApproved = approvals.has(pairKey);

      matches.push({
        id: `fcl_${i}_${j}`,
        pairKey,
        im,
        ex,
        score,
        isApproved,
      });

      if (score.recommended) {
        usedImports.add(imKey);
        usedExports.add(exKey);
        break; // Match found for this import container
      }
    }
  }

  return matches;
};
