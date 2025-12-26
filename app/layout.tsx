import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Book Generator - Create Your Book in Minutes",
  description: "Transform your ideas into professionally written books with AI. Fiction, non-fiction, romance, thriller, self-help and more. Download as EPUB, ready for Amazon KDP.",
  keywords: ["AI book generator", "write a book", "book writing", "self-publishing", "Amazon KDP", "EPUB generator"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
      </body>
    </html>
  );
}
