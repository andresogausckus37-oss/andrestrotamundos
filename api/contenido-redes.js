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

const INSTAGRAM_ACCESS_TOKEN =
  process.env.INSTAGRAM_ACCESS_TOKEN;

const INSTAGRAM_API_VERSION = "v26.0";

const INSTAGRAM_API =
  `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

// =========================================================
// FACEBOOK - CONFIGURACIÓN
// =========================================================

const FACEBOOK_PAGE_ID =
  process.env.FACEBOOK_PAGE_ID;

const FACEBOOK_PAGE_ACCESS_TOKEN =
  process.env.FACEBOOK_PAGE_ACCESS_TOKEN;

const FACEBOOK_API_VERSION = "v26.0";

const FACEBOOK_API =
  `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

function verificarConfiguracionFacebook() {
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

const crearCalendarioInicial = (
  contenido,
  bloqueSemana = 0
) => {
  const semanas = [
    [
      {
        fecha: "2026-10-05",
        dia: "Lunes",
      },
      {
        fecha: "2026-10-06",
        dia: "Martes",
      },
      {
        fecha: "2026-10-07",
        dia: "Miércoles",
      },
    ],
    [
      {
        fecha: "2026-10-08",
        dia: "Jueves",
      },
      {
        fecha: "2026-10-09",
        dia: "Viernes",
      },
      {
        fecha: "2026-10-10",
        dia: "Sábado",
      },
    ],
  ];

  const dias =
    semanas[Number(bloqueSemana) === 1 ? 1 : 0];

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
      zonaHoraria:
        "America/Argentina/Buenos_Aires",
    });
  };

  // =======================================================
  // INSTAGRAM
  // Día 1: Story + Carrusel + Story
  // Día 2: Story + Reel + Story
  // Día 3: Story + Story
  // =======================================================

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

  // =======================================================
  // THREADS + FACEBOOK
  // 2 publicaciones diarias por red
  // =======================================================

  for (let i = 0; i < 6; i += 1) {
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

  const programadosSemana = await db
  .collection("contenido_redes")
  .countDocuments({
    estado: "programado",
    calendario: {
      $elemMatch: {
        fecha: {
          $gte: "2026-10-05",
          $lte: "2026-10-10",
        },
      },
    },
  });

if (programadosSemana >= 2) {
  return res.status(409).json({
    ok: false,
    error:
      "Ya hay dos productos programados para esta semana.",
  });
}

const bloqueSemana =
  programadosSemana === 0 ? 0 : 1;

const calendario =
  crearCalendarioInicial(
    aprobado.contenido,
    bloqueSemana
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

  const ahora = new Date();

  // Crea nuevamente las 20 piezas.
  // Todas quedan en estado "programado"
  // y sin publicacionId/publicadoEn anteriores.
  const calendario =
    crearCalendarioInicial(contenido);

  await db
    .collection("contenido_redes")
    .updateOne(
      {
        _id: documento._id,
      },
      {
        $set: {
          contenido,
          calendario,

          nombreProducto:
            nombreProducto ||
            documento.nombreProducto,

          estado: "programado",

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

  if (pieza.estado === "publicado") {
    return res.status(409).json({
      ok: false,
      error:
        "Esta publicación ya fue publicada.",
    });
  }

  let resultado = null;
  let mensaje = "";

  if (red === "threads") {
    const texto =
      typeof pieza.publicacion?.texto ===
      "string"
        ? pieza.publicacion.texto.trim()
        : "";

    if (!texto) {
      return res.status(400).json({
        ok: false,
        error:
          "La publicación de Threads no contiene texto.",
      });
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
        },
      },
      respuestaInterna
    );

    if (
      estadoHttp < 200 ||
      estadoHttp >= 300 ||
      !resultadoThreads?.ok
    ) {
      return res
        .status(estadoHttp || 502)
        .json(
          resultadoThreads || {
            ok: false,
            error:
              "No se pudo publicar en Threads.",
          }
        );
    }

    resultado = resultadoThreads;
    mensaje =
      "Publicación realizada correctamente en Threads.";
  }

  if (
    red === "instagram" &&
    tipo === "carrusel"
  ) {
    try {
      resultado =
        await publicarCarruselInstagram({
          publicacion:
            pieza.publicacion,
          productoId,
        });

      mensaje =
        "Carrusel publicado correctamente en Instagram.";
    } catch (errorInstagram) {
      console.error(
        "Error publicando carrusel programado en Instagram:",
        errorInstagram
      );

      return res.status(502).json({
        ok: false,
        error:
          errorInstagram?.message ||
          "No se pudo publicar el carrusel en Instagram.",
      });
    }
  }

  if (
  red === "instagram" &&
  tipo === "story"
) {
  try {
    resultado =
      await publicarStoryInstagram({
        publicacion:
          pieza.publicacion,
        productoId,
      });

    mensaje =
      "Story publicada correctamente en Instagram.";
  } catch (errorInstagram) {
    console.error(
      "Error publicando Story programada en Instagram:",
      errorInstagram
    );

    return res.status(502).json({
      ok: false,
      error:
        errorInstagram?.message ||
        "No se pudo publicar la Story en Instagram.",
    });
  }
  }

  if (
  red === "instagram" &&
  tipo === "reel"
) {
  try {
    resultado =
      await publicarReelInstagram({
        publicacion:
          pieza.publicacion,
        productoId,
      });

    mensaje =
      "Reel publicado correctamente en Instagram.";
  } catch (errorInstagram) {
    console.error(
      "Error publicando Reel programado en Instagram:",
      errorInstagram
    );

    return res.status(502).json({
      ok: false,
      error:
        errorInstagram?.message ||
        "No se pudo publicar el Reel en Instagram.",
    });
  }
  }

  if (red === "facebook") {
  try {
    resultado =
      await publicarFacebook({
        publicacion:
          pieza.publicacion,
        productoId,
      });

    mensaje =
      "Publicación realizada correctamente en Facebook.";
  } catch (errorFacebook) {
    console.error(
      "Error publicando contenido programado en Facebook:",
      errorFacebook
    );

    return res.status(502).json({
      ok: false,
      error:
        errorFacebook?.message ||
        "No se pudo publicar en Facebook.",
    });
  }
  }

  if (
    !resultado?.ok ||
    !resultado?.publicacionId
  ) {
    return res.status(502).json({
      ok: false,
      error:
        "La red no devolvió un identificador de publicación válido.",
    });
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
      }
    );

  return res.status(200).json({
    ok: true,
    mensaje,
    proveedor: red,
    tipo,
    publicacionId:
      resultado.publicacionId,
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