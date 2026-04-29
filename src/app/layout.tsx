import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Premise",
  description:
    "Premise — the AI co-pilot for market and consumer insights researchers. Brief to hypotheses to questionnaire to analysis to story angles, grounded in your historical research.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
