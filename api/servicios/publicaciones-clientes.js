// Cola de publicaciones de clientes: independiente de tienda, Threads y piloto manual.
// Envíos apagados por defecto. No reintenta acciones cuyo resultado en Meta es incierto.
import crypto from 'node:crypto';
import { calcularCalendarioSimulado } from './calendario-simulacion.js';
import { evaluarSolicitud } from './solicitud-programacion.js';

const DB = 'andres_imprimibles';
const COLA = 'calendarios_clientes_activos';
const MEDIA = '/api/servicios/publicaciones/media/';
const VERSION = 'v26.0';
const ID = /^SER-[a-f0-9-]{36}$/i;
const ID_SEMANA_PAGADA = /^renovacion-real:SER-[a-f0-9-]{36}(?::(?:[3-9]|[1-9][0-9]{1,2}))?$/i;
const CI = /^contenido-[1-4]$/;
const MEDIOS = new Set(['image/jpeg','image/png','image/webp','video/mp4']);
const HORA = 3600000;
const VENTANA_FIRMA_S = 4 * 60 * 60;
const LIMITE_POR_CRON = 2;
const SIGUIENTES = new Set(['programada','contenedor_pendiente','video_confirmacion_pendiente']);

const habilitado = env => String(env?.SERVICIO_CLIENTES_PUBLICACION_REAL_HABILITADA || '').toLowerCase() === 'true';
const json = (data, status=200) => Response.json(data,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const firmaSecret = env => {
  const s=String(env?.SERVICIO_CLIENTES_MEDIA_FIRMA_SECRET || '');
  if(s.length < 32) throw new Error('MEDIA_FIRMA_NO_CONFIGURADA');
  return s;
};
const baseMedia = env => {
  const entrada = String(env?.SERVICIO_CLIENTES_MEDIA_BASE_URL || 'https://andreshousesitter.com');
  const u=new URL(entrada);
  if(u.protocol!=='https:' || u.username || u.password || u.pathname!=='/' || u.search || u.hash) throw new Error('MEDIA_BASE_INVALIDA');
  return u.origin;
};
const mac = (env,pedidoId,contenidoId,posicion,vence) => crypto.createHmac('sha256',firmaSecret(env))
  .update(`comunidad-media-v1\n${pedidoId}\n${contenidoId}\n${posicion}\n${vence}`).digest('hex');
function urlMedia(env, pedidoId, contenidoId, posicion){
  const vence=Math.floor(Date.now()/1000)+VENTANA_FIRMA_S;
  const sig=mac(env,pedidoId,contenidoId,posicion,vence);
  return `${baseMedia(env)}${MEDIA}${pedidoId}/${contenidoId}/${posicion}?v=${vence}&s=${sig}`;
}
async function conDB(env, f) {
  if(!env?.MONGODB_URI) throw new Error('DB_NO_CONFIGURADA');
  const {MongoClient}=await import('mongodb');
  const client=new MongoClient(env.MONGODB_URI);
  try { await client.connect();return await f(client.db(DB)); }
  finally {await client.close().catch(()=>{});}
}
function descifrar(c,env) {
  const k=String(env?.SERVICIO_META_CIFRADO_KEY||'');
  if(!/^[a-f0-9]{64}$/i.test(k)) throw new Error('CLAVE_META_INVALIDA');
  const x=c?.tokenPaginaCifrado;
  if(x?.algoritmo!=='aes-256-gcm'||!x.iv||!x.etiqueta||!x.contenido) throw new Error('TOKEN_META_INVALIDO');
  const d=crypto.createDecipheriv('aes-256-gcm',Buffer.from(k,'hex'),Buffer.from(x.iv,'base64'));
  d.setAuthTag(Buffer.from(x.etiqueta,'base64'));
  const valor=Buffer.concat([d.update(Buffer.from(x.contenido,'base64')),d.final()]).toString('utf8');
  if(valor.length < 20||valor.length > 8192) throw new Error('TOKEN_META_INVALIDO');
  return valor;
}
function validarAprobacion(pedido, evaluacion, aprobacion, solicitud) {
  return pedido?.tipo==='publicaciones' && pedido.modalidadContratacion==='prueba_gratuita' &&
    pedido.estadoServicio==='sin_activar' && pedido.prueba?.estado==='pendiente_activacion' &&
    !pedido.prueba?.inicio && !pedido.activadoEn && evaluacion.lista && evaluacion.aprobados &&
    aprobacion?.estado==='aprobacion_administrativa_pendiente_activacion' &&
    aprobacion?.revision===evaluacion.revision &&
    solicitud?.estado==='solicitud_confirmada_pendiente_habilitacion' &&
    solicitud?.revision===evaluacion.revision &&
    solicitud?.aceptaProgramacionYPublicacionAlHabilitar===true;
}

// Esta función sólo la invoca la pantalla administrativa ya autenticada.
// La cola se inserta bloqueada y se habilita al finalizar la actualización del pedido.
export async function activarSemanaDesdeAdmin(db, env, pedidoId, revision) {
  if(!habilitado(env)) return {ok:false,error:'Los envíos de clientes siguen deshabilitados. Configurá primero el servicio y sus pruebas.',status:409};
  if(!ID.test(pedidoId)||!/^[a-f0-9]{64}$/.test(revision||'')) return {ok:false,error:'Pedido o revisión inválidos.',status:400};
  firmaSecret(env);baseMedia(env);
  const pedidos=db.collection('pedidos_servicios');
  const cola=db.collection(COLA);
  const pedido=await pedidos.findOne({pedidoId,tipo:'publicaciones'});
  if(!pedido) return {ok:false,error:'Pedido inexistente.',status:404};
  const anterior=await cola.findOne({_id:pedidoId});
  if(anterior?.estado==='activa' && pedido.estadoServicio==='activo') {
    await db.collection('solicitudes_programacion_servicios').updateOne({_id:pedidoId,revision},
      {$set:{estado:'activada',publicacionHabilitada:true}});
    return {ok:true,yaActiva:true,eventos:anterior.eventos.length};
  }
  // Recuperar una activación interrumpida tras actualizar el pedido, antes de
  // habilitar la cola. No recalcular fechas ni crear eventos diferentes.
  if(anterior?.estado==='preparando' && pedido.estadoServicio==='activo' && anterior.revision===revision){
    await cola.updateOne({_id:pedidoId,estado:'preparando'},{$set:{estado:'activa',publicacionHabilitada:true,activadaEn:new Date()}});
    await db.collection('solicitudes_programacion_servicios').updateOne({_id:pedidoId,revision},
      {$set:{estado:'activada',publicacionHabilitada:true,activadoEn:new Date()}});
    return {ok:true,yaActiva:true,eventos:anterior.eventos.length};
  }
  const evaluacion=await evaluarSolicitud(db,pedido);
  const [aprobacion,solicitud]=await Promise.all([
    db.collection('aprobaciones_programacion_servicios').findOne({_id:pedidoId}),
    db.collection('solicitudes_programacion_servicios').findOne({_id:pedidoId})
  ]);
  if(revision!==evaluacion.revision||!validarAprobacion(pedido,evaluacion,aprobacion,solicitud))
    return {ok:false,error:'Faltan requisitos, aprobación o consentimiento vigente. Reabrí la revisión.',status:409};
  const archivos=await db.collection('archivos_servicios').find({pedidoId,estado:'subido'}).toArray();
  for(const p of pedido.publicaciones){
    const lista=archivos.filter(a=>a.contenidoId===p.id);
    if(lista.length < (p.tipo==='carrusel'?2:1) || lista.length > (p.tipo==='carrusel'?10:1) ||
      lista.some(a=>a.revision!=='aprobado'||!MEDIOS.has(a.tipo)||!a.r2Key))
      return {ok:false,error:`El contenido ${p.id} tiene archivos pendientes.`,status:409};
    for(const a of lista){
      // El endpoint de publicación de Instagram consume imágenes JPEG por URL.
      // El editor admite también PNG/WebP para previsualización, pero no se
      // activan esas semanas sin normalizar primero el archivo a JPEG.
      if(pedido.redes.includes('instagram') && p.tipo!=='reel' && a.tipo!=='image/jpeg')
        return {ok:false,error:`El contenido ${p.id} necesita imágenes JPEG para publicar en Instagram.`,status:409};
      const existente=await env?.SERVICIOS_CONTENIDOS_R2?.head(a.r2Key);
      if(!existente||existente.size!==a.tamano) return {ok:false,error:`Archivo no disponible: ${p.id}.`,status:409};
    }
  }
  const conexiones=await db.collection('conexiones_meta_pedidos').find({pedidoId,estado:'conectada',plataforma:{$in:pedido.redes}}).toArray();
  for(const red of pedido.redes){
    const c=conexiones.find(x=>x.plataforma===red);
    if(!c||!c.pageId|| (red==='instagram' && !c.instagramId))
      return {ok:false,error:`Falta la conexión a ${red}.`,status:409};
    descifrar(c,env);
  }
  const ahora=new Date();
  const ancla=new Date(ahora.getTime()+15*60000);
  const calendario=calcularCalendarioSimulado(pedido,ancla);
  if(calendario.advertencias.length||calendario.eventos.length!==pedido.publicaciones.length*pedido.redes.length)
    return {ok:false,error:'El calendario presenta advertencias o faltan horarios. Revisalo antes de activar.',status:409};
  const eventos=calendario.eventos.map(e=>({
    id:e.id,red:e.red,contenidoId:e.contenidoId,tipo:e.tipo,fechaHoraUTC:e.fechaHoraUTC,
    estado:'programada',intentos:0,contenedorId:null,metaId:null,enlace:null,publicadaEn:null
  }));
  // No se recalcula el calendario en caso de reintento; debe prevalecer la reserva original.
  if(anterior && anterior.estado!=='preparando')
    return {ok:false,error:'La semana ya tiene una programación incompatible. Requiere revisión técnica.',status:409};
  if(anterior && anterior.revision!==revision)
    return {ok:false,error:'La programación previa pertenece a otra revisión.',status:409};
  if(!anterior){
    try {await cola.insertOne({_id:pedidoId,pedidoId,clienteUsuarioId:pedido.clienteUsuarioId,revision,
      estado:'preparando',publicacionHabilitada:false,creadoEn:ahora,
      inicio:ahora,fin:new Date(ahora.getTime()+7*24*HORA),zonaHoraria:pedido.zonaHoraria,eventos});}
    catch(e){if(e?.code===11000)return {ok:false,error:'La semana está siendo activada desde otra sesión. Recargá.',status:409};throw e;}
  }
  const programacion=anterior||await cola.findOne({_id:pedidoId});
  const finalFechas=new Map(programacion.eventos.map(e=>[e.contenidoId,e.fechaHoraUTC]));
  const fecha=new Date();
  const modificacion=await pedidos.updateOne({pedidoId,tipo:'publicaciones',estadoServicio:'sin_activar',
    'prueba.estado':'pendiente_activacion'},{$set:{
    estado:'prueba_activa',estadoServicio:'activo',estadoContenidos:'aprobados',
    'prueba.estado':'activa','prueba.inicio':programacion.inicio,'prueba.fin':programacion.fin,
    fechaInicioServicio:programacion.inicio,fechaFinServicio:programacion.fin,activadoEn:fecha,
    actualizadoEn:fecha,publicacionHabilitada:true,
    publicaciones:pedido.publicaciones.map(p=>({...p,fechaHoraDefinitiva:finalFechas.get(p.id)||null,estado:'programado'}))
  }});
  if(!modificacion.modifiedCount){
    const comprobacion=await pedidos.findOne({pedidoId});
    if(comprobacion?.estadoServicio!=='activo') return {ok:false,error:'La activación cambió de estado. Consultá el pedido.',status:409};
  }
  await cola.updateOne({_id:pedidoId,revision,estado:'preparando'},{$set:{estado:'activa',publicacionHabilitada:true,activadaEn:fecha}});
  await db.collection('solicitudes_programacion_servicios').updateOne({_id:pedidoId,revision},
    {$set:{estado:'activada',activadoEn:fecha,publicacionHabilitada:true}});
  return {ok:true,yaActiva:false,eventos:programacion.eventos.length};
}

// Únicamente entrega archivos aprobados, asociados a un pedido ya activado.
export async function servirMedioCliente(request,env){
  const u=new URL(request.url);
  if(!['GET','HEAD'].includes(request.method)||u.origin!==baseMedia(env))return json({ok:false},403);
  const match=/^\/api\/servicios\/publicaciones\/media\/((?:renovacion-real:)?SER-[a-f0-9-]{36}(?::(?:[3-9]|[1-9][0-9]{1,2}))?)\/(contenido-[1-4])\/(\d)$/.exec(u.pathname);
  if(!match)return json({ok:false},404);
  const [,pedidoId,contenidoId,numero]=match;const posicion=Number(numero);
  const vence=u.searchParams.get('v')||'';const sig=u.searchParams.get('s')||'';
  const ahora=Math.floor(Date.now()/1000);
  if(!/^\d{10}$/.test(vence)||!/^[a-f0-9]{64}$/i.test(sig)||Number(vence)<ahora||Number(vence)>ahora+VENTANA_FIRMA_S)
    return json({ok:false},403);
  const esperado=Buffer.from(mac(env,pedidoId,contenidoId,posicion,vence),'hex');
  if(!crypto.timingSafeEqual(esperado,Buffer.from(sig,'hex')))return json({ok:false},403);
  return conDB(env,async db=>{
    const plan=await db.collection(COLA).findOne({_id:pedidoId,estado:'activa',publicacionHabilitada:true,
      eventos:{$elemMatch:{contenidoId,estado:{$in:['enviando_resultado_incierto','contenedor_pendiente','consultando_contenedor','publicacion_iniciada_resultado_incierto','video_confirmacion_pendiente']}}}});
    if(!plan)return json({ok:false},404);
    const a=plan.tipoSemana==='pagada'
      ? await db.collection('medios_renovaciones_reales').findOne({renovacionId:pedidoId,contenidoId,posicion,revision:'aprobado'})
      : await db.collection('archivos_servicios').findOne({pedidoId,contenidoId,posicion,estado:'subido',revision:'aprobado'});
    if(!a||!MEDIOS.has(a.tipo)||!a.r2Key)return json({ok:false},404);
    // Para semanas pagadas con Instagram, servir el JPEG generado, no el
    // PNG/WebP original. Facebook puede usar la misma imagen JPEG.
    const requiereJPEG=plan.tipoSemana==='pagada'&&plan.redes?.includes('instagram')&&['image/png','image/webp'].includes(a.tipo);
    const medio=requiereJPEG
      ? (a.publicacionTipo==='image/jpeg'&&a.publicacionR2Key&&a.publicacionTamano>0
          ? {...a,r2Key:a.publicacionR2Key,tipo:'image/jpeg',tamano:a.publicacionTamano}
          : null)
      : a;
    if(!medio)return json({ok:false,error:'JPEG de publicación no disponible.'},404);
    const bucket=env?.SERVICIOS_CONTENIDOS_R2;if(!bucket?.get)return json({ok:false},503);
    const h={'Content-Type':medio.tipo,'Content-Disposition':'inline','Cache-Control':'private,max-age=60',
      'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Security-Policy':"default-src 'none'"};
    const rango=request.headers.get('range');let seleccion;
    if(rango){const m=/^bytes=(\d+)-(\d*)$/.exec(rango);
      if(!m)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${medio.tamano}`}});
      const ini=Number(m[1]),fin=m[2]?Number(m[2]):medio.tamano-1;
      if(!Number.isSafeInteger(ini)||!Number.isSafeInteger(fin)||ini>fin||fin>=medio.tamano)
        return new Response(null,{status:416,headers:{'Content-Range':`bytes */${medio.tamano}`}});
      seleccion={offset:ini,length:fin-ini+1};h['Content-Range']=`bytes ${ini}-${fin}/${medio.tamano}`;
    }
    const archivo=await bucket.get(medio.r2Key,seleccion?{range:seleccion}:undefined);
    if(!archivo)return json({ok:false},404);
    h['Content-Length']=String(seleccion?seleccion.length:medio.tamano);
    return new Response(request.method==='HEAD'?null:archivo.body,{status:seleccion?206:200,headers:h});
  });
}

async function graph(ruta,token,form){
  const r=await fetch(`https://graph.facebook.com/${VERSION}/${ruta}`,{
    method:form?'POST':'GET',redirect:'manual',
    headers:{Authorization:`Bearer ${token}`,...(form?{'Content-Type':'application/x-www-form-urlencoded'}:{})},
    ...(form?{body:new URLSearchParams(form)}:{})
  });
  if(r.status>=300 && r.status<400)throw new Error(`META_HTTP_${r.status}`);
  const d=await r.json().catch(()=>null);
  if(!r.ok||!d||d.error)throw new Error(`META_HTTP_${r.status}_${Number(d?.error?.code)||0}`);
  return d;
}
async function enlacePublicado(metaId,red,token){
  try {const d=await graph(`${metaId}?fields=${red==='instagram'?'permalink':'link,permalink_url'}`,token);
    const candidato=d.permalink||d.permalink_url||d.link;
    const u=new URL(candidato);
    if(u.protocol==='https:' && ['www.instagram.com','instagram.com','www.facebook.com','facebook.com'].includes(u.hostname))return u.toString();
  }catch{/* No transformar un ID en una URL inventada. */}
  return null;
}
function copy(p,red){
  return [String(p.descripcion||'').trim(),String(red==='instagram'?p.ctaInstagram||'':p.ctaFacebook||'').trim(),
    ...(red==='facebook'&&p.urlFacebook?[p.urlFacebook]:[]),String(p.hashtags||'').trim()].filter(Boolean).join('\n\n').slice(0,2100);
}
function clave(e){return `eventos.${e.indice}`;}
async function actualizar(db,plan,e,estado,otros={}){
  const campos={};for(const [k,v] of Object.entries({estado,...otros}))campos[`${clave(e)}.${k}`]=v;
  await db.collection(COLA).updateOne({_id:plan._id,[`${clave(e)}.id`]:e.id},{$set:campos});
}
async function reclamar(db,plan,e,anterior,nuevo){
  const c=await db.collection(COLA).updateOne({_id:plan._id,estado:'activa',publicacionHabilitada:true,
    [`${clave(e)}.id`]:e.id,[`${clave(e)}.estado`]:anterior},{$set:{[`${clave(e)}.estado`]:nuevo,[`${clave(e)}.actualizadoEn`]:new Date()}});
  return c.modifiedCount===1;
}
async function publicarInstagram(db,plan,e,p,c,token,archivos,env){
  const ig=String(c.instagramId||'');if(!/^\d{5,30}$/.test(ig))throw new Error('IG_INVALIDA');
  const caption=copy(p,'instagram');
  // El estado ya se reclamó antes de cualquier llamada que cree contenido en Meta.
  let contenedor;
  if(p.tipo==='carrusel'){
    const hijos=[];
    for(const a of archivos){
      const hijo=await graph(`${ig}/media`,token,{image_url:urlMedia(env,plan._id,p.id,a.posicion),is_carousel_item:'true'});
      if(!/^\d{5,30}$/.test(String(hijo.id||'')))throw new Error('META_ID_INVALIDO');
      hijos.push(String(hijo.id));
    }
    // Meta debe terminar de procesar los hijos antes de armar el carrusel.
    // No se repiten las llamadas de creación si la preparación falla.
    let preparados=false;
    for(let intento=0;intento<4;intento++){
      const revisiones=await Promise.all(hijos.map(id=>graph(`${id}?fields=status_code`,token)));
      if(revisiones.some(x=>['ERROR','EXPIRED'].includes(x.status_code)))throw new Error('IG_HIJO_CON_ERROR');
      if(revisiones.every(x=>x.status_code==='FINISHED')){preparados=true;break;}
      await new Promise(res=>setTimeout(res,1500));
    }
    if(!preparados)throw new Error('IG_HIJOS_SIN_PREPARAR');
    contenedor=await graph(`${ig}/media`,token,{media_type:'CAROUSEL',children:hijos.join(','),caption});
  }else if(p.tipo==='reel'){
    contenedor=await graph(`${ig}/media`,token,{media_type:'REELS',video_url:urlMedia(env,plan._id,p.id,archivos[0].posicion),caption,share_to_feed:'true'});
  }else{
    contenedor=await graph(`${ig}/media`,token,{image_url:urlMedia(env,plan._id,p.id,archivos[0].posicion),caption});
  }
  if(!/^\d{5,30}$/.test(String(contenedor?.id||'')))throw new Error('META_ID_INVALIDO');
  await actualizar(db,plan,e,'contenedor_pendiente',{contenedorId:String(contenedor.id)});
}
async function finalizarInstagram(db,plan,e,c,token){
  const id=String(e.contenedorId||'');if(!/^\d{5,30}$/.test(id))throw new Error('CONTENEDOR_INVALIDO');
  const d=await graph(`${id}?fields=status_code`,token);
  if(d.status_code!=='FINISHED'){
    await actualizar(db,plan,e,['ERROR','EXPIRED'].includes(d.status_code)?'atencion_manual':'contenedor_pendiente');return;
  }
  if(!await reclamar(db,plan,e,'consultando_contenedor','publicacion_iniciada_resultado_incierto'))return;
  const res=await graph(`${c.instagramId}/media_publish`,token,{creation_id:id});
  if(!/^\d{5,30}$/.test(String(res?.id||'')))throw new Error('META_ID_INVALIDO');
  await actualizar(db,plan,e,'publicada',{metaId:String(res.id),publicadaEn:new Date(),enlace:await enlacePublicado(String(res.id),'instagram',token)});
}
async function publicarFacebook(db,plan,e,p,c,token,archivos,env){
  const page=String(c.pageId||'');if(!/^\d{5,30}$/.test(page))throw new Error('FB_PAGINA_INVALIDA');
  const mensaje=copy(p,'facebook');
  let mediaId;
  if(p.tipo==='imagen'){
    const r=await graph(`${page}/photos`,token,{url:urlMedia(env,plan._id,p.id,archivos[0].posicion),message:mensaje,published:'true'});
    mediaId=String(r.post_id||r.id||'');
  }else if(p.tipo==='carrusel'){
    const media=[];
    for(const a of archivos){
      const r=await graph(`${page}/photos`,token,{url:urlMedia(env,plan._id,p.id,a.posicion),published:'false'});
      if(!/^\d{5,30}$/.test(String(r.id||'')))throw new Error('FB_PHOTO_INVALIDA');
      media.push(r.id);
    }
    const args={message:mensaje};media.forEach((id,i)=>args[`attached_media[${i}]`]=JSON.stringify({media_fbid:id}));
    const r=await graph(`${page}/feed`,token,args);mediaId=String(r.id||'');
  }else{
    // Hosted Reel: el tamaño real permanece en R2 privado; Meta descarga con URL temporal.
    const inicio=await graph(`${page}/video_reels`,token,{upload_phase:'start'});
    const videoId=String(inicio.video_id||'');const subida=inicio.upload_url;
    const destino=new URL(subida);
    if(!/^\d{5,30}$/.test(videoId)||destino.protocol!=='https:'||destino.hostname!=='rupload.facebook.com')throw new Error('FB_VIDEO_SESSION_INVALIDA');
    const subidaR=await fetch(destino.toString(),{method:'POST',redirect:'manual',headers:{Authorization:`OAuth ${token}`,
      file_url:urlMedia(env,plan._id,p.id,archivos[0].posicion)}});
    const subidaD=await subidaR.json().catch(()=>null);
    if(!subidaR.ok||subidaD?.success!==true)throw new Error('FB_VIDEO_UPLOAD_NO_CONFIRMADA');
    // La finalización puede crear una publicación: ya tenemos el bloqueo sin reintento.
    const fin=await graph(`${page}/video_reels`,token,{video_id:videoId,upload_phase:'finish',video_state:'PUBLISHED',description:mensaje});
    if(fin.success!==true)throw new Error('FB_REEL_NO_CONFIRMADO');
    await actualizar(db,plan,e,'video_confirmacion_pendiente',{metaId:videoId});
    return;
  }
  if(!/^\d{5,30}(?:_\d{5,30})?$/.test(mediaId))throw new Error('META_ID_INVALIDO');
  await actualizar(db,plan,e,'publicada',{metaId:mediaId,publicadaEn:new Date(),enlace:await enlacePublicado(mediaId,'facebook',token)});
}
async function procesarEvento(db,plan,e,env){
  const pagada=plan.tipoSemana==='pagada';
  const pedidoId=pagada?plan.pedidoId:plan._id;
  const pedido=await db.collection('pedidos_servicios').findOne(pagada
    ? {pedidoId,tipo:'publicaciones',clienteUsuarioId:plan.clienteUsuarioId}
    : {pedidoId,tipo:'publicaciones',estadoServicio:'activo',publicacionHabilitada:true});
  if(!pedido||Date.now()>new Date(plan.fin).getTime())return;
  if(pagada){
    const renovacion=await db.collection('renovaciones_transferencia_reales').findOne({_id:plan._id,pedidoId,
      clienteUsuarioId:plan.clienteUsuarioId,pagoConfirmado:true,configuracionEstado:'programada'});
    if(!renovacion)return;
  }
  const p=(pagada?plan.publicaciones:pedido.publicaciones)?.find(p=>p.id===e.contenidoId);
  const c=await db.collection('conexiones_meta_pedidos').findOne({pedidoId,plataforma:e.red,estado:'conectada'});
  const archivos=pagada
    ? await db.collection('medios_renovaciones_reales').find({renovacionId:plan._id,contenidoId:e.contenidoId,revision:'aprobado'}).sort({posicion:1}).toArray()
    : await db.collection('archivos_servicios').find({pedidoId,contenidoId:e.contenidoId,estado:'subido',revision:'aprobado'}).sort({posicion:1}).toArray();
  if(!p||!c||!archivos.length||!archivos.every(a=>MEDIOS.has(a.tipo))) {
    await actualizar(db,plan,e,'atencion_manual',{motivo:'REQUISITOS_CAMBIARON'});return;
  }
  const destino=e.estado==='programada'?'enviando_resultado_incierto':
    e.estado==='video_confirmacion_pendiente'?'confirmando_video':'consultando_contenedor';
  if(!await reclamar(db,plan,e,e.estado,destino))return;
  try{
    const token=descifrar(c,env);
    if(e.red==='instagram'){
      if(e.estado==='programada')await publicarInstagram(db,plan,e,p,c,token,archivos,env);
      else await finalizarInstagram(db,plan,e,c,token);
    }else if(e.estado==='programada')await publicarFacebook(db,plan,e,p,c,token,archivos,env);
    else if(e.estado==='video_confirmacion_pendiente') {
      const estado=await graph(`${e.metaId}?fields=status`,token);
      const fases=estado?.status;
      if(['complete','published','finished'].includes(String(fases?.publishing_phase?.status||'').toLowerCase())){
        await actualizar(db,plan,e,'publicada',{publicadaEn:new Date(),
          enlace:await enlacePublicado(e.metaId,'facebook',token)});
      }else if(['error','failed'].includes(String(fases?.publishing_phase?.status||'').toLowerCase())){
        await actualizar(db,plan,e,'atencion_manual',{motivo:'FB_VIDEO_ERROR'});
      }else await actualizar(db,plan,e,'video_confirmacion_pendiente');
    } else await actualizar(db,plan,e,'atencion_manual',{motivo:'ESTADO_INESPERADO'});
  }catch(error){
    console.warn('Publicación cliente: resultado sin confirmar',plan._id,e.id,error?.message?.slice(0,80)||'ERROR');
    await actualizar(db,plan,e,'atencion_manual',{motivo:String(error?.message||'META_NO_CONFIRMADA').slice(0,100),revisarEn:new Date()});
  }
}
export async function ejecutarCronClientes(env){
  if(!habilitado(env))return {ok:true,deshabilitado:true};
  firmaSecret(env);baseMedia(env);
  return conDB(env,async db=>{
    const ahora=new Date();
    const planes=await db.collection(COLA).find({estado:'activa',publicacionHabilitada:true,
      eventos:{$elemMatch:{estado:{$in:[...SIGUIENTES]},fechaHoraUTC:{$lte:ahora.toISOString()}}}}).limit(12).toArray();
    let procesados=0;
    for(const plan of planes){
      for(const [indice,evento] of plan.eventos.entries()){
        if(procesados>=LIMITE_POR_CRON)break;
        if(!SIGUIENTES.has(evento.estado)||Date.parse(evento.fechaHoraUTC)>ahora.getTime())continue;
        await procesarEvento(db,plan,{...evento,indice},env);procesados++;
      }
      if(procesados>=LIMITE_POR_CRON)break;
    }
    // Cerrar pruebas transcurridos siete días sin interferir con otros pedidos.
    const vencidas=await db.collection(COLA).find({estado:'activa',fin:{$lte:ahora}})
      .project({_id:1}).limit(30).toArray();
    for(const p of vencidas){
      await db.collection(COLA).updateOne({_id:p._id,estado:'activa'},{$set:{estado:'finalizada',publicacionHabilitada:false,finalizadaEn:ahora}});
      const planVencido=await db.collection(COLA).findOne({_id:p._id},{projection:{tipoSemana:1}});
      if(planVencido?.tipoSemana==='pagada'){
        await db.collection('renovaciones_transferencia_reales').updateOne({_id:p._id,configuracionEstado:'programada'},
          {$set:{estadoSemana:'finalizada',finalizadaEn:ahora}});
      }else{
        await db.collection('pedidos_servicios').updateOne({pedidoId:p._id,estadoServicio:'activo'},
          {$set:{estadoServicio:'finalizado','prueba.estado':'finalizada',publicacionHabilitada:false,actualizadoEn:ahora}});
      }
    }
    // Recuperación de enlaces públicos: consulta Meta sin crear contenido.
    // Máximo una consulta cada ejecución, y una vez por hora por evento.
    const sinEnlace=await db.collection(COLA).find({estado:{$in:['activa','finalizada']},
      eventos:{$elemMatch:{red:'instagram',estado:'publicada',enlace:null,metaId:{$exists:true}}}})
      .project({_id:1,pedidoId:1,eventos:1}).limit(8).toArray();
    let consultado=false;
    for(const plan of sinEnlace){
      if(consultado)break;
      for(const [indice,e] of (plan.eventos||[]).entries()){
        if(consultado)break;
        if(e.red!=='instagram'||e.estado!=='publicada'||e.enlace||!/^[0-9]{5,30}$/.test(String(e.metaId||'')))continue;
        if(Date.now()-new Date(e.enlaceConsultaEn||0).getTime()<HORA)continue;
        const claimed=await db.collection(COLA).updateOne({_id:plan._id,
          [`eventos.${indice}.metaId`]:e.metaId,[`eventos.${indice}.enlace`]:null},
          {$set:{[`eventos.${indice}.enlaceConsultaEn`]:ahora}});
        if(!claimed.matchedCount)continue;
        consultado=true;
        try{
          const conn=await db.collection('conexiones_meta_pedidos').findOne({pedidoId:plan.pedidoId||plan._id,
            plataforma:'instagram',estado:'conectada'});
          if(!conn)break;
          const enlace=await enlacePublicado(e.metaId,'instagram',descifrar(conn,env));
          if(enlace)await db.collection(COLA).updateOne({_id:plan._id,[`eventos.${indice}.metaId`]:e.metaId},
            {$set:{[`eventos.${indice}.enlace`]:enlace}});
        }catch(error){console.warn('Recuperación permalink IG:',error?.name||'Error');}
      }
    }
    return {ok:true,procesados,pruebasFinalizadas:vencidas.filter(p=>!String(p._id).startsWith('renovacion-real:')).length};
  });
}
