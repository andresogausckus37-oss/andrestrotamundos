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
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-8 sm:pt-10">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Transferencia bancaria
          </p>

          <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">
            Completa tu pago
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Realiza la transferencia y luego
            sube el comprobante para verificar
            tu pago.
          </p>
        </div>

        {/* DATOS */}

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-50 text-sky-700">
              <Landmark size={16} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Datos para transferir
              </h2>

              <p className="text-[10px] text-slate-500">
                {datosCuenta.medio}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                Titular
              </p>

              <p className="mt-0.5 text-xs font-semibold text-slate-800">
                {datosCuenta.titular}
              </p>
            </div>

            {/* ALIAS */}

            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2.5">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  Alias
                </p>

                <p className="mt-0.5 text-xs font-bold text-slate-800">
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
                className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700"
              >
                {copiado === "alias" ? (
                  <>
                    <Check size={12} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copiar
                  </>
                )}
              </button>
            </div>

            {/* CVU */}

            <div className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 p-2.5">
              <div className="min-w-0">
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">
                  CVU
                </p>

                <p className="mt-0.5 break-all text-xs font-bold text-slate-800">
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
                className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] font-bold text-slate-700"
              >
                {copiado === "cvu" ? (
                  <>
                    <Check size={12} />
                    Copiado
                  </>
                ) : (
                  <>
                    <Copy size={12} />
                    Copiar
                  </>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* COMPROBANTE */}

        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-50 text-violet-700">
              <Upload size={15} />
            </div>

            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Sube tu comprobante
              </h2>

              <p className="mt-1 text-[11px] leading-4 text-slate-500">
                Selecciona el comprobante desde
                la galería o los archivos de tu
                dispositivo.
              </p>
            </div>
          </div>

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
                <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-center">
                  <Upload
                    size={18}
                    className="mx-auto text-slate-400"
                  />

                  <p className="mt-1.5 text-[10px] text-slate-500">
                    JPG, PNG, WEBP o PDF · Máx. 8 MB
                  </p>

                  <button
                    type="button"
                    onClick={() =>
                      inputArchivoRef.current?.click()
                    }
                    className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white"
                  >
                    Seleccionar comprobante
                  </button>
                </div>
              ) : (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center gap-2">
                    <FileText
                      size={18}
                      className="shrink-0 text-violet-600"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-semibold text-slate-800">
                        {archivo.name}
                      </p>

                      <p className="text-[9px] text-slate-400">
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
                      className="text-[10px] font-bold text-slate-500"
                    >
                      Cambiar
                    </button>
                  </div>

                  <button
                    type="button"
                    disabled={subiendo}
                    onClick={subirComprobante}
                    className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2.5 text-[11px] font-bold text-white disabled:opacity-60"
                  >
                    {subiendo ? (
                      <>
                        <Loader2
                          size={14}
                          className="animate-spin"
                        />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        Enviar comprobante
                      </>
                    )}
                  </button>
                </div>
              )}

              {error && (
                <p className="mt-2 text-[10px] font-medium text-red-600">
                  {error}
                </p>
              )}
            </>
          ) : (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={15} />
                </div>

                <div>
                  <p className="text-[11px] font-bold text-emerald-800">
                    Comprobante recibido
                  </p>

                  <p className="text-[10px] text-emerald-700">
                    Tu pago será verificado.
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* SEGUIMIENTO */}

        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Seguimiento de tu pedido
          </h2>

          <p className="mt-1 text-[10px] text-slate-500">
            El estado se actualiza automáticamente.
          </p>

          <div className="mt-4">
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
                  className="relative flex gap-3 pb-4 last:pb-0"
                >
                  {index <
                    PASOS.length - 1 && (
                    <div
                      className={`absolute left-[9px] top-5 h-full w-px ${
                        completado
                          ? "bg-emerald-300"
                          : "bg-slate-200"
                      }`}
                    />
                  )}

                  <div
                    className={`relative z-10 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-full ${
                      completado
                        ? "bg-emerald-500 text-white"
                        : actual
                          ? "bg-violet-600 text-white"
                          : "bg-slate-200 text-slate-400"
                    }`}
                  >
                    {completado ? (
                      <Check size={11} />
                    ) : actual ? (
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    )}
                  </div>

                  <div className="-mt-0.5">
                    <p
                      className={`text-[11px] font-semibold ${
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
                      <p className="mt-0.5 text-[9px] text-slate-400">
                        {formatearFecha(
                          registro.fecha
                        )}
                      </p>
                    )}

                    {actual &&
                      !completado && (
                        <p className="mt-0.5 text-[9px] text-violet-500">
                          En proceso
                        </p>
                      )}
                  </div>
                </div>
              );
            })}
          </div>

          {pedidoId && (
            <p className="mt-4 border-t border-slate-100 pt-3 text-[9px] text-slate-400">
              Pedido: {pedidoId}
            </p>
          )}
        </section>

        {/* DESCARGAS */}

        {descargaHabilitada &&
          productos.length > 0 && (
            <section className="mt-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-600">
                  Pago confirmado
                </p>

                <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                  Tus descargas
                </h2>

                                <p className="mt-1 text-[10px] text-slate-500">
                  Tu pago fue aprobado. Ya puedes
                  descargar tus productos.
                </p>
              </div>

              <div className="space-y-2">
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
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
                    >
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold text-slate-800">
                          {producto.nombre}
                        </p>

                        <p className="mt-0.5 text-[9px] text-slate-400">
                          Archivo PDF
                        </p>
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
                        className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-[10px] font-bold ${
                          descargado
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-violet-600 text-white disabled:opacity-60"
                        }`}
                      >
                        {estaDescargando ? (
                          <>
                            <Loader2
                              size={13}
                              className="animate-spin"
                            />
                            Descargando
                          </>
                        ) : descargado ? (
                          <>
                            <Check size={13} />
                            Descargado
                          </>
                        ) : (
                          <>
                            <Download
                              size={13}
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
                <p className="mt-3 text-[10px] font-medium text-red-600">
                  {errorDescarga}
                </p>
              )}
            </section>
          )}

        {/* RECOMENDADOS */}

        <section className="mt-8 min-h-[220px] border-t border-slate-200 pt-5">
          {/* Productos recomendados */}
        </section>
      </div>
    </main>
  );
}