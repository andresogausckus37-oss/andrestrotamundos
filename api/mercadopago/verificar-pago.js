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

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN"
      );
    }

    const db = await conectarMongoDB();

    let pedido = await db
      .collection("pedidos")
      .findOne({ pedidoId });

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    // Si Mongo ya lo tiene aprobado,
    // no necesitamos consultar Mercado Pago.
    if (pedido.estado === "aprobado") {
      return res.status(200).json({
        pedidoId: pedido.pedidoId,
        productoId: pedido.productoId,
        aprobado: true,
        estado: "aprobado",
      });
    }

    if (!pedido.mercadoPagoOrderId) {
      return res.status(200).json({
        pedidoId: pedido.pedidoId,
        productoId: pedido.productoId,
        aprobado: false,
        estado: pedido.estado,
      });
    }

    // Respaldo: consultar directamente la Order
    // en Mercado Pago.
    const respuesta = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
        pedido.mercadoPagoOrderId
      )}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const order = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error consultando Order:",
        JSON.stringify(order, null, 2)
      );

      return res.status(200).json({
        pedidoId: pedido.pedidoId,
        productoId: pedido.productoId,
        aprobado: false,
        estado: pedido.estado,
      });
    }

    const pago =
      order.transactions?.payments?.[0];

    const referenciaCorrecta =
      String(order.external_reference) ===
      String(pedido.pedidoId);

    const orderCorrecta =
      String(order.id) ===
      String(pedido.mercadoPagoOrderId);

    const montoCorrecto =
      Number(order.total_amount) ===
      Number(pedido.precio);

    const pagoAprobado =
      order.status === "processed" &&
      order.status_detail === "accredited" &&
      pago?.status === "processed" &&
      pago?.status_detail === "accredited";

    if (
      referenciaCorrecta &&
      orderCorrecta &&
      montoCorrecto &&
      pagoAprobado
    ) {
      await db
        .collection("pedidos")
        .updateOne(
          { pedidoId: pedido.pedidoId },
          {
            $set: {
              estado: "aprobado",
              pagadoEn: new Date(),
              mercadoPagoPaymentId: pago.id,
            },
          }
        );

      return res.status(200).json({
        pedidoId: pedido.pedidoId,
        productoId: pedido.productoId,
        aprobado: true,
        estado: "aprobado",
      });
    }

    return res.status(200).json({
      pedidoId: pedido.pedidoId,
      productoId: pedido.productoId,
      aprobado: false,
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