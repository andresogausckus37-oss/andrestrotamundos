import crypto from "crypto";
import OpenAI from "openai";
import { conectarMongoDB } from "../lib/mongodb.js";

let openai = null;

function obtenerOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "Falta configurar OPENAI_API_KEY"
    );
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  return openai;
}

const THREADS_APP_ID =
  process.env.THREADS_APP_ID;

const THREADS_APP_SECRET =
  process.env.THREADS_APP_SECRET;

const URL_BASE =
  "https://andrestrotamundos.andresogausckus37.workers.dev";

const THREADS_REDIRECT_URI =
  `${URL_BASE}/api/contenido-redes?accion=threads-callback`;

const THREADS_API =
  "https://graph.threads.net";

const INSTAGRAM_ACCESS_TOKEN =
  process.env.INSTAGRAM_ACCESS_TOKEN;

const INSTAGRAM_API_VERSION = "v26.0";

const INSTAGRAM_API =
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

// =========================================================
// FACEBOOK - CONFIGURACIÓN
// =========================================================

let FACEBOOK_PAGE_ID = "";
let FACEBOOK_PAGE_ACCESS_TOKEN = "";

const FACEBOOK_API_VERSION = "v26.0";

const FACEBOOK_API =
  `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;


function verificarConfiguracionFacebook() {
  FACEBOOK_PAGE_ID = String(
    process.env.FACEBOOK_PAGE_ID || ""
  ).trim();

  FACEBOOK_PAGE_ACCESS_TOKEN = String(
    process.env.FACEBOOK_PAGE_ACCESS_TOKEN || ""
  ).trim();

  if (
    !FACEBOOK_PAGE_ID ||
    !FACEBOOK_PAGE_ACCESS_TOKEN
  ) {
    throw new Error(
      "Faltan FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN"
    );
  }
}


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
  const textoOriginal =
    typeof req.body?.texto === "string"
      ? req.body.texto.trim()
      : "";

  const imagenUrl =
  typeof req.body?.imagenUrl === "string"
    ? req.body.imagenUrl.trim()
    : "";

  const url = textoOriginal.match(/https?:\/\/[^\s]+/g)?.pop() || "";
  const cuerpo = url ? textoOriginal.replace(url, "").trim() : textoOriginal;
  const final = url ? `\n\n${url}` : "";

  // Para posts con imagen, conservar íntegros CTA, URL y hashtags.
  // La API Threads admite 500 caracteres como máximo.
  if (imagenUrl && !/^https:\/\//i.test(imagenUrl)) {
    return res.status(400).json({
      ok: false,
      error: "Threads Post requiere una imagen pública HTTPS.",
    });
  }
  if (imagenUrl && Array.from(textoOriginal).length > 500) {
    return res.status(400).json({
      ok: false,
      error: "Threads Post supera los 500 caracteres. Acortá el copy sin eliminar la URL ni los hashtags.",
    });
  }
  const texto = imagenUrl
    ? textoOriginal
    : Array.from(cuerpo)
        .slice(0, 500 - Array.from(final).length)
        .join("")
        .trimEnd() + final;

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

  const parametrosContenedor =
  new URLSearchParams({
    media_type: imagenUrl ? "IMAGE" : "TEXT",
    text: texto,
    ...(imagenUrl ? { image_url: imagenUrl } : {}),
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
// INSTAGRAM - PUBLICACIÓN
// =========================================================

function verificarConfiguracionInstagram() {
  if (!INSTAGRAM_ACCESS_TOKEN) {
    throw new Error(
      "Falta INSTAGRAM_ACCESS_TOKEN"
    );
  }
}

async function leerJsonSeguro(respuesta) {
  const texto = await respuesta.text();

  if (!texto) return {};

  try {
    return JSON.parse(texto);
  } catch {
    return {
      error: {
        message: texto,
      },
    };
  }
}

async function obtenerCuentaInstagram() {
  verificarConfiguracionInstagram();

  const parametros = new URLSearchParams({
    fields: "id,username",
    access_token: INSTAGRAM_ACCESS_TOKEN,
  });

  const respuesta = await fetch(
    `${INSTAGRAM_API}/me?${parametros.toString()}`
  );

  const datos = await leerJsonSeguro(
    respuesta
  );

  if (
    !respuesta.ok ||
    !datos?.id
  ) {
    console.error(
      "Error obteniendo cuenta de Instagram:",
            datos
    );

    throw new Error(
      datos?.error?.message ||
        "No se pudo verificar la cuenta de Instagram."
    );
  }

  return {
    id: String(datos.id),
    username:
      typeof datos.username === "string"
        ? datos.username
        : null,
  };
}

function normalizarUrlImagen(valor) {
  if (typeof valor !== "string") {
    return null;
  }

  const url = valor.trim();

  if (
    !url ||
    !/^https:\/\//i.test(url)
  ) {
    return null;
  }

  return url;
}

function extraerImagenesInstagram(
  publicacion
) {
  if (
    !publicacion ||
    typeof publicacion !== "object"
  ) {
    return [];
  }

  const candidatos = [
    publicacion.imagenes,
    publicacion.images,
    publicacion.media,
    publicacion.slides,
    publicacion.imagen,
    publicacion.image,
    publicacion.imageUrl,
    publicacion.image_url,
  ];

  const urls = [];

  const agregarValor = (valor) => {
    if (Array.isArray(valor)) {
      valor.forEach(agregarValor);
      return;
    }

    if (
      valor &&
      typeof valor === "object"
    ) {
      [
        valor.url,
        valor.imageUrl,
        valor.image_url,
        valor.imagen,
        valor.image,
      ].forEach(agregarValor);

      return;
    }

    const url =
      normalizarUrlImagen(valor);

    if (
            url &&
      !urls.includes(url)
    ) {
      urls.push(url);
    }
  };

  candidatos.forEach(agregarValor);

  return urls;
}

async function crearContenedorInstagram(
  cuentaId,
  parametros
) {
  const body = new URLSearchParams({
    ...parametros,
    access_token:
      INSTAGRAM_ACCESS_TOKEN,
  });

  const respuesta = await fetch(
    `${INSTAGRAM_API}/${cuentaId}/media`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const datos = await leerJsonSeguro(
    respuesta
  );

  if (
    !respuesta.ok ||
    !datos?.id
  ) {
    console.error(
      "Error creando contenedor de Instagram:",
      datos
    );

    throw new Error(
      datos?.error?.message ||
        "Instagram no pudo crear el contenedor multimedia."
    );
  }

  return String(datos.id);
}

const esperar = (milisegundos) =>
  new Promise((resolver) =>
    setTimeout(resolver, milisegundos)
  );

async function esperarContenedorInstagram(
  contenedorId,
  intentos = 10
) {
  for (
    let intento = 0;
    intento < intentos;
    intento += 1
  ) {
    const parametros =
      new URLSearchParams({
        fields: "status_code,status",
        access_token:
          INSTAGRAM_ACCESS_TOKEN,
      });

    const respuesta = await fetch(
      `${INSTAGRAM_API}/${contenedorId}?${parametros.toString()}`
    );

    const datos = await leerJsonSeguro(
      respuesta
    );

    if (!respuesta.ok) {
      console.error(
        "Error consultando contenedor de Instagram:",
        datos
      );

      throw new Error(
        datos?.error?.message ||
          "No se pudo consultar el estado del contenido de Instagram."
      );
    }

    if (
      datos?.status_code === "FINISHED"
    ) {
      return datos;
    }

    if (
      datos?.status_code === "ERROR" ||
      datos?.status_code === "EXPIRED"
    ) {
      throw new Error(
        datos?.status ||
          "Instagram no pudo procesar el contenido."
      );
    }

    await esperar(1500);
  }

  throw new Error(
    "Instagram todavía está procesando el contenido. Intenta nuevamente en unos segundos."
  );
}
async function publicarContenedorInstagram(
  cuentaId,
  contenedorId
) {
  const body = new URLSearchParams({
    creation_id: contenedorId,
    access_token:
      INSTAGRAM_ACCESS_TOKEN,
  });

  const respuesta = await fetch(
    `${INSTAGRAM_API}/${cuentaId}/media_publish`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const datos = await leerJsonSeguro(
    respuesta
  );

  if (
    !respuesta.ok ||
    !datos?.id
  ) {
    console.error(
      "Error publicando en Instagram:",
      datos
    );

    throw new Error(
      datos?.error?.message ||
        "Instagram no pudo publicar el contenido."
    );
  }

  return String(datos.id);
}

async function publicarCarruselInstagram({
  publicacion,
  productoId,
}) {
  verificarConfiguracionInstagram();

  const imagenes =
    extraerImagenesInstagram(
      publicacion
    );

  if (
    imagenes.length < 2 ||
    imagenes.length > 10
  ) {
    throw new Error(
      `El carrusel necesita entre 2 y 10 imágenes públicas. Se encontraron ${imagenes.length}.`
    );
  }

  const texto =
    typeof publicacion?.texto ===
    "string"
      ? publicacion.texto.trim()
      : typeof publicacion?.caption ===
          "string"
        ? publicacion.caption.trim()
        : "";

  const cuenta =
    await obtenerCuentaInstagram();

  const hijos = [];

  for (const imageUrl of imagenes) {
    const hijo =
      await crearContenedorInstagram(
        cuenta.id,
        {
          image_url: imageUrl,
          is_carousel_item: "true",
        }
      );

    await esperarContenedorInstagram(
      hijo
    );

    hijos.push(hijo);
  }

  const parametrosCarrusel = {
    media_type: "CAROUSEL",
    children: hijos.join(","),
  };

  if (texto) {
    parametrosCarrusel.caption = texto;
  }

  const carrusel =
    await crearContenedorInstagram(
      cuenta.id,
      parametrosCarrusel
    );

  await esperarContenedorInstagram(
    carrusel
  );

  const publicacionId =
    await publicarContenedorInstagram(
      cuenta.id,
      carrusel
    );

  const db =
    await conectarMongoDB();

  await db
    .collection("publicaciones_redes")
    .insertOne({
      proveedor: "instagram",
      tipo: "carrusel",
      productoId:
        productoId || null,
      publicacionId,
      cuentaId: cuenta.id,
      username:
        cuenta.username || null,
      texto,
      imagenes,
      estado: "publicado",
      publicadoEn: new Date(),
      creadoEn: new Date(),
    });

  return {
    ok: true,
    proveedor: "instagram",
    tipo: "carrusel",
    publicacionId,
    username:
      cuenta.username || null,
    mensaje:
      "Carrusel publicado correctamente en Instagram.",
  };
}

// =========================================================
// INSTAGRAM - STORY
// =========================================================

async function publicarStoryInstagram({
  publicacion,
  productoId,
}) {
  verificarConfiguracionInstagram();

  const imagenes =
    extraerImagenesInstagram(publicacion);

  const imagen = imagenes[0] || null;

  if (!imagen) {
    throw new Error(
      "La Story de Instagram no contiene una imagen pública."
    );
  }

  const cuenta =
    await obtenerCuentaInstagram();

  const contenedor =
    await crearContenedorInstagram(
      cuenta.id,
      {
        image_url: imagen,
        media_type: "STORIES",
      }
    );

  await esperarContenedorInstagram(
    contenedor
  );

  const publicacionId =
    await publicarContenedorInstagram(
      cuenta.id,
      contenedor
    );

  const db =
    await conectarMongoDB();

  await db
    .collection("publicaciones_redes")
    .insertOne({
      proveedor: "instagram",
      tipo: "story",

      productoId:
        productoId || null,
      
      publicacionId,

      cuentaId: cuenta.id,

      username:
        cuenta.username || null,

      imagen,

      estado: "publicado",

      publicadoEn: new Date(),
      creadoEn: new Date(),
    });

  return {
    ok: true,
    proveedor: "instagram",
    tipo: "story",
    publicacionId,

    username:
      cuenta.username || null,

    mensaje:
      "Story publicada correctamente en Instagram.",
  };
}

// =========================================================
// INSTAGRAM - REEL
// =========================================================

async function publicarReelInstagram({
  publicacion,
  productoId,
}) {
  verificarConfiguracionInstagram();

  const db =
    await conectarMongoDB();

  const producto = await db
    .collection("productos")
    .findOne({
      id: productoId,
    });

  if (!producto) {
    throw new Error(
      "No se encontró el producto del Reel."
    );
  }

  const videoUrl =
    typeof producto.videoReel === "string"
      ? producto.videoReel.trim()
      : "";

  if (
    !videoUrl ||
    !/^https:\/\//i.test(videoUrl)
  ) {
    throw new Error(
      "El producto no tiene un video Reel público."
    );
  }

  const texto =
    typeof publicacion?.texto === "string"
      ? publicacion.texto.trim()
      : typeof publicacion?.caption === "string"
        ? publicacion.caption.trim()
        : "";

  const cuenta =
    await obtenerCuentaInstagram();

  const parametros = {
    media_type: "REELS",
    video_url: videoUrl,
  };

  if (texto) {
    parametros.caption = texto;
  }

  const contenedor =
    await crearContenedorInstagram(
      cuenta.id,
      parametros
    );

  await esperarContenedorInstagram(
    contenedor,
    40
  );

  const publicacionId =
    await publicarContenedorInstagram(
      cuenta.id,
      contenedor
    );

  await db
    .collection("publicaciones_redes")
      .insertOne({
      proveedor: "instagram",
      tipo: "reel",

      productoId:
        productoId || null,

      publicacionId,

      cuentaId: cuenta.id,

      username:
        cuenta.username || null,

      texto,

      videoUrl,

      estado: "publicado",

      publicadoEn: new Date(),
      creadoEn: new Date(),
    });

  return {
    ok: true,
    proveedor: "instagram",
    tipo: "reel",

    publicacionId,

    username:
      cuenta.username || null,

    mensaje:
      "Reel publicado correctamente en Instagram.",
  };
}

// =========================================================
// INSTAGRAM REEL PROGRAMADO: PROCESAMIENTO POR ETAPAS
// Cada invocación consulta Meta UNA sola vez. Se guarda el
// contenedor para no recrearlo ni publicar por duplicado.
// =========================================================

const MAX_CONSULTAS_REEL_INSTAGRAM = 20;
const PAUSA_REEL_INSTAGRAM_MS = 5 * 60 * 1000;
const BLOQUEO_CONSULTA_REEL_MS = 3 * 60 * 1000;

async function iniciarReelInstagramProgramado({ db, documentoId, posicion, productoId, publicacion }) {
  verificarConfiguracionInstagram();

  const producto = await db.collection("productos").findOne({ id: productoId });
  const videoUrl = typeof producto?.videoReel === "string" ? producto.videoReel.trim() : "";
  if (!/^https:\/\//i.test(videoUrl)) {
    throw new Error("El producto no tiene un MP4 público guardado.");
  }
  const texto = typeof publicacion?.texto === "string" ? publicacion.texto.trim() : "";
  const cuenta = await obtenerCuentaInstagram();
  const parametros = { media_type: "REELS", video_url: videoUrl };
  if (texto) parametros.caption = texto;

  // Solo se crea una vez. Si la API respondió pero MongoDB falla,
  // el reclamo inicial queda bloqueado: jamás se recrea automáticamente.
  const contenedorId = await crearContenedorInstagram(cuenta.id, parametros);
  const ahora = new Date();
  const campo = `calendario.${posicion}`;
  const guardado = await db.collection("contenido_redes").updateOne(
    {
      _id: documentoId,
      [`${campo}.estado`]: "publicando",
      [`${campo}.igContenedorId`]: null,
    },
    {
      $set: {
        [`${campo}.estado`]: "procesando_instagram",
        [`${campo}.igEtapa`]: "esperando",
        [`${campo}.igContenedorId`]: contenedorId,
        [`${campo}.igCuentaId`]: cuenta.id,
        [`${campo}.igUsername`]: cuenta.username || null,
        [`${campo}.igVideoUrl`]: videoUrl,
        [`${campo}.igTexto`]: texto,
        [`${campo}.igCreadoEn`]: ahora,
        [`${campo}.igProximaConsultaEn`]: ahora,
        [`${campo}.igConsultas`]: 0,
        actualizadoEn: ahora,
      },
      $unset: { [`${campo}.procesandoDesde`]: "" },
    }
  );
  if (guardado.modifiedCount !== 1) {
    throw new Error("Instagram creó el contenedor, pero no se pudo guardar de forma segura. Revisá antes de reintentar.");
  }
  return {
    ok: true,
    proveedor: "instagram",
    tipo: "reel",
    estado: "procesando_instagram",
    mensaje: "Instagram recibió el Reel. El cron continuará verificando el mismo contenedor hasta publicarlo.",
  };
}

async function continuarReelInstagramProgramado({ db, productoId, fecha, hora, indice }) {
  const documento = await db.collection("contenido_redes").findOne({
    productoId,
    estado: "programado",
  });
  if (!documento?.calendario) return { ok: false, error: "El calendario ya no está programado." };
  const posicion = documento.calendario.findIndex((pieza) =>
    pieza.red === "instagram" && pieza.tipo === "reel" &&
    pieza.fecha === fecha && pieza.hora === hora && Number(pieza.indice) === Number(indice)
  );
  if (posicion < 0) return { ok: false, error: "No se encontró el Reel programado." };
  const pieza = documento.calendario[posicion];
  if (pieza.estado !== "procesando_instagram" || !pieza.igContenedorId) {
    return { ok: false, error: "El Reel ya no necesita procesamiento." };
  }

  const campo = `calendario.${posicion}`;
  const ahora = new Date();
  const coleccion = db.collection("contenido_redes");

  if (pieza.igEtapa === "esperando") {
    const inicioBloqueo = new Date(ahora.getTime() - BLOQUEO_CONSULTA_REEL_MS);
    const reclamo = await coleccion.updateOne(
      {
        _id: documento._id,
        [`${campo}.estado`]: "procesando_instagram",
        [`${campo}.igEtapa`]: "esperando",
        [`${campo}.igContenedorId`]: pieza.igContenedorId,
        $or: [
          { [`${campo}.igConsultaDesde`]: null },
          { [`${campo}.igConsultaDesde`]: { $lt: inicioBloqueo } },
        ],
      },
      { $set: { [`${campo}.igConsultaDesde`]: ahora, actualizadoEn: ahora } }
    );
    if (reclamo.modifiedCount !== 1) {
      return { ok: true, estado: "procesando_instagram", mensaje: "Otro proceso ya está consultando el Reel." };
    }

    try {
      verificarConfiguracionInstagram();
      const parametros = new URLSearchParams({
        fields: "status_code,status",
        access_token: INSTAGRAM_ACCESS_TOKEN,
      });
      const respuesta = await fetch(`${INSTAGRAM_API}/${pieza.igContenedorId}?${parametros}`);
      const datos = await leerJsonSeguro(respuesta);
      if (!respuesta.ok) {
        throw new Error(datos?.error?.message || "No se pudo consultar el procesamiento del Reel.");
      }

      const consultas = (Number(pieza.igConsultas) || 0) + 1;
      const estadoMeta = String(datos?.status_code || "");
      if (estadoMeta === "FINISHED") {
        await coleccion.updateOne(
          { _id: documento._id, [`${campo}.estado`]: "procesando_instagram", [`${campo}.igEtapa`]: "esperando", [`${campo}.igConsultaDesde`]: ahora },
          {
            $set: { [`${campo}.igEtapa`]: "listo", [`${campo}.igConsultas`]: consultas, actualizadoEn: new Date() },
            $unset: { [`${campo}.igConsultaDesde`]: "", [`${campo}.igProximaConsultaEn`]: "" },
          }
        );
        return { ok: true, estado: "procesando_instagram", mensaje: "El Reel está listo; se publicará en la siguiente ejecución del cron." };
      }
      if (estadoMeta === "ERROR" || estadoMeta === "EXPIRED" || consultas >= MAX_CONSULTAS_REEL_INSTAGRAM) {
        const errorDefinitivo = new Error(estadoMeta === "ERROR" || estadoMeta === "EXPIRED"
          ? (datos?.status || `Instagram marcó el contenedor como ${estadoMeta}.`)
          : "Instagram no terminó de procesar el Reel tras 20 consultas. Revisá manualmente antes de reintentar.");
        errorDefinitivo.reelDefinitivo = true;
        throw errorDefinitivo;
      }

      await coleccion.updateOne(
        { _id: documento._id, [`${campo}.estado`]: "procesando_instagram", [`${campo}.igEtapa`]: "esperando", [`${campo}.igConsultaDesde`]: ahora },
        {
          $set: {
            [`${campo}.igConsultas`]: consultas,
            [`${campo}.igUltimoEstado`]: estadoMeta || "IN_PROGRESS",
            [`${campo}.igProximaConsultaEn`]: new Date(Date.now() + PAUSA_REEL_INSTAGRAM_MS),
            actualizadoEn: new Date(),
          },
          $unset: { [`${campo}.igConsultaDesde`]: "" },
        }
      );
      return { ok: true, estado: "procesando_instagram", mensaje: "Instagram sigue procesando el video. Se consultará en el siguiente ciclo." };
    } catch (error) {
      // Una lectura fallida no debe crear otro contenedor ni disparar media_publish.
      const esDefinitivo = error.reelDefinitivo === true;
      const consultas = (Number(pieza.igConsultas) || 0) + 1;
      const falloDefinitivo = esDefinitivo || consultas >= MAX_CONSULTAS_REEL_INSTAGRAM;
      await coleccion.updateOne(
        { _id: documento._id, [`${campo}.estado`]: "procesando_instagram", [`${campo}.igEtapa`]: "esperando", [`${campo}.igConsultaDesde`]: ahora },
        {
          $set: {
            [`${campo}.estado`]: falloDefinitivo ? "error" : "procesando_instagram",
            [`${campo}.igConsultas`]: consultas,
            [`${campo}.ultimoError`]: String(error.message || "Error consultando Instagram"),
            [`${campo}.ultimoErrorEn`]: new Date(),
            [`${campo}.igProximaConsultaEn`]: new Date(Date.now() + PAUSA_REEL_INSTAGRAM_MS),
            actualizadoEn: new Date(),
          },
          $unset: { [`${campo}.igConsultaDesde`]: "" },
        }
      );
      return { ok: !falloDefinitivo, estado: falloDefinitivo ? "error" : "procesando_instagram", error: String(error.message) };
    }
  }

  if (pieza.igEtapa === "listo") {
    // Marcamos "enviando" ANTES de solicitar media_publish. Si se corta
    // la conexión, bloqueamos nuevas publicaciones para evitar duplicados.
    const reclamo = await coleccion.updateOne(
      { _id: documento._id, [`${campo}.estado`]: "procesando_instagram", [`${campo}.igEtapa`]: "listo" },
      {
        $set: {
          [`${campo}.estado`]: "publicando",
          [`${campo}.igEtapa`]: "enviando",
          [`${campo}.igEnvioDesde`]: ahora,
          actualizadoEn: ahora,
        },
      }
    );
    if (reclamo.modifiedCount !== 1) {
      return { ok: true, estado: "procesando_instagram", mensaje: "El Reel ya fue tomado para publicación." };
    }
    try {
      const publicacionId = await publicarContenedorInstagram(pieza.igCuentaId, pieza.igContenedorId);
      const publicadoEn = new Date();
      await coleccion.updateOne(
        { _id: documento._id, [`${campo}.estado`]: "publicando", [`${campo}.igEtapa`]: "enviando" },
        {
          $set: {
            [`${campo}.estado`]: "publicado",
            [`${campo}.publicacionId`]: publicacionId,
            [`${campo}.publicadoEn`]: publicadoEn,
            [`${campo}.igEtapa`]: "publicado",
            actualizadoEn: publicadoEn,
          },
          $unset: { [`${campo}.ultimoError`]: "", [`${campo}.ultimoErrorEn`]: "", [`${campo}.procesandoDesde`]: "" },
        }
      );

      // El historial es auxiliar: no repetir media_publish si falla su inserción.
      try {
        await db.collection("publicaciones_redes").insertOne({
          proveedor: "instagram", tipo: "reel", productoId, publicacionId,
          cuentaId: pieza.igCuentaId, username: pieza.igUsername || null,
          texto: pieza.igTexto || "", videoUrl: pieza.igVideoUrl || "",
          estado: "publicado", publicadoEn, creadoEn: publicadoEn,
        });
      } catch (registroError) {
        console.error("Reel publicado; no se pudo escribir el historial:", registroError);
      }

      // Cerrar el producto solo si todas sus piezas están publicadas.
      const actualizado = await coleccion.findOne({ _id: documento._id });
      if (actualizado?.calendario?.length && actualizado.calendario.every((item) => item.estado === "publicado")) {
        await coleccion.updateOne(
          { _id: documento._id, estado: "programado" },
          { $set: { estado: "publicado", publicadoEn, actualizadoEn: publicadoEn } }
        );
      }
      return { ok: true, estado: "publicado", publicacionId };
    } catch (error) {
      // El resultado de media_publish podría ser ambiguo: NO reintentar.
      await coleccion.updateOne(
        { _id: documento._id, [`${campo}.estado`]: "publicando", [`${campo}.igEtapa`]: "enviando" },
        {
          $set: {
            [`${campo}.estado`]: "error",
            [`${campo}.ultimoError`]: `Revisar Instagram antes de reintentar: ${error.message}`,
            [`${campo}.ultimoErrorEn`]: new Date(),
            actualizadoEn: new Date(),
          },
        }
      );
      return { ok: false, estado: "error", error: `Revisar Instagram antes de reintentar: ${error.message}` };
    }
  }
  return { ok: false, error: "La etapa del Reel no está habilitada para ejecución automática." };
}

// =========================================================
// FACEBOOK - PUBLICACIÓN
// =========================================================

async function publicarFacebook({
  publicacion,
  productoId,
}) {
  verificarConfiguracionFacebook();

  const texto =
    typeof publicacion?.texto === "string"
      ? publicacion.texto.trim()
      : "";

  const imagenes =
    extraerImagenesInstagram(publicacion);

  const imagen = imagenes[0] || null;

  if (!texto && !imagen) {
    throw new Error(
      "La publicación de Facebook no contiene texto ni imagen."
    );
  }

  const parametros = new URLSearchParams({
    access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
  });

  if (texto) {
    parametros.set(
      imagen ? "caption" : "message",
      texto
    );
  }

  let endpoint;

  if (imagen) {
    parametros.set("url", imagen);

    endpoint =
      `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/photos`;
  } else {
    endpoint =
      `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/feed`;
  }

  const respuesta = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type":
        "application/x-www-form-urlencoded",
    },
    body: parametros.toString(),
  });

  const datos =
    await leerJsonSeguro(respuesta);

  if (!respuesta.ok || !datos?.id) {
    console.error(
      "Error publicando en Facebook:",
      datos
    );

    throw new Error(
      datos?.error?.message ||
        "Facebook no pudo publicar el contenido."
    );
  }

  const publicacionId = String(datos.id);

  const db =
    await conectarMongoDB();

  await db
    .collection("publicaciones_redes")
    .insertOne({
      proveedor: "facebook",
      tipo: "publicacion",

      productoId:
        productoId || null,

      publicacionId,

      paginaId:
        FACEBOOK_PAGE_ID,

      texto,

      imagen,

      estado: "publicado",

      publicadoEn: new Date(),
      creadoEn: new Date(),
    });

  return {
    ok: true,
    proveedor: "facebook",
    tipo: "publicacion",
    publicacionId,

    mensaje:
      "Publicación realizada correctamente en Facebook.",
  };
}

async function publicarStoryFacebook({ publicacion, productoId }) {
  if (publicacion?.ctaVisual && !publicacion?.ctaVisualGenerado) {
    throw new Error(
      "La imagen de Facebook Story todavía no tiene CTA visual. Regenerá el borrador antes de publicarla."
    );
  }

  verificarConfiguracionFacebook();

  const imagen = extraerImagenesInstagram(publicacion)[0];

  if (!imagen) {
    throw new Error("La historia de Facebook necesita una imagen HTTPS.");
  }

  const carga = await fetch(
    `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/photos`,
    {
      method: "POST",
      body: new URLSearchParams({
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        url: imagen,
        published: "false",
      }),
    }
  );

  const foto = await leerJsonSeguro(carga);

  if (!carga.ok || !foto?.id) {
    throw new Error(
      foto?.error?.message || "No se pudo cargar la imagen."
    );
  }

  const respuesta = await fetch(
    `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/photo_stories`,
    {
      method: "POST",
      body: new URLSearchParams({
        access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
        photo_id: String(foto.id),
      }),
    }
  );

  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok || datos?.success !== true) {
    throw new Error(
      datos?.error?.message || "Facebook no confirmó la historia."
    );
  }

  const publicacionId = String(datos.post_id || foto.id);
  const db = await conectarMongoDB();

  await db.collection("publicaciones_redes").insertOne({
    proveedor: "facebook",
    tipo: "story_pagina",
    productoId: productoId || null,
    publicacionId,
    paginaId: FACEBOOK_PAGE_ID,
    imagen,
    estado: "publicado",
    publicadoEn: new Date(),
    creadoEn: new Date(),
  });

  return {
    ok: true,
    proveedor: "facebook",
    tipo: "story_pagina",
    publicacionId,
  };
}

async function publicarCarruselFacebook({ publicacion, productoId }) {
  verificarConfiguracionFacebook();

  const imagenes = extraerImagenesInstagram(publicacion);

  if (imagenes.length !== 3) {
    throw new Error("El carrusel de Facebook requiere exactamente 3 imágenes HTTPS.");
  }

  const texto = typeof publicacion?.texto === "string"
    ? publicacion.texto.trim()
    : "";

  const fotos = [];

  for (const imagen of imagenes) {
    const respuesta = await fetch(
      `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/photos`,
      {
        method: "POST",
        body: new URLSearchParams({
          access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
          url: imagen,
          published: "false",
        }),
      }
    );

    const datos = await leerJsonSeguro(respuesta);

    if (!respuesta.ok || !datos?.id) {
      throw new Error(
        datos?.error?.message || "Facebook no pudo cargar una imagen."
      );
    }

    fotos.push(String(datos.id));
  }

  const parametros = new URLSearchParams({
    access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
    message: texto,
  });

  fotos.forEach((id, indice) => {
    parametros.set(
      `attached_media[${indice}]`,
      JSON.stringify({ media_fbid: id })
    );
  });

  const respuesta = await fetch(
    `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/feed`,
    {
      method: "POST",
      body: parametros,
    }
  );

  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok || !datos?.id) {
    throw new Error(
      datos?.error?.message || "Facebook no pudo publicar el carrusel."
    );
  }

  const publicacionId = String(datos.id);
  const db = await conectarMongoDB();

  await db.collection("publicaciones_redes").insertOne({
    proveedor: "facebook",
    tipo: "carrusel_pagina",
    productoId: productoId || null,
    publicacionId,
    paginaId: FACEBOOK_PAGE_ID,
    texto,
    imagenes,
    estado: "publicado",
    publicadoEn: new Date(),
    creadoEn: new Date(),
  });

  return {
    ok: true,
    proveedor: "facebook",
    tipo: "carrusel_pagina",
    publicacionId,
  };
}

// =========================================================
// FACEBOOK - REEL MP4 (sin activación automática todavía)
// =========================================================

async function publicarReelFacebook({ publicacion, productoId }) {
  verificarConfiguracionFacebook();

  const dbProducto = await conectarMongoDB();

  const producto = await dbProducto
    .collection("productos")
    .findOne({ id: productoId });

  const videoUrl =
    typeof producto?.videoReel === "string"
      ? producto.videoReel.trim()
      : "";

  if (!/^https:\/\//i.test(videoUrl)) {
    throw new Error(
      "El producto no tiene un MP4 público guardado."
    );
  }

  const texto = typeof publicacion?.texto === "string"
    ? publicacion.texto.trim() : "";

  const inicio = await fetch(`${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      upload_phase: "start",
    }).toString(),
  });
  const inicioDatos = await leerJsonSeguro(inicio);
  if (!inicio.ok || !inicioDatos?.video_id || !inicioDatos?.upload_url) {
    throw new Error(inicioDatos?.error?.message || "Facebook no pudo iniciar el reel.");
  }

  const videoId = String(inicioDatos.video_id);
  const carga = await fetch(inicioDatos.upload_url, {
    method: "POST",
    headers: {
      Authorization: `OAuth ${FACEBOOK_PAGE_ACCESS_TOKEN}`,
      file_url: videoUrl,
    },
  });
  const cargaDatos = await leerJsonSeguro(carga);
  if (!carga.ok || cargaDatos?.error) {
    throw new Error(cargaDatos?.error?.message || "Facebook no pudo cargar el MP4.");
  }

  const finalizar = await fetch(`${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/video_reels`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      access_token: FACEBOOK_PAGE_ACCESS_TOKEN,
      upload_phase: "finish",
      video_id: videoId,
      video_state: "PUBLISHED",
      description: texto,
    }).toString(),
  });
  const finalDatos = await leerJsonSeguro(finalizar);
  if (!finalizar.ok || finalDatos?.success !== true) {
    throw new Error(finalDatos?.error?.message || "Facebook no confirmó la publicación del reel.");
  }

  const db = await conectarMongoDB();
  await db.collection("publicaciones_redes").insertOne({
    proveedor: "facebook", tipo: "reel_pagina", productoId: productoId || null,
    publicacionId: videoId, paginaId: FACEBOOK_PAGE_ID, texto, videoUrl,
    estado: "publicado", publicadoEn: new Date(), creadoEn: new Date(),
  });
  return { ok: true, proveedor: "facebook", tipo: "reel_pagina", publicacionId: videoId };
}

// =========================================================
// PRUEBA INDIVIDUAL - FACEBOOK REEL
// =========================================================

async function probarReelFacebookIndividual(req, res) {
  if (process.env.HABILITAR_PRUEBAS_REDES !== "true") {
    return res.status(403).json({
      ok: false,
      error: "Las pruebas están deshabilitadas.",
    });
  }

  const {
    productoId,
    
    texto,
    idPrueba,
    confirmar,
  } = req.body || {};

  if (confirmar !== "PUBLICAR_REEL_FACEBOOK") {
    return res.status(400).json({
      ok: false,
      error: "Falta confirmar la publicación real.",
    });
  }

  if (
    typeof productoId !== "string" ||
    !productoId.trim() ||
    
    typeof idPrueba !== "string" ||
    !/^[a-zA-Z0-9_-]{8,80}$/.test(idPrueba)
  ) {
    return res.status(400).json({
      ok: false,
      error: "Datos de prueba inválidos.",
    });
  }

  const db = await conectarMongoDB();

const producto = await db.collection("productos").findOne({
  id: productoId.trim(),
});

const videoGuardado = producto?.videoReel;

if (!videoGuardado || !/^https:\/\//i.test(videoGuardado)) {
  return res.status(400).json({
    ok: false,
    error: "El producto no tiene un MP4 guardado.",
  });
}
  
  const pruebas = db.collection("pruebas_publicacion_redes");

  const clave = `facebook_reel_${idPrueba}`;

  try {
    await pruebas.insertOne({
      _id: clave,
      productoId: productoId.trim(),
      red: "facebook",
      tipo: "reel_pagina",
      estado: "iniciado",
      creadoEn: new Date(),
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        ok: false,
        error: "Esta prueba ya fue utilizada. No se repetirá.",
      });
    }
    throw error;
  }

  try {
    const resultado = await publicarReelFacebook({
      productoId: productoId.trim(),
      publicacion: {
        videoUrl: videoGuardado,
        texto: typeof texto === "string" ? texto : "",
      },
    });

    await pruebas.updateOne(
      { _id: clave },
      {
        $set: {
          estado: "publicado",
          publicacionId: resultado.publicacionId,
          finalizadoEn: new Date(),
        },
      }
    );

    return res.status(200).json(resultado);
  } catch (error) {
    await pruebas.updateOne(
      { _id: clave },
      {
        $set: {
          estado: "revision_manual",
          error: error.message,
          finalizadoEn: new Date(),
        },
      }
    );

    return res.status(502).json({
      ok: false,
      error: error.message,
      mensaje:
        "Revisá la página de Facebook antes de realizar otra prueba.",
    });
  }
}

// =========================================================
// FACEBOOK STORY: CTA preparado en React/Canvas y almacenado en R2.
// La API valida el JPEG existente; no llama a Cloudflare Images.
// =========================================================
const TEXTO_STORY_FACEBOOK_1 = "¡Encontralo en nuestra tienda!";
const TEXTO_STORY_FACEBOOK_2 = "Visitá nuestra página";

async function prepararStoriesVisuales(contenido, productoId, env) {
  if (!Array.isArray(contenido?.calendario)) return contenido;
  const base = String(env?.PRODUCTOS_R2_URL || "").replace(/\/$/, "");
  const bucket = env?.PRODUCTOS_R2;
  const idSeguro = String(productoId || "").trim();
  const prefijo = `redes/facebook-stories/${idSeguro}/canvas-v1-`;

  const calendario = await Promise.all(contenido.calendario.map(async (pieza) => {
    if (pieza?.red !== "facebook" || pieza?.tipo !== "story_pagina") return pieza;

    if (!pieza.ctaVisualGenerado || !/^https:\/\//i.test(pieza.imagen || "")) {
      throw new Error("La Story no tiene imagen con CTA. Guardá desde el Admin actualizado.");
    }
    if (!bucket?.head || !base) {
      throw new Error("Falta PRODUCTOS_R2 o su URL pública.");
    }
    const imagen = String(pieza.imagen).trim();
    if (!imagen.startsWith(`${base}/${prefijo}`)) {
      throw new Error("La imagen de Story no pertenece a este producto en R2.");
    }
    const clave = imagen.slice(base.length + 1);
    if (!/^redes\/facebook-stories\/[a-zA-Z0-9_-]+\/canvas-v1-[a-f0-9]{24}\.jpg$/.test(clave)) {
      throw new Error("La ruta de la Story con CTA es inválida.");
    }
    if (!(await bucket.head(clave))) {
      throw new Error("La imagen final de Story todavía no existe en R2.");
    }
    const original = String(pieza.imagenOriginal || pieza.imagenesVerticales?.[0] || "").trim();
    return {
      ...pieza,
      copy: "", texto: "", cta: "", hashtags: [], urlProducto: "", textoCompleto: "",
      ctaVisual: true, ctaVisualGenerado: true,
      imagenOriginal: original,
      imagen, imagenes: [imagen], recurso: imagen, recursos: [imagen],
      textoStory: {
        linea1: String(pieza.textoStory?.linea1 || TEXTO_STORY_FACEBOOK_1).trim(),
        linea2: String(pieza.textoStory?.linea2 || TEXTO_STORY_FACEBOOK_2).trim(),
      },
    };
  }));
  return {
    ...contenido,
    calendario,
    facebook: {
      ...(contenido.facebook || {}),
      publicaciones: calendario.filter((p) => p.red === "facebook"),
    },
  };
}

// Facebook Story en pausa. Conservar la lógica de Canvas/R2 para reactivarla.
function sinStoryFacebook(contenido) {
  if (!Array.isArray(contenido?.calendario)) return contenido;
  const calendario = contenido.calendario.filter(
    (p) => !(p?.red === "facebook" && p?.tipo === "story_pagina")
  );
  return {
    ...contenido,
    calendario,
    facebook: {
      ...(contenido.facebook || {}),
      publicaciones: calendario.filter((p) => p.red === "facebook"),
    },
  };
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

  const origen =
    req.body?.origen === "ia"
      ? "ia"
      : "plantilla";

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

  // Generar la imagen final antes de guardar: el Admin podrá previsualizarla.
  let contenidoPreparado;
  try {
    contenidoPreparado = await prepararStoriesVisuales(sinStoryFacebook(contenido), productoId, req.env);
  } catch (error) {
    return res.status(422).json({
      ok: false,
      error: `No se pudo preparar Facebook Story: ${error.message}`,
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
  contenido: contenidoPreparado,
  origen,
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

const MAX_INTENTOS_PUBLICACION = 3;

const ZONA_HORARIA_RED =
  "America/Argentina/Buenos_Aires";

const formatearFechaUTC = (fecha) => {
  const anio = fecha.getUTCFullYear();
  const mes = String(
    fecha.getUTCMonth() + 1
  ).padStart(2, "0");
  const dia = String(
    fecha.getUTCDate()
  ).padStart(2, "0");

  return `${anio}-${mes}-${dia}`;
};

const sumarDiasFecha = (
  fechaBase,
  cantidad
) => {
  const [anio, mes, dia] =
    fechaBase.split("-").map(Number);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  fecha.setUTCDate(
    fecha.getUTCDate() + cantidad
  );

  return formatearFechaUTC(fecha);
};

const obtenerFechaArgentina = () => {
  const partes = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: ZONA_HORARIA_RED,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).formatToParts(new Date());

  const valores = {};

  for (const parte of partes) {
    if (parte.type !== "literal") {
      valores[parte.type] = parte.value;
    }
  }

  return `${valores.year}-${valores.month}-${valores.day}`;
};

const obtenerInicioSemana = () => {
  const hoy = obtenerFechaArgentina();

  const [anio, mes, dia] =
    hoy.split("-").map(Number);

  const fecha = new Date(
    Date.UTC(anio, mes - 1, dia)
  );

  const diaSemana = fecha.getUTCDay();

  // 0 domingo, 1 lunes ... 6 sábado
  const distanciaLunes =
    diaSemana === 0
      ? -6
      : 1 - diaSemana;

  fecha.setUTCDate(
    fecha.getUTCDate() + distanciaLunes
  );

  let inicio =
    formatearFechaUTC(fecha);

  // Si ya estamos en sábado o domingo,
  // programamos directamente la semana siguiente.
  if (
    diaSemana === 6 ||
    diaSemana === 0
  ) {
    inicio =
      sumarDiasFecha(inicio, 7);
  }

  return inicio;
};

const crearCalendarioInicial = (
  contenido,
  bloqueSemana = 0,
  semanaInicio = obtenerInicioSemana()
) => {
  const bloque = [0, 1, 2].includes(
    Number(bloqueSemana)
  )
    ? Number(bloqueSemana)
    : 0;

  // 3 productos semanales:
  // bloque 0 = lunes/martes
  // bloque 1 = miércoles/jueves
  // bloque 2 = viernes/sábado
  const desplazamiento = bloque * 2;

  const nombresDias = [
    ["Lunes", "Martes"],
    ["Miércoles", "Jueves"],
    ["Viernes", "Sábado"],
  ][bloque];

  const dias = nombresDias.map(
    (dia, indice) => ({
      fecha: sumarDiasFecha(
        semanaInicio,
        desplazamiento + indice
      ),
      dia,
    })
  );

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
      zonaHoraria: ZONA_HORARIA_RED,
    });
  };

  // Priorizar las piezas generadas para cada producto.
  // Las publicaciones semiautomáticas quedan pendientes de acción manual.
  if (Array.isArray(contenido?.calendario) && contenido.calendario.length) {
    const offsets = { dia1: 0, dia2: 1 };
    contenido.calendario.forEach((pieza, posicion) => {
      // No programar Facebook Story aunque venga de borradores anteriores.
      if (pieza?.red === "facebook" && pieza?.tipo === "story_pagina") return;

      if (
  pieza.red === "whatsapp" &&
  pieza.tipo === "whatsapp_grupo"
) return;
      // El grupo_post fue retirado del calendario semanal.
      if (
        pieza.red === "facebook" &&
        (pieza.tipo === "grupo_post" ||
          (pieza.tipo === "grupo" && pieza.variante === "post"))
      ) return;

      const diaIndice = offsets[pieza.dia];
      if (diaIndice === undefined) return;
      
      const manual =
  pieza.requiereConfirmacionManual === true ||
  pieza.publicacionAutomatica === false;
      
      const tipo = pieza.tipo === "grupo" ?
        `grupo_${pieza.variante || "post"}` : pieza.tipo;
      calendario.push({
        fecha: dias[diaIndice].fecha,
        dia: dias[diaIndice].dia,
        hora: pieza.hora,
        red: pieza.red,
        tipo,
        indice: posicion,
        publicacion: {
          ...pieza,
          texto: (() => {
            const base = String(pieza.textoCompleto || pieza.texto || "").trim();
            if (pieza.red !== "whatsapp" || pieza.tipo !== "estado") return base;
            const url = String(pieza.urlProducto || "").trim();
            return url && !base.includes(url) ? `${base}\n\n${url}` : base;
          })(),
          imagenes: pieza.imagenes || (pieza.imagen ? [pieza.imagen] : []),
          video: pieza.video || "",
        },
        estado: manual ? "pendiente_manual" :
          (["instagram:reel", "instagram:carrusel", 
            "threads:video",
            "threads:post",
            "threads:sabias_que", "threads:carrusel", "facebook:reel_pagina", "facebook:carrusel_pagina"].includes(`${pieza.red}:${pieza.tipo}`)
            ? "programado" : "pendiente_integracion"),
        publicacionAutomatica: !manual,
        zonaHoraria: ZONA_HORARIA_RED,
      });
    });
    return calendario;
  }

  // Compatibilidad con contenidos aprobados antes de la migración.
  agregar(0, "17:00", "instagram", "reel", 0, contenido?.instagram?.reel);
  agregar(0, "18:00", "threads", "publicacion", 0, contenido?.threads?.[0]);
  agregar(0, "17:00", "facebook", "publicacion", 0, contenido?.facebook?.publicaciones?.[0]);
  agregar(1, "10:00", "instagram", "carrusel", 0, contenido?.instagram?.carrusel);
  agregar(1, "10:00", "threads", "publicacion", 1, contenido?.threads?.[1]);
  agregar(1, "10:00", "facebook", "publicacion", 1, contenido?.facebook?.publicaciones?.[1]);

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
    .find({
      productoId,
      estado: "aprobado",
    })
    .sort({
      aprobadoEn: -1,
      actualizadoEn: -1,
    })
    .limit(1)
    .next();

  if (!aprobado) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró contenido aprobado para este producto.",
    });
  }

  const ahora = new Date();

  const semanaInicio =
    obtenerInicioSemana();

  const semanaFin =
    sumarDiasFecha(
      semanaInicio,
      5
    );

  const programadosSemana = await db
    .collection("contenido_redes")
    .find({
      estado: "programado",
      semanaInicio,
    })
    .sort({
      programadoEn: 1,
    })
    .toArray();

  const bloquesOcupados =
    new Set(
      programadosSemana
        .map((item) =>
          Number(item.bloqueSemana)
        )
        .filter(
          (bloque) =>
            bloque === 0 ||
            bloque === 1 ||
            bloque === 2
        )
    );

  let bloqueSemana = null;

  if (!bloquesOcupados.has(0)) {
    bloqueSemana = 0;
  } else if (!bloquesOcupados.has(1)) {
    bloqueSemana = 1;
  } else if (!bloquesOcupados.has(2)) {
    bloqueSemana = 2;
  }

  if (bloqueSemana === null) {
    return res.status(409).json({
      ok: false,
      error:
        "Ya hay tres productos programados para esta semana.",
    });
  }

  const calendario =
    crearCalendarioInicial(
      aprobado.contenido,
      bloqueSemana,
      semanaInicio
    );

  await db
    .collection("contenido_redes")
    .updateOne(
      {
        _id: aprobado._id,
        estado: "aprobado",
      },
      {
        $set: {
          estado: "programado",
          calendario,

          semanaInicio,
          semanaFin,
          bloqueSemana,

          programadoEn: ahora,
          actualizadoEn: ahora,
        },
      }
    );

  return res.status(200).json({
    ok: true,

    mensaje:
      bloqueSemana === 0
        ? "Producto programado para lunes y martes."
        : bloqueSemana === 1
          ? "Producto programado para miércoles y jueves."
          : "Producto programado para viernes y sábado.",

    semanaInicio,
    semanaFin,
    bloqueSemana,
    calendario,
  });
}

// =========================================================
// REGENERAR CONTENIDO PROGRAMADO
// =========================================================

async function regenerarContenidoProgramado(
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

  if (
    !contenido ||
    typeof contenido !== "object" ||
    Array.isArray(contenido)
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "El contenido regenerado no es válido.",
    });
  }

  const db =
    await conectarMongoDB();

  const documento = await db
    .collection("contenido_redes")
    .findOne({
      productoId,
      estado: "programado",
    });

  if (!documento) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró contenido programado para este producto.",
    });
  }

  if (
    Array.isArray(documento.calendario) &&
    documento.calendario.some(
      (p) =>
        p.compartidoManualFacebook?.estado === "compartido" ||
        p.estado === "publicado" ||
        p.estado === "publicando" ||
        p.estado === "error" ||
        p.publicacionId ||
        p.procesandoDesde ||
        p.ultimoIntentoEn ||
        p.publicadoEn ||
        Number(p.intentosPublicacion) > 0
    )
  ) {
    return res.status(409).json({
      ok: false,
      error: "No se puede regenerar un calendario con publicaciones o intentos registrados."
    });
  }

  let contenidoPreparado;
  try {
    contenidoPreparado = await prepararStoriesVisuales(sinStoryFacebook(contenido), productoId, req.env);
  } catch (error) {
    return res.status(422).json({
      ok: false,
      error: `No se pudo regenerar Facebook Story: ${error.message}`,
    });
  }

  const ahora = new Date();

  // Regenera el calendario únicamente si no hubo
// publicaciones ni intentos de publicación previos.
  
  const semanaInicio =
  documento.semanaInicio ||
  documento.calendario?.[0]?.fecha ||
  obtenerInicioSemana();

const bloqueSemana =
  [0, 1, 2].includes(
    Number(documento.bloqueSemana)
  )
    ? Number(documento.bloqueSemana)
    : 0;

const calendario =
  crearCalendarioInicial(
    contenidoPreparado,
    bloqueSemana,
    semanaInicio
  );

  await db
    .collection("contenido_redes")
    .updateOne(
      {
        _id: documento._id,
      },
      {
        $set: {
          contenido: contenidoPreparado,
          calendario,

          nombreProducto:
            nombreProducto ||
            documento.nombreProducto,

          estado: "programado",

          semanaInicio,
semanaFin:
  sumarDiasFecha(
    semanaInicio,
    5
  ),
bloqueSemana,

          regeneradoEn: ahora,
          actualizadoEn: ahora,
        },
      }
    );

  return res.status(200).json({
    ok: true,

    mensaje:
      "Contenido programado regenerado correctamente.",

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
// PUBLICAR AHORA - PIEZA PROGRAMADA
// Publicación real: Threads e Instagram (carrusel).
// =========================================================

async function ejecutarPublicacionPieza({
  req,
  pieza,
  productoId,
}) {
  const red = pieza.red;
  const tipo = pieza.tipo;

  if (red === "threads") {
    const texto =
      typeof pieza.publicacion?.texto === "string"
        ? pieza.publicacion.texto.trim()
        : "";

    if (!texto) {
      throw new Error(
        "La publicación de Threads no contiene texto."
      );
    }

    let imagenUrl = "";
    if (tipo === "post") {
      // Recuperamos la portada REAL del producto: no usar imagen Feed 4:5.
      const dbProducto = await conectarMongoDB();
      const producto = await dbProducto.collection("productos").findOne({ id: productoId });
      imagenUrl = String(producto?.imagenes?.portadaFacebook || "").trim();
      if (!/^https:\/\//i.test(imagenUrl)) {
        throw new Error("Threads Post necesita la portada Facebook/Threads HTTPS del producto (900 × 630).");
      }
    }

    let resultadoThreads = null;
    let estadoHttp = 200;

    const respuestaInterna = {
      status(codigo) {
        estadoHttp = codigo;
        return this;
      },
      json(datos) {
        resultadoThreads = datos;
        return datos;
      },
    };

    await publicarThreads(
      {
        ...req,
        body: {
          texto,
          productoId,
          ...(tipo === "post" ? { imagenUrl } : {}),
        },
      },
      respuestaInterna
    );

    if (
  estadoHttp < 200 ||
  estadoHttp >= 300 ||
  !resultadoThreads?.ok
) {
  const mensaje = [
    resultadoThreads?.error,
    resultadoThreads?.detalle,
  ]
    .filter(Boolean)
    .join(" | ");

  throw new Error(
    mensaje || "No se pudo publicar en Threads."
  );
    }

    return resultadoThreads;
  }

  if (
    red === "instagram" &&
    tipo === "carrusel"
  ) {
    return publicarCarruselInstagram({
      publicacion: pieza.publicacion,
      productoId,
    });
  }

  if (
    red === "instagram" &&
    tipo === "story"
  ) {
    return publicarStoryInstagram({
      publicacion: pieza.publicacion,
      productoId,
    });
  }

  if (
    red === "instagram" &&
    tipo === "reel"
  ) {
    return publicarReelInstagram({
      publicacion: pieza.publicacion,
      productoId,
    });
  }

  if (red === "facebook" && tipo === "carrusel_pagina") {
  return publicarCarruselFacebook({
    publicacion: pieza.publicacion,
    productoId,
  });
  }

  if (red === "facebook" && tipo === "story_pagina") {
  return publicarStoryFacebook({
    publicacion: pieza.publicacion,
    productoId,
  });
  }

  if (red === "facebook" && tipo === "reel_pagina") {
    return publicarReelFacebook({
      publicacion: pieza.publicacion,
      productoId,
    });
  }

  if (
  red === "facebook" &&
  tipo === "publicacion"
) {
    return publicarFacebook({
      publicacion: pieza.publicacion,
      productoId,
    });
  }

  throw new Error(
    "La red o el formato no están habilitados para publicación automática."
  );
}

async function publicarProgramado(
  req,
  res
) {
  const {
    productoId,
    fecha,
    hora,
    red,
    tipo,
    indice,
  } = req.body || {};

  if (
    !productoId ||
    !fecha ||
    !hora ||
    !red
  ) {
    return res.status(400).json({
      ok: false,
            error:
        "Faltan datos de la publicación programada.",
    });
      }

  if (
    red !== "threads" &&
    red !== "instagram" &&
    red !== "facebook"
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "La publicación automática todavía no está habilitada para esta red.",
    });
  }

  if (
    red === "instagram" &&
    tipo !== "carrusel" &&
    tipo !== "story" &&
    tipo !== "reel"
  ) {
    return res.status(400).json({
      ok: false,
      error:
        "Este formato de Instagram todavía no está habilitado para publicación automática.",
    });
  }

  const db = await conectarMongoDB();

  const documento = await db
    .collection("contenido_redes")
    .findOne({
      productoId,
      estado: "programado",
    });

  if (!documento) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró el contenido programado.",
    });
  }

  const posicion =
    Array.isArray(documento.calendario)
      ? documento.calendario.findIndex(
          (pieza) =>
            pieza.fecha === fecha &&
            pieza.hora === hora &&
            pieza.red === red &&
            pieza.tipo === tipo &&
            Number(pieza.indice) ===
              Number(indice)
        )
      : -1;

  if (posicion < 0) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró la pieza en el calendario.",
    });
  }

  const pieza =
    documento.calendario[posicion];

  // Suspensión expresa, incluso si esta pieza proviene de un calendario antiguo.
  if (pieza.red === "facebook" && pieza.tipo === "story_pagina") {
    return res.status(409).json({
      ok: false,
      error: "Facebook Story está en pausa. No se publicará.",
    });
  }

  const formatosPermitidos = [
  "instagram:reel",
  "instagram:carrusel",
  "threads:video",
    "threads:post",
  "threads:sabias_que",
  "threads:carrusel",
  "facebook:reel_pagina",
  "facebook:carrusel_pagina",
];

if (!formatosPermitidos.includes(`${pieza.red}:${pieza.tipo}`)) {
  return res.status(409).json({
    ok: false,
    error: "Formato todavía no habilitado para publicación.",
  });
}

  if (pieza.publicacionAutomatica === false ||
    pieza.estado === "pendiente_manual" ||
    pieza.estado === "pendiente_integracion") {
  return res.status(409).json({
    ok: false,
    error: "Esta publicación no está habilitada para publicación automática."
  });
  }

  if (pieza.estado === "publicado") {
    
    return res.status(409).json({
      ok: false,
      error:
        "Esta publicación ya fue publicada.",
    });
  }

  if (pieza.estado === "publicando") {
    return res.status(409).json({
      ok: false,
      error:
        "Esta publicación ya está siendo procesada.",
    });
  }

  // Un reintento manual, exclusivamente si Threads rechazó
  // la creación del contenedor (no tras un fallo al publicarlo).
  // El cron no envía "reintentar", por lo que nunca entra aquí.
  const esReintentoThreads =
    req.body?.reintentar === true &&
    red === "threads" &&
    pieza.estado === "error" &&
    
    Number(pieza.intentosPublicacion) === 2 &&
    
    !pieza.publicacionId &&
    !pieza.publicadoEn &&
    !pieza.procesandoDesde &&
    String(pieza.ultimoError || "").startsWith(
      "Threads no pudo crear la publicación."
    );

  // Se admite un único reintento manual si la ejecución anterior
  // terminó antes de contactar con Facebook por falta de credenciales.
  const esReintentoFacebook =
    req.body?.reintentar === true &&
    red === "facebook" &&
    tipo === "reel_pagina" &&
    pieza.estado === "error" &&
    Number(pieza.intentosPublicacion) === 1 &&
    !pieza.publicacionId &&
    !pieza.publicadoEn &&
    !pieza.procesandoDesde &&
    String(pieza.ultimoError || "").includes(
      "Faltan FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN"
    );

  const esPrimerIntento =
    pieza.estado === "programado" &&
    (Number(pieza.intentosPublicacion) || 0) === 0 &&
    !pieza.ultimoIntentoEn &&
    !pieza.publicacionId &&
    !pieza.publicadoEn &&
    !pieza.procesandoDesde;

  if (!esPrimerIntento && !esReintentoThreads && !esReintentoFacebook) {
    return res.status(409).json({
      ok: false,
      error: "La publicación no admite otro intento automático ni un reintento manual seguro.",
    });
  }

  const inicio = new Date();

  // Reclamo atómico: dos clics o dos procesos no pueden
  // tomar la misma pieza, ni publicar de nuevo una ya publicada.
  const filtroReclamo = {
    _id: documento._id,
    [`calendario.${posicion}.estado`]:
      esReintentoThreads || esReintentoFacebook ? "error" : "programado",
    [`calendario.${posicion}.intentosPublicacion`]:
      esReintentoThreads ? 2 : esReintentoFacebook ? 1 : { $in: [null, 0] },
    [`calendario.${posicion}.publicacionId`]: null,
    [`calendario.${posicion}.publicadoEn`]: null,
    [`calendario.${posicion}.procesandoDesde`]: null,
    ...(esReintentoThreads || esReintentoFacebook
      ? { [`calendario.${posicion}.ultimoError`]: pieza.ultimoError }
      : { [`calendario.${posicion}.ultimoIntentoEn`]: null }),
  };

  const reclamo = await db
    .collection("contenido_redes")
    .updateOne(
      filtroReclamo,
      {
        $set: {
          [`calendario.${posicion}.estado`]:
            "publicando",
          [`calendario.${posicion}.procesandoDesde`]:
            inicio,
          [`calendario.${posicion}.ultimoIntentoEn`]:
            inicio,
          [`calendario.${posicion}.imagenesIntentadas`]:
            extraerImagenesInstagram(pieza.publicacion),
          actualizadoEn: inicio,
        },
        $inc: {
          [`calendario.${posicion}.intentosPublicacion`]: 1,
        },
      }
    );

  if (reclamo.modifiedCount === 0) {
    return res.status(409).json({
      ok: false,
      error:
        "La publicación ya fue tomada por otro proceso.",
    });
  }

  try {
    // El Reel programado se crea UNA sola vez. Su estado se consultará
    // en próximos ciclos del cron, sin gastar 40 subrequests de golpe.
    if (red === "instagram" && tipo === "reel") {
      const resultado = await iniciarReelInstagramProgramado({
        db,
        documentoId: documento._id,
        posicion,
        productoId,
        publicacion: pieza.publicacion,
      });
      return res.status(202).json(resultado);
    }

    const resultado =
      await ejecutarPublicacionPieza({
        req,
        pieza,
        productoId,
      });

    if (
      !resultado?.ok ||
      !resultado?.publicacionId
    ) {
      throw new Error(
        "La red no devolvió un identificador de publicación válido."
      );
    }

    const ahora = new Date();

    await db
      .collection("contenido_redes")
      .updateOne(
        {
          _id: documento._id,
        },
        {
          $set: {
            [`calendario.${posicion}.estado`]:
              "publicado",
            [`calendario.${posicion}.publicadoEn`]:
              ahora,
            [`calendario.${posicion}.publicacionId`]:
              resultado.publicacionId,
            actualizadoEn: ahora,
          },
          $unset: {
            [`calendario.${posicion}.procesandoDesde`]:
              "",
            [`calendario.${posicion}.ultimoError`]:
              "",
            [`calendario.${posicion}.ultimoErrorEn`]:
              "",
            [`calendario.${posicion}.imagenesIntentadas`]:
              "",
          },
        }
      );

    const actualizado = await db
      .collection("contenido_redes")
      .findOne({
        _id: documento._id,
      });

    const completo =
      Array.isArray(actualizado?.calendario) &&
      actualizado.calendario.length > 0 &&
      actualizado.calendario.every(
        (item) => item.estado === "publicado"
      );

    if (completo) {
      await db
        .collection("contenido_redes")
        .updateOne(
          {
            _id: documento._id,
            estado: "programado",
          },
          {
            $set: {
              estado: "publicado",
              publicadoEn: ahora,
              actualizadoEn: ahora,
            },
          }
        );
    }

    return res.status(200).json({
      ok: true,
      mensaje:
        resultado.mensaje ||
        "Publicación realizada correctamente.",
      proveedor: red,
      tipo,
      publicacionId:
        resultado.publicacionId,
    });
  } catch (errorPublicacion) {
    const ahoraError = new Date();

    await db
      .collection("contenido_redes")
      .updateOne(
        {
          _id: documento._id,
          [`calendario.${posicion}.estado`]:
            "publicando",
        },
        {
          $set: {
            [`calendario.${posicion}.estado`]:
              "error",
            [`calendario.${posicion}.ultimoError`]:
              errorPublicacion?.message ||
              "Error publicando contenido.",
            [`calendario.${posicion}.ultimoErrorEn`]:
              ahoraError,
            actualizadoEn: ahoraError,
          },
          $unset: {
            [`calendario.${posicion}.procesandoDesde`]:
              "",
          },
        }
      );

    console.error(
      "Error publicando pieza programada:",
      errorPublicacion
    );

    return res.status(502).json({
      ok: false,
      error:
        errorPublicacion?.message ||
        "No se pudo publicar el contenido programado.",
    });
  }
}

const obtenerFechaHoraArgentina = () => {
  const partes = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone:
        "America/Argentina/Buenos_Aires",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }
  ).formatToParts(new Date());

  const valor = (tipo) =>
    partes.find(
      (parte) => parte.type === tipo
    )?.value || "";

  return {
    fecha: `${valor("year")}-${valor("month")}-${valor("day")}`,
    hora: `${valor("hour")}:${valor("minute")}`,
  };
};

const cronAutorizado = (req) => {
  const secreto = process.env.CRON_SECRET;

  if (!secreto) return false;

  const recibido =
    req.headers?.authorization || "";

  const esperado = `Bearer ${secreto}`;

  const a = Buffer.from(recibido);
  const b = Buffer.from(esperado);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

async function ejecutarPublicacionesPendientes(
  req,
  res
) {
  const db = await conectarMongoDB();

  const { fecha, hora } =
    obtenerFechaHoraArgentina();

  const documentos = await db
    .collection("contenido_redes")
    .find({
      estado: "programado",
    })
    .toArray();

  const pendientes = [];

  for (const documento of documentos) {
    if (!Array.isArray(documento.calendario)) {
      continue;
    }

    // Recuperar únicamente carruseles automáticos de HOY que quedaron
    // en pendiente_integracion por no figurar en la lista anterior.
    // Nunca rehabilitar piezas con intentos, ID de publicación o estado manual.
    for (const [posicion, pieza] of documento.calendario.entries()) {
      if (
        pieza?.red !== "facebook" ||
        pieza.tipo !== "carrusel_pagina" ||
        pieza.estado !== "pendiente_integracion" ||
        pieza.publicacionAutomatica !== true ||
        pieza.fecha !== fecha ||
        String(pieza.hora || "") > hora ||
        Number(pieza.intentosPublicacion || 0) !== 0 ||
        pieza.ultimoIntentoEn ||
        pieza.procesandoDesde ||
        pieza.publicacionId ||
        pieza.publicadoEn
      ) continue;

      const ruta = `calendario.${posicion}`;
      const restaurado = await db.collection("contenido_redes").updateOne(
        {
          _id: documento._id,
          [`${ruta}.estado`]: "pendiente_integracion",
          [`${ruta}.publicacionAutomatica`]: true,
          [`${ruta}.intentosPublicacion`]: { $in: [null, 0] },
          [`${ruta}.ultimoIntentoEn`]: null,
          [`${ruta}.procesandoDesde`]: null,
          [`${ruta}.publicacionId`]: null,
          [`${ruta}.publicadoEn`]: null,
        },
        {
          $set: {
            [`${ruta}.estado`]: "programado",
            actualizadoEn: new Date(),
          },
        }
      );

      if (restaurado.modifiedCount === 1) {
        pieza.estado = "programado";
      }
    }

    documento.calendario.forEach(
      (pieza) => {
        if (pieza?.red === "facebook" && pieza?.tipo === "story_pagina") return;
        if (pieza.publicacionAutomatica === false) return;
        const esReelEnCurso =
          pieza.red === "instagram" && pieza.tipo === "reel" &&
          pieza.estado === "procesando_instagram" &&
          pieza.igContenedorId &&
          ["esperando", "listo"].includes(pieza.igEtapa);
        if (!esReelEnCurso && pieza.estado !== "programado") return;
        if (esReelEnCurso) {
          const proxima = pieza.igProximaConsultaEn ? new Date(pieza.igProximaConsultaEn) : null;
          if (proxima && proxima.getTime() > Date.now()) return;
          const bloqueado = pieza.igConsultaDesde &&
            new Date(pieza.igConsultaDesde).getTime() > Date.now() - BLOQUEO_CONSULTA_REEL_MS;
          if (bloqueado) return;
        } else if (
          (Number(pieza.intentosPublicacion) || 0) > 0 ||
          pieza.ultimoIntentoEn || pieza.procesandoDesde || pieza.publicacionId
        ) {
          return;
        }

        const vencida =
          pieza.fecha < fecha ||
          (pieza.fecha === fecha &&
            pieza.hora <= hora);

        if (!vencida) return;

        const fechaProgramada = new Date(
  `${pieza.fecha}T${pieza.hora}:00-03:00`
);

if (!Number.isFinite(fechaProgramada.getTime())) {
  return;
}
        
                pendientes.push({
          productoId:
            documento.productoId,
          fecha: pieza.fecha,
          hora: pieza.hora,
          red: pieza.red,
          tipo: pieza.tipo,
          indice: pieza.indice,
          continuarReel: Boolean(esReelEnCurso),
          intentosPublicacion:
            Number(pieza.intentosPublicacion) || 0,
          ultimoIntentoEn:
            pieza.ultimoIntentoEn || null,
        });
      }
    );
  }

  pendientes.sort((a, b) => {
    // Primero terminar Reels cuyo contenedor ya existe, sin crear otro.
    if (a.continuarReel !== b.continuarReel) return a.continuarReel ? -1 : 1;
    const diferenciaIntentos =
      (a.intentosPublicacion || 0) -
      (b.intentosPublicacion || 0);

    if (diferenciaIntentos !== 0) {
      return diferenciaIntentos;
    }

    return `${a.fecha} ${a.hora}`.localeCompare(
      `${b.fecha} ${b.hora}`
    );
  });

  // Procesamos pocas piezas por invocación para no agotar
  // el tiempo máximo disponible durante la ejecución.
  const lote = pendientes.slice(0, 1);
  const resultados = [];

  for (const pieza of lote) {
    let estadoHttp = 200;
    let respuesta = null;

    const respuestaInterna = {
      status(codigo) {
        estadoHttp = codigo;
        return this;
      },
      json(datos) {
        respuesta = datos;
        return datos;
      },
    };

    if (pieza.continuarReel) {
      respuesta = await continuarReelInstagramProgramado({
        db,
        productoId: pieza.productoId,
        fecha: pieza.fecha,
        hora: pieza.hora,
        indice: pieza.indice,
      });
      estadoHttp = respuesta.ok ? 200 : 502;
    } else {
      await publicarProgramado(
        {
          ...req,
          body: pieza,
        },
        respuestaInterna
      );
    }

    resultados.push({
      ...pieza,
      estadoHttp,
      ok: Boolean(respuesta?.ok),
      publicacionId:
        respuesta?.publicacionId || null,
      error:
        respuesta?.ok
          ? null
          : respuesta?.error ||
            "Error desconocido",
    });
  }

  return res.status(200).json({
    ok: true,
    zonaHoraria:
      "America/Argentina/Buenos_Aires",
    fecha,
    hora,
    pendientesEncontradas:
      pendientes.length,
    procesadas: resultados.length,
    resultados,
  });
}

// =========================================================
// PRUEBA CONTROLADA DEL EJECUTOR AUTOMÁTICO
// Crea UNA sola pieza programada para Threads.
// No toca el calendario semanal definitivo.
// =========================================================

async function crearPruebaAutomaticaControlada(
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

  const db = await conectarMongoDB();

  const aprobado = await db
    .collection("contenido_redes")
    .find({
      productoId,
      estado: "aprobado",
    })
    .sort({
      aprobadoEn: -1,
      actualizadoEn: -1,
    })
    .limit(1)
    .next();

  if (!aprobado) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró contenido aprobado para este producto.",
    });
  }

  const publicacion =
    aprobado.contenido?.threads?.[0];

  const texto =
    typeof publicacion?.texto === "string"
      ? publicacion.texto.trim()
      : "";

  if (!texto) {
    return res.status(400).json({
      ok: false,
      error:
        "El contenido aprobado no tiene una publicación de Threads válida para la prueba.",
    });
  }

  const pruebaExistente = await db
    .collection("contenido_redes")
    .findOne({
      tipoDocumento:
        "prueba_automatica_controlada",
      estado: {
        $in: ["programado", "publicando"],
      },
    });

  if (pruebaExistente) {
    return res.status(409).json({
      ok: false,
      error:
        "Ya existe una prueba automática pendiente. Espera a que termine o elimina esa prueba antes de crear otra.",
    });
  }

  const ahora = new Date();

  // La pieza queda vencida un minuto antes de la hora actual.
  // Así el próximo ciclo de cron-job.org (cada 5 minutos)
  // puede recogerla sin depender de calcular una hora futura.
  const fechaHoraArgentina =
    obtenerFechaHoraArgentina();

  const [horaActual, minutoActual] =
    fechaHoraArgentina.hora
      .split(":")
      .map(Number);

  let minutos =
    horaActual * 60 + minutoActual - 1;

  let fechaPrueba =
    fechaHoraArgentina.fecha;

  if (minutos < 0) {
    minutos += 24 * 60;
    fechaPrueba =
      sumarDiasFecha(fechaPrueba, -1);
  }

  const horaPrueba =
    `${String(
      Math.floor(minutos / 60)
          ).padStart(2, "0")}:${String(
      minutos % 60
    ).padStart(2, "0")}`;

  const documentoPrueba = {
    productoId,
    nombreProducto:
      aprobado.nombreProducto ||
      productoId,

    tipoDocumento:
      "prueba_automatica_controlada",

    estado: "programado",

    calendario: [
      {
        fecha: fechaPrueba,
        dia: "Prueba",
        hora: horaPrueba,
        red: "threads",
        tipo: "publicacion",
        indice: 0,
        publicacion,
        estado: "programado",
        zonaHoraria:
          ZONA_HORARIA_RED,
        pruebaControlada: true,
      },
    ],

    creadoEn: ahora,
    programadoEn: ahora,
    actualizadoEn: ahora,
  };

  const insercion = await db
    .collection("contenido_redes")
    .insertOne(documentoPrueba);

  return res.status(201).json({
    ok: true,
    mensaje:
      "Prueba automática creada. El próximo ciclo del cron debe publicar una sola pieza en Threads.",
    pruebaId:
      String(insercion.insertedId),
    productoId,
    red: "threads",
    fecha: fechaPrueba,
    hora: horaPrueba,
  });
}

// =========================================================
// INSTAGRAM - PROBAR REEL APROBADO
// =========================================================

async function probarReelAprobado(req, res) {
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

  const db = await conectarMongoDB();

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

  const reel =
    aprobado.contenido?.instagram?.reel;

  if (!reel) {
    return res.status(404).json({
      ok: false,
      error:
        "El contenido aprobado no contiene un Reel.",
    });
  }

  try {
    const resultado =
      await publicarReelInstagram({
        publicacion: reel,
        productoId,
      });

    return res.status(200).json(resultado);
  } catch (error) {
    console.error(
      "Error probando Reel de Instagram:",
      error
    );

    return res.status(502).json({
      ok: false,
      error:
        error?.message ||
        "No se pudo publicar el Reel en Instagram.",
    });
  }
}

const probarPublicacionAutomatica = async (item) => {
  alert("BOTÓN FUNCIONANDO");

  try {
    setMensaje("");

    const respuesta = await fetch(
      "/api/contenido-redes?accion=crear-prueba-automatica",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productoId: item.productoId,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos?.error ||
          "No se pudo crear la prueba automática."
      );
    }

    setMensaje(
      `Prueba creada. El cron publicará automáticamente en Threads. Programada: ${datos.fecha} ${datos.hora}.`
    );
  } catch (error) {
    setMensaje(
      error?.message ||
        "Error creando la prueba automática."
    );
  }
};

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

    const clienteOpenAI =
  obtenerOpenAI();

const respuesta =
  await clienteOpenAI.responses.create({
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
// DESTINOS PARA COMPARTIR MANUALMENTE
// =========================================================

async function listarDestinosCompartir(req, res) {
  const db = await conectarMongoDB();

  const destinos = await db
    .collection("destinos_compartir")
    .find({
      activo: true,
    })
    .sort({
      creadoEn: 1,
    })
    .toArray();

  return res.status(200).json({
    ok: true,
    destinos,
  });
}

async function guardarDestinoCompartir(req, res) {
  const plataforma =
    typeof req.body?.plataforma === "string"
      ? req.body.plataforma.trim()
      : "";

  const tipo =
    typeof req.body?.tipo === "string"
      ? req.body.tipo.trim()
      : "";

  const nombre =
    typeof req.body?.nombre === "string"
      ? req.body.nombre.trim()
      : "";

  const url =
    typeof req.body?.url === "string"
      ? req.body.url.trim()
      : "";

  if (!plataforma || !tipo || !nombre || !url) {
    return res.status(400).json({
      ok: false,
      error: "Faltan datos del destino.",
    });
  }

  const db = await conectarMongoDB();

  const ahora = new Date();

  const resultado = await db
    .collection("destinos_compartir")
    .insertOne({
      plataforma,
      tipo,
      nombre,
      url,
      activo: true,
      creadoEn: ahora,
      actualizadoEn: ahora,
    });

  return res.status(201).json({
    ok: true,
    destinoId: resultado.insertedId.toString(),
    mensaje: "Destino guardado correctamente.",
  });
}

// =========================================================
// FACEBOOK - CONFIRMAR COMPARTIDO MANUAL
// =========================================================

async function marcarCompartidoFacebook(req, res) {
  const {
    productoId,
    fecha,
    hora,
    tipo,
    indice,
  } = req.body || {};

  if (
    !productoId ||
    !fecha ||
    !hora ||
    !tipo ||
    indice === undefined ||
    indice === null
  ) {
    return res.status(400).json({
      ok: false,
      error: "Faltan datos de la publicación.",
    });
  }

  const db = await conectarMongoDB();

  const documento = await db
    .collection("contenido_redes")
    .findOne({
      productoId,
      estado: "programado",
    });

  if (!documento) {
    return res.status(404).json({
      ok: false,
      error: "No se encontró el contenido programado.",
    });
  }

  const posicion = Array.isArray(documento.calendario)
    ? documento.calendario.findIndex(
        (pieza) =>
          pieza.fecha === fecha &&
          pieza.hora === hora &&
          pieza.red === "facebook" &&
          pieza.tipo === tipo &&
          Number(pieza.indice) === Number(indice)
      )
    : -1;

  if (posicion < 0) {
    return res.status(404).json({
      ok: false,
      error: "No se encontró la publicación de Facebook.",
    });
  }

  const ahora = new Date();

  const resultado = await db
    .collection("contenido_redes")
    .updateOne(
      {
        _id: documento._id,
        [`calendario.${posicion}.estado`]: "pendiente_manual",
        [`calendario.${posicion}.compartidoManualFacebook.estado`]: {
          $ne: "compartido",
        },
      },
      {
        $set: {
          [`calendario.${posicion}.compartidoManualFacebook`]: {
            estado: "compartido",
            compartidoEn: ahora,
          },
          actualizadoEn: ahora,
        },
      }
    );

  if (resultado.modifiedCount === 0) {
    return res.status(409).json({
      ok: false,
      error: "La publicación ya fue confirmada o no es manual.",
    });
  }

  return res.status(200).json({
    ok: true,
    estado: "compartido",
    compartidoEn: ahora,
    mensaje: "Publicación marcada como compartida.",
  });
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
    // CALLBACK THREADS
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
    // CONECTAR THREADS
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
    // PUBLICAR THREADS
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
    // PROGRAMAR CONTENIDO
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
// REGENERAR CONTENIDO PROGRAMADO
// -----------------------------------------------------

if (
  req.method === "POST" &&
  accion === "regenerar-programado"
) {
  if (!adminAutorizado(req)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado",
    });
  }

  return regenerarContenidoProgramado(
    req,
    res
  );
}

    // -----------------------------------------------------
    // LISTAR PROGRAMADOS
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

    // PRUEBA INDIVIDUAL FACEBOOK REEL
if (
  req.method === "POST" &&
  accion === "probar-reel-facebook"
) {
  if (!adminAutorizado(req)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado",
    });
  }

  return probarReelFacebookIndividual(req, res);
}

    // -----------------------------------------------------
    // PUBLICAR AHORA UNA PIEZA PROGRAMADA
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "publicar-programado"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return publicarProgramado(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // CREAR PRUEBA AUTOMÁTICA CONTROLADA
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "crear-prueba-automatica" &&
process.env.HABILITAR_PRUEBAS_REDES === "true"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return crearPruebaAutomaticaControlada(
        req,
        res
      );
    }

    // -----------------------------------------------------
    // EJECUTAR PUBLICACIONES PROGRAMADAS - CRON
    // -----------------------------------------------------

    if (
      req.method === "GET" &&
      accion === "ejecutar-programadas"
    ) {
      if (!cronAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "Cron no autorizado",
        });
      }

      return ejecutarPublicacionesPendientes(
        req,
        res
      );
    }

    // -----------------------------------------------------
// PROBAR REEL APROBADO
// -----------------------------------------------------

if (
  req.method === "POST" &&
  accion === "probar-reel"
) {
  if (!adminAutorizado(req)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado",
    });
  }

  return probarReelAprobado(
    req,
    res
  );
}

    // -----------------------------------------------------
// DESTINOS PARA COMPARTIR
// -----------------------------------------------------

if (
  req.method === "GET" &&
  accion === "listar-destinos-compartir"
) {
  if (!adminAutorizado(req)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado",
    });
  }

  return listarDestinosCompartir(req, res);
}

if (
  req.method === "POST" &&
  accion === "guardar-destino-compartir"
) {
  if (!adminAutorizado(req)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado",
    });
  }

  return guardarDestinoCompartir(req, res);
}

    if (
  req.method === "POST" &&
  accion === "marcar-compartido-facebook"
) {
  if (!adminAutorizado(req)) {
    return res.status(401).json({
      ok: false,
      error: "No autorizado",
    });
  }

  return marcarCompartidoFacebook(req, res);
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