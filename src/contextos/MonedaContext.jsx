import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

const MonedaContext = createContext();

const MONEDAS_VALIDAS = ["ARS", "USD", "EUR"];

function detectarMonedaInicial() {
  const monedaGuardada =
    localStorage.getItem("moneda");

  if (MONEDAS_VALIDAS.includes(monedaGuardada)) {
    return monedaGuardada;
  }

  return "ARS";
}

export function MonedaProvider({ children }) {
  const [moneda, setMoneda] = useState(
    detectarMonedaInicial
  );

  const [cotizaciones, setCotizaciones] =
    useState({
      dolarCompra: null,
      usdEur: null,
    });

  const [cargandoCotizaciones, setCargandoCotizaciones] =
    useState(true);

  useEffect(() => {
    async function obtenerCotizaciones() {
      try {
        const [respuestaDolar, respuestaEuro] =
          await Promise.all([
            fetch(
              "https://dolarapi.com/v1/dolares/oficial"
            ),
            fetch(
              "https://api.frankfurter.dev/v2/rate/USD/EUR?providers=ecb"
            ),
          ]);

        if (
          !respuestaDolar.ok ||
          !respuestaEuro.ok
        ) {
          throw new Error(
            "No se pudieron obtener las cotizaciones"
          );
        }

        const dolar =
          await respuestaDolar.json();

        const euro =
          await respuestaEuro.json();

        setCotizaciones({
          dolarCompra: Number(dolar.compra),
          usdEur: Number(euro.rate),
        });
      } catch (error) {
        console.error(
          "Error obteniendo cotizaciones:",
          error
        );
      } finally {
        setCargandoCotizaciones(false);
      }
    }

    obtenerCotizaciones();
  }, []);

  useEffect(() => {
    localStorage.setItem("moneda", moneda);
  }, [moneda]);

  const cambiarMoneda = (nuevaMoneda) => {
    if (MONEDAS_VALIDAS.includes(nuevaMoneda)) {
      setMoneda(nuevaMoneda);
    }
  };

  return (
    <MonedaContext.Provider
      value={{
        moneda,
        cambiarMoneda,
        cotizaciones,
        cargandoCotizaciones,
      }}
    >
      {children}
    </MonedaContext.Provider>
  );
}

export function useMoneda() {
  const contexto = useContext(MonedaContext);

  if (!contexto) {
    throw new Error(
      "useMoneda debe utilizarse dentro de MonedaProvider"
    );
  }

  return contexto;
}