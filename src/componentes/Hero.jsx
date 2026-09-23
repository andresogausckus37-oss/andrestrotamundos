import { ChevronRight } from "lucide-react";

const Hero = ({ scrollTo }) => {
  return (
    <section
      id="inicio"
      className="relative flex items-center overflow-hidden bg-[#FAF8F3] px-5 pt-24"
    >
      {/* DETALLE DE FONDO */}

      <div className="absolute -right-24 top-20 h-72 w-72 rounded-full bg-[#E8F0EA]/70 blur-3xl" />

      <div className="absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-[#F6E8E1]/60 blur-3xl" />

      {/* CONTENIDO */}

      <div className="contenedor relative grid w-full items-center gap-10 py-14 md:grid-cols-[1.1fr_.9fr] md:py-16">
        <div className="text-center md:text-left">

          {/* ETIQUETA */}

          <div className="mb-4 flex justify-center md:justify-start">
            <span className="inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.14em] text-[#3F6655]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#C9785C]" />
              Cuidado responsable
            </span>
          </div>

          {/* TÍTULO */}

          <h1 className="text-4xl font-medium leading-[1.12] tracking-[-0.03em] text-[#26352F] sm:text-5xl lg:text-6xl">
            Tu hogar y tus mascotas

            <span className="block text-[#3F6655]">
              en buenas manos
            </span>
          </h1>

          {/* DESCRIPCIÓN */}

          <p className="mx-auto mt-5 max-w-xl text-base font-normal leading-7 text-[#66736D] sm:text-[17px] md:mx-0">
            Cuidado responsable de tu hogar y tus mascotas
            mientras estás fuera, con atención personalizada y
            comunicación directa.
          </p>

          {/* ACCIONES */}

          <div className="mt-7 flex flex-col items-center gap-2.5 sm:flex-row md:justify-start">
            <button
              type="button"
              onClick={() => scrollTo("servicios")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3F6655] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#345548] active:scale-[0.99] sm:w-auto"
            >
              Ver servicios

              <ChevronRight
                size={16}
                strokeWidth={1.8}
              />
            </button>

            <button
              type="button"
              onClick={() =>
                scrollTo("disponibilidad")
              }
              className="inline-flex w-full items-center justify-center rounded-md border border-[#D8DDD8] bg-[#FFFEFC] px-5 py-2.5 text-sm font-medium text-[#3F6655] transition hover:border-[#BFCFC3] hover:bg-[#F1F5EF] active:scale-[0.99] sm:w-auto"
            >
              Ver disponibilidad
            </button>
          </div>

          {/* MENSAJE INFERIOR */}

          <div className="mt-6 flex items-center justify-center gap-3 text-[12px] font-normal text-[#66736D] md:justify-start">
            <span className="h-px w-6 bg-[#C9785C]/60" />

            Atención personalizada para cada hogar
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;