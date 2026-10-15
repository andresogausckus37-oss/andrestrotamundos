// Instala los bindings de Story y ajusta su vista previa, sin alterar secretos.
// Ejecutar desde la raiz del proyecto: node activar-story-facebook.mjs
import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const workerFile = 'worker.js';
const configFile = 'wrangler.jsonc';
const adminFile = 'src/paginas/admin/AdminRedes.jsx';

if (!existsSync(workerFile) || !existsSync(configFile)) {
  throw new Error('Ejecutá desde la raíz de Replit (deben existir worker.js y wrangler.jsonc).');
}
const worker = readFileSync(workerFile, 'utf8');
const config = readFileSync(configFile, 'utf8');
const inicio = worker.indexOf('async function ejecutarHandlerContenidoRedes(request, env)');
const fin = worker.indexOf('async function ejecutarHandlerGenerico(', inicio);
if (inicio < 0 || fin < 0) {
  throw new Error('No encontré ejecutarHandlerContenidoRedes en worker.js. Nada fue modificado.');
}
let bloque = worker.slice(inicio, fin);
if (!/\benv\s*:\s*\{\s*IMAGES\s*:/.test(bloque)) {
  const antes = bloque;
  bloque = bloque.replace(
    /headers:\s*headersComoObjeto\(request\)\s*(?=\n\s*\};)/,
    `headers: headersComoObjeto(request),\n    env: {\n      IMAGES: env.IMAGES,\n      PRODUCTOS_R2: env.PRODUCTOS_R2,\n      PRODUCTOS_R2_URL: "https://pub-60d59fb304eb48d384739f40d6f48d4f.r2.dev",\n    },`
  );
  if (antes === bloque) {
    throw new Error('No encontré los headers del handler de contenido. Nada fue modificado.');
  }
}
const workerNuevo = worker.slice(0, inicio) + bloque + worker.slice(fin);
let configNuevo = config;
if (!/"images"\s*:/.test(configNuevo)) {
  configNuevo = configNuevo.replace(
    /(^\s*)"ai"\s*:\s*\{/m,
    `$1"images": { "binding": "IMAGES" },\n\n$1"ai": {`
  );
  if (configNuevo === config) {
    throw new Error('No encontré el bloque "ai" en wrangler.jsonc. Nada fue modificado.');
  }
} else if (!/"images"\s*:\s*\{\s*"binding"\s*:\s*"IMAGES"/.test(configNuevo)) {
  throw new Error('Existe un binding images distinto. Revisalo antes de continuar.');
}

// Verificar sintaxis JS del Worker ANTES de escribir.
execFileSync('node', ['--check', '--input-type=module'], { input: workerNuevo, stdio: ['pipe','pipe','pipe'] });
function escribirSiCambio(ruta, antes, despues) {
  if (antes === despues) { console.log(`Sin cambios: ${ruta}`); return; }
  copyFileSync(ruta, ruta + '.bak');
  writeFileSync(ruta, despues, 'utf8');
  console.log(`Actualizado: ${ruta} (respaldo: .bak)`);
}
escribirSiCambio(workerFile, worker, workerNuevo);
escribirSiCambio(configFile, config, configNuevo);

if (existsSync(adminFile)) {
  const admin = readFileSync(adminFile, 'utf8');
  let corregido = admin.replace(
    'const video = /video|reel|story|estado/.test(String(tipo).toLowerCase());',
    'const video = /video|reel|story|estado/.test(String(tipo).toLowerCase()) && tipo !== "story_pagina";'
  );
  corregido = corregido.replace(
    `  tipo === "post"\n    ? "w-44 aspect-[10/7] rounded-lg border border-slate-200 bg-white object-contain"\n    : "h-32 w-24 rounded-lg border border-slate-200 object-cover"`,
    `  tipo === "story_pagina"\n    ? "w-24 aspect-[9/16] rounded-lg border border-slate-200 bg-slate-100 object-contain"\n    : tipo === "post"\n      ? "w-44 aspect-[10/7] rounded-lg border border-slate-200 bg-white object-contain"\n      : "h-32 w-24 rounded-lg border border-slate-200 object-cover"`
  );
  escribirSiCambio(adminFile, admin, corregido);
  if (!corregido.includes('tipo === "story_pagina"\n    ? "w-24 aspect-[9/16]')) {
    console.log('Aviso: revisá la vista previa horizontal/vertical de AdminRedes.jsx.');
  }
}
console.log('Listo. Desplegá, creá un borrador, guardalo y recargá Admin para ver la Story con CTA.');
