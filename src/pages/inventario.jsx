// ============================================================
// TERSO — Inventario · Página principal
// Tabs: Hoy | Historial | Comparar
// ============================================================

// ── Excel export ─────────────────────────────────────────────
import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import InventarioDB from '../lib/inventarioDB';
import * as XLSX from 'xlsx';
import { Icon, Button, Segmented, Stepper, useToast, Empty, PageHead, Sheet } from '../components/ui';

const exportarConteoExcel = (conteo, eventos) => {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Productos
  const header = ["Producto", "Mínimo", "Presentación", "Capturado", "Diferencia vs mín", "Estado"];
  const rows = (conteo.productos || []).map(p => [
    p.nombre,
    p.min,
    p.presentacion || "",
    p.capturado,
    p.capturado - p.min,
    p.capturado < p.min ? "BAJO" : "OK",
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws1["!cols"] = [{ wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 10 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Inventario");

  // Hoja 2: Info del conteo
  const info = [
    ["Área", TersoStore.AREAS[conteo.area]?.label || conteo.area],
    ["Fecha", conteo.fecha],
    ["Estado", conteo.status === "cerrado" ? "Cerrado" : "Abierto"],
    ["Creado por", conteo.creadoPor?.nombre || ""],
    ["Creado", conteo.creadoTs ? new Date(conteo.creadoTs).toLocaleString("es-MX") : ""],
    ["Cerrado por", conteo.cerradoPor?.nombre || ""],
    ["Cerrado", conteo.cerradoTs ? new Date(conteo.cerradoTs).toLocaleString("es-MX") : ""],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(info);
  ws2["!cols"] = [{ wch: 16 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Info");

  // Hoja 3: Historial de cambios
  if (eventos && eventos.length > 0) {
    const evHeader = ["Fecha/Hora", "Tipo", "Usuario", "Motivo", "Producto", "Antes", "Después"];
    const evRows = [];
    eventos.forEach(ev => {
      if (!ev.cambios || ev.cambios.length === 0) {
        evRows.push([
          new Date(ev.ts).toLocaleString("es-MX"),
          ev.tipo === "reapertura" ? "Reapertura" : "Modificación",
          ev.userName, ev.motivo || "", "", "", ""
        ]);
      } else {
        ev.cambios.forEach((c, i) => evRows.push([
          i === 0 ? new Date(ev.ts).toLocaleString("es-MX") : "",
          i === 0 ? (ev.tipo === "reapertura" ? "Reapertura" : "Modificación") : "",
          i === 0 ? ev.userName : "",
          i === 0 ? (ev.motivo || "") : "",
          c.nombre, c.antes, c.despues
        ]));
      }
    });
    const ws3 = XLSX.utils.aoa_to_sheet([evHeader, ...evRows]);
    ws3["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 28 }, { wch: 24 }, { wch: 8 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws3, "Modificaciones");
  }

  const fname = `inventario-${conteo.area}-${conteo.fecha}.xlsx`;
  XLSX.writeFile(wb, fname);
};

const exportarTodosExcel = async () => {
  const todos = await InventarioDB.getAllConteos();
  todos.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.area.localeCompare(b.area));

  const wb = XLSX.utils.book_new();
  const header = ["Fecha", "Área", "Estado", "Productos", "Bajos mínimo", "Creado por", "Cerrado por", "Fecha cierre"];
  const rows = todos.map(c => {
    const bajos = (c.productos || []).filter(p => p.capturado < p.min).length;
    return [
      c.fecha,
      TersoStore.AREAS[c.area]?.label || c.area,
      c.status === "cerrado" ? "Cerrado" : "Abierto",
      c.productos?.length || 0,
      bajos,
      c.creadoPor?.nombre || "",
      c.cerradoPor?.nombre || "",
      c.cerradoTs ? new Date(c.cerradoTs).toLocaleDateString("es-MX") : "",
    ];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws, "Resumen");
  XLSX.writeFile(wb, `inventario-historial-${InventarioDB.hoy()}.xlsx`);
};

// ── helpers ──────────────────────────────────────────────────
const fmtFecha = iso => {
  const [y, m, d] = iso.split("-");
  const meses = ["","Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  return `${d} ${meses[+m]} ${y}`;
};
const fmtTs = ts => {
  const d = new Date(ts);
  return d.toLocaleDateString("es-MX", { day:"2-digit", month:"short", hour:"2-digit", minute:"2-digit" });
};
const statusChip = s => s === "cerrado"
  ? <span className="t-chip" style={{ background: "rgba(46,61,42,0.12)", color: "var(--t-ink)", fontSize: 11 }}>🔒 Cerrado</span>
  : <span className="t-chip" style={{ background: "rgba(246,195,64,0.25)", color: "#7a5f00", fontSize: 11 }}>✏️ Abierto</span>;

// ── ProductoRow ───────────────────────────────────────────────
const ProductoRow = ({ p, draft, onChange, readOnly }) => {
  const val     = draft !== undefined ? draft : p.capturado;
  const changed = draft !== undefined && draft !== p.capturado;
  const low     = val < p.min;
  const ratio   = p.min > 0 ? val / p.min : 1;
  return (
    <div className="t-card" style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12,
      borderColor: changed ? "var(--t-green)" : "var(--t-line)",
      boxShadow: changed ? "0 0 0 3px rgba(46,61,42,0.08)" : undefined }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 500, fontSize: 14 }}>{p.nombre}</div>
        <div style={{ fontSize: 11.5, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
          mín {p.min} {p.presentacion}
        </div>
        <div style={{ marginTop: 6, height: 4, background: "rgba(46,61,42,0.1)", borderRadius: 999, overflow: "hidden", maxWidth: 160 }}>
          <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: "100%",
            background: low ? "var(--t-danger)" : "var(--t-ok)", transition: "width 320ms var(--ease-apple)" }} />
        </div>
      </div>
      {low && !readOnly && <span className="t-chip t-chip--danger" style={{ fontSize: 10 }}>BAJO</span>}
      {readOnly
        ? <div style={{ fontWeight: 700, fontSize: 22, minWidth: 44, textAlign: "right", color: low ? "var(--t-danger)" : "var(--t-ink)" }}>{val}</div>
        : <Stepper value={val} onChange={onChange} />
      }
    </div>
  );
};

// ── AuditLog ─────────────────────────────────────────────────
const AuditLog = ({ eventos }) => {
  if (!eventos || eventos.length === 0) return null;
  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t-muted)", marginBottom: 8 }}>
        Historial de modificaciones
      </div>
      {eventos.map(ev => (
        <div key={ev.id} style={{ padding: "10px 14px", borderLeft: "3px solid var(--t-line)", marginBottom: 8, background: "rgba(46,61,42,0.03)", borderRadius: "0 8px 8px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              {ev.tipo === "reapertura" ? "🔓 Reapertura" : "✏️ Modificación"} · {ev.userName}
            </span>
            <span style={{ fontSize: 11, color: "var(--t-muted)" }}>{fmtTs(ev.ts)}</span>
          </div>
          {ev.motivo && <div style={{ fontSize: 12, color: "var(--t-muted)", marginBottom: 4 }}>"{ev.motivo}"</div>}
          {ev.cambios && ev.cambios.map((c, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--t-muted)" }}>
              {c.nombre}: <span style={{ color: "var(--t-danger)" }}>{c.antes}</span> → <span style={{ color: "var(--t-ok)", fontWeight: 600 }}>{c.despues}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

// ── TabHoy ───────────────────────────────────────────────────
const TabHoy = ({ state, currentUser }) => {
  const isAdmin = currentUser.role === "admin";
  const role    = TersoStore.ROLES[currentUser.role];
  const areas   = isAdmin ? Object.keys(TersoStore.AREAS) : role.areas;

  const [area, setArea]         = useState(areas[0]);
  const [conteos, setConteos]   = useState([]);
  const [conteo, setConteo]     = useState(null);
  const [drafts, setDrafts]     = useState({});
  const [eventos, setEventos]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showReopen, setShowReopen] = useState(false);
  const [motivo, setMotivo]     = useState("");
  const toast = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const lista = await InventarioDB.getConteosPorArea(area);
      // ordenado desc por creadoTs (más reciente primero)
      lista.sort((a, b) => (b.creadoTs || 0) - (a.creadoTs || 0));
      setConteos(lista);
      const activo = lista.length ? lista[0] : null;
      setConteo(activo);
      setDrafts({});
      if (activo) {
        const evs = await InventarioDB.getEventos(activo.id);
        setEventos(evs);
      } else {
        setEventos([]);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const seleccionarConteo = async c => {
    setConteo(c);
    setDrafts({});
    const evs = await InventarioDB.getEventos(c.id);
    setEventos(evs);
  };

  useEffect(() => { load(); }, [area]);

  // productos del área del catálogo
  const productosArea = useMemo(() =>
    state.products.filter(p => p.area === area)
      .map(p => ({ productId: p.id, nombre: p.name, presentacion: p.presentacion || p.unit || "", min: p.min, capturado: p.current })),
    [state.products, area]
  );

  const iniciarConteo = async () => {
    try {
      const c = await InventarioDB.crearConteo({
        fecha: InventarioDB.hoy(), area,
        productos: productosArea,
        userId: currentUser.id, userName: currentUser.name,
      });
      setConteos(prev => [c, ...prev]);
      setConteo(c); setDrafts({}); setEventos([]);
      toast("Conteo iniciado");
    } catch(e) { toast(e.message || "Error al iniciar"); }
  };

  const guardar = async () => {
    if (!conteo) return;
    const productosCopy = conteo.productos.map(p => ({ ...p, capturado: drafts[p.productId] !== undefined ? drafts[p.productId] : p.capturado }));
    const cambios = conteo.productos
      .filter(p => drafts[p.productId] !== undefined && drafts[p.productId] !== p.capturado)
      .map(p => ({ productId: p.productId, nombre: p.nombre, antes: p.capturado, despues: drafts[p.productId] }));
    try {
      const c = await InventarioDB.actualizarProductos({ conteoId: conteo.id, productos: productosCopy, userId: currentUser.id, userName: currentUser.name, cambios });
      setConteo(c); setDrafts({});
      const evs = await InventarioDB.getEventos(c.id);
      setEventos(evs);
      toast(`Guardado · ${cambios.length} cambios`);
    } catch(e) { toast(e.message || "Error al guardar"); }
  };

  const cerrar = async () => {
    if (!conteo) return;
    const productosCopy = conteo.productos.map(p => ({ ...p, capturado: drafts[p.productId] !== undefined ? drafts[p.productId] : p.capturado }));
    try {
      const c = await InventarioDB.cerrarConteo({ conteoId: conteo.id, productos: productosCopy, userId: currentUser.id, userName: currentUser.name });
      setConteo(c); setDrafts({});
      toast("Conteo cerrado y bloqueado 🔒");
    } catch(e) { toast(e.message || "Error al cerrar"); }
  };

  const reabrir = async () => {
    if (!conteo) return;
    try {
      const c = await InventarioDB.reabrirConteo({ conteoId: conteo.id, userId: currentUser.id, userName: currentUser.name, motivo });
      setConteo(c);
      const evs = await InventarioDB.getEventos(c.id);
      setEventos(evs);
      setShowReopen(false); setMotivo("");
      toast("Conteo reabierto ✓");
    } catch(e) { toast(e.message || "Error al reabrir"); }
  };

  const dirty = Object.keys(drafts).length;
  const productos = conteo ? conteo.productos : [];
  const isCerrado = conteo && conteo.status === "cerrado";
  const readOnly  = isCerrado;

  const bajos = productos.filter(p => {
    const v = drafts[p.productId] !== undefined ? drafts[p.productId] : p.capturado;
    return v < p.min;
  });

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--t-muted)" }}>Cargando…</div>;

  return (
    <div>
      {/* Selector de área */}
      <div style={{ marginBottom: 20 }}>
        <Segmented value={area} onChange={v => { setArea(v); }} options={areas.map(a => ({ value: a, label: TersoStore.AREAS[a].label }))} />
      </div>

      {/* Selector + botón Nuevo conteo (fuera del header del conteo) */}
      {(conteos.length > 1 || isCerrado) && (
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          {conteos.length > 1 ? (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 11, color: "var(--t-muted)", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Conteos recientes:</span>
              {conteos.slice(0, 5).map((c) => (
                <button key={c.id} onClick={() => seleccionarConteo(c)}
                  style={{ padding: "5px 12px", borderRadius: 20, border: "1.5px solid var(--t-line)", background: conteo?.id === c.id ? "var(--t-ink)" : "transparent", color: conteo?.id === c.id ? "#fff" : "var(--t-ink)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  {fmtFecha(c.fecha)} {c.status === "cerrado" ? "🔒" : "✏️"}
                </button>
              ))}
            </div>
          ) : <div />}
          {isCerrado && (
            <Button icon="plus" onClick={iniciarConteo}>Nuevo conteo</Button>
          )}
        </div>
      )}

      {/* Header del conteo */}
      <div className="t-card" style={{ padding: "16px 20px", marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{TersoStore.AREAS[area]?.label}{conteo && <> · {fmtFecha(conteo.fecha)}</>}</div>
          <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 2 }}>
            {conteo ? `${productos.length} productos` : "Sin conteo activo"}
            {conteo?.creadoPor && <> · Iniciado por {conteo.creadoPor.nombre}</>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {conteo && statusChip(conteo.status)}
          {!conteo && (
            <Button icon="plus" onClick={iniciarConteo}>Iniciar conteo</Button>
          )}
          {conteo && !isCerrado && dirty > 0 && (
            <Button variant="ghost" onClick={() => setDrafts({})}>Descartar</Button>
          )}
          {conteo && !isCerrado && dirty > 0 && (
            <Button variant="ghost" icon="check" onClick={guardar}>Guardar ({dirty})</Button>
          )}
          {conteo && !isCerrado && (
            <Button icon="lock" onClick={cerrar}>Cerrar conteo</Button>
          )}
          {conteo && isCerrado && isAdmin && (
            <Button variant="ghost" onClick={() => setShowReopen(true)}>🔓 Reabrir</Button>
          )}
          {conteo && (
            <Button variant="ghost" icon="download" onClick={() => exportarConteoExcel(conteo, eventos)}>Excel</Button>
          )}
        </div>
      </div>

      {/* Modal de reapertura */}
      {showReopen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="t-card" style={{ padding: 28, width: 380, maxWidth: "92vw" }}>
            <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 8 }}>Reabrir conteo</div>
            <div style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 16 }}>Esta acción quedará registrada en el historial de modificaciones.</div>
            <label style={{ fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Motivo de reapertura</label>
            <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
              placeholder="Ej. Error de captura en pollo"
              style={{ width: "100%", height: 80, border: "1.5px solid var(--t-line)", borderRadius: 10, padding: "10px 12px", fontSize: 13, fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => { setShowReopen(false); setMotivo(""); }}>Cancelar</Button>
              <Button onClick={reabrir} disabled={!motivo.trim()}>Reabrir</Button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de productos */}
      {conteo && (
        <div>
          {bajos.length > 0 && !isCerrado && (
            <div style={{ padding: "10px 14px", background: "rgba(220,50,47,0.08)", borderRadius: 10, marginBottom: 14, fontSize: 13, color: "var(--t-danger)", fontWeight: 500 }}>
              ⚠️ {bajos.length} producto{bajos.length > 1 ? "s" : ""} bajo mínimo: {bajos.map(p => p.nombre).join(", ")}
            </div>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
            {productos.map(p => (
              <ProductoRow key={p.productId} p={p}
                draft={drafts[p.productId]}
                onChange={v => setDrafts(d => ({ ...d, [p.productId]: v }))}
                readOnly={readOnly} />
            ))}
          </div>
          <AuditLog eventos={eventos} />
        </div>
      )}
    </div>
  );
};

// ── TabHistorial ──────────────────────────────────────────────
const TabHistorial = ({ currentUser }) => {
  const isAdmin = currentUser.role === "admin";
  const [conteos, setConteos]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [eventos, setEventos]   = useState([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    (async () => {
      const all = await InventarioDB.getAllConteos();
      all.sort((a, b) => b.fecha.localeCompare(a.fecha) || a.area.localeCompare(b.area));
      setConteos(all);
      setLoading(false);
    })();
  }, []);

  const verConteo = async c => {
    setSelected(c);
    const evs = await InventarioDB.getEventos(c.id);
    setEventos(evs);
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--t-muted)" }}>Cargando historial…</div>;
  if (!conteos.length) return <Empty title="Sin historial" body="Aún no hay conteos guardados." />;

  // últimos 5 (acceso rápido) y agrupado por fecha (lista completa)
  const ultimos5 = conteos.slice(0, 5);
  const porFecha = {};
  conteos.forEach(c => { (porFecha[c.fecha] = porFecha[c.fecha] || []).push(c); });

  return (
    <div style={{ display: "grid", gridTemplateColumns: selected ? "1fr 1.4fr" : "1fr", gap: 16 }}>
      {/* Lista */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t-muted)" }}>Últimos 5 conteos</div>
          <Button variant="ghost" icon="download" onClick={exportarTodosExcel}>Exportar todo</Button>
        </div>
        <div style={{ marginBottom: 24 }}>
          {ultimos5.map(c => (
            <div key={c.id} onClick={() => verConteo(c)}
              className="t-card"
              style={{ padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                background: selected?.id === c.id ? "rgba(46,61,42,0.06)" : undefined,
                borderColor: selected?.id === c.id ? "var(--t-green)" : "var(--t-line)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{TersoStore.AREAS[c.area]?.label || c.area} · {fmtFecha(c.fecha)}</div>
                <div style={{ fontSize: 11.5, color: "var(--t-muted)" }}>
                  {c.productos?.length || 0} productos · {c.creadoPor?.nombre}
                  {c.cerradoPor && <> · cerrado por {c.cerradoPor.nombre}</>}
                </div>
              </div>
              {statusChip(c.status)}
            </div>
          ))}
        </div>

        {conteos.length > 5 && (
          <>
            <div style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--t-muted)", marginBottom: 8, paddingTop: 8, borderTop: "1px solid var(--t-line)" }}>Todo el historial</div>
            {Object.entries(porFecha).map(([fecha, list]) => (
              <div key={fecha} style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--t-muted)", marginBottom: 8 }}>
                  {fmtFecha(fecha)}
                </div>
                {list.map(c => (
                  <div key={c.id} onClick={() => verConteo(c)}
                    className="t-card"
                    style={{ padding: "12px 16px", marginBottom: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 12,
                      background: selected?.id === c.id ? "rgba(46,61,42,0.06)" : undefined,
                      borderColor: selected?.id === c.id ? "var(--t-green)" : "var(--t-line)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{TersoStore.AREAS[c.area]?.label || c.area}</div>
                      <div style={{ fontSize: 11.5, color: "var(--t-muted)" }}>
                        {c.productos?.length || 0} productos · {c.creadoPor?.nombre}
                        {c.cerradoPor && <> · cerrado por {c.cerradoPor.nombre}</>}
                      </div>
                    </div>
                    {statusChip(c.status)}
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Detalle */}
      {selected && (
        <div className="t-card" style={{ padding: 20, alignSelf: "start", position: "sticky", top: 80 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{TersoStore.AREAS[selected.area]?.label} · {fmtFecha(selected.fecha)}</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <Button variant="ghost" icon="download" onClick={() => exportarConteoExcel(selected, eventos)}>Excel</Button>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "var(--t-muted)" }}>✕</button>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "var(--t-muted)", marginBottom: 16 }}>
            {statusChip(selected.status)}
            {selected.cerradoTs && <> · Cerrado {fmtTs(selected.cerradoTs)}</>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {(selected.productos || []).map(p => {
              const low = p.capturado < p.min;
              return (
                <div key={p.productId} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--t-line)" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{p.nombre}</span>
                    <span style={{ fontSize: 11, color: "var(--t-muted)", marginLeft: 6 }}>mín {p.min}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 16, color: low ? "var(--t-danger)" : "var(--t-ink)" }}>{p.capturado}</span>
                </div>
              );
            })}
          </div>
          <AuditLog eventos={eventos} />
        </div>
      )}
    </div>
  );
};

// ── TabComparar ───────────────────────────────────────────────
const TabComparar = ({ currentUser }) => {
  const [conteos, setConteos] = useState([]);
  const [fechaA, setFechaA]   = useState("");
  const [fechaB, setFechaB]   = useState("");
  const [areaC,  setAreaC]    = useState("cocina");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const all = await InventarioDB.getAllConteos();
      all.sort((a, b) => b.fecha.localeCompare(a.fecha));
      setConteos(all);
      if (all.length >= 2) {
        const uniq = [...new Set(all.map(c => c.fecha))];
        setFechaA(uniq[1] || "");
        setFechaB(uniq[0] || "");
      }
      setLoading(false);
    })();
  }, []);

  const areas = [...new Set(conteos.map(c => c.area))];
  const fechas = [...new Set(conteos.map(c => c.fecha))].sort((a,b) => b.localeCompare(a));

  const conteoA = conteos.find(c => c.fecha === fechaA && c.area === areaC);
  const conteoB = conteos.find(c => c.fecha === fechaB && c.area === areaC);

  const productosA = conteoA?.productos || [];
  const productosB = conteoB?.productos || [];

  // merge por productId
  const allIds = [...new Set([...productosA.map(p => p.productId), ...productosB.map(p => p.productId)])];

  if (loading) return <div style={{ padding: 40, textAlign: "center", color: "var(--t-muted)" }}>Cargando…</div>;
  if (!conteos.length) return <Empty title="Sin datos" body="Aún no hay conteos para comparar." />;

  return (
    <div>
      {/* Filtros */}
      <div className="t-card" style={{ padding: 16, marginBottom: 20, display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end" }}>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--t-muted)" }}>ÁREA</label>
          <select value={areaC} onChange={e => setAreaC(e.target.value)}
            style={{ padding: "6px 12px", border: "1.5px solid var(--t-line)", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
            {areas.map(a => <option key={a} value={a}>{TersoStore.AREAS[a]?.label || a}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--t-muted)" }}>FECHA A (base)</label>
          <select value={fechaA} onChange={e => setFechaA(e.target.value)}
            style={{ padding: "6px 12px", border: "1.5px solid var(--t-line)", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
            {fechas.map(f => <option key={f} value={f}>{fmtFecha(f)}</option>)}
          </select>
        </div>
        <div>
          <label style={{ fontSize: 11, fontWeight: 600, display: "block", marginBottom: 4, color: "var(--t-muted)" }}>FECHA B (comparar)</label>
          <select value={fechaB} onChange={e => setFechaB(e.target.value)}
            style={{ padding: "6px 12px", border: "1.5px solid var(--t-line)", borderRadius: 8, fontSize: 13, fontFamily: "inherit" }}>
            {fechas.map(f => <option key={f} value={f}>{fmtFecha(f)}</option>)}
          </select>
        </div>
      </div>

      {(!conteoA || !conteoB) && (
        <Empty title="Sin datos para comparar" body="No hay conteos para esa área y fechas seleccionadas." />
      )}

      {conteoA && conteoB && (
        <div>
          {/* Encabezado columnas */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "8px 12px", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--t-muted)" }}>
            <div>Producto</div>
            <div style={{ textAlign: "right" }}>{fmtFecha(fechaA)}</div>
            <div style={{ textAlign: "right" }}>{fmtFecha(fechaB)}</div>
            <div style={{ textAlign: "right" }}>Diferencia</div>
          </div>
          {allIds.map(id => {
            const pa = productosA.find(p => p.productId === id);
            const pb = productosB.find(p => p.productId === id);
            const va = pa?.capturado ?? "—";
            const vb = pb?.capturado ?? "—";
            const diff = (typeof va === "number" && typeof vb === "number") ? vb - va : null;
            const pct  = diff !== null && va !== 0 ? Math.round(diff / va * 100) : null;
            const color = diff === null ? "var(--t-muted)" : diff < 0 ? "var(--t-danger)" : diff > 0 ? "var(--t-ok)" : "var(--t-muted)";
            return (
              <div key={id} className="t-card" style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 8, padding: "10px 12px", marginBottom: 6, alignItems: "center" }}>
                <div style={{ fontWeight: 500, fontSize: 13 }}>{pa?.nombre || pb?.nombre}</div>
                <div style={{ textAlign: "right", fontSize: 15, fontWeight: 600 }}>{va}</div>
                <div style={{ textAlign: "right", fontSize: 15, fontWeight: 600 }}>{vb}</div>
                <div style={{ textAlign: "right", fontWeight: 700, fontSize: 14, color }}>
                  {diff !== null ? (diff > 0 ? `+${diff}` : diff) : "—"}
                  {pct !== null && <span style={{ fontSize: 10, marginLeft: 4 }}>({pct > 0 ? "+" : ""}{pct}%)</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Page principal ────────────────────────────────────────────
const Inventario = ({ state, setState, currentUser, search }) => {
  const [tab, setTab] = useState("hoy");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    InventarioDB.init().then(() => setReady(true)).catch(console.error);
  }, []);

  if (!ready) return <div style={{ padding: 60, textAlign: "center", color: "var(--t-muted)" }}>Inicializando base de datos…</div>;

  return (
    <div className="fade-in">
      <PageHead eyebrow="Control diario" title="Inventario" />
      <div style={{ marginBottom: 20 }}>
        <Segmented value={tab} onChange={setTab} options={[
          { value: "hoy",       label: "Hoy" },
          { value: "historial", label: "Historial" },
          { value: "comparar",  label: "Comparar" },
        ]} />
      </div>
      {tab === "hoy"       && <TabHoy       state={state} currentUser={currentUser} />}
      {tab === "historial" && <TabHistorial  currentUser={currentUser} />}
      {tab === "comparar"  && <TabComparar   currentUser={currentUser} />}
    </div>
  );
};


export default Inventario;
