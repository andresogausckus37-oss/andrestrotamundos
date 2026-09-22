import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { productosDigitales } from "../../src/datos/productosDigitales.js";

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

    const email = req.body?.email?.trim();
    const productoId = req.body?.productoId;

    if (!email) {
      return res.status(400).json({
        error: "Falta el correo electrónico.",
      });
    }

    if (!productoId) {
      return res.status(400).json({
        error: "Falta el producto.",
      });
    }

    /* =====================================================
       OBTENER PRODUCTO
    ===================================================== */

    const producto =
      productosDigitales.find(
        (item) => item.id === productoId
      );

    if (!producto) {
      return res.status(404).json({
        error: "Producto no encontrado.",
      });
    }

    /* =====================================================
       CALCULAR PRECIO FINAL
    ===================================================== */

    const precioFinal =
      producto.oferta?.activa &&
      Number(producto.oferta.precioARS) > 0
        ? Number(producto.oferta.precioARS)
        : Number(producto.precioARS);

    if (
      !Number.isFinite(precioFinal) ||
      precioFinal <= 0
    ) {
      throw new Error(
        "El producto tiene un precio inválido"
      );
    }

    /* =====================================================
       CREAR PEDIDO INTERNO
    ===================================================== */

    const pedidoId = crypto.randomUUID();

    const monto =
      precioFinal.toFixed(2);

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

          config: {
            online: {
              success_url:
                "https://andreshousesitter.com/pago/exitoso",

              failure_url:
                "https://andreshousesitter.com/pago/fallido",

              pending_url:
                "https://andreshousesitter.com/pago/pendiente",

              auto_return: "all",
            },
          },

          payer: {
            email,
          },

          items: [
            {
              title: producto.nombre,
              quantity: 1,
              unit_price: monto,
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

        emailComprador: email,

        precio: precioFinal,

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