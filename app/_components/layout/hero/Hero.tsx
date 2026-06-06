"use client";

import {useState} from "react";
import {ChevronLeft, ChevronRight} from "lucide-react";

const SLIDES = [
    {
        id: 1,
        title: "Internet de Alta Velocidad",
        subtitle: "Planes de Fibra Óptica desde 200 Mbps hasta 900 Mbps simétricos.",
        image: "/placeholder1.jpg", // Cambiar con rutas reales de imágenes (public)
        bgColor: "bg-blue-600",
    },
    {
        id: 2,
        title: "Conectividad sin Interrupciones",
        subtitle: "Cobertura total en la zona sur-oriente.", // Se puede cambiar por algo más específico
        image: "/placeholder2.jpg", // Cambiar con rutas reales de imágenes
        bgColor: "bg-gray-600",
    },
    {
        id: 3,
        title: "Televisión Digital HD",
        subtitle: "Agrega entretenimiento a tu hogar con nuestros planes Dúo.",
        image: "/placeholder3.jpg", // Cambiar con rutas reales de imágenes
        bgColor: "bg-blue-600",
    },
];

export const Hero = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev === 0 ? SLIDES.length - 1 : prev - 1));
    };

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev === SLIDES.length - 1 ? 0 : prev + 1));
    };

    return (
        // Responsive design: en pantallas pequeñas, el contenido se apila verticalmente; en pantallas grandes, se muestra en una fila
        <section className="relative w-full h-[60vh] md:h-[70vh] overflow-hidden bg-gray-100 dark:bg-gray-900">
            {/* Pista del carrusel */}
            <div
                className="flex h-full w-full transition-transform duration-400 ease-in-out"
                style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
                {SLIDES.map((slide) => (
                    <div
                        key={slide.id}
                        className={`relative flex-shrink-0 w-full h-full flex items-center justify-center ${slide.bgColor}`}
                    >
                        {/*
                            Fondo de la imagen.
                            Usamos loading="lazy" para cumplir con el RNF-14.1 y no afectar el LCP.
                        */}
                        {/*
                            <Image
                                src={slide.image}
                                alt={slide.title}
                                fill
                                className="object-cover opacity-40 mix-blend-overlay"
                                loading={index === 0 ? "eager" : "lazy"} // Carga rapida la primera, las demas diferida
                            />
                        */}
                        {/* Contenido del slide */}
                        <div className="relative z-10 text-center px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
                            <h2 className="text-3xl md:text-5xl lg:text-6xl font-extrabold text-white tracking-tight mb-4 drop-shadow-md">
                                {slide.title}
                            </h2>
                            <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto drop-shadow-sm">
                                {slide.subtitle}
                            </p>

                            <a
                                href="/planes"
                                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] px-8 py-3 text-base font-bold text-[var(--color-background)] hover:bg-[var(--color-primary-bright)] transition-colors shadow-lg shadow-[var(--color-primary)]/25"
                            >
                                Ver Planes
                            </a>
                        </div>
                    </div>
                ))}
            </div>

            {/*
                Controles Manuales (CU-16)
                Botones superpuestos a los lados para avanzar o retroceder
            */}
            <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Imagen anterior"
            >
                <ChevronLeft size={32} />
            </button>
            <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/50 text-white backdrop-blur-sm transition-all focus:outline-none focus:ring-2 focus:ring-white"
                aria-label="Imagen siguiente"
            >
                <ChevronRight size={32} />
            </button>

            {/* Indicadores de posición (Puntos inferiores) */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-3 z-20">
                {SLIDES.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            currentIndex === index
                            ? "bg-white scale-125"
                            : "bg-white/50 hover:bg-white/80"
                        }`}
                        aria-label={`Ir a la imagen ${index + 1}`}
                    />
                ))}
            </div>
        </section>
    );
};