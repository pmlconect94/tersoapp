// ============================================================
// TERSO — Horarios (admin)
//
// Vista semanal tipo grid:  Empleado × Día → Turno
// Acciones: navegar semanas, editar turno (sheet), copiar semana anterior,
// publicar / despublicar, exportar imagen estilo WhatsApp.
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Segmented, Sheet, useToast, PageHead } from '../components/ui';

const Horarios = ({ state, setState, currentUser, search }) => {
  const today = new Date();
  const [weekKey, setWeekKey] = useState(TersoStore.weekStart(today));
  const [editing, setEditing] = useState(null); // { userId, dayIdx }
  const [confirmCopy, setConfirmCopy] = useState(false);
  const [filterRole, setFilterRole] = useState("all");
  const toast = useToast();

  // ----- find/create week object -----
  const week = useMemo(() => {
    return state.schedules.find(s => s.week === weekKey)
      || { week: weekKey, status: "draft", entries: {}, publishedAt: null };
  }, [state.schedules, weekKey]);

  const isExisting = state.schedules.some(s => s.week === weekKey);

  // ----- employees (exclude admin) -----
  const employees = useMemo(() => {
    let list = state.users
      .filter(u => u.active && u.role !== "admin")
      .filter(u => filterRole === "all" || u.role === filterRole);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q));
    }
    // group by role: cocina, piso, barra
    const order = { cocina: 0, piso: 1, barra: 2 };
    return list.sort((a, b) => (order[a.role] - order[b.role]) || a.name.localeCompare(b.name));
  }, [state.users, filterRole, search]);

  // ----- mutators -----
  const persistWeek = (next) => {
    setState(s => {
      const exists = s.schedules.some(x => x.week === next.week);
      const schedules = exists
        ? s.schedules.map(x => x.week === next.week ? next : x)
        : [...s.schedules, next];
      return { ...s, schedules };
    });
  };

  const setEntry = (userId, dayIdx, shift) => {
    const next = { ...week, entries: { ...week.entries, [`${userId}|${dayIdx}`]: shift } };
    persistWeek(next);
  };
  const clearEntry = (userId, dayIdx) => {
    const entries = { ...week.entries };
    delete entries[`${userId}|${dayIdx}`];
    persistWeek({ ...week, entries });
  };

  const addAudit = (action) => ({ id: TersoStore.uid("a"), ts: Date.now(), userId: currentUser.id, action });

  const togglePublish = () => {
    const status = week.status === "published" ? "draft" : "published";
    const next = { ...week, status, publishedAt: status === "published" ? Date.now() : null };
    setState(s => {
      const exists = s.schedules.some(x => x.week === next.week);
      const schedules = exists
        ? s.schedules.map(x => x.week === next.week ? next : x)
        : [...s.schedules, next];
      return { ...s, schedules, audit: [addAudit(`${status === "published" ? "Publicó" : "Despublicó"} horario ${TersoStore.fmtWeekRange(weekKey)}`), ...s.audit] };
    });
    toast(status === "published" ? "Horario publicado" : "Horario en borrador");
  };

  const copyFromPrev = () => {
    const prevKey = TersoStore.addDays(weekKey, -7);
    const prev = state.schedules.find(s => s.week === prevKey);
    if (!prev) { toast("No hay semana anterior", "err"); setConfirmCopy(false); return; }
    persistWeek({ ...week, entries: { ...prev.entries } });
    setState(s => ({ ...s, audit: [addAudit(`Copió horarios de ${TersoStore.fmtWeekRange(prevKey)} a ${TersoStore.fmtWeekRange(weekKey)}`), ...s.audit] }));
    toast("Horario copiado de la semana anterior");
    setConfirmCopy(false);
  };

  const clearWeek = () => {
    persistWeek({ ...week, entries: {} });
    toast("Semana limpiada");
  };

  // ----- exports -----
  const exportText = () => {
    const lines = [];
    lines.push(`HORARIOS — ${TersoStore.fmtWeekRange(weekKey)}`.toUpperCase());
    lines.push("");
    employees.forEach(u => {
      const role = TersoStore.ROLES[u.role];
      lines.push(`${u.name.toUpperCase()} (${role.label})`);
      TersoStore.DAYS.forEach((d, i) => {
        const s = week.entries[`${u.id}|${i}`];
        lines.push(`  ${d.label.padEnd(10)} ${TersoStore.shiftLabel(s) || "—"}`);
      });
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `horario_${weekKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Horario exportado");
  };

  // ----- summary stats -----
  const stats = useMemo(() => {
    let totalShifts = 0, totalHours = 0, totalRest = 0;
    employees.forEach(u => {
      TersoStore.DAYS.forEach((_, i) => {
        const s = week.entries[`${u.id}|${i}`];
        if (s?.type === "work") { totalShifts++; totalHours += TersoStore.shiftHours(s); }
        else if (s?.type === "rest") totalRest++;
      });
    });
    return { totalShifts, totalHours: Math.round(totalHours), totalRest, employees: employees.length };
  }, [employees, week]);

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={week.status === "published" ? "Publicado" : "Borrador"}
        title="Horarios"
        italic={`· ${TersoStore.fmtWeekRange(weekKey)}`}
        actions={[
          <Button key="copy" variant="ghost" icon="download" onClick={() => setConfirmCopy(true)}>Copiar anterior</Button>,
          <Button key="exp" variant="ghost" icon="download" onClick={exportText}>Exportar</Button>,
          <Button key="pub" variant={week.status === "published" ? "gold" : "primary"} icon={week.status === "published" ? "check" : "upload"} onClick={togglePublish}>
            {week.status === "published" ? "Publicado" : "Publicar"}
          </Button>,
        ]}
      />

      {/* Week navigation + filters */}
      <div className="t-card" style={{ padding: 16, marginBottom: 18, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Button variant="ghost" className="t-btn--icon" onClick={() => setWeekKey(TersoStore.addDays(weekKey, -7))} title="Semana anterior">
            <Icon name="chev" size={16} style={{ transform: "rotate(180deg)" }} />
          </Button>
          <div style={{ minWidth: 220, textAlign: "center" }}>
            <div className="kana" style={{ marginBottom: 2 }}>Semana</div>
            <div style={{ fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
              {TersoStore.fmtWeekRange(weekKey)}
            </div>
          </div>
          <Button variant="ghost" className="t-btn--icon" onClick={() => setWeekKey(TersoStore.addDays(weekKey, 7))} title="Siguiente">
            <Icon name="chev" size={16} />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setWeekKey(TersoStore.weekStart(new Date()))}>Hoy</Button>
        <div style={{ flex: 1 }} />
        <Segmented
          value={filterRole}
          onChange={setFilterRole}
          options={[
            { value: "all", label: "Todos" },
            { value: "cocina", label: "Cocina" },
            { value: "piso", label: "Piso" },
            { value: "barra", label: "Barra" },
          ]}
        />
      </div>

      {/* Schedule grid */}
      {employees.length === 0 ? (
        <Empty title="Sin empleados" body="Ajusta el filtro o agrega empleados activos en Usuarios." />
      ) : (
        <div className="t-card schedule-card" style={{ padding: 0, overflow: "hidden" }}>
          <div className="schedule-grid">
            {/* Header row */}
            <div className="schedule-grid__head schedule-grid__col-emp">
              <span className="kana">Empleado</span>
            </div>
            {TersoStore.DAYS.map(d => {
              const date = TersoStore.addDays(weekKey, d.id);
              const isToday = date === TersoStore.toISO(new Date());
              return (
                <div key={d.id} className={`schedule-grid__head ${isToday ? "is-today" : ""}`}>
                  <div className="kana">{d.short}</div>
                  <div className="schedule-grid__date">{TersoStore.fromISO(date).getDate()}</div>
                </div>
              );
            })}

            {/* Rows */}
            {employees.map(u => {
              const role = TersoStore.ROLES[u.role];
              return (
                <React.Fragment key={u.id}>
                  <div className="schedule-grid__emp schedule-grid__col-emp">
                    <div className="avatar" style={{ width: 30, height: 30, fontSize: 12, background: role.color }}>{u.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{u.name.split(" ")[0]}</div>
                      <div style={{ fontSize: 10.5, fontFamily: "var(--f-mono)", color: "var(--t-muted)", letterSpacing: "0.1em", textTransform: "uppercase" }}>{role.label}</div>
                    </div>
                  </div>
                  {TersoStore.DAYS.map(d => {
                    const shift = week.entries[`${u.id}|${d.id}`];
                    // Count tareas asignadas a este usuario en este día
                    const taskCount = (state.taskCatalog || []).reduce((n, task) => {
                      if (!window.taskAppliesOnDay || !window.taskAppliesOnDay(task, d.id)) return n;
                      const assigned = state.taskTemplate?.[`${task.id}|${d.id}`];
                      return assigned === u.id ? n + 1 : n;
                    }, 0);
                    return (
                      <ShiftCell
                        key={d.id}
                        shift={shift}
                        taskCount={taskCount}
                        onClick={() => setEditing({ userId: u.id, dayIdx: d.id })}
                      />
                    );
                  })}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer summary */}
      {employees.length > 0 && (
        <div className="t-card" style={{ padding: 16, marginTop: 16, display: "flex", flexWrap: "wrap", gap: 32, justifyContent: "space-between", alignItems: "center" }}>
          <div className="row" style={{ gap: 28 }}>
            <SummaryStat label="Empleados" value={stats.employees} />
            <SummaryStat label="Turnos" value={stats.totalShifts} />
            <SummaryStat label="Horas totales" value={stats.totalHours} suffix="h" />
            <SummaryStat label="Descansos" value={stats.totalRest} />
          </div>
          <Button variant="ghost" size="sm" icon="trash" onClick={clearWeek} style={{ color: "var(--t-danger)" }}>Limpiar semana</Button>
        </div>
      )}

      {/* Edit shift sheet */}
      {editing && (
        <ShiftEditor
          user={state.users.find(u => u.id === editing.userId)}
          dayIdx={editing.dayIdx}
          weekKey={weekKey}
          shift={week.entries[`${editing.userId}|${editing.dayIdx}`]}
          onSave={(shift) => { setEntry(editing.userId, editing.dayIdx, shift); setEditing(null); }}
          onClear={() => { clearEntry(editing.userId, editing.dayIdx); setEditing(null); }}
          onClose={() => setEditing(null)}
        />
      )}

      {/* Copy confirm */}
      {confirmCopy && (
        <Sheet open title="¿Copiar de la semana anterior?" subtitle={TersoStore.fmtWeekRange(TersoStore.addDays(weekKey, -7))} onClose={() => setConfirmCopy(false)}
          footer={<><Button variant="ghost" onClick={() => setConfirmCopy(false)}>Cancelar</Button><Button icon="check" onClick={copyFromPrev}>Copiar</Button></>}>
          <p>Sustituirá los turnos de la semana actual con los de la anterior. Esta acción no afecta horarios ya publicados de otras semanas.</p>
        </Sheet>
      )}
    </div>
  );
};

// ---------- Cell (one day for one employee) ----------
const ShiftCell = ({ shift, taskCount, onClick }) => {
  const taskBadge = taskCount > 0 && (
    <span style={{
      position: "absolute", top: 4, right: 4,
      fontFamily: "var(--f-mono)", fontSize: 9, fontWeight: 600,
      background: "var(--t-gold)", color: "var(--t-green-deep, #1f2a1c)",
      padding: "1px 5px", borderRadius: 99, letterSpacing: "0.05em",
      display: "flex", alignItems: "center", gap: 2,
      lineHeight: 1.4,
    }} title={`${taskCount} tarea${taskCount > 1 ? "s" : ""} asignada${taskCount > 1 ? "s" : ""}`}>
      <Icon name="check" size={9} />{taskCount}
    </span>
  );
  if (!shift) {
    return (
      <button className="schedule-cell schedule-cell--empty" onClick={onClick} style={{ position: "relative" }}>
        <Icon name="plus" size={14} />
        {taskBadge}
      </button>
    );
  }
  if (shift.type === "rest") {
    return (
      <button className="schedule-cell schedule-cell--rest" onClick={onClick} style={{ position: "relative" }}>
        <span>Descanso</span>
        {taskBadge}
      </button>
    );
  }
  return (
    <button className="schedule-cell schedule-cell--work" onClick={onClick} style={{ position: "relative" }}>
      <span className="schedule-cell__from">{TersoStore.fmtTime(shift.from)}</span>
      <span className="schedule-cell__sep">–</span>
      <span className="schedule-cell__to">{TersoStore.fmtTime(shift.to)}</span>
      {taskBadge}
    </button>
  );
};

// ---------- Shift editor sheet ----------
const ShiftEditor = ({ user, dayIdx, weekKey, shift, onSave, onClear, onClose }) => {
  const day = TersoStore.DAYS[dayIdx];
  const date = TersoStore.addDays(weekKey, dayIdx);
  const [type, setType] = useState(shift?.type || "work");
  const [fromStr, setFromStr] = useState(shift?.type === "work" ? TersoStore.fmtTime(shift.from).replace(/\s/g, "") : "1:00PM");
  const [toStr, setToStr] = useState(shift?.type === "work" ? TersoStore.fmtTime(shift.to).replace(/\s/g, "") : "11:00PM");

  const fromMin = TersoStore.parseTime(fromStr);
  const toMin = TersoStore.parseTime(toStr);
  const valid = type === "rest" || (fromMin != null && toMin != null);

  const presets = [
    { label: "Apertura", from: "12 PM", to: "11 PM" },
    { label: "Cierre", from: "1 PM", to: "12 AM" },
    { label: "Comida", from: "1 PM", to: "10:30 PM" },
    { label: "Doble", from: "11 AM", to: "11 PM" },
    { label: "Domingo corto", from: "1 PM", to: "6:30 PM" },
  ];

  const applyPreset = (p) => { setType("work"); setFromStr(p.from); setToStr(p.to); };

  const save = () => {
    if (type === "rest") onSave({ type: "rest" });
    else onSave({ type: "work", from: fromMin, to: toMin });
  };

  const subtitle = `${day.label} · ${TersoStore.fromISO(date).toLocaleDateString("es-MX", { day: "numeric", month: "long" })}`;

  return (
    <Sheet open title={user.name} subtitle={subtitle} onClose={onClose}
      footer={<>
        {shift && <Button variant="ghost" icon="trash" onClick={onClear} style={{ color: "var(--t-danger)", marginRight: "auto" }}>Quitar</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid} icon="check" onClick={save}>Guardar</Button>
      </>}>
      <div style={{ display: "grid", gap: 18 }}>
        <Segmented
          value={type}
          onChange={setType}
          options={[
            { value: "work", label: "Trabaja" },
            { value: "rest", label: "Descanso" },
          ]}
        />

        {type === "work" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div>
                <label className="t-label">Entrada</label>
                <input className="t-input" placeholder="1 PM" value={fromStr} onChange={(e) => setFromStr(e.target.value)} />
                {fromMin != null && <div style={{ fontSize: 11.5, color: "var(--t-muted)", marginTop: 4, fontFamily: "var(--f-mono)" }}>{TersoStore.fmtTime(fromMin)}</div>}
              </div>
              <div>
                <label className="t-label">Salida</label>
                <input className="t-input" placeholder="11 PM" value={toStr} onChange={(e) => setToStr(e.target.value)} />
                {toMin != null && <div style={{ fontSize: 11.5, color: "var(--t-muted)", marginTop: 4, fontFamily: "var(--f-mono)" }}>{TersoStore.fmtTime(toMin)}</div>}
              </div>
            </div>

            {valid && (
              <div style={{ background: "var(--t-bone)", padding: "12px 14px", borderRadius: "var(--r-md)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="kana">Duración</span>
                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 500 }}>
                  {TersoStore.shiftHours({ type: "work", from: fromMin, to: toMin }).toFixed(1)} hrs
                </span>
              </div>
            )}

            <div>
              <label className="t-label">Atajos</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {presets.map(p => (
                  <button key={p.label} className="t-chip" style={{ cursor: "pointer", border: "1px solid var(--t-line-strong)" }} onClick={() => applyPreset(p)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Sheet>
  );
};

// ---------- Summary stat ----------
const SummaryStat = ({ label, value, suffix }) => (
  <div>
    <div className="kana">{label}</div>
    <div style={{ fontFamily: "var(--f-display)", fontSize: 22, fontWeight: 600, letterSpacing: "-0.01em" }}>
      {value}{suffix && <span style={{ fontSize: 14, color: "var(--t-muted)", marginLeft: 3 }}>{suffix}</span>}
    </div>
  </div>
);


export default Horarios;
