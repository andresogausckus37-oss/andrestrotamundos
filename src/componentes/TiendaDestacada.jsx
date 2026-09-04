import {
  Download,
  ShoppingBag,
  ChevronRight,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import { productos } from "../datos/productos";
import CalificacionProducto from "./CalificacionProducto";

const formatearPrecio = (precio) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);

const TiendaDestacada = ({ verProducto }) => {
  const navigate = useNavigate();

  const destacados = productos.slice(0, 3);

  return (
    <section id="tienda" className="seccion bg-orange-50/50">
      <div className="contenedor">
        {/* ENCABEZADO */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Tienda</p>

          <h2 className="titulo-seccion">
            Productos digitales para disfrutar e imprimir
          </h2>

          <p className="subtitulo-seccion">
            Actividades, juegos y contenido descargable inspirado en mascotas,
            animales y el mundo que compartimos con ellos.
          </p>
        </div>

        {/* PRODUCTOS */}
        <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
          {destacados.map((producto) => {
  const tieneOferta = producto.oferta?.activa;

  const precioFinal = tieneOferta
    ? producto.oferta.precioARS
    : producto.precioARS;

  const ahorro = tieneOferta
    ? producto.precioARS - producto.oferta.precioARS
    : 0;

  const descuento = tieneOferta
    ? Math.round((ahorro / producto.precioARS) * 100)
    : 0;

  return (
            <article
              key={producto.id}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-suave"
            >
              {/* IMAGEN */}
              <button
                type="button"
                onClick={() => verProducto(producto.id)}
                className="block w-full"
                aria-label={`Ver ${producto.nombre}`}
              >
                <div className="aspect-[4/5] overflow-hidden bg-slate-50 p-2 sm:p-4">
                  <img
                    src={producto.imagenes.portada}
                    alt={producto.nombre}
                    className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
              </button>

              {/* INFORMACIÓN */}
              <div className="flex flex-1 flex-col p-3 sm:p-5">
                {/* TIPO */}
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-sky-700 sm:px-2.5 sm:text-[10px]">
                    <Download size={11} />

                    <span className="hidden sm:inline">
                      Descargable
                    </span>

                    <span className="sm:hidden">
                      PDF
                    </span>
                  </span>
                </div>

                {/* CALIFICACIÓN */}
                <div className="mt-2 min-h-[20px]">
                  <CalificacionProducto
                    productoId={producto.id}
                  />
                </div>

                {/* TÍTULO */}
                <h3 className="mt-2 line-clamp-2 text-[13px] font-semibold leading-[1.35rem] text-slate-900 sm:text-lg sm:leading-6">
                  {producto.nombre}
                </h3>

                

                {/* PRECIO + CTA */}
<div className="mt-auto pt-3">
  <div className="border-t border-slate-100 pt-3 sm:pt-3">

    

    {tieneOferta ? (
      <>
        {/* PRECIO OFERTA + DESCUENTO */}
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-base font-bold tracking-tight text-slate-900 sm:text-2xl">
            {formatearPrecio(precioFinal)}
          </p>

          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700 sm:text-[10px]">
            -{descuento}%
          </span>
        </div>

        {/* PRECIO ORIGINAL */}
        <p className="mt-0.5 text-[14px] text-slate-400 line-through sm:text-xs">
          {formatearPrecio(producto.precioARS)}
        </p>

        {/* OFERTA */}
        <div className="mt-2">
          <p className="text-[11px] font-bold uppercase tracking-wide text-orange-600 sm:text-[10px]">
            {producto.oferta.etiqueta}
          </p>

          <p className="mt-0.5 text-[14px] font-medium text-emerald-700 sm:text-[10px]">
            Ahorrás {formatearPrecio(ahorro)}
          </p>
        </div>
      </>
    ) : (
      <p className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 sm:text-xl">
        {formatearPrecio(producto.precioARS)}
      </p>
    )}

    <button
      type="button"
      onClick={() => verProducto(producto.id)}
      className="mt-3 flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-2 py-2.5 text-[11px] font-semibold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700 sm:px-4 sm:py-3 sm:text-sm"
    >
      Ver producto
    </button>

  </div>
</div>
              </div>
            </article>
                    );
        })}
        </div>

        {/* CTA */}
        <div className="mt-10 flex justify-center">
          <button
            type="button"
            onClick={() => navigate("/tienda")}
            className="boton-principal gap-2"
          >
            <ShoppingBag size={17} />
            Explorar tienda
            <ChevronRight size={17} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default TiendaDestacada;