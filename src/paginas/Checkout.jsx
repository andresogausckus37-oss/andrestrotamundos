import { useMemo, useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  BadgePercent,
  Building2,
  Check,
  CreditCard,
  LockKeyhole,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";

import { productosDigitales } from "../datos/productosDigitales";
import { resenasProductos } from "../datos/resenasProductos";

const DESCUENTO_TRANSFERENCIA = 5;

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  const producto = productosDigitales.find(
    (item) => item.id === id
  );

  const productoVentaCruzada =
  producto?.ventaCruzadaId
    ? productosDigitales.find(
        (item) =>
          item.id === producto.ventaCruzadaId
      )
    : null;

  const precioVentaCruzada =
  productoVentaCruzada
    ? productoVentaCruzada.oferta?.activa &&
      Number(
        productoVentaCruzada.oferta.precioARS
      ) > 0
      ? Number(
          productoVentaCruzada.oferta.precioARS
        )
      : Number(
          productoVentaCruzada.precioARS
        )
    : 0;

const resenasVentaCruzada =
  productoVentaCruzada
    ? resenasProductos.filter(
        (resena) =>
          resena.productoId ===
          productoVentaCruzada.id
      )
    : [];

const promedioVentaCruzada =
  resenasVentaCruzada.length > 0
    ? resenasVentaCruzada.reduce(
        (total, resena) =>
          total + resena.estrellas,
        0
      ) / resenasVentaCruzada.length
    : 0;

  const [ventaCruzadaAgregada, setVentaCruzadaAgregada] =
  useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [metodoPago, setMetodoPago] =
    useState("mercadopago");
  const [procesando, setProcesando] =
    useState(false);
  const [error, setError] = useState("");

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precio);

  const precioProducto = useMemo(() => {
    if (!producto) return 0;

    if (
      producto.oferta?.activa &&
      Number(producto.oferta.precioARS) > 0
    ) {
      return Number(
        producto.oferta.precioARS
      );
    }

    return Number(producto.precioARS);
  }, [producto]);

  const subtotal =
  precioProducto +
  (ventaCruzadaAgregada
    ? precioVentaCruzada
    : 0);

const descuentoTransferencia =
  metodoPago === "transferencia"
    ? Math.round(
        subtotal *
          (DESCUENTO_TRANSFERENCIA / 100)
      )
    : 0;

const total =
  subtotal -
  descuentoTransferencia;

  if (!producto) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-slate-900">
            Producto no encontrado
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate("/tienda/digitales")
            }
            className="mt-4 text-sm font-semibold text-slate-600"
          >
            Volver a la tienda
          </button>
        </div>
      </main>
    );
  }

  const validarDatos = () => {
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();

    if (!nombreLimpio || !emailLimpio) {
      setError(
        "Ingresa tu nombre y correo electrónico."
      );
      return false;
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(emailLimpio)) {
      setError(
        "Ingresa un correo electrónico válido."
      );
      return false;
    }

    setError("");
    return true;
  };

  const pagarMercadoPago = async () => {
    if (!validarDatos()) return;

    try {
      setProcesando(true);
      setError("");

      const respuesta = await fetch(
        "/api/mercadopago/crear-pago",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
  productoId: producto.id,
  nombre: nombre.trim(),
  email: email.trim(),

  ventaCruzadaId:
    ventaCruzadaAgregada &&
    productoVentaCruzada
      ? productoVentaCruzada.id
      : null,
}),
        }
      );

      const datos = await respuesta.json();

      if (
        !respuesta.ok ||
        !datos.checkoutUrl
      ) {
        throw new Error(
          "No se pudo iniciar el pago."
        );
      }

      window.location.href =
        datos.checkoutUrl;
    } catch (error) {
      console.error(
        "Error iniciando Mercado Pago:",
        error
      );

      setError(
        "No se pudo iniciar el pago. Intenta nuevamente."
      );

      setProcesando(false);
    }
  };

  const crearPedidoTransferencia = async () => {
  if (!validarDatos()) return;

  try {
    setProcesando(true);
    setError("");

    const respuesta = await fetch(
      "/api/transferencia/crear-pedido",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          productoId:
            producto.id,

          ventaCruzadaId:
            ventaCruzadaAgregada &&
            productoVentaCruzada
              ? productoVentaCruzada.id
              : null,

          nombre:
            nombre.trim(),

          email:
            email.trim(),
        }),
      }
    );

    const datos =
      await respuesta.json();

    if (
      !respuesta.ok ||
      !datos.pedidoId
    ) {
      throw new Error(
        datos.error ||
          "No se pudo crear el pedido."
      );
    }

    navigate(
      `/pago/transferencia?pedidoId=${encodeURIComponent(
        datos.pedidoId
      )}`
    );
  } catch (error) {
    console.error(
      "Error creando pedido por transferencia:",
      error
    );

    setError(
      error.message ||
        "No se pudo crear el pedido."
    );

    setProcesando(false);
  }
};

  const continuarPago = () => {
    if (metodoPago === "mercadopago") {
      pagarMercadoPago();
      return;
    }

    if (metodoPago === "transferencia") {
      crearPedidoTransferencia();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-10">
      <div className="mx-auto max-w-3xl">
        {/* VOLVER */}

        <button
          type="button"
          onClick={() =>
            navigate(`/tienda/${producto.id}`)
          }
          className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
        >
          <ArrowLeft size={15} />
          Volver al producto
        </button>

        {/* ENCABEZADO */}

        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Compra segura
          </p>

          <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">
            Finalizar compra
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Revisa tu pedido, completa tus datos
            y selecciona cómo quieres pagar.
          </p>
        </div>

        {/* RESUMEN DEL PEDIDO */}

        <section className="mb-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3">
            {producto.imagenes?.portada && (
              <img
                src={producto.imagenes.portada}
                alt={producto.nombre}
                className="h-20 w-16 shrink-0 rounded-lg border border-slate-100 object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-xs font-bold leading-4 text-slate-900 sm:text-sm">
                {producto.nombre}
              </h2>

              <div className="mt-2 flex items-center gap-2">
                <span className="text-base font-bold text-slate-900">
                  {formatearPrecio(
                    precioProducto
                  )}
                </span>

                {producto.oferta?.activa &&
                  Number(producto.precioARS) >
                    precioProducto && (
                    <span className="text-[11px] text-slate-400 line-through">
                      {formatearPrecio(
                        producto.precioARS
                      )}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </section>

        {/* VENTA CRUZADA */}

        {productoVentaCruzada && (
          <section className="mb-5 rounded-xl border border-violet-200 bg-violet-50/70 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-violet-700">
              Completa tu compra
            </p>

            <div className="flex items-center gap-3">
              {productoVentaCruzada.imagenes
                ?.portada && (
                <img
                  src={
                    productoVentaCruzada.imagenes
                      .portada
                  }
                  alt={
                    productoVentaCruzada.nombre
                  }
                  className="h-16 w-14 shrink-0 rounded-lg border border-violet-100 bg-white object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold leading-4 text-slate-900">
                  {productoVentaCruzada.nombre}
                </p>

                {/* PRECIO */}

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-slate-900">
                    {formatearPrecio(
                      precioVentaCruzada
                    )}
                  </span>

                  {productoVentaCruzada.oferta
                    ?.activa &&
                    Number(
                      productoVentaCruzada.precioARS
                    ) > precioVentaCruzada && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatearPrecio(
                          productoVentaCruzada.precioARS
                        )}
                      </span>
                    )}
                </div>

                {/* RESEÑAS */}

                {resenasVentaCruzada.length >
                  0 && (
                  <div className="mt-1 flex items-center gap-1">
                    <div className="flex text-[11px] text-amber-500">
                      {[1, 2, 3, 4, 5].map(
                        (estrella) => (
                          <span key={estrella}>
                            {estrella <=
                            Math.round(
                              promedioVentaCruzada
                            )
                              ? "★"
                              : "☆"}
                          </span>
                        )
                      )}
                    </div>

                    <span className="text-[9px] text-slate-500">
                      (
                      {
                        resenasVentaCruzada.length
                      }
                      )
                    </span>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  setVentaCruzadaAgregada(
                    !ventaCruzadaAgregada
                  )
                }
                className={`shrink-0 rounded-lg px-3 py-2 text-[10px] font-bold transition ${
                  ventaCruzadaAgregada
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-violet-600 text-white hover:bg-violet-700"
                }`}
              >
                {ventaCruzadaAgregada
                  ? "Agregado ✓"
                  : "Agregar +"}
              </button>
            </div>
          </section>
        )}

        {/* =====================================================
            DATOS
        ====================================================== */}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-700">
              1
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Tus datos
              </h2>

              <p className="text-[10px] text-slate-500">
                Usaremos tu correo para
                identificar la compra.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                Nombre
              </span>

              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                <User
                  size={15}
                  className="shrink-0 text-slate-400"
                />

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) =>
                    setNombre(e.target.value)
                  }
                  placeholder="Tu nombre"
                  className="w-full bg-transparent py-2.5 text-xs outline-none"
                />
              </div>
            </label>

            <label>
              <span className="mb-1.5 block text-[11px] font-semibold text-slate-600">
                Correo electrónico
              </span>

              <div className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3">
                <Mail
                  size={15}
                  className="shrink-0 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="tu@email.com"
                  className="w-full bg-transparent py-2.5 text-xs outline-none"
                />
              </div>
            </label>
          </div>
        </section>

        {/* =====================================================
            MÉTODO DE PAGO
            SIN CAJA EXTERNA
        ====================================================== */}

        <section className="mt-5">
          <div className="mb-3 flex items-center gap-2.5 px-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-xs font-bold text-slate-700">
              2
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Método de pago
              </h2>

              <p className="text-[10px] text-slate-500">
                Selecciona la opción que prefieras.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {/* MERCADO PAGO */}

            <button
              type="button"
              onClick={() => {
                setMetodoPago(
                  "mercadopago"
                );
                setError("");
              }}
              className={`w-full rounded-xl border-2 bg-white p-3.5 text-left transition ${
                metodoPago ===
                "mercadopago"
                  ? "border-sky-500"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    metodoPago ===
                    "mercadopago"
                      ? "border-sky-500"
                      : "border-slate-300"
                  }`}
                >
                  {metodoPago ===
                    "mercadopago" && (
                    <div className="h-2 w-2 rounded-full bg-sky-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <CreditCard
                        size={17}
                        className="text-sky-600"
                      />

                      <span className="text-xs font-bold text-slate-900">
                        Mercado Pago
                      </span>
                    </div>

                    <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[9px] font-bold text-sky-700">
                      Hasta 3 cuotas sin interés
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                    Tarjetas de crédito, débito,
                    dinero disponible y otros
                    medios habilitados por Mercado
                    Pago.
                  </p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-500">
                      Crédito
                    </span>

                    <span className="rounded border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-500">
                      Débito
                    </span>

                    <span className="rounded border border-slate-200 px-2 py-0.5 text-[9px] font-medium text-slate-500">
                      Dinero disponible
                    </span>
                  </div>
                </div>
              </div>
            </button>

            {/* TRANSFERENCIA */}

            <button
              type="button"
              onClick={() => {
                setMetodoPago(
                  "transferencia"
                );
                setError("");
              }}
              className={`w-full rounded-xl border-2 bg-white p-3.5 text-left transition ${
                metodoPago ===
                "transferencia"
                  ? "border-emerald-500"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                    metodoPago ===
                    "transferencia"
                      ? "border-emerald-500"
                      : "border-slate-300"
                  }`}
                >
                  {metodoPago ===
                    "transferencia" && (
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2
                        size={17}
                        className="text-emerald-600"
                      />

                      <span className="text-xs font-bold text-slate-900">
                        Transferencia bancaria
                      </span>
                    </div>

                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-700">
                      <BadgePercent
                        size={11}
                      />
                      {
                        DESCUENTO_TRANSFERENCIA
                      }
                      % OFF
                    </span>
                  </div>

                  <p className="mt-1.5 text-[11px] leading-4 text-slate-500">
                    Paga mediante transferencia y
                    obtén un{" "}
                    {DESCUENTO_TRANSFERENCIA}% de
                    descuento adicional.
                  </p>

                  <div className="mt-2 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2">
                    <span className="text-[10px] font-medium text-emerald-700">
                      Total por transferencia
                    </span>

                    <span className="text-sm font-bold text-emerald-700">
                      {formatearPrecio(total)}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* ERROR */}

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-medium text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            BOTÓN FINAL
        ====================================================== */}

        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">

{ventaCruzadaAgregada &&
  productoVentaCruzada && (
    <div className="mb-3 border-b border-slate-100 pb-3">
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <span className="text-slate-600">
          {productoVentaCruzada.nombre}
        </span>

        <span className="shrink-0 font-semibold text-slate-900">
          {formatearPrecio(
            precioVentaCruzada
          )}
        </span>
      </div>
    </div>
  )}
          
          <div className="mb-3 flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-slate-600">
              Total a pagar
            </span>

            <span className="text-xl font-bold text-slate-900">
              {formatearPrecio(total)}
            </span>
          </div>

          <button
            type="button"
            onClick={continuarPago}
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole size={16} />

            {procesando
              ? "Redirigiendo..."
              : metodoPago ===
                "mercadopago"
              ? "Pagar con Mercado Pago"
              : "Continuar con transferencia"}
          </button>

          <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <ShieldCheck
                size={13}
                className="text-emerald-600"
              />
              Compra segura
            </div>

            <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
              <Check
                size={13}
                className="text-emerald-600"
              />
              Descarga digital
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}