import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plataforma LMS de Desenvolvimento",
  description: "Trilhas, conteúdos e acompanhamento de desenvolvimento para empresas.",
  openGraph: {
    title: "Plataforma LMS de Desenvolvimento",
    description: "Trilhas, conteúdos e evolução em um só lugar.",
    type: "website",
    images: ["/og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Plataforma LMS de Desenvolvimento",
    description: "Trilhas, conteúdos e evolução em um só lugar.",
    images: ["/og.png"],
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
