// Ensayo administrativo de activacion de 7 dias de Comunidad Semanal.
// Exclusivamente lectura: NO modifica MongoDB, NO invoca Meta,
// NO empieza periodos, NO publica y NO interviene en scheduled() de la tienda.
import { calcularCalendarioSimulado } from "./calendario-simulacion.js";
import { evaluarSolicitud } from "./solicitud-programacion.js";

const BASE = "/api/admin/servicios/publicaciones/activacion-simulada";
const DB = "andres_imprimibles";
const PEDIDO_PILOTO = "SER-7ebdd0fa-4795-4cd9-a688-a72a1e26b937";
const PAGINA_PILOTO = "1369462529585300";
const DIA_MS = 86_400_000;
const DIAS_PRUEBA = 7;

function cabeceras(tipo) {
  return {
    "Content-Type": tipo,
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache", "Referrer-Policy": "no-referrer",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  };
}
const escapar = (v) => String(v ?? "").replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function pagina(titulo, contenido, status = 200) {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapar(titulo)}</title><style>
  *{box-sizing:border-box}body{background:#f6f7f9;color:#222;font:15px/1.5 system-ui,-apple-system,sans-serif;margin:0}
  main{max-width:940px;margin:36px auto;padding:26px;background:white;border:1px solid #e5e7eb;border-radius:14px}
  h1{font-size:23px;margin:4px 0 6px}h2{font-size:17px;margin:24px 0 8px}p{margin:8px 0 12px}
  .muted,small{color:#686e77}.pill{display:inline-block;background:#edf0f3;border-radius:16px;padding:3px 10px;font-size:12px}
  .note{padding:14px;background:#f0f4f8;border:1px solid #dce6ee;border-radius:9px}
  .err{padding:14px;border:1px solid #e6cdcd;background:#fff9f9;border-radius:9px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin:15px 0}
  .stat{padding:12px;border:1px solid #e5e7eb;border-radius:9px}.stat strong{font-size:24px;display:block}
  .days{display:flex;gap:7px;flex-wrap:wrap;margin:16px 0}.days a{color:#27303b;text-decoration:none;padding:8px 11px;border:1px solid #ddd;border-radius:7px}
  .days a.current{background:#1b293d;color:#fff;border-color:#1b293d}
  table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:11px 9px;border-bottom:1px solid #e8e8e8;text-align:left;vertical-align:top}th{color:#667085;font-weight:600}
  a{color:#243b61}.footer{margin-top:26px;font-size:13px}@media(max-width:600px){main{margin:8px;padding:16px;border-radius:9px}table{font-size:12px}th,td{padding:8px 5px}}
  </style></head><body><main>${contenido}<p class="footer"><a href="/api/admin/servicios/publicaciones/archivos?pedidoId=${PEDIDO_PILOTO}">Volver a revisión técnica</a> · <a href="/admin">Administración</a></p></main></body></html>`,
    { status, headers: cabeceras("text/html; charset=utf-8") });
}

function respuestaError(mensaje, status, json = false) {
  if (json) return Response.json({ ok: false, error: mensaje, activada: false, publicacionesRealizadas: 0 },
    { status, headers: cabeceras("application/json; charset=utf-8") });
  return pagina("Simulación de activación", `<h1>Simulación de activación</h1><div class="err">${escapar(mensaje)}</div>`, status);
}

function inicioDeEnsayo(url, ahora) {
  const parametro = url.searchParams.get("inicioUTC");
  if (!parametro) return ahora;
  // Acepta solo un instante canónico UTC y reciente. Enlaza las vistas del día 0 al 7.
  if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(parametro)) return null;
  const t = Date.parse(parametro);
  if (!Number.isFinite(t) || Math.abs(t - ahora.getTime()) > DIA_MS) return null;
  return new Date(t);
}

// Función pura: recorre virtualmente el calendario en días completos desde el
// inicio fijo. "Recorrido" es un cálculo, nunca una publicación realizada.
export function simularAvanceSemanal(calendario, inicio, dia = 0) {
  if (!(inicio instanceof Date) || !Number.isFinite(inicio.getTime()) ||
      !Number.isInteger(dia) || dia < 0 || dia > DIAS_PRUEBA ||
      !Array.isArray(calendario?.eventos)) throw new Error("ENSAYO_INVALIDO");
  const instante = inicio.getTime() + dia * DIA_MS;
  const ids = new Set();
  const eventos = calendario.eventos.map(e => {
    if (typeof e.id !== "string" || ids.has(e.id) ||
        !["facebook", "instagram"].includes(e.red) ||
        !/^contenido-[1-4]$/.test(e.contenidoId) ||
        !Number.isFinite(Date.parse(e.fechaHoraUTC))) throw new Error("EVENTO_INVALIDO");
    ids.add(e.id);
    const recorrido = Date.parse(e.fechaHoraUTC) <= instante;
    return { id: e.id, contenidoId: e.contenidoId, numeroContenido: e.numeroContenido,
      red: e.red, fechaLocal: e.fechaLocal, dia: e.dia, horaLocal: e.horaLocal,
      fechaHoraUTC: e.fechaHoraUTC,
      estado: recorrido ? "turno_recorrido_en_simulacion" : "pendiente_en_simulacion" };
  });
  const recorridos = eventos.filter(e => e.estado === "turno_recorrido_en_simulacion").length;
  return { diaSimulado: dia, instanteVirtualUTC: new Date(instante).toISOString(),
    totalEventos: eventos.length, turnosRecorridos: recorridos,
    turnosPendientes: eventos.length - recorridos, publicacionesReales: 0,
    diasRealesConsumidos: 0, eventos };
}

function fechaHoraLocal(valor, zona) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short", timeZone: zona }).format(new Date(valor));
}

function htmlEnsayo(datos) {
  const { avance, inicioUTC, pedidoId, zonaHoraria, solicitud, cantidadReservados,
    reservaBloqueada, finUTC } = datos;
  const enlaces = Array.from({ length: DIAS_PRUEBA + 1 }, (_, dia) => {
    const parametros = new URLSearchParams({ pedidoId, inicioUTC, dia: String(dia) });
    return `<a class="${dia === avance.diaSimulado ? "current" : ""}" href="${BASE}?${escapar(parametros.toString())}">Día ${dia}</a>`;
  }).join("");
  const filas = avance.eventos.map(e => `<tr><td>${escapar(e.contenidoId)}</td><td>${escapar(e.red === "facebook" ? "Facebook" : "Instagram")}</td>` +
    `<td>${escapar(e.dia)} ${escapar(e.fechaLocal)} · ${escapar(e.horaLocal)}</td>` +
    `<td>${e.estado === "turno_recorrido_en_simulacion" ? "Turno recorrido (ficticio)" : "Pendiente (ficticio)"}</td></tr>`).join("");
  const reserva = reservaBloqueada
    ? `Reserva técnica previa: ${cantidadReservados} eventos bloqueados.`
    : "No hay una reserva técnica bloqueada vigente. El ensayo calcula los eventos sin crearla.";
  return `<span class="pill">Administración · Solo lectura</span><h1>Simular activación de 7 días</h1>
    <p><a href="/api/admin/servicios/publicaciones/piloto-meta">Preparar contenido real para la prueba piloto de Meta (administración)</a></p>
    <p class="muted">Pedido ${escapar(pedidoId)} · Facebook Redes en Piloto e Instagram @redesenpiloto</p>
    <div class="note"><strong>Ningún contenido se publicará.</strong> Esta pantalla no activa la prueba,
    no consume días ni contacta a Meta. Los contenidos genéricos actuales <strong>no están autorizados para una publicación real en esta etapa</strong>.</div>
    <h2>Condiciones comprobadas</h2><p>Solicitud del cliente: <strong>${solicitud ? "confirmada y vigente" : "pendiente"}</strong> ·
    Archivos: <strong>aprobados</strong> · Redes: <strong>conectadas a las cuentas piloto</strong>.</p>
    <p class="muted">${escapar(reserva)}</p>
    <h2>Ventana hipotética</h2><p>Inicio: <strong>${escapar(fechaHoraLocal(inicioUTC, zonaHoraria))}</strong><br>
    Fin: <strong>${escapar(fechaHoraLocal(finUTC, zonaHoraria))}</strong><br>
    Zona horaria: ${escapar(zonaHoraria)}</p>
    <div class="days">${enlaces}</div>
    <p class="muted">Se muestra el estado que tendría el calendario al finalizar el día ${avance.diaSimulado}
      (intervalos de 24 horas desde el inicio simulado).</p>
    <div class="grid"><div class="stat"><strong>${avance.totalEventos}</strong>Eventos previstos</div>
    <div class="stat"><strong>${avance.turnosRecorridos}</strong>Turnos recorridos ficticios</div>
    <div class="stat"><strong>${avance.turnosPendientes}</strong>Turnos ficticios pendientes</div>
    <div class="stat"><strong>0</strong>Publicaciones reales</div></div>
    <h2>Detalle de los eventos</h2><table><thead><tr><th>Contenido</th><th>Red</th><th>Horario local</th><th>Estado hipotético</th></tr></thead>
    <tbody>${filas}</tbody></table>
    <p class="note">Para comenzar las publicaciones reales de promoción, primero reemplazaremos los contenidos genéricos
    por piezas definitivas, volveremos a validarlas y requeriremos una autorización vigente. Este ensayo no habilita envíos.</p>`;
}

// SOLO GET y solo una sesión de Administracion existente. La ruta no contiene
// métodos de escritura y no importa ninguna funcion de publicacion a Meta.
export async function ejecutarActivacionSimulada(request, env, autorizado) {
  const url = new URL(request.url);
  const json = url.searchParams.get("formato") === "json";
  if (url.pathname !== BASE) return respuestaError("Ruta no disponible.", 404, json);
  if (request.method !== "GET") return respuestaError("Solo está permitida la consulta de simulación.", 405, json);
  if (!autorizado) return respuestaError("Iniciá sesión en Administración.", 401, json);
  const pedidoId = url.searchParams.get("pedidoId");
  if (pedidoId !== PEDIDO_PILOTO) return respuestaError("La simulación privada solo admite el pedido piloto.", 403, json);
  const numeroDia = url.searchParams.get("dia") ?? "0";
  if (!/^[0-7]$/.test(numeroDia)) return respuestaError("Elegí un día de simulación entre 0 y 7.", 400, json);
  const ahora = new Date();
  const inicio = inicioDeEnsayo(url, ahora);
  if (!inicio) return respuestaError("El inicio del ensayo no es válido o ha vencido. Abrí nuevamente la simulación.", 400, json);
  if (!env?.MONGODB_URI) return respuestaError("La base de datos no está configurada.", 503, json);
  let mongo;
  try {
    const { MongoClient } = await import("mongodb");
    mongo = new MongoClient(env.MONGODB_URI);
    await mongo.connect();
    const db = mongo.db(DB);
    const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId, tipo: "publicaciones" });
    if (!pedido) return respuestaError("No se encontró el pedido piloto.", 404, json);
    const evaluacion = await evaluarSolicitud(db, pedido);
    const consentimiento = await db.collection("solicitudes_programacion_servicios").findOne({ _id: pedidoId });
    const vigente = evaluacion.lista && evaluacion.aprobados &&
      consentimiento?.estado === "solicitud_confirmada_pendiente_habilitacion" &&
      consentimiento?.aceptaProgramacionYPublicacionAlHabilitar === true &&
      consentimiento?.publicacionHabilitada === false &&
      consentimiento.revision === evaluacion.revision;
    if (!vigente) return respuestaError("El pedido requiere cuatro aprobaciones y una solicitud del cliente confirmada y vigente. No se simuló ninguna activación.", 409, json);
    // Evita ensayar accidentalmente con una página/cuenta distinta de Redes en Piloto.
    const conexiones = await db.collection("conexiones_meta_pedidos").find({ pedidoId,
      plataforma: { $in: pedido.redes }, estado: "conectada" })
      .project({ _id: 0, plataforma: 1, pageId: 1, usuario: 1 }).toArray();
    const pilotoValido = pedido.redes.length === 2 &&
      pedido.redes.includes("facebook") && pedido.redes.includes("instagram") &&
      ["facebook", "instagram"].every(red => conexiones.some(c => c.plataforma === red && String(c.pageId) === PAGINA_PILOTO)) &&
      conexiones.some(c => c.plataforma === "instagram" && String(c.usuario || "").replace(/^@/, "").toLowerCase() === "redesenpiloto");
    if (!pilotoValido) return respuestaError("Las cuentas conectadas no coinciden con el piloto Redes en Piloto. No se simuló ninguna activación.", 409, json);
    const calendario = calcularCalendarioSimulado(pedido, inicio);
    if (calendario.advertencias.length || calendario.eventos.length !== 8 ||
        new Set(calendario.eventos.map(e => e.id)).size !== 8) {
      return respuestaError("Los ocho horarios no superan todas las verificaciones del ensayo.", 409, json);
    }
    const avance = simularAvanceSemanal(calendario, inicio, Number(numeroDia));
    const reserva = await db.collection("ejecuciones_publicaciones_servicios").findOne({ _id: pedidoId },
      { projection: { estado: 1, publicacionHabilitada: 1, eventos: 1 } });
    const reservaBloqueada = reserva?.estado === "reserva_bloqueada_sin_activar" &&
      reserva.publicacionHabilitada === false && Array.isArray(reserva.eventos) &&
      reserva.eventos.length === 8 && reserva.eventos.every(e => e.estado === "bloqueada_sin_activar");
    const datos = { ok: true, modo: "simulacion_solo_lectura", pedidoId,
      inicioUTC: inicio.toISOString(), finUTC: calendario.ventanaFinUTC,
      zonaHoraria: pedido.zonaHoraria, solicitud: true, aprobado: true,
      reservaBloqueada, cantidadReservados: reservaBloqueada ? 8 : 0,
      avance, activada: false, publicacionHabilitada: false,
      publicacionesRealizadas: 0, diasConsumidos: 0 };
    if (json) return Response.json(datos, { headers: cabeceras("application/json; charset=utf-8") });
    return pagina("Simular activación de 7 días", htmlEnsayo(datos));
  } catch (error) {
    // No devolver documentos, textos del cliente, secretos ni tokens.
    console.warn("Ensayo activación Comunidad Semanal:", error?.code || error?.name || "ERROR");
    return respuestaError("No fue posible calcular la simulación administrativa.", 503, json);
  } finally { if (mongo) await mongo.close().catch(() => {}); }
}
