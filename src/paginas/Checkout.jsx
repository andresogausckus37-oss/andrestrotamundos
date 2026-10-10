import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Mail,
  MapPin,
  MessageCircle,
  Minus,
  Package,
  Phone,
  Plus,
  ShoppingBag,
  User,
} from "lucide-react";

const WHATSAPP = "5493548619293";
const CUOTAS_SIN_INTERES = 3;

const Checkout = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState("");
  const [error, setError] = useState("");
  const [creandoPedido, setCreandoPedido] =
  useState(false);

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [telefono, setTelefono] = useState("");
  const [direccion, setDireccion] = useState("");
  const [localidad, setLocalidad] = useState("");
  const [provincia, setProvincia] = useState("");
  const [codigoPostal, setCodigoPostal] = useState("");
  const [cantidad, setCantidad] = useState(1);
  const [variante, setVariante] = useState("");
  const [mostrarResumen, setMostrarResumen] = useState(true);

  useEffect(() => {
    let cancelado = false;

    const cargarProducto = async () => {
      try {
        setCargando(true);
        setErrorCarga("");

        const respuesta = await fetch(
          "/api/admin/pedidos?accion=productos-publicos"
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudo cargar el producto."
          );
        }

        const lista = Array.isArray(datos.productos)
          ? datos.productos
          : [];

        const encontrado = lista.find(
          (item) => String(item.id) === String(id)
        );

        if (!encontrado) {
          throw new Error("Producto no encontrado.");
        }

        if (!cancelado) {
          setProducto(encontrado);

          const variantes = Array.isArray(
            encontrado.detalles?.variantes
          )
            ? encontrado.detalles.variantes
            : [];

          if (variantes.length === 1) {
            setVariante(variantes[0]);
          }
        }
      } catch (errorProducto) {
        console.error(
          "Error cargando producto para checkout:",
          errorProducto
        );

        if (!cancelado) {
          setErrorCarga(
            errorProducto.message ||
              "No se pudo cargar el producto."
          );
        }
      } finally {
        if (!cancelado) {
          setCargando(false);
        }
      }
    };

    cargarProducto();

    return () => {
      cancelado = true;
    };
  }, [id]);

  const variantes = useMemo(() => {
    if (!producto) return [];

    return Array.isArray(producto.detalles?.variantes)
      ? producto.detalles.variantes.filter(Boolean)
      : [];
  }, [producto]);

  const precioUnitario = useMemo(() => {
    if (!producto) return 0;

    const precioNormal = Number(producto.precioARS) || 0;
    const precioOferta = Number(
      producto.oferta?.precioARS
    ) || 0;

    const finalizaEn =
      producto.ofertaLanzamiento?.finalizaEn;

    const ofertaVigente = finalizaEn
      ? new Date(finalizaEn).getTime() > Date.now()
      : true;

    if (
      producto.oferta?.activa === true &&
      precioOferta > 0 &&
      ofertaVigente
    ) {
      return precioOferta;
    }

    return precioNormal;
  }, [producto]);

  const total = precioUnitario * cantidad;
  const valorCuota =
    total > 0 ? total / CUOTAS_SIN_INTERES : 0;

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const cambiarCantidad = (nuevaCantidad) => {
    const stock = Number(producto?.stock);

    let siguiente = Math.max(
      1,
      Number(nuevaCantidad) || 1
    );

    if (
      Number.isFinite(stock) &&
      stock > 0
    ) {
      siguiente = Math.min(siguiente, stock);
    }

    setCantidad(siguiente);
  };

  const validar = () => {
    const nombreLimpio = nombre.trim();
    const emailLimpio = email.trim();
    const telefonoLimpio = telefono.trim();
    const direccionLimpia = direccion.trim();
    const localidadLimpia = localidad.trim();
    const provinciaLimpia = provincia.trim();
    const codigoPostalLimpio = codigoPostal.trim();

    if (
      !nombreLimpio ||
      !emailLimpio ||
      !telefonoLimpio ||
      !direccionLimpia ||
      !localidadLimpia ||
      !provinciaLimpia ||
      !codigoPostalLimpio
    ) {
      setError("Completa todos los datos para continuar.");
      return false;
    }

    const emailValido =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailValido.test(emailLimpio)) {
      setError("Ingresa un correo electrónico válido.");
      return false;
    }

    if (variantes.length > 0 && !variante) {
      setError("Selecciona una variante del producto.");
      return false;
    }

    if (
      producto?.disponibilidad === "sin-stock" ||
      Number(producto?.stock) === 0
    ) {
      setError("Este producto no tiene stock disponible.");
      return false;
    }

    if (producto?.disponibilidad === "proximamente") {
      setError("Este producto todavía no está disponible para comprar.");
      return false;
    }

    setError("");
    return true;
  };

  const continuarPorWhatsApp = async () => {
  if (
    !producto ||
    !validar() ||
    creandoPedido
  ) {
    return;
  }

  try {
    setCreandoPedido(true);
    setError("");

    const respuesta = await fetch(
      "/api/admin/pedidos?accion=crear-pedido",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          productoId: producto.id,
          variante,
          cantidad,

          nombreComprador:
            nombre.trim(),

          emailComprador:
            email.trim(),

          telefonoComprador:
            telefono.trim(),

          direccion:
            direccion.trim(),

          localidad:
            localidad.trim(),

          provincia:
            provincia.trim(),

          codigoPostal:
            codigoPostal.trim(),
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
          "No se pudo crear el pedido."
      );
    }

    if (!datos.pedidoId) {
      throw new Error(
        "No se recibió el número de pedido."
      );
    }

    const nombreProducto =
      typeof producto.nombre === "string"
        ? producto.nombre
        : producto.nombre?.es ||
          "Producto";

    const mensaje = `Hola, quiero continuar con este pedido:

*Número de pedido:* ${datos.pedidoId}

*Producto:* ${nombreProducto}
${variante ? `*Variante:* ${variante}\n` : ""}*Cantidad:* ${cantidad}
*Precio unitario:* ${formatearPrecio(precioUnitario)}
*Total:* ${formatearPrecio(total)}

*Pago:* hasta ${CUOTAS_SIN_INTERES} cuotas sin interés con Mercado Pago.
Quedo a la espera del link de pago.

*Datos del comprador*
Nombre: ${nombre.trim()}
Email: ${email.trim()}
Teléfono: ${telefono.trim()}

*Dirección de envío*
Dirección: ${direccion.trim()}
Localidad: ${localidad.trim()}
Provincia: ${provincia.trim()}
Código postal: ${codigoPostal.trim()}`;

    const url =
      `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
        mensaje
      )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  } catch (errorPedido) {
    console.error(
      "Error creando pedido:",
      errorPedido
    );

    setError(
      errorPedido.message ||
        "No se pudo iniciar el pedido."
    );
  } finally {
    setCreandoPedido(false);
  }
};

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCFDFC] px-5">
        <p className="text-sm text-slate-500">
          Cargando pedido...
        </p>
      </main>
    );
  }

  if (errorCarga || !producto) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCFDFC] px-5">
        <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <Package
            size={32}
            strokeWidth={1.6}
            className="mx-auto text-slate-400"
          />

          <h1 className="mt-3 text-xl font-semibold text-slate-900">
            Producto no disponible
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {errorCarga || "No se encontró el producto."}
          </p>

          <button
            type="button"
            onClick={() => navigate("/tienda")}
            className="mt-5 rounded-md bg-[#285861] px-5 py-2.5 text-sm font-medium text-white"
          >
            Volver a la tienda
          </button>
        </div>
      </main>
    );
  }

  const nombreProducto =
    typeof producto.nombre === "string"
      ? producto.nombre
      : producto.nombre?.es || "Producto";

  const imagen =
    producto.imagenes?.portada ||
    producto.imagenes?.redes?.feed?.presentacion ||
    "";

  const sinStock =
    producto.disponibilidad === "sin-stock" ||
    Number(producto.stock) === 0;

  const noDisponible =
    sinStock ||
    producto.disponibilidad === "proximamente";

  return (
    <main className="min-h-screen bg-[#FCFDFC] px-4 pb-20 pt-4 sm:px-5 sm:pt-7">
      <div className="mx-auto max-w-5xl">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 transition hover:text-[#285861]"
        >
          <ArrowLeft size={17} strokeWidth={1.8} />
          Volver
        </button>

        <div className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-5">
            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4">
                <h1 className="text-xl font-semibold text-slate-900">
                  Finalizar pedido
                </h1>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  Completa tus datos. El pedido continuará por WhatsApp,
                  donde recibirás el link de pago de Mercado Pago.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Campo
                  etiqueta="Nombre y apellido"
                  icono={User}
                  value={nombre}
                  onChange={setNombre}
                  placeholder="Tu nombre completo"
                  autoComplete="name"
                />

                <Campo
                  etiqueta="Correo electrónico"
                  icono={Mail}
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="tu@email.com"
                  autoComplete="email"
                />

                <Campo
                  etiqueta="Teléfono"
                  icono={Phone}
                  type="tel"
                  value={telefono}
                  onChange={setTelefono}
                  placeholder="Ej. 351 123 4567"
                  autoComplete="tel"
                />

                <Campo
                  etiqueta="Dirección"
                  icono={MapPin}
                  value={direccion}
                  onChange={setDireccion}
                  placeholder="Calle y número"
                  autoComplete="street-address"
                />

                <Campo
                  etiqueta="Localidad"
                  icono={MapPin}
                  value={localidad}
                  onChange={setLocalidad}
                  placeholder="Ciudad o localidad"
                  autoComplete="address-level2"
                />

                <Campo
                  etiqueta="Provincia"
                  icono={MapPin}
                  value={provincia}
                  onChange={setProvincia}
                  placeholder="Provincia"
                  autoComplete="address-level1"
                />

                <Campo
                  etiqueta="Código postal"
                  icono={MapPin}
                  value={codigoPostal}
                  onChange={setCodigoPostal}
                  placeholder="Código postal"
                  autoComplete="postal-code"
                />
              </div>
            </section>

            {variantes.length > 0 && (
              <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-900">
                  Variante
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  Selecciona la opción que deseas.
                </p>

                <div className="mt-3 flex flex-wrap gap-2">
                  {variantes.map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => {
                        setVariante(opcion);
                        setError("");
                      }}
                      className={`rounded-md border px-3 py-2 text-xs font-medium transition ${
                        variante === opcion
                          ? "border-[#285861] bg-[#285861] text-white"
                          : "border-slate-200 bg-white text-slate-600 hover:border-[#7FA0A3]"
                      }`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center gap-2">
                <CreditCard
                  size={18}
                  strokeWidth={1.8}
                  className="text-[#285861]"
                />

                <h2 className="text-sm font-semibold text-slate-900">
                  Pago
                </h2>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Te enviaremos por WhatsApp un link de Mercado Pago para
                completar el pago. Puedes abonar en hasta{" "}
                <strong>{CUOTAS_SIN_INTERES} cuotas sin interés</strong>.
              </p>
            </section>
          </div>

          <aside className="h-fit rounded-xl border border-slate-200 bg-white p-4 sm:p-5 lg:sticky lg:top-5">
            <button
              type="button"
              onClick={() => setMostrarResumen((actual) => !actual)}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-2">
                <ShoppingBag
                  size={18}
                  strokeWidth={1.8}
                  className="text-[#285861]"
                />

                <h2 className="text-sm font-semibold text-slate-900">
                  Resumen del pedido
                </h2>
              </div>

              {mostrarResumen ? (
                <ChevronUp size={17} />
              ) : (
                <ChevronDown size={17} />
              )}
            </button>

            {mostrarResumen && (
              <div className="mt-4">
                <div className="flex gap-3 border-b border-slate-200 pb-4">
                  <div className="flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                    {imagen ? (
                      <img
                        src={imagen}
                        alt={nombreProducto}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Package
                        size={27}
                        strokeWidth={1.5}
                        className="text-slate-400"
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium leading-5 text-slate-900">
                      {nombreProducto}
                    </h3>

                    {variante && (
                      <p className="mt-1 text-xs text-slate-500">
                        Variante: {variante}
                      </p>
                    )}

                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {formatearPrecio(precioUnitario)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-slate-200 py-4">
                  <span className="text-sm text-slate-600">
                    Cantidad
                  </span>

                  <div className="flex items-center rounded-md border border-slate-200">
                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(cantidad - 1)
                      }
                      className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-50"
                      aria-label="Restar cantidad"
                    >
                      <Minus size={15} />
                    </button>

                    <span className="min-w-9 text-center text-sm font-medium text-slate-900">
                      {cantidad}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        cambiarCantidad(cantidad + 1)
                      }
                      className="flex h-9 w-9 items-center justify-center text-slate-600 hover:bg-slate-50"
                      aria-label="Sumar cantidad"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-slate-500">
                      Subtotal
                    </span>

                    <span className="text-sm font-medium text-slate-900">
                      {formatearPrecio(total)}
                    </span>
                  </div>

                  {valorCuota > 0 && (
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs text-slate-500">
                        {CUOTAS_SIN_INTERES} cuotas
                      </span>

                      <span className="text-xs font-medium text-[#285861]">
                        {CUOTAS_SIN_INTERES} x{" "}
                        {formatearPrecio(valorCuota)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3">
                    <span className="text-sm font-medium text-slate-700">
                      Total
                    </span>

                    <span className="text-xl font-semibold text-slate-950">
                      {formatearPrecio(total)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            {noDisponible ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm font-medium text-amber-800">
                {sinStock
                  ? "Producto sin stock."
                  : "Producto disponible próximamente."}
              </div>
            ) : (
              <button
                type="button"
                onClick={continuarPorWhatsApp}
                disabled={creandoPedido}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-[#285861] px-4 py-3 text-sm font-medium text-white transition hover:bg-[#204850]"
              >
                <MessageCircle
                  size={18}
                  strokeWidth={1.8}
                />
                {creandoPedido
  ? "Creando pedido..."
  : "Continuar por WhatsApp"}
              </button>
            )}

            <div className="mt-4 space-y-2 border-t border-slate-200 pt-4">
              <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <Check
                  size={14}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0 text-[#285861]"
                />
                Pedido de producto físico.
              </div>

              <div className="flex items-start gap-2 text-xs leading-5 text-slate-500">
                <Check
                  size={14}
                  strokeWidth={1.8}
                  className="mt-0.5 shrink-0 text-[#285861]"
                />
                Recibirás las novedades del pedido por correo electrónico.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
};

const Campo = ({
  etiqueta,
  icono: Icono,
  type = "text",
  value,
  onChange,
  placeholder,
  autoComplete,
}) => (
  <label className="block min-w-0">
    <span className="mb-1.5 block text-xs font-medium text-slate-700">
      {etiqueta}
    </span>

    <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 transition focus-within:border-[#285861]">
      <Icono
        size={15}
        strokeWidth={1.8}
        className="shrink-0 text-slate-400"
      />

      <input
        type={type}
        value={value}
        onChange={(evento) =>
          onChange(evento.target.value)
        }
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="min-w-0 w-full bg-transparent py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />
    </div>
  </label>
);

export default Checkout;
