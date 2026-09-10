/* =========================================================
   PERSONAJES
========================================================= */

export const PERSONAJES_LABERINTOS = {
  toby: {
    nombre: "Toby",

    imagen:
      "https://i.postimg.cc/fTwWBqBM/file-000000000204820e8213b33f08a90324.png",

    emoji: "🐶",

    color:
      "#0F7490",

    decoracion:
      "🐾",
  },

  luna: {
    nombre: "Luna",

    imagen:
      "https://i.postimg.cc/7hPvMdwk/file-00000000e68c820ead57a74bfc91b08f.png",

    emoji: "🐱",

    color:
      "#DB5685",

    decoracion:
      "🐾",
  },

  /* =======================================================
     PERSONAJES FUTUROS

     Podemos agregar nuevos personajes acá sin modificar
     LaminaLaberinto.jsx.

     Ejemplo:

     leo: {
       nombre: "Leo",
       imagen: "",
       emoji: "🦁",
       color: "#D97706",
       decoracion: "🐾",
     },
  ======================================================== */
};

/* =========================================================
   OBJETOS Y EMOJIS
========================================================= */

export const OBJETOS_LABERINTOS = {
  /* =======================================================
     MASCOTAS
  ======================================================== */

  pelota: {
    emoji: "🏀",
    imagen: "",
  },

  ovillo: {
    emoji: "🧶",
    imagen: "",
  },

  hueso: {
    emoji: "🦴",
    imagen: "",
  },

  comida: {
    emoji: "🥣",
    imagen: "",
  },

  frisbee: {
    emoji: "🥏",
    imagen: "",
  },

  pescado: {
    emoji: "🐟",
    imagen: "",
  },

  /* =======================================================
     PLAYA Y OCÉANO
  ======================================================== */

  sombrilla: {
    emoji: "⛱️",
    imagen: "",
  },

  caracola: {
    emoji: "🐚",
    imagen: "",
  },

  coral: {
    emoji: "🪸",
    imagen: "",
  },

  isla: {
    emoji: "🏝️",
    imagen: "",
  },

  barco: {
    emoji: "⛵",
    imagen: "",
  },

  salvavidas: {
    emoji: "🛟",
    imagen: "",
  },

  ancla: {
    emoji: "⚓",
    imagen: "",
  },

  /* =======================================================
     ESPACIO
  ======================================================== */

  cohete: {
    emoji: "🚀",
    imagen: "",
  },

  planeta: {
    emoji: "🪐",
    imagen: "",
  },

  estrella: {
    emoji: "⭐",
    imagen: "",
  },

  satelite: {
    emoji: "🛰️",
    imagen: "",
  },

  meteorito: {
    emoji: "☄️",
    imagen: "",
  },

  /* =======================================================
     MONTAÑA Y NATURALEZA
  ======================================================== */

  montana: {
    emoji: "🏔️",
    imagen: "",
  },

  bosque: {
    emoji: "🌲",
    imagen: "",
  },

  tiendaCampana: {
    emoji: "⛺",
    imagen: "",
  },

  mochila: {
    emoji: "🎒",
    imagen: "",
  },

  brujula: {
    emoji: "🧭",
    imagen: "",
  },

  fogata: {
    emoji: "🔥",
    imagen: "",
  },

  /* =======================================================
     PIRATAS
  ======================================================== */

  tesoro: {
    emoji: "💰",
    imagen: "",
  },

  cofre: {
    emoji: "🧰",
    imagen: "",
  },

  mapa: {
    emoji: "🗺️",
    imagen: "",
  },

  /* =======================================================
     CASTILLOS
  ======================================================== */

  castillo: {
    emoji: "🏰",
    imagen: "",
  },

  corona: {
    emoji: "👑",
    imagen: "",
  },

  llave: {
    emoji: "🗝️",
    imagen: "",
  },

  /* =======================================================
     DINOSAURIOS
  ======================================================== */

  huevoDinosaurio: {
    emoji: "🥚",
    imagen: "",
  },

  /* =======================================================
     VIAJES
  ======================================================== */

  avion: {
    emoji: "✈️",
    imagen: "",
  },

  auto: {
    emoji: "🚗",
    imagen: "",
  },

  tren: {
    emoji: "🚂",
    imagen: "",
  },

  autobus: {
    emoji: "🚌",
    imagen: "",
  },

  valija: {
    emoji: "🧳",
    imagen: "",
  },

  /* =======================================================
     CELEBRACIONES
  ======================================================== */

  arbolNavidad: {
    emoji: "🎄",
    imagen: "",
  },

  regalo: {
    emoji: "🎁",
    imagen: "",
  },

  calabaza: {
    emoji: "🎃",
    imagen: "",
  },

  fantasma: {
    emoji: "👻",
    imagen: "",
  },

  corazon: {
    emoji: "❤️",
    imagen: "",
  },

  flores: {
    emoji: "💐",
    imagen: "",
  },
};

/* =========================================================
   COMPATIBILIDAD CON LAMINA LABERINTO

   Conservamos este objeto porque LaminaLaberinto.jsx
   actualmente utiliza:

   IMAGENES_LABERINTOS.personajes
   IMAGENES_LABERINTOS.objetos
========================================================= */

export const IMAGENES_LABERINTOS = {
  personajes:
    Object.fromEntries(
      Object.entries(
        PERSONAJES_LABERINTOS
      ).map(
        ([id, personaje]) => [
          id,
          personaje.imagen || "",
        ]
      )
    ),

  objetos:
    Object.fromEntries(
      Object.entries(
        OBJETOS_LABERINTOS
      ).map(
        ([id, objeto]) => [
          id,
          objeto.imagen || "",
        ]
      )
    ),
};

/* =========================================================
   TEMÁTICAS
========================================================= */

export const TEMATICAS_LABERINTOS = {
  mascotas: {
    nombre:
      "Mascotas",

    decoracion:
      "🐾",
  },

  oceano: {
    nombre:
      "Océano",

    decoracion:
      "🫧",
  },

  espacio: {
    nombre:
      "Espacio",

    decoracion:
      "⭐",
  },

  montana: {
    nombre:
      "Montaña",

    decoracion:
      "🌲",
  },

  piratas: {
    nombre:
      "Piratas",

    decoracion:
      "☠️",
  },

  castillos: {
    nombre:
      "Castillos",

    decoracion:
      "✨",
  },

  dinosaurios: {
    nombre:
      "Dinosaurios",

    decoracion:
      "🦖",
  },

  viajes: {
    nombre:
      "Viajes",

    decoracion:
      "🧭",
  },

  navidad: {
    nombre:
      "Navidad",

    decoracion:
      "❄️",
  },

  halloween: {
    nombre:
      "Halloween",

    decoracion:
      "🎃",
  },

  familia: {
    nombre:
      "Familia",

    decoracion:
      "❤️",
  },
};

/* =========================================================
   AVENTURAS

   Por ahora mantenemos las seis aventuras originales.

   Ya agregamos:
   - tema
   - nombrePersonaje
   - emojiPersonaje
   - colorPersonaje
   - decoracion
   - emojiObjeto

   Esto prepara el sistema para nuevos productos.
========================================================= */

export const AVENTURAS_LABERINTOS = [
  {
    tema:
      "mascotas",

    personaje:
      "toby",

    nombrePersonaje:
      PERSONAJES_LABERINTOS.toby.nombre,

    emojiPersonaje:
      PERSONAJES_LABERINTOS.toby.emoji,

    colorPersonaje:
      PERSONAJES_LABERINTOS.toby.color,

    decoracion:
      PERSONAJES_LABERINTOS.toby.decoracion,

    objeto:
      "pelota",

    emojiObjeto:
      OBJETOS_LABERINTOS.pelota.emoji,

    titulo:
      "¡Toby busca su pelota!",

    instrucciones:
      "Ayudá a Toby a encontrar el camino hasta su pelota.",
  },

  {
    tema:
      "mascotas",

    personaje:
      "luna",

    nombrePersonaje:
      PERSONAJES_LABERINTOS.luna.nombre,

    emojiPersonaje:
      PERSONAJES_LABERINTOS.luna.emoji,

    colorPersonaje:
      PERSONAJES_LABERINTOS.luna.color,

    decoracion:
      PERSONAJES_LABERINTOS.luna.decoracion,

    objeto:
      "ovillo",

    emojiObjeto:
      OBJETOS_LABERINTOS.ovillo.emoji,

    titulo:
      "¡Luna busca su ovillo!",

    instrucciones:
      "Luna perdió su ovillo. ¿Podés ayudarla a encontrarlo?",
  },

  {
    tema:
      "mascotas",

    personaje:
      "toby",

    nombrePersonaje:
      PERSONAJES_LABERINTOS.toby.nombre,

    emojiPersonaje:
      PERSONAJES_LABERINTOS.toby.emoji,

    colorPersonaje:
      PERSONAJES_LABERINTOS.toby.color,

    decoracion:
      PERSONAJES_LABERINTOS.toby.decoracion,

    objeto:
      "hueso",

    emojiObjeto:
      OBJETOS_LABERINTOS.hueso.emoji,

    titulo:
      "¡Toby quiere su hueso!",

    instrucciones:
      "Encontrá el camino correcto para que Toby llegue hasta su hueso.",
  },

  {
    tema:
      "mascotas",

    personaje:
      "luna",

    nombrePersonaje:
      PERSONAJES_LABERINTOS.luna.nombre,

    emojiPersonaje:
      PERSONAJES_LABERINTOS.luna.emoji,

    colorPersonaje:
      PERSONAJES_LABERINTOS.luna.color,

    decoracion:
      PERSONAJES_LABERINTOS.luna.decoracion,

    objeto:
      "comida",

    emojiObjeto:
      OBJETOS_LABERINTOS.comida.emoji,

    titulo:
      "¡Luna tiene hambre!",

    instrucciones:
      "Ayudá a Luna a encontrar el camino hasta su comida.",
  },

  {
    tema:
      "mascotas",

    personaje:
      "toby",

    nombrePersonaje:
      PERSONAJES_LABERINTOS.toby.nombre,

    emojiPersonaje:
      PERSONAJES_LABERINTOS.toby.emoji,

    colorPersonaje:
      PERSONAJES_LABERINTOS.toby.color,

    decoracion:
      PERSONAJES_LABERINTOS.toby.decoracion,

    objeto:
      "frisbee",

    emojiObjeto:
      OBJETOS_LABERINTOS.frisbee.emoji,

    titulo:
      "¡A buscar el frisbee!",

    instrucciones:
      "Toby quiere recuperar su frisbee. ¿Podés mostrarle el camino?",
  },

  {
    tema:
      "mascotas",

    personaje:
      "luna",

    nombrePersonaje:
      PERSONAJES_LABERINTOS.luna.nombre,

    emojiPersonaje:
      PERSONAJES_LABERINTOS.luna.emoji,

    colorPersonaje:
      PERSONAJES_LABERINTOS.luna.color,

    decoracion:
      PERSONAJES_LABERINTOS.luna.decoracion,

    objeto:
      "pescado",

    emojiObjeto:
      OBJETOS_LABERINTOS.pescado.emoji,

    titulo:
      "¡Luna busca su pescado!",

    instrucciones:
      "Encontrá el camino correcto para que Luna llegue hasta su pescado.",
  },
];

/* =========================================================
   OBTENER PERSONAJE
========================================================= */

export function obtenerPersonajeLaberinto(
  id
) {
  return (
    PERSONAJES_LABERINTOS[id] ||
    null
  );
}

/* =========================================================
   OBTENER OBJETO
========================================================= */

export function obtenerObjetoLaberinto(
  id
) {
  return (
    OBJETOS_LABERINTOS[id] ||
    null
  );
}

/* =========================================================
   OBTENER TEMÁTICA
========================================================= */

export function obtenerTematicaLaberinto(
  id
) {
  return (
    TEMATICAS_LABERINTOS[id] ||
    null
  );
}

/* =========================================================
   OBTENER AVENTURA
========================================================= */

/**
 * Devuelve una aventura según el índice.
 *
 * Cuando se supera la cantidad disponible,
 * vuelve a comenzar desde la primera.
 *
 * Esto permite generar 20, 50, 100
 * o más laberintos reutilizando aventuras.
 */
export function obtenerAventuraLaberinto(
  indice = 0
) {
  if (
    AVENTURAS_LABERINTOS.length === 0
  ) {
    return {
      tema:
        "mascotas",

      personaje:
        "toby",

      nombrePersonaje:
        "Toby",

      emojiPersonaje:
        "🐶",

      colorPersonaje:
        "#0F7490",

      decoracion:
        "🐾",

      objeto:
        "pelota",

      emojiObjeto:
        "🏀",

      titulo:
        "¡Encontrá el camino!",

      instrucciones:
        "Encontrá el camino correcto hasta la meta.",
    };
  }

  const indiceSeguro =
    Math.abs(
      Number.isFinite(indice)
        ? Math.floor(indice)
        : 0
    );

  return AVENTURAS_LABERINTOS[
    indiceSeguro %
      AVENTURAS_LABERINTOS.length
  ];
}