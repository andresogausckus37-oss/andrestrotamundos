import {
  useEffect,
  useMemo,
  useState,
} from "react";

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

import {
  MERCADO_ARGENTINA,
  MERCADO_INTERNACIONAL,
  obtenerMercadoPorPais,
  obtenerPrecioMercado,
  formatearPrecioMercado,
} from "../utilidades/mercado";

const DESCUENTO_TRANSFERENCIA = 5;

const LOGO_PAYPAL =
  "https://wfcprfdtn1w76omy.public.blob.vercel-storage.com/logo%20paypal%20";

export default function Checkout() {
  const { id } = useParams();
  const navigate = useNavigate();

  /* =========================================================
     MERCADO
  ========================================================= */

  const [mercado, setMercado] =
    useState(null);

  const [pais, setPais] =
    useState(null);

  const [
    cargandoMercado,
    setCargandoMercado,
  ] = useState(true);

  /* =========================================================
     PRODUCTOS
  ========================================================= */

  const producto =
    productosDigitales.find(
      (item) => item.id === id
    );

  const productoVentaCruzada =
    producto?.ventaCruzadaId
      ? productosDigitales.find(
          (item) =>
            item.id ===
            producto.ventaCruzadaId
        )
      : null;

  const precioVentaCruzada =
    obtenerPrecioMercado(
      productoVentaCruzada,
      mercado || MERCADO_ARGENTINA
    );

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
        ) /
        resenasVentaCruzada.length
      : 0;

  /* =========================================================
     ESTADOS
  ========================================================= */

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

  /* =========================================================
     DETECTAR MERCADO
  ========================================================= */

  useEffect(() => {
    const detectarMercado = async () => {
      try {
        /* ===============================================
           MODO DE PRUEBA
           ?mercado=internacional fuerza USD + PayPal
        =============================================== */

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
          setPais("TEST");
          setMercado(
            MERCADO_INTERNACIONAL
          );
          setCargandoMercado(false);
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

        setPais(datos.pais || null);

        setMercado(
          datos.mercado ===
            MERCADO_ARGENTINA
            ? MERCADO_ARGENTINA
            : MERCADO_INTERNACIONAL
        );
      } catch (error) {
        console.error(
          "Error detectando mercado:",
          error
        );

        setPais("AR");

        setMercado(
          MERCADO_ARGENTINA
        );
      } finally {
        setCargandoMercado(false);
      }
    };

    detectarMercado();
  }, []);

  /* =========================================================
     MÉTODO DE PAGO SEGÚN MERCADO
  ========================================================= */

  useEffect(() => {
    if (!mercado) return;

    if (
      mercado === MERCADO_INTERNACIONAL
    ) {
      setMetodoPago("paypal");
    } else {
      setMetodoPago("mercadopago");
    }
  }, [mercado]);

  /* =========================================================
     PRECIOS
  ========================================================= */

  const formatearPrecio = (precio) =>
    formatearPrecioMercado(
      precio,
      mercado || MERCADO_ARGENTINA
    );

  const precioProducto =
    useMemo(() => {
      return obtenerPrecioMercado(
        producto,
        mercado ||
          MERCADO_ARGENTINA
      );
    }, [producto, mercado]);

  const subtotal =
    precioProducto +
    (ventaCruzadaAgregada
      ? precioVentaCruzada
      : 0);

  const descuentoTransferencia =
    metodoPago === "transferencia"
      ? Math.round(
          subtotal *
            (DESCUENTO_TRANSFERENCIA /
              100)
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
              navigate(
                "/tienda/digitales"
              )
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
    const nombreLimpio =
      nombre.trim();

    const emailLimpio =
      email.trim();

    if (
      !nombreLimpio ||
      !emailLimpio
    ) {
      setError(
        "Ingresa tu nombre y correo electrónico."
      );

      return false;
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailValido.test(
        emailLimpio
      )
    ) {
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

  const pagarMercadoPago =
    async () => {
      if (!validarDatos()) return;

      try {
        setProcesando(true);
        setError("");

        const respuesta =
          await fetch(
            "/api/mercadopago/crear-pago",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                productoId:
                  producto.id,

                nombre:
                  nombre.trim(),

                email:
                  email.trim(),

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

        const respuesta =
          await fetch(
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

  /* =========================================================
     PAYPAL
  ========================================================= */

  const pagarPayPal = async () => {
    if (!validarDatos()) return;

    try {
      setProcesando(true);
      setError("");

      const respuesta = await fetch(
        "/api/paypal/pago?accion=crear",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productoId:
              producto.id,

            email:
              email.trim(),

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
        !datos.approveUrl
      ) {
        throw new Error(
          datos.error ||
            "No se pudo iniciar el pago con PayPal."
        );
      }

      window.location.href =
        datos.approveUrl;
    } catch (error) {
      console.error(
        "Error iniciando PayPal:",
        error
      );

      setError(
        error.message ||
          "No se pudo iniciar el pago con PayPal."
      );

      setProcesando(false);
    }
  };

  /* =========================================================
     CONTINUAR PAGO
  ========================================================= */

  const continuarPago = () => {
    if (
      mercado ===
      MERCADO_INTERNACIONAL
    ) {
      pagarPayPal();
      return;
    }

    if (
      metodoPago ===
      "transferencia"
    ) {
      crearPedidoTransferencia();
      return;
    }

    pagarMercadoPago();
  };

              <div className="grid gap-3">
              {/* MERCADO PAGO */}

              <button
                type="button"
                onClick={() =>
                  setMetodoPago(
                    "mercadopago"
                  )
                }
                className={`relative w-full rounded-md border p-4 text-left transition-all ${
                  metodoPago ===
                  "mercadopago"
                    ? "border-sky-500 bg-sky-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      metodoPago ===
                      "mercadopago"
                        ? "border-sky-500 bg-sky-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {metodoPago ===
                      "mercadopago" && (
                      <Check
                        size={12}
                        strokeWidth={2}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <CreditCard
                        size={17}
                        strokeWidth={1.8}
                        className="text-slate-700"
                      />

                      <span className="text-sm font-medium text-slate-900">
                        Mercado Pago
                      </span>
                    </div>

                    <p className="mt-1 text-[12px] font-normal leading-5 text-slate-500">
                      Tarjetas de crédito,
                      débito y dinero en
                      Mercado Pago.
                    </p>
                  </div>
                </div>
              </button>

              {/* TRANSFERENCIA */}

              <button
                type="button"
                onClick={() =>
                  setMetodoPago(
                    "transferencia"
                  )
                }
                className={`relative w-full rounded-md border p-4 text-left transition-all ${
                  metodoPago ===
                  "transferencia"
                    ? "border-emerald-500 bg-emerald-50/70"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                      metodoPago ===
                      "transferencia"
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {metodoPago ===
                      "transferencia" && (
                      <Check
                        size={12}
                        strokeWidth={2}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Building2
                        size={17}
                        strokeWidth={1.8}
                        className="text-slate-700"
                      />

                      <span className="text-sm font-medium text-slate-900">
                        Transferencia
                        bancaria
                      </span>

                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        5% OFF
                      </span>
                    </div>

                    <p className="mt-1 text-[12px] font-normal leading-5 text-slate-500">
                      Transferí desde tu
                      banco o billetera
                      virtual.
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </section>
        )}

        {/* =====================================================
            RESUMEN FINAL
        ====================================================== */}

        <section className="mt-5 rounded-md border border-slate-200 bg-white p-4">
          <h2 className="text-md font-medium text-slate-900">
            Resumen de compra
          </h2>

          <div className="mt-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <span className="text-[13px] font-normal text-slate-600">
                {producto.nombre}
              </span>

              <span className="shrink-0 text-[13px] font-medium text-slate-900">
                {formatearPrecio(
                  precioProducto
                )}
              </span>
            </div>

            {ventaCruzadaAgregada &&
              productoVentaCruzada && (
                <div className="flex items-start justify-between gap-4">
                  <span className="text-[13px] font-normal text-slate-600">
                    {
                      productoVentaCruzada.nombre
                    }
                  </span>

                  <span className="shrink-0 text-[13px] font-medium text-slate-900">
                    {formatearPrecio(
                      precioVentaCruzada
                    )}
                  </span>
                </div>
              )}

            {metodoPago ===
              "transferencia" &&
              descuentoTransferencia >
                0 && (
                <div className="flex items-center justify-between gap-4 text-emerald-700">
                  <span className="flex items-center gap-1.5 text-[13px] font-normal">
                    <BadgePercent
                      size={14}
                      strokeWidth={1.8}
                    />

                    Descuento por
                    transferencia
                  </span>

                  <span className="shrink-0 text-[13px] font-medium">
                    -
                    {formatearPrecio(
                      descuentoTransferencia
                    )}
                  </span>
                </div>
              )}

            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-end justify-between gap-4">
                <span className="text-sm font-medium text-slate-900">
                  Total
                </span>

                <div className="text-right">
                  <span className="block text-xl font-medium tracking-tight text-slate-950">
                    {formatearPrecio(
                      total
                    )}
                  </span>

                  <span className="mt-0.5 block text-[10px] font-normal text-slate-400">
                    {mercado ===
                    MERCADO_ARGENTINA
                      ? "Pesos argentinos"
                      : "Dólares estadounidenses"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ERROR */}

          {error && (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-xs font-normal leading-5 text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* BOTÓN DE PAGO */}

          <button
            type="button"
            onClick={continuarPago}
            disabled={
              procesando ||
              cargandoMercado
            }
            className={`mt-5 flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              metodoPago === "paypal"
                ? "bg-[#FFC439] text-[#111820] hover:bg-[#F2BA36]"
                : "gap-2 bg-[#285861] text-white hover:bg-[#204850]"
            }`}
          >
            {metodoPago ===
            "paypal" ? (
              procesando ||
              cargandoMercado ? (
                "Redirigiendo..."
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>
                    Pay with
                  </span>

                  <img
                    src={
                      LOGO_PAYPAL
                    }
                    alt="PayPal"
                    className="h-5 w-auto object-contain"
                  />
                </span>
              )
            ) : (
              <>
                <LockKeyhole
                  size={16}
                  strokeWidth={1.8}
                />

                {cargandoMercado
                  ? "Cargando..."
                  : procesando
                    ? "Redirigiendo..."
                    : metodoPago ===
                        "mercadopago"
                      ? "Pagar con Mercado Pago"
                      : "Continuar con transferencia"}
              </>
            )}
          </button>

          {/* SEGURIDAD */}

          <div className="mt-3 flex items-center justify-center gap-4">
            <span className="flex items-center gap-1.5 text-[10px] font-normal text-slate-500">
              <ShieldCheck
                size={13}
                strokeWidth={1.8}
              />

              Compra segura
            </span>

            <span className="h-3 w-px bg-slate-200" />

            <span className="flex items-center gap-1.5 text-[10px] font-normal text-slate-500">
              <LockKeyhole
                size={12}
                strokeWidth={1.8}
              />

              Descarga digital
            </span>
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

          {metodoPago ===
            "transferencia" &&
            descuentoTransferencia >
              0 && (
              <div className="mb-3 flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <span className="text-[11px] font-normal text-slate-600">
                  Descuento por
                  transferencia
                </span>

                <span className="text-[11px] font-medium text-orange-700">
                  -
                  {formatearPrecio(
                    descuentoTransferencia
                  )}
                </span>
              </div>
            )}

          <div className="mb-4 flex items-end justify-between gap-3">
            <span className="text-sm font-normal text-slate-600">
              Total a pagar
            </span>

            <span className="text-2xl font-medium tracking-tight text-slate-950">
              {formatearPrecio(
                total
              )}
            </span>
          </div>

          <button
            type="button"
            onClick={continuarPago}
            disabled={
              procesando ||
              cargandoMercado
            }
            className={`flex w-full items-center justify-center rounded-md px-4 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              metodoPago === "paypal"
                ? "bg-[#FFC439] text-[#111820] hover:bg-[#F2BA36]"
                : "gap-2 bg-[#285861] text-white hover:bg-[#204850]"
            }`}
          >
            {metodoPago ===
            "paypal" ? (
              procesando ||
              cargandoMercado ? (
                "Redirigiendo..."
              ) : (
                <span className="flex items-center justify-center gap-1">
                  <span>
                    Pay with
                  </span>

                  <img
                    src={LOGO_PAYPAL}
                    alt="PayPal"
                    className="h-6 w-auto object-contain"
                  />
                </span>
              )
            ) : (
              <>
                <LockKeyhole
                  size={16}
                  strokeWidth={1.8}
                />

                {cargandoMercado
                  ? "Cargando..."
                  : procesando
                    ? "Redirigiendo..."
                    : metodoPago ===
                        "mercadopago"
                      ? "Pagar con Mercado Pago"
                      : "Continuar con transferencia"}
              </>
            )}
          </button>

          {/* TEXTOS INFERIORES */}

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