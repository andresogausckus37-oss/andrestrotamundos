import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2 } from "lucide-react";

export default function LoginAdmin() {
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState("");

  const iniciarSesion = async (event) => {
    event.preventDefault();

    if (!password) {
      setError("Ingresa la contraseña.");
      return;
    }

    try {
      setProcesando(true);
      setError("");

      const respuesta = await fetch(
        "/api/admin/login",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            password,
          }),
        }
      );

      const datos = await respuesta.json();

      if (
        !respuesta.ok ||
        !datos.autenticado
      ) {
        throw new Error(
          datos.error ||
            "No se pudo iniciar sesión."
        );
      }

      navigate("/admin");
    } catch (error) {
      setError(
        error.message ||
          "No se pudo iniciar sesión."
      );
    } finally {
      setProcesando(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pt-24">
      <div className="mx-auto max-w-sm">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-700">
            <Lock size={17} />
          </div>

          <h1 className="text-lg font-bold text-slate-900">
            Administración
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Ingresa tu contraseña para continuar.
          </p>

          <form
            onSubmit={iniciarSesion}
            className="mt-5"
          >
            <label className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Contraseña
            </label>

            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              autoComplete="current-password"
              className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-violet-500"
              placeholder="••••••••"
            />

            {error && (
              <p className="mt-2 text-[10px] font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={procesando}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {procesando ? (
                <>
                  <Loader2
                    size={14}
                    className="animate-spin"
                  />
                  Ingresando...
                </>
              ) : (
                "Ingresar"
              )}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}