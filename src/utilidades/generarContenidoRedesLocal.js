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
  const imagenes = [
    producto.imagenes?.portada,
    producto.imagenes?.preview,
    ...(producto.imagenes?.muestras || []),
  ].filter(Boolean);

  return [...new Set(imagenes)];
};

const imagenPorIndice = (imagenes, indice) => {
  if (!imagenes.length) return null;

  return imagenes[indice % imagenes.length];
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
      imagen:
        imagenPorIndice(
          imagenes,
          0
        ),
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
        imagenes.length
          ? "imagen"
          : "texto",
      texto: elegir(
        threadsBeneficios
      )(
        producto,
        eBeneficio
      ),
      imagen:
        imagenPorIndice(
          imagenes,
          1
        ),
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
      imagen:
        imagenPorIndice(
          imagenes,
          2
        ),
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
      imagen:
        imagenPorIndice(
          imagenes,
          0
        ),
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
      imagen:
        imagenPorIndice(
          imagenes,
          1
        ),
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
      imagen:
        imagenPorIndice(
          imagenes,
          2
        ),
    }),

    crearPublicacion({
      producto,
      tipo: "desafio",
      formato: "imagen",
      texto:
        `Te propongo un desafío ${e4[0]}\n¿Hasta dónde llegarías sin mirar una solución? ${e4[1]}\nAcepta el reto ${e4[2]}`,
      imagen:
        imagenPorIndice(
          imagenes,
          3
        ),
    }),

    crearPublicacion({
      producto,
      tipo: "incluye",
      formato: "imagen",
      texto:
        `¿Qué encontrarás? ${e5[0]}\n${incluyeAleatorio(producto)} ${e5[1]}\nTodo preparado para disfrutar ${e5[2]}`,
      imagen:
        imagenPorIndice(
          imagenes,
          1
        ),
    }),

    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto:
        `${obtenerNombre(producto)} ${e6[0]}\nListo para descubrir en nuestra tienda ${e6[1]}\nEntra y conoce todos los detalles ${e6[2]}`,
      cta: "Enlace en la bio",
      imagen:
        imagenPorIndice(
          imagenes,
          0
        ),
    }),
  ];
}

// =========================================================
// INSTAGRAM - CARRUSEL
// =========================================================

const carruseles = [
  (p, e) =>
    `¿Buscas una actividad imprimible para tener siempre disponible? ${e[0]}

${obtenerNombre(p)} reúne ${descripcionCantidad(p)} pensadas para ${obtenerPublico(p)}.

${incluyeAleatorio(p)} ${e[1]}

Desliza para conocer el producto y descubrir algunas de sus características ${e[2]}`,

  (p, e) =>
    `Una actividad puede comenzar con algo tan sencillo como imprimir una hoja ${e[0]}

Hoy te presentamos ${obtenerNombre(p)}, una colección preparada para ${obtenerPublico(p)}.

Entre sus propuestas puedes encontrar ${incluyeAleatorio(p)} ${e[1]}

Desliza y conoce más ${e[2]}`,

  (p, e) =>
    `¿Preparado para nuevos desafíos? ${e[0]}

Con ${obtenerNombre(p)} tienes ${descripcionCantidad(p)} para disfrutar en formato ${p.formato || "PDF"}.

Una propuesta que puede acompañar momentos de ${beneficioAleatorio(p).toLowerCase()} ${e[1]}

Descubre qué incluye deslizando el carrusel ${e[2]}`,

  (p, e) =>
    `Ideas para imprimir, guardar y disfrutar cuando quieras ${e[0]}

${obtenerNombre(p)} está pensado para ${obtenerPublico(p)} e incluye ${incluyeAleatorio(p)}.

Elige una actividad, imprímela y comienza ${e[1]}

Conoce el producto completo ${e[2]}`,

  (p, e) =>
    `¿Buscas una propuesta diferente para disfrutar en papel? ${e[0]}

${obtenerNombre(p)} ofrece ${descripcionCantidad(p)} para ${obtenerPublico(p)}.

Además, incluye ${incluyeAleatorio(p)} ${e[1]}

Desliza para descubrir todos los detalles ${e[2]}`,

  (p, e) =>
    `Una colección de actividades para tener disponible cuando la necesites ${e[0]}

Con ${obtenerNombre(p)} puedes disfrutar de una propuesta pensada para ${obtenerPublico(p)}.

Formato ${p.formato || "PDF"} y ${incluyeAleatorio(p)} ${e[1]}

Descubre el contenido en las siguientes imágenes ${e[2]}`,
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
      carruseles
    )(
      producto,
      e
    ),
    cta: "Enlace en la bio",
    imagen: imagenes,
  });
}

// =========================================================
// INSTAGRAM - REEL
// =========================================================

const reels = [
  (p, e) => ({
    texto:
      `Un desafío imprimible para tener listo cuando quieras ${e[0]} ${obtenerNombre(p)} reúne ${descripcionCantidad(p)} para disfrutar ${e[1]} Conócelo en nuestra tienda ${e[2]}`,

    guion: [
      "Gancho: ¿Te animas a un nuevo desafío?",
      `Presentación: mostrar ${obtenerNombre(p)}.`,
      "Producto: recorrer algunas de las actividades.",
      `Valor: destacar ${beneficioAleatorio(p)}.`,
      "CTA: conocer el producto desde el enlace en la bio.",
    ],
  }),

  (p, e) => ({
    texto:
      `De la pantalla al papel en pocos pasos ${e[0]} Elige una actividad de ${obtenerNombre(p)}, imprímela y comienza ${e[1]} Descubre todo lo que incluye ${e[2]}`,

    guion: [
      "Gancho: mostrar rápidamente una actividad.",
      "Presentación: enseñar la portada del producto.",
      "Desarrollo: mostrar diferentes páginas.",
      `Detalle: destacar ${incluyeAleatorio(p)}.`,
      "CTA: visitar el enlace en la bio.",
    ],
  }),

  (p, e) => ({
    texto:
      `¿Cuánto tiempo tardarías en resolver uno? ${e[0]} ${obtenerNombre(p)} propone nuevos momentos de juego y desafío ${e[1]} Descúbrelo completo en nuestra tienda ${e[2]}`,

    guion: [
      "Gancho: plantear un desafío visual.",
      "Presentación: mostrar el nombre del producto.",
      "Interacción: preguntar si podrían resolverlo.",
      "Producto: mostrar varias actividades.",
      "CTA: visitar el enlace en la bio.",
    ],
  }),

  (p, e) => ({
    texto:
      `Una actividad imprimible puede transformar un momento libre en un nuevo desafío ${e[0]} Con ${obtenerNombre(p)} tienes diferentes propuestas para elegir ${e[1]} Conoce el producto completo ${e[2]}`,

    guion: [
      "Gancho: mostrar una actividad durante los primeros segundos.",
      `Presentación: enseñar ${obtenerNombre(p)}.`,
      "Interacción: preguntar cuál actividad elegirían primero.",
      `Valor: mencionar ${beneficioAleatorio(p)}.`,
      "CTA: descubrir el producto en el enlace de la bio.",
    ],
  }),

  (p, e) => ({
    texto:
      `Imprimir, elegir y comenzar ${e[0]} Así de sencillo puedes disfrutar de ${obtenerNombre(p)} cuando quieras ${e[1]} Mira algunas de las actividades incluidas ${e[2]}`,

    guion: [
      "Gancho: mostrar la portada y cambiar rápidamente a una actividad.",
      "Presentación: enseñar varias páginas del producto.",
      "Desafío: invitar a elegir una actividad.",
      `Detalle: mostrar ${incluyeAleatorio(p)}.`,
      "CTA: enlace en la bio.",
    ],
  }),
];

function generarReel(
  producto,
  imagenes
) {
  const e =
    emojis("producto");

  const contenido =
    elegir(reels)(
      producto,
      e
    );

  return {
    ...crearPublicacion({
      producto,
      tipo: "reel",
      formato: "reel",
      texto:
        contenido.texto,
      cta:
        "Enlace en la bio",
      imagen: imagenes,
    }),

    guion:
      contenido.guion,
  };
}

// =========================================================
// FACEBOOK - INTERACCIÓN
// =========================================================

const facebookInteraccion = [
  (p, e) =>
    `Pregunta para la comunidad ${e[0]} ¿Qué tipo de actividades suelen elegir cuando quieren pasar un momento entretenido sin depender de una pantalla? ${e[1]} Me gustaría conocer sus favoritas ${e[2]}`,

  (p, e) =>
    `Vamos con una pregunta ${e[0]} Cuando comienzan un juego de ingenio, ¿prefieren algo sencillo para entrar en ritmo o empezar directamente por lo más difícil? ${e[1]} Los leo en los comentarios ${e[2]}`,

  (p, e) =>
    `Tengo curiosidad ${e[0]} ¿En casa utilizan actividades imprimibles para los momentos libres? ${e[1]} ¿Qué tipo de juegos son los que más disfrutan? ${e[2]}`,

  (p, e) =>
    `Momento de compartir ideas ${e[0]} ¿Cuál es ese juego en papel que nunca falta en casa? ${e[1]} Puede ser de palabras, lógica, dibujo o cualquier otro ${e[2]}`,

  (p, e) =>
    `Una pregunta para comenzar la conversación ${e[0]} ¿Qué valoran más en una actividad imprimible: que sea entretenida, desafiante o fácil de preparar? ${e[1]} Los leo ${e[2]}`,

  (p, e) =>
    `Queremos conocer sus preferencias ${e[0]} ¿Disfrutan más las actividades individuales o aquellas que pueden compartir con otras personas? ${e[1]} Cuéntenos cuál prefieren ${e[2]}`,

  (p, e) =>
    `Hoy queremos hacerles una pregunta ${e[0]} ¿Cuándo suelen utilizar más los juegos imprimibles: durante la semana, los fines de semana o en vacaciones? ${e[1]} Los leo en los comentarios ${e[2]}`,
];

// =========================================================
// FACEBOOK - TIPS
// =========================================================

const facebookTips = [
  (p, e) =>
    `Una idea práctica para aprovechar los imprimibles ${e[0]} Puedes preparar una carpeta con diferentes actividades y dejarla lista para elegir según el momento ${e[1]} Así siempre tendrás alguna opción disponible ${e[2]}`,

  (p, e) =>
    `Consejo sencillo ${e[0]} No necesitas imprimir todo de una sola vez. Puedes elegir las actividades que vas a utilizar y conservar el archivo para más adelante ${e[1]} Práctico y fácil de organizar ${e[2]}`,

  (p, e) =>
    `Una idea para esos momentos en los que aparece un poco de tiempo libre ${e[0]} Tener algunas actividades ya impresas evita tener que buscar qué hacer a último momento ${e[1]} Solo tienes que elegir y comenzar ${e[2]}`,

  (p, e) =>
    `Un pequeño consejo ${e[0]} Alternar diferentes tipos de desafíos puede hacer que las actividades se mantengan interesantes durante más tiempo ${e[1]} Cada día puede ser una experiencia diferente ${e[2]}`,

  (p, e) =>
    `Una forma sencilla de organizar tus actividades ${e[0]} Separa los imprimibles por tipo o dificultad para encontrar rápidamente el que necesitas ${e[1]} Así será mucho más fácil elegir ${e[2]}`,

  (p, e) =>
    `Consejo para aprovechar mejor un producto digital ${e[0]} Conserva el archivo original y selecciona solamente las páginas que quieras imprimir cada vez ${e[1]} Así puedes utilizarlo de forma más práctica ${e[2]}`,
];

// =========================================================
// FACEBOOK - PRODUCTO
// =========================================================

const facebookProducto = [
  (p, e) =>
    `Hoy queremos mostrarles ${obtenerNombre(p)} ${e[0]}

Es una propuesta pensada para ${obtenerPublico(p)} e incluye ${incluyeAleatorio(p)}.

Puede ser una opción para disfrutar de ${beneficioAleatorio(p).toLowerCase()} mediante actividades imprimibles ${e[1]}

Pueden conocer todos los detalles en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Les compartimos uno de nuestros productos imprimibles ${e[0]}

${obtenerNombre(p)} contiene ${descripcionCantidad(p)} y se entrega en formato ${p.formato || "PDF"}.

${incluyeAleatorio(p)} ${e[1]}

Si quieren conocerlo completo, está disponible en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Para quienes disfrutan de tener actividades listas para imprimir ${e[0]}

${obtenerNombre(p)} está preparado para ${obtenerPublico(p)} y puede acompañar momentos de ${beneficioAleatorio(p).toLowerCase()}.

Todo en formato ${p.formato || "PDF"} ${e[1]}

Pueden encontrar más información en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Hoy les presentamos una propuesta para disfrutar directamente en papel ${e[0]}

${obtenerNombre(p)} ofrece ${descripcionCantidad(p)} pensadas para ${obtenerPublico(p)}.

Además, incluye ${incluyeAleatorio(p)} ${e[1]}

Todos los detalles están disponibles en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Una opción práctica para quienes disfrutan de los juegos imprimibles ${e[0]}

Con ${obtenerNombre(p)} puedes elegir entre ${descripcionCantidad(p)} y utilizarlas cuando quieras.

El producto incluye ${incluyeAleatorio(p)} ${e[1]}

Puedes conocerlo completo en nuestra tienda ${e[2]}`,
];

// =========================================================
// FACEBOOK - BENEFICIOS
// =========================================================

const facebookBeneficios = [
  (p, e) =>
    `Los juegos imprimibles pueden ser una alternativa sencilla para cambiar de actividad ${e[0]} Con ${obtenerNombre(p)}, uno de los beneficios destacados es ${beneficioAleatorio(p).toLowerCase()} ${e[1]} Una propuesta para disfrutar en papel ${e[2]}`,

  (p, e) =>
    `No todas las actividades necesitan una pantalla ${e[0]} Los juegos imprimibles permiten tener una propuesta preparada para diferentes momentos y, en este caso, trabajar ${beneficioAleatorio(p).toLowerCase()} ${e[1]} Papel, actividad y un nuevo desafío ${e[2]}`,

  (p, e) =>
    `Una actividad sencilla también puede ofrecer diferentes beneficios ${e[0]} ${obtenerNombre(p)} puede acompañar momentos de ${beneficioAleatorio(p).toLowerCase()} mientras se disfruta de un juego imprimible ${e[1]} Una forma diferente de pasar el tiempo ${e[2]}`,

  (p, e) =>
    `Los imprimibles tienen una ventaja muy práctica ${e[0]} Puedes conservar el archivo y elegir qué actividad utilizar según el momento ${e[1]} Además, permiten disfrutar de propuestas relacionadas con ${beneficioAleatorio(p).toLowerCase()} ${e[2]}`,

  (p, e) =>
    `A veces solo necesitas papel, lápiz y una actividad interesante ${e[0]} ${obtenerNombre(p)} propone momentos para disfrutar y trabajar ${beneficioAleatorio(p).toLowerCase()} ${e[1]} Una alternativa sencilla para cambiar de rutina ${e[2]}`,
];

// =========================================================
// FACEBOOK - VENTA
// =========================================================

const facebookVenta = [
  (p, e) =>
    `${obtenerNombre(p)} está disponible en nuestra tienda ${e[0]}

Incluye ${incluyeAleatorio(p)} y está pensado para ${obtenerPublico(p)}.

Recibes el producto en formato ${p.formato || "PDF"} para utilizarlo como actividad imprimible ${e[1]}

Conoce todos los detalles y accede al producto desde nuestra tienda ${e[2]}`,

  (p, e) =>
    `¿Quieres tener nuevas actividades listas para imprimir? ${e[0]}

${obtenerNombre(p)} reúne ${descripcionCantidad(p)} para ${obtenerPublico(p)}.

Además, incluye ${incluyeAleatorio(p)} ${e[1]}

Puedes encontrar el producto completo en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Una colección digital para imprimir cuando quieras ${e[0]}

Con ${obtenerNombre(p)} recibes ${incluyeAleatorio(p)} en formato ${p.formato || "PDF"}.

Una propuesta pensada para disfrutar de ${beneficioAleatorio(p).toLowerCase()} ${e[1]}

Descubre el producto en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Si buscas una nueva actividad imprimible, esta puede ser una opción ${e[0]}

${obtenerNombre(p)} contiene ${descripcionCantidad(p)} y está pensado para ${obtenerPublico(p)}.

Puedes conservar el archivo y utilizar las actividades cuando quieras ${e[1]}

Conoce todos los detalles en nuestra tienda ${e[2]}`,

  (p, e) =>
    `Imprime y comienza cuando quieras ${e[0]}

${obtenerNombre(p)} está disponible en formato ${p.formato || "PDF"} e incluye ${incluyeAleatorio(p)}.

Una forma sencilla de tener nuevas actividades disponibles ${e[1]}

Encuentra el producto en nuestra tienda ${e[2]}`,
];

// =========================================================
// FACEBOOK - GENERADOR
// =========================================================

function generarFacebook(
  producto,
  imagenes
) {
  const e1 =
    emojis("interaccion");

  const e2 =
    emojis("producto");

  const e3 =
    emojis("tip");

  const e4 =
    emojis("encuesta");

  const e5 =
    emojis("beneficio");

  const e6 =
    emojis("venta");

  const opcionesEncuesta = elegir([
    [
      "Actividades tranquilas",
      "Desafíos",
    ],
    [
      "Con tiempo",
      "Contra reloj",
    ],
    [
      "Juegos de palabras",
      "Juegos de lógica",
    ],
    [
      "Individual",
      "En familia",
    ],
    [
      "Fácil",
      "Difícil",
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
        e1
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
        e2
      ),
      cta:
        "Ver producto en la tienda",
      imagen:
        imagenPorIndice(
          imagenes,
          0
        ),
    }),

    crearPublicacion({
      producto,
      tipo: "tip",
      formato: "texto",
      texto: elegir(
        facebookTips
      )(
        producto,
        e3
      ),
    }),

    crearPublicacion({
      producto,
      tipo: "encuesta",
      formato: "encuesta",
      texto:
        `Hagamos una pequeña encuesta ${e4[0]} Si tuvieras que elegir solamente una opción para hoy, ¿cuál sería? ${e4[1]} Deja tu elección en los comentarios ${e4[2]}`,
      encuesta: {
        pregunta:
          "¿Qué opción elegirías?",
        opciones:
          opcionesEncuesta,
      },
    }),

    crearPublicacion({
      producto,
      tipo: "beneficio",
      formato:
        imagenes.length
          ? "imagen"
          : "texto",
      texto: elegir(
        facebookBeneficios
      )(
        producto,
        e5
      ),
      imagen:
        imagenPorIndice(
          imagenes,
          1
        ),
    }),

    crearPublicacion({
      producto,
      tipo: "venta",
      formato: "imagen",
      texto: elegir(
        facebookVenta
      )(
        producto,
        e6
      ),
      cta:
        "Ver producto en la tienda",
      imagen:
        imagenPorIndice(
          imagenes,
          2
        ),
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
