import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

export default function PortadaLaberintos({
  imagenPortada,
  nombreProducto = "Laberintos",
}) {
  const { logo, pagina } = ESTILOS_IMPRIMIBLES;

  return (
    <div
      style={{
        position: "relative",
        width: `${pagina.ancho}px`,
        height: `${pagina.alto}px`,
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* IMAGEN DE PORTADA */}

      {imagenPortada && (
        <img
          src={imagenPortada}
          alt={`Portada ${nombreProducto}`}
          draggable="false"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 1,
          }}
        />
      )}

      {/* LOGO OFICIAL */}

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
          zIndex: 50,
        }}
      />
    </div>
  );
}