import { CONFIG } from "../datos/config";
import { useState } from "react";

import {
  Users,
  Shield,
  X,
  Info,
} from "lucide-react";

const SobreMi = () => {
  const [
    modalVerificacionAbierto,
    setModalVerificacionAbierto,
  ] = useState(false);

  return (
    <>
      <section
        id="sobre-mi"
        className="bg-[#FAF8F3] px-5 py-12 md:py-14"
      >
        <div className="mx-auto max-w-5xl">

          {/* ENCABEZADO */}

          <div className="mx-auto mb-7 max-w-xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#C9785C]">
              Sobre mí
            </p>

            <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.02em] text-[#26352F] md:text-[28px]">
              Conoce quién cuidará tu hogar
            </h2>

            <p className="mt-2.5 text-sm font-normal leading-6 text-[#66736D]">
              Responsabilidad, confianza y cuidado
              personalizado para tu hogar y tus
              mascotas.
            </p>
          </div>

          {/* PRESENTACIÓN */}

          <div className="overflow-hidden rounded-md border border-[#E5E2DA] bg-[#FFFEFC]">
            <div className="grid md:grid-cols-[0.72fr_1.28fr]">

              {/* FOTO */}

              <div className="flex items-center justify-center border-b border-[#E5E2DA] bg-[#F1F5EF] p-6 md:border-b-0 md:border-r">
                {CONFIG.imagenes.perfil ? (
                  <img
                    src={CONFIG.imagenes.perfil}
                    alt="Andrés"
                    className="h-44 w-44 rounded-md object-cover sm:h-52 sm:w-52"
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center rounded-md bg-[#E1EBE3] text-[#3F6655] sm:h-52 sm:w-52">
                    <Users
                      size={58}
                      strokeWidth={1.3}
                    />
                  </div>
                )}
              </div>

              {/* CONTENIDO */}

              <div className="p-5 sm:p-6 md:p-7">
                <h3 className="text-xl font-medium text-[#26352F]">
                  Andrés
                </h3>

                <div className="mt-3 h-px w-8 bg-[#C9785C]/60" />

                <p className="mt-4 text-[13px] font-normal leading-6 text-[#66736D] sm:text-sm">
                  Soy Andrés y ofrezco servicios de
                  cuidado de casas y mascotas para
                  personas que necesitan dejar su
                  hogar en buenas manos mientras
                  están fuera.
                </p>

                <p className="mt-3 text-[13px] font-normal leading-6 text-[#66736D] sm:text-sm">
                  Mi objetivo es brindar un cuidado
                  responsable y personalizado,
                  respetando las rutinas de cada
                  hogar y manteniendo una
                  comunicación clara durante toda la
                  estadía.
                </p>

                {/* VERIFICACIÓN */}

                <div className="mt-5 rounded-md border border-[#D8E4DA] bg-[#F1F5EF] p-4">
                  <div className="flex items-start gap-3">

                    <div className="flex h-8 w-8 min-w-8 items-center justify-center rounded-md bg-[#E1EBE3] text-[#3F6655]">
                      <Shield
                        size={16}
                        strokeWidth={1.7}
                      />
                    </div>

                    <div className="flex-1">
                      <h4 className="text-[13px] font-medium text-[#26352F]">
                        Verificación de identidad
                      </h4>

                      <p className="mt-1.5 text-[12px] font-normal leading-5 text-[#66736D]">
                        La documentación personal
                        puede verificarse de forma
                        privada antes de confirmar
                        una reserva.
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setModalVerificacionAbierto(
                            true
                          )
                        }
                        className="mt-2.5 inline-flex items-center gap-1.5 text-[12px] font-medium text-[#3F6655] transition hover:text-[#345548]"
                      >
                        <Info
                          size={14}
                          strokeWidth={1.7}
                        />

                        Ver cómo funciona
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL VERIFICACIÓN */}

      {modalVerificacionAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#26352F]/45 p-5 backdrop-blur-sm"
          onClick={() =>
            setModalVerificacionAbierto(
              false
            )
          }
        >
          <div
            className="relative w-full max-w-lg rounded-md border border-[#E5E2DA] bg-[#FFFEFC] p-5 shadow-xl sm:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            {/* CERRAR */}

            <button
              type="button"
              onClick={() =>
                setModalVerificacionAbierto(
                  false
                )
              }
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md bg-[#F1F5EF] text-[#66736D] transition hover:bg-[#E8F0EA] hover:text-[#3F6655]"
              aria-label="Cerrar"
            >
              <X
                size={16}
                strokeWidth={1.7}
              />
            </button>

            {/* ENCABEZADO */}

            <div className="pr-10">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#C9785C]">
                Privacidad
              </p>

              <h3 className="mt-1 text-lg font-medium text-[#26352F]">
                Verificación de identidad
              </h3>

              <p className="mt-2 text-[12px] font-normal leading-5 text-[#66736D]">
                La verificación se realiza de forma
                privada para proteger la información
                personal.
              </p>
            </div>

            {/* CONTENIDO */}

            <div className="mt-5 space-y-3">
              {[
                "La documentación no se publica en el sitio web.",
                "Puede solicitarse una verificación antes de confirmar el servicio.",
                "La información se comparte únicamente cuando sea necesaria para coordinar la reserva.",
                "Los datos personales deben tratarse de forma confidencial.",
              ].map((texto) => (
                <div
                  key={texto}
                  className="flex items-start gap-2.5"
                >
                  <span className="mt-[7px] h-1.5 w-1.5 min-w-1.5 rounded-full bg-[#3F6655]" />

                  <p className="text-[12px] font-normal leading-5 text-[#66736D]">
                    {texto}
                  </p>
                </div>
              ))}

              {/* AVISO */}

              <div className="mt-4 rounded-md border border-[#E5E2DA] bg-[#FAF8F3] p-3.5">
                <div className="flex items-start gap-2.5">
                  <Info
                    size={14}
                    strokeWidth={1.7}
                    className="mt-0.5 min-w-[14px] text-[#C9785C]"
                  />

                  <p className="text-[11px] font-normal leading-5 text-[#66736D]">
                    Por seguridad y privacidad, los
                    documentos personales no se
                    muestran públicamente en esta
                    página.
                  </p>
                </div>
              </div>
            </div>

            {/* BOTÓN */}

            <button
              type="button"
              onClick={() =>
                setModalVerificacionAbierto(
                  false
                )
              }
              className="mt-5 w-full rounded-md bg-[#3F6655] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#345548] active:scale-[0.99]"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default SobreMi;