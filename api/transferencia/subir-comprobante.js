export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  return res.status(503).json({
    ok: false,
    error:
      "Las transferencias bancarias están temporalmente deshabilitadas.",
  });
}