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

const LOGO_MERCADO_PAGO =
  "https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/mp%20logo%20";

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

  const [
    ventaCruzadaAgregada,
    setVentaCruzadaAgregada,
  ] = useState(false);

  const [nombre, setNombre] =
    useState("");

  const [email, setEmail] =
    useState("");

  const [metodoPago, setMetodoPago] =
    useState("mercadopago");

  const [procesando, setProcesando] =
    useState(false);

  const [error, setError] =
    useState("");

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

  /* =========================================================
     PRODUCTO NO ENCONTRADO
  ========================================================= */

  if (!producto) {
    return (
      <main className="flex min-h-[70vh] items-center justify-center bg-white px-4">
        <div className="text-center">
          <h1 className="text-xl font-medium text-slate-900">
            Producto no encontrado
          </h1>

          <button
            type="button"
            onClick={() =>
              navigate("/tienda/digitales")
            }
            className="mt-4 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            Volver a la tienda
          </button>
        </div>
      </main>
    );
  }

  /* =========================================================
     VALIDACIÓN
  ========================================================= */

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

  /* =========================================================
     MERCADO PAGO
  ========================================================= */

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

      const datos =
        await respuesta.json();

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

  /* =========================================================
     TRANSFERENCIA
  ========================================================= */

  const crearPedidoTransferencia =
    async () => {
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
    if (
      metodoPago === "mercadopago"
    ) {
      pagarMercadoPago();
      return;
    }

    if (
      metodoPago === "transferencia"
    ) {
      crearPedidoTransferencia();
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-10 pt-4 sm:px-5 sm:pt-6">
      <div className="mx-auto max-w-3xl">
        {/* VOLVER */}

        <button
          type="button"
          onClick={() =>
            navigate(
              `/tienda/${producto.id}`
            )
          }
          className="mb-4 flex items-center gap-2 text-xs font-normal text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft
            size={15}
            strokeWidth={1.8}
          />

          Volver al producto
        </button>

        {/* ENCABEZADO */}

        <div className="mb-5">
          

          <h1 className="mt-1 text-xl font-medium tracking-tight text-slate-900 sm:text-2xl">
            Finalizar compra
          </h1>         
        </div>

        {/* =====================================================
            RESUMEN DEL PEDIDO
        ====================================================== */}

        <section className="mb-3 rounded-md border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            {producto.imagenes?.portada && (
              <img
                src={
                  producto.imagenes.portada
                }
                alt={producto.nombre}
                className="h-20 w-20 shrink-0 rounded-md border border-slate-200 object-cover"
              />
            )}

            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-medium leading-5 text-slate-900 sm:text-sm">
                {producto.nombre}
              </h2>

              <div className="mt-2 flex flex-wrap items-baseline gap-2">
                <span className="text-lg font-medium text-slate-950">
                  {formatearPrecio(
                    precioProducto
                  )}
                </span>

                {producto.oferta?.activa &&
                  Number(
                    producto.precioARS
                  ) >
                    precioProducto && (
                    <span className="text-[11px] font-normal text-slate-400 line-through">
                      {formatearPrecio(
                        producto.precioARS
                      )}
                    </span>
                  )}
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            PRODUCTO ADICIONAL
        ====================================================== */}

        {productoVentaCruzada && (
          <section className="mb-5 rounded-md border border-orange-200 bg-orange-50 p-4">
            <p className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-orange-700">
              También te recomendamos
            </p>

            <div className="flex items-center gap-3">
              {productoVentaCruzada
                .imagenes?.portada && (
                <img
                  src={
                    productoVentaCruzada
                      .imagenes.portada
                  }
                  alt={
                    productoVentaCruzada
                      .nombre
                  }
                  className="h-20 w-20 shrink-0 rounded-md border border-orange-200 bg-white object-cover"
                />
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium leading-4 text-slate-900">
                  {
                    productoVentaCruzada.nombre
                  }
                </p>

                {/* PRECIO */}

                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-md font-medium text-slate-900">
                    {formatearPrecio(
                      precioVentaCruzada
                    )}
                  </span>

                  {productoVentaCruzada
                    .oferta?.activa &&
                    Number(
                      productoVentaCruzada
                        .precioARS
                    ) >
                      precioVentaCruzada && (
                      <span className="text-[12px] font-normal text-slate-400 line-through">
                        {formatearPrecio(
                          productoVentaCruzada
                            .precioARS
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
                          <span
                            key={estrella}
                          >
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

                    <span className="text-[9px] font-normal text-slate-500">
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
                className={`shrink-0 rounded-md border px-3 py-2 text-[10px] font-medium transition-colors ${
                  ventaCruzadaAgregada
                    ? "border-orange-300 bg-white text-orange-700"
                    : "border-orange-700 bg-orange-700 text-white hover:bg-orange-800"
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

        <section className="rounded-md border border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center gap-2.5">
            <div>
              <h2 className="text-md font-medium text-slate-900">
                Tus datos
              </h2>

              <p className="mt-0.5 text-[13px] font-normal text-slate-500">
                Usaremos tu correo para identificar la compra.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* NOMBRE */}

            <label className="min-w-0">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Nombre
              </span>

              <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 transition-colors focus-within:border-slate-500">
                <User
                  size={15}
                  strokeWidth={1.8}
                  className="shrink-0 text-slate-400"
                />

                <input
                  type="text"
                  value={nombre}
                  onChange={(e) =>
                    setNombre(e.target.value)
                  }
                  placeholder="Tu nombre"
                  className="min-w-0 w-full bg-transparent py-2.5 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>

            {/* CORREO */}

            <label className="min-w-0">
              <span className="mb-1.5 block text-[13px] font-medium text-slate-700">
                Correo electrónico
              </span>

              <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 transition-colors focus-within:border-slate-500">
                <Mail
                  size={15}
                  strokeWidth={1.8}
                  className="shrink-0 text-slate-400"
                />

                <input
                  type="email"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  placeholder="tu@email.com"
                  className="min-w-0 w-full bg-transparent py-2.5 text-xs font-normal text-slate-900 outline-none placeholder:text-slate-400"
                />
              </div>
            </label>
          </div>
        </section>

                {/* =====================================================
            MÉTODO DE PAGO
        ====================================================== */}

        <section className="mt-5">
          <div className="mb-3 flex items-center gap-2.5 px-1">
            

            <div>
              <h2 className="text-md font-medium text-slate-900">
                Método de pago
              </h2>

              <p className="mt-0.5 text-[13px] font-normal text-slate-500">
                Selecciona cómo abonarás tu compra.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* =================================================
                MERCADO PAGO
            ================================================== */}

            <button
              type="button"
              onClick={() => {
                setMetodoPago(
                  "mercadopago"
                );
                setError("");
              }}
              className={`w-full rounded-md border bg-white p-4 text-left transition-colors ${
                metodoPago ===
                "mercadopago"
                  ? "border-slate-900"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* SELECTOR */}

                <div
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    metodoPago ===
                    "mercadopago"
                      ? "border-slate-900"
                      : "border-slate-300"
                  }`}
                >
                  {metodoPago ===
                    "mercadopago" && (
                    <div className="h-2 w-2 rounded-full bg-slate-900" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* CABECERA */}

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <CreditCard
                        size={17}
                        strokeWidth={1.8}
                        className="shrink-0 text-slate-600"
                      />

                      <span className="text-sm font-medium text-slate-900">
                        Mercado Pago
                      </span>
                    </div>

                    {/* LOGO MERCADO PAGO */}

                    <img
  src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/logo%20mp%20%C3%BAltima%20"
  alt="Mercado Pago"
  className="relative -top-4 h-auto w-[115px] shrink-0 object-contain sm:w-[105px]"
/>
                  </div>

                  {/* DESCRIPCIÓN */}

                  <p className="-mt-7 max-w-xl text-[12px] font-normal leading-5 text-slate-600 sm:text-xs">
                    Tarjetas de crédito, débito,
                    dinero disponible y otros
                    medios habilitados por Mercado
                    Pago.
                  </p>

                  {/* TARJETAS / MEDIOS DE PAGO */}

<div className="mt-3 border-t border-slate-200 pt-3">
  <p className="text-[11px] font-normal text-slate-500">
    Hasta 3 cuotas sin interés con medios seleccionados.
  </p>

  <div className="mt-2 flex flex-wrap items-center gap-1">
    {/* VISA */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/visa%20"
        alt="Visa"
        className="h-14 w-auto max-w-[48px] object-contain"
      />
    </div>

    {/* MASTERCARD */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/mastercard"
        alt="Mastercard"
        className="h-12 w-auto max-w-[48px] object-cover"
      />
    </div>

    {/* AMERICAN EXPRESS */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/ae"
        alt="American Express"
        className="h-8 w-auto max-w-[48px] object-contain"
      />
    </div>

    {/* NARANJA X */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/nx"
        alt="Naranja X"
        className="h-8 w-auto max-w-[48px] object-contain"
      />
    </div>

    {/* MAESTRO */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/maestro"
        alt="Maestro"
        className="h-8 w-auto max-w-[40px] object-contain"
      />
    </div>

    {/* NATIVA */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/nativa"
        alt="Nativa"
        className="h-10 w-auto max-w-[48px] rounded-sm object-contain"
      />
    </div>

    {/* SHOPPING */}
    <div className="flex h-8 min-w-[52px] items-center justify-center rounded-md border border-slate-200 bg-white px-2">
      <img
        src="https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logos/shopping%20"
        alt="Shopping"
        className="h-8 w-auto max-w-[40px] rounded-sm object-contain"
      />
    </div>
  </div>
</div>
</div>
</div>
</button>

            {/* =================================================
                TRANSFERENCIA
            ================================================== */}

            <button
              type="button"
              onClick={() => {
                setMetodoPago(
                  "transferencia"
                );
                setError("");
              }}
              className={`w-full rounded-md border bg-white p-4 text-left transition-colors ${
                metodoPago ===
                "transferencia"
                  ? "border-slate-900"
                  : "border-slate-200 hover:border-slate-400"
              }`}
            >
              <div className="flex items-start gap-3">
                {/* SELECTOR */}

                <div
                  className={`mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                    metodoPago ===
                    "transferencia"
                      ? "border-slate-900"
                      : "border-slate-300"
                  }`}
                >
                  {metodoPago ===
                    "transferencia" && (
                    <div className="h-2 w-2 rounded-full bg-slate-900" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  {/* CABECERA */}

                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Building2
                        size={17}
                        strokeWidth={1.8}
                        className="text-slate-600"
                      />

                      <span className="text-sm font-medium text-slate-900">
                        Transferencia bancaria
                      </span>
                    </div>

                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-orange-700">
                      <BadgePercent
                        size={12}
                        strokeWidth={1.8}
                      />

                      {
                        DESCUENTO_TRANSFERENCIA
                      }
                      % OFF
                    </span>
                  </div>

                  <p className="mt-2 text-[12px] font-normal leading-5 text-slate-600 sm:text-xs">
                    Paga mediante transferencia y
                    ahorra{" "}
                    {DESCUENTO_TRANSFERENCIA}% 
                     adicional 🔥
                  </p>

                  {/* TOTAL TRANSFERENCIA */}

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className="text-[11px] font-normal text-slate-600">
                      Total por transferencia
                    </span>

                    <span className="text-base font-medium text-slate-900">
                      {formatearPrecio(
                        total
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-[11px] font-medium text-red-700">
            {error}
          </div>
        )}

        {/* =====================================================
            RESUMEN FINAL
        ====================================================== */}

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
          {/* PRODUCTO ADICIONAL AGREGADO */}

          {ventaCruzadaAgregada &&
            productoVentaCruzada && (
              <div className="mb-3 border-b border-slate-200 pb-3">
                <div className="flex items-start justify-between gap-3 text-[11px]">
                  <span className="max-w-[70%] font-normal leading-4 text-slate-600">
                    {
                      productoVentaCruzada.nombre
                    }
                  </span>

                  <span className="shrink-0 font-medium text-slate-900">
                    {formatearPrecio(
                      precioVentaCruzada
                    )}
                  </span>
                </div>
              </div>
            )}

          {/* DESCUENTO TRANSFERENCIA */}

          {metodoPago ===
            "transferencia" &&
            descuentoTransferencia >
              0 && (
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <span className="text-[11px] font-normal text-slate-600">
                  Descuento por transferencia
                </span>

                <span className="text-[11px] font-medium text-orange-700">
                  -
                  {formatearPrecio(
                    descuentoTransferencia
                  )}
                </span>
              </div>
            )}

          {/* TOTAL */}

          <div className="mb-4 flex items-end justify-between gap-3">
            <span className="text-sm font-normal text-slate-600">
              Total a pagar
            </span>

            <span className="text-2xl font-medium tracking-tight text-slate-950">
              {formatearPrecio(total)}
            </span>
          </div>

          {/* BOTÓN FINAL */}

          <button
            type="button"
            onClick={continuarPago}
            disabled={procesando}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#285861] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#204850] disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LockKeyhole
              size={16}
              strokeWidth={1.8}
            />

            {procesando
              ? "Redirigiendo..."
              : metodoPago ===
                "mercadopago"
              ? "Pagar con Mercado Pago"
              : "Continuar con transferencia"}
          </button>

          {/* SEGURIDAD */}

          <div className="mb-20 mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2">
            <div className="flex items-center gap-1.5 text-[10px] font-normal text-slate-500">
              <ShieldCheck
                size={13}
                strokeWidth={1.8}
                className="text-slate-500"
              />

              Compra segura
            </div>

            <div className="flex items-center gap-1.5 text-[10px] font-normal text-slate-500">
              <Check
                size={13}
                strokeWidth={1.8}
                className="text-slate-500"
              />

              Descarga digital
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}