import { conectarMongoDB } from "../lib/mongodb.js";

const THREADS_APP_ID = process.env.THREADS_APP_ID;
const THREADS_APP_SECRET =
  process.env.THREADS_APP_SECRET;

const URL_BASE = "https://andreshousesitter.com";

const THREADS_REDIRECT_URI =
  `${URL_BASE}/api/meta?accion=threads-callback`;

const THREADS_API =
  "https://graph.threads.net";

function verificarConfiguracionThreads() {
  if (!THREADS_APP_ID || !THREADS_APP_SECRET) {
    throw new Error(
      "Faltan THREADS_APP_ID o THREADS_APP_SECRET"
    );
  }
}

async function conectarThreads(req, res) {
  verificarConfiguracionThreads();

  const parametros = new URLSearchParams({
    client_id: THREADS_APP_ID,
    redirect_uri: THREADS_REDIRECT_URI,
    scope:
      "threads_basic,threads_content_publish",
    response_type: "code",
  });

  const url =
    `https://threads.net/oauth/authorize?${parametros.toString()}`;

  return res.redirect(url);
}

async function callbackThreads(req, res) {
  verificarConfiguracionThreads();

  const { code, error, error_description } =
    req.query;

  if (error) {
    return res.status(400).json({
      ok: false,
      error,
      detalle: error_description || null,
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
  // 1. Código OAuth -> token de corta duración
  // -------------------------------------------------------

  const parametrosToken = new URLSearchParams({
    client_id: THREADS_APP_ID,
    client_secret: THREADS_APP_SECRET,
    grant_type: "authorization_code",
    redirect_uri: THREADS_REDIRECT_URI,
    code,
  });

  const respuestaToken = await fetch(
    `${THREADS_API}/oauth/access_token?${parametrosToken.toString()}`,
    {
      method: "POST",
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
  // 2. Token corto -> token de larga duración
  // -------------------------------------------------------

  const parametrosLargo = new URLSearchParams({
    grant_type: "th_exchange_token",
    client_secret: THREADS_APP_SECRET,
    access_token: tokenCorto.access_token,
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
  // 3. Guardar integración en MongoDB
  // -------------------------------------------------------

  const db = await conectarMongoDB();

  const ahora = new Date();

  const segundosExpiracion =
    Number(tokenLargo.expires_in) || 5184000;

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

          userId:
            String(tokenCorto.user_id || ""),

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
  // 4. Confirmación
  // -------------------------------------------------------

  return res.redirect(
    "/admin/redes?threads=conectado"
  );
}

export default async function handler(
  req,
  res
) {
  try {
    const { accion } = req.query;

    if (accion === "threads-conectar") {
      return conectarThreads(req, res);
    }

    if (accion === "threads-callback") {
      return callbackThreads(req, res);
    }

    return res.status(400).json({
      ok: false,
      error: "Acción no válida.",
    });
  } catch (error) {
    console.error(
      "Error API Meta:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        error?.message ||
        "Error interno en la integración con Meta.",
    });
  }
}