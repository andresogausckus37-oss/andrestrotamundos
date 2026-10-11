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
  process.env.NODE_ENV = "production";
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
    headers: headersComoObjeto(request)
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

    if (
      !nombre ||
      !["facebook", "whatsapp"].includes(plataforma)
    ) {
      return Response.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const prompt = `
Sos un redactor publicitario argentino especializado
en comercio electrónico.

Producto: ${nombre}
Descripción: ${descripcion}

Plataforma: ${plataforma}

Generá un copy comercial natural, atractivo y breve.

Reglas:
- Español argentino.
- No inventar características.
- No inventar descuentos ni promociones.
- No incluir URLs.
- No usar más de 2 emojis.
- Evitar textos repetitivos.
- Facebook: generar exactamente 5 hashtags relevantes.
- WhatsApp: no generar hashtags.

Respondé exclusivamente con JSON válido:
{
  "copy": "texto",
  "hashtags": ["#Etiqueta1"]
}
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

    return Response.json({
      ok: true,
      copy: String(generado.copy || ""),
      hashtags:
        plataforma === "facebook" &&
        Array.isArray(generado.hashtags)
          ? generado.hashtags.slice(0, 5)
          : [],
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