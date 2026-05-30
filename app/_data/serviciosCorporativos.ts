export type ServicioCorporativo = {
  id: string;
  nombre: string;
  descripcion: string;
};

export const serviciosCorporativos: ServicioCorporativo[] = [
  {
    id: "internet-dedicado",
    nombre: "Internet dedicado",
    descripcion: "Conectividad para empresas e instituciones.",
  },
  {
    id: "soporte-corporativo",
    nombre: "Soporte corporativo",
    descripcion: "Atencion para organizaciones que requieren continuidad operacional.",
  },
  {
    id: "planes-instituciones",
    nombre: "Planes para instituciones",
    descripcion: "Ofertas comerciales para equipos y multiples usuarios.",
  },
];

export function getServiciosCorporativos() {
  return serviciosCorporativos;
}
