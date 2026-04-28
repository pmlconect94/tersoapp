import TersoStore from './store';
// ============================================================
// TERSO — Tareas helpers (compartido entre admin y empleado)
// ============================================================

// dayIdx 0..6 (Lun..Dom)
export function taskDayIdx(dateISO) {
  const d = TersoStore.fromISO(dateISO);
  return (d.getDay() + 6) % 7;
};

// Si una tarea aplica a este día (semanal => solo viernes/idx 4 por convención)
export function taskAppliesOnDay(task, dayIdx) {
  if (task.freq === "diaria") return true;
  if (task.freq === "semanal") return dayIdx === 4;
  return false;
};

// Resuelve la asignación efectiva para un (taskId, dayIdx, dateISO)
// Prioridad: override por fecha → plantilla recurrente → null
export function taskAssignmentFor(state, taskId, dayIdx, dateISO) {
  const overrideKey = `${taskId}|${dateISO}`;
  if (state.taskOverrides && state.taskOverrides[overrideKey]) return state.taskOverrides[overrideKey];
  return state.taskTemplate?.[`${taskId}|${dayIdx}`] || null;
};

// Construye la lista de tareas asignadas a un usuario en un día concreto
export function tasksForUserOnDay(state, userId, dateISO) {
  const dayIdx = taskDayIdx(dateISO);
  if (dayIdx === 0) return []; // lunes cerrado
  const out = [];
  state.taskCatalog.forEach(task => {
    if (!taskAppliesOnDay(task, dayIdx)) return;
    const assigned = taskAssignmentFor(state, task.id, dayIdx, dateISO);
    if (assigned === userId) out.push(task);
  });
  return out;
};

// Obtiene el record (o null) para (taskId, userId, dateISO)
export function findTaskRecord(state, taskId, userId, dateISO) {
  return state.taskRecords.find(r => r.taskId === taskId && r.userId === userId && r.dateISO === dateISO);
};

// Performance metrics por usuario en rango
export function computeTaskPerformance(state, userId, fromISO, toISO) {
  const records = state.taskRecords.filter(r =>
    r.userId === userId && r.dateISO >= fromISO && r.dateISO <= toISO
  );
  const total = records.length;
  const completed = records.filter(r => r.status !== "pendiente").length;
  const approved = records.filter(r => r.status === "aprobada").length;
  const rejected = records.filter(r => r.status === "rechazada").length;
  const audited = approved + rejected;
  return {
    total,
    completed,
    approved,
    rejected,
    audited,
    completionPct: total ? completed / total : 0,
    approvalPct: audited ? approved / audited : 0,
  };
};

// Helpers de chip por status (consistent UI)
export function taskStatusChip(status) {
  const meta = TersoStore.TASK_STATUS[status] || TersoStore.TASK_STATUS.pendiente;
  let cls = "t-chip";
  if (status === "aprobada") cls = "t-chip t-chip--ok";
  else if (status === "rechazada") cls = "t-chip t-chip--danger";
  else if (status === "hecha") cls = "t-chip t-chip--gold";
  return { cls, label: meta.label };
};
