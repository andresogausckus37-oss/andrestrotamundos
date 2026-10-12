// =========================================================
// GENERADOR LOCAL DE CONTENIDO PARA REDES
// Productos físicos
//
// ESTRUCTURA SEMANAL:
// 3 productos por semana
// 2 días por producto
//
// Instagram:
// Día 1 - Reel
// Día 1 - Reel compartido en Story (manual)
// Día 2 - Carrusel 3 imágenes 4:5
//
// Threads:
// Día 1 - Reel
// Día 1 - ¿Sabías qué? + imagen principal 4:5
// Día 2 - Carrusel 3 imágenes 4:5
//
// Fan Page:
// Día 1 - Reel
// Día 1 - Video en Story
// Día 2 - Carrusel 3 imágenes 4:5
//
// Facebook grupos:
// Día 1 - Reel
// Día 1 - ¿Sabías qué? + imagen principal 4:5
// Día 2 - URL producto + portada 900x630
//
// WhatsApp grupos / estados:
// Día 1 - Reel
// Día 2 - URL producto
// =========================================================


// =========================================================
// UTILIDADES
// =========================================================

const elegir = (lista = []) =>
  lista.length
    ? lista[Math.floor(Math.random() * lista.length)]
    : "";

const mezclar = (lista = []) =>
  [...lista].sort(() => Math.random() - 0.5);

const elegirSinRepetir = (lista = [], cantidad = 1) =>
  mezclar(
    [...new Set(lista.filter(Boolean))]
  ).slice(0, cantidad);

const limpiar = (valor) =>
  String(valor ?? "").trim();

const lista = (valor) =>
  Array.isArray(valor)
    ? valor.map(limpiar).filter(Boolean)
    : [];


// =========================================================
// DATOS DEL PRODUCTO
// =========================================================

const nombreProducto = (producto) =>
  limpiar(producto?.nombre) ||
  "este producto";

const descripcionProducto = (producto) =>
  limpiar(producto?.descripcion) ||
  limpiar(producto?.descripcionLarga) ||
  "un producto disponible en nuestra tienda";

const detallesProducto = (producto) =>
  producto?.detalles || {};

const caracteristicas = (producto) =>
  lista(
    detallesProducto(producto)
      .caracteristicas
  );

const contenidoPaquete = (producto) =>
  lista(
    detallesProducto(producto)
      .contenidoPaquete
  );

const variantes = (producto) =>
  lista(
    detallesProducto(producto)
      .variantes
  );

const colores = (producto) =>
  lista(
    detallesProducto(producto)
      .colores
  );


// =========================================================
// DATOS DESTACADOS
// =========================================================

const datosProducto = (producto) => {
  const detalles =
    detallesProducto(producto);

  return [
    ...caracteristicas(producto),

    ...contenidoPaquete(producto),

    detalles?.material
      ? `Material: ${detalles.material}`
      : null,

    detalles?.dimensiones
      ? `Dimensiones: ${detalles.dimensiones}`
      : null,

    detalles?.peso
      ? `Peso: ${detalles.peso}`
      : null,

    detalles?.modelo
      ? `Modelo: ${detalles.modelo}`
      : null,

    variantes(producto).length
      ? `Variantes disponibles: ${variantes(
          producto
        ).join(", ")}`
      : null,

    colores(producto).length
      ? `Colores disponibles: ${colores(
          producto
        ).join(", ")}`
      : null,
  ].filter(Boolean);
};

const datoDestacado = (producto) =>
  elegir(datosProducto(producto)) ||
  descripcionProducto(producto);


// =========================================================
// ¿SABÍAS QUÉ?
//
// Cada red selecciona su contenido de manera independiente.
// Así evitamos publicar exactamente el mismo texto.
// =========================================================

const obtenerIdeasSabiasQue = (producto) => {
  const detalles =
    detallesProducto(producto);

  const ideas = [];

  caracteristicas(producto).forEach(
    (caracteristica) => {
      ideas.push({
        enfoque: "funcionalidad",
        texto: caracteristica,
      });
    }
  );

  contenidoPaquete(producto).forEach(
    (contenido) => {
      ideas.push({
        enfoque: "uso",
        texto: contenido,
      });
    }
  );

  if (detalles?.material) {
    ideas.push({
      enfoque: "durabilidad",
      texto:
        `Está fabricado en ${detalles.material}, ` +
        "un dato importante para conocer mejor su construcción.",
    });
  }

  if (detalles?.dimensiones) {
    ideas.push({
      enfoque: "uso",
      texto:
        `Sus dimensiones son ${detalles.dimensiones}. ` +
        "Revisarlas antes de comprar ayuda a comprobar si se adapta al uso que necesitás.",
    });
  }

  if (detalles?.peso) {
    ideas.push({
      enfoque: "uso",
      texto:
        `Su peso es ${detalles.peso}. ` +
        "Es un dato útil para evaluar su manipulación, traslado o ubicación.",
    });
  }

  if (variantes(producto).length) {
    ideas.push({
      enfoque: "eleccion",
      texto:
        `Está disponible en ${variantes(
          producto
        ).join(", ")}. ` +
        "Revisar las variantes ayuda a elegir la opción adecuada.",
    });
  }

  if (colores(producto).length) {
    ideas.push({
      enfoque: "eleccion",
      texto:
        `Está disponible en ${colores(
          producto
        ).join(", ")}. ` +
        "Podés revisar las opciones antes de elegir.",
    });
  }

  if (!ideas.length) {
    ideas.push({
      enfoque: "tip",
      texto:
        datoDestacado(producto),
    });
  }

  return ideas;
};

const generarSabiasQue = (
  producto,
  excluir = []
) => {
  const ideas =
    obtenerIdeasSabiasQue(producto);

  const disponibles =
    ideas.filter(
      (idea) =>
        !excluir.includes(idea.texto)
    );

  return (
    elegir(
      disponibles.length
        ? disponibles
        : ideas
    ) || {
      enfoque: "tip",
      texto:
        datoDestacado(producto),
    }
  );
};


// =========================================================
// IMÁGENES
// =========================================================

const extraerGrupoImagenes = (grupo) => {
  if (!grupo) return [];

  if (Array.isArray(grupo)) {
    return grupo
      .map(limpiar)
      .filter(Boolean);
  }

  if (typeof grupo === "string") {
    return [limpiar(grupo)]
      .filter(Boolean);
  }

  if (typeof grupo !== "object") {
    return [];
  }

  return [
    ...(Array.isArray(grupo.imagenes)
      ? grupo.imagenes
      : []),

    grupo.presentacion,
    grupo.incluye,
    grupo.beneficios,
    grupo.comoFunciona,
    grupo.imagen1,
    grupo.imagen2,
    grupo.imagen3,
  ]
    .map(limpiar)
    .filter(Boolean);
};

const obtenerImagenes45 = (producto) => {
  const imagenes =
    producto?.imagenes || {};

  const candidatos = [
    ...extraerGrupoImagenes(
      imagenes?.redes?.feed
    ),

    ...extraerGrupoImagenes(
      imagenes?.feed
    ),

    ...(Array.isArray(
      imagenes?.previewsIndividuales
    )
      ? imagenes.previewsIndividuales
      : []),

    imagenes?.portada,
    imagenes?.preview,
  ]
    .map(limpiar)
    .filter(Boolean);

  return [
    ...new Set(candidatos),
  ].slice(0, 3);
};

const obtenerImagenes916 = (producto) => {
  const imagenes =
    producto?.imagenes || {};

  const candidatos = [
    ...extraerGrupoImagenes(
      imagenes?.redes?.vertical
    ),

    ...extraerGrupoImagenes(
      imagenes?.vertical
    ),

    ...(Array.isArray(
      imagenes?.stories
    )
      ? imagenes.stories
      : []),
  ]
    .map(limpiar)
    .filter(Boolean);

  return [
    ...new Set(candidatos),
  ].slice(0, 3);
};

const obtenerImagenPrincipal = (
  producto
) => {
  const imagenes =
    producto?.imagenes || {};

  return (
    limpiar(
      imagenes?.portada
    ) ||
    obtenerImagenes45(producto)[0] ||
    null
  );
};

const obtenerPortadaFacebook = (
  producto
) => {
  const imagenes =
    producto?.imagenes || {};

  return (
    limpiar(
      imagenes?.portadaFacebook
    ) ||
    obtenerImagenPrincipal(producto)
  );
};


// =========================================================
// VIDEO
// =========================================================

const obtenerVideo = (producto) => {
  const imagenes =
    producto?.imagenes || {};

  const candidatos = [
    producto?.video,
    producto?.videoUrl,
    producto?.reel,

    imagenes?.video,
    imagenes?.videoUrl,
    imagenes?.reel,

    imagenes?.redes?.video,
    imagenes?.redes?.reel,

    producto?.redes?.video,
    producto?.redes?.reel,
  ];

  return (
    candidatos
      .map(limpiar)
      .find(Boolean) ||
    null
  );
};


// =========================================================
// RECURSOS
// =========================================================

const obtenerRecursos = (producto) => {
  const imagenes45 =
    obtenerImagenes45(producto);

  return {
    video:
      obtenerVideo(producto),

    imagenPrincipal:
      obtenerImagenPrincipal(
        producto
      ),

    imagenes45,

    imagenes916:
      obtenerImagenes916(
        producto
      ),

    portadaFacebook:
      obtenerPortadaFacebook(
        producto
      ),
  };
};


// =========================================================
// HASHTAGS
// =========================================================

const hashtagsGenerales = [
  "#TiendaOnline",
  "#ComprasOnline",
  "#Productos",
  "#Novedades",
  "#CompraOnline",
  "#TiendaArgentina",
  "#ProductosSeleccionados",
  "#OfertasOnline",
];

const hashtagsCategorias = {
  tecnologia: [
    "#Tecnologia",
    "#Gadgets",
    "#AccesoriosTech",
  ],

  computacion: [
    "#Computacion",
    "#AccesoriosPC",
    "#Tecnologia",
  ],

  audio: [
    "#Audio",
    "#Sonido",
    "#Tecnologia",
  ],

  pesca: [
    "#Pesca",
    "#AccesoriosDePesca",
    "#AireLibre",
  ],

  jardin: [
    "#Jardin",
    "#Jardineria",
    "#Hogar",
  ],

  hogar: [
    "#Hogar",
    "#Casa",
    "#ProductosParaElHogar",
  ],

  ninos: [
    "#Niños",
    "#ProductosParaNiños",
    "#Familia",
  ],

  accesorios: [
    "#Accesorios",
    "#Estilo",
    "#Productos",
  ],
};

const crearHashtags = (producto) => {
  const categoria =
    limpiar(
      producto?.categoria
    ).toLowerCase();

  return elegirSinRepetir(
    [
      ...(
        hashtagsCategorias[
          categoria
        ] || []
      ),

      ...hashtagsGenerales,
    ],
    5
  );
};


// =========================================================
// NORMALIZACIÓN
// =========================================================

const normalizarTexto = (texto) =>
  limpiar(texto)
    .replace(
      /(^|\s)#[\p{L}\p{N}_]+/gu,
      " "
    )
    .replace(
      /[ \t]+/g,
      " "
    )
    .replace(
      /\n{3,}/g,
      "\n\n"
    )
    .trim();


// =========================================================
// CREAR PUBLICACIÓN
// =========================================================

const crearPublicacion = ({
  producto,
  tipo,
  formato = "texto",
  texto,
  cta = "",
  imagen = null,
  video = null,
  usarHashtags = true,
  usarUrlProducto = false,
  manual = false,
  destino = "",
  etiqueta = "",
}) => {
  const hashtags =
    usarHashtags
      ? crearHashtags(producto)
      : [];

  const limpio =
    normalizarTexto(texto);

  return {
    tipo,
    formato,

    texto:
      hashtags.length
        ? `${limpio}\n\n${hashtags.join(
            " "
          )}`
        : limpio,

    cta,
    hashtags,

    imagen,
    video,

    usarUrlProducto,
    manual,
    destino,
    etiqueta,
  };
};


// =========================================================
// INSTAGRAM
// =========================================================

const generarInstagram = (
  producto,
  recursos
) => {
  const nombre =
    nombreProducto(producto);

  const reel =
    crearPublicacion({
      producto,

      tipo: "reel",
      formato: "reel",

      texto:
        `${nombre} 🎥\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.\n\n` +
        "Conocé todos los detalles en nuestra tienda.",

      cta:
        "Link en bio",

      video:
        recursos.video,

      usarHashtags:
        true,

      usarUrlProducto:
        false,

      destino:
        "instagram",

      etiqueta:
        "Reel",
    });

  const reelStory =
    crearPublicacion({
      producto,

      tipo:
        "reel_story",

      formato:
        "reel_story",

      texto:
        `${nombre} 👀\n\n` +
        "Mirá el Reel y conocé el producto.",

      cta:
        "Agregar enlace al producto",

      video:
        recursos.video,

      usarHashtags:
        false,

      usarUrlProducto:
        true,

      manual:
        true,

      destino:
        "instagram_story",

      etiqueta:
        "Reel en Story",
    });

  const carrusel =
    crearPublicacion({
      producto,

      tipo:
        "carrusel",

      formato:
        "carrusel",

      texto:
        `${nombre} 🛍️\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.\n\n` +
        "Deslizá para conocer más detalles.",

      cta:
        "Link en bio",

      imagen:
        recursos.imagenes45,

      usarHashtags:
        true,

      usarUrlProducto:
        false,

      destino:
        "instagram",

      etiqueta:
        "Carrusel 4:5",
    });

  return {
    reel,
    reelStory,
    carrusel,
  };
};


// =========================================================
// THREADS
// =========================================================

const generarThreads = (
  producto,
  recursos
) => {
  const nombre =
    nombreProducto(producto);

  const sabiasQue =
    generarSabiasQue(producto);

  const reel =
    crearPublicacion({
      producto,

      tipo:
        "reel",

      formato:
        "reel",

      texto:
        `${nombre} 🎥\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.`,

      cta:
        "Ver producto",

      video:
        recursos.video,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      destino:
        "threads",

      etiqueta:
        "Reel",
    });

  const dato =
    crearPublicacion({
      producto,

      tipo:
        "sabias_que",

      formato:
        "imagen",

      texto:
        `¿Sabías qué? 💡\n\n` +
        `${sabiasQue.texto}\n\n` +
        `Un detalle de ${nombre} que puede ayudarte a conocer mejor el producto.`,

      cta:
        "Ver producto",

      imagen:
        recursos.imagenPrincipal,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      destino:
        "threads",

      etiqueta:
        "¿Sabías qué?",

      enfoque:
        sabiasQue.enfoque,
    });

  const carrusel =
    crearPublicacion({
      producto,

      tipo:
        "carrusel",

      formato:
        "carrusel",

      texto:
        `${nombre} 👀\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.\n\n` +
        "Deslizá para conocer sus detalles.",

      cta:
        "Ver producto",

      imagen:
        recursos.imagenes45,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      destino:
        "threads",

      etiqueta:
        "Carrusel 4:5",
    });

  // Mantenemos ARRAY para compatibilidad
  // con AdminRedes actual.
  return [
    reel,
    dato,
    carrusel,
  ];
};


// =========================================================
// FAN PAGE
// =========================================================

const generarFanPage = (
  producto,
  recursos
) => {
  const nombre =
    nombreProducto(producto);

  const reel =
    crearPublicacion({
      producto,

      tipo:
        "reel",

      formato:
        "reel",

      texto:
        `${nombre} 🎥\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.\n\n` +
        "Mirá el video y conocé todos sus detalles.",

      cta:
        "Ver producto",

      video:
        recursos.video,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      destino:
        "facebook_page",

      etiqueta:
        "Reel Fan Page",
    });

  const story =
    crearPublicacion({
      producto,

      tipo:
        "story_video",

      formato:
        "story_video",

      texto:
        `${nombre} 👀\n\n` +
        "Mirá el producto en video y conocé todos sus detalles.",

      cta:
        "Ver producto",

      video:
        recursos.video,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      destino:
        "facebook_story",

      etiqueta:
        "Video Story Fan Page",
    });

  const carrusel =
    crearPublicacion({
      producto,

      tipo:
        "carrusel",

      formato:
        "carrusel",

      texto:
        `${nombre} 🛍️\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.\n\n` +
        "Deslizá para conocer más detalles.",

      cta:
        "Ver producto",

      imagen:
        recursos.imagenes45,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      destino:
        "facebook_page",

      etiqueta:
        "Carrusel Fan Page",
    });

  return {
    reel,
    story,
    carrusel,
  };
};


// =========================================================
// FACEBOOK GRUPOS
// =========================================================

const generarGruposFacebook = (
  producto,
  recursos,
  textoSabiasQueThreads = ""
) => {
  const nombre =
    nombreProducto(producto);

  const sabiasQue =
    generarSabiasQue(
      producto,
      textoSabiasQueThreads
        ? [textoSabiasQueThreads]
        : []
    );

  const reel =
    crearPublicacion({
      producto,

      tipo:
        "grupo_reel",

      formato:
        "reel",

      texto:
        `${nombre} 🎥\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.`,

      cta:
        "Ver producto",

      video:
        recursos.video,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      manual:
        true,

      destino:
        "facebook_grupos",

      etiqueta:
        "Reel grupos",
    });

  const dato =
    crearPublicacion({
      producto,

      tipo:
        "grupo_sabias_que",

      formato:
        "imagen",

      texto:
        `¿Sabías qué? 💡\n\n` +
        `${sabiasQue.texto}\n\n` +
        `Este dato puede ayudarte a conocer mejor ${nombre}.`,

      cta:
        "Ver producto",

      imagen:
        recursos.imagenPrincipal,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      manual:
        true,

      destino:
        "facebook_grupos",

      etiqueta:
        "¿Sabías qué? grupos",
    });

  const productoUrl =
    crearPublicacion({
      producto,

      tipo:
        "grupo_producto",

      formato:
        "enlace",

      texto:
        `${nombre} 🛍️\n\n` +
        `${descripcionProducto(
          producto
        )}.\n\n` +
        `${datoDestacado(
          producto
        )}.\n\n` +
        "Conocé todos los detalles del producto.",

      cta:
        "Ver producto",

      imagen:
        recursos.portadaFacebook,

      usarHashtags:
        true,

      usarUrlProducto:
        true,

      manual:
        true,

      destino:
        "facebook_grupos",

      etiqueta:
        "Producto + URL",
    });

  return {
    reel,
    sabiasQue: dato,
    producto: productoUrl,
  };
};


           // =========================================================
           // WHATSAPP
           // =========================================================

           const generarWhatsapp = (
             producto,
             recursos
           ) => {
             const nombre =
               nombreProducto(producto);

             const reel =
               crearPublicacion({
                 producto,

                 tipo:
                   "whatsapp_reel",

                 formato:
                   "reel",

                 texto:
                   `${nombre} 🎥\n\n` +
                   `${descripcionProducto(
                     producto
                   )}.\n\n` +
                   `${datoDestacado(
                     producto
                   )}.`,

                 cta:
                   "Ver producto",

                 video:
                   recursos.video,

                 usarHashtags:
                   false,

                 usarUrlProducto:
                   true,

                 manual:
                   true,

                 destino:
                   "whatsapp",

                 etiqueta:
                   "Reel WhatsApp",
               });

             const productoUrl =
               crearPublicacion({
                 producto,

                 tipo:
                   "whatsapp_producto",

                 formato:
                   "enlace",

                 texto:
                   `${nombre} 🛍️\n\n` +
                   `${descripcionProducto(
                     producto
                   )}.\n\n` +
                   "Mirá todos los detalles en nuestra tienda.",

                 cta:
                   "Ver producto",

                 usarHashtags:
                   false,

                 usarUrlProducto:
                   true,

                 manual:
                   true,

                 destino:
                   "whatsapp",

                 etiqueta:
                   "Producto + URL",
               });

             return {
               reel,
               producto:
                 productoUrl,
             };
           };

// =========================================================
// GENERADOR PRINCIPAL
// =========================================================

export function generarContenidoRedesLocal(
  productoOriginal
) {
  const producto =
    productoOriginal || {};

  const recursos =
    obtenerRecursos(producto);

  const instagram =
    generarInstagram(
      producto,
      recursos
    );

  const threads =
    generarThreads(
      producto,
      recursos
    );

  const fanPage =
    generarFanPage(
      producto,
      recursos
    );

  const textoSabiasQueThreads =
    threads?.[1]?.texto || "";

  const gruposFacebook =
    generarGruposFacebook(
      producto,
      recursos,
      textoSabiasQueThreads
    );

  const whatsapp =
    generarWhatsapp(
      producto,
      recursos
    );

  return {
    productoId:
      producto.id,

    nombreProducto:
      nombreProducto(producto),

    generador:
      "local",

    recursos: {
      video:
        recursos.video,

      imagenPrincipal:
        recursos.imagenPrincipal,

      imagenes45:
        recursos.imagenes45,

      imagenes916:
        recursos.imagenes916,

      portadaFacebook:
        recursos.portadaFacebook,
    },

    // =========================================
    // INSTAGRAM
    // =========================================

    instagram: {
      reel:
        instagram.reel,

      reelStory:
        instagram.reelStory,

      carrusel:
        instagram.carrusel,

      // Ya no usamos la antigua serie
      // de Stories de imprimibles.
      stories: [],
    },

    // =========================================
    // THREADS
    //
    // [0] Reel
    // [1] ¿Sabías qué?
    // [2] Carrusel
    // =========================================

    threads,

    // =========================================
    // FACEBOOK
    //
    // publicaciones se mantiene para
    // compatibilidad con AdminRedes.
    //
    // [0] Reel Fan Page
    // [1] Story Fan Page
    // [2] Carrusel Fan Page
    // [3] Reel grupos
    // [4] ¿Sabías qué? grupos
    // [5] Producto + URL grupos
    // =========================================

    facebook: {
      reel:
        fanPage.reel,

      story:
        fanPage.story,

      carrusel:
        fanPage.carrusel,

      grupos:
        gruposFacebook,

      publicaciones: [
        fanPage.reel,
        fanPage.story,
        fanPage.carrusel,
        gruposFacebook.reel,
        gruposFacebook.sabiasQue,
        gruposFacebook.producto,
      ],
    },

    // =========================================
    // WHATSAPP
    // =========================================

    whatsapp: {
      grupos: {
        reel:
          whatsapp.reel,

        producto:
          whatsapp.producto,
      },

      estado: {
        reel:
          whatsapp.reel,

        producto:
          whatsapp.producto,
      },

      publicaciones: [
        whatsapp.reel,
        whatsapp.producto,
      ],
    },
  };
}