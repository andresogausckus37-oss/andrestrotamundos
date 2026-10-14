import { CICLO_PRODUCTO } from "../datos/plantillasRedes";
import { prepararProductoRedes } from "./prepararProductoRedes";

const texto = (v) => typeof v === "string" ? v.trim() : "";
const lista = (v) => Array.isArray(v) ? v.map(texto).filter(Boolean) : [];
const urlPublica = (v) => /^https?:\/\//i.test(texto(v)) ? texto(v) : "";
const sinEtiquetas = (v) => texto(v).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

function etiquetas(producto) {
  const palabrasExcluidas = new Set([
    "para", "con", "sin", "del", "las", "los",
    "una", "uno", "por", "tipo", "color",
    "nuevo", "producto", "incluye", "ideal",
    "soporte", "unidad"
  ]);

  const palabras = `${producto.nombre || ""} ${producto.categoria || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(p =>
      p.length >= 4 &&
      !palabrasExcluidas.has(p.toLowerCase())
    );

  const hashtags = [
    ...new Set(
      palabras.map(p => `#${p}`)
    )
  ];

  const adicionales = [
    "#TiendaOnline",
    "#CompraOnline",
    "#Novedades",
    "#CatalogoOnline",
    "#Productos"
  ];

  return [...new Set([...hashtags, ...adicionales])].slice(0, 5);
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
  
  if (!/^https:\/\//i.test(video)) {
    throw new Error(`El video MP4 de ${nombre} necesita una URL pública HTTPS.`);
  }
  if (feed.length !== 3) throw new Error(`Se requieren tres imágenes 4:5 para ${nombre}.`);
  if (vertical.length !== 3) {
    throw new Error(`Se requieren tres imágenes 9:16 para ${nombre}.`);
  }
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
    
    const emojis = {
      instagram: "✨",
      facebook: "🛍️",
      threads: "💡",
      whatsapp: "📲",
    };

    const emoji = emojis[p.red] || "✨";


    const esReel =
      (p.red === "instagram" && p.tipo === "reel") ||
      (p.red === "facebook" && p.tipo === "reel_pagina");

    const esEstadoWhatsapp =
      p.red === "whatsapp" && p.tipo === "estado";

    let copyEstado = descripcion
      .replace(/^[^\p{L}\p{N}]+/u, "")
      .trim();

    if (
      nombre &&
      copyEstado.toLowerCase().startsWith(nombre.toLowerCase())
    ) {
      copyEstado = copyEstado
        .slice(nombre.length)
        .replace(/^[\s.,:;–-]+/, "")
        .trim();
    }

    if (copyEstado.length > 130) {
      copyEstado =
        copyEstado
          .slice(0, 130)
          .replace(/\s+\S*$/, "")
          .trim() + "…";
    }

    
      const copy = esEstadoWhatsapp
      ? `${emoji} ${copyEstado}`
      : esReel
        ? descripcion
        : esThreadsTip
      
      ? `${emoji} ¿Sabías qué? ${nombre}: ${descripcion}`
      : esGrupoTip
        ? `${emoji} Un detalle para tener en cuenta sobre ${nombre}: ${detalleAlternativo}`
        : p.tipo === "reel"
          ? `${emoji} Descubrí ${nombre}. ${descripcion}`
          : p.tipo?.includes("story") || p.tipo?.includes("estado")
            ? `${emoji} ${nombre}. ¡Conocé sus características!`
            : `${emoji} ${nombre}. ${descripcion}`;

    const cta = esEstadoWhatsapp
    ? "¡Encontralo en nuestra tienda!"
    : p.red === "instagram"
      ? "Descubrí más sobre este producto en el enlace de nuestra bio."
      : p.red === "whatsapp"
        ? "Consultanos para conocer más detalles."
        : url
          ? "Conocé todos los detalles y conseguí el tuyo en nuestra tienda online:"
          : "Consultanos para conocer más detalles.";
    
    const hashtags = p.red === "whatsapp" ? [] : hashtagsBase;
    
    const recurso =
  esEstadoWhatsapp ? "" :
  p.recurso === "video" ? video :
  p.recurso === "imagenesFeed" ? feed :
  p.recurso === "imagenVertical" ? vertical[0] :
  p.recurso === "portadaFacebook" ? portada :
  principal;
    
    const imagenes =
  esEstadoWhatsapp ? [] :
  p.red === "facebook" && p.tipo === "story_pagina"
    ? [vertical[0]]
    : p.recurso === "imagenesFeed"
      ? feed
      : p.recurso === "video"
        ? []
        : [recurso];
    
    const urlProducto =
  p.red === "instagram" || esReel ? "" : url;
    return {
      id: `${p.dia}-${p.red}-${p.tipo}-${p.variante || p.i}`,
      dia: p.dia, red: p.red, tipo: p.tipo, variante: p.variante || null, hora: p.hora,
      publicacionAutomatica: Boolean(p.publicacionAutomatica), requiereConfirmacionManual: !p.publicacionAutomatica,
      formato: p.recurso, recurso, recursos: p.recurso === "video" ? [video] : imagenes,
      imagen: imagenes[0] || "", imagenes,
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
