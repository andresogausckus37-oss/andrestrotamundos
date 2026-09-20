import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

const BENEFICIOS = [
  "Estimulan la concentración y la atención",
  "Favorecen el razonamiento y la creatividad",
  "Promueven el aprendizaje de forma divertida",
];

export default function BienvenidaLaberintos() {
  const { logo, pagina, tipografia } =
    ESTILOS_IMPRIMIBLES;

  return (
    <div
      style={{
        position: "relative",
        width: `${pagina.ancho}px`,
        height: `${pagina.alto}px`,
        overflow: "hidden",
        background: "white",
        fontFamily: tipografia.principal,
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
          Prepárate para divertirte, superar nuevos desafíos y disfrutar de cada actividad.
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
          A medida que avances, las actividades aumentarán progresivamente su dificultad.
        </div>
      </div>

      {/* BENEFICIOS */}

      <div
        style={{
          marginTop: "60px",
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
          Aprende, juega y diviértete
        </div>

        <div
          style={{
            margin: "30px auto 0",
            maxWidth: "600px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {BENEFICIOS.map(
            (beneficio, indice) => (
              <div
                key={indice}
                style={{
                  padding: "16px 22px",
                  borderRadius: "16px",
                  background: "#F8FAFC",
                  border: "2px solid #E2E8F0",
                  fontSize: "20px",
                  fontWeight: 500,
                  lineHeight: 1.35,
                  color: "#475569",
                }}
              >
                {beneficio}
              </div>
            )
          )}
        </div>
      </div>

      {/* CIERRE */}

      <div
        style={{
          marginTop: "50px",
          textAlign: "center",
          fontSize: "25px",
          fontWeight: 500,
          lineHeight: 1.3,
          color: "#0F7490",
        }}
      >
        Piensa, explora y disfruta cada desafío. ¡Que comience la diversión!
      </div>
    </div>
  );
}