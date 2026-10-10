import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

import { conectarMongoDB } from "../../lib/mongodb.js";
import { enviarEmailCompra } from "../../lib/emailCompra.js";

/* =====================================================
   HANDLER
===================================================== */

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    const secret =
      process.env.MERCADOPAGO_WEBHOOK_SECRET;

    if (
      !accessToken ||
      !secret
    ) {
      throw new Error(
        "Faltan variables de Mercado Pago"
      );
    }

    /* =====================================================
       VALIDAR FIRMA
    ===================================================== */

    const xSignature =
      req.headers["x-signature"];

    const xRequestId =
      req.headers["x-request-id"];

    const dataId =
      req.query?.["data.id"] ||
      req.body?.data?.id;

    if (
      !xSignature ||
      !xRequestId ||
      !dataId
    ) {
      return res.status(400).json({
        error:
          "Notificación incompleta",
      });
    }

    try {
      WebhookSignatureValidator.validate({
        xSignature,
        xRequestId,
        dataId,
        secret:
          secret.trim(),
      });
    } catch (error) {
      if (
        error instanceof
        InvalidWebhookSignatureError
      ) {
        return res.status(401).json({
          error:
            "Firma inválida",
        });
      }

      throw error;
    }

    /* =====================================================
       SOLO PROCESAR ORDERS
    ===================================================== */

    if (
      req.body?.type !==
      "order"
    ) {
      return res.status(200).json({
        recibido: true,
      });
    }

    /* =====================================================
       CONSULTAR ORDER
    ===================================================== */

    const respuesta =
      await fetch(
        `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
          dataId
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`,
          },
        }
      );

    const order =
      await respuesta
        .json()
        .catch(() => ({}));

    if (!respuesta.ok) {
      console.error(
        "Error consultando Order:",
        JSON.stringify(
          order,
          null,
          2
        )
      );

      return res.status(500).json({
        error:
          "No se pudo verificar la Order",
      });
    }

    /* =====================================================
       VALIDAR PAGO
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

    if (!pagoAprobado) {
      return res.status(200).json({
        recibido:
          true,

        aprobado:
          false,
      });
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
        pedidoId:
          order.external_reference,
      });

    if (!pedido) {
      console.error(
        "Pedido no encontrado:",
        order.external_reference
      );

      return res.status(200).json({
        recibido: true,
      });
    }

    /* =====================================================
       VALIDAR MÉTODO
    ===================================================== */

    if (
      pedido.metodoPago !==
      "mercadopago"
    ) {
      console.error(
        "Método de pago incorrecto:",
        pedido.pedidoId
      );

      return res.status(200).json({
        recibido: true,
      });
    }

    /* =====================================================
       VALIDAR ORDER
    ===================================================== */

    if (
      pedido.mercadoPagoOrderId &&
      String(
        pedido.mercadoPagoOrderId
      ) !==
        String(
          order.id
        )
    ) {
      console.error(
        "Order incorrecta para el pedido:",
        order.external_reference
      );

      return res.status(200).json({
        recibido: true,
      });
    }

    /* =====================================================
       VALIDAR TOTAL
    ===================================================== */

    if (
      Number(
        order.total_amount
      ) !==
      Number(
        pedido.precio
      )
    ) {
      console.error(
        "Monto incorrecto en Order:",
        dataId
      );

      return res.status(200).json({
        recibido: true,
      });
    }

    /* =====================================================
       APROBAR PEDIDO
    ===================================================== */

    const fechaPago =
      new Date();

    const yaAprobado =
      pedido.estado ===
      "aprobado";

    if (!yaAprobado) {
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
              pedido.pagadoEn ||
              fechaPago,

            mercadoPagoPaymentId:
              pago?.id || null,
          },

          $push: {
            historialEstados: {
              estado:
                "pago_confirmado",

              fecha:
                fechaPago,
            },
          },
        }
      );
    }

    /* =====================================================
       ENVIAR EMAIL
    ===================================================== */

    let emailEnviado =
      pedido.emailEnviado === true;

    if (!emailEnviado) {
      if (!pedido.emailComprador) {
        console.error(
          `Pedido ${pedido.pedidoId}: falta emailComprador.`
        );
      } else if (
        !Array.isArray(
          pedido.productos
        ) ||
        pedido.productos.length === 0
      ) {
        console.error(
          `Pedido ${pedido.pedidoId}: no contiene productos.`
        );
      } else {
        try {
          await enviarEmailCompra({
            pedidoId:
              pedido.pedidoId,

            email:
              pedido.emailComprador,

            productos:
              pedido.productos,

            total:
              pedido.precio ?? null,
          });

          const fechaEmail =
            new Date();

          await pedidos.updateOne(
            {
              pedidoId:
                pedido.pedidoId,
            },
            {
              $set: {
                emailEnviado:
                  true,

                emailEnviadoEn:
                  fechaEmail,
              },
            }
          );

          emailEnviado =
            true;
        } catch (error) {
          /*
           * Un fallo del email no modifica
           * el estado del pago.
           */
          console.error(
            `Error enviando email del pedido ${pedido.pedidoId}:`,
            error
          );
        }
      }
    }

    /* =====================================================
       RESPUESTA
    ===================================================== */

    return res.status(200).json({
      recibido:
        true,

      aprobado:
        true,

      emailEnviado,
    });
  } catch (error) {
    console.error(
      "Error webhook Mercado Pago:",
      error
    );

    return res.status(500).json({
      error:
        "Error procesando webhook",
    });
  }
}