import type { Metadata } from "next";
import "./styles.css";
import ko from "@/locales/ko.json";
import { AppShell } from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: ko.site.title,
  description: ko.site.description
};

export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
