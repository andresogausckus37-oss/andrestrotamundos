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
      // CUADRADAS 1:1
      // Tienda + Facebook + Threads
      // ==========================================
      cuadradas: {
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
      // INSTAGRAM FEED / CARRUSEL 4:5
      // 1080 × 1350
      // ==========================================
      feed: {
        presentacion:
          producto.imagenes?.redes
            ?.feed?.presentacion || "",

        incluye:
          producto.imagenes?.redes
            ?.feed?.incluye || "",

        beneficios:
          producto.imagenes?.redes
            ?.feed?.beneficios || "",

        comoFunciona:
          producto.imagenes?.redes
            ?.feed?.comoFunciona || "",
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