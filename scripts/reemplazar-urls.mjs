import fs from "fs";
import path from "path";

const mapa = JSON.parse(
  fs.readFileSync(
    "imagenes-optimizadas/todas/urls-optimizadas.json",
    "utf8"
  )
);

const archivo =
  "src/generador/productos/aventurasLaberintos.js";

let contenido = fs.readFileSync(archivo, "utf8");

let cambios = 0;

for (const [urlOriginal, datos] of Object.entries(mapa)) {
  if (!datos?.archivo || datos?.error) continue;

  const nombreWebp = path.basename(datos.archivo);
  const urlNueva = `/assets-opt/${nombreWebp}`;

  if (contenido.includes(urlOriginal)) {
    contenido = contenido.replaceAll(urlOriginal, urlNueva);
    cambios++;
  }
}

// Backup antes de modificar
fs.copyFileSync(
  archivo,
  `${archivo}.backup-antes-webp`
);

fs.writeFileSync(archivo, contenido);

console.log(`URLs reemplazadas: ${cambios}`);
console.log(`Backup: ${archivo}.backup-antes-webp`);