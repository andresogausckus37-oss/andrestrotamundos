const obtenerDispositivo = (userAgent = "") => {
  if (
    /android|iphone|ipad|ipod|mobile/i.test(
      userAgent
    )
  ) {
    return "Móvil";
  }

  return "Computadora";
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const token =
      process.env.TELEGRAM_VISITAS_BOT_TOKEN;

    const chatId =
      process.env.TELEGRAM_VISITAS_CHAT_ID;

    if (!token || !chatId) {
      throw new Error(
        "Falta configuración de Telegram para visitas"
      );
    }

    const pagina =
      req.body?.pagina || "Desconocida";

    const ruta =
      req.body?.ruta || "/";

    /* DISPOSITIVO */

    const dispositivo =
      obtenerDispositivo(
        req.headers["user-agent"] || ""
      );

    /* PAÍS
       Vercel agrega este header automáticamente.
    */

    const codigoPais =
      req.headers["x-vercel-ip-country"];

    let pais = codigoPais || "Desconocido";

    try {
      if (codigoPais) {
        const nombresPaises =
          new Intl.DisplayNames(
            ["es"],
            {
              type: "region",
            }
          );

        pais =
          nombresPaises.of(codigoPais) ||
          codigoPais;
      }
    } catch {
      pais = codigoPais || "Desconocido";
    }

    /* HORA ARGENTINA */

    const hora =
      new Intl.DateTimeFormat(
        "es-AR",
        {
          timeZone:
            "America/Argentina/Buenos_Aires",

          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }
      ).format(new Date());

    /* TELEGRAM */

    const texto =
      `👤 <b>Nueva visita a la web</b>\n\n` +
      `<b>Página:</b> ${pagina}\n` +
      `<b>Hora:</b> ${hora}\n` +
      `<b>Dispositivo:</b> ${dispositivo}\n` +
      `<b>País:</b> ${pais}\n\n` +
      `<code>${ruta}</code>`;

    const respuestaTelegram =
      await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            chat_id: chatId,
            text: texto,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        }
      );

    if (!respuestaTelegram.ok) {
      const detalle =
        await respuestaTelegram.text();

      console.error(
        "Error Telegram visitas:",
        detalle
      );

      throw new Error(
        "Telegram rechazó la notificación"
      );
    }

    return res.status(200).json({
      enviado: true,
    });
  } catch (error) {
    console.error(
      "Error registrando visita:",
      error
    );

    return res.status(500).json({
      error:
        "No se pudo registrar la visita.",
    });
  }
}