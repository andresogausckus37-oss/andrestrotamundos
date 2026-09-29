import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FilePlus2,
  RefreshCw,
  Trash2,
  Upload,
} from "lucide-react";

import { upload } from "@vercel/blob/client";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CATEGORIAS = [
  {
    valor: "laberintos",
    nombre: "Laberintos",
  },
  {
    valor: "crucigramas",
    nombre: "Crucigramas",
  },
  {
    valor: "sopa-de-letras",
    nombre: "Sopa de letras",
  },
  {
    valor: "rompecabezas",
    nombre: "Rompecabezas",
  },
  {
    valor: "sudoku",
    nombre: "Sudoku",
  },
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
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    );

const obtenerNombreCategoria = (
  categoria
) =>
  CATEGORIAS.find(
    (item) =>
      item.valor === categoria
  )?.nombre.toLowerCase() ||
  "actividades";

const pluralActividad = (
  categoria
) => {
  const nombres = {
    laberintos: "laberintos",

    crucigramas:
      "crucigramas",

    "sopa-de-letras":
      "sopas de letras",

    rompecabezas:
      "rompecabezas",

    sudoku:
      "sudokus",

    "palabras-desordenadas":
      "actividades de palabras desordenadas",
  };

  return (
    nombres[categoria] ||
    "actividades"
  );
};

/* =========================================================
   OPTIMIZAR IMAGEN
========================================================= */

const procesarImagen = (
  archivo
) =>
  new Promise(
    (resolve, reject) => {
      const urlOriginal =
        URL.createObjectURL(
          archivo
        );

      const imagen =
        new Image();

      imagen.onload = () => {
        const escala =
          Math.min(
            1,
            ANCHO_OBJETIVO /
              imagen.naturalWidth
          );

        const ancho =
          Math.round(
            imagen.naturalWidth *
              escala
          );

        const alto =
          Math.round(
            imagen.naturalHeight *
              escala
          );

        const canvas =
          document.createElement(
            "canvas"
          );

        canvas.width = ancho;
        canvas.height = alto;

        const ctx =
          canvas.getContext(
            "2d"
          );

        if (!ctx) {
          URL.revokeObjectURL(
            urlOriginal
          );

          reject(
            new Error(
              "No se pudo procesar la imagen."
            )
          );

          return;
        }

        ctx.imageSmoothingEnabled =
          true;

        ctx.imageSmoothingQuality =
          "high";

        ctx.drawImage(
          imagen,
          0,
          0,
          ancho,
          alto
        );

        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(
              urlOriginal
            );

            if (!blob) {
              reject(
                new Error(
                  "No se pudo convertir la imagen a WebP."
                )
              );

              return;
            }

            const archivoOptimizado =
              new File(
                [blob],
                "imagen.webp",
                {
                  type:
                    "image/webp",
                }
              );

            resolve({
              archivoOptimizado,

              urlOptimizada:
                URL.createObjectURL(
                  archivoOptimizado
                ),

              pesoOriginal:
                archivo.size,

              pesoOptimizado:
                archivoOptimizado.size,
            });
          },
          "image/webp",
          CALIDAD_WEBP
        );
      };

      imagen.onerror = () => {
        URL.revokeObjectURL(
          urlOriginal
        );

        reject(
          new Error(
            "No se pudo leer la imagen."
          )
        );
      };

      imagen.src =
        urlOriginal;
    }
  );

const archivoADataUrl = (
  archivo
) =>
  new Promise(
    (resolve, reject) => {
      const lector =
        new FileReader();

      lector.onload = () =>
        resolve(
          lector.result
        );

      lector.onerror = () =>
        reject(
          new Error(
            "No se pudo preparar la imagen."
          )
        );

      lector.readAsDataURL(
        archivo
      );
    }
  );

/* =========================================================
   COMPONENTE
========================================================= */

export default function AdminNuevoProducto() {
  const [
    formulario,
    setFormulario,
  ] = useState({
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

    etiquetaOferta:
      "Oferta lanzamiento",

    ventaCruzadaId: "",
    destacado: false,

    descripcion: "",
    descripcionLarga: "",
    incluye: "",
    beneficios: "",
  });

  /*
   * PRODUCTOS EXISTENTES
   *
   * Antes se obtenían desde
   * productosDigitales.js.
   *
   * Ahora MongoDB es la única
   * fuente utilizada por este
   * formulario.
   */

  const [
    productosDisponibles,
    setProductosDisponibles,
  ] = useState([]);

  const [
    cargandoProductos,
    setCargandoProductos,
  ] = useState(true);

  const [
    errorProductos,
    setErrorProductos,
  ] = useState("");

  const [
    imagenes,
    setImagenes,
  ] = useState(
    Array(6).fill(null)
  );

  const [
    procesandoImagen,
    setProcesandoImagen,
  ] = useState(false);

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    archivoPDF,
    setArchivoPDF,
  ] = useState(null);

  /* =======================================================
     CARGAR PRODUCTOS DESDE MONGODB
  ======================================================= */

  const cargarProductos =
    async () => {
      try {
        setErrorProductos("");

        const respuesta =
          await fetch(
            "/api/admin/pedidos?accion=listar-productos"
          );

        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error ||
              "No se pudieron cargar los productos."
          );
        }

        setProductosDisponibles(
          datos.productos || []
        );
      } catch (error) {
        console.error(
          "Error cargando productos:",
          error
        );

        setProductosDisponibles(
          []
        );

        setErrorProductos(
          error.message ||
            "No se pudieron cargar los productos."
        );
      } finally {
        setCargandoProductos(
          false
        );
      }
    };

  useEffect(() => {
    cargarProductos();
  }, []);

  /* =======================================================
     ID DEL PRODUCTO
  ======================================================= */

  const idGenerado =
    useMemo(
      () =>
        crearId(
          formulario.nombre
        ),
      [formulario.nombre]
    );

  /*
   * Comprobación de ID duplicado
   * directamente contra los
   * productos obtenidos de MongoDB.
   */

  const idRepetido =
    Boolean(idGenerado) &&
    productosDisponibles.some(
      (producto) =>
        producto.id ===
        idGenerado
    );

  const cambiar = (
    campo,
    valor
  ) => {
    setFormulario(
      (actual) => ({
        ...actual,
        [campo]: valor,
      })
    );
  };

  /* =======================================================
     IMÁGENES
  ======================================================= */

  const seleccionarImagen =
    async (
      indice,
      archivo
    ) => {
      if (!archivo) {
        return;
      }

      try {
        setProcesandoImagen(
          true
        );

        const resultado =
          await procesarImagen(
            archivo
          );

        setImagenes(
          (actuales) => {
            const nuevas = [
              ...actuales,
            ];

            if (
              nuevas[indice]
                ?.urlOptimizada
            ) {
              URL.revokeObjectURL(
                nuevas[indice]
                  .urlOptimizada
              );
            }

            nuevas[indice] =
              resultado;

            return nuevas;
          }
        );
      } catch (error) {
        console.error(
          error
        );

        alert(
          error.message
        );
      } finally {
        setProcesandoImagen(
          false
        );
      }
    };

  const eliminarImagen = (
    indice
  ) => {
    setImagenes(
      (actuales) => {
        const nuevas = [
          ...actuales,
        ];

        if (
          nuevas[indice]
            ?.urlOptimizada
        ) {
          URL.revokeObjectURL(
            nuevas[indice]
              .urlOptimizada
          );
        }

        nuevas[indice] =
          null;

        return nuevas;
      }
    );
  };

  const subirImagen =
    async (
      imagen,
      numero
    ) => {
      const imagenBase64 =
        await archivoADataUrl(
          imagen
            .archivoOptimizado
        );

      const respuesta =
        await fetch(
          "/api/admin/pedidos?accion=subir-imagen-producto",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                productoId:
                  idGenerado,

                numeroImagen:
                  numero,

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
      Number(
        formulario.laminas
      ) || 0;

    const soluciones =
      Number(
        formulario.soluciones
      ) || 0;

    const paginas =
      Number(
        formulario.paginas
      ) || 0;

    const actividad =
      pluralActividad(
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
      formulario.nivel ||
      "variado";

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

    const beneficiosPorCategoria =
      {
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

        "palabras-desordenadas":
          [
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

    setFormulario(
      (actual) => ({
        ...actual,

        descripcion,

        descripcionLarga,

        incluye,

        beneficios:
          beneficios.join(
            "\n"
          ),
      })
    );
  };

  /* =======================================================
     PRODUCTO FINAL
  ======================================================= */

  const convertirLista = (
    texto
  ) =>
    texto
      .split("\n")
      .map((item) =>
        item.trim()
      )
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
      Number(
        formulario.precioARS
      ) || 0,

    descuento: 0,

    oferta: {
      activa:
        formulario.ofertaActiva,

      precioARS:
        formulario.ofertaActiva
          ? Number(
              formulario
                .precioOfertaARS
            ) || 0
          : 0,

      etiqueta:
        formulario.ofertaActiva
          ? formulario
              .etiquetaOferta
              .trim()
          : "",
    },

    precioUSD:
      Number(
        formulario.precioUSD
      ) || 0,

    descuentoUSD: 0,

    ofertaUSD: {
      activa:
        formulario
          .ofertaUSDActiva,

      precioUSD:
        formulario
          .ofertaUSDActiva
          ? Number(
              formulario
                .precioOfertaUSD
            ) || 0
          : 0,

      etiqueta:
        formulario
          .ofertaUSDActiva
          ? formulario
              .etiquetaOferta
              .trim()
          : "",
    },

    imagenes: {
      portada: "",
      preview: "",

      previewsIndividuales:
        [],

      portadaPDF: "",

      paginaFinalPDF: "",
    },

    formato: "PDF",

    tamano: "A4",

    paginas:
      Number(
        formulario.paginas
      ) || 0,

    laminas:
      Number(
        formulario.laminas
      ) || 0,

    soluciones:
      Number(
        formulario.soluciones
      ) || 0,

    incluye:
      convertirLista(
        formulario.incluye
      ),

    beneficios:
      convertirLista(
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

  const agregarProducto =
    async () => {
      if (
        !formulario.nombre.trim()
      ) {
        alert(
          "Falta el nombre del producto."
        );

        return;
      }

      if (
        !formulario.categoria
      ) {
        alert(
          "Falta seleccionar la categoría."
        );

        return;
      }

      if (
        !formulario.publico
      ) {
        alert(
          "Falta seleccionar el público."
        );

        return;
      }

      if (
        !formulario.nivel
      ) {
        alert(
          "Falta seleccionar el nivel."
        );

        return;
      }

      if (
        !formulario.laminas
      ) {
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
          (imagen) =>
            !imagen
        )
      ) {
        alert(
          "Falta seleccionar alguna de las 6 imágenes."
        );

        return;
      }

      if (!archivoPDF) {
        alert(
          "Falta seleccionar el PDF del producto."
        );

        return;
      }

      try {
        setGuardando(true);

        const urls = [];

        /*
         * Las imágenes se suben
         * secuencialmente para consumir
         * menos memoria en el navegador.
         */

        for (
          let i = 0;
          i <
          imagenes.length;
          i += 1
        ) {
          const url =
            await subirImagen(
              imagenes[i],
              i + 1
            );

          urls.push(url);
        }

        /*
         * PDF PRIVADO
         */

        const pathnamePDF =
          `productos/${idGenerado}/${idGenerado}.pdf`;

        const blobPDF =
          await upload(
            pathnamePDF,
            archivoPDF,
            {
              access:
                "private",

              handleUploadUrl:
                "/api/admin/pedidos?accion=subir-pdf-producto",

              clientPayload:
                JSON.stringify({
                  productoId:
                    idGenerado,
                }),
            }
          );

        /*
         * PRODUCTO COMPLETO
         */

        const productoConImagenes =
          {
            ...productoFinal,

            imagenes: {
              portada:
                urls[0],

              preview:
                urls[1],

              previewsIndividuales:
                [
                  urls[2],
                  urls[3],
                ],

              portadaPDF:
                urls[4],

              paginaFinalPDF:
                urls[5],
            },

            archivoPDF:
              blobPDF.pathname,
          };

        /*
         * GUARDAR EN MONGODB
         */

        const respuesta =
          await fetch(
            "/api/admin/pedidos?accion=crear-producto",
            {
              method:
                "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body:
                JSON.stringify(
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

        /*
         * Actualizamos también la lista
         * local proveniente de MongoDB.
         */

        await cargarProductos();

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

        alert(
          error.message
        );
      } finally {
        setGuardando(
          false
        );
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

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

        {/* ESTADO DE PRODUCTOS MONGODB */}

        {errorProductos && (
          <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <p className="text-xs font-semibold text-rose-700">
              {errorProductos}
            </p>

            <button
              type="button"
              onClick={
                cargarProductos
              }
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-[10px] font-bold text-rose-700"
            >
              <RefreshCw
                size={12}
              />

              Volver a intentar
            </button>
          </div>
        )}

        {/* INFORMACIÓN */}

        <Seccion titulo="Información del producto">
          <Campo
            titulo="Nombre"
            valor={
              formulario.nombre
            }
            onChange={(v) =>
              cambiar(
                "nombre",
                v
              )
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
            valor={
              formulario.categoria
            }
            onChange={(v) =>
              cambiar(
                "categoria",
                v
              )
            }
          >
            <option value="">
              Seleccionar categoría
            </option>

            {CATEGORIAS.map(
              (
                categoria
              ) => (
                <option
                  key={
                    categoria.valor
                  }
                  value={
                    categoria.valor
                  }
                >
                  {
                    categoria.nombre
                  }
                </option>
              )
            )}
          </Selector>

          <Selector
            titulo="Público"
            valor={
              formulario.publico
            }
            onChange={(v) =>
              cambiar(
                "publico",
                v
              )
            }
          >
            <option value="">
              Seleccionar público
            </option>

            {PUBLICOS.map(
              (publico) => (
                <option
                  key={
                    publico
                  }
                  value={
                    publico
                  }
                >
                  {publico}
                </option>
              )
            )}
          </Selector>

          <Selector
            titulo="Nivel"
            valor={
              formulario.nivel
            }
            onChange={(v) =>
              cambiar(
                "nivel",
                v
              )
            }
          >
            <option value="">
              Seleccionar nivel
            </option>

            {NIVELES.map(
              (nivel) => (
                <option
                  key={nivel}
                  value={nivel}
                >
                  {nivel}
                </option>
              )
            )}
          </Selector>

          <div className="grid gap-3 sm:grid-cols-3">
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

            <Campo
              titulo="Páginas"
              tipo="number"
              valor={
                formulario.paginas
              }
              onChange={(v) =>
                cambiar(
                  "paginas",
                  v
                )
              }
            />
          </div>
        </Seccion>

        {/* PRECIOS ARGENTINA */}

        <Seccion titulo="Precio en Argentina">
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

          <Check
            titulo="Activar oferta en ARS"
            marcado={
              formulario.ofertaActiva
            }
            onChange={(v) =>
              cambiar(
                "ofertaActiva",
                v
              )
            }
          />

          {formulario.ofertaActiva && (
            <>
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

              <Campo
                titulo="Etiqueta de oferta"
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
            </>
          )}
        </Seccion>

        {/* PRECIOS INTERNACIONALES */}

        <Seccion titulo="Precio internacional">
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

          <Check
            titulo="Activar oferta en USD"
            marcado={
              formulario.ofertaUSDActiva
            }
            onChange={(v) =>
              cambiar(
                "ofertaUSDActiva",
                v
              )
            }
          />

          {formulario.ofertaUSDActiva && (
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
          )}
        </Seccion>

        {/* VENTA CRUZADA */}

        <Seccion titulo="Venta cruzada">
          <Selector
            titulo="Producto recomendado"
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
              {cargandoProductos
                ? "Cargando productos..."
                : "Sin venta cruzada"}
            </option>

            {productosDisponibles
              .filter(
                (producto) =>
                  producto.id !==
                  idGenerado
              )
              .map(
                (producto) => (
                  <option
                    key={
                      producto.id
                    }
                    value={
                      producto.id
                    }
                  >
                    {
                      producto.nombre
                    }
                  </option>
                )
              )}
          </Selector>

          {!cargandoProductos &&
            productosDisponibles.length ===
              0 && (
              <p className="text-[10px] leading-4 text-slate-400">
                Todavía no hay otros productos en MongoDB para utilizar como venta cruzada.
              </p>
            )}

          <Check
            titulo="Producto destacado"
            marcado={
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

        {/* GENERADOR DE TEXTOS */}

        <section className="mt-6 rounded-xl border border-sky-100 bg-sky-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-sky-600 shadow-sm">
              <RefreshCw
                size={18}
              />
            </div>

            <div className="flex-1">
              <h2 className="text-sm font-bold text-slate-900">
                Generar textos
              </h2>

              <p className="mt-1 text-xs leading-5 text-slate-600">
                El sistema prepara automáticamente una base para la descripción, contenido y beneficios.
              </p>

              <button
                type="button"
                onClick={
                  generarTextos
                }
                className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700"
              >
                <RefreshCw
                  size={14}
                />

                Generar textos
              </button>
            </div>
          </div>
        </section>

        {/* CONTENIDO DE LA FICHA */}

        <Seccion titulo="Contenido de la ficha">
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
            filas={4}
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
            filas={8}
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
            Seleccioná las 6 imágenes originales. Se optimizan automáticamente a WebP, con un ancho máximo de 794 px.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {NOMBRES_IMAGENES.map(
              (
                titulo,
                indice
              ) => (
                <ImagenProducto
                  key={
                    titulo
                  }
                  titulo={
                    titulo
                  }
                  imagen={
                    imagenes[
                      indice
                    ]
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

                {/* PDF PRIVADO */}

        <Seccion titulo="PDF del producto">
          <p className="text-xs leading-5 text-slate-500">
            Seleccioná el PDF final que recibirá el comprador.
            Se subirá automáticamente al almacenamiento privado.
          </p>

          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-sky-400 hover:bg-sky-50">
            <Upload
              size={20}
              className="text-sky-600"
            />

            <span className="text-xs font-semibold text-slate-700">
              {archivoPDF
                ? archivoPDF.name
                : "Seleccionar PDF"}
            </span>

            <input
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              disabled={guardando}
              onChange={(e) =>
                setArchivoPDF(
                  e.target.files?.[0] ||
                    null
                )
              }
            />
          </label>

          {archivoPDF && (
            <div className="flex items-center justify-between gap-3 rounded-lg bg-emerald-50 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-emerald-700">
                  {archivoPDF.name}
                </p>

                <p className="mt-0.5 text-[10px] text-emerald-600">
                  {(
                    archivoPDF.size /
                    1024 /
                    1024
                  ).toFixed(2)}{" "}
                  MB
                </p>
              </div>

              <button
                type="button"
                disabled={guardando}
                onClick={() =>
                  setArchivoPDF(null)
                }
                className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                aria-label="Eliminar PDF"
              >
                <Trash2
                  size={16}
                />
              </button>
            </div>
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
              guardando ||
              cargandoProductos
            }
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando
              ? "Subiendo archivos y guardando..."
              : cargandoProductos
                ? "Cargando productos..."
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

          <span className="mt-1 text-[10px] text-slate-400">
            JPG, PNG o WebP
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

              if (archivo) {
                onSeleccionar(
                  archivo
                );
              }

              /*
               * Permite volver a
               * seleccionar el mismo
               * archivo si fuera
               * necesario.
               */

              e.target.value =
                "";
            }}
          />
        </label>
      ) : (
        <div className="mt-3">
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <img
              src={
                imagen.urlOptimizada
              }
              alt={titulo}
              className="aspect-square w-full object-cover"
            />
          </div>

          <div className="mt-2 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-emerald-600">
                Imagen optimizada
              </p>

              <p className="mt-0.5 text-[10px] text-slate-400">
                {(
                  imagen.pesoOptimizado /
                  1024
                ).toFixed(0)}{" "}
                KB
              </p>
            </div>

            <button
              type="button"
              disabled={
                deshabilitado
              }
              onClick={
                onEliminar
              }
              className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
              aria-label={`Eliminar ${titulo}`}
            >
              <Trash2
                size={16}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   SECCIÓN
========================================================= */

function Seccion({
  titulo,
  children,
}) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <FilePlus2
          size={16}
          className="text-sky-600"
        />

        <h2 className="text-sm font-bold text-slate-900">
          {titulo}
        </h2>
      </div>

      <div className="space-y-4">
        {children}
      </div>
    </section>
  );
}

/* =========================================================
   CAMPO
========================================================= */

function Campo({
  titulo,
  valor,
  onChange,
  tipo = "text",
  paso,
  placeholder = "",
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {titulo}
      </span>

      <input
        type={tipo}
        step={paso}
        value={valor}
        placeholder={
          placeholder
        }
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

/* =========================================================
   SELECTOR
========================================================= */

function Selector({
  titulo,
  valor,
  onChange,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-slate-700">
        {titulo}
      </span>

      <select
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      >
        {children}
      </select>
    </label>
  );
}

/* =========================================================
   ÁREA DE TEXTO
========================================================= */

function Area({
  titulo,
  valor,
  onChange,
  filas = 5,
  ayuda = "",
}) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-xs font-semibold text-slate-700">
          {titulo}
        </span>

        {ayuda && (
          <span className="text-[10px] text-slate-400">
            {ayuda}
          </span>
        )}
      </div>

      <textarea
        rows={filas}
        value={valor}
        onChange={(e) =>
          onChange(
            e.target.value
          )
        }
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

/* =========================================================
   CHECKBOX
========================================================= */

function Check({
  titulo,
  marcado,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) =>
          onChange(
            e.target.checked
          )
        }
        className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
      />

      <span className="text-xs font-semibold text-slate-700">
        {titulo}
      </span>
    </label>
  );
}