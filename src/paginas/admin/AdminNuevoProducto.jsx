import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ArrowDown,
  ArrowUp,
  FilePlus2,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { upload } from "@vercel/blob/client";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { generarPdfLaminas } from "../../utilidades/generarPdfLaminas";
import { ESTILOS_IMPRIMIBLES } from "../../generador/config/estilosImprimibles";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CATEGORIAS = [
  {
    valor: "laberintos",
    nombre: "Laberintos",
  },
  {
    valor: "crucigramas",
    nombre: "Crucigramas",
  },
  {
    valor: "sopa-de-letras",
    nombre: "Sopa de letras",
  },
  {
    valor: "rompecabezas",
    nombre: "Rompecabezas",
  },
  {
    valor: "sudoku",
    nombre: "Sudoku",
  },
  {
    valor: "palabras-desordenadas",
    nombre: "Palabras desordenadas",
  },
];

const PUBLICOS = [
  "Niños",
  "Adultos",
  "Para todas las edades",
];

const NIVELES = [
  "Niños",
  "Fácil",
  "Medio",
  "Difícil",
  "Avanzado",
  "Imposible",
  "Dificultad progresiva",
];

const ANCHO_OBJETIVO = 1080;
const ANCHO_REDES = 1080;
const CALIDAD_WEBP = 0.82;

const NOMBRES_IMAGENES = [
  "Imagen 1 — Presentación",
  "Imagen 2 — Qué incluye",
  "Imagen 3 — Beneficios",
  "Imagen 4 — Cómo funciona",
];


const NOMBRES_IMAGENES_VERTICAL = [
  "Vertical 1 — Presentación",
  "Vertical 2 — Qué incluye",
  "Vertical 3 — Beneficios",
  "Vertical 4 — Cómo funciona",
];

/* =========================================================
   UTILIDADES
========================================================= */

const crearId = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );

const obtenerNombreCategoria = (
  categoria
) =>
  CATEGORIAS.find(
    (item) =>
      item.valor === categoria
  )?.nombre.toLowerCase() ||
  "actividades";

const pluralActividad = (
  categoria
) => {
  const nombres = {
    laberintos: "laberintos",

    crucigramas:
      "crucigramas",

    "sopa-de-letras":
      "sopas de letras",

    rompecabezas:
      "rompecabezas",

    sudoku:
      "sudokus",

    "palabras-desordenadas":
      "actividades de palabras desordenadas",
  };

  return (
    nombres[categoria] ||
    "actividades"
  );
};

/* =========================================================
   OPTIMIZAR IMAGEN
========================================================= */

const procesarImagen = (
  archivo,
  anchoObjetivo = ANCHO_OBJETIVO
) =>
  new Promise(
    (resolve, reject) => {
      const urlOriginal =
        URL.createObjectURL(
          archivo
        );

      const imagen =
        new Image();

      imagen.onload = () => {
        const escala =
          Math.min(
            1,
            anchoObjetivo /
              imagen.naturalWidth
          );

        const ancho =
          Math.round(
            imagen.naturalWidth *
              escala
          );

        const alto =
          Math.round(
            imagen.naturalHeight *
              escala
          );

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = ancho;
        canvas.height = alto;

        const ctx =
          canvas.getContext(
            "2d"
          );

        if (!ctx) {
          URL.revokeObjectURL(
            urlOriginal
          );

          reject(
            new Error(
              "No se pudo procesar la imagen."
            )
          );

          return;
        }

        ctx.imageSmoothingEnabled =
          true;

        ctx.imageSmoothingQuality =
          "high";

        ctx.drawImage(
          imagen,
          0,
          0,
          ancho,
          alto
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(
              urlOriginal
            );

            if (!blob) {
              reject(
                new Error(
                  "No se pudo convertir la imagen a WebP."
                )
              );

              return;
            }

            const archivoOptimizado =
              new File(
                [blob],
                "imagen.webp",
                {
                  type:
                    "image/webp",
                }
              );

            resolve({
              archivoOptimizado,

              urlOptimizada:
                URL.createObjectURL(
                  archivoOptimizado
                ),

              pesoOriginal:
                archivo.size,

              pesoOptimizado:
                archivoOptimizado.size,
            });
          },
          "image/webp",
          CALIDAD_WEBP
        );
      };

      imagen.onerror = () => {
        URL.revokeObjectURL(
          urlOriginal
        );

        reject(
          new Error(
            "No se pudo leer la imagen."
          )
        );
      };

      imagen.src =
        urlOriginal;
    }
  );

const archivoADataUrl = (
  archivo
) =>
  new Promise(
    (resolve, reject) => {
      const lector =
        new FileReader();

      lector.onload = () =>
        resolve(
          lector.result
        );

      lector.onerror = () =>
        reject(
          new Error(
            "No se pudo preparar la imagen."
          )
        );

      lector.readAsDataURL(
        archivo
      );
    }
  );

/* =========================================================
   UTILIDADES DEL ARMADOR PDF
========================================================= */

const ALTURA_COBERTURA_MM = 20;
const ANCHO_COBERTURA_MM = 210;

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const crearIdArchivo = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const formatearBytes = (bytes = 0) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const obtenerCantidadPaginas = async (archivo) => {
  const bytes = await archivo.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
  return pdf.getPageCount();
};

const moverElemento = (lista, desde, hasta) => {
  if (desde < 0 || hasta < 0 || desde >= lista.length || hasta >= lista.length || desde === hasta) {
    return lista;
  }

  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);
  copia.splice(hasta, 0, elemento);
  return copia;
};

/* =========================================================
   PREVIEW PRIMERA ACTIVIDAD
========================================================= */

function PreviewPaginaPdf({
  archivo,
  numeroPagina,
  titulo,
  posicionCobertura,
}) {
  const canvasRef = useRef(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelado = false;
    let tareaRender = null;
    let documentoPdf = null;

    const renderizar = async () => {
      if (!archivo || !canvasRef.current) {
        return;
      }

      try {
        setCargando(true);
        setError("");

        const bytes = new Uint8Array(
          await archivo.arrayBuffer()
        );

        const tareaCarga = pdfjsLib.getDocument({
          data: bytes,
        });

        documentoPdf = await tareaCarga.promise;

        if (cancelado) {
          return;
        }

        if (numeroPagina > documentoPdf.numPages) {
          setError("");
          return;
        }

        const pagina = await documentoPdf.getPage(
          numeroPagina
        );

        if (cancelado || !canvasRef.current) {
          return;
        }

        const viewportBase = pagina.getViewport({
          scale: 1,
        });

        const anchoObjetivo = 500;

        const escala =
          anchoObjetivo / viewportBase.width;

        const viewport = pagina.getViewport({
          scale: escala,
        });

        const canvas = canvasRef.current;
        const contexto = canvas.getContext("2d");

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        tareaRender = pagina.render({
          canvasContext: contexto,
          viewport,
        });

        await tareaRender.promise;
      } catch (errorRender) {
        if (
          !cancelado &&
          errorRender?.name !== "RenderingCancelledException"
        ) {
          console.error(
            "Error mostrando preview del PDF:",
            errorRender
          );

          setError("No se pudo mostrar esta página.");
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    renderizar();

    return () => {
      cancelado = true;

      if (tareaRender) {
        try {
          tareaRender.cancel();
        } catch {
          // Sin acción.
        }
      }

      if (documentoPdf) {
        try {
          documentoPdf.destroy();
        } catch {
          // Sin acción.
        }
      }
    };
  }, [archivo, numeroPagina]);

  if (!archivo) {
    return null;
  }

  const porcentajeAltura =
    (ALTURA_COBERTURA_MM / 297) * 100;

  const porcentajePosicion =
    (Number(posicionCobertura || 0) / 297) * 100;

  return (
    <div className="min-w-0">
      <p className="mb-2 text-center text-[11px] font-bold text-slate-700">
                {titulo}
      </p>

      <div className="relative overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <canvas
          ref={canvasRef}
          className="block h-auto w-full bg-white"
        />

        {!cargando && !error && (
          <div
            className="pointer-events-none absolute left-0 right-0 border-y border-slate-200 bg-white"
            style={{
              bottom: `${porcentajePosicion}%`,
              height: `${porcentajeAltura}%`,
            }}
          />
        )}

        {cargando && (
          <div className="absolute inset-0 flex min-h-32 items-center justify-center bg-white/80">
            <Loader2
              size={18}
              className="animate-spin text-slate-500"
            />
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-center text-[10px] font-semibold text-red-600">
          {error}
        </p>
      )}

      <p className="mt-1 text-center text-[10px] text-slate-500">
        Página {numeroPagina}
      </p>
    </div>
  );
}

function PreviewActividadYSolucion({
  item,
  posicionCobertura,
}) {
  if (!item?.archivo) {
    return null;
  }

  const paginas = Number(item.paginas || 0);
  const tieneSolucion = paginas >= 2;

  return (
    <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-3">
        <p className="text-xs font-bold text-slate-700">
          Vista previa de actividad y solución
        </p>

        <p className="mt-1 text-[10px] text-slate-500">
          La franja blanca muestra la cobertura inferior que se aplicará al PDF final.
        </p>
      </div>

      <div
        className={
          tieneSolucion
            ? "grid grid-cols-2 gap-3"
            : "mx-auto grid max-w-[240px] grid-cols-1"
        }
      >
        <PreviewPaginaPdf
          archivo={item.archivo}
          numeroPagina={1}
          titulo="Actividad"
          posicionCobertura={posicionCobertura}
        />

        {tieneSolucion && (
          <PreviewPaginaPdf
            archivo={item.archivo}
            numeroPagina={2}
            titulo="Solución"
            posicionCobertura={posicionCobertura}
          />
        )}
      </div>

      {!tieneSolucion && (
        <p className="mt-3 text-center text-[10px] text-slate-500">
          Este archivo tiene una sola página, por eso se muestra únicamente la actividad.
        </p>
      )}
          </div>
  );
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function AdminNuevoProducto() {
  const [
    formulario,
    setFormulario,
  ] = useState({
    nombre: "",
    categoria: "",
    publico: "",
    nivel: "",

    laminas: "",
    soluciones: "",
    paginas: "",

    precioARS: "",
    ofertaActiva: false,
    precioOfertaARS: "",

    precioUSD: "",
    ofertaUSDActiva: false,
    precioOfertaUSD: "",

    etiquetaOferta:
      "Oferta lanzamiento",
    duracionOfertaDias: "3",

    ventaCruzadaId: "",
    destacado: false,

    descripcion: "",
    descripcionLarga: "",
    incluye: "",
    beneficios: "",
  });

  /*
   * PRODUCTOS EXISTENTES
   *
   * Antes se obtenían desde
   * productosDigitales.js.
   *
   * Ahora MongoDB es la única
   * fuente utilizada por este
   * formulario.
   */

  const [
    productosDisponibles,
    setProductosDisponibles,
  ] = useState([]);

  const [
    cargandoProductos,
    setCargandoProductos,
  ] = useState(true);

  const [
    errorProductos,
    setErrorProductos,
  ] = useState("");

  const [
    imagenes,
    setImagenes,
  ] = useState(
    Array(4).fill(null)
  );


  const [
    imagenesVertical,
    setImagenesVertical,
  ] = useState(
    Array(4).fill(null)
  );

  const [
  videoReel,
  setVideoReel,
] = useState(null);

  const [
    procesandoImagen,
    setProcesandoImagen,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [mostrarLogoPdf, setMostrarLogoPdf] = useState(true);

  const [imagenPortadaPdf, setImagenPortadaPdf] = useState(null);
  const [imagenFinalPdf, setImagenFinalPdf] = useState(null);
  const [archivosPdf, setArchivosPdf] = useState([]);
  const [procesandoArchivosPdf, setProcesandoArchivosPdf] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [archivoPDF, setArchivoPDF] = useState(null);
  const [mensajePdf, setMensajePdf] = useState("");
  const [posicionCobertura, setPosicionCobertura] = useState(8);
  const [progresoPdf, setProgresoPdf] = useState({
    actual: 0,
    total: 0,
    porcentaje: 0,
    fase: "",
  });

  const totalPaginasActividades = useMemo(
    () => archivosPdf.reduce((total, item) => total + (item.paginas || 0), 0),
    [archivosPdf]
  );

  const pesoTotalPdf = useMemo(
    () => archivosPdf.reduce((total, item) => total + (item.archivo?.size || 0), 0),
    [archivosPdf]
  );

  const hayArchivosPdfInvalidos = useMemo(
    () => archivosPdf.some((item) => item.estado === "error" || !item.paginas),
    [archivosPdf]
  );

  /* =======================================================
     CARGAR PRODUCTOS DESDE MONGODB
  ======================================================= */

  const cargarProductos =
    async () => {
      try {
        setErrorProductos("");

        const respuesta =
          await fetch(
            "/api/admin/pedidos?accion=listar-productos"
          );

        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ||
              "No se pudieron cargar los productos."
          );
        }

        setProductosDisponibles(
          datos.productos || []
        );
      } catch (error) {
        console.error(
          "Error cargando productos:",
          error
        );
        
        setProductosDisponibles(
          []
        );

        setErrorProductos(
          error.message ||
            "No se pudieron cargar los productos."
        );
      } finally {
        setCargandoProductos(
          false
        );
      }
    };

  useEffect(() => {
    cargarProductos();
  }, []);

  /* =======================================================
     ID DEL PRODUCTO
  ======================================================= */

  const idGenerado =
    useMemo(
      () =>
        crearId(
          formulario.nombre
        ),
      [formulario.nombre]
    );

  /*
   * Comprobación de ID duplicado
   * directamente contra los
   * productos obtenidos de MongoDB.
   */

  const idRepetido =
    Boolean(idGenerado) &&
    productosDisponibles.some(
      (producto) =>
        producto.id ===
        idGenerado
    );

  const cambiar = (
    campo,
    valor
  ) => {
    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    );
  };

  /* =======================================================
     IMÁGENES
  ======================================================= */

  const seleccionarImagen =
    async (
      indice,
      archivo
    ) => {
      if (!archivo) {
        return;
      }

      try {
        setProcesandoImagen(
          true
        );

        const resultado =
          await procesarImagen(
            archivo
          );

        setImagenes(
          (actuales) => {
            const nuevas = [
              ...actuales,
            ];

            if (
              nuevas[indice]
                ?.urlOptimizada
            ) {
              URL.revokeObjectURL(
                nuevas[indice]
                  .urlOptimizada
              );
            }

            nuevas[indice] =
              resultado;

            return nuevas;
          }
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          error.message
        );
      } finally {
        setProcesandoImagen(
          false
        );
      }
    };

  const eliminarImagen = (
    indice
  ) => {
    setImagenes(
      (actuales) => {
        const nuevas = [
          ...actuales,
        ];

        if (
          nuevas[indice]
            ?.urlOptimizada
        ) {
          URL.revokeObjectURL(
            nuevas[indice]
              .urlOptimizada
          );
        }

        nuevas[indice] =
          null;

        return nuevas;
      }
    );
  };

  const seleccionarImagenRed =
    async (
      indice,
      archivo,
      tipo
    ) => {
      if (!archivo) {
        return;
      }

      const setter =
        setImagenesVertical;

      try {
        setProcesandoImagen(true);

        const resultado =
          await procesarImagen(
            archivo,
            ANCHO_REDES
          );

        setter((actuales) => {
          const nuevas = [...actuales];

          if (
            nuevas[indice]
              ?.urlOptimizada
          ) {
            URL.revokeObjectURL(
              nuevas[indice]
                .urlOptimizada
            );
          }

          nuevas[indice] =
            resultado;

          return nuevas;
        });
      } catch (error) {
        console.error(error);
        alert(error.message);
      } finally {
        setProcesandoImagen(false);
      }
    };

  const eliminarImagenRed = (
    indice,
    tipo
  ) => {
    const setter =
      setImagenesVertical;

    setter((actuales) => {
      const nuevas = [...actuales];

      if (
        nuevas[indice]
          ?.urlOptimizada
      ) {
        URL.revokeObjectURL(
          nuevas[indice]
            .urlOptimizada
        );
      }

      nuevas[indice] = null;
      return nuevas;
    });
  };

  const subirImagen =
    async (
      imagen,
      numero
    ) => {
      const imagenBase64 =
        await archivoADataUrl(
          imagen
                      .archivoOptimizado
        );

      const respuesta =
        await fetch(
          "/api/admin/pedidos?accion=subir-imagen-producto",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                productoId:
                  idGenerado,

                numeroImagen:
                  numero,

                imagenBase64,
              }),
          }
        );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            `No se pudo subir la imagen ${numero}.`
        );
      }

      return datos.url;
    };

  /* =======================================================
     ARMADOR DE PDF
  ======================================================= */

  const agregarArchivosPdf = async (evento) => {
    const seleccionados = Array.from(evento.target.files || []);
    evento.target.value = "";
    if (!seleccionados.length) return;

    setMensajePdf("");
    setArchivoPDF(null);
    setProcesandoArchivosPdf(true);

    try {
      const nuevos = [];

      for (const archivo of seleccionados) {
        if (archivo.type !== "application/pdf" && !archivo.name.toLowerCase().endsWith(".pdf")) {
          nuevos.push({
            id: crearIdArchivo(),
            archivo,
            nombre: archivo.name,
            paginas: 0,
            estado: "error",
            error: "El archivo no es un PDF.",
          });
          continue;
        }

        try {
          const paginas = await obtenerCantidadPaginas(archivo);
          nuevos.push({
            id: crearIdArchivo(),
            archivo,
            nombre: archivo.name,
            paginas,
            estado: "listo",
            error: "",
          });
        } catch (error) {
          console.error(`No se pudo leer ${archivo.name}:`, error);
          nuevos.push({
            id: crearIdArchivo(),
            archivo,
            nombre: archivo.name,
            paginas: 0,
            estado: "error",
            error: "No se pudo leer este PDF.",
          });
        }
      }

      setArchivosPdf((actuales) => [...actuales, ...nuevos]);
    } finally {
      setProcesandoArchivosPdf(false);
    }
  };

  const moverArchivoPdf = (indice, direccion) => {
    const destino = direccion === "arriba" ? indice - 1 : indice + 1;
    setArchivosPdf((actuales) => moverElemento(actuales, indice, destino));
    setArchivoPDF(null);
  };

  const eliminarArchivoPdf = (id) => {
    setArchivosPdf((actuales) => actuales.filter((item) => item.id !== id));
    setArchivoPDF(null);
  };

  const generarPdfProducto = async () => {
    if (!imagenPortadaPdf) {
      setMensajePdf("Falta seleccionar la portada del PDF.");
      return;
    }

    if (!archivosPdf.length) {
      setMensajePdf("Seleccioná al menos un PDF de actividades o soluciones.");
      return;
    }

    if (hayArchivosPdfInvalidos) {
      setMensajePdf("Hay PDFs con errores. Eliminálos o reemplazalos.");
      return;
    }

    if (!imagenFinalPdf) {
      setMensajePdf("Falta seleccionar la lámina final.");
      return;
    }

    try {
      setMensajePdf("");
      setGenerandoPdf(true);
      setArchivoPDF(null);

      const nombreArchivo = idGenerado
        ? `${idGenerado}.pdf`
        : "Andres-Imprimibles.pdf";

      const resultado = await generarPdfLaminas({
        imagenPortada: imagenPortadaPdf,
        imagenFinal: imagenFinalPdf,
        archivosPdf: archivosPdf.map((item) => item.archivo),
        logoUrl: ESTILOS_IMPRIMIBLES.logo.url,
        mostrarLogo: mostrarLogoPdf,
        nombreArchivo,
        coberturaInferior: {
          activa: true,
          posicion: posicionCobertura,
          altura: ALTURA_COBERTURA_MM,
          ancho: ANCHO_COBERTURA_MM,
        },
        alActualizarProgreso: setProgresoPdf,
      });

      setArchivoPDF(resultado.archivoPdf);
      setMensajePdf(`PDF generado correctamente: ${resultado.paginas} páginas.`);
      cambiar("paginas", String(resultado.paginas));
    } catch (error) {
      console.error("Error generando PDF:", error);
      setMensajePdf(error?.message || "No se pudo generar el PDF.");
    } finally {
      setGenerandoPdf(false);
    }
  };

  /* =======================================================
     GENERAR TEXTOS
  ======================================================= */

  const generarTextos = () => {
    const cantidad =
      Number(
        formulario.laminas
      ) || 0;

    const soluciones =
      Number(
        formulario.soluciones
      ) || 0;

    const paginas =
      Number(
        formulario.paginas
      ) || 0;

    const actividad =
      pluralActividad(
        formulario.categoria
      );

    const categoria =
            obtenerNombreCategoria(
        formulario.categoria
      );

    const publico =
      formulario.publico ||
      "todas las edades";

    const nivel =
      formulario.nivel ||
      "variado";

    const descripcion = [
      `${cantidad} ${actividad} imprimibles`,

      `para ${publico.toLowerCase()}`,

      soluciones > 0
        ? `con ${soluciones} soluciones incluidas`
        : "",

      nivel
        ? `de nivel ${nivel.toLowerCase()}`
        : "",
    ]
      .filter(Boolean)
      .join(", ")
      .concat(".");

    const descripcionLarga =
      `Una colección de ${cantidad} ${actividad} imprimibles ` +
      `pensada para ${publico.toLowerCase()}. ` +
      `Las actividades ofrecen un nivel ${nivel.toLowerCase()} ` +
      `y están preparadas en formato PDF A4 para imprimir fácilmente ` +
      `en casa o en una imprenta.` +
      (soluciones > 0
        ? ` Incluye ${soluciones} soluciones para comprobar cada actividad.`
        : "") +
      (paginas > 0
        ? ` El archivo contiene ${paginas} páginas en total.`
        : "") +
      ` Una propuesta práctica para disfrutar de ${categoria} en formato imprimible.`;

    const incluye = [
      `${cantidad} ${actividad}`,

      soluciones > 0
        ? `${soluciones} soluciones incluidas`
        : "",

      "PDF A4 listo para imprimir",

      "Descarga digital instantánea",
    ]
      .filter(Boolean)
      .join("\n");

    const beneficiosPorCategoria =
      {
        laberintos: [
          "Concentración",
          "Seguimiento visual",
          "Reconocimiento de patrones",
          "Entretenimiento sin pantallas",
        ],

        crucigramas: [
          "Concentración",
          "Lógica",
          "Memoria",
          "Vocabulario",
        ],

        "sopa-de-letras": [
          "Concentración",
          "Memoria",
          "Vocabulario",
          "Entretenimiento y relajación",
        ],

        rompecabezas: [
          "Concentración",
          "Lógica",
          "Resolución de problemas",
          "Entretenimiento sin pantallas",
        ],

        sudoku: [
          "Concentración",
          "Lógica",
          "Razonamiento",
          "Agilidad mental",
        ],

        "palabras-desordenadas":
          [
            "Concentración",
            "Vocabulario",
            "Memoria",
            "Agilidad mental",
          ],
      };

    const beneficios =
      beneficiosPorCategoria[
        formulario.categoria
      ] || [
        "Concentración",
        "Entretenimiento",
      ];

    setFormulario(
      (actual) => ({
        ...actual,

        descripcion,

        descripcionLarga,

        incluye,

        beneficios:
          beneficios.join(
            "\n"
          ),
      })
    );
  };

  /* =======================================================
     PRODUCTO FINAL
  ======================================================= */

  const convertirLista = (
    texto
  ) =>
        texto
      .split("\n")
      .map((item) =>
        item.trim()
      )
      .filter(Boolean);

  const productoFinal = {
    id: idGenerado,

    nombre:
      formulario.nombre.trim(),

    ventaCruzadaId:
      formulario.ventaCruzadaId,

    descripcion:
      formulario.descripcion.trim(),

    descripcionLarga:
      formulario.descripcionLarga.trim(),

    tipo: "digital",

    categoria:
      formulario.categoria,

    linea: "juegos",

    precioARS:
      Number(
        formulario.precioARS
      ) || 0,

    descuento: 0,

    oferta: {
      activa:
        formulario.ofertaActiva,

      precioARS:
        formulario.ofertaActiva
          ? Number(
              formulario
                .precioOfertaARS
            ) || 0
          : 0,

      etiqueta:
        formulario.ofertaActiva
          ? formulario
              .etiquetaOferta
              .trim()
          : "",

      duracionDias:
        formulario.ofertaActiva
          ? Number(formulario.duracionOfertaDias) || 3
          : 0,
    },

    precioUSD:
      Number(
        formulario.precioUSD
      ) || 0,

    descuentoUSD: 0,

    ofertaUSD: {
      activa:
        formulario
          .ofertaUSDActiva,

      precioUSD:
        formulario
          .ofertaUSDActiva
          ? Number(
              formulario
                .precioOfertaUSD
            ) || 0
          : 0,

      etiqueta:
        formulario
          .ofertaUSDActiva
          ? formulario
              .etiquetaOferta
              .trim()
          : "",

      duracionDias:
        formulario.ofertaUSDActiva
          ? Number(formulario.duracionOfertaDias) || 3
          : 0,
    },

    ofertaLanzamiento: {
  activa:
    formulario.ofertaActiva ||
    formulario.ofertaUSDActiva,

  duracionDias:
    Number(
      formulario.duracionOfertaDias
    ) || 3,
},

    imagenes: {
      portada: "",
      preview: "",
      previewsIndividuales: [],
      redes: {
        feed: {
          presentacion: "",
          incluye: "",
          beneficios: "",
          comoFunciona: "",
        },
        vertical: {
          presentacion: "",
          incluye: "",
          beneficios: "",
          comoFunciona: "",
        },
      },
    },

    formato: "PDF",

    tamano: "A4",

    paginas:
      Number(
        formulario.paginas
      ) || 0,

    laminas:
      Number(
        formulario.laminas
      ) || 0,

    soluciones:
      Number(
        formulario.soluciones
      ) || 0,

    incluye:
      convertirLista(
        formulario.incluye
      ),

    beneficios:
      convertirLista(
        formulario.beneficios
      ),

    edadRecomendada:
      formulario.publico,

    nivel:
      formulario.nivel,

    entrega:
      "Descarga digital",

    destacado:
      formulario.destacado,
  };

    /* =======================================================
     GUARDAR PRODUCTO
  ======================================================= */

  const agregarProducto =
    async () => {
      if (
        !formulario.nombre.trim()
              ) {
        alert(
          "Falta el nombre del producto."
        );

        return;
      }

      if (
        !formulario.categoria
      ) {
        alert(
          "Falta seleccionar la categoría."
        );

        return;
      }

      if (
        !formulario.publico
      ) {
        alert(
          "Falta seleccionar el público."
        );

        return;
      }

      if (
        !formulario.nivel
      ) {
        alert(
          "Falta seleccionar el nivel."
        );

        return;
      }

      if (
        !formulario.laminas
      ) {
        alert(
          "Falta indicar la cantidad de actividades."
        );

        return;
      }

      if (idRepetido) {
        alert(
          "Ya existe un producto con este ID."
        );

        return;
      }

      if (
        !formulario.descripcion.trim()
      ) {
        alert(
          "Primero generá los textos del producto."
        );

        return;
      }

      if (
        imagenes.some(
          (imagen) =>
            !imagen
        )
      ) {
        alert(
          "Falta seleccionar alguna de las 4 imágenes comerciales."
        );

        return;
      }


      if (
        imagenesVertical.some(
          (imagen) => !imagen
        )
      ) {
        alert(
          "Falta seleccionar alguna de las 4 imágenes 9:16 para Stories y Reels."
        );
        return;
      }

      if (!archivoPDF) {
        alert(
          "Falta seleccionar el PDF del producto."
        );

        return;
      }

      try {
        setGuardando(true);

        const urls = [];

        /*
         * Las imágenes se suben
         * secuencialmente para consumir
         * menos memoria en el navegador.
         */

        for (
          let i = 0;
          i <
          imagenes.length;
          i += 1
        ) {
          const url =
            await subirImagen(
              imagenes[i],
              i + 1
            );

          urls.push(url);
        }


        const urlsVertical = [];

        for (
          let i = 0;
          i < imagenesVertical.length;
          i += 1
        ) {
          const url =
            await subirImagen(
              imagenesVertical[i],
              i + 5
            );

          urlsVertical.push(url);
        }

        /*
 * VIDEO REEL PÚBLICO
 */

let blobReel = null;

if (videoReel) {
  const pathnameReel =
    `productos/${idGenerado}/reel.mp4`;

  blobReel = await upload(
    pathnameReel,
    videoReel,
    {
      access: "public",

      handleUploadUrl:
        "/api/admin/pedidos?accion=subir-video-reel",

      clientPayload:
        JSON.stringify({
          productoId:
            idGenerado,
        }),

      multipart: true,
    }
  );
}

        /*
         * PDF PRIVADO
         */

        const pathnamePDF =
          `productos/${idGenerado}/${idGenerado}.pdf`;

        const blobPDF =
          await upload(
            pathnamePDF,
            archivoPDF,
            {
              access:
                "private",

              handleUploadUrl:
                "/api/admin/pedidos?accion=subir-pdf-producto",

              clientPayload:
                JSON.stringify({
                  productoId:
                    idGenerado,
                }),

              multipart: true,
            }
          );

        /*
         * PRODUCTO COMPLETO
         */

        const productoConImagenes =
          {
            ...productoFinal,

            imagenes: {
              portada:
                urls[0],

              preview:
                urls[1],

              previewsIndividuales:
                [
                  urls[2],
                  urls[3],
                ],

              redes: {
                feed: {
                  presentacion:
                    urls[0],
                  incluye:
                    urls[1],
                  beneficios:
                    urls[2],
                  comoFunciona:
                    urls[3],
                },

                vertical: {
                  presentacion:
                    urlsVertical[0],
                  incluye:
                    urlsVertical[1],
                  beneficios:
                    urlsVertical[2],
                  comoFunciona:
                    urlsVertical[3],
                },
              },
            },

            archivoPDF:
  blobPDF.pathname,

videoReel:
  blobReel?.url || null,
          };

        /*
         * GUARDAR EN MONGODB
         */

        const respuesta =
          await fetch(
            "/api/admin/pedidos?accion=crear-producto",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },
                            body:
                JSON.stringify(
                  productoConImagenes
                ),
            }
          );

        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ||
              "No se pudo guardar el producto."
          );
        }

        /*
         * Actualizamos también la lista
         * local proveniente de MongoDB.
         */

        await cargarProductos();

        alert(
          "Producto guardado correctamente."
        );

        console.log(
          "Producto guardado:",
          datos
        );
      } catch (error) {
        console.error(
          "Error guardando producto:",
          error
        );

        alert(
          error.message
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>

          <h1 className="text-xl font-bold text-slate-900">
            Nuevo producto
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Completá los datos básicos y el sistema preparará la ficha.
          </p>
        </div>

        {/* LOGO EN PDF */}

<label className="mb-5 flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
  <input
    type="checkbox"
    checked={mostrarLogoPdf}
    onChange={(e) =>
      setMostrarLogoPdf(e.target.checked)
    }
    className="h-4 w-4"
  />

  <div>
    <p className="text-xs font-bold text-slate-900">
      Mostrar logo en actividades y soluciones
    </p>

    <p className="mt-1 text-[10px] text-slate-500">
      Agrega el logo de Andrés Imprimibles a las páginas interiores del PDF.
    </p>
  </div>
</label>

        {/* ESTADO DE PRODUCTOS MONGODB */}

        {errorProductos && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold text-rose-700">
              {errorProductos}
            </p>

            <button
              type="button"
              onClick={
                cargarProductos
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold text-rose-700"
            >
              <RefreshCw
                size={12}
              />

              Volver a intentar
            </button>
          </div>
        )}

        {/* INFORMACIÓN */}

        <Seccion titulo="Información del producto">
          <Campo
            titulo="Nombre"
            valor={
              formulario.nombre
            }
            onChange={(v) =>
              cambiar(
                "nombre",
                v
              )
            }
          />

          {idGenerado && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                idRepetido
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-slate-500"
              }`}
            >
              ID:{" "}

              <strong>
                {idGenerado}
              </strong>

              {idRepetido &&
                " · Este producto ya existe"}
            </div>
          )}

          <Selector
            titulo="Categoría"
            valor={
              formulario.categoria
            }
            onChange={(v) =>
              cambiar(
                "categoria",
                v
              )
            }
          >
            <option value="">
              Seleccionar categoría
            </option>

            {CATEGORIAS.map(
              (
                categoria
              ) => (
                <option
                  key={
                    categoria.valor
                  }
                  value={
                    categoria.valor
                  }

                                  >
                  {
                    categoria.nombre
                  }
                </option>
              )
            )}
          </Selector>

          <Selector
            titulo="Público"
            valor={
              formulario.publico
            }
            onChange={(v) =>
              cambiar(
                "publico",
                v
              )
                          }
          >
            <option value="">
              Seleccionar público
            </option>

            {PUBLICOS.map(
              (publico) => (
                <option
                  key={
                    publico
                  }
                  value={
                    publico
                  }
                >
                  {publico}
                </option>
              )
            )}
          </Selector>

          <Selector
            titulo="Nivel"
            valor={
              formulario.nivel
            }
            onChange={(v) =>
              cambiar(
                "nivel",
                v
              )
            }
          >
            <option value="">
              Seleccionar nivel
            </option>

            {NIVELES.map(
              (nivel) => (
                <option
                  key={nivel}
                  value={nivel}
                >
                  {nivel}
                </option>
              )
            )}
          </Selector>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              titulo="Actividades"
              tipo="number"
              valor={
                formulario.laminas
              }
              onChange={(v) =>
                cambiar(
                  "laminas",
                  v
                )
              }
            />

            <Campo
              titulo="Soluciones"
              tipo="number"
              valor={
                formulario.soluciones
              }
              onChange={(v) =>
                cambiar(
                  "soluciones",
                  v
                )
              }
            />

            <div className="col-span-2">
              <Campo
                titulo="Páginas"
                tipo="number"
                valor={
                  formulario.paginas
                }
                onChange={(v) =>
                  cambiar(
                    "paginas",
                    v
                  )
                }
              />
            </div>
          </div>
        </Seccion>

        {/* PRECIOS ARGENTINA */}

        <Seccion titulo="Precio en Argentina">
          <Check
            titulo="Activar oferta en ARS"
            marcado={formulario.ofertaActiva}
            onChange={(v) => cambiar("ofertaActiva", v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              titulo="Precio normal ARS"
              tipo="number"
              valor={formulario.precioARS}
              onChange={(v) => cambiar("precioARS", v)}
            />

            {formulario.ofertaActiva ? (
              <Campo
                titulo="Precio oferta ARS"
                tipo="number"
                valor={formulario.precioOfertaARS}
                onChange={(v) => cambiar("precioOfertaARS", v)}
              />
            ) : (
              <div />
            )}
          </div>

          {formulario.ofertaActiva && (
            <Campo
              titulo="Etiqueta de oferta"
              valor={formulario.etiquetaOferta}
              onChange={(v) => cambiar("etiquetaOferta", v)}
            />
          )}
        </Seccion>

        {/* PRECIOS INTERNACIONALES */}

        <Seccion titulo="Precio internacional">
          <Check
            titulo="Activar oferta en USD"
            marcado={formulario.ofertaUSDActiva}
            onChange={(v) => cambiar("ofertaUSDActiva", v)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Campo
              titulo="Precio normal USD"
              tipo="number"
              paso="0.01"
              valor={formulario.precioUSD}
              onChange={(v) => cambiar("precioUSD", v)}
            />

            {formulario.ofertaUSDActiva ? (
              <Campo
                titulo="Precio oferta USD"
                tipo="number"
                paso="0.01"
                valor={formulario.precioOfertaUSD}
                onChange={(v) => cambiar("precioOfertaUSD", v)}
              />
            ) : (
              <div />
            )}
          </div>

          {(formulario.ofertaActiva || formulario.ofertaUSDActiva) && (
            <Selector
              titulo="Duración de la oferta de lanzamiento"
              valor={formulario.duracionOfertaDias}
              onChange={(v) => cambiar("duracionOfertaDias", v)}
            >
              {[1, 2, 3, 4, 5, 6, 7].map((dias) => (
                <option key={dias} value={dias}>
                  {dias} {dias === 1 ? "día" : "días"}
                </option>
              ))}
            </Selector>
          )}
        </Seccion>

        {/* VENTA CRUZADA */}

        <Seccion titulo="Venta cruzada">
          <Selector
            titulo="Producto recomendado"
            valor={
              formulario.ventaCruzadaId
            }
            onChange={(v) =>
              cambiar(
                "ventaCruzadaId",
                v
              )
            }
          >
            <option value="">
              {cargandoProductos
                ? "Cargando productos..."
                : "Sin venta cruzada"}
            </option>

            {productosDisponibles
              .filter(
                (producto) =>
                  producto.id !==
                  idGenerado
              )
              .map(
                (producto) => (
                  <option
                    key={
                      producto.id
                    }
                    value={
                      producto.id
                    }
                  >
                    {
                      producto.nombre
                    }
                  </option>
                )
              )}
          </Selector>

          {!cargandoProductos &&
            productosDisponibles.length ===
              0 && (
              <p className="text-[10px] leading-4 text-slate-400">
                Todavía no hay otros productos en MongoDB para utilizar como venta cruzada.
              </p>
            )}

          <Check
            titulo="Producto destacado"
            marcado={
              formulario.destacado
            }
            onChange={(v) =>
              cambiar(
                "destacado",
                v
              )
            }
          />
        </Seccion>

        {/* GENERADOR DE TEXTOS */}

        <section className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
              <RefreshCw
                size={18}
              />
            </div>

            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900">
                Generar textos
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                El sistema prepara automáticamente una base para la descripción, contenido y beneficios.
              </p>

              <button
                type="button"
                onClick={
                  generarTextos
                }
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
              >
                <RefreshCw
                  size={14}
                />

                Generar textos
              </button>
            </div>
          </div>
        </section>

        {/* CONTENIDO DE LA FICHA */}

        <Seccion titulo="Contenido de la ficha">
          <Area
            titulo="Descripción corta"
            valor={
              formulario.descripcion
            }
            onChange={(v) =>
              cambiar(
                "descripcion",
                v
              )
            }
            filas={4}
          />

          <Area
            titulo="Descripción larga"
            valor={
              formulario.descripcionLarga
            }
            onChange={(v) =>
              cambiar(
                "descripcionLarga",
                v
              )
            }
            filas={8}
          />

          <Area
            titulo="Qué incluye"
            ayuda="Un elemento por línea"
            valor={
              formulario.incluye
            }
            onChange={(v) =>
              cambiar(
                "incluye",
                v
              )
            }
            filas={6}
          />

          <Area
            titulo="Beneficios"
            ayuda="Un beneficio por línea"
            valor={
              formulario.beneficios
            }
            onChange={(v) =>
              cambiar(
                "beneficios",
                v
              )
            }
            filas={6}
          />
        </Seccion>

        {/* IMÁGENES */}

        <Seccion titulo="Imágenes del producto">
          <p className="text-xs leading-5 text-slate-500">
            Selecciona las 4 imágenes comerciales en formato 4:5 (1080 × 1350 px). Se utilizarán en la tienda, Instagram Feed, Facebook y Threads.
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {NOMBRES_IMAGENES.map(
              (
                titulo,
                indice
              ) => (
                <ImagenProducto
                  key={
                    titulo
                  }
                  titulo={
                    titulo
                  }
                  imagen={
                    imagenes[
                      indice
                    ]
                  }
                  formato="feed"
                  deshabilitado={
                    procesandoImagen ||
                    guardando
                  }
                  onSeleccionar={(
                    archivo
                  ) =>
                    seleccionarImagen(
                      indice,
                                            archivo
                    )
                  }
                  onEliminar={() =>
                    eliminarImagen(
                      indice
                    )
                  }
                />
              )
            )}
          </div>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900">
              Stories / Reels — 9:16
            </h3>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Selecciona las 4 variantes de 1080 × 1920 px. Se conservan hasta 1080 px de ancho y se convierten a WebP.
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {NOMBRES_IMAGENES_VERTICAL.map((titulo, indice) => (
                <ImagenProducto
                  key={titulo}
                  titulo={titulo}
                  imagen={imagenesVertical[indice]}
                  formato="vertical"
                  deshabilitado={procesandoImagen || guardando}
                  onSeleccionar={(archivo) =>
                    seleccionarImagenRed(indice, archivo, "vertical")
                  }
                  onEliminar={() =>
                    eliminarImagenRed(indice, "vertical")
                  }
                />
              ))}
            </div>
          </div>

          {procesandoImagen && (
            <p className="text-xs font-semibold text-sky-600">
              Optimizando imagen...
            </p>
          )}
        </Seccion>

        {/* VIDEO REEL */}
<div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
  <p className="text-xs font-bold text-slate-900">
    Video Reel
  </p>

  <p className="mt-1 text-[10px] text-slate-500">
    Video MP4 vertical 9:16, preferentemente 1080 × 1920.
  </p>

  <input
    type="file"
    accept="video/mp4"
    onChange={(e) =>
      setVideoReel(
        e.target.files?.[0] || null
      )
    }
    className="mt-3 block w-full text-xs"
  />

  {videoReel && (
    <p className="mt-2 text-[10px] text-slate-600">
      {videoReel.name} ·{" "}
      {(videoReel.size / 1024 / 1024).toFixed(2)} MB
    </p>
  )}
</div>

                  {/* ARMADOR DE PDF */}

                  <Seccion titulo="Crear PDF del producto">
                    <p className="text-xs leading-5 text-slate-500">
                      Portada + actividades y soluciones + lámina final. Estos archivos se usan solamente para generar el PDF y no se guardan individualmente en Blob.
                    </p>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectorArchivoSimple
                        titulo="1. Portada del PDF"
                                                archivo={imagenPortadaPdf}
                        accept="image/png,image/jpeg,image/webp"
                        textoVacio="Seleccionar portada"
                        deshabilitado={guardando || generandoPdf}
                        onSeleccionar={(archivo) => {
                          setImagenPortadaPdf(archivo);
                          setArchivoPDF(null);
                        }}
                        onEliminar={() => {
                          setImagenPortadaPdf(null);
                          setArchivoPDF(null);
                        }}
                      />

                      <SelectorArchivoSimple
                        titulo="3. Lámina final"
                        archivo={imagenFinalPdf}
                        accept="image/png,image/jpeg,image/webp"
                        textoVacio="Seleccionar lámina final"
                        deshabilitado={guardando || generandoPdf}
                        onSeleccionar={(archivo) => {
                          setImagenFinalPdf(archivo);
                          setArchivoPDF(null);
                        }}
                        onEliminar={() => {
                          setImagenFinalPdf(null);
                          setArchivoPDF(null);
                                        }}
            />
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700">
                  2. Actividades y soluciones
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Podés seleccionar varios PDFs y ordenar el resultado.
                </p>
              </div>

              <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-sky-600 px-3 py-2 text-[10px] font-bold text-white">
                {procesandoArchivosPdf ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {archivosPdf.length ? "Agregar" : "Seleccionar"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  disabled={procesandoArchivosPdf || generandoPdf || guardando}
                  onChange={agregarArchivosPdf}
                  className="hidden"
                />
              </label>
            </div>

            {archivosPdf.length > 0 && (
              <>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MiniDato titulo="Archivos" valor={archivosPdf.length} />
                  <MiniDato titulo="Páginas" valor={totalPaginasActividades} />
                  <MiniDato titulo="Peso" valor={formatearBytes(pesoTotalPdf)} />
                </div>

                <div className="mt-3 space-y-1">
                  {archivosPdf.map((item, indice) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 rounded-lg border p-2 ${
                        item.estado === "error" ? "border-red-200 bg-red-50" : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold">
                        {indice + 1}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] font-bold text-slate-800">{item.nombre}</p>
                        <p className="text-[9px] text-slate-400">
                          {item.estado === "error" ? item.error : `${item.paginas} pág. · ${formatearBytes(item.archivo.size)}`}
                        </p>
                      </div>

                      <button type="button" onClick={() => moverArchivoPdf(indice, "arriba")} disabled={indice === 0 || generandoPdf} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-20" aria-label="Subir">
                        <ArrowUp size={13} />
                      </button>
                      <button type="button" onClick={() => moverArchivoPdf(indice, "abajo")} disabled={indice === archivosPdf.length - 1 || generandoPdf} className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-20" aria-label="Bajar">
                        <ArrowDown size={13} />
                      </button>
                      <button type="button" onClick={() => eliminarArchivoPdf(item.id)} disabled={generandoPdf} className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-600 disabled:opacity-30" aria-label="Eliminar">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <PreviewActividadYSolucion
            item={archivosPdf[0] || null}
            posicionCobertura={posicionCobertura}
          />

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-slate-700">Cobertura inferior</p>
                <p className="text-[10px] text-slate-500">Posición de la franja blanca aplicada a las actividades y soluciones.</p>
              </div>
              <span className="text-xs font-bold text-slate-700">{posicionCobertura} mm</span>
            </div>
            <input
              type="range"
              min="0"
              max="30"
              step="1"
              value={posicionCobertura}
              disabled={generandoPdf || guardando}
              onChange={(e) => {
                setPosicionCobertura(Number(e.target.value));
                setArchivoPDF(null);
              }}
              className="mt-3 w-full"
            />
          </div>

          <button
            type="button"
            onClick={generarPdfProducto}
            disabled={generandoPdf || guardando || procesandoArchivosPdf}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-40"
          >
            {generandoPdf ? <Loader2 size={17} className="animate-spin" /> : <FilePlus2 size={17} />}
            {generandoPdf ? `Generando... ${progresoPdf.porcentaje || 0}%` : "Generar PDF"}
          </button>

          {mensajePdf && (
            <div className={`rounded-lg px-3 py-2 text-xs font-semibold ${archivoPDF ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {mensajePdf}
            </div>
          )}

          {archivoPDF && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="text-xs font-bold text-emerald-700">PDF listo para publicar</p>
              <p className="mt-1 text-[10px] text-emerald-600">
                {archivoPDF.name} · {formatearBytes(archivoPDF.size)}
              </p>
            </div>
          )}
        </Seccion>

        {/* RESULTADO */}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Ficha generada
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Esta será la información del producto.
          </p>

          <pre className="mt-4 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-[10px] text-slate-100">
            {JSON.stringify(
              productoFinal,
              null,
              2
            )}
          </pre>

          <button
            type="button"
            onClick={
              agregarProducto
            }
            disabled={
              idRepetido ||
              procesandoImagen ||
              generandoPdf ||
              guardando ||
              cargandoProductos
            }
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando
              ? "Subiendo archivos y guardando..."
              : cargandoProductos
                ? "Cargando productos..."
                : "Agregar producto"}
          </button>
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTES DEL FORMULARIO
========================================================= */

function ImagenProducto({
  titulo,
  imagen,
  formato = "cuadrado",
  deshabilitado,
  onSeleccionar,
  onEliminar,
}) {
  const claseFormato =
    formato === "feed"
      ? "aspect-[4/5]"
      : formato === "vertical"
        ? "aspect-[9/16]"
        : "aspect-square";

  const anchoPreview =
    formato === "vertical"
      ? "max-w-[82px]"
      : formato === "feed"
        ? "max-w-[104px]"
        : "max-w-[112px]";

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <p className="truncate text-[11px] font-bold text-slate-700">
        {titulo}
      </p>

      {!imagen ? (
        <label className="mt-2 flex min-h-[76px] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-2 py-2 text-center">
          <Upload size={17} className="shrink-0 text-sky-600" />
          <div className="min-w-0">
            <span className="block text-[10px] font-semibold text-slate-600">
              Seleccionar
            </span>
            <span className="block text-[9px] text-slate-400">
              JPG, PNG o WebP
            </span>
          </div>

          <input
            type="file"
            accept="image/*"
            disabled={deshabilitado}
            className="hidden"
            onChange={(e) => {
              const archivo = e.target.files?.[0];
              if (archivo) onSeleccionar(archivo);
              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="mt-2 flex items-center gap-3">
          <div className={`w-full shrink-0 ${anchoPreview}`}>
            <div className={`overflow-hidden rounded-md border border-slate-200 bg-white ${claseFormato}`}>
              <img
                src={imagen.urlOptimizada}
                alt={titulo}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold text-emerald-600">
              Optimizada
            </p>
            <p className="mt-0.5 text-[9px] text-slate-400">
              {(imagen.pesoOptimizado / 1024).toFixed(0)} KB
            </p>
            <button
              type="button"
              disabled={deshabilitado}
              onClick={onEliminar}
              className="mt-1 rounded-md p-1.5 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
              aria-label={`Eliminar ${titulo}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SECCIÓN
========================================================= */

function SelectorArchivoSimple({
  titulo,
  archivo,
  accept,
  textoVacio,
  deshabilitado,
  onSeleccionar,
  onEliminar,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-700">{titulo}</p>
      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-5 text-center">
        <Upload size={18} className="text-sky-600" />
        <span className="min-w-0 truncate text-[10px] font-semibold text-slate-700">
          {archivo ? archivo.name : textoVacio}
        </span>
        <input
          type="file"
          accept={accept}
          disabled={deshabilitado}
          className="hidden"
          onChange={(e) => onSeleccionar(e.target.files?.[0] || null)}
        />
      </label>
      {archivo && (
        <button type="button" disabled={deshabilitado} onClick={onEliminar} className="mt-2 flex items-center gap-1 text-[10px] font-bold text-red-600 disabled:opacity-40">
          <Trash2 size={12} /> Eliminar
        </button>
      )}
    </div>
  );
}

function MiniDato({ titulo, valor }) {
  return (
    <div className="rounded-lg bg-white p-2">
      <div className="text-[8px] font-bold uppercase text-slate-400">{titulo}</div>
      <div className="truncate text-xs font-bold text-slate-800">{valor}</div>
    </div>
  );
}

function Seccion({
  titulo,
  children,
}) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FilePlus2
          size={16}
          className="text-sky-600"
        />

        <h2 className="text-sm font-bold text-slate-900">
          {titulo}
        </h2>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   CAMPO
========================================================= */

function Campo({
  titulo,
  valor,
  onChange,
  tipo = "text",
  paso,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {titulo}
      </span>

      <input
        type={tipo}
        step={paso}
        value={valor}
        placeholder={
          placeholder
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

/* =========================================================
   SELECTOR
========================================================= */

function Selector({
  titulo,
  valor,
  onChange,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {titulo}
      </span>

      <select
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        {children}
      </select>
    </label>
  );
}

/* =========================================================
   ÁREA DE TEXTO
========================================================= */

function Area({
  titulo,
  valor,
  onChange,
  filas = 5,
  ayuda = "",
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-700">
          {titulo}
        </span>

        {ayuda && (
          <span className="text-[10px] text-slate-400">
            {ayuda}
          </span>
        )}
      </div>

      <textarea
        rows={filas}
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

/* =========================================================
   CHECKBOX
========================================================= */

function Check({
  titulo,
  marcado,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />

      <span className="text-xs font-semibold text-slate-700">
        {titulo}
      </span>
    </label>
  );
}