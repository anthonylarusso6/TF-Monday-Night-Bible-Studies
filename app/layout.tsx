import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TF Monday Night Bible Study's",
  description: "Anthony's Monday Night Bible Study's at Triple F Sports, Knoxville TN",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
