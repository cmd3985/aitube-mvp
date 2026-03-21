import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GenCine | The Global AI Cinema Lounge",
  description: "프롬프트 한 줄에서 시작된 거대한 유니버스. 알고리즘을 넘어 예술로 탄생한 전 세계의 AI 영화들을 GenCine에서 만나보세요. | A massive universe born from a single prompt. Discover global AI films that transcend algorithms and become art, only on GenCine.",
  metadataBase: new URL("https://gencine.tv"),
  openGraph: {
    title: "GenCine | The Global AI Cinema Lounge",
    description: "Discover global AI films that transcend algorithms and become art.",
    siteName: "GenCine",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GenCine | The Global AI Cinema Lounge",
    description: "Discover global AI films that transcend algorithms and become art.",
  },
};
import { GNB } from "@/components/GNB";
import { LanguageProvider } from "@/i18n/LanguageContext";

export default async function RootLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }> | { locale: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const locale = resolvedParams.locale;
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black overflow-x-hidden">
        <LanguageProvider initialLocale={locale}>
          <GNB />
          <main className="flex-grow pt-16">
            {children}
          </main>
          <footer className="border-t border-white/5 py-6 text-center text-xs text-gray-500">
            © 2026 GenCine. All rights reserved.
          </footer>
        </LanguageProvider>
      </body>
    </html>
  );
}
