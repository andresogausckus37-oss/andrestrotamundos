import { CONFIG } from "../datos/config";
import {
  Shield,
  Video,
  MessageCircle,
  ChevronRight,
  Dog,
} from "lucide-react";

const Hero = ({ scrollTo }) => {
  return (
    <section
      id="inicio"
      className="relative flex min-h-screen items-center px-5 overflow-hidden bg-white pt-24"
    >
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-sky-50 via-white to-orange-50" />

      <div className="absolute -left-40 top-20 -z-10 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />

      <div className="absolute -right-32 bottom-10 -z-10 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />

      <div className="contenedor grid w-full items-center gap-12 py-16 md:grid-cols-[1.1fr_.9fr]">
        <div className="text-center md:text-left">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-4 py-2 text-xs font-medium text-sky-700 shadow-sm backdrop-blur">
            <Shield size={15} />
            Cuidado responsable y trato personal
          </div>

          <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Tu hogar y tus mascotas,
            <span className="block text-sky-600">
              cuidados mientras viajas
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg md:mx-0">
            Cuidado de casas, mascotas e intercambios basados en confianza,
            responsabilidad y comunicación clara.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">
            <button
              onClick={() => scrollTo("servicios")}
              className="boton-principal w-full gap-2 sm:w-auto"
            >
              Ver servicios disponibles
              <ChevronRight size={17} />
            </button>

            <button
              onClick={() => scrollTo("disponibilidad")}
              className="boton-secundario w-full sm:w-auto"
            >
              Consultar disponibilidad
            </button>
          </div>

          <div className="mt-10 grid grid-cols-3 gap-3 border-t border-slate-200 pt-6 text-center md:max-w-xl md:text-left">
            <div>
              <Shield
                size={18}
                className="mx-auto mb-2 text-sky-600 md:mx-0"
              />

              <p className="text-xs font-medium text-slate-700">
                Identidad verificable
              </p>
            </div>

            <div>
              <Video
                size={18}
                className="mx-auto mb-2 text-orange-500 md:mx-0"
              />

              <p className="text-xs font-medium text-slate-700">
                Contacto previo
              </p>
            </div>

            <div>
              <MessageCircle
                size={18}
                className="mx-auto mb-2 text-emerald-600 md:mx-0"
              />

              <p className="text-xs font-medium text-slate-700">
                Seguimiento durante la estancia
              </p>
            </div>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-4 rounded-[2rem] border border-slate-200 bg-sky-200/40 blur-2xl" />

          <div className="relative overflow-hidden rounded-[2rem] bg-white p-3 shadow-suave">
            {CONFIG.imagenes.perfil ? (
              <img
                src={CONFIG.imagenes.perfil}
                alt="Andrés Trotamundos"
                className="aspect-[4/5] w-full rounded-[1.5rem] object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center rounded-[1.5rem] bg-gradient-to-br from-sky-100 via-orange-50 to-emerald-100">
                <div className="text-center">
                  <Dog
                    size={70}
                    strokeWidth={1.4}
                    className="mx-auto text-sky-600"
                  />

                  <p className="mt-4 text-sm font-medium text-slate-600">
                    Foto principal
                  </p>

                  
                </div>
              </div>
            )}
          </div>

          <div className="absolute -bottom-5 -left-4 rounded-2xl border border-orange-200 bg-white px-4 py-3 shadow-suave">
            
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;