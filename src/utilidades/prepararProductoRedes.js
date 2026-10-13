// Normaliza los recursos ya cargados en AdminEditarProducto.
// No genera ni modifica archivos multimedia.
const urlValida = (valor) => typeof valor === "string" ? valor.trim() : "";

export function prepararProductoRedes(producto) {
  if (!producto) throw new Error("Producto no válido");

  const feedOrigen = producto.imagenes?.redes?.feed || {};
  const verticalOrigen = producto.imagenes?.redes?.vertical || {};
  const feed = [
    feedOrigen.presentacion || producto.imagenes?.portada,
    feedOrigen.incluye || producto.imagenes?.preview,
    feedOrigen.beneficios || producto.imagenes?.previewsIndividuales?.[0],
  ].map(urlValida);
  const vertical = [
    verticalOrigen.presentacion,
    verticalOrigen.incluye,
    verticalOrigen.beneficios,
  ].map(urlValida);
  const video = urlValida(producto.videoReel || producto.videoMP4 || producto.videoMp4);
  const slug = urlValida(producto.slug);

  const urlProducto = producto.id
  ? `https://andreshousesitter.com/tienda/${encodeURIComponent(producto.id)}`
  : "";

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
      ofertaARS: producto.oferta?.activa ? producto.oferta.precioARS : null,
      usd: producto.precioUSD,
      ofertaUSD: producto.ofertaUSD?.activa ? producto.ofertaUSD.precioUSD : null,
    },
    urlProducto,
    videoMP4: video,
    videoReel: video,
    recursosRedes: {
      video,
      imagenPrincipal: feed[0],
      imagenesFeed: feed,
      imagenesVerticales: vertical,
      // Solo vista previa al compartir el enlace en grupos de Facebook.
      portadaFacebook: urlValida(producto.imagenes?.portadaFacebook),
    },
    imagenes: {
      feed: {
        presentacion: feed[0],
        incluye: feed[1],
        beneficios: feed[2],
        comoFunciona: "",
      },
      vertical: {
        presentacion: vertical[0],
        incluye: vertical[1],
        beneficios: vertical[2],
        comoFunciona: "",
      },
    },
  };
}
