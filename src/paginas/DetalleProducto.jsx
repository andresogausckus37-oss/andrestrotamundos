import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Check,
  CreditCard,
  Package,
  Ruler,
  ShoppingBag,
} from "lucide-react";

import CalificacionProducto from "../componentes/CalificacionProducto";
import Checkout from "./Checkout";
import { agregarAlCarrito } from "../utilidades/carrito";

const CUOTAS_SIN_INTERES = 3;

const DetalleProducto = () => {
  const { id } = useParams();

  const [modalAbierto, setModalAbierto] = useState(false);
  const [producto, setProducto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [imagenActiva, setImagenActiva] = useState(0);
  const [varianteSeleccionada, setVarianteSeleccionada] =
    useState("");

  useEffect(() => {
    let cancelado = false;

    const cargarProducto = async () => {
      try {
        setCargando(true);
        setError("");

        const respuesta = await fetch(
          "/api/admin/pedidos?accion=productos-publicos"
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudo cargar el producto."
          );
        }

        const productos = Array.isArray(datos.productos)
          ? datos.productos
          : [];

        const encontrado = productos.find(
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
            ? encontrado.detalles.variantes.filter(Boolean)
            : [];

          if (variantes.length === 1) {
            setVarianteSeleccionada(variantes[0]);
          }
        }
      } catch (errorProducto) {
        console.error(
          "Error cargando detalle del producto:",
          errorProducto
        );

        if (!cancelado) {
          setError(
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

  const imagenes = useMemo(() => {
    if (!producto) return [];

    const posibles = [
      producto.imagenes?.portada,
      producto.imagenes?.portadaFacebook,
      producto.imagenes?.preview,
      ...(Array.isArray(producto.imagenes?.previewsIndividuales)
        ? producto.imagenes.previewsIndividuales
        : []),
      producto.imagenes?.redes?.feed?.presentacion,
      producto.imagenes?.redes?.feed?.incluye,
      producto.imagenes?.redes?.feed?.beneficios,
      producto.imagenes?.redes?.feed?.comoFunciona,
      producto.imagenes?.redes?.vertical?.presentacion,
      producto.imagenes?.redes?.vertical?.incluye,
      producto.imagenes?.redes?.vertical?.beneficios,
      producto.imagenes?.redes?.vertical?.comoFunciona,
    ].filter(Boolean);

    return [...new Set(posibles)].slice(0, 8);
  }, [producto]);

  const variantes = useMemo(() => {
    if (!producto) return [];

    return Array.isArray(producto.detalles?.variantes)
      ? producto.detalles.variantes.filter(Boolean)
      : [];
  }, [producto]);

  const colores = useMemo(() => {
    if (!producto) return [];

    return Array.isArray(producto.detalles?.colores)
      ? producto.detalles.colores.filter(Boolean)
      : [];
  }, [producto]);

  const caracteristicas = useMemo(() => {
    if (!producto) return [];

    return Array.isArray(producto.detalles?.caracteristicas)
      ? producto.detalles.caracteristicas.filter(Boolean)
      : [];
  }, [producto]);

  const contenidoPaquete = useMemo(() => {
    if (!producto) return [];

    return Array.isArray(producto.detalles?.contenidoPaquete)
      ? producto.detalles.contenidoPaquete.filter(Boolean)
      : [];
  }, [producto]);

  const ofertaActiva = useMemo(() => {
    if (!producto?.oferta?.activa) return false;

    const precioOferta =
      Number(producto.oferta?.precioARS) || 0;

    if (precioOferta <= 0) return false;

    const finalizaEn =
      producto.ofertaLanzamiento?.finalizaEn;

    if (!finalizaEn) return true;

    return new Date(finalizaEn).getTime() > Date.now();
  }, [producto]);

  const precioNormal = Number(producto?.precioARS) || 0;

  const precioFinal = ofertaActiva
    ? Number(producto?.oferta?.precioARS) || precioNormal
    : precioNormal;

  const ahorro = ofertaActiva
    ? Math.max(0, precioNormal - precioFinal)
    : 0;

  const porcentajeDescuento =
    ofertaActiva && precioNormal > 0
      ? Math.round((ahorro / precioNormal) * 100)
      : 0;

  const valorCuota =
    precioFinal > 0
      ? precioFinal / CUOTAS_SIN_INTERES
      : 0;

  const stock = Number(producto?.stock);

  const sinStock =
    producto?.disponibilidad === "sin-stock" ||
    stock === 0;

  const proximamente =
    producto?.disponibilidad === "proximamente";

  const pausado =
    producto?.disponibilidad === "pausado";

  const disponible =
    !sinStock && !proximamente && !pausado;

  const formatearPrecio = (valor) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const comprar = () => {
    if (!disponible) return;
    if (variantes.length > 0 && !varianteSeleccionada) {
      document.getElementById("selector-variantes")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    try {
      agregarAlCarrito(producto, varianteSeleccionada);
      setModalAbierto(true);
    } catch (errorCarrito) {
      alert(errorCarrito.message);
    }
  };

  if (cargando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCFDFC] px-5">
        <p className="text-sm text-slate-500">
          Cargando producto...
        </p>
      </main>
    );
  }

  if (error || !producto) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#FCFDFC] px-5">
        <div className="w-full max-w-md rounded-xs border border-slate-200 bg-white p-6 text-center">
          <Package
            size={34}
            strokeWidth={1.6}
            className="mx-auto text-slate-400"
          />

          <h1 className="mt-3 text-xl font-medium text-slate-900">
            Producto no disponible
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            {error || "No se encontró el producto."}
          </p>

        </div>
      </main>
    );
  }

  const nombre =
    typeof producto.nombre === "string"
      ? producto.nombre
      : producto.nombre?.es || "Producto";

  const descripcion =
    typeof producto.descripcion === "string"
      ? producto.descripcion
      : producto.descripcion?.es || "";

  const descripcionLarga =
    typeof producto.descripcionLarga === "string"
      ? producto.descripcionLarga
      : producto.descripcionLarga?.es || descripcion;

  const marca = producto.detalles?.marca || "";
  const modelo = producto.detalles?.modelo || "";
  const material = producto.detalles?.material || "";
  const dimensiones = producto.detalles?.dimensiones || "";
  const peso = producto.detalles?.peso || "";

  return (
    <main className="min-h-screen bg-[#FCFDFC] px-4 pb-20 pt-4 sm:px-5 sm:pt-7">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-7 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <section>
            <div className="relative overflow-hidden rounded-xs border border-slate-200 bg-white">
              <div className="aspect-square w-full">
                {imagenes.length > 0 ? (
                  <img
                    src={imagenes[imagenActiva]}
                    alt={`${nombre} - imagen ${imagenActiva + 1}`}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center bg-slate-50">
                    <Package
                      size={48}
                      strokeWidth={1.4}
                      className="text-slate-300"
                    />
                  </div>
                )}
              </div>

            </div>

            {imagenes.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {imagenes.map((imagen, indice) => (
                                  <button
                    key={`${imagen}-${indice}`}
                    type="button"
                    onClick={() => setImagenActiva(indice)}
                    className={`aspect-square overflow-hidden rounded-xs border bg-white p-1 transition ${
                      imagenActiva === indice
                        ? "border-[#285861] ring-1 ring-[#285861]"
                        : "border-slate-200 hover:border-slate-400"
                    }`}
                    aria-label={`Ver imagen ${indice + 1}`}
                  >
                    <img
                      src={imagen}
                      alt=""
                      className="h-full w-full object-cover rounded-xs"
                    />
                  </button>
                ))}
              </div>
            )}
            <nav aria-label="Ruta de navegación" className="mt-3 text-xs font-normal text-slate-500">
              <a href="/" className="hover:text-[#285861]">Inicio</a>
              <span className="mx-1">/</span>
              <a href="/tienda" className="hover:text-[#285861]">Tienda</a>
              <span className="mx-1">/</span>
              <span className="text-slate-800">{nombre}</span>
            </nav>
          </section>

          <section className="lg:pt-1">
            <h1 className="mt-3 text-2xl font-medium leading-tight text-slate-950 sm:text-3xl">
              {nombre}
            </h1>

            <div className="mt-2">
              <CalificacionProducto productoId={producto.id} />
            </div>

            <div className="mt-5 border-y border-slate-200 py-5">
              {ofertaActiva ? (
                <>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-3xl font-medium tracking-tight text-slate-950">
                      {formatearPrecio(precioFinal)}
                    </span>

                    {porcentajeDescuento > 0 && (
                      <span className="rounded-xs bg-red-600 px-2.5 py-1 text-xs font-normal text-white">
                        -{porcentajeDescuento}%
                      </span>
                    )}
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3">
                    <span className="text-sm text-slate-400 line-through">
                      {formatearPrecio(precioNormal)}
                    </span>

                    {ahorro > 0 && (
                      <span className="text-xs font-medium text-emerald-700">
                        Ahorrás {formatearPrecio(ahorro)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <span className="text-3xl font-medium tracking-tight text-slate-950">
                  {formatearPrecio(precioFinal)}
                </span>
              )}

              {valorCuota > 0 && (
                <div className="mt-3 flex items-start gap-2">
                  <CreditCard
                    size={17}
                    strokeWidth={1.8}
                    className="mt-0.5 shrink-0 text-[#285861]"
                  />

                  <p className="text-sm font-normal leading-5 text-slate-600">
                    Hasta{" "}
                    <strong className="font-medium text-slate-800">
                      {CUOTAS_SIN_INTERES} cuotas sin interés
                    </strong>{" "}
                    de {formatearPrecio(valorCuota)}.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4">
              {sinStock ? (
                <EstadoProducto texto="Sin stock" />
              ) : proximamente ? (
                <EstadoProducto texto="Próximamente" />
              ) : pausado ? (
                <EstadoProducto texto="Producto temporalmente no disponible" />
              ) : (
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                  <Check size={17} strokeWidth={2} />
                  Disponible
                  {Number.isFinite(stock) && stock > 0 && (
                    <span className="font-normal text-slate-500">
                      · {stock} en stock
                    </span>
                  )}
                </div>
              )}
            </div>

            {variantes.length > 0 && (
              <div id="selector-variantes" className="mt-5">
                <div className="flex items-center gap-2">
                  <Ruler
                    size={17}
                    strokeWidth={1.8}
                    className="text-slate-500"
                  />

                  <h2 className="text-sm font-medium text-slate-900">
                    Talle / variante
                  </h2>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {variantes.map((variante) => (
                    <button
                      key={variante}
                      type="button"
                      onClick={() =>
                        setVarianteSeleccionada(variante)
                      }
                      className={`rounded-xs border px-3.5 py-2 text-sm font-medium transition ${
                        varianteSeleccionada === variante
                          ? "border-[#285861] bg-[#285861] text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-[#7FA0A3]"
                      }`}
                    >
                      {variante}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {colores.length > 0 && (
              <div className="mt-5">
                <h2 className="text-sm font-medium text-slate-900">
                  Colores disponibles
                </h2>

                <div className="mt-2 flex flex-wrap gap-2">
                  {colores.map((color) => (
                    <span
                      key={color}
                      className="rounded-xs border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600"
                    >
                      {color}
                    </span>
                  ))}
                </div>
              </div>
            )}

        {(caracteristicas.length > 0 ||
          contenidoPaquete.length > 0) && (
          <div className="mt-5 grid grid-cols-2 gap-2">
            {caracteristicas.length > 0 && (
              <ListaDetalles
                titulo="Características"
                elementos={caracteristicas}
              />
            )}

            {contenidoPaquete.length > 0 && (
              <ListaDetalles
                titulo="Contenido del paquete"
                elementos={contenidoPaquete}
              />
            )}
          </div>
        )}


            <button
              type="button"
              onClick={comprar}
              disabled={!disponible}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-xs bg-[#285861] px-5 py-3.5 text-sm font-medium text-white transition hover:bg-[#204850] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <ShoppingBag size={18} strokeWidth={1.8} />
              {disponible
                ? "Comprar ahora"
                : sinStock
                  ? "Sin stock"
                  : "No disponible"}
            </button>

          </section>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-xs border border-slate-200 bg-white p-3 sm:p-4">
            <h2 className="text-sm font-medium text-slate-900">
              Descripción
            </h2>

            <p className="mt-3 whitespace-pre-line text-xs font-normal leading-6 text-slate-600">
              {descripcionLarga ||
                "Consulta los detalles de este producto antes de realizar tu pedido."}
            </p>
          </section>

          {(marca ||
            modelo ||
            material ||
            dimensiones ||
            peso) && (
            <section className="rounded-xs border border-slate-200 bg-white p-3 sm:p-4">
              <h2 className="text-sm font-medium text-slate-900">
                Datos del producto
              </h2>

              <div className="mt-4 divide-y divide-slate-100">
                {marca && (
                  <Dato etiqueta="Marca" valor={marca} />
                )}

                {modelo && (
                  <Dato etiqueta="Modelo" valor={modelo} />
                )}

                {material && (
                  <Dato etiqueta="Material" valor={material} />
                )}

                {dimensiones && (
                  <Dato
                    etiqueta="Dimensiones"
                    valor={dimensiones}
                  />
                )}

                {peso && (
                  <Dato etiqueta="Peso" valor={peso} />
                )}
              </div>
            </section>
          )}
        </div>

        {modalAbierto && (
          <Checkout
            productoInicial={producto}
            varianteInicial={varianteSeleccionada}
            modal
            onClose={() => setModalAbierto(false)}
          />
        )}
      </div>
    </main>
  );
};

const EstadoProducto = ({ texto }) => (
  <div className="inline-flex items-center gap-2 rounded-xs bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
    <Package size={16} strokeWidth={1.8} />
    {texto}
  </div>
);

const Dato = ({ etiqueta, valor }) => (
  <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
    <span className="text-slate-500">{etiqueta}</span>
    <span className="max-w-[65%] text-right font-medium text-slate-800">
      {valor}
    </span>
  </div>
);

const ListaDetalles = ({ titulo, elementos }) => (
  <section className="rounded-xs border border-slate-200 bg-white p-3 sm:p-4">
    <h2 className="text-sm font-medium text-slate-900">
      {titulo}
    </h2>

    <div className="mt-3 space-y-2">
      {elementos.map((elemento, indice) => (
        <div
          key={`${elemento}-${indice}`}
          className="flex items-start gap-2.5"
        >
          <Check
            size={15}
            strokeWidth={2}
            className="mt-0.5 shrink-0 text-[#285861]"
          />

          <p className="text-xs font-normal leading-5 text-slate-600">
            {elemento}
          </p>
        </div>
      ))}
    </div>
  </section>
);

export default DetalleProducto;