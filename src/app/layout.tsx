import type { Metadata } from "next";
import { Russo_One, Chakra_Petch, Sofia_Sans, Sofia_Sans_Semi_Condensed, Sofia_Sans_Condensed, Science_Gothic, Martian_Mono } from "next/font/google";
import "./globals.css";
import "./surface.css";
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

// Шрифты нового дизайна: файлы качаются, только когда он включён (без предзагрузки).
const sofia = Sofia_Sans({ subsets: ["latin", "cyrillic"], variable: "--font-sofia", display: "swap", preload: false });
const sofiaSemi = Sofia_Sans_Semi_Condensed({ subsets: ["latin", "cyrillic"], variable: "--font-sofia-semi", display: "swap", preload: false });
const sofiaCond = Sofia_Sans_Condensed({ subsets: ["latin", "cyrillic"], variable: "--font-sofia-cond", display: "swap", preload: false });
const science = Science_Gothic({ subsets: ["latin", "cyrillic"], axes: ["wdth"], variable: "--font-science", display: "swap", preload: false });
const martian = Martian_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-martian", display: "swap", preload: false });
const surfaceFonts = [sofia, sofiaSemi, sofiaCond, science, martian].map((f) => f.variable).join(" ");

export const metadata: Metadata = {
  title: "Битва за Респект — турниры по Arc Raiders",
  description:
    "Серия турниров по Arc Raiders в прямом эфире. Ведущий — Денис Блим. Рейтинг, расписание, регистрация и кабинет организатора.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${russo.variable} ${chakra.variable} ${surfaceFonts}`}>
      <body>
        <ErrorReporter />
        {children}
      </body>
    </html>
  );
}
