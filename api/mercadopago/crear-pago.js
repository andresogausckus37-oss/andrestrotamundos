import crypto from "crypto";
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

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN"
      );
    }

    /* =====================================================
       PRODUCTO DE PRUEBA
    ===================================================== */

    const producto = {
      id: "50-laberintos-para-ninos",
      nombre:
        "50 Laberintos para Niños con Caminos Abiertos",
      precio: 2990,
    };

    /* =====================================================
       CREAR PEDIDO INTERNO
    ===================================================== */

    const pedidoId = crypto.randomUUID();

    const monto =
      Number(producto.precio).toFixed(2);

    /* =====================================================
       CREAR ORDER EN MERCADO PAGO
    ===================================================== */

    const respuesta = await fetch(
      "https://api.mercadopago.com/v1/orders",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "X-Idempotency-Key":
            crypto.randomUUID(),
        },

        body: JSON.stringify({
          type: "online",

          processing_mode: "manual",

          total_amount: monto,

          external_reference: pedidoId,

          items: [
            {
              title: producto.nombre,

              quantity: 1,

              unit_price: monto,

              unit_measure: "unit",

              total_amount: monto,
            },
          ],
        }),
      }
    );

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error Mercado Pago:",
        JSON.stringify(datos, null, 2)
      );

      return res.status(respuesta.status).json({
        error:
          "No se pudo crear el pago.",
      });
    }

    /* =====================================================
       GUARDAR PEDIDO EN MONGODB
    ===================================================== */

    const db =
      await conectarMongoDB();

    await db
      .collection("pedidos")
      .insertOne({
        pedidoId,

        productoId: producto.id,

        nombreProducto:
          producto.nombre,

        precio:
          producto.precio,

        moneda: "ARS",

        mercadoPagoOrderId:
          datos.id,

        estado: "pendiente",

        creadoEn: new Date(),

        pagadoEn: null,

        descargas: 0,
      });

    /* =====================================================
       RESPUESTA AL FRONTEND
    ===================================================== */

    return res.status(201).json({
      pedidoId,

      orderId: datos.id,

      checkoutUrl:
        datos.checkout_url,
    });
  } catch (error) {
    console.error(
      "Error creando pago:",
      error
    );

    return res.status(500).json({
      error:
        "Error interno al crear el pago.",
    });
  }
}