import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Check,
  FileCheck,
  Loader2,
  RefreshCw,
  X,
  ZoomIn,
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  const [
    comprobanteAmpliado,
    setComprobanteAmpliado,
  ] = useState(null);

  const [
    procesandoPedido,
    setProcesandoPedido,
  ] = useState(null);

  /* =========================
     CARGAR PEDIDOS
  ========================= */

  const cargarPedidos = async () => {
    try {
      setError("");

      const respuesta = await fetch(
        "/api/admin/pedidos-pendientes"
      );

      if (respuesta.status === 401) {
        navigate("/admin/login");
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudieron cargar los pedidos."
        );
      }

      setPedidos(datos.pedidos || []);
    } catch (error) {
      setError(
        error.message ||
          "No se pudieron cargar los pedidos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarPedidos();

    const intervalo = setInterval(
      cargarPedidos,
      10000
    );

    return () => clearInterval(intervalo);
  }, []);

  /* =========================
     AVANZAR ESTADO
  ========================= */

  const avanzarEstado = async (pedidoId) => {
    try {
      setProcesandoPedido(pedidoId);
      setError("");

      const respuesta = await fetch(
        "/api/admin/avanzar-estado",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            pedidoId,
          }),
        }
      );

      if (respuesta.status === 401) {
        navigate("/admin/login");
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo actualizar el pedido."
        );
      }

      await cargarPedidos();
    } catch (error) {
      setError(
        error.message ||
          "No se pudo actualizar el pedido."
      );
    } finally {
      setProcesandoPedido(null);
    }
  };

  /* =========================
     FORMATO
  ========================= */

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 2,
    }).format(precio || 0);

  const formatearFecha = (fecha) => {
    if (!fecha) return "";

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(fecha));
  };

  const nombreEstado = (estado) => {
    const estados = {
      esperando_transferencia:
        "Esperando transferencia",

      comprobante_recibido:
        "Comprobante recibido",

      verificando_pago:
        "Verificando pago",

      aprobado:
        "Pago confirmado",
    };

    return estados[estado] || estado;
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-5xl">

        {/* ENCABEZADO */}

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Administración
            </p>

            <h1 className="text-xl font-bold text-slate-900">
              Transferencias pendientes
            </h1>

            <p className="mt-1 text-[10px] text-slate-500">
              {pedidos.length} pedido
              {pedidos.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={cargarPedidos}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700"
          >
            <RefreshCw size={13} />
            Actualizar
          </button>
        </div>

        {/* CONTENIDO */}

        {cargando ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
            <Loader2
              size={15}
              className="animate-spin"
            />

            Cargando pedidos...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        ) : pedidos.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-center">
            <FileCheck
              size={24}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-xs font-semibold text-slate-700">
              No hay transferencias pendientes.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {pedidos.map((pedido) => {
              const comprobanteUrl =
                `/api/admin/comprobante?pedidoId=${encodeURIComponent(
                  pedido.pedidoId
                )}`;

              return (
                <section
                  key={pedido.pedidoId}
                  className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                >
                  {/* DOS COLUMNAS */}

                  <div className="grid md:grid-cols-2">

                    {/* DATOS */}

                    <div className="p-4 md:border-r md:border-slate-200">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-slate-900">
                            {
                              pedido.nombreComprador
                            }
                          </p>

                          <p className="mt-0.5 truncate text-[10px] text-slate-500">
                            {
                              pedido.emailComprador
                            }
                          </p>
                        </div>

                        <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                          {nombreEstado(
                            pedido.estado
                          )}
                        </span>
                      </div>

                      {/* PRODUCTOS */}

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <p className="mb-2 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Productos
                        </p>

                        <div className="space-y-2">
                          {pedido.productos.map(
                            (producto) => (
                              <div
                                key={
                                  producto.productoId
                                }
                                className="flex items-start justify-between gap-3"
                              >
                                <p className="text-[10px] leading-4 text-slate-600">
                                  {
                                    producto.nombre
                                  }
                                </p>

                                <p className="shrink-0 text-[10px] font-semibold text-slate-800">
                                  {formatearPrecio(
                                    producto.precio
                                  )}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* TOTAL */}

                      <div className="mt-4 border-t border-slate-100 pt-3">
                        <div className="flex items-end justify-between gap-3">
                          <div>
                            <p className="text-[9px] text-slate-400">
                              Pedido creado
                            </p>

                            <p className="mt-0.5 text-[10px] text-slate-600">
                              {formatearFecha(
                                pedido.creadoEn
                              )}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-[9px] text-slate-400">
                              Total transferido
                            </p>

                            <p className="text-base font-bold text-slate-900">
                              {formatearPrecio(
                                pedido.precio
                              )}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="mt-3 break-all text-[8px] text-slate-300">
                        {pedido.pedidoId}
                      </p>
                    </div>

                    {/* COMPROBANTE */}

                    <div className="border-t border-slate-200 bg-slate-50 p-4 md:border-t-0">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
                          Comprobante
                        </p>

                        {pedido.comprobante && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-600">
                            <Check size={10} />
                            Recibido
                          </span>
                        )}
                      </div>

                      {pedido.comprobante ? (
                        <button
                          type="button"
                          onClick={() =>
                            setComprobanteAmpliado(
                              {
                                url: comprobanteUrl,
                                pedidoId:
                                  pedido.pedidoId,
                              }
                            )
                          }
                          className="group relative block h-[240px] w-full overflow-hidden rounded-lg border border-slate-200 bg-white"
                        >
                          <img
                            src={comprobanteUrl}
                            alt="Comprobante de transferencia"
                            className="h-full w-full object-contain"
                          />

                          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/20">
                            <div className="flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-2 text-[10px] font-bold text-slate-800 opacity-0 shadow transition group-hover:opacity-100">
                              <ZoomIn
                                size={13}
                              />
                              Ampliar
                            </div>
                          </div>
                        </button>
                      ) : (
                        <div className="flex h-[240px] items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white">
                          <div className="text-center">
                            <FileCheck
                              size={22}
                              className="mx-auto text-slate-300"
                            />

                            <p className="mt-2 text-[10px] text-slate-400">
                              Esperando
                              comprobante
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ACCIÓN */}

                  <div className="border-t border-slate-200 bg-white p-3">
                    {pedido.comprobante ? (
                      <button
                        type="button"
                        disabled={
                          procesandoPedido ===
                          pedido.pedidoId
                        }
                        onClick={() =>
                          avanzarEstado(
                            pedido.pedidoId
                          )
                        }
                        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2.5 text-[10px] font-bold text-white disabled:opacity-60"
                      >
                        {procesandoPedido ===
                        pedido.pedidoId ? (
                          <>
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />
                            Actualizando...
                          </>
                        ) : (
                          <>
                            <Check
                              size={13}
                            />

                            {pedido.estado ===
                            "comprobante_recibido"
                              ? "Marcar como verificando"
                              : pedido.estado ===
                                  "verificando_pago"
                                ? "Confirmar pago"
                                : "Avanzar estado"}
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled
                        className="w-full rounded-lg bg-slate-100 px-3 py-2.5 text-[10px] font-bold text-slate-400"
                      >
                        Esperando comprobante
                      </button>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {/* VISOR DEL COMPROBANTE */}

      {comprobanteAmpliado && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() =>
            setComprobanteAmpliado(null)
          }
        >
          <button
            type="button"
            onClick={() =>
              setComprobanteAmpliado(null)
            }
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-900 shadow"
          >
            <X size={18} />
          </button>

          <div
            className="max-h-[90vh] max-w-4xl overflow-auto rounded-xl bg-white p-2"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <img
              src={comprobanteAmpliado.url}
              alt="Comprobante ampliado"
              className="max-h-[85vh] w-auto max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </main>
  );
}