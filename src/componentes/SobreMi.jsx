import { CONFIG } from "../datos/config";
import { useState } from "react";
import {
  Users,
  Shield,
  Heart,
  X,
  Info,
} from "lucide-react";

const SobreMi = () => {
  const [modalVerificacionAbierto, setModalVerificacionAbierto] =
    useState(false);

  return (
    <>
      <section id="sobre-mi" className="seccion bg-sky-50">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <p className="eyebrow">
              Sobre mí
            </p>

            <h2 className="titulo-seccion">
              Confianza antes que cualquier acuerdo
            </h2>

            <p className="subtitulo-seccion">
              La tranquilidad de quien deja su hogar y sus mascotas es una parte
              esencial de mi forma de trabajar.
            </p>
          </div>

          <div className="overflow-hidden rounded-3xl border border-sky-100 bg-white shadow-suave">
            <div className="grid md:grid-cols-[0.8fr_1.2fr]">
              {/* Foto */}

              <div className="flex items-center justify-center from-sky-100 via-white to-orange-100 p-8">
  {CONFIG.imagenes.perfil ? (
    <img
      src={CONFIG.imagenes.perfil}
      alt="Andrés"
      className="h-48 w-48 rounded-full border-4 border-white object-cover shadow-xl sm:h-56 sm:w-56"
                  />
                ) : (
                  <div className="flex h-44 w-44 items-center justify-center rounded-full border-8 border-white bg-sky-100 text-sky-700 shadow-xl">
                    <Users
                      size={72}
                      strokeWidth={1.3}
                    />
                  </div>
                )}
              </div>

              {/* Contenido */}

              <div className="p-6 sm:p-8 md:p-10">
                

                <h3 className="text-2xl font-semibold text-slate-900">
                  Soy Andrés
                </h3>

                <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                  Soy viajero y amante de los animales. Mi propuesta se basa en
                  la responsabilidad, la confianza mutua y los acuerdos claros.
                  Cuido cada hogar respetando sus rutinas, sus espacios y las
                  necesidades de cada mascota.
                </p>

                <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
                  Antes de confirmar una estancia prefiero que podamos
                  conocernos, conversar y revisar todos los detalles necesarios.
                  La idea es que ambas partes se sientan cómodas con el acuerdo.
                </p>

                {/* Verificación privada */}

                <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex items-start gap-3">
                    <Shield
                      size={21}
                      className="mt-0.5 min-w-5 text-emerald-700"
                    />

                    <div className="flex-1">
                      <h4 className="font-semibold text-slate-900">
                        Verificación privada
                      </h4>

                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        La documentación necesaria para verificar mi identidad y
                        antecedentes puede presentarse de forma privada antes de
                        confirmar una estancia.
                      </p>

                      <button
                        type="button"
                        onClick={() => setModalVerificacionAbierto(true)}
                        className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
                      >
                        <Info size={15} />
                        Ver cómo funciona la verificación
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modal verificación */}

      {modalVerificacionAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-sm"
          onClick={() => setModalVerificacionAbierto(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}

            <button
              type="button"
              onClick={() => setModalVerificacionAbierto(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            {/* Encabezado */}

            <div className="pr-10">
              

              <h3 className="text-xl font-semibold text-slate-900">
                Verificación privada
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                La confianza es una parte fundamental antes de confirmar
                cualquier estancia.
              </p>
            </div>

            {/* Contenido */}

            <div className="mt-6 space-y-4 text-sm leading-6 text-slate-600">
              <div className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-emerald-500" />

                <p>
                  Cuando exista una conversación previa y ambas partes quieran
                  avanzar, puedo presentar documentación de identidad de forma
                  privada.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-emerald-500" />

                <p>
                  También puedo presentar certificados oficiales vigentes que
                  permitan verificar antecedentes cuando resulte necesario para
                  el acuerdo.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-emerald-500" />

                <p>
                  Por seguridad y privacidad, estos documentos no se publican
                  directamente en la web ni quedan disponibles públicamente.
                </p>
              </div>

              <div className="flex gap-3">
                <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-emerald-500" />

                <p>
                  La documentación se comparte únicamente cuando existe un
                  motivo legítimo de verificación relacionado con una posible
                  estancia.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs leading-5 text-slate-500">
                  La verificación de identidad forma parte del proceso de
                  confianza entre ambas partes y no sustituye la conversación
                  previa, el conocimiento del hogar y las condiciones acordadas
                  para la estancia.
                </p>
              </div>
            </div>

            {/* Botón */}

            <button
              type="button"
              onClick={() => setModalVerificacionAbierto(false)}
              className="mt-7 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
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