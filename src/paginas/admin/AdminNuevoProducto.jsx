import { useMemo, useState } from "react";
import {
  FilePlus2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { productosDigitales } from "../../datos/productosDigitales";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CATEGORIAS = [
  { valor: "laberintos", nombre: "Laberintos" },
  { valor: "crucigramas", nombre: "Crucigramas" },
  { valor: "sopa-de-letras", nombre: "Sopa de letras" },
  { valor: "rompecabezas", nombre: "Rompecabezas" },
  { valor: "sudoku", nombre: "Sudoku" },
  {
    valor: "palabras-desordenadas",
    nombre: "Palabras desordenadas",
  },
];

const PUBLICOS = [
  "Niños",
  "Adultos",
  "Para todas las edades",
];

const NIVELES = [
  "Niños",
  "Fácil",
  "Medio",
  "Difícil",
  "Avanzado",
  "Imposible",
  "Dificultad progresiva",
];

const ANCHO_OBJETIVO = 794;
const CALIDAD_WEBP = 0.82;

const NOMBRES_IMAGENES = [
  "Imagen 1 — Principal de tienda",
  "Imagen 2 — Segunda imagen de tienda",
  "Imagen 3 — Tercera imagen de tienda",
  "Imagen 4 — Cuarta imagen de tienda",
  "Imagen 5 — Portada del PDF",
  "Imagen 6 — Página final del PDF",
];

/* =========================================================
   UTILIDADES
========================================================= */

const crearId = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const obtenerNombreCategoria = (categoria) =>
  CATEGORIAS.find(
    (item) => item.valor === categoria
  )?.nombre.toLowerCase() || "actividades";

const pluralActividad = (categoria) => {
  const nombres = {
    laberintos: "laberintos",
    crucigramas: "crucigramas",
    "sopa-de-letras": "sopas de letras",
    rompecabezas: "rompecabezas",
    sudoku: "sudokus",
    "palabras-desordenadas":
      "actividades de palabras desordenadas",
  };

  return nombres[categoria] || "actividades";
};

/* =========================================================
   OPTIMIZAR IMAGEN
========================================================= */

const procesarImagen = (archivo) =>
  new Promise((resolve, reject) => {
    const urlOriginal = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      const escala = Math.min(
        1,
        ANCHO_OBJETIVO / imagen.naturalWidth
      );

      const ancho = Math.round(
        imagen.naturalWidth * escala
      );

      const alto = Math.round(
        imagen.naturalHeight * escala
      );

      const canvas = document.createElement("canvas");

      canvas.width = ancho;
      canvas.height = alto;

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        URL.revokeObjectURL(urlOriginal);

        reject(
          new Error("No se pudo procesar la imagen.")
        );

        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      ctx.drawImage(
        imagen,
        0,
        0,
        ancho,
        alto
      );

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(urlOriginal);

          if (!blob) {
            reject(
              new Error(
                "No se pudo convertir la imagen a WebP."
              )
            );

            return;
          }

          const archivoOptimizado = new File(
            [blob],
            "imagen.webp",
            {
              type: "image/webp",
            }
          );

          resolve({
            archivoOptimizado,

            urlOptimizada:
              URL.createObjectURL(
                archivoOptimizado
              ),

            pesoOriginal: archivo.size,
            pesoOptimizado:
              archivoOptimizado.size,
          });
        },
        "image/webp",
        CALIDAD_WEBP
      );
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(urlOriginal);

      reject(
        new Error("No se pudo leer la imagen.")
      );
    };

    imagen.src = urlOriginal;
  });

const archivoADataUrl = (archivo) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();

    lector.onload = () =>
      resolve(lector.result);

    lector.onerror = () =>
      reject(
        new Error(
          "No se pudo preparar la imagen."
        )
      );

    lector.readAsDataURL(archivo);
  });

/* =========================================================
   COMPONENTE
========================================================= */

export default function AdminNuevoProducto() {
  const [formulario, setFormulario] = useState({
    nombre: "",
    categoria: "",
    publico: "",
    nivel: "",

    laminas: "",
    soluciones: "",
    paginas: "",

    precioARS: "",
    ofertaActiva: false,
    precioOfertaARS: "",

    precioUSD: "",
    ofertaUSDActiva: false,
    precioOfertaUSD: "",

    etiquetaOferta: "Oferta lanzamiento",

    ventaCruzadaId: "",
    destacado: false,

    descripcion: "",
    descripcionLarga: "",
    incluye: "",
    beneficios: "",
  });

  const [imagenes, setImagenes] = useState(
    Array(6).fill(null)
  );

  const [
    procesandoImagen,
    setProcesandoImagen,
  ] = useState(false);

  const [guardando, setGuardando] =
    useState(false);

  const idGenerado = useMemo(
    () => crearId(formulario.nombre),
    [formulario.nombre]
  );

  const idRepetido =
    idGenerado &&
    productosDigitales.some(
      (producto) =>
        producto.id === idGenerado
    );

  const cambiar = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  /* =======================================================
     IMÁGENES
  ======================================================= */

  const seleccionarImagen = async (
    indice,
    archivo
  ) => {
    if (!archivo) return;

    try {
      setProcesandoImagen(true);

      const resultado =
        await procesarImagen(archivo);

      setImagenes((actuales) => {
        const nuevas = [...actuales];

        if (
          nuevas[indice]?.urlOptimizada
        ) {
          URL.revokeObjectURL(
            nuevas[indice].urlOptimizada
          );
        }

        nuevas[indice] = resultado;

        return nuevas;
      });
    } catch (error) {
      console.error(error);
      alert(error.message);
    } finally {
      setProcesandoImagen(false);
    }
  };

  const eliminarImagen = (indice) => {
    setImagenes((actuales) => {
      const nuevas = [...actuales];

      if (
        nuevas[indice]?.urlOptimizada
      ) {
        URL.revokeObjectURL(
          nuevas[indice].urlOptimizada
        );
      }

      nuevas[indice] = null;

      return nuevas;
    });
  };

  const subirImagen = async (
    imagen,
    numero
  ) => {
    const imagenBase64 =
      await archivoADataUrl(
        imagen.archivoOptimizado
      );

    const respuesta = await fetch(
      "/api/admin/pedidos?accion=subir-imagen-producto",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          productoId: idGenerado,
          numeroImagen: numero,
          imagenBase64,
        }),
      }
    );

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
          `No se pudo subir la imagen ${numero}.`
      );
    }

    return datos.url;
  };

  /* =======================================================
     GENERAR TEXTOS
  ======================================================= */

  const generarTextos = () => {
    const cantidad =
      Number(formulario.laminas) || 0;

    const soluciones =
      Number(formulario.soluciones) || 0;

    const paginas =
      Number(formulario.paginas) || 0;

    const actividad = pluralActividad(
      formulario.categoria
    );

    const categoria =
      obtenerNombreCategoria(
        formulario.categoria
      );

    const publico =
      formulario.publico ||
      "todas las edades";

    const nivel =
      formulario.nivel || "variado";

    const descripcion = [
      `${cantidad} ${actividad} imprimibles`,
      `para ${publico.toLowerCase()}`,

      soluciones > 0
        ? `con ${soluciones} soluciones incluidas`
        : "",

      nivel
        ? `de nivel ${nivel.toLowerCase()}`
        : "",
    ]
      .filter(Boolean)
      .join(", ")
      .concat(".");

    const descripcionLarga =
      `Una colección de ${cantidad} ${actividad} imprimibles ` +
      `pensada para ${publico.toLowerCase()}. ` +
      `Las actividades ofrecen un nivel ${nivel.toLowerCase()} ` +
      `y están preparadas en formato PDF A4 para imprimir fácilmente ` +
      `en casa o en una imprenta.` +
      (soluciones > 0
        ? ` Incluye ${soluciones} soluciones para comprobar cada actividad.`
        : "") +
      (paginas > 0
        ? ` El archivo contiene ${paginas} páginas en total.`
        : "") +
      ` Una propuesta práctica para disfrutar de ${categoria} en formato imprimible.`;

    const incluye = [
      `${cantidad} ${actividad}`,

      soluciones > 0
        ? `${soluciones} soluciones incluidas`
        : "",

      "PDF A4 listo para imprimir",
      "Descarga digital instantánea",
    ]
      .filter(Boolean)
      .join("\n");

    const beneficiosPorCategoria = {
      laberintos: [
        "Concentración",
        "Seguimiento visual",
        "Reconocimiento de patrones",
        "Entretenimiento sin pantallas",
      ],

      crucigramas: [
        "Concentración",
        "Lógica",
        "Memoria",
        "Vocabulario",
      ],

      "sopa-de-letras": [
        "Concentración",
        "Memoria",
        "Vocabulario",
        "Entretenimiento y relajación",
      ],

      rompecabezas: [
        "Concentración",
        "Lógica",
        "Resolución de problemas",
        "Entretenimiento sin pantallas",
      ],

      sudoku: [
        "Concentración",
        "Lógica",
        "Razonamiento",
        "Agilidad mental",
      ],

      "palabras-desordenadas": [
        "Concentración",
        "Vocabulario",
        "Memoria",
        "Agilidad mental",
      ],
    };

    const beneficios =
      beneficiosPorCategoria[
        formulario.categoria
      ] || [
        "Concentración",
        "Entretenimiento",
      ];

    setFormulario((actual) => ({
      ...actual,
      descripcion,
      descripcionLarga,
      incluye,
      beneficios:
        beneficios.join("\n"),
    }));
  };

  /* =======================================================
     PRODUCTO FINAL
  ======================================================= */

  const convertirLista = (texto) =>
    texto
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

  const productoFinal = {
    id: idGenerado,

    nombre:
      formulario.nombre.trim(),

    ventaCruzadaId:
      formulario.ventaCruzadaId,

    descripcion:
      formulario.descripcion.trim(),

    descripcionLarga:
      formulario.descripcionLarga.trim(),

    tipo: "digital",

    categoria:
      formulario.categoria,

    linea: "juegos",

    precioARS:
      Number(formulario.precioARS) ||
      0,

    descuento: 0,

    oferta: {
      activa:
        formulario.ofertaActiva,

      precioARS:
        formulario.ofertaActiva
          ? Number(
              formulario.precioOfertaARS
            ) || 0
          : 0,

      etiqueta:
        formulario.ofertaActiva
          ? formulario.etiquetaOferta.trim()
          : "",
    },

    precioUSD:
      Number(formulario.precioUSD) ||
      0,

    descuentoUSD: 0,

    ofertaUSD: {
      activa:
        formulario.ofertaUSDActiva,

      precioUSD:
        formulario.ofertaUSDActiva
          ? Number(
              formulario.precioOfertaUSD
            ) || 0
          : 0,

      etiqueta:
        formulario.ofertaUSDActiva
          ? formulario.etiquetaOferta.trim()
          : "",
    },

    imagenes: {
      portada: "",
      preview: "",
      previewsIndividuales: [],
      portadaPDF: "",
      paginaFinalPDF: "",
    },

    formato: "PDF",

    tamano: "A4",

    paginas:
      Number(formulario.paginas) ||
      0,

    laminas:
      Number(formulario.laminas) ||
      0,

    soluciones:
      Number(formulario.soluciones) ||
      0,

    incluye: convertirLista(
      formulario.incluye
    ),

    beneficios: convertirLista(
      formulario.beneficios
    ),

    edadRecomendada:
      formulario.publico,

    nivel:
      formulario.nivel,

    entrega:
      "Descarga digital",

    destacado:
      formulario.destacado,
  };

  /* =======================================================
     GUARDAR PRODUCTO
  ======================================================= */

  const agregarProducto = async () => {
    if (!formulario.nombre.trim()) {
      alert(
        "Falta el nombre del producto."
      );
      return;
    }

    if (!formulario.categoria) {
      alert(
        "Falta seleccionar la categoría."
      );
      return;
    }

    if (!formulario.publico) {
      alert(
        "Falta seleccionar el público."
      );
      return;
    }

    if (!formulario.nivel) {
      alert(
        "Falta seleccionar el nivel."
      );
      return;
    }

    if (!formulario.laminas) {
      alert(
        "Falta indicar la cantidad de actividades."
      );
      return;
    }

    if (idRepetido) {
      alert(
        "Ya existe un producto con este ID."
      );
      return;
    }

    if (
      !formulario.descripcion.trim()
    ) {
      alert(
        "Primero generá los textos del producto."
      );
      return;
    }

    if (
      imagenes.some(
        (imagen) => !imagen
      )
    ) {
      alert(
        "Falta seleccionar alguna de las 6 imágenes."
      );
      return;
    }

    try {
      setGuardando(true);

      const urls = [];

      /*
       * Subimos secuencialmente para
       * consumir menos memoria.
       */
      for (
        let i = 0;
        i < imagenes.length;
        i += 1
      ) {
        const url =
          await subirImagen(
            imagenes[i],
            i + 1
          );

        urls.push(url);
      }

      const productoConImagenes = {
        ...productoFinal,

        imagenes: {
          portada: urls[0],

          preview: urls[1],

          previewsIndividuales: [
            urls[2],
            urls[3],
          ],

          portadaPDF: urls[4],

          paginaFinalPDF: urls[5],
        },
      };

      const respuesta = await fetch(
        "/api/admin/pedidos?accion=crear-producto",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify(
            productoConImagenes
          ),
        }
      );

      const datos =
        await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo guardar el producto."
        );
      }

      alert(
        "Producto guardado correctamente."
      );

      console.log(
        "Producto guardado:",
        datos
      );
    } catch (error) {
      console.error(
        "Error guardando producto:",
        error
      );

      alert(error.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>

          <h1 className="text-xl font-bold text-slate-900">
            Nuevo producto
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Completá los datos básicos y el sistema preparará la ficha.
          </p>
        </div>

        {/* INFORMACIÓN */}

        <Seccion titulo="Información del producto">
          <Campo
            titulo="Nombre"
            valor={formulario.nombre}
            onChange={(v) =>
              cambiar("nombre", v)
            }
          />

          {idGenerado && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                idRepetido
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-slate-500"
              }`}
            >
              ID:{" "}
              <strong>
                {idGenerado}
              </strong>

              {idRepetido &&
                " · Este producto ya existe"}
            </div>
          )}

          <Selector
            titulo="Categoría"
            valor={formulario.categoria}
            onChange={(v) =>
              cambiar("categoria", v)
            }
          >
            <option value="">
              Seleccionar categoría
            </option>

            {CATEGORIAS.map(
              (categoria) => (
                <option
                  key={
                    categoria.valor
                  }
                  value={
                    categoria.valor
                  }
                >
                  {categoria.nombre}
                </option>
              )
            )}
          </Selector>

          <div className="grid gap-4 sm:grid-cols-2">
            <Selector
              titulo="Público"
              valor={formulario.publico}
              onChange={(v) =>
                cambiar("publico", v)
              }
            >
              <option value="">
                Seleccionar
              </option>

              {PUBLICOS.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </Selector>

            <Selector
              titulo="Nivel"
              valor={formulario.nivel}
              onChange={(v) =>
                cambiar("nivel", v)
              }
            >
              <option value="">
                Seleccionar
              </option>

              {NIVELES.map(
                (item) => (
                  <option
                    key={item}
                    value={item}
                  >
                    {item}
                  </option>
                )
              )}
            </Selector>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              titulo="Actividades"
              tipo="number"
              valor={
                formulario.laminas
              }
              onChange={(v) =>
                cambiar(
                  "laminas",
                  v
                )
              }
            />

            <Campo
              titulo="Soluciones"
              tipo="number"
              valor={
                formulario.soluciones
              }
              onChange={(v) =>
                cambiar(
                  "soluciones",
                  v
                )
              }
            />
          </div>

          <Campo
            titulo="Páginas (opcional)"
            tipo="number"
            valor={
              formulario.paginas
            }
            onChange={(v) =>
              cambiar("paginas", v)
            }
          />
        </Seccion>

                {/* PRECIOS */}

        <Seccion titulo="Precios">

          {/* ARGENTINA */}

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                titulo="Precio ARS"
                tipo="number"
                valor={
                  formulario.precioARS
                }
                onChange={(v) =>
                  cambiar(
                    "precioARS",
                    v
                  )
                }
              />

              <Campo
                titulo="Precio oferta ARS"
                tipo="number"
                valor={
                  formulario.precioOfertaARS
                }
                onChange={(v) =>
                  cambiar(
                    "precioOfertaARS",
                    v
                  )
                }
              />
            </div>

            <div className="mt-3">
              <Check
                titulo="Oferta Argentina"
                activo={
                  formulario.ofertaActiva
                }
                onChange={(v) =>
                  cambiar(
                    "ofertaActiva",
                    v
                  )
                }
              />
            </div>
          </div>

          {/* INTERNACIONAL */}

          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Campo
                titulo="Precio USD"
                tipo="number"
                paso="0.01"
                valor={
                  formulario.precioUSD
                }
                onChange={(v) =>
                  cambiar(
                    "precioUSD",
                    v
                  )
                }
              />

              <Campo
                titulo="Precio oferta USD"
                tipo="number"
                paso="0.01"
                valor={
                  formulario.precioOfertaUSD
                }
                onChange={(v) =>
                  cambiar(
                    "precioOfertaUSD",
                    v
                  )
                }
              />
            </div>

            <div className="mt-3">
              <Check
                titulo="Oferta internacional"
                activo={
                  formulario.ofertaUSDActiva
                }
                onChange={(v) =>
                  cambiar(
                    "ofertaUSDActiva",
                    v
                  )
                }
              />
            </div>
          </div>

          {(formulario.ofertaActiva ||
            formulario.ofertaUSDActiva) && (
            <Campo
              titulo="Etiqueta oferta"
              valor={
                formulario.etiquetaOferta
              }
              onChange={(v) =>
                cambiar(
                  "etiquetaOferta",
                  v
                )
              }
            />
          )}

        </Seccion>

        {/* CONFIGURACIÓN */}

        <Seccion titulo="Configuración">
          <Selector
            titulo="Venta cruzada"
            valor={
              formulario.ventaCruzadaId
            }
            onChange={(v) =>
              cambiar(
                "ventaCruzadaId",
                v
              )
            }
          >
            <option value="">
              Sin venta cruzada
            </option>

            {productosDigitales.map(
              (producto) => (
                <option
                  key={producto.id}
                  value={producto.id}
                >
                  {producto.nombre}
                </option>
              )
            )}
          </Selector>

          <Check
            titulo="Producto destacado"
            activo={
              formulario.destacado
            }
            onChange={(v) =>
              cambiar(
                "destacado",
                v
              )
            }
          />
        </Seccion>

        {/* GENERADOR */}

        <section className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center gap-2">
            <FilePlus2
              size={18}
              className="text-sky-600"
            />

            <h2 className="text-sm font-bold text-slate-900">
              Textos del producto
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            Generá una base automáticamente utilizando los datos anteriores.
            Después podés modificar cualquier texto.
          </p>

          <button
            type="button"
            onClick={generarTextos}
            disabled={
              !formulario.categoria ||
              !formulario.laminas ||
              !formulario.publico ||
              !formulario.nivel
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-40"
          >
            <RefreshCw size={15} />
            Generar textos
          </button>
        </section>

        {/* TEXTOS */}

        <Seccion titulo="Descripción y contenido">
          <Area
            titulo="Descripción corta"
            valor={
              formulario.descripcion
            }
            onChange={(v) =>
              cambiar(
                "descripcion",
                v
              )
            }
            filas={3}
          />

          <Area
            titulo="Descripción larga"
            valor={
              formulario.descripcionLarga
            }
            onChange={(v) =>
              cambiar(
                "descripcionLarga",
                v
              )
            }
            filas={7}
          />

          <Area
            titulo="Qué incluye"
            ayuda="Un elemento por línea"
            valor={
              formulario.incluye
            }
            onChange={(v) =>
              cambiar(
                "incluye",
                v
              )
            }
            filas={6}
          />

          <Area
            titulo="Beneficios"
            ayuda="Un beneficio por línea"
            valor={
              formulario.beneficios
            }
            onChange={(v) =>
              cambiar(
                "beneficios",
                v
              )
            }
            filas={6}
          />
        </Seccion>

        {/* IMÁGENES */}

        <Seccion titulo="Imágenes del producto">
          <p className="text-xs leading-5 text-slate-500">
            Seleccioná las 6 imágenes originales. Se optimizan
            automáticamente a WebP, con un ancho máximo de 794 px.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {NOMBRES_IMAGENES.map(
              (titulo, indice) => (
                <ImagenProducto
                  key={titulo}
                  titulo={titulo}
                  imagen={
                    imagenes[indice]
                  }
                  deshabilitado={
                    procesandoImagen ||
                    guardando
                  }
                  onSeleccionar={(
                    archivo
                  ) =>
                    seleccionarImagen(
                      indice,
                      archivo
                    )
                  }
                  onEliminar={() =>
                    eliminarImagen(
                      indice
                    )
                  }
                />
              )
            )}
          </div>

          {procesandoImagen && (
            <p className="text-xs font-semibold text-sky-600">
              Optimizando imagen...
            </p>
          )}
        </Seccion>

        {/* RESULTADO */}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Ficha generada
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Esta será la información del producto.
          </p>

          <pre className="mt-4 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-[10px] text-slate-100">
            {JSON.stringify(
              productoFinal,
              null,
              2
            )}
          </pre>

          <button
            type="button"
            onClick={
              agregarProducto
            }
            disabled={
              idRepetido ||
              procesandoImagen ||
              guardando
            }
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando
              ? "Subiendo imágenes y guardando..."
              : "Agregar producto"}
          </button>

        </section>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTES DEL FORMULARIO
========================================================= */

function ImagenProducto({
  titulo,
  imagen,
  deshabilitado,
  onSeleccionar,
  onEliminar,
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-bold text-slate-700">
        {titulo}
      </p>

      {!imagen ? (
        <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white px-3 py-6 text-center">
          <Upload
            size={22}
            className="text-sky-600"
          />

          <span className="mt-2 text-xs font-semibold text-slate-600">
            Seleccionar imagen
          </span>

          <input
            type="file"
            accept="image/*"
            disabled={
              deshabilitado
            }
            className="hidden"
            onChange={(e) => {
              const archivo =
                e.target.files?.[0];

              onSeleccionar(
                archivo
              );

              e.target.value = "";
            }}
          />
        </label>
      ) : (
        <div className="mt-3">
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-lg bg-white">
            <img
              src={
                imagen.urlOptimizada
              }
              alt={titulo}
              className="h-full w-full object-contain"
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-[10px] text-slate-500">
              {(
                imagen.pesoOptimizado /
                1024
              ).toFixed(1)}{" "}
              KB · WebP
            </p>

            <button
              type="button"
              onClick={onEliminar}
              disabled={
                deshabilitado
              }
              className="rounded-lg border border-rose-100 bg-white p-2 text-rose-600 disabled:opacity-40"
              aria-label={`Eliminar ${titulo}`}
            >
              <Trash2
                size={14}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Seccion({
  titulo,
  children,
}) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">
        {titulo}
      </h2>

      <div className="mt-4 space-y-4">
        {children}
      </div>
    </section>
  );
}

function Campo({
  titulo,
  valor,
  onChange,
  tipo = "text",
  paso,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </span>

      <input
        type={tipo}
        step={paso}
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
      />
    </label>
  );
}

function Selector({
  titulo,
  valor,
  onChange,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </span>

      <select
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
      >
        {children}
      </select>
    </label>
  );
}

function Area({
  titulo,
  ayuda,
  valor,
  onChange,
  filas,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </span>

      {ayuda && (
        <span className="mb-1.5 block text-[10px] text-slate-400">
          {ayuda}
        </span>
      )}

      <textarea
        rows={filas}
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-sky-400"
      />
    </label>
  );
}

function Check({
  titulo,
  activo,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
        className="h-4 w-4"
      />

      <span className="text-xs font-semibold text-slate-700">
        {titulo}
      </span>
    </label>
  );
}