import crypto from "crypto";
import { get } from "@vercel/blob";
import { conectarMongoDB } from "../../lib/mongodb.js";

/* =========================
   AUTENTICACIÓN ADMIN
========================= */

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
    .createHmac("sha256", adminPassword)
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

/* =========================
   ENDPOINT
========================= */

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

    const pedidoId = req.query?.pedidoId;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    const db = await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne({
        pedidoId,
        metodoPago: "transferencia",
      });

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    if (!pedido.comprobante?.pathname) {
      return res.status(404).json({
        error: "Este pedido no tiene comprobante",
      });
    }

    /* =========================
       OBTENER BLOB PRIVADO
    ========================= */

    const resultado = await get(
      pedido.comprobante.pathname,
      {
        access: "private",
      }
    );

    if (!resultado?.stream) {
      return res.status(404).json({
        error: "Comprobante no encontrado",
      });
    }

    const contentType =
      pedido.comprobante.contentType ||
      "application/octet-stream";

    res.setHeader(
      "Content-Type",
      contentType
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    res.setHeader(
      "Content-Disposition",
      'inline; filename="comprobante"'
    );

    const reader =
      resultado.stream.getReader();

    while (true) {
      const { done, value } =
        await reader.read();

      if (done) break;

      res.write(Buffer.from(value));
    }

    res.end();
  } catch (error) {
    console.error(
      "Error obteniendo comprobante:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo cargar el comprobante",
    });
  }
}