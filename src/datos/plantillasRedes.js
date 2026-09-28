// =========================================================
// PLANTILLAS DE CONTENIDO PARA REDES SOCIALES
// =========================================================
//
// Define:
// 1. Qué contenido genera cada producto.
// 2. Qué formatos multimedia necesita.
// 3. Horarios predeterminados.
// 4. Distribución semanal para 2 productos.
//
// Los copys finales NO se guardan aquí.
// =========================================================


// =========================================================
// CONFIGURACIÓN GENERAL
// =========================================================

export const CONFIGURACION_REDES = {
  productosPorSemana: 2,

  diasPorProducto: 3,

  domingoLibre: true,
};


// =========================================================
// FORMATOS MULTIMEDIA
// =========================================================

export const FORMATOS_REDES = {
  cuadrado: {
    nombre: "Cuadrado",
    proporcion: "1:1",
    ancho: 1080,
    alto: 1080,
  },

  feedInstagram: {
    nombre: "Feed Instagram",
    proporcion: "4:5",
    ancho: 1080,
    alto: 1350,
  },

  vertical: {
    nombre: "Vertical",
    proporcion: "9:16",
    ancho: 1080,
    alto: 1920,
  },
};


// =========================================================
// CONTENIDO GENERADO POR CADA PRODUCTO
// =========================================================

export const plantillaContenidoProducto = {
  instagram: {
    carrusel: {
      cantidad: 1,
      formato: "feedInstagram",
      generarCopy: true,
      generarCTA: true,
      generarHashtags: true,
      cantidadHashtags: 5,
    },

    reel: {
      cantidad: 1,
      formato: "vertical",
      generarCopy: true,
      generarCTA: true,
      generarHashtags: true,
      generarGuion: true,
      cantidadHashtags: 5,
      duracionObjetivo: 15,
    },

    stories: {
      cantidad: 3,
      formato: "vertical",

      tipos: [
        {
          tipo: "presentacion",
          generarTexto: true,
          usarEnlaceProducto: false,
        },
        {
          tipo: "desafio",
          generarTexto: true,
          usarEnlaceProducto: false,
        },
        {
          tipo: "cta",
          generarTexto: true,
          usarEnlaceProducto: true,
        },
      ],
    },
  },

  threads: {
    cantidad: 3,

    publicaciones: [
      {
        tipo: "interaccion",
        generarCopy: true,
        usarEnlaceProducto: false,
      },
      {
        tipo: "desafio",
        generarCopy: true,
        usarEnlaceProducto: false,
      },
      {
        tipo: "producto",
        generarCopy: true,
        usarEnlaceProducto: true,
      },
    ],
  },

  facebook: {
    pagina: {
      cantidad: 1,
      formato: "cuadrado",
      generarCopy: true,
      generarCTA: true,
      usarEnlaceProducto: true,
    },

    grupos: {
      cantidad: 3,
      formato: "cuadrado",

      publicaciones: [
        {
          tipo: "interaccion",
          generarCopy: true,
          usarEnlaceProducto: false,
        },
        {
          tipo: "desafio",
          generarCopy: true,
          usarEnlaceProducto: false,
        },
        {
          tipo: "producto",
          generarCopy: true,
          usarEnlaceProducto: true,
        },
      ],

      publicacionAutomatica: false,
    },
  },

  whatsapp: {
    estados: {
      cantidad: 1,
      formato: "vertical",
      generarTexto: true,
      generarCTA: true,
      usarEnlaceProducto: true,
      publicacionAutomatica: false,
    },
  },
};


// =========================================================
// HORARIOS PREDETERMINADOS
// =========================================================
//
// Serán editables posteriormente desde el Admin.
// =========================================================

export const HORARIOS_PREDETERMINADOS = {
  instagram: {
    carrusel: "18:00",
    reel: "19:00",
    story: "20:00",
  },

  threads: {
    publicacion: "13:00",
  },

  facebook: {
    pagina: "19:00",
    grupos: "16:00",
  },

  whatsapp: {
    estado: "20:30",
  },
};


// =========================================================
// CICLO DE 3 DÍAS POR PRODUCTO
// =========================================================
//
// Día 1 = Descubrimiento
// Día 2 = Participación
// Día 3 = Conversión
// =========================================================

export const CICLO_PRODUCTO = {
  dia1: {
    objetivo: "descubrimiento",

    publicaciones: [
      {
        red: "instagram",
        tipo: "carrusel",
        hora: "18:00",
      },
      {
        red: "instagram",
        tipo: "story",
        variante: "presentacion",
        hora: "20:00",
      },
      {
        red: "threads",
        tipo: "interaccion",
        hora: "13:00",
      },
      {
        red: "facebook",
        tipo: "grupo",
        variante: "interaccion",
        hora: "16:00",
      },
    ],
  },

  dia2: {
    objetivo: "participacion",

    publicaciones: [
      {
        red: "instagram",
        tipo: "reel",
        hora: "19:00",
      },
      {
        red: "instagram",
        tipo: "story",
        variante: "desafio",
        hora: "20:00",
      },
      {
        red: "threads",
        tipo: "desafio",
        hora: "13:00",
      },
      {
        red: "facebook",
        tipo: "grupo",
        variante: "desafio",
        hora: "16:00",
      },
    ],
  },

  dia3: {
    objetivo: "conversion",

    publicaciones: [
      {
        red: "instagram",
        tipo: "story",
        variante: "cta",
        hora: "20:00",
      },
      {
        red: "threads",
        tipo: "producto",
        hora: "13:00",
      },
      {
        red: "facebook",
        tipo: "grupo",
        variante: "producto",
        hora: "16:00",
      },
      {
        red: "whatsapp",
        tipo: "estado",
        hora: "20:30",
      },
    ],
  },
};


// =========================================================
// SEMANA BASE
// =========================================================
//
// Producto 1 → lunes, martes y miércoles.
// Producto 2 → jueves, viernes y sábado.
// Domingo → libre.
// =========================================================

export const SEMANA_BASE = [
  {
    dia: "lunes",
    numeroDia: 1,
    producto: 1,
    ciclo: "dia1",
  },
  {
    dia: "martes",
    numeroDia: 2,
    producto: 1,
    ciclo: "dia2",
  },
  {
    dia: "miercoles",
    numeroDia: 3,
    producto: 1,
    ciclo: "dia3",
  },
  {
    dia: "jueves",
    numeroDia: 4,
    producto: 2,
    ciclo: "dia1",
  },
  {
    dia: "viernes",
    numeroDia: 5,
    producto: 2,
    ciclo: "dia2",
  },
  {
    dia: "sabado",
    numeroDia: 6,
    producto: 2,
    ciclo: "dia3",
  },
  {
    dia: "domingo",
    numeroDia: 0,
    producto: null,
    ciclo: null,
  },
];


// =========================================================
// ESTADOS DE PUBLICACIÓN
// =========================================================

export const ESTADOS_PUBLICACION = {
  BORRADOR: "borrador",
  APROBADO: "aprobado",
  PROGRAMADO: "programado",
  PUBLICANDO: "publicando",
  PUBLICADO: "publicado",
  ERROR: "error",
  PENDIENTE_MANUAL: "pendiente_manual",
};