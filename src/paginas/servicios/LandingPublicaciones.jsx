import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight,
  Clock3, CloudUpload, FileImage, Film, Heart, Images,
  LockKeyhole, MessageCircle, MoreHorizontal, Send, ShieldCheck,
  Sparkles, Trash2, UserRound, UserRoundPlus, X,
} from "lucide-react";

const RUTA_BASE = "/servicios/publicacion-automatica";
const RUTA_CONFIGURADOR = `${RUTA_BASE}/configurar`;
const ENTRADA = "w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const TARJETA = "rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
const TIPOS = {
  imagen: { nombre: "Imagen", icono: FileImage, formatos: ["4:5", "1:1"] },
  carrusel: { nombre: "Carrusel", icono: Images, formatos: ["4:5", "1:1"] },
  reel: { nombre: "Reel", icono: Film, formatos: ["9:16"] },
};

function crearDemostracion() {
  return Array.from({ length: 4 }, (_, indice) => ({
    id: `contenido-${indice + 1}`,
    tipo: indice === 0 || indice === 3 ? "reel" : indice === 1 ? "carrusel" : "imagen",
    formato: indice === 0 || indice === 3 ? "9:16" : "4:5",
    copy: "",
    ctaInstagram: "",
    ctaFacebook: "",
    urlFacebook: "",
    hashtags: "",
    archivos: [],
  }));
}

function IconoRed({ red }) {
  if (red === "instagram") {
    return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600 text-white"><span className="text-sm font-bold">◎</span></span>;
  }
  return <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2] text-lg font-bold text-white">f</span>;
}

function Campo({ etiqueta, children, nota }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{etiqueta}</span>
      {children}
      {nota && <span className="mt-1 block text-xs leading-5 text-slate-500">{nota}</span>}
    </label>
  );
}

export default function LandingPublicaciones() {
  const location = useLocation();
  const navigate = useNavigate();
  const [redes, setRedes] = useState(["instagram", "facebook"]);
  const [vistaRed, setVistaRed] = useState("instagram");
  const [contenidos, setContenidos] = useState(crearDemostracion);
  const [seleccion, setSeleccion] = useState(0);
  const [imagenActual, setImagenActual] = useState(0);
  const [negocio, setNegocio] = useState("");
  const [mensajeArchivo, setMensajeArchivo] = useState("");
  const [modalRegistro, setModalRegistro] = useState(false);
  const [precios, setPrecios] = useState(null);
  const urlsTemporales = useRef(new Set());

  // Solo consulta el precio oficial del plan. No envía ninguna configuración.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/servicios/publicaciones/plan", { signal: controller.signal, cache: "no-store" })
      .then((r) => r.ok ? r.json() : null)
      .then((datos) => {
        if (datos?.ok && Number.isFinite(datos?.precios?.ARS?.[1]) && Number.isFinite(datos?.precios?.ARS?.[2])) {
          setPrecios(datos.precios.ARS);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // No se guarda nada en sessionStorage, localStorage, MongoDB ni R2.
  // Todas las URL blob: se revocan al abandonar la demostración.
  useEffect(() => () => {
    for (const url of urlsTemporales.current) URL.revokeObjectURL(url);
    urlsTemporales.current.clear();
  }, []);

  // Los enlaces privados anteriores usaban la landing como ruta.
  // Se conservan y abren el configurador real con el fragmento intacto.
  if (location.hash.startsWith("#pedido=")) {
    return <Navigate replace to={{ pathname: RUTA_CONFIGURADOR, hash: location.hash }} />;
  }

  const contenido = contenidos[seleccion];
  const redVisible = redes.includes(vistaRed) ? vistaRed : redes[0];
  const media = contenido.archivos[imagenActual] || contenido.archivos[0];
  const nombreVisible = negocio.trim() || "Tu emprendimiento";
  const usuarioVisible = nombreVisible.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "tu_emprendimiento";

  function actualizarContenido(cambios) {
    setContenidos((actuales) => actuales.map((item, i) => i === seleccion ? { ...item, ...cambios } : item));
  }

  function revocar(archivos) {
    archivos.forEach(({ url }) => {
      URL.revokeObjectURL(url);
      urlsTemporales.current.delete(url);
    });
  }

  function cambiarTipo(tipo) {
    if (tipo === contenido.tipo) return;
    revocar(contenido.archivos);
    actualizarContenido({ tipo, formato: TIPOS[tipo].formatos[0], archivos: [] });
    setImagenActual(0);
    setMensajeArchivo("");
  }

  function alternarRed(red) {
    if (redes.includes(red)) {
      if (redes.length === 1) return;
      const nuevas = redes.filter((r) => r !== red);
      setRedes(nuevas);
      if (vistaRed === red) setVistaRed(nuevas[0]);
    } else {
      setRedes((actuales) => ["instagram", "facebook"].filter((r) => r === red || actuales.includes(r)));
      setVistaRed(red);
    }
  }

  function elegirArchivo(evento) {
    const candidatos = Array.from(evento.target.files || []);
    evento.target.value = "";
    if (!candidatos.length) return;
    const esReel = contenido.tipo === "reel";
    const validos = candidatos.filter((archivo) => {
      const tipoValido = esReel
        ? archivo.type === "video/mp4" || /\.mp4$/i.test(archivo.name)
        : ["image/jpeg", "image/png", "image/webp"].includes(archivo.type);
      return tipoValido && archivo.size > 0 && archivo.size <= (esReel ? 150 : 20) * 1024 * 1024;
    });
    if (validos.length !== candidatos.length) {
      setMensajeArchivo(esReel ? "Seleccioná videos MP4 de hasta 150 MB." : "Seleccioná imágenes JPG, PNG o WebP de hasta 20 MB cada una.");
    } else {
      setMensajeArchivo("");
    }
    if (!validos.length) return;

    const esCarrusel = contenido.tipo === "carrusel";
    const anteriores = esCarrusel ? contenido.archivos : [];
    const disponibles = (esCarrusel ? 10 : 1) - anteriores.length;
    if (disponibles === 0) {
      setMensajeArchivo("El carrusel ya tiene diez imágenes. Quitá una para agregar otra.");
      return;
    }
    if (esCarrusel && validos.length > disponibles) setMensajeArchivo("Se permiten hasta diez imágenes por carrusel.");
    const nuevas = validos.slice(0, disponibles).map((archivo) => {
      const url = URL.createObjectURL(archivo);
      urlsTemporales.current.add(url);
      return { url, nombre: archivo.name };
    });
    if (!esCarrusel) revocar(contenido.archivos);
    actualizarContenido({ archivos: [...anteriores, ...nuevas] });
    setImagenActual(0);
  }

  function quitarArchivo(indice) {
    const archivo = contenido.archivos[indice];
    if (!archivo) return;
    revocar([archivo]);
    actualizarContenido({ archivos: contenido.archivos.filter((_, i) => i !== indice) });
    setImagenActual(0);
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 font-normal text-slate-900">
      <section className="border-b border-slate-200 bg-white px-4 py-14 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-md bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700">
            <Sparkles size={15} /> Comunidad Semanal
          </div>
          <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">Tus redes activas, incluso mientras dormís.</h1>
            <p className="mt-5 text-base leading-7 text-slate-600 sm:text-lg">
              Prepará tu contenido una vez y dejá que sus publicaciones sigan un calendario.
              Nosotros nos encargamos de revisar los archivos, conectar tus redes de forma segura y organizar la programación.
            </p>
          </div>
          <div className="mt-7 flex flex-wrap gap-3 text-sm text-slate-700">
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">4 contenidos</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">7 días consecutivos</span>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">Instagram y Facebook</span>
          </div>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => setModalRegistro(true)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-orange-600 px-6 py-3 text-sm font-semibold text-white hover:bg-orange-700">
              <UserRoundPlus size={18} /> Registrarme
            </button>
            <button type="button" onClick={() => navigate(RUTA_CONFIGURADOR)} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 hover:border-slate-500">
              <UserRound size={18} /> Seguir como invitado <ArrowRight size={17} />
            </button>
            <a href="#demo" className="inline-flex min-h-12 items-center justify-center rounded-md px-5 py-3 text-sm font-medium text-orange-700 hover:bg-orange-50">Probar vista previa</a>
          </div>
          <p className="mt-3 text-xs leading-5 text-slate-500">Probá la demostración sin registrarte, pagar ni conectar tus cuentas. El registro por correo se habilitará en la próxima etapa.</p>
          <Link to={RUTA_CONFIGURADOR} className="mt-5 inline-flex text-sm font-medium text-slate-700 underline underline-offset-4 hover:text-orange-700">¿Ya tenés un pedido? Recuperar acceso</Link>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6" aria-labelledby="como-funciona">
        <div className="mb-6 max-w-2xl">
          <h2 id="como-funciona" className="text-2xl font-semibold tracking-tight">¿Cómo funciona?</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Conocé el proceso antes de contratar. No necesitás tener experiencia programando publicaciones.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icono: FileImage, titulo: "Preparás tus contenidos", descripcion: "Elegís imágenes, reels, carruseles, textos y llamadas a la acción." },
            { icono: ShieldCheck, titulo: "Confirmás y vinculás tus redes", descripcion: "Registrás tu pedido, confirmamos el pago y conectás Facebook o Instagram de forma segura." },
            { icono: Clock3, titulo: "Nos ocupamos de la programación", descripcion: "Verificamos los archivos y organizamos cuatro contenidos dentro de un período flexible de siete días." },
          ].map(({ icono: Icono, titulo, descripcion }, indice) => (
            <article key={titulo} className={TARJETA}>
              <div className="mb-4 flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-md bg-orange-50 text-orange-700"><Icono size={21} /></span><span className="text-xs text-slate-400">0{indice + 1}</span></div>
              <h3 className="text-base font-semibold">{titulo}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{descripcion}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="demo" className="scroll-mt-24 border-y border-slate-200 bg-slate-100 px-4 py-14 sm:px-6" aria-labelledby="demo-titulo">
        <div className="mx-auto max-w-6xl">
          <div className="mb-7 max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-orange-700"><Sparkles size={17} /> Demostración interactiva</div>
            <h2 id="demo-titulo" className="text-2xl font-semibold tracking-tight sm:text-3xl">Mirá cómo podría verse tu publicación</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Seleccioná una imagen o video y probá formatos, copy y CTA. Es una vista previa: no se registra ningún pedido ni se guarda esta configuración.</p>
          </div>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-6">
              <div className={TARJETA}>
                <h3 className="text-base font-semibold">Elegí dónde publicar</h3>
                <p className="mt-1 text-xs leading-5 text-slate-500">Una red: 4 publicaciones. Dos redes: 8 publicaciones a partir de los mismos cuatro contenidos.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {["instagram", "facebook"].map((red) => {
                    const activa = redes.includes(red);
                    return <button key={red} type="button" aria-pressed={activa} onClick={() => alternarRed(red)} className={`flex items-center justify-center gap-2 rounded-md border p-3 text-sm font-medium transition ${activa ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}><IconoRed red={red} /> {red === "instagram" ? "Instagram" : "Facebook"}{activa && <Check size={14} />}</button>;
                  })}
                </div>
                <div className="mt-4 flex items-center justify-between rounded-md bg-slate-50 p-3 text-sm">
                  <span className="text-slate-600">{redes.length === 1 ? "4 publicaciones · 1 red" : "8 publicaciones · 2 redes"}</span>
                  <strong className="font-semibold">{precios ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(precios[redes.length]) : "Precio al continuar"}</strong>
                </div>
                <p className="mt-2 text-xs text-slate-500">Precio informativo: el importe oficial se confirma al crear el pedido.</p>
              </div>

              <div className={TARJETA}>
                <h3 className="text-base font-semibold">Tus cuatro contenidos</h3>
                <p className="mt-1 text-xs text-slate-500">Probá diferentes formatos para cada contenido.</p>
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Seleccionar contenido de prueba">
                  {contenidos.map((item, indice) => {
                    const Icono = TIPOS[item.tipo].icono;
                    return <button key={item.id} type="button" aria-pressed={seleccion === indice} onClick={() => { setSeleccion(indice); setImagenActual(0); setMensajeArchivo(""); }} className={`flex items-center gap-2 rounded-md border px-3 py-2.5 text-left text-xs transition ${seleccion === indice ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"}`}><Icono size={17} /> <span>Contenido {indice + 1}</span></button>;
                  })}
                </div>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Campo etiqueta="Tipo de publicación">
                    <select className={ENTRADA} value={contenido.tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                      <option value="imagen">Imagen</option><option value="carrusel">Carrusel</option><option value="reel">Reel</option><option disabled value="story">Stories (próximamente)</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Proporción" nota="9:16 para reels; 4:5 o 1:1 para imágenes y carruseles.">
                    <select className={ENTRADA} value={contenido.formato} onChange={(e) => actualizarContenido({ formato: e.target.value })}>
                      {TIPOS[contenido.tipo].formatos.map((formato) => <option key={formato} value={formato}>{formato}</option>)}
                    </select>
                  </Campo>
                </div>
                <div className="mt-5">
                  <span className="mb-2 block text-sm font-medium">{contenido.tipo === "reel" ? "Video del reel" : contenido.tipo === "carrusel" ? "Imágenes del carrusel" : "Imagen de la publicación"}</span>
                  <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center hover:border-orange-500">
                    <CloudUpload className="text-orange-700" size={24} />
                    <span className="text-sm font-medium text-slate-800">{contenido.archivos.length ? "Agregar o cambiar archivos" : "Seleccionar archivos para la vista previa"}</span>
                    <span className="text-xs text-slate-500">{contenido.tipo === "reel" ? "MP4 · hasta 150 MB" : "JPG, PNG o WebP · hasta 20 MB por imagen"}</span>
                    <input className="sr-only" type="file" accept={contenido.tipo === "reel" ? "video/mp4,.mp4" : "image/jpeg,image/png,image/webp"} multiple={contenido.tipo === "carrusel"} onChange={elegirArchivo} />
                  </label>
                  {mensajeArchivo && <p role="alert" className="mt-2 text-xs text-red-700">{mensajeArchivo}</p>}
                  {contenido.archivos.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{contenido.archivos.map((archivo, indice) => <span key={archivo.url} className="inline-flex max-w-full items-center gap-2 rounded-md bg-slate-100 px-2 py-1 text-xs"><span className="max-w-32 truncate">{archivo.nombre}</span><button type="button" aria-label={`Quitar ${archivo.nombre}`} className="text-slate-500 hover:text-red-700" onClick={() => quitarArchivo(indice)}><Trash2 size={14} /></button></span>)}</div>}
                  <p className="mt-2 text-xs leading-5 text-slate-500">El archivo solo existe en la memoria de esta pestaña. No se envía a nuestros servidores.</p>
                </div>

                <div className="mt-6 space-y-4 border-t border-slate-100 pt-5">
                  <Campo etiqueta="Nombre del emprendimiento"><input className={ENTRADA} value={negocio} maxLength={120} onChange={(e) => setNegocio(e.target.value)} placeholder="Ej.: Mi emprendimiento" /></Campo>
                  <Campo etiqueta="Copy o texto de la publicación"><textarea className={ENTRADA} rows={3} maxLength={1500} value={contenido.copy} onChange={(e) => actualizarContenido({ copy: e.target.value })} placeholder="Escribí el texto que aparecerá en la vista previa..." /></Campo>
                  <details className="rounded-md border border-slate-200 bg-white p-4">
                    <summary className="cursor-pointer text-sm font-medium text-slate-800">CTA, enlace y hashtags (opcionales)</summary>
                    <div className="mt-4 space-y-4">
                      {redes.includes("instagram") && <Campo etiqueta="CTA para Instagram"><input className={ENTRADA} maxLength={100} value={contenido.ctaInstagram} onChange={(e) => actualizarContenido({ ctaInstagram: e.target.value })} placeholder="Ej.: Enlace en nuestra bio" /></Campo>}
                      {redes.includes("facebook") && <><Campo etiqueta="CTA para Facebook"><input className={ENTRADA} maxLength={100} value={contenido.ctaFacebook} onChange={(e) => actualizarContenido({ ctaFacebook: e.target.value })} placeholder="Ej.: Visitá nuestra tienda" /></Campo><Campo etiqueta="URL para Facebook"><input className={ENTRADA} maxLength={500} value={contenido.urlFacebook} onChange={(e) => actualizarContenido({ urlFacebook: e.target.value })} placeholder="https://..." /></Campo></>}
                      <Campo etiqueta="Hashtags"><input className={ENTRADA} maxLength={240} value={contenido.hashtags} onChange={(e) => actualizarContenido({ hashtags: e.target.value })} placeholder="#MiNegocio #Comunidad" /></Campo>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <aside className={`${TARJETA} lg:sticky lg:top-24`} aria-label="Vista previa demostrativa">
              <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3"><h3 className="text-lg font-semibold">Vista previa</h3><span className="text-xs text-slate-500">{seleccion + 1} de 4</span></div>
              <div className="mb-3 flex gap-2">
                {redes.map((red) => <button key={red} type="button" aria-pressed={redVisible === red} onClick={() => setVistaRed(red)} className={`flex flex-1 items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium ${redVisible === red ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 text-slate-600"}`}><IconoRed red={red} /> {red === "instagram" ? "Instagram" : "Facebook"}</button>)}
              </div>
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex items-center gap-2 p-3"><IconoRed red={redVisible} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{redVisible === "instagram" ? usuarioVisible : nombreVisible}</p><p className="text-[11px] text-slate-500">{redVisible === "instagram" ? "Publicación de Instagram" : "Página de Facebook · Público"}</p></div><MoreHorizontal size={18} className="text-slate-400" /></div>
                <div className="bg-slate-50 px-3 py-3">
                  <div className={`relative mx-auto overflow-hidden rounded-md bg-slate-100 ${contenido.formato === "9:16" ? "max-w-[210px]" : "max-w-[290px]"}`} style={{ aspectRatio: contenido.formato.replace(":", " / ") }}>
                    {media ? (contenido.tipo === "reel" ? <video key={media.url} src={media.url} playsInline preload="metadata" controls className="h-full w-full object-contain" /> : <img src={media.url} alt={`Vista previa imagen ${imagenActual + 1}`} className="h-full w-full object-contain" />) : <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-400"><FileImage size={30} strokeWidth={1.5} /><span className="text-xs leading-5">Seleccioná {contenido.tipo === "reel" ? "un video" : "una imagen"} para visualizar tu publicación</span></div>}
                    {contenido.tipo === "carrusel" && contenido.archivos.length > 1 && <><button type="button" aria-label="Imagen anterior" onClick={() => setImagenActual((n) => (n - 1 + contenido.archivos.length) % contenido.archivos.length)} className="absolute left-1 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-2"><ChevronLeft size={16} /></button><button type="button" aria-label="Imagen siguiente" onClick={() => setImagenActual((n) => (n + 1) % contenido.archivos.length)} className="absolute right-1 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-2"><ChevronRight size={16} /></button><span className="absolute right-1 top-1 rounded bg-black/65 px-2 py-1 text-[10px] text-white">{imagenActual + 1}/{contenido.archivos.length}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-3 px-3 pt-3 text-slate-700">{redVisible === "instagram" ? <><Heart size={19} /><MessageCircle size={19} /><Send size={19} /></> : <span className="flex items-center gap-2 text-xs text-slate-500"><Heart size={16} /> Me gusta <MessageCircle size={16} /> Comentar <Send size={16} /> Compartir</span>}</div>
                <div className="space-y-2 px-3 py-3 text-sm leading-5 text-slate-700">
                  <p className="whitespace-pre-wrap break-words">{contenido.copy.trim() || "Acá vas a ver el texto de tu publicación."}</p>
                  {(redVisible === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook).trim() && <p className="font-semibold">{redVisible === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook}</p>}
                  {redVisible === "facebook" && contenido.urlFacebook.trim() && <p className="break-all text-orange-700 underline">{contenido.urlFacebook}</p>}
                  {contenido.hashtags.trim() && <p className="break-words text-orange-700">{contenido.hashtags}</p>}
                </div>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Simulación orientativa: la apariencia puede variar según la plataforma.</p>
              <div className="mt-5 rounded-md bg-orange-50 p-4"><p className="text-sm font-semibold text-orange-900">¿Te gustó cómo se ve?</p><p className="mt-1 text-xs leading-5 text-orange-800">Cuando continúes, completarás tu configuración real desde cero. Nada de esta prueba se guardará.</p><button type="button" onClick={() => navigate(RUTA_CONFIGURADOR)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">Continuar como invitado <ArrowRight size={17} /></button><button type="button" onClick={() => setModalRegistro(true)} className="mt-2 w-full rounded-md border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-800 hover:border-orange-400">Registrarme</button></div>
            </aside>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="grid gap-6 rounded-lg border border-slate-200 bg-white p-6 sm:grid-cols-[1fr_auto] sm:items-center sm:p-8">
          <div><div className="mb-2 flex items-center gap-2 text-orange-700"><LockKeyhole size={19} /><span className="text-sm font-semibold">Sin compromisos durante la demostración</span></div><h2 className="text-xl font-semibold">Probá primero. Decidí después.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">La vista previa no realiza publicaciones, no solicita permisos de tus cuentas y no guarda tus archivos. El registro por correo con código y el panel del cliente estarán disponibles en una próxima etapa.</p></div>
          <Link to={RUTA_CONFIGURADOR} className="inline-flex items-center justify-center gap-2 rounded-md bg-orange-600 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-700">Seguir como invitado <ArrowRight size={17} /></Link>
        </div>
      </section>

      {modalRegistro && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 py-5" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setModalRegistro(false); }}>
        <div role="dialog" aria-modal="true" aria-labelledby="registro-titulo" className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
          <div className="flex items-center justify-between gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-md bg-orange-50 text-orange-700"><UserRoundPlus size={23} /></span><button type="button" aria-label="Cerrar aviso de registro" onClick={() => setModalRegistro(false)} className="rounded-md p-2 text-slate-500 hover:bg-slate-100"><X size={20} /></button></div>
          <h2 id="registro-titulo" className="mt-4 text-xl font-semibold">Registro por correo en preparación</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">Estamos implementando el acceso mediante un código de verificación enviado a tu correo, sin contraseña. Todavía no se pueden crear cuentas.</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">Mientras tanto, podés configurar tu servicio como invitado y recuperar tu pedido con un enlace privado.</p>
          <button type="button" onClick={() => navigate(RUTA_CONFIGURADOR)} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md bg-orange-600 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-700">Seguir como invitado <ArrowRight size={17} /></button>
          <button type="button" onClick={() => setModalRegistro(false)} className="mt-2 w-full rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">Volver a la demostración</button>
        </div>
      </div>}
    </main>
  );
}
