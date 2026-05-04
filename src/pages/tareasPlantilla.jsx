// ============================================================
// TERSO — Tareas / Plantilla semanal (recurrente)
// Grid: tareas en filas, días en columnas, celda = empleado asignado
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, useToast, Sheet } from '../components/ui';
import { taskAppliesOnDay } from '../lib/tareasHelpers';

const TareasPlantilla = ({ state, setState }) => {
  const [areaFilter, setAreaFilter] = useState("all");

  const tasks = useMemo(() => {
    const list = areaFilter === "all" ? state.taskCatalog : state.taskCatalog.filter(t => t.area === areaFilter);
    // Orden: área → turno → nombre
    const shiftOrder = { apertura: 0, durante: 1, cierre: 2 };
    return [...list].sort((a, b) => {
      if (a.area !== b.area) return a.area.localeCompare(b.area);
      if (a.shift !== b.shift) return shiftOrder[a.shift] - shiftOrder[b.shift];
      return a.name.localeCompare(b.name);
    });
  }, [state.taskCatalog, areaFilter]);

  const setAssignment = (taskId, dayIdx, userId) => {
    setState(s => {
      const next = { ...(s.taskTemplate || {}) };
      const k = `${taskId}|${dayIdx}`;
      if (!userId) delete next[k];
      else next[k] = userId;
      return { ...s, taskTemplate: next };
    });
  };

  const autoRotate = () => {
    if (!confirm("¿Auto-rotar asignaciones de la plantilla? Esto sobreescribe asignaciones actuales (puedes ajustar manualmente después).")) return;
    setState(s => {
      const next = {};
      const cocineros = s.users.filter(u => u.active && u.role === "cocina").map(u => u.id);
      const barras    = s.users.filter(u => u.active && u.role === "barra").map(u => u.id);
      const pisos     = s.users.filter(u => u.active && u.role === "piso").map(u => u.id);
      s.taskCatalog.forEach((task, ti) => {
        for (let day = 1; day <= 6; day++) {
          if (task.freq === "semanal" && day !== 4) continue;
          const pool = task.area === "cocina" || task.area === "lavaloza" ? cocineros
                    : task.area === "barra" ? barras
                    : pisos;
          if (!pool.length) continue;
          next[`${task.id}|${day}`] = pool[(ti + day) % pool.length];
        }
      });
      return { ...s, taskTemplate: next };
    });
  };

  const employees = state.users.filter(u => u.active && u.role !== "admin");

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        <div className="segmented" style={{ flexWrap: "wrap" }}>
          <button className={areaFilter === "all" ? "active" : ""} onClick={() => setAreaFilter("all")}>Todas</button>
          {Object.values(TersoStore.TASK_AREAS).map(a => (
            <button key={a.id} className={areaFilter === a.id ? "active" : ""} onClick={() => setAreaFilter(a.id)}>{a.label}</button>
          ))}
        </div>
        <Button variant="ghost" icon="refresh" onClick={autoRotate}>Sugerir rotación</Button>
      </div>

      <p style={{ fontSize: 12.5, color: "var(--t-muted)", marginBottom: 14, lineHeight: 1.5 }}>
        Esta plantilla se aplica <strong>cada semana</strong>. Selecciona un empleado por celda. Las tareas <em>semanales</em> se concentran los viernes; las <em>diarias</em> aparecen Mar–Dom. (Lunes cerrado.)
      </p>

      <div className="t-card" style={{ padding: 0, overflow: "auto" }}>
        <table className="t-table" style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th style={{ minWidth: 220, position: "sticky", left: 0, background: "var(--t-paper)", zIndex: 2 }}>Tarea</th>
              {TersoStore.DAYS.slice(1).map(d => (
                <th key={d.id} style={{ textAlign: "center", minWidth: 130 }}>{d.short}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasks.map(task => {
              const area = TersoStore.TASK_AREAS[task.area];
              return (
                <tr key={task.id}>
                  <td style={{ position: "sticky", left: 0, background: "var(--t-paper)", borderRight: "1px solid var(--t-line)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 99, background: area?.color, flexShrink: 0 }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.2 }}>{task.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--t-muted)", fontFamily: "var(--f-mono)", letterSpacing: "0.08em", marginTop: 2 }}>
                          {TersoStore.TASK_SHIFTS[task.shift]?.short} · {task.freq === "semanal" ? "SEMANAL" : "DIARIA"}
                        </div>
                      </div>
                    </div>
                  </td>
                  {TersoStore.DAYS.slice(1).map(d => {
                    const applies = taskAppliesOnDay(task, d.id);
                    if (!applies) return <td key={d.id} style={{ textAlign: "center", color: "var(--t-line)", fontSize: 18 }}>—</td>;
                    const userId = state.taskTemplate?.[`${task.id}|${d.id}`] || "";
                    const allowed = employees.filter(u => task.rolesAllowed.includes(u.role));
                    return (
                      <td key={d.id} style={{ padding: "6px 8px" }}>
                        <select
                          value={userId}
                          onChange={(e) => setAssignment(task.id, d.id, e.target.value)}
                          style={{
                            width: "100%", padding: "6px 8px", fontSize: 12.5,
                            border: "1px solid var(--t-line)", borderRadius: 8,
                            background: userId ? "var(--t-bone)" : "transparent",
                            fontFamily: "var(--f-sans)",
                            color: userId ? "var(--t-ink)" : "var(--t-muted)",
                            cursor: "pointer",
                          }}
                        >
                          <option value="">—</option>
                          {allowed.map(u => <option key={u.id} value={u.id}>{u.name.split(" ")[0]} {u.name.split(" ")[1]?.[0] || ""}</option>)}
                        </select>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export default TareasPlantilla;
