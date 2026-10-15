// Calendario base: tres productos por semana, dos días por producto.
// Los copys se generan en otra capa. Este archivo define piezas y recursos.

export const CONFIGURACION_REDES = {
  productosPorSemana: 3,
  diasPorProducto: 2,
  domingoLibre: true,
};

export const FORMATOS_REDES = {
  cuadrado: { nombre: "Cuadrado", proporcion: "1:1", ancho: 1080, alto: 1080 },
  feedInstagram: { nombre: "Feed Instagram", proporcion: "4:5", ancho: 1080, alto: 1350 },
  vertical: { nombre: "Vertical", proporcion: "9:16", ancho: 1080, alto: 1920 },
  portadaFacebook: { nombre: "Vista previa de enlace Facebook", proporcion: "10:7", ancho: 900, alto: 630 },
};

// Recursos existentes por producto: 1 MP4, 3 imágenes 4:5, 3 imágenes 9:16.
// portadaFacebook es la vista previa del enlace del producto en grupos;
// no se agrega como octavo archivo multimedia al inventario.
export const RECURSOS_PRODUCTO_REDES = {
  video: { cantidad: 1, formato: "mp4" },
  imagenesFeed: { cantidad: 3, formato: "feedInstagram" },
  imagenesVerticales: { cantidad: 3, formato: "vertical" },
  imagenPrincipal: { origen: "imagenesFeed", indice: 0 },
};

// Cada pieza requiere copy y CTA; los hashtags se incluyen salvo WhatsApp.
// En las publicaciones semiautomáticas, la interfaz deberá permitir copiar
// el texto completo y abrir/descargar los recursos existentes correspondientes.
const pieza = (red, tipo, hora, recurso, extra = {}) => ({
  red, tipo, hora, recurso,
  generarCopy: true,
  generarCTA: true,
  cantidadHashtags: red === "whatsapp" ? 0 : 5,
  usarEnlaceProducto: red !== "instagram",
  publicacionAutomatica: !["grupo", "estado", "whatsapp_grupo"].includes(tipo),
  ...extra,
});

export const CICLO_PRODUCTO = {
  dia1: {
    objetivo: "presentacion",
    publicaciones: [
      pieza("instagram", "reel", "17:00", "video", { usarEnlaceProducto: false, enlaceEnBio: true }),
      pieza("threads", "video", "18:00", "portadaFacebook"),
      pieza("threads", "sabias_que", "21:00", "imagenPrincipal", { variante: "threads", contenidoDiferenciado: true }),
      pieza("facebook", "reel_pagina", "18:00", "video"),
      pieza("facebook", "story_pagina", "20:00", "imagenVertical"),  
      
      pieza("facebook", "grupo", "20:00", "imagenPrincipal", { variante: "sabias_que", contenidoDiferenciado: true, publicacionAutomatica: false }),
      pieza("whatsapp", "estado", "17:00", "enlaceProducto", {
  publicacionAutomatica: false,
  vistaPreviaEnlace: true
}),
    ],
  },
  dia2: {
    objetivo: "conversion",
    publicaciones: [
      pieza("instagram", "carrusel", "10:00", "imagenesFeed", { cantidadImagenes: 3, usarEnlaceProducto: false, enlaceEnBio: true }),
      pieza("threads", "carrusel", "10:00", "imagenesFeed", { cantidadImagenes: 3 }),
      pieza("facebook", "carrusel_pagina", "10:00", "imagenesFeed", { cantidadImagenes: 3 }),
      pieza("facebook", "grupo", "10:00", "portadaFacebook", { variante: "enlace_producto", publicacionAutomatica: false, vistaPreviaEnlace: true }),
      
    ],
  },
};

// Compatibilidad: las demás partes del proyecto pueden leer esta plantilla.
export const plantillaContenidoProducto = {
  instagram: {
    reel: { cantidad: 1, formato: "vertical", recurso: "video", generarCopy: true, generarCTA: true, generarHashtags: true, cantidadHashtags: 5 },
    carrusel: { cantidad: 1, formato: "feedInstagram", recurso: "imagenesFeed", cantidadImagenes: 3, generarCopy: true, generarCTA: true, generarHashtags: true, cantidadHashtags: 5 },
  },
  threads: { cantidad: 3, publicaciones: [
    { tipo: "video", recurso: "video", usarEnlaceProducto: true },
    { tipo: "sabias_que", recurso: "imagenPrincipal", usarEnlaceProducto: true, variante: "threads" },
    { tipo: "carrusel", recurso: "imagenesFeed", cantidadImagenes: 3, usarEnlaceProducto: true },
  ] },
  facebook: {
    pagina: { cantidad: 3, publicaciones: [
      { tipo: "reel_pagina", recurso: "video" },
      { tipo: "story_pagina", recurso: "imagenVertical" },
      { tipo: "carrusel_pagina", recurso: "imagenesFeed", cantidadImagenes: 3 },
    ] },
    grupos: { cantidad: 2, publicacionAutomatica: false, publicaciones: [
      
      { tipo: "sabias_que", recurso: "imagenPrincipal", variante: "facebook_grupos" },
      { tipo: "enlace_producto", recurso: "portadaFacebook", vistaPreviaEnlace: true },
    ] },
  },
  whatsapp: {
  estados: {
    cantidad: 1,
    publicacionAutomatica: false,
    publicaciones: [
      { tipo: "estado", recurso: "video" },
    ],
  },
},
};

export const HORARIOS_PREDETERMINADOS = {
  instagram: { reel: "17:00", carrusel: "10:00" },
  threads: { video: "18:00", sabias_que: "21:00", carrusel: "10:00" },
  facebook: {
    pagina: { reel: "17:00", story: "20:00", carrusel: "10:00" },
    grupos: { reel: "18:00", sabias_que: "20:00", enlace_producto: "10:00" },
  },
  whatsapp: { estado: "17:00", grupo: "10:00" },
};

export const SEMANA_BASE = [
  { dia: "lunes", numeroDia: 1, producto: 1, ciclo: "dia1" },
  { dia: "martes", numeroDia: 2, producto: 1, ciclo: "dia2" },
  { dia: "miercoles", numeroDia: 3, producto: 2, ciclo: "dia1" },
  { dia: "jueves", numeroDia: 4, producto: 2, ciclo: "dia2" },
  { dia: "viernes", numeroDia: 5, producto: 3, ciclo: "dia1" },
  { dia: "sabado", numeroDia: 6, producto: 3, ciclo: "dia2" },
  { dia: "domingo", numeroDia: 0, producto: null, ciclo: null },
];

export const ESTADOS_PUBLICACION = {
  BORRADOR: "borrador",
  APROBADO: "aprobado",
  PROGRAMADO: "programado",
  PUBLICANDO: "publicando",
  PUBLICADO: "publicado",
  ERROR: "error",
  PENDIENTE_MANUAL: "pendiente_manual",
};
