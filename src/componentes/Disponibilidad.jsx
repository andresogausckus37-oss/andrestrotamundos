import { CONFIG } from "../datos/config";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Info,
  CheckCircle2,
  XCircle,
  X,
  FileText,
} from "lucide-react";

import { fechasReservadas } from "../datos/disponibilidad";

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const diasSemana = ["D", "L", "M", "M", "J", "V", "S"];

const Disponibilidad = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]);
  const [modalReservasAbierto, setModalReservasAbierto] = useState(false);

  const obtenerFechaString = (year, month, day) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day,
    ).padStart(2, "0")}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    return {
      daysInMonth,
      firstDay,
    };
  };

  const { daysInMonth, firstDay } = getDaysInMonth(currentMonth);

  const toggleDate = (day) => {
    const fecha = obtenerFechaString(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day,
    );

    if (fechasReservadas.includes(fecha)) {
      return;
    }

    setSelectedDates((prev) =>
      prev.includes(fecha)
        ? prev.filter((item) => item !== fecha)
        : [...prev, fecha].sort(),
    );
  };

  const mesAnterior = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1,
      ),
    );
  };

  const mesSiguiente = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1,
      ),
    );
  };

  return (
    <>
      <section id="disponibilidad" className="seccion bg-white">
        <div className="mx-auto max-w-3xl">
          {/* Encabezado */}

          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="eyebrow">Disponibilidad</p>

            <h2 className="titulo-seccion">
              Consulta las fechas que necesitas
            </h2>

            <p className="subtitulo-seccion">
              Los días disponibles pueden seleccionarse directamente. Las
              fechas ya reservadas aparecen bloqueadas en el calendario.
            </p>
          </div>

          {/* Calendario */}

          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            {/* Mes */}

            <div className="mb-6 flex items-center justify-between">
              <button
                type="button"
                onClick={mesAnterior}
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Mes anterior"
              >
                <ChevronLeft size={20} />
              </button>

              <h3 className="text-base font-semibold capitalize text-slate-900 sm:text-lg">
                {meses[currentMonth.getMonth()]}{" "}
                {currentMonth.getFullYear()}
              </h3>

              <button
                type="button"
                onClick={mesSiguiente}
                className="rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Mes siguiente"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Referencias */}

            <div className="mb-6 flex items-center justify-center gap-6 rounded-2xl bg-slate-50 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />

                <span className="text-xs font-medium text-slate-600">
                  Disponible
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500" />

                <span className="text-xs font-medium text-slate-600">
                  Reservado
                </span>
              </div>
            </div>

            {/* Días de semana */}

            <div className="mb-2 grid grid-cols-7 gap-1">
              {diasSemana.map((dia, index) => (
                <div
                  key={`${dia}-${index}`}
                  className="py-2 text-center text-[11px] font-semibold uppercase text-slate-400"
                >
                  {dia}
                </div>
              ))}
            </div>

            {/* Días */}

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({ length: firstDay }).map((_, index) => (
                <div key={`empty-${index}`} />
              ))}

              {Array.from({ length: daysInMonth }).map((_, index) => {
                const day = index + 1;

                const year = currentMonth.getFullYear();
                const month = currentMonth.getMonth();

                const fechaString = obtenerFechaString(
                  year,
                  month,
                  day,
                );

                const fecha = new Date(year, month, day);

                const hoy = new Date();

                const inicioHoy = new Date(
                  hoy.getFullYear(),
                  hoy.getMonth(),
                  hoy.getDate(),
                );

                const isPast = fecha < inicioHoy;

                const isReserved =
                  fechasReservadas.includes(fechaString);

                const isSelected =
                  selectedDates.includes(fechaString);

                const isAvailable =
                  !isPast && !isReserved;

                let estilos =
                  "border border-transparent text-slate-700";

                if (isPast) {
                  estilos =
                    "cursor-not-allowed bg-slate-50 text-slate-300";
                } else if (isReserved) {
                  estilos =
                    "cursor-not-allowed border-rose-100 bg-rose-50 text-rose-500";
                } else if (isSelected) {
                  estilos =
                    "border-emerald-700 bg-emerald-700 text-white shadow-sm";
                } else if (isAvailable) {
                  estilos =
                    "border-emerald-100 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100";
                }

                return (
                  <button
                    key={day}
                    type="button"
                    disabled={isPast || isReserved}
                    onClick={() => toggleDate(day)}
                    className={`relative aspect-square rounded-xl text-xs font-semibold transition sm:text-sm ${estilos}`}
                    aria-label={
                      isReserved
                        ? `${fechaString}, reservado`
                        : isSelected
                          ? `${fechaString}, seleccionado`
                          : `${fechaString}, disponible`
                    }
                  >
                    {day}

                    {isReserved && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-rose-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Fechas elegidas */}

            {selectedDates.length > 0 && (
              <div className="mt-7 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={18}
                    className="text-emerald-600"
                  />

                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    Fechas seleccionadas
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDates.map((fecha) => (
                    <button
                      key={fecha}
                      type="button"
                      onClick={() =>
                        setSelectedDates((prev) =>
                          prev.filter(
                            (item) => item !== fecha,
                          ),
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg border border-emerald-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:border-rose-200 hover:text-rose-600"
                    >
                      {fecha}

                      <XCircle size={13} />
                    </button>
                  ))}
                </div>

                <a
                  href={`https://wa.me/${CONFIG.contacto.whatsapp}?text=${encodeURIComponent(
                    `Hola Andrés. Vi tu calendario en ${CONFIG.marca.dominio} y quiero consultar disponibilidad para estas fechas: ${selectedDates.join(
                      ", ",
                    )}.`,
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-emerald-800"
                >
                  Consultar estas fechas
                  <MessageCircle size={17} />
                </a>
              </div>
            )}
          </div>

          {/* Acuerdos */}

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={() => setModalReservasAbierto(true)}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-sky-700"
            >
              <Info size={16} />
              Acuerdos y cancelaciones
            </button>
          </div>
        </div>
      </section>

      {/* Modal */}

      {modalReservasAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 p-5 backdrop-blur-sm"
          onClick={() => setModalReservasAbierto(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl sm:p-7"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cerrar */}

            <button
              type="button"
              onClick={() => setModalReservasAbierto(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              aria-label="Cerrar"
            >
              <X size={18} />
            </button>

            {/* Encabezado */}

            <div className="pr-10">
              

              <h3 className="text-xl font-semibold text-slate-900">
                Acuerdos y cancelaciones
              </h3>

              
            </div>

            

    {/* Contenido */}

<div className="mt-6 space-y-4 text-sm leading-6 text-slate-600">
  <div className="flex gap-3">
    <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-orange-500" />

    <p>
      Las fechas seleccionadas representan una consulta de disponibilidad.
      No generan una reserva automática.
    </p>
  </div>

  
  <div className="flex gap-3">
    <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-orange-500" />

    <p>
      Si ambas partes deciden avanzar, acordamos las condiciones y
      completamos la documentación correspondiente. Recién entonces la
      estancia se considera confirmada y las fechas pasan a figurar como
      reservadas.
    </p>
  </div>

  <div className="flex gap-3">
    <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-orange-500" />

    <p>
      Si alguna de las partes necesita cancelar una estancia confirmada,
      deberá comunicarlo con la mayor anticipación posible.
    </p>
  </div>

  <div className="flex gap-3">
    <span className="mt-2 h-1.5 w-1.5 min-w-1.5 rounded-full bg-orange-500" />

    <p>
      Cualquier gasto, servicio adicional o condición especial se acuerda
      previamente entre ambas partes.
    </p>
  </div>

  <div className="rounded-xl border border-sky-100 bg-sky-50 p-4">
    <div className="flex items-start gap-3">
      <FileText
        size={18}
        className="mt-0.5 min-w-5 text-sky-600"
      />

      <div>
        <p className="font-semibold text-slate-900">
          Acuerdo e información de la estancia
        </p>

        <p className="mt-1.5 text-sm leading-6 text-slate-600">
          Antes de comenzar utilizamos un acuerdo de estancia y una ficha
          del hogar y las mascotas. Allí dejamos por escrito las fechas,
          responsabilidades, instrucciones y demás información necesaria
          para realizar la estancia con claridad.
        </p>
      </div>
    </div>
  </div>
</div>

            {/* Cerrar */}

            <button
              type="button"
              onClick={() => setModalReservasAbierto(false)}
              className="mt-7 w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default Disponibilidad;