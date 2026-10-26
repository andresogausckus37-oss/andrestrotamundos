// FASE10: cobros PayPal para semanas pagadas, independientes de la tienda y del cron.
// El pedido de MongoDB se crea ANTES de comunicarse con PayPal y se reutiliza en reintentos.
import crypto from 'node:crypto';
import { obtenerClienteRegistrado } from './clientes-acceso.js';

const BASE='/api/servicios/publicaciones/renovacion-paypal';
const DB='andres_imprimibles';
const TABLA='renovaciones_transferencia_reales'; // Compartida para mantener numeración y revisión.
const VERSION='renovacion-real-v1';
const PEDIDO=/^SER-[a-f0-9-]{36}$/i;
const SEMANA=/^renovacion-real:SER-[a-f0-9-]{36}(?::(?:[3-9]|[1-9][0-9]{1,2}))?$/i;
const ORIGEN='https://andreshousesitter.com';
const PANEL='/servicios/publicacion-automatica/mi-panel';
const json=(obj,estado=200)=>Response.json(obj,{status:estado,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
const mismoOrigen=r=>r.headers.get('origin')===new URL(r.url).origin;
const redesValidas=r=>Array.isArray(r)&&[1,2].includes(r.length)&&r.every(x=>x==='facebook'||x==='instagram')&&new Set(r).size===r.length;
const modo=env=>String(env?.SERVICIO_PAYPAL_ENTORNO||'sandbox').toLowerCase()==='live'?'live':'sandbox';
const permitido=env=>String(env?.SERVICIO_PAYPAL_RENOVACIONES_HABILITADO||'').toLowerCase()==='true'&&
  String(env?.SERVICIO_RENOVACIONES_REALES_HABILITADAS||'').toLowerCase()==='true'&&
  (modo(env)!=='live'||String(env?.SERVICIO_PAYPAL_LIVE_HABILITADO||'').toLowerCase()==='true');
const credenciales=env=>{
  const e=modo(env),s=e==='live'?'LIVE':'SANDBOX';
  return {entorno:e,clientId:String(env?.[`PAYPAL_CLIENT_ID_${s}`]||''),
    secret:String(env?.[`PAYPAL_CLIENT_SECRET_${s}`]||''),webhookId:String(env?.[`PAYPAL_WEBHOOK_ID_${s}`]||''),
    api:e==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com'};
};
const habilitado=env=>{const c=credenciales(env);return permitido(env)&&Boolean(c.clientId&&c.secret&&env?.MONGODB_URI);};
const resumen=doc=>!doc?null:{id:doc._id,pedidoId:doc.pedidoId,numeroSemana:doc.numeroSemana||2,
  redes:doc.redes,moneda:doc.moneda,importe:doc.importe,metodoPago:'paypal',estado:doc.estado,
  estadoSemana:doc.estadoSemana||null,configuracionEstado:doc.configuracionEstado||'sin_configurar',
  pagoConfirmado:doc.pagoConfirmado===true,creadoEn:doc.creadoEn||null};
async function conDB(env,fn){const {MongoClient}=await import('mongodb');const c=new MongoClient(env.MONGODB_URI);
  try{await c.connect();return await fn(c.db(DB));}finally{await c.close().catch(()=>{});}}
async function bodyLimitado(req){if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return null;
  if(Number(req.headers.get('content-length')||0)>2048)return null;
  const s=await req.text();if(s.length>2048)return null;
  try{const o=JSON.parse(s);return o&&typeof o==='object'&&!Array.isArray(o)?o:null;}catch{return null;}}
function solicitudId(doc,accion){const h=crypto.createHash('sha256').update(`${doc._id}:${doc.paypalEntorno}:${accion}:v1`).digest('hex');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;}
let cacheOAuth=null;
async function oauth(c){
  if(cacheOAuth&&cacheOAuth.entorno===c.entorno&&cacheOAuth.id===c.clientId&&cacheOAuth.expira>Date.now()+60_000)
    return cacheOAuth.token;
  const r=await fetch(c.api+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(c.clientId+':'+c.secret).toString('base64'),
    'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
  if(!r.ok)throw Error('PayPal no autorizó las credenciales.');
  const d=await r.json();if(!d.access_token)throw Error('PayPal no devolvió un token.');
  cacheOAuth={id:c.clientId,entorno:c.entorno,token:d.access_token,expira:Date.now()+Math.max(60,Number(d.expires_in)||300)*1000};
  return d.access_token;
}
async function apiPaypal(c,metodo,ruta,body,peticionId){
  const t=await oauth(c);
  const headers={Authorization:'Bearer '+t,'Content-Type':'application/json','Accept':'application/json'};
  if(peticionId)headers['PayPal-Request-Id']=peticionId;
  if(metodo==='POST')headers.Prefer='return=representation';
  const respuesta=await fetch(c.api+ruta,{method:metodo,headers,...(body===undefined?{}:{body:JSON.stringify(body)})});
  const datos=await respuesta.json().catch(()=>({}));return {ok:respuesta.ok,status:respuesta.status,datos};
}
function verificarCobro(orden,doc){
  if(orden?.id!==doc.paypalOrderId||orden?.status!=='COMPLETED'||!Array.isArray(orden.purchase_units)||orden.purchase_units.length!==1)
    return null;
  const pu=orden.purchase_units[0];
  if(pu.custom_id!==doc._id||pu.amount?.currency_code!=='USD'||pu.amount?.value!==Number(doc.importe).toFixed(2))return null;
  const caps=pu.payments?.captures;
  if(!Array.isArray(caps)||caps.length!==1)return null;
  const cap=caps[0];
  if(cap.status!=='COMPLETED'||!cap.id||cap.amount?.currency_code!=='USD'||cap.amount?.value!==Number(doc.importe).toFixed(2))return null;
  return {captureId:cap.id,fecha:cap.update_time||cap.create_time||new Date().toISOString()};
}
async function enviarCorreo(env,doc){
  if(!env?.RESEND_API_KEY||!env?.SERVICIO_CLIENTES_CORREO_DESDE||!doc.email)return false;
  const txt=`Recibimos y confirmamos tu pago por PayPal.\n\nSemana ${doc.numeroSemana}: ${doc.redes.join(' e ')}.\nImporte: USD ${Number(doc.importe).toFixed(2)}.\n\nIngresá al panel para seguir el estado de la activación administrativa: ${ORIGEN}${PANEL}\n\nLa programación se confirma por separado, después de revisar los contenidos.\n\nSaludos,\nEl equipo de Redes en Piloto`;
  const r=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_API_KEY,'Content-Type':'application/json'},
    body:JSON.stringify({from:env.SERVICIO_CLIENTES_CORREO_DESDE,to:[doc.email],subject:'Pago confirmado',text:txt})});
  return r.ok;
}
async function despacharCorreo(db,env,id){
  const t=db.collection(TABLA);
  const doc=await t.findOneAndUpdate({_id:id,metodoPago:'paypal',pagoConfirmado:true,correoAprobacionEstado:{$in:['pendiente','error']}},
    {$set:{correoAprobacionEstado:'enviando',correoAprobacionIntentadoEn:new Date()}} ,{returnDocument:'after'});
  if(!doc)return;
  let exito=false;
  try{exito=await enviarCorreo(env,doc);}catch(e){console.warn('PayPal correo:',String(e?.name||'Error'));}
  await t.updateOne({_id:id,correoAprobacionEstado:'enviando'},{$set:{correoAprobacionEstado:exito?'enviado':'error',correoAprobacionEn:exito?new Date():null}});
}
async function acreditar(db,env,doc,orden){
  const cap=verificarCobro(orden,doc);
  if(!cap)return {ok:false,error:'PayPal todavía no confirmó un cobro completo y válido.',status:409};
  const t=db.collection(TABLA),ahora=new Date();
  const r=await t.updateOne({_id:doc._id,metodoPago:'paypal',paypalOrderId:doc.paypalOrderId,pagoConfirmado:false,
    estado:'pendiente_paypal',moneda:'USD',importe:doc.importe},
    {$set:{estado:'aprobado',pagoConfirmado:true,paypalCaptureId:cap.captureId,paypalEstado:'COMPLETED',
      aprobadoEn:ahora,pagadoEn:ahora,actualizadoEn:ahora,correoAprobacionEstado:'pendiente'}});
  const actualizado=r.modifiedCount?{...doc,estado:'aprobado',pagoConfirmado:true,paypalCaptureId:cap.captureId}:
    await t.findOne({_id:doc._id,metodoPago:'paypal',pagoConfirmado:true,paypalCaptureId:cap.captureId});
  if(!actualizado)return {ok:false,error:'El cobro se confirmó, pero no se pudo actualizar la semana. Contactá a soporte; no vuelvas a pagar.',status:503};
  await despacharCorreo(db,env,doc._id);
  return {ok:true,pedido:resumen(actualizado),pagado:true};
}
function enlaceAprobacion(orden){
  const link=orden?.links?.find(l=>l.rel==='payer-action')||orden?.links?.find(l=>l.rel==='approve');
  if(!link?.href)return null;
  try{const u=new URL(link.href);if(u.protocol!=='https:'||!(u.hostname==='paypal.com'||u.hostname.endsWith('.paypal.com')))return null;
    return u.href;}catch{return null;}
}
async function crearOrden(db,env,doc){
  const c=credenciales(env);
  if(doc.paypalEntorno!==c.entorno)return {ok:false,error:'El pedido fue creado en otro entorno de PayPal.',status:409};
  if(doc.pagoConfirmado)return {ok:true,pedido:resumen(doc),pagado:true};
  if(doc.paypalOrderId&&doc.paypalUrl)return {ok:true,pedido:resumen(doc),url:doc.paypalUrl};
  const urlRetorno=new URL(ORIGEN+PANEL);
  urlRetorno.searchParams.set('paypal','retorno');urlRetorno.searchParams.set('pedidoId',doc.pedidoId);
  urlRetorno.searchParams.set('semanaId',doc._id);
  const urlCancelacion=new URL(urlRetorno);urlCancelacion.searchParams.set('paypal','cancelado');
  const monto=Number(doc.importe).toFixed(2);
  const cuerpo={intent:'CAPTURE',purchase_units:[{reference_id:'semana-'+doc.numeroSemana,custom_id:doc._id,
    description:`Redes en Piloto - Semana ${doc.numeroSemana}`,amount:{currency_code:'USD',value:monto}}],
    payment_source:{paypal:{experience_context:{user_action:'PAY_NOW',shipping_preference:'NO_SHIPPING',
      return_url:urlRetorno.toString(),cancel_url:urlCancelacion.toString()}}}};
  const r=await apiPaypal(c,'POST','/v2/checkout/orders',cuerpo,solicitudId(doc,'crear'));
  if(!r.ok||!r.datos?.id||!enlaceAprobacion(r.datos))return {ok:false,error:'PayPal no pudo preparar el pago. Reintentá sobre la misma semana.',status:502};
  const url=enlaceAprobacion(r.datos);
  const t=db.collection(TABLA);
  const saved=await t.updateOne({_id:doc._id,metodoPago:'paypal',pagoConfirmado:false,paypalEntorno:c.entorno,
    paypalOrderId:{$in:[null,'']}},{$set:{paypalOrderId:r.datos.id,paypalUrl:url,actualizadoEn:new Date()}});
  const final=await t.findOne({_id:doc._id,clienteUsuarioId:doc.clienteUsuarioId});
  if(!final||final.paypalOrderId!==r.datos.id)return {ok:false,error:'La semana cambió de estado. No se inició un nuevo cobro.',status:409};
  return {ok:true,pedido:resumen(final),url,recuperada:saved.modifiedCount===0};
}
async function ejecutarWebhook(request,env){
  if(request.method!=='POST')return json({ok:false},405);
  if(!habilitado(env))return json({ok:false},503);
  const c=credenciales(env);
  if(!c.webhookId)return json({ok:false,error:'Webhook no configurado.'},503);
  if(Number(request.headers.get('content-length')||0)>64*1024)return json({ok:false},413);
  const raw=await request.text();if(raw.length>64*1024)return json({ok:false},413);
  let evento;try{evento=JSON.parse(raw);}catch{return json({ok:false},400);}
  const h=request.headers;
  const verificando={transmission_id:h.get('paypal-transmission-id'),transmission_time:h.get('paypal-transmission-time'),
    cert_url:h.get('paypal-cert-url'),auth_algo:h.get('paypal-auth-algo'),transmission_sig:h.get('paypal-transmission-sig'),
    webhook_id:c.webhookId,webhook_event:evento};
  if(Object.values(verificando).some(v=>v==null))return json({ok:false},400);
  const check=await apiPaypal(c,'POST','/v1/notifications/verify-webhook-signature',verificando);
  if(!check.ok||check.datos?.verification_status!=='SUCCESS')return json({ok:false,error:'Firma de PayPal inválida.'},403);
  if(evento.event_type!=='PAYMENT.CAPTURE.COMPLETED')return json({ok:true,ignorado:true});
  const orderId=evento.resource?.supplementary_data?.related_ids?.order_id;
  if(typeof orderId!=='string'||orderId.length>128)return json({ok:true,ignorado:true});
  return conDB(env,async db=>{
    const doc=await db.collection(TABLA).findOne({paypalOrderId:orderId,metodoPago:'paypal',paypalEntorno:c.entorno});
    if(!doc)return json({ok:true,ignorado:true});
    if(doc.pagoConfirmado){await despacharCorreo(db,env,doc._id);return json({ok:true,yaConfirmado:true});}
    const {ok,datos}=await apiPaypal(c,'GET','/v2/checkout/orders/'+encodeURIComponent(orderId));
    if(!ok)return json({ok:false,error:'PayPal no pudo verificarse.'},503);
    const r=await acreditar(db,env,doc,datos);
    return json(r,r.ok?200:r.status||503);
  });
}
export async function ejecutarRenovacionPaypal(request,env){
  const pathname=new URL(request.url).pathname;
  if(pathname===BASE+'/webhook'){
    try{return await ejecutarWebhook(request,env);}catch(e){console.warn('Webhook PayPal:',String(e?.name||'Error'));return json({ok:false,error:'Webhook temporalmente no disponible.'},503);}
  }
  if(![BASE,BASE+'/crear',BASE+'/capturar'].includes(pathname))return json({ok:false},404);
  if(request.method!==(pathname===BASE?'GET':'POST'))return json({ok:false},405);
  if(request.method==='POST'&&!mismoOrigen(request))return json({ok:false,error:'Origen no autorizado.'},403);
  if(!env?.MONGODB_URI)return json({ok:false,error:'Base de datos no disponible.'},503);
  const disponible=habilitado(env),c=credenciales(env);
  const datos=pathname===BASE?null:await bodyLimitado(request);
  const pedidoId=pathname===BASE?new URL(request.url).searchParams.get('pedidoId'):datos?.pedidoId;
  if(!PEDIDO.test(pedidoId||''))return json({ok:false,error:'Pedido inválido.'},400);
  try{return await conDB(env,async db=>{
    const usuario=await obtenerClienteRegistrado(request,env,db);
    if(!usuario)return json({ok:false,error:'Iniciá sesión nuevamente.'},401);
    const padre=await db.collection('pedidos_servicios').findOne({pedidoId,tipo:'publicaciones',
      modalidadContratacion:'prueba_gratuita',clienteUsuarioId:usuario.id},{projection:{pedidoId:1,redes:1}});
    if(!padre)return json({ok:false,error:'No se encontró el pedido de tu cuenta.'},404);
    const tabla=db.collection(TABLA);
    const ultimos=await tabla.find({pedidoId,clienteUsuarioId:usuario.id,version:VERSION})
      .sort({numeroSemana:-1,creadoEn:-1}).limit(1).toArray();
    const ultimo=ultimos[0]||null;
    if(pathname===BASE){
      return json({ok:true,habilitada:disponible,entorno:c.entorno,
        pedido:ultimo?.metodoPago==='paypal'?resumen(ultimo):null,
        bloqueada:ultimo&&ultimo.metodoPago!=='paypal'&&ultimo.configuracionEstado!=='programada'&&ultimo.estadoSemana!=='finalizada'
          ?'Tenés una renovación bancaria sin finalizar. Completala antes de elegir PayPal.':'',
        motivo:disponible?'':'PayPal todavía no está habilitado.'});
    }
    if(!disponible)return json({ok:false,error:'PayPal no está habilitado o faltan credenciales en Cloudflare.'},503);
    if(pathname===BASE+'/crear'){
      if(!redesValidas(datos?.redes))return json({ok:false,error:'Elegí una o ambas redes.'},400);
      const redes=[...datos.redes].sort();
      if(redes.some(red=>!padre.redes?.includes(red)))return json({ok:false,error:'La red elegida no pertenece a tu pedido original.'},409);
      let doc=ultimo;
      if(doc&&doc.configuracionEstado!=='programada'&&doc.estadoSemana!=='finalizada'){
        if(doc.metodoPago!=='paypal')return json({ok:false,error:'Tenés una transferencia pendiente. Terminá esa semana primero.'},409);
        if(JSON.stringify(doc.redes)!==JSON.stringify(redes))return json({ok:false,error:'Tenés una semana PayPal pendiente con otras redes. Completala primero.'},409);
      }else{
        const numeroSemana=doc?Math.max(3,(doc.numeroSemana||2)+1):2;
        if(numeroSemana>999)return json({ok:false,error:'No es posible crear más semanas automáticamente.'},409);
        const id=numeroSemana===2?`renovacion-real:${pedidoId}`:`renovacion-real:${pedidoId}:${numeroSemana}`;
        const fecha=new Date();
        const registro={_id:id,numeroSemana,version:VERSION,pedidoId,clienteUsuarioId:usuario.id,
          email:usuario.email,redes,importe:redes.length===2?15:10,moneda:'USD',metodoPago:'paypal',paypalEntorno:c.entorno,
          paypalOrderId:null,paypalUrl:null,paypalCaptureId:null,paypalEstado:'CREATED',estado:'pendiente_paypal',
          pagoConfirmado:false,comprobante:null,creadoEn:fecha,actualizadoEn:fecha};
        try{await tabla.insertOne(registro);doc=registro;}
        catch(e){if(e?.code!==11000)throw e;doc=await tabla.findOne({_id:id,clienteUsuarioId:usuario.id,metodoPago:'paypal'});
          if(!doc||JSON.stringify(doc.redes)!==JSON.stringify(redes))return json({ok:false,error:'Ya existe otra renovación para esta semana.'},409);}
      }
      const r=await crearOrden(db,env,doc);return json(r,r.ok?200:r.status||503);
    }
    const id=datos?.semanaId;
    if(!SEMANA.test(id||''))return json({ok:false,error:'Semana inválida.'},400);
    const doc=await tabla.findOne({_id:id,pedidoId,clienteUsuarioId:usuario.id,metodoPago:'paypal'});
    if(!doc)return json({ok:false,error:'La semana no pertenece a tu cuenta.'},404);
    if(doc.paypalEntorno!==c.entorno)return json({ok:false,error:'El entorno PayPal de esta semana es diferente.'},409);
    if(doc.pagoConfirmado){await despacharCorreo(db,env,id);return json({ok:true,pagado:true,pedido:resumen(doc)});}
    if(!doc.paypalOrderId)return json({ok:false,error:'Primero iniciá el pago PayPal.'},409);
    // Nunca confiar en el parámetro token de retorno: se lee la orden almacenada en MongoDB.
    const consulta=await apiPaypal(c,'GET','/v2/checkout/orders/'+encodeURIComponent(doc.paypalOrderId));
    if(!consulta.ok)return json({ok:false,error:'No se pudo consultar PayPal. No vuelvas a pagar todavía.'},503);
    let orden=consulta.datos;
    if(orden.status==='APPROVED'){
      const intento=await apiPaypal(c,'POST','/v2/checkout/orders/'+encodeURIComponent(doc.paypalOrderId)+'/capture',{},solicitudId(doc,'capturar'));
      if(intento.ok)orden=intento.datos;
      else{
        const revisado=await apiPaypal(c,'GET','/v2/checkout/orders/'+encodeURIComponent(doc.paypalOrderId));
        if(!revisado.ok)return json({ok:false,error:'El estado del cobro es incierto. Usá Verificar pago en unos minutos; no vuelvas a pagar.'},503);
        orden=revisado.datos;
      }
    }
    if(orden.status!=='COMPLETED')return json({ok:false,error:'PayPal todavía no confirma el cobro. Si ya pagaste, verificá el estado más tarde.',estadoPaypal:orden.status||'desconocido'},409);
    const r=await acreditar(db,env,doc,orden);return json(r,r.ok?200:r.status||503);
  });}catch(e){console.warn('Renovación PayPal:',String(e?.name||'Error'),String(e?.code||''));
    return json({ok:false,error:'No se pudo completar la consulta. Revisá el pedido antes de iniciar otro pago.'},503);}
}
