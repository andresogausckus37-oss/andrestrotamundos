import {
  Video,
  Home,
  Heart,
  CalendarDays,
} from "lucide-react";

import { pasos } from "../datos/pasos";

const iconos = {
  video: Video,
  home: Home,
  heart: Heart,
};

const ComoFunciona = () => {
  const irADisponibilidad = () => {
    document
      .getElementById("disponibilidad")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <section
      id="mi-proceso"
      className="bg-[#F1F5EF] px-5 py-12 md:py-14"
    >
      <div className="contenedor">

        {/* ENCABEZADO */}

        <div className="mx-auto mb-7 max-w-xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#C9785C]">
            Mi proceso
          </p>

          <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.02em] text-[#26352F] md:text-[28px]">
            Cómo funciona
          </h2>

          <p className="mt-2.5 text-sm font-normal leading-6 text-[#66736D]">
            Un proceso simple y claro para organizar el cuidado
            de tu hogar y tus mascotas.
          </p>
        </div>

        {/* PASOS */}

        <div className="relative grid gap-3 md:grid-cols-3 md:gap-4">
          {pasos.map((paso, index) => {
            const Icono = iconos[paso.icono];

            const titulo =
              typeof paso.titulo === "string"
                ? paso.titulo
                : paso.titulo?.es;

            const descripcion =
              typeof paso.descripcion === "string"
                ? paso.descripcion
                : paso.descripcion?.es;

            return (
              <article
                key={paso.numero}
                className="group relative rounded-md border border-[#DDE5DC] bg-[#FFFEFC] p-4 transition duration-200 hover:border-[#BFCFC3]"
              >
                {/* NÚMERO + ICONO */}

                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-medium tracking-[0.12em] text-[#C9785C]">
                    {paso.numero}
                  </span>

                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#E8F0EA] text-[#3F6655] transition group-hover:bg-[#DFEADF]">
                    <Icono
                      size={16}
                      strokeWidth={1.7}
                    />
                  </div>
                </div>

                {/* TEXTO */}

                <h3 className="text-[15px] font-medium text-[#26352F]">
                  {titulo}
                </h3>

                <p className="mt-1.5 text-[13px] font-normal leading-5 text-[#66736D]">
                  {descripcion}
                </p>

                {/* DETALLE INFERIOR */}

                <div className="mt-4 h-px w-8 bg-[#C9785C]/40" />
              </article>
            );
          })}
        </div>

        {/* DISPONIBILIDAD */}

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={irADisponibilidad}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-[#3F6655] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#345548] active:scale-[0.98]"
          >
            <CalendarDays
              size={15}
              strokeWidth={1.8}
            />

            Ver disponibilidad
          </button>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;