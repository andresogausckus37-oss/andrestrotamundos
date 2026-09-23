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
  const [indiceActual, setIndiceActual] =
    useState(0);

  const estilosAvatar = [
    "bg-[#E8F0EA] text-[#3F6655]",
    "bg-[#F6E8E1] text-[#B8664B]",
    "bg-[#F1F5EF] text-[#3F6655]",
  ];

  const siguiente = () => {
    setIndiceActual((actual) =>
      actual === resenas.length - 1
        ? 0
        : actual + 1
    );
  };

  const anterior = () => {
    setIndiceActual((actual) =>
      actual === 0
        ? resenas.length - 1
        : actual - 1
    );
  };

  useEffect(() => {
    const intervalo = setInterval(() => {
      setIndiceActual((actual) =>
        actual === resenas.length - 1
          ? 0
          : actual + 1
      );
    }, 5000);

    return () =>
      clearInterval(intervalo);
  }, []);

  return (
    <section
      id="resenas"
      className="bg-[#FFFEFC] px-5 py-12 md:py-14"
    >
      <div className="contenedor">

        {/* ENCABEZADO */}

        <div className="mx-auto mb-7 max-w-xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#C9785C]">
            Reseñas
          </p>

          <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.02em] text-[#26352F] md:text-[28px]">
            Experiencias de quienes confiaron en mí
          </h2>

          <p className="mt-2.5 text-sm font-normal leading-6 text-[#66736D]">
            Opiniones de personas que confiaron en mi
            servicio para cuidar sus hogares y
            mascotas.
          </p>
        </div>

        {/* SLIDER */}

        <div className="relative mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-md">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${
                  indiceActual * 100
                }%)`,
              }}
            >
              {resenas.map(
                (resena, index) => (
                  <div
                    key={`${resena.nombre}-${resena.lugar}`}
                    className="w-full min-w-full"
                  >
                    <article className="relative overflow-hidden rounded-md border border-[#E5E2DA] bg-white px-6 py-6 sm:px-9 sm:py-7">

                      {/* COMILLAS */}

                      <Quote
                        size={52}
                        strokeWidth={1}
                        className="absolute right-4 top-3 text-[#F6E8E1]"
                      />

                      <div className="relative">

                        {/* ESTRELLAS */}

                        <div className="mb-4 flex justify-center gap-1 text-[#C9785C]">
                          {Array.from({
                            length:
                              resena.estrellas,
                          }).map(
                            (
                              _,
                              estrellaIndex
                            ) => (
                              <Star
                                key={
                                  estrellaIndex
                                }
                                size={15}
                                strokeWidth={
                                  1.5
                                }
                                fill="currentColor"
                              />
                            )
                          )}
                        </div>

                        {/* RESEÑA */}

                        <p className="mx-auto max-w-2xl text-center text-[14px] font-normal leading-6 text-[#53635B] sm:text-[15px] sm:leading-7">
                          “{resena.texto}”
                        </p>

                        {/* PERSONA */}

                        <div className="mt-5 flex items-center justify-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-md text-[12px] font-medium ${
                              estilosAvatar[
                                index %
                                  estilosAvatar.length
                              ]
                            }`}
                          >
                            {resena.nombre.charAt(
                              0
                            )}
                          </div>

                          <div className="text-left">
                            <p className="text-[13px] font-medium text-[#26352F]">
                              {resena.nombre}
                            </p>

                            <p className="mt-0.5 flex items-center gap-1 text-[11px] font-normal text-[#7B8680]">
                              <MapPin
                                size={11}
                                strokeWidth={
                                  1.7
                                }
                              />

                              {resena.lugar}
                            </p>
                          </div>
                        </div>
                      </div>
                    </article>
                  </div>
                )
              )}
            </div>
          </div>

          {/* FLECHA IZQUIERDA */}

          <button
            type="button"
            onClick={anterior}
            aria-label="Reseña anterior"
            className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-[#E5E2DA] bg-[#FFFEFC] text-[#66736D] transition hover:border-[#BFCFC3] hover:bg-[#F1F5EF] hover:text-[#3F6655] sm:-left-4"
          >
            <ChevronLeft
              size={16}
              strokeWidth={1.7}
            />
          </button>

          {/* FLECHA DERECHA */}

          <button
            type="button"
            onClick={siguiente}
            aria-label="Reseña siguiente"
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md border border-[#E5E2DA] bg-[#FFFEFC] text-[#66736D] transition hover:border-[#BFCFC3] hover:bg-[#F1F5EF] hover:text-[#3F6655] sm:-right-4"
          >
            <ChevronRight
              size={16}
              strokeWidth={1.7}
            />
          </button>
        </div>

        {/* INDICADORES */}

        <div className="mt-5 flex justify-center gap-1.5">
          {resenas.map(
            (resena, index) => (
              <button
                key={`${resena.nombre}-indicador`}
                type="button"
                onClick={() =>
                  setIndiceActual(index)
                }
                aria-label={`Ver reseña ${
                  index + 1
                }`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  indiceActual === index
                    ? "w-6 bg-[#3F6655]"
                    : "w-1.5 bg-[#D8DDD8] hover:bg-[#AAB8AF]"
                }`}
              />
            )
          )}
        </div>
      </div>
    </section>
  );
};

export default Resenas;