import { useState } from "react";
import {
  Dog,
  Home,
  Building2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";

import { servicios } from "../datos/servicios";
import { useIdioma } from "../contextos/IdiomaContext";
import { traducciones } from "../datos/traducciones";

const iconos = {
  dog: Dog,
  home: Home,
  building: Building2,
};

const colores = {
  mascotas: {
    icono: "bg-emerald-100 text-emerald-700",
    badge: "bg-emerald-100 text-emerald-700",
  },

  casa: {
    icono: "bg-sky-100 text-sky-700",
    badge: "bg-sky-100 text-sky-700",
  },

  voluntariado: {
    icono: "bg-amber-100 text-amber-700",
    badge: "bg-amber-100 text-amber-700",
  },
};

const Servicios = () => {
  const [activeService, setActiveService] = useState(null);

  const { idioma } = useIdioma();
  const t = traducciones[idioma].servicios;

  const irADisponibilidad = () => {
    document.getElementById("disponibilidad")?.scrollIntoView({
      behavior: "smooth",
    });
  };

  return (
    <section id="servicios" className="seccion bg-white">
      <div className="contenedor">
        {/* Encabezado */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="eyebrow">{t.etiqueta}</p>

          <h2 className="titulo-seccion">{t.titulo}</h2>

          <p className="subtitulo-seccion">{t.descripcion}</p>
        </div>

        {/* Cards */}
        <div className="grid gap-4 md:grid-cols-2">
          {servicios
            .filter((servicio) => servicio.id !== "paseador")
            .map((servicio) => {
              const Icono = iconos[servicio.icono];
              const color = colores[servicio.id];

              return (
                <article
                  key={servicio.id}
                  className="card overflow-hidden transition hover:-translate-y-0.5 hover:shadow-suave"
                >
                  {/* Parte visible */}
                  <button
                    type="button"
                    onClick={() =>
                      setActiveService(
                        activeService === servicio.id ? null : servicio.id,
                      )
                    }
                    className="flex w-full items-start gap-3 p-6 text-left sm:p-5"
                  >
                    <div
                      className={`flex h-11 w-11 min-w-11 items-center justify-center rounded-xl ${color.icono}`}
                    >
                      <Icono size={22} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900 sm:text-lg">
                          {servicio.titulo[idioma]}
                        </h3>

                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${color.badge}`}
                        >
                          {servicio.modalidad === "intercambio"
                            ? t.intercambio
                            : t.servicioPago}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm leading-5 text-slate-600">
                        {servicio.descripcion[idioma]}
                      </p>
                    </div>

                    {activeService === servicio.id ? (
                      <ChevronUp
                        size={18}
                        className="mt-1 min-w-5 text-slate-400"
                      />
                    ) : (
                      <ChevronDown
                        size={18}
                        className="mt-1 min-w-5 text-slate-400"
                      />
                    )}
                  </button>

                  {/* Detalle */}
                  {activeService === servicio.id && (
                    <div className="border-t border-slate-200 px-4 pb-5 pt-4 sm:px-5">
                      <div className="grid gap-5 sm:grid-cols-2">
                        {/* Incluido */}
                        <div>
                          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                            {servicio.modalidad === "intercambio"
                              ? t.incluidoIntercambio
                              : t.servicioBase}
                          </p>

                          <ul className="space-y-2">
                            {servicio.incluye[idioma].map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 text-sm leading-6 text-slate-600"
                              >
                                <CheckCircle2
                                  size={14}
                                  className="mt-1 min-w-4 text-emerald-600"
                                />

                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Adicionales */}
                        <div>
                          <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-orange-700">
                            {t.adicionales}
                          </p>

                          <ul className="space-y-2">
                            {servicio.adicionales[idioma].map((item) => (
                              <li
                                key={item}
                                className="flex items-start gap-2 text-sm leading-6 text-slate-600"
                              >
                                <span className="mt-1 text-orange-500">•</span>

                                <span>{item}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* CTA */}
                      <button
                        type="button"
                        onClick={irADisponibilidad}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-100 px-4 py-2.5 text-sm font-semibold text-sky-700 transition hover:bg-sky-200"
                      >
                        <CalendarDays size={16} />
                        {t.verDisponibilidad}
                      </button>
                    </div>
                  )}
                </article>
              );
            })}
        </div>
      </div>
    </section>
  );
};

export default Servicios;