import Laberinto from "../juegos/Laberinto";

import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

/* =========================================================
   CONFIGURACIÓN VISUAL DE NIVELES
========================================================= */

const COLORES_NIVEL = {
  facil: {
    fondo: "#DCFCE7",
    texto: "#166534",
    borde: "#86EFAC",
    etiqueta: "NIVEL FÁCIL",
  },

  medio: {
    fondo: "#FEF3C7",
    texto: "#92400E",
    borde: "#FCD34D",
    etiqueta: "NIVEL MEDIO",
  },

  dificil: {
    fondo: "#FEE2E2",
    texto: "#991B1B",
    borde: "#FCA5A5",
    etiqueta: "NIVEL DIFÍCIL",
  },

  experto: {
    fondo: "#DBEAFE",
    texto: "#1E40AF",
    borde: "#93C5FD",
    etiqueta: "NIVEL EXPERTO",
  },

  legendario: {
    fondo: "#FCE7F3",
    texto: "#9D174D",
    borde: "#F9A8D4",
    etiqueta: "NIVEL LEGENDARIO",
  },
};

/* =========================================================
   LÁMINA DE LABERINTO
========================================================= */

export default function LaminaLaberinto({
  numero = 1,
  nivel = "facil",
  filas = 8,
  columnas = 6,
  semilla = 1,
  mostrarSolucion = false,
}) {
  const configuracionNivel =
    COLORES_NIVEL[nivel] ||
    COLORES_NIVEL.facil;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        fontFamily:
          ESTILOS_IMPRIMIBLES.tipografia
            .principal,
      }}
    >
      {/* =====================================================
          ENCABEZADO
      ====================================================== */}

      <div
        style={{
          position: "absolute",
          top: "-122px",
          left: 0,
          right: 0,
          height: "110px",
        }}
      >
        {/* DESAFÍO + NIVEL */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <div
            style={{
              fontSize: "18px",
              fontWeight: 700,
              color: "#64748B",
            }}
          >
            DESAFÍO{" "}
            {String(numero).padStart(
              2,
              "0"
            )}
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "6px 12px",
              borderRadius: "999px",
              background:
                configuracionNivel.fondo,
              border: `2px solid ${configuracionNivel.borde}`,
              color:
                configuracionNivel.texto,
              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            {configuracionNivel.etiqueta}
          </div>
        </div>
      </div>

      {/* =====================================================
          ZONA DEL JUEGO
      ====================================================== */}

      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {/* ===================================================
            FLECHA DE ENTRADA
        ==================================================== */}

        <div
          style={{
            position: "absolute",
            left: "5px",
            top: "78px",
            zIndex: 20,
            fontSize: "34px",
            lineHeight: 1,
            color: "#000000",
            fontWeight: 900,
          }}
        >
          →
        </div>

        {/* ===================================================
            LABERINTO
        ==================================================== */}

        <div
          style={{
            position: "absolute",
            top: "40px",
            left: "45px",
            right: "45px",
            bottom: "75px",
          }}
        >
          <Laberinto
            filas={filas}
            columnas={columnas}
            semilla={semilla}
            mostrarSolucion={
              mostrarSolucion
            }
          />
        </div>

        {/* ===================================================
            FLECHA DE SALIDA
        ==================================================== */}

        <div
          style={{
            position: "absolute",
            right: "5px",
            bottom: "130px",
            zIndex: 20,
            fontSize: "34px",
            lineHeight: 1,
            color: "#000000",
            fontWeight: 900,
          }}
        >
          →
        </div>
      </div>
    </div>
  );
}