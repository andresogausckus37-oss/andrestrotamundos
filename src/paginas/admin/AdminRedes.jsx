import { useEffect, useState } from "react";
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Image,
  Loader2,
  MessageCircle,
  Pencil,
  Save,
  RefreshCw,
  Sparkles,
  PlayCircle,
  RotateCcw,
} from "lucide-react";
import { generarContenidoRedesLocal } from "../../utilidades/generarContenidoRedesLocal";

// =========================================================
// COMPONENTE PUBLICACIÓN EDITABLE
// =========================================================

function PublicacionEditable({
  titulo,
  publicacion,
  onCambiar,
  relacionAspecto = "1:1",
  videoUrl = "",
}) {
  const [abierta, setAbierta] = useState(false);
  const hashtags = Array.isArray(publicacion.hashtags)
    ? publicacion.hashtags
    : [];

  const actualizarTexto = (texto) => {
    onCambiar({ ...publicacion, texto });
  };

  const actualizarCTA = (cta) => {
    onCambiar({ ...publicacion, cta });
  };

  const actualizarHashtags = (valor) => {
    const nuevosHashtags = valor
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);
    onCambiar({ ...publicacion, hashtags: nuevosHashtags });
  };

  const claseAspecto =
    relacionAspecto === "9:16"
      ? "aspect-[9/16]"
      : relacionAspecto === "4:5"
      ? "aspect-[4/5]"
      : "aspect-square";

  const anchoVista =
    relacionAspecto === "9:16"
      ? "w-28"
      : relacionAspecto === "4:5"
      ? "w-32"
      : "w-28";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setAbierta((valor) => !valor)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900">{titulo}</p>
          <div className="mt-0.5 flex flex-wrap gap-1">
            <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[8px] font-bold uppercase text-slate-500">
              {publicacion.tipo}
            </span>
            <span className="rounded-full bg-violet-50 px-1.5 py-0.5 text-[8px] font-bold uppercase text-violet-600">
              {publicacion.formato}
            </span>
          </div>
        </div>
        {abierta ? (
          <ChevronUp size={16} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        )}
      </button>

      {videoUrl && (
        <div className="mb-3">
          <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Video Reel
          </p>
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            className={`${claseAspecto} ${anchoVista} rounded-lg border border-slate-200 bg-black object-contain`}
          />
        </div>
      )}

      {abierta && (
        <div className="border-t border-slate-100 p-3">
          {!videoUrl && publicacion.imagen && (
            <div className="mb-3">
              <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                Imagen
              </p>
              {Array.isArray(publicacion.imagen) ? (
                <div className="flex flex-wrap gap-2">
                  {publicacion.imagen.map((imagen, indice) => (
                    <img
                      key={`${imagen}-${indice}`}
                      src={imagen}
                      alt=""
                      className={`${claseAspecto} ${anchoVista} rounded-lg border border-slate-200 bg-slate-50 object-contain`}
                    />
                  ))}
                </div>
              ) : (
                <img
                  src={publicacion.imagen}
                  alt=""
                  className={`${claseAspecto} ${anchoVista} rounded-lg border border-slate-200 bg-slate-50 object-contain`}
                />
              )}
            </div>
          )}

          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
            Texto
          </label>
          <textarea
            value={publicacion.texto || ""}
            onChange={(event) => actualizarTexto(event.target.value)}
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-700 outline-none transition focus:border-violet-400"
          />

          {publicacion.cta !== undefined && (
            <div className="mt-3">
              <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                CTA
              </label>
              <input
                type="text"
                value={publicacion.cta || ""}
                onChange={(event) => actualizarCTA(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
              />
            </div>
          )}

          <div className="mt-3">
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Hashtags
            </label>
            <textarea
              value={hashtags.join(" ")}
              onChange={(event) => actualizarHashtags(event.target.value)}
              rows={2}
              className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              {hashtags.length} hashtags
            </p>
          </div>

          {publicacion.encuesta && (
            <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Encuesta
              </p>
              <p className="mt-2 text-xs font-semibold text-slate-800">
                {publicacion.encuesta.pregunta}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {publicacion.encuesta.opciones?.map((opcion) => (
                  <span
                    key={opcion}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-600"
                  >
                    {opcion}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Array.isArray(publicacion.guion) && (
            <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                Guion del Reel
              </p>
              <div className="mt-2 space-y-1">
                {publicacion.guion.map((paso, indice) => (
                  <p
                    key={`${paso}-${indice}`}
                    className="text-xs leading-relaxed text-slate-700"
                  >
                    {indice + 1}. {paso}
                  </p>
                ))}
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

function BloqueRed({ titulo, icono, children }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        {icono}
        <h3 className="text-sm font-bold text-slate-900">{titulo}</h3>
      </div>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
// =========================================================
// ADMIN REDES — FUNCIONES AUXILIARES
// =========================================================

const leerRespuestaApi = async (respuesta) => {
  const texto = await respuesta.text();
  if (!texto) return {};
  try {
    return JSON.parse(texto);
  } catch {
    throw new Error(
      respuesta.ok
        ? "El servidor devolvió una respuesta no válida."
        : `Error del servidor (${respuesta.status}). Intenta nuevamente.`
    );
  }
};

const obtenerAhoraArgentina = () => {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const valores = Object.fromEntries(
    partes.map((parte) => [parte.type, parte.value])
  );
  return {
    fecha: `${valores.year}-${valores.month}-${valores.day}`,
    hora: `${valores.hour}:${valores.minute}`,
  };
};

const horarioYaPasoArgentina = (pieza) => {
  if (!pieza?.fecha || !pieza?.hora) return false;
  if (pieza.estado === "publicado" || pieza.estado === "fallido") return false;

  const ahora = obtenerAhoraArgentina();

  // Convertir a números para comparar sin errores de formato
  const [hP, mP] = String(pieza.hora).split(":").map(Number);
  const [hA, mA] = String(ahora.hora).split(":").map(Number);

  const fechaVencida = pieza.fecha < ahora.fecha;
  const mismaFechaHoraVencida = 
    pieza.fecha === ahora.fecha &&
    (hP < hA || (hP === hA && mP <= mA));

  return fechaVencida || mismaFechaHoraVencida;
};


const MAX_INTENTOS_PUBLICACION = 3;

export default function AdminRedes() {
  const [productosDigitales, setProductosDigitales] = useState([]);
  const [producto1Id, setProducto1Id] = useState("");
  const [producto2Id, setProducto2Id] = useState("");
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [error, setError] = useState("");
  const [contenidos, setContenidos] = useState([]);
  const [cargandoBorradores, setCargandoBorradores] = useState(true);
  const [guardandoId, setGuardandoId] = useState("");
  const [mensajesGuardado, setMensajesGuardado] = useState({});
  const [aprobandoId, setAprobandoId] = useState("");
  const [mensajeAprobacion, setMensajeAprobacion] = useState({});
  const [aprobados, setAprobados] = useState([]);
  const [programados, setProgramados] = useState([]);
  const [cargandoCalendario, setCargandoCalendario] = useState(true);
  const [programandoId, setProgramandoId] = useState("");
  const [mensajeCalendario, setMensajeCalendario] = useState("");
  const [regenerandoId, setRegenerandoId] = useState("");
  const [publicandoId, setPublicandoId] = useState("");

  // =======================================================
  // REINTENTAR / PUBLICAR MANUALMENTE
  // =======================================================
  const publicarPiezaManual = async (productoId, pieza) => {
    const confirmacion =
      pieza.estado === "fallido"
        ? `¿Reintentar esta publicación?\n${pieza.red} · ${pieza.tipo}\n${pieza.fecha} ${pieza.hora}\n\nSe reiniciará el contador de intentos.`
        : `¿Publicar ahora?\n${pieza.red} · ${pieza.tipo}\n${pieza.fecha} ${pieza.hora}`;

    if (!window.confirm(confirmacion)) return;

    try {
      setPublicandoId(`${productoId}|${pieza.fecha}|${pieza.hora}|${pieza.red}|${pieza.tipo}|${pieza.indice}`);

      const respuesta = await fetch("/api/contenido-redes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accion: "publicar-programado",
          productoId,
          fecha: pieza.fecha,
          hora: pieza.hora,
          red: pieza.red,
          tipo: pieza.tipo,
          indice: pieza.indice,
        }),
      });

      const datos = await leerRespuestaApi(respuesta);

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo publicar.");
      }

      alert(
        pieza.estado === "fallido"
          ? "✅ Reintento enviado correctamente."
          : "✅ Publicación enviada correctamente."
      );
      await cargarCalendario();
    } catch (err) {
      alert(`❌ ${err.message}`);
    } finally {
      setPublicandoId("");
    }
  };

  const estaPublicando = (productoId, pieza) => {
    return (
      publicandoId ===
      `${productoId}|${pieza.fecha}|${pieza.hora}|${pieza.red}|${pieza.tipo}|${pieza.indice}`
    );
  };

  // =======================================================
  // CARGAR PRODUCTOS
  // =======================================================
  useEffect(() => {
    const cargarProductos = async () => {
      try {
        setCargandoProductos(true);
        setError("");
        const respuesta = await fetch("/api/admin/pedidos?accion=listar-productos");
        const datos = await leerRespuestaApi(respuesta);
        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudieron cargar los productos.");
        }
        setProductosDigitales(
          Array.isArray(datos) ? datos : datos.productos || []
        );
      } catch (error) {
        console.error("Error cargando productos:", error);
        setError(error.message || "No se pudieron cargar los productos.");
      } finally {
        setCargandoProductos(false);
      }
    };
    cargarProductos();
  }, []);

  // =======================================================
  // CARGAR BORRADORES GUARDADOS
  // =======================================================
  useEffect(() => {
    const cargarBorradores = async () => {
      try {
        setCargandoBorradores(true);
        const respuesta = await fetch("/api/contenido-redes?accion=listar-borradores");
        const datos = await leerRespuestaApi(respuesta);
        if (!respuesta.ok) {
          throw new Error(datos.error || "No se pudieron cargar los borradores.");
        }
        const borradores = Array.isArray(datos.borradores) ? datos.borradores : [];
        setContenidos(
          borradores.map((borrador) => ({
            productoId: borrador.productoId,
            nombre: borrador.nombreProducto,
            contenido: borrador.contenido,
          }))
        );
      } catch (error) {
        console.error("Error cargando borradores:", error);
        setError(error.message || "No se pudieron cargar los borradores.");
      } finally {
        setCargandoBorradores(false);
      }
    };
    cargarBorradores();
  }, []);

  // =======================================================
  // CARGAR CALENDARIO
  // =======================================================
  const cargarCalendario = async () => {
    try {
      setCargandoCalendario(true);
      const [ra, rp] = await Promise.all([
        fetch("/api/contenido-redes?accion=listar-aprobados"),
        fetch("/api/contenido-redes?accion=listar-programados"),
      ]);
      const da = await leerRespuestaApi(ra);
      const dp = await leerRespuestaApi(rp);
      if (!ra.ok) throw new Error(da.error || "No se pudieron cargar los aprobados.");
      if (!rp.ok) throw new Error(dp.error || "No se pudo cargar el calendario.");
      setAprobados(Array.isArray(da.aprobados) ? da.aprobados : []);
      setProgramados(Array.isArray(dp.programados) ? dp.programados : []);
    } catch (e) {
      console.error("Error cargando calendario:", e);
      setError(e.message || "No se pudo cargar el calendario.");
    } finally {
      setCargandoCalendario(false);
    }
  };

  useEffect(() => {
    cargarCalendario();
  }, []);

  const programarAprobado = async (item) => {
    try {
      setProgramandoId(item.productoId);
      setMensajeCalendario("");
      const respuesta = await fetch("/api/contenido-redes?accion=programar-contenido", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: item.productoId }),
      });
      const datos = await leerRespuestaApi(respuesta);
      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo programar el contenido.");
      }
      setMensajeCalendario(
        "Contenido incorporado correctamente al calendario semanal."
      );
      await cargarCalendario();
    } catch (e) {
      setMensajeCalendario(`Error: ${e.message || "No se pudo programar."}`);
    } finally {
      setProgramandoId("");
    }
  };

  const regenerarProgramado = async (item) => {
    const producto = productosDigitales.find(
      (producto) => producto.id === item.productoId
    );
    if (!producto) {
      setMensajeCalendario("Error: no se encontró el producto.");
      return;
    }
    const confirmar = window.confirm(
      `¿Regenerar las publicaciones de "${item.nombreProducto}"?\n\n` +
        "Se reemplazará el contenido programado actual por los textos nuevos."
    );
    if (!confirmar) return;
    try {
      setRegenerandoId(item.productoId);
      setMensajeCalendario("");
      const contenidoNuevo = generarContenidoRedesLocal(producto);
      const respuesta = await fetch("/api/contenido-redes?accion=regenerar-programado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: item.productoId,
          nombreProducto: item.nombreProducto,
          contenido: contenidoNuevo,
        }),
      });
      const datos = await leerRespuestaApi(respuesta);
      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo regenerar el contenido.");
      }
      setMensajeCalendario(
        "Contenido actualizado. Las 20 publicaciones fueron regeneradas."
      );
      await cargarCalendario();
    } catch (error) {
      console.error("Error regenerando contenido:", error);
      setMensajeCalendario(
        `Error: ${error.message || "No se pudo regenerar el contenido."}`
      );
    } finally {
      setRegenerandoId("");
    }
  };
    // =======================================================
  // FUNCIONES DE EDICIÓN Y GUARDADO
  // =======================================================
  const producto1 = productosDigitales.find(
    (producto) => producto.id === producto1Id
  );
  const producto2 = productosDigitales.find(
    (producto) => producto.id === producto2Id
  );

  const generarContenido = () => {
    const seleccionados = [producto1, producto2].filter(Boolean);
    if (!seleccionados.length) {
      setError("Selecciona al menos un producto.");
      return;
    }
    try {
      setGenerando(true);
      setError("");
      const resultados = seleccionados.map((producto) => ({
        productoId: producto.id,
        nombre: producto.nombre,
        contenido: generarContenidoRedesLocal(producto),
      }));
      setContenidos(resultados);
    } catch (error) {
      console.error("Error generando contenido:", error);
      setError(error.message || "No se pudo generar el contenido.");
    } finally {
      setGenerando(false);
    }
  };

  const actualizarContenido = (indiceProducto, actualizador) => {
    setContenidos((actuales) =>
      actuales.map((item, indice) => {
        if (indice !== indiceProducto) return item;
        return { ...item, contenido: actualizador(item.contenido) };
      })
    );
  };

  const actualizarThreads = (indiceProducto, indicePublicacion, publicacion) => {
    actualizarContenido(indiceProducto, (contenido) => {
      const threads = [...contenido.threads];
      threads[indicePublicacion] = publicacion;
      return { ...contenido, threads };
    });
  };

  const actualizarStory = (indiceProducto, indiceStory, publicacion) => {
    actualizarContenido(indiceProducto, (contenido) => {
      const stories = [...contenido.instagram.stories];
      stories[indiceStory] = publicacion;
      return { ...contenido, instagram: { ...contenido.instagram, stories } };
    });
  };

  const actualizarCarrusel = (indiceProducto, publicacion) => {
    actualizarContenido(indiceProducto, (contenido) => ({
      ...contenido,
      instagram: { ...contenido.instagram, carrusel: publicacion },
    }));
  };

  const actualizarReel = (indiceProducto, publicacion) => {
    actualizarContenido(indiceProducto, (contenido) => ({
      ...contenido,
      instagram: { ...contenido.instagram, reel: publicacion },
    }));
  };

  const actualizarFacebook = (indiceProducto, indicePublicacion, publicacion) => {
    actualizarContenido(indiceProducto, (contenido) => {
      const publicaciones = [...contenido.facebook.publicaciones];
      publicaciones[indicePublicacion] = publicacion;
      return { ...contenido, facebook: { ...contenido.facebook, publicaciones } };
    });
  };

  const guardarBorrador = async (item) => {
    try {
      setGuardandoId(item.productoId);
      setMensajesGuardado((actuales) => ({
        ...actuales,
        [item.productoId]: "",
      }));
      const respuesta = await fetch("/api/contenido-redes?accion=guardar-borrador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: item.productoId,
          nombreProducto: item.nombre,
          contenido: item.contenido,
        }),
      });
      const datos = await leerRespuestaApi(respuesta);
      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo guardar el borrador.");
      }
      setMensajesGuardado((actuales) => ({
        ...actuales,
        [item.productoId]: "Borrador guardado correctamente.",
      }));
    } catch (error) {
      console.error("Error guardando borrador:", error);
      setMensajesGuardado((actuales) => ({
        ...actuales,
        [item.productoId]: `Error: ${error.message || "No se pudo guardar el borrador."}`,
      }));
    } finally {
      setGuardandoId("");
    }
  };

  const aprobarContenido = async (item) => {
    const confirmado = window.confirm(
      `¿Aprobar el contenido de "${item.nombre}"?\n\nUna vez aprobado quedará disponible para incorporarlo al calendario.`
    );
    if (!confirmado) return;
    try {
      setAprobandoId(item.productoId);
      setMensajeAprobacion((actuales) => ({
        ...actuales,
        [item.productoId]: "",
      }));
      const respuesta = await fetch("/api/contenido-redes?accion=aprobar-borrador", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: item.productoId }),
      });
      const datos = await leerRespuestaApi(respuesta);
      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo aprobar el contenido.");
      }
      setContenidos((actuales) =>
        actuales.filter((contenido) => contenido.productoId !== item.productoId)
      );
      setMensajeAprobacion((actuales) => ({
        ...actuales,
        [item.productoId]: "Contenido aprobado correctamente.",
      }));
      await cargarCalendario();
    } catch (error) {
      console.error("Error aprobando contenido:", error);
      setMensajeAprobacion((actuales) => ({
        ...actuales,
        [item.productoId]: `Error: ${error.message || "No se pudo aprobar el contenido."}`,
      }));
    } finally {
      setAprobandoId("");
    }
  };

  // =======================================================
  // RENDER — SELECCIÓN Y GENERACIÓN
  // =======================================================
  const hayProductoSeleccionado = Boolean(producto1 || producto2);

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-10 pt-20">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>
          <h1 className="text-xl font-bold text-slate-900">Contenido y redes</h1>
          <p className="mt-1 text-xs text-slate-500">
            Genera, revisa y edita el contenido antes de aprobarlo.
          </p>
        </div>

        {/* SELECCIÓN DE PRODUCTOS */}
        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />
            <h2 className="text-sm font-bold text-slate-900">Productos de la semana</h2>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Selecciona uno o dos productos para preparar su contenido.
          </p>

          {cargandoProductos ? (
            <div className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-slate-50 py-8 text-xs text-slate-500">
              <Loader2 size={16} className="animate-spin" />
              Cargando productos...
            </div>
          ) : (
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {/* PRODUCTO 1 */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Producto 1
                </label>
                <select
                  value={producto1Id}
                  onChange={(event) => {
                    setProducto1Id(event.target.value);
                    setContenidos([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">Seleccionar producto</option>
                  {productosDigitales.map((producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                      disabled={producto.id === producto2Id}
                    >
                      {producto.nombre}
                    </option>
                  ))}
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
                    setProducto2Id(event.target.value);
                    setContenidos([]);
                  }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">Seleccionar producto</option>
                  {productosDigitales.map((producto) => (
                    <option
                      key={producto.id}
                      value={producto.id}
                      disabled={producto.id === producto1Id}
                    >
                      {producto.nombre}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={generarContenido}
            disabled={!hayProductoSeleccionado || generando || cargandoProductos}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            {generando ? (
              <>
                <Loader2 size={15} className="animate-spin" />
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
                {/* BORRADORES GENERADOS */}
        {cargandoBorradores && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-sm">
            <Loader2 size={16} className="animate-spin" />
            Recuperando borradores guardados...
          </div>
        )}

        {!cargandoBorradores && contenidos.length > 0 && (
          <div className="mt-3 space-y-3">
            {contenidos.map((item, indiceProducto) => {
              const contenido = item.contenido;
              return (
                <section
                  key={item.productoId}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* CABECERA PRODUCTO */}
                  <div className="border-b border-slate-200 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                        <Pencil size={17} className="text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                          Borrador
                        </p>
                        <h2 className="mt-0.5 text-base font-bold text-slate-900">
                          {item.nombre}
                        </h2>
                        <p className="mt-1 text-xs text-slate-500">
                          Revisa y modifica cada publicación antes de aprobar el contenido.
                        </p>
                      </div>
                    </div>

                    {/* RESUMEN */}
                    <div className="mt-3 grid grid-cols-3 gap-1.5">
                      <div className="rounded-lg bg-slate-50 p-2 text-center">
                        <p className="text-base font-bold text-slate-900">
                          {contenido.threads.length}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          Threads
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 text-center">
                        <p className="text-base font-bold text-slate-900">
                          {contenido.instagram.stories.length + 2}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          Instagram
                        </p>
                      </div>
                      <div className="rounded-lg bg-slate-50 p-2 text-center">
                        <p className="text-base font-bold text-slate-900">
                          {contenido.facebook.publicaciones.length}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-slate-400">
                          Facebook
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* EDICIÓN DE REDES */}
                  <div className="space-y-2.5 p-3">
                    {/* INSTAGRAM */}
                    <BloqueRed
                      titulo="Instagram"
                      icono={<Image size={17} className="text-violet-600" />}
                    >
                      <PublicacionEditable
                        titulo="Carrusel"
                        relacionAspecto="4:5"
                        publicacion={contenido.instagram.carrusel}
                        onCambiar={(pub) => actualizarCarrusel(indiceProducto, pub)}
                      />
                      <PublicacionEditable
                        titulo="Reel"
                        relacionAspecto="9:16"
                        videoUrl={
                          productosDigitales.find((p) => p.id === item.productoId)?.videoReel || ""
                        }
                        publicacion={contenido.instagram.reel}
                        onCambiar={(pub) => actualizarReel(indiceProducto, pub)}
                      />
                      <p className="mt-2 text-[10px] font-bold uppercase text-slate-400">Stories</p>
                      {contenido.instagram.stories.map((story, i) => (
                        <PublicacionEditable
                          key={`story-${i}`}
                          titulo={`Story ${i + 1}`}
                          relacionAspecto="9:16"
                          publicacion={story}
                          onCambiar={(pub) => actualizarStory(indiceProducto, i, pub)}
                        />
                      ))}
                    </BloqueRed>

                    {/* THREADS */}
                    <BloqueRed
                      titulo="Threads"
                      icono={<MessageCircle size={17} className="text-slate-800" />}
                    >
                      {contenido.threads.map((pub, i) => (
                        <PublicacionEditable
                          key={`th-${i}`}
                          titulo={`Publicación ${i + 1}`}
                          publicacion={pub}
                          onCambiar={(nueva) => actualizarThreads(indiceProducto, i, nueva)}
                        />
                      ))}
                    </BloqueRed>

                    {/* FACEBOOK */}
                    <BloqueRed
                      titulo="Facebook"
                      icono={<MessageCircle size={17} className="text-blue-600" />}
                    >
                      {contenido.facebook.publicaciones.map((pub, i) => (
                        <PublicacionEditable
                          key={`fb-${i}`}
                          titulo={`Publicación ${i + 1}`}
                          publicacion={pub}
                          onCambiar={(nueva) => actualizarFacebook(indiceProducto, i, nueva)}
                        />
                      ))}
                    </BloqueRed>

                    {/* ACCIONES: GUARDAR / APROBAR */}
                    <div className="rounded-xl border border-violet-200 bg-violet-50 p-2.5">
                      <button
                        type="button"
                        onClick={() => guardarBorrador(item)}
                        disabled={guardandoId === item.productoId}
                        className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:bg-violet-300"
                      >
                        {guardandoId === item.productoId ? (
                          <><Loader2 size={14} className="animate-spin" /> Guardando...</>
                        ) : (
                          <><Save size={14} /> Guardar borrador</>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => aprobarContenido(item)}
                        disabled={aprobandoId === item.productoId}
                        className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:bg-slate-300"
                      >
                        {aprobandoId === item.productoId ? (
                          <><Loader2 size={14} className="animate-spin" /> Aprobando...</>
                        ) : (
                          <><CheckCircle2 size={14} /> Aprobar contenido</>
                        )}
                      </button>
                      {mensajesGuardado[item.productoId] && (
                        <p className="mt-2 text-[11px] text-violet-700">
                          {mensajesGuardado[item.productoId]}
                        </p>
                      )}
                      {mensajeAprobacion[item.productoId] && (
                        <p className="mt-2 text-[11px] text-emerald-700">
                          {mensajeAprobacion[item.productoId]}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}

        {/* CALENDARIO SEMANAL */}
        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarDays size={18} className="text-violet-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Calendario semanal</h2>
              <p className="text-[10px] text-slate-500">Hora · Argentina</p>
            </div>
          </div>

          {cargandoCalendario ? (
            <div className="py-6 text-center text-xs text-slate-500">
              <Loader2 size={16} className="animate-spin inline mr-2" />
              Cargando calendario...
            </div>
          ) : (
            <>
              {/* APROBADOS PENDIENTES DE PROGRAMAR */}
              {aprobados.length > 0 && (
                <div className="mb-4 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500">Pendientes de programar</p>
                  {aprobados.map((item) => (
                    <div key={String(item._id)} className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5">
                      <p className="text-xs font-bold text-slate-900">{item.nombreProducto}</p>
                      <button
                        type="button"
                        onClick={() => programarAprobado(item)}
                        disabled={programandoId === item.productoId}
                        className="mt-2 w-full flex items-center justify-center gap-1.5 bg-violet-600 text-white rounded-lg py-2 text-[11px] font-bold hover:bg-violet-700 disabled:bg-violet-300"
                      >
                        {programandoId === item.productoId ? (
                          <><Loader2 size={14} className="animate-spin" /> Incorporando...</>
                        ) : (
                          <><CalendarDays size={14} /> Incorporar al calendario</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {mensajeCalendario && (
                <div className={`mb-3 px-3 py-2 rounded-lg text-[11px] ${
                  mensajeCalendario.startsWith("Error:")
                    ? "bg-red-50 border border-red-200 text-red-700"
                    : "bg-emerald-50 border border-emerald-200 text-emerald-700"
                }`}>
                  {mensajeCalendario}
                </div>
              )}

              {/* PROGRAMADOS */}
              {programados.length === 0 ? (
                <p className="py-4 text-center text-xs text-slate-500">
                  No hay contenido programado aún. Aprueba un producto para incorporarlo.
                </p>
              ) : (
                <div className="space-y-4">
                  {programados.map((item) => {
                    const calendario = Array.isArray(item.calendario) ? item.calendario : [];
                    return (
                      <div key={String(item._id)} className="border border-slate-200 rounded-lg overflow-hidden">
                        {/* CABECERA DEL PRODUCTO PROGRAMADO */}
                        <div className="bg-slate-50 px-3 py-2.5 border-b border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{item.nombreProducto}</p>
                              {item.estado === "completado-con-errores" ? (
                                <p className="text-[10px] text-amber-600 font-medium">
                                  ⚠️ Completado con errores — revisa las piezas fallidas
                                </p>
                              ) : item.estado === "publicado" ? (
                                <p className="text-[10px] text-emerald-600 font-medium">✅ Semana completada</p>
                              ) : (
                                <p className="text-[10px] text-slate-500">Programado</p>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => regenerarProgramado(item)}
                              disabled={regenerandoId === item.productoId}
                              className="flex items-center gap-1 text-[10px] text-violet-600 hover:text-violet-800 disabled:text-slate-400"
                            >
                              <RefreshCw size={13} />
                              Regenerar
                            </button>
                          </div>
                        </div>

                        {/* DÍAS Y PIEZAS */}
                        <div className="p-3 space-y-3">
                          {[...new Set(calendario.map(p => p.fecha))].sort().map((fecha) => {
                            const nombreDia = new Intl.DateTimeFormat("es-AR", {
                              weekday: "long", day: "numeric", month: "short",
                              timeZone: "America/Argentina/Buenos_Aires",
                            }).format(new Date(`${fecha}T12:00:00-03:00`));

                            const piezasDelDia = calendario
                              .filter(p => p.fecha === fecha)
                              .sort((a, b) => a.hora.localeCompare(b.hora));

                            return (
                              <div key={fecha}>
                                <p className="text-[10px] font-bold uppercase text-slate-500 mb-1.5">
                                  {nombreDia}
                                </p>
                                <div className="space-y-1.5">
                                  {piezasDelDia.map((pieza, idx) => {
                                    const enProceso = estaPublicando(item.productoId, pieza);
                                    const claseEstado = 
                                      pieza.estado === "publicado" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                      pieza.estado === "fallido" ? "bg-red-50 text-red-700 border-red-100" :
                                      pieza.estado === "publicando" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                      "bg-slate-50 text-slate-600 border-slate-100";

                                    return (
                                      <div key={`${pieza.red}-${idx}`} className={`p-2 rounded-md border ${claseEstado}`}>
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                          <span className="text-[10px] font-semibold capitalize">
                                            {pieza.red} · {pieza.tipo}
                                          </span>
                                          <span className="text-[9px] font-bold text-violet-600">
                                            {pieza.hora} hs
                                          </span>
                                        </div>

                                        {/* ETIQUETA DE ESTADO + BOTÓN DE ACCIÓN */}
                                        <div className="mt-1 flex items-center justify-between gap-2">
                                          <span className="text-[9px] font-medium">
                                            {pieza.estado === "publicado" && "✅ Publicado"}
                                            {pieza.estado === "fallido" && "❌ Fallida"}
                                            {pieza.estado === "publicando" && "⏳ En proceso"}
                                            {pieza.estado === "programado" &&
                                              `${horarioYaPasoArgentina(pieza) ? "⚠️ Pendiente" : "📅 Programado"}`
                                            }
                                          </span>

                                          {/* BOTONES DE ACCIÓN */}
                                          {pieza.estado === "fallido" && (
                                            <button
                                              type="button"
                                              onClick={() => publicarPiezaManual(item.productoId, pieza)}
                                              disabled={enProceso}
                                              className="flex items-center gap-1 text-[9px] bg-blue-500 text-white px-2 py-0.5 rounded hover:bg-blue-600 disabled:bg-blue-300"
                                            >
                                              {enProceso ? <Loader2 size={10} className="animate-spin" /> : <RotateCcw size={10} />}
                                              Reintentar
                                            </button>
                                          )}

                                          {pieza.estado === "programado" && (
                                            <button
                                              type="button"
                                              onClick={() => publicarPiezaManual(item.productoId, pieza)}
                                              disabled={enProceso}
                                              className="flex items-center gap-1 text-[9px] bg-teal-500 text-white px-2 py-0.5 rounded hover:bg-teal-600 disabled:bg-teal-300"
                                            >
                                              {enProceso ? <Loader2 size={10} className="animate-spin" /> : <PlayCircle size={10} />}
                                              Publicar
                                            </button>
                                          )}
                                        </div>

                                                                                {/* MENSAJE DE ERROR SI EXISTE */}
                                        {pieza.ultimoError && (
                                          <p className="mt-1 text-[9px] text-red-600 italic">
                                            ⚠️ {pieza.ultimoError}
                                            {(pieza.intentos || 0) < MAX_INTENTOS_PUBLICACION &&
                                              ` (${pieza.intentos || 0}/${MAX_INTENTOS_PUBLICACION} intentos)`
                                            }
                                          </p>
                                        )}

                                        {/* INDICADOR DE INTENTOS */}
                                        {pieza.estado === "programado" && (pieza.intentos || 0) > 0 && (
                                          <p className="mt-1 text-[9px] text-amber-600">
                                            ⚠️ {pieza.intentos} de {MAX_INTENTOS_PUBLICACION} intentos fallidos
                                          </p>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
