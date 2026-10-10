import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Check,
  Mail,
  PackageCheck,
  ShoppingBag,
} from "lucide-react";

export default function PagoExitoso() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const pedidoId =
    searchParams.get("pedidoId") ||
    searchParams.get("external_reference") ||
    "";

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-20 pt-10 sm:pt-14">
      <div className="mx-auto max-w-2xl">
        <section className="rounded-xl border border-emerald-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check size={22} strokeWidth={2} />
            </div>

            <div>
              <h1 className="text-2xl font-semibold text-slate-900 sm:text-3xl">
                Pago confirmado
              </h1>

              <p className="mt-3 text-sm leading-6 text-slate-600 sm:text-base">
                Recibimos correctamente la confirmación de tu pago.
                Ahora comenzaremos a preparar tu pedido.
              </p>

              {pedidoId && (
                <p className="mt-3 text-xs text-slate-400 sm:text-sm">
                  Pedido:{" "}
                  <span className="font-medium text-slate-600">
                    {pedidoId}
                  </span>
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-start gap-3">
            <PackageCheck
              size={20}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-[#285861]"
            />

            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Preparación del pedido
              </h2>

              <p className="mt-1.5 text-sm leading-6 text-slate-500">
                Te informaremos los próximos avances del pedido
                mientras preparamos el producto para su envío.
              </p>
            </div>
          </div>

          <div className="mt-5 flex items-start gap-3 border-t border-slate-100 pt-5">
            <Mail
              size={19}
              strokeWidth={1.8}
              className="mt-0.5 shrink-0 text-[#285861]"
            />

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Seguimiento por email
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-500">
                Las novedades importantes de tu compra serán
                enviadas al correo informado al realizar el pedido.
              </p>
            </div>
          </div>
        </section>

        <div className="mt-6">
          <button
            type="button"
            onClick={() => navigate("/tienda")}
            className="flex w-full items-center justify-center gap-2 rounded-md bg-[#285861] px-5 py-3 text-sm font-medium text-white transition hover:bg-[#204850]"
          >
            <ShoppingBag size={17} strokeWidth={1.8} />
            Volver a la tienda
          </button>
        </div>
      </div>
    </main>
  );
}
