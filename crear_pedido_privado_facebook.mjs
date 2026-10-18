/**
 * PRUEBA PRIVADA: crea exactamente un pedido SER-... con Facebook contratado,
 * sin cobro, sin comprobante y sin programaciones.
 *
 * Uso en Replit (sin desplegar el script):
 *   node crear_pedido_privado_facebook.mjs --verificar
 *   node crear_pedido_privado_facebook.mjs --crear
 *
 * Requiere MONGODB_URI en Secrets de Replit. NO mostrar ese valor.
 */
import crypto from "node:crypto";

const ORIGEN = "https://andreshousesitter.com";
const RUTA = "/servicios/publicacion-automatica";
const BD = "andres_imprimibles";
const COLECCION = "pedidos_servicios";
const PARAMETRO = process.argv.slice(2);

const validarComando = PARAMETRO.length === 1 && ["--verificar", "--crear"].includes(PARAMETRO[0]);
if (!validarComando) {
  console.error("Uso: node crear_pedido_privado_facebook.mjs --verificar | --crear");
  process.exit(1);
}

function salir(mensaje, error = true) {
  console[error ? "error" : "log"](mensaje);
  process.exit(error ? 1 : 0);
}

async function comprobarAPI() {
  let plan;
  try {
    const respuesta = await fetch(`${ORIGEN}/api/servicios/publicaciones/plan`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    plan = await respuesta.json();
    if (!respuesta.ok || plan?.ok !== true || plan?.plan?.id !== "comunidad-semanal") {
      throw new Error("Plan Comunidad Semanal no disponible.");
    }
    if (plan.pedidosHabilitados !== false || plan.cobrosHabilitados !== false) {
      throw new Error("Se detiene la prueba: la API informa contratación o cobros habilitados.");
    }
    if (plan.transferenciasHabilitadas !== true) {
      throw new Error("La API de transferencias está deshabilitada; el configurador no podrá recuperar el pedido.");
    }
    console.log("OK: plan y transferencias disponibles; contratación pública y cobros deshabilitados.");
  } catch (e) {
    salir(`ERROR comprobando el Worker: ${e.message}`);
  }
}

await comprobarAPI();
const uri = String(process.env.MONGODB_URI || "").trim();
if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
  salir("Falta MONGODB_URI en los Secrets de Replit. No copies la contraseña de MongoDB en el código o en este chat.");
}

let MongoClient;
try {
  ({ MongoClient } = await import("mongodb"));
} catch {
  salir("Falta el paquete mongodb en Replit. Ejecutá npm install mongodb antes de reintentar.");
}

const cliente = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
try {
  await cliente.connect();
  const coleccion = cliente.db(BD).collection(COLECCION);
  await cliente.db(BD).command({ ping: 1 });
  console.log(`OK: MongoDB conectado (${BD}.${COLECCION}).`);

  if (PARAMETRO[0] === "--verificar") {
    console.log("COMPROBACIÓN TERMINADA: no se escribió ni modificó ningún pedido.");
    process.exitCode = 0;
  } else {
    const pedidoId = `SER-${crypto.randomUUID()}`;
    const tokenAcceso = crypto.randomBytes(32).toString("hex");
    const tokenAccesoHash = crypto.createHash("sha256").update(tokenAcceso).digest("hex");
    const fecha = new Date();
    const dias = ["Lunes", "Miércoles", "Viernes", "Domingo"];
    const publicaciones = dias.map((dia, i) => ({
      id: `contenido-${i + 1}`,
      tipo: "imagen", formato: "4:5", diaPreferido: dia,
      horaLocalPreferida: "18:00",
      descripcion: "PRUEBA INTERNA. No publicar.",
      ctaInstagram: "", ctaFacebook: "", urlFacebook: "", hashtags: "",
      archivos: [], fechaHoraDefinitiva: null, estado: "pendiente_preparacion",
    }));
    const pedido = {
      pedidoId, tokenAccesoHash, tipo: "publicaciones",
      planId: "comunidad-semanal", nombrePlan: "Comunidad Semanal",
      contenidos: 4, duracionDias: 7,
      moneda: "ARS", precio: 15000, metodoPago: "transferencia",
      cantidadPublicaciones: 4,
      redes: ["facebook"], zonaHoraria: "America/Argentina/Buenos_Aires",
      negocio: {
        nombre: "PRUEBA PRIVADA FACEBOOK - NO COBRAR",
        rubro: "Prueba de panel", contacto: "Prueba técnica",
        email: "prueba@ejemplo.invalid", url: "", whatsapp: "",
        publico: "", tono: "cercano",
      },
      publicaciones,
      modalidadCalendario: "periodo_flexible_7_dias_consecutivos",
      criterioInicio: "primera_publicacion_confirmada_tras_pago_cuentas_y_aprobacion",
      fechaInicioServicio: null, fechaFinServicio: null,
      estado: "pendiente_comprobante", estadoPago: "pendiente",
      estadoCuentas: "pendiente_vinculacion", estadoContenidos: "pendiente_carga",
      estadoServicio: "sin_activar", archivosSubidos: false,
      comprobante: null, paypalOrderId: null, paypalCaptureId: null,
      creadoEn: fecha, actualizadoEn: fecha, pagadoEn: null, activadoEn: null,
      historialEstados: [{ estado: "pendiente_comprobante", fecha }],
      // Etiqueta informativa: no modifica el estado de pago ni activa servicios.
      pruebaTecnica: true, pruebaPrivadaFacebook: true,
    };

    await coleccion.insertOne(pedido);

    // El número SER-... no es secreto; la clave privada SÍ lo es.
    const enlace = `${ORIGEN}${RUTA}#pedido=${encodeURIComponent(pedidoId)}&clave=${encodeURIComponent(tokenAcceso)}`;
    console.log("\nPEDIDO PRIVADO DE PRUEBA CREADO EN MONGODB");
    console.log(`Código: ${pedidoId}`);
    console.log("Facebook contratado: SÍ");
    console.log("Pago confirmado: NO");
    console.log("Publicaciones habilitadas: NO");
    console.log("\nENLACE PRIVADO (GUARDAR EN LUGAR SEGURO; NO COMPARTIR):");
    console.log(enlace);
    console.log("\nNo transfieras dinero ni subas comprobantes: es una prueba técnica.");

    // Comprobación remota real: permisos y estado del panel, con la clave en Bearer.
    // El enlace ya se imprime arriba para conservarlo incluso ante un fallo de red.
    try {
      const headers = { Authorization: `Bearer ${tokenAcceso}`, Accept: "application/json" };
      const respuestaRecuperar = await fetch(`${ORIGEN}/api/servicios/publicaciones/transferencia?pedidoId=${encodeURIComponent(pedidoId)}`, {
        headers, cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      const recuperacion = await respuestaRecuperar.json();
      if (!respuestaRecuperar.ok || !recuperacion?.ok || recuperacion.pedidoId !== pedidoId) {
        throw new Error("La API de recuperación no reconoció el pedido privado.");
      }
      console.log("OK: la API de recuperación acepta la clave privada.");
      const respuestaFacebook = await fetch(`${ORIGEN}/api/servicios/meta/pedidos/estado?pedidoId=${encodeURIComponent(pedidoId)}`, {
        headers, cache: "no-store", signal: AbortSignal.timeout(15000),
      });
      const estado = await respuestaFacebook.json();
      if (!respuestaFacebook.ok || estado?.ok !== true ||
          estado.facebookContratado !== true || estado.pagoConfirmado !== false || estado.habilitada !== false) {
        throw new Error("La API de Facebook devolvió un estado distinto del esperado.");
      }
      console.log("OK: Facebook contratado, pero conexión bloqueada hasta confirmar el pago.");
    } catch (e) {
      console.error(`AVISO: pedido guardado, pero falta verificar su acceso remoto: ${e.message}`);
      process.exitCode = 2;
    }
  }
} catch (e) {
  // No exponer URI ni documentos ni tokens en mensajes de error.
  console.error(`ERROR: ${e?.name || "Error"} al conectar o guardar el pedido de prueba.`);
  process.exitCode = 1;
} finally {
  await cliente.close().catch(() => {});
}
