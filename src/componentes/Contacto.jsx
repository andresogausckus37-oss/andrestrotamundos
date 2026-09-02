import { useState } from "react";
import { Send, CheckCircle2 } from "lucide-react";

import { servicios } from "../datos/servicios";

const Contacto = () => {
  const [formData, setFormData] = useState({
    nombre: "",
    contacto: "",
    servicio: "",
    mensaje: "",
  });

  const [formSent, setFormSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    setFormSent(true);

    setTimeout(() => {
      setFormSent(false);
    }, 4000);

    setFormData({
      nombre: "",
      contacto: "",
      servicio: "",
      mensaje: "",
    });
  };

  return (
    <section id="contacto" className="seccion bg-white">
      <div className="mx-auto max-w-3xl">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="eyebrow">
            Contacto
          </p>

          <h2 className="titulo-seccion">
            Cuéntame qué necesitas
          </h2>

          <p className="subtitulo-seccion">
            Puedes dejar los datos principales de tu consulta y responderé lo
            antes posible.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-suave">
          <div className="grid md:grid-cols-[0.75fr_1.25fr]">
            {/* Lateral */}

            <div className="bg-gradient-to-br from-sky-600 to-sky-700 p-7 text-white sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-100">
                Hablemos
              </p>

              <h3 className="mt-4 text-2xl font-semibold leading-tight">
                Cuéntame sobre tu hogar, tus mascotas o tu viaje.
              </h3>

              <p className="mt-4 text-sm leading-6 text-sky-100">
                Mientras más información tenga desde el primer contacto, más
                fácil será evaluar fechas, necesidades y el tipo de acuerdo.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 min-w-5 text-emerald-300"
                  />

                  <p className="text-sm text-white/90">
                    Fechas aproximadas o exactas.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 min-w-5 text-orange-300"
                  />

                  <p className="text-sm text-white/90">
                    Cantidad y tipo de mascotas.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={19}
                    className="mt-0.5 min-w-5 text-sky-200"
                  />

                  <p className="text-sm text-white/90">
                    Ciudad y características principales del cuidado.
                  </p>
                </div>
              </div>
            </div>

            {/* Formulario */}

            <div className="p-6 sm:p-8">
              {formSent ? (
                <div className="flex min-h-[430px] flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                    <Send size={27} />
                  </div>

                  <h3 className="mt-5 text-xl font-semibold text-slate-900">
                    Consulta registrada
                  </h3>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">
                    Los datos se completaron correctamente.
                  </p>

                  <p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-400">
                    Este formulario todavía es una demostración y no envía la
                    información a ningún sistema externo.
                  </p>
                </div>
              ) : (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5"
                >
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Nombre
                    </label>

                    <input
                      type="text"
                      required
                      value={formData.nombre}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          nombre: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      placeholder="Tu nombre"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      WhatsApp o correo electrónico
                    </label>

                    <input
                      type="text"
                      required
                      value={formData.contacto}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          contacto: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      placeholder="+54 9... o nombre@correo.com"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Servicio
                    </label>

                    <select
                      value={formData.servicio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          servicio: e.target.value,
                        })
                      }
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                    >
                      <option value="">
                        Selecciona una opción
                      </option>

                      {servicios.map((servicio) => (
                        <option
                          key={servicio.id}
                          value={servicio.titulo}
                        >
                          {servicio.titulo}
                        </option>
                      ))}

                      <option value="Otro">
                        Consulta general
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Mensaje
                    </label>

                    <textarea
                      required
                      rows={5}
                      value={formData.mensaje}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          mensaje: e.target.value,
                        })
                      }
                      className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:bg-white focus:ring-4 focus:ring-sky-100"
                      placeholder="Cuéntame sobre las fechas, tu hogar, tus mascotas o cualquier detalle importante."
                    />
                  </div>

                  <button
                    type="submit"
                    className="boton-principal w-full gap-2"
                  >
                    Enviar consulta
                    <Send size={17} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Contacto;