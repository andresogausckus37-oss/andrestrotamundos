/**
 * Etapa 2 · Preflight sin escrituras para transferencias de publicaciones.
 * Uso:
 *   node verificar_activacion_ars.mjs --cerrado
 *   node verificar_activacion_ars.mjs --transferencias
 * Opcional: URL del Worker como segundo argumento.
 *
 * Solo realiza GET; no crea pedidos, no carga archivos, no marca pagos.
 * No imprime datos bancarios ni claves Turnstile.
 */
import { randomUUID } from "node:crypto";

const MODO = process.argv[2] || "--cerrado";
if (!["--cerrado", "--transferencias"].includes(MODO)) {
  console.error("Uso: node verificar_activacion_ars.mjs --cerrado|--transferencias [URL_WORKER]");
  process.exit(2);
}
const ORIGEN_PREDETERMINADO = "https://andrestrotamundos.andresogausckus37.workers.dev";
let base;
try {
  base = new URL(process.argv[3] || ORIGEN_PREDETERMINADO);
  if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) {
    throw new Error("URL inválida");
  }
} catch {
  console.error("ERROR: URL del Worker no válida.");
  process.exit(2);
}
const problemas = [];
async function consultar(ruta) {
  const url = new URL(ruta, base);
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    redirect: "manual",
    signal: AbortSignal.timeout(12000),
  });
  const body = await response.text();
  let data;
  try { data = JSON.parse(body); }
  catch { data = null; }
  if (!data || typeof data !== "object") {
    throw new Error(`${url.pathname} devolvió contenido no JSON (HTTP ${response.status}).`);
  }
  return { status: response.status, data };
}
function exigir(condicion, descripcion) {
  console.log(`${condicion ? "OK" : "ERROR"}: ${descripcion}`);
  if (!condicion) problemas.push(descripcion);
}
function noSi(valor) { return valor === true ? "SÍ" : "NO"; }

try {
  console.log(`Comprobación ${MODO} · ${base.origin}`);
  const plan = await consultar("/api/servicios/publicaciones/plan");
  exigir(plan.status === 200 && plan.data.ok === true, "API del plan responde HTTP 200");
  exigir(plan.data.plan?.id === "comunidad-semanal" && plan.data.plan?.contenidos === 4 && plan.data.plan?.duracionDias === 7,
    "Plan Comunidad Semanal (4 contenidos / 7 días)");
  const precios = plan.data.precios || {};
  exigir(precios.ARS?.[1] === 15000 && precios.ARS?.[2] === 25000, "Precios ARS: $15.000 y $25.000");
  exigir(precios.USD?.[1] === 15 && precios.USD?.[2] === 25, "Precios USD en el catálogo: 15 y 25 (cobros aún cerrados)");
  exigir(typeof plan.data.turnstileSiteKey === "string" && plan.data.turnstileSiteKey.length > 0,
    "Clave pública de Turnstile disponible (no se muestra)");
  exigir(plan.data.proteccionesPreparadas === true, "Limitadores nativos disponibles en el Worker");
  exigir(plan.data.cobrosHabilitados === false, "PayPal/cobros online deshabilitados");
  exigir(plan.data.pedidosHabilitados === false, "Creación pública de pedidos DESHABILITADA");
  const esperaTransferencias = MODO === "--transferencias";
  exigir(plan.data.transferenciasHabilitadas === esperaTransferencias,
    `Transferencias: ${noSi(plan.data.transferenciasHabilitadas)} (esperado: ${esperaTransferencias ? "SÍ" : "NO"})`);

  const admin = await consultar("/api/admin/servicios/transferencias?accion=listar");
  exigir(admin.status === 401, "Listado Admin rechaza solicitudes sin sesión (HTTP 401)");

  // Pedido inexistente y sin clave: jamás se consultan comprobantes reales ni datos bancarios.
  const idFicticio = `SER-${randomUUID()}`;
  const transferencia = await consultar(`/api/servicios/publicaciones/transferencia?pedidoId=${idFicticio}`);
  const estadoEsperado = esperaTransferencias ? 404 : 503;
  exigir(transferencia.status === estadoEsperado,
    `Consulta anónima de pedido inexistente bloqueada (HTTP ${transferencia.status}, esperado ${estadoEsperado})`);
  exigir(!Object.hasOwn(transferencia.data, "cuenta"), "Sin exposición de datos bancarios");
} catch (error) {
  problemas.push(error?.message || String(error));
  console.error("ERROR de comprobación:", error?.message || String(error));
}

if (problemas.length) {
  console.error(`\nREVISAR: ${problemas.length} comprobación(es) no pasaron. No cambies los interruptores.`);
  process.exitCode = 1;
} else {
  console.log("\nCORRECTO: comprobaciones sin escrituras completadas.");
  console.log(MODO === "--cerrado"
    ? "SIGUIENTE: habilitar solamente SERVICIO_TRANSFERENCIAS_HABILITADAS para la prueba escalonada, dejando SERVICIO_PEDIDOS_HABILITADOS=false."
    : "SIGUIENTE: conservar SERVICIO_PEDIDOS_HABILITADOS=false y revisar el flujo pospago antes de abrir ventas.");
}
