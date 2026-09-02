import { MessageCircle } from "lucide-react";
import { CONFIG } from "../datos/config";

const WhatsAppFlotante = () => {
  const mensaje = `Hola ${CONFIG.marca.nombre}. Vi tu web ${CONFIG.marca.dominio} y quiero hacer una consulta sobre tus servicios.`;

  return (
    <a
      href={`https://wa.me/${CONFIG.contacto.whatsapp}?text=${encodeURIComponent(
        mensaje
      )}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-xl transition hover:scale-105 hover:bg-green-600 sm:bottom-6 sm:right-6 sm:h-16 sm:w-16"
      aria-label="Contactar por WhatsApp"
    >
      <MessageCircle size={27} />
    </a>
  );
};

export default WhatsAppFlotante;