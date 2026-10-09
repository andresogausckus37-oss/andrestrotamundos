import { MongoClient } from "mongodb";

let cliente = null;
let promesaCliente = null;
let uriActual = null;

export async function conectarMongoDB(uriRecibida = null) {
  const uri =
    uriRecibida ||
    process.env.MONGODB_URI;

  if (!uri) {
    throw new Error(
      "Falta configurar la variable de entorno MONGODB_URI"
    );
  }

  if (
    !promesaCliente ||
    uriActual !== uri
  ) {
    uriActual = uri;

    cliente = new MongoClient(uri);

    promesaCliente =
      cliente.connect();
  }

  const clienteConectado =
    await promesaCliente;

  return clienteConectado.db(
    "andres_imprimibles"
  );
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

  if (
    !promesaCliente ||
    uriActual !== uri
  ) {
    uriActual = uri;
    cliente = new MongoClient(uri);
    promesaCliente =
      cliente.connect();
  }

  return promesaCliente;
}