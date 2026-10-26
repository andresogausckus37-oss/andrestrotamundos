// Ensayo aislado de transferencia $0 y de correos. NO crea pedidos reales,
// NO altera las publicaciones ni concede días de servicio.
import crypto from 'node:crypto';
import { obtenerClienteRegistrado } from './clientes-acceso.js';
import { calcularCalendarioSimulado } from './calendario-simulacion.js';

const DB = 'andres_imprimibles';
const TABLA = 'renovaciones_transferencia_ensayo';
const MEDIOS = 'medios_renovaciones_transferencia_ensayo';
const CLIENTE = '/api/servicios/publicaciones/transferencia-ensayo';
const ADMIN = '/api/admin/servicios/publicaciones/transferencias-ensayo';
const ID = /^REN-TEST-[a-f0-9-]{36}$/i;
const LIMIT = 8 * 1024 * 1024;
const json = (v, status=200) => Response.json(v, {status, headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const escape = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const banderaActiva = env => String(env?.SERVICIO_TRANSFERENCIA_TEST_HABILITADO ?? '').trim().toLowerCase()==='true';
const habilitado = (env,email) => banderaActiva(env) && Boolean(email) &&
  String(env?.SERVICIO_TRANSFERENCIA_TEST_EMAIL||'').trim().toLowerCase()===String(email).trim().toLowerCase();
const correoPermitido = (env,email) => habilitado(env,email) && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
const mismosOrigenes = request => {const url=new URL(request.url);return request.headers.get('origin')===url.origin && request.headers.get('x-comunidad-panel')==='1';};
async function bd(env, accion) {
  if(!env.MONGODB_URI) throw new Error('SIN_DB');
  const {MongoClient}=await import('mongodb'); const c=new MongoClient(env.MONGODB_URI);
  try {await c.connect();return await accion(c.db(DB));} finally{await c.close().catch(()=>{});}
}
function cuenta(env) {
  const entidad=String(env.SERVICIO_TRANSFERENCIA_ENTIDAD||'').trim();
  const titular=String(env.SERVICIO_TRANSFERENCIA_TITULAR||'').trim();
  const alias=String(env.SERVICIO_TRANSFERENCIA_ALIAS||'').trim();
  const cvu=String(env.SERVICIO_TRANSFERENCIA_CBU_CVU||'').replace(/\s/g,'');
  return entidad && titular && /^[a-z\d_.-]{6,60}$/i.test(alias) && /^\d{22}$/.test(cvu)
    ? {entidad,titular,alias,cvu} : null;
}
const bucket = env => env?.SERVICIOS_COMPROBANTES_R2?.put && env?.SERVICIOS_COMPROBANTES_R2?.get ? env.SERVICIOS_COMPROBANTES_R2 : null;
function soloPublico(doc) {
  if(!doc) return null;
  return {id:doc._id,redes:doc.redes,precio:0,precioHabitual:doc.precioHabitual,estado:doc.estado,
    creadoEn:doc.creadoEn,comprobanteRecibido:Boolean(doc.comprobante),emailEnviadoEn:doc.emailEnviadoEn||null,
    configuracionEstado:doc.configuracionEstado||'sin_configurar',
    configuracionGuardadaEn:doc.configuracionGuardadaEn||null, programacionSimulada:doc.programacionSimulada||null,
    resumenContenidos:Array.isArray(doc.configuracion?.publicaciones)
      ? doc.configuracion.publicaciones.map((p,i)=>({numero:i+1,tipo:p.tipo,dia:p.diaPreferido,hora:p.horaLocalPreferida}))
      : []};
}
async function leerJson(req) {
  if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||'')||Number(req.headers.get('content-length')||0)>1024) return null;
  const t=await req.text();if(t.length>1024)return null;
  try {const x=JSON.parse(t);return x && typeof x==='object'&&!Array.isArray(x)?x:null;}catch{return null;}
}
async function leerJsonLargo(req){
  if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||'')||Number(req.headers.get('content-length')||0)>16000)return null;
  const texto=await req.text();if(texto.length>16000)return null;
  try {const v=JSON.parse(texto);return v&&typeof v==='object'&&!Array.isArray(v)?v:null;}catch{return null;}
}
async function leerBytes(req) {
  const declarado=Number(req.headers.get('content-length')||0);if(declarado>LIMIT || !req.body)return null;
  const r=req.body.getReader(),partes=[];let total=0;
  while(true){const {done,value}=await r.read();if(done)break;total+=value.length;if(total>LIMIT){await r.cancel();return null;}partes.push(value);}
  if(total<100)return null;const arr=new Uint8Array(total);let o=0;for(const p of partes){arr.set(p,o);o+=p.length;}return arr;
}
function formato(bytes) {
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255) return ['image/jpeg','jpg'];
  if([137,80,78,71,13,10,26,10].every((b,i)=>bytes[i]===b))return ['image/png','png'];
  if([37,80,68,70,45].every((b,i)=>bytes[i]===b))return ['application/pdf','pdf'];
  return null;
}
// Flujo aislado de Semana 2: archivos privados y programación de ensayo.
// NUNCA escribe en pedidos_servicios ni en la cola real del cron.
const maxArchivoPrueba = 25*1024*1024;
const zonaValida = zona => {try { new Intl.DateTimeFormat('en-US',{timeZone:zona}); return true; }catch{return false;}};
function leerConfigEnsayo(doc) { return doc?.configuracion && Array.isArray(doc.configuracion.publicaciones) ? doc.configuracion : null; }
function validarConfigEnsayo(datos,redes) {
  if(!datos||!ID.test(datos.id||'')||!zonaValida(datos.zonaHoraria)||!Array.isArray(datos.publicaciones)||datos.publicaciones.length!==4) return null;
  const dias=['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
  const publicaciones=[];
  for(let i=0;i<4;i++){
    const x=datos.publicaciones[i];
    if(!x||x.id!==`contenido-${i+1}`||!['imagen','carrusel','reel'].includes(x.tipo)||
       !['9:16','4:5','1:1'].includes(x.formato)||!dias.includes(x.dia)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(x.hora||'')||
       !Array.isArray(x.archivosSeleccionados)||x.archivosSeleccionados.length<(x.tipo==='carrusel'?2:1)||
       x.archivosSeleccionados.length>(x.tipo==='carrusel'?10:1)||
       [x.descripcion,x.ctaInstagram,x.ctaFacebook,x.urlFacebook,x.hashtags].some(y=>typeof y!=='string'||y.length>1600)) return null;
    const archivos=[];
    for(const a of x.archivosSeleccionados){
      const permitidos=x.tipo==='reel'?['video/mp4']:['image/jpeg','image/png','image/webp'];
      if(!a||typeof a.nombre!=='string'||a.nombre.length>150||!permitidos.includes(a.tipo)||
          !Number.isSafeInteger(a.tamano)||a.tamano<100||a.tamano>maxArchivoPrueba) return null;
      archivos.push({nombre:a.nombre,tipo:a.tipo,tamano:a.tamano});
    }
    publicaciones.push({id:x.id,tipo:x.tipo,formato:x.formato,diaPreferido:x.dia,
      horaLocalPreferida:x.hora,descripcion:x.descripcion||'',ctaInstagram:x.ctaInstagram||'',
      ctaFacebook:x.ctaFacebook||'',urlFacebook:x.urlFacebook||'',hashtags:x.hashtags||'',archivosSeleccionados:archivos});
  }
  return {zonaHoraria:datos.zonaHoraria,redes,publicaciones};
}
async function leerArchivoPrueba(req,max){
  if(Number(req.headers.get('content-length')||0)>max||!req.body)return null;
  const lector=req.body.getReader(),partes=[];let total=0;
  while(true){const {done,value}=await lector.read();if(done)break;total+=value.byteLength;
    if(total>max){await lector.cancel().catch(()=>{});return null;}partes.push(value);}
  if(total<100)return null;const bytes=new Uint8Array(total);let pos=0;
  for(const part of partes){bytes.set(part,pos);pos+=part.byteLength;}return bytes;
}
function tipoMedio(bytes){
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
  if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return 'image/png';
  if([82,73,70,70].every((v,i)=>bytes[i]===v)&&[87,69,66,80].every((v,i)=>bytes[i+8]===v))return 'image/webp';
  if([102,116,121,112].every((v,i)=>bytes[i+4]===v))return 'video/mp4';
  return null;
}
async function archivosCompletos(db,doc){
  const c=leerConfigEnsayo(doc); if(!c)return {ok:false,archivos:[]};
  const archivos=await db.collection(MEDIOS).find({pedidoId:doc._id}).toArray();
  let ok=true;
  for(const pub of c.publicaciones){for(const [pos,esperado] of pub.archivosSeleccionados.entries()){
    if(!archivos.some(a=>a.contenidoId===pub.id&&a.posicion===pos&&a.tipo===esperado.tipo&&a.tamano===esperado.tamano&&a.nombre===esperado.nombre&&a.r2Key))ok=false;
  }}
  if(archivos.length!==c.publicaciones.reduce((n,p)=>n+p.archivosSeleccionados.length,0))ok=false;
  return {ok,archivos};
}
export async function ejecutarTransferenciaEnsayo(request, env){
  const url=new URL(request.url),crear=url.pathname===CLIENTE+'/crear',subir=url.pathname===CLIENTE+'/comprobante';
  const configurar=url.pathname===CLIENTE+'/configurar',medio=url.pathname===CLIENTE+'/medio',enviar=url.pathname===CLIENTE+'/enviar';
  if(![CLIENTE,CLIENTE+'/crear',CLIENTE+'/comprobante',CLIENTE+'/configurar',CLIENTE+'/medio',CLIENTE+'/enviar'].includes(url.pathname))return json({ok:false,error:'Ruta no encontrada.'},404);
  if(request.method !== (crear||subir||configurar||medio||enviar?'POST':'GET'))return json({ok:false,error:'Método inválido.'},405);
  const usuario=await obtenerClienteRegistrado(request,env).catch(()=>null);
  if(!usuario?.id)return json({ok:false,error:'Iniciá sesión con tu correo verificado.'},401);
  if(!correoPermitido(env,usuario.email))return (crear||subir||configurar||medio||enviar)
    ? json({ok:false,error:'El modo de prueba no está habilitado para esta cuenta.'},403)
    : json({ok:true,habilitada:false,motivo:!banderaActiva(env)
      ? 'variable_inactiva' : 'correo_no_autorizado'});
  if((crear||subir||configurar||medio||enviar)&&!mismosOrigenes(request))return json({ok:false,error:'Origen inválido.'},403);
  try{
    return await bd(env,async db=>{
      const col=db.collection(TABLA);
      if(request.method==='GET'){
        const pedido=await col.findOne({clienteUsuarioId:usuario.id},{sort:{creadoEn:-1}});
        return json({ok:true,habilitada:true,cuenta:cuenta(env),pedido:soloPublico(pedido)});
      }
      if(crear){
        const entrada=await leerJson(request),redes=entrada?.redes;
        if(!Array.isArray(redes)||!redes.length||redes.length>2||new Set(redes).size!==redes.length||redes.some(x=>!['instagram','facebook'].includes(x)))
          return json({ok:false,error:'Elegí una o ambas redes.'},400);
        const actual=await col.findOne({clienteUsuarioId:usuario.id,estado:{$in:['pendiente','en_revision']}},{sort:{creadoEn:-1}});
        if(actual)return json({ok:true,pedido:soloPublico(actual),reutilizado:true});
        const pedido={_id:`REN-TEST-${crypto.randomUUID()}`,clienteUsuarioId:usuario.id,
          email:usuario.email,redes,precio:0,precioHabitual:redes.length===2?15000:10000,
          estado:'pendiente',comprobante:null,publicacionHabilitada:false,pagoReal:false,
          creadoEn:new Date(),actualizadoEn:new Date()};
        await col.insertOne(pedido);return json({ok:true,pedido:soloPublico(pedido)},201);
      }
      if(configurar||medio||enviar){
        const info=configurar||enviar?await leerJsonLargo(request):null;
        const id=configurar||enviar?info?.id:(url.searchParams.get('id')||'');
        if(!ID.test(id||''))return json({ok:false,error:'Identificador inválido.'},400);
        const doc=await col.findOne({_id:id,clienteUsuarioId:usuario.id});
        if(!doc||doc.estado!=='aprobado_prueba')return json({ok:false,error:'Primero debe aprobarse el pago de prueba.'},409);
        if(configurar){
          if(!['sin_configurar','en_preparacion',undefined].includes(doc.configuracionEstado))return json({ok:false,error:'La semana ya fue enviada para revisión.'},409);
          const config=validarConfigEnsayo(info,doc.redes);
          if(!config)return json({ok:false,error:'Revisá los contenidos, archivos y horarios.'},400);
          const archivosExistentes=await db.collection(MEDIOS).countDocuments({pedidoId:id});
          if(archivosExistentes&&JSON.stringify(config)!==JSON.stringify(doc.configuracion))
            return json({ok:false,error:'La configuración tiene archivos cargados. Volvé a seleccionar los originales antes de reintentar.'},409);
          await col.updateOne({_id:id,clienteUsuarioId:usuario.id,estado:'aprobado_prueba'},{$set:{configuracion:config,configuracionEstado:'en_preparacion',actualizadoEn:new Date()}});
          return json({ok:true,id,estado:'en_preparacion'});
        }
        if(!leerConfigEnsayo(doc)||doc.configuracionEstado!=='en_preparacion')return json({ok:false,error:'La semana ya no admite archivos o envíos.'},409);
        if(medio){
          const contenido=url.searchParams.get('contenido')||'',pos=Number(url.searchParams.get('pos'));
          const pub=doc.configuracion.publicaciones.find(p=>p.id===contenido);
          const previsto=Number.isInteger(pos)&&pos>=0&&pub?.archivosSeleccionados[pos];
          if(!previsto)return json({ok:false,error:'Archivo no previsto.'},400);
          if(request.headers.get('content-type')!==previsto.tipo)return json({ok:false,error:'Formato diferente al elegido.'},415);
          const bytes=await leerArchivoPrueba(request,maxArchivoPrueba);
          if(!bytes||bytes.length!==previsto.tamano||tipoMedio(bytes)!==previsto.tipo)return json({ok:false,error:'Archivo incorrecto o demasiado grande para la prueba.'},400);
          const r2=env?.SERVICIOS_CONTENIDOS_R2;
          if(!r2?.put||!r2?.get)return json({ok:false,error:'R2 privado de contenidos no disponible.'},503);
          const llave=`pruebas-renovacion-semana2/${id}/${contenido}/${pos}-${crypto.randomUUID()}`;
          await r2.put(llave,bytes,{httpMetadata:{contentType:previsto.tipo}});
          const key=`${id}:${contenido}:${pos}`;
          const medios=db.collection(MEDIOS);
          const anterior=await medios.findOneAndUpdate({_id:key},{$set:{pedidoId:id,contenidoId:contenido,posicion:pos,nombre:previsto.nombre,tipo:previsto.tipo,tamano:bytes.length,r2Key:llave,subidoEn:new Date()}},{upsert:true,returnDocument:'before'});
          if(anterior?.r2Key)await r2.delete(anterior.r2Key).catch(()=>{});
          return json({ok:true,contenido,pos});
        }
        const adjuntos=await archivosCompletos(db,doc);
        if(!adjuntos.ok)return json({ok:false,error:'Faltan archivos de alguno de los cuatro contenidos.'},409);
        const registro=await col.updateOne({_id:id,clienteUsuarioId:usuario.id,configuracionEstado:'en_preparacion'},{$set:{configuracionEstado:'en_revision',enviadoEn:new Date(),actualizadoEn:new Date()}});
        return registro.modifiedCount?json({ok:true,estado:'en_revision'}):json({ok:false,error:'La configuración fue modificada.'},409);
      }
      const id=url.searchParams.get('id')||'';
      if(!ID.test(id))return json({ok:false,error:'Identificador inválido.'},400);
      const pedido=await col.findOne({_id:id,clienteUsuarioId:usuario.id});
      if(!pedido||pedido.estado!=='pendiente')return json({ok:false,error:'Este ensayo no permite adjuntar comprobantes.'},409);
      if(!bucket(env))return json({ok:false,error:'Falta configurar el almacenamiento privado de comprobantes.'},503);
      const declarado=request.headers.get('content-type')||'';
      if(!['image/jpeg','image/png','application/pdf'].includes(declarado))return json({ok:false,error:'Usá JPG, PNG o PDF.'},415);
      const bytes=await leerBytes(request),tipo=bytes && formato(bytes);
      if(!tipo||tipo[0]!==declarado)return json({ok:false,error:'El comprobante no es válido o supera 8 MB.'},415);
      const llave=`pruebas-renovaciones/${crypto.randomUUID()}.${tipo[1]}`;
      await bucket(env).put(llave,bytes,{httpMetadata:{contentType:tipo[0]}});
      const fecha=new Date();
      const result=await col.updateOne({_id:id,clienteUsuarioId:usuario.id,estado:'pendiente'},{$set:{
        estado:'en_revision',actualizadoEn:fecha,comprobante:{r2Key:llave,tipo:tipo[0],tamano:bytes.length,subidoEn:fecha}}});
      if(!result.modifiedCount){await bucket(env).delete(llave).catch(()=>{});return json({ok:false,error:'El estado cambió. Actualizá el panel.'},409);}
      return json({ok:true,estado:'en_revision',mensaje:'Recibimos tu pago y lo estamos procesando. Te enviaremos pronto un correo con la confirmación.'});
    });
  }catch(e){console.warn('Ensayo transferencia:',e?.name||'ERROR');return json({ok:false,error:'No se pudo completar la prueba.'},503);}
}
function validoCsrf(env,id,vence,recibido) {
  const clave=String(env.SERVICIO_CLIENTES_SESION_SECRET||'');
  if(clave.length<32||!ID.test(id)||!/^\d{13}$/.test(vence)||Number(vence)<Date.now()||Number(vence)>Date.now()+1800000||!/^[a-f0-9]{64}$/.test(recibido||''))return false;
  const esperado=crypto.createHmac('sha256',clave).update(`admin-renovacion-ensayo:${id}:${vence}`).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(esperado,'hex'),Buffer.from(recibido,'hex'));
}
function generarCsrf(env,id){const vence=String(Date.now()+20*60000);return {vence,token:crypto.createHmac('sha256',String(env.SERVICIO_CLIENTES_SESION_SECRET)).update(`admin-renovacion-ensayo:${id}:${vence}`).digest('hex')};}
function pagina(contenido,status=200){return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Transferencias de prueba</title><style>
*{box-sizing:border-box}body{font:400 14px/1.6 Montserrat,system-ui,sans-serif;background:#f7f8fa;color:#25313b;margin:0}main{max-width:940px;margin:40px auto;padding:0 18px}h1{font-size:24px;font-weight:500}h2{font-size:16px;font-weight:500}section{background:white;border:1px solid #e8edf1;border-radius:10px;padding:20px;margin:18px 0}a{color:#2d5b78}small{color:#718096}button{font:500 13px Montserrat,system-ui,sans-serif;background:#334b5b;color:#fff;padding:9px 13px;border:0;border-radius:6px}button:disabled{opacity:.5}p{margin:8px 0}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.label{display:block;color:#667684;font-size:12px}.card{padding:14px;background:#f8fafb;border-radius:7px}</style></head><body><main><p><a href="/admin">← Administración</a></p><h1>Transferencias · modo de prueba</h1><p>Pedidos de $0. No generan cobros ni activan publicaciones.</p>${contenido}</main></body></html>`,{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','Referrer-Policy':'same-origin','Content-Security-Policy':"default-src 'none';style-src 'unsafe-inline';form-action 'self';base-uri 'none';frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'}});}
async function mandarCorreo(env,destino,tipo){
  if(!correoPermitido(env,destino))throw new Error('DESTINATARIO_NO_AUTORIZADO');
  const api=String(env.RESEND_API_KEY||'').trim(),desde=String(env.SERVICIO_CLIENTES_CORREO_DESDE||'').trim();
  if(!api||!desde)throw new Error('CORREO_SIN_CONFIGURAR');
  const asunto=tipo==='recordatorio'?'Prueba: tu semana está por finalizar':tipo==='enlace'?'Programar nueva semana':'Prueba: tu pago fue aprobado';
  const contenido=tipo==='recordatorio'
    ? 'Esta es una prueba del recordatorio de vencimiento de una semana. No hay un servicio de pago activo.'
    : tipo==='enlace' ? 'Tu pago de prueba fue aprobado. Ya podés configurar la nueva semana desde tu panel privado. La programación continuará en modo de ensayo, sin publicaciones reales.'
    : 'Esta es una prueba de confirmación de pago. El comprobante ficticio quedó aprobado. No se realizó ningún cobro ni se programaron publicaciones reales.';
  const firma='Saludos,\nEl equipo de Redes en Piloto';
  const urlPanel='https://andreshousesitter.com/servicios/publicacion-automatica/mi-panel#programar-semana-2';
  const link=tipo!=='recordatorio'?`\n\nProgramar nueva semana: ${urlPanel}`:'';
  const html=tipo!=='recordatorio'?`<div style="font:14px/1.6 Arial,sans-serif;color:#25313b"><p>${escape(contenido)}</p><p><a href="${urlPanel}" style="display:inline-block;padding:11px 16px;background:#334b5b;color:white;text-decoration:none;border-radius:6px">Programar nueva semana</a></p><p>Saludos,<br>El equipo de Redes en Piloto</p></div>`:undefined;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${api}`,'Content-Type':'application/json'},body:JSON.stringify({
    from:desde,to:[destino],subject:asunto,text:`${contenido}${link}\n\n${firma}`,...(html?{html}:{})})});
  if(!r.ok)throw new Error(`RESEND_HTTP_${r.status}`);
  return true;
}
export async function ejecutarAdminTransferenciaEnsayo(request,env,autorizado){
  if(!autorizado)return pagina('<section>Iniciá sesión en Administración.</section>',401);
  const url=new URL(request.url);
  if(url.pathname!==ADMIN)return pagina('<section>Ruta no disponible.</section>',404);
  if(!['GET','POST'].includes(request.method))return pagina('<section>Método inválido.</section>',405);
  if(request.method==='POST'){
    const origin=request.headers.get('origin'),referer=request.headers.get('referer'),sitio=request.headers.get('sec-fetch-site');
    if(sitio&&sitio!=='same-origin')return pagina('<section>Origen inválido.</section>',403);
    if(origin&&origin!=='null'&&origin!==url.origin)return pagina('<section>Origen inválido.</section>',403);
    if((!origin||origin==='null')&&sitio!=='same-origin'){
      let valido=false;try{valido=Boolean(referer&&new URL(referer).origin===url.origin)}catch{}
      if(!valido)return pagina('<section>Origen inválido.</section>',403);
    }
  }
  try{return await bd(env,async db=>{
    const col=db.collection(TABLA),id=url.searchParams.get('id')||'';
    if(request.method==='GET'&&url.searchParams.get('archivo')==='1'){
      if(!ID.test(id))return pagina('<section>ID inválido.</section>',400);
      const doc=await col.findOne({_id:id});
      if(!doc?.comprobante?.r2Key)return pagina('<section>Comprobante inexistente.</section>',404);
      const r=await bucket(env)?.get(doc.comprobante.r2Key);
      if(!r)return pagina('<section>Comprobante no disponible.</section>',404);
      return new Response(r.body,{headers:{'Content-Type':doc.comprobante.tipo,'Content-Disposition':'inline; filename="comprobante-prueba"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none';sandbox"}});
    }
    if(request.method==='GET'&&url.searchParams.get('medio')==='1'){
      const contenido=url.searchParams.get('contenido')||'',pos=Number(url.searchParams.get('pos'));
      const m=await db.collection(MEDIOS).findOne({pedidoId:id,contenidoId:contenido,posicion:pos});
      if(!ID.test(id)||!m)return pagina('<section>Archivo no encontrado.</section>',404);
      const obj=await env?.SERVICIOS_CONTENIDOS_R2?.get(m.r2Key);
      if(!obj)return pagina('<section>Archivo no disponible.</section>',404);
      return new Response(obj.body,{headers:{'Content-Type':m.tipo,'Content-Disposition':'inline','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none';sandbox"}});
    }
    if(request.method==='POST'){
      if(Number(request.headers.get('content-length')||0)>4096)return pagina('<section>Solicitud inválida.</section>',413);
      const datos=new URLSearchParams(await request.text());const pid=datos.get('id')||'';
      if(!validoCsrf(env,pid,datos.get('vence')||'',datos.get('csrf')||''))return pagina('<section>Confirmación vencida. Recargá.</section>',403);
      const doc=await col.findOne({_id:pid});
      if(!doc||!correoPermitido(env,doc.email)||!doc.comprobante)return pagina('<section>Pedido no válido.</section>',409);
      const tipo=datos.get('accion');
      if(!['aprobar','recordatorio','enlace','programar_contenidos'].includes(tipo))return pagina('<section>Acción inválida.</section>',400);
      if(tipo==='programar_contenidos'){
        if(doc.estado!=='aprobado_prueba'||doc.configuracionEstado!=='en_revision')return pagina('<section>No hay contenidos pendientes de revisar.</section>',409);
        const adjuntos=await archivosCompletos(db,doc);
        if(!adjuntos.ok)return pagina('<section>Faltan archivos para esta semana.</section>',409);
        const simulacion=calcularCalendarioSimulado({
          zonaHoraria:doc.configuracion.zonaHoraria,redes:doc.redes,publicaciones:doc.configuracion.publicaciones});
        const n=doc.redes.length*4;
        if(simulacion.eventos.length!==n||simulacion.advertencias.length)return pagina(`<section>Revisá el calendario: ${escape(simulacion.advertencias.join(' · '))}</section>`,409);
        const actualizado=await col.updateOne({_id:pid,configuracionEstado:'en_revision'},{$set:{configuracionEstado:'programada_prueba',programacionSimulada:{eventos:simulacion.eventos,zonaHoraria:simulacion.zonaHoraria,calculadaEn:new Date()},actualizadoEn:new Date()}});
        return actualizado.modifiedCount?Response.redirect(`${url.origin}${ADMIN}?mensaje=Semana+2+simulada+sin+publicaciones`,303):pagina('<section>La semana cambió de estado.</section>',409);
      }
      if(tipo==='aprobar'){
        // Reservar un envío una sola vez. Si falla Resend, puede reintentarse
        // desde Administración sin repetir una aprobación ni tocar pedidos reales.
        if(doc.estado==='en_revision')await col.updateOne({_id:pid,estado:'en_revision'},{$set:{estado:'aprobado_prueba',aprobadoEn:new Date()}});
        else if(doc.estado!=='aprobado_prueba')return pagina('<section>No se puede aprobar.</section>',409);
      }else if(doc.estado!=='aprobado_prueba')return pagina('<section>Aprobá primero la prueba.</section>',409);
      const campo=tipo==='aprobar'?'emailEnviadoEn':tipo==='recordatorio'?'recordatorioEnviadoEn':'enlaceEnviadoEn';
      // Registrar estado de intento antes de llamar a Resend. Si hay incertidumbre,
      // evitar duplicados hasta revisión manual.
      const claim=await col.updateOne({_id:pid,[campo]:{$exists:false}},{$set:{[campo]:new Date(),[campo+'Estado']:'pendiente_confirmacion'}});
      if(!claim.modifiedCount)return pagina('<section>Envío ya reclamado.</section>',409);
      try{await mandarCorreo(env,doc.email,tipo);await col.updateOne({_id:pid},{$set:{[campo+'Estado']:'aceptado_por_resend'}});}
      catch(e){console.warn('Correo de ensayo:',e?.message||'ERROR');await col.updateOne({_id:pid},{$set:{[campo+'Estado']:'resultado_incierto'}});return pagina(`<section><h2>Correo sin confirmar</h2><p>Estado incierto. No reenvíes sin comprobar Resend.</p><a href="${ADMIN}">Volver</a></section>`,503);}
      return Response.redirect(`${url.origin}${ADMIN}?mensaje=Correo+de+prueba+enviado`,303);
    }
    const docs=await col.find({}).sort({creadoEn:-1}).limit(25).toArray();
    const contenido=docs.map(doc=>{
      const {vence,token}=generarCsrf(env,doc._id);
      const info=`<div class="grid"><div class="card"><span class="label">Pedido de ensayo</span>${escape(doc._id)}</div><div class="card"><span class="label">Redes</span>${escape((doc.redes||[]).join(' · '))}</div><div class="card"><span class="label">Estado</span>${escape(doc.estado)}</div><div class="card"><span class="label">Importe</span>$0 de prueba</div></div>`;
      const form=accion=>`<form method="post" action="${ADMIN}"><input type="hidden" name="id" value="${escape(doc._id)}"><input type="hidden" name="vence" value="${vence}"><input type="hidden" name="csrf" value="${token}"><input type="hidden" name="accion" value="${accion}"><button type="submit">${accion==='aprobar'?'Aprobar prueba y enviar correo':accion==='enlace'?'Enviar enlace Programar nueva semana':accion==='programar_contenidos'?'Aprobar contenidos y simular programación':'Enviar recordatorio de prueba'}</button></form>`;
      const ficheros=doc.configuracion?doc.configuracion.publicaciones.map((p,i)=>`<div class="card"><strong>Contenido ${i+1} · ${escape(p.tipo)}</strong><p>${escape(p.diaPreferido)} · ${escape(p.horaLocalPreferida)}</p><p>${escape(p.descripcion||'Sin texto')}</p>${p.archivosSeleccionados.map((a,pos)=>`<p><a target="_blank" rel="noopener noreferrer" href="${ADMIN}?medio=1&id=${encodeURIComponent(doc._id)}&contenido=${encodeURIComponent(p.id)}&pos=${pos}">${escape(a.nombre)}</a></p>`).join('')}</div>`).join(''):'';
      const estadoConfig=doc.configuracionEstado||'sin_configurar';
      const configuracion=`<div class="card"><strong>Semana 2 · ${escape(estadoConfig.replaceAll('_',' '))}</strong>${ficheros?`<div class="grid">${ficheros}</div>`:''}${estadoConfig==='en_revision'?`<p>Revisá los cuatro contenidos y sus archivos. Esta acción solo simula la programación; no publica.</p>${form('programar_contenidos')}`:''}${estadoConfig==='programada_prueba'?'<p>Programación de ensayo registrada, sin publicaciones reales.</p>':''}</div>`;
      return `<section><h2>${escape(doc.email)}</h2>${info}<p>${doc.comprobante?`<a target="_blank" rel="noopener noreferrer" href="${ADMIN}?archivo=1&id=${encodeURIComponent(doc._id)}">Ver comprobante ficticio</a>`:'Comprobante pendiente'}</p>${doc.estado==='en_revision'?form('aprobar'):''}${doc.estado==='aprobado_prueba'&&!doc.recordatorioEnviadoEn?form('recordatorio'):''}${doc.estado==='aprobado_prueba'&&!doc.enlaceEnviadoEn?form('enlace'):''}${configuracion}<small>Confirmación: ${escape(doc.emailEnviadoEnEstado||'no enviada')} · Recordatorio: ${escape(doc.recordatorioEnviadoEnEstado||'no enviado')}</small></section>`;
    }).join('');
    return pagina(`${url.searchParams.get('mensaje')?`<section>${escape(url.searchParams.get('mensaje'))}</section>`:''}${contenido||'<section>No hay pedidos de prueba todavía.</section>'}`);
  });}catch(e){console.warn('Admin transferencia ensayo:',e?.name||'ERROR');return pagina('<section>No se pudo procesar esta prueba.</section>',503);}
}
