// ============================================================
// TERSO — Inventario · Persistencia en Supabase
// Tablas: inventory_conteos, inventory_events
// ============================================================
import { supabase } from './supabase';

const C = 'inventory_conteos';
const E = 'inventory_events';

const fromConteo = (r) => r ? {
  id: r.id,
  fecha: r.fecha,
  area: r.area,
  status: r.status,
  productos: r.productos ?? [],
  creadoTs: r.creado_ts != null ? Number(r.creado_ts) : null,
  creadoPor: r.creado_por,
  cerradoTs: r.cerrado_ts != null ? Number(r.cerrado_ts) : null,
  cerradoPor: r.cerrado_por,
  reabiertoPor: r.reabierto_por,
} : null;

const toConteoRow = (c) => ({
  id: c.id,
  fecha: c.fecha,
  area: c.area,
  status: c.status,
  productos: c.productos ?? [],
  creado_ts: c.creadoTs,
  creado_por: c.creadoPor ?? null,
  cerrado_ts: c.cerradoTs ?? null,
  cerrado_por: c.cerradoPor ?? null,
  reabierto_por: c.reabiertoPor ?? null,
});

const fromEvento = (r) => ({
  id: r.id,
  conteoId: r.conteo_id,
  ts: r.ts != null ? Number(r.ts) : null,
  tipo: r.tipo,
  userId: r.user_id,
  userName: r.user_name,
  motivo: r.motivo,
  cambios: r.cambios ?? [],
});

const toEventoRow = (e) => ({
  id: e.id,
  conteo_id: e.conteoId,
  ts: e.ts,
  tipo: e.tipo,
  user_id: e.userId ?? null,
  user_name: e.userName ?? null,
  motivo: e.motivo ?? null,
  cambios: e.cambios ?? [],
});

const InventarioDB = {

  async init() { /* Supabase no requiere init explícita */ },

  uid: () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,

  hoy: () => new Date().toISOString().slice(0, 10),

  // ── Conteos ──────────────────────────────────────────────

  async getConteo(fecha, area) {
    const { data, error } = await supabase
      .from(C).select('*')
      .eq('fecha', fecha).eq('area', area)
      .order('creado_ts', { ascending: false })
      .limit(1);
    if (error) throw error;
    return fromConteo((data || [])[0]) || null;
  },

  async getConteosPorFechaArea(fecha, area) {
    const { data, error } = await supabase
      .from(C).select('*')
      .eq('fecha', fecha).eq('area', area)
      .order('creado_ts', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromConteo);
  },

  async getConteosPorArea(area) {
    const { data, error } = await supabase
      .from(C).select('*')
      .eq('area', area)
      .order('creado_ts', { ascending: false });
    if (error) throw error;
    return (data || []).map(fromConteo);
  },

  async getAllConteos() {
    const { data, error } = await supabase.from(C).select('*');
    if (error) throw error;
    return (data || []).map(fromConteo);
  },

  async getConteosPorFecha(fecha) {
    const { data, error } = await supabase.from(C).select('*').eq('fecha', fecha);
    if (error) throw error;
    return (data || []).map(fromConteo);
  },

  async crearConteo({ fecha, area, productos, userId, userName }) {
    const conteo = {
      id:         InventarioDB.uid(),
      fecha,
      area,
      status:     'abierto',
      productos:  productos ?? [],
      creadoTs:   Date.now(),
      creadoPor:  { id: userId, nombre: userName },
      cerradoTs:  null,
      cerradoPor: null,
    };
    const { error } = await supabase.from(C).insert(toConteoRow(conteo));
    if (error) throw error;
    return conteo;
  },

  async actualizarProductos({ conteoId, productos, userId, userName, cambios }) {
    const { data: cur, error: fetchErr } = await supabase
      .from(C).select('*').eq('id', conteoId).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!cur) throw new Error('Conteo no encontrado');
    if (cur.status === 'cerrado') throw new Error('Conteo cerrado — no se puede editar');

    const { error: updErr } = await supabase
      .from(C).update({ productos: productos ?? [] }).eq('id', conteoId);
    if (updErr) throw updErr;

    if (cambios && cambios.length > 0) {
      const ev = {
        id:       InventarioDB.uid(),
        conteoId,
        ts:       Date.now(),
        tipo:     'modificacion',
        userId,
        userName,
        cambios,
      };
      const { error: evErr } = await supabase.from(E).insert(toEventoRow(ev));
      if (evErr) throw evErr;
    }

    const updated = fromConteo(cur);
    updated.productos = productos ?? [];
    return updated;
  },

  async cerrarConteo({ conteoId, productos, userId, userName }) {
    const { data: cur, error: fetchErr } = await supabase
      .from(C).select('*').eq('id', conteoId).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!cur) throw new Error('Conteo no encontrado');

    const ts = Date.now();
    const cerradoPor = { id: userId, nombre: userName };
    const { error } = await supabase.from(C).update({
      status:      'cerrado',
      productos:   productos ?? [],
      cerrado_ts:  ts,
      cerrado_por: cerradoPor,
    }).eq('id', conteoId);
    if (error) throw error;

    return {
      ...fromConteo(cur),
      status: 'cerrado',
      productos: productos ?? [],
      cerradoTs: ts,
      cerradoPor,
    };
  },

  async reabrirConteo({ conteoId, userId, userName, motivo }) {
    const { data: cur, error: fetchErr } = await supabase
      .from(C).select('*').eq('id', conteoId).maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!cur) throw new Error('Conteo no encontrado');

    const ts = Date.now();
    const reabiertoPor = { id: userId, nombre: userName, ts, motivo: motivo || '' };

    const { error: updErr } = await supabase.from(C).update({
      status:        'abierto',
      reabierto_por: reabiertoPor,
    }).eq('id', conteoId);
    if (updErr) throw updErr;

    const ev = {
      id:       InventarioDB.uid(),
      conteoId,
      ts,
      tipo:     'reapertura',
      userId,
      userName,
      motivo:   motivo || '',
      cambios:  [],
    };
    const { error: evErr } = await supabase.from(E).insert(toEventoRow(ev));
    if (evErr) throw evErr;

    return { ...fromConteo(cur), status: 'abierto', reabiertoPor };
  },

  // ── Eventos / audit ──────────────────────────────────────

  async getEventos(conteoId) {
    const { data, error } = await supabase
      .from(E).select('*')
      .eq('conteo_id', conteoId)
      .order('ts', { ascending: true });
    if (error) throw error;
    return (data || []).map(fromEvento);
  },
};

export default InventarioDB;
export { InventarioDB };
