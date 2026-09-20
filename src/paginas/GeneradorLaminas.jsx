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
  FileText,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";

import { PDFDocument } from "pdf-lib";

import { generarPdfLaminas } from "../utilidades/generarPdfLaminas";

import { ESTILOS_IMPRIMIBLES } from "../generador/config/estilosImprimibles";
import { LABERINTOS_50 } from "../generador/productos/laberintos50";

/* =========================================================
   UTILIDADES
========================================================= */

function crearIdArchivo() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatearBytes(bytes = 0) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function obtenerCantidadPaginas(archivo) {
  const bytes = await archivo.arrayBuffer();

  const pdf = await PDFDocument.load(bytes, {
    ignoreEncryption: false,
  });

  return pdf.getPageCount();
}

function moverElemento(lista, desde, hasta) {
  if (
    desde < 0 ||
    hasta < 0 ||
    desde >= lista.length ||
    hasta >= lista.length ||
    desde === hasta
  ) {
    return lista;
  }

  const copia = [...lista];
  const [elemento] = copia.splice(desde, 1);

  copia.splice(hasta, 0, elemento);

  return copia;
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function GeneradorLaminas() {
  const inputArchivosRef = useRef(null);

  const [imagenPortada, setImagenPortada] = useState(
    LABERINTOS_50.recursos.portada || ""
  );

  const [imagenFinal, setImagenFinal] = useState(
    LABERINTOS_50.recursos.laminaFinal || ""
  );

  const [archivosPdf, setArchivosPdf] = useState([]);

  const [procesandoArchivos, setProcesandoArchivos] =
    useState(false);

  const [exportandoPdf, setExportandoPdf] =
    useState(false);

  const [progresoPdf, setProgresoPdf] = useState({
    actual: 0,
    total: 0,
    porcentaje: 0,
    fase: "",
  });

  const [mensajeError, setMensajeError] =
    useState("");

  const [archivoPreviewId, setArchivoPreviewId] =
    useState(null);

  const archivoPreview = useMemo(
    () =>
      archivosPdf.find(
        (item) => item.id === archivoPreviewId
      ) || null,
    [archivosPdf, archivoPreviewId]
  );

  const [urlPreviewPdf, setUrlPreviewPdf] =
    useState("");

  const [cubrirTextoInferior, setCubrirTextoInferior] = useState(true);
const [posicionCobertura, setPosicionCobertura] = useState(18);
const [alturaCobertura, setAlturaCobertura] = useState(22);
const [anchoCobertura, setAnchoCobertura] = useState(220);

  useEffect(() => {
    if (!archivoPreview?.archivo) {
      setUrlPreviewPdf("");
      return undefined;
    }

    const url = URL.createObjectURL(
      archivoPreview.archivo
    );

    setUrlPreviewPdf(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [archivoPreview]);

  const totalPaginasActividades = useMemo(
    () =>
      archivosPdf.reduce(
        (total, item) =>
          total + (item.paginas || 0),
        0
      ),
    [archivosPdf]
  );

  const totalPaginasFinal = useMemo(() => {
    return (
      totalPaginasActividades +
      (imagenPortada.trim() ? 1 : 0) +
      (imagenFinal.trim() ? 1 : 0)
    );
  }, [
    totalPaginasActividades,
    imagenPortada,
    imagenFinal,
  ]);

  const pesoTotal = useMemo(
    () =>
      archivosPdf.reduce(
        (total, item) =>
          total + (item.archivo?.size || 0),
        0
      ),
    [archivosPdf]
  );

  const hayArchivosInvalidos = useMemo(
    () =>
      archivosPdf.some(
        (item) =>
          item.estado === "error" ||
          !item.paginas
      ),
    [archivosPdf]
  );

  /* =======================================================
     AGREGAR PDFs
  ======================================================= */

  async function agregarArchivos(evento) {
    const seleccionados = Array.from(
      evento.target.files || []
    );

    evento.target.value = "";

    if (seleccionados.length === 0) {
      return;
    }

    setMensajeError("");
    setProcesandoArchivos(true);

    try {
      const nuevos = [];

      for (const archivo of seleccionados) {
        if (
          archivo.type !== "application/pdf" &&
          !archivo.name.toLowerCase().endsWith(".pdf")
        ) {
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
          const paginas =
            await obtenerCantidadPaginas(archivo);

          nuevos.push({
            id: crearIdArchivo(),
            archivo,
            nombre: archivo.name,
            paginas,
            estado: "listo",
            error: "",
          });
        } catch (error) {
          console.error(
            `No se pudo leer ${archivo.name}:`,
            error
          );

          nuevos.push({
            id: crearIdArchivo(),
            archivo,
            nombre: archivo.name,
            paginas: 0,
            estado: "error",
            error:
              "No se pudo leer este PDF. Puede estar dañado o protegido.",
          });
        }
      }

      setArchivosPdf((actuales) => [
        ...actuales,
        ...nuevos,
      ]);
    } finally {
      setProcesandoArchivos(false);
    }
  }

  /* =======================================================
     ORDEN
  ======================================================= */

  function moverArchivo(indice, direccion) {
    const destino =
      direccion === "arriba"
        ? indice - 1
        : indice + 1;

    setArchivosPdf((actuales) =>
      moverElemento(
        actuales,
        indice,
        destino
      )
    );
  }

  function eliminarArchivo(id) {
    setArchivosPdf((actuales) =>
      actuales.filter(
        (item) => item.id !== id
      )
    );

    if (archivoPreviewId === id) {
      setArchivoPreviewId(null);
    }
  }

  function eliminarTodos() {
    setArchivosPdf([]);
    setArchivoPreviewId(null);
    setMensajeError("");
  }

  /* =======================================================
     GENERAR PDF
  ======================================================= */

  async function descargarPdfCompleto() {
    if (exportandoPdf) {
      return;
    }

    if (archivosPdf.length === 0) {
      setMensajeError(
        "Selecciona al menos un PDF de actividades."
      );
      return;
    }

    if (hayArchivosInvalidos) {
      setMensajeError(
        "Hay archivos con errores. Elimínalos o reemplázalos antes de generar el PDF."
      );
      return;
    }

    setMensajeError("");
    setExportandoPdf(true);

    setProgresoPdf({
      actual: 0,
      total: totalPaginasFinal,
      porcentaje: 0,
      fase: "preparando",
    });

    try {
      await generarPdfLaminas({
        imagenPortada:
          imagenPortada.trim(),

        imagenFinal:
          imagenFinal.trim(),

        archivosPdf:
          archivosPdf.map(
            (item) => item.archivo
          ),

        logoUrl:
          ESTILOS_IMPRIMIBLES.logo.url,

        nombreArchivo:
          "Andres-Imprimibles.pdf",

        coberturaInferior: {
  activa: cubrirTextoInferior,
  posicion: posicionCobertura,
  altura: alturaCobertura,
  ancho: anchoCobertura,
},

        alActualizarProgreso:
          (progreso) => {
            setProgresoPdf(
              progreso
            );
          },
      });
    } catch (error) {
      console.error(
        "Error generando el PDF:",
        error
      );

      setMensajeError(
        error?.message ||
          "No se pudo generar el PDF."
      );
    } finally {
      setExportandoPdf(false);
    }
  }

  /* =======================================================
     INTERFAZ
  ======================================================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 md:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-600">
            Andrés Imprimibles
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
            Armador de productos PDF
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
            Agrega la portada, selecciona todos los PDFs de
            actividades y soluciones, ordénalos y genera el
            producto final.
          </p>
        </div>

        {/* =================================================
            PORTADA
        ================================================= */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <ImageIcon size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                1. Portada
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Pega la URL de la imagen que irá como primera
                página del PDF.
              </p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              URL de portada
            </span>

            <input
              type="url"
              value={imagenPortada}
              onChange={(evento) =>
                setImagenPortada(
                  evento.target.value
                )
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          {imagenPortada.trim() && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={imagenPortada}
                alt="Vista previa de portada"
                className="mx-auto max-h-[420px] w-auto object-contain"
              />
            </div>
          )}
        </section>

        {/* =================================================
            ACTIVIDADES
        ================================================= */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <FileText size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                2. Actividades y soluciones
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Selecciona varios PDFs a la vez. Cada archivo
                conservará todas sus páginas y el orden que
                definas aquí.
              </p>
            </div>
          </div>

          <input
            ref={inputArchivosRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={agregarArchivos}
            className="hidden"
          />

          <button
            type="button"
            onClick={() =>
              inputArchivosRef.current?.click()
            }
            disabled={procesandoArchivos}
            className="mt-5 flex min-h-[116px] w-full items-center justify-center rounded-2xl border-2 border-dashed border-sky-300 bg-sky-50 px-5 py-6 text-center transition active:scale-[0.99] disabled:opacity-60"
          >
            <div>
              {procesandoArchivos ? (
                <Loader2
                  className="mx-auto animate-spin text-sky-600"
                  size={30}
                />
              ) : (
                <Upload
                  className="mx-auto text-sky-600"
                  size={30}
                />
              )}

              <div className="mt-3 text-base font-bold text-slate-900">
                {procesandoArchivos
                  ? "Leyendo PDFs..."
                  : archivosPdf.length > 0
                    ? "Agregar más PDFs"
                    : "Seleccionar PDFs"}
              </div>

              <div className="mt-1 text-sm text-slate-500">
                Puedes seleccionar varios archivos de una sola
                vez.
              </div>
            </div>
          </button>

          {archivosPdf.length > 0 && (
            <>
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Archivos
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {archivosPdf.length}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Páginas
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {totalPaginasActividades}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Peso
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {formatearBytes(
                      pesoTotal
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-slate-50 p-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    PDF final
                  </div>
                  <div className="mt-1 text-xl font-bold text-slate-900">
                    {totalPaginasFinal}
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="text-sm font-bold text-slate-900">
                  Orden de los archivos
                </h3>

                <button
                  type="button"
                  onClick={eliminarTodos}
                  className="text-sm font-semibold text-red-600"
                >
                  Eliminar todos
                </button>
              </div>

              <div className="mt-3 space-y-3">
                {archivosPdf.map(
                  (item, indice) => (
                    <div
                      key={item.id}
                      className={`rounded-2xl border p-4 ${
                        item.estado ===
                        "error"
                          ? "border-red-200 bg-red-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-bold text-slate-700">
                          {indice + 1}
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setArchivoPreviewId(
                              item.id
                            )
                          }
                          className="min-w-0 flex-1 text-left"
                          disabled={
                            item.estado ===
                            "error"
                          }
                        >
                          <div className="truncate text-sm font-bold text-slate-900">
                            {item.nombre}
                          </div>

                          {item.estado ===
                          "error" ? (
                            <div className="mt-1 text-xs font-medium text-red-600">
                              {item.error}
                            </div>
                          ) : (
                            <div className="mt-1 text-xs text-slate-500">
                              {item.paginas}{" "}
                              {item.paginas === 1
                                ? "página"
                                : "páginas"}{" "}
                              ·{" "}
                              {formatearBytes(
                                item
                                  .archivo
                                  .size
                              )}
                            </div>
                          )}
                        </button>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            moverArchivo(
                              indice,
                              "arriba"
                            )
                          }
                          disabled={
                            indice === 0
                          }
                          className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-30"
                          aria-label="Mover hacia arriba"
                        >
                          <ArrowUp
                            size={18}
                          />
                          Subir
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            moverArchivo(
                              indice,
                              "abajo"
                            )
                          }
                          disabled={
                            indice ===
                            archivosPdf.length -
                              1
                          }
                          className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 disabled:opacity-30"
                          aria-label="Mover hacia abajo"
                        >
                          <ArrowDown
                            size={18}
                          />
                          Bajar
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            eliminarArchivo(
                              item.id
                            )
                          }
                          className="flex min-h-11 items-center justify-center gap-1 rounded-xl border border-red-200 bg-red-50 text-sm font-semibold text-red-600"
                        >
                          <Trash2
                            size={17}
                          />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  inputArchivosRef.current?.click()
                }
                disabled={
                  procesandoArchivos
                }
                className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 text-sm font-bold text-sky-700 disabled:opacity-60"
              >
                <Plus size={19} />
                Agregar más PDFs
              </button>
            </>
          )}
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
  <div className="flex items-center justify-between gap-4">
    <div>
      <h2 className="text-lg font-bold text-slate-900">
        Cubrir texto inferior
      </h2>

      <p className="mt-1 text-sm text-slate-500">
        Ajusta la zona inferior que se cubrirá en todas las páginas importadas.
      </p>
    </div>

    <input
      type="checkbox"
      checked={cubrirTextoInferior}
      onChange={(evento) =>
        setCubrirTextoInferior(evento.target.checked)
      }
      className="h-5 w-5"
    />
  </div>

  {cubrirTextoInferior && (
    <div className="mt-5 space-y-5">
      <label className="block">
        <div className="mb-2 flex justify-between text-sm">
          <span>Posición desde abajo</span>
          <strong>{posicionCobertura} mm</strong>
        </div>

        <input
          type="range"
          min="0"
          max="80"
          step="1"
          value={posicionCobertura}
          onChange={(evento) =>
            setPosicionCobertura(Number(evento.target.value))
          }
          className="w-full"
        />
      </label>

      <label className="block">
        <div className="mb-2 flex justify-between text-sm">
          <span>Altura</span>
          <strong>{alturaCobertura} mm</strong>
        </div>

        <input
          type="range"
          min="5"
          max="60"
          step="1"
          value={alturaCobertura}
          onChange={(evento) =>
            setAlturaCobertura(Number(evento.target.value))
          }
          className="w-full"
        />
      </label>

      <label className="block">
        <div className="mb-2 flex justify-between text-sm">
          <span>Ancho</span>
          <strong>{anchoCobertura} mm</strong>
        </div>

        <input
          type="range"
          min="50"
          max="500"
          step="5"
          value={anchoCobertura}
          onChange={(evento) =>
            setAnchoCobertura(Number(evento.target.value))
          }
          className="w-full"
        />
      </label>
    </div>
  )}
</section>

        {/* =================================================
            PREVIEW PDF INDIVIDUAL
        ================================================= */}

        {archivoPreview &&
          urlPreviewPdf && (
            <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold text-slate-900">
                    Vista previa
                  </h2>

                  <p className="mt-1 truncate text-sm text-slate-500">
                    {
                      archivoPreview.nombre
                    }
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setArchivoPreviewId(
                      null
                    )
                  }
                  className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600"
                >
                  Cerrar
                </button>
              </div>

              <iframe
                src={urlPreviewPdf}
                title={`Vista previa ${archivoPreview.nombre}`}
                className="mt-4 h-[520px] w-full rounded-xl border border-slate-200 bg-slate-100"
              />
            </section>
          )}

        {/* =================================================
            LÁMINA FINAL
        ================================================= */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <ImageIcon size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                3. Lámina final
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Pega la URL de la imagen que irá como última
                página del producto.
              </p>
            </div>
          </div>

          <label className="mt-5 block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              URL de lámina final
            </span>

            <input
              type="url"
              value={imagenFinal}
              onChange={(evento) =>
                setImagenFinal(
                  evento.target.value
                )
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          {imagenFinal.trim() && (
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img
                src={imagenFinal}
                alt="Vista previa de lámina final"
                className="mx-auto max-h-[420px] w-auto object-contain"
              />
            </div>
          )}
        </section>

        {/* =================================================
            RESUMEN Y EXPORTACIÓN
        ================================================= */}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <FilePlus2 size={21} />
            </div>

            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Generar producto final
              </h2>

              <p className="mt-1 text-sm leading-5 text-slate-500">
                Los PDFs se unirán exactamente en el orden
                mostrado arriba.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl bg-slate-50 p-4">
            <div className="flex justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Portada
              </span>
              <span className="font-semibold text-slate-900">
                {imagenPortada.trim()
                  ? "Sí"
                  : "No"}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4 text-sm">
              <span className="text-slate-500">
                PDFs agregados
              </span>
              <span className="font-semibold text-slate-900">
                {archivosPdf.length}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Páginas de actividades
              </span>
              <span className="font-semibold text-slate-900">
                {totalPaginasActividades}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4 text-sm">
              <span className="text-slate-500">
                Lámina final
              </span>
              <span className="font-semibold text-slate-900">
                {imagenFinal.trim()
                  ? "Sí"
                  : "No"}
              </span>
            </div>

            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="flex justify-between gap-4">
                <span className="text-sm font-bold text-slate-700">
                  Total estimado
                </span>

                <span className="text-lg font-bold text-slate-900">
                  {totalPaginasFinal} páginas
                </span>
              </div>
            </div>
          </div>

          {mensajeError && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium leading-5 text-red-700">
              {mensajeError}
            </div>
          )}

          {exportandoPdf && (
            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-semibold text-slate-700">
                  Generando PDF...
                </span>

                <span className="font-bold text-slate-900">
                  {progresoPdf.porcentaje ||
                    0}
                  %
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-sky-600 transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(
                        100,
                        progresoPdf.porcentaje ||
                          0
                      )
                    )}%`,
                  }}
                />
              </div>

              {progresoPdf.total > 0 && (
                <div className="mt-2 text-xs text-slate-500">
                  {progresoPdf.actual} de{" "}
                  {progresoPdf.total} páginas
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={descargarPdfCompleto}
            disabled={
              exportandoPdf ||
              procesandoArchivos ||
              archivosPdf.length ===
                0 ||
              hayArchivosInvalidos
            }
            className="mt-5 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 text-base font-bold text-white transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportandoPdf ? (
              <>
                <Loader2
                  className="animate-spin"
                  size={21}
                />
                Generando PDF...
              </>
            ) : (
              <>
                <FilePlus2
                  size={21}
                />
                Generar PDF final
              </>
            )}
          </button>
        </section>
      </div>
    </main>
  );
}