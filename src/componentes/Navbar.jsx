import { CONFIG } from "../datos/config";
import { Menu, X } from "lucide-react";

const Navbar = ({
  isMenuOpen,
  setIsMenuOpen,
  isScrolled,
  scrollTo,
}) => {
  const menuItems = [
    ["Inicio", "inicio"],
    ["Servicios", "servicios"],
    ["Cómo funciona", "mi-proceso"],
    ["Experiencias", "galeria"],
    ["Reseñas", "resenas"],
    ["Disponibilidad", "disponibilidad"],
    ["Sobre mí", "sobre-mi"],
    ["Contacto", "contacto"],
  ];

  return (
    <header
      className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      {/* Barra principal */}

      <div className="contenedor flex items-center justify-between px-5 py-4">
        {/* Marca */}

        <button
          type="button"
          onClick={() => scrollTo("inicio")}
          className="flex items-center gap-3"
        >
          <img
  src={CONFIG.imagenes.logo}
  alt={`Logo de ${CONFIG.marca.nombre}`}
  className="h-12 w-12 rounded-full object-cover"
/>

          <div className="ml-14 text-left">
            <p className="text-sm font-semibold tracking-tight text-slate-900 sm:text-base">
              {CONFIG.marca.nombre}
            </p>

            <p className="hidden text-[10px] uppercase tracking-[0.18em] text-slate-500 sm:block">
              {CONFIG.marca.lema}
            </p>
          </div>
        </button>

        {/* Navegación escritorio */}

        <nav className="hidden items-center gap-6 text-xs font-medium md:flex">
          {menuItems.slice(0, 7).map(([label, id]) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollTo(id)}
              className="text-slate-600 transition hover:text-sky-600"
            >
              {label}
            </button>
          ))}
        </nav>

        {/* Hamburguesa */}

        <button
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="rounded-xl p-2 text-slate-700 transition hover:bg-slate-100 md:hidden"
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isMenuOpen ? <X size={23} /> : <Menu size={23} />}
        </button>
      </div>

      {/* Menú móvil */}

      {isMenuOpen && (
        <div className="border-t border-slate-200 bg-white shadow-xl md:hidden">
          <nav className="contenedor grid grid-cols-3 gap-2 px-5 py-4">
            {menuItems.map(([label, id]) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
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