import type { Metadata } from "next";
import { DM_Sans, IBM_Plex_Mono, Instrument_Serif, Caveat } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({ variable: "--font-sans", subsets: ["latin"] });
const ibmPlexMono = IBM_Plex_Mono({ variable: "--font-mono", weight: ["400", "500"], subsets: ["latin"] });
const instrumentSerif = Instrument_Serif({ variable: "--font-serif", weight: "400", subsets: ["latin"] });
const caveat = Caveat({ variable: "--font-hand", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "steal yo website",
  description: "Analyze any website's design DNA — components, design tokens, layout, tech stack",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${ibmPlexMono.variable} ${instrumentSerif.variable} ${caveat.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
