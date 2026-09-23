import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  Copy,
  Download,
  FileText,
  Landmark,
  Loader2,
  Upload,
} from "lucide-react";

const PASOS = [
  {
    id: "pedido_creado",
    nombre: "Pedido creado",
  },
  {
    id: "esperando_transferencia",
    nombre: "Esperando transferencia",
  },
  {
    id: "comprobante_recibido",
    nombre: "Comprobante recibido",
  },
  {
    id: "verificando_pago",
    nombre: "Verificando pago",
  },
  {
    id: "pago_confirmado",
    nombre: "Pago confirmado",
  },
  {
    id: "descarga_habilitada",
    nombre: "Descarga habilitada",
  },
];

export default function PagoTransferencia() {
  const [searchParams] = useSearchParams();

  const inputArchivoRef = useRef(null);

  const [copiado, setCopiado] = useState("");
  const [archivo, setArchivo] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");

  const [estadoPedido, setEstadoPedido] =
    useState(null);

  const [historialEstados, setHistorialEstados] =
    useState([]);

  const [productos, setProductos] = useState([]);

  const [
    descargaHabilitada,
    setDescargaHabilitada,
  ] = useState(false);

  const [descargando, setDescargando] =
    useState(null);

  const [descargados, setDescargados] =
    useState([]);

  const [errorDescarga, setErrorDescarga] =
    useState("");

  const pedidoId =
    searchParams.get("pedidoId");

  const datosCuenta = {
    medio: "Mercado Pago",
    titular: "Andrés House Sitter",
    alias: "andres.imprimibles",
    cvu: "0000003100023252705282",
  };

  /* CONSULTAR ESTADO */

  const consultarEstado = async () => {
    if (!pedidoId) return;

    try {
      const respuesta = await fetch(
        `/api/transferencia/estado-pedido?pedidoId=${encodeURIComponent(
          pedidoId
        )}`
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) return;

      setEstadoPedido(datos.estado);

      setHistorialEstados(
        datos.historialEstados || []
      );

      setProductos(datos.productos || []);

      setDescargaHabilitada(
        Boolean(datos.descargaHabilitada)
      );

      if (
        datos.historialEstados?.some(
          (item) =>
            item.estado ===
            "comprobante_recibido"
        )
      ) {
        setEnviado(true);
      }
    } catch (error) {
      console.error(
        "Error consultando pedido:",
        error
      );
    }
  };

  useEffect(() => {
    if (!pedidoId) return;

    consultarEstado();

    const intervalo = setInterval(
      consultarEstado,
      5000
    );

    return () =>
      clearInterval(intervalo);
  }, [pedidoId]);

  /* COPIAR */

  const copiar = async (valor, campo) => {
    try {
      await navigator.clipboard.writeText(valor);

      setCopiado(campo);

      setTimeout(() => {
        setCopiado("");
      }, 1800);
    } catch (error) {
      console.error(
        "Error copiando:",
        error
      );
    }
  };

  /* ARCHIVO */

  const seleccionarArchivo = (event) => {
    const seleccionado =
      event.target.files?.[0];

    if (!seleccionado) return;

    const tiposPermitidos = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "application/pdf",
    ];

    if (
      !tiposPermitidos.includes(
        seleccionado.type
      )
    ) {
      setArchivo(null);

      setError(
        "Selecciona un archivo JPG, PNG, WEBP o PDF."
      );

      return;
    }

    const maximo = 8 * 1024 * 1024;

    if (seleccionado.size > maximo) {
      setArchivo(null);

      setError(
        "El comprobante no puede superar los 8 MB."
      );

      return;
    }

    setError("");
    setArchivo(seleccionado);
  };

  /* SUBIR COMPROBANTE */

  const subirComprobante = async () => {
    if (!pedidoId) {
      setError(
        "No se encontró el número de pedido."
      );
      return;
    }

    if (!archivo) {
      setError(
        "Selecciona un comprobante."
      );
      return;
    }

    try {
      setSubiendo(true);
      setError("");

      const respuesta = await fetch(
        `/api/transferencia/subir-comprobante?pedidoId=${encodeURIComponent(
          pedidoId
        )}`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              archivo.type,
          },

          body: archivo,
        }
      );

      const datos =
        await respuesta.json();

      if (
        !respuesta.ok ||
        !datos.recibido
      ) {
        throw new Error(
          datos.error ||
            "No se pudo enviar el comprobante."
        );
      }

      setEnviado(true);
      setArchivo(null);

      await consultarEstado();
    } catch (error) {
      console.error(
        "Error subiendo comprobante:",
        error
      );

      setError(
        error.message ||
          "No se pudo enviar el comprobante."
      );
    } finally {
      setSubiendo(false);
    }
  };

  /* DESCARGAR PRODUCTO */

  const descargarProducto = async (
    producto
  ) => {
    if (
      !pedidoId ||
      !producto?.productoId ||
      !descargaHabilitada
    ) {
      return;
    }

    try {
      setDescargando(producto.productoId);
      setErrorDescarga("");

      const respuesta = await fetch(
        `/api/descargas/${encodeURIComponent(
          pedidoId
        )}?productoId=${encodeURIComponent(
          producto.productoId
        )}`
      );

      if (!respuesta.ok) {
        let mensaje =
          "No se pudo descargar el producto.";

        try {
          const datos =
            await respuesta.json();

          mensaje =
            datos.error || mensaje;
        } catch {
          // La respuesta no era JSON.
        }

        throw new Error(mensaje);
      }

      const blob = await respuesta.blob();

      const url =
        URL.createObjectURL(blob);

      const enlace =
        document.createElement("a");

      enlace.href = url;

      enlace.download =
        `${producto.nombre || "producto"}.pdf`;

      document.body.appendChild(enlace);

      enlace.click();
      enlace.remove();

      URL.revokeObjectURL(url);

      setDescargados((actuales) => [
        ...new Set([
          ...actuales,
          producto.productoId,
        ]),
      ]);
    } catch (error) {
      setErrorDescarga(
        error.message ||
          "No se pudo descargar el producto."
      );
    } finally {
      setDescargando(null);
    }
  };

  /* ESTADOS */

  const buscarEstado = (id) =>
    historialEstados.find(
      (item) => item.estado === id
    );

  const indiceActual = Math.max(
    0,
    ...historialEstados.map((item) =>
      PASOS.findIndex(
        (paso) =>
          paso.id === item.estado
      )
    )
  );

  const formatearFecha = (fecha) => {
    if (!fecha) return "";

    return new Intl.DateTimeFormat(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }
    ).format(new Date(fecha));
  };

  return (
    <main className="min-h-screen bg-[#f6f7fb] px-4 pb-20 pt-7 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-6 sm:mb-7">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />

            <p className="text-[11px] font-medium tracking-wide text-indigo-700">
              Transferencia bancaria
            </p>
          </div>

          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-slate-900 sm:text-[32px]">
            Completa tu pago
          </h1>

          <p className="mt-2 max-w-xl text-[14px] font-normal leading-6 text-slate-500">
            Realiza la transferencia con los datos
            indicados y luego envía tu comprobante.
            Te mostraremos el progreso del pedido
            automáticamente.
          </p>
        </div>

        {/* DATOS */}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Landmark size={19} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-[15px] font-medium text-slate-900">
                Datos para transferir
              </h2>

              <p className="mt-0.5 text-[12px] font-normal text-slate-500">
                {datosCuenta.medio}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="mb-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400">
                Titular
              </p>

              <p className="mt-1 text-[14px] font-medium text-slate-800">
                {datosCuenta.titular}
              </p>
            </div>

            <div className="space-y-2.5">

              {/* ALIAS */}

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    Alias
                  </p>

                  <p className="mt-1 truncate text-[14px] font-medium text-slate-800">
                    {datosCuenta.alias}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copiar(
                      datosCuenta.alias,
                      "alias"
                    )
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 active:scale-[0.97]"
                >
                  {copiado === "alias" ? (
                    <>
                      <Check size={13} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      Copiar
                    </>
                  )}
                </button>
              </div>

              {/* CVU */}

              <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-slate-400">
                    CVU
                  </p>

                  <p className="mt-1 break-all text-[14px] font-medium text-slate-800">
                    {datosCuenta.cvu}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    copiar(
                      datosCuenta.cvu,
                      "cvu"
                    )
                  }
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-medium text-slate-600 transition hover:border-indigo-200 hover:text-indigo-600 active:scale-[0.97]"
                >
                  {copiado === "cvu" ? (
                    <>
                      <Check size={13} />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy size={13} />
                      Copiar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* COMPROBANTE */}

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-start gap-3 border-b border-slate-100 px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <Upload size={18} strokeWidth={1.8} />
            </div>

            <div>
              <h2 className="text-[15px] font-medium text-slate-900">
                Sube tu comprobante
              </h2>

              <p className="mt-1 text-[12px] font-normal leading-5 text-slate-500">
                Selecciona el comprobante desde
                la galería o los archivos de tu
                dispositivo.
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {!enviado ? (
              <>
                <input
                  ref={inputArchivoRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={seleccionarArchivo}
                  className="hidden"
                />

                {!archivo ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 px-4 py-7 text-center transition hover:border-violet-300 hover:bg-violet-50/30">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-400 shadow-sm">
                      <Upload
                        size={19}
                        strokeWidth={1.8}
                      />
                    </div>

                    <p className="mt-3 text-[13px] font-medium text-slate-700">
                      Selecciona tu comprobante
                    </p>

                    <p className="mt-1 text-[11px] font-normal text-slate-400">
                      JPG, PNG, WEBP o PDF · Máx. 8 MB
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        inputArchivoRef.current?.click()
                      }
                      className="mt-4 rounded-xl bg-slate-900 px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-slate-800 active:scale-[0.98]"
                    >
                      Seleccionar archivo
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
                        <FileText
                          size={18}
                          strokeWidth={1.8}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium text-slate-800">
                          {archivo.name}
                        </p>

                        <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                          {(
                            archivo.size /
                            1024 /
                            1024
                          ).toFixed(2)}{" "}
                          MB
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={subiendo}
                        onClick={() =>
                          inputArchivoRef.current?.click()
                        }
                        className="text-[11px] font-medium text-slate-500 transition hover:text-violet-600"
                      >
                        Cambiar
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={subiendo}
                      onClick={subirComprobante}
                      className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-[12px] font-medium text-white transition hover:bg-violet-700 active:scale-[0.99] disabled:opacity-60"
                    >
                      {subiendo ? (
                        <>
                          <Loader2
                            size={15}
                            className="animate-spin"
                          />
                          Enviando comprobante...
                        </>
                      ) : (
                        <>
                          <Upload size={15} />
                          Enviar comprobante
                        </>
                      )}
                    </button>
                  </div>
                )}

                {error && (
                  <p className="mt-2.5 text-[11px] font-medium text-red-600">
                    {error}
                  </p>
                )}
              </>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check size={17} />
                  </div>

                  <div>
                    <p className="text-[13px] font-medium text-emerald-800">
                      Comprobante recibido
                    </p>

                    <p className="mt-0.5 text-[11px] font-normal text-emerald-700">
                      Lo recibimos correctamente.
                      Tu pago será verificado.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

                {/* SEGUIMIENTO */}

        <section className="mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
            <h2 className="text-[15px] font-medium text-slate-900">
              Seguimiento de tu pedido
            </h2>

            <div className="mt-1.5 flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-500" />
              </span>

              <p className="text-[11px] font-normal text-slate-500">
                El estado se actualiza automáticamente
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div>
              {PASOS.map((paso, index) => {
                const registro =
                  buscarEstado(paso.id);

                const completado =
                  Boolean(registro);

                const actual =
                  index === indiceActual &&
                  estadoPedido !== "aprobado";

                return (
                  <div
                    key={paso.id}
                    className="relative flex gap-3.5 pb-5 last:pb-0"
                  >
                    {index <
                      PASOS.length - 1 && (
                      <div
                        className={`absolute left-[11px] top-6 h-full w-px transition-colors duration-500 ${
                          completado
                            ? "bg-emerald-300"
                            : "bg-slate-200"
                        }`}
                      />
                    )}

                    <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center">
                      {completado ? (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_0_0_4px_rgba(16,185,129,0.08)]">
                          <Check
                            size={13}
                            strokeWidth={2}
                          />
                        </div>
                      ) : actual ? (
                        <div className="relative flex h-6 w-6 items-center justify-center">
                          <span className="absolute h-6 w-6 animate-ping rounded-full bg-violet-300 opacity-30" />

                          <span className="absolute h-6 w-6 rounded-full bg-violet-100" />

                          <Loader2
                            size={15}
                            strokeWidth={2}
                            className="relative z-10 animate-spin text-violet-600"
                          />
                        </div>
                      ) : (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-slate-50">
                          <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                        </div>
                      )}
                    </div>

                    <div className="-mt-0.5 min-w-0 flex-1">
                      <div className="flex min-h-6 items-center justify-between gap-3">
                        <p
                          className={`text-[13px] font-medium transition-colors duration-300 ${
                            completado
                              ? "text-slate-800"
                              : actual
                                ? "text-violet-700"
                                : "text-slate-400"
                          }`}
                        >
                          {paso.nombre}
                        </p>

                        {registro?.fecha && (
                          <p className="shrink-0 text-[10px] font-normal text-slate-400">
                            {formatearFecha(
                              registro.fecha
                            )}
                          </p>
                        )}
                      </div>

                      {actual &&
                        !completado && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex gap-1">
                              <span
                                className="h-1 w-1 animate-bounce rounded-full bg-violet-400"
                                style={{
                                  animationDelay:
                                    "0ms",
                                }}
                              />

                              <span
                                className="h-1 w-1 animate-bounce rounded-full bg-violet-400"
                                style={{
                                  animationDelay:
                                    "150ms",
                                }}
                              />

                              <span
                                className="h-1 w-1 animate-bounce rounded-full bg-violet-400"
                                style={{
                                  animationDelay:
                                    "300ms",
                                }}
                              />
                            </div>

                            <p className="text-[10px] font-normal text-violet-500">
                              Esperando actualización
                            </p>
                          </div>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>

            {pedidoId && (
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2.5">
                  <span className="text-[10px] font-normal text-slate-400">
                    Número de pedido
                  </span>

                  <span className="truncate text-[10px] font-medium text-slate-600">
                    {pedidoId}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* DESCARGAS */}

        {descargaHabilitada &&
          productos.length > 0 && (
            <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
              <div className="border-b border-emerald-100 bg-emerald-50/40 px-4 py-4 sm:px-5">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                    <Check size={14} />
                  </div>

                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-emerald-600">
                    Pago confirmado
                  </p>
                </div>

                <h2 className="mt-3 text-[17px] font-medium text-slate-900">
                  Tus descargas están listas
                </h2>

                <p className="mt-1 text-[12px] font-normal leading-5 text-slate-500">
                  Tu pago fue aprobado. Ya puedes
                  descargar tus productos.
                </p>
              </div>

              <div className="p-4 sm:p-5">
                <div className="space-y-2.5">
                  {productos.map((producto) => {
                    const descargado =
                      descargados.includes(
                        producto.productoId
                      );

                    const estaDescargando =
                      descargando ===
                      producto.productoId;

                    return (
                      <div
                        key={producto.productoId}
                        className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 shadow-sm">
                            <FileText
                              size={18}
                              strokeWidth={1.7}
                            />
                          </div>

                          <div className="min-w-0">
                            <p className="text-[13px] font-medium leading-5 text-slate-800">
                              {producto.nombre}
                            </p>

                            <p className="mt-0.5 text-[10px] font-normal text-slate-400">
                              Documento PDF
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={
                            descargado ||
                            estaDescargando
                          }
                          onClick={() =>
                            descargarProducto(
                              producto
                            )
                          }
                          className={`flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[11px] font-medium transition active:scale-[0.98] ${
                            descargado
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-60"
                          }`}
                        >
                          {estaDescargando ? (
                            <>
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                              Descargando...
                            </>
                          ) : descargado ? (
                            <>
                              <Check size={14} />
                              Descargado
                            </>
                          ) : (
                            <>
                              <Download
                                size={14}
                              />
                              Descargar PDF
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {errorDescarga && (
                  <p className="mt-3 text-[11px] font-medium text-red-600">
                    {errorDescarga}
                  </p>
                )}
              </div>
            </section>
          )}

        {/* RECOMENDADOS */}

        <section className="mt-10 min-h-[220px] border-t border-slate-200 pt-6">
          {/* Productos recomendados */}
        </section>
      </div>
    </main>
  );
}