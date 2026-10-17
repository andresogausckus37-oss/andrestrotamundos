import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CloudUpload,
  CreditCard,
  Download,
  FileImage,
  Film,
  Heart,
  Images,
  LockKeyhole,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
  Wallet,
} from "lucide-react";

const LOGOS = {
  instagram: "https://i.postimg.cc/1tGRTnck/3840px-Instagram-logo-2022-svg.png",
  facebook: "https://i.postimg.cc/rshTXS0k/Logo-de-Facebook.png",
  threads: "https://i.postimg.cc/RVg7qrSt/Threads-(app).png",
};

const PLAN = {
  id: "comunidad-semanal",
  nombre: "Comunidad Semanal",
  contenidos: 4,
  duracionDias: 7,
  precios: {
    ARS: { 1: 15000, 2: 25000 },
    USD: { 1: 15, 2: 25 },
  },
};

const REDES = [
  { id: "instagram", nombre: "Instagram", disponible: true },
  { id: "facebook", nombre: "Facebook", disponible: true },
  { id: "threads", nombre: "Threads", disponible: false },
];

const TIPOS = [
  { id: "reel", nombre: "Reel", icono: Film, formatos: ["9:16"] },
  { id: "carrusel", nombre: "Carrusel", icono: Images, formatos: ["4:5", "1:1"] },
  { id: "imagen", nombre: "Imagen", icono: FileImage, formatos: ["4:5", "1:1"] },
];

const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HORARIOS = ["09:00", "10:00", "12:00", "14:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const ZONAS_FRECUENTES = [
  ["America/Argentina/Buenos_Aires", "Argentina · Buenos Aires"],
  ["America/Argentina/Cordoba", "Argentina · Córdoba"],
  ["America/Bogota", "Colombia · Bogotá"],
  ["America/Mexico_City", "México · Ciudad de México"],
  ["America/Santiago", "Chile · Santiago"],
  ["America/Lima", "Perú · Lima"],
  ["America/Montevideo", "Uruguay · Montevideo"],
  ["America/Asuncion", "Paraguay · Asunción"],
  ["America/La_Paz", "Bolivia · La Paz"],
  ["America/Caracas", "Venezuela · Caracas"],
  ["America/Guayaquil", "Ecuador · Guayaquil"],
  ["America/New_York", "Estados Unidos · Nueva York"],
  ["America/Los_Angeles", "Estados Unidos · Los Ángeles"],
  ["America/Sao_Paulo", "Brasil · São Paulo"],
  ["Europe/Madrid", "España · Madrid"],
  ["Europe/London", "Reino Unido · Londres"],
];

const CONFIGURACION_INICIAL = [
  ["reel", "Lunes", "18:00"],
  ["carrusel", "Miércoles", "18:00"],
  ["imagen", "Viernes", "18:00"],
  ["reel", "Domingo", "18:00"],
];
const RESOLUCIONES = { "9:16": "1080 × 1920", "4:5": "1080 × 1350", "1:1": "1080 × 1080" };
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal text-slate-900 outline-none transition focus:border-[#285861] focus:ring-2 focus:ring-[#285861]/10";
const BOTON_ACTIVO = "border-[#285861] bg-[#EFF5F3] text-[#285861]";
const BOTON_NORMAL = "border-slate-200 bg-white text-slate-700 hover:border-slate-400";

function clases(...clasesLista) {
  return clasesLista.filter(Boolean).join(" ");
}

function precioFormateado(valor, moneda) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(valor);
}

function crearContenidos() {
  return CONFIGURACION_INICIAL.map(([tipo, dia, hora], index) => ({
    id: `contenido-${index + 1}`,
    tipo,
    dia,
    hora,
    formato: tipo === "reel" ? "9:16" : "4:5",
    descripcion: "",
    cta: "",
    hashtags: "",
    archivos: [],
  }));
}

function archivoCompatible(archivo, tipo) {
  if (tipo === "reel") return archivo.type === "video/mp4" || /\.mp4$/i.test(archivo.name);
  return ["image/jpeg", "image/png", "image/webp"].includes(archivo.type) || /\.(jpe?g|png|webp)$/i.test(archivo.name);
}

function LogoRed({ red, size = 23, className = "" }) {
  return (
    <img
      src={LOGOS[red]}
      alt={REDES.find((op) => op.id === red)?.nombre || red}
      loading="lazy"
      className={clases("shrink-0 object-contain", className)}
      style={{ width: size, height: size, backgroundColor: "transparent" }}
    />
  );
}

function Campo({ titulo, ayuda, children }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{titulo}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-xs leading-5 text-slate-500">{ayuda}</span>}
    </label>
  );
}

function TituloSeccion({ numero, titulo, descripcion }) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#EFF5F3] text-xs font-medium text-[#285861]">
        {numero}
      </span>
      <div>
        <h2 className="text-base font-medium leading-7 text-slate-900">{titulo}</h2>
        {descripcion && <p className="mt-0.5 text-xs leading-5 text-slate-500">{descripcion}</p>}
      </div>
    </div>
  );
}

function datosParaDescargar({ redes, contenidos, negocio, moneda, zonaHoraria }) {
  return {
    version: 2,
    planId: PLAN.id,
    planNombre: PLAN.nombre,
    duracionDias: PLAN.duracionDias,
    inicioSemana: "lunes",
    criterioInicio: "lunes_siguiente_a_aprobacion_del_pago_contenidos_y_cuentas",
    redes,
    moneda,
    zonaHoraria,
    negocio,
    precioMostrado: {
      monto: PLAN.precios[moneda][redes.length],
      moneda,
      sujetoAConfirmacion: true,
    },
    publicaciones: contenidos.map(({ archivos, ...contenido }) => ({
      ...contenido,
      archivosSeleccionados: archivos.map(({ archivo }) => ({
        nombre: archivo.name,
        tipo: archivo.type,
        tamano: archivo.size,
      })),
    })),
    aviso: "Este archivo guarda la configuración, pero no incluye los archivos multimedia. La carga definitiva se realiza después del pago.",
  };
}

export default function ConfiguradorPublicaciones() {
  const [redes, setRedes] = useState(["instagram", "facebook"]);
  const [contenidos, setContenidos] = useState(crearContenidos);
  const [seleccion, setSeleccion] = useState("contenido-1");
  const [imagenActiva, setImagenActiva] = useState(0);
  const [redVista, setRedVista] = useState("instagram");
  const [moneda, setMoneda] = useState("ARS");
  const [zonaHoraria, setZonaHoraria] = useState("America/Argentina/Buenos_Aires");
  const [negocio, setNegocio] = useState({
    nombre: "", rubro: "", contacto: "", email: "", url: "", whatsapp: "", publico: "", tono: "cercano",
  });
  const [errorArchivo, setErrorArchivo] = useState("");
  const urlsLocales = useRef(new Set());
  const vistaRef = useRef(null);

  useEffect(() => () => {
    urlsLocales.current.forEach((url) => URL.revokeObjectURL(url));
    urlsLocales.current.clear();
  }, []);

  const todasLasZonas = useMemo(() => {
    let disponibles = [];
    try {
      if (typeof Intl.supportedValuesOf === "function") disponibles = Intl.supportedValuesOf("timeZone");
    } catch { /* Intencionalmente vacío. */ }
    const frecuentes = new Set(ZONAS_FRECUENTES.map(([id]) => id));
    return disponibles.filter((id) => !frecuentes.has(id));
  }, []);

  const contenido = contenidos.find((p) => p.id === seleccion) || contenidos[0];
  const indice = contenidos.findIndex((p) => p.id === contenido.id);
  const vistaActual = redes.includes(redVista) ? redVista : redes[0];
  const totalPublicaciones = PLAN.contenidos * redes.length;
  const precio = PLAN.precios[moneda][redes.length];
  const medioPago = moneda === "ARS" ? "Transferencia bancaria" : "PayPal";
  const archivosVista = contenido.archivos;
  const archivoActivo = archivosVista[imagenActiva] || archivosVista[0];
  const contenidosConArchivos = contenidos.filter((p) => p.archivos.length).length;
  const contenidosConIdea = contenidos.filter((p) => p.descripcion.trim()).length;

  function actualizarContenido(id, cambios) {
    setContenidos((anteriores) => anteriores.map((p) => p.id === id ? { ...p, ...cambios } : p));
  }

  function liberarArchivos(archivos) {
    archivos.forEach(({ url }) => {
      URL.revokeObjectURL(url);
      urlsLocales.current.delete(url);
    });
  }

  function cambiarTipo(id, tipo) {
    const siguiente = TIPOS.find((op) => op.id === tipo);
    if (!siguiente || tipo === contenido.tipo) return;
    if (contenido.archivos.length && !window.confirm("Al cambiar el formato se quitarán los archivos de esta vista previa. ¿Querés continuar?")) return;
    liberarArchivos(contenido.archivos);
    actualizarContenido(id, { tipo, formato: siguiente.formatos[0], archivos: [] });
    setImagenActiva(0);
    setErrorArchivo("");
  }

  function alternarRed(red) {
    if (redes.includes(red)) {
      if (redes.length === 1) return;
      const siguientes = redes.filter((r) => r !== red);
      setRedes(siguientes);
      if (redVista === red) setRedVista(siguientes[0]);
    } else {
      setRedes(REDES.filter((r) => r.disponible && (redes.includes(r.id) || r.id === red)).map((r) => r.id));
    }
  }

  function agregarArchivos(evento) {
    const candidatos = Array.from(evento.target.files || []);
    evento.target.value = "";
    if (!candidatos.length) return;

    const maximo = contenido.tipo === "carrusel" ? 10 : 1;
    const topeBytes = contenido.tipo === "reel" ? 150 * 1024 * 1024 : 20 * 1024 * 1024;
    const validos = candidatos.filter((archivo) => archivoCompatible(archivo, contenido.tipo) && archivo.size <= topeBytes);

    if (validos.length !== candidatos.length) {
      setErrorArchivo(contenido.tipo === "reel"
        ? "Seleccioná un video MP4 de hasta 150 MB."
        : "Seleccioná imágenes JPG, PNG o WebP de hasta 20 MB cada una.");
    } else {
      setErrorArchivo("");
    }
    if (!validos.length) return;

    const reemplazar = contenido.tipo !== "carrusel" || contenido.archivos.length >= maximo;
    const existentes = reemplazar ? [] : contenido.archivos;
    const disponibles = maximo - existentes.length;
    if (validos.length > disponibles) setErrorArchivo(`Se permiten hasta ${maximo} archivos por contenido.`);
    const nuevos = validos.slice(0, disponibles).map((archivo) => {
      const url = URL.createObjectURL(archivo);
      urlsLocales.current.add(url);
      return { archivo, url };
    });
    if (!nuevos.length) return;
    if (reemplazar) liberarArchivos(contenido.archivos);
    actualizarContenido(contenido.id, { archivos: [...existentes, ...nuevos] });
    setImagenActiva(0);
  }

  function quitarArchivo(posicion) {
    const eliminado = contenido.archivos[posicion];
    if (!eliminado) return;
    liberarArchivos([eliminado]);
    actualizarContenido(contenido.id, { archivos: contenido.archivos.filter((_, i) => i !== posicion) });
    setImagenActiva(0);
    setErrorArchivo("");
  }

  function descargarConfiguracion() {
    const datos = datosParaDescargar({ redes, contenidos, negocio, moneda, zonaHoraria });
    const url = URL.createObjectURL(new Blob([JSON.stringify(datos, null, 2)], { type: "application/json;charset=utf-8" }));
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "plan-semanal-publicaciones.json";
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const textoVista = contenido.descripcion.trim();
  const nombreVista = negocio.nombre.trim() || "Tu emprendimiento";
  const usuarioVista = nombreVista.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "tu_emprendimiento";

  return (
    <main className="min-h-screen bg-[#FCFDFC] px-4 pb-16 pt-6 font-normal text-slate-900 sm:px-5 sm:pt-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 max-w-3xl border-b border-slate-200 pb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-[#EFF5F3] px-2.5 py-1.5 text-xs font-medium text-[#285861]">
            <CalendarDays size={14} /> Plan semanal de 7 días
          </div>
          <h1 className="text-xl font-medium tracking-tight text-slate-900 sm:text-2xl">Configurá tus publicaciones</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Elegí las redes, prepará tus ideas y definí los días y horarios. Podés revisar las publicaciones antes de contratar. Nosotros nos encargamos de preparar el contenido final y gestionar la programación.
          </p>
        </header>

        <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-10">
          <div className="min-w-0">
            <section className="border-b border-slate-200 pb-6" aria-labelledby="config-plan">
              <div id="config-plan"><TituloSeccion numero="01" titulo="Plan y redes" descripcion="Cuatro contenidos originales durante una semana, de lunes a domingo." /></div>
              <div className="mb-5 grid grid-cols-3 gap-2 rounded-md border border-slate-200 bg-white px-3 py-3 sm:px-4">
                {[[PLAN.contenidos, "Contenidos"], [PLAN.duracionDias, "Días"], [totalPublicaciones, "Publicaciones"]].map(([numero, descripcion]) => (
                  <div key={descripcion} className="text-center">
                    <p className="text-lg font-medium leading-6 text-slate-900">{numero}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{descripcion}</p>
                  </div>
                ))}
              </div>

              <h3 className="mb-2 text-sm font-medium">Elegí dónde querés publicar</h3>
              <div className="grid grid-cols-3 gap-2">
                {REDES.map((red) => {
                  const activa = redes.includes(red.id);
                  return (
                    <button
                      key={red.id}
                      type="button"
                      disabled={!red.disponible}
                      aria-pressed={red.disponible ? activa : undefined}
                      onClick={() => alternarRed(red.id)}
                      className={clases(
                        "relative flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-md border px-2 py-2.5 text-xs font-medium transition",
                        !red.disponible ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : activa ? BOTON_ACTIVO : BOTON_NORMAL
                      )}
                    >
                      {activa && <Check size={13} className="absolute right-2 top-2 text-[#285861]" aria-hidden="true" />}
                      <LogoRed red={red.id} size={24} className={!red.disponible ? "opacity-50" : ""} />
                      <span>{red.nombre}</span>
                      {!red.disponible && <span className="text-[10px] font-normal text-slate-500">Pronto</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Una red incluye 4 publicaciones; las dos redes, 8. Cada contenido se prepara para las redes que elijas.</p>

              <div className="mt-5">
                <Campo titulo="Zona horaria de tus publicaciones" ayuda="Los horarios se respetan en esta zona, aunque sean distintos de la hora de Argentina.">
                  <select id="zona-horaria" aria-label="Zona horaria de tus publicaciones" className={INPUT} value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)}>
                    <optgroup label="Zonas frecuentes">
                      {ZONAS_FRECUENTES.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
                    </optgroup>
                    {todasLasZonas.length > 0 && <optgroup label="Otras zonas horarias">
                      {todasLasZonas.map((id) => <option key={id} value={id}>{id.replaceAll("_", " ")}</option>)}
                    </optgroup>}
                  </select>
                </Campo>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <CalendarDays size={15} className="mt-0.5 shrink-0 text-[#285861]" />
                La semana comienza un lunes. La fecha de inicio se confirma después del pago, la entrega y aprobación del contenido y la conexión de las cuentas. Se toma el lunes siguiente a completar esos pasos.
              </p>
            </section>

            <section className="border-b border-slate-200 py-6" aria-labelledby="config-contenidos">
              <div id="config-contenidos"><TituloSeccion numero="02" titulo="Tus cuatro contenidos" descripcion="Personalizá cada contenido. Podés cambiar el formato, el día y la hora." /></div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Seleccionar contenido">
                {contenidos.map((p, i) => {
                  const Icono = TIPOS.find((t) => t.id === p.tipo)?.icono || FileImage;
                  return (
                    <button
                      key={p.id} type="button" aria-pressed={seleccion === p.id}
                      onClick={() => { setSeleccion(p.id); setImagenActiva(0); setErrorArchivo(""); }}
                      className={clases("flex items-center gap-2 rounded-md border px-3 py-2.5 text-left transition", seleccion === p.id ? BOTON_ACTIVO : BOTON_NORMAL)}
                    >
                      <Icono size={17} className="shrink-0" />
                      <span className="min-w-0"><span className="block text-xs font-medium">Contenido {i + 1}</span><span className="block text-[11px] font-normal capitalize opacity-75">{p.tipo}</span></span>
                      {p.archivos.length > 0 && <CircleCheck size={13} className="ml-auto shrink-0 text-emerald-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3">
                <h3 className="text-sm font-medium">Contenido {indice + 1}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{redes.length} {redes.length === 1 ? "red" : "redes"}</span>
                  <button type="button" onClick={() => vistaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="text-xs font-medium text-[#285861] underline underline-offset-2 lg:hidden">Ver vista previa</button>
                </div>
              </div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Campo titulo="Tipo de publicación">
                  <select aria-label={`Tipo de publicación del contenido ${indice + 1}`} className={INPUT} value={contenido.tipo} onChange={(e) => cambiarTipo(contenido.id, e.target.value)}>
                    {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                    <option value="story" disabled>Stories (pronto)</option>
                  </select>
                </Campo>
                <Campo titulo="Proporción" ayuda={`Tamaño recomendado: ${RESOLUCIONES[contenido.formato]}`}>
                  <select aria-label={`Proporción del contenido ${indice + 1}`} className={INPUT} value={contenido.formato} onChange={(e) => actualizarContenido(contenido.id, { formato: e.target.value })}>
                    {TIPOS.find((t) => t.id === contenido.tipo)?.formatos.map((f) => <option key={f} value={f}>{f}</option>)}
                  </select>
                </Campo>
                <Campo titulo="Día de publicación">
                  <select aria-label={`Día del contenido ${indice + 1}`} className={INPUT} value={contenido.dia} onChange={(e) => actualizarContenido(contenido.id, { dia: e.target.value })}>
                    {DIAS.map((dia) => <option key={dia} value={dia}>{dia}</option>)}
                  </select>
                </Campo>
                <Campo titulo="Hora de publicación">
                  <select aria-label={`Hora del contenido ${indice + 1}`} className={INPUT} value={contenido.hora} onChange={(e) => actualizarContenido(contenido.id, { hora: e.target.value })}>
                    {HORARIOS.map((hora) => <option key={hora} value={hora}>{hora}</option>)}
                  </select>
                </Campo>
              </div>
              <p className="mt-2 text-xs text-slate-500">Los horarios son orientativos hasta confirmar el calendario de la semana.</p>
              {contenidos.some((p) => p.id !== contenido.id && p.dia === contenido.dia && p.hora === contenido.hora) && (
                <p className="mt-2 text-xs text-amber-700" role="status">Otro contenido tiene el mismo día y horario. Podés mantenerlos o elegir horas diferentes.</p>
              )}

              <div className="mt-5">
                <label className="mb-1.5 block text-sm font-medium">
                  {contenido.tipo === "reel" ? "Video del reel" : contenido.tipo === "carrusel" ? "Imágenes del carrusel (2 a 10)" : "Imagen de la publicación"}
                </label>
                <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-4 py-4 text-center transition hover:border-[#285861]">
                  <CloudUpload size={21} className="text-[#285861]" />
                  <span className="text-sm font-medium text-slate-800">
                    {contenido.archivos.length === 0 ? "Seleccionar archivos para la vista previa" : contenido.tipo === "carrusel" && contenido.archivos.length < 10 ? "Agregar imágenes" : "Reemplazar archivos"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {contenido.tipo === "reel" ? "Video MP4 · hasta 150 MB" : "JPG, PNG o WebP · hasta 20 MB por imagen"}
                  </span>
                  <input className="sr-only" type="file" accept={contenido.tipo === "reel" ? "video/mp4,.mp4" : "image/jpeg,image/png,image/webp"} multiple={contenido.tipo === "carrusel"} onChange={agregarArchivos} />
                </label>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">Los archivos se usan solo en esta vista previa. Podrás subir los definitivos después del pago.</p>
                {errorArchivo && <p role="alert" className="mt-2 text-xs text-red-700">{errorArchivo}</p>}
                {!!contenido.archivos.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {contenido.archivos.map(({ archivo, url }, i) => (
                      <span key={url} className="inline-flex max-w-full items-center gap-1 rounded-md bg-slate-100 py-1 pl-2 pr-1 text-xs text-slate-700">
                        <span className="max-w-[145px] truncate">{archivo.name}</span>
                        <button type="button" className="rounded-md p-1 text-slate-500 hover:bg-white hover:text-red-600" onClick={() => quitarArchivo(i)} aria-label={`Quitar ${archivo.name}`}><Trash2 size={14} /></button>
                      </span>
                    ))}
                  </div>
                )}
                {contenido.tipo === "carrusel" && <p className="mt-2 text-xs text-slate-500">{contenido.archivos.length}/10 imágenes seleccionadas. Podés verlas una por una en la vista previa.</p>}
              </div>

              <div className="mt-5 space-y-4">
                <Campo titulo="¿Qué querés comunicar?" ayuda="Contanos tu idea. Nosotros preparamos el texto final y lo enviamos para tu aprobación.">
                  <textarea className={INPUT} rows={3} maxLength={1500} value={contenido.descripcion} onChange={(e) => actualizarContenido(contenido.id, { descripcion: e.target.value })} placeholder="Ej.: Queremos contar cómo elaboramos nuestros productos..." />
                </Campo>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo titulo="¿Qué querés que haga quien lo vea? (opcional)">
                    <input className={INPUT} maxLength={100} list="cta-sugerencias" value={contenido.cta} onChange={(e) => actualizarContenido(contenido.id, { cta: e.target.value })} placeholder="Ej.: Consultanos por WhatsApp" />
                  </Campo>
                  <Campo titulo="Hashtags (opcional)">
                    <input className={INPUT} maxLength={240} value={contenido.hashtags} onChange={(e) => actualizarContenido(contenido.id, { hashtags: e.target.value })} placeholder="#MiNegocio #Comunidad" />
                  </Campo>
                </div>
                <datalist id="cta-sugerencias">
                  <option value="Consultanos por WhatsApp" />
                  <option value="Conocé más" />
                  <option value="Visitá nuestra tienda" />
                  <option value="Dejanos tu opinión" />
                </datalist>
              </div>
            </section>

            <section className="border-b border-slate-200 py-6" aria-labelledby="config-negocio">
              <div id="config-negocio"><TituloSeccion numero="03" titulo="Datos de tu emprendimiento" descripcion="Información para identificar tu negocio y preparar las publicaciones." /></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo titulo="Nombre del emprendimiento">
                  <input className={INPUT} value={negocio.nombre} maxLength={120} onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })} placeholder="Ej.: Panadería del Centro" />
                </Campo>
                <Campo titulo="Rubro">
                  <input className={INPUT} value={negocio.rubro} maxLength={100} onChange={(e) => setNegocio({ ...negocio, rubro: e.target.value })} placeholder="Ej.: Gastronomía" />
                </Campo>
                <Campo titulo="Nombre de contacto">
                  <input className={INPUT} autoComplete="name" maxLength={120} value={negocio.contacto} onChange={(e) => setNegocio({ ...negocio, contacto: e.target.value })} placeholder="Nombre y apellido" />
                </Campo>
                <Campo titulo="Correo electrónico">
                  <input className={INPUT} type="email" autoComplete="email" maxLength={160} value={negocio.email} onChange={(e) => setNegocio({ ...negocio, email: e.target.value })} placeholder="correo@negocio.com" />
                </Campo>
                <Campo titulo="Web o enlace principal (opcional)">
                  <input className={INPUT} type="url" maxLength={300} value={negocio.url} onChange={(e) => setNegocio({ ...negocio, url: e.target.value })} placeholder="https://..." />
                </Campo>
                <Campo titulo="WhatsApp (opcional)">
                  <input className={INPUT} type="tel" autoComplete="tel" maxLength={50} value={negocio.whatsapp} onChange={(e) => setNegocio({ ...negocio, whatsapp: e.target.value })} placeholder="+54 ..." />
                </Campo>
                <Campo titulo="¿A quién se dirige tu contenido? (opcional)">
                  <input className={INPUT} maxLength={180} value={negocio.publico} onChange={(e) => setNegocio({ ...negocio, publico: e.target.value })} placeholder="Ej.: Familias de mi ciudad" />
                </Campo>
                <Campo titulo="Estilo de comunicación">
                  <select className={INPUT} value={negocio.tono} onChange={(e) => setNegocio({ ...negocio, tono: e.target.value })}>
                    <option value="cercano">Cercano</option>
                    <option value="profesional">Profesional</option>
                    <option value="informal">Informal</option>
                    <option value="promocional">Promocional</option>
                  </select>
                </Campo>
              </div>
              <div className="mt-5 flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#285861]" />
                <div>
                  <p className="text-sm font-medium">Conexión segura después del pago</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Para publicar en Instagram necesitás una cuenta profesional compatible; para Facebook, una página que puedas administrar. La autorización se realizará desde Meta, sin pedirte contraseñas.</p>
                  <div className="mt-2 flex items-center gap-3" aria-label="Redes compatibles para conectar">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><LogoRed red="instagram" size={18} /> Instagram</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><LogoRed red="facebook" size={18} /> Facebook</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="py-6" aria-labelledby="config-pago">
              <div id="config-pago"><TituloSeccion numero="04" titulo="Moneda y pago" descripcion="Revisá el importe correspondiente a las redes seleccionadas." /></div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Elegir moneda">
                {["ARS", "USD"].map((m) => (
                  <button key={m} type="button" aria-pressed={moneda === m} onClick={() => setMoneda(m)}
                    className={clases("rounded-md border px-3 py-2.5 text-sm font-medium transition", moneda === m ? BOTON_ACTIVO : BOTON_NORMAL)}>
                    {m === "ARS" ? "Pesos · ARS" : "Dólares · USD"}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                {moneda === "ARS" ? <Wallet size={18} className="text-[#285861]" /> : <CreditCard size={18} className="text-[#285861]" />}
                <span>{medioPago}</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                {moneda === "ARS"
                  ? "Después de transferir, podrás enviar el comprobante. El servicio se activa una vez verificado el pago y aprobados los contenidos."
                  : "El pago se realizará mediante PayPal. La activación requiere la confirmación del pago y la aprobación del contenido."}
              </p>
              <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
                <div><p className="text-sm text-slate-600">Total por semana</p><p className="mt-0.5 text-xs text-slate-500">{redes.length} {redes.length === 1 ? "red" : "redes"} · {totalPublicaciones} publicaciones</p></div>
                <p className="text-xl font-medium text-slate-900">{precioFormateado(precio, moneda)}</p>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled aria-disabled="true" className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-md bg-slate-300 px-3 py-3 text-sm font-medium text-white">
                  <LockKeyhole size={16} /> Contratación próximamente
                </button>
                <button type="button" onClick={descargarConfiguracion} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
                  <Download size={16} /> Guardar configuración
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Podés revisar todos tus contenidos sin pagar. El importe se confirmará al contratar.</p>
            </section>
          </div>

          <aside ref={vistaRef} className="min-w-0 scroll-mt-20 lg:sticky lg:top-24" aria-label="Vista previa de publicaciones">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-base font-medium">Vista previa</h2>
              <span className="text-xs text-slate-500">Contenido {indice + 1} de 4</span>
            </div>
            <div className="mb-3 grid grid-cols-4 gap-2 lg:hidden" role="group" aria-label="Ver cada contenido">
              {contenidos.map((p, i) => (
                <button key={p.id} type="button" aria-pressed={seleccion === p.id}
                  onClick={() => { setSeleccion(p.id); setImagenActiva(0); setErrorArchivo(""); }}
                  className={clases("rounded-md border py-2 text-xs font-medium", seleccion === p.id ? BOTON_ACTIVO : BOTON_NORMAL)}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="mb-3 flex items-center gap-2" role="group" aria-label="Ver publicación por red">
              {redes.map((red) => (
                <button key={red} type="button" onClick={() => setRedVista(red)} aria-pressed={vistaActual === red}
                  className={clases("inline-flex flex-1 items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-medium transition", vistaActual === red ? BOTON_ACTIVO : BOTON_NORMAL)}>
                  <LogoRed red={red} size={19} /> {red === "instagram" ? "Instagram" : "Facebook"}
                </button>
              ))}
            </div>

            <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
              <div className="flex items-center gap-2 px-3 py-3">
                <LogoRed red={vistaActual} size={27} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-900">{vistaActual === "instagram" ? usuarioVista : nombreVista}</p>
                  <p className="text-[11px] text-slate-500">{vistaActual === "instagram" ? "Publicación de Instagram" : "Página de Facebook · Público"}</p>
                </div>
                <MoreHorizontal size={19} className="text-slate-500" />
              </div>

              <div className="bg-slate-50 px-3 py-2">
                <div className={clases("relative mx-auto overflow-hidden rounded-md bg-slate-100", contenido.formato === "9:16" ? "w-full max-w-[225px]" : "w-full max-w-[300px]")}
                  style={{ aspectRatio: contenido.formato.replace(":", " / ") }}>
                  {archivoActivo ? (
                    contenido.tipo === "reel"
                      ? <video key={archivoActivo.url} src={archivoActivo.url} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label="Vista previa del video" />
                      : <img src={archivoActivo.url} alt={`Imagen ${imagenActiva + 1} de la publicación`} className="h-full w-full object-contain" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-400">
                      <FileImage size={28} strokeWidth={1.5} />
                      <p className="text-xs leading-5">Elegí {contenido.tipo === "reel" ? "un video" : "imágenes"} para ver tu publicación</p>
                    </div>
                  )}
                  {contenido.tipo === "carrusel" && archivosVista.length > 1 && (
                    <>
                      <button type="button" onClick={() => setImagenActiva((i) => (i - 1 + archivosVista.length) % archivosVista.length)} aria-label="Imagen anterior"
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1.5 text-slate-800"><ChevronLeft size={16} /></button>
                      <button type="button" onClick={() => setImagenActiva((i) => (i + 1) % archivosVista.length)} aria-label="Imagen siguiente"
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1.5 text-slate-800"><ChevronRight size={16} /></button>
                      <div className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-2 py-1 text-[10px] text-white">{imagenActiva + 1}/{archivosVista.length}</div>
                    </>
                  )}
                </div>
              </div>

              {vistaActual === "instagram" ? (
                <div className="flex items-center gap-3 px-3 pt-3 text-slate-800" aria-label="Acciones orientativas de Instagram">
                  <Heart size={19} /><MessageCircle size={19} /><Send size={19} />
                </div>
              ) : (
                <div className="flex items-center justify-around border-b border-slate-100 px-3 py-2 text-xs text-slate-500" aria-label="Acciones orientativas de Facebook">
                  <span className="inline-flex items-center gap-1"><ThumbsUp size={15} /> Me gusta</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle size={15} /> Comentar</span>
                  <span className="inline-flex items-center gap-1"><Send size={15} /> Compartir</span>
                </div>
              )}
              <div className="px-3 py-3">
                <p className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">
                  {textoVista || "Acá vas a ver la idea de tu publicación."}
                </p>
                {contenido.cta.trim() && <p className="mt-2 text-sm font-medium text-slate-800">{contenido.cta}</p>}
                {contenido.hashtags.trim() && <p className="mt-2 break-words text-sm text-[#285861]">{contenido.hashtags}</p>}
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Simulación orientativa: la apariencia final puede variar según la red social.</p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-medium">Resumen semanal</h3>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-600">Redes seleccionadas</span><span className="text-right font-medium">{redes.map((red) => red === "instagram" ? "Instagram" : "Facebook").join(" · ")}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Publicaciones</span><span className="font-medium">{totalPublicaciones}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Contenidos con archivos</span><span className="font-medium">{contenidosConArchivos}/4</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Contenidos con ideas</span><span className="font-medium">{contenidosConIdea}/4</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Semana de trabajo</span><span className="font-medium">Lunes a domingo</span></div>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-3">
                <span className="text-sm text-slate-600">Total semanal</span>
                <span className="text-lg font-medium">{precioFormateado(precio, moneda)}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Los materiales deben estar listos para publicar. La producción y edición profesional de fotos o videos se presupuestan por separado.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
