import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";

const obtenerCookies = (req) => {
  const cookies = {};

  const header = req.headers.cookie || "";

  header.split(";").forEach((cookie) => {
    const [nombre, ...valor] =
      cookie.trim().split("=");

    if (nombre) {
      cookies[nombre] =
        decodeURIComponent(valor.join("="));
    }
  });

  return cookies;
};

const adminAutorizado = (req) => {
  const adminPassword =
    process.env.ADMIN_PASSWORD;

  if (!adminPassword) return false;

  const tokenEsperado = crypto
    .createHmac(
      "sha256",
      adminPassword
    )
    .update("andres-imprimibles-admin")
    .digest("hex");

  const cookies = obtenerCookies(req);
  const token = cookies.admin_token;

  if (!token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(tokenEsperado);

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    if (!adminAutorizado(req)) {
      return res.status(401).json({
        error: "No autorizado",
      });
    }

    const db = await conectarMongoDB();

    const pedidos = await db
      .collection("pedidos")
      .find({
        metodoPago: "transferencia",
        estado: {
          $ne: "aprobado",
        },
      })
      .sort({
        creadoEn: -1,
      })
      .limit(100)
      .toArray();

    const resultado = pedidos.map(
      (pedido) => ({
        pedidoId: pedido.pedidoId,

        nombreComprador:
          pedido.nombreComprador,

        emailComprador:
          pedido.emailComprador,

        productos:
          pedido.productos || [],

        subtotal:
          pedido.subtotal,

        descuento:
          pedido.descuento,

        precio:
          pedido.precio,

        estado:
          pedido.estado,

        creadoEn:
          pedido.creadoEn,

        comprobante: Boolean(
          pedido.comprobante
        ),
      })
    );

    return res.status(200).json({
      pedidos: resultado,
    });
  } catch (error) {
    console.error(
      "Error obteniendo pedidos pendientes:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudieron cargar los pedidos.",
    });
  }
}