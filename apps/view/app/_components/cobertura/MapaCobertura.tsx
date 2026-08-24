"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import type {
  PuntoCobertura,
  VisorCoberturaConfig,
} from "../../_lib/api";

type MapaCoberturaProps = {
  config: VisorCoberturaConfig;
  puntos: PuntoCobertura[];
};

/**
 * CU-60: capa de mapa de calor sobre el visor.
 * La intensidad se normaliza contra la densidad maxima del set para que la
 * escala de color sea legible sin importar el rango absoluto de los datos.
 */
function CapaCalor({ puntos }: { puntos: PuntoCobertura[] }) {
  const map = useMap();

  useEffect(() => {
    if (puntos.length === 0) return;

    const densidadMaxima = Math.max(
      ...puntos.map((p) => p.densidad_cobertura ?? 0),
      1
    );

    const datos: [number, number, number][] = puntos.map((p) => [
      p.latitud,
      p.longitud,
      (p.densidad_cobertura ?? 0) / densidadMaxima,
    ]);

    const capa = L.heatLayer(datos, {
      radius: 28,
      blur: 20,
      minOpacity: 0.35,
    }).addTo(map);

    return () => {
      capa.remove();
    };
  }, [map, puntos]);

  return null;
}

export default function MapaCobertura({ config, puntos }: MapaCoberturaProps) {
  // CU-62: mas alla de estos limites el paneo no avanza.
  const limites = useMemo(
    () =>
      L.latLngBounds(
        [config.limites.sur_oeste.latitud, config.limites.sur_oeste.longitud],
        [config.limites.nor_este.latitud, config.limites.nor_este.longitud]
      ),
    [config.limites]
  );

  return (
    <MapContainer
      center={[config.centro.latitud, config.centro.longitud]}
      zoom={config.zoom_inicial}
      // CU-61: el rango de escala queda acotado por el backend.
      minZoom={config.zoom_min}
      maxZoom={config.zoom_max}
      maxBounds={limites}
      maxBoundsViscosity={1}
      // CU-61: rueda, doble click y pellizco. CU-62: arrastre con puntero o dedo.
      scrollWheelZoom
      doubleClickZoom
      touchZoom
      dragging
      className="h-[60vh] min-h-[380px] w-full rounded-2xl border border-border"
    >
      <TileLayer
        attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={config.zoom_max}
      />
      <CapaCalor puntos={puntos} />
    </MapContainer>
  );
}
