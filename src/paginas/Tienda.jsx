import { useMemo, useState } from "react";
import CalificacionProducto from "../componentes/CalificacionProducto";

import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Download,
  FileDown,
  Gamepad2,
  Home,
  ShoppingBag,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { productosDigitales } from "../datos/productosDigitales";

/* =========================================================
   TIENDA
========================================================= */

const Tienda = () => {
  const navigate = useNavigate();

  const [filtroActivo, setFiltroActivo] =
    useState("todos");

  const [categoriaActiva, setCategoriaActiva] =
    useState("todos");

  const [mostrarTodos, setMostrarTodos] =
    useState(false);

  /* =======================================================
     TEXTOS
  ======================================================= */

  const t = {
    coleccion: "Colección de imprimibles",
    descripcion:
      "Imprimibles digitales para jugar, aprender, organizar y disfrutar en casa.",

    volver: "Volver",

    todos: "Todos",
    juegosActividades: "Juegos y actividades",
    hogarMascotas: "Hogar y mascotas",

    laberintos: "Laberintos",
    sopaLetras: "Sopa de letras",
    unirPuntos: "Unir los puntos",
    encontrarDiferencias: "Encontrar las diferencias",
    colorear: "Colorear",
    crucigramas: "Crucigramas",

    mascotas: "Mascotas",
    organizacion: "Organización",
    planificadores: "Planificadores",
    registros: "Registros",
    checklists: "Checklists",

    explorarTipo: "Explorar por tipo",

    imprimiblesDestacados: "Imprimibles destacados",
    descripcionDestacados:
      "Una selección variada de imprimibles para jugar, aprender y disfrutar en casa.",

    descripcionHogar:
      "Imprimibles prácticos para organizar el hogar y acompañar el cuidado de tus mascotas.",

    ver: "Ver",
    pdf: "PDF",
    descargaDigital: "Descarga digital",
    hogar: "Hogar",
    infantil: "Infantil",
    ahorras: "Ahorras",
    verProducto: "Ver producto",

    proximamente:
      "Próximamente agregaremos nuevos productos en esta categoría.",

    verTodos: "Ver todos",
    verMenos: "Ver menos",
  };

  /* =======================================================
     TEXTO ESPAÑOL
     Compatible temporalmente con productos antiguos
     que todavía tengan { es, en }.
  ======================================================= */

  const textoEs = (valor) => {
    if (typeof valor === "string") {
      return valor;
    }

    return valor?.es || "";
  };

  /* =======================================================
     FORMATEAR PRECIO
  ======================================================= */

  const formatearPrecio = (precioARS) => {
    if (!precioARS) {
      return "Precio a definir";
    }

    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precioARS);
  };

  /* =======================================================
     FILTROS PRINCIPALES
  ======================================================= */

  const filtros = [
    {
      id: "todos",
      nombre: t.todos,
    },
    {
      id: "juegos",
      nombre: t.juegosActividades,
      icono: Gamepad2,
    },
    {
      id: "hogar",
      nombre: t.hogarMascotas,
      icono: Home,
    },
  ];

  /* =======================================================
     CATEGORÍAS
  ======================================================= */

  const categorias = {
    juegos: [
      {
        id: "laberintos",
        nombre: t.laberintos,
      },
      {
        id: "sopa-de-letras",
        nombre: t.sopaLetras,
      },
      {
        id: "unir-los-puntos",
        nombre: t.unirPuntos,
      },
      {
        id: "encontrar-diferencias",
        nombre: t.encontrarDiferencias,
      },
      {
        id: "colorear",
        nombre: t.colorear,
      },
      {
        id: "crucigramas",
        nombre: t.crucigramas,
      },
    ],

    hogar: [
      {
        id: "mascotas",
        nombre: t.mascotas,
      },
      {
        id: "organizacion",
        nombre: t.organizacion,
      },
      {
        id: "planificadores",
        nombre: t.planificadores,
      },
      {
        id: "registros",
        nombre: t.registros,
      },
      {
        id: "checklists",
        nombre: t.checklists,
      },
    ],
  };

  /* =======================================================
     CATEGORÍAS VISIBLES
  ======================================================= */

  const categoriasVisibles = useMemo(() => {
    if (
      filtroActivo === "todos" ||
      !categorias[filtroActivo]
    ) {
      return [];
    }

    const disponibles =
      categorias[filtroActivo].filter(
        (categoria) => {
          return productosDigitales.some(
            (producto) => {
              const perteneceALinea =
                filtroActivo === "juegos"
                  ? !producto.linea ||
                    producto.linea === "juegos"
                  : producto.linea === filtroActivo;

              return (
                perteneceALinea &&
                producto.categoria === categoria.id
              );
            }
          );
        }
      );

    if (disponibles.length === 0) {
      return [];
    }

    return [
      {
        id: "todos",
        nombre: t.todos,
      },
      ...disponibles,
    ];
  }, [filtroActivo]);

  /* =======================================================
     PRODUCTOS FILTRADOS
  ======================================================= */

  const productosFiltrados = useMemo(() => {
    return productosDigitales.filter(
      (producto) => {
        if (filtroActivo === "todos") {
          return true;
        }

        const perteneceALinea =
          filtroActivo === "juegos"
            ? !producto.linea ||
              producto.linea === "juegos"
            : producto.linea === filtroActivo;

        if (!perteneceALinea) {
          return false;
        }

        if (categoriaActiva === "todos") {
          return true;
        }

        return (
          producto.categoria === categoriaActiva
        );
      }
    );
  }, [filtroActivo, categoriaActiva]);

  /* =======================================================
     PRODUCTOS VISIBLES
  ======================================================= */

  const productosMostrados =
    mostrarTodos
      ? productosFiltrados
      : productosFiltrados.slice(0, 3);

  /* =======================================================
     CAMBIAR FILTRO PRINCIPAL
  ======================================================= */

  const cambiarFiltro = (id) => {
    setFiltroActivo(id);
    setCategoriaActiva("todos");
    setMostrarTodos(false);
  };

  /* =======================================================
     CAMBIAR CATEGORÍA
  ======================================================= */

  const cambiarCategoria = (id) => {
    setCategoriaActiva(id);
    setMostrarTodos(false);
  };

  return (
    <main className="min-h-screen bg-white">
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white px-5 py-4 sm:py-12">
        <div className="mx-auto max-w-6xl text-center">
          <img
            src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logo-andres-imprimibles"
            alt="Andrés Imprimibles"
            className="mx-auto h-auto w-full max-w-[150px] object-contain sm:max-w-[320px]"
          />


          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            {t.descripcion}
          </p>
        </div>
      </section>

      {/* =====================================================
          VOLVER
      ====================================================== */}

      <div className="mx-auto max-w-6xl px-5 pt-2">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-600"
        >
          <ArrowLeft size={17} />
          {t.volver}
        </button>
      </div>

      {/* =====================================================
          FILTROS PRINCIPALES
      ====================================================== */}

      <section className="px-4 pt-2 sm:px-5 sm:pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-3">
            {filtros.map((filtro) => {
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

          {/* =================================================
              TIPOS DE PRODUCTO
          ================================================== */}

          {categoriasVisibles.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {t.explorarTipo}
              </p>

              <div className="flex flex-wrap justify-center gap-2">
                {categoriasVisibles.map(
                  (categoria) => {
                    const activa =
                      categoriaActiva ===
                      categoria.id;

                    return (
                      <button
                        key={categoria.id}
                        type="button"
                        onClick={() =>
                          cambiarCategoria(
                            categoria.id
                          )
                        }
                        className={`rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition sm:px-4 sm:py-2 sm:text-xs ${
                          activa
                            ? "border-slate-800 bg-slate-800 text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700"
                        }`}
                      >
                        {categoria.nombre}
                      </button>
                    );
                  }
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* =====================================================
          PRODUCTOS
      ====================================================== */}

      <section className="px-4 py-8 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-4xl">
          {/* CABECERA */}

          <div className="mx-auto mb-5 max-w-2xl text-left">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
              {filtroActivo === "hogar"
                ? t.hogarMascotas
                : t.imprimiblesDestacados}
            </h2>

            
          </div>

          {/* PRODUCTOS */}

          {productosMostrados.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {productosMostrados.map(
                (producto) => {
                  const tieneOferta =
                    producto.oferta?.activa === true;

                  const precioFinal =
                    tieneOferta
                      ? producto.oferta.precioARS
                      : producto.precioARS;

                  const ahorro =
                    tieneOferta
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

                  const nombreProducto =
                    textoEs(producto.nombre);

                  const etiquetaOferta =
                    textoEs(
                      producto.oferta?.etiqueta
                    );

                  return (
                    <article
                      key={producto.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:border-slate-300 hover:shadow-md"
                    >
                      {/* IMAGEN */}

                      <button
                        type="button"
                        onClick={() =>
                          navigate(
                            `/tienda/${producto.id}`
                          )
                        }
                        className="w-full bg-slate-50"
                        aria-label={`${t.ver} ${nombreProducto}`}
                      >
                        <div className="flex aspect-square w-full items-center justify-center overflow-hidden bg-slate-50">
  <img
    src={producto.imagenes?.portada}
    alt={nombreProducto}
    className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
  />
</div>
                      </button>

                      {/* INFORMACIÓN */}

                      <div className="flex min-w-0 flex-1 flex-col p-1 sm:p-3">
                        {/* BADGES */}

                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold uppercase text-sky-700 sm:text-[9px]">
                            <Download
                              size={9}
                              className="shrink-0"
                            />
                            {t.pdf}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-1.5 text-[11px] font-semibold uppercase text-amber-700 sm:text-[9px]">
                            <FileDown
                              size={9}
                              className="shrink-0"
                            />
                            {t.descargaDigital}
                          </span>

                          
                        </div>                     
                        {/* TÍTULO */}

                        <h3 className="mt-1 line-clamp-2 text-[14px] font-normal leading-4 text-slate-900 sm:text-sm sm:leading-5">
                          {nombreProducto}
                        </h3>

                        {/* RESEÑAS */}

                        <div className="mt-1 min-h-[16px] origin-left scale-[0.9]">
                          <CalificacionProducto
                            productoId={
                              producto.id
                            }
                          />
                        </div>
                                                {/* PRECIO */}

<div className="mt-auto pt-2">
  {tieneOferta ? (
    <>
      {/* FILA 1: PRECIO OFERTA + PRECIO ORIGINAL */}

      <div className="flex items-center gap-3">
        <p className="text-2xl font-medium text-slate-900 sm:text-2xl">
          {formatearPrecio(precioFinal)}
        </p>

        <p className="text-sm font-medium text-slate-400 line-through sm:text-base">
          {formatearPrecio(producto.precioARS)}
        </p>
      </div>

      {/* FILA 2: DESCUENTO + AHORRO */}

      <div className="mb-4 mt-0.5 flex flex-col items-start">
        <p className="text-[14px] font-normal leading-4 text-slate-900 sm:text-sm sm:leading-5">
          {descuento}% de descuento
        </p>

        
      </div>

      {/* ETIQUETA OFERTA */}

      {etiquetaOferta && (
        <p className="mt-1.5 text-[9px] font-bold uppercase tracking-wide text-orange-600 sm:text-[10px]">
          {etiquetaOferta}
        </p>
      )}
    </>
  ) : (
    <p className="text-xl font-bold text-slate-900 sm:text-2xl">
      {formatearPrecio(producto.precioARS)}
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
                            className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-sky-600 px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-sky-700 sm:text-xs"
                          >
                            <ShoppingBag
                              size={12}
                              className="shrink-0"
                            />

                            {t.verProducto}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                }
              )}
            </div>
          ) : (
            /* SIN PRODUCTOS */

            <div className="mx-auto max-w-xl rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <Home
                size={30}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {t.proximamente}
              </p>
            </div>
          )}

          {/* VER TODOS / VER MENOS */}

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
                    {t.verMenos}
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} />
                    {t.verTodos}
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