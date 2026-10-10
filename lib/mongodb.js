import { MongoClient } from "mongodb";

export async function conectarMongoDB(uriRecibida = null) {
  const uri =
    uriRecibida ||
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Falta configurar la variable de entorno MONGODB_URI"
    );
  }

  const cliente = new MongoClient(uri);

  await cliente.connect();

  return cliente.db("andres_imprimibles");
}

export default async function obtenerClienteMongoDB(
  uriRecibida = null
) {
  const uri =
    uriRecibida ||
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Falta configurar la variable de entorno MONGODB_URI"
    );
  }

  const cliente = new MongoClient(uri);

  await cliente.connect();

  return cliente;
}