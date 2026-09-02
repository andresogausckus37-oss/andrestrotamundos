import { Camera, MapPin, Heart } from "lucide-react";
import { galeria } from "../datos/galeria";

const Galeria = () => {
  return (
    <section id="galeria" className="seccion bg-white">
      <div className="contenedor">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow">
            Experiencias
          </p>

          <h2 className="titulo-seccion">
            Momentos y lugares compartidos
          </h2>

          <p className="subtitulo-seccion">
            Algunas experiencias compartidas durante viajes, cuidados y
            momentos con mascotas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
          {galeria.map((foto, index) => (
            <article
              key={`${foto.img}-${index}`}
              className={`group relative overflow-hidden rounded-2xl bg-slate-100 ${
                index === 0 || index === 2 ? "md:translate-y-6" : ""
              }`}
            >
              <img
                src={foto.img}
                alt={foto.alt}
                loading="lazy"
                className="aspect-[4/5] h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />

              <div className="absolute bottom-0 left-0 right-0 translate-y-3 p-4 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100">
                <div className="flex items-center gap-2 text-xs font-medium text-white">
                  <Camera size={15} />
                  Experiencias reales
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-sky-50 p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-100 text-sky-700">
              <MapPin size={19} />
            </div>

            <p className="text-sm font-semibold text-slate-900">
              Nuevos lugares
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Cada experiencia permite conocer nuevos hogares, ciudades y
              formas de vivir.
            </p>
          </div>

          <div className="rounded-2xl bg-orange-50 p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
              <Heart size={19} />
            </div>

            <p className="text-sm font-semibold text-slate-900">
              Cuidado personal
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Cada mascota tiene su personalidad, sus hábitos y su propia
              rutina.
            </p>
          </div>

          <div className="rounded-2xl bg-emerald-50 p-5">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Camera size={19} />
            </div>

            <p className="text-sm font-semibold text-slate-900">
              Recuerdos compartidos
            </p>

            <p className="mt-2 text-xs leading-5 text-slate-600">
              Durante las estancias podemos mantener contacto mediante fotos y
              novedades.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Galeria;