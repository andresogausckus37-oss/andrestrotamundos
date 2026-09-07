import { CONFIG } from "../datos/config";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const Navbar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const menuItems = [
    ["Inicio", "inicio"],
    ["Servicios", "servicios"],
    ["Tienda", "tienda"],
    ["Cómo funciona", "mi-proceso"],
    ["Experiencias", "galeria"],
    ["Reseñas", "resenas"],
    ["Disponibilidad", "disponibilidad"],
    ["Sobre mí", "sobre-mi"],
    ["Contacto", "contacto"],
  ];

  /* DETECTAR SCROLL */
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    handleScroll();

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  /* CERRAR MENÚ AL CAMBIAR DE PÁGINA */
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  /* IR A UNA SECCIÓN DEL HOME */
  const irASeccion = (id) => {
    setIsMenuOpen(false);

    /* Si ya estamos en Home */
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({
        behavior: "smooth",
      });

      return;
    }

    /* Si estamos en Tienda o Detalle */
    navigate("/", {
      state: {
        scrollTo: id,
      },
    });
  };

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled || location.pathname !== "/"
          ? "border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      {/* BARRA PRINCIPAL */}
      <div className="contenedor flex items-center justify-between px-5 py-3">
        {/* MARCA */}
        <button
          type="button"
          onClick={() => irASeccion("inicio")}
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
        <nav className="hidden items-center gap-6 text-xs font-medium md:flex">
          {menuItems.slice(0, 7).map(([label, id]) => (
            <button
              key={id}
              type="button"
              onClick={() => irASeccion(id)}
              className="text-slate-600 transition hover:text-sky-600"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* MENÚ HAMBURGUESA */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((actual) => !actual)}
          className="shrink-0 rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* MENÚ MÓVIL */}
      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white shadow-xl md:hidden">
          <nav className="contenedor grid grid-cols-3 gap-2 px-5 py-4">
            {menuItems.map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => irASeccion(id)}
                className="flex min-h-[48px] items-center justify-center rounded-xl bg-slate-50 px-2 py-2.5 text-center text-xs font-medium leading-4 text-slate-600 transition hover:bg-sky-50 hover:text-sky-700"
              >
                {label}
              </button>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;