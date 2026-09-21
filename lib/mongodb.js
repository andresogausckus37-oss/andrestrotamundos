import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "Falta configurar la variable de entorno MONGODB_URI"
  );
}

const opciones = {};

let cliente;
let promesaCliente;

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    cliente = new MongoClient(uri, opciones);
    global._mongoClientPromise = cliente.connect();
  }

  promesaCliente = global._mongoClientPromise;
} else {
  cliente = new MongoClient(uri, opciones);
  promesaCliente = cliente.connect();
}

export async function conectarMongoDB() {
  const clienteConectado = await promesaCliente;

  return clienteConectado.db("andres_imprimibles");
}

export default promesaCliente;