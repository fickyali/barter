import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "Barter.biz.id | Yang Biasa Buatmu, Bisa Jadi Berharga Buat Orang Lain",
  description: "Barter.biz.id | Yang Biasa Buatmu, Bisa Jadi Berharga Buat Orang Lain",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const year = new Date().getFullYear();
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <footer className="w-full mt-12 mb-2 text-center text-xs text-muted-strong select-none">
          <span>© {year}. Build with <span aria-label="love" role="img">❤️</span> by{' '}
            <a href="https://instagram.com/createruang" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">@createruang</a>
          </span>
        </footer>
      </body>
    </html>
  );
}
