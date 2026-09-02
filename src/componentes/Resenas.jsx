import { useEffect, useState } from "react";
import {
  Star,
  MapPin,
  Quote,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { resenas } from "../datos/resenas";

const Resenas = () => {
  const [indiceActual, setIndiceActual] = useState(0);

  const estilosAvatar = [
    "bg-sky-100 text-sky-700",
    "bg-orange-100 text-orange-700",
    "bg-emerald-100 text-emerald-700",
  ];

  const siguiente = () => {
    setIndiceActual((actual) =>
      actual === resenas.length - 1 ? 0 : actual + 1,
    );
  };

  const anterior = () => {
    setIndiceActual((actual) =>
      actual === 0 ? resenas.length - 1 : actual - 1,
    );
  };

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceActual((actual) =>
        actual === resenas.length - 1 ? 0 : actual + 1,
      );
    }, 5000);

    return () => clearInterval(intervalo);
  }, []);

  return (
    <section id="resenas" className="seccion bg-orange-50">
      <div className="contenedor">
        {/* Encabezado */}

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="eyebrow">
            Reseñas
          </p>

          <h2 className="titulo-seccion">
            Experiencias de quienes ya confiaron
          </h2>

          <p className="subtitulo-seccion">
            La confianza se construye con experiencias, comunicación clara y
            responsabilidad.
          </p>
        </div>

        {/* Slider */}

        <div className="relative mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-3xl">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${indiceActual * 100}%)`,
              }}
            >
              {resenas.map((resena, index) => (
                <div
                  key={`${resena.nombre}-${resena.lugar}`}
                  className="w-full min-w-full"
                >
                  <article className="relative min-h-[300px] overflow-hidden rounded-3xl border border-orange-100 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10">
                    {/* Comillas decorativas */}

                    <Quote
                      size={90}
                      strokeWidth={1}
                      className="absolute -right-2 top-2 text-orange-100"
                    />

                    <div className="relative">
                      {/* Estrellas */}

                      <div className="mb-5 flex justify-center gap-1 text-amber-500">
                        {Array.from({
                          length: resena.estrellas,
                        }).map((_, estrellaIndex) => (
                          <Star
                            key={estrellaIndex}
                            size={18}
                            fill="currentColor"
                          />
                        ))}
                      </div>

                      {/* Reseña */}

                      <p className="mx-auto max-w-2xl text-center text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
                        “{resena.texto}”
                      </p>

                      {/* Persona */}

                      <div className="mt-7 flex items-center justify-center gap-3">
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold ${
                            estilosAvatar[index % estilosAvatar.length]
                          }`}
                        >
                          {resena.nombre.charAt(0)}
                        </div>

                        <div className="text-left">
                          <p className="text-sm font-semibold text-slate-900">
                            {resena.nombre}
                          </p>

                          <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={12} />
                            {resena.lugar}
                          </p>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              ))}
            </div>
          </div>

          {/* Flecha izquierda */}

          <button
            type="button"
            onClick={anterior}
            aria-label="Reseña anterior"
            className="absolute left-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:-left-5 sm:h-10 sm:w-10"
          >
            <ChevronLeft size={19} />
          </button>

          {/* Flecha derecha */}

          <button
            type="button"
            onClick={siguiente}
            aria-label="Siguiente reseña"
            className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 sm:-right-5 sm:h-10 sm:w-10"
          >
            <ChevronRight size={19} />
          </button>
        </div>

        {/* Indicadores */}

        <div className="mt-6 flex justify-center gap-2">
          {resenas.map((resena, index) => (
            <button
              key={`${resena.nombre}-indicador`}
              type="button"
              onClick={() => setIndiceActual(index)}
              aria-label={`Ver reseña ${index + 1}`}
              className={`h-2 rounded-full transition-all duration-300 ${
                indiceActual === index
                  ? "w-7 bg-sky-600"
                  : "w-2 bg-slate-300 hover:bg-slate-400"
              }`}
            />
          ))}
        </div>

        {/* Referencias */}

        <div className="mt-8 flex justify-center">
          
        </div>
      </div>
    </section>
  );
};

export default Resenas;