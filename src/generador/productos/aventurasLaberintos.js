export const IMAGENES_LABERINTOS = {
  personajes: {
    toby: "https://i.postimg.cc/fTwWBqBM/file-000000000204820e8213b33f08a90324.png",
    luna: "https://i.postimg.cc/7hPvMdwk/file-00000000e68c820ead57a74bfc91b08f.png",
  },

  objetos: {
    pelota: "",
    ovillo: "",
    hueso: "",
    comida: "",
    frisbee: "",
    pescado: "",
  },
};

export const AVENTURAS_LABERINTOS = [
  {
    personaje: "toby",
    objeto: "pelota",
    titulo: "¡Toby busca su pelota!",
    instrucciones:
      "Ayudá a Toby a encontrar el camino hasta su pelota.",
  },

  {
    personaje: "luna",
    objeto: "ovillo",
    titulo: "¡Luna busca su ovillo!",
    instrucciones:
      "Luna perdió su ovillo. ¿Podés ayudarla a encontrarlo?",
  },

  {
    personaje: "toby",
    objeto: "hueso",
    titulo: "¡Toby quiere su hueso!",
    instrucciones:
      "Encontrá el camino correcto para que Toby llegue hasta su hueso.",
  },

  {
    personaje: "luna",
    objeto: "comida",
    titulo: "¡Luna tiene hambre!",
    instrucciones:
      "Ayudá a Luna a encontrar el camino hasta su comida.",
  },

  {
    personaje: "toby",
    objeto: "frisbee",
    titulo: "¡A buscar el frisbee!",
    instrucciones:
      "Toby quiere recuperar su frisbee. ¿Podés mostrarle el camino?",
  },

  {
    personaje: "luna",
    objeto: "pescado",
    titulo: "¡Luna busca su pescado!",
    instrucciones:
      "Encontrá el camino correcto para que Luna llegue hasta su pescado.",
  },
];

export function obtenerAventuraLaberinto(indice) {
  return AVENTURAS_LABERINTOS[
    indice % AVENTURAS_LABERINTOS.length
  ];
}