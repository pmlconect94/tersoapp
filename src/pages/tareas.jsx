// ============================================================
// TERSO — Tareas (admin) — wrapper con 4 tabs
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, PageHead } from '../components/ui';
import TareasHoy from './tareasHoy';
import TareasPlantilla from './tareasPlantilla';
import TareasRendimiento from './tareasRendimiento';
import TareasCatalogo from './tareasCatalogo';

const Tareas = ({ state, setState, currentUser }) => {
  const [tab, setTab] = useState("hoy");

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Responsabilidades de limpieza y operación"
        title="Tareas"
      />

      <div style={{ marginBottom: 22 }}>
        <div className="segmented" style={{ flexWrap: "wrap" }}>
          <button className={tab === "hoy" ? "active" : ""} onClick={() => setTab("hoy")}>
            <Icon name="check" size={13} style={{ marginRight: 4 }} /> Hoy
          </button>
          <button className={tab === "plantilla" ? "active" : ""} onClick={() => setTab("plantilla")}>
            <Icon name="calendar" size={13} style={{ marginRight: 4 }} /> Plantilla semanal
          </button>
          <button className={tab === "rendimiento" ? "active" : ""} onClick={() => setTab("rendimiento")}>
            <Icon name="dashboard" size={13} style={{ marginRight: 4 }} /> Rendimiento
          </button>
          <button className={tab === "catalogo" ? "active" : ""} onClick={() => setTab("catalogo")}>
            <Icon name="box" size={13} style={{ marginRight: 4 }} /> Catálogo
          </button>
        </div>
      </div>

      {tab === "hoy" && <TareasHoy state={state} setState={setState} currentUser={currentUser} />}
      {tab === "plantilla" && <TareasPlantilla state={state} setState={setState} />}
      {tab === "rendimiento" && <TareasRendimiento state={state} />}
      {tab === "catalogo" && <TareasCatalogo state={state} setState={setState} />}
    </div>
  );
};


export default Tareas;
