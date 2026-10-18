import handlerContenidoRedes from "./api/contenido-redes.js";
import handlerAdminLogin from "./api/admin/login.js";
import handlerAdminPedidos from "./api/admin/pedidos.js";
import handlerVisitas from "./api/visitas.js";
import { ejecutarPruebaConexionMeta } from "./api/servicios/meta-conexion.js";
import { ejecutarConexionMetaPedido } from "./api/servicios/meta-pedidos.js";
import { ejecutarArchivosPedido, ejecutarAdminArchivosPedido } from "./api/servicios/archivos-pedido.js";
import crypto from "crypto";

const RUTA_CONTENIDO_REDES = "/api/contenido-redes";

function sincronizarEntorno(env) {
  const claves = [
    "MONGODB_URI",
    "OPENAI_API_KEY",
    "ADMIN_PASSWORD",
    "CRON_SECRET",
    "THREADS_APP_ID",
    "THREADS_APP_SECRET",
    "INSTAGRAM_ACCESS_TOKEN",
    "FACEBOOK_PAGE_ID",
    "FACEBOOK_PAGE_ACCESS_TOKEN",
    "TELEGRAM_VISITAS_BOT_TOKEN",
    "TELEGRAM_VISITAS_CHAT_ID",
    "RESEND_API_KEY",
  ];
  for (const clave of claves) {
    if (env?.[clave] !== undefined && env?.[clave] !== null) {
      process.env[clave] = String(env[clave]);
    }
  }
}

async function leerBody(request) {
  if (
    request.method === "GET" ||
    request.method === "HEAD"
  ) {
    return {};
  }

  const tipo =
    request.headers.get("content-type") || "";

  if (
    tipo.includes(
      "application/json"
    )
  ) {
    try {
      return await request.json();
    } catch {
      return {};
    }
  }

  if (
    tipo.includes(
      "multipart/form-data"
    )
  ) {
    try {
      const formData =
        await request.formData();

      return Object.fromEntries(
        formData.entries()
      );
    } catch {
      return {};
    }
  }

  if (
    tipo.includes(
      "application/x-www-form-urlencoded"
    )
  ) {
    try {
      return Object.fromEntries(
        new URLSearchParams(
          await request.text()
        )
      );
    } catch {
      return {};
    }
  }

  return {};
}

function headersComoObjeto(request) {
  const headers = {};
  for (const [k, v] of request.headers.entries()) headers[k.toLowerCase()] = v;
  headers.cookie = request.headers.get("cookie") || "";
  headers.authorization = request.headers.get("authorization") || "";
  return headers;
}

function crearRespuestaApi(origen) {
  let statusCode = 200;
  const headers = new Headers({ "Cache-Control": "no-store" });
  let final = null;
  return {
    status(c) { statusCode = Number(c) || 200; return this; },
    setHeader(n, v) { headers.set(n, String(v)); return this; },
    json(d) {
      headers.set("Content-Type", "application/json; charset=utf-8");
      final = new Response(JSON.stringify(d), { status: statusCode, headers });
      return final;
    },
    send(d) {
      if (d !== null && typeof d === "object" && !(d instanceof ArrayBuffer)) return this.json(d);
      final = new Response(d == null ? "" : String(d), { status: statusCode, headers });
      return final;
    },
    redirect(codigoOUrl, urlOpcional) {
      let codigo = 302, url = codigoOUrl;
      if (typeof codigoOUrl === "number") { codigo = codigoOUrl; url = urlOpcional; }
      final = Response.redirect(new URL(String(url), origen).toString(), codigo);
      return final;
    },
    end() { final = new Response(null, { status: statusCode, headers }); return final; },
    obtenerRespuesta() { return final; }
  };
}

async function ejecutarHandlerContenidoRedes(request, env) {
  sincronizarEntorno(env);
  const url = new URL(request.url);
  const req = {
    method: request.method,
    url: request.url,
    query: Object.fromEntries(url.searchParams.entries()),
    body: await leerBody(request),
    headers: headersComoObjeto(request),
    env: {
      IMAGES: env.IMAGES,
      PRODUCTOS_R2: env.PRODUCTOS_R2,
      PRODUCTOS_R2_URL: "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev",
    },
  };
  const res = crearRespuestaApi(url.origin);
  const retorno = await handlerContenidoRedes(req, res);
  if (retorno instanceof Response) return retorno;
  return res.obtenerRespuesta() || Response.json({ ok:false, error:"La API no generó una respuesta." }, { status:500 });
}

async function ejecutarHandlerGenerico(request, env, handler) {
  sincronizarEntorno(env);

  const url = new URL(request.url);

  const req = {
    method: request.method,
    url: request.url,
    query: Object.fromEntries(
      url.searchParams.entries()
    ),
    body: await leerBody(request),
    headers: headersComoObjeto(request),

    env: {
      PRODUCTOS_R2: env.PRODUCTOS_R2,
      PRODUCTOS_R2_URL:
        "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev",
    },
  };

  const res = crearRespuestaApi(url.origin);

  const retorno = await handler(req, res);

  if (retorno instanceof Response) {
    return retorno;
  }

  return (
    res.obtenerRespuesta() ||
    Response.json(
      { ok: false, error: "La API no generó una respuesta." },
      { status: 500 }
    )
  );
}

// =========================================================
// PEDIDOS DE PUBLICACIONES · ETAPA 2: MONGODB, SIN COBROS ACTIVOS
// Aislado de los pedidos de la tienda y del cron de Mega Bazar.
// Precios validados en el servidor; la vista previa NO sube archivos.
// =========================================================
const PLAN_PUBLICACIONES = Object.freeze({
  id: "comunidad-semanal",
  nombre: "Comunidad Semanal",
  contenidos: 4,
  duracionDias: 7,
});

// Los precios del Worker son la fuente de verdad; no usar precioMostrado.
const PRECIOS_PUBLICACIONES = Object.freeze({
  ARS: Object.freeze({ 1: 15000, 2: 25000 }),
  USD: Object.freeze({ 1: 15, 2: 25 }),
});

// Identificadores IANA admitidos en el configurador (América y España).
const ZONAS_PUBLICACIONES = new Set([
  "America/Argentina/Buenos_Aires", "America/Belize", "America/La_Paz",
  "America/Noronha", "America/Manaus", "America/Rio_Branco",
  "America/Sao_Paulo", "America/Coyhaique", "Pacific/Easter",
  "America/Punta_Arenas", "America/Santiago", "America/Bogota",
  "America/Costa_Rica", "America/Havana", "Pacific/Galapagos",
  "America/Guayaquil", "America/El_Salvador", "Atlantic/Canary",
  "Europe/Madrid", "America/Anchorage", "America/Chicago",
  "America/Denver", "America/New_York", "Pacific/Honolulu",
  "America/Los_Angeles", "America/Phoenix", "America/Guatemala",
  "America/Port-au-Prince", "America/Tegucigalpa", "America/Tijuana",
  "America/Cancun", "America/Chihuahua", "America/Ciudad_Juarez",
  "America/Matamoros", "America/Mazatlan", "America/Mexico_City",
  "America/Hermosillo", "America/Managua", "America/Panama",
  "America/Asuncion", "America/Lima", "America/Puerto_Rico",
  "America/Santo_Domingo", "America/Montevideo", "America/Caracas",
]);
const DIAS_PUBLICACIONES = new Set([
  "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo",
]);
const HORAS_PUBLICACIONES = new Set([
  "09:00", "10:00", "12:00", "14:00", "17:00", "18:00", "19:00", "20:00", "21:00",
]);

function respuestaServicio(datos, estado = 200) {
  return Response.json(datos, {
    status: estado,
    headers: { "Cache-Control": "no-store" },
  });
}

async function leerJsonServicio(request) {
  if (!/^application\/json(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    return { error: "El pedido debe enviarse como JSON.", estado: 415 };
  }
  const lector = request.body?.getReader();
  if (!lector) return { error: "Falta la configuración del pedido.", estado: 400 };
  const decoder = new TextDecoder();
  let texto = "", bytes = 0;
  try {
    while (true) {
      const { done, value } = await lector.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 64 * 1024) {
        await lector.cancel();
        return { error: "El pedido supera el tamaño permitido.", estado: 413 };
      }
      texto += decoder.decode(value, { stream: true });
    }
    texto += decoder.decode();
    const datos = JSON.parse(texto);
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) {
      return { error: "Formato del pedido inválido.", estado: 400 };
    }
    return { datos };
  } catch {
    return { error: "No se pudo leer el JSON del pedido.", estado: 400 };
  }
}

function textoServicio(valor, maximo) {
  return typeof valor === "string" && valor.trim().length <= maximo
    ? valor.trim()
    : null;
}

function urlServicio(valor, maximo, soloHttps = false) {
  const texto = textoServicio(valor, maximo);
  if (texto === null) return null;
  if (!texto) return "";
  try {
    const url = new URL(texto);
    if ((soloHttps ? url.protocol !== "https:" : !["http:", "https:"].includes(url.protocol)) ||
        url.username || url.password || !url.hostname) return null;
    return url.toString();
  } catch {
    return null;
  }
}

// Los datos recibidos se copian campo por campo: no se persisten claves extra.
function validarConfiguracionServicio(datos) {
  if (datos.planId !== PLAN_PUBLICACIONES.id) {
    return { error: "El plan solicitado no existe." };
  }
  const redes = datos.redes;
  if (!Array.isArray(redes) || redes.length < 1 || redes.length > 2 ||
      new Set(redes).size !== redes.length ||
      !redes.every((red) => red === "instagram" || red === "facebook")) {
    return { error: "Seleccioná Instagram, Facebook o ambas redes." };
  }
  if (!ZONAS_PUBLICACIONES.has(datos.zonaHoraria)) {
    return { error: "Zona horaria no admitida." };
  }

  const n = datos.negocio;
  if (!n || typeof n !== "object" || Array.isArray(n)) {
    return { error: "Faltan los datos del emprendimiento." };
  }
  const negocio = {
    nombre: textoServicio(n.nombre, 120),
    rubro: textoServicio(n.rubro ?? "", 100),
    contacto: textoServicio(n.contacto, 120),
    email: textoServicio(n.email, 160),
    url: urlServicio(n.url ?? "", 300),
    whatsapp: textoServicio(n.whatsapp ?? "", 50),
    publico: textoServicio(n.publico ?? "", 180),
    tono: n.tono ?? "cercano",
  };
  if (!negocio.nombre || !negocio.contacto || !negocio.email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(negocio.email) ||
      Object.values(negocio).some((valor) => valor === null) ||
      !["cercano", "profesional", "informal", "promocional"].includes(negocio.tono)) {
    return { error: "Revisá los datos del emprendimiento y el correo electrónico." };
  }
  if (negocio.whatsapp && !/^[+\d()\s.-]{5,50}$/.test(negocio.whatsapp)) {
    return { error: "El número de WhatsApp no es válido." };
  }

  if (!Array.isArray(datos.publicaciones) || datos.publicaciones.length !== PLAN_PUBLICACIONES.contenidos) {
    return { error: "El plan incluye exactamente cuatro contenidos." };
  }
  const publicaciones = datos.publicaciones.map((p, indice) => {
    if (!p || typeof p !== "object" || Array.isArray(p) ||
        p.id !== `contenido-${indice + 1}` ||
        !["reel", "carrusel", "imagen"].includes(p.tipo) ||
        !DIAS_PUBLICACIONES.has(p.dia) || !HORAS_PUBLICACIONES.has(p.hora)) return null;
    if (!(p.tipo === "reel" ? ["9:16"] : ["4:5", "1:1"]).includes(p.formato)) return null;

    const descripcion = textoServicio(p.descripcion ?? "", 1500);
    const ctaInstagram = textoServicio(p.ctaInstagram ?? "", 100);
    const ctaFacebook = textoServicio(p.ctaFacebook ?? "", 100);
    const urlFacebook = urlServicio(p.urlFacebook ?? "", 500, true);
    const hashtags = textoServicio(p.hashtags ?? "", 240);
    if ([descripcion, ctaInstagram, ctaFacebook, urlFacebook, hashtags].some((v) => v === null)) return null;

    const archivos = p.archivosSeleccionados ?? [];
    if (!Array.isArray(archivos) || archivos.length > (p.tipo === "carrusel" ? 10 : 1)) return null;
    const metadatos = archivos.map((archivo) => {
      if (!archivo || typeof archivo !== "object" || Array.isArray(archivo)) return null;
      const nombre = textoServicio(archivo.nombre, 180);
      const tipo = textoServicio(archivo.tipo, 80);
      const limite = p.tipo === "reel" ? 150 * 1024 * 1024 : 20 * 1024 * 1024;
      if (!nombre || tipo === null || !Number.isSafeInteger(archivo.tamano) ||
          archivo.tamano <= 0 || archivo.tamano > limite) return null;
      if (p.tipo === "reel" && tipo !== "video/mp4" && !/\.mp4$/i.test(nombre)) return null;
      if (p.tipo !== "reel" && !["image/jpeg", "image/png", "image/webp", ""].includes(tipo) &&
          !/\.(jpe?g|png|webp)$/i.test(nombre)) return null;
      return { nombre, tipo, tamano: archivo.tamano, estado: "pendiente_subida" };
    });
    if (metadatos.some((archivo) => !archivo)) return null;
    return {
      id: p.id, tipo: p.tipo, formato: p.formato,
      diaPreferido: p.dia, horaLocalPreferida: p.hora,
      descripcion, ctaInstagram, ctaFacebook, urlFacebook, hashtags,
      archivos: metadatos,
      fechaHoraDefinitiva: null,
      estado: "pendiente_preparacion",
    };
  });
  if (publicaciones.some((publicacion) => !publicacion)) {
    return { error: "Revisá los datos de las cuatro publicaciones." };
  }
  return { configuracion: {
    redes: [...redes], zonaHoraria: datos.zonaHoraria, negocio, publicaciones,
  } };
}

// Para abrir pedidos públicos se requiere Turnstile; Admin puede probar
// la escritura con su sesión existente. Esta verificación NO confirma pagos.
// Limitadores nativos de Cloudflare Workers. Protegen las rutas de servicios;
// los pedidos de la tienda y el calendario automatico no utilizan estos bindings.
function limitadoresServicioPreparados(env) {
  return [
    env?.SERVICIO_LIMITE_PEDIDOS,
    env?.SERVICIO_LIMITE_CONSULTAS,
    env?.SERVICIO_LIMITE_COMPROBANTES,
  ].every((binding) => typeof binding?.limit === "function");
}

async function comprobarLimiteServicio(request, env, nombreBinding) {
  const limitador = env?.[nombreBinding];
  if (typeof limitador?.limit !== "function") {
    return respuestaServicio({ ok: false, error: "La proteccion de solicitudes aun no esta configurada." }, 503);
  }
  // Creacion publica sin sesion: usar IP de Cloudflare (no X-Forwarded-For).
  // El limite es aproximado; usuarios que comparten IP pueden verse afectados.
  const ip = request.headers.get("CF-Connecting-IP")?.trim();
  if (!ip) {
    return respuestaServicio({ ok: false, error: "No se pudo verificar el origen de la solicitud." }, 403);
  }
  const clave = crypto.createHash("sha256").update(ip).digest("hex");
  try {
    const resultado = await limitador.limit({ key: clave });
    if (!resultado?.success) {
      return respuestaServicio({
        ok: false,
        error: "Se realizaron demasiadas solicitudes. Espera un minuto e intenta nuevamente.",
      }, 429);
    }
    return null;
  } catch (error) {
    console.error("Error del limitador de servicios:", error);
    return respuestaServicio({ ok: false, error: "La proteccion de solicitudes no esta disponible." }, 503);
  }
}

async function validarAccesoCrearServicio(request, env, datos) {
  if (adminAutorizadoWorker(request, env)) return { ok: true };
  if (!env.SERVICIO_TURNSTILE_SECRET) {
    return { error: "Aún no está habilitada la validación de pedidos públicos.", estado: 503 };
  }
  const token = textoServicio(datos.turnstileToken, 2048);
  if (!token) return { error: "Completá la verificación de seguridad.", estado: 403 };
  try {
    const formulario = new URLSearchParams({
      secret: env.SERVICIO_TURNSTILE_SECRET,
      response: token,
    });
    const ip = request.headers.get("CF-Connecting-IP");
    if (ip) formulario.set("remoteip", ip);
    const respuesta = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST", body: formulario,
    });
    if (!respuesta.ok) return { error: "No se pudo completar la verificación de seguridad.", estado: 503 };
    const verificacion = await respuesta.json();
    // El token debe haberse emitido para el mismo dominio de este sitio.
    const hostnameEsperado = new URL(request.url).hostname.toLowerCase();
    const hostnameVerificado = String(verificacion.hostname ?? "").toLowerCase();
    return verificacion.success && hostnameVerificado === hostnameEsperado
      ? { ok: true }
      : { error: "Verificación de seguridad inválida, vencida o de otro dominio.", estado: 403 };
  } catch {
    return { error: "No se pudo comprobar la verificación de seguridad.", estado: 503 };
  }
}

async function apiPedidosPublicaciones(request, env, ruta) {
  // El Site Key es público y puede viajar en la respuesta del plan.
  // La Secret Key nunca se devuelve al navegador.
  const turnstileSiteKey = String(env?.SERVICIO_TURNSTILE_SITE_KEY ?? "").trim();
  const turnstilePreparado = Boolean(turnstileSiteKey && env?.SERVICIO_TURNSTILE_SECRET);
  const proteccionesPreparadas = limitadoresServicioPreparados(env);
  const transferenciaPreparada = transferenciasServiciosHabilitadas(env) &&
    Boolean(cuentaTransferenciaServicio(env)) && Boolean(bucketComprobantesServicio(env));
  if (ruta === "/api/servicios/publicaciones/plan") {
    if (request.method !== "GET") return respuestaServicio({ ok: false, error: "Método no permitido." }, 405);
    return respuestaServicio({
      ok: true, plan: PLAN_PUBLICACIONES,
      precios: PRECIOS_PUBLICACIONES,
      mediosPago: { ARS: "transferencia", USD: "paypal" },
      turnstileSiteKey: turnstileSiteKey,
      proteccionesPreparadas,
      pedidosHabilitados: String(env?.SERVICIO_PEDIDOS_HABILITADOS ?? "").toLowerCase() === "true" &&
        turnstilePreparado && transferenciaPreparada && proteccionesPreparadas,
      transferenciasHabilitadas: transferenciaPreparada && proteccionesPreparadas,
      cobrosHabilitados: false,
    });
  }
  if (request.method !== "POST") {
    return respuestaServicio({ ok: false, error: "Método no permitido." }, 405);
  }
  if (String(env?.SERVICIO_PEDIDOS_HABILITADOS ?? "").toLowerCase() !== "true" ||
      !turnstilePreparado || !transferenciaPreparada || !proteccionesPreparadas) {
    return respuestaServicio({ ok: false, error: "La contratación de publicaciones aún no está habilitada." }, 503);
  }
  const exceso = await comprobarLimiteServicio(request, env, "SERVICIO_LIMITE_PEDIDOS");
  if (exceso) return exceso;
  const lectura = await leerJsonServicio(request);
  if (lectura.error) return respuestaServicio({ ok: false, error: lectura.error }, lectura.estado);
  const datos = lectura.datos;
  // La contratacion inicial es solo por transferencia ARS; PayPal aun no esta integrado.
  if (datos.moneda !== "ARS") {
    return respuestaServicio({ ok: false, error: "Por ahora solo se admiten contrataciones en ARS." }, 400);
  }
  const validacion = validarConfiguracionServicio(datos);
  if (validacion.error) return respuestaServicio({ ok: false, error: validacion.error }, 400);
  const acceso = await validarAccesoCrearServicio(request, env, datos);
  if (acceso.error) return respuestaServicio({ ok: false, error: acceso.error }, acceso.estado);

  const precio = PRECIOS_PUBLICACIONES[datos.moneda][validacion.configuracion.redes.length];
  const metodoPago = datos.moneda === "ARS" ? "transferencia" : "paypal";
  const estado = datos.moneda === "ARS" ? "pendiente_comprobante" : "pendiente_paypal";
  let cliente;
  try {
    sincronizarEntorno(env);
    const { MongoClient } = await import("mongodb");
    cliente = new MongoClient(env.MONGODB_URI);
    await cliente.connect();
    const coleccion = cliente.db("andres_imprimibles").collection("pedidos_servicios");
    const fecha = new Date();
    const pedidoId = `SER-${crypto.randomUUID()}`;
    const tokenAcceso = crypto.randomBytes(32).toString("hex");
    const tokenAccesoHash = crypto.createHash("sha256").update(tokenAcceso).digest("hex");
    await coleccion.insertOne({
      pedidoId, tokenAccesoHash, tipo: "publicaciones", planId: PLAN_PUBLICACIONES.id,
      nombrePlan: PLAN_PUBLICACIONES.nombre, contenidos: PLAN_PUBLICACIONES.contenidos,
      duracionDias: PLAN_PUBLICACIONES.duracionDias,
      moneda: datos.moneda, precio, metodoPago,
      cantidadPublicaciones: PLAN_PUBLICACIONES.contenidos * validacion.configuracion.redes.length,
      ...validacion.configuracion,
      modalidadCalendario: "periodo_flexible_7_dias_consecutivos",
      criterioInicio: "primera_publicacion_confirmada_tras_pago_cuentas_y_aprobacion",
      fechaInicioServicio: null, fechaFinServicio: null,
      estado, estadoPago: "pendiente", estadoCuentas: "pendiente_vinculacion",
      estadoContenidos: "pendiente_carga", estadoServicio: "sin_activar",
      archivosSubidos: false, comprobante: null,
      paypalOrderId: null, paypalCaptureId: null,
      creadoEn: fecha, actualizadoEn: fecha, pagadoEn: null, activadoEn: null,
      historialEstados: [{ estado, fecha }],
    });
    return respuestaServicio({
      ok: true, pedidoId, tokenAcceso, planId: PLAN_PUBLICACIONES.id,
      moneda: datos.moneda, precio, metodoPago, estado,
      pagoHabilitado: false,
    }, 201);
  } catch (error) {
    console.error("Error guardando pedido de publicaciones en MongoDB:", error);
    return respuestaServicio({ ok: false, error: "No se pudo guardar el pedido de publicaciones." }, 500);
  } finally {
    if (cliente) await cliente.close().catch((error) => console.error("MongoDB close:", error));
  }
}

// =========================================================
// TRANSFERENCIAS DE PUBLICACIONES · ETAPA 2
// Independientes de "pedidos" (tienda). NO procesa cobros automáticos.
// Comprobantes únicamente en un bucket R2 PRIVADO.
// =========================================================
const ESTADOS_TRANSFERENCIA_SERVICIO = Object.freeze({
  ESPERANDO: "pendiente_comprobante",
  COMPROBANTE: "verificando_comprobante",
  VERIFICANDO: "verificando_pago",
  COMPLETANDO: "completando_operacion",
});

function transferenciasServiciosHabilitadas(env) {
  return String(env?.SERVICIO_TRANSFERENCIAS_HABILITADAS ?? "").toLowerCase() === "true";
}

function cuentaTransferenciaServicio(env) {
  const titular = String(env?.SERVICIO_TRANSFERENCIA_TITULAR ?? "").trim();
  const entidad = String(env?.SERVICIO_TRANSFERENCIA_ENTIDAD ?? "").trim();
  const alias = String(env?.SERVICIO_TRANSFERENCIA_ALIAS ?? "").trim();
  const cbuCvu = String(env?.SERVICIO_TRANSFERENCIA_CBU_CVU ?? "").replace(/\s/g, "");
  if (!titular || titular.length > 120 || !entidad || entidad.length > 80 ||
      !/^[\w.-]{6,60}$/.test(alias) || !/^\d{22}$/.test(cbuCvu)) return null;
  return { titular, entidad, alias, cbuCvu };
}

function pedidoServicioIdValido(valor) {
  return typeof valor === "string" && /^SER-[a-f0-9-]{36}$/i.test(valor);
}

function tokenClienteServicio(request) {
  const autorizacion = request.headers.get("authorization") || "";
  const match = /^Bearer ([a-f0-9]{64})$/i.exec(autorizacion);
  return match?.[1] || null;
}

function clienteServicioAutorizado(request, pedido) {
  const token = tokenClienteServicio(request);
  const hashGuardado = pedido?.tokenAccesoHash;
  if (!token || typeof hashGuardado !== "string" || !/^[a-f0-9]{64}$/i.test(hashGuardado)) return false;
  const calculado = crypto.createHash("sha256").update(token).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(calculado, "hex"), Buffer.from(hashGuardado, "hex"));
}

async function conColeccionServicios(env, accion) {
  sincronizarEntorno(env);
  if (!env?.MONGODB_URI) throw new Error("MongoDB no configurado.");
  const { MongoClient } = await import("mongodb");
  const cliente = new MongoClient(env.MONGODB_URI);
  try {
    await cliente.connect();
    return await accion(cliente.db("andres_imprimibles").collection("pedidos_servicios"));
  } finally {
    await cliente.close().catch(() => {});
  }
}

function bucketComprobantesServicio(env) {
  // Nunca usar PRODUCTOS_R2: su contenido puede estar expuesto públicamente.
  const bucket = env?.SERVICIOS_COMPROBANTES_R2;
  return bucket?.put && bucket?.get ? bucket : null;
}

async function leerArchivoComprobanteServicio(request, maxBytes) {
  const declarado = Number(request.headers.get("content-length") || 0);
  if (declarado > maxBytes) return null;
  if (!request.body) return null;
  const lector = request.body.getReader();
  let total = 0;
  const partes = [];
  while (true) {
    const { done, value } = await lector.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) { await lector.cancel(); return null; }
    partes.push(value);
  }
  if (total < 100) return null;
  const resultado = new Uint8Array(total);
  let posicion = 0;
  for (const parte of partes) { resultado.set(parte, posicion); posicion += parte.byteLength; }
  return resultado;
}

function tipoComprobanteServicio(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { tipo: "image/jpeg", extension: "jpg" };
  }
  if ([137, 80, 78, 71, 13, 10, 26, 10].every((b, i) => bytes[i] === b)) {
    return { tipo: "image/png", extension: "png" };
  }
  if (bytes[0] === 37 && bytes[1] === 80 && bytes[2] === 68 && bytes[3] === 70 && bytes[4] === 45) {
    return { tipo: "application/pdf", extension: "pdf" };
  }
  return null;
}

async function apiTransferenciaServicio(request, env, ruta) {
  if (!transferenciasServiciosHabilitadas(env)) {
    return respuestaServicio({ ok: false, error: "Las transferencias de publicaciones aún no están habilitadas." }, 503);
  }
  const cuenta = cuentaTransferenciaServicio(env);
  if (!cuenta) return respuestaServicio({ ok: false, error: "La cuenta bancaria todavía no está configurada." }, 503);

  const subir = ruta.endsWith("/comprobante");
  if (request.method !== (subir ? "POST" : "GET")) {
    return respuestaServicio({ ok: false, error: "Método no permitido." }, 405);
  }
  const pedidoId = new URL(request.url).searchParams.get("pedidoId");
  if (!pedidoServicioIdValido(pedidoId)) return respuestaServicio({ ok: false, error: "Identificador de pedido inválido." }, 400);
  const exceso = await comprobarLimiteServicio(request, env,
    subir ? "SERVICIO_LIMITE_COMPROBANTES" : "SERVICIO_LIMITE_CONSULTAS");
  if (exceso) return exceso;
  try {
    return await conColeccionServicios(env, async (coleccion) => {
      const pedido = await coleccion.findOne({ pedidoId, tipo: "publicaciones", metodoPago: "transferencia", moneda: "ARS" });
      if (!pedido || !clienteServicioAutorizado(request, pedido)) {
        return respuestaServicio({ ok: false, error: "Pedido no encontrado o acceso no autorizado." }, 404);
      }
      if (!subir) {
        return respuestaServicio({
          ok: true, pedidoId, moneda: "ARS", precio: pedido.precio,
          estado: pedido.estado, cuenta,
          comprobanteRecibido: Boolean(pedido.comprobante),
        });
      }
      if (pedido.estado !== ESTADOS_TRANSFERENCIA_SERVICIO.ESPERANDO) {
        return respuestaServicio({ ok: false, error: "Este pedido ya tiene un comprobante o no admite nuevas cargas." }, 409);
      }
      const bucket = bucketComprobantesServicio(env);
      if (!bucket) return respuestaServicio({ ok: false, error: "El almacenamiento privado de comprobantes no está preparado." }, 503);
      if (!/^(image\/jpeg|image\/png|application\/pdf)(?:;|$)/i.test(request.headers.get("content-type") || "")) {
        return respuestaServicio({ ok: false, error: "Adjuntá una imagen JPG/PNG o un PDF." }, 415);
      }
      const bytes = await leerArchivoComprobanteServicio(request, 8 * 1024 * 1024);
      if (!bytes) return respuestaServicio({ ok: false, error: "El comprobante debe ocupar entre 100 bytes y 8 MB." }, 413);
      const formato = tipoComprobanteServicio(bytes);
      if (!formato) return respuestaServicio({ ok: false, error: "El comprobante no es un JPG, PNG o PDF válido." }, 415);
      const fecha = new Date();
      const clave = `comprobantes/publicaciones/${pedidoId}/${crypto.randomUUID()}.${formato.extension}`;
      await bucket.put(clave, bytes, { httpMetadata: { contentType: formato.tipo } });
      try {
        const resultado = await coleccion.updateOne(
          { _id: pedido._id, estado: ESTADOS_TRANSFERENCIA_SERVICIO.ESPERANDO, comprobante: null },
          {
            $set: {
              comprobante: { r2Key: clave, tipo: formato.tipo, tamano: bytes.byteLength, subidoEn: fecha },
              estado: ESTADOS_TRANSFERENCIA_SERVICIO.COMPROBANTE,
              estadoPago: "verificando_comprobante", actualizadoEn: fecha,
            },
            $push: { historialEstados: { estado: ESTADOS_TRANSFERENCIA_SERVICIO.COMPROBANTE, fecha } },
          }
        );
        if (resultado.modifiedCount !== 1) {
          await bucket.delete(clave);
          return respuestaServicio({ ok: false, error: "El pedido cambió de estado. Actualizá la página." }, 409);
        }
      } catch (error) { await bucket.delete(clave).catch(() => {}); throw error; }
      return respuestaServicio({ ok: true, pedidoId, estado: ESTADOS_TRANSFERENCIA_SERVICIO.COMPROBANTE }, 201);
    });
  } catch (error) {
    console.error("Error en transferencia de publicaciones:", error);
    return respuestaServicio({ ok: false, error: "No se pudo procesar la transferencia del servicio." }, 500);
  }
}

async function apiAdminTransferenciasServicio(request, env) {
  if (!adminAutorizadoWorker(request, env)) return respuestaServicio({ ok: false, error: "No autorizado." }, 401);
  const url = new URL(request.url);
  const accion = url.searchParams.get("accion") || "listar";
  if (!((accion === "listar" || accion === "comprobante") && request.method === "GET") &&
      !(accion === "avanzar" && request.method === "POST")) {
    return respuestaServicio({ ok: false, error: "Método o acción no permitidos." }, 405);
  }
  // La sesión admin usa cookies; para mutaciones, exigir mismo origen como defensa CSRF.
  if (accion === "avanzar" && request.headers.get("origin") !== url.origin) {
    return respuestaServicio({ ok: false, error: "Origen no autorizado." }, 403);
  }
  try {
    return await conColeccionServicios(env, async (coleccion) => {
      if (accion === "listar") {
        const pedidos = await coleccion.find({ tipo: "publicaciones", metodoPago: "transferencia", pedidoId: /^SER-/ })
          .sort({ creadoEn: -1 }).limit(100)
          .project({ _id: 0, pedidoId: 1, precio: 1, moneda: 1, estado: 1, creadoEn: 1,
            "negocio.nombre": 1, "negocio.email": 1, comprobante: 1 }).toArray();
        return respuestaServicio({ ok: true, pedidos: pedidos.map((p) => ({
          pedidoId: p.pedidoId, precio: p.precio, moneda: p.moneda, estado: p.estado,
          creadoEn: p.creadoEn, negocio: p.negocio,
          comprobanteRecibido: Boolean(p.comprobante),
        })) });
      }
      let pedidoId;
      if (accion === "comprobante") pedidoId = url.searchParams.get("pedidoId");
      else {
        const lectura = await leerJsonServicio(request);
        if (lectura.error) return respuestaServicio({ ok: false, error: lectura.error }, lectura.estado);
        pedidoId = lectura.datos.pedidoId;
      }
      if (!pedidoServicioIdValido(pedidoId)) return respuestaServicio({ ok: false, error: "Pedido inválido." }, 400);
      const pedido = await coleccion.findOne({ pedidoId, tipo: "publicaciones", metodoPago: "transferencia" });
      if (!pedido) return respuestaServicio({ ok: false, error: "Pedido no encontrado." }, 404);
      if (accion === "comprobante") {
        if (!pedido.comprobante?.r2Key) return respuestaServicio({ ok: false, error: "El pedido no tiene comprobante." }, 404);
        const bucket = bucketComprobantesServicio(env);
        if (!bucket) return respuestaServicio({ ok: false, error: "Bucket privado no disponible." }, 503);
        const objeto = await bucket.get(pedido.comprobante.r2Key);
        if (!objeto) return respuestaServicio({ ok: false, error: "No se encontró el comprobante." }, 404);
        return new Response(objeto.body, { headers: {
          "Content-Type": pedido.comprobante.tipo,
          "Content-Disposition": `inline; filename="comprobante-${pedidoId}.${pedido.comprobante.tipo === "application/pdf" ? "pdf" : pedido.comprobante.tipo === "image/png" ? "png" : "jpg"}"`,
          "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
        } });
      }
      let proximo, estadoPago;
      if (pedido.estado === ESTADOS_TRANSFERENCIA_SERVICIO.COMPROBANTE) {
        proximo = ESTADOS_TRANSFERENCIA_SERVICIO.VERIFICANDO;
        estadoPago = "verificando";
      } else if (pedido.estado === ESTADOS_TRANSFERENCIA_SERVICIO.VERIFICANDO) {
        proximo = ESTADOS_TRANSFERENCIA_SERVICIO.COMPLETANDO;
        estadoPago = "confirmado";
      } else {
        return respuestaServicio({ ok: false, error: "Este pedido no admite avanzar de estado." }, 409);
      }
      const fecha = new Date();
      const cambios = { estado: proximo, estadoPago, actualizadoEn: fecha };
      if (proximo === ESTADOS_TRANSFERENCIA_SERVICIO.COMPLETANDO) cambios.pagadoEn = fecha;
      const resultado = await coleccion.updateOne(
        { _id: pedido._id, estado: pedido.estado, "comprobante.r2Key": { $exists: true } },
        { $set: cambios, $push: { historialEstados: { estado: proximo, fecha } } }
      );
      if (resultado.modifiedCount !== 1) {
        return respuestaServicio({ ok: false, error: "El estado cambió. Actualizá el panel." }, 409);
      }
      // Pago confirmado != servicio activado. El contenido requiere aprobación posterior.
      return respuestaServicio({ ok: true, pedidoId, estado: proximo, estadoPago, servicioActivado: false });
    });
  } catch (error) {
    console.error("Error en administración de transferencias de servicios:", error);
    return respuestaServicio({ ok: false, error: "No se pudo completar la operación." }, 500);
  }
}

// =========================================================
// FACEBOOK STORY: imagen original y JPEG final desde React/Canvas.
// Ambas rutas requieren la sesión de Admin. Sin Cloudflare Images.
// =========================================================
const URL_R2_STORIES =
  "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev";

function respuestaStoryError(mensaje, estado = 400) {
  return Response.json({ ok: false, error: mensaje }, { status: estado });
}

async function obtenerProductoStory(productoId, env) {
  const id = String(productoId || "").trim();
  if (!id || id.length > 160) return null;
  sincronizarEntorno(env);
  const { conectarMongoDB } = await import("./lib/mongodb.js");
  const db = await conectarMongoDB();
  return db.collection("productos").findOne({ id });
}

async function imagenOriginalStory(request, env) {
  if (!adminAutorizadoWorker(request, env)) {
    return respuestaStoryError("No autorizado", 401);
  }
  if (request.method !== "GET") {
    return respuestaStoryError("Método no permitido", 405);
  }
  const id = new URL(request.url).searchParams.get("productoId");
  const producto = await obtenerProductoStory(id, env);
  const original = String(producto?.imagenes?.redes?.vertical?.presentacion || "").trim();
  if (!/^https:\/\//i.test(original)) {
    return respuestaStoryError("No se encontró la imagen vertical original del producto.", 404);
  }

  // La URL se lee solamente de MongoDB: el cliente no puede convertir
  // este endpoint autenticado en un proxy de URLs arbitrarias.
  const prefijo = `${URL_R2_STORIES}/`;
  let bytes;
  let tipo;
  if (original.startsWith(prefijo) && env.PRODUCTOS_R2?.get) {
    const clave = decodeURIComponent(new URL(original).pathname.slice(1));
    if (!clave || clave.includes("..")) return respuestaStoryError("Clave R2 no válida", 400);
    const objeto = await env.PRODUCTOS_R2.get(clave);
    if (!objeto) return respuestaStoryError("La imagen original no existe en R2", 404);
    tipo = objeto.httpMetadata?.contentType || "image/jpeg";
    bytes = await objeto.arrayBuffer();
  } else {
    const url = new URL(original);
    if (url.protocol !== "https:" || url.username || url.password) {
      return respuestaStoryError("URL de imagen no válida", 400);
    }
    const respuesta = await fetch(url.toString(), { redirect: "error" });
    if (!respuesta.ok) return respuestaStoryError(`Error descargando la imagen original (${respuesta.status})`, 502);
    tipo = respuesta.headers.get("content-type") || "";
    if (!/^image\/(png|jpeg|webp)(?:;|$)/i.test(tipo)) {
      return respuestaStoryError("El recurso original no es JPG, PNG o WebP", 422);
    }
    bytes = await respuesta.arrayBuffer();
  }
  if (bytes.byteLength < 100 || bytes.byteLength > 12 * 1024 * 1024) {
    return respuestaStoryError("La imagen original debe pesar menos de 12 MB", 413);
  }
  if (!/^image\/(png|jpeg|webp)/i.test(tipo)) {
    return respuestaStoryError("Formato original no admitido", 422);
  }
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": tipo,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

async function subirImagenStoryCanvas(request, env) {
  if (!adminAutorizadoWorker(request, env)) {
    return respuestaStoryError("No autorizado", 401);
  }
  if (request.method !== "POST") return respuestaStoryError("Método no permitido", 405);
  const id = String(new URL(request.url).searchParams.get("productoId") || "").trim();
  if (!id || id.length > 160 || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return respuestaStoryError("ID de producto no válido", 400);
  }
  if (!env.PRODUCTOS_R2?.put || !env.PRODUCTOS_R2?.head) {
    return respuestaStoryError("Falta el binding PRODUCTOS_R2", 503);
  }
  const producto = await obtenerProductoStory(id, env);
  if (!producto) return respuestaStoryError("El producto no existe", 404);
  if (!String(producto.imagenes?.redes?.vertical?.presentacion || "").startsWith("https://")) {
    return respuestaStoryError("El producto no tiene una imagen vertical pública", 422);
  }
  if (!/^image\/jpeg(?:;|$)/i.test(request.headers.get("content-type") || "")) {
    return respuestaStoryError("Se requiere un JPEG generado por Canvas", 415);
  }
  const longitud = Number(request.headers.get("content-length") || 0);
  if (longitud > 8 * 1024 * 1024) return respuestaStoryError("JPEG demasiado grande", 413);
  const bytes = await request.arrayBuffer();
  if (bytes.byteLength < 100 || bytes.byteLength > 8 * 1024 * 1024) {
    return respuestaStoryError("JPEG vacío o demasiado grande", 413);
  }
  const firma = new Uint8Array(bytes);
  if (firma[0] !== 0xff || firma[1] !== 0xd8 || firma[2] !== 0xff) {
    return respuestaStoryError("El archivo no es un JPEG válido", 415);
  }
  const hash = crypto.createHash("sha256").update(Buffer.from(bytes)).digest("hex");
  const clave = `redes/facebook-stories/${id}/canvas-v1-${hash.slice(0, 24)}.jpg`;
  if (!(await env.PRODUCTOS_R2.head(clave))) {
    await env.PRODUCTOS_R2.put(clave, bytes, {
      httpMetadata: {
        contentType: "image/jpeg",
        cacheControl: "public, max-age=31536000, immutable",
      },
    });
  }
  return Response.json({
    ok: true,
    imagenUrl: `${URL_R2_STORIES}/${clave}`,
  }, { headers: { "Cache-Control": "no-store" } });
}

async function pruebaMongoDB(env) {
  sincronizarEntorno(env);
  if (!env.MONGODB_URI) return Response.json({ ok:false, error:"MONGODB_URI no está configurado" }, { status:500 });
  try {
    const { MongoClient } = await import("mongodb");
    const cliente = new MongoClient(env.MONGODB_URI);
    await cliente.connect();
    await cliente.db("andres_imprimibles").command({ ping:1 });
    await cliente.close();
    return Response.json({ ok:true, mensaje:"Cloudflare conectado correctamente a MongoDB" });
  } catch (error) {
    return Response.json({ ok:false, error:error?.message || "Error conectando con MongoDB" }, { status:500 });
  }
}

async function diagnosticoRedes(env) {
  sincronizarEntorno(env);

  try {
    const { MongoClient } = await import("mongodb");
    const cliente = new MongoClient(env.MONGODB_URI);

    await cliente.connect();

    const programados = await cliente
      .db("andres_imprimibles")
      .collection("contenido_redes")
      .countDocuments({ estado: "programado" });

    await cliente.close();

    return Response.json({
      ok: true,
      programados
    });
  } catch (error) {
    return Response.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}

function autorizacionCron(env) {
  if (!env?.CRON_SECRET) throw new Error("Falta configurar CRON_SECRET en Cloudflare.");
  return `Bearer ${env.CRON_SECRET}`;
}

async function ejecutarCronRedes(env) {
  sincronizarEntorno(env);
  const request = new Request(
    "https://andrestrotamundos.local/api/contenido-redes?accion=ejecutar-programadas",
    { method:"GET", headers:{ Authorization: autorizacionCron(env) } }
  );
  const respuesta = await ejecutarHandlerContenidoRedes(request, env);
  const texto = await respuesta.text();
  if (!respuesta.ok) throw new Error(`Cron de redes falló (${respuesta.status}): ${texto}`);
  console.log("Cron de redes ejecutado correctamente:", texto);
}

export default {
  async fetch(request, env) {
    sincronizarEntorno(env);
    const url = new URL(request.url);

    
if (url.pathname === "/api/diagnostico-facebook") {
  if (!adminAutorizadoWorker(request, env)) {
    return Response.json(
      { error: "No autorizado" },
      { status: 401 }
    );
  }

  return Response.json({
    pageIdEnCloudflare:
      Boolean(String(env.FACEBOOK_PAGE_ID || "").trim()),

    tokenEnCloudflare:
      Boolean(String(env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim()),

    pageIdEnProceso:
      Boolean(String(process.env.FACEBOOK_PAGE_ID || "").trim()),

    tokenEnProceso:
      Boolean(String(process.env.FACEBOOK_PAGE_ACCESS_TOKEN || "").trim())
  });
}
    

    if (url.pathname === "/api/admin/story-imagen-origen") {
      try { return await imagenOriginalStory(request, env); }
      catch (error) {
        console.error("Error leyendo imagen original de Story:", error);
        return respuestaStoryError(error?.message || "No se pudo leer la imagen original", 500);
      }
    }

    if (url.pathname === "/api/admin/story-imagen-cta") {
      try { return await subirImagenStoryCanvas(request, env); }
      catch (error) {
        console.error("Error subiendo imagen Canvas de Story:", error);
        return respuestaStoryError(error?.message || "No se pudo guardar la imagen Story", 500);
      }
    }

    if (url.pathname === "/api/ia/copys") {
  if (
    !adminAutorizadoWorker(
      request,
      env
    )
  ) {
    return Response.json(
      {
        ok: false,
        error: "No autorizado",
      },
      { status: 401 }
    );
  }

  try {
    return await generarCopyConIA(
      request,
      env
    );
  } catch (error) {
    console.error(
      "Error ejecutando Workers AI:",
      error
    );

    return Response.json(
      {
        ok: false,
        error:
          error?.message ||
          "Error generando contenido con IA",
      },
      { status: 500 }
    );
  }
}

    // METADATOS DE PRODUCTOS PARA WHATSAPP Y FACEBOOK
if (
  request.method === "GET" &&
  /^\/tienda\/[^/]+\/?$/.test(url.pathname) &&
  /facebookexternalhit|facebot|whatsapp|twitterbot|telegrambot|linkedinbot|pinterest|discordbot/i.test(
    request.headers.get("user-agent") || ""
  )
) {
  const productoId = decodeURIComponent(
    url.pathname.replace(/^\/tienda\//, "").replace(/\/$/, "")
  );

  const urlInterna = new URL(request.url);
  urlInterna.pathname = "/api/admin/pedidos";
  urlInterna.search = "";

  urlInterna.searchParams.set("accion", "preview-producto");
  urlInterna.searchParams.set("id", productoId);

  return await ejecutarHandlerGenerico(
    new Request(urlInterna.toString(), request),
    env,
    handlerAdminPedidos
  );
}

    /* =========================
   PREVIEWS PARA COMPARTIR
========================= */

if (
  url.pathname.startsWith("/compartir/") ||
  url.pathname.startsWith("/compartir-facebook/")
) {
  try {
    const esFacebook =
      url.pathname.startsWith("/compartir-facebook/");

    const prefijo = esFacebook
      ? "/compartir-facebook/"
      : "/compartir/";

    const productoId = decodeURIComponent(
      url.pathname.slice(prefijo.length)
    ).trim();

    if (!productoId) {
      return new Response(
        "Falta el ID del producto",
        { status: 400 }
      );
    }

    const urlInterna = new URL(request.url);

    urlInterna.pathname = "/api/admin/pedidos";
    urlInterna.search = "";

    urlInterna.searchParams.set(
      "accion",
      esFacebook
        ? "preview-producto-facebook"
        : "preview-producto"
    );

    urlInterna.searchParams.set(
      "id",
      productoId
    );

    const requestInterno = new Request(
      urlInterna.toString(),
      request
    );

    return await ejecutarHandlerGenerico(
      requestInterno,
      env,
      handlerAdminPedidos
    );
  } catch (error) {
    console.error(
      "Error generando preview para compartir:",
      error
    );

    return new Response(
      "No se pudo generar la vista previa.",
      { status: 500 }
    );
  }
}

    if (url.pathname === "/api/prueba-mongodb") return pruebaMongoDB(env);
if (url.pathname === "/api/diagnostico-redes") return diagnosticoRedes(env);

if (url.pathname === "/api/admin/login") {
  try {
    return await ejecutarHandlerGenerico(
      request,
      env,
      handlerAdminLogin
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Error en login admin" },
      { status: 500 }
    );
  }
}

if (url.pathname === "/api/admin/pedidos") {
  try {
    return await ejecutarHandlerGenerico(
      request,
      env,
      handlerAdminPedidos
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: error?.message || "Error en API admin" },
      { status: 500 }
    );
  }
}

if (url.pathname === "/api/servicios/publicaciones/transferencia" ||
    url.pathname === "/api/servicios/publicaciones/transferencia/comprobante") {
  return apiTransferenciaServicio(request, env, url.pathname);
}
if (url.pathname === "/api/admin/servicios/meta/iniciar" ||
    url.pathname === "/api/servicios/meta/callback") {
  return ejecutarPruebaConexionMeta(request, env, adminAutorizadoWorker(request, env));
}

// Meta de clientes: acceso Bearer por pedido y retorno OAuth separado de Admin.
if (url.pathname.startsWith("/api/servicios/meta/pedidos/")) {
  if (url.pathname !== "/api/servicios/meta/pedidos/callback") {
    const exceso = await comprobarLimiteServicio(request, env, "SERVICIO_LIMITE_CONSULTAS");
    if (exceso) return exceso;
  }
  return ejecutarConexionMetaPedido(request, env);
}

// Multimedia del servicio: colección y bucket privados, sin vínculos con Mega Bazar.
if (url.pathname.startsWith("/api/servicios/publicaciones/archivos/")) {
  // Los videos se envían en partes: limitar inicio/consultas, no cada bloque.
  if (!url.pathname.endsWith("/parte") && !url.pathname.endsWith("/finalizar") && !url.pathname.endsWith("/cancelar")) {
    const exceso = await comprobarLimiteServicio(request, env, "SERVICIO_LIMITE_CONSULTAS");
    if (exceso) return exceso;
  }
  return ejecutarArchivosPedido(request, env);
}
if (url.pathname === "/api/admin/servicios/publicaciones/archivos") {
  return ejecutarAdminArchivosPedido(request, env, adminAutorizadoWorker(request, env));
}

if (url.pathname === "/api/admin/servicios/transferencias") {
  return apiAdminTransferenciasServicio(request, env);
}

if (
  url.pathname === "/api/servicios/publicaciones/plan" ||
  url.pathname === "/api/servicios/publicaciones/pedidos"
) {
  return apiPedidosPublicaciones(request, env, url.pathname);
}

if (url.pathname === "/api/visitas") {
  try {
    return await ejecutarHandlerGenerico(
      request,
      env,
      handlerVisitas
    );
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error?.message || "Error en API de visitas",
      },
      { status: 500 }
    );
  }
}

/* CONTENIDO DE REDES */
if (url.pathname === RUTA_CONTENIDO_REDES) {
      
      try {
        return await ejecutarHandlerContenidoRedes(request, env);
      } catch (error) {
        console.error("Error ejecutando contenido-redes en Cloudflare:", error);
        return Response.json(
          { ok:false, error:error?.message || "Error interno ejecutando contenido-redes." },
          { status:500 }
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
  return Response.json(
    {
      ok: false,
      error: `API no migrada a Cloudflare: ${url.pathname}`
    },
    { status: 404 }
  );
    }

    return env.ASSETS.fetch(request);
  },

  async scheduled(controller, env, ctx) {
    ctx.waitUntil(
      ejecutarCronRedes(env).catch((error) => {
        console.error("Error en Cron Trigger de redes:", error);
        throw error;
      })
    );
  }
};

async function generarCopyConIA(request, env) {
  if (request.method !== "POST") {
    return Response.json(
      { error: "Método no permitido" },
      { status: 405 }
    );
  }

  if (!env.AI) {
    return Response.json(
      { error: "Workers AI no está configurado" },
      { status: 503 }
    );
  }

  try {
    const datos = await request.json();

    const nombre = String(datos.nombre || "").trim();
    const descripcion = String(datos.descripcion || "").trim();
    const plataforma = String(datos.plataforma || "").trim();
    const tipo = String(datos.tipo || "").trim();
    const variante = String(datos.variante || "").trim();
const contexto = String(datos.contexto || "").trim();

    if (
      !nombre ||
      !["facebook", "instagram", "threads", "whatsapp"].includes(plataforma)
    ) {
      return Response.json(
        { error: "Datos inválidos" },
        { status: 400 }
      );
    }

    const prompt = `
    Sos un redactor publicitario argentino especializado
    en comercio electrónico y redes sociales.

    Producto: ${nombre}
    Descripción: ${descripcion}
    Plataforma: ${plataforma}
Tipo de publicación: ${tipo || "publicación general"}

Variante: ${variante || "general"}
Contexto específico: ${contexto || "presentación del producto"}

- Adaptar el enfoque comercial a la variante y al contexto.
- No repetir literalmente el nombre del producto innecesariamente.
- No inventar datos para diferenciar publicaciones.

INSTRUCCIONES SEGÚN EL FORMATO:
- Reel de Instagram y reel_pagina de Facebook:
  comenzar con una situación, necesidad o beneficio real del producto.
- No comenzar con "Descubrí [nombre del producto]",
  "Conocé [nombre del producto]" ni copiar el título al inicio.
- El nombre puede aparecer naturalmente dentro del texto.
- No incluir URLs, CTA ni hashtags dentro del copy.
- El CTA debe aparecer únicamente en el campo cta.
- Los 5 hashtags deben aparecer únicamente en el array hashtags.
- Usar un tono cercano, natural y diferente para cada plataforma.

- Carrusel: destacar las características y ventajas comprobables.
- Historia o estado: mensaje corto, directo y fácil de leer.
- Publicación de Facebook: texto comercial natural y persuasivo.
- Grupo de Facebook: tono cercano, informativo y sin parecer spam.
- Threads: texto conversacional que invite a interactuar.
- WhatsApp estado: copy natural de máximo 130 caracteres.
- No iniciar el copy con el título del producto.
- Destacar un uso o beneficio verificable.
- No incluir URLs ni hashtags dentro del copy.
- Para WhatsApp estado, CTA exacto: ¡Encontralo en nuestra tienda!
- La aplicación agrega la URL al final para generar su vista previa.
- Adaptar el CTA al formato y a la plataforma.
- No utilizar siempre la misma estructura ni las mismas frases.

    Generá contenido comercial personalizado para este producto.

    REGLAS OBLIGATORIAS:
    - Escribir en español argentino, natural y profesional.
    - Adaptar el copy a la plataforma indicada.
    - Destacar únicamente características presentes en la descripción.
    - No inventar beneficios, características, precios ni promociones.
    - Evitar textos genéricos, repetitivos o exagerados.
    - Incluir entre 1 y 3 emojis relevantes según el producto y el contenido.
- Utilizar los emojis de manera natural, sin sobrecargar el texto.
- Evitar emojis repetidos o que no tengan relación con el producto.
- No incluir emojis en los hashtags.
    - Generar un CTA breve, persuasivo y relacionado con el producto.
    - No incluir URLs: la aplicación agregará el enlace real.
    - No repetir el CTA dentro del copy.
    - Para Facebook, Instagram y Threads: exactamente 5 hashtags relevantes.
    - Los hashtags deben ser específicos del producto, sin palabras sueltas como #Para o #Con.
    - Para WhatsApp: no generar hashtags.
    - No incluir hashtags dentro del copy ni del CTA.

    Respondé exclusivamente con JSON válido:
    {
      "copy": "Texto comercial con entre 1 y 3 emojis relevantes",
      "cta": "Llamado a la acción personalizado",
      "hashtags": ["#Etiqueta1", "#Etiqueta2", "#Etiqueta3", "#Etiqueta4", "#Etiqueta5"]
    }

    Para WhatsApp, devolver "hashtags": [].
    `;

    const resultado = await env.AI.run(
      "@cf/meta/llama-3.1-8b-instruct",
      {
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.7,
      }
    );

    const texto = String(resultado.response || "")
      .replace(/```json|```/g, "")
      .trim();

    const generado = JSON.parse(texto);

    const copy = String(generado.copy || "").trim();
    const cta = String(generado.cta || "").trim();

    const hashtags = plataforma === "whatsapp"
      ? []
      : Array.isArray(generado.hashtags)
        ? [...new Set(
            generado.hashtags
              .filter(h => typeof h === "string")
              .map(h => h.trim())
              .filter(h => /^#[\p{L}\p{N}_]+$/u.test(h))
          )].slice(0, 5)
        : [];

    if (
      !copy ||
      !cta ||
      (plataforma !== "whatsapp" && hashtags.length !== 5)
    ) {
      return Response.json(
        {
          ok: false,
          error: "La IA devolvió contenido incompleto.",
        },
        { status: 422 }
      );
    }

    return Response.json({
      ok: true,
      copy,
      cta,
      hashtags,
    });
    
  } catch (error) {
    return Response.json(
      {
        ok: false,
        error: error.message,
      },
      { status: 500 }
    );
  }
}
function obtenerCookiesWorker(request) {
  const cookies = {};
  const header =
    request.headers.get("cookie") || "";

  header.split(";").forEach((cookie) => {
    const [nombre, ...valor] =
      cookie.trim().split("=");

    if (nombre) {
      cookies[nombre] =
        decodeURIComponent(
          valor.join("=")
        );
    }
  });

  return cookies;
}

function adminAutorizadoWorker(
  request,
  env
) {
  const adminPassword =
    env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return false;
  }

  const tokenEsperado = crypto
    .createHmac(
      "sha256",
      String(adminPassword)
    )
    .update(
      "andres-imprimibles-admin"
    )
    .digest("hex");

  const token =
    obtenerCookiesWorker(request)
      .admin_token;

  if (!token) {
    return false;
  }

  const a = Buffer.from(token);
  const b = Buffer.from(
    tokenEsperado
  );

  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    a,
    b
  );
}