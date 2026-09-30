import { useEffect, useState } from "react";
import {
  Loader2,
  Sparkles,
  Send,
} from "lucide-react";

import { crearPromptRedes } from "../../utilidades/crearPromptRedes";

export default function AdminRedes() {
  const [producto1Id, setProducto1Id] =
    useState("");

  const [productosDigitales, setProductosDigitales] =
    useState([]);

  const [producto2Id, setProducto2Id] =
    useState("");

  const [generando, setGenerando] =
    useState(false);

  const [error, setError] =
    useState("");

  const [contenidos, setContenidos] =
    useState([]);

  // =======================================================
  // PRUEBA THREADS
  // =======================================================

  const [textoThreads, setTextoThreads] =
    useState(
      "Primera publicación de prueba desde Andrés Imprimibles."
    );

  const [publicandoThreads, setPublicandoThreads] =
    useState(false);

  const [resultadoThreads, setResultadoThreads] =
    useState("");

  // =======================================================
  // CARGAR PRODUCTOS
  // =======================================================

  useEffect(() => {
    const cargarProductos = async () => {
      try {
        const respuesta = await fetch(
          "/api/admin/pedidos?accion=listar-productos"
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ||
              "No se pudieron cargar los productos."
          );
        }

        setProductosDigitales(
          Array.isArray(datos)
            ? datos
            : datos.productos || []
        );
      } catch (error) {
        console.error(
          "Error cargando productos:",
          error
        );

        setError(
          "No se pudieron cargar los productos."
        );
      }
    };

    cargarProductos();
  }, []);

  const producto1 =
    productosDigitales.find(
      (producto) =>
        producto.id === producto1Id
    );

  const producto2 =
    productosDigitales.find(
      (producto) =>
        producto.id === producto2Id
    );

  const productosSeleccionados =
    producto1 || producto2;

  // =======================================================
  // GENERAR CONTENIDO
  // =======================================================

  const generarContenido = async () => {
    const seleccionados = [
      producto1,
      producto2,
    ].filter(Boolean);

    if (seleccionados.length === 0) {
      return;
    }

    try {
      setGenerando(true);
      setError("");

      const resultados = [];

      for (const producto of seleccionados) {
        const prompt =
          crearPromptRedes(producto);

        const respuesta = await fetch(
          "/api/contenido-redes",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              prompt,
            }),
          }
        );

        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ||
              `No se pudo generar contenido para ${producto.nombre}`
          );
        }

        resultados.push({
          productoId: producto.id,
          nombre: producto.nombre,
          contenido: datos.contenido,
        });
      }

      setContenidos(resultados);
    } catch (error) {
      console.error(
        "Error generando contenido:",
        error
      );

      setError(
        error.message ||
          "No se pudo generar el contenido."
      );
    } finally {
      setGenerando(false);
    }
  };

  // =======================================================
  // PUBLICAR PRUEBA EN THREADS
  // =======================================================

  const publicarPruebaThreads = async () => {
    const texto = textoThreads.trim();

    if (!texto) {
      setResultadoThreads(
        "Escribí un texto antes de publicar."
      );
      return;
    }

    try {
      setPublicandoThreads(true);
      setResultadoThreads("");

      const respuesta = await fetch(
        "/api/contenido-redes?accion=threads-publicar",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            texto,
          }),
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.detalle ||
            datos.error ||
            "No se pudo publicar en Threads."
        );
      }

      setResultadoThreads(
        `Publicado correctamente. ID: ${datos.publicacionId}`
      );
    } catch (error) {
      console.error(
        "Error publicando en Threads:",
        error
      );

      setResultadoThreads(
        `Error: ${
          error.message ||
          "No se pudo publicar en Threads."
        }`
      );
    } finally {
      setPublicandoThreads(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>

          <h1 className="text-xl font-bold text-slate-900">
            Contenido y redes
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Generá, revisá y programá el
            contenido semanal.
          </p>
        </div>

        {/* PRUEBA THREADS */}

        <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Send
              size={18}
              className="text-slate-700"
            />

            <h2 className="text-sm font-bold text-slate-900">
              Prueba de Threads
            </h2>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Esta prueba realizará una
            publicación real en Threads.
          </p>

          <textarea
            value={textoThreads}
            onChange={(event) =>
              setTextoThreads(
                event.target.value
              )
            }
            rows={4}
            className="mt-4 w-full resize-none rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs text-slate-700 outline-none transition focus:border-violet-400"
          />

          <button
            type="button"
            onClick={publicarPruebaThreads}
            disabled={
              publicandoThreads ||
              !textoThreads.trim()
            }
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {publicandoThreads ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Publicando...
              </>
            ) : (
              <>
                <Send size={15} />

                Publicar prueba en Threads
              </>
            )}
          </button>

          {resultadoThreads && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              {resultadoThreads}
            </div>
          )}
        </section>

        {/* PRODUCTOS */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles
              size={18}
              className="text-violet-600"
            />

            <h2 className="text-sm font-bold text-slate-900">
              Productos de la semana
            </h2>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Seleccioná uno o dos productos
            para generar su contenido.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {/* PRODUCTO 1 */}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Producto 1
              </label>

              <select
                value={producto1Id}
                onChange={(event) =>
                  setProducto1Id(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400"
              >
                <option value="">
                  Seleccionar producto
                </option>

                {productosDigitales.map(
                  (producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                      disabled={
                        producto.id ===
                        producto2Id
                      }
                    >
                      {producto.nombre}
                    </option>
                  )
                )}
              </select>
            </div>

            {/* PRODUCTO 2 */}

            <div>
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Producto 2
              </label>

              <select
                value={producto2Id}
                onChange={(event) =>
                  setProducto2Id(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400"
              >
                <option value="">
                  Seleccionar producto
                </option>

                {productosDigitales.map(
                  (producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                      disabled={
                        producto.id ===
                        producto1Id
                      }
                    >
                      {producto.nombre}
                    </option>
                  )
                )}
              </select>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* BOTÓN */}

          <button
            type="button"
            onClick={generarContenido}
            disabled={
              !productosSeleccionados ||
              generando
            }
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {generando ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Generando contenido...
              </>
            ) : (
              <>
                <Sparkles size={15} />

                Generar contenido con IA
              </>
            )}
          </button>
        </section>

        {/* RESULTADO TEMPORAL */}

        {contenidos.length > 0 && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              Contenido generado
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              La conexión con la IA funcionó
              correctamente.
            </p>

            <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-[10px] text-slate-100">
              {JSON.stringify(
                contenidos,
                null,
                2
              )}
            </pre>
          </section>
        )}
      </div>
    </main>
  );
}