import CalificacionProducto from "../componentes/CalificacionProducto";
import { resenasProductos } from "../datos/resenasProductos";
import { productosDigitales } from "../datos/productosDigitales";
import ProteccionComercial from "../generador/componentes/ProteccionComercial";

import {
  ArrowLeft,
  BadgePercent,
  Check,
  CreditCard,
  Download,
  Expand,
  Landmark,
  ShoppingBag,
  X,
} from "lucide-react";

import { useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

/* =========================================================
   CONFIGURACIÓN COMERCIAL
========================================================= */

const DESCUENTO_TRANSFERENCIA = 5;
const CUOTAS_SIN_INTERES = 3;

const DetalleProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [previewAbierto, setPreviewAbierto] =
    useState(false);

  const [imagenActiva, setImagenActiva] =
    useState(0);

  const producto =
    productosDigitales.find(
      (p) => p.id === id
    );

  const formatearPrecio = (precioARS) => {
    if (!precioARS) {
      return "Precio a definir";
    }

    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    }).format(precioARS);
  };

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
     PRODUCTO NO ENCONTRADO
  ========================================================= */

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

  const tieneOferta =
    producto.oferta?.activa === true &&
    Number(producto.oferta?.precioARS) > 0;

  const precioFinal = tieneOferta
    ? Number(producto.oferta.precioARS)
    : Number(producto.precioARS);

  const ahorro = tieneOferta
    ? Number(producto.precioARS) -
      precioFinal
    : 0;

  const descuento =
    tieneOferta &&
    Number(producto.precioARS) > 0
      ? Math.round(
          (ahorro /
            Number(producto.precioARS)) *
            100
        )
      : 0;

  const precioTransferencia =
    precioFinal *
    (1 - DESCUENTO_TRANSFERENCIA / 100);

  const precioCuota =
    precioFinal / CUOTAS_SIN_INTERES;

  /* =========================================================
     RESEÑAS
  ========================================================= */

  const resenasDelProducto =
    resenasProductos.filter(
      (resena) =>
        resena.productoId === producto.id
    );

  /* =========================================================
     IMÁGENES
  ========================================================= */

  const imagenes = [
    producto.imagenes?.portada,
    producto.imagenes?.preview,
    producto.imagenes?.previewIndividual,
    ...(producto.imagenes
      ?.previewsIndividuales || []),
  ].filter(Boolean);

  const imagenActual =
    imagenes[imagenActiva];

  /* =========================================================
     COMPRAR
  ========================================================= */

  const irAlCheckout = () => {
    navigate(
      `/checkout/${producto.id}`
    );
  };

  return (
    <>
      <main className="min-h-screen bg-[#FCFDFC] px-4 pb-12 pt-4 sm:px-5 sm:pt-6">
        <div className="mx-auto max-w-6xl">

          {/* VOLVER */}

          <button
            type="button"
            onClick={() => navigate(-1)}
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
                <button
                  type="button"
                  onClick={() =>
                    setPreviewAbierto(true)
                  }
                  className="group block w-full"
                  aria-label="Ampliar imagen"
                >
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

                  <div className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-md border border-[#DCE5E4] bg-white/95 text-[#687477] transition-colors group-hover:border-[#8EAAAC] group-hover:text-[#285861]">
                    <Expand
                      size={16}
                      strokeWidth={1.8}
                    />
                  </div>
                </button>
              </div>

              {/* MINIATURAS */}

              {imagenes.length > 1 && (
                <div className="mx-auto mt-3 flex max-w-[420px] gap-2 overflow-x-auto pb-1">
                  {imagenes.map(
                    (imagen, index) => (
                      <button
                        key={`${imagen}-${index}`}
                        type="button"
                        onClick={() =>
                          setImagenActiva(index)
                        }
                        className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-white p-1 transition-colors ${
                          imagenActiva === index
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

              <h1 className="max-w-2xl text-2xl font-medium -mb-4 leading-tight tracking-tight text-[#263238] sm:text-3xl">
                {textoEs(producto.nombre)}
              </h1>

              {/* CALIFICACIÓN */}

              <div className="mt-2">
                <CalificacionProducto
                  productoId={producto.id}
                />
              </div>

              {/* =================================================
                  PRECIO
              ================================================== */}

              <div className="mt-5 border-y border-[#DCE5E4] py-4">
                {tieneOferta ? (
                  <>
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span className="text-3xl font-medium tracking-tight text-[#263238]">
                        {formatearPrecio(
                          precioFinal
                        )}
                      </span>

                      <span className="text-sm font-normal text-slate-400 line-through">
                        {formatearPrecio(
                          producto.precioARS
                        )}
                      </span>

                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-700">
                        <BadgePercent
                          size={14}
                          strokeWidth={1.8}
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
                        producto.oferta
                          ?.etiqueta
                      ) && (
                        <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-orange-700">
                          {textoEs(
                            producto.oferta
                              ?.etiqueta
                          )}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-3xl font-medium tracking-tight text-[#263238]">
                    {formatearPrecio(
                      producto.precioARS
                    )}
                  </span>
                )}

                {/* OPCIONES DE PAGO */}

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2.5">
                    <Landmark
                      size={15}
                      strokeWidth={1.7}
                      className="shrink-0 text-[#285861]"
                    />

                    <p className="text-xs font-normal text-[#687477] sm:text-sm">
                      <span className="font-medium text-[#285861]">
                        {DESCUENTO_TRANSFERENCIA}% OFF
                      </span>{" "}
                      con transferencia ·{" "}
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
                      strokeWidth={1.7}
                      className="shrink-0 text-[#B59672]"
                    />

                    <p className="text-xs font-normal text-[#687477] sm:text-sm">
                      <span className="font-medium text-[#263238]">
                        {CUOTAS_SIN_INTERES} x{" "}
                        {formatearPrecio(
                          precioCuota
                        )}
                      </span>{" "}
                      sin interés
                    </p>
                  </div>
                </div>
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

              {listaEs(producto.incluye).length > 0 && (
                <div className="mt-6">
                  <h2 className="text-base font-medium text-[#285861]">
                    Qué incluye
                  </h2>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {listaEs(producto.incluye).map((item, index) => (
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
                    ))}
                  </div>
                </div>
              )}

              {/* =================================================
                  BENEFICIOS
              ================================================== */}

              {listaEs(producto.beneficios).length > 0 && (
  <div className="mt-5">
    <h2 className="text-base font-medium text-[#756451]">
      Beneficios
    </h2>

    <div className="mt-3 grid grid-cols-2 gap-3">
      {listaEs(producto.beneficios).map((item, index) => (
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
      ))}
    </div>
  </div>
)}

              {/* =================================================
                  INFORMACIÓN ADICIONAL
              ================================================== */}

        {(producto.edadRecomendada || producto.nivel) && (
  <div className="mt-4 grid grid-cols-2 gap-3">

    {/* EDAD RECOMENDADA */}

    {producto.edadRecomendada && (
      <div className="rounded-lg border border-[#8B684D]/15 bg-[#8B684D]/[0.08] px-3 py-1">
        <p className="text-[10px] font-medium uppercase tracking-[0.1em] text-[#8B684D]">
          Edad recomendada
        </p>

        <p className="mt-1 text-xs font-normal text-[#68584D]">
          {producto.edadRecomendada}
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
                      Descarga digital
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
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#285861] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#204850]"
                >
                  <ShoppingBag
                    size={16}
                    strokeWidth={1.8}
                  />

                  Comprar ahora
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
                                1, 2, 3, 4, 5,
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

      {/* =========================================================
          PREVIEW AMPLIADO
      ========================================================= */}

      {previewAbierto &&
        imagenActual && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#172A2D]/90 p-4">

            {/* CERRAR */}

            <button
              type="button"
              onClick={() =>
                setPreviewAbierto(false)
              }
              className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-md border border-white/20 bg-white text-[#536468] transition-colors hover:bg-[#EEF5F5] hover:text-[#285861]"
              aria-label="Cerrar vista previa"
            >
              <X
                size={20}
                strokeWidth={1.8}
              />
            </button>

            {/* IMAGEN */}

            <div className="max-h-[92vh] max-w-4xl overflow-hidden rounded-md bg-white p-2">
              {imagenActiva === 0 ? (
                <img
                  src={imagenActual}
                  alt={`Vista ampliada de ${textoEs(
                    producto.nombre
                  )}`}
                  className="max-h-[88vh] max-w-full object-contain"
                />
              ) : (
                <ProteccionComercial>
                  <img
                    src={imagenActual}
                    alt={`Vista ampliada de ${textoEs(
                      producto.nombre
                    )}`}
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