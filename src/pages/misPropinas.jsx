// ============================================================
// TERSO — Mis propinas (empleado)
//
// Vista personal: lo que le toca a este empleado por día.
// Piso → muestra cada día con estado pagado/pendiente.
// Cocina/Barra → muestra acumulado semanal con estado.
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, PageHead, Segmented } from '../components/ui';

const MisPropinas = ({ state, currentUser }) => {
  const [weekKey, setWeekKey] = useState(TersoStore.weekStart(new Date()));

  const weekDates = useMemo(
    () => TersoStore.DAYS.map((_, i) => TersoStore.addDays(weekKey, i)),
    [weekKey]
  );

  const myPool = TersoStore.tipPool(currentUser.role); // 'cocina' or 'salon'
  const isPiso = currentUser.role === "piso";
  const role = TersoStore.ROLES[currentUser.role];

  // Reparto por día → mi monto + bolsa total del día
  const dayRows = useMemo(() => {
    return weekDates.map((dateISO, dayIdx) => {
      if (dayIdx === 0) {
        return { dateISO, dayIdx, mine: 0, dayPool: 0, hours: 0, closed: true };
      }
      const tip = state.tips.find(t => t.date === dateISO);
      if (!tip) return { dateISO, dayIdx, mine: 0, dayPool: 0, hours: 0 };
      const dist = computeDayDistribution(state, dateISO, dayIdx);
      const mine = (dist.cocina[currentUser.id] || 0) + (dist.salon[currentUser.id] || 0);
      const pools = TersoStore.computeTipPools(tip);
      const dayPool = myPool === "cocina" ? pools.cocinaPool : pools.salonPool;
      const sched = state.schedules.find(s => s.week === weekKey);
      const shift = sched?.entries[`${currentUser.id}|${dayIdx}`];
      const hrs = TersoStore.shiftHours(shift);
      return { dateISO, dayIdx, mine, dayPool, hours: hrs };
    });
  }, [weekDates, state.tips, state.schedules, weekKey, currentUser.id, myPool]);

  const weekTotal = dayRows.reduce((a, d) => a + d.mine, 0);
  const totalHours = dayRows.reduce((a, d) => a + d.hours, 0);
  const daysWorked = dayRows.filter(d => d.mine > 0).length;

  // Para piso: estado pagado por día. Para cocina/barra: estado pagado por semana.
  const pisoPaid = (dateISO) => !!state.tipPayments?.[`piso:${currentUser.id}:${dateISO}`];
  const kitchenPaidThisWeek = !!state.tipPayments?.[`kitchen:${currentUser.id}:${weekKey}`];
  const payoutTuesday = TersoStore.addDays(weekKey, 8); // martes siguiente

  // 4-week trend
  const trend = useMemo(() => {
    const weeks = [];
    for (let i = 0; i < 4; i++) {
      const wk = TersoStore.addDays(weekKey, -7 * i);
      const dates = TersoStore.DAYS.map((_, di) => TersoStore.addDays(wk, di));
      let amt = 0;
      dates.forEach((d, idx) => {
        if (idx === 0) return;
        const dist = computeDayDistribution(state, d, idx);
        amt += (dist.cocina[currentUser.id] || 0) + (dist.salon[currentUser.id] || 0);
      });
      weeks.unshift({ wk, amt });
    }
    return weeks;
  }, [weekKey, state.tips, state.schedules, currentUser.id]);

  const maxAmt = Math.max(1, ...trend.map(t => t.amt));

  // Estado de pago para mostrar en hero
  const paidAmount = useMemo(() => {
    if (isPiso) {
      return dayRows.reduce((a, d) => a + (pisoPaid(d.dateISO) ? d.mine : 0), 0);
    }
    return kitchenPaidThisWeek ? weekTotal : 0;
  }, [dayRows, isPiso, kitchenPaidThisWeek, weekTotal, state.tipPayments]);
  const pendingAmount = weekTotal - paidAmount;

  return (
    <div className="fade-in">
      <PageHead
        eyebrow={`${role?.label} · Bolsa ${myPool === "cocina" ? "Cocina" : "Salón"}`}
        title="Mis propinas"
        italic={`· ${currentUser.name.split(" ")[0]}`}
      />

      {/* Hero */}
      <div className="mihorario-hero" style={{ marginBottom: 22 }}>
        <div className="mihorario-hero__left">
          <div className="kana" style={{ color: "rgba(237,230,211,0.7)", marginBottom: 8 }}>Tu semana</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: "clamp(34px, 5vw, 52px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05, marginBottom: 10 }}>
            {tipMoney(weekTotal)}
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 13.5, flexWrap: "wrap" }}>
            <div style={{ color: "rgba(237,230,211,0.85)" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "var(--t-gold)", marginRight: 6 }} />
              Pagado: <strong>{tipMoney(paidAmount)}</strong>
            </div>
            <div style={{ color: "rgba(237,230,211,0.85)" }}>
              <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 99, background: "rgba(237,230,211,0.45)", marginRight: 6 }} />
              Pendiente: <strong>{tipMoney(pendingAmount)}</strong>
            </div>
          </div>
        </div>
        <div className="mihorario-hero__right">
          <div className="mihorario-hero__stat">
            <div className="kana" style={{ color: "rgba(237,230,211,0.55)" }}>Días con propina</div>
            <div className="mihorario-hero__num">{daysWorked}</div>
          </div>
        </div>
      </div>

      {/* Aviso de cuándo se paga */}
      {!isPiso && weekTotal > 0 && (
        <div className="t-card" style={{
          padding: "12px 16px", marginBottom: 18,
          background: kitchenPaidThisWeek ? "rgba(58,90,64,0.08)" : "rgba(196,160,79,0.12)",
          borderLeft: `3px solid ${kitchenPaidThisWeek ? "var(--t-green)" : "var(--t-gold)"}`,
          display: "flex", alignItems: "center", gap: 12,
        }}>
          {kitchenPaidThisWeek ? (
            <>
              <Icon name="check" size={18} style={{ color: "var(--t-green)" }} />
              <span style={{ fontSize: 13.5 }}>
                <strong>Depósito realizado.</strong> Tus propinas de esta semana ya fueron transferidas.
              </span>
            </>
          ) : (
            <>
              <Icon name="info" size={18} style={{ color: "var(--t-gold-deep, #8a6e2c)" }} />
              <span style={{ fontSize: 13.5 }}>
                Tu acumulado se paga el <strong>{TersoStore.fmtDate(TersoStore.fromISO(payoutTuesday))}</strong> (martes siguiente).
              </span>
            </>
          )}
        </div>
      )}

      {/* Week navigation */}
      <div className="t-card" style={{ padding: 14, marginBottom: 18, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setWeekKey(TersoStore.addDays(weekKey, -7))}>
          <Icon name="chev" size={16} style={{ transform: "rotate(180deg)" }} />
        </Button>
        <div style={{ minWidth: 220, textAlign: "center" }}>
          <div className="kana" style={{ marginBottom: 2 }}>Semana</div>
          <div style={{ fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600, letterSpacing: "-0.01em" }}>
            {TersoStore.fmtWeekRange(weekKey)}
          </div>
        </div>
        <Button variant="ghost" className="t-btn--icon" onClick={() => setWeekKey(TersoStore.addDays(weekKey, 7))}>
          <Icon name="chev" size={16} />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setWeekKey(TersoStore.weekStart(new Date()))} style={{ marginLeft: 8 }}>Hoy</Button>
      </div>

      {/* Day breakdown */}
      <div style={{ marginBottom: 28 }}>
        <h2 className="section-h2" style={{ marginBottom: 12 }}>Desglose diario</h2>
        {weekTotal === 0 ? (
          <Empty title="Sin propinas registradas" body="Aparecerán aquí cuando el administrador capture las propinas del día." />
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {dayRows.map(d => {
              const day = TersoStore.DAYS[d.dayIdx];
              const dateObj = TersoStore.fromISO(d.dateISO);
              const isToday = d.dateISO === TersoStore.toISO(new Date());
              const closed = d.closed;
              const inactive = !closed && d.mine === 0;
              const paid = isPiso ? pisoPaid(d.dateISO) : kitchenPaidThisWeek;
              return (
                <div key={d.dateISO} className={`t-card ${isToday ? "is-today" : ""}`} style={{
                  padding: "14px 18px", display: "flex", alignItems: "center", gap: 16,
                  opacity: closed ? 0.5 : (inactive ? 0.55 : 1),
                  background: closed ? "var(--t-bone)" : undefined,
                }}>
                  <div className={`mihorario-day__date ${isToday ? "is-today" : ""}`}>
                    <div className="kana">{day.short}</div>
                    <div className="mihorario-day__num">{dateObj.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontFamily: "var(--f-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--t-muted)", marginBottom: 2 }}>
                      {day.label}
                    </div>
                    {closed ? (
                      <div style={{ fontSize: 13, color: "var(--t-muted)", fontStyle: "italic" }}>Cerrado</div>
                    ) : d.hours > 0 ? (
                      <div style={{ fontSize: 13, color: "var(--t-muted)" }}>
                        {d.hours.toFixed(1)} hrs · bolsa del día {tipMoney(d.dayPool)}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: "var(--t-muted)" }}>Sin turno</div>
                    )}
                  </div>
                  <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                    {d.mine > 0 ? (
                      <>
                        <div style={{ fontFamily: "var(--f-display)", fontSize: 19, fontWeight: 600, letterSpacing: "-0.01em" }}>{tipMoney(d.mine)}</div>
                        {paid ? (
                          <span className="t-chip t-chip--ok" style={{ fontSize: 10.5, padding: "2px 8px" }}>
                            <Icon name="check" size={11} style={{ marginRight: 3 }} /> Pagado
                          </span>
                        ) : (
                          <span className="t-chip" style={{ fontSize: 10.5, padding: "2px 8px", background: "var(--t-bone)", color: "var(--t-muted)" }}>
                            Pendiente
                          </span>
                        )}
                      </>
                    ) : (
                      <div style={{ fontSize: 13.5, color: "var(--t-muted)" }}>—</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4-week trend */}
      <div>
        <h2 className="section-h2" style={{ marginBottom: 12 }}>Últimas 4 semanas</h2>
        <div className="t-card" style={{ padding: "20px 22px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 14, height: 140, marginBottom: 12 }}>
            {trend.map((t, i) => {
              const h = (t.amt / maxAmt) * 100;
              const isCurrent = t.wk === weekKey;
              return (
                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, height: "100%" }}>
                  <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
                    <div style={{
                      width: "70%",
                      height: `${h}%`,
                      minHeight: t.amt > 0 ? 4 : 0,
                      background: isCurrent ? "var(--t-green)" : "var(--t-gold-soft)",
                      borderRadius: "8px 8px 0 0",
                      transition: "all 400ms var(--ease-apple)",
                    }} />
                  </div>
                  <div style={{ fontFamily: "var(--f-mono)", fontSize: 10.5, color: "var(--t-muted)", letterSpacing: "0.08em" }}>
                    {TersoStore.fromISO(t.wk).toLocaleDateString("es-MX", { day: "numeric", month: "short" })}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid var(--t-line)", paddingTop: 12, fontSize: 12.5, color: "var(--t-muted)", flexWrap: "wrap", gap: 8 }}>
            {trend.map((t, i) => (
              <div key={i} style={{ flex: 1, textAlign: "center", minWidth: 70 }}>
                <div style={{ fontFamily: "var(--f-display)", fontSize: 15, fontWeight: 600, color: "var(--t-ink)", letterSpacing: "-0.01em" }}>{tipMoney(t.amt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer note */}
      <p style={{ marginTop: 24, fontSize: 12, color: "var(--t-muted)", textAlign: "center", fontFamily: "var(--f-mono)", letterSpacing: "0.05em", lineHeight: 1.6 }}>
        {isPiso
          ? "Reparto en partes iguales · pago diario al cierre"
          : "Reparto en partes iguales · pago semanal el martes siguiente"}
      </p>
    </div>
  );
};



// Day distribution helper (shared with Propinas)
function computeDayDistribution(state, dateISO, dayIdx) {
  const result = { cocina: {}, salon: {} };
  const tip = state.tips.find(t => t.date === dateISO);
  if (!tip) return result;
  const pools = TersoStore.computeTipPools(tip);
  const week = TersoStore.weekStart(TersoStore.fromISO(dateISO));
  const sched = state.schedules.find(s => s.week === week);
  if (!sched) return result;
  const cocinaUsers = [];
  const salonUsers = [];
  state.users.forEach(u => {
    if (!u.active || u.role === "admin") return;
    const shift = sched.entries[`${u.id}|${dayIdx}`];
    if (shift?.type !== "work") return;
    const pool = TersoStore.tipPool(u.role);
    if (pool === "cocina") cocinaUsers.push(u.id);
    else if (pool === "salon") salonUsers.push(u.id);
  });
  if (cocinaUsers.length > 0) {
    const share = pools.cocinaPool / cocinaUsers.length;
    cocinaUsers.forEach(uid => { result.cocina[uid] = share; });
  }
  if (salonUsers.length > 0) {
    const share = pools.salonPool / salonUsers.length;
    salonUsers.forEach(uid => { result.salon[uid] = share; });
  }
  return result;
}

export default MisPropinas;
