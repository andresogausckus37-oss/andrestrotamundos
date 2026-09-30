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
    // GENERACIÓN DE CONTENIDO
    // Conservamos el comportamiento actual.
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