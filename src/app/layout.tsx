import type { Metadata } from "next";
import "./styles.css";
import ko from "@/locales/ko.json";

export const metadata: Metadata = {
  title: ko.site.title,
  description: ko.site.description
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <header><a href="/"><span>{ko.site.brandPrimary}</span> {ko.site.brandSecondary}</a><nav><a href="/">{ko.site.navigation}</a></nav></header>
        <main>{children}</main>
        <footer>{ko.site.footer}</footer>
      </body>
    </html>
  );
}
