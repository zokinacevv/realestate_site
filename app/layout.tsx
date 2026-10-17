import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DOMA — Недвижности во Македонија",
  description:
    "Попрегледен начин да пронајдете недвижност за купување или изнајмување во Македонија.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mk">
      <body>{children}</body>
    </html>
  );
}
