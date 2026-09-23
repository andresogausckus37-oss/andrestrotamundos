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
      className="bg-[#FFFEFC] px-5 py-12 md:py-14"
    >
      <div className="contenedor">

        {/* ENCABEZADO */}

        <div className="mx-auto mb-7 max-w-xl text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#C9785C]">
            Servicios
          </p>

          <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.02em] text-[#26352F] md:text-[28px]">
            Cuidado de hogares y mascotas
          </h2>

          <p className="mt-2.5 text-sm font-normal leading-6 text-[#66736D]">
            Opciones de cuidado adaptadas a las
            necesidades de cada hogar y mascota.
          </p>
        </div>

        {/* SERVICIOS */}

        <div className="grid gap-3 md:grid-cols-2">
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
                      ? "border-[#BFCFC3]"
                      : "border-[#E5E2DA] hover:border-[#C9D5CB]"
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
                    className="flex w-full items-start gap-3.5 p-4 text-left"
                  >
                    {/* ICONO */}

                    <div
                      className={`flex h-9 w-9 min-w-9 items-center justify-center rounded-md transition-colors ${
                        abierto
                          ? "bg-[#3F6655] text-white"
                          : "bg-[#E8F0EA] text-[#3F6655]"
                      }`}
                    >
                      <Icono
                        size={17}
                        strokeWidth={1.7}
                      />
                    </div>

                    {/* INFORMACIÓN */}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                        <h3 className="text-[15px] font-medium text-[#26352F]">
                          {titulo}
                        </h3>

                        <span
                          className={`rounded-md px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.08em] ${
                            servicio.modalidad ===
                            "intercambio"
                              ? "bg-[#E8F0EA] text-[#3F6655]"
                              : "bg-[#F6E8E1] text-[#A85F48]"
                          }`}
                        >
                          {servicio.modalidad ===
                          "intercambio"
                            ? "Intercambio"
                            : "Servicio pago"}
                        </span>
                      </div>

                      <p className="mt-1.5 text-[13px] font-normal leading-5 text-[#66736D]">
                        {descripcion}
                      </p>
                    </div>

                    {/* FLECHA */}

                    <div className="mt-0.5 flex h-7 w-7 min-w-7 items-center justify-center rounded-md text-[#66736D] transition-colors hover:bg-[#F1F5EF]">
                      {abierto ? (
                        <ChevronUp
                          size={16}
                          strokeWidth={1.7}
                        />
                      ) : (
                        <ChevronDown
                          size={16}
                          strokeWidth={1.7}
                        />
                      )}
                    </div>
                  </button>

                  {/* DETALLE */}

                  {abierto && (
                    <div className="border-t border-[#E5E2DA] bg-[#FFFEFC] px-4 pb-4 pt-4">

                      <div className="grid gap-5 sm:grid-cols-2">

                        {/* INCLUIDO */}

                        <div>
                          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#3F6655]">
                            {servicio.modalidad ===
                            "intercambio"
                              ? "Incluido en el intercambio"
                              : "Servicio base"}
                          </p>

                          <ul className="space-y-2">
                            {incluye.map(
                              (item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2 text-[12px] font-normal leading-5 text-[#66736D]"
                                >
                                  <CheckCircle2
                                    size={14}
                                    strokeWidth={
                                      1.7
                                    }
                                    className="mt-[3px] min-w-[14px] text-[#3F6655]"
                                  />

                                  <span>
                                    {item}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>

                        {/* ADICIONAL CON COSTO */}

                        <div>
                          <p className="mb-2.5 text-[10px] font-medium uppercase tracking-[0.12em] text-[#B8664B]">
                            Adicional con costo
                          </p>

                          <ul className="space-y-2">
                            {adicionales.map(
                              (item) => (
                                <li
                                  key={item}
                                  className="flex items-start gap-2 text-[12px] font-normal leading-5 text-[#66736D]"
                                >
                                  <span className="mt-[7px] h-1 w-1 min-w-1 rounded-full bg-[#C9785C]" />

                                  <span>
                                    {item}
                                  </span>
                                </li>
                              )
                            )}
                          </ul>
                        </div>
                      </div>

                      {/* CONDICIONES DEL INTERCAMBIO */}

{servicio.modalidad === "intercambio" && (
  <div className="mt-4 rounded-md border border-[#DDE5DC] bg-[#F1F5EF] p-4">
    <div className="grid gap-3 sm:grid-cols-2">

      {/* INTERCAMBIO BASE */}

      <div>
      </div>

      {/* MÁS DE 3 MASCOTAS */}

      <div className="sm:pl-4">
        <p className="text-[12px] font-medium text-[#26352F]">
          Más de 3 mascotas
        </p>

        <p className="mt-1 text-[12px] font-normal leading-5 text-[#66736D]">
          A partir de la cuarta mascota, se acuerda
          previamente una compensación adicional
          según la cantidad de mascotas adicionales y la duración
          de la estadía.
        </p>
      </div>
    </div>
  </div>
)}

                      {/* CTA */}

                      <button
                        type="button"
                        onClick={
                          irADisponibilidad
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3F6655] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#345548] active:scale-[0.99]"
                      >
                        <CalendarDays
                          size={15}
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