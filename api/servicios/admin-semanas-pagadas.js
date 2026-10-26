// Revisión y programación de renovaciones bancarias REALES.
// Comparte las rutas y el cron de Comunidad Semanal, sin alterar Semana 1.
import crypto from 'node:crypto';
import { calcularCalendarioSimulado } from './calendario-simulacion.js';

const DB='andres_imprimibles';
const TABLA='renovaciones_transferencia_reales';
const MEDIOS='medios_renovaciones_reales';
const COLA='calendarios_clientes_activos';
const BASE_PROG='/api/admin/servicios/publicaciones/programacion';
const BASE_ARCH='/api/admin/servicios/publicaciones/archivos';
const SEMANA=/^renovacion-real:SER-[a-f0-9-]{36}(?::(?:[3-9]|[1-9][0-9]{1,2}))?$/i;
const VENCE=15*60*1000;
const SAFE_MIME=new Set(['image/jpeg','image/png','image/webp','video/mp4']);
const PUBLICACIONES_URL='https://andreshousesitter.com/servicios/publicacion-automatica/mi-panel';
const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const numeroSemana=d=>Number.isInteger(d?.numeroSemana)&&d.numeroSemana>=2 ? d.numeroSemana : 2;
const fecha=(v,z)=>{try{return new Intl.DateTimeFormat('es-AR',{timeZone:z||'America/Argentina/Buenos_Aires',dateStyle:'medium',timeStyle:'short'}).format(new Date(v));}catch{return 'Fecha no disponible';}};
function pagina(titulo,html,status=200){return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(titulo)}</title><style>*{box-sizing:border-box}body{background:#f7f8fa;color:#28323b;font:400 14px/1.6 Montserrat,system-ui,sans-serif;margin:0}main{max-width:1000px;padding:24px 16px 70px;margin:auto}a{color:#526171}header{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:30px}section{background:#fff;border:1px solid #e6ebef;border-radius:9px;padding:18px;margin:16px 0}h1{font-size:23px;font-weight:500}h2{font-size:16px;font-weight:500}h3{font-size:14px;font-weight:500}p{overflow-wrap:anywhere}button,.boton{border:1px solid #cfd8df;border-radius:6px;background:#43596a;color:#fff;padding:9px 13px;font:inherit;cursor:pointer}button:disabled{opacity:.5;cursor:default}.boton{display:inline-block;text-decoration:none}small,.muted{color:#687684}img,video{max-width:100%;max-height:380px;border-radius:6px}article{border-top:1px solid #e9edf1;padding:14px 0}label{display:block}textarea{width:100%;max-width:580px;padding:8px;border:1px solid #d7e0e7;border-radius:5px}form{display:inline-block;margin:7px 6px 7px 0}.warn{color:#a54932}.good{color:#247653}.info{background:#fafbfc;padding:13px;border-radius:7px}code{overflow-wrap:anywhere}nav{display:flex;gap:12px;flex-wrap:wrap;margin:20px 0}</style></head><body><main><header><a href="/admin">← Administración</a><span>Gestión de semanas · Pagos reales</span></header><h1>${escape(titulo)}</h1>${html}</main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; media-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"}});}
async function conDB(env,f){const {MongoClient}=await import('mongodb');const c=new MongoClient(env.MONGODB_URI);try{await c.connect();return await f(c.db(DB));}finally{await c.close().catch(()=>{});}}
function firma(env,id,action,detalle,vence){return crypto.createHmac('sha256',String(env.ADMIN_PASSWORD||'')).update(`semanas-pagadas:v1:${id}:${action}:${detalle}:${vence}`).digest('hex');}
function token(env,id,action,detalle){const vence=Date.now()+VENCE;return {vence,csrf:firma(env,id,action,detalle,vence)};}
function firmaValida(env,id,action,detalle,vence,valor){if(!/^\d{13}$/.test(String(vence))||Number(vence)<Date.now()||Number(vence)>Date.now()+VENCE)return false;if(!/^[a-f0-9]{64}$/i.test(String(valor)))return false;const a=Buffer.from(firma(env,id,action,detalle,vence),'hex');return crypto.timingSafeEqual(a,Buffer.from(valor,'hex'));}
function campos(env,id,action,detalle){const f=token(env,id,action,detalle);return `<input type="hidden" name="semanaId" value="${escape(id)}"><input type="hidden" name="accion" value="${escape(action)}"><input type="hidden" name="detalle" value="${escape(detalle)}"><input type="hidden" name="vence" value="${f.vence}"><input type="hidden" name="csrf" value="${f.csrf}">`;}
function nav(doc){const q=encodeURIComponent(doc._id);return `<nav><a href="${BASE_PROG}?semanaId=${q}">Aprobar y programar semana</a><a href="${BASE_ARCH}?semanaId=${q}">Revisión de contenidos</a><a href="${BASE_PROG}">Volver a los pedidos</a></nav>`;}
function archivoEsperado(doc,contenidoId,pos){const pub=doc?.configuracion?.publicaciones?.find(p=>p.id===contenidoId);return pub?.archivosSeleccionados?.[pos]||null;}
async function consultarArchivos(db,doc){return db.collection(MEDIOS).find({renovacionId:doc._id}).sort({contenidoId:1,posicion:1}).toArray();}
function completos(doc,archivos){const ps=doc?.configuracion?.publicaciones;if(!Array.isArray(ps)||ps.length!==4)return false;const n=ps.reduce((x,p)=>x+p.archivosSeleccionados.length,0);if(n!==archivos.length)return false;return ps.every(p=>p.archivosSeleccionados.every((a,i)=>archivos.some(b=>b.contenidoId===p.id&&b.posicion===i&&b.nombre===a.nombre&&b.tipo===a.tipo&&b.tamano===a.tamano&&Boolean(b.r2Key))));}
function conectados(conexiones,redes){return redes.every(red=>{const x=conexiones.find(c=>c.plataforma===red&&c.estado==='conectada');return x?.pageId && x.tokenPaginaCifrado?.contenido && (red!=='instagram'||x.instagramId);});}
// Conservamos siempre el original en R2. Para Meta se usa una copia JPEG
// validada y asociada al mismo archivo; nunca se reescribe el original.
// Una conversión por solicitud: evita lotes pesados en Workers Free.
async function prepararJpegInstagram(db,env,doc,a){
  if(!doc.redes?.includes('instagram')||a.tipo==='video/mp4'||a.tipo==='image/jpeg')return {ok:true};
  if(!['image/png','image/webp'].includes(a.tipo))return {error:'La imagen no tiene un formato compatible.'};
  if(doc.configuracionEstado!=='en_revision')return {error:'La semana ya no admite cambios de medios.'};
  if(!env?.IMAGES?.input)return {error:'Falta configurar el binding IMAGES de Cloudflare para convertir PNG/WebP a JPEG.'};
  const bucket=env?.SERVICIOS_CONTENIDOS_R2;
  if(!bucket?.get||!bucket?.put||!bucket?.head)return {error:'El almacenamiento privado no está disponible.'};
  // La API Images admite como máximo 20 MiB de entrada.
  if(a.tamano>20*1024*1024)return {error:'Esta imagen supera los 20 MB que admite el conversor de Cloudflare. Se necesita reemplazarla por una JPEG más pequeña.'};
  const medios=db.collection(MEDIOS);
  if(a.publicacionTipo==='image/jpeg'&&a.publicacionR2Key&&a.publicacionTamano>0){
    const previo=await bucket.head(a.publicacionR2Key);
    if(previo?.size===a.publicacionTamano)return {ok:true,existente:true};
  }
  const original=await bucket.get(a.r2Key);
  if(!original||original.size!==a.tamano)return {error:'El archivo original ya no está disponible o cambió de tamaño.'};
  let respuesta;
  try{respuesta=(await env.IMAGES.input(original.body).transform({width:1440,height:1440,fit:'scale-down'}).output({format:'image/jpeg',quality:85})).response();}
  catch(e){console.warn('Conversión JPEG:',e?.name||'Error');return {error:'Cloudflare no pudo convertir esta imagen a JPEG.'};}
  if(!respuesta.ok)return {error:`La transformación de imagen devolvió HTTP ${respuesta.status}.`};
  const bytes=new Uint8Array(await respuesta.arrayBuffer());
  if(bytes.length<100||bytes.length>8*1024*1024||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)
    return {error:'La imagen convertida no es un JPEG válido o supera los 8 MB admitidos por Instagram.'};
  const clave=`${a.r2Key}.instagram-jpeg-v1.jpg`;
  await bucket.put(clave,bytes,{httpMetadata:{contentType:'image/jpeg'}});
  const actualizado=await medios.updateOne({_id:a._id,renovacionId:doc._id,r2Key:a.r2Key,tipo:a.tipo},
    {$set:{publicacionR2Key:clave,publicacionTipo:'image/jpeg',publicacionTamano:bytes.byteLength,publicacionGeneradaEn:new Date()}});
  if(actualizado.matchedCount!==1)return {error:'El archivo cambió de estado. Actualizá la revisión.'};
  return {ok:true};
}
async function comprobaciones(db,env,doc){
  const problemas=[];
  if(!doc.pagoConfirmado||doc.estado!=='activada'||!doc.activadaEn)problemas.push('El pago y la activación administrativa deben estar confirmados.');
  if(doc.configuracionEstado!=='en_revision'&&doc.configuracionEstado!=='programada')problemas.push('El cliente todavía no envió los contenidos a revisión.');
  const archivos=await consultarArchivos(db,doc);
  if(!completos(doc,archivos))problemas.push('Hay archivos faltantes o distintos de la configuración enviada.');
  if(!archivos.length||archivos.some(a=>a.revision!=='aprobado'))problemas.push('Todos los archivos deben estar aprobados en Revisión de contenidos.');
  if(archivos.some(a=>!SAFE_MIME.has(a.tipo)))problemas.push('Hay un formato de archivo no admitido.');
  if(doc.redes.includes('instagram')&&archivos.some(a=>a.tipo!=='video/mp4'&&a.tipo!=='image/jpeg'&&!(a.publicacionTipo==='image/jpeg'&&a.publicacionR2Key&&a.publicacionTamano>0)))problemas.push('Hay imágenes PNG/WebP sin convertir para Instagram. Abrí «Revisión de contenidos» y pulsá «Preparar JPEG».');
  if(!env?.SERVICIOS_CONTENIDOS_R2?.head)problemas.push('Falta el bucket privado de contenidos.');
  if(!problemas.length){for(const a of archivos){
    const r=await env.SERVICIOS_CONTENIDOS_R2.head(a.r2Key);
    if(!r||r.size!==a.tamano){problemas.push('Un archivo aprobado falta en R2 o cambió de tamaño.');break;}
    if(doc.redes.includes('instagram')&&['image/png','image/webp'].includes(a.tipo)){
      const jpeg=await env.SERVICIOS_CONTENIDOS_R2.head(a.publicacionR2Key);
      if(jpeg?.size!==a.publicacionTamano){problemas.push('Falta la versión JPEG para Instagram de un archivo aprobado.');break;}
    }
  }}
  const cuentas=await db.collection('conexiones_meta_pedidos').find({pedidoId:doc.pedidoId,plataforma:{$in:doc.redes}}).toArray();
  if(!conectados(cuentas,doc.redes))problemas.push('Falta una conexión válida de las redes elegidas.');
  const padre=await db.collection('pedidos_servicios').findOne({pedidoId:doc.pedidoId,tipo:'publicaciones',clienteUsuarioId:doc.clienteUsuarioId});
  if(!padre)problemas.push('No existe el pedido original asociado a esta cuenta.');
  return {problemas,archivos,padre};
}
async function propuesta(db,doc){
  const anteriores=await db.collection(COLA).find({pedidoId:doc.pedidoId,estado:{$in:['activa','finalizada','preparando']}}).project({fin:1}).toArray();
  const ultimos=anteriores.map(x=>Date.parse(x.fin||'')).filter(Number.isFinite);
  const desde=Math.max(Date.now()+15*60000,...ultimos);
  const ancla=new Date(desde);
  const virtual={redes:doc.redes,zonaHoraria:doc.configuracion?.zonaHoraria,publicaciones:doc.configuracion?.publicaciones};
  const resultado=calcularCalendarioSimulado(virtual,ancla);
  return {resultado,ancla,fin:new Date(desde+7*24*3600000)};
}
async function enviarCorreo(env,doc){
  if(!env.RESEND_API_KEY||!env.SERVICIO_CLIENTES_CORREO_DESDE||!doc.email)return false;
  const texto=`Tu contenido está aprobado y programado para publicarse el día y a la hora que configuraste. No tenés que hacer nada más.\n\nPodés ver tu contenido en tu panel: ${PUBLICACIONES_URL}\n\nSaludos,\nEl equipo de Redes en Piloto`;
  const html=`<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#29323c"><h2>Contenido programado</h2><p>Tu contenido está aprobado y programado para publicarse el día y a la hora que configuraste. No tenés que hacer nada más.</p><p>Podés ver tu contenido en tu panel.</p><p><a href="${PUBLICACIONES_URL}" style="display:inline-block;padding:12px 18px;background:#dd6b20;color:white;border-radius:6px;text-decoration:none">Ir a mi panel</a></p><p>Saludos,<br>El equipo de Redes en Piloto</p></div>`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:env.SERVICIO_CLIENTES_CORREO_DESDE,to:[doc.email],subject:'Contenido programado',text:texto,html})});return r.ok;
}
async function despacharCorreo(db,env,doc){const t=db.collection(TABLA);const r=await t.updateOne({_id:doc._id,configuracionEstado:'programada',correoProgramacionEstado:{$exists:false}},{$set:{correoProgramacionEstado:'enviando',correoProgramacionIntentadoEn:new Date()}});if(!r.modifiedCount)return;let ok=false;try{ok=await enviarCorreo(env,doc);}catch(e){console.warn('Correo programación semana:',e?.name||'Error');}await t.updateOne({_id:doc._id,correoProgramacionEstado:'enviando'},{$set:{correoProgramacionEstado:ok?'enviado':'error',correoProgramacionEn:ok?new Date():null}});}
async function programar(db,env,doc){
  const cola=db.collection(COLA),tabla=db.collection(TABLA);
  if(String(env.SERVICIO_CLIENTES_PUBLICACION_REAL_HABILITADA||'').toLowerCase()!=='true'||String(env.SERVICIO_SEMANAS_PAGADAS_PUBLICACION_HABILITADA||'').toLowerCase()!=='true')return {error:'La programación de semanas pagadas aún está deshabilitada. Comprobá la integración y activá SERVICIO_SEMANAS_PAGADAS_PUBLICACION_HABILITADA.'};
  const previo=await cola.findOne({_id:doc._id});
  if(previo?.estado==='activa'&&doc.configuracionEstado==='programada')return {ok:true,existente:true};
  if(doc.configuracionEstado!=='en_revision'&&doc.configuracionEstado!=='programada')return {error:'La semana todavía no está en revisión.'};
  const chk=await comprobaciones(db,env,doc);
  if(chk.problemas.length)return {error:chk.problemas.join(' ')};
  const pr=previo?null:await propuesta(db,doc);
  if(pr?.resultado.advertencias.length||pr&&pr.resultado.eventos.length!==doc.redes.length*4)return {error:pr.resultado.advertencias.join(' ')||'Faltan horarios válidos.'};
  const ahora=new Date();
  if(!previo){
    const eventos=pr.resultado.eventos.map(e=>({id:e.id,contenidoId:e.contenidoId,red:e.red,tipo:e.tipo,fechaHoraUTC:e.fechaHoraUTC,estado:'programada',intentos:0,contenedorId:null,metaId:null,enlace:null,publicadaEn:null}));
    try{await cola.insertOne({_id:doc._id,tipoSemana:'pagada',pedidoId:doc.pedidoId,clienteUsuarioId:doc.clienteUsuarioId,numeroSemana:numeroSemana(doc),revision:crypto.createHash('sha256').update(JSON.stringify({configuracion:doc.configuracion,archivos:chk.archivos.map(a=>[a._id,a.revision,a.r2Key])})).digest('hex'),estado:'preparando',publicacionHabilitada:false,creadoEn:ahora,inicio:pr.ancla,fin:pr.fin,zonaHoraria:doc.configuracion.zonaHoraria,redes:doc.redes,publicaciones:doc.configuracion.publicaciones,eventos});}
    catch(e){if(e?.code===11000)return {error:'Otra sesión está programando esta semana. Actualizá la página.'};throw e;}
  }else if(previo.estado!=='preparando'||previo.tipoSemana!=='pagada'||previo.pedidoId!==doc.pedidoId){return {error:'La programación anterior tiene un estado incompatible. Requiere revisión técnica.'};}
  const base=previo||await cola.findOne({_id:doc._id,estado:'preparando'});
  if(!base)return {error:'No se encontró la programación preparada.'};
  if(doc.configuracionEstado==='en_revision'){
    const upd=await tabla.updateOne({_id:doc._id,configuracionEstado:'en_revision',estado:'activada',pagoConfirmado:true},{$set:{configuracionEstado:'programada',estadoSemana:'programada',programadaEn:new Date(),inicio:base.inicio,fin:base.fin,actualizadoEn:new Date()}});
    if(!upd.modifiedCount)return {error:'El estado de la renovación cambió durante la programación. Reabrí la página.'};
  }
  await cola.updateOne({_id:doc._id,estado:'preparando',tipoSemana:'pagada'},{$set:{estado:'activa',publicacionHabilitada:true,activadaEn:new Date()}});
  const confirmado=await cola.findOne({_id:doc._id,estado:'activa',publicacionHabilitada:true});
  return confirmado?{ok:true}: {error:'La cola todavía no quedó activa. Reintentá la aprobación; no se duplicarán eventos.'};
}
async function verArchivo(request,env,db,doc,archivo){
  if(!archivo||!archivo.r2Key)return pagina('Archivo no encontrado','',404);
  const b=env.SERVICIOS_CONTENIDOS_R2;if(!b?.get)return pagina('R2 no disponible','',503);
  let range=null;const hdr=request.headers.get('range');
  if(hdr){const m=/^bytes=(\d+)-(\d*)$/.exec(hdr);if(!m)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${archivo.tamano}`}});const a=Number(m[1]),z=m[2]?Number(m[2]):archivo.tamano-1;if(!Number.isSafeInteger(a)||!Number.isSafeInteger(z)||a<0||z<a||z>=archivo.tamano)return new Response(null,{status:416,headers:{'Content-Range':`bytes */${archivo.tamano}`}});range={offset:a,length:z-a+1};}
  const objeto=await b.get(archivo.r2Key,range?{range}:undefined);if(!objeto)return pagina('Archivo no encontrado','',404);
  const h={'Content-Type':archivo.tipo,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Content-Security-Policy':"default-src 'none'",'Content-Length':String(range?range.length:archivo.tamano)};
  if(range)h['Content-Range']=`bytes ${range.offset}-${range.offset+range.length-1}/${archivo.tamano}`;
  return new Response(objeto.body,{status:range?206:200,headers:h});
}
export async function listarRenovacionesPendientes(db){const docs=await db.collection(TABLA).find({pagoConfirmado:true,estado:'activada',configuracionEstado:{$in:['en_revision','programada']}}).sort({enviadoEn:-1}).limit(40).project({_id:1,pedidoId:1,numeroSemana:1,email:1,configuracionEstado:1}).toArray();return docs;}
export async function ejecutarAdminSemanaPagada(request,env,autorizado,tipo){
  if(!autorizado)return pagina('Acceso restringido','<p>Iniciá sesión en Administración.</p>',401);
  if(!['GET','POST'].includes(request.method))return pagina('Método inválido','',405);
  const url=new URL(request.url),semanaId=url.searchParams.get('semanaId');
  if(request.method==='POST'){
    const origin=request.headers.get('origin'),referer=request.headers.get('referer'),sitio=request.headers.get('sec-fetch-site');
    let refererValido=false;try{refererValido=Boolean(referer&&new URL(referer).origin===url.origin);}catch{}
    if((sitio&&sitio!=='same-origin')||(origin&&origin!=='null'&&origin!==url.origin)||((!origin||origin==='null')&&sitio!=='same-origin'&&!refererValido))return pagina('Origen no autorizado','',403);
  }
  try{return await conDB(env,async db=>{
    let body=null, id=semanaId;
    if(request.method==='POST'){
      if(!/application\/x-www-form-urlencoded/i.test(request.headers.get('content-type')||'')||Number(request.headers.get('content-length')||0)>4096)return pagina('Formulario inválido','',400);
      const txt=await request.text();if(txt.length>4096)return pagina('Formulario inválido','',400);
      body=new URLSearchParams(txt);id=body.get('semanaId');
      if(id!==semanaId)return pagina('Identificador de semana incorrecto','',400);
      const accion=body.get('accion')||'',detalle=body.get('detalle')||'';
      if(!SEMANA.test(id||'')||!firmaValida(env,id,accion,detalle,body.get('vence'),body.get('csrf')))return pagina('Formulario vencido','<p>Recargá la página y repetí la acción.</p>',403);
    }
    if(!SEMANA.test(id||''))return pagina('Semana inválida','<p>No se encontró un identificador de renovación válido.</p>',400);
    const doc=await db.collection(TABLA).findOne({_id:id,pagoConfirmado:true});
    if(!doc)return pagina('Semana no encontrada','',404);
    if(request.method==='GET'&&tipo==='archivos'&&url.searchParams.get('accion')==='ver'){
      const content=url.searchParams.get('contenido'),pos=Number(url.searchParams.get('pos'));
      if(!/^contenido-[1-4]$/.test(content||'')||!Number.isInteger(pos)||pos<0||pos>9)return pagina('Archivo inválido','',400);
      const a=await db.collection(MEDIOS).findOne({renovacionId:doc._id,contenidoId:content,posicion:pos});
      return verArchivo(request,env,db,doc,a);
    }
    if(request.method==='POST'){
      if(tipo==='archivos'&&body.get('accion')==='preparar_jpeg'){
        if(doc.configuracionEstado!=='en_revision')return pagina('Revisión cerrada','',409);
        const [content,posTxt]=(body.get('detalle')||'').split(':');const pos=Number(posTxt);
        if(!/^contenido-[1-4]$/.test(content)||!Number.isInteger(pos)||pos<0||pos>9)return pagina('Archivo inválido','',400);
        const esperado=archivoEsperado(doc,content,pos);
        const a=await db.collection(MEDIOS).findOne({renovacionId:doc._id,contenidoId:content,posicion:pos});
        if(!esperado||!a||a.nombre!==esperado.nombre||a.tamano!==esperado.tamano||a.tipo!==esperado.tipo||a.revision!=='aprobado')return pagina('Archivo sin aprobar','',409);
        const r=await prepararJpegInstagram(db,env,doc,a);
        if(!r.ok)return pagina('No se pudo preparar JPEG',`<section class="warn">${escape(r.error)}</section>${nav(doc)}`,409);
        return Response.redirect(`${url.origin}${BASE_ARCH}?semanaId=${encodeURIComponent(id)}`,303);
      }
      if(tipo==='archivos'&&body.get('accion')==='revision_archivo'){
        if(!['en_revision'].includes(doc.configuracionEstado))return pagina('Revisión cerrada','<p>La semana ya cambió de estado.</p>',409);
        const [content,posTxt,revision]=(body.get('detalle')||'').split(':');const pos=Number(posTxt);
        if(!/^contenido-[1-4]$/.test(content)||!Number.isInteger(pos)||pos<0||pos>9||!['aprobado','rechazado'].includes(revision))return pagina('Revisión inválida','',400);
        const esperado=archivoEsperado(doc,content,pos);if(!esperado)return pagina('Archivo no incluido','',400);
        const a=await db.collection(MEDIOS).findOne({renovacionId:doc._id,contenidoId:content,posicion:pos});
        if(!a||a.nombre!==esperado.nombre||a.tamano!==esperado.tamano||a.tipo!==esperado.tipo)return pagina('Archivo diferente','',409);
        if(revision==='aprobado'){
          const r=await prepararJpegInstagram(db,env,doc,a);
          if(!r.ok)return pagina('No se pudo aprobar el archivo',`<section class="warn">${escape(r.error)}</section>${nav(doc)}`,409);
        }
        await db.collection(MEDIOS).updateOne({_id:a._id,renovacionId:doc._id},{$set:{revision,revisadoEn:new Date()}});
        return Response.redirect(`${url.origin}${BASE_ARCH}?semanaId=${encodeURIComponent(id)}`,303);
      }
      if(tipo==='programacion'&&body.get('accion')==='programar_semana'){
        const resultado=await programar(db,env,doc);
        if(!resultado.ok)return pagina('No se pudo programar',`<section class="warn">${escape(resultado.error)}</section>${nav(doc)}`,409);
        const actual=await db.collection(TABLA).findOne({_id:id});
        if(actual?.configuracionEstado==='programada')await despacharCorreo(db,env,actual);
        return Response.redirect(`${url.origin}${BASE_PROG}?semanaId=${encodeURIComponent(id)}&programada=1`,303);
      }
      return pagina('Acción inválida','',400);
    }
    const header=`<section><h2>Semana ${numeroSemana(doc)} · ${escape(doc.email||'Cliente')}</h2><p>Pedido: ${escape(doc.pedidoId)}</p><p>Pago: <strong>confirmado</strong> · Estado de contenidos: <strong>${escape(doc.configuracionEstado||'sin_configurar')}</strong></p>${nav(doc)}</section>`;
    const archivos=await consultarArchivos(db,doc);
    if(tipo==='archivos'){
      const tarjetas=(doc.configuracion?.publicaciones||[]).map((p,i)=>{
        const filas=p.archivosSeleccionados.map((meta,pos)=>{
          const a=archivos.find(a=>a.contenidoId===p.id&&a.posicion===pos);
          const ver=`${BASE_ARCH}?semanaId=${encodeURIComponent(id)}&accion=ver&contenido=${encodeURIComponent(p.id)}&pos=${pos}`;
          const media=a?.r2Key ? a.tipo.startsWith('image/')?`<img src="${escape(ver)}" alt="Contenido ${i+1}">`:`<video src="${escape(ver)}" controls preload="none" playsinline></video>`:'<p>Archivo pendiente</p>';
          const requiereJpeg=doc.redes.includes('instagram')&&['image/png','image/webp'].includes(a?.tipo||'');
          const jpegListo=a?.publicacionTipo==='image/jpeg'&&Boolean(a?.publicacionR2Key)&&a?.publicacionTamano>0;
          const estadoJPEG=requiereJpeg?`<p class="${jpegListo?'good':'warn'}">${jpegListo?'JPEG para Instagram preparado':'Pendiente: preparar JPEG para Instagram'}</p>`:'';
          const botones=doc.configuracionEstado==='en_revision'&&a?.r2Key
            ? (a.revision==='aprobado'
              ? (requiereJpeg&&!jpegListo?`<form method="post" action="${BASE_ARCH}?semanaId=${encodeURIComponent(id)}">${campos(env,id,'preparar_jpeg',`${p.id}:${pos}`)}<button type="submit">Preparar JPEG</button></form>`:'')
              : `<form method="post" action="${BASE_ARCH}?semanaId=${encodeURIComponent(id)}">${campos(env,id,'revision_archivo',`${p.id}:${pos}:aprobado`)}<button type="submit">Aprobar archivo</button></form>`)
            : '';
          return `<article>${media}<p>${escape(meta.nombre)} · ${escape(a?.revision||'pendiente')}</p>${estadoJPEG}${botones}</article>`;
        }).join('');
        return `<section><h2>Contenido ${i+1} · ${escape(p.tipo)}</h2><p>${escape(p.diaPreferido)} · ${escape(p.horaLocalPreferida)} · hora local</p><p>${escape(p.descripcion)}</p><p>Instagram: ${escape(p.ctaInstagram)}</p><p>Facebook: ${escape(p.ctaFacebook)} · ${escape(p.urlFacebook)}</p><p>Hashtags: ${escape(p.hashtags)}</p>${filas}</section>`;
      }).join('');
      return pagina('Revisión de contenidos · Semana pagada',header+tarjetas+(doc.configuracionEstado==='en_revision'?`<section class="info">Aprobá cada archivo. Después entrá a «Aprobar y programar semana» para activar la cola real.</section>`:''));
    }
    const plan=await db.collection(COLA).findOne({_id:id});
    if(plan?.estado==='activa'||plan?.estado==='finalizada'){
      const ev=(plan.eventos||[]).map(e=>`<article><strong>${escape(e.contenidoId)} · ${escape(e.red)}</strong><p>${fecha(e.fechaHoraUTC,plan.zonaHoraria)} · ${escape(e.estado)}${e.enlace?` · <a target="_blank" rel="noopener noreferrer" href="${escape(e.enlace)}">Ver publicación</a>`:''}</p></article>`).join('');
      return pagina('Semana pagada programada',header+`<section><h2>Programación confirmada</h2><p class="good">${escape(plan.estado)} · ${plan.eventos.length} publicaciones</p><p>Desde: ${fecha(plan.inicio,plan.zonaHoraria)} · Hasta: ${fecha(plan.fin,plan.zonaHoraria)}</p>${ev}</section>`);
    }
    const chk=await comprobaciones(db,env,doc);
    let proj=null;if(!chk.problemas.length)proj=await propuesta(db,doc);
    const warn=[...chk.problemas,...(proj?.resultado?.advertencias||[])];
    const filas=(proj?.resultado?.eventos||[]).map(e=>`<article>${escape(e.contenidoId)} · ${escape(e.red)} · ${fecha(e.fechaHoraUTC,doc.configuracion.zonaHoraria)}</article>`).join('');
    const listo=warn.length===0&&proj?.resultado?.eventos?.length===doc.redes.length*4;
    if(String(env.SERVICIO_SEMANAS_PAGADAS_PUBLICACION_HABILITADA||'').toLowerCase()!=='true')warn.push('La programación real de semanas pagadas está en modo seguro: falta habilitarla después de las pruebas.');
    return pagina('Aprobar y programar semana · Pagada',header+`<section><h2>Verificaciones previas</h2>${warn.length?warn.map(x=>`<p class="warn">• ${escape(x)}</p>`).join(''):'<p class="good">✓ Pago, archivos, conexiones y calendario validados.</p>'}</section><section><h2>Programación propuesta</h2><p>Los siete días comenzarán después de la semana anterior, sin superponerse.</p>${filas||'<p class="muted">Todavía no puede calcularse el calendario.</p>'}</section><section><h2>Aprobación final</h2>${listo && String(env.SERVICIO_SEMANAS_PAGADAS_PUBLICACION_HABILITADA||'').toLowerCase()==='true'?`<form method="post" action="${BASE_PROG}?semanaId=${encodeURIComponent(id)}">${campos(env,id,'programar_semana','confirmar')}<button type="submit">Aprobar y programar semana ${numeroSemana(doc)}</button></form>`:'<p>Completá los requisitos pendientes. No se programará ningún envío todavía.</p>'}</section>`);
  });}catch(e){console.error('Admin semana pagada:',e?.name||'Error',e?.code||'');return pagina('Revisión temporalmente no disponible','<p>Revisá los registros de Cloudflare; no se habilitó ninguna publicación.</p>',503);}
}
