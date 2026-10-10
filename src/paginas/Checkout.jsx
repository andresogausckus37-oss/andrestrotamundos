import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CreditCard, Landmark, Minus, Plus, X, Package } from "lucide-react";

const WHATSAPP = "5493548619293";
const CUOTAS = 3;
const precioARS = (n) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 }).format(Number(n) || 0);
const nombreDe = (p) => typeof p?.nombre === "string" ? p.nombre : p?.nombre?.es || "Producto";
const WhatsAppIcon = () => (
  <svg viewBox="0 0 32 32" width="21" height="21" fill="white" aria-hidden="true">
    <path d="M16 .8A15.1 15.1 0 0 0 3 23.5L.8 31l7.7-2A15.2 15.2 0 1 0 16 .8Zm0 27.7a12.4 12.4 0 0 1-6.3-1.7l-.5-.3-4.6 1.2 1.2-4.5-.3-.5A12.5 12.5 0 1 1 16 28.5Zm6.9-9.4c-.4-.2-2.2-1.1-2.6-1.2-.3-.1-.6-.2-.8.2-.3.4-1 1.2-1.2 1.4-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.7.1-.2 0-.5 0-.7l-1.2-2.9c-.3-.7-.6-.6-.8-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.5 1.5 3.7c.2.3 2.6 4 6.3 5.6.9.4 1.6.6 2.1.8.9.3 1.8.2 2.4.1.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.7.2-1.8-.1-.2-.3-.3-.7-.5Z"/>
  </svg>
);

export default function Checkout({ productoInicial = null, varianteInicial = "", modal = false, onClose = () => {} }) {
  const { id } = useParams();
  const [producto, setProducto] = useState(productoInicial);
  const [cargando, setCargando] = useState(!productoInicial);
  const [error, setError] = useState("");
  const [paso, setPaso] = useState(1);
  const [creando, setCreando] = useState(false);
  const [cantidad, setCantidad] = useState(1);
  const [variante, setVariante] = useState(varianteInicial);
  const [pago, setPago] = useState("");
  const [datos, setDatos] = useState({ nombre: "", email: "", telefono: "", direccion: "", localidad: "", provincia: "", codigoPostal: "" });

  useEffect(() => {
    if (productoInicial) { setProducto(productoInicial); return; }
    let activo = true;
    (async () => {
      try {
        const r = await fetch("/api/admin/pedidos?accion=productos-publicos");
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "No se pudo cargar el producto.");
        const p = (d.productos || []).find((x) => String(x.id) === String(id));
        if (!p) throw new Error("Producto no encontrado.");
        if (activo) { setProducto(p); const v = p.detalles?.variantes || []; if (v.length === 1) setVariante(v[0]); }
      } catch (e) { if (activo) setError(e.message); }
      finally { if (activo) setCargando(false); }
    })();
    return () => { activo = false; };
  }, [id, productoInicial]);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e) => { if (e.key === "Escape" && !creando) onClose(); };
    document.addEventListener("keydown", onKey);
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = anterior; };
  }, [modal, onClose, creando]);

  const variantes = useMemo(() => (producto?.detalles?.variantes || []).filter(Boolean), [producto]);
  const precioUnitario = useMemo(() => {
    if (!producto) return 0;
    const normal = Number(producto.precioARS) || 0;
    const oferta = Number(producto.oferta?.precioARS) || 0;
    const fin = producto.ofertaLanzamiento?.finalizaEn;
    return producto.oferta?.activa && oferta > 0 && (!fin || new Date(fin).getTime() > Date.now()) ? oferta : normal;
  }, [producto]);
  const total = precioUnitario * cantidad;
  const stock = Number(producto?.stock);
  const disponible = producto && !["sin-stock", "proximamente", "pausado"].includes(producto.disponibilidad) && stock !== 0;
  const actualizar = (campo, valor) => { setDatos((prev) => ({ ...prev, [campo]: valor })); setError(""); };
  const continuar = (e) => {
    e.preventDefault();
    if (Object.values(datos).some((v) => !v.trim())) { setError("Completá todos los campos obligatorios."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(datos.email.trim())) { setError("Ingresá un correo válido."); return; }
    if (variantes.length && !variante) { setError("Seleccioná una variante."); return; }
    if (!disponible) { setError("El producto no está disponible."); return; }
    setError(""); setPaso(2);
  };
  const pedir = async () => {
    if (!pago || !disponible || creando) { setError("Seleccioná un medio de pago."); return; }
    // Abrir la pestaña antes de la petición evita bloqueos de ventanas emergentes.
    const ventana = window.open("", "_blank");
    try {
      setCreando(true); setError("");
      const respuesta = await fetch("/api/admin/pedidos?accion=crear-pedido", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productoId: producto.id, variante, cantidad, nombreComprador: datos.nombre.trim(), emailComprador: datos.email.trim(), telefonoComprador: datos.telefono.trim(), direccion: datos.direccion.trim(), localidad: datos.localidad.trim(), provincia: datos.provincia.trim(), codigoPostal: datos.codigoPostal.trim(), metodoPago: pago, medioPago: pago }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok || !resultado.pedidoId) throw new Error(resultado.error || "No se pudo crear el pedido.");
      const metodo = pago === "transferencia" ? "Transferencia bancaria. Solicito los datos para transferir y enviar el comprobante." : "Link de pago de Mercado Pago. Solicito el link para pagar en hasta 3 cuotas sin interés.";
      const mensaje = `Hola, quiero realizar este pedido:\n\n*Número de pedido:* ${resultado.pedidoId}\n*Producto:* ${nombreDe(producto)}\n${variante ? `*Variante:* ${variante}\n` : ""}*Cantidad:* ${cantidad}\n*Precio unitario:* ${precioARS(precioUnitario)}\n*Total:* ${precioARS(total)}\n*Medio de pago:* ${metodo}\n\n*Comprador*\nNombre: ${datos.nombre.trim()}\nEmail: ${datos.email.trim()}\nTeléfono: ${datos.telefono.trim()}\n\n*Envío*\nDirección: ${datos.direccion.trim()}\nLocalidad: ${datos.localidad.trim()}\nProvincia: ${datos.provincia.trim()}\nCódigo postal: ${datos.codigoPostal.trim()}`;
      const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
      if (ventana && !ventana.closed) ventana.location.href = url;
      else window.location.href = url;
    } catch (e) { if (ventana && !ventana.closed) ventana.close(); setError(e.message || "No se pudo iniciar el pedido."); }
    finally { setCreando(false); }
  };
  const campos = [
    ["nombre", "Nombre y apellido", "name", "text"], ["email", "Correo electrónico", "email", "email"],
    ["telefono", "Teléfono", "tel", "tel"], ["direccion", "Dirección", "street-address", "text"],
    ["localidad", "Localidad", "address-level2", "text"], ["provincia", "Provincia", "address-level1", "text"],
    ["codigoPostal", "Código postal", "postal-code", "text"],
  ];
  const contenido = (
    <div className="flex h-full flex-col bg-[#FCFDFC] text-slate-900 font-normal">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 sm:px-6">
        <div><h2 className="text-lg font-medium">Finalizar pedido</h2><p className="mt-1 text-xs text-slate-500">Paso {paso} de 2 · {paso === 1 ? "Datos personales y envío" : "Medio de pago"}</p></div>
        {modal && <button type="button" onClick={onClose} aria-label="Cerrar" className="rounded-xs p-2 hover:bg-slate-100"><X size={21}/></button>}
      </header>
      <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
        {cargando ? <p className="text-sm">Cargando producto...</p> : !producto ? <p className="text-sm text-red-600">{error || "Producto no encontrado."}</p> : <>
          <div className="mb-5 flex gap-3 rounded-xs border border-slate-200 bg-white p-3">
            {producto.imagenes?.portada ? <img src={producto.imagenes.portada} alt="" className="h-20 w-20 rounded-xs object-contain"/> : <Package size={26}/>}
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">{nombreDe(producto)}</p><p className="mt-1 text-sm font-medium">{precioARS(precioUnitario)}</p>{variante && <p className="mt-1 text-xs text-slate-500">Variante: {variante}</p>}</div>
          </div>
          {paso === 1 ? <form id="formulario-pedido" onSubmit={continuar}>
            <h3 className="mb-3 text-sm font-medium">Información personal y datos de envío</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{campos.map(([clave, etiqueta, autoComplete, type]) => <label key={clave} className="block text-xs font-normal text-slate-700">{etiqueta} *<input required type={type} autoComplete={autoComplete} value={datos[clave]} onChange={(e) => actualizar(clave, e.target.value)} className="mt-1 block w-full rounded-xs border border-slate-300 bg-white px-3 py-2.5 text-sm font-normal outline-none focus:border-[#285861]" /></label>)}</div>
            {variantes.length > 0 && <label className="mt-4 block text-xs">Variante *<select required value={variante} onChange={(e) => setVariante(e.target.value)} className="mt-1 block w-full rounded-xs border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Seleccioná una variante</option>{variantes.map((v) => <option key={v} value={v}>{v}</option>)}</select></label>}
          </form> : <section>
            <h3 className="mb-3 text-sm font-medium">Elegí cómo querés pagar</h3>
            <div className="space-y-3">
              <label className={`flex cursor-pointer items-center gap-3 rounded-xs border bg-white p-4 ${pago === "transferencia" ? "border-[#285861]" : "border-slate-200"}`}><input type="radio" name="pago" checked={pago === "transferencia"} onChange={() => {setPago("transferencia");setError("");}}/><Landmark size={20}/><span className="text-sm font-normal">Transferencia bancaria</span></label>
              <label className={`flex cursor-pointer items-center gap-3 rounded-xs border bg-white p-4 ${pago === "mercado_pago_link" ? "border-[#285861]" : "border-slate-200"}`}><input type="radio" name="pago" checked={pago === "mercado_pago_link"} onChange={() => {setPago("mercado_pago_link");setError("");}}/><CreditCard size={20}/><span><span className="block text-sm font-normal">Link de pago de Mercado Pago</span><span className="mt-1 block text-xs font-normal text-slate-600">3 cuotas sin interés con este medio de pago 🔥</span></span></label>
            </div>
          </section>}
          <div className="mt-5 rounded-xs border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><span className="text-sm">Cantidad</span><div className="flex items-center rounded-xs border border-slate-200"><button type="button" onClick={() => setCantidad(Math.max(1, cantidad - 1))} className="p-2" aria-label="Restar"><Minus size={15}/></button><span className="px-2 text-sm">{cantidad}</span><button type="button" onClick={() => setCantidad(Number.isFinite(stock) && stock > 0 ? Math.min(stock, cantidad + 1) : cantidad + 1)} className="p-2" aria-label="Sumar"><Plus size={15}/></button></div></div><div className="mt-3 flex justify-between border-t border-slate-100 pt-3 text-sm"><span className="font-medium">Total</span><span className="font-medium">{precioARS(total)}</span></div>{pago === "mercado_pago_link" && paso === 2 && <p className="mt-2 text-xs">3 cuotas de {precioARS(total / CUOTAS)}</p>}</div>
        </>}
        {error && producto && <p role="alert" className="mt-3 rounded-xs bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      </div>
      {producto && <footer className="border-t border-slate-200 bg-white px-4 py-4 sm:px-6">{paso === 2 && <button type="button" onClick={() => {setPaso(1);setError("");}} className="mb-3 w-full rounded-xs border border-slate-200 py-2.5 text-sm">Editar mis datos</button>}{paso === 1 ? <button form="formulario-pedido" type="submit" disabled={!disponible} className="w-full rounded-xs bg-[#285861] px-4 py-3 text-sm font-medium text-white disabled:bg-slate-300">Continuar a pagos</button> : <button type="button" onClick={pedir} disabled={creando || !pago || !disponible} className="flex w-full items-center justify-center gap-2 rounded-xs bg-[#25D366] px-4 py-3 text-sm font-medium text-white disabled:opacity-50"><WhatsAppIcon/>{creando ? "Creando pedido..." : "Pedir por WhatsApp"}</button>}</footer>}
    </div>
  );
  if (!modal) return <main className="mx-auto min-h-screen max-w-3xl p-4">{contenido}</main>;
  return <div className="fixed inset-0 z-[100] flex justify-end" role="dialog" aria-modal="true" aria-label="Finalizar pedido"><button type="button" aria-label="Cerrar modal" onClick={onClose} className="absolute inset-0 bg-black/50"/><div className="relative z-10 h-full w-full max-w-xl animate-[slideCheckout_.3s_ease-out] shadow-2xl">{contenido}</div><style>{`@keyframes slideCheckout_ { from { transform: translateX(100%); } to { transform: translateX(0); } }`}</style></div>;
}
