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
  const bloque =
    Number(bloqueSemana) === 1 ? 1 : 0;

  const desplazamiento =
    bloque === 0 ? 0 : 3;

  const nombresDias =
    bloque === 0
      ? [
          "Lunes",
          "Martes",
          "Miércoles",
        ]
      : [
          "Jueves",
          "Viernes",
          "Sábado",
        ];

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

  // INSTAGRAM

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

  // THREADS + FACEBOOK

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
            bloque === 1
        )
    );

  let bloqueSemana = null;

  if (!bloquesOcupados.has(0)) {
    bloqueSemana = 0;
  } else if (!bloquesOcupados.has(1)) {
    bloqueSemana = 1;
  }

  if (bloqueSemana === null) {
    return res.status(409).json({
      ok: false,
      error:
        "Ya hay dos productos programados para esta semana.",
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
        ? "Producto programado para lunes, martes y miércoles."
        : "Producto programado para jueves, viernes y sábado.",

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

  const ahora = new Date();

  // Crea nuevamente las 20 piezas.
  // Todas quedan en estado "programado"
  // y sin publicacionId/publicadoEn anteriores.
  const semanaInicio =
  documento.semanaInicio ||
  documento.calendario?.[0]?.fecha ||
  obtenerInicioSemana();

const bloqueSemana =
  Number(documento.bloqueSemana) === 1
    ? 1
    : 0;

const calendario =
  crearCalendarioInicial(
    contenido,
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
          contenido,
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
      throw new Error(
        resultadoThreads?.error ||
          "No se pudo publicar en Threads."
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

  if (red === "facebook") {
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

  const inicio = new Date();

  const reclamo = await db
    .collection("contenido_redes")
    .updateOne(
      {
        _id: documento._id,
        [`calendario.${posicion}.estado`]:
          "programado",
      },
      {
        $set: {
          [`calendario.${posicion}.estado`]:
            "publicando",
          [`calendario.${posicion}.procesandoDesde`]:
            inicio,
          actualizadoEn: inicio,
        },
        $unset: {
          [`calendario.${posicion}.ultimoError`]:
            "",
          [`calendario.${posicion}.ultimoErrorEn`]:
            "",
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
              "programado",
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

    documento.calendario.forEach(
      (pieza) => {
        if (pieza?.estado !== "programado") {
          return;
        }

        const vencida =
          pieza.fecha < fecha ||
          (pieza.fecha === fecha &&
            pieza.hora <= hora);

        if (!vencida) return;
                pendientes.push({
          productoId:
            documento.productoId,
          fecha: pieza.fecha,
          hora: pieza.hora,
          red: pieza.red,
          tipo: pieza.tipo,
          indice: pieza.indice,
        });
      }
    );
  }

  pendientes.sort((a, b) =>
    `${a.fecha} ${a.hora}`.localeCompare(
      `${b.fecha} ${b.hora}`
    )
  );

  // Procesamos pocas piezas por invocación para no agotar
  // el tiempo máximo de una función de Vercel.
  const lote = pendientes.slice(0, 3);
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

    await publicarProgramado(
      {
        ...req,
        body: pieza,
      },
      respuestaInterna
    );

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
// GOOGLE MERCHANT API
// =========================================================

const GOOGLE_MERCHANT_CLIENT_EMAIL =
  process.env.GOOGLE_MERCHANT_CLIENT_EMAIL;

const GOOGLE_MERCHANT_DEVELOPER_EMAIL =
  process.env.GOOGLE_MERCHANT_DEVELOPER_EMAIL;

const GOOGLE_MERCHANT_PRIVATE_KEY =
  process.env.GOOGLE_MERCHANT_PRIVATE_KEY;

const GOOGLE_MERCHANT_ACCOUNT_ID =
  process.env.GOOGLE_MERCHANT_ACCOUNT_ID;

const GOOGLE_MERCHANT_SCOPE =
  "https://www.googleapis.com/auth/content";

function verificarConfiguracionMerchant() {
  if (
  !GOOGLE_MERCHANT_CLIENT_EMAIL ||
  !GOOGLE_MERCHANT_PRIVATE_KEY ||
  !GOOGLE_MERCHANT_ACCOUNT_ID ||
  !GOOGLE_MERCHANT_DEVELOPER_EMAIL
) {
    throw new Error(
      "Faltan variables de entorno de Google Merchant API."
    );
  }
}

function base64Url(valor) {
  return Buffer.from(valor)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function obtenerTokenMerchant() {
  verificarConfiguracionMerchant();

  const ahora = Math.floor(Date.now() / 1000);

  const encabezado = base64Url(
    JSON.stringify({ alg: "RS256", typ: "JWT" })
  );

  const carga = base64Url(
    JSON.stringify({
      iss: GOOGLE_MERCHANT_CLIENT_EMAIL,
      scope: GOOGLE_MERCHANT_SCOPE,
      aud: "https://oauth2.googleapis.com/token",
      iat: ahora,
      exp: ahora + 3600,
    })
  );

  const contenidoFirma = `${encabezado}.${carga}`;

  const clavePrivada = GOOGLE_MERCHANT_PRIVATE_KEY
    .replace(/\\n/g, "\n")
    .trim();

  const firma = crypto
    .sign("RSA-SHA256", Buffer.from(contenidoFirma), clavePrivada)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${contenidoFirma}.${firma}`;

  const body = new URLSearchParams({
    grant_type:
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const respuesta = await fetch(
    "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    }
  );

  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok || !datos?.access_token) {
    console.error(
      "Error autenticando Google Merchant:",
      datos
    );

    throw new Error(
      datos?.error_description ||
        datos?.error ||
        "No se pudo autenticar con Google Merchant API."
    );
  }

  return datos.access_token;
}

async function registrarProyectoMerchant(req, res) {
  const developerEmail =
    GOOGLE_MERCHANT_DEVELOPER_EMAIL.trim();

  if (!developerEmail || !developerEmail.includes("@")) {
    return res.status(400).json({
      ok: false,
      error:
        "Debes indicar un correo de Google válido como developerEmail. No uses el correo de la cuenta de servicio.",
    });
  }

  const token = await obtenerTokenMerchant();

  const nombre =
    `accounts/${GOOGLE_MERCHANT_ACCOUNT_ID}/developerRegistration`;

  const respuesta = await fetch(
    `https://merchantapi.googleapis.com/accounts/v1/${nombre}:registerGcp`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ developerEmail }),
    }
  );

  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok) {
    console.error(
      "Error registrando proyecto en Merchant API:",
      datos
    );

    return res.status(respuesta.status || 502).json({
      ok: false,
      error:
        datos?.error?.message ||
        "No se pudo registrar el proyecto de Google Cloud en Merchant API.",
      detalle: datos,
    });
  }

  return res.status(200).json({
    ok: true,
    mensaje:
      "Proyecto de Google Cloud registrado correctamente en Merchant API.",
    registro: datos,
  });
}

async function obtenerFuenteApiMerchant(token) {
  const respuesta = await fetch(
    `https://merchantapi.googleapis.com/datasources/v1/accounts/${GOOGLE_MERCHANT_ACCOUNT_ID}/dataSources?pageSize=100`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok) {
    throw new Error(
      datos?.error?.message ||
        "No se pudieron consultar las fuentes de datos de Merchant Center."
    );
  }

  const fuentes = Array.isArray(datos?.dataSources)
    ? datos.dataSources
    : [];

  const fuente = fuentes.find(
    (item) =>
      item?.name &&
      item?.primaryProductDataSource
  );

  if (!fuente?.name) {
    throw new Error(
      "No se encontró una fuente principal de productos compatible con Merchant API."
    );
  }

  return fuente;
}

function obtenerTextoProducto(producto, claves) {
  for (const clave of claves) {
    const valor = producto?.[clave];
    if (typeof valor === "string" && valor.trim()) {
      return valor.trim();
    }
  }
  return "";
}

function obtenerImagenMerchant(producto) {
  const candidatos = [
    producto?.imagenes?.portada,
    producto?.imagenes?.redes?.feed?.presentacion,
    producto?.imagenes?.preview,
    producto?.imagen,
    producto?.imageUrl,
  ];

  return candidatos.find(
    (valor) =>
      typeof valor === "string" &&
      /^https:\/\//i.test(valor.trim())
  )?.trim() || "";
}

function obtenerPrecioMerchant(producto) {
  const precioUSD = Number(
    producto?.precioUSD ?? producto?.precioUsd
  );

  if (Number.isFinite(precioUSD) && precioUSD > 0) {
    return {
      amountMicros: String(
        Math.round(precioUSD * 1000000)
      ),
      currencyCode: "USD",
    };
  }

  const precioARS = Number(
    producto?.precioARS ?? producto?.precio
  );

  if (Number.isFinite(precioARS) && precioARS > 0) {
    return {
      amountMicros: String(
        Math.round(precioARS * 1000000)
      ),
      currencyCode: "ARS",
    };
  }

  return null;
}
function crearEntradaMerchant(producto) {
  const productoId = String(producto?.id || "").trim();
  const titulo = obtenerTextoProducto(
    producto,
    ["nombre", "titulo", "name"]
  );

  const descripcion = obtenerTextoProducto(
    producto,
    [
      "descripcion",
      "descripcionLarga",
      "descripcionCorta",
      "description",
    ]
  );

  const imagen = obtenerImagenMerchant(producto);
  const precio = obtenerPrecioMerchant(producto);

  if (!productoId) {
    throw new Error(
      "El producto de MongoDB no tiene id."
    );
  }

  if (!titulo) {
    throw new Error(
      "El producto no tiene nombre o título."
    );
  }

  if (!descripcion) {
    throw new Error(
      "El producto no tiene descripción."
    );
  }

  if (!imagen) {
    throw new Error(
      "El producto no tiene una imagen pública HTTPS compatible con Merchant Center."
    );
  }

  if (!precio) {
    throw new Error(
      "El producto no tiene un precio USD o ARS válido."
    );
  }

  const enlaceGuardado = obtenerTextoProducto(
    producto,
    ["url", "link", "enlace", "urlProducto"]
  );

  const link =
    /^https:\/\//i.test(enlaceGuardado)
      ? enlaceGuardado
      : `${URL_BASE}/producto/${encodeURIComponent(productoId)}`;

  return {
  offerId: productoId.slice(0, 50),
  contentLanguage: "es",
  feedLabel: "AR",
    productAttributes: {
      title: titulo.slice(0, 150),
      description: descripcion.slice(0, 5000),
      link,
      imageLink: imagen,
      availability: "IN_STOCK",
      price: precio,
      condition: "NEW",
      brand: "Andrés Imprimibles",
      identifierExists: false,
    },
  };
}

async function probarProductoMerchant(req, res) {
  const productoId =
    typeof req.body?.productoId === "string"
      ? req.body.productoId.trim()
      : "";

  if (!productoId) {
    return res.status(400).json({
      ok: false,
      error:
        "Falta productoId para realizar la prueba de Merchant Center.",
    });
  }

  const db = await conectarMongoDB();

  const producto = await db
    .collection("productos")
    .findOne({ id: productoId });

  if (!producto) {
    return res.status(404).json({
      ok: false,
      error:
        "No se encontró el producto en MongoDB.",
    });
  }

  const token = await obtenerTokenMerchant();
  const fuente = await obtenerFuenteApiMerchant(token);
  const entrada = crearEntradaMerchant(producto);

  const endpoint =
    `https://merchantapi.googleapis.com/products/v1/accounts/${GOOGLE_MERCHANT_ACCOUNT_ID}/productInputs:insert?dataSource=${encodeURIComponent(fuente.name)}`;

  const respuesta = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(entrada),
  });

  const datos = await leerJsonSeguro(respuesta);

  if (!respuesta.ok) {
    console.error(
      "Error insertando producto en Merchant API:",
      datos
    );

    return res.status(respuesta.status || 502).json({
      ok: false,
      error:
        datos?.error?.message ||
        "Google Merchant API rechazó el producto.",
      detalle: datos,
    });
  }

  await db.collection("integraciones").updateOne(
    { proveedor: "google_merchant" },
    {
      $set: {
        proveedor: "google_merchant",
        conectado: true,
        accountId: GOOGLE_MERCHANT_ACCOUNT_ID,
        dataSource: fuente.name,
        ultimoProductoId: productoId,
        ultimoProductInput: datos?.name || null,
        actualizadoEn: new Date(),
      },
      $setOnInsert: {
        creadoEn: new Date(),
      },
    },
    { upsert: true }
  );

  return res.status(200).json({
    ok: true,
    mensaje:
      "Producto enviado correctamente a Google Merchant Center. Google todavía debe procesarlo y evaluar su elegibilidad.",
    productoId,
    dataSource: fuente.name,
    productInput: datos?.name || null,
    product: datos?.product || null,
    respuestaMerchant: datos,
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
    // CREAR PRUEBA AUTOMÁTICA CONTROLADA
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "crear-prueba-automatica"
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
    // GOOGLE MERCHANT - REGISTRAR PROYECTO GCP
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "merchant-registrar-proyecto"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return registrarProyectoMerchant(req, res);
    }

    // -----------------------------------------------------
    // GOOGLE MERCHANT - ENVIAR PRODUCTO DE PRUEBA
    // -----------------------------------------------------

    if (
      req.method === "POST" &&
      accion === "merchant-probar-producto"
    ) {
      if (!adminAutorizado(req)) {
        return res.status(401).json({
          ok: false,
          error: "No autorizado",
        });
      }

      return probarProductoMerchant(req, res);
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