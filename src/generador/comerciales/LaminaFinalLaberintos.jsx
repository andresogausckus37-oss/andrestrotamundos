import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

/* =========================================================
   LÁMINA FINAL
========================================================= */

export default function LaminaFinalLaberintos({
  imagenFinal,
}) {
  const {
    logo,
    pagina,
  } = ESTILOS_IMPRIMIBLES;

  return (
    <div
      style={{
        position: "relative",

        width:
          `${pagina.ancho}px`,

        height:
          `${pagina.alto}px`,

        overflow:
          "hidden",

        background:
          "#ffffff",
      }}
    >
      {/* =====================================================
          IMAGEN FINAL
      ====================================================== */}

      {imagenFinal && (
        <img
          src={imagenFinal}
          alt="Lámina final - 50 Laberintos"
          draggable="false"
          style={{
            position:
              "absolute",

            inset: 0,

            width:
              "100%",

            height:
              "100%",

            objectFit:
              "cover",

            zIndex: 1,
          }}
        />
      )}

      {/* =====================================================
          LOGO OFICIAL
      ====================================================== */}

      <img
        src={logo.url}
        alt="Toby y Luna Imprimibles"
        draggable="false"
        style={{
          position:
            "absolute",

          top:
            `${logo.top}px`,

          right:
            `${logo.right}px`,

          width:
            `${logo.ancho}px`,

          height:
            "auto",

          objectFit:
            "contain",

          zIndex: 50,
        }}
      />
    </div>
  );
}