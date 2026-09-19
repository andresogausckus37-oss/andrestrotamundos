import {
  Video,
  Home,
  Heart,
  CalendarDays,
} from "lucide-react";

import { pasos } from "../datos/pasos";
import { useIdioma } from "../contextos/IdiomaContext";
import { traducciones } from "../datos/traducciones";

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
  const { idioma } = useIdioma();
  const t = traducciones[idioma].comoFunciona;

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
            {t.etiqueta}
          </p>

          <h2 className="titulo-seccion">
            {t.titulo}
          </h2>

          <p className="mt-3 text-sm leading-6 text-slate-600">
            {t.descripcion}
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
                className={`card relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:shadow-suave ${estilo.borde}`}
              >
                <div className="mb-3 flex items-center justify-between">
                  <span
                    className={`text-md font-semibold tracking-[0.18em] ${estilo.numero}`}
                  >
                    {paso.numero}
                  </span>

                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-lg ${estilo.icono}`}
                  >
                    <Icono size={18} />
                  </div>
                </div>

                <h3 className="text-md font-semibold text-slate-900 sm:text-base">
                  {paso.titulo[idioma]}
                </h3>

                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {paso.descripcion[idioma]}
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
            {t.verDisponibilidad}
          </button>
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;