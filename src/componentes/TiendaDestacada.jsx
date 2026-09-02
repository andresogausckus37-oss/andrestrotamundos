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

  const destacados = productos.slice(0, 4);

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
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {destacados.map((producto) => (
            <article
              key={producto.id}
              className="overflow-hidden rounded-card border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-suave"
            >
              {/* IMAGEN */}
              <button
                type="button"
                onClick={() => verProducto(producto.id)}
                className="block w-full"
              >
                <div className="aspect-[4/5] overflow-hidden bg-slate-100">
                  <img
                    src={producto.imagenes.portada}
                    alt={producto.nombre}
                    className="h-full w-full object-contain transition duration-300 hover:scale-[1.02]"
                  />
                </div>
              </button>

              {/* INFORMACIÓN */}
              <div className="p-5">
                {/* TIPO + CALIFICACIÓN */}
<div className="mb-3 flex items-center justify-between gap-3">
  <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-sky-700">
    <Download size={12} />
    Descargable
  </span>

  <CalificacionProducto productoId={producto.id} />
</div>

                {/* TÍTULO */}
                <h3 className="text-base font-semibold leading-6 text-slate-900">
                  {producto.nombre}
                </h3>

                {/* DESCRIPCIÓN */}
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {producto.descripcion}
                </p>

                {/* PRECIO + VER PRODUCTO */}
                <div className="mt-5 flex items-center justify-between gap-4">
                  <p className="text-lg font-semibold text-slate-900">
                    {formatearPrecio(producto.precioARS)}
                  </p>

                  <button
                    type="button"
                    onClick={() => verProducto(producto.id)}
                    className="text-sm font-semibold text-sky-600 transition hover:text-sky-700"
                  >
                    Ver producto
                  </button>
                </div>
              </div>
            </article>
          ))}
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