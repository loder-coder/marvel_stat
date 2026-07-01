import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Hero Meta | Marvel Rivals",
  description: "Official Marvel Rivals Hero Hot List dashboard"
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <header><a href="/"><span>HERO</span> META</a><nav><a href="/">Dashboard</a></nav></header>
        <main>{children}</main>
        <footer>Data source: Official Marvel Rivals Hero Hot List</footer>
      </body>
    </html>
  );
}
