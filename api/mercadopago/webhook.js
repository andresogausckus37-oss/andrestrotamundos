import crypto from "crypto";

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

    const xSignature =
      req.headers["x-signature"];

    const xRequestId =
      req.headers["x-request-id"];

    const dataId =
      req.query["data.id"] ||
      req.body?.data?.id;

    if (!xSignature || !xRequestId || !dataId) {
      return res.status(400).json({
        error: "Notificación incompleta",
      });
    }

    // Diagnóstico temporal de la firma
    try {
      const partes = Object.fromEntries(
        xSignature.split(",").map((parte) => {
          const [clave, valor] =
            parte.split("=");

          return [
            clave.trim(),
            valor.trim(),
          ];
        })
      );

      const ts = partes.ts;
      const v1 = partes.v1;

      const calcularFirma = (id) => {
        const manifest =
          `id:${id};request-id:${xRequestId};ts:${ts};`;

        return crypto
          .createHmac(
            "sha256",
            secret.trim()
          )
          .update(manifest)
          .digest("hex");
      };

      const firmaOriginal =
        calcularFirma(dataId);

      const firmaMinuscula =
        calcularFirma(
          String(dataId).toLowerCase()
        );

      console.log("FIRMA DEBUG", {
        dataId,
        coincideOriginal:
          firmaOriginal === v1,
        coincideMinuscula:
          firmaMinuscula === v1,
      });

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

    if (req.body?.type !== "order") {
      return res.status(200).json({
        recibido: true,
      });
    }

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

    const order = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error consultando Order:",
        JSON.stringify(order, null, 2)
      );

      return res.status(500).json({
        error:
          "No se pudo verificar la Order",
      });
    }

    const pago =
      order.transactions?.payments?.[0];

    const pagoAprobado =
      order.status === "processed" &&
      order.status_detail ===
        "accredited" &&
      pago?.status === "processed" &&
      pago?.status_detail ===
        "accredited";

    if (!pagoAprobado) {
      return res.status(200).json({
        recibido: true,
        aprobado: false,
      });
    }

    const db = await conectarMongoDB();

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

    // Verifica que la Order recibida sea
    // exactamente la creada para este pedido
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

    await db
      .collection("pedidos")
      .updateOne(
        {
          pedidoId:
            order.external_reference,
        },
        {
          $set: {
            estado: "aprobado",
            pagadoEn: new Date(),
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