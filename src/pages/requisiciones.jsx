// ============================================================
// TERSO — Requisiciones (lista + flujo en 3 etapas)
// ============================================================
// Empleado: captura → Admin: aprueba/edita → Admin: recibe & compra
// Al recibir se genera factura en CXP automáticamente

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import CxpHelpers from '../lib/cxpHelpers';
import { Icon, Button, Segmented, useToast, Empty, PageHead, Sheet } from '../components/ui';
import ReqFormEmpleado from './requisicionesForm';
import { ReqRevisar, ReqStatusChip } from './requisicionesRevisar';

const Requisiciones = ({ state, setState, currentUser, search }) => {
  const role = TersoStore.ROLES[currentUser.role];
  const isAdmin = currentUser.role === "admin";
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const toast = useToast();

  // Pre-fill desde inventario
  useEffect(() => {
    const seed = sessionStorage.getItem("terso_seed_req");
    if (seed) {
      sessionStorage.removeItem("terso_seed_req");
      try { setCreating(JSON.parse(seed)); } catch (e) { setCreating(true); }
    }
  }, []);

  const visible = useMemo(() => {
    let list = state.requisiciones.filter(r => isAdmin || role.areas.includes(r.area));
    if (statusFilter !== "all") list = list.filter(r => r.status === statusFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r => r.folio.toLowerCase().includes(q) || TersoStore.AREAS[r.area].label.toLowerCase().includes(q));
    }
    return list.sort((a, b) => b.created - a.created);
  }, [state.requisiciones, statusFilter, search, currentUser.role]);

  const addAudit = (action) => ({ id: TersoStore.uid("a"), ts: Date.now(), userId: currentUser.id, action });

  // 1) Crear
  const create = (form) => {
    const r = {
      id: TersoStore.uid("r"),
      folio: TersoStore.nextFolio(state.requisiciones),
      area: form.area,
      userId: currentUser.id,
      status: "pendiente",
      created: Date.now(),
      items: form.items,
      observaciones: form.observaciones,
      proveedorId: null,
      reviewedBy: null, reviewedAt: null,
      receivedBy: null, receivedAt: null,
      facturaId: null,
      motivoRechazo: null,
    };
    setState(s => ({ ...s, requisiciones: [r, ...s.requisiciones], audit: [addAudit(`Creó requisición ${r.folio}`), ...s.audit] }));
    toast(`Requisición ${r.folio} enviada a aprobación`);
    setCreating(false);
  };

  // 2a) Aprobar
  const approve = (r, payload) => {
    const updated = { ...r, status: "aprobada", items: payload.items, observaciones: payload.observaciones,
      reviewedBy: currentUser.id, reviewedAt: Date.now() };
    setState(s => ({ ...s, requisiciones: s.requisiciones.map(x => x.id === r.id ? updated : x), audit: [addAudit(`Aprobó requisición ${r.folio}`), ...s.audit] }));
    toast(`${r.folio} aprobada — lista para recibir`);
    setViewing(null);
  };

  // 2b) Rechazar
  const reject = (r, payload) => {
    const updated = { ...r, status: "rechazada", motivoRechazo: payload.motivoRechazo, reviewedBy: currentUser.id, reviewedAt: Date.now() };
    setState(s => ({ ...s, requisiciones: s.requisiciones.map(x => x.id === r.id ? updated : x), audit: [addAudit(`Rechazó requisición ${r.folio}: ${payload.motivoRechazo}`), ...s.audit] }));
    toast(`${r.folio} rechazada`);
    setViewing(null);
  };

  // 3) Recibir + crear factura POR PROVEEDOR
  const receive = (r, payload) => {
    const fechaFactura = Date.now();
    const nuevasFacturas = payload.gruposPorProveedor.map((g, idx) => {
      const prov = state.proveedores.find(p => p.id === g.proveedorId);
      const fechaVencimiento = fechaFactura + (prov?.diasCredito || 0) * 86400000;
      const sufijo = payload.gruposPorProveedor.length > 1 ? `-${idx + 1}` : "";
      return {
        id: TersoStore.uid("f"),
        folio: g.folio || `${r.folio.replace("REQ", "FAC")}${sufijo}`,
        proveedorId: g.proveedorId,
        requisicionId: r.id,
        fechaFactura,
        fechaVencimiento,
        subtotal: g.totales.subtotal,
        iva: g.totales.iva,
        ieps: g.totales.ieps,
        total: g.totales.total,
        saldoPendiente: g.totales.total,
        cuentaPagoSugerida: g.cuentaPago,
        status: "pendiente",
        observaciones: payload.observaciones,
        createdBy: currentUser.id,
        created: fechaFactura,
        items: g.items.map(it => ({ productId: it.productId, qty: it.qtyAprobada ?? it.qtySolicitada, costoUnit: it.costoUnit, iva: it.iva, ieps: it.ieps })),
      };
    });

    const updatedReq = { ...r, status: "recibida", items: payload.items,
      receivedBy: currentUser.id, receivedAt: Date.now(),
      facturaIds: nuevasFacturas.map(f => f.id),
      observaciones: payload.observaciones };

    // Sumar al stock + actualizar proveedor predeterminado del producto
    const newProducts = state.products.map(p => {
      const it = payload.items.find(i => i.productId === p.id);
      if (!it) return p;
      const qty = it.qtyAprobada ?? it.qtySolicitada;
      return { ...p, current: p.current + qty, proveedor: it.proveedorId || p.proveedor };
    });

    const totalCompra = nuevasFacturas.reduce((s, f) => s + f.total, 0);
    setState(s => ({
      ...s,
      requisiciones: s.requisiciones.map(x => x.id === r.id ? updatedReq : x),
      facturas: [...nuevasFacturas, ...(s.facturas || [])],
      products: newProducts,
      audit: [addAudit(`Recibió ${r.folio}: ${nuevasFacturas.length} factura${nuevasFacturas.length > 1 ? "s" : ""} (${CxpHelpers.money(totalCompra)})`), ...s.audit],
    }));
    toast(`${r.folio} recibida · ${nuevasFacturas.length} factura${nuevasFacturas.length > 1 ? "s" : ""} en CxP`);
    setViewing(null);
  };

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Solicitudes de compra"
        title="Requisiciones"
        actions={[<Button key="add" icon="plus" onClick={() => setCreating(true)}>Nueva requisición</Button>]}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <Segmented value={statusFilter} onChange={setStatusFilter} options={[
          { value: "all", label: "Todas" },
          { value: "pendiente", label: "Pendientes" },
          { value: "aprobada", label: "Aprobadas" },
          { value: "recibida", label: "Recibidas" },
          { value: "rechazada", label: "Rechazadas" },
        ]} />
        <div style={{ marginLeft: "auto", color: "var(--t-muted)", fontSize: 12, fontFamily: "var(--f-mono)" }}>{visible.length} resultados</div>
      </div>

      {visible.length === 0 ? (
        <Empty title="Sin requisiciones" body="Crea la primera requisición de compra." action={<Button icon="plus" onClick={() => setCreating(true)}>Nueva requisición</Button>} />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {visible.map(r => {
            const u = state.users.find(x => x.id === r.userId);
            const totalItems = r.items.reduce((s, i) => s + (i.qtyAprobada ?? i.qtySolicitada), 0);
            const meta = TersoStore.REQ_STATUS[r.status];
            return (
              <div key={r.id} className="t-card is-clickable" onClick={() => setViewing(r)}
                style={{ padding: 18, display: "grid", gridTemplateColumns: "auto 1fr auto auto", gap: 18, alignItems: "center", cursor: "pointer", transition: "transform 200ms var(--ease-apple), box-shadow 200ms" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 10px 28px rgba(31,42,28,0.08)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
                <div style={{ width: 56, height: 56, borderRadius: 14, background: meta.color + "1c", color: meta.color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="cart" size={22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--t-muted)" }}>{r.folio}</span>
                    <ReqStatusChip status={r.status} />
                    <span className="t-chip">{TersoStore.AREAS[r.area].label}</span>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, marginTop: 4, letterSpacing: "-0.01em" }}>{r.items.length} productos · {totalItems} unidades</div>
                  <div style={{ fontSize: 12, color: "var(--t-muted)", marginTop: 2 }}>{u?.name || "—"} · {TersoStore.fmtRelative(r.created)}</div>
                </div>
                <div className="kana" style={{ display: "none" }} />
                <Icon name="chev" size={18} style={{ color: "var(--t-muted)" }} />
              </div>
            );
          })}
        </div>
      )}

      {creating && <ReqFormEmpleado initial={typeof creating === "object" ? creating : null} state={state} currentUser={currentUser} onSave={create} onClose={() => setCreating(false)} />}
      {viewing && <ReqRevisar r={viewing} state={state} currentUser={currentUser} onClose={() => setViewing(null)}
        onApprove={(p) => approve(viewing, p)} onReject={(p) => reject(viewing, p)} onReceive={(p) => receive(viewing, p)} />}
    </div>
  );
};


export default Requisiciones;
