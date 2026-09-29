import {
  Loader2,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";

import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

export default function AdminProductos() {
  const navigate = useNavigate();

  const [productos, setProductos] =
    useState([]);

  const [cargando, setCargando] =
    useState(true);

  const [error, setError] =
    useState("");

  const [eliminando, setEliminando] =
    useState(null);

  /* =========================
     CARGAR PRODUCTOS
  ========================= */

  const cargarProductos = async () => {
    try {
      setError("");

      const respuesta = await fetch(
        "/api/admin/pedidos?accion=listar-productos"
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
            "No se pudieron cargar los productos."
        );
      }

      setProductos(
        datos.productos || []
      );
    } catch (error) {
      setError(
        error.message ||
          "No se pudieron cargar los productos."
      );
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  /* =========================
     EDITAR PRODUCTO
  ========================= */

  const editarProducto = (
    producto
  ) => {
    navigate(
      `/admin/productos/editar/${encodeURIComponent(
        producto.id
      )}`
    );
  };

  /* =========================
     ELIMINAR PRODUCTO
  ========================= */

  const eliminarProducto = async (
    producto
  ) => {
    const confirmar =
      window.confirm(
        `¿Eliminar "${producto.nombre}"?\n\nEsta acción eliminará el producto de la tienda.`
      );

    if (!confirmar) {
      return;
    }

    try {
      setEliminando(producto.id);
      setError("");

      const respuesta = await fetch(
        "/api/admin/pedidos?accion=eliminar-producto",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            productoId: producto.id,
          }),
        }
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
            "No se pudo eliminar el producto."
        );
      }

      await cargarProductos();
    } catch (error) {
      setError(
        error.message ||
          "No se pudo eliminar el producto."
      );
    } finally {
      setEliminando(null);
    }
  };

  /* =========================
     PRECIO
  ========================= */

  const precioARS = (producto) => {
    const precio =
      producto?.oferta?.activa
        ? producto.oferta.precioARS
        : producto.precioARS;

    return new Intl.NumberFormat(
      "es-AR",
      {
        style: "currency",
        currency: "ARS",
        maximumFractionDigits: 0,
      }
    ).format(precio || 0);
  };

  /* =========================
     RENDER
  ========================= */

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-5xl">

        {/* ENCABEZADO */}

        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Administración
            </p>

            <h1 className="text-xl font-bold text-slate-900">
              Productos
            </h1>

            <p className="mt-1 text-[10px] text-slate-500">
              {productos.length} producto
              {productos.length !== 1
                ? "s"
                : ""}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              navigate(
                "/admin/productos/nuevo"
              )
            }
            className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-violet-700"
          >
            <Plus size={13} />
            Nuevo producto
          </button>
        </div>

        {/* ACTUALIZAR */}

        <div className="mb-4">
          <button
            type="button"
            onClick={cargarProductos}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700"
          >
            <RefreshCw size={13} />
            Actualizar
          </button>
        </div>

        {/* ERROR */}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        )}

        {/* CONTENIDO */}

        {cargando ? (
          <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500">
            <Loader2
              size={15}
              className="animate-spin"
            />

            Cargando productos...
          </div>
        ) : productos.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-center">
            <Package
              size={26}
              className="mx-auto text-slate-300"
            />

            <p className="mt-2 text-xs font-semibold text-slate-700">
              No hay productos.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {productos.map(
              (producto) => (
                <section
                  key={producto.id}
                  className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                >

                  {/* IMAGEN */}

                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {producto.imagenes
                      ?.portada ? (
                      <img
                        src={
                          producto
                            .imagenes
                            .portada
                        }
                        alt={
                          producto.nombre
                        }
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package
                          size={20}
                          className="text-slate-300"
                        />
                      </div>
                    )}
                  </div>

                  {/* DATOS */}

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900">
                      {producto.nombre}
                    </p>

                    <p className="mt-1 break-all text-[9px] text-slate-400">
                      {producto.id}
                    </p>

                    <p className="mt-2 text-sm font-bold text-slate-800">
                      {precioARS(
                        producto
                      )}
                    </p>
                  </div>

                  {/* ACCIONES */}

                  <div className="flex shrink-0 items-center gap-2">

                    {/* EDITAR */}

                    <button
                      type="button"
                      disabled={
                        eliminando ===
                        producto.id
                      }
                      onClick={() =>
                        editarProducto(
                          producto
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-200 text-sky-600 transition hover:bg-sky-50 disabled:opacity-50"
                      title="Editar producto"
                    >
                      <Pencil
                        size={14}
                      />
                    </button>

                    {/* ELIMINAR */}

                    <button
                      type="button"
                      disabled={
                        eliminando ===
                        producto.id
                      }
                      onClick={() =>
                        eliminarProducto(
                          producto
                        )
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      title="Eliminar producto"
                    >
                      {eliminando ===
                      producto.id ? (
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                      ) : (
                        <Trash2
                          size={14}
                        />
                      )}
                    </button>
                  </div>
                </section>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}