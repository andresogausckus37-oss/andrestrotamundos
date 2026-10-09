import { MongoClient } from "mongodb";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname !== "/api/prueba-mongodb") {
      return env.ASSETS.fetch(request);
    }

    try {
      if (!env.MONGODB_URI) {
        throw new Error("MONGODB_URI no está configurado");
      }

      const cliente = new MongoClient(env.MONGODB_URI);

      await cliente.connect();

      const db = cliente.db("andres_imprimibles");
      await db.command({ ping: 1 });

      await cliente.close();

      return Response.json({
        ok: true,
        mensaje: "Cloudflare conectado correctamente a MongoDB"
      });
    } catch (error) {
      return Response.json(
        {
          ok: false,
          error: error.message
        },
        { status: 500 }
      );
    }
  }
};