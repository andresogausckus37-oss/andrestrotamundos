import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileCheck,
  Loader2,
  RefreshCw,
} from "lucide-react";

export default function Admin() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

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

      const datos =
        await respuesta.json();

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

    return () =>
      clearInterval(intervalo);
  }, []);

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

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-4xl">

        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Administración
            </p>

            <h1 className="text-xl font-bold text-slate-900">
              Transferencias pendientes
            </h1>
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
          <div className="space-y-3">
            {pedidos.map((pedido) => (
              <section
                key={pedido.pedidoId}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {pedido.nombreComprador}
                    </p>

                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {pedido.emailComprador}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-50 px-2 py-1 text-[9px] font-bold text-amber-700">
                    {pedido.estado}
                  </span>
                </div>

                <div className="mt-3 border-t border-slate-100 pt-3">
                  {pedido.productos.map(
                    (producto) => (
                      <div
                        key={
                          producto.productoId
                        }
                        className="mb-1 flex justify-between gap-3 text-[10px]"
                      >
                        <span className="text-slate-600">
                          {producto.nombre}
                        </span>

                        <span className="font-semibold text-slate-800">
                          {formatearPrecio(
                            producto.precio
                          )}
                        </span>
                      </div>
                    )
                  )}
                </div>

                <div className="mt-3 flex items-end justify-between border-t border-slate-100 pt-3">
                  <div>
                    <p className="text-[9px] text-slate-400">
                      {formatearFecha(
                        pedido.creadoEn
                      )}
                    </p>

                    <p className="mt-1 text-[9px] text-slate-400">
                      Comprobante:{" "}
                      {pedido.comprobante
                        ? "Recibido"
                        : "Pendiente"}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[9px] text-slate-400">
                      Total
                    </p>

                    <p className="text-sm font-bold text-slate-900">
                      {formatearPrecio(
                        pedido.precio
                      )}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={
                    !pedido.comprobante
                  }
                  onClick={() =>
                    navigate(
                      `/admin/pedido/${pedido.pedidoId}`
                    )
                  }
                  className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2.5 text-[10px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {pedido.comprobante
                    ? "Revisar comprobante"
                    : "Esperando comprobante"}
                </button>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}