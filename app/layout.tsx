import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "OpenPoint 代轉",
  description: "向社群成員申請 OpenPoint 代轉：填手機、選點數、付款，核准後直接轉入你的帳號。",
  icons: {
    icon: "/assets/openpoint_free.webp",
    apple: "/assets/openpoint_free.webp",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-Hant"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col text-zinc-100">
        <Header />
        {children}
      </body>
    </html>
  );
}
