// ============================================================
// TERSO — Productos page (admin only)
// ============================================================

import React, { useState, useEffect, useRef, useMemo, createContext, useContext } from 'react';
import TersoStore from '../lib/store';
import { Icon, Button, Segmented, Sheet, useToast, Empty, PageHead } from '../components/ui';

const Productos = ({ state, setState, currentUser, search }) => {
  const isAdmin = currentUser.role === "admin";
  const [editing, setEditing] = useState(null); // product or "new"
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [areaFilter, setAreaFilter] = useState("all");
  const [bulkOpen, setBulkOpen] = useState(false);
  const toast = useToast();

  const filtered = useMemo(() => {
    let list = state.products;
    if (areaFilter !== "all") list = list.filter(p => p.area === areaFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [state.products, areaFilter, search]);

  const addAudit = (action) => ({
    id: TersoStore.uid("a"),
    ts: Date.now(),
    userId: currentUser.id,
    action,
  });

  const save = (form) => {
    if (editing === "new") {
      const p = { id: TersoStore.uid("pr"), ...form, current: 0 };
      setState(s => ({ ...s, products: [...s.products, p], audit: [addAudit(`Dio de alta el producto ${p.name}`), ...s.audit] }));
      toast(`Producto "${p.name}" creado`);
    } else {
      setState(s => ({
        ...s,
        products: s.products.map(p => p.id === editing.id ? { ...p, ...form } : p),
        audit: [addAudit(`Editó el producto ${form.name}`), ...s.audit],
      }));
      toast(`Producto actualizado`);
    }
    setEditing(null);
  };

  const remove = (p) => {
    setState(s => ({
      ...s,
      products: s.products.filter(x => x.id !== p.id),
      audit: [addAudit(`Dio de baja el producto ${p.name}`), ...s.audit],
    }));
    toast(`Producto "${p.name}" dado de baja`);
    setConfirmDelete(null);
  };

  const bulkImport = (rows) => {
    const newProducts = rows.map(r => ({
      id: TersoStore.uid("pr"),
      name: r.name,
      presentacion: r.presentacion,
      area: r.area,
      proveedor: r.proveedor,
      min: r.min,
      current: 0,
    }));
    setState(s => ({
      ...s,
      products: [...s.products, ...newProducts],
      audit: [addAudit(`Importó ${newProducts.length} productos al catálogo`), ...s.audit],
    }));
    toast(`${newProducts.length} productos importados`);
    setBulkOpen(false);
  };

  return (
    <div className="fade-in">
      <PageHead
        eyebrow="Catálogo"
        title="Productos"
        actions={isAdmin ? [
          <Button key="exp" variant="ghost" icon="download" onClick={() => exportCSV(filtered, state, "productos")}>Exportar CSV</Button>,
          <Button key="bulk" variant="ghost" icon="upload" onClick={() => setBulkOpen(true)}>Importar</Button>,
          <Button key="add" icon="plus" onClick={() => setEditing("new")}>Nuevo producto</Button>,
        ] : null}
      />

      <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 18, flexWrap: "wrap" }}>
        <Segmented value={areaFilter} onChange={setAreaFilter} options={[
          { value: "all", label: `Todas (${state.products.length})` },
          ...Object.values(TersoStore.AREAS).map(a => ({ value: a.id, label: `${a.label} (${state.products.filter(p => p.area === a.id).length})` })),
        ]} />
        <div style={{ marginLeft: "auto", color: "var(--t-muted)", fontSize: 12, fontFamily: "var(--f-mono)" }}>
          {filtered.length} resultados
        </div>
      </div>

      <div className="t-card" style={{ overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <Empty title="Sin productos" body="No hay productos que coincidan con tu búsqueda." action={isAdmin && <Button icon="plus" onClick={() => setEditing("new")}>Nuevo producto</Button>} />
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="t-table">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Presentación</th>
                  <th>Área</th>
                  <th>Proveedor</th>
                  <th>Stock</th>
                  <th>Mínimo</th>
                  {isAdmin && <th></th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const prov = state.proveedores.find(x => x.id === p.proveedor);
                  const low = p.current < p.min;
                  return (
                    <tr key={p.id} className={isAdmin ? "is-clickable" : ""} onClick={() => isAdmin && setEditing(p)}>
                      <td><div style={{ fontWeight: 500 }}>{p.name}</div></td>
                      <td><span className="t-chip">{p.presentacion}</span></td>
                      <td><span className="t-chip" style={{ background: TersoStore.ROLES[p.area].color + "22", color: TersoStore.ROLES[p.area].color, borderColor: TersoStore.ROLES[p.area].color + "55" }}>{TersoStore.AREAS[p.area].label}</span></td>
                      <td style={{ color: "var(--t-muted)" }}>{prov?.name || "—"}</td>
                      <td><span style={{ fontFamily: "var(--f-mono)", color: low ? "var(--t-danger)" : "inherit", fontWeight: low ? 600 : 400 }}>{p.current} {p.presentacion}</span></td>
                      <td style={{ fontFamily: "var(--f-mono)", color: "var(--t-muted)" }}>{p.min}</td>
                      {isAdmin && (
                        <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "right" }}>
                          <button className="t-btn t-btn--ghost t-btn--icon" onClick={() => setEditing(p)}><Icon name="edit" size={14}/></button>
                          <button className="t-btn t-btn--ghost t-btn--icon" onClick={() => setConfirmDelete(p)} style={{ color: "var(--t-danger)" }}><Icon name="trash" size={14}/></button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editing && <ProductForm initial={editing === "new" ? null : editing} proveedores={state.proveedores} onSave={save} onClose={() => setEditing(null)} />}

      {bulkOpen && <BulkImport proveedores={state.proveedores} onClose={() => setBulkOpen(false)} onImport={bulkImport} />}

      {confirmDelete && (
        <Sheet open title="¿Dar de baja este producto?" subtitle={confirmDelete.name} onClose={() => setConfirmDelete(null)}
          footer={<><Button variant="ghost" onClick={() => setConfirmDelete(null)}>Cancelar</Button><Button variant="danger" icon="trash" onClick={() => remove(confirmDelete)}>Dar de baja</Button></>}>
          <p>El producto dejará de estar disponible para inventarios y nuevas requisiciones. Esta acción se puede revertir creándolo de nuevo.</p>
        </Sheet>
      )}
    </div>
  );
};

const ProductForm = ({ initial, proveedores, onSave, onClose }) => {
  const [form, setForm] = useState(initial || { name: "", presentacion: "Pz", area: "cocina", proveedor: proveedores[0]?.id, min: 1 });
  const valid = form.name && form.presentacion && form.area && form.proveedor;

  return (
    <Sheet open title={initial ? "Editar producto" : "Nuevo producto"} subtitle={initial ? "Modifica los datos del producto" : "Da de alta un producto en el catálogo"} onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Cancelar</Button><Button disabled={!valid} icon="check" onClick={() => onSave(form)}>Guardar</Button></>}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <label className="t-label">Nombre del producto</label>
          <input className="t-input" placeholder="Ej. Mezcal Espadín Vago" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div>
            <label className="t-label">Presentación</label>
            <select className="t-select" value={form.presentacion} onChange={(e) => setForm({ ...form, presentacion: e.target.value })}>
              {TersoStore.PRESENTACIONES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="t-label">Área</label>
            <select className="t-select" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>
              {Object.values(TersoStore.AREAS).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="t-label">Proveedor</label>
          <select className="t-select" value={form.proveedor} onChange={(e) => setForm({ ...form, proveedor: e.target.value })}>
            {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div>
          <label className="t-label">Stock mínimo (alerta)</label>
          <input className="t-input" type="number" min="0" value={form.min} onChange={(e) => setForm({ ...form, min: parseFloat(e.target.value) || 0 })} />
        </div>
      </div>
    </Sheet>
  );
};

// ─── Bulk import ─────────────────────────────────────────────
const BulkImport = ({ proveedores, onClose, onImport }) => {
  const [tab, setTab] = useState("paste"); // 'paste' | 'grid'
  const [pasteText, setPasteText] = useState("");
  const [rows, setRows] = useState([
    { name: "", presentacion: "Pz", area: "cocina", proveedor: proveedores[0]?.id || "", min: "1" },
    { name: "", presentacion: "Pz", area: "cocina", proveedor: proveedores[0]?.id || "", min: "1" },
    { name: "", presentacion: "Pz", area: "cocina", proveedor: proveedores[0]?.id || "", min: "1" },
  ]);

  const fileRef = useRef(null);

  // Parse pasted text — supports tab-separated (Excel/Sheets), comma-separated, or pipe.
  // Columns expected: name, presentacion, area, proveedor, min  (in that order)
  // First line can optionally be a header (auto-detected).
  const parsePasted = (text) => {
    if (!text.trim()) return [];
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (!lines.length) return [];
    const sep = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
    const looksHeader = /nombre|name|producto/i.test(lines[0]);
    const dataLines = looksHeader ? lines.slice(1) : lines;
    return dataLines.map(line => {
      const cols = line.split(sep).map(c => c.trim().replace(/^"|"$/g, ""));
      const [name = "", presentacion = "Pz", areaRaw = "cocina", proveedorRaw = "", minRaw = "1"] = cols;
      // Resolve area (label or id, case-insensitive)
      const areaMatch = Object.values(TersoStore.AREAS).find(a =>
        a.id.toLowerCase() === areaRaw.toLowerCase() || a.label.toLowerCase() === areaRaw.toLowerCase()
      );
      // Resolve proveedor (name or id)
      const provMatch = proveedores.find(p =>
        p.id === proveedorRaw || p.name.toLowerCase() === proveedorRaw.toLowerCase()
      );
      // Normalize presentación
      const presMatch = TersoStore.PRESENTACIONES.find(p => p.toLowerCase() === presentacion.toLowerCase()) || presentacion;
      return {
        name,
        presentacion: presMatch,
        area: areaMatch?.id || areaRaw,
        proveedor: provMatch?.id || proveedorRaw,
        min: minRaw,
      };
    });
  };

  const handlePaste = () => {
    const parsed = parsePasted(pasteText);
    if (parsed.length === 0) return;
    setRows(parsed);
    setTab("grid");
  };

  const handleFile = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const isExcel = /\.(xlsx|xls)$/i.test(f.name);
    if (isExcel && window.XLSX) {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wb = window.XLSX.read(reader.result, { type: "array" });
          const ws = wb.Sheets[wb.SheetNames[0]];
          // Convert to TSV so the existing parser handles it
          const tsv = window.XLSX.utils.sheet_to_csv(ws, { FS: "\t", blankrows: false });
          setPasteText(tsv);
          // Auto-process
          const parsed = parsePasted(tsv);
          if (parsed.length > 0) {
            setRows(parsed);
            setTab("grid");
          }
        } catch (err) {
          alert("No se pudo leer el archivo: " + err.message);
        }
      };
      reader.readAsArrayBuffer(f);
    } else {
      const reader = new FileReader();
      reader.onload = () => {
        setPasteText(String(reader.result || ""));
      };
      reader.readAsText(f);
    }
    // Reset so re-uploading the same file fires onChange again
    e.target.value = "";
  };

  const downloadTemplate = () => {
    if (!window.XLSX) {
      alert("Plantilla no disponible — recarga la página.");
      return;
    }
    const XLSX = window.XLSX;

    // Sheet 1: Productos (the template they fill in)
    const headers = [["Nombre", "Presentación", "Área", "Proveedor", "Mínimo"]];
    const examples = [
      ["Mezcal Espadín Vago", "Botella", "Barra", proveedores[0]?.name || "Casa Mezcal", 3],
      ["Limones", "Kg", "Cocina", proveedores[1]?.name || proveedores[0]?.name || "Verdulería La Central", 5],
      ["Servilletas blancas", "Paquete", "Piso", proveedores[2]?.name || proveedores[0]?.name || "Suministros del Norte", 10],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
      ["", "", "", "", ""],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet([...headers, ...examples]);
    ws1["!cols"] = [{ wch: 32 }, { wch: 14 }, { wch: 12 }, { wch: 28 }, { wch: 10 }];

    // Style header row (bold-ish via cell metadata; basic xlsx writer doesn't apply rich styles
    // but we set the cell type explicitly so Excel renders cleanly)
    ["A1", "B1", "C1", "D1", "E1"].forEach(addr => {
      if (ws1[addr]) ws1[addr].s = { font: { bold: true } };
    });

    // Sheet 2: Instrucciones / valores válidos
    const instructions = [
      ["INSTRUCCIONES — Plantilla de productos Terso"],
      [""],
      ["1. Llena la hoja 'Productos' con un producto por fila."],
      ["2. No cambies los encabezados de columna."],
      ["3. Los campos 'Presentación', 'Área' y 'Proveedor' deben coincidir con los valores válidos abajo."],
      ["4. Guarda el archivo y súbelo desde Productos → Importar → Subir archivo."],
      [""],
      ["COLUMNAS"],
      ["Nombre", "Texto libre. Ej. 'Mezcal Espadín Vago'."],
      ["Presentación", "Una de las opciones de la lista 'Presentaciones válidas'."],
      ["Área", "Una de: Piso, Barra, Cocina."],
      ["Proveedor", "Nombre exacto del proveedor (ver hoja 'Proveedores')."],
      ["Mínimo", "Número entero ≥ 0. Stock mínimo antes de generar alerta."],
      [""],
      ["PRESENTACIONES VÁLIDAS"],
      ...TersoStore.PRESENTACIONES.map(p => [p]),
      [""],
      ["ÁREAS VÁLIDAS"],
      ...Object.values(TersoStore.AREAS).map(a => [a.label]),
    ];
    const ws2 = XLSX.utils.aoa_to_sheet(instructions);
    ws2["!cols"] = [{ wch: 24 }, { wch: 60 }];

    // Sheet 3: Proveedores (so user can copy names exactly)
    const provRows = [["Proveedores disponibles"], [""], ...proveedores.map(p => [p.name])];
    const ws3 = XLSX.utils.aoa_to_sheet(provRows);
    ws3["!cols"] = [{ wch: 40 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Productos");
    XLSX.utils.book_append_sheet(wb, ws2, "Instrucciones");
    XLSX.utils.book_append_sheet(wb, ws3, "Proveedores");

    const date = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `terso-plantilla-productos-${date}.xlsx`);
  };

  const updateRow = (i, key, value) => {
    setRows(rows.map((r, idx) => idx === i ? { ...r, [key]: value } : r));
  };
  const addRow = () => setRows([...rows, { name: "", presentacion: "Pz", area: "cocina", proveedor: proveedores[0]?.id || "", min: "1" }]);
  const removeRow = (i) => setRows(rows.filter((_, idx) => idx !== i));

  // Validation per row
  const validateRow = (r) => {
    const errs = [];
    if (!r.name?.trim()) errs.push("Nombre vacío");
    if (!TersoStore.PRESENTACIONES.includes(r.presentacion)) errs.push("Presentación inválida");
    if (!TersoStore.AREAS[r.area]) errs.push("Área inválida");
    if (!proveedores.find(p => p.id === r.proveedor)) errs.push("Proveedor no encontrado");
    const m = parseFloat(r.min);
    if (isNaN(m) || m < 0) errs.push("Mínimo inválido");
    return errs;
  };

  const validatedRows = rows.map(r => ({ ...r, _errors: validateRow(r) }));
  const validCount = validatedRows.filter(r => r._errors.length === 0 && r.name.trim()).length;
  const invalidCount = validatedRows.filter(r => r._errors.length > 0 && r.name.trim()).length;
  const emptyCount = validatedRows.filter(r => !r.name.trim()).length;

  const doImport = () => {
    const ok = validatedRows
      .filter(r => r._errors.length === 0 && r.name.trim())
      .map(r => ({ name: r.name.trim(), presentacion: r.presentacion, area: r.area, proveedor: r.proveedor, min: parseFloat(r.min) }));
    if (ok.length === 0) return;
    onImport(ok);
  };

  return (
    <Sheet
      open
      title="Importar productos"
      subtitle="Pega desde Excel/Sheets o usa la plantilla editable"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button disabled={validCount === 0} icon="check" onClick={doImport}>
            {validCount > 0 ? `Importar ${validCount} producto${validCount !== 1 ? "s" : ""}` : "Importar"}
          </Button>
        </>
      }
    >
      <div style={{ display: "grid", gap: 16 }}>
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "paste", label: "Pegar / CSV" },
            { value: "grid", label: `Plantilla (${rows.length})` },
          ]}
        />

        {tab === "paste" && (
          <div style={{ display: "grid", gap: 12 }}>
            {/* Hero: download template */}
            <div style={{
              display: "flex", alignItems: "center", gap: 16,
              padding: 18,
              background: "linear-gradient(135deg, rgba(46,76,57,0.06) 0%, rgba(176,154,91,0.08) 100%)",
              border: "1px solid var(--t-line)",
              borderRadius: 14,
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: 10,
                background: "linear-gradient(135deg, #1d6d3a 0%, #0d5728 100%)",
                color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "var(--f-mono)", fontWeight: 700, fontSize: 12, letterSpacing: "0.04em",
                boxShadow: "0 4px 10px rgba(13,87,40,0.25)",
                flexShrink: 0,
              }}>XLS</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>Plantilla de Excel</div>
                <div style={{ fontSize: 12, color: "var(--t-muted)", lineHeight: 1.45 }}>
                  Descarga el archivo, llénalo en Excel o Google Sheets y súbelo aquí. Incluye instrucciones, valores válidos y lista de proveedores.
                </div>
              </div>
              <Button icon="download" onClick={downloadTemplate}>Descargar</Button>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "0 4px" }}>
              <div style={{ flex: 1, height: 1, background: "var(--t-line)" }}></div>
              <div style={{ fontSize: 11, fontFamily: "var(--f-mono)", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--t-muted)" }}>O pega directamente</div>
              <div style={{ flex: 1, height: 1, background: "var(--t-line)" }}></div>
            </div>

            <div className="t-card" style={{ padding: 14, background: "rgba(31,42,28,0.04)" }}>
              <div style={{ fontSize: 12, fontFamily: "var(--f-mono)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--t-muted)", marginBottom: 8 }}>Formato esperado</div>
              <div style={{ fontFamily: "var(--f-mono)", fontSize: 12, lineHeight: 1.7, color: "var(--t-text)" }}>
                <div style={{ opacity: 0.55 }}>Nombre &nbsp; · &nbsp; Presentación &nbsp; · &nbsp; Área &nbsp; · &nbsp; Proveedor &nbsp; · &nbsp; Mínimo</div>
                <div>Mezcal Espadín Vago<span style={{ opacity: 0.3 }}>{"\t"}</span>Botella<span style={{ opacity: 0.3 }}>{"\t"}</span>Barra<span style={{ opacity: 0.3 }}>{"\t"}</span>Casa Mezcal<span style={{ opacity: 0.3 }}>{"\t"}</span>3</div>
                <div>Limones<span style={{ opacity: 0.3 }}>{"\t"}</span>Kg<span style={{ opacity: 0.3 }}>{"\t"}</span>Cocina<span style={{ opacity: 0.3 }}>{"\t"}</span>Verdulería La Central<span style={{ opacity: 0.3 }}>{"\t"}</span>5</div>
              </div>
              <div style={{ fontSize: 11, color: "var(--t-muted)", marginTop: 10, lineHeight: 1.5 }}>
                Acepta tabuladores (Excel/Sheets), comas o pipes. La primera línea con encabezados es opcional. Áreas válidas: <b>Piso, Barra, Cocina</b>. Presentaciones: <b>{TersoStore.PRESENTACIONES.join(", ")}</b>.
              </div>
            </div>

            <textarea
              className="t-input"
              style={{ minHeight: 180, fontFamily: "var(--f-mono)", fontSize: 12.5, lineHeight: 1.6, padding: 14, resize: "vertical" }}
              placeholder="Pega aquí los productos, una línea por producto…&#10;Mezcal Espadín	Botella	Barra	Casa Mezcal	3&#10;Limones	Kg	Cocina	Verdulería La Central	5"
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <Button icon="check" disabled={!pasteText.trim()} onClick={handlePaste}>Procesar texto</Button>
              <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.tsv,.txt" onChange={handleFile} style={{ display: "none" }} />
              <Button variant="ghost" icon="upload" onClick={() => fileRef.current?.click()}>Subir archivo (Excel / CSV)</Button>
              <button
                type="button"
                className="t-btn t-btn--ghost"
                onClick={() => {
                  const sample = [
                    "Mezcal Espadín Vago\tBotella\tBarra\t" + (proveedores[0]?.name || "Proveedor 1") + "\t3",
                    "Limones\tKg\tCocina\t" + (proveedores[0]?.name || "Proveedor 1") + "\t5",
                    "Servilletas\tPaquete\tPiso\t" + (proveedores[0]?.name || "Proveedor 1") + "\t10",
                  ].join("\n");
                  setPasteText(sample);
                }}
                style={{ marginLeft: "auto", fontSize: 12, color: "var(--t-muted)" }}
              >
                Cargar ejemplo
              </button>
            </div>
          </div>
        )}

        {tab === "grid" && (
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, fontFamily: "var(--f-mono)" }}>
              <span style={{ color: "var(--t-success, #5a7a4d)" }}>● {validCount} válidos</span>
              {invalidCount > 0 && <span style={{ color: "var(--t-danger)" }}>● {invalidCount} con errores</span>}
              {emptyCount > 0 && <span style={{ color: "var(--t-muted)" }}>○ {emptyCount} vacíos</span>}
              <button type="button" onClick={addRow} className="t-btn t-btn--ghost" style={{ marginLeft: "auto", fontSize: 12 }}>
                <Icon name="plus" size={13} /> Fila
              </button>
            </div>

            <div style={{ overflowX: "auto", border: "1px solid var(--t-line)", borderRadius: 12 }}>
              <table className="t-table" style={{ minWidth: 760 }}>
                <thead>
                  <tr>
                    <th style={{ width: 28 }}></th>
                    <th>Producto</th>
                    <th style={{ width: 110 }}>Presentación</th>
                    <th style={{ width: 110 }}>Área</th>
                    <th>Proveedor</th>
                    <th style={{ width: 80 }}>Mínimo</th>
                    <th style={{ width: 32 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {validatedRows.map((r, i) => {
                    const hasError = r._errors.length > 0 && r.name.trim();
                    return (
                      <tr key={i} style={hasError ? { background: "rgba(193,68,52,0.05)" } : undefined}>
                        <td style={{ color: "var(--t-muted)", fontFamily: "var(--f-mono)", fontSize: 11, textAlign: "center" }}>
                          {hasError ? (
                            <span title={r._errors.join(" · ")} style={{ color: "var(--t-danger)" }}>!</span>
                          ) : r.name.trim() ? (
                            <span style={{ color: "var(--t-success, #5a7a4d)" }}>✓</span>
                          ) : (i + 1)}
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            className="t-input"
                            style={{ height: 32, padding: "0 8px", fontSize: 13 }}
                            placeholder="Nombre"
                            value={r.name}
                            onChange={(e) => updateRow(i, "name", e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4 }}>
                          <select
                            className="t-select"
                            style={{ height: 32, padding: "0 6px", fontSize: 13 }}
                            value={TersoStore.PRESENTACIONES.includes(r.presentacion) ? r.presentacion : ""}
                            onChange={(e) => updateRow(i, "presentacion", e.target.value)}
                          >
                            {!TersoStore.PRESENTACIONES.includes(r.presentacion) && <option value="">— {r.presentacion}</option>}
                            {TersoStore.PRESENTACIONES.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 4 }}>
                          <select
                            className="t-select"
                            style={{ height: 32, padding: "0 6px", fontSize: 13 }}
                            value={TersoStore.AREAS[r.area] ? r.area : ""}
                            onChange={(e) => updateRow(i, "area", e.target.value)}
                          >
                            {!TersoStore.AREAS[r.area] && <option value="">— {r.area}</option>}
                            {Object.values(TersoStore.AREAS).map(a => <option key={a.id} value={a.id}>{a.label}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 4 }}>
                          <select
                            className="t-select"
                            style={{ height: 32, padding: "0 6px", fontSize: 13 }}
                            value={proveedores.find(p => p.id === r.proveedor) ? r.proveedor : ""}
                            onChange={(e) => updateRow(i, "proveedor", e.target.value)}
                          >
                            {!proveedores.find(p => p.id === r.proveedor) && <option value="">— {r.proveedor || "Selecciona"}</option>}
                            {proveedores.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td style={{ padding: 4 }}>
                          <input
                            className="t-input"
                            type="number"
                            min="0"
                            style={{ height: 32, padding: "0 8px", fontSize: 13, fontFamily: "var(--f-mono)" }}
                            value={r.min}
                            onChange={(e) => updateRow(i, "min", e.target.value)}
                          />
                        </td>
                        <td style={{ padding: 4, textAlign: "center" }}>
                          {rows.length > 1 && (
                            <button
                              type="button"
                              className="t-btn t-btn--ghost t-btn--icon"
                              onClick={() => removeRow(i)}
                              style={{ color: "var(--t-muted)" }}
                            >
                              <Icon name="x" size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {invalidCount > 0 && (
              <div style={{ fontSize: 12, color: "var(--t-muted)", lineHeight: 1.5 }}>
                Pasa el cursor sobre <b style={{ color: "var(--t-danger)" }}>!</b> para ver el error de cada fila. Solo se importarán las filas válidas.
              </div>
            )}
          </div>
        )}
      </div>
    </Sheet>
  );
};

function exportCSV(rows, state, name) {
  const headers = ["Producto", "Presentación", "Área", "Proveedor", "Stock", "Mínimo"];
  const lines = [headers.join(",")];
  rows.forEach(p => {
    const prov = state.proveedores.find(x => x.id === p.proveedor);
    lines.push([p.name, p.presentacion, TersoStore.AREAS[p.area].label, prov?.name || "", p.current, p.min].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = `terso-${name}-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}



export default Productos;
export { exportCSV };
