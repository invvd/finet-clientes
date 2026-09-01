"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, ExternalLink, Loader2 } from "lucide-react";

export const OoklaSpeedTest = () => {
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [hasError, setHasError] = useState<boolean>(false);
    const speedtestUrl = "" // No hay enlace todavia, se debe reemplazar con el enlace oficial luego.

    // Efecto de timeout si el iframe se demora más de 10 segundos en cargar
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!speedtestUrl) {
                setIsLoading(false);
                return;
            }

            if (isLoading) {
                setHasError(true);
                setIsLoading(false);
            }
        }, 10000);

        return () => clearTimeout(timer);
    }, [isLoading]);

    // Se ejecuta cuando el iframe carga correctamente
    const handleLoad = () => {
        setIsLoading(false);
    };

    // Se ejecuta si el iframe detecta un error al cargar
    const handleError = () => {
        setHasError(true);
        setIsLoading(false);
    }

    // Renderizado de carga: Enlace no disponible
    if (!speedtestUrl) {
        return (
            <div className="w-full min-h-[450px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-full mb-4">
                    <ExternalLink className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Mide la velocidad de tu conexión
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm mb-6">
                    La herramienta integrada está en configuración. Seras redirigido a la página oficial de Ookla para realizar la medición de velocidad de tu conexión.
                </p>
                <a
                    href="https://www.speedtest.net/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors shadow-sm"
                    >
                        Ir a Speedtest Oficial
                    </a>
            </div>
        )
    }


    // Renderizado de excepción: Servicio no disponible
    if (hasError) {
        return (
            <div className="w-full min-h-[450px] flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center shadow-sm">
                <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                    Servicio no disponible temporalmente
                </h3>
                <p className="text-gray-500 dark:text-gray-400 max-w-sm">
                    La herramienta de evaluación de red no se encuentra disponible en este momento. Por favor, inténtelo más tarde.
                </p>
            </div>
        );
    }

    // Renderizado normal: Contenedor del iframe
    return (
        <div className="relative w-full min-h-[450px] md:min-h-[600px] rounded-2xl overflow-hidden bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">

            {/* Estado de carga visual (Spinner) mientras Ookla responde */}
            {isLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-800 z-10">
                    <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                        Cargando herramienta de medición...
                    </p>
                </div>
            )}

            {/*
                Iframe oficial de Ookla Speedtest (Actualmente Speedtest Custom).
                Nota: Reemplazar el src con el enlace oficial de Ookla para Finet.
            */}
            <iframe
                src={speedtestUrl}
                className="w-full h-full min-h-[450px] md:min-h-[600px] border-none"
                onLoad={handleLoad}
                onError={handleError}
                title="Herramienta de medición de velocidad Ookla"
                allow="geolocation"
            />
        </div>
    );
};