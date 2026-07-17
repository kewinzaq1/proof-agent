import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    title: "Proof — Personal growth, grounded in evidence",
    description: "Run tiny experiments on your life. Proof learns what works for you and adapts the next step.",
    openGraph: {
      title: "Proof — Stop trying to fix yourself. Start learning yourself.",
      description: "Personal growth, grounded in evidence.",
      type: "website",
      images: [{ url: `${origin}/og.png`, width: 1731, height: 909, alt: "Proof personal experiment loop" }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Proof — Stop trying to fix yourself. Start learning yourself.",
      description: "Personal growth, grounded in evidence.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
