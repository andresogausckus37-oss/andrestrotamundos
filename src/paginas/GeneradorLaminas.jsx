import {
  useEffect,
  useMemo,
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

const VALIDACIONES_POR_PAGINA = 25;

const LIMITE_SELECTOR_PAGINAS = 300;

/* =========================================================
   NIVELES
========================================================= */

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
      nombre: "Dificil",
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

/* =========================================================
   RANGOS PROVISIONALES DE COMPLEJIDAD
========================================================= */

const RANGOS_COMPLEJIDAD = {
  facil: {
    solucion: [15, 37],
    giros: [7, 24],
    callejones: [3, 7],
  },

  medio: {
    solucion: [28, 78],
    giros: [15, 48],
    callejones: [8, 15],
  },

  dificil: {
    solucion: [43, 121],
    giros: [25, 78],
    callejones: [16, 24],
  },

  experto: {
    solucion: [62, 180],
    giros: [37, 116],
    callejones: [26, 36],
  },

  legendario: {
    solucion: [93, 259],
    giros: [57, 167],
    callejones: [38, 51],
  },
};

const BANDAS_COMPLEJIDAD = {
  muyBaja: {
    nombre: "Muy baja",
    minimo: 0,
    maximo: 20,
  },

  baja: {
    nombre: "Baja",
    minimo: 21,
    maximo: 40,
  },

  media: {
    nombre: "Media",
    minimo: 41,
    maximo: 60,
  },

  alta: {
    nombre: "Alta",
    minimo: 61,
    maximo: 80,
  },

  muyAlta: {
    nombre: "Muy alta",
    minimo: 81,
    maximo: 100,
  },
};

/* =========================================================
   NORMALIZACIÓN
========================================================= */

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

/* =========================================================
   COMPLEJIDAD
========================================================= */

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
    puntuacionSolucion * 0.4 +
    puntuacionGiros * 0.35 +
    puntuacionCallejones * 0.25;

  return Math.round(
    puntuacion
  );
}

function obtenerBandaComplejidad(
  complejidad
) {
  const entrada =
    Object.values(
      BANDAS_COMPLEJIDAD
    ).find(
      (banda) =>
        complejidad >=
          banda.minimo &&
        complejidad <=
          banda.maximo
    );

  return entrada
    ? entrada.nombre
    : "Sin clasificar";
}

function calcularObjetivoBandas(cantidad) {
  const bandas = [
    "Muy baja",
    "Baja",
    "Media",
    "Alta",
    "Muy alta",
  ];

  const objetivo = {
    "Muy baja": 0,
    Baja: 0,
    Media: 0,
    Alta: 0,
    "Muy alta": 0,
  };

  if (
    !Number.isFinite(cantidad) ||
    cantidad <= 0
  ) {
    return objetivo;
  }

  const cantidadEntera =
    Math.floor(cantidad);

  const cantidadBase =
    Math.floor(
      cantidadEntera /
        bandas.length
    );

  let sobrantes =
    cantidadEntera %
    bandas.length;

  bandas.forEach(
    (banda) => {
      objetivo[banda] =
        cantidadBase +
        (sobrantes > 0
          ? 1
          : 0);

      if (sobrantes > 0) {
        sobrantes -= 1;
      }
    }
  );

  return objetivo;
}

function calcularFaltantesPorBanda(
  items,
  cantidad
) {
  const objetivo =
    calcularObjetivoBandas(
      cantidad
    );

  const disponibles =
    contarBandasComplejidad(
      items
    );

  return {
    "Muy baja":
      Math.max(
        0,
        objetivo["Muy baja"] -
          (disponibles["Muy baja"] ?? 0)
      ),

    Baja:
      Math.max(
        0,
        objetivo.Baja -
          (disponibles.Baja ?? 0)
      ),

    Media:
      Math.max(
        0,
        objetivo.Media -
          (disponibles.Media ?? 0)
      ),

    Alta:
      Math.max(
        0,
        objetivo.Alta -
          (disponibles.Alta ?? 0)
      ),

    "Muy alta":
      Math.max(
        0,
        objetivo["Muy alta"] -
          (disponibles["Muy alta"] ?? 0)
      ),
  };
}

function generarCandidatosDirigidos({
  nivel,
  faltantes,
  semillaInicial,
  maxIntentos = 1000,
}) {
  const configuracion =
    CONFIG_LABERINTO[nivel];

  if (!configuracion) {
    return {
      encontrados: [],
      pendientes: faltantes,
      intentos: 0,
      completo: false,
    };
  }

  const pendientes = {
    "Muy baja":
      faltantes["Muy baja"] ?? 0,

    Baja:
      faltantes.Baja ?? 0,

    Media:
      faltantes.Media ?? 0,

    Alta:
      faltantes.Alta ?? 0,

    "Muy alta":
      faltantes["Muy alta"] ?? 0,
  };

  const totalObjetivo =
    Object.values(
      pendientes
    ).reduce(
      (total, cantidad) =>
        total + cantidad,
      0
    );

  const encontrados = [];

  let semillaCandidata =
    semillaInicial;

  let intentos = 0;

  while (
    encontrados.length <
      totalObjetivo &&
    intentos < maxIntentos
  ) {
    const validacion =
      validarLaberinto(
        configuracion.filas,
        configuracion.columnas,
        semillaCandidata
      );

    const item = {
      nivel,
      ...validacion,
    };

    const complejidad =
      calcularComplejidad(
        item
      );

    const bandaComplejidad =
      obtenerBandaComplejidad(
        complejidad
      );

    if (
      validacion.valido &&
      (
        pendientes[
          bandaComplejidad
        ] ?? 0
      ) > 0
    ) {
      encontrados.push({
  ...item,

  complejidad,

  bandaComplejidad,

  semillaLaberinto:
    semillaCandidata,

  esGenerado:
    true,
});

      pendientes[
        bandaComplejidad
      ] -= 1;
    }

    semillaCandidata += 1;
    intentos += 1;
  }

  const completo =
    Object.values(
      pendientes
    ).every(
      (cantidad) =>
        cantidad === 0
    );

  return {
    encontrados,
    pendientes,
    intentos,
    completo,
  };
}

function contarBandasComplejidad(
  items
) {
  const resultado = {
    "Muy baja": 0,
    Baja: 0,
    Media: 0,
    Alta: 0,
    "Muy alta": 0,
  };

  items.forEach(
    (item) => {
      if (
        resultado[
          item.bandaComplejidad
        ] !== undefined
      ) {
        resultado[
          item.bandaComplejidad
        ] += 1;
      }
    }
  );

  return resultado;
}

function filtrarPorBandaComplejidad(
  items,
  bandaObjetivo
) {
  if (
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return [];
  }

  return items.filter(
    (item) =>
      item.bandaComplejidad ===
      bandaObjetivo
  );
}

function seleccionarPorComplejidad({
  items,
  banda,
  cantidad,
}) {
  const candidatos =
    filtrarPorBandaComplejidad(
      items,
      banda
    );

  if (
    candidatos.length === 0 ||
    cantidad <= 0
  ) {
    return [];
  }

  const ordenados =
    [...candidatos].sort(
      (a, b) =>
        a.complejidad -
        b.complejidad
    );

  if (
    ordenados.length <=
    cantidad
  ) {
    return ordenados;
  }

  const seleccion = [];

  if (cantidad === 1) {
    const indiceCentral =
      Math.floor(
        ordenados.length /
          2
      );

    return [
      ordenados[
        indiceCentral
      ],
    ];
  }

  for (
    let i = 0;
    i < cantidad;
    i += 1
  ) {
    const posicion =
      i /
      (cantidad - 1);

    const indice =
      Math.round(
        posicion *
          (ordenados.length - 1)
      );

    seleccion.push(
      ordenados[indice]
    );
  }

  return seleccion;
}

function seleccionarProgresivo({
  items,
  cantidad,
}) {
  if (
    !Array.isArray(items) ||
    items.length === 0 ||
    cantidad <= 0
  ) {
    return [];
  }

  const objetivo =
    Math.min(
      cantidad,
      items.length
    );

  const bandas = [
    "Muy baja",
    "Baja",
    "Media",
    "Alta",
    "Muy alta",
  ];

  const cantidadBase =
    Math.floor(
      objetivo /
        bandas.length
    );

  let sobrantes =
    objetivo %
    bandas.length;

  const seleccion = [];
  const seleccionados =
    new Set();

  bandas.forEach(
    (banda) => {
      const cantidadBanda =
        cantidadBase +
        (
          sobrantes > 0
            ? 1
            : 0
        );

      if (
        sobrantes > 0
      ) {
        sobrantes -= 1;
      }

      const candidatos =
        seleccionarPorComplejidad({
          items,
          banda,
          cantidad:
            cantidadBanda,
        });

      candidatos.forEach(
        (item) => {
          if (
            !seleccionados.has(
              item
            )
          ) {
            seleccionados.add(
              item
            );

            seleccion.push(
              item
            );
          }
        }
      );
    }
  );

  /* =====================================================
     COMPLETAR FALTANTES
  ===================================================== */

  const faltantes =
    objetivo -
    seleccion.length;

  if (
    faltantes > 0
  ) {
    const disponibles =
      items
        .filter(
          (item) =>
            !seleccionados.has(
              item
            )
        )
        .sort(
          (a, b) =>
            a.complejidad -
            b.complejidad
        );

    if (
      faltantes >=
      disponibles.length
    ) {
      seleccion.push(
        ...disponibles
      );
    } else if (
      faltantes === 1
    ) {
      seleccion.push(
        disponibles[
          Math.floor(
            disponibles.length /
              2
          )
        ]
      );
    } else {
      for (
        let i = 0;
        i < faltantes;
        i += 1
      ) {
        const posicion =
          i /
          (faltantes - 1);

        const indice =
          Math.round(
            posicion *
              (
                disponibles.length -
                1
              )
          );

        seleccion.push(
          disponibles[indice]
        );
      }
    }
  }

  return seleccion.sort(
    (a, b) =>
      a.complejidad -
      b.complejidad
  );
}

/* =========================================================
   PERCENTILES

   Ordenamos cada conjunto una sola vez.
   Esto evita ordenar el mismo array cinco veces.
========================================================= */

function calcularPercentiles(
  valores
) {
  if (
    !Array.isArray(valores) ||
    valores.length === 0
  ) {
    return {
      p05: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p95: 0,
    };
  }

  const ordenados = [
    ...valores,
  ].sort(
    (a, b) => a - b
  );

  function obtener(
    percentil
  ) {
    if (
      ordenados.length === 1
    ) {
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

    return Math.round(
      valor
    );
  }

  return {
    p05: obtener(5),
    p25: obtener(25),
    p50: obtener(50),
    p75: obtener(75),
    p95: obtener(95),
  };
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

  const [modoGeneracion, setModoGeneracion] =
  useState("aleatorio");

  const [
    semilla,
    setSemilla,
  ] = useState(1);

  /* =======================================================
     NAVEGACIÓN DEL PRODUCTO
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
     NAVEGACIÓN DE VALIDACIONES
  ======================================================= */

  const [
    paginaValidacion,
    setPaginaValidacion,
  ] = useState(0);

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

  /* =======================================================
     CANTIDAD TOTAL
  ======================================================= */

  const cantidadActividades =
    cantidadFaciles +
    cantidadMedios +
    cantidadDificiles +
    cantidadExpertos +
    cantidadLegendarios;

  /* =======================================================
     ACTIVIDADES

     useMemo evita reconstruir miles de objetos al cambiar
     solamente la página visible.
  ======================================================= */

  const actividades =
    useMemo(
      () => [
        /* FÁCIL */

        ...Array.from(
          {
            length:
              cantidadFaciles,
          },
          (
            _,
            index
          ) => ({
            numero:
              index + 1,

            nivel:
              "facil",
          })
        ),

        /* MEDIO */

        ...Array.from(
          {
            length:
              cantidadMedios,
          },
          (
            _,
            index
          ) => ({
            numero:
              cantidadFaciles +
              index +
              1,

            nivel:
              "medio",
          })
        ),

        /* DIFÍCIL */

        ...Array.from(
          {
            length:
              cantidadDificiles,
          },
          (
            _,
            index
          ) => ({
            numero:
              cantidadFaciles +
              cantidadMedios +
              index +
              1,

            nivel:
              "dificil",
          })
        ),

        /* EXPERTO */

        ...Array.from(
          {
            length:
              cantidadExpertos,
          },
          (
            _,
            index
          ) => ({
            numero:
              cantidadFaciles +
              cantidadMedios +
              cantidadDificiles +
              index +
              1,

            nivel:
              "experto",
          })
        ),

        /* LEGENDARIO */

        ...Array.from(
          {
            length:
              cantidadLegendarios,
          },
          (
            _,
            index
          ) => ({
            numero:
              cantidadFaciles +
              cantidadMedios +
              cantidadDificiles +
              cantidadExpertos +
              index +
              1,

            nivel:
              "legendario",
          })
        ),
      ],
      [
        cantidadFaciles,
        cantidadMedios,
        cantidadDificiles,
        cantidadExpertos,
        cantidadLegendarios,
      ]
    );

  const validaciones =
    useMemo(
      () =>
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
  numero: actividad.numero,
  nivel: actividad.nivel,
  indiceActividad: index,
              semillaLaberinto: semillaActividad,
  ...validacion,
};

            const complejidad =
  calcularComplejidad(
    item
  );

return {
  ...item,

  complejidad,

  bandaComplejidad:
    obtenerBandaComplejidad(
      complejidad
    ),
};
          }
        ),
      [
        actividades,
        semilla,
      ]
    );

  const validacionesFinales =
  useMemo(
    () => {
      if (
        modoGeneracion ===
        "aleatorio"
      ) {
        return validaciones;
      }

      const niveles = [
        "facil",
        "medio",
        "dificil",
        "experto",
        "legendario",
      ];

      const resultado = [];

      niveles.forEach(
        (nivel) => {
          const itemsNivel =
            validaciones.filter(
              (item) =>
                item.nivel ===
                nivel
            );

          const seleccion =
            seleccionarProgresivo({
              items:
                itemsNivel,

              cantidad:
                itemsNivel.length,
            });

          resultado.push(
            ...seleccion
          );
        }
      );

      return resultado;
    },
    [
      validaciones,
      modoGeneracion,
    ]
  );

  const faltantesPrueba =
  useMemo(
    () => {
      const faciles =
        validaciones.filter(
          (item) =>
            item.nivel ===
            "facil"
        );

      return calcularFaltantesPorBanda(
        faciles,
        faciles.length
      );
    },
    [
      validaciones,
    ]
  );

  const candidatosDirigidosPrueba =
  useMemo(
    () =>
      generarCandidatosDirigidos({
        nivel:
          "facil",

        faltantes:
          faltantesPrueba,

        semillaInicial:
          semilla +
          actividades.length,

        maxIntentos:
          1000,
      }),
    [
      faltantesPrueba,
      semilla,
      actividades.length,
    ]
  );

  const seleccionDirigidaPrueba =
  useMemo(
    () => {
      const faciles =
        validaciones.filter(
          (item) =>
            item.nivel ===
            "facil"
        );

      const candidatosCombinados = [
        ...faciles,
        ...candidatosDirigidosPrueba
          .encontrados,
      ];

      return seleccionarProgresivo({
        items:
          candidatosCombinados,

        cantidad:
          faciles.length,
      });
    },
    [
      validaciones,
      candidatosDirigidosPrueba,
    ]
  );

  const bandasSeleccionDirigidaPrueba =
  useMemo(
    () =>
      contarBandasComplejidad(
        seleccionDirigidaPrueba
      ),
    [
      seleccionDirigidaPrueba,
    ]
  );

  const actividadesFinales =
    useMemo(
      () =>
        validacionesFinales
          .map(
            (
              item,
              index
            ) => {
              const actividad =
                actividades[
                  item.indiceActividad
                ];

              if (!actividad) {
                return null;
              }

              return {
                ...actividad,

                numeroOriginal:
                  actividad.numero,

                numeroProducto:
                  index + 1,

                semillaLaberinto:
  item.semillaLaberinto,
              };
            }
          )
          .filter(Boolean),
      [
        validacionesFinales,
        actividades,
      ]
    );

  /* =======================================================
     PÁGINAS DE JUEGOS
  ======================================================= */

  const paginasJuegos =
    useMemo(
      () =>
        actividadesFinales.map(
          (
            actividad,
            index
          ) => ({
            id:
              `juego-${index + 1}`,

            nombre:
              `Laberinto ${index + 1}`,

            tipo:
              "juego",

            indiceActividad:
              index,

            numeroProducto:
              index + 1,

            numeroOriginal:
              actividad.numeroOriginal ??
              actividad.numero,

            semillaLaberinto:
  actividad.semillaLaberinto,

            nivel:
              actividad.nivel,
          })
        ),
      [
        actividadesFinales,
      ]
    );

  /* =======================================================
     PÁGINAS DE SOLUCIONES
  ======================================================= */

  const paginasSoluciones =
    useMemo(
      () =>
        actividadesFinales.map(
          (
            actividad,
            index
          ) => ({
            id:
              `solucion-${index + 1}`,

            nombre:
              `Solución ${index + 1}`,

            tipo:
              "solucion",

            indiceActividad:
              index,

            numeroProducto:
              index + 1,

            numeroOriginal:
              actividad.numeroOriginal ??
              actividad.numero,

            nivel:
              actividad.nivel,
          })
        ),
      [
        actividadesFinales,
      ]
    );

  /* =======================================================
     ESTRUCTURA COMPLETA DEL PDF
  ======================================================= */

  const paginas =
    useMemo(
      () => [
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
      ],
      [
        paginasJuegos,
        paginasSoluciones,
      ]
    );

  const pagina =
    paginas[
      paginaActual
    ];

  const indiceActividad =
    pagina?.indiceActividad ??
    0;

  const nivelPagina =
    pagina?.nivel ??
    "facil";

  const semillaPagina =
  pagina?.semillaLaberinto ??
  semilla +
    indiceActividad;

  const configuracionPagina =
    CONFIG_LABERINTO[
      nivelPagina
    ];

    /* =======================================================
     PREVIEW RESPONSIVE
  ======================================================= */

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

  /* =======================================================
     CORREGIR PÁGINA DEL PRODUCTO
  ======================================================= */

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

  /* =======================================================
     REINICIAR PÁGINA DE VALIDACIONES

     Cuando cambia el producto o la semilla volvemos
     automáticamente a la primera página de resultados.
  ======================================================= */

  useEffect(() => {
    setPaginaValidacion(0);
  }, [
    cantidadFaciles,
    cantidadMedios,
    cantidadDificiles,
    cantidadExpertos,
    cantidadLegendarios,
    semilla,
  ]);

  /* =======================================================
     VALIDACIÓN

     Esta es una de las mejoras principales de rendimiento.

     Antes validarLaberinto() se ejecutaba nuevamente en cada
     render de React.

     Ahora solamente vuelve a ejecutarse cuando cambian:
     - las actividades
     - la semilla
  ======================================================= */

  /* =======================================================
   PRUEBA DE SELECCIÓN PROGRESIVA
======================================================= */

const seleccionProgresivaPrueba =
  useMemo(
    () => {
      const faciles =
        validaciones.filter(
          (item) =>
            item.nivel ===
            "facil"
        );

      return seleccionarProgresivo({
        items:
          faciles,

        cantidad:
          Math.min(
            20,
            faciles.length
          ),
      });
    },
    [
      validaciones,
    ]
  );

  /* =======================================================
     CANTIDAD DE LABERINTOS VÁLIDOS
  ======================================================= */

  const cantidadValidos =
    useMemo(
      () =>
        validaciones.reduce(
          (
            total,
            item
          ) =>
            item.valido
              ? total + 1
              : total,
          0
        ),
      [
        validaciones,
      ]
    );

  const productoValido =
    cantidadActividades >
      0 &&
    cantidadValidos ===
      cantidadActividades;

  /* =======================================================
     PAGINACIÓN DE VALIDACIONES

     Todos los laberintos siguen siendo analizados.
     Solamente mostramos 25 tarjetas a la vez.
  ======================================================= */

  const totalPaginasValidacion =
    Math.max(
      1,
      Math.ceil(
        validaciones.length /
          VALIDACIONES_POR_PAGINA
      )
    );

  const inicioValidacion =
    paginaValidacion *
    VALIDACIONES_POR_PAGINA;

  const finValidacion =
    Math.min(
      inicioValidacion +
        VALIDACIONES_POR_PAGINA,
      validaciones.length
    );

  const validacionesVisibles =
    useMemo(
      () =>
        validaciones.slice(
          inicioValidacion,
          finValidacion
        ),
      [
        validaciones,
        inicioValidacion,
        finValidacion,
      ]
    );

  useEffect(() => {
    if (
      paginaValidacion >=
      totalPaginasValidacion
    ) {
      setPaginaValidacion(
        Math.max(
          totalPaginasValidacion -
            1,
          0
        )
      );
    }
  }, [
    paginaValidacion,
    totalPaginasValidacion,
  ]);

  /* =======================================================
     ESTADÍSTICAS POR NIVEL

     También están memoizadas.

     Cambiar de página en el preview ya no recalcula:
     - promedios
     - mínimos
     - máximos
     - percentiles
  ======================================================= */

  const resumenPorNivel =
    useMemo(
      () =>
        Object.keys(
          CONFIG_LABERINTO
        )
          .map(
            (
              nivel
            ) => {
              const itemsNivel =
                validacionesFinales.filter(
                  (
                    item
                  ) =>
                    item.nivel ===
                    nivel
                );

              if (
                itemsNivel.length ===
                0
              ) {
                return null;
              }

              const soluciones =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.longitudSolucion
                );

              const giros =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.cantidadGiros
                );

              const callejones =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.cantidadCallejones
                );

              const recorridos =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.porcentajeRecorrido
                );

              const densidadesGiros =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.densidadGiros
                );

              const densidadesCallejones =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.densidadCallejones
                );

              const complejidades =
                itemsNivel.map(
                  (
                    item
                  ) =>
                    item.complejidad
                );

              const bandasComplejidad =
  contarBandasComplejidad(
    itemsNivel
  );

              const totalSolucion =
                soluciones.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
                );

              const totalGiros =
                giros.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
                );

              const totalCallejones =
                callejones.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
                );

              const totalRecorrido =
                recorridos.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
                );

              const totalDensidadGiros =
                densidadesGiros.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
                );

              const totalDensidadCallejones =
                densidadesCallejones.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
                );

              const totalComplejidad =
                complejidades.reduce(
                  (
                    total,
                    valor
                  ) =>
                    total + valor,
                  0
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

                promedioComplejidad:
                  Math.round(
                    totalComplejidad /
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

                minimoComplejidad:
                  Math.min(
                    ...complejidades
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

                maximoComplejidad:
                  Math.max(
                    ...complejidades
                  ),

              /* PERCENTILES */

              percentilesSolucion:
                calcularPercentiles(
                  soluciones
                ),

              percentilesGiros:
                calcularPercentiles(
                  giros
                ),

              percentilesCallejones:
                calcularPercentiles(
                  callejones
                ),

              percentilesComplejidad:
                calcularPercentiles(
                  complejidades
                ),

              /* BANDAS DE COMPLEJIDAD */

              bandasComplejidad,
              };
            }
          )
          .filter(Boolean),
      [
        validacionesFinales,
      ]
    );

  /* =======================================================
     GENERAR NUEVO CONJUNTO
  ======================================================= */

  function generarNuevoConjunto() {
    setSemilla(
      (
        actual
      ) =>
        actual + 1
    );

    setPaginaActual(0);
    setPaginaValidacion(0);
  }

  /* =======================================================
     GENERAR PDF
  ======================================================= */

  async function descargarPdfCompleto() {
    if (
      exportandoPdf ||
      paginas.length === 0
    ) {
      return;
    }

    setExportandoPdf(
      true
    );

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

  /* =======================================================
     SIN PÁGINA
  ======================================================= */

  if (!pagina) {
    return (
      <main className="min-h-screen bg-slate-100 p-4">

        <div className="mx-auto max-w-xl rounded-2xl bg-white p-5 text-center shadow-sm">

          <p className="font-bold text-slate-900">
            No hay páginas disponibles
          </p>

        </div>

      </main>
    );
  }

    return (
    <main className="min-h-screen overflow-x-hidden bg-slate-100">

      <div className="mx-auto w-full max-w-7xl px-3 py-4">

        {/* ===================================================
            PANEL PRINCIPAL
        ==================================================== */}

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
              {cantidadActividades}{" "}
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

          <div className="rounded-2xl bg-white p-3 shadow-sm sm:p-4">

  <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
    Modo de generación
  </p>

  <div className="mt-3 grid grid-cols-2 gap-2">

    <button
      type="button"
      onClick={() =>
        setModoGeneracion(
          "aleatorio"
        )
      }
      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
        modoGeneracion ===
        "aleatorio"
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      Aleatorio
    </button>

    <button
      type="button"
      onClick={() =>
        setModoGeneracion(
          "progresivo"
        )
      }
      className={`rounded-xl px-3 py-2 text-sm font-bold transition ${
        modoGeneracion ===
        "progresivo"
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      Progresivo
    </button>

  </div>

  <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
    {modoGeneracion ===
    "progresivo"
      ? "Los laberintos se seleccionarán y ordenarán de menor a mayor complejidad dentro de cada nivel."
      : "Los laberintos se mantendrán en el orden normal generado por la semilla."}
  </p>

</div>

          <p className="mt-2 text-xs text-slate-500">
  Laberintos finales:{" "}
  {validacionesFinales.length}
</p>

          <p className="mt-1 text-xs text-slate-500">
  Actividades finales:{" "}
  {actividadesFinales.length}
</p>

          <div className="mt-2 text-xs text-slate-500">
  <p>
    Faltantes Muy baja:{" "}
    {faltantesPrueba["Muy baja"]}
  </p>

  <p>
    Faltantes Baja:{" "}
    {faltantesPrueba.Baja}
  </p>

  <p>
    Faltantes Media:{" "}
    {faltantesPrueba.Media}
  </p>

  <p>
    Faltantes Alta:{" "}
    {faltantesPrueba.Alta}
  </p>

  <p>
    Faltantes Muy alta:{" "}
    {faltantesPrueba["Muy alta"]}
  </p>
</div>

          <div className="mt-2 text-xs text-slate-500">

  <p>
    Candidatos nuevos:{" "}
    {
      candidatosDirigidosPrueba
        .encontrados.length
    }
  </p>

  <p>
    Intentos realizados:{" "}
    {
      candidatosDirigidosPrueba
        .intentos
    }
  </p>

  <p>
    Búsqueda completa:{" "}
    {
      candidatosDirigidosPrueba
        .completo
        ? "Sí"
        : "No"
    }
  </p>

</div>

          <div className="mt-3 rounded-xl bg-slate-100 p-3 text-xs text-slate-600">

  <p className="font-bold text-slate-800">
    Selección dirigida final
  </p>

  <p className="mt-2">
    Total:{" "}
    {
      seleccionDirigidaPrueba.length
    }
  </p>

  <p>
    Muy baja:{" "}
    {
      bandasSeleccionDirigidaPrueba[
        "Muy baja"
      ] ?? 0
    }
  </p>

  <p>
    Baja:{" "}
    {
      bandasSeleccionDirigidaPrueba
        .Baja ?? 0
    }
  </p>

  <p>
    Media:{" "}
    {
      bandasSeleccionDirigidaPrueba
        .Media ?? 0
    }
  </p>

  <p>
    Alta:{" "}
    {
      bandasSeleccionDirigidaPrueba
        .Alta ?? 0
    }
  </p>

  <p>
    Muy alta:{" "}
    {
      bandasSeleccionDirigidaPrueba[
        "Muy alta"
      ] ?? 0
    }
  </p>

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
                {progresoPdf.actual}
                {" de "}
                {progresoPdf.total}
                {" páginas"}
              </p>

            </div>
          )}

        </section>

        {/* ===================================================
            VALIDACIÓN
        ==================================================== */}

        <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">

          <div className="flex items-center justify-between gap-3">

            <div>

              <h2 className="text-sm font-bold text-slate-900">
                Validación
              </h2>

              <p className="text-[11px] text-slate-500">
                Entrada, salida, solución y métricas.
              </p>

            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                productoValido
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {cantidadValidos}
              /
              {cantidadActividades}
            </span>

          </div>

          {validaciones.length >
            0 && (
            <p className="mt-3 text-[11px] font-semibold text-slate-500">
              Mostrando{" "}
              {inicioValidacion +
                1}
              {" - "}
              {finValidacion}
              {" de "}
              {validaciones.length}
            </p>
          )}

          <div className="mt-2 space-y-1.5">

            {validacionesVisibles.map(
              (
                item
              ) => (
                <div
                  key={
                    item.numero
                  }
                  className="rounded-lg bg-slate-50 px-2.5 py-2"
                >

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
                        {item.numero}
                        {" · "}
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

                  <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-4">

                    <Metrica
                      titulo="Celdas"
                      valor={
                        item.totalCeldas
                      }
                    />

                    <Metrica
                      titulo="Solución"
                      valor={
                        item.longitudSolucion
                      }
                    />

                    <Metrica
                      titulo="Giros"
                      valor={
                        item.cantidadGiros
                      }
                    />

                    <Metrica
                      titulo="Callejones"
                      valor={
                        item.cantidadCallejones
                      }
                    />

                    <Metrica
                      titulo="Recorrido"
                      valor={`${item.porcentajeRecorrido}%`}
                    />

                    <Metrica
                      titulo="Dens. giros"
                      valor={`${item.densidadGiros}%`}
                    />

                    <Metrica
                      titulo="Dens. callejones"
                      valor={`${item.densidadCallejones}%`}
                    />

                    <div className="rounded-md bg-slate-900 px-1.5 py-1.5 text-center">

                      <p className="text-[9px] font-semibold uppercase text-slate-400">
                        Complejidad
                      </p>

                      <p className="text-xs font-bold text-white">
  {item.complejidad}
  /100
</p>

<p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-400">
  {item.bandaComplejidad}
</p>

                    </div>

                    
                  </div>

                </div>
              )
            )}

          </div>

          {/* =================================================
              PAGINACIÓN DE VALIDACIONES
          ================================================== */}

          {totalPaginasValidacion >
            1 && (
            <div className="mt-4 flex items-center justify-between gap-3">

              <button
                type="button"
                onClick={() =>
                  setPaginaValidacion(
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
                  paginaValidacion ===
                  0
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-30"
              >
                ← Anterior
              </button>

              <span className="text-center text-[11px] font-semibold text-slate-500">
                Página{" "}
                {paginaValidacion +
                  1}
                {" de "}
                {totalPaginasValidacion}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPaginaValidacion(
                    (
                      actual
                    ) =>
                      Math.min(
                        actual +
                          1,
                        totalPaginasValidacion -
                          1
                      )
                  )
                }
                disabled={
                  paginaValidacion ===
                  totalPaginasValidacion -
                    1
                }
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-30"
              >
                Siguiente →
              </button>

            </div>
          )}

          {productoValido && (
            <div className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-center">

              <p className="text-xs font-bold text-emerald-700">
                ✓ PRODUCTO LISTO
              </p>

            </div>
          )}

        </section>

        {/* ===================================================
    PRUEBA DE PROGRESIÓN
=================================================== */}

{seleccionProgresivaPrueba.length > 0 && (
  <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">

    <div className="mb-3">

      <p className="text-xs font-bold uppercase tracking-wide text-sky-600">
        Prueba de progresión
      </p>

      <h3 className="mt-1 text-sm font-bold text-slate-900">
        Selección automática · Fácil
      </h3>

      <p className="mt-1 text-[11px] text-slate-500">
        20 laberintos seleccionados y ordenados por complejidad.
      </p>

    </div>

    <div className="space-y-1.5">

      {seleccionProgresivaPrueba.map(
        (
          item,
          index
        ) => (
          <div
            key={
              item.numero
            }
            className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
          >

            <div>

              <p className="text-xs font-bold text-slate-700">
                {index + 1}
                . Laberinto{" "}
                {item.numero}
              </p>

              <p className="text-[10px] text-slate-400">
                {
                  item.bandaComplejidad
                }
              </p>

            </div>

            <span className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white">
              {
                item.complejidad
              }
              /100
            </span>

          </div>
        )
      )}

    </div>

  </section>
)}

        {/* ===================================================
            ESTADÍSTICAS
        ==================================================== */}

        <section className="mt-3 rounded-2xl bg-white p-3 shadow-sm sm:p-4">

          <div className="mb-4">

            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">
              Estadísticas
            </p>

            <h3 className="mt-1 text-base font-bold text-slate-800">
              Resumen por nivel
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              Promedios, mínimos, máximos y percentiles.
            </p>

          </div>

          <div className="space-y-3">

            {resumenPorNivel.map(
              (
                resumen
              ) => (
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

                  <div className="grid gap-2 sm:grid-cols-2">

                    <EstadisticaPercentiles
                      titulo="Callejones"
                      promedio={
                        resumen.promedioCallejones
                      }
                      minimo={
                        resumen.minimoCallejones
                      }
                      maximo={
                        resumen.maximoCallejones
                      }
                      percentiles={
                        resumen.percentilesCallejones
                      }
                    />

                    <EstadisticaPercentiles
                      titulo="Solución"
                      promedio={
                        resumen.promedioSolucion
                      }
                      minimo={
                        resumen.minimoSolucion
                      }
                      maximo={
                        resumen.maximoSolucion
                      }
                      percentiles={
                        resumen.percentilesSolucion
                      }
                    />

                    <EstadisticaPercentiles
                      titulo="Giros"
                      promedio={
                        resumen.promedioGiros
                      }
                      minimo={
                        resumen.minimoGiros
                      }
                      maximo={
                        resumen.maximoGiros
                      }
                      percentiles={
                        resumen.percentilesGiros
                      }
                    />

                    <EstadisticaSimple
                      titulo="Recorrido"
                      promedio={`${resumen.promedioRecorrido}%`}
                      rango={`${resumen.minimoRecorrido}% - ${resumen.maximoRecorrido}%`}
                    />

                    <EstadisticaSimple
                      titulo="Dens. giros"
                      promedio={`${resumen.promedioDensidadGiros}%`}
                      rango={`${resumen.minimoDensidadGiros}% - ${resumen.maximoDensidadGiros}%`}
                    />

                    <EstadisticaSimple
                      titulo="Dens. callejones"
                      promedio={`${resumen.promedioDensidadCallejones}%`}
                      rango={`${resumen.minimoDensidadCallejones}% - ${resumen.maximoDensidadCallejones}%`}
                    />

                    <EstadisticaComplejidad
                      promedio={
                        resumen.promedioComplejidad
                      }
                      minimo={
                        resumen.minimoComplejidad
                      }
                      maximo={
                        resumen.maximoComplejidad
                      }
                      percentiles={
                        resumen.percentilesComplejidad
                      }
                      bandas={
                        resumen.bandasComplejidad
                      }
                    />

                  </div>

                </div>
              )
            )}

          </div>

        </section>

                {/* ===================================================
            NAVEGACIÓN
        ==================================================== */}

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
                {pagina.nombre}
              </p>

              <p className="text-[11px] text-slate-500">
                Página{" "}
                {paginaActual +
                  1}
                {" de "}
                {paginas.length}
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

              Para productos pequeños usamos select.

              Para productos grandes usamos input numérico
              para no crear miles de elementos <option>.
          ================================================== */}

          {paginas.length <=
          LIMITE_SELECTOR_PAGINAS ? (

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
                    {index + 1}
                    .{" "}
                    {item.nombre}
                  </option>
                )
              )}

            </select>

          ) : (

            <div className="mt-3">

              <label className="block">

                <span className="text-[11px] font-semibold text-slate-500">
                  Ir a página
                </span>

                <input
                  type="number"
                  min="1"
                  max={
                    paginas.length
                  }
                  value={
                    paginaActual +
                    1
                  }
                  onChange={(e) => {
                    const valor =
                      Number(
                        e.target.value
                      );

                    if (
                      !Number.isFinite(
                        valor
                      )
                    ) {
                      return;
                    }

                    const paginaDestino =
                      Math.min(
                        Math.max(
                          Math.round(
                            valor
                          ),
                          1
                        ),
                        paginas.length
                      );

                    setPaginaActual(
                      paginaDestino -
                        1
                    );
                  }}
                  className={
                    CLASE_CAMPO
                  }
                />

              </label>

              <p className="mt-1 text-[10px] text-slate-400">
                Producto grande: el selector completo se desactiva para ahorrar memoria.
              </p>

            </div>

          )}

        </section>

        {/* ===================================================
            PREVIEW
        ==================================================== */}

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

/* =========================================================
   MÉTRICA INDIVIDUAL
========================================================= */

function Metrica({
  titulo,
  valor,
}) {
  return (
    <div className="rounded-md bg-white px-1.5 py-1.5 text-center">

      <p className="text-[9px] font-semibold uppercase text-slate-400">
        {titulo}
      </p>

      <p className="text-xs font-bold text-slate-700">
        {valor}
      </p>

    </div>
  );
}

/* =========================================================
   ESTADÍSTICA SIMPLE
========================================================= */

function EstadisticaSimple({
  titulo,
  promedio,
  rango,
}) {
  return (
    <div className="rounded-lg bg-white p-2 text-center">

      <p className="text-[9px] font-semibold uppercase text-slate-400">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-700">
        {promedio}
      </p>

      <p className="text-[9px] text-slate-400">
        {rango}
      </p>

    </div>
  );
}

/* =========================================================
   ESTADÍSTICA CON PERCENTILES
========================================================= */

function EstadisticaPercentiles({
  titulo,
  promedio,
  minimo,
  maximo,
  percentiles,
}) {
  return (
    <div className="rounded-lg bg-white p-2 text-center">

      <p className="text-[9px] font-semibold uppercase text-slate-400">
        {titulo}
      </p>

      <p className="mt-1 text-sm font-bold text-slate-700">
        {promedio}
      </p>

      <p className="text-[9px] text-slate-400">
        {minimo}
        {" - "}
        {maximo}
      </p>

      <p className="mt-1 text-[9px] leading-4 text-slate-500">
        P05{" "}
        {percentiles.p05}
        {" · "}
        P25{" "}
        {percentiles.p25}
        {" · "}
        P50{" "}
        {percentiles.p50}
        {" · "}
        P75{" "}
        {percentiles.p75}
        {" · "}
        P95{" "}
        {percentiles.p95}
      </p>

    </div>
  );
}

/* =========================================================
   ESTADÍSTICA DE COMPLEJIDAD
========================================================= */

function EstadisticaComplejidad({
  promedio,
  minimo,
  maximo,
  percentiles,
  bandas,
}) {
  return (
    <div className="space-y-2 sm:col-span-2">

      {/* COMPLEJIDAD */}

      <div className="rounded-lg bg-slate-900 p-2 text-center">

        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Complejidad interna
        </p>

        <p className="mt-1 text-sm font-bold text-white">
          {promedio}
          /100
        </p>

        <p className="text-[9px] text-slate-400">
          {minimo}
          {" - "}
          {maximo}
        </p>

        <p className="mt-1 text-[9px] leading-4 text-slate-400">
          P05{" "}
          {percentiles.p05}
          {" · "}
          P25{" "}
          {percentiles.p25}
          {" · "}
          P50{" "}
          {percentiles.p50}
          {" · "}
          P75{" "}
          {percentiles.p75}
          {" · "}
          P95{" "}
          {percentiles.p95}
        </p>

      </div>

      {/* DISTRIBUCIÓN */}

      <div className="rounded-lg bg-white p-3">

        <p className="text-center text-[9px] font-semibold uppercase tracking-wide text-slate-400">
          Distribución por complejidad
        </p>

        <div className="mt-2 grid grid-cols-5 gap-1">

          {[
            "Muy baja",
            "Baja",
            "Media",
            "Alta",
            "Muy alta",
          ].map(
            (banda) => (
              <div
                key={banda}
                className="rounded-md bg-slate-50 px-1 py-2 text-center"
              >

                <p className="text-[8px] font-semibold leading-3 text-slate-400">
                  {banda}
                </p>

                <p className="mt-1 text-xs font-bold text-slate-700">
                  {bandas?.[banda] ?? 0}
                </p>

              </div>
            )
          )}

        </div>

      </div>

    </div>
  );
}