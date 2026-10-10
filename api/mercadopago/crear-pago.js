import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";

/* =====================================================
   CALCULAR PRECIO REAL DE UN PRODUCTO
===================================================== */

const obtenerPrecioFinal = (producto) => {
  const precioNormal = Number(producto.precioARS);
  const precioOferta = Number(producto.oferta?.precioARS);

  const finalizaEn =
    producto.ofertaLanzamiento?.finalizaEn;

  const ofertaVigente =
    producto.oferta?.activa === true &&
    Number.isFinite(precioOferta) &&
    precioOferta > 0 &&
    (
      !finalizaEn ||
      new Date(finalizaEn).getTime() > Date.now()
    );

  const precio = ofertaVigente
    ? precioOferta
    : precioNormal;

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
   BUSCAR PRODUCTO
===================================================== */

const buscarProducto = async (
  db,
  productoId
) => {
  return await db
    .collection("productos")
    .findOne({
      id: productoId,
      activo: { $ne: false },
      disponibilidad: { $ne: "pausado" },
    });
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

    const db =
      await conectarMongoDB();

    /* =====================================================
       PRODUCTO PRINCIPAL
    ===================================================== */

    const producto =
      await buscarProducto(
        db,
        productoId
      );

    if (!producto) {
      return res.status(404).json({
        error:
          "Producto no encontrado o no disponible.",
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
        await buscarProducto(
          db,
          ventaCruzadaId
        );

      if (!productoVentaCruzada) {
        return res.status(404).json({
          error:
            "Producto adicional no encontrado o no disponible.",
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
       TOTAL DEL PEDIDO
    ===================================================== */

    const precioTotal =
      precioPrincipal +
      precioVentaCruzada;

    const monto =
      precioTotal.toFixed(2);

    /* =====================================================
       PRODUCTOS DEL PEDIDO
    ===================================================== */

    const productosPedido = [
      {
        productoId:
          producto.id,

        nombre:
          producto.nombre,

        cantidad: 1,

        precio:
          precioPrincipal,

        precioARS:
          precioPrincipal,
      },
    ];

    if (productoVentaCruzada) {
      productosPedido.push({
        productoId:
          productoVentaCruzada.id,

        nombre:
          productoVentaCruzada.nombre,

        cantidad: 1,

        precio:
          precioVentaCruzada,

        precioARS:
          precioVentaCruzada,
      });
    }

    const itemsMercadoPago =
      productosPedido.map(
        (item) => ({
          title: item.nombre,
          quantity: item.cantidad,
          unit_price:
            Number(
              item.precio
            ).toFixed(2),
        })
      );

    /* =====================================================
       CREAR ID INTERNO
    ===================================================== */

    const pedidoId =
      crypto.randomUUID();

    /* =====================================================
       CREAR ORDER EN MERCADO PAGO
    ===================================================== */

    const respuesta =
      await fetch(
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

            processing_mode:
              "manual",

            total_amount:
              monto,

            external_reference:
              pedidoId,

            config: {
              online: {
                success_url:
                  "https://andrestrotamundos.andresogausckus37.workers.dev/pago/exitoso",

                failure_url:
                  "https://andrestrotamundos.andresogausckus37.workers.dev/pago/fallido",

                pending_url:
                  "https://andrestrotamundos.andresogausckus37.workers.dev/pago/pendiente",

                auto_return:
                  "all",
              },
            },

            payer: {
              email,
            },

            items:
              itemsMercadoPago,
          }),
        }
      );

    const datos =
      await respuesta
        .json()
        .catch(() => ({}));

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
       GUARDAR PEDIDO
    ===================================================== */

    const fecha =
      new Date();

    await db
      .collection("pedidos")
      .insertOne({
        pedidoId,

        productoId:
          producto.id,

        nombreProducto:
          producto.nombre,

        productos:
          productosPedido,

        ventaCruzadaId:
          productoVentaCruzada?.id ||
          null,

        emailComprador:
          email,

        precio:
          precioTotal,

        moneda:
          "ARS",

        metodoPago:
          "mercadopago",

        mercadoPagoOrderId:
          datos.id,

        estado:
          "pendiente",

        creadoEn:
          fecha,

        pagadoEn:
          null,

        emailEnviado:
          false,

        emailEnviadoEn:
          null,

        historialEstados: [
          {
            estado:
              "pendiente",
            fecha,
          },
        ],
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