import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppSidebar } from "@/components/app-sidebar";
import { Providers } from "@/components/providers";
import { ConnectionStatus } from "@/components/connection-status";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

export const metadata: Metadata = {
  title: "Quant Trading System",
  description: "Professional algorithmic trading platform with IBKR integration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>
          <TooltipProvider>
            <div className="flex h-screen">
              <AppSidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <header className="flex h-14 items-center gap-4 border-b px-6 bg-card">
                  <Button variant="ghost" size="icon" className="md:hidden">
                    <Menu className="h-5 w-5" />
                  </Button>
                  <div className="md:hidden font-semibold">Quant Trading</div>
                  <div className="flex-1" />
                  <ConnectionStatus />
                </header>
                <main className="flex-1 overflow-auto p-6 bg-background">
                  {children}
                </main>
              </div>
            </div>
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
