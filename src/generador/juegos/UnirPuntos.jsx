import { FIGURAS } from "../figuras";
export default function UnirPuntos({
  cantidadPuntos = 25,
  semilla = 1,
  mostrarSolucion = false,
  figura = "pez",
}) {
  const ancho = 620;
  const alto = 720;

  const figuraSeleccionada =
  FIGURAS[figura] || FIGURAS.pez;

const puntos = generarFigura(
  figuraSeleccionada.puntos,
  cantidadPuntos,
  ancho,
  alto
);

  const puntosLinea = [
    ...puntos,
    puntos[0],
  ]
    .filter(Boolean)
    .map((punto) => `${punto.x},${punto.y}`)
    .join(" ");

  const tamanoNumero =
    cantidadPuntos >= 50
      ? 13
      : cantidadPuntos >= 35
        ? 14
        : 16;

  return (
    <svg
      viewBox={`0 0 ${ancho} ${alto}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        width={ancho}
        height={alto}
        fill="white"
      />

      {/* SOLUCIÓN */}

      {mostrarSolucion && (
        <polyline
          points={puntosLinea}
          fill="none"
          stroke="red"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.7"
        />
      )}

      {/* PUNTOS */}

{puntos.map((punto, index) => {
  const anterior =
    puntos[
      (index - 1 + puntos.length) %
        puntos.length
    ];

  const siguiente =
    puntos[
      (index + 1) % puntos.length
    ];

  const direccionX =
    siguiente.x - anterior.x;

  const direccionY =
    siguiente.y - anterior.y;

  /*
    Normal perpendicular al contorno
  */

  let normalX = -direccionY;
  let normalY = direccionX;

  const longitudNormal =
    Math.hypot(normalX, normalY) || 1;

  normalX /= longitudNormal;
  normalY /= longitudNormal;

  /*
    Centro aproximado de la figura
  */

  const centroX =
    puntos.reduce(
      (total, item) => total + item.x,
      0
    ) / puntos.length;

  const centroY =
    puntos.reduce(
      (total, item) => total + item.y,
      0
    ) / puntos.length;

  /*
    Vector desde el centro hacia el punto.
    Ese vector representa aproximadamente
    el exterior de la silueta.
  */

  const haciaAfueraX =
    punto.x - centroX;

  const haciaAfueraY =
    punto.y - centroY;

  /*
    Si la normal apunta hacia adentro,
    la invertimos.
  */

  const producto =
    normalX * haciaAfueraX +
    normalY * haciaAfueraY;

  if (producto < 0) {
    normalX *= -1;
    normalY *= -1;
  }

  const distanciaNumero =
    cantidadPuntos >= 50
      ? 18
      : cantidadPuntos >= 35
        ? 20
        : 23;

  const textoX =
    punto.x +
    normalX * distanciaNumero;

  const textoY =
    punto.y +
    normalY * distanciaNumero;

    return (
    <g key={punto.numero}>
      <circle
        cx={punto.x}
        cy={punto.y}
        r="5"
        fill="black"
      />

      <text
        x={textoX}
        y={textoY}
        fontSize={tamanoNumero}
        fontWeight="600"
        fill="black"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        {punto.numero}
      </text>
    </g>
  );
})}

    </svg>
  );
}


/* =========================================================
   FIGURA: PEZ
========================================================= */


/* =========================================================
   FIGURA: PEZ
========================================================= */

function generarFigura(
  forma,
  cantidad,
  ancho,
  alto
) {
  /*
    Puntos principales que definen la silueta.

    Están expresados en coordenadas relativas
    de 0 a 1 para poder escalar la figura.
  */

  /*
    Área disponible.

    La figura utiliza gran parte del A4
    para separar mejor los puntos.
  */

  const margenX = 45;
  const margenY = 55;

  const anchoFigura =
    ancho - margenX * 2;

  const altoFigura =
    alto - margenY * 2;

  const puntosForma = forma.map(
    ([x, y]) => ({
      x:
        margenX +
        x * anchoFigura,

      y:
        margenY +
        y * altoFigura,
    })
  );

  /*
    Calculamos la longitud completa
    del contorno.
  */

  const segmentos = [];

  let longitudTotal = 0;

  for (
    let i = 0;
    i < puntosForma.length - 1;
    i++
  ) {
    const inicio = puntosForma[i];
    const fin = puntosForma[i + 1];

    const longitud = Math.hypot(
      fin.x - inicio.x,
      fin.y - inicio.y
    );

    segmentos.push({
      inicio,
      fin,
      longitud,
      acumuladoInicio: longitudTotal,
    });

    longitudTotal += longitud;
  }

  /*
    Distribución uniforme.

    Esto es importante:
    no colocamos simplemente un punto
    en cada coordenada base.

    Podemos pedir 15, 30 o 60 puntos
    y se reparten sobre toda la figura.
  */

  const puntos = [];

  for (let i = 0; i < cantidad; i++) {
    const distanciaObjetivo =
      (i / cantidad) *
      longitudTotal;

    const segmento =
      segmentos.find(
        (item) =>
          distanciaObjetivo >=
            item.acumuladoInicio &&
          distanciaObjetivo <
            item.acumuladoInicio +
              item.longitud
      ) || segmentos[segmentos.length - 1];

    const distanciaDentro =
      distanciaObjetivo -
      segmento.acumuladoInicio;

    const progreso =
      segmento.longitud === 0
        ? 0
        : distanciaDentro /
          segmento.longitud;

    const x =
      segmento.inicio.x +
      (segmento.fin.x -
        segmento.inicio.x) *
        progreso;

    const y =
      segmento.inicio.y +
      (segmento.fin.y -
        segmento.inicio.y) *
        progreso;

    puntos.push({
      numero: i + 1,
      x,
      y,
    });
  }

  return puntos;
}