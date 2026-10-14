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
  const [abierta, setAbierta] =
    useState(false);

  const hashtags =
    Array.isArray(publicacion.hashtags)
      ? publicacion.hashtags
      : [];

  const actualizarPublicacion = (cambios) => {
    const nueva = {
      ...publicacion,
      ...cambios,
    };

    const copy = String(
      nueva.copy || ""
    ).trim();

    const cta = String(
      nueva.cta || ""
    ).trim();

    const url = String(
      nueva.urlProducto || ""
    ).trim();

    const hashtags =
      nueva.red === "whatsapp"
        ? []
        : Array.isArray(nueva.hashtags)
          ? nueva.hashtags
          : [];

    nueva.textoCompleto = [
      copy,
      cta,
      url,
      hashtags.join(" "),
    ].filter(Boolean).join("\n\n");

    onCambiar(nueva);
  };

  const actualizarTexto = (texto) => {
    actualizarPublicacion({
      texto,
      copy: texto,
    });
  };

  const actualizarCTA = (cta) => {
    actualizarPublicacion({ cta });
  };

  const actualizarHashtags = (valor) => {
    const nuevosHashtags = valor
      .split(/\s+/)
      .map((item) => item.trim())
      .filter(Boolean);

    actualizarPublicacion({
      hashtags: nuevosHashtags,
    });
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
        onClick={() =>
          setAbierta((valor) => !valor)
        }
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-slate-900">
            {titulo}
          </p>

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

              {Array.isArray(
                publicacion.imagen
              ) ? (
                <div className="flex flex-wrap gap-2">
                  {publicacion.imagen.map(
                    (imagen, indice) => (
                      <img
                        key={`${imagen}-${indice}`}
                        src={imagen}
                        alt=""
                        className={`${claseAspecto} ${anchoVista} rounded-lg border border-slate-200 bg-slate-50 object-contain`}
                      />
                    )
                  )}
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
            onChange={(event) =>
              actualizarTexto(
                event.target.value
              )
            }
            rows={4}
            className="w-full resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] leading-relaxed text-slate-700 outline-none transition focus:border-violet-400"
          />

          {publicacion.cta !==
            undefined && (
            <div className="mt-3">
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
              onChange={(event) =>
                actualizarHashtags(
                  event.target.value
                )
              }
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
            <div className="mt-3 rounded-lg border border-violet-100 bg-violet-50 p-2.5">
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
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="mb-2 flex items-center gap-2">
        {icono}

        <h3 className="text-sm font-bold text-slate-900">
          {titulo}
        </h3>
      </div>

      <div className="space-y-2">
        {children}
      </div>
    </section>
  );
}

// =========================================================
// ADMIN REDES
// =========================================================


const leerRespuestaApi = async (respuesta) => {
  const texto = await respuesta.text();

  if (!texto) {
    return {};
  }

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
  if (!pieza?.fecha || !pieza?.hora || pieza.estado === "publicado") {
    return false;
  }

  const ahora = obtenerAhoraArgentina();

  return (
    pieza.fecha < ahora.fecha ||
    (pieza.fecha === ahora.fecha && pieza.hora <= ahora.hora)
  );
};

const formatearHoraDiagnostico = (valor) => {
  if (!valor) return null;

  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return null;

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(fecha);
};


function VistaPreviaRedes({ recursos = [], tipo = "" }) {
  const urls = [...new Set(recursos.flat(Infinity).filter((v) => typeof v === "string" && /^(https?:\/\/|\/)/.test(v)))];
  const video = /video|reel|story|estado/.test(String(tipo).toLowerCase());
  const visibles = video ? urls.slice(0, 1) : /carrusel/.test(String(tipo).toLowerCase()) ? urls.slice(0, 3) : urls.slice(0, 1);
  if (!visibles.length) return <p className="text-xs text-amber-700">Recurso multimedia no disponible</p>;
  return <div className="flex flex-wrap gap-2">{visibles.map((url, i) => video ?
    <video key={url} src={url} controls playsInline preload="metadata" className="h-32 w-24 rounded-lg bg-black object-contain" /> :
    <img key={url} src={url} alt={`Vista previa ${i + 1}`} loading="lazy" className="h-32 w-24 rounded-lg border border-slate-200 object-cover" />
  )}</div>;
}

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

  const [producto3Id, setProducto3Id] = useState("");

  const [productoPruebaId, setProductoPruebaId] = useState("");

const [textoPrueba, setTextoPrueba] = useState("");
const [idPruebaReel, setIdPruebaReel] = useState("");
const [publicandoPrueba, setPublicandoPrueba] = useState(false);
const [resultadoPrueba, setResultadoPrueba] = useState("");

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
    cargandoBorradores,
    setCargandoBorradores,
  ] = useState(true);

  const [
    guardandoId,
    setGuardandoId,
  ] = useState("");

  const [
    mensajesGuardado,
    setMensajesGuardado,
  ] = useState({});

  const [
  aprobandoId,
  setAprobandoId,
] = useState("");

const [
  mensajeAprobacion,
  setMensajeAprobacion,
] = useState({});

  const [destinosCompartir, setDestinosCompartir] = useState([]);
  const [nombreGrupoFacebook, setNombreGrupoFacebook] = useState("");
const [urlGrupoFacebook, setUrlGrupoFacebook] = useState("");
const [guardandoGrupoFacebook, setGuardandoGrupoFacebook] = useState(false);
const [mensajeGrupoFacebook, setMensajeGrupoFacebook] = useState("");

  const [confirmandoCompartidoFacebook, setConfirmandoCompartidoFacebook] =
  useState("");

  const [aprobados, setAprobados] = useState([]);
  const [programados, setProgramados] = useState([]);
  const [cargandoCalendario, setCargandoCalendario] = useState(true);
  const [programandoId, setProgramandoId] = useState("");
  const [mensajeCalendario, setMensajeCalendario] = useState("");

  const [
  regenerandoId,
  setRegenerandoId,
] = useState("");

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
            await leerRespuestaApi(respuesta);

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

  // =======================================================
  // CARGAR BORRADORES GUARDADOS
  // =======================================================

  useEffect(() => {
    const cargarBorradores =
      async () => {
        try {
          setCargandoBorradores(true);

          const respuesta =
            await fetch(
              "/api/contenido-redes?accion=listar-borradores"
            );

          const datos =
            await leerRespuestaApi(respuesta);

          if (!respuesta.ok) {
            throw new Error(
              datos.error ||
                "No se pudieron cargar los borradores."
            );
          }

          const borradores =
            Array.isArray(datos.borradores)
              ? datos.borradores
                          : [];

          setContenidos(
            borradores.map(
              (borrador) => ({
                productoId:
                  borrador.productoId,

                nombre:
                  borrador.nombreProducto,

                contenido:
                  borrador.contenido,

                origen:
                  borrador.origen ||
                  "plantilla",
              })
            )
          );
        } catch (error) {
          console.error(
            "Error cargando borradores:",
            error
          );

          setError(
            error.message ||
              "No se pudieron cargar los borradores."
          );
        } finally {
          setCargandoBorradores(false);
        }
      };

    cargarBorradores();
  }, []);

  const guardarGrupoFacebook = async () => {
  const nombre = nombreGrupoFacebook.trim();
  const url = urlGrupoFacebook.trim();

  if (!nombre || !url) {
    setMensajeGrupoFacebook(
      "Completa el nombre y la URL del grupo."
    );
    return;
  }

  try {
    setGuardandoGrupoFacebook(true);
    setMensajeGrupoFacebook("");

    const respuesta = await fetch(
      "/api/contenido-redes?accion=guardar-destino-compartir",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          plataforma: "facebook",
          tipo: "grupo",
          nombre,
          url,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos?.error || "No se pudo guardar el grupo."
      );
    }

    setNombreGrupoFacebook("");
    setUrlGrupoFacebook("");
    setMensajeGrupoFacebook("Grupo guardado correctamente.");

    await cargarDestinosCompartir();
  } catch (error) {
    setMensajeGrupoFacebook(
      error.message || "No se pudo guardar el grupo."
    );
  } finally {
    setGuardandoGrupoFacebook(false);
  }
};

  // =======================================================
  // CALENDARIO
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

  const cargarDestinosCompartir = async () => {
  try {
    const respuesta = await fetch(
      "/api/contenido-redes?accion=listar-destinos-compartir",
      {
        credentials: "include",
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos?.error || "No se pudieron cargar los destinos."
      );
    }

    setDestinosCompartir(datos.destinos || []);
  } catch (error) {
    console.error(
      "Error cargando destinos para compartir:",
      error
    );
  }
};

  useEffect(() => {
    cargarDestinosCompartir();
  }, []);

  useEffect(() => {
    cargarCalendario();
  }, []);

  const publicarReelAhora = async (item, pieza) => {
  if (!window.confirm("¿Publicar este Reel ahora en la página de Facebook?")) return;

  try {
    const respuesta = await fetch(
      "/api/contenido-redes?accion=publicar-programado",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: item.productoId,
          fecha: pieza.fecha,
          hora: pieza.hora,
          red: pieza.red,
          tipo: pieza.tipo,
          indice: pieza.indice,
        }),
      }
    );

    const datos = await leerRespuestaApi(respuesta);

    if (!respuesta.ok || !datos.ok) {
      throw new Error(datos.error || "No se pudo publicar.");
    }

    alert("Reel publicado correctamente.");
    await cargarCalendario();
  } catch (error) {
    alert(`Error: ${error.message}`);
    await cargarCalendario();
  }
};

  const [reintentandoThreadsId, setReintentandoThreadsId] = useState("");

  const reintentarThreads = async (item, pieza) => {
    const clave = `${item.productoId}|${pieza.fecha}|${pieza.hora}|${pieza.indice}`;
    if (reintentandoThreadsId) return;
    if (!window.confirm("¿Reintentar UNA vez esta publicación de Threads?")) return;

    setReintentandoThreadsId(clave);
    try {
      const respuesta = await fetch(
        "/api/contenido-redes?accion=publicar-programado",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            productoId: item.productoId,
            fecha: pieza.fecha,
            hora: pieza.hora,
            red: pieza.red,
            tipo: pieza.tipo,
            indice: pieza.indice,
            reintentar: true,
          }),
        }
      );

      const datos = await leerRespuestaApi(respuesta);
      if (!respuesta.ok || !datos?.ok) {
        throw new Error(datos?.error || "Falló el reintento de Threads.");
      }
      alert("Publicación enviada correctamente a Threads.");
    } catch (error) {
      alert(`Threads: ${error.message}`);
    } finally {
      setReintentandoThreadsId("");
      await cargarCalendario();
    }
  };

  const programarAprobado = async (item) => {
    try {
      setProgramandoId(item.productoId);
      setMensajeCalendario("");

      const respuesta = await fetch(
        "/api/contenido-redes?accion=programar-contenido",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productoId: item.productoId }),
        }
      );

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
  const producto =
    productosDigitales.find(
      (producto) =>
        producto.id === item.productoId
    );

  if (!producto) {
    setMensajeCalendario(
      "Error: no se encontró el producto."
    );
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

    const contenidoNuevo =
      generarContenidoRedesLocal(producto);

    const respuesta = await fetch(
      "/api/contenido-redes?accion=regenerar-programado",
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
            item.nombreProducto,

          contenido:
            contenidoNuevo,
        }),
      }
    );

    const datos =
      await leerRespuestaApi(respuesta);

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
          "No se pudo regenerar el contenido."
      );
    }

    setMensajeCalendario(
      "Contenido actualizado. Las publicaciones fueron regeneradas."
    );

    await cargarCalendario();
  } catch (error) {
    console.error(
      "Error regenerando contenido:",
      error
    );

    setMensajeCalendario(
      `Error: ${
        error.message ||
        "No se pudo regenerar el contenido."
      }`
    );
  } finally {
    setRegenerandoId("");
  }
};

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

  const producto3 = productosDigitales.find((producto) => producto.id === producto3Id);

  // =======================================================
  // GENERAR BORRADORES LOCALES
  // =======================================================

                 
const generarContenido = async () => {
  const seleccionados = [
    producto1,
    producto2,
    producto3,
  ].filter(Boolean);

  if (!seleccionados.length) {
    setError("Selecciona al menos un producto.");
    return;
  }

  setGenerando(true);
  setError("");

  try {
    const resultados = await Promise.all(
      seleccionados.map(async (producto) => {
        // React genera la estructura y el respaldo.
        const contenido = generarContenidoRedesLocal(producto);

        const descripcion =
          producto.descripcionLarga ||
          producto.descripcion ||
          "";

        const publicaciones = await Promise.all(
          contenido.calendario.map(async (pieza) => {
            try {
              const respuesta = await fetch("/api/ia/copys", {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
  nombre: producto.nombre,
  descripcion,
  plataforma: pieza.red,
  tipo: pieza.tipo,
  variante: pieza.variante || "",
  contexto: [
    `Red social: ${pieza.red}`,
    `Formato: ${pieza.tipo}`,
    `Variante: ${pieza.variante || "general"}`,
    `Producto: ${producto.nombre}`,
  ].join(". "),
}),
              });

              const datos = await respuesta.json();

              if (!respuesta.ok || !datos.ok) {
                throw new Error(
                  datos.error || "Error generando contenido con IA"
                );
              }

              const esReel =
  (pieza.red === "instagram" && pieza.tipo === "reel") ||
  (pieza.red === "facebook" && pieza.tipo === "reel_pagina");

              const esEstadoWhatsapp =
  pieza.red === "whatsapp" && pieza.tipo === "estado";

let copy = String(datos.copy || "").trim();
let cta = String(datos.cta || "").trim();

if (esReel) {
  copy = copy
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .trim();

  if (cta) {
    const posicion = copy.toLowerCase().indexOf(cta.toLowerCase());
    if (posicion !== -1) {
      copy = (
        copy.slice(0, posicion) +
        copy.slice(posicion + cta.length)
      ).trim();
    }
  }

  const inicio = copy
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .toLowerCase();

  const nombre = String(producto.nombre || "").toLowerCase();

  if (
    ["descubrí", "conocé", "te presentamos"].some(
      frase => inicio.startsWith(`${frase} ${nombre}`)
    )
  ) {
    copy = descripcion.trim();

    if (copy.toLowerCase().startsWith(nombre)) {
      copy = copy.slice(producto.nombre.length)
        .replace(/^[\s:.,\-–]+/, "")
        .trim() || descripcion.trim();
    }
  }
}
              if (pieza.red === "threads" && pieza.tipo === "video") {
  const nombreSeguro = String(producto.nombre || "")
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  if (nombreSeguro) {
    copy = copy.replace(
      new RegExp(
        `^[^\\p{L}\\p{N}]*${nombreSeguro}\\s*[.:;!?–-]*\\s*`,
        "iu"
      ),
      ""
    ).trim();
  }
}

              if (esEstadoWhatsapp) {
  const nombre = String(producto.nombre || "").trim();

  const inicio = copy
    .replace(/^[^\p{L}\p{N}]+/u, "")
    .trim();

  if (
    nombre &&
    inicio.toLowerCase().startsWith(nombre.toLowerCase())
  ) {
    copy = pieza.copy;
  }

  copy = copy
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .replace(/Consultanos para conocer más detalles\.?/gi, "")
    .replace(/¡Encontralo en nuestra tienda!/gi, "")
    .trim();

  if (copy.length > 130) {
    copy = copy
      .slice(0, 130)
      .replace(/\s+\S*$/, "")
      .trim() + "…";
  }

  cta = "¡Encontralo en nuestra tienda!";
              }

              const hashtags = pieza.red === "whatsapp"
                ? []
                : datos.hashtags;

              if (
                !copy ||
                !cta ||
                !Array.isArray(hashtags) ||
                (pieza.red !== "whatsapp" && hashtags.length !== 5)
              ) {
                throw new Error("Contenido IA incompleto");
              }

              const urlProducto = esReel ? "" : pieza.urlProducto || "";

              const textoCompleto = [
                copy,
                cta,
                urlProducto,
                hashtags.join(" "),
              ].filter(Boolean).join("\n\n");

              return {
  ...pieza,
  texto: copy,
  copy,
  cta,
  hashtags,
  urlProducto,
  textoCompleto,
  origen: "ia",
};
              
            } catch (errorIA) {
              console.warn(
                `Respaldo React para ${pieza.red}/${pieza.tipo}:`,
                errorIA
              );

              return {
                ...pieza,
                origen: "plantilla",
              };
            }
          })
        );

        // Sincronizamos todas las vistas con el calendario.
        contenido.calendario = publicaciones;

        contenido.instagram = {
          ...contenido.instagram,
          reel: publicaciones.find(
            p => p.red === "instagram" && p.tipo === "reel"
          ),
          carrusel: publicaciones.find(
            p => p.red === "instagram" && p.tipo === "carrusel"
          ),
          stories: publicaciones.filter(
            p => p.red === "instagram" && p.tipo.includes("story")
          ),
        };

        contenido.threads = publicaciones.filter(
          p => p.red === "threads"
        );

        contenido.facebook = {
          ...contenido.facebook,
          publicaciones: publicaciones.filter(
            p => p.red === "facebook"
          ),
        };

        return {
          productoId: producto.id,
          nombre: producto.nombre,
          contenido,
          origen: publicaciones.every(p => p.origen === "ia")
            ? "ia"
            : "mixto",
        };
      })
    );

    setContenidos(resultados);
  } catch (error) {
    console.error("Error generando contenido:", error);
    setError(error.message || "No se pudo generar el contenido.");
  } finally {
    setGenerando(false);
  }
};
  
  // =======================================================
  // EDITAR UNA PUBLICACIÓN
  // =======================================================

  const actualizarContenido = (indiceProducto, actualizador) => {
    setContenidos((actuales) =>
      actuales.map((item, indice) => {
        if (indice !== indiceProducto) return item;

        const anterior = item.contenido;
        const actualizado = actualizador(anterior);

        const reemplazos = new Map();

        const vincular = (viejo, nuevo) => {
          if (viejo && nuevo && viejo !== nuevo) {
            reemplazos.set(viejo, nuevo);
          }
        };

        vincular(anterior.instagram?.reel, actualizado.instagram?.reel);
        vincular(anterior.instagram?.carrusel, actualizado.instagram?.carrusel);

        ["stories", "publicaciones"].forEach((campo) => {
          const antes = anterior.instagram?.[campo] || [];
          const despues = actualizado.instagram?.[campo] || [];
          antes.forEach((pieza, i) => vincular(pieza, despues[i]));
        });

        ["threads"].forEach((campo) => {
          const antes = anterior[campo] || [];
          const despues = actualizado[campo] || [];
          antes.forEach((pieza, i) => vincular(pieza, despues[i]));
        });

        const facebookAntes = anterior.facebook?.publicaciones || [];
        const facebookDespues = actualizado.facebook?.publicaciones || [];

        facebookAntes.forEach((pieza, i) =>
          vincular(pieza, facebookDespues[i])
        );

        const calendario = (anterior.calendario || []).map(
          (pieza) => reemplazos.get(pieza) || pieza
        );

        return {
          ...item,
          contenido: {
            ...actualizado,
            calendario,
          },
        };
      })
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

            origen:
              item.origen ||
              "plantilla",
          }),
        }
      );

    const datos =
      await leerRespuestaApi(respuesta);

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
// APROBAR CONTENIDO
// =======================================================

const aprobarContenido = async (
  item
) => {
  const confirmado = window.confirm(
    `¿Aprobar el contenido de "${item.nombre}"?\n\nUna vez aprobado quedará disponible para incorporarlo al calendario.`
  );

  if (!confirmado) {
    return;
  }

  try {
    setAprobandoId(
      item.productoId
    );

    setMensajeAprobacion(
      (actuales) => ({
        ...actuales,
        [item.productoId]: "",
      })
    );

    const respuesta =
      await fetch(
        "/api/contenido-redes?accion=aprobar-borrador",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productoId:
              item.productoId,
          }),
        }
      );

    const datos =
      await leerRespuestaApi(respuesta);

    if (!respuesta.ok) {
      throw new Error(
        datos.error ||
          "No se pudo aprobar el contenido."
      );
    }

    setContenidos(
      (actuales) =>
        actuales.filter(
          (contenido) =>
            contenido.productoId !==
            item.productoId
        )
    );

    setMensajeAprobacion(
      (actuales) => ({
        ...actuales,

        [item.productoId]:
          "Contenido aprobado correctamente.",
      })
    );

    await cargarCalendario();
  } catch (error) {
    console.error(
      "Error aprobando contenido:",
      error
    );

    setMensajeAprobacion(
      (actuales) => ({
        ...actuales,

        [item.productoId]:
          `Error: ${
            error.message ||
            "No se pudo aprobar el contenido."
          }`,
      })
    );
  } finally {
    setAprobandoId("");
  }
};

    // =======================================================
  // RENDER
  // =======================================================

  const hayProductoSeleccionado =
    Boolean(producto1 || producto2 || producto3);

  const compartirEnGrupoFacebook = async (pieza, destino, item) => {
    try {
      const textoBase =
        typeof pieza?.publicacion?.texto === "string"
          ? pieza.publicacion.texto.trim()
          : "";

      const productoId =
  item?.productoId || "";

const urlProducto = productoId
  ? `https://andreshousesitter.com/compartir/${encodeURIComponent(
      productoId
    )}`
  : "";

      let textoFinal = textoBase;

      if (urlProducto) {
        const lineas = textoBase.split("\n");

        const indiceHashtags = lineas.findIndex((linea) =>
          linea.trim().startsWith("#")
        );

        if (indiceHashtags !== -1) {
          lineas.splice(
            indiceHashtags,
            0,
            "",
            urlProducto,
            ""
          );

          textoFinal = lineas.join("\n");
        } else {
          textoFinal = `${textoBase}\n\n${urlProducto}`;
        }
      }

      await navigator.clipboard.writeText(textoFinal);

      window.open(
        destino.url,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (error) {
      console.error(
        "Error preparando publicación para Facebook:",
        error
      );

      window.open(
        destino.url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  };

  const compartirEnWhatsapp = async (pieza, item) => {
  try {
    const textoBase =
      typeof pieza?.publicacion?.texto === "string"
        ? pieza.publicacion.texto.trim()
        : "";

    const productoId = item?.productoId || "";

    const urlProducto = productoId
  ? `https://andreshousesitter.com/compartir/${encodeURIComponent(
      productoId
    )}`
  : "";

    // Eliminar hashtags del copy.
    const lineasSinHashtags = textoBase
      .split("\n")
      .filter(
        (linea) => !linea.trim().startsWith("#")
      );

    const copy = lineasSinHashtags
      .join("\n")
      .trim();

    const textoFinal = urlProducto
      ? `${copy}\n\n${urlProducto}`
      : copy;

    // Copiar para poder pegarlo manualmente si hace falta.
    await navigator.clipboard.writeText(textoFinal);

    // Abrir WhatsApp con el texto preparado.
    const urlWhatsapp =
      `https://wa.me/?text=${encodeURIComponent(
        textoFinal
      )}`;

    window.open(
      urlWhatsapp,
      "_blank",
      "noopener,noreferrer"
    );
  } catch (error) {
    console.error(
      "Error preparando publicación para WhatsApp:",
      error
    );

    alert(
      "No se pudo preparar la publicación para WhatsApp."
    );
  }
};

  const descargarImagenesFacebook = async (pieza) => {
  try {
    const imagen = pieza?.publicacion?.imagen;

    const urls = Array.isArray(imagen)
      ? imagen.filter(Boolean)
      : imagen
        ? [imagen]
        : [];

    if (urls.length === 0) {
      alert("Esta publicación no tiene imágenes.");
      return;
    }

    for (let indice = 0; indice < urls.length; indice++) {
      const respuesta = await fetch(urls[indice]);

      if (!respuesta.ok) {
        throw new Error(
          `No se pudo descargar la imagen ${indice + 1}.`
        );
      }

      const blob = await respuesta.blob();

      const extension =
        blob.type === "image/png"
          ? "png"
          : blob.type === "image/webp"
            ? "webp"
            : "jpg";

      const urlTemporal = URL.createObjectURL(blob);

      const enlace = document.createElement("a");

      enlace.href = urlTemporal;
      enlace.download = `facebook-${indice + 1}.${extension}`;

      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();

      setTimeout(() => {
        URL.revokeObjectURL(urlTemporal);
      }, 1000);

      // Pequeña separación entre descargas para Android
      await new Promise((resolve) =>
        setTimeout(resolve, 350)
      );
    }
  } catch (error) {
    console.error(
      "Error descargando imágenes:",
      error
    );

    alert("No se pudieron descargar las imágenes.");
  }
};

  const ejecutarPruebaReelFacebook = async () => {
    
    if (publicandoPrueba || !productoPruebaId) {
      alert("Seleccioná un producto.");
      return;
    }

  if (
    !window.confirm(
      "¿Publicar este Reel REAL en la página de Facebook? Esta acción no se puede deshacer."
    )
  ) {
    return;
  }

  const clave =
    idPruebaReel ||
    `reel-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  setIdPruebaReel(clave);
  setPublicandoPrueba(true);
  setResultadoPrueba("");

  try {
    const respuesta = await fetch(
      "/api/contenido-redes?accion=probar-reel-facebook",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId: productoPruebaId,
          
          texto: textoPrueba.trim(),
          idPrueba: clave,
          confirmar: "PUBLICAR_REEL_FACEBOOK",
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo completar la prueba.");
    }

    setResultadoPrueba(
      `Publicado correctamente. ID de Facebook: ${datos.publicacionId}`
    );
  } catch (error) {
    setResultadoPrueba(
      `${error.message}. Revisá Facebook antes de intentar otra prueba.`
    );
  } finally {
    setPublicandoPrueba(false);
  }
};

  const confirmarCompartidoFacebook = async (item, pieza) => {
  const clave = `${item.productoId}-${pieza.fecha}-${pieza.hora}-${pieza.indice}`;

    if (pieza.compartidoManualFacebook?.estado === "compartido") {
  return;
    }

  try {
    setConfirmandoCompartidoFacebook(clave);

    const respuesta = await fetch(
      "/api/contenido-redes?accion=marcar-compartido-facebook",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productoId: item.productoId,
          fecha: pieza.fecha,
          hora: pieza.hora,
          tipo: pieza.tipo,
          indice: pieza.indice,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos?.error ||
          "No se pudo confirmar la publicación."
      );
    }

    setProgramados((actuales) =>
      actuales.map((programado) => {
        if (programado.productoId !== item.productoId) {
          return programado;
        }

        return {
          ...programado,
          calendario: programado.calendario.map(
            (piezaActual) => {
              const esLaMisma =
                piezaActual.fecha === pieza.fecha &&
                piezaActual.hora === pieza.hora &&
                piezaActual.red === "facebook" &&
                piezaActual.tipo === pieza.tipo &&
                Number(piezaActual.indice) ===
                  Number(pieza.indice);

              if (!esLaMisma) {
                return piezaActual;
              }

              return {
                ...piezaActual,
                compartidoManualFacebook: {
                  estado: "compartido",
                  compartidoEn: datos.compartidoEn,
                },
              };
            }
          ),
        };
      })
    );
  } catch (error) {
    console.error(
      "Error confirmando publicación en Facebook:",
      error
    );

    alert(
      error.message ||
        "No se pudo confirmar la publicación."
    );
  } finally {
    setConfirmandoCompartidoFacebook("");
  }
};

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-10 pt-20">
      <div className="mx-auto max-w-5xl">
        {/* ENCABEZADO */}

        <div className="mb-4">
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

        {/* PRUEBA INDIVIDUAL FACEBOOK REEL */}
<section className="mb-4 rounded-xl border border-amber-200 bg-white p-3">
  <h2 className="text-sm font-bold text-slate-900">
    Prueba de Reel de Facebook
  </h2>

  <p className="mt-1 text-xs text-amber-700">
    Publicación real. No afecta el calendario semanal.
  </p>

  <div className="mt-3 space-y-2">
    <select
      value={productoPruebaId}
      onChange={(e) => setProductoPruebaId(e.target.value)}
      disabled={Boolean(idPruebaReel)}
      className="w-full rounded-lg border border-slate-200 p-2 text-xs"
    >
      <option value="">Seleccionar producto</option>
      {productosDigitales.map((producto) => (
        <option key={producto.id} value={producto.id}>
          {producto.nombre}
        </option>
      ))}
    </select>

    <textarea
      value={textoPrueba}
      onChange={(e) => setTextoPrueba(e.target.value)}
      disabled={Boolean(idPruebaReel)}
      placeholder="Descripción del Reel"
      rows={3}
      className="w-full rounded-lg border border-slate-200 p-2 text-xs"
    />

    <button
      type="button"
      onClick={ejecutarPruebaReelFacebook}
      disabled={publicandoPrueba || Boolean(idPruebaReel)}
      className="w-full rounded-lg bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300"
    >
      {publicandoPrueba
        ? "Publicando..."
        : "Publicar Reel de prueba"}
    </button>

    {idPruebaReel && (
      <p className="text-xs text-slate-600">
        Identificador de prueba: {idPruebaReel}
      </p>
    )}

    {resultadoPrueba && (
      <p className="text-xs text-slate-700">
        {resultadoPrueba}
      </p>
    )}
  </div>
</section>

                {/* GRUPOS DE FACEBOOK */}

        <section className="mb-4 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Grupos de Facebook
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Agrega los grupos donde compartirás el contenido.
          </p>

          <div className="mt-3 space-y-2">
            <input
              type="text"
              value={nombreGrupoFacebook}
              onChange={(event) =>
                setNombreGrupoFacebook(event.target.value)
              }
              placeholder="Nombre del grupo"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400"
            />

            <input
              type="url"
              value={urlGrupoFacebook}
              onChange={(event) =>
                setUrlGrupoFacebook(event.target.value)
              }
              placeholder="URL del grupo de Facebook"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-violet-400"
            />

            <button
              type="button"
              onClick={guardarGrupoFacebook}
              disabled={guardandoGrupoFacebook}
              className="w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:bg-slate-300"
            >
              {guardandoGrupoFacebook
                ? "Guardando..."
                : "Agregar grupo"}
            </button>

            {mensajeGrupoFacebook && (
              <p className="text-xs text-slate-600">
                {mensajeGrupoFacebook}
              </p>
            )}
          </div>

          {destinosCompartir.filter(
            (destino) =>
              destino.plataforma === "facebook" &&
              destino.tipo === "grupo"
          ).length > 0 && (
            <div className="mt-3 space-y-2">
              {destinosCompartir
                .filter(
                  (destino) =>
                    destino.plataforma === "facebook" &&
                    destino.tipo === "grupo"
                )
                .map((destino) => (
                  <div
                    key={String(destino._id)}
                    className="rounded-lg bg-slate-50 px-3 py-2"
                  >
                    <p className="text-xs font-bold text-slate-800">
                      {destino.nombre}
                    </p>

                    <p className="mt-0.5 truncate text-[10px] text-slate-500">
                      {destino.url}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </section>

        {/* PRODUCTOS */}

        <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
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
            Seleccioná tres productos para preparar su contenido
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
            <div className="mt-3 grid gap-3 md:grid-cols-3">
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
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
                          producto.id === producto2Id || producto.id === producto3Id
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
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
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
                          producto.id === producto1Id || producto.id === producto3Id
                        }
                      >
                        {producto.nombre}
                      </option>
                    )
                  )}
                </select>
              </div>

              {/* PRODUCTO 3 */}
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Producto 3</label>
                <select
                  value={producto3Id}
                  onChange={(event) => { setProducto3Id(event.target.value); setContenidos([]); }}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700 outline-none transition focus:border-violet-400"
                >
                  <option value="">Seleccionar producto</option>
                  {productosDigitales.map((producto) => (
                    <option key={producto.id} value={producto.id} disabled={producto.id === producto1Id || producto.id === producto2Id}>
                      {producto.nombre}
                    </option>
                  ))}
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
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
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

        {cargandoBorradores && (
          <div className="mt-6 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-xs text-slate-500 shadow-sm">
            <Loader2
              size={16}
              className="animate-spin"
            />

            Recuperando borradores guardados...
          </div>
        )}

        {!cargandoBorradores &&
          contenidos.length > 0 && (
          <div className="mt-3 space-y-3">
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

                    <div className="border-b border-slate-200 p-3.5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                          <Pencil
                            size={17}
                            className="text-violet-600"
                          />
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
                              Borrador
                            </p>

                            <span
                              className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${
                                item.origen === "ia"
                                  ? "bg-violet-100 text-violet-700"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {item.origen === "ia"
                                ? "Generado con IA"
                                : "Plantilla React"}
                            </span>
                          </div>

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

                      {/* RESUMEN DEL CALENDARIO VIGENTE */}
                      <div className="mt-3 rounded-lg bg-slate-50 p-3">
                        <p className="text-sm font-bold text-slate-900">
                          {contenido.calendario?.length || 0} piezas por producto
                        </p>
                        <p className="text-xs text-slate-500">
                          Instagram 2 · Threads 3 · Fan Page 3 · Grupos Facebook 3 · WhatsApp 2
                        </p>
                      </div>
                    </div>

                    {/* PUBLICACIONES DEL CALENDARIO NUEVO */}
                    <div className="space-y-3 p-3">
                      {(contenido.calendario || []).map((pieza) => (
                        <div key={pieza.id} className="rounded-xl border border-slate-200 p-3 space-y-2">
                          <p className="text-xs font-bold uppercase text-slate-700">
                            {pieza.dia === "dia1" ? "Día 1" : "Día 2"} · {pieza.hora} · {pieza.red} · {pieza.variante || pieza.tipo}
                          </p>
                          <textarea
                            className="w-full rounded-lg border border-slate-200 p-2 text-sm"
                            rows={5}
                            value={pieza.textoCompleto || ""}
                            onChange={(event) => {
                              const textoCompleto = event.target.value;
                              actualizarContenido(indiceProducto, (actual) => ({
                                ...actual,
                                calendario: actual.calendario.map((p) =>
                                  p.id === pieza.id ? { ...p, textoCompleto } : p
                                ),
                              }));
                            }}
                          />
                          <div className="flex flex-wrap gap-2">
                            <button type="button" className="rounded-lg bg-slate-900 px-3 py-2 text-xs text-white"
                              onClick={() => navigator.clipboard.writeText(pieza.textoCompleto || "")}
                            >Copiar texto completo</button>
                            <VistaPreviaRedes
                              recursos={[
                                pieza.videoUrl,
                                pieza.video,
                                pieza.recurso,
                                pieza.imagenes,
                                pieza.imagenesFeed,
                                pieza.imagen,
                              ]}
                              tipo={pieza.variante || pieza.tipo}
                            />
                            {pieza.vistaPreviaEnlace && pieza.urlProducto && (
                              <a href={pieza.urlProducto} target="_blank" rel="noreferrer"
                                className="rounded-lg border border-slate-300 px-3 py-2 text-xs"
                              >Abrir enlace del producto</a>
                            )}
                          </div>
                          {!pieza.publicacionAutomatica && (
                            <p className="text-xs text-amber-700">Publicación semiautomática: adjuntá el recurso al compartir. Copiar el texto no adjunta imágenes.</p>
                          )}
                        </div>
                      ))}
                    </div>

{/* GUARDAR BORRADOR */}

<div className="rounded-xl border border-violet-200 bg-violet-50 p-2.5">
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
    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
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

  <button
  type="button"
  onClick={() =>
    aprobarContenido(item)
  }
  disabled={
    aprobandoId ===
      item.productoId ||
    guardandoId ===
      item.productoId
  }
  className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
>
  {aprobandoId ===
  item.productoId ? (
    <>
      <Loader2
        size={15}
        className="animate-spin"
      />

      Aprobando...
    </>
  ) : (
    <>
      <CheckCircle2 size={15} />

      Aprobar contenido
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

                      {mensajeAprobacion[
  item.productoId
] && (
  <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-700">
    {
      mensajeAprobacion[
        item.productoId
      ]
    }
  </div>

)}
                      
                    
                  </section>
                );
              }
            )}
          </div>
        )}


        {/* CALENDARIO */}

        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-2">
            <CalendarDays size={17} className="text-violet-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Calendario</h2>
              <p className="text-[10px] text-slate-500">
                Semana programada · Hora Argentina
              </p>
            </div>
          </div>
       

          {cargandoCalendario ? (
            <div className="mt-3 flex items-center justify-center gap-2 py-4 text-[11px] text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              Cargando calendario...
            </div>
          ) : (
            <>
              {aprobados.map((item) => (
                <div
                  key={String(item._id || item.productoId)}
                  className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5"
                >
                  <p className="text-[11px] font-bold text-slate-900">
                    {item.nombreProducto}
                    
                  </p>
                    <p className="text-[10px] text-slate-500">
                      Aprobado · listo para programar
                    </p>

                    <button
                      type="button"
                      onClick={() => programarAprobado(item)}
                      disabled={programandoId === item.productoId}
                      className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                    >
                      {programandoId === item.productoId ? (
                        <>
                          <Loader2 size={14} className="animate-spin" />
                          Incorporando...
                        </>
                      ) : (
                        <>
                          <CalendarDays size={14} />
                          Incorporar al calendario semanal
                        </>
                      )}
                    </button>
                </div>
              ))}

              {programados.map((item) => {
                const calendario = Array.isArray(item.calendario)
                  ? item.calendario
                  : [];

                return (
                  <div
                    key={String(item._id || item.productoId)}
                    className="mt-3"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-[11px] font-bold text-slate-900">
                          {item.nombreProducto}
                        </p>
                        <p className="text-[10px] text-emerald-600">Programado</p>
                      </div>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-bold text-emerald-700">
                        {calendario.length} piezas
                      </span>
                    </div>

                    <button
  type="button"
  disabled={true}
  title="Regeneración deshabilitada para proteger las publicaciones existentes"
  className="mb-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white disabled:bg-violet-300"
>
  {regenerandoId ===
  item.productoId ? (
    <>
      <Loader2
        size={14}
        className="animate-spin"
      />

      Regenerando...
    </>
  ) : (
    <>
      <RefreshCw size={14} />

      Regeneración temporalmente deshabilitada
    </>
  )}
</button>

                    <div className="grid gap-2 md:grid-cols-3">
                      {[...new Set(calendario.map((pieza) => pieza.fecha))]
                        .sort()
                        .map((fecha) => {
                        const nombre = new Intl.DateTimeFormat("es-AR", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                          timeZone: "America/Argentina/Buenos_Aires",
                        }).format(new Date(`${fecha}T12:00:00-03:00`));
                        const piezas = calendario
                          .filter((pieza) => pieza.fecha === fecha)
                          .sort((a, b) =>
                            String(a.hora).localeCompare(String(b.hora))
                          );

                        return (
                          <div
                            key={fecha}
                            className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                          >
                            <p className="mb-2 text-[10px] font-bold uppercase text-slate-600">
                              {nombre}
                            </p>

                            <div className="space-y-1.5">
                              {piezas.map((pieza, indice) => (
                                <div
                                  key={`${pieza.red}-${pieza.tipo}-${pieza.indice}-${indice}`}
                                  className="rounded-md bg-white px-2 py-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-[10px] font-semibold capitalize text-slate-700">
                                      {pieza.red} · {pieza.tipo}
                                    </span>
                                    <span className="text-[9px] font-bold text-violet-600">
                                      {pieza.hora} AR
                                    </span>
                                  </div>

                                  {(pieza.publicacion?.texto || pieza.publicacion?.cta) && (

                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const p = pieza.publicacion || {};

                                      const texto = String(
                                        p.textoCompleto || p.texto || ""
                                      ).trim();

                                      if (pieza.red === "whatsapp") {
                                        try {
                                          await navigator.clipboard.writeText(texto);
                                        } catch (error) {
                                          console.error("No se pudo copiar:", error);
                                        }

                                        window.location.href =
                                          `https://wa.me/?text=${encodeURIComponent(texto)}`;

                                        return;
                                      }

                                      try {
                                        await navigator.clipboard.writeText(texto);
                                        alert("Publicación copiada.");
                                      } catch {
                                        alert("No se pudo copiar el texto.");
                                      }
                                    }}
                                    className="mt-1.5 w-full rounded-md border border-violet-200 px-2 py-1.5 text-[10px] font-semibold text-violet-700"
                                  >
                                    {pieza.red === "whatsapp"
                                      ? "Compartir en WhatsApp"
                                      : "Copiar publicación completa"}
                                  </button>

                                  )}

                                  {pieza.red === "facebook" &&
  pieza.tipo === "reel_pagina" &&
  pieza.estado === "programado" &&
  pieza.publicacionAutomatica !== false && (
    <button
      type="button"
      onClick={() => publicarReelAhora(item, pieza)}
      className="mt-2 w-full rounded-lg bg-violet-600 px-3 py-2 text-xs font-bold text-white"
    >
      Publicar Reel ahora
    </button>
  )}
                                  {pieza.red === "threads" &&
                                    pieza.estado === "error" &&
                                    Number(pieza.intentosPublicacion) === 2 &&
                                    !pieza.publicacionId &&
                                    !pieza.publicadoEn &&
                                    !pieza.procesandoDesde &&
                                    String(pieza.ultimoError || "").startsWith(
                                      "Threads no pudo crear la publicación."
                                    ) && (
                                      <button
                                        type="button"
                                        disabled={Boolean(reintentandoThreadsId)}
                                        onClick={() => reintentarThreads(item, pieza)}
                                        className="mt-2 w-full rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                                      >
                                        {reintentandoThreadsId ===
                                        `${item.productoId}|${pieza.fecha}|${pieza.hora}|${pieza.indice}`
                                          ? "Reintentando Threads..."
                                          : "Reintentar Threads (una vez)"}
                                      </button>
                                    )}

                                  <VistaPreviaRedes
                                    recursos={[
                                      pieza.publicacion?.videoUrl,
                                      pieza.publicacion?.video,
                                      pieza.publicacion?.recurso,
                                      pieza.publicacion?.imagenes,
                                      pieza.publicacion?.imagenesFeed,
                                      pieza.publicacion?.imagen,
                                    ]}
                                    tipo={pieza.tipo}
                                  />

                                  {pieza.estado === "publicado" ? (
                                    <p className="mt-1 text-[9px] font-semibold text-emerald-600">
                                      Publicado
                                    </p>
                                  ) : horarioYaPasoArgentina(pieza) ? (
                                    <div className="mt-1 space-y-0.5">
                                      <p className="text-[9px] font-semibold text-amber-600">
                                        {Number(pieza.intentosPublicacion) > 0
                                          ? `Intentos registrados: ${pieza.intentosPublicacion}`
                                          : "Pendiente · esperando al cron"}
                                      </p>

                                      {formatearHoraDiagnostico(
                                        pieza.ultimoIntentoEn || pieza.ultimoErrorEn
                                      ) && (
                                        <p className="text-[9px] text-slate-500">
                                          Último intento: {formatearHoraDiagnostico(
                                            pieza.ultimoIntentoEn || pieza.ultimoErrorEn
                                          )} AR
                                        </p>
                                      )}

                                      {pieza.ultimoError && (
                                        <p className="break-words text-[9px] font-medium text-red-600">
                                          Error: {pieza.ultimoError}
                                        </p>
                                      )}

                                      {Array.isArray(pieza.imagenesIntentadas) &&
                                        pieza.imagenesIntentadas.length > 0 && (
                                          <p className="text-[9px] text-slate-400">
                                            Imágenes registradas: {pieza.imagenesIntentadas.length}
                                          </p>
                                        )}
                                    </div>
                                  ) : (
                                    <p className="mt-1 text-[9px] text-slate-400">
                                      Programado · publicación automática
                                    </p>
                                  )}

                                  {pieza.red === "facebook" &&
                                    destinosCompartir
                                      .filter(
                                        (destino) =>
                                          destino.plataforma === "facebook" &&
                                          destino.tipo === "grupo"
                                      )
                                      .map((destino) => (
                                        <button
                                          key={String(destino._id)}
                                          type="button"
                                          onClick={() =>
  compartirEnGrupoFacebook(pieza, destino, item)
}
                                          className="mt-2 w-full rounded-md bg-red-600 px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-red-700"
                                        >
                                          Compartir en {destino.nombre}
                                        </button>
                                      ))}

{pieza.red === "facebook" &&
  pieza?.publicacion?.imagen && (
    <button
      type="button"
      onClick={() =>
        descargarImagenesFacebook(pieza)
      }
      className="mt-1.5 w-full rounded-md border border-violet-200 bg-violet-50 px-2 py-1.5 text-[10px] font-bold text-violet-700"
    >
      Descargar imágenes
    </button>
  )}

                                  {pieza.red === "facebook" &&
  pieza.estado === "pendiente_manual" && (
  <button
    type="button"
    onClick={() =>
      confirmarCompartidoFacebook(item, pieza)
    }
    
    disabled={
  pieza.compartidoManualFacebook?.estado === "compartido" ||
  confirmandoCompartidoFacebook ===
    `${item.productoId}-${pieza.fecha}-${pieza.hora}-${pieza.indice}`
    }
    
    className={`mt-2 w-full rounded-md px-2 py-1.5 text-[10px] font-bold text-white transition ${
      pieza.compartidoManualFacebook?.estado ===
      "compartido"
        ? "bg-green-600 hover:bg-green-700"
        : "bg-slate-700 hover:bg-slate-800"
    }`}
  >
    {confirmandoCompartidoFacebook ===
    `${item.productoId}-${pieza.fecha}-${pieza.hora}-${pieza.indice}`
      ? "Guardando..."
      : pieza.compartidoManualFacebook?.estado ===
          "compartido"
        ? "✓ Compartido en Facebook"
        : "Confirmar publicación en Facebook"}
  </button>
)}

{pieza.red === "facebook" && (
  <button
    type="button"
    onClick={() =>
      compartirEnWhatsapp(pieza, item)
    }
    className="mt-2 w-full rounded-md bg-green-600 px-2 py-1.5 text-[10px] font-bold text-white transition hover:bg-green-700"
  >
    Compartir en WhatsApp
  </button>
)}
                                  
                                  
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {aprobados.length === 0 && programados.length === 0 && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-3 text-center text-[11px] text-slate-500">
                  Aprueba un contenido para incorporarlo al calendario.
                </p>
              )}
            </>
          )}
        </section>

        {/* AVISO ETAPA ACTUAL */}

        {contenidos.length > 0 && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold text-amber-900">
              Etapa de revisión
            </p>

            <p className="mt-1 text-[11px] leading-relaxed text-amber-700">
              Los borradores guardados se
              recuperan automáticamente desde
              MongoDB cuando vuelves a esta
              pantalla. Todavía no se
              publicarán ni entrarán al
              calendario hasta que sean
              aprobados.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}      