export type Plan = {
  id: string;
  nombre: string;
  descripcion: string;
  precio: string;
  caracteristicas: string[];
};

export const planes: Plan[] = [
  {
    id: "fibra-hogar",
    nombre: "Fibra Hogar",
    descripcion: "Plan de internet residencial para navegacion diaria.",
    precio: "$19.990",
    caracteristicas: ["Internet fibra", "Instalacion coordinada", "Soporte remoto"],
  },
  {
    id: "fibra-plus",
    nombre: "Fibra Plus",
    descripcion: "Plan con mayor velocidad para hogares con varios dispositivos.",
    precio: "$29.990",
    caracteristicas: ["Mayor velocidad", "Wi-Fi incluido", "Soporte prioritario"],
  },
  {
    id: "fibra-empresa",
    nombre: "Fibra Empresa",
    descripcion: "Plan orientado a pequenas empresas y oficinas.",
    precio: "$39.990",
    caracteristicas: ["Conexion estable", "Atencion comercial", "Facturacion empresa"],
  },
];

export function getPlanes() {
  return planes;
}

export function getPlanById(planId: string) {
  return planes.find((plan) => plan.id === planId);
}
