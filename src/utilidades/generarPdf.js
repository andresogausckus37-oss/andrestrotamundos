import { jsPDF } from "jspdf";

export const CONFIG_PDF = {
  formato: "a4",
  orientacion: "portrait",
  anchoPagina: 210,
  altoPagina: 297,
  margen: 5,
  nombreArchivo: "Andres-House-Sitter.pdf",
};

const archivoADataURL = (archivo) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () =>
      reject(
        new Error(
          `No se pudo leer ${archivo.name}`
        )
      );

    reader.readAsDataURL(archivo);
  });
};

const obtenerDimensiones = (dataUrl) => {
  return new Promise((resolve, reject) => {
    const imagen = new Image();

    imagen.onload = () => {
      resolve({
        ancho: imagen.naturalWidth,
        alto: imagen.naturalHeight,
      });
    };

    imagen.onerror = reject;
    imagen.src = dataUrl;
  });
};

const obtenerFormatoImagen = (archivo) => {
  const tipo = archivo.type.toLowerCase();

  if (tipo.includes("png")) {
    return "PNG";
  }

  return "JPEG";
};

// ============================================================
// CALCULAR POSICIÓN Y TAMAÑO
// ============================================================

const calcularAjuste = ({
  anchoImagenOriginal,
  altoImagenOriginal,
  modo,
}) => {
  const {
    anchoPagina,
    altoPagina,
    margen,
  } = CONFIG_PDF;

  const anchoDisponible =
    anchoPagina - margen * 2;

  const altoDisponible =
    altoPagina - margen * 2;

  // -----------------------------------------
  // 1. SIN RECORTAR
  // -----------------------------------------

  if (modo === "sin-recortar") {
    const escala = Math.min(
      anchoDisponible / anchoImagenOriginal,
      altoDisponible / altoImagenOriginal
    );

    const ancho =
      anchoImagenOriginal * escala;

    const alto =
      altoImagenOriginal * escala;

    return {
      x: (anchoPagina - ancho) / 2,
      y: (altoPagina - alto) / 2,
      ancho,
      alto,
    };
  }

  // -----------------------------------------
  // 2. ANCHO COMPLETO
  // -----------------------------------------

  if (modo === "ancho-completo") {
    const escala =
      anchoDisponible / anchoImagenOriginal;

    const ancho = anchoDisponible;

    const alto =
      altoImagenOriginal * escala;

    return {
      x: margen,
      y: (altoPagina - alto) / 2,
      ancho,
      alto,
    };
  }

  // -----------------------------------------
  // 3. AJUSTAR A A4
  // -----------------------------------------

  if (modo === "a4") {
    return {
      x: margen,
      y: margen,
      ancho: anchoDisponible,
      alto: altoDisponible,
    };
  }

  throw new Error(
    `Modo de ajuste desconocido: ${modo}`
  );
};

// ============================================================
// AGREGAR IMAGEN
// ============================================================

const agregarImagen = async ({
  pdf,
  archivo,
  esPrimeraPagina,
  modo,
}) => {
  if (!esPrimeraPagina) {
    pdf.addPage();
  }

  const dataUrl =
    await archivoADataURL(archivo);

  const dimensiones =
    await obtenerDimensiones(dataUrl);

  const posicion = calcularAjuste({
    anchoImagenOriginal:
      dimensiones.ancho,
    altoImagenOriginal:
      dimensiones.alto,
    modo,
  });

  const formato =
    obtenerFormatoImagen(archivo);

  // Recortamos visualmente cualquier parte que
  // quede fuera del área imprimible.
  if (modo === "ancho-completo") {
    const {
      margen,
      anchoPagina,
      altoPagina,
    } = CONFIG_PDF;

    pdf.saveGraphicsState();

    pdf.rect(
      margen,
      margen,
      anchoPagina - margen * 2,
      altoPagina - margen * 2
    );

    pdf.clip();
    pdf.discardPath();
  }

  pdf.addImage(
    dataUrl,
    formato,
    posicion.x,
    posicion.y,
    posicion.ancho,
    posicion.alto,
    undefined,
    "FAST"
  );

  if (modo === "ancho-completo") {
    pdf.restoreGraphicsState();
  }
};

// ============================================================
// GENERAR PDF
// ============================================================

export const generarPdf = async ({
  portada,
  paginas,
  paginaFinal,
  nombreArchivo,
  modoContenido = "sin-recortar",
}) => {
  if (!paginas || paginas.length === 0) {
    throw new Error(
      "Seleccioná al menos una página."
    );
  }

  const pdf = new jsPDF({
    orientation: CONFIG_PDF.orientacion,
    unit: "mm",
    format: CONFIG_PDF.formato,
    compress: true,
  });

  let indicePagina = 0;

  // Portada siempre completa
  if (portada?.archivo) {
    await agregarImagen({
      pdf,
      archivo: portada.archivo,
      esPrimeraPagina:
        indicePagina === 0,
      modo: "sin-recortar",
    });

    indicePagina++;
  }

  // Contenido según opción elegida
  for (const pagina of paginas) {
    await agregarImagen({
      pdf,
      archivo: pagina.archivo,
      esPrimeraPagina:
        indicePagina === 0,
      modo: modoContenido,
    });

    indicePagina++;
  }

  // Página final siempre completa
  if (paginaFinal?.archivo) {
    await agregarImagen({
      pdf,
      archivo:
        paginaFinal.archivo,
      esPrimeraPagina:
        indicePagina === 0,
      modo: "sin-recortar",
    });
  }

  pdf.save(
    nombreArchivo ||
      CONFIG_PDF.nombreArchivo
  );
};