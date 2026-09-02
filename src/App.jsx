import { useEffect, useState } from "react";

import Navbar from "./componentes/Navbar";
import Hero from "./componentes/Hero";
import Servicios from "./componentes/Servicios";
import ComoFunciona from "./componentes/ComoFunciona";
import Galeria from "./componentes/Galeria";
import Resenas from "./componentes/Resenas";
import Disponibilidad from "./componentes/Disponibilidad";
import SobreMi from "./componentes/SobreMi";
import Contacto from "./componentes/Contacto";
import Footer from "./componentes/Footer";
import WhatsAppFlotante from "./componentes/WhatsAppFlotante";

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });

    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar
        isMenuOpen={isMenuOpen}
        setIsMenuOpen={setIsMenuOpen}
        isScrolled={isScrolled}
        scrollTo={scrollTo}
        
      />

      <Hero scrollTo={scrollTo} />
<Servicios />
      <ComoFunciona />
      <Galeria />
      <Resenas />
      <Disponibilidad />
      <SobreMi />
      <Contacto />
      <Footer />
<WhatsAppFlotante />
    </div>
  );
}

export default App;