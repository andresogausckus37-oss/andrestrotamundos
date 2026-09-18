import { useMemo, useState } from "react";

import CalificacionProducto from "../componentes/CalificacionProducto";

import {
  ArrowLeft,
  Baby,
  ChevronDown,
  ChevronUp,
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

  const [mostrarTodos, setMostrarTodos] =
    useState(false);

  /* =======================================================
     PRODUCTOS FILTRADOS
  ======================================================= */

  const productosFiltrados = useMemo(() => {
    if (filtroActivo === "hogar") {
      return productosDigitales.filter(
        (producto) => producto.linea === "hogar"
      );
    }

    if (filtroActivo === "juegos") {
      return productosDigitales.filter(
        (producto) =>
          !producto.linea ||
          producto.linea === "juegos"
      );
    }

    return productosDigitales;
  }, [filtroActivo]);

  /* =======================================================
     PRODUCTOS VISIBLES
  ======================================================= */

  const productosMostrados = mostrarTodos
    ? productosFiltrados
    : productosFiltrados.slice(0, 3);

  /* =======================================================
     CAMBIAR FILTRO
  ======================================================= */

  const cambiarFiltro = (id) => {
    setFiltroActivo(id);
    setMostrarTodos(false);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white px-5 py-8 sm:py-12">
        <div className="mx-auto max-w-6xl text-center">
          {/* LOGO */}

          <img
            src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logo-andres-imprimibles"
            alt="Andres Imprimibles"
            className="mx-auto h-auto w-full max-w-[200px] object-contain sm:max-w-[320px]"
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
          FILTROS
      ====================================================== */}

      <section className="px-4 pt-2 sm:px-5 sm:pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
            {FILTROS.map((filtro) => {
              const activo =
                filtroActivo === filtro.id;

              const Icono = filtro.icono;

              return (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() =>
                    cambiarFiltro(filtro.id)
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition sm:px-5 sm:text-sm ${
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

      <section className="px-4 py-8 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-4xl">
          {/* CABECERA */}

          <div className="mx-auto mb-5 max-w-2xl text-center">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {filtroActivo === "hogar"
                ? "Hogar y mascotas"
                : "Imprimibles destacados"}
            </h2>

            <p className="mx-auto mt-1.5 max-w-xl text-sm leading-5 text-slate-500 sm:text-sm">
              {filtroActivo === "hogar"
                ? "Recursos imprimibles para organizar el hogar, las mascotas y la información importante."
                : "Una selección de nuestros imprimibles para jugar, organizar y disfrutar en casa."}
            </p>
          </div>

          {/* =================================================
              PRODUCTOS
          ================================================== */}

          {productosMostrados.length > 0 ? (
            <div className="space-y-2.5 sm:space-y-3">
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
                  tieneOferta && producto.precioARS
                    ? Math.round(
                        (ahorro /
                          producto.precioARS) *
                          100
                      )
                    : 0;

                return (
                  <article
                    key={producto.id}
                    className="group flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md"
                  >
                    {/* =========================================
                        IMAGEN
                    ========================================== */}

                    <button
                      type="button"
                      onClick={() =>
                        navigate(
                          `/tienda/${producto.id}`
                        )
                      }
                      className="w-[105px] shrink-0 bg-slate-50 sm:w-[130px]"
                      aria-label={`Ver ${producto.nombre}`}
                    >
                      <div className="flex h-full min-h-[150px] items-center justify-center p-2 sm:min-h-[170px]">
                        <img
                          src={
                            producto.imagenes
                              ?.portada
                          }
                          alt={producto.nombre}
                          className="h-full max-h-[150px] w-full object-contain transition duration-300 group-hover:scale-[1.02] sm:max-h-[165px]"
                        />
                      </div>
                    </button>

                    {/* =========================================
                        INFORMACIÓN
                    ========================================== */}

                    <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">
                      {/* BADGES */}

                      <div className="flex flex-wrap items-center gap-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-sky-700 sm:text-[9px]">
                          <Download
                            size={9}
                            className="shrink-0"
                          />

                          PDF
                        </span>

                        {producto.linea ===
                        "hogar" ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-emerald-700 sm:text-[9px]">
                            <Home
                              size={9}
                              className="shrink-0"
                            />

                            Hogar
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-semibold uppercase text-violet-700 sm:text-[9px]">
                            <Baby
                              size={9}
                              className="shrink-0"
                            />

                            Infantil
                          </span>
                        )}
                      </div>

                      {/* RESEÑAS */}

                      <div className="mt-1 min-h-[16px] origin-left scale-[0.9]">
                        <CalificacionProducto
                          productoId={producto.id}
                        />
                      </div>

                      {/* TÍTULO */}

                      <h3 className="mt-1 line-clamp-2 text-[12px] font-semibold leading-4 text-slate-900 sm:text-sm sm:leading-5">
                        {producto.nombre}
                      </h3>

                      {/* =======================================
                          PRECIO
                      ======================================== */}

                      <div className="mt-auto pt-2">
                        {tieneOferta ? (
                          <>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <p className="text-sm font-bold text-slate-900 sm:text-base">
                                {formatearPrecio(
                                  precioFinal
                                )}
                              </p>

                              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700">
                                -{descuento}%
                              </span>
                            </div>

                            <div className="mt-0.5 flex flex-wrap items-center gap-x-2">
                              <p className="text-[9px] text-slate-400 line-through sm:text-[10px]">
                                {formatearPrecio(
                                  producto.precioARS
                                )}
                              </p>

                              <p className="text-[9px] font-medium text-emerald-700 sm:text-[10px]">
                                Ahorrás{" "}
                                {formatearPrecio(
                                  ahorro
                                )}
                              </p>
                            </div>

                            {producto.oferta
                              ?.etiqueta && (
                              <p className="mt-1 text-[8px] font-bold uppercase tracking-wide text-orange-600 sm:text-[9px]">
                                {
                                  producto.oferta
                                    .etiqueta
                                }
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="text-sm font-bold text-slate-900 sm:text-base">
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
                          className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[10px] font-semibold text-white transition hover:bg-sky-700 sm:text-xs"
                        >
                          <ShoppingBag
                            size={12}
                            className="shrink-0"
                          />

                          Ver producto
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* =================================================
               SIN PRODUCTOS
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
              VER TODOS / VER MENOS
          ================================================== */}

          {productosFiltrados.length > 3 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setMostrarTodos(
                    (actual) => !actual
                  )
                }
                className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-800 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 sm:text-sm"
              >
                {mostrarTodos ? (
                  <>
                    <ChevronUp size={16} />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    Ver todos
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Tienda;