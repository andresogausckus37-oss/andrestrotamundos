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

const estilos = [
  {
    icono: "bg-sky-100 text-sky-700",
    numero: "text-sky-600",
    borde: "hover:border-sky-200",
  },
  {
    icono: "bg-orange-100 text-orange-700",
    numero: "text-orange-600",
    borde: "hover:border-orange-200",
  },
  {
    icono: "bg-emerald-100 text-emerald-700",
    numero: "text-emerald-600",
    borde: "hover:border-emerald-200",
  },
];

const ComoFunciona = () => {
  const irADisponibilidad = () => {
    document.getElementById("disponibilidad")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section
      id="mi-proceso"
      className="bg-slate-50 px-5 py-14 md:py-16"
    >
      <div className="contenedor">
        {/* Encabezado */}

        <div className="mx-auto mb-7 max-w-2xl text-center">
          <p className="eyebrow">
            Cómo funciona
          </p>

          <h2 className="titulo-seccion">
            Antes de cuidar, nos conocemos
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            Un proceso sencillo para conocernos, acordar los detalles y
            comenzar la estancia con tranquilidad.
          </p>
        </div>

        {/* Pasos */}

        <div className="grid gap-3 md:grid-cols-3">
          {pasos.map((paso, index) => {
            const Icono = iconos[paso.icono];
            const estilo = estilos[index];

            return (
              <article
                key={paso.numero}
                className={`card relative overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-suave ${estilo.borde}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`text-xs font-semibold tracking-[0.18em] ${estilo.numero}`}
                  >
                    {paso.numero}
                  </span>

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${estilo.icono}`}
                  >
                    <Icono size={18} />
                  </div>
                </div>

                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                  {paso.titulo}
                </h3>

                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {paso.descripcion}
                </p>
              </article>
            );
          })}
        </div>

        {/* Botón disponibilidad */}

        <div className="mt-5 flex justify-center">
          <button
            type="button"
            onClick={irADisponibilidad}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700"
          >
            <CalendarDays size={16} />
            Ver disponibilidad
          </button>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;