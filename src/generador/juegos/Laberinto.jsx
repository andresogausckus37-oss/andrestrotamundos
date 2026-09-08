export default function Laberinto({
  filas = 10,
  columnas = 8,
  semilla = 1,
  mostrarSolucion = false,
}) {
  const ancho = 620;
  const alto = 720;

  const margenX = 20;
  const margenY = 20;

  const anchoCelda = (ancho - margenX * 2) / columnas;
  const altoCelda = (alto - margenY * 2) / filas;

  const celdas = generarLaberinto(
    filas,
    columnas,
    semilla
  );

  const solucion = encontrarSolucion(
    celdas,
    filas,
    columnas
  );

  const puntosSolucion = solucion
    .map((celda) => {
      const x =
        margenX +
        celda.columna * anchoCelda +
        anchoCelda / 2;

      const y =
        margenY +
        celda.fila * altoCelda +
        altoCelda / 2;

      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* FONDO */}

      <rect
        x="0"
        y="0"
        width={ancho}
        height={alto}
        fill="white"
      />

      {/* LABERINTO */}

      <g
        stroke="black"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      >
        {celdas.map((celda) => {
          const x =
            margenX + celda.columna * anchoCelda;

          const y =
            margenY + celda.fila * altoCelda;

          return (
            <g key={`${celda.fila}-${celda.columna}`}>

              {celda.paredes.arriba && (
                <line
                  x1={x}
                  y1={y}
                  x2={x + anchoCelda}
                  y2={y}
                />
              )}

              {celda.paredes.derecha && (
                <line
                  x1={x + anchoCelda}
                  y1={y}
                  x2={x + anchoCelda}
                  y2={y + altoCelda}
                />
              )}

              {celda.paredes.abajo && (
                <line
                  x1={x}
                  y1={y + altoCelda}
                  x2={x + anchoCelda}
                  y2={y + altoCelda}
                />
              )}

              {celda.paredes.izquierda && (
                <line
                  x1={x}
                  y1={y}
                  x2={x}
                  y2={y + altoCelda}
                />
              )}

            </g>
          );
        })}
      </g>

      {/* SOLUCIÓN */}

      {mostrarSolucion && solucion.length > 0 && (
        <polyline
          points={puntosSolucion}
          fill="none"
          stroke="red"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      )}

      {/* INICIO */}

      <text
        x={margenX + 8}
        y={margenY + altoCelda / 2}
        fontSize="18"
        fontWeight="700"
        dominantBaseline="middle"
        fill="black"
      >
        INICIO
      </text>

      {/* META */}

      <text
        x={
          margenX +
          (columnas - 1) * anchoCelda +
          anchoCelda -
          8
        }
        y={
          margenY +
          (filas - 1) * altoCelda +
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
   GENERADOR DEL LABERINTO
========================================================= */

function generarLaberinto(
  filas,
  columnas,
  semillaInicial
) {
  const celdas = [];

  for (let fila = 0; fila < filas; fila++) {
    for (
      let columna = 0;
      columna < columnas;
      columna++
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

  let semilla = semillaInicial;

  function random() {
    const x = Math.sin(semilla++) * 10000;
    return x - Math.floor(x);
  }

  function obtenerCelda(fila, columna) {
    return celdas.find(
      (celda) =>
        celda.fila === fila &&
        celda.columna === columna
    );
  }

  const pila = [];

  const inicio = obtenerCelda(0, 0);

  inicio.visitada = true;

  pila.push(inicio);

  while (pila.length > 0) {
    const actual = pila[pila.length - 1];

    const vecinos = [];

    const arriba = obtenerCelda(
      actual.fila - 1,
      actual.columna
    );

    const derecha = obtenerCelda(
      actual.fila,
      actual.columna + 1
    );

    const abajo = obtenerCelda(
      actual.fila + 1,
      actual.columna
    );

    const izquierda = obtenerCelda(
      actual.fila,
      actual.columna - 1
    );

    if (arriba && !arriba.visitada) {
      vecinos.push({
        celda: arriba,
        direccion: "arriba",
      });
    }

    if (derecha && !derecha.visitada) {
      vecinos.push({
        celda: derecha,
        direccion: "derecha",
      });
    }

    if (abajo && !abajo.visitada) {
      vecinos.push({
        celda: abajo,
        direccion: "abajo",
      });
    }

    if (izquierda && !izquierda.visitada) {
      vecinos.push({
        celda: izquierda,
        direccion: "izquierda",
      });
    }

    if (vecinos.length === 0) {
      pila.pop();
      continue;
    }

    const elegido =
      vecinos[
        Math.floor(random() * vecinos.length)
      ];

    const siguiente = elegido.celda;

    if (elegido.direccion === "arriba") {
      actual.paredes.arriba = false;
      siguiente.paredes.abajo = false;
    }

    if (elegido.direccion === "derecha") {
      actual.paredes.derecha = false;
      siguiente.paredes.izquierda = false;
    }

    if (elegido.direccion === "abajo") {
      actual.paredes.abajo = false;
      siguiente.paredes.arriba = false;
    }

    if (elegido.direccion === "izquierda") {
      actual.paredes.izquierda = false;
      siguiente.paredes.derecha = false;
    }

    siguiente.visitada = true;

    pila.push(siguiente);
  }

  const primera = obtenerCelda(0, 0);
  primera.paredes.izquierda = false;

  const ultima = obtenerCelda(
    filas - 1,
    columnas - 1
  );

  ultima.paredes.derecha = false;

  return celdas;
}


/* =========================================================
   CALCULAR SOLUCIÓN
========================================================= */

function encontrarSolucion(
  celdas,
  filas,
  columnas
) {
  function obtenerCelda(fila, columna) {
    return celdas.find(
      (celda) =>
        celda.fila === fila &&
        celda.columna === columna
    );
  }

  const inicio = obtenerCelda(0, 0);
  const meta = obtenerCelda(
    filas - 1,
    columnas - 1
  );

  const visitadas = new Set();
  const pila = [
    {
      celda: inicio,
      camino: [inicio],
    },
  ];

  while (pila.length > 0) {
    const actual = pila.pop();

    const celda = actual.celda;
    const clave = `${celda.fila}-${celda.columna}`;

    if (visitadas.has(clave)) {
      continue;
    }

    visitadas.add(clave);

    if (
      celda.fila === meta.fila &&
      celda.columna === meta.columna
    ) {
      return actual.camino;
    }

    const vecinos = [];

    // ARRIBA
    if (!celda.paredes.arriba) {
      const vecino = obtenerCelda(
        celda.fila - 1,
        celda.columna
      );

      if (vecino) vecinos.push(vecino);
    }

    // DERECHA
    if (!celda.paredes.derecha) {
      const vecino = obtenerCelda(
        celda.fila,
        celda.columna + 1
      );

      if (vecino) vecinos.push(vecino);
    }

    // ABAJO
    if (!celda.paredes.abajo) {
      const vecino = obtenerCelda(
        celda.fila + 1,
        celda.columna
      );

      if (vecino) vecinos.push(vecino);
    }

    // IZQUIERDA
    if (!celda.paredes.izquierda) {
      const vecino = obtenerCelda(
        celda.fila,
        celda.columna - 1
      );

      if (vecino) vecinos.push(vecino);
    }

    vecinos.forEach((vecino) => {
      const claveVecino =
        `${vecino.fila}-${vecino.columna}`;

      if (!visitadas.has(claveVecino)) {
        pila.push({
          celda: vecino,
          camino: [
            ...actual.camino,
            vecino,
          ],
        });
      }
    });
  }

  return [];
}

export function validarLaberinto(
  filas,
  columnas,
  semilla
) {
  const celdas = generarLaberinto(
    filas,
    columnas,
    semilla
  );

  const solucion = encontrarSolucion(
    celdas,
    filas,
    columnas
  );

  const obtenerCelda = (fila, columna) =>
    celdas.find(
      (celda) =>
        celda.fila === fila &&
        celda.columna === columna
    );

  const inicio = obtenerCelda(0, 0);

  const meta = obtenerCelda(
    filas - 1,
    columnas - 1
  );

  const entradaCorrecta =
    inicio?.paredes?.izquierda === false;

  const salidaCorrecta =
    meta?.paredes?.derecha === false;

  const solucionEncontrada =
    solucion.length > 0;

  const todasConectadas =
    contarCeldasConectadas(
      celdas,
      filas,
      columnas
    ) === filas * columnas;

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

    longitudSolucion: solucion.length,
    totalCeldas: filas * columnas,
  };
}


/* =========================================================
   CONTAR CELDAS CONECTADAS
========================================================= */

function contarCeldasConectadas(
  celdas,
  filas,
  columnas
) {
  function obtenerCelda(fila, columna) {
    return celdas.find(
      (celda) =>
        celda.fila === fila &&
        celda.columna === columna
    );
  }

  const inicio = obtenerCelda(0, 0);

  if (!inicio) return 0;

  const visitadas = new Set();

  const pila = [inicio];

  while (pila.length > 0) {
    const celda = pila.pop();

    const clave =
      `${celda.fila}-${celda.columna}`;

    if (visitadas.has(clave)) {
      continue;
    }

    visitadas.add(clave);

    // ARRIBA

    if (!celda.paredes.arriba) {
      const vecino = obtenerCelda(
        celda.fila - 1,
        celda.columna
      );

      if (vecino) pila.push(vecino);
    }

    // DERECHA

    if (!celda.paredes.derecha) {
      const vecino = obtenerCelda(
        celda.fila,
        celda.columna + 1
      );

      if (vecino) pila.push(vecino);
    }

    // ABAJO

    if (!celda.paredes.abajo) {
      const vecino = obtenerCelda(
        celda.fila + 1,
        celda.columna
      );

      if (vecino) pila.push(vecino);
    }

    // IZQUIERDA

    if (!celda.paredes.izquierda) {
      const vecino = obtenerCelda(
        celda.fila,
        celda.columna - 1
      );

      if (vecino) pila.push(vecino);
    }
  }

  return visitadas.size;
}