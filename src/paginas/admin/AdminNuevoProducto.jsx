import { useMemo, useState } from "react";
import {
  FilePlus2,
  RefreshCw,
} from "lucide-react";

import { productosDigitales } from "../../datos/productosDigitales";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const CATEGORIAS = [
  { valor: "laberintos", nombre: "Laberintos" },
  { valor: "crucigramas", nombre: "Crucigramas" },
  { valor: "sopa-de-letras", nombre: "Sopa de letras" },
  { valor: "rompecabezas", nombre: "Rompecabezas" },
  { valor: "sudoku", nombre: "Sudoku" },
  {
    valor: "palabras-desordenadas",
    nombre: "Palabras desordenadas",
  },
];

const PUBLICOS = [
  "Niños",
  "Adultos",
  "Para todas las edades",
];

const NIVELES = [
  "Niños",
  "Fácil",
  "Medio",
  "Difícil",
  "Avanzado",
  "Imposible",
  "Dificultad progresiva",
];

/* =========================================================
   UTILIDADES
========================================================= */

const crearId = (texto) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const obtenerNombreCategoria = (categoria) =>
  CATEGORIAS.find(
    (item) => item.valor === categoria
  )?.nombre.toLowerCase() || "actividades";

const pluralActividad = (categoria) => {
  const nombres = {
    laberintos: "laberintos",
    crucigramas: "crucigramas",
    "sopa-de-letras": "sopas de letras",
    rompecabezas: "rompecabezas",
    sudoku: "sudokus",
    "palabras-desordenadas":
      "actividades de palabras desordenadas",
  };

  return nombres[categoria] || "actividades";
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function AdminNuevoProducto() {
  const [formulario, setFormulario] = useState({
    nombre: "",
    categoria: "",
    publico: "",
    nivel: "",

    laminas: "",
    soluciones: "",
    paginas: "",

    precioARS: "",
    ofertaActiva: false,
    precioOfertaARS: "",

    precioUSD: "",
    ofertaUSDActiva: false,
    precioOfertaUSD: "",

    etiquetaOferta: "Oferta lanzamiento",

    ventaCruzadaId: "",
    destacado: false,

    descripcion: "",
    descripcionLarga: "",
    incluye: "",
    beneficios: "",
  });

  const idGenerado = useMemo(
    () => crearId(formulario.nombre),
    [formulario.nombre]
  );

  const idRepetido =
    idGenerado &&
    productosDigitales.some(
      (producto) => producto.id === idGenerado
    );

  const cambiar = (campo, valor) => {
    setFormulario((actual) => ({
      ...actual,
      [campo]: valor,
    }));
  };

  /* =======================================================
     GENERAR TEXTOS
  ======================================================= */

  const generarTextos = () => {
    const cantidad =
      Number(formulario.laminas) || 0;

    const soluciones =
      Number(formulario.soluciones) || 0;

    const paginas =
      Number(formulario.paginas) || 0;

    const actividad = pluralActividad(
      formulario.categoria
    );

    const categoria =
      obtenerNombreCategoria(
        formulario.categoria
      );

    const publico =
      formulario.publico || "todas las edades";

    const nivel =
      formulario.nivel || "variado";

    const descripcion = [
      `${cantidad} ${actividad} imprimibles`,
      `para ${publico.toLowerCase()}`,
      soluciones > 0
        ? `con ${soluciones} soluciones incluidas`
        : "",
      nivel
        ? `de nivel ${nivel.toLowerCase()}`
        : "",
    ]
      .filter(Boolean)
      .join(", ")
      .concat(".");

    const descripcionLarga =
      `Una colección de ${cantidad} ${actividad} imprimibles ` +
      `pensada para ${publico.toLowerCase()}. ` +
      `Las actividades ofrecen un nivel ${nivel.toLowerCase()} ` +
      `y están preparadas en formato PDF A4 para imprimir fácilmente ` +
      `en casa o en una imprenta.` +
      (soluciones > 0
        ? ` Incluye ${soluciones} soluciones para comprobar cada actividad.`
        : "") +
      (paginas > 0
        ? ` El archivo contiene ${paginas} páginas en total.`
        : "") +
      ` Una propuesta práctica para disfrutar de ${categoria} en formato imprimible.`;

    const incluye = [
      `${cantidad} ${actividad}`,
      soluciones > 0
        ? `${soluciones} soluciones incluidas`
        : "",
      "PDF A4 listo para imprimir",
      "Descarga digital instantánea",
    ]
      .filter(Boolean)
      .join("\n");

    const beneficiosPorCategoria = {
      laberintos: [
        "Concentración",
        "Seguimiento visual",
        "Reconocimiento de patrones",
        "Entretenimiento sin pantallas",
      ],

      crucigramas: [
        "Concentración",
        "Lógica",
        "Memoria",
        "Vocabulario",
      ],

      "sopa-de-letras": [
        "Concentración",
        "Memoria",
        "Vocabulario",
        "Entretenimiento y relajación",
      ],

      rompecabezas: [
        "Concentración",
        "Lógica",
        "Resolución de problemas",
        "Entretenimiento sin pantallas",
      ],

      sudoku: [
        "Concentración",
        "Lógica",
        "Razonamiento",
        "Agilidad mental",
      ],

      "palabras-desordenadas": [
        "Concentración",
        "Vocabulario",
        "Memoria",
        "Agilidad mental",
      ],
    };

    const beneficios =
      beneficiosPorCategoria[
        formulario.categoria
      ] || [
        "Concentración",
        "Entretenimiento",
      ];

    setFormulario((actual) => ({
      ...actual,
      descripcion,
      descripcionLarga,
      incluye,
      beneficios: beneficios.join("\n"),
    }));
  };

  /* =======================================================
     PRODUCTO FINAL
  ======================================================= */

  const convertirLista = (texto) =>
    texto
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean);

  const productoFinal = {
    id: idGenerado,

    nombre: formulario.nombre.trim(),

    ventaCruzadaId:
      formulario.ventaCruzadaId,

    descripcion:
      formulario.descripcion.trim(),

    descripcionLarga:
      formulario.descripcionLarga.trim(),

    tipo: "digital",

    categoria: formulario.categoria,

    linea: "juegos",

    precioARS:
      Number(formulario.precioARS) || 0,

    descuento: 0,

    oferta: {
      activa: formulario.ofertaActiva,

      precioARS: formulario.ofertaActiva
        ? Number(formulario.precioOfertaARS) || 0
        : 0,

      etiqueta: formulario.ofertaActiva
        ? formulario.etiquetaOferta.trim()
        : "",
    },

    precioUSD:
      Number(formulario.precioUSD) || 0,

    descuentoUSD: 0,

    ofertaUSD: {
      activa: formulario.ofertaUSDActiva,

      precioUSD: formulario.ofertaUSDActiva
        ? Number(formulario.precioOfertaUSD) || 0
        : 0,

      etiqueta: formulario.ofertaUSDActiva
        ? formulario.etiquetaOferta.trim()
        : "",
    },

    imagenes: {
      portada: "",
      preview: "",
      previewsIndividuales: [],
    },

    formato: "PDF",

    tamano: "A4",

    paginas:
      Number(formulario.paginas) || 0,

    laminas:
      Number(formulario.laminas) || 0,

    soluciones:
      Number(formulario.soluciones) || 0,

    incluye: convertirLista(
      formulario.incluye
    ),

    beneficios: convertirLista(
      formulario.beneficios
    ),

    edadRecomendada:
      formulario.publico,

    nivel: formulario.nivel,

    entrega: "Descarga digital",

    destacado: formulario.destacado,
  };

  const agregarProducto = async () => {
    if (!formulario.nombre.trim()) {
      alert("Falta el nombre del producto.");
      return;
    }

    if (!formulario.categoria) {
      alert("Falta seleccionar la categoría.");
      return;
    }

    if (!formulario.publico) {
      alert("Falta seleccionar el público.");
      return;
    }

    if (!formulario.nivel) {
      alert("Falta seleccionar el nivel.");
      return;
    }

    if (!formulario.laminas) {
      alert("Falta indicar la cantidad de actividades.");
      return;
    }

    if (idRepetido) {
      alert("Ya existe un producto con este ID.");
      return;
    }

    if (!formulario.descripcion.trim()) {
      alert("Primero generá los textos del producto.");
      return;
    }

    try {
      const respuesta = await fetch(
        "/api/admin/productos",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(productoFinal),
        }
      );

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(
          datos.error ||
            "No se pudo guardar el producto."
        );
      }

      alert("Producto guardado correctamente.");

      console.log(
        "Producto guardado:",
        datos
      );
    } catch (error) {
      console.error(
        "Error guardando producto:",
        error
      );

      alert(error.message);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-16 pt-24">
      <div className="mx-auto max-w-3xl">

        {/* ENCABEZADO */}

        <div className="mb-6">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administración
          </p>

          <h1 className="text-xl font-bold text-slate-900">
            Nuevo producto
          </h1>

          <p className="mt-1 text-xs text-slate-500">
            Completá los datos básicos y el sistema preparará la ficha.
          </p>
        </div>

        {/* INFORMACIÓN */}

        <Seccion titulo="Información del producto">
          <Campo
            titulo="Nombre"
            valor={formulario.nombre}
            onChange={(v) =>
              cambiar("nombre", v)
            }
          />

          {idGenerado && (
            <div
              className={`rounded-lg px-3 py-2 text-xs ${
                idRepetido
                  ? "bg-rose-50 text-rose-700"
                  : "bg-slate-50 text-slate-500"
              }`}
            >
              ID: <strong>{idGenerado}</strong>

              {idRepetido &&
                " · Este producto ya existe"}
            </div>
          )}

          <Selector
            titulo="Categoría"
            valor={formulario.categoria}
            onChange={(v) =>
              cambiar("categoria", v)
            }
          >
            <option value="">
              Seleccionar categoría
            </option>

            {CATEGORIAS.map((categoria) => (
              <option
                key={categoria.valor}
                value={categoria.valor}
              >
                {categoria.nombre}
              </option>
            ))}
          </Selector>

          <div className="grid gap-4 sm:grid-cols-2">
            <Selector
              titulo="Público"
              valor={formulario.publico}
              onChange={(v) =>
                cambiar("publico", v)
              }
            >
              <option value="">
                Seleccionar
              </option>

              {PUBLICOS.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </Selector>

            <Selector
              titulo="Nivel"
              valor={formulario.nivel}
              onChange={(v) =>
                cambiar("nivel", v)
              }
            >
              <option value="">
                Seleccionar
              </option>

              {NIVELES.map((item) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ))}
            </Selector>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo
              titulo="Actividades"
              tipo="number"
              valor={formulario.laminas}
              onChange={(v) =>
                cambiar("laminas", v)
              }
            />

            <Campo
              titulo="Soluciones"
              tipo="number"
              valor={formulario.soluciones}
              onChange={(v) =>
                cambiar("soluciones", v)
              }
            />
          </div>

          <Campo
            titulo="Páginas (opcional)"
            tipo="number"
            valor={formulario.paginas}
            onChange={(v) =>
              cambiar("paginas", v)
            }
          />
        </Seccion>

        {/* PRECIOS */}

        <Seccion titulo="Precios">

          {/* ARGENTINA */}

          <div>
            <div className="grid grid-cols-2 gap-3">
              <Campo
                titulo="Precio ARS"
                tipo="number"
                valor={formulario.precioARS}
                onChange={(v) =>
                  cambiar("precioARS", v)
                }
              />

              <Campo
                titulo="Precio oferta ARS"
                tipo="number"
                valor={formulario.precioOfertaARS}
                onChange={(v) =>
                  cambiar("precioOfertaARS", v)
                }
              />
            </div>

            <div className="mt-3">
              <Check
                titulo="Oferta Argentina"
                activo={formulario.ofertaActiva}
                onChange={(v) =>
                  cambiar("ofertaActiva", v)
                }
              />
            </div>
          </div>

          {/* INTERNACIONAL */}

          <div className="border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 gap-3">
              <Campo
                titulo="Precio USD"
                tipo="number"
                paso="0.01"
                valor={formulario.precioUSD}
                onChange={(v) =>
                  cambiar("precioUSD", v)
                }
              />

              <Campo
                titulo="Precio oferta USD"
                tipo="number"
                paso="0.01"
                valor={formulario.precioOfertaUSD}
                onChange={(v) =>
                  cambiar("precioOfertaUSD", v)
                }
              />
            </div>

            <div className="mt-3">
              <Check
                titulo="Oferta internacional"
                activo={formulario.ofertaUSDActiva}
                onChange={(v) =>
                  cambiar("ofertaUSDActiva", v)
                }
              />
            </div>
          </div>

          {(formulario.ofertaActiva ||
            formulario.ofertaUSDActiva) && (
            <Campo
              titulo="Etiqueta oferta"
              valor={formulario.etiquetaOferta}
              onChange={(v) =>
                cambiar("etiquetaOferta", v)
              }
            />
          )}

        </Seccion>

                {/* CONFIGURACIÓN */}

        <Seccion titulo="Configuración">
          <Selector
            titulo="Venta cruzada"
            valor={formulario.ventaCruzadaId}
            onChange={(v) =>
              cambiar("ventaCruzadaId", v)
            }
          >
            <option value="">
              Sin venta cruzada
            </option>

            {productosDigitales.map(
              (producto) => (
                <option
                  key={producto.id}
                  value={producto.id}
                >
                  {producto.nombre}
                </option>
              )
            )}
          </Selector>

          <Check
            titulo="Producto destacado"
            activo={formulario.destacado}
            onChange={(v) =>
              cambiar("destacado", v)
            }
          />
        </Seccion>

        {/* GENERADOR */}

        <section className="mt-6 rounded-xl border border-sky-200 bg-sky-50 p-5">
          <div className="flex items-center gap-2">
            <FilePlus2
              size={18}
              className="text-sky-600"
            />

            <h2 className="text-sm font-bold text-slate-900">
              Textos del producto
            </h2>
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            Generá una base automáticamente utilizando los datos anteriores.
            Después podés modificar cualquier texto.
          </p>

          <button
            type="button"
            onClick={generarTextos}
            disabled={
              !formulario.categoria ||
              !formulario.laminas ||
              !formulario.publico ||
              !formulario.nivel
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-3 text-xs font-bold text-white disabled:opacity-40"
          >
            <RefreshCw size={15} />
            Generar textos
          </button>
        </section>

        {/* TEXTOS */}

        <Seccion titulo="Descripción y contenido">
          <Area
            titulo="Descripción corta"
            valor={formulario.descripcion}
            onChange={(v) =>
              cambiar("descripcion", v)
            }
            filas={3}
          />

          <Area
            titulo="Descripción larga"
            valor={formulario.descripcionLarga}
            onChange={(v) =>
              cambiar("descripcionLarga", v)
            }
            filas={7}
          />

          <Area
            titulo="Qué incluye"
            ayuda="Un elemento por línea"
            valor={formulario.incluye}
            onChange={(v) =>
              cambiar("incluye", v)
            }
            filas={6}
          />

          <Area
            titulo="Beneficios"
            ayuda="Un beneficio por línea"
            valor={formulario.beneficios}
            onChange={(v) =>
              cambiar("beneficios", v)
            }
            filas={6}
          />
        </Seccion>

        {/* RESULTADO */}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Ficha generada
          </h2>

          <p className="mt-1 text-xs text-slate-500">
            Esta será la información del producto.
          </p>

          <pre className="mt-4 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-[10px] text-slate-100">
            {JSON.stringify(
              productoFinal,
              null,
              2
            )}
          </pre>

          <button
  type="button"
  onClick={agregarProducto}
  disabled={idRepetido}
  className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
>
  Agregar producto
</button>
          
        </section>
      </div>
    </main>
  );
}

/* =========================================================
   COMPONENTES DEL FORMULARIO
========================================================= */

function Seccion({ titulo, children }) {
  return (
    <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">
        {titulo}
      </h2>

      <div className="mt-4 space-y-4">
        {children}
      </div>
    </section>
  );
}

function Campo({
  titulo,
  valor,
  onChange,
  tipo = "text",
  paso,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </span>

      <input
        type={tipo}
        step={paso}
        value={valor}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-sky-400"
      />
    </label>
  );
}

function Selector({
  titulo,
  valor,
  onChange,
  children,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </span>

      <select
        value={valor}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-sky-400"
      >
        {children}
      </select>
    </label>
  );
}

function Area({
  titulo,
  ayuda,
  valor,
  onChange,
  filas,
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-slate-500">
        {titulo}
      </span>

      {ayuda && (
        <span className="mb-1.5 block text-[10px] text-slate-400">
          {ayuda}
        </span>
      )}

      <textarea
        rows={filas}
        value={valor}
        onChange={(e) =>
          onChange(e.target.value)
        }
        className="w-full resize-y rounded-lg border border-slate-200 px-3 py-2.5 text-sm leading-6 outline-none focus:border-sky-400"
      />
    </label>
  );
}

function Check({
  titulo,
  activo,
  onChange,
}) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg bg-slate-50 px-3 py-3">
      <input
        type="checkbox"
        checked={activo}
        onChange={(e) =>
          onChange(e.target.checked)
        }
        className="h-4 w-4"
      />

      <span className="text-xs font-semibold text-slate-700">
        {titulo}
      </span>
    </label>
  );
}