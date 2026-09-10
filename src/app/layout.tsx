import type { Metadata, Viewport } from "next";
import { Caveat, IBM_Plex_Mono, Nunito } from "next/font/google";

import { Backdrop } from "@/components/site/backdrop";
import { Footer } from "@/components/site/footer";
import { Header } from "@/components/site/header";
import { WalletProvider } from "@/components/wallet/wallet-provider";

import "./globals.css";

const sans = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
});
const mono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const doodle = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "$BUCKS — Starbucks gift cards, paid in crypto",
    template: "%s — $BUCKS",
  },
  description:
    "Partnered with Starbucks. Buy a real gift card with $BUCKS, SBUXx, SOL, or USDC. Keep it, or send it as a gift.",
  openGraph: {
    title: "$BUCKS — Starbucks gift cards, paid in crypto",
    description: "Partnered with Starbucks. Pay with crypto. Get a real card. Or send one as a link.",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "$BUCKS — Starbucks gift cards, paid in crypto" },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#f4ead8",
  width: "device-width",
  initialScale: 1,
  // Checkout has to stay legible when a wallet browser zooms it.
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable} ${doodle.variable} h-full`}
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
