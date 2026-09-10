import { useMemo, useState } from "react";

import CalificacionProducto from "../componentes/CalificacionProducto";

import {
  ArrowLeft,
  Baby,
  Download,
  Gamepad2,
  Home,
  ShoppingBag,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { productosDigitales } from "../datos/productosDigitales";

/* =========================================================
   FORMATEAR PRECIO
========================================================= */

const formatearPrecio = (precio) => {
  if (!precio) {
    return "Precio a definir";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
};

/* =========================================================
   FILTROS
========================================================= */

const FILTROS = [
  {
    id: "todos",
    nombre: "Todos",
  },
  {
    id: "juegos",
    nombre: "Juegos y actividades",
    icono: Gamepad2,
  },
  {
    id: "hogar",
    nombre: "Hogar y mascotas",
    icono: Home,
  },
];

/* =========================================================
   TIENDA
========================================================= */

const Tienda = () => {
  const navigate = useNavigate();

  const [filtroActivo, setFiltroActivo] =
    useState("todos");

  /* =======================================================
     PRODUCTOS FILTRADOS
  ======================================================= */

  const productosMostrados = useMemo(() => {
    if (filtroActivo === "hogar") {
      return productosDigitales.filter(
        (producto) => producto.linea === "hogar"
      );
    }

    const juegos = productosDigitales.filter(
      (producto) =>
        !producto.linea ||
        producto.linea === "juegos"
    );

    return juegos.slice(0, 4);
  }, [filtroActivo]);

  return (
    <main className="min-h-screen bg-white">
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white px-5 py-8 sm:py-16">
        <div className="mx-auto max-w-6xl text-center">
          {/* LOGO */}

          <img
            src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logo-andres-imprimibles"
            alt="Andres Imprimibles"
            className="mx-auto h-auto w-full max-w-[240px] object-contain sm:max-w-[320px]"
          />

          {/* COLECCIÓN */}

          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:text-sm">
            Una colección de Andres House Sitter
          </p>

          {/* DESCRIPCIÓN */}

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Imprimibles para jugar, aprender y organizar.
            Actividades para disfrutar en casa y recursos
            prácticos para el cuidado del hogar y las
            mascotas. Descargá, imprimí y usá.
          </p>

          {/* CTA */}

          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() =>
                navigate("/tienda/digitales")
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700"
            >
              <Download size={17} />
              Ver todos los imprimibles
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================
          VOLVER
      ====================================================== */}

      <div className="mx-auto max-w-6xl px-5 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-600"
        >
          <ArrowLeft size={17} />
          Volver
        </button>
      </div>

      {/* =====================================================
          EXPLORAR POR COLECCIÓN
      ====================================================== */}

      <section className="px-4 pt-2 sm:px-5 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            
          </div>

          {/* FILTROS */}

          <div className="mt-6 flex flex-wrap justify-center gap-2 sm:gap-3">
            {FILTROS.map((filtro) => {
              const activo =
                filtroActivo === filtro.id;

              const Icono = filtro.icono;

              return (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() =>
                    setFiltroActivo(filtro.id)
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition sm:px-5 sm:text-sm ${
                    activo
                      ? "border-sky-600 bg-sky-600 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                  }`}
                >
                  {Icono && (
                    <Icono
                      size={15}
                      className="shrink-0"
                    />
                  )}

                  {filtro.nombre}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* =====================================================
          PRODUCTOS
      ====================================================== */}

      <section className="px-4 py-10 sm:px-5 sm:py-14">
        <div className="mx-auto max-w-6xl">
          {/* CABECERA */}

          <div className="mx-auto mb-7 max-w-2xl text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              {filtroActivo === "hogar"
                ? "Hogar y mascotas"
                : "Imprimibles destacados"}
            </h2>

            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
              {filtroActivo === "hogar"
                ? "Recursos imprimibles para organizar el hogar, las mascotas y la información importante."
                : "Una selección de nuestros imprimibles para jugar, organizar y disfrutar en casa."}
            </p>
          </div>

          {/* =================================================
              PRODUCTOS EXISTENTES
          ================================================== */}

          {productosMostrados.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:gap-6">
              {productosMostrados.map((producto) => {
                const tieneOferta =
                  producto.oferta?.activa === true;

                const precioFinal = tieneOferta
                  ? producto.oferta.precioARS
                  : producto.precioARS;

                const ahorro = tieneOferta
                  ? producto.precioARS -
                    producto.oferta.precioARS
                  : 0;

                const descuento =
                  tieneOferta &&
                  producto.precioARS
                    ? Math.round(
                        (ahorro /
                          producto.precioARS) *
                          100
                      )
                    : 0;

                return (
                  <article
                    key={producto.id}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* IMAGEN */}

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
                          src={
                            producto.imagenes
                              ?.portada
                          }
                          alt={producto.nombre}
                          className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                        />
                      </div>
                    </button>

                    {/* CONTENIDO */}

                    <div className="flex flex-1 flex-col p-3 sm:p-5">
                      {/* BADGES */}

<div className="flex flex-nowrap items-center gap-1.5">
  {/* PDF */}

  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-sky-700 sm:px-2.5 sm:text-[10px]">
    <Download
      size={10}
      className="shrink-0"
    />

    PDF
  </span>

  {/* TIPO DE IMPRIMIBLE */}

  {producto.linea === "hogar" ? (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-emerald-700 sm:px-2.5 sm:text-[10px]">
      <Home
        size={10}
        className="shrink-0"
      />

      Hogar
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-violet-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-violet-700 sm:px-2.5 sm:text-[10px]">
      <Baby
        size={10}
        className="shrink-0"
      />

      Infantil
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

                      {/* PRECIO */}

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

                              <p className="mt-0.5 text-[12px] font-medium text-emerald-700 sm:text-[10px]">
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
            /* =================================================
               HOGAR Y MASCOTAS SIN PRODUCTOS TODAVÍA
            ================================================== */

            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <Home
                size={30}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-sm leading-6 text-slate-500">
                Próximamente vas a encontrar aquí
                nuevos recursos imprimibles para el
                hogar y las mascotas.
              </p>
            </div>
          )}

          {/* =================================================
              VER TODOS
          ================================================== */}

          {filtroActivo !== "hogar" &&
            productosDigitales.length > 4 && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={() =>
                    navigate(
                      "/tienda/digitales"
                    )
                  }
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                >
                  <Download size={16} />

                  Ver todos los imprimibles
                </button>
              </div>
            )}
        </div>
      </section>
    </main>
  );
};

export default Tienda;