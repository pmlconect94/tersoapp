// ============================================================
// TERSO — Tareas / Rendimiento
// Métricas: % completadas, % aprobadas, ranking, heatmap, top rechazadas
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Segmented } from '../components/ui';
import { computeTaskPerformance } from '../lib/tareasHelpers';

const TareasRendimiento = ({ state }) => {
  const [range, setRange] = useState("4w"); // 1w, 4w, 12w

  const { fromISO, toISO } = useMemo(() => {
    const today = TersoStore.toISO(new Date());
    const days = range === "1w" ? 7 : range === "4w" ? 28 : 84;
    return { fromISO: TersoStore.addDays(today, -days), toISO: today };
  }, [range]);

  const employees = state.users.filter(u => u.active && u.role !== "admin");

  // Performance por usuario
  const perfRows = useMemo(() => {
    return employees.map(u => {
      const p = computeTaskPerformance(state, u.id, fromISO, toISO);
      return { user: u, ...p };
    }).filter(r => r.total > 0)
      .sort((a, b) => b.approvalPct - a.approvalPct || b.total - a.total);
  }, [employees, state.taskRecords, fromISO, toISO]);

  // Top rechazadas
  const topRejected = useMemo(() => {
    const map = {};
    state.taskRecords.forEach(r => {
      if (r.status !== "rechazada") return;
      if (r.dateISO < fromISO || r.dateISO > toISO) return;
      const t = state.taskCatalog.find(t => t.id === r.taskId);
      if (!t) return;
      if (!map[r.taskId]) map[r.taskId] = { task: t, count: 0 };
      map[r.taskId].count++;
    });
    return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [state.taskRecords, state.taskCatalog, fromISO, toISO]);

  // Heatmap por día de semana
  const heatmap = useMemo(() => {
    const byDay = [0, 1, 2, 3, 4, 5, 6].map(() => ({ done: 0, total: 0 }));
    state.taskRecords.forEach(r => {
      if (r.dateISO < fromISO || r.dateISO > toISO) return;
      const dayIdx = taskDayIdx(r.dateISO);
      byDay[dayIdx].total++;
      if (r.status === "aprobada" || r.status === "hecha") byDay[dayIdx].done++;
    });
    return byDay.map((d, i) => ({
      day: TersoStore.DAYS[i],
      pct: d.total ? d.done / d.total : 0,
      total: d.total,
    }));
  }, [state.taskRecords, fromISO, toISO]);

  // Totales globales
  const totals = useMemo(() => {
    const recs = state.taskRecords.filter(r => r.dateISO >= fromISO && r.dateISO <= toISO);
    return {
      total: recs.length,
      completed: recs.filter(r => r.status !== "pendiente").length,
      approved: recs.filter(r => r.status === "aprobada").length,
      rejected: recs.filter(r => r.status === "rechazada").length,
    };
  }, [state.taskRecords, fromISO, toISO]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 10 }}>
        <div className="segmented">
          <button className={range === "1w" ? "active" : ""} onClick={() => setRange("1w")}>Última semana</button>
          <button className={range === "4w" ? "active" : ""} onClick={() => setRange("4w")}>Últimas 4 semanas</button>
          <button className={range === "12w" ? "active" : ""} onClick={() => setRange("12w")}>Últimas 12 semanas</button>
        </div>
        <div style={{ fontSize: 12, color: "var(--t-muted)", fontFamily: "var(--f-mono)", letterSpacing: "0.08em" }}>
          {TersoStore.fmtDate(TersoStore.fromISO(fromISO))} – {TersoStore.fmtDate(TersoStore.fromISO(toISO))}
        </div>
      </div>

      {/* Totales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <div className="t-card metric metric--green">
          <div className="metric__label">Total tareas</div>
          <div className="metric__value">{totals.total}</div>
          <div className="metric__delta">en el rango</div>
        </div>
        <div className="t-card metric">
          <div className="metric__label">Completadas</div>
          <div className="metric__value">{totals.completed}</div>
          <div className="metric__delta">{totals.total ? Math.round(totals.completed/totals.total*100) + "%" : "—"} del total</div>
        </div>
        <div className="t-card metric metric--gold">
          <div className="metric__label">Aprobadas</div>
          <div className="metric__value">{totals.approved}</div>
          <div className="metric__delta">{totals.completed ? Math.round(totals.approved/totals.completed*100) + "%" : "—"} de completadas</div>
        </div>
        <div className="t-card metric">
          <div className="metric__label">Rechazadas</div>
          <div className="metric__value" style={{ color: totals.rejected > 0 ? "var(--t-danger)" : "var(--t-ink)" }}>{totals.rejected}</div>
          <div className="metric__delta">{totals.completed ? Math.round(totals.rejected/totals.completed*100) + "%" : "—"} de completadas</div>
        </div>
      </div>

      {/* Heatmap */}
      <div style={{ marginBottom: 30 }}>
        <h3 className="section-h2" style={{ marginBottom: 12 }}>Cumplimiento por día</h3>
        <div className="t-card" style={{ padding: 22 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
            {heatmap.map((h, i) => {
              const closed = i === 0;
              const intensity = h.pct;
              const bg = closed ? "var(--t-bone)"
                : intensity >= 0.85 ? "var(--t-green)"
                : intensity >= 0.6 ? "rgba(90,122,77,0.55)"
                : intensity >= 0.3 ? "rgba(196,160,79,0.5)"
                : "rgba(161,78,58,0.4)";
              const fg = (intensity >= 0.6 && !closed) ? "var(--t-cream)" : "var(--t-ink)";
              return (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{
                    aspectRatio: "1", borderRadius: 12, background: bg, color: fg,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    padding: 8, marginBottom: 6,
                  }}>
                    {closed ? (
                      <div style={{ fontSize: 11, color: "var(--t-muted)", fontStyle: "italic" }}>Cerrado</div>
                    ) : (
                      <>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
                          {h.total ? `${Math.round(h.pct * 100)}%` : "—"}
                        </div>
                        <div style={{ fontSize: 10, opacity: 0.7, fontFamily: "var(--f-mono)", letterSpacing: "0.08em", marginTop: 2 }}>
                          {h.total} tareas
                        </div>
                      </>
                    )}
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-muted)" }}>
                    {h.day.short}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ranking de empleados */}
      <div style={{ marginBottom: 30 }}>
        <h3 className="section-h2" style={{ marginBottom: 12 }}>Ranking por empleado</h3>
        {perfRows.length === 0 ? (
          <Empty title="Sin datos" body="Aún no hay tareas registradas en este rango." />
        ) : (
          <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="t-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Empleado</th>
                  <th style={{ width: 90, textAlign: "right" }}>Asignadas</th>
                  <th style={{ width: 140 }}>Completadas</th>
                  <th style={{ width: 140 }}>Aprobadas</th>
                  <th style={{ width: 90, textAlign: "right" }}>Rechazos</th>
                </tr>
              </thead>
              <tbody>
                {perfRows.map((row, i) => {
                  const role = TersoStore.ROLES[row.user.role];
                  return (
                    <tr key={row.user.id}>
                      <td style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600, color: i < 3 ? "var(--t-gold)" : "var(--t-muted)" }}>
                        {i + 1}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar" style={{ background: role?.color, width: 30, height: 30, fontSize: 11 }}>{row.user.name[0]}</div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{row.user.name}</div>
                            <div style={{ fontSize: 11, color: "var(--t-muted)" }}>{role?.label}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 13 }}>{row.total}</td>
                      <td><Bar pct={row.completionPct} /></td>
                      <td><Bar pct={row.approvalPct} good /></td>
                      <td style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 13, color: row.rejected > 0 ? "var(--t-danger)" : "var(--t-muted)" }}>
                        {row.rejected || "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top rechazadas */}
      {topRejected.length > 0 && (
        <div>
          <h3 className="section-h2" style={{ marginBottom: 12 }}>Tareas más rechazadas</h3>
          <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="t-table">
              <thead>
                <tr>
                  <th>Tarea</th>
                  <th style={{ width: 120 }}>Área</th>
                  <th style={{ width: 100, textAlign: "right" }}>Rechazos</th>
                </tr>
              </thead>
              <tbody>
                {topRejected.map(({ task, count }) => {
                  const area = TersoStore.TASK_AREAS[task.area];
                  return (
                    <tr key={task.id}>
                      <td style={{ fontWeight: 500 }}>{task.name}</td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 6, height: 6, borderRadius: 99, background: area?.color }} />
                          <span style={{ fontSize: 12 }}>{area?.label}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--f-mono)", color: "var(--t-danger)", fontWeight: 600 }}>{count}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

const Bar = ({ pct, good }) => {
  const w = Math.round(pct * 100);
  const color = good ? "var(--t-ok)" : (pct >= 0.7 ? "var(--t-green)" : pct >= 0.4 ? "var(--t-gold)" : "var(--t-danger)");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--t-bone)", borderRadius: 99, overflow: "hidden" }}>
        <div style={{ width: `${w}%`, height: "100%", background: color, transition: "width 400ms var(--ease-apple)" }} />
      </div>
      <div style={{ fontFamily: "var(--f-mono)", fontSize: 11.5, color: "var(--t-ink)", minWidth: 36, textAlign: "right" }}>{w}%</div>
    </div>
  );
};


export default TareasRendimiento;
