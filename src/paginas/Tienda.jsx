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

import {
  MERCADO_ARGENTINA,
  MERCADO_INTERNACIONAL,
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

    /* =======================================================
     PRODUCTOS MONGODB
  ======================================================= */

  const [productosMongo, setProductosMongo] =
    useState([]);

  useEffect(() => {
    let cancelado = false;

    const cargarProductosMongo = async () => {
      try {
        const respuesta = await fetch(
          "/api/admin/pedidos?accion=productos-publicos"
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudieron cargar los productos."
          );
        }

        const datos = await respuesta.json();

        if (!cancelado) {
          setProductosMongo(
            Array.isArray(datos.productos)
              ? datos.productos
              : []
          );
        }
      } catch (error) {
        console.error(
          "Error cargando productos de MongoDB:",
          error
        );
      }
    };

    cargarProductosMongo();

    return () => {
      cancelado = true;
    };
  }, []);

  const productosTienda = productosMongo;

  /* =======================================================
     RELOJ GLOBAL — OFERTAS Y PRODUCTOS NUEVOS
  ======================================================= */

  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => {
      window.clearInterval(intervalo);
    };
  }, []);

  const DURACION_NUEVO_PRODUCTO_MS =
    72 * 60 * 60 * 1000;

  const obtenerTiempoRestante = (finalizaEn) => {
    const final = new Date(finalizaEn).getTime();

    if (!Number.isFinite(final)) {
      return null;
    }

    const diferencia = final - ahora;

    if (diferencia <= 0) {
      return null;
    }

    const totalSegundos = Math.floor(
      diferencia / 1000
    );

    const dias = Math.floor(
      totalSegundos / 86400
    );
    const horas = Math.floor(
      (totalSegundos % 86400) / 3600
    );
    const minutos = Math.floor(
      (totalSegundos % 3600) / 60
    );
    const segundos = totalSegundos % 60;

    return {
      dias,
      horas,
      minutos,
      segundos,
    };
  };

  /* =======================================================
     MERCADO
  ======================================================= */

  const [mercado, setMercado] =
    useState(MERCADO_ARGENTINA);

  const [cargandoMercado, setCargandoMercado] =
    useState(true);

  useEffect(() => {
    let cancelado = false;

    const detectarMercado = async () => {
      try {
        const parametros =
          new URLSearchParams(
            window.location.search
          );

        const mercadoPrueba =
          parametros
            .get("mercado")
            ?.toLowerCase();

        if (
          mercadoPrueba ===
          "internacional"
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
          mercadoPrueba ===
          "argentina"
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

        const datos =
          await respuesta.json();

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

  useEffect(() => {
    document.title =
      "Imprimibles y Juegos para Imprimir | Andrés Imprimibles";

    const descripcion =
      "Descubre juegos, actividades y productos digitales imprimibles. Laberintos, crucigramas, sopas de letras y recursos para el hogar y las mascotas.";

    const url =
      "https://andreshousesitter.com/tienda";

    const actualizarMeta = (selector, atributo, contenido) => {
      let elemento = document.querySelector(selector);

      if (!elemento) {
        elemento = document.createElement("meta");

        if (atributo === "name") {
          elemento.setAttribute(
            "name",
            selector.match(/name="([^"]+)"/)?.[1] || ""
          );
        } else {
          elemento.setAttribute(
            "property",
            selector.match(/property="([^"]+)"/)?.[1] || ""
          );
        }

        document.head.appendChild(elemento);
      }

      elemento.setAttribute("content", contenido);
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
      document.querySelector('link[rel="canonical"]');

    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }

    canonical.setAttribute("href", url);

    return () => {
      document.title =
        "Cuidado de Casas y Mascotas | Andres House Sitter";

      document
        .querySelector('link[rel="canonical"]')
        ?.setAttribute(
          "href",
          "https://andreshousesitter.com/"
        );
    };
  }, []);

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
    rompecabezas: "Rompecabezas",

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

  const formatearPrecio = (precio) => {
    if (!precio) {
      return "Precio a definir";
    }

    return formatearPrecioMercado(
      Number(precio),
      mercado
    );
  };

  /* =======================================================
     NAVEGAR A PRODUCTO
  ======================================================= */

  const irAProducto = (productoId) => {
    const parametros =
      new URLSearchParams(
        window.location.search
      );

    const mercadoPrueba =
      parametros
        .get("mercado")
        ?.toLowerCase();

    if (
      mercadoPrueba === "internacional" ||
      mercadoPrueba === "argentina"
    ) {
      navigate(
        `/tienda/${productoId}?mercado=${mercadoPrueba}`
      );

      return;
    }

    navigate(
      `/tienda/${productoId}`
    );
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
  id: "rompecabezas",
  nombre: t.rompecabezas,
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
          return productosTienda.some(
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
  }, [filtroActivo, productosTienda]);

  /* =======================================================
     PRODUCTOS FILTRADOS
  ======================================================= */

  const productosFiltrados = useMemo(() => {
  return productosTienda.filter(
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
  }, [
  filtroActivo,
      categoriaActiva,
  productosTienda,
]);
  /* =======================================================
     PRODUCTOS VISIBLES
  ======================================================= */

  const productosMostrados =
    mostrarTodos
        ? productosFiltrados
      : productosFiltrados.slice(0, 5);

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

          {/* =================================================
              TIPOS DE PRODUCTO
          ================================================== */}

          {categoriasVisibles.length > 0 && (
            <div className="mt-5">
              <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A7966]">
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
                            ? "border-[#285861] bg-[#285861] text-white"
                            : "border-[#E4DDD3] bg-[#F7F2EB] text-[#756451] hover:border-[#B59672] hover:text-[#5E4C39]"
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

      <section className="mb-20 px-4 py-8 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-4xl">

          {/* CABECERA */}

          <div className="mb-5">
            <h2 className="text-center text-xl font-medium tracking-tight text-[#263238] sm:text-2xl">
              {filtroActivo === "hogar"
                ? t.hogarMascotas
                : t.imprimiblesDestacados}
            </h2>
          </div>

          {/* PRODUCTOS */}

          {productosMostrados.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {productosMostrados.map(
                (producto) => {
                  const esArgentina =
                    mercado ===
                    MERCADO_ARGENTINA;

                  const ofertaActual =
                    esArgentina
                      ? producto.oferta
                      : producto.ofertaUSD;

                  const precioNormal =
                    esArgentina
                      ? Number(
                          producto.precioARS
                        )
                      : Number(
                          producto.precioUSD
                        );

                  const precioOferta =
                    esArgentina
                      ? Number(
                          producto.oferta
                            ?.precioARS
                        )
                      : Number(
                          producto.ofertaUSD
                            ?.precioUSD
                        );

                  const finalizaOferta =
                    producto.ofertaLanzamiento
                      ?.finalizaEn;

                  const ofertaDentroDePlazo =
                    finalizaOferta
                      ? new Date(
                          finalizaOferta
                        ).getTime() > ahora
                      : true;

                  const tieneOferta =
                    ofertaActual?.activa ===
                      true &&
                    Number.isFinite(
                      precioOferta
                    ) &&
                    precioOferta > 0 &&
                    ofertaDentroDePlazo;

                  const precioFinal =
                    tieneOferta
                      ? precioOferta
                      : precioNormal;

                  const tiempoRestante =
                    tieneOferta &&
                    finalizaOferta
                      ? obtenerTiempoRestante(
                          finalizaOferta
                        )
                      : null;

                  const fechaCreacion =
                    new Date(
                      producto.creadoEn
                    ).getTime();

                  const esNuevoProducto =
                    Number.isFinite(
                      fechaCreacion
                    ) &&
                    ahora >= fechaCreacion &&
                    ahora - fechaCreacion <
                      DURACION_NUEVO_PRODUCTO_MS;

                  const ahorro =
                    tieneOferta
                      ? precioNormal -
                        precioFinal
                      : 0;

                  const descuento =
                    tieneOferta &&
                    precioNormal
                      ? Math.round(
                          (ahorro /
                            precioNormal) *
                            100
                        )
                      : 0;

                  const precioTransferencia =
                    esArgentina
                      ? precioFinal *
                        (1 -
                          DESCUENTO_TRANSFERENCIA /
                            100)
                      : 0;

                  const precioCuota =
                    esArgentina
                      ? precioFinal /
                        CUOTAS_SIN_INTERES
                      : 0;

                  const nombreProducto =
                    textoEs(
                      producto.nombre
                    );

                  const etiquetaOferta =
                    textoEs(
                      ofertaActual
                        ?.etiqueta
                    );

                  return (
                    <article
                      key={producto.id}
                      className="group flex w-full overflow-hidden rounded-md border border-[#DCE5E4] bg-white transition-colors duration-200 hover:border-[#8EAAAC]"
                    >
                      {/* IMAGEN */}

                      <button
                        type="button"
                        onClick={() =>
                          irAProducto(producto.id)
                        }
                        className="w-[42%] max-w-[180px] shrink-0 bg-[#F7FAFA] sm:w-[180px] sm:max-w-none"
                        aria-label={`${t.ver} ${nombreProducto}`}
                      >
                        <div className="aspect-[4/5] w-full overflow-hidden bg-[#F7FAFA] flex items-center justify-center">
                          <img
                            src={
                              producto.imagenes
                                ?.portada
                            }
                            alt={nombreProducto}
                            className="h-full w-full object-contain object-center transition duration-300 group-hover:scale-[1.02]"
                          />
                        </div>
                      </button>

                      {/* INFORMACIÓN */}

                      <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-3">

                        {/* BADGES */}

                        <div className="mb-1 flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-md border border-[#D9E6E7] bg-[#EEF5F5] px-1 py-0.5 text-[8px] font-medium uppercase tracking-wide text-[#285861] sm:px-2 sm:py-1 sm:text-[10px]">
                            <Download
                              size={10}
                              strokeWidth={
                                1.8
                              }
                              className="shrink-0"
                            />

                            {t.pdf}
                          </span>

                          <span className="inline-flex items-center gap-1 rounded-md border border-[#E4DDD3] bg-[#F7F2EB] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-[#756451] sm:px-2 sm:py-1 sm:text-[10px]">
                            <FileDown
                              size={10}
                              strokeWidth={
                                1.8
                              }
                              className="shrink-0"
                            />

                            {esNuevoProducto
                              ? "¡NUEVO!"
                              : t.descargaDigital}
                          </span>
                        </div>

                        {/* TÍTULO */}

                        <h3 className="line-clamp-2 text-[14px] font-normal leading-[1.15rem] text-[#263238] sm:text-[15px] sm:leading-5">
                          {nombreProducto}
                        </h3>

                        {/* RESEÑAS */}

                        <div className="mt-0.5 min-h-[14px] origin-left scale-[0.85]">
                          <CalificacionProducto
                            productoId={
                              producto.id
                            }
                          />
                        </div>

                        {/* PRECIO */}

                        <div className="flex flex-1 flex-col pt-1.5">
                          {tieneOferta ? (
                            <>
                              {/* PRECIO + ANTERIOR + DESCUENTO */}

                              <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                                <p className="text-base font-medium tracking-tight text-[#263238] sm:text-xl">
                                  {formatearPrecio(
                                    precioFinal
                                  )}
                                </p>

                                <p className="text-xs font-normal text-slate-400 line-through sm:text-sm">
                                  {formatearPrecio(
                                    precioNormal
                                  )}
                                </p>

                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700 sm:text-xs">
                                  <BadgePercent
                                    size={13}
                                    strokeWidth={
                                      1.8
                                    }
                                  />

                                  {descuento}%
                                  OFF
                                </span>
                              </div>

                              {etiquetaOferta && (
                                <p className="mt-0.5 text-[9px] font-medium uppercase tracking-[0.06em] text-orange-700">
                                  {
                                    etiquetaOferta
                                  }
                                </p>
                              )}

                              {tiempoRestante && (
                                <div className="mt-1 inline-flex max-w-full items-center rounded-md border border-black bg-white px-1.5 py-0.5">
  <span className="text-[10px] font-medium leading-4 text-black sm:text-[11px]">
                                    Finaliza en{" "}
                                    {tiempoRestante.dias >
                                      0 &&
                                      `${tiempoRestante.dias}d `}
                                    {String(
                                      tiempoRestante.horas
                                    ).padStart(
                                      2,
                                      "0"
                                    )}
                                    h{" "}
                                    {String(
                                      tiempoRestante.minutos
                                    ).padStart(
                                      2,
                                      "0"
                                    )}
                                    m{" "}
                                    {String(
                                      tiempoRestante.segundos
                                    ).padStart(
                                      2,
                                      "0"
                                    )}
                                    s
                                  </span>
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-base font-medium tracking-tight text-[#263238] sm:text-xl">
                              {formatearPrecio(
                                precioFinal
                              )}
                            </p>
                          )}

                          <div className="mt-auto pt-1.5">
                            {/* OPCIONES DE PAGO */}

                            {esArgentina && (
                            <div className="border-t border-[#E3E8E7] pt-1.5">

                              {/* TRANSFERENCIA */}

                              <div className="flex items-start gap-1.5">
                                <Landmark
                                  size={14}
                                  strokeWidth={
                                    1.7
                                  }
                                  className="mt-0.5 shrink-0 text-[#285861]"
                                />

                                <p className="text-[10px] font-normal leading-[0.9rem] text-[#687477] sm:text-[11px] sm:leading-4">
                                  <span className="font-medium text-[#285861]">
                                    {
                                      DESCUENTO_TRANSFERENCIA
                                    }
                                    % OFF
                                  </span>{" "}
                                  con
                                  transferencia
                                  {" · "}
                                  <span className="font-medium text-[#263238]">
                                    {formatearPrecio(
                                      precioTransferencia
                                    )}
                                  </span>
                                </p>
                              </div>

                              {/* CUOTAS */}

                              <div className="mt-1 flex items-start gap-1.5">
                                <CreditCard
                                  size={14}
                                  strokeWidth={
                                    1.7
                                  }
                                  className="mt-0.5 shrink-0 text-[#B59672]"
                                />

                                <p className="text-[10px] font-normal leading-[0.9rem] text-[#687477] sm:text-[11px] sm:leading-4">
                                  <span className="font-medium text-[#263238]">
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
                          )}

                              {/* BOTÓN */}

                                                        <button
                                                          type="button"
                                                          onClick={() =>
                                                            irAProducto(
                                                              producto.id
                                                            )
                                                          }
                                                          className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-[#285861] px-2.5 py-1.5 text-[10px] font-medium text-white transition-colors hover:bg-[#204850] sm:px-3 sm:py-2 sm:text-xs"
                                                        >
                                                          <ShoppingBag
                                                            size={14}
                                                            strokeWidth={
                                                              1.8
                                                            }
                                                            className="shrink-0"
                                                          />

                                                          {t.verProducto}
                                                        </button>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </article>
                                                );
                                              }
                                            )}
                                          </div>
                                        ) : (
                                          /* SIN PRODUCTOS */

                                          <div className="mx-auto max-w-xl rounded-md border border-dashed border-[#D6DFDE] bg-[#F7FAFA] px-5 py-10 text-center">
                                            <Home
                                              size={30}
                                              strokeWidth={1.7}
                                              className="mx-auto text-[#8BA0A1]"
                                            />

                                            <p className="mt-3 text-sm font-normal leading-6 text-[#687477]">
                                              {t.proximamente}
                                            </p>
                                          </div>
                                        )}

                                        {/* VER TODOS / VER MENOS */}

                                        {productosFiltrados.length >
                                          3 && (
                                          <div className="mt-7 flex justify-center">
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setMostrarTodos(
                                                  (actual) =>
                                                    !actual
                                                )
                                              }
                                              className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-md border border-[#B9CCCD] bg-white px-5 py-2.5 text-xs font-medium text-[#285861] transition-colors hover:border-[#7FA0A3] hover:bg-[#EEF5F5] sm:text-sm"
                                            >
                                              {mostrarTodos ? (
                                                <>
                                                  <ChevronUp
                                                    size={16}
                                                    strokeWidth={
                                                      1.8
                                                    }
                                                  />

                                                  {t.verMenos}
                                                </>
                                              ) : (
                                                <>
                                                  <ChevronDown
                                                    size={16}
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
                                      </div>
                                    </section>
                                  </main>
                                );
                              };

                              export default Tienda;
                         