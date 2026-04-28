// ============================================================
// TERSO — Inventario · IndexedDB helper
// ============================================================
// DB: terso_inventario  v1
// Stores:
//   conteos   — un conteo por (fecha, area)
//   eventos   — audit log de modificaciones
// ============================================================

const DB_NAME = "terso_inventario";
const DB_VER  = 3;

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      // v1→v2: recreate conteos store removing unique constraint
      if (db.objectStoreNames.contains("conteos")) {
        db.deleteObjectStore("conteos");
      }
      if (db.objectStoreNames.contains("eventos")) {
        db.deleteObjectStore("eventos");
      }
      // conteos — multiple per fecha+area allowed
      const store = db.createObjectStore("conteos", { keyPath: "id" });
      store.createIndex("by_fecha_area", ["fecha", "area"], { unique: false });
      store.createIndex("by_fecha", "fecha");
      // eventos (audit)
      const ev = db.createObjectStore("eventos", { keyPath: "id" });
      ev.createIndex("by_conteo", "conteoId");
    };
    req.onsuccess = e => { _db = e.target.result; resolve(_db); };
    req.onerror   = e => reject(e.target.error);
  });
}

function tx(storeName, mode = "readonly") {
  return _db.transaction(storeName, mode).objectStore(storeName);
}

function idbGet(store, key) {
  return new Promise((res, rej) => {
    const r = store.get(key);
    r.onsuccess = () => res(r.result);
    r.onerror   = e => rej(e.target.error);
  });
}

function idbPut(store, val) {
  return new Promise((res, rej) => {
    const r = store.put(val);
    r.onsuccess = () => res(r.result);
    r.onerror   = e => rej(e.target.error);
  });
}

function idbGetAll(store, index, query) {
  return new Promise((res, rej) => {
    const src = index ? store.index(index) : store;
    const r = query ? src.getAll(query) : src.getAll();
    r.onsuccess = () => res(r.result);
    r.onerror   = e => rej(e.target.error);
  });
}

// ── public API ──────────────────────────────────────────────

const InventarioDB = {

  async init() { await openDB(); },

  // uid simple
  uid: () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

  // fecha local YYYY-MM-DD
  hoy: () => new Date().toISOString().slice(0, 10),

  // ── Conteos ──────────────────────────────────────────────

  async getConteo(fecha, area) {
    await openDB();
    return new Promise((res, rej) => {
      const store = tx("conteos");
      const r = store.index("by_fecha_area").getAll([fecha, area]);
      r.onsuccess = () => {
        const list = r.result || [];
        if (!list.length) { res(null); return; }
        // devolver el más reciente por creadoTs
        list.sort((a, b) => b.creadoTs - a.creadoTs);
        res(list[0]);
      };
      r.onerror = e => rej(e.target.error);
    });
  },

  async getConteosPorFechaArea(fecha, area) {
    await openDB();
    return new Promise((res, rej) => {
      const store = tx("conteos");
      const r = store.index("by_fecha_area").getAll([fecha, area]);
      r.onsuccess = () => {
        const list = r.result || [];
        list.sort((a, b) => a.creadoTs - b.creadoTs);
        res(list);
      };
      r.onerror = e => rej(e.target.error);
    });
  },

  async getConteosPorArea(area) {
    await openDB();
    const todos = await InventarioDB.getAllConteos();
    return todos.filter(c => c.area === area).sort((a, b) => b.creadoTs - a.creadoTs);
  },

  async getAllConteos() {
    await openDB();
    const store = tx("conteos");
    return idbGetAll(store);
  },

  async getConteosPorFecha(fecha) {
    await openDB();
    return new Promise((res, rej) => {
      const store = tx("conteos");
      const r = store.index("by_fecha").getAll(fecha);
      r.onsuccess = () => res(r.result);
      r.onerror   = e => rej(e.target.error);
    });
  },

  async crearConteo({ fecha, area, productos, userId, userName }) {
    await openDB();
    const conteo = {
      id:         InventarioDB.uid(),
      fecha,
      area,
      status:     "abierto",      // 'abierto' | 'cerrado'
      productos,                  // [{ productId, nombre, presentacion, min, capturado }]
      creadoTs:   Date.now(),
      creadoPor:  { id: userId, nombre: userName },
      cerradoTs:  null,
      cerradoPor: null,
    };
    const store = tx("conteos", "readwrite");
    await idbPut(store, conteo);
    return conteo;
  },

  async actualizarProductos({ conteoId, productos, userId, userName, cambios }) {
    await openDB();
    const t = _db.transaction(["conteos", "eventos"], "readwrite");
    const cs = t.objectStore("conteos");
    const es = t.objectStore("eventos");

    const conteo = await idbGet(cs, conteoId);
    if (!conteo) throw new Error("Conteo no encontrado");
    if (conteo.status === "cerrado") throw new Error("Conteo cerrado — no se puede editar");

    conteo.productos = productos;
    await idbPut(cs, conteo);

    if (cambios && cambios.length > 0) {
      const ev = {
        id:       InventarioDB.uid(),
        conteoId,
        ts:       Date.now(),
        tipo:     "modificacion",
        userId,
        userName,
        cambios,  // [{ productId, nombre, antes, despues }]
      };
      await idbPut(es, ev);
    }

    return conteo;
  },

  async cerrarConteo({ conteoId, productos, userId, userName }) {
    await openDB();
    const store = tx("conteos", "readwrite");
    const conteo = await idbGet(store, conteoId);
    if (!conteo) throw new Error("Conteo no encontrado");

    conteo.status    = "cerrado";
    conteo.productos = productos;
    conteo.cerradoTs  = Date.now();
    conteo.cerradoPor = { id: userId, nombre: userName };
    await idbPut(store, conteo);

    return conteo;
  },

  async reabrirConteo({ conteoId, userId, userName, motivo }) {
    await openDB();
    const t = _db.transaction(["conteos", "eventos"], "readwrite");
    const cs = t.objectStore("conteos");
    const es = t.objectStore("eventos");

    const conteo = await idbGet(cs, conteoId);
    if (!conteo) throw new Error("Conteo no encontrado");

    conteo.status     = "abierto";
    conteo.reabiertoPor = { id: userId, nombre: userName, ts: Date.now(), motivo: motivo || "" };
    await idbPut(cs, conteo);

    const ev = {
      id:       InventarioDB.uid(),
      conteoId,
      ts:       Date.now(),
      tipo:     "reapertura",
      userId,
      userName,
      motivo:   motivo || "",
      cambios:  [],
    };
    await idbPut(es, ev);

    return conteo;
  },

  // ── Eventos / audit ──────────────────────────────────────

  async getEventos(conteoId) {
    await openDB();
    return new Promise((res, rej) => {
      const store = tx("eventos");
      const r = store.index("by_conteo").getAll(conteoId);
      r.onsuccess = () => res(r.result.sort((a, b) => a.ts - b.ts));
      r.onerror   = e => rej(e.target.error);
    });
  },
};

export default InventarioDB;
export { InventarioDB };
