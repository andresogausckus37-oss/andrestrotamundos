// Servicio independiente: archivos multimedia privados por pedido. Nunca publica en Meta.
// Los archivos se suben en partes a R2 y se referencian desde MongoDB.
import crypto from "node:crypto";
import { MongoClient } from "mongodb";

const DB = "andres_imprimibles";
const PART_SIZE = 8 * 1024 * 1024;
const MAX_IMAGE = 20 * 1024 * 1024;
const MAX_VIDEO = 150 * 1024 * 1024;
const VENCE_MS = 24 * 60 * 60 * 1000;
const RUTA = "/api/servicios/publicaciones/archivos";
const RUTA_ADMIN = "/api/admin/servicios/publicaciones/archivos";
const VALID_ID = /^SER-[0-9a-f-]{36}$/i;
const VALID_TOKEN = /^[0-9a-f]{64}$/i;
const TIPOS = new Set(["image/jpeg", "image/png", "image/webp", "video/mp4"]);

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
function fallo(message, status = 400) { return json({ ok: false, error: message }, status); }
function errorSeguro(err) {
  if (err?.status && err?.publico) return fallo(err.publico, err.status);
  console.error("Error en archivos privados de servicio:", err?.message || "Error interno");
  return fallo("No se pudo procesar el archivo del pedido.", 503);
}
function lanzar(mensaje, status) { const e = new Error(mensaje); e.status = status; e.publico = mensaje; throw e; }
function validarId(id) { return typeof id === "string" && VALID_ID.test(id); }
function validarContenido(id) { return /^contenido-[1-4]$/.test(id || ""); }
function validarPosicion(v) { if (typeof v !== "string" && typeof v !== "number") return null; const n = Number(v); return Number.isInteger(n) && n >= 0 && n < 10 ? n : null; }
function tiempo() { return new Date(); }
function bucket(env) {
  if (!env?.SERVICIOS_CONTENIDOS_R2?.createMultipartUpload || !env?.SERVICIOS_CONTENIDOS_R2?.get) {
    lanzar("Falta configurar el bucket privado SERVICIOS_CONTENIDOS_R2.", 503);
  }
  return env.SERVICIOS_CONTENIDOS_R2;
}
function nombreSeguro(nombre) {
  const limpio = String(nombre || "").replace(/[\\/\0-\x1f\x7f]/g, "_").trim();
  if (!limpio || limpio.length > 180) lanzar("El nombre del archivo no es válido.", 400);
  return limpio;
}
function maxPosiciones(tipo) { return tipo === "carrusel" ? 10 : 1; }
function tipoValido(tipoContenido, mime) {
  return TIPOS.has(mime) && (tipoContenido === "reel" ? mime === "video/mp4" : mime !== "video/mp4");
}
function firmaCorrecta(bytes, mime) {
  if (bytes.length < 12) return false;
  if (mime === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png") return [137,80,78,71,13,10,26,10].every((n,i) => bytes[i] === n);
  if (mime === "image/webp") return String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP";
  if (mime === "video/mp4") return String.fromCharCode(...bytes.slice(4,8)) === "ftyp";
  return false;
}
function idArchivo(pedidoId, contenidoId, posicion) { return `${pedidoId}:${contenidoId}:${posicion}`; }
function preparacionAutorizada(pedido) {
  const gratis = pedido?.modalidadContratacion === "prueba_gratuita" &&
    pedido?.estadoPago === "no_requerido" && pedido?.metodoPago === "ninguno" &&
    pedido?.prueba?.estado === "pendiente_activacion";
  const pago = pedido?.estadoPago === "confirmado" && Boolean(pedido?.pagadoEn);
  return (gratis || pago) && pedido?.estadoServicio === "sin_activar";
}

function permisoPedido(pedido, escritura) {
  if (!pedido || pedido.tipo !== "publicaciones" || !Array.isArray(pedido.publicaciones) || pedido.publicaciones.length !== 4) lanzar("Pedido no encontrado.", 404);
  if (escritura && (!preparacionAutorizada(pedido) || pedido.estadoContenidos === "aprobados")) {
    lanzar("La carga requiere un pedido habilitado y contenidos todavía no aprobados.", 403);
  }
}
function accesoCliente(request, pedido) {
  const token = /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "")?.[1];
  if (!token || !VALID_TOKEN.test(pedido?.tokenAccesoHash)) return false;
  const calculado = crypto.createHash("sha256").update(token).digest();
  return crypto.timingSafeEqual(calculado, Buffer.from(pedido.tokenAccesoHash, "hex"));
}
async function conDb(env, fn) {
  if (!env?.MONGODB_URI) lanzar("MongoDB no está configurado.", 503);
  const client = new MongoClient(env.MONGODB_URI);
  try { await client.connect(); return await fn(client.db(DB)); }
  finally { await client.close().catch(() => {}); }
}
function publicacionesDelPedido(pedido) {
  return pedido.publicaciones.map(p => ({ id: p.id, tipo: p.tipo, descripcion: String(p.descripcion || "").slice(0,1500), diaPreferido: p.diaPreferido, horaLocalPreferida: p.horaLocalPreferida }));
}
async function leerJson(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) lanzar("Se requiere JSON.", 415);
  if (Number(request.headers.get("content-length") || 0) > 4096) lanzar("Solicitud demasiado grande.", 413);
  const texto = await request.text();
  if (texto.length > 4096) lanzar("Solicitud demasiado grande.", 413);
  try { const valor = JSON.parse(texto); if (valor && !Array.isArray(valor) && typeof valor === "object") return valor; }
  catch { /* inválido */ }
  lanzar("JSON inválido.", 400);
}
async function buscarPedido(db, request, pedidoId, escritura = false) {
  if (!validarId(pedidoId)) lanzar("Pedido inválido.", 400);
  const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId, tipo: "publicaciones" });
  if (!pedido || !accesoCliente(request, pedido)) lanzar("Pedido no encontrado o acceso no autorizado.", 404);
  permisoPedido(pedido, escritura);
  return pedido;
}
async function estadoArchivos(db, pedido) {
  const archivos = await db.collection("archivos_servicios").find({ pedidoId: pedido.pedidoId, estado: "subido" })
    .project({ _id:0, contenidoId:1, posicion:1, nombre:1, tipo:1, tamano:1, revision:1, motivoRevision:1, subidoEn:1 }).sort({ contenidoId:1, posicion:1 }).toArray();
  return { ok: true, pedidoId: pedido.pedidoId, habilitada: preparacionAutorizada(pedido) && pedido.estadoContenidos !== "aprobados", estadoContenidos: pedido.estadoContenidos || "pendiente_carga", publicaciones: publicacionesDelPedido(pedido), archivos };
}
async function actualizarEstado(db, pedidoId) {
  const pedidos = db.collection("pedidos_servicios");
  const pedido = await pedidos.findOne({ pedidoId, tipo: "publicaciones" });
  if (!pedido) return;
  const archivos = await db.collection("archivos_servicios").find({ pedidoId, estado: "subido" }).project({ contenidoId:1, revision:1 }).toArray();
  const completos = pedido.publicaciones.length === 4 && pedido.publicaciones.every(p => {
    const n = archivos.filter(a => a.contenidoId === p.id).length;
    return n >= (p.tipo === "carrusel" ? 2 : 1) && n <= maxPosiciones(p.tipo);
  });
  const aprobados = completos && archivos.every(a => a.revision === "aprobado");
  const correcciones = archivos.some(a => a.revision === "rechazado");
  const nuevo = correcciones ? "correccion_solicitada" : aprobados ? "aprobados" : completos ? "pendiente_revision" : archivos.length ? "en_preparacion" : "pendiente_carga";
  await pedidos.updateOne({ _id: pedido._id, estadoServicio: "sin_activar" }, { $set: { estadoContenidos: nuevo, archivosSubidos: completos, actualizadoEn: tiempo() } });
}
async function iniciar(request, env, db) {
  const input = await leerJson(request);
  const pedido = await buscarPedido(db, request, input.pedidoId, true);
  const p = pedido.publicaciones.find(p => p.id === input.contenidoId);
  const posicion = validarPosicion(input.posicion);
  if (!p || !validarContenido(input.contenidoId) || posicion === null || posicion >= maxPosiciones(p.tipo)) lanzar("Contenido o posición no válidos.", 400);
  const nombre = nombreSeguro(input.nombre);
  const tipo = String(input.tipo || "").toLowerCase();
  const tamano = input.tamano;
  if (!tipoValido(p.tipo, tipo) || !Number.isSafeInteger(tamano) || tamano < 12 || tamano > (tipo === "video/mp4" ? MAX_VIDEO : MAX_IMAGE)) {
    lanzar("Formato o tamaño incorrecto. Se admiten imágenes de 20 MB o videos MP4 de 150 MB como máximo.", 400);
  }
  const id = idArchivo(input.pedidoId, input.contenidoId, posicion);
  const archivos = db.collection("archivos_servicios");
  const previo = await archivos.findOne({ _id:id });
  if (previo?.revision === "aprobado") lanzar("El material aprobado no puede reemplazarse.", 409);
  const cargas = db.collection("cargas_archivos_servicios");
  const anterior = await cargas.findOne({ _id:id });
  // Si el usuario cerró el navegador a mitad de una carga, permitir reemplazarla.
  // Solo las cargas que están finalizando en R2 requieren revisión antes de reintentar.
  if (anterior?.estado === "finalizando") lanzar("Esta carga está finalizando. Consultá el estado antes de reintentar.", 409);
  if (anterior) {
    await env.SERVICIOS_CONTENIDOS_R2.resumeMultipartUpload(anterior.r2Key, anterior.uploadId).abort().catch(() => {});
    await cargas.deleteOne({ _id:id });
  }
  const r2 = bucket(env);
  const r2Key = `contenidos/publicaciones/${input.pedidoId}/${input.contenidoId}/${posicion}/${crypto.randomUUID()}`;
  const carga = await r2.createMultipartUpload(r2Key, { httpMetadata: { contentType: tipo } });
  const cargaId = crypto.randomUUID();
  try {
    await cargas.insertOne({ _id:id, pedidoId:input.pedidoId, contenidoId:input.contenidoId, posicion, nombre, tipo, tamano, r2Key, uploadId:carga.uploadId, cargaId, estado:"abierta", partes:{}, creadaEn:tiempo(), expiraEn:new Date(Date.now()+VENCE_MS) });
  } catch (e) {
    await carga.abort().catch(() => {});
    if (e?.code === 11000) lanzar("Ya existe una carga en curso.", 409);
    throw e;
  }
  return json({ ok:true, cargaId, tamanoParte:PART_SIZE, totalPartes:Math.ceil(tamano/PART_SIZE) }, 201);
}
async function subirParte(request, env, db, url) {
  const pedidoId = url.searchParams.get("pedidoId");
  const cargaId = url.searchParams.get("cargaId");
  const numero = Number(url.searchParams.get("numero"));
  await buscarPedido(db, request, pedidoId, true);
  if (!/^[0-9a-f-]{36}$/i.test(cargaId || "") || !Number.isInteger(numero) || numero < 1 || numero > 19) lanzar("Parte no válida.", 400);
  const sesion = await db.collection("cargas_archivos_servicios").findOne({ pedidoId, cargaId, estado:"abierta" });
  if (!sesion || new Date(sesion.expiraEn).getTime() < Date.now()) lanzar("La carga no existe o expiró.", 404);
  const total = Math.ceil(sesion.tamano/PART_SIZE);
  if (numero > total) lanzar("Número de parte inválido.", 400);
  const longitud = numero === total ? sesion.tamano - PART_SIZE*(total-1) : PART_SIZE;
  if (Number(request.headers.get("content-length")) !== longitud) lanzar("El tamaño de esta parte no coincide.", 413);
  if (!/^application\/octet-stream(?:;|$)/i.test(request.headers.get("content-type") || "")) lanzar("Formato de transferencia incorrecto.", 415);
  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength !== longitud) lanzar("Parte incompleta.", 400);
  if (numero === 1 && !firmaCorrecta(bytes, sesion.tipo)) lanzar("El archivo no coincide con su formato declarado.", 415);
  const r2 = bucket(env);
  const parte = await r2.resumeMultipartUpload(sesion.r2Key, sesion.uploadId).uploadPart(numero, bytes);
  await db.collection("cargas_archivos_servicios").updateOne({ _id:sesion._id, cargaId, estado:"abierta" }, { $set: { [`partes.${numero}`]: { partNumber:numero, etag:parte.etag, tamano:longitud } } });
  return json({ ok:true, numero, total });
}
async function finalizar(request, env, db) {
  const input = await leerJson(request);
  await buscarPedido(db, request, input.pedidoId, true);
  const carga = await db.collection("cargas_archivos_servicios").findOne({ pedidoId:input.pedidoId, cargaId:input.cargaId, estado:"abierta" });
  if (!carga || new Date(carga.expiraEn).getTime() < Date.now()) lanzar("La carga no existe o expiró.", 404);
  const total = Math.ceil(carga.tamano/PART_SIZE);
  const partes = Array.from({length:total},(_,i)=>carga.partes?.[i+1]);
  if (partes.some((p,i) => !p || p.partNumber !== i+1 || !p.etag || p.tamano !== (i+1===total ? carga.tamano-PART_SIZE*(total-1) : PART_SIZE))) {
    lanzar("Faltan partes por subir.", 409);
  }
  const cargas = db.collection("cargas_archivos_servicios");
  const bloqueo = await cargas.updateOne({ _id:carga._id, cargaId:carga.cargaId, estado:"abierta" }, { $set: { estado:"finalizando" } });
  if (bloqueo.modifiedCount !== 1) lanzar("Otra operación está finalizando esta carga.", 409);
  const r2 = bucket(env);
  try {
    await r2.resumeMultipartUpload(carga.r2Key,carga.uploadId).complete(partes.map(p=>({partNumber:p.partNumber, etag:p.etag})));
    const objeto = await r2.head(carga.r2Key);
    if (!objeto || objeto.size !== carga.tamano) lanzar("R2 no confirmó el archivo completo.", 503);
    const coleccion = db.collection("archivos_servicios");
    const anterior = await coleccion.findOne({ _id:carga._id });
    if (anterior?.revision === "aprobado") lanzar("No se puede reemplazar un archivo aprobado.", 409);
    await coleccion.updateOne({ _id:carga._id }, { $set: { pedidoId:carga.pedidoId, contenidoId:carga.contenidoId, posicion:carga.posicion, nombre:carga.nombre, tipo:carga.tipo, tamano:carga.tamano, r2Key:carga.r2Key, estado:"subido", revision:"pendiente", motivoRevision:"", revisadoEn:null, subidoEn:tiempo() } }, { upsert:true });
    await cargas.deleteOne({ _id:carga._id, cargaId:carga.cargaId });
    await actualizarEstado(db,carga.pedidoId);
    if (anterior?.r2Key && anterior.r2Key !== carga.r2Key) await r2.delete(anterior.r2Key).catch(() => {});
    return json({ ok:true, mensaje:"Archivo guardado para revisión." });
  } catch (error) {
    // Si ya se completó en R2, mantener el registro para diagnóstico administrativo.
    const existe = await r2.head(carga.r2Key).catch(() => null);
    if (!existe) await cargas.updateOne({ _id:carga._id, estado:"finalizando" }, { $set:{ estado:"abierta" } }).catch(() => {});
    throw error;
  }
}
async function cancelar(request, env, db) {
  const input = await leerJson(request);
  await buscarPedido(db, request, input.pedidoId, true);
  const carga = await db.collection("cargas_archivos_servicios").findOne({ pedidoId:input.pedidoId, cargaId:input.cargaId, estado:"abierta" });
  if (!carga) return json({ok:true});
  await bucket(env).resumeMultipartUpload(carga.r2Key,carga.uploadId).abort().catch(() => {});
  await db.collection("cargas_archivos_servicios").deleteOne({ _id:carga._id, cargaId:carga.cargaId });
  return json({ok:true});
}
async function eliminar(request, env, db) {
  const input = await leerJson(request);
  await buscarPedido(db, request, input.pedidoId, true);
  const posicion = validarPosicion(input.posicion);
  if (!validarContenido(input.contenidoId) || posicion === null) lanzar("Archivo inválido.",400);
  const id = idArchivo(input.pedidoId,input.contenidoId,posicion);
  const archivos = db.collection("archivos_servicios");
  const archivo = await archivos.findOne({ _id:id, pedidoId:input.pedidoId });
  if (!archivo) lanzar("Archivo no encontrado.",404);
  if (archivo.revision === "aprobado") lanzar("El archivo aprobado no se puede eliminar.",409);
  const resultado = await archivos.deleteOne({ _id:id, revision:{$ne:"aprobado"} });
  if (!resultado.deletedCount) lanzar("El estado del archivo cambió. Actualizá el pedido.",409);
  await actualizarEstado(db,input.pedidoId);
  await bucket(env).delete(archivo.r2Key).catch(() => {});
  return json({ok:true});
}
export async function ejecutarArchivosPedido(request, env) {
  try {
    const url = new URL(request.url);
    const accion = url.pathname.slice(RUTA.length+1);
    const metodos = {estado:"GET",iniciar:"POST",parte:"PUT",finalizar:"POST",cancelar:"POST",eliminar:"POST"};
    if (!(accion in metodos)) return fallo("Ruta no disponible.",404);
    if (request.method !== metodos[accion]) return fallo("Método no permitido.",405);
    bucket(env);
    return await conDb(env, async db => {
      if (accion === "estado") { const pedido = await buscarPedido(db,request,url.searchParams.get("pedidoId")); return json(await estadoArchivos(db,pedido)); }
      if (accion === "iniciar") return iniciar(request,env,db);
      if (accion === "parte") return subirParte(request,env,db,url);
      if (accion === "finalizar") return finalizar(request,env,db);
      if (accion === "cancelar") return cancelar(request,env,db);
      return eliminar(request,env,db);
    });
  } catch(e) { return errorSeguro(e); }
}
function escapar(s) { return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]); }
function html(titulo, cuerpo, status=200) {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title><style>body{margin:0;background:#f5f5f5;color:#252525;font:15px system-ui}main{max-width:800px;margin:24px auto;background:white;padding:24px;border-radius:10px}section{border:1px solid #ddd;border-radius:9px;padding:16px;margin:14px 0}input,button,select,textarea{padding:9px;margin:4px}textarea{display:block;width:calc(100% - 28px);max-width:620px;min-height:80px;font:inherit}form{margin:12px 0}img,video{max-width:100%;max-height:350px}a{color:#b85f12}small{color:#666}</style></head><body><main><h1>${escapar(titulo)}</h1>${cuerpo}<p><a href="/admin">Volver a Administración</a></p></main></body></html>`, {status,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","Referrer-Policy":"no-referrer","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});
}
// Token antifalsificacion para formularios de revision de Administración.
// Mantiene la proteccion CSRF aunque el navegador omita Origin en un POST.
const DURACION_REVISION_SEGUNDOS = 30 * 60;
function firmaRevision(env, pedidoId, contenidoId, posicion, marca) {
  const clave = String(env?.ADMIN_PASSWORD ?? "");
  if (!clave) return "";
  const datos = `revision-archivos-v1\n${pedidoId}\n${contenidoId}\n${posicion}\n${marca}`;
  return crypto.createHmac("sha256", clave).update(datos).digest("hex");
}
function tokenRevision(env, pedidoId, contenidoId, posicion) {
  const marca = Math.floor(Date.now() / 1000);
  return `${marca}.${firmaRevision(env, pedidoId, contenidoId, posicion, marca)}`;
}
function tokenRevisionValido(env, pedidoId, contenidoId, posicion, valor) {
  const coincidencia = /^(\d{10,12})\.([a-f0-9]{64})$/.exec(String(valor || ""));
  if (!coincidencia) return false;
  const marca = Number(coincidencia[1]);
  const ahora = Math.floor(Date.now() / 1000);
  if (!Number.isSafeInteger(marca) || marca > ahora + 60 || ahora - marca > DURACION_REVISION_SEGUNDOS) return false;
  const esperada = firmaRevision(env, pedidoId, contenidoId, posicion, marca);
  return /^[a-f0-9]{64}$/.test(esperada) && crypto.timingSafeEqual(Buffer.from(coincidencia[2], "hex"), Buffer.from(esperada, "hex"));
}
function origenRevisionAceptable(request, url) {
  const origen = request.headers.get("origin");
  // Algunos navegadores aplican Referrer-Policy: no-referrer y envian Origin: null.
  // En todos los casos se requiere tambien el token CSRF firmado.
  if (origen && origen !== "null" && origen !== url.origin) return false;
  const contexto = request.headers.get("sec-fetch-site");
  if (contexto && contexto !== "same-origin") return false;
  return true;
}
export async function ejecutarAdminArchivosPedido(request, env, autorizado) {
  if (!autorizado) return html("Acceso no autorizado","<p>Iniciá sesión en Administración.</p>",401);
  const url = new URL(request.url);
  const pedidoId = url.searchParams.get("pedidoId");
  try {
    bucket(env);
    if (request.method === "GET") {
      if (!pedidoId) return html("Revisión de contenidos",`<p>Ingresá el código del pedido.</p><form method="get"><input name="pedidoId" placeholder="SER-..." required><button>Buscar pedido</button></form>`);
      if (!validarId(pedidoId)) return html("Pedido incorrecto","<p>El código es inválido.</p>",400);
      return await conDb(env, async db => {
        const pedido = await db.collection("pedidos_servicios").findOne({pedidoId,tipo:"publicaciones"});
        if (!pedido) return html("Pedido no encontrado","<p>No existe ese pedido.</p>",404);
        const pos = validarPosicion(url.searchParams.get("posicion"));
        const contenidoId = url.searchParams.get("contenidoId");
        if (url.searchParams.get("accion") === "ver") {
          if (!validarContenido(contenidoId) || pos === null) return html("Archivo incorrecto","<p>Parámetros inválidos.</p>",400);
          const archivo = await db.collection("archivos_servicios").findOne({ _id:idArchivo(pedidoId,contenidoId,pos), estado:"subido" });
          if (!archivo) return html("No disponible","<p>Archivo no encontrado.</p>",404);
          // Soporta Range para reproducir videos desde el navegador móvil sin
          // descargar el MP4 completo en cada solicitud.
          const rangoCabecera = request.headers.get("range");
          let rango = null;
          if (rangoCabecera) {
            const m = /^bytes=(\d+)-(\d*)$/.exec(rangoCabecera);
            if (!m) return new Response(null, { status:416,headers:{"Content-Range":`bytes */${archivo.tamano}`} });
            const inicio = Number(m[1]);
            const fin = m[2] ? Number(m[2]) : archivo.tamano-1;
            if (!Number.isSafeInteger(inicio) || !Number.isSafeInteger(fin) || inicio>fin || fin>=archivo.tamano) {
              return new Response(null, { status:416,headers:{"Content-Range":`bytes */${archivo.tamano}`} });
            }
            rango = { offset:inicio,length:fin-inicio+1 };
          }
          const objeto = await bucket(env).get(archivo.r2Key, rango ? {range:rango} : undefined);
          if (!objeto) return html("No disponible","<p>Archivo privado no encontrado en R2.</p>",404);
          const headers = {"Content-Type":archivo.tipo,"Content-Disposition":"inline","Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'","Accept-Ranges":"bytes","Content-Length":String(rango?rango.length:archivo.tamano)};
          if (rango) headers["Content-Range"] = `bytes ${rango.offset}-${rango.offset+rango.length-1}/${archivo.tamano}`;
          return new Response(objeto.body,{ status:rango?206:200,headers });
        }
        const archivos = await db.collection("archivos_servicios").find({pedidoId,estado:"subido"}).sort({contenidoId:1,posicion:1}).toArray();
        const tarjetas = pedido.publicaciones.map(p => {
          const lista = archivos.filter(a=>a.contenidoId===p.id);
          return `<section><h2>${escapar(p.id)} · ${escapar(p.tipo)}</h2><p>${escapar(p.descripcion || "Sin descripción")}</p>${lista.length ? lista.map(a => {
            const enlace = `${RUTA_ADMIN}?pedidoId=${encodeURIComponent(pedidoId)}&accion=ver&contenidoId=${encodeURIComponent(p.id)}&posicion=${a.posicion}`;
            const medio = a.tipo.startsWith("image/") ? `<img src="${escapar(enlace)}" alt="${escapar(a.nombre)}">` : `<video src="${escapar(enlace)}" controls preload="none"></video>`;
            const csrf = tokenRevision(env, pedidoId, p.id, a.posicion);
            const campos = `<input type="hidden" name="pedidoId" value="${escapar(pedidoId)}"><input type="hidden" name="contenidoId" value="${escapar(p.id)}"><input type="hidden" name="posicion" value="${a.posicion}"><input type="hidden" name="csrfRevision" value="${escapar(csrf)}">`;
            const motivoAnterior = a.revision === "rechazado" && a.motivoRevision ? `<p><small>Motivo técnico: ${escapar(a.motivoRevision)}</small></p>` : "";
            return `<div><p><strong>${escapar(a.nombre)}</strong> · ${Math.ceil(a.tamano/1024)} KB · ${a.revision === "rechazado" ? "Corrección solicitada" : escapar(a.revision)}</p>${motivoAnterior}${medio}` +
              `<form action="${RUTA_ADMIN}" method="post">${campos}<button name="revision" value="aprobado">Aprobar técnicamente</button></form>` +
              `<form action="${RUTA_ADMIN}" method="post">${campos}<label>Motivo técnico de la corrección (obligatorio, de 10 a 500 caracteres)<textarea name="motivoRevision" minlength="10" maxlength="500" required placeholder="Ej.: El archivo MP4 no puede reproducirse; volvé a exportarlo."></textarea></label><button name="revision" value="rechazado">Solicitar corrección</button></form></div>`;
          }).join("") : "<p><small>Todavía no hay archivos para este contenido.</small></p>"}</section>`;
        }).join("");
        return html("Revisión de contenidos",`<p>Pedido: <code>${escapar(pedidoId)}</code></p><p>Pago: <strong>${escapar(pedido.estadoPago)}</strong> · Contenidos: <strong>${escapar(pedido.estadoContenidos)}</strong></p>${pedidoId === "SER-7ebdd0fa-4795-4cd9-a688-a72a1e26b937" ? `<p><a href="/api/admin/servicios/publicaciones/activacion-simulada?pedidoId=${encodeURIComponent(pedidoId)}">Simular activación de 7 días (sin publicar)</a></p>` : ""}${tarjetas}<small>Aprobar archivos no activa ni programa publicaciones.</small>`);
      });
    }
    if (request.method === "POST") {
      if (!origenRevisionAceptable(request, url)) return html("Origen no autorizado","<p>Volvé a abrir la pantalla de revisión.</p>",403);
      if (Number(request.headers.get("content-length") || 0)>2048) return html("Solicitud grande","<p>Solicitud inválida.</p>",413);
      const cuerpo = await request.text();
      if (cuerpo.length > 2048) return html("Solicitud grande","<p>Solicitud inválida.</p>",413);
      const form = new URLSearchParams(cuerpo);
      const pid = form.get("pedidoId"), cid = form.get("contenidoId"), pos = validarPosicion(form.get("posicion")), revision = form.get("revision");
      if (!validarId(pid) || !validarContenido(cid) || pos===null || !["aprobado","rechazado"].includes(revision)) return html("Revisión inválida","<p>Datos incorrectos.</p>",400);
      if (!tokenRevisionValido(env, pid, cid, pos, form.get("csrfRevision"))) return html("Revisión vencida","<p>Volvé a abrir la pantalla de revisión y repetí la acción.</p>",403);
      const motivoRevision = typeof form.get("motivoRevision") === "string" ? form.get("motivoRevision").trim() : "";
      if (revision === "rechazado" && (motivoRevision.length < 10 || motivoRevision.length > 500)) {
        return html("Motivo necesario","<p>Explicá el problema técnico o de cumplimiento en 10 a 500 caracteres. No se revisan preferencias creativas.</p>",400);
      }
      return await conDb(env, async db => {
        const pedido = await db.collection("pedidos_servicios").findOne({pedidoId:pid,tipo:"publicaciones"});
        if (!pedido || !preparacionAutorizada(pedido)) return html("Pedido no habilitado","<p>Se requiere un pedido habilitado y todavía no activado.</p>",403);
        const result = await db.collection("archivos_servicios").updateOne({ _id:idArchivo(pid,cid,pos), pedidoId:pid, estado:"subido" },{ $set:{ revision, motivoRevision: revision === "rechazado" ? motivoRevision : "", revisadoEn:tiempo() } });
        if (!result.matchedCount) return html("Archivo no encontrado","<p>El archivo ya no existe.</p>",404);
        await actualizarEstado(db,pid);
        return Response.redirect(`${url.origin}${RUTA_ADMIN}?pedidoId=${encodeURIComponent(pid)}`,303);
      });
    }
    return html("Método inválido","<p>Operación no admitida.</p>",405);
  } catch (e) { console.error("Error revisión de contenidos:",e?.message || "Error"); return html("Revisión no disponible","<p>No fue posible revisar los archivos.</p>",503); }
}
