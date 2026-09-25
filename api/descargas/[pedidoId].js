import { get } from "@vercel/blob";
import { conectarMongoDB } from "../../lib/mongodb.js";

const ARCHIVOS_PRODUCTOS = {
  "50-laberintos-para-ninos":
    "50-laberintos-para-niños.pdf",

  "50-crucigramas-reino-animal":
    "50-crucigramas-reino-animal-con-soluciones.pdf",

  "25-sopas-de-letras-para-adultos":
  "25-sopas-de-letras-adultos.pdf",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const { pedidoId, productoId } =
      req.query;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    const db = await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne({ pedidoId });

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    if (pedido.estado !== "aprobado") {
      return res.status(403).json({
        error:
          "El pago todavía no está aprobado",
      });
    }

    /* =====================================================
       PRODUCTOS COMPRADOS
    ===================================================== */

    const productosComprados =
      Array.isArray(pedido.productos) &&
      pedido.productos.length > 0
        ? pedido.productos.map(
            (producto) =>
              producto.productoId
          )
        : [pedido.productoId];

    const productoSolicitado =
      productoId ||
      pedido.productoId;

    /* =====================================================
       VALIDAR PRODUCTO
    ===================================================== */

    if (
      !productosComprados.includes(
        productoSolicitado
      )
    ) {
      return res.status(403).json({
        error:
          "Este producto no pertenece al pedido",
      });
    }

    /* =====================================================
       COMPROBAR SI YA FUE DESCARGADO
    ===================================================== */

    const yaDescargado =
      Array.isArray(
        pedido.historialDescargas
      ) &&
      pedido.historialDescargas.some(
        (descarga) =>
          descarga.productoId ===
          productoSolicitado
      );

    if (yaDescargado) {
      return res.status(403).json({
        error:
          "Este producto ya fue descargado",
      });
    }

    /* =====================================================
       ARCHIVO
    ===================================================== */

    const archivo =
      ARCHIVOS_PRODUCTOS[
        productoSolicitado
      ];

    if (!archivo) {
      return res.status(404).json({
        error:
          "Archivo del producto no encontrado",
      });
    }

    const resultado = await get(
      archivo,
      {
        access: "private",
      }
    );

    if (!resultado) {
      return res.status(404).json({
        error: "PDF no encontrado",
      });
    }

    /* =====================================================
       RESERVAR DESCARGA
       Evita múltiples solicitudes simultáneas
    ===================================================== */

    const fechaDescarga = new Date();

    const actualizacion = await db
      .collection("pedidos")
      .updateOne(
        {
          pedidoId,
          estado: "aprobado",
          historialDescargas: {
            $not: {
              $elemMatch: {
                productoId:
                  productoSolicitado,
              },
            },
          },
        },
        {
          $inc: {
            descargas: 1,
          },

          $push: {
            historialDescargas: {
              productoId:
                productoSolicitado,

              fecha:
                fechaDescarga,
            },
          },
        }
      );

    if (
      actualizacion.modifiedCount !== 1
    ) {
      return res.status(403).json({
        error:
          "Este producto ya fue descargado",
      });
    }

    /* =====================================================
       ENVIAR PDF
    ===================================================== */

    res.setHeader(
      "Content-Type",
      resultado.blob.contentType ||
        "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${archivo}"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    const reader =
      resultado.stream.getReader();

    while (true) {
      const { done, value } =
        await reader.read();

      if (done) break;

      res.write(
        Buffer.from(value)
      );
    }

    res.end();
  } catch (error) {
    console.error(
      "Error descargando producto:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          "Error al descargar el producto",
      });
    }

    res.end();
  }
}