import crypto from "crypto";
import OpenAI from "openai";
import { conectarMongoDB } from "../lib/mongodb.js";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const THREADS_APP_ID = process.env.THREADS_APP_ID;
const THREADS_APP_SECRET = process.env.THREADS_APP_SECRET;
const URL_BASE = "https://andreshousesitter.com";
const THREADS_REDIRECT_URI = `${URL_BASE}/api/contenido-redes?accion=threads-callback`;
const THREADS_API = "https://graph.threads.net/v1.0";
const INSTAGRAM_ACCESS_TOKEN = process.env.INSTAGRAM_ACCESS_TOKEN;
const INSTAGRAM_API_VERSION = "v26.0";
const INSTAGRAM_API = `https://graph.instagram.com/${INSTAGRAM_API_VERSION}`;

const FACEBOOK_PAGE_ID = process.env.FACEBOOK_PAGE_ID;
const FACEBOOK_PAGE_ACCESS_TOKEN = process.env.FACEBOOK_PAGE_ACCESS_TOKEN;
const FACEBOOK_API_VERSION = "v26.0";
const FACEBOOK_API = `https://graph.facebook.com/${FACEBOOK_API_VERSION}`;

const MAX_INTENTOS_PUBLICACION = 3;
const ZONA_HORARIA_RED = "America/Argentina/Buenos_Aires";

function verificarConfiguracionFacebook() {
  if (!FACEBOOK_PAGE_ID || !FACEBOOK_PAGE_ACCESS_TOKEN) {
    throw new Error("Faltan FACEBOOK_PAGE_ID o FACEBOOK_PAGE_ACCESS_TOKEN");
  }
}

const obtenerCookies = (req) => {
  const cookies = {};
  const header = req.headers.cookie || "";
  header.split(";").forEach((cookie) => {
    const [nombre, ...valor] = cookie.trim().split("=");
    if (nombre) cookies[nombre] = decodeURIComponent(valor.join("="));
  });
  return cookies;
};

const adminAutorizado = (req) => {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  const tokenEsperado = crypto
    .createHmac("sha256", adminPassword)
    .update("andres-imprimibles-admin")
    .digest("hex");
  const token = obtenerCookies(req).admin_token;
  if (!token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(tokenEsperado);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

function verificarConfiguracionThreads() {
  if (!THREADS_APP_ID || !THREADS_APP_SECRET) {
    throw new Error("Faltan THREADS_APP_ID o THREADS_APP_SECRET");
  }
}

async function renovarTokenThreadsSiNecesario(integracion) {
  if (!integracion?.expiraEn) return integracion;
  const ahora = new Date();
  const expiraEn = new Date(integracion.expiraEn);
  if (expiraEn > new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000)) return integracion;
  try {
    const parametros = new URLSearchParams({
      grant_type: "th_refresh_token",
      refresh_token: integracion.refreshToken || integracion.accessToken,
      client_secret: THREADS_APP_SECRET,
    });
    const res = await fetch(`${THREADS_API}/refresh_access_token?${parametros}`);
    const datos = await res.json();
    if (!res.ok || !datos.access_token) throw new Error("Falló renovación");
    const db = await conectarMongoDB();
    const expira = new Date(Date.now() + (Number(datos.expires_in) || 5184000) * 1000);
    await db.collection("integraciones").updateOne({ proveedor: "threads" }, {
      $set: { accessToken: datos.access_token, expiraEn: expira, actualizadoEn: ahora },
    });
    return { ...integracion, accessToken: datos.access_token, expiraEn: expira };
  } catch { return integracion; }
}

async function conectarThreads(req, res) {
  const params = new URLSearchParams({
    client_id: THREADS_APP_ID,
    redirect_uri: THREADS_REDIRECT_URI,
    scope: "threads_basic,threads_content_publish",
    response_type: "code",
  });
  return res.redirect(`https://threads.net/oauth/authorize?${params}`);
}

async function callbackThreads(req, res) {
  const { code, error, error_description } = req.query;
  if (error) return res.status(400).json({ ok: false, error, detalle: error_description });
  if (!code) return res.status(400).json({ ok: false, error: "Sin código de autorización" });

  const tokenCorto = await (await fetch(`${THREADS_API}/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: THREADS_APP_ID, client_secret: THREADS_APP_SECRET,
      grant_type: "authorization_code", redirect_uri: THREADS_REDIRECT_URI, code,
    }).toString(),
  })).json();
  if (!tokenCorto.access_token) throw new Error("Token corto inválido");

  const tokenLargo = await (await fetch(`${THREADS_API}/access_token?${new URLSearchParams({
    grant_type: "th_exchange_token", client_secret: THREADS_APP_SECRET,
    access_token: tokenCorto.access_token,
  })}`)).json();
  if (!tokenLargo.access_token) throw new Error("Token largo inválido");

  const db = await conectarMongoDB();
  const expiraEn = new Date(Date.now() + (Number(tokenLargo.expires_in) || 5184000) * 1000);
  await db.collection("integraciones").updateOne({ proveedor: "threads" }, {
    $set: {
      userId: String(tokenCorto.user_id || ""),
      accessToken: tokenLargo.access_token,
      tokenType: tokenLargo.token_type || "bearer",
      conectado: true, permisos: ["threads_basic", "threads_content_publish"],
      expiraEn, actualizadoEn: new Date(),
    },
    $setOnInsert: { creadoEn: new Date() },
  }, { upsert: true });
  return res.redirect("/admin/redes?threads=conectado");
}

async function publicarThreads(req, res) {
  const texto = (req.body?.texto || "").trim();
  const productoId = (req.body?.productoId || "").trim();
  if (!texto) return res.status(400).json({ ok: false, error: "Falta el texto" });

  const db = await conectarMongoDB();
  let integracion = await db.collection("integraciones").findOne({ proveedor: "threads", conectado: true });
  if (!integracion?.accessToken) return res.status(400).json({ ok: false, error: "Threads no conectado" });
  integracion = await renovarTokenThreadsSiNecesario(integracion);

  const contenedor = await (await fetch(`${THREADS_API}/me/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ media_type: "TEXT", text: texto, access_token: integracion.accessToken }),
  })).json();
  if (!contenedor?.id) return res.status(502).json({ ok: false, error: "No se pudo crear el contenedor" });

  const publicacion = await (await fetch(`${THREADS_API}/me/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: contenedor.id, access_token: integracion.accessToken }),
  })).json();
  if (!publicacion?.id) return res.status(502).json({ ok: false, error: "No se pudo publicar" });

  await db.collection("publicaciones_redes").insertOne({
    proveedor: "threads", productoId: productoId || null,
    publicacionId: String(publicacion.id), texto, estado: "publicado",
    publicadoEn: new Date(), creadoEn: new Date(),
  });
  return res.status(200).json({ ok: true, publicacionId: String(publicacion.id), mensaje: "Publicado en Threads" });
}

function verificarConfiguracionInstagram() {
  if (!INSTAGRAM_ACCESS_TOKEN) throw new Error("Falta INSTAGRAM_ACCESS_TOKEN");
}

async function leerJsonSeguro(res) {
  const t = await res.text();
  try { return t ? JSON.parse(t) : {}; } catch { return { error: { message: t } }; }
}

async function obtenerCuentaInstagram() {
  verificarConfiguracionInstagram();
  const datos = await leerJsonSeguro(await fetch(`${INSTAGRAM_API}/me?fields=id,username&access_token=${INSTAGRAM_ACCESS_TOKEN}`));
  if (!datos?.id) throw new Error("No se pudo verificar cuenta IG");
  return { id: String(datos.id), username: datos.username || null };
}

function normalizarUrlImagen(v) {
  return typeof v === "string" && /^https?:\/\//i.test(v.trim()) ? v.trim() : null;
}

function extraerImagenesInstagram(pub) {
  if (!pub || typeof pub !== "object") return [];
  const urls = [];
  const rec = (v) => {
    if (Array.isArray(v)) v.forEach(rec);
    else if (v && typeof v === "object") Object.values(v).forEach(rec);
    else { const u = normalizarUrlImagen(v); if (u && !urls.includes(u)) urls.push(u); }
  };
  ["imagenes", "images", "media", "slides", "imagen", "image", "imageUrl", "image_url"].forEach(k => rec(pub[k]));
  return urls;
}

async function crearContenedorInstagram(cuentaId, params) {
  const datos = await leerJsonSeguro(await fetch(`${INSTAGRAM_API}/${cuentaId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: INSTAGRAM_ACCESS_TOKEN }).toString(),
  }));
  if (!datos?.id) throw new Error("Error creando contenedor IG");
  return String(datos.id);
}

const esperar = ms => new Promise(r => setTimeout(r, ms));

async function esperarContenedorInstagram(id, intentos = 10) {
  for (let i = 0; i < intentos; i++) {
    const datos = await leerJsonSeguro(await fetch(`${INSTAGRAM_API}/${id}?fields=status_code,status&access_token=${INSTAGRAM_ACCESS_TOKEN}`));
    if (datos?.status_code === "FINISHED") return datos;
    if (datos?.status_code === "ERROR" || datos?.status_code === "EXPIRED") throw new Error(datos?.status || "Error procesando contenido IG");
    await esperar(1500);
  }
  throw new Error("IG tardó demasiado en procesar");
}

async function publicarContenedorInstagram(cuentaId, contenedorId) {
  const datos = await leerJsonSeguro(await fetch(`${INSTAGRAM_API}/${cuentaId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: contenedorId, access_token: INSTAGRAM_ACCESS_TOKEN }).toString(),
  }));
  if (!datos?.id) throw new Error("Error publicando contenedor IG");
  return String(datos.id);
}

async function publicarCarruselInstagram({ publicacion, productoId }) {
  verificarConfiguracionInstagram();
  const imagenes = extraerImagenesInstagram(publicacion);
  if (imagenes.length < 2 || imagenes.length > 10) throw new Error(`Carrusel necesita 2-10 imágenes, hay ${imagenes.length}`);
  const texto = publicacion?.texto?.trim() || publicacion?.caption?.trim() || "";
  const cuenta = await obtenerCuentaInstagram();
  const hijos = [];
  for (const url of imagenes) {
    const h = await crearContenedorInstagram(cuenta.id, { image_url: url, is_carousel_item: "true" });
    await esperarContenedorInstagram(h);
    hijos.push(h);
  }
  const carrusel = await crearContenedorInstagram(cuenta.id, {
    media_type: "CAROUSEL", children: hijos.join(","), ...(texto && { caption: texto }),
  });
  await esperarContenedorInstagram(carrusel);
  const pid = await publicarContenedorInstagram(cuenta.id, carrusel);
  const db = await conectarMongoDB();
  await db.collection("publicaciones_redes").insertOne({
    proveedor: "instagram", tipo: "carrusel", productoId: productoId || null,
    publicacionId: pid, cuentaId: cuenta.id, username: cuenta.username,
    texto, imagenes, estado: "publicado", publicadoEn: new Date(), creadoEn: new Date(),
  });
  return { ok: true, tipo: "carrusel", publicacionId: pid, mensaje: "Carrusel publicado" };
}

async function publicarStoryInstagram({ publicacion, productoId }) {
  verificarConfiguracionInstagram();
  const imagenes = extraerImagenesInstagram(publicacion);
  const imagen = imagenes[0];
  if (!imagen) throw new Error("La Story necesita una imagen");
  const cuenta = await obtenerCuentaInstagram();
  const contenedor = await crearContenedorInstagram(cuenta.id, { image_url: imagen, media_type: "STORIES" });
  await esperarContenedorInstagram(contenedor);
  const pid = await publicarContenedorInstagram(cuenta.id, contenedor);
  const db = await conectarMongoDB();
  await db.collection("publicaciones_redes").insertOne({
    proveedor: "instagram", tipo: "story", productoId: productoId || null,
    publicacionId: pid, imagen, estado: "publicado", publicadoEn: new Date(),
  });
  return { ok: true, tipo: "story", publicacionId: pid, mensaje: "Story publicada" };
}

async function publicarReelInstagram({ publicacion, productoId }) {
  verificarConfiguracionInstagram();
  const db = await conectarMongoDB();
  const prod = await db.collection("productos").findOne({ id: productoId });
  const videoUrl = prod?.videoReel?.trim();
  if (!videoUrl || !/^https?:\/\//i.test(videoUrl)) throw new Error("Falta video Reel válido");
  const texto = publicacion?.texto?.trim() || publicacion?.caption?.trim() || "";
  const cuenta = await obtenerCuentaInstagram();
  const contenedor = await crearContenedorInstagram(cuenta.id, {
    media_type: "REELS", video_url: videoUrl, ...(texto && { caption: texto }),
  });
  await esperarContenedorInstagram(contenedor, 40);
  const pid = await publicarContenedorInstagram(cuenta.id, contenedor);
  await db.collection("publicaciones_redes").insertOne({
    proveedor: "instagram", tipo: "reel", productoId, publicacionId: pid,
    texto, videoUrl, estado: "publicado", publicadoEn: new Date(),
  });
  return { ok: true, tipo: "reel", publicacionId: pid, mensaje: "Reel publicado" };
}

async function publicarFacebook({ publicacion, productoId }) {
  verificarConfiguracionFacebook();
  const texto = publicacion?.texto?.trim() || "";
  const imagenes = extraerImagenesInstagram(publicacion);
  const imagen = imagenes[0];
  if (!texto && !imagen) throw new Error("Publicación FB sin texto ni imagen");
  const params = new URLSearchParams({ access_token: FACEBOOK_PAGE_ACCESS_TOKEN });
  if (texto) params.set(imagen ? "caption" : "message", texto);
  const endpoint = imagen
    ? `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/photos`
    : `${FACEBOOK_API}/${FACEBOOK_PAGE_ID}/feed`;
  if (imagen) params.set("url", imagen);
  const datos = await leerJsonSeguro(await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  }));
  if (!datos?.id) throw new Error("Error publicando en Facebook");
  const pid = String(datos.id);
  const db = await conectarMongoDB();
  await db.collection("publicaciones_redes").insertOne({
    proveedor: "facebook", tipo: "publicacion", productoId: productoId || null,
    publicacionId: pid, texto, imagen, estado: "publicado", publicadoEn: new Date(),
  });
  return { ok: true, proveedor: "facebook", publicacionId: pid, mensaje: "Publicado en Facebook" };
}

async function guardarBorrador(req, res) {
  const { productoId, nombreProducto, contenido } = req.body || {};
  if (!productoId || !nombreProducto || !contenido || typeof contenido !== "object") {
    return res.status(400).json({ ok: false, error: "Datos inválidos" });
  }
  const db = await conectarMongoDB();
  const ahora = new Date();
  await db.collection("contenido_redes").updateOne(
    { productoId, estado: "borrador" },
    { $set: { productoId, nombreProducto, contenido, estado: "borrador", actualizadoEn: ahora },
      $setOnInsert: { creadoEn: ahora } },
    { upsert: true }
  );
  return res.status(200).json({ ok: true, mensaje: "Borrador guardado" });
}

async function listarBorradores(req, res) {
  const db = await conectarMongoDB();
  const borradores = await db.collection("contenido_redes").find({ estado: "borrador" }).sort({ actualizadoEn: -1 }).toArray();
  return res.status(200).json({ ok: true, borradores });
}

async function aprobarBorrador(req, res) {
  const { productoId } = req.body || {};
  if (!productoId) return res.status(400).json({ ok: false, error: "Falta productoId" });
  const db = await conectarMongoDB();
  const resu = await db.collection("contenido_redes").updateOne(
    { productoId, estado: "borrador" },
    { $set: { estado: "aprobado", aprobadoEn: new Date(), actualizadoEn: new Date() } }
  );
  if (resu.matchedCount === 0) return res.status(404).json({ ok: false, error: "Sin borrador para aprobar" });
  return res.status(200).json({ ok: true, mensaje: "Aprobado" });
}

async function listarAprobados(req, res) {
  const db = await conectarMongoDB();
  const aprobados = await db.collection("contenido_redes").find({ estado: "aprobado" }).sort({ aprobadoEn: -1 }).toArray();
  return res.status(200).json({ ok: true, aprobados });
}
const formatearFechaUTC = (fecha) => {
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, "0");
  const dia = String(fecha.getUTCDate()).padStart(2, "0");
  return `${anio}-${mes}-${dia}`;
};
const sumarDiasFecha = (fechaBase, cantidad) => {
  const [anio, mes, dia] = fechaBase.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  fecha.setUTCDate(fecha.getUTCDate() + cantidad);
  return formatearFechaUTC(fecha);
};
const obtenerFechaArgentina = () => {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA_RED, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts();
  const v = {};
  for (const p of partes) if (p.type !== "literal") v[p.type] = p.value;
  return `${v.year}-${v.month}-${v.day}`;
};
const obtenerInicioSemana = () => {
  const hoy = obtenerFechaArgentina();
  const [anio, mes, dia] = hoy.split("-").map(Number);
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  const diaSemana = fecha.getUTCDay();
  const distLunes = diaSemana === 0 ? -6 : 1 - diaSemana;
  fecha.setUTCDate(fecha.getUTCDate() + distLunes);
  let inicio = formatearFechaUTC(fecha);
  if (diaSemana === 6 || diaSemana === 0) inicio = sumarDiasFecha(inicio, 7);
  return inicio;
};

const crearCalendarioInicial = (contenido, bloqueSemana = 0, semanaInicio = obtenerInicioSemana()) => {
  const bloque = Number(bloqueSemana) === 1 ? 1 : 0;
  const desplazamiento = bloque === 0 ? 0 : 3;
  const nombresDias = bloque === 0
    ? ["Lunes", "Martes", "Miércoles"]
    : ["Jueves", "Viernes", "Sábado"];
  const dias = nombresDias.map((dia, idx) => ({
    fecha: sumarDiasFecha(semanaInicio, desplazamiento + idx),
    dia,
  }));
  const calendario = [];
  const huecos = [];
  const agregar = (d, hora, red, tipo, indice, publicacion) => {
    if (!publicacion) {
      huecos.push({ dia: nombresDias[d], hora, red, tipo, mensaje: "Sin contenido" });
      return;
    }
    calendario.push({
      fecha: dias[d].fecha, dia: dias[d].dia, hora, red, tipo, indice,
      publicacion, estado: "programado", zonaHoraria: ZONA_HORARIA_RED,
      intentos: 0,
    });
  };

  agregar(0, "10:00", "instagram", "story", 0, contenido?.instagram?.stories?.[0]);
  agregar(0, "12:00", "instagram", "carrusel", 0, contenido?.instagram?.carrusel);
  agregar(0, "20:00", "instagram", "story", 1, contenido?.instagram?.stories?.[1]);
  agregar(1, "10:00", "instagram", "story", 2, contenido?.instagram?.stories?.[2]);
  agregar(1, "18:00", "instagram", "reel", 0, contenido?.instagram?.reel);
  agregar(1, "20:00", "instagram", "story", 3, contenido?.instagram?.stories?.[3]);
  agregar(2, "10:00", "instagram", "story", 4, contenido?.instagram?.stories?.[4]);
  agregar(2, "20:00", "instagram", "story", 5, contenido?.instagram?.stories?.[5]);

  for (let i = 0; i < 6; i += 1) {
    agregar(Math.floor(i / 2), i % 2 === 0 ? "11:00" : "19:00", "threads", "publicacion", i, contenido?.threads?.[i]);
    agregar(Math.floor(i / 2), i % 2 === 0 ? "17:00" : "21:00", "facebook", "publicacion", i, contenido?.facebook?.publicaciones?.[i]);
  }
  return { calendario, huecos };
};

async function programarContenido(req, res) {
  const { productoId } = req.body || {};
  if (!productoId) return res.status(400).json({ ok: false, error: "Falta productoId" });
  const db = await conectarMongoDB();
  const aprobado = await db.collection("contenido_redes")
    .find({ productoId, estado: "aprobado" })
    .sort({ aprobadoEn: -1 }).limit(1).next();
  if (!aprobado) return res.status(404).json({ ok: false, error: "Sin contenido aprobado" });

  const semanaInicio = obtenerInicioSemana();
  const programados = await db.collection("contenido_redes").find({ estado: "programado", semanaInicio }).toArray();
  const ocupados = new Set(programados.map(i => Number(i.bloqueSemana)).filter(b => b === 0 || b === 1));
  let bloque = null;
  if (!ocupados.has(0)) bloque = 0;
  else if (!ocupados.has(1)) bloque = 1;
  if (bloque === null) return res.status(409).json({ ok: false, error: "Semana completa" });

  const { calendario, huecos } = crearCalendarioInicial(aprobado.contenido, bloque, semanaInicio);
  await db.collection("contenido_redes").updateOne(
    { _id: aprobado._id },
    { $set: { estado: "programado", calendario, semanaInicio, semanaFin: sumarDiasFecha(semanaInicio, 5),
      bloqueSemana: bloque, programadoEn: new Date(), actualizadoEn: new Date() } }
  );
  return res.status(200).json({ ok: true, bloqueSemana: bloque, calendario, huecos });
}

async function regenerarContenidoProgramado(req, res) {
  const { productoId, nombreProducto, contenido } = req.body || {};
  if (!productoId || !contenido) return res.status(400).json({ ok: false, error: "Datos incompletos" });
  const db = await conectarMongoDB();
  const doc = await db.collection("contenido_redes").findOne({ productoId, estado: "programado" });
  if (!doc) return res.status(404).json({ ok: false, error: "Sin programado" });
  const { calendario, huecos } = crearCalendarioInicial(contenido, Number(doc.bloqueSemana) || 0, doc.semanaInicio);
  await db.collection("contenido_redes").updateOne({ _id: doc._id }, {
    $set: { contenido, calendario, nombreProducto: nombreProducto || doc.nombreProducto,
      regeneradoEn: new Date(), actualizadoEn: new Date() }
  });
  return res.status(200).json({ ok: true, calendario, huecos });
}

async function listarProgramados(req, res) {
  const db = await conectarMongoDB();
  const programados = await db.collection("contenido_redes").find({ estado: "programado" }).sort({ programadoEn: -1 }).toArray();
  return res.status(200).json({ ok: true, programados });
}

async function ejecutarPublicacionPieza({ req, pieza, productoId }) {
  const { red, tipo } = pieza;
  if (red === "threads") {
    const texto = pieza.publicacion?.texto?.trim();
    if (!texto) throw new Error("Falta texto Threads");
    let resultado;
    await publicarThreads({ ...req, body: { texto, productoId } }, {
      status() { return this; },
      json(datos) { resultado = datos; return datos; },
    });
    if (!resultado?.ok) throw new Error(resultado?.error || "Fallo Threads");
    return resultado;
  }
  if (red === "instagram" && tipo === "carrusel") return publicarCarruselInstagram({ publicacion: pieza.publicacion, productoId });
  if (red === "instagram" && tipo === "story") return publicarStoryInstagram({ publicacion: pieza.publicacion, productoId });
  if (red === "instagram" && tipo === "reel") return publicarReelInstagram({ publicacion: pieza.publicacion, productoId });
  if (red === "facebook") return publicarFacebook({ publicacion: pieza.publicacion, productoId });
  throw new Error("Red/formato no habilitado");
}

async function publicarProgramado(req, res) {
  const { productoId, fecha, hora, red, tipo, indice } = req.body || {};
  if (!productoId || !fecha || !hora || !red) return res.status(400).json({ ok: false, error: "Faltan datos" });
  const db = await conectarMongoDB();
  const doc = await db.collection("contenido_redes").findOne({ productoId, estado: "programado" });
  if (!doc) return res.status(404).json({ ok: false, error: "No encontrado" });
  const pos = Array.isArray(doc.calendario) ? doc.calendario.findIndex(p =>
    p.fecha === fecha && p.hora === hora && p.red === red && p.tipo === tipo && Number(p.indice) === Number(indice)
  ) : -1;
  if (pos < 0) return res.status(404).json({ ok: false, error: "Pieza no encontrada" });
  const pieza = doc.calendario[pos];
  if (pieza.estado === "publicado") return res.status(409).json({ ok: false, error: "Ya publicado" });
  if (pieza.estado === "publicando") return res.status(409).json({ ok: false, error: "En proceso" });
  if (pieza.estado === "fallido") return res.status(409).json({ ok: false, error: "Marcada como fallida" });
  if ((pieza.intentos || 0) >= MAX_INTENTOS_PUBLICACION) {
    await db.collection("contenido_redes").updateOne({ _id: doc._id }, {
      $set: { [`calendario.${pos}.estado`]: "fallido", [`calendario.${pos}.fallidoEn`]: new Date(), actualizadoEn: new Date() }
    });
    return res.status(409).json({ ok: false, error: `Máximo ${MAX_INTENTOS_PUBLICACION} intentos alcanzados — marcada como fallida` });
  }

  const inicio = new Date();
  const reclamo = await db.collection("contenido_redes").updateOne(
    { _id: doc._id, [`calendario.${pos}.estado`]: "programado" },
    { $set: { [`calendario.${pos}.estado`]: "publicando", [`calendario.${pos}.procesandoDesde`]: inicio, actualizadoEn: inicio } }
  );
  if (reclamo.modifiedCount === 0) return res.status(409).json({ ok: false, error: "Tomado por otro proceso" });

  try {
    const resultado = await ejecutarPublicacionPieza({ req, pieza, productoId });
    if (!resultado?.ok || !resultado?.publicacionId) throw new Error("Fallo publicación");
    const ahora = new Date();
    await db.collection("contenido_redes").updateOne({ _id: doc._id }, {
      $set: { [`calendario.${pos}.estado`]: "publicado", [`calendario.${pos}.publicadoEn`]: ahora, actualizadoEn: ahora },
      $unset: { [`calendario.${pos}.procesandoDesde`]: "", [`calendario.${pos}.ultimoError`]: "", [`calendario.${pos}.fallidoEn`]: "" }
    });
    const actualizado = await db.collection("contenido_redes").findOne({ _id: doc._id });
    const completo = actualizado.calendario.every(i => i.estado === "publicado" || i.estado === "fallido");
    if (completo) {
      const hayFallidas = actualizado.calendario.some(i => i.estado === "fallido");
      await db.collection("contenido_redes").updateOne({ _id: doc._id }, {
        $set: { estado: hayFallidas ? "completado-con-errores" : "publicado", publicadoEn: ahora }
      });
    }
    return res.status(200).json({ ok: true, publicacionId: resultado.publicacionId });
  } catch (err) {
    const nuevosIntentos = (pieza.intentos || 0) + 1;
    const esUltimoIntento = nuevosIntentos >= MAX_INTENTOS_PUBLICACION;
    const ahora = new Date();
    await db.collection("contenido_redes").updateOne({ _id: doc._id }, {
      $set: {
        [`calendario.${pos}.estado`]: esUltimoIntento ? "fallido" : "programado",
        [`calendario.${pos}.intentos`]: nuevosIntentos,
        [`calendario.${pos}.ultimoError`]: err.message,
        [`calendario.${pos}.ultimoIntentoEn`]: ahora,
        ...(esUltimoIntento && { [`calendario.${pos}.fallidoEn`]: ahora }),
        actualizadoEn: ahora,
      },
      $unset: { [`calendario.${pos}.procesandoDesde`]: "" }
    });
    return res.status(esUltimoIntento ? 410 : 502).json({
      ok: false,
      error: esUltimoIntento ? `Fallido tras ${MAX_INTENTOS_PUBLICACION} intentos` : err.message,
      intentos: nuevosIntentos,
      maximo: MAX_INTENTOS_PUBLICACION,
    });
  }
}

const obtenerFechaHoraArgentina = () => {
  const partes = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA_RED,
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts();
  const v = {};
  for (const p of partes) if (p.type !== "literal") v[p.type] = p.value;
  return { fecha: `${v.year}-${v.month}-${v.day}`, hora: `${v.hour}:${v.minute}` };
};

const cronAutorizado = (req) => {
  const secreto = process.env.CRON_SECRET;
  if (!secreto) return false;
  const recibido = req.headers?.authorization || "";
  const esperado = `Bearer ${secreto}`;
  if (recibido.length !== esperado.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recibido), Buffer.from(esperado));
};

async function ejecutarPublicacionesPendientes(req, res) {
  if (!cronAutorizado(req)) return res.status(403).json({ ok: false, error: "No autorizado" });
  const db = await conectarMongoDB();
  const { fecha, hora } = obtenerFechaHoraArgentina();
  const docs = await db.collection("contenido_redes").find({ estado: "programado" }).toArray();
  const pendientes = [];
  for (const doc of docs) {
    if (!Array.isArray(doc.calendario)) continue;
    for (const p of doc.calendario) {
      if (p.estado !== "programado") continue;
      if ((p.intentos || 0) >= MAX_INTENTOS_PUBLICACION) continue;
      const vencida = p.fecha < fecha || (p.fecha === fecha && p.hora <= hora);
      if (vencida) pendientes.push({ productoId: doc.productoId, fecha: p.fecha, hora: p.hora, red: p.red, tipo: p.tipo, indice: p.indice });
    }
  }
  const resultados = [];
  for (const pieza of pendientes.slice(0, 3)) {
    let r;
    await publicarProgramado({ ...req, body: pieza }, { status(c) { r = { ok: c < 300 }; return this; }, json(d) { r = d; return d; } });
    resultados.push(r);
  }
  return res.status(200).json({ ok: true, fechaActual: fecha, horaActual: hora, pendientes: resultados.length, resultados });
}

export default async function manejarSolicitud(req, res) {
  const accion = req.query.accion || req.body?.accion;
  const metodo = req.method;

  if (accion === "threads-callback") return callbackThreads(req, res);
  if (accion === "conectar-threads" && metodo === "GET") return conectarThreads(req, res);
  if (accion === "publicar-threads" && metodo === "POST") return publicarThreads(req, res);
  if (accion === "guardar-borrador" && metodo === "POST") return guardarBorrador(req, res);
  if (accion === "listar-borradores" && metodo === "GET") return listarBorradores(req, res);
  if (accion === "aprobar-borrador" && metodo === "POST") return aprobarBorrador(req, res);
  if (accion === "listar-aprobados" && metodo === "GET") return listarAprobados(req, res);
  if (accion === "programar-contenido" && metodo === "POST") return programarContenido(req, res);
  if (accion === "regenerar-programado" && metodo === "POST") return regenerarContenidoProgramado(req, res);
  if (accion === "listar-programados" && metodo === "GET") return listarProgramados(req, res);
  if (accion === "publicar-programado" && metodo === "POST") return publicarProgramado(req, res);
  if (accion === "cron-ejecutar" && metodo === "POST") return ejecutarPublicacionesPendientes(req, res);

  return res.status(400).json({ ok: false, error: "Acción no reconocida" });
}
