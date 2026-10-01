import crypto from "crypto";
import OpenAI from "openai";
import { conectarMongoDB } from "../lib/mongodb.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const THREADS_APP_ID =
  process.env.THREADS_APP_ID;

const THREADS_APP_SECRET =
  process.env.THREADS_APP_SECRET;

const URL_BASE =
  "https://andreshousesitter.com";

const THREADS_REDIRECT_URI =
  `${URL_BASE}/api/contenido-redes?accion=threads-callback`;

const THREADS_API =
  "https://graph.threads.net";

// =========================================================
// AUTENTICACIÓN ADMIN
// =========================================================

const obtenerCookies = (req) => {
  const cookies = {};
  const header = req.headers.cookie || "";

  header.split(";").forEach((cookie) => {
    const [nombre, ...valor] =
      cookie.trim().split("=");

    if (nombre) {
      cookies[nombre] =
        decodeURIComponent(valor.join("="));
    }
  });

  return cookies;
};

const adminAutorizado = (req) => {
  const adminPassword =
    process.env.ADMIN_PASSWORD;

  if (!adminPassword) return false;

  const tokenEsperado = crypto
    .createHmac("sha256", adminPassword)
    .update("andres-imprimibles-admin")
    .digest("hex");

  const cookies = obtenerCookies(req);
  const token = cookies.admin_token;

  if (!token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(tokenEsperado);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

// =========================================================
// THREADS - CONFIGURACIÓN
// =========================================================

function verificarConfiguracionThreads() {
  if (!THREADS_APP_ID || !THREADS_APP_SECRET) {
    throw new Error(
      "Faltan THREADS_APP_ID o THREADS_APP_SECRET"
    );
  }
}

// =========================================================
// THREADS - INICIAR CONEXIÓN
// =========================================================

async function conectarThreads(req, res) {
  verificarConfiguracionThreads();

  const parametros = new URLSearchParams({
    client_id: THREADS_APP_ID,
    redirect_uri: THREADS_REDIRECT_URI,
    scope:
      "threads_basic,threads_content_publish",
    response_type: "code",
  });

  const urlAutorizacion =
    `https://threads.net/oauth/authorize?${parametros.toString()}`;

  return res.redirect(urlAutorizacion);
}

// =========================================================
// THREADS - CALLBACK OAUTH
// =========================================================

async function callbackThreads(req, res) {
  verificarConfiguracionThreads();

  const {
    code,
    error,
    error_description,
  } = req.query;

  if (error) {
    return res.status(400).json({
      ok: false,
      error,
      detalle:
        error_description || null,
    });
  }

  if (!code) {
    return res.status(400).json({
      ok: false,
      error:
        "Threads no devolvió el código de autorización.",
    });
  }

  // -------------------------------------------------------
  // Código OAuth -> token de corta duración
  // -------------------------------------------------------

  const parametrosToken =
    new URLSearchParams({
      client_id: THREADS_APP_ID,
      client_secret:
        THREADS_APP_SECRET,
      grant_type:
        "authorization_code",
      redirect_uri:
        THREADS_REDIRECT_URI,
      code,
    });

  const respuestaToken = await fetch(
    `${THREADS_API}/oauth/access_token`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: parametrosToken.toString(),
    }
  );

  const tokenCorto =
    await respuestaToken.json();

  if (
    !respuestaToken.ok ||
    !tokenCorto.access_token
  ) {
    console.error(
      "Error obteniendo token corto de Threads:",
      tokenCorto
    );

    return res.status(500).json({
      ok: false,
      error:
        "No se pudo obtener el token de Threads.",
    });
  }

  // -------------------------------------------------------
  // Token corto -> token de larga duración
  // -------------------------------------------------------

  const parametrosLargo =
    new URLSearchParams({
      grant_type:
        "th_exchange_token",
      client_secret:
        THREADS_APP_SECRET,
      access_token:
        tokenCorto.access_token,
    });

  const respuestaLargo = await fetch(
    `${THREADS_API}/access_token?${parametrosLargo.toString()}`
  );

  const tokenLargo =
    await respuestaLargo.json();

  if (
    !respuestaLargo.ok ||
    !tokenLargo.access_token
  ) {
    console.error(
      "Error obteniendo token largo de Threads:",
      tokenLargo
    );

    return res.status(500).json({
      ok: false,
      error:
        "No se pudo obtener el token de larga duración.",
    });
  }

  // -------------------------------------------------------
  // Guardar conexión en MongoDB
  // -------------------------------------------------------

  const db =
    await conectarMongoDB();

  const ahora = new Date();

  const segundosExpiracion =
    Number(tokenLargo.expires_in) ||
    5184000;

  const expiraEn = new Date(
    ahora.getTime() +
      segundosExpiracion * 1000
  );

  await db
    .collection("integraciones")
    .updateOne(
      {
        proveedor: "threads",
      },
      {
        $set: {
          proveedor: "threads",

          userId: String(
            tokenCorto.user_id || ""
          ),

          accessToken:
            tokenLargo.access_token,

          tokenType:
            tokenLargo.token_type ||
            "bearer",

          conectado: true,

          permisos: [
            "threads_basic",
            "threads_content_publish",
          ],

          expiraEn,
          actualizadoEn: ahora,
        },

        $setOnInsert: {
          creadoEn: ahora,
        },
      },
      {
        upsert: true,
      }
    );

  return res.redirect(
    "/admin/redes?threads=conectado"
  );
}

// =========================================================
// THREADS - PUBLICAR TEXTO
// =========================================================

async function publicarThreads(req, res) {
  const texto =
    typeof req.body?.texto === "string"
      ? req.body.texto.trim()
      : "";

  const productoId =
    typeof req.body?.productoId === "string"
      ? req.body.productoId.trim()
      : "";

  if (!texto) {
    return res.status(400).json({
      ok: false,
      error:
        "Falta el texto de la publicación.",
    });
  }

  const db =
    await conectarMongoDB();

  const integracion = await db
    .collection("integraciones")
    .findOne({
      proveedor: "threads",
      conectado: true,
    });

  if (
    !integracion?.accessToken ||
    !integracion?.userId
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "Threads no está conectado.",
    });
  }

  const accessToken =
    integracion.accessToken;

  // -------------------------------------------------------
  // 1. Crear contenedor de texto
  // -------------------------------------------------------

  const parametrosContenedor =
    new URLSearchParams({
      media_type: "TEXT",
      text: texto,
      access_token: accessToken,
    });

  const respuestaContenedor =
    await fetch(
      `${THREADS_API}/me/threads`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          parametrosContenedor.toString(),
      }
    );

  const contenedor =
    await respuestaContenedor.json();

  if (
    !respuestaContenedor.ok ||
    !contenedor?.id
  ) {
    console.error(
      "Error creando publicación de Threads:",
      contenedor
    );

    return res.status(502).json({
      ok: false,
      error:
        "Threads no pudo crear la publicación.",
      detalle:
        contenedor?.error?.message ||
        null,
    });
  }

  // -------------------------------------------------------
  // 2. Publicar contenedor
  // -------------------------------------------------------

  const parametrosPublicacion =
    new URLSearchParams({
      creation_id: contenedor.id,
      access_token: accessToken,
    });

  const respuestaPublicacion =
    await fetch(
      `${THREADS_API}/me/threads_publish`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/x-www-form-urlencoded",
        },
        body:
          parametrosPublicacion.toString(),
      }
    );

  const publicacion =
    await respuestaPublicacion.json();

  if (
    !respuestaPublicacion.ok ||
    !publicacion?.id
  ) {
    console.error(
      "Error publicando en Threads:",
      publicacion
    );

    return res.status(502).json({
      ok: false,
      error:
        "Threads creó el contenido pero no pudo publicarlo.",
      detalle:
        publicacion?.error?.message ||
        null,
    });
  }

  // -------------------------------------------------------
  // 3. Registrar publicación
  // -------------------------------------------------------

  await db
    .collection("publicaciones_redes")
    .insertOne({
      proveedor: "threads",

      productoId:
        productoId || null,

      publicacionId: String(
        publicacion.id
      ),

      texto,

      estado: "publicado",

      publicadoEn: new Date(),

      creadoEn: new Date(),
    });

  return res.status(200).json({
    ok: true,
    proveedor: "threads",
    publicacionId: String(
      publicacion.id
    ),
    mensaje:
      "Publicación realizada correctamente en Threads.",
  });
}

// =========================================================
// BORRADORES DE CONTENIDO
// =========================================================

async function guardarBorrador(
  req,
  res
) {
  const productoId =
    typeof req.body?.productoId === "string"
      ? req.body.productoId.trim()
      : "";

  const nombreProducto =
    typeof req.body?.nombreProducto === "string"
      ? req.body.nombreProducto.trim()
      : "";

  const contenido =
    req.body?.contenido;

  if (!productoId) {
    return res.status(400).json({
      ok: false,
      error:
        "Falta el identificador del producto.",
    });
  }

  if (!nombreProducto) {
    return res.status(400).json({
      ok: false,
      error:
        "Falta el nombre del producto.",
    });
  }

  if (
    !contenido ||
    typeof contenido !== "object" ||
    Array.isArray(contenido)
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "El contenido del borrador no es válido.",
    });
  }

  const db =
    await conectarMongoDB();

  const ahora =
    new Date();

  await db
    .collection("contenido_redes")
    .updateOne(
      {
        productoId,
        estado: "borrador",
      },
      {
        $set: {
          productoId,
          nombreProducto,
          contenido,
          estado: "borrador",
          actualizadoEn: ahora,
        },

        $setOnInsert: {
          creadoEn: ahora,
          aprobadoEn: null,
        },
      },
      {
        upsert: true,
      }
    );

  const borrador = await db
    .collection("contenido_redes")
    .findOne({
      productoId,
      estado: "borrador",
    });

  return res.status(200).json({
    ok: true,
    mensaje:
      "Borrador guardado correctamente.",
    borrador,
  });
}

// =========================================================
// LISTAR BORRADORES
// =========================================================

async function listarBorradores(
  req,
  res
) {
  const db =
    await conectarMongoDB();

  const borradores = await db
    .collection("contenido_redes")
    .find({
      estado: "borrador",
    })
    .sort({
      actualizadoEn: -1,
    })
    .toArray();

  return res.status(200).json({
    ok: true,
    borradores,
  });
}

// =========================================================
// APROBAR BORRADOR
// =========================================================

async function aprobarBorrador(req, res) {
  const productoId =
    typeof req.body?.productoId === "string"
      ? req.body.productoId.trim()
      : "";

  if (!productoId) {
    return res.status(400).json({
      ok: false,
      error:
        "Falta el identificador del producto.",
    });
  }

  const db =
    await conectarMongoDB();

  const ahora = new Date();

  const resultado = await db
    .collection("contenido_redes")
    .updateOne(
      {
        productoId,
        estado: "borrador",
      },
      {
        $set: {
          estado: "aprobado",
          aprobadoEn: ahora,
          actualizadoEn: ahora,
        },
      }
    );

  if (resultado.matchedCount === 0) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró un borrador para aprobar.",
    });
  }

  return res.status(200).json({
    ok: true,
    mensaje:
      "Contenido aprobado correctamente.",
  });
}

// =========================================================
// LISTAR CONTENIDOS APROBADOS
// =========================================================

async function listarAprobados(
  req,
  res
) {
  const db =
    await conectarMongoDB();

  const aprobados = await db
    .collection("contenido_redes")
    .find({
      estado: "aprobado",
    })
    .sort({
      aprobadoEn: -1,
    })
    .toArray();

  return res.status(200).json({
    ok: true,
    aprobados,
  });
}

// =========================================================
// CALENDARIO DE REDES
// =========================================================

const crearCalendarioInicial = (contenido) => {
  const dias = [
    {
      fecha: "2026-10-01",
      dia: "Jueves",
    },
    {
      fecha: "2026-10-02",
      dia: "Viernes",
    },
    {
      fecha: "2026-10-03",
      dia: "Sábado",
    },
  ];

  const calendario = [];

  const agregar = (
    d,
    hora,
    red,
    tipo,
    indice,
    publicacion
  ) => {
    if (!publicacion) return;

    calendario.push({
      fecha: dias[d].fecha,
      dia: dias[d].dia,
      hora,
      red,
      tipo,
      indice,
      publicacion,
      estado: "programado",
    });
  };

  // -------------------------------------------------------
  // INSTAGRAM
  // Jueves: Stories 1/2 + Carrusel
  // Viernes: Stories 3/4 + Reel
  // Sábado: Stories 5/6
  // -------------------------------------------------------

  agregar(
    0,
    "10:00",
    "instagram",
    "story",
    0,
    contenido?.instagram?.stories?.[0]
  );

  agregar(
    0,
    "12:00",
    "instagram",
    "carrusel",
    0,
    contenido?.instagram?.carrusel
  );

  agregar(
    0,
    "20:00",
    "instagram",
    "story",
    1,
    contenido?.instagram?.stories?.[1]
  );

  agregar(
    1,
    "10:00",
    "instagram",
    "story",
    2,
    contenido?.instagram?.stories?.[2]
  );

  agregar(
    1,
    "18:00",
    "instagram",
    "reel",
    0,
    contenido?.instagram?.reel
  );

  agregar(
    1,
    "20:00",
    "instagram",
    "story",
    3,
    contenido?.instagram?.stories?.[3]
  );

  agregar(
    2,
    "10:00",
    "instagram",
    "story",
    4,
    contenido?.instagram?.stories?.[4]
  );

  agregar(
    2,
    "20:00",
    "instagram",
    "story",
    5,
    contenido?.instagram?.stories?.[5]
  );

  // -------------------------------------------------------
  // THREADS
  // 2 publicaciones por día
  // -------------------------------------------------------

  for (
    let i = 0;
    i < 6;
    i += 1
  ) {
    agregar(
      Math.floor(i / 2),
      i % 2 === 0
        ? "11:00"
        : "19:00",
      "threads",
      "publicacion",
      i,
      contenido?.threads?.[i]
    );

    // -----------------------------------------------------
    // FACEBOOK
    // 2 publicaciones por día
    // -----------------------------------------------------

    agregar(
      Math.floor(i / 2),
      i % 2 === 0
        ? "17:00"
        : "21:00",
      "facebook",
      "publicacion",
      i,
      contenido?.facebook
        ?.publicaciones?.[i]
    );
  }

  return calendario;
};

// =========================================================
// PROGRAMAR CONTENIDO APROBADO
// =========================================================

async function programarContenido(
  req,
  res
) {
  const productoId =
    typeof req.body?.productoId === "string"
      ? req.body.productoId.trim()
      : "";

  if (!productoId) {
    return res.status(400).json({
      ok: false,
      error:
        "Falta el identificador del producto.",
    });
  }

  const db =
    await conectarMongoDB();

  const aprobado = await db
    .collection("contenido_redes")
    .findOne({
      productoId,
      estado: "aprobado",
    });

  if (!aprobado) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró contenido aprobado para este producto.",
    });
  }

  const ahora = new Date();

  const calendario =
    crearCalendarioInicial(
      aprobado.contenido
    );

  await db
    .collection("contenido_redes")
    .updateOne(
      {
        _id: aprobado._id,
      },
      {
        $set: {
          estado: "programado",
          calendario,
          programadoEn: ahora,
          actualizadoEn: ahora,
        },
      }
    );

  return res.status(200).json({
    ok: true,
    mensaje:
      "Contenido incorporado al calendario.",
    calendario,
  });
}

// =========================================================
// LISTAR CONTENIDO PROGRAMADO
// =========================================================

async function listarProgramados(
  req,
  res
) {
  const db =
    await conectarMongoDB();

  const programados = await db
    .collection("contenido_redes")
    .find({
      estado: "programado",
    })
    .sort({
      programadoEn: -1,
    })
    .toArray();

  return res.status(200).json({
    ok: true,
    programados,
  });
}

// =========================================================
// OPENAI - GENERAR CONTENIDO
// =========================================================

async function generarContenido(req, res) {
  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Falta el prompt",
      });
    }

    const respuesta =
      await openai.responses.create({
        model: "gpt-5.6-luna",
        input: prompt,
      });

    const texto =
      respuesta.output_text;

    let contenido;

    try {
      contenido =
        JSON.parse(texto);
    } catch (errorJson) {
      console.error(
        "JSON inválido recibido:",
        texto
      );

      return res.status(500).json({
        error:
          "La IA no devolvió JSON válido",
        respuesta: texto,
      });
    }

    return res.status(200).json({
      ok: true,
      contenido,
    });
  } catch (error) {
    console.error(
      "Error generando contenido:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "No se pudo generar el contenido",
      tipo:
        error?.name || "Error",
      status:
        error?.status || null,
    });
  }
}

// =========================================================
// HANDLER
// =========================================================

export default async function handler(
  req,
  res
) {
  try {
    const { accion } = req.query;

    // -----------------------------------------------------
    // CALLBACK DE THREADS
    // Debe permanecer accesible para Meta.
    // -----------------------------------------------------

    if (
      req.method === "GET" &&
      accion === "threads-callback"
    ) {
      return callbackThreads(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // CONEXIÓN DE THREADS
    // Solo administrador.
    // -----------------------------------------------------

    if (
      req.method === "GET" &&
      accion === "threads-conectar"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return conectarThreads(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // PUBLICAR EN THREADS
    // Solo administrador.
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "threads-publicar"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return publicarThreads(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // GUARDAR BORRADOR
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "guardar-borrador"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return guardarBorrador(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // LISTAR BORRADORES
    // -----------------------------------------------------

    if (
      req.method === "GET" &&
      accion === "listar-borradores"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return listarBorradores(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // APROBAR BORRADOR
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "aprobar-borrador"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return aprobarBorrador(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // LISTAR APROBADOS
    // -----------------------------------------------------

    if (
      req.method === "GET" &&
      accion === "listar-aprobados"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return listarAprobados(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // PROGRAMAR CONTENIDO APROBADO
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "programar-contenido"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return programarContenido(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // LISTAR CONTENIDO PROGRAMADO
    // -----------------------------------------------------

    if (
      req.method === "GET" &&
      accion === "listar-programados"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return listarProgramados(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // GENERACIÓN DE CONTENIDO
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      !accion
    ) {
      return generarContenido(
        req,
        res
      );
    }

    return res.status(405).json({
      ok: false,
      error:
        "Método o acción no permitidos.",
    });
  } catch (error) {
    console.error(
      "Error API contenido-redes:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Error interno del servidor.",
    });
  }
}