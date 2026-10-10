export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({
      ok: false,
      error: "Método no permitido",
    });
  }

  return res.status(503).json({
    ok: false,
    disponible: false,
    metodoPago: "transferencia",
    error:
      "Las transferencias bancarias están temporalmente deshabilitadas.",
  });
}