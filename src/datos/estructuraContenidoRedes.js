// Estructura de borradores por producto. El calendario y los recursos
// se definen exclusivamente en plantillasRedes.js.
import { CICLO_PRODUCTO } from "./plantillasRedes";

const crearBorrador = (configuracion, dia, indice) => ({
  id: `${dia}-${configuracion.red}-${configuracion.tipo}-${indice + 1}`,
  dia,
  red: configuracion.red,
  tipo: configuracion.tipo,
  variante: configuracion.variante ?? null,
  hora: configuracion.hora,
  recurso: configuracion.recurso,
  publicacionAutomatica: configuracion.publicacionAutomatica,
  estado: "borrador",
  copy: "",
  cta: "",
  hashtags: [],
  urlProducto: "",
  enlaceEnBio: configuracion.enlaceEnBio === true,
  // Se rellena con URLs de archivos existentes, nunca con recursos generados.
  archivos: [],
  textoParaCopiar: "",
});

export const crearEstructuraContenidoRedes = (productoId) => ({
  productoId,
  publicaciones: [
    ...CICLO_PRODUCTO.dia1.publicaciones.map((p, i) => crearBorrador(p, "dia1", i)),
    ...CICLO_PRODUCTO.dia2.publicaciones.map((p, i) => crearBorrador(p, "dia2", i)),
  ],
});

// La semana completa se obtiene creando esta estructura para tres productos
// diferentes y asignando sus días desde el calendario (lunes a sábado).
