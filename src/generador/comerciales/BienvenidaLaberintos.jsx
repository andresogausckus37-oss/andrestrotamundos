import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

const NIVELES = [
  {
    id: "facil",
    nombre: "FÁCIL",
    fondo: "#DCFCE7",
    color: "#166534",
    borde: "#86EFAC",
  },
  {
    id: "medio",
    nombre: "MEDIO",
    fondo: "#FEF3C7",
    color: "#92400E",
    borde: "#FCD34D",
  },
  {
    id: "dificil",
    nombre: "DIFÍCIL",
    fondo: "#FEE2E2",
    color: "#991B1B",
    borde: "#FCA5A5",
  },
  {
    id: "experto",
    nombre: "EXPERTO",
    fondo: "#DBEAFE",
    color: "#1E40AF",
    borde: "#93C5FD",
  },
  {
    id: "legendario",
    nombre: "LEGENDARIO",
    fondo: "#FCE7F3",
    color: "#9D174D",
    borde: "#F9A8D4",
  },
];

const BENEFICIOS = [
  "Favorecen la concentración y la atención",
  "Estimulan el razonamiento lógico",
  "Ayudan a desarrollar la resolución de problemas",
  "Fortalecen la orientación y percepción visual",
  "Promueven la paciencia y la perseverancia",
];

export default function BienvenidaLaberintos({
  faciles = 0,
  medios = 0,
  dificiles = 0,
  expertos = 0,
  legendarios = 0,
}) {
  const { logo, pagina, tipografia } =
    ESTILOS_IMPRIMIBLES;

  const cantidades = {
    facil: faciles,
    medio: medios,
    dificil: dificiles,
    experto: expertos,
    legendario: legendarios,
  };

  const nivelesActivos = NIVELES.filter(
    (nivel) => cantidades[nivel.id] > 0
  );

  return (
    <div
      style={{
        position: "relative",
        width: `${pagina.ancho}px`,
        height: `${pagina.alto}px`,
        overflow: "hidden",

        background:
          "white",

        fontFamily:
          tipografia.principal,

        padding: "85px 70px",
        boxSizing: "border-box",
      }}
    >
      {/* LOGO */}

      <img
        src={logo.url}
        alt="Andrés Imprimibles"
        draggable="false"
        style={{
          position: "absolute",
          top: `${logo.top}px`,
          right: `${logo.right}px`,
          width: `${logo.ancho}px`,
          height: "auto",
          objectFit: "contain",
        }}
      />

      {/* TÍTULO */}

      <div
        style={{
          textAlign: "center",
          marginTop: "55px",
        }}
      >
        <div
          style={{
            fontSize: "47px",
            fontWeight: 500,
            color: "#0F7490",
            lineHeight: 1.1,
          }}
        >
          ¡Tu aventura comienza aquí!
        </div>

        <div
          style={{
            maxWidth: "600px",
            margin: "22px auto 0",

            fontSize: "23px",
            lineHeight: 1.45,

            color: "#475569",
          }}
        >
          Prepárate para recorrer caminos,
          superar desafíos y ayudar a nuestros
          aventureros a encontrar su objetivo.
        </div>

        <div
          style={{
            maxWidth: "610px",
            margin: "22px auto 0",

            fontSize: "21px",
            lineHeight: 1.45,

            color: "#155E75",
          }}
        >
          A medida que avances, los laberintos
          aumentarán progresivamente su dificultad,
          incluso dentro de un mismo nivel.
        </div>
      </div>

      {/* NIVELES */}

      <div
        style={{
          marginTop: "55px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: "30px",
            fontWeight: 500,
            color: "#334155",
          }}
        >
          Estos son tus desafíos 💪
        </div>

        <div
          style={{
            marginTop: "25px",

            display: "flex",
            justifyContent: "center",
            alignItems: "center",

            flexWrap: "wrap",
            gap: "13px",
          }}
        >
          {nivelesActivos.map(
            (nivel, indice) => (
              <div
                key={nivel.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "13px",
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",

                    borderRadius: "999px",

                    background:
                      nivel.fondo,

                    border:
                      `2px solid ${nivel.borde}`,

                    color:
                      nivel.color,

                    fontSize: "18px",
                    fontWeight: 500,
                  }}
                >
                  {nivel.nombre}
                </div>

                {indice <
                  nivelesActivos.length -
                    1 && (
                  <span
                    style={{
                      fontSize: "26px",
                      fontWeight: 700,
                      color: "#0F7490",
                    }}
                  >
                    →
                  </span>
                )}
              </div>
            )
          )}
        </div>
      </div>

      

{/* CIERRE */}

<div
  style={{
    marginTop: "45px",

    textAlign: "center",

    fontSize: "25px",
    fontWeight: 500,
    lineHeight: 1.3,

    color: "#0F7490",
  }}
>
  Observá, pensá y encontrá el camino.
  ¡Comienza la aventura!
    </div>
          </div>
        );
      }
      