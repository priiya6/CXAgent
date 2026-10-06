import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aria | Aura Skincare",
  description: "AI customer support for Aura Skincare",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
