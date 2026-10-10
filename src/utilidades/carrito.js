// Carrito persistente de productos físicos.
import { useSyncExternalStore } from "react";

const CLAVE = "tienda_carrito_v1";
const EVENTO = "tienda:carrito";
const UMBRAL = 40000;
const ENVIO = 8000;
const nombre = (p) => typeof p?.nombre === "string" ? p.nombre : p?.nombre?.es || "Producto";
export const precioProducto = (p) => {
  const normal = Number(p?.precioARS) || 0;
  const oferta = Number(p?.oferta?.precioARS) || 0;
  const fin = p?.ofertaLanzamiento?.finalizaEn;
  return p?.oferta?.activa && oferta > 0 && (!fin || new Date(fin).getTime() > Date.now()) ? oferta : normal;
};
const leer = () => {
  try { const datos = JSON.parse(localStorage.getItem(CLAVE) || "[]"); return Array.isArray(datos) ? datos : []; }
  catch { return []; }
};
let cache = null;
const obtener = () => {
  if (typeof window === "undefined") return [];
  if (!cache) cache = leer();
  return cache;
};
const notificar = () => { cache = leer(); window.dispatchEvent(new Event(EVENTO)); };
const guardar = (items) => { localStorage.setItem(CLAVE, JSON.stringify(items)); notificar(); };
export const claveArticulo = (id, variante = "") => `${String(id)}::${String(variante)}`;
export function agregarAlCarrito(producto, variante = "", cantidad = 1) {
  if (!producto?.id) throw new Error("Producto inválido.");
  const variantes = (producto.detalles?.variantes || []).filter(Boolean);
  if (variantes.length && !variantes.includes(variante)) throw new Error("Seleccioná una variante válida.");
  if (["sin-stock", "proximamente", "pausado"].includes(producto.disponibilidad)) throw new Error("Producto no disponible.");
    const stock = Number(producto.stock);
  const limite = Number.isFinite(stock) && stock >= 0 ? stock : 999;
  const items = obtener().slice();
  const clave = claveArticulo(producto.id, variante);
  const indice = items.findIndex((x) => x.clave === clave);
  const nuevaCantidad = (indice >= 0 ? items[indice].cantidad : 0) + Math.max(1, Math.floor(cantidad));
  const cantidadTotalProducto = items.reduce((s,x) => s + (String(x.productoId) === String(producto.id) && x.clave !== clave ? x.cantidad : 0), 0) + nuevaCantidad;
  if (cantidadTotalProducto > limite) throw new Error("No hay stock suficiente.");
  const articulo = { clave, productoId: producto.id, variante, cantidad: nuevaCantidad, nombre: nombre(producto), precio: precioProducto(producto), imagen: producto.imagenes?.portada || "", stock: limite };
  if (indice >= 0) items[indice] = articulo; else items.push(articulo);
  guardar(items);
}
export function cambiarCantidad(clave, cantidad) {
  const items = obtener().slice();
  const indice = items.findIndex((x) => x.clave === clave);
  if (indice < 0) return;
  if (cantidad <= 0) return eliminarDelCarrito(clave);
  const articulo = items[indice];
  const otras = items.reduce((s,x) => s + (x.productoId === articulo.productoId && x.clave !== clave ? x.cantidad : 0), 0);
  if (cantidad + otras > articulo.stock) return;
  items[indice] = { ...articulo, cantidad: Math.min(999, Math.floor(cantidad)) };
  guardar(items);
}
export const eliminarDelCarrito = (clave) => guardar(obtener().filter((x) => x.clave !== clave));
export const vaciarCarrito = () => guardar([]);
export const resumenCarrito = (items) => {
  const subtotal = items.reduce((s,x) => s + x.precio * x.cantidad, 0);
  const envio = subtotal >= UMBRAL ? 0 : ENVIO;
  return { subtotal, envio, total: subtotal + envio, faltante: Math.max(0, UMBRAL - subtotal), porcentaje: Math.min(100, subtotal / UMBRAL * 100), cantidad: items.reduce((s,x) => s + x.cantidad, 0) };
};
const suscribir = (callback) => { const externo = () => { cache = leer(); callback(); }; window.addEventListener(EVENTO, callback); window.addEventListener("storage", externo); return () => { window.removeEventListener(EVENTO, callback); window.removeEventListener("storage", externo); }; };
const servidor = () => [];
export const useCarrito = () => useSyncExternalStore(suscribir, obtener, servidor);