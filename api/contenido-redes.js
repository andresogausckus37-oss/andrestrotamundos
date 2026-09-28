import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const { prompt } = req.body;

    if (!prompt) {
      return res.status(400).json({
        error: "Falta el prompt",
      });
    }

    const respuesta = await openai.responses.create({
      model: "gpt-5.6-luna",
      input: prompt,
    });

    const texto = respuesta.output_text;

    let contenido;

    try {
      contenido = JSON.parse(texto);
    } catch {
      return res.status(500).json({
        error: "La IA no devolvió JSON válido",
        respuesta: texto,
      });
    }

    return res.status(200).json({
      ok: true,
      contenido,
    });
  } catch (error) {
    console.error("Error generando contenido:", error);

    return res.status(500).json({
      error: "No se pudo generar el contenido",
    });
  }
}