import fs from "fs";
import path from "path";
import { productos } from "../src/datos/productos.js";

const dominio = "https://andrestrotamundos.vercel.app";

const carpetaSalida = path.resolve("public/compartir");

fs.mkdirSync(carpetaSalida, {
  recursive: true,
});

const escaparHTML = (texto = "") =>
  texto
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

productos.forEach((producto) => {
  const titulo = escaparHTML(
    `${producto.nombre} | Andres House Sitter`
  );

  const descripcion = escaparHTML(
    producto.descripcion ||
      "Producto digital de Andres House Sitter."
  );

  const imagen =
    producto.imagenes?.social ||
    producto.imagenes?.portada;

  const urlProducto = `${dominio}/tienda/${producto.id}`;

  const urlCompartir =
    `${dominio}/compartir/${producto.id}.html`;

  if (!imagen) {
    console.warn(
      `El producto "${producto.nombre}" no tiene imagen social ni portada.`
    );

    return;
  }

  const html = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />

    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0"
    />

    <title>${titulo}</title>

    <meta
      name="description"
      content="${descripcion}"
    />

    <!-- OPEN GRAPH -->
    <meta
      property="og:title"
      content="${titulo}"
    />

    <meta
      property="og:description"
      content="${descripcion}"
    />

    <meta
      property="og:image"
      content="${imagen}"
    />

    <meta
      property="og:image:secure_url"
      content="${imagen}"
    />

    <meta
      property="og:image:type"
      content="image/png"
    />

    <meta
      property="og:image:width"
      content="1200"
    />

    <meta
      property="og:image:height"
      content="630"
    />

    <meta
      property="og:image:alt"
      content="${titulo}"
    />

    <meta
      property="og:type"
      content="product"
    />

    <meta
      property="og:url"
      content="${urlCompartir}"
    />

    <meta
      property="og:site_name"
      content="Andres House Sitter"
    />

    <!-- X / TWITTER -->
    <meta
      name="twitter:card"
      content="summary_large_image"
    />

    <meta
      name="twitter:title"
      content="${titulo}"
    />

    <meta
      name="twitter:description"
      content="${descripcion}"
    />

    <meta
      name="twitter:image"
      content="${imagen}"
    />

    <meta
      name="twitter:image:alt"
      content="${titulo}"
    />

    <!-- URL REAL DEL PRODUCTO -->
    <link
      rel="canonical"
      href="${urlProducto}"
    />

    <!-- REDIRECCIÓN -->
    
  </head>

  <body>
    <p>
      Abriendo
      <a href="${urlProducto}">
        ${escaparHTML(producto.nombre)}
      </a>
    </p>

    <script>
      window.location.replace("${urlProducto}");
    </script>
  </body>
</html>`;

  const archivo = path.join(
    carpetaSalida,
    `${producto.id}.html`
  );

  fs.writeFileSync(
    archivo,
    html,
    "utf8"
  );

  console.log(
    `Página social creada: ${producto.id}.html`
  );
});

console.log(
  "Páginas sociales generadas correctamente."
);