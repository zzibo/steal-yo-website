import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Date Planner",
  description: "Paste a social media link, get a date plan",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
