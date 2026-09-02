import { Star } from "lucide-react";
import { resenasProductos } from "../datos/resenasProductos";

const CalificacionProducto = ({ productoId }) => {
  const resenas = resenasProductos.filter(
    (resena) => resena.productoId === productoId
  );

  if (resenas.length === 0) {
    return null;
  }

  const promedio =
    resenas.reduce((total, resena) => total + resena.estrellas, 0) /
    resenas.length;

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5 text-amber-500">
        {[1, 2, 3, 4, 5].map((estrella) => (
          <Star
            key={estrella}
            size={14}
            fill={estrella <= Math.round(promedio) ? "currentColor" : "none"}
            strokeWidth={1.8}
          />
        ))}
      </div>

      <span className="text-xs font-medium text-slate-500">
        ({resenas.length})
      </span>
    </div>
  );
};

export default CalificacionProducto;