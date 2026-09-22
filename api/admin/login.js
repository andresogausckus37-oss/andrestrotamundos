import crypto from "crypto";

const compararSeguro = (valorA, valorB) => {
  const a = Buffer.from(String(valorA));
  const b = Buffer.from(String(valorB));

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(a, b);
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  try {
    const password = req.body?.password;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return res.status(500).json({
        error: "Administrador no configurado",
      });
    }

    if (
      !password ||
      !compararSeguro(password, adminPassword)
    ) {
      return res.status(401).json({
        error: "Contraseña incorrecta",
      });
    }

    const token = crypto
      .createHmac(
        "sha256",
        adminPassword
      )
      .update("andres-imprimibles-admin")
      .digest("hex");

    res.setHeader(
      "Set-Cookie",
      `admin_token=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800`
    );

    return res.status(200).json({
      autenticado: true,
    });
  } catch (error) {
    console.error(
      "Error iniciando sesión admin:",
      error
    );

    return res.status(500).json({
      error: "Error interno",
    });
  }
}