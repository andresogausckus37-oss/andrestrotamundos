export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Método no permitido",
    });
  }

  const publicKey =
    process.env.VAPID_PUBLIC_KEY;

  if (!publicKey) {
    return res.status(500).json({
      error:
        "VAPID_PUBLIC_KEY no configurada.",
    });
  }

  return res.status(200).json({
    publicKey,
  });
}