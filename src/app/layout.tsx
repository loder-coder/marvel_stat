import type { Metadata } from "next";
import "./styles.css";
export const metadata: Metadata = { title: "Marvel Stat", description: "Marvel Rivals player and hero statistics" };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ko"><body><header><a href="/">MARVEL STAT</a><nav><a href="/players">플레이어 검색</a><a href="/">영웅 메타</a></nav></header><main>{children}</main></body></html>; }
