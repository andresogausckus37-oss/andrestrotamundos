import { createContext, useContext, useEffect, useState } from "react";

const IdiomaContext = createContext();

function detectarIdiomaInicial() {
  const idiomaGuardado = localStorage.getItem("idioma");

  if (idiomaGuardado === "es" || idiomaGuardado === "en") {
    return idiomaGuardado;
  }

  const idiomaNavegador = navigator.language?.toLowerCase() || "en";

  return idiomaNavegador.startsWith("es") ? "es" : "en";
}

export function IdiomaProvider({ children }) {
  const [idioma, setIdioma] = useState(detectarIdiomaInicial);

  useEffect(() => {
    localStorage.setItem("idioma", idioma);
    document.documentElement.lang = idioma;
  }, [idioma]);

  const cambiarIdioma = (nuevoIdioma) => {
    if (nuevoIdioma === "es" || nuevoIdioma === "en") {
      setIdioma(nuevoIdioma);
    }
  };

  return (
    <IdiomaContext.Provider
      value={{
        idioma,
        cambiarIdioma,
      }}
    >
      {children}
    </IdiomaContext.Provider>
  );
}

export function useIdioma() {
  const contexto = useContext(IdiomaContext);

  if (!contexto) {
    throw new Error("useIdioma debe utilizarse dentro de IdiomaProvider");
  }

  return contexto;
}