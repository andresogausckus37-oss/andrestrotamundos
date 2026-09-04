import { ExternalLink } from "lucide-react";
import { productosAfiliados } from "../datos/productosAfiliados";

const ProductosRecomendados = () => {
  if (productosAfiliados.length === 0) {
    return null;
  }

  return (
    <section className="mt-16 border-t border-slate-200 pt-12">
      {/* =========================================================
          ENCABEZADO
      ========================================================== */}

      <div className="max-w-2xl">
        <p className="eyebrow">
          Productos recomendados
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Selección para mascotas y el hogar
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Una selección de productos útiles para el cuidado,
          bienestar y comodidad de tus mascotas.
        </p>
      </div>

      {/* =========================================================
          PRODUCTOS
      ========================================================== */}

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
        {productosAfiliados.map((producto) => (
          <article
            key={producto.id}
            className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
          >
            {/* =====================================================
                IMAGEN
            ====================================================== */}

            <a
              href={producto.enlaceAfiliado}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="block overflow-hidden bg-white"
              aria-label={`Ver ${producto.nombre} en ${producto.plataforma}`}
            >
              <img
                src={producto.imagen}
                alt={producto.nombre}
                className="aspect-square w-full object-contain transition duration-300 hover:scale-[1.03]"
                loading="lazy"
              />
            </a>

            {/* =====================================================
                INFORMACIÓN
            ====================================================== */}

            <div className="flex flex-1 flex-col p-3 sm:p-4">
              <div>
                {/* BADGE */}

                <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-700 sm:text-xs">
                  Recomendado
                </span>

                {/* CATEGORÍA */}

                <p className="mt-2 text-[11px] font-medium text-slate-400 sm:text-xs">
                  {producto.categoria}
                </p>

                {/* TÍTULO */}

                <h3 className="mt-1.5 line-clamp-3 text-sm font-semibold leading-5 text-slate-900 sm:text-base">
                  {producto.nombre}
                </h3>

                {/* DESCRIPCIÓN */}

                <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 sm:text-sm">
                  {producto.descripcion}
                </p>
              </div>

              {/* ===================================================
                  BOTÓN MERCADO LIBRE
              ==================================================== */}

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

      {/* =========================================================
          AVISO AFILIADOS
      ========================================================== */}

      <p className="mt-6 max-w-2xl text-[11px] leading-5 text-slate-400 sm:text-xs">
        Algunos enlaces son de afiliados. Si realizás una compra a
        través de ellos, puedo recibir una comisión sin costo
        adicional para vos.
      </p>
    </section>
  );
};

export default ProductosRecomendados;