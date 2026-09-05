import CalificacionProducto from "../componentes/CalificacionProducto";
import ProductosRecomendados from "../componentes/ProductosRecomendados";

import {
  ArrowLeft,
  Download,
  ShoppingBag,
  Star,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { productos } from "../datos/productos";

const formatearPrecio = (precio) => {
  if (!precio) return "Precio a definir";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
};

const Tienda = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white">
      {/* =========================================================
          VOLVER
      ========================================================== */}

      

      {/* =========================================================
          ENCABEZADO
      ========================================================== */}

      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white px-5 py-12 sm:py-16">
        <div className="mx-auto max-w-6xl text-center">
          <p className="eyebrow">
            Andres House Sitter
          </p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Tienda
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Productos digitales pensados para disfrutar, aprender y compartir
            el mundo de las mascotas.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-600"
        >
          <ArrowLeft size={17} />
          Volver
        </button>
      </div>

      {/* =========================================================
          PRODUCTOS
      ========================================================== */}

      <section className="px-4 py-9 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-6xl">
          {/* CABECERA PRODUCTOS */}

          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 sm:text-xl">
                Productos disponibles
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                Elegí un producto para conocer todos los detalles.
              </p>
            </div>

            <span className="hidden text-xs font-medium text-slate-400 sm:block">
              {productos.length}{" "}
              {productos.length === 1
                ? "producto"
                : "productos"}
            </span>
          </div>

          {productos.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
              {productos.map((producto) => {
                // =================================================
                // PRECIO Y OFERTA
                // =================================================

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
                        navigate(
                          `/tienda/${producto.id}`
                        )
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
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 sm:px-2.5 sm:text-[12px]">
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
                          PRECIO + CTA
                      ========================================== */}

                      <div className="mt-auto pt-3">
                        <div className="border-t border-slate-100 pt-3 sm:pt-4">
                          

                          {tieneOferta ? (
                            <>
                              {/* PRECIO OFERTA */}

                              <div className="-mt-4 flex flex-wrap items-center gap-2">
                                <p className="text-base font-bold tracking-tight text-slate-900 sm:text-xl">
                                  {formatearPrecio(
                                    precioFinal
                                  )}
                                </p>

                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:text-[10px]">
                                  -{descuento}%
                                </span>
                              </div>

                              {/* PRECIO ORIGINAL */}

                              <p className="mt-0.5 text-[14px] text-slate-400 line-through sm:text-xs">
                                {formatearPrecio(
                                  producto.precioARS
                                )}
                              </p>

                              {/* OFERTA */}

                              <div className="mt-2">
                                <p className="text-[9px] font-bold uppercase tracking-wide text-orange-600 sm:text-[10px]">
                                  {
                                    producto.oferta
                                      .etiqueta
                                  }
                                </p>

                                <p className="mt-0.5 text-[14px] font-medium text-emerald-700 sm:text-[10px]">
                                  Ahorrás{" "}
                                  {formatearPrecio(
                                    ahorro
                                  )}
                                </p>
                              </div>
                            </>
                          ) : (
                            <p className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 sm:text-xl">
                              {formatearPrecio(
                                producto.precioARS
                              )}
                            </p>
                          )}

                          {/* BOTÓN */}

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/tienda/${producto.id}`
                              )
                            }
                            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-2 py-2.5 text-[11px] font-semibold text-white transition hover:bg-sky-700 sm:gap-2 sm:px-4 sm:py-3 sm:text-sm"
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
              <ShoppingBag
                size={28}
                className="mx-auto text-slate-400"
              />

              <h2 className="mt-3 text-lg font-semibold text-slate-900">
                Próximamente nuevos productos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Estamos preparando nuevos descargables.
              </p>
            </div>
          )}

           {/* PRODUCTOS RECOMENDADOS */}

          <ProductosRecomendados />
        </div>
      </section>
    </main>
  );
};

export default Tienda;