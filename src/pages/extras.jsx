// ============================================================
// TERSO — Proveedores + Auditoría
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Sheet, useToast, Empty, PageHead } from '../components/ui';

const Proveedores = ({ state, setState, currentUser, search }) => {
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = state.proveedores;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return list;
  }, [state.proveedores, search]);

  const addAudit = (action) => ({ id: TersoStore.uid("a"), ts: Date.now(), userId: currentUser.id, action });

  const save = (form) => {
    if (editing === "new") {
      const p = { id: TersoStore.uid("p"), ...form };
      setState(s => ({ ...s, proveedores: [...s.proveedores, p], audit: [addAudit(`Dio de alta al proveedor ${p.name}`), ...s.audit] }));
      toast(`Proveedor "${p.name}" creado`);
    } else {
      setState(s => ({ ...s, proveedores: s.proveedores.map(p => p.id === editing.id ? { ...p, ...form } : p), audit: [addAudit(`Editó al proveedor ${form.name}`), ...s.audit] }));
      toast("Proveedor actualizado");
    }
    setEditing(null);
  };

  const remove = (p) => {
    setState(s => ({ ...s, proveedores: s.proveedores.filter(x => x.id !== p.id), audit: [addAudit(`Dio de baja al proveedor ${p.name}`), ...s.audit] }));
    toast(`Proveedor eliminado`);
    setConfirmDelete(null);
  };

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Directorio"
        title="Proveedores"
        actions={[<Button key="add" icon="plus" onClick={() => setEditing("new")}>Nuevo proveedor</Button>]}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
        {filtered.map(p => {
          const productCount = state.products.filter(x => x.proveedor === p.id).length;
          return (
            <div key={p.id} className="t-card is-clickable" onClick={() => setEditing(p)}
              style={{ padding: 20, cursor: "pointer", transition: "all 240ms var(--ease-apple)" }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 14px 30px rgba(31,42,28,0.08)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--t-green)", color: "var(--t-cream)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon name="truck" size={20} />
                </div>
                <span className="t-chip">{p.category}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.3, marginBottom: 4, letterSpacing: "-0.01em" }}>{p.name}</div>
              <div style={{ fontSize: 12.5, color: "var(--t-muted)" }}>{p.contact}</div>
              <div style={{ fontSize: 12.5, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>{p.phone}</div>
              <div className="t-divider" />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--t-muted)" }}>Productos</span>
                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 500 }}>{productCount}</span>
              </div>
            </div>
          );
        })}
      </div>

      {editing && <ProveedorForm initial={editing === "new" ? null : editing} onSave={save} onClose={() => setEditing(null)} onDelete={editing !== "new" ? () => { setConfirmDelete(editing); } : null} />}

      {confirmDelete && (
        <Sheet open title="¿Eliminar proveedor?" subtitle={confirmDelete.name} onClose={() => setConfirmDelete(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button><Button variant="danger" icon="trash" onClick={() => remove(confirmDelete)}>Eliminar</Button></>}>
          <p>Los productos vinculados a este proveedor se conservarán pero quedarán sin proveedor asignado.</p>
        </Sheet>
      )}
    </div>
  );
};

const ProveedorForm = ({ initial, onSave, onClose, onDelete }) => {
  const [form, setForm] = useState(initial || { name: "", contact: "", phone: "", category: "" });
  const valid = form.name && form.category;
  return (
    <Sheet open title={initial ? "Editar proveedor" : "Nuevo proveedor"} subtitle="Datos del proveedor" onClose={onClose}
      footer={<>
        {onDelete && <Button variant="ghost" icon="trash" onClick={onDelete} style={{ color: "var(--t-danger)", marginRight: "auto" }}>Eliminar</Button>}
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button disabled={!valid} icon="check" onClick={() => onSave(form)}>Guardar</Button>
      </>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label className="t-label">Razón social</label>
          <input className="t-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="t-label">Contacto</label>
            <input className="t-input" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })} />
          </div>
          <div>
            <label className="t-label">Teléfono</label>
            <input className="t-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="t-label">Categoría</label>
          <input className="t-input" placeholder="Ej. Vinos, Carnes, Limpieza" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        </div>
      </div>
    </Sheet>
  );
};

const Auditoria = ({ state, search }) => {
  const filtered = useMemo(() => {
    let list = [...state.audit].sort((a, b) => b.ts - a.ts);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(a => a.action.toLowerCase().includes(q));
    }
    return list;
  }, [state.audit, search]);

  return (
    <div className="fade-in">
      <PageHead eyebrow="Histórico" title="Auditoría" />
      <div className="t-card" style={{ padding: 0, overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Empty title="Sin actividad" body="No hay registros que coincidan." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {filtered.map((a, idx) => {
              const u = state.users.find(x => x.id === a.userId);
              return (
                <div key={a.id} style={{ display: "flex", gap: 14, alignItems: "center", padding: "14px 18px", borderBottom: idx === filtered.length - 1 ? "none" : "1px solid var(--t-line)" }}>
                  <div className="avatar" style={{ width: 32, height: 32, fontSize: 13, background: u ? TersoStore.ROLES[u.role].color : "var(--t-muted)" }}>{u?.name[0] || "?"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14 }}><b>{u?.name || "Sistema"}</b> · {a.action}</div>
                    <div style={{ fontSize: 11.5, color: "var(--t-muted)", fontFamily: "var(--f-mono)" }}>{TersoStore.fmtDateTime(a.ts)} · {TersoStore.fmtRelative(a.ts)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};



export { Proveedores, Auditoria };
export default Proveedores;
