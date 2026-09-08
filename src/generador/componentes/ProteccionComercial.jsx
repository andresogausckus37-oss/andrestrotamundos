import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

export default function ProteccionComercial({
  children,
}) {
  const { comercial } = ESTILOS_IMPRIMIBLES;

  const { marcaAgua } = comercial;

  const marcas = Array.from(
    { length: marcaAgua.cantidad },
    (_, index) => index
  );

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        overflow: "hidden",
      }}
    >
      {/* IMAGEN ORIGINAL */}
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {children}
      </div>

      {/* MARCAS DE AGUA */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        {marcas.map((index) => {
          const posicionVertical =
            ((index + 1) /
              (marcaAgua.cantidad + 1)) *
            100;

          return (
            <div
              key={index}
              style={{
                position: "absolute",

                top: `${posicionVertical}%`,
                left: "50%",

                transform: `
                  translate(-50%, -50%)
                  rotate(${marcaAgua.rotacion}deg)
                `,

                transformOrigin: "center",

                whiteSpace: "nowrap",

                fontFamily:
                  marcaAgua.fontFamily,

                fontSize:
                  `${marcaAgua.fontSize}px`,

                fontWeight:
                  marcaAgua.fontWeight,

                color: "#111827",

                opacity:
                  marcaAgua.opacity,

                userSelect: "none",
              }}
            >
              {marcaAgua.texto}
            </div>
          );
        })}
      </div>
    </div>
  );
}