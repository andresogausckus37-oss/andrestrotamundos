import { CONFIG } from "../datos/config";
import {
Shield,
Video,
MessageCircle,
ChevronRight,
Dog,
} from "lucide-react";

const Hero = ({ scrollTo }) => {
return (
<section  
id="inicio"  
className="relative flex items-center px-5 overflow-hidden bg-white pt-24"  
>
<div className="absolute inset-0 -z-20 bg-gradient-to-br from-sky-50 via-white to-orange-50" />

<div className="absolute -left-40 top-20 -z-10 h-96 w-96 rounded-full bg-sky-200/40 blur-3xl" />  

  <div className="absolute -right-32 bottom-10 -z-10 h-96 w-96 rounded-full bg-orange-200/40 blur-3xl" />  

  <div className="contenedor grid w-full items-center gap-12 py-16 md:grid-cols-[1.1fr_.9fr]">  
    <div className="text-center md:text-left">  
        

      <h1 className="text-4xl font-semibold leading-[1.12] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">  
        Tu hogar y tus mascotas,  
        <span className="block text-sky-600">  
          cuidados mientras viajas  
        </span>  
      </h1>  

      <p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-600 sm:text-lg md:mx-0">  
        Cuidado de casas, mascotas e intercambios basados en confianza,  
        responsabilidad y comunicación clara.  
      </p>  

      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row md:justify-start">  
        <button  
          onClick={() => scrollTo("servicios")}  
          className="boton-principal w-full gap-2 sm:w-auto"  
        >  
          Ver servicios disponibles  
          <ChevronRight size={17} />  
        </button>  

        <button  
          onClick={() => scrollTo("disponibilidad")}  
          className="boton-secundario w-full sm:w-auto"  
        >  
          Consultar disponibilidad  
        </button>  
      </div>  

        
    



        

        
    </div>  
  </div>  
</section>

);
};

export default Hero;