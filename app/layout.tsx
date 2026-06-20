import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Safe QR Scanner | Protege tus escaneos",
  description: "Analiza cualquier código QR con la cámara o subiendo una imagen para descubrir si esconde malware o phishing usando la tecnología de VirusTotal.",
  openGraph: {
    title: "Safe QR Scanner",
    description: "Analiza cualquier código QR y descubre si esconde malware o phishing.",
    url: "https://qr-seguro.vercel.app", // Cámbialo luego por tu dominio final
    siteName: "Safe QR Scanner",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={inter.className}>{children}</body>
    </html>
  );
}