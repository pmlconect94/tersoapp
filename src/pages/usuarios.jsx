// ============================================================
// TERSO — Usuarios page (admin only)
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Toggle, Sheet, useToast, PageHead } from '../components/ui';

const Usuarios = ({ state, setState, currentUser, search }) => {
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = state.users;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    }
    // Pendientes de asignar rol siempre arriba, luego alfabético
    return [...list].sort((a, b) => {
      if (a.role === 'pending' && b.role !== 'pending') return -1;
      if (a.role !== 'pending' && b.role === 'pending') return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [state.users, search]);

  const addAudit = (action) => ({ id: TersoStore.uid("a"), ts: Date.now(), userId: currentUser.id, action });

  const save = (form) => {
    if (editing === "new") {
      const u = { id: TersoStore.uid("u"), ...form, created: Date.now() };
      setState(s => ({ ...s, users: [...s.users, u], audit: [addAudit(`Dio de alta al usuario ${u.name}`), ...s.audit] }));
      toast(`Usuario "${u.name}" creado`);
    } else {
      setState(s => ({
        ...s,
        users: s.users.map(u => u.id === editing.id ? { ...u, ...form } : u),
        audit: [addAudit(`Editó al usuario ${form.name}`), ...s.audit],
      }));
      toast(`Usuario actualizado`);
    }
    setEditing(null);
  };

  const remove = (u) => {
    if (u.id === currentUser.id) { toast("No puedes eliminarte a ti mismo", "warn"); return; }
    setState(s => ({ ...s, users: s.users.filter(x => x.id !== u.id), audit: [addAudit(`Dio de baja al usuario ${u.name}`), ...s.audit] }));
    toast(`Usuario "${u.name}" eliminado`);
    setConfirmDelete(null);
  };

  const toggleActive = (u) => {
    setState(s => ({
      ...s,
      users: s.users.map(x => x.id === u.id ? { ...x, active: !x.active } : x),
      audit: [addAudit(`${u.active ? "Desactivó" : "Activó"} al usuario ${u.name}`), ...s.audit],
    }));
  };

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Accesos"
        title="Usuarios"
        actions={[<Button key="add" icon="plus" onClick={() => setEditing("new")}>Nuevo usuario</Button>]}
      />

      <div className="t-card" style={{ overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="t-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Correo</th>
                <th>Rol</th>
                <th>Áreas</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => {
                const role = TersoStore.ROLES[u.role];
                const isPending = u.role === 'pending';
                return (
                  <tr key={u.id} className="is-clickable" onClick={() => setEditing(u)}
                    style={isPending ? { background: "rgba(160,121,107,0.07)" } : undefined}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: role.color }}>{u.name[0]}</div>
                        <div>
                          <div style={{ fontWeight: 500 }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>desde {TersoStore.fmtDate(u.created)}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ color: "var(--t-muted)", fontFamily: "var(--f-mono)", fontSize: 12.5 }}>{u.email}</td>
                    <td><span className="t-chip" style={{ background: role.color + "22", color: role.color, borderColor: role.color + "55" }}>{role.label}</span></td>
                    <td style={{ fontSize: 12.5, color: "var(--t-muted)" }}>{role.areas.map(a => TersoStore.AREAS[a].label).join(", ")}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Toggle on={u.active} onChange={() => toggleActive(u)} />
                    </td>
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                      <button className="t-btn t-btn--ghost t-btn--icon" onClick={() => setEditing(u)}><Icon name="edit" size={14}/></button>
                      {u.id !== currentUser.id && <button className="t-btn t-btn--ghost t-btn--icon" onClick={() => setConfirmDelete(u)} style={{ color: "var(--t-danger)" }}><Icon name="trash" size={14}/></button>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && <UserForm initial={editing === "new" ? null : editing} onSave={save} onClose={() => setEditing(null)} />}
      {confirmDelete && (
        <Sheet open title="¿Eliminar este usuario?" subtitle={confirmDelete.name} onClose={() => setConfirmDelete(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button><Button variant="danger" icon="trash" onClick={() => remove(confirmDelete)}>Eliminar</Button></>}>
          <p>El usuario perderá acceso al sistema. Las requisiciones que haya creado se conservan en el histórico.</p>
        </Sheet>
      )}
    </div>
  );
};

const UserForm = ({ initial, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { name: "", email: "", role: "piso", active: true });
  const isPending = initial?.role === 'pending';
  // Cuando el admin abre un usuario pending, debe elegir un rol real antes de guardar
  const valid = form.name && form.email.includes("@") && form.role && form.role !== 'pending';

  return (
    <Sheet open
      title={isPending ? "Asignar rol" : (initial ? "Editar usuario" : "Nuevo usuario")}
      subtitle={isPending ? "Este usuario se dio de alta con Google y espera su rol" : "Define el rol y los permisos"}
      onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button disabled={!valid} icon="check" onClick={() => onSave(form)}>{isPending ? "Asignar rol" : "Guardar"}</Button></>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label className="t-label">Nombre completo</label>
          <input className="t-input" placeholder="Ej. María González" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            disabled={isPending}
            autoFocus={!isPending} />
        </div>
        <div>
          <label className="t-label">Correo de acceso</label>
          <input className="t-input" placeholder="usuario@terso.mx" value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            disabled={isPending} />
        </div>
        <div>
          <label className="t-label">Rol y permisos</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
            {Object.values(TersoStore.ROLES).filter(r => r.id !== 'pending').map(r => (
              <button key={r.id} type="button" onClick={() => setForm({ ...form, role: r.id })}
                className="t-card" style={{
                  padding: 14, textAlign: "left", cursor: "pointer",
                  border: form.role === r.id ? "1.5px solid var(--t-green)" : "1px solid var(--t-line)",
                  background: form.role === r.id ? "var(--t-bone)" : "var(--t-paper)",
                }}>
                <div style={{ width: 24, height: 24, borderRadius: 6, background: r.color, marginBottom: 8 }} />
                <div style={{ fontWeight: 500, fontSize: 13.5 }}>{r.label}</div>
                <div style={{ fontSize: 11.5, color: "var(--t-muted)", marginTop: 2 }}>
                  {r.id === "admin" ? "Acceso total al sistema" : `Captura solo ${r.areas.map(a => TersoStore.AREAS[a].label).join(", ")}`}
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="t-card" style={{ padding: 14, display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--t-bone)" }}>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13.5 }}>Usuario activo</div>
            <div style={{ fontSize: 12, color: "var(--t-muted)" }}>Permite el acceso al sistema</div>
          </div>
          <Toggle on={form.active} onChange={(v) => setForm({ ...form, active: v })} />
        </div>
      </div>
    </Sheet>
  );
};


export default Usuarios;
