import jsPDF from "jspdf";
import { toJpeg } from "html-to-image";

const ANCHO_A4_PX = 794;
const ALTO_A4_PX = 1123;

const ANCHO_A4_MM = 210;
const ALTO_A4_MM = 297;

/**
 * Espera uno o varios frames del navegador.
 * Sirve para darle tiempo a React a renderizar
 * la página nueva antes de capturarla.
 */
function esperarFrames(cantidad = 2) {
  return new Promise((resolve) => {
    let frameActual = 0;

    function siguienteFrame() {
      frameActual += 1;

      if (frameActual >= cantidad) {
        resolve();
        return;
      }

      requestAnimationFrame(siguienteFrame);
    }

    requestAnimationFrame(siguienteFrame);
  });
}

/**
 * Espera que todas las imágenes contenidas
 * dentro de la lámina hayan terminado de cargar.
 */
async function esperarImagenes(elemento) {
  if (!elemento) return;

  const imagenes = Array.from(
    elemento.querySelectorAll("img")
  );

  if (imagenes.length === 0) return;

  await Promise.all(
    imagenes.map((imagen) => {
      if (
        imagen.complete &&
        imagen.naturalWidth > 0
      ) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        const terminar = () => {
          imagen.removeEventListener(
            "load",
            terminar
          );

          imagen.removeEventListener(
            "error",
            terminar
          );

          resolve();
        };

        imagen.addEventListener(
          "load",
          terminar
        );

        imagen.addEventListener(
          "error",
          terminar
        );

        // Evita bloquear para siempre el PDF
        setTimeout(terminar, 5000);
      });
    })
  );
}

/**
 * Espera que las fuentes web estén listas.
 */
async function esperarFuentes() {
  try {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  } catch (error) {
    console.warn(
      "No se pudieron verificar las fuentes:",
      error
    );
  }
}

/**
 * Convierte una lámina del DOM en JPEG.
 */
async function capturarLamina(
  elemento,
  {
    calidad = 0.92,
    pixelRatio = 1.5,
  } = {}
) {
  if (!elemento) {
    throw new Error(
      "No se encontró la lámina para capturar."
    );
  }

  await esperarFuentes();
  await esperarImagenes(elemento);
  await esperarFrames(2);

  const imagen = await toJpeg(elemento, {
    quality: calidad,
    pixelRatio,

    width: ANCHO_A4_PX,
    height: ALTO_A4_PX,

    backgroundColor: "#ffffff",

    cacheBust: true,

    style: {
      width: `${ANCHO_A4_PX}px`,
      height: `${ALTO_A4_PX}px`,
      transform: "none",
      transformOrigin: "top left",
    },
  });

  return imagen;
}

/**
 * Genera un PDF recorriendo todas las páginas
 * del editor React.
 *
 * Parámetros:
 *
 * totalPaginas:
 * cantidad total de páginas.
 *
 * cambiarPagina:
 * función que cambia paginaActual.
 *
 * obtenerElemento:
 * función que devuelve el elemento A4
 * que debe capturarse.
 *
 * nombreArchivo:
 * nombre final del PDF.
 *
 * alActualizarProgreso:
 * opcional. Recibe:
 * {
 *   actual,
 *   total,
 *   porcentaje
 * }
 */
export async function generarPdfLaminas({
  totalPaginas,
  cambiarPagina,
  obtenerElemento,

  nombreArchivo =
    "50-Laberintos-Toby-y-Luna.pdf",

  calidad = 0.92,
  pixelRatio = 1.5,

  alActualizarProgreso,
}) {
  if (!totalPaginas || totalPaginas < 1) {
    throw new Error(
      "No hay páginas para exportar."
    );
  }

  if (
    typeof cambiarPagina !== "function"
  ) {
    throw new Error(
      "Falta la función cambiarPagina."
    );
  }

  if (
    typeof obtenerElemento !== "function"
  ) {
    throw new Error(
      "Falta la función obtenerElemento."
    );
  }

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  // Guardamos la página que estaba viendo
  // el usuario antes de comenzar.
  let paginaOriginal = 0;

  try {
    for (
      let indice = 0;
      indice < totalPaginas;
      indice += 1
    ) {
      // Cambiamos la página del editor.
      await cambiarPagina(indice);

      // Esperamos que React actualice el DOM.
      await esperarFrames(3);

      const elemento =
        obtenerElemento();

      if (!elemento) {
        throw new Error(
          `No se encontró la página ${
            indice + 1
          } para exportar.`
        );
      }

      await esperarImagenes(elemento);

      const imagen =
        await capturarLamina(elemento, {
          calidad,
          pixelRatio,
        });

      // jsPDF ya crea la primera página.
      // Las siguientes deben agregarse.
      if (indice > 0) {
        pdf.addPage(
          "a4",
          "portrait"
        );
      }

      pdf.addImage(
        imagen,
        "JPEG",
        0,
        0,
        ANCHO_A4_MM,
        ALTO_A4_MM,
        undefined,
        "FAST"
      );

      if (
        typeof alActualizarProgreso ===
        "function"
      ) {
        const actual = indice + 1;

        const porcentaje = Math.round(
          (actual / totalPaginas) * 100
        );

        alActualizarProgreso({
          actual,
          total: totalPaginas,
          porcentaje,
        });
      }

      // Liberamos la referencia local
      // antes de continuar con la siguiente.
      await esperarFrames(1);
    }

    pdf.save(nombreArchivo);
  } catch (error) {
    console.error(
      "Error generando el PDF:",
      error
    );

    throw error;
  } finally {
    // Si después queremos restaurar la página
    // original, podemos pasarla desde el editor.
    // Por ahora vuelve a la primera.
    try {
      await cambiarPagina(
        paginaOriginal
      );
    } catch {
      // No bloqueamos si falla la restauración.
    }
  }
}