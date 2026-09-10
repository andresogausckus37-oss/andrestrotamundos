/* =========================================================
   CONFIGURACIÓN VISUAL
========================================================= */

const ANCHO = 620;
const ALTO = 720;

const MARGEN_X = 20;
const MARGEN_Y = 20;

/* =========================================================
   COMPONENTE LABERINTO
========================================================= */

export default function Laberinto({
  filas = 10,
  columnas = 8,
  semilla = 1,
  mostrarSolucion = false,
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

      {/* =====================================================
          INICIO
      ====================================================== */}

      <text
        x={MARGEN_X + 8}
        y={
          MARGEN_Y +
          altoCelda / 2
        }
        fontSize="18"
        fontWeight="700"
        dominantBaseline="middle"
        fill="black"
      >
        INICIO
      </text>

      {/* =====================================================
          META
      ====================================================== */}

      <text
        x={
          MARGEN_X +
          (columnas - 1) *
            anchoCelda +
          anchoCelda -
          8
        }
        y={
          MARGEN_Y +
          (filas - 1) *
            altoCelda +
          altoCelda / 2
        }
        fontSize="18"
        fontWeight="700"
        textAnchor="end"
        dominantBaseline="middle"
        fill="black"
      >
        META
      </text>
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
   VALIDAR LABERINTO
========================================================= */

export function validarLaberinto(
  filas,
  columnas,
  semilla
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
    densidadGiros,
densidadCallejones,

porcentajeRecorrido,

totalCeldas,
};
}