import { useEffect, useMemo, useState } from "react";
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

import {
  MERCADO_ARGENTINA,
  MERCADO_INTERNACIONAL,
  obtenerPrecioMercado,
  formatearPrecioMercado,
} from "../utilidades/mercado";

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

  const [mercado, setMercado] =
    useState(MERCADO_ARGENTINA);

  const [cargandoMercado, setCargandoMercado] =
    useState(true);

  /* =======================================================
     DETECTAR MERCADO
  ======================================================= */

  useEffect(() => {
    let cancelado = false;

    const detectarMercado = async () => {
      try {
        const parametros = new URLSearchParams(
          window.location.search
        );

        const mercadoPrueba = parametros
          .get("mercado")
          ?.toLowerCase();

        if (
          mercadoPrueba === "internacional"
        ) {
          if (!cancelado) {
            setMercado(
              MERCADO_INTERNACIONAL
            );
            setCargandoMercado(false);
          }

          return;
        }

        if (
          mercadoPrueba === "argentina"
        ) {
          if (!cancelado) {
            setMercado(
              MERCADO_ARGENTINA
            );
            setCargandoMercado(false);
          }

          return;
        }

        const respuesta = await fetch(
          "/api/visitas?accion=mercado"
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudo detectar el mercado."
          );
        }

        const datos = await respuesta.json();

        if (cancelado) {
          return;
        }

        setMercado(
          datos.mercado ===
            MERCADO_INTERNACIONAL
            ? MERCADO_INTERNACIONAL
            : MERCADO_ARGENTINA
        );
      } catch (error) {
        console.error(
          "Error detectando mercado:",
          error
        );

        if (!cancelado) {
          setMercado(
            MERCADO_ARGENTINA
          );
        }
      } finally {
        if (!cancelado) {
          setCargandoMercado(false);
        }
      }
    };

    detectarMercado();

    return () => {
      cancelado = true;
    };
  }, []);

  /* =======================================================
     SEO
  ======================================================= */

  useEffect(() => {
    document.title =
      "Imprimibles y Juegos para Imprimir | Andrés Imprimibles";

    const descripcion =
      "Descubre juegos, actividades y productos digitales imprimibles. Laberintos, crucigramas, sopas de letras y recursos para el hogar y las mascotas.";

    const url =
      "https://andreshousesitter.com/tienda";

    const actualizarMeta = (
      selector,
      atributo,
      contenido
    ) => {
      let elemento =
        document.querySelector(selector);

      if (!elemento) {
        elemento =
          document.createElement("meta");

        if (atributo === "name") {
          elemento.setAttribute(
            "name",
            selector.match(
              /name="([^"]+)"/
            )?.[1] || ""
          );
        } else {
          elemento.setAttribute(
            "property",
            selector.match(
              /property="([^"]+)"/
            )?.[1] || ""
          );
        }

        document.head.appendChild(
          elemento
        );
      }

      elemento.setAttribute(
        "content",
        contenido
      );
    };

    actualizarMeta(
      'meta[name="description"]',
      "name",
      descripcion
    );

    actualizarMeta(
      'meta[property="og:title"]',
      "property",
      "Imprimibles y Juegos para Imprimir | Andrés Imprimibles"
    );

    actualizarMeta(
      'meta[property="og:description"]',
      "property",
      descripcion
    );

    actualizarMeta(
      'meta[property="og:url"]',
      "property",
      url
    );

    let canonical =
      document.querySelector(
        'link[rel="canonical"]'
      );

    if (!canonical) {
      canonical =
        document.createElement("link");

      canonical.setAttribute(
        "rel",
        "canonical"
      );

      document.head.appendChild(
        canonical
      );
    }

    canonical.setAttribute(
      "href",
      url
    );

    return () => {
      document.title =
        "Cuidado de Casas y Mascotas | Andres House Sitter";

      document
        .querySelector(
          'link[rel="canonical"]'
        )
        ?.setAttribute(
          "href",
          "https://andreshousesitter.com/"
        );
    };
  }, []);

  const [filtroActivo, setFiltroActivo] =
    useState("todos");

  const [
    categoriaActiva,
    setCategoriaActiva,
  ] = useState("todos");

  const [
    mostrarTodos,
    setMostrarTodos,
  ] = useState(false);

  /* =======================================================
     TEXTOS
  ======================================================= */

  const t = {
    coleccion:
      "Colección de imprimibles",

    descripcion:
      "Imprimibles digitales para jugar, aprender, organizar y disfrutar en casa.",

    volver: "Volver",

    todos: "Todos",
    juegosActividades:
      "Juegos y actividades",
    hogarMascotas:
      "Hogar y mascotas",

    laberintos: "Laberintos",
    sopaLetras: "Sopa de letras",
    unirPuntos: "Unir los puntos",
    encontrarDiferencias:
      "Encontrar las diferencias",
    colorear: "Colorear",
    crucigramas: "Crucigramas",

    mascotas: "Mascotas",
    organizacion: "Organización",
    planificadores:
      "Planificadores",
    registros: "Registros",
    checklists: "Checklists",

    explorarTipo:
      "Explorar por tipo",

    imprimiblesDestacados:
      "Imprimibles destacados",

    descripcionDestacados:
      "Una selección variada de imprimibles para jugar, aprender y disfrutar en casa.",

    descripcionHogar:
      "Imprimibles prácticos para organizar el hogar y acompañar el cuidado de tus mascotas.",

    ver: "Ver",
    pdf: "PDF",
    descargaDigital:
      "Descarga digital",
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
     PRECIO SEGÚN MERCADO
  ======================================================= */

  const formatearPrecio = (precio) => {
    if (
      precio === null ||
      precio === undefined ||
      Number(precio) <= 0
    ) {
      return "Precio a definir";
    }

    return formatearPrecioMercado(
      Number(precio),
      mercado
    );
  };

  /* =======================================================
     NAVEGACIÓN CONSERVANDO MERCADO DE PRUEBA
  ======================================================= */

  const irAProducto = (productoId) => {
    const parametros =
      new URLSearchParams(
        window.location.search
      );

    const mercadoPrueba =
      parametros.get("mercado");

    const ruta =
      mercadoPrueba
        ? `/tienda/${productoId}?mercado=${encodeURIComponent(
            mercadoPrueba
          )}`
        : `/tienda/${productoId}`;

    navigate(ruta);
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
      nombre:
        t.juegosActividades,
      icono: Gamepad2,
    },
    {
      id: "hogar",
      nombre:
        t.hogarMascotas,
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
        nombre:
          t.encontrarDiferencias,
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
        nombre:
          t.planificadores,
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

  const categoriasVisibles =
    useMemo(() => {
      if (
        filtroActivo === "todos" ||
        !categorias[filtroActivo]
      ) {
        return [];
      }

      const disponibles =
        categorias[
          filtroActivo
        ].filter((categoria) => {
          return productosDigitales.some(
            (producto) => {
              const perteneceALinea =
                filtroActivo ===
                "juegos"
                  ? !producto.linea ||
                    producto.linea ===
                      "juegos"
                  : producto.linea ===
                    filtroActivo;

              return (
                perteneceALinea &&
                producto.categoria ===
                  categoria.id
              );
            }
          );
        });

      if (
        disponibles.length === 0
      ) {
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

  const productosFiltrados =
    useMemo(() => {
      return productosDigitales.filter(
        (producto) => {
          if (
            filtroActivo === "todos"
          ) {
            return true;
          }

          const perteneceALinea =
            filtroActivo === "juegos"
              ? !producto.linea ||
                producto.linea ===
                  "juegos"
              : producto.linea ===
                filtroActivo;

          if (!perteneceALinea) {
            return false;
          }

          if (
            categoriaActiva ===
            "todos"
          ) {
            return true;
          }

          return (
            producto.categoria ===
            categoriaActiva
          );
        }
      );
    }, [
      filtroActivo,
      categoriaActiva,
    ]);

  /* =======================================================
     PRODUCTOS VISIBLES
  ======================================================= */

  const productosMostrados =
    mostrarTodos
      ? productosFiltrados
      : productosFiltrados.slice(
          0,
          3
        );

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
    <main className="min-h-screen bg-[#FCFDFC]">
      {/* =====================================================
          ENCABEZADO / LOGO ANCHO COMPLETO
      ====================================================== */}

      <section className="border-b border-[#DCE5E4] bg-white">
        <div className="w-full">
          <img
            src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/logo%20tienda%20"
            alt="Andrés Imprimibles"
            className="block h-auto w-full object-cover"
          />
        </div>

        <div className="mx-auto max-w-6xl px-5 py-5 text-center sm:py-7">
          <p className="mx-auto max-w-2xl text-sm font-normal leading-6 text-[#687477] sm:text-base">
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
          className="inline-flex items-center gap-2 text-sm font-normal text-[#687477] transition-colors hover:text-[#285861]"
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
                filtroActivo ===
                filtro.id;

              const Icono =
                filtro.icono;

              return (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() =>
                    cambiarFiltro(
                      filtro.id
                    )
                  }
                  className={`inline-flex items-center justify-center gap-2 rounded-md border px-4 py-2 text-xs font-medium transition-colors sm:px-5 sm:text-sm ${
                    activo
                      ? "border-[#285861] bg-[#285861] text-white"
                      : "border-[#DCE5E4] bg-white text-[#536468] hover:border-[#7FA0A3] hover:text-[#285861]"
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

                    {/* =====================================================
              TIPOS DE PRODUCTO
          ====================================================== */}

          {filtroActivo !== "todos" &&
            categoriasVisibles.length > 0 && (
              <div className="mt-5 sm:mt-7">
                <p className="mb-3 text-center text-xs font-medium uppercase tracking-[0.16em] text-[#8A989A]">
                  {t.explorarTipo}
                </p>

                <div className="flex flex-wrap justify-center gap-2">
                  {categoriasVisibles.map(
                    (categoria) => {
                      const activo =
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
                          className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors sm:px-4 sm:text-sm ${
                            activo
                              ? "border-[#285861] bg-[#EDF4F3] text-[#285861]"
                              : "border-[#DCE5E4] bg-white text-[#687477] hover:border-[#9CB4B6] hover:text-[#285861]"
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

      <section className="px-4 pb-12 pt-8 sm:px-5 sm:pb-16 sm:pt-10">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight text-[#26383B] sm:text-3xl">
              {filtroActivo === "hogar"
                ? t.hogarMascotas
                : t.imprimiblesDestacados}
            </h1>

            <p className="mx-auto mt-2 max-w-2xl text-sm font-normal leading-6 text-[#687477] sm:text-base">
              {filtroActivo === "hogar"
                ? t.descripcionHogar
                : t.descripcionDestacados}
            </p>
          </div>

          {/* ===================================================
              CARGANDO MERCADO
          ==================================================== */}

          {cargandoMercado ? (
            <div className="py-16 text-center">
              <p className="text-sm text-[#687477]">
                Cargando productos...
              </p>
            </div>
          ) : productosMostrados.length > 0 ? (
            <>
              {/* =================================================
                  GRILLA
              ================================================== */}

              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {productosMostrados.map(
                  (producto) => {
                    const precioFinal =
                      obtenerPrecioMercado(
                        producto,
                        mercado
                      );

                    const precioNormal =
                      mercado ===
                      MERCADO_ARGENTINA
                        ? Number(
                            producto.precioARS
                          )
                        : Number(
                            producto.precioUSD
                          );

                    const ofertaActiva =
                      mercado ===
                      MERCADO_ARGENTINA
                        ? Boolean(
                            producto.oferta
                              ?.activa
                          ) &&
                          Number(
                            producto.oferta
                              ?.precioARS
                          ) > 0
                        : Boolean(
                            producto.ofertaUSD
                              ?.activa
                          ) &&
                          Number(
                            producto.ofertaUSD
                              ?.precioUSD
                          ) > 0;

                    const etiquetaOferta =
                      mercado ===
                      MERCADO_ARGENTINA
                        ? producto.oferta
                            ?.etiqueta
                        : producto.ofertaUSD
                            ?.etiqueta;

                    const ahorro =
                      ofertaActiva &&
                      precioNormal >
                        precioFinal
                        ? precioNormal -
                          precioFinal
                        : 0;

                    const precioTransferencia =
                      mercado ===
                      MERCADO_ARGENTINA
                        ? Math.round(
                            precioFinal *
                              (1 -
                                DESCUENTO_TRANSFERENCIA /
                                  100)
                          )
                        : 0;

                    const precioCuota =
                      mercado ===
                      MERCADO_ARGENTINA
                        ? precioFinal /
                          CUOTAS_SIN_INTERES
                        : 0;

                    return (
                      <article
                        key={producto.id}
                        className="group flex h-full flex-col overflow-hidden rounded-xl border border-[#DCE5E4] bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                      >
                        {/* ===============================
                            IMAGEN
                        ================================ */}

                        <button
                          type="button"
                          onClick={() =>
                            irAProducto(
                              producto.id
                            )
                          }
                          className="relative block w-full overflow-hidden bg-[#F4F7F6] text-left"
                        >
                          <img
                            src={
                              producto.imagenes
                                ?.portada
                            }
                            alt={textoEs(
                              producto.nombre
                            )}
                            className="aspect-square w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />

                          {ofertaActiva && (
                            <div className="absolute left-3 top-3">
                              <span className="inline-flex items-center gap-1 rounded-md bg-[#285861] px-2.5 py-1 text-xs font-semibold text-white shadow-sm">
                                <BadgePercent
                                  size={14}
                                  strokeWidth={
                                    1.9
                                  }
                                />

                                {etiquetaOferta ||
                                  "Oferta"}
                              </span>
                            </div>
                          )}
                        </button>

                        {/* ===============================
                            CONTENIDO
                        ================================ */}

                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="mb-3 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-md bg-[#F0F5F4] px-2 py-1 text-[11px] font-medium text-[#536468]">
                              <FileDown
                                size={13}
                                strokeWidth={
                                  1.8
                                }
                              />

                              {producto.formato ||
                                t.pdf}
                            </span>

                            <span className="inline-flex items-center gap-1 rounded-md bg-[#F0F5F4] px-2 py-1 text-[11px] font-medium text-[#536468]">
                              <Download
                                size={13}
                                strokeWidth={
                                  1.8
                                }
                              />

                              {t.descargaDigital}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              irAProducto(
                                producto.id
                              )
                            }
                            className="text-left"
                          >
                            <h2 className="text-lg font-semibold leading-6 text-[#26383B] transition-colors group-hover:text-[#285861]">
                              {textoEs(
                                producto.nombre
                              )}
                            </h2>
                          </button>

                          <p className="mt-2 line-clamp-3 text-sm font-normal leading-6 text-[#687477]">
                            {textoEs(
                              producto.descripcion
                            )}
                          </p>

                          {/* ===============================
                              CALIFICACIÓN
                          ================================ */}

                          <div className="mt-3">
                            <CalificacionProducto
                              productoId={
                                producto.id
                              }
                            />
                          </div>

                          {/* ===============================
                              PRECIO
                          ================================ */}

                          <div className="mt-5 border-t border-[#E5ECEB] pt-4">
                            {ofertaActiva &&
                              precioNormal >
                                precioFinal && (
                                <div className="mb-1 flex flex-wrap items-center gap-2">
                                  <span className="text-sm text-[#8A989A] line-through">
                                    {formatearPrecio(
                                      precioNormal
                                    )}
                                  </span>

                                  {ahorro >
                                    0 && (
                                    <span className="text-xs font-medium text-[#3D7568]">
                                      {t.ahorras}{" "}
                                      {formatearPrecio(
                                        ahorro
                                      )}
                                    </span>
                                  )}
                                </div>
                              )}

                            <div className="text-2xl font-semibold tracking-tight text-[#26383B]">
                              {formatearPrecio(
                                precioFinal
                              )}
                            </div>

                            {/* =============================
                                ARGENTINA
                            ============================== */}

                            {mercado ===
                              MERCADO_ARGENTINA && (
                              <div className="mt-3 space-y-2">
                                <div className="flex items-start gap-2 text-xs leading-5 text-[#687477]">
                                  <Landmark
                                    size={15}
                                    strokeWidth={
                                      1.8
                                    }
                                    className="mt-0.5 shrink-0 text-[#527B73]"
                                  />

                                  <span>
                                    <strong className="font-medium text-[#42575B]">
                                      {
                                        DESCUENTO_TRANSFERENCIA
                                      }
                                      % OFF
                                    </strong>{" "}
                                    con
                                    transferencia:{" "}
                                    <strong className="font-semibold text-[#285861]">
                                      {formatearPrecio(
                                        precioTransferencia
                                      )}
                                    </strong>
                                  </span>
                                </div>

                                <div className="flex items-start gap-2 text-xs leading-5 text-[#687477]">
                                  <CreditCard
                                    size={15}
                                    strokeWidth={
                                      1.8
                                    }
                                    className="mt-0.5 shrink-0 text-[#527B73]"
                                  />

                                  <span>
                                    Hasta{" "}
                                    <strong className="font-medium text-[#42575B]">
                                      {
                                        CUOTAS_SIN_INTERES
                                      }{" "}
                                      cuotas sin
                                      interés
                                    </strong>{" "}
                                    de{" "}
                                    <strong className="font-semibold text-[#285861]">
                                      {formatearPrecio(
                                        precioCuota
                                      )}
                                    </strong>
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ===============================
                              BOTÓN
                          ================================ */}

                          <div className="mt-auto pt-5">
                            <button
                              type="button"
                              onClick={() =>
                                irAProducto(
                                  producto.id
                                )
                              }
                              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#285861] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#214B52]"
                            >
                              <ShoppingBag
                                size={17}
                                strokeWidth={
                                  1.8
                                }
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

              {/* =================================================
                  VER TODOS / VER MENOS
              ================================================== */}

              {productosFiltrados.length >
                3 && (
                <div className="mt-8 flex justify-center">
                  <button
                    type="button"
                    onClick={() =>
                      setMostrarTodos(
                        (valor) =>
                          !valor
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-md border border-[#BFCFCD] bg-white px-5 py-2.5 text-sm font-medium text-[#536468] transition-colors hover:border-[#7FA0A3] hover:text-[#285861]"
                  >
                    {mostrarTodos ? (
                      <>
                        <ChevronUp
                          size={17}
                          strokeWidth={
                            1.8
                          }
                        />

                        {t.verMenos}
                      </>
                    ) : (
                      <>
                        <ChevronDown
                          size={17}
                          strokeWidth={
                            1.8
                          }
                        />

                        {t.verTodos}
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          ) : (
            /* ===================================================
                SIN PRODUCTOS
            ==================================================== */

            <div className="rounded-xl border border-dashed border-[#C8D6D4] bg-white px-5 py-12 text-center">
              <ShoppingBag
                size={32}
                strokeWidth={1.5}
                className="mx-auto text-[#8AA2A4]"
              />

              <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-[#687477]">
                {t.proximamente}
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Tienda;