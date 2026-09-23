import { useMemo, useState } from "react";
import CalificacionProducto from "../componentes/CalificacionProducto";

import {
  ArrowLeft,
  BadgePercent,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Download,
  FileDown,
  Gamepad2,
  Home,
  Landmark,
  ShoppingBag,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { productosDigitales } from "../datos/productosDigitales";

/* =========================================================
   CONFIGURACIÓN COMERCIAL
========================================================= */

const DESCUENTO_TRANSFERENCIA = 5;
const CUOTAS_SIN_INTERES = 3;

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
    encontrarDiferencias:
      "Encontrar las diferencias",
    colorear: "Colorear",
    crucigramas: "Crucigramas",

    mascotas: "Mascotas",
    organizacion: "Organización",
    planificadores: "Planificadores",
    registros: "Registros",
    checklists: "Checklists",

    explorarTipo: "Explorar por tipo",

    imprimiblesDestacados:
      "Imprimibles destacados",

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
                  : producto.linea ===
                    filtroActivo;

              return (
                perteneceALinea &&
                producto.categoria ===
                  categoria.id
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
          producto.categoria ===
          categoriaActiva
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
          ENCABEZADO / LOGO ANCHO COMPLETO
      ====================================================== */}

      <section className="border-b border-slate-200 bg-white">
        <div className="w-full">
          <img
            src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/logo%20tienda%20"
            alt="Andrés Imprimibles"
            className="block h-auto w-full object-cover"
          />
        </div>

        <div className="mx-auto max-w-6xl px-5 py-5 text-center sm:py-7">
          <p className="mx-auto max-w-2xl text-sm font-normal leading-6 text-slate-600 sm:text-base">
            {t.descripcion}
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
          className="inline-flex items-center gap-2 text-sm font-normal text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft
            size={17}
            strokeWidth={1.8}
          />

          {t.volver}
        </button>
      </div>

      {/* =====================================================
          FILTROS PRINCIPALES
      ====================================================== */}

      <section className="px-4 pt-4 sm:px-5 sm:pt-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
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
                  className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${
                    activo
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 hover:text-slate-900"
                  }`}
                >
                  {Icono && (
                    <Icono
                      size={15}
                      strokeWidth={1.8}
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
            <div className="mt-5">
              <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-slate-500">
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
                        className={`rounded-md border px-3 py-1.5 text-[10px] font-medium transition-colors sm:px-4 sm:py-2 sm:text-xs ${
                          activa
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-600 hover:border-slate-500 hover:text-slate-900"
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

      <section className="px-4 mb-20 py-8 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-4xl">
          {/* CABECERA */}

          <div className="mb-5">
            <h2 className="text-xl font-medium text-center tracking-tight text-slate-900 sm:text-2xl">
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
                    producto.oferta?.activa ===
                    true;

                  const precioFinal =
                    tieneOferta
                      ? producto.oferta
                          .precioARS
                      : producto.precioARS;

                  const ahorro =
                    tieneOferta
                      ? producto.precioARS -
                        producto.oferta
                          .precioARS
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

                  const precioTransferencia =
                    precioFinal *
                    (1 -
                      DESCUENTO_TRANSFERENCIA /
                        100);

                  const precioCuota =
                    precioFinal /
                    CUOTAS_SIN_INTERES;

                  const nombreProducto =
                    textoEs(producto.nombre);

                  const etiquetaOferta =
                    textoEs(
                      producto.oferta
                        ?.etiqueta
                    );

                  return (
                    <article
                      key={producto.id}
                      className="group flex flex-col overflow-hidden rounded-md border border-slate-200 bg-white transition-colors duration-200 hover:border-slate-400"
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
                            src={
                              producto.imagenes
                                ?.portada
                            }
                            alt={nombreProducto}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        </div>
                      </button>

                      {/* INFORMACIÓN */}

                      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
                        {/* BADGES */}

                        <div className="mb-2 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide text-slate-600 sm:px-2 sm:py-1 sm:text-[10px]">
                            <Download
                              size={10}
                              strokeWidth={1.8}
                              className="shrink-0"
                            />

                            {t.pdf}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-slate-600 sm:px-2 sm:py-1 sm:text-[10px]">
                            <FileDown
                              size={10}
                              strokeWidth={1.8}
                              className="shrink-0"
                            />

                            {t.descargaDigital}
                          </span>
                        </div>

                        {/* TÍTULO */}

                        <h3 className="line-clamp-2 text-[14px] font-normal leading-5 text-slate-900 sm:text-[15px]">
                          {nombreProducto}
                        </h3>

                        {/* RESEÑAS */}

                        <div className="mt-1.5 min-h-[16px] origin-left scale-[0.9]">
                          <CalificacionProducto
                            productoId={
                              producto.id
                            }
                          />
                        </div>

                        {/* PRECIO */}

                        <div className="mt-auto pt-3">
                          {tieneOferta ? (
                            <>
                              {/* PRECIO + ANTERIOR + DESCUENTO */}

                              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                                <p className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl">
                                  {formatearPrecio(
                                    precioFinal
                                  )}
                                </p>

                                <p className="text-xs font-normal text-slate-400 line-through sm:text-sm">
                                  {formatearPrecio(
                                    producto.precioARS
                                  )}
                                </p>

                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 sm:text-xs">
                                  <BadgePercent
                                    size={13}
                                    strokeWidth={1.8}
                                  />

                                  {descuento}% OFF
                                </span>
                              </div>

                              {etiquetaOferta && (
                                <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-orange-700">
                                  {etiquetaOferta}
                                </p>
                              )}
                            </>
                          ) : (
                            <p className="text-xl font-medium tracking-tight text-slate-950 sm:text-2xl">
                              {formatearPrecio(
                                producto.precioARS
                              )}
                            </p>
                          )}
                                                    {/* OPCIONES DE PAGO */}

                          <div className="mt-3 border-t border-slate-200 pt-2.5">
                            {/* TRANSFERENCIA */}

                            <div className="flex items-start gap-2">
                              <Landmark
                                size={14}
                                strokeWidth={1.7}
                                className="mt-0.5 shrink-0 text-slate-500"
                              />

                              <p className="text-[11px] font-normal leading-4 text-slate-600 sm:text-xs">
                                <span className="font-medium text-slate-900">
                                  {
                                    DESCUENTO_TRANSFERENCIA
                                  }
                                  % OFF
                                </span>{" "}
                                con transferencia
                                {" · "}
                                <span className="font-medium text-slate-900">
                                  {formatearPrecio(
                                    precioTransferencia
                                  )}
                                </span>
                              </p>
                            </div>

                            {/* CUOTAS */}

                            <div className="mt-1.5 flex items-start gap-2">
                              <CreditCard
                                size={14}
                                strokeWidth={1.7}
                                className="mt-0.5 shrink-0 text-slate-500"
                              />

                              <p className="text-[11px] font-normal leading-4 text-slate-600 sm:text-xs">
                                <span className="font-medium text-slate-900">
                                  {
                                    CUOTAS_SIN_INTERES
                                  }{" "}
                                  x{" "}
                                  {formatearPrecio(
                                    precioCuota
                                  )}
                                </span>{" "}
                                sin interés
                              </p>
                            </div>
                          </div>

                          {/* BOTÓN */}

                          <button
                            type="button"
                            onClick={() =>
                              navigate(
                                `/tienda/${producto.id}`
                              )
                            }
                            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-slate-800 sm:text-sm"
                          >
                            <ShoppingBag
                              size={14}
                              strokeWidth={1.8}
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

            <div className="mx-auto max-w-xl rounded-md border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
              <Home
                size={30}
                strokeWidth={1.7}
                className="mx-auto text-slate-400"
              />

              <p className="mt-3 text-sm font-normal leading-6 text-slate-500">
                {t.proximamente}
              </p>
            </div>
          )}

          {/* VER TODOS / VER MENOS */}

          {productosFiltrados.length > 3 && (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setMostrarTodos(
                    (actual) => !actual
                  )
                }
                className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-5 py-2.5 text-xs font-medium text-slate-800 transition-colors hover:border-slate-500 hover:bg-slate-50 sm:text-sm"
              >
                {mostrarTodos ? (
                  <>
                    <ChevronUp
                      size={16}
                      strokeWidth={1.8}
                    />

                    {t.verMenos}
                  </>
                ) : (
                  <>
                    <ChevronDown
                      size={16}
                      strokeWidth={1.8}
                    />

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