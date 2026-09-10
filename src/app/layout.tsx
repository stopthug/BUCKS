import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";

import { Backdrop } from "@/components/site/backdrop";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { WalletProvider } from "@/components/wallet/wallet-provider";

import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const display = Instrument_Serif({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "$BUCKS — coffee meets stocks.",
    template: "%s — $BUCKS",
  },
  description:
    "$BUCKS is paired with Starbucks stock on Solana. Spend $BUCKS, SBUXx, SOL or USDC on a real Starbucks card.",
  openGraph: {
    title: "$BUCKS — coffee meets stocks.",
    description: "Spend Starbucks stock at Starbucks. Buy a coffee card, or send one to a friend.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "$BUCKS — coffee meets stocks." },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0b0705",
  width: "device-width",
  initialScale: 1,
  // Checkout has to stay legible when a wallet browser zooms it.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <body className="relative flex min-h-full flex-col">
        <Backdrop />
        <WalletProvider>
          <Header />
          <main className="relative z-10 flex-1">{children}</main>
          <Footer />
        </WalletProvider>
      </body>
    </html>
  );
}
