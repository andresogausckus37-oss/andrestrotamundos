/* =========================================================
   CONFIGURACIÓN VISUAL
========================================================= */

const ANCHO = 620;
const ALTO = 720;

const MARGEN_X = 20;
const MARGEN_Y = 20;

/* =========================================================
   CAMINOS FALSOS
========================================================= */

const PROFUNDIDAD_MINIMA_CAMINO_FALSO = 3;

const REGLAS_CAMINOS_FALSOS = {
  facil: {
    cantidad: 0,
    profundidadMinima: 0,
    zonas: [],
  },

  medio: {
    cantidad: 0,
    profundidadMinima: 0,
    zonas: [],
  },

  dificil: {
    cantidad: 1,
    profundidadMinima: 4,

    zonas: [
      [20, 70],
    ],
  },

  experto: {
    cantidad: 2,
    profundidadMinima: 5,

    zonas: [
      [15, 42],
      [48, 75],
    ],
  },

  legendario: {
    cantidad: 3,
    profundidadMinima: 6,

    zonas: [
      [15, 32],
      [36, 53],
      [57, 74],
    ],
  },
};

/* =========================================================
   COMPONENTE LABERINTO
========================================================= */

export default function Laberinto({
  filas = 10,
  columnas = 8,
  semilla = 1,
  nivel = "facil",
  mostrarSolucion = false,
  mostrarDiagnosticoCaminosFalsos = false,
}) {
  
  const anchoCelda =
    (ANCHO - MARGEN_X * 2) /
    columnas;

  const altoCelda =
    (ALTO - MARGEN_Y * 2) /
    filas;

  const celdas =
    generarLaberinto(
      filas,
      columnas,
      semilla
    );

  const solucion =
    encontrarSolucion(
      celdas,
      filas,
      columnas
    );

  const analisisCaminosFalsos =
  analizarCaminosFalsos(
    celdas,
    filas,
    columnas,
    solucion
  );

const reglaCaminosFalsos =
  REGLAS_CAMINOS_FALSOS[
    nivel
  ] ||
  REGLAS_CAMINOS_FALSOS
    .facil;

const caminosFalsosPrincipales =
  seleccionarCaminosFalsosPrincipales(
    analisisCaminosFalsos
      .caminosFalsos,
    reglaCaminosFalsos
  );

  const cantidadGiros =
  contarGirosSolucion(
    solucion
  );

  const puntosSolucion =
    solucion
      .map((celda) => {
        const x =
          MARGEN_X +
          celda.columna *
            anchoCelda +
          anchoCelda / 2;

        const y =
          MARGEN_Y +
          celda.fila *
            altoCelda +
          altoCelda / 2;

        return `${x},${y}`;
      })
      .join(" ");

  const COLORES_DIAGNOSTICO = [
  "#F97316",
  "#2563EB",
  "#9333EA",
];

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* =====================================================
          FONDO
      ====================================================== */}

      <rect
        x="0"
        y="0"
        width={ANCHO}
        height={ALTO}
        fill="white"
      />

      {/* =====================================================
    DIAGNÓSTICO CAMINOS FALSOS
====================================================== */}

{mostrarDiagnosticoCaminosFalsos &&
  caminosFalsosPrincipales.map(
    (camino, indiceCamino) => {
      const color =
        COLORES_DIAGNOSTICO[
          indiceCamino %
            COLORES_DIAGNOSTICO.length
        ];

      return (
        <g
          key={`camino-falso-${indiceCamino}`}
        >
          {camino.celdas.map(
            (celda) => {
              const x =
                MARGEN_X +
                celda.columna *
                  anchoCelda;

              const y =
                MARGEN_Y +
                celda.fila *
                  altoCelda;

              return (
                <rect
                  key={`${celda.fila}-${celda.columna}`}
                  x={x + 2}
                  y={y + 2}
                  width={
                    anchoCelda - 4
                  }
                  height={
                    altoCelda - 4
                  }
                  fill={color}
                  opacity="0.28"
                />
              );
            }
          )}

          {/* ORIGEN DEL CAMINO FALSO */}

          <circle
            cx={
              MARGEN_X +
              camino.columnaOrigen *
                anchoCelda +
              anchoCelda / 2
            }
            cy={
              MARGEN_Y +
              camino.filaOrigen *
                altoCelda +
              altoCelda / 2
            }
            r="8"
            fill={color}
          />
        </g>
      );
    }
  )}

      {/* =====================================================
          PAREDES
      ====================================================== */}

      <g
        stroke="black"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      >
        {celdas.map(
          (celda) => {
            const x =
              MARGEN_X +
              celda.columna *
                anchoCelda;

            const y =
              MARGEN_Y +
              celda.fila *
                altoCelda;

            return (
              <g
                key={`${celda.fila}-${celda.columna}`}
              >
                {celda.paredes
                  .arriba && (
                  <line
                    x1={x}
                    y1={y}
                    x2={
                      x +
                      anchoCelda
                    }
                    y2={y}
                  />
                )}

                {celda.paredes
                  .derecha && (
                  <line
                    x1={
                      x +
                      anchoCelda
                    }
                    y1={y}
                    x2={
                      x +
                      anchoCelda
                    }
                    y2={
                      y +
                      altoCelda
                    }
                  />
                )}

                {celda.paredes
                  .abajo && (
                  <line
                    x1={x}
                    y1={
                      y +
                      altoCelda
                    }
                    x2={
                      x +
                      anchoCelda
                    }
                    y2={
                      y +
                      altoCelda
                    }
                  />
                )}

                {celda.paredes
                  .izquierda && (
                  <line
                    x1={x}
                    y1={y}
                    x2={x}
                    y2={
                      y +
                      altoCelda
                    }
                  />
                )}
              </g>
            );
          }
        )}
      </g>

      {/* =====================================================
          SOLUCIÓN
      ====================================================== */}

      {mostrarSolucion &&
        solucion.length > 0 && (
          <polyline
            points={
              puntosSolucion
            }
            fill="none"
            stroke="red"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.75"
          />
        )}

      </svg>
  );
}

/* =========================================================
   OBTENER CELDA
========================================================= */

/**
 * Las celdas se almacenan por filas:
 *
 * fila 0 → 0, 1, 2...
 * fila 1 → columnas, columnas + 1...
 *
 * Esto permite acceder directamente sin usar find().
 */
function obtenerCelda(
  celdas,
  filas,
  columnas,
  fila,
  columna
) {
  if (
    fila < 0 ||
    columna < 0 ||
    fila >= filas ||
    columna >= columnas
  ) {
    return null;
  }

  return celdas[
    fila * columnas +
      columna
  ];
}

/* =========================================================
   GENERADOR DEL LABERINTO
========================================================= */

function generarLaberinto(
  filas,
  columnas,
  semillaInicial
) {
  const celdas = [];

  /* =======================================================
     CREAR CUADRÍCULA
  ======================================================= */

  for (
    let fila = 0;
    fila < filas;
    fila += 1
  ) {
    for (
      let columna = 0;
      columna < columnas;
      columna += 1
    ) {
      celdas.push({
        fila,
        columna,

        visitada: false,

        paredes: {
          arriba: true,
          derecha: true,
          abajo: true,
          izquierda: true,
        },
      });
    }
  }

  /* =======================================================
     GENERADOR ALEATORIO DETERMINISTA
  ======================================================= */

  let semilla =
    Number.isFinite(
      semillaInicial
    )
      ? semillaInicial
      : 1;

  function random() {
    const x =
      Math.sin(
        semilla++
      ) * 10000;

    return (
      x -
      Math.floor(x)
    );
  }

  /* =======================================================
     DFS / BACKTRACKING
  ======================================================= */

  const pila = [];

  const inicio =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      0,
      0
    );

  inicio.visitada = true;

  pila.push(inicio);

  while (
    pila.length > 0
  ) {
    const actual =
      pila[
        pila.length - 1
      ];

    const vecinos = [];

    const arriba =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        actual.fila - 1,
        actual.columna
      );

    const derecha =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        actual.fila,
        actual.columna + 1
      );

    const abajo =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        actual.fila + 1,
        actual.columna
      );

    const izquierda =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        actual.fila,
        actual.columna - 1
      );

    if (
      arriba &&
      !arriba.visitada
    ) {
      vecinos.push({
        celda: arriba,
        direccion: "arriba",
      });
    }

    if (
      derecha &&
      !derecha.visitada
    ) {
      vecinos.push({
        celda: derecha,
        direccion:
          "derecha",
      });
    }

    if (
      abajo &&
      !abajo.visitada
    ) {
      vecinos.push({
        celda: abajo,
        direccion: "abajo",
      });
    }

    if (
      izquierda &&
      !izquierda.visitada
    ) {
      vecinos.push({
        celda: izquierda,
        direccion:
          "izquierda",
      });
    }

    /*
      Sin vecinos disponibles:
      volvemos hacia atrás.
    */

    if (
      vecinos.length === 0
    ) {
      pila.pop();
      continue;
    }

    /*
      Elegimos uno de los vecinos
      utilizando la semilla.
    */

    const elegido =
      vecinos[
        Math.floor(
          random() *
            vecinos.length
        )
      ];

    const siguiente =
      elegido.celda;

    /* =====================================================
       ABRIR PAREDES
    ===================================================== */

    if (
      elegido.direccion ===
      "arriba"
    ) {
      actual.paredes.arriba =
        false;

      siguiente.paredes.abajo =
        false;
    }

    if (
      elegido.direccion ===
      "derecha"
    ) {
      actual.paredes.derecha =
        false;

      siguiente.paredes.izquierda =
        false;
    }

    if (
      elegido.direccion ===
      "abajo"
    ) {
      actual.paredes.abajo =
        false;

      siguiente.paredes.arriba =
        false;
    }

    if (
      elegido.direccion ===
      "izquierda"
    ) {
      actual.paredes.izquierda =
        false;

      siguiente.paredes.derecha =
        false;
    }

    siguiente.visitada =
      true;

    pila.push(
      siguiente
    );
  }

  /* =======================================================
     ENTRADA
  ======================================================= */

  const primera =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      0,
      0
    );

  primera.paredes.izquierda =
    false;

  /* =======================================================
     SALIDA
  ======================================================= */

  const ultima =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      filas - 1,
      columnas - 1
    );

    ultima.paredes.derecha =
    false;

  return celdas;
}

/* =========================================================
   OBTENER VECINOS CONECTADOS
========================================================= */

function obtenerVecinosConectados(
  celdas,
  filas,
  columnas,
  celda
) {
  const vecinos = [];

  if (
    !celda.paredes.arriba
  ) {
    const vecino =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        celda.fila - 1,
        celda.columna
      );

    if (vecino) {
      vecinos.push(
        vecino
      );
    }
  }

  if (
    !celda.paredes.derecha
  ) {
    const vecino =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        celda.fila,
        celda.columna + 1
      );

    if (vecino) {
      vecinos.push(
        vecino
      );
    }
  }

  if (
    !celda.paredes.abajo
  ) {
    const vecino =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        celda.fila + 1,
        celda.columna
      );

    if (vecino) {
      vecinos.push(
        vecino
      );
    }
  }

  if (
    !celda.paredes.izquierda
  ) {
    const vecino =
      obtenerCelda(
        celdas,
        filas,
        columnas,
        celda.fila,
        celda.columna - 1
      );

    if (vecino) {
      vecinos.push(
        vecino
      );
    }
  }

  return vecinos;
}

/* =========================================================
   CALCULAR SOLUCIÓN
========================================================= */

function encontrarSolucion(
  celdas,
  filas,
  columnas
) {
  const inicio =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      0,
      0
    );

  const meta =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      filas - 1,
      columnas - 1
    );

  if (
    !inicio ||
    !meta
  ) {
    return [];
  }

  const visitadas =
    new Set();

  const pila = [
    {
      celda: inicio,
      camino: [inicio],
    },
  ];

  while (
    pila.length > 0
  ) {
    const actual =
      pila.pop();

    const celda =
      actual.celda;

    const clave =
      `${celda.fila}-${celda.columna}`;

    if (
      visitadas.has(
        clave
      )
    ) {
      continue;
    }

    visitadas.add(
      clave
    );

    /*
      Llegamos a la meta.
    */

    if (
      celda.fila ===
        meta.fila &&
      celda.columna ===
        meta.columna
    ) {
      return actual.camino;
    }

    const vecinos =
      obtenerVecinosConectados(
        celdas,
        filas,
        columnas,
        celda
      );

    vecinos.forEach(
      (vecino) => {
        const claveVecino =
          `${vecino.fila}-${vecino.columna}`;

        if (
          !visitadas.has(
            claveVecino
          )
        ) {
          pila.push({
            celda: vecino,

            camino: [
              ...actual.camino,
              vecino,
            ],
          });
        }
      }
    );
  }

  return [];
}

/* =========================================================
   CONTAR GIROS DE LA SOLUCIÓN
========================================================= */

function contarGirosSolucion(
  solucion
) {
  if (
    !Array.isArray(solucion) ||
    solucion.length < 3
  ) {
    return 0;
  }

  let giros = 0;

  let direccionAnterior =
    obtenerDireccion(
      solucion[0],
      solucion[1]
    );

  for (
    let i = 2;
    i < solucion.length;
    i += 1
  ) {
    const direccionActual =
      obtenerDireccion(
        solucion[i - 1],
        solucion[i]
      );

    if (
      direccionActual !==
      direccionAnterior
    ) {
      giros += 1;
    }

    direccionAnterior =
      direccionActual;
  }

  return giros;
}

/* =========================================================
   OBTENER DIRECCIÓN ENTRE DOS CELDAS
========================================================= */

function obtenerDireccion(
  origen,
  destino
) {
  const diferenciaFila =
    destino.fila -
    origen.fila;

  const diferenciaColumna =
    destino.columna -
    origen.columna;

  if (
    diferenciaFila === -1 &&
    diferenciaColumna === 0
  ) {
    return "arriba";
  }

  if (
    diferenciaFila === 1 &&
    diferenciaColumna === 0
  ) {
    return "abajo";
  }

  if (
    diferenciaFila === 0 &&
    diferenciaColumna === 1
  ) {
    return "derecha";
  }

  if (
    diferenciaFila === 0 &&
    diferenciaColumna === -1
  ) {
    return "izquierda";
  }

  return "desconocida";
}

/* =========================================================
   CONTAR CELDAS CONECTADAS
========================================================= */

function contarCeldasConectadas(
  celdas,
  filas,
  columnas
) {
  const inicio =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      0,
      0
    );

  if (!inicio) {
    return 0;
  }

  const visitadas =
    new Set();

  const pila = [
    inicio,
  ];

  while (
    pila.length > 0
  ) {
    const celda =
      pila.pop();

    const clave =
      `${celda.fila}-${celda.columna}`;

    if (
      visitadas.has(
        clave
      )
    ) {
      continue;
    }

    visitadas.add(
      clave
    );

    const vecinos =
      obtenerVecinosConectados(
        celdas,
        filas,
        columnas,
        celda
      );

    vecinos.forEach(
      (vecino) => {
        const claveVecino =
          `${vecino.fila}-${vecino.columna}`;

        if (
          !visitadas.has(
            claveVecino
          )
        ) {
          pila.push(
            vecino
          );
        }
      }
    );
  }

  return visitadas.size;
}

/* =========================================================
   CONTAR CALLEJONES SIN SALIDA
========================================================= */

function contarCallejonesSinSalida(
  celdas,
  filas,
  columnas
) {
  let cantidad = 0;

  celdas.forEach(
    (celda) => {
      /*
        Contamos cuántas conexiones reales
        tiene esta celda con otras celdas.
      */

      const vecinos =
        obtenerVecinosConectados(
          celdas,
          filas,
          columnas,
          celda
        );

      /*
        Una celda con una sola conexión
        es un callejón sin salida.

        No contamos la entrada ni la meta,
        porque forman parte natural del
        recorrido principal.
      */

      const esInicio =
        celda.fila === 0 &&
        celda.columna === 0;

      const esMeta =
        celda.fila ===
          filas - 1 &&
        celda.columna ===
          columnas - 1;

      if (
        vecinos.length === 1 &&
        !esInicio &&
        !esMeta
      ) {
        cantidad += 1;
      }
    }
  );

  return cantidad;
}

/* =========================================================
   ANALIZAR CAMINOS FALSOS RELEVANTES
========================================================= */

/*
  Un camino falso relevante es un callejón
  que NO pertenece a la solución y cuya
  profundidad desde el camino correcto es
  suficientemente grande como para engañar
  al jugador.

  profundidadMinima = 3 significa que el
  jugador debe avanzar al menos 3 celdas
  fuera de la ruta correcta.
*/

/* =========================================================
   ANALIZAR CAMINOS FALSOS RELEVANTES
========================================================= */

function analizarCaminosFalsos(
  celdas,
  filas,
  columnas,
  solucion,
  profundidadMinima =
    PROFUNDIDAD_MINIMA_CAMINO_FALSO
) {
  if (
    !Array.isArray(solucion) ||
    solucion.length === 0
  ) {
    return {
      cantidadCaminosFalsos: 0,
      caminosFalsos: [],
      profundidadesCaminosFalsos: [],
      profundidadFalsoMaxima: 0,
      profundidadFalsoPromedio: 0,
    };
  }

  const clavesSolucion =
    new Set(
      solucion.map(
        (celda) =>
          `${celda.fila}-${celda.columna}`
      )
    );

  const meta =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      filas - 1,
      columnas - 1
    );

  const caminosFalsos = [];

  const componentesVisitados =
    new Set();

  solucion.forEach(
    (
      celdaSolucion,
      indiceSolucion
    ) => {
      const vecinos =
        obtenerVecinosConectados(
          celdas,
          filas,
          columnas,
          celdaSolucion
        );

      vecinos.forEach(
        (vecinoInicial) => {
          const claveInicial =
            `${vecinoInicial.fila}-${vecinoInicial.columna}`;

          /*
            Si pertenece a la solución,
            seguimos por el camino correcto.
          */

          if (
            clavesSolucion.has(
              claveInicial
            )
          ) {
            return;
          }

          /*
            Una rama de un laberinto perfecto
            sólo se conecta una vez con
            la solución.

            Si ya analizamos este componente,
            no lo repetimos.
          */

          if (
            componentesVisitados.has(
              claveInicial
            )
          ) {
            return;
          }

          /* =================================================
             EXPLORAR LA RAMA

             Conservamos el recorrido más profundo
             hasta un verdadero extremo muerto.
          ================================================= */

          const pila = [
            {
              celda:
                vecinoInicial,

              camino: [
                vecinoInicial,
              ],
            },
          ];

          const visitadasRama =
            new Set();

          let mejorCamino = [];

          let cantidadCeldas = 0;

          let cantidadExtremos = 0;

          while (
            pila.length > 0
          ) {
            const actual =
              pila.pop();

            const celda =
              actual.celda;

            const camino =
              actual.camino;

            const clave =
              `${celda.fila}-${celda.columna}`;

            if (
              visitadasRama.has(
                clave
              )
            ) {
              continue;
            }

            if (
              clavesSolucion.has(
                clave
              )
            ) {
              continue;
            }

            visitadasRama.add(
              clave
            );

            componentesVisitados.add(
              clave
            );

            cantidadCeldas += 1;

            const vecinosRama =
              obtenerVecinosConectados(
                celdas,
                filas,
                columnas,
                celda
              ).filter(
                (vecino) => {
                  const claveVecino =
                    `${vecino.fila}-${vecino.columna}`;

                  return (
                    !clavesSolucion.has(
                      claveVecino
                    )
                  );
                }
              );

            const vecinosPendientes =
              vecinosRama.filter(
                (vecino) => {
                  const claveVecino =
                    `${vecino.fila}-${vecino.columna}`;

                  return (
                    !visitadasRama.has(
                      claveVecino
                    )
                  );
                }
              );

            /*
              Llegamos a un extremo muerto.
            */

            if (
              vecinosPendientes.length ===
              0
            ) {
              cantidadExtremos += 1;

              if (
                camino.length >
                mejorCamino.length
              ) {
                mejorCamino =
                  camino;
              }

              
              continue;
            }

            vecinosPendientes.forEach(
              (vecino) => {
                pila.push({
                  celda:
                    vecino,

                  camino: [
                    ...camino,
                    vecino,
                  ],
                });
              }
            );
          }

          const profundidad =
            mejorCamino.length;

          if (
            profundidad <
            profundidadMinima
          ) {
            return;
          }

          /* =================================================
             POSICIÓN DEL ORIGEN
          ================================================= */

          const porcentajeOrigen =
            solucion.length > 1
              ? Math.round(
                  (
                    indiceSolucion /
                    (
                      solucion.length -
                      1
                    )
                  ) *
                    100
                )
              : 0;

          /* =================================================
             DIRECCIÓN INICIAL HACIA LA META

             Queremos que entrar al falso camino
             parezca razonable.

             El primer paso debe acercar al jugador
             a la posición física de la meta.
          ================================================= */

          const distanciaOrigenMeta =
            Math.abs(
              celdaSolucion.fila -
                meta.fila
            ) +
            Math.abs(
              celdaSolucion.columna -
                meta.columna
            );

          const distanciaPrimerPasoMeta =
            Math.abs(
              vecinoInicial.fila -
                meta.fila
            ) +
            Math.abs(
              vecinoInicial.columna -
                meta.columna
            );

          const entradaOrientadaMeta =
            distanciaPrimerPasoMeta <
            distanciaOrigenMeta;

          caminosFalsos.push({
            filaOrigen:
              celdaSolucion.fila,

            columnaOrigen:
              celdaSolucion.columna,

            indiceOrigen:
              indiceSolucion,

            porcentajeOrigen,

            profundidad,

            cantidadCeldas,

            cantidadExtremos,

            entradaOrientadaMeta,

            primeraCelda: {
              fila:
                vecinoInicial.fila,

              columna:
                vecinoInicial.columna,
            },

            /*
              Ahora guardamos solamente
              el corredor profundo que
              queremos considerar como
              camino falso principal.
            */

            celdas:
              mejorCamino.map(
                (celda) => ({
                  fila:
                    celda.fila,

                  columna:
                    celda.columna,
                })
              ),
          });
        }
      );
    }
  );

  const profundidades =
    caminosFalsos.map(
      (camino) =>
        camino.profundidad
    );

  const cantidadCaminosFalsos =
    caminosFalsos.length;

  const profundidadFalsoMaxima =
    cantidadCaminosFalsos > 0
      ? Math.max(
          ...profundidades
        )
      : 0;

  const sumaProfundidades =
    profundidades.reduce(
      (
        suma,
        profundidad
      ) =>
        suma +
        profundidad,
      0
    );

  const profundidadFalsoPromedio =
    cantidadCaminosFalsos > 0
      ? Math.round(
          (
            sumaProfundidades /
            cantidadCaminosFalsos
          ) *
            100
        ) / 100
      : 0;

  return {
    cantidadCaminosFalsos,

    caminosFalsos,

    profundidadesCaminosFalsos:
      [...profundidades].sort(
        (a, b) =>
          b - a
      ),

    profundidadFalsoMaxima,

    profundidadFalsoPromedio,
  };
}

/* =========================================================
   SELECCIONAR CAMINOS FALSOS PRINCIPALES
========================================================= */

function seleccionarCaminosFalsosPrincipales(
  caminosFalsos,
  regla
) {
  if (
    !Array.isArray(caminosFalsos) ||
    caminosFalsos.length === 0
  ) {
    return [];
  }

  const cantidadObjetivo =
    regla?.cantidad ?? 0;

  if (
    cantidadObjetivo === 0
  ) {
    return [];
  }

  const profundidadMinima =
    regla?.profundidadMinima ??
    0;

  const zonas =
    Array.isArray(regla?.zonas)
      ? regla.zonas
      : [];

  const candidatos =
    caminosFalsos.filter(
      (camino) =>
        camino.profundidad >=
        profundidadMinima
    );

  const seleccionados = [];

  zonas.forEach(
    (zona) => {
      if (
        seleccionados.length >=
        cantidadObjetivo
      ) {
        return;
      }

      const [
        porcentajeMinimo,
        porcentajeMaximo,
      ] = zona;

      const centroZona =
        (
          porcentajeMinimo +
          porcentajeMaximo
        ) / 2;

      const candidatosZona =
        candidatos
          .filter(
            (camino) =>
              camino
                .porcentajeOrigen >=
                porcentajeMinimo &&
              camino
                .porcentajeOrigen <=
                porcentajeMaximo &&
              !seleccionados.includes(
                camino
              )
          )
          .sort(
            (a, b) => {
              /*
                Primero preferimos
                mayor profundidad.
              */

              const diferenciaProfundidad =
                b.profundidad -
                a.profundidad;

              if (
                diferenciaProfundidad !==
                0
              ) {
                return diferenciaProfundidad;
              }

              /*
                En empate, preferimos
                el centro de la zona.
              */

              const distanciaA =
                Math.abs(
                  a.porcentajeOrigen -
                    centroZona
                );

              const distanciaB =
                Math.abs(
                  b.porcentajeOrigen -
                    centroZona
                );

              return (
                distanciaA -
                distanciaB
              );
            }
          );

      if (
        candidatosZona.length >
        0
      ) {
        seleccionados.push(
          candidatosZona[0]
        );
      }
    }
  );

  return seleccionados.sort(
    (a, b) =>
      a.indiceOrigen -
      b.indiceOrigen
  );
}

/* =========================================================
   VALIDAR LABERINTO
========================================================= */

export function validarLaberinto(
  filas,
  columnas,
  semilla,
  nivel = "facil"
) {
  /*
    Primero validamos la configuración
    para evitar generar cuadrículas inválidas.
  */

  if (
    !Number.isInteger(filas) ||
    !Number.isInteger(columnas) ||
    filas < 2 ||
    columnas < 2
  ) {
    return {
  entradaCorrecta: false,
  salidaCorrecta: false,
  solucionEncontrada: false,
  todasConectadas: false,

  valido: false,

  longitudSolucion: 0,
  cantidadGiros: 0,
      cantidadCallejones: 0,
      cantidadCaminosFalsos: 0,
      caminosFalsos: [],
      caminosFalsosPrincipales: [],
cantidadCaminosFalsosPrincipales: 0,
      cantidadObjetivoCaminosFalsos: 0,
cumpleCaminosFalsosPrincipales: true,
origenesCaminosFalsosPrincipales: [],
profundidadesCaminosFalsosPrincipales: [],
profundidadesCaminosFalsos: [],
profundidadFalsoMaxima: 0,
profundidadFalsoPromedio: 0,
      densidadGiros: 0,
densidadCallejones: 0,
  porcentajeRecorrido: 0,
  totalCeldas: 0,
};
  }

  const celdas =
    generarLaberinto(
      filas,
      columnas,
      semilla
    );

  const solucion =
    encontrarSolucion(
      celdas,
      filas,
      columnas
    );

  const cantidadGiros =
  contarGirosSolucion(
    solucion
  );

  const cantidadCallejones =
  contarCallejonesSinSalida(
    celdas,
    filas,
    columnas
  );

  const analisisCaminosFalsos =
    analizarCaminosFalsos(
      celdas,
      filas,
      columnas,
      solucion
    );

  const {
    cantidadCaminosFalsos,
    caminosFalsos,
    profundidadesCaminosFalsos,
    profundidadFalsoMaxima,
    profundidadFalsoPromedio,
  } = analisisCaminosFalsos;

  const reglaCaminosFalsos =
    REGLAS_CAMINOS_FALSOS[
      nivel
    ] ||
    REGLAS_CAMINOS_FALSOS
      .facil;

  const caminosFalsosPrincipales =
    seleccionarCaminosFalsosPrincipales(
      caminosFalsos,
      reglaCaminosFalsos
    );

  const cantidadObjetivoCaminosFalsos =
    reglaCaminosFalsos.cantidad;

  const cantidadCaminosFalsosPrincipales =
    caminosFalsosPrincipales.length;

  const cumpleCaminosFalsosPrincipales =
    cantidadCaminosFalsosPrincipales ===
    cantidadObjetivoCaminosFalsos;

  const origenesCaminosFalsosPrincipales =
    caminosFalsosPrincipales.map(
      (camino) =>
        camino.porcentajeOrigen
    );

  const profundidadesCaminosFalsosPrincipales =
    caminosFalsosPrincipales.map(
      (camino) =>
        camino.profundidad
    );
  
  const inicio =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      0,
      0
    );

  const meta =
    obtenerCelda(
      celdas,
      filas,
      columnas,
      filas - 1,
      columnas - 1
    );

  const entradaCorrecta =
    inicio?.paredes
      ?.izquierda === false;

  const salidaCorrecta =
    meta?.paredes
      ?.derecha === false;

  const solucionEncontrada =
    solucion.length > 0;

  const totalCeldas =
    filas * columnas;

  const densidadCallejones =
  totalCeldas > 0
    ? Math.round(
        (cantidadCallejones /
          totalCeldas) *
          100
      )
    : 0;

const densidadGiros =
  solucion.length > 0
    ? Math.round(
        (cantidadGiros /
          solucion.length) *
          100
      )
    : 0;

  const porcentajeRecorrido =
  totalCeldas > 0
    ? Math.round(
        (solucion.length /
          totalCeldas) *
          100
      )
    : 0;

  const cantidadConectadas =
    contarCeldasConectadas(
      celdas,
      filas,
      columnas
    );

  

  const todasConectadas =
    cantidadConectadas ===
    totalCeldas;

  return {
  entradaCorrecta,
  salidaCorrecta,
  solucionEncontrada,
  todasConectadas,

  valido:
    entradaCorrecta &&
    salidaCorrecta &&
    solucionEncontrada &&
    todasConectadas,

  longitudSolucion:
  solucion.length,

cantidadGiros,

cantidadCallejones,
    cantidadCaminosFalsos,
profundidadesCaminosFalsos,
    caminosFalsosPrincipales,
cantidadCaminosFalsosPrincipales,
    cantidadObjetivoCaminosFalsos,
cumpleCaminosFalsosPrincipales,
origenesCaminosFalsosPrincipales,
profundidadesCaminosFalsosPrincipales,
profundidadFalsoMaxima,
profundidadFalsoPromedio,
    densidadGiros,
densidadCallejones,

porcentajeRecorrido,

totalCeldas,
};
}

/* =========================================================
   BUSCAR SEMILLA VÁLIDA PARA EL NIVEL
========================================================= */

/*
  Busca semillas consecutivas hasta encontrar
  un laberinto que:

  1. sea estructuralmente válido;
  2. cumpla la cantidad de caminos falsos
     principales requerida por su nivel;
  3. cumpla profundidad y distribución por zonas.

  La semilla ganadora se devuelve para que
  desafío y solución generen exactamente
  el mismo laberinto.
*/

export function buscarSemillaValidaParaNivel({
  filas,
  columnas,
  semillaInicial,
  nivel = "facil",
  maxIntentos = 1000,
}) {
  let semillaCandidata =
    Number.isFinite(
      semillaInicial
    )
      ? Math.floor(
          semillaInicial
        )
      : 1;

  /*
    Fácil y Medio no necesitan
    caminos falsos obligatorios.

    Igual validamos normalmente
    la primera semilla.
  */

  const regla =
    REGLAS_CAMINOS_FALSOS[
      nivel
    ] ||
    REGLAS_CAMINOS_FALSOS
      .facil;

  for (
    let intento = 1;
    intento <= maxIntentos;
    intento += 1
  ) {
    const validacion =
      validarLaberinto(
        filas,
        columnas,
        semillaCandidata,
        nivel
      );

    const cumpleEstructura =
      validacion.valido ===
      true;

    const cumpleCaminosFalsos =
      regla.cantidad === 0 ||
      validacion
        .cumpleCaminosFalsosPrincipales ===
        true;

    if (
      cumpleEstructura &&
      cumpleCaminosFalsos
    ) {
      return {
        encontrada: true,

        semilla:
          semillaCandidata,

        validacion,

        intentos:
          intento,
      };
    }

    semillaCandidata += 1;
  }

  /*
    Si excepcionalmente no encontramos
    ninguna semilla dentro del límite,
    NO afirmamos que sea válida.
  */

  return {
    encontrada: false,

    semilla:
      null,

    validacion:
      null,

    intentos:
      maxIntentos,
  };
}