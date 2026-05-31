import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TF Monday Night Bible Studies",
  description: "Anthony's Monday Night Bible Studies at Triple F Sports, Knoxville TN",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
