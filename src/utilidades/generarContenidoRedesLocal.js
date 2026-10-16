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

// Hashtags específicos del carrusel, sin repetir los del Reel.
export function etiquetasCarrusel(producto, usados = []) {
  const bloqueados = new Set(usados.map(h => h.toLowerCase()));
  const palabrasVacias = new Set([
    "para", "como", "este", "esta", "entre", "sobre", "desde", "hasta",
    "incluye", "cuenta", "ideal", "tiene", "mejora", "mejorar", "todos",
    "todas", "puede", "podes", "hacer", "producto", "productos", "con", "sin",
    "del", "las", "los", "una", "uno", "por", "mas", "que", "sus", "tus"
  ]);
  const tokens = (valor) => texto(valor)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/)
    .filter(p => p.length >= 3 && !/^\d+$/.test(p) && !palabrasVacias.has(p.toLowerCase()));
  const tokensOriginales = (valor) => texto(valor)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/).filter(Boolean);
  const valido = (p) => p.length >= 3 && !/^\d+$/.test(p) &&
    !palabrasVacias.has(p.toLowerCase());
  const pares = (valor) => {
    const arr = tokensOriginales(valor);
    return arr.slice(0, -1).flatMap((p, i) =>
      valido(p) && valido(arr[i + 1])
        ? [`#${p}${arr[i + 1][0].toUpperCase()}${arr[i + 1].slice(1)}`]
        : []
    );
  };
  const detallesTexto = `${producto.categoria || ""} ${producto.descripcion || ""} ${producto.descripcionLarga || ""}`;
  const detalles = tokens(detallesTexto);
  const candidatos = [
    ...pares(producto.nombre), ...pares(detallesTexto),
    ...detalles.map(p => `#${p}`),
    "#DetallesDelProducto", "#GuiaDeCompra", "#CatalogoOnline",
    "#ComprasPorInternet", "#TiendaVirtual", "#NovedadesDeLaTienda",
    "#ExplorarCatalogo", "#ElegirOnline", "#DetallesYUsos",
    "#ProductosDeLaTienda", "#InspiracionDeCompra", "#OpcionesDeCompra",
    "#ConoceLosDetalles", "#DescubriElProducto"
  ];
  const resultado = [];
  for (const candidato of candidatos) {
    if (!/^#[a-zA-Z0-9_]+$/.test(candidato)) continue;
    const clave = candidato.toLowerCase();
    if (bloqueados.has(clave)) continue;
    bloqueados.add(clave);
    resultado.push(candidato);
    if (resultado.length === 5) break;
  }
  return resultado;
}

// Facebook Grupo - enlace: texto breve sin repetir el título mostrado por la tarjeta.
function copyGrupoEnlace(nombre, descripcion) {
  let contenido = sinEtiquetas(descripcion)
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/#[\p{L}\p{N}_]+/gu, "")
    .trim();
  if (nombre) {
    const escapado = nombre.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    contenido = contenido.replace(
      new RegExp(`^[^\\p{L}\\p{N}]*${escapado}\\s*[.:;!?–-]*\\s*`, "iu"),
      ""
    ).trim();
  }
  const oraciones = contenido.match(/[^.!?]+[.!?]?/g)?.map(v => v.trim()).filter(Boolean) || [];
  const elegidas = [];
  for (const oracion of oraciones) {
    const posible = [...elegidas, oracion].join(" ");
    if (posible.length > 230) break;
    elegidas.push(oracion);
  }
  return elegidas.join(" ") || contenido.slice(0, 230).replace(/\s+\S*$/, "").trim();
}

// Cinco hashtags relacionados con el nombre y la descripción; sin etiquetas comerciales genéricas.
function hashtagsGrupoEnlace(producto) {
  const omitir = new Set(["para", "con", "sin", "del", "las", "los", "una", "uno", "por", "que", "desde", "como", "este", "esta", "sobre", "muy", "mas", "y", "de", "el", "la", "un"]);
  const tokens = (valor) => sinEtiquetas(valor).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-zA-Z0-9]+/).filter(p => p.length >= 3 && !omitir.has(p.toLowerCase()));
  const pares = (palabras) => palabras.slice(0, -1).map((p, i) =>
    `#${p}${palabras[i + 1][0].toUpperCase()}${palabras[i + 1].slice(1)}`
  );
  const nombre = tokens(producto.nombre || "");
  const descripcion = tokens(producto.descripcion || producto.descripcionLarga || "");
  const textoDesc = sinEtiquetas(producto.descripcion || producto.descripcionLarga || "").toLowerCase();
  const etiquetasPorUso = [
    ...( /cortar[^.]*cabello|corte de cabello/i.test(textoDesc) ? ["#CorteDeCabello"] : []),
    ...( /barba[^.]*patillas|patillas[^.]*barba/i.test(textoDesc) ? ["#BarbaYPatillas"] : []),
    ...( /iluminaci[oó]n|luces led/i.test(textoDesc) ? ["#IluminacionLED"] : []),
  ];
  const candidatos = [
    ...pares(nombre).slice(0, 2),
    ...pares(descripcion).slice(0, 1),
    ...etiquetasPorUso,
    ...pares(nombre), ...pares(descripcion),
    ...nombre.map(p => `#${p}`), ...descripcion.map(p => `#${p}`),
    ...etiquetas(producto), "#CatalogoOnline", "#Productos"
  ];
  const resultado = [];
  const vistos = new Set();
  for (const candidato of candidatos) {
    if (!/^#[a-zA-Z0-9_]+$/.test(candidato)) continue;
    const clave = candidato.toLowerCase();
    if (vistos.has(clave)) continue;
    vistos.add(clave);
    resultado.push(candidato);
    if (resultado.length === 5) break;
  }
  return resultado;
}

// Facebook Grupos Video: copy breve, basado en datos reales del producto.
// El video ocupa el lugar de la tarjeta con vista previa del enlace.
function copyGrupoVideo(producto, descripcion) {
  const nombre = texto(producto.nombre);
  const fuente = `${nombre} ${sinEtiquetas(descripcion)}`;
  if (/\b(?:dj|fiestas?|audior[ií]tmic[ao]s?|par\s*\d+)\b/i.test(fuente) &&
      /\b(?:luz|luces|iluminaci[oó]n|rgb)\b/i.test(fuente)) {
    return "🎶 ¿Querés sumar color a tus fiestas? Mirá esta iluminación LED RGB y conocé cómo puede acompañar tus eventos.";
  }
  if (/patillera|barba|patillas/i.test(fuente)) {
    return "✂️ ¿Querés hacer retoques de barba o patillas en casa? Mirá el video y conocé esta opción para tu cuidado personal.";
  }
  const detalle = copyGrupoEnlace(nombre, descripcion)
    .replace(/^(?:consult[aá]|conoc[eé]|descubr[ií])\b[^.!?]*(?:[.!?]|$)/i, "")
    .trim();
  const frases = detalle.match(/[^.!?]+[.!?]?/g)?.map((p) => p.trim()).filter(Boolean) || [];
  const resumen = frases.reduce((actual, frase) => {
    const candidato = [actual, frase].filter(Boolean).join(" ");
    return candidato.length <= 180 ? candidato : actual;
  }, "");
  return resumen
    ? `🎥 Mirá este producto en video. ${resumen}`
    : "🎥 Mirá este producto en video y conocé sus características antes de elegir.";
}

// Facebook Página Carrusel: copy breve sin repetir el título de la ficha.
function copyCarruselFacebook(producto, descripcion) {
  const nombre = texto(producto.nombre);
  const fuente = `${nombre} ${sinEtiquetas(descripcion)}`;
  if (/patillera/i.test(fuente) && /barba|patillas/i.test(fuente) &&
      /inal[aá]mbric/i.test(fuente) && /cortar|perfilar|retocar/i.test(fuente)) {
    return "✂️ ¿Querés retocar barba y patillas en casa? Esta patillera inalámbrica te permite cortar y perfilar con comodidad.";
  }
  const detalle = copyGrupoEnlace(nombre, descripcion);
  const oraciones = detalle.match(/[^.!?]+[.!?]?/g)?.map(v => v.trim()).filter(Boolean) || [];
  let resumen = "";
  for (const oracion of oraciones) {
    const candidato = [resumen, oracion].filter(Boolean).join(" ");
    if (candidato.length > 170) break;
    resumen = candidato;
  }
  if (!resumen) resumen = detalle.slice(0, 170).replace(/\s+\S*$/, "").trim();
  return resumen
    ? `🛍️ ¿Qué ofrece este producto? ${resumen}`
    : "🛍️ Mirá las características y los detalles de este producto antes de elegir.";
}

function hashtagsCarruselFacebook(producto) {
  const fuente = `${producto.nombre || ""} ${producto.descripcion || ""} ${producto.descripcionLarga || ""}`;
  if (/patillera/i.test(fuente) && /barba|patillas/i.test(fuente) &&
      /inal[aá]mbric/i.test(fuente) && /cabello|pelo/i.test(fuente)) {
    return ["#PatilleraInalambrica", "#PerfiladoDeBarba", "#CorteDeCabello", "#BarbaYPatillas", "#BarberiaEnCasa"];
  }
  return hashtagsGrupoEnlace(producto);
}

// Threads Carrusel: tres fotos existentes, copy propio, sin título repetido.
function copyCarruselThreads(producto, descripcion) {
  const nombre = texto(producto.nombre);
  const fuente = `${nombre} ${sinEtiquetas(descripcion)}`;
  if (/patillera/i.test(fuente) && /barba|patillas/i.test(fuente) &&
      /inal[aá]mbric/i.test(fuente)) {
    return "✂️ ¿Querés perfilar barba y patillas desde casa? Mirá los detalles de esta patillera inalámbrica en las tres fotos.";
  }
  if (/aro de luz|iluminaci[oó]n|luces led/i.test(fuente) && /rgb|c[aá]lida|fr[ií]a/i.test(fuente)) {
    return "💡 Mirá las tres fotos y conocé las opciones de iluminación que ofrece este producto.";
  }
  const detalle = copyGrupoEnlace(nombre, descripcion);
  const primerDetalle = detalle.match(/[^.!?]+[.!?]?/)?.[0]?.trim() || "";
  const maximo = 130;
  const resumen = primerDetalle.length > maximo
    ? primerDetalle.slice(0, maximo).replace(/\s+\S*$/, "").trim() + "…"
    : primerDetalle;
  return resumen
    ? `📸 Mirá estos detalles. ${resumen}`
    : "📸 Deslizá las tres fotos para conocer mejor este producto.";
}

function datoConfiable(producto) {
  return [...lista(producto.beneficios), ...lista(producto.incluye), sinEtiquetas(producto.descripcion), sinEtiquetas(producto.descripcionLarga)]
    .filter(Boolean);
}

// Threads ¿Sabías qué?: usar solo características y usos del producto.
function crearTipThreads(datos) {
  const frases = datos.flatMap((valor) =>
    sinEtiquetas(valor).split(/[.!?](?:\s+|$)/).map((frase) => frase.trim())
  ).filter(Boolean);

  const caracteristica = frases.find((frase) =>
    /^(cuenta con|incluye|tiene|ofrece|permite|incorpora)\b/i.test(frase)
  );
  const uso = frases.find((frase) =>
    /^(ideal para|sirve para|se usa para|se puede usar para)\b/i.test(frase)
  );
  const breve = (valor, maximo = 82) => {
    const partes = String(valor || "").split(/[,;]/).map((v) => v.trim()).filter(Boolean);
    let resultado = partes.slice(0, 2).join(", ");
    if (resultado.length > maximo) resultado = partes[0] || "";
    if (resultado.length > maximo) {
      resultado = resultado.slice(0, maximo).replace(/\s+\S*$/, "").trim();
    }
    return resultado.replace(/[.!?,;:]+$/, "").trim();
  };

  let pregunta;
  if (caracteristica) {
    const dato = breve(caracteristica).replace(/^./, (letra) => letra.toLowerCase());
    pregunta = `¿Sabías que este producto ${dato}?`;
  } else if (uso) {
    const aplicacion = breve(uso.replace(/^(ideal para|sirve para|se usa para|se puede usar para)\s*/i, ""));
    pregunta = `¿Sabías que podés usar este producto para ${aplicacion}?`;
  } else {
    const dato = breve(frases[0] || "Conocé las características disponibles en nuestra tienda", 90);
    pregunta = `¿Sabías que este producto puede resultarte útil? ${dato}.`;
  }

  if (caracteristica && uso) {
    const actividades = uso
      .replace(/^(ideal para|sirve para|se usa para|se puede usar para)\s*/i, "")
      .split(/[,;]/).map((v) => v.trim()).filter(Boolean).slice(0, 2).join(" o ");
    const complemento = ` Podés usarlo para ${actividades}.`;
    if (actividades && (pregunta + complemento).length <= 155) pregunta += complemento;
  }

  return `💡 ${pregunta}`;
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
  const copyTipThreads = crearTipThreads(datos);
  const hashtagsParaCarrusel = etiquetasCarrusel(producto, hashtagsBase);
  const frases = descripcion.match(/[^.!?]+[.!?]?/g)?.map(f => f.trim()).filter(Boolean) || [];
  const detalleCarrusel = frases.length > 1
    ? frases.slice(1).join(" ")
    : detalleAlternativo;
  const copyCarrusel = `🔎 Mirá los detalles antes de elegir. ${detalleCarrusel}`;
  const plantilla = [
    ...CICLO_PRODUCTO.dia1.publicaciones.map((p, i) => ({ ...p, dia: "dia1", i })),
    ...CICLO_PRODUCTO.dia2.publicaciones.map((p, i) => ({ ...p, dia: "dia2", i })),
  ];
  const calendario = plantilla.map(p => {
    
    const esCarruselInstagram = p.red === "instagram" && p.tipo === "carrusel";
    const esCarruselFacebook = p.red === "facebook" && p.tipo === "carrusel_pagina";
    const esCarruselThreads = p.red === "threads" && p.tipo === "carrusel";
    const esThreadsTip = p.red === "threads" && p.tipo === "sabias_que";
    const esGrupoTip = p.red === "facebook" && p.variante === "sabias_que";
    const esGruposVideo = p.red === "facebook" && p.tipo === "grupos_video";
    
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
          const esGrupoEnlace =
            p.red === "facebook" && p.tipo === "grupo" &&
            p.variante === "enlace_producto";

          const copy = esStoryFacebook
            ? ""
            : esCarruselInstagram
              ? copyCarrusel
            : esCarruselFacebook
              ? copyCarruselFacebook(producto, descripcion)
            : esCarruselThreads
              ? copyCarruselThreads(producto, descripcion)
            : esGrupoPost
              ? descripcion
            : esGrupoEnlace
              ? copyGrupoEnlace(nombre, descripcion)
            : esGruposVideo
              ? copyGrupoVideo(producto, descripcion)
            : esEstadoWhatsapp
              ? `${emoji} ${copyEstado}`
              : esReel
                ? descripcion
                : esThreadsPost
                  ? `💡 ${copyCortoThreads} ✨`
                  : esThreadsTip
      
      ? copyTipThreads
      : esGrupoTip
        ? `${emoji} Un detalle para tener en cuenta sobre ${nombre}: ${detalleAlternativo}`
        : p.tipo === "reel"
          ? `${emoji} Descubrí ${nombre}. ${descripcion}`
          : p.tipo?.includes("story") || p.tipo?.includes("estado")
            ? `${emoji} ${nombre}. ¡Conocé sus características!`
            : `${emoji} ${nombre}. ${descripcion}`;


    const cta = esStoryFacebook
    ? ""
    : esThreadsTip || esGrupoEnlace || esGruposVideo || esCarruselFacebook || esCarruselThreads
      ? "¡Conocelo en nuestra tienda!"
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
      p.red === "whatsapp" || esStoryFacebook ? []
        : esCarruselInstagram ? hashtagsParaCarrusel
        : esCarruselFacebook ? hashtagsCarruselFacebook(producto)
        : esCarruselThreads ? hashtagsGrupoEnlace(producto)
        : esGrupoEnlace || esGruposVideo ? hashtagsGrupoEnlace(producto)
        : hashtagsBase;

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
    
    const sufijoThreadsCarrusel = [cta, url, hashtags.join(" ")].filter(Boolean).join("\n\n");
    const maximoCopyThreadsCarrusel = Math.min(175, 500 - Array.from(sufijoThreadsCarrusel).length - 4);
    if (esCarruselThreads && maximoCopyThreadsCarrusel < 30) {
      throw new Error(`La URL del producto es demasiado larga para Threads Carrusel: ${nombre}`);
    }
    const copyFinal = esCarruselThreads && Array.from(copy).length > maximoCopyThreadsCarrusel
      ? Array.from(copy).slice(0, maximoCopyThreadsCarrusel - 1).join("")
          .replace(/\s+\S*$/, "").trim() + "…"
      : copy;

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
      vistaPreviaEnlace: esGruposVideo || esCarruselThreads ? false : Boolean(p.vistaPreviaEnlace),
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
      texto: copyFinal, copy: copyFinal, cta, hashtags, urlProducto,
      // En WhatsApp solo enviamos texto+URL: la portada la obtiene WhatsApp
      // automáticamente de las etiquetas OG de la página del producto.
      textoCompleto: esStoryFacebook
        ? ""
        : (esEstadoWhatsapp
            ? [copy, cta, urlProducto]
            : [copyFinal, cta, urlProducto, hashtags.join(" ")]
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
