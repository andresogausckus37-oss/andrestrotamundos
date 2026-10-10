const escaparHtml = (texto = "") => {
  return String(texto)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);

export const enviarEmailCompra = async ({
  pedidoId,
  email,
  nombreComprador = "",
  productos = [],
  total = null,
}) => {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Falta RESEND_API_KEY.");
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
     PRODUCTOS DEL PEDIDO
  ===================================================== */

  const productosHtml = productos
    .map((producto) => {
      const nombre =
        producto.nombre ||
        producto.nombreProducto ||
        "Producto";

      const cantidad =
        Math.max(
          1,
          Number(producto.cantidad) || 1
        );

      const variante =
        producto.variante ||
        producto.talle ||
        "";

      const precio =
        producto.precioARS ??
        producto.precio ??
        null;

      return `
        <div style="
          margin-bottom:12px;
          padding:16px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          border-radius:8px;
        ">
          <p style="
            margin:0;
            font-size:14px;
            line-height:1.5;
            font-weight:600;
            color:#0f172a;
          ">
            ${escaparHtml(nombre)}
          </p>

          ${
            variante
              ? `
                <p style="
                  margin:6px 0 0;
                  font-size:13px;
                  color:#64748b;
                ">
                  Variante:
                  ${escaparHtml(variante)}
                </p>
              `
              : ""
          }

          <p style="
            margin:6px 0 0;
            font-size:13px;
            color:#64748b;
          ">
            Cantidad: ${cantidad}
          </p>

          ${
            precio !== null
              ? `
                <p style="
                  margin:6px 0 0;
                  font-size:13px;
                  color:#64748b;
                ">
                  Precio:
                  ${escaparHtml(
                    formatearPesos(precio)
                  )}
                </p>
              `
              : ""
          }
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
        Authorization: `Bearer ${apiKey}`,

        "Content-Type":
          "application/json",

        "Idempotency-Key":
          `pedido-iniciado-${pedidoId}`,
      },

      body: JSON.stringify({
        from:
          "Andrés House Sitter <compras@andreshousesitter.com>",

        to: [email],

        subject:
          "Recibimos tu pedido",

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
                    font-weight:600;
                    color:#0f172a;
                  ">
                    Pedido recibido
                  </h1>

                  <p style="
                    margin:0 0 22px;
                    font-size:15px;
                    line-height:1.6;
                    color:#475569;
                  ">
                    ${
                      nombreComprador
                        ? `Hola ${escaparHtml(
                            nombreComprador
                          )}. `
                        : ""
                    }
                    Recibimos tu pedido correctamente.
                    Te mantendremos informado por
                    correo electrónico sobre los
                    próximos avances.
                  </p>

                  <div style="
                    margin-bottom:22px;
                    padding:14px 16px;
                    background:#f1f5f9;
                    border-radius:8px;
                  ">
                    <p style="
                      margin:0;
                      font-size:12px;
                      color:#64748b;
                    ">
                      NÚMERO DE PEDIDO
                    </p>

                    <p style="
                      margin:5px 0 0;
                      font-size:15px;
                      font-weight:600;
                      color:#0f172a;
                    ">
                      ${escaparHtml(pedidoId)}
                    </p>
                  </div>

                  <h2 style="
                    margin:0 0 12px;
                    font-size:16px;
                    font-weight:600;
                    color:#0f172a;
                  ">
                    Tu pedido
                  </h2>

                  ${productosHtml}

                  ${
                    total !== null
                      ? `
                        <div style="
                          margin-top:18px;
                          padding-top:18px;
                          border-top:1px solid #e2e8f0;
                        ">
                          <p style="
                            margin:0;
                            text-align:right;
                            font-size:16px;
                            font-weight:600;
                            color:#0f172a;
                          ">
                            Total:
                            ${escaparHtml(
                              formatearPesos(total)
                            )}
                          </p>
                        </div>
                      `
                      : ""
                  }

                  <div style="
                    margin-top:24px;
                    padding:16px;
                    background:#f8fafc;
                    border-radius:8px;
                  ">
                    <p style="
                      margin:0;
                      font-size:14px;
                      line-height:1.6;
                      color:#475569;
                    ">
                      Una vez confirmado el pago,
                      comenzaremos a preparar tu
                      pedido para el envío.
                    </p>
                  </div>

                  <p style="
                    margin:22px 0 0;
                    font-size:12px;
                    line-height:1.6;
                    color:#64748b;
                  ">
                    Conservá este correo como
                    referencia de tu pedido.
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

  let datos = {};

  try {
    datos = await respuesta.json();
  } catch {
    datos = {};
  }

  if (!respuesta.ok) {
    console.error(
      "Error Resend:",
      respuesta.status,
      datos
    );

    throw new Error(
      "No se pudo enviar el email del pedido."
    );
  }

  return datos;
};