/* =====================================================
   MERCADOS
===================================================== */

export const MERCADO_ARGENTINA = "AR";
export const MERCADO_INTERNACIONAL = "INTERNACIONAL";

/* =====================================================
   OBTENER MERCADO SEGÚN PAÍS
===================================================== */

export const obtenerMercadoPorPais = (pais) => {
  return String(pais || "").toUpperCase() === "AR"
    ? MERCADO_ARGENTINA
    : MERCADO_INTERNACIONAL;
};

/* =====================================================
   MONEDA
===================================================== */

export const obtenerMonedaMercado = (mercado) => {
  return mercado === MERCADO_ARGENTINA
    ? "ARS"
    : "USD";
};

/* =====================================================
   PRECIO FINAL
===================================================== */

export const obtenerPrecioMercado = (
  producto,
  mercado
) => {
  if (!producto) return 0;

  if (mercado === MERCADO_ARGENTINA) {
    const precio =
      producto.oferta?.activa &&
      Number(producto.oferta.precioARS) > 0
        ? Number(producto.oferta.precioARS)
        : Number(producto.precioARS);

    return Number.isFinite(precio)
      ? precio
      : 0;
  }

  const precio =
    producto.ofertaUSD?.activa &&
    Number(producto.ofertaUSD.precioUSD) > 0
      ? Number(producto.ofertaUSD.precioUSD)
      : Number(producto.precioUSD);

  return Number.isFinite(precio)
    ? precio
    : 0;
};

/* =====================================================
   FORMATEAR PRECIO
===================================================== */

export const formatearPrecioMercado = (
  precio,
  mercado
) => {
  if (mercado === MERCADO_ARGENTINA) {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precio);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(precio);
};