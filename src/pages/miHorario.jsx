// ============================================================
// TERSO — Mi horario (empleado)
//
// Vista personal del empleado: muestra solo SUS turnos de la semana,
// destacando el día de hoy. Permite navegar semanas publicadas.
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, PageHead } from '../components/ui';
import { taskAppliesOnDay } from '../lib/tareasHelpers';

const MiHorario = ({ state, currentUser, setPage }) => {
  const todayISO = TersoStore.toISO(new Date());
  const todayDow = (new Date().getDay() + 6) % 7; // Mon=0
  const [weekKey, setWeekKey] = useState(TersoStore.weekStart(new Date()));

  const week = useMemo(() => {
    return state.schedules.find(s => s.week === weekKey && s.status === "published") || null;
  }, [state.schedules, weekKey]);

  const myShifts = useMemo(() => {
    if (!week) return TersoStore.DAYS.map(() => null);
    return TersoStore.DAYS.map((_, i) => week.entries[`${currentUser.id}|${i}`] || null);
  }, [week, currentUser.id]);

  const totalHours = myShifts.reduce((acc, s) => acc + TersoStore.shiftHours(s), 0);
  const workDays = myShifts.filter(s => s?.type === "work").length;

  // Find today's shift
  const isCurrentWeek = weekKey === TersoStore.weekStart(new Date());
  const todayShift = isCurrentWeek ? myShifts[todayDow] : null;

  // Find next shift (today or after)
  const upcomingShift = useMemo(() => {
    if (!isCurrentWeek) return null;
    for (let i = todayDow; i < 7; i++) {
      const s = myShifts[i];
      if (s?.type === "work") return { shift: s, dayIdx: i, isToday: i === todayDow };
    }
    return null;
  }, [myShifts, isCurrentWeek, todayDow]);

  const role = TersoStore.ROLES[currentUser.role];

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Tu semana"
        title="Mi horario"
        italic={`· ${currentUser.name.split(" ")[0]}`}
      />

      {/* Hero card: today / next shift */}
      <div className="mihorario-hero" style={{ marginBottom: 22 }}>
        <div className="mihorario-hero__left">
          <div className="kana" style={{ color: "rgba(237,230,211,0.7)", marginBottom: 8 }}>
            {upcomingShift?.isToday ? "Hoy" : upcomingShift ? "Tu próximo turno" : "Sin turnos"}
          </div>
          {upcomingShift ? (
            <>
              <div style={{ fontFamily: "var(--f-display)", fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 6 }}>
                {TersoStore.fmtTime(upcomingShift.shift.from)} <span style={{ color: "var(--t-gold)" }}>→</span> {TersoStore.fmtTime(upcomingShift.shift.to)}
              </div>
              <div style={{ fontSize: 14.5, color: "rgba(237,230,211,0.7)" }}>
                {TersoStore.DAYS[upcomingShift.dayIdx].label} · {TersoStore.fromISO(TersoStore.addDays(weekKey, upcomingShift.dayIdx)).toLocaleDateString("es-MX", { day: "numeric", month: "long" })} · {TersoStore.shiftHours(upcomingShift.shift).toFixed(1)} hrs
              </div>
            </>
          ) : (
            <div style={{ fontFamily: "var(--f-display)", fontSize: 28, fontWeight: 500, letterSpacing: "-0.01em", color: "rgba(237,230,211,0.85)" }}>
              {week ? "No tienes turnos pendientes esta semana" : "Aún no se publica esta semana"}
            </div>
          )}
        </div>
        <div className="mihorario-hero__right">
          <div className="mihorario-hero__stat">
            <div className="kana" style={{ color: "rgba(237,230,211,0.55)" }}>Días</div>
            <div className="mihorario-hero__num">{workDays}</div>
          </div>
          <div className="mihorario-hero__stat">
            <div className="kana" style={{ color: "rgba(237,230,211,0.55)" }}>Horas</div>
            <div className="mihorario-hero__num">{totalHours.toFixed(1)}</div>
          </div>
        </div>
      </div>

      {/* Week navigation */}
      <div className="t-card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setWeekKey(TersoStore.addDays(weekKey, -7))} title="Anterior">
          <Icon name="chev" size={16} style={{ transform: "rotate(180deg)" }} />
        </Button>
        <div style={{ minWidth: 240, textAlign: "center" }}>
          <div className="kana" style={{ marginBottom: 2 }}>Semana</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {TersoStore.fmtWeekRange(weekKey)}
          </div>
        </div>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setWeekKey(TersoStore.addDays(weekKey, 7))} title="Siguiente">
          <Icon name="chev" size={16} />
        </Button>
        {!isCurrentWeek && (
          <Button variant="ghost" size="sm" onClick={() => setWeekKey(TersoStore.weekStart(new Date()))} style={{ marginLeft: 8 }}>
            Hoy
          </Button>
        )}
      </div>

      {/* Day list */}
      {!week ? (
        <Empty title="Horario no publicado" body="El administrador aún no publica los horarios de esta semana." />
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {TersoStore.DAYS.map((d, i) => {
            const shift = myShifts[i];
            const dayDate = TersoStore.addDays(weekKey, i);
            const isToday = dayDate === todayISO;
            const taskCount = (state.taskCatalog || []).reduce((n, task) => {
              if (!taskAppliesOnDay || !taskAppliesOnDay(task, d.id)) return n;
              const assigned = state.taskTemplate?.[`${task.id}|${d.id}`];
              return assigned === currentUser.id ? n + 1 : n;
            }, 0);
            return <DayRow key={d.id} day={d} date={dayDate} shift={shift} isToday={isToday} taskCount={taskCount} setPage={setPage} />;
          })}
        </div>
      )}

      {/* Footer note */}
      {week && (
        <p style={{ marginTop: 24, fontSize: 12.5, color: "var(--t-muted)", textAlign: "center", fontFamily: "var(--f-mono)", letterSpacing: "0.05em" }}>
          Publicado · {TersoStore.fmtRelative(week.publishedAt)}
        </p>
      )}
    </div>
  );
};

// ---------- Day row ----------
const DayRow = ({ day, date, shift, isToday, taskCount, setPage }) => {
  const dateObj = TersoStore.fromISO(date);
  const dayNum = dateObj.getDate();
  const monthStr = dateObj.toLocaleDateString("es-MX", { month: "short" });

  let bodyEl;
  if (!shift) {
    bodyEl = <span style={{ color: "var(--t-muted)", fontSize: 13.5 }}>—</span>;
  } else if (shift.type === "rest") {
    bodyEl = <span className="t-chip" style={{ background: "var(--t-bone)" }}>Descanso</span>;
  } else {
    bodyEl = (
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
        <span style={{ fontFamily: "var(--f-display)", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>
          {TersoStore.fmtTime(shift.from)} <span style={{ color: "var(--t-gold)" }}>–</span> {TersoStore.fmtTime(shift.to)}
        </span>
        <span style={{ fontSize: 12, fontFamily: "var(--f-mono)", color: "var(--t-muted)" }}>
          {TersoStore.shiftHours(shift).toFixed(1)} hrs
        </span>
        {taskCount > 0 && (
          <button onClick={() => setPage && setPage("misTareas")} style={{
            background: "rgba(196,160,79,0.15)", color: "#7a682f", border: "1px solid rgba(196,160,79,0.35)",
            fontFamily: "var(--f-mono)", fontSize: 10.5, padding: "3px 9px", borderRadius: 99,
            cursor: "pointer", letterSpacing: "0.05em", display: "inline-flex", alignItems: "center", gap: 4,
          }}>
            <Icon name="check" size={10} /> {taskCount} tarea{taskCount > 1 ? "s" : ""}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`t-card mihorario-day ${isToday ? "is-today" : ""}`} style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 18 }}>
      <div className={`mihorario-day__date ${isToday ? "is-today" : ""}`}>
        <div className="kana">{day.short}</div>
        <div className="mihorario-day__num">{dayNum}</div>
        <div style={{ fontSize: 10.5, color: "var(--t-muted)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{monthStr}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontFamily: "var(--f-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--t-muted)", marginBottom: 4 }}>
          {day.label}
        </div>
        {bodyEl}
      </div>
      {isToday && <span className="t-chip t-chip--gold">Hoy</span>}
    </div>
  );
};


export default MiHorario;
