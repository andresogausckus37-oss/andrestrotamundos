import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  FileImage,
  FileText,
  Trash2,
  Upload,
} from "lucide-react";

import { generarPdf } from "../utilidades/generarPdf";

// ============================================================
// PROPORCIÓN A4
// ============================================================

const analizarProporcionA4 = (ancho, alto) => {
  const proporcionImagen = ancho / alto;
  const proporcionA4 = 210 / 297;

  const esA4 =
    Math.abs(
      proporcionImagen - proporcionA4
    ) <= 0.03;

  const resolucionRecomendada =
    ancho >= 1754 &&
    alto >= 2480;

  return {
    esA4,
    resolucionRecomendada,
    proporcion: proporcionImagen,
  };
};

// ============================================================
// OPTIMIZAR IMAGEN
// ============================================================

const optimizarImagen = (archivo) => {
  return new Promise((resolve, reject) => {
    const urlOriginal =
      URL.createObjectURL(archivo);

    const imagen = new Image();

    imagen.onload = () => {
      const MAX_ANCHO = 1754;
      const MAX_ALTO = 2480;
      const MAX_PESO = 1024 * 1024; // 1 MB

      const escala = Math.min(
        1,
        MAX_ANCHO / imagen.naturalWidth,
        MAX_ALTO / imagen.naturalHeight
      );

      const ancho = Math.round(
        imagen.naturalWidth * escala
      );

      const alto = Math.round(
        imagen.naturalHeight * escala
      );

      const canvas =
        document.createElement("canvas");

      canvas.width = ancho;
      canvas.height = alto;

      const ctx =
        canvas.getContext("2d");

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

      // Fondo blanco para imágenes
      // transparentes convertidas a JPG.
      ctx.fillStyle = "#ffffff";

      ctx.fillRect(
        0,
        0,
        ancho,
        alto
      );

      ctx.drawImage(
        imagen,
        0,
        0,
        ancho,
        alto
      );

      URL.revokeObjectURL(
        urlOriginal
      );

      const comprimir = (
        calidad = 0.9
      ) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(
                new Error(
                  "No se pudo comprimir la imagen."
                )
              );

              return;
            }

            /*
             * Si todavía supera 1 MB,
             * bajamos progresivamente
             * la calidad.
             */
            if (
              blob.size > MAX_PESO &&
              calidad > 0.55
            ) {
              comprimir(
                calidad - 0.05
              );

              return;
            }

            const nombreBase =
              archivo.name.replace(
                /\.[^/.]+$/,
                ""
              );

            const archivoOptimizado =
              new File(
                [blob],
                `${nombreBase}-optimizada.jpg`,
                {
                  type: "image/jpeg",
                }
              );

            resolve({
              archivo:
                archivoOptimizado,

              pesoOriginal:
                archivo.size,

              pesoOptimizado:
                archivoOptimizado.size,

              calidadFinal:
                calidad,
            });
          },
          "image/jpeg",
          calidad
        );
      };

      comprimir();
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

    imagen.src = urlOriginal;
  });
};

// ============================================================
// CREAR PREVIEW OPTIMIZADO
// ============================================================

const crearPreview = async (
  archivo
) => {
  const resultado =
    await optimizarImagen(
      archivo
    );

  const archivoOptimizado =
    resultado.archivo;

  return new Promise(
    (resolve, reject) => {
      const url =
        URL.createObjectURL(
          archivoOptimizado
        );

      const imagen = new Image();

      imagen.onload = () => {
        const analisis =
          analizarProporcionA4(
            imagen.naturalWidth,
            imagen.naturalHeight
          );

        resolve({
          archivo:
            archivoOptimizado,

          nombre:
            archivo.name,

          url,

          ancho:
            imagen.naturalWidth,

          alto:
            imagen.naturalHeight,

          esA4:
  analisis.esA4,

resolucionRecomendada:
  analisis.resolucionRecomendada,

proporcion:
  analisis.proporcion,

pesoOriginal:
  resultado.pesoOriginal,

          pesoOptimizado:
            resultado.pesoOptimizado,

          calidadFinal:
            resultado.calidadFinal,
        });
      };

      imagen.onerror = reject;

      imagen.src = url;
    }
  );
};



// ============================================================
// ADAPTAR IMAGEN A A4
// ============================================================

const adaptarArchivoA4 = (pagina) => {
  return new Promise((resolve, reject) => {
    const imagen = new Image();

    imagen.onload = () => {
      const anchoA4 = 1240;
      const altoA4 = 1754;

      const canvas =
        document.createElement("canvas");

      canvas.width = anchoA4;
      canvas.height = altoA4;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) {
        reject(
          new Error(
            "No se pudo preparar la imagen."
          )
        );
        return;
      }

      ctx.fillStyle = "#ffffff";

      ctx.fillRect(
        0,
        0,
        anchoA4,
        altoA4
      );

      /*
       * Esta opción adapta físicamente
       * la imagen al formato A4.
       *
       * No recorta contenido, pero puede
       * modificar ligeramente la proporción.
       */
      ctx.drawImage(
        imagen,
        0,
        0,
        anchoA4,
        altoA4
      );

      canvas.toBlob(
        async (blob) => {
          if (!blob) {
            reject(
              new Error(
                "No se pudo adaptar la imagen."
              )
            );
            return;
          }

          const nombreBase =
            pagina.nombre.replace(
              /\.[^/.]+$/,
              ""
            );

          const archivoA4 = new File(
            [blob],
            `${nombreBase}-A4.jpg`,
            {
              type: "image/jpeg",
            }
          );

          const preview =
            await crearPreview(
              archivoA4
            );

          resolve(preview);
        },
        "image/jpeg",
        0.95
      );
    };

    imagen.onerror = reject;
    imagen.src = pagina.url;
  });
};

// ============================================================
// ESTADO A4
// ============================================================

const EstadoA4 = ({
  pagina,
  onAdaptar,
}) => {
  if (!pagina) return null;

  return (
    <div className="mt-2">
      <p className="text-[11px] text-slate-500">
        {pagina.ancho} × {pagina.alto} px
      </p>

      <p className="mt-1 text-[11px] text-slate-500">
        Peso:{" "}
        {(
          pagina.pesoOptimizado /
          1024
        ).toFixed(0)}{" "}
        KB
      </p>

      {/* PROPORCIÓN */}

      <p
        className={`mt-1 text-[11px] font-semibold ${
          pagina.esA4
            ? "text-emerald-600"
            : "text-amber-600"
        }`}
      >
        {pagina.esA4
          ? "✓ Proporción A4 correcta"
          : "⚠ No es proporción A4"}
      </p>

      {/* RESOLUCIÓN */}

      <p
        className={`mt-1 text-[11px] font-semibold ${
          pagina.resolucionRecomendada
            ? "text-emerald-600"
            : "text-amber-600"
        }`}
      >
        {pagina.resolucionRecomendada
          ? "✓ Resolución recomendada"
          : "⚠ Resolución inferior a 1754 × 2480 px"}
      </p>

      {/* ADAPTAR PROPORCIÓN */}

      {!pagina.esA4 && onAdaptar && (
        <button
          type="button"
          onClick={onAdaptar}
          className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-[11px] font-semibold text-amber-700 transition hover:bg-amber-100"
        >
          Adaptar a A4
        </button>
      )}
    </div>
    
  );
};


// ============================================================
// COMPONENTE
// ============================================================

const GeneradorPdf = () => {
  const [portada, setPortada] =
    useState(null);

  const [paginas, setPaginas] =
    useState([]);

  const [paginaFinal, setPaginaFinal] =
    useState(null);

  const [modoContenido, setModoContenido] =
    useState("sin-recortar");

  const [generando, setGenerando] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================================
  // SELECCIONAR PORTADA
  // ==========================================================

  const manejarPortada = async (e) => {
    const archivo =
      e.target.files?.[0];

    if (!archivo) return;

    const preview =
      await crearPreview(archivo);

    setPortada(preview);

    e.target.value = "";
  };

  // ==========================================================
  // SELECCIONAR CONTENIDO
  // ==========================================================

  const manejarPaginas = async (e) => {
    const archivos = Array.from(
      e.target.files || []
    );

    if (!archivos.length) return;

    const nuevasPaginas =
      await Promise.all(
        archivos.map(crearPreview)
      );

    setPaginas((actuales) => [
      ...actuales,
      ...nuevasPaginas,
    ]);

    e.target.value = "";
  };

  // ==========================================================
  // SELECCIONAR PÁGINA FINAL
  // ==========================================================

  const manejarPaginaFinal = async (e) => {
    const archivo =
      e.target.files?.[0];

    if (!archivo) return;

    const preview =
      await crearPreview(archivo);

    setPaginaFinal(preview);

    e.target.value = "";
  };

  // ==========================================================
  // ORDENAR / ELIMINAR
  // ==========================================================

  const eliminarPagina = (indice) => {
    setPaginas((actuales) =>
      actuales.filter(
        (_, i) => i !== indice
      )
    );
  };

  const moverPagina = (
    indice,
    direccion
  ) => {
    setPaginas((actuales) => {
      const nuevoIndice =
        indice + direccion;

      if (
        nuevoIndice < 0 ||
        nuevoIndice >= actuales.length
      ) {
        return actuales;
      }

      const copia = [...actuales];

      [
        copia[indice],
        copia[nuevoIndice],
      ] = [
        copia[nuevoIndice],
        copia[indice],
      ];

      return copia;
    });
  };

  // ==========================================================
  // ADAPTAR PORTADA
  // ==========================================================

  const adaptarPortada = async () => {
    if (!portada) return;

    try {
      setError("");

      const nueva =
        await adaptarArchivoA4(
          portada
        );

      setPortada(nueva);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo adaptar la portada."
      );
    }
  };

  // ==========================================================
  // ADAPTAR CONTENIDO
  // ==========================================================

  const adaptarPagina = async (
    indice
  ) => {
    try {
      setError("");

      const nueva =
        await adaptarArchivoA4(
          paginas[indice]
        );

      setPaginas((actuales) =>
        actuales.map(
          (pagina, i) =>
            i === indice
              ? nueva
              : pagina
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo adaptar la página."
      );
    }
  };

  // ==========================================================
  // ADAPTAR PÁGINA FINAL
  // ==========================================================

  const adaptarFinal = async () => {
    if (!paginaFinal) return;

    try {
      setError("");

      const nueva =
        await adaptarArchivoA4(
          paginaFinal
        );

      setPaginaFinal(nueva);
    } catch (error) {
      console.error(error);

      setError(
        "No se pudo adaptar la página final."
      );
    }
  };

  // ==========================================================
  // TOTAL
  // ==========================================================

  const totalPaginas =
    paginas.length +
    (portada ? 1 : 0) +
    (paginaFinal ? 1 : 0);

  // ==========================================================
  // GENERAR PDF
  // ==========================================================

  const manejarGenerarPdf =
    async () => {
      if (!paginas.length) return;

      try {
        setGenerando(true);
        setError("");

        await generarPdf({
          portada,
          paginas,
          paginaFinal,
          modoContenido,
          nombreArchivo:
            "Andres-House-Sitter-Descargable.pdf",
        });
      } catch (error) {
        console.error(error);

        setError(
          "No se pudo generar el PDF. Revisá las imágenes e intentá nuevamente."
        );
      } finally {
        setGenerando(false);
      }
    };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-5">
      <div className="mx-auto max-w-4xl">

        {/* ENCABEZADO */}

        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-600">
            Herramienta privada
          </p>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            Generador de PDF
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Seleccioná portada, páginas de
            contenido y página final. Los
            archivos se procesan directamente
            en tu navegador.
          </p>
        </div>

        {/* RESUMEN */}

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Documento actual
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {totalPaginas} páginas en total
              </p>
            </div>

            <FileText
              size={24}
              className="text-sky-600"
            />
          </div>
        </div>

        {/* PORTADA */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Portada
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Seleccioná una imagen para la
            primera página.
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
                onChange={manejarPortada}
              />
            </label>
          ) : (
            <div className="mt-4 text-center">
              <img
                src={portada.url}
                alt="Portada"
                className="mx-auto max-h-[420px] rounded-xl border border-slate-200 object-contain"
              />

              <EstadoA4
                pagina={portada}
                onAdaptar={adaptarPortada}
              />

              <button
                type="button"
                onClick={() =>
                  setPortada(null)
                }
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                <Trash2 size={14} />
                Eliminar portada
              </button>
            </div>
          )}
        </section>

        {/* CONTENIDO */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Contenido
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Podés agregar imágenes en una
                o varias selecciones.
              </p>
            </div>

            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              {paginas.length}
            </span>
          </div>

          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-700">
            <FileImage size={17} />

            Seleccionar páginas

            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={manejarPaginas}
            />
          </label>

          {paginas.length > 0 && (
            <div className="mt-5 space-y-3">
              {paginas.map(
                (pagina, indice) => (
                  <article
                    key={`${pagina.nombre}-${indice}`}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
                  >
                    <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white">
                      <img
                        src={pagina.url}
                        alt={`Página ${
                          indice + 1
                        }`}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-900">
                        Página {indice + 1}
                      </p>

                      <p className="mt-1 truncate text-[11px] text-slate-500">
                        {pagina.nombre}
                      </p>

                      <EstadoA4
                        pagina={pagina}
                        onAdaptar={() =>
                          adaptarPagina(
                            indice
                          )
                        }
                      />
                    </div>

                    <div className="flex shrink-0 flex-col gap-1">
                      <button
                        type="button"
                        disabled={
                          indice === 0
                        }
                        onClick={() =>
                          moverPagina(
                            indice,
                            -1
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
                      >
                        <ArrowUp
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        disabled={
                          indice ===
                          paginas.length - 1
                        }
                        onClick={() =>
                          moverPagina(
                            indice,
                            1
                          )
                        }
                        className="rounded-lg border border-slate-200 bg-white p-2 text-slate-600 disabled:opacity-30"
                      >
                        <ArrowDown
                          size={14}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          eliminarPagina(
                            indice
                          )
                        }
                        className="rounded-lg border border-rose-100 bg-white p-2 text-rose-600"
                      >
                        <Trash2
                          size={14}
                        />
                      </button>
                    </div>
                  </article>
                )
              )}
            </div>
          )}
        </section>

        {/* PÁGINA FINAL */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Página final
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Opcional. Se agregará después del
            contenido.
          </p>

          {!paginaFinal ? (
            <label className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center">
              <Upload
                size={26}
                className="text-sky-600"
              />

              <span className="mt-2 text-sm font-semibold text-slate-700">
                Seleccionar página final
              </span>

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={
                  manejarPaginaFinal
                }
              />
            </label>
          ) : (
            <div className="mt-4 text-center">
              <img
                src={paginaFinal.url}
                alt="Página final"
                className="mx-auto max-h-[420px] rounded-xl border border-slate-200 object-contain"
              />

              <EstadoA4
                pagina={paginaFinal}
                onAdaptar={adaptarFinal}
              />

              <button
                type="button"
                onClick={() =>
                  setPaginaFinal(null)
                }
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
              >
                <Trash2 size={14} />
                Eliminar página final
              </button>
            </div>
          )}
        </section>

        {/* AJUSTES */}

        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <h2 className="text-base font-semibold text-slate-900">
            Ajuste de las páginas
          </h2>

          <p className="mt-1 text-xs leading-5 text-slate-500">
            Elegí cómo querés colocar las
            imágenes de contenido dentro de
            cada hoja A4.
          </p>

          <div className="mt-4 space-y-3">
            {[
              {
                valor:
                  "sin-recortar",
                titulo:
                  "Sin recortar",
                descripcion:
                  "Mantiene la imagen completa y su proporción. Puede dejar márgenes.",
              },
              {
                valor:
                  "ancho-completo",
                titulo:
                  "Ancho completo",
                                descripcion:
                  "Usa todo el ancho imprimible. Puede recortar arriba y abajo.",
              },
              {
                valor: "a4",
                titulo: "Ajustar a A4",
                descripcion:
                  "Llena el área A4. Ideal para imágenes ya preparadas en proporción A4.",
              },
            ].map((opcion) => (
              <label
                key={opcion.valor}
                className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-4"
              >
                <input
                  type="radio"
                  name="modoContenido"
                  value={opcion.valor}
                  checked={
                    modoContenido === opcion.valor
                  }
                  onChange={(e) =>
                    setModoContenido(
                      e.target.value
                    )
                  }
                  className="mt-1"
                />

                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {opcion.titulo}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {opcion.descripcion}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* GENERAR */}

        <button
          type="button"
          onClick={manejarGenerarPdf}
          disabled={
            !paginas.length ||
            generando
          }
          className="w-full rounded-xl bg-slate-900 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {generando
            ? "Generando PDF..."
            : `Generar PDF · ${totalPaginas} páginas`}
        </button>
      </div>
    </main>
  );
};

export default GeneradorPdf;