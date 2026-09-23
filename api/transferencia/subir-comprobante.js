import { put } from "@vercel/blob";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { enviarNotificacionTelegram } from "../../lib/telegram.js";

export const config = {
  api: {
    bodyParser: false,
  },
};

const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(valor);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const pedidoId =
      req.query?.pedidoId;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    const tipoContenido =
      req.headers["content-type"];

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (
      !tiposPermitidos.includes(
        tipoContenido
      )
    ) {
      return res.status(400).json({
        error:
          "Formato no permitido. Usa JPG, PNG, WEBP o PDF.",
      });
    }

    const db =
      await conectarMongoDB();

    const pedidos =
      db.collection("pedidos");

    const pedido =
      await pedidos.findOne({
        pedidoId,
        metodoPago: "transferencia",
      });

    if (!pedido) {
      return res.status(404).json({
        error:
          "Pedido por transferencia no encontrado.",
      });
    }

    if (
      pedido.estado === "aprobado"
    ) {
      return res.status(400).json({
        error:
          "Este pedido ya fue aprobado.",
      });
    }

    /* =========================
       GUARDAR COMPROBANTE
    ========================= */

    const extensiones = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "application/pdf": "pdf",
    };

    const extension =
      extensiones[tipoContenido];

    const ruta =
      `comprobantes/${pedidoId}.${extension}`;

    const blob = await put(
      ruta,
      req,
      {
        access: "private",
        addRandomSuffix: false,
        contentType: tipoContenido,
      }
    );

    /* =========================
       ACTUALIZAR PEDIDO
    ========================= */

    const fecha = new Date();

    await pedidos.updateOne(
      {
        pedidoId,
        metodoPago: "transferencia",
      },
      {
        $set: {
          estado:
            "comprobante_recibido",

          comprobante: {
            pathname:
              blob.pathname,

            contentType:
              tipoContenido,

            subidoEn:
              fecha,
          },
        },

        $push: {
          historialEstados: {
            estado:
              "comprobante_recibido",

            fecha,
          },
        },
      }
    );

    /* =========================
       NOTIFICACIÓN TELEGRAM
    ========================= */

    const productos =
      pedido.productos?.length
        ? pedido.productos
        : [
            {
              nombre:
                pedido.nombreProducto,
            },
          ];

    const listaProductos =
      productos
        .map(
          (producto) =>
            `• ${producto.nombre}`
        )
        .join("\n");

    await enviarNotificacionTelegram({
      texto:
        `<b>Comprobante recibido</b>\n\n` +
        `<b>Cliente:</b> ${pedido.nombreComprador}\n` +
        `<b>Email:</b> ${pedido.emailComprador}\n\n` +
        `<b>Productos:</b>\n${listaProductos}\n\n` +
        `<b>Total:</b> ${formatearPesos(
          pedido.precio
        )}\n\n` +
        `<b>Acción:</b> Revisar comprobante\n` +
        `<b>Pedido:</b> ${pedidoId}`,

      botonTexto:
        "Revisar en Admin",

      botonUrl:
        "https://andreshousesitter.com/admin",
    });

    /* =========================
       RESPUESTA
    ========================= */

    return res.status(200).json({
      recibido: true,

      estado:
        "comprobante_recibido",
    });
  } catch (error) {
    console.error(
      "Error subiendo comprobante:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo subir el comprobante.",
    });
  }
}