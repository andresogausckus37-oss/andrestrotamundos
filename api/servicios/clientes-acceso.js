// Acceso de clientes para Comunidad Semanal: correo + codigo de un solo uso.
// NO habilita pruebas gratuitas, cobros, pedidos, publicacion ni integraciones Meta.
import crypto from "node:crypto";

const DB = "andres_imprimibles";
const RUTA = "/api/servicios/clientes/acceso/";
const COOKIE = "__Host-comunidad_sesion";
const VIDA_CODIGO_MS = 10 * 60 * 1000;
const ESPERA_ENVIO_MS = 60 * 1000;
const VIDA_SESION_S = 7 * 24 * 60 * 60;
const HORA_MS = 60 * 60 * 1000;

function responder(datos, status = 200, cookies) {
  const headers = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  if (cookies) headers.set("Set-Cookie", cookies);
  return new Response(JSON.stringify(datos), { status, headers });
}

const hash = (valor) => crypto.createHash("sha256").update(valor).digest("hex");
const hmacCodigo = (llave, emailHash, codigo) => crypto.createHmac("sha256", llave)
  .update(`comunidad:otp:v1:${emailHash}:${codigo}`).digest("hex");

function normalizarCorreo(valor) {
  if (typeof valor !== "string") return null;
  const correo = valor.trim().toLowerCase();
  if (correo.length < 5 || correo.length > 160 || /[\r\n\t\s]/.test(correo) ||
      !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) return null;
  return correo;
}

function configuracion(env) {
  const otpSecret = String(env?.SERVICIO_CLIENTES_CODIGO_SECRET ?? "").trim();
  const sessionSecret = String(env?.SERVICIO_CLIENTES_SESION_SECRET ?? "").trim();
  const desde = String(env?.SERVICIO_CLIENTES_CORREO_DESDE ?? "").trim();
  const resend = String(env?.RESEND_API_KEY ?? "").trim();
  if (!env?.MONGODB_URI || !resend || otpSecret.length < 32 || sessionSecret.length < 32 ||
      otpSecret === sessionSecret || !desde || desde.length > 180 || /[\r\n]/.test(desde) ||
      !/^(?:[^<>]+\s<)?[^@<>\s]+@[^@<>\s]+\.[^@<>\s]+>?$/.test(desde)) return null;
  return { otpSecret, sessionSecret, desde, resend };
}

// Estado por requisito para Admin. No expone valores, longitudes ni datos sensibles.
// Mantener las mismas condiciones que configuracion(env).
export function diagnosticarConfiguracionClientes(env) {
  const otpSecret = String(env?.SERVICIO_CLIENTES_CODIGO_SECRET ?? "").trim();
  const sessionSecret = String(env?.SERVICIO_CLIENTES_SESION_SECRET ?? "").trim();
  const desde = String(env?.SERVICIO_CLIENTES_CORREO_DESDE ?? "").trim();
  const estados = {
    MONGODB_URI: Boolean(env?.MONGODB_URI),
    RESEND_API_KEY: Boolean(String(env?.RESEND_API_KEY ?? "").trim()),
    SERVICIO_CLIENTES_CODIGO_SECRET: otpSecret.length >= 32,
    SERVICIO_CLIENTES_SESION_SECRET: sessionSecret.length >= 32,
    CLAVES_DIFERENTES: otpSecret !== sessionSecret,
    SERVICIO_CLIENTES_CORREO_DESDE: Boolean(desde) && desde.length <= 180 &&
      !/[\r\n]/.test(desde) &&
      /^(?:[^<>]+\s<)?[^@<>\s]+@[^@<>\s]+\.[^@<>\s]+>?$/.test(desde),
  };
  return {
    ok: Object.values(estados).every(Boolean),
    requisitos: Object.fromEntries(
      Object.entries(estados).map(([nombre, valido]) => [nombre, valido ? "OK" : "REVISAR"]),
    ),
  };
}

function mismaProcedencia(request) {
  const origin = request.headers.get("origin");
  return origin === new URL(request.url).origin;
}

async function jsonPequeno(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) return null;
  if (Number(request.headers.get("content-length") || 0) > 4096) return null;
  if (!request.body) return null;
  const lector = request.body.getReader();
  const decoder = new TextDecoder();
  let texto = "";
  let total = 0;
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > 4096) { await lector.cancel(); return null; }
    texto += decoder.decode(value, { stream: true });
  }
  texto += decoder.decode();
  try {
    const datos = JSON.parse(texto);
    return datos && typeof datos === "object" && !Array.isArray(datos) ? datos : null;
  } catch { return null; }
}

async function conDB(env, callback) {
  const { MongoClient } = await import("mongodb");
  const mongo = new MongoClient(env.MONGODB_URI);
  try {
    await mongo.connect();
    return await callback(mongo.db(DB));
  } finally {
    await mongo.close().catch(() => {});
  }
}

// Perfil asociado al correo verificado. Nunca se asigna a una cuenta hasta
// consumir correctamente el OTP enviado a ese correo.
const PAISES_COMUNIDAD = new Set([
  "Argentina", "Belice", "Bolivia", "Brasil", "Chile", "Colombia", "Costa Rica",
  "Cuba", "Ecuador", "El Salvador", "España", "Estados Unidos", "Guatemala",
  "Haití", "Honduras", "México", "Nicaragua", "Panamá", "Paraguay", "Perú",
  "Puerto Rico", "República Dominicana", "Uruguay", "Venezuela",
]);
function validarPerfil(datos) {
  if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;
  const nombre = typeof datos.nombre === "string" ? datos.nombre.trim() : "";
  const whatsapp = typeof datos.whatsapp === "string" ? datos.whatsapp.trim() : "";
  const pais = typeof datos.pais === "string" ? datos.pais.trim() : "";
  const web = typeof datos.web === "string" ? datos.web.trim() : "";
  if (nombre.length < 2 || nombre.length > 100 || /[\r\n<>]/.test(nombre) ||
      !/^\+?[0-9]{8,17}$/.test(whatsapp) || !PAISES_COMUNIDAD.has(pais) ||
      web.length > 300 || /[\r\n<>]/.test(web)) return null;
  return { nombre, whatsapp, pais, web };
}

async function verificarTurnstileRegistro(request, env, token) {
  const secret = String(env?.SERVICIO_TURNSTILE_SECRET ?? "").trim();
  if (!secret || typeof token !== "string" || token.length < 20 || token.length > 2048) return false;
  try {
    const ip = request.headers.get("CF-Connecting-IP");
    const body = new URLSearchParams({ secret, response: token });
    if (ip) body.set("remoteip", ip);
    const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body, redirect: "manual",
    });
    if (!r.ok) return false;
    const data = await r.json();
    return data?.success === true &&
      String(data.hostname || "").toLowerCase() === new URL(request.url).hostname.toLowerCase();
  } catch { return false; }
}

// Los indices TTL limpian intentos, codigos y sesiones expiradas. La validez
// se comprueba tambien por fecha, porque el borrado TTL de Mongo es asincrono.
async function indicesAcceso(db) {
  await Promise.all([
    db.collection("clientes_codigos").createIndex({ eliminarEn: 1 }, { expireAfterSeconds: 0 }),
    db.collection("clientes_sesiones").createIndex({ eliminarEn: 1 }, { expireAfterSeconds: 0 }),
    db.collection("clientes_limites").createIndex({ eliminarEn: 1 }, { expireAfterSeconds: 0 }),
  ]);
}

async function consumirCupo(db, nombre, maximo, ahora) {
  const ventana = Math.floor(ahora / HORA_MS);
  const _id = `${nombre}:${ventana}`;
  const coleccion = db.collection("clientes_limites");
  await coleccion.updateOne({ _id }, {
    $inc: { solicitudes: 1 },
    $setOnInsert: { eliminarEn: new Date((ventana + 2) * HORA_MS) },
  }, { upsert: true });
  const actual = await coleccion.findOne({ _id }, { projection: { solicitudes: 1 } });
  return (actual?.solicitudes ?? maximo + 1) <= maximo;
}

async function enviarCorreo(correo, codigo, config) {
  const mensaje = `Tu codigo de acceso a Comunidad Semanal es ${codigo}. Vence en 10 minutos. Si no lo pediste, podes ignorar este mensaje.`;
  const html = `<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;color:#252525"><h2>Acceso a Comunidad Semanal</h2><p>Tu código de verificación es:</p><p style="font-size:30px;font-weight:600;letter-spacing:6px">${codigo}</p><p>Vence en 10 minutos y solo puede usarse una vez.</p><p>Si no solicitaste este código, ignorá este mensaje.</p></div>`;
  const respuesta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${config.resend}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.desde,
      to: [correo],
      subject: "Código de acceso a Comunidad Semanal",
      text: mensaje,
      html,
    }),
  });
  return respuesta.ok;
}

async function solicitar(request, env, config, ipHash) {
  const datos = await jsonPequeno(request);
  const email = normalizarCorreo(datos?.email);
  if (!email) return responder({ ok: false, error: "Ingresá un correo válido." }, 400);
  const modo = datos?.modo === "registro" ? "registro" : "ingreso";
  if (modo === "registro") {
    if (!validarPerfil(datos?.perfil)) return responder({ ok: false, error: "Completá correctamente tus datos de registro." }, 400);
    if (!await verificarTurnstileRegistro(request, env, datos?.turnstileToken)) {
      return responder({ ok: false, error: "Completá nuevamente la verificación de seguridad." }, 403);
    }
  }
  const emailHash = hash(email);
  const ahora = Date.now();
  try {
    return await conDB(env, async (db) => {
      await indicesAcceso(db);
      if (!await consumirCupo(db, `solicitar:ip:${ipHash}`, 12, ahora) ||
          !await consumirCupo(db, `solicitar:correo:${emailHash}`, 4, ahora)) {
        return responder({ ok: false, error: "Esperá antes de solicitar otro código." }, 429);
      }

      const codigos = db.collection("clientes_codigos");
      const anterior = await codigos.findOne({ _id: emailHash });
      if (anterior?.ultimoEnvio && ahora - new Date(anterior.ultimoEnvio).getTime() < ESPERA_ENVIO_MS) {
        return responder({ ok: false, error: "Esperá un minuto antes de pedir un nuevo código." }, 429);
      }
      const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
      const codigoHash = hmacCodigo(config.otpSecret, emailHash, codigo);
      const documento = {
        codigoHash, ultimoEnvio: new Date(ahora), venceEn: new Date(ahora + VIDA_CODIGO_MS),
        eliminarEn: new Date(ahora + 24 * HORA_MS), intentos: 0,
      };
      try {
        if (!anterior) {
          await codigos.insertOne({ _id: emailHash, ...documento });
        } else {
          const resultado = await codigos.updateOne({ _id: emailHash, ultimoEnvio: anterior.ultimoEnvio }, { $set: documento });
          if (resultado.modifiedCount !== 1) return responder({ ok: false, error: "Intentá nuevamente en un minuto." }, 429);
        }
      } catch (error) {
        if (error?.code === 11000) return responder({ ok: false, error: "Intentá nuevamente en un minuto." }, 429);
        throw error;
      }

      let enviado = false;
      try { enviado = await enviarCorreo(email, codigo, config); }
      catch { enviado = false; }
      if (!enviado) {
        // Conservamos los cupos consumidos para impedir abuso contra el proveedor.
        await codigos.deleteOne({ _id: emailHash, codigoHash });
        return responder({ ok: false, error: "No se pudo enviar el correo. Intentá más tarde." }, 502);
      }
      return responder({ ok: true, mensaje: "Si el correo puede recibir mensajes, llegará un código de seis dígitos." });
    });
  } catch {
    return responder({ ok: false, error: "No se pudo iniciar el acceso en este momento." }, 503);
  }
}

async function verificar(request, env, config, ipHash) {
  const datos = await jsonPequeno(request);
  const email = normalizarCorreo(datos?.email);
  const codigo = typeof datos?.codigo === "string" ? datos.codigo : "";
  if (!email || !/^\d{6}$/.test(codigo)) return responder({ ok: false, error: "Revisá el correo y los seis dígitos." }, 400);
  const modo = datos?.modo === "registro" ? "registro" : "ingreso";
  const perfil = modo === "registro" ? validarPerfil(datos?.perfil) : null;
  if (modo === "registro" && !perfil) return responder({ ok: false, error: "Los datos de registro no son válidos." }, 400);
  const emailHash = hash(email);
  const ahora = Date.now();
  try {
    return await conDB(env, async (db) => {
      if (!await consumirCupo(db, `verificar:ip:${ipHash}`, 50, ahora) ||
          !await consumirCupo(db, `verificar:correo:${emailHash}`, 20, ahora)) {
        return responder({ ok: false, error: "Demasiados intentos. Solicitá un código más tarde." }, 429);
      }
      const codigos = db.collection("clientes_codigos");
      const pendiente = await codigos.findOne({ _id: emailHash });
      const fallo = () => responder({ ok: false, error: "Código incorrecto o vencido. Pedí uno nuevo si es necesario." }, 403);
      if (!pendiente?.codigoHash || pendiente.intentos >= 5 ||
          new Date(pendiente.venceEn).getTime() <= ahora) return fallo();
      const esperado = Buffer.from(pendiente.codigoHash, "hex");
      const recibido = Buffer.from(hmacCodigo(config.otpSecret, emailHash, codigo), "hex");
      if (esperado.length !== recibido.length || !crypto.timingSafeEqual(esperado, recibido)) {
        await codigos.updateOne({ _id: emailHash, codigoHash: pendiente.codigoHash, intentos: { $lt: 5 } },
          { $inc: { intentos: 1 } });
        return fallo();
      }
      // Consume el codigo de forma atomica: una peticion simultanea no puede usarlo dos veces.
      const consumido = await codigos.deleteOne({
        _id: emailHash, codigoHash: pendiente.codigoHash,
        intentos: { $lt: 5 }, venceEn: { $gt: new Date() },
      });
      if (consumido.deletedCount !== 1) return fallo();

      const cuentas = db.collection("clientes_usuarios");
      const _id = `correo:${emailHash}`;
      if (modo === "ingreso" && !await cuentas.findOne({ _id }, { projection: { _id: 1 } })) {
        return responder({ ok: false, error: "No hay una cuenta registrada con ese correo. Elegí Registrarme." }, 404);
      }
      await cuentas.updateOne({ _id }, {
        $setOnInsert: { email, creadoEn: new Date(ahora), origen: "comunidad_semanal" },
        $set: { ultimoAccesoEn: new Date(ahora), emailVerificado: true,
          ...(perfil ? { perfil, perfilActualizadoEn: new Date(ahora) } : {}) },
      }, { upsert: modo === "registro" });

      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHmac("sha256", config.sessionSecret).update(token).digest("hex");
      await db.collection("clientes_sesiones").insertOne({
        _id: tokenHash, usuarioId: _id,
        creadoEn: new Date(ahora), eliminarEn: new Date(ahora + VIDA_SESION_S * 1000),
      });
      const cookie = `${COOKIE}=${token}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${VIDA_SESION_S}`;
      return responder({ ok: true, registrado: true, correo: email }, 200, cookie);
    });
  } catch {
    return responder({ ok: false, error: "No se pudo completar el acceso. Intentá nuevamente." }, 503);
  }
}

function tokenSesion(request) {
  const match = (request.headers.get("cookie") || "").split(";").map(x => x.trim())
    .find(x => x.startsWith(`${COOKIE}=`));
  const token = match ? match.slice(COOKIE.length + 1) : "";
  return /^[a-f0-9]{64}$/.test(token) ? token : null;
}

async function consultarSesion(request, env, config) {
  const token = tokenSesion(request);
  if (!token) return responder({ ok: true, autenticado: false });
  try {
    return await conDB(env, async (db) => {
      const tokenHash = crypto.createHmac("sha256", config.sessionSecret).update(token).digest("hex");
      const sesion = await db.collection("clientes_sesiones").findOne({
        _id: tokenHash, eliminarEn: { $gt: new Date() },
      });
      if (!sesion) return responder({ ok: true, autenticado: false });
      const cuenta = await db.collection("clientes_usuarios").findOne({ _id: sesion.usuarioId },
        { projection: { email: 1, perfil: 1 } });
      if (!cuenta) return responder({ ok: true, autenticado: false });
      return responder({ ok: true, autenticado: true, email: cuenta.email,
        perfil: cuenta.perfil ? {
          nombre: cuenta.perfil.nombre || "", whatsapp: cuenta.perfil.whatsapp || "",
          pais: cuenta.perfil.pais || "", web: cuenta.perfil.web || "",
        } : null });
    });
  } catch { return responder({ ok: false, error: "No se pudo consultar la sesión." }, 503); }
}

async function cerrarSesion(request, env, config) {
  const token = tokenSesion(request);
  try {
    if (token) {
      await conDB(env, async (db) => {
        const _id = crypto.createHmac("sha256", config.sessionSecret).update(token).digest("hex");
        await db.collection("clientes_sesiones").deleteOne({ _id });
      });
    }
    return responder({ ok: true }, 200, `${COOKIE}=; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=0`);
  } catch { return responder({ ok: false, error: "No se pudo cerrar la sesión." }, 503); }
}

export async function ejecutarAccesoClientes(request, env) {
  const ruta = new URL(request.url).pathname;
  const accion = ruta.startsWith(RUTA) ? ruta.slice(RUTA.length) : "";
  const permitido = { solicitar: "POST", verificar: "POST", sesion: "GET", salir: "POST" };
  if (!Object.prototype.hasOwnProperty.call(permitido, accion)) {
    return responder({ ok: false, error: "Ruta no encontrada." }, 404);
  }
  if (request.method !== permitido[accion]) return responder({ ok: false, error: "Método no permitido." }, 405);
  if (request.method === "POST" && !mismaProcedencia(request)) {
    return responder({ ok: false, error: "Origen no autorizado." }, 403);
  }
  const config = configuracion(env);
  if (!config) return responder({ ok: false, error: "Acceso por correo todavía no configurado." }, 503);
  if (accion === "sesion") return consultarSesion(request, env, config);
  if (accion === "salir") return cerrarSesion(request, env, config);
  const ip = request.headers.get("CF-Connecting-IP")?.trim();
  if (!ip) return responder({ ok: false, error: "No se pudo validar el origen de la solicitud." }, 403);
  const ipHash = hash(ip);
  if (accion === "solicitar") return solicitar(request, env, config, ipHash);
  return verificar(request, env, config, ipHash);
}

// Panel de clientes registrados. No cambia los permisos de los enlaces privados
// existentes: vincular un pedido exige demostrar que se posee su clave original.
const RUTA_PANEL = "/api/servicios/clientes/panel";
const ID_PEDIDO_VALIDO = /^SER-[a-f0-9-]{36}$/i;
const CLAVE_PEDIDO_VALIDA = /^[a-f0-9]{64}$/i;

async function usuarioAutenticadoPanel(db, request, config) {
  const token = tokenSesion(request);
  if (!token) return null;
  const tokenHash = crypto.createHmac("sha256", config.sessionSecret).update(token).digest("hex");
  const sesion = await db.collection("clientes_sesiones").findOne({
    _id: tokenHash, eliminarEn: { $gt: new Date() },
  }, { projection: { usuarioId: 1 } });
  if (!sesion?.usuarioId) return null;
  const cuenta = await db.collection("clientes_usuarios").findOne({ _id: sesion.usuarioId }, {
    projection: { email: 1, emailVerificado: 1 },
  });
  return cuenta?.emailVerificado === true && typeof cuenta.email === "string"
    ? { id: sesion.usuarioId, email: cuenta.email } : null;
}

async function resumenPanel(db, usuario) {
  const documentos = await db.collection("pedidos_servicios")
    .find({ tipo: "publicaciones", clienteUsuarioId: usuario.id })
    .sort({ creadoEn: -1 }).limit(30)
    .project({ _id: 0, pedidoId: 1, estado: 1, estadoPago: 1, estadoContenidos: 1,
      estadoServicio: 1, redes: 1, creadoEn: 1, publicaciones: 1,
      modalidadContratacion: 1, prueba: 1, precioRenovacion: 1, moneda: 1,
      "negocio.nombre": 1 })
    .toArray();
  const ids = documentos.map(p => p.pedidoId).filter(x => ID_PEDIDO_VALIDO.test(x || ""));
  const conexiones = ids.length
    ? await db.collection("conexiones_meta_pedidos")
        .find({ pedidoId: { $in: ids }, plataforma: "facebook" })
        .project({ _id: 0, pedidoId: 1, nombre: 1, pageId: 1, estado: 1 }).toArray()
    : [];
  const conexionesPorPedido = new Map(conexiones.map(c => [c.pedidoId, c]));
  const pedidos = documentos.map(p => {
    const conexion = conexionesPorPedido.get(p.pedidoId);
    return {
      pedidoId: p.pedidoId,
      negocio: typeof p.negocio?.nombre === "string" ? p.negocio.nombre : "Mi emprendimiento",
      creadoEn: p.creadoEn,
      redes: Array.isArray(p.redes) ? p.redes.filter(x => x === "facebook" || x === "instagram") : [],
      estado: p.estado || "sin_estado",
      estadoPago: p.estadoPago || "pendiente",
      estadoContenidos: p.estadoContenidos || "pendiente_carga",
      estadoServicio: p.estadoServicio || "sin_activar",
      modalidad: p.modalidadContratacion || "pago",
      prueba: p.modalidadContratacion === "prueba_gratuita" ? {
        estado: p.prueba?.estado || "pendiente_activacion", inicio: p.prueba?.inicio || null,
        fin: p.prueba?.fin || null,
      } : null,
      contenidos: Array.isArray(p.publicaciones) ? p.publicaciones.map(c => ({
        id: c.id, tipo: c.tipo, estado: c.estado || "pendiente_preparacion",
      })) : [],
      facebook: conexion ? {
        nombre: conexion.nombre || "Página de Facebook",
        pageId: conexion.pageId || "",
        estado: conexion.estado || "desconocido",
      } : null,
    };
  });
  return responder({ ok: true, autenticado: true, email: usuario.email, pedidos,
    pruebaGratuitaActiva: false });
}

async function vincularPedidoPanel(db, request, usuario) {
  const datos = await jsonPequeno(request);
  const pedidoId = typeof datos?.pedidoId === "string" ? datos.pedidoId.trim() : "";
  const clave = typeof datos?.clave === "string" ? datos.clave.trim() : "";
  if (!ID_PEDIDO_VALIDO.test(pedidoId) || !CLAVE_PEDIDO_VALIDA.test(clave)) {
    return responder({ ok: false, error: "Revisá el código y la clave privada del pedido." }, 400);
  }
  const coleccion = db.collection("pedidos_servicios");
  const pedido = await coleccion.findOne({ pedidoId, tipo: "publicaciones" }, {
    projection: { _id: 1, clienteUsuarioId: 1, tokenAccesoHash: 1 },
  });
  const hashGuardado = pedido?.tokenAccesoHash;
  const calculado = hash(clave);
  if (!hashGuardado || !CLAVE_PEDIDO_VALIDA.test(hashGuardado) ||
      !crypto.timingSafeEqual(Buffer.from(calculado, "hex"), Buffer.from(hashGuardado, "hex"))) {
    return responder({ ok: false, error: "No se encontró el pedido o la clave es incorrecta." }, 404);
  }
  if (pedido.clienteUsuarioId && pedido.clienteUsuarioId !== usuario.id) {
    return responder({ ok: false, error: "Este pedido ya está vinculado a otra cuenta." }, 409);
  }
  const resultado = await coleccion.updateOne({
    _id: pedido._id, tokenAccesoHash: hashGuardado,
    $or: [{ clienteUsuarioId: { $exists: false } }, { clienteUsuarioId: usuario.id }],
  }, {
    $set: { clienteUsuarioId: usuario.id, clienteVinculadoEn: new Date() },
  });
  if (resultado.matchedCount !== 1) {
    return responder({ ok: false, error: "El pedido cambió de estado. Intentá nuevamente." }, 409);
  }
  return responder({ ok: true, vinculado: true, pedidoId });
}

// Sólo el titular de una cuenta verificada puede rotar la clave de uno de
// sus pedidos vinculados. El correo del negocio NO acredita titularidad.
async function recuperarAccesoPrivadoPanel(db, request, usuario) {
  const datos = await jsonPequeno(request);
  const pedidoId = typeof datos?.pedidoId === "string" ? datos.pedidoId.trim() : "";
  if (!ID_PEDIDO_VALIDO.test(pedidoId)) {
    return responder({ ok: false, error: "Código de pedido inválido." }, 400);
  }
  const pedidos = db.collection("pedidos_servicios");
  const pedido = await pedidos.findOne({
    pedidoId, tipo: "publicaciones", clienteUsuarioId: usuario.id,
  }, { projection: { _id: 1, tokenAccesoHash: 1 } });
  if (!pedido || !CLAVE_PEDIDO_VALIDA.test(pedido.tokenAccesoHash || "")) {
    return responder({ ok: false, error: "Pedido no encontrado o no vinculado a tu cuenta." }, 404);
  }
  // Limita las rotaciones incluso si se secuestra una sesión aún vigente.
  const permitido = await consumirCupo(db, `recuperar:usuario:${usuario.id}`, 3, Date.now());
  if (!permitido) {
    return responder({ ok: false, error: "Alcanzaste el límite de recuperaciones. Intentá más tarde." }, 429);
  }
  const tokenAcceso = crypto.randomBytes(32).toString("hex");
  const tokenAccesoHash = hash(tokenAcceso);
  const fecha = new Date();
  // La sustitución atómica invalida inmediatamente todas las claves antiguas.
  const resultado = await pedidos.updateOne({
    _id: pedido._id, clienteUsuarioId: usuario.id,
    tokenAccesoHash: pedido.tokenAccesoHash,
  }, { $set: { tokenAccesoHash, accesoPrivadoRenovadoEn: fecha, actualizadoEn: fecha } });
  if (resultado.modifiedCount !== 1) {
    return responder({ ok: false, error: "El acceso cambió recientemente. Actualizá el panel." }, 409);
  }
  // La clave solamente se devuelve en esta respuesta privada; Mongo guarda el hash.
  return responder({ ok: true, pedidoId, tokenAcceso, claveAnteriorInvalidada: true });
}

export async function ejecutarPanelClientes(request, env) {
  const ruta = new URL(request.url).pathname;
  const esResumen = ruta === RUTA_PANEL;
  const esVincular = ruta === `${RUTA_PANEL}/vincular`;
  const esRecuperar = ruta === `${RUTA_PANEL}/recuperar-acceso`;
  if (!esResumen && !esVincular && !esRecuperar) return responder({ ok: false, error: "Ruta no encontrada." }, 404);
  if (request.method !== (esResumen ? "GET" : "POST")) {
    return responder({ ok: false, error: "Método no permitido." }, 405);
  }
  if (esVincular || esRecuperar) {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const fetchSite = request.headers.get("sec-fetch-site");
    if (request.headers.get("x-comunidad-panel") !== "1" ||
        (origin ? origin !== url.origin : fetchSite !== "same-origin")) {
      return responder({ ok: false, error: "Origen no autorizado." }, 403);
    }
  }
  const config = configuracion(env);
  if (!config) return responder({ ok: false, error: "Panel de clientes no configurado." }, 503);
  try {
    return await conDB(env, async db => {
      const usuario = await usuarioAutenticadoPanel(db, request, config);
      if (!usuario) return responder({ ok: false, error: "Iniciá sesión desde Comunidad Semanal." }, 401);
      if (esResumen) return resumenPanel(db, usuario);
      if (esRecuperar) return recuperarAccesoPrivadoPanel(db, request, usuario);
      return vincularPedidoPanel(db, request, usuario);
    });
  } catch {
    return responder({ ok: false, error: "No fue posible consultar el panel." }, 503);
  }
}


// Solo identidad autenticada por OTP. Los invitados no se vinculan a cuentas
// por coincidencia con un correo no verificado.
export async function obtenerClienteRegistrado(request, env) {
  const config = configuracion(env);
  if (!config || !tokenSesion(request)) return null;
  return conDB(env, db => usuarioAutenticadoPanel(db, request, config));
}
