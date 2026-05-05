// ============================================================
// TERSO — Store, seed data, helpers
// Persistencia: Supabase (vía supabaseRepo). Sin localStorage.
// ============================================================
import SupabaseRepo from './supabaseRepo';

const ROLES = {
  pending: { id: "pending", label: "Pendiente de rol", areas: [], color: "#a0796b" },
  admin: { id: "admin", label: "Administrador", areas: ["piso", "barra", "cocina"], color: "#b09a5b" },
  piso: { id: "piso", label: "Piso", areas: ["piso"], color: "#5a7a4d" },
  barra: { id: "barra", label: "Barra", areas: ["barra"], color: "#a14e3a" },
  cocina: { id: "cocina", label: "Cocina", areas: ["cocina"], color: "#c08a3a" },
};

const AREAS = {
  piso: { id: "piso", label: "Piso", kana: "PISO" },
  barra: { id: "barra", label: "Barra", kana: "BARRA" },
  cocina: { id: "cocina", label: "Cocina", kana: "COCINA" },
};

const PRESENTACIONES = ["Kg", "g", "Lt", "ml", "Pz", "Caja", "Botella", "Paquete", "Manojo", "Docena"];

// ============================================================
// CUENTAS POR PAGAR
// ============================================================

// Cuentas de pago disponibles
const PAYMENT_ACCOUNTS = {
  efectivo:  { id: "efectivo",  label: "Efectivo",                  short: "EF",   color: "#5a7a4d", icon: "💵" },
  banorte:   { id: "banorte",   label: "Banorte (transferencia)",   short: "BNT",  color: "#a14e3a", icon: "🏦" },
  amex:      { id: "amex",      label: "Tarjeta Crédito AMEX",      short: "AMEX", color: "#46524a", icon: "💳" },
};

// Status de factura/CXP
const FACTURA_STATUS = {
  pendiente: { id: "pendiente", label: "Pendiente",  color: "#c4a04f" },
  parcial:   { id: "parcial",   label: "Pago parcial", color: "#7a6f3a" },
  pagada:    { id: "pagada",    label: "Pagada",     color: "#5a7a4d" },
  vencida:   { id: "vencida",   label: "Vencida",    color: "#a14e3a" },
};

// Status de requisición (extendido)
const REQ_STATUS = {
  pendiente:  { id: "pendiente",  label: "Pendiente revisión", color: "#c4a04f" },
  aprobada:   { id: "aprobada",   label: "Aprobada",            color: "#7a8c66" },
  rechazada:  { id: "rechazada",  label: "Rechazada",           color: "#a14e3a" },
  recibida:   { id: "recibida",   label: "Recibida y comprada", color: "#5a7a4d" },
};

// IVA estándar (México)
const IVA_RATE = 0.16;

// ============================================================
// Horarios y Propinas
// ============================================================

// Días de la semana: Lunes (0) ... Domingo (6)
const DAYS = [
  { id: 0, label: "Lunes", short: "Lun" },
  { id: 1, label: "Martes", short: "Mar" },
  { id: 2, label: "Miércoles", short: "Mié" },
  { id: 3, label: "Jueves", short: "Jue" },
  { id: 4, label: "Viernes", short: "Vie" },
  { id: 5, label: "Sábado", short: "Sáb" },
  { id: 6, label: "Domingo", short: "Dom" },
];

// Reglas de reparto de propinas
// Cocina toma 6% sobre la venta del día (capeado al pool neto disponible)
// Salón (Piso+Barra) toma el remanente del pool
// Comisión bancaria sobre propinas con tarjeta
const CARD_FEE = 0.035;          // 3.5% sobre propina PAY
const COCINA_VENTA_PCT = 0.06;   // 6% de la venta total
const TIP_SPLIT = {              // (legacy — se mantiene para no romper UI vieja)
  cocina: 6 / 14,
  salon:  8 / 14,
};

// ISO date helpers — "YYYY-MM-DD"
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function fromISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
// Returns ISO date of the Monday that starts the week containing `d`
function weekStart(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Mon=0 ... Sun=6
  x.setDate(x.getDate() - dow);
  return toISO(x);
}
function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
function fmtWeekRange(weekStartISO) {
  const start = fromISO(weekStartISO);
  const end = new Date(start); end.setDate(end.getDate() + 6);
  const sm = start.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
  const em = end.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
  return `${sm} – ${em}`;
}
// "13:00" / "1 PM" / "1:30 PM" → minutes since midnight, or null
function parseTime(s) {
  if (!s) return null;
  const t = String(s).trim().toUpperCase();
  // 24h "HH:MM"
  let m = t.match(/^(\d{1,2}):(\d{2})$/);
  if (m) {
    const h = +m[1], mm = +m[2];
    if (h >= 0 && h < 24 && mm >= 0 && mm < 60) return h * 60 + mm;
  }
  // 12h with AM/PM
  m = t.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/);
  if (m) {
    let h = +m[1] % 12;
    const mm = m[2] ? +m[2] : 0;
    if (m[3] === "PM") h += 12;
    return h * 60 + mm;
  }
  // bare hour "13" → 13:00
  m = t.match(/^(\d{1,2})$/);
  if (m) {
    const h = +m[1];
    if (h >= 0 && h < 24) return h * 60;
  }
  return null;
}
function fmtTime(min) {
  if (min == null) return "";
  const h = Math.floor(min / 60), mm = min % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = ((h + 11) % 12) + 1;
  return mm === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}
// shift: { type: 'rest' | 'work', from?: number, to?: number }
function shiftLabel(s) {
  if (!s || s.type === "rest") return "Descanso";
  if (s.type !== "work") return "";
  return `${fmtTime(s.from)} – ${fmtTime(s.to)}`;
}
// Hours worked in a shift (handles overnight: to < from)
function shiftHours(s) {
  if (!s || s.type !== "work" || s.from == null || s.to == null) return 0;
  let diff = s.to - s.from;
  if (diff <= 0) diff += 24 * 60;
  return diff / 60;
}

// Categorize role into tip pool
// Salón = Piso + Barra; Cocina = Cocina; Admin no participa
function tipPool(role) {
  if (role === "piso" || role === "barra") return "salon";
  if (role === "cocina") return "cocina";
  return null;
}

const SEED_USERS = [
  { id: "u1", name: "Diego Ramírez", email: "terso.facturacion@gmail.com", role: "admin", active: true, created: Date.now() - 86400000 * 30 },
  { id: "u2", name: "Ana Sotelo", email: "ana@terso.mx", role: "piso", active: true, created: Date.now() - 86400000 * 22 },
  { id: "u3", name: "Mateo Quintero", email: "mateo@terso.mx", role: "barra", active: true, created: Date.now() - 86400000 * 14 },
  { id: "u4", name: "Lucía Vargas", email: "lucia@terso.mx", role: "cocina", active: true, created: Date.now() - 86400000 * 9 },
  { id: "u5", name: "Aldo Mendoza", email: "aldo@terso.mx", role: "cocina", active: true, created: Date.now() - 86400000 * 60 },
  { id: "u6", name: "Ramses Ortiz", email: "ramses@terso.mx", role: "cocina", active: true, created: Date.now() - 86400000 * 55 },
  { id: "u7", name: "Oscar Beltrán", email: "oscar@terso.mx", role: "barra", active: true, created: Date.now() - 86400000 * 50 },
  { id: "u8", name: "Conrado Salinas", email: "conrado@terso.mx", role: "piso", active: true, created: Date.now() - 86400000 * 45 },
  { id: "u9", name: "Miros Chávez", email: "miros@terso.mx", role: "piso", active: true, created: Date.now() - 86400000 * 40 },
  { id: "u10", name: "Ismael Téllez", email: "ismael@terso.mx", role: "piso", active: true, created: Date.now() - 86400000 * 35 },
  { id: "u11", name: "Jessica Pérez", email: "jessica@terso.mx", role: "cocina", active: true, created: Date.now() - 86400000 * 28 },
];

const SEED_PROVEEDORES = [
  { id: "p1", name: "Casa Mezcal Oaxaca",       rfc: "CMO180523AB7", contact: "Juan Pérez",      phone: "55 2345 6789", email: "juan@mezcaloaxaca.mx",   diasCredito: 15, category: "Mezcal",    notas: "Pedido mínimo 6 botellas" },
  { id: "p2", name: "Vinos Boutique MX",        rfc: "VBM150812K20", contact: "Carla Mendoza",   phone: "55 9988 1122", email: "ventas@vinosboutique.mx", diasCredito: 30, category: "Vinos",     notas: "" },
  { id: "p3", name: "La Carnicería del Centro", rfc: "LCC120304TY5", contact: "Roberto Díaz",    phone: "55 4455 6677", email: "pedidos@lacarniceria.mx", diasCredito: 7,  category: "Carnes",    notas: "Entrega martes y viernes" },
  { id: "p4", name: "Mercado de la Merced",     rfc: null,           contact: "María López",     phone: "55 1234 5566", email: "",                       diasCredito: 0,  category: "Verduras",  notas: "Pago contado" },
  { id: "p5", name: "Mariscos del Pacífico",    rfc: "MDP190215QW3", contact: "Sergio Romero",   phone: "55 7766 5544", email: "sergio@mariscospac.mx",  diasCredito: 14, category: "Mariscos",  notas: "" },
  { id: "p6", name: "Suministros Hosteleros",   rfc: "SUH101005MN8", contact: "Patricia Sosa",   phone: "55 8899 1010", email: "ventas@hosteleros.mx",   diasCredito: 30, category: "Limpieza",  notas: "" },
  { id: "p7", name: "Panadería La Espiga",      rfc: "PLE160708OP4", contact: "Ricardo Aguilar", phone: "55 2233 4455", email: "ricardo@laespiga.mx",    diasCredito: 0,  category: "Panadería", notas: "Entrega diaria 9 AM" },
  { id: "p8", name: "Lácteos Premium",          rfc: "LPR140918RT9", contact: "Mónica Vázquez",  phone: "55 6677 8899", email: "monica@lacteospremium.mx", diasCredito: 21, category: "Lácteos",   notas: "" },
];

const SEED_PRODUCTS = [
  // Barra — mezcales y destilados
  { id: "pr1", name: "Mezcal Espadín Vago", presentacion: "Botella", proveedor: "p1", area: "barra", min: 4, current: 6 },
  { id: "pr2", name: "Mezcal Tobalá Real Minero", presentacion: "Botella", proveedor: "p1", area: "barra", min: 2, current: 1 },
  { id: "pr3", name: "Tequila Fortaleza Blanco", presentacion: "Botella", proveedor: "p1", area: "barra", min: 3, current: 4 },
  { id: "pr4", name: "Sotol Por Siempre", presentacion: "Botella", proveedor: "p1", area: "barra", min: 2, current: 2 },
  { id: "pr5", name: "Vino Tinto Casa Madero", presentacion: "Botella", proveedor: "p2", area: "barra", min: 6, current: 8 },
  { id: "pr6", name: "Vino Blanco Monte Xanic", presentacion: "Botella", proveedor: "p2", area: "barra", min: 6, current: 3 },
  { id: "pr7", name: "Cerveza Minerva Stout", presentacion: "Caja", proveedor: "p2", area: "barra", min: 2, current: 5 },
  { id: "pr8", name: "Hielo en cubos", presentacion: "Kg", proveedor: "p4", area: "barra", min: 30, current: 45 },
  { id: "pr9", name: "Limón persa", presentacion: "Kg", proveedor: "p4", area: "barra", min: 5, current: 4 },
  { id: "pr10", name: "Sal de gusano", presentacion: "g", proveedor: "p1", area: "barra", min: 200, current: 350 },
  { id: "pr11", name: "Naranja para coctel", presentacion: "Kg", proveedor: "p4", area: "barra", min: 3, current: 2 },
  { id: "pr12", name: "Agua mineral Topo Chico", presentacion: "Caja", proveedor: "p2", area: "barra", min: 2, current: 3 },

  // Cocina — proteínas y básicos
  { id: "pr13", name: "Arrachera marinada", presentacion: "Kg", proveedor: "p3", area: "cocina", min: 8, current: 12 },
  { id: "pr14", name: "Pulpo fresco", presentacion: "Kg", proveedor: "p5", area: "cocina", min: 4, current: 2 },
  { id: "pr15", name: "Robalo en filete", presentacion: "Kg", proveedor: "p5", area: "cocina", min: 6, current: 7 },
  { id: "pr16", name: "Camarón U-15", presentacion: "Kg", proveedor: "p5", area: "cocina", min: 5, current: 3 },
  { id: "pr17", name: "Pollo orgánico", presentacion: "Kg", proveedor: "p3", area: "cocina", min: 10, current: 14 },
  { id: "pr18", name: "Maíz azul nixtamalizado", presentacion: "Kg", proveedor: "p4", area: "cocina", min: 15, current: 22 },
  { id: "pr19", name: "Aguacate Hass", presentacion: "Kg", proveedor: "p4", area: "cocina", min: 8, current: 5 },
  { id: "pr20", name: "Jitomate saladet", presentacion: "Kg", proveedor: "p4", area: "cocina", min: 10, current: 8 },
  { id: "pr21", name: "Chile poblano", presentacion: "Kg", proveedor: "p4", area: "cocina", min: 4, current: 3 },
  { id: "pr22", name: "Cebolla blanca", presentacion: "Kg", proveedor: "p4", area: "cocina", min: 12, current: 15 },
  { id: "pr23", name: "Cilantro", presentacion: "Manojo", proveedor: "p4", area: "cocina", min: 20, current: 12 },
  { id: "pr24", name: "Epazote", presentacion: "Manojo", proveedor: "p4", area: "cocina", min: 10, current: 6 },
  { id: "pr25", name: "Queso Oaxaca", presentacion: "Kg", proveedor: "p8", area: "cocina", min: 5, current: 7 },
  { id: "pr26", name: "Crema ácida", presentacion: "Lt", proveedor: "p8", area: "cocina", min: 4, current: 2 },
  { id: "pr27", name: "Mantequilla", presentacion: "Kg", proveedor: "p8", area: "cocina", min: 3, current: 4 },
  { id: "pr28", name: "Aceite de oliva", presentacion: "Lt", proveedor: "p7", area: "cocina", min: 6, current: 3 },
  { id: "pr29", name: "Pan campesino", presentacion: "Pz", proveedor: "p7", area: "cocina", min: 20, current: 14 },
  { id: "pr30", name: "Tortilla artesanal", presentacion: "Kg", proveedor: "p4", area: "cocina", min: 12, current: 18 },

  // Piso — servicio
  { id: "pr31", name: "Servilletas de tela", presentacion: "Pz", proveedor: "p6", area: "piso", min: 80, current: 120 },
  { id: "pr32", name: "Velas de cera", presentacion: "Pz", proveedor: "p6", area: "piso", min: 30, current: 18 },
  { id: "pr33", name: "Limpiavidrios", presentacion: "Lt", proveedor: "p6", area: "piso", min: 4, current: 5 },
  { id: "pr34", name: "Detergente multiusos", presentacion: "Lt", proveedor: "p6", area: "piso", min: 6, current: 3 },
  { id: "pr35", name: "Bolsas de basura", presentacion: "Paquete", proveedor: "p6", area: "piso", min: 4, current: 2 },
  { id: "pr36", name: "Toallas de papel", presentacion: "Paquete", proveedor: "p6", area: "piso", min: 6, current: 8 },
  { id: "pr37", name: "Flores de temporada", presentacion: "Manojo", proveedor: "p4", area: "piso", min: 6, current: 4 },
];

// Schema requisición v2:
//   { id, folio, area, userId (creador), status, created,
//     items: [{ productId, qtySolicitada, qtyAprobada, costoUnit, iva, ieps, recibido }],
//     proveedorId, motivoRechazo,
//     reviewedBy, reviewedAt,
//     receivedBy, receivedAt,
//     facturaId (cuando ya generó CXP) }
const SEED_REQUISICIONES = [
  { id: "r1", folio: "REQ-2026-0118", area: "cocina", userId: "u4", status: "pendiente", created: Date.now() - 86400000 * 2,
    items: [
      { productId: "pr16", qtySolicitada: 4,  qtyAprobada: null, costoUnit: null, iva: false, ieps: 0, recibido: false },
      { productId: "pr19", qtySolicitada: 5,  qtyAprobada: null, costoUnit: null, iva: false, ieps: 0, recibido: false },
      { productId: "pr23", qtySolicitada: 10, qtyAprobada: null, costoUnit: null, iva: false, ieps: 0, recibido: false },
    ],
    proveedorId: null, observaciones: "Producto para fin de semana",
  },
  { id: "r2", folio: "REQ-2026-0117", area: "barra", userId: "u3", status: "aprobada", created: Date.now() - 86400000 * 4,
    items: [
      { productId: "pr2", qtySolicitada: 3, qtyAprobada: 3, costoUnit: null, iva: false, ieps: 0, recibido: false },
      { productId: "pr6", qtySolicitada: 6, qtyAprobada: 4, costoUnit: null, iva: false, ieps: 0, recibido: false },
    ],
    proveedorId: "p1", observaciones: "",
    reviewedBy: "u1", reviewedAt: Date.now() - 86400000 * 3,
  },
  { id: "r3", folio: "REQ-2026-0116", area: "piso", userId: "u2", status: "recibida", created: Date.now() - 86400000 * 8,
    items: [
      { productId: "pr32", qtySolicitada: 30, qtyAprobada: 30, costoUnit: 12.50, iva: true,  ieps: 0, recibido: true },
      { productId: "pr34", qtySolicitada: 6,  qtyAprobada: 6,  costoUnit: 85.00, iva: true,  ieps: 0, recibido: true },
    ],
    proveedorId: "p6", observaciones: "",
    reviewedBy: "u1", reviewedAt: Date.now() - 86400000 * 7,
    receivedBy: "u1", receivedAt: Date.now() - 86400000 * 5,
    facturaId: "f1",
  },
  { id: "r4", folio: "REQ-2026-0115", area: "cocina", userId: "u4", status: "rechazada", created: Date.now() - 86400000 * 9,
    items: [{ productId: "pr14", qtySolicitada: 8, qtyAprobada: null, costoUnit: null, iva: false, ieps: 0, recibido: false }],
    proveedorId: null, observaciones: "",
    reviewedBy: "u1", reviewedAt: Date.now() - 86400000 * 8,
    motivoRechazo: "Pedir hasta tener confirmación de pulpo en zona.",
  },
];

// Schema factura/CXP:
//   { id, folio, proveedorId, requisicionId, fechaEmision, fechaVencimiento,
//     subtotal, iva, ieps, total, saldoPendiente, status,
//     cuentaPagoSugerida, observaciones, createdBy, created }
const SEED_FACTURAS = [
  { id: "f1", folio: "F-2026-0042", proveedorId: "p6", requisicionId: "r3",
    fechaEmision: Date.now() - 86400000 * 5, fechaVencimiento: Date.now() + 86400000 * 25,
    subtotal: 885, iva: 141.60, ieps: 0, total: 1026.60, saldoPendiente: 526.60,
    status: "parcial", cuentaPagoSugerida: "banorte", observaciones: "",
    createdBy: "u1", created: Date.now() - 86400000 * 5,
  },
  { id: "f2", folio: "F-2026-0028", proveedorId: "p3", requisicionId: null,
    fechaEmision: Date.now() - 86400000 * 14, fechaVencimiento: Date.now() - 86400000 * 7,
    subtotal: 4200, iva: 672, ieps: 0, total: 4872, saldoPendiente: 4872,
    status: "vencida", cuentaPagoSugerida: "efectivo", observaciones: "Carne semana pasada",
    createdBy: "u1", created: Date.now() - 86400000 * 14,
  },
  { id: "f3", folio: "F-2026-0019", proveedorId: "p1", requisicionId: null,
    fechaEmision: Date.now() - 86400000 * 20, fechaVencimiento: Date.now() - 86400000 * 5,
    subtotal: 6800, iva: 1088, ieps: 0, total: 7888, saldoPendiente: 0,
    status: "pagada", cuentaPagoSugerida: "amex", observaciones: "",
    createdBy: "u1", created: Date.now() - 86400000 * 20,
  },
];

// Schema pago: { id, facturaId, fecha, monto, cuentaPago, referencia, registradoPor }
const SEED_PAGOS = [
  { id: "pg1", facturaId: "f1", fecha: Date.now() - 86400000 * 3, monto: 500, cuentaPago: "efectivo", referencia: "Pago parcial", registradoPor: "u1" },
  { id: "pg2", facturaId: "f3", fecha: Date.now() - 86400000 * 8, monto: 7888, cuentaPago: "amex",     referencia: "Voucher 5523",  registradoPor: "u1" },
];

const SEED_AUDIT = [
  { id: "a1", ts: Date.now() - 3600000 * 2, userId: "u4", action: "Creó requisición REQ-2026-0118" },
  { id: "a2", ts: Date.now() - 3600000 * 26, userId: "u1", action: "Aprobó requisición REQ-2026-0117" },
  { id: "a3", ts: Date.now() - 3600000 * 50, userId: "u3", action: "Capturó inventario en Barra" },
  { id: "a4", ts: Date.now() - 3600000 * 74, userId: "u1", action: "Dio de alta el producto Mezcal Tobalá Real Minero" },
  { id: "a5", ts: Date.now() - 3600000 * 96, userId: "u2", action: "Creó requisición REQ-2026-0116" },
];

// Seed schedule — current week, mirrors the WhatsApp screenshot pattern
function seedSchedules() {
  const today = new Date();
  const wk = weekStart(today);
  const prev = addDays(wk, -7);
  const W = (from, to) => ({ type: "work", from: parseTime(from), to: parseTime(to) });
  const R = () => ({ type: "rest" });

  // Pattern from screenshot: Lun=descanso some, Mar–Sáb work, Dom early
  const pattern = {
    u2:  [R(),               W("1 PM","10:30 PM"), W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("1 PM","6:30 PM")], // Ana piso
    u3:  [R(),               W("1 PM","10:30 PM"), W("1 PM","10:30 PM"),W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","6:30 PM")], // Mateo barra
    u4:  [R(),               R(),                  W("2 PM","11 PM"),   W("2 PM","11 PM"),   W("2 PM","11 PM"),   W("2 PM","11 PM"),   W("1 PM","6:30 PM")], // Lucía cocina
    u5:  [R(),               W("1 PM","10:30 PM"), R(),                 W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("1 PM","6:30 PM")], // Aldo cocina
    u6:  [R(),               W("1 PM","10:30 PM"), W("1 PM","10:30 PM"),W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("12 PM","11 PM"),  W("1 PM","6:30 PM")], // Ramses cocina
    u7:  [R(),               W("1 PM","10:30 PM"), W("1 PM","10:30 PM"),W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","6:30 PM")], // Oscar barra
    u8:  [R(),               W("1 PM","10:30 PM"), W("1 PM","10:30 PM"),W("1 PM","12 AM"),   W("4 PM","12 AM"),   W("1 PM","12 AM"),   R()],                 // Conrado piso
    u9:  [R(),               W("1 PM","10:30 PM"), W("1 PM","10:30 PM"),W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","6:30 PM")], // Miros piso
    u10: [R(),               W("1 PM","10:30 PM"), R(),                 W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","12 AM"),   W("1 PM","6:30 PM")], // Ismael piso
    u11: [R(),               R(),                  W("2 PM","11 PM"),   W("2 PM","11 PM"),   W("2 PM","11 PM"),   W("2 PM","11 PM"),   W("1 PM","6:30 PM")], // Jessica cocina
  };

  const buildWeek = (weekKey, status) => {
    const entries = {};
    Object.entries(pattern).forEach(([userId, days]) => {
      days.forEach((shift, i) => {
        entries[`${userId}|${i}`] = shift;
      });
    });
    return { week: weekKey, status, entries, publishedAt: status === "published" ? Date.now() : null };
  };

  return [
    buildWeek(prev, "published"),
    buildWeek(wk, "published"),
  ];
}

// Seed tips — días pasados de la semana
// Schema nuevo: { id, date, payTip, cashTip, sale, note }
// Lunes (dayIdx 0) cerrado, no se captura.
function seedTips() {
  const today = new Date();
  const wk = weekStart(today);
  // Sample basado en la hoja del usuario: domingo PAY=2034, EFE=386, Venta=16935
  return [
    // Semana pasada
    { id: "tip_p1", date: addDays(wk, -6), payTip: 1450, cashTip: 280, sale: 11200, note: "" }, // martes
    { id: "tip_p2", date: addDays(wk, -5), payTip: 1620, cashTip: 310, sale: 12400, note: "" }, // miércoles
    { id: "tip_p3", date: addDays(wk, -4), payTip: 1880, cashTip: 340, sale: 13600, note: "" }, // jueves
    { id: "tip_p4", date: addDays(wk, -3), payTip: 2480, cashTip: 460, sale: 18900, note: "Viernes lleno" },
    { id: "tip_p5", date: addDays(wk, -2), payTip: 2860, cashTip: 520, sale: 21300, note: "" },
    { id: "tip_p6", date: addDays(wk, -1), payTip: 2034, cashTip: 386, sale: 16935, note: "Domingo familiar" },
  ];
}

// Migración: si vienen tips con schema viejo (campo `total`), convertirlos
function migrateTip(t) {
  if (typeof t.payTip === "number" || typeof t.cashTip === "number") return t;
  if (typeof t.total === "number") {
    // Asumir 80% PAY / 20% efectivo, venta = total/0.13
    return {
      id: t.id,
      date: t.date,
      payTip: Math.round(t.total * 0.85 * 100) / 100,
      cashTip: Math.round(t.total * 0.15 * 100) / 100,
      sale: Math.round((t.total / 0.13) * 100) / 100,
      note: t.note || "",
    };
  }
  return { ...t, payTip: 0, cashTip: 0, sale: 0 };
}

// ============================================================
// TAREAS / RESPONSABILIDADES
// ============================================================

// Áreas para tareas (pueden coincidir con AREAS de inventario, pero hay más)
const TASK_AREAS = {
  cocina:    { id: "cocina",    label: "Cocina",    color: "#c08a3a" },
  barra:     { id: "barra",     label: "Barra",     color: "#a14e3a" },
  salon:     { id: "salon",     label: "Salón",     color: "#5a7a4d" },
  banos:     { id: "banos",     label: "Baños",     color: "#6b7561" },
  lavaloza:  { id: "lavaloza",  label: "Lavaloza",  color: "#8a7a4f" },
  generales: { id: "generales", label: "Generales", color: "#46524a" },
};

// Turnos
const TASK_SHIFTS = {
  apertura: { id: "apertura", label: "Apertura", short: "AP" },
  durante:  { id: "durante",  label: "Durante",  short: "DU" },
  cierre:   { id: "cierre",   label: "Cierre",   short: "CI" },
};

// Frecuencia
const TASK_FREQS = {
  diaria:  { id: "diaria",  label: "Diaria" },
  semanal: { id: "semanal", label: "Semanal" },
};

// Estados de un registro de tarea
const TASK_STATUS = {
  pendiente: { id: "pendiente", label: "Pendiente", color: "#6b7561" },
  hecha:     { id: "hecha",     label: "Por auditar", color: "#c4a04f" },
  aprobada:  { id: "aprobada",  label: "Aprobada",  color: "#5a7a4d" },
  rechazada: { id: "rechazada", label: "Rechazada", color: "#a14e3a" },
};

// Catálogo de tareas — 40+
const SEED_TASKS = [
  // COCINA — APERTURA
  { id: "t01", name: "Encender estufa y plancha",        area: "cocina", shift: "apertura", freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t02", name: "Verificar temperatura de cámaras", area: "cocina", shift: "apertura", freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t03", name: "Recibir y acomodar mercancía",     area: "cocina", shift: "apertura", freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t04", name: "Mise en place estaciones",         area: "cocina", shift: "apertura", freq: "diaria",  rolesAllowed: ["cocina"] },
  // COCINA — DURANTE
  { id: "t05", name: "Trapear cocina (servicio)",        area: "cocina", shift: "durante",  freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t06", name: "Reabastecer estaciones",           area: "cocina", shift: "durante",  freq: "diaria",  rolesAllowed: ["cocina"] },
  // COCINA — CIERRE
  { id: "t07", name: "Trapear cocina (cierre)",          area: "cocina", shift: "cierre",   freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t08", name: "Lavar parrilla y plancha",         area: "cocina", shift: "cierre",   freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t09", name: "Sacar basura cocina",              area: "cocina", shift: "cierre",   freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t10", name: "Lavar filtros de campana",         area: "cocina", shift: "cierre",   freq: "semanal", rolesAllowed: ["cocina"] },
  { id: "t11", name: "Limpiar refrigerador profundo",    area: "cocina", shift: "cierre",   freq: "semanal", rolesAllowed: ["cocina"] },
  { id: "t12", name: "Lavar paredes cocina",             area: "cocina", shift: "cierre",   freq: "semanal", rolesAllowed: ["cocina"] },

  // BARRA — APERTURA
  { id: "t13", name: "Surtir hielo y vasos",             area: "barra",  shift: "apertura", freq: "diaria",  rolesAllowed: ["barra"] },
  { id: "t14", name: "Preparar guarniciones",            area: "barra",  shift: "apertura", freq: "diaria",  rolesAllowed: ["barra"] },
  { id: "t15", name: "Verificar inventario destilados",  area: "barra",  shift: "apertura", freq: "diaria",  rolesAllowed: ["barra"] },
  // BARRA — CIERRE
  { id: "t16", name: "Lavar barra completa",             area: "barra",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["barra"] },
  { id: "t17", name: "Trapear barra",                    area: "barra",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["barra"] },
  { id: "t18", name: "Limpiar refri de cervezas",        area: "barra",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["barra"] },
  { id: "t19", name: "Pulir vasos y copas",              area: "barra",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["barra"] },
  { id: "t20", name: "Limpiar máquina de hielo",         area: "barra",  shift: "cierre",   freq: "semanal", rolesAllowed: ["barra"] },
  { id: "t21", name: "Lavar tarja y descalcificar",      area: "barra",  shift: "cierre",   freq: "semanal", rolesAllowed: ["barra"] },

  // SALÓN — APERTURA
  { id: "t22", name: "Montar mesas y servilletas",       area: "salon",  shift: "apertura", freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t23", name: "Pulir cubiertos",                  area: "salon",  shift: "apertura", freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t24", name: "Verificar reservas y plano",       area: "salon",  shift: "apertura", freq: "diaria",  rolesAllowed: ["piso"] },
  // SALÓN — CIERRE
  { id: "t25", name: "Trapear salón",                    area: "salon",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t26", name: "Limpiar comedor (mesas y sillas)", area: "salon",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t27", name: "Recoger y guardar manteles",       area: "salon",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t28", name: "Trapear escaleras",                area: "salon",  shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t29", name: "Limpiar ventanas y vidrios",       area: "salon",  shift: "cierre",   freq: "semanal", rolesAllowed: ["piso"] },
  { id: "t30", name: "Aspirar alfombras",                area: "salon",  shift: "cierre",   freq: "semanal", rolesAllowed: ["piso"] },

  // BAÑOS
  { id: "t31", name: "Limpiar baños — ligera (servicio)", area: "banos", shift: "durante",  freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t32", name: "Lavar baños — profunda (cierre)",   area: "banos", shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t33", name: "Reabastecer papel y jabón",         area: "banos", shift: "apertura", freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t34", name: "Trapear baños",                     area: "banos", shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso"] },

  // LAVALOZA
  { id: "t35", name: "Lavar trastes durante servicio",    area: "lavaloza", shift: "durante", freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t36", name: "Trapear área de lavaloza",          area: "lavaloza", shift: "cierre",  freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t37", name: "Lavar tarjas y rejillas",           area: "lavaloza", shift: "cierre",  freq: "diaria",  rolesAllowed: ["cocina"] },
  { id: "t38", name: "Descalcificar lavavajillas",        area: "lavaloza", shift: "cierre",  freq: "semanal", rolesAllowed: ["cocina"] },

  // GENERALES
  { id: "t39", name: "Sacar basura general",              area: "generales", shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso", "barra", "cocina"] },
  { id: "t40", name: "Apagar luces y cerrar",             area: "generales", shift: "cierre",   freq: "diaria",  rolesAllowed: ["piso", "barra", "cocina"] },
  { id: "t41", name: "Revisar entrada y banqueta",        area: "generales", shift: "apertura", freq: "diaria",  rolesAllowed: ["piso"] },
  { id: "t42", name: "Limpieza profunda almacén",         area: "generales", shift: "cierre",   freq: "semanal", rolesAllowed: ["piso", "barra", "cocina"] },
];

// Plantilla semanal: { taskId|dayIdx: userId } — recurrente, se aplica cada semana
// Vacío por defecto; el admin lo arma. Pre-llenamos algo para demo.
function seedTaskTemplate(users) {
  const template = {};
  // Helper rotación simple
  const cocineros = users.filter(u => u.role === "cocina").map(u => u.id);
  const barras    = users.filter(u => u.role === "barra").map(u => u.id);
  const pisos     = users.filter(u => u.role === "piso").map(u => u.id);
  const pickRot = (arr, i) => arr.length ? arr[i % arr.length] : null;

  SEED_TASKS.forEach((task, taskIdx) => {
    // Solo días Mar–Dom (1..6); lunes cerrado
    for (let day = 1; day <= 6; day++) {
      // Diarias: asignar todos los días. Semanales: solo viernes (día 4)
      if (task.freq === "semanal" && day !== 4) continue;
      const pool = task.area === "cocina" || task.area === "lavaloza" ? cocineros
                : task.area === "barra" ? barras
                : pisos;
      const uid = pickRot(pool, taskIdx + day);
      if (uid) template[`${task.id}|${day}`] = uid;
    }
  });
  return template;
}

// Registros de completado — generamos historial reciente para demo
// Records: { id, taskId, userId, dateISO, status, employeeNote, adminNote, completedAt, auditedAt, auditedBy }
function seedTaskRecords(users) {
  const records = [];
  const today = TersoStore.toISO ? TersoStore.toISO(new Date()) : (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  })();
  const todayDate = new Date(today);

  // Generar 14 días hacia atrás
  for (let back = 14; back >= 1; back--) {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - back);
    if (d.getDay() === 1) continue; // skip lunes (getDay: domingo=0, lunes=1)
    const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    const dayIdx = (d.getDay() + 6) % 7; // Lun=0 ... Dom=6

    SEED_TASKS.forEach((task, ti) => {
      if (task.freq === "semanal" && dayIdx !== 4) return;
      // Pseudo-random pero determinista
      const seed = (ti + back * 7) % 100;
      const pool = task.area === "cocina" || task.area === "lavaloza"
        ? users.filter(u => u.role === "cocina")
        : task.area === "barra"
        ? users.filter(u => u.role === "barra")
        : users.filter(u => u.role === "piso");
      if (!pool.length) return;
      const user = pool[(ti + back) % pool.length];
      // 70% aprobada, 12% rechazada, 10% hecha (sin auditar), 8% pendiente
      let status;
      if (seed < 70) status = "aprobada";
      else if (seed < 82) status = "rechazada";
      else if (seed < 92) status = "hecha";
      else status = "pendiente";
      records.push({
        id: `r_${ti}_${back}`,
        taskId: task.id,
        userId: user.id,
        dateISO: iso,
        status,
        employeeNote: status === "rechazada" && seed % 5 === 0 ? "Faltó material, terminé a medias" : "",
        adminNote: status === "rechazada" ? "Rehacer — área sucia" : "",
        completedAt: status !== "pendiente" ? d.getTime() : null,
        auditedAt: (status === "aprobada" || status === "rechazada") ? d.getTime() + 3600000 : null,
        auditedBy: (status === "aprobada" || status === "rechazada") ? "u1" : null,
      });
    });
  }
  return records;
}

const DEFAULT_STATE = {
  users: SEED_USERS,
  proveedores: SEED_PROVEEDORES,
  products: SEED_PRODUCTS,
  requisiciones: SEED_REQUISICIONES,
  facturas: SEED_FACTURAS,
  pagos: SEED_PAGOS,
  audit: SEED_AUDIT,
  inventoryHistory: [],
  schedules: [],
  tips: [],
  tipPayments: {},
  taskCatalog: SEED_TASKS,
  taskTemplate: {},
  taskOverrides: {},
  taskRecords: [],
  session: null,
};

function buildSeedState() {
  return {
    users: SEED_USERS,
    proveedores: SEED_PROVEEDORES,
    products: SEED_PRODUCTS,
    requisiciones: SEED_REQUISICIONES,
    facturas: SEED_FACTURAS,
    pagos: SEED_PAGOS,
    audit: SEED_AUDIT,
    inventoryHistory: [],
    schedules: seedSchedules(),
    tips: seedTips(),
    tipPayments: {},
    taskCatalog: SEED_TASKS,
    taskTemplate: seedTaskTemplate(SEED_USERS),
    taskOverrides: {},
    taskRecords: seedTaskRecords(SEED_USERS),
    session: null,
  };
}

// Carga desde Supabase. Si la tabla `employees` está vacía (primera vez),
// siembra las tablas con los datos demo y devuelve el estado sembrado.
async function loadState() {
  try {
    const empty = await SupabaseRepo.isEmpty();
    if (empty) {
      const seed = buildSeedState();
      await SupabaseRepo.seedAll(seed);
      return seed;
    }
    const loaded = await SupabaseRepo.loadAll();
    return {
      users: loaded.users || [],
      proveedores: loaded.proveedores || [],
      products: loaded.products || [],
      requisiciones: loaded.requisiciones || [],
      facturas: loaded.facturas || [],
      pagos: loaded.pagos || [],
      audit: loaded.audit || [],
      inventoryHistory: loaded.inventoryHistory || [],
      schedules: loaded.schedules || [],
      tips: (loaded.tips || []).map(migrateTip),
      tipPayments: loaded.tipPayments || {},
      taskCatalog: loaded.taskCatalog?.length ? loaded.taskCatalog : SEED_TASKS,
      taskTemplate: loaded.taskTemplate || {},
      taskOverrides: loaded.taskOverrides || {},
      taskRecords: loaded.taskRecords || [],
      session: null,
    };
  } catch (e) {
    console.error('[TersoStore] loadState failed:', e);
    throw e;
  }
}

// Persiste cambios entre prev y next a Supabase. La sesión es local-only.
async function saveState(prev, next) {
  await SupabaseRepo.saveAll(prev, next);
}

function uid(prefix = "id") {
  return prefix + "_" + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtDateTime(ts) {
  const d = new Date(ts);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
function fmtRelative(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  return `hace ${d} d`;
}

function nextFolio(reqs) {
  const year = new Date().getFullYear();
  const max = reqs.reduce((m, r) => {
    const match = (r.folio || "").match(/-(\d{4})$/);
    return match ? Math.max(m, parseInt(match[1])) : m;
  }, 0);
  return `REQ-${year}-${String(max + 1).padStart(4, "0")}`;
}

// Calcula propina del día con la nueva lógica
// tip = { payTip, cashTip, sale }
// Returns { netPool, cocinaPool, salonPool, totalNetPct }
function computeTipPools(tip) {
  const payNet = (tip.payTip || 0) * (1 - CARD_FEE);
  const cashNet = (tip.cashTip || 0);
  const netPool = payNet + cashNet;
  const sale = tip.sale || 0;
  const cocinaTarget = sale * COCINA_VENTA_PCT;
  const cocinaPool = Math.min(cocinaTarget, netPool);
  const salonPool = Math.max(0, netPool - cocinaPool);
  return {
    payNet,
    cashNet,
    netPool,
    cocinaPool,
    salonPool,
    cocinaTarget,
    totalNetPct: sale > 0 ? netPool / sale : 0,
  };
}

const TersoStore = {
  ROLES, AREAS, PRESENTACIONES, DAYS, TIP_SPLIT, CARD_FEE, COCINA_VENTA_PCT,
  PAYMENT_ACCOUNTS, FACTURA_STATUS, REQ_STATUS, IVA_RATE,
  TASK_AREAS, TASK_SHIFTS, TASK_FREQS, TASK_STATUS,
  loadState, saveState, uid, fmtDate, fmtDateTime, fmtRelative, nextFolio,
  toISO, fromISO, weekStart, addDays, fmtWeekRange,
  parseTime, fmtTime, shiftLabel, shiftHours, tipPool, computeTipPools,
};

export default TersoStore;
export { TersoStore };
