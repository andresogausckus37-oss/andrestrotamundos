import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

const DATOS_NIVELES = {
  facil: {
    etiqueta: "Fácil",
    fondo: "#DCFCE7",
    texto: "#166534",
    borde: "#86EFAC",
  },
  medio: {
    etiqueta: "Medio",
    fondo: "#FEF3C7",
    texto: "#92400E",
    borde: "#FCD34D",
  },
  dificil: {
    etiqueta: "Difícil",
    fondo: "#FEE2E2",
    texto: "#991B1B",
    borde: "#FCA5A5",
  },
  experto: {
    etiqueta: "Experto",
    fondo: "#DBEAFE",
    texto: "#1E40AF",
    borde: "#93C5FD",
  },
  legendario: {
    etiqueta: "Legendario",
    fondo: "#FCE7F3",
    texto: "#9D174D",
    borde: "#F9A8D4",
  },
};

export default function PortadaLaberintos({
  nombreProducto = "50 Laberintos",
  niveles = [],
}) {
  const { logo, pagina } = ESTILOS_IMPRIMIBLES;

  const nivelesVisibles = niveles
    .map((nivel) => {
      if (typeof nivel === "string") {
        return nivel;
      }

      return nivel?.nivel;
    })
    .filter(
      (nivel, indice, lista) =>
        DATOS_NIVELES[nivel] &&
        lista.indexOf(nivel) === indice
    );

  return (
    <div
      style={{
        position: "relative",
        width: `${pagina.ancho}px`,
        height: `${pagina.alto}px`,
        overflow: "hidden",
        boxSizing: "border-box",
        background:
          "linear-gradient(180deg, #F0F9FF 0%, #FFFFFF 48%, #FFF7ED 100%)",
        fontFamily: '"Montserrat", Arial, sans-serif',
      }}
    >
      {/* DECORACIÓN SUPERIOR */}

      <div
        style={{
          position: "absolute",
          top: "-130px",
          left: "-110px",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: "#BAE6FD",
          opacity: 0.45,
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "90px",
          right: "-150px",
          width: "330px",
          height: "330px",
          borderRadius: "50%",
          background: "#FED7AA",
          opacity: 0.4,
        }}
      />

      {/* CONTENIDO */}

      <div
        style={{
          position: "relative",
          zIndex: 5,
          height: "100%",
          boxSizing: "border-box",
          padding: "115px 70px 55px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {/* ETIQUETA */}

        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            letterSpacing: "4px",
            color: "#0284C7",
            textTransform: "uppercase",
          }}
        >
          Colección de actividades
        </div>

        {/* TÍTULO */}

        <h1
          style={{
            margin: "35px 0 0",
            maxWidth: "650px",
            fontSize: "64px",
            lineHeight: 1.05,
            fontWeight: 800,
            letterSpacing: "-2px",
            color: "#0F172A",
          }}
        >
          {nombreProducto}
        </h1>

        {/* SUBTÍTULO */}

        <p
          style={{
            margin: "26px 0 0",
            maxWidth: "570px",
            fontSize: "25px",
            lineHeight: 1.45,
            fontWeight: 500,
            color: "#475569",
          }}
        >
          Desafíos para pensar, explorar y divertirse
        </p>

        {/* LABERINTO DECORATIVO */}

        <div
          style={{
            position: "relative",
            marginTop: "55px",
            width: "460px",
            height: "300px",
            border: "4px solid #0F7490",
            borderRadius: "28px",
            background: "#FFFFFF",
            boxShadow: "0 18px 45px rgba(15, 23, 42, 0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: "25px",
              border: "3px solid #BAE6FD",
              borderRadius: "18px",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "65px",
              left: "25px",
              width: "280px",
              height: "3px",
              background: "#0F7490",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "65px",
              left: "302px",
              width: "3px",
              height: "125px",
              background: "#0F7490",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "187px",
              left: "150px",
              width: "155px",
              height: "3px",
              background: "#0F7490",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "125px",
              left: "147px",
              width: "3px",
              height: "65px",
              background: "#0F7490",
            }}
          />

          <div
            style={{
              position: "absolute",
              left: "42px",
              top: "46px",
              fontSize: "31px",
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            →
          </div>

          <div
            style={{
              position: "absolute",
              right: "40px",
              bottom: "43px",
              fontSize: "31px",
              fontWeight: 800,
              color: "#0F172A",
            }}
          >
            →
          </div>
        </div>

        {/* NIVELES */}

        {nivelesVisibles.length > 0 && (
          <div
            style={{
              marginTop: "42px",
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "10px",
              maxWidth: "620px",
            }}
          >
            {nivelesVisibles.map((nivel) => {
              const datos = DATOS_NIVELES[nivel];

              return (
                <div
                  key={nivel}
                  style={{
                    padding: "9px 17px",
                    borderRadius: "999px",
                    border: `2px solid ${datos.borde}`,
                    background: datos.fondo,
                    color: datos.texto,
                    fontSize: "15px",
                    fontWeight: 700,
                  }}
                >
                  {datos.etiqueta}
                </div>
              );
            })}
          </div>
        )}

        {/* LOGO */}

        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "9px",
          }}
        >
          <img
            src={logo.url}
            alt="Andrés Imprimibles"
            draggable="false"
            style={{
              width: `${logo.ancho}px`,
              height: "auto",
              objectFit: "contain",
            }}
          />

          <div
            style={{
              fontSize: "15px",
              fontWeight: 600,
              letterSpacing: "1px",
              color: "#64748B",
            }}
          >
            ANDRÉS IMPRIMIBLES
          </div>
        </div>
      </div>
    </div>
  );
}