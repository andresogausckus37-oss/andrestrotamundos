/**
 * Diagnóstico de solo lectura de la API pública de publicaciones.
 * Uso: node verificar_api_publicaciones.mjs [URL_BASE_DEL_WORKER]
 * No consulta ni altera registros MongoDB. No envía credenciales.
 */
const URL_BASE_PREDETERMINADA = "https://andrestrotamundos.andresogausckus37.workers.dev";
const BASE = process.argv[2] || URL_BASE_PREDETERMINADA;
const ESPERADOS = { ARS: { "1": 15000, "2": 25000 }, USD: { "1": 15, "2": 25 } };
let url;
try {
  url = new URL("/api/servicios/publicaciones/plan", BASE);
  if (!/^https?:$/.test(url.protocol)) throw new Error("Esquema inválido");
} catch {
  console.error("ERROR: Dirección del Worker inválida.");
  process.exit(1);
}
console.log(`Consultando GET ${url.href}`);
let respuesta;
try {
  respuesta = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
    redirect: "manual",
  });
} catch (error) {
  console.error(`ERROR de conexión: ${error?.message || String(error)}`);
  console.error("Comprobá la conexión y que el Worker esté publicado en Cloudflare.");
  process.exit(1);
}
console.log(`Estado HTTP: ${respuesta.status}`);
const texto = await respuesta.text();
let datos;
try { datos = JSON.parse(texto); }
catch {
  console.error("ERROR: La ruta no devolvió JSON. Fragmento de la respuesta:");
  console.error(texto.slice(0, 300));
  console.error("Probablemente falta publicar el Worker actualizado o la ruta está redirigiendo.");
  process.exit(1);
}
if (!respuesta.ok || datos.ok !== true) {
  console.error(`ERROR: ${datos.error || "El Worker no confirmó el plan."}`);
  process.exit(1);
}
const problemas = [];
if (datos.plan?.id !== "comunidad-semanal") problemas.push("planId incorrecto");
if (datos.plan?.contenidos !== 4) problemas.push("cantidad de contenidos incorrecta");
if (datos.plan?.duracionDias !== 7) problemas.push("duración incorrecta");
for (const moneda of Object.keys(ESPERADOS)) {
  for (const cantidad of [1, 2]) {
    if (datos.precios?.[moneda]?.[cantidad] !== ESPERADOS[moneda][cantidad]) {
      problemas.push(`precio ${moneda}, ${cantidad} red(es): esperado ${ESPERADOS[moneda][cantidad]}`);
    }
  }
}
console.log(`Plan: ${datos.plan?.nombre || datos.plan?.id || "(sin nombre)"}`);
console.log(`Precios ARS: ${JSON.stringify(datos.precios?.ARS ?? null)}`);
console.log(`Precios USD: ${JSON.stringify(datos.precios?.USD ?? null)}`);
console.log(`Pedidos habilitados: ${datos.pedidosHabilitados === true ? "SÍ" : "NO"}`);
console.log(`Cobros habilitados: ${datos.cobrosHabilitados === true ? "SÍ" : "NO"}`);
if (datos.cobrosHabilitados === true) problemas.push("el backend anuncia cobros habilitados antes de la integración de pagos");
if (problemas.length) {
  console.error("ERROR: Hay diferencias con el configurador:");
  for (const problema of problemas) console.error(`- ${problema}`);
  process.exit(1);
}
console.log("CORRECTO: La API de consulta responde con el plan y los precios previstos.");
console.log("NOTA: Esta comprobación no demuestra que MongoDB esté conectada ni crea una orden.");
if (datos.pedidosHabilitados === true) {
  console.log("ATENCIÓN: Los pedidos públicos figuran habilitados. Recordá que los pagos siguen pendientes.");
} else {
  console.log("SIGUIENTE: Preparar Turnstile y probar la creación controlada de un pedido antes de abrir la contratación.");
}
