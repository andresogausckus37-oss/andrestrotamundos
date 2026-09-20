import CalificacionProducto from "../componentes/CalificacionProducto";
import { resenasProductos } from "../datos/resenasProductos";
import { productosDigitales } from "../datos/productosDigitales";
import ProteccionComercial from "../generador/componentes/ProteccionComercial";

import {
  ArrowLeft,
  Check,
  Download,
  ShoppingBag,
  X,
  MessageCircle,
  Mail,
  User,
} from "lucide-react";

import { useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

const WHATSAPP = "5493548619293";

const DetalleProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const t = {
    noEncontrado: "Producto no encontrado",
    noEncontradoDescripcion:
      "El producto que buscas no está disponible.",
    volverInicio: "Volver al inicio",
    volver: "Volver",
    vista: "Vista",
    de: "de",
    verImagen: "Ver imagen",
    archivoFinal:
      "El archivo final se entrega en",
    altaCalidad: "alta calidad",
    precio: "Precio",
    ahorras: "Ahorras",
    descargable: "Descargable",
    queIncluye: "Qué incluye",
    resenasTitulo: "Reseñas",
    compraVerificada: "Compra verificada",
    descargaPago: "Descarga digital",
    descargaDescripcion:
      "Recibirás las instrucciones de descarga después de completar la compra.",
    totalOferta: "Precio de oferta",
    comprarAhora: "Comprar ahora",
    finalizarCompra: "Finalizar compra",
    resumenPedido: "Resumen del pedido",
    cerrar: "Cerrar",
    completaColeccion:
      "Completa tu colección",
    agregaProducto:
      "Agrega también este producto",
    agregadoCompra:
      "Agregado a la compra",
    agregarCompra:
      "Agregar a la compra",
    agregadoTotal:
      "El producto adicional fue agregado al total.",
    tusDatos: "Tus datos",
    nombre: "Nombre",
    nombrePlaceholder: "Tu nombre",
    correo: "Correo electrónico",
    precioOriginal: "Precio original",
    ofertaLanzamiento:
      "Oferta lanzamiento",
    total: "Total",
    errorDatos:
      "Ingresa tu nombre y correo electrónico.",
    errorEmail:
      "Ingresa un correo electrónico válido.",
    whatsappProductoAdicional:
      "Producto adicional",
    whatsappHola:
      "Hola, quiero realizar esta compra:",
    whatsappProducto: "Producto",
    whatsappPrecioOriginal:
      "Precio original",
    whatsappDescuento: "Descuento",
    whatsappAhorro: "Ahorro",
    whatsappTotal: "Total",
    whatsappNombre: "Nombre",
    whatsappEmail: "Email",
    whatsappFinal:
      "Quedo a la espera de las instrucciones para continuar.",
    comprarWhatsapp:
      "Continuar por WhatsApp",
    instruccionesWhatsapp:
      "Se abrirá WhatsApp con el resumen de tu pedido.",
    cerrarPreview:
      "Cerrar vista previa",
    vistaAmpliada:
      "Vista ampliada de",
  };

  const [
    previewAbierto,
    setPreviewAbierto,
  ] = useState(false);

  const [
    checkoutAbierto,
    setCheckoutAbierto,
  ] = useState(false);

  const [
    imagenActiva,
    setImagenActiva,
  ] = useState(0);

  const [
    extraAgregado,
    setExtraAgregado,
  ] = useState(false);

  const [nombre, setNombre] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [error, setError] =
    useState("");

  /* =========================================================
     FORMATEAR PRECIO
  ========================================================= */

  const formatearPrecio = (
    precioARS
  ) => {
    if (!precioARS) {
      return "Precio a definir";
    }

    return new Intl.NumberFormat(
      "es-AR",
      {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }
    ).format(precioARS);
  };

  const textoEs = (valor) => {
    if (
      typeof valor === "string"
    ) {
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
     PRODUCTO
  ========================================================= */

  const producto =
    productosDigitales.find(
      (p) => p.id === id
    );

  if (!producto) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            {t.noEncontrado}
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            {
              t.noEncontradoDescripcion
            }
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/")
            }
            className="boton-principal mt-5"
          >
            {t.volverInicio}
          </button>
        </div>
      </main>
    );
  }

  /* =========================================================
     PRECIO Y OFERTA
  ========================================================= */

  const tieneOferta =
    producto.oferta?.activa ===
    true;

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
    tieneOferta
      ? Math.round(
          (ahorro /
            producto.precioARS) *
            100
        )
      : 0;

  /* =========================================================
     VENTA CRUZADA
  ========================================================= */

  const productoExtra =
    producto.ventaCruzadaId
      ? productosDigitales.find(
          (p) =>
            p.id ===
            producto.ventaCruzadaId
        )
      : null;

  const extraTieneOferta =
    productoExtra?.oferta
      ?.activa === true;

  const precioExtra =
    productoExtra
      ? extraTieneOferta
        ? productoExtra.oferta
            .precioARS
        : productoExtra.precioARS
      : 0;

  const descuentoExtra =
    productoExtra &&
    extraTieneOferta
      ? Math.round(
          ((productoExtra.precioARS -
            productoExtra.oferta
              .precioARS) /
            productoExtra.precioARS) *
            100
        )
      : 0;

  const totalPedido =
    precioFinal +
    (extraAgregado &&
    productoExtra
      ? precioExtra
      : 0);

  const precioOriginalPedido =
    producto.precioARS +
    (extraAgregado &&
    productoExtra
      ? productoExtra.precioARS
      : 0);

  const ahorroPedido =
    precioOriginalPedido -
    totalPedido;

  const descuentoPedido =
    precioOriginalPedido > 0
      ? Math.round(
          (ahorroPedido /
            precioOriginalPedido) *
            100
        )
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

  /* =========================================================
     CHECKOUT
  ========================================================= */

  const abrirCheckout = () => {
    setError("");
    setExtraAgregado(false);
    setCheckoutAbierto(true);
  };

  /* =========================================================
     COMPRAR POR WHATSAPP
     TEMPORAL HASTA IMPLEMENTAR MERCADO PAGO
  ========================================================= */

  const comprarPorWhatsApp =
    () => {
      const nombreLimpio =
        nombre.trim();

      const emailLimpio =
        email.trim();

      if (
        !nombreLimpio ||
        !emailLimpio
      ) {
        setError(t.errorDatos);
        return;
      }

      const emailValido =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailValido.test(
          emailLimpio
        )
      ) {
        setError(t.errorEmail);
        return;
      }

      setError("");

      const detalleExtra =
        extraAgregado &&
        productoExtra
          ? `\n*${t.whatsappProductoAdicional}:* ${textoEs(
              productoExtra.nombre
            )}`
          : "";

      const mensaje = `${t.whatsappHola}

*${t.whatsappProducto}:* ${textoEs(
        producto.nombre
      )}${detalleExtra}

*${t.whatsappPrecioOriginal}:* ${formatearPrecio(
        precioOriginalPedido
      )}
*${t.whatsappDescuento}:* -${descuentoPedido}%
*${t.whatsappAhorro}:* ${formatearPrecio(
        ahorroPedido
      )}

*${t.whatsappTotal}:* ${formatearPrecio(
        totalPedido
      )}

*${t.whatsappNombre}:* ${nombreLimpio}
*${t.whatsappEmail}:* ${emailLimpio}

${t.whatsappFinal}`;

      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        mensaje
      )}`;

      window.open(
        url,
        "_blank",
        "noopener,noreferrer"
      );
    };

  return (
    <>
      <main className="min-h-screen bg-white px-4 pb-10 sm:px-5">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
            {/* =====================================================
                IMÁGENES
            ====================================================== */}

            <div>
              {/* IMAGEN PRINCIPAL */}

              <div className="relative rounded-2xl bg-white p-2 shadow-sm">
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-white">
                  {imagenActiva ===
                  0 ? (
                    <img
                      src={
                        imagenes[
                          imagenActiva
                        ]
                      }
                      alt={textoEs(
                        producto.nombre
                      )}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <ProteccionComercial>
                      <img
                        src={
                          imagenes[
                            imagenActiva
                          ]
                        }
                        alt={`${
                          t.vista
                        } ${
                          imagenActiva +
                          1
                        } ${t.de} ${textoEs(
                          producto.nombre
                        )}`}
                        className="h-full w-full object-contain"
                      />
                    </ProteccionComercial>
                  )}
                </div>
              </div>

              {/* VOLVER */}

              <button
                type="button"
                onClick={() =>
                  navigate(-1)
                }
                className="mb-3 mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-600"
              >
                <ArrowLeft
                  size={17}
                />
                {t.volver}
              </button>

              {/* MINIATURAS */}

              {imagenes.length >
                1 && (
                <div className="mt-3">
                  <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
                    {imagenes.map(
                      (
                        img,
                        idx
                      ) => (
                        <button
                          key={img}
                          type="button"
                          onClick={() =>
                            setImagenActiva(
                              idx
                            )
                          }
                          className={`h-20 w-20 flex-shrink-0 rounded-xl border-2 bg-white p-1.5 shadow-sm transition-all ${
                            imagenActiva ===
                            idx
                              ? "border-sky-400 ring-2 ring-sky-100"
                              : "border-slate-200 hover:border-slate-300"
                          }`}
                          aria-label={`${
                            t.verImagen
                          } ${
                            idx + 1
                          }`}
                        >
                          <img
                            src={img}
                            alt={`${
                              t.vista
                            } ${
                              idx +
                              1
                            } ${
                              t.de
                            } ${textoEs(
                              producto.nombre
                            )}`}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      )
                    )}
                  </div>

                  <div className="mt-1 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check
                        size={12}
                      />
                    </div>

                    <p className="text-sm leading-relaxed text-slate-700">
                      {
                        t.archivoFinal
                      }{" "}
                      <strong className="font-semibold text-emerald-700">
                        {
                          t.altaCalidad
                        }
                      </strong>
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* =====================================================
                INFORMACIÓN
            ====================================================== */}

            <div className="lg:pt-1">
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                {textoEs(
                  producto.nombre
                )}
              </h1>

              <div className="mb-3 mt-2">
                <CalificacionProducto
                  productoId={
                    producto.id
                  }
                />
              </div>

              <p className="text-sm leading-6 text-slate-600 sm:text-[15px]">
                {textoEs(
                  producto.descripcionLarga
                ) ||
                  textoEs(
                    producto.descripcion
                  )}
              </p>

              {/* PRECIO */}

              <div className="mt-4 border-y border-slate-200 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {t.precio}
                    </p>

                    {tieneOferta ? (
                      <>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            {formatearPrecio(
                              precioFinal
                            )}
                          </p>

                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:text-xs">
                            -
                            {
                              descuento
                            }
                            %
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400 line-through sm:text-sm">
                            {formatearPrecio(
                              producto.precioARS
                            )}
                          </span>

                          {textoEs(
                            producto
                              .oferta
                              ?.etiqueta
                          ) && (
                            <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600 sm:text-xs">
                              {textoEs(
                                producto
                                  .oferta
                                  ?.etiqueta
                              )}
                            </span>
                          )}
                        </div>

                        <p className="mt-1.5 text-xs font-semibold text-emerald-700 sm:text-sm">
                          {
                            t.ahorras
                          }{" "}
                          {formatearPrecio(
                            ahorro
                          )}
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        {formatearPrecio(
                          producto.precioARS
                        )}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-semibold uppercase text-sky-700 sm:text-xs">
                    <Download
                      size={13}
                    />
                    {t.descargable}
                  </span>
                </div>
              </div>

              {/* QUÉ INCLUYE */}

              {listaEs(
                producto.incluye
              ).length > 0 && (
                <div className="mt-4">
                  <h2 className="mb-2 text-base font-semibold text-slate-900">
                    {t.queIncluye}
                  </h2>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {listaEs(
                      producto.incluye
                    ).map(
                      (
                        item,
                        i
                      ) => (
                        <div
                          key={i}
                          className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
                        >
                          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check
                              size={
                                12
                              }
                            />
                          </div>

                          <p className="text-xs leading-tight text-slate-600">
                            {
                              item
                            }
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

                    {/* RESEÑAS */}

                    {resenasDelProducto.length >
                      0 && (
                      <div className="mt-5">
                        <div className="mb-3">
                          <h2 className="text-base font-semibold text-slate-900">
                            {
                              t.resenasTitulo
                            }
                          </h2>
                        </div>

                        <div className="space-y-3">
                          {resenasDelProducto.map(
                            (
                              resena
                            ) => (
                              <div
                                key={
                                  resena.id
                                }
                                className="rounded-xl border border-slate-200 bg-white p-4"
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-1 text-amber-500">
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

                                  {resena.compraVerificada && (
                                    <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                                      {
                                        t.compraVerificada
                                      }
                                    </span>
                                  )}
                                </div>

                                <p className="mt-3 text-sm leading-6 text-slate-600">
                                  “
                                  {
                                    resena.texto
                                  }
                                  ”
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    )}
              {/* COMPRA */}

              <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  {
                    t.descargaPago
                  }
                </p>

                <div className="mt-1 rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <div className="flex items-start gap-2.5">
                    <Mail
                      size={17}
                      className="mt-0.5 shrink-0 text-sky-600"
                    />

                    <p className="text-xs leading-5 text-slate-600">
                      {
                        t.descargaDescripcion
                      }
                    </p>
                  </div>
                </div>

                {tieneOferta && (
                  <div className="mt-3 rounded-lg bg-white/80 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-600">
                        {
                          t.totalOferta
                        }
                      </span>

                      <span className="text-sm font-bold text-slate-900">
                        {formatearPrecio(
                          precioFinal
                        )}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={
                    abrirCheckout
                  }
                  className="boton-principal mt-3 flex w-full items-center justify-center gap-2"
                >
                  <ShoppingBag
                    size={17}
                  />
                  {
                    t.comprarAhora
                  }
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

            {/* =========================================================
          CHECKOUT
      ========================================================= */}

      {checkoutAbierto && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* ENCABEZADO */}

            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {t.finalizarCompra}
                </h2>

                <p className="mt-0.5 text-xs text-slate-500">
                  {t.resumenPedido}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCheckoutAbierto(false);
                  setError("");
                }}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label={t.cerrar}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5">
              {/* PRODUCTO PRINCIPAL */}

              <div className="flex gap-3">
                {producto.imagenes?.portada && (
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <img
                      src={producto.imagenes.portada}
                      alt={textoEs(producto.nombre)}
                      className="h-full w-full object-contain"
                    />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-semibold leading-snug text-slate-900">
                    {textoEs(producto.nombre)}
                  </p>

                  {tieneOferta ? (
                    <div className="mt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-slate-900">
                          {formatearPrecio(precioFinal)}
                        </span>

                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          -{descuento}%
                        </span>
                      </div>

                      <span className="text-xs text-slate-400 line-through">
                        {formatearPrecio(producto.precioARS)}
                      </span>
                    </div>
                  ) : (
                    <p className="mt-1 font-bold text-slate-900">
                      {formatearPrecio(precioFinal)}
                    </p>
                  )}
                </div>
              </div>

              {/* VENTA CRUZADA */}

              {productoExtra && (
                <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <p className="text-sm font-semibold text-slate-900">
                    {t.completaColeccion}
                  </p>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    {t.agregaProducto}
                  </p>

                  <div className="mt-3 flex gap-3">
                    {productoExtra.imagenes?.portada && (
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <img
                          src={productoExtra.imagenes.portada}
                          alt={textoEs(productoExtra.nombre)}
                          className="h-full w-full object-contain"
                        />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug text-slate-900">
                        {textoEs(productoExtra.nombre)}
                      </p>

                      {extraTieneOferta ? (
                        <div className="mt-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">
                              {formatearPrecio(precioExtra)}
                            </span>

                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              -{descuentoExtra}%
                            </span>
                          </div>

                          <span className="text-xs text-slate-400 line-through">
                            {formatearPrecio(productoExtra.precioARS)}
                          </span>
                        </div>
                      ) : (
                        <p className="mt-1 text-sm font-bold text-slate-900">
                          {formatearPrecio(precioExtra)}
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          setExtraAgregado((valor) => !valor)
                        }
                        className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                          extraAgregado
                            ? "bg-emerald-600 text-white hover:bg-emerald-700"
                            : "border border-sky-300 bg-white text-sky-700 hover:bg-sky-100"
                        }`}
                      >
                        {extraAgregado && <Check size={14} />}

                        {extraAgregado
                          ? t.agregadoCompra
                          : t.agregarCompra}
                      </button>
                    </div>
                  </div>

                  {extraAgregado && (
                    <p className="mt-3 text-xs font-medium text-emerald-700">
                      {t.agregadoTotal}
                    </p>
                  )}
                </div>
              )}

              {/* DATOS */}

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  {t.tusDatos}
                </h3>

                <div className="mt-3 space-y-3">
                  <div>
                    <label
                      htmlFor="checkout-nombre"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      {t.nombre}
                    </label>

                    <div className="relative">
                      <User
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="checkout-nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => {
                          setNombre(e.target.value);
                          setError("");
                        }}
                        placeholder={t.nombrePlaceholder}
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="mb-1.5 block text-xs font-medium text-slate-700"
                    >
                      {t.correo}
                    </label>

                    <div className="relative">
                      <Mail
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="checkout-email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setError("");
                        }}
                        placeholder="nombre@correo.com"
                        className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>
                  </div>
                </div>

                {error && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {error}
                  </p>
                )}
              </div>

              {/* RESUMEN */}

              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                {ahorroPedido > 0 && (
                  <>
                    <div className="flex items-center justify-between gap-3 text-xs">
                      <span className="text-slate-500">
                        {t.precioOriginal}
                      </span>

                      <span className="text-slate-500 line-through">
                        {formatearPrecio(precioOriginalPedido)}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-emerald-700">
                        {t.ofertaLanzamiento}
                      </span>

                      <span className="font-semibold text-emerald-700">
                        -{descuentoPedido}%
                      </span>
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                      <span className="font-medium text-emerald-700">
                        {t.ahorras}
                      </span>

                      <span className="font-semibold text-emerald-700">
                        {formatearPrecio(ahorroPedido)}
                      </span>
                    </div>
                  </>
                )}

                <div
                  className={`flex items-center justify-between gap-3 ${
                    ahorroPedido > 0
                      ? "mt-3 border-t border-slate-200 pt-3"
                      : ""
                  }`}
                >
                  <span className="text-sm font-semibold text-slate-900">
                    {t.total}
                  </span>

                  <span className="text-xl font-bold text-slate-900">
                    {formatearPrecio(totalPedido)}
                  </span>
                </div>
              </div>

              {/* WHATSAPP TEMPORAL */}

              <button
                type="button"
                onClick={comprarPorWhatsApp}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                <MessageCircle size={18} />
                {t.comprarWhatsapp}
              </button>

              <p className="mt-2 text-center text-[11px] leading-4 text-slate-500">
                {t.instruccionesWhatsapp}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PREVIEW AMPLIADO
      ========================================================= */}

      {previewAbierto && imagenes[imagenActiva] && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-4">
          <button
            type="button"
            onClick={() => setPreviewAbierto(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
            aria-label={t.cerrarPreview}
          >
            <X size={22} />
          </button>

          <div className="max-h-[92vh] max-w-4xl overflow-hidden rounded-xl bg-white p-2 shadow-2xl">
            {imagenActiva === 0 ? (
              <img
                src={imagenes[imagenActiva]}
                alt={`${t.vistaAmpliada} ${textoEs(producto.nombre)}`}
                className="max-h-[88vh] max-w-full object-contain"
              />
            ) : (
              <ProteccionComercial>
                <img
                  src={imagenes[imagenActiva]}
                  alt={`${t.vistaAmpliada} ${textoEs(producto.nombre)}`}
                  className="max-h-[88vh] max-w-full object-contain"
                />
              </ProteccionComercial>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DetalleProducto;