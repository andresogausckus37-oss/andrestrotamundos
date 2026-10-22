import { useEffect, useRef, useState } from "react";
import ConexionFacebookPedido from "./ConexionFacebookPedido";
import ArchivosPedido from "./ArchivosPedido";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  CircleCheck,
  CloudUpload,
  Download,
  FileImage,
  Film,
  Heart,
  Images,
  LockKeyhole,
  Landmark,
  CircleDollarSign,
  MessageCircle,
  MoreHorizontal,
  Send,
  ShieldCheck,
  ThumbsUp,
  Trash2,
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
    ARS: { 1: 10000, 2: 15000 },
    USD: { 1: 10, 2: 15 },
  },
};

// Turnstile obtiene su clave pública de Cloudflare mediante GET /plan.
// La clave privada permanece exclusivamente en los secretos del Worker.
const API_PLAN = "/api/servicios/publicaciones/plan";
const API_PEDIDOS = "/api/servicios/publicaciones/pedidos";
const API_PRUEBA = "/api/servicios/publicaciones/prueba";
const API_TRANSFERENCIA = "/api/servicios/publicaciones/transferencia";
const PEDIDO_PENDIENTE_STORAGE = "pedido-publicaciones-transferencia-v1";

// El número de pedido NO es una contraseña. La clave se entrega una sola vez
// al crear la orden y el servidor guarda únicamente su hash SHA-256.
const ID_PEDIDO_SERVICIO = /^SER-[a-f0-9-]{36}$/i;
const CLAVE_PEDIDO_SERVICIO = /^[a-f0-9]{64}$/i;

function credencialesPedidoValidas(id, clave) {
  return ID_PEDIDO_SERVICIO.test(id || "") && CLAVE_PEDIDO_SERVICIO.test(clave || "");
}

// El fragmento (#) nunca viaja en la petición HTTP al servidor. Se elimina
// de la barra de direcciones apenas se abre un enlace privado.
function leerEnlacePrivadoServicio(valor) {
  try {
    const hash = valor.trim().startsWith("#")
      ? valor.trim()
      : new URL(valor.trim()).hash;
    const parametros = new URLSearchParams(hash.replace(/^#/, ""));
    const id = parametros.get("pedido");
    const tokenAcceso = parametros.get("clave");
    return credencialesPedidoValidas(id, tokenAcceso) ? { id, tokenAcceso } : null;
  } catch { return null; }
}

function enlacePrivadoServicio(pedido) {
  if (!credencialesPedidoValidas(pedido?.id, pedido?.tokenAcceso)) return "";
  return `${window.location.origin}${window.location.pathname}${window.location.search}` +
    `#pedido=${encodeURIComponent(pedido.id)}&clave=${encodeURIComponent(pedido.tokenAcceso)}`;
}

// Toda recuperación se verifica contra la API, nunca alcanza con tener un ID.
async function consultarPedidoServicio(id, tokenAcceso) {
  if (!credencialesPedidoValidas(id, tokenAcceso)) {
    throw new Error("Revisá el código de pedido y la clave privada de acceso.");
  }
  // Las pruebas gratuitas no tienen transferencia ni comprobante. Se consultan
  // con el mismo token privado, sin mostrarlo en enlaces de red ni en registros.
  const gratisRespuesta = await fetch(`${API_PRUEBA}/estado?pedidoId=${encodeURIComponent(id)}`, {
    method: "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${tokenAcceso}`, Accept: "application/json" },
  });
  if (gratisRespuesta.ok) {
    const gratis = await gratisRespuesta.json();
    if (gratis.ok === true && gratis.pedidoId === id && gratis.modalidad === "prueba_gratuita") {
      return { id, tokenAcceso, moneda: gratis.moneda, precio: 0,
        precioRenovacion: gratis.precioRenovacion, metodoPago: "ninguno",
        modalidad: "prueba_gratuita", estado: gratis.estado, pagoHabilitado: false };
    }
  } else if (gratisRespuesta.status !== 404) {
    throw new Error("No pudimos consultar el estado del pedido. Intentá nuevamente más tarde.");
  }
  const respuesta = await fetch(`${API_TRANSFERENCIA}?pedidoId=${encodeURIComponent(id)}`, {
    method: "GET", cache: "no-store",
    headers: { Authorization: `Bearer ${tokenAcceso}`, Accept: "application/json" },
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || datos.ok !== true || datos.pedidoId !== id ||
      datos.moneda !== "ARS" || !Number.isFinite(datos.precio)) {
    throw new Error("No pudimos acceder al pedido. Verificá la clave o intentá nuevamente más tarde.");
  }
  return {
    id, tokenAcceso, moneda: "ARS", precio: datos.precio,
    metodoPago: "transferencia", estado: datos.estado, pagoHabilitado: true,
  };
}

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
// Países de América y España. Se ofrecen varias ciudades solamente si existen
// zonas con reglas horarias distintas (incluidos los cambios estacionales).
// Los identificadores IANA se guardan sin convertirlos a la hora de Argentina.
const ZONAS_DISPONIBLES = [
  { pais: "Argentina", zonas: [["America/Argentina/Buenos_Aires", "Buenos Aires"]] },
  { pais: "Belice", zonas: [["America/Belize", "Belmopán"]] },
  { pais: "Bolivia", zonas: [["America/La_Paz", "La Paz"]] },
  { pais: "Brasil", zonas: [
    ["America/Noronha", "Fernando de Noronha"],
    ["America/Manaus", "Manaos"],
    ["America/Rio_Branco", "Rio Branco"],
    ["America/Sao_Paulo", "São Paulo (Brasilia y la mayor parte del país)"],
  ] },
  { pais: "Chile", zonas: [
    ["America/Coyhaique", "Aysén / Coyhaique"],
    ["Pacific/Easter", "Isla de Pascua (Rapa Nui)"],
    ["America/Punta_Arenas", "Magallanes / Punta Arenas"],
    ["America/Santiago", "Santiago (zona central)"],
  ] },
  { pais: "Colombia", zonas: [["America/Bogota", "Bogotá"]] },
  { pais: "Costa Rica", zonas: [["America/Costa_Rica", "San José"]] },
  { pais: "Cuba", zonas: [["America/Havana", "La Habana"]] },
  { pais: "Ecuador", zonas: [
    ["Pacific/Galapagos", "Islas Galápagos"],
    ["America/Guayaquil", "Quito / Guayaquil (continental)"],
  ] },
  { pais: "El Salvador", zonas: [["America/El_Salvador", "San Salvador"]] },
  { pais: "España", zonas: [
    ["Atlantic/Canary", "Islas Canarias"],
    ["Europe/Madrid", "Madrid (península y Baleares)"],
  ] },
  { pais: "Estados Unidos", zonas: [
    ["America/Anchorage", "Alaska"],
    ["America/Chicago", "Central (Chicago / Dallas)"],
    ["America/Denver", "Montaña (Denver)"],
    ["America/New_York", "Este (Nueva York / Miami)"],
    ["Pacific/Honolulu", "Hawái"],
    ["America/Los_Angeles", "Pacífico (Los Ángeles)"],
    ["America/Phoenix", "Arizona (Phoenix, sin horario de verano)"],
  ] },
  { pais: "Guatemala", zonas: [["America/Guatemala", "Ciudad de Guatemala"]] },
  { pais: "Haití", zonas: [["America/Port-au-Prince", "Puerto Príncipe"]] },
  { pais: "Honduras", zonas: [["America/Tegucigalpa", "Tegucigalpa"]] },
  { pais: "México", zonas: [
    ["America/Tijuana", "Baja California (Tijuana)"],
    ["America/Cancun", "Cancún (Quintana Roo)"],
    ["America/Chihuahua", "Chihuahua (interior)"],
    ["America/Ciudad_Juarez", "Ciudad Juárez (frontera)"],
    ["America/Matamoros", "Frontera noreste (Matamoros)"],
    ["America/Mazatlan", "Pacífico (Mazatlán / Sinaloa)"],
    ["America/Mexico_City", "Zona centro (Ciudad de México)"],
    ["America/Hermosillo", "Sonora (Hermosillo)"],
  ] },
  { pais: "Nicaragua", zonas: [["America/Managua", "Managua"]] },
  { pais: "Panamá", zonas: [["America/Panama", "Ciudad de Panamá"]] },
  { pais: "Paraguay", zonas: [["America/Asuncion", "Asunción"]] },
  { pais: "Perú", zonas: [["America/Lima", "Lima"]] },
  { pais: "Puerto Rico", zonas: [["America/Puerto_Rico", "San Juan"]] },
  { pais: "República Dominicana", zonas: [["America/Santo_Domingo", "Santo Domingo"]] },
  { pais: "Uruguay", zonas: [["America/Montevideo", "Montevideo"]] },
  { pais: "Venezuela", zonas: [["America/Caracas", "Caracas"]] },
].sort((a, b) => a.pais.localeCompare(b.pais, "es", { sensitivity: "base" }));

const CONFIGURACION_INICIAL = [
  ["reel", "Lunes", "18:00"],
  ["carrusel", "Miércoles", "18:00"],
  ["imagen", "Viernes", "18:00"],
  ["reel", "Domingo", "18:00"],
];
const RESOLUCIONES = { "9:16": "1080 × 1920", "4:5": "1080 × 1350", "1:1": "1080 × 1080" };
const INPUT = "w-full min-h-9 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-normal text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const BOTON_ACTIVO = "border-orange-500 bg-orange-50 text-orange-800";
const TARJETA = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5";
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
    ctaInstagram: "",
    ctaFacebook: "",
    urlFacebook: "",
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
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{titulo}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-xs leading-5 text-slate-500">{ayuda}</span>}
    </label>
  );
}

function datosParaDescargar({ redes, contenidos, negocio, moneda, zonaHoraria }) {
  return {
    version: 3,
    planId: PLAN.id,
    planNombre: PLAN.nombre,
    duracionDias: PLAN.duracionDias,
    modalidadCalendario: "periodo_flexible_7_dias_consecutivos",
    criterioInicio: "primera_publicacion_confirmada_tras_verificacion_del_pago_vinculacion_y_aprobacion_de_materiales",
    criterioFechas: "dias_y_horas_preferidos_a_confirmar_dentro_del_periodo_desde_el_primer_contenido",
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
    aviso: "Este archivo guarda la configuración, pero no incluye los archivos multimedia. La carga definitiva se realiza después de preparar el pedido gratuito.",
  };
}

// Protección anti-bot sin nuevas dependencias ni cambios al Worker.
// El widget se crea solo cuando el Worker acepta pedidos públicos.
function VerificacionHumana({ clave, onToken }) {
  const contenedorRef = useRef(null);
  const [errorWidget, setErrorWidget] = useState("");

  useEffect(() => {
    let montado = true;
    let widgetId = null;

    function mostrarWidget() {
      if (!montado || !contenedorRef.current || widgetId !== null || !window.turnstile) return;
      try {
        widgetId = window.turnstile.render(contenedorRef.current, {
          sitekey: clave,
          callback: (token) => { if (montado) onToken(token); },
          "expired-callback": () => { if (montado) onToken(""); },
          "error-callback": () => { if (montado) onToken(""); },
        });
      } catch {
        if (montado) setErrorWidget("No se pudo mostrar la verificación. Recargá la página para intentarlo nuevamente.");
      }
    }

    let script = document.getElementById("turnstile-servicio-publicaciones");
    if (!script) {
      script = document.createElement("script");
      script.id = "turnstile-servicio-publicaciones";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    if (window.turnstile) mostrarWidget();
    else script.addEventListener("load", mostrarWidget);
    const errorCarga = () => { if (montado) setErrorWidget("No se pudo cargar la verificación. Revisá tu conexión."); };
    script.addEventListener("error", errorCarga);

    return () => {
      montado = false;
      script.removeEventListener("load", mostrarWidget);
      script.removeEventListener("error", errorCarga);
      if (widgetId !== null && window.turnstile) {
        try { window.turnstile.remove(widgetId); } catch { /* Widget ya retirado. */ }
      }
    };
  }, [clave, onToken]);

  return (
    <div>
      <div ref={contenedorRef} aria-label="Verificación de seguridad" />
      {errorWidget && <p role="alert" className="mt-2 text-xs text-red-700">{errorWidget}</p>}
    </div>
  );
}

// La cuenta y el importe se consultan al Worker usando un acceso limitado al pedido.
// No hay datos bancarios fijos en el frontend ni una pasarela automática de cobro.
function TransferenciaPedidoServicio({ pedido, habilitada }) {
  const [detalle, setDetalle] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [aviso, setAviso] = useState("");
  const [copiado, setCopiado] = useState("");

  useEffect(() => {
    if (!habilitada || !pedido?.id || !pedido?.tokenAcceso) return;
    const controller = new AbortController();
    setCargando(true);
    setError("");
    fetch(`${API_TRANSFERENCIA}?pedidoId=${encodeURIComponent(pedido.id)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${pedido.tokenAcceso}`, Accept: "application/json" },
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (respuesta) => {
        const datos = await respuesta.json().catch(() => ({}));
        if (!respuesta.ok || datos.ok !== true) {
          throw new Error(datos.error || "No se pudieron consultar los datos de la transferencia.");
        }
        if (datos.pedidoId !== pedido.id || datos.moneda !== "ARS") {
          throw new Error("La información de la transferencia no coincide con el pedido.");
        }
        setDetalle(datos);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err?.message || "No se pudo consultar la transferencia.");
      })
      .finally(() => { if (!controller.signal.aborted) setCargando(false); });
    return () => controller.abort();
  }, [pedido?.id, pedido?.tokenAcceso, habilitada]);

  async function copiarDato(texto, campo) {
    if (!texto || !navigator.clipboard?.writeText) {
      setAviso("Podés seleccionar y copiar el dato bancario manualmente.");
      return;
    }
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(campo);
      setAviso("");
    } catch {
      setAviso("No se pudo copiar automáticamente. Seleccioná el dato para copiarlo.");
    }
  }

  async function enviarComprobante(evento) {
    evento.preventDefault();
    if (!detalle || detalle.estado !== "pendiente_comprobante" || subiendo || !archivo) return;
    if (archivo.size < 100 || archivo.size > 8 * 1024 * 1024 ||
        !["image/jpeg", "image/png", "application/pdf"].includes(archivo.type)) {
      setError("Adjuntá un comprobante JPG, PNG o PDF de hasta 8 MB.");
      return;
    }
    setSubiendo(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await fetch(`${API_TRANSFERENCIA}/comprobante?pedidoId=${encodeURIComponent(pedido.id)}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pedido.tokenAcceso}`, "Content-Type": archivo.type, Accept: "application/json" },
        body: archivo,
        cache: "no-store",
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || datos.ok !== true) {
        throw new Error(datos.error || "No se pudo enviar el comprobante.");
      }
      setDetalle((anterior) => ({ ...anterior, estado: datos.estado, comprobanteRecibido: true }));
      setArchivo(null);
      setAviso("Recibimos el comprobante. Revisaremos la transferencia antes de confirmar el pago.");
    } catch (err) {
      setError(err?.message || "No se pudo enviar el comprobante. Volvé a intentarlo.");
    } finally {
      setSubiendo(false);
    }
  }

  const estados = {
    pendiente_comprobante: "Pendiente de comprobante",
    verificando_comprobante: "Verificando comprobante",
    verificando_pago: "Verificando pago",
    completando_operacion: "Completando operación",
  };

  if (!habilitada) return (
    <p className="mt-3 text-xs leading-5 text-slate-600">
      La transferencia bancaria se habilitará próximamente. Este pedido no confirma un pago ni activa publicaciones.
    </p>
  );
  if (!pedido?.tokenAcceso) return (
    <p className="mt-3 text-xs leading-5 text-red-700" role="alert">
      No está disponible el acceso seguro al pedido. Conservá el código y contactanos antes de transferir.
    </p>
  );

  return (
    <div className="mt-5 border-t border-orange-200 pt-4">
      <h3 className="text-sm font-semibold text-slate-900">Transferencia bancaria</h3>
      {cargando && <p className="mt-2 text-xs text-slate-600" role="status">Consultando los datos bancarios...</p>}
      {detalle && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-700">Importe a transferir: <span className="font-semibold">{precioFormateado(detalle.precio, "ARS")}</span></p>
          <div className="space-y-2 rounded-md border border-slate-200 bg-white p-3">
            {[
              ["Titular", detalle.cuenta?.titular],
              ["Banco o entidad", detalle.cuenta?.entidad],
              ["Alias", detalle.cuenta?.alias],
              ["CBU/CVU", detalle.cuenta?.cbuCvu],
            ].map(([nombre, valor]) => (
              <div key={nombre} className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-500">{nombre}</p>
                  <p className="select-text break-all text-sm font-semibold text-slate-900">{valor || "No disponible"}</p>
                </div>
                {valor && <button type="button" onClick={() => copiarDato(valor, nombre)} className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50" aria-label={`Copiar ${nombre}`}>
                  {copiado === nombre ? "Copiado" : "Copiar"}
                </button>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">Estado: <span className="font-semibold text-slate-800">{estados[detalle.estado] || detalle.estado}</span></p>
          {detalle.estado === "pendiente_comprobante" ? (
            <form onSubmit={enviarComprobante} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
              <label className="block text-sm font-semibold text-slate-800" htmlFor="comprobante-servicio">Adjuntá el comprobante de transferencia</label>
              <input id="comprobante-servicio" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-semibold file:text-orange-800" onChange={(e) => { setArchivo(e.target.files?.[0] || null); setError(""); }} />
              <p className="text-xs text-slate-500">JPG, PNG o PDF, hasta 8 MB. La confirmación del pago es manual.</p>
              <button type="submit" disabled={!archivo || subiendo} className={clases("inline-flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold", archivo && !subiendo ? "bg-orange-600 text-white hover:bg-orange-700" : "cursor-not-allowed bg-slate-300 text-white")}>
                <CloudUpload size={16} /> {subiendo ? "Enviando comprobante..." : "Enviar comprobante"}
              </button>
            </form>
          ) : (
            <p className="text-xs leading-5 text-slate-700">El comprobante está registrado. La aprobación del pago y la preparación del contenido se realizan por separado.</p>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-xs leading-5 text-red-700" role="alert">{error}</p>}
      {aviso && <p className="mt-3 text-xs leading-5 text-slate-700" role="status">{aviso}</p>}
    </div>
  );
}

// Mantiene la misma validación esencial que el Worker antes de enviar datos.
// El servidor vuelve a validar cada campo y decide el importe definitivo.
function verificarFormularioPedido({ negocio, contenidos }) {
  if (!negocio.nombre.trim() || !negocio.contacto.trim()) {
    return "Completá el nombre del emprendimiento y el nombre de contacto.";
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(negocio.email.trim())) {
    return "Ingresá un correo electrónico válido para identificar el pedido.";
  }
  if (negocio.whatsapp.trim() && !/^[+\d()\s.-]{5,50}$/.test(negocio.whatsapp.trim())) {
    return "Revisá el número de WhatsApp; usá números y el código de país.";
  }
  // Los enlaces se envían como texto: pueden empezar con https://, www. o ser un dominio.
  // El Worker valida su longitud y los almacena sin forzar un protocolo.
  if (contenidos.some((p) => p.archivos.some(({ archivo }) => !archivo.size))) {
    return "Uno de los archivos seleccionados está vacío. Quitalo de la vista previa.";
  }
  return "";
}

const PASOS = [
  { nombre: "Redes y horario", corto: "Redes" },
  { nombre: "Contenidos y vista previa", corto: "Contenidos" },
  { nombre: "Datos del negocio", corto: "Negocio" },
  { nombre: "Confirmación", corto: "Confirmar" },
];

function BloqueDesplegable({ titulo, descripcion, abierto, alAlternar, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button type="button" aria-expanded={abierto} onClick={alAlternar}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50 sm:px-5">
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-slate-900">{titulo}</span>
          {descripcion && <span className="mt-0.5 block text-xs leading-5 text-slate-500">{descripcion}</span>}
        </span>
        <ChevronDown size={18} aria-hidden="true" className={clases("shrink-0 text-slate-500 transition-transform", abierto && "rotate-180")} />
      </button>
      {abierto && <div className="border-t border-slate-100 px-4 pb-4 pt-4 sm:px-5 sm:pb-5">{children}</div>}
    </section>
  );
}

export default function ConfiguradorPublicaciones() {
  const [redes, setRedes] = useState(["instagram", "facebook"]);
  const [pasoActivo, setPasoActivo] = useState(0);
  const [desplegables, setDesplegables] = useState({ contenidos: true, textos: false, vista: true });
  const [errorPaso, setErrorPaso] = useState("");
  const [contenidos, setContenidos] = useState(crearContenidos);
  const [seleccion, setSeleccion] = useState("contenido-1");
  const [imagenActiva, setImagenActiva] = useState(0);
  const [redVista, setRedVista] = useState("instagram");
  const [moneda, setMoneda] = useState("ARS");
  const [zonaHoraria, setZonaHoraria] = useState("America/Argentina/Buenos_Aires");
  const [correoVerificado, setCorreoVerificado] = useState("");
  const [negocio, setNegocio] = useState({
    nombre: "", rubro: "", contacto: "", email: "", url: "", whatsapp: "", publico: "", tono: "cercano",
  });
  const [errorArchivo, setErrorArchivo] = useState("");
  const [planServidor, setPlanServidor] = useState(null);
  const [estadoPlan, setEstadoPlan] = useState("cargando");
  const [errorPlan, setErrorPlan] = useState("");
  const [revisionPlan, setRevisionPlan] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [revisionTurnstile, setRevisionTurnstile] = useState(0);
  const [creandoPedido, setCreandoPedido] = useState(false);
  const [errorPedido, setErrorPedido] = useState("");
  const [mostrarRecuperacion, setMostrarRecuperacion] = useState(false);
  const [codigoRecuperacion, setCodigoRecuperacion] = useState("");
  const [claveRecuperacion, setClaveRecuperacion] = useState("");
  const [recuperandoPedido, setRecuperandoPedido] = useState(false);
  const [errorRecuperacion, setErrorRecuperacion] = useState("");
  const [avisoAcceso, setAvisoAcceso] = useState("");
  const enlaceLeidoRef = useRef(false);
  const [pedidoCreado, setPedidoCreado] = useState(() => {
    try {
      const guardado = JSON.parse(sessionStorage.getItem(PEDIDO_PENDIENTE_STORAGE) || "null");
      return credencialesPedidoValidas(guardado?.id, guardado?.tokenAcceso) &&
        ["ARS", "USD"].includes(guardado?.moneda) ? guardado : null;
    } catch { return null; }
  });
  const enviandoRef = useRef(false);
  const urlsLocales = useRef(new Set());
  const vistaRef = useRef(null);

  // Abrir un enlace privado verifica sus credenciales y repone el pedido.
  // La clave no queda en la URL, y sólo se conserva en sessionStorage.
  useEffect(() => {
    if (enlaceLeidoRef.current) return;
    enlaceLeidoRef.current = true;
    const hash = window.location.hash;
    if (!hash.includes("pedido=") || !hash.includes("clave=")) return;
    const credenciales = leerEnlacePrivadoServicio(hash);
    window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    // Un enlace explícito tiene prioridad sobre un pedido de otra sesión.
    setPedidoCreado(null);
    setMostrarRecuperacion(true);
    if (!credenciales) {
      setErrorRecuperacion("El enlace privado no tiene un formato válido.");
      return;
    }
    setCodigoRecuperacion(credenciales.id);
    setClaveRecuperacion(credenciales.tokenAcceso);
    setRecuperandoPedido(true);
    consultarPedidoServicio(credenciales.id, credenciales.tokenAcceso)
      .then((pedido) => {
        setPedidoCreado(pedido);
        try { sessionStorage.setItem(PEDIDO_PENDIENTE_STORAGE, JSON.stringify(pedido)); } catch { /* Sesión no disponible */ }
        setErrorRecuperacion("");
        setClaveRecuperacion("");
      })
      .catch((error) => setErrorRecuperacion(error?.message || "No pudimos recuperar el pedido."))
      .finally(() => setRecuperandoPedido(false));
  }, []);

  useEffect(() => () => {
    urlsLocales.current.forEach((url) => URL.revokeObjectURL(url));
    urlsLocales.current.clear();
  }, []);

  // Obtiene importe y disponibilidad reales; si la consulta falla, la vista
  // previa se conserva pero no se permite registrar un pedido.
  useEffect(() => {
    const controller = new AbortController();
    setEstadoPlan("cargando");
    setErrorPlan("");
    fetch(API_PLAN, { method: "GET", headers: { Accept: "application/json" }, cache: "no-store", signal: controller.signal })
      .then(async (respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo consultar el plan del servidor.");
        const datos = await respuesta.json();
        const preciosValidos = ["ARS", "USD"].every((m) =>
          [1, 2].every((n) => Number.isFinite(datos.precios?.[m]?.[n]) && datos.precios[m][n] > 0)
        );
        if (!datos.ok || datos.plan?.id !== PLAN.id ||
            datos.plan?.contenidos !== PLAN.contenidos ||
            datos.plan?.duracionDias !== PLAN.duracionDias || !preciosValidos) {
          throw new Error("El plan disponible no coincide con el configurador.");
        }
        setPlanServidor(datos);
        setEstadoPlan("listo");
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setPlanServidor(null);
        setEstadoPlan("error");
        setErrorPlan(error?.message || "No pudimos consultar los precios del servidor.");
      });
    return () => controller.abort();
  }, [revisionPlan]);

  useEffect(() => {
    const controlador = new AbortController();
    fetch("/api/servicios/clientes/acceso/sesion", { cache: "no-store", credentials: "same-origin", signal: controlador.signal })
      .then(r => r.ok ? r.json() : null)
      .then(datos => {
        if (datos?.autenticado && typeof datos.email === "string") {
          setCorreoVerificado(datos.email);
          // El correo del pedido debe coincidir con el titular autenticado
          // para que MongoDB lo vincule automáticamente al panel.
          setNegocio(actual => ({ ...actual, email: datos.email }));
        }
      }).catch(() => {});
    return () => controlador.abort();
  }, []);

  useEffect(() => {
    if (pedidoCreado?.id) setPasoActivo(3);
  }, [pedidoCreado?.id]);

  const idiomaArgentino = zonaHoraria.startsWith("America/Argentina/");
  const t = (argentino, neutro) => idiomaArgentino ? argentino : neutro;
  const contenido = contenidos.find((p) => p.id === seleccion) || contenidos[0];
  const indice = contenidos.findIndex((p) => p.id === contenido.id);
  const vistaActual = redes.includes(redVista) ? redVista : redes[0];
  const totalPublicaciones = PLAN.contenidos * redes.length;
  const precio = planServidor?.precios?.[moneda]?.[redes.length] ?? PLAN.precios[moneda][redes.length];
  const precioConfirmado = estadoPlan === "listo";
  const turnstileSiteKey = typeof planServidor?.turnstileSiteKey === "string" ? planServidor.turnstileSiteKey.trim() : "";
  const transferenciasDisponibles = planServidor?.transferenciasHabilitadas === true;
  // El registro público continúa cerrado hasta que el Worker habilite pedidos.
  // USD no puede contratarse hasta implementar y verificar PayPal Checkout.
  const pruebasDisponibles = precioConfirmado && planServidor?.pruebasDisponibles === true &&
    Boolean(turnstileSiteKey);
  // La antigua contratación paga se conserva para consultar pedidos anteriores,
  // pero no se presenta en esta oferta de siete días gratuitos.
  const pedidosDisponibles = false;
  const creacionDisponible = pruebasDisponibles;
  const medioPago = moneda === "ARS" ? "Transferencia bancaria" : "PayPal";
  const archivosVista = contenido.archivos;
  const archivoActivo = archivosVista[imagenActiva] || archivosVista[0];
  const contenidosConArchivos = contenidos.filter((p) => p.archivos.length).length;
  const contenidosConIdea = contenidos.filter((p) => p.descripcion.trim()).length;

  function irAlPaso(numero) {
    if (numero < 0 || numero > 3) return;
    if (numero > pasoActivo && pasoActivo === 2 && !pedidoCreado) {
      const fallo = verificarFormularioPedido({ negocio, contenidos });
      if (fallo) { setErrorPaso(fallo); return; }
    }
    setErrorPaso("");
    setPasoActivo(numero);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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
    if (contenido.archivos.length && !window.confirm(t(
      "Al cambiar el formato se quitarán los archivos de esta vista previa. ¿Querés continuar?",
      "Al cambiar el formato se quitarán los archivos de esta vista previa. ¿Quieres continuar?"
    ))) return;
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
        ? t("Seleccioná un video MP4 de hasta 150 MB.", "Selecciona un video MP4 de hasta 150 MB.")
        : t("Seleccioná imágenes JPG, PNG o WebP de hasta 20 MB cada una.", "Selecciona imágenes JPG, PNG o WebP de hasta 20 MB cada una."));
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

  async function crearPedido() {
    if (enviandoRef.current || pedidoCreado || !creacionDisponible || !turnstileToken) return;
    const errorValidacion = verificarFormularioPedido({ negocio, contenidos });
    if (errorValidacion) {
      setErrorPedido(errorValidacion);
      return;
    }
    enviandoRef.current = true;
    setCreandoPedido(true);
    setErrorPedido("");
    try {
      const configuracion = datosParaDescargar({ redes, contenidos, negocio, moneda, zonaHoraria });
      // Nunca enviamos archivos, URLs blob: ni un precio editable desde el navegador.
      const { precioMostrado, aviso, ...datosPedido } = configuracion;
      const respuesta = await fetch(pruebasDisponibles ? API_PRUEBA : API_PEDIDOS, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ ...datosPedido, turnstileToken }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || datos.ok !== true || typeof datos.pedidoId !== "string") {
        throw new Error(datos.error || "No se pudo registrar el pedido. Intentá nuevamente.");
      }
      const pedido = {
        id: datos.pedidoId,
        tokenAcceso: /^[a-f0-9]{64}$/i.test(datos.tokenAcceso || "") ? datos.tokenAcceso : null,
        moneda: datos.moneda,
        precio: datos.precio,
        metodoPago: datos.metodoPago,
        estado: datos.estado,
        pagoHabilitado: datos.pagoHabilitado === true,
        modalidad: datos.modalidad || "pago",
        precioRenovacion: datos.precioRenovacion,
      };
      setPedidoCreado(pedido);
      // Solo permanece durante la sesión del navegador. Nunca incluir el token
      // en URLs, registros de consola ni archivos públicos.
      if (pedido.tokenAcceso && ["ARS", "USD"].includes(pedido.moneda)) {
        try { sessionStorage.setItem(PEDIDO_PENDIENTE_STORAGE, JSON.stringify(pedido)); } catch { /* Almacenamiento no disponible */ }
      }
    } catch (error) {
      setErrorPedido(error?.message || "No se pudo comunicar con el servidor.");
      // El token Turnstile tiene un solo uso, incluso si falla el guardado.
      setTurnstileToken("");
      setRevisionTurnstile((n) => n + 1);
    } finally {
      enviandoRef.current = false;
      setCreandoPedido(false);
    }
  }

  async function recuperarPedido(evento) {
    evento.preventDefault();
    if (recuperandoPedido) return;
    const enlace = leerEnlacePrivadoServicio(claveRecuperacion);
    const id = enlace?.id || codigoRecuperacion.trim();
    const tokenAcceso = enlace?.tokenAcceso || claveRecuperacion.trim();
    if (!credencialesPedidoValidas(id, tokenAcceso)) {
      setErrorRecuperacion("Ingresá un código de pedido y su clave privada, o pegá el enlace privado completo.");
      return;
    }
    setRecuperandoPedido(true);
    setErrorRecuperacion("");
    try {
      const pedido = await consultarPedidoServicio(id, tokenAcceso);
      setPedidoCreado(pedido);
      setCodigoRecuperacion(id);
      setClaveRecuperacion("");
      try { sessionStorage.setItem(PEDIDO_PENDIENTE_STORAGE, JSON.stringify(pedido)); } catch { /* Sesión no disponible */ }
    } catch (error) {
      setErrorRecuperacion(error?.message || "No se pudo recuperar el pedido.");
    } finally {
      setRecuperandoPedido(false);
    }
  }

  async function copiarAccesoServicio(tipo) {
    const valor = tipo === "enlace" ? enlacePrivadoServicio(pedidoCreado) : pedidoCreado?.tokenAcceso;
    if (!valor) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Portapapeles no disponible");
      await navigator.clipboard.writeText(valor);
      setAvisoAcceso(tipo === "enlace" ? "Enlace privado copiado." : "Clave privada copiada.");
    } catch {
      // Alternativa para navegadores que bloquean el portapapeles.
      window.prompt("Copiá y guardá este acceso privado:", valor);
      setAvisoAcceso("Guardá este acceso antes de cerrar la página.");
    }
  }

  function comenzarNuevoPedido() {
    if (!window.confirm("¿Querés comenzar otro pedido? Antes guardá el acceso privado del pedido actual.")) return;
    try { sessionStorage.removeItem(PEDIDO_PENDIENTE_STORAGE); } catch { /* Sesión no disponible */ }
    setPedidoCreado(null);
    setPasoActivo(0);
    setAvisoAcceso("");
    setCodigoRecuperacion("");
    setClaveRecuperacion("");
    setMostrarRecuperacion(false);
  }

  function descargarConfiguracion() {
    const datos = datosParaDescargar({ redes, contenidos, negocio, moneda, zonaHoraria });
    datos.precioMostrado = {
      monto: 0,
      renovacionPorSemana: precio,
      moneda,
      sujetoAConfirmacion: !precioConfirmado,
    };
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
  const ctaVista = vistaActual === "instagram" ? contenido.ctaInstagram : contenido.ctaFacebook;
  const urlVistaFacebook = vistaActual === "facebook" ? contenido.urlFacebook.trim() : "";
  const nombreVista = negocio.nombre.trim() || "Tu emprendimiento";
  const usuarioVista = nombreVista.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || "tu_emprendimiento";

  const leyendaVista = (
    <div className="px-3 py-3">
      <p className="whitespace-pre-wrap break-words text-sm leading-5 text-slate-700">
        {textoVista || t("Acá vas a ver el texto de tu publicación.", "Aquí verás el texto de tu publicación.")}
      </p>
      {ctaVista.trim() && <p className="mt-1.5 text-sm font-semibold text-slate-800">{ctaVista}</p>}
      {urlVistaFacebook && <p className="mt-1 break-all text-xs text-orange-700 underline underline-offset-2">{urlVistaFacebook}</p>}
      {contenido.hashtags.trim() && <p className="mt-1.5 break-words text-sm text-orange-700">{contenido.hashtags}</p>}
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 px-3 pb-20 pt-5 text-slate-900 sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-orange-700">Comunidad Semanal · Configurador</span>
            <span className="text-xs font-semibold text-slate-500">Paso {pasoActivo + 1} de {PASOS.length}</span>
          </div>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{PASOS[pasoActivo].nombre}</h1>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-label="Progreso de configuración" aria-valuemin={1} aria-valuemax={4} aria-valuenow={pasoActivo + 1}>
            <div className="h-full rounded-full bg-orange-600 transition-all duration-300" style={{ width: `${(pasoActivo + 1) * 25}%` }} />
          </div>
          <nav className="mt-3 grid grid-cols-4 gap-1.5 sm:gap-3" aria-label="Pasos del configurador">
            {PASOS.map((paso, i) => (
              <button type="button" key={paso.nombre} aria-current={pasoActivo === i ? "step" : undefined}
                onClick={() => irAlPaso(i)} className={clases("flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-1.5 py-2 text-[11px] font-semibold transition sm:justify-start sm:px-3 sm:text-xs",
                  pasoActivo === i ? "border-orange-300 bg-orange-50 text-orange-800" : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50")}>
                <span className={clases("flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold", pasoActivo === i ? "bg-orange-600 text-white" : i < pasoActivo ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500")}>
                  {i < pasoActivo ? <Check size={12} /> : i + 1}
                </span>
                <span className="truncate sm:hidden">{paso.corto}</span>
                <span className="hidden truncate sm:inline">{paso.nombre}</span>
              </button>
            ))}
          </nav>
        </header>

        {pasoActivo === 0 && (
          <section className={TARJETA} aria-labelledby="paso-redes">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="paso-redes" className="text-base font-semibold">Elegí las redes</h2>
              {!pedidoCreado && (
                <button type="button" onClick={() => { setMostrarRecuperacion(true); setPasoActivo(3); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="text-xs font-semibold text-orange-700 underline underline-offset-2">Ya tengo un pedido</button>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">Seleccioná una o ambas cuentas para tus publicaciones.</p>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-xl">
              {REDES.map((red) => {
                const activa = redes.includes(red.id);
                return (
                  <button key={red.id} type="button" disabled={!red.disponible} aria-pressed={red.disponible ? activa : undefined}
                    onClick={() => alternarRed(red.id)}
                    className={clases("relative flex min-h-[68px] flex-col items-center justify-center gap-1 rounded-lg border px-2 py-2 text-xs font-semibold transition",
                      !red.disponible ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : activa ? BOTON_ACTIVO : BOTON_NORMAL)}>
                    {activa && <Check size={13} className="absolute right-2 top-2 text-orange-700" />}
                    <LogoRed red={red.id} size={23} className={!red.disponible ? "opacity-40" : ""} />
                    <span>{red.nombre}</span>
                    {!red.disponible && <span className="text-[10px] text-slate-500">Pronto</span>}
                  </button>
                );
              })}
            </div>
            <div className="mt-5 max-w-xl border-t border-slate-100 pt-5">
              <Campo titulo="Zona horaria de las publicaciones" ayuda="El calendario respetará la hora local que selecciones.">
                <select id="zona-horaria" aria-label="Zona horaria de las publicaciones" className={INPUT} value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)}>
                  {ZONAS_DISPONIBLES.flatMap(({ pais, zonas }) =>
                    [...zonas].sort((a, b) => a[1].localeCompare(b[1], "es", { sensitivity: "base" })).map(([id, ciudad]) => (
                      <option key={id} value={id}>{pais} · {ciudad}</option>
                    ))
                  )}
                </select>
              </Campo>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
              <CalendarDays size={15} className="text-orange-700" />
              <span>{redes.length} {redes.length === 1 ? "red seleccionada" : "redes seleccionadas"} · {totalPublicaciones} publicaciones previstas</span>
            </div>
          </section>
        )}

        {pasoActivo === 1 && (
          <section aria-labelledby="paso-contenidos" className="space-y-4">
            <div className={TARJETA}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 id="paso-contenidos" className="text-base font-semibold">Elegí el contenido que querés publicar</h2>
                  <p className="mt-1 text-xs text-slate-500">Cada contenido conserva sus propios archivos, textos y horarios.</p>
                </div>
                <span className="text-xs text-slate-500">{contenidosConArchivos} de 4 con archivos</span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" role="group" aria-label="Seleccionar contenido">
                {contenidos.map((p, i) => {
                  const Icono = TIPOS.find((t) => t.id === p.tipo)?.icono || FileImage;
                  return (
                    <button
                      key={p.id} type="button" aria-pressed={seleccion === p.id}
                      onClick={() => { setSeleccion(p.id); setImagenActiva(0); setErrorArchivo(""); }}
                      className={clases("flex items-center gap-2 rounded-md border px-3 py-2.5 text-left transition", seleccion === p.id ? BOTON_ACTIVO : BOTON_NORMAL)}
                    >
                      <Icono size={17} className="shrink-0" />
                      <span className="min-w-0"><span className="block text-xs font-semibold">Contenido {i + 1}</span><span className="block text-[11px] font-normal capitalize opacity-75">{p.tipo}</span></span>
                      {p.archivos.length > 0 && <CircleCheck size={13} className="ml-auto shrink-0 text-orange-600" />}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)]">
              <div className="min-w-0 space-y-4">
                <BloqueDesplegable titulo="Contenidos" descripcion="Formato, archivos, día y hora" abierto={desplegables.contenidos}
                  alAlternar={() => setDesplegables((a) => ({ ...a, contenidos: !a.contenidos }))}>
                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="text-sm font-semibold">Contenido {indice + 1}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{redes.length} {redes.length === 1 ? "red" : "redes"}</span>
                  <button type="button" onClick={() => { setDesplegables((a) => ({ ...a, vista: true })); requestAnimationFrame(() => vistaRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })); }}
                    className="text-xs font-semibold text-orange-700 underline underline-offset-2 lg:hidden">Ver vista previa</button>
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                <Campo titulo="Día preferido de publicación">
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
              <p className="mt-2 text-xs leading-5 text-slate-500">Tras la aprobación organizamos tus 4 publicaciones dentro de 7 días consecutivos, desde la primera fecha confirmada, según tu zona horaria.</p>
              {contenidos.some((p) => p.id !== contenido.id && p.dia === contenido.dia && p.hora === contenido.hora) && (
                <p className="mt-2 text-xs text-amber-700" role="status">Otro contenido tiene el mismo día y horario. {t("Podés mantenerlos o elegir horas diferentes.", "Puedes mantenerlos o elegir horas diferentes.")}</p>
              )}

              <div className="mt-5 border-t border-slate-100 pt-4">
                <label className="mb-2 block text-sm font-semibold">
                  {contenido.tipo === "reel" ? "Video del reel" : contenido.tipo === "carrusel" ? "Imágenes del carrusel (2 a 10)" : "Imagen de la publicación"}
                </label>
                <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-center transition hover:border-orange-500 hover:bg-orange-50/40">
                  <CloudUpload size={21} className="text-orange-700" />
                  <span className="text-sm font-semibold text-slate-800">
                    {contenido.archivos.length === 0 ? "Seleccionar archivos para la vista previa" : contenido.tipo === "carrusel" && contenido.archivos.length < 10 ? "Agregar imágenes" : "Reemplazar archivos"}
                  </span>
                  <span className="text-xs text-slate-500">
                    {contenido.tipo === "reel" ? "Video MP4 · hasta 150 MB" : "JPG, PNG o WebP · hasta 20 MB por imagen"}
                  </span>
                  <input className="sr-only" type="file" accept={contenido.tipo === "reel" ? "video/mp4,.mp4" : "image/jpeg,image/png,image/webp"} multiple={contenido.tipo === "carrusel"} onChange={agregarArchivos} />
                </label>
                <p className="mt-1.5 text-xs leading-5 text-slate-500">Los archivos de esta vista previa no se envían todavía. Podrás subir los definitivos al preparar el pedido gratuito.</p>
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
                {contenido.tipo === "carrusel" && <p className="mt-2 text-xs text-slate-500">{contenido.archivos.length}/10 imágenes seleccionadas. {t("Podés verlas una por una en la vista previa.", "Puedes verlas una por una en la vista previa.")}</p>}
              </div>
                </BloqueDesplegable>
                <BloqueDesplegable titulo="Texto y detalles de la publicación" descripcion="Mensaje, llamadas a la acción, enlaces y hashtags" abierto={desplegables.textos}
                  alAlternar={() => setDesplegables((a) => ({ ...a, textos: !a.textos }))}>
                  <div className="space-y-4">
                <Campo titulo={t("¿Qué querés comunicar?", "¿Qué quieres comunicar?")} ayuda={t("Contanos tu idea. Nosotros preparamos el texto final y lo enviamos para tu aprobación.", "Nosotros preparamos el texto final y lo enviamos para tu aprobación.")}>
                  <textarea className={INPUT} rows={3} maxLength={1500} value={contenido.descripcion} onChange={(e) => actualizarContenido(contenido.id, { descripcion: e.target.value })} placeholder="Ej.: Queremos contar cómo elaboramos nuestros productos..." />
                </Campo>
                <div className="grid gap-3 sm:grid-cols-2">
                  {redes.includes("instagram") && (
                    <div>
                      <Campo titulo={<span className="inline-flex items-center gap-2"><LogoRed red="instagram" size={19} /> CTA para Instagram (opcional)</span>}
                        ayuda={t(
                          "Usá nuestras sugerencias como ‘Enlace en nuestra bio’ o ‘Escribinos por mensaje’, o escribí las tuyas propias.",
                          "Usá nuestras sugerencias como ‘Enlace en nuestra bio’ o ‘Escribinos por mensaje’, o escribí las tuyas propias."
                        )}>
                        <input className={INPUT} maxLength={100} list={`cta-instagram-${contenido.id}`} value={contenido.ctaInstagram}
                          onChange={(e) => actualizarContenido(contenido.id, { ctaInstagram: e.target.value })}
                          placeholder={t("Ej.: Enlace en nuestra bio", "Ej.: Enlace en nuestra biografía")} />
                      </Campo>
                      <datalist id={`cta-instagram-${contenido.id}`}>
                        <option value={t("Enlace en nuestra bio", "Enlace en nuestra biografía")} />
                        <option value={t("Escribinos por mensaje privado", "Escríbenos por mensaje privado")} />
                        <option value={t("Conocé más en nuestro perfil", "Conoce más en nuestro perfil")} />
                        <option value={t("Mirá nuestros productos en el perfil", "Mira nuestros productos en el perfil")} />
                        <option value={t("Dejanos tu opinión", "Déjanos tu opinión")} />
                      </datalist>
                    </div>
                  )}
                  {redes.includes("facebook") && (
                    <div className="space-y-4">
                      <Campo titulo={<span className="inline-flex items-center gap-2"><LogoRed red="facebook" size={19} /> CTA para Facebook (opcional)</span>}>
                        <input className={INPUT} maxLength={100} list={`cta-facebook-${contenido.id}`} value={contenido.ctaFacebook}
                          onChange={(e) => actualizarContenido(contenido.id, { ctaFacebook: e.target.value })}
                          placeholder={t("Ej.: Visitá nuestra tienda", "Ej.: Visita nuestra tienda")} />
                      </Campo>
                      <datalist id={`cta-facebook-${contenido.id}`}>
                        <option value={t("Visitá nuestra tienda", "Visita nuestra tienda")} />
                        <option value={t("Escribinos por WhatsApp", "Escríbenos por WhatsApp")} />
                        <option value={t("Conocé más", "Conoce más")} />
                        <option value={t("Envianos un mensaje", "Envíanos un mensaje")} />
                        <option value={t("Dejanos tu opinión", "Déjanos tu opinión")} />
                      </datalist>
                      <Campo titulo="Enlace o sitio web para Facebook (opcional)" ayuda="Se mostrará tal como lo escribas. Podés usar https://tusitio.com, www.tusitio.com o tusitio.com.">
                        <input className={INPUT} type="text" inputMode="url" maxLength={500} value={contenido.urlFacebook}
                          onChange={(e) => actualizarContenido(contenido.id, { urlFacebook: e.target.value })}
                          placeholder="tusitio.com" />
                      </Campo>
                    </div>
                  )}
                </div>
                <Campo titulo="Hashtags (opcional)">
                  <input className={INPUT} maxLength={240} value={contenido.hashtags} onChange={(e) => actualizarContenido(contenido.id, { hashtags: e.target.value })} placeholder="#MiNegocio #Comunidad" />
                </Campo>
              </div>
                </BloqueDesplegable>
              </div>
              <div ref={vistaRef} className="min-w-0 scroll-mt-20 lg:sticky lg:top-5">
                <BloqueDesplegable titulo="Vista previa" descripcion={`Contenido ${indice + 1} · Así se verá en cada red`} abierto={desplegables.vista}
                  alAlternar={() => setDesplegables((a) => ({ ...a, vista: !a.vista }))}>
                  <div className="mb-3 flex gap-2" role="group" aria-label="Vista previa por red">
                    {redes.map((red) => (
                      <button key={red} type="button" onClick={() => setRedVista(red)} aria-pressed={vistaActual === red}
                        className={clases("inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition", vistaActual === red ? BOTON_ACTIVO : BOTON_NORMAL)}>
                        <LogoRed red={red} size={17} /> {red === "instagram" ? "Instagram" : "Facebook"}
                      </button>
                    ))}
                  </div>
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center gap-2 px-3 py-2.5">
                      <LogoRed red={vistaActual} size={26} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900">{vistaActual === "instagram" ? usuarioVista : nombreVista}</p>
                        <p className="text-[11px] text-slate-500">{vistaActual === "instagram" ? "Instagram" : "Página de Facebook · Público"}</p>
                      </div>
                      <MoreHorizontal size={18} className="text-slate-400" />
                    </div>
                    {vistaActual === "facebook" && leyendaVista}
                    <div className="bg-slate-50 px-2 py-3">
                      <div className={clases("relative mx-auto overflow-hidden rounded-md bg-slate-100", contenido.formato === "9:16" ? "w-full max-w-[216px]" : "w-full max-w-[310px]")}
                        style={{ aspectRatio: contenido.formato.replace(":", " / ") }}>
                        {archivoActivo ? (contenido.tipo === "reel"
                          ? <video key={archivoActivo.url} src={archivoActivo.url} controls playsInline preload="metadata" className="h-full w-full object-contain" aria-label="Vista previa del video" />
                          : <img src={archivoActivo.url} alt={`Imagen ${imagenActiva + 1} de la publicación`} className="h-full w-full object-contain" />
                        ) : (
                          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-3 text-center text-slate-400">
                            <FileImage size={27} strokeWidth={1.5} />
                            <p className="text-xs leading-5">{t("Elegí", "Elige")} {contenido.tipo === "reel" ? "un video" : "imágenes"} para ver la publicación</p>
                          </div>
                        )}
                        {contenido.tipo === "carrusel" && archivosVista.length > 1 && (
                          <>
                            <button type="button" onClick={() => setImagenActiva((i) => (i - 1 + archivosVista.length) % archivosVista.length)} aria-label="Imagen anterior"
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1.5 text-slate-800"><ChevronLeft size={16} /></button>
                            <button type="button" onClick={() => setImagenActiva((i) => (i + 1) % archivosVista.length)} aria-label="Imagen siguiente"
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md bg-white/90 p-1.5 text-slate-800"><ChevronRight size={16} /></button>
                            <span className="absolute right-1.5 top-1.5 rounded-md bg-black/65 px-2 py-1 text-[10px] text-white">{imagenActiva + 1}/{archivosVista.length}</span>
                          </>
                        )}
                      </div>
                    </div>
                    {vistaActual === "instagram" ? (
                      <>
                        <div className="flex items-center gap-3 px-3 pt-3 text-slate-800" aria-label="Acciones orientativas de Instagram">
                          <Heart size={19} /><MessageCircle size={19} /><Send size={19} />
                        </div>
                        {leyendaVista}
                      </>
                    ) : (
                      <div className="flex items-center justify-around border-t border-slate-100 px-3 py-2 text-xs text-slate-500" aria-label="Acciones orientativas de Facebook">
                        <span className="inline-flex items-center gap-1"><ThumbsUp size={15} /> Me gusta</span>
                        <span className="inline-flex items-center gap-1"><MessageCircle size={15} /> Comentar</span>
                        <span className="inline-flex items-center gap-1"><Send size={15} /> Compartir</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-500">Vista orientativa. La apariencia puede variar según la red social.</p>
                </BloqueDesplegable>
              </div>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
              <span>{contenidosConArchivos}/4 con archivos · {contenidosConIdea}/4 con textos</span>
              <span>{totalPublicaciones} publicaciones · 7 días</span>
            </div>
          </section>
        )}

        {pasoActivo === 2 && (
          <section className={TARJETA} aria-labelledby="paso-negocio">
            <div className="mb-4">
              <h2 id="paso-negocio" className="text-base font-semibold">Datos del emprendimiento</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Identifican tu pedido y personalizan cómo aparecerá tu negocio.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
                <Campo titulo="Nombre del emprendimiento">
                  <input className={INPUT} value={negocio.nombre} maxLength={120} onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })} placeholder="Ej.: Panadería del Centro" />
                </Campo>
                <Campo titulo="Nombre de contacto">
                  <input className={INPUT} autoComplete="name" maxLength={120} value={negocio.contacto} onChange={(e) => setNegocio({ ...negocio, contacto: e.target.value })} placeholder="Nombre y apellido" />
                </Campo>
                <Campo titulo="Correo electrónico" ayuda={correoVerificado ? "Correo verificado de tu cuenta. El pedido aparecerá automáticamente en Mi panel." : "Usá el correo con el que vas a entrar a Comunidad Semanal."}>
                  <input className={INPUT} type="email" autoComplete="email" maxLength={160} value={negocio.email} readOnly={Boolean(correoVerificado)} onChange={(e) => setNegocio({ ...negocio, email: e.target.value })} placeholder="correo@negocio.com" />
                </Campo>
                <Campo titulo="Web o enlace principal (opcional)" ayuda="Podés escribir https://tusitio.com, www.tusitio.com o tusitio.com.">
                  <input className={INPUT} type="text" inputMode="url" maxLength={300} value={negocio.url} onChange={(e) => setNegocio({ ...negocio, url: e.target.value })} placeholder="tusitio.com" />
                </Campo>
                <Campo titulo="WhatsApp (opcional)">
                  <input className={INPUT} type="tel" autoComplete="tel" maxLength={50} value={negocio.whatsapp} onChange={(e) => setNegocio({ ...negocio, whatsapp: e.target.value })} placeholder="+54 ..." />
                </Campo>
              </div>
            {errorPaso && <p role="alert" className="mt-3 text-xs text-red-700">{errorPaso}</p>}
          </section>
        )}

        {pasoActivo === 3 && (
          <section className={TARJETA} aria-labelledby="paso-confirmar">
            <div className="mb-4">
              <h2 id="paso-confirmar" className="text-base font-semibold">Revisar y preparar el pedido</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">Comprobá la selección y completá la verificación de seguridad.</p>
            </div>
            <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-sm sm:grid-cols-4">
              <div><p className="text-[11px] text-slate-500">Redes</p><p className="font-semibold text-slate-900">{redes.length}</p></div>
              <div><p className="text-[11px] text-slate-500">Contenidos</p><p className="font-semibold text-slate-900">4</p></div>
              <div><p className="text-[11px] text-slate-500">Publicaciones</p><p className="font-semibold text-slate-900">{totalPublicaciones}</p></div>
              <div><p className="text-[11px] text-slate-500">Archivos en vista previa</p><p className="font-semibold text-slate-900">{contenidosConArchivos}/4</p></div>
            </div>
            <div className="mb-5"><div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-700" />
                <div>
                  <p className="text-sm font-semibold">Conexión segura de tus redes</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Para publicar en Instagram necesitás una cuenta profesional compatible; para Facebook, una página que puedas administrar. La autorización se realizará desde Meta, sin pedirte contraseñas.</p>
                  <div className="mt-2 flex items-center gap-3" aria-label="Redes compatibles para conectar">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><LogoRed red="instagram" size={18} /> Instagram</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><LogoRed red="facebook" size={18} /> Facebook</span>
                  </div>
                </div>
              </div></div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2" role="group" aria-label="Elegir moneda">
              {[
                { id: "ARS", nombre: "Pesos argentinos", detalle: "ARS · Transferencia bancaria", Icono: Landmark },
                { id: "USD", nombre: "Dólares estadounidenses", detalle: "USD · PayPal", Icono: CircleDollarSign },
              ].map(({ id, nombre, detalle, Icono }) => (
                <button key={id} type="button" aria-pressed={moneda === id} onClick={() => setMoneda(id)}
                  className={clases("flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-400",
                    moneda === id ? "border-orange-400 bg-orange-50 shadow-sm" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50")}>
                  <span className={clases("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                    moneda === id ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-600")}>
                    <Icono size={20} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-slate-900">{nombre}</span>
                    <span className="mt-0.5 block text-[11px] font-normal text-slate-500">{detalle}</span>
                  </span>
                  <span className={clases("h-4 w-4 shrink-0 rounded-full border-2",
                    moneda === id ? "border-orange-600 bg-orange-600 ring-2 ring-orange-100" : "border-slate-300")} aria-hidden="true" />
                </button>
              ))}
            </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                <ShieldCheck size={18} className="text-orange-700" />
                <span>Sin pago ni tarjeta durante la prueba</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                El registro de la prueba es gratuito. La programación comenzará cuando el servicio esté habilitado.
              </p>
              <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
                <div><p className="text-sm text-slate-600">Tu prueba gratuita</p><p className="mt-0.5 text-xs text-slate-500">{redes.length} {redes.length === 1 ? "red" : "redes"} · hasta {totalPublicaciones} publicaciones</p></div>
                <p className="text-xl font-semibold text-slate-900">{precioFormateado(0, moneda)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">Después de los siete días: {precioFormateado(precio, moneda)} por semana, solo si decidís contratar.</p>
              {!precioConfirmado && (
                <div className="mt-3 text-xs leading-5 text-slate-600" role="status">
                  {estadoPlan === "cargando" ? "Consultando el precio actualizado..." : (
                    <span>
                      {errorPlan} El importe mostrado es orientativo. {" "}
                      <button type="button" onClick={() => setRevisionPlan((n) => n + 1)} className="font-semibold text-orange-700 underline underline-offset-2">Reintentar</button>
                    </span>
                  )}
                </div>
              )}
              {!pedidoCreado && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-slate-800"><ShieldCheck size={17} className="text-orange-600" /> Verificación de seguridad</div>
                  {turnstileSiteKey
                    ? <VerificacionHumana key={`${turnstileSiteKey}-${revisionTurnstile}`} clave={turnstileSiteKey} onToken={setTurnstileToken} />
                    : <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800" role="status">Cloudflare Turnstile no está disponible en este momento. No se pueden crear pedidos hasta que se configure en el servidor.</p>}
                  {turnstileSiteKey && !creacionDisponible && <p role="status" className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    La creación de pruebas todavía está restringida desde el servidor{planServidor?.pruebaModoPrivado ? " a Administración" : ""}. Podés revisar el formulario, pero no registrar un pedido hasta su habilitación.
                  </p>}
                </div>
              )}
              {pedidoCreado ? (
                <div className="mt-5 rounded-lg border border-orange-200 bg-orange-50 p-3 sm:p-4" role="status" aria-live="polite">
                  <div className="flex items-center gap-2 text-sm font-semibold text-orange-900"><CircleCheck size={18} /> {pedidoCreado.modalidad === "prueba_gratuita" ? "Prueba gratuita preparada" : "Pedido registrado"}</div>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-900">Código: {pedidoCreado.id}</p>
                  <p className="mt-1 text-xs text-slate-700">{pedidoCreado.modalidad === "prueba_gratuita" ?
                    `Prueba: ${precioFormateado(0, pedidoCreado.moneda)} · Renovación opcional: ${precioFormateado(pedidoCreado.precioRenovacion ?? precio, pedidoCreado.moneda)} por semana` :
                    `Importe validado: ${precioFormateado(pedidoCreado.precio, pedidoCreado.moneda)} · ${pedidoCreado.metodoPago === "paypal" ? "PayPal" : "Transferencia"}`}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{pedidoCreado.modalidad === "prueba_gratuita" ?
                    "El pedido ya está registrado sin pago. Ahora podés cargar los archivos definitivos y conectar las redes autorizadas. Los siete días todavía no comienzan." :
                    "La carga definitiva y la conexión de redes se habilitarán después de confirmar el pago."}</p>
                  <div className="mt-4 rounded-lg border border-orange-200 bg-white p-3">
                    <p className="text-sm font-semibold text-slate-900">Guardá el acceso a tu pedido</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Podrás volver otro día o desde otro dispositivo, sin tener que configurar ni pagar nuevamente. Este acceso es privado: no lo compartas con otras personas.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copiarAccesoServicio("enlace")}
                        className="rounded-md bg-orange-600 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-700">
                        Copiar enlace privado
                      </button>
                      <button type="button" onClick={() => copiarAccesoServicio("clave")}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                        Copiar clave de acceso
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">Si guardás solamente la clave, también necesitarás el código de pedido que aparece arriba. Por seguridad, no enviamos estos datos por correo automáticamente.</p>
                    {avisoAcceso && <p className="mt-2 text-xs text-slate-700" role="status">{avisoAcceso}</p>}
                  </div>
                  {pedidoCreado.modalidad !== "prueba_gratuita" && pedidoCreado.moneda === "ARS" && <TransferenciaPedidoServicio pedido={pedidoCreado} habilitada={transferenciasDisponibles} />}
                  {pedidoCreado.tokenAcceso && <ConexionFacebookPedido key={pedidoCreado.id} pedido={pedidoCreado} />}
                  {pedidoCreado.tokenAcceso && <ArchivosPedido key={`archivos-${pedidoCreado.id}`} pedido={pedidoCreado} />}
                  <button type="button" onClick={comenzarNuevoPedido} className="mt-4 text-xs font-semibold text-orange-700 underline underline-offset-2">Configurar otro pedido</button>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={crearPedido}
                    disabled={!creacionDisponible || !turnstileToken || creandoPedido}
                    className={clases("inline-flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-semibold transition",
                      creacionDisponible && turnstileToken && !creandoPedido
                        ? "bg-orange-600 text-white hover:bg-orange-700"
                        : "cursor-not-allowed bg-slate-300 text-white")}
                  >
                    {creandoPedido ? "Preparando pedido..." : pruebasDisponibles ? (
                      <><ShieldCheck size={16} /> Preparar mi prueba gratuita</>
                    ) : pedidosDisponibles ? (
                      <><ShieldCheck size={16} /> Continuar con transferencia</>
                    ) : <><LockKeyhole size={16} /> Prueba gratuita todavía en preparación</>}
                  </button>
                  <button type="button" onClick={descargarConfiguracion} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50">
                    <Download size={16} /> Guardar configuración
                  </button>
                </div>
              )}
              {!pedidoCreado && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <button type="button" onClick={() => { setMostrarRecuperacion((actual) => !actual); setErrorRecuperacion(""); }}
                    className="text-sm font-semibold text-orange-700 underline underline-offset-2">
                    ¿Ya tenés un pedido? Recuperar acceso
                  </button>
                  {mostrarRecuperacion && (
                    <form onSubmit={recuperarPedido} className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-xs leading-5 text-slate-600">Pegá tu enlace privado completo o ingresá el código de pedido y la clave de acceso que guardaste.</p>
                      <div>
                        <label htmlFor="recuperar-pedido-codigo" className="mb-1 block text-xs font-semibold text-slate-800">Código de pedido (si usás la clave)</label>
                        <input id="recuperar-pedido-codigo" autoComplete="off" spellCheck={false} value={codigoRecuperacion}
                          onChange={(e) => setCodigoRecuperacion(e.target.value)} placeholder="SER-..." className={INPUT} />
                      </div>
                      <div>
                        <label htmlFor="recuperar-pedido-clave" className="mb-1 block text-xs font-semibold text-slate-800">Enlace privado o clave de acceso</label>
                        <input id="recuperar-pedido-clave" type="password" autoComplete="off" spellCheck={false} value={claveRecuperacion}
                          onChange={(e) => setClaveRecuperacion(e.target.value)} placeholder="Pegá acá tu enlace o clave" className={INPUT} />
                      </div>
                      <button type="submit" disabled={recuperandoPedido} className={clases("rounded-md px-3 py-2.5 text-sm font-semibold", recuperandoPedido ? "bg-slate-300 text-white" : "bg-orange-600 text-white hover:bg-orange-700")}>
                        {recuperandoPedido ? "Verificando acceso..." : "Abrir mi pedido"}
                      </button>
                      {errorRecuperacion && <p role="alert" className="text-xs leading-5 text-red-700">{errorRecuperacion}</p>}
                    </form>
                  )}
                </div>
              )}
              {pedidoCreado && (
                <button type="button" onClick={descargarConfiguracion} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50">
                  <Download size={15} /> Guardar una copia de la configuración
                </button>
              )}
              {errorPedido && <p className="mt-3 text-xs leading-5 text-red-700" role="alert">{errorPedido}</p>}
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {pruebasDisponibles
                  ? "Preparar la prueba no activa ningún cobro ni publicación. La publicación de los contenidos comenzará cuando las cuentas estén vinculadas y los contenidos aprobados."
                  : pedidosDisponibles
                  ? "Primero registramos el pedido con el precio oficial. Después podrás transferir y adjuntar el comprobante para verificación manual."
                  : "Podés revisar los contenidos y guardar la configuración. La preparación de pruebas gratuitas sigue cerrada al público."}
              </p>
          </section>
        )}

        <footer className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm sm:px-5">
          <button type="button" disabled={pasoActivo === 0} onClick={() => irAlPaso(pasoActivo - 1)}
            className={clases("inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition", pasoActivo === 0 ? "cursor-not-allowed border-slate-100 text-slate-300" : "border-slate-300 text-slate-700 hover:bg-slate-50")}>
            <ChevronLeft size={16} /> Anterior
          </button>
          <span className="text-xs text-slate-500">{pasoActivo + 1} de 4</span>
          {pasoActivo < 3 ? (
            <button type="button" onClick={() => irAlPaso(pasoActivo + 1)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700">
              Continuar <ChevronRight size={16} />
            </button>
          ) : (
            <a href="/servicios/publicacion-automatica/mi-panel" className="text-xs font-semibold text-orange-700 underline underline-offset-2">Mi panel</a>
          )}
        </footer>
      </div>
    </main>
  );
}
