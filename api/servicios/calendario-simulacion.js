// Simulación y borrador NO PUBLICABLE de Comunidad Semanal. No activa la prueba,
// no invoca Graph API ni modifica el cron o los handlers de la tienda.
import crypto from "node:crypto";
import { obtenerClienteRegistrado } from "./clientes-acceso.js";

const DB = "andres_imprimibles";
const RUTA = "/api/servicios/publicaciones/calendario/simulacion";
const RUTA_PREPARAR = "/api/servicios/publicaciones/calendario/preparar";
const RUTA_ENSAYO = "/api/servicios/publicaciones/calendario/ensayo";
const RUTA_RESERVAR = "/api/servicios/publicaciones/calendario/reservar";
const EJECUCIONES = "ejecuciones_publicaciones_servicios";
const BORRADORES = "calendarios_borradores_servicios";
const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const ID_PEDIDO = /^SER-[a-f0-9-]{36}$/i;
const DIAS_REQUERIDOS = 7;
const MS_DIA = 86400000;
const REDES = new Set(["facebook", "instagram"]);

function json(data, status = 200) {
  return Response.json(data, { status, headers: {
    "Cache-Control": "no-store, max-age=0", "Pragma": "no-cache",
    "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff",
  } });
}

function tieneAcceso(request, pedido, cliente) {
  if (cliente?.id && pedido?.clienteUsuarioId === cliente.id) return true;
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(request.headers.get("authorization") || "");
  if (!match || !/^[a-f0-9]{64}$/i.test(pedido?.tokenAccesoHash || "")) return false;
  const calculado = crypto.createHash("sha256").update(match[1]).digest();
  return crypto.timingSafeEqual(calculado, Buffer.from(pedido.tokenAccesoHash, "hex"));
}

function componentes(fecha, zona) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(fecha);
  const obj = Object.fromEntries(partes.filter(p => p.type !== "literal").map(p => [p.type, Number(p.value)]));
  return { y: obj.year, m: obj.month, d: obj.day, h: obj.hour, min: obj.minute };
}

function fechaLocalUTC(y, m, d, h, min, zona) {
  // Ajuste de fecha civil a instante UTC, sin depender del huso del servidor.
  // Si un cambio de horario de verano hace inexistente una hora, devolvemos null.
  const esperado = Date.UTC(y, m - 1, d, h, min);
  let candidato = esperado;
  for (let intento = 0; intento < 5; intento++) {
    const parte = componentes(new Date(candidato), zona);
    const visto = Date.UTC(parte.y, parte.m - 1, parte.d, parte.h, parte.min);
    if (visto === esperado) return candidato;
    candidato += esperado - visto;
  }
  return null;
}

function diaDesdeUTC(y, m, d, delta) {
  const t = new Date(Date.UTC(y, m - 1, d + delta));
  return { y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    dia: DIAS[t.getUTCDay()] };
}

// Función pura y comprobable. Calcula los próximos 7 días DESDE el instante
// de consulta. Nunca persiste estas fechas ni inicia el período gratuito.
export function calcularCalendarioSimulado(pedido, ahora = new Date()) {
  const zona = pedido.zonaHoraria;
  if (typeof zona !== "string" || !zona || !Array.isArray(pedido.publicaciones) ||
      pedido.publicaciones.length !== 4 || !Array.isArray(pedido.redes) ||
      pedido.redes.length < 1 || pedido.redes.length > 2 ||
      pedido.redes.some(r => !REDES.has(r)) || new Set(pedido.redes).size !== pedido.redes.length) {
    throw new Error("CONFIGURACION_INVALIDA");
  }
  // Si la zona horaria guardada no existe, se rechaza sin suponer GMT o Argentina.
  new Intl.DateTimeFormat("en-US", { timeZone: zona }).format(ahora);
  const hoy = componentes(ahora, zona);
  const items = [];
  const advertencias = [];
  const inicio = ahora.getTime();
  const fin = inicio + DIAS_REQUERIDOS * MS_DIA;
  for (const [indice, p] of pedido.publicaciones.entries()) {
    const hora = /^(\d{2}):(\d{2})$/.exec(p.horaLocalPreferida || "");
    if (!hora || !DIAS.includes(p.diaPreferido) || Number(hora[1]) > 23 || Number(hora[2]) > 59) {
      advertencias.push(`El contenido ${indice + 1} tiene un día u horario incorrecto.`);
      continue;
    }
    let previsto = null;
    for (let delta = 0; delta <= DIAS_REQUERIDOS; delta++) {
      const civil = diaDesdeUTC(hoy.y, hoy.m, hoy.d, delta);
      if (civil.dia !== p.diaPreferido) continue;
      const instante = fechaLocalUTC(civil.y, civil.m, civil.d, +hora[1], +hora[2], zona);
      if (instante !== null && instante > inicio && instante <= fin) {
        previsto = { fechaHoraUTC: new Date(instante).toISOString(),
          fechaLocal: `${civil.y}-${String(civil.m).padStart(2, "0")}-${String(civil.d).padStart(2, "0")}`,
          horaLocal: p.horaLocalPreferida, dia: civil.dia };
        break;
      }
    }
    if (!previsto) {
      advertencias.push(`No se encontró un horario válido para el contenido ${indice + 1} en los próximos 7 días.`);
      continue;
    }
    for (const red of pedido.redes) {
      items.push({ id: `${p.id}:${red}`, contenidoId: p.id, numeroContenido: indice + 1,
        tipo: p.tipo, red, descripcion: String(p.descripcion || "").slice(0, 160),
        ...previsto, estado: "simulado" });
    }
  }
  items.sort((a, b) => a.fechaHoraUTC.localeCompare(b.fechaHoraUTC) || a.id.localeCompare(b.id));
  const horarios = new Set();
  for (const item of items) {
    const k = `${item.fechaHoraUTC}:${item.red}`;
    if (horarios.has(k)) advertencias.push(`Dos contenidos coinciden en ${item.red} el ${item.fechaLocal} a las ${item.horaLocal}.`);
    horarios.add(k);
  }
  if (pedido.publicaciones.some(p => /(?:prueba interna|no publicar)/i.test(p.descripcion || ""))) {
    advertencias.push("Hay textos de prueba interna o 'No publicar'. No deben utilizarse para una activación real.");
  }
  return { zonaHoraria: zona, ventanaInicioUTC: ahora.toISOString(),
    ventanaFinUTC: new Date(fin).toISOString(), eventos: items, advertencias };
}

function pruebaPendiente(pedido) {
  return pedido?.tipo === "publicaciones" && pedido?.modalidadContratacion === "prueba_gratuita" &&
    pedido?.metodoPago === "ninguno" && pedido?.estadoPago === "no_requerido" &&
    pedido?.estado !== "cancelado" && pedido?.estadoServicio === "sin_activar" &&
    pedido?.prueba?.estado === "pendiente_activacion" && !pedido?.prueba?.inicio &&
    !pedido?.activadoEn && !pedido?.fechaInicioServicio;
}

async function verificarCalendario(db, pedido, ahora = new Date()) {
  const pedidoId = pedido.pedidoId;
  const calendario = calcularCalendarioSimulado(pedido, ahora);
  const archivos = await db.collection("archivos_servicios").find({ pedidoId, estado: "subido" })
    .project({ contenidoId: 1, posicion: 1, nombre: 1, tamano: 1, r2Key: 1, revision: 1, _id: 0 }).toArray();
  const archivosAprobados = pedido.publicaciones.every(p => {
    const asociados = archivos.filter(a => a.contenidoId === p.id);
    return asociados.length >= (p.tipo === "carrusel" ? 2 : 1) &&
      asociados.length <= (p.tipo === "carrusel" ? 10 : 1) &&
      asociados.every(a => a.revision === "aprobado" && typeof a.r2Key === "string" && a.r2Key.length > 5);
  }) && archivos.every(a => pedido.publicaciones.some(p => p.id === a.contenidoId));
  const conexiones = await db.collection("conexiones_meta_pedidos").find({
    pedidoId, plataforma: { $in: pedido.redes }, estado: "conectada",
  }).project({ _id: 0, plataforma: 1, pageId: 1, instagramId: 1, actualizadoEn: 1,
    tokenPaginaCifrado: 1, estado: 1 }).toArray();
  const redesConectadas = pedido.redes.every(red => conexiones.some(c => c.plataforma === red));
  const facebook = conexiones.find(c => c.plataforma === "facebook");
  const instagram = conexiones.find(c => c.plataforma === "instagram");
  const mismaPagina = !facebook || !instagram || Boolean(facebook.pageId &&
    String(facebook.pageId) === String(instagram.pageId));
  const tokensGuardados = pedido.redes.every(red => conexiones.some(c => c.plataforma === red &&
    c.tokenPaginaCifrado?.algoritmo === "aes-256-gcm" &&
    typeof c.tokenPaginaCifrado?.contenido === "string" &&
    Boolean(c.tokenPaginaCifrado.contenido)));
  const textosDePrueba = pedido.publicaciones.some(p =>
    [p.descripcion, p.ctaFacebook, p.ctaInstagram, p.hashtags].some(x =>
      /(?:prueba interna|no publicar)/i.test(String(x || ""))));
  const condiciones = {
    cuatroContenidos: pedido.publicaciones.length === 4,
    archivosAprobados: archivosAprobados && pedido.estadoContenidos === "aprobados",
    redesConectadas, facebookInstagramMismaPagina: mismaPagina, tokensGuardados,
    sinTextosDePrueba: !textosDePrueba,
    horariosSinCoincidencias: !calendario.advertencias.some(a => a.includes("coinciden")),
    todasFechasCalculadas: calendario.eventos.length === pedido.publicaciones.length * pedido.redes.length,
  };
  if (!condiciones.archivosAprobados) calendario.advertencias.push("Los cuatro contenidos deben estar aprobados técnicamente.");
  if (!redesConectadas) calendario.advertencias.push("Falta conectar alguna de las redes seleccionadas.");
  if (!mismaPagina) calendario.advertencias.push("Facebook e Instagram no corresponden a la misma página.");
  if (!tokensGuardados) calendario.advertencias.push("Falta el acceso seguro de alguna red. Volvé a conectarla.");
  if (textosDePrueba && !calendario.advertencias.some(a => a.includes("No publicar"))) {
    calendario.advertencias.push("Los textos contienen 'Prueba interna' o 'No publicar'. No se puede preparar este calendario.");
  }
  const listoParaBorrador = Object.values(condiciones).every(Boolean) &&
    calendario.advertencias.length === 0;
  // La revisión representa exactamente el contenido y los horarios que el
  // usuario vio. No incluye secretos cifrados ni devuelve datos privados.
  const revision = crypto.createHash("sha256").update(JSON.stringify({
    pedidoId, estadoContenidos: pedido.estadoContenidos, zona: pedido.zonaHoraria,
    redes: pedido.redes, publicaciones: pedido.publicaciones,
    archivos: archivos.map(a => ({ ...a })).sort((a,b) =>
      `${a.contenidoId}:${a.posicion}`.localeCompare(`${b.contenidoId}:${b.posicion}`)),
    conexiones: conexiones.map(c => ({ plataforma: c.plataforma, pageId: c.pageId,
      instagramId: c.instagramId, actualizadoEn: c.actualizadoEn,
      tieneToken: Boolean(c.tokenPaginaCifrado?.contenido) })).sort((a,b) =>
      a.plataforma.localeCompare(b.plataforma)),
    eventos: calendario.eventos.map(e => [e.id, e.fechaHoraUTC]),
  })).digest("hex");
  return { ...calendario, condiciones, revision, listoParaBorrador };
}

async function abrirDB(env) {
  const { MongoClient } = await import("mongodb");
  const mongo = new MongoClient(env.MONGODB_URI);
  await mongo.connect();
  return mongo;
}

async function leerSolicitud(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "") ||
      Number(request.headers.get("content-length") || 0) > 1024) return null;
  const texto = await request.text();
  if (texto.length > 1024) return null;
  try { const json = JSON.parse(texto); return json && typeof json === "object" && !Array.isArray(json) ? json : null; }
  catch { return null; }
}

// Esta ruta SOLO guarda un borrador de planificación. Nunca activa la prueba,
// inicia los siete días, escribe en pedidos_servicios ni publica en Meta.
export async function ejecutarPreparacionCalendario(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== RUTA_PREPARAR) return json({ ok: false, error: "Ruta no encontrada." }, 404);
  if (request.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  if (request.headers.get("origin") !== url.origin || request.headers.get("x-comunidad-panel") !== "1") {
    return json({ ok: false, error: "Origen no autorizado." }, 403);
  }
  const datos = await leerSolicitud(request);
  if (!ID_PEDIDO.test(datos?.pedidoId || "") || !/^[a-f0-9]{64}$/.test(datos?.revision || "") ||
      datos?.confirmarBorrador !== true) return json({ ok: false, error: "Confirmación inválida." }, 400);
  if (!env?.MONGODB_URI) return json({ ok: false, error: "Preparación no disponible." }, 503);
  let mongo;
  try {
    const cliente = await obtenerClienteRegistrado(request, env);
    if (!cliente?.id) return json({ ok: false, error: "Iniciá sesión en tu cuenta verificada." }, 401);
    mongo = await abrirDB(env);
    const db = mongo.db(DB);
    const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
    // No permitir esta operación mediante un enlace Bearer o una sesión de otro cliente.
    if (!pedido || pedido.clienteUsuarioId !== cliente.id) {
      return json({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
    }
    if (!pruebaPendiente(pedido)) {
      return json({ ok: false, error: "La prueba debe seguir pendiente, sin activar ni cobrar." }, 409);
    }
    const resultado = await verificarCalendario(db, pedido);
    if (!resultado.listoParaBorrador) {
      return json({ ok: false, error: "Hay requisitos pendientes. Revisá las advertencias del calendario." }, 409);
    }
    if (resultado.revision !== datos.revision) {
      return json({ ok: false, error: "El calendario cambió. Actualizá la simulación y volvé a confirmar." }, 409);
    }
    if (await db.collection(EJECUCIONES).findOne({ _id: datos.pedidoId })) {
      return json({ ok: false, error: "Este pedido ya tiene eventos reservados. No se puede sobrescribir el borrador sin revisión administrativa." }, 409);
    }
    const ahora = new Date();
    const preparado = {
      pedidoId: datos.pedidoId, modalidad: "prueba_gratuita",
      estado: "borrador_sin_activar", publicacionHabilitada: false,
      revision: resultado.revision, zonaHoraria: resultado.zonaHoraria,
      ventanaInicioProyectadaUTC: resultado.ventanaInicioUTC,
      ventanaFinProyectadaUTC: resultado.ventanaFinUTC,
      eventos: resultado.eventos.map(e => ({ id: e.id, contenidoId: e.contenidoId,
        red: e.red, tipo: e.tipo, fechaHoraPropuestaUTC: e.fechaHoraUTC })),
      actualizadoEn: ahora,
    };
    await db.collection(BORRADORES).updateOne({ _id: datos.pedidoId }, {
      $set: preparado, $setOnInsert: { creadoEn: ahora },
    }, { upsert: true });
    return json({ ok: true, pedidoId: datos.pedidoId, modo: "borrador_sin_activar",
      borrador: { estado: "borrador_sin_activar", revision: resultado.revision,
        revisionVigente: true, actualizadoEn: ahora.toISOString() },
      cantidadEventos: resultado.eventos.length, seActivoPrueba: false,
      diasConsumidos: 0, publicacionesRealizadas: 0 });
  } catch (error) {
    console.warn("Error preparando borrador Comunidad Semanal:", error?.code || error?.name || "desconocido");
    return json({ ok: false, error: "No se pudo guardar el borrador del calendario." }, 503);
  } finally { if (mongo) await mongo.close().catch(() => {}); }
}

// Contrato de identidad para la futura cola. En esta etapa no se reserva nada:
// la clave determinista sirve para detectar colisiones ANTES de habilitar envíos.
// No equivale todavía a una garantía de exactamente una publicación.
export function construirEnsayoEjecucion(pedidoId, calendario) {
  if (!ID_PEDIDO.test(pedidoId || "") || !calendario?.listoParaBorrador ||
      !/^[a-f0-9]{64}$/.test(calendario?.revision || "") ||
      !Array.isArray(calendario?.eventos) || calendario.eventos.length < 4 ||
      calendario.eventos.length > 8) throw new Error("ENSAYO_NO_APTO");
  const vistos = new Set();
  const ids = new Set();
  const eventos = calendario.eventos.map(evento => {
    if (!/^contenido-[1-4]$/.test(evento.contenidoId || "") ||
        !REDES.has(evento.red) || !["imagen", "reel", "carrusel"].includes(evento.tipo) ||
        !/^contenido-[1-4]:(facebook|instagram)$/.test(evento.id || "") ||
        evento.id !== `${evento.contenidoId}:${evento.red}` ||
        !Number.isFinite(Date.parse(evento.fechaHoraUTC || ""))) throw new Error("EVENTO_INVALIDO");
    const par = `${evento.contenidoId}:${evento.red}`;
    if (vistos.has(par)) throw new Error("EVENTO_REPETIDO");
    vistos.add(par);
    const huella = crypto.createHash("sha256").update(JSON.stringify([
      "comunidad-semanal", "ensayo-v1", pedidoId, calendario.revision,
      evento.contenidoId, evento.red, evento.fechaHoraUTC,
    ])).digest("hex");
    const clave = `comunidad:${huella}`;
    if (ids.has(clave)) throw new Error("COLISION_EVENTO");
    ids.add(clave);
    return { contenidoId: evento.contenidoId, numeroContenido: evento.numeroContenido,
      red: evento.red, tipo: evento.tipo, fechaHoraUTC: evento.fechaHoraUTC,
      fechaLocal: evento.fechaLocal, horaLocal: evento.horaLocal,
      claveIdempotenciaPropuesta: clave, estado: "bloqueado_sin_activacion" };
  });
  if (eventos.length !== new Set(eventos.map(x => x.contenidoId)).size *
      new Set(eventos.map(x => x.red)).size) throw new Error("PARES_INCOMPLETOS");
  return eventos;
}

// Cada pedido solo puede tener UNA cola inicial, en UN documento de MongoDB.
// Un insertOne con _id único reserva los ocho eventos indivisiblemente. No hay
// despachador que lea esta cola, ni marca de publicación autorizada.
function resumenReserva(reserva, revision) {
  if (!reserva) return null;
  const eventos = Array.isArray(reserva.eventos) ? reserva.eventos : [];
  return { estado: reserva.estado, cantidadEventos: eventos.length,
    revisionVigente: reserva.revision === revision,
    bloqueados: eventos.filter(e => e.estado === "bloqueada_sin_activar").length,
    puedePublicar: false, creadaEn: reserva.creadaEn };
}

function mismaPropuesta(reserva, revision, eventos) {
  return reserva?.revision === revision &&
    reserva.estado === "reserva_bloqueada_sin_activar" &&
    reserva.publicacionHabilitada === false &&
    Array.isArray(reserva.eventos) &&
    reserva.eventos.length === eventos.length &&
    eventos.every(e => reserva.eventos.some(r => r.id === e.claveIdempotenciaPropuesta &&
      r.contenidoId === e.contenidoId && r.red === e.red &&
      r.fechaHoraUTC === e.fechaHoraUTC && r.estado === "bloqueada_sin_activar"));
}

// ETAPA 4: crea una reserva atómica, sin ninguna autorización de publicar.
// No escribe en pedidos_servicios ni cambia el cron de la tienda.
export async function ejecutarReservaCalendario(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== RUTA_RESERVAR) return json({ ok: false, error: "Ruta no encontrada." }, 404);
  if (request.method !== "POST") return json({ ok: false, error: "Método no permitido." }, 405);
  if (request.headers.get("origin") !== url.origin || request.headers.get("x-comunidad-panel") !== "1") {
    return json({ ok: false, error: "Origen no autorizado." }, 403);
  }
  const datos = await leerSolicitud(request);
  if (!ID_PEDIDO.test(datos?.pedidoId || "") || !/^[a-f0-9]{64}$/.test(datos?.revision || "") ||
      datos.confirmarReserva !== true) return json({ ok: false, error: "Confirmación inválida." }, 400);
  if (!env?.MONGODB_URI) return json({ ok: false, error: "Reserva no disponible." }, 503);
  let mongo;
  try {
    const cliente = await obtenerClienteRegistrado(request, env);
    if (!cliente?.id) return json({ ok: false, error: "Iniciá sesión en tu cuenta verificada." }, 401);
    mongo = await abrirDB(env);
    const db = mongo.db(DB);
    const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId: datos.pedidoId, tipo: "publicaciones" });
    if (!pedido || pedido.clienteUsuarioId !== cliente.id) {
      return json({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
    }
    if (!pruebaPendiente(pedido)) {
      return json({ ok: false, error: "El pedido debe permanecer sin activar." }, 409);
    }
    const borrador = await db.collection(BORRADORES).findOne({
      _id: datos.pedidoId, estado: "borrador_sin_activar", publicacionHabilitada: false,
    });
    if (!borrador || borrador.revision !== datos.revision || !Array.isArray(borrador.eventos)) {
      return json({ ok: false, error: "El borrador ya no coincide. Volvé a simular y guardar." }, 409);
    }
    const actual = await verificarCalendario(db, pedido);
    if (!actual.listoParaBorrador || actual.revision !== borrador.revision) {
      return json({ ok: false, error: "Hay cambios o requisitos pendientes. Revisá el borrador." }, 409);
    }
    const propuestos = actual.eventos.map(e => `${e.id}|${e.fechaHoraUTC}`).sort();
    const guardados = borrador.eventos.map(e => `${e.id}|${e.fechaHoraPropuestaUTC}`).sort();
    if (JSON.stringify(propuestos) !== JSON.stringify(guardados)) {
      return json({ ok: false, error: "Los horarios cambiaron. Generá otro borrador." }, 409);
    }
    const eventos = construirEnsayoEjecucion(datos.pedidoId, actual);
    const ahora = new Date();
    // La reserva no puede tomar un horario que ya pasó o está a punto de vencer.
    if (eventos.some(e => Date.parse(e.fechaHoraUTC) <= ahora.getTime() + 10 * 60 * 1000)) {
      return json({ ok: false, error: "Hay horarios demasiado próximos. Prepará otro calendario." }, 409);
    }
    const cola = db.collection(EJECUCIONES);
    const existente = await cola.findOne({ _id: datos.pedidoId });
    if (existente) {
      if (!mismaPropuesta(existente, actual.revision, eventos)) {
        return json({ ok: false, error: "Ya existe otra reserva para este pedido. Requiere revisión administrativa." }, 409);
      }
      return json({ ok: true, yaExistia: true, modo: "reserva_bloqueada_sin_activar",
        pedidoId: datos.pedidoId, reserva: resumenReserva(existente, actual.revision),
        seActivoPrueba: false, publicacionesRealizadas: 0, diasConsumidos: 0 });
    }
    const documento = { _id: datos.pedidoId, pedidoId: datos.pedidoId, revision: actual.revision,
      estado: "reserva_bloqueada_sin_activar", publicacionHabilitada: false,
      fechaActivacion: null, creadaEn: ahora, zonaHoraria: actual.zonaHoraria,
      eventos: eventos.map(e => ({ id: e.claveIdempotenciaPropuesta,
        contenidoId: e.contenidoId, red: e.red, tipo: e.tipo,
        fechaHoraUTC: e.fechaHoraUTC, estado: "bloqueada_sin_activar",
        intentos: 0, publicadaEn: null, idPublicacionMeta: null,
        bloqueoHasta: null })),
    };
    try {
      await cola.insertOne(documento);
    } catch (error) {
      if (error?.code !== 11000) throw error;
      // Dos pestañas reservaron a la vez: devolvemos la misma cola o rechazamos.
      const ganadora = await cola.findOne({ _id: datos.pedidoId });
      if (!mismaPropuesta(ganadora, actual.revision, eventos)) {
        return json({ ok: false, error: "Existe otra reserva para este pedido." }, 409);
      }
      return json({ ok: true, yaExistia: true, modo: "reserva_bloqueada_sin_activar",
        pedidoId: datos.pedidoId, reserva: resumenReserva(ganadora, actual.revision),
        seActivoPrueba: false, publicacionesRealizadas: 0, diasConsumidos: 0 });
    }
    return json({ ok: true, yaExistia: false, modo: "reserva_bloqueada_sin_activar",
      pedidoId: datos.pedidoId, reserva: resumenReserva(documento, actual.revision),
      seActivoPrueba: false, publicacionesRealizadas: 0, diasConsumidos: 0 });
  } catch (error) {
    console.warn("Error reservando calendario Comunidad Semanal:", error?.code || error?.name || "desconocido");
    return json({ ok: false, error: "No se pudo reservar el calendario sin activar." }, 503);
  } finally { if (mongo) await mongo.close().catch(() => {}); }
}

// Ensayo de lectura. Revalida el borrador, las aprobaciones y las conexiones;
// verifica que las identidades propuestas no estén ya registradas. Nunca
// publica, reserva turnos, consume días, activa pedidos ni escribe a MongoDB.
export async function ejecutarEnsayoCalendario(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== RUTA_ENSAYO) return json({ ok: false, error: "Ruta no encontrada." }, 404);
  if (request.method !== "GET") return json({ ok: false, error: "Método no permitido." }, 405);
  const pedidoId = url.searchParams.get("pedidoId") || "";
  if (!ID_PEDIDO.test(pedidoId)) return json({ ok: false, error: "Pedido inválido." }, 400);
  if (!env?.MONGODB_URI) return json({ ok: false, error: "Ensayo no disponible." }, 503);
  let mongo;
  try {
    const cliente = await obtenerClienteRegistrado(request, env);
    if (!cliente?.id) return json({ ok: false, error: "Iniciá sesión en tu cuenta verificada." }, 401);
    mongo = await abrirDB(env);
    const db = mongo.db(DB);
    const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId, tipo: "publicaciones" });
    if (!pedido || pedido.clienteUsuarioId !== cliente.id) {
      return json({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
    }
    if (!pruebaPendiente(pedido)) {
      return json({ ok: false, error: "La prueba debe permanecer sin activar." }, 409);
    }
    const borrador = await db.collection(BORRADORES).findOne({
      _id: pedidoId, estado: "borrador_sin_activar", publicacionHabilitada: false,
    }, { projection: { revision: 1, eventos: 1, _id: 0 } });
    if (!borrador || !Array.isArray(borrador.eventos)) {
      return json({ ok: false, error: "Primero guardá el calendario preliminar desde tu panel." }, 409);
    }
    const actual = await verificarCalendario(db, pedido);
    if (!actual.listoParaBorrador || actual.revision !== borrador.revision) {
      return json({ ok: false, error: "El borrador cambió o tiene requisitos pendientes. Actualizá el calendario y volvé a guardarlo." }, 409);
    }
    // Comprobación adicional del snapshot de horarios persistido.
    const programados = actual.eventos.map(e => `${e.id}|${e.fechaHoraUTC}`).sort();
    const guardados = borrador.eventos.map(e => `${e.id}|${e.fechaHoraPropuestaUTC}`).sort();
    if (JSON.stringify(programados) !== JSON.stringify(guardados)) {
      return json({ ok: false, error: "Los horarios del borrador no coinciden. Prepará otro borrador." }, 409);
    }
    const eventos = construirEnsayoEjecucion(pedidoId, actual);
    const registros = await db.collection(EJECUCIONES).countDocuments({
      _id: { $in: eventos.map(e => e.claveIdempotenciaPropuesta) },
    }, { limit: 1 });
    if (registros !== 0) {
      return json({ ok: false, error: "Ya existe un registro de ejecución para este calendario. Requiere revisión administrativa." }, 409);
    }
    const reservaExistente = await db.collection(EJECUCIONES).findOne({ _id: pedidoId });
    if (reservaExistente && !mismaPropuesta(reservaExistente, actual.revision, eventos)) {
      return json({ ok: false, error: "La reserva existente no coincide con este borrador." }, 409);
    }
    return json({ ok: true, modo: "ensayo_no_ejecutable", pedidoId,
      reserva: resumenReserva(reservaExistente, actual.revision),
      zonaHoraria: actual.zonaHoraria, revision: actual.revision,
      cantidadEventos: eventos.length, eventos,
      pedidosActivados: 0, publicacionesRealizadas: 0,
      puedePublicar: false, reservasCreadas: 0, diasConsumidos: 0,
      cronModificado: false });
  } catch (error) {
    console.warn("Error ensayando calendario Comunidad Semanal:", error?.code || error?.name || "desconocido");
    return json({ ok: false, error: "No fue posible completar el ensayo del calendario." }, 503);
  } finally { if (mongo) await mongo.close().catch(() => {}); }
}

export async function ejecutarSimulacionCalendario(request, env) {
  const url = new URL(request.url);
  if (url.pathname !== RUTA) return json({ ok: false, error: "Ruta no encontrada." }, 404);
  if (request.method !== "GET") return json({ ok: false, error: "Método no permitido." }, 405);
  const pedidoId = url.searchParams.get("pedidoId") || "";
  if (!ID_PEDIDO.test(pedidoId)) return json({ ok: false, error: "Pedido inválido." }, 400);
  if (!env?.MONGODB_URI) return json({ ok: false, error: "Simulación no disponible." }, 503);
  let mongo;
  try {
    const cliente = await obtenerClienteRegistrado(request, env);
    mongo = await abrirDB(env);
    const db = mongo.db(DB);
    const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId, tipo: "publicaciones" });
    if (!pedido || !tieneAcceso(request, pedido, cliente)) {
      return json({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
    }
    if (!pruebaPendiente(pedido)) {
      return json({ ok: false, error: "Solo se simulan pruebas gratuitas todavía no activadas." }, 409);
    }
    const calendario = await verificarCalendario(db, pedido);
    const existente = await db.collection(BORRADORES).findOne({ _id: pedidoId, estado: "borrador_sin_activar" },
      { projection: { _id: 0, estado: 1, revision: 1, actualizadoEn: 1 } });
    const borrador = existente ? { estado: existente.estado, revisionVigente: existente.revision === calendario.revision,
      actualizadoEn: existente.actualizadoEn } : null;
    const reservaGuardada = await db.collection(EJECUCIONES).findOne({ _id: pedidoId },
      { projection: { _id: 0, estado: 1, revision: 1, publicacionHabilitada: 1, creadaEn: 1, eventos: 1 } });
    return json({ ok: true, pedidoId, modalidad: "prueba_gratuita",
      modo: "simulacion_sin_publicacion", esSimulacion: true, fechaGeneracion: new Date().toISOString(),
      estadoPrueba: "pendiente_activacion", diasConsumidos: 0, activa: false,
      puedePublicar: false, seGuardoCalendario: Boolean(borrador), borrador,
      reserva: resumenReserva(reservaGuardada, calendario.revision),
      cantidadContenidos: pedido.publicaciones.length,
      cantidadEventos: calendario.eventos.length, ...calendario });
  } catch (error) {
    console.warn("Error simulando calendario Comunidad Semanal:", error?.code || error?.name || "desconocido");
    return json({ ok: false, error: "No se pudo calcular el calendario de simulación." }, 503);
  } finally {
    if (mongo) await mongo.close().catch(() => {});
  }
}
