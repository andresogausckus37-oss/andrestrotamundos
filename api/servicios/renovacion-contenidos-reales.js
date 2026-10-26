// Semana pagada: recibe contenido privado para revision administrativa.
// No programa Meta ni modifica el cron. Requiere pago comprobado y activacion admin.
import crypto from 'node:crypto';
import { obtenerClienteRegistrado } from './clientes-acceso.js';
const BASE='/api/servicios/publicaciones/renovacion-contenidos';
const DB='andres_imprimibles';
const TABLA='renovaciones_transferencia_reales';
const MEDIOS='medios_renovaciones_reales';
const ID=/^renovacion-real:SER-[a-f0-9-]{36}(?::(?:[3-9]|[1-9][0-9]{1,2}))?$/i;
const MAX=25*1024*1024;
const json=(v,s=200)=>Response.json(v,{status:s,headers:{'Cache-Control':'no-store'}});
const origen=req=>req.headers.get('origin')===new URL(req.url).origin;
async function conDB(env,fn){const {MongoClient}=await import('mongodb');const c=new MongoClient(env.MONGODB_URI);try{await c.connect();return await fn(c.db(DB));}finally{await c.close().catch(()=>{});}}
async function leerJson(req){if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||'')||Number(req.headers.get('content-length')||0)>16000)return null;const t=await req.text();if(t.length>16000)return null;try{const v=JSON.parse(t);return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch{return null;}}
const zonaValida=v=>{try{new Intl.DateTimeFormat('es-AR',{timeZone:v});return true;}catch{return false;}};
function configValida(data,doc){
  if(!data||data.id!==doc._id||!zonaValida(data.zonaHoraria)||!Array.isArray(data.publicaciones)||data.publicaciones.length!==4)return null;
  const dias=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const publicaciones=[];
  for(let i=0;i<4;i++){
    const x=data.publicaciones[i];
    if(!x||x.id!==`contenido-${i+1}`||!['imagen','carrusel','reel'].includes(x.tipo)||!['9:16','4:5','1:1'].includes(x.formato)||!dias.includes(x.dia)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.hora||'')||!Array.isArray(x.archivosSeleccionados)||x.archivosSeleccionados.length<(x.tipo==='carrusel'?2:1)||x.archivosSeleccionados.length>(x.tipo==='carrusel'?10:1))return null;
    if([x.descripcion,x.ctaInstagram,x.ctaFacebook,x.urlFacebook,x.hashtags].some(t=>typeof t!=='string'||t.length>1600))return null;
    const archivos=[];
    for(const a of x.archivosSeleccionados){
      const permitidos=x.tipo==='reel'?['video/mp4']:['image/jpeg','image/png','image/webp'];
      if(!a||typeof a.nombre!=='string'||a.nombre.length>150||!permitidos.includes(a.tipo)||!Number.isSafeInteger(a.tamano)||a.tamano<100||a.tamano>MAX)return null;
      // La revisión administrativa generará una copia JPEG si Instagram requiere convertir PNG/WebP.
      // No se acepta un original PNG/WebP superior al límite de entrada de Cloudflare Images (20 MiB).
      if(doc.redes.includes('instagram')&&x.tipo!=='reel'&&a.tipo!=='image/jpeg'&&a.tamano>20*1024*1024)return null;
      archivos.push({nombre:a.nombre,tipo:a.tipo,tamano:a.tamano});
    }
    publicaciones.push({id:x.id,tipo:x.tipo,formato:x.formato,diaPreferido:x.dia,horaLocalPreferida:x.hora,descripcion:x.descripcion,ctaInstagram:x.ctaInstagram,ctaFacebook:x.ctaFacebook,urlFacebook:x.urlFacebook,hashtags:x.hashtags,archivosSeleccionados:archivos});
  }
  return {zonaHoraria:data.zonaHoraria,redes:doc.redes,publicaciones};
}
async function leerArchivo(req,max){if(Number(req.headers.get('content-length')||0)>max||!req.body)return null;let n=0;const partes=[],lector=req.body.getReader();while(true){const {done,value}=await lector.read();if(done)break;n+=value.byteLength;if(n>max){await lector.cancel().catch(()=>{});return null;}partes.push(value);}if(n<100)return null;const b=new Uint8Array(n);let o=0;for(const p of partes){b.set(p,o);o+=p.length;}return b;}
function mime(b){if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';if([137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v))return 'image/png';if([82,73,70,70].every((v,i)=>b[i]===v)&&[87,69,66,80].every((v,i)=>b[i+8]===v))return 'image/webp';if([102,116,121,112].every((v,i)=>b[i+4]===v))return 'video/mp4';return null;}
async function completos(db,doc){const ps=doc.configuracion?.publicaciones;if(!Array.isArray(ps)||ps.length!==4)return false;const recibidos=await db.collection(MEDIOS).find({renovacionId:doc._id}).toArray();const n=ps.reduce((s,p)=>s+p.archivosSeleccionados.length,0);if(n!==recibidos.length)return false;return ps.every(p=>p.archivosSeleccionados.every((a,i)=>recibidos.some(m=>m.contenidoId===p.id&&m.posicion===i&&m.nombre===a.nombre&&m.tipo===a.tipo&&m.tamano===a.tamano&&m.r2Key)));}
export async function ejecutarContenidosRenovacionReal(req,env){
  const url=new URL(req.url),ruta=url.pathname;
  if(![BASE+'/configurar',BASE+'/medio',BASE+'/enviar'].includes(ruta))return json({ok:false,error:'Ruta no encontrada.'},404);
  if(req.method!=='POST'||!origen(req))return json({ok:false,error:'Método u origen no autorizado.'},403);
  const usuario=await obtenerClienteRegistrado(req,env).catch(()=>null);
  if(!usuario?.id)return json({ok:false,error:'Iniciá sesión con tu correo confirmado.'},401);
  if(!env.MONGODB_URI||!env.SERVICIOS_CONTENIDOS_R2?.put)return json({ok:false,error:'Almacenamiento de contenidos no disponible.'},503);
  const info=ruta===BASE+'/medio'?null:await leerJson(req);
  const id=ruta===BASE+'/medio'?url.searchParams.get('id'):info?.id;
  if(!ID.test(id||''))return json({ok:false,error:'Pedido de renovación inválido.'},400);
  try{return await conDB(env,async db=>{
    const tabla=db.collection(TABLA),medios=db.collection(MEDIOS);
    const doc=await tabla.findOne({_id:id,clienteUsuarioId:usuario.id,pagoConfirmado:true,estado:'activada'});
    if(!doc)return json({ok:false,error:'La semana todavía no fue activada por Administración.'},409);
    if(ruta===BASE+'/configurar'){
      if(![null,undefined,'sin_configurar','en_preparacion'].includes(doc.configuracionEstado))return json({ok:false,error:'Los contenidos ya fueron enviados a revisión.'},409);
      const config=configValida(info,doc);if(!config)return json({ok:false,error:'Revisá los cuatro contenidos, horarios y archivos (hasta 25 MB cada uno).'},400);
      const existentes=await medios.countDocuments({renovacionId:id});
      if(existentes&&JSON.stringify(config)!==JSON.stringify(doc.configuracion))return json({ok:false,error:'Ya existen archivos cargados: conservá la configuración original del pedido.'},409);
      await tabla.updateOne({_id:id,clienteUsuarioId:usuario.id,estado:'activada',configuracionEstado:{$nin:['en_revision','aprobada']}},{$set:{configuracion:config,configuracionEstado:'en_preparacion',actualizadoEn:new Date()}});
      return json({ok:true,id,estado:'en_preparacion'});
    }
    if(!doc.configuracion||doc.configuracionEstado!=='en_preparacion')return json({ok:false,error:'Primero guardá la programación.'},409);
    if(ruta===BASE+'/medio'){
      const contenido=url.searchParams.get('contenido')||'',pos=Number(url.searchParams.get('pos'));
      const pub=doc.configuracion.publicaciones.find(p=>p.id===contenido);
      const esperado=Number.isInteger(pos)&&pos>=0?pub?.archivosSeleccionados[pos]:null;
      if(!esperado)return json({ok:false,error:'Archivo no incluido en la programación.'},400);
      const clave=`${id}:${contenido}:${pos}`;
      const previo=await medios.findOne({_id:clave,renovacionId:id});
      if(previo?.r2Key&&previo.nombre===esperado.nombre&&previo.tipo===esperado.tipo&&previo.tamano===esperado.tamano)return json({ok:true,contenido,pos,reutilizado:true});
      if(req.headers.get('content-type')!==esperado.tipo)return json({ok:false,error:'Formato distinto del archivo elegido.'},415);
      const b=await leerArchivo(req,MAX);
      if(!b||b.byteLength!==esperado.tamano||mime(b)!==esperado.tipo)return json({ok:false,error:'El archivo no coincide con el original o supera 25 MB.'},400);
      const r2Key=`renovaciones-reales/contenidos/${id}/${contenido}/${pos}-${crypto.randomUUID()}`;
      await env.SERVICIOS_CONTENIDOS_R2.put(r2Key,b,{httpMetadata:{contentType:esperado.tipo}});
      try {await medios.updateOne({_id:clave,renovacionId:id},{$set:{renovacionId:id,contenidoId:contenido,posicion:pos,nombre:esperado.nombre,tipo:esperado.tipo,tamano:esperado.tamano,r2Key,subidoEn:new Date()}},{upsert:true});}
      catch(e){await env.SERVICIOS_CONTENIDOS_R2.delete(r2Key).catch(()=>{});throw e;}
      return json({ok:true,contenido,pos});
    }
    if(!await completos(db,doc))return json({ok:false,error:'Faltan archivos de los cuatro contenidos. Reintentá los pendientes.'},409);
    const r=await tabla.updateOne({_id:id,clienteUsuarioId:usuario.id,estado:'activada',configuracionEstado:'en_preparacion'},{$set:{configuracionEstado:'en_revision',enviadoEn:new Date(),actualizadoEn:new Date()}});
    return r.modifiedCount===1?json({ok:true,estado:'en_revision'}):json({ok:false,error:'La configuración ya cambió de estado.'},409);
  });}catch(e){console.error('Contenido renovación real:',e?.name||'Error',e?.code||'');return json({ok:false,error:'Error temporal al guardar la semana. Consultá el pedido antes de reintentar.'},503);}
}
