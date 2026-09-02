import { CONFIG } from "../datos/config";
import {
  MessageCircle,
  MapPin,
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-slate-900 px-5 py-14 text-white">
      <div className="contenedor">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img
  src={CONFIG.imagenes.logo}
  alt={`Logo de ${CONFIG.marca.nombre}`}
  className="h-10 w-10 rounded-full object-cover"
/>

              <div>
                <p className="font-semibold">
                  {CONFIG.marca.nombre}
                </p>

                <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  {CONFIG.marca.lema}
                </p>
              </div>
            </div>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Cuidado responsable de hogares y mascotas con acuerdos claros,
              comunicación y confianza.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Navegación
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <a
                href="#servicios"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Servicios
              </a>

              <a
                href="#mi-proceso"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Cómo funciona
              </a>

              <a
                href="#galeria"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Experiencias
              </a>

              <a
                href="#resenas"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Reseñas
              </a>

              <a
                href="#disponibilidad"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Disponibilidad
              </a>

              <a
                href="#sobre-mi"
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Sobre mí
              </a>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold">
              Contacto
            </h3>

            <div className="mt-4 space-y-3 text-sm text-slate-400">
              <a
                href={`https://wa.me/${CONFIG.contacto.whatsapp}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 transition hover:text-white"
              >
                <MessageCircle size={16} />
                {CONFIG.contacto.whatsappVisible}
              </a>

              <p className="flex items-center gap-2">
                <MapPin size={16} />
                {CONFIG.ubicacion.pais}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © 2026 {CONFIG.marca.nombre}. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
};

export default Footer;