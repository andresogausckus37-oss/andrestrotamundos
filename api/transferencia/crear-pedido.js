import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { CONFIGURACION_TRANSFERENCIA } from "../../lib/configuracionTransferencia.js";
import { productosDigitales } from "../../src/datos/productosDigitales.js";

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
      `Precio inválido para ${producto.id}`
    );
  }

  return precio;
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    if (
      !CONFIGURACION_TRANSFERENCIA.activa
    ) {
      return res.status(503).json({
        error:
          "Las transferencias no están disponibles.",
      });
    }

    const nombre =
      req.body?.nombre?.trim();

    const email =
      req.body?.email?.trim();

    const productoId =
      req.body?.productoId;

    const ventaCruzadaId =
      req.body?.ventaCruzadaId || null;

    if (!nombre || !email) {
      return res.status(400).json({
        error:
          "Completa tus datos personales.",
      });
    }

    if (!productoId) {
      return res.status(400).json({
        error: "Falta el producto.",
      });
    }

    /* PRODUCTO PRINCIPAL */

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

    /* VENTA CRUZADA */

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

      precioVentaCruzada =
        obtenerPrecioFinal(
          productoVentaCruzada
        );
    }

    /* PRECIOS */

    const subtotal =
      precioPrincipal +
      precioVentaCruzada;

    const porcentajeDescuento =
      Number(
        CONFIGURACION_TRANSFERENCIA.descuento
      );

    const descuento =
      Number(
        (
          subtotal *
          (porcentajeDescuento / 100)
        ).toFixed(2)
      );

    const total =
      Number(
        (subtotal - descuento).toFixed(2)
      );

    /* PRODUCTOS */

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

    /* CREAR PEDIDO */

    const pedidoId =
      crypto.randomUUID();

    const fechaCreacion =
      new Date();

    const db =
      await conectarMongoDB();

    await db
      .collection("pedidos")
      .insertOne({
        pedidoId,

        metodoPago:
          "transferencia",

        productoId:
          producto.id,

        nombreProducto:
          producto.nombre,

        productos:
          productosPedido,

        ventaCruzadaId:
          productoVentaCruzada?.id ||
          null,

        nombreComprador:
          nombre,

        emailComprador:
          email,

        subtotal,

        porcentajeDescuento,

        descuento,

        precio: total,

        moneda: "ARS",

        estado:
          "esperando_transferencia",

        historialEstados: [
          {
            estado:
              "pedido_creado",

            fecha:
              fechaCreacion,
          },

          {
            estado:
              "esperando_transferencia",

            fecha:
              fechaCreacion,
          },
        ],

        comprobante: null,

        creadoEn:
          fechaCreacion,

        pagadoEn: null,

        descargas: 0,

        historialDescargas: [],
      });

    /* RESPUESTA */

    return res.status(201).json({
      pedidoId,

      estado:
        "esperando_transferencia",

      subtotal,

      porcentajeDescuento,

      descuento,

      total,

      cuenta: {
        medio:
          CONFIGURACION_TRANSFERENCIA
            .cuenta.medio,

        titular:
          CONFIGURACION_TRANSFERENCIA
            .cuenta.titular,

        alias:
          CONFIGURACION_TRANSFERENCIA
            .cuenta.alias,

        cvu:
          CONFIGURACION_TRANSFERENCIA
            .cuenta.cvu,
      },
    });
  } catch (error) {
    console.error(
      "Error creando pedido por transferencia:",
      error
    );

    return res.status(500).json({
      error:
        "Error interno al crear el pedido.",
    });
  }
}