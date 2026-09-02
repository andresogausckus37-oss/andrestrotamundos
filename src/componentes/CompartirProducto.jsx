import {
  MessageCircle,
  Share2,
  Link2,
} from "lucide-react";
import { useState } from "react";

const DOMINIO = "https://andrestrotamundos.vercel.app";

const CompartirProducto = ({ producto }) => {
  const [copiado, setCopiado] = useState(false);

  /*
    URL SOCIAL:
    Esta página contiene los metadatos Open Graph específicos
    del producto y luego redirige al detalle real.
  */
  const urlCompartir = `${DOMINIO}/compartir/${producto.id}.html`;

  const texto = `Mirá este producto: ${producto.nombre}`;

  const abrir = (url) => {
    window.open(
      url,
      "_blank",
      "noopener,noreferrer"
    );
  };

  /* FACEBOOK */
  const compartirFacebook = () => {
    abrir(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        urlCompartir
      )}`
    );
  };

  /* X / TWITTER */
  const compartirX = () => {
    abrir(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        texto
      )}&url=${encodeURIComponent(urlCompartir)}`
    );
  };

  /* WHATSAPP */
  const compartirWhatsApp = () => {
    abrir(
      `https://wa.me/?text=${encodeURIComponent(
        `${texto}\n${urlCompartir}`
      )}`
    );
  };

  /* COMPARTIR NATIVO DEL TELÉFONO */
  const compartirNativo = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: producto.nombre,
          text: texto,
          url: urlCompartir,
        });

        return;
      } catch {
        return;
      }
    }

    await copiarEnlace();
  };

  /* COPIAR ENLACE */
  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(urlCompartir);

      setCopiado(true);

      setTimeout(() => {
        setCopiado(false);
      }, 2000);
    } catch {
      setCopiado(false);
    }
  };

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-medium text-slate-500">
        Compartir producto
      </p>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* FACEBOOK */}
        <button
          type="button"
          onClick={compartirFacebook}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1877F2] text-white shadow-sm transition hover:opacity-90"
          aria-label="Compartir en Facebook"
          title="Facebook"
        >
          <span className="text-xl font-bold leading-none">
            f
          </span>
        </button>

        {/* X */}
        <button
          type="button"
          onClick={compartirX}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white shadow-sm transition hover:opacity-80"
          aria-label="Compartir en X"
          title="X"
        >
          <span className="text-lg font-semibold leading-none">
            𝕏
          </span>
        </button>

        {/* WHATSAPP */}
        <button
          type="button"
          onClick={compartirWhatsApp}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-[#25D366] text-white shadow-sm transition hover:opacity-90"
          aria-label="Compartir por WhatsApp"
          title="WhatsApp"
        >
          <MessageCircle size={21} strokeWidth={2} />
        </button>

        {/* MÁS / INSTAGRAM / TIKTOK / OTRAS APPS */}
        <button
          type="button"
          onClick={compartirNativo}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-sky-600 px-4 text-xs font-semibold text-white shadow-sm transition hover:bg-sky-700"
          aria-label="Compartir en otras aplicaciones"
          title="Instagram, TikTok y otras aplicaciones"
        >
          <Share2 size={18} />
          Más
        </button>

        {/* COPIAR */}
        <button
          type="button"
          onClick={copiarEnlace}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <Link2 size={17} />

          {copiado ? "Copiado" : "Copiar"}
        </button>
      </div>
    </div>
  );
};

export default CompartirProducto;