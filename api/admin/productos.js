import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

let cliente;
let clientePromise;

if (!global._mongoProductosPromise) {
  cliente = new MongoClient(uri);
  global._mongoProductosPromise = cliente.connect();
}

clientePromise = global._mongoProductosPromise;

export default async function handler(req, res) {
  try {
    const mongo = await clientePromise;
    const db = mongo.db();

    const productos = db.collection("productos");

    /* =========================================
       OBTENER PRODUCTOS
    ========================================= */

    if (req.method === "GET") {
      const lista = await productos
        .find({})
        .sort({ creadoEn: -1 })
        .toArray();

      return res.status(200).json({
        ok: true,
        productos: lista,
      });
    }

    /* =========================================
       CREAR PRODUCTO
    ========================================= */

    if (req.method === "POST") {
      const producto = req.body;

      if (!producto?.id) {
        return res.status(400).json({
          error: "Falta el ID del producto.",
        });
      }

      if (!producto?.nombre) {
        return res.status(400).json({
          error: "Falta el nombre del producto.",
        });
      }

      const existente = await productos.findOne({
        id: producto.id,
      });

      if (existente) {
        return res.status(409).json({
          error: "Ya existe un producto con ese ID.",
        });
      }

      const nuevoProducto = {
        ...producto,

        creadoEn: new Date(),
        actualizadoEn: new Date(),
      };

      const resultado =
        await productos.insertOne(nuevoProducto);

      return res.status(201).json({
        ok: true,
        mensaje: "Producto guardado correctamente.",
        productoId: resultado.insertedId,
      });
    }

    return res.status(405).json({
      error: "Método no permitido.",
    });
  } catch (error) {
    console.error(
      "Error en productos:",
      error
    );

    return res.status(500).json({
      error: "Error interno al gestionar productos.",
    });
  }
}