import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { productosDigitales } from "../../src/datos/productosDigitales.js";

/* =====================================================
   CONFIGURACIÓN PAYPAL
===================================================== */

const obtenerBaseUrlPayPal = () => {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
};

/* =====================================================
   OBTENER ACCESS TOKEN
===================================================== */

const obtenerAccessToken = async () => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Faltan las credenciales de PayPal."
    );
  }

  const credenciales = Buffer.from(
    `${clientId}:${clientSecret}`
  ).toString("base64");

  const respuesta = await fetch(
    `${obtenerBaseUrlPayPal()}/v1/oauth2/token`,
    {
      method: "POST",

      headers: {
        Authorization: `Basic ${credenciales}`,
        "Content-Type":
          "application/x-www-form-urlencoded",
      },

      body: "grant_type=client_credentials",
    }
  );

  const datos = await respuesta.json();

  if (!respuesta.ok || !datos.access_token) {
    console.error(
      "Error obteniendo token PayPal:",
      datos
    );

    throw new Error(
      "No se pudo autenticar con PayPal."
    );
  }

  return datos.access_token;
};

/* =====================================================
   PRECIO USD REAL
===================================================== */

const obtenerPrecioFinalUSD = (producto) => {
  const precio =
    producto.ofertaUSD?.activa &&
    Number(producto.ofertaUSD.precioUSD) > 0
      ? Number(producto.ofertaUSD.precioUSD)
      : Number(producto.precioUSD);

  if (
    !Number.isFinite(precio) ||
    precio <= 0
  ) {
    throw new Error(
      `Precio USD inválido para ${producto.id}`
    );
  }

  return precio;
};

/* =====================================================
   DETECTAR MERCADO
===================================================== */

const obtenerMercado = (req, res) => {
  const pais =
    req.headers["x-vercel-ip-country"] || "";

  const codigoPais =
    String(pais).toUpperCase();

  const mercado =
    codigoPais === "AR"
      ? "AR"
      : "INTERNACIONAL";

  const moneda =
    mercado === "AR"
      ? "ARS"
      : "USD";

  return res.status(200).json({
    pais: codigoPais || null,
    mercado,
    moneda,
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
    const email = req.body?.email?.trim();

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
        (item) => item.id === productoId
      );

    if (!producto) {
      return res.status(404).json({
        error: "Producto no encontrado.",
      });
    }

    const precioPrincipal =
      obtenerPrecioFinalUSD(producto);

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
        obtenerPrecioFinalUSD(
          productoVentaCruzada
        );
    }

    /* =====================================================
       TOTAL REAL
    ===================================================== */

    const precioTotal =
      precioPrincipal +
      precioVentaCruzada;

    const monto = precioTotal.toFixed(2);

    /* =====================================================
       PRODUCTOS DEL PEDIDO
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

    /* =====================================================
       ID INTERNO
    ===================================================== */

    const pedidoId = crypto.randomUUID();

    /* =====================================================
       AUTENTICACIÓN PAYPAL
    ===================================================== */

    const accessToken =
      await obtenerAccessToken();

    /* =====================================================
       CREAR ORDEN PAYPAL
    ===================================================== */

    const respuestaPayPal = await fetch(
      `${obtenerBaseUrlPayPal()}/v2/checkout/orders`,
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",

          "PayPal-Request-Id":
            crypto.randomUUID(),
        },

        body: JSON.stringify({
          intent: "CAPTURE",

                    payment_source: {
            paypal: {
              experience_context: {
                shipping_preference:
                  "NO_SHIPPING",

                return_url:
                  "https://andreshousesitter.com/pago-exitoso",

                cancel_url:
                  "https://andreshousesitter.com/checkout",
              },
            },
          },

          purchase_units: [
            {
              reference_id: pedidoId,

              custom_id: pedidoId,

              amount: {
                currency_code: "USD",
                value: monto,

                breakdown: {
                  item_total: {
                    currency_code: "USD",
                    value: monto,
                  },
                },
              },

              items: productosPedido.map(
                (item) => ({
                  name: item.nombre,
                  sku: item.productoId,

                  quantity: "1",

                  category:
                    "DIGITAL_GOODS",

                  unit_amount: {
                    currency_code: "USD",
                    value:
                      item.precio.toFixed(2),
                  },
                })
              ),
            },
          ],
        }),
      }
    );

    const datosPayPal =
      await respuestaPayPal.json();

    if (!respuestaPayPal.ok) {
      console.error(
        "Error PayPal:",
        JSON.stringify(
          datosPayPal,
          null,
          2
        )
      );

      return res
        .status(respuestaPayPal.status)
        .json({
          error:
            "No se pudo crear el pago con PayPal.",
        });
    }

    const enlaceAprobacion =
  datosPayPal.links?.find(
    (link) =>
      link.rel === "payer-action" ||
      link.rel === "approve"
  )?.href;

if (!enlaceAprobacion) {
  console.error(
    "PayPal no devolvió enlace de aprobación:",
    datosPayPal
  );

  return res.status(500).json({
    error:
      "PayPal no devolvió el enlace de aprobación.",
  });
}

    /* =====================================================
       GUARDAR PEDIDO
    ===================================================== */

    const db = await conectarMongoDB();

    await db
      .collection("pedidos")
      .insertOne({
        pedidoId,

        productoId: producto.id,

        nombreProducto:
          producto.nombre,

        productos:
          productosPedido,

        ventaCruzadaId:
          productoVentaCruzada?.id ||
          null,

        emailComprador: email,

        precio: precioTotal,

        moneda: "USD",

        metodoPago: "paypal",

        paypalOrderId:
          datosPayPal.id,

        paypalCaptureId: null,

        estado: "pendiente",

        creadoEn: new Date(),

        pagadoEn: null,

        descargas: 0,
      });

    /* =====================================================
       RESPUESTA
    ===================================================== */

    return res.status(201).json({
  pedidoId,

  paypalOrderId:
    datosPayPal.id,

  approveUrl:
    enlaceAprobacion,
});
    
  } catch (error) {
    console.error(
      "Error creando orden PayPal:",
      error
    );

    return res.status(500).json({
      error:
        "Error interno al crear el pago con PayPal.",
    });
  }
}