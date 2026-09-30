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

  // -------------------------------------------------------
  // Volver al Admin
  // -------------------------------------------------------

  return res.redirect(
    "/admin/redes?threads=conectado"
  );
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

    // Threads
    if (
      req.method === "GET" &&
      accion === "threads-conectar"
    ) {
      return conectarThreads(
        req,
        res
      );
    }

    if (
      req.method === "GET" &&
      accion === "threads-callback"
    ) {
      return callbackThreads(
        req,
        res
      );
    }

    // Generación de contenido actual
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