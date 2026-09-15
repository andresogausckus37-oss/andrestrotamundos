import Laberinto from "../juegos/Laberinto";

import {
  IMAGENES_LABERINTOS,
  PERSONAJES_LABERINTOS,
  TEMATICAS_LABERINTOS,
  obtenerAventuraLaberinto,
} from "../productos/aventurasLaberintos";

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
  publico,
  edad,
  tematica,
  personaje = "automatico",
  modoPersonaje = "rotativo",
  objetivo = "automatico",
  modoObjetivo = "rotativo",
  mostrarSolucion = false,
}) {
  /* =======================================================
     AVENTURA
  ======================================================== */

  const aventura = obtenerAventuraLaberinto(
    numero - 1,
    tematica,
    {
      personajeSeleccionado: personaje,
      modoPersonaje,

      objetivoSeleccionado: objetivo,
      modoObjetivo,

      semilla,
    }
  );

  /* =======================================================
     IDENTIDAD VISUAL DE LA TEMÁTICA
  ======================================================== */

  const configuracionTematica =
    TEMATICAS_LABERINTOS[tematica] ||
    TEMATICAS_LABERINTOS.mascotas;

  const colorTematicaPrincipal =
    configuracionTematica.colorPrincipal ||
    "#0F7490";

  const colorTematicaTexto =
    configuracionTematica.colorTexto ||
    "#155E75";

  /* =======================================================
     NIVEL
  ======================================================== */

  const configuracionNivel =
    COLORES_NIVEL[nivel] ||
    COLORES_NIVEL.facil;

  /* =======================================================
     PERSONAJE
  ======================================================== */

  const configuracionPersonaje =
    PERSONAJES_LABERINTOS[
      aventura.personaje
    ] || {
      nombre:
        aventura.nombrePersonaje ||
        "Aventurero",

      imagen: "",

      emoji:
        aventura.emojiPersonaje ||
        "🙂",

      color:
        aventura.colorPersonaje ||
        "#0F7490",
    };

  const imagenPersonaje =
    configuracionPersonaje.assets
      ?.principal ||
    configuracionPersonaje.imagen ||
    IMAGENES_LABERINTOS.personajes[
      aventura.personaje
    ] ||
    "";

  const nombrePersonaje =
    aventura.nombrePersonaje ||
    configuracionPersonaje.nombre;

  const emojiPersonaje =
    aventura.emojiPersonaje ||
    configuracionPersonaje.emoji ||
    "🙂";

  /* =======================================================
     OBJETO
  ======================================================== */

  const imagenObjeto =
    IMAGENES_LABERINTOS.objetos[
      aventura.objeto
    ] || "";

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
            marginBottom: "5px",
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

        {/* TÍTULO */}

        <div
          style={{
            fontSize: "36px",
            fontWeight: 700,
            lineHeight: 1.05,

            color:
              colorTematicaPrincipal,
          }}
        >
          {aventura.titulo}
        </div>

        {/* INSTRUCCIONES */}

        <div
          style={{
            marginTop: "6px",

            fontSize: "19px",
            fontWeight: 400,
            lineHeight: 1.2,

            color:
              colorTematicaTexto,
          }}
        >
          {mostrarSolucion
            ? "Seguí el camino marcado para comprobar la solución."
            : aventura.instrucciones}
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
            PERSONAJE INICIAL
        ==================================================== */}

        <div
          style={{
            position: "absolute",

            left: "-50px",
            top: "40px",

            width: "105px",
            height: "120px",

            zIndex: 20,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {imagenPersonaje ? (
            <img
              src={imagenPersonaje}
              alt={nombrePersonaje}
              draggable="false"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          ) : (
            <div
              style={{
                fontSize: "70px",
              }}
            >
              {emojiPersonaje}
            </div>
          )}

          {/* FLECHA DE ENTRADA */}

          <div
            style={{
              position: "absolute",

              right: "-28px",
              top: "38px",

              fontSize: "34px",
              color: "#22C55E",
              fontWeight: 900,
            }}
          >
            →
          </div>
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
            OBJETO FINAL
        ==================================================== */}

        <div
          style={{
            position: "absolute",

            right: "-45px",
            bottom: "45px",

            width: "105px",
            height: "210px",

            zIndex: 20,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* FLECHA DE SALIDA */}

          <div
            style={{
              position: "absolute",

              left: "-30px",
              top: "85px",

              fontSize: "34px",
              color: "#22C55E",
              fontWeight: 900,
            }}
          >
            →
          </div>

          {imagenObjeto && (
            <img
              src={imagenObjeto}
              alt={aventura.objeto}
              draggable="false"
              style={{
                width: "70%",
                height: "70%",
                objectFit: "contain",
              }}
            />
          )}
        </div>
      </div>

      {/* =====================================================
          TEXTO INFERIOR
      ====================================================== */}

      <div
        style={{
          position: "absolute",

          left: 0,
          right: 0,
          bottom: "-18px",

          display: "flex",
          justifyContent: "center",
          alignItems: "center",

          fontFamily:
            ESTILOS_IMPRIMIBLES.tipografia
              .principal,

          fontSize: "17px",
          fontWeight: 400,

          color:
            colorTematicaTexto,
        }}
      >
        Pequeños desafíos · Grandes aventuras
      </div>
    </div>
  );
}