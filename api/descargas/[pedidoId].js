import { get } from "@vercel/blob";
import { conectarMongoDB } from "../../lib/mongodb.js";

const ARCHIVOS_PRODUCTOS = {
  "50-laberintos-para-ninos":
    "50-laberintos-para-niños.pdf",

  "50-crucigramas-dificultad-progresiva":
    "50-crucigramas-dificultad-progresiva.pdf",
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const { pedidoId } = req.query;

    if (!pedidoId) {
      return res.status(400).json({
        error: "Falta pedidoId",
      });
    }

    const db = await conectarMongoDB();

    const pedido = await db
      .collection("pedidos")
      .findOne({ pedidoId });

    if (!pedido) {
      return res.status(404).json({
        error: "Pedido no encontrado",
      });
    }

    if (pedido.estado !== "aprobado") {
      return res.status(403).json({
        error: "El pago todavía no está aprobado",
      });
    }

    const archivo =
      ARCHIVOS_PRODUCTOS[pedido.productoId];

    if (!archivo) {
      return res.status(404).json({
        error: "Archivo del producto no encontrado",
      });
    }

    const resultado = await get(archivo, {
      access: "private",
    });

    if (!resultado) {
      return res.status(404).json({
        error: "PDF no encontrado",
      });
    }

    res.setHeader(
      "Content-Type",
      resultado.blob.contentType ||
        "application/pdf"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${archivo}"`
    );

    res.setHeader(
      "Cache-Control",
      "private, no-store"
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

    await db
      .collection("pedidos")
      .updateOne(
        { pedidoId },
        {
          $inc: { descargas: 1 },
        }
      );
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