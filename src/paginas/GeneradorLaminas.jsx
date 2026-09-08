import { generarPdfLaminas } from "../utilidades/generarPdfLaminas";
import LaminaFinalLaberintos from "../generador/comerciales/LaminaFinalLaberintos";
import LaminaLaberinto from "../generador/componentes/LaminaLaberinto";
import PortadaLaberintos from "../generador/comerciales/PortadaLaberintos";
import Laberinto, {
  validarLaberinto,
} from "../generador/juegos/Laberinto";
import UnirPuntos from "../generador/juegos/UnirPuntos";
import { useEffect, useRef, useState } from "react";
import LaminaBase from "../generador/componentes/LaminaBase";

const ANCHO_A4 = 794;
const ALTO_A4 = 1123;

export default function GeneradorLaminas() {
  const contenedorPreviewRef = useRef(null);

  // TEXTO
  const [titulo, setTitulo] = useState("El laberinto de Toby");
  const [instrucciones, setInstrucciones] = useState(
    "Ayudá a Toby a encontrar el camino correcto."
  );


  const laminaExportarRef = useRef(null);

const [exportandoPdf, setExportandoPdf] = useState(false);

const [progresoPdf, setProgresoPdf] = useState({
  actual: 0,
  total: 0,
  porcentaje: 0,
});

  // TAMAÑOS
  const [tamanoTitulo, setTamanoTitulo] = useState(28);
  const [tamanoInstrucciones, setTamanoInstrucciones] = useState(16);

  // LOGO
  const [mostrarLogo, setMostrarLogo] = useState(true);
  const [anchoLogo, setAnchoLogo] = useState(120);
  const [logoTop, setLogoTop] = useState(32);
  const [logoRight, setLogoRight] = useState(32);

  // PREVIEW
  const [escalaPreview, setEscalaPreview] = useState(1);

  const [cantidadFaciles, setCantidadFaciles] = useState(5);
const [cantidadMedios, setCantidadMedios] = useState(10);
const [cantidadDificiles, setCantidadDificiles] = useState(5);

  const [semilla, setSemilla] = useState(1);

  const [tipoProducto, setTipoProducto] =
  useState("laberintos");

  const [cantidadPuntos, setCantidadPuntos] =
  useState(25);

  const [figuraUnirPuntos, setFiguraUnirPuntos] =
  useState("pez");

const cantidadLaberintos =
  cantidadFaciles +
  cantidadMedios +
  cantidadDificiles;

  

  // =========================================================
// PÁGINAS DEL PRODUCTO
// =========================================================

const [paginaActual, setPaginaActual] = useState(0);

const laberintosConfigurados = [
  ...Array.from(
    { length: cantidadFaciles },
    (_, index) => ({
      numero: index + 1,
      nivel: "facil",
    })
  ),

  ...Array.from(
    { length: cantidadMedios },
    (_, index) => ({
      numero:
        cantidadFaciles +
        index +
        1,
      nivel: "medio",
    })
  ),

  ...Array.from(
    { length: cantidadDificiles },
    (_, index) => ({
      numero:
        cantidadFaciles +
        cantidadMedios +
        index +
        1,
      nivel: "dificil",
    })
  ),
];

const paginasJuegos = laberintosConfigurados.map(
  (item, index) => ({
    id: `laberinto-${item.numero}`,
    nombre: `Laberinto ${item.numero}`,
    tipo: "juego",
    indiceLaberinto: index,
    nivel: item.nivel,
  })
);

const paginasSoluciones =
  laberintosConfigurados.map(
    (item, index) => ({
      id: `solucion-${item.numero}`,
      nombre: `Solución ${item.numero}`,
      tipo: "solucion",
      indiceLaberinto: index,
      nivel: item.nivel,
    })
  );

const paginas = [
  {
    id: "portada",
    nombre: "Portada",
    tipo: "portada",
  },

  ...paginasJuegos,

  ...paginasSoluciones,

  {
    id: "lamina-final",
    nombre: "Lámina final",
    tipo: "final",
  },
];

const pagina = paginas[paginaActual];

  const configuracionLaberinto = {
  facil: {
    filas: 8,
    columnas: 6,
  },

  medio: {
    filas: 12,
    columnas: 9,
  },

  dificil: {
    filas: 16,
    columnas: 12,
  },
};

  const nivelPagina =
  pagina?.nivel ?? "facil";

const configuracionPagina =
  configuracionLaberinto[nivelPagina];

const indiceLaberinto =
  pagina?.indiceLaberinto ?? 0;

const semillaPagina =
  semilla + indiceLaberinto;

  useEffect(() => {
  const contenedor = contenedorPreviewRef.current;

  if (!contenedor) return;

  function calcularEscala() {
    const anchoDisponible = contenedor.clientWidth;

    const nuevaEscala = Math.min(
      anchoDisponible / ANCHO_A4,
      1
    );

    setEscalaPreview(nuevaEscala);
  }

  calcularEscala();

  const observer = new ResizeObserver(calcularEscala);

  observer.observe(contenedor);

  return () => {
    observer.disconnect();
  };
}, []);

useEffect(() => {
  if (paginaActual >= paginas.length) {
    setPaginaActual(
      Math.max(paginas.length - 1, 0)
    );
  }
}, [
  cantidadLaberintos,
  paginaActual,
  paginas.length,
]);

  const validacion = validarLaberinto(
  configuracionPagina.filas,
  configuracionPagina.columnas,
  semillaPagina
);

  // =========================================================
// VALIDACIÓN DE TODO EL PRODUCTO
// =========================================================

const validacionesProducto =
  laberintosConfigurados.map(
    (item, index) => {
      const semillaLaberinto =
        semilla + index;

      const configuracion =
        configuracionLaberinto[item.nivel];

      const resultado = validarLaberinto(
        configuracion.filas,
        configuracion.columnas,
        semillaLaberinto
      );

      return {
        numero: item.numero,
        nivel: item.nivel,
        semilla: semillaLaberinto,
        ...resultado,
      };
    }
  );

const cantidadValidos =
  validacionesProducto.filter(
    (item) => item.valido
  ).length;

const productoValido =
  cantidadValidos === cantidadLaberintos;

  async function descargarPdfCompleto() {
  if (exportandoPdf) return;

  setExportandoPdf(true);

  setProgresoPdf({
    actual: 0,
    total: paginas.length,
    porcentaje: 0,
  });

  try {
    await generarPdfLaminas({
      totalPaginas: paginas.length,

      cambiarPagina: async (indice) => {
        setPaginaActual(indice);

        await new Promise((resolve) => {
          requestAnimationFrame(() => {
            requestAnimationFrame(resolve);
          });
        });
      },

      obtenerElemento: () =>
        laminaExportarRef.current,

      nombreArchivo:
        "50-Laberintos-Las-Aventuras-de-Toby-y-Luna.pdf",

      calidad: 0.92,

      pixelRatio: 1.5,

      alActualizarProgreso: ({
        actual,
        total,
        porcentaje,
      }) => {
        setProgresoPdf({
          actual,
          total,
          porcentaje,
        });
      },
    });
  } catch (error) {
    console.error(error);

    alert(
      "No se pudo generar el PDF. Revisá la consola para ver el error."
    );
  } finally {
    setExportandoPdf(false);
  }
}

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-4">

        {/* PANEL */}

        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Generador de láminas
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Toby y Luna Imprimibles
            </p>
          </div>

          {/* TEXTOS */}

          <div className="mt-6">
            <h2 className="text-sm font-bold text-slate-900">
              Contenido
            </h2>

            <div className="mt-3 grid gap-4 md:grid-cols-2">

              {/* TIPO DE PRODUCTO */}

<div>
  <label
    htmlFor="tipoProducto"
    className="text-sm font-medium text-slate-700"
  >
    Tipo de producto
  </label>

  <select
    id="tipoProducto"
    value={tipoProducto}
    onChange={(e) => {
      setTipoProducto(e.target.value);
      setPaginaActual(0);
    }}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
  >
    <option value="laberintos">
      Laberintos
    </option>

    <option value="unir-puntos">
      Unir puntos
    </option>
  </select>
</div>

              {tipoProducto === "unir-puntos" && (
  <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
    <h3 className="text-sm font-bold text-slate-900">
      Configuración de Unir puntos
    </h3>

    {/* FIGURA */}
    <div className="mt-4">
      <label
        htmlFor="figuraUnirPuntos"
        className="text-sm font-medium text-slate-700"
      >
        Figura
      </label>

      <select
        id="figuraUnirPuntos"
        value={figuraUnirPuntos}
        onChange={(e) => {
          setFiguraUnirPuntos(e.target.value);
          setPaginaActual(0);
        }}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
      >
        <option value="pez">
          Pez
        </option>

        <option value="gato">
          Gato
        </option>

        <option value="perro">
          Perro
        </option>
      </select>
    </div>

    {/* CANTIDAD DE PUNTOS */}
    <div className="mt-5">
      <label
        htmlFor="cantidadPuntos"
        className="text-sm font-medium text-slate-700"
      >
        Cantidad de puntos
      </label>

      <input
        id="cantidadPuntos"
        type="range"
        min="10"
        max="60"
        step="1"
        value={cantidadPuntos}
        onChange={(e) =>
          setCantidadPuntos(
            Number(e.target.value)
          )
        }
        className="mt-3 w-full"
      />

      <div className="mt-1 flex justify-between text-xs text-slate-500">
        <span>10</span>

        <span className="font-bold text-slate-900">
          {cantidadPuntos} puntos
        </span>

        <span>60</span>
      </div>
    </div>
  </div>
)}

              {/* TÍTULO */}

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Título
                </label>

                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                />
              </div>

              {/* INSTRUCCIONES */}

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Instrucciones
                </label>

                <textarea
                  value={instrucciones}
                  onChange={(e) =>
                    setInstrucciones(e.target.value)
                  }
                  rows="2"
                  className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
                />
              </div>

            </div>
          </div>

          {/* TIPOGRAFÍA */}

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h2 className="text-sm font-bold text-slate-900">
              Tipografía
            </h2>

            <div className="mt-4 grid gap-5 md:grid-cols-2">

              <ControlRango
                titulo="Tamaño del título"
                valor={tamanoTitulo}
                min={18}
                max={48}
                unidad="px"
                onChange={setTamanoTitulo}
              />

              <ControlRango
                titulo="Tamaño de instrucciones"
                valor={tamanoInstrucciones}
                min={10}
                max={28}
                unidad="px"
                onChange={setTamanoInstrucciones}
              />

            </div>
          </div>

          {/* LOGO */}

          <div className="mt-6 border-t border-slate-100 pt-5">

            <div className="flex items-center justify-between gap-4">
              <h2 className="text-sm font-bold text-slate-900">
                Logo Toby y Luna
              </h2>

              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={mostrarLogo}
                  onChange={(e) =>
                    setMostrarLogo(e.target.checked)
                  }
                  className="h-4 w-4"
                />

                Mostrar
              </label>
            </div>

            {mostrarLogo && (
              <div className="mt-4 grid gap-5 md:grid-cols-3">

                <ControlRango
                  titulo="Tamaño"
                  valor={anchoLogo}
                  min={60}
                  max={250}
                  unidad="px"
                  onChange={setAnchoLogo}
                />

                <ControlRango
                  titulo="Desde arriba"
                  valor={logoTop}
                  min={10}
                  max={120}
                  unidad="px"
                  onChange={setLogoTop}
                />

                <ControlRango
                  titulo="Desde la derecha"
                  valor={logoRight}
                  min={10}
                  max={120}
                  unidad="px"
                  onChange={setLogoRight}
                />

              </div>
            )}
          </div>

          {/* JUEGO */}

<div className="mt-6 border-t border-slate-100 pt-5">
  <h2 className="text-sm font-bold text-slate-900">
    Juego
  </h2>

  <div className="mt-4 grid gap-4 md:grid-cols-2">

    {/* NIVEL */}

    <div className="grid grid-cols-3 gap-3">

  <div>
    <label className="text-xs font-semibold text-slate-600">
      Fáciles
    </label>

    <input
      type="number"
      min="0"
      max="50"
      value={cantidadFaciles}
      onChange={(e) => {
        setCantidadFaciles(
          Math.max(0, Number(e.target.value))
        );
        setPaginaActual(0);
      }}
      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none"
    />
  </div>

  <div>
    <label className="text-xs font-semibold text-slate-600">
      Intermedios
    </label>

    <input
      type="number"
      min="0"
      max="50"
      value={cantidadMedios}
      onChange={(e) => {
        setCantidadMedios(
          Math.max(0, Number(e.target.value))
        );
        setPaginaActual(0);
      }}
      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none"
    />
  </div>

  <div>
    <label className="text-xs font-semibold text-slate-600">
      Difíciles
    </label>

    <input
      type="number"
      min="0"
      max="50"
      value={cantidadDificiles}
      onChange={(e) => {
        setCantidadDificiles(
          Math.max(0, Number(e.target.value))
        );
        setPaginaActual(0);
      }}
      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-center text-sm outline-none"
    />
  </div>

</div>

<p className="mt-2 text-xs text-slate-500">
  Total: {cantidadLaberintos} laberintos ·{" "}
  {cantidadLaberintos} soluciones
</p>

    {/* CANTIDAD */}

<div>
  <label
    htmlFor="cantidadLaberintos"
    className="text-sm font-medium text-slate-700"
  >
    Cantidad de laberintos
  </label>

  <input
    id="cantidadLaberintos"
    type="number"
    min="1"
    max="50"
    value={cantidadLaberintos}
    onChange={(e) => {
      const cantidad = Number(e.target.value);

      setCantidadLaberintos(
        Math.min(
          Math.max(cantidad, 1),
          50
        )
      );

      setPaginaActual(0);
    }}
    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
  />

  <p className="mt-1 text-xs text-slate-500">
    Se generarán {cantidadLaberintos} juegos y{" "}
    {cantidadLaberintos} soluciones.
  </p>
</div>

    {/* GENERAR */}

    <div className="flex items-end">
      <button
        type="button"
        onClick={() =>
          setSemilla((actual) => actual + 1)
        }
        className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
      >
        Generar nuevo conjunto
      </button>

{/* VALIDACIÓN */}

<div className="mt-5 rounded-xl bg-slate-50 p-4">
  <div className="flex items-center justify-between gap-3">
    <h3 className="text-sm font-bold text-slate-900">
      Validación
    </h3>

    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        validacion.valido
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {validacion.valido
        ? "Listo"
        : "Revisar"}
    </span>
  </div>

  <div className="mt-3 space-y-2 text-sm">

    <EstadoValidacion
      correcto={validacion.entradaCorrecta}
      texto="Entrada correcta"
    />

    <EstadoValidacion
      correcto={validacion.salidaCorrecta}
      texto="Salida correcta"
    />

    <EstadoValidacion
      correcto={validacion.todasConectadas}
      texto={`${validacion.totalCeldas} celdas conectadas`}
    />

    <EstadoValidacion
      correcto={validacion.solucionEncontrada}
      texto="Solución encontrada"
    />

  </div>

  {validacion.solucionEncontrada && (
    <p className="mt-3 text-xs text-slate-500">
      Longitud de la solución:{" "}
      {validacion.longitudSolucion} celdas
    </p>
  )}
</div>
      
    </div>

  </div>
</div>
          
        </section>

        {/* =====================================================
    VALIDACIÓN DEL PRODUCTO
===================================================== */}

<div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4">
  <div className="flex items-start justify-between gap-3">
    <div>
      <h3 className="text-sm font-bold text-slate-900">
        Validación del producto
      </h3>

      <p className="mt-1 text-xs text-slate-500">
        Revisión automática de todos los laberintos.
      </p>
    </div>

    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
        productoValido
          ? "bg-emerald-100 text-emerald-700"
          : "bg-red-100 text-red-700"
      }`}
    >
      {productoValido
        ? "Producto listo"
        : "Revisar"}
    </span>
  </div>

  {/* RESUMEN */}

  <div className="mt-4 grid grid-cols-2 gap-3">

    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-extrabold text-slate-900">
        {cantidadValidos}/{cantidadLaberintos}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Laberintos correctos
      </p>
    </div>

    <div className="rounded-xl bg-slate-50 p-3 text-center">
      <p className="text-xl font-extrabold text-slate-900">
        {cantidadLaberintos}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        Soluciones generadas
      </p>
    </div>

  </div>

  {/* LISTA */}

  <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
    {validacionesProducto.map((item) => (
      <div
        key={item.numero}
        className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2"
      >
        <div className="flex items-center gap-2">

          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              item.valido
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {item.valido ? "✓" : "×"}
          </span>

          <span className="text-sm font-medium text-slate-700">
            Laberinto {item.numero} ·{" "}
{item.nivel === "facil"
  ? "Fácil"
  : item.nivel === "medio"
    ? "Intermedio"
    : "Difícil"}
          </span>

        </div>

        <span className="text-xs text-slate-500">
          {item.longitudSolucion} pasos
        </span>
      </div>
    ))}
  </div>

  {/* ESTADO FINAL */}

  {productoValido && (
    <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-center">
      <p className="text-sm font-bold text-emerald-700">
        ✓ PRODUCTO LISTO
      </p>

      <p className="mt-1 text-xs text-emerald-600">
        Todos los laberintos tienen entrada,
        salida y solución válida.
      </p>
    </div>
  )}
</div>

        {/* PREVIEW */}

        <section className="mt-6">

          {/* NAVEGADOR DE PÁGINAS */}

<div className="mb-5 rounded-2xl bg-white p-3 shadow-sm">
  <div className="flex items-center justify-between gap-3">

    {/* ANTERIOR */}

    <button
      type="button"
      onClick={() =>
        setPaginaActual((actual) =>
          Math.max(actual - 1, 0)
        )
      }
      disabled={paginaActual === 0}
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
    >
      ←
    </button>

    {/* INFORMACIÓN */}

    <div className="text-center">
      <p className="text-sm font-bold text-slate-900">
        {pagina.nombre}
      </p>

      <p className="mt-0.5 text-xs text-slate-500">
        Página {paginaActual + 1} de {paginas.length}
      </p>
    </div>

    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4">
  <button
    type="button"
    onClick={descargarPdfCompleto}
    disabled={exportandoPdf}
    className={`w-full rounded-xl px-5 py-3 text-sm font-bold transition ${
      exportandoPdf
        ? "cursor-not-allowed bg-slate-300 text-slate-600"
        : "bg-slate-900 text-white hover:bg-slate-800"
    }`}
  >
    {exportandoPdf
      ? `Generando PDF... ${progresoPdf.actual}/${progresoPdf.total}`
      : "Descargar PDF completo"}
  </button>

  {exportandoPdf && (
    <div className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full bg-slate-900 transition-all duration-300"
          style={{
            width: `${progresoPdf.porcentaje}%`,
          }}
        />
      </div>

      <div className="mt-2 text-center text-xs font-semibold text-slate-600">
        {progresoPdf.porcentaje}% ·{" "}
        {progresoPdf.actual} de{" "}
        {progresoPdf.total} páginas
      </div>
    </div>
  )}
</div>

    {/* SIGUIENTE */}

    <button
      type="button"
      onClick={() =>
        setPaginaActual((actual) =>
          Math.min(
            actual + 1,
            paginas.length - 1
          )
        )
      }
      disabled={paginaActual === paginas.length - 1}
      className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
    >
      →
    </button>

  </div>

  {/* MINI SELECTOR */}

  <div className="mt-3 flex justify-center gap-2">
    {paginas.map((item, index) => (
      <button
        key={item.id}
        type="button"
        onClick={() => setPaginaActual(index)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          paginaActual === index
            ? "bg-slate-900 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {index + 1}
      </button>
    ))}
  </div>
</div>

          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Vista previa
              </p>

              <p className="text-xs text-slate-500">
                A4 · 210 × 297 mm
              </p>
            </div>

            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">
              {Math.round(escalaPreview * 100)}%
            </span>
          </div>

          <div
            ref={contenedorPreviewRef}
            className="w-full overflow-hidden"
          >
                <div
                  className="mx-auto"
                  style={{
                    width: `${ANCHO_A4 * escalaPreview}px`,
                    height: `${ALTO_A4 * escalaPreview}px`,
                  }}
                >
                  <div
                    style={{
                      width: `${ANCHO_A4}px`,
                      height: `${ALTO_A4}px`,
                      transform: `scale(${escalaPreview})`,
                      transformOrigin: "top left",
                    }}
                  >
                    <div
                      ref={laminaExportarRef}
                      style={{
                        width: `${ANCHO_A4}px`,
                        height: `${ALTO_A4}px`,
                      }}
                    >

    {pagina.tipo === "portada" ? (
      <PortadaLaberintos
        cantidad={cantidadLaberintos}
        faciles={cantidadFaciles}
        medios={cantidadMedios}
        dificiles={cantidadDificiles}
      />
    ) : pagina.tipo === "final" ? (
      <LaminaFinalLaberintos />
    ) : (
      <LaminaBase
        titulo={
          tipoProducto === "laberintos"
            ? ""
            : titulo
        }
        instrucciones={
          tipoProducto === "laberintos"
            ? ""
            : instrucciones
        }
        tamanoTitulo={tamanoTitulo}
        tamanoInstrucciones={tamanoInstrucciones}
        mostrarLogo={mostrarLogo}
        anchoLogo={anchoLogo}
        logoTop={logoTop}
        logoRight={logoRight}
      >
  {pagina.tipo === "juego" && (
    <div
      style={{
        width: "100%",
        height: "100%",
      }}
    >
        {tipoProducto === "laberintos" && (
  <LaminaLaberinto
    numero={indiceLaberinto + 1}
    nivel={nivelPagina}
    filas={configuracionPagina.filas}
    columnas={configuracionPagina.columnas}
    semilla={semillaPagina}
  />
)}

        {tipoProducto === "unir-puntos" && (
          <UnirPuntos
            cantidadPuntos={cantidadPuntos}
            semilla={semillaPagina}
            figura={figuraUnirPuntos}
          />
        )}
      </div>
    )}

    {pagina.tipo === "solucion" && (
      <div
        style={{
          width: "100%",
          height: "100%",
        }}
      >
        {tipoProducto === "laberintos" && (
          <LaminaLaberinto
            numero={indiceLaberinto + 1}
            nivel={nivelPagina}
            filas={configuracionPagina.filas}
            columnas={configuracionPagina.columnas}
            semilla={semillaPagina}
            mostrarSolucion={true}
          />
        )}

        {tipoProducto === "unir-puntos" && (
          <UnirPuntos
            cantidadPuntos={cantidadPuntos}
            semilla={semillaPagina}
            figura={figuraUnirPuntos}
            mostrarSolucion={true}
          />
        )}
      </div>
    )}
  </LaminaBase>
)}
                      </div>
              </div>
            </div>
          </div>

        </section>
      </div>
    </main>
  );
}


/* =========================================================
   CONTROL REUTILIZABLE
========================================================= */

function ControlRango({
  titulo,
  valor,
  min,
  max,
  unidad,
  onChange,
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium text-slate-700">
          {titulo}
        </label>

        <span className="text-xs font-semibold text-slate-500">
          {valor}
          {unidad}
        </span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        value={valor}
        onChange={(e) =>
          onChange(Number(e.target.value))
        }
        className="mt-2 block w-full"
      />
    </div>
  );
}

function EstadoValidacion({
  correcto,
  texto,
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
          correcto
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700"
        }`}
      >
        {correcto ? "✓" : "×"}
      </span>

      <span
        className={
          correcto
            ? "text-slate-700"
            : "text-red-700"
        }
      >
        {texto}
      </span>
    </div>
  );
}