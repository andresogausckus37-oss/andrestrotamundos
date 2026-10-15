import handlerContenidoRedes from "./api/contenido-redes.js";
import handlerAdminLogin from "./api/admin/login.js";
import handlerAdminPedidos from "./api/admin/pedidos.js";
import handlerVisitas from "./api/visitas.js";
import crypto from "crypto";

const RUTA_CONTENIDO_REDES = "/api/contenido-redes";

function sincronizarEntorno(env) {
  const claves = [
    "MONGODB_URI",
    "OPENAI_API_KEY",
    "ADMIN_PASSWORD",
    "CRON_SECRET",
    "THREADS_APP_ID",
    "THREADS_APP_SECRET",
    "INSTAGRAM_ACCESS_TOKEN",
    "FACEBOOK_PAGE_ID",
    "FACEBOOK_PAGE_ACCESS_TOKEN",
    "TELEGRAM_VISITAS_BOT_TOKEN",
    "TELEGRAM_VISITAS_CHAT_ID",
    "RESEND_API_KEY",
  ];
  for (const clave of claves) {
    if (env?.[clave] !== undefined && env?.[clave] !== null) {
      process.env[clave] = String(env[clave]);
    }
  }
}

async function leerBody(request) {
  if (
    request.method === "GET" ||
    request.method === "HEAD"
  ) {
    return {};
  }

  const tipo =
    request.headers.get("content-type") || "";

  if (
    tipo.includes(
      "application/json"
    )
  ) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  if (
    tipo.includes(
      "multipart/form-data"
    )
  ) {
    try {
      const formData =
        await request.formData();

      return Object.fromEntries(
        formData.entries()
      );
    } catch {
      return {};
    }
  }

  if (
    tipo.includes(
      "application/x-www-form-urlencoded"
    )
  ) {
    try {
      return Object.fromEntries(
        new URLSearchParams(
          await request.text()
        )
      );
    } catch {
      return {};
    }
  }

  return {};
}

function headersComoObjeto(request) {
  const headers = {};
  for (const [k, v] of request.headers.entries()) headers[k.toLowerCase()] = v;
  headers.cookie = request.headers.get("cookie") || "";
  headers.authorization = request.headers.get("authorization") || "";
  return headers;
}

function crearRespuestaApi(origen) {
  let statusCode = 200;
  const headers = new Headers({ "Cache-Control": "no-store" });
  let final = null;
  return {
    status(c) { statusCode = Number(c) || 200; return this; },
    setHeader(n, v) { headers.set(n, String(v)); return this; },
    json(d) {
      headers.set("Content-Type", "application/json; charset=utf-8");
      final = new Response(JSON.stringify(d), { status: statusCode, headers });
      return final;
    },
    send(d) {
      if (d !== null && typeof d === "object" && !(d instanceof ArrayBuffer)) return this.json(d);
      final = new Response(d == null ? "" : String(d), { status: statusCode, headers });
      return final;
    },
    redirect(codigoOUrl, urlOpcional) {
      let codigo = 302, url = codigoOUrl;
      if (typeof codigoOUrl === "number") { codigo = codigoOUrl; url = urlOpcional; }
      final = Response.redirect(new URL(String(url), origen).toString(), codigo);
      return final;
    },
    end() { final = new Response(null, { status: statusCode, headers }); return final; },
    obtenerRespuesta() { return final; }
  };
}

async function ejecutarHandlerContenidoRedes(request, env) {
  sincronizarEntorno(env);
  const url = new URL(request.url);
  const req = {
    method: request.method,
    url: request.url,
    query: Object.fromEntries(url.searchParams.entries()),
    body: await leerBody(request),
    headers: headersComoObjeto(request),
    env: {
      IMAGES: env.IMAGES,
      PRODUCTOS_R2: env.PRODUCTOS_R2,
      PRODUCTOS_R2_URL: "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev",
    },
  };
  const res = crearRespuestaApi(url.origin);
  const retorno = await handlerContenidoRedes(req, res);
  if (retorno instanceof Response) return retorno;
  return res.obtenerRespuesta() || Response.json({ ok:false, error:"La API no generó una respuesta." }, { status:500 });
}

async function ejecutarHandlerGenerico(request, env, handler) {
  sincronizarEntorno(env);

  const url = new URL(request.url);

  const req = {
    method: request.method,
    url: request.url,
    query: Object.fromEntries(
      url.searchParams.entries()
    ),
    body: await leerBody(request),
    headers: headersComoObjeto(request),

    env: {
      PRODUCTOS_R2: env.PRODUCTOS_R2,
      PRODUCTOS_R2_URL:
        "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev",
    },
  };

  const res = crearRespuestaApi(url.origin);

  const retorno = await handler(req, res);

  if (retorno instanceof Response) {
    return retorno;
  }

  return (
    res.obtenerRespuesta() ||
    Response.json(
      { ok: false, error: "La API no generó una respuesta." },
      { status: 500 }
    )
  );
}

// =========================================================
// FACEBOOK STORY: imagen original y JPEG final desde React/Canvas.
// Ambas rutas requieren la sesión de Admin. Sin Cloudflare Images.
// =========================================================
const URL_R2_STORIES =
  "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev";

function respuestaStoryError(mensaje, estado = 400) {
  return Response.json({ ok: false, error: mensaje }, { status: estado });
}

async function obtenerProductoStory(productoId, env) {
  const id = String(productoId || "").trim();
  if (!id || id.length > 160) return null;
  sincronizarEntorno(env);
  const { conectarMongoDB } = await import("./lib/mongodb.js");
  const db = await conectarMongoDB();
  return db.collection("productos").findOne({ id });
}

async function imagenOriginalStory(request, env) {
  if (!adminAutorizadoWorker(request, env)) {
    return respuestaStoryError("No autorizado", 401);
  }
  if (request.method !== "GET") {
    return respuestaStoryError("Método no permitido", 405);
  }
  const id = new URL(request.url).searchParams.get("productoId");
  const producto = await obtenerProductoStory(id, env);
  const original = String(producto?.imagenes?.redes?.vertical?.presentacion || "").trim();
  if (!/^https:\/\//i.test(original)) {
    return respuestaStoryError("No se encontró la imagen vertical original del producto.", 404);
  }

  // La URL se lee solamente de MongoDB: el cliente no puede convertir
  // este endpoint autenticado en un proxy de URLs arbitrarias.
  const prefijo = `${URL_R2_STORIES}/`;
  let bytes;
  let tipo;
  if (original.startsWith(prefijo) && env.PRODUCTOS_R2?.get) {
    const clave = decodeURIComponent(new URL(original).pathname.slice(1));
    if (!clave || clave.includes("..")) return respuestaStoryError("Clave R2 no válida", 400);
    const objeto = await env.PRODUCTOS_R2.get(clave);
    if (!objeto) return respuestaStoryError("La imagen original no existe en R2", 404);
    tipo = objeto.httpMetadata?.contentType || "image/jpeg";
    bytes = await objeto.arrayBuffer();
  } else {
    const url = new URL(original);
    if (url.protocol !== "https:" || url.username || url.password) {
      return respuestaStoryError("URL de imagen no válida", 400);
    }
    const respuesta = await fetch(url.toString(), { redirect: "error" });
    if (!respuesta.ok) return respuestaStoryError(`Error descargando la imagen original (${respuesta.status})`, 502);
    tipo = respuesta.headers.get("content-type") || "";
    if (!/^image\/(png|jpeg|webp)(?:;|$)/i.test(tipo)) {
      return respuestaStoryError("El recurso original no es JPG, PNG o WebP", 422);
    }
    bytes = await respuesta.arrayBuffer();
  }
  if (bytes.byteLength < 100 || bytes.byteLength > 12 * 1024 * 1024) {
    return respuestaStoryError("La imagen original debe pesar menos de 12 MB", 413);
  }
  if (!/^image\/(png|jpeg|webp)/i.test(tipo)) {
    return respuestaStoryError("Formato original no admitido", 422);
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": tipo,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function subirImagenStoryCanvas(request, env) {
  if (!adminAutorizadoWorker(request, env)) {
    return respuestaStoryError("No autorizado", 401);
  }
  if (request.method !== "POST") return respuestaStoryError("Método no permitido", 405);
  const id = String(new URL(request.url).searchParams.get("productoId") || "").trim();
  if (!id || id.length > 160 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return respuestaStoryError("ID de producto no válido", 400);
  }
  if (!env.PRODUCTOS_R2?.put || !env.PRODUCTOS_R2?.head) {
    return respuestaStoryError("Falta el binding PRODUCTOS_R2", 503);
  }
  const producto = await obtenerProductoStory(id, env);
  if (!producto) return respuestaStoryError("El producto no existe", 404);
  if (!String(producto.imagenes?.redes?.vertical?.presentacion || "").startsWith("https://")) {
    return respuestaStoryError("El producto no tiene una imagen vertical pública", 422);
  }
  if (!/^image\/jpeg(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    return respuestaStoryError("Se requiere un JPEG generado por Canvas", 415);
  }
  const longitud = Number(request.headers.get("content-length") || 0);
  if (longitud > 8 * 1024 * 1024) return respuestaStoryError("JPEG demasiado grande", 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength < 100 || bytes.byteLength > 8 * 1024 * 1024) {
    return respuestaStoryError("JPEG vacío o demasiado grande", 413);
  }
  const firma = new Uint8Array(bytes);
  if (firma[0] !== 0xff || firma[1] !== 0xd8 || firma[2] !== 0xff) {
    return respuestaStoryError("El archivo no es un JPEG válido", 415);
  }
  const hash = crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const clave = `redes/facebook-stories/${id}/canvas-v1-${hash.slice(0, 24)}.jpg`;
  if (!(await env.PRODUCTOS_R2.head(clave))) {
    await env.PRODUCTOS_R2.put(clave, bytes, {
      httpMetadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }
  return Response.json({
    ok: true,
    imagenUrl: `${URL_R2_STORIES}/${clave}`,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function pruebaMongoDB(env) {
  sincronizarEntorno(env);
  if (!env.MONGODB_URI) return Response.json({ ok:false, error:"MONGODB_URI no está configurado" }, { status:500 });
  try {
    const { MongoClient } = await import("mongodb");
    const cliente = new MongoClient(env.MONGODB_URI);
    await cliente.connect();
    await cliente.db("andres_imprimibles").command({ ping:1 });
    await cliente.close();
    return Response.json({ ok:true, mensaje:"Cloudflare conectado correctamente a MongoDB" });
  } catch (error) {
    return Response.json({ ok:false, error:error?.message || "Error conectando con MongoDB" }, { status:500 });
  }
}

async function diagnosticoRedes(env) {
  sincronizarEntorno(env);

  try {
    const { MongoClient } = await import("mongodb");
    const cliente = new MongoClient(env.MONGODB_URI);

    await cliente.connect();

    const programados = await cliente
      .db("andres_imprimibles")
      .collection("contenido_redes")
      .countDocuments({ estado: "programado" });

    await cliente.close();

    return Response.json({
      ok: true,
      programados
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

function autorizacionCron(env) {
  if (!env?.CRON_SECRET) throw new Error("Falta configurar CRON_SECRET en Cloudflare.");
  return `Bearer ${env.CRON_SECRET}`;
}

async function ejecutarCronRedes(env) {
  sincronizarEntorno(env);
  const request = new Request(
    "https://andrestrotamundos.local/api/contenido-redes?accion=ejecutar-programadas",
    { method:"GET", headers:{ Authorization: autorizacionCron(env) } }
  );
  const respuesta = await ejecutarHandlerContenidoRedes(request, env);
  const texto = await respuesta.text();
  if (!respuesta.ok) throw new Error(`Cron de redes falló (${respuesta.status}): ${texto}`);
  console.log("Cron de redes ejecutado correctamente:", texto);
}

export default {
  async fetch(request, env) {
    sincronizarEntorno(env);
    const url = new URL(request.url);

    
if (url.pathname === "/api/diagnostico-facebook") {
  if (!adminAutorizadoWorker(request, env)) {
    return Response.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  return Response.json({
    pageIdEnCloudflare:
      Boolean(String(env.FACEBOOK_PAGE_ID || "").trim()),

    tokenEnCloudflare:
      Boolean(String(env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim()),

    pageIdEnProceso:
      Boolean(String(process.env.FACEBOOK_PAGE_ID || "").trim()),

    tokenEnProceso:
      Boolean(String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim())
  });
}
    

    if (url.pathname === "/api/admin/story-imagen-origen") {
      try { return await imagenOriginalStory(request, env); }
      catch (error) {
        console.error("Error leyendo imagen original de Story:", error);
        return respuestaStoryError(error?.message || "No se pudo leer la imagen original", 500);
      }
    }

    if (url.pathname === "/api/admin/story-imagen-cta") {
      try { return await subirImagenStoryCanvas(request, env); }
      catch (error) {
        console.error("Error subiendo imagen Canvas de Story:", error);
        return respuestaStoryError(error?.message || "No se pudo guardar la imagen Story", 500);
      }
    }

    if (url.pathname === "/api/ia/copys") {
  if (
    !adminAutorizadoWorker(
      request,
      env
    )
  ) {
    return Response.json(
      {
        ok: false,
        error: "No autorizado",
      },
      { status: 401 }
    );
  }

  try {
    return await generarCopyConIA(
      request,
      env
    );
  } catch (error) {
    console.error(
      "Error ejecutando Workers AI:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error generando contenido con IA",
      },
      { status: 500 }
    );
  }
}

    // METADATOS DE PRODUCTOS PARA WHATSAPP Y FACEBOOK
if (
  request.method === "GET" &&
  /^\/tienda\/[^/]+\/?$/.test(url.pathname) &&
  /facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|linkedinbot|pinterest|discordbot/i.test(
    request.headers.get("user-agent") || ""
  )
) {
  const productoId = decodeURIComponent(
    url.pathname.replace(/^\/tienda\//, "").replace(/\/$/, "")
  );

  const urlInterna = new URL(request.url);
  urlInterna.pathname = "/api/admin/pedidos";
  urlInterna.search = "";

  urlInterna.searchParams.set("accion", "preview-producto");
  urlInterna.searchParams.set("id", productoId);

  return await ejecutarHandlerGenerico(
    new Request(urlInterna.toString(), request),
    env,
    handlerAdminPedidos
  );
}

    /* =========================
   PREVIEWS PARA COMPARTIR
========================= */

if (
  url.pathname.startsWith("/compartir/") ||
  url.pathname.startsWith("/compartir-facebook/")
) {
  try {
    const esFacebook =
      url.pathname.startsWith("/compartir-facebook/");

    const prefijo = esFacebook
      ? "/compartir-facebook/"
      : "/compartir/";

    const productoId = decodeURIComponent(
      url.pathname.slice(prefijo.length)
    ).trim();

    if (!productoId) {
      return new Response(
        "Falta el ID del producto",
        { status: 400 }
      );
    }

    const urlInterna = new URL(request.url);

    urlInterna.pathname = "/api/admin/pedidos";
    urlInterna.search = "";

    urlInterna.searchParams.set(
      "accion",
      esFacebook
        ? "preview-producto-facebook"
        : "preview-producto"
    );

    urlInterna.searchParams.set(
      "id",
      productoId
    );

    const requestInterno = new Request(
      urlInterna.toString(),
      request
    );

    return await ejecutarHandlerGenerico(
      requestInterno,
      env,
      handlerAdminPedidos
    );
  } catch (error) {
    console.error(
      "Error generando preview para compartir:",
      error
    );

    return new Response(
      "No se pudo generar la vista previa.",
      { status: 500 }
    );
  }
}

    if (url.pathname === "/api/prueba-mongodb") return pruebaMongoDB(env);
if (url.pathname === "/api/diagnostico-redes") return diagnosticoRedes(env);

if (url.pathname === "/api/admin/login") {
  try {
    return await ejecutarHandlerGenerico(
      request,
      env,
      handlerAdminLogin
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Error en login admin" },
      { status: 500 }
    );
  }
}

if (url.pathname === "/api/admin/pedidos") {
  try {
    return await ejecutarHandlerGenerico(
      request,
      env,
      handlerAdminPedidos
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Error en API admin" },
      { status: 500 }
    );
  }
}

if (url.pathname === "/api/visitas") {
  try {
    return await ejecutarHandlerGenerico(
      request,
      env,
      handlerVisitas
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error en API de visitas",
      },
      { status: 500 }
    );
  }
}

/* CONTENIDO DE REDES */
if (url.pathname === RUTA_CONTENIDO_REDES) {
      
      try {
        return await ejecutarHandlerContenidoRedes(request, env);
      } catch (error) {
        console.error("Error ejecutando contenido-redes en Cloudflare:", error);
        return Response.json(
          { ok:false, error:error?.message || "Error interno ejecutando contenido-redes." },
          { status:500 }
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
  return Response.json(
    {
      ok: false,
      error: `API no migrada a Cloudflare: ${url.pathname}`
    },
    { status: 404 }
  );
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      ejecutarCronRedes(env).catch((error) => {
        console.error("Error en Cron Trigger de redes:", error);
        throw error;
      })
    );
  }
};

async function generarCopyConIA(request, env) {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método no permitido" },
      { status: 405 }
    );
  }

  if (!env.AI) {
    return Response.json(
      { error: "Workers AI no está configurado" },
      { status: 503 }
    );
  }

  try {
    const datos = await request.json();

    const nombre = String(datos.nombre || "").trim();
    const descripcion = String(datos.descripcion || "").trim();
    const plataforma = String(datos.plataforma || "").trim();
    const tipo = String(datos.tipo || "").trim();
    const variante = String(datos.variante || "").trim();
const contexto = String(datos.contexto || "").trim();

    if (
      !nombre ||
      !["facebook", "instagram", "threads", "whatsapp"].includes(plataforma)
    ) {
      return Response.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const prompt = `
    Sos un redactor publicitario argentino especializado
    en comercio electrónico y redes sociales.

    Producto: ${nombre}
    Descripción: ${descripcion}
    Plataforma: ${plataforma}
Tipo de publicación: ${tipo || "publicación general"}

Variante: ${variante || "general"}
Contexto específico: ${contexto || "presentación del producto"}

- Adaptar el enfoque comercial a la variante y al contexto.
- No repetir literalmente el nombre del producto innecesariamente.
- No inventar datos para diferenciar publicaciones.

INSTRUCCIONES SEGÚN EL FORMATO:
- Reel de Instagram y reel_pagina de Facebook:
  comenzar con una situación, necesidad o beneficio real del producto.
- No comenzar con "Descubrí [nombre del producto]",
  "Conocé [nombre del producto]" ni copiar el título al inicio.
- El nombre puede aparecer naturalmente dentro del texto.
- No incluir URLs, CTA ni hashtags dentro del copy.
- El CTA debe aparecer únicamente en el campo cta.
- Los 5 hashtags deben aparecer únicamente en el array hashtags.
- Usar un tono cercano, natural y diferente para cada plataforma.

- Carrusel: destacar las características y ventajas comprobables.
- Historia o estado: mensaje corto, directo y fácil de leer.
- Publicación de Facebook: texto comercial natural y persuasivo.
- Grupo de Facebook: tono cercano, informativo y sin parecer spam.
- Threads: texto conversacional que invite a interactuar.
- WhatsApp estado: copy natural de máximo 130 caracteres.
- No iniciar el copy con el título del producto.
- Destacar un uso o beneficio verificable.
- No incluir URLs ni hashtags dentro del copy.
- Para WhatsApp estado, CTA exacto: ¡Encontralo en nuestra tienda!
- La aplicación agrega la URL al final para generar su vista previa.
- Adaptar el CTA al formato y a la plataforma.
- No utilizar siempre la misma estructura ni las mismas frases.

    Generá contenido comercial personalizado para este producto.

    REGLAS OBLIGATORIAS:
    - Escribir en español argentino, natural y profesional.
    - Adaptar el copy a la plataforma indicada.
    - Destacar únicamente características presentes en la descripción.
    - No inventar beneficios, características, precios ni promociones.
    - Evitar textos genéricos, repetitivos o exagerados.
    - Incluir entre 1 y 3 emojis relevantes según el producto y el contenido.
- Utilizar los emojis de manera natural, sin sobrecargar el texto.
- Evitar emojis repetidos o que no tengan relación con el producto.
- No incluir emojis en los hashtags.
    - Generar un CTA breve, persuasivo y relacionado con el producto.
    - No incluir URLs: la aplicación agregará el enlace real.
    - No repetir el CTA dentro del copy.
    - Para Facebook, Instagram y Threads: exactamente 5 hashtags relevantes.
    - Los hashtags deben ser específicos del producto, sin palabras sueltas como #Para o #Con.
    - Para WhatsApp: no generar hashtags.
    - No incluir hashtags dentro del copy ni del CTA.

    Respondé exclusivamente con JSON válido:
    {
      "copy": "Texto comercial con entre 1 y 3 emojis relevantes",
      "cta": "Llamado a la acción personalizado",
      "hashtags": ["#Etiqueta1", "#Etiqueta2", "#Etiqueta3", "#Etiqueta4", "#Etiqueta5"]
    }

    Para WhatsApp, devolver "hashtags": [].
    `;

    const resultado = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }
    );

    const texto = String(resultado.response || "")
      .replace(/```json|```/g, "")
      .trim();

    const generado = JSON.parse(texto);

    const copy = String(generado.copy || "").trim();
    const cta = String(generado.cta || "").trim();

    const hashtags = plataforma === "whatsapp"
      ? []
      : Array.isArray(generado.hashtags)
        ? [...new Set(
            generado.hashtags
              .filter(h => typeof h === "string")
              .map(h => h.trim())
              .filter(h => /^#[\p{L}\p{N}_]+$/u.test(h))
          )].slice(0, 5)
        : [];

    if (
      !copy ||
      !cta ||
      (plataforma !== "whatsapp" && hashtags.length !== 5)
    ) {
      return Response.json(
        {
          ok: false,
          error: "La IA devolvió contenido incompleto.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      ok: true,
      copy,
      cta,
      hashtags,
    });
    
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
function obtenerCookiesWorker(request) {
  const cookies = {};
  const header =
    request.headers.get("cookie") || "";

  header.split(";").forEach((cookie) => {
    const [nombre, ...valor] =
      cookie.trim().split("=");

    if (nombre) {
      cookies[nombre] =
        decodeURIComponent(
          valor.join("=")
        );
    }
  });

  return cookies;
}

function adminAutorizadoWorker(
  request,
  env
) {
  const adminPassword =
    env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return false;
  }

  const tokenEsperado = crypto
    .createHmac(
      "sha256",
      String(adminPassword)
    )
    .update(
      "andres-imprimibles-admin"
    )
    .digest("hex");

  const token =
    obtenerCookiesWorker(request)
      .admin_token;

  if (!token) {
    return false;
  }

  const a = Buffer.from(token);
  const b = Buffer.from(
    tokenEsperado
  );

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}