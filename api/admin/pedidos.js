import crypto from "crypto";
import { conectarMongoDB } from "../../lib/mongodb.js";

/* =========================
   AUTENTICACIÓN ADMIN
========================= */

const obtenerCookies = (req) => {
  const cookies = {};
  const header = req.headers?.cookie || "";

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

  const token = obtenerCookies(req).admin_token;

  if (!token) return false;

  const a = Buffer.from(token);
  const b = Buffer.from(tokenEsperado);

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
};

/* =========================
   UTILIDADES R2
========================= */

const obtenerBucketProductos = (req) => {
  const bucket = req.env?.PRODUCTOS_R2;

  if (!bucket) {
    throw new Error(
      "PRODUCTOS_R2 no está conectado al Worker."
    );
  }

  return bucket;
};

const obtenerUrlPublicaR2 = (req) => {
  const url = req.env?.PRODUCTOS_R2_URL;

  if (!url) {
    throw new Error(
      "Falta PRODUCTOS_R2_URL en el Worker."
    );
  }

  return String(url).replace(/\/+$/, "");
};

const productoIdValido = (productoId) =>
  typeof productoId === "string" &&
  /^[a-z0-9-]+$/.test(productoId);

const eliminarCarpetaProductoR2 = async (
  req,
  productoId
) => {
  const bucket = obtenerBucketProductos(req);
  const prefix = `productos/${productoId}/`;
  let cursor;

  do {
    const resultado = await bucket.list({
      prefix,
      ...(cursor ? { cursor } : {}),
    });

    const claves = (resultado.objects || []).map(
      (objeto) => objeto.key
    );

    if (claves.length > 0) {
      await bucket.delete(claves);
    }

    cursor =
      resultado.truncated && resultado.cursor
        ? resultado.cursor
        : null;
  } while (cursor);
};

/* =========================
   PEDIDOS POR TRANSFERENCIA
========================= */

const listarPedidos = async (req, res) => {
  const db = await conectarMongoDB();

  const pedidos = await db
    .collection("pedidos")
    .find({
      metodoPago: "transferencia",
      estado: { $ne: "aprobado" },
    })
    .sort({ creadoEn: -1 })
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

/*
 * El almacenamiento anterior fue retirado.
 * La API que SUBE comprobantes debe migrarse a R2 antes
 * de volver a habilitar la visualización del archivo.
 */
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

  if (!pedido.comprobante) {
    return res.status(404).json({
      error: "Este pedido no tiene comprobante",
    });
  }

  return res.status(501).json({
    error:
      "La visualización del comprobante está pendiente de migrar a Cloudflare R2.",
  });
};

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
            estado: "pago_confirmado",
            fecha,
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
    });
  }

  if (pedido.estado === "aprobado") {
    return res.status(200).json({
      actualizado: false,
      estado: "aprobado",
    });
  }

  return res.status(400).json({
    error:
      `No se puede avanzar desde el estado "${pedido.estado}".`,
  });
};

/* =========================
   CREAR PEDIDO FÍSICO
========================= */

const crearPedidoFisico = async (req, res) => {
  const {
    productoId,
    variante = "",
    cantidad = 1,
    nombreComprador,
    emailComprador,
    telefonoComprador,
    direccion,
    localidad,
    provincia,
    codigoPostal,
  } = req.body || {};

  const cantidadFinal = Math.max(
    1,
    Number(cantidad) || 1
  );

  if (
    !productoId ||
    !nombreComprador?.trim() ||
    !emailComprador?.trim() ||
    !telefonoComprador?.trim() ||
    !direccion?.trim() ||
    !localidad?.trim() ||
    !provincia?.trim() ||
    !codigoPostal?.trim()
  ) {
    return res.status(400).json({
      error:
        "Faltan datos obligatorios para crear el pedido.",
    });
  }

  const emailValido =
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (
    !emailValido.test(emailComprador.trim())
  ) {
    return res.status(400).json({
      error: "Correo electrónico inválido.",
    });
  }

  const db = await conectarMongoDB();

  const producto = await db
    .collection("productos")
    .findOne({
      id: productoId,
      activo: { $ne: false },
      disponibilidad: { $ne: "pausado" },
    });

  if (!producto) {
    return res.status(404).json({
      error:
        "El producto no está disponible.",
    });
  }

  if (
    producto.disponibilidad === "sin-stock" ||
    producto.disponibilidad === "proximamente" ||
    Number(producto.stock) === 0
  ) {
    return res.status(409).json({
      error:
        "El producto no está disponible para comprar.",
    });
  }

  const stock = Number(producto.stock);

  if (
    Number.isFinite(stock) &&
    stock >= 0 &&
    cantidadFinal > stock
  ) {
    return res.status(409).json({
      error:
        "La cantidad solicitada supera el stock disponible.",
    });
  }

  const variantes = Array.isArray(
    producto.detalles?.variantes
  )
    ? producto.detalles.variantes.filter(Boolean)
    : [];

  if (
    variantes.length > 0 &&
    !variantes.includes(variante)
  ) {
    return res.status(400).json({
      error:
        "La variante seleccionada no es válida.",
    });
  }

  const precioNormal =
    Number(producto.precioARS) || 0;

  const precioOferta =
    Number(producto.oferta?.precioARS) || 0;

  const finalizaEn =
    producto.ofertaLanzamiento?.finalizaEn;

  const ofertaVigente = finalizaEn
    ? new Date(finalizaEn).getTime() >
      Date.now()
    : true;

  const precioUnitario =
    producto.oferta?.activa === true &&
    precioOferta > 0 &&
    ofertaVigente
      ? precioOferta
      : precioNormal;

  if (precioUnitario <= 0) {
    return res.status(400).json({
      error:
        "El producto no tiene un precio válido.",
    });
  }

  const total =
    precioUnitario * cantidadFinal;

  const pedidoId =
    `PED-${Date.now()}-${crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase()}`;

  const fecha = new Date();

  const nombreProducto =
    typeof producto.nombre === "string"
      ? producto.nombre
      : producto.nombre?.es ||
        "Producto";

  const pedido = {
    pedidoId,

    nombreComprador:
      nombreComprador.trim(),

    emailComprador:
      emailComprador.trim().toLowerCase(),

    telefonoComprador:
      telefonoComprador.trim(),

    direccionEnvio: {
      direccion: direccion.trim(),
      localidad: localidad.trim(),
      provincia: provincia.trim(),
      codigoPostal: codigoPostal.trim(),
    },

    productos: [
      {
        productoId: producto.id,
        nombre: nombreProducto,
        variante: variante || "",
        cantidad: cantidadFinal,
        precioUnitario,
        precioARS: precioUnitario,
        subtotal: total,
      },
    ],

    subtotal: total,
    descuento: 0,
    precio: total,
    moneda: "ARS",

    metodoPago: "mercadopago-link",
    canalPedido: "whatsapp",

    estado: "pedido_iniciado",

    creadoEn: fecha,
    actualizadoEn: fecha,
    pagadoEn: null,

    historialEstados: [
      {
        estado: "pedido_iniciado",
        fecha,
      },
    ],
  };

  await db
    .collection("pedidos")
    .insertOne(pedido);

  return res.status(201).json({
    ok: true,
    pedidoId,
    estado: pedido.estado,
  });
};

/* =========================
   CREAR PRODUCTO FÍSICO
========================= */

const crearProducto = async (req, res) => {
  const producto = req.body;

  if (!productoIdValido(producto?.id)) {
    return res.status(400).json({
      error: "Falta el ID del producto o es inválido.",
    });
  }

  if (!producto?.nombre?.trim()) {
    return res.status(400).json({
      error: "Falta el nombre del producto.",
    });
  }

  if (!producto?.categoria) {
    return res.status(400).json({
      error: "Falta la categoría del producto.",
    });
  }

  const precioARS = Number(producto?.precioARS);

  if (!Number.isFinite(precioARS) || precioARS <= 0) {
    return res.status(400).json({
      error: "El precio ARS es inválido.",
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
  let ofertaLanzamiento =
    producto?.ofertaLanzamiento;

  if (
    ofertaLanzamiento &&
    typeof ofertaLanzamiento === "object" &&
    !Array.isArray(ofertaLanzamiento) &&
    ofertaLanzamiento.activa === true
  ) {
    const duracionDias = Number(
      ofertaLanzamiento.duracionDias
    );

    if (
      !Number.isInteger(duracionDias) ||
      duracionDias < 1 ||
      duracionDias > 30
    ) {
      return res.status(400).json({
        error:
          "La duración de la oferta debe ser de 1 a 30 días.",
      });
    }

    ofertaLanzamiento = {
      ...ofertaLanzamiento,
      activa: true,
      duracionDias,
      iniciaEn: fecha,
      finalizaEn: new Date(
        fecha.getTime() +
          duracionDias * 24 * 60 * 60 * 1000
      ),
    };
  } else if (ofertaLanzamiento) {
    ofertaLanzamiento = {
      ...ofertaLanzamiento,
      activa: false,
    };
  }

  const nuevoProducto = {
    ...producto,
    tipo: "fisico",
    precioARS,
    ...(ofertaLanzamiento
      ? { ofertaLanzamiento }
      : {}),
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
   SUBIR IMAGEN A R2
========================= */

const subirImagenProducto = async (req, res) => {
  const {
    productoId,
    numeroImagen,
    imagenBase64,
  } = req.body || {};

  if (!productoIdValido(productoId)) {
    return res.status(400).json({
      error: "productoId inválido.",
    });
  }

  const numero = Number(numeroImagen);

  if (
    !Number.isInteger(numero) ||
    numero < 1 ||
    numero > 12
  ) {
    return res.status(400).json({
      error:
        "El número de imagen debe estar entre 1 y 12.",
    });
  }

  if (
    typeof imagenBase64 !== "string" ||
    !imagenBase64
  ) {
    return res.status(400).json({
      error: "Falta la imagen.",
    });
  }

  const base64 = imagenBase64.replace(
    /^data:image\/webp;base64,/,
    ""
  );

  const buffer = Buffer.from(base64, "base64");

  if (!buffer.length) {
    return res.status(400).json({
      error: "La imagen está vacía.",
    });
  }

  const MAX_BYTES = 5 * 1024 * 1024;

  if (buffer.length > MAX_BYTES) {
    return res.status(413).json({
      error: "La imagen supera los 5 MB.",
    });
  }

  const bucket = obtenerBucketProductos(req);
  const pathname =
    `productos/${productoId}/imagen-${numero}.webp`;

  await bucket.put(pathname, buffer, {
    httpMetadata: {
      contentType: "image/webp",
      cacheControl:
        "public, max-age=31536000",
    },
  });

  const url =
    `${obtenerUrlPublicaR2(req)}/${pathname}`;

  return res.status(201).json({
    ok: true,
    numeroImagen: numero,
    url,
    pathname,
  });
};

/* =========================
   SUBIR VIDEO REEL A R2
========================= */

const subirVideoReel = async (req, res) => {
  const productoId = req.body?.productoId;
  const video = req.body?.video;

  if (!productoIdValido(productoId)) {
    return res.status(400).json({
      error: "productoId inválido.",
    });
  }

  if (!video) {
    return res.status(400).json({
      error: "Falta el video Reel.",
    });
  }

  if (
    video.type &&
    video.type !== "video/mp4"
  ) {
    return res.status(400).json({
      error: "El Reel debe ser un archivo MP4.",
    });
  }

  const MAX_BYTES = 100 * 1024 * 1024;

  if (
    typeof video.size === "number" &&
    video.size > MAX_BYTES
  ) {
    return res.status(413).json({
      error: "El Reel supera los 100 MB.",
    });
  }

  const bucket = obtenerBucketProductos(req);
  const pathname =
    `productos/${productoId}/reel.mp4`;

  await bucket.put(pathname, video, {
    httpMetadata: {
      contentType: "video/mp4",
      cacheControl:
        "public, max-age=31536000",
    },
  });

  const url =
    `${obtenerUrlPublicaR2(req)}/${pathname}`;

  return res.status(201).json({
    ok: true,
    url,
    pathname,
  });
};

/* =========================
   PRODUCTOS
========================= */

const listarProductosPublicos = async (
  req,
  res
) => {
  const db = await conectarMongoDB();

  const productos = await db
    .collection("productos")
    .find({
      activo: { $ne: false },
      disponibilidad: { $ne: "pausado" },
    })
    .sort({ creadoEn: -1 })
    .toArray();

  const resultado = productos.map(
    ({ _id, actualizadoEn, ...producto }) =>
      producto
  );

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );

  return res.status(200).json({
    productos: resultado,
  });
};

const listarProductosAdmin = async (req, res) => {
  const db = await conectarMongoDB();

  const productos = await db
    .collection("productos")
    .find({})
    .sort({ creadoEn: -1 })
    .toArray();

  const resultado = productos.map(
    ({ _id, ...producto }) => ({
      ...producto,
      _id: _id.toString(),
    })
  );

  return res.status(200).json({
    productos: resultado,
  });
};

const obtenerProductoAdmin = async (req, res) => {
  const productoId = req.query?.productoId;

  if (!productoId) {
    return res.status(400).json({
      error: "Falta productoId.",
    });
  }

  const db = await conectarMongoDB();

  const producto = await db
    .collection("productos")
    .findOne({ id: productoId });

  if (!producto) {
    return res.status(404).json({
      error: "Producto no encontrado.",
    });
  }

  const { _id, ...productoSinObjectId } =
    producto;

  return res.status(200).json({
    producto: {
      ...productoSinObjectId,
      _id: _id.toString(),
    },
  });
};

const editarProducto = async (req, res) => {
  const productoId = req.body?.productoId;
  const cambios = req.body?.producto;

  if (!productoId) {
    return res.status(400).json({
      error: "Falta productoId.",
    });
  }

  if (
    !cambios ||
    typeof cambios !== "object" ||
    Array.isArray(cambios)
  ) {
    return res.status(400).json({
      error: "Faltan los datos del producto.",
    });
  }

  const db = await conectarMongoDB();
  const productos = db.collection("productos");

  const productoActual =
    await productos.findOne({
      id: productoId,
    });

  if (!productoActual) {
    return res.status(404).json({
      error: "Producto no encontrado.",
    });
  }

  const {
    _id,
    id,
    creadoEn,
    ...datosEditables
  } = cambios;

  const productoActualizado = {
    ...datosEditables,
    id: productoActual.id,
    tipo: "fisico",
    creadoEn:
      productoActual.creadoEn || new Date(),
    actualizadoEn: new Date(),
  };

  if (!productoActualizado.imagenes) {
    productoActualizado.imagenes =
      productoActual.imagenes;
  }

  if (
    productoActualizado.videoReel ===
    undefined
  ) {
    productoActualizado.videoReel =
      productoActual.videoReel || null;
  }

  const resultado = await productos.updateOne(
    { id: productoId },
    { $set: productoActualizado }
  );

  if (resultado.matchedCount !== 1) {
    return res.status(404).json({
      error: "Producto no encontrado.",
    });
  }

  return res.status(200).json({
    ok: true,
    actualizado:
      resultado.modifiedCount === 1,
    mensaje:
      "Producto actualizado correctamente.",
  });
};

const eliminarProducto = async (req, res) => {
  const productoId = req.body?.productoId;

  if (!productoIdValido(productoId)) {
    return res.status(400).json({
      error: "productoId inválido.",
    });
  }

  const db = await conectarMongoDB();
  const productos = db.collection("productos");

  const producto = await productos.findOne({
    id: productoId,
  });

  if (!producto) {
    return res.status(404).json({
      error: "Producto no encontrado.",
    });
  }

  /*
   * Todo el material del producto vive bajo:
   * productos/{productoId}/
   *
   * Así eliminamos imágenes y Reel de R2 sin
   * depender de las URLs guardadas en MongoDB.
   */
  await eliminarCarpetaProductoR2(
    req,
    productoId
  );

  const resultado = await productos.deleteOne({
    id: productoId,
  });

  if (resultado.deletedCount !== 1) {
    return res.status(500).json({
      error:
        "No se pudo eliminar el producto de MongoDB.",
    });
  }

  return res.status(200).json({
    ok: true,
    mensaje:
      "Producto eliminado correctamente.",
  });
};

/* =========================
   SITEMAP XML
========================= */

const generarSitemap = async (req, res) => {
  const db = await conectarMongoDB();

  const productosMongo = await db
    .collection("productos")
    .find(
      {},
      {
        projection: {
          _id: 0,
          id: 1,
          actualizadoEn: 1,
          creadoEn: 1,
        },
      }
    )
    .toArray();

  const urlsProductos = productosMongo
    .filter((producto) => producto?.id)
    .map((producto) => producto.id)
    .map(
      (id) => `
  <url>
    <loc>https://andreshousesitter.com/tienda/${encodeURIComponent(
      id
    )}</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://andreshousesitter.com/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://andreshousesitter.com/tienda</loc>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
${urlsProductos}
</urlset>`;

  res.setHeader(
    "Content-Type",
    "application/xml; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600"
  );

  return res.status(200).send(xml);
};

/* =========================
   PREVIEW PRODUCTO
========================= */

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

const generarPreviewProducto = async (
  req,
  res,
  usarImagenFacebook = false
) => {
  
  const productoId =
    typeof req.query?.id === "string"
      ? req.query.id.trim()
      : "";

  if (!productoId) {
    return res
      .status(400)
      .send("Falta el ID del producto");
  }

  const db = await conectarMongoDB();

  const producto = await db
    .collection("productos")
    .findOne({
      id: productoId,
      activo: { $ne: false },
    });

  if (!producto) {
    return res
      .status(404)
      .send("Producto no encontrado");
  }

  const nombre =
    producto.nombre ||
    "Producto";

  const descripcion =
    producto.descripcion ||
    producto.descripcionCorta ||
    "Producto disponible en nuestra tienda.";

  const imagen = usarImagenFacebook
  ? producto.imagenes?.portadaFacebook ||
    producto.imagenes?.portada ||
    ""
  : producto.imagenes?.portada || "";

  if (!imagen) {
    return res
      .status(404)
      .send(
        "El producto no tiene imagen de portada"
      );
  }

  const rutaCompartir = usarImagenFacebook
  ? "compartir-facebook"
  : "compartir";

const urlCompartir =
  `https://andreshousesitter.com/${rutaCompartir}/${encodeURIComponent(
    producto.id
  )}`;

const urlProducto =
  `https://andreshousesitter.com/tienda/${encodeURIComponent(
    producto.id
  )}`;

  const tituloSeguro =
    escaparHtml(nombre);

  const descripcionSegura =
    escaparHtml(descripcion);

  const imagenSegura =
    escaparHtml(imagen);

  const urlCompartirSegura =
  escaparHtml(urlCompartir);

const urlProductoSeguro =
  escaparHtml(urlProducto);

  res.setHeader(
    "Content-Type",
    "text/html; charset=utf-8"
  );

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=300, stale-while-revalidate=600"
  );

  return res.status(200).send(`<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">

  <title>${tituloSeguro}</title>

  <meta
    name="description"
    content="${descripcionSegura}"
  >

  <link
  rel="canonical"
  href="${urlCompartirSegura}"
>

  <meta
    property="og:title"
    content="${tituloSeguro}"
  >

  <meta
    property="og:description"
    content="${descripcionSegura}"
  >

  <meta
    property="og:image"
    content="${imagenSegura}"
  >

  <meta
    property="og:image:secure_url"
    content="${imagenSegura}"
  >

  <meta
  property="og:url"
  content="${urlCompartirSegura}"
>

  <meta
    property="og:type"
    content="product"
  >

  <meta
    property="og:site_name"
    content="Andres House Sitter"
  >

  <meta
    property="og:locale"
    content="es_AR"
  >

  <meta
    name="twitter:card"
    content="summary_large_image"
  >

  <meta
    name="twitter:title"
    content="${tituloSeguro}"
  >

  <meta
    name="twitter:description"
    content="${descripcionSegura}"
  >

  <meta
    name="twitter:image"
    content="${imagenSegura}"
  >
</head>

<body>
  <script>
    window.location.replace(${JSON.stringify(urlProducto)});
  </script>

  <noscript>
    <a href="${urlProductoSeguro}">
      Ver producto
    </a>
  </noscript>
</body>
</html>`);
};


/* =========================
   ENDPOINT ÚNICO
========================= */

export default async function handler(req, res) {
  try {
    const accion = req.query?.accion;

    /* PÚBLICO */

    if (accion === "sitemap") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await generarSitemap(req, res);
    }

    if (accion === "crear-pedido") {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  return await crearPedidoFisico(
    req,
    res
  );
    }

    if (accion === "productos-publicos") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await listarProductosPublicos(
        req,
        res
      );
    }

    if (accion === "preview-producto") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await generarPreviewProducto(
        req,
        res
      );
    }

    if (
      accion === "preview-producto-facebook"
    ) {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await generarPreviewProducto(
        req,
        res,
        true
      );
    }

    /* ADMIN */

    if (!adminAutorizado(req)) {
      return res.status(401).json({
        error: "No autorizado",
      });
    }

    if (accion === "listar") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await listarPedidos(req, res);
    }

    if (accion === "comprobante") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await obtenerComprobante(
        req,
        res
      );
    }

    if (accion === "avanzar") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await avanzarEstado(req, res);
    }

    if (accion === "crear-producto") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await crearProducto(req, res);
    }

    if (
      accion === "subir-imagen-producto"
    ) {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await subirImagenProducto(
        req,
        res
      );
    }

    if (accion === "subir-video-reel") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await subirVideoReel(req, res);
    }

    if (accion === "listar-productos") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await listarProductosAdmin(
        req,
        res
      );
    }

    if (accion === "obtener-producto") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await obtenerProductoAdmin(
        req,
        res
      );
    }

    if (accion === "editar-producto") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await editarProducto(req, res);
    }

    if (accion === "eliminar-producto") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await eliminarProducto(req, res);
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
        error?.message ||
        "Error interno del servidor",
    });
  }
}
