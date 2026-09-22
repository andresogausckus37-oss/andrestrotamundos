import { conectarMongoDB } from "../../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const pedidoId = req.query?.pedidoId;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    const db = await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne({
        pedidoId,
        metodoPago: "transferencia",
      });

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    return res.status(200).json({
      pedidoId: pedido.pedidoId,
      estado: pedido.estado,
      historialEstados:
        pedido.historialEstados || [],
      productos: pedido.productos || [],
      total: pedido.precio,
      pagadoEn: pedido.pagadoEn || null,
      descargaHabilitada:
        pedido.estado === "aprobado",
    });
  } catch (error) {
    console.error(
      "Error consultando estado del pedido:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo consultar el estado del pedido.",
    });
  }
}