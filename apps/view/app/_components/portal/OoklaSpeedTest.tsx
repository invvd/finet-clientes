'use client';

import { useEffect, useRef, useState } from 'react';
import { Gauge } from 'lucide-react';

export default function OoklaSpeedTest() {
  const anchorRef = useRef<HTMLAnchorElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // RNF-26.1: cargar script de forma asíncrona, sin bloquear el render principal
    const script = document.createElement('script');
    script.src = '//c.speedtest.net/embed/speedtest.js';
    script.async = true;
    script.onload = () => setLoaded(true);
    document.body.appendChild(script);
    return () => {
      if (script.parentNode) script.parentNode.removeChild(script);
    };
  }, []);

  return (
    <div className="rounded-2xl bg-surface p-5 shadow-sm flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Gauge className="text-primary shrink-0" size={18} />
        <p className="text-sm font-medium text-muted">Velocidad de Red</p>
      </div>
      <p className="text-xs text-muted">
        Mide la velocidad de descarga, subida y latencia de tu conexión actual.
      </p>

      {/* El script de Ookla reemplaza este anchor con el widget embebido */}
      <div className="w-full min-h-[100px] flex items-center justify-center">
        {!loaded && (
          <span className="text-xs text-muted animate-pulse">Cargando herramienta de medición...</span>
        )}
        <a
          ref={anchorRef}
          href="https://www.speedtest.net"
          target="_blank"
          rel="noopener noreferrer"
          className={loaded ? '' : 'hidden'}
        >
          Speedtest by Ookla
        </a>
      </div>
    </div>
  );
}
