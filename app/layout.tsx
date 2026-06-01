import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TF Monday Night Bible Study's",
  description: "Anthony's Monday Night Bible Study's at Triple F Sports, Knoxville TN",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TF Study's",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f4f6a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icon-180.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
