import { conectarMongoDB } from "../../lib/mongodb.js";

/* =====================================================
   OBTENER PRODUCTOS DEL PEDIDO
===================================================== */

const obtenerProductosPedido = (pedido) => {
  if (
    Array.isArray(pedido.productos) &&
    pedido.productos.length > 0
  ) {
    return pedido.productos.map(
      (producto) => ({
        productoId:
          producto.productoId,

        nombre:
          producto.nombre,

        precio:
          producto.precio,
      })
    );
  }

  /* Compatibilidad con pedidos anteriores */

  return [
    {
      productoId:
        pedido.productoId,

      nombre:
        pedido.nombreProducto ||
        "Producto digital",

      precio:
        pedido.precio,
    },
  ];
};

/* =====================================================
   HANDLER
===================================================== */

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

    const db =
      await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne({ pedidoId });

    if (!pedido) {
      return res.status(404).json({
        error:
          "Pedido no encontrado",
      });
    }

    const productos =
      obtenerProductosPedido(pedido);

    /* =====================================================
       YA APROBADO EN MONGODB
    ===================================================== */

    if (
      pedido.estado === "aprobado"
    ) {
      return res.status(200).json({
        pedidoId:
          pedido.pedidoId,

        productoId:
          pedido.productoId,

        productos,

        aprobado: true,

        estado:
          "aprobado",
      });
    }

    /* =====================================================
       PEDIDO SIN ORDER DE MERCADO PAGO
    ===================================================== */

    if (
      !pedido.mercadoPagoOrderId
    ) {
      return res.status(200).json({
        pedidoId:
          pedido.pedidoId,

        productoId:
          pedido.productoId,

        productos,

        aprobado: false,

        estado:
          pedido.estado,
      });
    }

    /* =====================================================
       CONSULTAR ORDER EN MERCADO PAGO
    ===================================================== */

    const respuesta = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
        pedido.mercadoPagoOrderId
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

    const order =
      await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error consultando Order:",
        JSON.stringify(
          order,
          null,
          2
        )
      );

      return res.status(200).json({
        pedidoId:
          pedido.pedidoId,

        productoId:
          pedido.productoId,

        productos,

        aprobado: false,

        estado:
          pedido.estado,
      });
    }

    /* =====================================================
       VALIDAR ORDER
    ===================================================== */

    const pago =
      order.transactions
        ?.payments?.[0];

    const referenciaCorrecta =
      String(
        order.external_reference
      ) ===
      String(
        pedido.pedidoId
      );

    const orderCorrecta =
      String(order.id) ===
      String(
        pedido.mercadoPagoOrderId
      );

    const montoCorrecto =
      Number(
        order.total_amount
      ) ===
      Number(
        pedido.precio
      );

    const pagoAprobado =
      order.status ===
        "processed" &&
      order.status_detail ===
        "accredited" &&
      pago?.status ===
        "processed" &&
      pago?.status_detail ===
        "accredited";

    /* =====================================================
       PAGO APROBADO
    ===================================================== */

    if (
      referenciaCorrecta &&
      orderCorrecta &&
      montoCorrecto &&
      pagoAprobado
    ) {
      await db
        .collection("pedidos")
        .updateOne(
          {
            pedidoId:
              pedido.pedidoId,
          },
          {
            $set: {
              estado:
                "aprobado",

              pagadoEn:
                new Date(),

              mercadoPagoPaymentId:
                pago.id,
            },
          }
        );

      return res.status(200).json({
        pedidoId:
          pedido.pedidoId,

        productoId:
          pedido.productoId,

        productos,

        aprobado: true,

        estado:
          "aprobado",
      });
    }

    /* =====================================================
       TODAVÍA PENDIENTE
    ===================================================== */

    return res.status(200).json({
      pedidoId:
        pedido.pedidoId,

      productoId:
        pedido.productoId,

      productos,

      aprobado: false,

      estado:
        pedido.estado,
    });
  } catch (error) {
    console.error(
      "Error verificando pago:",
      error
    );

    return res.status(500).json({
      error:
        "Error verificando el pago",
    });
  }
}