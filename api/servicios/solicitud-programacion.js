// Solicitud y autorización anticipada de programación: NUNCA inicia pruebas,
// crea reservas ejecutables, programa el cron, ni contacta a Meta.
import crypto from "node:crypto";
import { obtenerClienteRegistrado } from "./clientes-acceso.js";

const DB = "andres_imprimibles";
const BASE = "/api/servicios/publicaciones/solicitud";
const COLECCION = "solicitudes_programacion_servicios";
const ID = /^SER-[a-f0-9-]{36}$/i;
const HUELLA = /^[a-f0-9]{64}$/;
const REDES = new Set(["facebook", "instagram"]);
const TIPOS = new Set(["reel", "imagen", "carrusel"]);
const DIAS = new Set(["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]);
const VERSION = "autorizacion-comunidad-semanal-v1";
const BLOQUEO_TEXTO = /(?:prueba interna|no publicar)/i;

function json(datos, status = 200) {
  return Response.json(datos, { status, headers: {
    "Cache-Control": "no-store", "Pragma": "no-cache", "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
  } });
}

async function abrirDB(env) {
  const { MongoClient } = await import("mongodb");
  const mongo = new MongoClient(env.MONGODB_URI);
  await mongo.connect();
  return mongo;
}

async function cuerpoCorto(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "") ||
      Number(request.headers.get("content-length") || 0) > 1024) return null;
  const texto = await request.text();
  if (texto.length > 1024) return null;
  try {
    const valor = JSON.parse(texto);
    return valor && typeof valor === "object" && !Array.isArray(valor) ? valor : null;
  } catch { return null; }
}

function esPruebaPendiente(p) {
  return p?.tipo === "publicaciones" && p.modalidadContratacion === "prueba_gratuita" &&
    p.metodoPago === "ninguno" && p.estadoPago === "no_requerido" &&
    p.estadoServicio === "sin_activar" && p.prueba?.estado === "pendiente_activacion" &&
    !p.prueba?.inicio && !p.activadoEn && !p.fechaInicioServicio && p.estado !== "cancelado";
}

export async function evaluarSolicitud(db, pedido) {
  const motivos = [];
  if (!esPruebaPendiente(pedido)) {
    return { lista: false, motivos: ["Este pedido no está habilitado para preparar la prueba gratuita."],
      revision: null, aprobados: false, cantidadEventos: 0, zonaHoraria: null };
  }
  const publicaciones = pedido.publicaciones;
  const redes = pedido.redes;
  if (!Array.isArray(publicaciones) || publicaciones.length !== 4 ||
      publicaciones.some((p, i) => p?.id !== `contenido-${i + 1}` || !TIPOS.has(p?.tipo))) {
    motivos.push("Completá la configuración de los cuatro contenidos.");
  }
  if (!Array.isArray(redes) || !redes.length || redes.length > 2 ||
      redes.some(r => !REDES.has(r)) || new Set(redes).size !== redes.length) {
    motivos.push("Revisá las redes sociales seleccionadas.");
  }
  try {
    if (!pedido.zonaHoraria || typeof pedido.zonaHoraria !== "string") throw new Error("ZONA");
    new Intl.DateTimeFormat("en-US", { timeZone: pedido.zonaHoraria });
  } catch { motivos.push("La zona horaria necesita corrección."); }

  if (Array.isArray(publicaciones) && publicaciones.length === 4) {
    const pares = new Set();
    for (const [indice, p] of publicaciones.entries()) {
      const etiqueta = `contenido ${indice + 1}`;
      if (!DIAS.has(p?.diaPreferido) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(p?.horaLocalPreferida || "")) {
        motivos.push(`Revisá el día y horario del ${etiqueta}.`);
      }
      const par = `${p?.diaPreferido}:${p?.horaLocalPreferida}`;
      if (pares.has(par)) motivos.push("Dos contenidos tienen el mismo día y horario.");
      pares.add(par);
      if ([p?.descripcion, p?.ctaFacebook, p?.ctaInstagram, p?.hashtags].some(x => BLOQUEO_TEXTO.test(String(x || "")))) {
        motivos.push(`El ${etiqueta} tiene indicaciones de prueba interna o de no publicar.`);
      }
    }
  }

  const archivos = await db.collection("archivos_servicios").find({ pedidoId: pedido.pedidoId, estado: "subido" })
    .project({ _id: 0, contenidoId: 1, posicion: 1, r2Key: 1, nombre: 1, tamano: 1, revision: 1 })
    .toArray();
  const normalizados = [...archivos].sort((a, b) =>
    `${a.contenidoId}:${String(a.posicion).padStart(3, "0")}`.localeCompare(`${b.contenidoId}:${String(b.posicion).padStart(3, "0")}`));
  if (Array.isArray(publicaciones) && publicaciones.length === 4) {
    for (const [indice, p] of publicaciones.entries()) {
      const asociados = archivos.filter(f => f.contenidoId === p?.id);
      const min = p?.tipo === "carrusel" ? 2 : 1;
      const max = p?.tipo === "carrusel" ? 10 : 1;
      if (asociados.length < min || asociados.length > max ||
          asociados.some(f => typeof f.r2Key !== "string" || f.r2Key.length < 8 ||
            !Number.isSafeInteger(f.tamano) || f.tamano <= 0 ||
            !Number.isInteger(f.posicion) || f.posicion < 0) ||
          new Set(asociados.map(a => a.posicion)).size !== asociados.length) {
        motivos.push(`Cargá los archivos completos del contenido ${indice + 1}.`);
      }
      if (asociados.some(f => f.revision === "rechazado")) {
        motivos.push(`El contenido ${indice + 1} tiene una corrección pendiente.`);
      }
    }
    if (archivos.some(f => !publicaciones.some(p => p.id === f.contenidoId))) {
      motivos.push("Hay archivos que no corresponden a los cuatro contenidos.");
    }
  }
  const conexiones = await db.collection("conexiones_meta_pedidos").find({
    pedidoId: pedido.pedidoId, plataforma: { $in: Array.isArray(redes) ? redes.filter(r => REDES.has(r)) : [] },
    estado: "conectada",
  }).project({ _id: 0, plataforma: 1, pageId: 1, instagramId: 1, tokenPaginaCifrado: 1 }).toArray();
  if (Array.isArray(redes) && redes.some(red => !conexiones.some(c => c.plataforma === red &&
      c.tokenPaginaCifrado?.algoritmo === "aes-256-gcm" && c.tokenPaginaCifrado?.contenido))) {
    motivos.push("Conectá todas las redes sociales elegidas.");
  }
  const facebook = conexiones.find(c => c.plataforma === "facebook");
  const instagram = conexiones.find(c => c.plataforma === "instagram");
  if (facebook && instagram && String(facebook.pageId || "") !== String(instagram.pageId || "")) {
    motivos.push("Facebook e Instagram deben corresponder a la misma página.");
  }
  const aprobados = motivos.length === 0 && pedido.estadoContenidos === "aprobados" &&
    archivos.length >= 4 && archivos.every(f => f.revision === "aprobado");
  const lista = motivos.length === 0;
  const revision = lista ? crypto.createHash("sha256").update(JSON.stringify({
    version: VERSION, pedidoId: pedido.pedidoId, redes, zonaHoraria: pedido.zonaHoraria,
    publicaciones: publicaciones.map(p => ({ id: p.id, tipo: p.tipo, formato: p.formato,
      dia: p.diaPreferido, hora: p.horaLocalPreferida, descripcion: p.descripcion,
      ctaFacebook: p.ctaFacebook, ctaInstagram: p.ctaInstagram, urlFacebook: p.urlFacebook,
      hashtags: p.hashtags, archivosSeleccionados: p.archivos })),
    archivos: normalizados.map(f => ({ contenidoId: f.contenidoId, posicion: f.posicion,
      r2Key: f.r2Key, nombre: f.nombre, tamano: f.tamano })),
    conexiones: conexiones.map(c => ({ plataforma: c.plataforma, pageId: String(c.pageId || ""),
      instagramId: String(c.instagramId || "") })).sort((a,b) => a.plataforma.localeCompare(b.plataforma)),
  })).digest("hex") : null;
  return { lista, motivos, revision, aprobados, cantidadEventos: Array.isArray(redes) ? 4 * redes.length : 0,
    zonaHoraria: pedido.zonaHoraria, redes: Array.isArray(redes) ? redes : [] };
}

function estadoRespuesta(pedidoId, evaluacion, doc) {
  const confirmada = doc?.estado === "solicitud_confirmada_pendiente_habilitacion";
  const vigente = Boolean(confirmada && evaluacion.lista && evaluacion.revision === doc.revision);
  return { ok: true, pedidoId, listaParaSolicitud: evaluacion.lista, motivos: evaluacion.motivos,
    aprobadosTecnicamente: evaluacion.aprobados, revision: evaluacion.revision,
    cantidadContenidos: 4, cantidadEventos: evaluacion.cantidadEventos,
    zonaHoraria: evaluacion.zonaHoraria, redes: evaluacion.redes,
    confirmada, vigente, requiereNuevaConfirmacion: Boolean(confirmada && !vigente),
    confirmadaEn: confirmada ? doc.confirmadaEn : null,
    estado: vigente ? (evaluacion.aprobados ? "aprobada_pendiente_habilitacion" : "en_revision") :
      confirmada ? "cambio_detectado" : "sin_solicitud",
    activada: false, publicacionHabilitada: false, diasConsumidos: 0 };
}

export async function ejecutarSolicitudProgramacion(request, env) {
  const url = new URL(request.url);
  const rutaEstado = url.pathname === `${BASE}/estado`;
  const rutaConfirmar = url.pathname === `${BASE}/confirmar`;
  const rutaRevocar = url.pathname === `${BASE}/revocar`;
  if (!rutaEstado && !rutaConfirmar && !rutaRevocar) return json({ ok: false, error: "Ruta inexistente." }, 404);
  if (request.method !== (rutaEstado ? "GET" : "POST")) return json({ ok: false, error: "Método no permitido." }, 405);
  if (!rutaEstado && (request.headers.get("origin") !== url.origin ||
      request.headers.get("x-comunidad-panel") !== "1")) return json({ ok: false, error: "Origen no autorizado." }, 403);
  const datos = rutaEstado ? { pedidoId: url.searchParams.get("pedidoId") } : await cuerpoCorto(request);
  if (!ID.test(datos?.pedidoId || "")) return json({ ok: false, error: "Pedido inválido." }, 400);
  if (rutaConfirmar && (datos.aceptoProgramacion !== true || !HUELLA.test(datos.revision || ""))) {
    return json({ ok: false, error: "Falta confirmar la autorización y su versión." }, 400);
  }
  if (rutaRevocar && datos.confirmarRevocacion !== true) {
    return json({ ok: false, error: "Confirmá la revocación." }, 400);
  }
  if (!env?.MONGODB_URI) return json({ ok: false, error: "Solicitud temporalmente no disponible." }, 503);
  let mongo;
  try {
    const cliente = await obtenerClienteRegistrado(request, env);
    if (!cliente?.id) return json({ ok: false, error: "Iniciá sesión con tu correo verificado." }, 401);
    mongo = await abrirDB(env);
    const db = mongo.db(DB);
    const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
    if (!pedido || pedido.clienteUsuarioId !== cliente.id) {
      return json({ ok: false, error: "Pedido no encontrado o sin autorización." }, 404);
    }
    if (!esPruebaPendiente(pedido)) return json({ ok: false, error: "El pedido no admite cambios en esta etapa." }, 409);
    const solicitudes = db.collection(COLECCION);
    if (rutaRevocar) {
      const actualizado = await solicitudes.updateOne({ _id: datos.pedidoId,
        estado: "solicitud_confirmada_pendiente_habilitacion" }, {
        $set: { estado: "revocada", publicacionHabilitada: false, revocadaEn: new Date() },
      });
      return json({ ok: true, revocada: Boolean(actualizado.modifiedCount),
        activada: false, publicacionHabilitada: false });
    }
    const evaluacion = await evaluarSolicitud(db, pedido);
    let doc = await solicitudes.findOne({ _id: datos.pedidoId });
    if (rutaConfirmar) {
      if (!evaluacion.lista) return json({ ok: false, error: "Completá los requisitos del pedido antes de confirmar.",
        motivos: evaluacion.motivos }, 409);
      if (datos.revision !== evaluacion.revision) return json({ ok: false,
        error: "Se modificaron los contenidos. Actualizá el resumen antes de confirmar." }, 409);
      if (doc?.estado === "solicitud_confirmada_pendiente_habilitacion" && doc.revision === evaluacion.revision) {
        return json(estadoRespuesta(datos.pedidoId, evaluacion, doc));
      }
      const ahora = new Date();
      // Reconfirmación explícita: sobrescribe solo el documento de solicitud.
      // Las aprobaciones y los eventos reservados se mantienen intactos.
      await solicitudes.updateOne({ _id: datos.pedidoId }, { $set: {
        pedidoId: datos.pedidoId, clienteUsuarioId: cliente.id,
        versionConsentimiento: VERSION, revision: evaluacion.revision,
        estado: "solicitud_confirmada_pendiente_habilitacion", publicacionHabilitada: false,
        aceptaProgramacionYPublicacionAlHabilitar: true, confirmadoEn: ahora, revocadaEn: null,
        cantidadEventos: evaluacion.cantidadEventos, redes: evaluacion.redes,
        zonaHoraria: evaluacion.zonaHoraria,
        activadoEn: null, publicacionesRealizadas: 0,
      }, $setOnInsert: { creadoEn: ahora } }, { upsert: true });
      doc = await solicitudes.findOne({ _id: datos.pedidoId });
    }
    return json(estadoRespuesta(datos.pedidoId, evaluacion, doc));
  } catch (error) {
    console.warn("Solicitud Comunidad Semanal:", error?.code || error?.name || "ERROR");
    return json({ ok: false, error: "No fue posible consultar o registrar la solicitud." }, 503);
  } finally { if (mongo) await mongo.close().catch(() => {}); }
}
