// ============================================================
// TERSO — Tareas / Hoy (auditoría inline)
// Vista del día: pendientes, hechas (por auditar), aprobadas, rechazadas
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, useToast, Sheet } from '../components/ui';
import { taskDayIdx, taskAppliesOnDay, taskAssignmentFor, findTaskRecord, taskStatusChip } from '../lib/tareasHelpers';

const TareasHoy = ({ state, setState, currentUser }) => {
  const [dateISO, setDateISO] = useState(TersoStore.toISO(new Date()));
  const [areaFilter, setAreaFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [auditing, setAuditing] = useState(null); // record obj

  const dayIdx = taskDayIdx(dateISO);
  const isMonday = dayIdx === 0;

  // Construir filas: una por (task asignada hoy, usuario asignado)
  const rows = useMemo(() => {
    if (isMonday) return [];
    const out = [];
    state.taskCatalog.forEach(task => {
      if (!taskAppliesOnDay(task, dayIdx)) return;
      const userId = taskAssignmentFor(state, task.id, dayIdx, dateISO);
      if (!userId) return;
      const user = state.users.find(u => u.id === userId);
      if (!user) return;
      const record = findTaskRecord(state, task.id, userId, dateISO);
      out.push({ task, user, record, status: record?.status || "pendiente" });
    });
    return out;
  }, [state.taskCatalog, state.taskTemplate, state.taskOverrides, state.taskRecords, dateISO, isMonday]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (areaFilter !== "all" && r.task.area !== areaFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      return true;
    });
  }, [rows, areaFilter, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: rows.length, pendiente: 0, hecha: 0, aprobada: 0, rechazada: 0 };
    rows.forEach(r => { c[r.status]++; });
    return c;
  }, [rows]);

  const auditRecord = (record, status, adminNote = "") => {
    setState(s => {
      const idx = s.taskRecords.findIndex(r => r.id === record.id);
      if (idx < 0) return s;
      const updated = { ...s.taskRecords[idx], status, adminNote, auditedAt: Date.now(), auditedBy: currentUser.id };
      const next = [...s.taskRecords];
      next[idx] = updated;
      return { ...s, taskRecords: next };
    });
  };

  return (
    <div>
      {/* Date nav + counts */}
      <div className="t-card" style={{ padding: 14, marginBottom: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setDateISO(TersoStore.addDays(dateISO, -1))}>
          <Icon name="chev" size={16} style={{ transform: "rotate(180deg)" }} />
        </Button>
        <div style={{ minWidth: 220, textAlign: "center" }}>
          <div className="kana" style={{ marginBottom: 2 }}>{TersoStore.DAYS[dayIdx]?.label}</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {TersoStore.fmtDate(TersoStore.fromISO(dateISO))}
          </div>
        </div>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setDateISO(TersoStore.addDays(dateISO, 1))}>
          <Icon name="chev" size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setDateISO(TersoStore.toISO(new Date()))} style={{ marginLeft: 8 }}>Hoy</Button>
      </div>

      {isMonday ? (
        <Empty title="Lunes cerrado" body="Sin operación este día." />
      ) : (
        <>
          {/* Filtros */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <div className="segmented" style={{ flexWrap: "wrap" }}>
              <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>Todas ({counts.all})</button>
              <button className={statusFilter === "pendiente" ? "active" : ""} onClick={() => setStatusFilter("pendiente")}>Pendiente ({counts.pendiente})</button>
              <button className={statusFilter === "hecha" ? "active" : ""} onClick={() => setStatusFilter("hecha")}>Por auditar ({counts.hecha})</button>
              <button className={statusFilter === "aprobada" ? "active" : ""} onClick={() => setStatusFilter("aprobada")}>Aprobadas ({counts.aprobada})</button>
              <button className={statusFilter === "rechazada" ? "active" : ""} onClick={() => setStatusFilter("rechazada")}>Rechazadas ({counts.rechazada})</button>
            </div>
            <div className="segmented" style={{ flexWrap: "wrap", marginLeft: "auto" }}>
              <button className={areaFilter === "all" ? "active" : ""} onClick={() => setAreaFilter("all")}>Áreas</button>
              {Object.values(TersoStore.TASK_AREAS).map(a => (
                <button key={a.id} className={areaFilter === a.id ? "active" : ""} onClick={() => setAreaFilter(a.id)}>{a.label}</button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Empty title="Sin tareas" body="No hay tareas que coincidan con los filtros." />
          ) : (
            <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="t-table">
                <thead>
                  <tr>
                    <th>Tarea</th>
                    <th style={{ width: 140 }}>Asignado</th>
                    <th style={{ width: 110 }}>Estado</th>
                    <th style={{ width: 220 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, i) => {
                    const area = TersoStore.TASK_AREAS[row.task.area];
                    const chip = taskStatusChip(row.status);
                    return (
                      <tr key={i}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ width: 6, height: 6, borderRadius: 99, background: area?.color, flexShrink: 0 }} />
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500 }}>{row.task.name}</div>
                              <div style={{ fontSize: 10.5, color: "var(--t-muted)", fontFamily: "var(--f-mono)", letterSpacing: "0.08em" }}>
                                {area?.label} · {TersoStore.TASK_SHIFTS[row.task.shift]?.label}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontSize: 13 }}>{row.user.name.split(" ").slice(0, 2).join(" ")}</td>
                        <td><span className={chip.cls} style={{ fontSize: 10.5 }}>{chip.label}</span></td>
                        <td>
                          {row.status === "hecha" && row.record && (
                            <div style={{ display: "flex", gap: 6 }}>
                              <Button size="sm" variant="ghost" onClick={() => auditRecord(row.record, "aprobada")} style={{ color: "var(--t-ok)" }}>
                                <Icon name="check" size={14} /> Aprobar
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setAuditing(row.record)} style={{ color: "var(--t-danger)" }}>
                                <Icon name="x" size={14} /> Rechazar
                              </Button>
                            </div>
                          )}
                          {row.status === "rechazada" && row.record?.adminNote && (
                            <div style={{ fontSize: 11.5, color: "var(--t-muted)", fontStyle: "italic" }}>"{row.record.adminNote}"</div>
                          )}
                          {row.status === "aprobada" && (
                            <div style={{ fontSize: 11.5, color: "var(--t-muted)" }}>
                              Aprobada {row.record?.auditedAt ? TersoStore.fmtRelative(row.record.auditedAt) : ""}
                            </div>
                          )}
                          {row.status === "pendiente" && (
                            <div style={{ fontSize: 11.5, color: "var(--t-muted)", fontStyle: "italic" }}>Esperando empleado…</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {auditing && <RejectSheet record={auditing} onSubmit={(note) => { auditRecord(auditing, "rechazada", note); setAuditing(null); }} onCancel={() => setAuditing(null)} />}
    </div>
  );
};

const RejectSheet = ({ record, onSubmit, onCancel }) => {
  const [note, setNote] = useState("");
  return (
    <Sheet title="Rechazar tarea" onClose={onCancel}>
      <p style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 14 }}>
        El empleado verá la nota y deberá rehacer la tarea.
      </p>
      <div>
        <label className="t-label">Motivo del rechazo</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ej: Quedó sucio el espejo, falta detalle…" rows={4} autoFocus />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button variant="danger" onClick={() => onSubmit(note.trim())} disabled={!note.trim()}>Rechazar</Button>
      </div>
    </Sheet>
  );
};


export default TareasHoy;
