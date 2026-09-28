import crypto from "crypto";
import { get, put } from "@vercel/blob";
import { conectarMongoDB } from "../../lib/mongodb.js";
import { enviarEmailCompra } from "../../lib/emailCompra.js";

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
   ENVIAR EMAIL DE COMPRA
========================= */

const enviarEmailPedido = async ({
  pedidos,
  pedido,
}) => {
  /*
   * Si ya quedó registrado como enviado,
   * no volvemos a enviarlo.
   */
  if (pedido.emailEnviado === true) {
    return true;
  }

  if (!pedido.emailComprador) {
    console.error(
      `Pedido ${pedido.pedidoId}: falta emailComprador.`
    );

    return false;
  }

  if (
    !Array.isArray(pedido.productos) ||
    pedido.productos.length === 0
  ) {
    console.error(
      `Pedido ${pedido.pedidoId}: no contiene productos para enviar por email.`
    );

    return false;
  }

  try {
    await enviarEmailCompra({
      pedidoId: pedido.pedidoId,
      email: pedido.emailComprador,
      productos: pedido.productos,
    });

    const fechaEmail = new Date();

    await pedidos.updateOne(
      {
        pedidoId: pedido.pedidoId,
        metodoPago: "transferencia",
      },
      {
        $set: {
          emailEnviado: true,
          emailEnviadoEn: fechaEmail,
        },
      }
    );

    return true;
  } catch (error) {
    console.error(
      `Error enviando email del pedido ${pedido.pedidoId}:`,
      error
    );

    return false;
  }
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

    /*
     * El pedido ya está aprobado.
     * Ahora enviamos el email de descarga.
     *
     * Si Resend falla, NO revertimos el pago:
     * el cliente conserva la descarga habilitada.
     */
    const emailEnviado = await enviarEmailPedido({
      pedidos,
      pedido: {
        ...pedido,
        estado: "aprobado",
        pagadoEn: fecha,
      },
    });

    return res.status(200).json({
      actualizado: true,
      estado: "aprobado",
      descargaHabilitada: true,
      emailEnviado,
    });
  }

  /* =========================
     YA APROBADO
  ========================= */

  if (pedido.estado === "aprobado") {
    /*
     * Si el pedido fue aprobado anteriormente
     * pero el email no llegó a enviarse,
     * hacemos un nuevo intento.
     */
    let emailEnviado =
      pedido.emailEnviado === true;

    if (!emailEnviado) {
      emailEnviado = await enviarEmailPedido({
        pedidos,
        pedido,
      });
    }

    return res.status(200).json({
      actualizado: false,
      estado: "aprobado",
      descargaHabilitada: true,
      emailEnviado,
    });
  }

  return res.status(400).json({
    error: `No se puede avanzar desde el estado "${pedido.estado}".`,
  });
};

/* =========================
   CREAR PRODUCTO
========================= */

const crearProducto = async (req, res) => {
  const producto = req.body;

  if (!producto?.id) {
    return res.status(400).json({
      error: "Falta el ID del producto.",
    });
  }

  if (!producto?.nombre) {
    return res.status(400).json({
      error: "Falta el nombre del producto.",
    });
  }

  if (!producto?.categoria) {
    return res.status(400).json({
      error: "Falta la categoría del producto.",
    });
  }

  const db = await conectarMongoDB();
  const productos = db.collection("productos");

  const existente = await productos.findOne({
    id: producto.id,
  });

  if (existente) {
    return res.status(409).json({
      error: "Ya existe un producto con ese ID.",
    });
  }

  const fecha = new Date();

  const nuevoProducto = {
    ...producto,
    creadoEn: fecha,
    actualizadoEn: fecha,
  };

  const resultado = await productos.insertOne(
    nuevoProducto
  );

  return res.status(201).json({
    ok: true,
    mensaje: "Producto guardado correctamente.",
    productoId: resultado.insertedId.toString(),
  });
};

/* =========================
   SUBIR IMAGEN DE PRODUCTO
========================= */

const subirImagenProducto = async (req, res) => {
  const {
    productoId,
    numeroImagen,
    imagenBase64,
  } = req.body || {};

  if (!productoId) {
    return res.status(400).json({
      error: "Falta productoId.",
    });
  }

  const numero = Number(numeroImagen);

  if (
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 6
  ) {
    return res.status(400).json({
      error: "El número de imagen debe estar entre 1 y 6.",
    });
  }

  if (!imagenBase64) {
    return res.status(400).json({
      error: "Falta la imagen.",
    });
  }

  /*
   * Recibimos el WebP ya optimizado desde
   * AdminNuevoProducto.
   */
  const base64 = imagenBase64.replace(
    /^data:image\/webp;base64,/,
    ""
  );

  const buffer = Buffer.from(
    base64,
    "base64"
  );

  if (!buffer.length) {
    return res.status(400).json({
      error: "La imagen está vacía.",
    });
  }

  /*
   * Evitamos recibir archivos excesivamente
   * grandes por error.
   */
  const MAX_BYTES = 5 * 1024 * 1024;

  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({
      error: "La imagen supera los 5 MB.",
    });
  }

  const pathname =
    `productos/${productoId}/imagen-${numero}.webp`;

  const blob = await put(
    pathname,
    buffer,
    {
      access: "public",
      contentType: "image/webp",
      addRandomSuffix: false,
      token: process.env.BLOB_PUBLIC_READ_WRITE_TOKEN,
    }
  );

  return res.status(201).json({
    ok: true,
    numeroImagen: numero,
    url: blob.url,
    pathname: blob.pathname,
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

        /* =========================
       CREAR PRODUCTO
    ========================= */

    if (accion === "crear-producto") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await crearProducto(req, res);
    }

    /* =========================
   SUBIR IMAGEN PRODUCTO
========================= */

if (accion === "subir-imagen-producto") {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  return await subirImagenProducto(req, res);
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