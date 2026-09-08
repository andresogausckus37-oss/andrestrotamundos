import { ESTILOS_IMPRIMIBLES } from "../config/estilosImprimibles";

export default function LaminaBase({
  children,

  titulo = "",
  instrucciones = "",

  tamanoTitulo = 30,
  tamanoInstrucciones = 18,

  mostrarLogo = true,

  anchoLogo = ESTILOS_IMPRIMIBLES.logo.ancho,
  logoTop = ESTILOS_IMPRIMIBLES.logo.top,
  logoRight = ESTILOS_IMPRIMIBLES.logo.right,
}) {
  const {
    logo,
    tipografia,
    pagina,
  } = ESTILOS_IMPRIMIBLES;

  return (
    <div
      className="relative overflow-hidden bg-white text-slate-900"
      style={{
        width: `${pagina.ancho}px`,
        height: `${pagina.alto}px`,
        boxSizing: "border-box",
      }}
    >
      {/* LOGO OFICIAL */}
      {mostrarLogo && (
        <img
          src={logo.url}
          alt="Toby y Luna Imprimibles"
          draggable="false"
          style={{
            position: "absolute",
            top: `${logoTop}px`,
            right: `${logoRight}px`,
            width: `${anchoLogo}px`,
            height: "auto",
            objectFit: "contain",
            zIndex: 50,
          }}
        />
      )}

      {/* ENCABEZADO */}
      <header
        style={{
          position: "absolute",
          top: "45px",
          left: "45px",
          width: "500px",
        }}
      >
        {titulo && (
          <h1
            style={{
              margin: 0,

              fontFamily:
                tipografia.titulo,

              fontSize:
                `${tamanoTitulo}px`,

              fontWeight: 400,

              lineHeight: 1.15,
            }}
          >
            {titulo}
          </h1>
        )}

        {instrucciones && (
          <p
            style={{
              marginTop: "12px",
              marginBottom: 0,

              fontFamily:
                tipografia.instrucciones,

              fontSize:
                `${tamanoInstrucciones}px`,

              lineHeight: 1.3,
            }}
          >
            {instrucciones}
          </p>
        )}
      </header>

      {/* CONTENIDO */}
      <main
        style={{
          position: "absolute",
          top: "180px",
          left: "45px",
          right: "45px",
          bottom: "45px",
        }}
      >
        {children}
      </main>
    </div>
  );
}