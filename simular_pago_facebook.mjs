/**
 * PRUEBA INTERNA: habilita temporalmente Facebook en UN pedido técnico.
 * No procesa pagos, no modifica otros pedidos ni habilita publicaciones.
 * Requiere MONGODB_URI en Secrets de Replit.
 *
 * node simular_pago_facebook.mjs --estado
 * node simular_pago_facebook.mjs --habilitar
 * node simular_pago_facebook.mjs --restaurar
 */
import { MongoClient } from "mongodb";

const ID = "SER-895dfbbc-bb26-44c0-b335-db78ccdd2b0d";
const BASE = "https://andreshousesitter.com";
const MODO = process.argv[2];
if (process.argv.length !== 3 || !["--estado", "--habilitar", "--restaurar"].includes(MODO)) {
  console.error("Uso: node simular_pago_facebook.mjs --estado | --habilitar | --restaurar");
  process.exit(1);
}
const uri = String(process.env.MONGODB_URI || "").trim();
if (!/^mongodb(?:\+srv)?:\/\//i.test(uri)) {
  console.error("ERROR: falta MONGODB_URI en Secrets de Replit.");
  process.exit(1);
}

async function verificarCierrePublico() {
  const r = await fetch(`${BASE}/api/servicios/publicaciones/plan`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok || d?.ok !== true || d?.pedidosHabilitados !== false || d?.cobrosHabilitados !== false) {
    throw new Error("La contratación o los cobros públicos no están deshabilitados: prueba cancelada.");
  }
}

function esPedidoTecnico(p) {
  return p && p.pedidoId === ID && p.tipo === "publicaciones" &&
    p.pruebaTecnica === true && p.pruebaPrivadaFacebook === true &&
    p.negocio?.nombre === "PRUEBA PRIVADA FACEBOOK - NO COBRAR" &&
    Array.isArray(p.redes) && p.redes.length === 1 && p.redes[0] === "facebook" &&
    p.estadoServicio === "sin_activar" && p.activadoEn == null &&
    p.fechaInicioServicio == null;
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 12000 });
try {
  // Antes de habilitar se verifica además que el sitio mantenga cerrado el cobro.
  if (MODO === "--habilitar") await verificarCierrePublico();
  await client.connect();
  const db = client.db("andres_imprimibles");
  const pedidos = db.collection("pedidos_servicios");
  const pedido = await pedidos.findOne({ pedidoId: ID, tipo: "publicaciones" });
  if (!esPedidoTecnico(pedido)) {
    throw new Error("Pedido ausente o sin las marcas y restricciones de prueba exigidas. Ningún cambio realizado.");
  }
  const simulada = pedido.simulacionPagoFacebook === true;

  if (MODO === "--estado") {
    console.log("PEDIDO TÉCNICO:", ID);
    console.log("Estado de pago:", pedido.estadoPago);
    console.log("Simulación activa:", simulada ? "SÍ" : "NO");
    console.log("Servicio activado:", pedido.estadoServicio === "sin_activar" ? "NO" : "REVISAR");
  } else if (MODO === "--habilitar") {
    if (simulada) {
      console.log("La simulación ya está habilitada; no se modificó el documento.");
    } else {
      if (pedido.pruebaMetaPagoBackup || pedido.pagadoEn != null ||
          pedido.estadoPago === "confirmado" ||
          !["pendiente", "verificando_comprobante", "verificando"].includes(pedido.estadoPago)) {
        throw new Error("El pedido tiene un estado de pago inesperado. No se modificó.");
      }
      const fecha = new Date();
      const backup = {
        estadoPago: pedido.estadoPago,
        pagadoEn: pedido.pagadoEn ?? null,
        actualizadoEn: pedido.actualizadoEn ?? null,
      };
      const r = await pedidos.updateOne({
        _id: pedido._id, pruebaTecnica: true, pruebaPrivadaFacebook: true,
        estadoPago: pedido.estadoPago, pagadoEn: null,
        simulacionPagoFacebook: { $ne: true }, pruebaMetaPagoBackup: { $exists: false },
        estadoServicio: "sin_activar", activadoEn: null,
      }, {
        $set: {
          estadoPago: "confirmado", pagadoEn: fecha,
          simulacionPagoFacebook: true, pruebaMetaPagoBackup: backup,
          actualizadoEn: fecha,
        },
      });
      if (r.modifiedCount !== 1) throw new Error("El pedido cambió durante la comprobación. Ningún estado alterado.");
      console.log("OK: Facebook habilitado temporalmente SOLO para el pedido técnico.");
      console.log("NO se efectuó ningún pago real ni se activaron publicaciones.");
      console.log("Cuando termines, ejecutá --restaurar.");
    }
  } else if (MODO === "--restaurar") {
    if (simulada) {
      const backup = pedido.pruebaMetaPagoBackup;
      if (!backup || !["pendiente", "verificando_comprobante", "verificando"].includes(backup.estadoPago) ||
          backup.pagadoEn != null || pedido.estadoPago !== "confirmado") {
        throw new Error("No se pudo validar el estado anterior; restauración detenida.");
      }
      const r = await pedidos.updateOne({
        _id: pedido._id, pruebaTecnica: true, pruebaPrivadaFacebook: true,
        simulacionPagoFacebook: true, estadoPago: "confirmado",
        estadoServicio: "sin_activar", activadoEn: null,
      }, {
        $set: {
          estadoPago: backup.estadoPago, pagadoEn: backup.pagadoEn,
          actualizadoEn: new Date(),
        },
        $unset: { simulacionPagoFacebook: "", pruebaMetaPagoBackup: "" },
      });
      if (r.modifiedCount !== 1) throw new Error("No se pudo restaurar el pedido técnico.");
      console.log("OK: estado de pago anterior restaurado; Facebook vuelve a estar bloqueado.");
    } else if (pedido.pruebaMetaPagoBackup) {
      throw new Error("Se encontró un respaldo pendiente no reconocido. Revisar antes de continuar.");
    } else {
      console.log("El pedido ya está sin simulación de pago.");
    }
    // Limpiar solamente la conexión y los inicios OAuth de ESTE pedido técnico.
    await db.collection("conexiones_meta_pedidos").deleteOne({ _id: `facebook:${ID}`, pedidoId: ID });
    await db.collection("meta_oauth_pedidos").deleteMany({ pedidoId: ID });
    console.log("OK: conexión Meta y autorizaciones pendientes de ESTE pedido eliminadas de MongoDB.");
    console.log("La prueba administrativa Redes en Piloto y Mega Bazar no se modifican.");
  }
} catch (error) {
  console.error("ERROR:", error?.message || "No se pudo realizar la operación.");
  process.exitCode = 1;
} finally {
  await client.close().catch(() => {});
}
