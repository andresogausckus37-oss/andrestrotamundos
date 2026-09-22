import { conectarMongoDB } from "../../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const { pedidoId } = req.query;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    const db = await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne(
        { pedidoId },
        {
          projection: {
            _id: 0,
            pedidoId: 1,
            productoId: 1,
            estado: 1,
          },
        }
      );

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    return res.status(200).json({
      pedidoId: pedido.pedidoId,
      productoId: pedido.productoId,
      aprobado: pedido.estado === "aprobado",
      estado: pedido.estado,
    });
  } catch (error) {
    console.error(
      "Error verificando pago:",
      error
    );

    return res.status(500).json({
      error: "Error verificando el pago",
    });
  }
}