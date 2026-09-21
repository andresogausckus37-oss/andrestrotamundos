import { PDFDocument, rgb } from "pdf-lib";

/* =========================================================
   CONFIGURACIÓN A4
========================================================= */

const ANCHO_A4 = 595.28;
const ALTO_A4 = 841.89;

/* =========================================================
   DESCARGAR ARCHIVO
========================================================= */

async function descargarBytes(url, nombreRecurso) {
  if (!url || typeof url !== "string") {
    throw new Error(
      `No se encontró ${nombreRecurso}.`
    );
  }

  const respuesta = await fetch(url);

  if (!respuesta.ok) {
    throw new Error(
      `No se pudo descargar ${nombreRecurso}.`
    );
  }

  const buffer = await respuesta.arrayBuffer();

  return new Uint8Array(buffer);
}

/* =========================================================
   DETECTAR TIPO DE IMAGEN
========================================================= */

function detectarTipoImagen(bytes) {
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "png";
  }

  if (
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "webp";
  }

  throw new Error(
    "La imagen debe estar en formato PNG, JPG o WebP."
  );
}

async function convertirWebpAPng(bytes) {
  const blob = new Blob([bytes], {
    type: "image/webp",
  });

  const bitmap = await createImageBitmap(blob);

  const canvas = document.createElement("canvas");

  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const contexto = canvas.getContext("2d");

  contexto.drawImage(bitmap, 0, 0);

  bitmap.close();

  const blobPng = await new Promise((resolve, reject) => {
    canvas.toBlob((resultado) => {
      if (resultado) {
        resolve(resultado);
      } else {
        reject(
          new Error("No se pudo convertir la imagen WebP.")
        );
      }
    }, "image/png");
  });

  return new Uint8Array(
    await blobPng.arrayBuffer()
  );
}

/* =========================================================
   AGREGAR IMAGEN COMO PÁGINA A4
========================================================= */

async function agregarImagenA4(
  documento,
  url,
  nombreRecurso
) {
  const bytes = await descargarBytes(
    url,
    nombreRecurso
  );

  const tipo = detectarTipoImagen(bytes);

  let imagen;

if (tipo === "png") {
  imagen = await documento.embedPng(bytes);
} else if (tipo === "jpg") {
  imagen = await documento.embedJpg(bytes);
} else {
  const bytesPng = await convertirWebpAPng(bytes);
  imagen = await documento.embedPng(bytesPng);
}

  const pagina = documento.addPage([
    ANCHO_A4,
    ALTO_A4,
  ]);

  const escala = Math.min(
    ANCHO_A4 / imagen.width,
    ALTO_A4 / imagen.height
  );

  const ancho = imagen.width * escala;
  const alto = imagen.height * escala;

  const x = (ANCHO_A4 - ancho) / 2;
  const y = (ALTO_A4 - alto) / 2;

  pagina.drawImage(imagen, {
    x,
    y,
    width: ancho,
    height: alto,
  });

  return pagina;
}

/* =========================================================
   AGREGAR LOGO
========================================================= */

async function prepararLogo(
  documento,
  logoUrl
) {
  if (!logoUrl) {
    return null;
  }

  try {
    const bytes = await descargarBytes(
      logoUrl,
      "el logo"
    );

    const tipo = detectarTipoImagen(bytes);

    if (tipo === "png") {
      return await documento.embedPng(bytes);
    }

    return await documento.embedJpg(bytes);
  } catch (error) {
    console.warn(
      "No se pudo agregar el logo:",
      error
    );

    return null;
  }
}

function dibujarLogo(
  pagina,
  logo
) {
  if (!pagina || !logo) {
    return;
  }

  const anchoLogo = 72;

  const escala =
    anchoLogo / logo.width;

  const altoLogo =
    logo.height * escala;

  const margenDerecho = 18;
  const margenSuperior = 18;

  const {
    width: anchoPagina,
    height: altoPagina,
  } = pagina.getSize();

  pagina.drawImage(logo, {
    x:
      anchoPagina -
      anchoLogo -
      margenDerecho,

    y:
      altoPagina -
      altoLogo -
      margenSuperior,

    width: anchoLogo,
    height: altoLogo,
  });
}

/* =========================================================
   COBERTURA INFERIOR
========================================================= */

function aplicarCoberturaInferior(
  pagina,
  cobertura
) {
  if (!cobertura?.activa) {
    return;
  }

  const {
    width: anchoPagina,
    height: altoPagina,
  } = pagina.getSize();

  // Los controles del editor están expresados en mm.
  // pdf-lib trabaja en puntos.
  const MM_A_PUNTOS = 72 / 25.4;

  const anchoSolicitado =
    Number(cobertura.ancho || 0) *
    MM_A_PUNTOS;

  const alturaSolicitada =
    Number(cobertura.altura || 0) *
    MM_A_PUNTOS;

  const posicionDesdeAbajo =
    Number(cobertura.posicion || 0) *
    MM_A_PUNTOS;

  const ancho = Math.min(
    anchoSolicitado,
    anchoPagina
  );

  const altura = Math.min(
    alturaSolicitada,
    altoPagina
  );

  const x =
    (anchoPagina - ancho) / 2;

  const y = Math.min(
    posicionDesdeAbajo,
    Math.max(0, altoPagina - altura)
  );

pagina.drawRectangle({
  x,
  y,
  width: ancho,
  height: altura,
  color: rgb(1, 1, 1),
});
}

/* =========================================================
   AGREGAR PDF EXTERNO
========================================================= */

async function agregarPdfExterno(
  documentoFinal,
  archivo,
  logo,
  coberturaInferior
) {
  const buffer =
    await archivo.arrayBuffer();

  const documentoOrigen =
    await PDFDocument.load(buffer);

  const indices =
    documentoOrigen.getPageIndices();

  const paginas =
    await documentoFinal.copyPages(
      documentoOrigen,
      indices
    );

  for (const pagina of paginas) {
  documentoFinal.addPage(pagina);

  aplicarCoberturaInferior(
    pagina,
    coberturaInferior
  );

  dibujarLogo(
    pagina,
    logo
  );
  }

  return paginas.length;
}

/* =========================================================
   DESCARGAR PDF FINAL
========================================================= */

function descargarPdf(
  bytes,
  nombreArchivo
) {
  const blob = new Blob(
    [bytes],
    {
      type: "application/pdf",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const enlace =
    document.createElement("a");

  enlace.href = url;

  enlace.download =
    nombreArchivo;

  document.body.appendChild(
    enlace
  );

  enlace.click();

  enlace.remove();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

/* =========================================================
   GENERAR PDF
========================================================= */

export async function generarPdfLaminas({
  imagenPortada = "",

  imagenFinal = "",

  archivosPdf = [],

  logoUrl = "",

  coberturaInferior = {
  activa: false,
  posicion: 18,
  altura: 22,
  ancho: 220,
},

  nombreArchivo =
    "Andres-Imprimibles.pdf",

  alActualizarProgreso,
}) {
  /* =======================================================
     VALIDACIONES
  ======================================================= */

  if (
    !Array.isArray(archivosPdf) ||
    archivosPdf.length === 0
  ) {
    throw new Error(
      "No hay PDFs para unir."
    );
  }

  /* =======================================================
     CREAR DOCUMENTO
  ======================================================= */

  const documentoFinal =
    await PDFDocument.create();

  /* =======================================================
     CALCULAR TOTAL DE PÁGINAS
  ======================================================= */

  let totalPaginasPdf = 0;

  for (const archivo of archivosPdf) {
    try {
      const buffer =
        await archivo.arrayBuffer();

      const documento =
        await PDFDocument.load(buffer);

      totalPaginasPdf +=
        documento.getPageCount();
    } catch {
      throw new Error(
        `No se pudo leer "${archivo.name}".`
      );
    }
  }

  const totalPaginas =
    totalPaginasPdf +
    (imagenPortada ? 1 : 0) +
    (imagenFinal ? 1 : 0);

  let paginasProcesadas = 0;

  function actualizarProgreso(
    fase = "pdf"
  ) {
    if (
      typeof alActualizarProgreso !==
      "function"
    ) {
      return;
    }

    alActualizarProgreso({
      fase,

      actual:
        paginasProcesadas,

      total:
        totalPaginas,

      porcentaje:
        totalPaginas > 0
          ? Math.round(
              (
                paginasProcesadas /
                totalPaginas
              ) * 100
            )
          : 0,
    });
  }

  actualizarProgreso(
    "preparando"
  );

  /* =======================================================
     PREPARAR LOGO
  ======================================================= */

  const logo =
    await prepararLogo(
      documentoFinal,
      logoUrl
    );

  /* =======================================================
     PORTADA
  ======================================================= */

  if (imagenPortada) {
    const paginaPortada =
      await agregarImagenA4(
        documentoFinal,
        imagenPortada,
        "la portada"
      );

    paginasProcesadas += 1;

    actualizarProgreso();
  }

  /* =======================================================
     ACTIVIDADES + SOLUCIONES
  ======================================================= */

  for (
    let indice = 0;
    indice < archivosPdf.length;
    indice += 1
  ) {
    const archivo =
      archivosPdf[indice];

    try {
      const paginasAgregadas =
  await agregarPdfExterno(
    documentoFinal,
    archivo,
    logo,
    coberturaInferior
  );

      paginasProcesadas +=
        paginasAgregadas;

      actualizarProgreso();
    } catch (error) {
      console.error(
        `Error procesando ${archivo.name}:`,
        error
      );

      throw new Error(
        `No se pudo agregar "${archivo.name}" al PDF final.`
      );
    }
  }

  /* =======================================================
     LÁMINA FINAL
  ======================================================= */

  if (imagenFinal) {
    const paginaFinal =
      await agregarImagenA4(
        documentoFinal,
        imagenFinal,
        "la lámina final"
      );

    paginasProcesadas += 1;

    actualizarProgreso();
  }

  /* =======================================================
     GUARDAR
  ======================================================= */

  actualizarProgreso(
    "guardando"
  );

  const bytes =
    await documentoFinal.save({
      useObjectStreams: true,
    });

  descargarPdf(
    bytes,
    nombreArchivo
  );

  paginasProcesadas =
    totalPaginas;

  actualizarProgreso(
    "completado"
  );

  return {
    paginas:
      totalPaginas,

    archivos:
      archivosPdf.length,

    bytes:
      bytes.length,
  };
}