import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

export default function PortadaLaberintos({
  nombreProducto = "50 Laberintos",
}) {
  const { logo, pagina } = ESTILOS_IMPRIMIBLES;

  const partesTitulo = String(nombreProducto).trim().split(" ");
  const primeraParte = partesTitulo[0] || "50";
  const restoTitulo = partesTitulo.slice(1).join(" ") || "Laberintos";

  return (
    <div
      style={{
        position: "relative",
        width: `${pagina.ancho}px`,
        height: `${pagina.alto}px`,
        overflow: "hidden",
        boxSizing: "border-box",
        background: "#FFF9E8",
        fontFamily: '"Montserrat", Arial, sans-serif',
      }}
    >
      {/* FONDO SUPERIOR */}

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "515px",
          background: "#FFD43B",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "-125px",
          left: "-105px",
          width: "310px",
          height: "310px",
          borderRadius: "50%",
          background: "#FF8A34",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "-105px",
          right: "-90px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "#35BDF2",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "395px",
          left: "-90px",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "#12B8B0",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "430px",
          right: "-115px",
          width: "280px",
          height: "280px",
          borderRadius: "50%",
          background: "#8B5CF6",
        }}
      />

      {/* FORMAS DECORATIVAS */}

      <div
        style={{
          position: "absolute",
          top: "120px",
          left: "55px",
          width: "22px",
          height: "70px",
          borderRadius: "20px",
          background: "#FF5A4F",
          transform: "rotate(-35deg)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "175px",
          left: "95px",
          width: "18px",
          height: "50px",
          borderRadius: "20px",
          background: "#123B63",
          transform: "rotate(35deg)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "135px",
          right: "70px",
          width: "24px",
          height: "75px",
          borderRadius: "20px",
          background: "#34C759",
          transform: "rotate(35deg)",
        }}
      />

      <div
        style={{
          position: "absolute",
          top: "220px",
          right: "105px",
          width: "18px",
          height: "48px",
          borderRadius: "20px",
          background: "#FF5A4F",
          transform: "rotate(-40deg)",
        }}
      />

      {/* CABECERA */}

      <div
        style={{
          position: "relative",
          zIndex: 10,
          paddingTop: "54px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "inline-block",
            padding: "10px 27px",
            borderRadius: "999px",
            background: "#FFFFFF",
            color: "#123B63",
            fontSize: "17px",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "2.5px",
            textTransform: "uppercase",
            boxShadow: "0 6px 0 rgba(18,59,99,0.12)",
          }}
        >
          Colección de actividades
        </div>

        {/* NÚMERO */}

        <div
          style={{
            marginTop: "24px",
            fontSize: "122px",
            lineHeight: 0.9,
            fontWeight: 700,
            letterSpacing: "-8px",
            color: "#FFFFFF",
            WebkitTextStroke: "5px #123B63",
            textShadow:
              "7px 7px 0 #12B8B0, 12px 12px 0 rgba(18,59,99,0.15)",
          }}
        >
          {primeraParte}
        </div>

        {/* LABERINTOS */}

        <div
          style={{
            marginTop: "8px",
            fontSize: "64px",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "-2px",
            textTransform: "uppercase",
            color: "#FFFFFF",
            WebkitTextStroke: "3px #123B63",
            textShadow: "5px 6px 0 #12B8B0",
          }}
        >
          {restoTitulo}
        </div>

        <div
          style={{
            display: "inline-block",
            marginTop: "25px",
            padding: "11px 28px",
            borderRadius: "14px",
            background: "#8B5CF6",
            color: "#FFFFFF",
            fontSize: "18px",
            lineHeight: 1.25,
            fontWeight: 700,
            transform: "rotate(-1deg)",
            boxShadow: "5px 6px 0 #123B63",
          }}
        >
          PIENSA · EXPLORA · ENCUENTRA LA SALIDA
        </div>
      </div>

      {/* LABERINTO CENTRAL */}

      <div
        style={{
          position: "absolute",
          zIndex: 15,
          top: "515px",
          left: "112px",
          width: "570px",
          height: "400px",
          padding: "18px",
          boxSizing: "border-box",
          borderRadius: "30px",
          background: "#12B8B0",
          border: "6px solid #123B63",
          boxShadow: "12px 14px 0 rgba(18,59,99,0.16)",
          transform: "rotate(-2deg)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "hidden",
            borderRadius: "15px",
            background: "#FFFFFF",
            border: "4px solid #123B63",
          }}
        >
          {/* PAREDES DEL LABERINTO */}

          <div
            style={{
              position: "absolute",
              top: "45px",
              left: "0",
              width: "185px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "45px",
              left: "245px",
              width: "230px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "45px",
              left: "180px",
              width: "13px",
              height: "105px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "105px",
              left: "65px",
              width: "125px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "105px",
              left: "65px",
              width: "13px",
              height: "110px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "105px",
              left: "245px",
              width: "13px",
              height: "105px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "105px",
              left: "245px",
              width: "130px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "105px",
              left: "365px",
              width: "13px",
              height: "110px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "205px",
              left: "65px",
              width: "125px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "155px",
              left: "180px",
              width: "13px",
              height: "120px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "205px",
              left: "245px",
              width: "133px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "205px",
              left: "425px",
              width: "13px",
              height: "100px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "265px",
              left: "0",
              width: "130px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "265px",
              left: "180px",
              width: "140px",
              height: "13px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "265px",
              left: "315px",
              width: "13px",
              height: "95px",
              background: "#123B63",
            }}
          />

          <div
            style={{
              position: "absolute",
              top: "305px",
              left: "65px",
              width: "130px",
              height: "13px",
              background: "#123B63",
            }}
          />

          {/* ENTRADA */}

          <div
            style={{
              position: "absolute",
              top: "18px",
              left: "17px",
              width: "53px",
              height: "53px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "#34C759",
              border: "4px solid #123B63",
              color: "#FFFFFF",
              fontSize: "34px",
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            →
          </div>

          {/* SALIDA */}

          <div
            style={{
              position: "absolute",
              right: "18px",
              bottom: "18px",
              width: "53px",
              height: "53px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              background: "#FF5A4F",
              border: "4px solid #123B63",
              color: "#FFFFFF",
              fontSize: "34px",
              lineHeight: 1,
              fontWeight: 700,
            }}
          >
            →
          </div>
        </div>
      </div>

      {/* LLAMADO */}

      <div
        style={{
          position: "absolute",
          zIndex: 25,
          top: "570px",
          right: "25px",
          width: "150px",
          padding: "17px 13px",
          boxSizing: "border-box",
          borderRadius: "24px",
          background: "#FF5A4F",
          border: "4px solid #123B63",
          color: "#FFFFFF",
          fontSize: "16px",
          lineHeight: 1.2,
          fontWeight: 700,
          textAlign: "center",
          transform: "rotate(7deg)",
          boxShadow: "5px 6px 0 rgba(18,59,99,0.18)",
        }}
      >
        ¿PUEDES
        <br />
        ENCONTRAR
        <br />
        LA SALIDA?
      </div>

      {/* DECORACIÓN INFERIOR */}

      <div
        style={{
          position: "absolute",
          bottom: "-145px",
          left: "-110px",
          width: "350px",
          height: "350px",
          borderRadius: "50%",
          background: "#35BDF2",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "-170px",
          right: "-95px",
          width: "360px",
          height: "360px",
          borderRadius: "50%",
          background: "#12B8B0",
        }}
      />

      <div
        style={{
          position: "absolute",
          bottom: "72px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 30,
          width: "330px",
          minHeight: "108px",
          padding: "18px 28px",
          boxSizing: "border-box",
          borderRadius: "55px 55px 25px 25px",
          background: "#FFFFFF",
          border: "4px solid #123B63",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "7px 8px 0 rgba(18,59,99,0.15)",
        }}
      >
        <img
          src={logo.url}
          alt="Andrés Imprimibles"
          draggable="false"
          style={{
            width: "115px",
            height: "auto",
            objectFit: "contain",
          }}
        />

        <div
          style={{
            marginTop: "5px",
            color: "#123B63",
            fontSize: "14px",
            lineHeight: 1,
            fontWeight: 700,
            letterSpacing: "1.5px",
          }}
        >
          ANDRÉS IMPRIMIBLES
        </div>
      </div>

      {/* ESTRELLAS */}

      <div
        style={{
          position: "absolute",
          zIndex: 20,
          bottom: "185px",
          left: "48px",
          color: "#FFD43B",
          fontSize: "52px",
          fontWeight: 700,
          WebkitTextStroke: "3px #123B63",
          transform: "rotate(-12deg)",
        }}
      >
        ★
      </div>

      <div
        style={{
          position: "absolute",
          zIndex: 20,
          bottom: "205px",
          right: "55px",
          color: "#FF8A34",
          fontSize: "44px",
          fontWeight: 700,
          WebkitTextStroke: "3px #123B63",
          transform: "rotate(15deg)",
        }}
      >
        ★
      </div>
    </div>
  );
}