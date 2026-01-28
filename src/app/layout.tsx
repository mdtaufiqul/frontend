import type { Metadata } from "next";
import { Inter, Playfair_Display, Space_Mono } from "next/font/google";
import "./globals.css";
import { ClinicProvider } from "@/context/ClinicContext";
import { Toaster } from "@/components/ui/sonner"

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-serif" });
const spaceMono = Space_Mono({ weight: ["400", "700"], subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "MediFlow",
  description: "Modern EMR Solution",
};

import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${playfair.variable} ${spaceMono.variable} font-sans antialiased`} suppressHydrationWarning={true}>
        <ClinicProvider>
          <AuthProvider> {/* Assuming AuthProvider is intended to remain, as Providers is not defined */}
            {children}
            <Toaster />
          </AuthProvider>
        </ClinicProvider>
      </body>
    </html>
  );
}
