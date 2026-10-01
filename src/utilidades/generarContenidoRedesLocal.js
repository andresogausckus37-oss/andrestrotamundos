import { prepararProductoRedes } from "./prepararProductoRedes";

// =========================================================
// UTILIDADES
// =========================================================

const elegir = (lista) =>
  lista[Math.floor(Math.random() * lista.length)];

const mezclar = (lista) =>
  [...lista].sort(() => Math.random() - 0.5);

const elegirSinRepetir = (lista, cantidad) =>
  mezclar(lista).slice(0, cantidad);

const limpiar = (valor) =>
  String(valor || "").trim();

const obtenerNombre = (producto) =>
  limpiar(producto.nombre) || "este imprimible";

const obtenerPublico = (producto) =>
  limpiar(producto.publico) ||
  "quienes disfrutan de los juegos imprimibles";

const obtenerCantidad = (producto) =>
  Number(producto.cantidadActividades) || null;

const obtenerIncluye = (producto) =>
  Array.isArray(producto.incluye)
    ? producto.incluye.filter(Boolean)
    : [];

const obtenerBeneficios = (producto) =>
  Array.isArray(producto.beneficios)
    ? producto.beneficios.filter(Boolean)
    : [];

const obtenerImagenes = (producto) => {
  const presentacion =
    producto.imagenes?.portada || null;

  const incluye =
    producto.imagenes?.preview || null;

  const muestras =
    producto.imagenes?.muestras || [];

  const beneficios =
    muestras[0] || null;

  const comoFunciona =
    muestras[1] || null;

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

// =========================================================
// EMOJIS
// Exactamente 3 por publicación
// =========================================================

const gruposEmojis = {
  interaccion: [
    ["🤔", "🧩", "💬"],
    ["👀", "🎯", "💭"],
    ["🙋", "🧠", "✨"],
    ["🔎", "🤔", "💬"],
    ["🎲", "👀", "🙌"],
    ["🧐", "🧩", "👇"],
  ],

  producto: [
    ["🧩", "🖨️", "✨"],
    ["📄", "🎯", "🖨️"],
    ["✨", "🧠", "📥"],
    ["🎲", "📄", "⭐"],
    ["🖨️", "🧩", "💡"],
    ["📥", "✨", "🎯"],
  ],

  tip: [
    ["💡", "🧠", "✨"],
    ["📝", "💡", "🎯"],
    ["🧩", "💭", "✨"],
    ["📌", "🧠", "💡"],
    ["✨", "📚", "🧠"],
    ["🎯", "💡", "📝"],
  ],

  encuesta: [
    ["📊", "🤔", "👇"],
    ["🗳️", "👀", "💬"],
    ["🤔", "🎯", "👇"],
    ["📊", "🧩", "🙋"],
    ["👀", "🗳️", "✨"],
    ["💭", "📊", "👇"],
  ],

  beneficio: [
    ["🧠", "✨", "🧩"],
    ["💡", "🎯", "🌟"],
    ["🧩", "📚", "✨"],
    ["🎯", "🧠", "💫"],
    ["✨", "💭", "🖨️"],
    ["📄", "🧠", "⭐"],
  ],

  venta: [
    ["🛍️", "🧩", "✨"],
    ["📥", "🖨️", "⭐"],
    ["🎯", "🛒", "✨"],
    ["🧩", "📄", "📥"],
    ["✨", "🖨️", "🛍️"],
    ["📥", "🎲", "⭐"],
  ],
};

const emojis = (tipo) =>
  elegir(
    gruposEmojis[tipo] ||
      gruposEmojis.producto
  );

// =========================================================
// HASHTAGS
// 5 por publicación
// =========================================================

const hashtagsGenerales = [
  "#JuegosImprimibles",
  "#ActividadesImprimibles",
  "#Imprimibles",
  "#JuegosDeIngenio",
  "#Actividades",
  "#AprenderJugando",
  "#JuegosEducativos",
  "#TiempoSinPantallas",
  "#ActividadesEnCasa",
  "#DiversionEnCasa",
  "#JuegosParaImprimir",
  "#PDFImprimible",
];

const hashtagsNinos = [
  "#ActividadesParaNiños",
  "#JuegosParaNiños",
  "#AprendizajeDivertido",
  "#NiñosCreativos",
  "#ActividadesInfantiles",
  "#AprenderJugando",
];

const hashtagsAdultos = [
  "#JuegosParaAdultos",
  "#Pasatiempos",
  "#EntrenamientoMental",
  "#MenteActiva",
  "#DesafioMental",
  "#TiempoLibre",
];

const hashtagsCategorias = {
  "sopa-de-letras": [
    "#SopaDeLetras",
    "#SopasDeLetras",
    "#BuscaPalabras",
    "#JuegosDePalabras",
    "#Vocabulario",
  ],

  laberintos: [
    "#Laberintos",
    "#LaberintosImprimibles",
    "#JuegosDeLaberintos",
    "#Desafios",
    "#JuegosDeIngenio",
  ],

  crucigramas: [
    "#Crucigramas",
    "#CrucigramasImprimibles",
    "#JuegosDePalabras",
    "#Pasatiempos",
    "#Vocabulario",
  ],

  colorear: [
    "#ParaColorear",
    "#DibujosParaColorear",
    "#Colorear",
    "#ActividadesCreativas",
    "#ArteParaNiños",
  ],
};

function crearHashtags(producto) {
  const publico =
    obtenerPublico(producto).toLowerCase();

  const hashtagsPublico =
    publico.includes("niñ")
      ? hashtagsNinos
      : publico.includes("adult")
        ? hashtagsAdultos
        : [];

  const hashtagsCategoria =
    hashtagsCategorias[
      producto.categoria
    ] || [];

  const todos = [
    ...hashtagsCategoria,
    ...hashtagsPublico,
    ...hashtagsGenerales,
  ];

  return elegirSinRepetir(
    [...new Set(todos)],
    5
  );
}

// =========================================================
// DATOS VARIABLES DEL PRODUCTO
// =========================================================

function beneficioAleatorio(producto) {
  const beneficios =
    obtenerBeneficios(producto);

  if (!beneficios.length) {
    return "disfrutar de una actividad imprimible";
  }

  return elegir(beneficios);
}

function incluyeAleatorio(producto) {
  const incluye =
    obtenerIncluye(producto);

  if (!incluye.length) {
    return `${producto.formato || "PDF"} listo para imprimir`;
  }

  return elegir(incluye);
}

function descripcionCantidad(producto) {
  const cantidad =
    obtenerCantidad(producto);

  if (!cantidad) {
    return "una colección de actividades";
  }

  return `${cantidad} actividades`;
}

// =========================================================
// CREAR PUBLICACIÓN
// =========================================================

function crearPublicacion({
  producto,
  tipo,
  formato = "texto",
  texto,
  cta = "",
  imagen = null,
  encuesta = null,
}) {
  return {
    tipo,
    formato,
    texto,
    cta,
    hashtags: crearHashtags(producto),
    imagen,
    encuesta,
  };
}

// =========================================================
// THREADS
// =========================================================

const threadsInteraccion = [
  (p, e) =>
    `Pregunta rápida ${e[0]} ¿Qué tipo de actividad prefieres cuando quieres desconectarte un rato: algo tranquilo o un buen desafío? ${e[1]} Cuéntame en las respuestas ${e[2]}`,

  (p, e) =>
    `Hay dos tipos de personas ${e[0]} las que comienzan por lo más fácil y las que buscan directamente el desafío más complicado ${e[1]} ¿De cuál eres? ${e[2]}`,

  (p, e) =>
    `Si tuvieras unos minutos libres ahora mismo ${e[0]} ¿preferirías una actividad para relajarte o una que te haga pensar bastante? ${e[1]} Cuéntame cuál elegirías ${e[2]}`,

  (p, e) =>
    `Vamos a conocernos un poco ${e[0]} ¿eres de terminar un juego aunque se ponga difícil o algunas veces lo dejas para después? ${e[1]} Cuéntame ${e[2]}`,

  (p, e) =>
    `Una pregunta para quienes disfrutan de los juegos imprimibles ${e[0]} ¿los resuelves de una sola vez o prefieres avanzar poco a poco? ${e[1]} Quiero saber ${e[2]}`,

  (p, e) =>
    `¿Qué hace que un juego te atrape de verdad? ${e[0]} ¿El desafío, la temática o la satisfacción de terminarlo? ${e[1]} Elige una opción ${e[2]}`,

  (p, e) =>
    `Momento de elegir ${e[0]} ¿actividad rápida para pasar el rato o desafío largo para concentrarte de verdad? ${e[1]} ¿Con cuál te quedas? ${e[2]}`,

  (p, e) =>
    `¿Te gusta competir contra el reloj? ${e[0]} Algunas personas disfrutan cada actividad con calma y otras quieren superar su propio tiempo ${e[1]} ¿Qué opción prefieres? ${e[2]}`,
];

const threadsProducto = [
  (p, e) =>
    `${obtenerNombre(p)} ${e[0]} Una propuesta imprimible pensada para ${obtenerPublico(p)}. Incluye ${incluyeAleatorio(p)} ${e[1]} Descubre todos los detalles en la tienda ${e[2]}`,

  (p, e) =>
    `Una actividad lista para usar cuando quieras ${e[0]} ${obtenerNombre(p)} reúne ${descripcionCantidad(p)} en formato ${p.formato || "PDF"} ${e[1]} Puedes conocer el producto completo en la tienda ${e[2]}`,

  (p, e) =>
    `Hoy te muestro uno de nuestros imprimibles ${e[0]} ${obtenerNombre(p)}. ${incluyeAleatorio(p)} ${e[1]} Descubre todos los detalles en nuestra tienda ${e[2]}`,

  (p, e) =>
    `¿Buscas una actividad que puedas imprimir cuando la necesites? ${e[0]} ${obtenerNombre(p)} está preparado para ${obtenerPublico(p)} ${e[1]} Encuentra toda la información en la tienda ${e[2]}`,

  (p, e) =>
    `Del archivo a la impresora ${e[0]} ${obtenerNombre(p)} se entrega en formato ${p.formato || "PDF"} y tamaño ${p.tamano || "A4"} ${e[1]} Conócelo en nuestra tienda ${e[2]}`,
];

const threadsTips = [
  (p, e) =>
    `Consejo para tus imprimibles ${e[0]} Prepara algunas actividades con anticipación y guárdalas para esos momentos en los que necesitas una opción rápida sin depender de una pantalla ${e[1]} Simple y práctico ${e[2]}`,

  (p, e) =>
    `Una idea sencilla ${e[0]} imprime solamente las actividades que vas a utilizar y conserva el archivo para volver a usarlo cuando quieras ${e[1]} Así aprovechas mejor tus imprimibles ${e[2]}`,

  (p, e) =>
    `Un pequeño consejo ${e[0]} tener actividades impresas listas puede ayudarte cuando aparece un momento libre y no sabes qué actividad elegir ${e[1]} Solo eliges una hoja y comienzas ${e[2]}`,

  (p, e) =>
    `Idea para tus imprimibles ${e[0]} prepara una pequeña carpeta con diferentes actividades y elige según las ganas del momento ${e[1]} Fácil de organizar y tener a mano ${e[2]}`,

  (p, e) =>
    `Un truco sencillo ${e[0]} alternar diferentes actividades ayuda a que cada momento de juego se sienta diferente ${e[1]} También puedes guardar tus favoritas para repetirlas después ${e[2]}`,

  (p, e) =>
    `Consejo del día ${e[0]} si una actividad parece difícil, comienza por una parte pequeña en lugar de intentar resolver todo de una sola vez ${e[1]} Cada avance cuenta ${e[2]}`,
];

const threadsBeneficios = [
  (p, e) =>
    `Los juegos imprimibles también pueden convertirse en un momento para ${beneficioAleatorio(p).toLowerCase()} ${e[0]} No todo tiene que suceder frente a una pantalla ${e[1]} A veces papel y lápiz son suficientes ${e[2]}`,

  (p, e) =>
    `Una de las ventajas de los imprimibles ${e[0]} es poder elegir una actividad, imprimirla y comenzar sin complicaciones ${e[1]} Una opción sencilla para cambiar de ritmo ${e[2]}`,

  (p, e) =>
    `Un juego en papel puede ser algo muy sencillo ${e[0]} pero también una oportunidad para trabajar ${beneficioAleatorio(p).toLowerCase()} mientras te entretienes ${e[1]} Dos cosas al mismo tiempo ${e[2]}`,

  (p, e) =>
    `¿Por qué tener actividades imprimibles guardadas? ${e[0]} Porque puedes utilizarlas cuando necesitas una alternativa práctica ${e[1]} Imprimir, resolver y disfrutar ${e[2]}`,

  (p, e) =>
    `A veces una hoja y un desafío son suficientes ${e[0]} Los juegos imprimibles ofrecen una forma sencilla de dedicar unos minutos a ${beneficioAleatorio(p).toLowerCase()} ${e[1]} sin demasiada preparación ${e[2]}`,
];

const threadsVenta = [
  (p, e) =>
    `Si quieres sumar nuevos desafíos imprimibles ${e[0]} ${obtenerNombre(p)} incluye ${incluyeAleatorio(p)} ${e[1]} Puedes verlo completo y acceder al producto desde nuestra tienda ${e[2]}`,

  (p, e) =>
    `${obtenerNombre(p)} ya está disponible ${e[0]} Recibes ${incluyeAleatorio(p)} para disfrutar en formato ${p.formato || "PDF"} ${e[1]} Encuéntralo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `¿Quieres tener nuevas actividades listas para imprimir? ${e[0]} Con ${obtenerNombre(p)} tienes ${descripcionCantidad(p)} para elegir ${e[1]} Conócelo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Una colección para guardar y utilizar cuando quieras ${e[0]} ${obtenerNombre(p)} está pensado para ${obtenerPublico(p)} ${e[1]} Descubre qué incluye y cómo obtenerlo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Un nuevo momento de juego sin complicaciones ${e[0]} Elige ${obtenerNombre(p)}, imprime la actividad que quieras y comienza ${e[1]} Disponible en nuestra tienda ${e[2]}`,
];

function generarThreads(
  producto,
  imagenes
) {
  const eInteraccion =
    emojis("interaccion");

  const eProducto =
    emojis("producto");

  const eTip =
    emojis("tip");

  const eEncuesta =
    emojis("encuesta");

  const eBeneficio =
    emojis("beneficio");

  const eVenta =
    emojis("venta");

  const encuestaOpciones = elegir([
    [
      "Actividad tranquila",
      "Desafío difícil",
    ],
    [
      "Con tiempo",
      "Contra reloj",
    ],
    [
      "Solo/a",
      "En compañía",
    ],
    [
      "Fácil primero",
      "Difícil primero",
    ],
    [
      "Papel",
      "Pantalla",
    ],
  ]);

  return [
    crearPublicacion({
      producto,
      tipo: "interaccion",
      formato: "texto",
      texto: elegir(
        threadsInteraccion
      )(
        producto,
        eInteraccion
      ),
    }),

    crearPublicacion({
      producto,
      tipo: "producto",
      formato: "imagen",
      texto: elegir(
        threadsProducto
      )(
        producto,
        eProducto
      ),
      cta:
        "Ver producto en la tienda",
      imagen: imagenes.presentacion,
    }),

    crearPublicacion({
      producto,
      tipo: "tip",
      formato: "texto",
      texto: elegir(
        threadsTips
      )(
        producto,
        eTip
      ),
    }),

    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",
      texto:
        `Encuesta rápida ${eEncuesta[0]} Si hoy tuvieras que elegir una opción, ¿con cuál te quedarías? ${eEncuesta[1]} Vota y cuéntame por qué ${eEncuesta[2]}`,
      encuesta: {
        pregunta:
          "¿Con cuál te quedas?",
        opciones:
          encuestaOpciones,
      },
    }),

    crearPublicacion({
      producto,
      tipo: "beneficio",
      formato:
        imagenes.beneficios
          ? "imagen"
          : "texto",
      texto: elegir(
        threadsBeneficios
      )(
        producto,
        eBeneficio
      ),
      imagen: imagenes.beneficios,
    }),

    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto: elegir(
        threadsVenta
      )(
        producto,
        eVenta
      ),
      cta:
        "Ver producto en la tienda",
      imagen: imagenes.comoFunciona,
    }),
  ];
}

// =========================================================
// INSTAGRAM - STORIES
// =========================================================

const storiesPresentacion = [
  (p, e) =>
    `${obtenerNombre(p)} ${e[0]}\nUna nueva propuesta para imprimir y disfrutar ${e[1]}\n¿Ya la conocías? ${e[2]}`,

  (p, e) =>
    `Hoy te mostramos ${obtenerNombre(p)} ${e[0]}\n${descripcionCantidad(p)} para descubrir ${e[1]}\nMira todo lo que incluye ${e[2]}`,

  (p, e) =>
    `¿Un nuevo desafío? ${e[0]}\nConoce ${obtenerNombre(p)} ${e[1]}\nListo para imprimir ${e[2]}`,

  (p, e) =>
    `Una actividad diferente para guardar ${e[0]}\n${obtenerNombre(p)} ${e[1]}\nDescubre más ${e[2]}`,
];

const storiesBeneficio = [
  (p, e) =>
    `${beneficioAleatorio(p)} ${e[0]}\nTambién puede formar parte del momento de juego ${e[1]}\nTodo desde una actividad imprimible ${e[2]}`,

  (p, e) =>
    `Un momento para cambiar de ritmo ${e[0]}\nJugar, pensar y disfrutar ${e[1]}\nSin depender siempre de una pantalla ${e[2]}`,

  (p, e) =>
    `Papel + desafío ${e[0]}\nUna combinación sencilla para trabajar ${beneficioAleatorio(p).toLowerCase()} ${e[1]}\n¿Te animas? ${e[2]}`,

  (p, e) =>
    `Una actividad también puede aportar ${e[0]}\n${beneficioAleatorio(p)} ${e[1]}\nMientras disfrutas del desafío ${e[2]}`,
];

function generarStories(
  producto,
  imagenes
) {
  const e1 =
    emojis("producto");

  const e2 =
    emojis("encuesta");

  const e3 =
    emojis("beneficio");

  const e4 =
    emojis("interaccion");

  const e5 =
    emojis("producto");

  const e6 =
    emojis("venta");

  return [
    crearPublicacion({
      producto,
      tipo: "presentacion",
      formato: "imagen",
      texto: elegir(
        storiesPresentacion
      )(
        producto,
        e1
      ),
      cta: "Descúbrelo",
      imagen: imagenes.presentacion,
    }),

    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",
      texto:
        `Elige tu estilo ${e2[0]}\n¿Prefieres resolver con calma o contra reloj? ${e2[1]}\nVota aquí ${e2[2]}`,
      encuesta: {
        pregunta:
          "¿Cómo prefieres jugar?",
        opciones: [
          "Con calma",
          "Contra reloj",
        ],
      },
      imagen: null,
    }),

    crearPublicacion({
      producto,
      tipo: "beneficio",
      formato: "imagen",
      texto: elegir(
        storiesBeneficio
      )(
        producto,
        e3
      ),
      imagen: imagenes.beneficios,
    }),

    crearPublicacion({
      producto,
      tipo: "desafio",
      formato: "texto",
      texto:
        `Te propongo un desafío ${e4[0]}\n¿Hasta dónde llegarías sin mirar una solución? ${e4[1]}\nAcepta el reto ${e4[2]}`,
      imagen: null,
    }),

    crearPublicacion({
      producto,
      tipo: "incluye",
      formato: "imagen",
      texto:
        `¿Qué encontrarás? ${e5[0]}\n${incluyeAleatorio(producto)} ${e5[1]}\nTodo preparado para disfrutar ${e5[2]}`,
      imagen: imagenes.incluye,
    }),

    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto:
        `${obtenerNombre(producto)} ${e6[0]}\nListo para descubrir en nuestra tienda ${e6[1]}\nEntra y conoce todos los detalles ${e6[2]}`,
      cta: "Enlace en la bio",
      imagen: imagenes.comoFunciona,
    }),
  ];
}

// =========================================================
// INSTAGRAM - CARRUSEL
// =========================================================

const instagramCarrusel = [
  (p, e) =>
    `Una actividad para tener siempre a mano ${e[0]}\n\n${obtenerNombre(p)} reúne ${descripcionCantidad(p)} pensadas para ${obtenerPublico(p)}.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nDesliza para conocer el producto ${e[2]}`,

  (p, e) =>
    `¿Buscas nuevas actividades para imprimir? ${e[0]}\n\nHoy te presentamos ${obtenerNombre(p)}.\n\nUna colección en formato ${p.formato || "PDF"} para disfrutar cuando quieras ${e[1]}\n\nDescubre qué incluye ${e[2]}`,

  (p, e) =>
    `Nuevo desafío para imprimir ${e[0]}\n\nConoce ${obtenerNombre(p)}, una propuesta creada para ${obtenerPublico(p)}.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nDesliza y descubre más ${e[2]}`,

  (p, e) =>
    `Imprime, juega y disfruta ${e[0]}\n\n${obtenerNombre(p)} te permite tener ${descripcionCantidad(p)} listas para utilizar.\n\nFormato ${p.formato || "PDF"} · ${p.tamano || "A4"} ${e[1]}\n\nConoce todos los detalles ${e[2]}`,

  (p, e) =>
    `Una propuesta para disfrutar lejos de las pantallas ${e[0]}\n\n${obtenerNombre(p)} combina entretenimiento y ${beneficioAleatorio(p).toLowerCase()}.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nDescubre el producto completo ${e[2]}`,
];

function generarCarrusel(
  producto,
  imagenes
) {
  const e =
    emojis("producto");

  return crearPublicacion({
    producto,
    tipo: "carrusel",
    formato: "carrusel",

    texto: elegir(
      instagramCarrusel
    )(
      producto,
      e
    ),

    cta: "Enlace en la bio",

    imagen: imagenes.todas,
  });
}

// =========================================================
// INSTAGRAM - REEL
// =========================================================

const instagramReels = [
  (p, e) =>
    `Un desafío imprimible para tener listo cuando quieras ${e[0]} ${obtenerNombre(p)} reúne ${descripcionCantidad(p)} para disfrutar ${e[1]} Conócelo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `De la pantalla al papel en pocos pasos ${e[0]} Descubre ${obtenerNombre(p)} y disfruta de nuevas actividades para imprimir ${e[1]} Encuentra el producto en nuestra tienda ${e[2]}`,

  (p, e) =>
    `¿Te animas a un nuevo desafío? ${e[0]} ${obtenerNombre(p)} está preparado para ${obtenerPublico(p)} ${e[1]} Descubre todo lo que incluye ${e[2]}`,

  (p, e) =>
    `Una actividad lista para imprimir y disfrutar ${e[0]} ${obtenerNombre(p)} incluye ${incluyeAleatorio(p)} ${e[1]} Conoce el producto completo ${e[2]}`,
];

function generarReel(
  producto,
  imagenes
) {
  const e =
    emojis("producto");

  return {
    ...crearPublicacion({
      producto,
      tipo: "reel",
      formato: "reel",

      texto: elegir(
        instagramReels
      )(
        producto,
        e
      ),

      cta: "Enlace en la bio",

      // Por ahora usamos las cuatro imágenes comerciales
      // como referencia visual.
      // Más adelante incorporaremos actividades reales
      // y generaremos el video del Reel.
      imagen: imagenes.todas,
    }),

    guion: [
      `1. Gancho: presentar ${obtenerNombre(producto)}.`,
      `2. Presentación: mostrar ${descripcionCantidad(producto)}.`,
      `3. Producto: enseñar ejemplos reales de las actividades.`,
      `4. Soluciones: mostrar una actividad y su solución si corresponde.`,
      `5. Cierre: mostrar el producto y dirigir a la tienda.`,
    ].join("\n"),
  };
}

// =========================================================
// FACEBOOK - INTERACCIÓN
// =========================================================

const facebookInteraccion = [
  (p, e) =>
    `Pregunta para comenzar ${e[0]}\n\nCuando eliges una actividad imprimible, ¿qué valoras más: que sea entretenida, que represente un desafío o que puedas hacerla con calma? ${e[1]}\n\nCuéntame en los comentarios ${e[2]}`,

  (p, e) =>
    `Vamos a elegir ${e[0]}\n\nSi hoy tuvieras un rato libre, ¿preferirías una actividad rápida o un desafío para dedicarle más tiempo? ${e[1]}\n\nQuiero conocer tu elección ${e[2]}`,

  (p, e) =>
    `Hay diferentes formas de disfrutar un juego ${e[0]}\n\nAlgunas personas prefieren resolverlo tranquilamente y otras convierten cada actividad en un desafío contra el reloj ${e[1]}\n\n¿Cuál prefieres? ${e[2]}`,

  (p, e) =>
    `Pregunta del día ${e[0]}\n\n¿Sueles guardar actividades para tenerlas preparadas cuando aparece un momento libre? ${e[1]}\n\nCuéntame cómo te organizas ${e[2]}`,

  (p, e) =>
    `Momento de elegir ${e[0]}\n\n¿Qué disfrutas más: comenzar por las actividades fáciles o ir directamente a las más difíciles? ${e[1]}\n\nTe leo en los comentarios ${e[2]}`,
];

// =========================================================
// FACEBOOK - TIPS
// =========================================================

const facebookTips = [
  (p, e) =>
    `Una idea práctica para tus imprimibles ${e[0]}\n\nPuedes imprimir algunas actividades con anticipación y guardarlas en una carpeta. Así tendrás una opción preparada para esos momentos en los que quieres hacer algo diferente ${e[1]}\n\nPequeñas ideas que facilitan el día ${e[2]}`,

  (p, e) =>
    `Consejo sencillo ${e[0]}\n\nNo necesitas imprimir todo el archivo de una sola vez. Puedes elegir las actividades que quieras utilizar y conservar el PDF para otro momento ${e[1]}\n\nAsí aprovechas el material a tu ritmo ${e[2]}`,

  (p, e) =>
    `Idea para organizar tus actividades ${e[0]}\n\nSepara los imprimibles por tipo o dificultad y podrás elegir rápidamente según el momento ${e[1]}\n\nUna forma sencilla de tener opciones siempre disponibles ${e[2]}`,

  (p, e) =>
    `Un pequeño truco ${e[0]}\n\nAlternar actividades diferentes puede hacer que cada sesión de juego se sienta nueva ${e[1]}\n\nGuarda tus favoritas para repetirlas cuando quieras ${e[2]}`,

  (p, e) =>
    `Consejo para disfrutar más cada actividad ${e[0]}\n\nNo siempre es necesario terminar todo de una vez. Puedes avanzar poco a poco y continuar en otro momento ${e[1]}\n\nLo importante es disfrutar el proceso ${e[2]}`,
];

// =========================================================
// FACEBOOK - PRODUCTO
// =========================================================

const facebookProducto = [
  (p, e) =>
    `Hoy te presentamos ${obtenerNombre(p)} ${e[0]}\n\nUna propuesta imprimible para ${obtenerPublico(p)} con ${descripcionCantidad(p)}.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nPuedes conocer todos los detalles en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Una nueva opción para imprimir y disfrutar ${e[0]}\n\n${obtenerNombre(p)} está preparado en formato ${p.formato || "PDF"} y pensado para ${obtenerPublico(p)}.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nDescubre el producto completo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `¿Buscas nuevas actividades para tener a mano? ${e[0]}\n\nConoce ${obtenerNombre(p)}, una colección con ${descripcionCantidad(p)} para disfrutar cuando quieras.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nEncuentra más información en nuestra tienda ${e[2]}`,

  (p, e) =>
    `${obtenerNombre(p)} ${e[0]}\n\nUna propuesta digital que puedes guardar e imprimir según la necesites.\n\nPensada para ${obtenerPublico(p)} ${e[1]}\n\nConoce todos los detalles del producto ${e[2]}`,
];

// =========================================================
// FACEBOOK - BENEFICIOS
// =========================================================

const facebookBeneficios = [
  (p, e) =>
    `Una actividad sencilla también puede ofrecer diferentes beneficios ${e[0]}\n\n${obtenerNombre(p)} puede acompañar momentos de ${beneficioAleatorio(p).toLowerCase()} mientras se disfruta de un juego imprimible ${e[1]}\n\nUna forma diferente de pasar el tiempo ${e[2]}`,

  (p, e) =>
    `Los juegos imprimibles pueden ser mucho más que una forma de entretenimiento ${e[0]}\n\nTambién pueden acompañar actividades relacionadas con ${beneficioAleatorio(p).toLowerCase()} ${e[1]}\n\nTodo desde una propuesta sencilla en papel ${e[2]}`,

  (p, e) =>
    `A veces solo necesitas papel, lápiz y un buen desafío ${e[0]}\n\nUna actividad imprimible puede convertirse en un momento para trabajar ${beneficioAleatorio(p).toLowerCase()} mientras disfrutas ${e[1]}\n\nUna alternativa sencilla a las pantallas ${e[2]}`,

  (p, e) =>
    `¿Por qué elegir actividades imprimibles? ${e[0]}\n\nPorque puedes tenerlas preparadas, elegir cuándo utilizarlas y disfrutar de beneficios como ${beneficioAleatorio(p).toLowerCase()} ${e[1]}\n\nPrácticas y fáciles de tener a mano ${e[2]}`,

  (p, e) =>
    `Jugar también puede ser una oportunidad para aprender y ejercitar diferentes habilidades ${e[0]}\n\nCon actividades como ${obtenerNombre(p)} puedes incorporar momentos relacionados con ${beneficioAleatorio(p).toLowerCase()} ${e[1]}\n\nTodo mientras disfrutas del desafío ${e[2]}`,
];

// =========================================================
// FACEBOOK - VENTA
// =========================================================

const facebookVenta = [
  (p, e) =>
    `¿Quieres sumar nuevas actividades listas para imprimir? ${e[0]}\n\n${obtenerNombre(p)} reúne ${descripcionCantidad(p)} para ${obtenerPublico(p)}.\n\nAdemás, incluye ${incluyeAleatorio(p)} ${e[1]}\n\nPuedes encontrar el producto completo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `${obtenerNombre(p)} ya está disponible ${e[0]}\n\nRecibes ${incluyeAleatorio(p)} en formato ${p.formato || "PDF"}.\n\nDescarga, imprime y elige la actividad que quieras utilizar ${e[1]}\n\nEncuentra el producto en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Una colección para guardar y utilizar cuando quieras ${e[0]}\n\n${obtenerNombre(p)} incluye ${descripcionCantidad(p)} pensadas para ${obtenerPublico(p)}.\n\n${incluyeAleatorio(p)} ${e[1]}\n\nDescubre todos los detalles en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Imprime cuando quieras y disfruta a tu ritmo ${e[0]}\n\nCon ${obtenerNombre(p)} tienes una colección de actividades preparada para utilizar.\n\nFormato ${p.formato || "PDF"} · ${p.tamano || "A4"} ${e[1]}\n\nConoce el producto en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Una nueva actividad puede estar a solo unos pasos ${e[0]}\n\nElige ${obtenerNombre(p)}, accede al archivo y prepara la actividad que quieras disfrutar ${e[1]}\n\nDisponible en nuestra tienda ${e[2]}`,
];

function generarFacebook(
  producto,
  imagenes
) {
  const eInteraccion =
    emojis("interaccion");

  const eProducto =
    emojis("producto");

  const eTip =
    emojis("tip");

  const eEncuesta =
    emojis("encuesta");

  const eBeneficio =
    emojis("beneficio");

  const eVenta =
    emojis("venta");

  const opcionesEncuesta = elegir([
    [
      "Actividad tranquila",
      "Desafío difícil",
    ],

    [
      "Resolver solo/a",
      "Resolver en compañía",
    ],

    [
      "Comenzar fácil",
      "Comenzar difícil",
    ],

    [
      "Sin límite de tiempo",
      "Contra reloj",
    ],
  ]);

  return [
    crearPublicacion({
      producto,
      tipo: "interaccion",
      formato: "texto",

      texto: elegir(
        facebookInteraccion
      )(
        producto,
        eInteraccion
      ),
    }),

    crearPublicacion({
      producto,
      tipo: "producto",
      formato: "imagen",

      texto: elegir(
        facebookProducto
      )(
        producto,
        eProducto
      ),

      cta:
        "Ver producto en la tienda",

      // Imagen 1:
      // presentación del producto.
      imagen:
        imagenes.presentacion,
    }),

    crearPublicacion({
      producto,
      tipo: "tip",
      formato: "texto",

      texto: elegir(
        facebookTips
      )(
        producto,
        eTip
      ),
    }),

    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",

      texto:
        `Vamos a elegir ${eEncuesta[0]}\n\nSi hoy tuvieras que escoger una opción, ¿cuál preferirías? ${eEncuesta[1]}\n\nVota y cuéntame tu elección ${eEncuesta[2]}`,

      encuesta: {
        pregunta:
          "¿Qué opción prefieres?",

        opciones:
          opcionesEncuesta,
      },

      // No forzamos una imagen comercial.
      imagen: null,
    }),

    crearPublicacion({
      producto,
      tipo: "beneficio",

      formato:
        imagenes.beneficios
          ? "imagen"
          : "texto",

      texto: elegir(
        facebookBeneficios
      )(
        producto,
        eBeneficio
      ),

      // Imagen 3:
      // beneficios / aprender jugando.
      imagen:
        imagenes.beneficios,
    }),

    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",

      texto: elegir(
        facebookVenta
      )(
        producto,
        eVenta
      ),

      cta:
        "Ver producto en la tienda",

      // Imagen 4:
      // descarga, impresión y funcionamiento.
      imagen:
        imagenes.comoFunciona,
    }),
  ];
}

// =========================================================
// GENERADOR PRINCIPAL
// =========================================================

export function generarContenidoRedesLocal(
  productoOriginal
) {
  const producto =
    prepararProductoRedes(
      productoOriginal
    );

  const imagenes =
    obtenerImagenes(
      producto
    );

  return {
    productoId:
      producto.id,

    nombreProducto:
      producto.nombre,

    generador: "local",

    instagram: {
      carrusel:
        generarCarrusel(
          producto,
          imagenes
        ),

      reel:
        generarReel(
          producto,
          imagenes
        ),

      stories:
        generarStories(
          producto,
          imagenes
        ),
    },

    threads:
      generarThreads(
        producto,
        imagenes
      ),

    facebook: {
      publicaciones:
        generarFacebook(
          producto,
          imagenes
        ),
    },
  };
}