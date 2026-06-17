import type { Metadata } from "next";
import { Russo_One, Chakra_Petch } from "next/font/google";
import "./globals.css";
import { ErrorReporter } from "@/components/error-reporter";

// Display — Russo One (включает кириллицу).
const russo = Russo_One({
  weight: "400",
  subsets: ["latin", "cyrillic"],
  variable: "--font-russo",
  display: "swap",
});

// Body — Chakra Petch (латиница; кириллица откатывается на system-ui, как в прототипе).
const chakra = Chakra_Petch({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-chakra",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Битва за Респект — турниры по Arc Raiders",
  description:
    "Серия турниров по Arc Raiders в прямом эфире. Ведущий — Денис Блим. Рейтинг, расписание, регистрация и кабинет организатора.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${russo.variable} ${chakra.variable}`}>
      <body>
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
