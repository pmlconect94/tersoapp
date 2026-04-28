// ============================================================
// TERSO — Modal admin: Revisar / Aprobar / Recibir requisición
// Productos AGRUPADOS POR PROVEEDOR
// Al recibir: 1 factura por proveedor
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import CxpHelpers from '../lib/cxpHelpers';
import { Icon, Button, Toggle, Sheet, useToast } from '../components/ui';

const ReqRevisar = ({ r, state, currentUser, onClose, onApprove, onReject, onReceive }) => {
  const u = state.users.find(x => x.id === r.userId);
  const reviewer = state.users.find(x => x.id === r.reviewedBy);
  const receiver = state.users.find(x => x.id === r.receivedBy);

  const [items, setItems] = useState(r.items.map(it => {
    const prod = state.products.find(p => p.id === it.productId);
    return {
      ...it,
      qtyAprobada: it.qtyAprobada ?? it.qtySolicitada,
      costoUnit: it.costoUnit ?? 0,
      iva: it.iva ?? false,
      ieps: it.ieps ?? 0,
      proveedorId: it.proveedorId ?? prod?.proveedor ?? state.proveedores[0]?.id,
    };
  }));

  // cuentas de pago / folios POR proveedor (cada factura puede ir a cuenta distinta)
  const initialMeta = () => {
    const meta = {};
    items.forEach(it => {
      if (!meta[it.proveedorId]) meta[it.proveedorId] = { cuentaPago: "efectivo", folio: "" };
    });
    return meta;
  };
  const [provMeta, setProvMeta] = useState(initialMeta);
  const [observaciones, setObservaciones] = useState(r.observaciones || "");
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [showRechazo, setShowRechazo] = useState(false);

  const updateItem = (pid, patch) => setItems(items.map(i => i.productId === pid ? { ...i, ...patch } : i));
  const removeItem = (pid) => setItems(items.filter(i => i.productId !== pid));
  const setProvField = (provId, key, val) => setProvMeta(m => ({ ...m, [provId]: { ...(m[provId] || { cuentaPago: "efectivo", folio: "" }), [key]: val } }));

  const isCerrada = r.status === "rechazada" || r.status === "recibida";
  const isPendiente = r.status === "pendiente";
  const isAprobada = r.status === "aprobada";
  const isRecibida = r.status === "recibida";
  const showCostos = isAprobada || isRecibida;

  // Agrupar items por proveedor
  const grupos = useMemo(() => {
    const g = {};
    items.forEach(it => {
      const pid = it.proveedorId || "__sin__";
      if (!g[pid]) g[pid] = [];
      g[pid].push(it);
    });
    return g;
  }, [items]);

  // Calcular totales por grupo
  const totalesPorProveedor = useMemo(() => {
    const out = {};
    Object.entries(grupos).forEach(([pid, list]) => {
      out[pid] = CxpHelpers.calcularReqTotales(list);
    });
    return out;
  }, [grupos]);

  const granTotal = useMemo(() => Object.values(totalesPorProveedor).reduce((s, t) => s + t.total, 0), [totalesPorProveedor]);

  const aprobar = () => {
    if (!items.length) return;
    onApprove({ items, observaciones });
  };

  const rechazar = () => {
    if (!motivoRechazo.trim()) return;
    onReject({ motivoRechazo });
  };

  const recibirYComprar = () => {
    // Validar que cada grupo tenga proveedor real y costos
    const gruposReales = Object.entries(grupos).filter(([pid]) => pid !== "__sin__");
    if (!gruposReales.length) return alert("Asigna proveedor a cada producto");

    onReceive({
      items,
      gruposPorProveedor: gruposReales.map(([provId, list]) => ({
        proveedorId: provId,
        items: list,
        totales: totalesPorProveedor[provId],
        cuentaPago: provMeta[provId]?.cuentaPago || "efectivo",
        folio: provMeta[provId]?.folio || "",
      })),
      observaciones,
    });
  };

  return (
    <Sheet wide open title={r.folio} subtitle={`${TersoStore.AREAS[r.area].label} · Solicitada por ${u?.name || "—"} · ${TersoStore.fmtRelative(r.created)}`} onClose={onClose}
      footer={
        isPendiente ? (
          <>
            <Button variant="ghost" onClick={() => setShowRechazo(true)}>Rechazar</Button>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button icon="check" onClick={aprobar}>Aprobar requisición</Button>
          </>
        ) : isAprobada ? (
          <>
            <div style={{ flex: 1 }} />
            <Button variant="ghost" onClick={onClose}>Cerrar</Button>
            <Button icon="check" onClick={recibirYComprar}>Marcar recibida y generar facturas</Button>
          </>
        ) : (
          <>
            <div style={{ flex: 1 }} />
            <Button onClick={onClose}>Cerrar</Button>
          </>
        )
      }>

      {/* Status / metadatos */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
        <ReqStatusChip status={r.status} />
        {reviewer && <span style={{ fontSize: 12, color: "var(--t-muted)" }}>Revisada por {reviewer.name} · {TersoStore.fmtDateTime(r.reviewedAt)}</span>}
        {receiver && <span style={{ fontSize: 12, color: "var(--t-muted)" }}>Recibida por {receiver.name} · {TersoStore.fmtDateTime(r.receivedAt)}</span>}
      </div>

      {r.motivoRechazo && (
        <div className="t-card" style={{ padding: 14, marginBottom: 16, background: "rgba(220,50,47,0.08)", borderColor: "var(--t-danger)" }}>
          <div className="kana" style={{ marginBottom: 4, color: "var(--t-danger)" }}>MOTIVO DE RECHAZO</div>
          <div style={{ fontSize: 13.5 }}>{r.motivoRechazo}</div>
        </div>
      )}

      {r.observaciones && (
        <div className="t-card" style={{ padding: 14, marginBottom: 16, background: "var(--t-bone)" }}>
          <div className="kana" style={{ marginBottom: 4 }}>OBSERVACIONES DEL EMPLEADO</div>
          <div style={{ fontSize: 13.5 }}>{r.observaciones}</div>
        </div>
      )}

      {/* Resumen general en aprobada/recibida */}
      {showCostos && (
        <div className="t-card" style={{ padding: 16, marginBottom: 16, background: "var(--t-cream)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div className="kana" style={{ marginBottom: 4 }}>RESUMEN DE COMPRA</div>
              <div style={{ fontSize: 13, color: "var(--t-muted)" }}>{Object.keys(grupos).length} {Object.keys(grupos).length === 1 ? "proveedor" : "proveedores"} · {items.length} productos</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "var(--t-muted)" }}>GRAN TOTAL</div>
              <div style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 22, color: "var(--t-green)" }}>{CxpHelpers.money(granTotal)}</div>
            </div>
          </div>
        </div>
      )}

      {/* GRUPOS por proveedor */}
      {Object.entries(grupos).map(([provId, list]) => {
        const prov = state.proveedores.find(p => p.id === provId);
        const provName = prov?.name || (provId === "__sin__" ? "Sin proveedor asignado" : "—");
        const t = totalesPorProveedor[provId] || { subtotal: 0, iva: 0, ieps: 0, total: 0 };
        const meta = provMeta[provId] || { cuentaPago: "efectivo", folio: "" };

        return (
          <div key={provId} className="t-card" style={{ padding: 0, marginBottom: 14, overflow: "hidden", borderColor: "var(--t-line)" }}>
            {/* Header del proveedor */}
            <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--t-line)", background: "var(--t-bone)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--t-green)", color: "var(--t-cream)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                {provName.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, letterSpacing: "-0.01em" }}>{provName}</div>
                {prov && <div style={{ fontSize: 11, color: "var(--t-muted)" }}>{prov.diasCredito} días crédito · {prov.contact} · {prov.phone}</div>}
              </div>
              <span className="t-chip">{list.length} productos</span>
              {showCostos && (
                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 15, color: "var(--t-green)" }}>{CxpHelpers.money(t.total)}</span>
              )}
            </div>

            {/* Tabla de items */}
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ fontSize: 10.5, color: "var(--t-muted)", textAlign: "left", fontWeight: 600 }}>
                    <th style={{ padding: "8px 14px" }}>PRODUCTO</th>
                    <th style={{ padding: "8px 8px", width: 60 }}>SOLIC.</th>
                    {!isCerrada && <th style={{ padding: "8px 8px", width: 70 }}>APROB.</th>}
                    {isCerrada && !isRecibida && <th style={{ padding: "8px 8px", width: 60 }}>APROB.</th>}
                    {isRecibida && <th style={{ padding: "8px 8px", width: 60 }}>RECIB.</th>}
                    {showCostos && <>
                      <th style={{ padding: "8px 8px", width: 100 }}>COSTO U.</th>
                      <th style={{ padding: "8px 8px", width: 50, textAlign: "center" }}>IVA</th>
                      <th style={{ padding: "8px 8px", width: 60 }}>IEPS%</th>
                      <th style={{ padding: "8px 14px", width: 100, textAlign: "right" }}>SUBTOTAL</th>
                    </>}
                    {!isCerrada && <th style={{ padding: "8px 8px", width: 130 }}>PROVEEDOR</th>}
                    {!isCerrada && <th style={{ width: 30 }} />}
                  </tr>
                </thead>
                <tbody>
                  {list.map(it => {
                    const p = state.products.find(x => x.id === it.productId);
                    if (!p) return null;
                    const qty = it.qtyAprobada ?? it.qtySolicitada;
                    const sub = qty * (it.costoUnit || 0);
                    return (
                      <tr key={it.productId} style={{ borderTop: "1px solid var(--t-line)" }}>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 500 }}>{p.name}</div>
                          <div style={{ fontSize: 11, color: "var(--t-muted)" }}>{p.presentacion}</div>
                        </td>
                        <td style={{ padding: "10px 8px", color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>{it.qtySolicitada}</td>

                        <td style={{ padding: "8px 8px" }}>
                          {isCerrada ? <span style={{ fontFamily: "var(--f-mono)" }}>{qty}</span> : (
                            <input className="t-input" type="number" min="0" step="0.5"
                              value={it.qtyAprobada ?? ""}
                              onChange={e => updateItem(it.productId, { qtyAprobada: e.target.value === "" ? null : parseFloat(e.target.value) })}
                              style={{ width: 60, padding: "6px 8px", fontSize: 13 }} />
                          )}
                        </td>

                        {showCostos && <>
                          <td style={{ padding: "8px 8px" }}>
                            {isRecibida ? <span style={{ fontFamily: "var(--f-mono)" }}>{CxpHelpers.money(it.costoUnit)}</span> : (
                              <input className="t-input" type="number" min="0" step="0.01"
                                value={it.costoUnit || ""}
                                onChange={e => updateItem(it.productId, { costoUnit: parseFloat(e.target.value) || 0 })}
                                style={{ width: 88, padding: "6px 8px", fontSize: 13 }} placeholder="0.00" />
                            )}
                          </td>
                          <td style={{ padding: "8px 8px", textAlign: "center" }}>
                            {isRecibida ? (it.iva ? "✓" : "—") : <Toggle on={it.iva} onChange={v => updateItem(it.productId, { iva: v })} />}
                          </td>
                          <td style={{ padding: "8px 8px" }}>
                            {isRecibida ? `${it.ieps || 0}%` : (
                              <input className="t-input" type="number" min="0" max="100" step="1"
                                value={it.ieps || 0}
                                onChange={e => updateItem(it.productId, { ieps: parseFloat(e.target.value) || 0 })}
                                style={{ width: 50, padding: "6px 8px", fontSize: 13 }} />
                            )}
                          </td>
                          <td style={{ padding: "10px 14px", textAlign: "right", fontFamily: "var(--f-mono)", fontWeight: 600 }}>
                            {CxpHelpers.money(sub)}
                          </td>
                        </>}

                        {!isCerrada && (
                          <td style={{ padding: "8px 8px" }}>
                            <select className="t-input" value={it.proveedorId || ""} onChange={e => updateItem(it.productId, { proveedorId: e.target.value })} style={{ padding: "6px 8px", fontSize: 12, width: "100%" }}>
                              {state.proveedores.map(pv => <option key={pv.id} value={pv.id}>{pv.name}</option>)}
                            </select>
                          </td>
                        )}

                        {!isCerrada && (
                          <td style={{ padding: "8px 4px" }}>
                            <button className="t-btn t-btn--ghost t-btn--icon" onClick={() => removeItem(it.productId)} title="Quitar"><Icon name="x" size={13}/></button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pie de proveedor: totales + datos de compra */}
            {showCostos && (
              <div style={{ borderTop: "1px solid var(--t-line)", padding: "12px 16px", background: "rgba(122,140,102,0.05)" }}>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 28, fontSize: 12.5, marginBottom: isAprobada ? 12 : 0 }}>
                  <div><span style={{ color: "var(--t-muted)" }}>Subtotal:</span> <span style={{ fontFamily: "var(--f-mono)", fontWeight: 600, marginLeft: 4 }}>{CxpHelpers.money(t.subtotal)}</span></div>
                  <div><span style={{ color: "var(--t-muted)" }}>IVA:</span> <span style={{ fontFamily: "var(--f-mono)", fontWeight: 600, marginLeft: 4 }}>{CxpHelpers.money(t.iva)}</span></div>
                  {t.ieps > 0 && <div><span style={{ color: "var(--t-muted)" }}>IEPS:</span> <span style={{ fontFamily: "var(--f-mono)", fontWeight: 600, marginLeft: 4 }}>{CxpHelpers.money(t.ieps)}</span></div>}
                  <div><span style={{ color: "var(--t-muted)" }}>Total:</span> <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 14, marginLeft: 4, color: "var(--t-green)" }}>{CxpHelpers.money(t.total)}</span></div>
                </div>

                {isAprobada && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 8 }}>
                    <div>
                      <label className="t-label" style={{ fontSize: 10 }}>Folio factura (opcional)</label>
                      <input className="t-input" value={meta.folio} onChange={e => setProvField(provId, "folio", e.target.value)} placeholder="F-2026-0001" style={{ padding: "6px 10px", fontSize: 13 }} />
                    </div>
                    <div>
                      <label className="t-label" style={{ fontSize: 10 }}>Cuenta de pago sugerida</label>
                      <select className="t-input" value={meta.cuentaPago} onChange={e => setProvField(provId, "cuentaPago", e.target.value)} style={{ padding: "6px 10px", fontSize: 13 }}>
                        {Object.values(TersoStore.PAYMENT_ACCOUNTS).map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Observaciones */}
      {!isCerrada && (
        <div style={{ marginTop: 14 }}>
          <label className="t-label">Observaciones</label>
          <textarea className="t-input" rows="2" value={observaciones} onChange={e => setObservaciones(e.target.value)} placeholder="Notas para esta compra..." />
        </div>
      )}

      {/* Modal rechazo */}
      {showRechazo && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div className="t-card" style={{ padding: 24, width: 420, maxWidth: "92vw" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Rechazar requisición</div>
            <label className="t-label">Motivo</label>
            <textarea className="t-input" rows="3" value={motivoRechazo} onChange={e => setMotivoRechazo(e.target.value)} placeholder="Ej. No hay presupuesto, pedir luego" />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <Button variant="ghost" onClick={() => setShowRechazo(false)}>Cancelar</Button>
              <Button variant="danger" onClick={rechazar} disabled={!motivoRechazo.trim()}>Rechazar</Button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
};

const ReqStatusChip = ({ status }) => {
  const meta = TersoStore.REQ_STATUS[status];
  if (!meta) return null;
  return <span className="t-chip" style={{ background: meta.color + "20", color: meta.color, borderColor: meta.color + "60" }}>{meta.label}</span>;
};


export { ReqRevisar, ReqStatusChip };
export default ReqRevisar;
