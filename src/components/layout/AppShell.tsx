"use client";

import { useState, type ReactNode } from "react";
import ko from "@/locales/ko.json";

export function AppShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="app-shell">
      <aside className={`sidebar${open ? " is-open" : ""}`}>
        <div className="brand"><span className="brand-mark">MR</span><strong>{ko.site.brandPrimary} {ko.site.brandSecondary}</strong></div>
        <nav aria-label="주 메뉴">
          <p>{ko.navigation.gameData}</p>
          <a className="is-active" href="/"><span>▦</span>{ko.site.navigation}</a>
        </nav>
        <div className="sidebar-source"><span>{ko.navigation.dataSource}</span><strong>{ko.navigation.officialData}</strong></div>
      </aside>
      {open && <button className="drawer-scrim" aria-label={ko.labels.close} onClick={() => setOpen(false)} />}
      <div className="content-shell">
        <div className="mobile-bar"><button type="button" onClick={() => setOpen(true)} aria-label={ko.navigation.openMenu}>☰</button><strong>{ko.site.brandPrimary} {ko.site.brandSecondary}</strong></div>
        <main>{children}</main>
        <footer>{ko.site.footer}</footer>
      </div>
    </div>
  );
}
