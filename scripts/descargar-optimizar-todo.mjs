import fs from "fs";
import path from "path";
import sharp from "sharp";

const ARCHIVO = "src/generador/productos/aventurasLaberintos.js";
const SALIDA = "imagenes-optimizadas/todas";

fs.mkdirSync(SALIDA, { recursive: true });

const contenido = fs.readFileSync(ARCHIVO, "utf8");

// Extraer todas las URLs de imágenes del archivo
const urls = [...contenido.matchAll(/https:\/\/[^"'\n]+/g)]
  .map((m) => m[0].trim())
  .filter(
    (url) =>
      /\.(png|jpg|jpeg|webp)(\?.*)?$/i.test(url) ||
      url.includes("postimg.cc") ||
      url.includes("vercel-storage.com") ||
      url.includes("blob.vercel-storage.com")
  );

const urlsUnicas = [...new Set(urls)];

console.log(`Encontradas ${urlsUnicas.length} URLs únicas\n`);

let correctas = 0;
let errores = 0;
let totalOriginal = 0;
let totalOptimizado = 0;

const mapa = {};

for (let i = 0; i < urlsUnicas.length; i++) {
  const url = urlsUnicas[i];

  console.log(`[${i + 1}/${urlsUnicas.length}] Descargando...`);

  try {
    const respuesta = await fetch(url);

    if (!respuesta.ok) {
      throw new Error(`HTTP ${respuesta.status}`);
    }

    const buffer = Buffer.from(await respuesta.arrayBuffer());

    const metadata = await sharp(buffer).metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("El recurso no es una imagen válida");
    }

    totalOriginal += buffer.length;

    const nombre = `recurso-${String(i + 1).padStart(3, "0")}.webp`;
    const destino = path.join(SALIDA, nombre);

    await sharp(buffer)
      .resize({
        width: 500,
        height: 500,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({
        quality: 85,
        alphaQuality: 100,
      })
      .toFile(destino);

    const pesoOptimizado = fs.statSync(destino).size;

    totalOptimizado += pesoOptimizado;

    mapa[url] = {
      archivo: destino,
      original: {
        ancho: metadata.width,
        alto: metadata.height,
        bytes: buffer.length,
      },
      optimizado: {
        bytes: pesoOptimizado,
      },
    };

    const reduccion =
      ((1 - pesoOptimizado / buffer.length) * 100).toFixed(1);

    console.log(
      `OK: ${metadata.width}x${metadata.height} | ` +
      `${(buffer.length / 1024).toFixed(1)} KB → ` +
      `${(pesoOptimizado / 1024).toFixed(1)} KB | -${reduccion}%\n`
    );

    correctas++;
  } catch (error) {
    console.log(`ERROR: ${url}`);
    console.log(`${error.message}\n`);

    mapa[url] = {
      error: error.message,
    };

    errores++;
  }
}

fs.writeFileSync(
  path.join(SALIDA, "urls-optimizadas.json"),
  JSON.stringify(mapa, null, 2)
);

const reduccionTotal =
  totalOriginal > 0
    ? ((1 - totalOptimizado / totalOriginal) * 100).toFixed(1)
    : 0;

console.log("\n========================================");
console.log(`Correctas: ${correctas}`);
console.log(`Errores: ${errores}`);
console.log(`Total URLs: ${urlsUnicas.length}`);
console.log(
  `Peso original: ${(totalOriginal / 1024 / 1024).toFixed(2)} MB`
);
console.log(
  `Peso optimizado: ${(totalOptimizado / 1024 / 1024).toFixed(2)} MB`
);
console.log(`Reducción total: ${reduccionTotal}%`);
console.log("========================================");

console.log(`\nGuardadas en: ${SALIDA}`);
console.log(
  `Mapa generado en: ${SALIDA}/urls-optimizadas.json`
);