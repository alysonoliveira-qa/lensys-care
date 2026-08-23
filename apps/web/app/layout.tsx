import type { Metadata } from "next";
import localFont from "next/font/local";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Lensys Care",
  description: "Sistema de gestão para optometria clínica",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        {/* Web Vitals reais, do navegador de quem usa. A instrumentação de
            servidor (lib/performance.ts) mede a query; esta mede o que a
            pessoa sente — e é a régua para comparar antes e depois da mudança
            de região do banco. */}
        <SpeedInsights />
      </body>
    </html>
  );
}
