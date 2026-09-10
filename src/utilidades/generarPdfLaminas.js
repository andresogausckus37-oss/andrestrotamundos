import jsPDF from "jspdf";
import { toJpeg } from "html-to-image";

/* =========================================================
   CONFIGURACIÓN A4
========================================================= */

const ANCHO_A4_PX = 794;
const ALTO_A4_PX = 1123;

const ANCHO_A4_MM = 210;
const ALTO_A4_MM = 297;

/* =========================================================
   ESPERAR FRAMES
========================================================= */

/**
 * Espera uno o varios frames del navegador.
 *
 * Sirve para darle tiempo a React a actualizar
 * correctamente el DOM antes de capturar una página.
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

      requestAnimationFrame(
        siguienteFrame
      );
    }

    requestAnimationFrame(
      siguienteFrame
    );
  });
}

/* =========================================================
   ESPERAR IMÁGENES
========================================================= */

/**
 * Espera que todas las imágenes de la lámina
 * hayan terminado de cargar.
 */
async function esperarImagenes(elemento) {
  if (!elemento) {
    return;
  }

  const imagenes = Array.from(
    elemento.querySelectorAll("img")
  );

  if (imagenes.length === 0) {
    return;
  }

  await Promise.all(
    imagenes.map((imagen) => {
      if (
        imagen.complete &&
        imagen.naturalWidth > 0
      ) {
        return Promise.resolve();
      }

      return new Promise((resolve) => {
        let terminado = false;

        function terminar() {
          if (terminado) {
            return;
          }

          terminado = true;

          imagen.removeEventListener(
            "load",
            terminar
          );

          imagen.removeEventListener(
            "error",
            terminar
          );

          resolve();
        }

        imagen.addEventListener(
          "load",
          terminar
        );

        imagen.addEventListener(
          "error",
          terminar
        );

        /*
          Evita que una imagen rota o lenta
          bloquee indefinidamente el PDF.
        */

        setTimeout(
          terminar,
          5000
        );
      });
    })
  );
}

/* =========================================================
   ESPERAR FUENTES
========================================================= */

/**
 * Espera que las fuentes web estén disponibles.
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

/* =========================================================
   CAPTURAR LÁMINA
========================================================= */

/**
 * Convierte un elemento A4 del DOM
 * en una imagen JPEG.
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

  await esperarImagenes(
    elemento
  );

  await esperarFrames(2);

  return toJpeg(
    elemento,
    {
      quality:
        calidad,

      pixelRatio,

      width:
        ANCHO_A4_PX,

      height:
        ALTO_A4_PX,

      backgroundColor:
        "#ffffff",

      cacheBust:
        true,

      style: {
        width:
          `${ANCHO_A4_PX}px`,

        height:
          `${ALTO_A4_PX}px`,

        transform:
          "none",

        transformOrigin:
          "top left",
      },
    }
  );
}

/* =========================================================
   GENERAR PDF
========================================================= */

/**
 * Genera un PDF recorriendo todas las páginas
 * renderizadas por el editor.
 *
 * No contiene lógica específica de ningún juego.
 *
 * Puede utilizarse para:
 *
 * - laberintos
 * - secuencias
 * - buscá objetos
 * - diferencias
 * - futuros productos imprimibles
 */
export async function generarPdfLaminas({
  totalPaginas,

  cambiarPagina,

  obtenerElemento,

  nombreArchivo =
    "Toby-y-Luna-Imprimibles.pdf",

  calidad = 0.92,

  pixelRatio = 1.5,

  paginaOriginal = 0,

  alActualizarProgreso,
}) {
  /* =======================================================
     VALIDACIONES
  ======================================================= */

  if (
    !Number.isInteger(
      totalPaginas
    ) ||
    totalPaginas < 1
  ) {
    throw new Error(
      "No hay páginas para exportar."
    );
  }

  if (
    typeof cambiarPagina !==
    "function"
  ) {
    throw new Error(
      "Falta la función cambiarPagina."
    );
  }

  if (
    typeof obtenerElemento !==
    "function"
  ) {
    throw new Error(
      "Falta la función obtenerElemento."
    );
  }

  /* =======================================================
     CREAR PDF
  ======================================================= */

  const pdf = new jsPDF({
    orientation:
      "portrait",

    unit:
      "mm",

    format:
      "a4",

    compress:
      true,
  });

  try {
    /* =====================================================
       RECORRER PÁGINAS
    ===================================================== */

    for (
      let indice = 0;
      indice < totalPaginas;
      indice += 1
    ) {
      /*
        Cambiamos la página del editor.
      */

      await cambiarPagina(
        indice
      );

      /*
        Esperamos que React actualice
        completamente el DOM.
      */

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

      /*
        Esperamos nuevamente las imágenes
        por seguridad antes de capturar.
      */

      await esperarImagenes(
        elemento
      );

      /*
        Convertimos la lámina a imagen.
      */

      const imagen =
        await capturarLamina(
          elemento,
          {
            calidad,
            pixelRatio,
          }
        );

      /*
        jsPDF crea automáticamente
        la primera página.

        Desde la segunda agregamos
        páginas nuevas.
      */

      if (indice > 0) {
        pdf.addPage(
          "a4",
          "portrait"
        );
      }

      /*
        Insertamos la captura ocupando
        exactamente toda la página A4.
      */

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

      /* ===================================================
         PROGRESO
      =================================================== */

      if (
        typeof alActualizarProgreso ===
        "function"
      ) {
        const actual =
          indice + 1;

        const porcentaje =
          Math.round(
            (
              actual /
              totalPaginas
            ) * 100
          );

        alActualizarProgreso({
          actual,

          total:
            totalPaginas,

          porcentaje,
        });
      }

      /*
        Dejamos respirar al navegador
        antes de procesar la siguiente página.

        Es especialmente útil en celulares
        y PDFs grandes.
      */

      await esperarFrames(1);
    }

    /* =====================================================
       DESCARGAR
    ===================================================== */

    pdf.save(
      nombreArchivo
    );
  } catch (error) {
    console.error(
      "Error generando el PDF:",
      error
    );

    throw error;
  } finally {
    /* =====================================================
       RESTAURAR PÁGINA
    ===================================================== */

    try {
      await cambiarPagina(
        paginaOriginal
      );
    } catch {
      /*
        No bloqueamos el proceso
        si falla la restauración.
      */
    }
  }
}