import { CICLO_PRODUCTO } from "../datos/plantillasRedes";
import { prepararProductoRedes } from "./prepararProductoRedes";

const texto = (v) => typeof v === "string" ? v.trim() : "";
const lista = (v) => Array.isArray(v) ? v.map(texto).filter(Boolean) : [];
const urlPublica = (v) => /^https?:\/\//i.test(texto(v)) ? texto(v) : "";
const sinEtiquetas = (v) => texto(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function etiquetas(producto) {
  const palabras = `${producto.nombre || ""} ${producto.categoria || ""}`
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/).filter(p => p.length >= 4);
  return [...new Set([...palabras.map(p => `#${p}`), "#TiendaOnline", "#Productos", "#Novedades", "#CompraOnline", "#CatalogoOnline"])].slice(0, 5);
}

function datoConfiable(producto) {
  return [...lista(producto.beneficios), ...lista(producto.incluye), sinEtiquetas(producto.descripcion), sinEtiquetas(producto.descripcionLarga)]
    .filter(Boolean);
}

export function generarContenidoRedesLocal(original) {
  const producto = prepararProductoRedes(original);
  const nombre = texto(producto.nombre);
  const url = [producto.urlProducto, original?.urlProducto, original?.urls?.producto, original?.url, original?.enlace]
    .map(urlPublica).find(Boolean) || "";
  const recursos = producto.recursosRedes || {};
  const video = texto(recursos.video || producto.videoMP4 || producto.videoReel);
  const feed = lista(recursos.imagenesFeed).slice(0, 3);
  const vertical = lista(recursos.imagenesVerticales).slice(0, 3);
  const principal = feed[0] || "";
  const portada = texto(recursos.portadaFacebook) || principal;
  if (!nombre) throw new Error("El producto no tiene nombre.");
  if (!url) throw new Error(`Falta la URL pública de tienda para ${nombre}.`);
  if (!video) throw new Error(`Falta el video MP4 para ${nombre}.`);
  if (feed.length !== 3) throw new Error(`Se requieren tres imágenes 4:5 para ${nombre}.`);
  const datos = datoConfiable(producto);
  const descripcion = datos[0] || `Conocé ${nombre} y sus características en la tienda.`;
  const detalleAlternativo = datos.find(d => d !== descripcion) || `Consultá las características y condiciones de ${nombre} en la tienda.`;
  const hashtagsBase = etiquetas(producto);
  const plantilla = [
    ...CICLO_PRODUCTO.dia1.publicaciones.map((p, i) => ({ ...p, dia: "dia1", i })),
    ...CICLO_PRODUCTO.dia2.publicaciones.map((p, i) => ({ ...p, dia: "dia2", i })),
  ];
  const calendario = plantilla.map(p => {
    const esThreadsTip = p.red === "threads" && p.tipo === "sabias_que";
    const esGrupoTip = p.red === "facebook" && p.variante === "sabias_que";
    const copy = esThreadsTip
      ? `¿Sabías qué? ${nombre}: ${descripcion}`
      : esGrupoTip
        ? `Un detalle para tener en cuenta sobre ${nombre}: ${detalleAlternativo}`
        : `${nombre}. ${descripcion}`;
    const cta = p.red === "instagram" ? "Más información en el link de la bio." : "Conocé el producto en nuestra tienda.";
    const hashtags = p.red === "whatsapp" ? [] : hashtagsBase;
    const recurso = p.recurso === "video" ? video : p.recurso === "imagenesFeed" ? feed : p.recurso === "portadaFacebook" ? portada : principal;
    const imagenes = p.recurso === "imagenesFeed" ? feed : p.recurso === "video" ? [] : [recurso];
    const urlProducto = p.red === "instagram" ? "" : url;
    return {
      id: `${p.dia}-${p.red}-${p.tipo}-${p.variante || p.i}`,
      dia: p.dia, red: p.red, tipo: p.tipo, variante: p.variante || null, hora: p.hora,
      publicacionAutomatica: Boolean(p.publicacionAutomatica), requiereConfirmacionManual: !p.publicacionAutomatica,
      formato: p.recurso, recurso, recursos: p.recurso === "video" ? [video] : imagenes,
      imagen: p.recurso === "video" ? "" : imagenes[0], imagenes,
      imagenPrincipal: principal, imagenesFeed: feed, imagenesVerticales: vertical,
      video: p.recurso === "video" ? video : "", videoUrl: p.recurso === "video" ? video : "",
      vistaPreviaEnlace: Boolean(p.vistaPreviaEnlace),
      texto: copy, copy, cta, hashtags, urlProducto,
      textoCompleto: [copy, cta, urlProducto, hashtags.join(" ")].filter(Boolean).join("\n\n"),
    };
  });
  if (calendario.length !== 13) throw new Error("El calendario debe contener exactamente 13 publicaciones.");
  return {
    productoId: producto.id, nombreProducto: nombre, generador: "local", calendario,
    // Compatibilidad temporal con consumidores anteriores del panel Admin.
    instagram: { reel: calendario.find(p => p.red === "instagram" && p.tipo === "reel"), carrusel: calendario.find(p => p.red === "instagram" && p.tipo === "carrusel"), stories: [] },
    threads: calendario.filter(p => p.red === "threads"),
    facebook: { publicaciones: calendario.filter(p => p.red === "facebook") },
  };
}
