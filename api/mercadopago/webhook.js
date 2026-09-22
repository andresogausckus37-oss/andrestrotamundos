import {
  WebhookSignatureValidator,
  InvalidWebhookSignatureError,
} from "mercadopago";

import { conectarMongoDB } from "../../lib/mongodb.js";

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

    if (!accessToken || !secret) {
      throw new Error(
        "Faltan variables de Mercado Pago"
      );
    }

    /* =====================================================
       VALIDAR FIRMA DEL WEBHOOK
    ===================================================== */

    const xSignature =
      req.headers["x-signature"];

    const xRequestId =
      req.headers["x-request-id"];

    const dataId =
      req.query["data.id"] ||
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
        secret: secret.trim(),
      });
    } catch (error) {
      if (
        error instanceof
        InvalidWebhookSignatureError
      ) {
        return res.status(401).json({
          error: "Firma inválida",
        });
      }

      throw error;
    }

    /* =====================================================
       SOLO PROCESAR ORDERS
    ===================================================== */

    if (req.body?.type !== "order") {
      return res.status(200).json({
        recibido: true,
      });
    }

    /* =====================================================
       CONSULTAR ORDER EN MERCADO PAGO
    ===================================================== */

    const respuesta = await fetch(
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

      return res.status(500).json({
        error:
          "No se pudo verificar la Order",
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

    if (!pagoAprobado) {
      return res.status(200).json({
        recibido: true,
        aprobado: false,
      });
    }

    /* =====================================================
       BUSCAR PEDIDO
    ===================================================== */

    const db =
      await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne({
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
       VALIDAR ORDER
    ===================================================== */

    if (
      pedido.mercadoPagoOrderId &&
      String(
        pedido.mercadoPagoOrderId
      ) !== String(order.id)
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
       VALIDAR TOTAL DEL PEDIDO
       FUNCIONA CON UNO O VARIOS PRODUCTOS
    ===================================================== */

    if (
      Number(order.total_amount) !==
      Number(pedido.precio)
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

    await db
      .collection("pedidos")
      .updateOne(
        {
          pedidoId:
            order.external_reference,
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
      recibido: true,
      aprobado: true,
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