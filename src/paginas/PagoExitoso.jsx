import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function PagoExitoso() {
  const [searchParams] = useSearchParams();
  const [estado, setEstado] = useState("verificando");

  const pedidoId =
    searchParams.get("external_reference");

  useEffect(() => {
    if (!pedidoId) {
      setEstado("error");
      return;
    }

    let intentos = 0;
    const maxIntentos = 10;

    const verificarPago = async () => {
      try {
        const respuesta = await fetch(
          `/api/mercadopago/verificar-pago?pedidoId=${encodeURIComponent(
            pedidoId
          )}`
        );

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            "No se pudo verificar el pago"
          );
        }

        if (datos.aprobado) {
          setEstado("aprobado");
          return;
        }

        intentos++;

        if (intentos < maxIntentos) {
          setTimeout(verificarPago, 2000);
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
  }, [pedidoId]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">
          ¡Gracias por tu compra!
        </h1>

        {estado === "verificando" && (
          <p className="mt-4 text-slate-600">
            Estamos verificando tu pago...
          </p>
        )}

        {estado === "aprobado" && (
          <>
            <p className="mt-4 text-slate-600">
              Tu pago fue acreditado correctamente.
              Tu PDF ya está disponible.
            </p>

            <a
              href={`/api/descargas/${encodeURIComponent(
                pedidoId
              )}`}
              className="inline-block mt-6 px-6 py-3 rounded-xl bg-slate-900 text-white font-semibold"
            >
              Descargar PDF
            </a>
          </>
        )}

        {estado === "pendiente" && (
          <p className="mt-4 text-slate-600">
            Tu pago fue recibido, pero todavía
            estamos esperando la confirmación.
          </p>
        )}

        {estado === "error" && (
          <p className="mt-4 text-slate-600">
            No pudimos verificar tu compra.
          </p>
        )}
      </div>
    </main>
  );
}