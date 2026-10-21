import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText,
  Link2, LogOut, RefreshCw, ShieldCheck, KeyRound, Copy, ExternalLink,
} from "lucide-react";

const BASE = "/servicios/publicacion-automatica";
const API = "/api/servicios/clientes/panel";
const API_INSTAGRAM = "/api/servicios/meta/pedidos/instagram";
const BOTON = "inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const TARJETA = "rounded-xl border border-neutral-200 bg-white p-4 sm:p-5";

function etiquetaEstado(valor) {
  const textos = {
    pendiente: "Pendiente", confirmado: "Confirmado", conectada: "Conectada",
    no_requerido: "No requerido en la prueba", prueba_en_preparacion: "Prueba en preparación",
    pendiente_activacion: "Aún no comienza",
    pendiente_carga: "Pendiente de carga", pendiente_revision: "En revisión",
    aprobados: "Aprobados", sin_activar: "Sin activar",
    verificando: "En verificación", verificando_comprobante: "Revisando comprobante",
    verificando_pago: "Verificando pago", completando_operacion: "Pago confirmado",
    pendiente_comprobante: "Esperando comprobante", pendiente_preparacion: "Pendiente de preparación",
    pendiente_vinculacion: "Pendiente de vinculación", rechazado: "Requiere corrección",
    aprobado: "Aprobado", programado: "Programado",
  };
  return textos[valor] || String(valor || "No disponible").replace(/_/g, " ");
}

function obtenerDatosPedido(codigo, entrada) {
  const texto = entrada.trim();
  let pedidoId = codigo.trim();
  let clave = texto;
  if (/^https?:\/\//i.test(texto)) {
    let url;
    try { url = new URL(texto); } catch { throw new Error("El enlace privado no es válido."); }
    if (url.origin !== window.location.origin || !url.pathname.startsWith(BASE)) {
      throw new Error("El enlace debe pertenecer a este sitio.");
    }
    const parametros = new URLSearchParams(url.hash.slice(1));
    pedidoId = parametros.get("pedido") || "";
    clave = parametros.get("clave") || "";
  }
  if (!/^SER-[a-f\d-]{36}$/i.test(pedidoId) || !/^[a-f\d]{64}$/i.test(clave)) {
    throw new Error("Pegá el enlace completo o ingresá el código SER-... y su clave privada.");
  }
  return { pedidoId, clave };
}

export default function PanelClientePublicaciones() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mostrarVincular, setMostrarVincular] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [acceso, setAcceso] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [cerrando, setCerrando] = useState(false);
  const [instagramPorPedido, setInstagramPorPedido] = useState({});
  const [instagramError, setInstagramError] = useState("");
  const [accionInstagram, setAccionInstagram] = useState("");
  const [confirmarRecuperacion, setConfirmarRecuperacion] = useState("");
  const [recuperandoAcceso, setRecuperandoAcceso] = useState("");
  const [enlaceRecuperado, setEnlaceRecuperado] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [calendarioAbierto, setCalendarioAbierto] = useState("");
  const [calendarios, setCalendarios] = useState({});
  const [calendarioCargando, setCalendarioCargando] = useState("");
  const [calendarioErrores, setCalendarioErrores] = useState({});
  const [confirmarBorrador, setConfirmarBorrador] = useState({});
  const [preparandoBorrador, setPreparandoBorrador] = useState("");
  const [ensayos, setEnsayos] = useState({});
  const [ensayando, setEnsayando] = useState("");
  const [confirmarReserva, setConfirmarReserva] = useState({});
  const [reservando, setReservando] = useState("");
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
      const json = await respuesta.json();
      if (!respuesta.ok || !json.ok) throw new Error(json.error || "No se pudo consultar tu panel.");
      setDatos(json);
      // Una sola consulta para las conexiones de Instagram de esta cuenta;
      // el Worker valida la sesión y no devuelve tokens de Meta.
      try {
        const respuestaIg = await fetch(`${API_INSTAGRAM}/estado`, { credentials: "same-origin", cache: "no-store" });
        const datosIg = await respuestaIg.json();
        if (!respuestaIg.ok || !datosIg.ok) throw new Error(datosIg.error || "No se pudo consultar Instagram.");
        setInstagramPorPedido(Object.fromEntries((datosIg.conexiones || []).map(c => [c.pedidoId, c])));
        setInstagramError("");
      } catch (errorIg) {
        setInstagramPorPedido({});
        setInstagramError(errorIg.message || "No se pudo consultar Instagram.");
      }
    } catch (e) {
      setDatos(null);
      setError(e.message || "No fue posible consultar el panel.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarPanel(); }, [cargarPanel]);

  // Las solicitudes se consultan automáticamente para que el estado permanezca
  // visible al volver a entrar al panel o después de refrescarlo.
  useEffect(() => {
    if (!datos?.autenticado || !Array.isArray(datos.pedidos)) return;
    let cancelado = false;
    const ids = datos.pedidos.filter(p => p.modalidad === "prueba_gratuita")
      .map(p => p.pedidoId).slice(0, 15);
    Promise.all(ids.map(async pedidoId => {
      try {
        const respuesta = await fetch(`/api/servicios/publicaciones/solicitud/estado?pedidoId=${encodeURIComponent(pedidoId)}`,
          { credentials: "same-origin", cache: "no-store" });
        const info = await respuesta.json();
        if (!respuesta.ok || info.ok !== true) throw new Error(info.error || "No disponible");
        return [pedidoId, info, ""];
      } catch (err) { return [pedidoId, null, err.message || "Error de consulta"]; }
    })).then(resultados => {
      if (cancelado) return;
      setSolicitudes(Object.fromEntries(resultados.filter(x => x[1]).map(x => [x[0], x[1]])));
      setErroresSolicitud(Object.fromEntries(resultados.filter(x => x[2]).map(x => [x[0], x[2]])));
    });
    return () => { cancelado = true; };
  }, [datos]);

  const abrirSolicitud = (pedidoId) => {
    setSolicitudAbierta(prev => prev === pedidoId ? "" : pedidoId);
    setConfirmacionesSolicitud(prev => ({ ...prev, [pedidoId]: false }));
  };

  const registrarSolicitud = async (pedidoId) => {
    const estado = solicitudes[pedidoId];
    if (!estado?.listaParaSolicitud || !estado.revision || !confirmacionesSolicitud[pedidoId]) return;
    setGestionandoSolicitud(pedidoId);
    setErroresSolicitud(prev => ({ ...prev, [pedidoId]: "" }));
    try {
      const respuesta = await fetch("/api/servicios/publicaciones/solicitud/confirmar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId, revision: estado.revision, aceptoProgramacion: true }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true || !resultado.confirmada || !resultado.vigente ||
          resultado.publicacionHabilitada !== false) {
        throw new Error(resultado.error || "No se pudo registrar la solicitud.");
      }
      setSolicitudes(prev => ({ ...prev, [pedidoId]: resultado }));
      setConfirmacionesSolicitud(prev => ({ ...prev, [pedidoId]: false }));
      setMensaje("Solicitud registrada. La publicación automática sigue deshabilitada durante las pruebas.");
    } catch (e) {
      setErroresSolicitud(prev => ({ ...prev, [pedidoId]: e.message || "No se pudo registrar la solicitud." }));
    } finally { setGestionandoSolicitud(""); }
  };

  const revocarSolicitud = async (pedidoId) => {
    if (!window.confirm("¿Revocar la autorización de programación de este pedido? No se borrarán los contenidos.")) return;
    setGestionandoSolicitud(pedidoId);
    setErroresSolicitud(prev => ({ ...prev, [pedidoId]: "" }));
    try {
      const respuesta = await fetch("/api/servicios/publicaciones/solicitud/revocar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId, confirmarRevocacion: true }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true) throw new Error(resultado.error || "No se pudo revocar.");
      setSolicitudes(prev => ({ ...prev, [pedidoId]: { ...prev[pedidoId], confirmada: false,
        vigente: false, estado: "sin_solicitud" } }));
      setConfirmacionesSolicitud(prev => ({ ...prev, [pedidoId]: false }));
      setMensaje("Autorización revocada. El pedido y los archivos se conservan.");
    } catch (e) {
      setErroresSolicitud(prev => ({ ...prev, [pedidoId]: e.message || "No se pudo revocar." }));
    } finally { setGestionandoSolicitud(""); }
  };

  const vincularPedido = async (evento) => {
    evento.preventDefault();
    setError("");
    setMensaje("");
    let valores;
    try { valores = obtenerDatosPedido(codigo, acceso); }
    catch (e) { setError(e.message); return; }
    setGuardando(true);
    try {
      const respuesta = await fetch(`${API}/vincular`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify(valores),
      });
      const json = await respuesta.json();
      if (!respuesta.ok || !json.ok) throw new Error(json.error || "No se pudo vincular el pedido.");
      setAcceso("");
      setCodigo("");
      setMostrarVincular(false);
      setMensaje("El pedido se vinculó a tu cuenta.");
      await cargarPanel();
    } catch (e) {
      setError(e.message || "No se pudo vincular el pedido.");
    } finally {
      setGuardando(false);
    }
  };

  const conectarInstagram = async (pedidoId) => {
    setAccionInstagram(pedidoId);
    setError("");
    try {
      const respuesta = await fetch(`${API_INSTAGRAM}/iniciar`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const datosIg = await respuesta.json();
      if (!respuesta.ok || !datosIg.ok || !datosIg.authorizationUrl) {
        throw new Error(datosIg.error || "No se pudo iniciar Instagram.");
      }
      const destino = new URL(datosIg.authorizationUrl);
      if (destino.protocol !== "https:" || destino.hostname !== "www.facebook.com") {
        throw new Error("La URL de autorización no es válida.");
      }
      window.location.assign(destino.toString());
    } catch (e) {
      setError(e.message || "No se pudo conectar Instagram.");
      setAccionInstagram("");
    }
  };

  const desconectarInstagram = async (pedidoId) => {
    if (!window.confirm("¿Desconectar Instagram de este pedido? La vinculación con Facebook se conservará.")) return;
    setAccionInstagram(pedidoId);
    setError("");
    try {
      const respuesta = await fetch(`${API_INSTAGRAM}/desconectar`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pedidoId }),
      });
      const datosIg = await respuesta.json();
      if (!respuesta.ok || !datosIg.ok) throw new Error(datosIg.error || "No se pudo desconectar Instagram.");
      setInstagramPorPedido(actual => {
        const copia = { ...actual };
        delete copia[pedidoId];
        return copia;
      });
      setMensaje("Instagram fue desconectado del pedido sin modificar Facebook.");
    } catch (e) {
      setError(e.message || "No se pudo desconectar Instagram.");
    } finally {
      setAccionInstagram("");
    }
  };

  const recuperarAcceso = async (pedidoId) => {
    setRecuperandoAcceso(pedidoId);
    setError("");
    setMensaje("");
    setEnlaceRecuperado(null);
    try {
      const respuesta = await fetch(`${API}/recuperar-acceso`, {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId }),
      });
      const json = await respuesta.json();
      if (!respuesta.ok || json.ok !== true || json.pedidoId !== pedidoId ||
          !/^[a-f0-9]{64}$/i.test(json.tokenAcceso || "")) {
        throw new Error(json.error || "No se pudo recuperar el acceso privado.");
      }
      // El fragmento (#) no se envía al servidor. No persistimos la clave en el panel.
      const url = `${window.location.origin}${BASE}/configurar#pedido=${encodeURIComponent(pedidoId)}&clave=${encodeURIComponent(json.tokenAcceso)}`;
      setEnlaceRecuperado({ pedidoId, url });
      setCopiado(false);
      setConfirmarRecuperacion("");
      setMensaje("Se generó un enlace nuevo. El anterior dejó de funcionar.");
    } catch (e) {
      setError(e.message || "No se pudo recuperar el acceso privado.");
    } finally {
      setRecuperandoAcceso("");
    }
  };

  const mostrarCalendario = async (pedidoId) => {
    if (calendarioAbierto === pedidoId) {
      setCalendarioAbierto("");
      return;
    }
    setCalendarioAbierto(pedidoId);
    setCalendarioCargando(pedidoId);
    setCalendarioErrores(prev => ({ ...prev, [pedidoId]: "" }));
    setConfirmarBorrador(prev => ({ ...prev, [pedidoId]: false }));
    setEnsayos(prev => ({ ...prev, [pedidoId]: null }));
    setConfirmarReserva(prev => ({ ...prev, [pedidoId]: false }));
    try {
      const respuesta = await fetch(`/api/servicios/publicaciones/calendario/simulacion?pedidoId=${encodeURIComponent(pedidoId)}`, {
        credentials: "same-origin", cache: "no-store",
      });
      const datosCalendario = await respuesta.json();
      if (!respuesta.ok || datosCalendario.ok !== true || datosCalendario.modo !== "simulacion_sin_publicacion") {
        throw new Error(datosCalendario.error || "No se pudo generar la simulación.");
      }
      setCalendarios(prev => ({ ...prev, [pedidoId]: datosCalendario }));
    } catch (e) {
      setCalendarios(prev => ({ ...prev, [pedidoId]: null }));
      setCalendarioErrores(prev => ({ ...prev, [pedidoId]: e.message || "No se pudo cargar la simulación." }));
    } finally {
      setCalendarioCargando("");
    }
  };

  const copiarAcceso = async () => {
    if (!enlaceRecuperado?.url) return;
    try {
      await navigator.clipboard.writeText(enlaceRecuperado.url);
      setCopiado(true);
    } catch {
      setError("No se pudo copiar automáticamente. Seleccioná y copiá el enlace mostrado.");
    }
  };

  const guardarBorradorCalendario = async (pedidoId) => {
    const calendario = calendarios[pedidoId];
    if (!calendario?.listoParaBorrador || !confirmarBorrador[pedidoId]) return;
    setPreparandoBorrador(pedidoId);
    setCalendarioErrores(prev => ({ ...prev, [pedidoId]: "" }));
    try {
      const respuesta = await fetch("/api/servicios/publicaciones/calendario/preparar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId, revision: calendario.revision, confirmarBorrador: true }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true || resultado.modo !== "borrador_sin_activar") {
        throw new Error(resultado.error || "No se pudo guardar el borrador.");
      }
      setCalendarios(prev => ({ ...prev, [pedidoId]: {
        ...prev[pedidoId], seGuardoCalendario: true, borrador: resultado.borrador,
      } }));
      setConfirmarBorrador(prev => ({ ...prev, [pedidoId]: false }));
      setEnsayos(prev => ({ ...prev, [pedidoId]: null }));
      setMensaje("Calendario guardado como borrador. La prueba gratuita sigue sin activar y no habrá publicaciones.");
    } catch (error) {
      setCalendarioErrores(prev => ({ ...prev, [pedidoId]: error.message || "Error preparando borrador." }));
    } finally { setPreparandoBorrador(""); }
  };

  const ensayarCalendario = async (pedidoId) => {
    setEnsayando(pedidoId);
    setEnsayos(prev => ({ ...prev, [pedidoId]: null }));
    setCalendarioErrores(prev => ({ ...prev, [pedidoId]: "" }));
    try {
      const respuesta = await fetch(`/api/servicios/publicaciones/calendario/ensayo?pedidoId=${encodeURIComponent(pedidoId)}`, {
        credentials: "same-origin", cache: "no-store",
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true || resultado.modo !== "ensayo_no_ejecutable") {
        throw new Error(resultado.error || "No se pudo ensayar el calendario.");
      }
      setEnsayos(prev => ({ ...prev, [pedidoId]: resultado }));
    } catch (error) {
      setCalendarioErrores(prev => ({ ...prev, [pedidoId]: error.message || "No fue posible completar el ensayo." }));
    } finally { setEnsayando(""); }
  };

  const reservarEventos = async (pedidoId) => {
    const simulacion = calendarios[pedidoId];
    const ensayo = ensayos[pedidoId];
    if (!confirmarReserva[pedidoId] || !ensayo?.ok || ensayo.cantidadEventos !== 8 ||
        ensayo.revision !== simulacion?.revision || simulacion?.reserva) return;
    setReservando(pedidoId);
    setCalendarioErrores(prev => ({ ...prev, [pedidoId]: "" }));
    try {
      const respuesta = await fetch("/api/servicios/publicaciones/calendario/reservar", {
        method: "POST", credentials: "same-origin", cache: "no-store",
        headers: { "Content-Type": "application/json", "X-Comunidad-Panel": "1" },
        body: JSON.stringify({ pedidoId, revision: ensayo.revision, confirmarReserva: true }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || resultado.ok !== true ||
          resultado.modo !== "reserva_bloqueada_sin_activar" ||
          resultado.reserva?.bloqueados !== 8 || resultado.reserva?.puedePublicar !== false) {
        throw new Error(resultado.error || "No fue posible reservar los ocho eventos.");
      }
      setCalendarios(prev => ({ ...prev, [pedidoId]: { ...prev[pedidoId], reserva: resultado.reserva } }));
      setEnsayos(prev => ({ ...prev, [pedidoId]: { ...prev[pedidoId], reserva: resultado.reserva } }));
      setConfirmarReserva(prev => ({ ...prev, [pedidoId]: false }));
      setMensaje("Se reservaron ocho eventos bloqueados. La prueba continúa sin activar y no se publicará contenido.");
    } catch (error) {
      setCalendarioErrores(prev => ({ ...prev, [pedidoId]: error.message || "No se pudo reservar." }));
    } finally { setReservando(""); }
  };

  const salir = async () => {
    setCerrando(true);
    setError("");
    try {
      const respuesta = await fetch("/api/servicios/clientes/acceso/salir", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!respuesta.ok) throw new Error("No se pudo cerrar la sesión.");
      window.location.assign(BASE);
    } catch (e) { setError(e.message); setCerrando(false); }
  };

  return (
    <main className="min-h-[70vh] bg-[#f7f7f8] py-7 sm:py-10" style={{ fontFamily: "Inter, system-ui, sans-serif", fontWeight: 400 }}>
      <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="mb-2 text-xs font-medium tracking-wide text-neutral-500">Comunidad Semanal</p>
            <h1 className="text-2xl font-medium tracking-tight text-neutral-900 sm:text-3xl">Mi panel</h1>
            <p className="mt-2 text-sm text-neutral-600">Tus publicaciones, pedidos y redes sociales en un solo lugar.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={cargarPanel} disabled={cargando} className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50`}>
              <RefreshCw size={14} /> Actualizar
            </button>
            {datos?.autenticado && <button onClick={salir} disabled={cerrando} className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50`}>
              <LogOut size={14} /> Salir
            </button>}
          </div>
        </header>

        {cargando && <div className={TARJETA}><p className="text-sm text-neutral-600">Cargando tu panel...</p></div>}
        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {mensaje && <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">{mensaje}</div>}

        {!cargando && !datos && <div className={`${TARJETA} space-y-3`}>
          <p className="text-sm text-neutral-700">Para acceder al panel, ingresá desde la landing con tu correo y el código de verificación.</p>
          <Link to={BASE} className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}>Ir a Comunidad Semanal <ArrowRight size={14} /></Link>
        </div>}

        {!cargando && datos && <>
          <section className={`${TARJETA} flex flex-wrap items-center justify-between gap-3`}>
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-neutral-900"><ShieldCheck size={17} /> Cuenta verificada</div>
              <p className="mt-1 break-all text-sm text-neutral-600">{datos.email}</p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-green-700"><CheckCircle2 size={15} /> Sesión activa</div>
          </section>

          <section className={TARJETA}>
            <div className="flex items-center gap-2"><CalendarDays size={18} className="text-neutral-600" /><h2 className="text-base font-medium text-neutral-900">Mi prueba gratuita</h2></div>
            <p className="mt-2 text-sm text-neutral-600">7 días · hasta 4 contenidos · Facebook, Instagram o ambas redes.</p>
            <p className="mt-2 text-xs text-neutral-500">La activación de la prueba y las publicaciones automáticas todavía están en preparación. Registrarte no inicia ni consume los siete días.</p>
          </section>

          {instagramError && <p className="text-xs text-amber-800">Instagram: {instagramError}</p>}
          <section className={TARJETA}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2"><FileText size={18} className="text-neutral-600" /><h2 className="text-base font-medium text-neutral-900">Mis pedidos y publicaciones</h2></div>
              <button onClick={() => { setMostrarVincular(x => !x); setError(""); }} className={`${BOTON} border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`}>
                <Link2 size={14} /> Vincular pedido existente
              </button>
            </div>

            {mostrarVincular && <form onSubmit={vincularPedido} className="mt-4 space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
              <p className="text-xs text-neutral-600">Vinculá un pedido que ya sea tuyo mediante su enlace privado. No compartas la clave con terceros.</p>
              <label className="block text-xs font-medium text-neutral-700" htmlFor="panel-codigo">Código del pedido (si usás la clave)</label>
              <input id="panel-codigo" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="SER-..." autoComplete="off" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500" />
              <label className="block text-xs font-medium text-neutral-700" htmlFor="panel-clave">Enlace privado completo o clave</label>
              <input id="panel-clave" value={acceso} onChange={e => setAcceso(e.target.value)} placeholder="Pegá tu enlace privado o clave" autoComplete="off" type="text" className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-500" />
              <button type="submit" disabled={guardando} className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}>
                {guardando ? "Vinculando..." : "Vincular a mi cuenta"} <ArrowRight size={14} />
              </button>
            </form>}

            {datos.pedidos.length === 0 ? <div className="mt-4 rounded-lg border border-dashed border-neutral-200 p-5 text-center">
              <p className="text-sm text-neutral-700">Todavía no hay pedidos vinculados a esta cuenta.</p>
              <p className="mt-1 text-xs text-neutral-500">Si contrataste como invitado, podés asociar ese pedido usando su enlace privado.</p>
              <Link to={`${BASE}/configurar`} className={`${BOTON} mt-3 border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`}>Ir al configurador <ArrowRight size={14} /></Link>
            </div> : <div className="mt-4 space-y-3">
              {datos.pedidos.map(p => <article key={p.pedidoId} className="rounded-lg border border-neutral-200 p-3 sm:p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{p.negocio}</p>
                    <p className="mt-1 break-all text-xs text-neutral-500">{p.pedidoId}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs text-neutral-700"><Clock3 size={12} /> {etiquetaEstado(p.estadoServicio)}</span>
                </div>
                <div className="mt-3">
                  <button type="button" onClick={() => {
                    setConfirmarRecuperacion(actual => actual === p.pedidoId ? "" : p.pedidoId);
                    setEnlaceRecuperado(null);
                    setCopiado(false);
                    setError("");
                  }} disabled={Boolean(recuperandoAcceso)} className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50`}>
                    <KeyRound size={14} /> Recuperar acceso privado
                  </button>
                </div>
                {confirmarRecuperacion === p.pedidoId && <div className="mt-3 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs text-neutral-700">Se generará una clave nueva para este pedido. <strong>Todos los enlaces privados anteriores dejarán de funcionar.</strong> Los archivos y las conexiones de Facebook e Instagram se conservarán.</p>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={Boolean(recuperandoAcceso)} onClick={() => recuperarAcceso(p.pedidoId)} className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}>
                      {recuperandoAcceso === p.pedidoId ? "Generando..." : "Generar nuevo enlace"}
                    </button>
                    <button type="button" disabled={Boolean(recuperandoAcceso)} onClick={() => setConfirmarRecuperacion("")} className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100`}>Cancelar</button>
                  </div>
                </div>}
                {enlaceRecuperado?.pedidoId === p.pedidoId && <div className="mt-3 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                  <p className="text-xs font-medium text-neutral-800">Tu nuevo enlace privado</p>
                  <p className="text-xs text-neutral-600">Guardalo ahora. Por seguridad, la clave no volverá a mostrarse cuando actualices esta página. No lo compartas con terceros.</p>
                  <input type="text" readOnly aria-label="Nuevo enlace privado" value={enlaceRecuperado.url} onFocus={e => e.target.select()} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700" />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={copiarAcceso} className={`${BOTON} border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-100`}><Copy size={14} /> {copiado ? "Copiado" : "Copiar enlace"}</button>
                    <button type="button" onClick={() => window.location.assign(enlaceRecuperado.url)} className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}><ExternalLink size={14} /> Abrir configurador</button>
                  </div>
                </div>}
                {p.modalidad === "prueba_gratuita" && <p className="mt-2 text-xs font-medium text-neutral-800">Prueba gratuita · {etiquetaEstado(p.prueba?.estado)} · 0 de 7 días consumidos</p>}
                {p.modalidad === "prueba_gratuita" && <div className="mt-3 space-y-3">
                  <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-neutral-900">Programar mis contenidos</p>
                        <p className="mt-1 text-xs text-neutral-600">Un único envío para solicitar revisión y dejar tu programación autorizada.</p>
                      </div>
                      <button type="button" onClick={() => abrirSolicitud(p.pedidoId)}
                        className={`${BOTON} border border-neutral-300 bg-white text-neutral-800 hover:bg-neutral-100`}>
                        {solicitudAbierta === p.pedidoId ? "Cerrar resumen" : "Revisar y confirmar"}
                      </button>
                    </div>
                    {solicitudes[p.pedidoId]?.vigente && <p role="status" className="text-xs font-medium text-green-800">
                      {solicitudes[p.pedidoId].aprobadosTecnicamente
                        ? "Solicitud confirmada · Contenidos aprobados · Esperando habilitación técnica"
                        : "Solicitud confirmada · Esperando revisión técnica"}
                    </p>}
                    {solicitudes[p.pedidoId]?.requiereNuevaConfirmacion && <div className="flex flex-wrap items-center gap-2">
                      <p role="status" className="text-xs font-medium text-amber-800">La configuración cambió o hay requisitos pendientes. Revisá y confirmá nuevamente antes de programar.</p>
                      <button type="button" disabled={Boolean(gestionandoSolicitud)} onClick={() => revocarSolicitud(p.pedidoId)}
                        className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100`}>
                        Revocar autorización anterior
                      </button>
                    </div>}
                    {erroresSolicitud[p.pedidoId] && <p role="alert" className="text-xs text-red-700">{erroresSolicitud[p.pedidoId]}</p>}
                    {solicitudAbierta === p.pedidoId && <div className="space-y-3 border-t border-neutral-200 pt-3">
                      {!solicitudes[p.pedidoId] ? <p className="text-xs text-neutral-600">Consultando requisitos de la solicitud...</p> : <>
                        <p className="text-xs text-neutral-700">{solicitudes[p.pedidoId].cantidadContenidos} contenidos · {solicitudes[p.pedidoId].cantidadEventos} publicaciones · {solicitudes[p.pedidoId].zonaHoraria}</p>
                        <p className="text-xs text-neutral-600">Redes: {(solicitudes[p.pedidoId].redes || []).map(r => r === "facebook" ? "Facebook" : "Instagram").join(" e ")}</p>
                        {solicitudes[p.pedidoId].motivos?.length > 0 && <div className="space-y-1">
                          <p className="text-xs font-medium text-amber-800">Antes de enviar la solicitud:</p>
                          <ul className="list-disc space-y-1 pl-4 text-xs text-neutral-700">
                            {solicitudes[p.pedidoId].motivos.map((m, i) => <li key={i}>{m}</li>)}
                          </ul>
                        </div>}
                        {solicitudes[p.pedidoId].vigente ? <>
                          <p className="text-xs text-neutral-600">La autorización está guardada. Se conserva al cerrar el navegador. El servicio todavía no publica.</p>
                          <button type="button" disabled={Boolean(gestionandoSolicitud)} onClick={() => revocarSolicitud(p.pedidoId)}
                            className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100`}>
                            {gestionandoSolicitud === p.pedidoId ? "Procesando..." : "Revocar autorización"}
                          </button>
                        </> : <>
                          <label className="flex items-start gap-2 text-xs text-neutral-700">
                            <input type="checkbox" className="mt-0.5" disabled={!solicitudes[p.pedidoId].listaParaSolicitud}
                              checked={Boolean(confirmacionesSolicitud[p.pedidoId])}
                              onChange={e => setConfirmacionesSolicitud(prev => ({ ...prev, [p.pedidoId]: e.target.checked }))} />
                            Autorizo que estos cuatro contenidos se programen y publiquen en las redes seleccionadas, en los días y horarios elegidos, una vez aprobados técnicamente y habilitado el servicio. Si cambio contenido, archivos, cuentas u horarios, volveré a confirmar. Puedo revocar esta autorización mientras no se active.
                          </label>
                          <button type="button" disabled={!solicitudes[p.pedidoId].listaParaSolicitud || !confirmacionesSolicitud[p.pedidoId] || Boolean(gestionandoSolicitud)}
                            onClick={() => registrarSolicitud(p.pedidoId)}
                            className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}>
                            {gestionandoSolicitud === p.pedidoId ? "Registrando..." : "Enviar solicitud de programación"}
                          </button>
                        </>}
                      </>}
                      <p className="text-xs text-neutral-500">Etapa de preparación: confirmar no inicia los 7 días ni publica. La activación automática aún no está habilitada.</p>
                    </div>}
                  </div>
                  <details className="rounded-lg border border-neutral-200 bg-white p-3">
                    <summary className="cursor-pointer text-xs font-medium text-neutral-600">Herramientas de prueba · Calendario técnico</summary>
                    <div className="mt-3 space-y-3">
                  <button type="button" onClick={() => mostrarCalendario(p.pedidoId)}
                    disabled={Boolean(calendarioCargando)} className={`${BOTON} border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`}>
                    <CalendarDays size={14} /> {calendarioAbierto === p.pedidoId ? "Ocultar calendario simulado" : "Ver calendario simulado"}
                  </button>
                  {calendarioAbierto === p.pedidoId && <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 sm:p-4">
                    <div>
                      <p className="text-sm font-medium text-neutral-900">Calendario de simulación · No publica</p>
                      <p className="mt-1 text-xs text-neutral-600">Proyección de los próximos 7 días desde este momento. No inicia el período gratuito, no reserva horarios ni realiza publicaciones.</p>
                    </div>
                    {calendarioCargando === p.pedidoId && <p className="text-xs text-neutral-600">Calculando horarios...</p>}
                    {calendarioErrores[p.pedidoId] && <p role="alert" className="text-xs text-red-700">{calendarioErrores[p.pedidoId]}</p>}
                    {calendarios[p.pedidoId] && <>
                      <p className="text-xs text-neutral-600">Zona horaria: <strong>{calendarios[p.pedidoId].zonaHoraria}</strong> · {calendarios[p.pedidoId].cantidadEventos} eventos simulados</p>
                      <div className="space-y-2">
                        {calendarios[p.pedidoId].eventos.map(evento => <div key={evento.id} className="rounded-md border border-neutral-200 bg-white p-3">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="font-medium text-neutral-900">Contenido {evento.numeroContenido} · {evento.red === "instagram" ? "Instagram" : "Facebook"}</span>
                            <span className="text-neutral-600">{evento.fechaLocal} · {evento.horaLocal}</span>
                          </div>
                          <p className="mt-1 text-xs text-neutral-600">{evento.dia} · {evento.tipo} · Solo simulación</p>
                          {evento.descripcion && <p className="mt-1 break-words text-xs text-neutral-500">{evento.descripcion}</p>}
                        </div>)}
                      </div>
                      {calendarios[p.pedidoId].advertencias.length > 0 && <div className="rounded-md border border-amber-200 bg-white p-3">
                        <p className="text-xs font-medium text-neutral-800">Comprobaciones pendientes</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs text-neutral-600">
                          {calendarios[p.pedidoId].advertencias.map((aviso, i) => <li key={i}>{aviso}</li>)}
                        </ul>
                      </div>}
                      <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
                        <p className="text-xs font-medium text-neutral-900">Preparación segura del calendario</p>
                        <p className="text-xs text-neutral-600">Guardar un borrador no confirma fechas definitivas, no inicia los 7 días y no publica. Los horarios se recalcularán cuando habilitemos una activación real.</p>
                        {calendarios[p.pedidoId].borrador && <p className="text-xs font-medium text-neutral-800" role="status">
                          {calendarios[p.pedidoId].borrador.revisionVigente
                            ? "Borrador guardado y vigente. Sin activar."
                            : "El borrador anterior ya no coincide con los contenidos u horarios actuales. Guardá una versión nueva."}
                        </p>}
                        {calendarios[p.pedidoId].reserva ? <p className="text-xs text-neutral-600">La reserva ya está registrada. El borrador quedó protegido contra reemplazos accidentales.</p> : calendarios[p.pedidoId].listoParaBorrador ? <>
                          <label className="flex items-start gap-2 text-xs text-neutral-700">
                            <input type="checkbox" checked={Boolean(confirmarBorrador[p.pedidoId])}
                              onChange={e => setConfirmarBorrador(prev => ({ ...prev, [p.pedidoId]: e.target.checked }))}
                              className="mt-0.5" />
                            Revisé las fechas y confirmo que estos contenidos no son pruebas internas. Solo quiero guardar el borrador; NO autorizo publicaciones todavía.
                          </label>
                          <button type="button" onClick={() => guardarBorradorCalendario(p.pedidoId)}
                            disabled={!confirmarBorrador[p.pedidoId] || Boolean(preparandoBorrador)}
                            className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}>
                            {preparandoBorrador === p.pedidoId ? "Guardando borrador..." : "Guardar calendario preliminar"}
                          </button>
                        </> : <p className="text-xs font-medium text-amber-800">Para preparar el borrador, primero resolvé todas las comprobaciones pendientes.</p>}
                      </div>
                      <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
                        <p className="text-xs font-medium text-neutral-900">Ensayo del motor de envíos</p>
                        <p className="text-xs text-neutral-600">Verifica el borrador y las identidades de los envíos. No se conecta con Meta y no activa la prueba.</p>
                        <button type="button" onClick={() => ensayarCalendario(p.pedidoId)}
                          disabled={Boolean(ensayando) || !calendarios[p.pedidoId].listoParaBorrador ||
                            !calendarios[p.pedidoId].borrador?.revisionVigente}
                          className={`${BOTON} border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`}>
                          {ensayando === p.pedidoId ? "Comprobando envíos..." : "Ensayar ejecución sin publicar"}
                        </button>
                        {!calendarios[p.pedidoId].borrador?.revisionVigente && <p className="text-xs text-amber-800">Necesitás un borrador guardado y vigente para ensayar los envíos.</p>}
                        {ensayos[p.pedidoId] && <div className="space-y-2" role="status">
                          <p className="text-xs font-medium text-neutral-800">Ensayo correcto: {ensayos[p.pedidoId].cantidadEventos} eventos distintos, todos bloqueados y sin publicar.</p>
                          <div className="space-y-1">
                            {ensayos[p.pedidoId].eventos.map(item => <div key={item.claveIdempotenciaPropuesta} className="flex flex-wrap items-center justify-between gap-2 border-b border-neutral-100 py-1 text-xs text-neutral-600">
                              <span>Contenido {item.numeroContenido} · {item.red === "facebook" ? "Facebook" : "Instagram"}</span>
                              <span>{item.fechaLocal} · {item.horaLocal} · Bloqueado</span>
                            </div>)}
                          </div>
                          <p className="text-xs text-neutral-500">Son identificadores de ensayo. La protección definitiva contra duplicados se habilitará con el motor de publicación.</p>
                        </div>}
                      </div>
                      <div className="space-y-2 rounded-md border border-neutral-200 bg-white p-3">
                        <p className="text-xs font-medium text-neutral-900">Reserva protegida de eventos</p>
                        <p className="text-xs text-neutral-600">Guarda los ocho turnos en una sola operación atómica. Todos quedan bloqueados; no inicia los siete días ni autoriza publicaciones.</p>
                        {calendarios[p.pedidoId].reserva && <p role="status" className="text-xs font-medium text-neutral-800">
                          {calendarios[p.pedidoId].reserva.revisionVigente
                            ? `Reserva registrada: ${calendarios[p.pedidoId].reserva.bloqueados} eventos bloqueados. Prueba sin activar.`
                            : "La reserva está bloqueada, pero sus contenidos o fechas cambiaron. Requiere revisión administrativa."}
                        </p>}
                        {!calendarios[p.pedidoId].reserva && ensayos[p.pedidoId]?.ok && ensayos[p.pedidoId]?.cantidadEventos === 8 && <>
                          <label className="flex items-start gap-2 text-xs text-neutral-700">
                            <input type="checkbox" checked={Boolean(confirmarReserva[p.pedidoId])}
                              onChange={e => setConfirmarReserva(prev => ({ ...prev, [p.pedidoId]: e.target.checked }))}
                              className="mt-0.5" />
                            Confirmo que deseo reservar ocho eventos bloqueados. NO autorizo la publicación ni el inicio de la prueba gratuita.
                          </label>
                          <button type="button" onClick={() => reservarEventos(p.pedidoId)}
                            disabled={!confirmarReserva[p.pedidoId] || Boolean(reservando)}
                            className={`${BOTON} bg-neutral-900 text-white hover:bg-neutral-700`}>
                            {reservando === p.pedidoId ? "Registrando reserva..." : "Reservar ocho eventos sin publicar"}
                          </button>
                        </>}
                        {!calendarios[p.pedidoId].reserva && !ensayos[p.pedidoId]?.ok && <p className="text-xs text-neutral-500">Primero ejecutá el ensayo correctamente para habilitar la reserva.</p>}
                      </div>
                      <p className="text-xs font-medium text-neutral-700">Ningún contenido será publicado ni se consumirán días de prueba.</p>
                    </>}
                  </div>}
                    </div>
                  </details>
                </div>}
                <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-neutral-700 sm:grid-cols-3">
                  <div>Pago: <span className="font-medium">{etiquetaEstado(p.estadoPago)}</span></div>
                  <div>Contenidos: <span className="font-medium">{etiquetaEstado(p.estadoContenidos)}</span></div>
                  <div>Redes: <span className="font-medium">{p.redes.map(x => x === "facebook" ? "Facebook" : "Instagram").join(" e ") || "Sin configurar"}</span></div>
                </div>
                {p.contenidos.length > 0 && <p className="mt-2 text-xs text-neutral-500">{p.contenidos.length} contenidos configurados</p>}
                <div className="mt-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                  <span className="font-medium text-[#1877F2]">Facebook: </span>
                  {p.facebook ? `${p.facebook.nombre} · ${etiquetaEstado(p.facebook.estado)}` : p.redes.includes("facebook") ? "Pendiente de conexión" : "No contratado"}
                </div>
                {p.redes.includes("instagram") && <div className="mt-2 flex flex-wrap items-center justify-between gap-3 rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
                  <p><span className="font-medium text-[#A53585]">Instagram: </span>
                    {instagramPorPedido[p.pedidoId] ? `@${instagramPorPedido[p.pedidoId].usuario} · ${etiquetaEstado(instagramPorPedido[p.pedidoId].estado)}` : instagramError ? "No se pudo consultar el estado" : "Pendiente de conexión"}
                  </p>
                  {instagramPorPedido[p.pedidoId] ? <button type="button" onClick={() => desconectarInstagram(p.pedidoId)} disabled={Boolean(accionInstagram)} className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100`}>
                    {accionInstagram === p.pedidoId ? "Procesando..." : "Desconectar Instagram"}
                  </button> : <button type="button" onClick={() => conectarInstagram(p.pedidoId)} disabled={Boolean(accionInstagram)} className={`${BOTON} border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100`}>
                    {accionInstagram === p.pedidoId ? "Redirigiendo..." : "Conectar Instagram"}
                  </button>}
                </div>}
              </article>)}
              <p className="text-xs text-neutral-500">Para cargar archivos o gestionar una conexión, seguí usando el acceso privado del pedido en el configurador hasta completar la integración del panel.</p>
              <Link to={`${BASE}/configurar`} className={`${BOTON} border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50`}>Abrir configurador <ArrowRight size={14} /></Link>
            </div>}
          </section>
          <p className="text-center text-xs text-neutral-500">Tu cuenta está separada de Administración. Las contrataciones públicas y la publicación automática siguen deshabilitadas durante las pruebas.</p>
        </>}
      </div>
    </main>
  );
}
