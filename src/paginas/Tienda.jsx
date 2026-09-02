import CalificacionProducto from "../componentes/CalificacionProducto";
import {
  ArrowRight,
  ArrowLeft,
  Download,
  ShoppingBag,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { productos } from "../datos/productos";

const formatearPrecio = (precio) => {
  if (!precio) return "Precio a definir";

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(precio);
};

const Tienda = () => {
  const navigate = useNavigate();

  return (
    <main className="min-h-screen bg-white">
      {/* VOLVER */}
      <div className="mx-auto max-w-6xl px-5 pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition hover:text-sky-600"
        >
          <ArrowLeft size={17} />
          Volver
        </button>
      </div>

      {/* ENCABEZADO */}
      <section className="border-b border-slate-200 bg-gradient-to-b from-sky-50 to-white px-5 py-14 sm:py-16">
        <div className="mx-auto max-w-6xl text-center">
          <p className="eyebrow">Andres House Sitter</p>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Tienda
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
            Productos digitales pensados para disfrutar, aprender y compartir
            el mundo de las mascotas.
          </p>
        </div>
      </section>

      {/* PRODUCTOS */}
      <section className="px-5 py-10 sm:py-14">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                Productos disponibles
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Elegí un producto para conocer todos los detalles.
              </p>
            </div>

            <span className="hidden text-xs font-medium text-slate-400 sm:block">
              {productos.length}{" "}
              {productos.length === 1 ? "producto" : "productos"}
            </span>
          </div>

          {productos.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {productos.map((producto) => (
                <article
                  key={producto.id}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* IMAGEN */}
                  <button
                    type="button"
                    onClick={() => navigate(`/tienda/${producto.id}`)}
                    className="block w-full bg-white"
                  >
                    <div className="aspect-[4/5] overflow-hidden bg-slate-50 p-3">
                      <img
                        src={producto.imagenes?.portada}
                        alt={producto.nombre}
                        className="h-full w-full object-contain transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  </button>

                  {/* INFORMACIÓN */}
                  <div className="p-4">
                    {/* DESCARGABLE + CALIFICACIÓN + DESTACADO */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700">
                        <Download size={12} />
                        Descargable
                      </span>

                      <div className="flex flex-1 justify-center">
                        <CalificacionProducto productoId={producto.id} />
                      </div>

                      {producto.destacado && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">
                          Destacado
                        </span>
                      )}
                    </div>

                    {/* TÍTULO */}
                    <h3 className="mt-3 text-base font-semibold leading-6 text-slate-900">
                      {producto.nombre}
                    </h3>

                    {/* DESCRIPCIÓN */}
                    <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-slate-600">
                      {producto.descripcion}
                    </p>

                    {/* PRECIO + FLECHA */}
                    <div className="mt-4 flex items-end justify-between gap-4 border-t border-slate-100 pt-4">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                          Precio
                        </p>

                        <p className="mt-0.5 text-xl font-semibold text-slate-900">
                          {formatearPrecio(producto.precioARS)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/tienda/${producto.id}`)}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-50 text-sky-600 transition hover:bg-sky-100"
                        aria-label={`Ver ${producto.nombre}`}
                      >
                        <ArrowRight size={18} />
                      </button>
                    </div>

                    {/* VER PRODUCTO */}
                    <button
                      type="button"
                      onClick={() => navigate(`/tienda/${producto.id}`)}
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
                    >
                      <ShoppingBag size={16} />
                      Ver producto
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-5 py-12 text-center">
              <ShoppingBag size={28} className="mx-auto text-slate-400" />

              <h2 className="mt-3 text-lg font-semibold text-slate-900">
                Próximamente nuevos productos
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Estamos preparando nuevos descargables.
              </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
};

export default Tienda;