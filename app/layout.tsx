import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "./_components/layout/navbar/Navbar";
import Footer from "./_components/layout/footer/Footer";
import { themeScript } from "./_components/layout/theme/theme-script";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Finet — Internet y TV",
  description:
    "Conecta tu hogar con fibra óptica e Internet de alta velocidad. Planes de Internet y TV digital para La Pintana, Puente Alto, La Florida y La Granja.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
