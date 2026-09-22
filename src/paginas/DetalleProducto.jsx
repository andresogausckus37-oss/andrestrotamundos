import CalificacionProducto from "../componentes/CalificacionProducto";
import { resenasProductos } from "../datos/resenasProductos";
import { productosDigitales } from "../datos/productosDigitales";
import ProteccionComercial from "../generador/componentes/ProteccionComercial";

import {
  ArrowLeft,
  Check,
  Download,
  Expand,
  ShoppingBag,
  X,
} from "lucide-react";

import { useState } from "react";
import {
  useNavigate,
  useParams,
} from "react-router-dom";

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
      <main className="flex min-h-[70vh] items-center justify-center bg-white px-4">
        <div className="max-w-sm text-center">
          <h1 className="text-xl font-bold text-slate-900">
            Producto no encontrado
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            El producto que buscas no está disponible.
          </p>

          <button
            type="button"
            onClick={() =>
              navigate("/tienda/digitales")
            }
            className="mt-5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
      <main className="min-h-screen bg-white px-4 pb-10 sm:px-5">
        <div className="mx-auto max-w-6xl">
          {/* VOLVER */}

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
          >
            <ArrowLeft size={15} />
            Volver
          </button>

          {/* =====================================================
              CONTENIDO PRINCIPAL
          ====================================================== */}

          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:gap-8">
            {/* =====================================================
                GALERÍA
            ====================================================== */}

            <section>
              {/* IMAGEN PRINCIPAL */}

              <div className="relative mx-auto max-w-[350px] overflow-hidden rounded-xl border border-slate-100 bg-white">
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

                  <div className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-slate-600 shadow-sm transition group-hover:text-slate-900">
                    <Expand size={15} />
                  </div>
                </button>
              </div>

              {/* MINIATURAS */}

              {imagenes.length > 1 && (
                <div className="mx-auto mt-2.5 flex max-w-[520px] gap-2 overflow-x-auto pb-1">
                  {imagenes.map(
                    (imagen, index) => (
                      <button
                        key={`${imagen}-${index}`}
                        type="button"
                        onClick={() =>
                          setImagenActiva(
                            index
                          )
                        }
                        className={`h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-white p-1 transition ${
                          imagenActiva ===
                          index
                            ? "border-sky-500 ring-1 ring-sky-100"
                            : "border-slate-200 hover:border-slate-300"
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

              <div className="mx-auto mt-2.5 flex max-w-[520px] items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                  <Check size={10} />
                </div>

                <p className="text-[11px] leading-4 text-slate-600">
                  El archivo final se entrega en{" "}
                  <strong className="font-semibold text-emerald-700">
                    alta calidad
                  </strong>
                  .
                </p>
              </div>
            </section>

            {/* =====================================================
                INFORMACIÓN
            ====================================================== */}

            <section className="lg:pt-1">
              {/* TÍTULO */}

              <h1 className="max-w-2xl text-xl font-bold leading-tight text-slate-900 sm:text-2xl">
                {textoEs(producto.nombre)}
              </h1>

              {/* CALIFICACIÓN */}

              <div className="mt-1.5">
                <CalificacionProducto
                  productoId={producto.id}
                />
              </div>

              {/* DESCRIPCIÓN */}

              <p className="mt-3 max-w-2xl text-[13px] leading-5 text-slate-600">
                {textoEs(
                  producto.descripcionLarga
                ) ||
                  textoEs(
                    producto.descripcion
                  )}
              </p>

              {/* PRECIO */}

              <div className="mt-4 border-y border-slate-200 py-3">
                {tieneOferta ? (
                  <>
                    <div className="flex flex-wrap items-end gap-x-3 gap-y-1">
                      <span className="text-2xl font-bold text-slate-900">
                        {formatearPrecio(
                          precioFinal
                        )}
                      </span>

                      <span className="pb-0.5 text-sm text-slate-400 line-through">
                        {formatearPrecio(
                          producto.precioARS
                        )}
                      </span>

                      <span className="mb-0.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        -{descuento}%
                      </span>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-xs font-medium text-emerald-700">
                        Ahorras{" "}
                        {formatearPrecio(
                          ahorro
                        )}
                      </p>

                      {textoEs(
                        producto.oferta
                          ?.etiqueta
                      ) && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-orange-600">
                          {textoEs(
                            producto.oferta
                              ?.etiqueta
                          )}
                        </span>
                      )}
                    </div>
                  </>
                ) : (
                  <span className="text-2xl font-bold text-slate-900">
                    {formatearPrecio(
                      producto.precioARS
                    )}
                  </span>
                )}
              </div>

              {/* DATOS RÁPIDOS */}

              <div className="mt-3 flex flex-wrap gap-1.5">
                {producto.formato && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {producto.formato}
                  </span>
                )}

                {producto.tamano && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {producto.tamano}
                  </span>
                )}

                {producto.paginas > 0 && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {producto.paginas} páginas
                  </span>
                )}

                {producto.laminas > 0 && (
                  <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-600">
                    {producto.laminas} actividades
                  </span>
                )}

                {producto.entrega && (
                  <span className="rounded-md bg-sky-50 px-2 py-1 text-[10px] font-semibold text-sky-700">
                    {producto.entrega}
                  </span>
                )}
              </div>

              {/* QUÉ INCLUYE */}

              {listaEs(
                producto.incluye
              ).length > 0 && (
                <div className="mt-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Qué incluye
                  </h2>

                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    {listaEs(
                      producto.incluye
                    ).map(
                      (item, index) => (
                        <div
                          key={index}
                          className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-2.5 py-2"
                        >
                          <div className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                            <Check
                              size={10}
                            />
                          </div>

                          <p className="text-[11px] leading-4 text-slate-600">
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* BENEFICIOS */}

              {listaEs(
                producto.beneficios
              ).length > 0 && (
                <div className="mt-4">
                  <h2 className="text-sm font-bold text-slate-900">
                    Beneficios
                  </h2>

                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5">
                    {listaEs(
                      producto.beneficios
                    ).map(
                      (item, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-1.5"
                        >
                          <Check
                            size={13}
                            className="mt-0.5 shrink-0 text-emerald-600"
                          />

                          <p className="text-[11px] leading-4 text-slate-600">
                            {item}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* INFORMACIÓN ADICIONAL */}

              {(producto.edadRecomendada ||
                producto.nivel) && (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {producto.edadRecomendada && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Edad recomendada
                      </p>

                      <p className="mt-0.5 text-[11px] font-medium text-slate-700">
                        {
                          producto.edadRecomendada
                        }
                      </p>
                    </div>
                  )}

                  {producto.nivel && (
                    <div className="rounded-lg bg-slate-50 px-3 py-2">
                      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                        Nivel
                      </p>

                      <p className="mt-0.5 text-[11px] font-medium text-slate-700">
                        {producto.nivel}
                      </p>
                    </div>
                  )}
                </div>
              )}            

              {/* =====================================================
                  COMPRA
              ====================================================== */}

              <div className="mb-30 mt-4 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
                <div className="flex items-start gap-2.5">
                  <Download
                    size={16}
                    className="mt-0.5 shrink-0 text-sky-600"
                  />

                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Descarga digital
                    </p>

                    <p className="mt-0.5 text-[11px] leading-4 text-slate-600">
                      Descarga automática luego de
                      confirmar el pago.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={irAlCheckout}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <ShoppingBag size={16} />
                  Comprar ahora
                </button>
              </div>

              {/* =====================================================
                  RESEÑAS
              ====================================================== */}

              {resenasDelProducto.length >
                0 && (
                <div className="mt-5">
                  <div className="mb-2 flex items-center justify-between">
                    <h2 className="text-sm font-bold text-slate-900">
                      Reseñas
                    </h2>

                    <span className="text-[10px] text-slate-400">
                      {
                        resenasDelProducto.length
                      }{" "}
                      {resenasDelProducto.length ===
                      1
                        ? "reseña"
                        : "reseñas"}
                    </span>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    {resenasDelProducto.map(
                      (resena) => (
                        <article
                          key={resena.id}
                          className="rounded-lg border border-slate-200 bg-white p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex text-[12px] leading-none text-amber-500">
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

                            {resena.compraVerificada && (
  <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wide text-emerald-600">
    Compra verificada
  </span>
)}
</div>

<p className="mt-2 text-[11px] leading-4 text-slate-600">
  “{resena.texto}”
</p>
</article>
))
}
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 p-4">
      <button
        type="button"
        onClick={() =>
          setPreviewAbierto(false)
        }
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-700 shadow-lg transition hover:bg-slate-100"
        aria-label="Cerrar vista previa"
      >
        <X size={20} />
      </button>

      <div className="max-h-[92vh] max-w-4xl overflow-hidden rounded-xl bg-white p-2 shadow-2xl">
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
                       