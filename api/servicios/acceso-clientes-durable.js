// Fase 8: autenticación OTP a través de un Durable Object.
// Comparte la misma base MongoDB; no guarda datos de clientes en SQLite.
// Acceso únicamente mediante el binding interno del Worker.
import { DurableObject } from "cloudflare:workers";
import { ejecutarAccesoClientes } from "./clientes-acceso.js";

export class AccesoClientesDurable extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.mongo = null;
  }

  async abrirDB() {
    if (!this.mongo) {
      // La importación se retrasa hasta la primera solicitud al Object.
      // Esto evita cargar el controlador MongoDB al iniciar el Worker general.
      const { MongoClient } = await import("mongodb");
      this.mongo = new MongoClient(this.env.MONGODB_URI, {
        maxPoolSize: 1,
        minPoolSize: 0,
        serverSelectionTimeoutMS: 5000,
        maxIdleTimeMS: 20000,
      });
    }
    try {
      // En el mismo Object, connect() reutiliza el cliente ya conectado.
      await this.mongo.connect();
      return this.mongo.db("andres_imprimibles");
    } catch (error) {
      const viejo = this.mongo;
      this.mongo = null;
      if (viejo) await viejo.close().catch(() => {});
      throw error;
    }
  }

  async fetch(request) {
    const path = new URL(request.url).pathname;
    if (!path.startsWith("/api/servicios/clientes/acceso/")) {
      return Response.json({ ok: false, error: "Ruta no encontrada." }, { status: 404 });
    }
    try {
      const db = await this.abrirDB();
      const ip = request.headers.get("x-servicio-ip-verificada")?.trim() || "";
      return await ejecutarAccesoClientes(request, this.env, db, ip);
    } catch (error) {
      // No registrar correos, OTP, cookies ni URI de MongoDB.
      console.warn("Fase 8: error interno de autenticación", {
        tipo: String(error?.name || "Error").slice(0, 80),
        codigo: Number.isInteger(error?.code) ? error.code : null,
      });
      return Response.json({ ok: false, error: "Servicio de acceso temporalmente no disponible." }, {
        status: 503, headers: { "Cache-Control": "no-store" },
      });
    }
  }
}
