import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next"
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Safe QR Scanner | Protect Your Scans",
  description: "Scan any QR code and check if it contains malware or phishing links. Stay safe while scanning!",
  openGraph: {
    title: "Safe QR Scanner",
    description: "Scan any QR code and check if it contains malware or phishing links. Stay safe while scanning!",
    url: "https://secure-qr-scanner.vercel.app/",
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
    <html lang="en">
      <body className={inter.className}>{children}</body>
      <Analytics />
    </html>
  );
}