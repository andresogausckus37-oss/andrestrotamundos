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

  const pedidoId =
    searchParams.get(
      "external_reference"
    );

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
        const respuesta = await fetch(
          `/api/mercadopago/verificar-pago?pedidoId=${encodeURIComponent(
            pedidoId
          )}`
        );

        const datos =
          await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
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
  }, [pedidoId]);

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16">
      <div className="mx-auto max-w-3xl">
        {/* =====================================================
            ENCABEZADO
        ====================================================== */}

        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Estado del pedido
          </p>

          <h1 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">
            ¡Gracias por tu compra!
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Estamos procesando tu pedido y
            verificando el estado del pago.
          </p>
        </div>

        {/* =====================================================
            VERIFICANDO
        ====================================================== */}

        {estado === "verificando" && (
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600">
                <LoaderCircle
                  size={17}
                  className="animate-spin"
                />
              </div>

              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Verificando tu pago
                </h2>

                <p className="mt-1 text-[11px] leading-4 text-slate-500">
                  Estamos esperando la
                  confirmación de Mercado Pago.
                  Esto normalmente demora solo
                  unos segundos.
                </p>
              </div>
            </div>
          </section>
        )}

        {/* =====================================================
            APROBADO
        ====================================================== */}

        {estado === "aprobado" && (
          <>
            <section className="rounded-xl border border-emerald-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Check size={17} />
                </div>

                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Pago confirmado
                  </h2>

                  <p className="mt-1 text-[11px] leading-4 text-slate-500">
                    Tu pago fue acreditado
                    correctamente. Tu compra ya
                    está disponible para
                    descargar.
                  </p>
                </div>
              </div>
            </section>

            {/* DESCARGAS */}

            <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-slate-900">
                  Tus descargas
                </h2>

                <p className="mt-0.5 text-[10px] text-slate-500">
                  Descarga los archivos incluidos
                  en tu compra.
                </p>
              </div>

              {productos.length > 0 ? (
                <div className="space-y-2">
                  {productos.map(
                    (producto) => (
                      <div
                        key={
                          producto.productoId
                        }
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-2.5"
                      >
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold leading-4 text-slate-800">
                            {producto.nombre ||
                              "Producto digital"}
                          </p>

                          <p className="mt-0.5 text-[9px] text-slate-400">
                            Archivo PDF
                          </p>
                        </div>

                        <a
                          href={`/api/descargas/${encodeURIComponent(
                            pedidoId
                          )}?productoId=${encodeURIComponent(
                            producto.productoId
                          )}`}
                          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-slate-800"
                        >
                          <Download
                            size={13}
                          />
                          Descargar
                        </a>
                      </div>
                    )
                  )}
                </div>
              ) : (
                /* COMPATIBILIDAD CON PEDIDOS ANTERIORES */

                <a
                  href={`/api/descargas/${encodeURIComponent(
                    pedidoId
                  )}`}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white transition hover:bg-slate-800"
                >
                  <Download size={13} />
                  Descargar PDF
                </a>
              )}

              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 text-[9px] text-slate-400">
                <ShieldCheck
                  size={12}
                  className="text-emerald-600"
                />
                Descarga protegida vinculada a
                tu compra.
              </div>
            </section>
          </>
        )}

        {/* =====================================================
            PENDIENTE
        ====================================================== */}

        {estado === "pendiente" && (
          <section className="rounded-xl border border-amber-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              Pago pendiente
            </h2>

            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              Tu pago fue recibido, pero todavía
              estamos esperando la confirmación.
              Cuando se acredite podremos
              habilitar tu descarga.
            </p>
          </section>
        )}

        {/* =====================================================
            ERROR
        ====================================================== */}

        {estado === "error" && (
          <section className="rounded-xl border border-red-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900">
              No pudimos verificar tu compra
            </h2>

            <p className="mt-1 text-[11px] leading-4 text-slate-500">
              No pudimos consultar el estado del
              pedido en este momento.
            </p>
          </section>
        )}

        {/* =====================================================
            ESPACIO PARA RECOMENDADOS
        ====================================================== */}

        <section className="mt-6 min-h-[180px] border-t border-slate-200 pt-5">
          {/*
            Próximamente:
            productos recomendados mientras
            el cliente espera o después de
            completar su compra.
          */}
        </section>
      </div>
    </main>
  );
}