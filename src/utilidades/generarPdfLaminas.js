import jsPDF from "jspdf";
import { toCanvas } from "html-to-image";

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

/* =========================================================
   ESPERAR IMÁGENES
========================================================= */

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
   PRECARGAR RECURSOS
========================================================= */

async function precargarRecursos(
  recursos = [],
  alActualizarProgreso
) {
  const urls = [
    ...new Set(
      recursos.filter(
        (url) =>
          typeof url === "string" &&
          url.trim() !== ""
      )
    ),
  ];

  if (urls.length === 0) {
    return;
  }

  let cargados = 0;

  for (const url of urls) {
    await new Promise((resolve) => {
      const imagen = new Image();

      let terminado = false;

      function terminar() {
        if (terminado) {
          return;
        }

        terminado = true;

        imagen.onload = null;
        imagen.onerror = null;

        cargados += 1;

        if (
          typeof alActualizarProgreso ===
          "function"
        ) {
          alActualizarProgreso({
            fase: "recursos",
            actual: cargados,
            total: urls.length,
            porcentaje: Math.round(
              (cargados / urls.length) * 100
            ),
          });
        }

        resolve();
      }

      imagen.onload = terminar;
      imagen.onerror = terminar;

      imagen.src = url;

      setTimeout(
        terminar,
        10000
      );
    });
  }
}

/* =========================================================
   CANVAS → BLOB
========================================================= */

function canvasABlob(
  canvas,
  calidad = 0.90
) {
  return new Promise(
    (resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(
              new Error(
                "No se pudo convertir el canvas a JPEG."
              )
            );

            return;
          }

          resolve(blob);
        },

        "image/jpeg",
        calidad
      );
    }
  );
}

/* =========================================================
   BLOB → UINT8ARRAY
========================================================= */

async function blobAUint8Array(blob) {
  const buffer =
    await blob.arrayBuffer();

  return new Uint8Array(
    buffer
  );
}

/* =========================================================
   CAPTURAR LÁMINA
========================================================= */

async function capturarLamina(
  elemento,
  {
    calidad = 0.90,
    pixelRatio = 1.25,
  } = {}
) {
  if (!elemento) {
    throw new Error(
      "No se encontró la lámina para capturar."
    );
  }

  /* -------------------------
     Esperar imágenes
  ------------------------- */

  const inicioImagenes =
    performance.now();

  await esperarImagenes(
    elemento
  );

  const finImagenes =
    performance.now();

  /* -------------------------
     Esperar render
  ------------------------- */

  await esperarFrames(1);

  /* -------------------------
     DOM → Canvas
  ------------------------- */

  const inicioToCanvas =
    performance.now();

  const canvas =
    await toCanvas(
      elemento,
      {
        pixelRatio,

        width:
          ANCHO_A4_PX,

        height:
          ALTO_A4_PX,

        backgroundColor:
          "#ffffff",

        cacheBust:
          false,

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

  const finToCanvas =
    performance.now();

  /* -------------------------
     Canvas → JPEG Blob
  ------------------------- */

  const inicioBlob =
    performance.now();

  const blob =
    await canvasABlob(
      canvas,
      calidad
    );

  const finBlob =
    performance.now();

  return {
    blob,

    tiempos: {
      imagenes:
        finImagenes -
        inicioImagenes,

      toCanvas:
        finToCanvas -
        inicioToCanvas,

      blob:
        finBlob -
        inicioBlob,
    },
  };
}

/* =========================================================
   GENERAR PDF
========================================================= */

export async function generarPdfLaminas({
  totalPaginas,

  cambiarPagina,

  obtenerElemento,

  recursosPrecargar = [],

  nombreArchivo =
    "Toby-y-Luna-Imprimibles.pdf",

  calidad = 0.90,

  pixelRatio = 1.25,

  paginaOriginal = 0,

  alActualizarProgreso,

  alActualizarDiagnostico,
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

  const pdf =
    new jsPDF({
      orientation:
        "portrait",

      unit:
        "mm",

      format:
        "a4",

      compress:
        true,
    });

  const diagnostico = [];

  try {
    /* =====================================================
       PRECARGAR RECURSOS
    ===================================================== */

    await esperarFuentes();

    await precargarRecursos(
      recursosPrecargar,
      alActualizarProgreso
    );

    await esperarFrames(2);

    /* =====================================================
       RECORRER PÁGINAS
    ===================================================== */

    for (
      let indice = 0;
      indice < totalPaginas;
      indice += 1
    ) {
      const inicioTotalReal =
        performance.now();

      /* -------------------------
         Cambiar/renderizar
      ------------------------- */

      const inicioRender =
        performance.now();

      await cambiarPagina(
        indice
      );

      await esperarFrames(1);

      const elemento =
        obtenerElemento();

      const finRender =
        performance.now();

      if (!elemento) {
        throw new Error(
          `No se encontró la página ${
            indice + 1
          } para exportar.`
        );
      }

      /* -------------------------
         Capturar
      ------------------------- */

      const captura =
        await capturarLamina(
          elemento,
          {
            calidad,
            pixelRatio,
          }
        );

      /* -------------------------
         Blob → Uint8Array
      ------------------------- */

      const inicioConversion =
        performance.now();

      const imagenBytes =
        await blobAUint8Array(
          captura.blob
        );

      const finConversion =
        performance.now();

      /* -------------------------
         Nueva página
      ------------------------- */

      if (indice > 0) {
        pdf.addPage(
          "a4",
          "portrait"
        );
      }

      /* -------------------------
         Agregar a jsPDF
      ------------------------- */

      const inicioAddImage =
        performance.now();

      pdf.addImage(
        imagenBytes,
        "JPEG",

        0,
        0,

        ANCHO_A4_MM,
        ALTO_A4_MM,

        undefined,

        "FAST"
      );

      const finAddImage =
        performance.now();

      const finTotalReal =
        performance.now();

      /* ===================================================
         DIAGNÓSTICO
      =================================================== */

      const medicion = {
        pagina:
          indice + 1,

        render:
          Math.round(
            finRender -
              inicioRender
          ),

        imagenes:
          Math.round(
            captura.tiempos.imagenes
          ),

        toCanvas:
          Math.round(
            captura.tiempos.toCanvas
          ),

        blob:
          Math.round(
            captura.tiempos.blob
          ),

        conversion:
          Math.round(
            finConversion -
              inicioConversion
          ),

        addImage:
          Math.round(
            finAddImage -
              inicioAddImage
          ),

        totalReal:
          Math.round(
            finTotalReal -
              inicioTotalReal
          ),
      };

      diagnostico.push(
        medicion
      );

      if (
        typeof alActualizarDiagnostico ===
        "function"
      ) {
        alActualizarDiagnostico(
          [...diagnostico]
        );
      }

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
          fase:
            "pdf",

          actual,

          total:
            totalPaginas,

          porcentaje,
        });
      }
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
      // No bloqueamos la exportación
      // si falla la restauración.
    }
  }
}