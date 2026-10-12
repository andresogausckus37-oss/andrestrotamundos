import { prepararProductoRedes } from "./prepararProductoRedes";
import { PROMPT_MAESTRO_REDES } from "../datos/promptMaestroRedes";
import { CICLO_PRODUCTO } from "../datos/plantillasRedes";

// El prompt usa el mismo calendario que el generador local y el Admin.
export function crearPromptRedes(producto) {
  const datos = prepararProductoRedes(producto);
  const publicaciones = [
    ...CICLO_PRODUCTO.dia1.publicaciones.map((p) => ({ dia: "dia1", ...p })),
    ...CICLO_PRODUCTO.dia2.publicaciones.map((p) => ({ dia: "dia2", ...p })),
  ];

  if (publicaciones.length !== 13) {
    throw new Error(`Calendario inválido: se esperaban 13 publicaciones y hay ${publicaciones.length}`);
  }

  return `${PROMPT_MAESTRO_REDES}

DATOS DEL PRODUCTO (FUENTE ÚNICA DE INFORMACIÓN)
${JSON.stringify(datos, null, 2)}

CALENDARIO EXACTO DEL PRODUCTO (RESPETAR ORDEN Y CAMPOS)
${JSON.stringify(publicaciones, null, 2)}

INSTRUCCIÓN FINAL
Generá exactamente 13 publicaciones en el mismo orden del calendario.
No inventes información, enlaces ni recursos. Usá solamente los recursos existentes.
Diferenciá los textos de cada plataforma y ambos «¿Sabías qué?».
En publicaciones semiautomáticas completá textoParaCopiar con copy, CTA,
URL si existe y hashtags cuando correspondan, listo para pegar en destino.
El campo recurso debe referenciar el MP4 o las imágenes existentes;
no generes imágenes, portadas ni videos nuevos.
Instagram utiliza «Link en bio»; WhatsApp no lleva hashtags.
Respondé únicamente con JSON válido, sin bloques Markdown.`;
}
