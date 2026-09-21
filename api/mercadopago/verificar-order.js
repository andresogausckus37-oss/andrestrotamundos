export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const accessToken =
      process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!accessToken) {
      throw new Error(
        "Falta MERCADOPAGO_ACCESS_TOKEN"
      );
    }

    const { orderId } = req.query;

    if (!orderId) {
      return res.status(400).json({
        error: "Falta orderId",
      });
    }

    const respuesta = await fetch(
      `https://api.mercadopago.com/v1/orders/${encodeURIComponent(
        orderId
      )}`,
      {
        headers: {
          Authorization:
            `Bearer ${accessToken}`,
        },
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      console.error(
        "Error verificando Order:",
        JSON.stringify(datos, null, 2)
      );

      return res.status(respuesta.status).json({
        error:
          "No se pudo verificar la Order.",
      });
    }

    return res.status(200).json({
      id: datos.id,
      status: datos.status,
      statusDetail: datos.status_detail,
      externalReference:
        datos.external_reference,
      totalAmount: datos.total_amount,
      transactions: datos.transactions,
    });
  } catch (error) {
    console.error(
      "Error verificando Order:",
      error
    );

    return res.status(500).json({
      error:
        "Error interno verificando la Order.",
    });
  }
}