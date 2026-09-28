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
  } catch (error) {
    console.error("Error generando contenido:", error);

    return res.status(500).json({
      error:
        error?.message ||
        "No se pudo generar el contenido",
      tipo: error?.name || "Error",
      status: error?.status || null,
    });
  }
}