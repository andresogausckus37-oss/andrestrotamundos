import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { productosDigitales } from "../../src/datos/productosDigitales.js";
import { enviarEmailCompra } from "../../lib/emailCompra.js";

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
   BUSCAR PRODUCTO
===================================================== */

const buscarProducto = async (
  db,
  productoId
) => {
  const productoMongo =
    await db
      .collection("productos")
      .findOne({
        id: productoId,
      });

  if (productoMongo) {
    return productoMongo;
  }

  return (
    productosDigitales.find(
      (item) =>
        item.id === productoId
    ) || null
  );
};

/* =====================================================
   VERIFICAR WEBHOOK PAYPAL
===================================================== */

const verificarWebhookPayPal = async (req) => {
  const webhookId =
    process.env.PAYPAL_WEBHOOK_ID;

  if (!webhookId) {
    throw new Error(
      "Falta PAYPAL_WEBHOOK_ID."
    );
  }

  const accessToken =
    await obtenerAccessToken();

  const respuesta = await fetch(
    `${obtenerBaseUrlPayPal()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        auth_algo:
          req.headers["paypal-auth-algo"],

        cert_url:
          req.headers["paypal-cert-url"],

        transmission_id:
          req.headers[
            "paypal-transmission-id"
          ],

        transmission_sig:
          req.headers[
            "paypal-transmission-sig"
          ],

        transmission_time:
          req.headers[
            "paypal-transmission-time"
          ],

        webhook_id: webhookId,

        webhook_event: req.body,
      }),
    }
  );

  const datos = await respuesta.json();

  return (
    respuesta.ok &&
    datos.verification_status ===
      "SUCCESS"
  );
};

/* =====================================================
   ENVIAR EMAIL DEL PEDIDO
===================================================== */

const enviarEmailPedido = async (
  db,
  pedido
) => {
  if (
    !pedido ||
    pedido.emailEnviado
  ) {
    return;
  }

  try {
    await enviarEmailCompra({
      pedidoId: pedido.pedidoId,

      email:
        pedido.emailComprador,

      productos:
        pedido.productos || [],
    });

    await db
      .collection("pedidos")
      .updateOne(
        {
          pedidoId:
            pedido.pedidoId,
        },
        {
          $set: {
            emailEnviado: true,
            emailEnviadoEn:
              new Date(),
          },
        }
      );
  } catch (errorEmail) {
    console.error(
      "Error enviando email de compra PayPal:",
      errorEmail
    );
  }
};

/* =====================================================
   CAPTURAR ORDEN PAYPAL
===================================================== */

const capturarOrdenPayPal = async (
  req,
  res
) => {
  const pedidoId =
    req.body?.pedidoId;

  const paypalOrderId =
    req.body?.paypalOrderId;

  if (!pedidoId || !paypalOrderId) {
    return res.status(400).json({
      error:
        "Faltan datos para verificar el pago.",
    });
  }

  const db = await conectarMongoDB();

  const pedido = await db
    .collection("pedidos")
    .findOne({ pedidoId });

  if (!pedido) {
    return res.status(404).json({
      error:
        "Pedido no encontrado.",
    });
  }

  if (
    pedido.metodoPago !== "paypal" ||
    pedido.paypalOrderId !==
      paypalOrderId
  ) {
    return res.status(400).json({
      error:
        "La orden PayPal no es válida.",
    });
  }

  /* =====================================================
     PEDIDO YA APROBADO
  ===================================================== */

  if (pedido.estado === "aprobado") {
    await enviarEmailPedido(
      db,
      pedido
    );

    return res.status(200).json({
      aprobado: true,
      productos:
        pedido.productos || [],
    });
  }

  /* =====================================================
     CAPTURAR
  ===================================================== */

  const accessToken =
    await obtenerAccessToken();

  const respuestaPayPal = await fetch(
    `${obtenerBaseUrlPayPal()}/v2/checkout/orders/${encodeURIComponent(
      paypalOrderId
    )}/capture`,
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${accessToken}`,

        "Content-Type":
          "application/json",

        "PayPal-Request-Id":
          `capture-${pedidoId}`,
      },
    }
  );

  const datosPayPal =
    await respuestaPayPal.json();

  if (!respuestaPayPal.ok) {
    console.error(
      "Error capturando PayPal:",
      datosPayPal
    );

    return res
      .status(respuestaPayPal.status)
      .json({
        error:
          "No se pudo confirmar el pago con PayPal.",
      });
  }

  const unidad =
    datosPayPal.purchase_units?.[0];

  const captura =
    unidad?.payments?.captures?.[0];

  const montoEsperado =
    Number(pedido.precio).toFixed(2);

  const referenciaValida =
    unidad?.reference_id ===
      pedidoId &&
    unidad?.custom_id ===
      pedidoId;

  const pagoValido =
    datosPayPal.id ===
      paypalOrderId &&
    datosPayPal.status ===
      "COMPLETED" &&
    referenciaValida &&
    captura?.status ===
      "COMPLETED" &&
    captura?.amount
      ?.currency_code === "USD" &&
    captura?.amount?.value ===
      montoEsperado;

  if (!pagoValido) {
    console.error(
      "Captura PayPal no válida:",
      datosPayPal
    );

    return res.status(400).json({
      error:
        "El pago de PayPal no pudo ser validado.",
    });
  }

  /* =====================================================
     APROBAR PEDIDO
  ===================================================== */

  await db
    .collection("pedidos")
    .updateOne(
      { pedidoId },
      {
        $set: {
          estado: "aprobado",

          pagadoEn:
            new Date(),

          paypalCaptureId:
            captura.id,

          paypalEstado:
            datosPayPal.status,

          paypalPayerId:
            datosPayPal.payer
              ?.payer_id || null,

          paypalEmail:
            datosPayPal.payer
              ?.email_address ||
            null,
        },
      }
    );

  /* =====================================================
     EMAIL
  ===================================================== */

  await enviarEmailPedido(
    db,
    pedido
  );

  return res.status(200).json({
    aprobado: true,

    productos:
      pedido.productos || [],
  });
};

/* =====================================================
   PROCESAR WEBHOOK PAYPAL
===================================================== */

const procesarWebhookPayPal = async (
  req,
  res
) => {
  const firmaValida =
    await verificarWebhookPayPal(req);

  if (!firmaValida) {
    console.error(
      "Webhook PayPal con firma inválida."
    );

    return res.status(400).json({
      error:
        "Webhook no válido.",
    });
  }

  const evento = req.body;

  const tipo =
    evento?.event_type;

  const db =
    await conectarMongoDB();

  /* =====================================================
     CHECKOUT.ORDER.APPROVED
  ===================================================== */

  if (
    tipo ===
    "CHECKOUT.ORDER.APPROVED"
  ) {
    const paypalOrderId =
      evento.resource?.id;

    if (!paypalOrderId) {
      return res.status(200).json({
        recibido: true,
      });
    }

    const pedido = await db
      .collection("pedidos")
      .findOne({
        paypalOrderId,
        metodoPago: "paypal",
      });

    if (!pedido) {
      return res.status(200).json({
        recibido: true,
      });
    }

    if (
      pedido.estado ===
      "aprobado"
    ) {
      await enviarEmailPedido(
        db,
        pedido
      );

      return res.status(200).json({
        recibido: true,
      });
    }

    return await capturarOrdenPayPal(
      {
        ...req,

        body: {
          pedidoId:
            pedido.pedidoId,

          paypalOrderId,
        },
      },
      res
    );
  }

  /* =====================================================
     PAYMENT.CAPTURE.COMPLETED
  ===================================================== */

  if (
    tipo ===
    "PAYMENT.CAPTURE.COMPLETED"
  ) {
    const captura =
      evento.resource;

    const paypalOrderId =
      captura?.supplementary_data
        ?.related_ids?.order_id;

    if (!paypalOrderId) {
      return res.status(200).json({
        recibido: true,
      });
    }

    const pedido = await db
      .collection("pedidos")
      .findOne({
        paypalOrderId,
        metodoPago: "paypal",
      });

    if (!pedido) {
      return res.status(200).json({
        recibido: true,
      });
    }

    const montoEsperado =
      Number(
        pedido.precio
      ).toFixed(2);

    const capturaValida =
      captura?.status ===
        "COMPLETED" &&
      captura?.amount
        ?.currency_code ===
        "USD" &&
      captura?.amount?.value ===
        montoEsperado;

    if (!capturaValida) {
      console.error(
        "Webhook de captura PayPal no válido."
      );

      return res.status(400).json({
        error:
          "Captura no válida.",
      });
    }

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
              pedido.pagadoEn ||
              new Date(),

            paypalCaptureId:
              captura.id,

            paypalEstado:
              "COMPLETED",
          },
        }
      );

    await enviarEmailPedido(
      db,
      pedido
    );

    return res.status(200).json({
      recibido: true,
    });
  }

    /* =====================================================
     PAYMENT.CAPTURE.DENIED
  ===================================================== */

  if (
    tipo ===
    "PAYMENT.CAPTURE.DENIED"
  ) {
    const paypalOrderId =
      evento.resource
        ?.supplementary_data
        ?.related_ids?.order_id;

    if (paypalOrderId) {
      await db
        .collection("pedidos")
        .updateOne(
          {
            paypalOrderId,

            estado: {
              $ne: "aprobado",
            },
          },
          {
            $set: {
              paypalEstado:
                "DENIED",
            },
          }
        );
    }

    return res.status(200).json({
      recibido: true,
    });
  }

  return res.status(200).json({
    recibido: true,
  });
};

/* =====================================================
   HANDLER
===================================================== */

export default async function handler(
  req,
  res
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Método no permitido",
    });
  }

  const accion =
    req.query?.accion;

  /* =====================================================
     WEBHOOK
  ===================================================== */

  if (accion === "webhook") {
    try {
      return await procesarWebhookPayPal(
        req,
        res
      );
    } catch (error) {
      console.error(
        "Error procesando webhook PayPal:",
        error
      );

      return res.status(500).json({
        error:
          "Error procesando webhook PayPal.",
      });
    }
  }

  try {
    /* =====================================================
       CAPTURAR
    ===================================================== */

    if (accion === "capturar") {
      return await capturarOrdenPayPal(
        req,
        res
      );
    }

    /* =====================================================
       CREAR
    ===================================================== */

    if (accion !== "crear") {
      return res.status(400).json({
        error:
          "Acción no válida.",
      });
    }

    const email =
      req.body?.email?.trim();

    const productoId =
      req.body?.productoId;

    const ventaCruzadaId =
      req.body?.ventaCruzadaId ||
      null;

    if (!email) {
      return res.status(400).json({
        error:
          "Falta el correo electrónico.",
      });
    }

    if (!productoId) {
      return res.status(400).json({
        error:
          "Falta el producto.",
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
          "Producto no encontrado.",
      });
    }

    const precioPrincipal =
      obtenerPrecioFinalUSD(
        producto
      );

    /* =====================================================
       VENTA CRUZADA
    ===================================================== */

    let productoVentaCruzada =
      null;

    let precioVentaCruzada =
      0;

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

        precio:
          precioPrincipal,
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

    const pedidoId =
      crypto.randomUUID();

    /* =====================================================
       AUTENTICACIÓN PAYPAL
    ===================================================== */

    const accessToken =
      await obtenerAccessToken();

    /* =====================================================
       CREAR ORDEN PAYPAL
    ===================================================== */

    const respuestaPayPal =
      await fetch(
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
                    `https://andreshousesitter.com/pago/exitoso?metodo=paypal&pedidoId=${encodeURIComponent(
                      pedidoId
                    )}`,

                  cancel_url:
                    `https://andreshousesitter.com/checkout/${encodeURIComponent(
                      producto.id
                    )}`,
                },
              },
            },

            purchase_units: [
              {
                reference_id:
                  pedidoId,

                custom_id:
                  pedidoId,

                amount: {
                  currency_code:
                    "USD",

                  value:
                    monto,

                  breakdown: {
                    item_total: {
                      currency_code:
                        "USD",

                      value:
                        monto,
                    },
                  },
                },

                items:
                  productosPedido.map(
                    (item) => ({
                      name:
                        item.nombre,

                      sku:
                        item.productoId,

                      quantity: "1",

                      category:
                        "DIGITAL_GOODS",

                      unit_amount: {
                        currency_code:
                          "USD",

                        value:
                          item.precio.toFixed(
                            2
                          ),
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
        .status(
          respuestaPayPal.status
        )
        .json({
          error:
            "No se pudo crear el pago con PayPal.",
        });
    }

    /* =====================================================
       ENLACE DE APROBACIÓN
    ===================================================== */

    const enlaceAprobacion =
      datosPayPal.links?.find(
        (link) =>
          link.rel ===
            "payer-action" ||
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
          productoVentaCruzada
            ?.id || null,

        emailComprador:
          email,

        precio:
          precioTotal,

        moneda:
          "USD",

        metodoPago:
          "paypal",

        paypalOrderId:
          datosPayPal.id,

        paypalCaptureId:
          null,

        estado:
          "pendiente",

        creadoEn:
          new Date(),

        pagadoEn:
          null,

        descargas: 0,

        emailEnviado:
          false,

        emailEnviadoEn:
          null,
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