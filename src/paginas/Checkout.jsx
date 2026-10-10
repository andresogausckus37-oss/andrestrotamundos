import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, Landmark, Minus, Plus, X, Package, Truck, Search, LoaderCircle, Trash2, ArrowLeft } from "lucide-react";
import { useCarrito, cambiarCantidad, eliminarDelCarrito, resumenCarrito, vaciarCarrito } from "../utilidades/carrito";

const WHATSAPP = "5493548619293";
const precioARS = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n) || 0);
const WhatsAppIcon = () => <svg viewBox="0 0 32 32" width="21" height="21" fill="white" aria-hidden="true"><path d="M16 .8A15.1 15.1 0 0 0 3 23.5L.8 31l7.7-2A15.2 15.2 0 1 0 16 .8Zm0 27.7a12.4 12.4 0 0 1-6.3-1.7l-.5-.3-4.6 1.2 1.2-4.5-.3-.5A12.5 12.5 0 1 1 16 28.5Zm6.9-9.4c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.2 0-.5 0-.7l-1.2-2.9c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.5 1.5 3.7c.2.3 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.8.2 2.4.1.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.3-.7-.5Z"/></svg>;
const CAMPOS = [
  ["nombre", "Nombre y apellido", "name", "text"], ["email", "Correo electrónico", "email", "email"],
  ["telefono", "Teléfono", "tel", "tel"], ["direccion", "Dirección", "street-address", "text"],
  ["localidad", "Localidad", "address-level2", "text"], ["provincia", "Provincia", "address-level1", "text"],
  ["codigoPostal", "Código postal", "postal-code", "text"],
];
const DATOS_VACIOS = { nombre: "", email: "", telefono: "", direccion: "", localidad: "", provincia: "", codigoPostal: "" };
const CLAVE_DATOS = "tienda_datos_checkout_v1";

export default function Checkout({ modal = false, onClose = () => {}, onVolverTienda }) {
  const navigate = useNavigate();
  const articulos = useCarrito();
  const { subtotal, envio, total, faltante, porcentaje, cantidad } = resumenCarrito(articulos);
  const [paso, setPaso] = useState(1);
  const [datos, setDatos] = useState(() => { try { return { ...DATOS_VACIOS, ...JSON.parse(sessionStorage.getItem(CLAVE_DATOS) || "{}") }; } catch { return DATOS_VACIOS; } });
  const [pago, setPago] = useState("");
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);
  const [cpConsulta, setCpConsulta] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [consultado, setConsultado] = useState(false);

  useEffect(() => { sessionStorage.setItem(CLAVE_DATOS, JSON.stringify(datos)); }, [datos]);
  useEffect(() => {
    if (!modal) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tecla = (e) => { if (e.key === "Escape" && !creando) onClose(); };
    document.addEventListener("keydown", tecla);
    return () => { document.body.style.overflow = anterior; document.removeEventListener("keydown", tecla); };
  }, [modal, onClose, creando]);
  useEffect(() => {
    if (!consultando) return;
    const t = setTimeout(() => { setConsultando(false); setConsultado(true); }, 3000);
    return () => clearTimeout(t);
  }, [consultando]);
  const actualizar = (campo, valor) => { setDatos((d) => ({ ...d, [campo]: valor })); setError(""); };
  const continuar = (e) => {
    e.preventDefault();
    if (!articulos.length) return setError("Agregá productos al carrito.");
    if (Object.values(datos).some((v) => !String(v).trim())) return setError("Completá todos los campos obligatorios.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) return setError("Ingresá un correo válido.");
    if (!/^\d{4}$/.test(datos.codigoPostal.trim())) return setError("Ingresá un código postal de 4 dígitos.");
    setCpConsulta(datos.codigoPostal.trim()); setError(""); setPaso(2);
  };
  const buscarEnvio = (e) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(cpConsulta)) return setError("Ingresá un código postal de 4 dígitos.");
    setError(""); setConsultado(false); setConsultando(true);
  };
  const volverTienda = () => {
    if (onVolverTienda) onVolverTienda(); else if (modal) onClose();
    navigate("/tienda");
      };
  const pedir = async () => {
    if (creando) return;
    if (!articulos.length) return setError("El carrito está vacío.");
    if (!pago) return setError("Seleccioná un medio de pago.");
    if (!consultado || cpConsulta !== datos.codigoPostal.trim()) return setError("Calculá el envío con tu código postal antes de continuar.");
    const ventana = window.open("", "_blank");
    setCreando(true); setError("");
    try {
      const respuesta = await fetch("/api/admin/pedidos?accion=crear-pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productos: articulos.map((a) => ({ productoId: a.productoId, cantidad: a.cantidad, variante: a.variante })),
          nombreComprador: datos.nombre.trim(), emailComprador: datos.email.trim(), telefonoComprador: datos.telefono.trim(),
          direccion: datos.direccion.trim(), localidad: datos.localidad.trim(), provincia: datos.provincia.trim(),
          codigoPostal: datos.codigoPostal.trim(), metodoPago: pago,
        }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || !resultado.pedidoId) throw new Error(resultado.error || "No se pudo crear el pedido.");
      const items = articulos.map((a) => `• ${a.nombre}${a.variante ? ` (${a.variante})` : ""} × ${a.cantidad} — ${precioARS(a.precio * a.cantidad)}`).join("\n");
      const metodo = pago === "transferencia" ? "Transferencia bancaria" : "Link de pago de Mercado Pago (3 cuotas sin interés)";
      const mensaje = `Hola, quiero realizar este pedido:\n\n*Número de pedido:* ${resultado.pedidoId}\n\n*Productos:*\n${items}\n\n*Subtotal estimado:* ${precioARS(subtotal)}\n*Envío estimado (Correo Argentino):* ${envio ? precioARS(envio) : "Gratis"}\n*Total estimado:* ${precioARS(total)}\n*Medio de pago:* ${metodo}\n\n*Comprador:*\n${datos.nombre}\n${datos.email}\n${datos.telefono}\n\n*Envío:*\n${datos.direccion}, ${datos.localidad}, ${datos.provincia} (CP ${datos.codigoPostal})\n\nConfirmar importe final del pedido ${resultado.pedidoId}.`;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
      if (ventana && !ventana.closed) ventana.location.href = url; else window.location.href = url;
      vaciarCarrito(); sessionStorage.removeItem(CLAVE_DATOS);
    } catch (e) { if (ventana && !ventana.closed) ventana.close(); setError(e.message || "No se pudo crear el pedido."); }
    finally { setCreando(false); }
  };
  const contenido = <div className="flex h-full flex-col bg-[#FCFDFC] font-normal text-slate-900">
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
      <div><h2 className="text-lg font-medium">Finalizar pedido</h2><p className="mt-1 text-xs text-slate-500">Paso {paso} de 2 · {paso === 1 ? "Datos personales y envío" : "Resumen y pago"}</p></div>
      {modal && <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-xs p-2 hover:bg-slate-100"><X size={21}/></button>}
    </header>
    <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      {paso === 1 ? <form id="formulario-pedido" onSubmit={continuar}>
        <h3 className="mb-3 text-sm font-medium">Información personal y datos de envío</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{CAMPOS.map(([campo, etiqueta, autoComplete, tipo]) => <label key={campo} className="block text-xs font-normal text-slate-700">{etiqueta} *<input required type={tipo} autoComplete={autoComplete} value={datos[campo]} onChange={(e) => actualizar(campo, e.target.value)} className="mt-1 block w-full rounded-xs border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#285861]" /></label>)}</div>
      </form> : <section>
        <h3 className="mb-3 text-sm font-medium">Tu pedido · {cantidad} {cantidad === 1 ? "artículo" : "artículos"}</h3>
        <div className="space-y-3">{articulos.map((a) => <div key={a.clave} className="rounded-xs border border-slate-200 bg-white p-3">
          <div className="flex gap-3">{a.imagen ? <img src={a.imagen} alt="" className="h-16 w-16 rounded-xs object-contain"/> : <Package size={25}/>}<div className="min-w-0 flex-1"><p className="text-sm font-medium">{a.nombre}</p>{a.variante && <p className="mt-1 text-xs text-slate-500">Variante: {a.variante}</p>}<p className="mt-1 text-sm">{precioARS(a.precio)} c/u</p></div><button type="button" aria-label={`Quitar ${a.nombre}`} onClick={() => eliminarDelCarrito(a.clave)}><Trash2 size={17}/></button></div>
          <div className="mt-3 flex items-center justify-between"><div className="flex items-center rounded-xs border border-slate-200"><button type="button" aria-label="Restar" className="p-2" onClick={() => cambiarCantidad(a.clave, a.cantidad - 1)}><Minus size={15}/></button><span className="px-2 text-sm">{a.cantidad}</span><button type="button" aria-label="Sumar" className="p-2" onClick={() => cambiarCantidad(a.clave, a.cantidad + 1)}><Plus size={15}/></button></div><span className="text-sm font-medium">{precioARS(a.precio * a.cantidad)}</span></div>
        </div>)}</div>
        <div className="mt-4 rounded-xs border border-slate-200 bg-white p-4"><div className="flex justify-between text-sm"><span>Subtotal de productos</span><span className="font-medium">{precioARS(subtotal)}</span></div></div>
        <h3 className="mb-3 mt-5 text-sm font-medium">Elegí cómo querés pagar</h3>
        <div className="space-y-3">
          <label className={`flex cursor-pointer items-center gap-3 rounded-xs border bg-white p-4 ${pago === "transferencia" ? "border-[#285861]" : "border-slate-200"}`}><input type="radio" name="pago" checked={pago === "transferencia"} onChange={() => setPago("transferencia")}/><Landmark size={20}/><span className="text-sm">Transferencia bancaria</span></label>
          <label className={`flex cursor-pointer items-center gap-3 rounded-xs border bg-white p-4 ${pago === "mercado_pago_link" ? "border-[#285861]" : "border-slate-200"}`}><input type="radio" name="pago" checked={pago === "mercado_pago_link"} onChange={() => setPago("mercado_pago_link")}/><CreditCard size={20}/><span><span className="block text-sm">Link de pago de Mercado Pago</span><span className="mt-1 block text-xs text-slate-600">3 cuotas sin interés con este medio de pago 🔥</span></span></label>
        </div>
        <div className="mt-5 rounded-xs border border-slate-200 bg-white p-4"><h3 className="mb-3 text-sm font-medium">Calcular envío</h3><form onSubmit={buscarEnvio} className="flex gap-2"><input aria-label="Código postal" inputMode="numeric" maxLength={4} required pattern="[0-9]{4}" placeholder="Código postal" value={cpConsulta} onChange={(e) => {setCpConsulta(e.target.value.replace(/\D/g, ""));setConsultado(false);setConsultando(false);}} className="min-w-0 flex-1 rounded-xs border border-slate-300 px-3 py-2.5 text-sm"/><button type="submit" disabled={consultando} className="inline-flex items-center gap-2 rounded-xs bg-[#285861] px-4 py-2.5 text-sm text-white disabled:opacity-60">{consultando ? <LoaderCircle size={16} className="animate-spin"/> : <Search size={16}/>} {consultando ? "Buscando..." : "Buscar"}</button></form>{consultando && <p role="status" className="mt-3 text-xs text-slate-600">Calculando costo de envío...</p>}{consultado && <div role="status" className="mt-3 rounded-xs border border-slate-200 p-3 text-sm">Envío a CP {cpConsulta}: <strong className="font-medium">{envio ? precioARS(envio) : "Gratis"}</strong></div>}</div>
        {consultado && <div className="mt-3 flex items-center gap-3 rounded-xs border border-slate-200 bg-white p-4"><Truck size={23} className="shrink-0 text-[#285861]"/><div><p className="text-sm font-medium">Correo Argentino</p><p className="mt-1 text-xs text-slate-600">Despachamos dentro de las primeras 24 horas posteriores a la compra. Entrega estimada: 2 a 5 días hábiles en tu domicilio.</p></div></div>}
        <div className="mt-3 rounded-xs border border-slate-200 bg-white p-4"><p className="text-sm font-medium">{faltante ? "¡Sumá otro producto y aprovechá el envío gratis!" : "¡Conseguiste envío gratis!"}</p><p className="mt-1 text-xs text-slate-600">{faltante ? `Te faltan ${precioARS(faltante)} para llegar a ${precioARS(40000)} en productos y ahorrar ${precioARS(8000)} de envío.` : "Tu compra supera el mínimo de $40.000 en productos."}</p><div className="mt-3 h-2 overflow-hidden rounded-xs bg-slate-200" role="progressbar" aria-label="Progreso para envío gratis" aria-valuenow={Math.round(porcentaje)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-xs bg-[#285861] transition-all duration-300" style={{width: `${porcentaje}%`}}/></div>{faltante > 0 && <button type="button" onClick={volverTienda} className="mt-3 inline-flex items-center gap-2 rounded-xs bg-[#285861] px-4 py-2.5 text-sm text-white"><ArrowLeft size={15}/> Ver más productos</button>}</div>
        <div className="mt-3 rounded-xs border border-slate-200 bg-white p-4"><div className="flex justify-between text-sm"><span>Productos</span><span>{precioARS(subtotal)}</span></div><div className="mt-2 flex justify-between text-sm"><span>Envío</span><span>{envio ? precioARS(envio) : "Gratis"}</span></div><div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm font-medium"><span>Total a pagar</span><span>{precioARS(total)}</span></div>{pago === "mercado_pago_link" && <p className="mt-2 text-xs">3 cuotas de {precioARS(total / 3)}</p>}</div>
      </section>}
      {error && <p role="alert" className="mt-3 rounded-xs bg-red-50 p-3 text-xs text-red-700">{error}</p>}
    </div>
    <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">{paso === 2 && <button type="button" onClick={() => {setPaso(1);setError("");}} className="mb-3 w-full rounded-xs border border-slate-200 py-2.5 text-sm">Editar mis datos</button>}{paso === 1 ? <button form="formulario-pedido" type="submit" disabled={!articulos.length} className="w-full rounded-xs bg-[#285861] px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300">Continuar a pagos</button> : <button type="button" onClick={pedir} disabled={creando || !pago || !articulos.length || !consultado} className="flex w-full items-center justify-center gap-2 rounded-xs bg-[#25D366] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"><WhatsAppIcon/>{creando ? "Creando pedido..." : "Pedir por WhatsApp"}</button>}</footer>
  </div>;
  if (!modal) return <main className="mx-auto min-h-screen max-w-3xl p-4">{contenido}</main>;
  return <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Finalizar pedido"><button type="button" aria-label="Cerrar modal" onClick={onClose} className="absolute inset-0 bg-black/50"/><div className="relative z-10 h-full w-full max-w-xl animate-[slideCheckout_.3s_ease-out] shadow-2xl">{contenido}</div><style>{`@keyframes slideCheckout_ { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style></div>;
}