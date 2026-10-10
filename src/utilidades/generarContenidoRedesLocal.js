// =========================================================
// GENERADOR LOCAL DE CONTENIDO PARA REDES
// Productos físicos
// =========================================================

const elegir = (lista = []) =>
  lista[Math.floor(Math.random() * lista.length)];

const mezclar = (lista = []) =>
  [...lista].sort(() => Math.random() - 0.5);

const elegirSinRepetir = (lista, cantidad) =>
  mezclar([...new Set(lista.filter(Boolean))]).slice(0, cantidad);

const limpiar = (valor) => String(valor ?? "").trim();

const nombreProducto = (producto) =>
  limpiar(producto?.nombre) || "este producto";

const descripcionProducto = (producto) =>
  limpiar(producto?.descripcion) ||
  limpiar(producto?.descripcionLarga) ||
  "una opción práctica para descubrir en nuestra tienda";

const lista = (valor) =>
  Array.isArray(valor)
    ? valor.map(limpiar).filter(Boolean)
    : [];

const detallesProducto = (producto) => producto?.detalles || {};

const caracteristicas = (producto) =>
  lista(detallesProducto(producto).caracteristicas);

const contenidoPaquete = (producto) =>
  lista(detallesProducto(producto).contenidoPaquete);

const variantes = (producto) =>
  lista(detallesProducto(producto).variantes);

const colores = (producto) =>
  lista(detallesProducto(producto).colores);

const datoDestacado = (producto) => {
  const opciones = [
    ...caracteristicas(producto),
    ...contenidoPaquete(producto),
  ];

  return elegir(opciones) || descripcionProducto(producto);
};

const detalleComercial = (producto) => {
  const detalles = detallesProducto(producto);

  const opciones = [
    detalles.marca && `Marca: ${detalles.marca}`,
    detalles.modelo && `Modelo: ${detalles.modelo}`,
    detalles.material && `Material: ${detalles.material}`,
    detalles.dimensiones && `Dimensiones: ${detalles.dimensiones}`,
    detalles.peso && `Peso: ${detalles.peso}`,
    variantes(producto).length &&
      `Variantes disponibles: ${variantes(producto).join(", ")}`,
    colores(producto).length &&
      `Colores disponibles: ${colores(producto).join(", ")}`,
  ].filter(Boolean);

  return elegir(opciones) || datoDestacado(producto);
};

const normalizarGrupoImagenes = (grupo = {}) => {
  const presentacion = grupo?.presentacion || null;
  const incluye = grupo?.incluye || null;
  const beneficios = grupo?.beneficios || null;
  const comoFunciona = grupo?.comoFunciona || null;

  return {
    presentacion,
    incluye,
    beneficios,
    comoFunciona,
    todas: [
      presentacion,
      incluye,
      beneficios,
      comoFunciona,
    ].filter(Boolean),
  };
};

const obtenerImagenes = (producto) => {
  const imagenes = producto?.imagenes || {};

  const feed = normalizarGrupoImagenes(
    imagenes?.redes?.feed || imagenes?.feed || {}
  );

  const vertical = normalizarGrupoImagenes(
    imagenes?.redes?.vertical || imagenes?.vertical || {}
  );

  if (!feed.presentacion && imagenes.portada) {
    feed.presentacion = imagenes.portada;
    feed.todas = [
      imagenes.portada,
      ...feed.todas,
    ].filter(Boolean);
  }

  if (!vertical.presentacion && imagenes.portada) {
    vertical.presentacion = imagenes.portada;
    vertical.todas = [
      imagenes.portada,
      ...vertical.todas,
    ].filter(Boolean);
  }

  return { feed, vertical };
};

const gruposEmojis = {
  interaccion: [
    ["🤔", "💬"],
    ["👀", "👇"],
    ["🙋", "✨"],
  ],
  producto: [
    ["🛍️", "✨"],
    ["📦", "⭐"],
    ["🛒", "👌"],
  ],
  tip: [
    ["💡", "✨"],
    ["📌", "👌"],
    ["💭", "⭐"],
  ],
  encuesta: [
    ["📊", "👇"],
    ["🗳️", "💬"],
    ["🤔", "👇"],
  ],
  beneficio: [
    ["✨", "👌"],
    ["⭐", "💡"],
    ["📦", "✨"],
  ],
  venta: [
    ["🛍️", "🛒"],
    ["📦", "✨"],
    ["⭐", "🛒"],
  ],
};

const emojis = (tipo) =>
  elegir(gruposEmojis[tipo] || gruposEmojis.producto);

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
  tecnologia: ["#Tecnologia", "#Gadgets", "#AccesoriosTech"],
  computacion: ["#Computacion", "#AccesoriosPC", "#Tecnologia"],
  audio: ["#Audio", "#Sonido", "#Tecnologia"],
  pesca: ["#Pesca", "#AccesoriosDePesca", "#AireLibre"],
  jardin: ["#Jardin", "#Jardineria", "#Hogar"],
  hogar: ["#Hogar", "#Casa", "#ProductosParaElHogar"],
  ninos: ["#Niños", "#ProductosParaNiños", "#Familia"],
  accesorios: ["#Accesorios", "#Estilo", "#Productos"],
};

const crearHashtags = (producto) => {
  const categoria = limpiar(producto?.categoria).toLowerCase();

  return elegirSinRepetir(
    [
      ...(hashtagsCategorias[categoria] || []),
      ...hashtagsGenerales,
    ],
    5
  );
};

const normalizarTexto = (texto) =>
  limpiar(texto)
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

const crearPublicacion = ({
  producto,
  tipo,
  formato = "texto",
  texto,
  cta = "",
  imagen = null,
  encuesta = null,
}) => {
  const hashtags = crearHashtags(producto);
  const limpio = normalizarTexto(texto);

  return {
    tipo,
    formato,
    texto: `${limpio}\n\n${hashtags.join(" ")}`,
    cta,
    hashtags,
    imagen,
    encuesta,
  };
};

// =========================================================
// THREADS
// =========================================================

const generarThreads = (producto, imagenes) => {
  const nombre = nombreProducto(producto);
  const destacado = datoDestacado(producto);
  const detalle = detalleComercial(producto);

  const e1 = emojis("interaccion");
  const e2 = emojis("producto");
  const e3 = emojis("tip");
  const e4 = emojis("encuesta");
  const e5 = emojis("beneficio");
  const e6 = emojis("venta");

  return [
    crearPublicacion({
      producto,
      tipo: "interaccion",
      texto: `Pregunta rápida ${e1[0]} ¿Qué valorás más al elegir un producto online: precio, calidad o practicidad? ${e1[1]}`,
    }),
    crearPublicacion({
      producto,
      tipo: "producto",
      formato: "imagen",
      texto: `${nombre} ${e2[0]} ${descripcionProducto(producto)}. ${destacado} ${e2[1]}`,
      cta: "Ver producto en la tienda",
      imagen: imagenes.presentacion,
    }),
    crearPublicacion({
      producto,
      tipo: "tip",
      texto: `Antes de comprar online ${e3[0]} revisá las características, variantes y medidas disponibles para elegir la opción adecuada. ${e3[1]}`,
    }),
    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",
      texto: `Queremos conocerte ${e4[0]} ¿Qué mirás primero cuando descubrís un producto nuevo? ${e4[1]}`,
      encuesta: {
        pregunta: "¿Qué mirás primero?",
        opciones: ["Características", "Precio"],
      },
    }),
    crearPublicacion({
      producto,
      tipo: "beneficio",
      formato: imagenes.beneficios ? "imagen" : "texto",
      texto: `Un detalle para tener en cuenta ${e5[0]} ${destacado}. Conocé toda la información antes de elegir. ${e5[1]}`,
      imagen: imagenes.beneficios,
    }),
    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto: `${nombre} ya está disponible ${e6[0]} ${detalle}. Mirá todos los detalles en nuestra tienda. ${e6[1]}`,
      cta: "Ver producto en la tienda",
      imagen: imagenes.comoFunciona || imagenes.presentacion,
    }),
  ];
};

// =========================================================
// INSTAGRAM STORIES
// =========================================================

const generarStories = (producto, imagenes) => {
  const nombre = nombreProducto(producto);
  const destacado = datoDestacado(producto);
  const detalle = detalleComercial(producto);

  return [
    crearPublicacion({
      producto,
      tipo: "presentacion",
      formato: "imagen",
      texto: `${nombre} 🛍️\nUna opción para descubrir en nuestra tienda ✨`,
      cta: "Conocer producto",
      imagen: imagenes.presentacion,
    }),
    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",
      texto: "¿Qué mirás primero al comprar online? 🤔",
      encuesta: {
        pregunta: "¿Qué elegís?",
        opciones: ["Precio", "Características"],
      },
      imagen: imagenes.presentacion,
    }),
    crearPublicacion({
      producto,
      tipo: "beneficio",
      formato: "imagen",
      texto: `${destacado} ✨\nConocé todos los detalles antes de elegir.`,
      imagen: imagenes.beneficios || imagenes.presentacion,
    }),
    crearPublicacion({
      producto,
      tipo: "interaccion",
      formato: "texto",
      texto: `Si tuvieras que elegir ${nombre}, ¿qué detalle sería decisivo para vos? 👀`,
    }),
    crearPublicacion({
      producto,
      tipo: "detalle",
      formato: "imagen",
      texto: `${detalle} 📦\nMás información en la tienda.`,
      imagen: imagenes.incluye || imagenes.presentacion,
    }),
    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto: `${nombre} 🛒\nDisponible para conocer y comprar desde nuestra tienda.`,
      cta: "Enlace en la bio",
      imagen: imagenes.comoFunciona || imagenes.presentacion,
    }),
  ];
};

// =========================================================
// INSTAGRAM CARRUSEL
// =========================================================

const generarCarrusel = (producto, imagenes) => {
  const nombre = nombreProducto(producto);
  const e = emojis("producto");

  return crearPublicacion({
    producto,
    tipo: "carrusel",
    formato: "carrusel",
    texto:
      `${nombre} ${e[0]}\n\n` +
      `${descripcionProducto(producto)}.\n\n` +
      `${datoDestacado(producto)} ${e[1]}\n\n` +
      "Deslizá para conocer sus características.",
    cta: "Enlace en la bio",
    imagen:
      imagenes.todas.length > 0
        ? imagenes.todas
        : [imagenes.presentacion].filter(Boolean),
  });
};

// =========================================================
// INSTAGRAM REEL
// =========================================================

const generarReel = (producto, imagenes) => {
  const nombre = nombreProducto(producto);
  const e = emojis("producto");

  return {
    ...crearPublicacion({
      producto,
      tipo: "reel",
      formato: "reel",
      texto:
        `${nombre} ${e[0]} ` +
        `${descripcionProducto(producto)}. ` +
        `${datoDestacado(producto)} ${e[1]} ` +
        "Conocelo en nuestra tienda.",
      cta: "Enlace en la bio",
      imagen:
        imagenes.todas.length > 0
          ? imagenes.todas
          : [imagenes.presentacion].filter(Boolean),
    }),
    guion: [
      `1. Gancho: mostrar ${nombre}.`,
      "2. Presentación: mostrar el producto desde distintos ángulos.",
      `3. Característica: destacar ${datoDestacado(producto)}.`,
      `4. Detalle: mostrar ${detalleComercial(producto)}.`,
      "5. Cierre: invitar a conocer el producto en la tienda.",
    ].join("\n"),
  };
};

// =========================================================
// FACEBOOK
// =========================================================

const generarFacebook = (producto, imagenes) => {
  const nombre = nombreProducto(producto);
  const destacado = datoDestacado(producto);
  const detalle = detalleComercial(producto);

  return [
    crearPublicacion({
      producto,
      tipo: "interaccion",
      texto: "Cuando comprás un producto online, ¿qué información necesitás ver sí o sí antes de decidir? 🤔💬",
    }),
    crearPublicacion({
      producto,
      tipo: "producto",
      formato: "imagen",
      texto: `Hoy te presentamos ${nombre} 🛍️\n\n${descripcionProducto(producto)}.\n\n${destacado} ✨\n\nConocé todos los detalles en nuestra tienda.`,
      cta: "Ver producto en la tienda",
      imagen: imagenes.presentacion,
    }),
    crearPublicacion({
      producto,
      tipo: "tip",
      texto: "Consejo para comprar online 💡\n\nRevisá siempre características, medidas, variantes y contenido del paquete antes de elegir.",
    }),
    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",
      texto: "Vamos a elegir 📊\n\n¿Qué influye más en tu decisión de compra?",
      encuesta: {
        pregunta: "¿Qué valorás más?",
        opciones: ["Calidad", "Precio"],
      },
    }),
    crearPublicacion({
      producto,
      tipo: "beneficio",
      formato: imagenes.beneficios ? "imagen" : "texto",
      texto: `Un detalle de ${nombre} ⭐\n\n${destacado}.\n\nRevisá la ficha completa para conocer toda la información.`,
      imagen: imagenes.beneficios,
    }),
    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto: `${nombre} ya está disponible 🛒\n\n${detalle}.\n\nPodés conocer el producto completo en nuestra tienda.`,
      cta: "Ver producto en la tienda",
      imagen: imagenes.comoFunciona || imagenes.presentacion,
    }),
  ];
};

// =========================================================
// GENERADOR PRINCIPAL
// =========================================================

export function generarContenidoRedesLocal(productoOriginal) {
  const producto = productoOriginal || {};
  const imagenes = obtenerImagenes(producto);

  return {
    productoId: producto.id,
    nombreProducto: nombreProducto(producto),
    generador: "local",

    instagram: {
      carrusel: generarCarrusel(producto, imagenes.feed),
      reel: generarReel(producto, imagenes.vertical),
      stories: generarStories(producto, imagenes.vertical),
    },

    threads: generarThreads(producto, imagenes.feed),

    facebook: {
      publicaciones: generarFacebook(producto, imagenes.feed),
    },
  };
}
