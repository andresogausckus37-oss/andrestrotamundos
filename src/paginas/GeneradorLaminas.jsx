import {
  useEffect,
  useRef,
  useState,
} from "react";

import { generarPdfLaminas } from "../utilidades/generarPdfLaminas";

import PortadaLaberintos from "../generador/comerciales/PortadaLaberintos";
import LaminaFinalLaberintos from "../generador/comerciales/LaminaFinalLaberintos";

import LaminaBase from "../generador/componentes/LaminaBase";
import LaminaLaberinto from "../generador/componentes/LaminaLaberinto";

import { validarLaberinto } from "../generador/juegos/Laberinto";

/* =========================================================
   CONFIGURACIÓN GENERAL
========================================================= */

const ANCHO_A4 = 794;
const ALTO_A4 = 1123;

const CONFIG_LABERINTO = {
  facil: {
    nombre: "Fácil",
    filas: 8,
    columnas: 6,
  },

  medio: {
    nombre: "Medio",
    filas: 12,
    columnas: 9,
  },

  dificil: {
    nombre: "Difícil",
    filas: 16,
    columnas: 12,
  },

  experto: {
    nombre: "Experto",
    filas: 20,
    columnas: 15,
  },

  legendario: {
    nombre: "Legendario",
    filas: 24,
    columnas: 18,
  },
};

const NOMBRE_NIVEL = {
  facil: "Fácil",
  medio: "Medio",
  dificil: "Difícil",
  experto: "Experto",
  legendario: "Legendario",
};

const RANGOS_COMPLEJIDAD = {
  facil: {
    solucion: [15, 37],
    giros: [8, 24],
    callejones: [4, 7],
  },

  medio: {
    solucion: [22, 68],
    giros: [9, 44],
    callejones: [9, 15],
  },

  dificil: {
    solucion: [63, 121],
    giros: [39, 75],
    callejones: [16, 24],
  },

  experto: {
    solucion: [80, 178],
    giros: [51, 114],
    callejones: [26, 39],
  },

  legendario: {
    solucion: [85, 215],
    giros: [45, 141],
    callejones: [35, 51],
  },
};

function normalizarValor(
  valor,
  minimo,
  maximo
) {
  if (maximo === minimo) {
    return 50;
  }

  const resultado =
    ((valor - minimo) /
      (maximo - minimo)) *
    100;

  return Math.max(
    0,
    Math.min(
      100,
      resultado
    )
  );
}

function calcularComplejidad(
  item
) {
  const rangos =
    RANGOS_COMPLEJIDAD[
      item.nivel
    ];

  if (!rangos) {
    return 0;
  }

  const puntuacionSolucion =
    normalizarValor(
      item.longitudSolucion,
      rangos.solucion[0],
      rangos.solucion[1]
    );

  const puntuacionGiros =
    normalizarValor(
      item.cantidadGiros,
      rangos.giros[0],
      rangos.giros[1]
    );

  const puntuacionCallejones =
    normalizarValor(
      item.cantidadCallejones,
      rangos.callejones[0],
      rangos.callejones[1]
    );

  const puntuacion =
    puntuacionSolucion *
      0.4 +
    puntuacionGiros *
      0.35 +
    puntuacionCallejones *
      0.25;

  return Math.round(
    puntuacion
  );
}

function calcularPercentil(
  valores,
  percentil
) {
  if (
    !Array.isArray(valores) ||
    valores.length === 0
  ) {
    return 0;
  }

  const ordenados = [
    ...valores,
  ].sort(
    (a, b) => a - b
  );

  if (ordenados.length === 1) {
    return ordenados[0];
  }

  const posicion =
    (percentil / 100) *
    (ordenados.length - 1);

  const indiceInferior =
    Math.floor(posicion);

  const indiceSuperior =
    Math.ceil(posicion);

  if (
    indiceInferior ===
    indiceSuperior
  ) {
    return ordenados[
      indiceInferior
    ];
  }

  const pesoSuperior =
    posicion -
    indiceInferior;

  const valor =
    ordenados[
      indiceInferior
    ] *
      (1 - pesoSuperior) +
    ordenados[
      indiceSuperior
    ] *
      pesoSuperior;

  return Math.round(valor);
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function GeneradorLaminas() {
  /* =======================================================
     REFERENCIAS
  ======================================================= */

  const contenedorPreviewRef =
    useRef(null);

  const laminaExportarRef =
    useRef(null);

  /* =======================================================
     CONFIGURACIÓN DEL PRODUCTO
  ======================================================= */

  const [
    cantidadFaciles,
    setCantidadFaciles,
  ] = useState(5);

  const [
    cantidadMedios,
    setCantidadMedios,
  ] = useState(10);

  const [
    cantidadDificiles,
    setCantidadDificiles,
  ] = useState(5);

  const [
  cantidadExpertos,
  setCantidadExpertos,
] = useState(0);

const [
  cantidadLegendarios,
  setCantidadLegendarios,
] = useState(0);

  const [semilla, setSemilla] =
    useState(1);

  /* =======================================================
     NAVEGACIÓN
  ======================================================= */

  const [
    paginaActual,
    setPaginaActual,
  ] = useState(0);

  const [
    escalaPreview,
    setEscalaPreview,
  ] = useState(1);

  /* =======================================================
     PDF
  ======================================================= */

  const [
    exportandoPdf,
    setExportandoPdf,
  ] = useState(false);

  const [
    progresoPdf,
    setProgresoPdf,
  ] = useState({
    actual: 0,
    total: 0,
    porcentaje: 0,
  });

  /* =========================================================
     CANTIDAD TOTAL
  ========================================================= */

  const cantidadActividades =
  cantidadFaciles +
  cantidadMedios +
  cantidadDificiles +
  cantidadExpertos +
  cantidadLegendarios;

  /* /* =========================================================
     ACTIVIDADES
  ========================================================= */

  const actividades = [
    /* FÁCIL */

    ...Array.from(
      {
        length: cantidadFaciles,
      },
      (_, index) => ({
        numero: index + 1,
        nivel: "facil",
      })
    ),

    /* MEDIO */

    ...Array.from(
      {
        length: cantidadMedios,
      },
      (_, index) => ({
        numero:
          cantidadFaciles +
          index +
          1,

        nivel: "medio",
      })
    ),

    /* DIFÍCIL */

    ...Array.from(
      {
        length: cantidadDificiles,
      },
      (_, index) => ({
        numero:
          cantidadFaciles +
          cantidadMedios +
          index +
          1,

        nivel: "dificil",
      })
    ),

    /* EXPERTO */

    ...Array.from(
      {
        length: cantidadExpertos,
      },
      (_, index) => ({
        numero:
          cantidadFaciles +
          cantidadMedios +
          cantidadDificiles +
          index +
          1,

        nivel: "experto",
      })
    ),

    /* LEGENDARIO */

    ...Array.from(
      {
        length: cantidadLegendarios,
      },
      (_, index) => ({
        numero:
          cantidadFaciles +
          cantidadMedios +
          cantidadDificiles +
          cantidadExpertos +
          index +
          1,

        nivel: "legendario",
      })
    ),
  ];

  /* =========================================================
     PÁGINAS DE JUEGOS
  ========================================================= */

  const paginasJuegos =
    actividades.map(
      (
        actividad,
        index
      ) => ({
        id: `juego-${actividad.numero}`,

        nombre:
          `Laberinto ${actividad.numero}`,

        tipo: "juego",

        indiceActividad:
          index,

        nivel:
          actividad.nivel,
      })
    );

  /* =========================================================
     PÁGINAS DE SOLUCIONES
  ========================================================= */

  const paginasSoluciones =
    actividades.map(
      (
        actividad,
        index
      ) => ({
        id: `solucion-${actividad.numero}`,

        nombre:
          `Solución ${actividad.numero}`,

        tipo:
          "solucion",

        indiceActividad:
          index,

        nivel:
          actividad.nivel,
      })
    );

  /* =========================================================
     ESTRUCTURA COMPLETA DEL PDF
  ========================================================= */

  const paginas = [
    {
      id:
        "portada",

      nombre:
        "Portada",

      tipo:
        "portada",
    },

    ...paginasJuegos,

    ...paginasSoluciones,

    {
      id:
        "lamina-final",

      nombre:
        "Lámina final",

      tipo:
        "final",
    },
  ];

  const pagina =
    paginas[paginaActual];

  const indiceActividad =
    pagina?.indiceActividad ??
    0;

  const nivelPagina =
    pagina?.nivel ??
    "facil";

  const semillaPagina =
    semilla +
    indiceActividad;

  const configuracionPagina =
    CONFIG_LABERINTO[
      nivelPagina
    ];

  /* =========================================================
     PREVIEW RESPONSIVE
  ========================================================= */

  useEffect(() => {
    const contenedor =
      contenedorPreviewRef.current;

    if (!contenedor) {
      return;
    }

    function calcularEscala() {
      const anchoDisponible =
        contenedor.clientWidth;

      setEscalaPreview(
        Math.min(
          anchoDisponible /
            ANCHO_A4,
          1
        )
      );
    }

    calcularEscala();

    const observer =
      new ResizeObserver(
        calcularEscala
      );

    observer.observe(
      contenedor
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  /* =========================================================
     CORREGIR PÁGINA AL CAMBIAR CANTIDADES
  ========================================================= */

  useEffect(() => {
    if (
      paginaActual >=
      paginas.length
    ) {
      setPaginaActual(
        Math.max(
          paginas.length -
            1,
          0
        )
      );
    }
  }, [
    paginaActual,
    paginas.length,
  ]);

/* =========================================================
   VALIDACIÓN
========================================================= */

const validaciones =
  actividades.map(
    (
      actividad,
      index
    ) => {
      const configuracion =
        CONFIG_LABERINTO[
          actividad.nivel
        ];

      const semillaActividad =
        semilla +
        index;

      const validacion =
        validarLaberinto(
          configuracion.filas,
          configuracion.columnas,
          semillaActividad
        );

      const item = {
        numero:
          actividad.numero,

        nivel:
          actividad.nivel,

        ...validacion,
      };

      return {
        ...item,

        complejidad:
          calcularComplejidad(
            item
          ),
      };
    }
  );

  const cantidadValidos =
    validaciones.filter(
      (item) =>
        item.valido
    ).length;

  const productoValido =
    cantidadActividades >
      0 &&
    cantidadValidos ===
      cantidadActividades;

  const resumenPorNivel =
  Object.keys(
    CONFIG_LABERINTO
  ).map((nivel) => {
    const itemsNivel =
      validaciones.filter(
        (item) =>
          item.nivel ===
          nivel
      );

    if (
      itemsNivel.length === 0
    ) {
      return null;
    }

    const totalSolucion =
      itemsNivel.reduce(
        (acumulado, item) =>
          acumulado +
          item.longitudSolucion,
        0
      );

    const totalGiros =
      itemsNivel.reduce(
        (acumulado, item) =>
          acumulado +
          item.cantidadGiros,
        0
      );

    const totalCallejones =
  itemsNivel.reduce(
    (acumulado, item) =>
      acumulado +
      item.cantidadCallejones,
    0
  );

    const totalDensidadGiros =
  itemsNivel.reduce(
    (acumulado, item) =>
      acumulado +
      item.densidadGiros,
    0
  );

const totalDensidadCallejones =
  itemsNivel.reduce(
    (acumulado, item) =>
      acumulado +
      item.densidadCallejones,
    0
  );

    const totalRecorrido =
      itemsNivel.reduce(
        (acumulado, item) =>
          acumulado +
          item.porcentajeRecorrido,
        0
      );

    const soluciones =
      itemsNivel.map(
        (item) =>
          item.longitudSolucion
      );

    const giros =
      itemsNivel.map(
        (item) =>
          item.cantidadGiros
      );

    const callejones =
  itemsNivel.map(
    (item) =>
      item.cantidadCallejones
  );

    const complejidades =
  itemsNivel.map(
    (item) =>
      item.complejidad
  );

    const percentilesSolucion = {
  p05: calcularPercentil(
    soluciones,
    5
  ),

  p25: calcularPercentil(
    soluciones,
    25
  ),

  p50: calcularPercentil(
    soluciones,
    50
  ),

  p75: calcularPercentil(
    soluciones,
    75
  ),

  p95: calcularPercentil(
    soluciones,
    95
  ),
};

const percentilesGiros = {
  p05: calcularPercentil(
    giros,
    5
  ),

  p25: calcularPercentil(
    giros,
    25
  ),

  p50: calcularPercentil(
    giros,
    50
  ),

  p75: calcularPercentil(
    giros,
    75
  ),

  p95: calcularPercentil(
    giros,
    95
  ),
};

const percentilesCallejones = {
  p05: calcularPercentil(
    callejones,
    5
  ),

  p25: calcularPercentil(
    callejones,
    25
  ),

  p50: calcularPercentil(
    callejones,
    50
  ),

  p75: calcularPercentil(
    callejones,
    75
  ),

  p95: calcularPercentil(
    callejones,
    95
  ),
};

const percentilesComplejidad = {
  p05: calcularPercentil(
    complejidades,
    5
  ),

  p25: calcularPercentil(
    complejidades,
    25
  ),

  p50: calcularPercentil(
    complejidades,
    50
  ),

  p75: calcularPercentil(
    complejidades,
    75
  ),

  p95: calcularPercentil(
    complejidades,
    95
  ),
};

const totalComplejidad =
  complejidades.reduce(
    (acumulado, valor) =>
      acumulado + valor,
    0
  );

    const recorridos =
      itemsNivel.map(
        (item) =>
          item.porcentajeRecorrido
      );

    const densidadesGiros =
  itemsNivel.map(
    (item) =>
      item.densidadGiros
  );

const densidadesCallejones =
  itemsNivel.map(
    (item) =>
      item.densidadCallejones
  );

  return {
  nivel,

  cantidad:
    itemsNivel.length,

  /* PROMEDIOS */

  promedioSolucion:
    Math.round(
      totalSolucion /
        itemsNivel.length
    ),

  promedioGiros:
    Math.round(
      totalGiros /
        itemsNivel.length
    ),

  promedioCallejones:
    Math.round(
      totalCallejones /
        itemsNivel.length
    ),

  promedioRecorrido:
    Math.round(
      totalRecorrido /
        itemsNivel.length
    ),

  promedioDensidadGiros:
    Math.round(
      totalDensidadGiros /
        itemsNivel.length
    ),

  promedioDensidadCallejones:
    Math.round(
      totalDensidadCallejones /
        itemsNivel.length
    ),

  /* MÍNIMOS */

  minimoSolucion:
    Math.min(
      ...soluciones
    ),

  minimoGiros:
    Math.min(
      ...giros
    ),

  minimoCallejones:
    Math.min(
      ...callejones
    ),

  minimoRecorrido:
    Math.min(
      ...recorridos
    ),

  minimoDensidadGiros:
    Math.min(
      ...densidadesGiros
    ),

  minimoDensidadCallejones:
    Math.min(
      ...densidadesCallejones
    ),

  /* MÁXIMOS */

  maximoSolucion:
    Math.max(
      ...soluciones
    ),

  maximoGiros:
    Math.max(
      ...giros
    ),

  maximoCallejones:
    Math.max(
      ...callejones
    ),

  maximoRecorrido:
    Math.max(
      ...recorridos
    ),

  maximoDensidadGiros:
    Math.max(
      ...densidadesGiros
    ),

  maximoDensidadCallejones:
    Math.max(
      ...densidadesCallejones
    ),

    promedioComplejidad:
  Math.round(
    totalComplejidad /
      itemsNivel.length
  ),

minimoComplejidad:
  Math.min(
    ...complejidades
  ),

maximoComplejidad:
  Math.max(
    ...complejidades
  ),
percentilesSolucion,
percentilesGiros,
percentilesCallejones,
percentilesComplejidad,
    
};
}).filter(Boolean);

    /* =========================================================
     GENERAR NUEVO CONJUNTO
  ========================================================= */

  function generarNuevoConjunto() {
    setSemilla(
      (actual) =>
        actual + 1
    );

    setPaginaActual(0);
  }

  /* =========================================================
     GENERAR PDF
  ========================================================= */

  async function descargarPdfCompleto() {
    if (
      exportandoPdf ||
      paginas.length === 0
    ) {
      return;
    }

    setExportandoPdf(true);

    setProgresoPdf({
      actual: 0,
      total:
        paginas.length,
      porcentaje: 0,
    });

    try {
      await generarPdfLaminas({
        totalPaginas:
          paginas.length,

        cambiarPagina:
          async (
            indice
          ) => {
            setPaginaActual(
              indice
            );

            await new Promise(
              (
                resolve
              ) => {
                requestAnimationFrame(
                  () => {
                    requestAnimationFrame(
                      resolve
                    );
                  }
                );
              }
            );
          },

        obtenerElemento:
          () =>
            laminaExportarRef.current,

        nombreArchivo:
          "Laberintos-Toby-y-Luna.pdf",

        calidad:
          0.92,

        pixelRatio:
          1.5,

        alActualizarProgreso:
          ({
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
      console.error(
        error
      );

      alert(
        "No se pudo generar el PDF. Revisá la consola."
      );
    } finally {
      setExportandoPdf(
        false
      );
    }
  }

  /* =========================================================
     SIN ACTIVIDADES
  ========================================================= */

  if (!pagina) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-5 text-center shadow-sm">
          <p className="font-bold text-slate-900">
            No hay actividades
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Agregá al menos una actividad.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">
      <div className="mx-auto w-full max-w-7xl px-3 py-4">

        {/* =====================================================
            PANEL PRINCIPAL
        ====================================================== */}

        <section className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">

          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Generador de laberintos
              </h1>

              <p className="text-xs text-slate-500">
                Toby y Luna Imprimibles
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {
                cantidadActividades
              }{" "}
              actividades
            </span>
          </div>

          {/* =================================================
              NIVELES
          ================================================== */}

          <div className="mt-4">

            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Cantidad por nivel
            </p>

            <div className="mt-2 grid grid-cols-3 gap-2">

              <Cantidad
                titulo="Fácil"
                valor={
                  cantidadFaciles
                }
                onChange={
                  setCantidadFaciles
                }
              />

              <Cantidad
                titulo="Medio"
                valor={
                  cantidadMedios
                }
                onChange={
                  setCantidadMedios
                }
              />

              <Cantidad
                titulo="Difícil"
                valor={
                  cantidadDificiles
                }
                onChange={
                  setCantidadDificiles
                }
              />

              <Cantidad
                titulo="Experto"
                valor={
                  cantidadExpertos
                }
                onChange={
                  setCantidadExpertos
                }
              />

              <Cantidad
                titulo="Legendario"
                valor={
                  cantidadLegendarios
                }
                onChange={
                  setCantidadLegendarios
                }
              />

            </div>
          </div>

          {/* =================================================
              ACCIONES
          ================================================== */}

          <div className="mt-4 grid gap-2 sm:grid-cols-2">

            <button
              type="button"
              onClick={
                generarNuevoConjunto
              }
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white"
            >
              Generar nuevo conjunto
            </button>

            <button
              type="button"
              onClick={
                descargarPdfCompleto
              }
              disabled={
                exportandoPdf
              }
              className={`rounded-xl px-4 py-2.5 text-sm font-bold ${
                exportandoPdf
                  ? "bg-slate-300 text-slate-600"
                  : "bg-sky-500 text-white"
              }`}
            >
              {exportandoPdf
                ? `PDF ${progresoPdf.porcentaje}%`
                : "Descargar PDF"}
            </button>

          </div>

          {/* =================================================
              PROGRESO PDF
          ================================================== */}

          {exportandoPdf && (
            <div className="mt-3">

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">

                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{
                    width:
                      `${progresoPdf.porcentaje}%`,
                  }}
                />

              </div>

              <p className="mt-1 text-center text-[11px] font-semibold text-slate-500">
                {
                  progresoPdf.actual
                }{" "}
                de{" "}
                {
                  progresoPdf.total
                }{" "}
                páginas
              </p>

            </div>
          )}

        </section>

        {/* =====================================================
            VALIDACIÓN
        ====================================================== */}

        <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">

          <div className="flex items-center justify-between gap-3">

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Validación
              </h2>

              <p className="text-[11px] text-slate-500">
                Entrada, salida y solución.
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                productoValido
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {
                cantidadValidos
              }
              /
              {
                cantidadActividades
              }
            </span>

          </div>

          <div className="mt-3 max-h-96 space-y-1.5 overflow-y-auto">

            {validaciones.map(
  (item) => (
    <div
      key={item.numero}
      className="rounded-lg bg-slate-50 px-2.5 py-2"
    >

        <section className="mt-5 rounded-2xl bg-white p-4 shadow-sm">

  <div className="mb-4">

    <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
      Estadísticas
    </p>

    <h3 className="mt-1 text-base font-bold text-slate-800">
      Resumen por nivel
    </h3>

    <p className="mt-1 text-xs text-slate-500">
      Promedios, mínimos y máximos de los laberintos generados.
    </p>

  </div>

  <div className="space-y-3">

    {resumenPorNivel.map(
      (resumen) => (
        <div
          key={
            resumen.nivel
          }
          className="rounded-xl bg-slate-50 p-3"
        >

          <div className="mb-3 flex items-center justify-between gap-2">

            <p className="text-sm font-bold text-slate-800">
              {
                NOMBRE_NIVEL[
                  resumen.nivel
                ]
              }
            </p>

            <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-slate-500">
              {
                resumen.cantidad
              }{" "}
              laberintos
            </span>

          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">

            <div className="rounded-lg bg-white p-2 text-center">

  <p className="text-[9px] font-semibold uppercase text-slate-400">
    Callejones
  </p>

  <p className="mt-1 text-sm font-bold text-slate-700">
    {resumen.promedioCallejones}
  </p>

  <p className="text-[9px] text-slate-400">
    {resumen.minimoCallejones}
    {" - "}
    {resumen.maximoCallejones}
  </p>          

</div>

            <div className="mt-1 text-[9px] leading-4 text-slate-500">
  P05 {resumen.percentilesCallejones.p05}
  {" · "}
  P25 {resumen.percentilesCallejones.p25}
  {" · "}
  P50 {resumen.percentilesCallejones.p50}
  {" · "}
  P75 {resumen.percentilesCallejones.p75}
  {" · "}
  P95 {resumen.percentilesCallejones.p95}
</div>       

            <div className="rounded-lg bg-white p-2 text-center">

              <p className="text-[9px] font-semibold uppercase text-slate-400">
                Solución
              </p>

              <p className="mt-1 text-sm font-bold text-slate-700">
                {
                  resumen.promedioSolucion
                }
              </p>

              <p className="text-[9px] text-slate-400">
                {
                  resumen.minimoSolucion
                }
                {" - "}
                {
                  resumen.maximoSolucion
                }
              </p>

            </div>

            <div className="mt-1 text-[9px] leading-4 text-slate-500">
  P05 {resumen.percentilesSolucion.p05}
  {" · "}
  P25 {resumen.percentilesSolucion.p25}
  {" · "}
  P50 {resumen.percentilesSolucion.p50}
  {" · "}
  P75 {resumen.percentilesSolucion.p75}
  {" · "}
  P95 {resumen.percentilesSolucion.p95}
</div>

            <div className="rounded-lg bg-white p-2 text-center">

              <p className="text-[9px] font-semibold uppercase text-slate-400">
                Giros
              </p>

              <p className="mt-1 text-sm font-bold text-slate-700">
                {
                  resumen.promedioGiros
                }
              </p>

              <p className="text-[9px] text-slate-400">
                {
                  resumen.minimoGiros
                }
                {" - "}
                {
                  resumen.maximoGiros
                }
              </p>

            </div>

            <div className="mt-1 text-[9px] leading-4 text-slate-500">
  P05 {resumen.percentilesGiros.p05}
  {" · "}
  P25 {resumen.percentilesGiros.p25}
  {" · "}
  P50 {resumen.percentilesGiros.p50}
  {" · "}
  P75 {resumen.percentilesGiros.p75}
  {" · "}
  P95 {resumen.percentilesGiros.p95}
</div>

            <div className="rounded-lg bg-white p-2 text-center">

              <p className="text-[9px] font-semibold uppercase text-slate-400">
                Recorrido
              </p>

              <p className="mt-1 text-sm font-bold text-slate-700">
                {
                  resumen.promedioRecorrido
                }
                %
              </p>

              <p className="text-[9px] text-slate-400">
                {
                  resumen.minimoRecorrido
                }
                %
                {" - "}
                {
                  resumen.maximoRecorrido
                }
                %
              </p>

            </div>

<div className="mt-2 grid grid-cols-2 gap-2">

  <div className="rounded-lg bg-white p-2 text-center">

    <p className="text-[9px] font-semibold uppercase text-slate-400">
      Dens. giros
    </p>

    <p className="mt-1 text-sm font-bold text-slate-700">
      {resumen.promedioDensidadGiros}%
    </p>

    <p className="text-[9px] text-slate-400">
      {resumen.minimoDensidadGiros}%
      {" - "}
      {resumen.maximoDensidadGiros}%
    </p>

  </div>

  <div className="rounded-lg bg-white p-2 text-center">

    <p className="text-[9px] font-semibold uppercase text-slate-400">
      Dens. callejones
    </p>

    <p className="mt-1 text-sm font-bold text-slate-700">
      {resumen.promedioDensidadCallejones}%
    </p>

    <p className="text-[9px] text-slate-400">
      {resumen.minimoDensidadCallejones}%
      {" - "}
      {resumen.maximoDensidadCallejones}%
    </p>

  </div>

  <div className="mt-2 rounded-lg bg-slate-900 p-2 text-center">

    <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
      Complejidad interna
    </p>

    <p className="mt-1 text-sm font-bold text-white">
      {resumen.promedioComplejidad}/100
    </p>

    <p className="text-[9px] text-slate-400">
      {resumen.minimoComplejidad}
      {" - "}
      {resumen.maximoComplejidad}
    </p>

  </div>

  <div className="mt-1 text-[9px] leading-4 text-slate-400">
  P05 {resumen.percentilesComplejidad.p05}
  {" · "}
  P25 {resumen.percentilesComplejidad.p25}
  {" · "}
  P50 {resumen.percentilesComplejidad.p50}
  {" · "}
  P75 {resumen.percentilesComplejidad.p75}
  {" · "}
  P95 {resumen.percentilesComplejidad.p95}
</div>

</div>
            

          </div>

        </div>
      )
    )}

  </div>

</section>

      {/* CABECERA */}

      <div className="flex items-center justify-between gap-2">

        <div className="flex min-w-0 items-center gap-2">

          <span
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              item.valido
                ? "bg-emerald-100 text-emerald-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {item.valido
              ? "✓"
              : "×"}
          </span>

          <span className="truncate text-xs font-semibold text-slate-700">
            Laberinto{" "}
            {item.numero}{" "}
            ·{" "}
            {
              NOMBRE_NIVEL[
                item.nivel
              ]
            }
          </span>

        </div>

        <span
          className={`shrink-0 text-[10px] font-bold ${
            item.valido
              ? "text-emerald-600"
              : "text-red-600"
          }`}
        >
          {item.valido
            ? "VÁLIDO"
            : "ERROR"}
        </span>

      </div>

      {/* MÉTRICAS */}

      <div className="mt-2 grid grid-cols-5 gap-1.5">

        <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase text-slate-400">
            Celdas
          </p>

          <p className="text-xs font-bold text-slate-700">
            {item.totalCeldas}
          </p>
        </div>

        <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase text-slate-400">
            Solución
          </p>

          <p className="text-xs font-bold text-slate-700">
            {
              item.longitudSolucion
            }
          </p>
        </div>

        <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase text-slate-400">
            Giros
          </p>

          <p className="text-xs font-bold text-slate-700">
            {
              item.cantidadGiros
            }
          </p>
        </div>

        <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
  <p className="text-[9px] font-semibold uppercase text-slate-400">
    Callejones
  </p>

  <p className="text-xs font-bold text-slate-700">
    {item.cantidadCallejones}
  </p>
</div>

        <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
          <p className="text-[9px] font-semibold uppercase text-slate-400">
            Recorrido
          </p>

          <p className="text-xs font-bold text-slate-700">
            {
              item.porcentajeRecorrido
            }
            %
          </p>
        </div>

        <div className="mt-1.5 grid grid-cols-2 gap-1.5">

  <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
    <p className="text-[9px] font-semibold uppercase text-slate-400">
      Dens. giros
    </p>

    <p className="text-xs font-bold text-slate-700">
      {item.densidadGiros}%
    </p>
  </div>

  <div className="rounded-md bg-white px-1.5 py-1.5 text-center">
    <p className="text-[9px] font-semibold uppercase text-slate-400">
      Dens. callejones
    </p>

    <p className="text-xs font-bold text-slate-700">
      {item.densidadCallejones}%
    </p>
  </div>

</div>

      </div>

    </div>
  )
)}

</div>

{productoValido && (
  <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center">

    <p className="text-xs font-bold text-emerald-700">
      ✓ PRODUCTO LISTO
    </p>

  </div>
)}

</section>

                {/* =====================================================
            NAVEGACIÓN
        ====================================================== */}

        <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm">

          <div className="flex items-center justify-between gap-3">

            <button
              type="button"
              onClick={() =>
                setPaginaActual(
                  (
                    actual
                  ) =>
                    Math.max(
                      actual -
                        1,
                      0
                    )
                )
              }
              disabled={
                paginaActual ===
                0
              }
              className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 text-lg font-bold disabled:opacity-30"
            >
              ←
            </button>

            <div className="min-w-0 text-center">

              <p className="truncate text-sm font-bold text-slate-900">
                {
                  pagina.nombre
                }
              </p>

              <p className="text-[11px] text-slate-500">
                Página{" "}
                {
                  paginaActual +
                  1
                }{" "}
                de{" "}
                {
                  paginas.length
                }
              </p>

            </div>

            <button
              type="button"
              onClick={() =>
                setPaginaActual(
                  (
                    actual
                  ) =>
                    Math.min(
                      actual +
                        1,
                      paginas.length -
                        1
                    )
                )
              }
              disabled={
                paginaActual ===
                paginas.length -
                  1
              }
              className="h-10 w-10 shrink-0 rounded-xl border border-slate-200 text-lg font-bold disabled:opacity-30"
            >
              →
            </button>

          </div>

          {/* =================================================
              SELECTOR DE PÁGINA
          ================================================== */}

          <select
            value={
              paginaActual
            }
            onChange={(e) =>
              setPaginaActual(
                Number(
                  e.target.value
                )
              )
            }
            className={`${CLASE_CAMPO} mt-3`}
          >
            {paginas.map(
              (
                item,
                index
              ) => (
                <option
                  key={
                    item.id
                  }
                  value={
                    index
                  }
                >
                  {
                    index +
                    1
                  }
                  .{" "}
                  {
                    item.nombre
                  }
                </option>
              )
            )}
          </select>

        </section>

        {/* =====================================================
            PREVIEW
        ====================================================== */}

        <section className="mt-3">

          <div className="mb-2 flex items-center justify-between">

            <div>
              <p className="text-xs font-bold text-slate-700">
                Vista previa
              </p>

              <p className="text-[11px] text-slate-500">
                A4 · 210 × 297 mm
              </p>
            </div>

            <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold text-slate-500 shadow-sm">
              {Math.round(
                escalaPreview *
                  100
              )}
              %
            </span>

          </div>

          <div
            ref={
              contenedorPreviewRef
            }
            className="w-full overflow-hidden"
          >

            <div
              className="mx-auto"
              style={{
                width:
                  ANCHO_A4 *
                  escalaPreview,

                height:
                  ALTO_A4 *
                  escalaPreview,
              }}
            >

              <div
                style={{
                  width:
                    ANCHO_A4,

                  height:
                    ALTO_A4,

                  transform:
                    `scale(${escalaPreview})`,

                  transformOrigin:
                    "top left",
                }}
              >

                <div
                  ref={
                    laminaExportarRef
                  }
                  style={{
                    width:
                      ANCHO_A4,

                    height:
                      ALTO_A4,
                  }}
                >

                  {/* =========================================
                      PORTADA
                  ========================================== */}

                  {pagina.tipo ===
                  "portada" ? (

                    <PortadaLaberintos
                      cantidad={
                        cantidadActividades
                      }
                      faciles={
                        cantidadFaciles
                      }
                      medios={
                        cantidadMedios
                      }
                      dificiles={
                        cantidadDificiles
                      }
                    />

                  ) : pagina.tipo ===
                    "final" ? (

                    /* =======================================
                       LÁMINA FINAL
                    ======================================== */

                    <LaminaFinalLaberintos />

                  ) : (

                    /* =======================================
                       JUEGO / SOLUCIÓN
                    ======================================== */

                    <LaminaBase
                      titulo=""
                      instrucciones=""
                    >

                      <LaminaLaberinto
                        numero={
                          indiceActividad +
                          1
                        }
                        nivel={
                          nivelPagina
                        }
                        filas={
                          configuracionPagina.filas
                        }
                        columnas={
                          configuracionPagina.columnas
                        }
                        semilla={
                          semillaPagina
                        }
                        mostrarSolucion={
                          pagina.tipo ===
                          "solucion"
                        }
                      />

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
   ESTILOS REUTILIZABLES
========================================================= */

const CLASE_CAMPO =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400";

/* =========================================================
   CANTIDAD
========================================================= */

function Cantidad({
  titulo,
  valor,
  onChange,
}) {
  return (
    <label className="block">

      <span className="block text-center text-[11px] font-semibold text-slate-500">
        {titulo}
      </span>

      <input
        type="number"
        min="0"
        max="10000"
        value={
          valor
        }
        onChange={(e) =>
          onChange(
            Math.min(
              Math.max(
                Number(
                  e.target.value
                ),
                0
              ),
              10000
            )
          )
        }
        className="mt-1 w-full rounded-xl border border-slate-200 px-2 py-2 text-center text-sm font-bold outline-none focus:border-sky-400"
      />

    </label>
  );
}