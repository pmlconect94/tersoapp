// ============================================================
// TERSO — Form: Empleado captura nueva requisición
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Segmented, Stepper, Sheet, Check } from '../components/ui';

const ReqFormEmpleado = ({ initial, state, currentUser, onSave, onClose }) => {
  const role = TersoStore.ROLES[currentUser.role];
  const userAreas = currentUser.role === "admin" ? Object.keys(TersoStore.AREAS) : role.areas;
  const defaultArea = initial?.area || userAreas[0];
  const [area, setArea] = useState(defaultArea);
  const [items, setItems] = useState(initial?.items || []);
  const [observaciones, setObservaciones] = useState("");
  const [picker, setPicker] = useState(false);

  const products = state.products.filter(p => p.area === area);

  const addItem = (p) => {
    if (items.find(i => i.productId === p.id)) return;
    setItems([...items, { productId: p.id, qtySolicitada: 1, qtyAprobada: null, costoUnit: null, iva: false, ieps: 0, recibido: false }]);
  };
  const setQty = (pid, qty) => setItems(items.map(i => i.productId === pid ? { ...i, qtySolicitada: qty } : i));
  const removeItem = (pid) => setItems(items.filter(i => i.productId !== pid));

  const valid = area && items.length > 0 && items.every(i => i.qtySolicitada > 0);

  return (
    <Sheet wide open title="Nueva requisición" subtitle="Solicita los productos que necesitas" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button disabled={!valid} icon="check" onClick={() => onSave({ area, items, observaciones })}>Enviar a aprobación</Button></>}>
      <div style={{ display: "grid", gap: 14 }}>
        {userAreas.length > 1 && (
          <div>
            <label className="t-label">Área</label>
            <Segmented value={area} onChange={(v) => { setArea(v); setItems([]); }} options={userAreas.map(a => ({ value: a, label: TersoStore.AREAS[a].label }))} />
          </div>
        )}

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label className="t-label" style={{ marginBottom: 0 }}>Productos solicitados ({items.length})</label>
            <Button size="sm" variant="ghost" icon="plus" onClick={() => setPicker(true)}>Agregar producto</Button>
          </div>
          {items.length === 0 ? (
            <div className="t-card" style={{ padding: 22, textAlign: "center", background: "var(--t-bone)" }}>
              <div style={{ color: "var(--t-muted)", fontSize: 13 }}>Aún no has agregado productos.</div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {items.map(i => {
                const p = state.products.find(x => x.id === i.productId);
                if (!p) return null;
                return (
                  <div key={i.productId} className="t-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, background: "var(--t-bone)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>stock {p.current} · mín {p.min} {p.presentacion}</div>
                    </div>
                    <Stepper value={i.qtySolicitada} min={1} onChange={(v) => setQty(i.productId, v)} />
                    <span style={{ fontSize: 12, color: "var(--t-muted)", minWidth: 40 }}>{p.presentacion}</span>
                    <button className="t-btn t-btn--ghost t-btn--icon" onClick={() => removeItem(i.productId)}><Icon name="x" size={14}/></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="t-label">Observaciones (opcional)</label>
          <textarea className="t-input" rows="3" placeholder="Urgencia, instrucciones para el admin..." value={observaciones} onChange={(e) => setObservaciones(e.target.value)} />
        </div>
      </div>

      {picker && (
        <Sheet open title="Agregar productos" subtitle={`Catálogo de ${TersoStore.AREAS[area].label}`} onClose={() => setPicker(false)}
          footer={<Button onClick={() => setPicker(false)}>Listo</Button>}>
          <ReqProductPicker products={products} selected={items.map(i => i.productId)} onToggle={(p) => items.find(i => i.productId === p.id) ? removeItem(p.id) : addItem(p)} />
        </Sheet>
      )}
    </Sheet>
  );
};

const ReqProductPicker = ({ products, selected, onToggle }) => {
  const [q, setQ] = useState("");
  const [showLow, setShowLow] = useState(false);
  const filtered = products.filter(p => {
    if (showLow && p.current >= p.min) return false;
    if (q) return p.name.toLowerCase().includes(q.toLowerCase());
    return true;
  });
  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 12, alignItems: "center" }}>
        <input className="t-input" placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} style={{ flex: 1 }} />
        <button className="t-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 8, cursor: "pointer", border: showLow ? "1.5px solid var(--t-green)" : "1px solid var(--t-line)", background: showLow ? "var(--t-bone)" : "var(--t-paper)" }} onClick={() => setShowLow(!showLow)}>
          <Icon name="bell" size={14} /> Solo bajos
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "50vh" }}>
        {filtered.map(p => {
          const on = selected.includes(p.id);
          const low = p.current < p.min;
          return (
            <div key={p.id} onClick={() => onToggle(p)} className="t-card" style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", background: on ? "var(--t-green)" : "var(--t-paper)", color: on ? "var(--t-cream)" : "inherit", transition: "all 180ms var(--ease-apple)" }}>
              <Check on={on} onChange={() => onToggle(p)} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: 14 }}>{p.name}</div>
                <div style={{ fontSize: 11.5, opacity: 0.7, fontFamily: "var(--f-mono)" }}>stock {p.current}/{p.min} {p.presentacion}</div>
              </div>
              {low && !on && <span className="t-chip t-chip--danger">Bajo</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
};


export default ReqFormEmpleado;
