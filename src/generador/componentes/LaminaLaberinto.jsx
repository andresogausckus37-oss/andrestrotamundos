import Laberinto from "../juegos/Laberinto";
import {
  IMAGENES_LABERINTOS,
  obtenerAventuraLaberinto,
} from "../productos/aventurasLaberintos";

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
};

export default function LaminaLaberinto({
  numero = 1,
  nivel = "facil",
  filas = 8,
  columnas = 6,
  semilla = 1,
  mostrarSolucion = false,
}) {
  const aventura =
    obtenerAventuraLaberinto(numero - 1);

  const configuracionNivel =
    COLORES_NIVEL[nivel] ||
    COLORES_NIVEL.facil;

  const imagenPersonaje =
    IMAGENES_LABERINTOS.personajes[
      aventura.personaje
    ];

  const imagenObjeto =
    IMAGENES_LABERINTOS.objetos[
      aventura.objeto
    ];

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
      }}
    >
      {/* ENCABEZADO DEL DESAFÍO */}
      <div
        style={{
          position: "absolute",
          top: "-122px",
          left: "0",
          right: "0",
          height: "110px",
        }}
      >
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
              fontFamily:
                '"Patrick Hand", cursive',
              fontSize: "18px",
              fontWeight: 700,
              color: "#64748B",
            }}
          >
            DESAFÍO {String(numero).padStart(2, "0")}
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

              fontFamily:
                '"Patrick Hand", cursive',

              fontSize: "16px",
              fontWeight: 700,
            }}
          >
            {configuracionNivel.etiqueta}
          </div>
        </div>

        <div
          style={{
            fontFamily:
              '"Chewy", cursive',

            fontSize: "36px",
            lineHeight: 1.05,

            color:
              aventura.personaje === "toby"
                ? "#0F7490"
                : "#DB5685",
          }}
        >
          {aventura.titulo}
        </div>

        <div
          style={{
            marginTop: "6px",

            fontFamily:
              '"Patrick Hand", cursive',

            fontSize: "21px",
            lineHeight: 1.2,

            color: "#334155",
          }}
        >
          {mostrarSolucion
            ? "Seguí el camino marcado para comprobar la solución."
            : aventura.instrucciones}
        </div>
      </div>

      {/* ZONA DEL JUEGO */}
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {/* PERSONAJE */}
        <div
          style={{
            position: "absolute",
            left: "-40px",
            top: "28px",

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
              alt={
                aventura.personaje === "toby"
                  ? "Toby"
                  : "Luna"
              }
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
              {aventura.personaje === "toby"
                ? "🐶"
                : "🐱"}
            </div>
          )}

          <div
            style={{
              position: "absolute",
              right: "-28px",
              top: "48px",

              fontSize: "34px",
              color: "#22C55E",

              fontWeight: 900,
            }}
          >
            →
          </div>
        </div>

        {/* LABERINTO */}
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
            mostrarSolucion={mostrarSolucion}
          />
        </div>

        {/* OBJETO FINAL */}
        <div
          style={{
            position: "absolute",
            right: "-25px",
            bottom: "35px",

            width: "105px",
            height: "110px",

            zIndex: 20,

            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: "-30px",
              top: "35px",

              fontSize: "34px",
              color: "#22C55E",
              fontWeight: 900,
            }}
          >
            →
          </div>

          {imagenObjeto ? (
            <img
              src={imagenObjeto}
              alt={aventura.objeto}
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
                fontSize: "62px",
              }}
            >
              {obtenerEmojiObjeto(
                aventura.objeto
              )}
            </div>
          )}
        </div>
      </div>

{/* DECORACIÓN INFERIOR */}
<div
  style={{
    position: "absolute",
    left: "0",
    right: "0",
    bottom: "-18px",

    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",

    fontFamily:
      '"Patrick Hand", cursive',

    fontSize: "17px",
    color: "#64748B",
  }}
>
  <span
    style={{
      fontSize: "27px",
      opacity: 0.7,
      letterSpacing: "6px",
      transform: "rotate(-8deg)",
    }}
  >
    🐾 🐾 🐾
  </span>

  <span>
    Pequeños desafíos · Grandes aventuras
  </span>

      <span
        style={{
          fontSize: "27px",
          opacity: 0.7,
          letterSpacing: "6px",
          transform: "rotate(8deg)",
        }}
      >
        🐾 🐾 🐾
      </span>
      </div>
      </div>
      );
      }

      function obtenerEmojiObjeto(objeto) {
        const emojis = {
          pelota: "🏀",
          ovillo: "🧶",
          hueso: "🦴",
          comida: "🥣",
          frisbee: "🥏",
          pescado: "🐟",
        };

        return emojis[objeto] || "⭐";
      }