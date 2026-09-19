export const MONEDAS = {
  ARS: {
    codigo: "ARS",
    locale: "es-AR",
  },
  USD: {
    codigo: "USD",
    locale: "en-US",
  },
  EUR: {
    codigo: "EUR",
    locale: "de-DE",
  },
};

export function convertirPrecio(
  precioARS,
  moneda,
  cotizaciones
) {
  if (!precioARS) return 0;

  if (moneda === "ARS") {
    return precioARS;
  }

  if (moneda === "USD") {
    if (!cotizaciones?.dolarCompra) return 0;

    return precioARS / cotizaciones.dolarCompra;
  }

  if (moneda === "EUR") {
    if (
      !cotizaciones?.dolarCompra ||
      !cotizaciones?.usdEur
    ) {
      return 0;
    }

    const precioUSD =
      precioARS / cotizaciones.dolarCompra;

    return precioUSD * cotizaciones.usdEur;
  }

  return precioARS;
}

export function formatearMoneda(valor, moneda) {
  const configuracion =
    MONEDAS[moneda] || MONEDAS.ARS;

  return new Intl.NumberFormat(
    configuracion.locale,
    {
      style: "currency",
      currency: configuracion.codigo,
      minimumFractionDigits:
        moneda === "ARS" ? 0 : 2,
      maximumFractionDigits:
        moneda === "ARS" ? 0 : 2,
    }
  ).format(valor);
}