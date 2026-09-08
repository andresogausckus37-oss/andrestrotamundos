import CalificacionProducto from "../componentes/CalificacionProducto";
import { resenasProductos } from "../datos/resenasProductos";
import { productosDigitales } from "../datos/productosDigitales";
import ProteccionComercial from "../generador/componentes/ProteccionComercial";

import {
  ArrowLeft,
  Check,
  Download,
  ShoppingBag,
  Eye,
  X,
  MessageCircle,
  Mail,
  User,
} from "lucide-react";

import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const WHATSAPP = "5493548619293";

const formatearPrecio = (precio) => {
  if (!precio) return "Precio a definir";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
};

const DetalleProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [previewAbierto, setPreviewAbierto] = useState(false);
  const [checkoutAbierto, setCheckoutAbierto] = useState(false);
  const [imagenActiva, setImagenActiva] = useState(0);
  const [extraAgregado, setExtraAgregado] = useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const producto = productosDigitales.find(
  (p) => p.id === id
);

  if (!producto) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white px-5">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Producto no encontrado
          </h1>

          <p className="mt-2 text-sm text-slate-600">
            El producto no existe o no está disponible.
          </p>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="boton-principal mt-5"
          >
            Volver al inicio
          </button>
        </div>
      </main>
    );
  }

  // =========================================================
  // PRECIO Y OFERTA
  // =========================================================

  const tieneOferta = producto.oferta?.activa === true;

  const precioFinal = tieneOferta
    ? producto.oferta.precioARS
    : producto.precioARS;

  const ahorro = tieneOferta
    ? producto.precioARS - producto.oferta.precioARS
    : 0;

  const descuento = tieneOferta
    ? Math.round((ahorro / producto.precioARS) * 100)
    : 0;

  // =========================================================
// VENTA CRUZADA
// =========================================================

const productoExtra = producto.ventaCruzadaId
  ? productosDigitales.find(
      (p) => p.id === producto.ventaCruzadaId
    )
  : null;

const extraTieneOferta = productoExtra?.oferta?.activa === true;

const precioExtra = productoExtra
  ? extraTieneOferta
    ? productoExtra.oferta.precioARS
    : productoExtra.precioARS
  : 0;

const descuentoExtra =
  productoExtra && extraTieneOferta
    ? Math.round(
        ((productoExtra.precioARS - productoExtra.oferta.precioARS) /
          productoExtra.precioARS) *
          100
      )
    : 0;

const totalPedido =
  precioFinal + (extraAgregado && productoExtra ? precioExtra : 0);

  const precioOriginalPedido =
  producto.precioARS +
  (extraAgregado && productoExtra ? productoExtra.precioARS : 0);

const ahorroPedido = precioOriginalPedido - totalPedido;

const descuentoPedido =
  precioOriginalPedido > 0
    ? Math.round((ahorroPedido / precioOriginalPedido) * 100)
    : 0;

  // =========================================================
  // RESEÑAS
  // =========================================================

  const resenasDelProducto = resenasProductos.filter(
    (resena) => resena.productoId === producto.id
  );

  // =========================================================
  // IMÁGENES
  // =========================================================

  const imagenes = [
  producto.imagenes?.portada,
  producto.imagenes?.preview,
  producto.imagenes?.previewIndividual,
  ...(producto.imagenes?.previewsIndividuales || []),
].filter(Boolean);

  // =========================================================
  // CHECKOUT
  // =========================================================

  const abrirCheckout = () => {
  setError("");
  setExtraAgregado(false);
  setCheckoutAbierto(true);
};

  const comprarPorWhatsApp = () => {
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();

    if (!nombreLimpio || !emailLimpio) {
      setError("Completá tu nombre y correo electrónico.");
      return;
    }

    const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(emailLimpio)) {
      setError("Ingresá un correo electrónico válido.");
      return;
    }

    setError("");

    const detalleOferta =
  ahorroPedido > 0
    ? `
*Precio original del pedido:* ${formatearPrecio(precioOriginalPedido)}
*Descuento:* -${descuentoPedido}%
*Ahorrás:* ${formatearPrecio(ahorroPedido)}`
    : "";

    const detalleExtra =
  extraAgregado && productoExtra
    ? `
*Producto adicional:* ${productoExtra.nombre}`
    : "";

const mensaje = `Hola Andrés, quiero realizar esta compra:

*Producto:* ${producto.nombre}${detalleExtra}

*Precio original del pedido:* ${formatearPrecio(precioOriginalPedido)}
*Descuento:* -${descuentoPedido}%
*Ahorro:* ${formatearPrecio(ahorroPedido)}

*TOTAL DEL PEDIDO:* ${formatearPrecio(totalPedido)}

*Nombre:* ${nombreLimpio}
*Email:* ${emailLimpio}

Quedo atento a las instrucciones de pago.`;

    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(url, "_blank", "noopener,noreferrer");
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
              <div className="relative overflow-hidden rounded-2xl bg-white p-2 shadow-sm">
                <div className="aspect-[4/6] w-full overflow-hidden rounded-xl bg-white">
                  {imagenActiva === 0 ? (
  <img
    src={imagenes[imagenActiva]}
    alt={producto.nombre}
    className="h-full w-full object-contain"
  />
) : (
  <ProteccionComercial>
    <img
      src={imagenes[imagenActiva]}
      alt={`Vista ${imagenActiva + 1} de ${producto.nombre}`}
      className="h-full w-full object-contain"
    />
  </ProteccionComercial>
)}
                </div>
              </div>

              {/* VOLVER */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mb-3 mt-2 inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-600"
              >
                <ArrowLeft size={17} />
                Volver
              </button>

              {/* MINIATURAS */}
              {imagenes.length > 1 && (
                <div className="mt-3">


                  <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
                    {imagenes.map((img, idx) => (
                      <button
                        key={img}
                        type="button"
                        onClick={() => setImagenActiva(idx)}
                        className={`h-20 w-20 flex-shrink-0 rounded-xl border-2 bg-white p-1.5 shadow-sm transition-all ${
                          imagenActiva === idx
                            ? "border-sky-400 ring-2 ring-sky-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        aria-label={`Ver imagen ${idx + 1}`}
                      >
                        <img
                          src={img}
                          alt={`Vista ${idx + 1} de ${producto.nombre}`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>

                  <div className="mt-1 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-1.5">
  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
    <Check size={12} />
  </div>

  <p className="text-sm leading-relaxed text-slate-700">
    El archivo final se entrega en{" "}
    <strong className="font-semibold text-emerald-700">
      alta calidad y sin marcas de agua.
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
              {/* TÍTULO */}
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                {producto.nombre}
              </h1>

              {/* CALIFICACIÓN */}
              <div className="mb-3 mt-2">
                <CalificacionProducto productoId={producto.id} />
              </div>

              {/* DESCRIPCIÓN */}
              <p className="text-sm leading-6 text-slate-600 sm:text-[15px]">
                {producto.descripcionLarga || producto.descripcion}
              </p>

              {/* =================================================
                  PRECIO + DESCARGABLE
              ================================================== */}

              <div className="mt-4 border-y border-slate-200 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Precio
                    </p>

                    {tieneOferta ? (
                      <>
                        <div className="mt-1 flex flex-wrap items-center gap-2">
                          <p className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                            {formatearPrecio(precioFinal)}
                          </p>

                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700 sm:text-xs">
                            -{descuento}%
                          </span>
                        </div>

                        <div className="mt-1.5 flex flex-wrap items-center gap-2">
                          <span className="text-xs text-slate-400 line-through sm:text-sm">
                            {formatearPrecio(producto.precioARS)}
                          </span>

                          <span className="text-[10px] font-bold uppercase tracking-wide text-orange-600 sm:text-xs">
                            {producto.oferta.etiqueta}
                          </span>
                        </div>

                        <p className="mt-1.5 text-xs font-semibold text-emerald-700 sm:text-sm">
                          Ahorrás {formatearPrecio(ahorro)}
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                        {formatearPrecio(producto.precioARS)}
                      </p>
                    )}
                  </div>

                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-[10px] font-semibold uppercase text-sky-700 sm:text-xs">
                    <Download size={13} />
                    Descargable
                  </span>
                </div>
              </div>

              {/* =================================================
                  QUÉ INCLUYE
              ================================================== */}

              {producto.incluye?.length > 0 && (
                <div className="mt-4">
                  <h2 className="mb-2 text-base font-semibold text-slate-900">
                    ¿Qué incluye?
                  </h2>

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {producto.incluye.map((item, i) => (
                      <div
                        key={i}
                        className="flex min-h-12 items-center gap-2 rounded-lg border border-slate-200 bg-white p-2.5"
                      >
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                          <Check size={12} />
                        </div>

                        <p className="text-xs leading-tight text-slate-600">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* =================================================
                  RESEÑAS
              ================================================== */}

              {resenasDelProducto.length > 0 && (
  <div className="mt-5">
    {/* TÍTULO */}

    <div className="mb-3">
      <h2 className="text-base font-semibold text-slate-900">
        Reseñas de personas que compraron este producto
      </h2>
    </div>

    {/* LISTA DE RESEÑAS */}

    <div className="space-y-3">
      {resenasDelProducto.map((resena) => (
        <div
          key={resena.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          {/* ESTRELLAS + COMPRA VERIFICADA */}

          <div className="flex items-center justify-between gap-3">
            {/* ESTRELLAS */}

            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((estrella) => (
                <span key={estrella}>
                  {estrella <= resena.estrellas ? "★" : "☆"}
                </span>
              ))}
            </div>

            {/* BADGE */}

            {resena.compraVerificada && (
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Compra verificada
              </span>
            )}
          </div>

          {/* TEXTO */}

          <p className="mt-3 text-sm leading-6 text-slate-600">
            “{resena.texto}”
          </p>
        </div>
      ))}
    </div>
  </div>
)}

              {/* =================================================
                  COMPRA
              ================================================== */}

              <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Descarga tras confirmar el pago
                </p>

                <div className="mt-1 rounded-xl border border-sky-100 bg-sky-50 p-3">
                  <div className="flex items-start gap-2.5">
                    <Mail
                      size={17}
                      className="mt-0.5 shrink-0 text-sky-600"
                    />

                    <p className="text-xs leading-5 text-slate-600">
                      Una vez confirmado el pago, recibirás el enlace de descarga
                      en el correo electrónico indicado.
                    </p>
                  </div>
                </div>

                {tieneOferta && (
                  <div className="mt-3 rounded-lg bg-white/80 px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-medium text-slate-600">
                        Total con oferta
                      </span>

                      <span className="text-sm font-bold text-slate-900">
                        {formatearPrecio(precioFinal)}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={abrirCheckout}
                  className="boton-principal mt-3 flex w-full items-center justify-center gap-2"
                >
                  <ShoppingBag size={17} />
                  Comprar ahora
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

            {/* =========================================================
          MODAL CHECKOUT
      ========================================================== */}

      {checkoutAbierto && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={() => setCheckoutAbierto(false)}
        >
          <div
            className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* CABECERA */}
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
                  Finalizar compra
                </p>

                <h2 className="mt-0.5 text-lg font-semibold text-slate-900">
                  Resumen del pedido
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setCheckoutAbierto(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[82vh] overflow-y-auto p-5">
              {/* =================================================
                  PRODUCTO
              ================================================== */}

              <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-white">
                  <img
                    src={producto.imagenes?.portada}
                    alt={producto.nombre}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-5 text-slate-900">
                    {producto.nombre}
                  </p>

                  

                  {/* CALIFICACIÓN */}
<div className="mt-2">
  <CalificacionProducto productoId={producto.id} />
</div>

{/* PRECIO + DESCUENTO */}
<div className="mt-3 flex flex-wrap items-center gap-2">
  <span className="text-gl font-bold text-slate-900">
    {formatearPrecio(precioFinal)}
  </span>

  {tieneOferta && (
    <>
      <span className="text-sm text-slate-400 line-through">
        {formatearPrecio(producto.precioARS)}
      </span>

      <span className="rounded-full bg-red-50 px-2 py-1 text-xs font-bold text-red-600">
        -{descuento}%
      </span>
    </>
  )}
</div>

                  {tieneOferta ? (
                    <div className="mt-2">
                      <div className="flex flex-wrap items-center gap-2">                    

                      </div>

                      <div className="mt-0.5 flex flex-wrap items-center gap-2">

                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm font-semibold text-slate-900">
                      {formatearPrecio(producto.precioARS)}
                    </p>
                  )}
                </div>
              </div>

{/* =================================================
    VENTA CRUZADA
================================================== */}

{productoExtra && (
  <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
    <div className="mb-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-orange-600">
        Completá tu colección
      </p>

      <h3 className="mt-0.5 text-sm font-semibold text-slate-900">
        Sumá también este producto
      </h3>
    </div>

    <div className="flex gap-3">
      {/* IMAGEN */}
      <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-white">
        <img
          src={productoExtra.imagenes?.portada}
          alt={productoExtra.nombre}
          className="h-full w-full object-contain"
        />
      </div>

      {/* INFORMACIÓN */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-5 text-slate-900">
          {productoExtra.nombre}
        </p>

        <div className="mt-1">
          <CalificacionProducto productoId={productoExtra.id} />
        </div>

        {/* PRECIO */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="text-base font-bold text-slate-900">
            {formatearPrecio(precioExtra)}
          </span>

          {extraTieneOferta && (
            <>
              <span className="text-xs text-slate-400 line-through">
                {formatearPrecio(productoExtra.precioARS)}
              </span>

              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                -{descuentoExtra}%
              </span>
            </>
          )}
        </div>
      </div>
    </div>

    {/* BOTÓN */}
    <button
      type="button"
      onClick={() => setExtraAgregado((estado) => !estado)}
      className={`mt-3 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
        extraAgregado
          ? "bg-emerald-600 text-white hover:bg-emerald-700"
          : "border border-orange-300 bg-white text-orange-700 hover:bg-orange-50"
      }`}
    >
      {extraAgregado ? (
        <>
          <Check size={17} />
          Agregado a la compra
        </>
      ) : (
        <>
          <ShoppingBag size={17} />
          Agregar a la compra
        </>
      )}
    </button>

    {extraAgregado && (
      <p className="mt-2 text-center text-[11px] font-medium text-emerald-700">
        Se agregó al total de tu pedido.
      </p>
    )}
  </div>
)}

                  {/* =================================================
    DATOS
================================================== */}

              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Tus datos
                </h3>

                <div className="mt-3 space-y-3">
                  {/* NOMBRE */}
                  <div>
                    <label
                      htmlFor="nombre"
                      className="mb-1.5 block text-xs font-medium text-slate-600"
                    >
                      Nombre
                    </label>

                    <div className="relative">
                      <User
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="nombre"
                        type="text"
                        value={nombre}
                        onChange={(e) => {
                          setNombre(e.target.value);

                          if (error) {
                            setError("");
                          }
                        }}
                        placeholder="Tu nombre"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-xs font-medium text-slate-600"
                    >
                      Correo electrónico
                    </label>

                    <div className="relative">
                      <Mail
                        size={16}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                      />

                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);

                          if (error) {
                            setError("");
                          }
                        }}
                        placeholder="tu@email.com"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* =================================================
    RESUMEN
================================================== */}

<div className="mt-5 border-y border-slate-200 py-4">
  {/* PRODUCTOS DEL PEDIDO */}
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm text-slate-600">
        {producto.nombre}
      </span>

      <span className="shrink-0 text-sm font-medium text-slate-900">
        {formatearPrecio(precioFinal)}
      </span>
    </div>

    {extraAgregado && productoExtra && (
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-600">
          + {productoExtra.nombre}
        </span>

        <span className="shrink-0 text-sm font-medium text-slate-900">
          {formatearPrecio(precioExtra)}
        </span>
      </div>
    )}
  </div>

  {/* OFERTA */}
  {ahorroPedido > 0 && (
    <div className="mt-4 border-t border-slate-100 pt-3">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm text-slate-600">
          Precio original
        </span>

        <span className="text-sm text-slate-400 line-through">
          {formatearPrecio(precioOriginalPedido)}
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-orange-600">
          Oferta lanzamiento
        </span>

        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
          -{descuentoPedido}%
        </span>
      </div>

      <div className="mt-2 flex items-center justify-between gap-4">
        <span className="text-sm font-medium text-emerald-700">
          Ahorrás
        </span>

        <span className="text-sm font-semibold text-emerald-700">
          {formatearPrecio(ahorroPedido)}
        </span>
      </div>
    </div>
  )}

  {/* TOTAL */}
  <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
    <span className="font-semibold text-slate-900">
      Total
    </span>

    <span className="text-xl font-bold text-slate-900">
      {formatearPrecio(totalPedido)}
    </span>
  </div>
</div>

              {/* =================================================
                  ENTREGA
              ================================================== */}



              {/* ERROR */}
              {error && (
                <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              {/* =================================================
                  WHATSAPP
              ================================================== */}

              <button
                type="button"
                onClick={comprarPorWhatsApp}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-green-600"
              >
                <MessageCircle size={18} />
                Comprar por WhatsApp
              </button>

              <p className="mt-3 text-center text-[11px] leading-4 text-slate-500">
                Te enviaremos las instrucciones de pago por WhatsApp.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL PREVIEW
      ========================================================== */}

      {previewAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setPreviewAbierto(false)}
        >
          <div
            className="relative max-h-[92vh] w-full max-w-4xl overflow-auto rounded-2xl bg-white p-3 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPreviewAbierto(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md transition hover:bg-slate-100"
              aria-label="Cerrar vista previa"
            >
              <X size={19} />
            </button>

            <img
              src={producto.imagenes?.preview}
              alt={`Vista ampliada de ${producto.nombre}`}
              className="mx-auto max-h-[86vh] w-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

export default DetalleProducto;