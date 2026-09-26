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
    const [nombre, ...valor] = cookie.trim().split("=");

    if (nombre) {
      cookies[nombre] = decodeURIComponent(valor.join("="));
    }
  });

  return cookies;
};

const adminAutorizado = (req) => {
  const adminPassword = process.env.ADMIN_PASSWORD;

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
   LISTAR PEDIDOS PENDIENTES
========================= */

const listarPedidos = async (req, res) => {
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

  const resultado = pedidos.map((pedido) => ({
    pedidoId: pedido.pedidoId,

    nombreComprador: pedido.nombreComprador,

    emailComprador: pedido.emailComprador,

    productos: pedido.productos || [],

    subtotal: pedido.subtotal,

    descuento: pedido.descuento,

    precio: pedido.precio,

    estado: pedido.estado,

    creadoEn: pedido.creadoEn,

    comprobante: Boolean(pedido.comprobante),
  }));

  return res.status(200).json({
    pedidos: resultado,
  });
};

/* =========================
   OBTENER COMPROBANTE
========================= */

const obtenerComprobante = async (req, res) => {
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

  res.setHeader("Content-Type", contentType);

  res.setHeader(
    "Cache-Control",
    "private, no-store"
  );

  res.setHeader(
    "Content-Disposition",
    'inline; filename="comprobante"'
  );

  const reader = resultado.stream.getReader();

  while (true) {
    const { done, value } = await reader.read();

    if (done) break;

    res.write(Buffer.from(value));
  }

  return res.end();
};

/* =========================
   AVANZAR ESTADO
========================= */

const avanzarEstado = async (req, res) => {
  const pedidoId = req.body?.pedidoId;

  if (!pedidoId) {
    return res.status(400).json({
      error: "Falta pedidoId",
    });
  }

  const db = await conectarMongoDB();
  const pedidos = db.collection("pedidos");

  const pedido = await pedidos.findOne({
    pedidoId,
    metodoPago: "transferencia",
  });

  if (!pedido) {
    return res.status(404).json({
      error: "Pedido no encontrado",
    });
  }

  if (!pedido.comprobante) {
    return res.status(400).json({
      error:
        "El pedido todavía no tiene comprobante.",
    });
  }

  const fecha = new Date();

  /* =========================
     COMPROBANTE → VERIFICANDO
  ========================= */

  if (pedido.estado === "comprobante_recibido") {
    await pedidos.updateOne(
      {
        pedidoId,
        metodoPago: "transferencia",
        estado: "comprobante_recibido",
      },
      {
        $set: {
          estado: "verificando_pago",
        },

        $push: {
          historialEstados: {
            estado: "verificando_pago",
            fecha,
          },
        },
      }
    );

    return res.status(200).json({
      actualizado: true,
      estado: "verificando_pago",
    });
  }

  /* =========================
     VERIFICANDO → APROBADO
  ========================= */

  if (pedido.estado === "verificando_pago") {
    const resultado = await pedidos.updateOne(
      {
        pedidoId,
        metodoPago: "transferencia",
        estado: "verificando_pago",
      },
      {
        $set: {
          estado: "aprobado",
          pagadoEn: fecha,
        },

        $push: {
          historialEstados: {
            $each: [
              {
                estado: "pago_confirmado",
                fecha,
              },
              {
                estado: "descarga_habilitada",
                fecha,
              },
            ],
          },
        },
      }
    );

    if (resultado.modifiedCount !== 1) {
      return res.status(409).json({
        error:
          "El estado del pedido cambió. Actualiza el panel.",
      });
    }

    return res.status(200).json({
      actualizado: true,
      estado: "aprobado",
      descargaHabilitada: true,
    });
  }

  /* =========================
     YA APROBADO
  ========================= */

  if (pedido.estado === "aprobado") {
    return res.status(200).json({
      actualizado: false,
      estado: "aprobado",
      descargaHabilitada: true,
    });
  }

  return res.status(400).json({
    error: `No se puede avanzar desde el estado "${pedido.estado}".`,
  });
};

/* =========================
   ENDPOINT ÚNICO
========================= */

export default async function handler(req, res) {
  try {
    if (!adminAutorizado(req)) {
      return res.status(401).json({
        error: "No autorizado",
      });
    }

    const accion = req.query?.accion;

    /* =========================
       LISTAR
    ========================= */

    if (accion === "listar") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await listarPedidos(req, res);
    }

    /* =========================
       COMPROBANTE
    ========================= */

    if (accion === "comprobante") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await obtenerComprobante(req, res);
    }

    /* =========================
       AVANZAR
    ========================= */

    if (accion === "avanzar") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await avanzarEstado(req, res);
    }

    return res.status(400).json({
      error: "Acción no válida",
    });
  } catch (error) {
    console.error(
      "Error en administración de pedidos:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo procesar la solicitud.",
    });
  }
}