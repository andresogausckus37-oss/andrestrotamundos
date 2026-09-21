import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FilePlus2,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { PDFDocument } from "pdf-lib";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

import { generarPdfLaminas } from "../utilidades/generarPdfLaminas";
import { ESTILOS_IMPRIMIBLES } from "../generador/config/estilosImprimibles";
import { LABERINTOS_50 } from "../generador/productos/laberintos50";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

const ALTURA_COBERTURA_MM = 12;
const ANCHO_COBERTURA_MM = 210;

function crearIdArchivo() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function formatearBytes(bytes = 0) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function obtenerCantidadPaginas(archivo) {
  const bytes = await archivo.arrayBuffer();
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: false });
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

function PreviewPaginaPdf({
  archivo,
  numeroPagina,
  titulo,
  posicionCobertura,
}) {
  const canvasRef = useRef(null);
  const [estado, setEstado] = useState("cargando");
  const [proporcion, setProporcion] = useState(297 / 210);

  useEffect(() => {
    let cancelado = false;
    let tareaCarga = null;
    let tareaRender = null;

    async function renderizar() {
      if (!archivo || !canvasRef.current) return;

      setEstado("cargando");

      try {
        const bytes = new Uint8Array(await archivo.arrayBuffer());

        tareaCarga = pdfjsLib.getDocument({
          data: bytes,
          disableAutoFetch: true,
          disableStream: true,
        });

        const pdf = await tareaCarga.promise;

        if (numeroPagina > pdf.numPages) {
          if (!cancelado) setEstado("sin-pagina");
          return;
        }

        const pagina = await pdf.getPage(numeroPagina);
        const viewportBase = pagina.getViewport({ scale: 1 });

        if (!cancelado) {
          setProporcion(viewportBase.height / viewportBase.width);
        }

        const anchoObjetivo = 500;
        const escala = anchoObjetivo / viewportBase.width;
        const viewport = pagina.getViewport({ scale: escala });

        const canvas = canvasRef.current;
        if (!canvas || cancelado) return;

        const contexto = canvas.getContext("2d", { alpha: false });

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);

        tareaRender = pagina.render({
          canvasContext: contexto,
          viewport,
          background: "rgb(255,255,255)",
        });

        await tareaRender.promise;

        if (!cancelado) setEstado("listo");
      } catch (error) {
        if (
          error?.name !== "RenderingCancelledException" &&
          !cancelado
        ) {
          console.error("Error mostrando preview PDF:", error);
          setEstado("error");
        }
      }
    }

    renderizar();

    return () => {
      cancelado = true;

      try {
        tareaRender?.cancel();
      } catch {
        // Sin acción.
      }

      try {
        tareaCarga?.destroy();
      } catch {
        // Sin acción.
      }
    };
  }, [archivo, numeroPagina]);

  const altoPaginaMm = 210 * proporcion;

  const alturaPorcentaje = Math.min(
    100,
    (ALTURA_COBERTURA_MM / altoPaginaMm) * 100
  );

  const desdeAbajoPorcentaje = Math.min(
    100 - alturaPorcentaje,
    (posicionCobertura / altoPaginaMm) * 100
  );

  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-center text-[10px] font-bold text-slate-600">
        {titulo}
      </div>

      <div
        className="relative mx-auto w-full max-w-[240px] overflow-hidden rounded border border-slate-200 bg-white"
        style={{ aspectRatio: `1 / ${proporcion}` }}
      >
        <canvas
          ref={canvasRef}
          className={`h-full w-full object-contain ${
            estado === "listo" ? "opacity-100" : "opacity-0"
          }`}
        />

        {estado === "cargando" && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-400">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {estado === "sin-pagina" && (
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-[10px] text-slate-500">
            Este PDF no tiene página {numeroPagina}.
          </div>
        )}

        {estado === "error" && (
          <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-[10px] text-red-600">
            No se pudo mostrar esta página.
          </div>
        )}

        {estado === "listo" && (
          <div
            className="pointer-events-none absolute left-0 right-0 border-y border-slate-300 bg-white"
            style={{
              height: `${alturaPorcentaje}%`,
              bottom: `${desdeAbajoPorcentaje}%`,
            }}
          />
        )}
      </div>
    </div>
  );
}

function ModalImagen({ url, titulo, onCerrar }) {
  if (!url) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-3"
      onClick={onCerrar}
    >
      <div
        className="relative max-h-[94vh] max-w-3xl overflow-auto rounded-lg bg-white p-2"
        onClick={(evento) => evento.stopPropagation()}
      >
        <button
          type="button"
          onClick={onCerrar}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
          aria-label="Cerrar"
        >
          <X size={18} />
        </button>

        <img
          src={url}
          alt={titulo}
          className="max-h-[90vh] w-auto max-w-full object-contain"
        />
      </div>
    </div>
  );
}

export default function GeneradorLaminas() {
  const inputArchivosRef = useRef(null);

  const [imagenPortada, setImagenPortada] = useState(
    LABERINTOS_50.recursos.portada || ""
  );
  const [imagenFinal, setImagenFinal] = useState(
    LABERINTOS_50.recursos.laminaFinal || ""
  );
  const [archivosPdf, setArchivosPdf] = useState([]);
  const [procesandoArchivos, setProcesandoArchivos] = useState(false);
  const [exportandoPdf, setExportandoPdf] = useState(false);
  const [mensajeError, setMensajeError] = useState("");
  const [posicionCobertura, setPosicionCobertura] = useState(8);
  const [modalImagen, setModalImagen] = useState(null);

  const [progresoPdf, setProgresoPdf] = useState({
    actual: 0,
    total: 0,
    porcentaje: 0,
    fase: "",
  });

  const primerPdfValido = useMemo(
    () => archivosPdf.find((item) => item.estado === "listo") || null,
    [archivosPdf]
  );

  const totalPaginasActividades = useMemo(
    () =>
      archivosPdf.reduce(
        (total, item) => total + (item.paginas || 0),
        0
      ),
    [archivosPdf]
  );

  const totalPaginasFinal = useMemo(
    () =>
      totalPaginasActividades +
      (imagenPortada.trim() ? 1 : 0) +
      (imagenFinal.trim() ? 1 : 0),
    [totalPaginasActividades, imagenPortada, imagenFinal]
  );

  const pesoTotal = useMemo(
    () =>
      archivosPdf.reduce(
        (total, item) => total + (item.archivo?.size || 0),
        0
      ),
    [archivosPdf]
  );

  const hayArchivosInvalidos = useMemo(
    () =>
      archivosPdf.some(
        (item) => item.estado === "error" || !item.paginas
      ),
    [archivosPdf]
  );

  async function agregarArchivos(evento) {
    const seleccionados = Array.from(evento.target.files || []);
    evento.target.value = "";

    if (seleccionados.length === 0) return;

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
      setProcesandoArchivos(false);
    }
  }

  function moverArchivo(indice, direccion) {
    const destino = direccion === "arriba" ? indice - 1 : indice + 1;

    setArchivosPdf((actuales) =>
      moverElemento(actuales, indice, destino)
    );
  }

  function eliminarArchivo(id) {
    setArchivosPdf((actuales) =>
      actuales.filter((item) => item.id !== id)
    );
  }

  function eliminarTodos() {
    setArchivosPdf([]);
    setMensajeError("");
  }

  async function descargarPdfCompleto() {
    if (exportandoPdf) return;

    if (archivosPdf.length === 0) {
      setMensajeError("Selecciona al menos un PDF.");
      return;
    }

    if (hayArchivosInvalidos) {
      setMensajeError(
        "Hay archivos con errores. Elimínalos o reemplázalos."
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
        imagenPortada: imagenPortada.trim(),
        imagenFinal: imagenFinal.trim(),
        archivosPdf: archivosPdf.map((item) => item.archivo),
        logoUrl: ESTILOS_IMPRIMIBLES.logo.url,
        nombreArchivo: "Andres-Imprimibles.pdf",
        coberturaInferior: {
          activa: true,
          posicion: posicionCobertura,
          altura: ALTURA_COBERTURA_MM,
          ancho: ANCHO_COBERTURA_MM,
        },
        alActualizarProgreso: setProgresoPdf,
      });
    } catch (error) {
      console.error("Error generando el PDF:", error);
      setMensajeError(error?.message || "No se pudo generar el PDF.");
    } finally {
      setExportandoPdf(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-2 py-3 md:px-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-3">
          <h1 className="text-lg font-bold text-slate-900">
            Armador de PDF
          </h1>
          <p className="mt-0.5 text-[11px] text-slate-500">
            Portada + actividades y soluciones + lámina final.
          </p>
        </div>

        {/* PORTADA */}
        <section className="mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-[1fr_64px] items-end gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-slate-700">
                1. Portada
              </span>
              <input
                type="url"
                value={imagenPortada}
                onChange={(evento) => setImagenPortada(evento.target.value)}
                placeholder="URL de portada"
                className="h-8 w-full rounded-lg border border-slate-300 px-2 text-[11px] outline-none focus:border-sky-500"
              />
            </label>

            {imagenPortada.trim() && (
              <button
                type="button"
                onClick={() =>
                  setModalImagen({

                                        url: imagenPortada,
                    titulo: "Portada",
                  })
                }
                className="h-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                aria-label="Ampliar portada"
              >
                <img
                  src={imagenPortada}
                  alt="Vista previa de portada"
                  className="h-full w-full object-cover"
                />
              </button>
            )}
          </div>
        </section>

        {/* PDFs */}
        <section className="mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900">
                2. PDFs
              </h2>
              <p className="text-[10px] text-slate-500">
                Selección múltiple. Cada PDF conserva todas sus páginas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => inputArchivosRef.current?.click()}
              disabled={procesandoArchivos}
              className="flex h-8 shrink-0 items-center gap-1 rounded-lg bg-sky-600 px-2.5 text-[10px] font-bold text-white disabled:opacity-50"
            >
              {procesandoArchivos ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {archivosPdf.length ? "Agregar" : "Seleccionar"}
            </button>
          </div>

          <input
            ref={inputArchivosRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            onChange={agregarArchivos}
            className="hidden"
          />

          {archivosPdf.length > 0 && (
            <>
              <div className="mb-2 grid grid-cols-4 gap-1">
                <div className="rounded-lg bg-slate-50 p-1.5">
                  <div className="text-[8px] font-bold uppercase text-slate-400">
                    Archivos
                  </div>
                  <div className="text-xs font-bold">{archivosPdf.length}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5">
                  <div className="text-[8px] font-bold uppercase text-slate-400">
                    Páginas
                  </div>
                  <div className="text-xs font-bold">{totalPaginasActividades}</div>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5">
                  <div className="text-[8px] font-bold uppercase text-slate-400">
                    Peso
                  </div>
                  <div className="truncate text-xs font-bold">
                    {formatearBytes(pesoTotal)}
                  </div>
                </div>
                <div className="rounded-lg bg-slate-50 p-1.5">
                  <div className="text-[8px] font-bold uppercase text-slate-400">
                    Final
                  </div>
                  <div className="text-xs font-bold">{totalPaginasFinal}</div>
                </div>
              </div>

              <div className="mb-1 flex justify-between">
                <span className="text-[10px] font-bold text-slate-600">
                  Orden
                </span>
                <button
                  type="button"
                  onClick={eliminarTodos}
                  className="text-[10px] font-bold text-red-600"
                >
                  Eliminar todos
                </button>
              </div>

              <div className="space-y-1">
                {archivosPdf.map((item, indice) => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-1.5 rounded-lg border p-1.5 ${
                      item.estado === "error"
                        ? "border-red-200 bg-red-50"
                        : "border-slate-200"
                    }`}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[10px] font-bold">
                      {indice + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[10px] font-bold text-slate-800">
                        {item.nombre}
                      </div>
                      <div className="text-[9px] text-slate-400">
                        {item.estado === "error"
                          ? item.error
                          : `${item.paginas} pág. · ${formatearBytes(
                              item.archivo.size
                            )}`}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => moverArchivo(indice, "arriba")}
                      disabled={indice === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-20"
                      aria-label="Subir"
                    >
                      <ArrowUp size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => moverArchivo(indice, "abajo")}
                      disabled={indice === archivosPdf.length - 1}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 disabled:opacity-20"
                      aria-label="Bajar"
                    >
                      <ArrowDown size={13} />
                    </button>

                    <button
                      type="button"
                      onClick={() => eliminarArchivo(item.id)}
                      className="flex h-7 w-7 items-center justify-center rounded-md border border-red-200 text-red-600"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={() => inputArchivosRef.current?.click()}
                className="mt-2 flex h-8 w-full items-center justify-center gap-1 rounded-lg border border-sky-200 bg-sky-50 text-[10px] font-bold text-sky-700"
              >
                <Plus size={13} />
                Agregar más PDFs
              </button>
            </>
          )}
        </section>

        {/* PREVIEW + COBERTURA */}
        {primerPdfValido && (
          <section className="mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-xs font-bold text-slate-900">
                  Vista previa de cobertura
                </h2>
                <p className="max-w-[230px] truncate text-[9px] text-slate-400">
                  {primerPdfValido.nombre}
                </p>
              </div>

              <div className="text-right">
                <div className="text-[9px] text-slate-500">
                  Subir / bajar franja
                </div>
                <div className="text-[10px] font-bold text-slate-700">
                  {posicionCobertura} mm
                </div>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <PreviewPaginaPdf
                archivo={primerPdfValido.archivo}
                numeroPagina={1}
                titulo="Laberinto"
                posicionCobertura={posicionCobertura}
              />

              <PreviewPaginaPdf
                archivo={primerPdfValido.archivo}
                numeroPagina={2}
                titulo="Solución"
                posicionCobertura={posicionCobertura}
              />
            </div>

            <input
              type="range"
              min="0"
              max="60"
              step="1"
              value={posicionCobertura}
              onChange={(evento) =>
                setPosicionCobertura(Number(evento.target.value))
              }
              className="mt-2 w-full"
              aria-label="Posición de la cobertura"
            />

            <p className="mt-1 text-center text-[9px] text-slate-400">
              La franja blanca tiene ancho completo y altura fija de{" "}
              {ALTURA_COBERTURA_MM} mm.
            </p>
          </section>
        )}

        {/* LÁMINA FINAL */}
        <section className="mb-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="grid grid-cols-[1fr_64px] items-end gap-2">
            <label className="min-w-0">
              <span className="mb-1 block text-[11px] font-bold text-slate-700">
                3. Lámina final
              </span>
              <input
                type="url"
                value={imagenFinal}
                onChange={(evento) => setImagenFinal(evento.target.value)}
                placeholder="URL de lámina final"
                className="h-8 w-full rounded-lg border border-slate-300 px-2 text-[11px] outline-none focus:border-sky-500"
              />
            </label>

            {imagenFinal.trim() && (
              <button
                type="button"
                onClick={() =>
                  setModalImagen({
                    url: imagenFinal,
                    titulo: "Lámina final",
                  })
                }
                className="h-16 overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
                aria-label="Ampliar lámina final"
              >
                <img
                  src={imagenFinal}
                  alt="Vista previa de lámina final"
                  className="h-full w-full object-cover"
                />
              </button>
            )}
          </div>
        </section>

        {/* EXPORTAR */}
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-xs font-bold text-slate-900">
                Generar PDF final
              </h2>
              <p className="text-[9px] text-slate-400">
                {totalPaginasFinal} páginas estimadas
              </p>
            </div>

            <button
              type="button"
              onClick={descargarPdfCompleto}
              disabled={
                exportandoPdf ||
                procesandoArchivos ||
                archivosPdf.length === 0 ||
                hayArchivosInvalidos
              }
              className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 text-[11px] font-bold text-white disabled:opacity-40"
            >
              {exportandoPdf ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <FilePlus2 size={15} />
              )}
              {exportandoPdf ? "Generando..." : "Generar PDF"}
            </button>
          </div>

          {mensajeError && (
            <div className="mt-2 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] font-medium text-red-700">
              {mensajeError}
            </div>
          )}

          {exportandoPdf && (
            <div className="mt-2">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-sky-600 transition-all"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, progresoPdf.porcentaje || 0)
                    )}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-right text-[9px] text-slate-400">
                {progresoPdf.porcentaje || 0}%
              </div>
            </div>
          )}
        </section>
      </div>

      <ModalImagen
        url={modalImagen?.url}
        titulo={modalImagen?.titulo || ""}
        onCerrar={() => setModalImagen(null)}
      />
    </main>
  );
}