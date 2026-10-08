import crypto from "crypto";
import { del, get, put } from "@vercel/blob";
import { handleUpload } from "@vercel/blob/client";
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

  /*
   * A partir de ahora, los productos nuevos
   * deben tener su PDF privado asociado.
   */
  if (!producto?.archivoPDF) {
    return res.status(400).json({
      error: "Falta el PDF privado del producto.",
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

  /*
   * La fecha de creación y el vencimiento de la oferta
   * se calculan en el servidor. No confiamos en el reloj
   * del navegador para definir estas fechas.
   */
  let ofertaLanzamiento = producto?.ofertaLanzamiento;

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
      duracionDias > 7
    ) {
      return res.status(400).json({
        error:
          "La duración de la oferta debe ser de 1 a 7 días.",
      });
    }

    const finalizaEn = new Date(
  fecha.getTime() +
    duracionDias * 24 * 60 * 60 * 1000
);

    ofertaLanzamiento = {
      ...ofertaLanzamiento,
      activa: true,
      duracionDias,
      iniciaEn: fecha,
      finalizaEn,
    };
  } else if (ofertaLanzamiento) {
    ofertaLanzamiento = {
      ...ofertaLanzamiento,
      activa: false,
    };
  }

  const nuevoProducto = {
    ...producto,
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
    numero > 12
  ) {
    return res.status(400).json({
      error:
        "El número de imagen debe estar entre 1 y 12.",
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
      allowOverwrite: true,
      token:
        process.env.BLOB_PUBLIC_READ_WRITE_TOKEN,
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
   SUBIR PDF PRIVADO
========================= */

const subirPdfProducto = async (req, res) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error:
        "No está configurado BLOB_READ_WRITE_TOKEN.",
    });
  }

  /*
   * El navegador no envía el PDF a esta
   * función.
   *
   * handleUpload genera un token temporal
   * para que el navegador pueda subir el
   * PDF directamente al Blob privado.
   */
  const resultado = await handleUpload({
    body: req.body,
    request: req,

    token:
      process.env.BLOB_READ_WRITE_TOKEN,

    onBeforeGenerateToken: async (
      pathname,
      clientPayload
    ) => {
      /*
       * La generación del token viene desde
       * el navegador del administrador.
       *
       * Acá sí comprobamos la cookie admin.
       */
      if (!adminAutorizado(req)) {
        throw new Error("No autorizado");
      }

      if (
        !pathname ||
        typeof pathname !== "string"
      ) {
        throw new Error(
          "Ruta de PDF inválida."
        );
      }

      let datos = {};

      if (clientPayload) {
        try {
          datos =
            JSON.parse(clientPayload);
        } catch {
          throw new Error(
            "Datos de subida inválidos."
          );
        }
      }

      const productoId =
        datos?.productoId;

      if (
        !productoId ||
        typeof productoId !== "string"
      ) {
        throw new Error(
          "Falta productoId."
        );
      }

      /*
       * Los IDs de nuestros productos utilizan
       * únicamente letras minúsculas, números
       * y guiones.
       */
      if (
        !/^[a-z0-9-]+$/.test(
          productoId
        )
      ) {
        throw new Error(
          "productoId inválido."
        );
      }

      const pathnameEsperado =
        `productos/${productoId}/${productoId}.pdf`;

      /*
       * Impedimos que desde el navegador se
       * pueda elegir cualquier ruta del
       * almacenamiento privado.
       */
      if (
        pathname !==
        pathnameEsperado
      ) {
        throw new Error(
          "La ruta del PDF no coincide con el producto."
        );
      }

      return {
        allowedContentTypes: [
          "application/pdf",
        ],

        /*
         * Permitimos hasta 250 MB.
         */
        maximumSizeInBytes:
          250 * 1024 * 1024,

        addRandomSuffix: false,

        allowOverwrite: true,

        tokenPayload:
          JSON.stringify({
            productoId,
          }),
      };
    },

    /*
     * Esta llamada la realiza Vercel una vez
     * completada la subida.
     *
     * No necesitamos modificar MongoDB aquí,
     * porque AdminNuevoProducto recibe el
     * pathname y luego lo guarda dentro del
     * producto.
     */
    onUploadCompleted: async ({
      blob,
      tokenPayload,
    }) => {
      console.log(
        "PDF privado subido:",
        blob.pathname,
        tokenPayload
      );
    },
  });

  return res.status(200).json(
    resultado
  );
};

/* =========================
   SUBIR VIDEO REEL PÚBLICO
========================= */

const subirVideoReel = async (req, res) => {
  if (!process.env.BLOB_PUBLIC_READ_WRITE_TOKEN) {
    return res.status(500).json({
      error:
        "No está configurado BLOB_PUBLIC_READ_WRITE_TOKEN.",
    });
  }

  const resultado = await handleUpload({
    body: req.body,
    request: req,

    token:
      process.env.BLOB_PUBLIC_READ_WRITE_TOKEN,

    onBeforeGenerateToken: async (
      pathname,
      clientPayload
    ) => {
      if (!adminAutorizado(req)) {
        throw new Error("No autorizado");
      }

      let datos = {};

      if (clientPayload) {
        try {
          datos = JSON.parse(clientPayload);
        } catch {
          throw new Error(
            "Datos de subida inválidos."
          );
        }
      }

      const productoId =
        datos?.productoId;

      if (
        !productoId ||
        typeof productoId !== "string" ||
        !/^[a-z0-9-]+$/.test(productoId)
      ) {
        throw new Error(
          "productoId inválido."
        );
      }

      const pathnameEsperado =
        `productos/${productoId}/reel.mp4`;

      if (pathname !== pathnameEsperado) {
        throw new Error(
          "La ruta del Reel no coincide con el producto."
        );
      }

      return {
        allowedContentTypes: [
          "video/mp4",
        ],

        maximumSizeInBytes:
          100 * 1024 * 1024,

        addRandomSuffix: false,

        allowOverwrite: true,

        tokenPayload:
          JSON.stringify({
            productoId,
          }),
      };
    },

    onUploadCompleted: async ({
      blob,
      tokenPayload,
    }) => {
      console.log(
        "Reel público subido:",
        blob.pathname,
        tokenPayload
      );
    },
  });

  return res.status(200).json(
    resultado
  );
};

/* =========================
   LISTAR PRODUCTOS PÚBLICOS
========================= */

const listarProductosPublicos = async (
  req,
  res
) => {
  const db = await conectarMongoDB();

  const productos = await db
    .collection("productos")
    .find({})
    .sort({
      creadoEn: -1,
    })
    .toArray();

  /*
   * archivoPDF NO debe salir por esta API.
   *
   * El pathname pertenece al sistema privado
   * de entrega de archivos.
   */
  const resultado = productos.map(
    ({
      _id,
      actualizadoEn,
      archivoPDF,
      ...producto
    }) => producto
  );

  res.setHeader(
    "Cache-Control",
    "public, s-maxage=60, stale-while-revalidate=300"
  );

  return res.status(200).json({
    productos: resultado,
  });
};

/* =========================
   LISTAR PRODUCTOS ADMIN
========================= */

const listarProductosAdmin = async (req, res) => {
  const db = await conectarMongoDB();

  const productos = await db
    .collection("productos")
    .find({})
    .sort({
      creadoEn: -1,
    })
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

/* =========================
   OBTENER PRODUCTO ADMIN
========================= */

const obtenerProductoAdmin = async (req, res) => {
  const productoId = req.query?.productoId;

  if (!productoId) {
    return res.status(400).json({
      error: "Falta productoId.",
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

  const {
    _id,
    ...productoSinObjectId
  } = producto;

  return res.status(200).json({
    producto: {
      ...productoSinObjectId,
      _id: _id.toString(),
    },
  });
};

/* =========================
   EDITAR PRODUCTO
========================= */

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

  const productoActual = await productos.findOne({
    id: productoId,
  });

  if (!productoActual) {
    return res.status(404).json({
      error: "Producto no encontrado.",
    });
  }

  /*
   * El ID no se modifica.
   *
   * Así mantenemos estables:
   * - URL de la tienda
   * - pedidos existentes
   * - imágenes
   * - PDF privado
   * - sitemap
   */

  const {
    _id,
    id,
    creadoEn,
    ...datosEditables
  } = cambios;

  const productoActualizado = {
    ...datosEditables,

    id: productoActual.id,

    creadoEn:
      productoActual.creadoEn ||
      new Date(),
    actualizadoEn: new Date(),
  };

  /*
   * Si desde el formulario no llega
   * un nuevo PDF, conservamos el actual.
   */

  if (!productoActualizado.archivoPDF) {
    productoActualizado.archivoPDF =
      productoActual.archivoPDF;
  }

  /*
   * Si no llegan imágenes nuevas,
   * conservamos las actuales.
   */

  if (!productoActualizado.imagenes) {
    productoActualizado.imagenes =
      productoActual.imagenes;
  }

  const resultado = await productos.updateOne(
    {
      id: productoId,
    },
        {
      $set: productoActualizado,
    }
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

/* =========================
   ELIMINAR PRODUCTO
========================= */

const eliminarProducto = async (req, res) => {
  const productoId =
    req.body?.productoId;

  if (!productoId) {
    return res.status(400).json({
      error: "Falta productoId.",
    });
  }

  const db = await conectarMongoDB();
  const productos =
    db.collection("productos");

  const producto =
    await productos.findOne({
      id: productoId,
    });

  if (!producto) {
    return res.status(404).json({
      error: "Producto no encontrado.",
    });
  }

  /*
   * 1. ELIMINAR IMÁGENES PÚBLICAS
   */

  const imagenes = [
    producto.imagenes?.portada,
    producto.imagenes?.preview,
    ...(producto.imagenes
      ?.previewsIndividuales || []),
    producto.imagenes?.portadaPDF,
    producto.imagenes?.paginaFinalPDF,

    producto.imagenes?.redes?.feed?.presentacion,
    producto.imagenes?.redes?.feed?.incluye,
    producto.imagenes?.redes?.feed?.beneficios,
    producto.imagenes?.redes?.feed?.comoFunciona,

    producto.imagenes?.redes?.vertical?.presentacion,
    producto.imagenes?.redes?.vertical?.incluye,
    producto.imagenes?.redes?.vertical?.beneficios,
    producto.imagenes?.redes?.vertical?.comoFunciona,
  ].filter(Boolean);

  if (imagenes.length > 0) {
    await del(imagenes, {
      token:
        process.env
          .BLOB_PUBLIC_READ_WRITE_TOKEN,
    });
  }

  /*
 * 2. ELIMINAR VIDEO REEL PÚBLICO
 */

if (producto.videoReel) {
  await del(producto.videoReel, {
    token:
      process.env
        .BLOB_PUBLIC_READ_WRITE_TOKEN,
  });
}

  /*
   * 2. ELIMINAR PDF PRIVADO
   */

  if (producto.archivoPDF) {
    await del(producto.archivoPDF, {
      token:
        process.env.BLOB_READ_WRITE_TOKEN,
    });
  }

  /*
   * 3. ELIMINAR DE MONGODB
   *
   * Esto se hace al final para no perder
   * las referencias a los archivos si
   * fallara alguna eliminación anterior.
   */

  const resultado =
    await productos.deleteOne({
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
  res
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
    "Producto digital";

  const descripcion =
    producto.descripcion ||
    producto.descripcionCorta ||
    "Producto digital imprimible.";

  // ÚNICAMENTE la imagen principal
  const imagen =
    producto.imagenes?.portada || "";

  if (!imagen) {
    return res
      .status(404)
      .send(
        "El producto no tiene imagen de portada"
      );
  }

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

  const urlSegura =
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
    href="${urlSegura}"
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
    content="${urlSegura}"
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
    <a href="${urlSegura}">
      Ver producto
    </a>
  </noscript>
</body>
</html>`);
};

/* =========================
   ENDPOINT ÚNICO
========================= */

export default async function handler(
  req,
  res
) {
  try {
    const accion =
      req.query?.accion;

    /* =========================
       SITEMAP PÚBLICO
    ========================= */

    if (accion === "sitemap") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await generarSitemap(
        req,
        res
      );
    }

    /* =========================
       PRODUCTOS PÚBLICOS
    ========================= */

    if (
      accion ===
      "productos-publicos"
    ) {
      if (req.method !== "GET") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await listarProductosPublicos(
        req,
        res
      );
    }

    /* =========================
   PREVIEW PRODUCTO
========================= */

if (
  accion ===
  "preview-producto"
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error:
        "Método no permitido",
    });
  }

  return await generarPreviewProducto(
    req,
    res
  );
}

    /* =========================
       SUBIR PDF PRODUCTO

       IMPORTANTE:
       esta acción va ANTES de la
       autenticación general.

       handleUpload recibe tanto la
       solicitud inicial del navegador
       como la notificación posterior
       de Vercel.

       La autorización admin se realiza
       dentro de onBeforeGenerateToken.
    ========================= */

    if (
      accion ===
      "subir-pdf-producto"
    ) {
      if (req.method !== "POST") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await subirPdfProducto(
        req,
        res
      );
    }

    /* =========================
   SUBIR VIDEO REEL
========================= */

if (
  accion ===
  "subir-video-reel"
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error:
        "Método no permitido",
    });
  }

  return await subirVideoReel(
    req,
    res
  );
}

    /* =========================
       AUTENTICACIÓN ADMIN
    ========================= */

    if (!adminAutorizado(req)) {
      return res.status(401).json({
        error: "No autorizado",
      });
    }

    /* =========================
       LISTAR
    ========================= */

    if (accion === "listar") {
      if (req.method !== "GET") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await listarPedidos(
        req,
        res
      );
    }

    /* =========================
       COMPROBANTE
    ========================= */

    if (
      accion === "comprobante"
    ) {
      if (req.method !== "GET") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await obtenerComprobante(
        req,
        res
      );
    }

    /* =========================
       AVANZAR
    ========================= */

    if (accion === "avanzar") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await avanzarEstado(
        req,
        res
      );
    }

    /* =========================
       CREAR PRODUCTO
    ========================= */

    if (
      accion ===
      "crear-producto"
    ) {
      if (req.method !== "POST") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await crearProducto(
        req,
        res
      );
    }

    /* =========================
       SUBIR IMAGEN PRODUCTO
    ========================= */

    if (
      accion ===
      "subir-imagen-producto"
    ) {
      if (req.method !== "POST") {
        return res.status(405).json({
          error:
            "Método no permitido",
        });
      }

      return await subirImagenProducto(
        req,
        res
      );
    }

    /* =========================
       LISTAR PRODUCTOS ADMIN
    ========================= */

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

    /* =========================
       OBTENER PRODUCTO ADMIN
    ========================= */

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

    /* =========================
       EDITAR PRODUCTO
    ========================= */

    if (accion === "editar-producto") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await editarProducto(
        req,
        res
      );
    }

    /* =========================
       ELIMINAR PRODUCTO
    ========================= */

    if (accion === "eliminar-producto") {
      if (req.method !== "POST") {
        return res.status(405).json({
          error: "Método no permitido",
        });
      }

      return await eliminarProducto(
        req,
        res
      );
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
        "No se pudo procesar la solicitud.",
    });
  }
}