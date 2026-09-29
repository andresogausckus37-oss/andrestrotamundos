import { get } from "@vercel/blob";
import { conectarMongoDB } from "../../lib/mongodb.js";

/* =====================================================
   ARCHIVOS DE PRODUCTOS ANTIGUOS

   Se mantiene temporalmente para compatibilidad.
   Los productos nuevos obtendrán archivoPDF desde MongoDB.
===================================================== */

const ARCHIVOS_PRODUCTOS = {
  "50-laberintos-para-ninos":
    "50-laberintos-para-niños.pdf",

  "50-crucigramas-reino-animal":
    "50-crucigramas-reino-animal-con-soluciones.pdf",

  "25-sopas-de-letras-para-adultos":
    "25-sopas-de-letras-para-adultos.pdf",

  "100-laberintos-para-adultos":
    "100-laberintos-adultos-nivel-imposible.pdf",
};

/* =====================================================
   OBTENER ARCHIVO PDF DEL PRODUCTO

   1. Busca el producto en MongoDB.
   2. Si tiene archivoPDF, utiliza ese archivo.
   3. Si no existe, utiliza el mapa antiguo.
===================================================== */

const obtenerArchivoProducto = async (
  db,
  productoId
) => {
  const productoMongo =
    await db
      .collection("productos")
      .findOne(
        {
          id: productoId,
        },
        {
          projection: {
            archivoPDF: 1,
          },
        }
      );

  if (
    productoMongo?.archivoPDF &&
    typeof productoMongo.archivoPDF ===
      "string"
  ) {
    return productoMongo.archivoPDF;
  }

  return (
    ARCHIVOS_PRODUCTOS[productoId] ||
    null
  );
};

/* =====================================================
   HANDLER
===================================================== */

export default async function handler(
  req,
  res
) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const {
      pedidoId,
      productoId,
    } = req.query;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    /* =====================================================
       CONECTAR A MONGODB
    ===================================================== */

    const db =
      await conectarMongoDB();

    /* =====================================================
       BUSCAR PEDIDO
    ===================================================== */

    const pedido =
      await db
        .collection("pedidos")
        .findOne({
          pedidoId,
        });

    if (!pedido) {
      return res.status(404).json({
        error:
          "Pedido no encontrado",
      });
    }

    /* =====================================================
       VALIDAR PAGO
    ===================================================== */

    if (
      pedido.estado !== "aprobado"
    ) {
      return res.status(403).json({
        error:
          "El pago todavía no está aprobado",
      });
    }

    /* =====================================================
       PRODUCTOS COMPRADOS
    ===================================================== */

    const productosComprados =
      Array.isArray(
        pedido.productos
      ) &&
      pedido.productos.length > 0
        ? pedido.productos.map(
            (producto) =>
              producto.productoId
          )
        : [pedido.productoId];

    const productoSolicitado =
      productoId ||
      pedido.productoId;

    /* =====================================================
       VALIDAR PRODUCTO
    ===================================================== */

    if (
      !productosComprados.includes(
        productoSolicitado
      )
    ) {
      return res.status(403).json({
        error:
          "Este producto no pertenece al pedido",
      });
    }

    /* =====================================================
       COMPROBAR SI YA FUE DESCARGADO
    ===================================================== */

    const yaDescargado =
      Array.isArray(
        pedido.historialDescargas
      ) &&
      pedido.historialDescargas.some(
        (descarga) =>
          descarga.productoId ===
          productoSolicitado
      );

    if (yaDescargado) {
      return res.status(403).json({
        error:
          "Este producto ya fue descargado",
      });
    }

    /* =====================================================
       OBTENER ARCHIVO DEL PRODUCTO
    ===================================================== */

    const archivo =
      await obtenerArchivoProducto(
        db,
        productoSolicitado
      );

    if (!archivo) {
      return res.status(404).json({
        error:
          "Archivo del producto no encontrado",
      });
    }

    /* =====================================================
       OBTENER PDF DEL BLOB PRIVADO
    ===================================================== */

    const resultado =
      await get(archivo, {
        access: "private",
      });

    if (!resultado) {
      return res.status(404).json({
        error:
          "PDF no encontrado",
      });
    }

    /* =====================================================
       RESERVAR DESCARGA

       Evita múltiples solicitudes simultáneas.
    ===================================================== */

    const fechaDescarga =
      new Date();

    const actualizacion =
      await db
        .collection("pedidos")
        .updateOne(
          {
            pedidoId,

            estado:
              "aprobado",

            historialDescargas: {
              $not: {
                $elemMatch: {
                  productoId:
                    productoSolicitado,
                },
              },
            },
          },
          {
            $inc: {
              descargas: 1,
            },

            $push: {
              historialDescargas: {
                productoId:
                  productoSolicitado,

                fecha:
                  fechaDescarga,
              },
            },
          }
        );

    if (
      actualizacion.modifiedCount !==
      1
    ) {
      return res.status(403).json({
        error:
          "Este producto ya fue descargado",
      });
    }

    /* =====================================================
       ENVIAR PDF
    ===================================================== */

    res.setHeader(
      "Content-Type",
      resultado.blob.contentType ||
        "application/pdf"
    );

    /*
     * Si archivoPDF contiene una ruta como:
     * productos/mi-producto/archivo.pdf
     *
     * descargamos solamente con el nombre:
     * archivo.pdf
     */
    const nombreDescarga =
      archivo
        .split("/")
        .pop() ||
      `${productoSolicitado}.pdf`;

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${nombreDescarga}"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
    );

    const reader =
      resultado.stream.getReader();

    while (true) {
      const {
        done,
        value,
      } = await reader.read();

      if (done) {
        break;
      }

      res.write(
        Buffer.from(value)
      );
    }

    res.end();
  } catch (error) {
    console.error(
      "Error descargando producto:",
      error
    );

    if (!res.headersSent) {
      return res.status(500).json({
        error:
          "Error al descargar el producto",
      });
    }

    res.end();
  }
}