const escaparHtml = (texto = "") => {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

export const enviarEmailCompra = async ({
  pedidoId,
  email,
  productos = [],
}) => {
  const apiKey =
    process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Falta RESEND_API_KEY."
    );
  }

  if (!pedidoId || !email) {
    throw new Error(
      "Faltan datos para enviar el email."
    );
  }

  if (
    !Array.isArray(productos) ||
    productos.length === 0
  ) {
    throw new Error(
      "El pedido no contiene productos."
    );
  }

  /* =====================================================
     PRODUCTOS + BOTONES DE DESCARGA
  ===================================================== */

  const productosHtml = productos
    .map((producto) => {
      const productoId =
        producto.productoId;

      const nombre =
        producto.nombre ||
        producto.nombreProducto ||
        "Producto digital";

      if (!productoId) {
        return "";
      }

      const urlDescarga =
        `https://andreshousesitter.com/api/descargas/${encodeURIComponent(
          pedidoId
        )}?productoId=${encodeURIComponent(
          productoId
        )}`;

      return `
        <div style="
          margin-bottom:16px;
          padding:16px;
          background:#f8fafc;
          border-radius:8px;
        ">
          <p style="
            margin:0 0 12px;
            font-size:14px;
            line-height:1.5;
            color:#0f172a;
          ">
            ${escaparHtml(nombre)}
          </p>

          <a
            href="${urlDescarga}"
            style="
              display:block;
              padding:12px 16px;
              background:#285861;
              color:#ffffff;
              text-decoration:none;
              text-align:center;
              border-radius:6px;
              font-size:14px;
              font-weight:500;
            "
          >
            Descargar PDF
          </a>
        </div>
      `;
    })
    .join("");

  /* =====================================================
     ENVIAR EMAIL
  ===================================================== */

  const respuesta = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",

        "Idempotency-Key":
          `compra-${pedidoId}`,
      },

      body: JSON.stringify({
        from:
          "Andrés House Sitter <compras@andreshousesitter.com>",

        to: [email],

        subject:
          "Tu compra está lista para descargar",

        html: `
          <!DOCTYPE html>
          <html>
            <body style="
              margin:0;
              padding:0;
              background:#f8fafc;
              font-family:Arial,sans-serif;
              color:#0f172a;
            ">
              <div style="
                max-width:600px;
                margin:0 auto;
                padding:32px 20px;
              ">

                <div style="
                  background:#ffffff;
                  border:1px solid #e2e8f0;
                  border-radius:10px;
                  padding:28px;
                ">

                  <h1 style="
                    margin:0 0 12px;
                    font-size:24px;
                    font-weight:500;
                  ">
                    ¡Gracias por tu compra!
                  </h1>

                  <p style="
                    margin:0 0 24px;
                    font-size:15px;
                    line-height:1.6;
                    color:#475569;
                  ">
                    Tu pago fue confirmado.
                    Ya podés descargar tu compra
                    digital.
                  </p>

                  ${productosHtml}

                  <p style="
                    margin:22px 0 0;
                    font-size:12px;
                    line-height:1.6;
                    color:#64748b;
                  ">
                    Conservá este correo para
                    acceder a los archivos de tu
                    compra.
                  </p>

                  <p style="
                    margin:10px 0 0;
                    font-size:12px;
                    line-height:1.6;
                    color:#64748b;
                  ">
                    Por seguridad, cada producto
                    puede descargarse una vez.
                  </p>

                </div>

                <p style="
                  margin:18px 0 0;
                  text-align:center;
                  font-size:11px;
                  color:#94a3b8;
                ">
                  Andrés House Sitter
                </p>

              </div>
            </body>
          </html>
        `,
      }),
    }
  );

  const datos =
    await respuesta.json();

  if (!respuesta.ok) {
    console.error(
      "Error Resend:",
      datos
    );

    throw new Error(
      "No se pudo enviar el email de compra."
    );
  }

  return datos;
};