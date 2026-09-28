import { prepararProductoRedes } from "./prepararProductoRedes";
import { PROMPT_MAESTRO_REDES } from "../datos/promptMaestroRedes";

export function crearPromptRedes(producto) {
  const productoPreparado = prepararProductoRedes(producto);

  return `
${PROMPT_MAESTRO_REDES}

DATOS DEL PRODUCTO

${JSON.stringify(productoPreparado, null, 2)}

INSTRUCCIÓN FINAL

Generá todo el contenido solicitado utilizando únicamente
los datos anteriores.

Recordá:
- No inventar información.
- Adaptar cada copy a su red social.
- Evitar repetir los mismos textos.
- Utilizar pocos emojis relevantes.
- Responder únicamente con JSON válido.
`;
}