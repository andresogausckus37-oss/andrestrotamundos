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

import PagoExitoso from "./paginas/PagoExitoso";
import PagoPendiente from "./paginas/PagoPendiente";
import PagoFallido from "./paginas/PagoFallido";
import Checkout from "./paginas/Checkout";

import LoginAdmin from "./paginas/LoginAdmin";
import Admin from "./paginas/Admin";
import AdminRedes from "./paginas/admin/AdminRedes";
import AdminNuevoProducto from "./paginas/admin/AdminNuevoProducto";
import AdminProductos from "./paginas/admin/AdminProductos";
import AdminEditarProducto from "./paginas/admin/AdminEditarProducto";

/* =========================
   REGISTRAR NUEVA VISITA
========================= */

const RegistrarVisita = () => {
  const location = useLocation();

  useEffect(() => {
    const ruta = location.pathname;

    /* NO REGISTRAR ADMIN */

    if (ruta.startsWith("/admin")) {
      return;
    }

    /* UNA SOLA VEZ POR SESIÓN */

    if (
      sessionStorage.getItem(
        "visita_notificada"
      )
    ) {
      return;
    }

    let pagina = ruta;

    if (ruta === "/") {
      pagina = "Inicio";
    } else if (ruta === "/tienda") {
      pagina = "Tienda";
    } else if (
      ruta.startsWith("/tienda/")
    ) {
      pagina = "Detalle de producto";
    } else if (
      ruta.startsWith("/checkout/")
    ) {
      pagina = "Checkout";
    } else if (
      ruta.startsWith("/pago/")
    ) {
      pagina = "Pago";
    } else if (
      ruta === "/recomendados"
    ) {
      pagina = "Recomendados";
    }

    /* MARCAR ANTES DEL FETCH PARA
       EVITAR NOTIFICACIONES DUPLICADAS */

    sessionStorage.setItem(
      "visita_notificada",
      "true"
    );

    fetch("/api/visitas", {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify({
        pagina,
        ruta,
      }),
    }).catch((error) => {
      console.error(
        "Error registrando visita:",
        error
      );
    });
  }, [location.pathname]);

  return null;
};

/* =========================
   SCROLL ARRIBA
========================= */

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
  }, [location.pathname, location.state]);

  return null;
};

/* =========================
   HOME
========================= */

const Home = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const scrollTo = (id) => {
    document
      .getElementById(id)
      ?.scrollIntoView({
        behavior: "smooth",
      });
  };

  useEffect(() => {
    const seccion =
      location.state?.scrollTo;

    if (!seccion) {
      return;
    }

    requestAnimationFrame(() => {
      document
        .getElementById(seccion)
        ?.scrollIntoView({
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

/* =========================
   CONTENIDO GLOBAL
========================= */

const ContenidoApp = () => {
  const location = useLocation();

  const esHome =
    location.pathname === "/";

  return (
    <>
      <RegistrarVisita />

      <Navbar />

      <ScrollToTop />

      <div
        className={
          esHome ? "" : "pt-20"
        }
      >
        <Routes>
          <Route
            path="/"
            element={<Home />}
          />

          <Route
            path="/tienda"
            element={<Tienda />}
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
            path="/pago/exitoso"
            element={<PagoExitoso />}
          />

          <Route
            path="/pago/pendiente"
            element={<PagoPendiente />}
          />

          <Route
            path="/pago/fallido"
            element={<PagoFallido />}
          />

          <Route
            path="/recomendados"
            element={<Recomendados />}
          />

          <Route
            path="/admin/login"
            element={<LoginAdmin />}
          />

          <Route
            path="/admin"
            element={<Admin />}
          />

          <Route
            path="/admin/redes"
            element={<AdminRedes />}
          />

          <Route
            path="/admin/productos"
            element={<AdminProductos />}
          />

          <Route
            path="/admin/productos/nuevo"
            element={<AdminNuevoProducto />}
          />

          <Route
            path="/admin/productos/editar/:id"
            element={<AdminEditarProducto />}
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