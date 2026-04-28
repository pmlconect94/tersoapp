// ============================================================
// TERSO — Helpers para Requisiciones + Cuentas por Pagar
// ============================================================

const CxpHelpers = (() => {
  const IVA = 0.16;

  // Calcula el subtotal/iva/ieps/total de una requisición ya recibida
  function calcularReqTotales(items) {
    let subtotal = 0, iva = 0, ieps = 0;
    items.forEach(it => {
      const qty = it.qtyAprobada ?? it.qtySolicitada ?? 0;
      const cu  = it.costoUnit ?? 0;
      const sub = qty * cu;
      subtotal += sub;
      if (it.iva)   iva  += sub * IVA;
      if (it.ieps)  ieps += sub * (it.ieps / 100);
    });
    const total = subtotal + iva + ieps;
    return {
      subtotal: round2(subtotal),
      iva: round2(iva),
      ieps: round2(ieps),
      total: round2(total),
    };
  }

  function round2(n) { return Math.round(n * 100) / 100; }

  // Determina status de una factura considerando vencimiento y saldo
  function calcStatus(factura) {
    if (factura.saldoPendiente <= 0.01) return "pagada";
    const vencida = factura.fechaVencimiento && factura.fechaVencimiento < Date.now();
    if (vencida && factura.saldoPendiente > 0) return "vencida";
    if (factura.saldoPendiente < factura.total) return "parcial";
    return "pendiente";
  }

  // Días restantes hasta el vencimiento (negativo si ya venció)
  function diasParaVencer(factura) {
    if (!factura.fechaVencimiento) return null;
    return Math.ceil((factura.fechaVencimiento - Date.now()) / 86400000);
  }

  // Formatos
  function money(n) {
    return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", minimumFractionDigits: 2 }).format(n || 0);
  }

  function fmtFecha(ts) {
    if (!ts) return "—";
    return new Date(ts).toLocaleDateString("es-MX", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Total agregado por proveedor (saldo pendiente)
  function saldoPorProveedor(facturas) {
    const acc = {};
    facturas.forEach(f => {
      acc[f.proveedorId] = (acc[f.proveedorId] || 0) + (f.saldoPendiente || 0);
    });
    return acc;
  }

  // Total agregado por cuenta de pago (basado en pagos aplicados)
  function totalesPorCuenta(pagos) {
    const acc = {};
    pagos.forEach(p => {
      acc[p.cuentaPago] = (acc[p.cuentaPago] || 0) + (p.monto || 0);
    });
    return acc;
  }

  return { IVA, calcularReqTotales, round2, calcStatus, diasParaVencer, money, fmtFecha, saldoPorProveedor, totalesPorCuenta };
})();

export default CxpHelpers;
export { CxpHelpers };
