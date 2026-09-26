import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import {
  Check,
  Download,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

export default function PagoExitoso() {
  const [searchParams] = useSearchParams();

  const [estado, setEstado] =
    useState("verificando");

  const [productos, setProductos] =
    useState([]);

  const [descargando, setDescargando] =
    useState(null);

  const [descargados, setDescargados] =
    useState([]);

  const [errorDescarga, setErrorDescarga] =
    useState("");

  const metodo =
    searchParams.get("metodo");

  const pedidoId =
    metodo === "paypal"
      ? searchParams.get("pedidoId")
      : searchParams.get(
          "external_reference"
        );

  const paypalOrderId =
    searchParams.get("token");

  const esPayPal =
    metodo === "paypal";

  useEffect(() => {
    if (!pedidoId) {
      setEstado("error");
      return;
    }

    let intentos = 0;
    let timeoutId;

    const maxIntentos = 10;

    const verificarPago = async () => {
      try {
        let respuesta;

        if (esPayPal) {
          if (!paypalOrderId) {
            throw new Error(
              "Falta la orden de PayPal."
            );
          }

          respuesta = await fetch(
            "/api/paypal/pago?accion=capturar",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                pedidoId,
                paypalOrderId,
              }),
            }
          );
        } else {
          respuesta = await fetch(
            `/api/mercadopago/verificar-pago?pedidoId=${encodeURIComponent(
              pedidoId
            )}`
          );
        }

        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos?.error ||
              "No se pudo verificar el pago"
          );
        }

        if (datos.aprobado) {
          setProductos(
            Array.isArray(datos.productos)
              ? datos.productos
              : []
          );

          setEstado("aprobado");
          return;
        }

        /*
         * PayPal no necesita reintentar
         * la captura desde esta página.
         */

        if (esPayPal) {
          setEstado("pendiente");
          return;
        }

        /*
         * Mercado Pago puede demorar
         * algunos segundos en acreditar.
         */

        intentos++;

        if (intentos < maxIntentos) {
          timeoutId = setTimeout(
            verificarPago,
            2000
          );
        } else {
          setEstado("pendiente");
        }
      } catch (error) {
        console.error(
          "Error verificando pago:",
          error
        );

        setEstado("error");
      }
    };

    verificarPago();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [
    pedidoId,
    esPayPal,
    paypalOrderId,
  ]);

  /* =====================================================
     DESCARGAR SIN SALIR DE LA PÁGINA
  ===================================================== */

  const descargarProducto = async (
    producto
  ) => {
    if (
      descargando ||
      descargados.includes(
        producto.productoId
      )
    ) {
      return;
    }

    setDescargando(
      producto.productoId
    );

    setErrorDescarga("");

    try {
      const respuesta = await fetch(
        `/api/descargas/${encodeURIComponent(
          pedidoId
        )}?productoId=${encodeURIComponent(
          producto.productoId
        )}`
      );

      if (!respuesta.ok) {
        const datos =
          await respuesta
            .json()
            .catch(() => null);

        throw new Error(
          datos?.error ||
            "No se pudo descargar el archivo"
        );
      }

      const blob =
        await respuesta.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const enlace =
        document.createElement("a");

      enlace.href = url;

      const contentDisposition =
        respuesta.headers.get(
          "Content-Disposition"
        );

      let nombreArchivo =
        `${producto.productoId}.pdf`;

      if (contentDisposition) {
        const coincidencia =
          contentDisposition.match(
            /filename="([^"]+)"/
          );

        if (coincidencia?.[1]) {
          nombreArchivo =
            coincidencia[1];
        }
      }

      enlace.download =
        nombreArchivo;

      document.body.appendChild(
        enlace
      );

      enlace.click();

      enlace.remove();

      window.URL.revokeObjectURL(
        url
      );

      setDescargados(
        (anteriores) => [
          ...anteriores,
          producto.productoId,
        ]
      );
    } catch (error) {
      console.error(
        "Error descargando:",
        error
      );

      setErrorDescarga(
        error.message ||
          "No se pudo descargar el archivo."
      );
    } finally {
      setDescargando(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-10 sm:pt-14">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-8">
          <h1 className="text-2xl font-medium text-slate-900 sm:text-3xl">
            ¡Gracias por tu compra!
          </h1>

          {!esPayPal &&
            estado === "verificando" && (
              <p className="mt-3 text-sm font-normal leading-6 text-slate-500 sm:text-base">
                Estamos procesando tu pedido y
                verificando el estado del pago.
              </p>
            )}
        </div>

        {/* VERIFICANDO */}

        {estado === "verificando" && (
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <LoaderCircle
                  size={20}
                  className="animate-spin"
                />
              </div>

              <div>
                <h2 className="text-base font-medium text-slate-900 sm:text-lg">
                  Verificando tu pago
                </h2>

                {!esPayPal && (
                  <p className="mt-2 text-sm font-normal leading-6 text-slate-500">
                    Estamos esperando la
                    confirmación de Mercado Pago.
                    Esto normalmente demora solo
                    unos segundos.
                  </p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* APROBADO */}

        {estado === "aprobado" && (
          <>
            <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={20} />
                </div>

                <div>
                  <h2 className="text-base font-medium text-slate-900 sm:text-lg">
                    Pago confirmado
                  </h2>

                  <p className="mt-2 text-sm font-normal leading-6 text-slate-500 sm:text-base">
                    Tu pago fue acreditado
                    correctamente. Tu compra ya
                    está disponible para
                    descargar.
                  </p>
                </div>
              </div>
            </section>

            {/* DESCARGAS */}

            <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div className="mb-5">
                <h2 className="text-base font-medium text-slate-900 sm:text-lg">
                  Tus descargas
                </h2>

                <p className="mt-2 text-sm font-normal leading-6 text-slate-500">
                  Descarga los archivos incluidos
                  en tu compra.
                </p>
              </div>

              <div className="space-y-3">
                {productos.map(
                  (producto) => {
                    const estaDescargando =
                      descargando ===
                      producto.productoId;

                    const estaDescargado =
                      descargados.includes(
                        producto.productoId
                      );

                    return (
                      <div
                        key={
                          producto.productoId
                        }
                        className="flex items-center justify-between gap-4 rounded-lg border border-slate-200 p-4"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-5 text-slate-800 sm:text-base">
                            {producto.nombre ||
                              "Producto digital"}
                          </p>

                          <p className="mt-1 text-xs font-normal text-slate-400 sm:text-sm">
                            Archivo PDF
                          </p>
                        </div>

                        <button
                          type="button"
                          disabled={
                            estaDescargando ||
                            estaDescargado
                          }
                          onClick={() =>
                            descargarProducto(
                              producto
                            )
                          }
                          className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                            estaDescargado
                              ? "cursor-default bg-emerald-100 text-emerald-700"
                              : estaDescargando
                                ? "cursor-wait bg-slate-200 text-slate-500"
                                : "bg-[#285861] text-white hover:bg-[#204850]"
                          }`}
                        >
                          {estaDescargando ? (
                            <>
                              <LoaderCircle
                                size={15}
                                className="animate-spin"
                              />
                              Descargando
                            </>
                          ) : estaDescargado ? (
                            <>
                              <Check
                                size={15}
                              />
                              Descargado
                            </>
                          ) : (
                            <>
                              <Download
                                size={15}
                              />
                              Descargar
                            </>
                          )}
                        </button>
                      </div>
                    );
                  }
                )}
              </div>

              {errorDescarga && (
                <p className="mt-4 text-sm font-normal text-red-600">
                  {errorDescarga}
                </p>
              )}

              <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-5 text-xs font-normal text-slate-400 sm:text-sm">
                <ShieldCheck
                  size={15}
                  className="shrink-0 text-emerald-600"
                />

                Descarga protegida vinculada a
                tu compra.
              </div>
            </section>
          </>
        )}

        {/* PENDIENTE */}

        {estado === "pendiente" && (
          <section className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-base font-medium text-slate-900 sm:text-lg">
              Pago pendiente
            </h2>

            <p className="mt-2 text-sm font-normal leading-6 text-slate-500 sm:text-base">
              Tu pago fue recibido, pero todavía
              estamos esperando la confirmación.
              Cuando se acredite podremos
              habilitar tu descarga.
            </p>
          </section>
        )}

        {/* ERROR */}

        {estado === "error" && (
          <section className="rounded-xl border border-red-200 bg-white p-6 shadow-sm sm:p-7">
            <h2 className="text-base font-medium text-slate-900 sm:text-lg">
              No pudimos verificar tu compra
            </h2>

            <p className="mt-2 text-sm font-normal leading-6 text-slate-500 sm:text-base">
              No pudimos consultar el estado del
              pedido en este momento.
            </p>
          </section>
        )}

        {/* ESPACIO PARA PRODUCTOS RECOMENDADOS */}

        <section className="mt-12 min-h-[220px] border-t border-slate-200 pt-8">
          {/*
            Aquí agregaremos posteriormente
            los productos recomendados.
          */}
        </section>
      </div>
    </main>
  );
}