import { Sparkles } from "lucide-react";

export default function AdminRedes() {
  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>

          <h1 className="text-xl font-bold text-slate-900">
            Contenido y redes
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Generá, revisá y programá el contenido semanal.
          </p>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-violet-600" />

            <h2 className="text-sm font-bold text-slate-900">
              Generador de contenido
            </h2>
          </div>

          <p className="mt-2 text-xs text-slate-500">
            Seleccioná dos productos para preparar el contenido de la semana.
          </p>
        </section>
      </div>
    </main>
  );
}