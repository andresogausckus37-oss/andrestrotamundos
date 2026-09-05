import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useRef } from "react";

const SliderProductosAfiliados = ({
  titulo,
  productos = [],
}) => {
  const sliderRef = useRef(null);

  const moverSlider = (direccion) => {
    if (!sliderRef.current) return;

    const anchoCard =
      sliderRef.current.firstElementChild?.offsetWidth || 300;

    sliderRef.current.scrollBy({
      left: direccion === "derecha" ? anchoCard + 16 : -(anchoCard + 16),
      behavior: "smooth",
    });
  };

  if (productos.length === 0) {
    return null;
  }

  return (
    <section className="mt-10">
      {/* ENCABEZADO */}

      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">
            Categoría
          </p>

          <h3 className="mt-1 text-xl font-semibold text-slate-900 sm:text-2xl">
            {titulo}
          </h3>
        </div>

        {/* FLECHAS */}

        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => moverSlider("izquierda")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label={`Anterior en ${titulo}`}
          >
            <ChevronLeft size={19} />
          </button>

          <button
            type="button"
            onClick={() => moverSlider("derecha")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
            aria-label={`Siguiente en ${titulo}`}
          >
            <ChevronRight size={19} />
          </button>
        </div>
      </div>

      {/* SLIDER */}

      <div
        ref={sliderRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {productos.slice(0, 5).map((producto) => (
          <article
            key={producto.id}
            className="
              flex
              min-w-[80%]
              snap-start
              flex-col
              overflow-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
              sm:min-w-[45%]
              lg:min-w-[30%]
            "
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

            <div className="flex flex-1 flex-col p-4">
              <div>
                {/* BADGE + CATEGORÍA */}

<div className="flex items-center justify-between gap-3">
  <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-green-700 sm:text-xs">
    Seleccionado
  </span>

  <span className="text-xs font-semibold text-slate-400">
    {producto.categoria}
  </span>
</div>

                <h4 className="mt-1.5 text-base font-semibold leading-6 text-slate-900">
                  {producto.nombre}
                </h4>

                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                  {producto.descripcion}
                </p>
              </div>

              {/* BOTÓN */}

              <div className="mt-auto pt-5">
                <a
                  href={producto.enlaceAfiliado}
                  target="_blank"
                  rel="noopener noreferrer sponsored"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#3483FA] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[#2968C8]"
                >
                  Ver en Mercado Libre
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* INDICACIÓN MÓVIL */}

      <p className="mt-2 text-center text-[11px] text-slate-400 sm:hidden">
        Deslizá para ver más productos →
      </p>
    </section>
  );
};

export default SliderProductosAfiliados;