import { useState } from "react";
import { Sparkles } from "lucide-react";

import { productosDigitales } from "../../datos/productosDigitales";

export default function AdminRedes() {
  const [producto1Id, setProducto1Id] =
    useState("");

  const [producto2Id, setProducto2Id] =
    useState("");

  const producto1 = productosDigitales.find(
    (producto) => producto.id === producto1Id
  );

  const producto2 = productosDigitales.find(
    (producto) => producto.id === producto2Id
  );

  const productosSeleccionados =
  producto1 || producto2;

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
            Generá, revisá y programá el contenido semanal.
          </p>
        </div>

        {/* PRODUCTOS DE LA SEMANA */}

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
            Seleccioná los dos productos que tendrán contenido esta semana.
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

          {/* BOTÓN */}

          <button
            type="button"
            disabled={!productosSeleccionados}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Sparkles size={15} />

            Generar contenido con IA
          </button>
        </section>
      </div>
    </main>
  );
}