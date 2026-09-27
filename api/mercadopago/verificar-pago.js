import { conectarMongoDB } from "../../lib/mongodb.js";
import { enviarEmailCompra } from "../../lib/emailCompra.js";

/* =====================================================
   ENVIAR EMAIL DE COMPRA
===================================================== */

const enviarEmailPedido = async ({
  pedidos,
  pedido,
}) => {
  if (pedido.emailEnviado === true) {
    return true;
  }

  if (!pedido.emailComprador) {
    console.error(
      `Pedido ${pedido.pedidoId}: falta emailComprador.`
    );

    return false;
  }

  if (
    !Array.isArray(pedido.productos) ||
    pedido.productos.length === 0
  ) {
    console.error(
      `Pedido ${pedido.pedidoId}: no contiene productos.`
    );

    return false;
  }

  try {
    await enviarEmailCompra({
      pedidoId: pedido.pedidoId,
      email: pedido.emailComprador,
      productos: pedido.productos,
    });

    await pedidos.updateOne(
      {
        pedidoId: pedido.pedidoId,
      },
      {
        $set: {
          emailEnviado: true,
          emailEnviadoEn: new Date(),
        },
      }
    );

    return true;
  } catch (error) {
    console.error(
      `Error enviando email del pedido ${pedido.pedidoId}:`,
      error
    );

    return false;
  }
};

/* =====================================================
   HANDLER
===================================================== */

export default async function handler(req, res) {
  /* =====================================================
     SOLO GET
  ===================================================== */

  if (req.method !== "GET") {
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

    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN"
      );
    }

    /* =====================================================
       BUSCAR PEDIDO
    ===================================================== */

    const db =
      await conectarMongoDB();

    const pedidos =
      db.collection("pedidos");

    const pedido =
      await pedidos.findOne({
        pedidoId,
      });

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    /* =====================================================
       VALIDAR MÉTODO
    ===================================================== */

    if (
      pedido.metodoPago !==
      "mercadopago"
    ) {
      return res.status(400).json({
        error:
          "Método de pago no válido",
      });
    }

    /* =====================================================
       SI YA ESTÁ APROBADO
    ===================================================== */

    if (pedido.estado === "aprobado") {
      /*
       * Si el webhook aprobó primero el pedido
       * pero el email todavía no fue enviado,
       * hacemos un intento desde aquí.
       */

      let emailEnviado =
        pedido.emailEnviado === true;

      if (!emailEnviado) {
        emailEnviado =
          await enviarEmailPedido({
            pedidos,
            pedido,
          });
      }

      return res.status(200).json({
        pedidoId:
          pedido.pedidoId,

        productoId:
          pedido.productoId,

        productos:
          pedido.productos || [],

        aprobado: true,

        estado:
          "aprobado",

        emailEnviado,
      });
    }

    /* =====================================================
       VALIDAR ORDER ID
    ===================================================== */

    const orderId =
      pedido.mercadoPagoOrderId;

    if (!orderId) {
      return res.status(400).json({
        error:
          "El pedido no tiene una Order de Mercado Pago.",
      });
    }

    /* =====================================================
       CONSULTAR ORDER DIRECTAMENTE A MERCADO PAGO
    ===================================================== */

    const respuesta =
      await fetch(
        `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
          orderId
        )}`,
        {
          method: "GET",

          headers: {
            Authorization:
              `Bearer ${accessToken}`,

            "Content-Type":
              "application/json",
          },
        }
      );

    const order =
      await respuesta
        .json()
        .catch(() => ({}));

    if (!respuesta.ok) {
      console.error(
        "Error consultando Order Mercado Pago:",
        JSON.stringify(
          order,
          null,
          2
        )
      );

      return res
        .status(respuesta.status)
        .json({
          error:
            "No se pudo verificar el pago con Mercado Pago.",
        });
    }

    /* =====================================================
       VALIDAR QUE SEA LA ORDER DEL PEDIDO
    ===================================================== */

    if (
      String(order.id) !==
      String(orderId)
    ) {
      console.error(
        "Order ID incorrecta:",
        order.id
      );

      return res.status(400).json({
        error:
          "La Order no corresponde al pedido.",
      });
    }

    if (
      String(
        order.external_reference
      ) !== String(pedido.pedidoId)
    ) {
      console.error(
        "External reference incorrecta:",
        order.external_reference
      );

      return res.status(400).json({
        error:
          "La referencia del pago no corresponde al pedido.",
      });
    }

    /* =====================================================
       VALIDAR MONTO
    ===================================================== */

    if (
      Number(order.total_amount) !==
      Number(pedido.precio)
    ) {
      console.error(
        "Monto incorrecto:",
        {
          order:
            order.total_amount,

          pedido:
            pedido.precio,
        }
      );

      return res.status(400).json({
        error:
          "El monto del pago no coincide con el pedido.",
      });
    }

    /* =====================================================
       VALIDAR ESTADO DEL PAGO
    ===================================================== */

    const pago =
      order.transactions
        ?.payments?.[0];

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
       TODAVÍA NO ACREDITADO
    ===================================================== */

    if (!pagoAprobado) {
      return res.status(200).json({
        pedidoId:
          pedido.pedidoId,

        productoId:
          pedido.productoId,

        productos:
          pedido.productos || [],

        aprobado: false,

        estado:
          pedido.estado,

        mercadoPagoEstado:
          order.status || null,

        mercadoPagoDetalle:
          order.status_detail || null,
      });
    }

    /* =====================================================
       APROBAR PEDIDO
    ===================================================== */

    const fechaPago =
      new Date();

    await pedidos.updateOne(
      {
        pedidoId:
          pedido.pedidoId,

        estado: {
          $ne: "aprobado",
        },
      },
      {
        $set: {
          estado:
            "aprobado",

          pagadoEn:
            fechaPago,

          mercadoPagoPaymentId:
            pago?.id || null,
        },
      }
    );

    /* =====================================================
       ENVIAR EMAIL
    ===================================================== */

    const pedidoAprobado = {
      ...pedido,

      estado:
        "aprobado",

      pagadoEn:
        fechaPago,

      mercadoPagoPaymentId:
        pago?.id || null,
    };

    const emailEnviado =
      await enviarEmailPedido({
        pedidos,
        pedido:
          pedidoAprobado,
      });

    /* =====================================================
       RESPUESTA A PAGOEXITOSO
    ===================================================== */

    return res.status(200).json({
      pedidoId:
        pedido.pedidoId,

      productoId:
        pedido.productoId,

      productos:
        pedido.productos || [],

      aprobado: true,

      estado:
        "aprobado",

      emailEnviado,
    });
  } catch (error) {
    console.error(
      "Error verificando pago Mercado Pago:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo verificar el pago.",
    });
  }
}