export default function PagoPendiente() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-3xl font-bold">
          Pago pendiente
        </h1>

        <p className="mt-4 text-slate-600">
          Tu pago todavía está siendo procesado. La descarga se habilitará cuando sea acreditado.
        </p>
      </div>
    </main>
  );
}