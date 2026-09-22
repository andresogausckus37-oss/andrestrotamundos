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
import ComoFunciona from "./componentes/ComoFunciona";
import Resenas from "./componentes/Resenas";
import Disponibilidad from "./componentes/Disponibilidad";
import SobreMi from "./componentes/SobreMi";
import Footer from "./componentes/Footer";
import WhatsAppFlotante from "./componentes/WhatsAppFlotante";

import Tienda from "./paginas/Tienda";
import DetalleProducto from "./paginas/DetalleProducto";
import Recomendados from "./paginas/Recomendados";
import GeneradorPdf from "./paginas/GeneradorPdf";
import Digitales from "./paginas/Digitales";
import GeneradorLaminas from "./paginas/GeneradorLaminas";
import OptimizadorImagenes from "./paginas/OptimizadorImagenes";
import PagoExitoso from "./paginas/PagoExitoso";
import PagoPendiente from "./paginas/PagoPendiente";
import PagoFallido from "./paginas/PagoFallido";
import Checkout from "./paginas/Checkout";

/* SCROLL ARRIBA AL CAMBIAR DE PÁGINA */
const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
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

    navigate("/", {
      replace: true,
      state: null,
    });
  }, [location.state, navigate]);

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Hero scrollTo={scrollTo} />

      <Servicios />

      <ComoFunciona />

      <Resenas />

      <Disponibilidad />

      <SobreMi />

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
      <Navbar />

      <ScrollToTop />

      <div className={esHome ? "" : "pt-20"}>
        <Routes>
          <Route path="/" element={<Home />} />

          <Route path="/tienda" element={<Tienda />} />

          <Route path="/pago/exitoso" element={<PagoExitoso />} />
<Route path="/pago/pendiente" element={<PagoPendiente />} />
<Route path="/pago/fallido" element={<PagoFallido />} />

          <Route
            path="/recomendados"
            element={<Recomendados />}
          />

          <Route
            path="/generador-pdf"
            element={<GeneradorPdf />}
          />

          <Route
            path="/tienda/digitales"
            element={<Digitales />}
          />

          <Route
            path="/tienda/:id"
            element={<DetalleProducto />}
          />

          <Route
  path="/checkout/:id"
  element={<Checkout />}
/>

          <Route
            path="/generador-laminas"
            element={<GeneradorLaminas />}
          />

          <Route
            path="/optimizador-imagenes"
            element={<OptimizadorImagenes />}
          />
        </Routes>

        <Footer />
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