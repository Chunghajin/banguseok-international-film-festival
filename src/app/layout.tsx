import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "방국제 — BANGUSEOK International Film Festival",
  description: "심사위원 만장일치. 심사위원 1명.",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
