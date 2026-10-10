import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";

const ANCHO_FEED = 1080;
const ANCHO_VERTICAL = 1080;
const ANCHO_FACEBOOK = 900;
const CALIDAD_WEBP = 0.82;

const NOMBRES_IMAGENES = [
  "Imagen 1 — Presentación",
  "Imagen 2 — Detalle",
  "Imagen 3 — Características",
  "Imagen 4 — Uso / producto",
];

const NOMBRES_IMAGENES_VERTICAL = [
  "Vertical 1 — Presentación",
  "Vertical 2 — Detalle",
  "Vertical 3 — Características",
  "Vertical 4 — Uso / producto",
];

const FORMULARIO_INICIAL = {
  nombre: "",
  precioARS: "",
  ofertaActiva: false,
  precioOfertaARS: "",
  etiquetaOferta: "Oferta lanzamiento",
  duracionOfertaDias: "3",
  ventaCruzadaId: "",
  destacado: false,
  categoria: "",
  stock: "",
  disponibilidad: "disponible",
  descripcion: "",
  descripcionLarga: "",
  marca: "",
  modelo: "",
  colores: "",
  variantes: "",
  material: "",
  dimensiones: "",
  peso: "",
  caracteristicas: "",
  contenidoPaquete: "",
};

const convertirLista = (texto) =>
  String(texto || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

const listaATexto = (valor) =>
  Array.isArray(valor) ? valor.filter(Boolean).join("\n") : "";

const valorCampo = (valor) =>
  valor === null || valor === undefined ? "" : String(valor);

const archivoADataUrl = (archivo) =>
  new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(new Error("No se pudo leer el archivo."));
    lector.readAsDataURL(archivo);
  });

const cargarImagen = (archivo) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo);
    const imagen = new Image();

    imagen.onload = () => {
      URL.revokeObjectURL(url);
      resolve(imagen);
    };

    imagen.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("No se pudo procesar la imagen."));
    };

    imagen.src = url;
  });

const procesarImagen = async (archivo, anchoObjetivo) => {
  if (!archivo?.type?.startsWith("image/")) {
    throw new Error("Seleccioná un archivo de imagen válido.");
  }

  const imagen = await cargarImagen(archivo);
  const escala = Math.min(1, anchoObjetivo / imagen.naturalWidth);
  const ancho = Math.max(1, Math.round(imagen.naturalWidth * escala));
  const alto = Math.max(1, Math.round(imagen.naturalHeight * escala));

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;

  const contexto = canvas.getContext("2d");

  if (!contexto) {
    throw new Error("No se pudo preparar la imagen.");
  }

  contexto.imageSmoothingEnabled = true;
  contexto.imageSmoothingQuality = "high";
  contexto.drawImage(imagen, 0, 0, ancho, alto);

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, "image/webp", CALIDAD_WEBP)
  );

  if (!blob) {
    throw new Error("No se pudo optimizar la imagen.");
  }

  const archivoOptimizado = new File(
    [blob],
    `${archivo.name.replace(/\.[^.]+$/, "")}.webp`,
    { type: "image/webp" }
  );

  return {
    archivoOriginal: archivo,
    archivoOptimizado,
    urlOptimizada: URL.createObjectURL(archivoOptimizado),
    esNueva: true,
  };
};

const prepararImagenExistente = (url) =>
  url
    ? {
        urlActual: url,
        urlOptimizada: url,
        archivoOriginal: null,
        archivoOptimizado: null,
        esNueva: false,
      }
    : null;

export default function AdminEditarProducto() {
  const { id: productoId } = useParams();
  const navigate = useNavigate();

  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [productoOriginal, setProductoOriginal] = useState(null);
  const [productosDisponibles, setProductosDisponibles] = useState([]);

  const [imagenes, setImagenes] = useState(Array(4).fill(null));
  const [imagenesVertical, setImagenesVertical] = useState(Array(4).fill(null));
  const [imagenFacebook, setImagenFacebook] = useState(null);

  const [videoReelActual, setVideoReelActual] = useState(null);
  const [videoReel, setVideoReel] = useState(null);
  const [eliminarReelActual, setEliminarReelActual] = useState(false);

  const [cargando, setCargando] = useState(true);
  const [cargandoProductos, setCargandoProductos] = useState(true);
  const [procesandoImagen, setProcesandoImagen] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [errorProductos, setErrorProductos] = useState("");

  const cambiar = (campo, valor) =>
    setFormulario((actual) => ({ ...actual, [campo]: valor }));

  const cargarProductos = async () => {
    try {
      setCargandoProductos(true);
      setErrorProductos("");

      const respuesta = await fetch(
        "/api/admin/pedidos?accion=listar-productos"
      );

      if (respuesta.status === 401) {
        navigate("/admin/login");
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudieron cargar los productos.");
      }

      setProductosDisponibles(
        Array.isArray(datos.productos) ? datos.productos : []
      );
    } catch (errorCarga) {
      console.error(errorCarga);
      setErrorProductos(errorCarga.message);
      setProductosDisponibles([]);
    } finally {
      setCargandoProductos(false);
    }
  };

  const cargarProducto = async () => {
    if (!productoId) {
      setError("Falta el ID del producto.");
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError("");

      const respuesta = await fetch(
        `/api/admin/pedidos?accion=obtener-producto&productoId=${encodeURIComponent(
          productoId
        )}`
      );

      if (respuesta.status === 401) {
        navigate("/admin/login");
        return;
      }

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo cargar el producto.");
      }

      const producto = datos.producto;

      if (!producto) {
        throw new Error("Producto no encontrado.");
      }

      setProductoOriginal(producto);

      setFormulario({
        nombre: producto.nombre || "",
        precioARS: valorCampo(producto.precioARS),
        ofertaActiva: Boolean(producto.oferta?.activa),
        precioOfertaARS: valorCampo(producto.oferta?.precioARS),
        etiquetaOferta: producto.oferta?.etiqueta || "Oferta lanzamiento",
        duracionOfertaDias: valorCampo(
          producto.oferta?.duracionDias ??
            producto.ofertaLanzamiento?.duracionDias ??
            3
        ),
        ventaCruzadaId: producto.ventaCruzadaId || "",
        destacado: Boolean(producto.destacado),
        categoria: producto.categoria || "",
        stock: valorCampo(producto.stock),
        disponibilidad: producto.disponibilidad || "disponible",
        descripcion: producto.descripcion || "",
        descripcionLarga: producto.descripcionLarga || "",
        marca: producto.detalles?.marca || "",
        modelo: producto.detalles?.modelo || "",
        colores: listaATexto(producto.detalles?.colores),
        variantes: listaATexto(producto.detalles?.variantes),
        material: producto.detalles?.material || "",
        dimensiones: producto.detalles?.dimensiones || "",
        peso: producto.detalles?.peso || "",
        caracteristicas: listaATexto(producto.detalles?.caracteristicas),
        contenidoPaquete: listaATexto(producto.detalles?.contenidoPaquete),
      });

      const feed = producto.imagenes?.redes?.feed || {};

      setImagenes([
        prepararImagenExistente(
          feed.presentacion || producto.imagenes?.portada || ""
        ),
        prepararImagenExistente(
          feed.incluye || producto.imagenes?.preview || ""
        ),
        prepararImagenExistente(
          feed.beneficios ||
            producto.imagenes?.previewsIndividuales?.[0] ||
            ""
        ),
        prepararImagenExistente(
          feed.comoFunciona ||
            producto.imagenes?.previewsIndividuales?.[1] ||
            ""
        ),
      ]);

      const vertical = producto.imagenes?.redes?.vertical || {};

      setImagenesVertical([
        prepararImagenExistente(vertical.presentacion || ""),
        prepararImagenExistente(vertical.incluye || ""),
        prepararImagenExistente(vertical.beneficios || ""),
        prepararImagenExistente(vertical.comoFunciona || ""),
      ]);

      setImagenFacebook(
        prepararImagenExistente(producto.imagenes?.portadaFacebook || "")
      );

      setVideoReelActual(producto.videoReel || null);
      setVideoReel(null);
      setEliminarReelActual(false);
    } catch (errorCarga) {
      console.error(errorCarga);
      setError(errorCarga.message || "No se pudo cargar el producto.");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarProducto();
    cargarProductos();
  }, [productoId]);

  const seleccionarImagen = async (indice, archivo, tipo = "feed") => {
    if (!archivo) return;

    try {
      setProcesandoImagen(true);

      const ancho =
        tipo === "facebook"
          ? ANCHO_FACEBOOK
          : tipo === "vertical"
            ? ANCHO_VERTICAL
            : ANCHO_FEED;

      const resultado = await procesarImagen(archivo, ancho);

      if (tipo === "facebook") {
        setImagenFacebook((actual) => {
          if (actual?.esNueva && actual?.urlOptimizada?.startsWith("blob:")) {
            URL.revokeObjectURL(actual.urlOptimizada);
          }
          return resultado;
        });
        return;
      }

      const setter = tipo === "vertical" ? setImagenesVertical : setImagenes;

      setter((actuales) => {
        const nuevas = [...actuales];
        const anterior = nuevas[indice];

        if (
          anterior?.esNueva &&
          anterior?.urlOptimizada?.startsWith("blob:")
        ) {
          URL.revokeObjectURL(anterior.urlOptimizada);
        }

        nuevas[indice] = resultado;
        return nuevas;
      });
    } catch (errorImagen) {
      console.error(errorImagen);
      alert(errorImagen.message || "No se pudo procesar la imagen.");
    } finally {
      setProcesandoImagen(false);
    }
  };

  const eliminarImagen = (indice, tipo = "feed") => {
    if (tipo === "facebook") {
      setImagenFacebook((actual) => {
        if (actual?.esNueva && actual?.urlOptimizada?.startsWith("blob:")) {
          URL.revokeObjectURL(actual.urlOptimizada);
        }
        return null;
      });
      return;
    }

    const setter = tipo === "vertical" ? setImagenesVertical : setImagenes;

    setter((actuales) => {
      const nuevas = [...actuales];
      const anterior = nuevas[indice];

      if (
        anterior?.esNueva &&
        anterior?.urlOptimizada?.startsWith("blob:")
      ) {
        URL.revokeObjectURL(anterior.urlOptimizada);
      }

      nuevas[indice] = null;
      return nuevas;
    });
  };

  const subirImagen = async (imagen, numero) => {
    if (!imagen) return "";
    if (!imagen.esNueva) return imagen.urlActual || imagen.urlOptimizada || "";

    const imagenBase64 = await archivoADataUrl(imagen.archivoOptimizado);

    const respuesta = await fetch(
      "/api/admin/pedidos?accion=subir-imagen-producto",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productoId,
          numeroImagen: numero,
          imagenBase64,
        }),
      }
    );

    const datos = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(
        datos.error || `No se pudo subir la imagen ${numero}.`
      );
    }

    return datos.url || "";
  };

  const subirReel = async () => {
    if (!videoReel) {
      return eliminarReelActual ? null : videoReelActual;
    }

    const datosFormulario = new FormData();
    datosFormulario.append("productoId", productoId);
    datosFormulario.append("video", videoReel);

    const respuesta = await fetch(
      "/api/admin/pedidos?accion=subir-video-reel",
      {
        method: "POST",
        body: datosFormulario,
      }
    );

    const texto = await respuesta.text();
    let datos = {};

    if (texto) {
      try {
        datos = JSON.parse(texto);
      } catch {
        throw new Error(
          "El servidor devolvió una respuesta inválida al subir el Reel."
        );
      }
    }

    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo subir el Reel.");
    }

    return datos.url || null;
  };

  const productoFinal = useMemo(
    () => ({
      nombre: formulario.nombre.trim(),
      ventaCruzadaId: formulario.ventaCruzadaId,
      destacado: formulario.destacado,

      categoria: formulario.categoria,
      stock:
        formulario.stock === ""
          ? null
          : Math.max(0, Number(formulario.stock) || 0),
      disponibilidad: formulario.disponibilidad,

      descripcion: formulario.descripcion.trim(),
      descripcionLarga: formulario.descripcionLarga.trim(),

      tipo: "fisico",

      precioARS: Number(formulario.precioARS) || 0,
      descuento: 0,

      oferta: {
        activa: formulario.ofertaActiva,
        precioARS: formulario.ofertaActiva
          ? Number(formulario.precioOfertaARS) || 0
          : 0,
        etiqueta: formulario.ofertaActiva
          ? formulario.etiquetaOferta.trim()
          : "",
        duracionDias: formulario.ofertaActiva
          ? Number(formulario.duracionOfertaDias) || 3
          : 0,
      },

      ofertaLanzamiento: {
        activa: formulario.ofertaActiva,
        duracionDias: Number(formulario.duracionOfertaDias) || 3,
      },

      detalles: {
        marca: formulario.marca.trim(),
        modelo: formulario.modelo.trim(),
        colores: convertirLista(formulario.colores),
        variantes: convertirLista(formulario.variantes),
        material: formulario.material.trim(),
        dimensiones: formulario.dimensiones.trim(),
        peso: formulario.peso.trim(),
        caracteristicas: convertirLista(formulario.caracteristicas),
        contenidoPaquete: convertirLista(formulario.contenidoPaquete),
      },
    }),
    [formulario]
  );

  const guardarCambios = async () => {
    if (!formulario.nombre.trim()) {
      alert("Falta el nombre del producto.");
      return;
    }

    if (!formulario.precioARS || Number(formulario.precioARS) <= 0) {
      alert("Falta indicar un precio válido en ARS.");
      return;
    }

    if (!formulario.categoria) {
      alert("Falta seleccionar la categoría del producto.");
      return;
    }

    try {
      setGuardando(true);

      const urlsFeed = Array(4).fill("");
      const urlsVertical = Array(4).fill("");

      for (let i = 0; i < imagenes.length; i += 1) {
        urlsFeed[i] = imagenes[i]
          ? await subirImagen(imagenes[i], i + 1)
          : "";
      }

      for (let i = 0; i < imagenesVertical.length; i += 1) {
        urlsVertical[i] = imagenesVertical[i]
          ? await subirImagen(imagenesVertical[i], i + 5)
          : "";
      }

      const urlFacebook = imagenFacebook
        ? await subirImagen(imagenFacebook, 9)
        : "";

      const urlReel = await subirReel();

      const imagenesSeleccionadasFeed = urlsFeed.filter(Boolean);

      const productoActualizado = {
        ...productoFinal,

        imagenes: {
          portada: urlsFeed[0] || imagenesSeleccionadasFeed[0] || "",
          portadaFacebook: urlFacebook,
          preview: urlsFeed[1] || "",
          previewsIndividuales: urlsFeed.slice(2).filter(Boolean),

          redes: {
            feed: {
              presentacion: urlsFeed[0] || "",
              incluye: urlsFeed[1] || "",
              beneficios: urlsFeed[2] || "",
              comoFunciona: urlsFeed[3] || "",
            },
            vertical: {
              presentacion: urlsVertical[0] || "",
              incluye: urlsVertical[1] || "",
              beneficios: urlsVertical[2] || "",
              comoFunciona: urlsVertical[3] || "",
            },
          },
        },

        videoReel: urlReel,
      };

      const respuesta = await fetch(
        "/api/admin/pedidos?accion=editar-producto",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productoId,
            producto: productoActualizado,
          }),
        }
      );

      const texto = await respuesta.text();
      let datos = {};

      if (texto) {
        try {
          datos = JSON.parse(texto);
        } catch {
          throw new Error("El servidor devolvió una respuesta inválida.");
        }
      }

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo actualizar el producto.");
      }

      alert("Producto actualizado correctamente.");
      navigate("/admin/productos");
    } catch (errorGuardado) {
      console.error(errorGuardado);
      alert(errorGuardado.message || "No se pudo actualizar el producto.");
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-sm text-slate-600">
          <Loader2 size={18} className="animate-spin" />
          Cargando producto...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-10">
        <div className="mx-auto max-w-6xl">
          <Aviso tipo="error">{error}</Aviso>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">
            Editar producto
          </h1>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Edita la ficha comercial y los recursos visuales del producto físico.
          </p>
        </div>

        <Seccion titulo="Nombre e ID">
          <Campo
            titulo="Nombre del producto"
            valor={formulario.nombre}
            onChange={(v) => cambiar("nombre", v)}
            placeholder="Ej. Parlante Bluetooth portátil"
          />

          <Campo
            titulo="ID"
            valor={productoId || ""}
            soloLectura
            ayuda="El ID del producto no cambia durante la edición."
          />

          {errorProductos && <Aviso tipo="error">{errorProductos}</Aviso>}
        </Seccion>

        <Seccion titulo="Precio en Argentina">
          <div className="grid gap-4 md:grid-cols-3">
            <Campo
              titulo="Precio normal ARS"
              tipo="number"
              valor={formulario.precioARS}
              onChange={(v) => cambiar("precioARS", v)}
              placeholder="0"
            />

            <Campo
              titulo="Duración de la oferta de lanzamiento"
              tipo="number"
              valor={formulario.duracionOfertaDias}
              onChange={(v) => cambiar("duracionOfertaDias", v)}
              ayuda="Cantidad de días."
              placeholder="3"
            />

            <Check
              titulo="Activar oferta en ARS"
              marcado={formulario.ofertaActiva}
              onChange={(v) => cambiar("ofertaActiva", v)}
            />
          </div>

          {formulario.ofertaActiva && (
            <div className="grid gap-4 md:grid-cols-2">
              <Campo
                titulo="Precio oferta ARS"
                tipo="number"
                valor={formulario.precioOfertaARS}
                onChange={(v) => cambiar("precioOfertaARS", v)}
                placeholder="0"
              />

              <Campo
                titulo="Etiqueta de oferta"
                valor={formulario.etiquetaOferta}
                onChange={(v) => cambiar("etiquetaOferta", v)}
              />
            </div>
          )}
        </Seccion>

        <Seccion titulo="Venta cruzada">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-slate-700">
              Producto relacionado
            </span>

            <select
              value={formulario.ventaCruzadaId}
              onChange={(e) => cambiar("ventaCruzadaId", e.target.value)}
              disabled={cargandoProductos}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Sin venta cruzada</option>
              {productosDisponibles
                .filter((producto) => producto.id !== productoId)
                .map((producto) => (
                  <option key={producto.id} value={producto.id}>
                    {producto.nombre}
                  </option>
                ))}
            </select>
          </label>

          <Check
            titulo="Producto destacado"
            marcado={formulario.destacado}
            onChange={(v) => cambiar("destacado", v)}
          />
        </Seccion>

        <Seccion titulo="Categoría y disponibilidad">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Categoría
              </span>

              <select
                value={formulario.categoria}
                onChange={(e) => cambiar("categoria", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="">Seleccionar categoría</option>
                <option value="tecnologia">Tecnología</option>
                <option value="computacion">Computación</option>
                <option value="audio">Audio</option>
                <option value="pesca">Pesca</option>
                <option value="jardin">Jardín</option>
                <option value="hogar">Hogar</option>
                <option value="ninos">Niños</option>
                <option value="accesorios">Accesorios</option>
                <option value="otros">Otros</option>
              </select>
            </label>

            <Campo
              titulo="Stock"
              tipo="number"
              valor={formulario.stock}
              onChange={(v) => cambiar("stock", v)}
              placeholder="Ej. 25"
              ayuda="Opcional. Déjalo vacío si no quieres controlar unidades."
            />

            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">
                Disponibilidad
              </span>

              <select
                value={formulario.disponibilidad}
                onChange={(e) => cambiar("disponibilidad", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              >
                <option value="disponible">Disponible</option>
                <option value="sin-stock">Sin stock</option>
                <option value="proximamente">Próximamente</option>
                <option value="pausado">Pausado</option>
              </select>
            </label>
          </div>
        </Seccion>

        <Seccion titulo="Contenido de la ficha">
          <Area
            titulo="Descripción corta"
            valor={formulario.descripcion}
            onChange={(v) => cambiar("descripcion", v)}
            filas={4}
          />

          <Area
            titulo="Descripción larga"
            valor={formulario.descripcionLarga}
            onChange={(v) => cambiar("descripcionLarga", v)}
            filas={8}
          />
        </Seccion>

        <Seccion titulo="Características del producto">
          <div className="grid gap-4 md:grid-cols-2">
            <Campo
              titulo="Marca"
              valor={formulario.marca}
              onChange={(v) => cambiar("marca", v)}
              placeholder="Ej. JBL"
            />

            <Campo
              titulo="Modelo"
              valor={formulario.modelo}
              onChange={(v) => cambiar("modelo", v)}
              placeholder="Ej. Go 4"
            />

            <Campo
              titulo="Material"
              valor={formulario.material}
              onChange={(v) => cambiar("material", v)}
              placeholder="Ej. ABS, aluminio, madera..."
            />

            <Campo
              titulo="Dimensiones"
              valor={formulario.dimensiones}
              onChange={(v) => cambiar("dimensiones", v)}
              placeholder="Ej. 20 × 10 × 8 cm"
            />

            <Campo
              titulo="Peso"
              valor={formulario.peso}
              onChange={(v) => cambiar("peso", v)}
              placeholder="Ej. 450 g"
            />
          </div>

          <Area
            titulo="Colores"
            ayuda="Un color por línea."
            valor={formulario.colores}
            onChange={(v) => cambiar("colores", v)}
            filas={4}
          />

          <Area
            titulo="Variantes / opciones"
            ayuda="Una opción por línea."
            valor={formulario.variantes}
            onChange={(v) => cambiar("variantes", v)}
            filas={4}
          />

          <Area
            titulo="Características"
            ayuda="Una característica por línea."
            valor={formulario.caracteristicas}
            onChange={(v) => cambiar("caracteristicas", v)}
            filas={6}
          />

          <Area
            titulo="Contenido del paquete"
            ayuda="Un elemento por línea."
            valor={formulario.contenidoPaquete}
            onChange={(v) => cambiar("contenidoPaquete", v)}
            filas={5}
          />
        </Seccion>

        <Seccion titulo="Imágenes del producto">
          <p className="text-xs leading-5 text-slate-500">
            Las imágenes actuales se conservan si no las reemplazas.
          </p>

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Tienda / Feed — 4:5
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {NOMBRES_IMAGENES.map((titulo, indice) => (
                <ImagenProducto
                  key={titulo}
                  titulo={titulo}
                  imagen={imagenes[indice]}
                  formato="feed"
                  deshabilitado={procesandoImagen || guardando}
                  onSeleccionar={(archivo) =>
                    seleccionarImagen(indice, archivo, "feed")
                  }
                  onEliminar={() => eliminarImagen(indice, "feed")}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900">
              Stories / Reels — 9:16
            </h3>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {NOMBRES_IMAGENES_VERTICAL.map((titulo, indice) => (
                <ImagenProducto
                  key={titulo}
                  titulo={titulo}
                  imagen={imagenesVertical[indice]}
                  formato="vertical"
                  deshabilitado={procesandoImagen || guardando}
                  onSeleccionar={(archivo) =>
                    seleccionarImagen(indice, archivo, "vertical")
                  }
                  onEliminar={() => eliminarImagen(indice, "vertical")}
                />
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-bold text-slate-900">
              Facebook — 900 × 630
            </h3>

            <div className="mt-3 max-w-[360px]">
              <ImagenProducto
                titulo="Imagen principal Facebook"
                imagen={imagenFacebook}
                formato="facebook"
                deshabilitado={procesandoImagen || guardando}
                onSeleccionar={(archivo) =>
                  seleccionarImagen(0, archivo, "facebook")
                }
                onEliminar={() => eliminarImagen(0, "facebook")}
              />
            </div>
          </div>

          {procesandoImagen && (
            <p className="text-xs font-semibold text-sky-600">
              Optimizando imagen...
            </p>
          )}
        </Seccion>

        <Seccion titulo="Video Reel">
          {videoReelActual && !eliminarReelActual && !videoReel && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold text-slate-700">
                Reel actual guardado
              </p>

              <button
                type="button"
                onClick={() => setEliminarReelActual(true)}
                className="mt-2 text-xs font-bold text-red-600"
              >
                Quitar Reel actual
              </button>
            </div>
          )}

          <input
            type="file"
            accept="video/mp4"
            disabled={guardando}
            onChange={(e) => {
              setVideoReel(e.target.files?.[0] || null);
              if (e.target.files?.[0]) setEliminarReelActual(false);
            }}
            className="block w-full text-xs"
          />

          {videoReel && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="min-w-0 truncate text-xs text-slate-700">
                {videoReel.name} · {(videoReel.size / 1024 / 1024).toFixed(2)} MB
              </p>

              <button
                type="button"
                onClick={() => setVideoReel(null)}
                className="shrink-0 rounded-md p-1.5 text-slate-500 hover:bg-white hover:text-red-600"
                title="Quitar Reel nuevo"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </Seccion>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">
            Ficha generada
          </h2>

          <pre className="mt-4 max-h-[600px] overflow-auto whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-[10px] text-slate-100">
            {JSON.stringify(productoFinal, null, 2)}
          </pre>

          <button
            type="button"
            onClick={guardarCambios}
            disabled={
              procesandoImagen ||
              guardando ||
              cargando ||
              cargandoProductos
            }
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {guardando && <Loader2 size={17} className="animate-spin" />}
            {guardando ? "Guardando cambios..." : "Guardar cambios"}
          </button>
        </section>
      </div>
    </main>
  );
}

function Seccion({ titulo, children }) {
  return (
    <section className="mb-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-bold text-slate-900">{titulo}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function Campo({
  titulo,
  ayuda,
  valor,
  onChange,
  tipo = "text",
  placeholder = "",
  soloLectura = false,
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {titulo}
      </span>

      <input
        type={tipo}
        value={valor}
        readOnly={soloLectura}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        className={`w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100 ${
          soloLectura ? "bg-slate-50" : "bg-white"
        }`}
      />

      {ayuda && (
        <span className="mt-1 block text-[10px] leading-4 text-slate-500">
          {ayuda}
        </span>
      )}
    </label>
  );
}

function Area({ titulo, ayuda, valor, onChange, filas = 5 }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {titulo}
      </span>

      {ayuda && (
        <span className="mb-2 block text-[10px] leading-4 text-slate-500">
          {ayuda}
        </span>
      )}

      <textarea
        rows={filas}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
      />
    </label>
  );
}

function Check({ titulo, marcado, onChange }) {
  return (
    <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
      <input
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300"
      />

      <span className="text-xs font-bold text-slate-700">{titulo}</span>
    </label>
  );
}

function Aviso({ tipo = "normal", children }) {
  const clases =
    tipo === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${clases}`}>
      {children}
    </div>
  );
}

function ImagenProducto({
  titulo,
  imagen,
  formato,
  deshabilitado,
  onSeleccionar,
  onEliminar,
}) {
  const relacion =
    formato === "vertical"
      ? "aspect-[9/16]"
      : formato === "facebook"
        ? "aspect-[900/630]"
        : "aspect-[4/5]";

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <p className="mb-2 text-[11px] font-bold text-slate-700">{titulo}</p>

      <div
        className={`${relacion} relative overflow-hidden rounded-lg border border-dashed border-slate-300 bg-white`}
      >
        {imagen?.urlOptimizada ? (
          <>
            <img
              src={imagen.urlOptimizada}
              alt={titulo}
              className="h-full w-full object-cover"
            />

            <button
              type="button"
              onClick={onEliminar}
              disabled={deshabilitado}
              className="absolute right-2 top-2 rounded-md bg-white/90 p-1.5 text-slate-700 shadow disabled:opacity-40"
              title="Quitar imagen"
            >
              <Trash2 size={15} />
            </button>
          </>
        ) : (
          <label className="flex h-full cursor-pointer flex-col items-center justify-center gap-2 p-3 text-center">
            <Upload size={20} className="text-slate-400" />
            <span className="text-[10px] font-semibold text-slate-500">
              Seleccionar imagen
            </span>

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={deshabilitado}
              onChange={(e) => {
                const archivo = e.target.files?.[0] || null;
                if (archivo) onSeleccionar(archivo);
                e.target.value = "";
              }}
              className="hidden"
            />
          </label>
        )}
      </div>

      {imagen?.archivoOriginal?.name && (
        <p className="mt-2 truncate text-[9px] text-slate-500">
          {imagen.archivoOriginal.name}
        </p>
      )}
    </div>
  );
}
