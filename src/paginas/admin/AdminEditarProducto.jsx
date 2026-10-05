    import {
      useEffect,
      useMemo,
      useState,
    } from "react";

    import {
      ArrowLeft,
      FilePlus2,
      RefreshCw,
      Save,
      Trash2,
      Upload,
    } from "lucide-react";

    import {
      useNavigate,
      useParams,
    } from "react-router-dom";

    import { upload } from "@vercel/blob/client";

    /* =========================================================
       OPCIONES
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
        nombre: "Sopas de letras",
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

    /* =========================================================
       CONFIGURACIÓN DE IMÁGENES
    ========================================================= */

    const ANCHO_OBJETIVO = 794;

    const CALIDAD_WEBP = 0.82;

    const NOMBRES_IMAGENES = [
      "Imagen 1 — Presentación",
      "Imagen 2 — Qué incluye",
      "Imagen 3 — Beneficios",
      "Imagen 4 — Cómo funciona",
    ];

    const NOMBRES_IMAGENES_FEED = [
      "Feed 1 — Presentación",
      "Feed 2 — Qué incluye",
      "Feed 3 — Beneficios",
      "Feed 4 — Cómo funciona",
    ];

    const NOMBRES_IMAGENES_VERTICAL = [
      "Story 1 — Presentación",
      "Story 2 — Qué incluye",
      "Story 3 — Beneficios",
      "Story 4 — Cómo funciona",
    ];

    /* =========================================================
       FORMULARIO VACÍO
    ========================================================= */

    const FORMULARIO_INICIAL = {
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
    };

    /* =========================================================
       UTILIDADES
    ========================================================= */

    const obtenerNombreCategoria = (
      categoria
    ) => {
      return (
        CATEGORIAS.find(
          (item) =>
            item.valor === categoria
        )?.nombre || categoria
      );
    };

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
       PROCESAR IMAGEN
    ========================================================= */

    const procesarImagen = (
      archivo,
      anchoObjetivo = ANCHO_OBJETIVO
    ) =>
      new Promise(
        (
          resolve,
          reject
        ) => {
          if (!archivo) {
            reject(
              new Error(
                "No se recibió ninguna imagen."
              )
            );

            return;
          }

          const lector =
            new FileReader();

          lector.onerror =
            () => {
              reject(
                new Error(
                  "No se pudo leer la imagen."
                )
              );
            };

          lector.onload =
            (evento) => {
              const imagen =
                new Image();

              imagen.onerror =
                () => {
                  reject(
                    new Error(
                      "No se pudo procesar la imagen."
                    )
                  );
                };

              imagen.onload =
                () => {
                  try {
                    const anchoOriginal =
                      imagen.width;

                    const altoOriginal =
                      imagen.height;

                    let anchoFinal =
                      anchoOriginal;

                    let altoFinal =
                      altoOriginal;

                    /*
                     * Solo reducimos.
                     * Nunca ampliamos una
                     * imagen más pequeña.
                     */

                    if (
                      anchoOriginal >
                      anchoObjetivo
                    ) {
                      anchoFinal =
                        anchoObjetivo;

                      altoFinal =
                        Math.round(
                          altoOriginal *
                            (anchoObjetivo /
                              anchoOriginal)
                        );
                    }

                    const canvas =
                      document.createElement(
                        "canvas"
                      );

                    canvas.width =
                      anchoFinal;

                    canvas.height =
                      altoFinal;

                    const contexto =
                      canvas.getContext(
                        "2d"
                      );

                    if (!contexto) {
                      reject(
                        new Error(
                          "No se pudo preparar la imagen."
                        )
                      );

                      return;
                    }

                    contexto.imageSmoothingEnabled =
                      true;

                    contexto.imageSmoothingQuality =
                      "high";

                    contexto.drawImage(
                      imagen,
                      0,
                      0,
                      anchoFinal,
                      altoFinal
                    );

                    canvas.toBlob(
                      (blob) => {
                        if (!blob) {
                          reject(
                            new Error(
                              "No se pudo convertir la imagen a WebP."
                            )
                          );

                          return;
                        }

                        const nombreBase =
                          archivo.name
                            .replace(
                              /\.[^/.]+$/,
                              ""
                            )
                            .trim() ||
                          "imagen";

                        const archivoOptimizado =
                          new File(
                            [blob],
                            `${nombreBase}.webp`,
                            {
                              type:
                                "image/webp",
                            }
                          );

                        const urlOptimizada =
                          URL.createObjectURL(
                            archivoOptimizado
                          );

                        resolve({
                          archivoOriginal:
                            archivo,

                          archivoOptimizado,

                          urlOptimizada,

                          pesoOriginal:
                            archivo.size,

                          pesoOptimizado:
                            archivoOptimizado.size,

                          anchoOriginal,

                          altoOriginal,

                          anchoFinal,

                          altoFinal,

                          esNueva: true,
                        });
                      },

                      "image/webp",

                      CALIDAD_WEBP
                    );
                  } catch (
                    error
                  ) {
                    reject(error);
                  }
                };

              imagen.src =
                evento.target.result;
            };

          lector.readAsDataURL(
            archivo
          );
        }
      );

    /* =========================================================
       ARCHIVO A DATA URL
    ========================================================= */

    const archivoADataUrl = (
      archivo
    ) =>
      new Promise(
        (
          resolve,
          reject
        ) => {
          const lector =
            new FileReader();

          lector.onload =
            () => {
              resolve(
                lector.result
              );
            };

          lector.onerror =
            () => {
              reject(
                new Error(
                  "No se pudo leer la imagen optimizada."
                )
              );
            };

          lector.readAsDataURL(
            archivo
          );
        }
      );

    /* =========================================================
       CONVERTIR ARRAY A TEXTO
    ========================================================= */

    const arrayATexto = (
      valor
    ) => {
      if (
        !Array.isArray(valor)
      ) {
        return "";
      }

      return valor
        .filter(Boolean)
        .join("\n");
    };

    /* =========================================================
       CONVERTIR VALOR A CAMPO
    ========================================================= */

    const valorCampo = (
      valor
    ) => {
      if (
        valor === null ||
        valor === undefined
      ) {
        return "";
      }

      return String(valor);
    };

    /* =========================================================
       COMPONENTE PRINCIPAL
    ========================================================= */

    export default function AdminEditarProducto() {
      const {
        id: productoId,
      } = useParams();

      const navigate =
        useNavigate();

      /* =======================================================
         ESTADOS GENERALES
      ======================================================= */

      const [
        formulario,
        setFormulario,
      ] = useState(
        FORMULARIO_INICIAL
      );

      const [
        productoOriginal,
        setProductoOriginal,
      ] = useState(null);

      const [
        productosDisponibles,
        setProductosDisponibles,
      ] = useState([]);

      const [
        imagenes,
        setImagenes,
      ] = useState(
        Array(4).fill(null)
      );

      const [
        imagenesFeed,
        setImagenesFeed,
      ] = useState(
        Array(4).fill(null)
      );

      const [
        imagenesVertical,
        setImagenesVertical,
      ] = useState(
        Array(4).fill(null)
      );

      const [
        archivoPDF,
        setArchivoPDF,
      ] = useState(null);

      const [
        archivoPDFActual,
        setArchivoPDFActual,
      ] = useState("");

      const [
        cargando,
        setCargando,
      ] = useState(true);

      const [
        guardando,
        setGuardando,
      ] = useState(false);

      const [
        procesandoImagen,
        setProcesandoImagen,
      ] = useState(false);

      const [
        error,
        setError,
      ] = useState("");

      const [
        errorProductos,
        setErrorProductos,
      ] = useState("");

      /* =======================================================
         CAMBIAR CAMPO
      ======================================================= */

      const cambiar = (
        campo,
        valor
      ) => {
        setFormulario(
          (anterior) => ({
            ...anterior,

            [campo]:
              valor,
          })
        );
      };

      /* =======================================================
         CARGAR PRODUCTOS PARA VENTA CRUZADA
      ======================================================= */

      const cargarProductos =
        async () => {
          try {
            setErrorProductos(
              ""
            );

            const respuesta =
              await fetch(
                "/api/admin/pedidos?accion=listar-productos"
              );

            if (
              respuesta.status ===
              401
            ) {
              navigate(
                "/admin/login"
              );

              return;
            }

            const datos =
              await respuesta.json();

            if (
              !respuesta.ok
            ) {
              throw new Error(
                datos.error ||
                  "No se pudieron cargar los productos."
              );
            }

            setProductosDisponibles(
              datos.productos ||
                []
            );
          } catch (
            errorCarga
          ) {
            console.error(
              "Error cargando productos:",
              errorCarga
                          );

            setProductosDisponibles(
              []
            );

            setErrorProductos(
              errorCarga.message ||
                "No se pudieron cargar los productos."
            );
          }
        };

      /* =======================================================
         PREPARAR IMÁGENES EXISTENTES
      ======================================================= */

      const prepararImagenDesdeUrl =
        (url) => {
          if (!url) {
            return null;
          }

          return {
            urlActual: url,
            urlOptimizada: url,
            esNueva: false,
            archivoOriginal: null,
            archivoOptimizado: null,
            pesoOriginal: null,
            pesoOptimizado: null,
          };
        };

      const prepararImagenesExistentes =
        (producto) => [
          producto.imagenes?.portada || "",
          producto.imagenes?.preview || "",
          producto.imagenes?.previewsIndividuales?.[0] || "",
          producto.imagenes?.previewsIndividuales?.[1] || "",
        ].map(prepararImagenDesdeUrl);

      const prepararImagenesFeedExistentes =
        (producto) => [
          producto.imagenes?.redes?.feed?.presentacion || "",
          producto.imagenes?.redes?.feed?.incluye || "",
          producto.imagenes?.redes?.feed?.beneficios || "",
          producto.imagenes?.redes?.feed?.comoFunciona || "",
        ].map(prepararImagenDesdeUrl);

      const prepararImagenesVerticalExistentes =
        (producto) => [
          producto.imagenes?.redes?.vertical?.presentacion || "",
          producto.imagenes?.redes?.vertical?.incluye || "",
          producto.imagenes?.redes?.vertical?.beneficios || "",
          producto.imagenes?.redes?.vertical?.comoFunciona || "",
        ].map(prepararImagenDesdeUrl);

      /* =======================================================
         CARGAR PRODUCTO
      ======================================================= */

      const cargarProducto =
        async () => {
          if (!productoId) {
            setError(
              "Falta el ID del producto."
            );

            setCargando(
              false
            );

            return;
          }

          try {
            setCargando(
              true
            );

            setError("");

            const respuesta =
              await fetch(
                `/api/admin/pedidos?accion=obtener-producto&productoId=${encodeURIComponent(
                  productoId
                )}`
              );

            if (
              respuesta.status ===
              401
            ) {
              navigate(
                "/admin/login"
              );

              return;
            }

            const datos =
              await respuesta.json();

            if (
              !respuesta.ok
            ) {
              throw new Error(
                datos.error ||
                  "No se pudo cargar el producto."
              );
            }

            const producto =
              datos.producto;

            if (!producto) {
              throw new Error(
                "Producto no encontrado."
              );
            }

            setProductoOriginal(
              producto
            );

            setArchivoPDFActual(
              producto.archivoPDF ||
                ""
            );

            setFormulario({
              nombre:
                producto.nombre ||
                "",

              categoria:
                producto.categoria ||
                "",

              publico:
                producto.edadRecomendada ||
                "",

              nivel:
                producto.nivel ||
                "",

              laminas:
                valorCampo(
                  producto.laminas
                ),

              soluciones:
                valorCampo(
                  producto.soluciones
                ),

              paginas:
                valorCampo(
                  producto.paginas
                ),

              precioARS:
                valorCampo(
                  producto.precioARS
                ),

              ofertaActiva:
                Boolean(
                  producto.oferta
                    ?.activa
                ),

              precioOfertaARS:
                valorCampo(
                  producto.oferta
                    ?.precioARS
                ),

              precioUSD:
                valorCampo(
                  producto.precioUSD
                ),

              ofertaUSDActiva:
                Boolean(
                  producto.ofertaUSD
                    ?.activa
                ),

              precioOfertaUSD:
                valorCampo(
                  producto.ofertaUSD
                    ?.precioUSD
                ),

              etiquetaOferta:
                producto.oferta
                  ?.etiqueta ||
                "Oferta lanzamiento",

              ventaCruzadaId:
                producto.ventaCruzadaId ||
                "",

              destacado:
                Boolean(
                  producto.destacado
                ),

              descripcion:
                producto.descripcion ||
                "",

              descripcionLarga:
                producto.descripcionLarga ||
                "",

              incluye:
                arrayATexto(
                  producto.incluye
                ),

              beneficios:
                arrayATexto(
                  producto.beneficios
                ),
            });

            setImagenes(
              prepararImagenesExistentes(
                producto
              )
            );

            setImagenesFeed(
              prepararImagenesFeedExistentes(
                producto
              )
            );

            setImagenesVertical(
              prepararImagenesVerticalExistentes(
                producto
              )
            );
          } catch (
            errorCarga
          ) {
            console.error(
              "Error cargando producto:",
              errorCarga
            );

            setError(
              errorCarga.message ||
                "No se pudo cargar el producto."
            );
          } finally {
            setCargando(
              false
            );
          }
        };

      /* =======================================================
         CARGA INICIAL
      ======================================================= */

      useEffect(() => {
        cargarProducto();

        cargarProductos();
      }, [productoId]);

      /* =======================================================
         LIMPIAR OBJECT URL
      ======================================================= */

      useEffect(() => {
        return () => {
          [
            ...imagenes,
            ...imagenesFeed,
            ...imagenesVertical,
          ].forEach((imagen) => {
            if (
              imagen?.esNueva &&
              imagen?.urlOptimizada?.startsWith("blob:")
            ) {
              URL.revokeObjectURL(
                imagen.urlOptimizada
              );
            }
          });
        };
      }, []);

      /* =======================================================
         SELECCIONAR IMAGEN NUEVA
      ======================================================= */

      const seleccionarImagen =
        async (
          indice,
          archivo
        ) => {
          if (!archivo) {
            return;
          }

          if (
            !archivo.type.startsWith(
              "image/"
            )
          ) {
            alert(
              "Seleccioná un archivo de imagen válido."
            );

            return;
          }

          try {
            setProcesandoImagen(
              true
            );

            const procesada =
              await procesarImagen(
                archivo
              );

            setImagenes(
              (anteriores) => {
                const nuevas = [
                  ...anteriores,
                ];

                const anterior =
                  nuevas[indice];

                if (
                  anterior?.esNueva &&
                  anterior
                    ?.urlOptimizada
                    ?.startsWith(
                      "blob:"
                    )
                ) {
                  URL.revokeObjectURL(
                    anterior.urlOptimizada
                  );
                }

                nuevas[indice] =
                  procesada;

                return nuevas;
              }
            );
          } catch (
            errorImagen
          ) {
            console.error(
              "Error procesando imagen:",
              errorImagen
            );

            alert(
              errorImagen.message ||
                "No se pudo procesar la imagen."
            );
          } finally {
            setProcesandoImagen(
              false
            );
          }
        };

      /* =======================================================
         RESTAURAR IMAGEN ORIGINAL
      ======================================================= */

      const restaurarImagen =
        (indice) => {
          if (
            !productoOriginal
          ) {
            return;
          }

          const originales =
            prepararImagenesExistentes(
              productoOriginal
            );

          setImagenes(
            (anteriores) => {
              const nuevas = [
                ...anteriores,
              ];

              const actual =
                nuevas[indice];

              if (
                actual?.esNueva &&
                actual
                  ?.urlOptimizada
                  ?.startsWith(
                    "blob:"
                  )
              ) {
                URL.revokeObjectURL(
                  actual.urlOptimizada
                );
              }

              nuevas[indice] =
                originales[
                  indice
                ];

              return nuevas;
            }
          );
        };

      /* =======================================================
         SELECCIONAR / RESTAURAR IMÁGENES DE REDES
      ======================================================= */

      const seleccionarImagenRed =
        async (indice, archivo, tipo) => {
          if (!archivo) return;

          if (!archivo.type.startsWith("image/")) {
            alert("Seleccioná un archivo de imagen válido.");
            return;
          }

          try {
            setProcesandoImagen(true);

            const procesada =
              await procesarImagen(archivo, 1080);

            const setLista =
              tipo === "feed"
                ? setImagenesFeed
                : setImagenesVertical;

            setLista((anteriores) => {
              const nuevas = [...anteriores];
              const anterior = nuevas[indice];

              if (
                anterior?.esNueva &&
                anterior?.urlOptimizada?.startsWith("blob:")
              ) {
                URL.revokeObjectURL(anterior.urlOptimizada);
              }

              nuevas[indice] = procesada;
              return nuevas;
            });
          } catch (errorImagen) {
            console.error("Error procesando imagen:", errorImagen);
            alert(
              errorImagen.message ||
                "No se pudo procesar la imagen."
            );
          } finally {
            setProcesandoImagen(false);
          }
        };

      const restaurarImagenRed =
        (indice, tipo) => {
          if (!productoOriginal) return;

          const originales =
            tipo === "feed"
              ? prepararImagenesFeedExistentes(productoOriginal)
              : prepararImagenesVerticalExistentes(productoOriginal);

          const setLista =
            tipo === "feed"
              ? setImagenesFeed
              : setImagenesVertical;

          setLista((anteriores) => {
            const nuevas = [...anteriores];
            const actual = nuevas[indice];

            if (
              actual?.esNueva &&
              actual?.urlOptimizada?.startsWith("blob:")
            ) {
              URL.revokeObjectURL(actual.urlOptimizada);
            }

            nuevas[indice] = originales[indice];
            return nuevas;
          });
        };

      /* =======================================================
         SUBIR IMAGEN NUEVA
      ======================================================= */

      const subirImagen =
        async (
          imagen,
          numero
        ) => {
          /*
           * Si la imagen no fue reemplazada,
           * devolvemos directamente su URL actual.
           */

          if (
            !imagen?.esNueva
          ) {
            return (
              imagen?.urlActual ||
              imagen?.urlOptimizada ||
                        ""
            );
          }

          if (
            !imagen
              ?.archivoOptimizado
          ) {
            throw new Error(
              `No se pudo preparar la imagen ${numero}.`
            );
          }

          const imagenBase64 =
            await archivoADataUrl(
              imagen
                .archivoOptimizado
            );

          const respuesta =
            await fetch(
              "/api/admin/pedidos?accion=subir-imagen-producto",
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    productoId,

                    numeroImagen:
                      numero,

                    imagenBase64,
                  }),
              }
            );

          const datos =
            await respuesta.json();

          if (
            !respuesta.ok
          ) {
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

      const generarTextos =
        () => {
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

          const categoria =
            obtenerNombreCategoria(
              formulario.categoria
            );
                    const actividades =
            pluralActividad(
              formulario.categoria
            );

          const publico =
            formulario.publico ||
            "Para todas las edades";

          const nivel =
            formulario.nivel ||
            "Medio";

          const nombre =
            formulario.nombre.trim();

          if (
            !nombre ||
            !formulario.categoria ||
            !cantidad
          ) {
            alert(
              "Completá nombre, categoría y cantidad de actividades antes de generar los textos."
            );

            return;
          }

          const descripcion =
            `${nombre}. ` +
            `Incluye ${cantidad} ${actividades} imprimibles` +
            `${
              soluciones > 0
                ? ` con ${soluciones} soluciones`
                : ""
            }. ` +
            `Archivo digital en formato PDF A4 listo para imprimir.`;

          const descripcionLarga =
            `${nombre} es un material digital imprimible pensado para ${publico.toLowerCase()}. ` +
            `El producto incluye ${cantidad} ${actividades}` +
            `${
              soluciones > 0
                ? ` y ${soluciones} soluciones`
                : ""
            }, ` +
            `con nivel ${nivel.toLowerCase()}. ` +
            `${
              paginas > 0
                ? `El archivo contiene ${paginas} páginas en total. `
                : ""
            }` +
            `Se entrega en formato PDF A4 para descargar e imprimir cuando quieras.`;

          const incluye = [
            `${cantidad} ${actividades}`,

            soluciones > 0
              ? `${soluciones} soluciones`
              : null,

            paginas > 0
              ? `${paginas} páginas`
              : null,

            "Archivo PDF",

            "Formato A4",

            "Descarga digital",
          ]
            .filter(Boolean)
            .join("\n");

          const beneficios = [
            "Material listo para imprimir",

            "Uso sencillo y práctico",

            `Nivel ${nivel}`,

            `Pensado para ${publico.toLowerCase()}`,

            "Descarga digital",
          ].join("\n");

          setFormulario(
            (anterior) => ({
              ...anterior,

              descripcion,

              descripcionLarga,

              incluye,

              beneficios,
            })
          );
        };

      /* =======================================================
         PRODUCTO EDITADO
      ======================================================= */

      const productoEditado =
        useMemo(
          () => ({
            ...productoOriginal,

            id: productoId,

            nombre:
              formulario.nombre.trim(),

            ventaCruzadaId:
              formulario.ventaCruzadaId ||
              "",

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
                Number(
                  formulario.precioOfertaARS
                ) || 0,

              etiqueta:
                formulario.etiquetaOferta.trim(),
            },

            precioUSD:
              Number(
                formulario.precioUSD
              ) || 0,

            descuentoUSD: 0,

            ofertaUSD: {
              activa:
                formulario.ofertaUSDActiva,

              precioUSD:
                Number(
                  formulario.precioOfertaUSD
                ) || 0,

              etiqueta:
                formulario.etiquetaOferta.trim(),
            },

            imagenes: {
              ...(productoOriginal?.imagenes || {}),

              portada:
                productoOriginal?.imagenes?.portada || "",

              preview:
                productoOriginal?.imagenes?.preview || "",

              previewsIndividuales: [
                productoOriginal?.imagenes?.previewsIndividuales?.[0] || "",
                productoOriginal?.imagenes?.previewsIndividuales?.[1] || "",
              ],

              redes: {
                feed: {
                  presentacion:
                    productoOriginal?.imagenes?.redes?.feed?.presentacion || "",
                  incluye:
                    productoOriginal?.imagenes?.redes?.feed?.incluye || "",
                  beneficios:
                    productoOriginal?.imagenes?.redes?.feed?.beneficios || "",
                  comoFunciona:
                    productoOriginal?.imagenes?.redes?.feed?.comoFunciona || "",
                },
                vertical: {
                  presentacion:
                    productoOriginal?.imagenes?.redes?.vertical?.presentacion || "",
                  incluye:
                    productoOriginal?.imagenes?.redes?.vertical?.incluye || "",
                  beneficios:
                    productoOriginal?.imagenes?.redes?.vertical?.beneficios || "",
                  comoFunciona:
                    productoOriginal?.imagenes?.redes?.vertical?.comoFunciona || "",
                },
              },
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
              formulario.incluye
                .split("\n")
                .map(
                  (item) =>
                    item.trim()
                )
                .filter(Boolean),

            beneficios:
              formulario.beneficios
                .split("\n")
                .map(
                  (item) =>
                    item.trim()
                )
                .filter(Boolean),

            edadRecomendada:
              formulario.publico,

            nivel:
              formulario.nivel,

            entrega:
              "Descarga digital",

            destacado:
              formulario.destacado,

            archivoPDF:
              archivoPDFActual,
          }),
          [
            formulario,
            productoId,
            productoOriginal,
            archivoPDFActual,
          ]
        );

      /* =======================================================
         GUARDAR CAMBIOS
      ======================================================= */

      const guardarCambios =
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

          if (
            !formulario.descripcion.trim()
          ) {
            alert(
              "Falta la descripción del producto."
            );

            return;
          }

          if (
            imagenes.some((imagen) => !imagen)
          ) {
            alert(
              "El producto debe conservar las 4 imágenes comerciales."
            );
            return;
          }

          if (
            imagenesFeed.some((imagen) => !imagen)
          ) {
            alert(
              "El producto debe conservar las 4 imágenes 4:5 del Feed."
            );
            return;
          }

          if (
            imagenesVertical.some((imagen) => !imagen)
          ) {
            alert(
              "El producto debe conservar las 4 imágenes 9:16 de Stories / Reels."
            );
            return;
          }

          if (
            !archivoPDFActual &&
            !archivoPDF
          ) {
            alert(
              "El producto debe tener un PDF."
            );

            return;
          }

          try {
            setGuardando(
              true
            );

            /*
             * SUBIR ÚNICAMENTE LAS IMÁGENES
             * QUE FUERON REEMPLAZADAS.
             *
             * Las demás conservan su URL.
             */

            const urls = [];

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

            const urlsFeed = [];

            for (
              let i = 0;
              i < imagenesFeed.length;
              i += 1
            ) {
              const url =
                await subirImagen(
                  imagenesFeed[i],
                  i + 5
                );

              urlsFeed.push(url);
            }

            const urlsVertical = [];

            for (
              let i = 0;
              i < imagenesVertical.length;
              i += 1
            ) {
              const url =
                await subirImagen(
                  imagenesVertical[i],
                  i + 9
                );

              urlsVertical.push(url);
            }

            /*
             * CONSERVAR PDF ACTUAL
             * O REEMPLAZARLO.
             */

            let pathnamePDF =
              archivoPDFActual;

            if (archivoPDF) {
              const pathname =
                `productos/${productoId}/${productoId}.pdf`;

              const blobPDF =
                await upload(
                  pathname,
                  archivoPDF,
                  {
                    access:
                      "private",

                    handleUploadUrl:
                      "/api/admin/pedidos?accion=subir-pdf-producto",

                    clientPayload:
                      JSON.stringify({
                        productoId,
                      }),
                  }
                );

              pathnamePDF =
                blobPDF.pathname;
            }

            /*
             * ARMAR PRODUCTO ACTUALIZADO
             */

            const productoFinal =
              {
                ...productoEditado,

                imagenes: {
                  ...(productoOriginal?.imagenes || {}),

                  portada:
                    urls[0],

                  preview:
                    urls[1],

                  previewsIndividuales: [
                    urls[2],
                    urls[3],
                  ],

                  redes: {
                    feed: {
                      presentacion: urlsFeed[0],
                      incluye: urlsFeed[1],
                      beneficios: urlsFeed[2],
                      comoFunciona: urlsFeed[3],
                    },
                    vertical: {
                      presentacion: urlsVertical[0],
                      incluye: urlsVertical[1],
                      beneficios: urlsVertical[2],
                      comoFunciona: urlsVertical[3],
                    },
                  },
                },

                archivoPDF:
                  pathnamePDF,
              };

            /*
             * GUARDAR EN MONGODB
             */

            const respuesta =
              await fetch(
                "/api/admin/pedidos?accion=editar-producto",
                {
                  method:
                    "POST",

                  headers: {
                    "Content-Type":
                      "application/json",
                  },

                  body:
                    JSON.stringify({
                      productoId,

                      producto:
                        productoFinal,
                    }),
                }
              );

            if (
              respuesta.status ===
              401
            ) {
              navigate(
                "/admin/login"
              );

              return;
            }

            const datos =
              await respuesta.json();

            if (
              !respuesta.ok
            ) {
              throw new Error(
                datos.error ||
                  "No se pudo actualizar el producto."
              );
            }

            /*
             * ACTUALIZAR ESTADO LOCAL
             */

            setProductoOriginal(
              productoFinal
            );

            setArchivoPDFActual(
              pathnamePDF
            );

            setArchivoPDF(
              null
            );

            const convertirUrlsAImagenes =
              (listaUrls) =>
                listaUrls.map((url) => ({
                  urlActual: url,
                  urlOptimizada: url,
                  esNueva: false,
                  archivoOriginal: null,
                  archivoOptimizado: null,
                  pesoOriginal: null,
                  pesoOptimizado: null,
                }));

            setImagenes(
              convertirUrlsAImagenes(urls)
            );

            setImagenesFeed(
              convertirUrlsAImagenes(urlsFeed)
            );

            setImagenesVertical(
              convertirUrlsAImagenes(urlsVertical)
            );

            await cargarProductos();

            alert(
              "Producto actualizado correctamente."
            );
          } catch (
            errorGuardado
          ) {
            console.error(
              "Error actualizando producto:",
              errorGuardado
            );
            alert(
              errorGuardado.message ||
                "No se pudo actualizar el producto."
            );
          } finally {
            setGuardando(
              false
            );
          }
        };

      /* =======================================================
         PANTALLA DE CARGA
      ======================================================= */

      if (cargando) {
        return (
          <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
                <RefreshCw
                  size={24}
                  className="mx-auto animate-spin text-sky-600"
                />

                <p className="mt-3 text-sm font-semibold text-slate-700">
                  Cargando producto...
                </p>
              </div>
            </div>
          </main>
        );
      }

      /* =======================================================
         ERROR DE CARGA
      ======================================================= */

      if (error) {
        return (
          <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
            <div className="mx-auto max-w-3xl">
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-6">
                <p className="text-sm font-bold text-rose-700">
                  No se pudo cargar el producto
                </p>

                <p className="mt-2 text-xs text-rose-600">
                  {error}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={
                      cargarProducto
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white"
                  >
                    <RefreshCw
                      size={14}
                    />

                    Reintentar
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        "/admin/productos"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700"
                  >
                    <ArrowLeft
                      size={14}
                    />

                    Volver
                  </button>
                </div>
              </div>
            </div>
          </main>
        );
      }

        /* =======================================================
         RENDER PRINCIPAL
      ======================================================= */

      return (
        <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
          <div className="mx-auto max-w-3xl">

            {/* ENCABEZADO */}

            <div className="mb-6">
              <button
                type="button"
                onClick={() =>
                  navigate(
                    "/admin/productos"
                  )
                }
                className="mb-4 inline-flex items-center gap-2 text-xs font-semibold text-slate-500 transition hover:text-slate-900"
              >
                <ArrowLeft
                  size={14}
                />

                Volver a productos
              </button>

              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Administración
              </p>

              <h1 className="text-xl font-bold text-slate-900">
                Editar producto
              </h1>

              <p className="mt-1 text-xs text-slate-500">
                Modificá la información, imágenes o PDF del producto.
              </p>
            </div>

            {/* ID DEL PRODUCTO */}

            <section className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                ID permanente
              </p>

              <p className="mt-1 break-all text-sm font-bold text-slate-900">
                {productoId}
              </p>

              <p className="mt-2 text-[10px] leading-4 text-slate-500">
                El ID no se puede modificar porque identifica la URL, los archivos y los pedidos del producto.
              </p>
            </section>

            {/* ERROR PRODUCTOS */}

            {errorProductos && (
              <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-semibold text-amber-700">
                  {errorProductos}
                </p>

                <button
                  type="button"
                  onClick={
                    cargarProductos
                  }
                  className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-white px-3 py-2 text-[10px] font-bold text-amber-700"
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

            {/* PRECIO ARGENTINA */}

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

            {/* PRECIO INTERNACIONAL */}

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
                  Sin venta cruzada
                </option>

                {productosDisponibles
                  .filter(
                    (producto) =>
                      producto.id !==
                      productoId
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
                    Regenerar textos
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Podés volver a generar la descripción, contenido y beneficios usando los datos actuales.
                  </p>

                  <button
                    type="button"
                    onClick={
                      generarTextos
                    }
                    disabled={
                      guardando
                    }
                    className="mt-3 inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-sky-700 disabled:opacity-40"
                  >
                    <RefreshCw
                      size={14}
                    />

                    Regenerar textos
                  </button>
                </div>
              </div>
            </section>

            {/* CONTENIDO */}

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
                Las imágenes actuales se conservan. Seleccioná una nueva solamente cuando quieras reemplazarla.
              </p>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                {NOMBRES_IMAGENES.map((titulo, indice) => (
                  <ImagenProducto
                    key={titulo}
                    titulo={titulo}
                    imagen={imagenes[indice]}
                    formato="cuadrado"
                    deshabilitado={procesandoImagen || guardando}
                    onSeleccionar={(archivo) =>
                      seleccionarImagen(indice, archivo)
                    }
                    onRestaurar={() =>
                                            restaurarImagen(indice)
                    }
                  />
                ))}
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Instagram Feed — 4:5
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Las 4 variantes del Feed se conservan hasta que decidas reemplazarlas.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {NOMBRES_IMAGENES_FEED.map((titulo, indice) => (
                    <ImagenProducto
                      key={titulo}
                      titulo={titulo}
                      imagen={imagenesFeed[indice]}
                      formato="feed"
                      deshabilitado={procesandoImagen || guardando}
                      onSeleccionar={(archivo) =>
                        seleccionarImagenRed(indice, archivo, "feed")
                      }
                      onRestaurar={() =>
                        restaurarImagenRed(indice, "feed")
                      }
                    />
                  ))}
                </div>
              </div>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="text-sm font-bold text-slate-900">
                  Stories / Reels — 9:16
                </h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  Las 4 variantes verticales se conservan hasta que decidas reemplazarlas.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                  {NOMBRES_IMAGENES_VERTICAL.map((titulo, indice) => (
                    <ImagenProducto
                      key={titulo}
                      titulo={titulo}
                      imagen={imagenesVertical[indice]}
                      formato="vertical"
                      deshabilitado={procesandoImagen || guardando}
                      onSeleccionar={(archivo) =>
                        seleccionarImagenRed(indice, archivo, "vertical")
                      }
                      onRestaurar={() =>
                        restaurarImagenRed(indice, "vertical")
                      }
                    />
                  ))}
                </div>
              </div>

              {procesandoImagen && (
                <p className="text-xs font-semibold text-sky-600">
                  Optimizando imagen...
                </p>
              )}
            </Seccion>

            {/* PORTADA Y LÁMINA FINAL DEL PDF */}

            <Seccion titulo="Portada y lámina final del PDF">
              <p className="text-xs leading-5 text-slate-500">
                En los productos creados con el armador actual, estas imágenes quedan integradas dentro del PDF privado y no se guardan como archivos de imagen separados. Por eso editar el producto no debe volver a exigirlas.
              </p>

              <div className="grid grid-cols-2 gap-3">
                <MiniaturaPdfA4
                  titulo="Portada del PDF"
                  imagen={productoOriginal?.imagenes?.portadaPDF || ""}
                  textoVacio="Incluida en el PDF actual"
                />

                <MiniaturaPdfA4
                  titulo="Lámina final"
                  imagen={productoOriginal?.imagenes?.paginaFinalPDF || ""}
                  textoVacio="Incluida en el PDF actual"
                />
              </div>
            </Seccion>

                    {/* PDF */}

            <Seccion titulo="PDF del producto">
              <p className="text-xs leading-5 text-slate-500">
                El PDF actual se conservará si no seleccionás uno nuevo.
              </p>

              {archivoPDFActual && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3">
                  <p className="text-xs font-bold text-emerald-700">
                    PDF actual
                  </p>

                  <p className="mt-1 break-all text-[10px] leading-4 text-emerald-600">
                    {archivoPDFActual}
                  </p>
                </div>
              )}

              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-5 text-center transition hover:border-sky-400 hover:bg-sky-50">
                <Upload
                  size={20}
                  className="text-sky-600"
                />

                <span className="text-xs font-semibold text-slate-700">
                  {archivoPDF
                    ? archivoPDF.name
                    : "Seleccionar nuevo PDF"}
                </span>

                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  disabled={guardando}
                  onChange={(e) => {
                    const archivo =
                      e.target.files?.[0] ||
                      null;

                    if (
                      archivo &&
                      archivo.type &&
                      archivo.type !==
                        "application/pdf"
                    ) {
                      alert(
                        "Seleccioná un archivo PDF válido."
                      );

                      e.target.value =
                        "";

                      return;
                    }

                    setArchivoPDF(
                      archivo
                    );

                    e.target.value =
                      "";
                  }}
                />
              </label>

              {archivoPDF && (
                <div className="rounded-lg border border-sky-200 bg-sky-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-sky-700">
                        Nuevo PDF seleccionado
                      </p>

                      <p className="mt-1 truncate text-[10px] text-sky-600">
                        {archivoPDF.name}
                      </p>

                      <p className="mt-0.5 text-[10px] text-sky-500">
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
                      disabled={
                        guardando
                      }
                      onClick={() =>
                        setArchivoPDF(
                          null
                        )
                      }
                      className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50 disabled:opacity-40"
                      aria-label="Quitar nuevo PDF"
                    >
                      <Trash2
                        size={16}
                      />
                    </button>
                  </div>

                  <p className="mt-2 text-[10px] leading-4 text-sky-600">
                    Al guardar, este archivo reemplazará el PDF privado actual.
                  </p>
                </div>
              )}
            </Seccion>

            {/* RESUMEN */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">
                Datos actualizados
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                Revisá la información antes de guardar los cambios.
              </p>

              <pre className="mt-4 max-h-[500px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-[10px] text-slate-100">
                {JSON.stringify(
                  productoEditado,
                  null,
                  2
                )}
              </pre>
            </section>

            {/* GUARDAR */}

            <section className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
                  <Save
                    size={18}
                  />
                </div>

                <div className="flex-1">
                  <h2 className="text-sm font-bold text-slate-900">
                    Guardar cambios
                  </h2>

                  <p className="mt-1 text-xs leading-5 text-slate-600">
                    Los datos se actualizarán en MongoDB. Solo se subirán nuevamente las imágenes que hayas reemplazado.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={
                  guardarCambios
                }
                disabled={
                  guardando ||
                  procesandoImagen
                }
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {guardando ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="animate-spin"
                    />

                    Guardando cambios...
                  </>
                ) : (
                  <>
                    <Save
                      size={16}
                    />

                    Guardar cambios
                  </>
                )}
              </button>
            </section>
          </div>
        </main>
      );
    }

    /* =========================================================
       COMPONENTE IMAGEN
    ========================================================= */

    function ImagenProducto({
      titulo,
      imagen,
      formato = "cuadrado",
      deshabilitado,
      onSeleccionar,
      onRestaurar,
    }) {
      const esNueva = Boolean(imagen?.esNueva);

      const claseFormato =
        formato === "feed"
          ? "aspect-[4/5]"
          : formato === "vertical"
            ? "aspect-[9/16]"
            : "aspect-square";

      const anchoPreview =
        formato === "vertical"
          ? "max-w-[82px]"
          : formato === "feed"
            ? "max-w-[104px]"
            : "max-w-[112px]";

      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-[11px] font-bold text-slate-700">
              {titulo}
            </p>

            {imagen && (
              <span
                className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-bold ${
                  esNueva
                    ? "bg-sky-100 text-sky-700"
                    : "bg-emerald-100 text-emerald-700"
                }`}
              >
                {esNueva ? "Nueva" : "Actual"}
              </span>
            )}
          </div>

          {!imagen ? (
            <label className="mt-2 flex min-h-[76px] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white px-2 py-2 text-center">
              <Upload size={17} className="shrink-0 text-sky-600" />
              <div className="min-w-0">
                <span className="block text-[10px] font-semibold text-slate-600">
                  Seleccionar
                </span>
                <span className="block text-[9px] text-slate-400">
                  JPG, PNG o WebP
                </span>
              </div>

              <input
                type="file"
                accept="image/*"
                disabled={deshabilitado}
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  if (archivo) onSeleccionar(archivo);
                  e.target.value = "";
                }}
              />
            </label>
          ) : (
            <div className="mt-2 flex items-center gap-3">
              <div className={`w-full shrink-0 ${anchoPreview}`}>
                <div
                  className={`overflow-hidden rounded-md border border-slate-200 bg-white ${claseFormato}`}
                >
                  <img
                    src={imagen.urlOptimizada}
                    alt={titulo}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <p className={`text-[9px] font-semibold ${
                  esNueva ? "text-sky-600" : "text-emerald-600"
                }`}>
                  {esNueva ? "Nueva" : "Actual"}
                </p>

                {esNueva &&
                  imagen.pesoOptimizado !== null &&
                  imagen.pesoOptimizado !== undefined && (
                    <p className="mt-0.5 text-[9px] text-slate-400">
                      {(imagen.pesoOptimizado / 1024).toFixed(0)} KB
                    </p>
                  )}

                <label className="mt-1 inline-flex cursor-pointer items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1.5 text-[9px] font-bold text-slate-600">
                  <Upload size={12} />
                  Reemplazar
                  <input
                    type="file"
                    accept="image/*"
                    disabled={deshabilitado}
                    className="hidden"
                    onChange={(e) => {
                      const archivo = e.target.files?.[0];
                      if (archivo) onSeleccionar(archivo);
                      e.target.value = "";
                    }}
                  />
                </label>

                {esNueva && (
                  <button
                    type="button"
                    disabled={deshabilitado}
                    onClick={onRestaurar}
                    className="mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[9px] font-bold text-slate-500 hover:bg-slate-100 disabled:opacity-40"
                  >
                    <RefreshCw size={12} />
                    Restaurar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      );
    }

    function MiniaturaPdfA4({
      titulo,
      imagen,
      textoVacio,
    }) {
      return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <p className="truncate text-[11px] font-bold text-slate-700">
            {titulo}
          </p>

          <div className="mx-auto mt-2 aspect-[210/297] w-full max-w-[130px] overflow-hidden rounded-md border border-slate-200 bg-white">
            {imagen ? (
              <img
                src={imagen}
                alt={titulo}
                className="h-full w-full object-contain"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-3 text-center">
                <p className="text-[9px] leading-4 text-slate-400">
                  {textoVacio}
                </p>
              </div>
            )}
          </div>
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