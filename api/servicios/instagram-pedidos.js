// Conexión independiente de Instagram profesional por pedido de Comunidad Semanal.
// No publica ni toca las conexiones de Mega Bazar o Facebook del cliente.
import crypto from "node:crypto";
import { obtenerClienteRegistrado } from "./clientes-acceso.js";

const VERSION_META = "v26.0";
const BASE = "/api/servicios/meta/pedidos/instagram";
const CALLBACK = `${BASE}/callback`;
const COOKIE = "__Host-comunidad_ig_oauth";
const DB = "andres_imprimibles";
const INTENTOS = "meta_oauth_instagram_pedidos";
const CONEXIONES = "conexiones_meta_pedidos";
const PEDIDOS = "pedidos_servicios";
const EXPIRACION_MS = 10 * 60 * 1000;
const ID_PEDIDO = /^SER-[a-f0-9-]{36}$/i;
const TOKEN = /^[a-f0-9]{64}$/i;
const ID_META = /^\d{5,30}$/;
const ORIGENES = new Set([
  "https://andreshousesitter.com",
  "https://andrestrotamundos.andresogausckus37.workers.dev",
]);
const PERMISOS_IG = ["pages_show_list", "pages_read_engagement", "instagram_basic", "instagram_content_publish"];

function responder(datos, status = 200, cookie = null) {
  const headers = new Headers({ "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
  if (cookie !== null) headers.set("Set-Cookie", cookie);
  return Response.json(datos, { status, headers });
}
const escapar = (s) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function cookie(valor, borrar = false) {
  return `${COOKIE}=${valor}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${borrar ? 0 : 600}`;
}
function vista(titulo, mensaje, codigo = 200) {
  const volver = "/servicios/publicacion-automatica/mi-panel";
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapar(titulo)}</title><style>body{margin:0;background:#f7f8fa;color:#202020;font:15px system-ui,sans-serif}main{max-width:540px;margin:50px auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;background:#fff}h1{font-size:22px;font-weight:600}p{line-height:1.6}a{color:#333}</style></head><body><main><h1>${escapar(titulo)}</h1><p>${escapar(mensaje)}</p><p><a href="${volver}">Volver a mi panel</a></p><small>No se realizaron publicaciones ni se modificó Facebook.</small></main></body></html>`;
  return new Response(html, { status: codigo, headers: {
    "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    "Set-Cookie": cookie("", true),
  } });
}
function leerCookie(request) {
  const segmento = (request.headers.get("cookie") || "").split(";").map(x => x.trim()).find(x => x.startsWith(`${COOKIE}=`));
  return segmento ? segmento.slice(COOKIE.length + 1) : "";
}
function mismoEstado(a, b) {
  return TOKEN.test(a) && TOKEN.test(b) && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
const hash = (valor) => crypto.createHash("sha256").update(valor).digest("hex");

function config(env) {
  const appId = String(env?.SERVICIO_META_APP_ID ?? "").trim();
  const appSecret = String(env?.SERVICIO_META_APP_SECRET ?? "").trim();
  const cifradoKey = String(env?.SERVICIO_META_CIFRADO_KEY ?? "").trim();
  if (!ID_META.test(appId) || !appSecret || !TOKEN.test(cifradoKey) || !env?.MONGODB_URI) return null;
  return { appId, appSecret, cifradoKey: Buffer.from(cifradoKey, "hex") };
}
async function conDB(env, funcion) {
  const { MongoClient } = await import("mongodb");
  const cliente = new MongoClient(env.MONGODB_URI);
  try {
    await cliente.connect();
    return await funcion(cliente.db(DB));
  } finally { await cliente.close().catch(() => {}); }
}
async function jsonChico(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) return null;
  if (Number(request.headers.get("content-length") || 0) > 2048) return null;
  if (!request.body) return null;
  const lector = request.body.getReader();
  let total = 0;
  const decoder = new TextDecoder();
  let texto = "";
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > 2048) { await lector.cancel(); return null; }
    texto += decoder.decode(value, { stream: true });
  }
  try {
    const valor = JSON.parse(texto + decoder.decode());
    return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : null;
  } catch { return null; }
}
async function respuestaMeta(respuesta) {
  let datos;
  try { datos = await respuesta.json(); } catch {
    const error = new Error("META_RESPUESTA_INVALIDA");
    error.http = respuesta.status;
    throw error;
  }
  if (!respuesta.ok || datos?.error) {
    // Solo codigos numericos para diagnostico; nunca respuestas completas ni tokens.
    const error = new Error("META_RECHAZO");
    error.http = respuesta.status;
    if (Number.isSafeInteger(datos?.error?.code)) error.metaCode = datos.error.code;
    if (Number.isSafeInteger(datos?.error?.error_subcode)) error.metaSubcode = datos.error.error_subcode;
    throw error;
  }
  return datos;
}
async function graph(path, token) {
  // Workers no admite redirect:"error". Con "manual" nunca seguimos una
  // redireccion y por lo tanto no reenviamos tokens a otro origen.
  const response = await fetch(`https://graph.facebook.com/${VERSION_META}/${path}`, {
    headers: { Authorization: `Bearer ${token}` }, redirect: "manual",
  });
  if (response.status >= 300 && response.status < 400) {
    const fallo = new Error("META_REDIRECCION");
    fallo.http = response.status;
    throw fallo;
  }
  return respuestaMeta(response);
}
// Primero consultamos los permisos otorgados por Facebook Login. Si esa
// consulta no está disponible o Meta devuelve un formato inesperado, usamos
// debug_token como respaldo. NUNCA suponemos permisos sin validarlos.
async function permisosVerificados(tokenUsuario, cfg) {
  try {
    const respuesta = await graph("me/permissions", tokenUsuario);
    if (!Array.isArray(respuesta?.data)) throw new Error("PERMISOS_FORMATO");
    return new Set(respuesta.data.filter(p => p?.status === "granted" &&
      typeof p.permission === "string").map(p => p.permission));
  } catch (errorDirecto) {
    // Este segundo endpoint devuelve solamente metadatos del token a su
    // propia aplicación. Tokens y secreto nunca aparecen en la respuesta UI.
    const destino = new URL(`https://graph.facebook.com/${VERSION_META}/debug_token`);
    destino.searchParams.set("input_token", tokenUsuario);
    let respuesta;
    try {
      respuesta = await fetch(destino.toString(), {
        headers: { Authorization: `Bearer ${cfg.appId}|${cfg.appSecret}` },
        redirect: "manual",
      });
    } catch {
      const fallo = new Error("FALLO_CONSULTA_PERMISOS");
      fallo.detalleSeguro = "RED_META";
      throw fallo;
    }
    if (respuesta.status >= 300 && respuesta.status < 400) {
      const fallo = new Error("META_REDIRECCION");
      fallo.http = respuesta.status;
      fallo.detalleSeguro = "REDIRECCION_META";
      throw fallo;
    }
    const depuracion = await respuestaMeta(respuesta);
    const datos = depuracion?.data;
    if (datos?.is_valid !== true || String(datos?.app_id ?? "") !== cfg.appId ||
        !Array.isArray(datos?.scopes)) {
      const fallo = new Error("TOKEN_SIN_VALIDAR");
      fallo.detalleSeguro = "TOKEN_APP_O_FORMATO";
      throw fallo;
    }
    return new Set(datos.scopes.filter(p => typeof p === "string"));
  }
}
function cifrar(token, clave) {
  if (typeof token !== "string" || token.length < 20 || token.length > 8192) throw new Error("TOKEN_INVALIDO");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", clave, iv);
  const valor = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return { algoritmo: "aes-256-gcm", iv: iv.toString("base64"), contenido: valor.toString("base64"), etiqueta: cipher.getAuthTag().toString("base64") };
}
function ordenAdmisible(pedido) {
  if (pedido?.tipo !== "publicaciones" || !pedido.redes?.includes("instagram") ||
      pedido.estado === "cancelado" || pedido.estadoServicio === "cancelado") return false;
  const prueba = pedido.modalidadContratacion === "prueba_gratuita" && pedido.metodoPago === "ninguno" &&
    pedido.estadoPago === "no_requerido" && pedido.prueba?.estado === "pendiente_activacion" && pedido.estadoServicio === "sin_activar";
  const pago = pedido.estadoPago === "confirmado" && Boolean(pedido.pagadoEn);
  return prueba || pago;
}
function accesoBearer(request, pedido) {
  const bearer = /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!bearer || !TOKEN.test(pedido?.tokenAccesoHash)) return false;
  return crypto.timingSafeEqual(Buffer.from(hash(bearer), "hex"), Buffer.from(pedido.tokenAccesoHash, "hex"));
}
async function usuarioParaSolicitud(request, env) {
  return obtenerClienteRegistrado(request, env);
}
function accesoPedido(request, pedido, usuario) {
  return Boolean(pedido && ((usuario?.id && pedido.clienteUsuarioId === usuario.id) || accesoBearer(request, pedido)));
}
function origenValido(request, url) {
  return request.headers.get("origin") === url.origin;
}
async function iniciar(request, env, url) {
  if (request.method !== "POST") return responder({ ok: false, error: "Método no permitido." }, 405);
  if (!origenValido(request, url)) return responder({ ok: false, error: "Origen no autorizado." }, 403);
  const datos = await jsonChico(request);
  if (!ID_PEDIDO.test(datos?.pedidoId || "")) return responder({ ok: false, error: "Pedido inválido." }, 400);
  const cfg = config(env);
  if (!cfg) return responder({ ok: false, error: "Instagram no está configurado en el Worker." }, 503);
  try {
    const usuario = await usuarioParaSolicitud(request, env);
    const permitido = await conDB(env, async db => {
      const pedido = await db.collection(PEDIDOS).findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
      if (!accesoPedido(request, pedido, usuario)) return "sin_acceso";
      return ordenAdmisible(pedido) ? "ok" : "no_habilitado";
    });
    if (permitido === "sin_acceso") return responder({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
    if (permitido !== "ok") return responder({ ok: false, error: "El pedido no admite conectar Instagram en este estado." }, 409);

    const state = crypto.randomBytes(32).toString("hex");
    const ahora = new Date();
    await conDB(env, async db => {
      await db.collection(INTENTOS).createIndex({ expiraEn: 1 }, { expireAfterSeconds: 0, name: "oauth_instagram_expira_ttl" });
      await db.collection(INTENTOS).insertOne({
        _id: hash(state), pedidoId: datos.pedidoId, origen: url.origin,
        creadoEn: ahora, expiraEn: new Date(ahora.getTime() + EXPIRACION_MS),
      });
    });
    const destino = new URL(`https://www.facebook.com/${VERSION_META}/dialog/oauth`);
    destino.searchParams.set("client_id", cfg.appId);
    destino.searchParams.set("redirect_uri", `${url.origin}${CALLBACK}`);
    destino.searchParams.set("response_type", "code");
    // No reutilizar la configuración OAuth de Facebook: debe solicitar los
    // permisos específicos de Instagram para este pedido.
    destino.searchParams.set("scope", PERMISOS_IG.join(","));
    destino.searchParams.set("state", state);
    destino.searchParams.set("auth_type", "rerequest");
    return responder({ ok: true, authorizationUrl: destino.toString() }, 200, cookie(state));
  } catch {
    return responder({ ok: false, error: "No se pudo iniciar la conexión de Instagram." }, 503);
  }
}
async function estado(request, env, url) {
  if (request.method !== "GET") return responder({ ok: false, error: "Método no permitido." }, 405);
  if (!config(env)) return responder({ ok: false, error: "Instagram no está configurado." }, 503);
  try {
    const usuario = await usuarioParaSolicitud(request, env);
    const pedidoId = url.searchParams.get("pedidoId");
    if (pedidoId && !ID_PEDIDO.test(pedidoId)) return responder({ ok: false, error: "Pedido inválido." }, 400);
    if (!usuario && !pedidoId) return responder({ ok: false, error: "Iniciá sesión para consultar tus redes." }, 401);
    return await conDB(env, async db => {
      if (pedidoId) {
        const pedido = await db.collection(PEDIDOS).findOne({ pedidoId, tipo: "publicaciones" });
        if (!accesoPedido(request, pedido, usuario)) return responder({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
        const registro = await db.collection(CONEXIONES).findOne({ _id: `instagram:${pedidoId}`, plataforma: "instagram" }, { projection: { _id: 0, instagramId: 1, usuario: 1, pageId: 1, estado: 1 } });
        return responder({ ok: true, conectado: Boolean(registro), conexion: registro || null });
      }
      // Una consulta para todas las conexiones de Instagram del panel privado.
      const pedidos = await db.collection(PEDIDOS).find({ clienteUsuarioId: usuario.id, tipo: "publicaciones", redes: "instagram" })
        .sort({ creadoEn: -1 }).limit(30).project({ pedidoId: 1, _id: 0 }).toArray();
      const ids = pedidos.map(p => p.pedidoId).filter(x => ID_PEDIDO.test(x || ""));
      const conexiones = ids.length ? await db.collection(CONEXIONES).find({
        pedidoId: { $in: ids }, plataforma: "instagram",
      }).project({ _id: 0, pedidoId: 1, instagramId: 1, usuario: 1, pageId: 1, estado: 1 }).toArray() : [];
      return responder({ ok: true, conexiones });
    });
  } catch {
    return responder({ ok: false, error: "No se pudo consultar Instagram." }, 503);
  }
}
async function desconectar(request, env, url) {
  if (request.method !== "POST") return responder({ ok: false, error: "Método no permitido." }, 405);
  if (!origenValido(request, url)) return responder({ ok: false, error: "Origen no autorizado." }, 403);
  const datos = await jsonChico(request);
  if (!ID_PEDIDO.test(datos?.pedidoId || "")) return responder({ ok: false, error: "Pedido inválido." }, 400);
  if (!config(env)) return responder({ ok: false, error: "Instagram no está configurado." }, 503);
  try {
    const usuario = await usuarioParaSolicitud(request, env);
    return await conDB(env, async db => {
      const pedido = await db.collection(PEDIDOS).findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
      if (!accesoPedido(request, pedido, usuario)) return responder({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
      if (pedido.estadoServicio !== "sin_activar") return responder({ ok: false, error: "No podés desconectar redes mientras el servicio está activo." }, 409);
      await db.collection(CONEXIONES).deleteOne({ _id: `instagram:${datos.pedidoId}`, plataforma: "instagram" });
      await db.collection(INTENTOS).deleteMany({ pedidoId: datos.pedidoId });
      return responder({ ok: true, desconectada: true });
    });
  } catch {
    return responder({ ok: false, error: "No se pudo desconectar Instagram." }, 503);
  }
}
async function callback(request, env, url) {
  if (request.method !== "GET") return vista("Método no permitido", "La autorización requiere GET.", 405);
  const state = url.searchParams.get("state") || "";
  if (!mismoEstado(state, leerCookie(request))) return vista("Autorización vencida", "La autorización no corresponde a este navegador o ya venció.", 403);
  const cfg = config(env);
  if (!cfg) return vista("Configuración pendiente", "Los datos de Meta no están configurados.", 503);
  let intento;
  try {
    intento = await conDB(env, db => db.collection(INTENTOS).findOneAndDelete({
      _id: hash(state), origen: url.origin, expiraEn: { $gt: new Date() },
    }));
  } catch { return vista("Conexión no disponible", "No pudimos validar la autorización.", 503); }
  if (!intento) return vista("Autorización vencida", "La autorización ya se utilizó o venció.", 403);
  if (url.searchParams.has("error")) return vista("Autorización cancelada", "Meta no concedió el acceso a Instagram.", 400);
  const code = url.searchParams.get("code") || "";
  if (!code || code.length > 4000) return vista("Autorización inválida", "Meta no entregó el código de acceso.", 400);

  let fase = "consultar-pedido";
  try {
    const autorizado = await conDB(env, db => db.collection(PEDIDOS).findOne({ pedidoId: intento.pedidoId, tipo: "publicaciones" }));
    if (!ordenAdmisible(autorizado)) return vista("Pedido no habilitado", "El pedido ya no admite conectar Instagram.", 409);

    const redirectUri = `${url.origin}${CALLBACK}`;
    fase = "canjear-codigo";
    const tokenInicial = await respuestaMeta(await fetch(`https://graph.facebook.com/${VERSION_META}/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: cfg.appId, client_secret: cfg.appSecret, redirect_uri: redirectUri, code }),
    }));
    fase = "extender-token";
    const tokenExtendido = await respuestaMeta(await fetch(`https://graph.facebook.com/${VERSION_META}/oauth/access_token`, {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "fb_exchange_token", client_id: cfg.appId, client_secret: cfg.appSecret, fb_exchange_token: tokenInicial.access_token }),
    }));
    const tokenUsuario = tokenExtendido.access_token;
    if (typeof tokenUsuario !== "string" || tokenUsuario.length < 20) throw new Error("TOKEN_INVALIDO");

    fase = "verificar-permisos";
    const concedidos = await permisosVerificados(tokenUsuario, cfg);
    const faltantes = PERMISOS_IG.filter(p => !concedidos.has(p));
    if (faltantes.length) {
      return vista("Permisos insuficientes", `La autorización no contiene estos permisos: ${faltantes.join(", ")}. Revisá las autorizaciones de la app en Meta.`, 403);
    }

    fase = "listar-paginas";
    const paginas = await graph("me/accounts?fields=id,name,access_token,tasks&limit=100", tokenUsuario);
    const lista = Array.isArray(paginas.data) ? paginas.data : [];
    fase = "comprobar-facebook";
    const conectadoFacebook = await conDB(env, db => db.collection(CONEXIONES).findOne({
      _id: `facebook:${intento.pedidoId}`, plataforma: "facebook",
    }, { projection: { pageId: 1 } }));
    // Para pedidos de ambas redes, únicamente se permite la misma página de Facebook.
    const elegibles = conectadoFacebook
      ? lista.filter(p => String(p.id) === String(conectadoFacebook.pageId))
      : lista;
    if (elegibles.length === 0) return vista("Página no autorizada", "Autorizá la página de Facebook vinculada al pedido.", 403);

    const candidatas = [];
    fase = "consultar-instagram-pagina";
    for (const pagina of elegibles) {
      if (!ID_META.test(String(pagina.id ?? "")) || typeof pagina.access_token !== "string") continue;
      // El campo de vinculación de la página se consulta con el token de USUARIO
      // autorizado, no con el token de la página (requisito de Graph API).
      const detalle = await graph(`${pagina.id}?fields=instagram_business_account`, tokenUsuario);
      const ig = detalle.instagram_business_account;
      if (ig && ID_META.test(String(ig.id ?? ""))) {
        let nombre = typeof ig.username === "string" ? ig.username : "";
        if (!nombre) {
          fase = "consultar-usuario-instagram";
          const perfil = await graph(`${ig.id}?fields=username`, pagina.access_token);
          nombre = typeof perfil.username === "string" ? perfil.username : "";
        }
        if (!/^[a-zA-Z0-9._]{1,30}$/.test(nombre)) continue;
        candidatas.push({ pagina, instagramId: String(ig.id), usuario: nombre });
      }
    }
    if (candidatas.length !== 1) {
      return vista("Cuenta no identificada", candidatas.length === 0
        ? "No encontramos una cuenta profesional de Instagram vinculada a la página autorizada."
        : "Hay varias cuentas posibles. Autorizá una única página para evitar confusiones.", 422);
    }
    const elegida = candidatas[0];
    fase = "guardar-conexion";
    const tokenCifrado = cifrar(elegida.pagina.access_token, cfg.cifradoKey);
    await conDB(env, async db => {
      const pedido = await db.collection(PEDIDOS).findOne({ pedidoId: intento.pedidoId, tipo: "publicaciones" });
      if (!ordenAdmisible(pedido)) throw new Error("PEDIDO_NO_HABILITADO");
      const facebookActual = await db.collection(CONEXIONES).findOne({
        _id: `facebook:${intento.pedidoId}`, plataforma: "facebook",
      }, { projection: { pageId: 1 } });
      if (facebookActual && String(facebookActual.pageId) !== String(elegida.pagina.id)) throw new Error("PAGINA_CAMBIADA");
      const ahora = new Date();
      await db.collection(CONEXIONES).updateOne({ _id: `instagram:${intento.pedidoId}` }, {
        $set: {
          pedidoId: intento.pedidoId, plataforma: "instagram", estado: "conectada",
          instagramId: elegida.instagramId, usuario: elegida.usuario,
          pageId: String(elegida.pagina.id), permisos: [...concedidos].filter(p => PERMISOS_IG.includes(p)),
          tokenPaginaCifrado: tokenCifrado, actualizadoEn: ahora,
        },
        $setOnInsert: { conectadoEn: ahora },
      }, { upsert: true });
    });
    return vista("Instagram conectado al pedido", `La cuenta @${elegida.usuario} quedó vinculada al pedido. La prueba gratuita todavía no comenzó.`);
  } catch (error) {
    // Diagnóstico seguro: sin URL completa, code OAuth, correos, access tokens ni
    // mensajes de Meta (pueden contener información sensible).
    const http = Number.isSafeInteger(error?.http) ? error.http : null;
    const metaCode = Number.isSafeInteger(error?.metaCode) ? error.metaCode : null;
    const metaSubcode = Number.isSafeInteger(error?.metaSubcode) ? error.metaSubcode : null;
    const detalleSeguro = ["RED_META", "TOKEN_APP_O_FORMATO", "REDIRECCION_META"].includes(error?.detalleSeguro) ? error.detalleSeguro : null;
    // Nunca mostrar error.message, tokens, codigo OAuth ni respuesta completa de Meta.
    console.warn("Comunidad Instagram: fallo de callback", { fase, http, metaCode, metaSubcode, detalleSeguro });
    const diagnostico = [fase, http !== null ? `HTTP-${http}` : null,
      metaCode !== null ? `META-${metaCode}` : null,
      metaSubcode !== null ? `SUB-${metaSubcode}` : null, detalleSeguro].filter(Boolean).join(" / ");
    return vista("No se pudo completar Instagram",
      `Meta autorizó el acceso, pero no se completó la conexión. Diagnóstico: ${diagnostico}. Compartí solamente este diagnóstico para revisar el fallo.`, 502);
  }
}

export async function ejecutarConexionInstagramPedido(request, env) {
  const url = new URL(request.url);
  if (!ORIGENES.has(url.origin)) return responder({ ok: false, error: "Dominio no autorizado." }, 403);
  if (url.pathname === CALLBACK) return callback(request, env, url);
  if (url.pathname === `${BASE}/iniciar`) return iniciar(request, env, url);
  if (url.pathname === `${BASE}/estado`) return estado(request, env, url);
  if (url.pathname === `${BASE}/desconectar`) return desconectar(request, env, url);
  return responder({ ok: false, error: "Ruta de Instagram no disponible." }, 404);
}
