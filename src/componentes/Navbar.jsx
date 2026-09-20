import { CONFIG } from "../datos/config";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] =
    useState(false);

  const [isScrolled, setIsScrolled] =
    useState(false);

  /* DETECTAR SCROLL */

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();

    window.addEventListener(
      "scroll",
      handleScroll
    );

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, []);

  /* CERRAR MENÚ AL CAMBIAR DE PÁGINA */

  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  /* IR AL INICIO */

  const irAInicio = () => {
    setIsMenuOpen(false);

    if (location.pathname === "/") {
      document
        .getElementById("inicio")
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    navigate("/", {
      state: {
        scrollTo: "inicio",
      },
    });
  };

  /* IR A TIENDA */

  const irAMiTienda = () => {
    setIsMenuOpen(false);
    navigate("/tienda");
  };

  /* IR A CONTACTO */

  const irAContacto = () => {
    setIsMenuOpen(false);

    if (location.pathname === "/") {
      document
        .getElementById("contacto")
        ?.scrollIntoView({
          behavior: "smooth",
        });

      return;
    }

    navigate("/", {
      state: {
        scrollTo: "contacto",
      },
    });
  };

  const enlaces = [
    {
      label: "Inicio",
      onClick: irAInicio,
    },
    {
      label: "Tienda",
      onClick: irAMiTienda,
    },
    {
      label: "Contacto",
      onClick: irAContacto,
    },
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled ||
        location.pathname !== "/"
          ? "border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      {/* BARRA PRINCIPAL */}

      <div className="contenedor relative flex items-center justify-between px-5 py-3">
        {/* MARCA */}

        <button
          type="button"
          onClick={irAInicio}
          className="flex items-center gap-3"
        >
          <img
            src={CONFIG.imagenes.logo}
            alt={`Logo de ${CONFIG.marca.nombre}`}
            className="h-12 w-12 shrink-0 rounded-full object-cover"
          />

          <div className="ml-10 flex flex-col items-start text-left">
            <p className="whitespace-nowrap text-sm font-medium leading-tight tracking-tight text-slate-900 sm:text-base">
              {CONFIG.marca.nombre}
            </p>

            <p className="mt-1 whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-[0.12em] text-slate-500 sm:text-[10px] sm:tracking-[0.16em]">
              {CONFIG.marca.lema}
            </p>
          </div>
        </button>

        {/* NAVEGACIÓN ESCRITORIO */}

        <nav className="absolute left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 md:flex">
          {enlaces.map((enlace) => (
            <button
              key={enlace.label}
              type="button"
              onClick={enlace.onClick}
              className="px-4 py-1 text-center text-xs font-medium text-slate-600 transition hover:text-sky-600"
            >
              {enlace.label}
            </button>
          ))}
        </nav>

        {/* MENÚ HAMBURGUESA */}

        <button
          type="button"
          onClick={() =>
            setIsMenuOpen(
              (actual) => !actual
            )
          }
          className="shrink-0 rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
          aria-label={
            isMenuOpen
              ? "Cerrar menú"
              : "Abrir menú"
          }
        >
          {isMenuOpen ? (
            <X size={23} />
          ) : (
            <Menu size={23} />
          )}
        </button>
      </div>

      {/* MENÚ MÓVIL */}

      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white shadow-xl md:hidden">
          <nav className="contenedor flex flex-col items-center px-5 py-5">
            {enlaces.map((enlace) => (
              <button
                key={enlace.label}
                type="button"
                onClick={enlace.onClick}
                className="w-full max-w-[240px] rounded-xl px-4 py-3 text-center text-sm font-medium text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
              >
                {enlace.label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;