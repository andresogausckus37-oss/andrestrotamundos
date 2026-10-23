import { useEffect, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight, Check, ChevronLeft, ChevronRight, CloudUpload,
  FileImage, Film, Heart, Images, Mail, MessageCircle,
  MoreHorizontal, Send, ShieldCheck, ThumbsUp, Trash2, UserRound, UserRoundPlus, X,
} from "lucide-react";

const RUTA_BASE = "/servicios/publicacion-automatica";
const RUTA_PANEL = `${RUTA_BASE}/mi-panel`;
const API_SOLICITAR_CODIGO = "/api/servicios/clientes/acceso/solicitar";
const API_VERIFICAR_CODIGO = "/api/servicios/clientes/acceso/verificar";

// Identidad visual de la demostración y del panel.
function cargarMontserrat() {
  const id = "comunidad-semanal-fuente-montserrat";
  if (document.getElementById(id)) return;
  const fuente = document.createElement("link");
  fuente.id = id; fuente.rel = "stylesheet";
  fuente.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500&display=swap";
  document.head.appendChild(fuente);
}

const LOGOS = {
  instagram: "https://i.postimg.cc/1tGRTnck/3840px-Instagram-logo-2022-svg.png",
  facebook: "https://i.postimg.cc/rshTXS0k/Logo-de-Facebook.png",
};

const CAMPO = "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const CAJA = "rounded-md border border-slate-200 bg-white p-4 sm:p-5";
const BOTON = "inline-flex min-h-9 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";
const PAISES_REGISTRO = [
  "Argentina", "Belice", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica",
  "Cuba", "Ecuador", "El Salvador", "España", "Estados Unidos", "Guatemala",
  "Haití", "Honduras", "México", "Nicaragua", "Panamá", "Paraguay", "Perú",
  "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela",
].sort((a, b) => a.localeCompare(b, "es"));

function VerificacionRegistro({ sitekey, onToken, revision }) {
  const ref = useRef(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!sitekey || !ref.current) return undefined;
    let montado = true, widget = null;
    const pintar = () => {
      if (!montado || !window.turnstile || !ref.current || widget !== null) return;
      try {
        widget = window.turnstile.render(ref.current, {
          sitekey, callback: token => { if (montado) onToken(token); },
          "expired-callback": () => { if (montado) onToken(""); },
          "error-callback": () => { if (montado) onToken(""); },
        });
      } catch { setError("No se pudo mostrar la verificación de Cloudflare."); }
    };
    let script = document.getElementById("turnstile-comunidad-registro");
    if (!script) {
      script = document.createElement("script"); script.id = "turnstile-comunidad-registro";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true; script.defer = true; document.head.appendChild(script);
    }
    if (window.turnstile) pintar();
    else script.addEventListener("load", pintar);
    return () => {
      montado = false; script.removeEventListener("load", pintar);
      if (widget !== null && window.turnstile) try { window.turnstile.remove(widget); } catch { /* retirado */ }
    };
  }, [sitekey, onToken, revision]);
  return <div className="space-y-1.5"><div ref={ref} aria-label="Verificación Cloudflare" />
    {error && <p className="text-xs text-red-700" role="alert">{error}</p>}</div>;
}

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
  useEffect(() => { cargarMontserrat(); }, []);
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
  const [repetirEmail, setRepetirEmail] = useState("");
  const [nombreRegistro, setNombreRegistro] = useState("");
  const [emprendimientoRegistro, setEmprendimientoRegistro] = useState("");
  const [whatsappRegistro, setWhatsappRegistro] = useState("");
  const [paisRegistro, setPaisRegistro] = useState("Argentina");
  const [webRegistro, setWebRegistro] = useState("");
  const [modoAcceso, setModoAcceso] = useState("registro");
  const [turnstileKey, setTurnstileKey] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileRevision, setTurnstileRevision] = useState(0);
  const [codigo, setCodigo] = useState("");
  const [pasoRegistro, setPasoRegistro] = useState("email");
  const [errorRegistro, setErrorRegistro] = useState("");
  const [esperandoRegistro, setEsperandoRegistro] = useState(false);
  const urlsTemporales = useRef(new Set());

  // La demostración no crea pedidos ni envía archivos. La semana real se prepara desde el panel.

  useEffect(() => () => {
    for (const url of urlsTemporales.current) URL.revokeObjectURL(url);
    urlsTemporales.current.clear();
  }, []);

  // Los enlaces anteriores se recuperan desde la cuenta verificada del panel.
  if (location.hash.startsWith("#pedido=")) {
    return <Navigate replace to={{ pathname: RUTA_PANEL, hash: location.hash }} />;
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

  function abrirRegistro(modo = "registro") {
    setErrorRegistro("");
    setCodigo("");
    setPasoRegistro("email");
    setModoAcceso(modo);
    setTurnstileToken("");
    setModalRegistro(true);
  }

  useEffect(() => {
    if (new URLSearchParams(location.search).get("acceso") === "ingreso") abrirRegistro("ingreso");
  }, [location.search]);

  useEffect(() => {
    if (!modalRegistro || modoAcceso !== "registro" || turnstileKey) return;
    let vivo = true;
    fetch("/api/servicios/publicaciones/plan", { credentials: "same-origin", cache: "no-store" })
      .then(r => r.json()).then(d => { if (vivo) setTurnstileKey(d.turnstileSiteKey || ""); })
      .catch(() => { if (vivo) setTurnstileKey(""); });
    return () => { vivo = false; };
  }, [modalRegistro, modoAcceso, turnstileKey]);

  const perfilRegistro = () => ({
    nombre: nombreRegistro.trim(), emprendimiento: emprendimientoRegistro.trim(), whatsapp: whatsappRegistro.trim(),
    pais: paisRegistro, web: webRegistro.trim(),
  });

  async function enviarCodigo(evento) {
    evento.preventDefault();
    const correo = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
      setErrorRegistro("Ingresá un correo electrónico válido.");
      return;
    }
    if (modoAcceso === "registro") {
      if (correo !== repetirEmail.trim().toLowerCase()) { setErrorRegistro("Los correos electrónicos no coinciden."); return; }
      if (nombreRegistro.trim().length < 2 || !emprendimientoRegistro.trim() || emprendimientoRegistro.trim().length > 120 || !/^\+?[0-9]{8,17}$/.test(whatsappRegistro.trim()) ||
          !PAISES_REGISTRO.includes(paisRegistro) || webRegistro.trim().length > 300) {
        setErrorRegistro("Completá tu nombre, emprendimiento, WhatsApp y país correctamente."); return;
      }
      if (!turnstileToken) { setErrorRegistro("Completá la verificación de Cloudflare."); return; }
    }
    setEsperandoRegistro(true);
    setErrorRegistro("");
    try {
      const respuesta = await fetch(API_SOLICITAR_CODIGO, {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ email: correo, modo: modoAcceso,
          ...(modoAcceso === "registro" ? { perfil: perfilRegistro(), turnstileToken } : {}) }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || datos.ok !== true) throw new Error("No fue posible enviar el código. Intentá nuevamente más tarde.");
      setEmail(correo);
      setPasoRegistro("codigo");
      setCodigo("");
    } catch (error) {
      setErrorRegistro(error.message || "No fue posible enviar el código.");
      if (modoAcceso === "registro") { setTurnstileToken(""); setTurnstileRevision(v => v + 1); }
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
        credentials: "same-origin", cache: "no-store",
        body: JSON.stringify({ email, codigo, modo: modoAcceso,
          ...(modoAcceso === "registro" ? { perfil: perfilRegistro() } : {}) }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || datos.ok !== true) throw new Error("El código no pudo verificarse. Revisalo e intentá nuevamente.");
      setModalRegistro(false);
      navigate(RUTA_PANEL);
    } catch (error) {
      setErrorRegistro(error.message || "No se pudo verificar el código.");
    } finally {
      setEsperandoRegistro(false);
    }
  }

  const textoVistaPrevia = (
    <div className="px-3 py-3">
      <p className="whitespace-pre-wrap break-words text-sm font-normal leading-5 text-slate-700">
        {contenido.copy.trim() || "Acá vas a ver la idea de tu publicación."}
      </p>
      {(redVisible === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook).trim() && (
        <p className="mt-2 text-sm font-medium text-slate-800">
          {redVisible === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook}
        </p>
      )}
      {redVisible === "facebook" && contenido.urlFacebook.trim() && (
        <p className="mt-1 break-all text-sm text-orange-700 underline underline-offset-2">{contenido.urlFacebook}</p>
      )}
      {contenido.hashtags.trim() && (
        <p className="mt-2 break-words text-sm text-orange-700">{contenido.hashtags}</p>
      )}
    </div>
  );

  function botonesAcceso() {
    return <div className="flex flex-wrap items-center gap-2.5">
      <button type="button" onClick={() => abrirRegistro("registro")} className={`${BOTON} bg-orange-600 text-white hover:bg-orange-700`}>
        <UserRoundPlus size={15} /> Registrarme
      </button>
      <button type="button" onClick={() => abrirRegistro("ingreso")} className={`${BOTON} border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100`}>
        <UserRound size={15} /> Iniciar sesión
      </button>
    </div>;
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] pb-16 font-normal text-slate-900" style={{ fontFamily: 'Montserrat, ui-sans-serif, system-ui, sans-serif' }}>
      <section className="px-4 pb-10 pt-10 sm:px-6 sm:pb-14 sm:pt-14">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-12">
            <div className="max-w-3xl">
              <div className="mb-5 flex items-center gap-2">
                <LogoRed red="instagram" size={23} />
                <LogoRed red="facebook" size={23} />
                <span className="ml-1 text-xs font-medium text-slate-600">Gestión automática de contenido en redes sociales</span>
              </div>
              <h1 className="max-w-3xl text-[30px] font-medium leading-[1.17] tracking-tight sm:text-[42px]">
                Automatizá tus redes sociales y hacé crecer tu negocio
              </h1>
              <div className="mt-6 max-w-2xl space-y-4 text-sm font-normal leading-7 text-slate-600 sm:text-[15px]">
                <p>¿Querés mantener tus redes sociales activas sin estar pendiente de cada publicación? Nuestro sistema automatiza tu contenido de Facebook e Instagram para que ahorres tiempo y te concentres en hacer crecer tu negocio.</p>
                <p>Subí tus contenidos, elegí las redes sociales, el formato, los textos, hashtags, enlaces, días y horarios. ¡Nosotros nos encargamos del resto!</p>
                <p>Ganás tiempo, mantenés tu presencia digital y generás más oportunidades para atraer clientes, llevar tráfico a tu web y potenciar tus ventas.</p>
              </div>
              <div className="mt-7">
                <p className="mb-3 text-base font-medium text-slate-900">¡Empezá gratis y simplificá la gestión de tus redes!</p>
                {botonesAcceso()}

              </div>
            </div>

            <div className="-mx-4 bg-orange-100 px-5 py-6 sm:mx-0 sm:rounded-md sm:p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-medium text-orange-700">PRUEBA GRATUITA</span>
                <span className="text-xs font-normal text-slate-500">Facebook + Instagram</span>
              </div>
              <p className="text-3xl font-medium tracking-tight text-slate-950">Probá <span className="text-orange-700">7 días gratis</span></p>
              <p className="mt-3 text-sm leading-6 text-slate-600">Subí hasta 4 contenidos en cada red dejá que nuestro sistema los publique automáticamente en los días y horarios que elijas.</p>
              <div className="my-5 border-t border-slate-100" />
              <p className="text-sm font-medium text-slate-900">¿Querés ver cómo funciona antes de registrarte?</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">Probá nuestro editor con vista previa y descubrí cómo se verán tus publicaciones en Facebook e Instagram.</p>
              <a href="#demo" className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-orange-700 hover:text-orange-800">
                Probar el editor <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="demo" className="scroll-mt-20 px-4 py-8 sm:px-6 sm:py-10" aria-labelledby="demo-titulo">
        <div className="mx-auto max-w-6xl">
          <div className="mb-5 max-w-3xl">
            <h2 id="demo-titulo" className="text-xl font-medium tracking-tight sm:text-2xl">Mirá cómo se verán tus publicaciones</h2>
            <p className="mt-1.5 text-sm leading-5 text-slate-600">
              Probá tus imágenes, videos, textos y enlaces en una vista interactiva.
            </p>
          </div>

          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_350px]">
            <div className="space-y-4">
              <div className={CAJA}>
                <h3 className="text-sm font-medium">Redes sociales</h3>
                <p className="mt-1 text-xs text-slate-500">4 contenidos para una o para ambas redes.</p>
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
                  <span className="text-base font-medium text-orange-700">$0</span>
                </div>
              </div>

              <div className={CAJA}>
                <h3 className="text-sm font-medium">Tus 4 contenidos</h3>
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
                {redVisible === "facebook" && textoVistaPrevia}
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
                {redVisible === "instagram" && textoVistaPrevia}
              </div>
              <p className="mt-2 text-xs font-normal leading-4 text-slate-500">Simulación orientativa: la apariencia final puede variar según la red social.</p>
            </aside>
          </div>

          <div className="mt-8 rounded-md border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-col gap-3 border-b border-slate-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-medium text-slate-900">Tus primeros 7 días, gratis</h3>
                <p className="mt-1 text-sm text-slate-600">Hasta 4 contenidos en Facebook e Instagram · 8 publicaciones en total al usar ambas redes.</p>
              </div>
              <p className="text-3xl font-medium text-orange-600">$0</p>
            </div>
            <h3 className="mt-5 text-sm font-medium text-slate-900">Al finalizar la prueba gratuita</h3>
            <p className="mt-1 text-xs text-slate-500">Precios previstos para una semana adicional de servicio.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">1 red <span className="font-normal text-slate-500">· 1 semana</span></p>
                  <div className="text-right">
                    <p className="text-base font-medium text-slate-900">$10.000 ARS</p>
                    <p className="text-xs text-slate-600">USD 10</p>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-slate-200 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-900">2 redes <span className="font-normal text-slate-500">· 1 semana</span></p>
                  <div className="text-right">
                    <p className="text-base font-medium text-slate-900">$15.000 ARS</p>
                    <p className="text-xs text-slate-600">USD 15</p>
                  </div>
                </div>
              </div>
            </div>
            <p className="mt-4 text-xs font-normal leading-5 text-slate-500">
              Te avisaremos por correo cuando esté por finalizar tu prueba. Si querés continuar, podrás contratar una semana desde tu panel privado. No se realizará ningún cobro automático.
            </p>
          </div>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="max-w-xl text-sm font-medium text-slate-800">¡Empezá gratis y simplificá la gestión de tus redes!</p>
            {botonesAcceso()}
          </div>
        </div>
      </section>

      {modalRegistro && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-3 py-4"
          onMouseDown={e => { if (e.target === e.currentTarget) setModalRegistro(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="registro-titulo"
            className="max-h-[92dvh] w-full max-w-md overflow-y-auto rounded-md bg-white p-4 shadow-xl sm:p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2"><Mail size={18} className="text-orange-600" />
                <h2 id="registro-titulo" className="text-base font-medium">{modoAcceso === "registro" ? "Crear mi cuenta" : "Iniciar sesión"}</h2>
              </div>
              <button type="button" aria-label="Cerrar" onClick={() => setModalRegistro(false)} className="rounded-md p-1 text-slate-500 hover:bg-slate-100"><X size={17} /></button>
            </div>
            {pasoRegistro === "email" ? <form onSubmit={enviarCodigo} className="space-y-3">
              {modoAcceso === "registro" && <>
                <Campo etiqueta="Nombre y apellido *"><input className={CAMPO} required autoComplete="name" maxLength={100}
                  value={nombreRegistro} onChange={e => setNombreRegistro(e.target.value)} /></Campo>
                <Campo etiqueta="Nombre del emprendimiento *"><input className={CAMPO} required maxLength={120} autoComplete="organization"
                  value={emprendimientoRegistro} onChange={e => setEmprendimientoRegistro(e.target.value)} placeholder="Ej.: Mi emprendimiento" /></Campo>
              </>}
              <Campo etiqueta="Correo electrónico *"><input className={CAMPO} required type="email" autoComplete="email" maxLength={160}
                value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" /></Campo>
              {modoAcceso === "registro" && <>
                <Campo etiqueta="Repetir correo electrónico *"><input className={CAMPO} required type="email" autoComplete="email" maxLength={160}
                  value={repetirEmail} onChange={e => setRepetirEmail(e.target.value)} placeholder="tu@email.com" /></Campo>
                <Campo etiqueta="WhatsApp *" nota="Solo números; podés incluir el prefijo internacional +.">
                  <input className={CAMPO} required type="tel" inputMode="tel" maxLength={18} value={whatsappRegistro}
                    onChange={e => setWhatsappRegistro(e.target.value.replace(/[^+0-9]/g, "").replace(/(?!^)\+/g, ""))} placeholder="5493511234567" />
                </Campo>
                <Campo etiqueta="País *"><select className={CAMPO} value={paisRegistro} onChange={e => setPaisRegistro(e.target.value)}>
                  {PAISES_REGISTRO.map(pais => <option key={pais} value={pais}>{pais}</option>)}
                </select></Campo>
                <Campo etiqueta="Web o enlace principal (opcional)"><input className={CAMPO} type="text" maxLength={300}
                  value={webRegistro} onChange={e => setWebRegistro(e.target.value)} placeholder="tusitio.com" /></Campo>
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-medium"><ShieldCheck size={15} className="text-orange-600"/> Verificación de seguridad</div>
                  {turnstileKey ? <VerificacionRegistro sitekey={turnstileKey} onToken={setTurnstileToken} revision={turnstileRevision} />
                    : <p className="text-xs text-amber-700">La verificación de Cloudflare no está disponible. No se puede completar el registro.</p>}
                </div>
              </>}
              {errorRegistro && <p role="alert" className="text-xs text-red-700">{errorRegistro}</p>}
              <button type="submit" disabled={esperandoRegistro || (modoAcceso === "registro" && !turnstileToken)}
                className={`${BOTON} w-full bg-orange-600 text-white hover:bg-orange-700`}>
                {esperandoRegistro ? "Enviando código..." : modoAcceso === "registro" ? "Registrarme" : "Enviar código de acceso"}
              </button>
              <button type="button" className="w-full text-xs font-medium text-slate-600 underline underline-offset-2"
                onClick={() => { setErrorRegistro(""); setModoAcceso(v => v === "registro" ? "ingreso" : "registro"); setTurnstileToken(""); }}>
                {modoAcceso === "registro" ? "Ya tengo cuenta · Iniciar sesión" : "Crear una cuenta nueva"}
              </button>
            </form> : <form onSubmit={verificarCodigo} className="space-y-3">
              <p className="text-sm text-slate-600">Ingresá el código de seis dígitos enviado a <span className="font-medium">{email}</span>.</p>
              <Campo etiqueta="Código de verificación"><input className={`${CAMPO} tracking-widest`} autoComplete="one-time-code"
                inputMode="numeric" pattern="[0-9]{6}" required maxLength={6} value={codigo}
                onChange={e => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" /></Campo>
              {errorRegistro && <p role="alert" className="text-xs text-red-700">{errorRegistro}</p>}
              <button type="submit" disabled={esperandoRegistro} className={`${BOTON} w-full bg-orange-600 text-white hover:bg-orange-700`}>
                {esperandoRegistro ? "Verificando..." : "Confirmar correo e ir a mi panel"}
              </button>
              <button type="button" onClick={() => { setPasoRegistro("email"); setCodigo(""); setErrorRegistro("");
                setTurnstileToken(""); setTurnstileRevision(v => v + 1); }}
                className="text-xs font-medium text-slate-600 underline underline-offset-2">Volver</button>
            </form>}
          </div>
        </div>
      )}

    </main>
  );
}
