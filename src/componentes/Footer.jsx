import { CONFIG } from "../datos/config";
import {
  MessageCircle,
  MapPin,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useIdioma } from "../contextos/IdiomaContext";
import { traducciones } from "../datos/traducciones";

const Footer = () => {
  const navigate = useNavigate();

  const { idioma } = useIdioma();
  const t = traducciones[idioma].footer;

  const irASeccion = (id) => {
    if (window.location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
      });

      return;
    }

    navigate(`/#${id}`);
  };

  const irATienda = () => {
    navigate("/tienda");
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <footer className="bg-slate-900 px-5 py-14 text-white">
      <div className="contenedor">
        <div className="grid gap-10 md:grid-cols-3">
          {/* Marca */}

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
              {t.descripcion}
            </p>
          </div>

          {/* Navegación */}

          <div>
            <h3 className="text-sm font-semibold">
              {t.navegacion}
            </h3>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
              <button
                type="button"
                onClick={() => irASeccion("servicios")}
                className="text-left text-sm text-slate-400 transition hover:text-white"
              >
                {t.servicios}
              </button>

              <button
                type="button"
                onClick={() => irASeccion("mi-proceso")}
                className="text-left text-sm text-slate-400 transition hover:text-white"
              >
                {t.comoFunciona}
              </button>

              <button
                type="button"
                onClick={() => irASeccion("resenas")}
                className="text-left text-sm text-slate-400 transition hover:text-white"
              >
                {t.resenas}
              </button>

              <button
                type="button"
                onClick={() => irASeccion("disponibilidad")}
                className="text-left text-sm text-slate-400 transition hover:text-white"
              >
                {t.disponibilidad}
              </button>

              <button
                type="button"
                onClick={() => irASeccion("sobre-mi")}
                className="text-left text-sm text-slate-400 transition hover:text-white"
              >
                {t.sobreMi}
              </button>

              <button
                type="button"
                onClick={irATienda}
                className="text-left text-sm text-slate-400 transition hover:text-white"
              >
                {t.tienda}
              </button>
            </div>
          </div>

          {/* Contacto */}

          <div>
            <h3 className="text-sm font-semibold">
              {t.contacto}
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

        {/* Copyright */}

        <div className="mt-10 border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} {CONFIG.marca.nombre}. {t.derechos}
        </div>
      </div>
    </footer>
  );
};

export default Footer;