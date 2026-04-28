import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, useToast, Segmented, Button } from './ui';
import Dashboard from '../pages/dashboard';
import Inventario from '../pages/inventario';
import Requisiciones from '../pages/requisiciones';
import MiHorario from '../pages/miHorario';
import MisTareas from '../pages/misTareas';
import MisPropinas from '../pages/misPropinas';
import Horarios from '../pages/horarios';
import Tareas from '../pages/tareas';
import Propinas from '../pages/propinas';
import Productos from '../pages/productos';
import { Proveedores, Auditoria } from '../pages/extras';
import Usuarios from '../pages/usuarios';

// ============================================================
// TERSO — App shell (sidebar + topbar + page router)
// ============================================================

const NAV_GROUPS = [
  {
    id: "main",
    label: null,
    items: [
      { id: "dashboard", label: "Dashboard", icon: "dashboard", roles: ["admin", "piso", "barra", "cocina"] },
    ],
  },
  {
    id: "mi-espacio",
    label: "Mi espacio",
    items: [
      { id: "miHorario",   label: "Mi horario",   icon: "calendar", roles: ["piso", "barra", "cocina"] },
      { id: "misTareas",   label: "Mis tareas",   icon: "check",    roles: ["piso", "barra", "cocina"] },
      { id: "misPropinas", label: "Mis propinas", icon: "coins",    roles: ["piso", "barra", "cocina"] },
    ],
  },
  {
    id: "operaciones",
    label: "Operaciones",
    items: [
      { id: "inventario",    label: "Inventario",    icon: "inv",   roles: ["admin", "piso", "barra", "cocina"] },
      { id: "requisiciones", label: "Requisiciones", icon: "cart",  roles: ["admin", "piso", "barra", "cocina"] },
      { id: "productos",     label: "Productos",     icon: "box",   roles: ["admin"] },
      { id: "proveedores",   label: "Proveedores",   icon: "truck", roles: ["admin"] },
    ],
  },
  {
    id: "administracion",
    label: "Administración",
    items: [
      { id: "horarios", label: "Horarios", icon: "calendar", roles: ["admin"] },
      { id: "tareas",   label: "Tareas",   icon: "check",    roles: ["admin"] },
      { id: "propinas", label: "Propinas", icon: "coins",    roles: ["admin"] },
      { id: "usuarios", label: "Usuarios", icon: "users",    roles: ["admin"] },
    ],
  },
  {
    id: "auditoria-group",
    label: null,
    items: [
      { id: "auditoria", label: "Auditoría", icon: "history", roles: ["admin"] },
    ],
  },
];

const NAV = NAV_GROUPS.flatMap(g => g.items);

const Shell = ({ state, setState, currentUser, onLogout }) => {
  const [page, setPage] = useState("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [search, setSearch] = useState("");

  const role = TersoStore.ROLES[currentUser.role];
  const allowedNav = NAV.filter(n => n.roles.includes(currentUser.role));
  const lowStockCount = useMemo(() => {
    return state.products.filter(p => role.areas.includes(p.area) && p.current < p.min).length;
  }, [state.products, currentUser.role]);

  const pageMeta = NAV.find(n => n.id === page) || NAV[0];

  // pre-page guard if role lost access
  useEffect(() => {
    if (!allowedNav.find(n => n.id === page)) setPage("dashboard");
  }, [currentUser.role]);

  const renderPage = () => {
    const props = { state, setState, currentUser, search, setPage };
    switch (page) {
      case "dashboard": return <Dashboard {...props} />;
      case "inventario": return <Inventario {...props} />;
      case "requisiciones": return <Requisiciones {...props} />;
      case "miHorario": return <MiHorario {...props} />;
      case "misTareas": return <MisTareas {...props} />;
      case "misPropinas": return <MisPropinas {...props} />;
      case "horarios": return <Horarios {...props} />;
      case "tareas": return <Tareas {...props} />;
      case "propinas": return <Propinas {...props} />;
      case "productos": return <Productos {...props} />;
      case "proveedores": return <Proveedores {...props} />;
      case "usuarios": return <Usuarios {...props} />;
      case "auditoria": return <Auditoria {...props} />;
      default: return <Dashboard {...props} />;
    }
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? "open" : ""}`}>
        <div className="sidebar__brand">
          <img src="assets/terso-logo-cream.png" alt="Terso" />
          <div>
            <div className="kana" style={{ color: "rgba(237,230,211,0.7)" }}>Restaurante</div>
          </div>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV_GROUPS.map(group => {
            const visible = group.items.filter(it => it.roles.includes(currentUser.role));
            if (!visible.length) return null;
            return (
              <div key={group.id} style={{ marginTop: group.label ? 14 : 0 }}>
                {group.label && (
                  <div style={{
                    fontFamily: "var(--f-mono)", fontSize: 10, letterSpacing: "0.18em",
                    textTransform: "uppercase", color: "rgba(237,230,211,0.4)",
                    padding: "6px 14px 8px", fontWeight: 500,
                  }}>
                    {group.label}
                  </div>
                )}
                {visible.map(item => (
                  <a key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => { setPage(item.id); setMobileNavOpen(false); }}>
                    <Icon name={item.icon} size={18} className="ico" />
                    {item.label}
                    {item.id === "inventario" && lowStockCount > 0 && <span className="badge">{lowStockCount}</span>}
                  </a>
                ))}
              </div>
            );
          })}
        </nav>

        <div className="sidebar__user">
          <div className="avatar" style={{ background: role.color }}>{currentUser.name[0]}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--t-cream)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{currentUser.name}</div>
            <div style={{ fontSize: 11, color: "rgba(237,230,211,0.6)" }}>{role.label}</div>
          </div>
          <button className="t-btn t-btn--icon" onClick={onLogout} style={{ background: "transparent", color: "rgba(237,230,211,0.7)" }} title="Cerrar sesión">
            <Icon name="logout" size={16} />
          </button>
        </div>
      </aside>

      <main className="main">
        <div className="topbar">
          <button className="t-btn t-btn--ghost t-btn--icon hamburger" onClick={() => setMobileNavOpen(true)}>
            <Icon name="menu" size={18} />
          </button>
          <div className="topbar__meta">
            <div className="topbar__path">{role.label}</div>
            <div className="topbar__title">{pageMeta.label}</div>
          </div>
          <div className="topbar__search">
            <Icon name="search" size={15} style={{ opacity: 0.5 }} />
            <input placeholder="Buscar productos, requisiciones..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="page-scroll" key={page}>
          {renderPage()}
        </div>

        <nav className="mobile-nav">
          {allowedNav.slice(0, 5).map(item => (
            <button key={item.id} className={page === item.id ? "active" : ""} onClick={() => setPage(item.id)}>
              <Icon name={item.icon} size={18} />
              {item.label}
            </button>
          ))}
        </nav>
      </main>
    </div>
  );
};


export default Shell;
