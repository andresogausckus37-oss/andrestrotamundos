import { conectarMongoDB } from "../../lib/mongodb.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const suscripcion = req.body;

    if (
      !suscripcion?.endpoint ||
      !suscripcion?.keys?.p256dh ||
      !suscripcion?.keys?.auth
    ) {
      return res.status(400).json({
        error: "Suscripción no válida.",
      });
    }

    const db = await conectarMongoDB();

    await db
      .collection("suscripciones_push")
      .updateOne(
        {
          endpoint: suscripcion.endpoint,
        },
        {
          $set: {
            suscripcion,
            actualizadaEn: new Date(),
          },
          $setOnInsert: {
            creadaEn: new Date(),
          },
        },
        {
          upsert: true,
        }
      );

    return res.status(200).json({
      suscrito: true,
    });
  } catch (error) {
    console.error(
      "Error registrando Push:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo registrar el dispositivo.",
    });
  }
}