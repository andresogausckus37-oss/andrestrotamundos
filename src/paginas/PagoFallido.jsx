export default function PagoFallido() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">
          No se pudo completar el pago
        </h1>

        <p className="mt-4 text-slate-600">
          Puedes volver a la tienda e intentar realizar la compra nuevamente.
        </p>
      </div>
    </main>
  );
}