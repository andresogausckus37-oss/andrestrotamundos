import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

export default function PortadaLaberintos() {
  const { logo, pagina } = ESTILOS_IMPRIMIBLES;

  const imagenPortada =
    "https://i.postimg.cc/kXTLQT2V/file-0000000018b0820eabdaf3280f65993c.png";

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
      <img
        src={imagenPortada}
        alt="Portada 50 Laberintos"
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

      {/* LOGO OFICIAL */}
      <img
        src={logo.url}
        alt="Toby y Luna Imprimibles"
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