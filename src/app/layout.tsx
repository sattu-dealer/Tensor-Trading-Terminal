import type { Metadata } from "next";
import "./globals.css";
import LayoutWrapper from "@/components/ui/LayoutWrapper";
import { TradingProvider } from "@/context/TradingContext";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "Tensor | Premium Paper Trading",
  description: "Next-gen paper trading platform utilizing live market data.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <TradingProvider>
            <LayoutWrapper>
              {children}
            </LayoutWrapper>
          </TradingProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
