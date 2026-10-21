// Vinculación de Facebook a un pedido pagado de Comunidad Semanal.
// No publica contenidos y no toca la conexión de prueba administrativa.
import crypto from "node:crypto";
import { ejecutarConexionInstagramPedido } from "./instagram-pedidos.js";

const META_VERSION = "v26.0";
const ORIGENES = new Set([
  "https://andreshousesitter.com",
  "https://andrestrotamundos.andresogausckus37.workers.dev",
]);
const BASE = "/api/servicios/meta/pedidos";
const CALLBACK = `${BASE}/callback`;
const COOKIE = "__Host-servicio_meta_pedido_estado";
const PLAZO_MS = 10 * 60 * 1000;
const COLECCION = "conexiones_meta_pedidos";
const INTENTOS = "meta_oauth_pedidos";

function json(datos, status = 200, cookie = null) {
  const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  if (cookie !== null) headers.set("Set-Cookie", cookie);
  return Response.json(datos, { status, headers });
}
function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function pagina(titulo, contenido, status = 200, borrarCookie = true) {
  const headers = new Headers({
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
    "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
  });
  if (borrarCookie) headers.set("Set-Cookie", cookieEstado("", true));
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title><style>body{font:16px system-ui,sans-serif;background:#f5f5f5;color:#222;margin:0}main{max-width:580px;margin:48px auto;padding:24px;background:white;border:1px solid #ddd;border-radius:10px}h1{font-size:23px}p{line-height:1.6}</style></head><body><main><h1>${escapar(titulo)}</h1>${contenido}<p><a href="/servicios/publicacion-automatica">Volver a mi pedido</a></p><p>El acceso privado permanece solo en esta sesión del navegador.</p></main></body></html>`, { status, headers });
}
function cookieEstado(valor, borrar = false) {
  return `${COOKIE}=${valor}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${borrar ? 0 : 600}`;
}
function leerCookie(request) {
  const parte = (request.headers.get("cookie") || "").split(";").map(v => v.trim())
    .find(v => v.startsWith(`${COOKIE}=`));
  return parte ? parte.slice(COOKIE.length + 1) : "";
}
function compararEstado(a, b) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
function hash(valor) { return crypto.createHash("sha256").update(valor).digest("hex"); }
function pedidoValido(valor) { return typeof valor === "string" && /^SER-[a-f0-9-]{36}$/i.test(valor); }
function tokenCliente(request) {
  return /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "")?.[1] || "";
}
function accesoCliente(request, pedido) {
  const token = tokenCliente(request);
  const guardado = pedido?.tokenAccesoHash;
  if (!token || typeof guardado !== "string" || !/^[a-f0-9]{64}$/i.test(guardado)) return false;
  return crypto.timingSafeEqual(Buffer.from(hash(token), "hex"), Buffer.from(guardado, "hex"));
}
function pedidoHabilitado(pedido) {
  const prueba = pedido?.modalidadContratacion === "prueba_gratuita" &&
    pedido?.estadoPago === "no_requerido" && pedido?.metodoPago === "ninguno" &&
    pedido?.prueba?.estado === "pendiente_activacion" && pedido?.estadoServicio === "sin_activar";
  const pago = pedido?.estadoPago === "confirmado" && Boolean(pedido.pagadoEn);
  return pedido?.tipo === "publicaciones" && (prueba || pago) &&
    Array.isArray(pedido.redes) && pedido.redes.includes("facebook") &&
    pedido.estado !== "cancelado" && pedido.estadoServicio !== "cancelado";
}
function configuracion(env) {
  const appId = String(env?.SERVICIO_META_APP_ID ?? "").trim();
  const secret = String(env?.SERVICIO_META_APP_SECRET ?? "").trim();
  const configId = String(env?.SERVICIO_META_CONFIG_ID ?? "").trim();
  const claveHex = String(env?.SERVICIO_META_CIFRADO_KEY ?? "").trim();
  if (!/^\d{5,30}$/.test(appId) || !secret || (configId && !/^\d{5,30}$/.test(configId)) ||
      !/^[a-f0-9]{64}$/i.test(claveHex) || !env?.MONGODB_URI) return null;
  return { appId, secret, configId, clave: Buffer.from(claveHex, "hex") };
}
async function conDb(env, fn) {
  if (!env?.MONGODB_URI) throw new Error("MONGODB_NO_CONFIGURADO");
  const { MongoClient } = await import("mongodb");
  const cliente = new MongoClient(env.MONGODB_URI);
  try {
    await cliente.connect();
    return await fn(cliente.db("andres_imprimibles"));
  } finally {
    await cliente.close().catch(() => {});
  }
}
async function leerJsonAcotado(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) return null;
  const lector = request.body?.getReader();
  if (!lector) return null;
  const decoder = new TextDecoder();
  let contenido = "", total = 0;
  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      total += value.byteLength;
      if (total > 2048) { await lector.cancel(); return null; }
      contenido += decoder.decode(value, { stream: true });
    }
    const dato = JSON.parse(contenido + decoder.decode());
    return dato && typeof dato === "object" && !Array.isArray(dato) ? dato : null;
  } catch { return null; }
}
async function respuestaMeta(response) {
  let dato;
  try { dato = await response.json(); } catch { throw new Error("ERROR_META"); }
  if (!response.ok || dato?.error) throw new Error("ERROR_META");
  return dato;
}
function cifrarToken(token, clave) {
  if (typeof token !== "string" || token.length < 20 || token.length > 8192) throw new Error("TOKEN_INVALIDO");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", clave, iv);
  const contenido = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { algoritmo: "aes-256-gcm", iv: iv.toString("base64"), contenido: contenido.toString("base64"), etiqueta: cipher.getAuthTag().toString("base64") };
}

async function iniciar(request, env, url) {
  if (request.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  if (request.headers.get("origin") !== url.origin) return json({ ok: false, error: "Origen no permitido." }, 403);
  const datos = await leerJsonAcotado(request);
  if (!pedidoValido(datos?.pedidoId)) return json({ ok: false, error: "Pedido inválido." }, 400);
  const config = configuracion(env);
  if (!config) return json({ ok: false, error: "Conexión de Meta no configurada." }, 503);
  try {
    const autorizado = await conDb(env, async db => {
      const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
      if (!pedido || !accesoCliente(request, pedido)) return "sin_acceso";
      if (!pedidoHabilitado(pedido)) return "no_habilitado";
      return "ok";
    });
    if (autorizado === "sin_acceso") return json({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
    if (autorizado === "no_habilitado") return json({ ok: false, error: "El pedido debe estar habilitado para preparación y tener Facebook seleccionado." }, 409);

    const state = crypto.randomBytes(32).toString("hex");
    const redirectUri = `${url.origin}${CALLBACK}`;
    const now = new Date();
    await conDb(env, async db => {
      const intentos = db.collection(INTENTOS);
      await intentos.createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0, name: "oauth_expira_ttl" });
      await intentos.insertOne({ _id: hash(state), pedidoId: datos.pedidoId, origen: url.origin, creadoEn: now, expiraEn: new Date(now.getTime() + PLAZO_MS) });
    });
    const destino = new URL(`https://www.facebook.com/${META_VERSION}/dialog/oauth`);
    destino.searchParams.set("client_id", config.appId);
    destino.searchParams.set("redirect_uri", redirectUri);
    destino.searchParams.set("response_type", "code");
    if (config.configId) {
      destino.searchParams.set("config_id", config.configId);
      destino.searchParams.set("override_default_response_type", "true");
    } else {
      destino.searchParams.set("scope", "pages_show_list,pages_read_engagement,pages_manage_posts");
    }
    destino.searchParams.set("state", state);
    return json({ ok: true, authorizationUrl: destino.toString() }, 200, cookieEstado(state));
  } catch {
    return json({ ok: false, error: "No fue posible iniciar la conexión con Meta." }, 503);
  }
}

async function estadoODesconectar(request, env, url, desconectar) {
  if (request.method !== (desconectar ? "POST" : "GET")) {
    return json({ ok: false, error: "Método no permitido." }, 405);
  }
  if (desconectar && request.headers.get("origin") !== url.origin) {
    return json({ ok: false, error: "Origen no permitido." }, 403);
  }
  const datos = desconectar ? await leerJsonAcotado(request) : { pedidoId: url.searchParams.get("pedidoId") };
  if (!pedidoValido(datos?.pedidoId)) return json({ ok: false, error: "Pedido inválido." }, 400);
  try {
    return await conDb(env, async db => {
      const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
      if (!pedido || !accesoCliente(request, pedido)) return json({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
      if (desconectar) {
        await db.collection(COLECCION).deleteOne({ _id: `facebook:${datos.pedidoId}`, pedidoId: datos.pedidoId });
        // Cancelar también autorizaciones pendientes para impedir nuevas conexiones tardías.
        await db.collection(INTENTOS).deleteMany({ pedidoId: datos.pedidoId });
        return json({ ok: true, desconectada: true });
      }
      const registro = await db.collection(COLECCION).findOne(
        { _id: `facebook:${datos.pedidoId}`, pedidoId: datos.pedidoId },
        { projection: { _id: 0, pageId: 1, nombre: 1, tareas: 1, estado: 1, conectadoEn: 1, actualizadoEn: 1 } },
      );
      // La UI necesita estos indicadores del servidor: una orden de Instagram
      // o un pago pendiente no deben mostrar la opción de conectar Facebook.
      // Se devuelven solo después de validar el Bearer privado del pedido.
      const facebookContratado = Array.isArray(pedido.redes) && pedido.redes.includes("facebook");
      const pagoConfirmado = pedido.estadoPago === "confirmado" && Boolean(pedido.pagadoEn);
      return json({
        ok: true,
        facebookContratado,
        pagoConfirmado,
        pruebaGratuita: pedido.modalidadContratacion === "prueba_gratuita",
        habilitada: pedidoHabilitado(pedido),
        conectada: Boolean(registro),
        conexion: registro || null,
      });
    });
  } catch {
    return json({ ok: false, error: "No fue posible consultar o desconectar Facebook." }, 503);
  }
}

async function callback(request, env, url) {
  if (request.method !== "GET") return pagina("Método no permitido", "<p>El retorno de Meta requiere GET.</p>", 405);
  const state = url.searchParams.get("state") || "";
  if (!compararEstado(state, leerCookie(request))) {
    return pagina("Autorización vencida", "<p>La autorización no corresponde a este navegador o ya venció.</p>", 403);
  }
  const config = configuracion(env);
  if (!config) return pagina("Configuración pendiente", "<p>La configuración de Meta no está disponible.</p>", 503);
  let intento;
  try {
    intento = await conDb(env, db => db.collection(INTENTOS).findOneAndDelete({
      _id: hash(state), origen: url.origin, expiraEn: { $gt: new Date() },
    }));
  } catch {
    return pagina("Conexión no disponible", "<p>No fue posible validar esta autorización.</p>", 503);
  }
  if (!intento) return pagina("Autorización vencida", "<p>La autorización ya se utilizó o venció.</p>", 403);
  if (url.searchParams.has("error")) return pagina("Autorización cancelada", "<p>Meta no concedió el acceso.</p>", 400);
  const code = url.searchParams.get("code") || "";
  if (!code || code.length > 4000) return pagina("Autorización inválida", "<p>Falta el código de Meta.</p>", 400);
  try {
    const sigueHabilitado = await conDb(env, async db => {
      const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: intento.pedidoId, tipo: "publicaciones" });
      return pedidoHabilitado(pedido);
    });
    if (!sigueHabilitado) return pagina("Pedido no habilitado", "<p>El pedido ya no admite conectar Facebook.</p>", 409);
    const redirectUri = `${url.origin}${CALLBACK}`;
    const datos = await respuestaMeta(await fetch(`https://graph.facebook.com/${META_VERSION}/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: config.appId, client_secret: config.secret, redirect_uri: redirectUri, code }),
    }));
    if (typeof datos.access_token !== "string") throw new Error("TOKEN_INVALIDO");
    const extendido = await respuestaMeta(await fetch(`https://graph.facebook.com/${META_VERSION}/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "fb_exchange_token", client_id: config.appId, client_secret: config.secret, fb_exchange_token: datos.access_token }),
    }));
    if (typeof extendido.access_token !== "string") throw new Error("TOKEN_INVALIDO");
    const me = new URL(`https://graph.facebook.com/${META_VERSION}/me/accounts`);
    me.searchParams.set("fields", "id,name,tasks,access_token");
    me.searchParams.set("limit", "100");
    const paginas = await respuestaMeta(await fetch(me, { headers: { Authorization: `Bearer ${extendido.access_token}` } }));
    const habilitadas = Array.isArray(paginas.data) ? paginas.data : [];
    // Por ahora se solicita seleccionar exactamente una pagina desde Meta.
    if (habilitadas.length !== 1) return pagina("Seleccioná una sola página", "<p>Volvé a conectar Facebook y autorizá exactamente una página en Meta.</p>", 422);
    const seleccionada = habilitadas[0];
    const tareas = Array.isArray(seleccionada.tasks) ? seleccionada.tasks.filter(t => typeof t === "string" && t.length <= 80).slice(0, 30) : [];
    if (!tareas.includes("CREATE_CONTENT") && !tareas.includes("PROFILE_PLUS_CREATE_CONTENT")) {
      return pagina("Permisos insuficientes", "<p>La página no tiene permisos para crear contenido.</p>", 403);
    }
    if (!/^\d{5,30}$/.test(String(seleccionada.id || ""))) throw new Error("PAGINA_INVALIDA");
    const tokenCifrado = cifrarToken(seleccionada.access_token, config.clave);
    await conDb(env, async db => {
      const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: intento.pedidoId, tipo: "publicaciones" });
      if (!pedidoHabilitado(pedido)) throw new Error("PEDIDO_NO_HABILITADO");
      const fecha = new Date();
      await db.collection(COLECCION).updateOne({ _id: `facebook:${intento.pedidoId}` }, {
        $set: {
          pedidoId: intento.pedidoId, plataforma: "facebook", estado: "conectada",
          pageId: String(seleccionada.id), nombre: String(seleccionada.name || "Página de Facebook").slice(0, 160),
          tareas, tokenPaginaCifrado: tokenCifrado, actualizadoEn: fecha,
        },
        $setOnInsert: { conectadoEn: fecha },
      }, { upsert: true });
    });
    return pagina("Facebook conectado al pedido", `<p>La página <strong>${escapar(seleccionada.name || "Facebook")}</strong> quedó vinculada exclusivamente a este pedido.</p><p>ID de página: <code>${escapar(seleccionada.id)}</code></p><p>El servicio todavía no realizará publicaciones.</p>`);
  } catch {
    // Nunca registrar ni devolver tokens, códigos OAuth, secretos ni respuestas completas de Meta.
    return pagina("No se pudo completar la conexión", "<p>Revisá los permisos, la página seleccionada y el estado de tu pedido.</p>", 502);
  }
}

export async function ejecutarConexionMetaPedido(request, env) {
  const url = new URL(request.url);
  if (!ORIGENES.has(url.origin)) return json({ ok: false, error: "Dominio no permitido." }, 403);
  if (url.pathname.startsWith(`${BASE}/instagram/`)) return ejecutarConexionInstagramPedido(request, env);
  if (url.pathname === CALLBACK) return callback(request, env, url);
  if (url.pathname === `${BASE}/iniciar`) return iniciar(request, env, url);
  if (url.pathname === `${BASE}/estado`) return estadoODesconectar(request, env, url, false);
  if (url.pathname === `${BASE}/desconectar`) return estadoODesconectar(request, env, url, true);
  return json({ ok: false, error: "Ruta no disponible." }, 404);
}
