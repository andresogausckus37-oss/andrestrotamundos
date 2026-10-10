const obtenerDispositivo = (userAgent = "") => {
  if (/android|iphone|ipad|ipod|mobile/i.test(userAgent)) {
    return "Móvil";
  }

  return "Computadora";
};

const escaparHtml = (valor = "") =>
  String(valor)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");

const obtenerCodigoPais = (req) =>
  String(
    req.headers?.["cf-ipcountry"] ||
      req.headers?.["x-vercel-ip-country"] ||
      ""
  )
    .trim()
    .toUpperCase();

const obtenerNombrePais = (codigoPais) => {
  if (!codigoPais) return "Desconocido";

  try {
    const nombresPaises = new Intl.DisplayNames(["es"], {
      type: "region",
    });

    return nombresPaises.of(codigoPais) || codigoPais;
  } catch {
    return codigoPais;
  }
};

const obtenerHoraArgentina = () =>
  new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());

export default async function handler(req, res) {
  /* =====================================================
     DETECTAR MERCADO
  ===================================================== */

  if (
    req.method === "GET" &&
    req.query?.accion === "mercado"
  ) {
    const codigoPais = obtenerCodigoPais(req);

    const mercado =
      codigoPais === "AR" ? "AR" : "INTERNACIONAL";

    const moneda =
      mercado === "AR" ? "ARS" : "USD";

    return res.status(200).json({
      pais: codigoPais || null,
      mercado,
      moneda,
    });
  }

  /* =====================================================
     REGISTRAR VISITA
  ===================================================== */

  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  try {
    const token =
      process.env.TELEGRAM_VISITAS_BOT_TOKEN;

    const chatId =
      process.env.TELEGRAM_VISITAS_CHAT_ID;

    if (!token || !chatId) {
      console.error(
        "Faltan TELEGRAM_VISITAS_BOT_TOKEN o TELEGRAM_VISITAS_CHAT_ID."
      );

      return res.status(503).json({
        ok: false,
        error:
          "Las notificaciones de visitas no están configuradas.",
      });
    }

    const pagina = String(
      req.body?.pagina || "Desconocida"
    ).slice(0, 200);

    const ruta = String(
      req.body?.ruta || "/"
    ).slice(0, 500);

    const userAgent =
      req.headers?.["user-agent"] || "";

    const dispositivo =
      obtenerDispositivo(userAgent);

    const codigoPais =
      obtenerCodigoPais(req);

    const pais =
      obtenerNombrePais(codigoPais);

    const hora =
      obtenerHoraArgentina();

    const texto =
      `👤 <b>Nueva visita a la web</b>\n\n` +
      `<b>Página:</b> ${escaparHtml(pagina)}\n` +
      `<b>Hora:</b> ${escaparHtml(hora)}\n` +
      `<b>Dispositivo:</b> ${escaparHtml(dispositivo)}\n` +
      `<b>País:</b> ${escaparHtml(pais)}\n\n` +
      `<code>${escaparHtml(ruta)}</code>`;

    const respuestaTelegram = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
        respuestaTelegram.status,
        detalle
      );

      return res.status(502).json({
        ok: false,
        error:
          "Telegram rechazó la notificación de visita.",
      });
    }

    return res.status(200).json({
      ok: true,
      enviado: true,
    });
  } catch (error) {
    console.error(
      "Error registrando visita:",
      error
    );

    return res.status(500).json({
      ok: false,
      error:
        "No se pudo registrar la visita.",
    });
  }
}
