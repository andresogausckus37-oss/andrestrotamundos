export function prepararProductoRedes(producto) {
  if (!producto) {
    throw new Error("Producto no válido");
  }

  return {
    id: producto.id,
    nombre: producto.nombre,
    categoria: producto.categoria,
    linea: producto.linea,

    descripcion: producto.descripcion,
    descripcionLarga: producto.descripcionLarga,

    publico: producto.edadRecomendada,
    nivel: producto.nivel,

    cantidadActividades: producto.laminas,

    formato: producto.formato,
    tamano: producto.tamano,
    entrega: producto.entrega,

    incluye: producto.incluye || [],
    beneficios: producto.beneficios || [],

    precio: {
      ars: producto.precioARS,
      ofertaARS: producto.oferta?.activa
        ? producto.oferta.precioARS
        : null,

      usd: producto.precioUSD,
      ofertaUSD: producto.ofertaUSD?.activa
        ? producto.ofertaUSD.precioUSD
        : null,
    },

    imagenes: {
      portada: producto.imagenes?.portada || "",
      preview: producto.imagenes?.preview || "",
      muestras: producto.imagenes?.previewsIndividuales || [],
    },
  };
}