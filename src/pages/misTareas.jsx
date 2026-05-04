// ============================================================
// TERSO — Mis tareas (empleado)
// Checklist de hoy + historial de rechazos a rehacer
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, useToast, PageHead, Sheet } from '../components/ui';
import { taskDayIdx, tasksForUserOnDay, findTaskRecord, taskStatusChip } from '../lib/tareasHelpers';

const MisTareas = ({ state, setState, currentUser }) => {
  const [dateISO, setDateISO] = useState(TersoStore.toISO(new Date()));

  const dayIdx = taskDayIdx(dateISO);
  const isMonday = dayIdx === 0;

  // Tareas asignadas a este usuario en este día
  const myTasks = useMemo(() => {
    if (isMonday) return [];
    return tasksForUserOnDay(state, currentUser.id, dateISO).map(task => {
      const record = findTaskRecord(state, task.id, currentUser.id, dateISO);
      return { task, record, status: record?.status || "pendiente" };
    });
  }, [state, currentUser.id, dateISO, isMonday]);

  // Agrupar por turno
  const grouped = useMemo(() => {
    const g = { apertura: [], durante: [], cierre: [] };
    myTasks.forEach(row => {
      g[row.task.shift]?.push(row);
    });
    return g;
  }, [myTasks]);

  const counts = useMemo(() => {
    const c = { total: myTasks.length, done: 0, approved: 0, rejected: 0, pending: 0 };
    myTasks.forEach(r => {
      if (r.status === "aprobada") c.approved++;
      else if (r.status === "rechazada") c.rejected++;
      else if (r.status === "hecha") c.done++;
      else c.pending++;
    });
    return c;
  }, [myTasks]);

  const markDone = (task, note = "") => {
    setState(s => {
      const existing = s.taskRecords.find(r => r.taskId === task.id && r.userId === currentUser.id && r.dateISO === dateISO);
      if (existing) {
        // Re-marcar (caso: tarea rechazada se rehace)
        const updated = { ...existing, status: "hecha", employeeNote: note, completedAt: Date.now(), adminNote: "", auditedAt: null, auditedBy: null };
        return { ...s, taskRecords: s.taskRecords.map(r => r.id === existing.id ? updated : r) };
      }
      return {
        ...s,
        taskRecords: [...s.taskRecords, {
          id: TersoStore.uid("tr"),
          taskId: task.id,
          userId: currentUser.id,
          dateISO,
          status: "hecha",
          employeeNote: note,
          adminNote: "",
          completedAt: Date.now(),
          auditedAt: null,
          auditedBy: null,
        }],
      };
    });
  };

  const undo = (record) => {
    if (!record) return;
    setState(s => ({
      ...s,
      taskRecords: s.taskRecords.map(r => r.id === record.id ? { ...r, status: "pendiente", completedAt: null, employeeNote: "" } : r),
    }));
  };

  const [noteFor, setNoteFor] = useState(null);

  const isToday = dateISO === TersoStore.toISO(new Date());

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Tu checklist diario"
        title="Mis tareas"
        italic={`· ${currentUser.name.split(" ")[0]}`}
      />

      {/* Hero progress */}
      {!isMonday && myTasks.length > 0 && (
        <div className="t-card" style={{ padding: "20px 24px", marginBottom: 20, display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div className="kana" style={{ marginBottom: 4 }}>Progreso de hoy</div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 32, fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1 }}>
              {counts.approved + counts.done}<span style={{ color: "var(--t-muted)", fontSize: 22 }}> / {counts.total}</span>
            </div>
          </div>
          <div style={{ flex: 2, minWidth: 220 }}>
            <div style={{ height: 8, background: "var(--t-bone)", borderRadius: 99, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${counts.total ? (counts.approved/counts.total)*100 : 0}%`, background: "var(--t-ok)" }} />
              <div style={{ width: `${counts.total ? (counts.done/counts.total)*100 : 0}%`, background: "var(--t-gold)" }} />
              <div style={{ width: `${counts.total ? (counts.rejected/counts.total)*100 : 0}%`, background: "var(--t-danger)" }} />
            </div>
            <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--t-muted)", marginTop: 8, flexWrap: "wrap" }}>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "var(--t-ok)", marginRight: 5 }} /> {counts.approved} aprobadas</span>
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "var(--t-gold)", marginRight: 5 }} /> {counts.done} por auditar</span>
              {counts.rejected > 0 && <span style={{ color: "var(--t-danger)" }}><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "var(--t-danger)", marginRight: 5 }} /> {counts.rejected} rechazadas — rehacer</span>}
              <span><span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "var(--t-muted)", marginRight: 5 }} /> {counts.pending} pendientes</span>
            </div>
          </div>
        </div>
      )}

      {/* Date nav */}
      <div className="t-card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, flexWrap: "wrap" }}>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setDateISO(TersoStore.addDays(dateISO, -1))}>
          <Icon name="chev" size={16} style={{ transform: "rotate(180deg)" }} />
        </Button>
        <div style={{ minWidth: 200, textAlign: "center" }}>
          <div className="kana" style={{ marginBottom: 2 }}>{TersoStore.DAYS[dayIdx]?.label} {isToday && "· Hoy"}</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {TersoStore.fmtDate(TersoStore.fromISO(dateISO))}
          </div>
        </div>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setDateISO(TersoStore.addDays(dateISO, 1))}>
          <Icon name="chev" size={16} />
        </Button>
        {!isToday && <Button variant="ghost" size="sm" onClick={() => setDateISO(TersoStore.toISO(new Date()))} style={{ marginLeft: 8 }}>Hoy</Button>}
      </div>

      {isMonday ? (
        <Empty title="Lunes cerrado" body="No hay tareas asignadas este día." />
      ) : myTasks.length === 0 ? (
        <Empty title="Sin tareas hoy" body="No tienes responsabilidades asignadas para este día." />
      ) : (
        <div style={{ display: "grid", gap: 22 }}>
          {Object.entries(grouped).map(([shiftId, list]) => {
            if (!list.length) return null;
            const shift = TersoStore.TASK_SHIFTS[shiftId];
            return (
              <div key={shiftId}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>{shift?.label}</h3>
                  <span style={{ fontFamily: "var(--f-mono)", fontSize: 11, color: "var(--t-muted)", letterSpacing: "0.1em" }}>{list.length} tareas</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  {list.map(({ task, record, status }) => (
                    <TaskCard key={task.id}
                      task={task}
                      record={record}
                      status={status}
                      onMark={() => markDone(task)}
                      onAddNote={() => setNoteFor({ task, record })}
                      onUndo={() => undo(record)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {noteFor && <NoteSheet
        task={noteFor.task}
        record={noteFor.record}
        onSubmit={(note) => { markDone(noteFor.task, note); setNoteFor(null); }}
        onCancel={() => setNoteFor(null)}
      />}
    </div>
  );
};

const TaskCard = ({ task, record, status, onMark, onAddNote, onUndo }) => {
  const area = TersoStore.TASK_AREAS[task.area];
  const isDone = status === "hecha" || status === "aprobada";
  const isRejected = status === "rechazada";
  const isPending = status === "pendiente";

  const bg = isRejected ? "rgba(161,78,58,0.06)" : isDone ? "rgba(90,122,77,0.05)" : undefined;
  const borderL = isRejected ? "var(--t-danger)" : status === "aprobada" ? "var(--t-ok)" : status === "hecha" ? "var(--t-gold)" : "var(--t-line)";

  return (
    <div className="t-card" style={{
      padding: "14px 18px", display: "flex", alignItems: "center", gap: 14,
      background: bg,
      borderLeft: `3px solid ${borderL}`,
      opacity: status === "aprobada" ? 0.78 : 1,
    }}>
      <button
        onClick={isDone ? onUndo : onMark}
        disabled={status === "aprobada"}
        style={{
          width: 28, height: 28, borderRadius: 8, flexShrink: 0,
          border: `2px solid ${isDone ? "var(--t-ok)" : "var(--t-line-strong, #ccc)"}`,
          background: isDone ? "var(--t-ok)" : "transparent",
          cursor: status === "aprobada" ? "default" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "all 200ms var(--ease-apple)",
        }}
        title={isDone ? "Desmarcar" : "Marcar como hecha"}
      >
        {isDone && <Icon name="check" size={16} style={{ color: "var(--t-cream)" }} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: area?.color, flexShrink: 0 }} />
          <div style={{ fontSize: 14, fontWeight: 500, textDecoration: status === "aprobada" ? "line-through" : "none", color: status === "aprobada" ? "var(--t-muted)" : "var(--t-ink)" }}>
            {task.name}
          </div>
        </div>
        <div style={{ fontSize: 11, color: "var(--t-muted)", fontFamily: "var(--f-mono)", letterSpacing: "0.08em" }}>
          {area?.label}
          {task.freq === "semanal" && " · SEMANAL"}
        </div>
        {isRejected && record?.adminNote && (
          <div style={{ marginTop: 8, padding: "8px 12px", background: "rgba(161,78,58,0.1)", borderRadius: 8, fontSize: 12, color: "var(--t-danger)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <Icon name="info" size={13} style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: 600, marginBottom: 2 }}>Rechazada — debes rehacer</div>
              <div style={{ fontStyle: "italic" }}>"{record.adminNote}"</div>
            </div>
          </div>
        )}
        {record?.employeeNote && status !== "rechazada" && (
          <div style={{ marginTop: 4, fontSize: 11.5, color: "var(--t-muted)", fontStyle: "italic" }}>
            Tu nota: "{record.employeeNote}"
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <span className={taskStatusChip(status).cls} style={{ fontSize: 10.5 }}>
          {taskStatusChip(status).label}
        </span>
        {!isDone && status !== "aprobada" && (
          <button onClick={onAddNote} style={{ background: "transparent", border: 0, fontSize: 11, color: "var(--t-muted)", cursor: "pointer", padding: 0, fontFamily: "var(--f-mono)", letterSpacing: "0.06em" }}>
            + nota
          </button>
        )}
      </div>
    </div>
  );
};

const NoteSheet = ({ task, record, onSubmit, onCancel }) => {
  const [note, setNote] = useState(record?.employeeNote || "");
  return (
    <Sheet title={task.name} onClose={onCancel}>
      <p style={{ fontSize: 13, color: "var(--t-muted)", marginBottom: 14 }}>
        Agrega una nota (opcional) al marcar la tarea como hecha.
      </p>
      <Field label="Nota">
        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} placeholder="Ej: Faltó cloro, terminé con lo que había…" autoFocus />
      </Field>
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
        <Button variant="ghost" onClick={onCancel}>Cancelar</Button>
        <Button onClick={() => onSubmit(note.trim())}>Marcar hecha</Button>
      </div>
    </Sheet>
  );
};


export default MisTareas;
