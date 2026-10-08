import { conectarMongoDB } from "../lib/mongodb.js";

function escaparHtml(valor = "") {
  return String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export default async function handler(req, res) {
  try {
    if (req.method !== "GET") {
      return res.status(405).send("Método no permitido");
    }

    const productoId =
      typeof req.query?.id === "string"
        ? req.query.id.trim()
        : "";

    if (!productoId) {
      return res.status(400).send("Falta el ID del producto");
    }

    const db = await conectarMongoDB();

    const producto = await db
      .collection("productos")
      .findOne({
        id: productoId,
        activo: { $ne: false },
      });

    if (!producto) {
      return res.status(404).send("Producto no encontrado");
    }

    const nombre =
      producto.nombre || "Producto digital";

    const descripcion =
      producto.descripcion ||
      producto.descripcionCorta ||
      "Producto digital imprimible.";

    const imagen =
      producto.imagenes?.portada || "";

    const urlProducto =
      `https://andreshousesitter.com/tienda/${encodeURIComponent(
        producto.id
      )}`;

    if (!imagen) {
      return res
        .status(500)
        .send("El producto no tiene imagen de portada");
    }

    const tituloSeguro = escaparHtml(nombre);
    const descripcionSegura = escaparHtml(descripcion);
    const imagenSegura = escaparHtml(imagen);
    const urlSegura = escaparHtml(urlProducto);

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

  <!-- OPEN GRAPH -->

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

  <!-- X / TWITTER -->

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
  <p>${tituloSeguro}</p>
</body>
</html>`);
  } catch (error) {
    console.error(
      "Error generando preview del producto:",
      error
    );

    return res
      .status(500)
      .send("Error generando vista previa");
  }
}