import CalificacionProducto from "../componentes/CalificacionProducto";
import { resenasProductos } from "../datos/resenasProductos";
import ProteccionComercial from "../generador/componentes/ProteccionComercial";

import {
  ArrowLeft,
  BadgePercent,
  Check,
  CreditCard,
  Download,
  Landmark,
  ShoppingBag,
} from "lucide-react";

import { useEffect, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

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
const DURACION_NUEVO_PRODUCTO_MS = 72 * 60 * 60 * 1000;

const obtenerFechaOferta = (producto, mercado) => {
  const fecha =
    producto?.ofertaLanzamiento?.finalizaEn ||
    (mercado === MERCADO_ARGENTINA
      ? producto?.oferta?.finalizaEn
      : producto?.ofertaUSD?.finalizaEn) ||
    null;

  if (!fecha) return null;

  const tiempo = new Date(fecha).getTime();
  return Number.isFinite(tiempo) ? tiempo : null;
};

const formatearTiempoRestante = (milisegundos) => {
  const totalSegundos = Math.max(0, Math.floor(milisegundos / 1000));
  const dias = Math.floor(totalSegundos / 86400);
  const horas = Math.floor((totalSegundos % 86400) / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  return `${dias}d ${String(horas).padStart(2, "0")}h ${String(minutos).padStart(2, "0")}m ${String(segundos).padStart(2, "0")}s`;
};

const DetalleProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [imagenActiva, setImagenActiva] =
    useState(0);

  const [mercado, setMercado] =
    useState(MERCADO_ARGENTINA);

  const [cargandoMercado, setCargandoMercado] =
    useState(true);

  const [producto, setProducto] =
    useState(null);

  const [cargandoProducto, setCargandoProducto] =
    useState(true);

  const [ahora, setAhora] = useState(() => Date.now());

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  /* =========================================================
     CARGAR PRODUCTO DESDE MONGODB
  ========================================================= */

  useEffect(() => {
    let cancelado = false;

    const cargarProducto = async () => {
      try {
        setCargandoProducto(true);

        const respuesta = await fetch(
          "/api/admin/pedidos?accion=productos-publicos"
        );

        if (!respuesta.ok) {
          throw new Error(
            "No se pudo cargar el producto."
          );
        }

        const datos = await respuesta.json();

        const encontrado =
          Array.isArray(datos.productos)
            ? datos.productos.find(
                (item) => item.id === id
              )
            : null;

        if (!cancelado) {
          setProducto(encontrado || null);
        }
      } catch (error) {
        console.error(
          "Error cargando producto desde MongoDB:",
          error
        );

        if (!cancelado) {
          setProducto(null);
        }
      } finally {
        if (!cancelado) {
          setCargandoProducto(false);
        }
      }
    };

    cargarProducto();

    return () => {
      cancelado = true;
    };
  }, [id]);

  const textoEs = (valor) => {
    if (typeof valor === "string") {
      return valor;
    }

    return valor?.es || "";
  };

  const listaEs = (valor) => {
    if (Array.isArray(valor)) {
      return valor;
    }

    return valor?.es || [];
  };

  /* =========================================================
     DETECTAR MERCADO
  ========================================================= */

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

  /* =========================================================
     PRECIO SEGÚN MERCADO
  ========================================================= */

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

  /* =========================================================
     SEO DEL PRODUCTO
  ========================================================= */

  useEffect(() => {
    if (!producto || cargandoMercado) {
      return;
    }

    const nombre =
      textoEs(producto.nombre);

    const descripcion =
      textoEs(producto.descripcion);

    const url =
      `https://andreshousesitter.com/tienda/${producto.id}`;

    const imagen =
      producto.imagenes?.portada || "";

    document.title =
      `${nombre} | Andrés Imprimibles`;

    const actualizarMeta = (
      selector,
      atributo,
      contenido
    ) => {
      let elemento =
        document.querySelector(
          selector
        );

      if (!elemento) {
        elemento =
          document.createElement(
            "meta"
          );

        const nombreMeta =
          selector.match(
            /(?:name|property)="([^"]+)"/
          )?.[1];

        elemento.setAttribute(
          atributo,
          nombreMeta
        );

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
      nombre
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

    actualizarMeta(
      'meta[property="og:type"]',
      "property",
      "product"
    );

    if (imagen) {
      actualizarMeta(
        'meta[property="og:image"]',
        "property",
        imagen
      );

      actualizarMeta(
        'meta[name="twitter:image"]',
        "name",
        imagen
      );
    }

    actualizarMeta(
      'meta[name="twitter:title"]',
      "name",
      nombre
    );

    actualizarMeta(
      'meta[name="twitter:description"]',
      "name",
      descripcion
    );

    let canonical =
      document.querySelector(
        'link[rel="canonical"]'
      );

    if (!canonical) {
      canonical =
        document.createElement(
          "link"
        );

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

    /* =====================================================
       DATOS ESTRUCTURADOS DEL PRODUCTO
    ===================================================== */

    const precio =
      obtenerPrecioMercado(
        producto,
        mercado
      );

    const moneda =
      mercado ===
      MERCADO_ARGENTINA
        ? "ARS"
        : "USD";

    const schemaProducto = {
      "@context":
        "https://schema.org",

      "@type": "Product",

      name: nombre,
      description: descripcion,

      image: imagen
        ? [imagen]
        : undefined,

      sku: producto.id,

      offers: {
        "@type": "Offer",
        url,
        priceCurrency: moneda,
        price: precio,
        availability:
          "https://schema.org/InStock",
        itemCondition:
          "https://schema.org/NewCondition",
      },
    };

    let scriptSchema =
      document.getElementById(
        "schema-producto"
      );

    if (!scriptSchema) {
      scriptSchema =
        document.createElement(
          "script"
        );

      scriptSchema.type =
        "application/ld+json";

      scriptSchema.id =
        "schema-producto";

      document.head.appendChild(
        scriptSchema
      );
    }

    scriptSchema.textContent =
      JSON.stringify(
        schemaProducto
      );

    return () => {
      document.title =
        "Cuidado de Casas y Mascotas | Andres House Sitter";

      document
        .getElementById(
          "schema-producto"
        )
        ?.remove();

      document
        .querySelector(
          'link[rel="canonical"]'
        )
        ?.setAttribute(
          "href",
          "https://andreshousesitter.com/"
        );
    };
  }, [
    producto,
    mercado,
    cargandoMercado,
  ]);

  /* =========================================================
     PRODUCTO NO ENCONTRADO
  ========================================================= */

  if (cargandoProducto) {
  return (
    <main className="flex min-h-[70vh] items-center justify-center bg-[#FCFDFC] px-4">
      <p className="text-sm text-[#687477]">
        Cargando producto...
      </p>
    </main>
  );
  }

  if (!producto) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-[#FCFDFC] px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-medium text-[#263238]">
            Producto no encontrado
          </h1>

          <p className="mt-2 text-sm font-normal leading-6 text-[#687477]">
            El producto que buscas no está disponible.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/tienda/digitales")
            }
            className="mt-5 rounded-md bg-[#285861] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#204850]"
          >
            Volver a la tienda
          </button>
        </div>
      </main>
    );
  }

  /* =========================================================
     PRECIO
  ========================================================= */

  const precioNormal =
    mercado === MERCADO_ARGENTINA
      ? Number(producto.precioARS)
      : Number(producto.precioUSD);

  const fechaFinOferta = obtenerFechaOferta(
    producto,
    mercado
  );

  const ofertaNoVencida =
    !fechaFinOferta || ahora < fechaFinOferta;

  const tieneOfertaConfigurada =
    mercado === MERCADO_ARGENTINA
      ? producto.oferta?.activa === true &&
        Number(producto.oferta?.precioARS) > 0
      : producto.ofertaUSD?.activa === true &&
        Number(producto.ofertaUSD?.precioUSD) > 0;

  const tieneOferta =
    tieneOfertaConfigurada && ofertaNoVencida;

  const precioOferta =
    mercado === MERCADO_ARGENTINA
      ? Number(producto.oferta?.precioARS)
      : Number(producto.ofertaUSD?.precioUSD);

  const precioFinal = tieneOferta
    ? precioOferta
    : precioNormal;

  const tiempoRestanteOferta =
    tieneOferta && fechaFinOferta
      ? Math.max(0, fechaFinOferta - ahora)
      : 0;

  const fechaCreacion = producto.creadoEn
    ? new Date(producto.creadoEn).getTime()
    : null;

  const esNuevoProducto =
    Number.isFinite(fechaCreacion) &&
    ahora >= fechaCreacion &&
    ahora - fechaCreacion < DURACION_NUEVO_PRODUCTO_MS;

  const ahorro =
    tieneOferta &&
    precioNormal > precioFinal
      ? precioNormal - precioFinal
      : 0;

  const descuento =
        tieneOferta &&
    precioNormal > 0
      ? Math.round(
          (ahorro / precioNormal) * 100
        )
      : 0;

  const etiquetaOferta =
    mercado === MERCADO_ARGENTINA
      ? producto.oferta?.etiqueta
      : producto.ofertaUSD?.etiqueta;

  const precioTransferencia =
    mercado === MERCADO_ARGENTINA
      ? precioFinal *
        (1 -
          DESCUENTO_TRANSFERENCIA /
            100)
      : 0;

  const precioCuota =
    mercado === MERCADO_ARGENTINA
      ? precioFinal /
        CUOTAS_SIN_INTERES
      : 0;

  /* =========================================================
     RESEÑAS
  ========================================================= */

  const resenasDelProducto =
    resenasProductos.filter(
      (resena) =>
        resena.productoId ===
        producto.id
    );

  /* =========================================================
     IMÁGENES
  ========================================================= */

  const imagenes = [
    producto.imagenes?.portada,
    producto.imagenes?.preview,
    producto.imagenes
      ?.previewIndividual,
    ...(producto.imagenes
      ?.previewsIndividuales ||
      []),
  ].filter(Boolean);

  const imagenActual =
    imagenes[imagenActiva];

  /* =========================================================
     COMPRAR
  ========================================================= */

  const irAlCheckout = () => {
    const parametros =
      new URLSearchParams(
        window.location.search
      );

    const mercadoPrueba =
      parametros.get("mercado");

    const ruta =
      mercadoPrueba
        ? `/checkout/${producto.id}?mercado=${encodeURIComponent(
            mercadoPrueba
          )}`
        : `/checkout/${producto.id}`;

    navigate(ruta);
  };

  return (
    <>
      <main className="min-h-screen bg-[#FCFDFC] px-4 pb-12 pt-4 sm:px-5 sm:pt-6">
        <div className="mx-auto max-w-6xl">

          {/* VOLVER */}

          <button
            type="button"
            onClick={() =>
              navigate(-1)
            }
            className="mb-5 inline-flex items-center gap-2 text-sm font-normal text-[#687477] transition-colors hover:text-[#285861]"
          >
            <ArrowLeft
              size={17}
              strokeWidth={1.8}
            />

            Volver
          </button>

          {/* =====================================================
              CONTENIDO PRINCIPAL
          ====================================================== */}

          <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">

            {/* =====================================================
                GALERÍA
            ====================================================== */}

            <section>

              {/* IMAGEN PRINCIPAL */}

              <div className="relative mx-auto max-w-[420px] overflow-hidden rounded-md border border-[#DCE5E4] bg-white">
                <div className="aspect-square w-full overflow-hidden bg-white">
                  {imagenActual &&
                    (imagenActiva === 0 ? (
                      <img
                        src={imagenActual}
                        alt={textoEs(
                          producto.nombre
                        )}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <ProteccionComercial>
                        <img
                          src={imagenActual}
                          alt={`Vista ${
                            imagenActiva + 1
                          } de ${textoEs(
                            producto.nombre
                          )}`}
                          className="h-full w-full object-contain"
                        />
                      </ProteccionComercial>
                    ))}
                </div>
              </div>

              {/* MINIATURAS */}

              {imagenes.length > 1 && (
                <div className="mx-auto mt-3 flex max-w-[420px] gap-2 overflow-x-auto pb-1">
                  {imagenes.map(
                    (
                      imagen,
                      index
                    ) => (
                      <button
                        key={`${imagen}-${index}`}
                        type="button"
                        onClick={() =>
                          setImagenActiva(
                            index
                          )
                        }
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition-colors ${
                          imagenActiva ===
                          index
                            ? "border-[#285861]"
                            : "border-[#DCE5E4] hover:border-[#8EAAAC]"
                        }`}
                        aria-label={`Ver imagen ${
                          index + 1
                        }`}
                      >
                        <img
                          src={imagen}
                          alt={`Vista ${
                            index + 1
                          }`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    )
                  )}
                </div>
              )}

              {/* CALIDAD */}

              <div className="mx-auto ---mt-1 flex max-w-[420px] items-center gap-2.5 border-t border-[#DCE5E4] -pt-2">
              </div>
            </section>

            {/* =====================================================
                INFORMACIÓN
            ====================================================== */}

            <section className="lg:pt-1">

              {/* TÍTULO */}

              <h1 className="max-w-2xl text-2xl font-medium -mb-0 leading-tight tracking-tight text-[#263238] sm:text-3xl">
                {textoEs(
                  producto.nombre
                )}
              </h1>

              {/* CALIFICACIÓN */}

              <div className="mt-2">
                <CalificacionProducto
                  productoId={
                    producto.id
                  }
                />
              </div>

              {/* =================================================
                  PRECIO
              ================================================== */}

              <div className="mt-5 border-y border-[#DCE5E4] py-4">
                {cargandoMercado ? (
                  <p className="text-sm text-[#687477]">
                    Cargando precio...
                  </p>
                ) : tieneOferta ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-3xl font-medium tracking-tight text-[#263238]">
                        {formatearPrecio(
                          precioFinal
                        )}
                      </span>

                      <span className="text-sm font-normal text-slate-400 line-through">
                        {formatearPrecio(
                          precioNormal
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
                        <BadgePercent
                          size={14}
                          strokeWidth={
                            1.8
                          }
                        />

                        {descuento}% OFF
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-xs font-normal text-[#687477]">
                        Ahorro{" "}
                        <span className="font-medium text-[#263238]">
                          {formatearPrecio(
                            ahorro
                          )}
                        </span>
                      </p>

                      {textoEs(
                        etiquetaOferta
                      ) && (
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-orange-700">
                          {textoEs(
                            etiquetaOferta
                          )}
                        </span>
                      )}
                    </div>

                    {fechaFinOferta && (
                      <div className="mt-3 inline-flex rounded-md border border-orange-200 px-3 py-2">
                        <p className="text-sm font-medium text-orange-700 sm:text-base">
                          Finaliza en {formatearTiempoRestante(tiempoRestanteOferta)}
                        </p>
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-3xl font-medium tracking-tight text-[#263238]">
                    {formatearPrecio(
                      precioFinal
                    )}
                  </span>
                )}

                {/* OPCIONES DE PAGO */}

                {!cargandoMercado &&
                  mercado ===
                    MERCADO_ARGENTINA && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2.5">
                        <Landmark
                          size={15}
                          strokeWidth={
                            1.7
                          }
                          className="shrink-0 text-[#285861]"
                        />

                        <p className="text-xs font-normal text-[#687477] sm:text-sm">
                          <span className="font-medium text-[#285861]">
                            {
                              DESCUENTO_TRANSFERENCIA
                            }
                            % OFF
                          </span>{" "}
                          con transferencia
                          ·{" "}
                          <span className="font-medium text-[#263238]">
                            {formatearPrecio(
                              precioTransferencia
                            )}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <CreditCard
                          size={15}
                          strokeWidth={
                            1.7
                          }
                          className="shrink-0 text-[#B59672]"
                        />

                        <p className="text-xs font-normal text-[#687477] sm:text-sm">
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
              </div>

                            {/* =================================================
                  SOBRE ESTE PRODUCTO
              ================================================== */}

              <div className="mt-6">
                <h2 className="text-base font-medium text-[#263238]">
                  Sobre este producto
                </h2>

                <p className="mt-2 max-w-2xl text-sm font-normal leading-6 text-[#687477]">
                  {textoEs(
                    producto.descripcionLarga
                  ) ||
                    textoEs(
                      producto.descripcion
                    )}
                </p>
              </div>

              {/* =================================================
                  QUÉ INCLUYE
              ================================================== */}

              {listaEs(producto.incluye).length >
                0 && (
                <div className="mt-6">
                  <h2 className="text-base font-medium text-[#285861]">
                    Qué incluye
                  </h2>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {listaEs(
                      producto.incluye
                    ).map(
                      (item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2.5 rounded-lg border border-[#285861]/15 bg-[#285861]/[0.06] px-3 py-1"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                            <Check
                              size={15}
                              strokeWidth={2}
                              className="text-[#285861]"
                            />
                          </div>

                          <p className="text-xs font-normal leading-4 text-[#46585C]">
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  BENEFICIOS
              ================================================== */}

              {listaEs(
                producto.beneficios
              ).length > 0 && (
                <div className="mt-5">
                  <h2 className="text-base font-medium text-[#756451]">
                    Beneficios
                  </h2>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {listaEs(
                      producto.beneficios
                    ).map(
                      (item, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2.5 rounded-lg border border-[#8B684D]/15 bg-[#8B684D]/[0.08] px-3 py-1"
                        >
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
                            <Check
                              size={15}
                              strokeWidth={2}
                              className="text-[#8B684D]"
                            />
                          </div>

                          <p className="text-xs font-normal leading-4 text-[#68584D]">
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* =================================================
                  INFORMACIÓN ADICIONAL
              ================================================== */}

              {(producto.edadRecomendada ||
                producto.nivel) && (
                <div className="mt-4 grid grid-cols-2 gap-3">

                  {/* EDAD RECOMENDADA */}

                  {producto.edadRecomendada && (
                    <div className="rounded-lg border border-[#8B684D]/15 bg-[#8B684D]/[0.08] px-3 py-1">
                      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#8B684D]">
                        Edad recomendada
                      </p>

                      <p className="mt-1 text-xs font-normal text-[#68584D]">
                        {
                          producto.edadRecomendada
                        }
                      </p>
                    </div>
                  )}

                  {/* NIVEL */}

                  {producto.nivel && (
                    <div className="rounded-lg border border-[#8B684D]/15 bg-[#8B684D]/[0.08] px-3 py-1">
                      <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#8B684D]">
                        Nivel
                      </p>

                      <p className="mt-1 text-xs font-normal text-[#68584D]">
                        {producto.nivel}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* =====================================================
                  COMPRA
              ====================================================== */}

              <div className="mt-6 rounded-md border border-[#D9E6E7] bg-[#F7FAFA] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#EEF5F5] text-[#285861]">
                    <Download
                      size={16}
                      strokeWidth={1.8}
                    />
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[#263238]">
                      {esNuevoProducto
                        ? "NUEVO PRODUCTO"
                        : "Descarga digital"}
                    </p>

                    <p className="mt-1 text-xs font-normal leading-5 text-[#687477]">
                      Descarga automática luego de
                      confirmar el pago.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={irAlCheckout}
                  disabled={cargandoMercado}
                  className={`mt-4 flex w-full items-center justify-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-white transition-colors ${
                    cargandoMercado
                      ? "cursor-not-allowed bg-[#789397]"
                      : "bg-[#285861] hover:bg-[#204850]"
                  }`}
                >
                  <ShoppingBag
                    size={16}
                    strokeWidth={1.8}
                  />

                  {cargandoMercado
                    ? "Cargando..."
                    : "Comprar ahora"}
                </button>
              </div>

              {/* =====================================================
                  RESEÑAS
              ====================================================== */}

              {resenasDelProducto.length >
                0 && (
                <div className="mb-20 mt-8 border-t border-[#DCE5E4] pt-6">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2 className="text-base font-medium text-[#263238]">
                      Reseñas
                    </h2>

                    <span className="text-xs font-normal text-[#687477]">
                      {
                        resenasDelProducto.length
                      }{" "}
                      {resenasDelProducto.length ===
                      1
                        ? "reseña"
                        : "reseñas"}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    {resenasDelProducto.map(
                      (resena) => (
                        <article
                          key={resena.id}
                          className="rounded-md border border-[#DCE5E4] bg-white p-4"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">

                            {/* ESTRELLAS */}

                             <div className="flex text-[13px] leading-none text-amber-500">
                              {[
                                1,
                                2,
                                3,
                                4,
                                5,
                              ].map(
                                (
                                  estrella
                                ) => (
                                  <span
                                    key={
                                      estrella
                                    }
                                  >
                                    {estrella <=
                                    resena.estrellas
                                      ? "★"
                                      : "☆"}
                                  </span>
                                )
                              )}
                            </div>

                            {/* COMPRA VERIFICADA */}

                            {resena.compraVerificada && (
                              <span className="rounded-md border border-[#D9E6E7] bg-[#EEF5F5] px-2 py-1 text-[9px] font-medium uppercase tracking-[0.06em] text-[#285861]">
                                Compra verificada
                              </span>
                            )}
                          </div>

                          <p className="mt-3 text-xs font-normal leading-5 text-[#687477]">
                            “{resena.texto}”
                          </p>
                        </article>
                      )
                    )}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </>
  );
};

export default DetalleProducto;