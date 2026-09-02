import {
  MessageCircle,
  Share2,
  Link2,
} from "lucide-react";
import { useState } from "react";

const CompartirProducto = ({ producto }) => {
  const [copiado, setCopiado] = useState(false);

  const url =
    typeof window !== "undefined"
      ? window.location.href
      : "";

  const texto = `Mirá este producto: ${producto.nombre}`;

  const abrir = (urlCompartir) => {
    window.open(
      urlCompartir,
      "_blank",
      "noopener,noreferrer"
    );
  };

  const compartirFacebook = () => {
    abrir(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        url
      )}`
    );
  };

  const compartirX = () => {
    abrir(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        texto
      )}&url=${encodeURIComponent(url)}`
    );
  };

  const compartirWhatsApp = () => {
    abrir(
      `https://wa.me/?text=${encodeURIComponent(
        `${texto}\n${url}`
      )}`
    );
  };

  const compartirNativo = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: producto.nombre,
          text: texto,
          url,
        });

        return;
      } catch {
        return;
      }
    }

    await copiarEnlace();
  };

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(url);
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

      <div className="flex flex-wrap items-center gap-2">
        {/* FACEBOOK */}
        <button
  type="button"
  onClick={compartirFacebook}
  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-600"
  aria-label="Compartir en Facebook"
  title="Facebook"
>
  <span className="text-base font-bold">f</span>
</button>

        {/* X / TWITTER */}
        <button
          type="button"
          onClick={compartirX}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          aria-label="Compartir en X"
          title="X"
        >
          𝕏
        </button>

        {/* WHATSAPP */}
        <button
          type="button"
          onClick={compartirWhatsApp}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-green-200 hover:bg-green-50 hover:text-green-600"
          aria-label="Compartir por WhatsApp"
          title="WhatsApp"
        >
          <MessageCircle size={16} />
        </button>

        {/* INSTAGRAM / TIKTOK / APPS DEL TELÉFONO */}
        <button
          type="button"
          onClick={compartirNativo}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-sky-200 hover:bg-sky-50 hover:text-sky-700"
          aria-label="Compartir en otras aplicaciones"
          title="Instagram, TikTok y otras aplicaciones"
        >
          <Share2 size={15} />
          Más
        </button>

        {/* COPIAR ENLACE */}
        <button
          type="button"
          onClick={copiarEnlace}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <Link2 size={14} />
          {copiado ? "Copiado" : "Copiar enlace"}
        </button>
      </div>
    </div>
  );
};

export default CompartirProducto;