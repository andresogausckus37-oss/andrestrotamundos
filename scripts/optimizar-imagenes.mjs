import sharp from "sharp";
import fs from "fs/promises";
import path from "path";

const ENTRADA = "./imagenes-originales";
const SALIDA = "./imagenes-optimizadas";

const MAX_PX = 500;
const CALIDAD = 85;

async function optimizar() {
  await fs.mkdir(SALIDA, {
    recursive: true,
  });

  const archivos =
    await fs.readdir(ENTRADA);

  const imagenes = archivos.filter(
    (archivo) =>
      /\.(png|jpg|jpeg|webp)$/i.test(
        archivo
      )
  );

  console.log(
    `Encontradas ${imagenes.length} imágenes\n`
  );

  let correctas = 0;
  let errores = 0;

  for (const archivo of imagenes) {
    console.log(
      `Procesando: ${archivo}`
    );

    try {
      const entrada = path.join(
        ENTRADA,
        archivo
      );

      const nombre =
        path.parse(archivo).name;

      const salida = path.join(
        SALIDA,
        `${nombre}.webp`
      );

      const metadata =
        await sharp(
          entrada
        ).metadata();

      await sharp(entrada)
        .resize({
          width: MAX_PX,
          height: MAX_PX,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({
          quality: CALIDAD,
          alphaQuality: 100,
        })
        .toFile(salida);

      const original =
        await fs.stat(entrada);

      const optimizada =
        await fs.stat(salida);

      const reduccion = (
        100 -
        (optimizada.size /
          original.size) *
          100
      ).toFixed(1);

      console.log(
        `OK: ` +
        `${metadata.width}×${metadata.height} → ` +
        `${(
          optimizada.size / 1024
        ).toFixed(1)} KB ` +
        `(-${reduccion}%)\n`
      );

      correctas += 1;
    } catch (error) {
      console.error(
        `ERROR en ${archivo}:`
      );

      console.error(
        error.message
      );

      console.log("");

      errores += 1;
    }
  }

  console.log(
    "=============================="
  );

  console.log(
    `Correctas: ${correctas}`
  );

  console.log(
    `Errores: ${errores}`
  );

  console.log(
    `Total: ${imagenes.length}`
  );

  console.log(
    "=============================="
  );

  if (correctas > 0) {
    console.log(
      "\nImágenes guardadas en:"
    );

    console.log(
      SALIDA
    );
  }
}

optimizar().catch(
  (error) => {
    console.error(
      "Error general:",
      error
    );

    process.exit(1);
  }
);