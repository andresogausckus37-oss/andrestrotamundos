import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Check,
  Copy,
  Landmark,
  Upload,
} from "lucide-react";

export default function PagoTransferencia() {
  const [searchParams] = useSearchParams();
  const [copiado, setCopiado] = useState("");

  const pedidoId =
    searchParams.get("pedidoId");

  const datosCuenta = {
    medio: "Mercado Pago",
    titular: "Andrés House Sitter",
    alias: "andres.imprimibles",
    cvu: "0000003100023252705282",
  };

  const copiar = async (valor, campo) => {
    try {
      await navigator.clipboard.writeText(
        valor
      );

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

        {/* DATOS DE TRANSFERENCIA */}

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

            {/* TITULAR */}

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
                Después de realizar la
                transferencia, selecciona el
                comprobante desde la galería de
                tu dispositivo.
              </p>
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-center">
            <Upload
              size={18}
              className="mx-auto text-slate-400"
            />

            <p className="mt-1.5 text-[10px] text-slate-500">
              JPG, PNG o PDF
            </p>

            <button
              type="button"
              className="mt-2 rounded-lg bg-slate-900 px-3 py-2 text-[10px] font-bold text-white"
            >
              Seleccionar comprobante
            </button>
          </div>
        </section>

        {/* SEGUIMIENTO */}

        <section className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Seguimiento de tu pedido
          </h2>

          <p className="mt-1 text-[11px] leading-4 text-slate-500">
            Después de enviar el comprobante
            podrás seguir aquí el estado de tu
            compra. No necesitas comunicarte por
            WhatsApp.
          </p>

          {pedidoId && (
            <p className="mt-2 text-[9px] text-slate-400">
              Pedido: {pedidoId}
            </p>
          )}
        </section>

        {/* ESPACIO PARA RECOMENDADOS */}

        <section className="mt-8 min-h-[220px] border-t border-slate-200 pt-5">
          {/* Productos recomendados */}
        </section>
      </div>
    </main>
  );
}