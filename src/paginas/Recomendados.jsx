import { useMemo, useState } from "react";
import { ExternalLink } from "lucide-react";
import { productosAfiliados } from "../datos/productosAfiliados";

const Recomendados = () => {
  const [categoriaActiva, setCategoriaActiva] = useState("Todos");

  const categorias = useMemo(() => {
    const categoriasUnicas = [
      ...new Set(productosAfiliados.map((producto) => producto.categoria)),
    ];

    return ["Todos", ...categoriasUnicas];
  }, []);

  const productosFiltrados =
    categoriaActiva === "Todos"
      ? productosAfiliados
      : productosAfiliados.filter(
          (producto) => producto.categoria === categoriaActiva
        );

  return (
    <main className="min-h-screen bg-white">
      <section className="seccion">
        <div className="contenedor">
          {/* ENCABEZADO */}

          <div className="max-w-2xl">
            <p className="eyebrow">
              Productos recomendados
            </p>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Selección para mascotas y el hogar
            </h1>

            <p className="mt-4 text-sm leading-6 text-slate-600 sm:text-base">
              Una selección de productos útiles para el cuidado,
              bienestar y comodidad de tus mascotas.
            </p>
          </div>

          {/* FILTROS */}

          <div className="mt-8 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categorias.map((categoria) => {
              const activa = categoria === categoriaActiva;

              return (
                <button
                  key={categoria}
                  type="button"
                  onClick={() => setCategoriaActiva(categoria)}
                  className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition ${
                    activa
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {categoria}
                </button>
              );
            })}
          </div>

          {/* PRODUCTOS */}

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {productosFiltrados.map((producto) => (
              <article
                key={producto.id}
                className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* IMAGEN */}

                <a
                  href={producto.enlaceAfiliado}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="block overflow-hidden bg-[#E7E7E7]"
                  aria-label={`Ver ${producto.nombre} en ${producto.plataforma}`}
                >
                  <img
                    src={producto.imagen}
                    alt={producto.nombre}
                    className="aspect-square w-full object-cover transition duration-300 hover:scale-[1.02]"
                    loading="lazy"
                  />
                </a>

                {/* INFORMACIÓN */}

                <div className="flex flex-1 flex-col p-3 sm:p-4">
                  <div>
                    {/* BADGE + CATEGORÍA */}

                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700 sm:text-xs">
                        Seleccionado
                      </span>

                      <span className="text-[11px] font-semibold text-slate-400 sm:text-xs">
                        {producto.categoria}
                      </span>
                    </div>

                    {/* TÍTULO */}

                    <h2 className="mt-3 line-clamp-3 text-sm font-semibold leading-5 text-slate-900 sm:text-base">
                      {producto.nombre}
                    </h2>

                    {/* DESCRIPCIÓN */}

                    <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 sm:text-sm">
                      {producto.descripcion}
                    </p>
                  </div>

                  {/* BOTÓN */}

                  <div className="mt-auto pt-4">
                    <a
                      href={producto.enlaceAfiliado}
                      target="_blank"
                      rel="noopener noreferrer sponsored"
                      className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#3483FA] px-2 py-3 text-center text-xs font-semibold text-white transition hover:bg-[#2968C8] sm:px-3 sm:text-sm"
                    >
                      <span>
                        Ver en Mercado Libre
                      </span>

                      <ExternalLink
                        size={15}
                        className="shrink-0"
                      />
                    </a>
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* AVISO AFILIADOS */}

          <p className="mt-8 max-w-2xl text-[11px] leading-5 text-slate-400 sm:text-xs">
            Algunos enlaces son de afiliados. Si realizás una compra a
            través de ellos, puedo recibir una comisión sin costo
            adicional para vos.
          </p>
        </div>
      </section>
    </main>
  );
};

export default Recomendados;