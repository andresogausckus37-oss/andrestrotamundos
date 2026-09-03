import CalificacionProducto from "../componentes/CalificacionProducto";
import { resenasProductos } from "../datos/resenasProductos";
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
import { productos } from "../datos/productos";

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

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const producto = productos.find((p) => p.id === id);

  if (!producto) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-white px-5">
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

  const resenasDelProducto = resenasProductos.filter(
  (resena) => resena.productoId === producto.id
);

  const imagenes = [
    producto.imagenes?.portada,
    producto.imagenes?.preview,
  ].filter(Boolean);

  const abrirCheckout = () => {
    setError("");
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

    const mensaje = `Hola Andrés, quiero realizar esta compra:

*Producto:* ${producto.nombre}
*Formato:* ${producto.formato || "PDF"}
*Total:* ${formatearPrecio(producto.precioARS)}

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
      <main className="min-h-screen bg-white px-4 pb-10 pt-10 sm:px-5">
        <div className="mx-auto max-w-7xl">
          {/* VOLVER */}
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-slate-600 hover:text-sky-600"
          >
            <ArrowLeft size={17} />
            Volver
          </button>

          <div className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
            {/* IMÁGENES */}
            <div>
              {/* Imagen principal */}
              <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
                <div className="aspect-[4/5] w-full overflow-hidden rounded-xl bg-white">
                  <img
                    src={imagenes[imagenActiva]}
                    alt={`${producto.nombre} — Imagen ${
                      imagenActiva + 1
                    }`}
                    className="h-full w-full object-contain"
                  />
                </div>
              </div>

              {/* Miniaturas */}
              {producto.imagenes?.preview && (
                <div className="mt-3">
                  <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-500">
                    <Eye size={13} />
                    Deslizá para ver más
                  </p>

                  <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
                    {imagenes.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setImagenActiva(idx)}
                        className={`h-20 w-20 flex-shrink-0 rounded-xl border-2 bg-white p-1.5 shadow-sm transition-all ${
                          imagenActiva === idx
                            ? "border-sky-400 ring-2 ring-sky-100"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <img
                          src={img}
                          alt={`Vista ${idx + 1}`}
                          className="h-full w-full object-contain"
                        />
                      </button>
                    ))}
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    <strong>Nota:</strong> La compra incluye el
                    archivo en alta calidad, sin marcas de agua.
                  </p>
                </div>
              )}
            </div>

            {/* INFORMACIÓN */}
            <div className="lg:pt-1">
              {/* TÍTULO */}
<h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
  {producto.nombre}
</h1>

{/* CALIFICACIÓN */}
<div className="mt-2 mb-3">
  <CalificacionProducto productoId={producto.id} />
</div>

              <p className="text-sm leading-6 text-slate-600 sm:text-[15px]">
                {producto.descripcionLarga || producto.descripcion}
              </p>

              {/* PRECIO + DESCARGABLE */}
              <div className="mt-4 border-y border-slate-200 py-3">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Precio
                    </p>

                    <p className="mt-0.5 text-2xl font-semibold text-slate-900">
                      {formatearPrecio(producto.precioARS)}
                    </p>
                  </div>

                  <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase text-sky-700">
                    <Download size={13} />
                    Descargable
                  </span>
                </div>
              </div>

              {/* QUÉ INCLUYE */}
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

              {/* RESEÑAS */}
{resenasDelProducto.length > 0 && (
  <div className="mt-5">
    <div className="mb-3">
      <h2 className="text-base font-semibold text-slate-900">
        Reseñas
      </h2>

      <p className="mt-1 text-xs leading-5 text-slate-500">
        Opiniones de personas que ya compraron este producto.
      </p>
    </div>

    <div className="space-y-3">
      {resenasDelProducto.map((resena) => (
        <div
          key={resena.id}
          className="rounded-xl border border-slate-200 bg-white p-4"
        >
          {/* ESTRELLAS */}
          <div className="flex items-center gap-1 text-amber-500">
            {[1, 2, 3, 4, 5].map((estrella) => (
              <span key={estrella}>
                {estrella <= resena.estrellas ? "★" : "☆"}
              </span>
            ))}
          </div>

          {/* TEXTO */}
          <p className="mt-2 text-sm leading-6 text-slate-600">
            “{resena.texto}”
          </p>

          {/* PERSONA */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-slate-700">
              {resena.nombre}
              {resena.lugar && ` · ${resena.lugar}`}
            </p>

            {resena.compraVerificada && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
                Compra verificada
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
)}

              {/* COMPRA */}
              <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-4">
                <p className="text-sm font-semibold text-slate-900">
                  Descarga tras confirmar el pago
                </p>

                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Una vez abonado, recibirás el enlace de descarga por correo
                  electrónico.
                </p>

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

      {/* MODAL CHECKOUT */}
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
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Cerrar"
              >
                <X size={19} />
              </button>
            </div>

            <div className="max-h-[82vh] overflow-y-auto p-5">
              {/* PRODUCTO */}
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

                  <p className="mt-1 text-xs text-slate-500">
                    {producto.formato || "PDF"} · Producto digital
                  </p>

                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {formatearPrecio(producto.precioARS)}
                  </p>
                </div>
              </div>

              {/* DATOS */}
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-slate-900">
                  Tus datos
                </h3>

                <div className="mt-3 space-y-3">
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
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Tu nombre"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                      />
                    </div>
                  </div>

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
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RESUMEN */}
              <div className="mt-5 border-y border-slate-200 py-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-600">
                    Producto
                  </span>

                  <span className="text-sm font-medium text-slate-900">
                    {formatearPrecio(producto.precioARS)}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-900">
                    Total
                  </span>

                  <span className="text-lg font-semibold text-slate-900">
                    {formatearPrecio(producto.precioARS)}
                  </span>
                </div>
              </div>

              {/* ENTREGA */}
              <div className="mt-4 rounded-xl border border-sky-100 bg-sky-50 p-3">
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

              {/* ERROR */}
              {error && (
                <p className="mt-3 text-xs font-medium text-red-600">
                  {error}
                </p>
              )}

              {/* WHATSAPP */}
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

      {/* MODAL PREVIEW */}
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
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-md hover:bg-slate-100"
              aria-label="Cerrar vista previa"
            >
              <X size={19} />
            </button>

            <img
              src={producto.imagenes.preview}
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