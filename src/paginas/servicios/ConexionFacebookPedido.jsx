import { useEffect, useState } from "react";
import { CheckCircle2, ExternalLink, Share2, Link2Off, RefreshCw, ShieldCheck } from "lucide-react";

const API_META = "/api/servicios/meta/pedidos";

async function leerRespuesta(respuesta) {
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || datos.ok !== true) {
    throw new Error(datos.error || "No se pudo consultar la conexión de Facebook.");
  }
  return datos;
}

export default function ConexionFacebookPedido({ pedido }) {
  const [estado, setEstado] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [revision, setRevision] = useState(0);

  const pedidoId = pedido?.id;
  const token = pedido?.tokenAcceso;

  // Se consulta el servidor, no el estado guardado en sessionStorage, para
  // comprobar si el pago está confirmado y si Facebook fue contratado.
  useEffect(() => {
    if (!pedidoId || !token) return;
    const controller = new AbortController();
    let enCurso = false;
    async function consultar() {
      if (controller.signal.aborted || enCurso) return;
      enCurso = true;
      setCargando(true);
      try {
        const respuesta = await fetch(`${API_META}/estado?pedidoId=${encodeURIComponent(pedidoId)}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
          cache: "no-store",
          signal: controller.signal,
        });
        const datos = await leerRespuesta(respuesta);
        if (!controller.signal.aborted) {
          setEstado(datos);
          setError("");
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setEstado(null);
          setError(err?.message || "No se pudo consultar Facebook.");
        }
      } finally {
        enCurso = false;
        if (!controller.signal.aborted) setCargando(false);
      }
    }
    function alVolver() {
      if (document.visibilityState === "visible") consultar();
    }
    consultar();
    window.addEventListener("focus", alVolver);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      controller.abort();
      window.removeEventListener("focus", alVolver);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, [pedidoId, token, revision]);

  async function conectar() {
    if (!estado?.habilitada || procesando) return;
    setProcesando(true);
    setError("");
    setAviso("");
    try {
      const respuesta = await fetch(`${API_META}/iniciar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ pedidoId }),
      });
      const datos = await leerRespuesta(respuesta);
      const destino = new URL(datos.authorizationUrl);
      // Nunca navegamos a una URL arbitraria proporcionada por una API.
      if (destino.protocol !== "https:" || destino.hostname !== "www.facebook.com" ||
          !/^\/v\d+\.\d+\/dialog\/oauth$/.test(destino.pathname)) {
        throw new Error("Meta devolvió un enlace de autorización inesperado.");
      }
      // Mismo navegador y mismo dominio: conserva la cookie OAuth de estado.
      window.location.assign(destino.toString());
    } catch (err) {
      setError(err?.message || "No se pudo iniciar la conexión.");
      setProcesando(false);
    }
  }

  async function desconectar() {
    if (!estado?.conectada || procesando ||
        !window.confirm("¿Querés desconectar esta página de Facebook del pedido?")) return;
    setProcesando(true);
    setAviso("");
    setError("");
    try {
      const respuesta = await fetch(`${API_META}/desconectar`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, Accept: "application/json" },
        cache: "no-store",
        body: JSON.stringify({ pedidoId }),
      });
      await leerRespuesta(respuesta);
      setAviso("La conexión se eliminó de este pedido.");
      setRevision((n) => n + 1);
    } catch (err) {
      setError(err?.message || "No se pudo desconectar Facebook.");
    } finally {
      setProcesando(false);
    }
  }

  // Si el pedido incluye solo Instagram, Facebook no forma parte del panel.
  if (!cargando && !error && estado && !estado.facebookContratado && !estado.conectada) return null;

  return (
    <section className="mt-4 rounded-md border border-slate-200 bg-white p-4" aria-label="Conexión de Facebook del pedido">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
        <Share2 size={18} aria-hidden="true" /> Conectar página de Facebook
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-600">
        La página que autorices quedará vinculada solo a este pedido. No se publicará contenido hasta completar la preparación y aprobación.
      </p>
      {cargando && <p className="mt-3 text-xs text-slate-600" role="status">Consultando el estado de Facebook...</p>}
      {!cargando && estado?.conectada && (
        <div className="mt-3 rounded-md border border-slate-200 p-3">
          <p className="flex items-center gap-2 text-sm font-medium text-slate-900">
            <CheckCircle2 size={17} className="text-emerald-700" aria-hidden="true" /> {estado.conexion?.nombre || "Página conectada"}
          </p>
          <p className="mt-1 break-all text-xs text-slate-600">ID: {estado.conexion?.pageId}</p>
          <p className="mt-1 text-xs text-slate-600">Estado: conectada</p>
        </div>
      )}
      {!cargando && estado?.facebookContratado && !estado.pagoConfirmado && !estado.conectada && (
        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-slate-700">
          <ShieldCheck size={17} className="mt-0.5 shrink-0" aria-hidden="true" /> La vinculación se habilitará cuando Administración confirme el pago.
        </p>
      )}
      {!cargando && estado?.facebookContratado && estado.pagoConfirmado && !estado.habilitada && !estado.conectada && (
        <p className="mt-3 text-xs text-slate-600">Este pedido todavía no admite nuevas vinculaciones.</p>
      )}
      {!cargando && (estado?.habilitada || estado?.conectada) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {estado.habilitada && (
            <button type="button" onClick={conectar} disabled={procesando}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-[#1877F2] px-3 py-2 text-xs font-medium text-white hover:bg-[#166FE5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1877F2] disabled:cursor-wait disabled:opacity-60">
              <ExternalLink size={15} aria-hidden="true" /> {procesando ? "Procesando..." : estado.conectada ? "Renovar conexión" : "Conectar Facebook"}
            </button>
          )}
          {estado.conectada && (
            <button type="button" onClick={desconectar} disabled={procesando}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60">
              <Link2Off size={15} aria-hidden="true" /> Desconectar
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-3 text-xs leading-5 text-red-700" role="alert">{error}</p>}
      {aviso && <p className="mt-3 text-xs leading-5 text-slate-700" role="status">{aviso}</p>}
      {!cargando && <button type="button" disabled={procesando} onClick={() => setRevision((n) => n + 1)}
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-orange-700 underline underline-offset-2 disabled:opacity-60">
        <RefreshCw size={14} aria-hidden="true" /> Actualizar estado
      </button>}
    </section>
  );
}
