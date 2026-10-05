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
      // ==========================================
      // COMERCIALES 4:5
      // Tienda + Instagram Feed + Facebook + Threads
      // 1080 × 1350
      // ==========================================
      feed: {
        presentacion:
          producto.imagenes?.portada || "",

        incluye:
          producto.imagenes?.preview || "",

        beneficios:
          producto.imagenes
            ?.previewsIndividuales?.[0] || "",

        comoFunciona:
          producto.imagenes
            ?.previewsIndividuales?.[1] || "",
      },

      // ==========================================
      // STORIES / REELS 9:16
      // 1080 × 1920
      // ==========================================
      vertical: {
        presentacion:
          producto.imagenes?.redes
            ?.vertical?.presentacion || "",

        incluye:
          producto.imagenes?.redes
            ?.vertical?.incluye || "",

        beneficios:
          producto.imagenes?.redes
            ?.vertical?.beneficios || "",

        comoFunciona:
          producto.imagenes?.redes
            ?.vertical?.comoFunciona || "",
      },
    },
  };
}