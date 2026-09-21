export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    console.log(
      "Webhook Mercado Pago recibido:",
      JSON.stringify({
        query: req.query,
        body: req.body,
        xSignature: req.headers["x-signature"],
        xRequestId: req.headers["x-request-id"],
      })
    );

    return res.status(200).json({
      recibido: true,
    });
  } catch (error) {
    console.error(
      "Error webhook Mercado Pago:",
      error
    );

    return res.status(500).json({
      error: "Error procesando webhook",
    });
  }
}