import { Link } from "react-router-dom";
import SliderProductosAfiliados from "./SliderProductosAfiliados";
import { productosAfiliados } from "../datos/productosAfiliados";

const ProductosRecomendados = () => {
  if (productosAfiliados.length === 0) {
    return null;
  }

  const productosDescanso = productosAfiliados.filter(
    (producto) => producto.categoria === "Descanso"
  );

  const productosAlimentacion = productosAfiliados.filter(
    (producto) => producto.categoria === "Alimentación"
  );

  const productosJuguetes = productosAfiliados.filter(
  (producto) => producto.categoria === "Juguetes"
);

  return (
    <section className="mt-16 border-t border-slate-200 pt-10">
      {/* =========================================================
          ENCABEZADO
      ========================================================== */}

      <div className="max-w-2xl">
        <p className="eyebrow">
          Productos recomendados
        </p>

        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Selección para mascotas y el hogar
        </h2>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Una selección de productos útiles para el cuidado,
          bienestar y comodidad de tus mascotas.
        </p>
      </div>

      {/* =========================================================
          SLIDER DESCANSO
      ========================================================== */}

      <SliderProductosAfiliados
        titulo="Descanso"
        productos={productosDescanso}
      />

      {/* =========================================================
          SLIDER ALIMENTACIÓN
      ========================================================== */}

      <SliderProductosAfiliados
        titulo="Alimentación"
        productos={productosAlimentacion}
      />

      {/* =========================================================
    SLIDER JUGUETES
========================================================== */}

<SliderProductosAfiliados
  titulo="Juguetes"
  productos={productosJuguetes}
/>

      {/* =========================================================
          BOTÓN VER TODOS
          Por ahora preparado visualmente.
          Luego lo conectaremos con /recomendados.
      ========================================================== */}

      <div className="mt-10 flex justify-center">
        <Link
  to="/recomendados"
  className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
>
  Ver todos los productos
</Link>
      </div>

      {/* =========================================================
          AVISO AFILIADOS
      ========================================================== */}

      <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] leading-5 text-slate-400 sm:text-xs">
        Algunos enlaces son de afiliados. Si realizás una compra a
        través de ellos, puedo recibir una comisión sin costo
        adicional para vos.
      </p>
    </section>
  );
};

export default ProductosRecomendados;