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
            
        </div>
      </div>
    </section>
  );
};

export default Galeria;