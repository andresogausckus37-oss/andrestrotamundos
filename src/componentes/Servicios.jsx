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

const iconos = {
  dog: Dog,
  home: Home,
  building: Building2,
};

const textoEs = (valor) => {
  if (typeof valor === "string") {
    return valor;
  }

  return valor?.es || "";
};

const listaEs = (valor) => {
  if (Array.isArray(valor)) {
    return valor;
  }

  return valor?.es || [];
};

const Servicios = () => {
  const [activeService, setActiveService] =
    useState(null);

  const irADisponibilidad = () => {
    document
      .getElementById("disponibilidad")
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  return (
    <section
      id="servicios"
      className="seccion bg-white"
    >
      <div className="contenedor">
        {/* ENCABEZADO */}

        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className="eyebrow">
            Servicios
          </p>

          <h2 className="titulo-seccion">
            Cuidado de hogares y mascotas
          </h2>

          <p className="subtitulo-seccion">
            Opciones de cuidado adaptadas a las
            necesidades de cada hogar y mascota.
          </p>
        </div>

        {/* CARDS */}

        <div className="grid gap-4 md:grid-cols-2">
          {servicios
            .filter(
              (servicio) =>
                servicio.id !== "paseador"
            )
            .map((servicio) => {
              const Icono =
                iconos[servicio.icono];

              const titulo =
                textoEs(servicio.titulo);

              const descripcion =
                textoEs(
                  servicio.descripcion
                );

              const incluye =
                listaEs(servicio.incluye);

              const adicionales =
                listaEs(
                  servicio.adicionales
                );

              const abierto =
                activeService ===
                servicio.id;

              return (
                <article
                  key={servicio.id}
                  className={`overflow-hidden rounded-md border bg-white transition-colors duration-200 ${
                    abierto
                      ? "border-slate-300"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* PARTE VISIBLE */}

                  <button
                    type="button"
                    onClick={() =>
                      setActiveService(
                        abierto
                          ? null
                          : servicio.id
                      )
                    }
                    className="flex w-full items-start gap-4 p-5 text-left sm:p-6"
                  >
                    {/* ICONO */}

                    <div className="flex h-10 w-10 min-w-10 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-700">
                      <Icono
                        size={20}
                        strokeWidth={1.7}
                      />
                    </div>

                    {/* INFORMACIÓN */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <h3 className="text-base font-medium text-slate-900 sm:text-lg">
                          {titulo}
                        </h3>

                        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-medium uppercase tracking-[0.08em] text-slate-600">
                          {servicio.modalidad ===
                          "intercambio"
                            ? "Intercambio"
                            : "Servicio pago"}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-normal leading-6 text-slate-600">
                        {descripcion}
                      </p>
                    </div>

                    {/* FLECHA */}

                    {abierto ? (
                      <ChevronUp
                        size={18}
                        strokeWidth={1.7}
                        className="mt-1 min-w-5 text-slate-500"
                      />
                    ) : (
                      <ChevronDown
                        size={18}
                        strokeWidth={1.7}
                        className="mt-1 min-w-5 text-slate-500"
                      />
                    )}
                  </button>

                  {/* DETALLE */}

                  {abierto && (
                    <div className="border-t border-slate-200 px-5 pb-5 pt-5 sm:px-6 sm:pb-6">
                      <div className="grid gap-6 sm:grid-cols-2">
                        {/* INCLUIDO */}

                        <div>
                          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-700">
                            {servicio.modalidad ===
                            "intercambio"
                              ? "Incluido en el intercambio"
                              : "Servicio base"}
                          </p>

                          <ul className="space-y-2.5">
                            {incluye.map(
                              (item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2.5 text-sm font-normal leading-6 text-slate-600"
                                >
                                  <CheckCircle2
                                    size={15}
                                    strokeWidth={
                                      1.8
                                    }
                                    className="mt-1 min-w-4 text-slate-500"
                                  />

                                  <span>
                                    {item}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        {/* ADICIONALES */}

                        <div>
                          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.12em] text-orange-700">
                            Adicionales
                          </p>

                          <ul className="space-y-2.5">
                            {adicionales.map(
                              (item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2.5 text-sm font-normal leading-6 text-slate-600"
                                >
                                  <span className="mt-[7px] h-1 w-1 min-w-1 rounded-full bg-orange-700" />

                                  <span>
                                    {item}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* CTA */}

                      <button
                        type="button"
                        onClick={
                          irADisponibilidad
                        }
                        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                      >
                        <CalendarDays
                          size={16}
                          strokeWidth={1.8}
                        />

                        Ver disponibilidad
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