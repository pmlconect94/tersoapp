// ============================================================
// TERSO — Supabase data layer
// Maps app state ↔ Supabase tables, handles load + save (upsert/delete).
// ============================================================
import { supabase } from './supabase';

// ─────────── Per-entity adapters ───────────
// Each adapter:
//   table:   Supabase table name
//   pk:      primary key column(s) (string[])
//   type:    'list' (array of objects) | 'map' (keyed JS object)
//   toRow / fromRow: list-type only
//   listFromMap / mapFromList: map-type only

const adapters = {
  users: {
    table: 'employees',
    pk: ['id'],
    type: 'list',
    toRow: (u) => ({
      id: u.id, name: u.name, email: u.email, role: u.role,
      active: u.active !== false, created: u.created ?? null,
    }),
    fromRow: (r) => ({
      id: r.id, name: r.name, email: r.email, role: r.role,
      active: r.active, created: r.created != null ? Number(r.created) : null,
    }),
  },

  proveedores: {
    table: 'suppliers',
    pk: ['id'],
    type: 'list',
    toRow: (s) => ({
      id: s.id, name: s.name, rfc: s.rfc ?? null, contact: s.contact ?? null,
      phone: s.phone ?? null, email: s.email ?? null,
      dias_credito: s.diasCredito ?? 0, category: s.category ?? null, notas: s.notas ?? null,
    }),
    fromRow: (r) => ({
      id: r.id, name: r.name, rfc: r.rfc, contact: r.contact, phone: r.phone, email: r.email,
      diasCredito: r.dias_credito ?? 0, category: r.category, notas: r.notas,
    }),
  },

  taskCatalog: {
    table: 'tasks',
    pk: ['id'],
    type: 'list',
    toRow: (t) => ({
      id: t.id, name: t.name, area: t.area, shift: t.shift, freq: t.freq,
      roles_allowed: t.rolesAllowed ?? [],
    }),
    fromRow: (r) => ({
      id: r.id, name: r.name, area: r.area, shift: r.shift, freq: r.freq,
      rolesAllowed: r.roles_allowed ?? [],
    }),
  },

  products: {
    table: 'products',
    pk: ['id'],
    type: 'list',
    toRow: (p) => ({
      id: p.id, name: p.name, presentacion: p.presentacion ?? null,
      proveedor_id: p.proveedor ?? null, area: p.area,
      min: p.min ?? 0, current: p.current ?? 0,
    }),
    fromRow: (r) => ({
      id: r.id, name: r.name, presentacion: r.presentacion,
      proveedor: r.proveedor_id, area: r.area,
      min: Number(r.min ?? 0), current: Number(r.current ?? 0),
    }),
  },

  requisiciones: {
    table: 'requisitions',
    pk: ['id'],
    type: 'list',
    // factura_id is the circular FK (→ invoices.id). Handled with two-pass save.
    toRow: (r) => ({
      id: r.id, folio: r.folio, area: r.area,
      user_id: r.userId ?? null, status: r.status, created: r.created,
      items: r.items ?? [],
      proveedor_id: r.proveedorId ?? null,
      observaciones: r.observaciones ?? null,
      motivo_rechazo: r.motivoRechazo ?? null,
      reviewed_by: r.reviewedBy ?? null, reviewed_at: r.reviewedAt ?? null,
      received_by: r.receivedBy ?? null, received_at: r.receivedAt ?? null,
      factura_id: r.facturaId ?? null,
    }),
    fromRow: (r) => ({
      id: r.id, folio: r.folio, area: r.area,
      userId: r.user_id, status: r.status,
      created: r.created != null ? Number(r.created) : null,
      items: r.items ?? [],
      proveedorId: r.proveedor_id,
      observaciones: r.observaciones,
      motivoRechazo: r.motivo_rechazo,
      reviewedBy: r.reviewed_by, reviewedAt: r.reviewed_at != null ? Number(r.reviewed_at) : null,
      receivedBy: r.received_by, receivedAt: r.received_at != null ? Number(r.received_at) : null,
      facturaId: r.factura_id,
    }),
  },

  facturas: {
    table: 'invoices',
    pk: ['id'],
    type: 'list',
    toRow: (f) => ({
      id: f.id, folio: f.folio,
      proveedor_id: f.proveedorId ?? null,
      requisicion_id: f.requisicionId ?? null,
      fecha_emision: f.fechaEmision ?? null,
      fecha_vencimiento: f.fechaVencimiento ?? null,
      subtotal: f.subtotal ?? 0, iva: f.iva ?? 0, ieps: f.ieps ?? 0,
      total: f.total ?? 0, saldo_pendiente: f.saldoPendiente ?? 0,
      status: f.status,
      cuenta_pago_sugerida: f.cuentaPagoSugerida ?? null,
      observaciones: f.observaciones ?? null,
      created_by: f.createdBy ?? null, created: f.created,
    }),
    fromRow: (r) => ({
      id: r.id, folio: r.folio,
      proveedorId: r.proveedor_id, requisicionId: r.requisicion_id,
      fechaEmision: r.fecha_emision != null ? Number(r.fecha_emision) : null,
      fechaVencimiento: r.fecha_vencimiento != null ? Number(r.fecha_vencimiento) : null,
      subtotal: Number(r.subtotal ?? 0), iva: Number(r.iva ?? 0), ieps: Number(r.ieps ?? 0),
      total: Number(r.total ?? 0), saldoPendiente: Number(r.saldo_pendiente ?? 0),
      status: r.status, cuentaPagoSugerida: r.cuenta_pago_sugerida,
      observaciones: r.observaciones, createdBy: r.created_by,
      created: r.created != null ? Number(r.created) : null,
    }),
  },

  pagos: {
    table: 'payments',
    pk: ['id'],
    type: 'list',
    toRow: (p) => ({
      id: p.id, factura_id: p.facturaId ?? null, fecha: p.fecha,
      monto: p.monto ?? 0, cuenta_pago: p.cuentaPago ?? null,
      referencia: p.referencia ?? null, registrado_por: p.registradoPor ?? null,
    }),
    fromRow: (r) => ({
      id: r.id, facturaId: r.factura_id,
      fecha: r.fecha != null ? Number(r.fecha) : null,
      monto: Number(r.monto ?? 0), cuentaPago: r.cuenta_pago,
      referencia: r.referencia, registradoPor: r.registrado_por,
    }),
  },

  inventoryHistory: {
    table: 'inventory_history',
    pk: ['id'],
    type: 'list',
    toRow: (h) => ({
      id: h.id, ts: h.ts, user_id: h.userId ?? null,
      area: h.area ?? null, snapshot: h.snapshot ?? {},
    }),
    fromRow: (r) => ({
      id: r.id, ts: r.ts != null ? Number(r.ts) : null,
      userId: r.user_id, area: r.area, snapshot: r.snapshot ?? {},
    }),
  },

  schedules: {
    table: 'schedules',
    pk: ['week'],
    type: 'list',
    toRow: (s) => ({
      week: s.week, status: s.status ?? 'draft',
      entries: s.entries ?? {},
      published_at: s.publishedAt ?? null,
    }),
    fromRow: (r) => ({
      week: r.week, status: r.status,
      entries: r.entries ?? {},
      publishedAt: r.published_at != null ? Number(r.published_at) : null,
    }),
  },

  tips: {
    table: 'tips',
    pk: ['id'],
    type: 'list',
    toRow: (t) => ({
      id: t.id, date: t.date,
      pay_tip: t.payTip ?? 0, cash_tip: t.cashTip ?? 0,
      sale: t.sale ?? 0, note: t.note ?? null,
    }),
    fromRow: (r) => ({
      id: r.id, date: r.date,
      payTip: Number(r.pay_tip ?? 0), cashTip: Number(r.cash_tip ?? 0),
      sale: Number(r.sale ?? 0), note: r.note ?? '',
    }),
  },

  tipPayments: {
    table: 'tip_payments',
    pk: ['key'],
    type: 'map',
    listFromMap: (obj) =>
      Object.entries(obj || {}).map(([key, paid]) => ({ key, paid: !!paid })),
    mapFromList: (rows) =>
      Object.fromEntries((rows || []).filter(r => r.paid).map(r => [r.key, true])),
  },

  taskTemplate: {
    table: 'task_template',
    pk: ['task_id', 'day_idx'],
    type: 'map',
    listFromMap: (obj) =>
      Object.entries(obj || {})
        .map(([key, userId]) => {
          const [task_id, dayStr] = key.split('|');
          const day_idx = Number(dayStr);
          if (!task_id || Number.isNaN(day_idx) || !userId) return null;
          return { task_id, day_idx, user_id: userId };
        })
        .filter(Boolean),
    mapFromList: (rows) =>
      Object.fromEntries((rows || []).map(r => [`${r.task_id}|${r.day_idx}`, r.user_id])),
  },

  taskOverrides: {
    table: 'task_overrides',
    pk: ['task_id', 'date_iso'],
    type: 'map',
    listFromMap: (obj) =>
      Object.entries(obj || {})
        .map(([key, userId]) => {
          const [task_id, date_iso] = key.split('|');
          if (!task_id || !date_iso || !userId) return null;
          return { task_id, date_iso, user_id: userId };
        })
        .filter(Boolean),
    mapFromList: (rows) =>
      Object.fromEntries((rows || []).map(r => [`${r.task_id}|${r.date_iso}`, r.user_id])),
  },

  taskRecords: {
    table: 'task_records',
    pk: ['id'],
    type: 'list',
    toRow: (r) => ({
      id: r.id, task_id: r.taskId ?? null, user_id: r.userId ?? null,
      date_iso: r.dateISO, status: r.status,
      employee_note: r.employeeNote ?? null,
      admin_note: r.adminNote ?? null,
      completed_at: r.completedAt ?? null,
      audited_at: r.auditedAt ?? null,
      audited_by: r.auditedBy ?? null,
    }),
    fromRow: (r) => ({
      id: r.id, taskId: r.task_id, userId: r.user_id,
      dateISO: r.date_iso, status: r.status,
      employeeNote: r.employee_note ?? '', adminNote: r.admin_note ?? '',
      completedAt: r.completed_at != null ? Number(r.completed_at) : null,
      auditedAt: r.audited_at != null ? Number(r.audited_at) : null,
      auditedBy: r.audited_by,
    }),
  },

  audit: {
    table: 'audit_log',
    pk: ['id'],
    type: 'list',
    toRow: (a) => ({ id: a.id, ts: a.ts, user_id: a.userId ?? null, action: a.action }),
    fromRow: (r) => ({
      id: r.id, ts: r.ts != null ? Number(r.ts) : null,
      userId: r.user_id, action: r.action,
    }),
  },
};

// ─────────── Helpers ───────────

function rowsForKey(key, slice) {
  const a = adapters[key];
  if (!a) return [];
  if (a.type === 'list') return (slice || []).map(a.toRow);
  if (a.type === 'map') return a.listFromMap(slice || {});
  return [];
}

function pkValue(adapter, row) {
  return adapter.pk.map(c => row[c]).join('||');
}

async function upsertRows(adapter, rows) {
  if (!rows.length) return;
  const { error } = await supabase
    .from(adapter.table)
    .upsert(rows, { onConflict: adapter.pk.join(',') });
  if (error) {
    console.error(`[Repo] upsert ${adapter.table} failed:`, error);
    throw error;
  }
}

async function deleteRows(adapter, rows) {
  if (!rows.length) return;
  if (adapter.pk.length === 1) {
    const col = adapter.pk[0];
    const ids = rows.map(r => r[col]);
    const { error } = await supabase.from(adapter.table).delete().in(col, ids);
    if (error) {
      console.error(`[Repo] delete ${adapter.table} failed:`, error);
      throw error;
    }
  } else {
    for (const r of rows) {
      let q = supabase.from(adapter.table).delete();
      adapter.pk.forEach(c => { q = q.eq(c, r[c]); });
      const { error } = await q;
      if (error) {
        console.error(`[Repo] delete ${adapter.table} composite failed:`, error);
        throw error;
      }
    }
  }
}

async function syncEntity(key, prev, next, opts = {}) {
  const a = adapters[key];
  if (!a) return;
  const prevSlice = prev?.[key];
  const nextSlice = next?.[key];
  // Skip if unchanged
  if (!opts.force && JSON.stringify(prevSlice) === JSON.stringify(nextSlice)) return;

  let nextRows = rowsForKey(key, nextSlice);
  const prevRows = rowsForKey(key, prevSlice);

  // Optional: strip listed fields (used for circular-FK two-pass)
  if (opts.strip && opts.strip.length) {
    nextRows = nextRows.map(r => {
      const copy = { ...r };
      opts.strip.forEach(f => { copy[f] = null; });
      return copy;
    });
  }

  await upsertRows(a, nextRows);

  if (!opts.skipDelete) {
    const nextKeys = new Set(nextRows.map(r => pkValue(a, r)));
    const removed = prevRows.filter(r => !nextKeys.has(pkValue(a, r)));
    await deleteRows(a, removed);
  }
}

// ─────────── Public API ───────────

async function loadAll() {
  const keys = Object.keys(adapters);
  const results = await Promise.all(keys.map(async (k) => {
    const a = adapters[k];
    const { data, error } = await supabase.from(a.table).select('*');
    if (error) {
      console.error(`[Repo] load ${a.table} failed:`, error);
      throw error;
    }
    if (a.type === 'list') return [k, (data || []).map(a.fromRow)];
    if (a.type === 'map') return [k, a.mapFromList(data || [])];
    return [k, null];
  }));
  return Object.fromEntries(results);
}

async function isEmpty() {
  const { count, error } = await supabase
    .from('employees')
    .select('id', { count: 'exact', head: true });
  if (error) {
    console.error('[Repo] isEmpty check failed:', error);
    throw error;
  }
  return (count ?? 0) === 0;
}

// Save full state in dependency order. Skips entities whose slice didn't change.
async function saveAll(prev, next) {
  // Phase A: parents with no FKs
  await syncEntity('users', prev, next);
  await syncEntity('proveedores', prev, next);
  await syncEntity('taskCatalog', prev, next);

  // Phase B: depends on suppliers
  await syncEntity('products', prev, next);

  // Phase C: requisitions pass 1 — strip factura_id (circular FK with invoices)
  await syncEntity('requisiciones', prev, next, { strip: ['factura_id'] });

  // Phase D: invoices (FKs to suppliers, employees, requisitions)
  await syncEntity('facturas', prev, next);

  // Phase E: requisitions pass 2 — fill factura_id (skip delete; already handled in pass 1)
  await syncEntity('requisiciones', prev, next, { skipDelete: true, force: true });

  // Phase F: rest
  await syncEntity('pagos', prev, next);
  await syncEntity('tips', prev, next);
  await syncEntity('tipPayments', prev, next);
  await syncEntity('schedules', prev, next);
  await syncEntity('taskTemplate', prev, next);
  await syncEntity('taskOverrides', prev, next);
  await syncEntity('taskRecords', prev, next);
  await syncEntity('inventoryHistory', prev, next);
  await syncEntity('audit', prev, next);
}

// Push the entire state to a fresh DB (used for first-launch seed).
async function seedAll(state) {
  await saveAll(null, state);
}

export default { loadAll, isEmpty, saveAll, seedAll };
export { adapters };
