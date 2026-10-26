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
  :root{color-scheme:light}*{box-sizing:border-box}
  body{margin:0;background:#f8fafb;color:#26303c;font:400 14px/1.6 Montserrat,system-ui,-apple-system,sans-serif}
  main{max-width:1020px;margin:0 auto;padding:36px 22px 70px}
  .topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:32px;color:#737f8c;font-size:12px}
  .topbar a{color:#526171;text-decoration:none}.topbar a:hover{text-decoration:underline}
  .encabezado{margin-bottom:26px}.encabezado p{margin:8px 0 0;color:#697586;font-size:13px}
  h1{font-size:clamp(21px,3vw,27px);line-height:1.3;letter-spacing:-.035em;font-weight:500;margin:0}
  h2{font-size:16px;font-weight:500;line-height:1.4;margin:0 0 16px}
  h3{font-size:14px;font-weight:500;margin:0}p{line-height:1.65;margin:8px 0}
  section{padding:24px 26px;margin:18px 0;background:#fff;border:1px solid #e9edf1;border-radius:10px}
  a{color:#526779;text-decoration:none}a:hover{text-decoration:underline}
  input,button{font:inherit;padding:10px 13px;border:1px solid #dce3e9;border-radius:7px}
  input{max-width:100%;width:340px;background:#fff;color:#26303c;min-height:40px}
  input:focus-visible,button:focus-visible,a:focus-visible{outline:2px solid #8d9eae;outline-offset:2px}
  button{background:#3d5263;color:#fff;border-color:#3d5263;cursor:pointer;font-weight:500;min-height:40px;transition:background .2s}
  button:hover{background:#283b4a}button:disabled{background:#eff2f5;color:#84919f;border-color:#eff2f5;cursor:not-allowed}
  small,.muted{color:#778391;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(175px,1fr));gap:12px}
  .dato{background:#fafbfc;border:1px solid #f0f2f4;border-radius:8px;padding:14px 16px;min-width:0}
  .dato small{display:block;margin-bottom:5px}.dato strong{font-weight:500;overflow-wrap:anywhere}
  .estado{display:flex;align-items:flex-start;gap:10px;padding:10px 0;margin:0;border-bottom:1px solid #f0f2f4;background:none}
  .estado:last-of-type{border-bottom:0}.estado span:first-child{flex-shrink:0;font-weight:500}
  .bien{color:#3c7460}.mal{color:#9b5555}.linea{border-bottom:1px solid #f0f2f4;padding:14px 0}.linea:last-child{border-bottom:0}
  .pedido-row{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;padding:15px 0;border-bottom:1px solid #f0f2f4}
  .pedido-row:last-child{border-bottom:0}.pedido-info{min-width:0;display:grid;gap:3px}
  .pedido-info a{font-weight:500;overflow-wrap:anywhere}.pedido-info small{color:#7b8793}
  .chip{display:inline-flex;align-items:center;border:1px solid #e8ecf0;background:#f7f9fa;border-radius:50px;padding:3px 9px;font-size:11px;color:#617180;font-weight:500}
  .evento{display:grid;grid-template-columns:minmax(120px,1.1fr) minmax(105px,.8fr) minmax(210px,1.35fr);gap:16px;align-items:center;padding:13px 0;border-bottom:1px solid #f0f2f4}
  .evento:last-child{border-bottom:0}.evento strong{font-weight:500}.evento small{display:block}
  .accion-panel{padding-top:24px}.accion-panel form{margin-top:15px}
  .form-buscar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:20px}
  .acciones-link{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
  .enlace-suave{display:inline-block;border:1px solid #e3e8ed;border-radius:7px;padding:8px 12px;color:#445b6b;font-size:12px;font-weight:500}
  .ayuda{font-size:12px;color:#788594;margin-top:14px}
  .lista-fallos{padding-left:19px;margin:12px 0 0}.lista-fallos li{margin:6px 0}
  code{overflow-wrap:anywhere;font-size:12px}form{display:flex;flex-wrap:wrap;gap:10px;align-items:center}
  @media(max-width:640px){main{padding:24px 14px 45px}.topbar{margin-bottom:24px}section{padding:18px 16px;margin:14px 0}.evento{grid-template-columns:1fr;gap:3px;padding:14px 0}.form-buscar input{width:100%}.form-buscar button{width:100%}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:390px){.grid{grid-template-columns:1fr}}
  </style></head><body><main><div class="topbar"><a href="/admin">← Administración</a><span>Publicaciones automáticas · Gestión de semanas</span></div><header class="encabezado"><h1>${escapar(titulo)}</h1><p>Consultá los pedidos, verificá sus requisitos y administrá su programación.</p></header>${contenido}</main></body></html>`, {
    status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "same-origin", "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" },
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
  if (url.searchParams.has('semanaId')) {
    const { ejecutarAdminSemanaPagada } = await import('./admin-semanas-pagadas.js');
    return ejecutarAdminSemanaPagada(request,env,autorizado,'programacion');
  }
  if (url.pathname !== RUTA) return pagina("No encontrada", "<p>Ruta incorrecta.</p>", 404);
  if (!["GET", "POST"].includes(request.method)) return pagina("Método no permitido", "", 405);
  if (!env?.MONGODB_URI || !env?.ADMIN_PASSWORD) return pagina("Configuración pendiente", "<p>Administración no está configurada.</p>", 503);
  if (request.method === "POST") {
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    const referer = request.headers.get("referer");

    // Algunos navegadores omiten Origin (o envían "null") en formularios
    // HTML. Aceptamos esos casos solo con señales verificables de mismo
    // origen. El token CSRF firmado se valida después, antes de escribir.
    if (fetchSite && fetchSite !== "same-origin") return pagina("Origen inválido", "", 403);
    if (origin && origin !== "null" && origin !== url.origin) return pagina("Origen inválido", "", 403);
    if (!origin || origin === "null") {
      let refererValido = false;
      try { refererValido = Boolean(referer && new URL(referer).origin === url.origin); }
      catch { /* Referer ausente o malformado. */ }
      if (fetchSite !== "same-origin" && !refererValido) return pagina("Origen inválido", "", 403);
    }
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
        const filas = pedidos.map(p => `<div class="pedido-row"><div class="pedido-info"><a href="${RUTA}?pedidoId=${encodeURIComponent(p.pedidoId)}">${escapar(p.negocio?.nombre || "Emprendimiento")}</a><small>${escapar(p.pedidoId)}</small></div><span class="chip">${escapar((p.estadoContenidos || "Pendiente").replaceAll("_", " "))}</span></div>`).join("");
        const { listarRenovacionesPendientes } = await import('./admin-semanas-pagadas.js');
        const pagadas = await listarRenovacionesPendientes(db);
        const filasPagadas=pagadas.map(x=>`<div class="pedido-row"><div class="pedido-info"><a href="${RUTA}?semanaId=${encodeURIComponent(x._id)}">Semana ${Number(x.numeroSemana)||2} · ${escapar(x.email||'Cliente')}</a><small>${escapar(x.pedidoId)}</small></div><span class="chip">${escapar(x.configuracionEstado)}</span></div>`).join('');
        return pagina("Aprobar y programar semana", `<section><h2>Semanas pagadas reales</h2>${filasPagadas||'<p class="muted">Sin semanas pagadas pendientes.</p>'}</section><section><h2>Pedidos de prueba gratuita</h2><p class="muted">Buscá un pedido o elegí uno de los más recientes.</p><form class="form-buscar" method="get"><input name="pedidoId" aria-label="ID del pedido" placeholder="ID del pedido · SER-..." required><button type="submit">Buscar pedido</button></form>${filas || '<p class="muted">Todavía no hay pedidos para revisar.</p>'}</section>`);
      });
    }
    if (!ID.test(pedidoId)) return pagina("Pedido inválido", "<p>Revisá el identificador.</p>", 400);
    return await conDB(env, async db => {
      const pedido = await db.collection("pedidos_servicios").findOne({ pedidoId, tipo: "publicaciones" });
      if (!pedido) return pagina("Pedido no encontrado", "", 404);
      if (pedido.modalidadContratacion !== "prueba_gratuita") return pagina("Modalidad pendiente", "<p>Las semanas pagas necesitan una validación de pago y activación específica.</p>", 409);
      if (pedido.estadoServicio === 'activo') {
        const programacion = await db.collection('calendarios_clientes_activos').findOne({_id:pedidoId});
        const filas = (programacion?.eventos||[]).map(e => `<div class="evento"><strong>${escapar(e.contenidoId.replace("contenido-", "Contenido "))}</strong><span class="chip">${escapar(e.red)} · ${escapar(e.estado.replaceAll("_", " "))}</span><span>${escapar(fechaLocal(e, pedido.zonaHoraria))}${e.enlace ? ` · <a href="${escapar(e.enlace)}" target="_blank" rel="noopener noreferrer">Ver publicación ↗</a>` : ''}</span></div>`).join('');
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
        return pagina('Semana activada', `<section><h2>Resumen de la semana</h2><div class="grid"><div class="dato"><small>Pedido</small><strong>${escapar(pedidoId)}</strong></div><div class="dato"><small>Zona horaria</small><strong>${escapar(pedido.zonaHoraria||'—')}</strong></div><div class="dato"><small>Estado</small><strong class="${recuperar?'mal':'bien'}">${escapar(programacion?.estado || '—')}</strong></div></div><p class="ayuda ${recuperar?'mal':'bien'}">${escapar(mensaje)}</p></section><section><h2>Publicaciones de la semana</h2>${filas || '<p class="muted">Todavía no hay eventos registrados.</p>'}${form}</section><div class="acciones-link"><a class="enlace-suave" href="${RUTA}">← Volver a los pedidos</a><a class="enlace-suave" href="/api/admin/servicios/publicaciones/archivos?pedidoId=${encodeURIComponent(pedidoId)}">Revisar contenidos</a></div>`);
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
      const condicion = (etiqueta, ok) => `<div class="estado ${ok ? "bien" : "mal"}"><span>${ok ? "✓" : "○"}</span><span>${escapar(etiqueta)}${ok ? "" : " · Pendiente"}</span></div>`;
      const condiciones = [
        condicion("Cuatro contenidos y archivos revisados técnicamente", validacion.evaluacion.aprobados),
        condicion("Todas las cuentas seleccionadas conectadas", !validacion.evaluacion.motivos.some(x => /conect|página/i.test(x))),
        condicion("Autorización vigente del cliente", validacion.consentimiento),
        condicion(`${validacion.cantidad} publicaciones con fechas y horarios válidos`, validacion.calendario.eventos.length === validacion.cantidad && validacion.calendario.advertencias.length === 0),
      ].join("");
      const fallos = [...validacion.evaluacion.motivos, ...validacion.calendario.advertencias]
        .map(x => `<li>${escapar(x)}</li>`).join("");
      const filas = validacion.calendario.eventos.map(e => `<div class="evento"><strong>Contenido ${escapar(e.numeroContenido)}</strong><span class="chip">${escapar(e.tipo)} · ${escapar(e.red)}</span><span>${escapar(fechaLocal(e, pedido.zonaHoraria))}</span></div>`).join("");
      const vigente = existente?.revision === validacion.evaluacion.revision &&
        existente?.estado === "aprobacion_administrativa_pendiente_activacion";
      const listaActivacion = vigente && validacion.listo && pedido.estadoServicio === 'sin_activar';
      return pagina("Aprobar y programar semana", `
        <section><h2>Resumen del pedido</h2><div class="grid"><div class="dato"><small>ID del pedido</small><strong>${escapar(pedidoId)}</strong></div><div class="dato"><small>Emprendimiento</small><strong>${escapar(pedido.negocio?.nombre || "—")}</strong></div><div class="dato"><small>Redes elegidas</small><strong>${escapar((pedido.redes || []).join(" · "))}</strong></div><div class="dato"><small>Zona horaria</small><strong>${escapar(pedido.zonaHoraria || "—")}</strong></div><div class="dato"><small>Estado del servicio</small><strong>${escapar((pedido.estadoServicio || "—").replaceAll("_", " "))}</strong></div></div><div class="acciones-link"><a class="enlace-suave" href="/api/admin/servicios/publicaciones/archivos?pedidoId=${encodeURIComponent(pedidoId)}">Revisar archivos y correcciones ↗</a><a class="enlace-suave" href="${RUTA}">Volver a los pedidos</a></div></section>
        <section><h2>Verificaciones previas</h2>${condiciones}${fallos ? `<ul class="mal lista-fallos">${fallos}</ul>` : ""}</section>
        <section><h2>Programación propuesta</h2><p class="muted">Horarios calculados desde este momento, según la zona horaria del cliente. Todavía no son fechas definitivas.</p>${filas || '<p class="muted">No se pudo generar una propuesta completa.</p>'}</section>
        <section class="accion-panel"><h2>Aprobación y activación</h2>${vigente ? '<p class="bien">La revisión administrativa está aprobada. La activación es el siguiente paso.</p>' : ""}
          ${validacion.listo && !vigente ? `<form method="post" action="${RUTA}"><input type="hidden" name="pedidoId" value="${escapar(pedidoId)}"><input type="hidden" name="accion" value="aprobar_revision"><input type="hidden" name="csrf" value="${token(env,pedidoId,validacion.evaluacion.revision)}"><button type="submit">Aprobar revisión administrativa</button></form>` : !vigente ? '<p class="muted">Completá los requisitos pendientes antes de aprobar.</p>' : ''}
          ${listaActivacion ? `<form method="post" action="${RUTA}">
            <input type="hidden" name="pedidoId" value="${escapar(pedidoId)}">
            <input type="hidden" name="accion" value="activar_semana">
            <input type="hidden" name="csrf" value="${token(env,pedidoId,validacion.evaluacion.revision)}">
            <button type="submit">Activar y programar semana</button>
          </form>` : '<p class="muted">La programación requiere la revisión aprobada y la habilitación del servicio.</p>'}
          <p class="ayuda">La activación inicia los siete días de prueba y habilita los envíos a las redes seleccionadas, según los horarios aprobados.</p>
        </section>`);
    });
  } catch (error) {
    console.error("Admin programación:", error?.name || "error");
    return pagina("Revisión no disponible", "<p>No se pudo consultar la información de esta semana.</p>", 503);
  }
}
