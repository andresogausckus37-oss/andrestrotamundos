import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  ClipboardList,
  CreditCard,
  Download,
  FileImage,
  Film,
  Images,
  Camera,
  LockKeyhole,
  MessageCircle,
  MonitorPlay,
  ShieldCheck,
  Trash2,
  CloudUpload,
  Wallet,
} from "lucide-react";

// Primera etapa: configurador y vistas previas. No recibe pagos ni publica.
// Los precios son propuestas y deberán validarse SIEMPRE desde el backend.
const PLAN = {
  id: "comunidad-semanal",
  nombre: "Comunidad Semanal",
  contenidos: 4,
  duracionDias: 7,
  precioARS: 59000,
  precioUSD: 59,
};

const TIPOS = [
  { id: "reel", nombre: "Reel", icono: Film, formatos: ["9:16"] },
  { id: "carrusel", nombre: "Carrusel", icono: Images, formatos: ["4:5", "1:1"] },
  { id: "imagen", nombre: "Imagen", icono: FileImage, formatos: ["4:5", "1:1"] },
];
const DIAS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
const HORARIOS = ["09:00", "10:00", "12:00", "14:00", "17:00", "18:00", "19:00", "20:00", "21:00"];
const ZONAS = [
  ["America/Argentina/Buenos_Aires", "Argentina (Buenos Aires)"],
  ["America/Bogota", "Colombia (Bogotá)"],
  ["America/Mexico_City", "México (Ciudad de México)"],
  ["America/Santiago", "Chile (Santiago)"],
  ["America/Lima", "Perú (Lima)"],
  ["America/New_York", "Estados Unidos (Nueva York)"],
  ["Europe/Madrid", "España (Madrid)"],
];
const CONFIGURACION_INICIAL = [
  ["reel", "Lunes", "18:00"],
  ["carrusel", "Miércoles", "18:00"],
  ["imagen", "Viernes", "18:00"],
  ["reel", "Domingo", "18:00"],
];
const PRECIO_FORMATOS = { "9:16": "1080 × 1920", "4:5": "1080 × 1350", "1:1": "1080 × 1080" };

function crearPiezas() {
  return CONFIGURACION_INICIAL.map(([tipo, dia, hora], indice) => ({
    id: `contenido-${indice + 1}`,
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

function clase(...valores) { return valores.filter(Boolean).join(" "); }
function formatoDinero(valor, moneda) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: moneda, maximumFractionDigits: 0,
  }).format(valor);
}
function extensionCorrecta(archivo, tipo) {
  if (tipo === "reel") return archivo.type === "video/mp4" || /\.mp4$/i.test(archivo.name);
  return ["image/jpeg", "image/png", "image/webp"].includes(archivo.type);
}
function datosExportables({ redes, piezas, negocio, moneda, zonaHoraria }) {
  return {
    version: 1,
    planId: PLAN.id,
    objetivo: "comunidad",
    redes,
    moneda,
    zonaHoraria,
    negocio,
    precioMostrado: { monto: moneda === "ARS" ? PLAN.precioARS : PLAN.precioUSD, moneda, referencial: true },
    publicaciones: piezas.map(({ archivos, ...pieza }) => ({
      ...pieza,
      archivosSeleccionados: archivos.map(({ archivo }) => ({ nombre: archivo.name, tipo: archivo.type, tamano: archivo.size })),
    })),
    aviso: "Los archivos no están subidos al servidor. El precio y la orden requieren validación del backend.",
  };
}

function Campo({ titulo, children, ayuda }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{titulo}</span>
      {children}
      {ayuda && <span className="mt-1 block text-xs text-slate-500">{ayuda}</span>}
    </label>
  );
}

const inputClase = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

export default function ConfiguradorPublicaciones() {
  const [redes, setRedes] = useState(["instagram", "facebook"]);
  const [piezas, setPiezas] = useState(crearPiezas);
  const [seleccion, setSeleccion] = useState("contenido-1");
  const [diapositiva, setDiapositiva] = useState(0);
  const [moneda, setMoneda] = useState("ARS");
  const [zonaHoraria, setZonaHoraria] = useState("America/Argentina/Buenos_Aires");
  const [negocio, setNegocio] = useState({ nombre: "", rubro: "", contacto: "", email: "", url: "", whatsapp: "" });
  const [errorArchivo, setErrorArchivo] = useState("");
  const urlsTemporales = useRef(new Set());

  useEffect(() => () => {
    urlsTemporales.current.forEach((url) => URL.revokeObjectURL(url));
    urlsTemporales.current.clear();
  }, []);

  const pieza = piezas.find((p) => p.id === seleccion) || piezas[0];
  const indice = piezas.findIndex((p) => p.id === pieza.id);
  const totalPublicaciones = PLAN.contenidos * redes.length;
  const precio = moneda === "ARS" ? PLAN.precioARS : PLAN.precioUSD;
  const seleccionados = pieza.archivos;
  const archivoActivo = seleccionados[diapositiva] || seleccionados[0];
  const archivosRequeridos = piezas.every((p) => p.tipo === "carrusel" ? p.archivos.length >= 2 : p.archivos.length >= 1);
  const textos = useMemo(() => ({
    redactados: piezas.filter((p) => p.descripcion.trim()).length,
    archivos: piezas.filter((p) => p.archivos.length > 0).length,
  }), [piezas]);

  function actualizarPieza(id, cambios) {
    setPiezas((anteriores) => anteriores.map((p) => p.id === id ? { ...p, ...cambios } : p));
  }

  function cambiarTipo(id, tipo) {
    const definicion = TIPOS.find((op) => op.id === tipo);
    if (!definicion) return;
    actualizarPieza(id, { tipo, formato: definicion.formatos[0], archivos: [] });
    setDiapositiva(0);
    setErrorArchivo("");
  }

  function alternarRed(red) {
    setRedes((anteriores) => anteriores.includes(red)
      ? (anteriores.length === 1 ? anteriores : anteriores.filter((r) => r !== red))
      : [...anteriores, red]);
  }

  function agregarArchivos(evento) {
    const candidatos = Array.from(evento.target.files || []);
    evento.target.value = "";
    const maximo = pieza.tipo === "carrusel" ? 10 : 1;
    const validos = candidatos.filter((archivo) => extensionCorrecta(archivo, pieza.tipo) && archivo.size <= 150 * 1024 * 1024);
    if (validos.length !== candidatos.length) {
      setErrorArchivo(pieza.tipo === "reel" ? "Usá un MP4 de hasta 150 MB." : "Usá JPG, PNG o WebP de hasta 150 MB por archivo.");
    } else { setErrorArchivo(""); }
    if (!validos.length) return;
    const lugares = Math.max(0, maximo - pieza.archivos.length);
    if (lugares === 0) { setErrorArchivo("Alcanzaste el máximo de archivos para esta publicación."); return; }
    if (validos.length > lugares) setErrorArchivo(`Solo se permiten ${maximo} archivo${maximo > 1 ? "s" : ""} en este formato.`);
    const nuevos = validos.slice(0, lugares).map((archivo) => {
      const url = URL.createObjectURL(archivo);
      urlsTemporales.current.add(url);
      return { archivo, url };
    });
    actualizarPieza(pieza.id, { archivos: [...pieza.archivos, ...nuevos] });
    setDiapositiva(0);
  }

  function quitarArchivo(posicion) {
    const nuevos = pieza.archivos.filter((_, i) => i !== posicion);
    actualizarPieza(pieza.id, { archivos: nuevos });
    setDiapositiva(0);
  }

  function exportar() {
    const datos = datosExportables({ redes, piezas, negocio, moneda, zonaHoraria });
    const blob = new Blob([JSON.stringify(datos, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement("a");
    enlace.href = url;
    enlace.download = "configuracion-publicaciones-semanal.json";
    enlace.click();
    URL.revokeObjectURL(url);
  }

  const botonRed = (id, nombre, Icono) => (
    <button key={id} type="button" onClick={() => alternarRed(id)} aria-pressed={redes.includes(id)}
      className={clase("flex items-center gap-2 rounded-xl border px-4 py-3 text-sm transition", redes.includes(id)
        ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300")}
    >
      <Icono size={18}/><span>{nombre}</span>{redes.includes(id) && <Check size={16}/>}
    </button>
  );

  return (
    <main className="min-h-screen bg-slate-50 pb-16 text-slate-900">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-orange-100 px-3 py-1 text-xs font-semibold text-orange-800">
            <CalendarDays size={14}/> Plan de prueba de 7 días
          </div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Configurá tus publicaciones automáticas</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
            Prepará cuatro contenidos originales para Instagram y Facebook, revisá cómo se verán y elegí tus horarios. El material lo aportás vos; la programación la gestionamos nosotros.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_370px] lg:items-start">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="titulo-plan">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700"><ClipboardList size={22}/></div>
                <div><h2 id="titulo-plan" className="text-lg font-semibold">1. Plan y redes</h2><p className="text-xs text-slate-500">Objetivo preestablecido: construir comunidad</p></div>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-semibold">4</div><div className="text-xs text-slate-500">contenidos originales</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-semibold">7</div><div className="text-xs text-slate-500">días de servicio</div></div>
                <div className="rounded-xl bg-slate-50 p-3"><div className="text-2xl font-semibold">{totalPublicaciones}</div><div className="text-xs text-slate-500">publicaciones totales</div></div>
              </div>
              <div className="mt-5 space-y-2"><h3 className="text-sm font-medium">Elegí dónde querés publicar</h3>
                <div className="flex flex-wrap gap-2">
                  {botonRed("instagram", "Instagram", Camera)}
                  {botonRed("facebook", "Facebook Page", MessageCircle)}
                </div>
                <p className="text-xs text-slate-500">Cada contenido se adapta a las redes seleccionadas. Con una red: 4 publicaciones; con dos: 8.</p>
              </div>
              <Campo titulo="Zona horaria del calendario" ayuda="Los horarios se interpretan según la zona elegida, no necesariamente la del administrador.">
                <select className={inputClase} value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)}>
                  {ZONAS.map(([valor, etiqueta]) => <option value={valor} key={valor}>{etiqueta}</option>)}
                </select>
              </Campo>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="titulo-piezas">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700"><Images size={22}/></div>
                <div><h2 id="titulo-piezas" className="text-lg font-semibold">2. Tus cuatro contenidos</h2><p className="text-xs text-slate-500">Reel, carrusel o imagen: podés modificar cada uno.</p></div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {piezas.map((p, i) => {
                  const Icono = TIPOS.find((op) => op.id === p.tipo)?.icono || FileImage;
                  return <button type="button" key={p.id} onClick={() => {setSeleccion(p.id); setDiapositiva(0); setErrorArchivo("");}}
                    className={clase("rounded-xl border p-3 text-left transition", seleccion === p.id ? "border-orange-500 bg-orange-50" : "border-slate-200 hover:bg-slate-50")}>
                    <div className="mb-2 flex items-center justify-between"><Icono size={19}/>{p.archivos.length > 0 && <CircleCheck size={15} className="text-emerald-600"/>}</div>
                    <div className="text-sm font-semibold">Pieza {i + 1}</div>
                    <div className="text-xs capitalize text-slate-500">{p.tipo}</div>
                  </button>;
                })}
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 p-4 sm:p-5">
                <div className="mb-4 flex items-center justify-between gap-2"><h3 className="font-semibold">Contenido {indice + 1}</h3><span className="text-xs text-slate-500">Se adaptará a {redes.length} red{redes.length > 1 ? "es" : ""}</span></div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo titulo="Tipo de publicación">
                    <select className={inputClase} value={pieza.tipo} onChange={(e) => cambiarTipo(pieza.id, e.target.value)}>
                      {TIPOS.map(({id,nombre}) => <option key={id} value={id}>{nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo titulo="Proporción" ayuda={`Referencia: ${PRECIO_FORMATOS[pieza.formato]}`}>
                    <select className={inputClase} value={pieza.formato} onChange={(e) => actualizarPieza(pieza.id,{formato:e.target.value})}>
                      {TIPOS.find((op) => op.id === pieza.tipo).formatos.map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </Campo>
                  <Campo titulo="Día de publicación"><select className={inputClase} value={pieza.dia} onChange={(e)=>actualizarPieza(pieza.id,{dia:e.target.value})}>{DIAS.map((d)=><option key={d}>{d}</option>)}</select></Campo>
                  <Campo titulo="Hora de publicación"><select className={inputClase} value={pieza.hora} onChange={(e)=>actualizarPieza(pieza.id,{hora:e.target.value})}>{HORARIOS.map((h)=><option key={h}>{h}</option>)}</select></Campo>
                </div>

                <div className="mt-5">
                  <h4 className="mb-2 text-sm font-medium">{pieza.tipo === "reel" ? "Video MP4" : pieza.tipo === "carrusel" ? "Imágenes del carrusel (2 a 10)" : "Imagen de la publicación"}</h4>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-orange-400 hover:bg-orange-50">
                    <CloudUpload className="text-slate-500" size={24}/>
                    <span className="text-sm font-medium">{pieza.archivos.length ? "Agregar o reemplazar archivos" : "Seleccionar archivos para vista previa"}</span>
                    <span className="text-xs text-slate-500">{pieza.tipo === "reel" ? "MP4 vertical 9:16" : "JPG, PNG o WebP"} · Vista previa local, sin subir al servidor</span>
                    <input className="sr-only" type="file" accept={pieza.tipo === "reel" ? "video/mp4,.mp4" : "image/jpeg,image/png,image/webp"}
                      multiple={pieza.tipo === "carrusel"} onChange={agregarArchivos}/>
                  </label>
                  {errorArchivo && <p className="mt-2 text-xs text-red-600" role="alert">{errorArchivo}</p>}
                  {!!pieza.archivos.length && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {pieza.archivos.map(({ archivo }, i) => <div className="flex max-w-full items-center gap-1 rounded-lg bg-slate-100 px-2 py-1.5 text-xs" key={`${archivo.name}-${i}`}>
                        <span className="max-w-40 truncate">{archivo.name}</span>
                        <button type="button" className="rounded p-1 text-slate-500 hover:bg-white hover:text-red-600" onClick={() => quitarArchivo(i)} aria-label={`Quitar archivo ${i + 1}`}><Trash2 size={14}/></button>
                      </div>)}
                    </div>
                  )}
                  {pieza.tipo === "carrusel" && <p className="mt-2 text-xs text-slate-500">{pieza.archivos.length}/10 imágenes. El máximo es por publicación, no por semana; el cliente aporta las imágenes listas.</p>}
                </div>

                <div className="mt-5 space-y-4">
                  <Campo titulo="Idea principal o copy sugerido" ayuda="Opcional. El texto definitivo se preparará y se mostrará para aprobación antes de programar.">
                    <textarea rows={3} maxLength={1500} className={inputClase} value={pieza.descripcion} onChange={(e)=>actualizarPieza(pieza.id,{descripcion:e.target.value})} placeholder="Ej.: Invitá a la comunidad a conocer cómo trabajamos..."/>
                  </Campo>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo titulo="CTA (opcional)"><input maxLength={100} className={inputClase} value={pieza.cta} onChange={(e)=>actualizarPieza(pieza.id,{cta:e.target.value})} placeholder="Ej.: Conocé más"/></Campo>
                    <Campo titulo="Hashtags (opcional)"><input maxLength={240} className={inputClase} value={pieza.hashtags} onChange={(e)=>actualizarPieza(pieza.id,{hashtags:e.target.value})} placeholder="#MiNegocio #Comunidad"/></Campo>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="titulo-negocio">
              <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-orange-100 p-2.5 text-orange-700"><ShieldCheck size={22}/></div><div><h2 id="titulo-negocio" className="text-lg font-semibold">3. Datos de tu emprendimiento</h2><p className="text-xs text-slate-500">Solo para preparar la contratación y los copies.</p></div></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo titulo="Nombre del emprendimiento"><input className={inputClase} value={negocio.nombre} onChange={(e)=>setNegocio({...negocio,nombre:e.target.value})} placeholder="Ej.: Panadería del Centro"/></Campo>
                <Campo titulo="Rubro"><input className={inputClase} value={negocio.rubro} onChange={(e)=>setNegocio({...negocio,rubro:e.target.value})} placeholder="Ej.: Gastronomía"/></Campo>
                <Campo titulo="Nombre de contacto"><input className={inputClase} autoComplete="name" value={negocio.contacto} onChange={(e)=>setNegocio({...negocio,contacto:e.target.value})} placeholder="Nombre y apellido"/></Campo>
                <Campo titulo="Correo electrónico"><input className={inputClase} type="email" autoComplete="email" value={negocio.email} onChange={(e)=>setNegocio({...negocio,email:e.target.value})} placeholder="correo@negocio.com"/></Campo>
                <Campo titulo="Web o enlace principal (opcional)"><input className={inputClase} type="url" value={negocio.url} onChange={(e)=>setNegocio({...negocio,url:e.target.value})} placeholder="https://..."/></Campo>
                <Campo titulo="WhatsApp de contacto (opcional)"><input className={inputClase} type="tel" value={negocio.whatsapp} onChange={(e)=>setNegocio({...negocio,whatsapp:e.target.value})} placeholder="+54 ..."/></Campo>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-500"><LockKeyhole className="mt-0.5 shrink-0" size={15}/> La conexión a Instagram y Facebook se hará después del pago, con autorización oficial de Meta. Nunca pediremos contraseñas.</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-labelledby="titulo-pagos">
              <div className="mb-5 flex items-center gap-3"><div className="rounded-xl bg-orange-100 p-2.5 text-orange-700"><Wallet size={22}/></div><div><h2 id="titulo-pagos" className="text-lg font-semibold">4. Moneda y medio de pago</h2><p className="text-xs text-slate-500">La orden y el cobro estarán disponibles al conectar el backend.</p></div></div>
              <div className="flex gap-2" role="group" aria-label="Elegir moneda">
                {["ARS", "USD"].map((m)=><button key={m} type="button" aria-pressed={moneda===m} onClick={()=>setMoneda(m)} className={clase("flex-1 rounded-xl border px-4 py-3 text-sm font-medium",moneda===m?"border-orange-500 bg-orange-50 text-orange-800":"border-slate-200 text-slate-600")}>{m === "ARS" ? "Pesos argentinos (ARS)" : "Dólares (USD)"}</button>)}
              </div>
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-medium">{moneda === "ARS" ? <Wallet size={20}/> : <CreditCard size={20}/>} {moneda === "ARS" ? "Transferencia bancaria" : "PayPal Checkout"}</div>
                <p className="mt-2 text-sm text-slate-600">{moneda === "ARS" ? "Transferís, enviás el comprobante y verificamos el pago desde Administración." : "Pagás en USD con PayPal; el backend deberá confirmar la captura del pago antes de activar el servicio."}</p>
                {moneda === "ARS" && <div className="mt-3 rounded-lg border border-orange-200 bg-orange-50 p-3 text-xs text-orange-900">Estados previstos: comprobante recibido → verificando pago → pago confirmado → habilitación del servicio.</div>}
              </div>
              <div className="mt-4 flex items-center justify-between"><span className="text-sm text-slate-600">Plan semanal (precio propuesto)</span><span className="text-xl font-semibold">{formatoDinero(precio,moneda)}</span></div>
              <p className="mt-2 text-xs leading-5 text-slate-500">No es un tipo de cambio entre ARS y USD: son dos precios fijos de prueba. Deben aprobarse y validarse en el servidor antes de cobrar. Esta etapa no crea pedidos, no recoge comprobantes ni ejecuta PayPal.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-2">
                <button type="button" disabled className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-300 px-4 py-3 text-sm font-semibold text-white" title="Pendiente: API de pedidos de servicios y verificación de pagos"><LockKeyhole size={17}/> Contratar y pagar</button>
                <button type="button" onClick={exportar} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold hover:bg-slate-50"><Download size={17}/> Descargar configuración</button>
              </div>
              <p className="mt-2 text-xs text-slate-500">Podés probar el configurador y descargar tus elecciones. El botón de pago se habilitará cuando se conecten los endpoints existentes y se validen las reglas comerciales.</p>
            </section>
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24" aria-label="Vista previa de la publicación">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3"><div className="flex items-center gap-2 text-sm font-semibold"><MonitorPlay size={17}/> Vista previa</div><span className="text-xs text-slate-500">Contenido {indice + 1} de 4</span></div>
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2"><div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-800"><Camera size={18}/></div><div><div className="text-sm font-semibold">{negocio.nombre.trim() || "Tu emprendimiento"}</div><div className="text-xs text-slate-500">{redes.join(" · ")} · {pieza.tipo}</div></div></div>
                <div className="relative mx-auto max-w-[290px] overflow-hidden rounded-xl bg-slate-100" style={{ aspectRatio: pieza.formato.replace(":", "/") }}>
                  {archivoActivo ? pieza.tipo === "reel"
                    ? <video key={archivoActivo.url} src={archivoActivo.url} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label="Vista previa del video"/>
                    : <img src={archivoActivo.url} alt={`Vista previa de imagen ${diapositiva + 1}`} className="h-full w-full object-contain"/>
                    : <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-5 text-center text-slate-400"><FileImage size={38}/><p className="text-sm">Seleccioná {pieza.tipo === "reel" ? "un video" : "imágenes"} para ver el resultado</p></div>}
                  {pieza.tipo === "carrusel" && seleccionados.length > 1 && <>
                    <button type="button" onClick={()=>setDiapositiva((i)=>(i-1+seleccionados.length)%seleccionados.length)} className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow" aria-label="Imagen anterior"><ChevronLeft size={17}/></button>
                    <button type="button" onClick={()=>setDiapositiva((i)=>(i+1)%seleccionados.length)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow" aria-label="Imagen siguiente"><ChevronRight size={17}/></button>
                    <div className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">{diapositiva + 1}/{seleccionados.length}</div>
                  </>}
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500"><span>{pieza.formato} · {PRECIO_FORMATOS[pieza.formato]}</span><span>{pieza.dia} · {pieza.hora}</span></div>
                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                  {pieza.descripcion.trim() || "Acá aparecerá la descripción del contenido para revisar antes de aprobarlo."}
                  {pieza.cta.trim() && <p className="mt-2 font-medium">{pieza.cta}</p>}
                  {pieza.hashtags.trim() && <p className="mt-2 text-blue-700">{pieza.hashtags}</p>}
                </div>
                {negocio.url.trim() && <p className="mt-2 break-all text-xs text-blue-700">{negocio.url}</p>}
                <p className="mt-4 rounded-lg bg-slate-50 p-2 text-xs leading-5 text-slate-500">Vista previa orientativa. Las plataformas pueden ajustar encuadres, texto y enlaces. Los archivos aún no se subieron.</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="font-semibold">Resumen de la semana</h3>
              <div className="mt-3 space-y-3 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Publicaciones previstas</span><strong>{totalPublicaciones}</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Piezas con archivos</span><strong>{textos.archivos}/4</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Piezas con idea o copy</span><strong>{textos.redactados}/4</strong></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Material completo</span><strong>{archivosRequeridos ? "Sí" : "Pendiente"}</strong></div>
              </div>
              <div className="mt-4 border-t border-slate-200 pt-4"><div className="text-xs text-slate-500">Total semanal propuesto</div><div className="mt-1 text-2xl font-semibold">{formatoDinero(precio,moneda)}</div></div>
              <p className="mt-3 flex gap-2 text-xs leading-5 text-slate-500"><CircleHelp size={15} className="mt-0.5 shrink-0"/> Un carrusel de 2 a 10 imágenes cuenta como un contenido original, siempre que aportes las imágenes. La creación o edición profesional se cotizará por separado.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
