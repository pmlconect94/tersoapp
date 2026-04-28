// ============================================================
// TERSO — Dashboard
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, PageHead } from '../components/ui';

const Dashboard = ({ state, currentUser, setPage }) => {
  const role = TersoStore.ROLES[currentUser.role];
  const myProducts = state.products.filter(p => role.areas.includes(p.area));
  const lowStock = myProducts.filter(p => p.current < p.min);
  const myReqs = state.requisiciones.filter(r => role.areas.includes(r.area));
  const monthReqs = myReqs.filter(r => Date.now() - r.created < 30 * 86400000);
  const pending = myReqs.filter(r => r.status === "pendiente");

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Buenos días";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  })();

  const recent = [...state.audit].sort((a, b) => b.ts - a.ts).slice(0, 5);

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Vista general"
        title={`${greeting},`}
        italic={currentUser.name.split(" ")[0]}
        actions={[
          <Button key="r" variant="ghost" icon="plus" onClick={() => setPage("requisiciones")}>Nueva requisición</Button>,
          <Button key="i" icon="inv" onClick={() => setPage("inventario")}>Capturar inventario</Button>,
        ]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 24 }}>
        <div className="t-card metric metric--green">
          <div className="metric__label">Productos activos</div>
          <div className="metric__value">{myProducts.length}</div>
          <div className="metric__delta">en {role.areas.length === 3 ? "todas las áreas" : role.areas.map(a => TersoStore.AREAS[a].label).join(", ")}</div>
        </div>
        <div className="t-card metric">
          <div className="metric__label">Stock bajo</div>
          <div className="metric__value" style={{ color: lowStock.length > 0 ? "var(--t-danger)" : "var(--t-ink)" }}>{lowStock.length}</div>
          <div className="metric__delta">{lowStock.length > 0 ? "requieren atención" : "todo en orden"}</div>
        </div>
        <div className="t-card metric metric--gold">
          <div className="metric__label">Requisiciones del mes</div>
          <div className="metric__value">{monthReqs.length}</div>
          <div className="metric__delta">{pending.length} pendientes de aprobar</div>
        </div>
        <div className="t-card metric">
          <div className="metric__label">Proveedores</div>
          <div className="metric__value">{state.proveedores.length}</div>
          <div className="metric__delta">activos</div>
        </div>
      </div>

      <div className="feature-strip" style={{ marginBottom: 24 }}>
        <img className="feature-strip__art" src="assets/illust-01.png" alt="" />
        <div style={{ position: "relative", maxWidth: 520 }}>
          <div className="kana" style={{ color: "rgba(237,230,211,0.6)" }}>FLUJO</div>
          <div style={{ fontSize: 20, fontWeight: 600, marginTop: 6, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
            Captura, revisa, <span style={{ color: "var(--t-gold-soft)" }}>solicita</span>.
          </div>
          <div style={{ marginTop: 8, opacity: 0.78, fontSize: 14, lineHeight: 1.55 }}>
            Lleva el inventario diario de tu área. El sistema sugiere productos por debajo del mínimo, tú decides qué pedir.
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Button variant="gold" onClick={() => setPage("inventario")} icon="inv">Iniciar inventario</Button>
          <Button variant="ghost" onClick={() => setPage("requisiciones")} style={{ color: "var(--t-cream)", borderColor: "rgba(237,230,211,0.3)" }} icon="cart">Ver requisiciones</Button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="dash-grid">
        <div className="t-card" style={{ padding: 22 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div>
              <div className="kana">ATENCIÓN</div>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: "4px 0 0", letterSpacing: "-0.01em" }}>Productos por debajo del mínimo</h3>
            </div>
            {lowStock.length > 0 && <span className="t-chip t-chip--danger">{lowStock.length}</span>}
          </div>
          {lowStock.length === 0 ? (
            <div style={{ padding: "20px 0", color: "var(--t-muted)", display: "flex", alignItems: "center", gap: 10 }}>
              <Icon name="check" size={16} /> Todo el inventario está en niveles saludables.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lowStock.slice(0, 6).map(p => {
                const ratio = p.current / p.min;
                return (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "10px 4px", borderBottom: "1px solid var(--t-line)" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{p.name}</div>
                      <div style={{ fontSize: 11.5, color: "var(--t-muted)" }}>{TersoStore.AREAS[p.area].label} · mín {p.min} {p.presentacion}</div>
                    </div>
                    <div style={{ width: 80, height: 6, background: "rgba(46,61,42,0.1)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ width: `${Math.min(100, ratio * 100)}%`, height: "100%", background: ratio < 0.5 ? "var(--t-danger)" : "var(--t-warn)", transition: "width 600ms var(--ease-apple)" }} />
                    </div>
                    <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, minWidth: 50, textAlign: "right" }}>{p.current}/{p.min}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="t-card" style={{ padding: 22 }}>
          <div className="kana">ACTIVIDAD</div>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: "4px 0 14px", letterSpacing: "-0.01em" }}>Actividad reciente</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {recent.map(a => {
              const u = state.users.find(x => x.id === a.userId);
              return (
                <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, background: u ? TersoStore.ROLES[u.role].color : "var(--t-muted)" }}>{u?.name[0] || "?"}</div>
                  <div style={{ flex: 1, fontSize: 13 }}>
                    <div><b>{u?.name || "Sistema"}</b> {a.action}</div>
                    <div style={{ fontSize: 11, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>{TersoStore.fmtRelative(a.ts)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`@media (max-width: 860px) { .dash-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
};


export default Dashboard;
