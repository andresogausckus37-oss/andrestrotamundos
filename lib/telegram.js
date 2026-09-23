export async function enviarNotificacionTelegram({
  texto,
  botonTexto,
  botonUrl,
}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error(
      "Faltan TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID"
    );

    return false;
  }

  try {
    const body = {
      chat_id: chatId,
      text: texto,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    if (botonTexto && botonUrl) {
      body.reply_markup = {
        inline_keyboard: [
          [
            {
              text: botonTexto,
              url: botonUrl,
            },
          ],
        ],
      };
    }

    const respuesta = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    if (!respuesta.ok) {
      const error = await respuesta.text();

      console.error(
        "Error enviando Telegram:",
        error
      );

      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Error enviando Telegram:",
      error
    );

    return false;
  }
}