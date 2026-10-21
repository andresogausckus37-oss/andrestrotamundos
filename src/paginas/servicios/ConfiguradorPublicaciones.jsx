import { useEffect, useRef, useState } from "react";
import ConexionFacebookPedido from "./ConexionFacebookPedido";
import ArchivosPedido from "./ArchivosPedido";
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
const INPUT = "w-full rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-normal text-slate-900 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100";
const BOTON_ACTIVO = "border-orange-500 bg-orange-50 text-orange-800";
const TARJETA = "rounded-md border border-slate-200 bg-white p-5 shadow-sm sm:p-7";
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
      <span className="mb-1.5 block text-sm font-medium text-slate-800">{titulo}</span>
      {children}
      {ayuda && <span className="mt-1.5 block text-xs leading-5 text-slate-500">{ayuda}</span>}
    </label>
  );
}

function TituloSeccion({ numero, titulo, descripcion }) {
  return (
    <div className="mb-6 flex items-start gap-3.5 border-b border-slate-100 pb-5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-orange-50 text-sm font-medium text-orange-700">
        {numero}
      </span>
      <div className="min-w-0 pt-0.5">
        <h2 className="text-lg font-medium leading-7 text-slate-900">{titulo}</h2>
        {descripcion && <p className="mt-1 text-sm leading-6 text-slate-500">{descripcion}</p>}
      </div>
    </div>
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
      <h3 className="text-sm font-medium text-slate-900">Transferencia bancaria</h3>
      {cargando && <p className="mt-2 text-xs text-slate-600" role="status">Consultando los datos bancarios...</p>}
      {detalle && (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-700">Importe a transferir: <span className="font-medium">{precioFormateado(detalle.precio, "ARS")}</span></p>
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
                  <p className="select-text break-all text-sm font-medium text-slate-900">{valor || "No disponible"}</p>
                </div>
                {valor && <button type="button" onClick={() => copiarDato(valor, nombre)} className="shrink-0 rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50" aria-label={`Copiar ${nombre}`}>
                  {copiado === nombre ? "Copiado" : "Copiar"}
                </button>}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-600">Estado: <span className="font-medium text-slate-800">{estados[detalle.estado] || detalle.estado}</span></p>
          {detalle.estado === "pendiente_comprobante" ? (
            <form onSubmit={enviarComprobante} className="space-y-3 rounded-md border border-slate-200 bg-white p-3">
              <label className="block text-sm font-medium text-slate-800" htmlFor="comprobante-servicio">Adjuntá el comprobante de transferencia</label>
              <input id="comprobante-servicio" type="file" accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf" className="block w-full text-xs text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-2 file:font-medium file:text-orange-800" onChange={(e) => { setArchivo(e.target.files?.[0] || null); setError(""); }} />
              <p className="text-xs text-slate-500">JPG, PNG o PDF, hasta 8 MB. La confirmación del pago es manual.</p>
              <button type="submit" disabled={!archivo || subiendo} className={clases("inline-flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium", archivo && !subiendo ? "bg-orange-600 text-white hover:bg-orange-700" : "cursor-not-allowed bg-slate-300 text-white")}>
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
  const urlValida = (valor, soloHttps = false) => {
    if (!valor.trim()) return true;
    try {
      const url = new URL(valor.trim());
      return (soloHttps ? url.protocol === "https:" : ["http:", "https:"].includes(url.protocol)) &&
        !url.username && !url.password && Boolean(url.hostname);
    } catch { return false; }
  };
  if (!urlValida(negocio.url)) return "Revisá la dirección web de tu emprendimiento (incluí https://).";
  if (contenidos.some((p) => !urlValida(p.urlFacebook, true))) {
    return "Las URL de Facebook deben comenzar con https:// y ser válidas.";
  }
  if (contenidos.some((p) => p.archivos.some(({ archivo }) => !archivo.size))) {
    return "Uno de los archivos seleccionados está vacío. Quitalo de la vista previa.";
  }
  return "";
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
          setNegocio(actual => actual.email.trim() ? actual : { ...actual, email: datos.email });
        }
      }).catch(() => {});
    return () => controlador.abort();
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-100 px-4 pb-20 pt-7 font-normal text-slate-900 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-7xl">
        <header className={clases(TARJETA, "mb-8 sm:mb-10")}>
          <div className="mb-2 inline-flex items-center gap-2 rounded-md bg-orange-50 px-2.5 py-1.5 text-xs font-medium text-orange-700">
            <CalendarDays size={14} /> Plan semanal de 7 días
          </div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-[28px]">{t("Configurá tus publicaciones", "Configura tus publicaciones")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {t(
              "Elegí las redes, prepará tus ideas y definí los días y horarios. Podés revisar las publicaciones antes de contratar. Nosotros nos encargamos de preparar el contenido final y gestionar la programación.",
              "Elige las redes, prepara tus ideas y define los días y horarios. Puedes revisar las publicaciones antes de contratar. Nosotros nos encargamos de preparar el contenido final y gestionar la programación."
            )}
          </p>
        </header>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_350px] lg:gap-9">
          <div className="min-w-0 space-y-8 sm:space-y-10">
            <section className={TARJETA} aria-labelledby="config-plan">
              <div id="config-plan"><TituloSeccion numero="01" titulo="Plan y redes" descripcion="Cuatro contenidos originales en un período flexible de siete días consecutivos." /></div>
              <div className="mb-7 grid grid-cols-3 gap-3 rounded-md border border-slate-200 bg-white px-3 py-4 sm:px-4 sm:py-5">
                {[[PLAN.contenidos, "Contenidos"], [PLAN.duracionDias, "Días"], [totalPublicaciones, "Publicaciones"]].map(([numero, descripcion]) => (
                  <div key={descripcion} className="text-center">
                    <p className="text-lg font-medium leading-6 text-slate-900">{numero}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">{descripcion}</p>
                  </div>
                ))}
              </div>

              <h3 className="mb-3 text-base font-medium">{t("Elegí dónde querés publicar", "Elige dónde quieres publicar")}</h3>
              <div className="grid grid-cols-3 gap-3">
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
                      {activa && <Check size={13} className="absolute right-2 top-2 text-orange-700" aria-hidden="true" />}
                      <LogoRed red={red.id} size={24} className={!red.disponible ? "opacity-50" : ""} />
                      <span>{red.nombre}</span>
                      {!red.disponible && <span className="text-[10px] font-normal text-slate-500">Pronto</span>}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-500">Una red incluye 4 publicaciones; las dos redes, 8. Cada contenido se prepara para las redes que elijas.</p>

              <div className="mt-8 border-t border-slate-100 pt-6">
                <Campo titulo="Zona horaria de tus publicaciones" ayuda="Cada publicación respeta la hora local de la zona elegida, sin usar automáticamente la hora de Argentina.">
                  <select id="zona-horaria" aria-label="Zona horaria de tus publicaciones" className={INPUT} value={zonaHoraria} onChange={(e) => setZonaHoraria(e.target.value)}>
                    {ZONAS_DISPONIBLES.flatMap(({ pais, zonas }) =>
                      [...zonas].sort((a, b) => a[1].localeCompare(b[1], "es", { sensitivity: "base" })).map(([id, ciudad]) => (
                        <option key={id} value={id}>{pais} · {ciudad}</option>
                      ))
                    )}
                  </select>
                </Campo>
              </div>
              <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-600">
                <CalendarDays size={15} className="mt-0.5 shrink-0 text-orange-700" />
                {t(
                  "Podés preparar el pedido gratuito sin pagar. Los siete días comenzarán cuando habilitemos la activación, se vinculen las cuentas y se aprueben los contenidos. No hay publicaciones automáticas durante esta etapa de pruebas.",
                  "Puedes preparar el pedido gratuito sin pagar. Los siete días comenzarán cuando habilitemos la activación, se vinculen las cuentas y se aprueben los contenidos. No hay publicaciones automáticas durante esta etapa de pruebas."
                )}
              </p>
            </section>

            <section className={TARJETA} aria-labelledby="config-contenidos">
              <div id="config-contenidos"><TituloSeccion numero="02" titulo="Tus cuatro contenidos" descripcion={t("Personalizá cada contenido. Podés cambiar el formato, el día y la hora.", "Personaliza cada contenido. Puedes cambiar el formato, el día y la hora.")} /></div>
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
                      <span className="min-w-0"><span className="block text-xs font-medium">Contenido {i + 1}</span><span className="block text-[11px] font-normal capitalize opacity-75">{p.tipo}</span></span>
                      {p.archivos.length > 0 && <CircleCheck size={13} className="ml-auto shrink-0 text-orange-600" />}
                    </button>
                  );
                })}
              </div>

              <div className="mt-7 flex items-center justify-between gap-3 border-t border-slate-100 pt-6">
                <h3 className="text-sm font-medium">Contenido {indice + 1}</h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">{redes.length} {redes.length === 1 ? "red" : "redes"}</span>
                  <button type="button" onClick={() => vistaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
                    className="text-xs font-medium text-orange-700 underline underline-offset-2 lg:hidden">Ver vista previa</button>
                </div>
              </div>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
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
              <p className="mt-2 text-xs leading-5 text-slate-500">Los días y horarios son preferencias. Tras la aprobación organizamos las cuatro publicaciones dentro de siete días consecutivos, desde la primera fecha confirmada, según tu zona horaria.</p>
              {contenidos.some((p) => p.id !== contenido.id && p.dia === contenido.dia && p.hora === contenido.hora) && (
                <p className="mt-2 text-xs text-amber-700" role="status">Otro contenido tiene el mismo día y horario. {t("Podés mantenerlos o elegir horas diferentes.", "Puedes mantenerlos o elegir horas diferentes.")}</p>
              )}

              <div className="mt-7 border-t border-slate-100 pt-6">
                <label className="mb-2 block text-sm font-medium">
                  {contenido.tipo === "reel" ? "Video del reel" : contenido.tipo === "carrusel" ? "Imágenes del carrusel (2 a 10)" : "Imagen de la publicación"}
                </label>
                <label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-md border border-dashed border-slate-300 bg-white px-4 py-4 text-center transition hover:border-orange-500">
                  <CloudUpload size={21} className="text-orange-700" />
                  <span className="text-sm font-medium text-slate-800">
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

              <div className="mt-7 space-y-5 border-t border-slate-100 pt-6">
                <Campo titulo={t("¿Qué querés comunicar?", "¿Qué quieres comunicar?")} ayuda={t("Contanos tu idea. Nosotros preparamos el texto final y lo enviamos para tu aprobación.", "Cuéntanos tu idea. Nosotros preparamos el texto final y lo enviamos para tu aprobación.")}>
                  <textarea className={INPUT} rows={3} maxLength={1500} value={contenido.descripcion} onChange={(e) => actualizarContenido(contenido.id, { descripcion: e.target.value })} placeholder="Ej.: Queremos contar cómo elaboramos nuestros productos..." />
                </Campo>
                <div className="grid gap-5 sm:grid-cols-2">
                  {redes.includes("instagram") && (
                    <div>
                      <Campo titulo={<span className="inline-flex items-center gap-2"><LogoRed red="instagram" size={19} /> CTA para Instagram (opcional)</span>}
                        ayuda={t(
                          "En Instagram los enlaces del texto no suelen ser clicables. Usá indicaciones como ‘Enlace en nuestra bio’ o ‘Escribinos por mensaje’.",
                          "En Instagram los enlaces del texto no suelen ser clicables. Usa indicaciones como ‘Enlace en nuestra biografía’ o ‘Escríbenos por mensaje’."
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
                      <Campo titulo="URL para Facebook (opcional)" ayuda={t(
                        "Pegá el enlace completo (https://...), por ejemplo tu tienda o https://wa.me/... Se verá debajo del CTA en la vista previa.",
                        "Pega el enlace completo (https://...), por ejemplo tu tienda o https://wa.me/... Se verá debajo del CTA en la vista previa."
                      )}>
                        <input className={INPUT} type="url" inputMode="url" maxLength={500} value={contenido.urlFacebook}
                          onChange={(e) => actualizarContenido(contenido.id, { urlFacebook: e.target.value })}
                          placeholder="https://..." />
                      </Campo>
                    </div>
                  )}
                </div>
                <Campo titulo="Hashtags (opcional)">
                  <input className={INPUT} maxLength={240} value={contenido.hashtags} onChange={(e) => actualizarContenido(contenido.id, { hashtags: e.target.value })} placeholder="#MiNegocio #Comunidad" />
                </Campo>
              </div>
            </section>

            <section className={TARJETA} aria-labelledby="config-negocio">
              <div id="config-negocio"><TituloSeccion numero="03" titulo="Datos de tu emprendimiento" descripcion="Información para identificar tu negocio y preparar las publicaciones." /></div>
              <div className="grid gap-5 sm:grid-cols-2">
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
              <div className="mt-7 flex items-start gap-3 rounded-md border border-slate-200 bg-white p-4">
                <ShieldCheck size={18} className="mt-0.5 shrink-0 text-orange-700" />
                <div>
                  <p className="text-sm font-medium">Conexión segura de tus redes</p>
                  <p className="mt-1 text-xs leading-5 text-slate-600">Para publicar en Instagram necesitás una cuenta profesional compatible; para Facebook, una página que puedas administrar. La autorización se realizará desde Meta, sin pedirte contraseñas.</p>
                  <div className="mt-2 flex items-center gap-3" aria-label="Redes compatibles para conectar">
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><LogoRed red="instagram" size={18} /> Instagram</span>
                    <span className="inline-flex items-center gap-1.5 text-xs text-slate-600"><LogoRed red="facebook" size={18} /> Facebook</span>
                  </div>
                </div>
              </div>
            </section>

            <section className={TARJETA} aria-labelledby="config-pago">
              <div id="config-pago"><TituloSeccion numero="04" titulo="Tu prueba gratuita" descripcion="Los cuatro contenidos serán gratuitos durante siete días cuando se habilite la activación. No se cobra por preparar el pedido." /></div>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Elegir moneda">
                {["ARS", "USD"].map((m) => (
                  <button key={m} type="button" aria-pressed={moneda === m} onClick={() => setMoneda(m)}
                    className={clases("rounded-md border px-3 py-2.5 text-sm font-medium transition", moneda === m ? BOTON_ACTIVO : BOTON_NORMAL)}>
                    {m === "ARS" ? "Pesos · ARS" : "Dólares · USD"}
                  </button>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-700">
                <ShieldCheck size={18} className="text-orange-700" />
                <span>Sin pago ni tarjeta durante la prueba</span>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">
                Los contenidos y la conexión de Facebook se preparan antes de activar el calendario. Todavía no se publicará nada.
              </p>
              <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-4">
                <div><p className="text-sm text-slate-600">Tu prueba gratuita</p><p className="mt-0.5 text-xs text-slate-500">{redes.length} {redes.length === 1 ? "red" : "redes"} · hasta {totalPublicaciones} publicaciones</p></div>
                <p className="text-xl font-medium text-slate-900">{precioFormateado(0, moneda)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">Después de los siete días: {precioFormateado(precio, moneda)} por semana, solo si decidís contratar.</p>
              {!precioConfirmado && (
                <div className="mt-3 text-xs leading-5 text-slate-600" role="status">
                  {estadoPlan === "cargando" ? "Consultando el precio actualizado..." : (
                    <span>
                      {errorPlan} El importe mostrado es orientativo. {" "}
                      <button type="button" onClick={() => setRevisionPlan((n) => n + 1)} className="font-medium text-orange-700 underline underline-offset-2">Reintentar</button>
                    </span>
                  )}
                </div>
              )}
              {creacionDisponible && !pedidoCreado && (
                <div className="mt-5 border-t border-slate-100 pt-4">
                  <p className="mb-2 text-sm font-medium text-slate-800">Verificación de seguridad</p>
                  <VerificacionHumana key={`${turnstileSiteKey}-${revisionTurnstile}`} clave={turnstileSiteKey} onToken={setTurnstileToken} />
                </div>
              )}
              {pedidoCreado ? (
                <div className="mt-5 rounded-md border border-orange-200 bg-orange-50 p-4" role="status" aria-live="polite">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-900"><CircleCheck size={18} /> {pedidoCreado.modalidad === "prueba_gratuita" ? "Prueba gratuita preparada" : "Pedido registrado"}</div>
                  <p className="mt-2 break-all text-sm font-medium text-slate-900">Código: {pedidoCreado.id}</p>
                  <p className="mt-1 text-xs text-slate-700">{pedidoCreado.modalidad === "prueba_gratuita" ?
                    `Prueba: ${precioFormateado(0, pedidoCreado.moneda)} · Renovación opcional: ${precioFormateado(pedidoCreado.precioRenovacion ?? precio, pedidoCreado.moneda)} por semana` :
                    `Importe validado: ${precioFormateado(pedidoCreado.precio, pedidoCreado.moneda)} · ${pedidoCreado.metodoPago === "paypal" ? "PayPal" : "Transferencia"}`}</p>
                  <p className="mt-2 text-xs leading-5 text-slate-700">{pedidoCreado.modalidad === "prueba_gratuita" ?
                    "El pedido ya está registrado sin pago. Ahora podremos probar la carga de archivos y la conexión de Facebook. Los siete días todavía no comienzan y no se publicará ningún contenido." :
                    "La carga definitiva y la conexión de redes se habilitarán después de confirmar el pago."}</p>
                  <div className="mt-4 rounded-md border border-orange-200 bg-white p-3">
                    <p className="text-sm font-medium text-slate-900">Guardá el acceso a tu pedido</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Podrás volver otro día o desde otro dispositivo, sin tener que configurar ni pagar nuevamente. Este acceso es privado: no lo compartas con otras personas.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button type="button" onClick={() => copiarAccesoServicio("enlace")}
                        className="rounded-md bg-orange-600 px-3 py-2 text-xs font-medium text-white hover:bg-orange-700">
                        Copiar enlace privado
                      </button>
                      <button type="button" onClick={() => copiarAccesoServicio("clave")}
                        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50">
                        Copiar clave de acceso
                      </button>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">Si guardás solamente la clave, también necesitarás el código de pedido que aparece arriba. Por seguridad, no enviamos estos datos por correo automáticamente.</p>
                    {avisoAcceso && <p className="mt-2 text-xs text-slate-700" role="status">{avisoAcceso}</p>}
                  </div>
                  {pedidoCreado.modalidad !== "prueba_gratuita" && pedidoCreado.moneda === "ARS" && <TransferenciaPedidoServicio pedido={pedidoCreado} habilitada={transferenciasDisponibles} />}
                  {pedidoCreado.tokenAcceso && <ConexionFacebookPedido key={pedidoCreado.id} pedido={pedidoCreado} />}
                  {pedidoCreado.tokenAcceso && <ArchivosPedido key={`archivos-${pedidoCreado.id}`} pedido={pedidoCreado} />}
                  <button type="button" onClick={comenzarNuevoPedido} className="mt-4 text-xs font-medium text-orange-700 underline underline-offset-2">Configurar otro pedido</button>
                </div>
              ) : (
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button type="button" onClick={crearPedido}
                    disabled={!creacionDisponible || !turnstileToken || creandoPedido}
                    className={clases("inline-flex items-center justify-center gap-2 rounded-md px-3 py-3 text-sm font-medium transition",
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
                  <button type="button" onClick={descargarConfiguracion} className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-50">
                    <Download size={16} /> Guardar configuración
                  </button>
                </div>
              )}
              {!pedidoCreado && (
                <div className="mt-5 border-t border-slate-200 pt-4">
                  <button type="button" onClick={() => { setMostrarRecuperacion((actual) => !actual); setErrorRecuperacion(""); }}
                    className="text-sm font-medium text-orange-700 underline underline-offset-2">
                    ¿Ya tenés un pedido? Recuperar acceso
                  </button>
                  {mostrarRecuperacion && (
                    <form onSubmit={recuperarPedido} className="mt-3 space-y-3 rounded-md border border-slate-200 bg-white p-3">
                      <p className="text-xs leading-5 text-slate-600">Pegá tu enlace privado completo o ingresá el código de pedido y la clave de acceso que guardaste.</p>
                      <div>
                        <label htmlFor="recuperar-pedido-codigo" className="mb-1 block text-xs font-medium text-slate-800">Código de pedido (si usás la clave)</label>
                        <input id="recuperar-pedido-codigo" autoComplete="off" spellCheck={false} value={codigoRecuperacion}
                          onChange={(e) => setCodigoRecuperacion(e.target.value)} placeholder="SER-..." className={INPUT} />
                      </div>
                      <div>
                        <label htmlFor="recuperar-pedido-clave" className="mb-1 block text-xs font-medium text-slate-800">Enlace privado o clave de acceso</label>
                        <input id="recuperar-pedido-clave" type="password" autoComplete="off" spellCheck={false} value={claveRecuperacion}
                          onChange={(e) => setClaveRecuperacion(e.target.value)} placeholder="Pegá acá tu enlace o clave" className={INPUT} />
                      </div>
                      <button type="submit" disabled={recuperandoPedido} className={clases("rounded-md px-3 py-2.5 text-sm font-medium", recuperandoPedido ? "bg-slate-300 text-white" : "bg-orange-600 text-white hover:bg-orange-700")}>
                        {recuperandoPedido ? "Verificando acceso..." : "Abrir mi pedido"}
                      </button>
                      {errorRecuperacion && <p role="alert" className="text-xs leading-5 text-red-700">{errorRecuperacion}</p>}
                    </form>
                  )}
                </div>
              )}
              {pedidoCreado && (
                <button type="button" onClick={descargarConfiguracion} className="mt-3 inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50">
                  <Download size={15} /> Guardar una copia de la configuración
                </button>
              )}
              {errorPedido && <p className="mt-3 text-xs leading-5 text-red-700" role="alert">{errorPedido}</p>}
              <p className="mt-3 text-xs leading-5 text-slate-500">
                {pruebasDisponibles
                  ? "Preparar la prueba no activa ningún cobro ni publicación. Los días comenzarán más adelante, con las cuentas autorizadas y los contenidos aprobados."
                  : pedidosDisponibles
                  ? "Primero registramos el pedido con el precio oficial. Después podrás transferir y adjuntar el comprobante para verificación manual."
                  : "Podés revisar los contenidos y guardar la configuración. La preparación de pruebas gratuitas sigue cerrada al público."}
              </p>
            </section>
          </div>

          <aside ref={vistaRef} className={clases(TARJETA, "min-w-0 scroll-mt-20 lg:sticky lg:top-24")} aria-label="Vista previa de publicaciones">
            <div className="mb-5 flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <h2 className="text-lg font-medium">Vista previa</h2>
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
                      <p className="text-xs leading-5">{t("Elegí", "Elige")} {contenido.tipo === "reel" ? "un video" : "imágenes"} para ver tu publicación</p>
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
                  {textoVista || t("Acá vas a ver la idea de tu publicación.", "Aquí verás la idea de tu publicación.")}
                </p>
                {ctaVista.trim() && <p className="mt-2 text-sm font-medium text-slate-800">{ctaVista}</p>}
                {urlVistaFacebook && <p className="mt-1 break-all text-sm text-orange-700 underline underline-offset-2">{urlVistaFacebook}</p>}
                {contenido.hashtags.trim() && <p className="mt-2 break-words text-sm text-orange-700">{contenido.hashtags}</p>}
              </div>
            </div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Simulación orientativa: la apariencia final puede variar según la red social. {t("Los textos finales se preparan para tu público.", "Los textos finales se adaptarán al español de tu público.")}</p>
            <div className="mt-5 border-t border-slate-200 pt-4">
              <h3 className="text-sm font-medium">Resumen semanal</h3>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between gap-3"><span className="text-slate-600">Redes seleccionadas</span><span className="text-right font-medium">{redes.map((red) => red === "instagram" ? "Instagram" : "Facebook").join(" · ")}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Publicaciones</span><span className="font-medium">{totalPublicaciones}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Contenidos con archivos</span><span className="font-medium">{contenidosConArchivos}/4</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Contenidos con ideas</span><span className="font-medium">{contenidosConIdea}/4</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-600">Período de publicaciones</span><span className="text-right font-medium">7 días desde el primer contenido</span></div>
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-slate-200 pt-3">
                <span className="text-sm text-slate-600">Total semanal</span>
                <span className="text-lg font-medium">{precioFormateado(0, moneda)}</span>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-500">Los materiales deben estar listos para publicar. La producción y edición profesional de fotos o videos se presupuestan por separado.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
