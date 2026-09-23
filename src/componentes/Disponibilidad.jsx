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

import {
  fechasReservadas,
  fechasNoDisponibles,
} from "../datos/disponibilidad";

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

const provinciasArgentina = [
  "Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
  "Ciudad Autónoma de Buenos Aires",
];

const diasSemana = [
  "D",
  "L",
  "M",
  "M",
  "J",
  "V",
  "S",
];

const Disponibilidad = () => {
  const [currentMonth, setCurrentMonth] =
    useState(new Date());

  const [selectedDates, setSelectedDates] =
    useState([]);

  const [
    modalReservasAbierto,
    setModalReservasAbierto,
  ] = useState(false);

  const [provincia, setProvincia] =
    useState("");

  const [ciudad, setCiudad] =
    useState("");

  const [
    errorUbicacion,
    setErrorUbicacion,
  ] = useState("");

  // =========================================================
  // FECHAS
  // =========================================================

  const obtenerFechaString = (
    year,
    month,
    day
  ) => {
    return `${year}-${String(
      month + 1
    ).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();

    const firstDay = new Date(
      year,
      month,
      1
    ).getDay();

    const daysInMonth = new Date(
      year,
      month + 1,
      0
    ).getDate();

    return {
      daysInMonth,
      firstDay,
    };
  };

  const { daysInMonth, firstDay } =
    getDaysInMonth(currentMonth);

  // =========================================================
  // SELECCIONAR FECHA
  // =========================================================

  const toggleDate = (day) => {
    const fecha = obtenerFechaString(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      day
    );

    if (
      fechasReservadas.includes(fecha) ||
      fechasNoDisponibles.includes(fecha)
    ) {
      return;
    }

    setSelectedDates((prev) =>
      prev.includes(fecha)
        ? prev.filter(
            (item) => item !== fecha
          )
        : [...prev, fecha].sort()
    );
  };

  // =========================================================
  // NAVEGACIÓN DEL CALENDARIO
  // =========================================================

  const mesAnterior = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() - 1,
        1
      )
    );
  };

  const mesSiguiente = () => {
    setCurrentMonth(
      new Date(
        currentMonth.getFullYear(),
        currentMonth.getMonth() + 1,
        1
      )
    );
  };

  // =========================================================
  // CONSULTA POR WHATSAPP
  // =========================================================

  const consultarPorWhatsApp = () => {
    const ciudadLimpia =
      ciudad.trim();

    if (!provincia || !ciudadLimpia) {
      setErrorUbicacion(
        "Selecciona una provincia e ingresa tu ciudad."
      );

      return;
    }

    if (selectedDates.length === 0) {
      setErrorUbicacion(
        "Selecciona al menos una fecha."
      );

      return;
    }

    setErrorUbicacion("");

    const mensaje = `Hola ${CONFIG.marca.nombre}. Quiero consultar disponibilidad para el cuidado de mi hogar y/o mascotas.

*Ubicación:* ${ciudadLimpia}, ${provincia}
*Fechas:* ${selectedDates.join(", ")}

Quisiera recibir más información.`;

    const url = `https://wa.me/${CONFIG.contacto.whatsapp}?text=${encodeURIComponent(
      mensaje
    )}`;

    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <>
      <section
        id="disponibilidad"
        className="bg-[#FBF2ED] px-5 py-12 md:py-14"
      >
        <div className="mx-auto max-w-3xl">

          {/* ENCABEZADO */}

          <div className="mx-auto mb-7 max-w-xl text-center">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#C9785C]">
              Disponibilidad
            </p>

            <h2 className="mt-1.5 text-2xl font-medium tracking-[-0.02em] text-[#26352F] md:text-[28px]">
              Consulta las fechas disponibles
            </h2>

            <p className="mt-2.5 text-sm font-normal leading-6 text-[#66736D]">
              Selecciona tu ubicación y las fechas
              que necesitas para consultar
              disponibilidad.
            </p>
          </div>

          {/* UBICACIÓN */}

          <div className="mb-3 rounded-md border border-[#E8DDD6] bg-[#FFFEFC] p-4">
            <p className="text-[14px] font-medium text-[#26352F]">
              Ubicación
            </p>

            <p className="mt-1 text-[12px] font-normal leading-5 text-[#66736D]">
              Indica dónde necesitas el servicio.
            </p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="provincia"
                  className="mb-1.5 block text-[11px] font-medium text-[#66736D]"
                >
                  Provincia
                </label>

                <select
                  id="provincia"
                  value={provincia}
                  onChange={(e) => {
                    setProvincia(
                      e.target.value
                    );

                    setErrorUbicacion("");
                  }}
                  className="w-full rounded-md border border-[#DDDCD6] bg-white px-3 py-2.5 text-[13px] font-normal text-[#26352F] outline-none transition focus:border-[#7D9A8B]"
                >
                  <option value="">
                    Selecciona una provincia
                  </option>

                  {provinciasArgentina.map(
                    (item) => (
                      <option
                        key={item}
                        value={item}
                      >
                        {item}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label
                  htmlFor="ciudad"
                  className="mb-1.5 block text-[11px] font-medium text-[#66736D]"
                >
                  Ciudad
                </label>

                <input
                  id="ciudad"
                  type="text"
                  value={ciudad}
                  onChange={(e) => {
                    setCiudad(
                      e.target.value
                    );

                    setErrorUbicacion("");
                  }}
                  placeholder="Ingresa tu ciudad"
                  className="w-full rounded-md border border-[#DDDCD6] bg-white px-3 py-2.5 text-[13px] font-normal text-[#26352F] outline-none transition placeholder:text-[#9BA39F] focus:border-[#7D9A8B]"
                />
              </div>
            </div>
          </div>

          {/* CALENDARIO */}

          <div className="rounded-md border border-[#E8DDD6] bg-[#FFFEFC] p-4 sm:p-5">

            {/* MES */}

            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={mesAnterior}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#66736D] transition hover:bg-[#F1F5EF] hover:text-[#3F6655]"
                aria-label="Mes anterior"
              >
                <ChevronLeft
                  size={18}
                  strokeWidth={1.7}
                />
              </button>

              <h3 className="text-[15px] font-medium capitalize text-[#26352F]">
                {
                  meses[
                    currentMonth.getMonth()
                  ]
                }{" "}
                {currentMonth.getFullYear()}
              </h3>

              <button
                type="button"
                onClick={mesSiguiente}
                className="flex h-8 w-8 items-center justify-center rounded-md text-[#66736D] transition hover:bg-[#F1F5EF] hover:text-[#3F6655]"
                aria-label="Mes siguiente"
              >
                <ChevronRight
                  size={18}
                  strokeWidth={1.7}
                />
              </button>
            </div>

            {/* REFERENCIAS */}

            <div className="mb-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 border-y border-[#EEEAE4] py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#6F927E]" />

                <span className="text-[11px] font-normal text-[#66736D]">
                  Disponible
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#C9785C]" />

                <span className="text-[11px] font-normal text-[#66736D]">
                  Reservado
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#A7ACA9]" />

                <span className="text-[11px] font-normal text-[#66736D]">
                  No disponible
                </span>
              </div>
            </div>

            {/* DÍAS DE SEMANA */}

            <div className="mb-1.5 grid grid-cols-7 gap-1">
              {diasSemana.map(
                (dia, index) => (
                  <div
                    key={`${dia}-${index}`}
                    className="py-1.5 text-center text-[10px] font-medium uppercase text-[#8A948F]"
                  >
                    {dia}
                  </div>
                )
              )}
            </div>

            {/* DÍAS DEL MES */}

            <div className="grid grid-cols-7 gap-1.5">
              {Array.from({
                length: firstDay,
              }).map((_, index) => (
                <div
                  key={`empty-${index}`}
                />
              ))}

              {Array.from({
                length: daysInMonth,
              }).map((_, index) => {
                const day = index + 1;

                const year =
                  currentMonth.getFullYear();

                const month =
                  currentMonth.getMonth();

                const fechaString =
                  obtenerFechaString(
                    year,
                    month,
                    day
                  );

                const fecha = new Date(
                  year,
                  month,
                  day
                );

                const hoy = new Date();

                const inicioHoy =
                  new Date(
                    hoy.getFullYear(),
                    hoy.getMonth(),
                    hoy.getDate()
                  );

                const isPast =
                  fecha < inicioHoy;

                const isReserved =
                  fechasReservadas.includes(
                    fechaString
                  );

                const isUnavailable =
                  fechasNoDisponibles.includes(
                    fechaString
                  );

                const isSelected =
                  selectedDates.includes(
                    fechaString
                  );

                const isAvailable =
                  !isPast &&
                  !isReserved &&
                  !isUnavailable;

                let estilos =
                  "border border-transparent text-[#66736D]";

                if (isPast) {
                  estilos =
                    "cursor-not-allowed bg-[#FAF9F6] text-[#C5C9C6]";
                } else if (
                  isReserved
                ) {
                  estilos =
                    "cursor-not-allowed border-[#F0D8CE] bg-[#FBF2ED] text-[#B8664B]";
                } else if (
                  isUnavailable
                ) {
                  estilos =
                    "cursor-not-allowed border-[#E4E5E3] bg-[#F3F4F2] text-[#A1A6A3]";
                } else if (
                  isSelected
                ) {
                  estilos =
                    "border-[#3F6655] bg-[#3F6655] text-white";
                } else if (
                  isAvailable
                ) {
                  estilos =
                    "border-[#DDE7DF] bg-[#F1F5EF] text-[#3F6655] hover:border-[#BFCFC3] hover:bg-[#E8F0EA]";
                }

                let ariaLabel = `${fechaString}, disponible`;

                if (isReserved) {
                  ariaLabel = `${fechaString}, reservado`;
                } else if (
                  isUnavailable
                ) {
                  ariaLabel = `${fechaString}, no disponible`;
                } else if (
                  isSelected
                ) {
                  ariaLabel = `${fechaString}, seleccionado`;
                } else if (isPast) {
                  ariaLabel = `${fechaString}, fecha pasada`;
                }

                return (
                  <button
                    key={fechaString}
                    type="button"
                    disabled={
                      isPast ||
                      isReserved ||
                      isUnavailable
                    }
                    onClick={() =>
                      toggleDate(day)
                    }
                    className={`relative aspect-square rounded-md text-[12px] font-medium transition sm:text-[13px] ${estilos}`}
                    aria-label={
                      ariaLabel
                    }
                  >
                    {day}

                    {isReserved && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#C9785C]" />
                    )}

                    {isUnavailable && (
                      <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#A7ACA9]" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* FECHAS ELEGIDAS */}

            {selectedDates.length > 0 && (
              <div className="mt-5 rounded-md border border-[#D8E4DA] bg-[#F1F5EF] p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    size={16}
                    strokeWidth={1.7}
                    className="text-[#3F6655]"
                  />

                  <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-[#3F6655]">
                    Fechas seleccionadas
                  </p>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedDates.map(
                    (fecha) => (
                      <button
                        key={fecha}
                        type="button"
                        onClick={() =>
                          setSelectedDates(
                            (prev) =>
                              prev.filter(
                                (item) =>
                                  item !== fecha
                              )
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#D8E4DA] bg-[#FFFEFC] px-2.5 py-1.5 text-[11px] font-normal text-[#4F5F57] transition hover:border-[#E6C4B6] hover:text-[#B8664B]"
                      >
                        {fecha}

                        <XCircle
                          size={12}
                          strokeWidth={1.7}
                        />
                      </button>
                    )
                  )}
                </div>

                {errorUbicacion && (
                  <p className="mt-3 rounded-md border border-[#F0D8CE] bg-[#FBF2ED] px-3 py-2 text-[11px] font-normal leading-5 text-[#B8664B]">
                    {errorUbicacion}
                  </p>
                )}

                <button
                  type="button"
                  onClick={
                    consultarPorWhatsApp
                  }
                  className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#3F6655] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#345548] active:scale-[0.99]"
                >
                  Consultar fechas

                  <MessageCircle
                    size={15}
                    strokeWidth={1.8}
                  />
                </button>
              </div>
            )}
          </div>

          {/* ACUERDOS */}

          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() =>
                setModalReservasAbierto(
                  true
                )
              }
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#66736D] transition hover:text-[#3F6655]"
            >
              <Info
                size={14}
                strokeWidth={1.7}
              />

              Acuerdos y reservas
            </button>
          </div>
        </div>
      </section>

      {/* MODAL */}

      {modalReservasAbierto && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[#26352F]/45 p-5 backdrop-blur-sm"
          onClick={() =>
            setModalReservasAbierto(
              false
            )
          }
        >
          <div
            className="relative w-full max-w-lg rounded-md border border-[#E5E2DA] bg-[#FFFEFC] p-5 shadow-xl sm:p-6"
            onClick={(e) =>
              e.stopPropagation()
            }
          >
            {/* CERRAR */}

            <button
              type="button"
              onClick={() =>
                setModalReservasAbierto(
                  false
                )
              }
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-md bg-[#F1F5EF] text-[#66736D] transition hover:bg-[#E8F0EA] hover:text-[#3F6655]"
              aria-label="Cerrar"
            >
              <X
                size={16}
                strokeWidth={1.7}
              />
            </button>

            {/* ENCABEZADO */}

            <div className="pr-10">
              <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#C9785C]">
                Información
              </p>

              <h3 className="mt-1 text-lg font-medium text-[#26352F]">
                Acuerdos y reservas
              </h3>
            </div>

            {/* INFORMACIÓN */}

            <div className="mt-4">
              <div className="rounded-md border border-[#DDE5DC] bg-[#F1F5EF] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 min-w-8 items-center justify-center rounded-md bg-[#E1EBE3] text-[#3F6655]">
                    <FileText
                      size={15}
                      strokeWidth={1.7}
                    />
                  </div>

                  <div>
                    <p className="text-[13px] font-medium text-[#26352F]">
                      Información importante
                    </p>

                    <p className="mt-1.5 text-[12px] font-normal leading-5 text-[#66736D]">
                      La disponibilidad mostrada en
                      el calendario es orientativa.
                      La reserva se confirma una vez
                      coordinados los detalles del
                      servicio.
                    </p>

                    <p className="mt-2 text-[12px] font-normal leading-5 text-[#66736D]">
                      Antes de confirmar se acordarán
                      las fechas, ubicación,
                      necesidades del hogar o las
                      mascotas y cualquier
                      información necesaria para el
                      servicio.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* BOTÓN */}

            <button
              type="button"
              onClick={() =>
                setModalReservasAbierto(
                  false
                )
              }
              className="mt-5 w-full rounded-md bg-[#3F6655] px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-[#345548] active:scale-[0.99]"
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