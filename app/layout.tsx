import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrintFlow ERP",
  description: "Internal ERP for printing, signage, acrylic & fabrication workflows",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
