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
          ? "border-b border-[#E5E2DA] bg-[#FFFEFC]/95 backdrop-blur-xl"
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
            <p className="whitespace-nowrap text-sm font-medium leading-tight tracking-tight text-[#26352F] sm:text-base">
              {CONFIG.marca.nombre}
            </p>

            <p className="mt-1 whitespace-nowrap text-[9px] font-medium uppercase leading-none tracking-[0.12em] text-[#7B8680] sm:text-[10px] sm:tracking-[0.16em]">
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
              className="relative px-4 py-1 text-center text-xs font-medium text-[#66736D] transition-colors duration-200 hover:text-[#3F6655]"
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-[#3F6655] transition hover:bg-[#E8F0EA] md:hidden"
          aria-label={
            isMenuOpen
              ? "Cerrar menú"
              : "Abrir menú"
          }
        >
          {isMenuOpen ? (
            <X
              size={21}
              strokeWidth={1.7}
            />
          ) : (
            <Menu
              size={21}
              strokeWidth={1.7}
            />
          )}
        </button>
      </div>

      {/* MENÚ MÓVIL */}

      {isMenuOpen && (
        <div className="border-t border-[#E5E2DA] bg-[#FFFEFC] md:hidden">
          <nav className="contenedor flex flex-col items-center px-5 py-4">
            {enlaces.map(
              (enlace, index) => (
                <button
                  key={enlace.label}
                  type="button"
                  onClick={enlace.onClick}
                  className={`w-full max-w-[240px] rounded-md px-4 py-2.5 text-center text-[13px] font-medium text-[#66736D] transition hover:bg-[#F1F5EF] hover:text-[#3F6655] ${
                    index <
                    enlaces.length - 1
                      ? "border-b border-[#EEEAE4]"
                      : ""
                  }`}
                >
                  {enlace.label}
                </button>
              )
            )}

            {/* DETALLE */}

            <div className="mt-3 flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-[#C9785C]" />

              <span className="text-[9px] font-medium uppercase tracking-[0.14em] text-[#8A948F]">
                Cuidado responsable
              </span>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;