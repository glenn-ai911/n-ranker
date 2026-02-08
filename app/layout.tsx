import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "N-Ranker | 네이버 쇼핑 순위 추적",
  description: "네이버 쇼핑 검색 순위를 추적하고 시각화하는 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body className="font-inter bg-gray-50">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
