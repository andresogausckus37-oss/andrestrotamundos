// Consola privada para la PRIMERA prueba real con contenido promocional propio.
// Aislada de los pedidos, su calendario, el cron y las cuentas de Mega Bazar.
// El envío a Meta queda DESHABILITADO por defecto mediante una variable nueva.
import crypto from "node:crypto";

const BASE = "/api/admin/servicios/publicaciones/piloto-meta";
const MEDIA_BASE = "/api/servicios/piloto-meta/media/";
const ORIGEN = "https://andreshousesitter.com";
const DB = "andres_imprimibles";
const PEDIDO = "SER-7ebdd0fa-4795-4cd9-a688-a72a1e26b937";
const PAGE_ID = "1369462529585300";
const USUARIO_IG = "redesenpiloto";
const FOTOS = "piezas_promocionales_piloto";
const INTENTOS = "envios_promocionales_piloto";
const MAX_IMAGEN = 8 * 1024 * 1024;
const VERSION = "v26.0";
const REDES = new Set(["facebook", "instagram"]);
const CONFIRMACION = "PUBLICAR EN REDES EN PILOTO";
const EXPIRACION_FIRMA = 4 * 60 * 60;
const ID = /^[a-f0-9-]{36}$/i;

const esc = s => String(s ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const headers = tipo => ({
  "Content-Type": tipo, "Cache-Control": "private, no-store", "Pragma": "no-cache",
  // La consola usa formularios POST nativos. Con no-referrer el navegador
  // puede enviar Origin: null y fallaria la validacion de mismo origen.
  // same-origin conserva Origin en formularios internos y no filtra Referer
  // al navegar a otros sitios. La comprobacion estricta de POST se mantiene.
  "Referrer-Policy": "same-origin", "X-Content-Type-Options": "nosniff",
  "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
});
function html(titulo, contenido, status = 200) {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(titulo)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f6f7f9;color:#20252b;font:14px/1.55 system-ui,-apple-system,sans-serif}
  main{max-width:960px;margin:35px auto;padding:24px;background:white;border:1px solid #e1e5ea;border-radius:14px}
  h1{font-size:23px;line-height:1.3}h2{font-size:17px;margin:25px 0 10px}.muted{color:#64748b}.info{background:#f1f5f9;padding:13px;border-radius:8px;margin:12px 0}
  .item{padding:17px 0;border-top:1px solid #e5e7eb}.fields{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  input[type=text],textarea,input[type=file]{display:block;max-width:100%;width:100%;padding:9px;margin:7px 0 12px;border:1px solid #cbd5e1;border-radius:7px;font:inherit}
  textarea{min-height:98px}button{border:1px solid #334155;background:#334155;color:#fff;border-radius:7px;padding:8px 12px;font:inherit;cursor:pointer}
  .danger{background:#7f1d1d;border-color:#7f1d1d}a{color:#1d4ed8}small{color:#64748b}.pill{display:inline-block;background:#f1f5f9;border-radius:15px;padding:3px 9px}
  img{max-width:200px;max-height:150px;object-fit:contain;border:1px solid #ddd;border-radius:6px}
  form{margin:10px 0}label{font-weight:550}.inline{display:inline-block;margin-right:10px}
  </style></head><body><main>${contenido}</main></body></html>`, { status, headers: headers("text/html; charset=utf-8") });
}
function error(mensaje, estado = 400) {
  return html("Preparación del piloto", `<h1>No se pudo completar la operación</h1><p>${esc(mensaje)}</p><a href="${BASE}">Volver a la consola</a>`, estado);
}
function volver(mensaje) { return Response.redirect(`${ORIGEN}${BASE}?mensaje=${encodeURIComponent(mensaje)}`, 303); }
function bandera(env) { return String(env?.SERVICIO_PILOTO_META_ENVIO_REAL ?? "").toLowerCase() === "true"; }
function bucket(env) {
  const b = env?.SERVICIOS_CONTENIDOS_R2;
  if (!b?.get || !b?.put || !b?.head) throw new Error("BUCKET_NO_CONFIGURADO");
  return b;
}
function firmaKey(env) {
  const key = String(env?.SERVICIO_META_CIFRADO_KEY ?? "");
  if (!/^[a-f0-9]{64}$/i.test(key)) throw new Error("FIRMA_NO_CONFIGURADA");
  return Buffer.from(key, "hex");
}
function firmaImagen(env, id, vence) {
  return crypto.createHmac("sha256", firmaKey(env)).update(`piloto-meta-imagen-v1:${id}:${vence}`).digest("hex");
}
function urlFirmada(env, id) {
  const vence = Math.floor(Date.now() / 1000) + EXPIRACION_FIRMA;
  const sig = firmaImagen(env, id, vence);
  return `${ORIGEN}${MEDIA_BASE}${id}.jpg?v=${vence}&s=${sig}`;
}
async function abrirDb(env) {
  if (!env?.MONGODB_URI) throw new Error("DB_NO_CONFIGURADA");
  const { MongoClient } = await import("mongodb");
  const client = new MongoClient(env.MONGODB_URI);
  await client.connect();
  return client;
}
function cuentaValida(c, red) {
  if (!c || c.estado !== "conectada" || c.plataforma !== red ||
      String(c.pageId) !== PAGE_ID || c.tokenPaginaCifrado?.algoritmo !== "aes-256-gcm" ||
      !c.tokenPaginaCifrado?.iv || !c.tokenPaginaCifrado?.contenido || !c.tokenPaginaCifrado?.etiqueta) return false;
  if (red === "instagram") return /^@?redesenpiloto$/i.test(String(c.usuario || "")) && /^\d{5,30}$/.test(String(c.instagramId || "")) &&
    ["instagram_basic", "instagram_content_publish"].every(p => c.permisos?.includes(p));
  return Array.isArray(c.tareas) && (c.tareas.includes("CREATE_CONTENT") || c.tareas.includes("PROFILE_PLUS_CREATE_CONTENT"));
}
async function conexiones(db) {
  const docs = await db.collection("conexiones_meta_pedidos").find({ pedidoId: PEDIDO, plataforma: { $in: ["facebook", "instagram"] } }).toArray();
  const fb = docs.find(c => c._id === `facebook:${PEDIDO}`);
  const ig = docs.find(c => c._id === `instagram:${PEDIDO}`);
  return { facebook: cuentaValida(fb, "facebook") ? fb : null, instagram: cuentaValida(ig, "instagram") ? ig : null };
}
function tokenDescifrado(registro, env) {
  const x = registro.tokenPaginaCifrado;
  const dec = crypto.createDecipheriv("aes-256-gcm", firmaKey(env), Buffer.from(x.iv, "base64"));
  dec.setAuthTag(Buffer.from(x.etiqueta, "base64"));
  const texto = Buffer.concat([dec.update(Buffer.from(x.contenido, "base64")), dec.final()]).toString("utf8");
  if (texto.length < 20 || texto.length > 8192) throw new Error("TOKEN_INVALIDO");
  return texto;
}
function campos(request) {
  if (!/^application\/x-www-form-urlencoded(?:;|$)/i.test(request.headers.get("content-type") || "")) return null;
  const n = Number(request.headers.get("content-length") || 0);
  if (n > 4096) return null;
  return request.text().then(t => t.length <= 4096 ? Object.fromEntries(new URLSearchParams(t)) : null);
}
async function crearFoto(request, env, db) {
  if (!/^multipart\/form-data(?:;|$)/i.test(request.headers.get("content-type") || "")) return error("Se requiere subir una imagen JPEG.", 415);
  const largo = Number(request.headers.get("content-length") || 0);
  if (largo > MAX_IMAGEN + 8192) return error("La imagen supera los 8 MB permitidos.", 413);
  const formulario = await request.formData();
  const archivo = formulario.get("imagen");
  if (!(archivo instanceof File) || archivo.type !== "image/jpeg" || archivo.size < 512 || archivo.size > MAX_IMAGEN) {
    return error("Subí una imagen JPEG válida, de hasta 8 MB.", 400);
  }
  const bytes = new Uint8Array(await archivo.arrayBuffer());
  if (bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 ||
      bytes[bytes.length - 2] !== 255 || bytes[bytes.length - 1] !== 217) return error("El archivo no tiene la firma correcta de un JPEG.");
  const id = crypto.randomUUID();
  const key = `promociones-piloto/${id}.jpg`;
  await bucket(env).put(key, bytes, { httpMetadata: { contentType: "image/jpeg" } });
  await db.collection(FOTOS).insertOne({ _id: id, pedidoId: PEDIDO, r2Key: key, mimetype: "image/jpeg",
    nombre: String(archivo.name || "imagen.jpg").replace(/[\\/\u0000-\u001f\u007f]/g, "_").slice(0, 120),
    tamano: bytes.length, texto: "", estado: "sin_texto", creadoEn: new Date() });
  return volver("Imagen privada cargada. Escribí y guardá el texto antes de la prueba real.");
}
async function guardarTexto(request, db) {
  const data = await campos(request);
  if (!ID.test(data?.id || "")) return error("Identificador de imagen incorrecto.");
  const texto = String(data.texto || "").trim();
  if (texto.length < 20 || texto.length > 1500 || /(?:PRUEBA INTERNA|NO PUBLICAR|LOREM IPSUM)/i.test(texto)) {
    return error("Ingresá un texto promocional real de 20 a 1500 caracteres, sin indicaciones de prueba interna.");
  }
  const actualizado = await db.collection(FOTOS).updateOne({ _id: data.id, pedidoId: PEDIDO,
    bloqueadoEn: { $exists: false } }, { $set: { texto, estado: "borrador", actualizadoEn: new Date() } });
  if (!actualizado.matchedCount) return error("La pieza no existe o quedó bloqueada al iniciar un envío.", 409);
  return volver("Texto guardado. El material sigue privado y sin publicar.");
}
function metaError(respuesta, datos) {
  const ex = new Error("META_NO_CONFIRMADO");
  ex.http = respuesta.status;
  ex.codigo = Number.isSafeInteger(datos?.error?.code) ? datos.error.code : null;
  return ex;
}
async function graph(ruta, token, formulario = null) {
  const response = await fetch(`https://graph.facebook.com/${VERSION}/${ruta}`, {
    method: formulario ? "POST" : "GET", redirect: "manual", headers: {
      Authorization: `Bearer ${token}`,
      ...(formulario ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
    }, ...(formulario ? { body: new URLSearchParams(formulario) } : {}),
  });
  // No seguir redirecciones con tokens; no introducir tokens en la URL.
  if (response.status >= 300 && response.status < 400) throw metaError(response, null);
  let data;
  try { data = await response.json(); } catch { throw metaError(response, null); }
  if (!response.ok || data?.error) throw metaError(response, data);
  return data;
}
function enlaceMeta(value) {
  try {
    const u = new URL(value);
    if (u.protocol === "https:" && ["www.facebook.com", "facebook.com", "www.instagram.com", "instagram.com"].includes(u.hostname)) return u.toString();
  } catch { /* No devolver URLs externas arbitrarias. */ }
  return null;
}
async function guardarPublicada(db, intento, metaId, token) {
  let enlace = null;
  try {
    const dato = await graph(`${metaId}?fields=${intento.red === "instagram" ? "permalink" : "link"}`, token);
    enlace = enlaceMeta(dato.permalink || dato.link);
  } catch { /* La publicación se considera hecha aunque falle la consulta del permalink. */ }
  await db.collection(INTENTOS).updateOne({ _id: intento._id }, { $set: {
    estado: "publicada", metaId, enlace, terminadaEn: new Date(), actualizadoEn: new Date(),
  } });
}
async function publicarInstagramContenedor(db, intento, registro, token) {
  const contenedor = intento.contenedorId;
  if (!/^\d{5,30}$/.test(String(contenedor || ""))) throw new Error("CONTENEDOR_INVALIDO");
  const status = await graph(`${contenedor}?fields=status_code`, token);
  if (status.status_code !== "FINISHED") {
    if (["ERROR", "EXPIRED"].includes(status.status_code)) {
      await db.collection(INTENTOS).updateOne({ _id: intento._id }, { $set: { estado: "contenedor_error", actualizadoEn: new Date() } });
      return "contenedor_error";
    }
    await db.collection(INTENTOS).updateOne({ _id: intento._id }, { $set: { estado: "contenedor_pendiente", actualizadoEn: new Date() } });
    return "contenedor_pendiente";
  }
  // Exclusión mutua antes del único media_publish. Nunca reintentar si el resultado fue incierto.
  const reclamo = await db.collection(INTENTOS).updateOne({ _id: intento._id,
    estado: "contenedor_pendiente" }, { $set: { estado: "publicacion_iniciada_resultado_incierto", actualizadoEn: new Date() } });
  if (!reclamo.modifiedCount) return "operacion_ya_reclamada";
  const publicado = await graph(`${registro.instagramId}/media_publish`, token, { creation_id: contenedor });
  if (!/^\d{5,30}$/.test(String(publicado?.id || ""))) throw new Error("META_ID_INVALIDO");
  await guardarPublicada(db, intento, String(publicado.id), token);
  return "publicada";
}
async function enviar(request, env, db, continuar = false) {
  // El interruptor es obligatorio incluso para /continuar, que llama a Meta.
  if (!bandera(env)) return error("Los envíos reales siguen deshabilitados. Diseñaremos y revisaremos primero las piezas promocionales.", 403);
  const data = await campos(request);
  const red = continuar ? "instagram" : String(data?.red || "");
  if (!ID.test(data?.id || "") || !REDES.has(red)) return error("Seleccioná una pieza y una red válida.");
  if (data.confirmacion !== CONFIRMACION) return error(`Escribí exactamente: ${CONFIRMACION}.`);
  const foto = await db.collection(FOTOS).findOne({ _id: data.id, pedidoId: PEDIDO });
  if (!foto || foto.estado !== "borrador" || !foto.texto || foto.mimetype !== "image/jpeg") {
    return error("Primero prepará una imagen y un texto promocional reales.", 409);
  }
  if (!await bucket(env).head(foto.r2Key)) return error("La imagen ya no está disponible en R2.", 409);
  const todas = await conexiones(db);
  if (!todas.facebook || !todas.instagram || !todas[red]) return error("Las dos conexiones piloto deben corresponder a Redes en Piloto y @redesenpiloto.", 409);
  const c = todas[red];
  const intentoId = `${foto._id}:${red}`;
  const intentos = db.collection(INTENTOS);
  let intento;
  if (continuar) {
    intento = await intentos.findOne({ _id: intentoId });
    if (!intento || intento.estado !== "contenedor_pendiente") return error("No hay un contenedor de Instagram pendiente de continuar.", 409);
  } else {
    // Congelar la pieza antes de crear el intento. Otra red utiliza exactamente el mismo texto.
    await db.collection(FOTOS).updateOne({ _id: foto._id, bloqueadoEn: { $exists: false } },
      { $set: { bloqueadoEn: new Date() } });
    intento = { _id: intentoId, fotoId: foto._id, red, estado: "envio_iniciado_resultado_incierto",
      destino: red === "facebook" ? PAGE_ID : String(c.instagramId), creadoEn: new Date() };
    try { await intentos.insertOne(intento); }
    catch (err) {
      if (err?.code === 11000) return error("Ya existe un intento para esta imagen y red. No se repetirá automáticamente.", 409);
      throw err;
    }
  }
  try {
    const token = tokenDescifrado(c, env);
    if (red === "facebook") {
      const res = await graph(`${PAGE_ID}/photos`, token, { url: urlFirmada(env, foto._id),
        message: foto.texto, published: "true" });
      const mediaId = String(res.post_id || res.id || "");
      if (!/^\d{5,30}(?:_\d{5,30})?$/.test(mediaId)) throw new Error("META_ID_INVALIDO");
      await guardarPublicada(db, intento, mediaId, token);
      return volver("Facebook confirmó la publicación. Consultá el resultado abajo.");
    }
    if (!continuar) {
      const contenedor = await graph(`${c.instagramId}/media`, token, {
        image_url: urlFirmada(env, foto._id), caption: foto.texto,
      });
      if (!/^\d{5,30}$/.test(String(contenedor?.id || ""))) throw new Error("CONTENEDOR_INVALIDO");
      // Si fallara esta escritura, NO repetir la creación del contenedor.
      await intentos.updateOne({ _id: intentoId }, { $set: { contenedorId: String(contenedor.id),
        estado: "contenedor_pendiente", actualizadoEn: new Date() } });
      intento.contenedorId = String(contenedor.id);
    }
    const estado = await publicarInstagramContenedor(db, intento, c, token);
    return volver(estado === "publicada" ? "Instagram confirmó la publicación." :
      estado === "contenedor_pendiente" ? "Instagram está procesando la imagen. Podés consultar y continuar manualmente, sin recrear el contenedor." :
      "Instagram no confirmó la publicación. Revisá el estado antes de cualquier nueva acción.");
  } catch (err) {
    // Cualquier respuesta inesperada queda bloqueada. NO REINTENTAR envíos de forma automática.
    // En contenedor_pendiente: no modificar el estado, una comprobación posterior es segura.
    await intentos.updateOne({ _id: intentoId,
      estado: { $nin: ["publicada", "contenedor_pendiente", "contenedor_error"] } },
    { $set: { estado: "resultado_incierto_sin_reintento", actualizadoEn: new Date(),
      diagnostico: { http: Number.isInteger(err?.http) ? err.http : null,
        metaCodigo: Number.isInteger(err?.codigo) ? err.codigo : null } } }).catch(() => {});
    return error("Meta no confirmó el resultado. Por seguridad no se repetirá el envío; comprobá las publicaciones en la red y el registro técnico.", 502);
  }
}
function formularioPublicar(foto, red) {
  return `<form method="post" action="${BASE}/publicar"><input type="hidden" name="id" value="${esc(foto._id)}"><input type="hidden" name="red" value="${red}">
    <label>Escribí ${CONFIRMACION} para publicar realmente en ${red === "facebook" ? "Facebook" : "Instagram"}</label>
    <input type="text" name="confirmacion" autocomplete="off" required><button class="danger" type="submit">Publicar ahora en ${red === "facebook" ? "Facebook" : "Instagram"}</button></form>`;
}
async function pantalla(env, db, mensaje) {
  const todos = await conexiones(db);
  const datos = await db.collection(FOTOS).find({ pedidoId: PEDIDO }).sort({ creadoEn: -1 }).limit(12).toArray();
  const estados = await db.collection(INTENTOS).find({ fotoId: { $in: datos.map(d => d._id) } }).toArray();
  const habilitado = bandera(env);
  const listo = Boolean(todos.facebook && todos.instagram);
  const tarjetas = datos.map(f => {
    const intentos = estados.filter(e => e.fotoId === f._id);
    const congelado = Boolean(f.bloqueadoEn);
    const intentoUI = intentos.map(e => `<p><strong>${esc(e.red)}</strong>: ${esc(e.estado)}${e.metaId ? ` · ID ${esc(e.metaId)}` : ""}
      ${e.enlace ? ` · <a rel="noopener noreferrer" href="${esc(e.enlace)}" target="_blank">Ver publicación</a>` : ""}
      ${e.estado === "contenedor_pendiente" && habilitado ? `<form method="post" action="${BASE}/continuar"><input type="hidden" name="id" value="${esc(f._id)}">
      <label>Escribí ${CONFIRMACION} para consultar el contenedor y continuar</label><input type="text" name="confirmacion" required autocomplete="off">
      <button type="submit">Continuar contenedor de Instagram</button></form>` : ""}</p>`).join("");
    const posibilidad = habilitado && listo && f.estado === "borrador" ? ["facebook", "instagram"].filter(red =>
      !intentos.some(e => e.red === red)).map(red => formularioPublicar(f, red)).join("") : "";
    return `<div class="item"><div class="fields"><img src="${esc(urlFirmada(env, f._id))}" alt="Imagen privada del piloto">
      <div><strong>${esc(f.nombre)}</strong><br><small>${esc(f._id)} · ${(f.tamano / 1024).toFixed(0)} KB</small><br>
      <span class="pill">${esc(f.estado)}${congelado ? " · congelada" : ""}</span></div></div>
      <form method="post" action="${BASE}/guardar"><input type="hidden" name="id" value="${esc(f._id)}">
      <label>Texto promocional definitivo</label><textarea name="texto" maxlength="1500" minlength="20" ${congelado ? "readonly" : "required"}>${esc(f.texto || "")}</textarea>
      ${congelado ? "<small>Contenido congelado tras iniciar una publicación.</small>" : '<button type="submit">Guardar texto</button>'}</form>
      ${intentoUI || "<p class='muted'>Sin intentos de publicación.</p>"}${posibilidad}</div>`;
  }).join("");
  return html("Publicaciones piloto de Meta", `<p><a href="/api/admin/servicios/publicaciones/activacion-simulada?pedidoId=${PEDIDO}">← Volver a la simulación</a></p>
    <h1>Publicaciones piloto · Meta</h1><p class="muted">Administración · Cuentas propias del servicio · Solo imágenes JPEG en esta primera etapa</p>
    ${mensaje ? `<div class="info">${esc(mensaje.slice(0, 220))}</div>` : ""}
    <div class="info"><strong>${habilitado ? "Envíos reales habilitados por variable privada" : "Envíos reales deshabilitados"}</strong><br>
    Los archivos que se carguen aquí son independientes de los cuatro contenidos genéricos del pedido.
    No se programa un cron, no se activa la prueba gratuita y no se toca Mega Bazar.
    ${habilitado ? "Antes de publicar, verificá visualmente cada imagen y su texto." : "Podés cargar contenido propio y preparar textos sin publicarlos."}</div>
    <h2>Conexiones autorizadas</h2><p>Facebook · Redes en Piloto: <strong>${todos.facebook ? "Vinculada" : "No disponible"}</strong><br>
    Instagram · @redesenpiloto: <strong>${todos.instagram ? "Vinculada" : "No disponible"}</strong></p>
    <h2>Cargar imagen promocional</h2><p class="muted">JPEG de hasta 8 MB. Se guarda en un espacio separado de R2, privado hasta que se autorice una prueba real.</p>
    <form method="post" action="${BASE}/subir" enctype="multipart/form-data"><label>Imagen JPEG</label><input type="file" name="imagen" accept="image/jpeg,.jpg,.jpeg" required>
    <button type="submit">Cargar imagen privada</button></form><h2>Piezas preparadas</h2>${tarjetas || "<p class='muted'>Todavía no cargaste imágenes promocionales.</p>"}
    <p class="muted"><small>Los envíos, cuando se habiliten expresamente, serán individuales por red y sin reintentos automáticos. Los resultados inciertos requieren revisión manual.</small></p>`);
}

// La URL firmada la consulta Meta para descargar la imagen, sin acceso a la cuenta admin.
// Solo expone UNA imagen JPEG durante un período acotado; R2 sigue siendo privado.
export async function ejecutarImagenPiloto(request, env) {
  const url = new URL(request.url);
  if (url.origin !== ORIGEN || !["GET", "HEAD"].includes(request.method)) return new Response(null, { status: 403 });
  const match = /^\/api\/servicios\/piloto-meta\/media\/([a-f0-9-]{36})\.jpg$/.exec(url.pathname);
  if (!match) return new Response(null, { status: 404 });
  const id = match[1], v = url.searchParams.get("v") || "", sig = url.searchParams.get("s") || "";
  const ahora = Math.floor(Date.now() / 1000);
  if (!/^\d{10}$/.test(v) || !/^[a-f0-9]{64}$/i.test(sig) || Number(v) < ahora || Number(v) > ahora + EXPIRACION_FIRMA) return new Response(null, { status: 403 });
  const esperado = firmaImagen(env, id, v);
  if (!crypto.timingSafeEqual(Buffer.from(esperado, "hex"), Buffer.from(sig, "hex"))) return new Response(null, { status: 403 });
  let mongo;
  try {
    mongo = await abrirDb(env);
    const foto = await mongo.db(DB).collection(FOTOS).findOne({ _id: id, pedidoId: PEDIDO });
    if (!foto || foto.r2Key !== `promociones-piloto/${id}.jpg`) return new Response(null, { status: 404 });
    const imagen = await bucket(env).get(foto.r2Key);
    if (!imagen) return new Response(null, { status: 404 });
    const h = { "Content-Type": "image/jpeg", "Content-Length": String(foto.tamano),
      "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" };
    return new Response(request.method === "HEAD" ? null : imagen.body, { status: 200, headers: h });
  } catch { return new Response(null, { status: 503 }); }
  finally { if (mongo) await mongo.close().catch(() => {}); }
}

// Solo sesión administrativa. Las operaciones POST exigen origen de primera parte.
export async function ejecutarPublicacionPiloto(request, env, autorizado) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(`${BASE}`) || url.origin !== ORIGEN) return error("Ruta no autorizada.", 403);
  if (!autorizado) return error("Iniciá sesión en Administración.", 401);
  if (request.method === "POST" && request.headers.get("origin") !== ORIGEN) return error("Origen no autorizado.", 403);
  const ruta = url.pathname.slice(BASE.length);
  if (request.method === "GET" && ruta !== "") return error("Ruta no disponible.", 404);
  if (request.method === "POST" && !["/subir", "/guardar", "/publicar", "/continuar"].includes(ruta)) return error("Ruta no disponible.", 404);
  if (request.method !== "GET" && request.method !== "POST") return error("Método no permitido.", 405);
  let mongo;
  try {
    mongo = await abrirDb(env);
    const db = mongo.db(DB);
    if (request.method === "GET") return await pantalla(env, db, url.searchParams.get("mensaje") || "");
    if (ruta === "/subir") return await crearFoto(request, env, db);
    if (ruta === "/guardar") return await guardarTexto(request, db);
    return await enviar(request, env, db, ruta === "/continuar");
  } catch (err) {
    console.warn("Piloto Meta Comunidad Semanal:", err?.code || err?.name || "ERROR");
    return error("No se pudo procesar la operación del piloto. Los envíos no se reintentan automáticamente.", 503);
  } finally { if (mongo) await mongo.close().catch(() => {}); }
}
