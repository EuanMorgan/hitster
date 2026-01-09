import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { PlayerStoreProvider } from "@/components/player-store-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { TRPCReactProvider } from "@/trpc/client";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Hitster",
  description: "Music timeline party game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TRPCReactProvider>
            <PlayerStoreProvider>{children}</PlayerStoreProvider>
          </TRPCReactProvider>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              className: "animate-in slide-in-from-top-2 fade-in duration-300",
            }}
            icons={{
              success: <CheckCircle2 className="h-5 w-5 text-green-600" />,
              error: <XCircle className="h-5 w-5 text-red-600" />,
              info: <Info className="h-5 w-5 text-blue-600" />,
              warning: <AlertTriangle className="h-5 w-5 text-amber-600" />,
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
