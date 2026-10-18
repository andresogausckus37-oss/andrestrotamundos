// Vinculacion de prueba de Meta Pages para Redes en Piloto.
// Conserva solo el token cifrado de esa pagina en MongoDB. No publica contenido.
// El acceso sigue limitado a la sesion de administrador existente.
import crypto from "node:crypto";

const VERSION_META = "v26.0";
const URI_RETORNO = "https://andrestrotamundos.andresogausckus37.workers.dev/api/servicios/meta/callback";
const COOKIE_ESTADO = "__Host-redes_piloto_meta_estado";
const RUTA_INICIAR = "/api/admin/servicios/meta/iniciar";
const PERMISOS = "pages_show_list,pages_read_engagement,pages_manage_posts";
const ID_PAGINA_PRUEBA = "1369462529585300";
const ID_CONEXION_PRUEBA = `prueba_admin:facebook:${ID_PAGINA_PRUEBA}`;
const COLECCION_CONEXIONES = "conexiones_meta_pruebas";

function paginaHtml(titulo, contenido, estado = 200) {
  const documento = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title><style>body{margin:0;background:#f5f5f5;color:#242424;font:16px system-ui,-apple-system,sans-serif}main{max-width:660px;margin:40px auto;padding:24px;background:white;border:1px solid #e5e5e5;border-radius:8px}h1{font-size:22px;font-weight:600}h2{font-size:17px;font-weight:600}p,li{line-height:1.55}section{border:1px solid #e5e5e5;border-radius:8px;padding:12px 16px;margin:12px 0}a{color:#bf5b12}.nota{color:#666;font-size:14px}code{overflow-wrap:anywhere}</style></head><body><main><h1>${escapar(titulo)}</h1>${contenido}<p><a href="/admin">Volver a Administración</a></p></main></body></html>`;
  return new Response(documento, {
    status: estado,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Pragma": "no-cache",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    },
  });
}

function escapar(valor) {
  return String(valor).replace(/[&<>"']/g, caracter => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[caracter]);
}

function cookieEstado(request) {
  const cookies = request.headers.get("cookie") || "";
  const parte = cookies.split(";").map(s => s.trim()).find(s => s.startsWith(`${COOKIE_ESTADO}=`));
  return parte ? parte.slice(COOKIE_ESTADO.length + 1) : "";
}

function establecerCookie(respuesta, valor, borrar = false) {
  respuesta.headers.set("Set-Cookie", `${COOKIE_ESTADO}=${valor}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${borrar ? 0 : 600}`);
  return respuesta;
}

function iguales(a, b) {
  if (!/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}

function textoSeguroMeta(error) {
  const codigo = Number(error?.code);
  return Number.isInteger(codigo) && codigo > 0 && codigo < 100000
    ? `Meta rechazó la solicitud (código ${codigo}). Revisá la app y los permisos.`
    : "Meta rechazó la solicitud. Revisá la configuración de la aplicación.";
}

async function leerRespuestaMeta(respuesta) {
  let json;
  try { json = await respuesta.json(); }
  catch { throw new Error("RESPUESTA_INVALIDA"); }
  if (!respuesta.ok || json?.error) {
    const error = new Error("ERROR_META");
    error.codigoMeta = json?.error?.code;
    throw error;
  }
  return json;
}

// La clave se configura exclusivamente en Secrets del Worker. No se exporta a React.
function claveCifradoMeta(env) {
  const valor = String(env?.SERVICIO_META_CIFRADO_KEY ?? "").trim();
  return /^[a-f0-9]{64}$/i.test(valor) ? Buffer.from(valor, "hex") : null;
}

function cifrarTokenPagina(token, clave) {
  if (typeof token !== "string" || token.length < 20 || token.length > 8192) {
    throw new Error("TOKEN_PAGINA_INVALIDO");
  }
  const iv = crypto.randomBytes(12);
  const cifrador = crypto.createCipheriv("aes-256-gcm", clave, iv);
  const cifrado = Buffer.concat([cifrador.update(token, "utf8"), cifrador.final()]);
  return {
    algoritmo: "aes-256-gcm",
    iv: iv.toString("base64"),
    contenido: cifrado.toString("base64"),
    etiqueta: cifrador.getAuthTag().toString("base64"),
  };
}

async function conColeccionConexiones(env, operacion) {
  if (!env?.MONGODB_URI) throw new Error("MONGODB_NO_CONFIGURADO");
  const { MongoClient } = await import("mongodb");
  const cliente = new MongoClient(env.MONGODB_URI);
  try {
    await cliente.connect();
    const coleccion = cliente.db("andres_imprimibles").collection(COLECCION_CONEXIONES);
    return await operacion(coleccion);
  } finally {
    await cliente.close().catch(() => {});
  }
}

async function leerEstadoConexion(env) {
  return conColeccionConexiones(env, coleccion => coleccion.findOne(
    { _id: ID_CONEXION_PRUEBA, ambito: "prueba_admin" },
    { projection: { nombre: 1, pageId: 1, tareas: 1, estado: 1, conectadoEn: 1, actualizadoEn: 1 } },
  ));
}

async function guardarConexionPrueba(env, pagina, tokenCifrado) {
  const fecha = new Date();
  const tareas = Array.isArray(pagina.tasks)
    ? pagina.tasks.filter(v => typeof v === "string" && v.length <= 80).slice(0, 30)
    : [];
  await conColeccionConexiones(env, coleccion => coleccion.updateOne(
    { _id: ID_CONEXION_PRUEBA },
    {
      $set: {
        ambito: "prueba_admin", plataforma: "facebook", estado: "conectada",
        pageId: ID_PAGINA_PRUEBA, nombre: String(pagina.name || "Redes en Piloto").slice(0, 160),
        tareas, tokenPaginaCifrado: tokenCifrado,
        asociadoAPedido: false, pedidoId: null,
        actualizadoEn: fecha,
      },
      $setOnInsert: { conectadoEn: fecha },
    },
    { upsert: true },
  ));
}

function mostrarEstadoConexion(conexion) {
  if (!conexion) {
    return `<p>No hay una conexión de prueba guardada.</p><p><a href="${RUTA_INICIAR}">Autorizar Redes en Piloto</a></p>`;
  }
  const fecha = conexion.actualizadoEn ? new Date(conexion.actualizadoEn).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : "No disponible";
  return `<section><h2>${escapar(conexion.nombre || "Redes en Piloto")}</h2>` +
    `<p>ID: <code>${escapar(conexion.pageId || "")}</code></p>` +
    `<p>Estado: <strong>${escapar(conexion.estado || "")}</strong></p>` +
    `<p class="nota">Actualizada: ${escapar(fecha)}</p>` +
    `<p class="nota">Tareas informadas: ${escapar(Array.isArray(conexion.tareas) ? conexion.tareas.join(", ") : "No informadas")}</p></section>` +
    `<p class="nota">Conexión de prueba administrativa. No está asociada a pedidos y no permite publicar contenido.</p>` +
    `<form method="post" action="${RUTA_INICIAR}?accion=desconectar"><button type="submit">Eliminar conexión guardada</button></form>` +
    `<p><a href="${RUTA_INICIAR}">Renovar autorización con Meta</a></p>`;
}

async function intercambiarTokenLargo(appId, appSecret, tokenCorto) {
  const cuerpo = new URLSearchParams({
    grant_type: "fb_exchange_token", client_id: appId,
    client_secret: appSecret, fb_exchange_token: tokenCorto,
  });
  const respuesta = await leerRespuestaMeta(await fetch(
    `https://graph.facebook.com/${VERSION_META}/oauth/access_token`,
    { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: cuerpo },
  ));
  if (!respuesta?.access_token || typeof respuesta.access_token !== "string") {
    throw new Error("TOKEN_LARGO_INVALIDO");
  }
  return respuesta.access_token;
}

export async function ejecutarPruebaConexionMeta(request, env, adminAutorizado) {
  const url = new URL(request.url);
  const esInicio = url.pathname === RUTA_INICIAR;
  const esRetorno = url.pathname === new URL(URI_RETORNO).pathname;
  if (!esInicio && !esRetorno) {
    return paginaHtml("Ruta no disponible", "<p>La ruta solicitada no existe.</p>", 404);
  }

  if (url.origin !== new URL(URI_RETORNO).origin) {
    return paginaHtml("Dominio no permitido", "<p>Accedé desde el subdominio workers.dev configurado en Meta.</p>", 403);
  }

  // Las operaciones de Admin exigen su cookie. El retorno de Meta usa el
  // state seguro del flujo OAuth (la cookie Admin SameSite=Strict no viaja).
  if (esInicio && !adminAutorizado) {
    return paginaHtml("Acceso no autorizado", "<p>Iniciá sesión en Administración antes de conectar la página.</p>", 401);
  }

  if (esInicio && request.method === "POST" && url.searchParams.get("accion") === "desconectar") {
    // Esta mutación no puede iniciarse desde otro sitio, ni por un GET.
    if (request.headers.get("origin") !== url.origin) {
      return paginaHtml("Origen no autorizado", "<p>Volvé a abrir Administración y repetí la operación.</p>", 403);
    }
    try {
      await conColeccionConexiones(env, coleccion => coleccion.deleteOne({
        _id: ID_CONEXION_PRUEBA, ambito: "prueba_admin",
      }));
      return paginaHtml("Conexión de prueba eliminada",
        "<p>Se borró el token cifrado de nuestra base de datos. La autorización concedida a Meta puede revocarse también desde Integraciones comerciales de Facebook.</p>");
    } catch {
      return paginaHtml("No se pudo desconectar", "<p>No se pudo eliminar el registro de MongoDB.</p>", 500);
    }
  }

  if (request.method !== "GET") {
    return paginaHtml("Método no permitido", "<p>Esta acción no admite ese método.</p>", 405);
  }

  if (esInicio && url.searchParams.get("accion") === "estado") {
    try {
      return paginaHtml("Estado de la conexión con Meta", mostrarEstadoConexion(await leerEstadoConexion(env)));
    } catch {
      return paginaHtml("Estado no disponible", "<p>No fue posible consultar MongoDB.</p>", 503);
    }
  }

  const appId = String(env?.SERVICIO_META_APP_ID ?? "").trim();
  const appSecret = String(env?.SERVICIO_META_APP_SECRET ?? "").trim();
  const configId = String(env?.SERVICIO_META_CONFIG_ID ?? "").trim();
  const appIdValido = /^\d{5,30}$/.test(appId);
  const appSecretDisponible = Boolean(appSecret);
  const configIdValido = !configId || /^\d{5,30}$/.test(configId);
  const claveCifrado = claveCifradoMeta(env);
  if (!appIdValido || !appSecretDisponible || !configIdValido || !claveCifrado || !env?.MONGODB_URI) {
    // Solo estados, nunca valores, secretos ni tokens.
    const estado = valido => valido ? "OK" : "NO CONFIGURADO";
    return paginaHtml("Configuración pendiente",
      `<p>Revisá los requisitos de la conexión de prueba:</p><ul>` +
      `<li><code>SERVICIO_META_APP_ID</code>: ${estado(appIdValido)}</li>` +
      `<li><code>SERVICIO_META_APP_SECRET</code>: ${estado(appSecretDisponible)}</li>` +
      `<li><code>SERVICIO_META_CONFIG_ID</code>: ${estado(configIdValido)}</li>` +
      `<li><code>SERVICIO_META_CIFRADO_KEY</code>: ${estado(Boolean(claveCifrado))}</li>` +
      `<li><code>MONGODB_URI</code>: ${estado(Boolean(env?.MONGODB_URI))}</li>` +
      `</ul><p class="nota">Los valores y los tokens permanecen ocultos.</p>`, 503);
  }

  if (esInicio) {
    const estado = crypto.randomBytes(32).toString("hex");
    const destino = new URL(`https://www.facebook.com/${VERSION_META}/dialog/oauth`);
    destino.searchParams.set("client_id", appId);
    destino.searchParams.set("redirect_uri", URI_RETORNO);
    destino.searchParams.set("response_type", "code");
    if (configId) {
      destino.searchParams.set("config_id", configId);
      destino.searchParams.set("override_default_response_type", "true");
    } else {
      destino.searchParams.set("scope", PERMISOS);
    }
    destino.searchParams.set("state", estado);
    return establecerCookie(new Response(null, {
      status: 302,
      headers: { Location: destino.toString(), "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
    }), estado);
  }

  const estado = url.searchParams.get("state") || "";
  const guardado = cookieEstado(request);
  const respondido = (titulo, cuerpo, status) =>
    establecerCookie(paginaHtml(titulo, cuerpo, status), "", true);
  if (!iguales(estado, guardado)) {
    return respondido("Autorización vencida", "<p>La verificación de seguridad no coincide o venció. Volvé a iniciar el proceso.</p>", 403);
  }
  if (url.searchParams.has("error")) {
    return respondido("Autorización cancelada", "<p>Meta no concedió la autorización. Podés intentarlo nuevamente.</p>", 400);
  }
  const codigo = url.searchParams.get("code") || "";
  if (!codigo || codigo.length > 4000) {
    return respondido("Código inválido", "<p>Meta no devolvió un código de autorización válido.</p>", 400);
  }

  try {
    const parametros = new URLSearchParams({
      client_id: appId, client_secret: appSecret,
      redirect_uri: URI_RETORNO, code: codigo,
    });
    const token = await leerRespuestaMeta(await fetch(
      `https://graph.facebook.com/${VERSION_META}/oauth/access_token`,
      { method: "POST", body: parametros, headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    ));
    if (!token?.access_token || typeof token.access_token !== "string") throw new Error("TOKEN_INVALIDO");

    // Obtener el token de la página a partir de un token de usuario extendido.
    // Solo se conserva cifrado el token de Redes en Piloto; no se almacena el del usuario.
    const tokenLargo = await intercambiarTokenLargo(appId, appSecret, token.access_token);
    const paginasUrl = new URL(`https://graph.facebook.com/${VERSION_META}/me/accounts`);
    paginasUrl.searchParams.set("fields", "id,name,tasks,access_token");
    paginasUrl.searchParams.set("limit", "100");
    const listado = await leerRespuestaMeta(await fetch(paginasUrl, {
      headers: { Authorization: `Bearer ${tokenLargo}` },
    }));
    const paginas = Array.isArray(listado.data) ? listado.data : [];
    const pagina = paginas.find(p => p.id === ID_PAGINA_PRUEBA);
    if (!pagina) {
      return respondido("Página no autorizada",
        "<p>Meta no devolvió Redes en Piloto. Revisá que hayas autorizado exclusivamente esa página.</p>", 422);
    }
    const tareas = Array.isArray(pagina.tasks) ? pagina.tasks : [];
    if (!tareas.includes("CREATE_CONTENT") && !tareas.includes("PROFILE_PLUS_CREATE_CONTENT")) {
      return respondido("Permisos insuficientes",
        "<p>Meta no informó permiso de creación de contenidos para esta página.</p>", 403);
    }
    const cifrado = cifrarTokenPagina(pagina.access_token, claveCifrado);
    await guardarConexionPrueba(env, pagina, cifrado);
    return respondido("Conexión de Meta guardada",
      `<p>La página <strong>${escapar(pagina.name || "Redes en Piloto")}</strong> quedó registrada de forma cifrada en MongoDB.</p>` +
      `<p>ID: <code>${ID_PAGINA_PRUEBA}</code></p>` +
      `<p class="nota">Esta es únicamente una conexión administrativa de prueba. No está asociada a ningún pedido y no realizará publicaciones.</p>` +
      `<p><a href="${RUTA_INICIAR}?accion=estado">Consultar estado de la conexión</a></p>`, 200);
  } catch (error) {
    // No registrar códigos OAuth, tokens, secretos ni respuestas completas de Meta.
    const mensaje = error?.message === "ERROR_META"
      ? textoSeguroMeta({ code: error.codigoMeta })
      : "No fue posible completar y guardar la conexión de Meta.";
    return respondido("No se pudo guardar la conexión",
      `<p>${escapar(mensaje)}</p><p>Revisá la autorización y los permisos de la aplicación.</p>`, 502);
  }
}
