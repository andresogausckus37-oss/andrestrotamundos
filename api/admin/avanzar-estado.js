import crypto from "crypto";
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
  if (req.method !== "POST") {
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

    if (
      pedido.estado ===
      "comprobante_recibido"
    ) {
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

    if (
      pedido.estado ===
      "verificando_pago"
    ) {
      const resultado =
        await pedidos.updateOne(
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
                    estado:
                      "pago_confirmado",
                    fecha,
                  },
                  {
                    estado:
                      "descarga_habilitada",
                    fecha,
                  },
                ],
              },
            },
          }
        );

      if (
        resultado.modifiedCount !== 1
      ) {
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
  } catch (error) {
    console.error(
      "Error avanzando estado:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo actualizar el estado del pedido.",
    });
  }
}