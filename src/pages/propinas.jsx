// ============================================================
// TERSO — Propinas (admin)
//
// Reglas:
//   - Lunes cerrado (no se captura).
//   - Pool neto = PayTip × 0.965 + CashTip
//   - Cocina = mín(6% × venta, pool neto)
//   - Salón  = pool neto − cocina
//   - Reparto: partes iguales entre quienes trabajaron ese día.
//   - Piso: pago diario · Cocina+Barra: pago semanal el martes siguiente.
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Segmented, Sheet, Stepper, useToast, PageHead, Toggle } from '../components/ui';

const Propinas = ({ state, setState, currentUser }) => {
  const [weekKey, setWeekKey] = useState(TersoStore.weekStart(new Date()));
  const [editing, setEditing] = useState(null); // tip object or "new"
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  // Lunes = dayIdx 0; los demás abren
  const weekDates = useMemo(
    () => TersoStore.DAYS.map((_, i) => TersoStore.addDays(weekKey, i)),
    [weekKey]
  );

  const tipsByDate = useMemo(() => {
    const map = {};
    state.tips.forEach(t => { map[t.date] = t; });
    return map;
  }, [state.tips]);

  // Resumen semana (todos los días excepto lunes)
  const weekTotals = useMemo(() => {
    let pool = 0, cocina = 0, salon = 0, sale = 0, payTip = 0, cashTip = 0;
    weekDates.forEach((d, idx) => {
      if (idx === 0) return; // lunes cerrado
      const t = tipsByDate[d];
      if (!t) return;
      const p = TersoStore.computeTipPools(t);
      pool += p.netPool; cocina += p.cocinaPool; salon += p.salonPool;
      sale += t.sale || 0; payTip += t.payTip || 0; cashTip += t.cashTip || 0;
    });
    return { pool, cocina, salon, sale, payTip, cashTip };
  }, [weekDates, tipsByDate]);

  // Reparto por día → por persona (partes iguales por bolsa)
  const dailyDistribution = useMemo(() => {
    const out = {}; // dateISO → { cocina: { uid: amt }, salon: { uid: amt } }
    weekDates.forEach((dateISO, dayIdx) => {
      if (dayIdx === 0) return;
      const t = tipsByDate[dateISO];
      if (!t) return;
      out[dateISO] = computeDayDistribution(state, dateISO, dayIdx);
    });
    return out;
  }, [weekDates, tipsByDate, state.users, state.schedules]);

  // ---- Sección PISO: lista de depósitos diarios pendientes en la semana
  const pisoDeposits = useMemo(() => {
    // [{ userId, name, dateISO, amount, paid }]
    const items = [];
    weekDates.forEach((dateISO, idx) => {
      if (idx === 0) return;
      const dist = dailyDistribution[dateISO];
      if (!dist) return;
      Object.entries(dist.salon).forEach(([uid, amt]) => {
        const u = state.users.find(x => x.id === uid);
        if (!u) return;
        if (u.role !== "piso") return; // SOLO piso aquí
        const key = `piso:${uid}:${dateISO}`;
        items.push({
          userId: uid, name: u.name, dateISO, amount: amt,
          paid: !!state.tipPayments?.[key], key,
        });
      });
    });
    return items;
  }, [weekDates, dailyDistribution, state.users, state.tipPayments]);

  // ---- Sección COCINA + BARRA: acumulado semanal, se paga el martes siguiente
  const kitchenWeekly = useMemo(() => {
    // [{ userId, name, role, totalAmount, paid, key }]
    const totals = {}; // uid → amount
    weekDates.forEach((dateISO, idx) => {
      if (idx === 0) return;
      const dist = dailyDistribution[dateISO];
      if (!dist) return;
      Object.entries(dist.cocina).forEach(([uid, amt]) => {
        totals[uid] = (totals[uid] || 0) + amt;
      });
      Object.entries(dist.salon).forEach(([uid, amt]) => {
        const u = state.users.find(x => x.id === uid);
        if (u?.role === "barra") totals[uid] = (totals[uid] || 0) + amt;
      });
    });
    return Object.entries(totals).map(([uid, amount]) => {
      const u = state.users.find(x => x.id === uid);
      const key = `kitchen:${uid}:${weekKey}`;
      return {
        userId: uid,
        name: u?.name || "—",
        role: u?.role,
        totalAmount: amount,
        paid: !!state.tipPayments?.[key],
        key,
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount);
  }, [weekDates, dailyDistribution, state.users, weekKey, state.tipPayments]);

  // Día de pago para cocina/barra: martes siguiente al cierre de semana
  const payoutTuesday = useMemo(() => {
    return TersoStore.addDays(weekKey, 8); // lunes(0) → +8 días = martes próximo
  }, [weekKey]);

  const addAudit = (action) => ({ id: TersoStore.uid("a"), ts: Date.now(), userId: currentUser.id, action });

  const saveTip = (form) => {
    const exists = state.tips.find(t => t.date === form.date);
    if (exists) {
      setState(s => ({
        ...s,
        tips: s.tips.map(t => t.date === form.date ? { ...t, ...form } : t),
        audit: [addAudit(`Editó propina de ${TersoStore.fmtDate(TersoStore.fromISO(form.date))}`), ...s.audit],
      }));
      toast("Propina actualizada");
    } else {
      const t = { id: TersoStore.uid("tip"), ...form };
      setState(s => ({
        ...s,
        tips: [...s.tips, t],
        audit: [addAudit(`Capturó propina del ${TersoStore.fmtDate(TersoStore.fromISO(form.date))}`), ...s.audit],
      }));
      toast("Propina capturada");
    }
    setEditing(null);
  };

  const removeTip = (t) => {
    setState(s => ({
      ...s,
      tips: s.tips.filter(x => x.id !== t.id),
      audit: [addAudit(`Eliminó propina del ${TersoStore.fmtDate(TersoStore.fromISO(t.date))}`), ...s.audit],
    }));
    setConfirmDelete(null);
    toast("Propina eliminada");
  };

  const togglePayment = (key, paid) => {
    setState(s => {
      const next = { ...(s.tipPayments || {}) };
      if (paid) next[key] = true; else delete next[key];
      return { ...s, tipPayments: next };
    });
  };

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Cocina 6% · Salón remanente"
        title="Propinas"
        italic={`· ${TersoStore.fmtWeekRange(weekKey)}`}
      />

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

      {/* Resumen semanal */}
      <div className="propinas-summary" style={{ marginBottom: 22 }}>
        <BolsaCard
          label="Venta semana"
          amount={weekTotals.sale}
          accent="ink"
          subtitle="6 días operados"
        />
        <BolsaCard
          label="Bolsa Cocina"
          amount={weekTotals.cocina}
          accent="gold"
          subtitle="6% sobre venta"
          fraction={weekTotals.sale > 0 ? `${(weekTotals.cocina / weekTotals.sale * 100).toFixed(2)}%` : "—"}
        />
        <BolsaCard
          label="Bolsa Salón"
          amount={weekTotals.salon}
          accent="green"
          subtitle="Remanente del pool"
          fraction={weekTotals.sale > 0 ? `${(weekTotals.salon / weekTotals.sale * 100).toFixed(2)}%` : "—"}
        />
      </div>

      {/* Capturas del día */}
      <div style={{ marginBottom: 32 }}>
        <h2 className="section-h2" style={{ marginBottom: 12 }}>Captura por día</h2>
        <div style={{ display: "grid", gap: 10 }}>
          {weekDates.map((dateISO, dayIdx) => {
            const day = TersoStore.DAYS[dayIdx];
            const dateObj = TersoStore.fromISO(dateISO);
            const isToday = dateISO === TersoStore.toISO(new Date());
            const closed = dayIdx === 0;
            const tip = tipsByDate[dateISO];
            const pools = tip ? TersoStore.computeTipPools(tip) : null;
            return (
              <div
                key={dateISO}
                className={`t-card ${isToday ? "is-today" : ""}`}
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 18,
                  flexWrap: "wrap",
                  opacity: closed ? 0.55 : 1,
                  background: closed ? "var(--t-bone)" : undefined,
                }}
              >
                <div className={`mihorario-day__date ${isToday ? "is-today" : ""}`} style={{ flexShrink: 0 }}>
                  <div className="kana">{day.short}</div>
                  <div className="mihorario-day__num">{dateObj.getDate()}</div>
                </div>
                <div style={{ flex: "1 1 240px", minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontFamily: "var(--f-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--t-muted)", marginBottom: 4 }}>
                    {day.label}
                  </div>
                  {closed ? (
                    <div style={{ color: "var(--t-muted)", fontSize: 13.5, fontStyle: "italic" }}>Cerrado · sin operación</div>
                  ) : !tip ? (
                    <div style={{ color: "var(--t-muted)", fontSize: 13.5 }}>Sin captura</div>
                  ) : (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 14, fontSize: 12.5 }}>
                      <span><span className="kana">PAY</span> {money(tip.payTip)}</span>
                      <span><span className="kana">EFE</span> {money(tip.cashTip)}</span>
                      <span><span className="kana">VENTA</span> {money(tip.sale)}</span>
                      {tip.note && <span style={{ color: "var(--t-muted)", fontStyle: "italic" }}>· {tip.note}</span>}
                    </div>
                  )}
                </div>
                {!closed && pools && (
                  <div style={{ display: "flex", gap: 16 }}>
                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div className="kana" style={{ color: "var(--t-gold-deep, #8a6e2c)" }}>Cocina</div>
                      <div style={{ fontFamily: "var(--f-display)", fontSize: 15, fontWeight: 600 }}>{money(pools.cocinaPool)}</div>
                    </div>
                    <div style={{ textAlign: "right", minWidth: 90 }}>
                      <div className="kana" style={{ color: "var(--t-green)" }}>Salón</div>
                      <div style={{ fontFamily: "var(--f-display)", fontSize: 15, fontWeight: 600 }}>{money(pools.salonPool)}</div>
                    </div>
                  </div>
                )}
                {!closed && (
                  <Button
                    variant={tip ? "ghost" : "primary"}
                    size="sm"
                    icon={tip ? "edit" : "plus"}
                    onClick={() => setEditing(tip || { date: dateISO, payTip: 0, cashTip: 0, sale: 0, note: "" })}
                  >
                    {tip ? "Editar" : "Capturar"}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECCIÓN A — Piso: pago diario */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6 }}>
          <h2 className="section-h2" style={{ margin: 0 }}>Depósitos diarios — Piso</h2>
          <span className="t-chip t-chip--ok" style={{ fontSize: 11 }}>Pago en el día</span>
        </div>
        <p style={{ color: "var(--t-muted)", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          A los meseros se les deposita su parte cada noche al cierre. Marca el check cuando ya hayas hecho la transferencia.
        </p>
        {pisoDeposits.length === 0 ? (
          <Empty title="Sin depósitos pendientes" body="Captura propinas para generar el reparto." />
        ) : (
          <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="t-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Mesero</th>
                  <th style={{ textAlign: "right" }}>Cantidad</th>
                  <th style={{ textAlign: "center", width: 90 }}>Depositado</th>
                </tr>
              </thead>
              <tbody>
                {pisoDeposits.map((d) => {
                  const dObj = TersoStore.fromISO(d.dateISO);
                  const u = state.users.find(x => x.id === d.userId);
                  const role = u && TersoStore.ROLES[u.role];
                  return (
                    <tr key={d.key} style={{ opacity: d.paid ? 0.55 : 1 }}>
                      <td style={{ fontFamily: "var(--f-mono)", fontSize: 13 }}>
                        {dObj.toLocaleDateString("es-MX", { weekday: "short", day: "2-digit", month: "short" })}
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar" style={{ width: 26, height: 26, fontSize: 11, background: role?.color || "var(--t-muted)" }}>{d.name[0]}</div>
                          <span style={{ fontWeight: 500, textDecoration: d.paid ? "line-through" : "none" }}>{d.name}</span>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600 }}>{money(d.amount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <PayCheckbox checked={d.paid} onChange={(v) => togglePayment(d.key, v)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SECCIÓN B — Cocina + Barra: pago semanal */}
      <div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 6, flexWrap: "wrap" }}>
          <h2 className="section-h2" style={{ margin: 0 }}>Depósito semanal — Cocina y Barra</h2>
          <span className="t-chip t-chip--gold" style={{ fontSize: 11 }}>
            Se paga el {TersoStore.fmtDate(TersoStore.fromISO(payoutTuesday))}
          </span>
        </div>
        <p style={{ color: "var(--t-muted)", fontSize: 13, marginTop: 0, marginBottom: 12 }}>
          Acumulado de la semana. El depósito se libera el martes siguiente.
        </p>
        {kitchenWeekly.length === 0 ? (
          <Empty title="Sin acumulado" body="Captura propinas en la semana para generar el reparto." />
        ) : (
          <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
            <table className="t-table">
              <thead>
                <tr>
                  <th>Empleado</th>
                  <th>Rol</th>
                  <th style={{ textAlign: "right" }}>Acumulado</th>
                  <th style={{ textAlign: "center", width: 110 }}>Depositado</th>
                </tr>
              </thead>
              <tbody>
                {kitchenWeekly.map(row => {
                  const role = TersoStore.ROLES[row.role];
                  return (
                    <tr key={row.key} style={{ opacity: row.paid ? 0.55 : 1 }}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar" style={{ width: 28, height: 28, fontSize: 12, background: role?.color }}>{row.name[0]}</div>
                          <span style={{ fontWeight: 500, textDecoration: row.paid ? "line-through" : "none" }}>{row.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`t-chip ${row.role === "barra" ? "t-chip--ok" : "t-chip--gold"}`}>
                          {role?.label}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "var(--f-display)", fontSize: 17, fontWeight: 600 }}>{money(row.totalAmount)}</td>
                      <td style={{ textAlign: "center" }}>
                        <PayCheckbox checked={row.paid} onChange={(v) => togglePayment(row.key, v)} />
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: "var(--t-bone)", fontWeight: 600 }}>
                  <td colSpan={2} style={{ textAlign: "right" }}>Total a depositar el martes</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--f-display)", fontSize: 17 }}>
                    {money(kitchenWeekly.reduce((a, r) => a + (r.paid ? 0 : r.totalAmount), 0))}
                  </td>
                  <td style={{ textAlign: "center", fontSize: 11, color: "var(--t-muted)" }}>
                    {kitchenWeekly.filter(r => r.paid).length}/{kitchenWeekly.length} pagados
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && (
        <TipForm
          initial={editing}
          onSave={saveTip}
          onClose={() => setEditing(null)}
          onDelete={editing.id ? () => setConfirmDelete(editing) : null}
        />
      )}

      {confirmDelete && (
        <Sheet open title="¿Eliminar captura?" subtitle={TersoStore.fmtDate(TersoStore.fromISO(confirmDelete.date))} onClose={() => setConfirmDelete(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button><Button variant="danger" icon="trash" onClick={() => removeTip(confirmDelete)}>Eliminar</Button></>}>
          <p>Se removerá del reparto. Esta acción se puede deshacer recapturando los datos del día.</p>
        </Sheet>
      )}
    </div>
  );
};

// ---------- Bolsa card ----------
const BolsaCard = ({ label, amount, subtitle, fraction, accent }) => {
  const styles = {
    ink:   { bg: "var(--t-green-deep)", color: "var(--t-cream)" },
    green: { bg: "var(--t-green)",      color: "var(--t-cream)" },
    gold:  { bg: "var(--t-gold)",       color: "var(--t-green-deep)" },
  }[accent] || {};
  return (
    <div className="t-card propinas-bolsa" style={{ background: styles.bg, color: styles.color, padding: "20px 22px" }}>
      <div className="kana" style={{ color: accent === "gold" ? "rgba(31,42,28,0.55)" : "rgba(237,230,211,0.7)", marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: "var(--f-display)", fontSize: "clamp(26px, 3vw, 34px)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.05 }}>{money(amount)}</div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, fontSize: 12, opacity: 0.8 }}>
        <span>{subtitle}</span>
        {fraction && <span style={{ fontFamily: "var(--f-mono)", letterSpacing: "0.1em" }}>{fraction}</span>}
      </div>
    </div>
  );
};

// ---------- Tip form ----------
const TipForm = ({ initial, onSave, onClose, onDelete }) => {
  const [form, setForm] = useState({
    date: initial.date,
    payTip: initial.payTip || 0,
    cashTip: initial.cashTip || 0,
    sale: initial.sale || 0,
    note: initial.note || "",
    id: initial.id,
  });
  const pools = TersoStore.computeTipPools(form);
  const valid = form.date && (form.payTip > 0 || form.cashTip > 0) && form.sale > 0;
  const dateLabel = TersoStore.fmtDate(TersoStore.fromISO(form.date));

  return (
    <Sheet open title={initial.id ? "Editar captura" : "Capturar propina del día"} subtitle={dateLabel} onClose={onClose}
      footer={<>
        {onDelete && <Button variant="ghost" icon="trash" onClick={onDelete} style={{ color: "var(--t-danger)", marginRight: "auto" }}>Eliminar</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid} icon="check" onClick={() => onSave(form)}>Guardar</Button>
      </>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label className="t-label">
              Propina PAY (tarjeta)
              <span style={{ marginLeft: 6, fontSize: 10.5, color: "var(--t-danger)", fontWeight: 600 }}>− 3.5%</span>
            </label>
            <input type="number" inputMode="decimal" min="0" step="10" className="t-input" value={form.payTip || ""}
              onChange={(e) => setForm({ ...form, payTip: parseFloat(e.target.value) || 0 })} autoFocus placeholder="0.00" />
            {form.payTip > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>
                Neto: {money(pools.payNet)}
              </div>
            )}
          </div>
          <div>
            <label className="t-label">Propina Efectivo</label>
            <input type="number" inputMode="decimal" min="0" step="10" className="t-input" value={form.cashTip || ""}
              onChange={(e) => setForm({ ...form, cashTip: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
            {form.cashTip > 0 && (
              <div style={{ marginTop: 4, fontSize: 11, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>
                Íntegro
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="t-label">Venta total del día</label>
          <input type="number" inputMode="decimal" min="0" step="100" className="t-input" value={form.sale || ""}
            onChange={(e) => setForm({ ...form, sale: parseFloat(e.target.value) || 0 })} placeholder="0.00" />
          <div style={{ marginTop: 4, fontSize: 11, color: "var(--t-muted)" }}>
            Necesario para calcular el 6% que va a cocina.
          </div>
        </div>

        {valid && (
          <div style={{ padding: 14, background: "var(--t-bone)", borderRadius: "var(--r-md)", display: "grid", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="kana">Pool neto a repartir</span>
              <span style={{ fontFamily: "var(--f-display)", fontSize: 18, fontWeight: 600 }}>{money(pools.netPool)}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--t-line)", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <div className="kana">Cocina <span style={{ opacity: 0.7 }}>· 6% venta</span></div>
                <div style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600, color: "var(--t-gold-deep, #8a6e2c)" }}>{money(pools.cocinaPool)}</div>
              </div>
              <div>
                <div className="kana">Salón <span style={{ opacity: 0.7 }}>· remanente</span></div>
                <div style={{ fontFamily: "var(--f-display)", fontSize: 16, fontWeight: 600, color: "var(--t-green)" }}>{money(pools.salonPool)}</div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: "var(--t-muted)", borderTop: "1px solid var(--t-line)", paddingTop: 8 }}>
              {(pools.totalNetPct * 100).toFixed(2)}% sobre venta
              {pools.cocinaPool < pools.cocinaTarget && pools.salonPool === 0 && (
                <span style={{ color: "var(--t-danger)", marginLeft: 8 }}>· Cocina no alcanzó el 6% completo</span>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="t-label">Nota (opcional)</label>
          <input className="t-input" value={form.note || ""} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ej. Reservación grande, evento" />
        </div>
      </div>
    </Sheet>
  );
};

// Custom checkbox styled to match the system
const PayCheckbox = ({ checked, onChange }) => (
  <label style={{ display: "inline-flex", cursor: "pointer", alignItems: "center", justifyContent: "center" }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
    />
    <span style={{
      width: 22, height: 22, borderRadius: 6,
      border: `1.5px solid ${checked ? "var(--t-green)" : "var(--t-line-strong)"}`,
      background: checked ? "var(--t-green)" : "transparent",
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      transition: "all 160ms ease",
    }}>
      {checked && (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--t-cream)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      )}
    </span>
  </label>
);

// ============================================================
// Helpers
// ============================================================

// Para un día dado, calcula cuánto le toca a cada persona dentro de cada bolsa.
// Reparto: partes IGUALES entre quienes trabajaron ese día (dentro de cada bolsa).
// Returns { cocina: { uid: amount }, salon: { uid: amount } }
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
    const pool = TersoStore.tipPool(u.role); // 'cocina' or 'salon'
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

// Legacy export — kept for any other module that may reference it
function computeDaySplit(state, dateISO, dayIdx, _ignored) {
  const dist = computeDayDistribution(state, dateISO, dayIdx);
  const perUser = { ...dist.cocina, ...dist.salon };
  return { perUser, hoursByPool: { cocina: 0, salon: 0 } };
}

function sumWeekHours(state, userId, weekKey) {
  const sched = state.schedules.find(s => s.week === weekKey);
  if (!sched) return 0;
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const s = sched.entries[`${userId}|${i}`];
    total += TersoStore.shiftHours(s);
  }
  return total;
}

function money(n) {
  return "$" + (n || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}






export default Propinas;
