import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SynapBase — La base de datos inteligente de tu comercio",
    template: "%s · SynapBase",
  },
  description:
    "Convertí cada visita en un cliente conocido. SynapBase transforma un QR en tu local en una base de datos viva: quiénes son tus clientes, qué consumen y cómo hacer que vuelvan. Un producto de Synapse.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
