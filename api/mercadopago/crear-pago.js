import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { productosDigitales } from "../../src/datos/productosDigitales.js";

/* =====================================================
   CALCULAR PRECIO REAL DE UN PRODUCTO
===================================================== */

const obtenerPrecioFinal = (producto) => {
  const precio =
    producto.oferta?.activa &&
    Number(producto.oferta.precioARS) > 0
      ? Number(producto.oferta.precioARS)
      : Number(producto.precioARS);

  if (
    !Number.isFinite(precio) ||
    precio <= 0
  ) {
    throw new Error(
      `Precio inválido para el producto ${producto.id}`
    );
  }

  return precio;
};

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

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN"
      );
    }

    const email =
      req.body?.email?.trim();

    const productoId =
      req.body?.productoId;

    const ventaCruzadaId =
      req.body?.ventaCruzadaId || null;

    if (!email) {
      return res.status(400).json({
        error:
          "Falta el correo electrónico.",
      });
    }

    if (!productoId) {
      return res.status(400).json({
        error: "Falta el producto.",
      });
    }

    /* =====================================================
       PRODUCTO PRINCIPAL
    ===================================================== */

    const producto =
      productosDigitales.find(
        (item) =>
          item.id === productoId
      );

    if (!producto) {
      return res.status(404).json({
        error:
          "Producto no encontrado.",
      });
    }

    const precioPrincipal =
      obtenerPrecioFinal(producto);

    /* =====================================================
       VENTA CRUZADA
    ===================================================== */

    let productoVentaCruzada = null;
    let precioVentaCruzada = 0;

    if (ventaCruzadaId) {
      /*
       * Seguridad:
       * solamente permitimos agregar el producto
       * configurado como venta cruzada del producto
       * principal.
       */
      if (
        producto.ventaCruzadaId !==
        ventaCruzadaId
      ) {
        return res.status(400).json({
          error:
            "Producto adicional no válido.",
        });
      }

      productoVentaCruzada =
        productosDigitales.find(
          (item) =>
            item.id === ventaCruzadaId
        );

      if (!productoVentaCruzada) {
        return res.status(404).json({
          error:
            "Producto adicional no encontrado.",
        });
      }

      if (
        productoVentaCruzada.id ===
        producto.id
      ) {
        return res.status(400).json({
          error:
            "El producto adicional no es válido.",
        });
      }

      precioVentaCruzada =
        obtenerPrecioFinal(
          productoVentaCruzada
        );
    }

    /* =====================================================
       TOTAL REAL DEL PEDIDO
    ===================================================== */

    const precioTotal =
      precioPrincipal +
      precioVentaCruzada;

    const monto =
      precioTotal.toFixed(2);

    /* =====================================================
       ITEMS DEL PEDIDO
    ===================================================== */

    const productosPedido = [
      {
        productoId: producto.id,
        nombre: producto.nombre,
        precio: precioPrincipal,
      },
    ];

    if (productoVentaCruzada) {
      productosPedido.push({
        productoId:
          productoVentaCruzada.id,

        nombre:
          productoVentaCruzada.nombre,

        precio:
          precioVentaCruzada,
      });
    }

    const itemsMercadoPago =
      productosPedido.map(
        (item) => ({
          title: item.nombre,
          quantity: 1,
          unit_price:
            item.precio.toFixed(2),
        })
      );

    /* =====================================================
       CREAR PEDIDO INTERNO
    ===================================================== */

    const pedidoId =
      crypto.randomUUID();

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

          external_reference:
            pedidoId,

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

          items: itemsMercadoPago,
        }),
      }
    );

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error Mercado Pago:",
        JSON.stringify(
          datos,
          null,
          2
        )
      );

      return res
        .status(respuesta.status)
        .json({
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

        /* Compatibilidad con pedidos anteriores */
        productoId:
          producto.id,

        nombreProducto:
          producto.nombre,

        /* Nueva estructura */
        productos:
          productosPedido,

        ventaCruzadaId:
          productoVentaCruzada?.id ||
          null,

        emailComprador:
          email,

        precio:
          precioTotal,

        moneda: "ARS",

        mercadoPagoOrderId:
          datos.id,

        estado:
          "pendiente",

        creadoEn:
          new Date(),

        pagadoEn:
          null,

        descargas: 0,
      });

    /* =====================================================
       RESPUESTA
    ===================================================== */

    return res.status(201).json({
      pedidoId,

      orderId:
        datos.id,

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