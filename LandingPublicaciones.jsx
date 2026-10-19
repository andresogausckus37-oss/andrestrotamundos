import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, CloudUpload,
  FileImage, Film, Heart, Images, Mail, MessageCircle,
  MoreHorizontal, Send, ThumbsUp, Trash2, UserRound, UserRoundPlus, X,
} from "lucide-react";

const RUTA_BASE = "/servicios/publicacion-automatica";
const RUTA_CONFIGURADOR = `${RUTA_BASE}/configurar`;
const API_SOLICITAR_CODIGO = "/api/servicios/clientes/acceso/solicitar";
const API_VERIFICAR_CODIGO = "/api/servicios/clientes/acceso/verificar";

// Los mismos logos utilizados en el configurador completo.
const LOGOS = {
  instagram: "https://i.postimg.cc/1tGRTnck/3840px-Instagram-logo-2022-svg.png",
  facebook: "https://i.postimg.cc/rshTXS0k/Logo-de-Facebook.png",
};

const CAMPO = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const CAJA = "rounded-lg border border-slate-200 bg-white p-4 sm:p-5";
const BOTON = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
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

function LogoRed({ red, size = 24 }) {
  return (
    <img
      src={LOGOS[red]}
      alt={red === "instagram" ? "Instagram" : "Facebook"}
      loading="lazy"
      width={size}
      height={size}
      className="shrink-0 object-contain"
      style={{ width: size, height: size }}
    />
  );
}

function Campo({ etiqueta, children, nota }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-800">{etiqueta}</span>
      {children}
      {nota && <span className="mt-1 block text-xs font-normal leading-4 text-slate-500">{nota}</span>}
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
  const [email, setEmail] = useState("");
  const [codigo, setCodigo] = useState("");
  const [pasoRegistro, setPasoRegistro] = useState("email");
  const [errorRegistro, setErrorRegistro] = useState("");
  const [esperandoRegistro, setEsperandoRegistro] = useState(false);
  const [precios, setPrecios] = useState(null);
  const urlsTemporales = useRef(new Set());

  // La demostración solo consulta precios. Nunca envía su contenido ni sus archivos.
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/servicios/publicaciones/plan", { signal: controller.signal, cache: "no-store" })
      .then((respuesta) => respuesta.ok ? respuesta.json() : null)
      .then((datos) => {
        if (datos?.ok && Number.isFinite(datos?.precios?.ARS?.[1]) && Number.isFinite(datos?.precios?.ARS?.[2])) {
          setPrecios(datos.precios.ARS);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  useEffect(() => () => {
    for (const url of urlsTemporales.current) URL.revokeObjectURL(url);
    urlsTemporales.current.clear();
  }, []);

  // Los enlaces privados antiguos continúan funcionando con el configurador real.
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
    setMensajeArchivo(validos.length !== candidatos.length
      ? esReel ? "Seleccioná videos MP4 de hasta 150 MB." : "Seleccioná imágenes JPG, PNG o WebP de hasta 20 MB."
      : "");
    if (!validos.length) return;

    const esCarrusel = contenido.tipo === "carrusel";
    const anteriores = esCarrusel ? contenido.archivos : [];
    const disponibles = (esCarrusel ? 10 : 1) - anteriores.length;
    if (!disponibles) {
      setMensajeArchivo("El carrusel admite diez imágenes como máximo. Quitá una para agregar otra.");
      return;
    }
    if (esCarrusel && validos.length > disponibles) setMensajeArchivo("Se permiten hasta diez imágenes por carrusel.");
    const nuevos = validos.slice(0, disponibles).map((archivo) => {
      const url = URL.createObjectURL(archivo);
      urlsTemporales.current.add(url);
      return { url, nombre: archivo.name };
    });
    if (!esCarrusel) revocar(contenido.archivos);
    actualizarContenido({ archivos: [...anteriores, ...nuevos] });
    setImagenActual(0);
  }

  function quitarArchivo(indice) {
    const archivo = contenido.archivos[indice];
    if (!archivo) return;
    revocar([archivo]);
    actualizarContenido({ archivos: contenido.archivos.filter((_, i) => i !== indice) });
    setImagenActual(0);
  }

  function abrirRegistro() {
    setErrorRegistro("");
    setModalRegistro(true);
  }

  // Estos endpoints serán implementados en el backend de registro por correo.
  // La interfaz no declara cuentas creadas si el servidor no las confirma.
  async function enviarCodigo(evento) {
    evento.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrorRegistro("Ingresá un correo electrónico válido.");
      return;
    }
    setEsperandoRegistro(true);
    setErrorRegistro("");
    try {
      const respuesta = await fetch(API_SOLICITAR_CODIGO, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store", body: JSON.stringify({ email: correo }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || datos.ok !== true) throw new Error("No fue posible enviar el código. Intentá nuevamente más tarde.");
      setEmail(correo);
      setPasoRegistro("codigo");
      setCodigo("");
    } catch (error) {
      setErrorRegistro(error.message || "No fue posible enviar el código.");
    } finally {
      setEsperandoRegistro(false);
    }
  }

  async function verificarCodigo(evento) {
    evento.preventDefault();
    if (!/^\d{6}$/.test(codigo)) {
      setErrorRegistro("Ingresá los seis dígitos recibidos por correo.");
      return;
    }
    setEsperandoRegistro(true);
    setErrorRegistro("");
    try {
      const respuesta = await fetch(API_VERIFICAR_CODIGO, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store", body: JSON.stringify({ email, codigo }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || datos.ok !== true) throw new Error("El código no pudo verificarse. Revisalo e intentá nuevamente.");
      setModalRegistro(false);
      navigate(RUTA_CONFIGURADOR);
    } catch (error) {
      setErrorRegistro(error.message || "No se pudo verificar el código.");
    } finally {
      setEsperandoRegistro(false);
    }
  }

  return (
    <main className="min-h-screen bg-white pb-14 font-normal text-slate-900" style={{ fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' }}>
      <section className="border-b border-slate-200 bg-white px-4 py-9 sm:px-6 sm:py-12">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-2 text-xs font-medium text-orange-700">Gestión automática de contenidos para Facebook e Instagram</p>
            <h1 className="text-3xl font-medium leading-tight tracking-tight sm:text-4xl">Tus redes activas, incluso mientras dormís.</h1>
            <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
              Prepará tu contenido una vez y dejá que sus publicaciones sigan un calendario en Facebook e Instagram.
              Nosotros nos encargamos de revisar los archivos, conectar tus redes de forma segura y organizar la programación.
            </p>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            <button type="button" onClick={abrirRegistro} className={`${BOTON} bg-orange-600 text-white hover:bg-orange-700`}>
              <UserRoundPlus size={16} /> Registrarme
            </button>
            <button type="button" onClick={() => navigate(RUTA_CONFIGURADOR)} className={`${BOTON} border border-slate-300 bg-white text-slate-800 hover:border-slate-500`}>
              <UserRound size={16} /> Seguir como invitado
            </button>
            <a href="#demo" className={`${BOTON} text-orange-700 hover:bg-orange-50`}>Probar vista previa <ArrowRight size={15} /></a>
          </div>
          <Link to={RUTA_CONFIGURADOR} className="mt-4 inline-flex text-xs font-medium text-slate-600 underline underline-offset-4 hover:text-orange-700">
            ¿Ya tenés un pedido? Recuperar acceso
          </Link>
        </div>
      </section>

      <section id="demo" className="scroll-mt-20 bg-white px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="demo-titulo">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 max-w-3xl">
            <h2 id="demo-titulo" className="text-xl font-medium tracking-tight sm:text-2xl">Mirá cómo se verá tu publicación</h2>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              Probá tus imágenes, videos, textos y enlaces en una vista previa de Instagram y Facebook.
              Los archivos de esta demostración permanecen en tu navegador.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className="space-y-4">
              <div className={CAJA}>
                <h3 className="text-sm font-medium">Redes sociales</h3>
                <p className="mt-1 text-xs text-slate-500">Cuatro contenidos para una red o para ambas redes.</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {["instagram", "facebook"].map((red) => {
                    const activa = redes.includes(red);
                    return (
                      <button key={red} type="button" aria-pressed={activa} onClick={() => alternarRed(red)}
                        className={`flex min-h-10 items-center justify-center gap-2 rounded-md border px-2 py-1.5 text-sm font-medium transition ${activa ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 text-slate-700 hover:border-slate-400"}`}>
                        <LogoRed red={red} size={21} /> {red === "instagram" ? "Instagram" : "Facebook"} {activa && <Check size={13} />}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                  <span className="text-slate-600">{redes.length === 1 ? "4 publicaciones · 1 red" : "8 publicaciones · 2 redes"}</span>
                  <span className="font-medium text-slate-900">{precios ? new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(precios[redes.length]) : "Consultar precio"}</span>
                </div>
              </div>

              <div className={CAJA}>
                <h3 className="text-sm font-medium">Tus cuatro contenidos</h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Elegir contenido">
                  {contenidos.map((item, indice) => {
                    const Icono = TIPOS[item.tipo].icono;
                    return (
                      <button key={item.id} type="button" aria-pressed={seleccion === indice}
                        onClick={() => { setSeleccion(indice); setImagenActual(0); setMensajeArchivo(""); }}
                        className={`flex items-center justify-center gap-1.5 rounded-md border px-2 py-2 text-xs font-medium transition ${seleccion === indice ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 text-slate-700 hover:border-slate-400"}`}>
                        <Icono size={15} /> Contenido {indice + 1}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Tipo de publicación">
                    <select className={`${CAMPO} h-9`} value={contenido.tipo} onChange={(e) => cambiarTipo(e.target.value)}>
                      <option value="imagen">Imagen</option>
                      <option value="carrusel">Carrusel</option>
                      <option value="reel">Reel</option>
                      <option disabled value="story">Stories (próximamente)</option>
                    </select>
                  </Campo>
                  <Campo etiqueta="Proporción">
                    <select className={`${CAMPO} h-9`} value={contenido.formato} onChange={(e) => actualizarContenido({ formato: e.target.value })}>
                      {TIPOS[contenido.tipo].formatos.map((formato) => <option key={formato} value={formato}>{formato}</option>)}
                    </select>
                  </Campo>
                </div>
                <div className="mt-3">
                  <span className="mb-1 block text-xs font-medium text-slate-800">
                    {contenido.tipo === "reel" ? "Video del reel" : contenido.tipo === "carrusel" ? "Imágenes del carrusel" : "Imagen de la publicación"}
                  </span>
                  <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed border-slate-300 bg-white px-3 py-3 text-center hover:border-orange-500">
                    <CloudUpload size={19} className="text-orange-700" />
                    <span className="text-xs font-medium">{contenido.archivos.length ? "Agregar o cambiar archivos" : "Elegir archivos"}</span>
                    <span className="hidden text-xs text-slate-500 sm:inline">{contenido.tipo === "reel" ? "MP4 · 150 MB" : "JPG, PNG, WebP · 20 MB"}</span>
                    <input className="sr-only" type="file" accept={contenido.tipo === "reel" ? "video/mp4,.mp4" : "image/jpeg,image/png,image/webp"}
                      multiple={contenido.tipo === "carrusel"} onChange={elegirArchivo} />
                  </label>
                  {mensajeArchivo && <p role="alert" className="mt-1.5 text-xs text-red-700">{mensajeArchivo}</p>}
                  {contenido.archivos.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {contenido.archivos.map((archivo, indice) => (
                        <span key={archivo.url} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 px-2 py-1 text-xs">
                          <span className="max-w-32 truncate">{archivo.nombre}</span>
                          <button type="button" aria-label={`Quitar ${archivo.nombre}`} className="text-slate-500 hover:text-red-700" onClick={() => quitarArchivo(indice)}><Trash2 size={13} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <Campo etiqueta="Nombre del emprendimiento">
                    <input className={`${CAMPO} h-9`} maxLength={120} value={negocio} onChange={(e) => setNegocio(e.target.value)} placeholder="Ej.: Mi emprendimiento" />
                  </Campo>
                  <Campo etiqueta="Copy o texto de la publicación">
                    <textarea className={CAMPO} rows={2} maxLength={1500} value={contenido.copy}
                      onChange={(e) => actualizarContenido({ copy: e.target.value })} placeholder="Escribí el texto de tu publicación..." />
                  </Campo>
                  <details className="rounded-md border border-slate-200 bg-white p-3">
                    <summary className="cursor-pointer text-xs font-medium text-slate-800">CTA, URL y hashtags (opcionales)</summary>
                    <div className="mt-3 space-y-3">
                      {redes.includes("instagram") && <Campo etiqueta="CTA para Instagram"><input className={`${CAMPO} h-9`} maxLength={100} value={contenido.ctaInstagram} onChange={(e) => actualizarContenido({ ctaInstagram: e.target.value })} placeholder="Enlace en nuestra bio" /></Campo>}
                      {redes.includes("facebook") && <>
                        <Campo etiqueta="CTA para Facebook"><input className={`${CAMPO} h-9`} maxLength={100} value={contenido.ctaFacebook} onChange={(e) => actualizarContenido({ ctaFacebook: e.target.value })} placeholder="Visitá nuestra tienda" /></Campo>
                        <Campo etiqueta="URL para Facebook"><input className={`${CAMPO} h-9`} maxLength={500} value={contenido.urlFacebook} onChange={(e) => actualizarContenido({ urlFacebook: e.target.value })} placeholder="https://..." /></Campo>
                      </>}
                      <Campo etiqueta="Hashtags"><input className={`${CAMPO} h-9`} maxLength={240} value={contenido.hashtags} onChange={(e) => actualizarContenido({ hashtags: e.target.value })} placeholder="#MiNegocio #Novedades" /></Campo>
                    </div>
                  </details>
                </div>
              </div>
            </div>

            <aside className={`${CAJA} lg:sticky lg:top-20`} aria-label="Vista previa demostrativa">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-medium">Vista previa</h3>
                <span className="text-xs font-normal text-slate-500">Contenido {seleccion + 1} de 4</span>
              </div>
              <div className="mb-3 flex gap-2" role="group" aria-label="Ver publicación por red">
                {redes.map((red) => (
                  <button key={red} type="button" aria-pressed={redVisible === red} onClick={() => setVistaRed(red)}
                    className={`flex min-h-9 flex-1 items-center justify-center gap-2 rounded-md border px-2 py-1 text-xs font-medium ${redVisible === red ? "border-orange-500 bg-orange-50 text-orange-800" : "border-slate-200 text-slate-600"}`}>
                    <LogoRed red={red} size={19} /> {red === "instagram" ? "Instagram" : "Facebook"}
                  </button>
                ))}
              </div>
              <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
                <div className="flex items-center gap-2 px-3 py-3">
                  <LogoRed red={redVisible} size={27} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-900">{redVisible === "instagram" ? usuarioVisible : nombreVisible}</p>
                    <p className="text-[11px] font-normal text-slate-500">{redVisible === "instagram" ? "Publicación de Instagram" : "Página de Facebook · Público"}</p>
                  </div>
                  <MoreHorizontal size={19} className="text-slate-500" />
                </div>
                <div className="bg-slate-50 px-3 py-2">
                  <div className={`relative mx-auto overflow-hidden rounded-md bg-slate-100 ${contenido.formato === "9:16" ? "w-full max-w-[225px]" : "w-full max-w-[300px]"}`}
                    style={{ aspectRatio: contenido.formato.replace(":", " / ") }}>
                    {media ? (
                      contenido.tipo === "reel"
                        ? <video key={media.url} src={media.url} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label="Vista previa del video" />
                        : <img src={media.url} alt={`Imagen ${imagenActual + 1} de la publicación`} className="h-full w-full object-contain" />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-4 text-center text-slate-400">
                        <FileImage size={28} strokeWidth={1.5} />
                        <p className="text-xs leading-5">Elegí {contenido.tipo === "reel" ? "un video" : "imágenes"} para ver tu publicación</p>
                      </div>
                    )}
                    {contenido.tipo === "carrusel" && contenido.archivos.length > 1 && <>
                      <button type="button" aria-label="Imagen anterior" onClick={() => setImagenActual((i) => (i - 1 + contenido.archivos.length) % contenido.archivos.length)}
                        className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1.5 text-slate-800"><ChevronLeft size={16} /></button>
                      <button type="button" aria-label="Imagen siguiente" onClick={() => setImagenActual((i) => (i + 1) % contenido.archivos.length)}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1.5 text-slate-800"><ChevronRight size={16} /></button>
                      <span className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-2 py-1 text-[10px] text-white">{imagenActual + 1}/{contenido.archivos.length}</span>
                    </>}
                  </div>
                </div>
                {redVisible === "instagram" ? (
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
                  <p className="whitespace-pre-wrap break-words text-sm font-normal leading-5 text-slate-700">{contenido.copy.trim() || "Acá vas a ver la idea de tu publicación."}</p>
                  {(redVisible === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook).trim() && (
                    <p className="mt-2 text-sm font-medium text-slate-800">{redVisible === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook}</p>
                  )}
                  {redVisible === "facebook" && contenido.urlFacebook.trim() && <p className="mt-1 break-all text-sm text-orange-700 underline underline-offset-2">{contenido.urlFacebook}</p>}
                  {contenido.hashtags.trim() && <p className="mt-2 break-words text-sm text-orange-700">{contenido.hashtags}</p>}
                </div>
              </div>
              <p className="mt-2 text-xs font-normal leading-4 text-slate-500">Simulación orientativa: la apariencia final puede variar según la red social.</p>
            </aside>
          </div>
        </div>
      </section>

      {modalRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-5" role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setModalRegistro(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="registro-titulo" className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2"><Mail size={19} className="text-orange-700" /><h2 id="registro-titulo" className="text-base font-medium">Acceso con correo electrónico</h2></div>
              <button type="button" aria-label="Cerrar registro" onClick={() => setModalRegistro(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X size={18} /></button>
            </div>
            {pasoRegistro === "email" ? (
              <form onSubmit={enviarCodigo} className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">Ingresá tu correo para recibir un código de verificación de seis dígitos.</p>
                <Campo etiqueta="Correo electrónico">
                  <input className={`${CAMPO} h-9`} type="email" autoComplete="email" inputMode="email" required maxLength={160}
                    value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" />
                </Campo>
                {errorRegistro && <p role="alert" className="text-xs text-red-700">{errorRegistro}</p>}
                <button type="submit" disabled={esperandoRegistro} className={`${BOTON} w-full bg-orange-600 text-white hover:bg-orange-700`}>
                  {esperandoRegistro ? "Enviando..." : "Enviar código"}
                </button>
              </form>
            ) : (
              <form onSubmit={verificarCodigo} className="mt-4 space-y-3">
                <p className="text-sm text-slate-600">Ingresá el código enviado a <span className="font-medium">{email}</span>.</p>
                <Campo etiqueta="Código de seis dígitos">
                  <input className={`${CAMPO} h-9 tracking-widest`} inputMode="numeric" pattern="[0-9]{6}" autoComplete="one-time-code" required maxLength={6}
                    value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" />
                </Campo>
                {errorRegistro && <p role="alert" className="text-xs text-red-700">{errorRegistro}</p>}
                <button type="submit" disabled={esperandoRegistro} className={`${BOTON} w-full bg-orange-600 text-white hover:bg-orange-700`}>
                  {esperandoRegistro ? "Verificando..." : "Verificar y continuar"}
                </button>
                <button type="button" onClick={() => { setPasoRegistro("email"); setCodigo(""); setErrorRegistro(""); }} className="text-xs font-medium text-slate-600 underline underline-offset-4">Cambiar correo</button>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
