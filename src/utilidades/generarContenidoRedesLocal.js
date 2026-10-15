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
  const portada = texto(recursos.portadaFacebook);

  if (!/^https:\/\//i.test(portada)) {
    throw new Error(
      `Falta la imagen principal Facebook/Threads de ${nombre}.`
    );
  }
  
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

const esStoryFacebook =
  p.red === "facebook" && p.tipo === "story_pagina";

    // Copy breve y 2 emojis separados para Threads Post.
    const copyBaseThreads = descripcion
      .replace(/https?:\/\/\S+/gi, "")
      .replace(/#[\p{L}\p{N}_]+/gu, "")
      .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
    const maximoThreads = 195;
    // Preferimos frases completas antes que terminar un copy en mitad de una idea.
    const frasesThreads = copyBaseThreads.match(/[^.!?]+[.!?]?/g) || [];
    let copyCortoThreads = "";
    for (const frase of frasesThreads) {
      const candidata = [copyCortoThreads, frase.trim()].filter(Boolean).join(" ");
      if (Array.from(candidata).length > maximoThreads) break;
      copyCortoThreads = candidata;
    }
    if (!copyCortoThreads) {
      copyCortoThreads = Array.from(copyBaseThreads)
        .slice(0, maximoThreads - 1).join("")
        .replace(/\s+\S*$/, "").trim() + "…";
    }

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


          const esThreadsPost =
            p.red === "threads" && p.tipo === "post";

          const esGrupoPost =
            p.red === "facebook" &&
            p.tipo === "grupo" &&
            p.variante === "post";

          const copy = esStoryFacebook
            ? ""
            : esGrupoPost
              ? descripcion
            : esEstadoWhatsapp
              ? `${emoji} ${copyEstado}`
              : esReel
                ? descripcion
                : esThreadsPost
                  ? `💡 ${copyCortoThreads} ✨`
                  : esThreadsTip
      
      ? `${emoji} ¿Sabías qué? ${nombre}: ${descripcion}`
      : esGrupoTip
        ? `${emoji} Un detalle para tener en cuenta sobre ${nombre}: ${detalleAlternativo}`
        : p.tipo === "reel"
          ? `${emoji} Descubrí ${nombre}. ${descripcion}`
          : p.tipo?.includes("story") || p.tipo?.includes("estado")
            ? `${emoji} ${nombre}. ¡Conocé sus características!`
            : `${emoji} ${nombre}. ${descripcion}`;


    const cta = esStoryFacebook
    ? ""
    : esEstadoWhatsapp || esThreadsPost
      ? "¡Encontralo en nuestra tienda!"
      : p.red === "instagram"
        ? "Descubrí más sobre este producto en el enlace de nuestra bio."
        : p.red === "whatsapp"
          ? "Consultanos para conocer más detalles."
          : url
            ? "Conocé todos los detalles y conseguí el tuyo en nuestra tienda online:"
            : "Consultanos para conocer más detalles.";

    const hashtags =
      p.red === "whatsapp" || esStoryFacebook ? [] : hashtagsBase;

    const recurso =
      esGrupoPost || esEstadoWhatsapp ? "" :
      p.recurso === "video" ? video :
      p.recurso === "imagenesFeed" ? feed :
      p.recurso === "imagenVertical" ? vertical[0] :
      p.recurso === "portadaFacebook" ? portada :
      principal;

    const imagenes =
      esGrupoPost || esEstadoWhatsapp ? [] :
      esStoryFacebook
        ? [vertical[0]]
        : p.recurso === "imagenesFeed"
          ? feed
          : p.recurso === "video"
            ? []
            : [recurso];
    
    const urlProducto = p.red === "instagram" || esStoryFacebook ? "" : url;
    if (esStoryFacebook && !/^https:\/\//i.test(vertical[0])) {
      throw new Error(`Facebook Story necesita una imagen vertical HTTPS: ${nombre}`);
    }
    if (esEstadoWhatsapp && !/^https:\/\//i.test(urlProducto)) {
      throw new Error(`WhatsApp Estado necesita una URL pública del producto: ${nombre}`);
    }
    return {
      id: `${p.dia}-${p.red}-${p.tipo}-${p.variante || p.i}`,
      dia: p.dia, red: p.red, tipo: p.tipo, variante: p.variante || null, hora: p.hora,
      publicacionAutomatica: Boolean(p.publicacionAutomatica), requiereConfirmacionManual: !p.publicacionAutomatica,
      formato: p.recurso, recurso, recursos: p.recurso === "video" ? [video] : imagenes,
      imagen: imagenes[0] || "", imagenes,
      imagenPrincipal: principal, imagenesFeed: feed, imagenesVerticales: vertical,
      video: p.recurso === "video" ? video : "", videoUrl: p.recurso === "video" ? video : "",
      vistaPreviaEnlace: Boolean(p.vistaPreviaEnlace),
      // La composición de la imagen con el CTA se realizará en el backend.
      // Hasta entonces "imagen" sigue siendo la imagen vertical original.
      ctaVisual: esStoryFacebook,
      textoStory: esStoryFacebook
        ? {
            linea1: "¡Encontralo en nuestra tienda!",
            linea2: "Visitá nuestra página",
          }
        : null,
      imagenOriginal: esStoryFacebook ? vertical[0] : null,
      texto: copy, copy, cta, hashtags, urlProducto,
      // En WhatsApp solo enviamos texto+URL: la portada la obtiene WhatsApp
      // automáticamente de las etiquetas OG de la página del producto.
      textoCompleto: esStoryFacebook
        ? ""
        : (esEstadoWhatsapp
            ? [copy, cta, urlProducto]
            : [copy, cta, urlProducto, hashtags.join(" ")]
          ).filter(Boolean).join("\n\n"),
    };
  });
  
  if (calendario.length !== 10) throw new Error("El calendario debe contener exactamente 10 publicaciones.");
  
  return {
    productoId: producto.id, nombreProducto: nombre, generador: "local", calendario,
    // Compatibilidad temporal con consumidores anteriores del panel Admin.
    instagram: { reel: calendario.find(p => p.red === "instagram" && p.tipo === "reel"), carrusel: calendario.find(p => p.red === "instagram" && p.tipo === "carrusel"), stories: [] },
    threads: calendario.filter(p => p.red === "threads"),
    facebook: { publicaciones: calendario.filter(p => p.red === "facebook") },
  };
}
