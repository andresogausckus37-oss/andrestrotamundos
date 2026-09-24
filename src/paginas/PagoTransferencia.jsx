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

  const [estadoPedido, setEstadoPedido] = useState(null);

  const [historialEstados, setHistorialEstados] =
    useState([]);

  const [productos, setProductos] = useState([]);

  const [descargaHabilitada, setDescargaHabilitada] =
    useState(false);

  const [descargando, setDescargando] = useState(null);

  const [descargados, setDescargados] = useState([]);

  const [errorDescarga, setErrorDescarga] =
    useState("");

  const pedidoId = searchParams.get("pedidoId");

  const datosCuenta = {
    medio: "Mercado Pago",
    titular: "Andrés House Sitter",
    alias: "andres.imprimibles",
    cvu: "0000003100023252705282",
  };

  /* =========================================
     CONSULTAR ESTADO DEL PEDIDO
  ========================================= */

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
            item.estado === "comprobante_recibido"
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

  /* =========================================
     ACTUALIZACIÓN AUTOMÁTICA
  ========================================= */

  useEffect(() => {
    if (!pedidoId) return;

    consultarEstado();

    const intervalo = setInterval(
      consultarEstado,
      5000
    );

    return () => clearInterval(intervalo);
  }, [pedidoId]);

  /* =========================================
     COPIAR DATOS
  ========================================= */

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

  /* =========================================
     SELECCIONAR ARCHIVO
  ========================================= */

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

  /* =========================================
     SUBIR COMPROBANTE
  ========================================= */

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
            "Content-Type": archivo.type,
          },

          body: archivo,
        }
      );

      const datos = await respuesta.json();

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

  /* =========================================
     DESCARGAR PRODUCTO
  ========================================= */

  const descargarProducto = async (producto) => {
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
          const datos = await respuesta.json();

          mensaje =
            datos.error || mensaje;
        } catch {
          // La respuesta no era JSON.
        }

        throw new Error(mensaje);
      }

      const blob = await respuesta.blob();

      const url = URL.createObjectURL(blob);

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

  /* =========================================
     INFORMACIÓN DE ESTADOS
  ========================================= */

  const buscarEstado = (id) =>
    historialEstados.find(
      (item) => item.estado === id
    );

  const indiceActual = Math.max(
    0,
    ...historialEstados.map((item) =>
      PASOS.findIndex(
        (paso) => paso.id === item.estado
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

  /* =========================================
     ESTADOS CON ANIMACIÓN DE ESPERA
  ========================================= */

  const comprobanteRecibido =
    estadoPedido === "comprobante_recibido";

  const verificandoPago =
    estadoPedido === "verificando_pago";

  const mostrarEspera =
    comprobanteRecibido || verificandoPago;

  const tituloEspera = comprobanteRecibido
    ? "Comprobante recibido"
    : "Verificando pago";

  const mensajeEspera = comprobanteRecibido
    ? "Estamos revisando tu comprobante..."
    : "Estamos verificando tu pago...";

  const descargaLista =
    estadoPedido === "descarga_habilitada" ||
    descargaHabilitada;

  return (
    <main className="min-h-screen bg-[#F7FAFA] px-4 pb-20 pt-7 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-6 sm:mb-7">
          

          <h1 className="text-[26px] font-medium leading-tight tracking-[-0.02em] text-[#263238] sm:text-[32px]">
            Completa tu pago
          </h1>

          <p className="mt-2 max-w-xl text-[14px] font-normal leading-6 text-[#687477]">
            Realiza la transferencia con los datos indicados y luego
            envía tu comprobante. Te mostraremos el progreso de tu
            pedido automáticamente.
          </p>

          
        </div>

        {/* DATOS PARA TRANSFERIR */}

        <section className="overflow-hidden rounded-2xl border border-[#DCE5E4] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="flex items-center gap-3 border-b border-[#E7ECEB] px-4 py-4 sm:px-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#EEF5F5] text-[#285861]">
              <Landmark
                size={19}
                strokeWidth={1.8}
              />
            </div>

            <div>
              <h2 className="text-[15px] font-medium text-[#263238]">
                Datos para transferir
              </h2>

              <p className="mt-0.5 text-[12px] font-normal text-[#687477]">
                {datosCuenta.medio}
              </p>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            {/* TITULAR */}

            <div className="mb-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#8A999B]">
                Titular
              </p>

              <p className="mt-1 text-[14px] font-medium text-[#334346]">
                {datosCuenta.titular}
              </p>
            </div>

            {/* ALIAS + CVU EN UNA FILA */}

            <div className="grid grid-cols-2 gap-2.5">
              {/* ALIAS */}

              <div className="min-w-0 rounded-xl border border-[#E7ECEB] bg-[#F7FAFA] px-3 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8A999B]">
                  Alias
                </p>

                <p className="mt-1 truncate text-[13px] font-medium text-[#334346]">
                  {datosCuenta.alias}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    copiar(
                      datosCuenta.alias,
                      "alias"
                    )
                  }
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DCE5E4] bg-white px-2 py-2 text-[11px] font-medium text-slate-600 transition hover:border-[#8EAAAC] hover:text-[#285861] active:scale-[0.97]"
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

              <div className="min-w-0 rounded-xl border border-[#E7ECEB] bg-[#F7FAFA] px-3 py-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.08em] text-[#8A999B]">
                  CVU
                </p>

                <p className="mt-1 truncate text-[12px] font-medium text-[#334346] sm:text-[14px]">
                  {datosCuenta.cvu}
                </p>

                <button
                  type="button"
                  onClick={() =>
                    copiar(
                      datosCuenta.cvu,
                      "cvu"
                    )
                  }
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#DCE5E4] bg-white px-2 py-2 text-[11px] font-medium text-slate-600 transition hover:border-[#8EAAAC] hover:text-[#285861] active:scale-[0.97]"
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

            <div className="mt-4 rounded-xl border border-[#E4DDD3] bg-[#F7F2EB] px-3.5 py-3">
              <p className="text-[11px] font-normal leading-5 text-[#756451]">
                Verifica los datos antes de realizar la transferencia.
                Luego sube el comprobante para que podamos confirmar
                tu pago.
              </p>
            </div>
          </div>
        </section>

                {/* COMPROBANTE */}

        {!descargaLista && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-[#DCE5E4] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
            <div className="flex items-start gap-3 border-b border-[#E7ECEB] px-4 py-4 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F7F2EB] text-[#B59672]">
                <Upload
                  size={18}
                  strokeWidth={1.8}
                />
              </div>

              <div>
                <h2 className="text-[15px] font-medium text-[#263238]">
                  {enviado
                    ? "Estado del comprobante"
                    : "Sube tu comprobante"}
                </h2>

                <p className="mt-1 text-[12px] font-normal leading-5 text-[#687477]">
                  {enviado
                    ? "Te avisaremos aquí cuando finalice la verificación."
                    : "Selecciona el comprobante desde la galería o los archivos de tu dispositivo."}
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
                    <div className="rounded-xl border border-dashed border-[#C8D5D4] bg-[#F7FAFA] px-4 py-7 text-center transition hover:border-[#8EAAAC] hover:bg-[#EEF5F5]">
                      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-[#8A999B] shadow-sm">
                        <Upload
                          size={19}
                          strokeWidth={1.8}
                        />
                      </div>

                      <p className="mt-3 text-[13px] font-medium text-[#334346]">
                        Selecciona tu comprobante
                      </p>

                      <p className="mt-1 text-[11px] font-normal text-[#8A999B]">
                        JPG, PNG, WEBP o PDF · Máx. 8 MB
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          inputArchivoRef.current?.click()
                        }
                        className="mt-4 rounded-xl bg-[#285861] px-4 py-2.5 text-[12px] font-medium text-white transition hover:bg-[#204850] active:scale-[0.98]"
                      >
                        Seleccionar archivo
                      </button>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-[#DCE5E4] bg-[#F7FAFA] p-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF5F5] text-[#285861]">
                          <FileText
                            size={18}
                            strokeWidth={1.8}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] font-medium text-[#334346]">
                            {archivo.name}
                          </p>

                          <p className="mt-0.5 text-[10px] font-normal text-[#8A999B]">
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
                          className="text-[11px] font-medium text-[#687477] transition hover:text-[#285861] disabled:opacity-50"
                        >
                          Cambiar
                        </button>
                      </div>

                      <button
                        type="button"
                        disabled={subiendo}
                        onClick={subirComprobante}
                        className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl bg-[#285861] px-4 py-3 text-[12px] font-medium text-white transition hover:bg-[#204850] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
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
              ) : mostrarEspera ? (
                /* ESTADO ANIMADO */

                <div
                  key={estadoPedido}
                  className="rounded-xl border border-[#D9E6E7] bg-[#EEF5F5] px-5 py-7 text-center"
                >
                  {/* CÍRCULO CARGANDO */}

                  <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                    <span className="absolute h-16 w-16 animate-ping rounded-full bg-[#B9CCCD] opacity-30" />

                    <span className="absolute h-14 w-14 rounded-full border border-[#D9E6E7] bg-white shadow-sm" />

                    <Loader2
                      size={26}
                      strokeWidth={1.8}
                      className="relative z-10 animate-spin text-[#285861]"
                    />
                  </div>

                  {/* MENSAJE */}

                  <p className="mt-4 text-[16px] font-medium tracking-[-0.01em] text-[#263238]">
                    {tituloEspera}
                  </p>

                  <p className="mt-1.5 text-[12px] font-normal leading-5 text-[#687477]">
                    {mensajeEspera}
                  </p>

                  {/* PUNTOS ANIMADOS */}

                  <div className="mt-3 flex items-center justify-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6F9398]"
                      style={{
                        animationDelay: "0ms",
                      }}
                    />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6F9398]"
                      style={{
                        animationDelay: "150ms",
                      }}
                    />

                    <span
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#6F9398]"
                      style={{
                        animationDelay: "300ms",
                      }}
                    />
                  </div>

                  <p className="mt-3 text-[10px] font-normal text-[#8A999B]">
                    No necesitas actualizar la página.
                  </p>
                </div>
              ) : (
                /* COMPROBANTE YA PROCESADO
                   VERDE ORIGINAL */

                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                      <Check
                        size={17}
                        strokeWidth={2}
                      />
                    </div>

                    <div>
                      <p className="text-[13px] font-medium text-emerald-800">
                        Comprobante procesado
                      </p>

                      <p className="mt-0.5 text-[11px] font-normal leading-5 text-emerald-700">
                        Tu comprobante fue recibido correctamente.
                        Puedes seguir el estado de tu compra debajo.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* SEGUIMIENTO DEL PEDIDO */}

        <section className="mt-4 overflow-hidden rounded-2xl border border-[#DCE5E4] bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
          <div className="border-b border-[#E7ECEB] px-4 py-4 sm:px-5">
            <h2 className="text-[15px] font-medium text-[#263238]">
              Estado de tu compra
            </h2>

            <p className="mt-1 text-[12px] font-normal leading-5 text-[#687477]">
              El estado se actualiza automáticamente.
            </p>
          </div>

          <div className="p-4 sm:p-5">
            <div className="space-y-0">
              {PASOS.map((paso, index) => {
                const registro = buscarEstado(paso.id);

                const completado =
                  Boolean(registro) ||
                  index < indiceActual;

                const actual =
                  paso.id === estadoPedido;

                const ultimo =
                  index === PASOS.length - 1;

                return (
                  <div
                    key={paso.id}
                    className="relative flex gap-3"
                  >
                    {/* LÍNEA VERTICAL */}

                    {!ultimo && (
                      <div
                        className={`absolute left-[14px] top-7 h-[calc(100%-4px)] w-px ${
                          completado
                            ? "bg-emerald-200"
                            : "bg-slate-200"
                        }`}
                      />
                    )}

                    {/* CÍRCULO */}

                    <div
                      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-all ${
                        completado
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                          : actual
                            ? "border-[#B9CCCD] bg-[#EEF5F5] text-[#285861]"
                            : "border-slate-200 bg-white text-slate-300"
                      }`}
                    >
                      {completado ? (
                        <Check
                          size={13}
                          strokeWidth={2.2}
                        />
                      ) : actual ? (
                        <Loader2
                          size={13}
                          strokeWidth={2}
                          className="animate-spin"
                        />
                      ) : (
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      )}
                    </div>

                    {/* INFORMACIÓN */}

                    <div
                      className={`min-w-0 flex-1 ${
                        ultimo ? "pb-0" : "pb-5"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                        <p
                          className={`text-[12px] font-medium ${
                            completado
                              ? "text-[#334346]"
                              : actual
                                ? "text-[#285861]"
                                : "text-[#8A999B]"
                          }`}
                        >
                          {paso.nombre}
                        </p>

                        {registro?.fecha && (
                          <span className="text-[9px] font-normal text-[#8A999B]">
                            {formatearFecha(
                              registro.fecha
                            )}
                          </span>
                        )}
                      </div>

                      {actual &&
                        (paso.id ===
                          "comprobante_recibido" ||
                          paso.id ===
                            "verificando_pago") && (
                          <p className="mt-1 text-[10px] font-normal leading-4 text-[#8A999B]">
                            Procesando...
                          </p>
                        )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

                {/* =====================================
            DESCARGA HABILITADA
            SE CONSERVA EL VERDE ORIGINAL
        ===================================== */}

        {descargaLista && (
          <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-200/80 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.05)]">
            {/* CABECERA FINAL */}

            <div className="border-b border-emerald-100 bg-gradient-to-b from-emerald-50/80 to-white px-5 py-7 text-center sm:px-7 sm:py-8">
              {/* CHECK */}

              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <span className="absolute h-16 w-16 rounded-full bg-emerald-100/60" />

                <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                  <Check
                    size={24}
                    strokeWidth={2.2}
                  />
                </span>
              </div>

              {/* TÍTULO */}

              <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.12em] text-emerald-600">
                Descarga habilitada
              </p>

              <h2 className="mt-2 text-[22px] font-medium tracking-[-0.02em] text-slate-900 sm:text-[25px]">
                ¡Gracias por tu compra!
              </h2>

              <p className="mx-auto mt-2 max-w-md text-[13px] font-normal leading-6 text-slate-500">
                Tu pago fue confirmado correctamente.
                Tu material digital ya está listo para
                descargar.
              </p>

              {pedidoId && (
                <div className="mt-4 inline-flex rounded-full border border-emerald-100 bg-white px-3 py-1.5 shadow-sm">
                  <span className="text-[10px] font-medium text-slate-500">
                    Pedido #{pedidoId}
                  </span>
                </div>
              )}
            </div>

            {/* MATERIAL DE DESCARGA */}

            <div className="p-4 sm:p-5">
              <div className="mb-4">
                <h3 className="text-[14px] font-medium text-slate-900">
                  Tu material
                </h3>

                <p className="mt-1 text-[11px] font-normal leading-5 text-slate-500">
                  Descarga los archivos incluidos en
                  tu compra.
                </p>
              </div>

              {/* PRODUCTOS */}

              {productos.length > 0 ? (
                <div className="space-y-2.5">
                  {productos.map((producto) => {
                    const estaDescargando =
                      descargando ===
                      producto.productoId;

                    const yaDescargado =
                      descargados.includes(
                        producto.productoId
                      );

                    return (
                      <div
                        key={producto.productoId}
                        className="rounded-xl border border-[#DCE5E4] bg-[#F7FAFA] p-3.5"
                      >
                        <div className="flex items-center gap-3">
                          {/* ICONO PDF */}

                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D9E6E7] bg-white text-[#285861] shadow-sm">
                            <FileText
                              size={19}
                              strokeWidth={1.8}
                            />
                          </div>

                          {/* DATOS */}

                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-[12px] font-medium leading-5 text-[#334346]">
                              {producto.nombre ||
                                "Producto digital"}
                            </p>

                            <div className="mt-1 flex items-center gap-2">
                              <span className="text-[9px] font-medium uppercase tracking-wide text-[#8A999B]">
                                PDF
                              </span>

                              <span className="h-1 w-1 rounded-full bg-slate-300" />

                              <span className="text-[9px] font-normal text-[#8A999B]">
                                Descarga digital
                              </span>
                            </div>
                          </div>

                          {/* CHECK DESCARGADO
                              VERDE ORIGINAL */}

                          {yaDescargado && (
                            <div
                              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600"
                              title="Descargado"
                            >
                              <Check
                                size={14}
                                strokeWidth={2}
                              />
                            </div>
                          )}
                        </div>

                        {/* BOTÓN */}

                        <button
                          type="button"
                          disabled={estaDescargando}
                          onClick={() =>
                            descargarProducto(
                              producto
                            )
                          }
                          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-[#285861] px-4 py-3 text-[12px] font-medium text-white transition hover:bg-[#204850] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {estaDescargando ? (
                            <>
                              <Loader2
                                size={15}
                                className="animate-spin"
                              />

                              Preparando descarga...
                            </>
                          ) : yaDescargado ? (
                            <>
                              <Download size={15} />

                              Producto ya descargado
                            </>
                          ) : (
                            <>
                              <Download size={15} />

                              Descargar PDF
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* SI EL BACKEND TODAVÍA NO DEVOLVIÓ
                   LOS PRODUCTOS */

                <div className="rounded-xl border border-[#DCE5E4] bg-[#F7FAFA] px-4 py-5 text-center">
                  <Loader2
                    size={19}
                    className="mx-auto animate-spin text-[#8A999B]"
                  />

                  <p className="mt-2 text-[11px] font-normal text-[#687477]">
                    Preparando tu material...
                  </p>
                </div>
              )}

              {/* ERROR DE DESCARGA */}

              {errorDescarga && (
                <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3">
                  <p className="text-[11px] font-medium leading-5 text-red-600">
                    {errorDescarga}
                  </p>
                </div>
              )}

              
            </div>
          </section>
        )}

        {/* PIE */}

        <div className="mt-6 text-center">
          <p className="text-[10px] font-normal leading-5 text-[#8A999B]">
            Si tienes algún inconveniente con tu pago o
            descarga, ponte en contacto con nosotros
            indicando tu número de pedido.
          </p>
        </div>
      </div>
    </main>
  );
}