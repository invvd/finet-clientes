export type ServicioCorporativo = {
  id: string;
  nombre: string;
  descripcion: string;
};

export const serviciosCorporativos: ServicioCorporativo[] = [
  {
    id: "internet-dedicado",
    nombre: "Internet dedicado",
    descripcion: "Servicio para empresas que requieren conectividad estable.",
  },
  {
    id: "soporte-corporativo",
    nombre: "Soporte corporativo",
    descripcion: "Canal de atencion para instituciones y clientes empresa.",
  },
  {
    id: "planes-instituciones",
    nombre: "Planes para instituciones",
    descripcion: "Ofertas comerciales para organizaciones con multiples usuarios.",
  },
];

export function getServiciosCorporativos() {
  return serviciosCorporativos;
}
