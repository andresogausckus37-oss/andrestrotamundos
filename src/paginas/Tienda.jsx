import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Expand,
  Package,
  ShoppingBag,
} from "lucide-react";

import CalificacionProducto from "../componentes/CalificacionProducto";
import {
  MERCADO_ARGENTINA,
  formatearPrecioMercado,
} from "../utilidades/mercado";

const CUOTAS_SIN_INTERES = 3;
const DURACION_NUEVO_PRODUCTO_MS = 72 * 60 * 60 * 1000;

const CATEGORIAS = [
  { id: "todos", nombre: "Todos" },
  { id: "tecnologia", nombre: "Tecnología" },
  { id: "computacion", nombre: "Computación" },
  { id: "audio", nombre: "Audio" },
  { id: "pesca", nombre: "Pesca" },
  { id: "jardin", nombre: "Jardín" },
  { id: "hogar", nombre: "Hogar" },
  { id: "ninos", nombre: "Niños" },
  { id: "accesorios", nombre: "Accesorios" },
  { id: "otros", nombre: "Otros" },
];

const Tienda = () => {
  const navigate = useNavigate();

  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [categoriaActiva, setCategoriaActiva] = useState("todos");
  const [mostrarTodos, setMostrarTodos] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const [sliderActivo, setSliderActivo] = useState(true);
  const [sliderPausadoPorInteraccion, setSliderPausadoPorInteraccion] =
    useState(false);
  const [indiceReel, setIndiceReel] = useState(0);
  const sliderRef = useRef(null);

  useEffect(() => {
    let cancelado = false;

    const cargarProductos = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta = await fetch(
          "/api/admin/pedidos?accion=productos-publicos"
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudieron cargar los productos."
          );
        }

        if (!cancelado) {
          setProductos(
            Array.isArray(datos.productos) ? datos.productos : []
          );
        }
      } catch (errorCarga) {
        console.error("Error cargando productos:", errorCarga);

        if (!cancelado) {
          setError(
            errorCarga.message || "No se pudieron cargar los productos."
          );
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    cargarProductos();

    return () => {
      cancelado = true;
    };
  }, []);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  useEffect(() => {
    const tituloAnterior = document.title;
    const canonical = document.querySelector('link[rel="canonical"]');
    const canonicalAnterior = canonical?.getAttribute("href") || "";

    document.title = "Tienda de Productos | Andres House Sitter";

    const descripcion =
      "Descubre productos seleccionados para el hogar, tecnología, audio, pesca, jardín, niños y más.";

    const actualizarMeta = (selector, atributo, contenido) => {
      let elemento = document.querySelector(selector);

      if (!elemento) {
        elemento = document.createElement("meta");

        const coincidencia = selector.match(
          atributo === "name"
            ? /name="([^"]+)"/
            : /property="([^"]+)"/
        );

        elemento.setAttribute(
          atributo,
          coincidencia?.[1] || ""
        );

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
      "Tienda de Productos | Andres House Sitter"
    );

    actualizarMeta(
      'meta[property="og:description"]',
      "property",
      descripcion
    );

    actualizarMeta(
      'meta[property="og:url"]',
      "property",
      `${window.location.origin}/tienda`
    );

    if (canonical) {
      canonical.setAttribute(
        "href",
        `${window.location.origin}/tienda`
      );
    }

    return () => {
      document.title = tituloAnterior;

      if (canonical && canonicalAnterior) {
        canonical.setAttribute("href", canonicalAnterior);
      }
    };
  }, []);

  const categoriasVisibles = useMemo(() => {
    const disponibles = new Set(
      productos
        .map((producto) => producto.categoria)
        .filter(Boolean)
    );

    return CATEGORIAS.filter(
      (categoria) =>
        categoria.id === "todos" ||
        disponibles.has(categoria.id)
    );
  }, [productos]);

  const productosFiltrados = useMemo(() => {
    if (categoriaActiva === "todos") {
      return productos;
    }

    return productos.filter(
      (producto) => producto.categoria === categoriaActiva
    );
  }, [productos, categoriaActiva]);

  const productosMostrados = mostrarTodos
    ? productosFiltrados
    : productosFiltrados.slice(0, 6);

  const productosConReel = useMemo(() => {
    return productos
      .map((producto) => {
        const reel = producto.videoReel;

        const urlReel =
          typeof reel === "string"
            ? reel
            : reel?.url || reel?.src || reel?.video || "";

        return {
          ...producto,
          urlReel,
        };
      })
      .filter((producto) => Boolean(producto.urlReel));
  }, [productos]);

  const moverSlider = (direccion) => {
    if (productosConReel.length === 0) return;

    setIndiceReel((indiceActual) => {
      const siguiente =
        (indiceActual + direccion + productosConReel.length) %
        productosConReel.length;

      return siguiente;
    });
  };

  useEffect(() => {
    if (
      !sliderActivo ||
      sliderPausadoPorInteraccion ||
      productosConReel.length <= 1
    ) {
      return undefined;
    }

    const intervalo = window.setInterval(() => {
      moverSlider(1);
    }, 5000);

    return () => window.clearInterval(intervalo);
  }, [
    sliderActivo,
    sliderPausadoPorInteraccion,
    productosConReel.length,
  ]);

  useEffect(() => {
    const contenedor = sliderRef.current;

    if (!contenedor || productosConReel.length === 0) return;

    const tarjeta = contenedor.children[indiceReel];

    if (tarjeta) {
      tarjeta.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [indiceReel, productosConReel.length]);

  const ponerReelEnPantallaCompleta = async (evento) => {
    const video = evento.currentTarget
      .closest("article")
      ?.querySelector("video");

    if (!video) return;

    try {
      if (video.requestFullscreen) {
        await video.requestFullscreen();
      } else if (video.webkitEnterFullscreen) {
        video.webkitEnterFullscreen();
      }
    } catch (errorPantallaCompleta) {
      console.error(
        "No se pudo abrir el video en pantalla completa:",
        errorPantallaCompleta
      );
    }
  };

  const formatearPrecio = (precio) => {
    const numero = Number(precio);

    if (!Number.isFinite(numero) || numero <= 0) {
      return "Precio a consultar";
    }

    return formatearPrecioMercado(
      numero,
      MERCADO_ARGENTINA
    );
  };

  const obtenerTiempoRestante = (finalizaEn) => {
    if (!finalizaEn) return null;

    const final = new Date(finalizaEn).getTime();

    if (!Number.isFinite(final)) {
      return null;
    }

    const diferencia = final - ahora;

    if (diferencia <= 0) {
      return null;
    }

    const totalSegundos = Math.floor(diferencia / 1000);

    return {
      dias: Math.floor(totalSegundos / 86400),
      horas: Math.floor((totalSegundos % 86400) / 3600),
      minutos: Math.floor((totalSegundos % 3600) / 60),
      segundos: totalSegundos % 60,
    };
  };

  const irAProducto = (productoId) => {
    navigate(`/tienda/${productoId}`);
  };

  return (
    <main className="min-h-screen bg-[#FCFDFC]">
      <div className="overflow-hidden bg-black py-2 text-white">
        <div className="flex w-max animate-[marquee_16s_linear_infinite] whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.16em] sm:text-xs">
          {Array.from({ length: 8 }).map((_, indice) => (
            <span key={indice} className="mx-8">
              Envío gratis en compras mayores a $40.000 🔥
            </span>
          ))}
        </div>

        <style>{`
          @keyframes marquee {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        `}</style>
      </div>

      {productosConReel.length > 0 && (
        <section className="border-b border-[#DCE5E4] bg-white px-4 py-6 sm:px-5 sm:py-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#8A7966] sm:text-[11px]">
                  Descubrí nuestros productos
                </p>
                <h2 className="mt-1 text-lg font-medium tracking-tight text-[#263238] sm:text-xl">
                  Productos más buscados
                </h2>
              </div>
          
            </div>

            <div
              className="relative"
              onMouseEnter={() => setSliderPausadoPorInteraccion(true)}
              onMouseLeave={() => setSliderPausadoPorInteraccion(false)}
              onTouchStart={() => setSliderPausadoPorInteraccion(true)}
              onTouchEnd={() => setSliderPausadoPorInteraccion(false)}
              onPointerDown={() => setSliderPausadoPorInteraccion(true)}
              onPointerUp={() => setSliderPausadoPorInteraccion(false)}
            >
              {productosConReel.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => moverSlider(-1)}
                    className="absolute left-1 top-[42%] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-black/70 text-white shadow-md transition hover:bg-black sm:-left-4"
                    aria-label="Producto anterior"
                  >
                    <ChevronLeft size={20} strokeWidth={2} />
                  </button>

                  <button
                    type="button"
                    onClick={() => moverSlider(1)}
                    className="absolute right-1 top-[42%] z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md bg-black/70 text-white shadow-md transition hover:bg-black sm:-right-4"
                    aria-label="Producto siguiente"
                  >
                    <ChevronRight size={20} strokeWidth={2} />
                  </button>
                </>
              )}

              <div
                ref={sliderRef}
                className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:gap-4"
              >
                {productosConReel.map((producto, indice) => {
                  const nombreProducto =
                    typeof producto.nombre === "string"
                      ? producto.nombre
                      : producto.nombre?.es || "Producto";

                  return (
                    <article
                      key={`reel-${producto.id}`}
                      className="w-[145px] shrink-0 snap-center overflow-hidden rounded-md border border-[#DCE5E4] bg-white sm:w-[175px] md:w-[190px]"
                    >
                      <div className="relative aspect-[9/16] max-h-[300px] overflow-hidden bg-black">
                        <video
                          src={producto.urlReel}
                          autoPlay
                          muted
                          loop
                          playsInline
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />

                        <button
                          type="button"
                          onClick={ponerReelEnPantallaCompleta}
                          className="absolute bottom-2 right-2 flex h-8 w-8 items-center justify-center rounded-md bg-black/65 text-white transition hover:bg-black/85"
                          aria-label={`Ver ${nombreProducto} en pantalla completa`}
                        >
                          <Expand size={15} strokeWidth={1.9} />
                        </button>
                      </div>

                      <div className="p-2.5">
                        <h3 className="line-clamp-2 min-h-[40px] text-xs font-medium leading-5 text-[#263238] sm:text-sm">
                          {nombreProducto}
                        </h3>

                        <div className="mt-1">
                          <CalificacionProducto productoId={producto.id} />
                        </div>

                        <button
                          type="button"
                          onClick={() => irAProducto(producto.id)}
                          className="mt-2 inline-flex w-full items-center justify-center rounded-md bg-[#285861] px-2.5 py-2 text-[10px] font-medium text-white transition-colors hover:bg-[#204850] sm:text-xs"
                        >
                          Comprar ahora
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="border-b border-[#DCE5E4] bg-white">
        <div className="mx-auto max-w-6xl px-5 py-8 text-center sm:py-10">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EEF5F5] text-[#285861]">
            <ShoppingBag size={23} strokeWidth={1.7} />
        </div>

        <p className="mx-auto mt-2 max-w-2xl text-sm font-normal leading-6 text-[#687477] sm:text-base">
          ¡No sigas buscando! Encontrá productos seleccionados para vos,
          comprá en minutos y recibí atención personalizada.
          ¡Hacé tu pedido ahora!
        </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-5 pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-normal text-[#687477] transition-colors hover:text-[#285861]"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
          Volver
        </button>
      </div>

      {categoriasVisibles.length > 1 && (
        <section className="px-4 pt-6 sm:px-5 sm:pt-8">
          <div className="mx-auto max-w-6xl">
            <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#8A7966]">
              Explorar por categoría
            </p>

            <div className="flex flex-wrap justify-center gap-2">
              {categoriasVisibles.map((categoria) => {
                const activa = categoriaActiva === categoria.id;

                return (
                  <button
                    key={categoria.id}
                    type="button"
                    onClick={() => {
                      setCategoriaActiva(categoria.id);
                      setMostrarTodos(false);
                    }}
                    className={`rounded-md border px-3 py-1.5 text-[10px] font-medium transition-colors sm:px-4 sm:py-2 sm:text-xs ${
                      activa
                        ? "border-[#285861] bg-[#285861] text-white"
                        : "border-[#DCE5E4] bg-white text-[#536468] hover:border-[#7FA0A3] hover:text-[#285861]"
                    }`}
                  >
                    {categoria.nombre}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="mb-20 px-4 py-8 sm:px-5 sm:py-10">
        <div className="mx-auto max-w-4xl">
          <div className="mb-5">
            <h2 className="text-center text-xl font-medium tracking-tight text-[#263238] sm:text-2xl">
              {categoriaActiva === "todos"
                ? "Productos destacados"
                : CATEGORIAS.find(
                    (categoria) => categoria.id === categoriaActiva
                  )?.nombre || "Productos"}
            </h2>
          </div>

          {cargando ? (
            <div className="py-12 text-center">
              <p className="text-sm text-[#687477]">
                Cargando productos...
              </p>
            </div>
          ) : error ? (
            <div className="mx-auto max-w-xl rounded-md border border-red-200 bg-red-50 px-5 py-8 text-center">
              <p className="text-sm text-red-700">
                {error}
              </p>
            </div>
          ) : productosMostrados.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {productosMostrados.map((producto) => {
                const precioNormal = Number(producto.precioARS) || 0;
                const precioOferta = Number(
                  producto.oferta?.precioARS
                ) || 0;

                const finalizaOferta =
                  producto.ofertaLanzamiento?.finalizaEn;

                const ofertaDentroDePlazo = finalizaOferta
                  ? new Date(finalizaOferta).getTime() > ahora
                  : true;

                const tieneOferta =
                  producto.oferta?.activa === true &&
                  precioOferta > 0 &&
                  ofertaDentroDePlazo;

                const precioFinal = tieneOferta
                  ? precioOferta
                  : precioNormal;

                const descuento =
                  tieneOferta && precioNormal > 0
                    ? Math.round(
                        ((precioNormal - precioFinal) /
                          precioNormal) *
                          100
                      )
                    : 0;

                const tiempoRestante =
                  tieneOferta && finalizaOferta
                    ? obtenerTiempoRestante(finalizaOferta)
                    : null;

                const fechaCreacion = new Date(
                  producto.creadoEn
                ).getTime();

                const esNuevoProducto =
                  Number.isFinite(fechaCreacion) &&
                  ahora >= fechaCreacion &&
                  ahora - fechaCreacion <
                    DURACION_NUEVO_PRODUCTO_MS;

                const precioCuota =
                  precioFinal > 0
                    ? precioFinal / CUOTAS_SIN_INTERES
                    : 0;

                const nombreProducto =
                  typeof producto.nombre === "string"
                    ? producto.nombre
                    : producto.nombre?.es || "Producto";

                const etiquetaOferta =
                  typeof producto.oferta?.etiqueta === "string"
                    ? producto.oferta.etiqueta
                    : producto.oferta?.etiqueta?.es || "";

                const imagenPortada =
                  producto.imagenes?.portada ||
                  producto.imagenes?.redes?.feed?.presentacion ||
                  "";

                return (
                  <article
                    key={producto.id}
                    className="group flex flex-col overflow-hidden rounded-md border border-[#DCE5E4] bg-white transition-colors duration-200 hover:border-[#8EAAAC]"
                  >
                    <button
                      type="button"
                      onClick={() => irAProducto(producto.id)}
                      className="w-full bg-[#F7FAFA]"
                      aria-label={`Ver ${nombreProducto}`}
                    >
                      <div className="relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden bg-[#F7FAFA]">
                        {descuento > 0 && (
                          <span className="absolute left-2 top-2 z-10 rounded-md bg-red-600 px-2 py-1 text-[9px] font-semibold text-white sm:text-[10px]">
                            {descuento}% OFF
                          </span>
                        )}

                        {producto.envioGratis === true && (
                          <span className="absolute right-2 top-2 z-10 rounded-md bg-green-600 px-2 py-1 text-[9px] font-semibold text-white sm:text-[10px]">
                            Envío gratis
                          </span>
                        )}
                        {imagenPortada ? (
                          <img
                            src={imagenPortada}
                            alt={nombreProducto}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                          />
                        ) : (
                          <Package
                            size={34}
                            strokeWidth={1.5}
                            className="text-[#8BA0A1]"
                          />
                        )}
                      </div>
                    </button>

                    <div className="flex min-w-0 flex-1 flex-col p-2.5 sm:p-4">
                      <div className="mb-2 flex flex-wrap items-center gap-1.5">
                        {esNuevoProducto && (
                          <span className="inline-flex items-center rounded-md border border-[#D9E6E7] bg-[#EEF5F5] px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-[#285861] sm:px-2 sm:py-1 sm:text-[10px]">
                            Nuevo producto
                          </span>
                        )}

                        {producto.disponibilidad === "sin-stock" && (
                          <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-red-700 sm:px-2 sm:py-1 sm:text-[10px]">
                            Sin stock
                          </span>
                        )}

                        {producto.disponibilidad === "proximamente" && (
                          <span className="inline-flex items-center rounded-md border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[8px] font-medium uppercase tracking-wide text-amber-700 sm:px-2 sm:py-1 sm:text-[10px]">
                            Próximamente
                          </span>
                        )}
                      </div>

                      <h3 className="line-clamp-2 text-[14px] font-normal leading-5 text-[#263238] sm:text-[15px]">
                        {nombreProducto}
                      </h3>

                      <div className="mt-1.5 min-h-[16px] origin-left scale-[0.9]">
                        <CalificacionProducto productoId={producto.id} />
                      </div>

                      <div className="mt-auto pt-3">
                        {tieneOferta ? (
                          <>
                            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                              <p className="text-xl font-medium tracking-tight text-[#263238] sm:text-2xl">
                                {formatearPrecio(precioFinal)}
                              </p>

                              <p className="text-xs font-normal text-slate-400 line-through sm:text-sm">
                                {formatearPrecio(precioNormal)}
                              </p>

                            </div>

                            {etiquetaOferta && (
                              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.08em] text-orange-700">
                                {etiquetaOferta}
                              </p>
                            )}

                            {tiempoRestante && (
                              <div className="mt-2 inline-flex max-w-full items-center rounded-md border border-orange-200 bg-orange-50 px-2 py-1">
                                <span className="text-[10px] font-medium leading-4 text-orange-800 sm:text-[11px]">
                                  Finaliza en{" "}
                                  {tiempoRestante.dias > 0 &&
                                    `${tiempoRestante.dias}d `}
                                  {String(
                                    tiempoRestante.horas
                                  ).padStart(2, "0")}
                                  h{" "}
                                  {String(
                                    tiempoRestante.minutos
                                  ).padStart(2, "0")}
                                  m{" "}
                                  {String(
                                    tiempoRestante.segundos
                                  ).padStart(2, "0")}
                                  s
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <p className="text-xl font-medium tracking-tight text-[#263238] sm:text-2xl">
                            {formatearPrecio(precioFinal)}
                          </p>
                        )}

                        {precioCuota > 0 && (
                          <div className="mt-3 border-t border-[#E3E8E7] pt-2.5">
                            <div className="flex items-start gap-2">
                              <CreditCard
                                size={14}
                                strokeWidth={1.7}
                                className="mt-0.5 shrink-0 text-[#B59672]"
                              />

                              <p className="text-[11px] font-normal leading-4 text-[#687477] sm:text-xs">
                                <span className="font-medium text-[#263238]">
                                  {CUOTAS_SIN_INTERES} x{" "}
                                  {formatearPrecio(precioCuota)}
                                </span>{" "}
                                sin interés
                              </p>
                            </div>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => irAProducto(producto.id)}
                          className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#285861] px-3 py-2.5 text-xs font-medium text-white transition-colors hover:bg-[#204850] sm:text-sm"
                        >
                          <ShoppingBag
                            size={14}
                            strokeWidth={1.8}
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
            <div className="mx-auto max-w-xl rounded-md border border-dashed border-[#D6DFDE] bg-[#F7FAFA] px-5 py-10 text-center">
              <Package
                size={30}
                strokeWidth={1.7}
                className="mx-auto text-[#8BA0A1]"
              />

              <p className="mt-3 text-sm font-normal leading-6 text-[#687477]">
                Próximamente agregaremos nuevos productos en esta categoría.
              </p>
            </div>
          )}

          {productosFiltrados.length > 6 && (
            <div className="mt-7 flex justify-center">
              <button
                type="button"
                onClick={() =>
                  setMostrarTodos((actual) => !actual)
                }
                className="inline-flex min-w-[160px] items-center justify-center gap-2 rounded-md border border-[#B9CCCD] bg-white px-5 py-2.5 text-xs font-medium text-[#285861] transition-colors hover:border-[#7FA0A3] hover:bg-[#EEF5F5] sm:text-sm"
              >
                {mostrarTodos ? (
                  <>
                    <ChevronUp size={16} strokeWidth={1.8} />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown size={16} strokeWidth={1.8} />
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
