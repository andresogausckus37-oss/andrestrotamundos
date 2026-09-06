import { useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import Navbar from "./componentes/Navbar";
import Hero from "./componentes/Hero";
import Servicios from "./componentes/Servicios";
import TiendaDestacada from "./componentes/TiendaDestacada";
import ComoFunciona from "./componentes/ComoFunciona";
import Galeria from "./componentes/Galeria";
import Resenas from "./componentes/Resenas";
import Disponibilidad from "./componentes/Disponibilidad";
import SobreMi from "./componentes/SobreMi";
import Contacto from "./componentes/Contacto";
import Footer from "./componentes/Footer";
import WhatsAppFlotante from "./componentes/WhatsAppFlotante";

import Tienda from "./paginas/Tienda";
import DetalleProducto from "./paginas/DetalleProducto";
import Recomendados from "./paginas/Recomendados";
import GeneradorPdf from "./paginas/GeneradorPdf";

/* SCROLL ARRIBA AL CAMBIAR DE PÁGINA */
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    /* Si venimos hacia una sección concreta del Home,
       no hacemos scroll arriba */
    if (location.state?.scrollTo) {
      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, [location.pathname]);

  return null;
};

/* HOME */
const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
    });
  };

  /* CUANDO VENIMOS DESDE OTRA PÁGINA HACIA UNA SECCIÓN */
  useEffect(() => {
    const seccion = location.state?.scrollTo;

    if (!seccion) {
      return;
    }

    requestAnimationFrame(() => {
      document.getElementById(seccion)?.scrollIntoView({
        behavior: "smooth",
      });
    });

    /* Limpiamos el estado para que no vuelva a ejecutarse */
    navigate("/", {
      replace: true,
      state: null,
    });
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Hero scrollTo={scrollTo} />

      <Servicios />

      <TiendaDestacada
        verProducto={(id) => navigate(`/tienda/${id}`)}
      />

      <ComoFunciona />

      {/* <Galeria /> */}

      <Resenas />

      <Disponibilidad />

      <SobreMi />

      <Contacto />

      <Footer />

      <WhatsAppFlotante />
    </div>
  );
};

/* CONTENIDO GLOBAL */
const ContenidoApp = () => {
  const location = useLocation();

  const esHome = location.pathname === "/";

  return (
    <>
      {/* NAVBAR GLOBAL */}
      <Navbar />

      {/* SCROLL AUTOMÁTICO */}
      <ScrollToTop />

      {/* 
        En Home no agregamos espacio superior porque el Navbar
        queda sobre el Hero.

        En las demás páginas dejamos espacio para que el Navbar
        fijo no tape el contenido.
      */}
      <div className={esHome ? "" : "pt-20"}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/tienda" element={<Tienda />} />
          <Route path="/recomendados" element={<Recomendados />} />
          <Route
  path="/generador-pdf"
  element={<GeneradorPdf />}
/>

          <Route
            path="/tienda/:id"
            element={<DetalleProducto />}
            
          />
        </Routes>
      </div>
    </>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <ContenidoApp />
    </BrowserRouter>
  );
};

export default App;