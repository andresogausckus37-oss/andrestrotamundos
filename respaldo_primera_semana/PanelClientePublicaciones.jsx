import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarCheck2, CheckCircle2, ChevronDown, CircleAlert,
  Clock3, Copy, ExternalLink, FileImage, KeyRound,
  LockKeyhole, LogOut, RefreshCw, ShieldCheck,
} from "lucide-react";

// Diseño del panel de cliente. Las rutas, los contratos de API y las autorizaciones
// se conservan: los ensayos, borradores y reservas quedan fuera de esta interfaz.
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

function LogoRed({ red, size = 22 }) {
  return <img
    src={LOGOS[red]}
    alt={red === "instagram" ? "Instagram" : "Facebook"}
    loading="lazy"
    width={size}
    height={size}
    className="shrink-0 object-contain"
    style={{ width: size, height: size }}
  />;
}

const BASE = "/servicios/publicacion-automatica";
const API = "/api/servicios/clientes/panel";
const API_INSTAGRAM = "/api/servicios/meta/pedidos/instagram";
const PEDIDO_SESION = "pedido-publicaciones-transferencia-v1";
const VALIDAR_PEDIDO = /^SER-[a-f0-9-]{36}$/i;
const VALIDAR_CLAVE = /^[a-f0-9]{64}$/i;
const BTN = "inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium shadow-sm transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_PRIMARIO = `${BTN} border border-orange-600 bg-orange-600 text-white hover:border-orange-700 hover:bg-orange-700 active:bg-orange-800`;
const BTN_SECUNDARIO = `${BTN} border border-sky-300 bg-sky-100 text-sky-900 hover:border-sky-400 hover:bg-sky-200`;
const CARD = "rounded-xl border border-slate-200 bg-white shadow-sm";
const CAMPO = "w-full min-h-9 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-100";

const ESTADOS = {
  pendiente: "Pendiente", confirmado: "Confirmado", conectada: "Conectada",
  no_requerido: "Sin pago durante la prueba", pendiente_activacion: "Sin comenzar",
  prueba_en_preparacion: "En preparación", pendiente_carga: "Faltan archivos",
  pendiente_revision: "En revisión", aprobados: "Aprobados",
  sin_activar: "Sin activar", activo: "Activo", activado: "Activo",
  en_curso: "En curso", finalizado: "Finalizado", completado: "Completado",
  pendiente_preparacion: "Por preparar", pendiente_vinculacion: "Sin conectar",
  verificando: "En verificación", verificando_comprobante: "Revisando comprobante",
  verificando_pago: "Verificando pago", completando_operacion: "Pago confirmado",
  pendiente_comprobante: "Esperando comprobante", rechazado: "Requiere corrección",
  correccion_solicitada: "Requiere corrección", aprobado: "Aprobado",
  aprobado_tecnicamente: "Aprobado técnicamente", programado: "Programado",
  publicado: "Publicado", error: "Requiere atención",
};
function estado(valor) { return ESTADOS[valor] || String(valor || "Pendiente").replace(/_/g, " "); }
function redLabel(red) { return red === "instagram" ? "Instagram" : "Facebook"; }
function esAprobado(valor) { return ["aprobado", "aprobado_tecnicamente", "aprobados"].includes(valor); }
function tonoEstado(valor) {
  if (esAprobado(valor) || ["publicado", "conectada", "confirmado"].includes(valor)) return "border-emerald-200 bg-emerald-50 text-emerald-800";
  if (["rechazado", "correccion_solicitada", "error"].includes(valor)) return "border-amber-200 bg-amber-50 text-amber-800";
  return "border-sky-200 bg-sky-50 text-sky-800";
}
function Etiqueta({ valor, texto }) {
  return <span className={`inline-flex max-w-full items-center rounded-full border px-2.5 py-1 text-[11px] font-medium ${tonoEstado(valor)}`}>
    {texto || estado(valor)}
  </span>;
}
function CampoInfo({ etiqueta, valor }) {
  return <div className="min-w-0">
    <p className="text-[11px] text-slate-500">{etiqueta}</p>
    <p className="mt-0.5 break-words text-xs font-medium text-slate-800">{valor}</p>
  </div>;
}
function resumenSolicitud(solicitud, pedido) {
  if (solicitud?.requiereNuevaConfirmacion) return { titulo: "Revisá los cambios de tu solicitud", detalle: "Hay cambios o requisitos pendientes. Volvé a revisar antes de programar.", tono: "amber" };
  if (solicitud?.vigente && solicitud?.aprobadosTecnicamente) return { titulo: "Solicitud confirmada", detalle: "Tus contenidos están aprobados. El servicio espera su habilitación.", tono: "ok" };
  if (solicitud?.vigente) return { titulo: "Solicitud enviada", detalle: "Tus publicaciones están pendientes de revisión técnica.", tono: "ok" };
  if (pedido.estadoServicio === "activo") return { titulo: "Servicio activo", detalle: "Consultá el estado de tus publicaciones.", tono: "ok" };
  return { titulo: "Tu programación", detalle: "Revisá los contenidos y autorizá su programación en un solo paso.", tono: "base" };
}

export default function PanelClientePublicaciones() {
  const [datos, setDatos] = useState(null);
  useEffect(() => { cargarMontserrat(); }, []);
  const [perfilCliente, setPerfilCliente] = useState(null);
  const intentoVinculacion = useRef(false);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [instagramPorPedido, setInstagramPorPedido] = useState({});
  const [instagramError, setInstagramError] = useState("");
  const [accionInstagram, setAccionInstagram] = useState("");
  const [accionFacebook, setAccionFacebook] = useState("");
  const [confirmarRecuperacion, setConfirmarRecuperacion] = useState("");
  const [recuperandoAcceso, setRecuperandoAcceso] = useState("");
  const [enlaceRecuperado, setEnlaceRecuperado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [solicitudes, setSolicitudes] = useState({});
  const [solicitudAbierta, setSolicitudAbierta] = useState("");
  const [confirmacionesSolicitud, setConfirmacionesSolicitud] = useState({});
  const [gestionandoSolicitud, setGestionandoSolicitud] = useState("");
  const [erroresSolicitud, setErroresSolicitud] = useState({});

  const cargarPanel = useCallback(async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await fetch(API, { credentials: "same-origin", cache: "no-store" });
      let json = await respuesta.json();
      if (!respuesta.ok || !json.ok) throw new Error(json.error || "No se pudo consultar el panel.");
      if (!json.autenticado) { setDatos(json); setPerfilCliente(null); return; }
      try {
        const sesionRespuesta = await fetch("/api/servicios/clientes/acceso/sesion", {
          credentials: "same-origin", cache: "no-store",
        });
        const sesion = await sesionRespuesta.json();
        setPerfilCliente(sesionRespuesta.ok && sesion.autenticado ? (sesion.perfil || null) : null);
      } catch { setPerfilCliente(null); }
      // Si el pedido acaba de crearse en este navegador, vincularlo en silencio
      // mediante la clave privada guardada en esta pestaña. El servidor exige
      // sesión verificada y valida el token; nunca confiamos solo en el código.
      if (!intentoVinculacion.current) {
        intentoVinculacion.current = true;
        let pendiente = null;
        try { pendiente = JSON.parse(sessionStorage.getItem(PEDIDO_SESION) || "null"); } catch { /* Sin acceso local */ }
        if (VALIDAR_PEDIDO.test(pendiente?.id || "") && VALIDAR_CLAVE.test(pendiente?.tokenAcceso || "") &&
            !(json.pedidos || []).some(p => p.pedidoId === pendiente.id)) {
          try {
            const r = await fetch(`${API}/vincular`, {
              method: "POST", credentials: "same-origin", cache: "no-store",
              headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
              body: JSON.stringify({ pedidoId: pendiente.id, clave: pendiente.tokenAcceso }),
            });
            const info = await r.json().catch(() => ({}));
            if (r.ok && info.ok) {
              const actualizado = await fetch(API, { credentials: "same-origin", cache: "no-store" });
              const nuevo = await actualizado.json().catch(() => null);
              if (actualizado.ok && nuevo?.ok) json = nuevo;
            }
          } catch { /* La falta de red no concede acceso ni expone la clave. */ }
        }
      }
      setDatos(json);
      try {
        const respuestaIg = await fetch(`${API_INSTAGRAM}/estado`, { credentials: "same-origin", cache: "no-store" });
        const info = await respuestaIg.json();
        if (!respuestaIg.ok || !info.ok) throw new Error(info.error || "No se pudo consultar Instagram.");
        setInstagramPorPedido(Object.fromEntries((info.conexiones || []).map(c => [c.pedidoId, c])));
        setInstagramError("");
      } catch (e) {
        setInstagramPorPedido({});
        setInstagramError(e.message || "No se pudo consultar Instagram.");
      }
    } catch (e) {
      setDatos(null);
      setError(e.message || "No se pudo cargar el panel.");
    } finally { setCargando(false); }
  }, []);
  useEffect(() => { cargarPanel(); }, [cargarPanel]);

  // Conserva la consulta original y la autorización en servidor, sin exponer
  // claves privadas de pedidos ni tokens de Meta en el navegador.
  useEffect(() => {
    if (!datos?.autenticado || !Array.isArray(datos.pedidos)) return;
    let cancelado = false;
    const ids = datos.pedidos.filter(p => p.modalidad === "prueba_gratuita").map(p => p.pedidoId).slice(0, 15);
    Promise.all(ids.map(async pedidoId => {
      try {
        const respuesta = await fetch(`/api/servicios/publicaciones/solicitud/estado?pedidoId=${encodeURIComponent(pedidoId)}`,
          { credentials: "same-origin", cache: "no-store" });
        const info = await respuesta.json();
        if (!respuesta.ok || info.ok !== true) throw new Error(info.error || "No disponible");
        return [pedidoId, info, ""];
      } catch (e) { return [pedidoId, null, e.message || "No disponible"]; }
    })).then(resultados => {
      if (cancelado) return;
      setSolicitudes(Object.fromEntries(resultados.filter(x => x[1]).map(x => [x[0], x[1]])));
      setErroresSolicitud(Object.fromEntries(resultados.filter(x => x[2]).map(x => [x[0], x[2]])));
    });
    return () => { cancelado = true; };
  }, [datos]);

  const abrirSolicitud = pedidoId => {
    setSolicitudAbierta(actual => actual === pedidoId ? "" : pedidoId);
    setConfirmacionesSolicitud(actual => ({ ...actual, [pedidoId]: false }));
  };
  const registrarSolicitud = async pedidoId => {
    const s = solicitudes[pedidoId];
    if (!s?.listaParaSolicitud || !s.revision || !confirmacionesSolicitud[pedidoId]) return;
    setGestionandoSolicitud(pedidoId);
    setErroresSolicitud(actual => ({ ...actual, [pedidoId]: "" }));
    try {
      const respuesta = await fetch("/api/servicios/publicaciones/solicitud/confirmar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId, revision: s.revision, aceptoProgramacion: true }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true || !resultado.confirmada || !resultado.vigente ||
          resultado.publicacionHabilitada !== false) throw new Error(resultado.error || "No se pudo registrar la solicitud.");
      setSolicitudes(actual => ({ ...actual, [pedidoId]: resultado }));
      setConfirmacionesSolicitud(actual => ({ ...actual, [pedidoId]: false }));
      setMensaje("La solicitud quedó confirmada. Podés consultar su estado desde este panel.");
    } catch (e) {
      setErroresSolicitud(actual => ({ ...actual, [pedidoId]: e.message || "No se pudo confirmar." }));
    } finally { setGestionandoSolicitud(""); }
  };
  const revocarSolicitud = async pedidoId => {
    if (!window.confirm("¿Revocar la autorización de programación? Los contenidos se conservarán.")) return;
    setGestionandoSolicitud(pedidoId);
    setErroresSolicitud(actual => ({ ...actual, [pedidoId]: "" }));
    try {
      const respuesta = await fetch("/api/servicios/publicaciones/solicitud/revocar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId, confirmarRevocacion: true }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true) throw new Error(resultado.error || "No se pudo revocar la autorización.");
      setSolicitudes(actual => ({ ...actual, [pedidoId]: { ...actual[pedidoId], confirmada: false,
        vigente: false, requiereNuevaConfirmacion: false, estado: "sin_solicitud" } }));
      setConfirmacionesSolicitud(actual => ({ ...actual, [pedidoId]: false }));
      setMensaje("Autorización revocada. Tus archivos siguen guardados.");
    } catch (e) {
      setErroresSolicitud(actual => ({ ...actual, [pedidoId]: e.message || "No se pudo revocar." }));
    } finally { setGestionandoSolicitud(""); }
  };

  const conectarFacebook = async pedidoId => {
    setAccionFacebook(pedidoId); setError("");
    try {
      const respuesta = await fetch("/api/servicios/meta/pedidos/iniciar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const info = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok || !info.ok || !info.authorizationUrl) throw new Error(info.error || "No se pudo iniciar Facebook.");
      const url = new URL(info.authorizationUrl);
      if (url.protocol !== "https:" || url.hostname !== "www.facebook.com") throw new Error("La autorización no es válida.");
      window.location.assign(url.toString());
    } catch (e) { setError(e.message || "No se pudo conectar Facebook."); setAccionFacebook(""); }
  };
  const conectarInstagram = async pedidoId => {
    setAccionInstagram(pedidoId); setError("");
    try {
      const respuesta = await fetch(`${API_INSTAGRAM}/iniciar`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const info = await respuesta.json();
      if (!respuesta.ok || !info.ok || !info.authorizationUrl) throw new Error(info.error || "No se pudo iniciar Instagram.");
      const url = new URL(info.authorizationUrl);
      if (url.protocol !== "https:" || url.hostname !== "www.facebook.com") throw new Error("La autorización no es válida.");
      window.location.assign(url.toString());
    } catch (e) { setError(e.message || "No se pudo conectar Instagram."); setAccionInstagram(""); }
  };
  const desconectarInstagram = async pedidoId => {
    if (!window.confirm("¿Desconectar Instagram? La conexión de Facebook se conservará.")) return;
    setAccionInstagram(pedidoId); setError("");
    try {
      const respuesta = await fetch(`${API_INSTAGRAM}/desconectar`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const info = await respuesta.json();
      if (!respuesta.ok || !info.ok) throw new Error(info.error || "No se pudo desconectar Instagram.");
      setInstagramPorPedido(actual => { const copia = { ...actual }; delete copia[pedidoId]; return copia; });
      setMensaje("Instagram quedó desconectado de este pedido.");
    } catch (e) { setError(e.message || "No se pudo desconectar Instagram."); }
    finally { setAccionInstagram(""); }
  };
  const recuperarAcceso = async pedidoId => {
    setRecuperandoAcceso(pedidoId); setError(""); setMensaje("");
    setEnlaceRecuperado(null);
    try {
      const respuesta = await fetch(`${API}/recuperar-acceso`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId }),
      });
      const info = await respuesta.json();
      if (!respuesta.ok || info.ok !== true || info.pedidoId !== pedidoId || !/^[a-f0-9]{64}$/i.test(info.tokenAcceso || "")) {
        throw new Error(info.error || "No se pudo recuperar el acceso privado.");
      }
      const url = `${window.location.origin}${BASE}/configurar#pedido=${encodeURIComponent(pedidoId)}&clave=${encodeURIComponent(info.tokenAcceso)}`;
      setEnlaceRecuperado({ pedidoId, url }); setCopiado(false); setConfirmarRecuperacion("");
      setMensaje("Generamos un enlace nuevo. El anterior dejó de funcionar.");
    } catch (e) { setError(e.message || "No se pudo recuperar el acceso privado."); }
    finally { setRecuperandoAcceso(""); }
  };
  const copiarAcceso = async () => {
    if (!enlaceRecuperado?.url) return;
    try { await navigator.clipboard.writeText(enlaceRecuperado.url); setCopiado(true); }
    catch { setError("No pudimos copiar el enlace. Seleccionalo y copialo manualmente."); }
  };
  const salir = async () => {
    setCerrando(true); setError("");
    try {
      const respuesta = await fetch("/api/servicios/clientes/acceso/salir", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: "{}",
      });
      if (!respuesta.ok) throw new Error("No se pudo cerrar la sesión.");
      window.location.assign(BASE);
    } catch (e) { setError(e.message || "No se pudo cerrar la sesión."); setCerrando(false); }
  };

  return <main className="min-h-[75vh] bg-slate-100 px-4 pb-16 pt-7 font-normal text-slate-900 sm:px-6 sm:pt-10" style={{ fontFamily: "Montserrat, ui-sans-serif, system-ui, sans-serif" }}>
    <div className="mx-auto max-w-5xl space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-4 pb-1">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.13em] text-orange-700">Comunidad Semanal</p>
          <h1 className="text-2xl font-medium tracking-tight text-slate-950 sm:text-3xl">Bienvenido a tu panel privado</h1>
          <div className="mt-2 h-1 w-16 rounded-full bg-gradient-to-r from-orange-500 to-amber-300" aria-hidden="true" />
          <p className="mt-1 max-w-2xl text-sm text-slate-500">Acá podés revisar tu correo registrado, las cuentas conectadas, tu plan y el estado de tus publicaciones.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={cargarPanel} disabled={cargando} className={BTN_SECUNDARIO}><RefreshCw size={14} /> Actualizar</button>
          {!datos?.autenticado && !cargando && <Link to={`${BASE}?acceso=ingreso`} className={BTN_PRIMARIO}>Iniciar sesión</Link>}
          {datos?.autenticado && <button type="button" onClick={salir} disabled={cerrando} className={BTN_SECUNDARIO}><LogOut size={14} /> Salir</button>}
        </div>
      </header>

      {cargando && <div className={`${CARD} p-5 text-sm text-slate-500`}>Cargando tus pedidos...</div>}
      {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>}
      {mensaje && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{mensaje}</div>}

      {!cargando && (!datos || !datos.autenticado) && <section className={`${CARD} flex flex-col items-start gap-3 p-5 sm:p-7`}>
        <LockKeyhole size={23} className="text-slate-600" />
        <div><h2 className="font-medium text-slate-900">Accedé a tu cuenta</h2><p className="mt-1 text-sm text-slate-500">Iniciá sesión con tu correo verificado desde Comunidad Semanal.</p></div>
        <Link to={`${BASE}?acceso=ingreso`} className={BTN_PRIMARIO}>Iniciar sesión con código <ArrowRight size={14} /></Link>
      </section>}

      {!cargando && datos?.autenticado && <>
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm shadow-emerald-100/70 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100"><ShieldCheck size={17} className="text-emerald-700" /></div>
            <div className="min-w-0"><p className="text-xs font-medium text-slate-800">Cuenta verificada</p><p className="truncate text-xs text-slate-500" title={datos.email}>{datos.email}</p></div>
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700"><CheckCircle2 size={14} /> Sesión activa</span>
        </section>

        <section className={`${CARD} px-4 py-4 sm:px-5`} aria-labelledby="datos-personales">
          <h2 id="datos-personales" className="text-base font-medium">Datos personales</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <CampoInfo etiqueta="Email confirmado" valor={datos.email || "—"} />
            <CampoInfo etiqueta="Nombre y apellido" valor={perfilCliente?.nombre || "Pendiente de completar"} />
            <CampoInfo etiqueta="Nombre del emprendimiento" valor={datos.pedidos?.[0]?.negocio || "Se completa al configurar tu semana"} />
            <CampoInfo etiqueta="WhatsApp" valor={perfilCliente?.whatsapp || "Pendiente de completar"} />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 px-0.5">
            <div><h2 className="text-lg font-medium tracking-tight text-slate-900">Mis publicaciones</h2><p className="mt-0.5 text-xs text-slate-500">Seguimiento de tus pedidos y contenidos.</p></div>

          </div>

          {!Array.isArray(datos.pedidos) || datos.pedidos.length === 0 ? <div className={`${CARD} flex flex-col items-start gap-3 p-6`}>
            <FileImage size={22} className="text-orange-600" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-slate-800">Programá tu primera semana</p>
              <p className="max-w-xl text-xs leading-5 text-slate-600">Tu cuenta ya está verificada. El siguiente paso es configurar tus cuatro contenidos y registrar el pedido. Cuando esté creado, aparecerá automáticamente acá.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link to={`${BASE}/configurar`} className={BTN_PRIMARIO}>Programar primera semana <ArrowRight size={14} /></Link>
              <button type="button" onClick={salir} disabled={cerrando} className={BTN_SECUNDARIO}>Ingresar con otro correo</button>
            </div>
          </div> : datos.pedidos.map(p => {
            const redes = Array.isArray(p.redes) ? p.redes : [];
            const contenidos = Array.isArray(p.contenidos) ? p.contenidos : [];
            const solicitud = solicitudes[p.pedidoId];
            const estadoSolicitud = resumenSolicitud(solicitud, p);
            const instagram = instagramPorPedido[p.pedidoId];
            const esPrueba = p.modalidad === "prueba_gratuita";
            const aprobados = contenidos.filter(c => esAprobado(c.estado)).length;
            const pendiente = contenidos.some(c => ["rechazado", "correccion_solicitada"].includes(c.estado));
            return <article key={p.pedidoId} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-orange-100 bg-orange-50/80 px-4 py-4 sm:px-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-orange-700">Pedido de publicaciones</p>
                    <h3 className="mt-0.5 text-base font-medium text-slate-950 sm:text-lg">{p.negocio || "Mi emprendimiento"}</h3>
                    <p className="mt-1 break-all text-[11px] text-slate-400">{p.pedidoId}</p>
                  </div>
                  <Etiqueta valor={p.estadoServicio} />
                </div>
                {esPrueba && <div className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-full border border-orange-200 bg-white/75 px-2.5 py-1.5 text-xs text-orange-800">
                  <Clock3 size={13} className="text-orange-600" />
                  <span>Prueba gratuita de 7 días</span><span className="text-slate-300">·</span>
                  <span>{estado(p.prueba?.estado || (p.estadoServicio === "sin_activar" ? "pendiente_activacion" : p.estadoServicio))}</span>
                </div>}
              </div>

              <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
                <section className="rounded-xl border border-orange-200 bg-orange-50 p-3.5 sm:p-4" aria-label="Estado de los contenidos">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h4 className="flex items-center gap-2 text-sm font-medium text-slate-900"><FileImage size={16} className="text-orange-600" /> Contenidos</h4>
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-[11px] font-medium text-emerald-800">{aprobados}/{contenidos.length || 4} aprobados</span>
                  </div>
                  {contenidos.length ? <div className="space-y-0.5">
                    {contenidos.map((c, indice) => <div key={c.id || indice} className="flex items-center justify-between gap-3 border-b border-slate-100 py-2 last:border-0">
                      <span className="min-w-0 text-xs text-slate-700">Contenido {indice + 1}{c.tipo ? ` · ${c.tipo === "reel" ? "Reel" : c.tipo === "carrusel" ? "Carrusel" : "Imagen"}` : ""}</span>
                      <Etiqueta valor={c.estado} />
                    </div>)}
                  </div> : <p className="text-xs text-slate-500">Todavía no hay contenidos cargados.</p>}
                  {pendiente && <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700"><CircleAlert size={13} /> Tenés contenidos para corregir desde el configurador.</p>}
                  <p className="mt-3 text-[11px] text-slate-500">Estado general: {estado(p.estadoContenidos)}</p>
                </section>

                <section className="rounded-xl border border-sky-200 bg-sky-50 p-3.5 sm:p-4" aria-label="Redes sociales">
                  <div className="mb-3 flex items-center justify-between gap-2"><h4 className="text-sm font-medium text-slate-900">Redes sociales</h4><span className="text-[11px] text-slate-500">{redes.length} seleccionadas</span></div>
                  {redes.includes("facebook") && <div className="flex items-center justify-between gap-3 border-b border-slate-100 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5"><LogoRed red="facebook" size={22} /><div className="min-w-0"><p className="text-xs font-medium text-slate-800">Facebook</p><p className="truncate text-[11px] text-slate-500">{p.facebook?.nombre || "Página pendiente"}</p></div></div>
                    {p.facebook ? <Etiqueta valor="conectada" texto="Conectada" /> :
                      <button type="button" onClick={() => conectarFacebook(p.pedidoId)} disabled={Boolean(accionFacebook)} className={BTN_SECUNDARIO}>
                        {accionFacebook === p.pedidoId ? "Conectando..." : "Conectar"}
                      </button>}
                  </div>}
                  {redes.includes("instagram") && <div className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-2.5"><LogoRed red="instagram" size={22} /><div className="min-w-0"><p className="text-xs font-medium text-slate-800">Instagram</p><p className="truncate text-[11px] text-slate-500">{instagram ? `@${instagram.usuario}` : instagramError ? "Estado no disponible" : "Cuenta pendiente"}</p></div></div>
                    {instagram ? <Etiqueta valor="conectada" /> : <button type="button" onClick={() => conectarInstagram(p.pedidoId)} disabled={Boolean(accionInstagram)} className={BTN_SECUNDARIO}>{accionInstagram === p.pedidoId ? "Conectando..." : "Conectar"}</button>}
                  </div>}
                  {!redes.length && <p className="text-xs text-slate-500">Todavía no hay redes seleccionadas.</p>}
                  <p className="mt-2 text-[11px] text-slate-500">Las conexiones se autorizan directamente desde Meta, sin compartir contraseñas.</p>
                </section>
              </div>

              {esPrueba && <section className={`mx-4 mb-4 rounded-xl border p-4 sm:mx-5 sm:mb-5 sm:p-5 ${solicitud?.requiereNuevaConfirmacion ? "border-amber-200 bg-amber-50" : solicitud?.vigente ? "border-emerald-200 bg-emerald-50/75" : "border-orange-200 bg-orange-50/70"}`} aria-label="Solicitud de programación">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700"><CalendarCheck2 size={18} /></div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-slate-900">{estadoSolicitud.titulo}</h4>
                      <p className="mt-1 max-w-xl text-xs leading-relaxed text-slate-600">{estadoSolicitud.detalle}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => abrirSolicitud(p.pedidoId)} className={solicitud?.vigente ? BTN_SECUNDARIO : BTN_PRIMARIO}>
                    {solicitudAbierta === p.pedidoId ? "Cerrar" : solicitud?.vigente ? "Ver autorización" : "Revisar y confirmar"}
                    <ChevronDown size={14} className={solicitudAbierta === p.pedidoId ? "rotate-180" : ""} />
                  </button>
                </div>
                {solicitud?.vigente && <p role="status" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-700"><CheckCircle2 size={14} /> Autorización registrada</p>}
                {solicitud?.requiereNuevaConfirmacion && <p role="status" className="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber-800"><CircleAlert size={14} /> Es necesaria una nueva revisión de la solicitud.</p>}
                {erroresSolicitud[p.pedidoId] && <p role="alert" className="mt-3 text-xs text-red-700">{erroresSolicitud[p.pedidoId]}</p>}
                {solicitudAbierta === p.pedidoId && <div className="mt-4 space-y-3 border-t border-slate-200 pt-4">
                  {!solicitud ? <p className="text-xs text-slate-500">Consultando la configuración...</p> : <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <CampoInfo etiqueta="Contenidos" valor={solicitud.cantidadContenidos ?? "—"} />
                      <CampoInfo etiqueta="Publicaciones previstas" valor={solicitud.cantidadEventos ?? "—"} />
                      <CampoInfo etiqueta="Zona horaria" valor={solicitud.zonaHoraria || "—"} />
                    </div>
                    <p className="text-xs text-slate-600">Redes: {(solicitud.redes || []).map(redLabel).join(" e ") || "Sin configurar"}</p>
                    {solicitud.motivos?.length > 0 && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                      <p className="text-xs font-medium text-amber-900">Antes de confirmar</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-amber-900">{solicitud.motivos.map((motivo, i) => <li key={i}>{motivo}</li>)}</ul>
                    </div>}
                    {solicitud.vigente ? <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs text-slate-600">Tu autorización permanece guardada hasta que modifiques la configuración o la revoques.</p>
                      {p.estadoServicio === "sin_activar" && <button type="button" disabled={Boolean(gestionandoSolicitud)} onClick={() => revocarSolicitud(p.pedidoId)} className={BTN_SECUNDARIO}>{gestionandoSolicitud === p.pedidoId ? "Procesando..." : "Revocar autorización"}</button>}
                    </div> : <>
                      <label className="flex items-start gap-2.5 text-xs leading-relaxed text-slate-700">
                        <input type="checkbox" className="mt-0.5 h-4 w-4 accent-orange-600" disabled={!solicitud.listaParaSolicitud}
                          checked={Boolean(confirmacionesSolicitud[p.pedidoId])}
                          onChange={e => setConfirmacionesSolicitud(actual => ({ ...actual, [p.pedidoId]: e.target.checked }))} />
                        <span>Autorizo la programación y publicación de los cuatro contenidos en las redes y horarios elegidos, cuando hayan sido aprobados y el servicio esté habilitado. Si modifico los contenidos, archivos, redes u horarios, volveré a confirmar.</span>
                      </label>
                      <button type="button" onClick={() => registrarSolicitud(p.pedidoId)}
                        disabled={!solicitud.listaParaSolicitud || !confirmacionesSolicitud[p.pedidoId] || Boolean(gestionandoSolicitud)} className={BTN_PRIMARIO}>
                        {gestionandoSolicitud === p.pedidoId ? "Registrando..." : "Enviar solicitud de programación"} <ArrowRight size={14} />
                      </button>
                    </>}
                    <p className="text-[11px] text-slate-500">La solicitud no inicia el período gratuito hasta que el servicio esté habilitado.</p>
                  </>}
                </div>}
              </section>}

              <details className="group border-t border-sky-100 bg-sky-50/40 px-4 py-3 sm:px-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-sky-800 [&::-webkit-details-marker]:hidden">
                  <span className="flex items-center gap-2"><KeyRound size={14} /> Acceso privado y opciones del pedido</span>
                  <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
                </summary>
                <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-xs text-slate-600">Para reemplazar contenidos o gestionar archivos, ingresá al configurador con tu enlace privado.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(recuperandoAcceso)} onClick={() => {
                      setConfirmarRecuperacion(actual => actual === p.pedidoId ? "" : p.pedidoId);
                      setEnlaceRecuperado(null); setCopiado(false); setError("");
                    }} className={BTN_SECUNDARIO}><KeyRound size={14} /> Recuperar acceso privado</button>
                    {redes.includes("instagram") && instagram && p.estadoServicio === "sin_activar" && <button type="button" disabled={Boolean(accionInstagram)} onClick={() => desconectarInstagram(p.pedidoId)} className={BTN_SECUNDARIO}>
                      {accionInstagram === p.pedidoId ? "Procesando..." : "Desconectar Instagram"}
                    </button>}
                  </div>
                  {confirmarRecuperacion === p.pedidoId && <div className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <p className="text-xs text-slate-700">Se creará una clave nueva. <strong>Los enlaces privados anteriores dejarán de funcionar.</strong> Se conservarán los contenidos y las conexiones.</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" disabled={Boolean(recuperandoAcceso)} onClick={() => recuperarAcceso(p.pedidoId)} className={BTN_PRIMARIO}>{recuperandoAcceso === p.pedidoId ? "Generando..." : "Generar enlace nuevo"}</button>
                      <button type="button" onClick={() => setConfirmarRecuperacion("")} className={BTN_SECUNDARIO}>Cancelar</button>
                    </div>
                  </div>}
                  {enlaceRecuperado?.pedidoId === p.pedidoId && <div className="space-y-2 rounded-lg border border-sky-200 bg-sky-50 p-3">
                    <p className="flex items-center gap-2 text-xs font-medium text-slate-900"><LockKeyhole size={14} /> Tu nuevo enlace privado</p>
                    <p className="text-xs text-slate-600">Copialo o abrilo ahora. No se guardará en este panel cuando cierres la página.</p>
                    <input readOnly aria-label="Nuevo enlace privado" value={enlaceRecuperado.url} onFocus={e => e.target.select()} className={`${CAMPO} text-xs`} />
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={copiarAcceso} className={BTN_SECUNDARIO}><Copy size={14} /> {copiado ? "Copiado" : "Copiar enlace"}</button>
                      <button type="button" onClick={() => window.location.assign(enlaceRecuperado.url)} className={BTN_PRIMARIO}><ExternalLink size={14} /> Abrir configurador</button>
                    </div>
                  </div>}
                  <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-100 pt-3 text-[11px] text-slate-500">
                    <span>Pago: {estado(p.estadoPago)}</span>
                    <span>Contenidos: {estado(p.estadoContenidos)}</span>
                    <span>Redes: {redes.map(redLabel).join(" e ") || "Sin configurar"}</span>
                  </div>
                </div>
              </details>
            </article>;
          })}
        </section>
      </>}
    </div>
  </main>;
}
