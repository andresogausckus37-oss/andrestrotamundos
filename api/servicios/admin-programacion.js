// Revisión administrativa previa a la activación de Comunidad Semanal.
// No marca eventos como ejecutables: la publicación automática requiere un
// despachador separado, que aún no forma parte de este servicio.
import crypto from "node:crypto";
import { evaluarSolicitud } from "./solicitud-programacion.js";
import { calcularCalendarioSimulado } from "./calendario-simulacion.js";
import { activarSemanaDesdeAdmin } from "./publicaciones-clientes.js";

const RUTA = "/api/admin/servicios/publicaciones/programacion";
const DB = "andres_imprimibles";
const ID = /^SER-[0-9a-f-]{36}$/i;
const APROBACIONES = "aprobaciones_programacion_servicios";
const VIGENCIA = 20 * 60 * 1000;

function escapar(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, c =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function pagina(titulo, contenido, status = 200) {
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapar(titulo)}</title><style>
  *{box-sizing:border-box}body{margin:0;background:#f7f8fa;color:#202938;font:14px system-ui,sans-serif;font-weight:400}main{max-width:920px;margin:32px auto;padding:0 16px}h1{font-size:24px;font-weight:500}h2{font-size:16px;font-weight:500;margin:0 0 12px}h3{font-size:14px;font-weight:500}p{line-height:1.6}section{padding:18px;margin:16px 0;background:#fff;border:1px solid #e2e8f0;border-radius:6px}a{color:#b45309}input,button{font:inherit;padding:8px 12px;border:1px solid #cbd5e1;border-radius:6px}input{max-width:100%;width:340px}button{background:#c2410c;color:white;border-color:#c2410c;cursor:pointer;font-weight:500}button:disabled{background:#e2e8f0;color:#64748b;border-color:#e2e8f0;cursor:not-allowed}small,.muted{color:#64748b}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}.estado{padding:7px 10px;background:#f1f5f9;border-radius:6px;margin:6px 0}.bien{color:#166534}.mal{color:#b91c1c}.linea{border-bottom:1px solid #edf2f7;padding:10px 0}code{overflow-wrap:anywhere}form{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  </style></head><body><main><p><a href="/admin">Administración</a> · Comunidad Semanal</p><h1>${escapar(titulo)}</h1>${contenido}</main></body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" },
  });
}
function firma(env, pedidoId, revision, marca) {
  return crypto.createHmac("sha256", String(env.ADMIN_PASSWORD || ""))
    .update(`comunidad:admin:aprobacion:v1:${pedidoId}:${revision}:${marca}`).digest("hex");
}
function token(env, pedidoId, revision) {
  const marca = Date.now();
  return `${marca}.${firma(env, pedidoId, revision, marca)}`;
}
function tokenValido(env, pedidoId, revision, valor) {
  const partes = /^(\d{13})\.([a-f0-9]{64})$/.exec(valor || "");
  if (!partes) return false;
  const marca = Number(partes[1]);
  if (!Number.isSafeInteger(marca) || marca > Date.now() + 30000 || Date.now() - marca > VIGENCIA) return false;
  const esperado = Buffer.from(firma(env, pedidoId, revision, marca), "hex");
  return crypto.timingSafeEqual(Buffer.from(partes[2], "hex"), esperado);
}
async function conDB(env, fn) {
  const { MongoClient } = await import("mongodb");
  const cliente = new MongoClient(env.MONGODB_URI);
  try { await cliente.connect(); return await fn(cliente.db(DB)); }
  finally { await cliente.close().catch(() => {}); }
}
function evalCalendario(pedido) {
  try {
    const c = calcularCalendarioSimulado(pedido);
    return { eventos: c.eventos, advertencias: c.advertencias };
  } catch { return { eventos: [], advertencias: ["No se pudo calcular el calendario con los datos actuales."] }; }
}
async function verificar(db, pedido) {
  const solicitud = await db.collection("solicitudes_programacion_servicios").findOne({ _id: pedido.pedidoId });
  const evaluacion = await evaluarSolicitud(db, pedido);
  const calendario = evalCalendario(pedido);
  const consentimiento = solicitud?.estado === "solicitud_confirmada_pendiente_habilitacion" &&
    solicitud?.aceptaProgramacionYPublicacionAlHabilitar === true &&
    evaluacion.revision && evaluacion.revision === solicitud.revision;
  const cantidad = Array.isArray(pedido.redes) ? 4 * pedido.redes.length : 0;
  const listo = Boolean(evaluacion.lista && evaluacion.aprobados && consentimiento &&
    cantidad >= 4 && calendario.eventos.length === cantidad && calendario.advertencias.length === 0);
  return { solicitud, evaluacion, calendario, consentimiento, cantidad, listo };
}
function fechaLocal(item, zona) {
  try { return new Intl.DateTimeFormat("es-AR", { timeZone: zona, weekday: "long", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(item.fechaHoraUTC)); }
  catch { return "Fecha inválida"; }
}
export async function ejecutarAdminProgramacion(request, env, autorizado) {
  if (!autorizado) return pagina("Acceso restringido", "<p>Iniciá sesión en Administración.</p>", 401);
  const url = new URL(request.url);
  if (url.pathname !== RUTA) return pagina("No encontrada", "<p>Ruta incorrecta.</p>", 404);
  if (!["GET", "POST"].includes(request.method)) return pagina("Método no permitido", "", 405);
  if (!env?.MONGODB_URI || !env?.ADMIN_PASSWORD) return pagina("Configuración pendiente", "<p>Administración no está configurada.</p>", 503);
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if (origin !== url.origin || (fetchSite && fetchSite !== "same-origin")) return pagina("Origen inválido", "", 403);
  }
  try {
    let datos = null;
    if (request.method === "POST") {
      if (!/application\/x-www-form-urlencoded/i.test(request.headers.get("content-type") || "") ||
          Number(request.headers.get("content-length") || 0) > 2048) return pagina("Solicitud inválida", "", 400);
      const body = await request.text();
      if (body.length > 2048) return pagina("Solicitud demasiado grande", "", 413);
      datos = new URLSearchParams(body);
    }
    const pedidoId = request.method === "POST" ? datos.get("pedidoId") : url.searchParams.get("pedidoId");
    if (!pedidoId) {
      if (request.method !== "GET") return pagina("Pedido obligatorio", "", 400);
      return await conDB(env, async db => {
        const pedidos = await db.collection("pedidos_servicios").find({ tipo: "publicaciones", modalidadContratacion: "prueba_gratuita" })
          .sort({ creadoEn: -1 }).limit(30).project({ _id: 0, pedidoId: 1, estadoContenidos: 1, creadoEn: 1, negocio: 1 }).toArray();
        const filas = pedidos.map(p => `<div class="linea"><a href="${RUTA}?pedidoId=${encodeURIComponent(p.pedidoId)}">${escapar(p.pedidoId)}</a> · ${escapar(p.negocio?.nombre || "Emprendimiento")} · ${escapar(p.estadoContenidos || "Pendiente")}</div>`).join("");
        return pagina("Aprobar y programar semana", `<section><h2>Pedidos gratuitos</h2><form method="get"><input name="pedidoId" placeholder="SER-..." required><button type="submit">Buscar</button></form>${filas || "<p>No hay pedidos todavía.</p>"}</section>`);
      });
    }
    if (!ID.test(pedidoId)) return pagina("Pedido inválido", "<p>Revisá el identificador.</p>", 400);
    return await conDB(env, async db => {
      const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId, tipo: "publicaciones" });
      if (!pedido) return pagina("Pedido no encontrado", "", 404);
      if (pedido.modalidadContratacion !== "prueba_gratuita") return pagina("Modalidad pendiente", "<p>Las semanas pagas necesitan una validación de pago y activación específica.</p>", 409);
      if (pedido.estadoServicio === 'activo') {
        const programacion = await db.collection('calendarios_clientes_activos').findOne({_id:pedidoId});
        const filas = (programacion?.eventos||[]).map(e => `<div class="linea">${escapar(e.contenidoId)} · ${escapar(e.red)} · ${escapar(e.estado)} · ${escapar(fechaLocal(e, pedido.zonaHoraria))}${e.enlace ? ` · <a href="${escapar(e.enlace)}" target="_blank" rel="noopener noreferrer">Ver publicación</a>` : ''}</div>`).join('');
        const recuperar = programacion?.estado === 'preparando' && programacion?.revision;
        if (recuperar && request.method === 'POST' && datos.get('accion') === 'recuperar_activacion') {
          if (!tokenValido(env,pedidoId,programacion.revision,datos.get('csrf')))
            return pagina('Sesión de revisión vencida', '<p>Recargá el pedido.</p>',409);
          const r=await activarSemanaDesdeAdmin(db,env,pedidoId,programacion.revision);
          if(!r.ok)return pagina('No se pudo completar la activación',`<p>${escapar(r.error)}</p>`,r.status||409);
          return Response.redirect(`${url.origin}${RUTA}?pedidoId=${encodeURIComponent(pedidoId)}&activada=1`,303);
        }
        const mensaje = programacion?.estado==='activa' ? 'Semana activada. Los envíos siguen el horario de cada red.' :
          'La activación quedó incompleta. No se enviarán publicaciones hasta finalizarla.';
        const form = recuperar ? `<form method="post" action="${RUTA}">
          <input type="hidden" name="pedidoId" value="${escapar(pedidoId)}">
          <input type="hidden" name="accion" value="recuperar_activacion">
          <input type="hidden" name="csrf" value="${token(env,pedidoId,programacion.revision)}">
          <button type="submit">Finalizar activación pendiente</button></form>` : '';
        return pagina('Semana activada', `<section><h2>Pedido ${escapar(pedidoId)}</h2><p class="${recuperar?'mal':'bien'}">${escapar(mensaje)}</p><p>${escapar(pedido.zonaHoraria||'')}</p>${filas}${form}</section><p><a href="${RUTA}">Volver a los pedidos</a></p>`);
      }
      const validacion = await verificar(db, pedido);
      const aprobaciones = db.collection(APROBACIONES);
      let existente = await aprobaciones.findOne({ _id: pedidoId });
      let resultadoActivacion = null;
      if (request.method === "POST") {
        if (!validacion.listo || !tokenValido(env, pedidoId, validacion.evaluacion.revision, datos.get("csrf"))) {
          return pagina("Aprobación no disponible", "<p>La autorización o alguno de los requisitos cambió. Volvé a abrir el pedido y revisalo.</p>", 409);
        }
        if (datos.get("accion") === "activar_semana") {
          resultadoActivacion = await activarSemanaDesdeAdmin(db, env, pedidoId, validacion.evaluacion.revision);
          if (!resultadoActivacion.ok) return pagina("Activación pendiente", `<p>${escapar(resultadoActivacion.error)}</p><p><a href="${RUTA}?pedidoId=${encodeURIComponent(pedidoId)}">Volver al pedido</a></p>`, resultadoActivacion.status || 409);
          return Response.redirect(`${url.origin}${RUTA}?pedidoId=${encodeURIComponent(pedidoId)}&activada=1`,303);
        }
        if(datos.get("accion") !== "aprobar_revision") return pagina("Acción incorrecta", "", 400);
        const ahora = new Date();
        await aprobaciones.updateOne({ _id: pedidoId }, { $set: {
          pedidoId, revision: validacion.evaluacion.revision,
          estado: "aprobacion_administrativa_pendiente_activacion", publicacionHabilitada: false,
          aprobadoEn: ahora, cantidadEventos: validacion.cantidad,
        }, $setOnInsert: { creadoEn: ahora } }, { upsert: true });
        existente = await aprobaciones.findOne({ _id: pedidoId });
      }
      const condicion = (etiqueta, ok) => `<div class="estado ${ok ? "bien" : "mal"}">${ok ? "✓" : "Pendiente"} · ${escapar(etiqueta)}</div>`;
      const condiciones = [
        condicion("Cuatro contenidos y archivos revisados técnicamente", validacion.evaluacion.aprobados),
        condicion("Todas las cuentas seleccionadas conectadas", !validacion.evaluacion.motivos.some(x => /conect|página/i.test(x))),
        condicion("Autorización vigente del cliente", validacion.consentimiento),
        condicion(`${validacion.cantidad} publicaciones con fechas y horarios válidos`, validacion.calendario.eventos.length === validacion.cantidad && validacion.calendario.advertencias.length === 0),
      ].join("");
      const fallos = [...validacion.evaluacion.motivos, ...validacion.calendario.advertencias]
        .map(x => `<li>${escapar(x)}</li>`).join("");
      const filas = validacion.calendario.eventos.map(e => `<div class="linea">Contenido ${escapar(e.numeroContenido)} · ${escapar(e.tipo)} · ${escapar(e.red)} · ${escapar(fechaLocal(e, pedido.zonaHoraria))}</div>`).join("");
      const vigente = existente?.revision === validacion.evaluacion.revision &&
        existente?.estado === "aprobacion_administrativa_pendiente_activacion";
      const listaActivacion = vigente && validacion.listo && pedido.estadoServicio === 'sin_activar';
      return pagina("Aprobar y programar semana", `
        <section><h2>Pedido ${escapar(pedidoId)}</h2><div class="grid"><p><small>Emprendimiento</small><br>${escapar(pedido.negocio?.nombre || "—")}</p><p><small>Redes</small><br>${escapar((pedido.redes || []).join(" · "))}</p><p><small>Zona horaria</small><br>${escapar(pedido.zonaHoraria || "—")}</p><p><small>Estado</small><br>${escapar(pedido.estadoServicio || "—")}</p></div><p><a href="/api/admin/servicios/publicaciones/archivos?pedidoId=${encodeURIComponent(pedidoId)}">Revisar archivos y solicitar correcciones</a></p></section>
        <section><h2>Verificaciones</h2>${condiciones}${fallos ? `<ul class="mal">${fallos}</ul>` : ""}</section>
        <section><h2>Programación propuesta</h2><p class="muted">Estas fechas son una simulación calculada desde este momento; todavía no están confirmadas ni reservadas como publicables.</p>${filas || "<p>No se pudo generar una propuesta completa.</p>"}</section>
        <section><h2>Aprobación administrativa</h2>${vigente ? '<p class="bien">La revisión administrativa fue aprobada. La activación y publicación siguen pendientes.</p>' : ""}
          ${validacion.listo && !vigente ? `<form method="post" action="${RUTA}"><input type="hidden" name="pedidoId" value="${escapar(pedidoId)}"><input type="hidden" name="accion" value="aprobar_revision"><input type="hidden" name="csrf" value="${token(env,pedidoId,validacion.evaluacion.revision)}"><button type="submit">Aprobar revisión administrativa</button></form>` : "<p class=\"muted\">Para aprobar, completá los requisitos pendientes.</p>"}
          ${listaActivacion ? `<form method="post" action="${RUTA}">
            <input type="hidden" name="pedidoId" value="${escapar(pedidoId)}">
            <input type="hidden" name="accion" value="activar_semana">
            <input type="hidden" name="csrf" value="${token(env,pedidoId,validacion.evaluacion.revision)}">
            <button type="submit">Activar y programar semana</button>
          </form>` : '<p class="muted">Primero aprobá la revisión. La programación real exige la habilitación explícita del servicio.</p>'}
          <p class="muted"><small>Al activar, comenzarán los siete días de prueba y las publicaciones se enviarán automáticamente a las redes seleccionadas, en sus horarios.</small></p>
        </section>`);
    });
  } catch (error) {
    console.error("Admin programación:", error?.name || "error");
    return pagina("Revisión no disponible", "<p>No se pudo consultar la información de esta semana.</p>", 503);
  }
}
