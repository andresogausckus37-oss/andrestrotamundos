import { useState } from "react";
import {
  Download,
  FileImage,
  Image as ImageIcon,
  Trash2,
  Upload,
} from "lucide-react";

// ============================================================
// CONFIGURACIÓN
// ============================================================

const ANCHO_OBJETIVO = 794;
const CALIDAD_WEBP = 0.82;

// ============================================================
// FORMATEAR PESO
// ============================================================

const formatearPeso = (bytes) => {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

// ============================================================
// PROCESAR IMAGEN
// ============================================================

const procesarImagen = (archivo) => {
  return new Promise((resolve, reject) => {
    const urlOriginal = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      const anchoOriginal = imagen.naturalWidth;
      const altoOriginal = imagen.naturalHeight;

      /*
       * Nunca agrandamos una imagen pequeña.
       * Solo reducimos si supera el ancho objetivo.
       */
      const escala = Math.min(
        1,
        ANCHO_OBJETIVO / anchoOriginal
      );

      const anchoOptimizado = Math.round(
        anchoOriginal * escala
      );

      const altoOptimizado = Math.round(
        altoOriginal * escala
      );

      const canvas = document.createElement("canvas");

      canvas.width = anchoOptimizado;
      canvas.height = altoOptimizado;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(urlOriginal);

        reject(
          new Error("No se pudo procesar la imagen.")
        );

        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        imagen,
        0,
        0,
        anchoOptimizado,
        altoOptimizado
      );

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            URL.revokeObjectURL(urlOriginal);

            reject(
              new Error(
                "No se pudo convertir la imagen a WebP."
              )
            );

            return;
          }

          const nombreBase = archivo.name.replace(
            /\.[^/.]+$/,
            ""
          );

          const archivoOptimizado = new File(
            [blob],
            `${nombreBase}.webp`,
            {
              type: "image/webp",
            }
          );

          const urlOptimizada =
            URL.createObjectURL(archivoOptimizado);

          resolve({
            nombre: archivo.name,
            nombreOptimizado: `${nombreBase}.webp`,
            archivoOriginal: archivo,
            archivoOptimizado,
            urlOriginal,
            urlOptimizada,
            anchoOriginal,
            altoOriginal,
            anchoOptimizado,
            altoOptimizado,
            pesoOriginal: archivo.size,
            pesoOptimizado: archivoOptimizado.size,
          });
        },
        "image/webp",
        CALIDAD_WEBP
      );
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(urlOriginal);

      reject(
        new Error("No se pudo leer la imagen.")
      );
    };

    imagen.src = urlOriginal;
  });
};

// ============================================================
// INFORMACIÓN DE IMAGEN
// ============================================================

const InformacionImagen = ({ imagen }) => {
  if (!imagen) return null;

  const reduccion = Math.max(
    0,
    (
      (1 -
        imagen.pesoOptimizado /
          imagen.pesoOriginal) *
      100
    ).toFixed(1)
  );

  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      <div className="rounded-xl bg-slate-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          Original
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-700">
          {imagen.anchoOriginal} × {imagen.altoOriginal} px
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {formatearPeso(imagen.pesoOriginal)}
        </p>
      </div>

      <div className="rounded-xl bg-emerald-50 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
          Optimizada
        </p>

        <p className="mt-1 text-xs font-semibold text-slate-700">
          {imagen.anchoOptimizado} × {imagen.altoOptimizado} px
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {formatearPeso(imagen.pesoOptimizado)}
        </p>
      </div>

      <div className="col-span-2">
        <p className="text-xs font-semibold text-emerald-600">
          Reducción de peso: {reduccion}%
        </p>
      </div>
    </div>
  );
};

// ============================================================
// DESCARGAR
// ============================================================

const descargarImagen = (imagen) => {
  if (!imagen) return;

  const enlace = document.createElement("a");

  enlace.href = imagen.urlOptimizada;
  enlace.download = imagen.nombreOptimizado;

  document.body.appendChild(enlace);
  enlace.click();
  enlace.remove();
};

// ============================================================
// COMPONENTE
// ============================================================

const OptimizadorImagenes = () => {
  const [portada, setPortada] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [paginaFinal, setPaginaFinal] = useState(null);

  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // PORTADA
  // ==========================================================

  const manejarPortada = async (e) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    try {
      setProcesando(true);
      setError("");

      const resultado = await procesarImagen(archivo);

      if (portada) {
        URL.revokeObjectURL(portada.urlOriginal);
        URL.revokeObjectURL(portada.urlOptimizada);
      }

      setPortada(resultado);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo procesar la portada."
      );
    } finally {
      setProcesando(false);
      e.target.value = "";
    }
  };

  // ==========================================================
  // PREVIEWS
  // ==========================================================

  const manejarPreviews = async (e) => {
    const archivos = Array.from(
      e.target.files || []
    );

    if (!archivos.length) return;

    try {
      setProcesando(true);
      setError("");

      const nuevasPreviews = [];

      /*
       * Procesamos secuencialmente para
       * consumir menos memoria en celular.
       */
      for (const archivo of archivos) {
        const resultado = await procesarImagen(archivo);
        nuevasPreviews.push(resultado);
      }

      setPreviews((actuales) => [
        ...actuales,
        ...nuevasPreviews,
      ]);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudieron procesar las previews."
      );
    } finally {
      setProcesando(false);
      e.target.value = "";
    }
  };

  // ==========================================================
  // PÁGINA FINAL
  // ==========================================================

  const manejarPaginaFinal = async (e) => {
    const archivo = e.target.files?.[0];

    if (!archivo) return;

    try {
      setProcesando(true);
      setError("");

      const resultado = await procesarImagen(archivo);

      if (paginaFinal) {
        URL.revokeObjectURL(
          paginaFinal.urlOriginal
        );

        URL.revokeObjectURL(
          paginaFinal.urlOptimizada
        );
      }

      setPaginaFinal(resultado);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo procesar la página final."
      );
    } finally {
      setProcesando(false);
      e.target.value = "";
    }
  };

  // ==========================================================
  // ELIMINAR
  // ==========================================================

  const eliminarPortada = () => {
    if (!portada) return;

    URL.revokeObjectURL(portada.urlOriginal);
    URL.revokeObjectURL(portada.urlOptimizada);

    setPortada(null);
  };

  const eliminarPreview = (indice) => {
    setPreviews((actuales) => {
      const preview = actuales[indice];

      if (preview) {
        URL.revokeObjectURL(preview.urlOriginal);
        URL.revokeObjectURL(preview.urlOptimizada);
      }

      return actuales.filter(
        (_, i) => i !== indice
      );
    });
  };

  const eliminarPaginaFinal = () => {
    if (!paginaFinal) return;

    URL.revokeObjectURL(
      paginaFinal.urlOriginal
    );

    URL.revokeObjectURL(
      paginaFinal.urlOptimizada
    );

    setPaginaFinal(null);
  };

  // ==========================================================
  // DESCARGAR TODAS
  // ==========================================================

  const descargarTodas = async () => {
    const imagenes = [
      portada,
      ...previews,
      paginaFinal,
    ].filter(Boolean);

    for (const imagen of imagenes) {
      descargarImagen(imagen);

      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );
    }
  };

  // ==========================================================
  // TOTALES
  // ==========================================================

  const todasLasImagenes = [
    portada,
    ...previews,
    paginaFinal,
  ].filter(Boolean);

  const cantidadTotal = todasLasImagenes.length;

  const pesoOriginalTotal = todasLasImagenes.reduce(
    (total, imagen) => total + imagen.pesoOriginal,
    0
  );

  const pesoOptimizadoTotal = todasLasImagenes.reduce(
    (total, imagen) => total + imagen.pesoOptimizado,
    0
  );

  const reduccionTotal =
    pesoOriginalTotal > 0
      ? Math.max(
          0,
          (
            (1 -
              pesoOptimizadoTotal /
                pesoOriginalTotal) *
            100
          ).toFixed(1)
        )
      : 0;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-5">
      <div className="mx-auto max-w-4xl">

        {/* ENCABEZADO */}

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            Herramienta privada
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Optimizador de imágenes
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Prepará la portada, las imágenes de preview y la página
            final antes de subirlas manualmente a Vercel Blob. Los
            archivos se procesan directamente en tu navegador.
          </p>
        </div>

        {/* RESUMEN */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Imágenes actuales
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {cantidadTotal} imágenes procesadas
              </p>

              {cantidadTotal > 0 && (
                <p className="mt-2 text-xs text-slate-500">
                  {formatearPeso(pesoOriginalTotal)} →{" "}
                  <span className="font-semibold text-emerald-600">
                    {formatearPeso(pesoOptimizadoTotal)}
                  </span>
                </p>
              )}
            </div>

            <ImageIcon
              size={24}
              className="text-sky-600"
            />
          </div>

          {cantidadTotal > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-xs font-semibold text-emerald-600">
                Reducción total: {reduccionTotal}%
              </p>
            </div>
          )}
        </div>

                {/* PORTADA */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Portada
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Imagen principal del producto y portada utilizada en el PDF.
          </p>

          {!portada ? (
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-sky-400 hover:bg-sky-50">
              <Upload
                size={26}
                className="text-sky-600"
              />

              <span className="mt-2 text-sm font-semibold text-slate-700">
                Seleccionar portada
              </span>

              <span className="mt-1 text-xs text-slate-500">
                JPG, PNG o WebP
              </span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={procesando}
                onChange={manejarPortada}
              />
            </label>
          ) : (
            <div className="mt-4">
              <div className="text-center">
                <img
                  src={portada.urlOptimizada}
                  alt="Portada optimizada"
                  className="mx-auto max-h-[420px] rounded-xl border border-slate-200 object-contain"
                />
              </div>

              <InformacionImagen
                imagen={portada}
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    descargarImagen(portada)
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white"
                >
                  <Download size={14} />
                  Descargar WebP
                </button>

                <button
                  type="button"
                  onClick={eliminarPortada}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-100 px-3 py-2.5 text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* PREVIEWS */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Imágenes de preview
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Seleccioná las tres previews comerciales del producto.
                También podés agregar más si las necesitás.
              </p>
            </div>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {previews.length}
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            <FileImage size={17} />
            Seleccionar previews

            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={procesando}
              onChange={manejarPreviews}
            />
          </label>

          {previews.length > 0 && (
            <div className="mt-5 space-y-3">
              {previews.map((preview, indice) => (
                <article
                  key={`${preview.nombre}-${indice}`}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      <img
                        src={preview.urlOptimizada}
                        alt={`Preview ${indice + 1}`}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">
                        Preview {indice + 1}
                      </p>

                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {preview.nombre}
                      </p>

                      <InformacionImagen
                        imagen={preview}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        descargarImagen(preview)
                      }
                      className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white"
                    >
                      <Download size={14} />
                      Descargar WebP
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        eliminarPreview(indice)
                      }
                      className="inline-flex items-center justify-center rounded-xl border border-rose-100 bg-white px-3 py-2.5 text-rose-600"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* PÁGINA FINAL */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Página final
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Imagen utilizada como página final del PDF.
          </p>

          {!paginaFinal ? (
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition hover:border-sky-400 hover:bg-sky-50">
              <Upload
                size={26}
                className="text-sky-600"
              />

              <span className="mt-2 text-sm font-semibold text-slate-700">
                Seleccionar página final
              </span>

              <span className="mt-1 text-xs text-slate-500">
                JPG, PNG o WebP
              </span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={procesando}
                onChange={manejarPaginaFinal}
              />
            </label>
          ) : (
            <div className="mt-4">
              <div className="text-center">
                <img
                  src={paginaFinal.urlOptimizada}
                  alt="Página final optimizada"
                  className="mx-auto max-h-[420px] rounded-xl border border-slate-200 object-contain"
                />
              </div>

              <InformacionImagen
                imagen={paginaFinal}
              />

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() =>
                    descargarImagen(paginaFinal)
                  }
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-semibold text-white"
                >
                  <Download size={14} />
                  Descargar WebP
                </button>

                <button
                  type="button"
                  onClick={eliminarPaginaFinal}
                  className="inline-flex items-center justify-center rounded-xl border border-rose-100 px-3 py-2.5 text-rose-600"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* DESCARGAR TODAS */}

        <button
          type="button"
          onClick={descargarTodas}
          disabled={
            cantidadTotal === 0 ||
            procesando
          }
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Download size={17} />

          {procesando
            ? "Procesando imágenes..."
            : `Descargar todas · ${cantidadTotal} imágenes`}
        </button>

        <p className="mt-3 text-center text-xs text-slate-500">
          WebP · ancho máximo {ANCHO_OBJETIVO} px · calidad{" "}
          {Math.round(CALIDAD_WEBP * 100)}%
        </p>
      </div>
    </main>
  );
};

export default OptimizadorImagenes;