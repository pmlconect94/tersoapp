// ============================================================
// TERSO — Tareas / Catálogo (CRUD de tareas)
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Sheet, useToast, Empty } from '../components/ui';

const TareasCatalogo = ({ state, setState }) => {
  const [editing, setEditing] = useState(null); // task obj or 'new' or null
  const [filter, setFilter] = useState("all");

  const tasks = state.taskCatalog;
  const filtered = useMemo(() => {
    if (filter === "all") return tasks;
    return tasks.filter(t => t.area === filter);
  }, [tasks, filter]);

  const grouped = useMemo(() => {
    const g = {};
    filtered.forEach(t => {
      const key = t.area;
      if (!g[key]) g[key] = [];
      g[key].push(t);
    });
    return g;
  }, [filtered]);

  const saveTask = (taskData) => {
    setState(s => {
      const exists = s.taskCatalog.find(t => t.id === taskData.id);
      const next = exists
        ? s.taskCatalog.map(t => t.id === taskData.id ? taskData : t)
        : [...s.taskCatalog, { ...taskData, id: TersoStore.uid("t") }];
      return { ...s, taskCatalog: next };
    });
    setEditing(null);
  };

  const deleteTask = (id) => {
    if (!confirm("¿Eliminar esta tarea? Se mantendrá el historial.")) return;
    setState(s => ({ ...s, taskCatalog: s.taskCatalog.filter(t => t.id !== id) }));
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div className="segmented">
          <button className={filter === "all" ? "active" : ""} onClick={() => setFilter("all")}>Todas ({tasks.length})</button>
          {Object.values(TersoStore.TASK_AREAS).map(a => {
            const n = tasks.filter(t => t.area === a.id).length;
            if (!n) return null;
            return <button key={a.id} className={filter === a.id ? "active" : ""} onClick={() => setFilter(a.id)}>{a.label} ({n})</button>;
          })}
        </div>
        <Button icon="plus" onClick={() => setEditing("new")}>Nueva tarea</Button>
      </div>

      {Object.entries(grouped).length === 0 ? (
        <Empty title="Sin tareas" body="Crea la primera tarea del catálogo." action={<Button icon="plus" onClick={() => setEditing("new")}>Nueva tarea</Button>} />
      ) : (
        <div style={{ display: "grid", gap: 22 }}>
          {Object.entries(grouped).map(([areaId, list]) => {
            const area = TersoStore.TASK_AREAS[areaId];
            return (
              <div key={areaId}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 99, background: area.color }} />
                  <h3 style={{ margin: 0, fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{area.label}</h3>
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t-muted)", letterSpacing: "0.1em" }}>{list.length} tareas</span>
                </div>
                <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
                  <table className="t-table">
                    <thead>
                      <tr>
                        <th>Tarea</th>
                        <th style={{ width: 110 }}>Turno</th>
                        <th style={{ width: 110 }}>Frecuencia</th>
                        <th style={{ width: 200 }}>Roles permitidos</th>
                        <th style={{ width: 90 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.map(t => (
                        <tr key={t.id} className="is-clickable" onClick={() => setEditing(t)}>
                          <td style={{ fontWeight: 500 }}>{t.name}</td>
                          <td><span className="t-chip" style={{ fontSize: 10.5 }}>{TersoStore.TASK_SHIFTS[t.shift]?.label}</span></td>
                          <td><span className="t-chip" style={{ fontSize: 10.5 }}>{TersoStore.TASK_FREQS[t.freq]?.label}</span></td>
                          <td style={{ fontSize: 12, color: "var(--t-muted)" }}>
                            {t.rolesAllowed.map(r => TersoStore.ROLES[r]?.label).join(", ")}
                          </td>
                          <td>
                            <button className="t-btn t-btn--icon t-btn--ghost" onClick={(e) => { e.stopPropagation(); deleteTask(t.id); }}>
                              <Icon name="trash" size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && <TareaEditor task={editing === "new" ? null : editing} onSave={saveTask} onCancel={() => setEditing(null)} />}
    </div>
  );
};

const TareaEditor = ({ task, onSave, onCancel }) => {
  const [name, setName] = useState(task?.name || "");
  const [area, setArea] = useState(task?.area || "cocina");
  const [shift, setShift] = useState(task?.shift || "apertura");
  const [freq, setFreq] = useState(task?.freq || "diaria");
  const [rolesAllowed, setRolesAllowed] = useState(task?.rolesAllowed || ["cocina"]);

  const toggleRole = (r) => {
    setRolesAllowed(rs => rs.includes(r) ? rs.filter(x => x !== r) : [...rs, r]);
  };

  const submit = () => {
    if (!name.trim() || !rolesAllowed.length) return;
    onSave({
      id: task?.id || TersoStore.uid("t"),
      name: name.trim(),
      area, shift, freq, rolesAllowed,
    });
  };

  return (
    <Sheet title={task ? "Editar tarea" : "Nueva tarea"} onClose={onCancel}>
      <Field label="Nombre">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Trapear cocina" autoFocus />
      </Field>
      <Field label="Área">
        <div className="segmented" style={{ flexWrap: "wrap" }}>
          {Object.values(TersoStore.TASK_AREAS).map(a => (
            <button key={a.id} className={area === a.id ? "active" : ""} onClick={() => setArea(a.id)}>{a.label}</button>
          ))}
        </div>
      </Field>
      <Field label="Turno">
        <div className="segmented">
          {Object.values(TersoStore.TASK_SHIFTS).map(s => (
            <button key={s.id} className={shift === s.id ? "active" : ""} onClick={() => setShift(s.id)}>{s.label}</button>
          ))}
        </div>
      </Field>
      <Field label="Frecuencia">
        <div className="segmented">
          {Object.values(TersoStore.TASK_FREQS).map(f => (
            <button key={f.id} className={freq === f.id ? "active" : ""} onClick={() => setFreq(f.id)}>{f.label}</button>
          ))}
        </div>
      </Field>
      <Field label="Roles que pueden hacer esta tarea">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {["piso", "barra", "cocina"].map(r => {
            const active = rolesAllowed.includes(r);
            return (
              <button key={r} type="button" onClick={() => toggleRole(r)} className={`t-chip ${active ? "t-chip--ok" : ""}`} style={{ cursor: "pointer", padding: "6px 12px", fontSize: 12 }}>
                {active && <Icon name="check" size={12} style={{ marginRight: 4 }} />}
                {TersoStore.ROLES[r].label}
              </button>
            );
          })}
        </div>
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={submit}>{task ? "Guardar" : "Crear"}</Button>
      </div>
    </Sheet>
  );
};


export default TareasCatalogo;
