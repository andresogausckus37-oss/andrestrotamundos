import CalificacionProducto from "../componentes/CalificacionProducto";

import {
  ArrowLeft,
  Download,
  ShoppingBag,
  Star,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { productosDigitales } from "../datos/productosDigitales";

const formatearPrecio = (precio) => {
  if (!precio) return "Precio a definir";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
};

const Digitales = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white">
      {/* =========================================================
          ENCABEZADO
      ========================================================== */}

      <section className="border-b border-slate-200 bg-gradient-to-b from-purple-50 via-white to-white px-5 py-8 sm:py-14">
        <div className="mx-auto max-w-6xl text-center">
          <img
  src="https://i.postimg.cc/KvRB21tY/11206.png"
  alt="Toby y Luna Imprimibles"
  className="mx-auto h-auto w-full max-w-[300px] object-contain sm:max-w-[320px]"
/>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Actividades digitales para imprimir, jugar,
            colorear, aprender y disfrutar en casa.
          </p>

          {/* INFO */}

          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700">
              PDF descargables
            </span>

            <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700">
              Formato A4
            </span>

            <span className="rounded-full bg-purple-100 px-3 py-1.5 text-xs font-semibold text-purple-700">
              Listos para imprimir
            </span>
          </div>
        </div>
      </section>

      {/* =========================================================
          VOLVER
      ========================================================== */}

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <button
          type="button"
          onClick={() => navigate("/tienda")}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-purple-600"
        >
          <ArrowLeft size={17} />
          Volver a la tienda
        </button>
      </div>

      {/* =========================================================
          CATÁLOGO
      ========================================================== */}

      <section className="px-4 py-8 sm:px-5 sm:py-12">
        <div className="mx-auto max-w-6xl">
          {/* CABECERA */}

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Todos los imprimibles
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Elegí una actividad para conocer todos los detalles.
              </p>
            </div>

            <span className="hidden text-xs font-medium text-slate-400 sm:block">
              {productosDigitales.length}{" "}
              {productosDigitales.length === 1
                ? "producto"
                : "productos"}
            </span>
          </div>

          {/* =====================================================
              PRODUCTOS
          ====================================================== */}

          {productosDigitales.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
              {productosDigitales.map((producto) => {
                const tieneOferta =
                  producto.oferta?.activa === true;

                const precioFinal = tieneOferta
                  ? producto.oferta.precioARS
                  : producto.precioARS;

                const ahorro = tieneOferta
                  ? producto.precioARS -
                    producto.oferta.precioARS
                  : 0;

                const descuento = tieneOferta
                  ? Math.round(
                      (ahorro / producto.precioARS) *
                        100
                    )
                  : 0;

                return (
                  <article
                    key={producto.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* =============================================
                        IMAGEN
                    ============================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/tienda/${producto.id}`)
                      }
                      className="block w-full bg-white"
                      aria-label={`Ver ${producto.nombre}`}
                    >
                      <div className="aspect-[4/5] overflow-hidden bg-slate-50 p-1 sm:p-4">
                        <img
                          src={producto.imagenes?.portada}
                          alt={producto.nombre}
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    </button>

                    {/* =============================================
                        CONTENIDO
                    ============================================== */}

                    <div className="flex flex-1 flex-col p-3 sm:p-5">
                      {/* BADGES */}

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-purple-700 sm:px-2.5 sm:text-[11px]">
                          <Download
                            size={11}
                            className="shrink-0"
                          />

                          <span className="hidden sm:inline">
                            Descargable
                          </span>

                          <span className="sm:hidden">
                            PDF
                          </span>
                        </span>

                        {producto.destacado && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-amber-700 sm:px-2.5 sm:text-[10px]">
                            <Star
                              size={10}
                              fill="currentColor"
                            />

                            <span className="hidden sm:inline">
                              Destacado
                            </span>

                            <span className="sm:hidden">
                              Top
                            </span>
                          </span>
                        )}
                      </div>

                      {/* RESEÑAS */}

                      <div className="mt-2 min-h-[20px]">
                        <CalificacionProducto
                          productoId={producto.id}
                        />
                      </div>

                      {/* TÍTULO */}

                      <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-[1.35rem] text-slate-900 sm:text-lg sm:leading-6">
                        {producto.nombre}
                      </h3>

                      {/* =========================================
                          PRECIO
                      ========================================== */}

                      <div className="mt-auto pt-3">
                        <div className="border-t border-slate-100 pt-3 sm:pt-4">
                          {tieneOferta ? (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-bold tracking-tight text-slate-900 sm:text-xl">
                                  {formatearPrecio(
                                    precioFinal
                                  )}
                                </p>

                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  -{descuento}%
                                </span>
                              </div>

                              <p className="mt-0.5 text-[12px] text-slate-400 line-through sm:text-xs">
                                {formatearPrecio(
                                  producto.precioARS
                                )}
                              </p>

                              {producto.oferta
                                ?.etiqueta && (
                                <p className="mt-2 text-[9px] font-bold uppercase tracking-wide text-orange-600 sm:text-[10px]">
                                  {
                                    producto.oferta
                                      .etiqueta
                                  }
                                </p>
                              )}

                              <p className="mt-0.5 text-[12px] font-medium text-emerald-700">
                                Ahorrás{" "}
                                {formatearPrecio(
                                  ahorro
                                )}
                              </p>
                            </>
                          ) : (
                            <p className="text-base font-semibold tracking-tight text-slate-900 sm:text-xl">
                              {formatearPrecio(
                                producto.precioARS
                              )}
                            </p>
                          )}

                          {/* CTA */}

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/tienda/${producto.id}`
                              )
                            }
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600 px-2 py-2.5 text-[11px] font-semibold text-white transition hover:bg-purple-700 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
                          >
                            <ShoppingBag
                              size={14}
                              className="shrink-0 sm:h-4 sm:w-4"
                            />

                            Ver producto
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* =====================================================
                SIN PRODUCTOS
            ====================================================== */

            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <Download
                size={28}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-3 text-lg font-semibold text-slate-900">
                Próximamente nuevos imprimibles
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Estamos preparando nuevas actividades para
                imprimir y disfrutar.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================
          VOLVER A TIENDA
      ========================================================== */}

      <section className="border-t border-slate-200 bg-slate-50 px-5 py-10">
        <div className="mx-auto max-w-6xl text-center">
          <p className="text-sm text-slate-600">
            ¿Querés explorar otros productos?
          </p>

          <button
            type="button"
            onClick={() => navigate("/tienda")}
            className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
          >
            <ShoppingBag size={17} />
            Volver a la tienda
          </button>
        </div>
      </section>
    </main>
  );
};

export default Digitales;