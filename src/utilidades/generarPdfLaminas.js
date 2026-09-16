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
   DATA URL → UINT8ARRAY
========================================================= */

function dataUrlAUint8Array(dataUrl) {
  const base64 =
    dataUrl.split(",")[1];

  const binario =
    atob(base64);

  const bytes =
    new Uint8Array(
      binario.length
    );

  for (
    let i = 0;
    i < binario.length;
    i += 1
  ) {
    bytes[i] =
      binario.charCodeAt(i);
  }

  return bytes;
}

/* =========================================================
   CAPTURAR LÁMINA
========================================================= */

async function capturarLamina(
  elemento,
  {
    calidad = 0.88,
    pixelRatio = 1,
  } = {}
) {
  if (!elemento) {
    throw new Error(
      "No se encontró la lámina para capturar."
    );
  }

  /* -------------------------
     Medir imágenes
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
     Medir html-to-image
  ------------------------- */

  const inicioToJpeg =
    performance.now();

  const resultado =
    await toJpeg(
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

  const finToJpeg =
    performance.now();

  return {
    dataUrl:
      resultado,

    tiempos: {
      imagenes:
        finImagenes -
        inicioImagenes,

      toJpeg:
        finToJpeg -
        inicioToJpeg,
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
      /* -------------------------
         Cambiar página
      ------------------------- */

      await cambiarPagina(
        indice
      );

      await esperarFrames(1);

      const elemento =
        obtenerElemento();

      if (!elemento) {
        throw new Error(
          `No se encontró la página ${
            indice + 1
          } para exportar.`
        );
      }

      /* -------------------------
         Inicio diagnóstico
      ------------------------- */

      const inicioPagina =
        performance.now();

      /* -------------------------
         Capturar página
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
         Data URL → Uint8Array
      ------------------------- */

      const inicioConversion =
        performance.now();

      const imagenBytes =
        dataUrlAUint8Array(
          captura.dataUrl
        );

      const finConversion =
        performance.now();

      /* -------------------------
         Nueva página PDF
      ------------------------- */

      if (indice > 0) {
        pdf.addPage(
          "a4",
          "portrait"
        );
      }

      /* -------------------------
         Agregar imagen a jsPDF
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

      const finPagina =
        performance.now();

      /* ===================================================
         DIAGNÓSTICO
      =================================================== */

      const medicion = {
        pagina:
          indice + 1,

        imagenes:
          Math.round(
            captura.tiempos.imagenes
          ),

        toJpeg:
          Math.round(
            captura.tiempos.toJpeg
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

        total:
          Math.round(
            finPagina -
            inicioPagina
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
       DESCARGAR PDF
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