/**
 * Prueba controlada de creación de UN pedido en MongoDB a través del Worker.
 * No cobra ni programa publicaciones. Requiere un token temporal secreto.
 *
 * Comprobación sin escritura: node probar_pedido_servicio.mjs --verificar
 * Crear pedido de prueba:   node probar_pedido_servicio.mjs
 */
const BASE = "https://andrestrotamundos.andresogausckus37.workers.dev";
const TOKEN = String(process.env.SERVICIO_PEDIDOS_PRUEBA_TOKEN ?? "").trim();

if (!/^[0-9a-f]{64}$/i.test(TOKEN)) {
  console.error("Falta SERVICIO_PEDIDOS_PRUEBA_TOKEN en Secrets de Replit (64 caracteres hexadecimales).");
  process.exit(1);
}

async function leerJson(res) {
  const data = await res.json().catch(() => null);
  if (!data || typeof data !== "object") throw new Error(`Respuesta no JSON (HTTP ${res.status}).`);
  return data;
}

let plan;
try {
  const res = await fetch(`${BASE}/api/servicios/publicaciones/plan`, {
    headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(15000),
  });
  plan = await leerJson(res);
  if (!res.ok || !plan.ok || plan.plan?.id !== "comunidad-semanal") {
    throw new Error("La API de plan no respondió correctamente.");
  }
  if (plan.pedidosHabilitados !== false || plan.cobrosHabilitados !== false) {
    throw new Error("La prueba se detiene: pedidos públicos o cobros figuran habilitados.");
  }
  if (!plan.turnstileSiteKey) throw new Error("Falta la clave pública de Turnstile.");
} catch (err) {
  console.error(`ERROR de comprobación previa: ${err.message}`);
  process.exit(1);
}
console.log("OK: plan disponible, Turnstile público configurado, pedidos públicos y cobros deshabilitados.");
if (process.argv.includes("--verificar")) {
  console.log("COMPROBACIÓN TERMINADA: no se creó ningún pedido.");
  process.exit(0);
}

const casos = [
  ["reel", "9:16", "Miércoles"],
  ["carrusel", "4:5", "Jueves"],
  ["imagen", "4:5", "Sábado"],
  ["reel", "9:16", "Domingo"],
];
const payload = {
  planId: "comunidad-semanal",
  redes: ["instagram"],
  moneda: "ARS",
  zonaHoraria: "America/Argentina/Buenos_Aires",
  negocio: {
    nombre: "TEST INTERNO - No contratar", rubro: "Prueba de integración",
    contacto: "Prueba técnica", email: "prueba@example.invalid",
    url: "", whatsapp: "", publico: "", tono: "cercano",
  },
  publicaciones: casos.map(([tipo, formato, dia], i) => ({
    id: `contenido-${i + 1}`, tipo, formato, dia, hora: "18:00",
    descripcion: "Prueba técnica sin publicación real", ctaInstagram: "",
    ctaFacebook: "", urlFacebook: "", hashtags: "", archivosSeleccionados: [],
  })),
};

try {
  const res = await fetch(`${BASE}/api/servicios/publicaciones/pedidos`, {
    method: "POST", signal: AbortSignal.timeout(20000),
    headers: {
      "Content-Type": "application/json", Accept: "application/json",
      "x-servicio-pedidos-prueba": TOKEN,
    },
    body: JSON.stringify(payload),
  });
  const data = await leerJson(res);
  if (res.status !== 201 || data.ok !== true || data.modoPrueba !== true ||
      !String(data.pedidoId ?? "").startsWith("TEST-SER-") ||
      data.moneda !== "ARS" || data.precio !== 15000 || data.pagoHabilitado !== false) {
    throw new Error(`Respuesta inesperada (HTTP ${res.status}): ${data.error || JSON.stringify(data)}`);
  }
  console.log("PEDIDO DE PRUEBA GUARDADO en MongoDB por el Worker.");
  console.log(`Pedido: ${data.pedidoId}`);
  console.log(`Importe calculado: ARS ${data.precio}`);
  console.log(`Estado: ${data.estado}; pago habilitado: NO; servicio activado: NO.`);
  console.log("Siguiente: revisar el documento en la colección andres_imprimibles.pedidos_servicios.");
} catch (err) {
  console.error(`ERROR al crear el pedido: ${err.message}`);
  process.exitCode = 1;
}
