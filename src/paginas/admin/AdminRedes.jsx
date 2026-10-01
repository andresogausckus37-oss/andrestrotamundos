import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Image,
  Instagram,
  Loader2,
  MessageCircle,
  Pencil,
  Save,
  Sparkles,
} from "lucide-react";

import { generarContenidoRedesLocal } from "../../utilidades/generarContenidoRedesLocal";

// =========================================================
// COMPONENTE PUBLICACIÓN EDITABLE
// =========================================================

function PublicacionEditable({
  titulo,
  publicacion,
  onCambiar,
}) {
  const [abierta, setAbierta] =
    useState(false);

  const hashtags =
    Array.isArray(publicacion.hashtags)
      ? publicacion.hashtags
      : [];

  const actualizarTexto = (texto) => {
    onCambiar({
      ...publicacion,
      texto,
    });
  };

  const actualizarCTA = (cta) => {
    onCambiar({
      ...publicacion,
      cta,
    });
  };

  const actualizarHashtags = (valor) => {
    const nuevosHashtags = valor
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    onCambiar({
      ...publicacion,
      hashtags: nuevosHashtags,
    });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() =>
          setAbierta((valor) => !valor)
        }
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900">
            {titulo}
          </p>

          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-bold uppercase text-slate-500">
              {publicacion.tipo}
            </span>

            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold uppercase text-violet-600">
              {publicacion.formato}
            </span>
          </div>
        </div>

        {abierta ? (
          <ChevronUp
            size={16}
            className="shrink-0 text-slate-400"
          />
        ) : (
          <ChevronDown
            size={16}
            className="shrink-0 text-slate-400"
          />
        )}
      </button>

      {abierta && (
        <div className="border-t border-slate-100 p-4">
          {publicacion.imagen && (
            <div className="mb-4">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Imagen
              </p>

              {Array.isArray(
                publicacion.imagen
              ) ? (
                <div className="grid grid-cols-4 gap-2">
                  {publicacion.imagen.map(
                    (imagen, indice) => (
                      <img
                        key={`${imagen}-${indice}`}
                        src={imagen}
                        alt=""
                        className="aspect-square w-full rounded-lg border border-slate-200 object-cover"
                      />
                    )
                  )}
                </div>
              ) : (
                <img
                  src={publicacion.imagen}
                  alt=""
                  className="h-32 w-32 rounded-lg border border-slate-200 object-cover"
                />
              )}
            </div>
          )}

          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Texto
          </label>

          <textarea
            value={publicacion.texto || ""}
            onChange={(event) =>
              actualizarTexto(
                event.target.value
              )
            }
            rows={6}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-3 text-xs leading-relaxed text-slate-700 outline-none transition focus:border-violet-400"
          />

          {publicacion.cta !==
            undefined && (
            <div className="mt-4">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                CTA
              </label>

              <input
                type="text"
                value={
                  publicacion.cta || ""
                }
                onChange={(event) =>
                  actualizarCTA(
                    event.target.value
                  )
                }
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400"
              />
            </div>
          )}

          <div className="mt-4">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Hashtags
            </label>

            <textarea
              value={hashtags.join(" ")}
              onChange={(event) =>
                actualizarHashtags(
                  event.target.value
                )
              }
              rows={2}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400"
            />

            <p className="mt-1 text-[10px] text-slate-400">
              {hashtags.length} hashtags
            </p>
          </div>

          {publicacion.encuesta && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Encuesta
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-800">
                {
                  publicacion.encuesta
                    .pregunta
                }
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {publicacion.encuesta.opciones?.map(
                  (opcion) => (
                    <span
                      key={opcion}
                      className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-600"
                    >
                      {opcion}
                    </span>
                  )
                )}
              </div>
            </div>
          )}

          {Array.isArray(
            publicacion.guion
          ) && (
            <div className="mt-4 rounded-lg border border-violet-100 bg-violet-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                Guion del Reel
              </p>

              <div className="mt-2 space-y-1">
                {publicacion.guion.map(
                  (paso, indice) => (
                    <p
                      key={`${paso}-${indice}`}
                      className="text-xs leading-relaxed text-slate-700"
                    >
                      {indice + 1}. {paso}
                    </p>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =========================================================
// BLOQUE DE RED
// =========================================================

function BloqueRed({
  titulo,
  icono,
  children,
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-4 flex items-center gap-2">
        {icono}

        <h3 className="text-sm font-bold text-slate-900">
          {titulo}
        </h3>
      </div>

      <div className="space-y-3">
        {children}
      </div>
    </section>
  );
}

// =========================================================
// ADMIN REDES
// =========================================================

export default function AdminRedes() {
  const [
    productosDigitales,
    setProductosDigitales,
  ] = useState([]);

  const [
    producto1Id,
    setProducto1Id,
  ] = useState("");

  const [
    producto2Id,
    setProducto2Id,
  ] = useState("");

  const [
    cargandoProductos,
    setCargandoProductos,
  ] = useState(true);

  const [
    generando,
    setGenerando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    contenidos,
    setContenidos,
  ] = useState([]);

  const [
  guardandoId,
  setGuardandoId,
] = useState("");

const [
  mensajesGuardado,
  setMensajesGuardado,
] = useState({});

  // =======================================================
  // CARGAR PRODUCTOS
  // =======================================================

  useEffect(() => {
    const cargarProductos =
      async () => {
        try {
          setCargandoProductos(true);
          setError("");

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

          setProductosDigitales(
            Array.isArray(datos)
              ? datos
              : datos.productos || []
          );
        } catch (error) {
          console.error(
            "Error cargando productos:",
            error
          );

          setError(
            error.message ||
              "No se pudieron cargar los productos."
          );
        } finally {
          setCargandoProductos(false);
        }
      };

    cargarProductos();
  }, []);

  const producto1 =
    productosDigitales.find(
      (producto) =>
        producto.id === producto1Id
    );

  const producto2 =
    productosDigitales.find(
      (producto) =>
        producto.id === producto2Id
    );

  // =======================================================
  // GENERAR BORRADORES LOCALES
  // =======================================================

  const generarContenido = () => {
    const seleccionados = [
      producto1,
      producto2,
    ].filter(Boolean);

    if (!seleccionados.length) {
      setError(
        "Selecciona al menos un producto."
      );

      return;
    }

    try {
      setGenerando(true);
      setError("");

      const resultados =
        seleccionados.map(
          (producto) => ({
            productoId:
              producto.id,

            nombre:
              producto.nombre,

            contenido:
              generarContenidoRedesLocal(
                producto
              ),
          })
        );

      setContenidos(
        resultados
      );
    } catch (error) {
      console.error(
        "Error generando contenido:",
        error
      );

      setError(
        error.message ||
          "No se pudo generar el contenido."
      );
    } finally {
      setGenerando(false);
    }
  };

  // =======================================================
  // EDITAR UNA PUBLICACIÓN
  // =======================================================

  const actualizarContenido = (
    indiceProducto,
    actualizador
  ) => {
    setContenidos(
      (actuales) =>
        actuales.map(
          (item, indice) => {
            if (
              indice !==
              indiceProducto
            ) {
              return item;
            }

            return {
              ...item,
              contenido:
                actualizador(
                  item.contenido
                ),
            };
          }
        )
    );
  };

  const actualizarThreads = (
    indiceProducto,
    indicePublicacion,
    publicacion
  ) => {
    actualizarContenido(
      indiceProducto,
      (contenido) => {
        const threads = [
          ...contenido.threads,
        ];

        threads[
          indicePublicacion
        ] = publicacion;

        return {
          ...contenido,
          threads,
        };
      }
    );
  };

  const actualizarStory = (
    indiceProducto,
    indiceStory,
    publicacion
  ) => {
    actualizarContenido(
      indiceProducto,
      (contenido) => {
        const stories = [
          ...contenido.instagram
            .stories,
        ];

        stories[indiceStory] =
          publicacion;

        return {
          ...contenido,

          instagram: {
            ...contenido.instagram,
            stories,
          },
        };
      }
    );
  };

  const actualizarCarrusel = (
    indiceProducto,
    publicacion
  ) => {
    actualizarContenido(
      indiceProducto,
      (contenido) => ({
        ...contenido,

        instagram: {
          ...contenido.instagram,
          carrusel:
            publicacion,
        },
      })
    );
  };

  const actualizarReel = (
    indiceProducto,
    publicacion
  ) => {
    actualizarContenido(
      indiceProducto,
      (contenido) => ({
        ...contenido,

        instagram: {
          ...contenido.instagram,
          reel: publicacion,
        },
      })
    );
  };

  const actualizarFacebook = (
    indiceProducto,
    indicePublicacion,
    publicacion
  ) => {
    actualizarContenido(
      indiceProducto,
      (contenido) => {
        const publicaciones = [
          ...contenido.facebook
            .publicaciones,
        ];

        publicaciones[
          indicePublicacion
        ] = publicacion;

        return {
          ...contenido,

          facebook: {
            ...contenido.facebook,
            publicaciones,
          },
        };
      }
    );
  };

  // =======================================================
// GUARDAR BORRADOR EN MONGODB
// =======================================================

const guardarBorrador = async (
  item
) => {
  try {
    setGuardandoId(
      item.productoId
    );

    setMensajesGuardado(
      (actuales) => ({
        ...actuales,
        [item.productoId]: "",
      })
    );

    const respuesta =
      await fetch(
        "/api/contenido-redes?accion=guardar-borrador",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productoId:
              item.productoId,

            nombreProducto:
              item.nombre,

            contenido:
              item.contenido,
          }),
        }
      );

    const datos =
      await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
          "No se pudo guardar el borrador."
      );
    }

    setMensajesGuardado(
      (actuales) => ({
        ...actuales,

        [item.productoId]:
          "Borrador guardado correctamente.",
      })
    );
  } catch (error) {
    console.error(
      "Error guardando borrador:",
      error
    );

    setMensajesGuardado(
      (actuales) => ({
        ...actuales,

        [item.productoId]:
          `Error: ${
            error.message ||
            "No se pudo guardar el borrador."
          }`,
      })
    );
  } finally {
    setGuardandoId("");
  }
};

    // =======================================================
  // RENDER
  // =======================================================

  const hayProductoSeleccionado =
    Boolean(producto1 || producto2);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>

          <h1 className="text-xl font-bold text-slate-900">
            Contenido y redes
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Genera, revisa y edita el
            contenido antes de aprobarlo.
          </p>
        </div>

        {/* PRODUCTOS */}

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles
              size={18}
              className="text-violet-600"
            />

            <h2 className="text-sm font-bold text-slate-900">
              Productos de la semana
            </h2>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Selecciona uno o dos productos
            para preparar su contenido.
          </p>

          {cargandoProductos ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-8 text-xs text-slate-500">
              <Loader2
                size={16}
                className="animate-spin"
              />

              Cargando productos...
            </div>
          ) : (
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {/* PRODUCTO 1 */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Producto 1
                </label>

                <select
                  value={producto1Id}
                  onChange={(event) => {
                    setProducto1Id(
                      event.target.value
                    );

                    setContenidos([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">
                    Seleccionar producto
                  </option>

                  {productosDigitales.map(
                    (producto) => (
                      <option
                        key={producto.id}
                        value={producto.id}
                        disabled={
                          producto.id ===
                          producto2Id
                        }
                      >
                        {producto.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PRODUCTO 2 */}

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Producto 2
                </label>

                <select
                  value={producto2Id}
                  onChange={(event) => {
                    setProducto2Id(
                      event.target.value
                    );

                    setContenidos([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">
                    Seleccionar producto
                  </option>

                  {productosDigitales.map(
                    (producto) => (
                      <option
                        key={producto.id}
                        value={producto.id}
                        disabled={
                          producto.id ===
                          producto1Id
                        }
                      >
                        {producto.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          )}

          {/* ERROR */}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {/* GENERAR */}

          <button
            type="button"
            onClick={generarContenido}
            disabled={
              !hayProductoSeleccionado ||
              generando ||
              cargandoProductos
            }
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {generando ? (
              <>
                <Loader2
                  size={15}
                  className="animate-spin"
                />

                Generando contenido...
              </>
            ) : (
              <>
                <Sparkles size={15} />

                Generar borradores
              </>
            )}
          </button>
        </section>

        {/* CONTENIDOS */}

        {contenidos.length > 0 && (
          <div className="mt-6 space-y-8">
            {contenidos.map(
              (
                item,
                indiceProducto
              ) => {
                const contenido =
                  item.contenido;

                return (
                  <section
                    key={item.productoId}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    {/* CABECERA PRODUCTO */}

                    <div className="border-b border-slate-200 p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                          <Pencil
                            size={17}
                            className="text-violet-600"
                          />
                        </div>

                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                            Borrador
                          </p>

                          <h2 className="mt-0.5 text-base font-bold text-slate-900">
                            {item.nombre}
                          </h2>

                          <p className="mt-1 text-xs text-slate-500">
                            Revisa y modifica
                            cada publicación
                            antes de aprobar el
                            contenido.
                          </p>
                        </div>
                      </div>

                      {/* RESUMEN */}

                      <div className="mt-4 grid grid-cols-3 gap-2">
                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <p className="text-lg font-bold text-slate-900">
                            {
                              contenido
                                .threads
                                .length
                            }
                          </p>

                          <p className="text-[9px] font-bold uppercase text-slate-400">
                            Threads
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <p className="text-lg font-bold text-slate-900">
                            {contenido
                              .instagram
                              .stories
                              .length + 2}
                          </p>

                          <p className="text-[9px] font-bold uppercase text-slate-400">
                            Instagram
                          </p>
                        </div>

                        <div className="rounded-lg bg-slate-50 p-3 text-center">
                          <p className="text-lg font-bold text-slate-900">
                            {
                              contenido
                                .facebook
                                .publicaciones
                                .length
                            }
                          </p>

                          <p className="text-[9px] font-bold uppercase text-slate-400">
                            Facebook
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* REDES */}

                    <div className="space-y-5 p-5">
                      {/* INSTAGRAM */}

                      <BloqueRed
                        titulo="Instagram"
                        icono={
                          <Instagram
                            size={17}
                            className="text-violet-600"
                          />
                        }
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Image
                            size={13}
                            className="text-slate-400"
                          />

                          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                            Feed
                          </p>
                        </div>

                        <PublicacionEditable
                          titulo="Carrusel"
                          publicacion={
                            contenido
                              .instagram
                              .carrusel
                          }
                          onCambiar={(
                            publicacion
                          ) =>
                            actualizarCarrusel(
                              indiceProducto,
                              publicacion
                            )
                          }
                        />

                        <PublicacionEditable
                          titulo="Reel"
                          publicacion={
                            contenido
                              .instagram
                              .reel
                          }
                          onCambiar={(
                            publicacion
                          ) =>
                            actualizarReel(
                              indiceProducto,
                              publicacion
                            )
                          }
                        />

                        <div className="pt-3">
                          <div className="mb-3 flex items-center gap-2">
                            <MessageCircle
                              size={13}
                              className="text-slate-400"
                            />

                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                              Stories
                            </p>
                          </div>

                          <div className="space-y-3">
                            {contenido.instagram.stories.map(
                              (
                                story,
                                indice
                              ) => (
                                <PublicacionEditable
                                  key={`story-${indice}`}
                                  titulo={`Story ${
                                    indice +
                                    1
                                  }`}
                                  publicacion={
                                    story
                                  }
                                  onCambiar={(
                                    publicacion
                                  ) =>
                                    actualizarStory(
                                      indiceProducto,
                                      indice,
                                      publicacion
                                    )
                                  }
                                />
                              )
                            )}
                          </div>
                        </div>
                      </BloqueRed>

                      {/* THREADS */}

                      <BloqueRed
                        titulo="Threads"
                        icono={
                          <MessageCircle
                            size={17}
                            className="text-slate-800"
                          />
                        }
                      >
                        {contenido.threads.map(
                          (
                            publicacion,
                            indice
                          ) => (
                            <PublicacionEditable
                              key={`threads-${indice}`}
                              titulo={`Publicación ${
                                indice +
                                1
                              }`}
                              publicacion={
                                publicacion
                              }
                              onCambiar={(
                                nuevaPublicacion
                              ) =>
                                actualizarThreads(
                                  indiceProducto,
                                  indice,
                                  nuevaPublicacion
                                )
                              }
                            />
                          )
                        )}
                      </BloqueRed>

                      {/* FACEBOOK */}

                      <BloqueRed
                        titulo="Facebook"
                        icono={
                          <MessageCircle
                            size={17}
                            className="text-blue-600"
                          />
                        }
                      >
                        {contenido.facebook.publicaciones.map(
                          (
                            publicacion,
                            indice
                          ) => (
                            <PublicacionEditable
                              key={`facebook-${indice}`}
                              titulo={`Publicación ${
                                indice +
                                1
                              }`}
                              publicacion={
                                publicacion
                              }
                              onCambiar={(
                                nuevaPublicacion
                              ) =>
                                actualizarFacebook(
                                  indiceProducto,
                                  indice,
                                  nuevaPublicacion
                                )
                              }
                            />
                          )
                        )}
                      </BloqueRed>

{/* GUARDAR BORRADOR */}

<div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
  <div className="flex items-start gap-3">
    <Save
      size={17}
      className="mt-0.5 shrink-0 text-violet-600"
    />

    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-slate-900">
        Guardar revisión
      </p>

      <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
        Guarda este contenido como
        borrador. Todavía no se
        publicará ni entrará al
        calendario.
      </p>
    </div>
  </div>

  <button
    type="button"
    onClick={() =>
      guardarBorrador(item)
    }
    disabled={
      guardandoId ===
      item.productoId
    }
    className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 px-4 py-3 text-xs font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
  >
    {guardandoId ===
    item.productoId ? (
      <>
        <Loader2
          size={15}
          className="animate-spin"
        />

        Guardando...
      </>
    ) : (
      <>
        <Save size={15} />

        Guardar borrador
      </>
    )}
  </button>

  {mensajesGuardado[
    item.productoId
  ] && (
    <div className="mt-3 rounded-lg border border-violet-200 bg-white px-3 py-2 text-[11px] text-slate-700">
      {
        mensajesGuardado[
          item.productoId
        ]
      }
    </div>
  )}
</div>
                      
                    </div>
                  </section>
                );
              }
            )}
          </div>
        )}

        {/* AVISO ETAPA ACTUAL */}

        {contenidos.length > 0 && (
          <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold text-amber-900">
              Etapa de revisión
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
              Los cambios todavía se
              mantienen únicamente en esta
              pantalla. En el siguiente paso
              agregaremos el guardado del
              borrador y la aprobación antes
              de enviarlo al calendario.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}