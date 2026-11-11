/**
 * In-browser implementation of the ILS_API contract, persisted in localStorage.
 * Use it to develop the host integration before the backend exists, or as a
 * reference for what each endpoint must return. Not for production.
 */
const STORE_KEY = 'ftl-airport-mock-workspace';
const wait = (ms = 150) => new Promise((r) => setTimeout(r, ms));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));
const pad = (n) => String(n).padStart(4, '0');
const nowHM = () => new Date().toTimeString().slice(0, 5);
const today = () => new Date().toISOString().slice(0, 10);

const SEED_WORKSPACE = {
  version: 1,
  seq: 0,
  shipments: [],
};

export function createMockApi({
  user = { id: 'user-1', displayName: 'Demo user' },
  permissions = { reopen_shipments: true, delete_shipments: true },
  master = {},              // e.g. { client: ['ACME', ...] } overrides the built-in lists
  storage = window.localStorage,
  latency = 150,
} = {}) {
  // One-time automatic reset of old test data from previous runs
  try {
    if (!storage.getItem('ftl-airport-clean-v5')) {
      storage.removeItem(STORE_KEY);
      storage.setItem(STORE_KEY, JSON.stringify(SEED_WORKSPACE));
      storage.setItem('ftl-airport-clean-v5', 'true');
    }
  } catch {
    // ignore
  }

  const read = () => {
    try {
      const data = JSON.parse(storage.getItem(STORE_KEY));
      if (data && Array.isArray(data.shipments)) {
        return data;
      }
      return SEED_WORKSPACE;
    } catch {
      return SEED_WORKSPACE;
    }
  };
  const write = (db) => storage.setItem(STORE_KEY, JSON.stringify(db));
  const conflict = () => { const e = new Error('Data changed on the server'); e.status = 409; return e; };
  const nextRef = (db) => `OPS-${new Date().getFullYear()}-${pad(++db.seq)}`;
  const enteredBy = { id: user.id, displayName: user.displayName };

  return {
    async getCurrentUser() { await wait(latency); return { ...user }; },
    async loadMaster() { await wait(latency); return JSON.parse(JSON.stringify(master)); },
    async loadPermissions() { await wait(latency); return { ...permissions }; },
    async addMaster(list, value) {
      await wait(latency);
      (master[list] = master[list] || []).push(value);
      return { value };
    },

    async load() {
      await wait(latency);
      const db = read();
      return { version: db.version, shipments: db.shipments };
    },

    async saveWorkspace({ version, shipments }) {
      await wait(latency);
      const db = read();
      if (version != null && version !== db.version) throw conflict();
      db.shipments = shipments.map((s) => ({
        ...s,
        enteredBy: s.enteredBy || enteredBy,
        trips: s.trips.map((t) => ({ ...t, id: t.id || uid() })),
      }));
      db.version += 1;
      write(db);
      return { version: db.version };
    },

    async createOperation({ direction, rowCount, containerCount, shared }) {
      await wait(latency);
      const db = read();
      const n = rowCount || containerCount || 1;
      const ref = nextRef(db);
      const at = nowHM(), day = today();
      const trips = Array.from({ length: n }, (_, ordinal) => ({ id: uid(), ordinal, fields: { ...shared, status: 'Open' }, updates: [] }));
      db.shipments.push({ ref, direction, status: 'Open', enteredBy, day, at, unmerged: [], trips });
      db.version += 1;
      write(db);
      return { ref, version: db.version, at, day, trips: trips.map((t) => ({ id: t.id })) };
    },

    async importTrips({ trips }) {
      await wait(latency);
      const db = read();
      const groups = new Map();
      trips.forEach((t) => {
        const key = t.direction + '|' + (t.group || uid());
        if (!groups.has(key)) groups.set(key, { direction: t.direction, trips: [] });
        groups.get(key).trips.push(t);
      });
      for (const g of groups.values()) {
        db.shipments.push({
          ref: nextRef(db), direction: g.direction, status: 'Open', enteredBy, day: today(), at: nowHM(), unmerged: [],
          trips: g.trips.map((t, ordinal) => ({ id: uid(), ordinal, fields: { ...t.fields }, updates: [] })),
        });
      }
      db.version += 1;
      write(db);
      return { version: db.version };
    },

    async updateShipmentStatus(ref, status, version) {
      await wait(latency);
      const db = read();
      if (version != null && version !== db.version) throw conflict();
      const s = db.shipments.find((x) => x.ref === ref);
      if (!s) throw Object.assign(new Error('Shipment not found'), { status: 404 });
      if (status === 'Open' && s.status === 'Delivered' && !permissions.reopen_shipments) throw Object.assign(new Error('Forbidden'), { status: 403 });
      s.status = status;
      s.trips.forEach((t) => { t.fields.status = status; });
      db.version += 1;
      write(db);
      return { version: db.version };
    },

    async authorizeDeleteShipment() { await wait(latency); return permissions.delete_shipments === true; },
    async deleteShipment(ref, version) {
      await wait(latency);
      const db = read();
      if (version != null && version !== db.version) throw conflict();
      db.shipments = db.shipments.filter((x) => x.ref !== ref);
      db.version += 1;
      write(db);
      return { version: db.version };
    },
  };
}

/** Wipes the mock database. */
export function resetMockApi(storage = window.localStorage) { storage.removeItem(STORE_KEY); }
