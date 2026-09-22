import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function PagoExitoso() {
  const [searchParams] = useSearchParams();

  const [estado, setEstado] =
    useState("verificando");

  const pedidoId =
    searchParams.get("external_reference");

  useEffect(() => {
    if (!pedidoId) {
      setEstado("error");
      return;
    }

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

        setEstado(
          datos.aprobado
            ? "aprobado"
            : "pendiente"
        );
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
          ¡Pago acreditado!
        </h1>

        {estado === "verificando" && (
          <p className="mt-4 text-slate-600">
            Estamos verificando tu compra...
          </p>
        )}

        {estado === "aprobado" && (
          <p className="mt-4 text-slate-600">
            Tu compra fue verificada correctamente.
          </p>
        )}

        {estado === "pendiente" && (
          <p className="mt-4 text-slate-600">
            Estamos confirmando tu pago.
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