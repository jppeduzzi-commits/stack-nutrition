import { Barlow } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  variable: "--font-barlow",
  weight: ["400", "600", "700", "800", "900"],
  subsets: ["latin"],
});

export const metadata = {
  title: "Stack Nutrition",
  description: "Tell it what you're going to eat, it tells you how much of each food to hit your macros.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={barlow.variable}>
      <body>{children}</body>
    </html>
  );
}
