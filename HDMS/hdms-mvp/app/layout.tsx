import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
title: "HDMS — Симулятор матчапов Hearthstone",
description: "Model-based matchup simulator"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
    <html lang="ru">
      <body className="bg-hs-bg text-hs-text min-h-screen">{children}</body>
    </html>
  );
}