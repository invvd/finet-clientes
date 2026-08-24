"use client";

import { useEffect, useRef } from "react";
import { MapContainer, Polygon, Polyline, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ConfigVisor, ZonaCobertura } from "../../_lib/cobertura-admin";
import {
  celdasBajoPincel,
  claveCelda,
  colorDensidad,
  snapCoordenada,
} from "../../_lib/cobertura-grid";

export type Herramienta = "mover" | "pincel" | "goma" | "poligono";

type MapaEditorProps = {
  config: ConfigVisor;
  paso: number;
  /** Celdas pintadas, indexadas por `claveCelda`. */
  celdas: Map<string, { latitud: number; longitud: number; densidad: number }>;
  zonas: ZonaCobertura[];
  herramienta: Herramienta;
  radio: number;
  intensidad: number;
  verticesEnCurso: [number, number][];
  idZonaSeleccionada: number | null;
  /** Se llama en cada movimiento del pincel, con las celdas afectadas. */
  onPintar: (celdas: { latitud: number; longitud: number }[]) => void;
  /** Se llama al soltar el botón: cierra el trazo y lo manda al backend. */
  onFinTrazo: () => void;
  onAgregarVertice: (vertice: [number, number]) => void;
  onSeleccionarZona: (idZona: number) => void;
};

/**
 * Dibuja las celdas del pincel en un canvas propio sobre el mapa.
 *
 * No se usan rectángulos de Leaflet: cada celda sería un nodo del DOM y con unas
 * pocas miles el editor se arrastra. Un solo canvas redibuja todo en un frame.
 */
function CapaCeldas({
  celdas,
  paso,
}: {
  celdas: Map<string, { latitud: number; longitud: number; densidad: number }>;
  paso: number;
}) {
  const map = useMap();
  // Las celdas se leen dentro de los listeners de Leaflet, que no se vuelven a
  // registrar en cada render. La ref se actualiza en un efecto, nunca durante
  // el render: escribirla en el cuerpo del componente rompe el modelo de React.
  const celdasRef = useRef(celdas);
  const redibujarRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // `leaflet-zoom-hide` hace que Leaflet oculte el canvas durante la animación
    // de zoom; al terminar se redibuja alineado en vez de quedar desfasado.
    const canvas = L.DomUtil.create(
      "canvas",
      "leaflet-zoom-hide"
    ) as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    canvas.style.position = "absolute";
    map.getPanes().overlayPane.appendChild(canvas);

    const dibujar = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Tamaño en píxeles de una celda al zoom actual.
      const origen = map.latLngToContainerPoint([0, 0]);
      const desplazada = map.latLngToContainerPoint([paso, paso]);
      const ancho = Math.max(2, Math.abs(desplazada.x - origen.x));
      const alto = Math.max(2, Math.abs(desplazada.y - origen.y));

      const visible = map.getBounds().pad(0.15);

      for (const celda of celdasRef.current.values()) {
        if (!visible.contains([celda.latitud, celda.longitud])) continue;

        const punto = map.latLngToContainerPoint([
          celda.latitud,
          celda.longitud,
        ]);
        ctx.fillStyle = colorDensidad(celda.densidad);
        ctx.fillRect(
          punto.x - ancho / 2,
          punto.y - alto / 2,
          ancho + 0.5,
          alto + 0.5
        );
      }
    };

    const reposicionar = () => {
      const tamano = map.getSize();
      if (canvas.width !== tamano.x || canvas.height !== tamano.y) {
        canvas.width = tamano.x;
        canvas.height = tamano.y;
      }
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      dibujar();
    };

    reposicionar();
    redibujarRef.current = reposicionar;
    map.on("move zoomend resize viewreset", reposicionar);

    return () => {
      map.off("move zoomend resize viewreset", reposicionar);
      redibujarRef.current = null;
      canvas.remove();
    };
  }, [map, paso]);

  // Cada pincelada cambia el mapa de celdas sin que el mapa se haya movido:
  // hay que redibujar igual.
  useEffect(() => {
    celdasRef.current = celdas;
    redibujarRef.current?.();
  }, [celdas]);

  return null;
}

/** Pincel y goma: arrastrar con el botón izquierdo pinta o borra celdas. */
function ControlPincel({
  activo,
  paso,
  radio,
  onPintar,
  onFinTrazo,
}: {
  activo: boolean;
  paso: number;
  radio: number;
  onPintar: (celdas: { latitud: number; longitud: number }[]) => void;
  onFinTrazo: () => void;
}) {
  const map = useMap();
  const pintandoRef = useRef(false);

  useEffect(() => {
    if (!activo) return;

    // Con el pincel activo, arrastrar tiene que pintar y no mover el mapa.
    map.dragging.disable();
    map.getContainer().style.cursor = "crosshair";

    const aplicar = (latlng: L.LatLng) => {
      onPintar(celdasBajoPincel(latlng.lat, latlng.lng, paso, radio));
    };

    const alPresionar = (e: L.LeafletMouseEvent) => {
      pintandoRef.current = true;
      aplicar(e.latlng);
    };

    const alMover = (e: L.LeafletMouseEvent) => {
      if (pintandoRef.current) aplicar(e.latlng);
    };

    // El mouseup va al documento: soltar fuera del mapa igual cierra el trazo.
    const alSoltar = () => {
      if (!pintandoRef.current) return;
      pintandoRef.current = false;
      onFinTrazo();
    };

    map.on("mousedown", alPresionar);
    map.on("mousemove", alMover);
    document.addEventListener("mouseup", alSoltar);

    return () => {
      map.dragging.enable();
      map.getContainer().style.cursor = "";
      map.off("mousedown", alPresionar);
      map.off("mousemove", alMover);
      document.removeEventListener("mouseup", alSoltar);
      pintandoRef.current = false;
    };
  }, [activo, map, paso, radio, onPintar, onFinTrazo]);

  return null;
}

/** Polígono: cada click agrega un vértice. Se cierra desde la barra. */
function ControlPoligono({
  activo,
  onAgregarVertice,
}: {
  activo: boolean;
  onAgregarVertice: (vertice: [number, number]) => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!activo) return;

    map.getContainer().style.cursor = "copy";

    const alHacerClick = (e: L.LeafletMouseEvent) => {
      onAgregarVertice([
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6)),
      ]);
    };

    map.on("click", alHacerClick);

    return () => {
      map.getContainer().style.cursor = "";
      map.off("click", alHacerClick);
    };
  }, [activo, map, onAgregarVertice]);

  return null;
}

export default function MapaEditor({
  config,
  paso,
  celdas,
  zonas,
  herramienta,
  radio,
  verticesEnCurso,
  idZonaSeleccionada,
  onPintar,
  onFinTrazo,
  onAgregarVertice,
  onSeleccionarZona,
}: MapaEditorProps) {
  const limites = L.latLngBounds(
    [config.limites.sur_oeste.latitud, config.limites.sur_oeste.longitud],
    [config.limites.nor_este.latitud, config.limites.nor_este.longitud]
  );

  return (
    <MapContainer
      center={[config.centro.latitud, config.centro.longitud]}
      zoom={config.zoom_inicial}
      minZoom={config.zoom_min}
      maxZoom={config.zoom_max}
      maxBounds={limites}
      maxBoundsViscosity={1}
      scrollWheelZoom
      doubleClickZoom={herramienta !== "poligono"}
      className="h-[70vh] min-h-[440px] w-full rounded-2xl border border-border"
    >
      <TileLayer
        attribution='&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={config.zoom_max}
      />

      {zonas.map((zona) => (
        <Polygon
          key={zona.id_zona}
          positions={zona.vertices}
          pathOptions={{
            color:
              zona.id_zona === idZonaSeleccionada ? "#E3E446" : "#0B1C30",
            weight: zona.id_zona === idZonaSeleccionada ? 3 : 1.5,
            fillColor: colorDensidad(zona.densidad_cobertura, 1),
            fillOpacity: zona.activo ? 0.35 : 0.08,
            dashArray: zona.activo ? undefined : "6 4",
          }}
          eventHandlers={{ click: () => onSeleccionarZona(zona.id_zona) }}
        />
      ))}

      {verticesEnCurso.length > 0 && (
        <Polyline
          positions={
            verticesEnCurso.length > 2
              ? [...verticesEnCurso, verticesEnCurso[0]]
              : verticesEnCurso
          }
          pathOptions={{ color: "#E3E446", weight: 3, dashArray: "6 4" }}
        />
      )}

      <CapaCeldas celdas={celdas} paso={paso} />

      <ControlPincel
        activo={herramienta === "pincel" || herramienta === "goma"}
        paso={paso}
        radio={radio}
        onPintar={onPintar}
        onFinTrazo={onFinTrazo}
      />

      <ControlPoligono
        activo={herramienta === "poligono"}
        onAgregarVertice={onAgregarVertice}
      />
    </MapContainer>
  );
}

export { claveCelda, snapCoordenada };
